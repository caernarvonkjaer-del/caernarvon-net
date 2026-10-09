import { test, expect, type Page } from '@playwright/test';
import { acceptDynDialog, createWard, dismissScheduleDocPrompt, freshStartNoPassword, confirmRemoveIfAsked } from './support/target';

// Milestone 73K part 2: the page stays where the filer was. A change made on
// the page -- a signature choice, Add, Remove, the vehicle box -- used to
// throw the filer back to the top of the page, and the cursor fell to the top
// of the document. Now the scroll position is kept and the cursor goes back to
// the field or row the filer was working on; a new entry is brought into view
// (decision 73K-N1). Arriving at a page still starts at the top. A background
// redraw waits until the filer leaves the box being typed in.
// Red-first: every case fails with the source set aside.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const patch = (page: Page, shape: Record<string, unknown>) => page.evaluate((s) => (window as any).GuardianForms.testing.patchFiling(s), shape);
const field = (page: Page, path: string) => page.evaluate((p) => (window as any).GuardianForms.testing.field(p), path);
const main = (page: Page) => page.locator('#main-content');
const scrollTop = (page: Page) => main(page).evaluate((el) => el.scrollTop);
/** Scrolls #main-content so `selector` sits about a third of the way down. */
const scrollToShow = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => {
  const box = document.getElementById('main-content')!;
  box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientHeight / 3;
});
/** The path of the box holding the cursor, or what holds it when no box does. */
const cursor = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null;
  if (!a || a === document.body) return 'the top of the document';
  if (a.id === 'main-content') return 'the page';
  const path = ['data-form-path', 'data-annual-path', 'data-bind', 'data-field-path', 'data-focus-path'].map((n) => a.getAttribute(n)).find(Boolean);
  return path ? `${path}${(a as HTMLInputElement).type === 'radio' ? `=${(a as HTMLInputElement).value}` : ''}` : a.outerHTML.slice(0, 80);
});

const schARows = (n: number) => Array.from({ length: n }, (_, i) => ({ payer: `Payer ${i + 1}`, description: `Income ${i + 1}`, bank: '', accountNo: '', amount: 100 + i }));

/** An Annual with Schedule A's rows, its documents reminder answered "I understand" on arrival. */
async function annualScheduleA(page: Page, rows: number) {
  await createWard(page, 'Keep Place Annual', 'annual');
  await patch(page, { schA: schARows(rows) });
  await go(page, '/scha');
  await acceptDynDialog(page);
}

