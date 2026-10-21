import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, acceptDynDialog, dismissDynDialog } from './support/target';

// Milestone 77A: a draft can be made, and the app says how. A guardian
// preparing a report for her attorney's audit concluded she couldn't produce
// one: on Preview & Export the reason line named "Continue despite outstanding
// requirements" with no such button there, a red box said the fields "must be
// completed before this ward can be exported", Print said "Cannot print …
// Open Print Preview" from Print Preview with only OK, and the Save buttons
// ended in OK too. The one Continue sat at the bottom of the page. Now the
// reason line carries the button, the red box says a draft can be made, and
// Print, Save as PDF and Save as Excel ask -- Continue or Cancel. All by real
// clicks (AGENTS.md section 6).

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const CONTINUE = 'Continue despite outstanding requirements';
const ASKED = /^Cannot (export|export to Excel|print) yet — \d+ required fields? missing, listed on this page\./;

async function openBlankPreview(page: Page, type: string) {
  if (type === 'simplified') await createSimplifiedWard(page, `Draft ${type}`);
  else await createWard(page, `Draft ${type}`, type);
  await go(page, '/print');
  await expect(page.locator('#print-doc-container .pdf-preview-blocked')).toBeVisible({ timeout: 60_000 });
}

test('every preview page: the red box says a draft can be made, and the reason line\'s Continue works', async ({ page }) => {
  test.setTimeout(360_000);
  await freshStartNoPassword(page);
  for (const type of ['guardian', 'annual', 'simplified', 'planAnnual', 'planInitial', 'planMinor', 'planSimplified']) {
    await openBlankPreview(page, type);
    // The red box's subtitle (the readiness card's shares its class).
    const sub = page.locator('.validation-sub').filter({ hasText: /^Across \d+ sections?, listed below\./ });
    await expect(sub, type).toContainText(`Complete them, or choose “${CONTINUE}” to produce a draft with them blank.`);
    await expect(sub, type).not.toContainText('must be completed');
    const button = page.locator('#export-reason [data-export-continue]');
    await expect(button, type).toHaveText(CONTINUE);
    await button.click();
    expect(await acceptDynDialog(page), type).toMatch(/Requirements remain outstanding/);
    await expect(page.locator('#export-reason [data-export-reason="outstanding"]'), `${type}: the reason line drops what Continue answered`).toHaveCount(0);
    await expect(page.locator('#print-doc-container .pdf-page').first(), `${type}: the Preview draws the draft`).toBeVisible({ timeout: 60_000 });
  }
});

test('Print asks: Cancel prints nothing; Continue opens the PDF to print', async ({ page }) => {
  test.setTimeout(240_000);
  await freshStartNoPassword(page);
  await openBlankPreview(page, 'annual');
  let opened = 0;
  page.context().on('page', () => { opened += 1; });
  const print = page.getByRole('button', { name: 'Print', exact: true });
  await print.click();
  expect(await dismissDynDialog(page)).toMatch(ASKED);
  await page.waitForTimeout(500);
  expect(opened, 'Cancel prints nothing').toBe(0);

  const popup = page.waitForEvent('popup', { timeout: 60_000 });
  await print.click();
  const box = page.locator('.modal-overlay.show');
  await expect(box.locator('[data-dyn-action="confirm"]')).toHaveText(CONTINUE);
  await box.locator('[data-dyn-action="confirm"]').click();
  await popup;
  // The page says Continue was given, as the Preview's own button does.
  await expect(page.locator('#export-reason [data-export-reason="outstanding"]')).toHaveCount(0);
  await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 60_000 });
});

test('Save as PDF and Save as Excel ask, and Continue saves the draft', async ({ page }) => {
  test.setTimeout(300_000);
  await freshStartNoPassword(page);
  await openBlankPreview(page, 'annual');
  const pdf = page.waitForEvent('download', { timeout: 120_000 });
  await page.locator('[data-annual-action="save-pdf"]').click();
  expect(await acceptDynDialog(page)).toMatch(/^Cannot export yet — /);
  expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/i);

  // A fresh visit asks again (Continue covers one visit), here for the workbook.
  await go(page, '/');
  await go(page, '/print');
  await expect(page.locator('#print-doc-container .pdf-preview-blocked')).toBeVisible({ timeout: 60_000 });
  const xlsx = page.waitForEvent('download', { timeout: 120_000 });
  await page.locator('[data-annual-action="save-excel"]').click();
  expect(await acceptDynDialog(page)).toMatch(/^Cannot export to Excel yet — /);
  expect((await xlsx).suggestedFilename()).toMatch(/\.xlsx$/i);
});

test('a Plan\'s Save as PDF asks too, and Cancel saves nothing', async ({ page }) => {
  test.setTimeout(240_000);
  await freshStartNoPassword(page);
  await openBlankPreview(page, 'planAnnual');
  let downloaded = false;
  page.on('download', () => { downloaded = true; });
  await page.locator('[data-output-action="save-pdf"]').click();
  expect(await dismissDynDialog(page)).toMatch(/^Cannot export yet — /);
  await page.waitForTimeout(500);
  expect(downloaded).toBe(false);
  await expect(page.locator('#export-reason [data-export-continue]'), 'still offered after Cancel').toHaveText(CONTINUE);
});
