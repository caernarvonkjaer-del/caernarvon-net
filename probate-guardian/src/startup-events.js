document.addEventListener('click', (event) => {
  const control = event.target instanceof Element ? event.target.closest('[data-startup-action]') : null;
  if (!control) return;
  switch (control.dataset.startupAction) {
    case 'open-ward':
    case 'open-case': (window.openWardFileAtLaunch || window.openCaseFileAtLaunch)(); break;
    case 'select-security': window.selectSecurityMode(control.dataset.securityMode); break;
    case 'start-new-ward':
    case 'start-new-case': (window.startNewWardAtLaunch || window.startNewCaseAtLaunch)(); break;
    case 'submit-unlock': window.submitUnlockForm(); break;
  }
});

document.addEventListener('change', (event) => {
  const input = event.target;
  if (input instanceof HTMLInputElement && (input.dataset.startupChange === 'open-ward' || input.dataset.startupChange === 'open-case')) {
    window.handleStartupOpenInputChange(input);
  }
});