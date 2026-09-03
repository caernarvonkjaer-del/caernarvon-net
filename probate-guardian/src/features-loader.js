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

// Temporary: see src/fragment-loader.js's window.loadFragment comment for
// why legacy-app.js needs this bridged onto window rather than importing
// it directly. Remove once a real src/main.js bootstrap exists.
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
document.dispatchEvent(new Event('features-loader-ready'));

