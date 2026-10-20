// Milestone 76A (approved by name by the requester, 2026-10-19, on Revision 2;
// decisions 76A-1 to 76A-4): saving never loses a case. Found by the whole-app
// review of 2026-10-18 and re-verified for Revision 2; each case below is the
// app's own lock, unlock, save and import code run against a stand-in for the
// browser's file handle:
// - an unlock queued an auto-save one second out while the lock was still
//   rebuilding the case from its file into an emptied memory, so a slow
//   re-read wrote an EMPTY case over the file (76A-1);
// - overlapping saves finished in any order, so an older one could land last;
// - an idle tab wrote its copy whenever it was hidden, and a tab wrote its
//   whole copy over filings another tab or window had saved since (76A-2: a
//   tab merges filing by filing, and asks about a filing both changed);
// - a lock emptied memory and trusted a recovery copy in browser storage that
//   can be missing (76A-3: the work is kept, encrypted, in the tab itself);
// - an edit made while a save was writing was marked as saved, and Open Backup
//   marked the case saved even when nothing was written;
// - after unlocking, the filer lost the filing they had open; a re-read that
//   failed left an empty case that the next save wrote over the file.
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import JSZip from 'jszip';

vi.mock('../../src/core/navigation/tab-state.js', () => ({ notifyProbateGuardianTabStateChanged: () => {}, getProbateGuardianTabState: () => ({}) }));
vi.mock('../../src/core/shell/sidebar.js', () => ({ refreshWardInfoCard: () => {}, syncActiveWardNameDisplay: () => {}, syncGuardianNameDisplay: () => {}, updateSidebar: () => {} }));
const opened = [];
vi.mock('../../src/core/navigation/filing-lifecycle.js', () => ({ filingLifecycle: { open: async (w) => { opened.push(w && w.wardId); return true; }, unload: async () => {} } }));
vi.mock('../../src/core/navigation/router.js', () => ({ handleHash: () => {}, setRouteHash: () => {}, navigate: async () => {}, renderPage: async () => {}, getCurrentPage: () => '/' }));
const alerts = [];
// What the dialogs answer, and what they were asked (Milestone 76D).
const dialog = { choices: null, prompt: null, confirm: true, asked: [] };
vi.mock('../../src/core/ui/dialogs.js', () => ({
  alertModal: async (m) => { alerts.push(typeof m === 'string' ? m : `${m.title || ''} ${m.message || ''}`); },
  confirmModal: async (m) => { dialog.asked.push(m); return dialog.confirm; },
  promptModal: async () => dialog.prompt,
  choicesModal: async (o) => { dialog.asked.push(o); return dialog.choices; },
  closeAllPopups: () => {}, showModal: () => {},
}));
vi.mock('../../src/core/ward-lock.js', () => ({ releaseWardLock: async () => {}, acquireWardLock: async () => true }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const els = {};
function el(id) {
  if (!els[id]) {
    const classes = new Set();
    els[id] = { id, value: '', textContent: '', innerHTML: '', title: '', style: {}, dataset: {}, disabled: false, focus() {}, click() {}, remove() {},
      classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } };
  }
  return els[id];
}

const events = [];
let M;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('document', {
    getElementById: el, addEventListener() {}, dispatchEvent() {}, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => el(`created-${Math.random()}`), body: { appendChild() {} },
    documentElement: { setAttribute() {}, getAttribute() { return null; } },
  });
  const store = {};
  vi.stubGlobal('localStorage', { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } });
  globalThis.FileReader = class { readAsArrayBuffer(b) { Promise.resolve().then(() => b.arrayBuffer()).then((r) => { this.result = r; this.onload({ target: this }); }, (e) => { this.error = e; this.onerror({ target: this }); }); } };
  globalThis.JSZip = JSZip;
  globalThis.dispatchEvent = (e) => { events.push(e); return true; };
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:x';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
  M = {
    crypto: await import('../../src/core/persistence/crypto.js'),
    cf: await import('../../src/core/persistence/case-file.js'),
    imp: await import('../../src/core/persistence/case-import.js'),
    es: await import('../../src/core/persistence/export-state.js'),
    state: await import('../../src/core/state.js'),
    lock: await import('../../src/core/security/app-lock.js'),
    hard: await import('../../src/core/security/input-hardening.js'),
  };
  M.state.configureCaseStore({ save: M.cf.autoSave });
}, 120000);

