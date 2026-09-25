// Milestone 43D (Decision 4, option b): this file bundles three genuinely
// separate concerns under one name -- persistence crypto services (key
// derivation, salt), .sav packaging/filename helpers, and the single
// save-clock invariant (plus a legacy-app.js parse guard riding along in
// the same describe). None has a Decision-1-style correctness defect, so
// this is pure organization, left as one file with its scope named here
// rather than split into case-file.spec.js/crypto/*.spec.js siblings.
import { describe, expect, test, beforeAll, beforeEach, afterEach } from 'vitest';
import JSZip from 'jszip';
import {
  deriveKeyFromPassword,
  generateSaltB64,
  encryptJSON,
  decryptJSONWithKey,
  PLAIN_MODE_PREFIX,
  PBKDF2_ITERATIONS,
  CRYPTO_VERIFIER_PLAINTEXT,
} from '../../src/core/persistence/crypto.js';
import {
  CASE_FILE_FORMAT_VERSION,
  getWardFileStem,
  getWardFileName,
  buildCaseFileBlob,
  buildSingleWardExportBlob,
  saveBlobAs,
} from '../../src/core/persistence/case-file.js';
import { getCaseFile, setCaseFile } from '../../src/core/state.js';

describe('persistence crypto services', () => {
  test('constants are properly defined', () => {
    expect(PBKDF2_ITERATIONS).toBe(210000);
    expect(CRYPTO_VERIFIER_PLAINTEXT).toBe('PG_VERIFIER_V1');
    expect(PLAIN_MODE_PREFIX).toBe('PLAIN:');
    expect(CASE_FILE_FORMAT_VERSION).toBe(1);
  });

  test('generateSaltB64 produces 16-byte base64 string', () => {
    const salt = generateSaltB64();
    expect(typeof salt).toBe('string');
    const bytes = atob(salt);
    expect(bytes.length).toBe(16);
  });

  test('encryptJSON and decryptJSONWithKey round-trips encrypted payload', async () => {
    const salt = generateSaltB64();
    const password = 'TestPassword123!';
    const key = await deriveKeyFromPassword(password, salt);

    const testPayload = {
      wardId: 'w-test-1',
      wardName: 'Alice Springs',
      balances: [100.5, 250.75],
    };

    const ciphertext = await encryptJSON(testPayload, key, 'encrypted');
    expect(ciphertext).toContain(':');
    expect(ciphertext.startsWith(PLAIN_MODE_PREFIX)).toBe(false);

    const decrypted = await decryptJSONWithKey(ciphertext, key);
    expect(decrypted).toEqual(testPayload);
  });

  test('encryptJSON in none mode prepends PLAIN: prefix and round-trips', async () => {
    const testPayload = { message: 'plain data', num: 42 };
    const plainEnvelope = await encryptJSON(testPayload, null, 'none');
    expect(plainEnvelope.startsWith(PLAIN_MODE_PREFIX)).toBe(true);

    const decrypted = await decryptJSONWithKey(plainEnvelope, null);
    expect(decrypted).toEqual(testPayload);
  });

  test('decryptJSONWithKey rejects wrong password/key with authentication failure', async () => {
    const salt = generateSaltB64();
    const key1 = await deriveKeyFromPassword('CorrectPassword', salt);
    const key2 = await deriveKeyFromPassword('WrongPassword', salt);

    const ciphertext = await encryptJSON({ sensitive: 'data' }, key1, 'encrypted');
    await expect(decryptJSONWithKey(ciphertext, key2)).rejects.toThrow();
  });
});

