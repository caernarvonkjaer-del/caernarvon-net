import { confirmModal } from '../../core/ui/dialogs.js';
import { promptScheduleAckIfNeeded } from '../../core/filing/schedule-doc-ack.js';
import { renderSummaryPage, navStatus } from '../../core/summary-renderer.js';
import { renderLocalSectionGuidance } from '../../core/status/section-status.js';
import { sectionCheckKey, isSectionIncomplete, blocksNext, guidanceAdvice } from '../../core/status/section-guidance-policy.js';
import { GUARDIANSHIP_TYPE_OPTIONS, optionsWithLegacyValuePairs } from '../../core/form/guardianship-options.js';
import { checkSignatureState, inferLegacySignatureState } from '../../core/validation/signature-state.js';
import { checkDateOrder } from '../../core/validation/date-rules.js';
// Milestone 51F: the capacity rule has ONE implementation. This used to come
// off `window` from a legacy-app.js twin that duplicated core's logic verbatim
// (remuneration-filtering comment included), so the print-page capacity panel
// and the export gate ran two separate copies of the same court-facing rule.
import { checkExcelCapacity } from '../../core/excel/excel-capacity.js';
import { issueFactory } from '../../core/validation/validation-issue.js';
import { createIssue } from '../../core/validation/issue-registry.js';
import { migrateBondDepository, inferBondDepositoryState, BOND_DEPOSITORY_OPTIONS, BOND_DEPOSITORY_QUESTION, revealsBond, revealsDepository, revealsWaiver } from '../../core/filing/bond-depository.js';
import { renderFormField, renderRadioGroupField } from '../../core/form/form-fields.js';
import { renderSignatureStateControl, mountSignatureStateControls } from '../../core/signature/signature-state-control.js';
import { preparerNoteHTML } from '../../core/signature/preparer-note.js';
import { hasIdentifiedPreparer, preparerFlagCheckboxHTML, preparerWaivedNoticeHTML } from '../../core/form/preparer-flag.js';
import { serviceRecipientIssues, RECIPIENTS_OR_ATTESTATION } from '../../core/validation/service-recipients.js';
import { renderServiceAttestationRow } from '../../core/form/service-attestation-visibility.js';
import { esc } from '../../core/filing/escape-html.js';
import { ic } from '../../core/ui/icons.js';
import { fmt } from '../../core/format/money.js';
import { applyZipLimit, finalizeCaseNumber, formatAccountNumber, formatAddress, formatBarNumber, formatCaseNumber, formatCheckNumber, formatName, formatPhone, formatSSN, sanitizeNonNegativeDecimal } from '../../core/form/form-contract.js';
import { amountForStore } from '../../core/form/amount-codec.js';
import { calc } from './totals.js';
import { PAGES_GUARDIAN, mk } from '../../core/filing/models/guardian.js';
import { SCHEDULE_NAV_KEYS } from '../../core/filing/models/guardian.js';
import { getD, requestSave } from '../../core/state.js';
import { saveData } from '../../core/persistence/case-file.js';
import { afterChange, bindForms } from './form-binding.js';
import { isAttorneyStarted } from '../../core/validation/attorney-block.js';
import { percentProblem } from '../../core/validation/percent-range.js';

// Milestone 71C: the 17 share fields' Inventory half -- every schedule's
// Ward's %, and C-5's Joint Owner's %.
import { resolveServiceCertifier, certifyingCandidates, serviceCertifierChoiceHTML, waiverBasisQuestionHTML, watchWaiverAdvocateHint } from '../../core/filing/unrepresented-filing.js';
import { fillAttorneyFromOldCertificate, discardOldCertificateDetails } from '../../core/filing/certificate-migrations.js';
import { WARD_STATUS_VALUES, SERVICE_METHOD_LABEL } from '../../core/filing/service-method.js';
import { certificateAttorneyLineHTML, oldCertificateDetailsHTML } from '../../core/form/certificate-attorney-note.js';
import { auditLog } from '../../core/activity/audit-log.js';
import { watchAttorneyRequiredMarkers } from '../../core/form/attorney-required-markers.js';

// Milestone 71B: the attorney fields that become required once an attorney is
// started (and only then), per page -- the live markers and validateGuardian()
// share the rule.
const INVENTORY_ATTORNEY_REQUIRED = {
  '/': ['attorneyForGuardian'],
  '/d2': ['attorney.name', 'attorney.signatureDate', 'attorney.filingDate', 'attorney.barNumber', 'attorney.phone', 'attorney.email', 'attorney.streetAddress', 'attorney.cityStateZip'],
};
const INVENTORY_ATTORNEY_TRIGGERS = ['attorneyForGuardian', 'attorney'];
const attorneyMarkerAborts = new WeakMap();
const waiverHintAborts = new WeakMap();
import { yesNoCheckboxS, yesNoRadioHTML } from '../../core/form/field-html.js';
import { browserRecommendationNotice, linkAccordions, linkLabelsToInputs, setupAmountFieldValidation } from '../../core/form/form-runtime.js';
import { initPrintPager } from '../../core/ui/print-pager.js';
import { renderScheduleDocsSection } from '../../core/filing/schedule-docs.js';
import { setPath } from '../../core/form/paths.js';
import { appendRow, duplicateRowAt, removeRowAt } from '../../core/form/collections.js';
import { showPickPartyModal } from '../../core/modals/pick-record-dialogs.js';
import { getCurrentPage, navigate, renderPage } from '../../core/navigation/router.js';
import { computeNavChecks, updateNavDots } from '../../core/status/nav-marks.js';
import { commitModelChange } from '../../core/model-change.js';
import { collectGuardianIssues, INVENTORY_SHARE_FIELDS, RECIPIENT_STARTED_FIELDS, sdbIsYes, sdbIsNo, sdbAnswered } from '../../core/validation/engines/guardian.js';
// Milestone 57B: carried verbatim from MILESTONE-57-PROPOSAL.md section 57B.
// The wording is load bearing (section 8 #8). Do not paraphrase or re-voice it.
const ATTESTATION_57B = 'No recipients are required for this certificate (filer attestation - app does not determine legal necessity)';
// Milestone 63B: what makes a D-5 recipient card "started". One list for the
// validator and for the page, which shows the attestation only while Recipient 1
// is not started, so the two read the same data the same way.
// Guardian Inventory -- Milestone 8A page/nav/validation extraction, plus
// Milestone 8B (print/PDF/Excel import/export). Loaded on first use through
// src/features-loader.js, like every filing feature (Milestone 70's 70K; it
// was legacy-app.js's mountGuardianFeature() bridge).

const D = new Proxy({}, {
  get: (_target, prop) => getD() && getD()[prop],
  set: (_target, prop, value) => { if (getD()) getD()[prop] = value; return true; },
});

// print.js/excel.js are dynamically imported once, together, the first time
// this feature mounts -- same reasoning as Simplified/Annual's
// ensureLazyModules(): the Cover page (pageHome()) has its own Excel-import
// dropzone that must work immediately, so deferring excel.js further would
// mean a second, separate lazy-load path for just that one control.
let _printModule = null;
let _excelModule = null;
let _lazyModulesPromise = null;
const eventControllers = new WeakMap();
const signatureHandles = new WeakMap();
// Milestone 73C: D-1 keeps every guardian card through redraws, a new card the
// filer hasn't filled in yet included; the clean-up when the filer leaves the
// page removes a co-guardian card that is still not entered (rowStarted() since
// Milestone 74B, through collections.js), with its shared-record link. This used to drop such
// cards on every draw, with a one-draw exception for a card just added
// (Milestone 51H), so a new card disappeared at the next redraw -- and a
// signature choice redraws the page. All that is left here is the one card D-1
// always shows.
function normalizeGuardians() {
  if (Array.isArray(D.guardians) && D.guardians.length) return;
  D.guardians = [mk.guardian()];
  requestSave();
}
// Milestone 64A-1, item 1.1. D-4's Bond Amount used to be free text (e.g.
// "$25,000"), formatted however the filer typed it; numInput() now stores it
// as a plain number, matching every other currency field. A .sav saved
// before this fix still has the old string -- this parses it once on load.
// A genuinely blank amount stays blank ('' or undefined), never coerced to 0
// (AGENTS.md section 4's tri-state rule, extended here: 0 would read as "no
// bond amount entered" as wrongly as the old "$25,000" string that failed
// parseFloat() and printed $0.00).
//
// Milestone 73G part 1: read by the one amount codec, so the sign survives
// ("$-25,000" used to become 25000) and text that is not an amount is kept as
// it was for the export checks to name.
export function normalizeBondAmountValue(v) {
  if (typeof v !== 'string' || !v.trim()) return v;
  return amountForStore(v);
}
// Save as PDF and Save as Excel, for GuardianForms.testing's saveOutput through
// the feature services (Milestone 70, 70K). The adapter named
// doSavePdfGuardian() and doSaveExcelGuardian(), which nothing defined, so
// saveOutput.pdfGuardian() and excelGuardian() could only throw; the page's own
// buttons reach print.js and excel.js through data-inventory-action.
export function doSavePdfGuardian() {
  if (_printModule) return _printModule.doSavePdf();
  return ensureLazyModules().then(() => _printModule.doSavePdf());
}
export function doSaveExcelGuardian() {
  if (_excelModule) return _excelModule.doSaveExcel();
  return ensureLazyModules().then(() => _excelModule.doSaveExcel());
}

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
  normalizeGuardians();
  // Milestone 67B: a filing saved before the four-state bond question reads
  // back with the state its old fields implied, and the retired bondWaived
  // tri-state is dropped. Idempotent, so every mount may call it. window.D
  // itself, not this module's D proxy: the migration deletes a key, and the
  // proxy forwards reads and writes but not `in` or `delete`.
  if (migrateBondDepository(getD())) saveData();
  // Milestone 72H: once, each detail typed on the old D-5 attorney
  // certificate fills D-2's matching field where that one is blank; the log
  // names the fields, never their values (certificate-migrations.js).
  const certFilled = fillAttorneyFromOldCertificate(getD(), 'guardian');
  if (certFilled) {
    saveData();
    if (certFilled.length) void auditLog('CERTIFICATE_MIGRATION', `D-2 attorney fields filled from the old D-5 certificate: ${certFilled.join(', ')}`, true);
  }
  D.bondAmount = normalizeBondAmountValue(D.bondAmount);
  let html;
  switch(page){
    case '/':     html=pageHome();break;
    case '/summary':html=pageSummary();break;
    case '/a1':   html=pageScheduleA1();break;
    case '/a2':   html=pageScheduleA2();break;
    case '/b1':   html=pageScheduleB1();break;
    case '/b2':   html=pageScheduleB2();break;
    case '/b3':   html=pageScheduleB3();break;
    case '/b4':   html=pageScheduleB4();break;
    case '/c1':   html=pageScheduleC1();break;
    case '/c2':   html=pageScheduleC2();break;
    case '/c3':   html=pageScheduleC3();break;
    case '/c4':   html=pageScheduleC4();break;
    case '/c5':   html=pageScheduleC5();break;
    case '/d1':   html=pageD1();break;
    case '/d2':   html=pageD2();break;
    case '/d3':   html=pageD3();break;
    case '/d4':   html=pageD4();break;
    case '/d5':   html=pageD5();break;
    case '/print': {
      const capOver = checkExcelCapacity(_excelModule.GUARDIAN_EXCEL_CAPS, getD());
      html = _printModule.pagePrint(capOver);
      break;
    }
    default:      html='<p>Page not found</p>';
  }
  container.innerHTML = html;
  bindEvents(container);
  bindForms();
  afterChange('');
  container.scrollTop = 0;
  if(page==='/')linkAccordions('instructionsZone','importZone');
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  if (page === '/d1' || page === '/d2' || page === '/d5') {
    signatureHandles.set(container, mountSignatureStateControls(container, {
      setImage: (imagePath, dataUrl) => setPath(getD(), imagePath, dataUrl),
      route: page,
    }));
  }
  linkLabelsToInputs();
  // Milestone 40C-C removed enforceDateRanges() (see the router's note).
  setupAmountFieldValidation();
  // Milestone 72I: the Guardian Advocate hint follows Type of Guardianship on
  // the Cover as the filer changes it.
  waiverHintAborts.get(container)?.abort();
  waiverHintAborts.delete(container);
  if (!page || page === '/') waiverHintAborts.set(container, watchWaiverAdvocateHint(container, getD));
  attorneyMarkerAborts.get(container)?.abort();
  attorneyMarkerAborts.delete(container);
  const markerPaths = INVENTORY_ATTORNEY_REQUIRED[page || '/'];
  if (markerPaths) {
    attorneyMarkerAborts.set(container, watchAttorneyRequiredMarkers(container, {
      engineId: 'guardian', paths: markerPaths, triggerPaths: INVENTORY_ATTORNEY_TRIGGERS,
    }));
  }
  updateNavDots();
  // The pv-pager needs the real .pdf-page elements in the DOM before it can
  // count/label them, so it must run after the async preview render, not
  // before it (Milestone 19-3).
  if (page === '/print') await _printModule.mountPreview();
  initPrintPager();
  // Milestone 57C-R. Deliberately NOT awaited. confirmModal() resolves only
  // when the filer answers, so awaiting it here would make mount() -- and
  // therefore navigate() -- hang until the dialog is dismissed, wedging the
  // router on a prompt that is supposed to be advisory. Caught by
  // schedule-doc-ack.spec.ts, where three cases timed out inside navigate()
  // before this was a floating call. Detection is on the DATA, not on the Add
  // button, so rows from an Excel import or New Filing from Existing count.
  void promptScheduleAckIfNeeded(getD(), 'guardian', page, confirmModal).catch(() => {});
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

