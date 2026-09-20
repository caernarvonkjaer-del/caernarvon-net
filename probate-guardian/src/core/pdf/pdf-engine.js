// Native vector & text PDF generator for Verified Initial Inventory.
// Directly renders vector lines, text operators, metadata, and outline bookmarks
// into a searchable, non-raster PDF (no html2canvas screenshots).
// Fully tagged and WCAG 2.1 AA / PDF/UA-1 compliant.

import {
  PdfStructureTree,
  attachAccessibilityHooks,
  writeMarkedContentStart,
  writeMarkedContentEnd,
  writeArtifactStart,
  writeArtifactEnd,
} from './pdf-accessibility.js';
import {
  PG_SANS_REGULAR_B64,
  PG_SANS_BOLD_B64,
  PG_SANS_ITALIC_B64,
} from '../../assets/embedded-fonts.js';
import {
  getFloridaCircuitCourtCaption,
  getCaseCaptionTitle,
} from './circuit-lookup.js';
import { ensurePdfjs } from './pdfjs-loader.js';
import {
  assertFilingEligibleSupplement,
  dataUrlToBytes,
  resolveActiveDocPeriod,
} from './supplemental-pdf.js';
import { maskSSN } from './ssn-format.js';
import { readPngDimensions, base64ToBytes } from '../images/png-dimensions.js';

// Milestone 40C-A item 7: drawn in place of the court caption when the filing
// has no county. Deliberately not a fill-in-the-blank caption ("IN AND FOR
// ______ COUNTY") -- that shape was considered and rejected because it could
// pass for a real caption if it ever escaped the draft path.
const MISSING_COUNTY_CAPTION = 'COUNTY NOT SELECTED — COURT CAPTION INCOMPLETE';

// A value may be an array of pre-split lines (composePdfAddressLines()), in
// which case it is sanitized element-wise and stays an array: the caller chose
// those line breaks and the renderer must not collapse them. Every consumer of
// this function has to be correct for both shapes.
function sanitizeDisplayValue(label, value) {
  if (Array.isArray(value)) {
    const lines = value.map((line) => sanitizeDisplayValue(label, line)).filter(Boolean);
    return lines.length ? lines : '';
  }
  if (!value) return '';
  const l = String(label || '').toLowerCase();
  if (l.includes('ssn') || l.includes('social security') || l.includes('taxpayer id') || /\btin\b/.test(l)) {
    return maskSSN(value);
  }
  return value;
}

