// Milestone 70, 70I: the persistence and security state each have one owner,
// in module memory, with no copy on window -- the key and the security mode
// (crypto.js), the save clock, the changed-since-save flag and the auto-save
// interval (export-state.js), the open file's handle (case-file.js) and the
// Activity Log (audit-log.js). Until 70I each was a window accessor onto
// legacy-app.js's variables (the handle was mirrored onto window), so any
// script on the page could read or replace the key.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

let win;
beforeEach(() => {
  vi.resetModules();
  win = {};
  vi.stubGlobal('window', win);
});
afterEach(() => vi.unstubAllGlobals());

describe('the key and the security mode: crypto.js, closure memory only', () => {
  test('held, read and forgotten through the module; never on window', async () => {
    const crypto = await import('../../src/core/persistence/crypto.js');
    expect(crypto.getCryptoKey()).toBeNull();
    const key = { algorithm: 'AES-GCM' };
    crypto.setCryptoKey(key);
    expect(crypto.getCryptoKey()).toBe(key);
    crypto.clearCryptoKey();
    expect(crypto.getCryptoKey()).toBeNull();
    expect(crypto.getSecurityMode()).toBe('encrypted');
    crypto.setSecurityMode('none');
    expect(crypto.getSecurityMode()).toBe('none');
    for (const name of ['_cryptoKey', '_securityMode']) {
      expect(Object.getOwnPropertyDescriptor(win, name), `window.${name}`).toBeUndefined();
    }
  });

  test('a key that fails its verifier is never held: unlocking derives, checks, and only then holds (source)', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../../src/core/security/app-lock.js', import.meta.url), 'utf8');
    const unlock = src.slice(src.indexOf("}else if(_unlockMode==='unlock'){"), src.indexOf("}else if(_unlockMode==='openFile'){"));
    expect(unlock.indexOf('setCryptoKey(key)'), 'held after the verifier check').toBeGreaterThan(unlock.indexOf("throw new Error('verifier mismatch')"));
    expect(unlock).toMatch(/catch\(e\)\{\s*clearCryptoKey\(\);/);
    const create = src.slice(src.indexOf("if(_unlockMode==='create'){"), src.indexOf("}else if(_unlockMode==='unlock'){"));
    expect(create.indexOf('setCryptoKey(key)'), 'held after the verifier is saved').toBeGreaterThan(create.indexOf("saveAppState('cryptoVerifier',verifier)"));
    const lock = src.slice(src.indexOf('export async function lockApp(){'), src.indexOf('export async function lockApp(){') + 600);
    expect(lock).toContain('clearCryptoKey();');
  });
});

describe('the save state: export-state.js', () => {
  test('the changed flag, the save clock and the interval are module values, never on window', async () => {
    const s = await import('../../src/core/persistence/export-state.js');
    expect([s.isDirtySinceExport(), s.getLastExportAt(), s.getAutoExportIntervalMinutes()]).toEqual([false, null, 10]);
    s.setDirtySinceExport(true);
    s.setLastExportAt(123);
    s.setAutoExportIntervalMinutes(30);
    expect([s.isDirtySinceExport(), s.getLastExportAt(), s.getAutoExportIntervalMinutes()]).toEqual([true, 123, 30]);
    for (const name of ['_dirtySinceExport', '_lastExportAt', '_autoExportIntervalMinutes']) {
      expect(Object.getOwnPropertyDescriptor(win, name), `window.${name}`).toBeUndefined();
    }
  });
});

describe('the open file\'s handle: case-file.js', () => {
  test('set and read through the module; not mirrored onto window', async () => {
    const cf = await import('../../src/core/persistence/case-file.js');
    const handle = { name: 'case.sav' };
    cf.setCaseFileHandle(handle);
    expect(cf.getCaseFileHandle()).toBe(handle);
    expect(win._caseFileHandle).toBeUndefined();
  });
});

describe('the Activity Log: audit-log.js', () => {
  test('entries are numbered on from a loaded log, tagged with the open filing, and a failed save takes its own back', async () => {
    const state = await import('../../src/core/state.js');
    const log = await import('../../src/core/activity/audit-log.js');
    state.replaceCaseFile({ activeWardId: 'w9', wards: [{ wardId: 'w9' }] });
    log.replaceAuditLog([{ id: 4, eventType: 'OLD' }, { id: 7, eventType: 'OLDER' }]);
    await log.auditLog('DATA_EXPORT', 'saved', true);
    const entries = await log.loadAuditLogEntries();
    expect(entries.at(-1)).toMatchObject({ id: 8, eventType: 'DATA_EXPORT', details: 'saved', success: true, wardId: 'w9' });
    const before = log.auditLogLength();
    await log.auditLog('DATA_EXPORT', 'failed write', true);
    log.truncateAuditLog(before);
    expect((await log.loadAuditLogEntries()).map((e) => e.details)).toEqual([undefined, undefined, 'saved']);
    log.replaceAuditLog([]);
    await log.auditLog('UNLOCK_SUCCESS', 'x', true);
    expect((await log.loadAuditLogEntries())[0].id).toBe(1);
    expect(win._auditLogEntries).toBeUndefined();
  });
});
