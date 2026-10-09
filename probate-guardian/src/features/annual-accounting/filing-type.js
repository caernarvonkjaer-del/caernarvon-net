// Final and Trust accountings use the Annual engine, but they are distinct
// legal filings. Keep their stored type and Part I selection atomic so every
// later consumer resolves the same descriptor. Moved from legacy-app.js
// (Milestone 70, 70J); the open filing's type follows its inventoryType (the
// case store derives it), so there is no second copy to set.
import { applyAccountingFilingType } from '../../core/filing/filing-descriptor.js';
import { updateSidebar } from '../../core/shell/sidebar.js';
import { getD } from '../../core/state.js';
import { commitModelChange } from '../../core/model-change.js';
import { confirmModal } from '../../core/ui/dialogs.js';
import { auditLog } from '../../core/activity/audit-log.js';
import { formDisplayName } from '../../core/filing/filing-registry.js';
import { crossesTrustBoundary } from '../../core/filing/starting-balance-carry.js';
import { getCurrentPage, renderPage } from '../../core/navigation/router.js';
import { fieldTarget, onChange } from '../../core/navigation/draw-reason.js';

// The Filing Type box's three answers, and the filing type each one is.
const TYPE_FOR_VALUE = Object.freeze({ Annual: 'annual', Final: 'finalAccounting', Trust: 'trustAccounting' });
const valueForType = (type) => Object.keys(TYPE_FOR_VALUE).find((value) => TYPE_FOR_VALUE[value] === type) || 'Annual';

export function setAccountingFilingType(filingType) {
  const d = getD();
  const result = applyAccountingFilingType(d, filingType);
  if (!result?.descriptor) {
    const fallback = TYPE_FOR_VALUE[filingType];
    if (!fallback) return result;
    d.inventoryType = fallback;
    d.filingType = filingType;
  }
  updateSidebar();
  commitModelChange('filing-type-change');
  return result;
}

/**
 * Milestone 74J (decision 74J-1): the Cover's Filing Type box asks before it
 * changes an existing accounting's type -- the title, PDF and workbook all
 * follow it -- and the Activity Log records a change. A change into or out of
 * Trust also says the Starting Balance stays as entered (71E: a trust
 * accounting does not start from the guardianship's net assets). Cancel puts
 * the box back.
 * @param {HTMLSelectElement} control
 */
export async function confirmFilingTypeChange(control) {
  const d = getD();
  const from = d.inventoryType;
  const previous = valueForType(from);
  const to = TYPE_FOR_VALUE[control.value];
  if (!to || to === from) { control.value = previous; return; }
  const fromName = formDisplayName(from);
  const toName = formDisplayName(to);
  const article = /^[AEIOU]/i.test(toName) ? 'an' : 'a';
  const trustNote = crossesTrustBoundary(from, to)
    ? '\n\nThe Starting Balance in Part II stays as entered: a trust accounting does not start from the guardianship\'s net assets, so check it after the change.'
    : '';
  const yes = await confirmModal({
    title: 'Change the filing type?',
    message: `Change this ${fromName} into ${article} ${toName}? Its title, PDF and workbook will say ${control.value}.${trustNote}`,
    confirmLabel: `Change to ${toName}`,
    cancelLabel: `Keep ${fromName}`,
    stillWanted: () => getD() === d,
  });
  if (!yes || getD() !== d) {
    if (control.isConnected) control.value = previous;
    return;
  }
  setAccountingFilingType(control.value);
  await auditLog('FILING_TYPE_CHANGED', `Filing type changed from ${fromName} to ${toName}`, true, d.wardId);
  renderPage(getCurrentPage(), onChange(fieldTarget('filingType')));
}

// Milestone 73O part 4: the import hint names the workbook a filing of this
// type was exported as -- the Clerk's one Annual workbook, with its Filing
// Type box set to Final or Trust for those two.
export function annualImportHint(type) {
  if (type === 'finalAccounting') return 'Select the previously exported Final Accounting Excel file: the Annual workbook, Filing Type: Final';
  if (type === 'trustAccounting') return 'Select the previously exported Trust Accounting Excel file: the Annual workbook, Filing Type: Trust';
  return 'Select the previously exported Annual Accounting Excel file';
}
