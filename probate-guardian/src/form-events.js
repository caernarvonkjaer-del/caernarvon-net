import { bindFieldToFiling, finalizeFieldValue, writeDraftValue } from './core/form/form-contract.js';
import { focusFieldByPath } from './core/validation/validation-adapter.js';
import { claimPreparer, PREPARER_FLAG_CHANGE } from './core/form/preparer-flag.js';
import { applyExclusiveChoice } from './core/form/exclusive-none.js';
import './core/filing/filing-descriptor.js';
import './core/filing/output-preflight.js';
import './core/form/form-fields.js';
import './core/form/schedule-definitions.js';
import { emptyPlanDirective } from './core/filing/models/plan-annual.js';
import { getD } from './core/state.js';
import { addPlanGuardian, addPlanRow, duplicatePlanRow, removePlanGuardian, removePlanRow } from './core/form/plan-row-actions.js';
import { pvSelect, pvStep } from './core/ui/print-pager.js';
import { handleScheduleDocUpload, removeScheduleDoc, updateScheduleComment } from './core/filing/schedule-docs.js';
import { toggleSsnReveal } from './core/form/form-runtime.js';
import { filterCountyDropdown, hideCountyDropdown, onCountyKeydown, selectCountyOption } from './core/form/county-autocomplete.js';
import { navigate, renderPage } from './core/navigation/router.js';
import { confirmDeleteWardYear, editPriorYear } from './core/modals/year-dialogs.js';
import { clearPartyCompareSelection, doFilingSyncClosed, doPartyDismissPair, doPartyMergeKeep, doPartySyncClosed, doPartySyncClosedAll, doPartyUnmergeSelected, renderPartyDirectoryRows, togglePartyCompareSelection, togglePartyUnmergeSelection } from './core/parties/party-management.js';
import { showPickPartyModal } from './core/modals/pick-record-dialogs.js';

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
    case 'add-plan-row': addPlanRow(actionElement.dataset.collection, actionElement.dataset.rowType, actionElement.dataset.route); break;
    case 'add-plan-guardian': addPlanGuardian(actionElement.dataset.route); break;
    case 'remove-plan-guardian': removePlanGuardian(Number.parseInt(actionElement.dataset.index, 10), actionElement.dataset.route); break;
    case 'duplicate-plan-row': duplicatePlanRow(actionElement.dataset.collection, Number.parseInt(actionElement.dataset.index, 10), actionElement.dataset.route); break;
    case 'add-ward-type': window.showAddWardModalForType(actionElement.dataset.inventoryType); break;
    case 'choose-schedule-docs': document.getElementById(actionElement.dataset.inputId)?.click(); break;
    case 'confirm-delete-ward-year': confirmDeleteWardYear(actionElement.dataset.wardId, actionElement.dataset.yearKey); break;
    case 'edit-prior-year': editPriorYear(actionElement.dataset.wardId, actionElement.dataset.yearKey); break;
    case 'export-activity-log': window.exportActivityLog(); break;
    case 'filing-sync-closed': doFilingSyncClosed(actionElement.dataset.role, actionElement.dataset.index); break;
    case 'filing-sync-closed-all': doFilingSyncClosed(); break;
    case 'link-party': showPickPartyModal(actionElement.dataset.role, actionElement.dataset.index); break;
    // summary-renderer.js's Section Completion / footer links are <a href="#">
    // (not <button>, so they read as links, not controls). Without this, the
    // anchor's own default action also fires right after window.navigate()
    // starts rendering the target page: it sets location.hash to "" (from
    // href="#"), which queues a second, later hashchange that finds no
    // matching route and falls back to Cover -- so every summary-page link
    // appeared to navigate, then silently bounced back to the cover a beat
    // later. Every other data-form-action target is a real <button>, which
    // has no default action to prevent.
    case 'navigate': event.preventDefault(); navigate(actionElement.dataset.route); break;
    case 'open-court-portal': window.openFloridaCourtPortal(); break;
    case 'party-clear-compare': clearPartyCompareSelection(); break;
    // The two checkbox actions read the box's own state: a click on a checkbox
    // toggles it before listeners run, so `checked` is already the new value.
    case 'party-compare-toggle': togglePartyCompareSelection(actionElement.dataset.partyId, actionElement.checked); break;
    case 'party-dismiss-pair': doPartyDismissPair(actionElement.dataset.partyA, actionElement.dataset.partyB); break;
    case 'party-merge-keep': doPartyMergeKeep(actionElement.dataset.keepId, actionElement.dataset.discardId); break;
    case 'party-sync-closed': doPartySyncClosed(actionElement.dataset.wardId, actionElement.dataset.role, actionElement.dataset.index); break;
    case 'party-sync-closed-all': doPartySyncClosedAll(actionElement.dataset.partyId); break;
    case 'party-unmerge-selected': doPartyUnmergeSelected(); break;
    case 'party-unmerge-toggle': togglePartyUnmergeSelection(actionElement.dataset.partyId, actionElement.checked); break;
    case 'print': window.printCurrentFilingPdf(); break;
    case 'remove-plan-row': removePlanRow(actionElement.dataset.collection, Number.parseInt(actionElement.dataset.index, 10), actionElement.dataset.route); break;
    case 'save-pdf-plan-annual': window.doSavePdfPlanAnnual(); break;
    case 'save-pdf-plan-initial': window.doSavePdfPlanInitial(); break;
    case 'save-pdf-plan-minor': window.doSavePdfPlanMinor(); break;
    case 'preview-step': pvStep(Number.parseInt(actionElement.dataset.step, 10)); break;
    case 'remove-schedule-doc': removeScheduleDoc(actionElement.dataset.scheduleKey, Number.parseInt(actionElement.dataset.documentIndex, 10)); break;
    case 'toggle-ssn': toggleSsnReveal(actionElement); break;
  }
});

