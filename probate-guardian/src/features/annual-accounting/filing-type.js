// Final and Trust accountings use the Annual engine, but they are distinct
// legal filings. Keep their stored type and Part I selection atomic so every
// later consumer resolves the same descriptor. Moved from legacy-app.js
// (Milestone 70, 70J); the open filing's type follows its inventoryType (the
// case store derives it), so there is no second copy to set.
import { applyAccountingFilingType } from '../../core/filing/filing-descriptor.js';
import { markFilingRevisionChanged } from '../../core/filing/output-authorization.js';
import { updateSidebar } from '../../core/shell/sidebar.js';
import { getD, requestSave } from '../../core/state.js';

export function setAccountingFilingType(filingType) {
  markFilingRevisionChanged('filing-type-change');
  const d = getD();
  const result = applyAccountingFilingType(d, filingType);
  if (!result?.descriptor) {
    const fallback = { Annual: 'annual', Final: 'finalAccounting', Trust: 'trustAccounting' }[filingType];
    if (!fallback) return result;
    d.inventoryType = fallback;
    d.filingType = filingType;
  }
  updateSidebar();
  requestSave();
  return result;
}
