import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard, crossCheckNavAndSummaryStatus } from './support/target';

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

    // dialog must be registered before the trigger, not after -- otherwise
    // this races the dialog handler rather than waiting on it deterministically.
    const dialogPromise = page.waitForEvent('dialog');
    const triggerPromise = page.locator('[data-annual-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    });
    const dialog = await dialogPromise;
    const alertMessage = dialog.message();
    await dialog.accept();
    await triggerPromise;

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

    // @ts-expect-error - caseFile is a page-global from legacy-app.js, not declared in this file
    const wards = await page.evaluate(() => caseFile.wards.map((w: any) => ({ id: w.wardId, type: w.inventoryType })));
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

  test('rapid Schedule B-2 date entry commits every date before navigation', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Rapid Date Entry Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/schb2'));
    await page.locator('[data-annual-action="add-row"][data-collection="schB2"]').click();

    // Model the reported fast/paste-like sequence: all four fields emit input
    // in one turn, then navigation begins before any individual blur handler
    // is relied upon to commit its value.
    await page.evaluate(() => {
      const values: Record<string, string> = {
        'schB2.0.periodFrom': '02/14/2026',
        'schB2.0.periodTo': '03/14/2026',
        'schB2.0.datePaid': '03/15/2026',
        'schB2.0.courtOrderDate': '01/31/2026',
      };
      for (const [path, value] of Object.entries(values)) {
        const input = document.querySelector<HTMLInputElement>(`[data-annual-path="${path}"]`)!;
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      (window as any).navigate('/schb3');
    });

    await page.evaluate(() => (window as any).navigate('/schb2'));
    const dates = await page.evaluate(() => (window as any).D.schB2[0]);
    expect(dates).toMatchObject({
      periodFrom: '2026-02-14',
      periodTo: '2026-03-14',
      datePaid: '2026-03-15',
      courtOrderDate: '2026-01-31',
    });
  });

  test('Final and Trust aliases use their own legal copy and PDF identity', async ({ page }) => {
    await freshStartNoPassword(page);

    for (const [inventoryType, label, title] of [
      ['finalAccounting', 'Final Accounting', 'FINAL GUARDIANSHIP ACCOUNTING'],
      ['trustAccounting', 'Trust Accounting', 'TRUST GUARDIANSHIP ACCOUNTING'],
    ]) {
      await createWard(page, `${label} Identity Ward`, inventoryType);
      await page.evaluate(() => (window as any).navigate('/p4'));
      await expect(page.locator('#main-content')).toContainText(label);

      const identity = await page.evaluate(async () => {
        const mod = await import('/probate-guardian/src/features/annual-accounting/pdf-model.js');
        const model = mod.buildAnnualAccountingModel((window as any).D);
        return {
          filingType: (window as any).D.filingType,
          inventoryType: (window as any).D.inventoryType,
          formName: model.metadata.formName,
          title: model.metadata.title,
          preparer: model.sections.find((section: any) => section.id === 'part4')?.blocks?.[0]?.text,
        };
      });

      expect(identity.filingType).toBe(label.replace(' Accounting', ''));
      expect(identity.inventoryType).toBe(inventoryType);
      expect(identity.formName).toBe(title);
      expect(identity.title).toContain(label);
      expect(identity.preparer).toContain(label);
    }
  });
  test('Summary page completion badges (Parts + Schedules) agree with the sidebar and computeNavChecks(), both blank and fully filled', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Nav Parity Annual Ward', 'annual');
    const entries = [
      { route: '/', key: 'a-p1' },
      { route: '/p2', key: 'a-p2' },
      { route: '/p3', key: 'a-p3' },
      { route: '/p4', key: 'a-p4' },
      { route: '/p5', key: 'a-p5' },
      { route: '/p67', key: 'a-p67' },
      { route: '/p8', key: 'a-p8' },
      { route: '/p9', key: 'a-p9' },
      { route: '/p10', key: 'a-p10' },
      { route: '/p11', key: 'a-p11' },
      { route: '/scha', key: 'a-scha' },
      { route: '/schb1', key: 'a-schb1' },
      { route: '/schb2', key: 'a-schb2' },
      { route: '/schb3', key: 'a-schb3' },
      { route: '/schb4', key: 'a-schb4' },
      { route: '/schc', key: 'a-schc' },
      { route: '/schd1', key: ['a-schd1', 'a-schd2', 'a-schd3', 'a-schd4', 'a-schd5'] },
      { route: '/sche', key: 'a-sche' },
      { route: '/schf1', key: ['a-schf1', 'a-schf2'] },
    ];

    // Not every key is expected to be false on a blank filing (e.g. a-p67's
    // reconciliation trivially balances at 0=0) -- the invariant under test
    // is that all three sources always agree, not which way any one key
    // starts out.
    await page.evaluate(() => (window as any).navigate('/summary'));
    for (const r of await crossCheckNavAndSummaryStatus(page, entries)) {
      expect(r.summaryComplete, `${r.route} (blank filing)`).toBe(r.expectComplete);
      if (r.sidebarComplete !== null) expect(r.summaryComplete, `${r.route} (blank filing)`).toBe(r.sidebarComplete);
    }

    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => (window as any).navigate('/summary'));
    for (const r of await crossCheckNavAndSummaryStatus(page, entries)) {
      expect(r.summaryComplete, `${r.route} (fully filled)`).toBe(r.expectComplete);
      if (r.sidebarComplete !== null) expect(r.summaryComplete, `${r.route} (fully filled)`).toBe(r.sidebarComplete);
    }
  });
});