document.addEventListener('input', (event) => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
  if (boundPath(control)) {
    writeDraftValue(control, { event });
  }
  if (control.dataset.formControl === 'county') filterCountyDropdown(control);
  if (control.dataset.formInput === 'activity-log') window.renderActivityLogList();
  if (control.dataset.formInput === 'party-directory') renderPartyDirectoryRows();
  if (control.dataset.formInput === 'schedule-comment') updateScheduleComment(control.dataset.scheduleKey, control.value);
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
      if (collection && getD() && !(getD()[collection] || []).length) {
        getD()[collection] = [emptyPlanDirective()];
      }
    }
    // Milestone 67A: only one party may be the preparer. The ticked box has
    // just been written above; clear every other guardian/attorney flag
    // before the route re-render below, so the other cards' boxes visibly
    // clear on the click.
    if (control.dataset.formChange === PREPARER_FLAG_CHANGE && control.checked && getD()) {
      claimPreparer(getD(), control.dataset.formPath);
    }
    // Milestone 68E: a "None" box clears its siblings and a sibling clears
    // "None", in the model and the DOM, before any route re-render.
    if (control instanceof HTMLInputElement && control.type === 'checkbox' && control.dataset.exclusiveGroup && getD()) {
      applyExclusiveChoice(getD(), control);
    }
    if (control.dataset.formRoute && renderPage) {
      renderPage(control.dataset.formRoute);
    }
  }
  if (control instanceof HTMLSelectElement && control.dataset.formChange === 'preview-page') pvSelect(control.value);
  if (control instanceof HTMLSelectElement && control.dataset.formChange === 'activity-log') window.renderActivityLogList();
  if (control instanceof HTMLInputElement && control.dataset.formChange === 'schedule-doc-upload' && control.files) {
    handleScheduleDocUpload(control.dataset.scheduleKey, control.files);
    control.value = '';
  }
  if (control instanceof HTMLSelectElement && boundPath(control)) {
    writeDraftValue(control, { event });
    finalizeFieldValue(control, { event });
  }
});

document.addEventListener('focusin', (event) => {
  const control = event.target;
  if ((control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) && boundPath(control)) {
    bindFieldToFiling(control);
  }
  if (control instanceof HTMLInputElement && control.dataset.formControl === 'county') {
    filterCountyDropdown(control);
  }
});

document.addEventListener('focusout', (event) => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
  if (control.dataset.formControl === 'county') setTimeout(() => hideCountyDropdown(control.id), 150);
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
    onCountyKeydown(event.target, event);
  }
});

document.addEventListener('mousedown', (event) => {
  const option = event.target instanceof Element ? event.target.closest('[data-form-mousedown="select-county"]') : null;
  if (!option) return;
  event.preventDefault();
  selectCountyOption(option.dataset.inputId, option.dataset.county);
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
  selectCountyOption(option.dataset.inputId, option.dataset.county);
});

document.addEventListener('keydown', (event) => {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-form-action]') : null;
  if (!actionElement || !['Enter', ' '].includes(event.key)) return;
  if (actionElement.dataset.formAction === 'add-ward-type') {
    event.preventDefault();
    actionElement.click();
  }
});
