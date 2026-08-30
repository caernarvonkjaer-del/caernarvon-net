import { TAB_HEARTBEAT_TTL_MS, TAB_WARNING_TEXT, normalizeTabState, summarizePeerTabs } from './tab-state.js';

const CHANNEL_NAME = 'probate-guardian-tabs';
const STORAGE_KEY = 'pg-tab-heartbeats-v1';
const SUPPRESS_KEY = 'pg-tab-warning-dismissed-v1';
const HEARTBEAT_MS = 4000;
const selfTabId = createTabId();
const openedAt = Date.now();
const peers = new Map();
let channel = null;
let noticeMode = null;
let publishing = false;

function createTabId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readAppVersion() {
  const fromWindow = typeof window.PG_APP_VERSION === 'string' ? window.PG_APP_VERSION : '';
  if (fromWindow) return fromWindow;
  const build = document.querySelector('meta[name="pg-build"]');
  return build ? build.getAttribute('content') || '' : '';
}

function readLocalCaseState() {
  const fromLegacy = typeof window.getProbateGuardianTabState === 'function'
    ? window.getProbateGuardianTabState()
    : {};
  return normalizeTabState({
    ...fromLegacy,
    tabId: selfTabId,
    openedAt,
    status: 'open',
    appVersion: fromLegacy.appVersion || readAppVersion(),
    updatedAt: Date.now(),
  });
}

function readStoredStates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredState(state) {
  try {
    const now = Date.now();
    const states = readStoredStates()
      .filter(item => item && item.tabId !== selfTabId && now - Number(item.updatedAt || 0) <= TAB_HEARTBEAT_TTL_MS);
    states.push(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch {}
}

function removeStoredState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readStoredStates().filter(item => item && item.tabId !== selfTabId)));
  } catch {}
}

function publishState(status = 'open') {
  if (publishing) return;
  publishing = true;
  const state = readLocalCaseState();
  if (state) {
    state.status = status;
    state.updatedAt = Date.now();
    writeStoredState(state);
    if (channel) channel.postMessage(state);
  }
  publishing = false;
  evaluatePeers();
}

function getNotice() {
  let notice = document.getElementById('tab-safety-notice');
  if (notice) return notice;
  notice = document.createElement('div');
  notice.id = 'tab-safety-notice';
  notice.className = 'app-toast tab-safety-toast';
  notice.style.top = '6.25rem';
  notice.style.bottom = 'auto';
  notice.style.zIndex = '10004';
  notice.setAttribute('role', 'status');
  const body = document.createElement('div');
  body.className = 'app-toast-body';
  const title = document.createElement('div');
  title.className = 'app-toast-title';
  const desc = document.createElement('div');
  desc.className = 'app-toast-desc';
  const actions = document.createElement('div');
  actions.className = 'app-toast-actions';
  body.append(title, desc, actions);
  notice.append(body);
  document.body.appendChild(notice);
  return notice;
}

function addButton(actions, label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  actions.appendChild(button);
}

function hideNotice(mode) {
  const notice = document.getElementById('tab-safety-notice');
  if (notice && (!mode || noticeMode === mode)) notice.style.display = 'none';
  if (!mode || noticeMode === mode) noticeMode = null;
}

function showRiskWarning(peer) {
  if (sessionStorage.getItem(SUPPRESS_KEY) === '1') return;
  const notice = getNotice();
  noticeMode = 'risk';
  notice.querySelector('.app-toast-title').textContent = 'Another tab is active';
  notice.querySelector('.app-toast-desc').textContent = peer && peer.activeCase && peer.activeCase.wardName
    ? `${TAB_WARNING_TEXT} Other tab: ${peer.activeCase.wardName}. Continuing here is safest only after the other tab has been saved or closed.`
    : `${TAB_WARNING_TEXT} Continuing here is safest only after the other tab has been saved or closed.`;
  const actions = notice.querySelector('.app-toast-actions');
  actions.replaceChildren();
  addButton(actions, 'Continue here anyway', 'btn btn-outline-danger btn-sm', () => {
    sessionStorage.setItem(SUPPRESS_KEY, '1');
    hideNotice('risk');
  });
  addButton(actions, 'Keep warning', 'btn btn-primary btn-sm', () => publishState());
  notice.style.display = 'flex';
}

function showCleanPeerNotice() {
  if (sessionStorage.getItem(SUPPRESS_KEY) === 'clean') return;
  const notice = getNotice();
  noticeMode = 'clean';
  notice.querySelector('.app-toast-title').textContent = 'Another tab is open';
  notice.querySelector('.app-toast-desc').textContent = 'Probate Guardian is open in another tab. No active case or unsaved changes have been reported there.';
  const actions = notice.querySelector('.app-toast-actions');
  actions.replaceChildren();
  addButton(actions, 'Dismiss', 'btn btn-outline-secondary btn-sm', () => {
    sessionStorage.setItem(SUPPRESS_KEY, 'clean');
    hideNotice('clean');
  });
  notice.style.display = 'flex';
}

function evaluatePeers() {
  const summary = summarizePeerTabs([...peers.values(), ...readStoredStates()], selfTabId, Date.now());
  if (summary.shouldWarn) {
    showRiskWarning(summary.riskyPeers[0]);
  } else if (summary.hasOtherOpenTab) {
    if (noticeMode === 'risk') hideNotice('risk');
    showCleanPeerNotice();
  } else {
    hideNotice();
  }
}

if ('BroadcastChannel' in window) {
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener('message', event => {
    const state = normalizeTabState(event.data);
    if (!state || state.tabId === selfTabId) return;
    if (state.status === 'closed') peers.delete(state.tabId);
    else peers.set(state.tabId, state);
    evaluatePeers();
  });
}

window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) evaluatePeers();
});
document.addEventListener('probate-guardian-state-change', () => publishState());
window.addEventListener('pagehide', () => {
  const state = readLocalCaseState();
  if (state && channel) channel.postMessage({ ...state, status: 'closed', updatedAt: Date.now() });
  removeStoredState();
});

publishState();
setInterval(publishState, HEARTBEAT_MS);
