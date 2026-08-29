import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanInitialWard } from './support/target';

// Plan Initial is the fourth feature extraction (Milestone 5 of
// INDEX-SPLIT-PLAN.md) -- mirrors plan-annual-mount.spec.ts's shape.
// No Excel round-trip spec: this filing type has no Excel support at all
// (see the Milestone 5 plan's "Confirmed facts").

const PLAN_INITIAL_PAGES = ['/', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9', '/p10', '/print'];

test.describe('plan-initial feature module', () => {
  test('every page renders with no console errors, navigating via the extracted mount()', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createWard(page, 'Plan Initial Nav Test Ward', 'planInitial');

    for (const route of PLAN_INITIAL_PAGES) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await expect(page.locator('#main-content')).not.toBeEmpty();
    }

    expect(errors, `console/page errors while navigating Plan Initial pages: ${errors.join('\n')}`).toEqual([]);
  });

  test('an incomplete filing is blocked from export with a clear error', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Incomplete Plan Initial Ward', 'planInitial');
    await page.evaluate(() => (window as any).navigate('/print'));

    let alertMessage = '';
    page.once('dialog', (d) => { alertMessage = d.message(); d.accept(); });
    await page.evaluate(() => (window as any).doSavePdfPlanInitial());
    await page.waitForTimeout(500);

    expect(alertMessage).toContain('Cannot export');
  });

  test('a fully completed filing exports a real PDF', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Complete Plan Initial PDF Ward', 'planInitial');
    await fillMinimalValidPlanInitialWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.evaluate(() => (window as any).doSavePdfPlanInitial());
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
    await createWard(page, 'Plan Initial Cycle Ward', 'planInitial');
    await createWard(page, 'Other Cycle Ward', 'guardian');

    // @ts-expect-error - guardianData is a page-global from legacy-app.js, not declared in this file
    const wards = await page.evaluate(() => guardianData.wards.map((w: any) => ({ id: w.wardId, type: w.inventoryType })));
    const planInitialId = wards.find((w: any) => w.type === 'planInitial').id;
    const guardianId = wards.find((w: any) => w.type === 'guardian').id;

    for (let i = 0; i < 15; i++) {
      await page.evaluate((id) => (window as any).switchWard(id), planInitialId);
      await page.evaluate((r) => (window as any).navigate(r), '/p2');
      await page.evaluate((id) => (window as any).switchWard(id), guardianId);
    }

    const mainContentCount = await page.locator('#main-content').count();
    expect(mainContentCount).toBe(1);
    await expect(page.locator('#main-content')).not.toBeEmpty();

    expect(errors, `console/page errors during repeated entry/exit: ${errors.join('\n')}`).toEqual([]);
  });
});
