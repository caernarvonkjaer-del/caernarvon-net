import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, exportAndCapture, acceptDynDialog } from './support/target';

// Milestone 52B: buildCaseFileBlob()/importSavArchiveOrWard() (case-file.js)
// round-trips four fields -- guardian info, parties, cases,
// dismissedPartyPairs -- through encryptCaseFileCore()/decryptCaseFileCore().
// Neither existing .sav round-trip spec (case-file-roundtrip.spec.ts,
// backup-restore-sav.spec.ts) populates parties/cases/dismissedPartyPairs at
// all -- this file closes that gap.
//
// This used to also cover recovery-cache.js's own independent
// encrypt/decrypt of the same four fields via its cross-session
// "checkSessionRestoreCacheAtLaunch()" restore. That flow, and its storage
// of parties/cases/dismissedPartyPairs, was removed in the Milestone 57
// review (see recovery-cache.js's file header) -- the session cache now
// stores only what lockApp()'s same-tab auto-lock recovery actually reads
// back (wards + guardian name/email), so there is nothing left there for
// this file to round-trip.

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
