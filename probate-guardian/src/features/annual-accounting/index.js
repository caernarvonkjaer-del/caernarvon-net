import { renderSummaryPage, navStatus, formatSummaryDate } from '../../core/summary-renderer.js';
import { renderUcnField } from '../../core/form/cards/case-caption-card.js';
import { displayDate, formatDisplayDate } from '../../core/form/date-parser.js';
import { renderLocalSectionGuidance } from '../../core/status/section-status.js';
import { checkDateOrder } from '../../core/validation/date-rules.js';
// Milestone 51F: the capacity rule has ONE implementation. This used to come
// off `window` from a legacy-app.js twin that duplicated core's logic verbatim
// (remuneration-filtering comment included), so the print-page capacity panel
// and the export gate ran two separate copies of the same court-facing rule.
import { checkExcelCapacity } from '../../core/excel/excel-capacity.js';
// Milestone 73H: the dates this form shows go through displayDate()
// (date-parser.js), MM/DD/YYYY as on its PDF. It used cell-reader.js's
// fmtDate -- the importer's ISO reader -- under the name fmtD, so the sworn
// statements on Parts III to V read "2025-01-01" on screen.
import { filingCopy, resolveFilingDescriptor } from '../../core/filing/filing-descriptor.js';
import { renderCheckboxField, renderFormField, renderSelectField } from '../../core/form/form-fields.js';
import { issueFactory } from '../../core/validation/validation-issue.js';
import { serviceRecipientIssues, RECIPIENTS_OR_ATTESTATION, NO_RECIPIENTS_QUESTION } from '../../core/validation/service-recipients.js';
import { renderServiceAttestationRow } from '../../core/form/service-attestation-visibility.js';
// Milestone 57B: carried verbatim from MILESTONE-57-PROPOSAL.md section 57B.
// The wording is load bearing -- it keeps the app on the right side of
// asserting a legal conclusion for the filer (section 8 #8). Do not
// paraphrase, shorten, or re-voice it.
// Milestone 74F: the certificate's question is the one constant (service-recipients.js).
const ATTESTATION_57B = NO_RECIPIENTS_QUESTION;
// Milestone 63B: what makes a Part X recipient card "started". One list for the
// validator and for the page, which shows the attestation only while Recipient 1
// is not started, so the two read the same data the same way.
import { GUARDIANSHIP_TYPE_OPTIONS, optionsWithLegacyValue } from '../../core/form/guardianship-options.js';
import { addCollectionRow, duplicateCollectionRow, removeCollectionRow } from '../../core/form/schedule-definitions.js';
import { appendRow, removeRowAt } from '../../core/form/collections.js';
import { checkSignatureState, inferLegacySignatureState } from '../../core/validation/signature-state.js';
import { renderSignatureStateControl, mountSignatureStateControls, signatureDateRequired } from '../../core/signature/signature-state-control.js';
import { preparerNoteHTML } from '../../core/signature/preparer-note.js';
import { hasIdentifiedPreparer, preparerFlagCheckboxHTML, preparerWaivedNoticeHTML } from '../../core/form/preparer-flag.js';
import { confirmModal, alertModal } from '../../core/ui/dialogs.js';
import { SCH_B4_ACCOUNT_BLOCKS } from '../../core/excel/b4-register-pages.js';
import { b4AccountHeading } from '../../core/accounting/bank-accounts.js';
import { createIssue } from '../../core/validation/issue-registry.js';
import { migrateBondDepository, inferBondDepositoryState, BOND_DEPOSITORY_OPTIONS, BOND_DEPOSITORY_QUESTION, revealsBond, revealsDepository, revealsWaiver } from '../../core/filing/bond-depository.js';
import { renderRadioGroupField } from '../../core/form/form-fields.js';

// The court's workbook has one Schedule B-4 register block per bank account.
// Read from the block map rather than written as a literal so the form and
// the app cannot disagree about how many accounts a filing can hold.
const SCH_B4_MAX_ACCOUNTS = SCH_B4_ACCOUNT_BLOCKS.length;
import { promptScheduleAckIfNeeded } from '../../core/filing/schedule-doc-ack.js';
// Milestone 41-3: same structural story as its sibling Simplified
// Accounting, confirmed by reading the real markup. Only
// renderReportingPeriodFields() applies: wardName has no column wrapper
// (it sits directly in the summary-box), caseNumber uses the tooltip
// variant inpDWithTooltip() and is paired with the GID rather than county,
// and county sits in the other box entirely via countyInputD() -- so
// caseNumber and county are never adjacent, which is
// renderCaseCaptionFields()'s premise. One deliberate difference from the
// Plan types: inpD() passes no explicit id, so these fields currently get
// randomized ids (inp_periodFrom_xxxxx); the card passes a stable
// `periodFrom`/`periodTo` id instead. Confirmed safe -- this page renders
// each of those paths exactly once, and the specs that target these fields
// do so by [data-field-path], not by id.
import { renderReportingPeriodFields } from '../../core/form/cards/ward-demographics-card.js';
import { esc } from '../../core/filing/escape-html.js';
import { pageNavS } from '../../core/form/field-html.js';
import { ic } from '../../core/ui/icons.js';
import { syncPercentFeedback } from '../../core/form/form-contract.js';
import { rowStarted } from '../../core/validation/row-started.js';
import { formDisplayName } from '../../core/filing/filing-registry.js';
import { sectionMarks } from '../../core/status/section-marks.js';
import { getCaseFile, getD, requestSave } from '../../core/state.js';
import { updateNavDots } from '../../core/status/nav-marks.js';
import { renderScheduleDocsSection } from '../../core/filing/schedule-docs.js';
import { REQ_MARK, pageIntroRow, yesNoCheckboxD, yesNoRadioAnnualHTML, yesNoRadioHTML } from '../../core/form/field-html.js';
import { browserRecommendationNotice, linkAccordions } from '../../core/form/form-runtime.js';
import { countyAutocompleteHTML } from '../../core/form/county-autocomplete.js';
import { setPath } from '../../core/form/paths.js';
import { showPickPartyModal } from '../../core/modals/pick-record-dialogs.js';
import { tooltip } from '../../core/help/tooltips.js';
import { syncActiveWardNameDisplay, syncGuardianNameDisplay } from '../../core/shell/sidebar.js';
import { annualImportHint, confirmFilingTypeChange } from './filing-type.js';
import { navigate } from '../../core/navigation/router.js';
import { afterAdd, afterDuplicate, afterRemove, onChange } from '../../core/navigation/draw-reason.js';
import { calcTotalsAnnual, annualReconcileState, n, pct } from './totals.js';
import { attorneyEntryPaths, isAttorneyStarted } from '../../core/validation/attorney-block.js';
import { defineLivePart, livePartHtml } from '../../core/ui/live-parts.js';
import { startingBalanceNotesHTML } from '../../core/filing/starting-balance-carry.js';
import { percentProblem } from '../../core/validation/percent-range.js';
import { resolveServiceCertifier, certifierChoiceNeeded, certifyingCandidates, serviceCertifierChoiceHTML, waiverBasisQuestionHTML, watchWaiverAdvocateHint } from '../../core/filing/unrepresented-filing.js';
import { WARD_STATUS_VALUES, SERVICE_METHOD_LABEL, SERVICE_METHOD_KIND } from '../../core/filing/service-method.js';
import { moveWardStatusFromMethod } from '../../core/filing/certificate-migrations.js';
import { auditLog } from '../../core/activity/audit-log.js';
import { watchAttorneyRequiredMarkers } from '../../core/form/attorney-required-markers.js';
import { commitModelChange } from '../../core/model-change.js';
import { collectAnnualIssues, RECIPIENT_STARTED_FIELDS, annualDescriptor, fmtAnnual } from '../../core/validation/engines/annual.js';
import { withMinusCue } from '../../core/form/amount-codec.js';
// Milestone 73H: an amount as a screen shows it -- $5,000.00 / ($5,000.00), a
// negative also read as "minus" (withMinusCue()). fmtAnnual() alone where
// HTML can't go: a read-only box's value.
const fmtA=(v)=>withMinusCue(fmtAnnual(v));
import { GUARDIAN_RELATIONSHIPS } from '../../core/filing/guardian-relationship.js';
import { ANNUAL_DECLARATION, ANNUAL_RECEIPTS_CERTIFICATION } from '../../core/filing/court-text/accountings.js';

// Milestone 71B: the Part V fields that become required once an attorney is
// started (and only then) -- the live markers and validateAnnual() share it.
// Milestone 72C: the attorney's name ('attorney', on Part I and Part V) too.
const ANNUAL_ATTORNEY_REQUIRED = ['attorney', 'attorney_bar', 'attorney_phone', 'attorney_email', 'attorney_street', 'attorney_cityStateZip'];
// Milestone 73F part 3: Part X repeats the attorney's details for the certificate.
const ANNUAL_CERT_ATTORNEY_REQUIRED = ['attorney', 'attorney_bar', 'attorney_phone', 'attorney_street', 'attorney_cityStateZip'];
const ANNUAL_ATTORNEY_TRIGGERS = ['attorney', 'attorney_secondaryEmail', 'attorney_signatureState', 'attorney_isPreparer'];
const attorneyMarkerAborts = new WeakMap();
const waiverHintAborts = new WeakMap();
// Annual Accounting — the sixth feature extraction (Milestone 7, Phases A
// and B of INDEX-SPLIT-PLAN.md's migration sequence: data/pages/nav/
// validate, and print/PDF/Excel import/export). Also covers the
// finalAccounting/trustAccounting aliases -- formEngine(type) maps all
// three to 'annual' everywhere the app dispatches on type, so there is no
// separate code path for them anywhere in this module. Loaded on first use
// through src/features-loader.js (built on src/core/feature-bridge.js), never
// statically imported.
//
// Until Milestone 70's 70K this module took navigate(), the Annual totals and
// the n()/pct() helpers off window as it loaded -- the monolith's globals.
// They are imported below: the router's navigate(), and this feature's own
// ./totals.js, which src/features-loader.js loads eagerly because the
// dashboard's card total needs calcTotalsAnnual() for a filing whose feature
// has never loaded. One pct() now serves the pages and the totals: the
// monolith's copy was the pages' until then.

// print.js/excel.js are dynamically imported once, together, the first time
// this feature mounts -- same reasoning as Simplified Accounting's
// ensureLazyModules(): Part I (pagePart1Annual) has its own Excel-import
// dropzone that must work immediately, so deferring excel.js further would
// mean a second, separate lazy-load path for just that one control.
let _printModule = null;
let _excelModule = null;
let _lazyModulesPromise = null;
const eventControllers = new WeakMap();
// Milestone 39-C: see plan-annual/index.js's identical comment.
const signatureHandles = new WeakMap();
function ensureLazyModules() {
  if (_printModule && _excelModule) return Promise.resolve();
  if (!_lazyModulesPromise) {
    _lazyModulesPromise = Promise.all([import('./print.js'), import('./excel.js')]).then(([print, excel]) => {
      _printModule = print;
      _excelModule = excel;
    });
  }
  return _lazyModulesPromise;
}

