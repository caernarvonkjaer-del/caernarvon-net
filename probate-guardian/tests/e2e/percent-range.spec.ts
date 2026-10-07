import { test, expect, type Page, type Locator } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, dismissScheduleDocPrompt, acceptDynDialog, importWorkbookConfirmed } from './support/target';
import { readAll } from './support/stream';

// Milestone 71C. Every share field was a money field: 150 was accepted (the
// ward "owned" 150% of an asset, inflating every total and the sidebar's
// TOTAL VALUE), and a typed minus sign was silently deleted -- -10 filed as
// 10. Every value below is TYPED into the real box with the keyboard, never
// injected into the model: a share reaches the model through three write
// paths (the renderer, the Annual family's delegated writer, and the
// Inventory's own bindForms()), and any one of them could undo what the
// others kept. The import half reads the Clerk's workbook the way the
// workbook reads it (decision D10): 1.5 in a share cell is 150%.

const field = (page: Page, p: string) => page.evaluate((x) => (window as any).GuardianForms.testing.field(x), p);
const issues = (page: Page) => page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.open()).map((e: any) => String(e.message ?? e)));
const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
// A schedule page with rows raises the supporting-documentation prompt as it
// opens (Milestone 57C-R); a filer answers it before touching the page.
async function goTo(page: Page, route: string) {
  await navigate(page, route);
  await dismissScheduleDocPrompt(page);
}

async function typeInto(box: Locator, text: string) {
  await box.click();
  await box.fill('');
  if (text) await box.pressSequentially(text);
  await box.press('Tab');
}

async function reopen(page: Page) {
  await page.evaluate(async () => {
    const t = (window as any).GuardianForms.testing;
    await t.save.flush();
    const id = t.snapshot().filing.wardId;
    await t.activateFiling.close();
    await t.activateFiling.open(id);
  });
}

async function exportExcelWithOverride(page: Page, selector: string, file: string) {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await navigate(page, '/print');
  // The out-of-range shares are ordinary, bypassable issues (D7): the filer
  // continues despite them, and the court output still generates.
  const override = page.locator('#print-doc-container .pdf-preview-blocked [data-preview-action="override"]');
  await override.click();
  await acceptDynDialog(page);
  const button = page.locator(selector);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await button.click();
  fs.writeFileSync(file, await readAll(await (await dl).createReadStream()));
}

