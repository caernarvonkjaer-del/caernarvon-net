// Milestone 70, 70J gate: "There is one case object and one derivation of the
// active filing. A save, recovery restore, import, switch, and delete each
// update that authority once." And its work: "Fault-inject transaction failure
// and route change during a pending save to prove rollback/error handling does
// not leave a half-activated filing."
//
// What a filer would see if this broke: a failed save while moving to another
// filing, or to the dashboard, leaving the sidebar and the page on one filing
// while edits land in another -- or a case file that fails to open part-way
// leaving half of it in memory, mixed with the case that was open before.
//
// The case store (src/core/state.js), the filing lifecycle (ward-lifecycle.js)
// and the case reader (case-reader.js) are the real modules. What they call
// outside the store -- the save, the cross-tab lock, the router, the feature
// services -- is stood in for, so a fault can be put at each await. (Since
// Milestone 70's 70K the lifecycle imports them; the stand-ins were window
// members, and leaving a filing is the router's leave-filing.js.) The recovery restore and the
// import merge are held by the static guards (filing-lifecycle.spec.js,
// ms70-state-seam.spec.js) and their browser specs.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const env = vi.hoisted(() => ({ calls: [], flush: async () => {}, win: null }));

vi.mock('../../src/core/persistence/case-file.js', () => ({
  flushPendingSave: (...args) => env.flush(...args),
  saveWardToState: async (ward) => { env.calls.push(`saveWard:${ward.wardId}`); },
  deleteWardFromState: async (id) => { env.calls.push(`deleteWard:${id}`); },
  showSaveError: () => { env.calls.push('showSaveError'); },
  refreshAutoSaveArmedStatus: async () => {},
  updateLastSavedIndicator: () => {},
  showAutoExportReminder: () => {},
}));
vi.mock('../../src/core/form/form-contract.js', () => ({ commitFocusedField: () => {}, commitPendingFieldValues: () => {} }));
vi.mock('../../src/core/form/prune-cards.js', () => ({ pruneBlankCards: () => {} }));
vi.mock('../../src/core/form/form-runtime.js', () => ({ linkLabelsToInputs: () => {} }));
vi.mock('../../src/core/ward-lock.js', () => ({
  showWardLockedModal: () => { env.calls.push('lockedModal'); },
  acquireWardLock: (...args) => env.win.acquireWardLock(...args),
  releaseWardLock: (...args) => env.win.releaseWardLock(...args),
}));
vi.mock('../../src/core/navigation/router.js', () => ({
  navigate: (...args) => env.win.navigate(...args),
  renderPage: async (page) => { env.calls.push(`render:${page}`); },
  closeMobileSidebar: () => {},
  setCurrentPage: () => {},
  setRouteHash: () => {},
}));
vi.mock('../../src/core/runtime/features.js', () => ({
  features: () => ({ load: (id) => env.win.loadFeature(id) }),
}));
vi.mock('../../src/core/status/nav-marks.js', () => ({ updateNavDots: () => {} }));
vi.mock('../../src/core/filing/recent-filings.js', () => ({ addToRecentlyOpened: () => {}, loadRecentlyOpenedWards: () => [] }));
vi.mock('../../src/core/shell/sidebar.js', () => ({ updateSidebar: () => {} }));
vi.mock('../../src/core/navigation/tab-state.js', () => ({ notifyProbateGuardianTabStateChanged: () => {} }));
vi.mock('../../src/core/help/help-panel.js', () => ({ updateHelpContext: () => {} }));
vi.mock('../../src/core/navigation/ward-county.js', () => ({ backfillWardPartyCounties: () => {} }));

const { activateWard, deleteWard, enterDashboardEditingFocus, switchWard, unloadWard } = await import('../../src/core/navigation/ward-lifecycle.js');
const { loadCaseFileFromZip } = await import('../../src/core/persistence/case-reader.js');
const { blankCaseFile, getActiveInventoryType, getActiveWard, getCaseFile, getD, replaceCaseFile } = await import('../../src/core/state.js');

// Two filings, A open.
function openCase() {
  const a = { wardId: 'a', inventoryType: 'annual', wardName: 'A' };
  const b = { wardId: 'b', inventoryType: 'annual', wardName: 'B' };
  replaceCaseFile({ ...blankCaseFile(), wards: [a, b], activeWardId: 'a' });
  return { a, b };
}

