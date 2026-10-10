import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, dismissScheduleDocPrompt } from './support/target';

// Milestone 73O part 4: the same job worded the same way on every form, and
// in the court's own words -- the Inventory's footer everywhere (decision
// 73O-4), the workbook's names for the Simplified's Line 8 and the Annual's
// D-2/D-4 ward's share, the registry's name for the Simplified, "filing type",
// no "($)" beside a box that shows "$", the documents headings at their size,
// and one heading on each page's list of what it still needs (the requester,
// 2026-10-09).

const FORMS = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor'];
const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const WVO = "Ward's Value of Ownership";

test.describe('73O part 4: one wording', () => {
  test('every form\'s footer is the Inventory\'s: "← Previous: <page>", "Page n of N", "Next: <page> →"', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    for (const [i, type] of FORMS.entries()) {
      await page.evaluate(([t, n]) => (window as any).GuardianForms.testing.createFiling.add(n, t), [type, `Footer Ward ${i + 1}`]);
      // The third page in each form's list: a Previous and a Next.
      const routes = await page.locator('[data-page]').evaluateAll((els) => [...new Set(els.map((e: any) => e.dataset.page))]);
      await navigate(page, routes[2]);
      const footer = page.locator('#main-content .page-nav');
      await expect(footer.getByRole('button', { name: /^← Previous: .+/ }), type).toHaveCount(1);
      await expect(footer.locator('small'), type).toHaveText(/^Page 3 of \d+$/);
      await expect(footer.getByRole('button', { name: /^Next: .+ →$/ }), type).toHaveCount(1);
    }
  });

  test('the Annual Plan\'s footer names its neighbours from the sidebar\'s list', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Footer Plan Ward', 'planAnnual');
    await navigate(page, '/p3');
    const footer = page.locator('#main-content .page-nav');
    await expect(footer.getByRole('button', { name: '← Previous: 1. Residences' })).toBeVisible();
    await expect(footer.locator('small')).toHaveText('Page 4 of 14');
    await expect(footer.getByRole('button', { name: 'Next: 3G. Insurance & Benefits →' })).toBeVisible();
    await navigate(page, '/p12');
    await expect(footer.getByRole('button', { name: 'Next: Print Preview →' })).toBeVisible();
  });

  test("the Annual's D-2 and D-4 call the ward's share the workbook's \"Ward's Value of Ownership\", on their pages and Parts VI & VII's summary", async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Ownership Ward', 'annual');
    for (const route of ['/schd2', '/schd4']) {
      await navigate(page, route);
      await page.locator('[data-annual-action="add-row"], [data-form-action="add-annual-row"]').first().click();
      await dismissScheduleDocPrompt(page);
      await expect(page.locator('#main-content label', { hasText: WVO }).first(), route).toBeVisible();
      await expect(page.locator('#main-content').getByText(`Total ${WVO}`), route).toBeVisible();
      await expect(page.locator('#main-content').getByText('Total Value', { exact: true }), route).toHaveCount(0);
    }
    await navigate(page, '/p67');
    await expect(page.getByText(`Schedule D-2 — Real Estate (${WVO})`)).toBeVisible();
    await expect(page.getByText(`Schedule D-4 — Intangibles (${WVO})`)).toBeVisible();
  });

  test("the Simplified is the Simplified Annual Accounting, and its card's figure is the workbook's Remaining Assets On Hand", async ({ page }) => {
    await freshStartNoPassword(page);
    await navigate(page, '/inventory-select');
    await expect(page.locator('.inventory-card h2', { hasText: 'Simplified Annual Accounting' })).toBeVisible();
    await createSimplifiedWard(page, 'Card Label Ward');
    await expect(page.locator('.ward-info-total-label')).toHaveText('Remaining Assets On Hand');
  });

  test('the Inventory\'s amount labels carry no "($)" where the box already shows "$"', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Dollar Label Ward', 'guardian');
    await navigate(page, '/a1');
    await page.locator('[data-inventory-action="add-entry"][data-schedule="a1"]').click();
    await dismissScheduleDocPrompt(page);
    const label = page.locator('#main-content label', { hasText: 'Full Asset Value as of GID' });
    await expect(label).toBeVisible();
    await expect(label).not.toContainText('($)');
    await expect(page.locator('#main-content .input-group-text', { hasText: '$' }).first()).toBeVisible();
  });

  test('the documents headings are their section\'s small capitals, and each page\'s list of what it needs says "This page still needs:"', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Heading Ward', 'planInitial');
    await navigate(page, '/p2');
    const heading = page.locator('.schedule-docs-section h2').first();
    expect(await heading.evaluate((el) => getComputedStyle(el).fontSize)).toBe('12px');
    expect(await heading.evaluate((el) => getComputedStyle(el).textTransform)).toBe('uppercase');
    await expect(page.locator('#page-local-guidance')).toContainText('This page still needs:');
  });

  test('a Trust Accounting\'s import says it reads the Annual workbook, Filing Type: Trust; New Filing from Existing says "filing type"', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Trust Import Ward', 'trustAccounting');
    await navigate(page, '/print');
    await expect(page.getByText('Select the previously exported Trust Accounting Excel file: the Annual workbook, Filing Type: Trust')).toBeAttached();
    await page.evaluate(() => (window as any).GuardianForms.testing.convertFiling.openDialog());
    await expect(page.locator('#convertWardModal.show')).toContainText('of a different filing type');
  });
});

// Milestone 75D (decision 75D-1): the Simplified's Part II heads its lines as
// the Clerk's workbook does (PARTS I, II -- Line 1 under Part II's heading,
// "Income", "Less Disbursements", and "Assets On Hand" over Line 8, B30). It
// had "Assets On Hand" over Line 1.
test("the Simplified's Part II has the workbook's headings, each over its own lines", async ({ page }) => {
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Part II Headings');
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ startingBalance: 100 }));
  await navigate(page, '/p2');
  await dismissScheduleDocPrompt(page);
  const cards = await page.locator('#main-content .entry-card').evaluateAll((els) => els.map((card) => ({
    heading: card.querySelector('.entry-card-header')?.textContent?.trim(),
    lines: [...card.querySelectorAll('.line-tag')].map((tag) => tag.textContent?.trim()),
  })));
  expect(cards).toEqual([
    { heading: 'Starting Balance', lines: ['Line 1'] },
    { heading: 'Income — Only the following receipts qualify', lines: ['Line 2', 'Line 3', 'Line 4'] },
    { heading: 'Less Disbursements — Only the following qualify', lines: ['Line 5', 'Line 6', 'Line 7'] },
    { heading: 'Assets On Hand', lines: ['Line 8'] },
  ]);
  // Line 8 in its new card still shows the remaining assets.
  await expect(page.locator('#line8')).toHaveText('$100.00');
});
