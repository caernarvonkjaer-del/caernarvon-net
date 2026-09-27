// Milestone 70, 70K: what core code reaches of the filing features -- mounting
// a feature's pages and sidebar, loading one, its validator once it is loaded,
// the inputs completion needs, a filing's headline total, and running one of a
// feature's own commands.
//
// Core may not import a feature (the layer rule: a feature pack must stay lazy,
// and one filing feature never reaches into another), and nothing reaches one
// through window any more. The composition root may import both: src/main.js
// builds this service in src/features-loader.js, where every feature's lazy
// import() is visible to Vite, and hands it to startGuardianForms(), which
// provides it here before anything renders:
//
//     provideFeatureServices(featureServices);
//
// and core calls `features().mountPage(...)`. Asking before it was provided
// throws rather than doing nothing -- a page that never mounts, or a sidebar
// with no marks, is worse than a loud error. It replaced
// src/core/runtime/monolith.js, the monolith's services, and the window.mount*,
// window.load* and window.validate* globals.
let provided = null;

/** The composition root hands the feature services in, once. */
export function provideFeatureServices(services) {
  if (!services || typeof services !== 'object') throw new Error('provideFeatureServices: no services');
  provided = services;
}

/** The feature services (src/features-loader.js's featureServices). */
export function features() {
  if (!provided) throw new Error('features() was used before startGuardianForms() provided the feature services');
  return provided;
}

/** Whether they have been provided (a unit test that runs core alone has none). */
export function hasFeatureServices() {
  return provided !== null;
}
