// Pure ESM application bootstrap and orchestration entry point.
import './core/state.js';
import './core/party-resolver.js';
import './core/case-resolver.js';
import './core/feature-bridge.js';
import './core/ward-lock.js';
import './core/form/form-fields.js';
import './core/form/combobox-controller.js';
import './core/form/schedule-definitions.js';
import './core/persistence/crypto.js';
import './core/persistence/launch-preferences.js';
import './core/persistence/recovery-cache.js';
import './core/persistence/case-file.js';
import './core/persistence/templates.js';
import './core/navigation/ward-lifecycle.js';
import './core/navigation/router.js';
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
}

console.log('Probate Guardian ESM bootstrap initialized.');
