import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';

// Annual Accounting is the sixth feature extraction (Milestone 7 of
// INDEX-SPLIT-PLAN.md) -- the largest yet, and the second Plan/Accounting
// feature with real Excel import/export (after Simplified Accounting).
// Mirrors simplified-mount.spec.ts's five-test shape. finalAccounting/
// trustAccounting (formEngine() aliases of 'annual', same code, same data
// shape) already have their own cover-page coverage in routes.spec.ts, so
// this file tests the 'annual' type only -- no bespoke per-alias spec.

const ANNUAL_PAGES = [
  '/', '/summary', '/p2', '/p3', '/p4', '/p5',
  '/scha', '/schb1', '/schb2', '/schb3', '/schb4', '/schc',
  '/schd1', '/schd2', '/schd3', '/schd4', '/schd5',
  '/sche', '/schf1', '/schf2',
  '/p67', '/p8', '/p9', '/p10', '/p11', '/print',
];

test.describe('annual-accounting feature module', () => {
  test('every page renders with no console errors, navigating via the extracted mount()', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createWard(page, 'Annual Nav Test Ward', 'annual');

    for (const route of ANNUAL_PAGES) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await expect(page.locator('#main-content')).not.toBeEmpty();
    }

    expect(errors, `console/page errors while navigating Annual pages: ${errors.join('\n')}`).toEqual([]);
  });

  test('an incomplete filing is blocked from export with a clear error', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Incomplete Annual Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/print'));

    let alertMessage = '';
    page.once('dialog', (d) => { alertMessage = d.message(); d.accept(); });
    await page.locator('[data-annual-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    });
    await page.waitForTimeout(500);

    expect(alertMessage).toContain('Cannot export');
  });

  test('a fully completed filing exports a real PDF', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Complete Annual PDF Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.locator('[data-annual-action="save-pdf"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const bytes = Buffer.concat(chunks);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  test('exporting to the bundled blank template then re-importing round-trips key fields', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Excel Roundtrip Annual Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.locator('[data-annual-action="save-excel"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    const xlsxPath = path.join(os.tmpdir(), `pg-annual-excel-${Date.now()}.xlsx`);
    await download.saveAs(xlsxPath);

    // A second, blank Annual ward to import into.
    await createWard(page, 'Blank Annual Import Target', 'annual');
    await page.evaluate(() => (window as any).navigate('/'));

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', xlsxPath);
    // Annual's workbook has far more sheets than Simplified's, so parsing
    // can take longer than a fixed short wait -- poll for the actual
    // completion signal instead of guessing a timeout.
    await page.waitForFunction(() => (window as any).D.caseNumber === '2026-CP-000789', { timeout: 10_000 });

    const imported = await page.evaluate(() => ({
      wardName: (window as any).D.wardName,
      caseNumber: (window as any).D.caseNumber,
      county: (window as any).D.county,
      guardian: (window as any).D.guardian,
    }));
    expect(imported.caseNumber).toBe('2026-CP-000789');
    expect(imported.county).toBe('Pinellas');
    expect(imported.guardian).toBe('Sample Guardian');
    expect(errors).toEqual([]);
  });

  test('repeated entry/exit does not accumulate stale mounts or console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createWard(page, 'Annual Cycle Ward', 'annual');
    await createWard(page, 'Other Cycle Ward', 'guardian');

    // @ts-expect-error - guardianData is a page-global from legacy-app.js, not declared in this file
    const wards = await page.evaluate(() => guardianData.wards.map((w: any) => ({ id: w.wardId, type: w.inventoryType })));
    const annualId = wards.find((w: any) => w.type === 'annual').id;
    const guardianId = wards.find((w: any) => w.type === 'guardian').id;

    for (let i = 0; i < 15; i++) {
      await page.evaluate((id) => (window as any).switchWard(id), annualId);
      await page.evaluate((r) => (window as any).navigate(r), '/scha');
      await page.evaluate((id) => (window as any).switchWard(id), guardianId);
    }

    const mainContentCount = await page.locator('#main-content').count();
    expect(mainContentCount).toBe(1);
    await expect(page.locator('#main-content')).not.toBeEmpty();

    expect(errors, `console/page errors during repeated entry/exit: ${errors.join('\n')}`).toEqual([]);
  });

  test('Part VIII trust checkbox updates model and reflects in print preview and sidebar total updates for trustAccounting', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Trust Test Ward', 'trustAccounting');

    // Sidebar should start with Net Assets total label
    const sidebarLabel = page.locator('#ward-info-display .ward-info-total-label');
    await expect(sidebarLabel).toHaveText('Net Assets');
    const sidebarTotal = page.locator('#ward-info-display .ward-info-total');
    await expect(sidebarTotal).toHaveText('$0.00');

    // Enter starting balance on Part II
    await page.evaluate(() => (window as any).navigate('/p2'));
    await page.locator('#main-content [data-annual-path="startingBalance"]').fill('100000');
    await page.locator('#main-content [data-annual-path="startingBalance"]').dispatchEvent('input');
    await page.locator('#main-content [data-annual-path="startingBalance"]').dispatchEvent('change');
    await expect(sidebarTotal).toHaveText('$100,000.00');

    // Add Income in Schedule A
    await page.evaluate(() => (window as any).navigate('/scha'));
    await page.locator('#main-content [data-annual-action="add-row"][data-collection="schA"]').click();
    const payerInput = page.locator('#main-content [data-annual-path="schA.0.payer"]');
    await payerInput.fill('Social Security Administration');
    const descInput = page.locator('#main-content [data-annual-path="schA.0.description"]');
    await descInput.fill('SSI Monthly Benefit');
    await descInput.dispatchEvent('input');
    await descInput.dispatchEvent('change');
    // Ensure "SSI" did not turn into "Ssi"
    expect(await descInput.inputValue()).toBe('SSI Monthly Benefit');

    const amtInput = page.locator('#main-content [data-annual-path="schA.0.amount"]');
    await amtInput.fill('25000');
    await amtInput.dispatchEvent('input');
    await amtInput.dispatchEvent('change');
    await expect(sidebarTotal).toHaveText('$125,000.00');

    // Navigate to Part VIII
    await page.evaluate(() => (window as any).navigate('/p8'));
    const trustCheckbox = page.locator('#main-content input[type="checkbox"][data-annual-path="trusts.0.hasTrust"], #main-content input[type="checkbox"][data-form-path="trusts.0.hasTrust"]');
    await expect(trustCheckbox).toBeVisible();
    await trustCheckbox.check();
    await trustCheckbox.dispatchEvent('change');

    const hasTrustVal = await page.evaluate(() => (window as any).D.trusts?.[0]?.hasTrust);
    expect(hasTrustVal).toBe('Yes');

    // Fill in trust 1 details
    await page.locator('#main-content [data-annual-path="trusts.0.name"]').fill('Harold Bennett Living Trust');
    await page.locator('#main-content [data-annual-path="trusts.0.trustee"]').fill('Jane Bennett');

    // Check PDF model output for Part VIII
    const pdfModel = await page.evaluate(async () => {
      const mod = await import('/probate-guardian/src/features/annual-accounting/pdf-model.js');
      return mod.buildAnnualAccountingModel((window as any).D);
    });
    const part8Section = pdfModel.sections.find((s: any) => s.id === 'part8');
    expect(part8Section).toBeDefined();
    const trustDiscBlock = part8Section.blocks.find((b: any) => b.title === 'Trust Disclosure');
    expect(trustDiscBlock.items[0].value).toBe('Yes');
  });

  test('schedule empty verification checkbox updates scheduleNoItems state', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Empty Schedule Test Ward', 'annual');

    // Remove row on Schedule A
    await page.evaluate(() => {
      (window as any).D.schA = [];
      (window as any).navigate('/scha');
    });

    const emptyCheck = page.locator('#main-content input[type="checkbox"][data-annual-change="schedule-no-items"]');
    await expect(emptyCheck).toBeVisible();
    await emptyCheck.check();
    await emptyCheck.dispatchEvent('change');

    const state = await page.evaluate(() => (window as any).D.scheduleNoItems?.scha);
    expect(state).toBe(true);
  });
});

