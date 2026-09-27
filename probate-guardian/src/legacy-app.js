// ═══════════════════════════════════════════════════════
// THEME (light / dark)
// The synchronous head script sets the OS preference before first paint.
// This block handles runtime changes and restores the saved .sav setting.
// Court-document and PDF styles remain hardcoded for light output.
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// GLOBAL STATE & CONFIG
// ═══════════════════════════════════════════════════════


// ANNUAL_P67_CELLS moved to src/features/annual-accounting/excel.js
// (Milestone 7, Phase B) -- Annual Excel export is its only consumer.


// Milestone 70, 70J: the case is src/core/state.js's -- one case object, and
// the open filing derived from its activeWardId -- and this script reads the
// open filing and its type through src/legacy-bridge.js (getD(),
// getActiveInventoryType()). window.caseFile, window.D and the filing type's
// window accessor went with the monolith's copies; setAccountingFilingType()
// is the Annual feature's (src/features/annual-accounting/filing-type.js).
function getD(){return window.GuardianFormsLegacyBridge.getD();}
function getActiveInventoryType(){return window.GuardianFormsLegacyBridge.getActiveInventoryType();}

// ═══════════════════════════════════════════════════════
// HELP SYSTEM
// ═══════════════════════════════════════════════════════







/** Opens the standalone user manual in a new tab, optionally to one anchor. */

/** "?" while a filing is open: skip the Help panel, jump straight to the
 * manual page for wherever the filer actually is. */

// ═══════════════════════════════════════════════════════
// TOOLTIP SYSTEM
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// WALKTHROUGH SYSTEM (Phase 4) - Type-Specific Tours
// ═══════════════════════════════════════════════════════












let currentPage = '/';
try {
  Object.defineProperty(window, 'currentPage', {
    get: () => currentPage,
    set: (v) => { currentPage = v; },
    configurable: true
  });
} catch (_) {}
// A bare top-level `let`, like currentPage above, isn't reachable
// from an ES module (see src/core/state.js's file header) -- this tiny
// accessor (a function declaration, so it's a real window property) is
// what the Simplified Accounting feature module reaches for after an Excel
// import, to re-render whichever page was already open.
function getCurrentPage(){return currentPage;}
window.PG_APP_VERSION = '1.5.30';

// ═══════════════════════════════════════════════════════
// COMMON HELPERS
// ═══════════════════════════════════════════════════════
// Milestone 70, 70B: the pure helpers that used to be defined here live in ES
// modules now -- icons in src/core/ui/icons.js; esc() in
// src/core/filing/escape-html.js; fmt() and formatDashboardCurrency() in
// src/core/format/money.js; field formatting and filters in
// src/core/form/form-contract.js; injection checks and import hardening in
// src/core/security/input-hardening.js; guardianHasAnyData() in
// src/core/validation/row-started.js; FL_COUNTIES in src/core/pdf/circuit-lookup.js;
// formatDisplayDate() in src/core/form/date-parser.js; calcTotals() in
// src/features/simplified-accounting/totals.js. Those this script still calls
// keep a one-line wrapper that delegates through src/legacy-bridge.js
// (a classic script cannot import). A wrapper goes when its last caller here
// moves out; never put logic back in one.
function calcTotals(d){return window.GuardianFormsLegacyBridge.calcTotals(d);}
function calcTotalsGuardian(d){return window.GuardianFormsLegacyBridge.calcTotalsGuardian(d);}
// Milestone 70, 70C: the filing registry and per-engine models -- names,
// engines, blank filings and rows, the page lists and the normalizer -- live in
// src/core/filing/filing-registry.js and src/core/filing/models/ now; the lists
// this script still reads are bridge reads where it reads them.
function formEngine(type){return window.GuardianFormsLegacyBridge.formEngine(type);}




// Update an input field with formatted phone, keeping user experience smooth
// Highlight form fields that have validation errors with red borders
// ═══════════════════════════════════════════════════════
// VALIDATION SUMMARY
// Every message from validate() reads "<Section> — <Field>", so it can be
// grouped instead of listed flat. Section prefixes map to wizard routes
// ("Cover"→/, "B-1 row 3"→/b1, "Part IV"→/p4, "Sch D2"→/schd2), which is
// what lets each group offer a jump link.
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// PRINT-PREVIEW PAGER
// Shows one filing page at a time instead of a continuous scroll of all of
// them. Purely a viewing filter: exports and printing always operate on the
// complete set (see the !important rules under @media print and
// .pdf-export-mode, plus pvShowAll() called before every export).
// Labels are read back out of each page's own court header, so this works
// for all three inventory types without touching the three builders.
// ═══════════════════════════════════════════════════════
 // '1'-based page number, or 'all'





