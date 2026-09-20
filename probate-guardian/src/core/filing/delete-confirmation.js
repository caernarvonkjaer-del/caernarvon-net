// Milestone 58E: name the filing that is about to be permanently deleted.
//
// What a filer saw before: every Delete button on the dashboard produced the
// same sentence -- "Are you sure you want to delete <ward name>?" -- because
// the message named the ward and nothing else. A ward routinely has several
// filings open at once: an Initial Inventory, this year's Annual Accounting,
// last year's, a Trust Accounting. Four cards, four Delete buttons, one
// identical confirmation. The only way to tell which filing you were
// destroying was to remember which button you pressed, and the action cannot
// be undone.
//
// Built from canonical filing data rather than per-type branches, so a filing
// type added later is described correctly without editing this file.

import { resolveDescriptorForInventoryType } from './filing-descriptor.js';
import { caseNumberOf } from '../case-resolver.js';
import { formatDisplayDate } from '../form/date-parser.js';

/**
 * The confirmation sentence for permanently deleting one filing.
 *
 * Every clause is omitted rather than shown blank when its data is missing,
 * which is what keeps this free of per-type special cases:
 *
 * - An Initial Inventory has no reporting period, so it simply has no period
 *   clause -- the same code path as a legacy record whose period was never
 *   completed. Neither prints "through" with nothing around it.
 * - An unrecognized legacy `inventoryType` falls back to "this form" rather
 *   than printing `undefined` at the filer.
 * - `caseNumberOf()` supplies the case number, so Plan Minor's ucn-then-ref
 *   precedence is honoured here without this file knowing that rule exists.
 *
 * @param {object} ward The filing being deleted.
 * @returns {string} A complete sentence, ending in the irreversibility warning.
 */
export function deleteFilingConfirmation(ward) {
  const filing = ward || {};
  const descriptor = resolveDescriptorForInventoryType(filing.inventoryType);
  const filingName = (descriptor && descriptor.displayName) || 'this form';

  const wardName = String(filing.wardName || '').trim();
  const subject = wardName ? ` for "${wardName}"` : '';

  const details = [];
  const caseNumber = String(caseNumberOf(filing) || '').trim();
  if (caseNumber) details.push(`case ${caseNumber}`);

  // Both ends or neither: a half-entered period would read "03/14/2025
  // through", which is worse than saying nothing about the period at all.
  const from = formatDisplayDate(filing.periodFrom);
  const to = formatDisplayDate(filing.periodTo);
  if (from && to) details.push(`${from} through ${to}`);

  const detail = details.length ? ` — ${details.join(', ')}` : '';

  // Unchanged from the original message: prior years are stored inside this
  // filing, so deleting it takes them too, and the filer has to be told.
  const years = (filing.years && filing.years.length) || 0;
  const yearNote = years
    ? ` This will also permanently delete ${years} prior year${years === 1 ? '' : 's'} of saved accounting for this form.`
    : '';

  return `Delete ${filingName}${subject}${detail}?${yearNote} This action cannot be undone.`;
}

// Bridged for legacy-app.js's confirmDeleteWard(), a classic script that
// cannot import. src/main.js imports this eagerly: Delete is available on the
// dashboard, which is the first screen a returning filer sees, so this must
// not depend on a feature module having been loaded first.
if (typeof window !== 'undefined') {
  window.deleteFilingConfirmation = deleteFilingConfirmation;
}
