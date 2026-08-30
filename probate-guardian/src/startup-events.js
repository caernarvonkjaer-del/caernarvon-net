document.addEventListener('click', (event) => {
  const control = event.target instanceof Element ? event.target.closest('[data-startup-action]') : null;
  if (!control) return;
  switch (control.dataset.startupAction) {
    case 'open-case': window.openCaseFileAtLaunch(); break;
    case 'select-security': window.selectSecurityMode(control.dataset.securityMode); break;
    case 'start-new-case': window.startNewCaseAtLaunch(); break;
    case 'submit-unlock': window.submitUnlockForm(); break;
  }
});

document.addEventListener('change', (event) => {
  const input = event.target;
  if (input instanceof HTMLInputElement && input.dataset.startupChange === 'open-case') {
    window.handleStartupOpenInputChange(input);
  }
});