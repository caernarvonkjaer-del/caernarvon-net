import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, exportAndCapture, acceptDynDialog } from './support/target';

// Milestone 52B: buildCaseFileBlob()/importSavArchiveOrWard() (case-file.js)
// and saveSessionRestoreCache()/checkSessionRestoreCacheAtLaunch()
// (recovery-cache.js) each independently encrypted/decrypted the same four
// fields -- guardian info, parties, cases, dismissedPartyPairs -- with one
// real asymmetry: case-file.js already tolerated a corrupted parties/cases/
// partyDismissals blob (warn and fall back to []), while recovery-cache.js
// had no per-field guard, so the same corruption there aborted the entire
// session-restore. Both now share encryptCaseFileCore()/
// decryptCaseFileCore() in case-file.js, and recovery-cache.js is the one
// brought up to the tolerant standard. Neither existing .sav round-trip
// spec (case-file-roundtrip.spec.ts, backup-restore-sav.spec.ts) populates
// parties/cases/dismissedPartyPairs at all -- this file closes that gap and
// is the regression test for the behavior change.

async function seedCoreFields(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const caseFile = (window as any).caseFile;
    caseFile.parties = [
      { id: 'party-1', name: 'Alice Guardian', role: 'guardian' },
      { id: 'party-2', name: 'Bob Ward', role: 'ward' },
    ];
    caseFile.cases = [
      { id: 'case-1', caseNumber: '2026-CP-000052' },
    ];
    (window as any).dismissPartyPair('party-1', 'party-2');
    return {
      parties: caseFile.parties,
      cases: caseFile.cases,
      dismissedPartyPairs: caseFile.dismissedPartyPairs,
    };
  });
}

