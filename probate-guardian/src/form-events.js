import * as SupplementalPdf from './core/pdf/supplemental-pdf.js';
import { writeDraftValue, finalizeFieldValue, getControlPath } from './core/form/form-contract.js';
import { focusFieldByPath } from './core/validation/validation-adapter.js';
import './core/filing/filing-descriptor.js';
import './core/filing/output-preflight.js';
import './core/form/form-fields.js';
import './core/form/combobox-controller.js';
import './core/form/schedule-definitions.js';

window.PGSupplementalPdf = SupplementalPdf;

const formatters = {
  address: window.formatAddress,
  'bar-number': window.formatBarNumber,
  'case-number': window.formatCaseNumber,
  'city-state-zip': (value, input) => { window.applyZipLimit(input); return window.formatCityStateZip(input.value); },
  decimal: window.sanitizeNonNegativeDecimal,
  name: window.formatName,
  phone: window.formatPhone,
  security: (value, input) => window.sanitizeStoredText ? window.sanitizeStoredText(value) : value,
  ssn: window.formatSSN,
};

function persistFormControl(control, applyFormat = true) {
  const path = getControlPath(control);
  if (!path) return;
  if (applyFormat) {
    writeDraftValue(control);
    finalizeFieldValue(control);
  } else {
    writeDraftValue(control);
  }
}

document.addEventListener('click', (event) => {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-form-action]') : null;
  if (!actionElement) return;
  switch (actionElement.dataset.formAction) {
    case 'jump-to-field': focusFieldByPath(actionElement.dataset.route, actionElement.dataset.fieldPath); break;
    case 'add-plan-row': window.addPlanRow(actionElement.dataset.collection, actionElement.dataset.rowType, actionElement.dataset.route); break;
    case 'duplicate-plan-row': window.duplicatePlanRow(actionElement.dataset.collection, Number.parseInt(actionElement.dataset.index, 10), actionElement.dataset.route); break;
    case 'add-ward-type': window.showAddWardModalForType(actionElement.dataset.inventoryType); break;
    case 'choose-schedule-docs': document.getElementById(actionElement.dataset.inputId)?.click(); break;
    case 'confirm-delete-ward-year': window.confirmDeleteWardYear(actionElement.dataset.wardId, actionElement.dataset.yearKey); break;
    case 'edit-prior-year': window.editPriorYear(actionElement.dataset.wardId, actionElement.dataset.yearKey); break;
    case 'export-activity-log': window.exportActivityLog(); break;
    case 'link-party': window.showPickPartyModal(actionElement.dataset.role, actionElement.dataset.index); break;
    case 'navigate': window.navigate(actionElement.dataset.route); break;
    case 'open-court-portal': window.openFloridaCourtPortal(); break;
    case 'party-dismiss-pair': window.doPartyDismissPair(actionElement.dataset.partyA, actionElement.dataset.partyB); break;
    case 'party-merge-keep': window.doPartyMergeKeep(actionElement.dataset.keepId, actionElement.dataset.discardId); break;
    case 'print': window.printCurrentFilingPdf(); break;
    case 'remove-plan-row': window.removePlanRow(actionElement.dataset.collection, Number.parseInt(actionElement.dataset.index, 10), actionElement.dataset.route); break;
    case 'save-pdf-plan-annual': window.doSavePdfPlanAnnual(); break;
    case 'save-word-plan-annual': window.doSaveWordPlanAnnual(); break;
    case 'save-pdf-plan-initial': window.doSavePdfPlanInitial(); break;
    case 'save-word-plan-initial': window.doSaveWordPlanInitial(); break;
    case 'save-pdf-plan-minor': window.doSavePdfPlanMinor(); break;
    case 'save-word-plan-minor': window.doSaveWordPlanMinor(); break;
    case 'preview-step': window.pvStep(Number.parseInt(actionElement.dataset.step, 10)); break;
    case 'remove-schedule-doc': window.removeScheduleDoc(actionElement.dataset.scheduleKey, Number.parseInt(actionElement.dataset.documentIndex, 10)); break;
    case 'toggle-ssn': window.toggleSsnReveal(actionElement); break;
  }
});

document.addEventListener('input', (event) => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
  if (control.dataset.fieldPath || control.dataset.formPath) {
    writeDraftValue(control, { event });
  }
  if (control.dataset.formControl === 'county') window.filterCountyDropdown(control);
  if (control.dataset.formInput === 'activity-log') window.renderActivityLogList();
  if (control.dataset.formInput === 'party-directory') window.renderPartyDirectoryRows();
  if (control.dataset.formInput === 'schedule-comment') window.updateScheduleComment(control.dataset.scheduleKey, control.value);
});

document.addEventListener('compositionend', (event) => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
  if (control.dataset.fieldPath || control.dataset.formPath) {
    writeDraftValue(control, { event });
  }
});

document.addEventListener('change', (event) => {
  const control = event.target;
  if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
    writeDraftValue(control, { event });
    finalizeFieldValue(control, { event });
    // Milestone 37-4: checking a Plan's directive-execution box (q10Executed/
    // q11Executed) reveals an empty detail-card collection rather than a
    // pre-seeded one -- give it exactly one blank card immediately, matching
    // the UX before that collection stopped being pre-seeded, rather than
    // making the filer press "+ Add Directive" for the very first row. Runs
    // before the route re-render below so the fresh render sees the new row.
    if (control.dataset.formChange === 'ensure-directive-row' && control.checked) {
      const collection = control.dataset.collection;
      if (collection && window.D && !(window.D[collection] || []).length) {
        window.D[collection] = [window.emptyPlanDirective()];
      }
    }
    if (control.dataset.formRoute && window.renderPage) {
      window.renderPage(control.dataset.formRoute);
    }
  }
  if (control instanceof HTMLSelectElement && control.dataset.formChange === 'preview-page') window.pvSelect(control.value);
  if (control instanceof HTMLSelectElement && control.dataset.formChange === 'activity-log') window.renderActivityLogList();
  if (control instanceof HTMLInputElement && control.dataset.formChange === 'schedule-doc-upload' && control.files) {
    window.handleScheduleDocUpload(control.dataset.scheduleKey, control.files);
    control.value = '';
  }
  if (control instanceof HTMLSelectElement && (control.dataset.fieldPath || control.dataset.formPath)) {
    writeDraftValue(control, { event });
    finalizeFieldValue(control, { event });
  }
});

document.addEventListener('focusin', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.dataset.formControl === 'county') {
    window.filterCountyDropdown(event.target);
  }
});

document.addEventListener('focusout', (event) => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
  if (control.dataset.formControl === 'county') setTimeout(() => window.hideCountyDropdown(control.id), 150);
  if (control.dataset.fieldPath || control.dataset.formPath) {
    finalizeFieldValue(control, { event });
  }
});

document.addEventListener('mousedown', (event) => {
  const option = event.target instanceof Element ? event.target.closest('[data-form-mousedown="select-county"]') : null;
  if (!option) return;
  event.preventDefault();
  window.selectCountyOption(option.dataset.inputId, option.dataset.county);
});

document.addEventListener('keydown', (event) => {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-form-action]') : null;
  if (!actionElement || !['Enter', ' '].includes(event.key)) return;
  if (actionElement.dataset.formAction === 'add-ward-type') {
    event.preventDefault();
    actionElement.click();
  }
});
