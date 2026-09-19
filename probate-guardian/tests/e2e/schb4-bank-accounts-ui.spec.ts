import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard, dismissScheduleDocPrompt } from './support/target';

// The Schedule B-4 bank-account controls. The court's workbook prints each
// account's disbursements in that account's own block of register pages, so
// an account is something the filer creates, and every disbursement has to be
// attributable to one before the workbook can be written.
//
// The behaviour most worth pinning is what deleting an account does. It must
// unassign that account's disbursements and leave them in the schedule -- a
// filer removing a mistyped bank name must not lose the money that was paid
// from it. An unassigned row is caught at export; a deleted row is gone.

async function openSchB4(page: import('@playwright/test').Page) {
  await freshStartNoPassword(page);
  await createWard(page, 'B4 Accounts Ward', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => {
    const d = (window as any).D;
    d.schB4 = [
      { bankAccountId: '', checkNo: '1001', datePaid: '2026-03-04', category: 'Utilities', payee: 'Duke Energy', amount: '184.22' },
      { bankAccountId: '', checkNo: '1002', datePaid: '2026-04-11', category: 'Rent', payee: 'Bayview Apartments', amount: '1250.00' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).navigate('/schb4'));
  // Landing on a populated financial schedule fires Milestone 57C-R's
  // supplemental-documentation prompt, which would sit over these controls.
  await dismissScheduleDocPrompt(page);
  await expect(page.locator('h1', { hasText: 'Schedule B-4' })).toBeVisible();
}

const addAccount = page => page.locator('[data-annual-action="add-b4-account"]');

// Every one of these actions re-renders the page, and landing on a populated
// schedule re-fires 57C-R's prompt -- dismissScheduleDocPrompt() cancels
// rather than accepts, deliberately recording nothing, so it comes back each
// time. Settle it after every click or the next one is intercepted.
async function clickAndSettle(page: import('@playwright/test').Page, selector: string) {
  await page.locator(selector).first().click();
  await dismissScheduleDocPrompt(page);
}
const accountCards = page => page.locator('.entry-card-header', { hasText: 'Bank Account' });
const read = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const d = (window as any).D;
  return {
    accounts: (d.schB4Accounts || []).map((a: any) => ({ id: a.id, bankName: a.bankName })),
    rows: (d.schB4 || []).map((r: any) => ({ checkNo: r.checkNo, bankAccountId: r.bankAccountId })),
  };
});

test.describe('Schedule B-4 bank accounts', () => {
  test('a filing with no accounts shows no per-row picker', async ({ page }) => {
    test.setTimeout(120_000);
    await openSchB4(page);
    // A single-account filing has nothing to choose between, and an empty
    // dropdown on every row would imply an assignment was missing.
    await expect(page.locator('label', { hasText: 'Bank Account' })).toHaveCount(0);
    await expect(addAccount(page)).toBeVisible();
  });

  test('accounts can be added, named, and assigned to a disbursement', async ({ page }) => {
    test.setTimeout(120_000);
    await openSchB4(page);

    await clickAndSettle(page, '[data-annual-action="add-b4-account"]');
    await expect(accountCards(page)).toHaveCount(1);
    await clickAndSettle(page, '[data-annual-action="add-b4-account"]');
    await expect(accountCards(page)).toHaveCount(2);

    // Ids are opaque and distinct -- never the array index, or renaming an
    // account would orphan its disbursements.
    const { accounts } = await read(page);
    expect(accounts).toHaveLength(2);
    expect(new Set(accounts.map(a => a.id)).size).toBe(2);
    for (const a of accounts) expect(a.id, `id ${a.id} looks like an index`).not.toMatch(/^\d+$/);

    await page.evaluate((id) => {
      const d = (window as any).D;
      d.schB4Accounts[0].bankName = 'Bay Bank';
      d.schB4Accounts[1].bankName = 'Gulf Credit Union';
      d.schB4[0].bankAccountId = id;
      (window as any).autoSave();
    }, accounts[0].id);
    await page.evaluate(() => (window as any).navigate('/schb4'));
    await dismissScheduleDocPrompt(page);

    // Once accounts exist the picker appears on every row.
    await expect(page.locator('label', { hasText: 'Bank Account' })).toHaveCount(2);
    const after = await read(page);
    expect(after.rows[0].bankAccountId).toBe(accounts[0].id);
    expect(after.rows[1].bankAccountId, 'the second row is still unassigned').toBe('');
  });

  // The behaviour that protects the filer's data.
  test('removing an account unassigns its disbursements and never deletes them', async ({ page }) => {
    test.setTimeout(120_000);
    await openSchB4(page);
    await clickAndSettle(page, '[data-annual-action="add-b4-account"]');
    await expect(accountCards(page)).toHaveCount(1);
    const { accounts } = await read(page);
    await page.evaluate((id) => {
      const d = (window as any).D;
      d.schB4Accounts[0].bankName = 'Bay Bank';
      d.schB4[0].bankAccountId = id;
      d.schB4[1].bankAccountId = id;
      (window as any).autoSave();
    }, accounts[0].id);
    await page.evaluate(() => (window as any).navigate('/schb4'));
    await dismissScheduleDocPrompt(page);

    // Removing an account with disbursements asks for confirmation first.
    await page.locator('[data-annual-action="remove-b4-account"]').first().click();
    const dialog = page.locator('.modal-overlay.show');
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(dialog).toContainText(/no longer be assigned/i);
    await dialog.getByRole('button', { name: /^(ok|yes|remove|continue)/i }).first().click();
    await dismissScheduleDocPrompt(page);

    await expect.poll(async () => (await read(page)).accounts.length, { timeout: 15_000 }).toBe(0);
    const after = await read(page);
    expect(after.rows, 'both disbursements must still be in the schedule').toHaveLength(2);
    expect(after.rows.map(r => r.checkNo)).toEqual(['1001', '1002']);
    expect(after.rows.every(r => r.bankAccountId === ''), 'rows should be unassigned, not deleted').toBe(true);
  });
});
