import * as SupplementalPdf from './core/pdf/supplemental-pdf.js';
import { writeDraftValue, finalizeFieldValue } from './core/form/form-contract.js';
import { focusFieldByPath } from './core/validation/validation-adapter.js';
import './core/filing/filing-descriptor.js';
import './core/filing/output-preflight.js';
import './core/form/form-fields.js';
import './core/form/schedule-definitions.js';

window.PGSupplementalPdf = SupplementalPdf;

// The data-form-path and data-annual-path write path is writeDraftValue() on
// input/compositionend and finalizeFieldValue() on blur/change, wired by the
// listeners below. data-annual-path joined it when Annual Accounting's own
// container-scoped persistAnnualControl() listeners were retired; the
// formats only that path knew (signed-decimal, security, ZIP limit) now live
// in form-contract.js. (A persistFormControl() wrapper and a formatters
// table used to sit here with no callers; removed in Milestone 42D.)
const boundPath = (control) => control.dataset.fieldPath || control.dataset.formPath || control.dataset.annualPath;

document.addEventListener('click', (event) => {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-form-action]') : null;
  if (!actionElement) return;
  switch (actionElement.dataset.formAction) {
    // Milestone 39-E: Print Preview's cross-route jump links carry
    // data-jump-path, not data-field-path -- focusFieldByPath()'s own
    // findTarget() treats `[data-field-path=...]` as one way to locate the
    // REAL target field, so a button using that same attribute name IS a
    // match for its own selector. renderLocalSectionGuidance()'s
    // same-route buttons (data-field-path, unchanged) never hit this: the
    // real field is always already on the page they're rendered into, so
    // querySelector finds it first in DOM order. A cross-route link has no
    // such field in the current DOM, so its own button becomes the only
    // match and gets mistaken for the target -- confirmed live before this
    // fix (the button received focus instead of navigating anywhere).
    case 'jump-to-field': focusFieldByPath(actionElement.dataset.route, actionElement.dataset.jumpPath || actionElement.dataset.fieldPath); break;
    case 'add-plan-row': window.addPlanRow(actionElement.dataset.collection, actionElement.dataset.rowType, actionElement.dataset.route); break;
    case 'add-plan-guardian': window.addPlanGuardian(actionElement.dataset.route); break;
    case 'remove-plan-guardian': window.removePlanGuardian(Number.parseInt(actionElement.dataset.index, 10), actionElement.dataset.route); break;
    case 'duplicate-plan-row': window.duplicatePlanRow(actionElement.dataset.collection, Number.parseInt(actionElement.dataset.index, 10), actionElement.dataset.route); break;
    case 'add-ward-type': window.showAddWardModalForType(actionElement.dataset.inventoryType); break;
    case 'choose-schedule-docs': document.getElementById(actionElement.dataset.inputId)?.click(); break;
    case 'confirm-delete-ward-year': window.confirmDeleteWardYear(actionElement.dataset.wardId, actionElement.dataset.yearKey); break;
    case 'edit-prior-year': window.editPriorYear(actionElement.dataset.wardId, actionElement.dataset.yearKey); break;
    case 'export-activity-log': window.exportActivityLog(); break;
    case 'filing-sync-closed': window.doFilingSyncClosed(actionElement.dataset.role, actionElement.dataset.index); break;
    case 'filing-sync-closed-all': window.doFilingSyncClosed(); break;
    case 'link-party': window.showPickPartyModal(actionElement.dataset.role, actionElement.dataset.index); break;
    // summary-renderer.js's Section Completion / footer links are <a href="#">
    // (not <button>, so they read as links, not controls). Without this, the
    // anchor's own default action also fires right after window.navigate()
    // starts rendering the target page: it sets location.hash to "" (from
    // href="#"), which queues a second, later hashchange that finds no
    // matching route and falls back to Cover -- so every summary-page link
    // appeared to navigate, then silently bounced back to the cover a beat
    // later. Every other data-form-action target is a real <button>, which
    // has no default action to prevent.
    case 'navigate': event.preventDefault(); window.navigate(actionElement.dataset.route); break;
    case 'open-court-portal': window.openFloridaCourtPortal(); break;
    case 'party-clear-compare': window.clearPartyCompareSelection(); break;
    // The two checkbox actions read the box's own state: a click on a checkbox
    // toggles it before listeners run, so `checked` is already the new value.
    case 'party-compare-toggle': window.togglePartyCompareSelection(actionElement.dataset.partyId, actionElement.checked); break;
    case 'party-dismiss-pair': window.doPartyDismissPair(actionElement.dataset.partyA, actionElement.dataset.partyB); break;
    case 'party-merge-keep': window.doPartyMergeKeep(actionElement.dataset.keepId, actionElement.dataset.discardId); break;
    case 'party-sync-closed': window.doPartySyncClosed(actionElement.dataset.wardId, actionElement.dataset.role, actionElement.dataset.index); break;
    case 'party-sync-closed-all': window.doPartySyncClosedAll(actionElement.dataset.partyId); break;
    case 'party-unmerge-selected': window.doPartyUnmergeSelected(); break;
    case 'party-unmerge-toggle': window.togglePartyUnmergeSelection(actionElement.dataset.partyId, actionElement.checked); break;
    case 'print': window.printCurrentFilingPdf(); break;
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
  if (boundPath(control)) {
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
  if (boundPath(control)) {
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
  if (control instanceof HTMLInputElement && control.dataset.formChange === 'schedule-evidence-override') {
    window.setScheduleEvidenceOverride(control.dataset.scheduleKey, control.checked);
  }
  if (control instanceof HTMLSelectElement && boundPath(control)) {
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
  if (boundPath(control)) {
    finalizeFieldValue(control, { event });
  }
});

// Milestone 50H: keyboard route to the county dropdown -- previously only
// mousedown could select an option, and Tab-blur closed the dropdown
// (focusout above) without committing whatever was highlighted, leaving no
// way to set a county without a mouse at all.
document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.dataset.formControl === 'county') {
    window.onCountyKeydown(event.target, event);
  }
});

document.addEventListener('mousedown', (event) => {
  const option = event.target instanceof Element ? event.target.closest('[data-form-mousedown="select-county"]') : null;
  if (!option) return;
  event.preventDefault();
  window.selectCountyOption(option.dataset.inputId, option.dataset.county);
});

// Milestone 50H: a plain click alongside the mousedown handler above.
// mousedown+preventDefault is what real pointer interaction actually needs
// (it stops the input's blur closing the dropdown before selection
// registers) and stays the primary path -- this changes nothing for a real
// mouse/touch user. It exists so a script-driven `element.click()` (which
// dispatches only 'click', not the full mousedown/mouseup/click sequence a
// real pointer produces) also works, rather than silently doing nothing.
// selectCountyOption() is idempotent, so the harmless double-call a real
// click still triggers (mousedown, then click) costs nothing observable.
document.addEventListener('click', (event) => {
  const option = event.target instanceof Element ? event.target.closest('[data-form-mousedown="select-county"]') : null;
  if (!option) return;
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