const PW = 'correct horse battery';
const WARDS = () => [
  { wardId: 'w_1', inventoryType: 'simplified', wardName: 'Jane Roe', caseNumber: '24-001-GD' },
  { wardId: 'w_2', inventoryType: 'annual', wardName: 'John Doe', caseNumber: '24-002-GD' },
];
const names = (wards) => Object.fromEntries(wards.map((w) => [w.wardId, w.wardName]));

/**
 * A stand-in for the browser's file handle: one file on "disk", a version
 * that every write (this tab's or another's) moves on, and Chrome's rule that
 * a File read after its file changed can't be read. `readDelay` makes a read
 * as slow as a case with attachments; `closeDelays` slows given writes.
 */
function diskHandle({ readDelay = 0 } = {}) {
  const disk = { blob: null, version: 0, writes: 0, failReads: false, closeDelays: [] };
  class DiskFile extends File {
    constructor(parts, version) { super(parts, 'case.sav', { lastModified: 1_700_000_000_000 + version }); this._version = version; }
    async arrayBuffer() {
      await sleep(readDelay);
      if (disk.failReads) throw new DOMException('The drive is not available', 'NotReadableError');
      if (disk.version !== this._version) throw new DOMException('The file changed after getFile()', 'NotReadableError');
      return super.arrayBuffer();
    }
  }
  const handle = {
    name: 'case.sav', kind: 'file',
    queryPermission: async () => 'granted', requestPermission: async () => 'granted',
    isSameEntry: async (o) => o === handle,
    async getFile() { return new DiskFile([disk.blob || new Blob([])], disk.version); },
    async createWritable() {
      const chunks = [];
      const delay = disk.closeDelays.shift() || 0;
      return { write: async (b) => { chunks.push(b); }, close: async () => { await sleep(delay); disk.blob = new Blob(chunks); disk.version += 1; disk.writes += 1; } };
    },
  };
  const read = async () => {
    const z = await JSZip.loadAsync(await disk.blob.arrayBuffer());
    const manifest = JSON.parse(await z.file('manifest.json').async('string'));
    const wards = [];
    for (const entry of manifest.wards) wards.push(await M.crypto.decryptJSONWithKey(await z.file(entry.file).async('string'), M.crypto.getCryptoKey()));
    return wards;
  };
  /** Another tab or window saves the case after changing it with `change`. */
  const saveElsewhere = async (change) => {
    const mine = M.state.getCaseFile();
    const theirs = structuredClone(mine);
    change(theirs);
    M.state.replaceCaseFile(theirs);
    const { blob } = await M.cf.buildCaseFileBlob();
    M.state.replaceCaseFile(mine);
    disk.blob = blob; disk.version += 1;
  };
  return { handle, disk, read, saveElsewhere };
}

async function encryptedCase({ legacy = false } = {}) {
  const salt = M.crypto.generateSaltB64();
  // `legacy`: a case made before Milestone 76K, keyed at 210,000 rounds and recording no count.
  const key = await M.crypto.deriveKeyFromPassword(PW, salt, legacy ? M.crypto.LEGACY_PBKDF2_ITERATIONS : M.crypto.PBKDF2_ITERATIONS);
  M.crypto.setSecurityMode('encrypted');
  M.crypto.setCryptoKey(key);
  M.state.setAppState('securityMode', 'encrypted');
  M.state.setAppState('cryptoSalt', salt);
  M.state.setAppState('cryptoVerifier', await M.crypto.encryptJSON(M.crypto.CRYPTO_VERIFIER_PLAINTEXT, key, 'encrypted'));
  // Milestone 76K item 2: the count the key was made with, as creating a password records it.
  M.state.setAppState('cryptoIterations', legacy ? null : M.crypto.PBKDF2_ITERATIONS);
  M.state.replaceCaseFile({ ...M.state.blankCaseFile(), guardianName: 'G. Guardian', wards: WARDS() });
}

