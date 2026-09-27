import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';
import { extractXlsx } from './support/xlsx-extract';
import { readAll } from './support/stream';

// Schedule B-4 gives every bank account its own block of check-register pages,
// with the bank name and account number printed at the top of the block. The
// court's own workbook held four; a guardianship with more had no way to file
// its disbursements at all. Alan, planning and compliance officer for the
// Clerk of the Circuit Court, Pinellas County, authorised extending the form's
// pattern to twelve on 2026-09-19.
//
// What this has to get right is attribution. An account's disbursements must
// land inside that account's block, under that account's header -- put them
// anywhere else and the filing tells the court money left an account it did
// not leave. So this exercises five accounts end to end: each one's rows land
// on its own block's pages, each block's header names the right bank, and the
// whole thing reads back into the app with every disbursement still attached
// to the same account it went out on.
//
// Account ids are regenerated on import (they are opaque and per-file), so the
// round trip is checked by resolving each row's id back to its bank name.

const FIRST_PAGE_OF_BLOCK = [2, 8, 12, 16, 20];

const ACCOUNTS = [
  { id: 'acct-1', bankName: 'Bay Bank', accountNumber: '10001111' },
  { id: 'acct-2', bankName: 'Gulf Credit Union', accountNumber: '20002222' },
  { id: 'acct-3', bankName: 'Suncoast Savings', accountNumber: '30003333' },
  { id: 'acct-4', bankName: 'Pinellas Trust', accountNumber: '40004444' },
  { id: 'acct-5', bankName: 'Tampa Federal', accountNumber: '50005555' },
];

/** Two disbursements per account, each payee naming its own bank. */
const DISBURSEMENTS = ACCOUNTS.flatMap((a, i) => [0, 1].map((n) => ({
  bankAccountId: a.id,
  checkNo: String(2000 + i * 10 + n),
  datePaid: '2026-04-0' + (n + 1),
  category: 'Utilities',
  payee: `${a.bankName} payee ${n + 1}`,
  amount: String(100 + i * 10 + n),
})));

