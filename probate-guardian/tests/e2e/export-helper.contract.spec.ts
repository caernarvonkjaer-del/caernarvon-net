import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, clickExport, exportOutput } from './support/target';
import { exportWithWrites, loadWorkbook } from './support/workbook-vs-template';
import { readAll } from './support/stream';

// TEST-REVIEW.md Delivery 3 (N1, 2026-10-14): the output-helper contract. A
// positive export reads the gate -- the reason line beside the button, the
// app's own statement of what stops it -- before arming any download wait,
// and fails at once, naming what the filing still needs, when the gate is
// not the one the test expects. Overriding is an explicit opt-in that clicks
// the real "Continue despite outstanding requirements" and confirms it. And
// a refusal after the click wins the race against the download wait. Until
// this delivery a fixture carrying a county of "V0010" was overridden
// silently on its way to a green workbook test, and a refused click sat out
// a three-minute download timeout.

const patch = (page: Page, fields: Record<string, unknown>) => page.evaluate((f) => (window as any).GuardianForms.testing.patchFiling(f), fields);
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const timed = async <T>(run: () => Promise<T>): Promise<{ ms: number; error: Error | null; value: T | null }> => {
  const started = Date.now();
  try { const value = await run(); return { ms: Date.now() - started, error: null, value }; } catch (error) { return { ms: Date.now() - started, error: error as Error, value: null }; }
};
const DYN_OPEN = '.modal-overlay[id^="dyn-dialog-"].show';

async function inventoryWithCounty(page: Page, county: string) {
  await freshStartNoPassword(page);
  await createWard(page, 'Helper Contract Inventory', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await patch(page, { county });
}

test.describe('a positive export reads the gate before any download wait', () => {
  test('a filing that needs an acknowledgement fails at once, naming the gate found and what the filing still needs', async ({ page }) => {
    test.setTimeout(120_000);
    await inventoryWithCounty(page, 'V0010');
    const r = await timed(() => exportWithWrites(page, 'guardian'));
    expect(r.error, 'the helper refuses').not.toBeNull();
    expect(r.error!.message).toContain('Save as Excel: expected the gate "allowed", found "acknowledgement-required"');
    expect(r.error!.message).toContain('County: "V0010" is not a Florida county');
    expect(r.ms, 'before any download wait').toBeLessThan(20_000);
    await expect(page.locator('#print-doc-container [data-preview-action="override"]'), 'nothing was overridden on the way').toBeVisible();
  });

  test('the override is an explicit opt-in: the real Continue, its confirmation, then the download', async ({ page }) => {
    test.setTimeout(240_000);
    await inventoryWithCounty(page, 'V0010');
    const { bytes } = await exportWithWrites(page, 'guardian', { override: true });
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
    // The workbook carries what the filer typed: the override changes nothing in the output.
    const workbook = await loadWorkbook(bytes);
    expect(workbook.getWorksheet('SUMMARY I ').getCell('G3').value).toBe('V0010');
    await expect(page.locator('#print-doc-container [data-preview-action="override"]'), 'the override was taken').toHaveCount(0);
  });

  test('a refusal after the click wins the race against the download wait', async ({ page }) => {
    test.setTimeout(120_000);
    await inventoryWithCounty(page, 'V0010');
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    await go(page, '/print');
    const button = page.locator('[data-inventory-action="save-excel"]');
    await expect(button).toBeVisible();
    const r = await timed(() => clickExport(button, 60_000));
    expect(r.error, 'the click is refused').not.toBeNull();
    expect(r.error!.message).toMatch(/^Save as Excel was refused: Cannot export to Excel yet — \d+ required fields? missing/);
    expect(r.ms, 'the refusal, not a download timeout, ends the wait').toBeLessThan(15_000);
    await expect(page.locator(DYN_OPEN), 'the refusal dialog is closed again').toHaveCount(0);
  });

  test('with a Florida county the same filing exports, and the workbook holds it', async ({ page }) => {
    test.setTimeout(240_000);
    await inventoryWithCounty(page, 'Pinellas');
    const { bytes } = await exportWithWrites(page, 'guardian');
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
    expect((await loadWorkbook(bytes)).getWorksheet('SUMMARY I ').getCell('G3').value).toBe('Pinellas');
  });

  test('Save as PDF holds the same contract, on the Annual', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Helper Contract Annual', 'annual');
    await fillMinimalValidAnnualWard(page);
    await patch(page, { county: 'V0010' });
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    await go(page, '/print');
    const button = page.locator('[data-annual-action="save-pdf"]');
    const r = await timed(() => exportOutput(button, { timeout: 60_000 }));
    expect(r.error!.message).toContain('Save as PDF: expected the gate "allowed", found "acknowledgement-required"');
    expect(r.error!.message).toContain('County: "V0010"');
    expect(r.ms).toBeLessThan(20_000);
    const download = await exportOutput(button, { gate: 'acknowledgement-required', timeout: 120_000 });
    const bytes = await readAll(await download.createReadStream());
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
