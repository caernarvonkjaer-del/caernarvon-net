// Milestone 73T part 3 (decision 73T-2): one remuneration entry on one line of
// the court's workbook -- the Simplified's PART VII and, since part 3, the
// Annual family's PART XI (A6:A32, 27 blank unlocked lines under the
// statutory paragraph; Milestone 58D had read that sheet as having none).
//
// The line is "guardian  —  type  —  $amount  —  description", empty segments
// left out, so a filed line never reads "—    —". The amount keeps the
// workbook's rounding (Milestone 71E's formatMoney()), without thousands
// separators. Reading tells the layouts apart by segment count and whether
// the third segment is shaped like an amount: files exported before the
// amount was included carry the description there.
import { amountForStore, parseAmount } from '../../form/amount-codec.js';
import { formatMoney } from '../../format/money.js';

export const REMUNERATION_SEPARATOR = '  —  ';

/** An entry the workbook gets a line for: anything entered. */
export const remunerationEntered = (r) => !!(r && (r.guardian || r.type || r.description || r.amount));

/** The entry's line. */
export function remunerationLine(r) {
  const amt = r.amount === '' || r.amount == null ? '' : `$${formatMoney(r.amount, { grouping: false })}`;
  const parts = [r.guardian || '', r.type || ''];
  if (amt) parts.push(amt);
  if (r.description) parts.push(r.description);
  return parts.join(REMUNERATION_SEPARATOR);
}

// Milestone 73G part 1: the amount segment is read by the one amount codec,
// so a negative ("$-500.00", "($500.00)") reads as one, not as the description.
const looksLikeAmount = (s) => { const r = parseAmount(String(s || '')); return 'value' in r && !('blank' in r); };

/** A line back into its entry; `__line` is the line itself ('' for a blank line). */
export function splitRemuneration(val) {
  if (!val) return { __line: '' };
  const parts = val.split(REMUNERATION_SEPARATOR);
  let amount = '', description = '';
  if (parts.length >= 4) {
    if (looksLikeAmount(parts[2])) amount = amountForStore(String(parts[2]));
    description = parts[3] || '';
  } else if (parts.length === 3) {
    if (looksLikeAmount(parts[2])) amount = amountForStore(String(parts[2]));
    else description = parts[2];
  }
  return { __line: val, guardian: parts[0] || '', type: parts[1] || '', amount, description };
}