function bindEvents(container) {
  eventControllers.get(container)?.abort();
  const controller = new AbortController();
  eventControllers.set(container, controller);
  const options = { signal: controller.signal };

  container.addEventListener('click', (event) => {
    const control = event.target instanceof Element ? event.target.closest('[data-inventory-action]') : null;
    if (!control) return;
    event.preventDefault();
    const index = Number.parseInt(control.dataset.index, 10);
    switch (control.dataset.inventoryAction) {
      case 'add-entry': addEntry(control.dataset.schedule); break;
      case 'add-guardian': addGuardian(); break;
      case 'add-recipient': addRecipient(); break;
      case 'add-witness': addWitness(); break;
      case 'duplicate-entry': duplicateEntry(control.dataset.schedule, index); break;
      case 'link-party': showPickPartyModal(control.dataset.role, control.dataset.index); break;
      case 'navigate': navigate(control.dataset.route); break;
      case 'remove-entry': removeEntry(control.dataset.schedule, index); break;
      case 'remove-guardian': removeGuardian(index); break;
      case 'remove-recipient': removeRecipient(index); break;
      // Milestone 72H: the filer's explicit deletion of the old D-5 details.
      case 'discard-old-certificate-details': if (discardOldCertificateDetails(getD(), 'guardian')) commitModelChange('certificate-details-discarded'); renderPage('/d5'); break;
      case 'remove-witness': removeWitness(index); break;
      case 'save-excel': _excelModule.doSaveExcel(); break;
      case 'save-pdf': _printModule.doSavePdf(); break;
    }
  }, options);

  container.addEventListener('change', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement)) return;
    if (control.dataset.inventoryChange === 'import-excel') _excelModule.importExcel(control);
    if (control.dataset.inventoryChange === 'schedule-no-items') setScheduleNoItems(control.dataset.schedule, control.checked);
    if (control.dataset.inventoryChange === 'toggle-vehicle') toggleB2Vehicle(Number.parseInt(control.dataset.index, 10), control.checked);
    if (control.dataset.inventoryInput === 'vehicle') {
      const field = control.dataset.field;
      if (field === 'vehicleMake' || field === 'vehicleModel') {
        const index = Number.parseInt(control.dataset.index, 10);
        const formatted = formatName(control.value);
        control.value = formatted;
        if (D.scheduleB2?.[index]) D.scheduleB2[index][field] = formatted;
        commitModelChange('field-write', [`scheduleB2.${index}.${field}`]);
      }
    }
  }, options);

  container.addEventListener('input', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement) || control.dataset.inventoryInput !== 'vehicle') return;
    if (control.dataset.inventoryFormat === 'year') control.value = control.value.replace(/[^0-9]/g, '').slice(0, 4);
    if (control.dataset.inventoryFormat === 'vin') control.value = control.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
    if (control.dataset.inventoryFormat === 'mileage') control.value = control.value.replace(/[^0-9,]/g, '');
    const index = Number.parseInt(control.dataset.index, 10);
    D.scheduleB2[index][control.dataset.field] = control.value;
    commitModelChange('field-write', [`scheduleB2.${index}.${control.dataset.field}`]);
  }, options);
}

export function mountNav(container) {
  buildNavGuardian(container);
}