export async function mount(container, page, { signal } = {}) {
  await ensureLazyModules();
  // Superseded while its modules loaded (Milestone 70, 70K): a newer
  // navigation owns the page, so draw nothing.
  if (signal?.aborted) return;
  // Milestone 67B: a filing saved before the four-state bond question reads
  // back with the state its old fields implied, and the retired
  // restrictedDepository tri-state is dropped. Idempotent.
  if (migrateBondDepository(getD())) requestSave();
  // Milestone 72G: once, a ward's status typed into the method box (it was
  // labelled "Indicate if") moves to Indicate if Ward is:, exact matches only;
  // the log names the fields, never the value (certificate-migrations.js).
  const statusMove = moveWardStatusFromMethod(getD());
  if (statusMove) {
    requestSave();
    if (statusMove.moved) void auditLog('CERTIFICATE_MIGRATION', "Part X: the ward's status moved from the method-of-service box (certIndicator) to Indicate if Ward is (certWardStatus)", true);
  }
  let html;
  switch (page) {
    case '/':      html = pagePart1Annual(); break;
    case '/summary': html = renderSummaryPage(getSummaryConfigAnnual()); break;
    case '/p2':    html = pagePart2Annual(); break;
    case '/p3':    html = pagePart3Annual(); break;
    case '/p4':    html = pagePart4Annual(); break;
    case '/p5':    html = pagePart5Annual(); break;
    case '/scha':  html = pageSchAAnnual(); break;
    case '/schb1': html = pageSchB1Annual(); break;
    case '/schb2': html = pageSchB2Annual(); break;
    case '/schb3': html = pageSchB3Annual(); break;
    case '/schb4': html = pageSchB4Annual(); break;
    case '/schc':  html = pageSchCAnnual(); break;
    case '/schd1': html = pageSchD1Annual(); break;
    case '/schd2': html = pageSchD2Annual(); break;
    case '/schd3': html = pageSchD3Annual(); break;
    case '/schd4': html = pageSchD4Annual(); break;
    case '/schd5': html = pageSchD5Annual(); break;
    case '/sche':  html = pageSchEAnnual(); break;
    case '/schf1': html = pageSchF1Annual(); break;
    case '/schf2': html = pageSchF2Annual(); break;
    case '/p67':   html = pagePart67Annual(); break;
    case '/p8':    html = pagePart8Annual(); break;
    case '/p9':    html = pagePart9Annual(); break;
    case '/p10':   html = pagePart10Annual(); break;
    case '/p11':   html = pagePart11Annual(); break;
    case '/print': {
      const capOver = checkExcelCapacity(_excelModule.ANNUAL_EXCEL_CAPS, getD());
      html = _printModule.pagePrintAnnual(capOver);
      break;
    }
    default:       html = pagePart1Annual();
  }
  container.innerHTML = html;
  bindEvents(container);
  syncPercentFeedback(container);
  if (page === '/' || !page || page === '/p1') linkAccordions('instructionsZoneAnnual', 'importZonePart1');
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  if (page === '/p3' || page === '/p4' || page === '/p5' || page === '/p10') {
    signatureHandles.set(container, mountSignatureStateControls(container, {
      setImage: (imagePath, dataUrl) => setPath(getD(), imagePath, dataUrl),
      route: page,
    }));
  }
  // Milestone 72I: the Guardian Advocate hint follows Type of Guardianship on
  // Part I as the filer changes it.
  waiverHintAborts.get(container)?.abort();
  waiverHintAborts.delete(container);
  if (page === '/' || !page || page === '/p1') waiverHintAborts.set(container, watchWaiverAdvocateHint(container, getD));
  attorneyMarkerAborts.get(container)?.abort();
  attorneyMarkerAborts.delete(container);
  if (page === '/p5') {
    attorneyMarkerAborts.set(container, watchAttorneyRequiredMarkers(container, {
      engineId: 'annual', paths: ANNUAL_ATTORNEY_REQUIRED, triggerPaths: ANNUAL_ATTORNEY_TRIGGERS,
    }));
  } else if (page === '/p10') {
    attorneyMarkerAborts.set(container, watchAttorneyRequiredMarkers(container, {
      engineId: 'annual', paths: ANNUAL_CERT_ATTORNEY_REQUIRED, triggerPaths: ANNUAL_ATTORNEY_TRIGGERS,
    }));
  } else if (page === '/' || !page || page === '/p1') {
    // Milestone 72C: Part I's "Attorney for Guardian" is the same field as
    // Part V's name, so it is marked the same way -- as the Simplified's Cover
    // marks its own (SIMPLIFIED_ATTORNEY_REQUIRED['/']).
    attorneyMarkerAborts.set(container, watchAttorneyRequiredMarkers(container, {
      engineId: 'annual', paths: ['attorney'], triggerPaths: ANNUAL_ATTORNEY_TRIGGERS,
    }));
  }
  if (page === '/print') await _printModule.mountPreview();
  // Milestone 57C-R -- see guardian-inventory/index.js's note on why this is a
  // floating call and must not be awaited. window.D.inventoryType rather than
  // a literal, because this one module serves annual, finalAccounting and
  // trustAccounting.
  void promptScheduleAckIfNeeded(getD(), getD()?.inventoryType || 'annual', page, confirmModal, { openFiling: getD }).catch(() => {});
}

export function dispose(container) {
  eventControllers.get(container)?.abort();
  eventControllers.delete(container);
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  attorneyMarkerAborts.get(container)?.abort();
  attorneyMarkerAborts.delete(container);
  waiverHintAborts.get(container)?.abort();
  waiverHintAborts.delete(container);
  container.replaceChildren();
}

function setterPath(setter) {
  const assignment = setter.split(';', 1)[0];
  const match = /^D((?:\.[A-Za-z_$][\w$]*|\[\d+\])+)=this\.value$/.exec(assignment);
  if (!match) throw new Error(`Unsupported Annual field binding: ${assignment}`);
  return match[1].replace(/^\./, '').replace(/\[(\d+)\]/g, '.$1');
}

/**
 * Recomputes every schedule total currently on screen, so the figures at the
 * bottom of a schedule page track the row the user is typing in instead of
 * going stale until the next re-render.
 *
 * Declarative on purpose -- the same shape as Guardian Inventory's
 * `[data-calcbind]`/updateCalcFields() pair. A total cell opts in by carrying
 * `data-annual-total="<key>"` naming its key in calcTotalsAnnual()'s result,
 * and nothing else has to be registered anywhere. Runs after every field
 * write via the `pg:field-written` event form-contract.js's shared post-write
 * tail dispatches (subscribed in bindEvents()). This replaces a hardcoded
 * `document.getElementById('schA_total')` refresh that left every schedule
 * except A stale, and which no one would have thought to extend when adding
 * a schedule.
 *
 * Cells whose displayed figure is an expression over several keys rather than
 * one key (the Part IX bond worksheet's unrestricted-asset subtractions) are
 * deliberately not tagged: they live on pages that have no editable inputs of
 * their own, so they are always freshly rendered on arrival.
 */
function refreshAnnualTotals() {
  const cells = document.querySelectorAll('[data-annual-total]');
  const t = calcTotalsAnnual();
  cells.forEach((cell) => {
    const key = cell.dataset.annualTotal;
    if (key in t) cell.innerHTML = fmtA(t[key]);
  });

  const d = getD() || {};
  document.querySelectorAll('[data-annual-calc]').forEach((input) => {
    const path = input.dataset.annualCalc;
    if (!path) return;
    const parts = path.split('.');
    const sch = parts[0], idx = parseInt(parts[1], 10);
    const r = d[sch]?.[idx];
    if (!r) return;
    let val = 0;
    if (sch === 'schD1' || sch === 'schD3') {
      val = n(r.fullAmount) * pct(r.wardPct);
    } else if (sch === 'schD2' || sch === 'schD4') {
      val = n(r.fullValue || r.fullAmount) * pct(r.wardPct);
    } else if (sch === 'schD5') {
      val = n(r.fullDebt) * pct(r.wardPct);
    }
    input.value = fmtAnnual(val);
  });
}


function bindEvents(container) {
  eventControllers.get(container)?.abort();
  const controller = new AbortController();
  eventControllers.set(container, controller);
  const options = { signal: controller.signal };
  // Field writes are not handled here. Every Annual/Final/Trust control --
  // inpD()'s renderFormField() output and the hand-rolled data-annual-path
  // fields alike -- is claimed by form-events.js's document-level listeners
  // and written through form-contract.js's writeDraftValue()/
  // finalizeFieldValue(), the same path as Simplified Accounting and the
  // four Plans. This module used to run its own persistAnnualControl()
  // beside that: a second writer on the same events with its own copy of
  // the formatters (the renderFormField() fields carry data-field-path, so
  // the shared listener was already firing on them too -- blurring a name
  // field ran the post-write tail twice). What that copy alone knew --
  // signed-decimal amounts, the security sanitizer, the ZIP digit cap --
  // now lives in form-contract.js, keyed by attribute, so this file no
  // longer decides how any value is formatted. The one thing it still owes
  // each write is the live schedule-total repaint, subscribed here to the
  // event the shared tail dispatches; the AbortController ends it with the
  // page, so nothing dangles after dispose().
  window.addEventListener('pg:field-written', () => refreshAnnualTotals(), options);
  container.addEventListener('change', (event) => {
    const control = event.target;
    if (control instanceof HTMLSelectElement && control.dataset.annualPath === 'filingType') {
      // Milestone 74J (decision 74J-1): asked first; the shared field writer
      // (form-events.js, on the document) must not store it meanwhile.
      event.stopPropagation();
      void confirmFilingTypeChange(control);
      return;
    }
    if (control instanceof HTMLInputElement && control.dataset.annualChange === 'schedule-no-items') {
      if (!getD().scheduleNoItems) getD().scheduleNoItems = {};
      getD().scheduleNoItems[control.dataset.schedule] = control.checked;
      commitModelChange('no-items', [`scheduleNoItems.${control.dataset.schedule}`]);
      updateNavDots();
      return;
    }
    if (control instanceof HTMLInputElement && control.dataset.annualChange === 'import-excel') _excelModule.importExcel(control);
  }, options);
  container.addEventListener('click', async (event) => {
    const control = event.target instanceof Element ? event.target.closest('[data-annual-action]') : null;
    if (!control) return;
    event.preventDefault();
    const collection = control.dataset.collection;
    const index = Number.parseInt(control.dataset.index, 10);
    switch (control.dataset.annualAction) {
      case 'add-row': addAnnualRow(collection, control.dataset.route); break;
      case 'duplicate-row': duplicateAnnualRow(collection, index, control.dataset.route); break;
      case 'link-party': showPickPartyModal(control.dataset.role, control.dataset.index); break;
      case 'navigate': navigate(control.dataset.route); break;
      case 'remove-row': await removeAnnualRow(collection, index, control.dataset.route); break;
      case 'add-b4-account': addB4Account(control.dataset.route); break;
      case 'remove-b4-account': await removeB4Account(index, control.dataset.route); break;
      case 'save-excel': _excelModule.doSaveExcel(); break;
      case 'save-pdf': _printModule.doSavePdf(); break;
    }
  }, options);
}

export function mountNav(container) {
  buildNavAnnual(container);
}

// Same idea as the Plan-family's planEmptyRow-family row CRUD, but for the
function duplicateAnnualRow(arrName, idx, route) {
  if (duplicateCollectionRow(arrName, idx, getD())) {
    commitModelChange('collection-duplicate', [arrName]);
    navigate(route, onChange(afterDuplicate(getD(), arrName, idx)));
  }
}

// Schedule B-4's bank accounts. The court's workbook prints each account's
// disbursements in that account's own block of register pages, so an account
// is a real thing a filer creates, not a free-text label on a row.
async function addB4Account(route) {
  const d = getD();
  if (!Array.isArray(d.schB4Accounts)) d.schB4Accounts = [];
  if (d.schB4Accounts.length >= SCH_B4_MAX_ACCOUNTS) {
    await alertModal(`The court's Excel workbook has ${SCH_B4_MAX_ACCOUNTS} Schedule B-4 account sections, so ${SCH_B4_MAX_ACCOUNTS} is the most this filing can hold. The PDF is not limited.`);
    return;
  }
  // Milestone 73V: the account row (a new id, no bank yet) is the list rules'.
  appendRow(d, 'schB4Accounts');
  commitModelChange('collection-add', ['schB4Accounts']);
  navigate(route, onChange(afterAdd(d, 'schB4Accounts')));
}

// Deleting an account never deletes money. Its disbursements are unassigned
// and stay in the schedule for the filer to re-attribute -- silently dropping
// financial rows because a label was removed would be the worse failure, and
// an unassigned row is caught at export rather than filed under a wrong bank.
async function removeB4Account(index, route) {
  const d = getD();
  const account = (d.schB4Accounts || [])[index];
  if (!account) return;
  const orphans = (d.schB4 || []).filter(r => r && r.bankAccountId === account.id);
  const name = b4AccountHeading(account, index);
  if (orphans.length && !(await confirmModal(
    `Remove ${name}? Its ${orphans.length} disbursement${orphans.length === 1 ? '' : 's'} will stay in Schedule B-4 but will no longer be assigned to a bank account, and Excel export is blocked until they are reassigned.`
  ))) return;
  for (const row of orphans) row.bankAccountId = '';
  removeRowAt(d, 'schB4Accounts', index);
  commitModelChange('collection-remove', ['schB4Accounts', 'schB4']);
  navigate(route, onChange(afterRemove(d, 'schB4Accounts', index)));
}