describe('case file packaging and filename helpers', () => {
  beforeAll(() => {
    if (typeof window !== 'undefined') {
      window.JSZip = JSZip;
    } else {
      globalThis.window = { JSZip };
    }
  });

  test('getWardFileStem and getWardFileName format clean alphanumeric names', () => {
    const ward1 = { wardName: 'John Doe', caseNumber: '2026-CP-001234' };
    expect(getWardFileStem(ward1)).toBe('John-Doe-2026-CP-001234-guardianshipwarddata');
    expect(getWardFileName(ward1)).toBe('John-Doe-2026-CP-001234-guardianshipwarddata.sav');

    const ward2 = { wardName: 'Jane Smith', caseNumber: '' };
    expect(getWardFileStem(ward2)).toBe('Jane-Smith-guardianshipwarddata');
    expect(getWardFileName(ward2)).toBe('Jane-Smith-guardianshipwarddata.sav');

    const wardEmpty = null;
    expect(getWardFileStem(wardEmpty)).toBe('Ward-guardianshipwarddata');
    expect(getWardFileName(wardEmpty)).toBe('Ward-guardianshipwarddata.sav');
  });

  test('buildCaseFileBlob and buildSingleWardExportBlob generate valid ZIP structure', async () => {
    const salt = generateSaltB64();
    const key = await deriveKeyFromPassword('MasterPassword!', salt);
    const { setCryptoKey, setSecurityMode } = await import('../../src/core/persistence/crypto.js');
    setCryptoKey(key);
    setSecurityMode('encrypted');

    const testCaseFile = {
      activeWardId: 'w-101',
      guardianName: 'Guardian Pro',
      guardianEmail: 'guardian@example.com',
      parties: [{ id: 'p1', name: 'John Doe' }],
      cases: [{ id: 'c1', caseNumber: '2026-CP-1' }],
      dismissedPartyPairs: [],
      wards: [
        { wardId: 'w-101', wardName: 'Ward One', caseNumber: '2026-CP-1' },
        { wardId: 'w-102', wardName: 'Ward Two', caseNumber: '2026-CP-2' },
      ],
      lastSavedFileName: 'test.sav',
    };

    setCaseFile(testCaseFile);

    // Full case archive test
    const { blob, count } = await buildCaseFileBlob();
    expect(count).toBe(2);
    expect(blob.size).toBeGreaterThan(0);

    const fullZip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(fullZip.file('manifest.json')).toBeDefined();
    expect(fullZip.file('wards/w-101.enc')).toBeDefined();
    expect(fullZip.file('wards/w-102.enc')).toBeDefined();
    expect(fullZip.file('parties.enc')).toBeDefined();
    expect(fullZip.file('cases.enc')).toBeDefined();
    expect(fullZip.file('auditLog.enc')).toBeDefined();

    const manifest = JSON.parse(await fullZip.file('manifest.json').async('string'));
    expect(manifest.format).toBe('probate-guardian-case');
    expect(manifest.version).toBe(CASE_FILE_FORMAT_VERSION);
    expect(manifest.wards.length).toBe(2);

    // Single ward export test
    const singleBlob = await buildSingleWardExportBlob('w-101');
    const singleZip = await JSZip.loadAsync(await singleBlob.arrayBuffer());
    expect(singleZip.file('manifest.json')).toBeDefined();
    expect(singleZip.file('wards/w-101.enc')).toBeDefined();
    expect(singleZip.file('wards/w-102.enc')).toBeNull(); // isolated to single ward!

    const singleManifest = JSON.parse(await singleZip.file('manifest.json').async('string'));
    expect(singleManifest.format).toBe('probate-guardian-case');
    expect(singleManifest.wards.length).toBe(1);
    expect(singleManifest.wards[0].wardId).toBe('w-101');
  });
});

