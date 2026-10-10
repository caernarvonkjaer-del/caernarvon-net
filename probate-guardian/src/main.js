// The composition root: the one module that may import every layer -- core,
// the shell's controllers and the filing features' loaders -- and wires them.
// It installs window.GuardianForms first, then the listeners, then starts the
// app once the first-use terms are accepted: startGuardianForms() (Milestone
// 70, 70K), a direct call where it used to look up the classic monolith's
// window.initApp().
import { installGuardianForms } from './core/runtime/browser-api.js';
// The router hands its navigate() to the modules it imports as it loads
// (route-state.js); the rest of what main.js imports below is for what it
// wires. Until Milestone 70's 70K this list also held some twenty modules
// imported only for the window globals they published as they loaded -- they
// publish nothing now, and each is imported by what uses it.
import './core/navigation/router.js';
import { installFeedbackModal } from './core/feedback/feedback-modal.js';
import { termsAcceptanceReady } from './terms-acceptance.js';
import { installShellEvents } from './shell-events.js';
import { installModalEvents } from './modal-events.js';
import { installFormEvents } from './form-events.js';
import { installStartupEvents } from './startup-events.js';
// Both do their work as they load: the other tabs' view of this one, and the
// offline-install prompt.
import './tab-coordination.js';
import './pwa-ui.js';

import { configureCaseStore } from './core/state.js';
import { autoSave, installSaveListeners } from './core/persistence/case-file.js';
import { commitPendingFieldValues } from './core/form/form-contract.js';
import { installAppLockListeners } from './core/security/app-lock.js';
import { linkLabelsToInputs } from './core/form/form-runtime.js';
import { applyTheme, currentTheme } from './core/theme-preference.js';
import { installHelpPanelKeys } from './core/help/help-panel.js';
import { installFilingSwitcherDismiss } from './core/shell/filing-switcher.js';
import { installConvertSourceDismiss } from './core/modals/convert-ward-modal.js';
import { installWardNameComboboxDismiss } from './core/modals/filing-dialogs.js';
import { markFilingRevisionChanged, clearOutputAcknowledgement } from './core/filing/output-authorization.js';
import { bindReadinessCard } from './core/filing/readiness-card.js';
import { startGuardianForms } from './core/startup/bootstrap.js';
import { installLiveParts } from './core/ui/live-parts.js';
import { installDocumentsFollowDates } from './core/filing/schedule-docs.js';
import { installSidebarFollowsChanges } from './core/shell/sidebar.js';
import { featureServices } from './features-loader.js';

// window.GuardianForms, before anything else in this file runs: its version
// always, and GuardianForms.testing -- the one surface the browser suite
// drives the app through -- only when the test runner set the
// __GUARDIAN_FORMS_TEST_MODE__ flag to true on the page before boot (Milestone
// 70, 70T, decisions D3/T3). The flag is read once and deleted; in production
// nothing sets it.
installGuardianForms();

// Milestone 70, 70I: what legacy-app.js added as it loaded, and so ahead of
// every other listener -- the unlock dialog's Enter key and the activity that
// holds off the inactivity lock, then saving before the page goes.
installAppLockListeners();
installSaveListeners();

// Milestone 70, 70H: the delegated dispatchers' listeners -- the feedback
// form, the shell's controls, the dialogs (with the observer that labels each
// one), the forms -- installed once, in the order their imports used to add
// them. The terms acknowledgement's Escape guard, added when it is imported,
// stays ahead of the dialogs' Escape handler.
installFeedbackModal();
installShellEvents();
installModalEvents();
installFormEvents();
installStartupEvents();

// Milestone 75A: documents attached before the reporting dates join them
// when they're typed -- installed first, so the parts below redraw with them.
installDocumentsFollowDates();

// Milestone 73J part 2: page parts and the sidebar's names follow every
// announced change (src/core/model-change.js).
installLiveParts();
installSidebarFollowsChanges();

// Milestone 70, 70E: a store transaction's side effects -- the filing's
// revision marked changed, then the save scheduled. This file used to put
// window.D and window.caseFile accessors here "for the test harness"; they
// were never installed (legacy-app.js defined both first) and a writable
// window accessor over the monolith's state is the second authority the plan
// forbids, so they went.
// The case store's hooks (Milestone 70, 70I): a write marks the filing's
// revision and schedules the save; a flush first commits the field still being
// typed in. Wired here, where both sides are imported, so the save and the
// form layer need not import each other.
configureCaseStore({ markRevision: markFilingRevisionChanged, save: autoSave, commitPending: commitPendingFieldValues });

if (typeof window !== 'undefined') {
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

// Start the app here, once every import above has evaluated: one explicit
// ordering guarantee (Milestone 40G moved the start out of legacy-app.js,
// whose classic script ran before any module and so reached a half-built
// global surface; since 70K nothing is looked up on window at all).
if (typeof window !== 'undefined') {
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
  // The features go in as a service (core may not import them), then the
  // startup runs; the terms promise goes with it, for its first state.
  await startGuardianForms({ features: featureServices, termsAccepted: termsAcceptanceReady });
}