function addAnnualRow(collection, route) {
  // Milestone 58D: adding an entry answers Part XI by itself, so a previously
  // ticked "no items to report" declaration is withdrawn rather than left to
  // contradict the row being added -- since 73F part 3 on every schedule, by
  // appendRow() under the key the page's box writes (no-items-keys.js).
  if (addCollectionRow(collection, getD())) {
    commitModelChange('collection-add', [collection, 'scheduleNoItems']);
    navigate(route, onChange(afterAdd(getD(), collection)));
  }
}
async function removeAnnualRow(collection, index, route) {
  if (collection === 'guardians' && index > 0 && rowStarted(getD().guardians?.[index]) && !(await confirmModal(`Remove co-guardian ${getD().guardians[index].name || `#${index + 1}`}? This will delete the entered signature information.`))) return;
  if (removeCollectionRow(collection, index, getD())) {
    commitModelChange('collection-remove', [collection]);
    navigate(route, onChange(afterRemove(getD(), collection, index)));
  }
}

function buildNavAnnual(container){
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">${esc(formDisplayName(getD().inventoryType))}</div>
      <button class="nav-link-item" data-page="/" data-nav="a-p1" data-form-action="navigate" data-route="/">Cover &amp; Part I — Case Info</button>
      <button class="nav-link-item" data-page="/summary" data-nav="a-summary" data-form-action="navigate" data-route="/summary">Summary</button>
      <button class="nav-link-item" data-page="/p2" data-nav="a-p2" data-form-action="navigate" data-route="/p2">Part II — Accounting</button>
      <button class="nav-link-item" data-page="/p3" data-nav="a-p3" data-form-action="navigate" data-route="/p3">Part III — Guardians</button>
      <button class="nav-link-item" data-page="/p4" data-nav="a-p4" data-form-action="navigate" data-route="/p4">Part IV — Preparer</button>
      <button class="nav-link-item" data-page="/p5" data-nav="a-p5" data-form-action="navigate" data-route="/p5">Part V — Attorney</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedules</div>
      <button class="nav-link-item" data-page="/scha" data-nav="a-scha" data-form-action="navigate" data-route="/scha">Sch A — Income</button>
      <button class="nav-link-item" data-page="/schb1" data-nav="a-schb1" data-form-action="navigate" data-route="/schb1">Sch B1 — Disbursements</button>
      <button class="nav-link-item" data-page="/schb2" data-nav="a-schb2" data-form-action="navigate" data-route="/schb2">Sch B2 — Disbursements</button>
      <button class="nav-link-item" data-page="/schb3" data-nav="a-schb3" data-form-action="navigate" data-route="/schb3">Sch B3 — Disbursements</button>
      <button class="nav-link-item" data-page="/schb4" data-nav="a-schb4" data-form-action="navigate" data-route="/schb4">Sch B4 — Disbursements</button>
      <button class="nav-link-item" data-page="/schc" data-nav="a-schc" data-form-action="navigate" data-route="/schc">Sch C — Gains/Losses</button>
      <button class="nav-link-item" data-page="/schd1" data-nav="a-schd1" data-form-action="navigate" data-route="/schd1">Sch D1 — Assets</button>
      <button class="nav-link-item" data-page="/schd2" data-nav="a-schd2" data-form-action="navigate" data-route="/schd2">Sch D2 — Real Property</button>
      <button class="nav-link-item" data-page="/schd3" data-nav="a-schd3" data-form-action="navigate" data-route="/schd3">Sch D3 — Other Assets</button>
      <button class="nav-link-item" data-page="/schd4" data-nav="a-schd4" data-form-action="navigate" data-route="/schd4">Sch D4 — Intangible Assets</button>
      <button class="nav-link-item" data-page="/schd5" data-nav="a-schd5" data-form-action="navigate" data-route="/schd5">Sch D5 — Liabilities</button>
      <button class="nav-link-item" data-page="/sche" data-nav="a-sche" data-form-action="navigate" data-route="/sche">Sch E — Transfers</button>
      <button class="nav-link-item" data-page="/schf1" data-nav="a-schf1" data-form-action="navigate" data-route="/schf1">Sch F1 — Sales</button>
      <button class="nav-link-item" data-page="/schf2" data-nav="a-schf2" data-form-action="navigate" data-route="/schf2">Sch F2 — Sales</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Certification</div>
      <button class="nav-link-item" data-page="/p67" data-nav="a-p67" data-form-action="navigate" data-route="/p67">Parts VI &amp; VII</button>
      <button class="nav-link-item" data-page="/p8" data-nav="a-p8" data-form-action="navigate" data-route="/p8">Part VIII — Trusts</button>
      <button class="nav-link-item" data-page="/p9" data-nav="a-p9" data-form-action="navigate" data-route="/p9">Part IX — Bond</button>
      <button class="nav-link-item" data-page="/p10" data-nav="a-p10" data-form-action="navigate" data-route="/p10">Part X — Cert. of Service</button>
      <button class="nav-link-item" data-page="/p11" data-nav="a-p11" data-form-action="navigate" data-route="/p11">Part XI — Remuneration</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}
// The `instanceof Date` guard on a date this form shows matters more than
// anywhere: the under-penalties-of-perjury attestation's "from X through Y".
// String(dateObj).substring(0,10) gives "Tue May 19" for a 2026-05-20T00:00:00Z
// date -- wrong format and a day early, inside a sworn statement. See
// tests/unit/date-truncation-helpers.spec.js. Milestone 73H: displayDate()
// (date-parser.js) carries that guard for this form's screens; the re-export
// of the importer's fmtDate as fmtD, which did, is gone.
// securitySanitize: this family's plain free-text fields keep running
// validateSecurityInput() (src/core/security/input-hardening.js) on blur
// (see the option's own
// comment in form-fields.js) -- the behavior of the retired
// persistAnnualControl() focusout handler, now declared per field rather
// than assumed of everything inside this module's container.
// Milestone 71E: `opts` passes a field kind and keepBlank through to the
// renderer (the Starting Balance is a signed amount that keeps a blank).
function inpD(label,val,setter,req=false,type='text',opts={}){
  return renderFormField({
    path: setterPath(setter),
    label,
    value: val,
    type,
    required: req,
    securitySanitize: true,
    ...opts,
  });
}
function selD(label,val,setter,opts,req=false){
  return renderSelectField({
    path: setterPath(setter),
    label,
    value: val,
    options: opts,
    required: req,
  });
}
// County-field counterpart to selD() -- same custom-setter-string
// convention, but a filtered-autocomplete text input instead of a <select>.
function countyInputD(label,val,setter,req=false){
  const inputId='cty_'+Math.random().toString(36).slice(2,9);
  return `<div class="mb-2"><label class="form-label" for="${inputId}">${label}${req?REQ_MARK:''}</label>${countyAutocompleteHTML(inputId,val,setterPath(setter))}</div>`;
}
// Milestone 71C: `kind` passes a field kind through to the renderer --
// `type: 'number'` alone always meant money, so a Ward's % could not be a
// percent field (0-100, minus kept) without it.
function inpDWithTooltip(label,tooltipKey,val,setter,req=false,type='text',kind=null){
  return renderFormField({
    path: setterPath(setter),
    label,
    value: val,
    type,
    kind,
    required: req,
    tooltipKey,
    securitySanitize: true,
  });
}
// Milestone 73O part 4 (decision 73O-4): the shared footer, as every form's.
function pageNavAnnual(prev,next){
  return pageNavS(prev,next);
}
function getSummaryConfigAnnual(){
  const d=getD();
  const descriptor=annualDescriptor(d);
  // This filing's own section marks (Milestone 73F part 2: from the export
  // checks, src/core/status/section-marks.js; 70D's per-type evaluator before).
  const nav=sectionMarks(d);
  const t=calcTotalsAnnual();
  const f=v=>fmtA(v)||'—';
  return {
    formTitle:`${descriptor?.displayName||'Annual Accounting'} — Summary`,
    infoRows:[
      {label:'Ward Name',value:esc(d.wardName)},
      {label:'Case Number',value:esc(d.caseNumber)},
      {label:'Period',value:formatSummaryDate(d.periodFrom)+' – '+formatSummaryDate(d.periodTo)},
      {label:'Filing Type',value:esc(d.filingType||'Annual')+(d.amendedForm==='Yes'?' (Amended)':'')},
      {label:'Guardian',value:esc(d.guardian)},
      {label:'Attorney',value:esc(d.attorney)},
      {label:'County',value:esc(d.county)},
    ],
    leftCards:[
      {
        heading:'Financial Quick Summary',
        lines:[
          {label:'Starting Balance',value:f(d.startingBalance)},
          {label:'Sch A — Income',value:f(t.schA)},
          {label:'Total Disbursements (B-1 thru B-4)',value:f(-t.totalDisb)},
          {label:'Sch C — Capital Adj. Net',value:f(t.schC_net)},
          {label:'Net Assets at End of Period',value:f(t.netAssets),isTotal:true},
          {label:'Net Assets from Sch D (should match)',value:f(t.netAssetsFromD)},
        ],
      },
      {
        heading:'Section Completion',
        lines:[
          {label:'Cover &amp; Part I — Case Info',route:'/',status:navStatus(nav,'a-p1')},
          {label:'Part II — Accounting',route:'/p2',status:navStatus(nav,'a-p2')},
          {label:'Part III — Guardians',route:'/p3',status:navStatus(nav,'a-p3')},
          {label:'Part IV — Preparer',route:'/p4',status:navStatus(nav,'a-p4')},
          {label:'Part V — Attorney',route:'/p5',status:navStatus(nav,'a-p5')},
          {label:'Parts VI &amp; VII',route:'/p67',status:navStatus(nav,'a-p67')},
          {label:'Part VIII — Trusts',route:'/p8',status:navStatus(nav,'a-p8')},
          {label:'Part IX — Bond',route:'/p9',status:navStatus(nav,'a-p9')},
          {label:'Part X — Cert. of Service',route:'/p10',status:navStatus(nav,'a-p10')},
          {label:'Part XI — Remuneration',route:'/p11',status:navStatus(nav,'a-p11')},
        ],
      },
    ],
    rightCards:[{
      heading:'Schedules',
      lines:[
        {label:'Sch A — Income',route:'/scha',status:navStatus(nav,'a-scha')},
        {label:'Sch B1 — Disbursements',route:'/schb1',status:navStatus(nav,'a-schb1')},
        {label:'Sch B2 — Disbursements',route:'/schb2',status:navStatus(nav,'a-schb2')},
        {label:'Sch B3 — Disbursements',route:'/schb3',status:navStatus(nav,'a-schb3')},
        {label:'Sch B4 — Disbursements',route:'/schb4',status:navStatus(nav,'a-schb4')},
        {label:'Sch C — Gains/Losses',route:'/schc',status:navStatus(nav,'a-schc')},
        {label:'Sch D1–D5 — Assets & Liabilities',route:'/schd1',status:navStatus(nav,['a-schd1','a-schd2','a-schd3','a-schd4','a-schd5'])},
        {label:'Sch E — Transfers',route:'/sche',status:navStatus(nav,'a-sche')},
        {label:'Sch F1–F2 — Sales',route:'/schf1',status:navStatus(nav,['a-schf1','a-schf2'])},
      ],
    }],
    banner:{title:'NET ASSETS ON HAND',value:f(t.netAssetsFromD)},
    nextRoute:'/p2',
  };
}
// Exported (not just module-local) because print.js's buildPrintHTMLAnnual()
// also needs it, for the same Schedule B-4 category-total table --
// statically imported back from here, same pattern as fmtAnnual above.
export const DISB_CATS=['Accounting','Bank Service Charges','Care Facility','Clothing / Personal Needs','Entertainment / Travel','Food / Meals','Insurance: Automobile / Property','Insurance: Health / Life','Medical / Pharmacy','Mortgage','Nurse / Care Giver / Employer Tax','Other Legal Expenses','Rent','Repairs / Maintenance','Taxes: Income','Taxes: Intangible','Utilities','Other'];
const LIAB_TYPES=['Mortgage','Note','Loan','Other'];
const GUARDIAN_REL=GUARDIAN_RELATIONSHIPS;

function pagePart1Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  return `<div class="schedule-page">
  <!-- Milestone 40C-B: the root route is the filing's cover as well as Part I,
       and it carries the filing-level County control, so its name has to say
       so. Sidebar and Summary read "Cover & Part I — Case Info"; this heading
       matches Simplified Accounting's already-shipped
       "Cover & Part I — Required Information" so no two filing types disagree. -->
  <h1>Cover &amp; Part I — Required Information</h1>
  <div class="instructions-import-row">
    <div class="accordion mb-0">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#instructionsZoneAnnual" aria-expanded="false">
            ${ic('clipboard',15)} General Instructions
          </button>
        </h2>
        <div id="instructionsZoneAnnual" class="accordion-collapse collapse">
          <div class="accordion-body" style="padding:1rem 1.25rem;">
            <ul style="margin:0;padding-left:1.4rem;font-size:.8rem;">
              <li>Fields marked with an asterisk (<span class="req">*</span>) are required before export; the UCN is starred as a reminder and never blocks.</li>
              <li>Ward Name and Case Number auto-populate all schedule headers.</li>
              <li><strong style="color:var(--danger-text);">CAUTION on Ward's % fields:</strong> Enter percentages as plain digits (70, not 0.70).</li>
              <li>Use Print Preview to save as PDF or Excel for filing.</li>
            </ul>
            ${browserRecommendationNotice('margin-top:0.75rem;margin-bottom:0;')}
          </div>
        </div>
      </div>
    </div>
    <div class="accordion mb-0">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZonePart1" aria-expanded="false">
            <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing annual accounting template)
          </button>
        </h2>
        <div id="importZonePart1" class="accordion-collapse collapse">
          <div class="accordion-body import-zone-body p-4 text-center">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" class="d-none" data-annual-change="import-excel">
            </label>
            <p class="mt-2 mb-0" style="color:var(--ink-3);font-size:.8rem;">${esc(annualImportHint(d.inventoryType))}</p>
            <div id="import-progress" class="mt-2" style="font-size:.8rem;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="row g-3 mb-3 cover-info-row">
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Required Information</h2>
        ${inpD('Name of Ward',d.wardName,"D.wardName=this.value",true)}
        <div class="row g-2">
          <div class="col-md-6">${inpDWithTooltip('Case Number','case_number',d.caseNumber,"D.caseNumber=this.value",true)}</div>
          <div class="col-md-6">${inpD('Guardianship Inception Date (GID)',d.gid,"D.gid=this.value",true,'date')}</div>
        </div>
        <div class="row g-2">
          <div class="col-md-6">${renderUcnField(d.ucn,{securitySanitize:true})}</div>
        </div>
        <div class="row g-2">
          ${renderReportingPeriodFields({ periodFrom: d.periodFrom, periodTo: d.periodTo, fromLabel: 'Period From', toLabel: 'Period To' })}
        </div>
        <div class="row g-2">
          <div class="col-md-6">${selD('Filing Type',d.filingType,"D.filingType=this.value",['Annual','Final','Trust'],true)}</div>
          <div class="col-md-6">${yesNoCheckboxD('Amended Form?',d.amendedForm,'amendedForm',true)}</div>
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Guardian &amp; Attorney</h2>
        ${inpD('Guardian',d.guardian,"D.guardian=this.value",true)}
        <div class="row g-2">
          <div class="col-md-8">${inpD('Attorney for Guardian',d.attorney,"D.attorney=this.value",isAttorneyStarted(d,'annual'))}</div>
          <div class="col-md-4">${countyInputD('County',d.county,"D.county=this.value",true)}</div>
        </div>
        ${renderSelectField({path:'typeOfGuardianship',label:'Type of Guardianship',value:d.typeOfGuardianship,options:optionsWithLegacyValue(GUARDIANSHIP_TYPE_OPTIONS,d.typeOfGuardianship),required:true})}
        ${inpD('Related Case Numbers (siblings/relatives with guardianships)',d.relatedCaseNumbers,"D.relatedCaseNumbers=this.value")}
      </div>
    </div>
  </div>
  ${livePartHtml('annual-waiver-question')}
  <div class="summary-box mt-3">
    <h2 class="subsection-heading">Quick Summary (auto-calculated)</h2>
    <div class="summary-line"><span>Starting Balance</span><span>${fmtA(d.startingBalance)||'—'}</span></div>
    <div class="summary-line"><span>Sch A — Income</span><span>${fmtA(t.schA)}</span></div>
    <div class="summary-line"><span>Total Disbursements (B-1 thru B-4)</span><span>${fmtA(-t.totalDisb)}</span></div>
    <div class="summary-line"><span>Sch C — Capital Adj. Net</span><span>${fmtA(t.schC_net)}</span></div>
    <div class="summary-line total"><span>Net Assets at End of Period</span><span>${fmtA(t.netAssets)}</span></div>
    <div class="summary-line" style="margin-top:.35rem;"><span>Net Assets from Sch D (should match above)</span><span>${fmtA(t.netAssetsFromD)}</span></div>
  </div>
  ${pageNavAnnual(null,'/summary')}
  </div>`;
}

// ── Part II ──────────────────────────────────────────────
function pagePart2Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  const fee=t.auditFee;
  return `<div class="schedule-page">
  <h1>Part II — Guardian Certification &amp; Audit Fee</h1>
  <div class="attestation-text">${ANNUAL_RECEIPTS_CERTIFICATION}</div>
  <div class="summary-box">
    <h2 class="subsection-heading">Audit Fee Schedule — Annual Accountings per FS 744.3678</h2>
    <div class="summary-line"><span>Estates with value of $25,000 or less</span><span>$20.00</span></div>
    <div class="summary-line"><span>From $25,000.01 up to and including $100,000</span><span>$85.00</span></div>
    <div class="summary-line"><span>From $100,000.01 up to and including $500,000</span><span>$170.00</span></div>
    <div class="summary-line"><span>In excess of $500,000</span><span>$250.00</span></div>
    <div class="summary-line total"><span>Applicable Fee — Estate value (Net Assets, Line 30): ${fmtA(t.netAssetsFromD)}</span><span><strong>${fmtA(fee)}</strong></span></div>
  </div>
  <div class="row g-2">
    <div class="col-md-4">${inpD('Starting Balance (Net Assets per Prior Report)',d.startingBalance,"D.startingBalance=this.value",true,'number',{kind:'signed-money',keepBlank:true})}</div>
    <div class="col-12">${startingBalanceNotesHTML(d,{wards:getCaseFile()?.wards||null})}</div>
  </div>
  ${pageNavAnnual('/summary','/p3')}
  </div>`;
}

// ── Part III ─────────────────────────────────────────────
function pagePart3Annual(){
  const d=getD();
  const labels=['Guardian #1','Co-Guardian #2','Co-Guardian #3'];
  let cards='';
  d.guardians.forEach((g,i)=>{
    // Guardian #1 is the filer and always stays; only co-guardians can be
    // removed, matching Guardian Inventory's D-1 page.
    const removeBtn=i===0?'':`<button type="button" class="btn btn-outline-danger btn-sm" data-annual-action="remove-row" data-collection="guardians" data-index="${i}" data-route="/p3">\u2715 Remove</button>`;
    cards+=`<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>${labels[i]}</span><span class="entry-card-actions d-flex gap-2"><button type="button" class="btn btn-outline-secondary btn-sm" data-annual-action="link-party" data-role="guardian" data-index="${i}">Link Person</button>${removeBtn}</span></div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-5">${inpD(`${labels[i]}'s Name`,g.name,`D.guardians[${i}].name=this.value`,true)}</div>
          <div class="col-md-3">${inpDWithTooltip('Signature Date','signature_date',g.signatureDate,`D.guardians[${i}].signatureDate=this.value`,signatureDateRequired({ path: `guardians.${i}`, state: g.signatureState }),'date')}</div>
          <div class="col-12">${renderSignatureStateControl({ path: `guardians.${i}`, state: g.signatureState, date: g.signatureDate, route: '/p3', signatureImage: g.signatureImage })}</div>
          <div class="col-12">${preparerFlagCheckboxHTML({ path: `guardians.${i}.isPreparer`, checked: !!g.isPreparer, route: '/p3' })}</div>
          <div class="col-md-4">${inpDWithTooltip('SSN / EIN','ssn_ein',g.ssn,`D.guardians[${i}].ssn=this.value`,true)}</div>
          <div class="col-md-4">${inpD('Phone Number',g.phone,`D.guardians[${i}].phone=this.value`,true)}</div>
          <div class="col-md-8">${inpD('Email Address',g.email,`D.guardians[${i}].email=this.value`,false,'email')}</div>
          <div class="col-md-6">${inpD('Mailing Street Address',g.mailingStreet,`D.guardians[${i}].mailingStreet=this.value`,true)}</div>
          <div class="col-md-6">${inpD('Mailing City / State / Zip',g.mailingCityStateZip,`D.guardians[${i}].mailingCityStateZip=this.value`,true)}</div>
          <div class="col-12">${renderCheckboxField({ path: `guardians.${i}.officeSameAsMailing`, id: `guardians_${i}_officeSameAsMailing`, label: 'Residence / office address same as mailing address', checked: g.officeSameAsMailing === true, route: '/p3' })}</div>
          ${g.officeSameAsMailing === true ? '' : `<div class="col-md-6">${inpD('Residence / Office Street Address',g.officeStreet,`D.guardians[${i}].officeStreet=this.value`,false)}</div>
          <div class="col-md-6">${inpD('Residence / Office City / State / Zip',g.officeCityStateZip,`D.guardians[${i}].officeCityStateZip=this.value`,false)}</div>`}
        </div>
      </div>
    </div></div>`;
  });
  const addCoBtn=d.guardians.length<3?`<button type="button" class="btn btn-outline-secondary btn-sm mb-3 no-print" data-annual-action="add-row" data-collection="guardians" data-route="/p3">+ Add Co-Guardian</button>`:'';
  return `<div class="schedule-page">
  <h1>Part III — Guardian(s) Signature &amp; Declaration</h1>
  ${preparerNoteHTML()}
  <div class="attestation-text">${ANNUAL_DECLARATION.before} <strong>${displayDate(d.periodFrom)||'—'}</strong> through <strong>${displayDate(d.periodTo)||'—'}</strong> ${ANNUAL_DECLARATION.after}</div>
  <div class="row g-3 card-grid-2col mb-3">${cards}</div>
  ${addCoBtn}
  ${pageNavAnnual('/p2','/p4')}
  </div>`;
}

// ── Part IV ──────────────────────────────────────────────
function pagePart4Annual(){
  const d=getD(); const p=d.preparer;
  const copy=filingCopy(annualDescriptor(d));
  // Milestone 67A: while a guardian (Part III) or the attorney (Part V) is
  // identified as the preparer, the outside-preparer block is neither
  // required nor filed. The page says who is named and where the box lives
  // rather than showing nothing; whatever was typed into the block stays
  // stored (section 4) and returns when the box is unticked.
  if(hasIdentifiedPreparer(d)){
    return `<div class="schedule-page">
  <h1>Part IV — Preparer Attestation</h1>
  ${preparerNoteHTML()}
  ${preparerWaivedNoticeHTML(d,{cardLocation:'Part III (the guardian card) or Part V (the attorney card)'})}
  ${pageNavAnnual('/p3','/p5')}
  </div>`;
  }
  return `<div class="schedule-page">
  <h1>Part IV — Preparer Attestation</h1>
  ${preparerNoteHTML()}
  <div class="attestation-text">${esc(copy.preparerStatement(d.wardName||'[ward]',displayDate(d.periodFrom)||'—',displayDate(d.periodTo)||'—')).replace(/\n/g,'<br>')}</div>
  <div style="color:var(--brand-text);font-size:.8rem;font-weight:700;margin-bottom:.75rem;">*** If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE. ***</div>
  <div class="row g-3 card-grid-2col">
    <div class="col-12 col-lg-6">
      <div class="entry-card mb-0 h-100">
        <div class="entry-card-header d-flex justify-content-between align-items-center gap-2">
          <span>Preparer Attestation</span>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-annual-action="link-party" data-role="preparer" data-index="0">Link Person</button>
        </div>
        <div class="entry-card-body">
          <div class="row g-2">
            <div class="col-md-5">${inpD("Preparer's Name",p.name,"D.preparer.name=this.value",true)}</div>
            <div class="col-md-3">${inpDWithTooltip("Signature Date",'signature_date',p.signatureDate,"D.preparer.signatureDate=this.value",signatureDateRequired({ path: 'preparer', state: p.signatureState }),'date')}</div>
            <div class="col-12">${renderSignatureStateControl({ path: 'preparer', state: p.signatureState, date: p.signatureDate, route: '/p4', signatureImage: p.signatureImage })}</div>
            <div class="col-md-4">${inpDWithTooltip("Preparer's SSN / EIN",'ssn_ein',p.ssn,"D.preparer.ssn=this.value",true)}</div>
            <div class="col-md-4">${inpD("Preparer's Phone Number",p.phone,"D.preparer.phone=this.value",true)}</div>
            <div class="col-md-8">${inpD("Preparer's Street Address",p.street,"D.preparer.street=this.value",true)}</div>
            <div class="col-12">${inpD("Preparer's City / State / Zip Code",p.cityStateZip,"D.preparer.cityStateZip=this.value",true)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ${pageNavAnnual('/p3','/p5')}
  </div>`;
}

// ── Live page parts (Milestone 73J part 2) ───────────────
// Each redraws itself when a change touches the paths it names
// (src/core/ui/live-parts.js), so it never shows a figure or a note from
// before the change the filer just made.
// Schedule B-4's Category Summary: the categories' totals.
defineLivePart('annual-b4-categories',{
  paths:['schB4'],
  render:(d)=>{
    const cats={};
    DISB_CATS.forEach(c=>cats[c]=0);
    (d.schB4||[]).forEach(r=>{if(r.category&&cats[r.category]!==undefined)cats[r.category]+=n(r.amount);});
    let cNum=1;
    return '<table class="doc-table mt-2"><thead><tr><th>#</th><th>Category</th><th class="right">Amount</th></tr></thead><tbody>'
      +DISB_CATS.map(c=>`<tr><td>${cNum++}</td><td>${c}</td><td class="right">${cats[c]>0?fmtA(cats[c]):'—'}</td></tr>`).join('')
      +'</tbody></table>';
  },
});
// A B-4 row's bank-account picker and its "Assign a bank account" warning.
// Named by bank AND number: two accounts at the same bank are a normal
// guardianship (an operating account and a reserve), and a picker showing
// only the bank name would make them indistinguishable at the one moment the
// filer is deciding which one the money left.
defineLivePart('annual-b4-account',{
  paths:(key)=>['schB4Accounts',`schB4.${key}.bankAccountId`],
  render:(d,key)=>{
    const i=Number(key);
    const r=(d.schB4||[])[i]||{};
    const opts=(d.schB4Accounts||[]).map((a,ai)=>({value:a.id,label:b4AccountHeading(a,ai)}));
    const known=opts.some(o=>o.value===r.bankAccountId);
    const warn=!known?'<div class="form-text text-danger">Assign a bank account — Excel export is blocked until every disbursement has one.</div>':'';
    return `${selD('Bank Account',known?r.bankAccountId:'',`D.schB4[${i}].bankAccountId=this.value`,opts,true)}${warn}`;
  },
});
// Part V's "No attorney is entered" notice, gone once an attorney is.
defineLivePart('annual-no-attorney',{
  paths:attorneyEntryPaths('annual'),
  render:(d)=>isAttorneyStarted(d,'annual')?'':`<div class="alert alert-secondary" role="status" data-no-attorney-notice>
    <strong>No attorney is entered</strong>, so this part is not required. The filed PDF prints this attestation with the attorney's signature block blank, as the Clerk's form does. If an attorney represents the guardian, enter them below and this part becomes required.
  </div>`,
});
// The cover's "Why is this guardian filing without an attorney?", gone once
// an attorney is typed -- as the question itself says it will.
defineLivePart('annual-waiver-question',{
  paths:attorneyEntryPaths('annual'),
  render:(d)=>isAttorneyStarted(d,'annual')?'':waiverBasisQuestionHTML(d,{route:'/',dateField:(path,label)=>inpD(label,d[path],`D.${path}=this.value`,false,'date')}),
});

// ── Part V ───────────────────────────────────────────────
function pagePart5Annual(){
  const d=getD();
  const copy=filingCopy(annualDescriptor(d));
  // Milestone 71B: required only once an attorney is started; the markers
  // then follow live (watchAttorneyRequiredMarkers() in mount()).
  const started=isAttorneyStarted(d,'annual');
  // Milestone 73J part 2: a live part (above), so it goes once an attorney is typed.
  const noAttorney=livePartHtml('annual-no-attorney');
  return `<div class="schedule-page">
  <h1>Part V — Guardian Attorney Signature</h1>
  ${preparerNoteHTML()}
  ${noAttorney}
  <div class="attestation-text">${esc(copy.attorneyStatement(d.wardName||'[ward]',displayDate(d.periodFrom)||'—',displayDate(d.periodTo)||'—',d.attorney_county||d.county||'[county]'))}</div>
  <div class="row g-3 card-grid-2col">
    <div class="col-12 col-lg-6">
      <div class="entry-card mb-0 h-100">
        <div class="entry-card-header d-flex justify-content-between align-items-center gap-2">
          <span>Guardian Attorney Attestation</span>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-annual-action="link-party" data-role="attorney" data-index="0">Link Person</button>
        </div>
        <div class="entry-card-body">
          <div class="row g-2">
            <div class="col-md-5">${inpD("Attorney Name (linked to Part I)",d.attorney,"D.attorney=this.value",started)}</div>
            <div class="col-md-3">${inpDWithTooltip("Signature Date",'signature_date',d.attorney_signatureDate,"D.attorney_signatureDate=this.value",signatureDateRequired({ path: 'attorney', state: d.attorney_signatureState }),'date')}</div>
            <div class="col-12">${renderSignatureStateControl({ path: 'attorney', state: d.attorney_signatureState, date: d.attorney_signatureDate, route: '/p5', signatureImage: d.attorney_signatureImage, statePath: 'attorney_signatureState', imagePath: 'attorney_signatureImage' })}</div>
            <div class="col-12">${preparerFlagCheckboxHTML({ path: 'attorney_isPreparer', checked: !!d.attorney_isPreparer, route: '/p5' })}</div>
            <div class="col-md-4">${inpD("Bar Number",d.attorney_bar,"D.attorney_bar=this.value",started)}</div>
            <div class="col-md-4">${inpD("Phone Number",d.attorney_phone,"D.attorney_phone=this.value",started)}</div>
            <div class="col-md-4">${inpD("Primary Email (e-filing)",d.attorney_email,"D.attorney_email=this.value",started,'email')}</div>
            <div class="col-md-4">${inpD("Secondary Email (optional)",d.attorney_secondaryEmail,"D.attorney_secondaryEmail=this.value",false,'email')}</div>
            <div class="col-md-8">${inpD("Street Address",d.attorney_street,"D.attorney_street=this.value",started)}</div>
            <div class="col-md-8">${inpD("City / State / Zip Code",d.attorney_cityStateZip,"D.attorney_cityStateZip=this.value",started)}</div>
            <div class="col-md-4">${countyInputD("County",d.attorney_county,"D.attorney_county=this.value")}</div>
          </div>
        </div>
      </div>
    </div>
  ${pageNavAnnual('/p4','/scha')}
  </div>`;
}

function entryCardHeaderAnnual(title, collection, idx, route) {
  return `<div class="entry-card-header">
    <span>${title}</span>
    <span class="entry-card-actions">
      <button class="btn btn-sm btn-outline-secondary" title="Add a copy of this line below" data-annual-action="duplicate-row" data-collection="${collection}" data-index="${idx}" data-route="${route}">${ic('copy',13)} Duplicate</button>
      <button class="btn btn-sm btn-outline-danger" data-annual-action="remove-row" data-collection="${collection}" data-index="${idx}" data-route="${route}">✕ Remove</button>
    </span>
  </div>`;
}

function scheduleEmptyHTMLAnnual(key, noun, collectionKey, customLabel = null) {
  const checked = !!(getD() && getD().scheduleNoItems && getD().scheduleNoItems[key]);
  return `<div class="schedule-empty">
    <label class="schedule-empty-check">
      <input type="checkbox" ${checked ? 'checked' : ''} data-annual-change="schedule-no-items" data-schedule="${key}" ${collectionKey ? `data-collection="${collectionKey}"` : ''}>
      <span>${customLabel || `I verify there are no ${noun} to report for this schedule.`}</span>
    </label>
  </div>`;
}

// ── Schedule A — Income ──────────────────────────────────
function pageSchAAnnual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schA && d.schA.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schA.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schA',i,'/scha')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4">${inpD('Income Source / Payer',r.payer,`D.schA[${i}].payer=this.value`,true)}</div>
        <div class="col-md-4">${inpD('Description',r.description,`D.schA[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Bank Name',r.bank,`D.schA[${i}].bank=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schA[${i}].accountNo=this.value`,true)}</div>
        <div class="col-md-3">${inpD("Ward's Income Amount ",r.amount,`D.schA[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('scha','income receipts','schA');
  }
  return `<div class="schedule-page">
  <h1>Schedule A — Income Received During Period</h1>
  <div class="schedule-instructions">Include all types of income such as SSI, Retirement, Disability benefits, interest or rental income. Do NOT include receipts from sale/disposal of principal assets (those go in Schedule C).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schA" data-route="/scha">+ Add Income Line</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule A Total — Income/Receipts Received During Period</div><div class="td" data-annual-total="schA">${fmtA(t.schA)}</div></div></div></div>
  ${renderScheduleDocsSection('schA')}
  ${pageNavAnnual('/p5','/schb1')}
  </div>`;
}

// ── Schedule B-1 — Attorney Fees ─────────────────────────
function pageSchB1Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schB1 && d.schB1.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schB1.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schB1',i,'/schb1')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-3">${inpD('Bank Account #',r.bankAcct,`D.schB1[${i}].bankAcct=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB1[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Period From',r.periodFrom,`D.schB1[${i}].periodFrom=this.value`,false,'date')}</div>
        <div class="col-md-2">${inpD('Period To',r.periodTo,`D.schB1[${i}].periodTo=this.value`,false,'date')}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB1[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-4">${inpD('Payee',r.payee,`D.schB1[${i}].payee=this.value`,true)}</div>
        <div class="col-md-3">${inpD('Court Order Date',r.courtOrderDate,`D.schB1[${i}].courtOrderDate=this.value`,false,'date')}</div>
        <div class="col-md-3">${inpD('Amount',r.amount,`D.schB1[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schb1','attorney fees and costs','schB1');
  }
  return `<div class="schedule-page">
  <h1>Schedule B-1 — Attorney Fees and Costs</h1>
  <div class="schedule-instructions">Bank Account Number = The Financial Institution's Account Number (NOT its Routing Number).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schB1" data-route="/schb1">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule B-1 Total — Attorney Fees and Costs</div><div class="td" data-annual-total="schB1">${fmtA(t.schB1)}</div></div></div></div>
  ${renderScheduleDocsSection('schB1')}
  ${pageNavAnnual('/scha','/schb2')}
  </div>`;
}

// ── Schedule B-2 — Guardian Fees ─────────────────────────
function pageSchB2Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schB2 && d.schB2.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schB2.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schB2',i,'/schb2')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-3">${inpD('Bank Account #',r.bankAcct,`D.schB2[${i}].bankAcct=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB2[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Period From',r.periodFrom,`D.schB2[${i}].periodFrom=this.value`,false,'date')}</div>
        <div class="col-md-2">${inpD('Period To',r.periodTo,`D.schB2[${i}].periodTo=this.value`,false,'date')}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB2[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-4">${inpD('Payee',r.payee,`D.schB2[${i}].payee=this.value`,true)}</div>
        <div class="col-md-3">${inpD('Court Order Date',r.courtOrderDate,`D.schB2[${i}].courtOrderDate=this.value`,false,'date')}</div>
        <div class="col-md-3">${inpD('Amount',r.amount,`D.schB2[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schb2','guardian fees and costs','schB2');
  }
  return `<div class="schedule-page">
  <h1>Schedule B-2 — Guardian Fees and Costs</h1>
  <div class="schedule-instructions">Bank Account Number = The Financial Institution's Account Number (NOT its Routing Number).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schB2" data-route="/schb2">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule B-2 Total — Guardian Fees and Costs</div><div class="td" data-annual-total="schB2">${fmtA(t.schB2)}</div></div></div></div>
  ${renderScheduleDocsSection('schB2')}
  ${pageNavAnnual('/schb1','/schb3')}
  </div>`;
}

// ── Schedule B-3 — Other Court-Ordered Disbursements ─────
function pageSchB3Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schB3 && d.schB3.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schB3.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schB3',i,'/schb3')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-3">${inpD('Bank Account #',r.bankAcct,`D.schB3[${i}].bankAcct=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB3[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB3[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-5">${inpD('Payee',r.payee,`D.schB3[${i}].payee=this.value`,true)}</div>
        <div class="col-md-3">${inpD('Court Order Date',r.courtOrderDate,`D.schB3[${i}].courtOrderDate=this.value`,false,'date')}</div>
        <div class="col-md-3">${inpD('Amount',r.amount,`D.schB3[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schb3','court-ordered disbursements','schB3');
  }
  return `<div class="schedule-page">
  <h1>Schedule B-3 — Other Court-Ordered Disbursements</h1>
  <div class="schedule-instructions">Bank Account Number = The Financial Institution's Account Number (NOT its Routing Number).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schB3" data-route="/schb3">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule B-3 Total — Other Court-Ordered Disbursements</div><div class="td" data-annual-total="schB3">${fmtA(t.schB3)}</div></div></div></div>
  ${renderScheduleDocsSection('schB3')}
  ${pageNavAnnual('/schb2','/schb4')}
  </div>`;
}

// ── Schedule B-4 — Other Disbursements ───────────────────
function pageSchB4Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  const accounts=Array.isArray(d.schB4Accounts)?d.schB4Accounts:[];
  // The account picker only appears once accounts exist: a single-account
  // filing has nothing to choose between, and showing an empty dropdown on
  // every row would imply an assignment is missing when none is required.
  // Milestone 73J part 2: a live part, so naming an account relabels every
  // row's picker and assigning one clears its warning, without a redraw.
  const accountPicker=(r,i)=>accounts.length?livePartHtml('annual-b4-account',{key:i,className:'col-md-4'}):'';
  const accountCards=accounts.map((a,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
    <div class="entry-card-header"><span>Bank Account ${i+1}</span>
      <button class="btn btn-link btn-sm text-danger p-0" data-annual-action="remove-b4-account" data-index="${i}" data-route="/schb4">Remove</button>
    </div>
    <div class="entry-card-body"><div class="row g-2">
      <div class="col-md-7">${inpD('Bank Name',a.bankName,`D.schB4Accounts[${i}].bankName=this.value`,true)}</div>
      <div class="col-md-5">${inpD('Account Number',a.accountNumber,`D.schB4Accounts[${i}].accountNumber=this.value`,true)}</div>
    </div></div>
  </div></div>`).join('');
  const accountsSection=`<div class="summary-box mb-3">
    <h2 class="subsection-heading">Bank Accounts</h2>
    <div class="schedule-instructions">The court's workbook prints each bank account's disbursements in its own section, under that account's name and number. Add an account for each one the ward's money was paid from, then assign every disbursement below. Filings paid from a single account can leave this empty. The workbook holds ${SCH_B4_MAX_ACCOUNTS}; the PDF is not limited.</div>
    ${accounts.length?`<div class="row g-3 schedule-entry-grid">${accountCards}</div>`:''}
    <button class="btn btn-outline-primary btn-sm mt-2" data-annual-action="add-b4-account" data-route="/schb4">+ Add Bank Account</button>
  </div>`;
  let rows='';
  if(d.schB4 && d.schB4.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schB4.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schB4',i,'/schb4')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB4[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB4[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-3">${selD('Category',r.category,`D.schB4[${i}].category=this.value`,DISB_CATS,true)}</div>
        <div class="col-md-3">${inpD('Payee',r.payee,`D.schB4[${i}].payee=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Amount',r.amount,`D.schB4[${i}].amount=this.value`,true,'number')}</div>
        ${accountPicker(r,i)}
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schb4','other disbursements','schB4');
  }
  return `<div class="schedule-page">
  <h1>Schedule B-4 — All Other Disbursements</h1>
  <div class="schedule-instructions">Receipts, checks, and substantiating papers need not be filed with the court but shall be made available for inspection. List disbursements in check number order. If category is "Other," provide details in payee field.</div>
  ${accountsSection}
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schB4" data-route="/schb4">+ Add Entry</button>
  <div class="schedule-totals mb-2"><div class="tbl"><div class="tr"><div class="td">Schedule B-4 Total — All Other Disbursements</div><div class="td" data-annual-total="schB4">${fmtA(t.schB4)}</div></div></div></div>
  <div class="summary-box"><h2 class="subsection-heading">Category Summary</h2>${livePartHtml('annual-b4-categories')}</div>
  ${renderScheduleDocsSection('schB4')}
  ${pageNavAnnual('/schb3','/schc')}
  </div>`;
}

// ── Schedule C — Capital Adjustments ─────────────────────
// Milestone 72E: the Loss / Reduction box is a signed amount, so it asks for
// inputmode="text" -- a phone's "decimal" keypad has no minus key -- as the
// shared field builder already does for every signed kind.
// Milestone 73G part 2: it is drawn by that builder now (it was written out
// by hand). Neither Gain nor Loss is starred (the requester, 2026-10-08):
// neither is required on its own -- the rule is "Gain or Loss", which the
// export check asks for. A positive loss gets a note beside it
// (sign-advisories.js).
function pageSchCAnnual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schC && d.schC.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schC.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schC',i,'/schc')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-5">${inpD('Full Description and Identification',r.description,`D.schC[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Date of Adjustment',r.date,`D.schC[${i}].date=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Gain / Addition',r.gain,`D.schC[${i}].gain=this.value`,false,'number')}</div>
        <div class="col-md-3">${inpD('Loss / Reduction (enter as negative)',r.loss,`D.schC[${i}].loss=this.value`,false,'number',{kind:'signed-money'})}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schc','capital transactions or adjustments','schC');
  }
  return `<div class="schedule-page">
  <h1>Schedule C — Capital Adjustments During Period</h1>
  <div class="schedule-instructions">Include gains/losses in asset values, newly discovered assets, purchases of real estate/personal/intangible assets. Losses must be entered as negative numbers. Real estate sales should also appear in Schedule F-1.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schC" data-route="/schc">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Total Gains / Additions</div><div class="td" data-annual-total="schC_gains">${fmtA(t.schC_gains)}</div></div>
    <div class="tr"><div class="td">Total Losses / Reductions</div><div class="td" data-annual-total="schC_losses">${fmtA(t.schC_losses)}</div></div>
    <div class="tr"><div class="td"><strong>Net Capital Adjustments</strong></div><div class="td"><strong data-annual-total="schC_net">${fmtA(t.schC_net)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schC')}
  ${pageNavAnnual('/schb4','/schd1')}
  </div>`;
}

// ── Schedule D-1 — Cash Assets ───────────────────────────
function pageSchD1Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schD1 && d.schD1.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schD1.map((r,i)=>{
      const wardAmt=n(r.fullAmount)*pct(r.wardPct);
      return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
        ${entryCardHeaderAnnual(`Line ${i+1} — ${r.description||'(no description)'}`,'schD1',i,'/schd1')}
        <div class="entry-card-body"><div class="row g-2">
          <div class="col-md-4">${inpD('Description (Bank, account type)',r.description,`D.schD1[${i}].description=this.value`,true)}</div>
          <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schD1[${i}].accountNo=this.value`,true)}</div>
          <div class="col-md-2">${yesNoRadioAnnualHTML(`schD1_restricted_${i}`,'Restricted?',r.restricted,`schD1.${i}.restricted`,true,'restricted')}</div>
          <div class="col-md-2">${inpD('Type (CD, Checking…)',r.type,`D.schD1[${i}].type=this.value`,true)}</div>
          <div class="col-md-2">${inpD('Full Asset Amount',r.fullAmount,`D.schD1[${i}].fullAmount=this.value`,true,'number')}</div>
          <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD1[${i}].wardPct=this.value`,true,'number','percent')}</div>
          <div class="col-md-2"><label class="form-label">Ward's Amount</label><input class="form-control" readonly value="${fmtAnnual(wardAmt)}" data-annual-calc="schD1.${i}.wardAmt"></div>
        </div></div>
      </div></div>`;
    }).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schd1','cash or bank account assets','schD1');
  }
  return `<div class="schedule-page">
  <h1>Schedule D-1 — Cash Assets</h1>
  <div class="schedule-instructions">Include all liquid assets: cash on hand, savings, checking, CDs, money market, attorney trust, patient trust, burial savings. List each account separately. Enter Ward's % as a number from 0 to 100: 100 if the ward owns the whole account, 50 for half.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schD1" data-route="/schd1">+ Add Account</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Cash Assets in Restricted Depository</div><div class="td" data-annual-total="schD1_restricted">${fmtA(t.schD1_restricted)}</div></div>
    <div class="tr"><div class="td"><strong>Total Cash Assets (Ward's Amount)</strong></div><div class="td"><strong data-annual-total="schD1_total">${fmtA(t.schD1_total)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD1')}
  ${pageNavAnnual('/schc','/schd2')}
  </div>`;
}

// ── Schedule D-2 — Real Estate ───────────────────────────
function pageSchD2Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schD2 && d.schD2.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schD2.map((r,i)=>{
      const wardVal=n(r.fullValue)*pct(r.wardPct);
      return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
        ${entryCardHeaderAnnual(`Line ${i+1}`,'schD2',i,'/schd2')}
        <div class="entry-card-body"><div class="row g-2">
          <div class="col-md-6">${inpD('Description / Address / Owners',r.description,`D.schD2[${i}].description=this.value`,true)}</div>
          <div class="col-md-2">${yesNoRadioAnnualHTML(`schD2_residence_${i}`,'Personal Residence?',r.residence,`schD2.${i}.residence`,true,'personal_residence')}</div>
          <div class="col-md-2">${yesNoRadioAnnualHTML(`schD2_income_${i}`,'Income Property?',r.income,`schD2.${i}.income`,true,'income_property')}</div>
          <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD2[${i}].wardPct=this.value`,true,'number','percent')}</div>
          <div class="col-md-3">${inpD('Full Asset Value',r.fullValue,`D.schD2[${i}].fullValue=this.value`,true,'number')}</div>
          <div class="col-md-3">${inpDWithTooltip('Carrying Value','carrying_value',r.carryingValue,`D.schD2[${i}].carryingValue=this.value`,true,'number')}</div>
          <div class="col-md-3"><label class="form-label">Ward's Value of Ownership</label><input class="form-control" readonly value="${fmtAnnual(wardVal)}" data-annual-calc="schD2.${i}.wardVal"></div>
        </div></div>
      </div></div>`;
    }).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schd2','real estate properties','schD2');
  }
  return `<div class="schedule-page">
  <h1>Schedule D-2 — Real Estate and Real Property Assets</h1>
  <div class="schedule-instructions">Include full description, address, all other owners and their relationship to the ward. Values must be as of Ward's Fiscal Year-End.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schD2" data-route="/schd2">+ Add Property</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Carrying Value Total</div><div class="td" data-annual-total="schD2_carrying">${fmtA(t.schD2_carrying)}</div></div>
    <div class="tr"><div class="td"><strong>Total Ward's Value of Ownership</strong></div><div class="td"><strong data-annual-total="schD2_ward">${fmtA(t.schD2_ward)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD2')}
  ${pageNavAnnual('/schd1','/schd3')}
  </div>`;
}

// ── Schedule D-3 — Personal Property ─────────────────────
function pageSchD3Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schD3 && d.schD3.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schD3.map((r,i)=>{
      const wardAmt=n(r.fullAmount)*pct(r.wardPct);
      return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
        ${entryCardHeaderAnnual(`Line ${i+1}`,'schD3',i,'/schd3')}
        <div class="entry-card-body"><div class="row g-2">
          <div class="col-md-6">${inpD('Description / Location / Owners',r.description,`D.schD3[${i}].description=this.value`,true)}</div>
          <div class="col-md-2">${inpD('Full Asset Amount',r.fullAmount,`D.schD3[${i}].fullAmount=this.value`,true,'number')}</div>
          <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD3[${i}].wardPct=this.value`,true,'number','percent')}</div>
          <div class="col-md-2">${inpDWithTooltip('Carrying Value','carrying_value',r.carryingValue,`D.schD3[${i}].carryingValue=this.value`,true,'number')}</div>
          <div class="col-md-2"><label class="form-label">Ward's Amount</label><input class="form-control" readonly value="${fmtAnnual(wardAmt)}" data-annual-calc="schD3.${i}.wardAmt"></div>
        </div></div>
      </div></div>`;
    }).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schd3','personal property assets','schD3');
  }
  return `<div class="schedule-page">
  <h1>Schedule D-3 — Personal Property Assets</h1>
  <div class="schedule-instructions">Include vehicles, clothing, furniture, electronics, jewelry, burial/cemetery plot. All values must be Fair Market Value as of end of Reporting Period. If no personal property, attach explanation.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schD3" data-route="/schd3">+ Add Property</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Carrying Value Total</div><div class="td" data-annual-total="schD3_carrying">${fmtA(t.schD3_carrying)}</div></div>
    <div class="tr"><div class="td"><strong>Ward's Amount Total</strong></div><div class="td"><strong data-annual-total="schD3_ward">${fmtA(t.schD3_ward)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD3')}
  ${pageNavAnnual('/schd2','/schd4')}
  </div>`;
}

// ── Schedule D-4 — Intangible Assets ─────────────────────
function pageSchD4Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schD4 && d.schD4.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schD4.map((r,i)=>{
      const wardVal=n(r.fullAmount)*pct(r.wardPct);
      return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
        ${entryCardHeaderAnnual(`Line ${i+1}`,'schD4',i,'/schd4')}
        <div class="entry-card-body"><div class="row g-2">
          <div class="col-md-5">${inpD('Description (stocks, annuities, policies, notes…)',r.description,`D.schD4[${i}].description=this.value`,true)}</div>
          <div class="col-md-2">${yesNoRadioAnnualHTML(`schD4_restricted_${i}`,'Restricted?',r.restricted,`schD4.${i}.restricted`,true,'restricted')}</div>
          <div class="col-md-2">${inpD('Full Asset Amount',r.fullAmount,`D.schD4[${i}].fullAmount=this.value`,true,'number')}</div>
          <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD4[${i}].wardPct=this.value`,true,'number','percent')}</div>
          <div class="col-md-2">${inpDWithTooltip('Carrying Value','carrying_value',r.carryingValue,`D.schD4[${i}].carryingValue=this.value`,true,'number')}</div>
          <div class="col-md-2"><label class="form-label">Ward's Value of Ownership</label><input class="form-control" readonly value="${fmtAnnual(wardVal)}" data-annual-calc="schD4.${i}.wardVal"></div>
        </div></div>
      </div></div>`;
    }).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schd4','intangible assets','schD4');
  }
  return `<div class="schedule-page">
  <h1>Schedule D-4 — Intangible Assets</h1>
  <div class="schedule-instructions">Intangibles are assets not physical and not liquid without a Court Order: brokerage accounts, stocks, annuities, prepaid funeral contracts, insurance policies that add value, promissory notes owed to the ward. Attach copies of all statements.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schD4" data-route="/schd4">+ Add Asset</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Restricted Intangible Assets</div><div class="td" data-annual-total="schD4_restricted">${fmtA(t.schD4_restricted)}</div></div>
    <div class="tr"><div class="td">Carrying Value Total</div><div class="td" data-annual-total="schD4_carrying">${fmtA(t.schD4_carrying)}</div></div>
    <div class="tr"><div class="td"><strong>Total Ward's Value of Ownership</strong></div><div class="td"><strong data-annual-total="schD4_ward">${fmtA(t.schD4_ward)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD4')}
  ${pageNavAnnual('/schd3','/schd5')}
  </div>`;
}

// ── Schedule D-5 — Liabilities ───────────────────────────
function pageSchD5Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schD5 && d.schD5.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schD5.map((r,i)=>{
      const wardBal=n(r.fullDebt)*pct(r.wardPct);
      return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
        ${entryCardHeaderAnnual(`Line ${i+1}`,'schD5',i,'/schd5')}
        <div class="entry-card-body"><div class="row g-2">
          <div class="col-md-4">${inpD('Description / Lender / Related Asset',r.description,`D.schD5[${i}].description=this.value`,true)}</div>
          <div class="col-md-2">${inpD('Loan / Account #',r.loanNo,`D.schD5[${i}].loanNo=this.value`,true)}</div>
          <div class="col-md-2"><label class="form-label" for="schD5_loanType_${i}">Type (M/N/L/O) <span class="req">*</span></label><select class="form-select" id="schD5_loanType_${i}" data-annual-path="schD5.${i}.loanType"><option value="">—</option>${LIAB_TYPES.map(lt=>`<option value="${lt}" ${r.loanType===lt?'selected':''}>${lt}</option>`).join('')}</select></div>
          <div class="col-md-2">${inpDWithTooltip('Full Debt Amount','full_debt',r.fullDebt,`D.schD5[${i}].fullDebt=this.value`,true,'number')}</div>
          <div class="col-md-2">${inpDWithTooltip("Ward's %",'ward_pct',r.wardPct,`D.schD5[${i}].wardPct=this.value`,true,'number','percent')}</div>
          <div class="col-md-2"><label class="form-label">Ward's Balance Due</label><input class="form-control" readonly value="${fmtAnnual(wardBal)}" data-annual-calc="schD5.${i}.wardBal"></div>
        </div></div>
      </div></div>`;
    }).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schd5','liabilities or debts','schD5');
  }
  return `<div class="schedule-page">
  <h1>Schedule D-5 — Mortgages / Loans / Notes / Other Liabilities</h1>
  <div class="schedule-instructions">Include mortgages, second mortgages, judgment liens, tax liens, credit cards, vehicle loans, unpaid medical/facility bills, promissory notes. Type: M=Mortgage, N=Note, L=Loan, O=Other.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schD5" data-route="/schd5">+ Add Liability</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td"><strong>Schedule D-5 Total — Ward's Balance Due</strong></div><div class="td"><strong data-annual-total="schD5_total">${fmtA(t.schD5_total)}</strong></div></div></div></div>
  ${renderScheduleDocsSection('schD5')}
  ${pageNavAnnual('/schd4','/sche')}
  </div>`;
}

// ── Schedule E — Bank Transfers ──────────────────────────
// Milestone 72E: the Transfer Out Amt box is a signed amount, so it asks for
// inputmode="text" -- a phone's "decimal" keypad has no minus key -- as the
// shared field builder already does for every signed kind.
// Milestone 73G part 2: drawn by that builder now (it was written out by
// hand); a positive transfer out gets a note beside it (sign-advisories.js).
function pageSchEAnnual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schE && d.schE.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schE.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schE',i,'/sche')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4">${inpD('Bank Name / Account #',r.bankName,`D.schE[${i}].bankName=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Transfer In Date',r.transferInDate,`D.schE[${i}].transferInDate=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Transfer In Amount',r.transferInAmt,`D.schE[${i}].transferInAmt=this.value`,true,'number')}</div>
        <div class="col-md-2">${inpD('Transfer Out Date',r.transferOutDate,`D.schE[${i}].transferOutDate=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Transfer Out Amount (enter as negative)',r.transferOutAmt,`D.schE[${i}].transferOutAmt=this.value`,false,'number',{kind:'signed-money'})}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('sche','inter-account transfers','schE');
  }
  return `<div class="schedule-page">
  <h1>Schedule E — Bank Transfers During Period</h1>
  <div class="schedule-instructions">Each transfer should be listed twice — once going out and again going into another account. Transfers out should be entered as negative numbers.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schE" data-route="/sche">+ Add Transfer</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Total Transfers In</div><div class="td" data-annual-total="schE_in">${fmtA(t.schE_in)}</div></div>
    <div class="tr"><div class="td">Total Transfers Out</div><div class="td" data-annual-total="schE_out">${fmtA(t.schE_out)}</div></div>
  </div></div>
  ${renderScheduleDocsSection('schE')}
  ${pageNavAnnual('/schd5','/schf1')}
  </div>`;
}

// ── Schedule F-1 — Sales of Real Property ────────────────
function pageSchF1Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schF1 && d.schF1.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schF1.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Sale ${i+1}`,'schF1',i,'/schf1')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-5">${inpD('Description of Sale / Address / Parties',r.description,`D.schF1[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Bank',r.bank,`D.schF1[${i}].bank=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schF1[${i}].accountNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Court Order Date',r.courtOrderDate,`D.schF1[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Sale Price',r.salePrice,`D.schF1[${i}].salePrice=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schf1','real property sales','schF1');
  }
  return `<div class="schedule-page">
  <h1>Schedule F-1 — Sales of Real Property During Period</h1>
  <div class="schedule-instructions">Attach a copy of the closing statement. Gains or losses from the sale should also be noted in Schedule C. Provide the court order date approving the sale.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schF1" data-route="/schf1">+ Add Sale</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule F-1 Total — Sales of Real Property</div><div class="td" data-annual-total="schF1">${fmtA(t.schF1)}</div></div></div></div>
  ${renderScheduleDocsSection('schF1')}
  ${pageNavAnnual('/sche','/schf2')}
  </div>`;
}

// ── Schedule F-2 — Sales of Personal Property ────────────
function pageSchF2Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  let rows='';
  if(d.schF2 && d.schF2.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schF2.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Sale ${i+1}`,'schF2',i,'/schf2')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-5">${inpD('Description of Sale / Purchaser / Agent',r.description,`D.schF2[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Bank',r.bank,`D.schF2[${i}].bank=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schF2[${i}].accountNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Court Order Date',r.courtOrderDate,`D.schF2[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Sale Price',r.salePrice,`D.schF2[${i}].salePrice=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schf2','personal property sales','schF2');
  }
  return `<div class="schedule-page">
  <h1>Schedule F-2 — Sales of Personal Property During Period</h1>
  <div class="schedule-instructions">Gains or losses from the sale of personal property should also be noted in Schedule C. Attach proof of proceeds deposited.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schF2" data-route="/schf2">+ Add Sale</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule F-2 Total — Sales of Personal Property</div><div class="td" data-annual-total="schF2">${fmtA(t.schF2)}</div></div></div></div>
  ${renderScheduleDocsSection('schF2')}
  ${pageNavAnnual('/schf1','/p67')}
  </div>`;
}

// ── Parts VI & VII — Summary ──────────────────────────────
function pagePart67Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  return `<div class="schedule-page">
  <h1>Parts VI &amp; VII — Summary</h1>
  <div class="schedule-instructions">This page is auto-calculated from all schedules. Net Assets from Changes (Part VI, below) should equal Net Assets from Balances (Part VII, below). If they differ, verify individual schedules.</div>
  <div class="summary-box">
    <h2 class="subsection-heading">Part VI — Changes in Net Assets</h2>
    <div class="summary-line"><span>Starting Balance (Net Assets per Prior Report)</span><span>${fmtA(d.startingBalance)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/scha">Schedule A — Income/Receipts</a></span><span>${fmtA(t.schA)}</span></div>
    <div style="padding:.1rem 0;font-size:.75rem;color:var(--ink-3);font-style:italic;">Disbursements:</div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schb1">Schedule B-1 — Attorney Fees</a></span><span>${fmtA(-t.schB1)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schb2">Schedule B-2 — Guardian Fees</a></span><span>${fmtA(-t.schB2)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schb3">Schedule B-3 — Court-Ordered Disb.</a></span><span>${fmtA(-t.schB3)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schb4">Schedule B-4 — All Other Disb.</a></span><span>${fmtA(-t.schB4)}</span></div>
    <div class="summary-line total"><span>Total Disbursements</span><span>${fmtA(-t.totalDisb)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schc">Schedule C — Capital Adj. Net</a></span><span>${fmtA(t.schC_net)}</span></div>
    <div class="summary-line grand"><span>Line 20 — Net Assets at End of Period</span><span>${fmtA(t.netAssets)}</span></div>
  </div>
  <div class="summary-box">
    <h2 class="subsection-heading">Part VII — Assets &amp; Liabilities at End of Period</h2>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schd1">Schedule D-1 — Cash Assets</a></span><span>${fmtA(t.schD1_total)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schd2">Schedule D-2 — Real Estate (Ward's Value of Ownership)</a></span><span>${fmtA(t.schD2_ward)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schd3">Schedule D-3 — Personal Property (Ward's Amount)</a></span><span>${fmtA(t.schD3_ward)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schd4">Schedule D-4 — Intangibles (Ward's Value of Ownership)</a></span><span>${fmtA(t.schD4_ward)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schd5">Schedule D-5 — Liabilities (Ward's Balance)</a></span><span>${fmtA(-t.schD5_total)}</span></div>
    <div class="summary-line grand"><span>Line 30 — Net Assets at End of Period</span><span>${fmtA(t.netAssetsFromD)}</span></div>
  </div>
  ${reconcileBlockAnnual(t)}
  ${pageNavAnnual('/schf2','/p8')}
  </div>`;
}

