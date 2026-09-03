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

export async function generateVerifiedInventoryPdf(model, options = {}) {
  const doc = await createJsPdfInstance();
  if (!doc) {
    throw new Error('jsPDF library not available in environment.');
  }

  // Set PDF version to 1.7 (required for PDF/UA-1 / ISO 14289-1 conformance)
  if (doc.__private__ && typeof doc.__private__.setPdfVersion === 'function') {
    doc.__private__.setPdfVersion('1.7');
  }

  const { metadata, sections } = model;
  const wardName = metadata.wardName || 'Ward';
  const caseNumber = metadata.caseNumber || '';
  const county = (metadata.county || 'Pinellas').toUpperCase();
  const signatureStyle = metadata.signatureStyle || 'typed';

  // Initialize PDF/UA-1 and WCAG 2.1 structure tree & accessibility hooks
  const structureTree = new PdfStructureTree(metadata);
  attachAccessibilityHooks(doc, structureTree);

  // 1. Set Document Properties & Metadata
  const props = {
    title: metadata.title,
    subject: metadata.subject,
    author: metadata.author,
    creator: metadata.creator,
    keywords: 'Florida, Probate, Guardianship, Verified Initial Inventory',
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

  // Page geometry (Letter = 612 x 792 pt)
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2); // 540 pt
  const pageBottom = pageHeight - 45; // Leave room for footer

  let curY = margin;
  let pageNum = 1;
  const pageNumbersBySection = {};
  const parentOutlineMap = {};

  const drawHeader = (sectionTitle) => {
    writeArtifactStart(doc, 'Pagination', 'Header');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(26, 45, 74); // Court Navy (#1a2d4a)
    doc.text(`IN THE CIRCUIT COURT FOR ${county} COUNTY, FLORIDA`, pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.text('PROBATE DIVISION — VERIFIED INITIAL INVENTORY', pageWidth / 2, 40, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 90, 105);
    doc.text(`Ward: ${wardName}`, margin, 52);
    doc.text(sectionTitle || '', pageWidth / 2, 52, { align: 'center' });
    doc.text(`Case #: ${caseNumber || 'Pending'}`, pageWidth - margin, 52, { align: 'right' });

    doc.setDrawColor(200, 208, 220);
    doc.setLineWidth(0.75);
    doc.line(margin, 56, pageWidth - margin, 56);
    writeArtifactEnd(doc);
  };

  const drawFooter = (currentP, totalP) => {
    writeArtifactStart(doc, 'Pagination', 'Footer');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 120, 135);
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);

    doc.text(`Verified Initial Inventory — ${wardName}`, margin, pageHeight - 20);
    doc.text(`Page ${currentP} of ${totalP}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
    writeArtifactEnd(doc);
  };

  const startNewPage = (sectionTitle) => {
    doc.addPage();
    pageNum++;
    curY = 68;
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
  curY = 68;

  // 2. Render each section in order with semantic structure tagging
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];

    if (sec.pageBreakBefore && sIdx > 0 && curY > 75) {
      startNewPage(sec.title);
    }

    pageNumbersBySection[sec.id] = pageNum;

    // Register Outline / Bookmarks
    if (doc.outline && typeof doc.outline.add === 'function') {
      try {
        let parentNode = null;
        if (sec.parentBookmark) {
          if (!parentOutlineMap[sec.parentBookmark]) {
            parentOutlineMap[sec.parentBookmark] = doc.outline.add(null, sec.parentBookmark, { pageNumber: pageNum });
          }
          parentNode = parentOutlineMap[sec.parentBookmark];
        }
        doc.outline.add(parentNode, sec.bookmarkTitle, { pageNumber: pageNum });
      } catch (e) {
        console.warn('Could not add outline entry for', sec.bookmarkTitle, e);
      }
    }

    // Structure Node for this Section (Part)
    const partNode = structureTree.addStructureElement({
      tag: 'Part',
      title: sec.title,
      parent: structureTree.rootNode,
    });

    // Section Title Heading (<H1> or <H2>)
    checkPageSpace(30, sec.title);
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(130, 0, 36); // Court Maroon (#820024)
    doc.text(sec.title, margin, curY + 12);
    writeMarkedContentEnd(doc);
    curY += 22;

    // Render Blocks in this Section
    for (const block of (sec.blocks || sec.renderBlocks || [])) {
      if (block.type === 'notice') {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(70, 80, 95);
        const lines = doc.splitTextToSize(block.text, contentWidth);
        const boxHeight = (lines.length * 12) + 12;
        checkPageSpace(boxHeight, sec.title);

        writeArtifactStart(doc, 'Layout');
        doc.setFillColor(247, 249, 252);
        doc.setDrawColor(220, 226, 235);
        doc.rect(margin, curY, contentWidth, boxHeight, 'FD');
        writeArtifactEnd(doc);

        const pNode = structureTree.addStructureElement({
          tag: 'P',
          pageNumber: pageNum,
          isLeaf: true,
          parent: partNode,
        });
        writeMarkedContentStart(doc, 'P', pNode.mcid);
        doc.text(lines, margin + 8, curY + 13);
        writeMarkedContentEnd(doc);
        curY += boxHeight + 10;
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
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(26, 45, 74);
          doc.text(block.title, margin, curY + 10);
          writeMarkedContentEnd(doc);
          curY += 16;
        }

        const tableNode = structureTree.addStructureElement({
          tag: 'Table',
          title: block.title || 'Case Information',
          parent: partNode,
        });

        const rowHeight = 18;
        for (let i = 0; i < items.length; i += 2) {
          checkPageSpace(rowHeight + 4, sec.title);
          const item1 = items[i];
          const item2 = items[i + 1];

          const trNode = structureTree.addStructureElement({
            tag: 'TR',
            parent: tableNode,
          });

          // Layout backgrounds as Artifact
          writeArtifactStart(doc, 'Layout');
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, curY, 110, rowHeight, 'F');
          doc.setDrawColor(225, 230, 240);
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
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(60, 70, 85);
          doc.text(item1.label, margin + 4, curY + 12);
          writeMarkedContentEnd(doc);

          // Column 1 Value (TD)
          const td1Node = structureTree.addStructureElement({
            tag: 'TD',
            pageNumber: pageNum,
            isLeaf: true,
            parent: trNode,
          });
          writeMarkedContentStart(doc, 'TD', td1Node.mcid);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(20, 25, 35);
          doc.text(String(item1.value || ''), margin + 115, curY + 12);
          writeMarkedContentEnd(doc);

          // Column 2 if present
          if (item2) {
            const col2X = margin + (contentWidth / 2);
            writeArtifactStart(doc, 'Layout');
            doc.setFillColor(248, 250, 252);
            doc.rect(col2X, curY, 110, rowHeight, 'F');
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
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60, 70, 85);
            doc.text(item2.label, col2X + 4, curY + 12);
            writeMarkedContentEnd(doc);

            const td2Node = structureTree.addStructureElement({
              tag: 'TD',
              pageNumber: pageNum,
              isLeaf: true,
              parent: trNode,
            });
            writeMarkedContentStart(doc, 'TD', td2Node.mcid);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(20, 25, 35);
            doc.text(String(item2.value || ''), col2X + 115, curY + 12);
            writeMarkedContentEnd(doc);
          }

          curY += rowHeight;
        }
        curY += 10;
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
          doc.setFont('helvetica', 'bold');
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
          parent: partNode,
        });

        const drawTableHeader = () => {
          writeArtifactStart(doc, 'Layout');
          doc.setFillColor(238, 242, 248);
          doc.rect(margin, curY, contentWidth, headerHeight, 'F');
          doc.setDrawColor(180, 190, 205);
          doc.setLineWidth(0.75);
          doc.rect(margin, curY, contentWidth, headerHeight, 'S');
          writeArtifactEnd(doc);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(26, 45, 74);

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
              doc.line(curColX, curY, curColX, curY + headerHeight);
              writeArtifactEnd(doc);
            }
            curColX += colW;
          }
          curY += headerHeight;
        };

        checkPageSpace(headerHeight + 25, sec.title);
        drawTableHeader();

        // Draw Table Rows
        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const rowData = rows[rIdx];

          // Calculate max wrapped lines in row
          let maxLines = 1;
          const cellTextLines = [];
          for (let cIdx = 0; cIdx < rowData.length; cIdx++) {
            const cellText = String(rowData[cIdx] || '');
            const colW = calculatedColWidths[cIdx] - 10;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const lines = doc.splitTextToSize(cellText, Math.max(20, colW));
            cellTextLines.push(lines);
            if (lines.length > maxLines) maxLines = lines.length;
          }

          const cellHeight = Math.max(16, (maxLines * 10) + 6);

          if (checkPageSpace(cellHeight, sec.title)) {
            drawTableHeader();
          }

          // Alternating row background
          if (rIdx % 2 === 1) {
            writeArtifactStart(doc, 'Layout');
            doc.setFillColor(252, 253, 255);
            doc.rect(margin, curY, contentWidth, cellHeight, 'F');
            writeArtifactEnd(doc);
          }

          writeArtifactStart(doc, 'Layout');
          doc.setDrawColor(220, 226, 235);
          doc.setLineWidth(0.5);
          doc.rect(margin, curY, contentWidth, cellHeight, 'S');
          writeArtifactEnd(doc);

          const dataTr = structureTree.addStructureElement({
            tag: 'TR',
            parent: tableNode,
          });

          let cellX = margin;
          for (let cIdx = 0; cIdx < rowData.length; cIdx++) {
            const lines = cellTextLines[cIdx];
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
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(30, 35, 45);
            doc.text(lines, textX, curY + 11, { align });
            writeMarkedContentEnd(doc);

            if (cIdx > 0) {
              writeArtifactStart(doc, 'Layout');
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
            drawTableHeader();
          }

          writeArtifactStart(doc, 'Layout');
          doc.setFillColor(242, 245, 250);
          doc.rect(margin, curY, contentWidth, totalHeight, 'FD');
          writeArtifactEnd(doc);

          const totalTr = structureTree.addStructureElement({
            tag: 'TR',
            parent: tableNode,
          });

          const totalLabelTd = structureTree.addStructureElement({
            tag: 'TD',
            pageNumber: pageNum,
            isLeaf: true,
            parent: totalTr,
          });
          writeMarkedContentStart(doc, 'TD', totalLabelTd.mcid);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(26, 45, 74);
          doc.text(totals.label, margin + 6, curY + 12);
          writeMarkedContentEnd(doc);

          const totalValTd = structureTree.addStructureElement({
            tag: 'TD',
            pageNumber: pageNum,
            isLeaf: true,
            parent: totalTr,
          });
          writeMarkedContentStart(doc, 'TD', totalValTd.mcid);
          doc.text(String(totals.value), pageWidth - margin - 6, curY + 12, { align: 'right' });
          writeMarkedContentEnd(doc);

          curY += totalHeight;
        }

        curY += 10;
      }

      else if (block.type === 'signature-block') {
        const sigHeight = 70;
        checkPageSpace(sigHeight + 10, sec.title);

        writeArtifactStart(doc, 'Layout');
        doc.setFillColor(250, 251, 253);
        doc.setDrawColor(215, 222, 232);
        doc.setLineWidth(0.5);
        doc.rect(margin, curY, contentWidth, sigHeight, 'FD');
        writeArtifactEnd(doc);

        const sigPartNode = structureTree.addStructureElement({
          tag: 'Part',
          title: `Signature: ${block.signerName || block.role}`,
          parent: partNode,
        });

        // Role & Date Header
        const roleNode = structureTree.addStructureElement({
          tag: subHTag,
          pageNumber: pageNum,
          isLeaf: true,
          parent: sigPartNode,
        });
        writeMarkedContentStart(doc, subHTag, roleNode.mcid);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(26, 45, 74);
        doc.text(block.role || 'Signer', margin + 8, curY + 14);
        writeMarkedContentEnd(doc);

        if (block.signatureDate) {
          const dateNode = structureTree.addStructureElement({
            tag: 'P',
            pageNumber: pageNum,
            isLeaf: true,
            parent: sigPartNode,
          });
          writeMarkedContentStart(doc, 'P', dateNode.mcid);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(80, 90, 100);
          doc.text(`Date: ${block.signatureDate}`, pageWidth - margin - 8, curY + 14, { align: 'right' });
          writeMarkedContentEnd(doc);
        }

        // Signature Line (Layout Artifact)
        writeArtifactStart(doc, 'Layout');
        doc.setDrawColor(180, 190, 205);
        doc.line(margin + 8, curY + 42, margin + 260, curY + 42);
        writeArtifactEnd(doc);

        // Electronic /s/ Signature Rendering
        const sigTextNode = structureTree.addStructureElement({
          tag: 'P',
          pageNumber: pageNum,
          isLeaf: true,
          parent: sigPartNode,
        });
        writeMarkedContentStart(doc, 'P', sigTextNode.mcid);
        if (signatureStyle === 'script') {
          // Script-style rendering using Times-Italic with stylistic padding
          doc.setFont('times', 'italic');
          doc.setFontSize(13);
          doc.setTextColor(15, 35, 75);
          doc.text(block.signature || `/s/ ${block.signerName}`, margin + 12, curY + 38);
        } else {
          // Standard typed /s/ rendering
          doc.setFont('times', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(20, 25, 35);
          doc.text(block.signature || `/s/ ${block.signerName}`, margin + 10, curY + 38);
        }
        writeMarkedContentEnd(doc);

        const sigLegalNoticeNode = structureTree.addStructureElement({
          tag: 'P',
          pageNumber: pageNum,
          isLeaf: true,
          parent: sigPartNode,
        });
        writeMarkedContentStart(doc, 'P', sigLegalNoticeNode.mcid);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 110, 125);
        doc.text('Signature (Electronic /s/ pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515)', margin + 8, curY + 52);
        writeMarkedContentEnd(doc);

        // Details (Right Column)
        if (block.details) {
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
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(7.5);
              doc.setTextColor(70, 80, 95);
              doc.text(`${k}: `, margin + 280, detailY);
              doc.setFont('helvetica', 'normal');
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

