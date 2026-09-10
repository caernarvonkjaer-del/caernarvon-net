import { resolveCase } from './case-resolver.js';

const norm = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

// County stored on the Case is authoritative. Filing and attorney values are
// deliberately never rewritten: disagreements are advisory review signals.
export function countyDriftWarnings(filing) {
  const kase = filing?.caseId ? resolveCase(filing.caseId) : null;
  const authoritative = String(kase?.county || '').trim();
  if (!authoritative) return [];
  const candidates = [
    ['filing', filing?.county],
    ['attorney', filing?.attorney_county],
  ];
  return candidates
    .filter(([, value]) => String(value || '').trim() && norm(value) !== norm(authoritative))
    .map(([source, value]) => ({
      code: `county-drift.${source}`,
      severity: 'advisory',
      authoritative,
      source,
      value: String(value).trim(),
      message: `County on this ${source} (${String(value).trim()}) differs from the case county (${authoritative}). Review before filing.`,
    }));
}

if (typeof window !== 'undefined') window.countyDriftWarnings = countyDriftWarnings;