// The reconciliation panel on Parts VI & VII. When the two lines agree it
// simply confirms that. When they don't, it states the difference and
// requires a written explanation — that text is carried onto the exported
// document, so the discrepancy is disclosed rather than hidden.
function reconcileBlockAnnual(t){
  const st=annualReconcileState(t);
  if(!st.outOfBalance){
    return `<div class="alert alert-success mt-2" style="font-size:.8rem;">&#10003; Net Assets from Changes, ${fmtA(t.netAssets)}, equals Net Assets from Balances, ${fmtA(t.netAssetsFromD)} — the accounting balances.</div>`;
  }
  return `<div class="alert alert-warning mt-2" style="font-size:.8rem;">
    &#9888; <strong>Net Assets from Changes, ${fmtA(t.netAssets)}, does not equal Net Assets from Balances, ${fmtA(t.netAssetsFromD)}.</strong>
    Difference: ${fmtA(st.diff)}.
    Check your schedules first — most differences are a missing or mistyped entry.
    If the difference is correct as filed, explain it below; an explanation is required before you can export.
  </div>
  <div class="summary-box">
    <h2 class="subsection-heading" id="reconcile-explanation-heading">Explanation of Difference<span class="req">*</span></h2>
    <textarea class="form-control" rows="4" id="reconcile-explanation" aria-labelledby="reconcile-explanation-heading"
      placeholder="Explain why Net Assets from Changes and Net Assets from Balances differ (for example: a correcting entry from a prior period, or an asset discovered after the period closed)."
      data-annual-path="reconcileExplanation"
      >${esc(st.explanation)}</textarea>
    <div style="font-size:.78rem;color:var(--ink-3);margin-top:.35rem;" data-explanation-where>This explanation prints on the PDF. The court's Excel workbook has no box for it: file the PDF, or file the explanation separately.</div>
  </div>`;
}

