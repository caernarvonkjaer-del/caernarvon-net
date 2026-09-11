import { PDFDocument, degrees } from '../../../lib/pdf-lib.esm.js';
import {
  assertFilingEligibleSupplement,
  dataUrlToBytes,
  SUPPLEMENTAL_PDF_LIMITS,
} from './supplemental-pdf.js';

export async function finalizeCourtFormPdf(doc) {
  const sourcePages = doc.__pgNativePdfAttachments || [];
  if (!sourcePages.length) return new Uint8Array(doc.output('arraybuffer'));

  const filing = await PDFDocument.load(doc.output('arraybuffer'), { ignoreEncryption: true });
  const sourceDocuments = new Map();
  const uniqueFiles = new Map();

  for (const sourcePage of sourcePages) {
    const file = sourcePage.file || sourcePage;
    assertFilingEligibleSupplement(file);
    const key = file.id || file.contentDigest || file.dataUrl;
    if (!uniqueFiles.has(key)) uniqueFiles.set(key, file);
  }

  const totals = [...uniqueFiles.values()].reduce((acc, file) => {
    const bytes = dataUrlToBytes(file.dataUrl);
    acc.bytes += bytes.length;
    acc.pages += Number(file.pageCount || 0);
    return acc;
  }, { bytes: 0, pages: 0 });
  if (totals.bytes > SUPPLEMENTAL_PDF_LIMITS.maxTotalBytes) {
    throw new Error('Supplemental PDFs exceed the total packet attachment size limit.');
  }
  if (totals.pages > SUPPLEMENTAL_PDF_LIMITS.maxTotalPages) {
    throw new Error('Supplemental PDFs exceed the total packet page limit.');
  }

  const targetW = filing.getPageCount() > 0
    ? ((filing.getPage(0).getRotation().angle % 180 === 0) ? filing.getPage(0).getWidth() : filing.getPage(0).getHeight())
    : 612;

  for (const sourcePage of sourcePages) {
    const file = sourcePage.file || sourcePage;
    let sourceDocument = sourceDocuments.get(file.dataUrl);
    if (!sourceDocument) {
      const sourceBytes = dataUrlToBytes(file.dataUrl);
      sourceDocument = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      sourceDocuments.set(file.dataUrl, sourceDocument);
    }

    const [originalPage] = await filing.copyPages(sourceDocument, [sourcePage.sourcePageIndex]);

    // Auto-rotate landscape orientation (width > height) to portrait
    const rotAngle = originalPage.getRotation().angle;
    const isLandscape = (rotAngle % 180 === 0)
      ? (originalPage.getWidth() > originalPage.getHeight())
      : (originalPage.getHeight() > originalPage.getWidth());

    if (isLandscape) {
      originalPage.setRotation(degrees((rotAngle + 90) % 360));
    }

    // Limit width to maximum available on page (targetW)
    const currentRot = originalPage.getRotation().angle;
    const effectiveWidth = (currentRot % 180 === 0) ? originalPage.getWidth() : originalPage.getHeight();
    if (effectiveWidth > targetW) {
      const factor = targetW / effectiveWidth;
      originalPage.scale(factor, factor);
    }

    filing.removePage(sourcePage.pageNumber - 1);
    filing.insertPage(sourcePage.pageNumber - 1, originalPage);
  }

  return await filing.save({ useObjectStreams: false });
}

export function saveFinalizedPdf(pdfBytes, filename) {
  if (pdfBytes?.length > SUPPLEMENTAL_PDF_LIMITS.finalPacketWarningBytes) {
    alert('The finalized PDF is large and may take extra time to download, open, or print.');
  }
  const url = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