function plainCase() {
  M.crypto.setSecurityMode('none');
  M.crypto.clearCryptoKey();
  M.state.replaceCaseFile({ ...M.state.blankCaseFile(), wards: WARDS() });
}

async function lockAndUnlock(beforeUnlock = () => {}) {
  const done = M.lock.lockApp();
  while (!el('unlock-overlay').classList.contains('show')) await sleep(5);
  beforeUnlock();
  el('unlock-password').value = PW;
  await M.lock.submitUnlockForm();
  await done;
}

async function opensWith(handle) {
  await M.cf.rememberCaseFileHandle(handle);
  await M.cf.writeCaseToHandle(handle, false);
}

beforeEach(() => { alerts.length = 0; events.length = 0; opened.length = 0; el('unlock-overlay').classList.remove('show'); });

describe('76A-1: an unlock never writes an empty case over the file', () => {
  test('a slow re-read after unlocking: the file still holds every filing, and so does the screen', async () => {
    await encryptedCase();
    const { handle, read } = diskHandle({ readDelay: 1300 });
    await opensWith(handle);
    await lockAndUnlock();
    await sleep(2500); // past the auto-save the unlock queues
    expect((await read()).length, 'the file').toBe(2);
    expect(M.state.getCaseFile().wards.length, 'the screen').toBe(2);
  }, 60000);

  test('a re-read that fails leaves the file as it was, detaches auto-save, and says so', async () => {
    await encryptedCase();
    const { handle, disk, read } = diskHandle();
    await opensWith(handle);
    await lockAndUnlock(() => { disk.failReads = true; });
    await sleep(1500);
    disk.failReads = false;
    expect((await read()).length, 'the file').toBe(2);
    expect(M.cf.getCaseFileHandle(), 'auto-save is detached').toBe(null);
    expect(alerts.join(' ')).toMatch(/could not be read again/);
  }, 60000);

  test('after unlocking, the filer is back in the filing they had open', async () => {
    await encryptedCase();
    const { handle } = diskHandle();
    await opensWith(handle);
    M.state.getCaseFile().activeWardId = 'w_2';
    await lockAndUnlock();
    expect(opened).toEqual(['w_2']);
  }, 60000);
});

// Milestone 76K item 2 (decision 76K-1): a case keyed at 210,000 rounds is
// re-keyed at 600,000 at its unlock -- only once the case is back, read with
// the key it was saved with -- and the whole file is written again.
describe('76K-1: stronger keys, taken up at an unlock', () => {
  const manifestOf = async (disk) => JSON.parse(await (await JSZip.loadAsync(await disk.blob.arrayBuffer())).file('manifest.json').async('string'));

  test('an older case comes back whole, then its file is written again at 600,000 rounds under a new salt', async () => {
    await encryptedCase({ legacy: true });
    const { handle, disk, read } = diskHandle();
    await opensWith(handle);
    const before = await manifestOf(disk);
    expect(before.version).toBe(1);
    expect(before.kdfIterations).toBeUndefined();
    await lockAndUnlock();
    await sleep(2500); // the rewrite the new key queues
    const after = await manifestOf(disk);
    expect(M.state.getAppState('cryptoIterations')).toBe(600000);
    expect(after).toMatchObject({ version: 2, kdfIterations: 600000, salt: M.state.getAppState('cryptoSalt') });
    expect(after.salt).not.toBe(before.salt);
    await expect(M.crypto.deriveAndVerifyKey(PW, after)).resolves.toBeTruthy();
    expect(names(await read())).toEqual({ w_1: 'Jane Roe', w_2: 'John Doe' });
    expect(M.state.getCaseFile().wards).toHaveLength(2);
  }, 60000);

  test('a case already at 600,000 keeps its key', async () => {
    await encryptedCase();
    const { handle, disk } = diskHandle();
    await opensWith(handle);
    const before = await manifestOf(disk);
    await lockAndUnlock();
    await sleep(1500);
    expect(await manifestOf(disk)).toMatchObject({ version: 2, kdfIterations: 600000, salt: before.salt });
  }, 60000);
});

