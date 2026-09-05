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

export async function createJsPdfInstance() {
  if (typeof window === 'undefined') return null;
  if (window.jspdf && window.jspdf.jsPDF) {
    return new window.jspdf.jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait', compress: true });
  }
  if (window.jsPDF) {
    return new window.jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait', compress: true });
  }
  if (typeof window.html2pdf === 'function') {
    const dummy = document.createElement('div');
    const worker = window.html2pdf().from(dummy).set({ jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' } });
    const pdf = await worker.toPdf().get('pdf');
    if (pdf && typeof pdf.setFont === 'function') {
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
  const wardName = metadata.wardName || 'Ward';
  const caseNumber = metadata.caseNumber || '';
  const county = (metadata.county || 'Pinellas').toUpperCase();
  const signatureStyle = metadata.signatureStyle || 'typed';

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
  const pageBottom = pageHeight - 54; // Leave room for footer

  let curY = margin;
  let pageNum = 1;
  const pageNumbersBySection = {};
  const parentOutlineMap = {};

  const drawFirstPagePleadingHeader = () => {
    writeArtifactStart(doc, 'Pagination', 'Header');
    const caption = getFloridaCircuitCourtCaption(county);

    doc.setFont('PGSans', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(caption.line1, pageWidth / 2, 50, { align: 'center' });
    doc.text(caption.line2, pageWidth / 2, 64, { align: 'center' });

    doc.setFontSize(10);
    doc.text(caption.division, pageWidth / 2, 78, { align: 'center' });
    doc.text(`CASE #: ${caseNumber || 'Pending'}`, pageWidth / 2, 92, { align: 'center' });

    const caseCaption = getCaseCaptionTitle(wardName, metadata.wardType);
    doc.setFontSize(11);
    doc.text(caseCaption, margin, 122);

    const formTitle = (metadata.formName || metadata.title || 'VERIFIED INITIAL INVENTORY').toUpperCase();
    doc.setFontSize(12.5);
    doc.text(formTitle, pageWidth / 2, 152, { align: 'center' });

    const titleW = doc.getTextWidth(formTitle);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.75);
    doc.line((pageWidth - titleW) / 2, 155, (pageWidth + titleW) / 2, 155);
    writeArtifactEnd(doc);
  };

  const drawContinuationHeader = (sectionTitle) => {
    writeArtifactStart(doc, 'Pagination', 'Header');
    const caption = getFloridaCircuitCourtCaption(county);
    doc.setFont('PGSans', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 45, 74); // Court Navy (#1a2d4a)
    doc.text(`${caption.line1} ${caption.line2}`, pageWidth / 2, 26, { align: 'center' });

    doc.setFontSize(9);
    const formTitle = (metadata.formName || metadata.title || 'VERIFIED INITIAL INVENTORY').toUpperCase();
    doc.text(`PROBATE DIVISION — ${formTitle}`, pageWidth / 2, 38, { align: 'center' });

    // Framed 3-column bounded metadata bar (contentWidth = 468 pt)
    const barTop = 46;
    const barHeight = 18;
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
    // Clamp each cell to its 156pt column so overlong text can't bleed into
    // adjacent columns. splitTextToSize returns an array; we always take [0].
    const COL_W = 156;
    const COL_PAD = 10; // left+right pad inside column
    const wardLabel = `Ward: ${wardName}`;
    const wardLine = doc.splitTextToSize(wardLabel, COL_W - COL_PAD)[0] || wardLabel;
    doc.text(wardLine, margin + 6, barTop + 12);
    const midLabel = sectionTitle || '';
    const midLine = doc.splitTextToSize(midLabel, COL_W - COL_PAD)[0] || midLabel;
    doc.text(midLine, margin + 234, barTop + 12, { align: 'center' });
    const caseLabel = `Case #: ${caseNumber || 'Pending'}`;
    const caseLine = doc.splitTextToSize(caseLabel, COL_W - COL_PAD)[0] || caseLabel;
    doc.text(caseLine, pageWidth - margin - 6, barTop + 12, { align: 'right' });
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
    doc.line(margin, pageHeight - 44, pageWidth - margin, pageHeight - 44);

    const footerSubtitle = metadata.formSubtitle || metadata.formName || 'Florida Guardianship Report';
    doc.text(`${footerSubtitle} — ${wardName}`, margin, pageHeight - 30);
    doc.text(`Page ${currentP} of ${totalP}`, pageWidth - margin, pageHeight - 30, { align: 'right' });
    writeArtifactEnd(doc);
  };

  const startNewPage = (sectionTitle) => {
    doc.addPage();
    pageNum++;
    curY = 74;
    drawHeader(sectionTitle);
  };

  const checkPageSpace = (neededHeight, sectionTitle) => {
    if (curY + neededHeight > pageBottom) {
      startNewPage(sectionTitle);
      return true;
    }
    return false;
  };

  // Draw initial first page header
  drawHeader(sections[0]?.title || 'Part I — Required Information');
  curY = 175;

  // 2. Render each section in order with semantic structure tagging
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];

    if (sec.pageBreakBefore && sIdx > 0 && curY > 80) {
      startNewPage(sec.title);
    }

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
        doc.outline.add(parentNode, sec.bookmarkTitle, { pageNumber: pageNum, y: curY });
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
        doc.setFont('PGSans', block.fontStyle || 'italic');
        const fs = block.fontSize || 9.5;
        doc.setFontSize(fs);
        doc.setTextColor(60, 70, 85);
        const lineHeight = fs * 1.35;
        const lines = doc.splitTextToSize(block.text, contentWidth - 16);
        const boxHeight = (lines.length * lineHeight) + 12;
        checkPageSpace(boxHeight, sec.title);

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
        if (block.title) {
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
          const valueLines = doc.splitTextToSize(String(item.value || ''), valueMaxW);
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
        if (block.title) {
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
        if (tblTitle && tblTitle !== sec.title) {
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
          if (isContinuation) {
            // ISO 14289-1 (PDF/UA-1 Clause 7.5): Repeated table headers across multi-page
            // continuations are visual pagination artifacts and MUST NOT be added as duplicate
            // TR / TH elements in the logical structure tree.
            writeArtifactStart(doc, 'Pagination', 'Header');
            doc.setFillColor(128, 0, 32); // Deep Burgundy (#800020)
            doc.rect(margin, curY, contentWidth, headerHeight, 'F');
            doc.setDrawColor(100, 0, 25);
            doc.setLineWidth(0.75);
            doc.rect(margin, curY, contentWidth, headerHeight, 'S');

            doc.setFont('PGSans', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);

            let curColX = margin;
            for (let hIdx = 0; hIdx < headers.length; hIdx++) {
              const colW = calculatedColWidths[hIdx];
              const align = (colAlign && colAlign[hIdx]) || 'left';
              const textX = align === 'right' ? curColX + colW - 5 : align === 'center' ? curColX + (colW / 2) : curColX + 5;
              doc.text(headers[hIdx], textX, curY + 12, { align });

              if (hIdx > 0) {
                doc.setDrawColor(160, 40, 65);
                doc.setLineWidth(0.5);
                doc.line(curColX, curY, curColX, curY + headerHeight);
              }
              curColX += colW;
            }
            writeArtifactEnd(doc);
            curY += headerHeight;
            return;
          }

          // Initial Table Header (Single logical TR/TH row in structure tree)
          writeArtifactStart(doc, 'Layout');
          doc.setFillColor(128, 0, 32); // Deep Burgundy (#800020)
          doc.rect(margin, curY, contentWidth, headerHeight, 'F');
          doc.setDrawColor(100, 0, 25);
          doc.setLineWidth(0.75);
          doc.rect(margin, curY, contentWidth, headerHeight, 'S');
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
            const colW = calculatedColWidths[hIdx];
            const align = (colAlign && colAlign[hIdx]) || 'left';
            const textX = align === 'right' ? curColX + colW - 5 : align === 'center' ? curColX + (colW / 2) : curColX + 5;

            const thNode = structureTree.addStructureElement({
              tag: 'TH',
              attributes: { O: 'Table', Scope: 'Column' },
              pageNumber: pageNum,
              isLeaf: true,
              parent: headerTr,
            });
            writeMarkedContentStart(doc, 'TH', thNode.mcid);
            doc.text(headers[hIdx], textX, curY + 12, { align });
            writeMarkedContentEnd(doc);

            if (hIdx > 0) {
              writeArtifactStart(doc, 'Layout');
              doc.setDrawColor(160, 40, 65);
              doc.setLineWidth(0.5);
              doc.line(curColX, curY, curColX, curY + headerHeight);
              writeArtifactEnd(doc);
            }
            curColX += colW;
          }
          curY += headerHeight;
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
          const lines = doc.splitTextToSize(String(cellData || ''), usableW);
          return { isMixed: false, lines, heightPt: lines.length * 10 };
        };

        const drawCell = (measured, textX, yTop, align) => {
          if (!measured.isMixed) {
            doc.setFont('PGSans', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(17, 24, 39);
            doc.text(measured.lines, textX, yTop + 11, { align });
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
        // wetSignature: a blank pen-signature line with no electronic /s/
        // text and no electronic-signature legal notice (Milestone 19-2's
        // plan-* forms are wet-signed, unlike guardian-inventory's
        // electronic /s/ attestations -- the previous renderer had no
        // mode for this and always drew electronic-signature text/notice).
        // fields: an array of rows of [{label, value}, ...], laid out as
        // full-width deliberate column groups (replacing the old flat
        // `details` vertical stack, which lost the source HTML's grouping
        // and ordering by rendering Object.keys() in a single column).
        const isWetSignature = block.wetSignature === true || block.useSlashS === false;
        const fieldRows = Array.isArray(block.fields) ? block.fields : null;
        const FIELD_ROW_H = 18;
        const baseSigHeight = isWetSignature ? 46 : 64;
        const sigHeight = fieldRows ? baseSigHeight + (fieldRows.length * FIELD_ROW_H) : baseSigHeight;
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

        if (isWetSignature) {
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
          doc.text('Signature', margin + 2, curY + 46);
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
          const effectiveStyle = block.signatureStyle || signatureStyle;
          if (effectiveStyle === 'script') {
            // Script-style rendering using PGSans-Italic with stylistic padding
            doc.setFont('PGSans', 'italic');
            doc.setFontSize(12);
            doc.setTextColor(15, 35, 75);
            doc.text(block.signature || `/s/ ${block.signerName}`, margin + 6, curY + 32);
          } else {
            // Standard typed /s/ rendering
            doc.setFont('PGSans', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(20, 25, 35);
            doc.text(block.signature || `/s/ ${block.signerName}`, margin + 4, curY + 32);
          }
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

        if (fieldRows) {
          // Field grid (preferred): full-width rows of {label, value}
          // pairs in deliberate column groups matching the source HTML's
          // grid ordering (e.g. SSN/EIN | Phone | Street Address on one
          // row, City/State/Zip on the next).
          let rowY = curY + baseSigHeight - 8;
          for (const row of fieldRows) {
            const cols = row.length || 1;
            const colW = contentWidth / cols;
            for (let fIdx = 0; fIdx < row.length; fIdx++) {
              const field = row[fIdx];
              if (!field || !field.value) continue;
              const fx = margin + (fIdx * colW) + 2;
              const fieldNode = structureTree.addStructureElement({
                tag: 'P',
                pageNumber: pageNum,
                isLeaf: true,
                parent: sigPartNode,
              });
              writeMarkedContentStart(doc, 'P', fieldNode.mcid);
              doc.setFont('PGSans', 'bold');
              doc.setFontSize(7);
              doc.setTextColor(70, 80, 95);
              doc.text(String(field.label || ''), fx, rowY);
              doc.setFont('PGSans', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(30, 35, 45);
              // Wrap value text within the column so long addresses (e.g.
              // "418 Orange Blossom Lane, New Port Richey, FL 34652") don't
              // overflow into the right margin. Each field column is
              // contentWidth/cols wide; subtract 4pt for left padding.
              const fieldMaxW = colW - 4;
              const fieldLines = doc.splitTextToSize(String(field.value), fieldMaxW);
              doc.text(fieldLines, fx, rowY + 9);
              writeMarkedContentEnd(doc);
            }
            rowY += FIELD_ROW_H;
          }
        } else if (block.details) {
          // Legacy flat details stack (right column) -- kept for backward
          // compatibility with any caller not yet migrated to `fields`.
          const detailKeys = Object.keys(block.details);
          let detailY = curY + 28;
          for (const k of detailKeys) {
            const val = block.details[k];
            if (val) {
              const detailNode = structureTree.addStructureElement({
                tag: 'P',
                pageNumber: pageNum,
                isLeaf: true,
                parent: sigPartNode,
              });
              writeMarkedContentStart(doc, 'P', detailNode.mcid);
              doc.setFont('PGSans', 'bold');
              doc.setFontSize(7.5);
              doc.setTextColor(70, 80, 95);
              doc.text(`${k}: `, margin + 280, detailY);
              doc.setFont('PGSans', 'normal');
              doc.text(String(val), margin + 340, detailY);
              writeMarkedContentEnd(doc);
              detailY += 11;
            }
          }
        }

        curY += sigHeight + 8;
      }
    }
  }

  // 3. Stamp Running Footers with accurate Total Page Count
  const totalPages = doc.internal.getNumberOfPages ? doc.internal.getNumberOfPages() : pageNum;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  return doc;
}

export const generateVerifiedInventoryPdf = generateCourtFormPdf;
