import { renderSummaryPage, navStatus, formatSummaryDate } from '../../core/summary-renderer.js';
import { renderUcnField } from '../../core/form/cards/case-caption-card.js';
import { withMinusCue } from '../../core/form/amount-codec.js';
import { renderFormField, renderSelectField } from '../../core/form/form-fields.js';
import { GUARDIANSHIP_TYPE_OPTIONS, optionsWithLegacyValue } from '../../core/form/guardianship-options.js';
import { checkDateOrder } from '../../core/validation/date-rules.js';
// Milestone 51F: the capacity rule has ONE implementation. This used to come
// off `window` from a legacy-app.js twin that duplicated core's logic verbatim
// (remuneration-filtering comment included), so the print-page capacity panel
// and the export gate ran two separate copies of the same court-facing rule.
import { checkExcelCapacity } from '../../core/excel/excel-capacity.js';
import { addCollectionRow, removeCollectionRow } from '../../core/form/schedule-definitions.js';
import { createSimplifiedGuardian, getSimplifiedGuardianAddressConflicts, normalizeSimplifiedGuardianCompatibility, resolveSimplifiedGuardianAddressConflict } from './guardian-compatibility.js';
import { checkSignatureState, inferLegacySignatureState } from '../../core/validation/signature-state.js';
import { issueFactory } from '../../core/validation/validation-issue.js';
import { createIssue } from '../../core/validation/issue-registry.js';
import { renderSignatureStateControl, mountSignatureStateControls, signatureDateRequired } from '../../core/signature/signature-state-control.js';
import { preparerNoteHTML } from '../../core/signature/preparer-note.js';
import { confirmModal } from '../../core/ui/dialogs.js';
// Milestone 41-3: only renderReportingPeriodFields() fits this filing type,
// and it fits twice (the Cover page's "Accounting Period" pair and the Part
// III Declaration's "Period" pair, each with its own label wording). The
// other Tier 2 cards genuinely don't apply here, confirmed by reading the
// real markup rather than assumed: wardName has no column wrapper at all
// (it sits directly in the summary-box), caseNumber uses the tooltip
// variant inpSWithTooltip() rather than plain inpS(), and county lives in a
// different box entirely (paired col-md-8/col-md-4 with the attorney field),
// so caseNumber and county are never adjacent -- which is
// renderCaseCaptionFields()'s whole premise. This type has no residence
// fields and no guardian block shaped like the Plan types'. Its remaining
// hand-rolled fields are all collection rows (certRecipients, remuneration),
// which the milestone's own Collection Grid Boundary (AGENTS.md section 3)
// explicitly keeps on per-form row factories, not cards.
import { renderReportingPeriodFields } from '../../core/form/cards/ward-demographics-card.js';
// Milestone 60I/60J: the Part VII instruction is the statute's own text, the
// same constant the PDF prints, so the page a filer reads and the document
// they sign cannot drift apart.
import { REMUNERATION_DECLARATION } from '../../core/filing/statutory-text.js';
import { serviceRecipientIssues, RECIPIENTS_OR_ATTESTATION, NO_RECIPIENTS_QUESTION } from '../../core/validation/service-recipients.js';
import { renderServiceAttestationRow } from '../../core/form/service-attestation-visibility.js';
import { esc } from '../../core/filing/escape-html.js';
import { ic } from '../../core/ui/icons.js';
import { formatAddress, formatName, formatPhone, formatSSN } from '../../core/form/form-contract.js';
import { amountBoxText } from '../../core/form/amount-codec.js';
import { formatDisplayDate } from '../../core/form/date-parser.js';
import { calcTotals } from './totals.js';
import { rowStarted } from '../../core/validation/row-started.js';
import { sectionMarks } from '../../core/status/section-marks.js';
import { getCaseFile, getD, requestSave } from '../../core/state.js';
import { startingBalanceNotesHTML } from '../../core/filing/starting-balance-carry.js';
import { updateNavDots } from '../../core/status/nav-marks.js';
import { browserRecommendationNotice, linkAccordions } from '../../core/form/form-runtime.js';
import { isAttorneyStarted } from '../../core/validation/attorney-block.js';
import { formatMoney } from '../../core/format/money.js';
import { resolveServiceCertifier, certifyingCandidates, serviceCertifierChoiceHTML } from '../../core/filing/unrepresented-filing.js';
import { watchAttorneyRequiredMarkers } from '../../core/form/attorney-required-markers.js';

// Milestone 71B: the attorney fields that become required once an attorney is
// started (and only then), per page -- the live markers and
// validateSimplified() share the rule. Section 744.3679(3): a Simplified
// Accounting needs no attorney at all.
const SIMPLIFIED_ATTORNEY_REQUIRED = {
  '/': ['attorney'],
  '/p5': ['attorney', 'attorney_barNumber', 'attorney_phone', 'attorney_email', 'attorney_street', 'attorney_cityStateZip'],
  // Milestone 73F part 3: Part VI repeats the attorney's name for the certificate.
  '/p6': ['attorney'],
};
const SIMPLIFIED_ATTORNEY_TRIGGERS = ['attorney', 'attorney_barNumber', 'attorney_phone', 'attorney_email', 'attorney_secondaryEmail', 'attorney_street', 'attorney_cityStateZip', 'attorney_signatureDate', 'attorney_signatureState'];
const attorneyMarkerAborts = new WeakMap();
import { renderScheduleDocsSection } from '../../core/filing/schedule-docs.js';
import { fillAttorneyFromOldCertificate, discardOldCertificateDetails, moveWardStatusFromMethod } from '../../core/filing/certificate-migrations.js';
import { WARD_STATUS_VALUES, SERVICE_METHOD_LABEL, SERVICE_METHOD_KIND } from '../../core/filing/service-method.js';
import { oldCertificateDetailsHTML } from '../../core/form/certificate-attorney-note.js';
import { auditLog } from '../../core/activity/audit-log.js';
import { countyInputS, inpS, pageIntroRow, pageNavS, yesNoCheckboxS } from '../../core/form/field-html.js';
import { setPath } from '../../core/form/paths.js';
import { tooltip } from '../../core/help/tooltips.js';
import { openFloridaCourtPortal } from '../../core/shell/court-portal.js';
import { navigate } from '../../core/navigation/router.js';
import { afterAdd, afterRemove, onChange, rowTarget } from '../../core/navigation/draw-reason.js';
import { commitModelChange } from '../../core/model-change.js';
import { collectSimplifiedIssues, RECIPIENT_STARTED_FIELDS } from '../../core/validation/engines/simplified.js';
// Milestone 57B: carried verbatim from MILESTONE-57-PROPOSAL.md section 57B.
// The wording is load bearing (section 8 #8). Do not paraphrase or re-voice it.
// Milestone 74F: the certificate's question is the one constant (service-recipients.js).
const ATTESTATION_57B = NO_RECIPIENTS_QUESTION;
// Milestone 63B: what makes a Part VI recipient card "started". One list for the
// validator and for the page, which shows the attestation only while Recipient 1
// is not started, so the two read the same data the same way.
// Simplified Accounting — the pilot feature extraction (Milestone 2, Phase
// D of INDEX-SPLIT-PLAN.md's migration sequence). Dynamically imported by
// src/features-loader.js (it was legacy-app.js's mountSimplifiedFeature() and
// mountSimplifiedNav() bridges), never statically imported, so this module's ~700 lines and its own
// print.js/excel.js children genuinely aren't fetched/evaluated until a
// user actually opens or creates a Simplified Accounting ward.
//
// Until Milestone 70's 70K it took navigate() off window as it loaded (the
// monolith's); it imports the router's. calcTotals lives in ./totals.js,
// small enough that src/features-loader.js loads it eagerly for the
// dashboard's card total while this module stays lazy.

