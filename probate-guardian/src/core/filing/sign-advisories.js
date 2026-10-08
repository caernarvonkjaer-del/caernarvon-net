// Milestone 73G part 2: an amount whose sign is unexpected, said beside the
// box (amountSignNote(), drawn by form-contract.js and the Inventory's
// binding) and in Preview's "Review recommended" (signAdvisories()). Nothing
// here blocks, and no figure is changed: the amount stays as entered and is
// filed as entered (decisions 73G-1 and 73G-N1).
//
// Three kinds of amount box:
//   - must be negative: the Annual family's Schedule C Loss / Reduction and
//     Schedule E Transfer Out. A positive one is warned, quoting the Clerk's
//     workbook (`SCH C CAPITAL ADJ p1`!C17, `SCH E BANK TRANS p1`!C8, read
//     with a parser). The workbook adds a positive loss to the total as it
//     stands, and so does the app; a positive transfer out changes only
//     Schedule E's own total.
//   - either sign: the Starting Balance (Milestone 71E: an overdrawn account
//     carries forward negative) and Schedule C's Gain / Addition (the rule is
//     "Gain or Loss"; a negative gain sums the same as a loss).
//   - every other amount box: a negative is accepted, as all three workbooks
//     instruct ("e.g., 2500.50 or -2500.50"), with a note that it is unusual
//     there -- a negative asset, income, debt, disbursement, bond or
//     remuneration.
import { amountEntryFor, storedAmounts } from './amount-fields.js';
import { amountForStore } from '../form/amount-codec.js';
import { formatMoney } from '../format/money.js';
import { resolveDescriptorForInventoryType } from './filing-descriptor.js';

// The Annual, Final and Trust Accountings: one engine.
const isAnnualFamily = (type) => resolveDescriptorForInventoryType(type)?.engineId === 'annual';

// The Clerk's own instructions, as the Annual workbook prints them.
export const LOSS_INSTRUCTION = 'Losses should be entered as negative numbers, e.g., -2500.';
export const TRANSFER_OUT_INSTRUCTION = 'Transfers out should be entered as negative numbers.';

// By the amount-fields entry's list/path and field.
const MUST_BE_NEGATIVE = Object.freeze({
  'schC.loss': { code: 'amount.loss-positive', instruction: LOSS_INSTRUCTION, effect: 'so it raises the Net Capital Adjustments' },
  'schE.transferOutAmt': { code: 'amount.transfer-out-positive', instruction: TRANSFER_OUT_INSTRUCTION, effect: '' },
});
const EITHER_SIGN = new Set(['startingBalance', 'schC.gain']);

const keyOf = (entry) => (entry.path ? entry.path : `${entry.list}.${entry.field}`);

/** The amount a box or field holds, as a number, or null (blank, 0 or unreadable). */
function signedAmount(value) {
  const stored = typeof value === 'number' ? value : amountForStore(value, { blank: '' });
  return typeof stored === 'number' && Number.isFinite(stored) && stored !== 0 ? stored : null;
}

/** What is unexpected about an amount entry's value, or null. */
function signProblem(type, entry, value) {
  const amount = signedAmount(value);
  if (amount === null) return null;
  const key = keyOf(entry);
  const must = isAnnualFamily(type) ? MUST_BE_NEGATIVE[key] : undefined;
  if (must) return amount > 0 ? { ...must, amount } : null;
  if (EITHER_SIGN.has(key) || amount > 0) return null;
  return { code: 'amount.negative-unusual', amount };
}

const NEGATIVE_NOTE = 'A negative amount is unusual here; check its sign. It is filed as entered.';
const positiveNote = (p) => `The Clerk's workbook says: "${p.instruction}" This one is positive${p.effect ? `, ${p.effect}` : ''}. It is filed as entered.`;

/**
 * The note beside an amount box, or ''.
 * @param {string} type the filing's inventoryType
 * @param {string} path the box's path, as "schC.0.loss"
 * @param {unknown} value what the box holds
 */
export function amountSignNote(type, path, value) {
  const entry = amountEntryFor(type, path);
  const problem = entry && signProblem(type, entry, value);
  if (!problem) return '';
  return problem.code === 'amount.negative-unusual' ? NEGATIVE_NOTE : positiveNote(problem);
}

/**
 * Preview's notes for every amount of a filing whose sign is unexpected --
 * each naming where it is and the amount, in the words of its form's checks.
 * @param {Record<string, any>} filing
 */
export function signAdvisories(filing) {
  if (!filing) return [];
  const type = filing.inventoryType;
  const out = [];
  for (const { entry, path, value, index } of storedAmounts(filing)) {
    const problem = signProblem(type, entry, value);
    if (!problem) continue;
    // The Inventory's checks say "A-1 row 2"; the others "Schedule A — Line 2".
    const where = index === undefined ? entry.section : `${entry.section}${entry.inline ? ` row ${index + 1}` : ` — ${entry.row} ${index + 1}`}`;
    const figure = formatMoney(problem.amount, { style: 'signFirst' });
    const message = problem.code === 'amount.negative-unusual'
      ? `${where} — ${entry.label} is negative (${figure}). ${NEGATIVE_NOTE}`
      : `${where} — ${entry.label} is positive (${figure})${problem.effect ? `, ${problem.effect}` : ''}. The Clerk's workbook says: "${problem.instruction}" It is filed as entered.`;
    out.push({ code: problem.code, severity: 'advisory', field: path, message });
  }
  return out;
}
