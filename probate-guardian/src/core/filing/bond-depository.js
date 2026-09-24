// Milestone 67B. Which bond / restricted-depository arrangement a guardianship
// has -- one question, the same on the Initial Inventory (D-4) and the
// Annual/Final/Trust Accounting (Part IX) -- and everything that follows from
// the answer: which fields it reveals, what the print preview warns about,
// what the PDF says, and how a filing saved under the old shape is read.
//
// WHAT CHANGED, AND WHY
// Until this milestone the Annual family blocked export on Bond Amount and
// Bonding Company -- fields its own UI and data model called optional -- and
// the Initial Inventory blocked on all four bond fields plus a Yes/No "has the
// bond been waived?" and its order date. A guardian whose bond was waived by
// court order, or whose assets sit in a restricted depository instead of under
// a surety, could not file an Annual at all without inventing a bond. The
// court's Annual workbook has no waiver question anywhere; the Inventory's
// asks only for the order date. Both questions were the app's own, and an
// app-invented affordance may be ASKED but must never be what export demands
// (AGENTS.md section 4, the scheduleNoItems precedent).
//
// Decided 2026-09-23 by the requester: nothing in the bond block gates export
// on either form -- blocking should be rare, and a warning is enough here --
// and the tester's four-state question replaces the separate bond and
// depository questions on both forms:
//
//   depository-only        restricted depository, no bond   -> receipt date
//   bond-and-depository    both                             -> receipt date + bond details
//   bond-only              bond, no restricted depository   -> bond details
//   bond-waived            bond waived by court order       -> date of the order
//   ''                     unanswered                       -> nothing revealed
//
// None of the revealed fields is required. The per-row Restricted? flags on
// the schedules are untouched: they feed the workbook's bond calculation, and
// this question feeds none of it -- it records the arrangement, the numbers
// keep coming from the rows. Any implementation that starts writing this
// answer into the bond-calculation cells has misunderstood the item.
//
// The old fields -- the Inventory's bondWaived tri-state and the Annual's
// restrictedDepository tri-state -- are subsumed and removed on load, after
// inference: two fields expressing the same fact would drift. The dates they
// gated (bondWaivedDate, restrictedDepositoryReceiptDate) stay.

export const BOND_DEPOSITORY_STATES = Object.freeze(['depository-only', 'bond-and-depository', 'bond-only', 'bond-waived']);

/** The question's options, in the order the tester proposed them. */
export const BOND_DEPOSITORY_OPTIONS = Object.freeze([
  { value: 'depository-only', label: 'Restricted depository only' },
  { value: 'bond-and-depository', label: 'Bond and restricted depository' },
  { value: 'bond-only', label: 'Bond only' },
  { value: 'bond-waived', label: 'Bond waived by court order' },
]);

export const BOND_DEPOSITORY_QUESTION = 'Which applies to this guardianship?';

/** A stored value, or '' for anything that is not one of the four states. */
export function normalizeBondDepositoryState(value) {
  return BOND_DEPOSITORY_STATES.includes(value) ? value : '';
}

export const revealsDepository = (state) => state === 'depository-only' || state === 'bond-and-depository';
export const revealsBond = (state) => state === 'bond-only' || state === 'bond-and-depository';
export const revealsWaiver = (state) => state === 'bond-waived';

const text = (v) => String(v ?? '').trim();
// The retired tri-states also had a legacy boolean form.
const isYes = (v) => v === true || v === 'Yes';

/**
 * "Bond details entered": a bond amount or a bonding company. The period
 * dates alone are not a bond -- on the Annual the bond period is the
 * accounting period (Milestone 67D), which every filing has and whose
 * importer derives it for every workbook. A zero amount is not a bond either:
 * both workbooks write a blank Bond Amount as 0 (numValue) and read it back
 * as the number 0. Either would turn a filing re-imported with no bond into
 * one.
 */
export function hasBondDetails(filing) {
  if (!filing) return false;
  const amount = text(filing.bondAmount);
  const amountEntered = amount !== '' && parseFloat(amount) !== 0;
  return amountEntered || text(filing.bondingCompany) !== '';
}

