import { expect, test } from '@playwright/test';
import { chooseNoPassword, createWard, gotoApp, startNewCase } from './support/target';

const warningText = 'Probate Guardian is already open in another tab. Save or close that tab before continuing here.';
const target = process.env.PG_TARGET || 'source';

test('detects a clean second tab and lets the notice be dismissed', async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  await gotoApp(first);

  const second = await context.newPage();
  await gotoApp(second);

  const notice = second.locator('#tab-safety-notice');
  await second.waitForTimeout(1000);
  await expect(notice).not.toContainText(warningText);
  if (await notice.isVisible()) {
    await notice.getByRole('button', { name: 'Dismiss' }).evaluate(button => (button as HTMLButtonElement).click());
    await expect(notice).toBeHidden();
  }
  await context.close();
});

test('warns when another tab has an active case', async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  await gotoApp(first);
  await startNewCase(first);
  await chooseNoPassword(first);
  await createWard(first, 'Second Tab Test Ward');

  const second = await context.newPage();
  await gotoApp(second);

  await expect(second.locator('#tab-safety-notice')).toContainText(warningText);
  await expect(second.locator('#tab-safety-notice')).toContainText('Second Tab Test Ward');
  await context.close();
});

test('warns when another tab reports unsaved changes', async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  await gotoApp(first);
  await startNewCase(first);
  await chooseNoPassword(first);
  await createWard(first, 'Dirty Tab Test Ward');
  await first.evaluate(() => (window as any).markDirtySinceExport());

  const second = await context.newPage();
  await gotoApp(second);

  await expect(second.locator('#tab-safety-notice')).toContainText(warningText);
  await expect(second.locator('#tab-safety-notice')).toContainText('Dirty Tab Test Ward');
  await context.close();
});

async function installServiceWorkerMock(page: any) {
  await page.addInitScript(() => {
    (window as any).__swMessages = [];
    const originalQuerySelector = Document.prototype.querySelector;
    Document.prototype.querySelector = function patchedQuerySelector(selector: string) {
      if (selector === 'meta[name="pg-build"][content="web"]') {
        return { getAttribute: () => 'web' } as any;
      }
      return originalQuerySelector.call(this, selector);
    };

    class FakeWorker extends EventTarget {
      state = 'installed';
      postMessage(message: unknown) {
        (window as any).__swMessages.push(message);
        setTimeout(() => {
          (navigator as any).serviceWorker.dispatchEvent(new Event('controllerchange'));
        }, 25);
      }
    }

    const registration = new EventTarget() as any;
    registration.waiting = new FakeWorker();
    registration.active = {};
    registration.installing = null;

    const serviceWorker = new EventTarget() as any;
    serviceWorker.controller = {};
    serviceWorker.ready = Promise.resolve(registration);
    serviceWorker.register = async () => registration;
    serviceWorker.getRegistration = async () => registration;

    Object.defineProperty(Navigator.prototype, 'serviceWorker', {
      configurable: true,
      get: () => serviceWorker,
    });
  });
}

test('shows a waiting-update banner and sends ACTIVATE_UPDATE on reload', async ({ page }) => {
  test.skip(target === 'portable', 'Service-worker update UX is disabled for file:// portable builds');
  await installServiceWorkerMock(page);
  await gotoApp(page);

  await expect(page.locator('#pwa-status-notice')).toContainText('A new version of Probate Guardian is available. Save or export your work, then reload.');
  await page.getByRole('button', { name: 'Reload now' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__swMessages)).toContainEqual({ type: 'ACTIVATE_UPDATE' });
});

test('confirms before activating an update with unsaved work', async ({ page }) => {
  test.skip(target === 'portable', 'Service-worker update UX is disabled for file:// portable builds');
  await installServiceWorkerMock(page);
  await gotoApp(page);
  await page.evaluate(() => {
    (window as any).pgHasUnsavedChanges = () => true;
  });

  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('Save or export your work before reloading.');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Reload now' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__swMessages.length)).toBe(0);
});