// print.js/excel.js are dynamically imported once, together, the first time
// this feature mounts (not deferred further to an actual /print visit or
// export click) -- the Cover page's own "Import Excel File" dropzone needs
// excel.js before the user ever navigates to /print, so deferring it past
// first mount would mean wiring a second, separate lazy-load path for just
// that one control. This still gets the real win:
// nothing here loads until a Simplified ward is actually opened or created.
let _printModule = null;
let _excelModule = null;
let _lazyModulesPromise = null;
const eventControllers = new WeakMap();
// Milestone 39-C: see plan-annual/index.js's identical comment.
const signatureHandles = new WeakMap();

function bindEvents(container) {
  eventControllers.get(container)?.abort();
  const controller = new AbortController();
  eventControllers.set(container, controller);
  const options = { signal: controller.signal };

  container.addEventListener('click', async (event) => {
    const actionElement = event.target instanceof Element ? event.target.closest('[data-simplified-action]') : null;
    if (!actionElement) return;
    const index = Number.parseInt(actionElement.dataset.index, 10);
    switch (actionElement.dataset.simplifiedAction) {
      case 'add-guardian': {
        if (addCollectionRow('guardians', getD(), createSimplifiedGuardian)) {
          commitModelChange('collection-add', ['guardians']);
          navigate('/p4', onChange(afterAdd(getD(), 'guardians')));
        }
        break;
      }
      case 'remove-guardian': {
        if (index > 0 && rowStarted(getD().guardians?.[index]) && !(await confirmModal(`Remove co-guardian ${getD().guardians[index].name || `#${index + 1}`}? This will delete the entered signature information.`))) break;
        if (removeCollectionRow('guardians', index, getD())) {
          commitModelChange('collection-remove', ['guardians']);
          navigate('/p4', onChange(afterRemove(getD(), 'guardians', index)));
        }
        break;
      }
      case 'add-recipient': {
        if (addCollectionRow('certRecipients', getD())) {
          commitModelChange('collection-add', ['certRecipients']);
          navigate('/p6', onChange(afterAdd(getD(), 'certRecipients')));
        }
        break;
      }
      case 'remove-recipient': {
        if (removeCollectionRow('certRecipients', index, getD())) {
          commitModelChange('collection-remove', ['certRecipients']);
          navigate('/p6', onChange(afterRemove(getD(), 'certRecipients', index)));
        }
        break;
      }
      case 'add-remuneration': {
        // Milestone 60J (Annual's 58D rule): adding an entry answers Part VII
        // by itself, so a previously ticked "none to report" declaration is
        // withdrawn rather than left to contradict the row being added
        // (appendRow() does it, for every form, since 73F part 3).
        if (addCollectionRow('remuneration', getD())) {
          commitModelChange('collection-add', ['remuneration', 'scheduleNoItems.remuneration']);
          navigate('/p7', onChange(afterAdd(getD(), 'remuneration')));
        }
        break;
      }
      case 'choose-excel': actionElement.parentElement.querySelector('input[type="file"]')?.click(); break;
      // Milestone 72H: the filer's explicit deletion of the old Part VI details.
      case 'discard-old-certificate-details': {
        if (discardOldCertificateDetails(getD(), 'simplified')) commitModelChange('certificate-details-discarded');
        navigate('/p6', onChange());
        break;
      }
      case 'open-court-portal': openFloridaCourtPortal(); break;
      case 'remove-remuneration': {
        if (removeCollectionRow('remuneration', index, getD())) {
          commitModelChange('collection-remove', ['remuneration']);
          navigate('/p7', onChange(afterRemove(getD(), 'remuneration', index)));
        }
        break;
      }
      case 'save-excel': _excelModule.doSaveExcel(); break;
      case 'save-pdf': _printModule.doSavePdf(); break;
      case 'resolve-guardian-address-conflict': {
        if (resolveSimplifiedGuardianAddressConflict(getD(), index, actionElement.dataset.field, actionElement.dataset.choice)) {
          commitModelChange('address-conflict-resolved', ['guardians']);
          navigate('/p4', onChange(rowTarget('guardians', getD().guardians?.[index])));
        }
        break;
      }
    }
  }, options);
  container.addEventListener('change', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.dataset.simplifiedChange === 'schedule-no-items') {
      if (!getD().scheduleNoItems) getD().scheduleNoItems = {};
      getD().scheduleNoItems[input.dataset.schedule] = input.checked;
      commitModelChange('no-items', [`scheduleNoItems.${input.dataset.schedule}`]);
      updateNavDots();
      return;
    }
    if (input instanceof HTMLInputElement && input.dataset.simplifiedChange === 'import-excel') _excelModule.importExcel(input);
  }, options);
  container.addEventListener('input', (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.simplifiedRefresh === 'part2') queueMicrotask(refreshPart2);
  }, options);
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
  normalizeSimplifiedGuardianCompatibility(getD(), { persistedSource: true });
  // Milestone 72H: once, each detail typed on the old Part VI certificate
  // fills Part V's matching field where that one is blank; the log names the
  // fields, never their values (certificate-migrations.js).
  const certFilled = fillAttorneyFromOldCertificate(getD(), 'simplified');
  if (certFilled) {
    requestSave();
    if (certFilled.length) void auditLog('CERTIFICATE_MIGRATION', `Part V attorney fields filled from the old Part VI certificate: ${certFilled.join(', ')}`, true);
  }
  // Milestone 72G: once, a ward's status typed into the method box moves to
  // Indicate if Ward is:, exact matches only; logged by field name.
  const statusMove = moveWardStatusFromMethod(getD());
  if (statusMove) {
    requestSave();
    if (statusMove.moved) void auditLog('CERTIFICATE_MIGRATION', "Part VI: the ward's status moved from the method-of-service box (certIndicator) to Indicate if Ward is (certWardStatus)", true);
  }
  let html;
  switch (page) {
    case '/':      html = pageCover(); break;
    case '/summary': html = renderSummaryPage(getSummaryConfigSimplified()); break;
    case '/p2':    html = pagePart2(); break;
    case '/p3':    html = pagePart3(); break;
    case '/p4':    html = pagePart4(); break;
    case '/p5':    html = pagePart5(); break;
    case '/p6':    html = pagePart6(); break;
    case '/p7':    html = pagePart7(); break;
    case '/print': {
      const capOver = checkExcelCapacity(_excelModule.SIMPLIFIED_EXCEL_CAPS, getD());
      html = _printModule.pagePrintSimplified(capOver);
      break;
    }
    default: html = pageCover();
  }
  container.innerHTML = html;
  bindEvents(container);
  container.scrollTop = 0;
  if (page === '/' || !page) linkAccordions('instructionsZoneSimplified', 'importZoneCover');
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  if (page === '/p4' || page === '/p5' || page === '/p6') {
    signatureHandles.set(container, mountSignatureStateControls(container, {
      setImage: (imagePath, dataUrl) => setPath(getD(), imagePath, dataUrl),
      route: page,
    }));
  }
  attorneyMarkerAborts.get(container)?.abort();
  attorneyMarkerAborts.delete(container);
  const markerPaths = SIMPLIFIED_ATTORNEY_REQUIRED[page || '/'];
  if (markerPaths) {
    attorneyMarkerAborts.set(container, watchAttorneyRequiredMarkers(container, {
      engineId: 'simplified', paths: markerPaths, triggerPaths: SIMPLIFIED_ATTORNEY_TRIGGERS,
    }));
  }
  if (page === '/print') await _printModule.mountPreview();
}

