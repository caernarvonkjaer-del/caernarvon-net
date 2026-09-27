// Milestone 70, 70K: window.GuardianForms -- the one global Guardian Forms
// owns (MILESTONE-70-PROPOSAL.md, "The approved window.GuardianForms
// boundary"). Installed once, first thing, by the composition root
// (src/main.js), and frozen. Production modules never read it; it is for what
// lives outside the app.
//
//   version   the build a filer is running -- production caches index.html for
//             a year, so support needs to ask (the one production member the
//             owner's schema review confirmed: tests/baseline/
//             ms70-testing-adapter-design.json). It replaced
//             window.PG_APP_VERSION.
//   testing   GuardianForms.testing (src/core/testing/testing-adapter.js),
//             present only when the test runner set the pre-boot flag
//             window.__GUARDIAN_FORMS_TEST_MODE__ to exactly true before the
//             app started (decisions D3 and T3). The flag is read here once
//             and deleted; nothing reachable from the running app -- a URL, a
//             stored preference, a later assignment -- can enable it.
import { APP_VERSION } from '../feedback/feedback-config.js';
import { createTestingAdapter } from '../testing/testing-adapter.js';

/**
 * Reads and deletes the runner-owned flag, and installs window.GuardianForms:
 * its version always, its testing member only when the flag was exactly true.
 * A second call changes nothing. Returns whether the testing member exists.
 *
 * `window` is the page's window (a unit test hands in a stand-in); the
 * parameter carries that name so the window-bridge audit reads the flag and
 * the one publication for what they are.
 */
export function installGuardianForms(window = globalThis.window) {
  if (!window) return false;
  // The one runner-owned global (T3), never an application one.
  const enabled = window.__GUARDIAN_FORMS_TEST_MODE__ === true;
  // Deleted once read. (A flag defined so it cannot be deleted stays, and
  // changes nothing: it has been read, and this runs once.)
  try { delete window.__GUARDIAN_FORMS_TEST_MODE__; } catch { /* read already */ }
  // Installed once: a second call never replaces (or re-enables) it.
  if (window.GuardianForms) return !!window.GuardianForms.testing;
  const api = { version: APP_VERSION };
  if (enabled) api.testing = createTestingAdapter(window);
  Object.defineProperty(window, 'GuardianForms', {
    value: Object.freeze(api),
    writable: false, configurable: false, enumerable: false,
  });
  return enabled;
}
