// TEST-REVIEW.md Delivery 4 (T5, 2026-10-14): the one registry of the
// execution profiles -- each profile's id, the target it runs against, the
// browser, the build it needs first, and which manifest selection it runs
// -- and the one list of which profiles the release (`all`) runs, in order.
// The curated spec lists themselves live in tests/profile-manifest.json
// (the manifest owns paths; this file owns execution values); the server
// URL and browser launch for each target and browser stay
// playwright.config.ts's. scripts/run-e2e-profile.mjs composes the runnable
// profiles from the two, and tests/unit/test-profile-runner.spec.js holds it
// to that: nothing in the runner may name a spec path or a profile value of
// its own. validateRegistry() is what refuses a profile with a target,
// browser, build or selection nothing defines, and a release list that
// names `quick`, `historical` or an unknown profile.

export const REGISTRY_PATH = 'scripts/test-profiles.mjs';

/** The npm scripts a profile may build with first. */
export const BUILDS = Object.freeze(['build:web', 'build:portable']);

/**
 * selection: a manifest profile's name, or 'all' (the whole of tests/e2e,
 * unscoped -- what "Core full" means). The three extra-browser profiles share
 * the 'cross-browser' selection and take their --grep tag from it, by browser.
 * config/server: the historical comparisons run by their own config and
 * wait for no server (the spec serves both builds itself).
 */
export const PROFILE_REGISTRY = Object.freeze({
  source: { target: 'source', browser: 'chromium', build: null, selection: 'all' },
  quick: { target: 'source', browser: 'chromium', build: null, selection: 'quick' },
  web: { target: 'web', browser: 'chromium', build: 'build:web', selection: 'web' },
  portable: { target: 'portable', browser: 'chromium', build: 'build:portable', selection: 'portable' },
  // Milestone 70, 70A (T1): the portable build as production serves it --
  // from a subfolder over http, where the filing lock, fragment loading and
  // startup take the branches file:// skips.
  'portable-http': { target: 'portable-http', browser: 'chromium', build: 'build:portable', selection: 'portable-http' },
  firefox: { target: 'source', browser: 'firefox', build: null, selection: 'cross-browser' },
  webkit: { target: 'source', browser: 'webkit', build: null, selection: 'cross-browser' },
  edge: { target: 'source', browser: 'edge', build: null, selection: 'cross-browser' },
  // TEST-REVIEW.md Delivery 2 (T6): comparisons against an older build.
  historical: { target: 'source', browser: 'chromium', build: null, selection: 'historical', config: 'playwright.historical.config.ts', server: false },
});

/**
 * What `all` (release validation, `npm run test:release`) runs, one profile
 * at a time, in this order. Explicit: `quick` is a convenience tier the
 * source profile already contains, `historical` runs on demand, and a
 * profile added later joins the release only by being named here.
 */
export const RELEASE_ORDER = Object.freeze(['source', 'web', 'portable', 'portable-http', 'firefox', 'webkit', 'edge']);

/** Profiles the release never runs, whatever RELEASE_ORDER says. */
export const NEVER_RELEASED = Object.freeze(['quick', 'historical']);

/**
 * Every way the registry can be wrong, as sentences; empty when it is right.
 * `targets`, `browsers` are the names playwright.config.ts defines;
 * `selections` the manifest's profile names (plus 'all', 'historical').
 */
export function validateRegistry(registry = PROFILE_REGISTRY, order = RELEASE_ORDER, { targets, browsers, builds = BUILDS, selections }) {
  const problems = [];
  for (const [name, p] of Object.entries(registry)) {
    if (!targets.includes(p.target)) problems.push(`${name}: target "${p.target}" is not one playwright.config.ts defines (${targets.join(', ')})`);
    if (!browsers.includes(p.browser)) problems.push(`${name}: browser "${p.browser}" is not one playwright.config.ts defines (${browsers.join(', ')})`);
    if (p.build !== null && !builds.includes(p.build)) problems.push(`${name}: build "${p.build}" is not a build script (${builds.join(', ')})`);
    if (!['all', 'historical', ...selections].includes(p.selection)) problems.push(`${name}: selection "${p.selection}" is not a manifest profile (${selections.join(', ')}) nor "all"`);
    if (p.selection === 'historical' && (!p.config || p.server !== false)) problems.push(`${name}: a historical profile needs its own config and server: false`);
  }
  for (const name of order) {
    if (!registry[name]) problems.push(`the release order names "${name}", which the registry does not define`);
    if (NEVER_RELEASED.includes(name)) problems.push(`the release order names "${name}", which the release never runs`);
  }
  const twice = order.filter((n, i) => order.indexOf(n) !== i);
  if (twice.length) problems.push(`the release order repeats ${twice.join(', ')}`);
  return problems;
}
