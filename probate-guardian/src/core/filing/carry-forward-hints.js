// Milestone 74O (with 73O part 1): what this ward's other filings already
// record, shown beside the question it bears on -- never written into an
// answer (Milestone 73B: no answer the filer didn't give).
//
//   - The Plans' benefits question (the Initial Plan's 7, the Annual Plan's
//     3G): a note listing the income sources (C-1) and trusts (C-4) on the
//     ward's Initial Inventory (decision 74O-2).
//   - The Annual Plan's daily-living ratings: "Last plan: <rating>" beside
//     each activity, from the ward's previous plan (decision 74O-4).
//   - The Annual Plan's Question 11: the remuneration the ward's Annual
//     Accounting declares in Part XI, for reference only and with no warning,
//     until a qualified person says which accounting period a plan's
//     declaration should match (decision 74O-5, flagged).
//
// "This ward's other filings" (decision 74O-N1, the requester, 2026-10-09):
// those linked to the same case, or showing the same Case # when either
// filing isn't linked; two filings linked to different cases stay apart. Not
// the dashboard's grouping (casesGroupingWards()), which keeps a linked and an
// unlinked filing apart: in the usual order -- the Inventory, an Annual
// Accounting carried from it (which links the two), the Plans typed fresh --
// the Plans would show nothing. A note reads; it never links a filing (that
// stays the filer's act, case-resolver.js) and never fills an answer.

import { caseNumberOf, resolveCase } from '../case-resolver.js';
import { displayDate } from '../form/date-parser.js';
import { amountForStore, presentAmount } from '../form/amount-codec.js';
import { rowStarted } from '../validation/row-started.js';
import { esc } from './escape-html.js';
import { formEngine } from './filing-registry.js';

const text = (value) => String(value ?? '').trim();
const when = (ward) => String(ward?.lastModified || ward?.createdDate || '');

/** A filing's Case #: its linked case's, else its own. */
const caseNumber = (ward) => text((ward.caseId && resolveCase(ward.caseId)?.caseNumber) || caseNumberOf(ward));

/** The other filings of this filing's case, newest first. */
export function caseFilings(filing, wards) {
  if (!filing || !Array.isArray(wards)) return [];
  const number = caseNumber(filing);
  const sameCase = (w) => (filing.caseId && w.caseId
    ? w.caseId === filing.caseId
    : !!number && caseNumber(w) === number);
  return wards.filter((w) => w && w.wardId !== filing.wardId && sameCase(w)).sort((a, b) => when(b).localeCompare(when(a)));
}

/**
 * The benefits note: "The Initial Inventory lists: Social Security
 * Administration (C-1); Pemberton Family Revocable Trust (C-4)." -- or null
 * when the case has no Inventory, or its C-1 and C-4 name nothing.
 */
export function inventoryBenefitsNote(filing, wards) {
  const inventory = caseFilings(filing, wards).find((w) => w.inventoryType === 'guardian');
  if (!inventory) return null;
  const listed = [
    ...(inventory.scheduleC1 || []).map((r) => text(r?.payerName)).filter(Boolean).map((name) => `${name} (C-1)`),
    ...(inventory.scheduleC4 || []).map((r) => text(r?.trustName)).filter(Boolean).map((name) => `${name} (C-4)`),
  ];
  return listed.length ? `The Initial Inventory lists: ${listed.join('; ')}.` : null;
}

/** An activity's name for matching across the two Plans' lists ("Administration of Medication" is "Administration of medication"). */
const activityKey = (label) => text(label).toLowerCase().replace(/[^a-z]+/g, ' ').trim();

/**
 * The ratings of the ward's previous plan, by activity: the same filing's
 * last year if it has one, else the case's newest other plan. `lists` holds
 * each plan type's activities ([key, label] pairs) by filing type; a filing of
 * a type it doesn't hold is not a plan with ratings.
 * Returns a Map of activityKey(label) -> rating; empty when there is none.
 * @param {any} filing
 * @param {any[]} wards
 * @param {Record<string, Array<[string, string]>>} lists
 */