function buildNavGuardian(container){
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Case Info</div>
      <button class="nav-link-item" data-page="/" data-nav="cover" data-form-action="navigate" data-route="/">Cover</button>
      <button class="nav-link-item" data-page="/summary" data-nav="summary" data-form-action="navigate" data-route="/summary">Summary</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedule A — Real Estate</div>
      <button class="nav-link-item" data-page="/a1" data-nav="a1" data-form-action="navigate" data-route="/a1">A-1&nbsp;&nbsp;Real Estate Assets</button>
      <button class="nav-link-item" data-page="/a2" data-nav="a2" data-form-action="navigate" data-route="/a2">A-2&nbsp;&nbsp;Real Estate Liabilities</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedule B — Personal &amp; Cash</div>
      <button class="nav-link-item" data-page="/b1" data-nav="b1" data-form-action="navigate" data-route="/b1">B-1&nbsp;&nbsp;Cash / Cash Equivalents</button>
      <button class="nav-link-item" data-page="/b2" data-nav="b2" data-form-action="navigate" data-route="/b2">B-2&nbsp;&nbsp;Personal Property</button>
      <button class="nav-link-item" data-page="/b3" data-nav="b3" data-form-action="navigate" data-route="/b3">B-3&nbsp;&nbsp;Intangible Assets</button>
      <button class="nav-link-item" data-page="/b4" data-nav="b4" data-form-action="navigate" data-route="/b4">B-4&nbsp;&nbsp;Pers. Prop. Liabilities</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedule C — Other Info</div>
      <button class="nav-link-item" data-page="/c1" data-nav="c1" data-form-action="navigate" data-route="/c1">C-1&nbsp;&nbsp;Income (Annualized)</button>
      <button class="nav-link-item" data-page="/c2" data-nav="c2" data-form-action="navigate" data-route="/c2">C-2&nbsp;&nbsp;Lawsuits Against Ward</button>
      <button class="nav-link-item" data-page="/c3" data-nav="c3" data-form-action="navigate" data-route="/c3">C-3&nbsp;&nbsp;Lawsuits by Ward</button>
      <button class="nav-link-item" data-page="/c4" data-nav="c4" data-form-action="navigate" data-route="/c4">C-4&nbsp;&nbsp;Trusts</button>
      <button class="nav-link-item" data-page="/c5" data-nav="c5" data-form-action="navigate" data-route="/c5">C-5&nbsp;&nbsp;Joint Owners</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Attestations &amp; Filings</div>
      <button class="nav-link-item" data-page="/d1" data-nav="d1" data-form-action="navigate" data-route="/d1">D-1&nbsp;&nbsp;Guardian Attestation</button>
      <button class="nav-link-item" data-page="/d2" data-nav="d2" data-form-action="navigate" data-route="/d2">D-2&nbsp;&nbsp;Preparer &amp; Attorney</button>
      <button class="nav-link-item" data-page="/d3" data-nav="d3" data-form-action="navigate" data-route="/d3">D-3&nbsp;&nbsp;Audit Fee &amp; Safe Deposit</button>
      <button class="nav-link-item" data-page="/d4" data-nav="d4" data-form-action="navigate" data-route="/d4">D-4&nbsp;&nbsp;Bond &amp; Surety Info</button>
      <button class="nav-link-item" data-page="/d5" data-nav="d5" data-form-action="navigate" data-route="/d5">D-5&nbsp;&nbsp;Certificate of Service</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

// Milestone 63A. This module used to keep its own copy of the "is this page gating Next"
// rule, beside the one that live-patches the button after every edit (legacy-app.js's then,
// src/core/status/nav-marks.js's now). Two
// copies meant a fix to one would show the explanation on page load and wipe it on the first
// keystroke. Both now read src/core/status/section-guidance-policy.js:
//   - the Guardian pages that GATE Next are the 11 schedules only (SCHEDULE_NAV_KEYS);
//   - Cover and D-1..D-5 are explained when incomplete but never block Next (D1);
//   - the 11 schedule pages are exactly the Guardian pages carrying a "verify there are
//     none" checkbox, so they alone get the "add an item or tick the box" advice.
export function pageNav(current){
  const PAGES=PAGES_GUARDIAN;
  const idx=PAGES.findIndex(p=>p.id===current);
  const prev=idx>0?PAGES[idx-1]:null;
  const next=idx<PAGES.length-1?PAGES[idx+1]:null;
  const checkKey=sectionCheckKey('guardian',current);
  const checks=computeNavChecks();
  const incomplete=isSectionIncomplete(checks&&checks.checks,checkKey);
  const nextDisabled=blocksNext({type:'guardian',checkKey,incomplete,guardianScheduleKeys:SCHEDULE_NAV_KEYS});
  const advice=guidanceAdvice({hasVerifyNoneBox:SCHEDULE_NAV_KEYS.includes(checkKey)});
  // Milestone 73F part 2: the same list the live refresh draws -- this page's blockers from the
  // export checks and its unanswered questions (nav-marks.js's updateCurrentScheduleNextButton()).
  const owed=incomplete&&checks?checks.pageIssues(current):{blockers:[],prompts:[]};
  const guidanceHtml=incomplete?renderLocalSectionGuidance(current,owed.blockers,Infinity,{message:advice,wants:owed.prompts.map(p=>({label:p.label,path:p.path}))}):'';
  return `<div class="page-nav-wrap no-print">
    <div class="page-nav d-flex justify-content-between align-items-center">
      <div>${prev?`<button class="btn btn-outline-primary btn-sm" data-form-action="navigate" data-route="${prev.id}">← Previous: ${prev.label}</button>`:'&nbsp;'}</div>
      <small style="color:var(--ink-3);">Page ${idx+1} of ${PAGES.length}</small>
      <div>${next?`<button id="page-next-btn" class="btn btn-primary btn-sm" ${nextDisabled?`disabled title="${advice}"`:''} data-form-action="navigate" data-route="${next.id}">Next: ${next.label} →</button>`:'&nbsp;'}</div>
    </div>
    <div id="page-local-guidance">${guidanceHtml}</div>
  </div>`;
}


function reqLabel(text){return `<label class="form-label"><strong>${text}</strong><span class="req">*</span></label>`;}
// Milestone 71B: an attorney field is required only once an attorney is
// started; the markers then follow live (watchAttorneyRequiredMarkers()).
function attyLabel(text){return isAttorneyStarted(D,'guardian')?reqLabel(text):`<label class="form-label"><strong>${text}</strong></label>`;}
function optLabel(text){return `<label class="form-label">${text}</label>`;}
function formRow(...cols){
  return `<div class="row g-2 mb-1">${cols.join('')}</div>`;
}
function col(n,html){return `<div class="col-md-${n}">${html}</div>`;}
function textInput(bind,placeholder='',type=''){
  const inputId='txt_'+Math.random().toString(36).slice(2,9);
  const dataType=type?` data-input-type="${type}"`:' data-input-type="text"';
  const fieldKind=type||'text';
  const isPreserve=['accountNumber','checkNumber','caseNumber','barNumber','ssn','text','identifier'].includes(fieldKind);
  const policy=isPreserve?'preserve':'normalize';
  // SSN/EIN is real PII -- masked by default (type="password" only hides
  // the rendering; .value, oninput/data-bind, and formatSSN()'s live
  // dash-insertion all keep working exactly as for a text input) with a
  // lock/unlock toggle button to reveal it on demand. See toggleSsnReveal().
  if(type==='ssn'){
    // Not delegated: renderFormField() builds the reveal button's
    // aria-label from the field's own visible label, and these fields
    // supply their label separately via reqLabel(), so a delegated call
    // (label: '') would degrade it to "Show ". Two call sites; kept as-is
    // rather than adding a Tier 1 option that exists for one filing type.
    return `<div class="ssn-mask-wrap"><input class="form-control ssn-masked" id="${inputId}" type="text" autocomplete="off" data-bind="${bind}" data-field-path="${bind}" data-field-kind="${fieldKind}" data-field-format-policy="${policy}" placeholder="${placeholder}"${dataType}>`
      +`<button type="button" class="ssn-reveal-btn" aria-label="Show SSN/EIN" data-form-action="toggle-ssn">${ic('lock',14)}</button></div>`;
  }
  // Milestone 41-3: delegates to Tier 1, mirroring inpS()/txtP()/radioP()/
  // chkP()'s 41-1 delegation -- zero call-site changes across 85 sites.
  //
  // Three arguments carry the whole safety of this: `binding: 'bind'` keeps
  // the field on bindForms()'s write path (and therefore afterChange(),
  // which repaints the live inventory totals the shared path does not), and
  // suppresses data-form-path so the two listeners can't both claim it;
  // `inputType` preserves the data-input-type attribute bindForms() switches
  // on for every read and write format; and `kind`/`policy` are passed
  // explicitly because this file computes them from the type argument, not
  // from a label -- which renderFormField() would otherwise infer, wrongly,
  // from the empty label these fields deliberately pass.
  return renderFormField({
    path: bind,
    label: '',
    // Deliberately blank: bindForms() assigns .value immediately after
    // render using its own data-input-type formatter, so populating it
    // here would be overwritten anyway -- and leaving it blank keeps this
    // exactly as the pre-delegation markup behaved (textInput() never
    // emitted a value attribute either).
    value: '',
    kind: fieldKind,
    policy,
    placeholder,
    id: inputId,
    wrapperClass: '',
    binding: 'bind',
    inputType: type || 'text',
  });
}


// Milestone 41-3 (Guardian Inventory step): delegates to Tier 1, same
// pattern as textInput() above -- zero call-site changes across 24 sites.
//
// `claimSharedWriteListener: false` is the one departure from textInput()'s
// own call: this field's stored value is a Number (bindForms() below does
// setPath(...,parseFloat(val)||0)), and the shared writeDraftValue() would
// compare that Number against control.value, a String, with strict !== --
// always true -- silently overwriting the correct Number with a String on
// every keystroke. Omitting data-field-path keeps the field claimed by
// bindForms() alone, exactly as it was before this delegated -- see that
// option's own comment in form-fields.js for the full account. Dollar-vs-
// percent wrapping still comes from `bind`'s own "...Percent" suffix (no
// label exists here to read it from instead -- a separate reqLabel()/
// optLabel() call renders the caller's own label), which renderFormField()
// now also checks for exactly this caller.
function numInput(bind){
  // Milestone 71C: a share (every `...Percent` path -- wardPercent on A-1 to
  // C-4, jointOwnerPercent on C-5) is a percent field, 0-100 with its minus
  // kept visible, not a money field with a "%" suffix; bindForms() handles
  // the 'percent' input type.
  const isShare = /Percent$/.test(bind);
  return renderFormField({
    path: bind,
    label: '',
    value: '',
    kind: isShare ? 'percent' : 'money',
    policy: 'normalize',
    wrapperClass: '',
    binding: 'bind',
    inputType: isShare ? 'percent' : 'decimal',
    claimSharedWriteListener: false,
  });
}
// Milestone 41-3 (Guardian Inventory step): delegates to Tier 1, same
// pattern as textInput() above -- zero call-site changes across 13 sites.
//
// Unlike numInput() above, this keeps the default claimSharedWriteListener
// (data-field-path present, as it already was on every dateInput() field
// before this delegated): bindForms() itself explicitly defers to the
// shared writeDraftValue()/finalizeFieldValue() for date-kind fields (see
// its own dataset.fieldKind==='date' early return), so there is no
// competing writer or type mismatch to guard against here -- the field was
// already, safely, claimed by both attributes at once.
function dateInput(bind){
  const inputId='date_'+Math.random().toString(36).slice(2,9);
  return renderFormField({
    path: bind,
    label: '',
    value: '',
    kind: 'date',
    policy: 'normalize',
    id: inputId,
    wrapperClass: 'date-field-wrap',
    binding: 'bind',
  });
}
function calcInput(calcbind){
  return `<input class="form-control" readonly data-calcbind="${calcbind}">`;
}
// currentVal is optional -- pass the field's live D value when the option
// list is a fixed/curated set (as opposed to grown organically from user
// entries) so a .sav file saved before that list existed, or before a
// free-text field was converted to this dropdown, doesn't silently show a
// blank/wrong selection: bindForms() sets select.value=String(cur), and a
// value with no matching <option> leaves the control showing nothing
// selected even though the real data is still intact underneath. Injecting
// the stored value as its own selected option keeps the display honest
// until the user actively picks one of the real choices.
function selectInput(bind,opts,currentVal){
  let list=opts;
  if(currentVal!==undefined&&currentVal!==null&&currentVal!==''&&!opts.some(([v])=>v===currentVal)){
    list=[[currentVal,currentVal],...opts];
  }
  const options=list.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');
  return `<select class="custom-select form-select" data-bind="${bind}">${options}</select>`;
}
// Checkbox counterpart to selectInput() for fields that are genuinely
// check-all-that-apply booleans. Explicit Yes/No questions use the shared
// yesNoRadioHTML() renderer and keep '' distinct from an explicit No.
// Every call site already has its own reqLabel()/optLabel() heading right
// above it (the Guardian form's grid puts a label over every field, checkbox
// or not), so this renders a bare checkbox -- `label` becomes an aria-label
// for accessibility, not a second visible label repeating the same text.
function checkboxInput(bind,label){
  const inputId='chk_'+Math.random().toString(36).slice(2,9);
  return `<div class="form-check"><input class="form-check-input" type="checkbox" id="${inputId}" data-bind="${bind}" aria-label="${esc(label)}"></div>`;
}
// County-field counterpart to selectInput() -- data-bind driven like every
// other Guardian-form field (bindForms() below wires the actual read/write
// via data-input-type="county"), but a filtered-autocomplete text input
// instead of a <select>. No initial value or write-expr here: bindForms()
// sets the starting value itself from window.D, same as every other bound
// field, and dispatching 'input' on selectCountyOption() reaches its
// listener exactly like typing would.
function countyInputBind(bind){
  const inputId='cty_'+Math.random().toString(36).slice(2,9);
  return `<div class="ward-combobox-wrap county-combobox-wrap">
    <input type="text" class="form-control" id="${inputId}" data-bind="${bind}" data-input-type="county" data-form-control="county" autocomplete="off">
    <div class="county-combobox-dropdown" id="${inputId}-dropdown"></div>
  </div>`;
}
function entryCard(title,idx,schedule,bodyHtml,footerHtml=''){
  return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
    <div class="entry-card-header">
      <span>${title}</span>
      <span class="entry-card-actions">
        <button class="btn btn-sm btn-outline-secondary no-print" title="Add a copy of this entry below" data-inventory-action="duplicate-entry" data-schedule="${schedule}" data-index="${idx}">${ic('copy',14)} Duplicate</button>
        <button class="btn btn-sm btn-outline-danger no-print" data-inventory-action="remove-entry" data-schedule="${schedule}" data-index="${idx}">✕ Remove</button>
      </span>
    </div>
    <div class="entry-card-body">${bodyHtml}</div>
    ${footerHtml?`<div class="entry-card-footer">${footerHtml}</div>`:''}
  </div></div>`;
}
function scheduleCards(entries){
  return entries?`<div class="row g-3 schedule-entry-grid">${entries}</div>`:'';
}
function addBtn(schedule,label){
  return `<button class="btn btn-primary btn-sm mb-3 no-print" data-inventory-action="add-entry" data-schedule="${schedule}">+ Add ${label}</button>`;
}
function totalsBox(rows){
  const trs=rows.map(([label,id])=>`<div class="tr"><div class="td">${label}</div><div class="td" id="${id}">${fmt(0)}</div></div>`).join('');
  return `<div class="schedule-totals"><div class="tbl">${trs}</div></div>`;
}

// ── Entry add/remove ───────────────────────────────────
// Milestone 73V: the rows change through the shared row actions
// (src/core/form/collections.js), which hold each schedule's row; what each
// action saves and redraws is unchanged.
export function addEntry(schedule){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  appendRow(getD(),key);
  commitModelChange('collection-add',[key]);
  renderPage(getCurrentPage());
}
function removeEntry(schedule,idx){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  removeRowAt(getD(),key,idx);
  commitModelChange('collection-remove',[key]);
  renderPage(getCurrentPage());
}
// Empty-state for a schedule with zero rows: a checkbox the filer checks
// to affirmatively state there's nothing to report, replacing the old
// folder-icon placeholder. Checking it satisfies computeNavChecks()'s
// scheduleComplete() the same as adding a real row would (see there),
// which is what ungates that schedule's own "Next" button and turns its
// sidebar/section checkmark green -- and prints a verification sentence
// in place of the schedule's table on the final printout (printEmptyRow()).
function scheduleEmptyHTML(key,noun){
  const checked=!!(D.scheduleNoItems&&D.scheduleNoItems[key]);
  return `<div class="schedule-empty">
    <label class="schedule-empty-check">
      <input type="checkbox" ${checked?'checked':''} data-inventory-change="schedule-no-items" data-schedule="${key}">
      <span>I verify there are no ${noun} to report for this schedule.</span>
    </label>
  </div>`;
}
function setScheduleNoItems(key,val){
  if(!D.scheduleNoItems)D.scheduleNoItems={};
  D.scheduleNoItems[key]=val;
  afterChange(`scheduleNoItems.${key}`);
}
// Copies an entry and inserts the copy directly beneath the original.
// Real filings are full of near-identical rows — twelve monthly
// disbursements to the same payee differing only in date and check number —
// and re-entering the shared fields by hand for each was the single most
// repetitive part of preparing an accounting.
// Deliberately a full copy including amounts: the guardian edits down what
// differs, which is less work than re-typing what doesn't. Values are plain
// strings/numbers, so a JSON round-trip is a safe deep copy and can't leave
// the copy sharing a reference with the original.
export function duplicateEntry(schedule,idx){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  const list=getD()[key];
  if(!list||!list[idx])return;
  duplicateRowAt(getD(),key,idx);
  commitModelChange('collection-duplicate',[key]);
  renderPage(getCurrentPage());
}
// Same idea for the Annual Accounting schedules, which store their rows in
// D.schA / D.schB1 / … and are rendered inline rather than through

function addGuardian(){appendRow(D,'guardians');commitModelChange('collection-add',['guardians']);renderPage('/d1');}
function removeGuardian(i){
  removeRowAt(D,'guardians',i);
  commitModelChange('collection-remove',['guardians']);
  renderPage('/d1');
}
function addRecipient(){appendRow(D,'serviceRecipients');commitModelChange('collection-add',['serviceRecipients']);renderPage('/d5');}
function removeRecipient(i){removeRowAt(D,'serviceRecipients',i);commitModelChange('collection-remove',['serviceRecipients']);renderPage('/d5');}

// Witnesses present during the physical inventory of the ward's personal
// effects (Cover page reminder). Kept separate from the entryCard()/
// addEntry()/removeEntry() machinery used by the 11 numbered schedules --
// witnesses aren't a "schedule" in that sense (no dollar total, not part
// of the schedule/route map those helpers key off of).
// The witness row lives with the list rules (src/core/form/collections.js).
function addWitness(){appendRow(D,'witnesses');commitModelChange('collection-add',['witnesses']);renderPage('/');}
function removeWitness(i){if(!D.witnesses)return;removeRowAt(D,'witnesses',i);commitModelChange('collection-remove',['witnesses']);renderPage('/');}
function witnessCardsHTML(){
  const list=D.witnesses||[];
  return list.map((w,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
    <div class="entry-card-header">
      <span>Inventory Witness ${i+1}</span>
      <span class="entry-card-actions">
        <button class="btn btn-sm btn-outline-danger no-print" data-inventory-action="remove-witness" data-index="${i}">✕ Remove</button>
      </span>
    </div>
    <div class="entry-card-body">
      ${formRow(col(12,reqLabel('Name')+textInput(`witnesses.${i}.name`,'','name')))}
      ${formRow(col(7,reqLabel('Address')+textInput(`witnesses.${i}.address`,'','address')),col(5,reqLabel('Occupation')+textInput(`witnesses.${i}.occupation`)))}
    </div>
  </div></div>`).join('');
}

