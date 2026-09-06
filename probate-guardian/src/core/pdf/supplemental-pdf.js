import { ensurePdfjs } from './pdfjs-loader.js';

export const SUPPLEMENTAL_PDF_LIMITS = Object.freeze({
  maxFileBytes: 15 * 1024 * 1024,
  maxFilePages: 50,
  maxTotalBytes: 40 * 1024 * 1024,
  maxTotalPages: 150,
  finalPacketWarningBytes: 75 * 1024 * 1024,
});

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46];

export function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function isPdfBytes(bytes) {
  return PDF_HEADER.every((value, index) => bytes && bytes[index] === value);
}

export function isPdfLikeFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  return type === 'application/pdf' || name.endsWith('.pdf');
}

export async function digestBytes(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure digest support is unavailable.');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `sha256-${hex}`;
}

export async function digestDataUrl(dataUrl) {
  return digestBytes(dataUrlToBytes(dataUrl));
}

export function createSupplementalFileId() {
  if (globalThis.crypto?.randomUUID) return `supplement-${crypto.randomUUID()}`;
  return `supplement-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function formatSupplementalPdfLimit(bytes = SUPPLEMENTAL_PDF_LIMITS.maxFileBytes) {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function statusFailure(message, code = 'ineligible') {
  return { eligible: false, code, message };
}

export function isFilingEligibleSupplement(file, limits = SUPPLEMENTAL_PDF_LIMITS) {
  if (!file || typeof file !== 'object') return statusFailure('Supporting document record is missing.');
  if (!file.dataUrl) return statusFailure(`${file.name || 'Supporting document'} is missing PDF data.`, 'missing-data');

  let bytes;
  try {
    bytes = dataUrlToBytes(file.dataUrl);
  } catch {
    return statusFailure(`${file.name || 'Supporting document'} could not be decoded.`, 'decode-failed');
  }

  if (!isPdfBytes(bytes)) return statusFailure(`${file.name || 'Supporting document'} is not a PDF.`, 'not-pdf');
  if (bytes.length > limits.maxFileBytes || Number(file.size || bytes.length) > limits.maxFileBytes) {
    return statusFailure(`${file.name || 'Supporting document'} exceeds the ${formatSupplementalPdfLimit(limits.maxFileBytes)} per-file limit.`, 'too-large');
  }
  if (!['ready', 'warning'].includes(file.technicalStatus)) {
    return statusFailure(`${file.name || 'Supporting document'} has not passed PDF checks.`, 'not-ready');
  }
  if (!Number.isInteger(file.pageCount) || file.pageCount < 1 || file.pageCount > limits.maxFilePages) {
    return statusFailure(`${file.name || 'Supporting document'} has an invalid or over-limit page count.`, 'page-limit');
  }
  if (file.attestationStatus !== 'accepted') {
    return statusFailure(`${file.name || 'Supporting document'} needs accessibility attestation before filing.`, 'attestation-required');
  }
  if (!file.contentDigest || file.attestedDigest !== file.contentDigest) {
    return statusFailure(`${file.name || 'Supporting document'} changed after attestation and must be reviewed again.`, 'digest-mismatch');
  }
  if (file.encrypted || file.corrupt || file.removed || file.stale || file.technicalStatus === 'blocked') {
    return statusFailure(`${file.name || 'Supporting document'} is blocked from filing.`, 'blocked');
  }
  return { eligible: true, code: 'eligible', bytes };
}

export function assertFilingEligibleSupplement(file) {
  const result = isFilingEligibleSupplement(file);
  if (!result.eligible) {
    const error = new Error(result.message);
    error.code = result.code;
    error.file = file;
    throw error;
  }
  return result;
}

export function summarizeSupplementTotals(files, limits = SUPPLEMENTAL_PDF_LIMITS) {
  const totals = (files || []).reduce((acc, file) => {
    acc.bytes += Number(file?.size || 0);
    acc.pages += Number(file?.pageCount || 0);
    return acc;
  }, { bytes: 0, pages: 0 });
  return {
    ...totals,
    overBytes: totals.bytes > limits.maxTotalBytes,
    overPages: totals.pages > limits.maxTotalPages,
  };
}

export function collectActiveSupplementalFiles(sourceData) {
  const scheduleDocs = sourceData?.scheduleDocs;
  if (!scheduleDocs || typeof scheduleDocs !== 'object') return [];
  const activePeriod = sourceData.activeYearKey
    || (sourceData.periodFrom || sourceData.periodTo ? `${sourceData.periodFrom || ''}__${sourceData.periodTo || ''}` : 'initial');
  const files = [];
  for (const value of Object.values(scheduleDocs)) {
    if (!value || typeof value !== 'object') continue;
    const slot = Array.isArray(value.files) || value.comment
      ? value
      : value[activePeriod] || value.initial || null;
    if (Array.isArray(slot?.files)) files.push(...slot.files.filter(file => file?.dataUrl));
  }
  return files;
}

export function getSupplementalFilingIssues(sourceData, limits = SUPPLEMENTAL_PDF_LIMITS) {
  const files = collectActiveSupplementalFiles(sourceData);
  const issues = [];
  for (const file of files) {
    const result = isFilingEligibleSupplement(file, limits);
    if (!result.eligible) issues.push(result.message);
  }
  const eligibleFiles = files.filter(file => isFilingEligibleSupplement(file, limits).eligible);
  const totals = summarizeSupplementTotals(eligibleFiles, limits);
  if (totals.overBytes) issues.push('Supplemental PDFs exceed the total packet attachment size limit.');
  if (totals.overPages) issues.push('Supplemental PDFs exceed the total packet page limit.');
  return issues;
}

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
      warnings.push('No extractable text was found. Confirm this supplemental PDF is accessible before filing.');
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
