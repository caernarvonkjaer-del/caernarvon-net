import { expect, test } from '@playwright/test';
import { gotoApp } from './support/target';

const target = process.env.PG_TARGET || 'source';

test('service worker registration is limited to the hosted web build', async ({ page }) => {
  await gotoApp(page);

  if (target === 'web') {
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker?.getRegistration())?.active));
    const hasActiveWorker = await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active));
    expect(hasActiveWorker).toBe(true);
    return;
  }

  const hasRegistration = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    try {
      return Boolean(await navigator.serviceWorker.getRegistration());
    } catch (error) {
      if (location.protocol === 'file:' && error instanceof DOMException && error.name === 'SecurityError') {
        return false;
      }
      throw error;
    }
  });
  expect(hasRegistration).toBe(false);
});
