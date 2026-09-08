import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, crossCheckNavAndSummaryStatus } from './target';

// Shared contract for the four plan-mount specs (plan-annual, plan-initial,
// plan-minor, plan-simplified). Each spec's own file keeps only its feature
// identity, its genuine points of variation, and any filing-specific edge
// case that doesn't fit this shape -- see Milestone 30, Phase 1.
export type PlanMountConfig = {
  featureName: string;
  filingType: string;
  routes: string[];
  fillValidWard: (page: Page) => Promise<void>;
  triggerExport: (page: Page) => Promise<void>;
  triggerBlockedExport: (page: Page) => Promise<void>;
  navChecks: Array<{ route: string; key: string | string[] }>;
  createFiling?: (page: Page) => Promise<void>;
  waitForReady?: (page: Page) => Promise<void>;
};

export function registerPlanMountTests(config: PlanMountConfig) {
  const {
    featureName, filingType, routes, fillValidWard,
    triggerExport, triggerBlockedExport, navChecks, createFiling, waitForReady,
  } = config;

  const makeFiling = async (page: Page, wardName: string) => {
    if (createFiling) {
      await createFiling(page);
      return;
    }
    await createWard(page, wardName, filingType);
  };

  test.describe(`${featureName} feature module`, () => {
    test('every page renders with no console errors, navigating via the extracted mount()', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

      await freshStartNoPassword(page);
      await makeFiling(page, `${featureName} Nav Test Ward`);

      for (const route of routes) {
        await page.evaluate((r) => (window as any).navigate(r), route);
        await expect(page.locator('#main-content')).not.toBeEmpty();
      }

      expect(errors, `console/page errors while navigating ${featureName} pages: ${errors.join('\n')}`).toEqual([]);
    });

    test('an incomplete filing is blocked from export with a clear error', async ({ page }) => {
      await freshStartNoPassword(page);
      await makeFiling(page, `Incomplete ${featureName} Ward`);
      await page.evaluate(() => (window as any).navigate('/print'));

      // triggerBlockedExport()'s own promise (an evaluate() or locator
      // action) will not settle until the alert it triggers is dismissed --
      // it must be started, not awaited, before waiting for the dialog, or
      // this deadlocks: the trigger waits on the dialog, and Promise.all
      // would wait on the trigger.
      const dialogPromise = page.waitForEvent('dialog');
      const triggerPromise = triggerBlockedExport(page);
      const dialog = await dialogPromise;
      const alertMessage = dialog.message();
      await dialog.accept();
      await triggerPromise;

      expect(alertMessage).toContain('Cannot export');
    });

    test('a fully completed filing exports a real PDF', async ({ page }) => {
      await freshStartNoPassword(page);
      await makeFiling(page, `Complete ${featureName} PDF Ward`);
      await fillValidWard(page);
      await page.evaluate(() => (window as any).navigate('/print'));

      const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
      await triggerExport(page);
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
      await makeFiling(page, `${featureName} Cycle Ward`);
      await createWard(page, 'Other Cycle Ward', 'guardian');
      if (waitForReady) await waitForReady(page);

      // @ts-expect-error - caseFile is a page-global from legacy-app.js, not declared in this file
      const wards = await page.evaluate(() => caseFile.wards.map((w: any) => ({ id: w.wardId, type: w.inventoryType })));
      const filingId = wards.find((w: any) => w.type === filingType).id;
      const guardianId = wards.find((w: any) => w.type === 'guardian').id;

      for (let i = 0; i < 15; i++) {
        await page.evaluate((id) => (window as any).switchWard(id), filingId);
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
      await makeFiling(page, `Nav Parity ${featureName} Ward`);

      await page.evaluate(() => (window as any).navigate('/summary'));
      for (const r of await crossCheckNavAndSummaryStatus(page, navChecks)) {
        expect(r.summaryComplete, `${r.route} (blank filing)`).toBe(r.expectComplete);
        expect(r.summaryComplete, `${r.route} (blank filing)`).toBe(r.sidebarComplete);
      }

      await fillValidWard(page);
      await page.evaluate(() => (window as any).navigate('/summary'));
      for (const r of await crossCheckNavAndSummaryStatus(page, navChecks)) {
        expect(r.summaryComplete, `${r.route} (fully filled)`).toBe(r.expectComplete);
        expect(r.summaryComplete, `${r.route} (fully filled)`).toBe(r.sidebarComplete);
      }
    });
  });
}