// Milestone 40F: there is one "last successful save" clock, not two. The
// former second clock (_lastAutoSavedAt, set via recordAutoSaveTimestamp)
// was written before any handle/permission/write had been checked, so the
// indicator could claim a backup that never happened -- and the undeclared
// fallback reference to it in legacy-app.js threw on every page load.
describe('save timestamp indicator: one clock, only advanced by a real save', () => {
  // These unit specs run in node, not jsdom (see vitest.config.js), so the
  // indicator element is stubbed the same way other specs here stub globals.
  let indicatorEl;
  let priorDocument;

  beforeEach(() => {
    indicatorEl = { id: 'last-saved-indicator', textContent: '', style: {} };
    priorDocument = global.document;
    global.document = { getElementById: (id) => (id === 'last-saved-indicator' ? indicatorEl : null) };
  });

  afterEach(() => {
    if (priorDocument === undefined) delete global.document;
    else global.document = priorDocument;
    delete window._lastExportAt;
    delete window._dirtySinceExport;
  });

  test('the removed second clock is gone from the module surface', async () => {
    const mod = await import('../../src/core/persistence/case-file.js');
    expect(mod.recordAutoSaveTimestamp).toBeUndefined();
    expect(typeof mod.getLastExportAt).toBe('function');
    expect(typeof mod.setLastExportAt).toBe('function');
  });

  test('setLastExportAt writes through to window so bare-property readers see it', async () => {
    const { setLastExportAt, getLastExportAt } = await import('../../src/core/persistence/case-file.js');
    const now = Date.now();
    setLastExportAt(now);
    // ward-lifecycle.js reads window._lastExportAt as a plain property, not
    // via the getter, so the write must land there too.
    expect(window._lastExportAt).toBe(now);
    expect(getLastExportAt()).toBe(now);
  });

  test('a recorded save renders as a backup; dirty-with-no-save does not', async () => {
    const { setLastExportAt, setDirtySinceExport, updateLastSavedIndicator } =
      await import('../../src/core/persistence/case-file.js');

    setLastExportAt(null);
    setDirtySinceExport(true);
    updateLastSavedIndicator();
    expect(indicatorEl.textContent).toContain('Unsaved changes');
    expect(indicatorEl.textContent).not.toContain('Last backup:');

    setLastExportAt(Date.now());
    updateLastSavedIndicator();
    expect(indicatorEl.textContent).toContain('Last backup:');
  });

  // Source-level guard, because this one cannot be reached by name from e2e:
  // legacy-app.js keeps its own copy of updateLastSavedIndicator(), and that
  // copy is what runs during initApp() -- before main.js's modules evaluate
  // and replace window.updateLastSavedIndicator. Its undeclared
  // _lastAutoSavedAt reference threw a ReferenceError on every load once a
  // case existed, aborting the rest of initApp(). The existing clean-console
  // e2e test never caught it because a fresh install blocks at the
  // startup-choice overlay and never reaches that line.
  test('no executable reference to the removed second clock survives in either implementation', async () => {
    const { readFile } = await import('node:fs/promises');
    for (const file of ['src/legacy-app.js', 'src/core/persistence/case-file.js']) {
      const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
      const offending = source
        .split('\n')
        .map((line, i) => ({ line: line.trim(), no: i + 1 }))
        .filter(({ line }) => line.includes('_lastAutoSavedAt') && !line.startsWith('//'));
      expect(offending, `${file} still references _lastAutoSavedAt in executable code`).toEqual([]);
    }
  });

  // legacy-app.js is a classic script: no unit spec imports it and tsc does
  // not type-check it, so a syntax error in it passes both `npm run test:unit`
  // and `npm run check:types` and only surfaces when a browser loads the app.
  // A stray brace left by a block deletion during this milestone did exactly
  // that. Parsing it here keeps the fast checks honest.
  test('legacy-app.js parses as a script', async () => {
    const { readFile } = await import('node:fs/promises');
    const { default: vm } = await import('node:vm');
    const source = await readFile(new URL('../../src/legacy-app.js', import.meta.url), 'utf8');
    expect(() => new vm.Script(source, { filename: 'legacy-app.js' })).not.toThrow();
  });

  test('recovery-cache failures do not invoke the durable save-error banner', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(new URL('../../src/legacy-app.js', import.meta.url), 'utf8');
    const recoveryBlock = source.match(/if\(_dirtySinceExport\)\{([\s\S]*?)\n  \}\n  \/\/ No "last saved" stamp/);
    expect(recoveryBlock, 'saveData recovery-cache block should remain explicit').not.toBeNull();
    expect(recoveryBlock[1]).not.toMatch(/showSaveError\(\)/);
    expect(recoveryBlock[1]).not.toMatch(/hideSaveError\(\)/);
  });

  test('beginRecordingExport advances the clock and its rollback restores it', async () => {
    const { beginRecordingExport, setLastExportAt, getLastExportAt } =
      await import('../../src/core/persistence/case-file.js');

    setLastExportAt(null);
    const rollback = await beginRecordingExport('unit-test write');
    expect(getLastExportAt()).toBeGreaterThan(0);

    // A failed write must not leave a save recorded that never happened.
    rollback();
    expect(getLastExportAt()).toBeNull();
    expect(window._lastExportAt).toBeNull();
  });
});

