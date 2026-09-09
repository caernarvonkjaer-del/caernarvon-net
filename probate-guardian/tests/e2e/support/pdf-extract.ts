import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Extracts readable Unicode text from a PDF binary string, data URI, or Buffer using PDF.js.
 * Validates that TrueType font programs with /ToUnicode CMaps correctly decode to readable text.
 */
export async function extractPdfText(pdfData: Uint8Array | string): Promise<string> {
  let data: Uint8Array;
  if (typeof pdfData === 'string') {
    if (pdfData.startsWith('data:application/pdf;base64,')) {
      const b64 = pdfData.slice('data:application/pdf;base64,'.length);
      data = new Uint8Array(Buffer.from(b64, 'base64'));
    } else {
      data = new Uint8Array(Buffer.from(pdfData, 'latin1'));
    }
  } else {
    // pdfjs-dist rejects a Node Buffer (a Uint8Array subclass) with "Please
    // provide binary data as Uint8Array", and separately detaches whatever
    // ArrayBuffer it's given -- a second call sharing that same buffer (e.g.
    // getPdfMetadata() and extractPdfText() on the same downloaded bytes)
    // would fail with "Cannot perform Construct on a detached ArrayBuffer".
    // `new Uint8Array(typedArray)` copies into an independent plain
    // Uint8Array rather than viewing the source's buffer, avoiding both.
    data = new Uint8Array(pdfData);
  }

  const loadingTask = pdfjsLib.getDocument({ data, verbosity: 0 });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n';
  }
  return fullText;
}

export type PdfInfoMetadata = {
  title: string;
  subject: string;
  keywords: string;
  author: string;
};

/**
 * Reads the PDF Info dictionary (Title/Subject/Keywords/Author) set by
 * src/core/pdf/pdf-engine.js's doc.setProperties()/setDocumentProperties()
 * call. Milestone 33's filing-identity contract uses this to prove the
 * generated file's own metadata -- not just the in-memory model -- carries
 * the correct filing identity.
 */
export async function getPdfMetadata(pdfData: Uint8Array | string): Promise<PdfInfoMetadata> {
  let data: Uint8Array;
  if (typeof pdfData === 'string') {
    if (pdfData.startsWith('data:application/pdf;base64,')) {
      const b64 = pdfData.slice('data:application/pdf;base64,'.length);
      data = new Uint8Array(Buffer.from(b64, 'base64'));
    } else {
      data = new Uint8Array(Buffer.from(pdfData, 'latin1'));
    }
  } else {
    data = new Uint8Array(pdfData);
  }
  const loadingTask = pdfjsLib.getDocument({ data, verbosity: 0 });
  const pdf = await loadingTask.promise;
  const { info } = await pdf.getMetadata();
  const i = info as Record<string, unknown>;
  return {
    title: typeof i.Title === 'string' ? i.Title : '',
    subject: typeof i.Subject === 'string' ? i.Subject : '',
    keywords: typeof i.Keywords === 'string' ? i.Keywords : '',
    author: typeof i.Author === 'string' ? i.Author : '',
  };
}