// ── Part VIII — Trusts ────────────────────────────────────
function pagePart8Annual(){
  const d=getD();
  const hasTrusts=d.trusts && d.trusts[0] && d.trusts[0].hasTrust==='Yes';
  let cards='';
  if(hasTrusts){
    ['Trust 1','Trust 2','Trust 3'].forEach((label,i)=>{
      const t=d.trusts[i] || {};
      cards+=`<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
        <div class="entry-card-header"><span>${label}</span></div>
        <div class="entry-card-body">
          <div class="row g-2">
            <div class="col-md-4">${yesNoCheckboxD(`Was ${label} created after the GID?`,t.createdAfterGID,`trusts.${i}.createdAfterGID`)}</div>
            <div class="col-md-4">${inpD('Name of the Trust',t.name,`D.trusts[${i}].name=this.value`,true)}</div>
            <div class="col-md-4">${inpD('Name of the Trustee',t.trustee,`D.trusts[${i}].trustee=this.value`,true)}</div>
            <div class="col-md-4">${inpD('Trustee Account Number',t.accountNo,`D.trusts[${i}].accountNo=this.value`,true)}</div>
            <div class="col-md-4">${inpD('Date Trust Created',t.dateCreated,`D.trusts[${i}].dateCreated=this.value`,true,'date')}</div>
            <div class="col-md-4">${inpD('Type of Trust',t.trustType,`D.trusts[${i}].trustType=this.value`,true)}</div>
            <div class="col-md-4">${inpDWithTooltip("Ward's %",'ward_pct',t.wardPct,`D.trusts[${i}].wardPct=this.value`,false,'number','percent')}</div>
            <div class="col-md-8">${inpD('Amount (Ward\'s Interest)',t.wardAmount,`D.trusts[${i}].wardAmount=this.value`,false,'number')}</div>
          </div>
        </div>
      </div></div>`;
    });
  }
  return `<div class="schedule-page">
  <h1>Part VIII — Trust Information</h1>
  <div class="schedule-instructions">If a trust was created after the Guardianship Inception Date, you MUST file a separate trust accounting for that trust.</div>
  <div class="row g-2 mb-3">
    <div class="col-md-6">${yesNoRadioHTML('trusts.0.hasTrust','#1. Does the Ward have one or more Trusts?',d.trusts?.[0]?.hasTrust||'','trusts.0.hasTrust',true,'/p8')}</div>
  </div>
  ${/* Milestone 73F part 3 (decision 73F-5): question #1 answers Part VIII;
      the separate "I certify there are no trusts" box, which completed nothing
      since 73F part 2, is gone. A tick saved before is left in the filing, unread. */''}
  ${hasTrusts ? `<div class="row g-3 schedule-entry-grid">${cards}</div>` : ''}
  ${pageNavAnnual('/p67','/p9')}
  </div>`;
}

