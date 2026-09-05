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
    data = pdfData;
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
