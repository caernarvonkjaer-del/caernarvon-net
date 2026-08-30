const isHostedPwaBuild = document.querySelector('meta[name="pg-build"][content="web"]');

if (isHostedPwaBuild && location.protocol !== 'file:' && 'serviceWorker' in navigator) {
  let pwaRegistration = null;

  function getPwaNotice() {
    let notice = document.getElementById('pwa-status-notice');
    if (notice) return notice;
    notice = document.createElement('div');
    notice.id = 'pwa-status-notice';
    notice.className = 'app-toast';
    notice.style.top = '1.25rem';
    notice.style.bottom = 'auto';
    notice.setAttribute('role', 'status');
    notice.innerHTML = '<div class="app-toast-body"><div class="app-toast-title"></div><div class="app-toast-desc"></div><div class="app-toast-actions"></div></div>';
    document.body.appendChild(notice);
    return notice;
  }

  function showPwaNotice(title, text, actionLabel, action) {
    const notice = getPwaNotice();
    notice.querySelector('.app-toast-title').textContent = title;
    notice.querySelector('.app-toast-desc').textContent = text;
    const actions = notice.querySelector('.app-toast-actions');
    actions.replaceChildren();
    if (actionLabel && action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-primary btn-sm';
      button.textContent = actionLabel;
      button.addEventListener('click', action, { once: true });
      actions.appendChild(button);
    }
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'btn btn-outline-secondary btn-sm';
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', () => { notice.style.display = 'none'; }, { once: true });
    actions.appendChild(dismiss);
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
    showPwaNotice('Preparing offline access', 'Downloading forms and export tools…');
    try {
      const result = await postWorkerMessage(worker, { type: 'DOWNLOAD_OFFLINE_PACK' });
      if (result.type !== 'OFFLINE_PACK_READY') throw new Error(result.message || 'Offline download failed.');
      showPwaNotice('Offline access ready', 'All forms and export tools are available for this version.');
    } catch (error) {
      console.warn('Offline pack download failed', error);
      showPwaNotice('Offline download incomplete', 'Some files could not be downloaded. Check your connection and retry.', 'Retry', downloadOfflinePack);
    }
  }

  async function offerOfflinePack(registration) {
    const worker = navigator.serviceWorker.controller || registration.active;
    if (!worker) return;
    try {
      const status = await postWorkerMessage(worker, { type: 'GET_OFFLINE_STATUS' }, 15000);
      if (status.available && !status.ready) {
        showPwaNotice('Offline access available', 'Download all forms and export tools for use without a connection.', 'Download', downloadOfflinePack);
      }
    } catch (error) {
      console.warn('Could not read offline status', error);
    }
  }

  function showUpdateReady(registration) {
    showPwaNotice('Update ready', 'Reload to use the latest version.', 'Reload', () => {
      const worker = registration.waiting;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') window.location.reload();
      });
      worker.postMessage({ type: 'ACTIVATE_UPDATE' });
    });
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