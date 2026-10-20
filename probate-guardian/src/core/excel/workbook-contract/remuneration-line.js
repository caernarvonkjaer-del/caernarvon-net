// @ts-nocheck -- in tsconfig.json's checked program only transitively since Milestone 76I part 2 (the export checks reach it through excel/workbook-blocks.js); never written with JSDoc types.
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

// Milestone 73G part 1: the amount segment is read by the one amount codec,
// so a negative ("$-500.00", "($500.00)") reads as one, not as the description.
const looksLikeAmount = (s) => { const r = parseAmount(String(s || '')); return 'value' in r && !('blank' in r); };

// Milestone 76I item 7 (decision 76I-6, the requester's): a line missing its
// guardian or its type, or whose description looks like an amount, names its
// segments -- "Type: Fee  —  $250.00" -- so the court's form never shows empty
// dashes ("  —    —  $500.00" was filed for an entry with neither) and the
// line reads back as the entry it was ("Fee  —  $250" read back as guardian
// "Fee", type "$250"; a numeric description with no amount came back as the
// amount). A complete line keeps its wording.
const LABELS = Object.freeze({ guardian: 'Guardian: ', type: 'Type: ', description: 'Description: ' });

/** The entry's line. */
export function remunerationLine(r) {
  const amt = r.amount === '' || r.amount == null ? '' : `$${formatMoney(r.amount, { grouping: false })}`;
  const guardian = String(r.guardian || '');
  const type = String(r.type || '');
  const description = String(r.description || '');
  const labelled = !guardian || !type || (!amt && !!description && looksLikeAmount(description));
  if (!labelled) {
    const parts = [guardian, type];
    if (amt) parts.push(amt);
    if (description) parts.push(description);
    return parts.join(REMUNERATION_SEPARATOR);
  }
  const parts = [];
  if (guardian) parts.push(LABELS.guardian + guardian);
  if (type) parts.push(LABELS.type + type);
  if (amt) parts.push(amt);
  if (description) parts.push(LABELS.description + description);
  return parts.join(REMUNERATION_SEPARATOR);
}

/** A line back into its entry; `__line` is the line itself ('' for a blank line). */
export function splitRemuneration(val) {
  if (!val) return { __line: '' };
  const parts = val.split(REMUNERATION_SEPARATOR);
  // Milestone 76I item 7: a line that names its segments.
  if (parts.some((p) => Object.values(LABELS).some((label) => p.startsWith(label)))) {
    const entry = { __line: val, guardian: '', type: '', amount: '', description: '' };
    for (const part of parts) {
      const field = Object.keys(LABELS).find((k) => part.startsWith(LABELS[k]));
      if (field) entry[field] = part.slice(LABELS[field].length);
      else if (looksLikeAmount(part) && entry.amount === '') entry.amount = amountForStore(String(part));
      else entry.description = entry.description ? `${entry.description}${REMUNERATION_SEPARATOR}${part}` : part;
    }
    return entry;
  }
  // An entry holding only an amount is that amount on its own (76I item 7).
  if (parts.length === 1 && looksLikeAmount(parts[0])) return { __line: val, guardian: '', type: '', amount: amountForStore(String(parts[0])), description: '' };
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
