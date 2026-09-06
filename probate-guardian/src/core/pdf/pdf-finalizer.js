import { PDFDocument } from '../../../lib/pdf-lib.esm.js';

export async function finalizeCourtFormPdf(doc) {
  const sourcePages = doc.__pgNativePdfAttachments || [];
  if (!sourcePages.length) return new Uint8Array(doc.output('arraybuffer'));

  const filing = await PDFDocument.load(doc.output('arraybuffer'), { ignoreEncryption: true });
  const sourceDocuments = new Map();

  for (const sourcePage of sourcePages) {
    let sourceDocument = sourceDocuments.get(sourcePage.dataUrl);
    if (!sourceDocument) {
      const sourceBytes = new Uint8Array(
        Uint8Array.from(atob(sourcePage.dataUrl.split(',')[1] || ''), character => character.charCodeAt(0))
      );
      sourceDocument = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      sourceDocuments.set(sourcePage.dataUrl, sourceDocument);
    }

    const [originalPage] = await filing.copyPages(sourceDocument, [sourcePage.sourcePageIndex]);
    filing.removePage(sourcePage.pageNumber - 1);
    filing.insertPage(sourcePage.pageNumber - 1, originalPage);
  }

  return await filing.save({ useObjectStreams: false });
}

export function saveFinalizedPdf(pdfBytes, filename) {
  const url = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}