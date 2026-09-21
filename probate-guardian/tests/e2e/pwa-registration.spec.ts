import { expect, test } from '@playwright/test';
import { gotoApp } from './support/target';
import { currentTarget } from './support/target-profile';

const target = currentTarget;

test('service worker registration is limited to the hosted web build', { tag: '@origin-state' }, async ({ page }) => {
  await gotoApp(page);

  if (target === 'web') {
    // page.waitForFunction does not await an async predicate (the Promise is
    // truthy, so it resolved at once); serviceWorker.ready does the waiting.
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
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