test.describe('Milestone 71C: a share is a percentage from 0 to 100', () => {
  test('Initial Inventory A-1 (its own bindForms() path): 150 is flagged, -10 keeps its minus through reopening, a cleared box stays blank', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Percent Inventory', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({ scheduleA1: [{ propertyDescription: 'Family Home', streetAddress: '1 Main St', cityStateZip: 'Clearwater, FL 33755', notes: '', residence: 'Yes', income: 'No', fullAssetValue: 200000, wardPercent: 100 }] });
      t.save.auto();
    });
    await goTo(page, '/a1');
    const box = page.locator('#main-content input[data-bind="scheduleA1.0.wardPercent"]');

    await typeInto(box, '150');
    expect(await field(page, 'scheduleA1.0.wardPercent')).toBe(150);
    await expect(box).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#main-content [data-percent-feedback]')).toHaveText('The percentage must be between 0 and 100.');
    expect(await issues(page)).toContain("A-1 row 1 — Ward's % must be between 0 and 100.");
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.status.navChecks().checks.a1), 'the schedule loses its check').toBe(false);

    await typeInto(box, '-10');
    await expect(box, 'the minus is kept, never stripped').toHaveValue('-10');
    expect(await field(page, 'scheduleA1.0.wardPercent')).toBe(-10);
    await goTo(page, '/a2');
    await goTo(page, '/a1');
    await expect(page.locator('#main-content input[data-bind="scheduleA1.0.wardPercent"]')).toHaveValue('-10');
    await reopen(page);
    await goTo(page, '/a1');
    await expect(page.locator('#main-content input[data-bind="scheduleA1.0.wardPercent"]'), 'still -10 after the filing is closed and reopened').toHaveValue('-10');

    await typeInto(page.locator('#main-content input[data-bind="scheduleA1.0.wardPercent"]'), '');
    expect(await field(page, 'scheduleA1.0.wardPercent'), 'a cleared share is blank, never an entered 0').toBe('');
  });

  test('Annual D-1 (the delegated path): -10 keeps its minus through reopening and errors; a cleared share is blank and required; Part VIII is checked too', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Percent Annual', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({ schD1: [{ description: 'Checking', accountNo: '1234', restricted: 'No', type: 'Checking', fullAmount: 1000, wardPct: 50, restrictedAmt: '' }] });
      t.save.auto();
    });
    await goTo(page, '/schd1');
    const box = () => page.locator('#main-content input[data-field-path="schD1.0.wardPct"]');

    await typeInto(box(), '-10');
    await dismissScheduleDocPrompt(page); // editing a line raises the supporting-documentation prompt
    await expect(box()).toHaveValue('-10');
    expect(await field(page, 'schD1.0.wardPct')).toBe(-10);
    expect(await issues(page)).toContain("Schedule D-1 — Line 1 — Ward's % must be between 0 and 100");
    // The mount used to clamp a negative share to 0 on every open.
    await goTo(page, '/schd2');
    await goTo(page, '/schd1');
    await expect(box()).toHaveValue('-10');
    await expect(box(), 'shown on render, before the filer touches it').toHaveAttribute('aria-invalid', 'true');
    await reopen(page);
    await goTo(page, '/schd1');
    await expect(box(), 'still -10 after the filing is closed and reopened').toHaveValue('-10');

    await typeInto(box(), '');
    await dismissScheduleDocPrompt(page);
    expect(await field(page, 'schD1.0.wardPct'), 'a cleared share is blank, never an entered 0').toBe('');
    expect(await issues(page)).toContain("Schedule D-1 — Line 1 — Ward's % is required");

    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({ schD1: [], trusts: [{ hasTrust: 'Yes', createdAfterGID: 'Yes', name: 'Family Trust', trustee: 'T', accountNo: '1', dateCreated: '2020-01-01', trustType: 'Revocable', wardPct: '', wardAmount: 80000 }] });
    });
    await goTo(page, '/p8');
    await typeInto(page.locator('#main-content input[data-field-path="trusts.0.wardPct"]'), '150');
    expect(await issues(page)).toContain("Part VIII — Trust 1 — Ward's % must be between 0 and 100");
  });

  test('importing the Clerk\'s workbook reads share cells as fractions: 150% and -10% arrive as 150 and -10, flagged; a cell holding 50 arrives as 5000', async ({ page }) => {
    test.setTimeout(300_000);
    await freshStartNoPassword(page);

    // Annual family: the exporter writes a share as a fraction (150 -> 1.5, -10 -> -0.1, 5000 -> 50).
    await createWard(page, 'Percent Annual Export', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => {
      const row = (description: string, wardPct: number) => ({ description, accountNo: '1', restricted: 'No', type: 'Checking', fullAmount: 1000, wardPct, restrictedAmt: '' });
      (window as any).GuardianForms.testing.patchFiling({ schD1: [row('Over', 150), row('Negative', -10), row('Fifty In The Cell', 5000)] });
    });
    const annualFile = path.join(os.tmpdir(), `pg-71c-annual-${Date.now()}.xlsx`);
    await exportExcelWithOverride(page, '[data-annual-action="save-excel"]', annualFile);
    await createWard(page, 'Percent Annual Import', 'annual');
    await navigate(page, '/');
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', annualFile);
    await page.waitForFunction(() => ((window as any).GuardianForms.testing.field('schD1') || []).length === 3, undefined, { timeout: 20_000 });
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('schD1').map((r: any) => r.wardPct))).toEqual([150, -10, 5000]);
    const annualIssues = await issues(page);
    for (const line of [1, 2, 3]) expect(annualIssues).toContain(`Schedule D-1 — Line ${line} — Ward's % must be between 0 and 100`);

    // Initial Inventory: the same reader.
    await createWard(page, 'Percent Inventory Export', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => {
      const home = (propertyDescription: string, wardPercent: number) => ({ propertyDescription, streetAddress: '1 Main St', cityStateZip: 'Clearwater, FL 33755', notes: '', residence: 'Yes', income: 'No', fullAssetValue: 1000, wardPercent });
      (window as any).GuardianForms.testing.patchFiling({ scheduleA1: [home('Over', 150), home('Negative', -10)] });
    });
    const inventoryFile = path.join(os.tmpdir(), `pg-71c-inventory-${Date.now()}.xlsx`);
    await exportExcelWithOverride(page, '[data-inventory-action="save-excel"]', inventoryFile);
    await createWard(page, 'Percent Inventory Import', 'guardian');
    await navigate(page, '/');
    await importWorkbookConfirmed(page, inventoryFile);
    await page.waitForFunction(() => ((window as any).GuardianForms.testing.field('scheduleA1') || []).length === 2, undefined, { timeout: 20_000 });
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('scheduleA1').map((r: any) => r.wardPercent))).toEqual([150, -10]);
    expect(await issues(page)).toContain("A-1 row 1 — Ward's % must be between 0 and 100.");
  });
});