// ── Part IX — Other Info / Bond ───────────────────────────
function pagePart9Annual(){
  const d=getD(); const t=calcTotalsAnnual();
  return `<div class="schedule-page">
  <h1>Part IX — Other Information &amp; Bond Calculation</h1>
  <div class="row g-3">
    <div class="col-12 col-lg-6">
      <div class="summary-box h-100 mb-0">
        <h2 class="subsection-heading">Bond Calculation (auto-calculated)</h2>
        <div class="summary-line"><span>Sch D-1 — Cash Assets in Restricted Depository</span><span>${fmtA(t.schD1_restricted)}</span></div>
        <div class="summary-line"><span>Sch D-4 — Intangible Assets RESTRICTED</span><span>${fmtA(t.schD4_restricted)}</span></div>
        <div class="summary-line"><span>Sch D-1 — Cash Assets NOT in Restricted Depository</span><span>${fmtA(t.schD1_total-t.schD1_restricted)}</span></div>
        <div class="summary-line"><span>Sch D-3 — Personal Property Assets</span><span>${fmtA(t.schD3_ward)}</span></div>
        <div class="summary-line"><span>Sch D-4 — Intangible Assets (Unrestricted)</span><span>${fmtA(t.schD4_ward-t.schD4_restricted)}</span></div>
        <div class="summary-line total"><span>Total for BOND REQUIREMENT</span><span>${fmtA(t.bondReq)}</span></div>
      </div>
    </div>
    <div class="col-12 col-lg-6">
      <div class="summary-box h-100 mb-0">
        <h2 class="subsection-heading">Surety Bond &amp; Guardian Info</h2>
        <div class="row g-2 mb-2">
          <div class="col-md-6">${selD("Guardian's Relationship to Ward",d.guardianRelationship,"D.guardianRelationship=this.value",GUARDIAN_REL)}</div>
        </div>
        ${(()=>{
          // Milestone 67B: one four-state question replaces "Restricted
          // depository?", and each state reveals only the fields it needs --
          // none of them required. Nothing in this block gates export; the
          // print preview warns instead, and the sidebar asks. The per-row
          // Restricted? flags on D-1/D-4 still feed the bond calculation at
          // left; this records the arrangement only. Routed (67F) so the
          // reveal appears on the click.
          const state=inferBondDepositoryState(d);
          return `<div class="row g-2 mb-2"><div class="col-12">${renderRadioGroupField({ path:'bondDepositoryState', id:'bondDepositoryState', label:BOND_DEPOSITORY_QUESTION, value:state, options:BOND_DEPOSITORY_OPTIONS, hint:'Not required to file. Each answer shows only the fields it needs.', route:'/p9' })}</div></div>
        <div class="row g-2">
          ${revealsDepository(state)?`<div class="col-md-6">${inpD('Date of Most Recent Receipt',d.restrictedDepositoryReceiptDate,"D.restrictedDepositoryReceiptDate=this.value",false,'date')}</div>`:''}
          ${revealsBond(state)?`<div class="col-md-6">${inpD('Bond Amount',d.bondAmount,"D.bondAmount=this.value",false,'number')}</div>
          <div class="col-md-6">${inpD('Name of Bonding Company',d.bondingCompany,"D.bondingCompany=this.value")}</div>
          <div class="col-md-6">${inpD('Bond Period From',d.bondPeriodFrom,"D.bondPeriodFrom=this.value",false,'date')}</div>
          <div class="col-md-6">${inpD('Bond Period To',d.bondPeriodTo,"D.bondPeriodTo=this.value",false,'date')}</div>`:''}
          ${revealsWaiver(state)?`<div class="col-md-6">${inpD('Date of the order waiving the bond',d.bondWaivedDate,"D.bondWaivedDate=this.value",false,'date')}</div>`:''}
        </div>`;
        })()}
      </div>
    </div>
  </div>
  ${pageNavAnnual('/p8','/p10')}
  </div>`;
}

