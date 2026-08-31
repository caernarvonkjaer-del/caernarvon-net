import { expect, test } from '@playwright/test';
import { chooseNoPassword, createWard, gotoApp, startNewCase } from './support/target';

const target = process.env.PG_TARGET || 'source';

test.describe('Ward-level Tab Locks', () => {
  // Web Locks API is not available on file:// protocol in chromium, 
  // so this test applies primarily to dev/dist over http.
  test.skip(target === 'file', 'Web Locks API is disabled or behaves differently on file:// protocol');

  test('same-tab lifecycle: releases previous lock and acquires new one on switch', async ({ page }) => {
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
    
    // 2. Switch to Ward A from Ward B using the Ward Picker in the sidebar
    // Ward B is active. We use the sidebar dropdown to switch to Ward A.
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
  });

  test('two-tab test: blocks second tab from acquiring the same ward lock', async ({ browser }) => {
    const context = await browser.newContext();
    const tab1 = await context.newPage();
    await gotoApp(tab1);

    await startNewCase(tab1);
    await chooseNoPassword(tab1);
    
    // Tab 1 creates and opens Ward A
    await createWard(tab1, 'Ward A');
    await tab1.waitForFunction(() => window.location.hash === '' || window.location.hash === '#/');
    const wardAId = await tab1.evaluate(() => (window as any).guardianData.activeWardId);
    await tab1.evaluate(async () => {
      if ((window as any).flushPendingSave) {
        await (window as any).flushPendingSave();
      }
    });
    
    // Tab 2 opens the app (same case because they share localStorage/IndexedDB in the same browser context)
    const tab2 = await context.newPage();
    tab2.on('dialog', (d) => d.accept());
    await gotoApp(tab2);
    
    // Tab 2 lands on dashboard
    await expect(tab2).toHaveURL(/#\/dashboard$/);
    
    // Tab 2 attempts to switch to Ward A while Tab 1 holds the lock
    await tab2.evaluate((id) => (window as any).switchWard(id), wardAId);
    
    // Hard block: modal appears in Tab 2
    await expect(tab2.locator('#ward-locked-overlay')).toBeVisible();
    await tab2.locator('#ward-locked-overlay #close-ward-locked').click();
    await expect(tab2.locator('#ward-locked-overlay')).toBeHidden();
    
    // Tab 1 navigates to dashboard (releases lock)
    await tab1.evaluate(() => window.location.hash = '#/dashboard');
    await expect(tab1).toHaveURL(/#\/dashboard$/);
    
    // Tab 2 can now open Ward A
    await tab2.evaluate((id) => (window as any).switchWard(id), wardAId);
    await tab2.waitForFunction(() => window.location.hash === '' || window.location.hash === '#/');
    await expect(tab2.locator('#ward-locked-overlay')).toBeHidden();
    
    // Confirm Tab 2 now holds the lock for Ward A
    const tab2HeldLocks = await tab2.evaluate(async () => (await navigator.locks.query()).held?.map(l => l.name) || []);
    expect(tab2HeldLocks).toContain(`pg-ward-${wardAId}`);
  });
});
