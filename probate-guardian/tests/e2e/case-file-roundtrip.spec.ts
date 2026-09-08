import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { gotoApp, startNewCase, chooseNoPassword, chooseEncrypted, createWard, exportAndCapture } from './support/target';

test.describe('Case file .sav round-trip: unencrypted, encrypted, and corrupted paths', () => {
  test('unencrypted export then open round-trips ward data', async ({ browser }) => {
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Roundtrip Ward Plain');

      savPath = await exportAndCapture(page);
    } finally {
      await context.close();
    }

    // Simulate closing and reopening: a fresh app instance, opened via file.
    const reopenContext = await browser.newContext();
    try {
      const reopenPage = await reopenContext.newPage();
      await gotoApp(reopenPage);
      await reopenPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      await reopenPage.setInputFiles('#startup-open-input', savPath);

      await expect(reopenPage.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('Roundtrip Ward Plain');
    } finally {
      await reopenContext.close();
    }
  });

  test('encrypted export then open: wrong password rejected, correct password round-trips data', async ({ browser }) => {
    const password = 'sav-roundtrip-password-42';
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseEncrypted(page, password);
      await createWard(page, 'Roundtrip Ward Encrypted');

      savPath = await exportAndCapture(page);
    } finally {
      await context.close();
    }

    const reopenContext = await browser.newContext();
    try {
      const reopenPage = await reopenContext.newPage();
      await gotoApp(reopenPage);
      await reopenPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      await reopenPage.setInputFiles('#startup-open-input', savPath);

      // promptPasswordForFile() puts the unlock overlay in
      // 'openFile' mode -- same #unlock-overlay, no confirm row.
      await reopenPage.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
      await expect(reopenPage.locator('#unlock-password-confirm')).toBeHidden();

      await reopenPage.fill('#unlock-password', 'not-the-right-password');
      await reopenPage.click('#unlock-submit-btn');
      await expect(reopenPage.locator('#unlock-overlay')).toHaveClass(/show/);
      await expect(reopenPage.locator('#unlock-error')).toBeVisible();
      await expect(reopenPage.locator('#startup-choice-overlay')).not.toHaveClass(/show/);

      await reopenPage.fill('#unlock-password', password);
      await reopenPage.click('#unlock-submit-btn');
      await expect(reopenPage.locator('#unlock-overlay')).not.toHaveClass(/show/);
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('Roundtrip Ward Encrypted');
    } finally {
      await reopenContext.close();
    }
  });

  test('a corrupted .sav file is rejected with an error, not a crash', async ({ browser }) => {
    const context = await browser.newContext();
    let goodPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Corruption Source Ward');
      goodPath = await exportAndCapture(page);
    } finally {
      await context.close();
    }

    const fs = await import('node:fs/promises');
    const bytes = await fs.readFile(goodPath);
    const corruptPath = goodPath.replace(/\.sav$/, '-corrupt.sav');
    await fs.writeFile(corruptPath, bytes.subarray(0, Math.floor(bytes.length / 3)));

    const corruptContext = await browser.newContext();
    try {
      const corruptPage = await corruptContext.newPage();
      const errors: string[] = [];
      corruptPage.on('pageerror', (e) => errors.push(e.message));

      await gotoApp(corruptPage);
      await corruptPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      const dialogPromise = corruptPage.waitForEvent('dialog');
      await corruptPage.setInputFiles('#startup-open-input', corruptPath);
      await (await dialogPromise).accept();

      // Rejected, not crashed: still on the startup screen, no uncaught errors.
      await expect(corruptPage.locator('#startup-choice-overlay')).toHaveClass(/show/);
      expect(errors).toEqual([]);
    } finally {
      await corruptContext.close();
    }
  });
});