test.describe('Milestone 73K part 2: the page stays where the filer was', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await freshStartNoPassword(page);
  });

  test("an accounting: a co-guardian's signature choice keeps the page where it was, and the cursor on the choice", async ({ page }) => {
    await createWard(page, 'Keep Place Signature', 'annual');
    await go(page, '/p3');
    await page.click('[data-annual-action="add-row"][data-collection="guardians"]');
    const stamp = page.locator('input[data-annual-path="guardians.1.signatureState"][value="stamp"], input[data-form-path="guardians.1.signatureState"][value="stamp"]').first();
    await scrollToShow(page, '[data-signature-state-group="guardians.1"]');
    const before = await scrollTop(page);
    expect(before, 'the page is scrolled to the second card').toBeGreaterThan(100);
    await stamp.check();
    await expect(page.locator('[data-signature-pad-mount="guardians.1"]')).not.toBeEmpty();
    expect(await scrollTop(page), 'not thrown back to the top').toBe(before);
    expect(await cursor(page)).toBe('guardians.1.signatureState=stamp');
  });

  test('a Plan: "+ Add" brings each new residence into view and puts the cursor in its first box', async ({ page }) => {
    await createWard(page, 'Keep Place Plan', 'planAnnual');
    await go(page, '/p2');
    const add = page.locator('#main-content [data-form-action="add-plan-row"][data-collection="q1Residences"]');
    for (let n = 0; n < 5; n++) {
      await add.click();
      await expect.poll(() => cursor(page), `residence ${n + 1}`).toMatch(new RegExp(`^q1Residences\\.${n}\\.`));
      await expect(page.locator(':focus'), `residence ${n + 1} is on screen`).toBeInViewport();
    }
    expect(await scrollTop(page), 'the page followed the new entries down').toBeGreaterThan(0);
  });

  test('Remove when the page shortens: not thrown to the top, and the cursor on the row above', async ({ page }) => {
    await annualScheduleA(page, 10);
    const remove = '[data-annual-action="remove-row"][data-collection="schA"][data-index="9"]';
    await scrollToShow(page, remove);
    const before = await scrollTop(page);
    const heightBefore = await main(page).evaluate((el) => el.scrollHeight);
    expect(before).toBeGreaterThan(200);
    await page.click(remove);
    await confirmRemoveIfAsked(page); // 73P: Remove asks first
    await expect.poll(() => field(page, 'schA.length')).toBe(9);
    expect(await main(page).evaluate((el) => el.scrollHeight), 'the page is shorter by the row removed').toBeLessThan(heightBefore);
    expect(await scrollTop(page), 'the page stays where it was').toBe(before);
    expect(await cursor(page)).toMatch(/^schA\.8\./);
    await expect(page.locator(':focus')).toBeInViewport();
  });

  test('after a confirmation: the cursor goes to the card that is left, not the top of the document', async ({ page }) => {
    await createWard(page, 'Keep Place Confirm', 'annual');
    await go(page, '/p3');
    const addGuardian = page.locator('[data-annual-action="add-row"][data-collection="guardians"]');
    await addGuardian.click();
    await page.locator('input[data-annual-path="guardians.1.name"]').fill('Second Guardian');
    await addGuardian.click();
    await page.locator('input[data-annual-path="guardians.2.name"]').fill('Third Guardian');
    await page.locator('input[data-annual-path="guardians.2.name"]').blur();
    const remove = page.locator('[data-annual-action="remove-row"][data-collection="guardians"][data-index="2"]');
    await remove.scrollIntoViewIfNeeded();
    const before = await scrollTop(page);
    await remove.click();
    await acceptDynDialog(page);
    await expect.poll(() => field(page, 'guardians.length')).toBe(2);
    await expect.poll(() => cursor(page)).toBe('guardians.1.name');
    expect(await scrollTop(page)).toBeGreaterThan(Math.min(before, 100) - 1);
  });

  test("the Inventory's vehicle box keeps the page where it was, and the cursor on the box", async ({ page }) => {
    await createWard(page, 'Keep Place Inventory', 'guardian');
    const entry = (n: number) => ({ description: `Asset ${n}`, streetAddress: '', cityStateZip: '', valuationMethod: '', fullAssetValue: 1000 * n, wardPercent: '', inSafeDepositBox: '', isVehicle: false, vehicleYear: '', vehicleMake: '', vehicleModel: '', vehicleVin: '', odometerMileage: '' });
    await patch(page, { scheduleB2: [1, 2, 3, 4, 5].map(entry) });
    await go(page, '/b2');
    await dismissScheduleDocPrompt(page);
    const vehicle = page.locator('[data-inventory-change="toggle-vehicle"][data-index="3"]');
    await scrollToShow(page, '[data-inventory-change="toggle-vehicle"][data-index="3"]');
    const before = await scrollTop(page);
    expect(before).toBeGreaterThan(100);
    await vehicle.check();
    await expect(page.locator('#b2-vehicle-year-3')).toBeVisible();
    expect(await scrollTop(page), 'not thrown back to the top').toBe(before);
    expect(await cursor(page)).toBe('scheduleB2.3.isVehicle');
  });

  test('arriving at another page still starts at its top', async ({ page }) => {
    await annualScheduleA(page, 10);
    await main(page).evaluate((el) => { el.scrollTop = el.scrollHeight; });
    expect(await scrollTop(page)).toBeGreaterThan(0);
    await page.click('.nav-link-item[data-page="/schb1"]');
    await expect(page.locator('#main-content [data-collection="schB1"]').first()).toBeVisible();
    expect(await scrollTop(page)).toBe(0);
  });

  test('a background redraw waits while the filer types, then keeps the cursor where the filer went', async ({ page }) => {
    await annualScheduleA(page, 3);
    const payer = page.locator('input[data-annual-path="schA.0.payer"]');
    await payer.click();
    await payer.pressSequentially(' Corp');
    await page.evaluate(() => { (document.activeElement as any).__typedIn = true; });
    await page.evaluate(async () => {
      const router = await import('/probate-guardian/src/core/navigation/router.js');
      await router.renderPage(router.getCurrentPage(), { reason: 'background' });
    });
    expect(await page.evaluate(() => (document.activeElement as any).__typedIn === true), 'the box being typed in is not redrawn under the filer').toBe(true);
    await expect(payer).toHaveValue('Payer 1 Corp');

    await page.evaluate(() => {
      (window as any).__wentTo = '';
      document.addEventListener('focusin', (e) => {
        const t = e.target as HTMLElement;
        if (!(window as any).__wentTo) (window as any).__wentTo = t.getAttribute('data-annual-path') || '';
      }, { once: true });
    });
    await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => !!document.querySelector('input[data-annual-path="schA.0.payer"]') && !(document.querySelector('input[data-annual-path="schA.0.payer"]') as any).__typedIn), 'redrawn once the cursor left').toBe(true);
    expect(await field(page, 'schA.0.payer')).toBe('Payer 1 Corp');
    const wentTo = await page.evaluate(() => (window as any).__wentTo);
    expect(wentTo).toMatch(/^schA\.0\./);
    expect(await cursor(page)).toBe(wentTo);
  });

  test('a background redraw waiting on the filer does not swallow the click that ends the typing', async ({ page }) => {
    await annualScheduleA(page, 3);
    const payer = page.locator('input[data-annual-path="schA.0.payer"]');
    await payer.click();
    await payer.pressSequentially(' Ltd');
    await page.evaluate(async () => {
      const router = await import('/probate-guardian/src/core/navigation/router.js');
      await router.renderPage(router.getCurrentPage(), { reason: 'background' });
    });
    await page.click('[data-annual-action="add-row"][data-collection="schA"]');
    await expect.poll(() => field(page, 'schA.length'), '"+ Add" still added the row').toBe(4);
    expect(await field(page, 'schA.0.payer')).toBe('Payer 1 Ltd');
    await expect.poll(() => cursor(page)).toMatch(/^schA\.3\./);
  });
});
