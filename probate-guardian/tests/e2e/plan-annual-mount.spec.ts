import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanAnnualWard, crossCheckNavAndSummaryStatus } from './support/target';

// Plan Annual is the third feature extraction (Milestone 4 of
// INDEX-SPLIT-PLAN.md) -- mirrors plan-simplified-mount.spec.ts's shape.
// No Excel round-trip spec: this filing type has no Excel support at all
// (see the Milestone 4 plan's "Confirmed facts").

const PLAN_ANNUAL_PAGES = ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9', '/p10', '/p11', '/print'];

test.describe('plan-annual feature module', () => {
  test('every page renders with no console errors, navigating via the extracted mount()', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createWard(page, 'Plan Annual Nav Test Ward', 'planAnnual');

    for (const route of PLAN_ANNUAL_PAGES) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await expect(page.locator('#main-content')).not.toBeEmpty();
    }

    expect(errors, `console/page errors while navigating Plan Annual pages: ${errors.join('\n')}`).toEqual([]);
  });

  test('an incomplete filing is blocked from export with a clear error', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Incomplete Plan Annual Ward', 'planAnnual');
    await page.evaluate(() => (window as any).navigate('/print'));

    let alertMessage = '';
    page.once('dialog', (d) => { alertMessage = d.message(); d.accept(); });
    await page.evaluate(() => (window as any).doSavePdfPlanAnnual());
    await page.waitForTimeout(500);

    expect(alertMessage).toContain('Cannot export');
  });

  test('a fully completed filing exports a real PDF', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Complete Plan Annual PDF Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.evaluate(() => (window as any).doSavePdfPlanAnnual());
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const bytes = Buffer.concat(chunks);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  test('repeated entry/exit does not accumulate stale mounts or console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createWard(page, 'Plan Annual Cycle Ward', 'planAnnual');
    await createWard(page, 'Other Cycle Ward', 'guardian');

    // @ts-expect-error - caseFile is a page-global from legacy-app.js, not declared in this file
    const wards = await page.evaluate(() => caseFile.wards.map((w: any) => ({ id: w.wardId, type: w.inventoryType })));
    const planAnnualId = wards.find((w: any) => w.type === 'planAnnual').id;
    const guardianId = wards.find((w: any) => w.type === 'guardian').id;

    for (let i = 0; i < 15; i++) {
      await page.evaluate((id) => (window as any).switchWard(id), planAnnualId);
      await page.evaluate((r) => (window as any).navigate(r), '/p2');
      await page.evaluate((id) => (window as any).switchWard(id), guardianId);
    }

    const mainContentCount = await page.locator('#main-content').count();
    expect(mainContentCount).toBe(1);
    await expect(page.locator('#main-content')).not.toBeEmpty();

    expect(errors, `console/page errors during repeated entry/exit: ${errors.join('\n')}`).toEqual([]);
  });
  test('Summary page completion badges agree with the sidebar and computeNavChecks(), both blank and fully filled', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Nav Parity Plan Annual Ward', 'planAnnual');
    const entries = [
      { route: '/', key: 'pa-cover' },
      { route: '/p2', key: 'pa-p2' },
      { route: '/p3', key: 'pa-p3' },
      { route: '/p4', key: 'pa-p4' },
      { route: '/p5', key: 'pa-p5' },
      { route: '/p6', key: 'pa-p6' },
      { route: '/p7', key: 'pa-p7' },
      { route: '/p8', key: 'pa-p8' },
      { route: '/p9', key: 'pa-p9' },
      { route: '/p10', key: 'pa-p10' },
      { route: '/p11', key: 'pa-p11' },
    ];

    await page.evaluate(() => (window as any).navigate('/summary'));
    for (const r of await crossCheckNavAndSummaryStatus(page, entries)) {
      expect(r.summaryComplete, `${r.route} (blank filing)`).toBe(r.expectComplete);
      expect(r.summaryComplete, `${r.route} (blank filing)`).toBe(r.sidebarComplete);
    }

    await fillMinimalValidPlanAnnualWard(page);
    await page.evaluate(() => (window as any).navigate('/summary'));
    for (const r of await crossCheckNavAndSummaryStatus(page, entries)) {
      expect(r.summaryComplete, `${r.route} (fully filled)`).toBe(r.expectComplete);
      expect(r.summaryComplete, `${r.route} (fully filled)`).toBe(r.sidebarComplete);
    }
  });
});