// ═══════════════════════════════════════════════════════
// PAGE: HOME / COVER
// ═══════════════════════════════════════════════════════
function pageHome(){
  return `<div class="schedule-page">
  <h1>Verified Initial Inventory — Case Information</h1>
  <div class="instructions-import-row">
    <div class="accordion mb-0">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#instructionsZone" aria-expanded="false">
            ${ic('clipboard',15)} General Instructions
          </button>
        </h2>
        <div id="instructionsZone" class="accordion-collapse collapse">
          <div class="accordion-body" style="padding:1rem 1.25rem;">
            <ul style="margin:0;padding-left:1.4rem;font-size:.8rem;">
              <li>Fields marked with an asterisk (<span class="req">*</span>) are required before export.</li>
              <li>All values must be as of the <strong>Guardianship Inception Date (GID)</strong>.</li>
              <li><strong style="color:var(--danger-text);">CAUTION on Ward's % fields:</strong> Enter percentages as plain digits (70, not 0.70).</li>
              <li>Complete all Required Information fields (Ward Name, Case Number, GID, Guardian, County). An attorney is optional; if one represents the guardian, enter them here and on D-2.</li>
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
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZone" aria-expanded="false">
            <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing guardian inventory template)
          </button>
        </h2>
        <div id="importZone" class="accordion-collapse collapse">
          <div class="accordion-body import-zone-body p-4 text-center">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" class="d-none" data-inventory-change="import-excel">
            </label>
            <p class="mt-2 mb-0" style="color:var(--ink-3);font-size:.8rem;">Select the court-issued Initial Inventory Excel template</p>
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
        ${formRow(col(12,reqLabel('Name of Ward')+textInput('wardName','Full legal name of ward','name')))}
        ${formRow(col(12,reqLabel('Case Number')+textInput('caseNumber','','caseNumber')))}
        ${formRow(col(12,optLabel('UCN')+textInput('ucn','')))}
        ${formRow(col(12,reqLabel('Guardianship Inception Date (GID)')+dateInput('gid')))}
        ${formRow(col(6,reqLabel('County')+countyInputBind('county')))}
      </div>
    </div>
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Guardian &amp; Attorney</h2>
        ${formRow(col(12,reqLabel('Guardian Name(s)')+textInput('guardianName','','name')))}
        ${formRow(col(12,attyLabel('Attorney for Guardian')+textInput('attorneyForGuardian','','name')))}
        ${formRow(col(12,reqLabel('Type of Guardianship')+selectInput('typeOfGuardianship',optionsWithLegacyValuePairs(GUARDIANSHIP_TYPE_OPTIONS,D.typeOfGuardianship),D.typeOfGuardianship)))}
        ${formRow(col(12,yesNoRadioHTML('amendedForm','Amended Form?',D.amendedForm||(D.isAmended?'Yes':(D.isAmended===false?'No':'')),'amendedForm')))}
      </div>
    </div>
  </div>
  ${isAttorneyStarted(D,'guardian')?'':waiverBasisQuestionHTML(D,{route:'/',dateField:(path,label)=>optLabel(label)+dateInput(path)})}
  <div class="summary-box mb-3">
    <h2 class="subsection-heading">Inventory Witnesses</h2>
    <div class="schedule-instructions">A personal property inventory must include the names, addresses, and occupations of witnesses present during the physical inventory of the ward's personal effects.</div>
    <div class="row g-3 card-grid-2col">${witnessCardsHTML()}</div>
    <button class="btn btn-outline-primary btn-sm no-print" data-inventory-action="add-witness">+ Add Witness</button>
  </div>
  <div class="mb-3">
    ${pageNav('/')}
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════
// PAGE: SUMMARY
// ═══════════════════════════════════════════════════════
function getSummaryConfigGuardian(){
  const nav=computeNavChecks();
  return {
    formTitle:'Verified Initial Inventory — Summary',
    infoRows:[
      {label:'Ward Name',value:esc(D.wardName)},
      {label:'Case Number',value:esc(D.caseNumber)},
      {label:'GID',value:esc(D.gid)},
      {label:'County',value:esc(D.county)},
    ],
    leftCards:[
      {
        heading:'Summary I — Schedule A: Real Estate',
        lines:[
          {label:'Schedule A-1 — Real Estate Assets',route:'/a1',value:fmt(calc.totalA1()),id:'totalA1'},
          {label:'Schedule A-2 — Real Estate Liabilities',route:'/a2',value:fmt(calc.totalA2()),id:'totalA2'},
          {label:'Real Estate, Net of Liabilities',value:fmt(calc.netA()),id:'netA',isTotal:true},
        ],
      },
      {
        heading:'Summary I — Schedule B: Cash / Personal Property',
        lines:[
          {label:'Schedule B-1 — Cash &amp; Cash Equivalents',route:'/b1',value:fmt(calc.totalB1()),id:'totalB1'},
          {label:'Schedule B-2 — Personal Property Assets',route:'/b2',value:fmt(calc.totalB2()),id:'totalB2'},
          {label:'Schedule B-3 — Intangible Assets',route:'/b3',value:fmt(calc.totalB3()),id:'totalB3'},
          {label:'Schedule B-4 — Personal Property Liabilities',route:'/b4',value:fmt(calc.totalB4()),id:'totalB4'},
          {label:'Cash / Pers. Property, Net of Liabilities',value:fmt(calc.netB()),id:'netB',isTotal:true},
        ],
      },
      {
        heading:'Summary II — Schedule C: Other Financial Information',
        lines:[
          {label:'Schedule C-1 — Income (Annualized)',route:'/c1',value:fmt(calc.totalC1()),id:'totalC1'},
          {label:'Schedule C-2 — Lawsuits Against Ward',route:'/c2',value:fmt(calc.totalC2()),id:'totalC2'},
          {label:'Schedule C-3 — Lawsuits by Ward',route:'/c3',value:fmt(calc.totalC3()),id:'totalC3'},
          {label:'Schedule C-4 — Trusts',route:'/c4',value:fmt(calc.totalC4()),id:'totalC4'},
          {label:'Schedule C-5 — Joint Owners',route:'/c5',value:fmt(calc.totalC5()),id:'totalC5'},
        ],
      },
    ],
    rightCards:[
      {
        heading:'Part V — Audit Fee &amp; Bond Calculation',
        lines:[
          {label:'Audit Fee (inventory &gt; $25,000)',value:fmt(calc.auditFee()),id:'auditFee'},
          {label:'Restricted Cash (B-1)',value:fmt(calc.restrictedCash()),id:'restrictedCash'},
          {label:'Restricted Intangibles (B-3)',value:fmt(calc.restrictedIntang()),id:'restrictedIntang'},
          {label:'Unrestricted Cash (B-1)',value:fmt(calc.unrestrictedCash()),id:'unrestrictedCash'},
          {label:'Personal Property (B-2)',value:fmt(calc.totalB2()),id:'personalPropertyB2Home'},
          {label:'Unrestricted Intangibles (B-3)',value:fmt(calc.unrestrictedIntang()),id:'unrestrictedIntang'},
          {label:'Bond Requirement (liquid, unrestricted)',value:fmt(calc.bondRequired()),id:'bondRequired',isTotal:true},
        ],
        footerAction:{label:'Complete Bond &amp; Surety Info (D-4)',route:'/d4'},
      },
      {
        heading:'Attestations &amp; Filings Completion',
        lines:[
          {label:'D-1 — Guardian Attestation',route:'/d1',status:navStatus(nav,'d1')},
          {label:'D-2 — Preparer &amp; Attorney',route:'/d2',status:navStatus(nav,'d2')},
          {label:'D-3 — Audit Fee &amp; Safe Deposit',route:'/d3',status:navStatus(nav,'d3')},
          {label:'D-4 — Bond &amp; Surety Info',route:'/d4',status:navStatus(nav,'d4')},
          {label:'D-5 — Certificate of Service',route:'/d5',status:navStatus(nav,'d5')},
        ],
      },
    ],
    banner:{title:'VERIFIED INITIAL INVENTORY TOTAL',value:fmt(calc.total()),id:'totalInventory'},
    nextRoute:'/a1',
  };
}
function pageSummary(){ return renderSummaryPage(getSummaryConfigGuardian()); }

// ═══════════════════════════════════════════════════════
// SCHEDULE PAGES
// ═══════════════════════════════════════════════════════
function pageScheduleA1(){
  const entries=D.scheduleA1.map((e,i)=>entryCard(`Property ${i+1}`,i,'a1',`
    ${formRow(col(6,reqLabel('Property Description')+textInput(`scheduleA1.${i}.propertyDescription`,'e.g., Single Family Home','name')),col(3,yesNoRadioHTML(`schA1_res_${i}`,'Personal Residence?',e.residence||(e.isPersonalResidence?'Yes':(e.isPersonalResidence===false?'No':'')),`scheduleA1.${i}.residence`)),col(3,yesNoRadioHTML(`schA1_inc_${i}`,'Income Property?',e.income||(e.isIncomeProperty?'Yes':(e.isIncomeProperty===false?'No':'')),`scheduleA1.${i}.income`)))}
    ${formRow(col(12,reqLabel('Street Address')+textInput(`scheduleA1.${i}.streetAddress`,'','address')))}
    ${formRow(col(6,reqLabel('City / State / Zip')+textInput(`scheduleA1.${i}.cityStateZip`,'','zip')),col(6,optLabel('Notes (joint ownership, etc.)')+textInput(`scheduleA1.${i}.notes`)))}
    ${formRow(col(4,reqLabel('Full Asset Value as of GID ($)')+numInput(`scheduleA1.${i}.fullAssetValue`)),col(4,reqLabel("Ward's Ownership % (0-100)")+numInput(`scheduleA1.${i}.wardPercent`)),col(4,optLabel("Ward's Value (calculated)")+calcInput(`scheduleA1.${i}.wardValue`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule A-1: Real Estate / Real Property</h1>
  <div class="schedule-instructions">List all real property owned by the ward as of the GID. Attach Property Appraiser records. Ward's Value = Full Asset Value × Ward's % / 100.</div>
  ${addBtn('a1','Property')}${scheduleCards(entries)||scheduleEmptyHTML('a1','real estate properties')}
  ${totalsBox([["Schedule A-1 Total (Ward's Value)",'totalA1']])}
  ${renderScheduleDocsSection('a1')}
  ${pageNav('/a1')}</div>`;
}

function pageScheduleA2(){
  const entries=D.scheduleA2.map((e,i)=>entryCard(`Liability ${i+1}`,i,'a2',`
    <div class="liability-fields">
      ${formRow(col(12,reqLabel('Lending Institution / Private Lender')+textInput(`scheduleA2.${i}.lenderName`,'','name')))}
      ${formRow(col(12,reqLabel('Lender Street Address')+textInput(`scheduleA2.${i}.lenderAddress`,'','address')))}
      ${formRow(col(12,reqLabel('Lender City / State / Zip')+textInput(`scheduleA2.${i}.lenderCityStateZip`,'','zip')))}
      ${formRow(col(6,reqLabel('Type')+selectInput(`scheduleA2.${i}.liabilityType`,[['Mortgage','Mortgage'],['Note','Note'],['Loan','Loan'],['Other Debt','Other Debt']])),col(6,optLabel('Account Number')+textInput(`scheduleA2.${i}.accountNumber`,'','accountNumber')))}
      ${formRow(col(12,optLabel('Notes (related property, etc.)')+textInput(`scheduleA2.${i}.notes`)))}
      ${formRow(col(4,reqLabel('Full Debt Balance as of GID ($)')+numInput(`scheduleA2.${i}.fullDebtBalance`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleA2.${i}.wardPercent`)),col(4,optLabel("Ward's Debt Balance (calculated)")+calcInput(`scheduleA2.${i}.wardDebt`)))}
    </div>
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule A-2: Real Estate Liabilities (Mortgages / Notes / Loans)</h1>
  <div class="schedule-instructions">List in the same order as Schedule A-1. Attach mortgage statement or deed for each.</div>
  ${addBtn('a2','Liability')}${scheduleCards(entries)||scheduleEmptyHTML('a2','real estate liabilities')}
  ${totalsBox([["Schedule A-2 Total (Ward's Debt)",'totalA2']])}
  ${renderScheduleDocsSection('a2')}
  ${pageNav('/a2')}</div>`;
}

function pageScheduleB1(){
  const entries=D.scheduleB1.map((e,i)=>entryCard(`Account ${i+1}`,i,'b1',`
    ${formRow(col(5,reqLabel('Financial Institution / Description')+textInput(`scheduleB1.${i}.institutionName`,'','name')),col(3,reqLabel('Account Type')+textInput(`scheduleB1.${i}.accountType`,'Checking, Savings, CD…','name')),col(2,yesNoRadioHTML(`schB1_rest_${i}`,'Restricted?',e.restricted||(e.isRestricted?'Yes':(e.isRestricted===false?'No':'')),`scheduleB1.${i}.restricted`)),col(2,optLabel('Account #')+textInput(`scheduleB1.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(6,reqLabel('Street Address of Institution')+textInput(`scheduleB1.${i}.streetAddress`,'','address')),col(6,reqLabel('City / State / Zip')+textInput(`scheduleB1.${i}.cityStateZip`,'','zip')))}
    ${formRow(col(4,reqLabel('Full Asset Amount ($)')+numInput(`scheduleB1.${i}.fullAssetAmount`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleB1.${i}.wardPercent`)),col(4,optLabel("Ward's Amount (calculated)")+calcInput(`scheduleB1.${i}.wardAmt`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-1: Cash Assets / Cash Equivalent Assets</h1>
  <div class="schedule-instructions">Mark Restricted if funds are in a court-supervised restricted depository. This affects the bond calculation.</div>
  ${addBtn('b1','Account')}${scheduleCards(entries)||scheduleEmptyHTML('b1','cash accounts')}
  ${totalsBox([["Schedule B-1 Total (Ward's Amount)",'totalB1'],['— of which Restricted','restrictedCash'],['— of which Unrestricted','unrestrictedCash']])}
  ${renderScheduleDocsSection('b1')}
  ${pageNav('/b1')}</div>`;
}

// Milestone 73D: a vehicle row shows its Year/Make/Model/VIN/mileage fields in
// place of the free-text Description. They are stored on their own and never
// copied into `description` -- the PDF, the workbook and conversion build a
// vehicle's description from them (b2ItemDescription(), models/guardian.js).
// They used to be copied over the Description on ticking and on every
// keystroke, so unticking showed an empty Description, or "2019".
function renderB2Fields(e, i){
  if(e.isVehicle){
    return `
    ${formRow(
      col(3,reqLabel('Year')+`<input class="form-control" id="b2-vehicle-year-${i}" inputmode="numeric" maxlength="4" value="${esc(e.vehicleYear)}" data-inventory-input="vehicle" data-inventory-format="year" data-index="${i}" data-field="vehicleYear">`),
      col(3,reqLabel('Make')+`<input class="form-control" id="b2-vehicle-make-${i}" value="${esc(e.vehicleMake)}" data-inventory-input="vehicle" data-index="${i}" data-field="vehicleMake">`),
      col(3,reqLabel('Model')+`<input class="form-control" id="b2-vehicle-model-${i}" value="${esc(e.vehicleModel)}" data-inventory-input="vehicle" data-index="${i}" data-field="vehicleModel">`),
      col(3,reqLabel('VIN')+`<input class="form-control text-uppercase" id="b2-vehicle-vin-${i}" maxlength="17" value="${esc(e.vehicleVin)}" data-inventory-input="vehicle" data-inventory-format="vin" data-index="${i}" data-field="vehicleVin">`)
    )}
    ${formRow(col(4,reqLabel('Odometer Mileage')+`<input class="form-control" id="b2-vehicle-mileage-${i}" inputmode="numeric" value="${esc(e.odometerMileage)}" data-inventory-input="vehicle" data-inventory-format="mileage" data-index="${i}" data-field="odometerMileage">`))}
    <div class="vehicle-value-links">Look up a value at <a href="https://www.kbb.com/" target="_blank" rel="noopener noreferrer">Kelley Blue Book</a> or <a href="https://www.carfax.com/" target="_blank" rel="noopener noreferrer">Carfax</a> — both are non-affiliated commercial sites, offered only as a convenience; either generally provides an acceptable value. Print or save the page showing the final value you used and upload it below under Supporting Documents.</div>
    `;
  }
  return `
  ${formRow(col(12,reqLabel('Description (include model/serial number for non-vehicle items)')+`<input class="form-control" id="b2-description-${i}" value="${esc(e.description)}" data-bind="scheduleB2.${i}.description" data-input-type="name">`))}
  `;
}

// Bespoke handler (not data-bind) because checking this box must trigger a
// full re-render to swap the free-text Description field for the vehicle
// fields -- bindForms()'s generic checkbox wiring only calls afterChange(),
// which never re-renders the page. Milestone 73D: ticking changes nothing
// else. The Description and "In Safe Deposit Box?" are kept, hidden while the
// row is a vehicle and back when it is unticked (AGENTS.md section 4); a
// vehicle's answer counts nowhere (totals.js isInSafeDepositBox()). Ticking
// used to erase the answer for good.
function toggleB2Vehicle(i,checked){
  const e=D.scheduleB2[i];
  if(!e)return;
  e.isVehicle=checked;
  commitModelChange('field-write',[`scheduleB2.${i}.isVehicle`]);
  renderPage(getCurrentPage());
}
function pageScheduleB2(){
  const entries=D.scheduleB2.map((e,i)=>{
    const isVeh = !!e.isVehicle;
    const valueRow = isVeh
      ? formRow(
          col(4,reqLabel('Full Asset Value ($)')+numInput(`scheduleB2.${i}.fullAssetValue`)),
          col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleB2.${i}.wardPercent`)),
          col(4,optLabel("Ward's Value (calculated)")+calcInput(`scheduleB2.${i}.wardB2`))
        )
      : formRow(
          col(3,reqLabel('Full Asset Value ($)')+numInput(`scheduleB2.${i}.fullAssetValue`)),
          col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleB2.${i}.wardPercent`)),
          col(3,optLabel("Ward's Value (calculated)")+calcInput(`scheduleB2.${i}.wardB2`)),
          col(3,yesNoRadioHTML(`schB2_sdb_${i}`,'In Safe Deposit Box?',e.inSafeDepositBox===true?'Yes':(e.inSafeDepositBox===false?'No':(e.inSafeDepositBox||'')),`scheduleB2.${i}.inSafeDepositBox`))
        );
    return entryCard(`Item ${i+1}`,i,'b2',`
    ${formRow(col(12,`<label class="form-check"><input class="form-check-input" type="checkbox" ${e.isVehicle?'checked':''} aria-label="This item is a vehicle" data-inventory-change="toggle-vehicle" data-index="${i}"><span class="form-check-label">This item is a vehicle (car, truck, motorcycle, boat, RV, etc.)</span></label>`))}
    <div id="b2-fields-${i}">
      ${renderB2Fields(e, i)}
    </div>
    ${formRow(col(6,reqLabel('Location – Street Address')+textInput(`scheduleB2.${i}.streetAddress`,'','address')),col(6,reqLabel('City / State / Zip')+textInput(`scheduleB2.${i}.cityStateZip`,'','zip')))}
    ${formRow(col(6,reqLabel('Valuation Method &amp; Condition')+textInput(`scheduleB2.${i}.valuationMethod`,'e.g., Kelly Blue Book — fair condition')))}
    ${valueRow}
  `);
  }).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-2: Personal Property Assets</h1>
  <div class="schedule-instructions">List household goods, vehicles, jewelry, etc. Include items in safe deposit boxes (also list separately on SDB inventory).</div>
  ${addBtn('b2','Item')}${scheduleCards(entries)||scheduleEmptyHTML('b2','personal property items')}
  ${totalsBox([["Schedule B-2 Total (Ward's Value)",'totalB2']])}
  ${renderScheduleDocsSection('b2')}
  ${pageNav('/b2')}</div>`;
}

function pageScheduleB3(){
  const entries=D.scheduleB3.map((e,i)=>entryCard(`Asset ${i+1}`,i,'b3',`
    ${formRow(col(12,reqLabel('Description (include account, policy, or certificate number)')+`<input class="form-control" data-bind="scheduleB3.${i}.description" data-input-type="name">`))}
    ${formRow(col(6,reqLabel('Street Address / Custodian Address')+textInput(`scheduleB3.${i}.streetAddress`,'','address')),col(6,reqLabel('City / State / Zip')+textInput(`scheduleB3.${i}.cityStateZip`,'','zip')))}
    ${formRow(col(3,yesNoRadioHTML(`schB3_rest_${i}`,'Restricted?',e.restricted||(e.isRestricted?'Yes':(e.isRestricted===false?'No':'')),`scheduleB3.${i}.restricted`)),col(3,yesNoRadioHTML(`schB3_sdb_${i}`,'In Safe Deposit Box?',e.inSafeDepositBox===true?'Yes':(e.inSafeDepositBox===false?'No':(e.inSafeDepositBox||'')),`scheduleB3.${i}.inSafeDepositBox`)))}
    ${formRow(col(4,reqLabel('Full Asset Value ($)')+numInput(`scheduleB3.${i}.fullAssetValue`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleB3.${i}.wardPercent`)),col(4,optLabel("Ward's Value (calculated)")+calcInput(`scheduleB3.${i}.wardB3`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-3: Intangible Assets</h1>
  <div class="schedule-instructions">List stocks, bonds, IRAs, insurance policies, etc. Mark Restricted if in a court-supervised account.</div>
  ${addBtn('b3','Asset')}${scheduleCards(entries)||scheduleEmptyHTML('b3','intangible assets')}
  ${totalsBox([["Schedule B-3 Total (Ward's Value)",'totalB3'],['— of which Restricted','restrictedIntang'],['— of which Unrestricted','unrestrictedIntang']])}
  ${renderScheduleDocsSection('b3')}
  ${pageNav('/b3')}</div>`;
}

function pageScheduleB4(){
  const entries=D.scheduleB4.map((e,i)=>entryCard(`Liability ${i+1}`,i,'b4',`
    ${formRow(col(5,reqLabel('Lending Institution / Creditor')+textInput(`scheduleB4.${i}.lenderName`,'','name')),col(3,reqLabel('Type')+selectInput(`scheduleB4.${i}.liabilityType`,[['Loan','Loan'],['Note','Note'],['Other Debt','Other Debt']])),col(4,optLabel('Account Number')+textInput(`scheduleB4.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(12,optLabel('Related Personal Property Asset (if secured)')+textInput(`scheduleB4.${i}.relatedProperty`,'e.g., 1992 Toyota Corolla (B-2, Item 2)')))}
    ${formRow(col(12,reqLabel('Lender Street Address / City / State / Zip')+textInput(`scheduleB4.${i}.lenderAddress`,'','address')))}
    ${formRow(col(4,reqLabel('Full Liability Balance ($)')+numInput(`scheduleB4.${i}.fullLiabilityBalance`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleB4.${i}.wardPercent`)),col(4,optLabel("Ward's Liability Balance (calculated)")+calcInput(`scheduleB4.${i}.wardB4`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-4: Liabilities / Secured and Unsecured Debts / Notes / Loans</h1>
  <div class="schedule-instructions">List personal property liabilities only. Real estate liabilities go on Schedule A-2.</div>
  ${addBtn('b4','Liability')}${scheduleCards(entries)||scheduleEmptyHTML('b4','personal property liabilities')}
  ${totalsBox([["Schedule B-4 Total (Ward's Liability)",'totalB4']])}
  ${renderScheduleDocsSection('b4')}
  ${pageNav('/b4')}</div>`;
}

function pageScheduleC1(){
  const entries=D.scheduleC1.map((e,i)=>entryCard(`Income Source ${i+1}`,i,'c1',`
    ${formRow(col(5,reqLabel('Payer Name')+textInput(`scheduleC1.${i}.payerName`,'e.g., Social Security Administration','name')),col(3,reqLabel('Type of Income')+textInput(`scheduleC1.${i}.typeOfIncome`,'SSI, SSD, Pension…')),col(4,reqLabel('Frequency')+selectInput(`scheduleC1.${i}.frequencyOfPayment`,[['Monthly','Monthly'],['Quarterly','Quarterly'],['Semi-Annually','Semi-Annually'],['Annually','Annually'],['Other','Other']])))}
    ${formRow(col(6,reqLabel('Payer Street Address')+textInput(`scheduleC1.${i}.payerAddress`,'','address')),col(6,reqLabel('Payer City / State / Zip')+textInput(`scheduleC1.${i}.payerCityStateZip`,'','zip')))}
    ${formRow(col(4,reqLabel('Basis for Payment')+textInput(`scheduleC1.${i}.paymentBasis`,'e.g., $600/month')))}
    ${formRow(col(3,reqLabel('Annual Income Amount ($)')+numInput(`scheduleC1.${i}.annualIncomeAmount`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC1.${i}.wardPercent`)),col(3,optLabel("Ward's Annual Income (calculated)")+calcInput(`scheduleC1.${i}.wardC1`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-1: Income (Annualized)</h1>
  <div class="schedule-instructions">Annualize all amounts. Example: $600/month × 12 = $7,200/year.</div>
  ${addBtn('c1','Income Source')}${scheduleCards(entries)||scheduleEmptyHTML('c1','income sources')}
  ${totalsBox([["Schedule C-1 Total Annualized Income (Ward's Share)",'totalC1']])}
  ${renderScheduleDocsSection('c1')}
  ${pageNav('/c1')}</div>`;
}

function pageScheduleC2(){
  const entries=D.scheduleC2.map((e,i)=>entryCard(`Lawsuit ${i+1}`,i,'c2',`
    ${formRow(col(6,reqLabel('Claimant / Petitioner Name')+textInput(`scheduleC2.${i}.claimantName`,'','name')),col(6,reqLabel('Type of Lawsuit / Description')+textInput(`scheduleC2.${i}.lawsuitDescription`,'e.g., Mortgage Foreclosure','name')))}
    ${formRow(col(6,optLabel("Claimant's Attorney (if any)")+textInput(`scheduleC2.${i}.claimantAttorney`,'e.g., John Smith','name')))}
    ${formRow(col(6,reqLabel('Court / Jurisdiction')+textInput(`scheduleC2.${i}.courtJurisdiction`,'e.g., Circuit Court / County')),col(6,reqLabel('Case Number')+textInput(`scheduleC2.${i}.caseNumber`)))}
    ${formRow(col(6,reqLabel('Claimant / Attorney Street Address')+textInput(`scheduleC2.${i}.claimantAddress`,'','address')),col(6,optLabel('Claimant City / State / Zip')+textInput(`scheduleC2.${i}.claimantCityStateZip`,'','zip')))}
    ${formRow(col(3,reqLabel('Date Filed')+dateInput(`scheduleC2.${i}.dateFiled`)),col(3,reqLabel('Amount of Claim ($)')+numInput(`scheduleC2.${i}.amountOfClaim`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC2.${i}.wardPercent`)),col(3,optLabel("Ward's Share (calculated)")+calcInput(`scheduleC2.${i}.wardC2`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-2: Lawsuits Pending Against the Ward</h1>
  ${addBtn('c2','Lawsuit')}${scheduleCards(entries)||scheduleEmptyHTML('c2','lawsuits pending against the ward')}
  ${totalsBox([["Schedule C-2 Total (Ward's Share of Claims)",'totalC2']])}
  ${renderScheduleDocsSection('c2')}
  ${pageNav('/c2')}</div>`;
}

function pageScheduleC3(){
  const entries=D.scheduleC3.map((e,i)=>entryCard(`Action ${i+1}`,i,'c3',`
    ${formRow(col(6,reqLabel('Defendant / Entity Name')+textInput(`scheduleC3.${i}.defendantName`,'','name')),col(6,reqLabel('Type of Pending Legal Action')+textInput(`scheduleC3.${i}.actionDescription`,'e.g., Negligence, Personal Injury','name')))}
    ${formRow(col(12,reqLabel('Status of Action')+textInput(`scheduleC3.${i}.status`,'e.g., Mediation scheduled for…')))}
    ${formRow(col(6,reqLabel('Court / Jurisdiction / Attorney of Record')+textInput(`scheduleC3.${i}.courtJurisdiction`)),col(6,optLabel('Case Number (if filed)')+textInput(`scheduleC3.${i}.caseNumber`)))}
    ${formRow(col(3,optLabel('Action Date (if filed)')+dateInput(`scheduleC3.${i}.actionDate`)),col(3,reqLabel('Estimated Settlement ($)')+numInput(`scheduleC3.${i}.estimatedSettlement`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC3.${i}.wardPercent`)),col(3,optLabel("Ward's Share (calculated)")+calcInput(`scheduleC3.${i}.wardC3`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-3: Lawsuits Pending by the Ward</h1>
  ${addBtn('c3','Action')}${scheduleCards(entries)||scheduleEmptyHTML('c3','lawsuits pending by the ward')}
  ${totalsBox([["Schedule C-3 Total (Ward's Estimated Share)",'totalC3']])}
  ${renderScheduleDocsSection('c3')}
  ${pageNav('/c3')}</div>`;
}

function pageScheduleC4(){
  const entries=D.scheduleC4.map((e,i)=>entryCard(`Trust ${i+1}`,i,'c4',`
    ${formRow(col(5,reqLabel('Trust Name')+textInput(`scheduleC4.${i}.trustName`)),col(4,reqLabel('Trustee Name')+textInput(`scheduleC4.${i}.trusteeName`)),col(3,reqLabel('Type of Trust')+textInput(`scheduleC4.${i}.trustType`,'Pooled, Special Needs, Living…')))}
    ${formRow(col(6,reqLabel('Trustee Street Address')+textInput(`scheduleC4.${i}.trusteeAddress`,'','address')),col(6,reqLabel('Trustee City / State / Zip')+textInput(`scheduleC4.${i}.trusteeCityStateZip`,'','zip')))}
    ${formRow(col(3,reqLabel('Date Created')+dateInput(`scheduleC4.${i}.dateCreated`)),col(3,optLabel('Account Number')+textInput(`scheduleC4.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(3,reqLabel('Trust Amount ($)')+numInput(`scheduleC4.${i}.trustAmount`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC4.${i}.wardPercent`)),col(3,optLabel("Ward's Share (calculated)")+calcInput(`scheduleC4.${i}.wardC4`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-4: Value of Trusts for the Ward</h1>
  ${addBtn('c4','Trust')}${scheduleCards(entries)||scheduleEmptyHTML('c4','trusts')}
  ${totalsBox([["Schedule C-4 Total (Ward's Share of Trusts)",'totalC4']])}
  ${renderScheduleDocsSection('c4')}
  ${pageNav('/c4')}</div>`;
}

function pageScheduleC5(){
  const entries=D.scheduleC5.map((e,i)=>entryCard(`Joint Owner ${i+1}`,i,'c5',`
    ${formRow(col(12,reqLabel('Asset Description (cross-ref schedule + item)')+textInput(`scheduleC5.${i}.assetDescription`,'e.g., Single Family Home — Schedule A-1, Item 1','name')))}
    ${formRow(col(6,reqLabel("Joint Owner's Name")+textInput(`scheduleC5.${i}.ownerName`)),col(6,reqLabel('Relationship to Ward')+textInput(`scheduleC5.${i}.relationshipToWard`,'e.g., Spouse, Child')))}
    ${formRow(col(6,reqLabel("Joint Owner's Street Address")+textInput(`scheduleC5.${i}.ownerAddress`,'','address')),col(6,reqLabel("Joint Owner's City / State / Zip")+textInput(`scheduleC5.${i}.ownerCityStateZip`,'','zip')))}
    ${formRow(col(3,reqLabel('Total Asset Value ($)')+numInput(`scheduleC5.${i}.totalAssetValue`)),col(3,reqLabel("Joint Owner's % (0-100)")+numInput(`scheduleC5.${i}.jointOwnerPercent`)),col(3,optLabel("Joint Owner's Value (calculated)")+calcInput(`scheduleC5.${i}.wardC5`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-5: Joint Owners of Ward's Assets</h1>
  <div class="schedule-instructions">Cross-reference each asset to the schedule and item number where it appears.</div>
  ${addBtn('c5','Joint Owner')}${scheduleCards(entries)||scheduleEmptyHTML('c5','joint ownership entries')}
  ${totalsBox([["Schedule C-5 Total (Joint Owners' Combined Value)",'totalC5']])}
  ${renderScheduleDocsSection('c5')}
  ${pageNav('/c5')}</div>`;
}

// ═══════════════════════════════════════════════════════
// ATTESTATION & FILING PAGES (D1–D5)
// ═══════════════════════════════════════════════════════
function pageD1(){
  // Every card is drawn (Milestone 73C): Guardian #1 always, and each
  // co-guardian card until the clean-up removes an unentered one when the
  // filer leaves the page.
  const cards=(D.guardians||[]).map((g,i)=>{
    const isFirst=i===0;
    const title=isFirst?'Guardian #1':`Co-Guardian #${i+1}`;
    const removeBtn=isFirst?'':`<button class="btn btn-sm btn-outline-danger no-print" data-inventory-action="remove-guardian" data-index="${i}">✕ Remove</button>`;
    const linkBtn=`<button class="btn btn-sm btn-outline-secondary no-print" data-inventory-action="link-party" data-role="guardian" data-index="${i}">Link Person</button>`;
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center"><span>${title}</span><div class="d-flex align-items-center gap-2">${linkBtn}${removeBtn}</div></div>
      <div class="entry-card-body">
        ${formRow(col(5,reqLabel("Guardian's Full Name")+textInput(`guardians.${i}.name`,'','name')),col(3,reqLabel('Signature Date')+dateInput(`guardians.${i}.signatureDate`)),col(4,reqLabel('SSN / EIN')+textInput(`guardians.${i}.ssnEin`,'','ssn')))}
        ${formRow(col(4,reqLabel('Phone Number')+textInput(`guardians.${i}.phone`,'','phone')),col(8,reqLabel('Street Address')+textInput(`guardians.${i}.streetAddress`,'','address')))}
        ${formRow(col(6,reqLabel('City / State / Zip')+textInput(`guardians.${i}.cityStateZip`,'','zip')),col(6,optLabel('Email Address')+textInput(`guardians.${i}.email`,'name@example.com','email')))}
        ${renderSignatureStateControl({ path: `guardians.${i}`, state: g.signatureState, date: g.signatureDate, route: '/d1', signatureImage: g.signatureImage })}
        ${preparerFlagCheckboxHTML({ path: `guardians.${i}.isPreparer`, checked: !!g.isPreparer, route: '/d1' })}
      </div>
    </div></div>`;
  }).join('');
  const addCoBtn=D.guardians.length<3?`<button class="btn btn-outline-secondary btn-sm mb-3 no-print" data-inventory-action="add-guardian">+ Add Co-Guardian</button>`:'';
  return `<div class="schedule-page">
  <h1>Part III: Guardian(s) Attestation</h1>
  ${preparerNoteHTML()}
  <div class="schedule-instructions">
    UNDER PENALTIES OF PERJURY, I declare that I have read the foregoing, and the facts alleged are true, to the best of my knowledge and belief.
  </div>
  <div class="row g-3 card-grid-2col">${cards}</div>${addCoBtn}
  ${pageNav('/d1')}</div>`;
}

function pageD2(){
  return `<div class="schedule-page">
  <h1>Part IV: Preparer &amp; Guardian Attorney Attestations</h1>
  ${preparerNoteHTML()}
  <div class="row g-3 card-grid-2col">
  <div class="col-12 col-lg-6">
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Preparer Signature</h2>
  ${hasIdentifiedPreparer(D)
    // Milestone 67A: a guardian (D-1) or the attorney (below) is identified
    // as the preparer, so the outside-preparer block is neither required nor
    // filed. Say who, and where the box lives, rather than show nothing.
    // Whatever was typed into the block stays stored (section 4) and returns
    // when the box is unticked.
    ? preparerWaivedNoticeHTML(D,{cardLocation:'D-1 (the guardian card) or the Attorney card on this page'})
    : `<p style="font-size:.78rem;font-style:italic;color:var(--ink-3);">If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE.</p>
  <div class="entry-card mb-0 h-100">
    <div class="entry-card-header d-flex justify-content-between align-items-center">
      <span>Preparer Attestation</span>
      <button class="btn btn-sm btn-outline-secondary no-print" data-inventory-action="link-party" data-role="preparer" data-index="0">Link Person</button>
    </div>
    <div class="entry-card-body">
      ${formRow(col(5,reqLabel("Preparer's Name")+textInput('preparer.name','','name')),col(3,reqLabel('Date')+dateInput('preparer.signatureDate')),col(4,reqLabel('SSN / EIN')+textInput('preparer.ssnEin','','ssn')))}
      ${formRow(col(5,optLabel('Compilation "as of" date (defaults to the signature date)')+dateInput('preparer.asOfDate')))}
      ${formRow(col(4,reqLabel('Phone Number')+textInput('preparer.phone','','phone')),col(8,reqLabel('Street Address')+textInput('preparer.streetAddress','','address')))}
      ${formRow(col(6,reqLabel('City / State / Zip')+textInput('preparer.cityStateZip','','zip')))}
      ${renderSignatureStateControl({ path: 'preparer', state: D.preparer.signatureState, date: D.preparer.signatureDate, route: '/d2', signatureImage: D.preparer.signatureImage })}
    </div>
  </div>`}
  </div>
  <div class="col-12 col-lg-6">
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Guardian Attorney Signature</h2>
  ${isAttorneyStarted(D,'guardian')?'':`<div class="alert alert-secondary" role="status" data-no-attorney-notice>
    <strong>No attorney is entered</strong>, so the attorney attestation is not required. The filed PDF prints the attestation with the attorney's signature block blank, as the Clerk's form does. If an attorney represents the guardian, enter them here and it becomes required.
  </div>`}
  <p style="font-size:.78rem;font-style:italic;color:var(--ink-3);">The attorney may use an electronic signature "/s/".</p>
  <div class="entry-card mb-0 h-100">
    <div class="entry-card-header d-flex justify-content-between align-items-center">
      <span>Attorney Attestation</span>
      <button class="btn btn-sm btn-outline-secondary no-print" data-inventory-action="link-party" data-role="attorney" data-index="0">Link Person</button>
    </div>
    <div class="entry-card-body">
      ${formRow(col(5,attyLabel("Attorney's Name")+textInput('attorney.name','','name')),col(3,attyLabel('Signature Date')+dateInput('attorney.signatureDate')),col(4,attyLabel('Filing Date (as of)')+dateInput('attorney.filingDate')))}
      ${formRow(col(4,attyLabel('Florida Bar Number')+textInput('attorney.barNumber','','barNumber')),col(4,attyLabel('Phone Number')+textInput('attorney.phone','','phone')))}
      ${formRow(col(6,attyLabel('Primary Email (e-filing)')+textInput('attorney.email','name@lawfirm.com','email')),col(6,optLabel('Secondary Email (optional)')+textInput('attorney.secondaryEmail','assistant@lawfirm.com','email')))}
      ${formRow(col(8,attyLabel('Street Address')+textInput('attorney.streetAddress','','address')),col(6,attyLabel('City / State / Zip')+textInput('attorney.cityStateZip','','zip')))}
      ${renderSignatureStateControl({ path: 'attorney', state: D.attorney.signatureState, date: D.attorney.signatureDate, route: '/d2', signatureImage: D.attorney.signatureImage })}
      ${preparerFlagCheckboxHTML({ path: 'attorney.isPreparer', checked: !!D.attorney.isPreparer, route: '/d2' })}
    </div>
  </div>
  </div>
  </div>
  ${pageNav('/d2')}</div>`;
}

function pageD3(){
  return `<div class="schedule-page">
  <h1>Part V: Audit Fee &amp; Safe Deposit Box</h1>
  <div class="row g-3">
    <div class="col-12 col-lg-6">
      <div class="summary-box h-100 mb-0">
        <h2 class="subsection-heading">Audit Fee Schedule (Initial Inventories Only)</h2>
        <p style="font-size:.83rem;margin-bottom:.5rem;">
          Inventories with total property value exceeding $25,000: <strong>$85.00</strong><br>
          Inventories with total property value at or below $25,000: <strong>$0.00</strong>
        </p>
        <div class="summary-line total">
          <span>Calculated Audit Fee (based on total inventory of <strong id="auditFeeBase">${fmt(calc.total())}</strong>)</span>
          <span id="auditFee">${fmt(calc.auditFee())}</span>
        </div>
      </div>
    </div>
    <div class="col-12 col-lg-6">
      <div class="summary-box h-100 mb-0">
        <h2 class="subsection-heading">Safe Deposit Box</h2>
        ${yesNoRadioHTML('hasSafeDepositBox','Does the ward have a safe deposit box or the right to enter a box registered in joint names or in another\'s name? (FS 744.365(4))',sdbValue(D.hasSafeDepositBox),'hasSafeDepositBox',true,'/d3')}
        <div id="sdb-filed-row" class="${sdbIsYes(D.hasSafeDepositBox)?'':'d-none'}">
          ${yesNoRadioHTML('safeDepositBoxFiled','Safe Deposit Box Inventory Filed with Court?',sdbValue(D.safeDepositBoxFiled),'safeDepositBoxFiled',true)}
        </div>
      </div>
    </div>
  </div>
  ${pageNav('/d3')}</div>`;
}

function pageD4(){
  return `<div class="schedule-page">
  <h1>Part V: Surety Bond &amp; Bond Calculation</h1>
  <div class="row g-3">
    <div class="col-12 col-lg-6">
      <div class="summary-box h-100 mb-0">
        <h2 class="subsection-heading">Bond Calculation</h2>
    <p style="font-size:.8rem;margin-bottom:.6rem;">Bond amount = all liquid assets less those in a restricted depository. Only real property is excluded.</p>
    <div class="summary-line"><span>B-1 — Cash in Restricted Depository</span><span id="restrictedCash">${fmt(calc.restrictedCash())}</span></div>
    <div class="summary-line"><span>B-3 — Intangible Assets (Restricted)</span><span id="restrictedIntang">${fmt(calc.restrictedIntang())}</span></div>
    <div class="summary-line"><span>B-1 — Cash NOT in Restricted Depository</span><span id="unrestrictedCash">${fmt(calc.unrestrictedCash())}</span></div>
    <div class="summary-line"><span>B-2 — Personal Property Assets</span><span id="totalB2">${fmt(calc.totalB2())}</span></div>
    <div class="summary-line"><span>B-3 — Intangible Assets (Unrestricted)</span><span id="unrestrictedIntang">${fmt(calc.unrestrictedIntang())}</span></div>
        <div class="summary-line total"><span>Total for Bond Requirement (calculated)</span><span id="bondRequired">${fmt(calc.bondRequired())}</span></div>
      </div>
    </div>
    <div class="col-12 col-lg-6">
      <div class="summary-box h-100 mb-0">
        <h2 class="subsection-heading">Surety Bond Details</h2>
        ${(()=>{
          // Milestone 67B: one four-state question replaces "has the surety
          // bond been waived?", and each state reveals only the fields it
          // needs -- none of them required. Nothing in this block gates
          // export; the print preview warns instead, and the sidebar asks.
          // The per-row Restricted? flags on B-1/B-3 still feed the bond
          // calculation above; this records the arrangement only. The radio
          // is routed (67F) so the reveal appears on the click.
          const state=inferBondDepositoryState(D);
          return renderRadioGroupField({ path:'bondDepositoryState', id:'bondDepositoryState', label:BOND_DEPOSITORY_QUESTION, value:state, options:BOND_DEPOSITORY_OPTIONS, hint:'Not required to file. Each answer shows only the fields it needs.', route:'/d4' })
            +(revealsDepository(state)?formRow(col(6,optLabel('Date of most recent restricted depository receipt')+dateInput('restrictedDepositoryReceiptDate'))):'')
            +(revealsBond(state)?formRow(col(4,optLabel('Bond Amount')+numInput('bondAmount')),col(3,optLabel('Bond Period – From')+dateInput('bondPeriodFrom')),col(3,optLabel('Bond Period – To')+dateInput('bondPeriodTo')))
              +formRow(col(12,optLabel('Name of Bonding Company')+textInput('bondingCompany','','name'))):'')
            +(revealsWaiver(state)?formRow(col(6,optLabel('Date of the order waiving the bond')+dateInput('bondWaivedDate'))):'');
        })()}
      </div>
    </div>
  </div>
  ${pageNav('/d4')}</div>`;
}

function pageD5(){
  // Milestone 71B: with no attorney started, the guardian who served the copies
  // signs the certificate (unrepresented-filing.js). The attorney card and
  // whatever it holds come back unchanged once an attorney is entered.
  const serviceCertificateHTML=()=>{
    // Milestone 72G: the ward's status is the workbook's "Indicate if:"; how
    // the copies were served is its own box, printed on the PDF only.
    const serviceRow=formRow(col(4,reqLabel('Service Date (on this date)')+dateInput('serviceDate')),col(8,reqLabel('Indicate if Ward is:')+selectInput('serviceIndicateIf',[['','— Select —'],...WARD_STATUS_VALUES.map(v=>[v,v])],D.serviceIndicateIf)))
      +formRow(col(12,optLabel(SERVICE_METHOD_LABEL)+textInput('serviceMethod','U.S. Mail')));
    // Milestone 72H: the certificate's attorney is D-2's, as the Clerk's
    // workbook links it -- its name, Florida Bar number, phone and address
    // are no longer asked again here. The certificate keeps its own signature
    // and date. Details typed here before are listed until discarded.
    if(isAttorneyStarted(D,'guardian'))return `<h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Attorney Certification</h2>
    <div class="attorney-certification-card entry-card">
      <div class="entry-card-body">
        ${serviceRow}
        ${certificateAttorneyLineHTML({ name: D.attorney?.name, barNumber: D.attorney?.barNumber, engineId: 'guardian' })}
        ${oldCertificateDetailsHTML(D, 'guardian', { actionAttr: 'data-inventory-action' })}
        ${formRow(col(4,reqLabel('Signature Date')+dateInput('serviceAttorney.signatureDate')))}
        ${renderSignatureStateControl({ path: 'serviceAttorney', state: D.serviceAttorney.signatureState, date: D.serviceAttorney.signatureDate, route: '/d5', signatureImage: D.serviceAttorney.signatureImage })}
      </div>
    </div>`;
    if(!D.serviceGuardian||typeof D.serviceGuardian!=='object')D.serviceGuardian={signatureDate:null,signatureState:'',signatureImage:''};
    const sg=D.serviceGuardian;
    const certifier=resolveServiceCertifier(D);
    const who=certifier
      ?`Signed by <strong>${esc(certifier.name||`Guardian #${certifier.index+1} (name not entered)`)}</strong>, Guardian #${certifier.index+1} — name and contact details come from D-1.`
      :'Tick the guardian who served the copies above.';
    return `<h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Guardian Certification</h2>
    <div class="alert alert-secondary" role="status" data-guardian-certificate-notice>
      <strong>No attorney is entered</strong>, so the guardian who served the copies signs this certificate. The court's Excel workbook has an attorney signature line only; the guardian's certificate prints on the PDF.
    </div>
    ${serviceCertifierChoiceHTML(D,{route:'/d5'})}
    <div class="attorney-certification-card entry-card" data-guardian-certificate>
      <div class="entry-card-body">
        ${serviceRow}
        <p class="mb-2">${who}</p>
        ${formRow(col(4,optLabel('Signature Date')+dateInput('serviceGuardian.signatureDate')))}
        ${renderSignatureStateControl({ path: 'serviceGuardian', state: sg.signatureState, date: sg.signatureDate, route: '/d5', signatureImage: sg.signatureImage })}
      </div>
    </div>`;
  };

  const cards=D.serviceRecipients.map((r,i)=>{
    const removeBtn=D.serviceRecipients.length>1?`<button class="btn btn-sm btn-outline-danger no-print" data-inventory-action="remove-recipient" data-index="${i}">✕ Remove</button>`:'';
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header"><span>Recipient ${i+1}</span>${removeBtn}</div>
      <div class="entry-card-body">
        ${formRow(col(12,reqLabel('Name')+textInput(`serviceRecipients.${i}.name`,'','name')))}
        ${formRow(col(12,reqLabel('Street Address')+textInput(`serviceRecipients.${i}.address`,'','address')))}
        ${formRow(col(12,reqLabel('City / State / Zip')+textInput(`serviceRecipients.${i}.cityStateZip`,'','zip')))}
      </div>
    </div></div>`;
  }).join('');
  const addBtn2=D.serviceRecipients.length<4?`<button class="btn btn-outline-secondary btn-sm mb-4 no-print" data-inventory-action="add-recipient">+ Add Recipient</button>`:'';
  return `<div class="schedule-page">
  <h1>Part VI: Certificate of Service</h1>
  ${preparerNoteHTML()}
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Recipients</h2>
  ${renderServiceAttestationRow({html:yesNoCheckboxS('serviceNoRecipients',ATTESTATION_57B,D.serviceNoRecipients,false,'/d5'),rows:D.serviceRecipients,attestation:D.serviceNoRecipients,startedFields:RECIPIENT_STARTED_FIELDS,recipientsPath:'serviceRecipients',attestationPath:'serviceNoRecipients'})}
  ${D.serviceNoRecipients==='Yes'?'':`<div class="row g-3 card-grid-2col">${cards}</div>${addBtn2}`}
  ${serviceCertificateHTML()}
  ${pageNav('/d5')}</div>`;
}

// ═══════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════
// D-3 uses the same string tri-state as the schedule radios. Accept booleans
// only as a defensive read-side fallback for a legacy object before opening
// it (setActiveFiling()) normalizes it.
const sdbValue = (v) => v === true ? 'Yes' : (v === false ? 'No' : (v || ''));

// Milestone 42F: every issue states its own field path (validation-issue.js).
// The pre-42F adapter had no Guardian Inventory Cover branch, so every Cover
// message containing "guardian" (GID, Attorney for Guardian, Type of
// Guardianship, Guardian Name(s)) fell through to guardians.0.name.
// Judges the filing it is handed, or the open one. Milestone 70's 70D: the
// dashboard's progress for a filing that is not open passes it here, where it
// used to point window.D at it first.
// Milestone 73F part 1: the checks are src/core/validation/engines/guardian.js's.
export function validateGuardian(d=getD()){ return collectGuardianIssues(d); }

// ═══════════════════════════════════════════════════════
// PRINT VIEW
// Milestone 51E: 11 of the 14 bridge assignments that used to sit here were
// deleted. Every one of those functions is still alive -- they are dispatched
// internally through this feature's own data-form-action / data-inventory-change
// handlers (see bindEvents above) -- but nothing outside this module ever read
// them off `window`.
//
// Two looked like counter-examples and are not:
//   - removeEntry: tests/e2e/startup.spec.ts calls root.removeEntry(), which is
//     a FileSystemDirectoryHandle method, not this global.
//   - pageNav: print.js consumes it, but through the static ES import at
//     print.js:12, never through window. The function is alive; the bridge was
//     dead.
//
// The three that remained went in Milestone 70's 70K, which put nothing of
// the application on window:
//   - addEntry / duplicateEntry: two e2e specs drove them through the bridge on
//     purpose (guardian-inventory-mount, guardian-inventory-tri-state-radios);
//     they are exported, and reached through GuardianForms.testing.
//   - validateGuardian: legacy-app.js's validate() flow called the global
//     directly (a Milestone 40H-A comment there recorded a real bug caused by
//     calling it before assignment); the feature services' validator hands it
//     to core now.