// Every write to a member of the case, by name: the same case, watched.
function watchCase() {
  const writes = [];
  replaceCaseFile(new Proxy(getCaseFile(), {
    set(target, key, value) { writes.push(String(key)); target[key] = value; return true; },
  }));
  return writes;
}

// Which filing is open -- and that the store's three answers to it agree: the
// case's activeWardId, the open filing, and its type. A half-activated filing
// is one where they do not.
function whatIsOpen() {
  const ward = getActiveWard();
  if (ward) {
    expect(getD(), 'the open filing is the one the case names').toBe(ward);
    expect(getActiveInventoryType(), "and its type is that filing's").toBe(ward.inventoryType ?? null);
    return ward.wardId;
  }
  expect(getActiveInventoryType(), 'no type with no filing open').toBeNull();
  expect(getD(), 'no filing open').toEqual({});
  return null;
}

let win;
beforeEach(() => {
  env.calls = [];
  env.flush = async () => { env.calls.push(`flush:${getD().wardId}`); };
  // The lock, the router and the feature loader, each a spy a test can replace.
  win = {
    acquireWardLock: vi.fn(async () => true),
    releaseWardLock: vi.fn(async () => {}),
    navigate: vi.fn(async () => true),
    loadFeature: vi.fn(async () => ({})),
    location: { hash: '' },
  };
  env.win = win;
  vi.stubGlobal('window', win);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('moving to another filing: a fault leaves the filing that was open, whole', () => {
  test("the outgoing filing's pending save runs while it is still the open one, before the next opens", async () => {
    const { b } = openCase();
    expect(await activateWard(b)).toBe(true);
    expect(env.calls).toEqual(['flush:a']);
    expect(whatIsOpen()).toBe('b');
  });

  test('that save failing: the move fails, A stays open, and B is not asked for', async () => {
    const { b } = openCase();
    env.flush = async () => { throw new Error('disk full'); };
    await expect(activateWard(b)).rejects.toThrow('disk full');
    expect(whatIsOpen()).toBe('a');
    expect(win.acquireWardLock).not.toHaveBeenCalled();
    expect(win.releaseWardLock).not.toHaveBeenCalled();
  });

  test('another tab holding B: the move is refused, A stays open with its lock kept', async () => {
    const { b } = openCase();
    win.acquireWardLock = vi.fn(async () => false);
    expect(await activateWard(b)).toBe(false);
    expect(env.calls).toContain('lockedModal');
    expect(whatIsOpen()).toBe('a');
    expect(win.releaseWardLock).not.toHaveBeenCalled();
  });

  test("the lock request throwing: the move fails, A stays open", async () => {
    openCase();
    win.acquireWardLock = vi.fn(async () => { throw new Error('BroadcastChannel closed'); });
    await expect(switchWard('b')).rejects.toThrow('BroadcastChannel closed');
    expect(whatIsOpen()).toBe('a');
  });

  test('a fault after B opened (the Inventory feature failing to load): B is open, whole -- never half of each', async () => {
    const g = { wardId: 'g', inventoryType: 'guardian', wardName: 'G' };
    openCase();
    getCaseFile().wards.push(g);
    win.loadFeature = vi.fn(async () => { throw new Error('chunk failed'); });
    await expect(activateWard(g)).rejects.toThrow('chunk failed');
    expect(whatIsOpen()).toBe('g');
  });
});

describe('leaving a filing for the dashboard while its save is pending', () => {
  test('the save failing: the filing stays open and locked, the filer is told, and the page does not move', async () => {
    openCase();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail;
    env.flush = () => new Promise((_, reject) => { fail = reject; });
    const leaving = unloadWard();
    await Promise.resolve();
    // Settled however the check goes, so a failure here cannot hang the next test.
    try { expect(whatIsOpen(), 'while the save is pending').toBe('a'); } finally { fail(new Error('write failed')); }
    await leaving;
    expect(whatIsOpen()).toBe('a');
    expect(env.calls).toContain('showSaveError');
    expect(win.releaseWardLock).not.toHaveBeenCalled();
    expect(win.navigate).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
  });

  test('a second route change during the pending save joins the first: the filing closes once', async () => {
    openCase();
    const writes = watchCase();
    let finish;
    env.flush = () => new Promise((resolve) => { finish = resolve; });
    const first = enterDashboardEditingFocus();
    const second = enterDashboardEditingFocus();
    await Promise.resolve();
    try { expect(whatIsOpen(), 'while the save is pending').toBe('a'); } finally { finish(); }
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(writes).toEqual(['activeWardId']);
    expect(whatIsOpen()).toBeNull();
    expect(win.releaseWardLock).toHaveBeenCalledTimes(1);
  });
});

describe('each operation updates the one case once', () => {
  test('a switch names the new filing once, in the same case', async () => {
    openCase();
    const writes = watchCase();
    const theCase = getCaseFile();
    expect(await switchWard('b')).toBe(true);
    expect(writes).toEqual(['activeWardId']);
    expect(getCaseFile(), 'the same case, not a replacement').toBe(theCase);
    expect(whatIsOpen()).toBe('b');
  });

  test('deleting the open filing closes it once and removes it once', async () => {
    openCase();
    const writes = watchCase();
    const theCase = getCaseFile();
    const wards = theCase.wards;
    await deleteWard('a');
    expect(writes).toEqual(['activeWardId']);
    expect(getCaseFile(), 'the same case, not a replacement').toBe(theCase);
    expect(theCase.wards).toBe(wards);
    expect(wards.map((w) => w.wardId)).toEqual(['b']);
    expect(env.calls.filter((c) => c.startsWith('deleteWard:'))).toEqual(['deleteWard:a']);
    expect(whatIsOpen()).toBeNull();
  });
});

describe('opening a case file replaces the open case once, whole', () => {
  const plain = (x) => `PLAIN:${JSON.stringify(x)}`;
  let seen;
  // A parsed .sav whose every entry, as it is read, notes the open case's filings.
  function zipOf(entries, { throwOn } = {}) {
    return {
      file(name) {
        if (name === throwOn) throw new Error(`zip entry ${name} is corrupt`);
        if (!(name in entries)) return null;
        return { async: async () => { seen.push(getCaseFile().wards.map((w) => w.wardId).join(',')); return plain(entries[name]); } };
      },
    };
  }
  const ENTRIES = {
    'parties.enc': [{ id: 'p1' }],
    'cases.enc': [{ id: 'c1' }],
    'w1.enc': { wardId: 'w1', wardName: 'One' },
    'w2.enc': { wardId: 'w2', wardName: 'Two' },
  };
  const MANIFEST = { wards: [{ file: 'w1.enc' }, { file: 'w2.enc' }], guardian: plain({ guardianName: 'Pat', guardianEmail: 'p@example.com' }) };
  let old;
  beforeEach(() => {
    seen = [];
    old = { ...blankCaseFile(), wards: [{ wardId: 'old' }], parties: [{ id: 'p-old' }], activeWardId: 'old' };
    replaceCaseFile(old);
  });

  test('while it is read the open case is untouched; then the new one is in place with every part, nothing open', async () => {
    const res = await loadCaseFileFromZip(zipOf(ENTRIES), MANIFEST, null);
    expect(res.unreadable).toEqual([]);
    expect(seen, 'the open case at each read').toEqual(['old', 'old', 'old', 'old']);
    const now = getCaseFile();
    expect(now).not.toBe(old);
    expect(now.wards.map((w) => w.wardId)).toEqual(['w1', 'w2']);
    expect(now.parties).toEqual([{ id: 'p1' }]);
    expect(now.cases).toEqual([{ id: 'c1' }]);
    expect([now.guardianName, now.guardianEmail]).toEqual(['Pat', 'p@example.com']);
    expect(whatIsOpen()).toBeNull();
    expect(old.wards.map((w) => w.wardId), 'the replaced case was not written into').toEqual(['old']);
  });

  test('a read that fails part-way leaves the open case as it was', async () => {
    await expect(loadCaseFileFromZip(zipOf(ENTRIES, { throwOn: 'w2.enc' }), MANIFEST, null)).rejects.toThrow('corrupt');
    expect(getCaseFile()).toBe(old);
    expect(old.wards.map((w) => w.wardId)).toEqual(['old']);
    expect(old.parties).toEqual([{ id: 'p-old' }]);
    expect(whatIsOpen()).toBe('old');
  });
});