/**
 * The state a filing saved under the old shape is read as -- the migration
 * table from MILESTONE-67-PROPOSAL.md, 67B section 8.2. A stored state wins.
 * Otherwise the facts the filer already supplied are kept rather than dropped
 * to "unanswered":
 *
 *   Inventory bondWaived Yes, or a bondWaivedDate            -> bond-waived
 *   Annual restrictedDepository Yes (or a receipt date, the 57A legacy rule:
 *     a date can only have been entered because the thing happened)
 *     with bond details (an amount or a company)               -> bond-and-depository
 *     without                                                  -> depository-only
 *   bond details, no depository                                -> bond-only
 *   nothing (the period dates alone count as nothing)          -> ''
 *
 * Never coerces an unanswered tri-state into a state (AGENTS.md section 4):
 * blank answers with blank fields stay ''.
 */
export function inferBondDepositoryState(filing) {
  if (!filing) return '';
  const stored = normalizeBondDepositoryState(filing.bondDepositoryState);
  if (stored) return stored;
  if (isYes(filing.bondWaived) || text(filing.bondWaivedDate)) return 'bond-waived';
  const depository = isYes(filing.restrictedDepository) || text(filing.restrictedDepositoryReceiptDate);
  const bond = hasBondDetails(filing);
  if (depository) return bond ? 'bond-and-depository' : 'depository-only';
  if (bond) return 'bond-only';
  return '';
}

/**
 * Brings a filing to the current shape in place: sets bondDepositoryState
 * from the old fields when it has none, and removes the two retired
 * tri-states. Idempotent; returns true when anything changed. Called on every
 * mount of either form and after every Excel import, so a .sav from before
 * this milestone -- or a workbook that carries only the dates -- reads back
 * with the answer it already implied.
 */
export function migrateBondDepository(filing) {
  if (!filing || typeof filing !== 'object') return false;
  let changed = false;
  const inferred = inferBondDepositoryState(filing);
  if (filing.bondDepositoryState !== inferred) {
    filing.bondDepositoryState = inferred;
    changed = true;
  }
  for (const legacy of ['bondWaived', 'restrictedDepository']) {
    if (legacy in filing) {
      delete filing[legacy];
      changed = true;
    }
  }
  return changed;
}

/**
 * What the print preview says about the bond block. Advisory only -- never a
 * blocker -- and the same producer for both forms, so neither can drift from
 * the other. `section` is the form's own label for the page ("D-4" or
 * "Part IX").
 */
export function bondDepositoryAdvisories(filing, { section = 'Bond' } = {}) {
  if (!filing) return [];
  // Inferred, not read raw: a filing not yet migrated on mount (a model
  // builder handed an old-shape object, say) reads the same way the UI does.
  const state = inferBondDepositoryState(filing);
  const out = [];
  const advise = (code, field, message) => out.push({ code: `bond-depository.${code}`, severity: 'advisory', field, message: `${section} — ${message}` });
  if (!state) {
    advise('unanswered', 'bondDepositoryState',
      'The bond / restricted depository arrangement is not stated (bond, restricted depository, both, or bond waived). The filing can be filed without it; stating it lets the filed documents say why the bond block reads as it does.');
    return out;
  }
  if (revealsBond(state)) {
    if (!text(filing.bondAmount)) advise('bond-amount', 'bondAmount', 'Bond Amount is blank. The filing can be filed without it.');
    if (!text(filing.bondingCompany)) advise('bonding-company', 'bondingCompany', 'Name of Bonding Company is blank. The filing can be filed without it.');
  }
  if (revealsDepository(state) && !text(filing.restrictedDepositoryReceiptDate)) {
    advise('receipt-date', 'restrictedDepositoryReceiptDate', 'The date of the most recent restricted depository receipt is blank. The filing can be filed without it.');
  }
  if (revealsWaiver(state) && !text(filing.bondWaivedDate)) {
    advise('waiver-date', 'bondWaivedDate', 'The date of the order waiving the bond is blank. The filing can be filed without it.');
  }
  return out;
}

/**
 * The line(s) the filed PDF prints for the arrangement. Wording approved by
 * the requester 2026-09-23 -- these are the sentences to ship, and a change
 * to them is a change to a filed court document. `bond-only` and unanswered
 * print nothing extra: the bond block prints as it always has.
 *
 * @param {object} filing
 * @param {(iso: string) => string} fmtDate the form's own date formatter
 * @returns {string[]}
 */
export function bondDepositoryPdfLines(filing, fmtDate) {
  const state = inferBondDepositoryState(filing);
  const date = (v) => (text(v) ? fmtDate(text(v)) : '') || '[date]';
  if (state === 'bond-waived') return [`Bond waived by court order dated ${date(filing.bondWaivedDate)}.`];
  if (revealsDepository(state)) return [`Assets held in a restricted depository. Most recent receipt dated ${date(filing.restrictedDepositoryReceiptDate)}.`];
  return [];
}
