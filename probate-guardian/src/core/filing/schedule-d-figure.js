// Milestone 71E: "does this accounting have a Schedule D at all?" -- one
// answer for the carry (starting-balance-carry.js) and the dashboard's figure
// (features-loader.js's headlineTotal()), which each had their own.
//
// It asks about ENTERED amounts: a D-1 to D-5 row with a nonzero number in any
// money column (Full Amount, Full Value, Full Debt, Carrying Value). Rows with
// only text, or only zeros, do not count. The dashboard used to test the
// computed ward's-share totals, which Milestone 71D's blank-share rule (0%)
// would have turned against it: a Schedule D with amounts and blank shares
// computes to zero and would have read as "no Schedule D". It imports only
// money.js's reader (Milestone 76H item 7), which reaches nothing that imports
// this, so both sides still use it without an import cycle.
import { n } from '../format/money.js';

const MONEY_COLUMNS = Object.freeze({
  schD1: ['fullAmount'],
  schD2: ['fullValue', 'carryingValue'],
  schD3: ['fullAmount', 'carryingValue'],
  schD4: ['fullAmount', 'carryingValue'],
  schD5: ['fullDebt'],
});

// Milestone 76H item 7 (decision 76H-3): read as every total reads it -- text
// that can't be read is no figure.
const nonzero = (v) => n(v) !== 0;

/** True when any Schedule D row carries a nonzero money figure. */
export function hasScheduleDFigure(filing) {
  if (!filing) return false;
  return Object.entries(MONEY_COLUMNS).some(([key, fields]) =>
    (Array.isArray(filing[key]) ? filing[key] : []).some((row) => row && fields.some((f) => nonzero(row[f]))));
}
