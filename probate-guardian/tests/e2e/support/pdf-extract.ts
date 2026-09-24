import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const DATA_URI_PREFIX = 'data:application/pdf;base64,';

/**
 * Milestone 59C-2 (C4). One decode, shared by every entry point below; this
 * logic was copy-pasted into three of them.
 *
 * pdfjs-dist rejects a Node Buffer (a Uint8Array subclass) with "Please
 * provide binary data as Uint8Array", and separately detaches whatever
 * ArrayBuffer it is given -- so a second call sharing that same buffer (as
 * getPdfMetadata() and extractPdfText() used to, on the same downloaded
 * bytes) failed with "Cannot perform Construct on a detached ArrayBuffer".
 * `new Uint8Array(typedArray)` copies into an independent plain Uint8Array
 * rather than viewing the source's buffer, avoiding both.
 */
function toUint8Array(pdfData: Uint8Array | string): Uint8Array {
  if (typeof pdfData === 'string') {
    if (pdfData.startsWith(DATA_URI_PREFIX)) {
      return new Uint8Array(Buffer.from(pdfData.slice(DATA_URI_PREFIX.length), 'base64'));
    }
    return new Uint8Array(Buffer.from(pdfData, 'latin1'));
  }
  return new Uint8Array(pdfData);
}

/**
 * Loads the PDF once, hands the document to `read`, and always releases the
 * loading task. PDF.js holds a worker and page caches per document; without
 * the destroy() these accumulated for every inspection in a run.
 */
async function withPdfDocument<T>(
  pdfData: Uint8Array | string,
  read: (pdf: any) => Promise<T>,
): Promise<T> {
  const loadingTask = pdfjsLib.getDocument({ data: toUint8Array(pdfData), verbosity: 0 });
  try {
    return await read(await loadingTask.promise);
  } finally {
    // Never let cleanup failure mask the real result or a real error.
    await loadingTask.destroy().catch(() => {});
  }
}

/** Text runs per page, kept apart. The shared basis for both text readers. */
async function pageTextItems(pdf: any): Promise<string[][]> {
  const pages: string[][] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => String(item.str)));
  }
  return pages;
}

export type PdfTextRun = { page: number; text: string; x: number; y: number; width: number };

/**
 * Every text run with its position on the page, taken from the generated PDF
 * itself rather than from a rendered preview's DOM.
 *
 * extractPdfText() and extractPdfTextItems() give content and reading order,
 * which is the order the generator emitted -- so neither can tell whether two
 * runs were drawn on top of each other. A pdf.js text item carries its own
 * transform matrix, whose last two entries are the run's x and y in PDF user
 * space (y measured from the bottom of the page, so a LARGER y is higher up).
 * That is the only way to assert a layout fact -- "this block reserved enough
 * height that what follows it starts below" -- against the filed artifact.
 *
 * Milestone 68D adds `width`, the run's drawn width in the same units, so a
 * test can assert the run's right edge (x + width) stays inside its column.
 * Text extraction alone cannot catch an overrun: the characters are all
 * present in the text layer even when a later opaque rectangle covers them.
 */
export async function extractPdfTextRuns(pdfData: Uint8Array | string): Promise<PdfTextRun[]> {
  return withPdfDocument(pdfData, async (pdf) => {
    const runs: PdfTextRun[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      for (const item of content.items as any[]) {
        const t = item.transform || [];
        runs.push({ page: p, text: String(item.str), x: Number(t[4]) || 0, y: Number(t[5]) || 0, width: Number(item.width) || 0 });
      }
    }
    return runs;
  });
}

function readInfoDictionary(info: unknown): PdfInfoMetadata {
  const i = (info ?? {}) as Record<string, unknown>;
  return {
    title: typeof i.Title === 'string' ? i.Title : '',
    subject: typeof i.Subject === 'string' ? i.Subject : '',
    keywords: typeof i.Keywords === 'string' ? i.Keywords : '',
    author: typeof i.Author === 'string' ? i.Author : '',
  };
}

/**
 * Extracts readable Unicode text from a PDF binary string, data URI, or Buffer using PDF.js.
 * Validates that TrueType font programs with /ToUnicode CMaps correctly decode to readable text.
 */
export async function extractPdfText(pdfData: Uint8Array | string): Promise<string> {
  return withPdfDocument(pdfData, async (pdf) =>
    (await pageTextItems(pdf)).map((runs) => runs.join(' ') + '\n').join(''));
}

/**
 * Milestone 40E: the individual text runs, per page, instead of one
 * space-joined string per page.
 *
 * extractPdfText() above flattens every run on a page into a single string, so
 * it cannot tell "three lines inside the column" from "one long line running
 * off the page" -- both contain the same characters. That distinction is the
 * whole point of the table-cell address fix, so it needs the runs kept apart.
 */
export async function extractPdfTextItems(pdfData: Uint8Array | string): Promise<string[][]> {
  return withPdfDocument(pdfData, pageTextItems);
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
  return withPdfDocument(pdfData, async (pdf) => readInfoDictionary((await pdf.getMetadata()).info));
}

export type PdfInspectionResult = {
  text: string;
  metadata: PdfInfoMetadata;
};

/**
 * Milestone 33, Phase 3.1: returns structured observations for both visible
 * text and metadata dictionary, eliminating duplicated extract calls.
 *
 * Milestone 59C-2 (C4): now ONE PDF.js load. It used to run extractPdfText()
 * and getPdfMetadata() in parallel, and each of those decoded the bytes and
 * called getDocument() itself -- so every "single" inspection parsed the
 * document twice. Both readings now come off the same loaded document.
 */
export async function inspectPdf(pdfData: Uint8Array | string): Promise<PdfInspectionResult> {
  return withPdfDocument(pdfData, async (pdf) => ({
    text: (await pageTextItems(pdf)).map((runs) => runs.join(' ') + '\n').join(''),
    metadata: readInfoDictionary((await pdf.getMetadata()).info),
  }));
}
