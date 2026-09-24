import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard, dismissScheduleDocPrompt } from './support/target';

// A card the filer added with +Add and never touched is meant to disappear
// when they leave the page (src/core/form/prune-cards.js), so it does not
// linger as a false "unfinished" mark or block export. Since 2026-09-13 that
// clean-up never ran: Milestone 42E deleted legacy-app.js's pruneBlankCards()
// as a twin of the module's, but nothing imported the module, so the deleted
// copy was the only live one. The router's and filing lifecycle's calls
// check that the function exists and were silently skipped. Found by
// Milestone 70's dependency audit. The worst of it: on the Guardian
// Inventory an untouched +Add row blocked export with four "row 1" errors,
// because a Guardian blank row is not empty (share 100, value 0).

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).navigate(r), route);
const count = (page: Page, key: string) => page.evaluate((k) => ((window as any).D[k] || []).length, key);

async function clearOverlays(page: Page) {
  await dismissScheduleDocPrompt(page);
  const reminder = page.locator('[data-shell-action="hide-auto-export-reminder"]');
  if (await reminder.isVisible().catch(() => false)) await reminder.click();
}

test.describe('blank-card clean-up when leaving a page', () => {
  test('the clean-up is loaded at startup', async ({ page }) => {
    await freshStartNoPassword(page);
    expect(await page.evaluate(() => typeof (window as any).pruneBlankCards)).toBe('function');
  });

  test('Guardian Inventory: an untouched +Add schedule row is removed and no longer blocks export', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Pruning Guardian', 'guardian');
    await go(page, '/a1');
    await clearOverlays(page);
    await page.locator('#main-content [data-inventory-action="add-entry"]').first().click();
    expect(await count(page, 'scheduleA1'), 'the row was added').toBe(1);
    await go(page, '/a2');
    await go(page, '/a1');
    expect(await count(page, 'scheduleA1'), 'the untouched row is gone after leaving the page').toBe(0);
    const a1Issues = await page.evaluate(() => ((window as any).validateGuardian() || []).map((i: any) => String(i?.message ?? i)).filter((m: string) => /^A-1 row/.test(m)));
    expect(a1Issues, 'no export error for a row the filer never touched').toEqual([]);
  });

  test('a row the filer typed into is kept (clean-up never deletes entered data)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Pruning Guardian Kept', 'guardian');
    await go(page, '/a1');
    await clearOverlays(page);
    await page.locator('#main-content [data-inventory-action="add-entry"]').first().click();
    const description = page.locator('#main-content [data-bind="scheduleA1.0.propertyDescription"]');
    await description.fill('Family home');
    await description.blur();
    await go(page, '/a2');
    await go(page, '/a1');
    expect(await count(page, 'scheduleA1')).toBe(1);
    expect(await page.evaluate(() => (window as any).D.scheduleA1[0].propertyDescription)).toBe('Family Home');
  });

  test('Annual Accounting: an untouched Schedule A row and co-guardian card are removed, and Schedule A is not marked unfinished', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Pruning Annual', 'annual');
    await fillMinimalValidAnnualWard(page);
    const rowsBefore = await count(page, 'schA');
    const guardiansBefore = await count(page, 'guardians');
    await go(page, '/scha');
    await clearOverlays(page);
    await page.locator('[data-annual-action="add-row"][data-collection="schA"]').first().click();
    expect(await count(page, 'schA'), 'the row was added').toBe(rowsBefore + 1);
    await go(page, '/p3');
    expect(await count(page, 'schA'), 'the untouched Schedule A row is gone once the filer leaves Schedule A').toBe(rowsBefore);
    await clearOverlays(page);
    await page.locator('[data-annual-action="add-row"][data-collection="guardians"]').first().click();
    expect(await count(page, 'guardians'), 'the card was added').toBe(guardiansBefore + 1);
    await go(page, '/p1');
    expect(await count(page, 'guardians'), 'the untouched co-guardian card is gone').toBe(guardiansBefore);
    expect(await page.evaluate(() => (window as any).computeNavChecks().checks['a-scha']), 'Schedule A is not falsely unfinished').toBe(true);
  });

  test('Annual Plan: an untouched second certificate-of-service recipient is removed; the first card always stays', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Pruning Plan', 'planAnnual');
    await go(page, '/p12');
    await clearOverlays(page);
    await page.locator('#main-content [data-form-action="add-plan-row"][data-collection="certRecipients"]').click();
    expect(await count(page, 'certRecipients')).toBe(2);
    await go(page, '/p11');
    expect(await count(page, 'certRecipients'), 'pruned to the one card the page always keeps').toBe(1);
  });
});
