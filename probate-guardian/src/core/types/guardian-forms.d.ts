// Milestone 70, 70L: the one application-owned global, declared. Written by
// hand; it replaced window-bridge.d.ts, which scripts/audit-window-bridge.mjs
// generated with every name it found on window typed `any`. The audit still
// finds the names: tests/unit/window-bridge.spec.js fails when this declares a
// window member the audit does not find, or the audit finds one it does not
// declare.
//
// window.GuardianForms is installed once, first, by
// src/core/runtime/browser-api.js, and frozen (MILESTONE-70-PROPOSAL.md, "The
// approved window.GuardianForms boundary"). Production modules never read it;
// it is for what lives outside the app -- support asking which build a filer
// is running, and the test runner.

interface GuardianFormsNamespace {
  /** The build a filer is running. It replaced window.PG_APP_VERSION. */
  readonly version: string;
  /**
   * The browser suite's one way in (src/core/testing/testing-adapter.js;
   * tests/e2e/support/window-api.ts types its members). Present only when
   * the runner set the pre-boot flag to exactly true.
   */
  readonly testing?: object;
}

interface Window {
  /** The one application-owned global: frozen, and installed once. */
  readonly GuardianForms?: GuardianFormsNamespace;
  /**
   * The test runner's pre-boot flag (decisions D3 and T3): the runner's, not
   * the application's -- browser-api.js reads it once and deletes it.
   */
  __GUARDIAN_FORMS_TEST_MODE__?: boolean;
}
