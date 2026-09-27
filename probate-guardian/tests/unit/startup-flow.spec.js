// Milestone 70, 70I: startup is an explicit state machine
// (src/core/startup/startup.js). Each path a launch can take -- a remembered
// file reopened with no prompt, a file opened from the start dialog, a new
// case -- goes through its states in order, asks for a password only where it
// must, and lands on the right first page. Every collaborator is stood in for,
// so what is pinned is the order and the choices, not the collaborators.
import { beforeEach, describe, expect, test, vi } from 'vitest';

const calls = vi.hoisted(() => []);
const env = vi.hoisted(() => ({
  silentReopen: false, opened: false, lastPosition: null, activeWardId: null, openOk: true, wards: [],
}));
const log = (name) => (...args) => { calls.push(name); return undefined; };

vi.mock('../../src/core/startup/launch.js', () => ({
  trySilentReopen: async () => { calls.push('trySilentReopen'); if (env.silentReopen) env.opened = true; return env.silentReopen; },
  showStartChoice: async () => { calls.push('showStartChoice'); },
  openedFileAtLaunch: () => env.opened,
  setupDragAndDropImport: log('setupDragAndDropImport'),
  warnBeforeUnloadIfDirty: () => {},
}));
vi.mock('../../src/core/security/app-lock.js', () => ({
  ensureUnlocked: async () => { calls.push('ensureUnlocked'); },
  resumeUnlockedSession: log('resumeUnlockedSession'),
}));
vi.mock('../../src/core/persistence/templates.js', () => ({ autoLoadTemplates: async () => { calls.push('autoLoadTemplates'); } }));
vi.mock('../../src/core/persistence/recovery-cache.js', () => ({ loadLastPosition: () => { calls.push('loadLastPosition'); return env.lastPosition; } }));
vi.mock('../../src/core/persistence/case-file.js', () => ({
  loadAutoExportPrefs: async () => { calls.push('loadAutoExportPrefs'); },
  setupAutoExportTimer: log('setupAutoExportTimer'),
  setupLastSavedTicker: log('setupLastSavedTicker'),
  setupFallbackSaveReminder: log('setupFallbackSaveReminder'),
}));
vi.mock('../../src/core/navigation/tab-state.js', () => ({ notifyProbateGuardianTabStateChanged: log('notifyTabs') }));
vi.mock('../../src/core/navigation/filing-lifecycle.js', () => ({
  filingLifecycle: { open: async (ward) => { calls.push(`open:${ward.wardId}`); return env.openOk; } },
}));
vi.mock('../../src/core/shell/sidebar.js', () => ({ renderCopyrightNotice: log('renderCopyrightNotice'), updateSidebar: log('updateSidebar') }));
// The first page is the router's (Milestone 70, 70K: it was the monolith's
// handleHash(), a service it handed in).
vi.mock('../../src/core/navigation/router.js', () => ({
  setRouteHash: (route) => { globalThis.window.location.hash = route; },
  handleHash: () => { calls.push(`route:${globalThis.window.location.hash}`); },
}));
vi.mock('../../src/core/state.js', () => ({
  getCaseFile: () => ({ wards: env.wards, activeWardId: env.activeWardId }),
  getActiveWard: () => env.wards.find((w) => w.wardId === env.activeWardId) || null,
}));

const { runStartup, startupTrace } = await import('../../src/core/startup/startup.js');

beforeEach(() => {
  calls.length = 0;
  Object.assign(env, { silentReopen: false, opened: false, lastPosition: null, activeWardId: null, openOk: true, wards: [] });
  globalThis.window = { location: { hash: '' }, addEventListener: log('beforeunload') };
});

describe('startup, state by state', () => {
  test('a new case: the start dialog, then the security choice, no remembered position, and the dashboard', async () => {
    await runStartup();
    expect(startupTrace()).toEqual(['terms', 'launch', 'choice', 'unlock', 'templates', 'position', 'route', 'services', 'ready']);
    expect(calls).toEqual([
      'renderCopyrightNotice', 'trySilentReopen', 'showStartChoice', 'ensureUnlocked', 'autoLoadTemplates',
      'updateSidebar', 'route:/dashboard',
      'loadAutoExportPrefs', 'setupAutoExportTimer', 'setupLastSavedTicker', 'setupFallbackSaveReminder',
      'setupDragAndDropImport', 'notifyTabs', 'beforeunload',
    ]);
  });

  // Since 70J the remembered filing is opened directly: the open filing is
  // derived from the case's activeWardId, so naming it first (the monolith's
  // focusFilingAtLaunch()) would have opened it without the lifecycle.
  test('a remembered file reopened with no prompt skips the dialog, is not asked for a password again, and returns to the remembered page', async () => {
    env.silentReopen = true;
    env.wards = [{ wardId: 'w1' }];
    env.lastPosition = { route: '/p3', wardId: 'w1' };
    await runStartup();
    expect(startupTrace()).toEqual(['terms', 'launch', 'unlock', 'templates', 'position', 'route', 'services', 'ready']);
    expect(calls).not.toContain('showStartChoice');
    expect(calls).not.toContain('ensureUnlocked');
    expect(calls).toContain('resumeUnlockedSession');
    expect(calls.slice(calls.indexOf('loadLastPosition'), calls.indexOf('route:/p3') + 1))
      .toEqual(['loadLastPosition', 'open:w1', 'updateSidebar', 'route:/p3']);
  });

  test('a file opened from the start dialog whose remembered filing is gone lands on the dashboard', async () => {
    env.wards = [{ wardId: 'w2' }];
    env.lastPosition = { route: '/p3', wardId: 'w-deleted' };
    // The dialog's Open resolves the choice once the file has opened.
    env.opened = true;
    await runStartup();
    expect(startupTrace()).toEqual(['terms', 'launch', 'choice', 'unlock', 'templates', 'position', 'route', 'services', 'ready']);
    expect(calls).toContain('resumeUnlockedSession');
    expect(calls).not.toContain('ensureUnlocked');
    expect(calls.some((c) => c.startsWith('open:'))).toBe(false);
    expect(calls).toContain('route:/dashboard');
  });

  test('a remembered filing that cannot be opened here (another tab holds it) lands on the dashboard, not its page', async () => {
    env.silentReopen = true;
    env.wards = [{ wardId: 'w1' }];
    env.lastPosition = { route: '/p3', wardId: 'w1' };
    env.openOk = false;
    await runStartup();
    expect(calls).toContain('open:w1');
    expect(calls).toContain('route:/dashboard');
    expect(calls).not.toContain('route:/p3');
  });

  test('nothing runs before the terms are accepted', async () => {
    let accept;
    const termsAccepted = new Promise((resolve) => { accept = resolve; });
    const running = runStartup({ termsAccepted });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toEqual([]);
    expect(startupTrace()).toEqual(['terms']);
    accept();
    await running;
    expect(calls[0]).toBe('renderCopyrightNotice');
    expect(startupTrace().at(-1)).toBe('ready');
  });
});