// Milestone 70, 70I: saving and the recovery snapshot, encryption, unlocking
// and locking, the Activity Log's entries, opening or starting a case at
// launch and the startup after it live in modules now -- src/core/persistence/
// (case-file.js, case-reader.js, case-import.js, export-state.js,
// templates.js), src/core/security/app-lock.js, src/core/activity/
// audit-log.js and src/core/startup/. The case they read and write is still
// this script's until 70J; clearCaseForLock() and focusFilingAtLaunch() above
// are how they change it.

// ═══════════════════════════════════════════════════════
// WARD MANAGEMENT
// ═══════════════════════════════════════════════════════

// The carry tables -- ACCOUNTING_FORM_TYPES, PRIOR_ACCOUNTING_SOURCES and
// CARRY_SOURCE_TYPE, which filings may seed a new one -- are
// src/core/navigation/ward-lifecycle.js's; this script's copies, identical
// and the last one unused, went in Milestone 70's 70G.






















// ═══════════════════════════════════════════════════════
// WARD ACTIVATION / UNLOAD (Single Chokepoint)
// ═══════════════════════════════════════════════════════







// ═══════════════════════════════════════════════════════
// MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════















// ═══════════════════════════════════════════════════════
// ROUTER — see src/core/navigation/router.js
// ═══════════════════════════════════════════════════════
// navigate(), renderPage() and the off-canvas sidebar drawer pair
// (toggleMobileSidebar/closeMobileSidebar) used to be declared here. They now
// live in src/core/navigation/router.js, which publishes all four on window.
// Bare calls to them elsewhere in this file resolve to those, because a
// top-level `function` here only ever created the same global property that
// router.js then assigned over.

// Each filing's headline "total" for the dashboard, from its own type's
// totals, handed the filing. Until Milestone 70's 70J this pointed window.D at
// the filing for the two calculators that read the open one; they take the
// filing now, and the open filing is derived, not assignable.
function getWardHeadlineTotal(ward){
  if(!ward)return null;
  let total=null;
  try{
    if(ward.inventoryType==='guardian')total=calcTotalsGuardian(ward).total;
    else if(ward.inventoryType==='simplified')total=calcTotals(ward).remaining;
    else if(formEngine(ward.inventoryType)==='annual'){
      const t=calcTotalsAnnual(ward);
      total=(t.netAssetsFromD!==0 || (t.schD1_total||t.schD2_ward||t.schD3_ward||t.schD4_ward||t.schD5_total)) ? t.netAssetsFromD : (t.netAssets||0);
    }
  }catch(e){console.warn('Dashboard: could not compute total for ward',ward.wardId,e);}
  return total;
}








// ═══════════════════════════════════════════════════════
// CONVERT EXISTING WARD — creates a new ward of a different inventory type,
// carrying over header info always, and schedule/asset data wherever the
// source and target types have a genuine real-world equivalent. See the
// per-pair functions below for exactly what maps where and why.
// ═══════════════════════════════════════════════════════












// ═══════════════════════════════════════════════════════
// MULTI-YEAR ACCOUNTING (save / switch / edit by year)
// ═══════════════════════════════════════════════════════



















// ═══════════════════════════════════════════════════════
// INVENTORY TYPE SELECTOR PAGE
// ═══════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════
// WIZARD: GUARDIAN INVENTORY
// ═══════════════════════════════════════════════════════


