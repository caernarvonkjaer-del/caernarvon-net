import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createSimplifiedWard, dismissScheduleDocPrompt } from './support/target';

// Found 2026-10-10 building Milestone 75D, fixed at the requester's named
// approval: on the Simplified's Part II, Lines 4, 7 and 8 lagged one edit
// behind -- type $100 as the Starting Balance and Line 8 still said $0.00;
// type $5 of interest next and it said $100.00. The page's own refresh ran
// before the app recorded the figure. Each total now follows as it's typed.

test("the Simplified's Part II totals follow each figure as it's typed", async ({ page }) => {
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Part II Totals');
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p2'));
  await dismissScheduleDocPrompt(page);
  const line = (n: number) => page.locator(`#line${n}`);

  await page.locator('#startingBalance').fill('100');
  await expect(line(8), 'Line 8 follows the Starting Balance').toHaveText('$100.00');

  await page.locator('#interestIncome').fill('5');
  await expect(line(4), 'Total Income').toHaveText('$5.00');
  await expect(line(8)).toHaveText('$105.00');

  await page.locator('#depositsSettlement').fill('20');
  await expect(line(4)).toHaveText('$25.00');
  await expect(line(8)).toHaveText('$125.00');

  await page.locator('#serviceCharges').fill('3');
  await page.locator('#federalIncomeTax').fill('2');
  await expect(line(7), 'Total Disbursements').toHaveText('$5.00');
  await expect(line(8), '100 + 25 - 5').toHaveText('$120.00');

  // And after leaving the last box, nothing reverts.
  await page.locator('#federalIncomeTax').blur();
  await expect(line(8)).toHaveText('$120.00');
});
