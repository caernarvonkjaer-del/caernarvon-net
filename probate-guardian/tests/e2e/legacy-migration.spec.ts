import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { gotoApp } from './support/target';

// runLegacyBrowserStorageMigrationIfNeeded() (index.html:6145) is the first
// thing initApp() does. Pre-.sav releases kept case data in an IndexedDB
// database named 'ProbateGuardian' (v3, stores: wards/appState/templates/
// auditLog, see LEGACY_STORES/LEGACY_DB_NAME/LEGACY_DB_VERSION). This test
// seeds that exact shape, then reloads so the app's own migration code
// discovers it on a fresh boot -- covering the 'none' (unencrypted) legacy
// case specifically; the encrypted-legacy-password branch is not covered
// here (flagged as a gap, not silently skipped).
async function seedLegacyDb(wards: any[]) {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('ProbateGuardian', 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('wards')) db.createObjectStore('wards', { keyPath: 'wardId' });
      if (!db.objectStoreNames.contains('appState')) db.createObjectStore('appState', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'type' });
      if (!db.objectStoreNames.contains('auditLog')) db.createObjectStore('auditLog', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['wards', 'appState'], 'readwrite');
      for (const w of wards) tx.objectStore('wards').put(w);
      // Without this, the migrated .sav's activeWardId stays null and the
      // imported ward -- though genuinely present in guardianData.wards --
      // never becomes the selected one, which is a fixture-fidelity detail,
      // not something under test here.
      if (wards[0]) tx.objectStore('appState').put({ key: 'activeWardId', value: wards[0].wardId });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

test.describe('legacy-migration (pre-.sav IndexedDB storage)', () => {
  test('unencrypted legacy data is offered, exported to .sav, and legacy storage cleared', async ({ page }) => {
    await gotoApp(page); // establishes the origin so IndexedDB can be seeded
    await page.evaluate(seedLegacyDb, [
      { wardId: 'legacy-ward-1', wardName: 'Legacy Migrated Ward', inventoryType: 'guardian', createdDate: '2020-01-01', scheduleA1: [], scheduleB1: [] },
    ]);

    const dialogMessages: string[] = [];
    page.on('dialog', (d) => { dialogMessages.push(d.message()); d.accept(); });
    const downloadPromise = page.waitForEvent('download');

    await page.reload({ waitUntil: 'networkidle' });
    const download = await downloadPromise;
    const savPath = path.join(os.tmpdir(), `pg-legacy-migrated-${Date.now()}.sav`);
    await download.saveAs(savPath);

    expect(dialogMessages.some((m) => m.includes('earlier version'))).toBe(true);
    expect(dialogMessages.some((m) => m.includes('Saved 1 form'))).toBe(true);

    // Migration exports to a file but does not load it into memory (see
    // runLegacyBrowserStorageMigrationIfNeeded()'s finally block) -- the app
    // continues to a normal fresh startup screen afterward.
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);

    // Legacy IndexedDB database itself should be gone now.
    const legacyDbGone = await page.evaluate(async () => {
      if (!indexedDB.databases) return null; // can't check on this browser; not a failure
      const dbs = await indexedDB.databases();
      return !dbs.some((d) => d.name === 'ProbateGuardian');
    });
    if (legacyDbGone !== null) expect(legacyDbGone).toBe(true);

    // And the exported file genuinely round-trips the migrated ward.
    await page.setInputFiles('#startup-open-input', savPath);
    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('Legacy Migrated Ward');
  });

  test('declining the migration offer discards the legacy data, as its own prompt text says it will', async ({ page }) => {
    // The confirm() text is explicit: "Click OK to save that existing data
    // as a .sav file now (recommended), or Cancel to discard it and start
    // fresh." Cancel is a deliberate wipe here, not a no-op -- the code
    // deletes the legacy IndexedDB database unconditionally once past that
    // prompt (index.html: the delete-database block sits after, not inside,
    // the `if(proceed)` branch), matching what it tells the user it will do.
    await gotoApp(page);
    await page.evaluate(seedLegacyDb, [
      { wardId: 'legacy-ward-2', wardName: 'Discarded Legacy Ward', inventoryType: 'guardian', createdDate: '2020-01-01' },
    ]);

    page.on('dialog', (d) => d.dismiss());
    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
    const legacyDbGone = await page.evaluate(async () => {
      if (!indexedDB.databases) return null;
      const dbs = await indexedDB.databases();
      return !dbs.some((d) => d.name === 'ProbateGuardian');
    });
    if (legacyDbGone !== null) expect(legacyDbGone).toBe(true);
  });
});
