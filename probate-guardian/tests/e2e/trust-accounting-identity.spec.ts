import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, acceptDynDialog } from './support/target';

// Milestone 74N (decisions 74N-1 and 74N-3, the requester, 2026-10-06; QA
// report BUG-08): an Annual whose Part VIII lists two trusts created after
// the guardianship began (and one before it). New Filing from Existing, to a
// Trust Accounting, asks which trust; the chosen trust's details fill the new
// filing's "This accounting reports on" block on its Cover. Before, the
// dialog asked nothing and the Cover had no place to say which trust it was.
// The PDF's block is tests/unit/trust-accounting-identity.spec.js's.

const snapshot = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot());

test('New Filing from Existing to a Trust Accounting asks which trust, and the Cover names it', async ({ page }) => {
  test.setTimeout(120_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Trust Ward', 'annual');
  await page.evaluate(() => {
    const t = (window as any).GuardianForms.testing;
    t.patchFiling({ trusts: [ // setup (D9)
      { hasTrust: 'Yes', createdAfterGID: 'No', name: 'Old Family Trust', trustee: 'Uncle', accountNo: '1', dateCreated: '2019-01-01', trustType: '', wardPct: '', wardAmount: '' },
      { hasTrust: '', createdAfterGID: 'Yes', name: 'Pemberton Special Needs Trust', trustee: 'First Trust Co.', accountNo: '5510', dateCreated: '2026-03-01', trustType: '', wardPct: '', wardAmount: '' },
      { hasTrust: '', createdAfterGID: 'Yes', name: 'Gulf Pooled Trust', trustee: 'Gulf Trust Services', accountNo: '7720', dateCreated: '2026-04-15', trustType: '', wardPct: '', wardAmount: '' },
    ] });
    return t.save.flush();
  });
  const sourceId = (await snapshot(page)).filing.wardId;

  await page.evaluate(() => (window as any).GuardianForms.testing.convertFiling.openDialog());
  await page.locator('#convertWardModal.show').waitFor({ state: 'visible' });
  const picker = page.locator('#convert-trust');
  await page.selectOption('#convert-target-type', 'finalAccounting');
  await expect(page.locator('#convert-trust-wrap')).toBeHidden();
  await page.selectOption('#convert-target-type', 'trustAccounting');
  await expect(page.locator('#convert-trust-wrap')).toBeVisible();
  expect(await picker.locator('option').allTextContents()).toEqual(['Pemberton Special Needs Trust', 'Gulf Pooled Trust']);
  await picker.selectOption({ label: 'Gulf Pooled Trust' });
  await page.locator('[data-modal-action="convert-ward"]').click();
  await acceptDynDialog(page);
  await page.waitForFunction((id) => {
    const f = (window as any).GuardianForms.testing.snapshot().filing;
    return f && f.wardId !== id && f.inventoryType === 'trustAccounting';
  }, sourceId);

  const made = (await snapshot(page)).filing;
  expect(made.trustInfo).toEqual({ name: 'Gulf Pooled Trust', trustee: 'Gulf Trust Services', trusteeIsGuardian: '', dateCreated: '2026-04-15', dateFunded: '', accountNo: '7720' });
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  const block = page.locator('#main-content [data-trust-info]');
  await expect(block.getByRole('heading', { name: 'This accounting reports on' })).toBeVisible();
  await expect(block.locator('input[data-annual-path="trustInfo.name"]')).toHaveValue('Gulf Pooled Trust');
  await expect(block.locator('input[data-annual-path="trustInfo.trustee"]')).toHaveValue('Gulf Trust Services');
  await expect(block.locator('input[data-annual-path="trustInfo.dateCreated"]')).toHaveValue('04/15/2026');
});
