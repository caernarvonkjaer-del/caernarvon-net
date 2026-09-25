// Bridges legacy-app.js's dynamic feature-loading calls into real, Vite-
// visible dynamic import()s. legacy-app.js is deliberately kept as an
// opaque classic-script static passthrough (Milestone 1's recorded
// decision, and vite.config.js copies it verbatim without any Vite
// processing) -- which means Vite's bundler has zero visibility into any
// `import()` call written inside it. A dynamic import sitting there is
// still a real, spec-compliant browser API call at runtime, but nothing
// tells Vite's build to discover, bundle, hash, or (for dist/portable, via
// vite-plugin-singlefile's codeSplitting:false) inline the target module
// graph -- confirmed empirically: src/features/simplified-accounting/*.js
// were simply absent from both dist/web and dist/portable until this file
// existed to make the import() visible to a real, Vite-processed
// <script type="module"> entry.
//
// This also matters for dist/portable specifically beyond just "missing
// files": a genuine runtime import() of a separate module file hits the
// same file:// restriction that blocked fragment-loader.js's fetch() (see
// that file's comment) -- ES module loading is restricted under file:// in
// common browsers. Routing the import() through this Vite-visible module
// lets vite-plugin-singlefile's codeSplitting:false merge the entire
// features/simplified-accounting/ graph into the one inlined script at
// build time, so dist/portable never actually performs a runtime import()
// of a separate file at all.
// Canonical statutory math loaded eagerly so window.calcTotalsAnnual and window.annualReconcileState
// exist as a single source of truth across all features, dashboard, preview, and PDF generation.
import './features/annual-accounting/totals.js';
// Same for Guardian Inventory (Milestone 60A): the dashboard's headline total
// calls calc.total() for any Initial Inventory before that feature mounts
// (since Milestone 70's 70B legacy-app.js reaches this module's `calc` through
// src/legacy-bridge.js, which imports it too), and the test adapter reads
// window.calcTotalsGuardian.
import './features/guardian-inventory/totals.js';

export function loadSimplifiedFeature() {
  return import('./features/simplified-accounting/index.js');
}

// Plan Simplified (Milestone 3, Phase B) -- same reasoning as
// loadSimplifiedFeature above: legacy-app.js can't perform this import()
// itself and have Vite discover it.
export function loadPlanSimplifiedFeature() {
  return import('./features/plan-simplified/index.js');
}

// Plan Annual (Milestone 4, Phase A) -- same reasoning.
export function loadPlanAnnualFeature() {
  return import('./features/plan-annual/index.js');
}

// Plan Initial (Milestone 5, Phase A) -- same reasoning.
export function loadPlanInitialFeature() {
  return import('./features/plan-initial/index.js');
}

// Plan Minor (Milestone 6, Phase A) -- same reasoning.
export function loadPlanMinorFeature() {
  return import('./features/plan-minor/index.js');
}

// Annual Accounting (Milestone 7, Phase A) -- same reasoning. Also covers
// the finalAccounting/trustAccounting aliases (formEngine() maps both to
// 'annual' everywhere the app dispatches on type).
export function loadAnnualFeature() {
  return import('./features/annual-accounting/index.js');
}

// Guardian Inventory (Milestone 8, Phase A) -- same reasoning.
export function loadGuardianFeature() {
  return import('./features/guardian-inventory/index.js');
}

// Dashboard (Milestone 9) -- same reasoning.
export function loadDashboardFeature() {
  return import('./features/dashboard/index.js');
}
// Accessible PDF loaders (Milestone 19) -- bridges PDF model and engine
// modules into Vite's bundle discovery graph so both web (dev/preview) and
// portable (file:// single-file) distributions can execute and test PDF generation.
export async function loadGuardianPdf() {
  const [model, engine, access] = await Promise.all([
    import('./features/guardian-inventory/pdf-model.js'),
    import('./features/guardian-inventory/pdf-engine.js'),
    import('./core/pdf/pdf-accessibility.js'),
  ]);
  return { ...model, ...engine, ...access };
}

export async function loadSimplifiedPdf() {
  const [model, engine] = await Promise.all([
    import('./features/simplified-accounting/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

export async function loadAnnualPdf() {
  const [model, engine] = await Promise.all([
    import('./features/annual-accounting/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

// Plan-* accessible PDF loaders (Milestone 19-2) -- same reasoning as the
// three loaders above; these four forms previously had no vector PDF path
// (html2pdf raster only), so there was no pdf-model.js/pdf-engine.js pair
// to bridge until now.
export async function loadPlanInitialPdf() {
  const [model, engine] = await Promise.all([
    import('./features/plan-initial/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

export async function loadPlanAnnualPdf() {
  const [model, engine] = await Promise.all([
    import('./features/plan-annual/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

export async function loadPlanMinorPdf() {
  const [model, engine] = await Promise.all([
    import('./features/plan-minor/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

export async function loadPlanSimplifiedPdf() {
  const [model, engine] = await Promise.all([
    import('./features/plan-simplified/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

// legacy-app.js is a classic (non-module) script and cannot import this
// module, so the loaders are published on window for it (see
// src/fragment-loader.js's window.loadFragment comment for the same
// pattern). src/main.js has been the real bootstrap since Milestone 40G;
// that does not change this -- these stay on window until legacy-app.js
// itself becomes a module.
window.loadSimplifiedFeature = loadSimplifiedFeature;
window.loadPlanSimplifiedFeature = loadPlanSimplifiedFeature;
window.loadPlanAnnualFeature = loadPlanAnnualFeature;
window.loadPlanInitialFeature = loadPlanInitialFeature;
window.loadPlanMinorFeature = loadPlanMinorFeature;
window.loadAnnualFeature = loadAnnualFeature;
window.loadGuardianFeature = loadGuardianFeature;
window.loadDashboardFeature = loadDashboardFeature;
window.loadGuardianPdf = loadGuardianPdf;
window.loadSimplifiedPdf = loadSimplifiedPdf;
window.loadAnnualPdf = loadAnnualPdf;
window.loadPlanInitialPdf = loadPlanInitialPdf;
window.loadPlanAnnualPdf = loadPlanAnnualPdf;
window.loadPlanMinorPdf = loadPlanMinorPdf;
window.loadPlanSimplifiedPdf = loadPlanSimplifiedPdf;
// Milestone 63C. This file used to end with two listeners (added in 60b0133) that
// reloaded the page by themselves when a chunk failed to load -- on Vite's
// `vite:preloadError`, and on any unhandled "Failed to fetch dynamically imported
// module" rejection. That replaced the "This section could not be loaded" panel
// before anyone could read it, closed the open case for a filer with no remembered
// file handle, and left the browser's unsaved-changes prompt as the only guard. A
// failed chunk is now reported by the feature bridge (core/feature-bridge.js), for
// the feature's own module and for anything it imports while mounting, with a
// Reload button the filer chooses to press. Do not reintroduce an automatic reload
// here; MILESTONE-63-PROPOSAL.md, 63C, records why.


