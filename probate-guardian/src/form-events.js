const formatters = {
  address: window.formatAddress,
  'bar-number': window.formatBarNumber,
  'case-number': window.formatCaseNumber,
  'city-state-zip': (value, input) => { window.applyZipLimit(input); return window.formatCityStateZip(input.value); },
  decimal: window.sanitizeNonNegativeDecimal,
  name: window.formatName,
  phone: window.formatPhone,
  security: (value, input) => window.validateSecurityInput(input.dataset.formPath, value),
  ssn: window.formatSSN,
};

function persistFormControl(control, applyFormat = true) {
  if (!control.dataset.formPath) return;
  let value = control instanceof HTMLInputElement && control.type === 'checkbox'
    ? (control.dataset.formValue === 'yes-no' ? (control.checked ? 'Yes' : 'No') : control.checked)
    : control.value;
  const formatter = applyFormat && formatters[control.dataset.formFormat];
  if (formatter) {
    value = formatter(value, control);
    control.value = value;
  }
  window.setPath(window.D, control.dataset.formPath, value);
  window.autoSave();
  window.updateNavDots();
  if (control.dataset.syncWardName) window.syncActiveWardNameDisplay();
  if (control.dataset.syncGuardianName) window.syncGuardianNameDisplay();
  if (control.dataset.formRoute) window.navigate(control.dataset.formRoute);
}

document.addEventListener('click', (event) => {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-form-action]') : null;
  if (!actionElement) return;
  switch (actionElement.dataset.formAction) {
    case 'add-plan-row': window.addPlanRow(actionElement.dataset.collection, actionElement.dataset.rowType, actionElement.dataset.route); break;
      case 'duplicate-plan-row': window.duplicatePlanRow(actionElement.dataset.collection, Number.parseInt(actionElement.dataset.index, 10), actionElement.dataset.route); break;
    case 'add-ward-type': window.showAddWardModalForType(actionElement.dataset.inventoryType); break;
    case 'choose-schedule-docs': document.getElementById(actionElement.dataset.inputId)?.click(); break;
    case 'confirm-delete-ward-year': window.confirmDeleteWardYear(actionElement.dataset.wardId, actionElement.dataset.yearKey); break;
    case 'edit-prior-year': window.editPriorYear(actionElement.dataset.wardId, actionElement.dataset.yearKey); break;
    case 'export-activity-log': window.exportActivityLog(); break;
    case 'load-ward-info': window.showLoadWardInfoModal(); break;
    case 'navigate': window.navigate(actionElement.dataset.route); break;
    case 'open-court-portal': window.openFloridaCourtPortal(); break;
    case 'print': window.pvShowAll(); window.print(); break;
      case 'remove-plan-row': window.removePlanRow(actionElement.dataset.collection, Number.parseInt(actionElement.dataset.index, 10), actionElement.dataset.route); break;
      case 'save-pdf-plan-annual': window.doSavePdfPlanAnnual(); break;
      case 'save-pdf-plan-initial': window.doSavePdfPlanInitial(); break;
      case 'save-pdf-plan-minor': window.doSavePdfPlanMinor(); break;
    case 'preview-step': window.pvStep(Number.parseInt(actionElement.dataset.step, 10)); break;
    case 'remove-schedule-doc': window.removeScheduleDoc(actionElement.dataset.scheduleKey, Number.parseInt(actionElement.dataset.documentIndex, 10)); break;
    case 'toggle-ssn': window.toggleSsnReveal(actionElement); break;
  }
});

document.addEventListener('input', (event) => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
  persistFormControl(control);
  if (control.dataset.formControl === 'county') window.filterCountyDropdown(control);
  if (control.dataset.formInput === 'activity-log') window.renderActivityLogList();
  if (control.dataset.formInput === 'schedule-comment') window.updateScheduleComment(control.dataset.scheduleKey, control.value);
});

document.addEventListener('change', (event) => {
  const control = event.target;
  if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
    persistFormControl(control);
  }
  if (control instanceof HTMLSelectElement && control.dataset.formChange === 'preview-page') window.pvSelect(control.value);
  if (control instanceof HTMLSelectElement && control.dataset.formChange === 'activity-log') window.renderActivityLogList();
  if (control instanceof HTMLInputElement && control.dataset.formChange === 'schedule-doc-upload' && control.files) {
    window.handleScheduleDocUpload(control.dataset.scheduleKey, control.files);
    control.value = '';
  }
  if (control instanceof HTMLSelectElement && control.dataset.formPath) persistFormControl(control);
});

document.addEventListener('focusin', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.dataset.formControl === 'county') {
    window.filterCountyDropdown(event.target);
  }
});

document.addEventListener('focusout', (event) => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement)) return;
  if (control.dataset.formControl === 'county') setTimeout(() => window.hideCountyDropdown(control.id), 150);
  if (control.dataset.formFormat === 'case-number') {
    control.value = window.finalizeCaseNumber(control.value);
    persistFormControl(control, false);
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
  if (actionElement.dataset.formAction === 'add-ward-type' || actionElement.dataset.formAction === 'load-ward-info') {
    event.preventDefault();
    actionElement.click();
  }
});