// Milestone 62: only manual saves reach the Activity Log. writeCaseToHandle()'s
// `viaTimer` is true for the interval sweep AND the debounced save after each
// edit, so both stay out of the log while still advancing the save clock.
describe('activity log: automatic saves are not logged', () => {
  let logged;
  let priorAuditLog;
  let priorEntries;
  let priorMode;
  let priorDispatch;

  beforeEach(async () => {
    const { getSecurityMode, setSecurityMode } = await import('../../src/core/persistence/crypto.js');
    priorMode = getSecurityMode();
    setSecurityMode('none');
    logged = [];
    priorAuditLog = window.auditLog;
    priorEntries = window._auditLogEntries;
    window._auditLogEntries = [];
    priorDispatch = window.dispatchEvent;
    window.dispatchEvent = () => true;
    window.auditLog = async (type, message, ok) => {
      logged.push({ type, message, ok });
      window._auditLogEntries.push({ type, message, ok });
    };
    setCaseFile({
      activeWardId: null, guardianName: 'G', guardianEmail: '',
      parties: [], cases: [], dismissedPartyPairs: [],
      wards: [{ wardId: 'w-1', wardName: 'One', caseNumber: '1' }, { wardId: 'w-2', wardName: 'Two', caseNumber: '2' }],
    });
  });

  afterEach(async () => {
    const { setSecurityMode } = await import('../../src/core/persistence/crypto.js');
    setSecurityMode(priorMode);
    if (priorAuditLog === undefined) delete window.auditLog;
    else window.auditLog = priorAuditLog;
    if (priorEntries === undefined) delete window._auditLogEntries;
    else window._auditLogEntries = priorEntries;
    if (priorDispatch === undefined) delete window.dispatchEvent;
    else window.dispatchEvent = priorDispatch;
    delete window._lastExportAt;
    delete window._dirtySinceExport;
  });

  const fakeHandle = () => ({
    name: 'case.sav',
    createWritable: async () => ({ write: async () => {}, close: async () => {} }),
  });

  test('beginRecordingExport with log:false advances the clock but writes no entry', async () => {
    const { beginRecordingExport, setLastExportAt, getLastExportAt } =
      await import('../../src/core/persistence/case-file.js');
    setLastExportAt(null);
    const rollback = await beginRecordingExport('quiet', null, { log: false });
    expect(getLastExportAt()).toBeGreaterThan(0);
    expect(logged).toEqual([]);

    // Its rollback must not truncate entries someone else logged meanwhile.
    window._auditLogEntries.push({ type: 'UNLOCK_SUCCESS' });
    rollback();
    expect(getLastExportAt()).toBeNull();
    expect(window._auditLogEntries).toEqual([{ type: 'UNLOCK_SUCCESS' }]);
  });

  test('beginRecordingExport still logs by default', async () => {
    const { beginRecordingExport } = await import('../../src/core/persistence/case-file.js');
    await beginRecordingExport('manual write');
    expect(logged).toEqual([{ type: 'DATA_EXPORT', message: 'manual write', ok: true }]);
  });

  test('an automatic write (viaTimer=true) is not logged but still counts as the last backup', async () => {
    const { writeCaseToHandle, setLastExportAt, getLastExportAt } =
      await import('../../src/core/persistence/case-file.js');
    setLastExportAt(null);
    const count = await writeCaseToHandle(fakeHandle(), true);
    expect(count).toBe(2);
    expect(logged).toEqual([]);
    expect(getLastExportAt()).toBeGreaterThan(0);
  });

  test('a manual write (viaTimer=false) is logged as a backup save', async () => {
    const { writeCaseToHandle } = await import('../../src/core/persistence/case-file.js');
    await writeCaseToHandle(fakeHandle(), false);
    expect(logged).toEqual([{ type: 'DATA_EXPORT', message: 'Saved 2 form(s) to existing backup file', ok: true }]);
  });

  test('a failed automatic write leaves the log and the save clock untouched', async () => {
    const { writeCaseToHandle, setLastExportAt, getLastExportAt } =
      await import('../../src/core/persistence/case-file.js');
    setLastExportAt(null);
    const failing = { name: 'case.sav', createWritable: async () => { throw new Error('disk full'); } };
    await expect(writeCaseToHandle(failing, true)).rejects.toThrow('disk full');
    expect(logged).toEqual([]);
    expect(getLastExportAt()).toBeNull();
  });
});

// saveBlobAs()'s pre-write validator contract, moved from
// tests/e2e/case-file-protection.spec.ts by Milestone 70's 70T (that test
// called window.saveBlobAs() with window.validateWardBackupOverwrite). The
// filer's path through it -- the dashboard's Backup button refusing to
// overwrite the multi-filing case file -- stays in that browser spec.
describe('saveBlobAs(): a pre-write validator that refuses stops the write', () => {
  let picked;
  beforeEach(() => {
    picked = { name: 'case-file.sav', writes: [], createWritableCalls: 0 };
    picked.createWritable = async () => {
      picked.createWritableCalls += 1;
      return { write: async (b) => { picked.writes.push(b); }, close: async () => {} };
    };
    globalThis.window = { ...(globalThis.window || {}), showSaveFilePicker: async () => picked };
  });
  afterEach(() => { delete globalThis.window.showSaveFilePicker; });

  test('a refusal throws AbortError before anything is opened for writing', async () => {
    const seen = [];
    await expect(saveBlobAs(new Blob(['x']), 'test.sav', async (handle) => { seen.push(handle); return false; }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(seen).toEqual([picked]);
    expect(picked.createWritableCalls).toBe(0);
    expect(picked.writes).toEqual([]);
  });

  test('control: an approval writes the blob to the picked file', async () => {
    const blob = new Blob(['x']);
    await expect(saveBlobAs(blob, 'test.sav', async () => true)).resolves.toBe(picked);
    expect(picked.writes).toEqual([blob]);
  });
});
