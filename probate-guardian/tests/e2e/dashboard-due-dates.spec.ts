import { expect, test } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 73I, on the dashboard itself: a Final Accounting has no due date
// the app can count, so its row says when it is due (F.S. 744.527(1),
// 744.511) where it read "No deadline", and is never overdue; a due date on a
// weekend or legal holiday keeps its date and carries a note to check whether
// the next business day applies (Rule 2.514; decision 73I-N1).

test('a Final Accounting says when it is due; a due date on a Saturday carries the note', async ({ page }) => {
  await freshStartNoPassword(page);
  // One filing per step, as the other dashboard specs add them: each opens its
  // form before the next.
  for (const [name, type] of [['Final Due Ward', 'finalAccounting'], ['Saturday Due Ward', 'annual']]) {
    await page.evaluate(([wardName, inventoryType]) => (window as any).GuardianForms.testing.createFiling.add(wardName, inventoryType), [name, type]);
  }
  await page.evaluate(() => {
    const t = (window as any).GuardianForms.testing;
    const ids = t.snapshot().caseFile.wards.map((w: any) => w.wardId);
    t.patchFiling({ periodTo: '2025-06-30' }, ids[0]);
    // Due April 1, 2028 -- a Saturday.
    t.patchFiling({ periodTo: '2027-12-31' }, ids[1]);
    t.navigate('/dashboard');
  });
  const main = page.locator('#main-content');
  await main.locator('[data-dashboard-bound="true"]').waitFor();
  const row = (name: string) => main.locator('.dashboard-triage-row', { hasText: name });

  await expect(row('Final Due Ward').locator('[data-deadline-basis]')).toHaveText('Due promptly; within 45 days after being served with letters of administration or curatorship if the ward has died; within 20 days after removal (F.S. 744.527(1), 744.511)');
  await expect(row('Final Due Ward')).not.toContainText('overdue');

  await expect(row('Saturday Due Ward')).toContainText('Apr 1, 2028');
  await expect(row('Saturday Due Ward').locator('[data-deadline-note]')).toHaveText('Falls on a weekend or legal holiday: check whether the next business day applies (Rule 2.514).');
});
