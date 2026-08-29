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

// Temporary: see src/fragment-loader.js's window.loadFragment comment for
// why legacy-app.js needs this bridged onto window rather than importing
// it directly. Remove once a real src/main.js bootstrap exists.
window.loadSimplifiedFeature = loadSimplifiedFeature;
window.loadPlanSimplifiedFeature = loadPlanSimplifiedFeature;
