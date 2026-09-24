import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanInitialWard, crossCheckNavAndSummaryStatus } from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 68B. An Initial Guardianship Plan with no reporting period was
// filed silently: the Cover carried no required marker on "For the Period
// From / Through", the banner read "Ready to export", the readiness card
// "Automated checks passed", the sidebar and Summary "Cover Complete", and
// the PDF printed "For the period   through" with nothing between. There was
// no rule anywhere -- not in validatePlanInitial(), not in the readiness
// config, not in computeNavChecks(). The Annual and Simplified Plans require
// theirs.
//
// Requester, 2026-09-23: require it, like the other Plans. Every surface a
// filer looks at now says so, the export gate stops on it, a backwards
// period is ordered the way the other Plans order theirs, and once entered
// the cover line prints it. A plan saved before this with a blank period
// shows as blocked the next time it is opened -- the filing was incomplete.

const PDF = '[data-form-action="save-pdf-plan-initial"]';
const FROM = 'Cover — Reporting Period From is required';
const TO = 'Cover — Reporting Period To is required';
const ORDER = 'Cover — Reporting Period To must be on or after Reporting Period From';

const messages = (page: Page) =>
  page.evaluate(() => ((window as any).validatePlanInitial() || []).map((i: any) => String(i?.message ?? i)));

async function setPeriod(page: Page, from: string, to: string) {
  await page.evaluate(([f, t]) => { const w = window as any; w.D.periodFrom = f; w.D.periodTo = t; w.autoSave(); }, [from, to]);
  await page.evaluate(() => (window as any).flushPendingSave());
}

test('an Initial Plan with no reporting period is stopped, and told where, until the period is entered', async ({ page }) => {
  test.setTimeout(120_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Initial Plan Blank Period', 'planInitial');
  await fillMinimalValidPlanInitialWard(page);
  await setPeriod(page, '', '');

  // The Cover asks for it as required, like the other Plans' covers.
  await page.evaluate(() => (window as any).navigate('/'));
  await expect.soft(page.locator('label[for="periodFrom"] .req'), 'From carries the required marker').toHaveCount(1);
  await expect.soft(page.locator('label[for="periodTo"] .req'), 'Through carries the required marker').toHaveCount(1);

  // The export gate names both dates.
  expect.soft(await messages(page), 'the export gate names both dates').toEqual(expect.arrayContaining([FROM, TO]));

  // The sidebar and the Summary page agree the Cover is not done.
  await page.evaluate(() => (window as any).navigate('/summary'));
  const [cover] = await crossCheckNavAndSummaryStatus(page, [{ route: '/', key: 'pi-cover' }]);
  expect.soft(cover.expectComplete, 'computeNavChecks() marks the Cover incomplete').toBe(false);
  expect.soft(cover.sidebarComplete, 'the sidebar dot agrees').toBe(false);
  expect.soft(cover.summaryComplete, 'the Summary line agrees').not.toBe(true);

  // The readiness card carries it as its own item, and the button is off.
  await page.evaluate(() => (window as any).navigate('/print'));
  await expect.soft(page.locator('#filing-readiness-card [data-readiness-id="cover.period"]'), 'the readiness card has a period item').toHaveCount(1);
  await expect(page.locator(PDF), 'Save as PDF is disabled while the period is blank').toBeDisabled();

  // A backwards period is ordered the way the other Plans order theirs.
  await setPeriod(page, '2026-06-01', '2026-01-01');
  expect((await messages(page)).includes(ORDER), 'a period that ends before it begins is refused').toBe(true);

  // Entered, everything clears and the cover line prints it.
  await setPeriod(page, '2026-01-01', '2026-12-31');
  expect((await messages(page)).filter((m) => m.startsWith('Cover — Reporting Period'))).toEqual([]);
  expect(await page.evaluate(() => (window as any).computeNavChecks().checks['pi-cover'])).toBe(true);
  await page.evaluate(() => (window as any).navigate('/print'));
  const button = page.locator(PDF);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await button.click();
  const text = (await extractPdfText(await readAll(await (await dl).createReadStream()))).replace(/\s+/g, ' ');
  expect(text).toContain('01/01/2026 through 12/31/2026');
});
