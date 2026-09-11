import { describe, expect, test, beforeAll } from 'vitest';
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

describe('incremental save timestamp indicator', () => {
  test('recordAutoSaveTimestamp updates _lastAutoSavedAt and updates indicator', async () => {
    const { recordAutoSaveTimestamp, updateLastSavedIndicator } = await import('../../src/core/persistence/case-file.js');
    const now = Date.now();
    recordAutoSaveTimestamp(now);
    expect(window._lastAutoSavedAt).toBe(now);

    if (typeof document !== 'undefined') {
      const indicatorEl = document.createElement('div');
      indicatorEl.id = 'last-saved-indicator';
      document.body.appendChild(indicatorEl);

      updateLastSavedIndicator();
      expect(indicatorEl.textContent).toContain('Last backup:');
      document.body.removeChild(indicatorEl);
    }
  });
});