// Simplified Accounting is extracted into src/features/simplified-accounting/
// (Milestone 2, Phase D) -- these two bridges dynamically import it, cache
// the module, and delegate. See src/features/simplified-accounting/index.js
// for the module itself; see the Milestone 2 plan's "Problem 2" (and the
// Milestone 3 plan's "Problem 2", which generalized this into
// window.createFeatureBridge once a second feature proved the shape was
// genuinely duplicated) for why this hand-rolled bridge exists instead of
// INDEX-SPLIT-PLAN.md's full staging-host router (that router arbitrates
// between several *concurrently competing* lazy features -- this app never
// mounts two features racing for the same container, since switchWard()
// always fully changes the active ward before any render happens).
//
// Routed through window.loadSimplifiedFeature (src/features-loader.js)
// rather than a direct import() here -- this file is an opaque classic-
// script static passthrough Vite never processes, so a dynamic import()
// written directly in this file would be invisible to Vite's build and the
// target files would simply be missing from dist/web and dist/portable. See
// features-loader.js's own comment for the full reasoning, including why
// dist/portable specifically needs this.
//
// window.createFeatureBridge() itself must NOT be called at this file's top
// level: legacy-app.js is a classic, parser-blocking <script src> that runs
// synchronously as the parser reaches it, while `<script type="module">`
// tags (core/feature-bridge.js included) are implicitly deferred and don't
// execute until after the whole document has finished parsing -- strictly
// AFTER this file's top-level code runs, even though they appear earlier in
// index.html. window.createFeatureBridge is not yet a function at that
// point. Constructing the bridge lazily, on first actual call, sidesteps
// that -- the same safe pattern window.loadFragment/window.emptyDataSimplified
// already use.
//
// Milestone 40G correction: this comment used to claim the first call
// "only happens later, in response to user navigation, long after the
// deferred module scripts have run." That was false for any feature mounted
// during startup. The dashboard is the landing page, so its bridge was
// constructed inside initApp()'s first renderPage() and threw
// "window.createFeatureBridge is not a function" on every load. Laziness
// cannot help a feature that is mounted immediately. Startup is now driven
// from src/main.js after module evaluation, which is what actually
// guarantees the ordering -- do not reintroduce a top-level initApp() call
// here, and do not assume a lazy bridge is safe merely because it is lazy.
let _simplifiedFeatureBridge=null;
function getSimplifiedFeatureBridge(){
  return _simplifiedFeatureBridge??=window.createFeatureBridge(()=>window.loadSimplifiedFeature());
}
async function mountSimplifiedFeature(page){
  await getSimplifiedFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountSimplifiedNav(container){
  await getSimplifiedFeatureBridge().mountNav(container);
}

// ═══════════════════════════════════════════════════════
// Annual Accounting is extracted into src/features/annual-accounting/
// (Milestone 7, Phase A -- data/pages/nav/validate; print/PDF/Excel export
// stay here as legacy until Phase B). Also covers the finalAccounting/
// trustAccounting aliases -- formEngine() maps all three to 'annual'
// everywhere the app dispatches on type, so this one bridge serves all
// three ward types with no per-alias branching anywhere.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above) for why.
let _annualFeatureBridge=null;
function getAnnualFeatureBridge(){
  return _annualFeatureBridge??=window.createFeatureBridge(()=>window.loadAnnualFeature());
}
async function mountAnnualFeature(page){
  await getAnnualFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountAnnualNav(container){
  await getAnnualFeatureBridge().mountNav(container);
}

// buildNavAnnual()..pagePart11Annual()/validateAnnual() moved to
// src/features/annual-accounting/index.js (Milestone 7, Phase A).

// Guardian Inventory's page/nav/validation/row UI moved to
// src/features/guardian-inventory/index.js (Milestone 8, Phases A and B --
// print/PDF/Excel import-export now live in that feature's print.js/
// excel.js too). Shared Excel helpers (excelCapacityPanel(), ensureTemplate()
// -- checkExcelCapacity() moved to core in Milestone 51F),
// openFloridaCourtPortal(), and dashboard calc/mk stay legacy -- shared
// with Annual/Simplified or needed synchronously before this feature loads.
let _guardianFeatureBridge=null;
function getGuardianFeatureBridge(){
  return _guardianFeatureBridge??=window.createFeatureBridge(()=>window.loadGuardianFeature());
}
async function mountGuardianFeature(page){
  await getGuardianFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountGuardianNav(container){
  await getGuardianFeatureBridge().mountNav(container);
}
async function ensureGuardianFeatureReady(){
  if(typeof window.loadGuardianFeature!=='function'){
    await new Promise(resolve=>document.addEventListener('features-loader-ready',resolve,{once:true}));
  }
  await window.loadGuardianFeature();
}

// Dashboard's own rendering (pageDashboard()..toggleWardArchived(),
// getWardProgress()) moved to src/features/dashboard/index.js (Milestone
// 9). Ward-management CRUD (addWard, switchWard, deleteWard, convertWard,
// all modals, year management) stays legacy: it's called from the topnav on
// every page, not just the dashboard, so gating it behind this feature's lazy
// load would break "Switch Ward"/"+ New Form" on every other page.
// getWardHeadlineTotal(), typeIcon() and INVENTORY_TYPE_META also stay legacy
// for the same reason -- refreshWardInfoCard() and the ward-selector dropdown
// need them on every page too. (formatDashboardCurrency() was in that list
// until Milestone 70's 70B moved it to src/core/format/money.js, which loads
// eagerly; renameWard and its dialog went in 70B too, unreachable since the
// Milestone 36 dashboard consolidation, e5fb9cf, removed the button.)
let _dashboardFeatureBridge=null;
function getDashboardFeatureBridge(){
  return _dashboardFeatureBridge??=window.createFeatureBridge(()=>window.loadDashboardFeature());
}
async function mountDashboardFeature(page){
  await getDashboardFeatureBridge().mountPage(document.getElementById('main-content'),page);
}


// ── Plan form controls ───────────────────────────────────








// ═══════════════════════════════════════════════════════
// Simplified Annual Plan is extracted into src/features/plan-simplified/
// (Milestone 3, Phases B and C -- data/validation/pages, and print/PDF
// export). See src/features/simplified-accounting/index.js's header
// comment and the Milestone 3 plan for the pattern and reasoning. txtP/
// chkP/yesNoCheckboxS/radioP/pageNavS above stay here as legacy globals,
// reached via window by every extracted Plan module (Problem 3) -- with
// planMinor extracted in Milestone 6, all four Plan types now share them
// this way, and moving them into a shared core module is a separate
// restructuring not required by this milestone.
// ═══════════════════════════════════════════════════════
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment above for why
// (module <script> tags are deferred and run after this classic script's
// top-level code, so window.createFeatureBridge isn't a function yet then).
let _planSimplifiedFeatureBridge=null;
function getPlanSimplifiedFeatureBridge(){
  return _planSimplifiedFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanSimplifiedFeature());
}
async function mountPlanSimplifiedFeature(page){
  await getPlanSimplifiedFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanSimplifiedNav(container){
  await getPlanSimplifiedFeatureBridge().mountNav(container);
}

// ═══════════════════════════════════════════════════════
// Annual Guardianship Plan is extracted into src/features/plan-annual/
// (Milestone 4, Phases A and B -- data/validation/pages, and print/PDF
// export). See src/features/plan-simplified/index.js's header comment and
// the Milestone 4 plan for the pattern and reasoning. planQ/planCheckGroup
// immediately below, and planEmptyRow/addPlanRow/removePlanRow/
// duplicatePlanRow further down, stay here as legacy globals -- despite
// sitting in what reads as "this section," they are not planAnnual-
// exclusive (Milestone 4 plan's "Design decisions"), and with planMinor
// extracted in Milestone 6 all four Plan types now reach them via window.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planAnnualFeatureBridge=null;
function getPlanAnnualFeatureBridge(){
  return _planAnnualFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanAnnualFeature());
}
async function mountPlanAnnualFeature(page){
  await getPlanAnnualFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanAnnualNav(container){
  await getPlanAnnualFeatureBridge().mountNav(container);
}


// pagePlanACover()..pagePlanASignatures() moved to
// src/features/plan-annual/index.js (Milestone 4, Phase A).


// validatePlanAnnual() moved to src/features/plan-annual/index.js
// (Milestone 4, Phase A).

// docHeaderPlanSimplified()/buildPrintHTMLPlanSimplified() moved to
// src/features/plan-simplified/print.js (Milestone 3, Phase C).

// ── Pre-filing readiness check ───────────────────────────
// planReadinessChecks()/planReadinessPanel() -- the four Plan types' hand-
// maintained checklist dispatcher and always-expanded panel -- were replaced
// by the shared readiness card in Milestone 44C: predicates live in
// src/core/filing/readiness-config.js, rendering in readiness-card.js.

// pagePrintPlanSimplified()/doSavePdfPlanSimplified() moved to
// src/features/plan-simplified/print.js (Milestone 3, Phase C).

// docHeaderPlanAnnual()/buildPrintHTMLPlanAnnual()/pagePrintPlanAnnual()/
// doSavePdfPlanAnnual() moved to src/features/plan-annual/print.js
// (Milestone 4, Phase B). The lazy module bridge in that feature's index.js
// exposes doSavePdfPlanAnnual on window so the print page's
// onclick="doSavePdfPlanAnnual()" still resolves.

// ═══════════════════════════════════════════════════════
// Initial Guardianship Plan is extracted into src/features/plan-initial/
// (Milestone 5, Phase A -- data/validation/pages; print/PDF export stays
// here as legacy until Phase B). See src/features/plan-simplified/index.js's
// header comment and the Milestone 5 plan for the pattern and reasoning.
// planQ/planCheckGroup (defined above, in the Plan Annual section) and
// planEmptyRow/addPlanRow/removePlanRow/duplicatePlanRow (further below)
// stay legacy globals, reached via window (see the Plan Minor section
// below for why this no longer depends on any type being "not yet
// extracted"). INITIAL_ADLS/INITIAL_ADL_RATINGS/emptyInitialProvider stay
// legacy because computeNavChecks()'s planInitial branch reads them
// directly.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planInitialFeatureBridge=null;
function getPlanInitialFeatureBridge(){
  return _planInitialFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanInitialFeature());
}
async function mountPlanInitialFeature(page){
  await getPlanInitialFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanInitialNav(container){
  await getPlanInitialFeatureBridge().mountNav(container);
}

// buildNavPlanInitial()..pagePlanIAttorney()/validatePlanInitial() moved to
// src/features/plan-initial/index.js (Milestone 5, Phase A).

// ═══════════════════════════════════════════════════════
// Annual Plan -- Minors is extracted into src/features/plan-minor/
// (Milestone 6, Phases A and B -- data/validation/pages, and print/PDF
// export). See src/features/plan-simplified/index.js's header comment and
// the Milestone 6 plan for the pattern and reasoning. This was the fourth
// and last Plan-family type, so planQ/planCheckGroup (defined above, in the
// Plan Annual section) and planEmptyRow/addPlanRow/removePlanRow/
// duplicatePlanRow (further below) now have no not-yet-extracted Plan type
// left to be shared with -- they stay legacy globals regardless, since
// every extracted Plan module already reaches them via window, and moving
// them into a shared core module is a separate restructuring not required
// by this milestone (see the Milestone 4/5 plans' deferred
// features/plans/ restructuring note).
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planMinorFeatureBridge=null;
function getPlanMinorFeatureBridge(){
  return _planMinorFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanMinorFeature());
}
async function mountPlanMinorFeature(page){
  await getPlanMinorFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanMinorNav(container){
  await getPlanMinorFeatureBridge().mountNav(container);
}

// buildNavPlanMinor()..pagePlanMPreparerAttorney()/validatePlanMinor() moved
// to src/features/plan-minor/index.js (Milestone 6, Phase A).

function n(v){return parseFloat(v)||0;}
function pct(v){if(v===''||v===null||v===undefined)return 1;const p=parseFloat(v);return isNaN(p)?1:p>1?p/100:p;}

// calcTotalsAnnual() and annualReconcileState() moved to src/features/annual-accounting/totals.js (Milestone 19E).
// Eagerly loaded via src/features-loader.js to serve as the single source of truth across
// the dashboard, forms, preview, Excel export, and accessible PDF generation.


// fmtD()/fmtAnnual()/DISB_CATS/docHdr()/sl()/slR()/buildPrintHTMLAnnual()
// moved to src/features/annual-accounting/print.js (Milestone 7, Phase B).

// ═══════════════════════════════════════════════════════
// EXCEL TEMPLATE CAPACITY
// ═══════════════════════════════════════════════════════
// The official court .xlsx templates have a FIXED number of pre-formatted
// rows per schedule, and the export writes into those rows by position.
// Anything beyond the last row has nowhere to go — the export code simply
// skips it (`if(i<20){…}` with no else), which previously meant entries
// could vanish silently from a document filed with the court.
//
// These numbers mirror the guards in doSaveExcelAnnual()/…Simplified()
// exactly; if a template is ever swapped for one with more rows, update
// BOTH the export guard and the matching number here.
//
// Note this is an Excel-only limit: the PDF/print path renders every entry
// no matter how many there are, so overflow blocks the Excel button only
// and deliberately leaves PDF export available.
// Initial Inventory (feature-owned GUARDIAN_EXCEL_CAPS, in
// src/features/guardian-inventory/excel.js) overflows differently from the
// other two types: its fillScheduleXX() helpers walk a fixed list of
// template pages, and once the slots run out pageIdx runs past the end of
// pages[], so `pages[pageIdx].name` throws. The export then dies in its
// catch block and prints the raw TypeError into a status line that clears
// itself after three seconds — no file, no usable explanation. Same guard
// as the other types turns that into a clear, actionable message.

// Milestone 51F deleted this file's checkExcelCapacity() twin. It duplicated
// src/core/excel/excel-capacity.js's implementation of the same rule verbatim --
// the remuneration-filtering comment above was present, word for word, in both --
// and the two ran on different paths: the three feature index.js files
// destructured THIS one off `window` for the print-page capacity panel, while
// their sibling excel.js files reached the core one through
// getExcelCapacityIssues() for the export gate. A capacity rule that can
// disagree between the readiness panel and the export gate is exactly the class
// of defect AGENTS.md section 4's parity invariant exists to prevent, and nothing
// kept the two copies in step.
//
// The three index.js files now import the core version directly and pass
// the open filing explicitly. It is a strict superset: it takes the data as an argument
// instead of reading the global implicitly, guards a null/non-object caps entry,
// and adds a `key` field to each overflow record. excelCapacityPanel() below
// reads only label/route/cap/count, so the extra field is inert, and every cap
// entry in all three CAPS tables defines a label, so core's `info.label || key`
// fallback can never differ from this version's plain info.label.



// pagePrintAnnual()/doSavePdfAnnual() moved to
// src/features/annual-accounting/print.js (Milestone 7, Phase B).


// doSaveExcelAnnual()/importExcelAnnual() moved to
// src/features/annual-accounting/excel.js (Milestone 7, Phase B).


// ═══════════════════════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════════════════════
// Guardian Inventory's calc.totalA1(), calc.wardVal(entry), ... live in
// src/features/guardian-inventory/totals.js since Milestone 70's 70B; this is
// the one-line wrapper this script's callers use (see COMMON HELPERS above).



// ═══════════════════════════════════════════════════════
// SCHEDULE_NAV_KEYS, the Initial Inventory's schedule route keys, moved to
// src/core/filing/models/guardian.js with the completion evaluators (Milestone
// 70, 70D); this script reads it off the bridge where it uses it.
// A schedule's own "Next" button is disabled until computeNavChecks()
// says that schedule is complete (a real row, or the "no items" checkbox).
// afterChange() stays legacy in Milestone 8A and still needs this helper.
// ═══════════════════════════════════════════════════════
// FORM BINDING ENGINE
// ═══════════════════════════════════════════════════════


// The sidebar's section marks for the open filing. Milestone 70's 70D moved
// the rules to src/core/status/completion.js -- one pure evaluator per engine,
// handed the filing explicitly -- and the registry dispatches to them; this
// hands them the open filing, this script's own activeInventoryType, and what
// they cannot import: the Initial Inventory's validator (its marks are
// bucketed from the export validator's own issues; it exists once that
// feature has loaded) and the Annual totals. getWardProgress() below hands the same. updateNavDots()
// applies the map to the page.
function computeNavChecks(){return window.GuardianFormsLegacyBridge.computeNavChecks(getD(),getActiveInventoryType(),{validateGuardian:window.validateGuardian,calcTotalsAnnual,annualReconcileState});}



// Filing progress for any filing, open or not (the dashboard's cards). Since
// Milestone 70's 70D the evaluator takes the filing explicitly; this used to
// point window.D and activeInventoryType at the filing, reuse the sidebar's
// logic, and put them back.
function getWardProgress(ward){return window.GuardianFormsLegacyBridge.getWardProgress(ward,{validateGuardian:window.validateGuardian,calcTotalsAnnual,annualReconcileState});}








// ── helpers ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// SCHEDULE SUPPORTING DOCUMENTS & COMMENTS
// ═══════════════════════════════════════════════════════
 // 15MB/file — base64 inflates ~33% in storage and the .sav backup













// th()/totRow()/printEmptyRow()/docHeader() moved to
// src/features/guardian-inventory/print.js (Milestone 8, Phase B), being
// Guardian-only; td(), which Annual's print.js shares, is
// src/core/form/field-html.js's since Milestone 70's 70F, and the unused
// tdR() went then.

// pagePrint()/buildPrintHTML() moved to
// src/features/guardian-inventory/print.js (Milestone 8, Phase B).


// pagePrint()/buildPrintHTML()/doSavePdf()/doSaveExcel()/importExcelFile()/
// parseInitialInventoryWorkbook()/GUARDIAN_EXCEL_CAPS moved to
// src/features/guardian-inventory/print.js and excel.js (Milestone 8, Phase B).

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
document.querySelectorAll('.nav-link-item[data-page]').forEach(btn=>{
  btn.addEventListener('click',()=>navigate(btn.dataset.page));
});

// Hash-based routing. Each filing type's page list is FILING_PAGES in
// src/core/filing/filing-registry.js (moved there by Milestone 70's 70C).

function updateNavActive(page){
  document.querySelectorAll('.nav-link-item[data-page]').forEach(btn=>{
    const isActive=btn.dataset.page===page;
    btn.classList.toggle('active',isActive);
    // aria-current, not aria-selected — these are navigation links to
    // different pages/sections, not tabs or options within one control.
    if(isActive)btn.setAttribute('aria-current','page');
    else btn.removeAttribute('aria-current');
  });
}

const SPECIAL_PAGES=['/dashboard','/inventory-select','/activity-log','/party-management']; // valid whatever filing is open
async function handleHash(){
  const h=window.location.hash.replace('#','');
  if(SPECIAL_PAGES.includes(h)){
    // router.js's navigate() sets window.location.hash itself, then renders
    // directly -- but assigning the hash also queues this same listener via
    // the browser's native 'hashchange' event, which fires asynchronously
    // afterward and re-renders a second time for no reason. Harmless for a
    // plain re-render, but showContinuePromptIfNeeded() is a one-shot: its
    // first run draws the banner and marks itself shown, so the redundant
    // second run immediately wipes what the first just drew. currentPage
    // already equals h whenever navigate() (or renderPage()'s own redirect)
    // already handled this exact hash, which is the only case this skips.
    if(currentPage===h)return;
    currentPage=h;
    renderPage(h);
    // renderPage() may have redirected (e.g. /dashboard with no wards yet
    // lands on /inventory-select instead) and updated currentPage itself —
    // reflect wherever it actually landed, not the hash this call started
    // with, or the nav highlight points at a page nothing rendered.
    updateNavActive(currentPage);
    return;
  }
  const wizardPages=window.GuardianFormsLegacyBridge.FILING_PAGES[getActiveInventoryType()]||window.GuardianFormsLegacyBridge.PAGES_GUARDIAN;
  const valid=wizardPages.map(p=>p.id);
  const page=valid.includes(h)?h:'/';
  currentPage=page;
  renderPage(page);
  updateNavActive(currentPage);
}

window.addEventListener('hashchange',handleHash);










// The door from this script into src/core/runtime/monolith.js (Milestone 70,
// 70E): it hands the moved code the functions here that it calls back. The
// second transition exception MILESTONE-70-PROPOSAL.md records; goes in 70L.
function provideMonolithServices(fns){return window.GuardianFormsLegacyBridge.provideMonolithServices(fns);}

function initApp(){
  // Milestone 70's 70E: hand the moved code the functions of this script it
  // calls (src/core/runtime/monolith.js), before anything can call back.
  provideMonolithServices({computeNavChecks,getCurrentPage,getWardHeadlineTotal,getWardProgress,handleHash,mountAnnualNav,mountGuardianNav,mountPlanAnnualNav,mountPlanInitialNav,mountPlanMinorNav,mountPlanSimplifiedNav,mountSimplifiedNav});
}



// Keep paired "From"/"To" date fields consistent: never let From be after To
// or To be before From. Pairs are detected by finding two date inputs that
// share a .row container with labels containing the words "From" and "To"
// (e.g. "Period From" / "Period To", "Bond Period – From" / "– To").
// Milestone 40C-C: enforceDateRanges() and wireDateRangePair() were removed
// from here, and nothing replaces them. Editing one endpoint of a date range
// must never change the other; checkDateOrder() (src/core/validation/
// date-rules.js), called from each filing type's validator, is now the single
// place an end-before-start range is reported.
//
// They were actively destroying valid data. The pair swapped endpoints
// whenever `fromInp.value > toInp.value`, but these are NOT native
// <input type="date"> controls -- form-fields.js renders every date field as
// `type="text"` holding the display form, so `.value` is MM/DD/YYYY, not
// YYYY-MM-DD. Comparing those strings compares the MONTH first and the year
// last, so an ordinary accounting period like 05/10/2026 -> 05/09/2027 read
// as reversed ("05/1" > "05/0") and the To field was silently overwritten
// with the From date. Any period not starting on January 1 could lose its end
// date this way, which is why a 01/01/2025 -> 12/31/2025 spot check saw
// nothing: a January start is the one shape the comparison gets right.
//
// An earlier revision of this code also set min/max on each input, which is
// the known cause of Chrome refusing digit-by-digit typing into a date field
// (reported against Part I's Period To). That is gone too and must not come
// back; the validator, not the input, is where range order belongs.

// Guards against a native <input type="date"> committing an implausible
// year (e.g. "0002-05-10" left behind by a stray keystroke) -- HTML5 date
// inputs treat any 1-4 digit year as a "complete", non-empty value, so
// nothing else in the app ever sees this as invalid or unanswered. One
// delegated listener on `document`, registered once here rather than per
// input, so it covers every date field regardless of which of the app's
// several wiring conventions that field uses -- catching this everywhere
// without touching each of the ~50 individual date inputs.
// MUST be 'focusout', not 'change': Chrome fires 'change' on a date input
// the instant the year segment LOOKS complete, including every transient
// state while the user is still typing it digit-by-digit (typing "2026"
// passes through "0002", "0020", "0202" first). Hooking 'change' here
// blanked the field mid-keystroke on that transient "0002", which the
// browser's date control then treated as a fresh, empty field and
// restarted segment focus from the month -- so the rest of what the user
// was typing landed in the wrong segments (reported: typing "05102026"
// kept "0510" but the year ended up "0026" with month/day scrambled).
// 'focusout' only fires once the user actually leaves the control -- HTML5
// date inputs keep focus on the whole control while moving between their
// internal month/day/year segments, so this never fires mid-entry, only
// once a real (if implausible) value has actually been committed.
// Bubbles on its own (unlike 'blur'), so no capture flag is needed.
// Re-dispatches 'change' after clearing so bindForms()'s own listener
// (and anything else watching 'change') sees the correction and doesn't
// leave the blanked-out DOM value out of sync with the open filing.
document.addEventListener('focusout',e=>{
  const el=e.target;
  if(!el||el.tagName!=='INPUT'||el.type!=='date'||!el.value)return;
  const m=el.value.match(/^(\d{4})-\d{2}-\d{2}$/);
  if(m&&(+m[1]<1900||+m[1]>new Date().getFullYear()+30)){
    el.value='';
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
});

// The "filing is open in another tab" dialog is src/core/ward-lock.js's
// (Milestone 70, 70H).

// The startup label linking that used to be queued here (setTimeout(..., 0))
// is main.js's since Milestone 70's 70F: linkLabelsToInputs() is a module's
// now, and a timer queued by this classic script can fire before main.js --
// a deferred module -- has put the bridge on window.
// initApp() is NOT called here. This file is a classic, parser-blocking
// script, so it runs before any `<script type="module">` has evaluated --
// which meant startup reached code depending on module-provided globals
// (window.createFeatureBridge, and the case-file.js persistence functions)
// before those globals existed. src/main.js calls window.initApp() as its
// last statement instead, after every module import has evaluated, so the
// whole boot path has one explicit ordering guarantee rather than racing
// deferred module evaluation. See MILESTONE-40G-PROPOSAL.md.