export function dispose(container) {
  eventControllers.get(container)?.abort();
  eventControllers.delete(container);
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  attorneyMarkerAborts.get(container)?.abort();
  attorneyMarkerAborts.delete(container);
  container.replaceChildren();
}

export function mountNav(container) {
  buildNavSimplified(container);
}

// fmtS and validateSimplified are also used by print.js/excel.js (which
// import them back from here via a static `import` -- safe despite this
// module dynamically importing them, since neither side needs the other's
// export until a function body actually runs, well after both are loaded).
// Milestone 71E: formatMoney() -- the Clerk's workbook's own rounding; ($1,234.56) for a negative.
export function fmtS(n){if(n===''||n===null||n===undefined)return '';const v=parseFloat(n);if(isNaN(v))return '';return formatMoney(v,{style:'dollarParens'});}
// Milestone 73H: on a screen a negative also says "minus" to a screen reader
// (withMinusCue()); the figures are as before, the one style every form uses.
const fmtH=(v)=>withMinusCue(fmtS(v));

function inpSWithTooltip(id,label,tooltipKey,val,req=false,type='text'){
  const html=inpS(id,label,val,req,type);
  const tooltipHtml=tooltip(tooltipKey);
  if(!tooltipHtml)return html;
  const escapedLabel=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return html.replace(new RegExp(`(>)(${escapedLabel})(<span class="req">\\*</span>)?(<\/label>)`),`$1$2${tooltipHtml}$3$4`);
}