test.describe('Case-file core fields (parties/cases/dismissedPartyPairs) round-trip (Milestone 52B)', () => {
  test('survive a full .sav export and reimport', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Core Fields Ward', 'guardian');
    const seeded = await seedCoreFields(page);

    const savPath = await exportAndCapture(page);

    await page.evaluate(() => {
      (window as any).caseFile.wards = [];
      (window as any).caseFile.parties = [];
      (window as any).caseFile.cases = [];
      (window as any).caseFile.dismissedPartyPairs = [];
    });

    await page.setInputFiles('#backup-import-input', savPath);
    await acceptDynDialog(page); // importSavArchiveOrWard()'s confirmModal()

    await expect.poll(() => page.evaluate(() => (window as any).caseFile.wards.length)).toBeGreaterThan(0);
    const restored = await page.evaluate(() => ({
      parties: (window as any).caseFile.parties,
      cases: (window as any).caseFile.cases,
      dismissedPartyPairs: (window as any).caseFile.dismissedPartyPairs,
    }));
    expect(restored.parties).toEqual(seeded.parties);
    expect(restored.cases).toEqual(seeded.cases);
    expect(restored.dismissedPartyPairs).toEqual(seeded.dismissedPartyPairs);
  });

  test('survive a session-restore cache save and restore', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Cache Core Fields Ward', 'guardian');
    const seeded = await seedCoreFields(page);
    await page.evaluate(() => (window as any).flushPendingSave());

    await page.reload();
    await acceptDynDialog(page); // checkSessionRestoreCacheAtLaunch()'s confirmModal()
    await acceptDynDialog(page); // trailing "Restored N form(s)..." alertModal()

    const restored = await page.evaluate(() => ({
      parties: (window as any).caseFile.parties,
      cases: (window as any).caseFile.cases,
      dismissedPartyPairs: (window as any).caseFile.dismissedPartyPairs,
    }));
    expect(restored.parties).toEqual(seeded.parties);
    expect(restored.cases).toEqual(seeded.cases);
    expect(restored.dismissedPartyPairs).toEqual(seeded.dismissedPartyPairs);
  });

  test('a corrupted parties field in the session-restore cache no longer aborts the whole restore', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Corruption Recovery Ward', 'guardian');
    await seedCoreFields(page);
    await page.evaluate(() => (window as any).flushPendingSave());

    // Mangle just the `parties` ciphertext in the IndexedDB record directly
    // -- same db/store/key saveSessionRestoreCache() itself writes to
    // (pg-session-cache / snapshot / 'current').
    await page.evaluate(() => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('pg-session-cache', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('snapshot', 'readwrite');
        const store = tx.objectStore('snapshot');
        const getReq = store.get('current');
        getReq.onerror = () => reject(getReq.error);
        getReq.onsuccess = () => {
          const record = getReq.result;
          record.parties = 'not-valid-ciphertext';
          const putReq = store.put(record, 'current');
          putReq.onerror = () => reject(putReq.error);
          putReq.onsuccess = () => resolve();
        };
      };
    }));

    // Deliberately not page.reload(): the app's own beforeunload handler
    // calls flushPendingSave() -> saveSessionRestoreCache() with the
    // still-good in-memory data, which would silently overwrite the
    // corruption just written above before the next load ever reads it.
    // checkSessionRestoreCacheAtLaunch() is bridged onto window and safe to
    // call directly -- it doesn't care whether "launch" is literal.
    const restorePromise = page.evaluate(() => (window as any).checkSessionRestoreCacheAtLaunch());
    await acceptDynDialog(page); // confirmModal() offering to restore
    await acceptDynDialog(page); // "Restored N form(s)..." -- must still appear
    const restoreOk = await restorePromise;

    // Before Milestone 52B, decryptJSONWithKey() throwing on the corrupted
    // `parties` field propagated to checkSessionRestoreCacheAtLaunch()'s
    // outer catch, which aborts the ENTIRE restore ("Could not restore the
    // previous session...") -- the ward and guardian info would have been
    // lost right along with the one bad field. Now only parties resets.
    expect(restoreOk, 'checkSessionRestoreCacheAtLaunch() reports success, not the all-or-nothing failure').toBe(true);
    const state = await page.evaluate(() => ({
      wardCount: (window as any).caseFile.wards.length,
      parties: (window as any).caseFile.parties,
    }));
    expect(state.wardCount, 'ward survives the restore despite the corrupted parties field').toBeGreaterThan(0);
    expect(state.parties, 'parties falls back to empty rather than aborting the whole restore').toEqual([]);
  });

  // Milestone 54: selectedCircuit is case-scoped state, but it deliberately
  // does NOT ride alongside the four core fields above -- it lives in the
  // encrypted appState blob (case-file.js's buildCaseFileBlob() comment
  // explains why), which importSavArchiveOrWard()'s MERGE path (wards by id,
  // parties/cases appended -- see the function's own comments) has never
  // read for anything. An earlier version of this fix routed selectedCircuit
  // through the same four-field core decryptCaseFileCore() shares with
  // recovery-cache.js and defaulted a missing value to 6 there, which meant
  // importing ANY archive predating this field -- a restored backup, a
  // single-ward export from an older session -- silently reset the current
  // circuit to 6 even though nothing about that import should have touched
  // it. Moving it out of the shared core removes the whole bug class by
  // construction: this import path simply never reaches selectedCircuit, so
  // there is nothing left to default.
  test('importing an archive never changes the current selectedCircuit, no matter what the archive itself carries', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Circuit Import Ward', 'guardian');
    // Exported while the session default (6) is in effect -- so the archive
    // being imported below does carry its own circuit data (6, via
    // appState), just not the one this test cares about proving is ignored.
    const savPath = await exportAndCapture(page);

    await page.evaluate(() => { (window as any).caseFile.selectedCircuit = 12; });

    await page.setInputFiles('#backup-import-input', savPath);
    await acceptDynDialog(page);
    await expect.poll(() => page.evaluate(() => (window as any).caseFile.wards.length)).toBeGreaterThan(0);

    const selectedCircuit = await page.evaluate(() => (window as any).caseFile.selectedCircuit);
    expect(selectedCircuit, 'a merge-import must never change the current circuit selection').toBe(12);
  });
});
