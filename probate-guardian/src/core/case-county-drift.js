import { resolveCase } from './case-resolver.js';

const norm = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Milestone 40C-A item 4 rewrote what this reports and how it describes itself.
//
// It used to declare the case-registry county "authoritative". That is not true
// under 40C-A: the canonical forward-looking value is the ward PARTY's county,
// the case record is a passive comparison reference that is only ever updated by
// an explicit Cover edit, and each filing's own county is an auditable SNAPSHOT
// of what that filing was prepared under. A ward can legitimately move between
// counties, which makes an older sibling filing's different county correct
// history rather than an error.
//
// So this stays advisory and still never rewrites anything -- but it now
// describes a mismatch as a mismatch, without claiming one side wins. A stale
// case record must not read as stronger than an explicitly stored ward-Party
// county.
export function countyDriftWarnings(filing) {
  const kase = filing?.caseId ? resolveCase(filing.caseId) : null;
  const caseCounty = String(kase?.county || '').trim();
  if (!caseCounty) return [];
  const candidates = [
    ['filing', filing?.county, 'County on this filing'],
    // Milestone 76H item 3 (decision 76H-8): the attorney's own county is no
    // longer on the page or the PDF (the statement uses the filing's county,
    // as the workbook does), so a mismatch with it is not reported -- there
    // is nothing to see or change. The stored value is kept.
  ];
  return candidates
    .filter(([, value]) => String(value || '').trim() && norm(value) !== norm(caseCounty))
    .map(([source, value, label]) => ({
      code: `county-drift.${source}`,
      severity: 'advisory',
      // Kept for callers that already read this key. It names the case-record
      // value being compared against, not a winner.
      authoritative: caseCounty,
      caseCounty,
      source,
      value: String(value).trim(),
      message: `${label} (${String(value).trim()}) differs from the county on the linked case record (${caseCounty}). Both are kept as-is; confirm which is correct for this filing before filing it.`,
    }));
}