async function exportWithAccounts(page: import('@playwright/test').Page, accounts: unknown[], rows: unknown[]) {
  await freshStartNoPassword(page);
  await createWard(page, 'Multi Account Ward', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(({ accts, disb }) => {
    const d = (window as any).GuardianForms.testing.snapshot().filing;
    d.schB4Accounts = accts;
    d.schB4 = disb;
    (window as any).GuardianForms.testing.replaceFiling(d);
  }, { accts: accounts, disb: rows });
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
  const excel = page.locator('[data-annual-action="save-excel"]');
  await expect(excel).toBeEnabled({ timeout: 20_000 });
  const download = page.waitForEvent('download', { timeout: 40_000 });
  await excel.click();
  const bytes = await readAll(await (await download).createReadStream());
  const file = path.join(os.tmpdir(), `pg-b4-multi-${Date.now()}.xlsx`);
  fs.writeFileSync(file, bytes);
  return { bytes, file };
}

test.describe('Schedule B-4 with five bank accounts', () => {
  test('each account is written into its own block, under its own header', async ({ page }) => {
    test.setTimeout(240_000);
    const { bytes } = await exportWithAccounts(page, ACCOUNTS, DISBURSEMENTS);
    const info = await extractXlsx(bytes);

    ACCOUNTS.forEach((account, i) => {
      const sheet = `SCH B-4 OTHER DISB p${FIRST_PAGE_OF_BLOCK[i]}`;
      expect(info.sheetNames, `${account.bankName} should occupy ${sheet}`).toContain(sheet);
      // B6 is the BANK: label with its value in the merged D6:F6; G6 is
      // ACCOUNT NUMBER #: with its value in H6:I6.
      expect(info.getCell(sheet, 'D6'), `${sheet} bank name`).toBe(account.bankName);
      expect(info.getCell(sheet, 'H6'), `${sheet} account number`).toBe(account.accountNumber);

      // And this account's own disbursements, nobody else's.
      const cells = Object.values(info.getSheetCells(sheet)).join('');
      expect(cells, `${sheet} is missing its own rows`).toContain(`${account.bankName} payee 1`);
      for (const other of ACCOUNTS) {
        if (other.id === account.id) continue;
        expect(cells, `${sheet} carries ${other.bankName}'s disbursements`)
          .not.toContain(`${other.bankName} payee`);
      }
    });

    // Blocks 6-12 went unused, so their pages should not be in the file.
    for (const page6plus of [24, 28, 32, 36, 40, 44, 48]) {
      expect(info.sheetNames, `unused block page p${page6plus} should be pruned`)
        .not.toContain(`SCH B-4 OTHER DISB p${page6plus}`);
    }
  });

  test('all five accounts and every assignment survive a round trip', async ({ page }) => {
    test.setTimeout(240_000);
    const { file } = await exportWithAccounts(page, ACCOUNTS, DISBURSEMENTS);

    await freshStartNoPassword(page);
    await createWard(page, 'Multi Account Import', 'annual');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
    await page.waitForFunction(
      () => ((window as any).GuardianForms.testing.snapshot().filing?.schB4 || []).length > 0,
      undefined,
      { timeout: 20_000 },
    );

    const back = await page.evaluate(() => {
      const d = (window as any).GuardianForms.testing.snapshot().filing;
      const byId = new Map((d.schB4Accounts || []).map((a: any) => [a.id, a]));
      return {
        accounts: (d.schB4Accounts || []).map((a: any) => ({ bankName: a.bankName, accountNumber: a.accountNumber })),
        rows: (d.schB4 || []).map((r: any) => ({
          payee: r.payee,
          bank: (byId.get(r.bankAccountId) as any)?.bankName ?? null,
        })),
        ids: (d.schB4Accounts || []).map((a: any) => a.id),
      };
    });

    expect(errors, `page errors during import: ${errors.join('\n')}`).toEqual([]);
    expect(back.accounts, 'all five accounts should return, in block order').toEqual(
      ACCOUNTS.map((a) => ({ bankName: a.bankName, accountNumber: a.accountNumber })),
    );
    expect(new Set(back.ids).size, 'account ids must be distinct').toBe(5);
    expect(back.ids.every((id: string) => id && !/^\d+$/.test(id)), 'ids must be opaque, not indices').toBe(true);

    // Every disbursement still belongs to the account it left on. The payee
    // text names its own bank, so a mis-attribution is visible here.
    // Case-insensitive: the importer title-cases free text through
    // capitalizeImportedFields(), so "payee 1" comes back "Payee 1".
    expect(back.rows).toHaveLength(DISBURSEMENTS.length);
    for (const row of back.rows) {
      expect(row.bank, `"${row.payee}" came back attributed to ${row.bank}`).toBe(
        String(row.payee).replace(/ payee \d+$/i, ''),
      );
    }
  });

  test('a thirteenth account withholds the workbook and names it', async ({ page }) => {
    test.setTimeout(240_000);
    const thirteen = Array.from({ length: 13 }, (_, i) => ({
      id: `acct-${i}`, bankName: `Bank ${i + 1}`, accountNumber: `900000${i}`,
    }));
    const rows = thirteen.map((a, i) => ({
      bankAccountId: a.id, checkNo: String(3000 + i), datePaid: '2026-05-01',
      category: 'Utilities', payee: `${a.bankName} payee`, amount: '25.00',
    }));

    await freshStartNoPassword(page);
    await createWard(page, 'Too Many Accounts Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(({ accts, disb }) => {
      const d = (window as any).GuardianForms.testing.snapshot().filing;
      d.schB4Accounts = accts;
      d.schB4 = disb;
      (window as any).GuardianForms.testing.replaceFiling(d);
    }, { accts: thirteen, disb: rows });
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

    // No download, and the filer is told which accounts will not fit rather
    // than handed a workbook that silently omits them.
    let downloaded = false;
    page.on('download', () => { downloaded = true; });
    const message = await new Promise<string>(async (resolve) => {
      page.once('dialog', (d) => { const m = d.message(); d.accept(); resolve(m); });
      await page.locator('[data-annual-action="save-excel"]').click();
      // The app uses its own modal, not a native dialog, so fall back to it.
      const modal = page.locator('.modal-overlay.show, #dynDialog');
      await modal.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
      resolve((await modal.innerText().catch(() => '')) || '');
    });

    expect(downloaded, 'a workbook must not be produced for 13 accounts').toBe(false);
    expect(message).toContain('13 bank accounts');
    expect(message).toContain('Bank 13');
  });
});
