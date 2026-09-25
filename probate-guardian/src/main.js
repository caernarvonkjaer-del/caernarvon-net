// Pure ESM application bootstrap and orchestration entry point.
import './core/state.js';
import './core/ui/dialogs.js';
import './core/party-resolver.js';
import './core/case-resolver.js';
import './core/feature-bridge.js';
import './core/ward-lock.js';
import './core/form/form-fields.js';
import './core/form/schedule-definitions.js';
// Milestone 33, Phase 2.3: eager, load-order-independent import so
// window.renderLocalSectionGuidance (used by legacy-app.js's shared
// updateCurrentScheduleNextButton() for every filing type) exists from the
// first render, rather than only after whichever feature happens to import
// it first (previously only guardian-inventory/index.js and
// annual-accounting/index.js did).
import './core/status/section-status.js';
// Milestone 57, Simplified parity gap: imported for its window bridge, not
// for anything main.js calls. computeNavChecks() needs window.isSignatureComplete
// while rendering dashboard progress for filings that have never been opened,
// so it cannot come from a lazily-loaded feature module -- every other
// importer of signature-state.js is one.
import './core/validation/signature-state.js';
// Milestone 58C, same reasoning: computeNavChecks()'s pi-p10 rule needs
// window.isPlanInitialAttorneyStarted while rendering dashboard progress for
// Initial Plan filings that have never been opened, so it cannot arrive with
// a lazily-loaded feature module.
import './core/validation/attorney-block.js';
import './core/validation/row-started.js';
// Milestone 58E: Delete is available on the dashboard, the first screen a
// returning filer sees, so the confirmation builder cannot arrive with a
// lazily-loaded feature module.
import './core/filing/delete-confirmation.js';
// Milestone 57B, same reason again: computeNavChecks()'s a-p10 and s-p6 rules
// reach the shared recipient rule through the bridge, and they run for
// dashboard filings that have never been opened.
import './core/validation/service-recipients.js';
import './core/status/section-guidance-policy.js';
import './core/persistence/crypto.js';
import './core/persistence/launch-preferences.js';
import './core/persistence/recovery-cache.js';
import './core/persistence/case-file.js';
import './core/persistence/templates.js';
import './core/navigation/ward-lifecycle.js';
import './core/navigation/ward-county.js';
import './core/theme-preference.js';
import './core/navigation/router.js';
import './core/filing/output-authorization.js';
import './core/modals/convert-ward-modal.js';
import './core/modals/year-manager-modal.js';
import './core/excel/exceljs-loader.js';
import './core/pdf/html2pdf-loader.js';
import './fragment-loader.js';
import './features-loader.js';
import './features/help/help-content.js';
import './core/feedback/feedback-modal.js';
import { termsAcceptanceReady } from './terms-acceptance.js';
import './shell-events.js';
import './modal-events.js';
import './form-events.js';
import './startup-events.js';
import './tab-coordination.js';
import './pwa-ui.js';

import { getCaseFile, setCaseFile, getD, setD } from './core/state.js';
import { navigate } from './core/navigation/router.js';
import { markFilingRevisionChanged, isOutputAcknowledgedFor, clearOutputAcknowledgement } from './core/filing/output-authorization.js';
import { bindReadinessCard } from './core/filing/readiness-card.js';
import { needsScheduleAck, recordScheduleAck, normalizeScheduleDocsAck } from './core/filing/schedule-doc-ack.js';
import { installTestingNamespace } from './core/testing/testing-adapter.js';

// Milestone 70, 70T (decisions D3/T3): GuardianForms.testing, the one surface
// the browser suite drives the app through, exists only when the test runner
// set the __GUARDIAN_FORMS_TEST_MODE__ flag to true on the page before boot.
// The flag is read once and deleted here, before anything else in this file
// runs; in production nothing sets it and nothing is installed.
installTestingNamespace();

// Guarantee debug/inspection getters on window for test harness assertion compatibility
if (typeof window !== 'undefined') {
  if (!Object.getOwnPropertyDescriptor(window, 'D')) {
    Object.defineProperty(window, 'D', {
      get: () => getD(),
      set: (val) => setD(val),
      configurable: true,
      enumerable: true,
    });
  }
  if (!Object.getOwnPropertyDescriptor(window, 'caseFile')) {
    Object.defineProperty(window, 'caseFile', {
      get: () => getCaseFile(),
      set: (val) => setCaseFile(val),
      configurable: true,
      enumerable: true,
    });
  }

  window.navigate = navigate;
  // activateWard/switchWard are published by ward-lifecycle.js itself; the
  // third copy this file used to add was removed in Milestone 42E.
  window.markFilingRevisionChanged = markFilingRevisionChanged;
  window.isOutputAcknowledgedFor = isOutputAcknowledgedFor;
  // Milestone 57C-R. legacy-app.js is a classic script with no imports, so
  // normalizeWardData() reaches the acknowledgement migration through here.
  // These are advisory only -- nothing on this line participates in whether a
  // filing can be exported or in what the sidebar reports.
  window.needsScheduleAck = needsScheduleAck;
  window.recordScheduleAck = recordScheduleAck;
  window.normalizeScheduleDocsAck = normalizeScheduleDocsAck;
  // Milestone 38D/44B: a fresh module load already starts with no
  // acknowledgement (in-memory only, never persisted) -- this is defense in
  // depth for bfcache restores, where the page can become visible again
  // without a full re-evaluation of this module.
  window.addEventListener('pagehide', () => clearOutputAcknowledgement());
  // Milestone 44C: remembers the readiness card's hand toggle for same-route
  // rerenders (toggle doesn't bubble; the binding is capture-phase on document).
  bindReadinessCard(document);
}

console.log('Guardian Forms ESM bootstrap initialized.');

// Milestone 40G: start the app HERE, not at the end of legacy-app.js.
//
// legacy-app.js is a classic, parser-blocking script, so it finishes running
// before any module script has evaluated. Calling initApp() from there meant
// startup ran against a half-built global surface: window.createFeatureBridge
// (core/feature-bridge.js) did not exist yet when the dashboard mounted, and
// the persistence functions legacy-app.js shares names with (case-file.js)
// had not yet replaced their legacy counterparts. Both produced uncaught
// exceptions on every load once a case existed.
//
// Every import above has evaluated by the time this line runs, so the boot
// path now has one explicit ordering guarantee instead of racing deferred
// module evaluation. Anything startup needs from a module is present.
if (typeof window !== 'undefined') {
  if (typeof window.initApp !== 'function') {
    // Loud rather than silent: a missing initApp means legacy-app.js did not
    // load or did not parse, and the app cannot start. Swallowing that would
    // leave a blank page with no explanation.
    throw new Error('window.initApp is not available — legacy-app.js must load before main.js');
  }
  // Do not begin recovery, file-open, or new-case startup until the first-use
  // acknowledgement has been accepted. This makes the terms dialog the first
  // application interaction instead of merely a layer above an active flow.
  await termsAcceptanceReady;
  window.initApp();
}