function buildNavSimplified(container){
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Simplified Annual Accounting</div>
      <button class="nav-link-item" data-page="/" data-nav="s-cover" data-form-action="navigate" data-route="/">Cover &amp; Part I</button>
      <button class="nav-link-item" data-page="/summary" data-nav="s-summary" data-form-action="navigate" data-route="/summary">Summary</button>
      <button class="nav-link-item" data-page="/p2" data-nav="s-p2" data-form-action="navigate" data-route="/p2">Part II — Accounting</button>
      <button class="nav-link-item" data-page="/p3" data-nav="s-p3" data-form-action="navigate" data-route="/p3">Part III — Declaration</button>
      <button class="nav-link-item" data-page="/p4" data-nav="s-p4" data-form-action="navigate" data-route="/p4">Part IV — Guardians</button>
      <button class="nav-link-item" data-page="/p5" data-nav="s-p5" data-form-action="navigate" data-route="/p5">Part V — Atty Signature</button>
      <button class="nav-link-item" data-page="/p6" data-nav="s-p6" data-form-action="navigate" data-route="/p6">Part VI — Cert. of Service</button>
      <button class="nav-link-item" data-page="/p7" data-nav="s-p7" data-form-action="navigate" data-route="/p7">Part VII — Remuneration</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function getSummaryConfigSimplified(){
  const d=getD();
  // This filing's own section marks (Milestone 73F part 2: from the export
  // checks, src/core/status/section-marks.js; 70D's per-type evaluator before).
  const nav=sectionMarks(d);
  const t=calcTotals();
  const f=v=>fmtH(v)||'—';
  return {
    formTitle:'Simplified Annual Accounting — Summary',
    infoRows:[
      {label:'Ward Name',value:esc(d.wardName)},
      {label:'Case Number',value:esc(d.caseNumber)},
      {label:'Period',value:formatSummaryDate(d.periodFrom)+' – '+formatSummaryDate(d.periodTo)},
      {label:'Guardian',value:esc(d.guardian)},
      {label:'Attorney',value:esc(d.attorney)},
      {label:'County',value:esc(d.county)},
      {label:'Type of Guardianship',value:esc(d.typeOfGuardianship)},
    ],
    leftCards:[{
      heading:'Accounting Summary',
      lines:[
        {label:'Line 1 — Starting Balance',value:f(d.startingBalance)},
        {label:'Line 2 — Interest Income',value:f(d.interestIncome)},
        {label:'Line 3 — Deposits from Settlement',value:f(d.depositsSettlement)},
        {label:'Line 4 — Total Income',value:f(t.totalIncome)},
        {label:'Line 5 — Service Charges',value:f(d.serviceCharges)},
        {label:'Line 6 — Federal Income Tax',value:f(d.federalIncomeTax)},
        {label:'Line 7 — Total Disbursements',value:f(t.totalDisbursements)},
        {label:'Line 8 — Remaining Assets On Hand',value:f(t.remaining),isTotal:true},
      ],
    }],
    rightCards:[{
      heading:'Section Completion',
      lines:[
        {label:'Cover &amp; Part I',route:'/',status:navStatus(nav,'s-cover')},
        {label:'Part II — Accounting',route:'/p2',status:navStatus(nav,'s-p2')},
        {label:'Part III — Declaration',route:'/p3',status:navStatus(nav,'s-p3')},
        {label:'Part IV — Guardians',route:'/p4',status:navStatus(nav,'s-p4')},
        {label:'Part V — Atty Signature',route:'/p5',status:navStatus(nav,'s-p5')},
        {label:'Part VI — Cert. of Service',route:'/p6',status:navStatus(nav,'s-p6')},
        {label:'Part VII — Remuneration',route:'/p7',status:navStatus(nav,'s-p7')},
      ],
    }],
    banner:{title:'SIMPLIFIED ACCOUNTING — YEAR-ENDING ASSETS',value:f(t.remaining)},
    nextRoute:'/p2',
  };
}

// ── Cover / Part I ──────────────────────────────────────
function pageCover(){
  const d=getD();
  const t=calcTotals();
  return `<div class="schedule-page">
    <h1>Cover &amp; Part I — Required Information</h1>
    <div class="instructions-import-row">
      <div class="accordion mb-0">
        <div class="accordion-item">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#instructionsZoneSimplified" aria-expanded="false">
              ${ic('clipboard',15)} General Instructions
            </button>
          </h2>
          <div id="instructionsZoneSimplified" class="accordion-collapse collapse">
            <div class="accordion-body" style="padding:1rem 1.25rem;">
              <ul style="margin:0;padding-left:1.4rem;font-size:.8rem;">
                <li>Fields marked with an asterisk (<span class="req">*</span>) are required before export; the UCN is starred as a reminder and never blocks.</li>
                <li>Ward Name and Case Number auto-populate all form pages.</li>
                <li>Verify that this guardianship meets the designated depository criteria under Fla. Stat. § 744.3679.</li>
                <li>Complete Parts I through VII, including the guardians' signatures; Part V only if an attorney represents the guardian.</li>
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
            <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZoneCover" aria-expanded="false">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing simplified accounting template)
            </button>
          </h2>
          <div id="importZoneCover" class="accordion-collapse collapse">
            <div class="accordion-body import-zone-body p-4 text-center">
              <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
                <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
                <input type="file" accept=".xlsx" class="d-none" data-simplified-change="import-excel">
              </label>
              <p class="mt-2 mb-0" style="color:var(--ink-3);font-size:.8rem;">Select the previously exported Simplified Accounting Excel file</p>
              <div id="import-progress" class="mt-2" style="font-size:.8rem;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="summary-box mb-3">
      <h2 class="subsection-heading">Eligibility — Fla. Stat. § 744.3679</h2>
      <div class="schedule-instructions" style="margin-bottom:.75rem;">The simplified form may only be used when <strong>all</strong> property of the estate is held in a designated depository under § 69.031, and the <strong>only</strong> transactions in that account are interest accrual, deposits from a settlement, or financial institution service charges. If either answer below is "No," use the standard Annual Accounting instead.</div>
      <div class="row g-3">
        <div class="col-md-6">${yesNoCheckboxS('eligDepository','All estate property is held in a designated depository under § 69.031',d.eligDepository,true)}</div>
        <div class="col-md-6">${yesNoCheckboxS('eligOnlyTransactions','The only account transactions are interest accrual, settlement deposits, and/or service charges',d.eligOnlyTransactions,true)}</div>
      </div>
      ${(d.eligDepository==='No'||d.eligOnlyTransactions==='No')?'<div class="mt-2" style="color:var(--danger-text);font-weight:600;font-size:.85rem;">⚠ This guardianship does not appear to qualify for the simplified form. Please use the standard Annual Accounting.</div>':''}
    </div>
    <div class="row g-3 mb-3 cover-info-row">
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Required Information</h2>
          ${inpS('wardName','Name of Ward',d.wardName,true)}
          <div class="row g-2">
            <div class="col-md-6">${inpSWithTooltip('caseNumber','Case Number','case_number',d.caseNumber,true)}</div>
            <div class="col-md-6">${inpS('ssn','Social Security Number',d.ssn,true)}</div>
          </div>
          <div class="row g-2">
            <div class="col-md-6">${renderUcnField(d.ucn,{id:'ucn'})}</div>
          </div>
          <div class="row g-2">
            <div class="col-md-6">${inpS('gid','Guardianship Inception Date (GID)',d.gid,true,'date')}</div>
            <div class="col-md-6">${yesNoCheckboxS('amendedForm','Amended Form?',d.amendedForm,true)}</div>
          </div>
          <div class="row g-2">
            ${renderReportingPeriodFields({ periodFrom: d.periodFrom, periodTo: d.periodTo, fromLabel: 'Accounting Period From', toLabel: 'Accounting Period To' })}
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Guardian &amp; Attorney</h2>
          ${inpS('guardian','Guardian',d.guardian,true)}
          <div class="row g-2">
            <div class="col-md-8">${inpS('attorney','Attorney for Guardian',d.attorney,isAttorneyStarted(d,'simplified'))}</div>
            <div class="col-md-4">${countyInputS('county','County',d.county,true)}</div>
          </div>
          ${renderSelectField({path:'typeOfGuardianship',label:'Type of Guardianship',value:d.typeOfGuardianship,options:optionsWithLegacyValue(GUARDIANSHIP_TYPE_OPTIONS,d.typeOfGuardianship),required:true})}
        </div>
      </div>
    </div>
    <div style="position:relative;min-height:200px;">
      <div class="summary-box mt-3">
        <h2 class="subsection-heading">Part II — Accounting Summary</h2>
        <div class="summary-line"><span>Starting Balance (Line 1)</span><span>${fmtH(d.startingBalance)||'—'}</span></div>
      <div class="summary-line"><span>Interest Income (Line 2)</span><span>${fmtH(d.interestIncome)||'—'}</span></div>
      <div class="summary-line"><span>Deposits from Settlement (Line 3)</span><span>${fmtH(d.depositsSettlement)||'—'}</span></div>
      <div class="summary-line"><span>Total Income (Line 4)</span><span>${fmtH(t.totalIncome)}</span></div>
      <div class="summary-line"><span>Service Charges (Line 5)</span><span>${fmtH(d.serviceCharges)||'—'}</span></div>
      <div class="summary-line"><span>Federal Income Tax (Line 6)</span><span>${fmtH(d.federalIncomeTax)||'—'}</span></div>
      <div class="summary-line"><span>Total Disbursements (Line 7)</span><span>${fmtH(t.totalDisbursements)}</span></div>
      <div class="summary-line total"><span>Remaining Assets On Hand (Line 8)</span><span>${fmtH(t.remaining)}</span></div>
    </div>
    </div>
    ${pageNavS(null,'/summary')}
  </div>`;
}

// ── Part II – Accounting ────────────────────────────────
function pagePart2(){
  const d=getD();
  const t=calcTotals();
  return `<div class="schedule-page">
    <h1>Part II — Accounting Summary &amp; Remaining Assets On Hand</h1>
    <div class="schedule-instructions">Only interest income, deposits from settlement, financial institution service charges, and payment of federal income tax qualify for this simplified form.</div>
    <div class="entry-card">
      <div class="entry-card-header">Assets On Hand</div>
      <div class="entry-card-body">
        <div class="line-row">
          <span class="line-tag">Line 1</span>
          <span class="line-label">Starting Balance — Net Assets per Prior Report<span class="req">*</span></span>
          <div class="line-input"><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="text" class="form-control" id="startingBalance" value="${esc(amountBoxText(d.startingBalance))}" data-form-path="startingBalance" data-form-format="signed-decimal" data-field-blank="keep" data-simplified-refresh="part2"></div>${startingBalanceNotesHTML(d,{wards:getCaseFile()?.wards||null})}</div>
        </div>
      </div>
    </div>
    <div class="entry-card">
      <div class="entry-card-header">Income — Only the following receipts qualify</div>
      <div class="entry-card-body">
        <div class="line-row">
          <span class="line-tag">Line 2</span>
          <span class="line-label">Interest Income<span class="req">*</span></span>
          <div class="line-input"><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" id="interestIncome" value="${esc(amountBoxText(d.interestIncome,{blankZero:true}))}" data-form-path="interestIncome" data-form-format="decimal" data-simplified-refresh="part2"></div></div>
        </div>
        <div class="line-row">
          <span class="line-tag">Line 3</span>
          <span class="line-label">Deposits Pursuant to Settlement<span class="req">*</span></span>
          <div class="line-input"><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" id="depositsSettlement" value="${esc(amountBoxText(d.depositsSettlement,{blankZero:true}))}" data-form-path="depositsSettlement" data-form-format="decimal" data-simplified-refresh="part2"></div></div>
        </div>
        <div class="line-row total-line">
          <span class="line-tag">Line 4</span>
          <span class="line-label">Total Income</span>
          <span class="line-val" id="line4">${fmtH(t.totalIncome)}</span>
        </div>
      </div>
    </div>
    <div class="entry-card">
      <div class="entry-card-header">Disbursements — Only the following qualify</div>
      <div class="entry-card-body">
        <div class="line-row">
          <span class="line-tag">Line 5</span>
          <span class="line-label">Financial Institution Service Charges<span class="req">*</span></span>
          <div class="line-input"><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" id="serviceCharges" value="${esc(amountBoxText(d.serviceCharges,{blankZero:true}))}" data-form-path="serviceCharges" data-form-format="decimal" data-simplified-refresh="part2"></div></div>
        </div>
        <div class="line-row">
          <span class="line-tag">Line 6</span>
          <span class="line-label">Federal Income Tax<span class="req">*</span></span>
          <div class="line-input"><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" id="federalIncomeTax" value="${esc(amountBoxText(d.federalIncomeTax,{blankZero:true}))}" data-form-path="federalIncomeTax" data-form-format="decimal" data-simplified-refresh="part2"></div></div>
        </div>
        <div class="line-row total-line">
          <span class="line-tag">Line 7</span>
          <span class="line-label">Total Disbursements</span>
          <span class="line-val" id="line7">${fmtH(t.totalDisbursements)}</span>
        </div>
      </div>
    </div>
    <div class="schedule-totals">
      <div class="tbl"><div class="tr"><div class="td"><strong>Line 8 — Remaining Assets On Hand</strong></div><div class="td" id="line8">${fmtH(t.remaining)}</div></div></div>
    </div>
    ${renderScheduleDocsSection('p2')}
    ${pageNavS('/summary','/p3')}
  </div>`;
}

function refreshPart2(){
  const t=calcTotals();
  const l4=document.getElementById('line4');
  const l7=document.getElementById('line7');
  const l8=document.getElementById('line8');
  if(l4)l4.innerHTML=fmtH(t.totalIncome);
  if(l7)l7.innerHTML=fmtH(t.totalDisbursements);
  if(l8)l8.innerHTML=fmtH(t.remaining);
}

// ── Part III – Declaration ──────────────────────────────
function pagePart3(){
  const d=getD();
  return `<div class="schedule-page">
    <h1>Part III — Guardian(s) Declaration</h1>
    <div class="attestation-text">Under penalties of perjury, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and disbursements.</div>
    <div class="schedule-instructions">These dates should match the accounting period on the Cover page. They will appear in the printed Part III declaration.</div>
    <div class="row g-3">
      ${renderReportingPeriodFields({ periodFrom: d.periodFrom, periodTo: d.periodTo, fromLabel: 'Period From', toLabel: 'Period To' })}
    </div>
    ${renderScheduleDocsSection('p3')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

// ── Part IV – Guardians ─────────────────────────────────
function pagePart4(){
  const d=getD();
  const conflicts=getSimplifiedGuardianAddressConflicts(d);
  const labels=['Guardian #1','Co-Guardian #2','Co-Guardian #3'];
  const cards=(d.guardians||[]).map((g,i)=>{
    const removeBtn=i===0?'':`<button type="button" class="btn btn-outline-danger btn-sm" data-simplified-action="remove-guardian" data-index="${i}">✕ Remove</button>`;
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>${labels[i]||`Co-Guardian #${i+1}`}</span><span class="entry-card-actions d-flex gap-2"><button type="button" class="btn btn-outline-secondary btn-sm" data-form-action="link-party" data-role="guardian" data-index="${i}">Link Person</button>${removeBtn}</span></div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-6">${renderFormField({ path: `guardians.${i}.name`, label: `${labels[i]||`Co-Guardian #${i+1}`}'s Name`, value: g.name, required: true })}</div>
          <div class="col-md-3">${renderFormField({ path: `guardians.${i}.signatureDate`, label: 'Signature Date', value: g.signatureDate, type: 'date', required: signatureDateRequired({ path: `guardians.${i}`, state: g.signatureState }), id: `guardians_${i}_sigDate` })}</div>
          <div class="col-12">${renderSignatureStateControl({ path: `guardians.${i}`, state: g.signatureState, date: g.signatureDate, route: '/p4', signatureImage: g.signatureImage })}</div>
          <div class="col-md-3">${renderFormField({ path: `guardians.${i}.ssn`, label: 'SSN / EIN', value: g.ssn, required: true })}</div>
          <div class="col-md-4">${renderFormField({ path: `guardians.${i}.phone`, label: 'Phone Number', value: g.phone, required: true })}</div>
          <div class="col-md-8">${renderFormField({ path: `guardians.${i}.email`, label: 'Email Address', value: g.email, type: 'email' })}</div>
          <div class="col-md-6">${renderFormField({ path: `guardians.${i}.mailingStreet`, label: 'Mailing Street Address', value: g.mailingStreet, required: true })}</div>
          <div class="col-md-6">${renderFormField({ path: `guardians.${i}.mailingCityStateZip`, label: 'Mailing City / State / Zip', value: g.mailingCityStateZip, required: true })}</div>
          <div class="col-md-6">${renderFormField({ path: `guardians.${i}.residenceStreet`, label: 'Residence / Corporate Street Address', value: g.residenceStreet, required: true })}</div>
          <div class="col-md-6">${renderFormField({ path: `guardians.${i}.residenceCityStateZip`, label: 'Residence / Corporate City / State / Zip', value: g.residenceCityStateZip, required: true })}</div>
        </div>
      </div>
    </div></div>`;
  }).join('');
  const addCoBtn=(d.guardians||[]).length<3?`<button type="button" class="btn btn-outline-secondary btn-sm mb-3 no-print" data-simplified-action="add-guardian">+ Add Co-Guardian</button>`:'';
  const conflictControls=conflicts.map(conflict=>`<div class="validation-panel mb-3"><div class="validation-title">Guardian address needs your decision</div><div class="validation-sub">Guardian #${conflict.rowIndex+1}: the saved residence value and recovered legacy value differ.</div><div class="d-flex gap-2 mt-2"><button type="button" class="btn btn-outline-secondary btn-sm" data-simplified-action="resolve-guardian-address-conflict" data-index="${conflict.rowIndex}" data-field="${conflict.field}" data-choice="canonical">Keep residence value</button><button type="button" class="btn btn-outline-primary btn-sm" data-simplified-action="resolve-guardian-address-conflict" data-index="${conflict.rowIndex}" data-field="${conflict.field}" data-choice="legacy">Use recovered legacy value</button></div></div>`).join('');
  return `<div class="schedule-page"><h1>Part IV — Guardian(s) Information</h1>
  ${preparerNoteHTML()}
  <div class="schedule-instructions">All guardians of the property must sign and provide the most current address, telephone number, and social security number. Only reports with original signatures will be audited by the Clerk of the Court.</div>
  ${conflictControls}
  <div class="row g-3 card-grid-2col mb-3">${cards}</div>
  ${addCoBtn}
  ${renderScheduleDocsSection('p4')}${pageNavS('/p3','/p5')}</div>`;
}

// ── Part V – Attorney Signature ─────────────────────────
function pagePart5(){
  const d=getD();
  return `<div class="schedule-page">
    <h1>Part V — Guardian Attorney Signature</h1>
  ${preparerNoteHTML()}
    ${isAttorneyStarted(d,'simplified')?'':`<div class="alert alert-secondary" role="status" data-no-attorney-notice>
      <strong>No attorney is entered</strong>, so this part is not required: a guardian need not be represented by an attorney to file a simplified annual accounting (§744.3679(3), Florida Statutes). The filed PDF prints this attestation with the attorney's signature block blank, as the Clerk's form does. If an attorney represents the guardian, enter them below and this part becomes required.
    </div>`}
    <div class="attestation-text">The undersigned Attorney hereby notifies the Court of the filing of the simplified annual accounting of the Guardian. This simplified annual accounting is the representation of the guardian. The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law.</div>
    <div class="row g-3 card-grid-2col">
      <div class="col-12 col-lg-6">
        <div class="entry-card mb-0 h-100">
          <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>Guardian Attorney Attestation</span><button type="button" class="btn btn-outline-secondary btn-sm" data-form-action="link-party" data-role="attorney" data-index="0">Link Person</button></div>
          <div class="entry-card-body">
            <div class="row g-2">
              <div class="col-md-6">${inpS('attorney','Attorney Name (linked to Part I)',d.attorney)}</div>
              <div class="col-md-3">${inpSWithTooltip('attorney_signatureDate','Signature Date','signature_date',d.attorney_signatureDate,signatureDateRequired({ path: 'attorney', state: d.attorney_signatureState }),'date')}</div>
              <div class="col-12">${renderSignatureStateControl({ path: 'attorney', state: d.attorney_signatureState, date: d.attorney_signatureDate, route: '/p5', signatureImage: d.attorney_signatureImage, statePath: 'attorney_signatureState', imagePath: 'attorney_signatureImage' })}</div>
              <div class="col-md-3">${inpS('attorney_barNumber','Bar Number',d.attorney_barNumber,isAttorneyStarted(d,'simplified'))}</div>
              <div class="col-md-4">${inpS('attorney_phone','Phone Number',d.attorney_phone,isAttorneyStarted(d,'simplified'))}</div>
              <div class="col-md-4">${inpS('attorney_email','Primary Email (e-filing)',d.attorney_email,isAttorneyStarted(d,'simplified'),'email')}</div>
              <div class="col-md-4">${inpS('attorney_secondaryEmail','Secondary Email (optional)',d.attorney_secondaryEmail,false,'email')}</div>
              <div class="col-md-8">${inpS('attorney_street','Street Address',d.attorney_street,isAttorneyStarted(d,'simplified'))}</div>
              <div class="col-md-4">${inpS('attorney_cityStateZip','City / State / Zip Code',d.attorney_cityStateZip,isAttorneyStarted(d,'simplified'))}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderScheduleDocsSection('p5')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePart6(){
  const d=getD();
  const cards=(d.certRecipients||[]).map((r,i)=>{
    // Milestone 73O part 2: the name is starred where a name is owed --
    // Recipient 1, and a card the filer has started -- not on every blank
    // card (Recipient 3's had no rule behind it).
    const req=i===0||rowStarted(r)?'<span class="req">*</span>':'';
    const removeBtn=i===0?'':`<button type="button" class="btn btn-outline-danger btn-sm" data-simplified-action="remove-recipient" data-index="${i}">✕ Remove</button>`;
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>Recipient ${i+1}</span><span class="entry-card-actions">${removeBtn}</span></div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-12"><label class="form-label">Name and Address Line 1${req}</label><input type="text" class="form-control" value="${esc(formatName(r.name||''))}" data-form-path="certRecipients.${i}.name" data-form-format="name"></div>
          <div class="col-12"><label class="form-label">Line 2</label><input type="text" class="form-control" value="${esc(formatAddress(r.line2||''))}" data-form-path="certRecipients.${i}.line2" data-form-format="address"></div>
          <div class="col-12"><label class="form-label">Line 3</label><input type="text" class="form-control" value="${esc(formatAddress(r.line3||''))}" data-form-path="certRecipients.${i}.line3" data-form-format="address"></div>
          <div class="col-12"><label class="form-label">Line 4</label><input type="text" class="form-control" value="${esc(formatAddress(r.line4||''))}" data-form-path="certRecipients.${i}.line4" data-form-format="address"></div>
          <div class="col-12"><label class="form-label">Line 5</label><input type="text" class="form-control" value="${esc(formatAddress(r.line5||''))}" data-form-path="certRecipients.${i}.line5" data-form-format="address"></div>
        </div>
      </div>
    </div></div>`;
  }).join('');
  // Milestone 71B: with no attorney started -- which section 744.3679(3)
  // allows on every Simplified Accounting -- the guardian who served the
  // copies signs the certificate (unrepresented-filing.js). The attorney card
  // and whatever it holds come back unchanged once an attorney is entered.
  const started=isAttorneyStarted(d,'simplified');
  const gLabels=['Guardian #1','Co-Guardian #2','Co-Guardian #3'];
  const certifier=started?null:resolveServiceCertifier(d);
  // Milestone 72H: the certificate's attorney is Part V's, as the Clerk's
  // workbook links it -- the Bar number, phone and address are no longer
  // asked again here. The certificate keeps its own signature and date.
  // Details typed here before are listed until discarded.
  const signerCard=started?`<h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Attorney Signature</h2>
    <div class="schedule-instructions" data-certificate-attorney-line>The Florida Bar number, phone and address printed with this signature come from Part V — Atty Signature.</div>
    ${oldCertificateDetailsHTML(d, 'simplified', { actionAttr: 'data-simplified-action' })}
    <div class="row g-3 card-grid-2col">
      <div class="col-12 col-lg-6">
        <div class="entry-card mb-0 h-100">
          <div class="entry-card-header">Attorney Certification</div>
          <div class="entry-card-body">
            <div class="row g-2">
              <div class="col-md-6"><label class="form-label" for="cert_attorney_name">Attorney Name (linked)</label><input type="text" class="form-control" id="cert_attorney_name" value="${esc(formatName(d.attorney||''))}" data-form-path="attorney" data-form-format="name"></div>
              <div class="col-md-3">${inpSWithTooltip('certAttySignDate','Signature Date','signature_date',d.certAttySignDate,signatureDateRequired({ path: 'certAttorney', state: d.certAttySignatureState }),'date')}</div>
              <div class="col-12">${renderSignatureStateControl({ path: 'certAttorney', state: d.certAttySignatureState, date: d.certAttySignDate, route: '/p6', signatureImage: d.certAttySignatureImage, statePath: 'certAttySignatureState', imagePath: 'certAttySignatureImage' })}</div>
            </div>
          </div>
        </div>
      </div>
    </div>`:`<h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Guardian Signature</h2>
    <div class="alert alert-secondary" role="status" data-guardian-certificate-notice>
      <strong>No attorney is entered</strong>, so the guardian who served the copies signs this certificate. The court's Excel workbook has an attorney signature line only; the guardian's certificate prints on the PDF.
    </div>
    ${serviceCertifierChoiceHTML(d,{route:'/p6',labels:gLabels})}
    <div class="row g-3 card-grid-2col">
      <div class="col-12 col-lg-6">
        <div class="entry-card mb-0 h-100" data-guardian-certificate>
          <div class="entry-card-header">Guardian Certification</div>
          <div class="entry-card-body">
            <p class="mb-2">${certifier?`Signed by <strong>${esc(certifier.name||`${gLabels[certifier.index]} (name not entered)`)}</strong>, ${esc(gLabels[certifier.index])} — name and contact details come from Part IV.`:'Tick the guardian who served the copies above.'}</p>
            <div class="row g-2">
              <div class="col-md-5">${inpSWithTooltip('certGuardianSignDate','Signature Date','signature_date',d.certGuardianSignDate,signatureDateRequired({ path: 'certGuardian', state: d.certGuardianSignatureState }),'date')}</div>
              <div class="col-12">${renderSignatureStateControl({ path: 'certGuardian', state: d.certGuardianSignatureState, date: d.certGuardianSignDate, route: '/p6', signatureImage: d.certGuardianSignatureImage, statePath: 'certGuardianSignatureState', imagePath: 'certGuardianSignatureImage' })}</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  // Milestone 72G: the ward's status is the workbook's "Indicate if:" (J39),
  // required; how the copies were served is its own box, printed on the PDF
  // only -- a missing one warns, never blocks.
  return `<div class="schedule-page">
    <h1>Part VI (Part X) — ${started?'Guardian Attorney ':''}Certificate of Service</h1>
  ${preparerNoteHTML()}
    <div class="schedule-instructions">Pursuant to Florida Statute 744.362(1), I hereby certify that a copy of this simplified annual accounting has been furnished to the recipients below.</div>
    <div class="row g-3 mb-3">
      <div class="col-md-4">${inpS('certServiceDate','Date of Service',d.certServiceDate,true,'date')}</div>
      <div class="col-md-8">${renderSelectField({ path: 'certWardStatus', label: 'Indicate if Ward is:', value: d.certWardStatus, options: WARD_STATUS_VALUES, required: true })}</div>
      <div class="col-12">${renderFormField({ path: 'certIndicator', label: SERVICE_METHOD_LABEL, value: d.certIndicator, kind: SERVICE_METHOD_KIND, id: 'certIndicator' })}</div>
    </div>
    <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Recipients</h2>
    ${renderServiceAttestationRow({html:yesNoCheckboxS('certNoRecipients',ATTESTATION_57B,d.certNoRecipients,false,'/p6'),rows:d.certRecipients,attestation:d.certNoRecipients,startedFields:RECIPIENT_STARTED_FIELDS,recipientsPath:'certRecipients',attestationPath:'certNoRecipients'})}
    ${d.certNoRecipients==='Yes'?'':`<div class="row g-3 card-grid-2col mb-3">
      ${cards}
    </div>
    <button type="button" class="btn btn-outline-secondary btn-sm mb-4 no-print" data-simplified-action="add-recipient">+ Add Recipient</button>`}
    ${signerCard}
    ${renderScheduleDocsSection('p6')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

// ── Part VII – Remuneration ─────────────────────────────
function pagePart7(){
  const d=getD();
  let rows='';
  if (d.remuneration && d.remuneration.length > 0) {
    rows='<div class="row g-3 schedule-entry-grid">'+d.remuneration.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header">
        <span>Remuneration Entry ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-danger ms-auto" data-simplified-action="remove-remuneration" data-index="${i}">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-6"><label class="form-label">Guardian Name <span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatName(r.guardian||''))}" data-form-path="remuneration.${i}.guardian" data-form-format="name"></div>
          <div class="col-md-6"><label class="form-label">Type <span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatName(r.type||''))}" data-form-path="remuneration.${i}.type" data-form-format="name"></div>
          <div class="col-md-8"><label class="form-label">Description</label><input type="text" class="form-control" value="${esc(r.description||'')}" data-form-path="remuneration.${i}.description"></div>
          <div class="col-md-4"><label class="form-label">Amount <span class="req">*</span></label><input type="text" class="form-control" inputmode="decimal" value="${esc(amountBoxText(r.amount))}" data-form-path="remuneration.${i}.amount" data-form-format="currency" data-field-blank="keep"></div>
        </div>
      </div>
    </div></div>`).join('')+'</div>';
  } else {
    // Milestone 60J: the declaration itself, the same control Annual's Part XI
    // uses. 744.367(3)(a) requires the report to include a declaration of
    // remuneration, so "I received none" has to be sayable -- until now this
    // page offered no way to say it and export never asked.
    const declaredNone = !!(d.scheduleNoItems && d.scheduleNoItems.remuneration);
    rows=`<div class="schedule-empty">
      <label class="schedule-empty-check">
        <input type="checkbox" ${declaredNone?'checked':''} data-simplified-change="schedule-no-items" data-schedule="remuneration">
        <span>I verify there is no remuneration to report for this period.</span>
      </label>
    </div>`;
  }
  return `<div class="schedule-page">
    <h1>Part VII — Guardian(s) Declaration of Remuneration</h1>
    <div class="schedule-instructions">Per s. 744.367(3)(a), Florida Statutes: ${esc(REMUNERATION_DECLARATION)}</div>
    ${rows}
    <button class="btn btn-outline-primary btn-sm mb-3 mt-3" data-simplified-action="add-remuneration">+ Add Entry</button>
    ${renderScheduleDocsSection('p7')}
    ${pageNavS('/p6','/print')}
  </div>`;
}

// Milestone 42F: every issue states its own field path (validation-issue.js).
// Milestone 73F part 1: the checks are src/core/validation/engines/simplified.js's.
export function validateSimplified(){ return collectSimplifiedIssues(getD()); }
// Milestone 33, Phase 2.3: see annual-accounting/index.js's identical comment --
// exposing this lets the shared guidance panel itemize Simplified's own missing
// fields instead of only showing a generic message.