export async function createJsPdfInstance() {
  const patchOutlineDestinations = (pdf) => {
    if (!pdf?.outline || pdf.outline.__pgPreciseDestinations) return;

    pdf.outline.__pgPreciseDestinations = true;
    pdf.outline.__pgDestinationMap = new Map();
    pdf.outline.__pgDestinationSeq = 0;

    const originalAdd = pdf.outline.add.bind(pdf.outline);
    pdf.outline.add = function addWithNamedDestination(parent, title, options = {}) {
      if (options && options.pageNumber && !options.__pgDestName) {
        options.__pgDestName = `pg_dest_${++this.__pgDestinationSeq}`;
        this.__pgDestinationMap.set(options.__pgDestName, options);
      }
      return originalAdd(parent, title, options);
    };

    if (pdf.internal?.events && !pdf.outline.__pgNamedDestinationHooks) {
      pdf.outline.__pgNamedDestinationHooks = true;
      pdf.internal.events.subscribe('putResources', () => {
        const destinations = pdf.outline.__pgDestinationMap;
        if (!destinations || destinations.size === 0) return;
        pdf.outline.__pgDestinationsObjId = pdf.internal.newObject();
        pdf.internal.write('<< /Names [');
        const toPdfY = pdf.internal.getVerticalCoordinateString;
        for (const [name, dest] of destinations.entries()) {
          const pageInfo = pdf.internal.getPageInfo(dest.pageNumber);
          const left = dest.left ?? 0;
          const top = dest.top ?? dest.y ?? 0;
          const zoom = dest.zoom ?? 0;
          pdf.internal.write(`${pdf.outline.makeString(name)} [${pageInfo.objId} 0 R /XYZ ${left} ${toPdfY(top)} ${zoom}]`);
        }
        pdf.internal.write('] >>');
        pdf.internal.write('endobj');
      });
      pdf.internal.events.subscribe('putCatalog', () => {
        if (pdf.outline.__pgDestinationsObjId) {
          pdf.internal.write(`/Names << /Dests ${pdf.outline.__pgDestinationsObjId} 0 R >>`);
        }
      });
    }

    pdf.outline.renderItems = function renderItemsWithPreciseDestinations(parent) {
      for (let idx = 0; idx < parent.children.length; idx++) {
        const item = parent.children[idx];
        this.objStart(item);
        this.line('/Title ' + this.makeString(item.title));
        this.line('/Parent ' + this.makeRef(parent));
        if (idx > 0) this.line('/Prev ' + this.makeRef(parent.children[idx - 1]));
        if (idx < parent.children.length - 1) this.line('/Next ' + this.makeRef(parent.children[idx + 1]));
        if (item.children.length > 0) {
          this.line('/First ' + this.makeRef(item.children[0]));
          this.line('/Last ' + this.makeRef(item.children[item.children.length - 1]));
        }

        const childCount = this.count = this.count_r({ count: 0 }, item);
        if (childCount > 0) this.line('/Count ' + childCount);
        if (item.options && item.options.pageNumber) {
          this.line('/A << /S /GoTo /D ' + this.makeString(item.options.__pgDestName) + ' >>');
        }
        this.objEnd();
      }

      for (let idx = 0; idx < parent.children.length; idx++) {
        this.renderItems(parent.children[idx]);
      }
    };
  };

  if (typeof window === 'undefined') return null;
  if (!window.jspdf && !window.jsPDF && typeof window.html2pdf !== 'function') {
    try {
      const { getHtml2Pdf } = await import('./html2pdf-loader.js');
      await getHtml2Pdf();
    } catch (e) {
      // headless / node environment fallback
    }
  }
  if (window.jspdf && window.jspdf.jsPDF) {
    const pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait', compress: true });
    patchOutlineDestinations(pdf);
    return pdf;
  }
  if (window.jsPDF) {
    const pdf = new window.jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait', compress: true });
    patchOutlineDestinations(pdf);
    return pdf;
  }
  if (typeof window.html2pdf === 'function') {
    const dummy = document.createElement('div');
    const worker = window.html2pdf().from(dummy).set({ jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' } });
    const pdf = await worker.toPdf().get('pdf');
    if (pdf && typeof pdf.setFont === 'function') {
      patchOutlineDestinations(pdf);
      return pdf;
    }
  }
  return null;
}

export async function generateCourtFormPdf(model, options = {}) {
  const doc = await createJsPdfInstance();
  if (!doc) {
    throw new Error('jsPDF library not available in environment.');
  }

  // Set PDF version to 1.7 (required for PDF/UA-1 / ISO 14289-1 conformance)
  if (doc.__private__ && typeof doc.__private__.setPdfVersion === 'function') {
    doc.__private__.setPdfVersion('1.7');
  }

  // Register embedded TrueType font programs (Liberation Sans) for PDF/UA-1 conformance
  if (typeof doc.addFileToVFS === 'function' && typeof doc.addFont === 'function') {
    doc.addFileToVFS('PGSans-Regular.ttf', PG_SANS_REGULAR_B64);
    doc.addFont('PGSans-Regular.ttf', 'PGSans', 'normal');
    doc.addFileToVFS('PGSans-Bold.ttf', PG_SANS_BOLD_B64);
    doc.addFont('PGSans-Bold.ttf', 'PGSans', 'bold');
    doc.addFileToVFS('PGSans-Italic.ttf', PG_SANS_ITALIC_B64);
    doc.addFont('PGSans-Italic.ttf', 'PGSans', 'italic');
  }
  doc.setFont('PGSans', 'normal');

  const { metadata, sections } = model;
  const sourceData = options.sourceData || (typeof window !== 'undefined' ? window.D : null);
  const wardName = metadata.wardName || 'Ward';
  const caseNumber = metadata.caseNumber || '';
  // Milestone 40C-A item 6: no Pinellas substitution. A filing with no county
  // gets no county here, and the caption helper returns null for it (item 7).
  const county = (metadata.county || '').toUpperCase();

  const scheduleSectionAliases = {
    'ANNUAL GUARDIANSHIP PLAN': {
      planACover: 'cover', planAResidences: 'q1', planACarePlan: 'q2-q3', planABenefits: 'q3g',
      planAProviders: 'q4', planARights: 'q5-q7', planAADLs: 'q8', planADisabilities: 'q9',
      planADirectives: 'q10', planARemuneration: 'q11', planASignatures: 'certification',
    },
    'INITIAL GUARDIANSHIP PLAN': {
      planICover: 'cover', planISettingMedical: 'q2-q5', planIMentalPersonal: 'q6-q7',
      planISocialBenefits: 'q9', planIProviders: 'q10a', planIADLs: 'q10b-d',
      planIDisabilities: 'q11-10ef', planIDirectives: 'directive-detail', planISignatures: 'certification',
    },
    'ANNUAL GUARDIANSHIP PLAN — MINOR': {
      planMCover: 'cover', planMResidences: 'q2-q3', planMProviders: 'q4', planMMedical: 'q5',
      planMEducation: 'certification', planMSignatures: 'preparer-attorney',
    },
    'SIMPLIFIED ANNUAL PLAN': { planCover: 'plan-1', planQuestions: 'plan-2', planSignatures: 'signatures' },
  };

  const attachSourceDocuments = () => {
    const scheduleDocs = sourceData?.scheduleDocs;
    if (!scheduleDocs || typeof scheduleDocs !== 'object') return;
    const aliases = scheduleSectionAliases[metadata.formName] || {};
    const usedSections = new Set();
    const entries = Object.entries(scheduleDocs);
    const activePeriod = resolveActiveDocPeriod(sourceData);
    const getSlot = (value) => {
      if (!value || typeof value !== 'object') return { comment: '', files: [] };
      if (Array.isArray(value.files) || value.comment) return value;
      return value[activePeriod] || value.initial || { comment: '', files: [] };
    };
    const addBlock = (section, slot) => {
      if (!section || usedSections.has(section) || (!slot.files?.length && !String(slot.comment || '').trim())) return;
      if ((section.blocks || []).some(block => block.type === 'supporting-documents')) {
        usedSections.add(section);
        return;
      }
      section.blocks = section.blocks || [];
      section.blocks.push({
        type: 'supporting-documents',
        tag: 'Part',
        title: 'Supporting Documents',
        comment: slot.comment || '',
        files: (slot.files || []).filter(file => file && file.dataUrl).map(file => ({
          name: file.name || 'Supporting document',
          type: file.type || '',
          size: file.size || 0,
          dataUrl: file.dataUrl,
          id: file.id || '',
          contentDigest: file.contentDigest || '',
          technicalStatus: file.technicalStatus || 'pending',
          technicalWarnings: file.technicalWarnings || [],
          pageCount: file.pageCount || 0,
          encrypted: !!file.encrypted,
          corrupt: !!file.corrupt,
          removed: !!file.removed,
          stale: !!file.stale,
        })),
      });
      usedSections.add(section);
    };
    entries.forEach(([key, value], index) => {
      const slot = getSlot(value);
      const exact = sections.find(section => section.id === key);
      if (exact) {
        addBlock(exact, slot);
        return;
      }
      const aliasId = aliases[key];
      addBlock(sections.find(section => section.id === aliasId), slot);
    });
  };

  attachSourceDocuments();

  // Initialize PDF/UA-1 and WCAG 2.1 structure tree & accessibility hooks
  const structureTree = new PdfStructureTree({ embedFonts: true, ...metadata });
  attachAccessibilityHooks(doc, structureTree);

  // 1. Set Document Properties & Metadata
  const props = {
    title: metadata.title,
    subject: metadata.subject,
    author: metadata.author,
    creator: metadata.creator,
    keywords: metadata.keywords || 'Florida, Probate, Guardianship',
    creationDate: new Date(),
  };
  if (typeof doc.setProperties === 'function') {
    doc.setProperties(props);
  } else if (typeof doc.setDocumentProperties === 'function') {
    doc.setDocumentProperties(props);
  }

  // Inject /Lang (en-US) into PDF /Catalog
  if (typeof doc.setLanguage === 'function') {
    doc.setLanguage('en-US');
  }

  // Page geometry (Rule 2.520: Letter = 612 x 792 pt with 1.0-inch / 72 pt margins)
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 72; // 1.0 inch
  const contentWidth = pageWidth - (margin * 2); // 468 pt
  const pageBottom = pageHeight - margin - 24; // Reserve the one-inch bottom margin for the footer.

  let curY = margin;
  let pageNum = 1;
  let forcePageBreakBeforeNextSection = false;
  const pageNumbersBySection = {};
  const parentOutlineMap = {};
  const attachmentPageNumbers = new Set();
  const nativePdfAttachments = [];

  const drawFirstPagePleadingHeader = () => {
    writeArtifactStart(doc, 'Pagination', 'Header');
    const caption = getFloridaCircuitCourtCaption(county);

    doc.setFont('PGSans', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    if (caption) {
      doc.text(caption.line1, pageWidth / 2, 80, { align: 'center' });
      doc.text(caption.line2, pageWidth / 2, 94, { align: 'center' });
    } else {
      // Milestone 40C-A item 7: no county, so no caption. Draw the gap rather
      // than a court this filing never named. Only a draft preview can reach
      // here -- County validation blocks export -- and the marker is worded so
      // it could never be mistaken for a real caption if one ever leaked out.
      doc.text(MISSING_COUNTY_CAPTION, pageWidth / 2, 87, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.text(caption ? caption.division : 'PROBATE DIVISION', pageWidth / 2, 108, { align: 'center' });
    doc.text(`CASE #: ${caseNumber || 'Pending'}`, pageWidth / 2, 122, { align: 'center' });

    const caseCaption = getCaseCaptionTitle(wardName, metadata.wardType);
    doc.setFontSize(11);
    doc.text(caseCaption, margin, 142);

    const formTitle = (metadata.formName || metadata.title || 'VERIFIED INITIAL INVENTORY').toUpperCase();
    doc.setFontSize(12.5);
    doc.text(formTitle, pageWidth / 2, 162, { align: 'center' });

    const titleW = doc.getTextWidth(formTitle);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.75);
    doc.line((pageWidth - titleW) / 2, 165, (pageWidth + titleW) / 2, 165);
    writeArtifactEnd(doc);
  };

  const drawContinuationHeader = (sectionTitle) => {
    writeArtifactStart(doc, 'Pagination', 'Header');
    const caption = getFloridaCircuitCourtCaption(county);
    const headerTop = margin;
    doc.setFont('PGSans', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 45, 74); // Court Navy (#1a2d4a)
    doc.text(
      caption ? `${caption.line1} ${caption.line2}` : MISSING_COUNTY_CAPTION,
      pageWidth / 2, headerTop + 10, { align: 'center' }
    );

    doc.setFontSize(9);
    const formTitle = (metadata.formName || metadata.title || 'VERIFIED INITIAL INVENTORY').toUpperCase();
    doc.text(`PROBATE DIVISION — ${formTitle}`, pageWidth / 2, headerTop + 22, { align: 'center' });

    // Framed 3-column bounded metadata bar (contentWidth = 468 pt)
    const barTop = headerTop + 30;
    const barHeight = 24;
    doc.setFillColor(248, 249, 251);
    doc.rect(margin, barTop, contentWidth, barHeight, 'FD');
    doc.setDrawColor(180, 190, 205);
    doc.setLineWidth(0.75);
    doc.rect(margin, barTop, contentWidth, barHeight, 'S');

    // Column dividers (3 equal columns: 156 pt each)
    doc.line(margin + 156, barTop, margin + 156, barTop + barHeight);
    doc.line(margin + 312, barTop, margin + 312, barTop + barHeight);

    doc.setFont('PGSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 60, 75);
    // A continuation header has room for two 8pt lines per cell. This is an
    // intentional title policy: wrap first, then visibly ellipsize only an
    // exceptional third line rather than silently discarding it.
    const COL_W = 156;
    const COL_PAD = 10; // left+right pad inside column
    const headerLines = (label) => {
      const lines = doc.splitTextToSize(String(label || ''), COL_W - COL_PAD);
      if (lines.length <= 2) return lines.length ? lines : [''];
      return [lines[0], `${lines[1].replace(/\.+$/, '')}...`];
    };
    const wardLabel = `Ward: ${wardName}`;
    doc.text(headerLines(wardLabel), margin + 6, barTop + 10, { lineHeightFactor: 1 });
    const midLabel = sectionTitle || '';
    doc.text(headerLines(midLabel), margin + 234, barTop + 10, { align: 'center', lineHeightFactor: 1 });
    const caseLabel = `Case #: ${caseNumber || 'Pending'}`;
    doc.text(headerLines(caseLabel), pageWidth - margin - 6, barTop + 10, { align: 'right', lineHeightFactor: 1 });
    writeArtifactEnd(doc);
  };

  const drawHeader = (sectionTitle) => {
    if (pageNum === 1) {
      drawFirstPagePleadingHeader();
    } else {
      drawContinuationHeader(sectionTitle);
    }
  };

  const drawFooter = (currentP, totalP) => {
    writeArtifactStart(doc, 'Pagination', 'Footer');
    doc.setFont('PGSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 120, 135);
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - margin - 16, pageWidth - margin, pageHeight - margin - 16);

    const footerSubtitle = metadata.formSubtitle || metadata.formName || 'Florida Guardianship Report';
    doc.text(`${footerSubtitle} — ${wardName}`, margin, pageHeight - margin - 4);
    doc.text(`Page ${currentP} of ${totalP}`, pageWidth - margin, pageHeight - margin - 4, { align: 'right' });
    writeArtifactEnd(doc);
  };

  const startNewPage = (sectionTitle) => {
    doc.addPage();
    pageNum++;
    drawHeader(sectionTitle);
    curY = 140;
  };

  const startNewAttachmentPage = () => {
    doc.addPage();
    pageNum++;
    attachmentPageNumbers.add(pageNum);
    // Rule 2.520 applies to attachment pages too: start the content box one
    // inch down, not at the paper edge.
    curY = margin;
  };

  const checkPageSpace = (neededHeight, sectionTitle) => {
    if (curY + neededHeight > pageBottom) {
      startNewPage(sectionTitle);
      return true;
    }
    return false;
  };

  // Reported 2026-09-18, with a screenshot of Simplified Annual Accounting's
  // Part IV: a guardian's address ran past the right margin of the court
  // document and collided with its own label --
  // "Residence Addre[ss]88 Snell Isle Blvd NE, St. Petersburg, FL 33704".
  //
  // The `signature-block` renderer has two layouts. The `fields` grid was
  // given wrapping earlier (see its own comment about not overflowing into
  // the right margin); the legacy `details` stack below it never was, which
  // is why that earlier fix looked complete while four filing types stayed
  // broken -- annual, final and trust accounting (all three share
  // annual-accounting/pdf-model.js) plus simplified accounting. Those are
  // exactly the filing types that print a guardian address through
  // `details`.
  //
  // Two independent causes, both addressed here:
  //   1. the value was drawn at a hardcoded 60pt to the right of its label,
  //      and "Residence Address: " is about 74pt wide at 7.5pt bold -- so the
  //      value began roughly 14pt on top of the end of its own label. The
  //      value column is now placed past the widest label actually present,
  //      uniformly for the whole block so the values still line up.
  //   2. the value was drawn as one unwrapped string with no width at all, so
  //      anything longer than the remaining ~128pt simply continued into the
  //      margin. Values now wrap to their column.
  //
  // An ARRAY value is a structured, already-split value -- an address, whose
  // components are discrete stored fields (composePdfAddressLines()). Those
  // print as a postal block: the label on its own line, then the delivery
  // line, any secondary unit, and the city/state/ZIP line indented beneath
  // it, reading the way an envelope does and taking the full column width. A
  // plain string sits beside its label as before, and drops into the same
  // block shape only if it will not fit there.
  //
  // Measuring here, before the block is drawn, rather than inline at draw
  // time is what lets the block reserve real height for a wrapped address.
  // The old loop advanced a flat 11pt per key regardless; a two-line address
  // would otherwise have been drawn straight through the heading of the next
  // Part.
  //
  // A note on measurement, because it cost a wrong diagnosis once: pdf.js's
  // text-layer spans over-report width by about 16% here (it measures a
  // substitute face and corrects with a transform), so a test that measures
  // the DOM will claim overflow that no ink actually commits. Verified by
  // scanning the rendered canvas: "Residence Address:" puts down 71.3pt of
  // ink, against doc.getTextWidth()'s 74.2pt for the same string plus its
  // trailing space. jsPDF's own metrics are the trustworthy ones and are
  // what this layout uses directly.
  // Milestone 60F. The `fields` grid reserved a flat 28pt per row, which holds
  // a label plus two value lines and no more. That was survivable while only
  // Guardian Inventory used it; migrating Annual's and Simplified's signature
  // blocks onto it brings four- and five-line postal addresses into the same
  // layout, and a fixed row height would have drawn the overflow straight
  // through whatever follows.
  //
  // So rows are planned before the block is drawn: each row is as tall as its
  // tallest wrapped cell, never shorter than
  // the 28pt it used to be, and the block reserves the real total. Every field
  // column keeps the width it had (contentWidth / cols), so nothing about the
  // existing Guardian Inventory blocks moves.
  const FIELD_ROW_H = 28;
  const FIELD_LABEL_SIZE = 7;
  const FIELD_VALUE_SIZE = 7.5;
  const FIELD_VALUE_DROP = 9;   // label baseline to first value baseline
  const FIELD_ROW_PAD = 6;      // clear space under the last value line
  const planFieldRows = (fieldRows) => {
    const planned = fieldRows.map((row) => {
      const cols = row.length || 1;
      const colW = contentWidth / cols;
      const cells = row.map((field, fIdx) => {
        if (!field || !field.value) return null;
        const value = sanitizeDisplayValue(field.label, field.value);
        doc.setFont('PGSans', 'normal');
        doc.setFontSize(FIELD_VALUE_SIZE);
        const maxW = colW - 4;
        // A structured value (composePdfAddressLines()) keeps the line breaks
        // its caller chose; each is still wrapped to the column.
        const lines = Array.isArray(value)
          ? value.flatMap((line) => doc.splitTextToSize(String(line), maxW))
          : doc.splitTextToSize(String(value), maxW);
        return { label: String(field.label || ''), lines, x: margin + (fIdx * colW) + 2 };
      });
      doc.setFont('PGSans', 'normal');
      doc.setFontSize(FIELD_VALUE_SIZE);
      const lineH = doc.getLineHeight ? doc.getLineHeight() : FIELD_VALUE_SIZE * 1.15;
      const tallest = cells.reduce((n, cell) => Math.max(n, cell ? cell.lines.length : 0), 1);
      return { cells, lineH, height: Math.max(FIELD_ROW_H, FIELD_VALUE_DROP + (tallest * lineH) + FIELD_ROW_PAD) };
    });
    return { rows: planned, height: planned.reduce((sum, row) => sum + row.height, 0) };
  };


  const loadImageSize = (dataUrl) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    image.onerror = () => reject(new Error('Image could not be loaded.'));
    image.src = dataUrl;
  });

  const getSupportingDocumentImageLayout = (sourceWidth, sourceHeight, fullPage = false) => {
    // A full-page exhibit is bounded by the content box, never the paper.
    // Scaling to pageWidth/pageHeight printed scans edge to edge with a
    // zero-inch margin on all four sides, against Rule 2.520's one inch.
    const maxWidth = contentWidth;
    const maxHeight = fullPage ? (pageHeight - 2 * margin) : pageBottom - curY;
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return {
      x: fullPage ? margin + (contentWidth - width) / 2 : margin,
      y: fullPage ? margin + ((pageHeight - 2 * margin) - height) / 2 : curY,
      width,
      height,
    };
  };

  const renderSupportingDocumentImage = (dataUrl, layout, imageType = null) => {
    writeArtifactStart(doc, 'Layout');
    doc.addImage(dataUrl, imageType || (dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'), layout.x, layout.y, layout.width, layout.height);
    writeArtifactEnd(doc);
    curY = layout.y + layout.height + 12;
  };

  // Milestone 39-B: renders a captured/uploaded signature stamp in place of
  // the typed "/s/ Name" text or the wet-ink blank line, at the same
  // position either currently occupies. Sized to fit within `layout`'s
  // maxWidth/maxHeight box, preserving the source PNG's real aspect ratio
  // (read straight from its IHDR chunk, no async Image() decode needed) --
  // falls back to the requested box unscaled if dimensions can't be read,
  // rather than failing to render the signature at all.
  const renderSignatureImage = (dataUrl, layout) => {
    writeArtifactStart(doc, 'Layout');
    const { x, y, maxWidth, maxHeight } = layout;
    let width = maxWidth;
    let height = maxHeight;
    try {
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      const dims = readPngDimensions(base64ToBytes(base64));
      if (dims && dims.width > 0 && dims.height > 0) {
        const scale = Math.min(maxWidth / dims.width, maxHeight / dims.height);
        width = dims.width * scale;
        height = dims.height * scale;
      }
    } catch {
      // Renders at the requested box, unscaled, rather than not at all.
    }
    doc.addImage(dataUrl, 'PNG', x, y, width, height);
    writeArtifactEnd(doc);
  };

  const renderSupportingFileName = (fileName, sectionTitle, parentNode) => {
    const filenameHeight = 16;
    const spacingAfterDocument = 12;
    if (curY + filenameHeight + spacingAfterDocument > pageBottom) {
      startNewPage(sectionTitle);
    }
    const fileNode = structureTree.addStructureElement({
      tag: 'P',
      pageNumber: pageNum,
      isLeaf: true,
      parent: parentNode,
    });
    writeMarkedContentStart(doc, 'P', fileNode.mcid);
    doc.setFont('PGSans', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(fileName, margin, curY + 10);
    writeMarkedContentEnd(doc);
    curY += filenameHeight + spacingAfterDocument;
  };

  const renderSupportingDocumentText = (fileName, sourcePageNumber, lines, sectionTitle, parentNode, imageLayout = null) => {
    const title = `Supporting Document Text: ${fileName}${sourcePageNumber > 1 ? ` (page ${sourcePageNumber})` : ''}`;
    const documentNode = structureTree.addStructureElement({
      tag: 'Part',
      title,
      parent: parentNode,
    });
    const isVisualAttachment = !!imageLayout;
    const writeText = (text, x, y) => doc.text(text, x, y, isVisualAttachment ? { renderingMode: 'invisible' } : undefined);
    let textY = curY + 18;

    if (!isVisualAttachment) {
      const headingNode = structureTree.addStructureElement({
        tag: 'H3',
        title,
        pageNumber: pageNum,
        isLeaf: true,
        parent: documentNode,
      });
      writeMarkedContentStart(doc, 'H3', headingNode.mcid);
      doc.setFont('PGSans', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(26, 45, 74);
      writeText(title, margin, curY + 10);
      writeMarkedContentEnd(doc);
    }

    if (!lines.length) {
      const noticeNode = structureTree.addStructureElement({ tag: 'P', pageNumber: pageNum, isLeaf: true, parent: documentNode });
      writeMarkedContentStart(doc, 'P', noticeNode.mcid);
      doc.setFont('PGSans', 'italic');
      doc.setFontSize(isVisualAttachment ? 7 : 9);
      doc.setTextColor(100, 110, 125);
      writeText('No machine-readable text was found in this source document. Provide a human-reviewed accessible text equivalent before filing.', imageLayout ? imageLayout.x + 2 : margin, textY + 9);
      writeMarkedContentEnd(doc);
      if (!imageLayout) curY = textY + 18;
      return;
    }

    for (const line of lines) {
      doc.setFont('PGSans', 'normal');
      doc.setFontSize(isVisualAttachment ? 7 : 9);
      doc.setTextColor(17, 24, 39);
      const availableWidth = imageLayout ? imageLayout.width - 4 : contentWidth;
      const wrapped = doc.splitTextToSize(line, availableWidth);
      if (!imageLayout) checkPageSpace((wrapped.length * 11) + 4, sectionTitle);
      const lineNode = structureTree.addStructureElement({ tag: 'P', pageNumber: pageNum, isLeaf: true, parent: documentNode });
      writeMarkedContentStart(doc, 'P', lineNode.mcid);
      writeText(wrapped, imageLayout ? imageLayout.x + 2 : margin, textY + 9);
      writeMarkedContentEnd(doc);
      textY += (wrapped.length * (imageLayout ? 8 : 11)) + 4;
    }
    if (!imageLayout) curY = textY;
  };

  const renderUploadedPdfPages = async (pdf, file) => {
    for (let p = 1; p <= pdf.numPages; p++) {
      startNewAttachmentPage();
      nativePdfAttachments.push({
        pageNumber: pageNum,
        sourcePageIndex: p - 1,
        dataUrl: String(file.dataUrl || ''),
        file,
      });
    }
  };

  const loadUploadedPdf = async (file) => {
    const pdfjsLib = await ensurePdfjs();
    return await pdfjsLib.getDocument({ data: dataUrlToBytes(file.dataUrl) }).promise;
  };

  const renderSupportingDocuments = async (block, sectionTitle, parentNode) => {
    const files = Array.isArray(block.files) ? block.files : [];
    const comment = String(block.comment || '').trim();
    if (!files.length && !comment) return;

    checkPageSpace(36, sectionTitle);
    const headingNode = structureTree.addStructureElement({
      tag: 'H3',
      title: block.title || 'Supporting Documents',
      pageNumber: pageNum,
      isLeaf: true,
      parent: parentNode,
    });
    writeMarkedContentStart(doc, 'H3', headingNode.mcid);
    doc.setFont('PGSans', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(26, 45, 74);
    doc.text(block.title || 'Supporting Documents', margin, curY + 10);
    writeMarkedContentEnd(doc);
    curY += 16;

    if (comment) {
      doc.setFont('PGSans', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(`Comment: ${comment}`, contentWidth);
      checkPageSpace((lines.length * 11) + 8, sectionTitle);
      const commentNode = structureTree.addStructureElement({
        tag: 'P',
        pageNumber: pageNum,
        isLeaf: true,
        parent: parentNode,
      });
      writeMarkedContentStart(doc, 'P', commentNode.mcid);
      doc.text(lines, margin, curY + 9);
      writeMarkedContentEnd(doc);
      curY += (lines.length * 11) + 8;
    }

    for (const file of files) {
      assertFilingEligibleSupplement(file);
      const pdf = await loadUploadedPdf(file);
      await renderUploadedPdfPages(pdf, file);
    }
  };

  // Draw initial first page header
  drawHeader(sections[0]?.title || 'Part I — Required Information');
  curY = 175;

  // 2. Render each section in order with semantic structure tagging
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];

    if (sIdx > 0 && (forcePageBreakBeforeNextSection || (sec.pageBreakBefore && curY > 80))) {
      startNewPage(sec.title);
    }
    forcePageBreakBeforeNextSection = false;

    pageNumbersBySection[sec.id] = pageNum;

    // Structure Node for this Section (Part)
    const partNode = structureTree.addStructureElement({
      tag: 'Part',
      title: sec.title,
      parent: structureTree.rootNode,
    });

    // Section Title Heading (<H1> or <H2>)
    // checkPageSpace MUST run before registering the outline entry: if it
    // triggers a page break, pageNum increments and the heading lands on
    // the new page. Registering the bookmark before this check would stamp
    // it to the old page, making it jump one page short.
    checkPageSpace(30, sec.title);

    // Register Outline / Bookmarks after the heading's page is settled
    if (doc.outline && typeof doc.outline.add === 'function') {
      try {
        let parentNode = null;
        if (sec.parentBookmark) {
          if (!parentOutlineMap[sec.parentBookmark]) {
            parentOutlineMap[sec.parentBookmark] = doc.outline.add(null, sec.parentBookmark, { pageNumber: pageNum, y: curY });
          }
          parentNode = parentOutlineMap[sec.parentBookmark];
        }
        const outlineNode = doc.outline.add(parentNode, sec.bookmarkTitle, { pageNumber: pageNum, y: curY });
        if (!parentNode && sec.bookmarkTitle && !parentOutlineMap[sec.bookmarkTitle]) {
          parentOutlineMap[sec.bookmarkTitle] = outlineNode;
        }
      } catch (e) {
        console.warn('Could not add outline entry for', sec.bookmarkTitle, e);
      }
    }

    const hTag = sec.level === 2 ? 'H2' : 'H1';
    const subHTag = hTag === 'H1' ? 'H2' : 'H3';
    const hNode = structureTree.addStructureElement({
      tag: hTag,
      title: sec.title,
      pageNumber: pageNum,
      isLeaf: true,
      parent: partNode,
    });
    writeMarkedContentStart(doc, hTag, hNode.mcid);
    doc.setFont('PGSans', 'bold');
    if (hTag === 'H1') {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0); // Bold Black for H1
      doc.text(sec.title, margin, curY + 12);
    } else {
      doc.setFontSize(11);
      doc.setTextColor(26, 45, 74); // Court Navy for H2
      doc.text(sec.title, margin, curY + 10);
    }
    writeMarkedContentEnd(doc);

    if (hTag === 'H1') {
      writeArtifactStart(doc, 'Layout');
      doc.setDrawColor(180, 190, 205);
      doc.setLineWidth(0.75);
      doc.line(margin, curY + 16, pageWidth - margin, curY + 16);
      writeArtifactEnd(doc);
      curY += 24;
    } else {
      curY += 18;
    }

    // Render Blocks in this Section
    for (const block of (sec.blocks || sec.renderBlocks || [])) {
      if (block.type === 'notice') {
        // Milestone 61G: a notice's `title` used to be read by nothing. Models
        // across both form families set one -- certification headings, the
        // heading over an empty question's "none listed" line, 'Bond
        // Calculation', 'Declaration of Remuneration' -- and every one of them
        // was dropped, leaving an unlabelled paragraph. Rendered here, once,
        // the same way key-value-grid and table render theirs: a bold
        // sub-heading above the block, tagged as a heading for the structure
        // tree. Untitled notices (explanations, filing lines) are unaffected.
        const noticeTitle = block.title && String(block.title).trim();
        const noticeBody = String(block.text || '');
        const hasNoticeBody = !!noticeBody.trim();

        // Measure the body before drawing the heading, with the body's own
        // font active so splitTextToSize() wraps against the right metrics.
        // The single page-space check below then covers heading and box
        // together: checking them separately let the heading take the last
        // line of a page and the paragraph it introduces start the next one.
        doc.setFont('PGSans', block.fontStyle || 'italic');
        const fs = block.fontSize || 9.5;
        doc.setFontSize(fs);
        const lineHeight = fs * 1.35;
        const lines = hasNoticeBody ? doc.splitTextToSize(noticeBody, contentWidth - 16) : [];
        const boxHeight = hasNoticeBody ? (lines.length * lineHeight) + 12 : 0;
        const titleHeight = noticeTitle ? 16 : 0;
        checkPageSpace(titleHeight + boxHeight, sec.title);

        if (noticeTitle) {
          const noticeHNode = structureTree.addStructureElement({
            tag: subHTag,
            title: noticeTitle,
            pageNumber: pageNum,
            isLeaf: true,
            parent: partNode,
          });
          writeMarkedContentStart(doc, subHTag, noticeHNode.mcid);
          doc.setFont('PGSans', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(26, 45, 74);
          doc.text(noticeTitle, margin, curY + 10);
          writeMarkedContentEnd(doc);
          curY += titleHeight;
        }

        // A title with no text is a heading, not a notice -- plan-annual's
        // 'Additional Guardian Signatures' introduces the co-guardian page
        // and carries no body. Drawing the empty bordered box under it would
        // put a blank grey rectangle on the filed page.
        if (!hasNoticeBody) {
          curY += 4;
          continue;
        }

        doc.setFont('PGSans', block.fontStyle || 'italic');
        doc.setFontSize(fs);
        doc.setTextColor(60, 70, 85);

        writeArtifactStart(doc, 'Layout');
        doc.setFillColor(248, 249, 251);
        doc.setDrawColor(208, 213, 221);
        doc.setLineWidth(0.5);
        doc.rect(margin, curY, contentWidth, boxHeight, 'FD');
        writeArtifactEnd(doc);

        const pNode = structureTree.addStructureElement({
          tag: 'P',
          pageNumber: pageNum,
          isLeaf: true,
          parent: partNode,
        });
        writeMarkedContentStart(doc, 'P', pNode.mcid);
        doc.text(lines, margin + 8, curY + 12);
        writeMarkedContentEnd(doc);
        curY += boxHeight + 8;
      }

      else if (block.type === 'key-value-grid') {
        const items = block.items || [];
        // Suppress only the duplicate draw. block.title still feeds the
        // accessibility structure below. (This used to note that the DOCX
        // writer did the same; Milestone 40A removed that format.)
        const shouldRenderKvTitle = !!(block.title && block.title.trim().toLowerCase() !== (sec.title || '').trim().toLowerCase());
        if (shouldRenderKvTitle) {
          checkPageSpace(20, sec.title);
          const subHNode = structureTree.addStructureElement({
            tag: subHTag,
            title: block.title,
            pageNumber: pageNum,
            isLeaf: true,
            parent: partNode,
          });
          writeMarkedContentStart(doc, subHTag, subHNode.mcid);
          doc.setFont('PGSans', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(26, 45, 74);
          doc.text(block.title, margin, curY + 10);
          writeMarkedContentEnd(doc);
          curY += 16;
        }

        const tableNode = structureTree.addStructureElement({
          tag: 'Table',
          title: block.title || 'Case Information',
          summary: block.title ? `${block.title} Summary Table` : 'Case Information Summary Table',
          parent: partNode,
        });

        // Labels and values used to be drawn at fixed x-offsets (label at
        // margin+4, value at margin+115) with no text measurement, so a
        // label wider than the ~111pt gap between them (e.g.
        // "Guardianship Inception Date (GID)" in bold 8pt) would overflow
        // into the value's start position and visually collide with it.
        // Both sides are now measured and wrapped, and the row height
        // grows to fit whichever side needs more lines.
        const KV_LABEL_MAX_W = 98; // usable width inside the 110pt label column
        const KV_VALUE_MAX_W = 148; // usable width inside each ~155pt value column
        const KV_LINE_H = 10;
        const KV_MIN_ROW_H = 18;

        const measureKvItem = (item, valueMaxW) => {
          if (!item) return { labelLines: [], valueLines: [], lines: 1 };
          doc.setFont('PGSans', 'bold');
          doc.setFontSize(8);
          const labelLines = doc.splitTextToSize(String(item.label || ''), KV_LABEL_MAX_W);
          doc.setFont('PGSans', 'normal');
          doc.setFontSize(8);
          const val = sanitizeDisplayValue(item.label, item.value);
          // No key-value item carries a pre-split value today, but the helper
          // above can return one, and String(['a','b']) would quietly produce
          // "a,b". Join deliberately rather than leave that to chance.
          const valueLines = Array.isArray(val)
            ? val.flatMap((line) => doc.splitTextToSize(line, valueMaxW))
            : doc.splitTextToSize(String(val || ''), valueMaxW);
          return { labelLines, valueLines, lines: Math.max(labelLines.length, valueLines.length, 1) };
        };

        for (let i = 0; i < items.length; i += 2) {
          const item1 = items[i];
          const item2 = items[i + 1];
          // When item2 is absent, item1's value cell gets ColSpan:3 and
          // actually has the full remaining row width to work with, not
          // just the ~155pt paired-column width -- measuring it against
          // the narrow width would force-wrap values that have plenty of
          // room, splitting them across lines for no reason.
          const item1ValueMaxW = item2 ? KV_VALUE_MAX_W : (contentWidth - 125);
          const m1 = measureKvItem(item1, item1ValueMaxW);
          const m2 = measureKvItem(item2, KV_VALUE_MAX_W);
          const rowHeight = Math.max(KV_MIN_ROW_H, (Math.max(m1.lines, m2.lines) * KV_LINE_H) + 8);

          checkPageSpace(rowHeight + 4, sec.title);

          const trNode = structureTree.addStructureElement({
            tag: 'TR',
            parent: tableNode,
          });

          // Column 1 Layout background as Artifact
          writeArtifactStart(doc, 'Layout');
          doc.setFillColor(241, 243, 246);
          doc.rect(margin, curY, 110, rowHeight, 'F');
          doc.setDrawColor(208, 213, 221);
          doc.setLineWidth(0.5);
          doc.rect(margin, curY, contentWidth / 2, rowHeight, 'S');
          writeArtifactEnd(doc);

          // Column 1 Label (TH)
          const th1Node = structureTree.addStructureElement({
            tag: 'TH',
            attributes: { O: 'Table', Scope: 'Row' },
            pageNumber: pageNum,
            isLeaf: true,
            parent: trNode,
          });
          writeMarkedContentStart(doc, 'TH', th1Node.mcid);
          doc.setFont('PGSans', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(55, 65, 81);
          doc.text(m1.labelLines, margin + 4, curY + 12);
          writeMarkedContentEnd(doc);

          // Column 1 Value (TD) - Spans 3 columns if item2 is absent to maintain 4-column regularity
          const td1Node = structureTree.addStructureElement({
            tag: 'TD',
            attributes: item2 ? null : { O: 'Table', ColSpan: 3 },
            pageNumber: pageNum,
            isLeaf: true,
            parent: trNode,
          });
          writeMarkedContentStart(doc, 'TD', td1Node.mcid);
          doc.setFont('PGSans', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(17, 24, 39);
          doc.text(m1.valueLines, margin + 115, curY + 12);
          writeMarkedContentEnd(doc);

          // Column 2 if present
          if (item2) {
            const col2X = margin + (contentWidth / 2);
            writeArtifactStart(doc, 'Layout');
            doc.setFillColor(241, 243, 246);
            doc.rect(col2X, curY, 110, rowHeight, 'F');
            doc.setDrawColor(208, 213, 221);
            doc.setLineWidth(0.5);
            doc.rect(col2X, curY, contentWidth / 2, rowHeight, 'S');
            writeArtifactEnd(doc);

            const th2Node = structureTree.addStructureElement({
              tag: 'TH',
              attributes: { O: 'Table', Scope: 'Row' },
              pageNumber: pageNum,
              isLeaf: true,
              parent: trNode,
            });
            writeMarkedContentStart(doc, 'TH', th2Node.mcid);
            doc.setFont('PGSans', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(55, 65, 81);
            doc.text(m2.labelLines, col2X + 4, curY + 12);
            writeMarkedContentEnd(doc);

            const td2Node = structureTree.addStructureElement({
              tag: 'TD',
              pageNumber: pageNum,
              isLeaf: true,
              parent: trNode,
            });
            writeMarkedContentStart(doc, 'TD', td2Node.mcid);
            doc.setFont('PGSans', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(17, 24, 39);
            doc.text(m2.valueLines, col2X + 115, curY + 12);
            writeMarkedContentEnd(doc);
          } else {
            // Fill remainder of row with empty layout border for visual symmetry
            const col2X = margin + (contentWidth / 2);
            writeArtifactStart(doc, 'Layout');
            doc.setDrawColor(208, 213, 221);
            doc.setLineWidth(0.5);
            doc.rect(col2X, curY, contentWidth / 2, rowHeight, 'S');
            writeArtifactEnd(doc);
          }

          curY += rowHeight;
        }
        curY += 8;
      }

      else if (block.type === 'checklist') {
        // Plan-* forms (Milestone 19-2) render ☒/☐ checklist rows in HTML;
        // those Unicode ballot-box codepoints (U+2610/U+2612) aren't in
        // WinAnsiEncoding, so drawing them with the standard-14 Helvetica
        // font would silently fail to render. Instead: a small vector
        // checkbox glyph (decorative /Artifact, drawn either empty or
        // with an X) carries the visual look, and an unambiguous
        // "Yes —"/"No —" text prefix in the tagged content carries the
        // actual checked-state information for screen readers.
        const items = block.items || [];
        const shouldRenderChecklistTitle = !!(block.title && block.title.trim().toLowerCase() !== (sec.title || '').trim().toLowerCase());
        if (shouldRenderChecklistTitle) {
          checkPageSpace(20, sec.title);
          const chHNode = structureTree.addStructureElement({
            tag: subHTag,
            title: block.title,
            pageNumber: pageNum,
            isLeaf: true,
            parent: partNode,
          });
          writeMarkedContentStart(doc, subHTag, chHNode.mcid);
          doc.setFont('PGSans', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(26, 45, 74);
          doc.text(block.title, margin, curY + 10);
          writeMarkedContentEnd(doc);
          curY += 16;
        }

        const CHECK_LINE_H = 11;
        const CHECK_BOX_SIZE = 7;
        const CHECK_LABEL_MAX_W = contentWidth - 20;

        for (const item of items) {
          const label = String((item && item.label) || '');
          const checked = !!(item && item.checked);
          const prefix = checked ? 'Yes — ' : 'No — ';
          doc.setFont('PGSans', 'normal');
          doc.setFontSize(9);
          const lines = doc.splitTextToSize(prefix + label, CHECK_LABEL_MAX_W);
          const rowHeight = Math.max(CHECK_LINE_H, lines.length * CHECK_LINE_H);

          checkPageSpace(rowHeight, sec.title);

          writeArtifactStart(doc, 'Layout');
          doc.setDrawColor(70, 80, 95);
          doc.setLineWidth(0.6);
          doc.rect(margin + 2, curY + 1, CHECK_BOX_SIZE, CHECK_BOX_SIZE, 'S');
          if (checked) {
            doc.line(margin + 2, curY + 1, margin + 2 + CHECK_BOX_SIZE, curY + 1 + CHECK_BOX_SIZE);
            doc.line(margin + 2, curY + 1 + CHECK_BOX_SIZE, margin + 2 + CHECK_BOX_SIZE, curY + 1);
          }
          writeArtifactEnd(doc);

          const rowNode = structureTree.addStructureElement({
            tag: 'P',
            pageNumber: pageNum,
            isLeaf: true,
            parent: partNode,
          });
          writeMarkedContentStart(doc, 'P', rowNode.mcid);
          doc.setFont('PGSans', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(30, 35, 45);
          doc.text(lines, margin + 16, curY + 8);
          writeMarkedContentEnd(doc);

          curY += rowHeight + 3;
        }
        curY += 6;
      }

      else if (block.type === 'table') {
        const { headers, rows, totals, colWidths, colAlign, title: tblTitle } = block;
        // Case-insensitive and trimmed, so 'SCHEDULE A: Income' and
        // 'Schedule A: Income' count as the same heading.
        const shouldRenderTblTitle = !!(tblTitle && tblTitle.trim().toLowerCase() !== (sec.title || '').trim().toLowerCase());
        if (shouldRenderTblTitle) {
          checkPageSpace(20, sec.title);
          const tblHNode = structureTree.addStructureElement({
            tag: subHTag,
            title: tblTitle,
            pageNumber: pageNum,
            isLeaf: true,
            parent: partNode,
          });
          writeMarkedContentStart(doc, subHTag, tblHNode.mcid);
          doc.setFont('PGSans', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(26, 45, 74);
          doc.text(tblTitle, margin, curY + 10);
          writeMarkedContentEnd(doc);
          curY += 16;
        }

        const calculatedColWidths = (colWidths || headers.map(() => 100 / headers.length)).map(pct => (pct / 100) * contentWidth);
        const headerHeight = 18;

        const tableNode = structureTree.addStructureElement({
          tag: 'Table',
          title: tblTitle || sec.title,
          summary: `${tblTitle || sec.title} Schedule Table`,
          parent: partNode,
        });

        const drawTableHeader = (isContinuation = false) => {
          doc.setFont('PGSans', 'bold');
          doc.setFontSize(8);

          // Pre-calculate header line wrapping and dynamic header height to prevent overlap
          const headerLineData = headers.map((hText, hIdx) => {
            const colW = calculatedColWidths[hIdx];
            const usableW = Math.max(10, colW - 6);
            const lines = doc.splitTextToSize(String(hText || ''), usableW);
            return { lines, colW };
          });

          const maxLines = Math.max(1, ...headerLineData.map(h => h.lines.length));
          const dynamicHeaderHeight = Math.max(18, maxLines * 9 + 5);

          if (isContinuation) {
            // ISO 14289-1 (PDF/UA-1 Clause 7.5): Repeated table headers across multi-page
            // continuations are visual pagination artifacts and MUST NOT be added as duplicate
            // TR / TH elements in the logical structure tree.
            writeArtifactStart(doc, 'Pagination', 'Header');
            doc.setFillColor(128, 0, 32); // Deep Burgundy (#800020)
            doc.rect(margin, curY, contentWidth, dynamicHeaderHeight, 'F');
            doc.setDrawColor(100, 0, 25);
            doc.setLineWidth(0.75);
            doc.rect(margin, curY, contentWidth, dynamicHeaderHeight, 'S');

            doc.setFont('PGSans', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);

            let curColX = margin;
            for (let hIdx = 0; hIdx < headers.length; hIdx++) {
              const { lines, colW } = headerLineData[hIdx];
              const align = (colAlign && colAlign[hIdx]) || 'left';
              const textX = align === 'right' ? curColX + colW - 4 : align === 'center' ? curColX + (colW / 2) : curColX + 4;
              const totalTextH = lines.length * 8.5;
              const startY = curY + ((dynamicHeaderHeight - totalTextH) / 2) + 6.5;

              lines.forEach((lineText, lIdx) => {
                doc.text(lineText, textX, startY + (lIdx * 8.5), { align });
              });

              if (hIdx > 0) {
                doc.setDrawColor(160, 40, 65);
                doc.setLineWidth(0.5);
                doc.line(curColX, curY, curColX, curY + dynamicHeaderHeight);
              }
              curColX += colW;
            }
            writeArtifactEnd(doc);
            curY += dynamicHeaderHeight;
            return;
          }

          // Initial Table Header (Single logical TR/TH row in structure tree)
          writeArtifactStart(doc, 'Layout');
          doc.setFillColor(128, 0, 32); // Deep Burgundy (#800020)
          doc.rect(margin, curY, contentWidth, dynamicHeaderHeight, 'F');
          doc.setDrawColor(100, 0, 25);
          doc.setLineWidth(0.75);
          doc.rect(margin, curY, contentWidth, dynamicHeaderHeight, 'S');
          writeArtifactEnd(doc);

          doc.setFont('PGSans', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255); // Crisp White (#FFFFFF)

          const headerTr = structureTree.addStructureElement({
            tag: 'TR',
            parent: tableNode,
          });

          let curColX = margin;
          for (let hIdx = 0; hIdx < headers.length; hIdx++) {
            const { lines, colW } = headerLineData[hIdx];
            const align = (colAlign && colAlign[hIdx]) || 'left';
            const textX = align === 'right' ? curColX + colW - 4 : align === 'center' ? curColX + (colW / 2) : curColX + 4;
            const totalTextH = lines.length * 8.5;
            const startY = curY + ((dynamicHeaderHeight - totalTextH) / 2) + 6.5;

            const thNode = structureTree.addStructureElement({
              tag: 'TH',
              attributes: { O: 'Table', Scope: 'Column' },
              pageNumber: pageNum,
              isLeaf: true,
              parent: headerTr,
            });
            writeMarkedContentStart(doc, 'TH', thNode.mcid);
            lines.forEach((lineText, lIdx) => {
              doc.text(lineText, textX, startY + (lIdx * 8.5), { align });
            });
            writeMarkedContentEnd(doc);

            if (hIdx > 0) {
              writeArtifactStart(doc, 'Layout');
              doc.setDrawColor(160, 40, 65);
              doc.setLineWidth(0.5);
              doc.line(curColX, curY, curColX, curY + dynamicHeaderHeight);
              writeArtifactEnd(doc);
            }
            curColX += colW;
          }
          curY += dynamicHeaderHeight;
        };

        // A cell's value is normally a plain string/number, rendered as one
        // wrapped run. It may instead be a mixed-style cell object
        // ({ main, sub: [{text, italic}] }) so a bold main line (e.g. a
        // property description) can carry small sub-lines beneath it (e.g.
        // an address, or italic notes) the way the HTML preview's
        // <br><small> markup does -- previously this content had no
        // representation in the vector engine at all and was silently
        // dropped by callers rather than mis-rendered.
        const MIXED_SUB_FONT_SIZE = 6.5;
        const MIXED_SUB_LINE_H = 7.5;
        const isMixedCell = (v) => v && typeof v === 'object' && !Array.isArray(v) && ('main' in v || 'sub' in v);

        const measureCell = (cellData, colW) => {
          const usableW = Math.max(20, colW - 10);
          if (isMixedCell(cellData)) {
            doc.setFont('PGSans', 'normal');
            doc.setFontSize(8);
            const mainLines = doc.splitTextToSize(String(cellData.main || ''), usableW);
            const subGroups = (cellData.sub || []).filter(Boolean).map((s) => {
              const text = typeof s === 'string' ? s : (s.text || '');
              const italic = typeof s === 'object' && !!s.italic;
              doc.setFont('PGSans', italic ? 'italic' : 'normal');
              doc.setFontSize(MIXED_SUB_FONT_SIZE);
              return { lines: doc.splitTextToSize(String(text), usableW), italic };
            });
            const subLineTotal = subGroups.reduce((sum, g) => sum + g.lines.length, 0);
            const heightPt = (mainLines.length * 10) + (subLineTotal * MIXED_SUB_LINE_H) + (subGroups.length ? 2 : 0);
            return { isMixed: true, mainLines, subGroups, heightPt };
          }
          doc.setFont('PGSans', 'normal');
          doc.setFontSize(8);
          // A cell may be an array of pre-split lines -- a multi-part mailing
          // address whose components are already discrete stored fields
          // (composePdfAddressLines()). Each element is forced onto its own
          // line and still word-wrapped to the column, the same
          // flatMap-over-known-lines shape the signature-block renderer uses.
          // Without this, the caller's only option was to join the parts into
          // one string, which got a single generic wrap pass and overflowed
          // the right margin. Milestone 40E added this branch and converted
          // the two Certificate of Service call sites it audited; the rest of
          // the address call sites kept passing joined strings until 2026-09-18.
          if (Array.isArray(cellData)) {
            const arrLines = cellData
              .filter((line) => line !== null && line !== undefined && String(line) !== '')
              .flatMap((line) => doc.splitTextToSize(String(line), usableW));
            return { isMixed: false, lines: arrLines, heightPt: Math.max(1, arrLines.length) * 10 };
          }
          const text = String(cellData || '');
          const lines = doc.splitTextToSize(text, usableW);
          // Milestone 60 (2026-09-20): a single unbreakable token wider than
          // its column -- a date, a currency figure, a percentage, an account
          // number -- must never be split character-wise across two lines.
          // splitTextToSize does exactly that when there is no whitespace to
          // break on, and a filer would read "02/14/20" over "26" as two
          // different facts. Shrink the token to fit instead, down to a 6pt
          // floor; below that it is a column-width bug to fix in the model,
          // and pdf-model-column-integrity / the layout e2e specs will show it.
          if (lines.length > 1 && !/\s/.test(text.trim())) {
            const naturalW = doc.getTextWidth(text);
            const fontSize = Math.max(6, Math.floor((8 * usableW / naturalW) * 10) / 10);
            return { isMixed: false, lines: [text], heightPt: 10, fontSize };
          }
          return { isMixed: false, lines, heightPt: lines.length * 10 };
        };

        const drawCell = (measured, textX, yTop, align) => {
          if (!measured.isMixed) {
            doc.setFont('PGSans', 'normal');
            doc.setFontSize(measured.fontSize || 8);
            doc.setTextColor(17, 24, 39);
            doc.text(measured.lines, textX, yTop + 11, { align });
            doc.setFontSize(8);
            return;
          }
          doc.setFont('PGSans', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(17, 24, 39);
          doc.text(measured.mainLines, textX, yTop + 11, { align });
          let y = yTop + 11 + (measured.mainLines.length * 10) - 4;
          for (const group of measured.subGroups) {
            doc.setFont('PGSans', group.italic ? 'italic' : 'normal');
            doc.setFontSize(MIXED_SUB_FONT_SIZE);
            doc.setTextColor(100, 110, 125);
            doc.text(group.lines, textX, y + 6, { align });
            y += group.lines.length * MIXED_SUB_LINE_H;
          }
          doc.setTextColor(17, 24, 39);
        };

        checkPageSpace(headerHeight + 25, sec.title);
        drawTableHeader(false);

        // Draw Table Rows
        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const rowData = rows[rIdx];

          // Calculate max cell height in row (mixed-style cells may need
          // more vertical space than a plain wrapped string of the same
          // line count).
          let maxCellHeightPt = 10;
          const cellMeasures = [];
          for (let cIdx = 0; cIdx < rowData.length; cIdx++) {
            const measured = measureCell(rowData[cIdx], calculatedColWidths[cIdx]);
            cellMeasures.push(measured);
            if (measured.heightPt > maxCellHeightPt) maxCellHeightPt = measured.heightPt;
          }

          const cellHeight = Math.max(16, maxCellHeightPt + 6);

          if (checkPageSpace(cellHeight, sec.title)) {
            drawTableHeader(true);
          }

          // Alternating row background
          if (rIdx % 2 === 1) {
            writeArtifactStart(doc, 'Layout');
            doc.setFillColor(248, 249, 250);
            doc.rect(margin, curY, contentWidth, cellHeight, 'F');
            writeArtifactEnd(doc);
          }

          writeArtifactStart(doc, 'Layout');
          doc.setDrawColor(208, 213, 221);
          doc.setLineWidth(0.5);
          doc.rect(margin, curY, contentWidth, cellHeight, 'S');
          writeArtifactEnd(doc);

          const dataTr = structureTree.addStructureElement({
            tag: 'TR',
            parent: tableNode,
          });

          let cellX = margin;
          for (let cIdx = 0; cIdx < rowData.length; cIdx++) {
            const measured = cellMeasures[cIdx];
            const colW = calculatedColWidths[cIdx];
            const align = (colAlign && colAlign[cIdx]) || 'left';
            const textX = align === 'right' ? cellX + colW - 5 : align === 'center' ? cellX + (colW / 2) : cellX + 5;

            const tdNode = structureTree.addStructureElement({
              tag: 'TD',
              pageNumber: pageNum,
              isLeaf: true,
              parent: dataTr,
            });
            writeMarkedContentStart(doc, 'TD', tdNode.mcid);
            drawCell(measured, textX, curY, align);
            writeMarkedContentEnd(doc);

            if (cIdx > 0) {
              writeArtifactStart(doc, 'Layout');
              doc.setDrawColor(220, 226, 235);
              doc.setLineWidth(0.5);
              doc.line(cellX, curY, cellX, curY + cellHeight);
              writeArtifactEnd(doc);
            }
            cellX += colW;
          }

          curY += cellHeight;
        }

        // Totals Row if present
        if (totals) {
          const totalHeight = 18;
          if (checkPageSpace(totalHeight, sec.title)) {
            drawTableHeader(true);
          }

          writeArtifactStart(doc, 'Layout');
          doc.setFillColor(234, 239, 245);
          doc.rect(margin, curY, contentWidth, totalHeight, 'FD');
          doc.setDrawColor(176, 186, 200);
          doc.setLineWidth(0.75);
          doc.line(margin, curY, pageWidth - margin, curY);
          doc.setLineWidth(1.0);
          doc.line(margin, curY + totalHeight, pageWidth - margin, curY + totalHeight);
          writeArtifactEnd(doc);

          const totalTr = structureTree.addStructureElement({
            tag: 'TR',
            parent: tableNode,
          });

          // totals.value (single number) remains supported for backward
          // compatibility; totals.values (array) supports schedules that
          // need two or more numeric totals in one row (e.g. Schedule
          // B-1's "Total" and "Restricted Amt" columns), which the
          // previous single-{label,value} shape had no way to express and
          // callers silently omitted the second figure to work around.
          const totalValues = Array.isArray(totals.values) && totals.values.length
            ? totals.values
            : [{ value: totals.value }];
          const labelColSpan = Math.max(1, headers.length - totalValues.length);
          let labelSpanWidth = 0;
          for (let k = 0; k < labelColSpan && k < calculatedColWidths.length; k++) labelSpanWidth += calculatedColWidths[k];

          const totalLabelTd = structureTree.addStructureElement({
            tag: 'TD',
            attributes: labelColSpan > 1 ? { O: 'Table', ColSpan: labelColSpan } : null,
            pageNumber: pageNum,
            isLeaf: true,
            parent: totalTr,
          });
          writeMarkedContentStart(doc, 'TD', totalLabelTd.mcid);
          doc.setFont('PGSans', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(17, 24, 39);
          doc.text(totals.label, margin + 6, curY + 12);
          writeMarkedContentEnd(doc);

          let valX = margin + labelSpanWidth;
          for (let vIdx = 0; vIdx < totalValues.length; vIdx++) {
            const colIdx = labelColSpan + vIdx;
            const colW = calculatedColWidths[colIdx] !== undefined
              ? calculatedColWidths[colIdx]
              : (contentWidth - labelSpanWidth) / totalValues.length;

            const totalValTd = structureTree.addStructureElement({
              tag: 'TD',
              attributes: null,
              pageNumber: pageNum,
              isLeaf: true,
              parent: totalTr,
            });
            writeMarkedContentStart(doc, 'TD', totalValTd.mcid);
            doc.setFont('PGSans', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(17, 24, 39);
            doc.text(String(totalValues[vIdx].value ?? ''), valX + colW - 6, curY + 12, { align: 'right' });
            writeMarkedContentEnd(doc);
            valX += colW;
          }

          curY += totalHeight;
        }

        curY += 8;
      }

      else if (block.type === 'signature-block') {
        // wetSignatureExplicit: a blank pen-signature line with no electronic /s/
        // text and no electronic-signature legal notice (Milestone 19-2's
        // plan-* forms are wet-signed, unlike guardian-inventory's
        // electronic /s/ attestations -- the previous renderer had no
        // mode for this and always drew electronic-signature text/notice).
        // fields: an array of rows of [{label, value}, ...], laid out as
        // full-width deliberate column groups. This replaced a flat `details`
        // vertical stack that rendered Object.keys() in one column, losing the
        // source form's grouping and ordering; Milestone 60F migrated the last
        // seven blocks (Annual's four, Simplified's three) off it and deleted
        // it, so there is one signature layout to keep correct rather than two
        // with a known-bad one. tests/unit/signature-block-fields.spec.js
        // holds both halves of that: each block's chosen grouping, and that
        // nothing sets `details` any more.
        const isWetSignature = block.wetSignatureExplicit === true;
        // Milestone 39-B: a Signature Stamp takes priority over both the
        // wet-ink and electronic "/s/" renderings -- signatureState is only
        // ever 'stamp' when the filer actually applied one (see
        // src/core/validation/signature-state.js's checkSignatureState()),
        // so this never silently overrides a typed signature that's
        // actually in effect.
        const hasStampImage = block.signatureState === 'stamp' && !!block.signatureImage;
        // Rows are planned before anything is drawn, so the block reserves
        // real height for a wrapped address -- see planFieldRows(). A block
        // with no fields at all is a signature and date alone, which is a
        // legitimate shape (the plan-* forms' wet-signature blocks).
        const fieldRows = Array.isArray(block.fields) ? block.fields : [];
        const baseSigHeight = isWetSignature ? 58 : 64;
        const fieldLayout = fieldRows.length ? planFieldRows(fieldRows) : null;
        const sigHeight = fieldLayout ? baseSigHeight + 4 + fieldLayout.height : baseSigHeight;
        checkPageSpace(sigHeight + 10, sec.title);

        const sigPartNode = structureTree.addStructureElement({
          tag: 'Part',
          title: `Signature: ${block.signerName || block.role}`,
          parent: partNode,
        });

        // Role & Date Header
        const roleNode = structureTree.addStructureElement({
          tag: subHTag,
          title: block.role || 'Signer',
          pageNumber: pageNum,
          isLeaf: true,
          parent: sigPartNode,
        });
        writeMarkedContentStart(doc, subHTag, roleNode.mcid);
        doc.setFont('PGSans', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(26, 45, 74);
        doc.text(block.role || 'Signer', margin + 2, curY + 12);
        writeMarkedContentEnd(doc);

        if (block.signatureDate) {
          const dateNode = structureTree.addStructureElement({
            tag: 'P',
            pageNumber: pageNum,
            isLeaf: true,
            parent: sigPartNode,
          });
          writeMarkedContentStart(doc, 'P', dateNode.mcid);
          doc.setFont('PGSans', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(55, 65, 81);
          doc.text(`Date: ${block.signatureDate}`, pageWidth - margin - 2, curY + 12, { align: 'right' });
          writeMarkedContentEnd(doc);
        }

        // Signature Line (Layout Artifact)
        writeArtifactStart(doc, 'Layout');
        doc.setDrawColor(140, 150, 165);
        doc.setLineWidth(0.75);
        doc.line(margin + 2, curY + 36, margin + 250, curY + 36);
        writeArtifactEnd(doc);

        if (hasStampImage) {
          // Signature Stamp: the captured/uploaded image sits above the
          // line the same way a wet-ink signature physically would, sized
          // to preserve its own aspect ratio within the line's own width.
          renderSignatureImage(block.signatureImage, { x: margin + 2, y: curY + 6, maxWidth: 246, maxHeight: 28 });
          const sigLabelNode = structureTree.addStructureElement({
            tag: 'P',
            pageNumber: pageNum,
            isLeaf: true,
            parent: sigPartNode,
          });
          writeMarkedContentStart(doc, 'P', sigLabelNode.mcid);
          doc.setFont('PGSans', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 110, 125);
          doc.text(`Signature of ${block.signerName || ''}`.trim(), margin + 2, curY + 46);
          writeMarkedContentEnd(doc);
        } else if (isWetSignature) {
          // Wet-ink signature: the line above is left blank for a pen
          // signature rather than an electronic /s/ rendering, and there
          // is no electronic-signature legal notice, since none applies
          // to a physically-signed page.
          const sigLabelNode = structureTree.addStructureElement({
            tag: 'P',
            pageNumber: pageNum,
            isLeaf: true,
            parent: sigPartNode,
          });
          writeMarkedContentStart(doc, 'P', sigLabelNode.mcid);
          doc.setFont('PGSans', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 110, 125);
          doc.text(`Signature of ${block.signerName || ''}`.trim(), margin + 2, curY + 46);
          writeMarkedContentEnd(doc);
        } else {
          // Electronic /s/ Signature Rendering
          const sigTextNode = structureTree.addStructureElement({
            tag: 'P',
            pageNumber: pageNum,
            isLeaf: true,
            parent: sigPartNode,
          });
          writeMarkedContentStart(doc, 'P', sigTextNode.mcid);
          doc.setFont('PGSans', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(20, 25, 35);
          doc.text(block.signature || `/s/ ${block.signerName}`, margin + 4, curY + 30);
          writeMarkedContentEnd(doc);

          const sigLegalNoticeNode = structureTree.addStructureElement({
            tag: 'P',
            pageNumber: pageNum,
            isLeaf: true,
            parent: sigPartNode,
          });
          writeMarkedContentStart(doc, 'P', sigLegalNoticeNode.mcid);
          doc.setFont('PGSans', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 110, 125);
          doc.text('Signature (Electronic /s/ pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515)', margin + 2, curY + 46);
          writeMarkedContentEnd(doc);
        }

        if (fieldLayout) {
          // Field grid: full-width rows of {label, value} pairs in deliberate
          // column groups matching the source form's own grouping (e.g. Phone
          // | SSN/EIN on one row, the address on its own). Positions, wrapping
          // and per-row heights were all resolved by planFieldRows() above, so
          // what is drawn here is exactly what the block reserved space for.
          let rowY = curY + baseSigHeight + 2;
          for (const row of fieldLayout.rows) {
            for (const cell of row.cells) {
              if (!cell) continue;
              const fieldNode = structureTree.addStructureElement({
                tag: 'P',
                pageNumber: pageNum,
                isLeaf: true,
                parent: sigPartNode,
              });
              writeMarkedContentStart(doc, 'P', fieldNode.mcid);
              doc.setFont('PGSans', 'bold');
              doc.setFontSize(FIELD_LABEL_SIZE);
              doc.setTextColor(70, 80, 95);
              doc.text(cell.label, cell.x, rowY);
              doc.setFont('PGSans', 'normal');
              doc.setFontSize(FIELD_VALUE_SIZE);
              doc.setTextColor(30, 35, 45);
              doc.text(cell.lines, cell.x, rowY + FIELD_VALUE_DROP);
              writeMarkedContentEnd(doc);
            }
            rowY += row.height;
          }
        }

        curY += sigHeight + 8;
      }

      else if (block.type === 'supporting-documents') {
        await renderSupportingDocuments(block, sec.title, partNode);
        if (Array.isArray(block.files) && block.files.length && sIdx < sections.length - 1) {
          forcePageBreakBeforeNextSection = true;
        }
      }
    }
  }

  // 3. Stamp Running Footers with accurate Total Page Count
  const totalPages = doc.internal.getNumberOfPages ? doc.internal.getNumberOfPages() : pageNum;
  for (let p = 1; p <= totalPages; p++) {
    if (attachmentPageNumbers.has(p)) continue;
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  doc.__pgNativePdfAttachments = nativePdfAttachments;

  return doc;
}

export const generateVerifiedInventoryPdf = generateCourtFormPdf;
