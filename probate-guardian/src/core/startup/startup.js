// Milestone 70, 70I: the startup, from the accepted terms to the first page, as
// an explicit state machine (MILESTONE-70-PROPOSAL.md, 70I). It was
// legacy-app.js's initApp(), which still hands the monolith's services in and
// then runs this. Each state does one thing and names the next; the states a
// launch went through are kept (startupTrace()) for the tests.
//
//   terms      the first-use acknowledgement is accepted: main.js waits for it
//              before starting, and hands the promise in, so nothing below
//              can run first.
//   launch     a remembered case file the browser still lets this page read
//              opens with no prompt (its password asked there and then)
//              -> unlock; otherwise -> choice.
//   choice     the start dialog: open a case file -- the picker or the file
//              input, a password if it is encrypted -- or start a new case.
//              A wrong password or a damaged file stays here.
//   unlock     an opened case was unlocked as it opened: the Lock button and
//              the inactivity timer start. A new case chooses plain or
//              password-protected storage, and creates the password.
//   templates  the court workbooks: bundled ones are ready; over http(s),
//              any other is fetched once.
//   position   an opened case goes back to the filing the filer was last on,
//              if the case still has it, and opens it.
//   route      the first page: the remembered one, the dashboard for an opened
//              case (or when no filing is open), else the page the address names.
//   services   the save settings shown, the retry sweep and the "last saved"
//              ticker, the reminder for browsers that cannot save in the
//              background, the drop target, the other tabs told, and the
//              unsaved-changes warning on leaving.
//
// The recovery snapshot is not a startup state: it is never offered at
// startup, only read back by a lock in the same page (recovery-cache.js).
import { notifyProbateGuardianTabStateChanged } from '../navigation/tab-state.js';
import { filingLifecycle } from '../navigation/filing-lifecycle.js';
import { loadAutoExportPrefs, setupAutoExportTimer, setupFallbackSaveReminder, setupLastSavedTicker } from '../persistence/case-file.js';
import { loadLastPosition } from '../persistence/recovery-cache.js';
import { autoLoadTemplates } from '../persistence/templates.js';
import { monolith } from '../runtime/monolith.js';
import { ensureUnlocked, resumeUnlockedSession } from '../security/app-lock.js';
import { renderCopyrightNotice, updateSidebar } from '../shell/sidebar.js';
import { openedFileAtLaunch, setupDragAndDropImport, showStartChoice, trySilentReopen, warnBeforeUnloadIfDirty } from './launch.js';
import { getActiveWard, getCaseFile } from '../state.js';

const trace = [];

/** The states the last startup went through, in order, ending 'ready'. */
export function startupTrace() {
  return [...trace];
}

const STATES = {
  async terms(ctx) {
    await ctx.termsAccepted;
    return 'launch';
  },
  async launch() {
    renderCopyrightNotice();
    return (await trySilentReopen()) ? 'unlock' : 'choice';
  },
  async choice() {
    await showStartChoice();
    return 'unlock';
  },
  async unlock(ctx) {
    ctx.opened = openedFileAtLaunch();
    if (ctx.opened) resumeUnlockedSession();
    else await ensureUnlocked(); // blocks until a valid key is in memory (or the case is plain)
    return 'templates';
  },
  async templates() {
    await autoLoadTemplates();
    return 'position';
  },
  // pg-last-position (recovery-cache.js) carries no case data, just the route
  // and filing the filer was last on -- so it means something only once an
  // existing case has been opened, and only if that filing is still in it.
  // The filing is opened through the lifecycle; until 70J the monolith first
  // pointed the case at it (focusFilingAtLaunch()), which stamped it as
  // modified in the flush before opening -- a filing reopened at launch no
  // longer is.
  async position(ctx) {
    const lastPosition = ctx.opened ? loadLastPosition() : null;
    ctx.lastPosition = lastPosition;
    ctx.positionApplies = false;
    let remembered = null;
    if (lastPosition && lastPosition.route) {
      if (lastPosition.wardId) {
        remembered = getCaseFile().wards.find((w) => w.wardId === lastPosition.wardId) || null;
        if (remembered) ctx.positionApplies = true;
      } else {
        ctx.positionApplies = true;
      }
    }
    const activeWard = remembered || getActiveWard();
    if (activeWard) {
      const ok = await filingLifecycle.open(activeWard);
      if (!ok) {
        window.location.hash = '/dashboard';
        ctx.positionApplies = false;
      }
    }
    updateSidebar();
    return 'route';
  },
  async route(ctx) {
    if (ctx.positionApplies) {
      window.location.hash = ctx.lastPosition.route;
    } else if (ctx.opened || !getCaseFile().activeWardId) {
      window.location.hash = '/dashboard'; // opened an existing case with no remembered position -- land on All Filings
    }
    monolith.handleHash();
    return 'services';
  },
  async services() {
    await loadAutoExportPrefs();
    setupAutoExportTimer();
    setupLastSavedTicker();
    setupFallbackSaveReminder();
    setupDragAndDropImport();
    notifyProbateGuardianTabStateChanged();
    window.addEventListener('beforeunload', warnBeforeUnloadIfDirty);
    return 'ready';
  },
};

/**
 * Run the startup. `termsAccepted`: the promise main.js waited on (the terms
 * state waits on it too, so nothing runs before the acknowledgement).
 */
export async function runStartup({ termsAccepted = Promise.resolve() } = {}) {
  trace.length = 0;
  const ctx = { termsAccepted, opened: false, lastPosition: null, positionApplies: false };
  let state = 'terms';
  while (state !== 'ready') {
    trace.push(state);
    const next = await STATES[state](ctx);
    if (!STATES[next] && next !== 'ready') throw new Error(`startup: no state "${next}" after "${state}"`);
    state = next;
  }
  trace.push('ready');
}
