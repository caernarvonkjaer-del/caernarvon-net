import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { freshStartNoPassword, createWard, createSimplifiedWard, fillMinimalValidSimplifiedWard, crossCheckNavAndSummaryStatus } from './support/target';

// Simplified Accounting is the pilot feature extraction (Milestone 2, Phase
// D of INDEX-SPLIT-PLAN.md) -- these specs go beyond routes.spec.ts's single
// "cover page renders" smoke check, since this is the module whose
// mount()/dispose()/dynamic-import wiring the whole extraction pattern rests
// on. Covers: every page in the feature, PDF export, Excel export+import
// round-trip, and the plan's own "verify repeated entry/exit does not grow
// heap or duplicate event handlers" requirement.

const SIMPLIFIED_PAGES = ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/print'];

test.describe('simplified-accounting feature module', () => {
  test('every page renders with no console errors, navigating via the extracted mount()', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Simplified Nav Test Ward');

    for (const route of SIMPLIFIED_PAGES) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await expect(page.locator('#main-content')).not.toBeEmpty();
    }

    expect(errors, `console/page errors while navigating Simplified pages: ${errors.join('\n')}`).toEqual([]);
  });

  test('an incomplete filing is blocked from export with a clear error', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Incomplete Simplified Ward');
    await page.evaluate(() => (window as any).navigate('/print'));

    // dialog must be registered before the trigger, not after -- otherwise
    // this races the dialog handler rather than waiting on it deterministically.
    const dialogPromise = page.waitForEvent('dialog');
    const triggerPromise = page.locator('[data-simplified-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
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
    await createSimplifiedWard(page, 'Complete Simplified PDF Ward');
    await fillMinimalValidSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.locator('[data-simplified-action="save-pdf"]').click();
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
    await createSimplifiedWard(page, 'Excel Roundtrip Simplified Ward');
    await fillMinimalValidSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.locator('[data-simplified-action="save-excel"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    const xlsxPath = path.join(os.tmpdir(), `pg-simplified-excel-${Date.now()}.xlsx`);
    await download.saveAs(xlsxPath);

    // A second, blank Simplified ward to import into.
    await createSimplifiedWard(page, 'Blank Simplified Import Target');
    await page.evaluate(() => (window as any).navigate('/'));

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', xlsxPath);
    // Poll the actual completion signal instead of guessing a timeout -- same
    // idiom annual-mount.spec.ts's own Excel-import test already establishes.
    await page.waitForFunction(() => (window as any).D.caseNumber === '2026-CP-000456', { timeout: 10_000 });

    const imported = await page.evaluate(() => ({
      wardName: (window as any).D.wardName,
      caseNumber: (window as any).D.caseNumber,
      county: (window as any).D.county,
      guardian: (window as any).D.guardian,
    }));
    expect(imported.caseNumber).toBe('2026-CP-000456');
    expect(imported.county).toBe('Pinellas');
    expect(imported.guardian).toBe('Sample Guardian');
    expect(errors).toEqual([]);
  });

  test('repeated entry/exit does not accumulate stale mounts or console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Simplified Cycle Ward');
    await createWard(page, 'Other Cycle Ward', 'guardian');

    // caseFile is a bare top-level `let` in legacy-app.js (a classic
    // script), not a `window` property -- but it's still reachable by bare
    // identifier from page.evaluate(), which runs in the same global realm.
    // @ts-expect-error - caseFile is a page-global from legacy-app.js, not declared in this file
    const wards = await page.evaluate(() => caseFile.wards.map((w: any) => ({ id: w.wardId, type: w.inventoryType })));
    const simplifiedId = wards.find((w: any) => w.type === 'simplified').id;
    const guardianId = wards.find((w: any) => w.type === 'guardian').id;

    for (let i = 0; i < 15; i++) {
      await page.evaluate((id) => (window as any).switchWard(id), simplifiedId);
      await page.evaluate((r) => (window as any).navigate(r), '/p2');
      await page.evaluate((id) => (window as any).switchWard(id), guardianId);
    }

    // Only one #main-content in the document, and it holds real content --
    // a dispose bug that fails to clear the container before the next
    // mount would otherwise leave stale nodes accumulating underneath.
    const mainContentCount = await page.locator('#main-content').count();
    expect(mainContentCount).toBe(1);
    await expect(page.locator('#main-content')).not.toBeEmpty();

    const staleDelegateCalls = await page.evaluate(() => {
      let calls = 0;
      (window as any).openFloridaCourtPortal = () => { calls += 1; };
      const probe = document.createElement('button');
      probe.dataset.simplifiedAction = 'open-court-portal';
      document.getElementById('main-content')?.append(probe);
      probe.click();
      probe.remove();
      return calls;
    });
    expect(staleDelegateCalls).toBe(0);

    const heapUsed = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? null);
    // Informational, not a hard gate this milestone (see the Milestone 2
    // plan's "New E2E coverage" section) -- there's no warmed-baseline
    // methodology yet with only one feature extracted. Just confirm the
    // metric itself is readable, so a future milestone can turn this into
    // a real bound once a second feature exists to compare against.
    expect(heapUsed === null || heapUsed > 0).toBe(true);

    expect(errors, `console/page errors during repeated entry/exit: ${errors.join('\n')}`).toEqual([]);
  });
  test('Summary page completion badges (Parts I-VII) agree with the sidebar and computeNavChecks(), both blank and fully filled', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Nav Parity Simplified Ward');
    const entries = [
      { route: '/', key: 's-cover' },
      { route: '/p2', key: 's-p2' },
      { route: '/p3', key: 's-p3' },
      { route: '/p4', key: 's-p4' },
      { route: '/p5', key: 's-p5' },
      { route: '/p6', key: 's-p6' },
      { route: '/p7', key: 's-p7' },
    ];

    await page.evaluate(() => (window as any).navigate('/summary'));
    for (const r of await crossCheckNavAndSummaryStatus(page, entries)) {
      expect(r.summaryComplete, `${r.route} (blank filing)`).toBe(r.expectComplete);
      expect(r.summaryComplete, `${r.route} (blank filing)`).toBe(r.sidebarComplete);
    }

    await fillMinimalValidSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/summary'));
    for (const r of await crossCheckNavAndSummaryStatus(page, entries)) {
      expect(r.summaryComplete, `${r.route} (fully filled)`).toBe(r.expectComplete);
      expect(r.summaryComplete, `${r.route} (fully filled)`).toBe(r.sidebarComplete);
    }
  });
});
