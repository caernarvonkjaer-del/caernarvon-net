import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { gotoApp, startNewCase, chooseNoPassword, chooseEncrypted, createWard } from './support/target';

// window.showSaveFilePicker/showOpenFilePicker are deleted for every test
// (support/target.ts), so exportGuardianDataZip()/the startup Open flow
// always take the download-link / <input type=file> fallback path real
// Firefox/Safari users hit today (saveBlobAs(), index.html:3884;
// openCaseFileAtLaunch(), index.html:4550). Fixtures are generated live
// through the real export flow rather than hand-authored, since hand-
// crafting a byte-correct AES-256-GCM+HMAC archive would be far more
// fragile than just using the app to make one.
async function exportAndCapture(page: import('@playwright/test').Page) {
  const downloadPromise = page.waitForEvent('download');
  page.once('dialog', (d) => d.accept()); // exportGuardianDataZip()'s completion alert()
  await page.evaluate(() => { void (window as any).exportGuardianDataZip(); });
  const download = await downloadPromise;
  const savePath = path.join(os.tmpdir(), `pg-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sav`);
  await download.saveAs(savePath);
  return savePath;
}

test.describe('save-open-sav (fallback download/upload path)', () => {
  test('unencrypted export then open round-trips ward data', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Roundtrip Ward Plain');

    const savPath = await exportAndCapture(page);

    // Simulate closing and reopening: a fresh app instance, opened via file.
    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await page.setInputFiles('#startup-open-input', savPath);

    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('Roundtrip Ward Plain');
  });

  test('encrypted export then open: wrong password rejected, correct password round-trips data', async ({ page }) => {
    const password = 'sav-roundtrip-password-42';
    await gotoApp(page);
    await startNewCase(page);
    await chooseEncrypted(page, password);
    await createWard(page, 'Roundtrip Ward Encrypted');

    const savPath = await exportAndCapture(page);

    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await page.setInputFiles('#startup-open-input', savPath);

    // promptPasswordForFile() (index.html:3317) puts the unlock overlay in
    // 'openFile' mode -- same #unlock-overlay, no confirm row.
    await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
    await expect(page.locator('#unlock-password-confirm')).toBeHidden();

    await page.fill('#unlock-password', 'not-the-right-password');
    await page.click('#unlock-submit-btn');
    await expect(page.locator('#unlock-overlay')).toHaveClass(/show/);
    await expect(page.locator('#unlock-error')).toBeVisible();
    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/); // stays past the startup screen while retrying

    await page.fill('#unlock-password', password);
    await page.click('#unlock-submit-btn');
    await expect(page.locator('#unlock-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('Roundtrip Ward Encrypted');
  });

  test('a corrupted .sav file is rejected with an error, not a crash', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Corruption Source Ward');
    const goodPath = await exportAndCapture(page);

    const fs = await import('node:fs/promises');
    const bytes = await fs.readFile(goodPath);
    const corruptPath = goodPath.replace(/\.sav$/, '-corrupt.sav');
    // Truncate to a third of the archive -- guarantees an invalid/incomplete
    // ZIP rather than one that merely fails a checksum on one entry.
    await fs.writeFile(corruptPath, bytes.subarray(0, Math.floor(bytes.length / 3)));

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    // The failure alert() fires from inside loadCaseFileAtLaunch()'s async
    // JSZip.loadAsync() rejection, not synchronously with setInputFiles() --
    // wait for the dialog itself rather than racing a `once` handler against
    // test teardown.
    const dialogPromise = page.waitForEvent('dialog');
    await page.setInputFiles('#startup-open-input', corruptPath);
    await (await dialogPromise).accept();

    // Rejected, not crashed: still on the startup screen, no uncaught errors.
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
    expect(errors).toEqual([]);
  });
});