// Milestone 76K item 2 (decision 76K-4, the requester's: "5 wrong triggers a
// 1 minute lockout"): the password asked when opening a file.
describe('76K-4: the open-file password prompt locks after five wrong passwords', () => {
  test('five wrong passwords lock it for a minute, even the right one; then it opens', async () => {
    const salt = M.crypto.generateSaltB64();
    const key = await M.crypto.deriveKeyFromPassword(PW, salt);
    const manifest = { securityMode: 'encrypted', salt, kdfIterations: 600000, verifier: await M.crypto.encryptJSON(M.crypto.CRYPTO_VERIFIER_PLAINTEXT, key, 'encrypted') };
    localStorage.removeItem('pg-open-file-lockout-v1');
    const opening = M.lock.promptPasswordForFile(manifest, null);
    const attempt = async (pw) => { el('unlock-password').value = pw; await M.lock.submitUnlockForm(); return el('unlock-error').textContent; };
    for (let i = 1; i <= 4; i++) expect(await attempt('wrong')).toBe('Incorrect password for this file.');
    expect(await attempt('wrong')).toMatch(/Too many attempts — try again in 1 minute/);
    expect(await attempt(PW)).toMatch(/Too many incorrect passwords\. Try again in 1 minute/);
    expect(M.crypto.getCryptoKey()).toBe(null);
    const now = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(now + 61_000);
    try {
      await attempt(PW);
      await opening;
      expect(M.crypto.getCryptoKey()).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  }, 60000);
});

describe('76A: one save at a time', () => {
  test('an older save never lands after a newer one', async () => {
    plainCase();
    const { handle, disk, read } = diskHandle();
    await opensWith(handle);
    disk.closeDelays.push(300); // the first save below is slow to finish
    M.es.setDirtySinceExport(true);
    const first = M.cf.saveData();
    await sleep(50);
    M.state.getCaseFile().wards[0].wardName = 'Jane Newer';
    M.es.setDirtySinceExport(true);
    const second = M.cf.saveData();
    await Promise.all([first, second]);
    expect(names(await read()).w_1).toBe('Jane Newer');
  });
});

describe('76A-2: two tabs share one case file', () => {
  test('with nothing changed, a save writes nothing', async () => {
    plainCase();
    const { handle, disk } = diskHandle();
    await opensWith(handle);
    const writes = disk.writes;
    await M.cf.saveData();
    expect(disk.writes).toBe(writes);
  });

  test('each tab keeps its own filing: the file ends with both tabs\' work', async () => {
    plainCase();
    const { handle, read, saveElsewhere } = diskHandle();
    await opensWith(handle);
    await saveElsewhere((c) => {
      c.wards[1].wardName = 'John Doe (other tab)';
      c.wards.push({ wardId: 'w_3', inventoryType: 'annual', wardName: 'New in the other tab', caseNumber: '24-003-GD' });
    });
    M.state.getCaseFile().wards[0].wardName = 'Jane Roe (this tab)';
    M.es.setDirtySinceExport(true);
    await M.cf.saveData();
    const expected = { w_1: 'Jane Roe (this tab)', w_2: 'John Doe (other tab)', w_3: 'New in the other tab' };
    expect(names(await read()), 'the file').toEqual(expected);
    expect(names(M.state.getCaseFile().wards), 'this tab').toEqual(expected);
    expect(M.es.isDirtySinceExport()).toBe(false);
  });

  test('a filing both tabs changed: the file keeps the other tab\'s until the filer chooses', async () => {
    plainCase();
    const { handle, read, saveElsewhere } = diskHandle();
    await opensWith(handle);
    await saveElsewhere((c) => { c.wards[0].wardName = 'Jane (other tab)'; });
    M.state.getCaseFile().wards[0].wardName = 'Jane (this tab)';
    M.es.setDirtySinceExport(true);
    await M.cf.saveData();
    expect(names(await read()).w_1, 'nothing is written over unasked').toBe('Jane (other tab)');
    expect(names(M.state.getCaseFile().wards).w_1, 'this tab keeps its own').toBe('Jane (this tab)');
    expect(M.es.isDirtySinceExport(), 'still unsaved').toBe(true);
    const asked = events.find((e) => e.type === 'pg:case-conflicts');
    expect(asked && asked.detail.conflicts.map((c) => c.key)).toEqual(['wards:w_1']);
    // Asked again by the next save, not answered: still the other tab's.
    await M.cf.saveData();
    expect(names(await read()).w_1).toBe('Jane (other tab)');
    M.cf.resolveCaseConflicts({ 'wards:w_1': 'mine' });
    await M.cf.saveData();
    expect(names(await read()).w_1, 'the filer kept this tab\'s').toBe('Jane (this tab)');
  });
});

describe('76A-3: a lock keeps work that is in no file', () => {
  test('a case never saved to a file comes back after unlocking, with no browser storage to fall back on', async () => {
    await encryptedCase();
    M.cf.setCaseFileHandle(null);
    M.es.setDirtySinceExport(true);
    await lockAndUnlock();
    expect(M.state.getCaseFile().wards.map((w) => w.wardName)).toEqual(['Jane Roe', 'John Doe']);
  }, 60000);
});

describe('"saved" only for what was written', () => {
  test('an edit made while a save is writing keeps the case unsaved', async () => {
    plainCase();
    const { handle, disk } = diskHandle();
    await opensWith(handle);
    disk.closeDelays.push(100);
    M.es.setDirtySinceExport(true);
    const saving = M.cf.writeCaseToHandle(handle, true);
    await sleep(30);
    M.es.setDirtySinceExport(true); // the filer types while the save is writing
    await saving;
    expect(M.es.isDirtySinceExport()).toBe(true);
  });

  test('Open Backup with no file to write to leaves the case unsaved', async () => {
    plainCase();
    const { handle, disk } = diskHandle();
    await opensWith(handle);
    const backup = new File([disk.blob], 'backup.sav');
    M.cf.setCaseFileHandle(null);
    M.state.getCaseFile().guardianName = 'An unsaved edit';
    M.es.setDirtySinceExport(true);
    await M.imp.restoreBackupSavFile(backup, null);
    expect(M.es.isDirtySinceExport()).toBe(true);
  });
});

describe('case-merge: record by record', () => {
  const rec = (id, name) => ({ wardId: id, wardName: name });
  async function merge({ base, mine, theirs, pending, activeWardId }) {
    const { caseRecords, fingerprintCase, mergeCase } = await import('../../src/core/persistence/case-merge.js');
    const [b, m, t] = [base, mine, theirs].map((w) => caseRecords({ wards: w.wards, dismissedPartyPairs: w.pairs || [] }));
    return mergeCase({ base: await fingerprintCase(b), mine: m, mineFp: await fingerprintCase(m), theirs: t, theirsFp: await fingerprintCase(t), pending, activeWardId });
  }
  const ids = (list) => list.map((w) => w.wardId);

  test('a filing deleted here and untouched there stays deleted; one deleted there and untouched here goes', async () => {
    const r = await merge({
      base: { wards: [rec('a', 'A'), rec('b', 'B')] },
      mine: { wards: [rec('b', 'B')] },
      theirs: { wards: [rec('a', 'A')] },
    });
    expect(ids(r.next.wards)).toEqual([]);
    expect(ids(r.written.wards)).toEqual([]);
    expect(r.conflicts).toEqual([]);
  });

  test('the filing open here is never closed by a deletion elsewhere: it is asked', async () => {
    const r = await merge({ base: { wards: [rec('a', 'A')] }, mine: { wards: [rec('a', 'A')] }, theirs: { wards: [] }, activeWardId: 'a' });
    expect(ids(r.next.wards)).toEqual(['a']);
    expect(r.conflicts.map((c) => c.key)).toEqual(['wards:a']);
  });

  test('the same change on both sides is no conflict; a pending one keeps the file\'s copy', async () => {
    const same = await merge({ base: { wards: [rec('a', 'A')] }, mine: { wards: [rec('a', 'A2')] }, theirs: { wards: [rec('a', 'A2')] } });
    expect(same.conflicts).toEqual([]);
    const pending = await merge({ base: { wards: [rec('a', 'T')] }, mine: { wards: [rec('a', 'M')] }, theirs: { wards: [rec('a', 'T')] }, pending: new Set(['wards:a']) });
    expect(pending.written.wards[0].wardName).toBe('T');
    expect(pending.next.wards[0].wardName).toBe('M');
  });

  test('"not the same person" decisions made on both sides are all kept', async () => {
    const r = await merge({ base: { wards: [], pairs: [] }, mine: { wards: [], pairs: [['p1', 'p2']] }, theirs: { wards: [], pairs: [['p3', 'p4']] } });
    expect(r.written.dismissedPartyPairs).toEqual([['p1', 'p2'], ['p3', 'p4']]);
  });
});

// Milestone 76C (decision 76C-1): every case this app saves opens again. The
// open limit is the measured 250 MB (it was an unmeasured 50 MB, under which
// a case with about 37 MB of statements saved but never opened again), and a
// case above it is never written. Red first: on the code before 76C a file
// over 50 MB was refused, and a case over the limit was written anyway.
describe('76C: a case is saved only if it can be opened again', () => {
  const STATEMENT = { name: 'bank-statement-march.pdf', dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK', size: 3_200_000 };
  const withStatement = () => {
    plainCase();
    M.state.getCaseFile().wards[1].scheduleDocs = { schA: { '2026-01-01_2026-12-31': { comment: '', files: [STATEMENT] } } };
  };

  test('a case file over the old 50 MB limit opens', async () => {
    const zipHead = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const big = { size: 120 * 1024 * 1024, slice: () => new Blob([zipHead]) };
    expect(await M.hard.validateImportFile(big, 'sav')).toEqual({ ok: true });
  });

  test('a case over the limit is not written: the file stays as it was, the case stays unsaved, and the largest document is named', async () => {
    withStatement();
    const { handle, disk } = diskHandle();
    await opensWith(handle);
    const before = disk.blob;
    const limit = M.hard.IMPORT_SIZE_LIMITS.sav;
    M.hard.IMPORT_SIZE_LIMITS.sav = 1000;
    try {
      M.state.getCaseFile().wards[0].wardName = 'Jane Roe (larger now)';
      M.es.setDirtySinceExport(true);
      expect(await M.cf.saveData()).toBe(false);
    } finally {
      M.hard.IMPORT_SIZE_LIMITS.sav = limit;
    }
    expect(disk.blob, 'nothing written').toBe(before);
    expect(M.es.isDirtySinceExport()).toBe(true);
    expect(el('case-size-banner').classList.contains('over')).toBe(true);
    expect(el('case-size-banner-text').textContent).toMatch(/too large to save.*bank-statement-march\.pdf \(3\.1 MB, John Doe\)/);
  });

  test('Save Backup on a case over the limit says it was not saved', async () => {
    withStatement();
    const { handle } = diskHandle();
    await opensWith(handle);
    const limit = M.hard.IMPORT_SIZE_LIMITS.sav;
    M.hard.IMPORT_SIZE_LIMITS.sav = 1000;
    try {
      await M.cf.saveBackupNow();
    } finally {
      M.hard.IMPORT_SIZE_LIMITS.sav = limit;
    }
    expect(alerts.join(' ')).toMatch(/Not saved.*too large to save/);
  });

  test('a case nearing the limit is warned about once, by banner, and still saved', async () => {
    withStatement();
    const { handle, disk } = diskHandle();
    await opensWith(handle);
    const size = disk.blob.size;
    const limit = M.hard.IMPORT_SIZE_LIMITS.sav;
    M.hard.IMPORT_SIZE_LIMITS.sav = Math.ceil(size * 1.1);
    try {
      M.cf.hideCaseSizeBanner();
      M.es.setDirtySinceExport(true);
      expect(await M.cf.saveData()).toBe(true);
      expect(el('case-size-banner').style.display).toBe('block');
      expect(el('case-size-banner').classList.contains('over')).toBe(false);
      expect(el('case-size-banner-text').textContent).toMatch(/the most this app can open again/);
      M.cf.hideCaseSizeBanner();
      M.es.setDirtySinceExport(true);
      expect(await M.cf.saveData()).toBe(true);
      expect(el('case-size-banner').style.display, 'once a session').toBe('none');
    } finally {
      M.hard.IMPORT_SIZE_LIMITS.sav = limit;
    }
  });
});

// Milestone 76D (decision 76D-1, the requester's): Open Backup did two jobs
// badly. It replaced each filing in both with the backup's copy however much
// older, unasked; brought back filings the filer had deleted; made the backup
// the case's file (and so rewrote it with this case's password, or none); and
// merged a protected backup into a case with no password without a word.
// Now Restore from Backup asks per filing, with both copies' last-edited
// dates (a stored field a save sets when a filing changed), offers what only
// the backup has, never changes the case's file or password, and says when
// protected filings are going into an unprotected case; Open Case File
// switches cases. Red first: on the code before 76D each restore case below
// replaced, added or remembered without asking, and no filing had a
// last-edited date.
describe('76D: Restore from Backup and Open Case File', () => {
  beforeEach(() => { dialog.choices = null; dialog.prompt = null; dialog.confirm = true; dialog.asked.length = 0; });

  /** A backup of the case as it is now, changed by `change`, optionally password-protected. */
  async function backupOf(change, { password = null } = {}) {
    const mine = M.state.getCaseFile();
    const theirs = structuredClone(mine);
    change(theirs);
    M.state.replaceCaseFile(theirs);
    const mode = M.crypto.getSecurityMode();
    const salt = M.state.getAppState('cryptoSalt');
    if (password) {
      const backupSalt = M.crypto.generateSaltB64();
      M.crypto.setSecurityMode('encrypted');
      M.crypto.setCryptoKey(await M.crypto.deriveKeyFromPassword(password, backupSalt));
      M.state.setAppState('cryptoSalt', backupSalt);
      M.state.setAppState('cryptoIterations', M.crypto.PBKDF2_ITERATIONS);
    }
    const { blob } = await M.cf.buildCaseFileBlob();
    if (password) {
      M.crypto.setSecurityMode(mode);
      M.crypto.clearCryptoKey();
      M.state.setAppState('cryptoSalt', salt);
    }
    M.state.replaceCaseFile(mine);
    return new File([blob], 'backup.sav');
  }
  const question = () => dialog.asked.find((a) => a && a.questions);

  test('a filing in both is replaced only by the filer\'s choice, with both copies\' last-edited dates shown', async () => {
    plainCase();
    const { handle } = diskHandle();
    await opensWith(handle);
    const backup = await backupOf((c) => { c.wards[0].wardName = 'Jane Roe (older backup)'; c.wards[0].lastEdited = '2026-09-28T16:00:00.000Z'; });
    M.state.getCaseFile().wards[0].lastEdited = '2026-10-19T16:00:00.000Z';
    await M.imp.restoreBackupSavFile(backup);
    expect(names(M.state.getCaseFile().wards).w_1, 'not answered: nothing changes').toBe('Jane Roe');
    expect(question().questions.map((q) => q.id)).toEqual(['both:w_1']);
    expect(question().questions[0].options.map((o) => o.label).join(' | '))
      .toMatch(/Keep this case's copy \(edited 10\/19\/2026.*\| Use the backup's copy \(edited 09\/28\/2026/);
    dialog.choices = { 'both:w_1': 'keep' };
    await M.imp.restoreBackupSavFile(backup);
    expect(names(M.state.getCaseFile().wards).w_1).toBe('Jane Roe');
    dialog.choices = { 'both:w_1': 'backup' };
    await M.imp.restoreBackupSavFile(backup);
    expect(names(M.state.getCaseFile().wards).w_1).toBe('Jane Roe (older backup)');
  });

  test('a filing only the backup has is offered, not added unasked', async () => {
    plainCase();
    const { handle } = diskHandle();
    await opensWith(handle);
    const backup = await backupOf((c) => { c.wards.push({ wardId: 'w_3', inventoryType: 'annual', wardName: 'Deleted Since', caseNumber: '24-003-GD' }); });
    dialog.choices = { 'added:w_3': 'skip' };
    await M.imp.restoreBackupSavFile(backup);
    expect(Object.keys(names(M.state.getCaseFile().wards))).toEqual(['w_1', 'w_2']);
    dialog.choices = { 'added:w_3': 'add' };
    await M.imp.restoreBackupSavFile(backup);
    expect(Object.keys(names(M.state.getCaseFile().wards))).toEqual(['w_1', 'w_2', 'w_3']);
  });

  test('restoring never changes the case\'s file', async () => {
    plainCase();
    const { handle } = diskHandle();
    await opensWith(handle);
    const other = diskHandle();
    const backup = await backupOf((c) => { c.wards[1].wardName = 'John Doe (backup)'; });
    dialog.choices = { 'both:w_2': 'backup' };
    await M.imp.restoreBackupSavFile(backup, other.handle);
    expect(M.cf.getCaseFileHandle()).toBe(handle);
  });

  test('a password-protected backup restored into a case with no password is warned about first', async () => {
    plainCase();
    const { handle } = diskHandle();
    await opensWith(handle);
    const backup = await backupOf((c) => { c.wards[0].wardName = 'Jane Roe (protected backup)'; }, { password: 'backup-password-76d' });
    dialog.prompt = 'backup-password-76d';
    await M.imp.restoreBackupSavFile(backup);
    const told = dialog.asked.map((a) => (typeof a === 'string' ? a : a && a.message) || '').join(' ');
    expect(told).toMatch(/password-protected, and this case has no password/);
  });

  test('a save stamps the last-edited date on a filing it changed, and on no other', async () => {
    plainCase();
    const { handle } = diskHandle();
    await opensWith(handle);
    M.state.getCaseFile().wards[1].wardName = 'John Doe, edited';
    M.es.setDirtySinceExport(true);
    await M.cf.saveData();
    const [w1, w2] = M.state.getCaseFile().wards;
    expect(w2.lastEdited).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(w1.lastEdited).toBeUndefined();
  });

  test('Open Case File asks before losing unsaved changes, then closes the case to the start screen', async () => {
    plainCase();
    M.cf.setCaseFileHandle(null);
    M.es.setDirtySinceExport(true);
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    dialog.confirm = false;
    expect(await M.imp.openAnotherCaseFile()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(M.es.isDirtySinceExport()).toBe(true);
    dialog.confirm = true;
    expect(await M.imp.openAnotherCaseFile()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(M.es.isDirtySinceExport()).toBe(false);
  });
});
