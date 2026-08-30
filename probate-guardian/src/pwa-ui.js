const isHostedPwaBuild = document.querySelector('meta[name="pg-build"][content="web"]');

if (isHostedPwaBuild && location.protocol !== 'file:' && 'serviceWorker' in navigator) {
  let pwaRegistration = null;
  let updateNoticeShownFor = null;
  const reloadPendingKey = 'pg-update-reload-pending-v1';

  function getPwaNotice() {
    let notice = document.getElementById('pwa-status-notice');
    if (notice) return notice;
    notice = document.createElement('div');
    notice.id = 'pwa-status-notice';
    notice.className = 'app-toast';
    notice.style.top = '1.25rem';
    notice.style.bottom = 'auto';
    notice.style.zIndex = '10004';
    notice.setAttribute('role', 'status');
    notice.innerHTML = '<div class="app-toast-body"><div class="app-toast-title"></div><div class="app-toast-desc"></div><div class="app-toast-actions"></div></div>';
    document.body.appendChild(notice);
    return notice;
  }

  function showPwaNotice(title, text, actionsConfig = []) {
    const notice = getPwaNotice();
    notice.querySelector('.app-toast-title').textContent = title;
    notice.querySelector('.app-toast-desc').textContent = text;
    const actions = notice.querySelector('.app-toast-actions');
    actions.replaceChildren();
    for (const config of actionsConfig) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = config.className || 'btn btn-primary btn-sm';
      button.textContent = config.label;
      button.addEventListener('click', config.action, { once: true });
      actions.appendChild(button);
    }
    if (!actionsConfig.length) {
      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.className = 'btn btn-outline-secondary btn-sm';
      dismiss.textContent = 'Dismiss';
      dismiss.addEventListener('click', hidePwaNotice, { once: true });
      actions.appendChild(dismiss);
    }
    notice.style.display = 'flex';
  }

  function postWorkerMessage(worker, message, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => reject(new Error('Service worker response timed out.')), timeoutMs);
      channel.port1.onmessage = (event) => { clearTimeout(timer); resolve(event.data); };
      worker.postMessage(message, [channel.port2]);
    });
  }

  async function downloadOfflinePack() {
    const worker = navigator.serviceWorker.controller || (pwaRegistration && pwaRegistration.active);
    if (!worker) return;
    showPwaNotice('Preparing offline access', 'Downloading forms and export tools...');
    try {
      const result = await postWorkerMessage(worker, { type: 'DOWNLOAD_OFFLINE_PACK' });
      if (result.type !== 'OFFLINE_PACK_READY') throw new Error(result.message || 'Offline download failed.');
      showPwaNotice('Offline access ready', 'All forms and export tools are available for this version.');
    } catch (error) {
      console.warn('Offline pack download failed', error);
      showPwaNotice('Offline download incomplete', 'Some files could not be downloaded. Check your connection and retry.', [
        { label: 'Retry', action: downloadOfflinePack },
        { label: 'Dismiss', className: 'btn btn-outline-secondary btn-sm', action: hidePwaNotice },
      ]);
    }
  }

  async function offerOfflinePack(registration) {
    const worker = navigator.serviceWorker.controller || registration.active;
    if (!worker) return;
    try {
      const status = await postWorkerMessage(worker, { type: 'GET_OFFLINE_STATUS' }, 15000);
      if (status.available && !status.ready) {
        showPwaNotice('Offline access available', 'Download all forms and export tools for use without a connection.', [
          { label: 'Download', action: downloadOfflinePack },
          { label: 'Dismiss', className: 'btn btn-outline-secondary btn-sm', action: hidePwaNotice },
        ]);
      }
    } catch (error) {
      console.warn('Could not read offline status', error);
    }
  }

  function hidePwaNotice() {
    const notice = document.getElementById('pwa-status-notice');
    if (notice) notice.style.display = 'none';
  }

  function hasUnsavedChanges() {
    if (typeof window.pgHasUnsavedChanges === 'function') return window.pgHasUnsavedChanges();
    const state = typeof window.getProbateGuardianTabState === 'function' ? window.getProbateGuardianTabState() : null;
    return Boolean(state && state.dirty);
  }

  function reloadAfterControllerChange() {
    if (sessionStorage.getItem(reloadPendingKey) !== '1') return;
    sessionStorage.removeItem(reloadPendingKey);
    window.location.reload();
  }

  function requestUpdateActivation(registration) {
    const worker = registration.waiting;
    if (!worker) return;
    if (hasUnsavedChanges() && !confirm('This case has unsaved changes. Save or export your work before reloading.\n\nReload now anyway?')) {
      updateNoticeShownFor = null;
      showUpdateReady(registration);
      return;
    }
    sessionStorage.setItem(reloadPendingKey, '1');
    navigator.serviceWorker.addEventListener('controllerchange', reloadAfterControllerChange, { once: true });
    worker.postMessage({ type: 'ACTIVATE_UPDATE' });
  }

  function showUpdateReady(registration) {
    const worker = registration.waiting;
    if (!worker) return;
    if (updateNoticeShownFor === worker) return;
    updateNoticeShownFor = worker;
    showPwaNotice('Update ready', 'A new version of Probate Guardian is available. Save or export your work, then reload.', [
      { label: 'Reload now', action: () => requestUpdateActivation(registration) },
      { label: 'Later', className: 'btn btn-outline-secondary btn-sm', action: hidePwaNotice },
    ]);
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      pwaRegistration = registration;
      if (registration.waiting) showUpdateReady(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateReady(registration);
        });
      });
      await navigator.serviceWorker.ready;
      if (!registration.waiting) await offerOfflinePack(registration);
    } catch (error) {
      console.warn('Service worker registration failed', error);
      showPwaNotice('Offline access unavailable', 'The app still works online. Reload and try again when your connection is stable.');
    }
  });
}
