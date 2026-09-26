// Pure ESM application bootstrap and orchestration entry point.
import './core/state.js';
// Milestone 70: the classic monolith's door to module code (see the file).
// Imported before initApp() runs below -- the first moment its functions do.
import './legacy-bridge.js';
import './core/ui/dialogs.js';
import './core/party-resolver.js';
import './core/case-resolver.js';
import './core/feature-bridge.js';
import './core/ward-lock.js';
import './core/form/schedule-definitions.js';
// Milestone 33, Phase 2.3: eager, load-order-independent import so
// window.renderLocalSectionGuidance (used by legacy-app.js's shared
// updateCurrentScheduleNextButton() for every filing type) exists from the
// first render, rather than only after whichever feature happens to import
// it first (previously only guardian-inventory/index.js and
// annual-accounting/index.js did).
import './core/status/section-status.js';
// Milestones 57 and 58C imported signature-state.js, attorney-block.js and
// row-started.js here for their window bridges, which the monolith's
// computeNavChecks() read while rendering dashboard progress for filings
// never opened. Since Milestone 70's 70D the completion evaluators import
// those rules (src/core/status/completion.js, through the filing registry
// this app loads eagerly), so neither the bridges nor these imports remain.
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
import './core/excel/exceljs-loader.js';
import './core/pdf/html2pdf-loader.js';
import './fragment-loader.js';
import './features-loader.js';
import { installFeedbackModal } from './core/feedback/feedback-modal.js';
import { termsAcceptanceReady } from './terms-acceptance.js';
import { installShellEvents } from './shell-events.js';
import { installModalEvents } from './modal-events.js';
import { installFormEvents } from './form-events.js';
import './startup-events.js';
import './tab-coordination.js';
import './pwa-ui.js';

import { configureCaseStore } from './core/state.js';
import { monolith } from './core/runtime/monolith.js';
import { linkLabelsToInputs } from './core/form/form-runtime.js';
import { applyTheme, currentTheme } from './core/theme-preference.js';
import { installHelpPanelKeys } from './core/help/help-panel.js';
import { installFilingSwitcherDismiss } from './core/shell/filing-switcher.js';
import { installConvertSourceDismiss } from './core/modals/convert-ward-modal.js';
import { installWardNameComboboxDismiss } from './core/modals/filing-dialogs.js';
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

// Milestone 70, 70H: the delegated dispatchers' listeners -- the feedback
// form, the shell's controls, the dialogs (with the observer that labels each
// one), the forms -- installed once, in the order their imports used to add
// them. The terms acknowledgement's Escape guard, added when it is imported,
// stays ahead of the dialogs' Escape handler.
installFeedbackModal();
installShellEvents();
installModalEvents();
installFormEvents();

// Milestone 70, 70E: a store transaction's side effects -- the filing's
// revision marked changed, then the save scheduled (the monolith's autoSave(),
// which legacy-app.js hands in when initApp() starts). This file used to put
// window.D and window.caseFile accessors here "for the test harness"; they
// were never installed (legacy-app.js defines both first) and a writable
// window accessor over the monolith's state is the second authority the plan
// forbids, so they went.
configureCaseStore({ markRevision: markFilingRevisionChanged, save: () => monolith.autoSave() });

if (typeof window !== 'undefined') {
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
  // The page's own labels tied to their inputs, as legacy-app.js's startup
  // timer used to do (Milestone 70, 70F; see the note there).
  linkLabelsToInputs();
  // What legacy-app.js did at load for the shell (Milestone 70, 70H): the
  // theme button agrees with the theme the pre-paint script set, and the
  // controllers' document-level listeners -- Escape in the Help panel, a
  // click outside the filing switcher, the Convert dialog's source picker or
  // a ward-name field -- are installed once each.
  applyTheme(currentTheme(), false);
  installHelpPanelKeys();
  installFilingSwitcherDismiss();
  installConvertSourceDismiss();
  installWardNameComboboxDismiss();
  // Do not begin recovery, file-open, or new-case startup until the first-use
  // acknowledgement has been accepted. This makes the terms dialog the first
  // application interaction instead of merely a layer above an active flow.
  await termsAcceptanceReady;
  window.initApp();
}
