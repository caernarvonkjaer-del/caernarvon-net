import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard } from './support/target';

// Guardian Inventory is Milestone 8A of INDEX-SPLIT-PLAN.md: page/nav/
// validation/row UI move into src/features/guardian-inventory/index.js,
// while print/PDF/Excel stay in legacy-app.js until Phase B.

const GUARDIAN_PAGES = [
  '/', '/summary',
  '/a1', '/a2',
  '/b1', '/b2', '/b3', '/b4',
  '/c1', '/c2', '/c3', '/c4', '/c5',
  '/d1', '/d2', '/d3', '/d4', '/d5',
  '/print',
];

test.describe('guardian-inventory feature module', () => {
  test('every page renders with no console errors, navigating via the extracted mount()', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Nav Test Ward', 'guardian');

    for (const route of GUARDIAN_PAGES) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await expect(page.locator('#main-content')).not.toBeEmpty();
    }

    expect(errors, `console/page errors while navigating Guardian pages: ${errors.join('\n')}`).toEqual([]);
  });

  test('duplicateEntry copies a Guardian schedule row through the module global bridge', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Duplicate Test Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/a1'));

    await page.evaluate(() => {
      const d = (window as any).D;
      d.scheduleA1 = [{
        propertyDescription: 'Homestead',
        streetAddress: '123 Main St',
        cityStateZip: 'Clearwater, FL 33755',
        notes: '',
        isPersonalResidence: true,
        isIncomeProperty: false,
        fullAssetValue: 100000,
        wardPercent: 50,
      }];
      (window as any).duplicateEntry('a1', 0);
    });

    const rows = await page.evaluate(() => (window as any).D.scheduleA1);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(rows[0]);
  });

  test('an incomplete filing is blocked from export with a clear error', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Incomplete Guardian Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/print'));

    let alertMessage = '';
    page.once('dialog', (d) => { alertMessage = d.message(); d.accept(); });
    await page.evaluate(() => (window as any).doSavePdf());
    await page.waitForTimeout(500);

    expect(alertMessage).toContain('Cannot export');
  });

  test('a fully completed filing exports a real PDF through legacy print/PDF code', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Complete Guardian PDF Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.evaluate(() => (window as any).doSavePdf());
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const bytes = Buffer.concat(chunks);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  test('repeated entry/exit does not race post-render binding or leave stale mounts', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Cycle Ward', 'guardian');
    await createWard(page, 'Annual Cycle Ward', 'annual');

    // @ts-expect-error - guardianData is a page-global from legacy-app.js, not declared in this file
    const wards = await page.evaluate(() => guardianData.wards.map((w: any) => ({ id: w.wardId, type: w.inventoryType })));
    const guardianId = wards.find((w: any) => w.type === 'guardian').id;
    const annualId = wards.find((w: any) => w.type === 'annual').id;

    await page.evaluate((id) => (window as any).switchWard(id), guardianId);
    await page.evaluate(() => (window as any).navigate('/b2'));
    await page.evaluate(() => (window as any).addEntry('b2'));
    // A row that's still exactly what +Add left it as gets pruned by
    // pruneBlankScheduleEntries() the moment navigate() actually leaves the
    // page (see legacy-app.js) -- deliberate, so an untouched +Add row
    // doesn't linger as a false "incomplete" warning or a blank PDF line.
    // Fill it in before the first switch so the cycle below is testing
    // real row survival, not accidentally relying on pruning not having
    // run yet.
    await page.fill('input[data-bind="scheduleB2.0.description"]', 'Seed row');
    // This field auto-title-cases as a "name"-type data-bind input.
    await expect(page.locator('input[data-bind="scheduleB2.0.description"]')).toHaveValue('Seed Row');

    for (let i = 0; i < 15; i++) {
      await page.evaluate((id) => (window as any).switchWard(id), guardianId);
      await page.evaluate((r) => (window as any).navigate(r), '/b2');
      await page.fill('input[data-bind="scheduleB2.0.description"]', `Cycle ${i}`);
      await expect(page.locator('input[data-bind="scheduleB2.0.description"]')).toHaveValue(`Cycle ${i}`);
      await page.evaluate((id) => (window as any).switchWard(id), annualId);
    }

    const mainContentCount = await page.locator('#main-content').count();
    expect(mainContentCount).toBe(1);
    await expect(page.locator('#main-content')).not.toBeEmpty();

    expect(errors, `console/page errors during repeated entry/exit: ${errors.join('\n')}`).toEqual([]);
  });
});