// ── Part X — Certificate of Service ──────────────────────
function pagePart10Annual(){
  const d=getD();
  const cards=(d.certRecipients||[]).map((r,i)=>{
    const removeBtn=i===0?'':`<button type="button" class="btn btn-outline-danger btn-sm" data-annual-action="remove-row" data-collection="certRecipients" data-index="${i}" data-route="/p10">\u2715 Remove</button>`;
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>Recipient ${i+1}</span><span class="entry-card-actions">${removeBtn}</span></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-12">${inpD('Name',r.name,`D.certRecipients[${i}].name=this.value`,true)}</div>
        <div class="col-12">${inpD('Line 2',r.line2,`D.certRecipients[${i}].line2=this.value`,false)}</div>
        <div class="col-12">${inpD('Line 3',r.line3,`D.certRecipients[${i}].line3=this.value`,false)}</div>
        <div class="col-12">${inpD('Line 4',r.line4,`D.certRecipients[${i}].line4=this.value`,false)}</div>
        <div class="col-12">${inpD('Line 5',r.line5,`D.certRecipients[${i}].line5=this.value`,false)}</div>
      </div></div>
    </div></div>`;
  }).join('');
  // Milestone 71B: with no attorney started, the guardian who served the
  // copies signs the certificate (unrepresented-filing.js). The attorney card
  // and whatever it holds come back unchanged once an attorney is entered.
  const started=isAttorneyStarted(d,'annual');
  const labels=['Guardian #1','Co-Guardian #2','Co-Guardian #3'];
  const certifier=started?null:resolveServiceCertifier(d);
  const signerCard=started?`<h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Attorney Signature</h2>
  <div class="row g-3 card-grid-2col">
    <div class="col-12 col-lg-6">
      <div class="entry-card mb-0 h-100">
        <div class="entry-card-header">Attorney Certification</div>
        <div class="entry-card-body">
          <div class="row g-2">
            <div class="col-md-5">${inpD('Attorney Name',d.attorney,"D.attorney=this.value")}</div>
            <div class="col-md-3">${inpDWithTooltip('Signature Date','signature_date',d.certAttySignDate,"D.certAttySignDate=this.value",signatureDateRequired({ path: 'certAttorney', state: d.certAttySignatureState }),'date')}</div>
            <div class="col-12">${renderSignatureStateControl({ path: 'certAttorney', state: d.certAttySignatureState, date: d.certAttySignDate, route: '/p10', signatureImage: d.certAttySignatureImage, statePath: 'certAttySignatureState', imagePath: 'certAttySignatureImage' })}</div>
            <div class="col-md-4">${inpD('Bar Number',d.attorney_bar,"D.attorney_bar=this.value")}</div>
            <div class="col-md-4">${inpD('Phone Number',d.attorney_phone,"D.attorney_phone=this.value")}</div>
            <div class="col-md-8">${inpD('Street Address',d.attorney_street,"D.attorney_street=this.value")}</div>
            <div class="col-12">${inpD('City / State / Zip Code',d.attorney_cityStateZip,"D.attorney_cityStateZip=this.value")}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`:`<h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Guardian Signature</h2>
  <div class="alert alert-secondary" role="status" data-guardian-certificate-notice>
    <strong>No attorney is entered</strong>, so the guardian who served the copies signs this certificate. The court's Excel workbook has an attorney signature line only; the guardian's certificate prints on the PDF.
  </div>
  ${serviceCertifierChoiceHTML(d,{route:'/p10',labels})}
  <div class="row g-3 card-grid-2col">
    <div class="col-12 col-lg-6">
      <div class="entry-card mb-0 h-100" data-guardian-certificate>
        <div class="entry-card-header">Guardian Certification</div>
        <div class="entry-card-body">
          <p class="mb-2">${certifier?`Signed by <strong>${esc(certifier.name||`${labels[certifier.index]} (name not entered)`)}</strong>, ${esc(labels[certifier.index])} — name and contact details come from Part III.`:'Tick the guardian who served the copies above.'}</p>
          <div class="row g-2">
            <div class="col-md-5">${inpDWithTooltip('Signature Date','signature_date',d.certGuardianSignDate,"D.certGuardianSignDate=this.value",signatureDateRequired({ path: 'certGuardian', state: d.certGuardianSignatureState }),'date')}</div>
            <div class="col-12">${renderSignatureStateControl({ path: 'certGuardian', state: d.certGuardianSignatureState, date: d.certGuardianSignDate, route: '/p10', signatureImage: d.certGuardianSignatureImage, statePath: 'certGuardianSignatureState', imagePath: 'certGuardianSignatureImage' })}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  // Milestone 72G: the ward's status is the workbook's "Indicate if:" (K23),
  // required; how the copies were served is its own box, printed on the PDF only.
  return `<div class="schedule-page">
  <h1>Part X — ${started?'Guardian Attorney ':''}Certificate of Service</h1>
  ${preparerNoteHTML()}
  <div class="schedule-instructions">Pursuant to Florida Statute 744.367(4), I hereby certify that a copy of this accounting has been furnished to the recipients listed below.</div>
  <div class="row g-2 mb-3">
    <div class="col-md-4">${inpD('Date of Service',d.certDate,"D.certDate=this.value",true,'date')}</div>
    <div class="col-md-6">${selD('Indicate if Ward is:',d.certWardStatus,"D.certWardStatus=this.value",WARD_STATUS_VALUES,true)}</div>
    <div class="col-12">${inpD(SERVICE_METHOD_LABEL,d.certIndicator,"D.certIndicator=this.value",false,'text',{kind:SERVICE_METHOD_KIND})}</div>
  </div>
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Recipients</h2>
  ${renderServiceAttestationRow({html:yesNoCheckboxD(ATTESTATION_57B,d.certNoRecipients,'certNoRecipients','/p10'),rows:d.certRecipients,attestation:d.certNoRecipients,startedFields:RECIPIENT_STARTED_FIELDS,recipientsPath:'certRecipients',attestationPath:'certNoRecipients'})}
  ${d.certNoRecipients==='Yes'?'':`<div class="row g-3 card-grid-2col mb-3">
    ${cards}
  </div>`}
  ${d.certNoRecipients==='Yes'?'':`<button type="button" class="btn btn-outline-secondary btn-sm mb-4 no-print" data-annual-action="add-row" data-collection="certRecipients" data-route="/p10">+ Add Recipient</button>`}
  ${signerCard}
  ${pageNavAnnual('/p9','/p11')}
  </div>`;
}

// ── Part XI — Remuneration ────────────────────────────────
function pagePart11Annual(){
  const d=getD();
  let rows='';
  if(d.remuneration && d.remuneration.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.remuneration.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header">
        <span>Entry ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-danger ms-auto" data-annual-action="remove-row" data-collection="remuneration" data-index="${i}" data-route="/p11">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4">${inpD('Guardian Name',r.guardian,`D.remuneration[${i}].guardian=this.value`,true)}</div>
        <div class="col-md-4">${inpD('Type',r.type,`D.remuneration[${i}].type=this.value`,true)}</div>
        <div class="col-md-4">${inpD('Amount',r.amount,`D.remuneration[${i}].amount=this.value`,true,'number')}</div>
        <div class="col-12">${inpD('Description',r.description,`D.remuneration[${i}].description=this.value`,false)}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('remuneration','remuneration entries','remuneration');
  }
  return `<div class="schedule-page">
  <h1>Part XI — Guardian(s) Declaration of Remuneration</h1>
  <div class="schedule-instructions">Per 744.367(3)(a), the annual guardianship report must include a declaration of all remuneration received by the guardian from any source for services rendered to or on behalf of the ward. "Remuneration" means any payment or other benefit made directly or indirectly, overtly or covertly, or in cash or in kind to the guardian.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-3 mt-3" data-annual-action="add-row" data-collection="remuneration" data-route="/p11">+ Add Entry</button>
  ${pageNavAnnual('/p10','/print')}
  </div>`;
}
// Milestone 42F: every issue states its own field path (validation-issue.js).
// The filing type is the ward's own (annual/finalAccounting/trustAccounting
// share this validator), so the issue codes name the actual filing.
// Milestone 73F part 1: the checks are src/core/validation/engines/annual.js's.
export function validateAnnual(){ return collectAnnualIssues(getD()); }
// Milestone 33, Phase 2.3: the shared updateCurrentScheduleNextButton() (then
// legacy-app.js's, reading window.validate<Type>; src/core/status/nav-marks.js's,
// through the feature services' validator, since Milestone 70) only itemizes the
// disabled-Next guidance panel when the form's validator is there -- guardian-inventory/index.js already does
// this for validateGuardian; this file's own errors were computed but never
// exposed, so finalAccounting/trustAccounting (formEngine()==='annual') fell back
// to a single generic message with no per-field jump links.