export function previousPlanRatings(filing, wards, lists) {
  const fromData = (data, list) => {
    const out = new Map();
    for (const [key, label] of list || []) {
      const rating = text(data?.adls?.[key]);
      if (rating) out.set(activityKey(label), rating);
    }
    return out;
  };
  // The filing's earlier years, latest first, by number ("Year 2" before
  // "Year 1"): ward.years[] is not in order once the filer has switched to an
  // earlier year and back (filing-years.js), and a later year is not a "last
  // plan".
  const own = lists[filing?.inventoryType];
  const yearNumber = (key) => Number(/(\d+)\s*$/.exec(String(key ?? ''))?.[1] ?? NaN);
  const activeNumber = yearNumber(filing?.activeYearKey);
  const years = (own && Array.isArray(filing.years) ? filing.years : [])
    .map((year, index) => ({ year, index, n: yearNumber(year?.key) }))
    .filter(({ year, n }) => year && year.key !== filing.activeYearKey && !(n >= activeNumber))
    .sort((a, b) => ((b.n || -1) - (a.n || -1)) || (b.index - a.index));
  for (const { year } of years) {
    const found = fromData(year.data, own);
    if (found.size) return found;
  }
  for (const other of caseFilings(filing, wards)) {
    const found = fromData(other, lists[other.inventoryType]);
    if (found.size) return found;
  }
  return new Map();
}

/** "Last plan: <rating>" for an activity, or ''. */
export function lastPlanRating(ratings, label) {
  const rating = ratings.get(activityKey(label));
  return rating ? `Last plan: ${rating}` : '';
}

/**
 * The ward's Annual Accounting's Part XI, for reference beside the Annual
 * Plan's Question 11: { period, entries: [line, ...], none } from the case's
 * newest Annual, Final or Trust Accounting; null when there is none, or it
 * declares nothing either way.
 */
export function accountingRemuneration(filing, wards) {
  // The Annual Accounting and its Final and Trust forms: one engine, one Part XI.
  const accounting = caseFilings(filing, wards).find((w) => formEngine(w.inventoryType) === 'annual');
  if (!accounting) return null;
  const entries = (accounting.remuneration || []).filter((r) => rowStarted(r)).map((r) => {
    const amount = amountForStore(r.amount, { blank: '' });
    return [text(r.guardian), text(r.type), text(r.description), typeof amount === 'number' ? presentAmount(amount) : text(amount)]
      .filter(Boolean).join(' — ');
  });
  const none = !entries.length && !!accounting.scheduleNoItems?.remuneration;
  if (!entries.length && !none) return null;
  const period = accounting.periodFrom || accounting.periodTo
    ? `${displayDate(accounting.periodFrom) || '—'} through ${displayDate(accounting.periodTo) || '—'}`
    : '';
  return { period, entries, none };
}

/** A hint on the page, in the pages' instruction style; '' when there is none. */
export function carryHintHTML(kind, html) {
  return html ? `<div class="schedule-instructions" data-carry-hint="${esc(kind)}">${html}</div>` : '';
}

/** The benefits note on a Plan's page (Initial Plan Question 7, Annual Plan 3G). */
export function inventoryBenefitsNoteHTML(filing, wards) {
  return carryHintHTML('benefits', esc(inventoryBenefitsNote(filing, wards) || ''));
}

/** The Annual Accounting's Part XI beside the Annual Plan's Question 11, for reference. */
export function accountingRemunerationHTML(filing, wards) {
  const found = accountingRemuneration(filing, wards);
  if (!found) return '';
  const heading = `For reference, the ward's accounting${found.period ? ` for ${esc(found.period)}` : ''} declares in Part XI:`;
  const body = found.none
    ? '<div>No remuneration (the guardian verified there is none to report).</div>'
    : `<ul class="mb-0 ps-3">${found.entries.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`;
  return carryHintHTML('remuneration', `${heading}${body}`);
}
