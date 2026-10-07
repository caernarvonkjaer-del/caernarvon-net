// Milestone 73F part 3: two date warnings on the Annual, Final and Trust
// Accountings, shown under "Review recommended" in Print Preview and never
// blocking (decisions 73F-6 and 73F-8). The Clerk's workbook checks neither.
//
// - A trust answered No to "created after the GID?" while its creation date
//   is after the Guardianship Inception Date: Part VIII's own instruction
//   says a trust created after the GID needs its own trust accounting.
// - A transaction dated outside the accounting period: a disbursement, an
//   adjustment or a transfer dated 2026 on a 2025 accounting used to pass
//   without a word.
// The Simplified carries no transaction dates, so it has nothing to warn of.
import { formatDisplayDate } from '../form/date-parser.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const iso = (v) => (typeof v === 'string' && ISO.test(v) ? v : '');
const shown = (v) => formatDisplayDate(v) || v;

// Each schedule's transaction dates, as the page labels them.
/** @type {Array<[string, string, Array<[string, string]>]>} */
const DATED = [
  ['schB1', 'Schedule B-1', [['datePaid', 'Date Paid']]],
  ['schB2', 'Schedule B-2', [['datePaid', 'Date Paid']]],
  ['schB3', 'Schedule B-3', [['datePaid', 'Date Paid']]],
  ['schB4', 'Schedule B-4', [['datePaid', 'Date Paid']]],
  ['schC', 'Schedule C', [['date', 'Date of Adjustment']]],
  ['schE', 'Schedule E', [['transferInDate', 'Transfer In Date'], ['transferOutDate', 'Transfer Out Date']]],
];

/** Transactions dated outside the period (decision 73F-8). */
export function periodDateAdvisories(filing) {
  const from = iso(filing?.periodFrom), to = iso(filing?.periodTo);
  if (!from || !to || from > to) return [];
  const out = [];
  for (const [list, section, fields] of DATED) {
    (Array.isArray(filing[list]) ? filing[list] : []).forEach((row, i) => {
      for (const [key, label] of fields) {
        const date = iso(row?.[key]);
        if (!date || (date >= from && date <= to)) continue;
        out.push({
          code: 'date.outside-period', severity: 'advisory', field: `${list}.${i}.${key}`,
          message: `${section} — Line ${i + 1} — ${label} ${shown(date)} is outside the accounting period (${shown(from)} to ${shown(to)}).`,
        });
      }
    });
  }
  return out;
}

/** A trust created after the GID but answered No to "created after the GID?" (decision 73F-6). */
export function trustCreatedAfterGidAdvisories(filing) {
  const gid = iso(filing?.gid);
  if (!gid) return [];
  const out = [];
  (Array.isArray(filing?.trusts) ? filing.trusts : []).forEach((trust, i) => {
    const created = iso(trust?.dateCreated);
    if (!created || created <= gid || trust?.createdAfterGID !== 'No') return;
    out.push({
      code: 'trust.created-after-gid', severity: 'advisory', field: `trusts.${i}.createdAfterGID`,
      message: `Part VIII — Trust ${i + 1} — the trust was created ${shown(created)}, after the GID (${shown(gid)}), but "created after the GID?" is answered No. A trust created after the GID needs its own trust accounting.`,
    });
  });
  return out;
}
