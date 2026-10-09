import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, dismissScheduleDocPrompt, fillMinimalValidGuardianWard } from './support/target';

// Milestone 73J part 2, one case per part the design lists as stale: each now
// follows the change the filer just made, on the page, without leaving it.
// Before, each was drawn once on arrival and stayed as it was until the page
// was drawn again. Red-first: every case fails with the source set aside.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const patch = (page: Page, shape: Record<string, unknown>) => page.evaluate((s) => (window as any).GuardianForms.testing.patchFiling(s), shape);

async function type(page: Page, selector: string, text: string) {
  const box = page.locator(selector).first();
  await box.fill(text);
  await box.blur();
}

test.describe('Milestone 73J part 2: page parts that keep up', () => {
  test("Annual B-4: the Category Summary follows an amount typed, and a row's account picker follows the account named and assigned", async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Live B4 Ward', 'annual');
    await patch(page, {
      schB4Accounts: [{ id: 'acct-1', bankName: '', accountNumber: '' }],
      schB4: [{ checkNo: '101', datePaid: '2026-03-01', category: 'Utilities', payee: 'Power Co', amount: '', bankAccountId: '' }],
    });
    await go(page, '/schb4');
    await dismissScheduleDocPrompt(page);

    const utilities = page.locator('[data-live-part="annual-b4-categories"] tr', { hasText: 'Utilities' });
    await expect(utilities).toContainText('—');
    await type(page, '#main-content input[data-annual-path="schB4.0.amount"]', '125');
    await expect(utilities, 'the summary follows the amount').toContainText('$125.00');

    const picker = page.locator('[data-live-part="annual-b4-account"][data-live-key="0"]');
    await expect(picker).toContainText('Assign a bank account');
    await type(page, '#main-content input[data-annual-path="schB4Accounts.0.bankName"]', 'First Bank');
    await expect(picker.locator('option', { hasText: 'First Bank' }), "the picker names the account as it's typed").toHaveCount(1);
    await picker.locator('select').selectOption('acct-1');
    await picker.locator('select').blur();
    await expect(picker, 'assigning the account clears its warning').not.toContainText('Assign a bank account');
  });

  test('the "No attorney is entered" notices go once an attorney is typed: Annual Part V and Inventory D-2', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Live Notice Annual', 'annual');
    await go(page, '/p5');
    await expect(page.locator('#main-content [data-no-attorney-notice]')).toBeVisible();
    await type(page, '#main-content input[data-annual-path="attorney"]', 'Rob Attorney');
    await expect(page.locator('#main-content [data-no-attorney-notice]')).toHaveCount(0);

    await createWard(page, 'Live Notice Inventory', 'guardian');
    await go(page, '/d2');
    await expect(page.locator('#main-content [data-no-attorney-notice]')).toBeVisible();
    await type(page, '#main-content input[data-bind="attorney.name"]', 'Rob Attorney');
    await expect(page.locator('#main-content [data-no-attorney-notice]')).toHaveCount(0);
  });

  test('the cover\'s "Why is this guardian filing without an attorney?" goes once an attorney is typed there: Annual and Inventory', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Live Waiver Annual', 'annual');
    await go(page, '/');
    await expect(page.locator('#main-content [data-attorney-waiver-basis]')).toBeVisible();
    await type(page, '#main-content input[data-annual-path="attorney"]', 'Rob Attorney');
    await expect(page.locator('#main-content [data-attorney-waiver-basis]')).toHaveCount(0);

    await createWard(page, 'Live Waiver Inventory', 'guardian');
    await go(page, '/');
    await expect(page.locator('#main-content [data-attorney-waiver-basis]')).toBeVisible();
    await type(page, '#main-content input[data-bind="attorneyForGuardian"]', 'Rob Attorney');
    await expect(page.locator('#main-content [data-attorney-waiver-basis]')).toHaveCount(0);
  });

  test('the sidebar\'s "Guardian:" line follows Link Person', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Live Sidebar Source', 'annual');
    await go(page, '/p3');
    await type(page, '#main-content input[data-annual-path="guardians.0.name"]', 'Mary J. Smith');
    await page.click('[data-annual-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
    const partyId = String(await page.evaluate(() => (window as any).GuardianForms.testing.field('guardianPartyIds.0')));

    await createWard(page, 'Live Sidebar Ward', 'annual');
    await go(page, '/p3');
    await expect(page.locator('#guardian-name-display')).toHaveText('Guardian: —');
    await page.click('[data-annual-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.selectOption('#pick-party-existing', partyId);
    await page.click('#pickPartyModal [data-modal-action="pick-party"]');
    await expect(page.locator('#guardian-name-display')).toHaveText('Guardian: Mary J. Smith');
  });

  test("the Inventory Summary's D-4 link shows only while D-4 is still to do", async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Live D4 Blank', 'guardian');
    await go(page, '/summary');
    const link = page.locator('#main-content a', { hasText: 'Complete Bond & Surety Info (D-4)' });
    await expect(link).toHaveCount(1);
    await createWard(page, 'Live D4 Done', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await go(page, '/summary');
    await expect(page.locator('#main-content h1')).toBeVisible();
    await expect(link, 'D-4 is complete: no to-do link').toHaveCount(0);
  });

  test("the dashboard's Automatic option says what Automatic would give while an override is chosen", async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Live Status Ward', 'annual');
    await go(page, '/dashboard');
    await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
    const select = page.locator('.dashboard-triage-row').filter({ hasText: 'Live Status Ward' }).locator('[data-dashboard-change="workflow-status"]');
    await select.selectOption('pending-court-review');
    await expect(select.locator('option[value="auto"]'), 'it showed the override').toHaveText('Automatic (Draft)');
  });
});
