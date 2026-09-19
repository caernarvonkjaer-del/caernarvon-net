import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';

// Pruning blank pages out of the exported workbook is only half a contract.
// The app must also be able to read its own export back: a guardian who saves
// an Annual Accounting to Excel, mails it, and opens it again next week has to
// get their filing back, not a blank form.
//
// The risk is specific. The importer looks sheets up by name, and pruning
// removes sheets. Every lookup is guarded with `if (sheet)`, and the importer
// only ever reads p1 pages plus SCH A p2 and B-4 p2 -- exactly what pruning
// keeps -- but a guard is not evidence. This exercises the real path: export a
// filing with data spread across the schedules that have prunable
// continuation pages, feed that exact file back to the importer, and compare.
//
// It also pins the case pruning could plausibly break: SCH A INCOME p2 is kept
// only when income overflows twenty rows, and the importer reads rows 21+ from
// it. Prune it wrongly and those rows come back missing.

type Row = Record<string, string>;

const INCOME = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({
  payer: `Payer ${i + 1}`,
  description: 'Monthly benefit',
  bank: 'Bay Bank',
  accountNo: String(4000 + i),
  amount: String(100 + i),
}));

const DISBURSEMENTS: Row[] = [
  { checkNo: '1001', datePaid: '2026-03-04', category: 'Utilities', payee: 'Duke Energy', amount: '184.22' },
  { checkNo: '1002', datePaid: '2026-04-11', category: 'Rent', payee: 'Bayview Apartments', amount: '1250.00' },
  { checkNo: '1003', datePaid: '2026-05-09', category: 'Medical / Pharmacy', payee: 'Walgreens', amount: '42.60' },
];

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function exportWith(page: import('@playwright/test').Page, incomeRows: number) {
  await freshStartNoPassword(page);
  await createWard(page, 'Round Trip Ward', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(({ income, disb }) => {
    const d = (window as any).D;
    d.schA = income;
    d.schB4 = disb;
    (window as any).autoSave();
  }, { income: INCOME(incomeRows), disb: DISBURSEMENTS });
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  const excel = page.locator('[data-annual-action="save-excel"]');
  await expect(excel).toBeEnabled({ timeout: 20_000 });
  const download = page.waitForEvent('download', { timeout: 40_000 });
  await excel.click();
  const bytes = await readAll(await (await download).createReadStream());
  const file = path.join(os.tmpdir(), `pg-roundtrip-${Date.now()}-${incomeRows}.xlsx`);
  fs.writeFileSync(file, bytes);
  return file;
}

/** Import into a clean ward and read back what landed. */
async function importInto(page: import('@playwright/test').Page, file: string) {
  await freshStartNoPassword(page);
  await createWard(page, 'Import Target Ward', 'annual');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  await page.waitForFunction(
    () => ((window as any).D?.schB4 || []).length > 0,
    undefined,
    { timeout: 20_000 },
  );
  const data = await page.evaluate(() => {
    const d = (window as any).D;
    return {
      schA: (d.schA || []).map((r: any) => ({ payer: r.payer, amount: String(r.amount ?? '') })),
      schB4: (d.schB4 || []).map((r: any) => ({ checkNo: r.checkNo, payee: r.payee, amount: String(r.amount ?? '') })),
      wardName: d.wardName,
      caseNumber: d.caseNumber,
    };
  });
  return { data, errors };
}

test.describe('a pruned export imports back into the app', () => {
  test('a short filing round-trips through its own pruned workbook', async ({ page }) => {
    test.setTimeout(240_000);
    const file = await exportWith(page, 3);
    const { data, errors } = await importInto(page, file);

    expect(errors, `page errors during import: ${errors.join('\n')}`).toEqual([]);
    expect(data.schB4.map((r) => r.checkNo)).toEqual(['1001', '1002', '1003']);
    expect(data.schB4.map((r) => r.payee))
      .toEqual(['Duke Energy', 'Bayview Apartments', 'Walgreens']);
    expect(data.schA.map((r) => r.payer)).toEqual(['Payer 1', 'Payer 2', 'Payer 3']);
    expect(data.wardName, 'the ward name should survive the round trip').toBeTruthy();
  });

  // SCH A INCOME p2 is kept only when income passes twenty rows, and the
  // importer reads rows 21+ from it. If pruning got that wrong the overflow
  // rows would simply be gone -- real financial data lost in a round trip.
  test('income that overflows onto p2 comes back in full', async ({ page }) => {
    test.setTimeout(240_000);
    const file = await exportWith(page, 24);
    const { data, errors } = await importInto(page, file);

    expect(errors, `page errors during import: ${errors.join('\n')}`).toEqual([]);
    expect(data.schA, 'all 24 income rows should return').toHaveLength(24);
    expect(data.schA[0].payer).toBe('Payer 1');
    expect(data.schA[19].payer, 'last row of p1').toBe('Payer 20');
    expect(data.schA[20].payer, 'first row of p2 -- the overflow page').toBe('Payer 21');
    expect(data.schA[23].payer, 'last row of p2').toBe('Payer 24');
  });
});
