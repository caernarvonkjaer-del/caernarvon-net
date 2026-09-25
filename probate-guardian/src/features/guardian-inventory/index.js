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
import { renderRadioGroupField } from '../../core/form/form-fields.js';
import { renderSignatureStateControl, mountSignatureStateControls } from '../../core/signature/signature-state-control.js';
import { preparerNoteHTML } from '../../core/signature/preparer-note.js';
import { hasIdentifiedPreparer, preparerFlagCheckboxHTML, preparerWaivedNoticeHTML } from '../../core/form/preparer-flag.js';
import { serviceRecipientIssues } from '../../core/validation/service-recipients.js';
import { renderServiceAttestationRow } from '../../core/form/service-attestation-visibility.js';
import { esc } from '../../core/filing/escape-html.js';
import { ic } from '../../core/ui/icons.js';
import { fmt } from '../../core/format/money.js';
import { applyZipLimit, finalizeCaseNumber, formatAccountNumber, formatAddress, formatBarNumber, formatCaseNumber, formatCheckNumber, formatName, formatPhone, formatSSN, sanitizeNonNegativeDecimal } from '../../core/form/form-contract.js';
import { calc } from './totals.js';
import { PAGES_GUARDIAN, mk } from '../../core/filing/models/guardian.js';
import { SCHEDULE_NAV_KEYS } from '../../core/filing/models/guardian.js';
// Milestone 57B: carried verbatim from MILESTONE-57-PROPOSAL.md section 57B.
// The wording is load bearing (section 8 #8). Do not paraphrase or re-voice it.
const ATTESTATION_57B = 'No recipients are required for this certificate (filer attestation - app does not determine legal necessity)';
// Milestone 63B: what makes a D-5 recipient card "started". One list for the
// validator and for the page, which shows the attestation only while Recipient 1
// is not started, so the two read the same data the same way.
const RECIPIENT_STARTED_FIELDS = ['name', 'address', 'cityStateZip'];
// Guardian Inventory -- Milestone 8A page/nav/validation extraction, plus
// Milestone 8B (print/PDF/Excel import/export). Dynamically imported by
// legacy-app.js's mountGuardianFeature()/mountGuardianNav() bridge, using
// the same window.createFeatureBridge() pattern as Simplified, Plan, and
// Annual features.
const {
  autoSave, navigate, renderPage, getCurrentPage, bindForms, afterChange, yesNoRadioHTML,
  sanitizeNegativeAmounts, linkLabelsToInputs, setupAmountFieldValidation,
  updateNavDots, initPrintPager, computeNavChecks, linkAccordions,
  // Milestone 51C dropped `toggleSsnReveal` from this list -- destructured but
  // never called here (the comment near the SSN field below still points at the
  // function, which is correct: it runs via src/form-events.js's delegated
  // 'toggle-ssn' handler, not from this module).
  browserRecommendationNotice, renderScheduleDocsSection,
} = window;

