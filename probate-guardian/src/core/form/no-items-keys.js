// Milestone 73E part 1: which "I verify there are no items" tick a repeating
// list's page keeps (filing.scheduleNoItems[key]), so whatever fills a list
// can clear the declaration beside it. An import that fills a schedule used
// to leave the tick set, and the filing then said both "nothing to report"
// and the rows. 73F part 3's "+ Add Entry clears the tick" reads the same.
//
// The keys are the ones each page's checkbox writes:
// - the Annual, Final and Trust Accountings: the list lowercased ("schA" ->
//   "scha"); Part VIII's trusts "a-p8"; Part XI "remuneration";
// - the Initial Inventory: the schedule's code ("scheduleA1" -> "a1");
// - the Simplified: Part VII "remuneration".
import { formEngine } from '../filing/filing-registry.js';

/**
 * The tick a list's page keeps, or null for a list with none.
 * @param {string} filingType
 * @param {string} listKey
 * @returns {string | null}
 */
export function noItemsKeyFor(filingType, listKey) {
  const engine = formEngine(filingType);
  const list = String(listKey || '');
  if (engine === 'annual') {
    if (/^sch[A-F]\d?$/.test(list)) return list.toLowerCase();
    if (list === 'trusts') return 'a-p8';
    if (list === 'remuneration') return 'remuneration';
    return null;
  }
  if (engine === 'guardian') {
    const m = /^schedule([A-C]\d)$/.exec(list);
    return m ? m[1].toLowerCase() : null;
  }
  if (engine === 'simplified') return list === 'remuneration' ? 'remuneration' : null;
  return null;
}
