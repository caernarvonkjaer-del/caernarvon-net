import { ensurePdfjs } from './pdfjs-loader.js';
export * from './supplemental-checks.js';
import { SUPPLEMENTAL_PDF_LIMITS, dataUrlToBytes, isPdfBytes, formatSupplementalPdfLimit } from './supplemental-checks.js';

export async function validateSupplementalPdfRecord(file, limits = SUPPLEMENTAL_PDF_LIMITS) {
  const name = String(file?.name || 'Supporting document');
  const dataUrl = String(file?.dataUrl || '');
  const bytes = dataUrlToBytes(dataUrl);
  const warnings = [];

  if (!isPdfBytes(bytes)) {
    return {
      technicalStatus: 'blocked',
      technicalWarnings: ['The selected file is not a readable PDF.'],
      pageCount: 0,
      corrupt: true,
    };
  }
  if (bytes.length > limits.maxFileBytes || Number(file.size || bytes.length) > limits.maxFileBytes) {
    return {
      technicalStatus: 'blocked',
      technicalWarnings: [`${name} exceeds the ${formatSupplementalPdfLimit(limits.maxFileBytes)} per-file limit.`],
      pageCount: 0,
    };
  }

  try {
    const pdfjsLib = await ensurePdfjs();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const pageCount = pdf.numPages || 0;

    if (pageCount < 1) {
      return { technicalStatus: 'blocked', technicalWarnings: ['The PDF contains no pages.'], pageCount: 0 };
    }
    if (pageCount > limits.maxFilePages) {
      return {
        technicalStatus: 'blocked',
        technicalWarnings: [`The PDF has ${pageCount} pages; the per-file limit is ${limits.maxFilePages}.`],
        pageCount,
      };
    }

    let textItems = 0;
    let operatorItems = 0;
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const [textContent, operatorList] = await Promise.all([
        page.getTextContent().catch(() => ({ items: [] })),
        page.getOperatorList().catch(() => ({ fnArray: [] })),
      ]);
      textItems += textContent.items?.length || 0;
      operatorItems += operatorList.fnArray?.length || 0;
    }

    if (operatorItems === 0) {
      return {
        technicalStatus: 'blocked',
        technicalWarnings: ['The PDF pages do not appear to contain renderable content.'],
        pageCount,
      };
    }
    if (textItems === 0) {
      warnings.push('No extractable text was found. This supplemental PDF may not be ADA/accessibility compliant.');
    }

    return {
      technicalStatus: warnings.length ? 'warning' : 'ready',
      technicalWarnings: warnings,
      pageCount,
      encrypted: false,
      corrupt: false,
    };
  } catch (e) {
    const message = String(e?.message || e || '');
    const encrypted = /encrypt|password/i.test(message);
    return {
      technicalStatus: 'blocked',
      technicalWarnings: [encrypted ? 'Encrypted or password-protected PDFs cannot be inserted.' : `The PDF could not be parsed: ${message}`],
      pageCount: 0,
      encrypted,
      corrupt: !encrypted,
    };
  }
}
