import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, fillMinimalValidAnnualWard } from './support/target';
import { FILING_MATRIX } from './support/filing-matrix';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 68¾A. Every page inside every filing, the dashboard, and the
// Preview & Export banner begin their visible title with the test-system
// warning, from one constant and one switch (src/core/ui/test-system-title.js),
// through the router's shared post-render header path. The court's documents
// never carry it.

const PREFIX = 'TEST SYSTEM - Do not use for filing - ';
const titleText = (page: Page) => page.evaluate(() => {
  const root = document.getElementById('main-content')!;
  const h1 = root.querySelector('.schedule-page > h1, .schedule-page h1') as HTMLElement | null;
  const title = h1 && !h1.classList.contains('visually-hidden')
    ? h1
    : root.querySelector('.print-preview-banner > :first-child') as HTMLElement | null;
  if (!title) return null;
  // The heading's own text, without the header action buttons.
  const clone = title.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.form-header-actions').forEach((n) => n.remove());
  return (clone.textContent || '').replace(/\s+/g, ' ').trim();
});
const count = (s: string | null) => (s || '').split('TEST SYSTEM - Do not use for filing').length - 1;
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

async function open(page: Page, type: string, name: string) {
  if (type === 'simplified') await createSimplifiedWard(page, name);
  else await createWard(page, name, type);
}

for (const filing of FILING_MATRIX) {
  test(`${filing.displayName}: every page's title starts with the warning, once`, async ({ page }) => {
    test.setTimeout(120_000);
    await freshStartNoPassword(page);
    await open(page, filing.id, `${filing.displayName} Title`);
    for (const route of filing.routeSet) {
      await go(page, route);
      const title = await titleText(page);
      expect(title, `${filing.id} ${route} has a visible title surface`).not.toBeNull();
      expect(title!.startsWith(PREFIX), `${filing.id} ${route}: "${title}"`).toBe(true);
      expect(count(title), `${filing.id} ${route}: the warning appears once`).toBe(1);
    }
  });
}

test('the reported example reads exactly, and re-rendering, a field change, a theme change and navigating back never duplicate it', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Inventory Title Idempotence', 'guardian');
  await go(page, '/');
  const first = await titleText(page);
  expect(first).toBe(`${PREFIX}Verified Initial Inventory — Case Information`);

  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  expect(count(await titleText(page)), 'same-route re-render').toBe(1);

  await page.locator('#main-content input[type="text"]').first().fill('Ward Name Typed');
  await page.locator('#main-content input[type="text"]').first().blur();
  expect(count(await titleText(page)), 'after a field write').toBe(1);

  await page.locator('#main-content [data-shell-action="toggle-theme"]').click();
  expect(count(await titleText(page)), 'after a theme change').toBe(1);

  await go(page, '/summary');
  await go(page, '/');
  expect(await titleText(page), 'after navigating away and back').toBe(first);

  // The header actions are still there, named and clickable.
  await expect(page.locator('#main-content .form-header-actions [data-shell-action="dashboard"]')).toBeVisible();
  await expect(page.locator('#main-content .form-header-actions #help-toggle-btn')).toHaveAccessibleName('Help');
});

test('the dashboard begins with the warning, once, where the old trailing label used to be', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Dashboard Title', 'annual');
  await go(page, '/dashboard');
  const h1 = page.locator('#main-content .dashboard-page-header h1');
  await expect(h1).toHaveText(`${PREFIX}All Filings — Dashboard`);
  expect(count(await h1.textContent())).toBe(1);
  await expect(page.locator('.dashboard-test-system-label')).toHaveCount(0);
});

test('Preview & Export shows the warning in its banner; the downloaded PDF and workbook carry none', async ({ page }) => {
  test.setTimeout(180_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Output Stays Clean', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await go(page, '/print');
  expect((await titleText(page))!.startsWith(`${PREFIX}Preview & Export`)).toBe(true);

  const pdfButton = page.locator('[data-annual-action="save-pdf"]');
  await expect(pdfButton).toBeEnabled({ timeout: 20_000 });
  const pdfDl = page.waitForEvent('download', { timeout: 40_000 });
  await pdfButton.click();
  const pdf = (await extractPdfText(await readAll(await (await pdfDl).createReadStream())));
  expect(pdf).not.toContain('TEST SYSTEM');

  const xlsxDl = page.waitForEvent('download', { timeout: 40_000 });
  await page.locator('[data-annual-action="save-excel"]').click();
  const xlsx = await readAll(await (await xlsxDl).createReadStream());
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(xlsx);
  const strings = await zip.file('xl/sharedStrings.xml')?.async('string') ?? '';
  expect(strings).not.toContain('TEST SYSTEM');
});

test('with the switch off, no title carries the warning and every original title is restored unchanged', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Switch Off', 'planAnnual');
  await go(page, '/');
  const on = await titleText(page);
  expect(on!.startsWith(PREFIX)).toBe(true);

  await page.evaluate(() => (window as any).GuardianForms.testing.setTestSystemTitleWarning(false));
  expect(await titleText(page), 'turned off in place').toBe(on!.slice(PREFIX.length));
  await go(page, '/p2');
  expect(count(await titleText(page)), 'and stays off on the next page').toBe(0);
  await go(page, '/print');
  expect(count(await titleText(page)), 'and on Preview & Export').toBe(0);
  await go(page, '/dashboard');
  await expect(page.locator('#main-content .dashboard-page-header h1')).toHaveText('All Filings — Dashboard');
});

test('at phone width the warning, the title and the header buttons do not overlap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await freshStartNoPassword(page);
  await createWard(page, 'Narrow Title', 'guardian');
  await go(page, '/');
  const boxes = await page.evaluate(() => {
    const h1 = document.querySelector('#main-content .schedule-page h1')!;
    const r = (el: Element | null) => { const b = el!.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    return { title: r(h1.querySelector('.test-system-title')), actions: r(h1.querySelector('.form-header-actions')), viewport: window.innerWidth };
  });
  const overlap = !(boxes.title.r <= boxes.actions.l || boxes.actions.r <= boxes.title.l || boxes.title.b <= boxes.actions.t || boxes.actions.b <= boxes.title.t);
  expect(overlap, JSON.stringify(boxes)).toBe(false);
  expect(boxes.actions.r, 'the buttons stay on screen').toBeLessThanOrEqual(boxes.viewport + 0.5);
  await expect(page.locator('#main-content .form-header-actions [data-shell-action="dashboard"]')).toBeVisible();
});
