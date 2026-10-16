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
//
// Milestone 74G adds three more, each a warning (decisions 74G-1, 74G-3 and
// 74G-4, the requester, 2026-10-06): an accounting period longer than a
// year or ending after today (the Simplified too), a fee paid before the
// court order that authorized it, and the Annual Plan's residences
// overlapping or listed in no date order.
import { formatDisplayDate } from '../form/date-parser.js';
import { checkPeriodSpan } from '../validation/date-rules.js';

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

/** Today as YYYY-MM-DD, local time. */
function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * An accounting period longer than a year, or ending after today (decision
 * 74G-1, flagged for a qualified person). Section 744.367(2) has an annual
 * accounting cover the preceding calendar year or the fiscal year, and a
 * first one that starts at the GID and ends with the anniversary month can
 * run past twelve months, so the limit is the end of the twelfth month after
 * Period From's month: 03/15/2026 to 03/31/2027 passes, to 09/14/2027 is
 * pointed out. How long a first or a final accounting may run is not settled
 * here; the warning says only what the dates are.
 * @param {Record<string, any>} filing
 * @param {{ section: string, today?: string }} options `section` names the period's page as its form's checks do
 */
export function periodSpanAdvisories(filing, { section, today = localToday() }) {
  const from = iso(filing?.periodFrom), to = iso(filing?.periodTo);
  const span = checkPeriodSpan(from, to, { today });
  if (!span) return [];
  const out = [];
  if (span.longerThanAYear) {
    out.push({
      code: 'date.period-longer-than-a-year', severity: 'advisory', field: 'periodTo',
      message: `${section} — The accounting period, ${shown(from)} to ${shown(to)}, runs past ${shown(span.limit)}, the end of the twelfth month after it starts. Review the period before filing.`,
    });
  }
  if (span.endsAfterToday) {
    out.push({
      code: 'date.period-ends-after-today', severity: 'advisory', field: 'periodTo',
      message: `${section} — Accounting Period To, ${shown(to)}, is after today. Review the period before filing.`,
    });
  }
  return out;
}

// The schedules whose payments carry a Court Order Date.
/** @type {Array<[string, string]>} */
const ORDERED = [['schB1', 'Schedule B-1'], ['schB2', 'Schedule B-2'], ['schB3', 'Schedule B-3']];

/**
 * A payment dated before the court order that authorized it (decision
 * 74G-3, Pinellas Clerk practice). The Clerk's annual audit work slip records
 * each court-ordered disbursement's date of order and says nothing of the
 * order of the two, so this names both dates and decides nothing.
 * @param {Record<string, any>} filing
 */
export function paidBeforeOrderAdvisories(filing) {
  const out = [];
  for (const [list, section] of ORDERED) {
    (Array.isArray(filing?.[list]) ? filing[list] : []).forEach((row, i) => {
      const paid = iso(row?.datePaid), order = iso(row?.courtOrderDate);
      if (!paid || !order || paid >= order) return;
      out.push({
        code: 'date.paid-before-order', severity: 'advisory', field: `${list}.${i}.datePaid`,
        message: `${section} — Line ${i + 1} — Date Paid ${shown(paid)} is before the Court Order Date ${shown(order)}. Review both before filing.`,
      });
    });
  }
  return out;
}

/**
 * The Annual Plan's residences overlapping, or listed in no date order --
 * neither oldest nor newest first, since the court's form says neither
 * (decision 74G-4). Moving out and in on the same day is no overlap; a
 * residence whose own dates run backwards is the plan's check, an error.
 * @param {Record<string, any>} filing
 */
export function residenceDateAdvisories(filing) {
  const rows = (Array.isArray(filing?.q1Residences) ? filing.q1Residences : [])
    .map((r, i) => ({ i, from: iso(r?.from), to: iso(r?.to) }))
    .filter((r) => r.from && (!r.to || r.to >= r.from));
  const out = [];
  const starts = rows.map((r) => r.from);
  const oldestFirst = starts.every((s, k) => k === 0 || s >= starts[k - 1]);
  const newestFirst = starts.every((s, k) => k === 0 || s <= starts[k - 1]);
  if (!oldestFirst && !newestFirst) {
    out.push({
      code: 'date.residences-out-of-order', severity: 'advisory', field: `q1Residences.${rows[0].i}.from`,
      message: '1. Residences — The residences are not listed in date order. Review the order before filing.',
    });
  }
  const byStart = [...rows].sort((a, b) => a.from.localeCompare(b.from));
  for (let k = 1; k < byStart.length; k++) {
    const before = byStart[k - 1], after = byStart[k];
    if (!before.to || after.from >= before.to) continue;
    const [first, second] = before.i < after.i ? [before, after] : [after, before];
    const span = (r) => `${shown(r.from)} to ${r.to ? shown(r.to) : 'no end date'}`;
    out.push({
      code: 'date.residences-overlap', severity: 'advisory', field: `q1Residences.${second.i}.from`,
      message: `1. Residences — Rows ${first.i + 1} and ${second.i + 1} overlap: ${span(first)}, and ${span(second)}. Review the dates before filing.`,
    });
  }
  return out;
}

/**
 * Every date warning above that a filing's form takes, by its engine id: the
 * Annual family's four, the Simplified's period, the Annual Plan's
 * residences. Preview's shared checks add them (output-preflight.js).
 * @param {Record<string, any>} filing
 * @param {string | undefined} engineId the registry's engine id
 */
export function dateAdvisories(filing, engineId) {
  switch (engineId) {
    case 'annual': return [...trustCreatedAfterGidAdvisories(filing), ...periodDateAdvisories(filing),
      ...periodSpanAdvisories(filing, { section: 'Part I' }), ...paidBeforeOrderAdvisories(filing)];
    case 'simplified': return periodSpanAdvisories(filing, { section: 'Cover' });
    case 'planAnnual': return residenceDateAdvisories(filing);
    default: return [];
  }
}
