// The start dialog's and the unlock dialog's controls (data-startup-action,
// data-startup-change). Installed once by main.js (Milestone 70, 70I); it
// used to add its listeners when imported.
import { handleStartupOpenInputChange, openCaseFileAtLaunch, openWardFileAtLaunch, startNewCaseAtLaunch, startNewWardAtLaunch } from './core/startup/launch.js';
import { selectSecurityMode, submitUnlockForm } from './core/security/app-lock.js';
export function installStartupEvents({ signal } = {}) {
  document.addEventListener('click', (event) => {
    const control = event.target instanceof Element ? event.target.closest('[data-startup-action]') : null;
    if (!control) return;
    switch (control.dataset.startupAction) {
      case 'open-ward':
      case 'open-case': (openWardFileAtLaunch || openCaseFileAtLaunch)(); break;
      case 'select-security': selectSecurityMode(control.dataset.securityMode); break;
      case 'start-new-ward':
      case 'start-new-case': (startNewWardAtLaunch || startNewCaseAtLaunch)(); break;
      case 'submit-unlock': submitUnlockForm(); break;
    }
  }, { signal });

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && (input.dataset.startupChange === 'open-ward' || input.dataset.startupChange === 'open-case')) {
      handleStartupOpenInputChange(input);
    }
  }, { signal });
}
