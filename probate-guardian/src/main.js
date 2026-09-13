// Pure ESM application bootstrap and orchestration entry point.
import './core/state.js';
import './core/party-resolver.js';
import './core/case-resolver.js';
import './core/feature-bridge.js';
import './core/ward-lock.js';
import './core/form/form-fields.js';
import './core/form/combobox-controller.js';
import './core/form/schedule-definitions.js';
// Milestone 33, Phase 2.3: eager, load-order-independent import so
// window.renderLocalSectionGuidance (used by legacy-app.js's shared
// updateCurrentScheduleNextButton() for every filing type) exists from the
// first render, rather than only after whichever feature happens to import
// it first (previously only guardian-inventory/index.js and
// annual-accounting/index.js did).
import './core/status/section-status.js';
import './core/persistence/crypto.js';
import './core/persistence/launch-preferences.js';
import './core/persistence/recovery-cache.js';
import './core/persistence/case-file.js';
import './core/persistence/templates.js';
import './core/navigation/ward-lifecycle.js';
import './core/navigation/ward-county.js';
import './core/navigation/router.js';
import './core/filing/output-authorization.js';
import './core/modals/convert-ward-modal.js';
import './core/modals/year-manager-modal.js';
import './core/modals/eligibility-modal.js';
import './core/excel/exceljs-loader.js';
import './core/pdf/html2pdf-loader.js';
import './fragment-loader.js';
import './features-loader.js';
import './shell-events.js';
import './modal-events.js';
import './form-events.js';
import './startup-events.js';
import './tab-coordination.js';
import './pwa-ui.js';

import { getCaseFile, setCaseFile, getD, setD } from './core/state.js';
import { navigate } from './core/navigation/router.js';
import { activateWard, switchWard } from './core/navigation/ward-lifecycle.js';
import { markFilingRevisionChanged, isOutputAcknowledgedFor } from './core/filing/output-authorization.js';

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
  window.activateWard = activateWard;
  window.switchWard = switchWard;
  window.markFilingRevisionChanged = markFilingRevisionChanged;
  window.isOutputAcknowledgedFor = isOutputAcknowledgedFor;
}

console.log('Probate Guardian ESM bootstrap initialized.');

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
  window.initApp();
}
