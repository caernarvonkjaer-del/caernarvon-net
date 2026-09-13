import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

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
  test('Amended Form, Schedule A-1/B-1/B-2/B-3 radios write to their declared data-form-path on click', async ({ page }) => {
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
    ];

    let currentRoute = '';
    for (const f of fields) {
      if (f.route !== currentRoute) {
        await page.evaluate((route) => (window as any).navigate(route), f.route);
        currentRoute = f.route;
      }
      if (f.schedule) {
        await page.evaluate((schedule) => (window as any).addEntry(schedule), f.schedule);
      }

      const fieldset = page.locator(`fieldset[data-yes-no-group="${f.path}"]`);
      await expect(fieldset).toBeVisible();
      await expect(fieldset.locator('legend')).toContainText(f.label);

      await fieldset.locator('input[type="radio"][value="Yes"]').check();
      const written = await page.evaluate((path) => {
        return path.split('.').reduce((obj: any, key: string) => obj?.[key], (window as any).D);
      }, f.path);
      expect(written, `${f.path} did not write "Yes" after checking its Yes radio`).toBe('Yes');
    }
  });
});
