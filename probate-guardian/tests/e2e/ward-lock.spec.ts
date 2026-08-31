import { expect, test } from '@playwright/test';
import { chooseNoPassword, createWard, gotoApp, startNewCase } from './support/target';

const target = process.env.PG_TARGET || 'source';

test.describe('Ward-level Tab Locks', () => {
  // Web Locks API is not available on file:// protocol in chromium, 
  // so this test applies primarily to dev/dist over http.
  test.skip(target === 'file', 'Web Locks API is disabled or behaves differently on file:// protocol');

  test('same-tab lifecycle: releases previous lock and acquires new one on switch', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);

      // 1. Open Ward A
      await createWard(page, 'Ward A');
      await page.waitForFunction(() => window.location.hash === '' || window.location.hash === '#/');

      // Check lock for Ward A is held
      const wardAId = await page.evaluate(() => (window as any).guardianData.activeWardId);
      let heldLocks = await page.evaluate(async () => (await navigator.locks.query()).held?.map(l => l.name) || []);
      expect(heldLocks).toContain(`pg-ward-${wardAId}`);

      // Go to dashboard and create Ward B
      await page.evaluate(() => window.location.hash = '#/dashboard');
      await expect(page).toHaveURL(/#\/dashboard$/);
      await createWard(page, 'Ward B');
      await page.waitForFunction(() => window.location.hash === '' || window.location.hash === '#/');

      const wardBId = await page.evaluate(() => (window as any).guardianData.activeWardId);

      // 2. Switch to Ward A from Ward B
      await page.evaluate((id) => (window as any).switchWard(id), wardAId);
      await page.waitForFunction((id) => (window as any).guardianData.activeWardId === id, wardAId);

      // Check Ward A lock is held and Ward B lock is released
      heldLocks = await page.evaluate(async () => (await navigator.locks.query()).held?.map(l => l.name) || []);
      expect(heldLocks).toContain(`pg-ward-${wardAId}`);
      expect(heldLocks).not.toContain(`pg-ward-${wardBId}`);

      // 3. Switch back to Ward B
      await page.evaluate((id) => (window as any).switchWard(id), wardBId);
      await page.waitForFunction((id) => (window as any).guardianData.activeWardId === id, wardBId);

      // Check Ward B lock is held and Ward A lock is released
      heldLocks = await page.evaluate(async () => (await navigator.locks.query()).held?.map(l => l.name) || []);
      expect(heldLocks).toContain(`pg-ward-${wardBId}`);
      expect(heldLocks).not.toContain(`pg-ward-${wardAId}`);
    } finally {
      await context.close();
    }
  });

  test('different wards: tab 1 holds Ward A and tab 2 holds Ward B concurrently', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const tab1 = await context.newPage();
      await gotoApp(tab1);
      await startNewCase(tab1);
      await chooseNoPassword(tab1);
      await createWard(tab1, 'Ward A');
      await tab1.waitForFunction(() => window.location.hash === '' || window.location.hash === '#/');
      const wardAId = await tab1.evaluate(() => (window as any).guardianData.activeWardId);

      // Tab 2 opens
      const tab2 = await context.newPage();
      await gotoApp(tab2);
      await startNewCase(tab2);
      await chooseNoPassword(tab2);
      await createWard(tab2, 'Ward B');
      await tab2.waitForFunction(() => window.location.hash === '' || window.location.hash === '#/');
      const wardBId = await tab2.evaluate(() => (window as any).guardianData.activeWardId);

      // Both tabs hold their respective locks
      const tab1Locks = await tab1.evaluate(async () => (await navigator.locks.query()).held?.map(l => l.name) || []);
      expect(tab1Locks).toContain(`pg-ward-${wardAId}`);
      expect(tab1Locks).toContain(`pg-ward-${wardBId}`);

      expect(await tab1.evaluate(() => (window as any).guardianData.activeWardId)).toBe(wardAId);
      expect(await tab2.evaluate(() => (window as any).guardianData.activeWardId)).toBe(wardBId);
    } finally {
      await context.close();
    }
  });

  test('dashboard does NOT release lock; close ward action releases lock', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const tab1 = await context.newPage();
      await gotoApp(tab1);
      await startNewCase(tab1);
      await chooseNoPassword(tab1);
      await createWard(tab1, 'Ward A');
      await tab1.waitForFunction(() => window.location.hash === '' || window.location.hash === '#/');
      const wardAId = await tab1.evaluate(() => (window as any).guardianData.activeWardId);

      // Tab 1 navigates to dashboard (lock is retained)
      await tab1.evaluate(() => window.location.hash = '#/dashboard');
      await expect(tab1).toHaveURL(/#\/dashboard$/);

      // Tab 2 opens
      const tab2 = await context.newPage();
      await gotoApp(tab2);
      await startNewCase(tab2);
      await chooseNoPassword(tab2);

      // Tab 2 attempts to acquire Ward A while Tab 1 is on dashboard -> MUST FAIL (lock held)
      const tab2Acquired = await tab2.evaluate((id) => (window as any).acquireWardLock(id), wardAId);
      expect(tab2Acquired).toBe(false);

      // Tab 1 closes the ward explicitly using Close action
      await tab1.evaluate(() => (window as any).unloadWard());
      await tab1.waitForFunction(() => (window as any).guardianData.activeWardId === null);

      // Tab 2 can now acquire Ward A successfully
      const tab2AcquiredAfter = await tab2.evaluate((id) => (window as any).acquireWardLock(id), wardAId);
      expect(tab2AcquiredAfter).toBe(true);

      // Release Tab 2 lock
      await tab2.evaluate(() => (window as any).releaseWardLock());
    } finally {
      await context.close();
    }
  });

  test('deleteWard releases lock and navigates to dashboard with no ward loaded', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const tab1 = await context.newPage();
      await gotoApp(tab1);
      await startNewCase(tab1);
      await chooseNoPassword(tab1);
      await createWard(tab1, 'Ward A');
      await tab1.waitForFunction(() => window.location.hash === '' || window.location.hash === '#/');
      const wardAId = await tab1.evaluate(() => (window as any).guardianData.activeWardId);

      // Tab 1 deletes Ward A
      await tab1.evaluate((id) => (window as any).deleteWard(id), wardAId);
      expect(await tab1.evaluate(() => (window as any).guardianData.activeWardId)).toBe(null);

      // Check lock is released
      const heldLocks = await tab1.evaluate(async () => (await navigator.locks.query()).held?.map(l => l.name) || []);
      expect(heldLocks).not.toContain(`pg-ward-${wardAId}`);
    } finally {
      await context.close();
    }
  });

  test('rollback path: when switching to a locked ward, active ward is restored and stays locked', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const tab1 = await context.newPage();
      await gotoApp(tab1);
      await startNewCase(tab1);
      await chooseNoPassword(tab1);
      await createWard(tab1, 'Ward A');
      await tab1.waitForFunction(() => window.location.hash === '' || window.location.hash === '#/');
      const wardAId = await tab1.evaluate(() => (window as any).guardianData.activeWardId);

      // Tab 2 opens and creates Ward B
      const tab2 = await context.newPage();
      await gotoApp(tab2);
      await startNewCase(tab2);
      await chooseNoPassword(tab2);
      await createWard(tab2, 'Ward B');
      await tab2.waitForFunction(() => window.location.hash === '' || window.location.hash === '#/');
      const wardBId = await tab2.evaluate(() => (window as any).guardianData.activeWardId);

      // Tab 1 adds Ward B to its known wards list and attempts to switch to it
      await tab1.evaluate((bId) => {
        (window as any).guardianData.wards.push({
          wardId: bId,
          inventoryType: 'guardian',
          wardName: 'Ward B'
        });
      }, wardBId);

      const switchRes = await tab1.evaluate((id) => (window as any).switchWard(id), wardBId);
      expect(switchRes).toBe(false);

      // Blocked modal appears on Tab 1
      await expect(tab1.locator('#ward-locked-overlay')).toBeVisible();
      await tab1.keyboard.press('Escape');
      await expect(tab1.locator('#ward-locked-overlay')).toBeHidden();

      // Tab 1 stays on Ward A and still holds Ward A lock
      expect(await tab1.evaluate(() => (window as any).guardianData.activeWardId)).toBe(wardAId);
      const tab1Locks = await tab1.evaluate(async () => (await navigator.locks.query()).held?.map(l => l.name) || []);
      expect(tab1Locks).toContain(`pg-ward-${wardAId}`);
    } finally {
      await context.close();
    }
  });

  test('accessibility: modal has role dialog, aria attributes, and is dismissible with Escape', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Ward A');

      // Trigger modal manually
      await page.evaluate(() => (window as any).showWardLockedModal());
      const modal = page.locator('#ward-locked-overlay');
      await expect(modal).toBeVisible();
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-modal', 'true');
      await expect(modal).toHaveAttribute('aria-labelledby', 'ward-locked-title');

      // Press Escape to dismiss
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
    } finally {
      await context.close();
    }
  });
});