const D = new Proxy({}, {
  get: (_target, prop) => window.D && window.D[prop],
  set: (_target, prop, value) => { if (window.D) window.D[prop] = value; return true; },
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
let pendingGuardianIndex = null;
let visiblePendingGuardianIndex = null;
function guardianHasData(guardian) {
  return [
    guardian?.name, guardian?.signatureDate, guardian?.ssnEin, guardian?.phone,
    guardian?.streetAddress, guardian?.cityStateZip,
    // Milestone 39-C: a co-guardian who has drawn/applied a signature stamp
    // image before typing a name must not be silently pruned by
    // normalizeGuardians() -- that image can't be recreated once discarded.
    guardian?.signatureImage,
    // Milestone 67A: a card ticked as the preparer is not a blank card.
    guardian?.isPreparer,
  ].some(value => String(value || '').trim());
}
function normalizeGuardians() {
  const guardians = Array.isArray(D.guardians) ? D.guardians : [];
  // Milestone 51H: hold the pending row by IDENTITY, not by index. The filter
  // below prunes blank co-guardian rows, which REINDEXES the array -- so
  // pendingGuardianIndex (recorded against the pre-prune array in addGuardian())
  // can point at the wrong row, or past the end, once the prune has run.
  //
  // Carrying the stale index straight over to visiblePendingGuardianIndex meant
  // pageD1()'s filter matched no row for a guardian that had just been added:
  // clicking "+ Add Co-Guardian" twice with nothing typed pruned the first blank
  // row, shifted the new one down into its place, and then rendered neither --
  // the card appeared to delete itself, while D.guardians silently kept an extra
  // blank entry. Resolving the row's new position after the prune keeps what is
  // stored and what is rendered in agreement.
  const pendingRow = pendingGuardianIndex == null ? null : guardians[pendingGuardianIndex];
  const normalized = guardians.filter((guardian, index) => index === 0 || index === pendingGuardianIndex || guardianHasData(guardian));
  const pendingAfterPrune = pendingRow ? normalized.indexOf(pendingRow) : -1;
  visiblePendingGuardianIndex = pendingAfterPrune >= 0 ? pendingAfterPrune : null;
  pendingGuardianIndex = null;
  if (!normalized.length) normalized.push(mk.guardian());
  if (normalized.length !== guardians.length || !Array.isArray(D.guardians)) {
    D.guardians = normalized;
    autoSave();
  }
}
// Milestone 64A-1, item 1.1. D-4's Bond Amount used to be free text (e.g.
// "$25,000"), formatted however the filer typed it; numInput() now stores it
// as a plain number, matching every other currency field. A .sav saved
// before this fix still has the old string -- this parses it once on load.
// A genuinely blank amount stays blank ('' or undefined), never coerced to 0
// (AGENTS.md section 4's tri-state rule, extended here: 0 would read as "no
// bond amount entered" as wrongly as the old "$25,000" string that failed
// parseFloat() and printed $0.00).
export function normalizeBondAmountValue(v) {
  if (typeof v !== 'string' || !v.trim()) return v;
  const parsed = parseFloat(v.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : v;
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

export async function mount(container, page) {
  await ensureLazyModules();
  normalizeGuardians();
  // Milestone 67B: a filing saved before the four-state bond question reads
  // back with the state its old fields implied, and the retired bondWaived
  // tri-state is dropped. Idempotent, so every mount may call it. window.D
  // itself, not this module's D proxy: the migration deletes a key, and the
  // proxy forwards reads and writes but not `in` or `delete`.
  if (migrateBondDepository(window.D)) saveData();
  sanitizeNegativeAmounts();
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
      const capOver = checkExcelCapacity(_excelModule.GUARDIAN_EXCEL_CAPS, window.D);
      html = _printModule.pagePrint(capOver);
      break;
    }
    default:      html='<p>Page not found</p>';
  }
  container.innerHTML = html;
  visiblePendingGuardianIndex = null;
  bindEvents(container);
  bindForms();
  afterChange('');
  container.scrollTop = 0;
  if(page==='/')linkAccordions('instructionsZone','importZone');
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  if (page === '/d1' || page === '/d2' || page === '/d5') {
    signatureHandles.set(container, mountSignatureStateControls(container, {
      setImage: (imagePath, dataUrl) => window.setPath(window.D, imagePath, dataUrl),
      route: page,
    }));
  }
  linkLabelsToInputs();
  // Milestone 40C-C removed enforceDateRanges(); see legacy-app.js's note.
  setupAmountFieldValidation();
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
  void promptScheduleAckIfNeeded(window.D, 'guardian', page, confirmModal).catch(() => {});
}

export function dispose(container) {
  eventControllers.get(container)?.abort();
  eventControllers.delete(container);
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
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
      case 'link-party': window.showPickPartyModal(control.dataset.role, control.dataset.index); break;
      case 'navigate': navigate(control.dataset.route); break;
      case 'remove-entry': removeEntry(control.dataset.schedule, index); break;
      case 'remove-guardian': removeGuardian(index); break;
      case 'remove-recipient': removeRecipient(index); break;
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
        if (D.scheduleB2?.[index]) {
          D.scheduleB2[index][field] = formatted;
          syncB2VehicleDescription(index);
        }
        autoSave();
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
    syncB2VehicleDescription(index);
    autoSave();
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
// rule, beside the one in legacy-app.js that live-patches the button after every edit. Two
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
  const rawErrors=incomplete&&typeof validateGuardian==='function'?validateGuardian(window.D):[];
  const guidanceHtml=incomplete?renderLocalSectionGuidance(current,rawErrors,Infinity,{message:advice}):'';
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
  if (typeof window !== 'undefined' && typeof window.renderFormField === 'function') {
    return window.renderFormField({
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
  return `<input class="form-control" id="${inputId}" data-bind="${bind}" data-field-path="${bind}" data-field-kind="${fieldKind}" data-field-format-policy="${policy}" placeholder="${placeholder}"${dataType}>`;
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
  if (typeof window !== 'undefined' && typeof window.renderFormField === 'function') {
    return window.renderFormField({
      path: bind,
      label: '',
      value: '',
      kind: 'money',
      policy: 'normalize',
      wrapperClass: '',
      binding: 'bind',
      inputType: 'decimal',
      claimSharedWriteListener: false,
    });
  }
  const isPercent=/Percent$/i.test(bind);
  const inputHtml=`<input type="text" inputmode="decimal" class="form-control" data-bind="${bind}" data-input-type="decimal">`;
  return isPercent?`<div class="input-group">${inputHtml}<span class="input-group-text">%</span></div>`:`<div class="input-group"><span class="input-group-text">$</span>${inputHtml}</div>`;
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
  if (typeof window !== 'undefined' && typeof window.renderFormField === 'function') {
    return window.renderFormField({
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
  const hintId=`${inputId}_hint`;
  return `<div class="date-field-wrap">
    <input type="text" inputmode="text" class="form-control" id="${inputId}" placeholder="MM/DD/YYYY" data-bind="${bind}" data-field-path="${bind}" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="${hintId}">
    <div id="${hintId}" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div>
  </div>`;
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
function addEntry(schedule){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  window.D[key].push(mk[schedule]());
  renderPage(getCurrentPage());
}
function removeEntry(schedule,idx){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  window.D[key].splice(idx,1);
  autoSave();
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
  autoSave();
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
function duplicateEntry(schedule,idx){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  const list=window.D[key];
  if(!list||!list[idx])return;
  list.splice(idx+1,0,JSON.parse(JSON.stringify(list[idx])));
  autoSave();
  renderPage(getCurrentPage());
}
// Same idea for the Annual Accounting schedules, which store their rows in
// D.schA / D.schB1 / … and are rendered inline rather than through

function addGuardian(){pendingGuardianIndex=D.guardians.length;D.guardians.push(mk.guardian());renderPage('/d1');}
function removeGuardian(i){
  D.guardians.splice(i,1);
  if (Array.isArray(D.guardianPartyIds)) D.guardianPartyIds.splice(i, 1);
  autoSave();
  renderPage('/d1');
}
function addRecipient(){D.serviceRecipients.push(mk.recipient());renderPage('/d5');}
function removeRecipient(i){D.serviceRecipients.splice(i,1);autoSave();renderPage('/d5');}

// Witnesses present during the physical inventory of the ward's personal
// effects (Cover page reminder). Kept separate from the entryCard()/
// addEntry()/removeEntry() machinery used by the 11 numbered schedules --
// witnesses aren't a "schedule" in that sense (no dollar total, not part
// of the schedule/route map those helpers key off of).
function mkWitness(){return {name:'',address:'',occupation:''};}
function addWitness(){D.witnesses=D.witnesses||[];D.witnesses.push(mkWitness());autoSave();renderPage('/');}
function removeWitness(i){if(!D.witnesses)return;D.witnesses.splice(i,1);autoSave();renderPage('/');}
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
              <li>Complete all Required Information fields (Ward Name, Case Number, GID, Guardian, Attorney, County).</li>
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
        ${formRow(col(12,reqLabel('Attorney for Guardian')+textInput('attorneyForGuardian','','name')))}
        ${formRow(col(12,reqLabel('Type of Guardianship')+selectInput('typeOfGuardianship',optionsWithLegacyValuePairs(GUARDIANSHIP_TYPE_OPTIONS,D.typeOfGuardianship),D.typeOfGuardianship)))}
        ${formRow(col(12,yesNoRadioHTML('amendedForm','Amended Form?',D.amendedForm||(D.isAmended?'Yes':(D.isAmended===false?'No':'')),'amendedForm')))}
      </div>
    </div>
  </div>
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
  const nav=window.computeNavChecks();
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

// Recomposes the free-text `description` field (still the field every
// other consumer of B-2 -- validate(), the print document, the Excel
// export -- reads) from the structured vehicle fields, so splitting Year/
// Make/Model/VIN into their own inputs didn't require touching any of
// those downstream readers.
function syncB2VehicleDescription(i){
  const e=D.scheduleB2[i];
  if(!e)return;
  const parts=[e.vehicleYear,e.vehicleMake,e.vehicleModel].filter(Boolean).join(' ');
  let desc=parts+(e.vehicleVin?(parts?' — VIN: ':'VIN: ')+e.vehicleVin:'');
  if(e.odometerMileage)desc+=(desc?' — ':'')+'Odometer: '+e.odometerMileage+' mi';
  e.description=desc;
}
// Bespoke handler (not data-bind) because checking this box must trigger a
// full re-render to swap the free-text Description field for the Year/
// Make/Model/VIN fields -- bindForms()'s generic checkbox wiring only
// calls afterChange(), which never re-renders the page.
// Deliberately does NOT call syncB2VehicleDescription() here: on an
// existing row the vehicle fields start blank, so syncing immediately
// would overwrite (and silently lose) whatever free-text description was
// already there before any Year/Make/Model/VIN has been typed. Syncing
// only on those fields' own oninput (see pageScheduleB2()) means
// description is only touched once the guardian has actually entered
// replacement data -- unchecking the box before then leaves the original
// description untouched.
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

function toggleB2Vehicle(i,checked){
  const e=D.scheduleB2[i];
  if(!e)return;
  e.isVehicle=checked;
  if(checked){
    e.inSafeDepositBox = '';
    syncB2VehicleDescription(i);
  }
  autoSave();
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
  // Guardian #1 (index 0) is required and always shown, matching
  // normalizeGuardians()'s own always-keep-index-0 rule -- without this,
  // a brand-new filing with no guardian data typed in yet renders zero
  // cards here, with no way to even see the required Guardian #1 fields.
  const partyRecords=(D.guardians||[]).map((g,i)=>({g,i})).filter(({g,i})=>i===0||i===visiblePendingGuardianIndex||[
    g.name,g.signatureDate,g.ssnEin,g.phone,g.streetAddress,g.cityStateZip,g.signatureImage,g.isPreparer
  ].some(value=>String(value||'').trim()));
  const cards=partyRecords.map(({g,i},visibleIndex)=>{
    const isFirst=visibleIndex===0;
    const title=isFirst?'Guardian #1':`Co-Guardian #${visibleIndex+1}`;
    const removeBtn=isFirst?'':`<button class="btn btn-sm btn-outline-danger no-print" data-inventory-action="remove-guardian" data-index="${i}">✕ Remove</button>`;
    const linkBtn=`<button class="btn btn-sm btn-outline-secondary no-print" data-inventory-action="link-party" data-role="guardian" data-index="${i}">Link Person</button>`;
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center"><span>${title}</span><div class="d-flex align-items-center gap-2">${linkBtn}${removeBtn}</div></div>
      <div class="entry-card-body">
        ${formRow(col(5,reqLabel("Guardian's Full Name")+textInput(`guardians.${i}.name`,'','name')),col(3,reqLabel('Signature Date')+dateInput(`guardians.${i}.signatureDate`)),col(4,reqLabel('SSN / EIN')+textInput(`guardians.${i}.ssnEin`,'','ssn')))}
        ${formRow(col(4,reqLabel('Phone Number')+textInput(`guardians.${i}.phone`,'','phone')),col(8,reqLabel('Street Address')+textInput(`guardians.${i}.streetAddress`,'','address')))}
        ${formRow(col(6,reqLabel('City / State / Zip')+textInput(`guardians.${i}.cityStateZip`,'','zip')))}
        ${renderSignatureStateControl({ path: `guardians.${i}`, state: inferLegacySignatureState(g.signatureState, g.signatureDate), route: '/d1', signatureImage: g.signatureImage })}
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
      ${renderSignatureStateControl({ path: 'preparer', state: inferLegacySignatureState(D.preparer.signatureState, D.preparer.signatureDate), route: '/d2', signatureImage: D.preparer.signatureImage })}
    </div>
  </div>`}
  </div>
  <div class="col-12 col-lg-6">
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Guardian Attorney Signature</h2>
  <p style="font-size:.78rem;font-style:italic;color:var(--ink-3);">The attorney may use an electronic signature "/s/".</p>
  <div class="entry-card mb-0 h-100">
    <div class="entry-card-header d-flex justify-content-between align-items-center">
      <span>Attorney Attestation</span>
      <button class="btn btn-sm btn-outline-secondary no-print" data-inventory-action="link-party" data-role="attorney" data-index="0">Link Person</button>
    </div>
    <div class="entry-card-body">
      ${formRow(col(5,reqLabel("Attorney's Name")+textInput('attorney.name','','name')),col(3,reqLabel('Signature Date')+dateInput('attorney.signatureDate')),col(4,reqLabel('Filing Date (as of)')+dateInput('attorney.filingDate')))}
      ${formRow(col(4,reqLabel('Florida Bar Number')+textInput('attorney.barNumber','','barNumber')),col(4,reqLabel('Phone Number')+textInput('attorney.phone','','phone')))}
      ${formRow(col(6,reqLabel('Primary Email (e-filing)')+textInput('attorney.email','name@lawfirm.com','email')),col(6,optLabel('Secondary Email (optional)')+textInput('attorney.secondaryEmail','assistant@lawfirm.com','email')))}
      ${formRow(col(8,reqLabel('Street Address')+textInput('attorney.streetAddress','','address')),col(6,reqLabel('City / State / Zip')+textInput('attorney.cityStateZip','','zip')))}
      ${renderSignatureStateControl({ path: 'attorney', state: inferLegacySignatureState(D.attorney.signatureState, D.attorney.signatureDate), route: '/d2', signatureImage: D.attorney.signatureImage })}
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
  ${renderServiceAttestationRow({html:window.yesNoCheckboxS('serviceNoRecipients',ATTESTATION_57B,D.serviceNoRecipients,false,'/d5'),rows:D.serviceRecipients,attestation:D.serviceNoRecipients,startedFields:RECIPIENT_STARTED_FIELDS,recipientsPath:'serviceRecipients',attestationPath:'serviceNoRecipients'})}
  ${D.serviceNoRecipients==='Yes'?'':`<div class="row g-3 card-grid-2col">${cards}</div>${addBtn2}`}
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Attorney Certification</h2>
  <div class="attorney-certification-card entry-card">
    <div class="entry-card-body">
      ${formRow(col(4,reqLabel('Service Date (on this date)')+dateInput('serviceDate')),col(8,reqLabel('Indicate if Ward is:')+selectInput('serviceIndicateIf',[['','— Select —'],['Ward is totally incapacitated','Ward is totally incapacitated'],['Ward is under 14 years old','Ward is under 14 years old'],['N/A','N/A']],D.serviceIndicateIf)))}
      ${formRow(col(5,reqLabel("Attorney's Name")+textInput('serviceAttorney.name','','name')),col(3,reqLabel('Signature Date')+dateInput('serviceAttorney.signatureDate')),col(4,reqLabel('Florida Bar Number')+textInput('serviceAttorney.barNumber','','barNumber')))}
      ${formRow(col(4,reqLabel('Phone')+textInput('serviceAttorney.phone','','phone')),col(8,reqLabel('Street Address')+textInput('serviceAttorney.streetAddress','','address')))}
      ${formRow(col(6,reqLabel('City / State / Zip')+textInput('serviceAttorney.cityStateZip','','zip')))}
      ${renderSignatureStateControl({ path: 'serviceAttorney', state: inferLegacySignatureState(D.serviceAttorney.signatureState, D.serviceAttorney.signatureDate), route: '/d5', signatureImage: D.serviceAttorney.signatureImage })}
    </div>
  </div>
  ${pageNav('/d5')}</div>`;
}

// ═══════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════
// D-3 uses the same string tri-state as the schedule radios. Accept booleans
// only as a defensive read-side fallback for a legacy object before setD()
// normalizes it.
const sdbValue = (v) => v === true ? 'Yes' : (v === false ? 'No' : (v || ''));
const sdbIsYes = (v) => v === true || v === 'Yes';
const sdbIsNo = (v) => v === false || v === 'No';
const sdbAnswered = (v) => sdbIsYes(v) || sdbIsNo(v);

// Milestone 42F: every issue states its own field path (validation-issue.js).
// The pre-42F adapter had no Guardian Inventory Cover branch, so every Cover
// message containing "guardian" (GID, Attorney for Guardian, Type of
// Guardianship, Guardian Name(s)) fell through to guardians.0.name.
// Judges the filing it is handed, or the open one. Milestone 70's 70D: the
// dashboard's progress for a filing that is not open passes it here, where it
// used to point window.D at it first.
export function validateGuardian(d=window.D){
  const errors=[];
  const issue=issueFactory('guardian');
  const T='guardian';
  function req(v,label,path){if(!v||!String(v).trim())errors.push(issue(label,path));}
  const push=(label,path)=>errors.push(issue(label,path));
  req(d.wardName,'Cover — Name of Ward is required.','wardName');
  req(d.caseNumber,'Cover — Case Number is required.','caseNumber');
  if(!d.gid)push('Cover — Guardianship Inception Date (GID) is required.','gid');
  req(d.county,'Cover — County is required.','county');
  req(d.guardianName,'Cover — Guardian Name(s) is required.','guardianName');
  req(d.attorneyForGuardian,'Cover — Attorney for Guardian is required.','attorneyForGuardian');
  req(d.typeOfGuardianship,'Cover — Type of Guardianship is required.','typeOfGuardianship');
  // A schedule left totally untouched -- no rows, and the "I verify there
  // are no X to report" checkbox (scheduleEmptyHTML()/setScheduleNoItems())
  // never checked -- produced NO validate() errors before this, since every
  // per-row check below is inside a .forEach() that simply never runs on an
  // empty array. That's what let a schedule sit blank-and-unconfirmed while
  // still showing 100% complete in the sidebar (computeNavChecks() derives
  // its checks from these same errors) and passing Print Preview's export
  // gate. Mirrors the same "row or checkbox" rule the schedule's own Next
  // button already enforces (isScheduleIncomplete()), so there's exactly
  // one definition of "done" for a schedule, not two that can disagree.
  SCHEDULE_NAV_KEYS.forEach(key=>{
    const dataKey='schedule'+key[0].toUpperCase()+key.slice(1);
    if((d[dataKey]||[]).length===0&&!(d.scheduleNoItems&&d.scheduleNoItems[key])){
      const route=key[0].toUpperCase()+'-'+key.slice(1);
      push(`${route} — Add at least one entry, or check the box verifying there are none, before this schedule counts as complete.`,`scheduleNoItems.${key}`);
    }
  });
  // Row paths: `<collection>.<index>.<field>`. Schedule B-2's vehicle
  // sub-fields are raw inputs with no data-bind -- their only focusable
  // selector is the literal element id (see renderB2Fields()).
  d.scheduleA1.forEach((e,i)=>{const p=`A-1 row ${i+1}`,k=`scheduleA1.${i}`;req(e.propertyDescription,`${p} — Property Description`,`${k}.propertyDescription`);req(e.streetAddress,`${p} — Street Address`,`${k}.streetAddress`);req(e.cityStateZip,`${p} — City/State/Zip`,`${k}.cityStateZip`);if(e.fullAssetValue<=0)push(`${p} — Full Asset Value must be > 0.`,`${k}.fullAssetValue`);if(e.wardPercent<=0)push(`${p} — Ward's % must be > 0.`,`${k}.wardPercent`);});
  d.scheduleA2.forEach((e,i)=>{const p=`A-2 row ${i+1}`,k=`scheduleA2.${i}`;req(e.lenderName,`${p} — Lender Name`,`${k}.lenderName`);req(e.lenderAddress,`${p} — Lender Address`,`${k}.lenderAddress`);req(e.lenderCityStateZip,`${p} — Lender City/State/Zip`,`${k}.lenderCityStateZip`);if(e.fullDebtBalance<=0)push(`${p} — Full Debt Balance must be > 0.`,`${k}.fullDebtBalance`);});
  d.scheduleB1.forEach((e,i)=>{const p=`B-1 row ${i+1}`,k=`scheduleB1.${i}`;req(e.institutionName,`${p} — Institution Name`,`${k}.institutionName`);req(e.accountType,`${p} — Account Type`,`${k}.accountType`);req(e.streetAddress,`${p} — Street Address`,`${k}.streetAddress`);req(e.cityStateZip,`${p} — City/State/Zip`,`${k}.cityStateZip`);if(e.fullAssetAmount<=0)push(`${p} — Full Asset Amount must be > 0.`,`${k}.fullAssetAmount`);});
  d.scheduleB2.forEach((e,i)=>{const p=`B-2 row ${i+1}`,k=`scheduleB2.${i}`;
    if(e.isVehicle){
      req(e.vehicleYear,`${p} — Year`,`b2-vehicle-year-${i}`);req(e.vehicleMake,`${p} — Make`,`b2-vehicle-make-${i}`);req(e.vehicleModel,`${p} — Model`,`b2-vehicle-model-${i}`);req(e.vehicleVin,`${p} — VIN`,`b2-vehicle-vin-${i}`);req(e.odometerMileage,`${p} — Odometer Mileage`,`b2-vehicle-mileage-${i}`);
    }else{
      req(e.description,`${p} — Description`,`${k}.description`);
    }
    req(e.streetAddress,`${p} — Street Address`,`${k}.streetAddress`);req(e.cityStateZip,`${p} — City/State/Zip`,`${k}.cityStateZip`);req(e.valuationMethod,`${p} — Valuation Method`,`${k}.valuationMethod`);if(e.fullAssetValue<=0)push(`${p} — Full Asset Value must be > 0.`,`${k}.fullAssetValue`);});
  d.scheduleB3.forEach((e,i)=>{const p=`B-3 row ${i+1}`,k=`scheduleB3.${i}`;req(e.description,`${p} — Description`,`${k}.description`);req(e.streetAddress,`${p} — Street Address`,`${k}.streetAddress`);req(e.cityStateZip,`${p} — City/State/Zip`,`${k}.cityStateZip`);if(e.fullAssetValue<=0)push(`${p} — Full Asset Value must be > 0.`,`${k}.fullAssetValue`);});
  // Milestone 64A-1, item 3.2. Form B-4 (C6/C7) lists unsecured debts --
  // credit cards, medical/facility bills, notes, tax and judgment liens --
  // and secured ones separately; the form never requires every B-4 entry to
  // name a related asset, so relatedProperty is optional. Print shows
  // "Unsecured" when it's blank (pdf-model.js).
  d.scheduleB4.forEach((e,i)=>{const p=`B-4 row ${i+1}`,k=`scheduleB4.${i}`;req(e.lenderName,`${p} — Lender Name`,`${k}.lenderName`);req(e.lenderAddress,`${p} — Lender Address`,`${k}.lenderAddress`);if(e.fullLiabilityBalance<=0)push(`${p} — Full Liability Balance must be > 0.`,`${k}.fullLiabilityBalance`);});
  d.scheduleC1.forEach((e,i)=>{const p=`C-1 row ${i+1}`,k=`scheduleC1.${i}`;req(e.payerName,`${p} — Payer Name`,`${k}.payerName`);req(e.typeOfIncome,`${p} — Type of Income`,`${k}.typeOfIncome`);req(e.payerAddress,`${p} — Payer Address`,`${k}.payerAddress`);req(e.paymentBasis,`${p} — Basis for Payment`,`${k}.paymentBasis`);if(e.annualIncomeAmount<=0)push(`${p} — Annual Income Amount must be > 0.`,`${k}.annualIncomeAmount`);});
  d.scheduleC2.forEach((e,i)=>{const p=`C-2 row ${i+1}`,k=`scheduleC2.${i}`;req(e.claimantName,`${p} — Claimant Name`,`${k}.claimantName`);req(e.lawsuitDescription,`${p} — Lawsuit Description`,`${k}.lawsuitDescription`);req(e.courtJurisdiction,`${p} — Court/Jurisdiction`,`${k}.courtJurisdiction`);req(e.caseNumber,`${p} — Case Number`,`${k}.caseNumber`);if(!e.dateFiled)push(`${p} — Date Filed is required.`,`${k}.dateFiled`);if(e.amountOfClaim<=0)push(`${p} — Amount of Claim must be > 0.`,`${k}.amountOfClaim`);});
  // Milestone 64A-1, item 3.1. Form C-3 (C6) includes lawsuits "intended to
  // be brought, even if not yet filed", and C8/C11 ask for the Action Date
  // and Case Number only "if filed" -- so a not-yet-filed action, which the
  // form explicitly anticipates, has neither. Both are optional; print shows
  // "Not yet filed" for a blank Action Date (pdf-model.js).
  d.scheduleC3.forEach((e,i)=>{const p=`C-3 row ${i+1}`,k=`scheduleC3.${i}`;req(e.defendantName,`${p} — Defendant Name`,`${k}.defendantName`);req(e.actionDescription,`${p} — Action Description`,`${k}.actionDescription`);req(e.status,`${p} — Status`,`${k}.status`);req(e.courtJurisdiction,`${p} — Court/Jurisdiction`,`${k}.courtJurisdiction`);if(e.estimatedSettlement<=0)push(`${p} — Estimated Settlement must be > 0.`,`${k}.estimatedSettlement`);});
  d.scheduleC4.forEach((e,i)=>{const p=`C-4 row ${i+1}`,k=`scheduleC4.${i}`;req(e.trustName,`${p} — Trust Name`,`${k}.trustName`);req(e.trusteeName,`${p} — Trustee Name`,`${k}.trusteeName`);req(e.trusteeAddress,`${p} — Trustee Address`,`${k}.trusteeAddress`);req(e.trusteeCityStateZip,`${p} — Trustee City/State/Zip`,`${k}.trusteeCityStateZip`);if(!e.dateCreated)push(`${p} — Date Created is required.`,`${k}.dateCreated`);if(e.trustAmount<=0)push(`${p} — Trust Amount must be > 0.`,`${k}.trustAmount`);});
  d.scheduleC5.forEach((e,i)=>{const p=`C-5 row ${i+1}`,k=`scheduleC5.${i}`;req(e.assetDescription,`${p} — Asset Description`,`${k}.assetDescription`);req(e.ownerName,`${p} — Owner Name`,`${k}.ownerName`);req(e.ownerAddress,`${p} — Owner Address`,`${k}.ownerAddress`);req(e.ownerCityStateZip,`${p} — Owner City/State/Zip`,`${k}.ownerCityStateZip`);req(e.relationshipToWard,`${p} — Relationship to Ward`,`${k}.relationshipToWard`);if(e.totalAssetValue<=0)push(`${p} — Total Asset Value must be > 0.`,`${k}.totalAssetValue`);});
  // Guardian #1 (index 0) is required and always validated, matching
  // pageD1()'s own always-show-index-0 rule -- only co-guardians (index>0)
  // are optional and skipped when entirely blank. Using the ORIGINAL index
  // for the "Guardian #N" label (not a post-filter index) also fixes a
  // mislabeling bug this filter/forEach split previously had: a co-guardian
  // with data would be mislabeled "Guardian #1" whenever guardian #1 itself
  // was still blank.
  d.guardians.forEach((g,i)=>{if(i>0&&![g.name,g.signatureDate,g.ssnEin,g.phone,g.streetAddress,g.cityStateZip,g.signatureImage,g.isPreparer].some(value=>String(value||'').trim()))return;const p=`D-1 Guardian #${i+1}`,k=`guardians.${i}`;req(g.name,`${p} — Name`,`${k}.name`);errors.push(...checkSignatureState({state:inferLegacySignatureState(g.signatureState,g.signatureDate),date:g.signatureDate,image:g.signatureImage,sectionLabel:p,roleLabel:'',filingType:T,datePath:`${k}.signatureDate`,imagePath:`${k}.signatureImage`}));req(g.ssnEin,`${p} — SSN/EIN`,`${k}.ssnEin`);req(g.phone,`${p} — Phone`,`${k}.phone`);req(g.streetAddress,`${p} — Street Address`,`${k}.streetAddress`);req(g.cityStateZip,`${p} — City/State/Zip`,`${k}.cityStateZip`);});
  // Milestone 67A: the outside-preparer block is required only while nobody
  // is identified as the preparer. The form itself tells a guardian,
  // co-guardian or guardian attorney "DO NOT SIGN HERE"; the Clerk accepts
  // the filing when one of them is named as the preparer instead
  // (src/core/form/preparer-flag.js). The attorney block below is unchanged.
  if(!hasIdentifiedPreparer(d)){
  req(d.preparer.name,'D-2 Preparer — Name','preparer.name');errors.push(...checkSignatureState({state:inferLegacySignatureState(d.preparer.signatureState,d.preparer.signatureDate),date:d.preparer.signatureDate,image:d.preparer.signatureImage,sectionLabel:'D-2 Preparer',roleLabel:'',filingType:T,datePath:'preparer.signatureDate',imagePath:'preparer.signatureImage'}));req(d.preparer.ssnEin,'D-2 Preparer — SSN/EIN','preparer.ssnEin');req(d.preparer.phone,'D-2 Preparer — Phone','preparer.phone');req(d.preparer.streetAddress,'D-2 Preparer — Street Address','preparer.streetAddress');req(d.preparer.cityStateZip,'D-2 Preparer — City/State/Zip','preparer.cityStateZip');
  }
  req(d.attorney.name,'D-2 Attorney — Name','attorney.name');errors.push(...checkSignatureState({state:inferLegacySignatureState(d.attorney.signatureState,d.attorney.signatureDate),date:d.attorney.signatureDate,image:d.attorney.signatureImage,sectionLabel:'D-2 Attorney',roleLabel:'',filingType:T,datePath:'attorney.signatureDate',imagePath:'attorney.signatureImage'}));if(!d.attorney.filingDate)push('D-2 Attorney — Filing Date is required.','attorney.filingDate');req(d.attorney.barNumber,'D-2 Attorney — Bar Number','attorney.barNumber');req(d.attorney.phone,'D-2 Attorney — Phone','attorney.phone');req(d.attorney.streetAddress,'D-2 Attorney — Street Address','attorney.streetAddress');req(d.attorney.cityStateZip,'D-2 Attorney — City/State/Zip','attorney.cityStateZip');
  // "Unanswered" is anything other than Yes or No. New filings start with
  // '', and both explicit strings satisfy the parent answer; the filed
  // question is required only when the parent is Yes.
  if (!sdbAnswered(d.hasSafeDepositBox)) {
    push('D-3 — Safe Deposit Box question must be answered (Yes or No).','hasSafeDepositBox');
  } else if (sdbIsYes(d.hasSafeDepositBox) && !sdbAnswered(d.safeDepositBoxFiled)) {
    push('D-3 — Please indicate whether the Safe Deposit Box inventory has been filed (Yes or No).','safeDepositBoxFiled');
  }
  // Milestone 67B (decided 2026-09-23): nothing in the D-4 bond block gates
  // export. Milestone 57A's Yes/No waiver question and its order-date
  // blocker, and 64A-1 D16's four bond-field requirements, are gone -- the
  // court's form asks for the bond details where they apply, which is not
  // the court refusing a filing without them, and the requester's rule is
  // that blocking should be rare and a warning is enough here. The
  // four-state arrangement question is asked by the sidebar (section-
  // guidance-policy.js) and what it still wants is said on the print preview
  // (src/core/filing/bond-depository.js), never here. The bond-period
  // ordering check below stays: a reversed range is an error, not a blank.
  // Milestone 40C-C. Guardian Inventory was deliberately excluded from
  // Milestone 34-1A's date-ordering work because it has no accounting period,
  // but it does have a bond period, and that pair had no order check at all --
  // only the presence checks above. The removed enforceDateRanges() swap was
  // the sole thing touching it, and it "handled" a reversed range by silently
  // rewriting an endpoint rather than reporting it, so the filer never knew
  // either way. checkDateOrder() is now the one reporter here too.
  errors.push(...checkDateOrder(d.bondPeriodFrom,d.bondPeriodTo,{
    sectionLabel:'D-4',
    earlierLabel:'Bond Period From',
    laterLabel:'Bond Period To',
    filingType:T,laterPath:'bondPeriodTo',
  }));
  // Milestone 57B (D16/D17). This used to require name + address +
  // cityStateZip on EVERY row, so clicking "+ Add Recipient" by accident
  // blocked export until the empty card was filled in or removed. Cards 2+ are
  // now optional -- untouched ones are ignored, started ones must be finished
  // or cleared -- and a filer with nobody to serve can say so.
  //
  // No nav edit is needed here: the Inventory derives its nav state from
  // validate() through errorRoute(), and a section beginning "D-5" buckets onto
  // /d5 automatically.
  {
    const RECIPIENT_FIELDS=[['name','Name'],['address','Address'],['cityStateZip','City/State/Zip']];
    const rec=serviceRecipientIssues({
      rows:d.serviceRecipients,
      attestation:d.serviceNoRecipients,
      startedFields:RECIPIENT_STARTED_FIELDS,
      missingFields:(r)=>RECIPIENT_FIELDS.filter(([k])=>!String(r[k]||'').trim()).map(([,label])=>label),
    });
    if(rec.needsAttestation)req('',`D-5 — ${ATTESTATION_57B}`,'serviceNoRecipients');
    rec.firstRowMissing.forEach(f=>req('',`D-5 Recipient 1 — ${f}`,`serviceRecipients.0.${f==='Name'?'name':f==='Address'?'address':'cityStateZip'}`));
    rec.extraRows.forEach(({index,missing})=>missing.forEach(f=>
      req('',`D-5 Recipient ${index+1} — ${f}`,`serviceRecipients.${index}.${f==='Name'?'name':f==='Address'?'address':'cityStateZip'}`)));
  }
  if(!d.serviceDate)push('D-5 — Service Date is required.','serviceDate');
  // Milestone 64A-2, item 2.4. Form PART VI J24/J25: 'Indicate if:' Ward is
  // totally incapacitated / Ward is under 14 years old / N/A. 'N/A' is a
  // real, complete answer -- not a stand-in for unanswered -- so req()'s
  // truthy check is exactly right: it only flags the empty string.
  req(d.serviceIndicateIf,'D-5 — Indicate if Ward is:','serviceIndicateIf');
  req(d.serviceAttorney.name,'D-5 Attorney — Name','serviceAttorney.name');errors.push(...checkSignatureState({state:inferLegacySignatureState(d.serviceAttorney.signatureState,d.serviceAttorney.signatureDate),date:d.serviceAttorney.signatureDate,image:d.serviceAttorney.signatureImage,sectionLabel:'D-5 Attorney',roleLabel:'',filingType:T,datePath:'serviceAttorney.signatureDate',imagePath:'serviceAttorney.signatureImage'}));req(d.serviceAttorney.barNumber,'D-5 Attorney — Bar Number','serviceAttorney.barNumber');req(d.serviceAttorney.phone,'D-5 Attorney — Phone','serviceAttorney.phone');req(d.serviceAttorney.streetAddress,'D-5 Attorney — Street Address','serviceAttorney.streetAddress');req(d.serviceAttorney.cityStateZip,'D-5 Attorney — City/State/Zip','serviceAttorney.cityStateZip');
  return errors;
}

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
// The three that remain, and why:
//   - addEntry / duplicateEntry: two e2e specs drive them through the bridge on
//     purpose (guardian-inventory-mount, guardian-inventory-tri-state-radios).
//   - validateGuardian: legacy-app.js's production validate() flow calls the
//     global directly (:6675, :7068, :7589). Note the Milestone 40H-A comment at
//     :6661-6665 recording a real bug caused by calling it before assignment --
//     that history is a reason to leave this bridge, and that comment, alone.
window.addEntry = addEntry;
window.duplicateEntry = duplicateEntry;
window.validateGuardian = validateGuardian;
