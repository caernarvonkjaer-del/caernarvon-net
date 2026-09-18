import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';
import { dismissScheduleDocPrompt } from './support/target';

// Milestone 43B: replaces tests/unit/guardian-inventory-yes-no-radio.spec.js's
// "Schedule A-1, B-1, B-2, B-3 use yesNoRadioHTML for binary questions" test,
// which only grepped source text for the yesNoRadioHTML(...) call sites --
// it would pass even if the rendered fieldset were missing, mislabeled, or
// wired to the wrong state path, since it never rendered anything or read
// window.D back. pageScheduleA1()/B1()/B2()/B3() aren't exported from
// src/features/guardian-inventory/index.js (no ES-module path to call them
// directly), so real coverage requires a browser. This clicks each rendered
// radio and confirms the actual state write lands at the exact path the
// source claims, closing that gap for real.
test.describe('Guardian Inventory tri-state radios are correctly wired to their state paths', () => {
  test('Amended Form, Schedule A-1/B-1/B-2/B-3/D-3 radios write to their declared data-form-path on click', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Radio Wiring Ward', 'guardian');

    const fields: Array<{ route: string; schedule: string | null; path: string; label: string }> = [
      { route: '/', schedule: null, path: 'amendedForm', label: 'Amended Form?' },
      { route: '/a1', schedule: 'a1', path: 'scheduleA1.0.residence', label: 'Personal Residence?' },
      { route: '/a1', schedule: null, path: 'scheduleA1.0.income', label: 'Income Property?' },
      { route: '/b1', schedule: 'b1', path: 'scheduleB1.0.restricted', label: 'Restricted?' },
      { route: '/b2', schedule: 'b2', path: 'scheduleB2.0.inSafeDepositBox', label: 'In Safe Deposit Box?' },
      { route: '/b3', schedule: 'b3', path: 'scheduleB3.0.restricted', label: 'Restricted?' },
      { route: '/b3', schedule: null, path: 'scheduleB3.0.inSafeDepositBox', label: 'In Safe Deposit Box?' },
      { route: '/d3', schedule: null, path: 'hasSafeDepositBox', label: 'Does the ward have a safe deposit box' },
      { route: '/d3', schedule: null, path: 'safeDepositBoxFiled', label: 'Safe Deposit Box Inventory Filed with Court?' },
    ];

    let currentRoute = '';
    for (const f of fields) {
      if (f.route !== currentRoute) {
        await page.evaluate((route) => (window as any).navigate(route), f.route);
        currentRoute = f.route;
      }
      if (f.schedule) {
        await page.evaluate((schedule) => (window as any).addEntry(schedule), f.schedule);
        await dismissScheduleDocPrompt(page); // Milestone 57C-R advisory modal
      }

      const fieldset = page.locator(`fieldset[data-yes-no-group="${f.path}"]`);
      await expect(fieldset).toBeVisible();
      await expect(fieldset.locator('legend')).toContainText(f.label);
      await expect(fieldset.locator('input[type="radio"]:checked')).toHaveCount(0);

      await fieldset.locator('input[type="radio"][value="Yes"]').check();
      const written = await page.evaluate((path) => {
        return path.split('.').reduce((obj: any, key: string) => obj?.[key], (window as any).D);
      }, f.path);
      expect(written, `${f.path} did not write "Yes" after checking its Yes radio`).toBe('Yes');
    }
  });

  test('D-3 keeps the filed answer while hidden by an explicit No and restores it on Yes', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Safe Deposit Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/d3'));

    const parent = page.locator('fieldset[data-yes-no-group="hasSafeDepositBox"]');
    await parent.locator('input[value="Yes"]').check();
    const child = page.locator('fieldset[data-yes-no-group="safeDepositBoxFiled"]');
    await expect(child).toBeVisible();
    await child.locator('input[value="Yes"]').check();

    await parent.locator('input[value="No"]').check();
    await expect(child).toBeHidden();
    expect(await page.evaluate(() => (window as any).D.safeDepositBoxFiled)).toBe('Yes');

    await parent.locator('input[value="Yes"]').check();
    await expect(child).toBeVisible();
    await expect(child.locator('input[value="Yes"]')).toBeChecked();
  });
});
