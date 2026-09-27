// Milestone 70, 70K: startGuardianForms(services) -- the application started by
// a direct call from the composition root, src/main.js, once the first-use
// terms are accepted. It replaced window.initApp(), the classic monolith's
// entry point, which main.js looked up on window and which handed the moved
// code the monolith's services.
//
//   services.features   what core reaches of the filing features
//                       (src/features-loader.js's featureServices), provided
//                       before anything renders
//   services.termsAccepted  the terms promise the startup's first state awaits
//
// What it installs it installs once: the router's hash handling and the
// date-year guard (both were legacy-app.js's, added as that script loaded).
// Then the startup runs (src/core/startup/startup.js).
import { provideFeatureServices } from '../runtime/features.js';
import { installRouter } from '../navigation/router.js';
import { installDateYearGuard } from '../form/date-year-guard.js';
import { runStartup } from './startup.js';

let started = false;

export async function startGuardianForms({ features, termsAccepted } = {}) {
  if (started) throw new Error('startGuardianForms() runs once');
  started = true;
  provideFeatureServices(features);
  installRouter();
  installDateYearGuard();
  await runStartup({ termsAccepted });
}
