import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard, fillMinimalValidAnnualWard } from './support/target';
import { extractPdfTextRuns, type PdfTextRun } from './support/pdf-extract';

// Milestone 73H (decision 73H-1): a negative amount prints ($1,234,567.89) on
// every PDF -- one character wider than the "$-1,234,567.89" and
// "-$1,234,567.89" it replaced. The design asks that the narrowest money
// columns be checked for that character: Schedule E's two amount columns on
// the Annual family, and the Inventory's schedule tables. The engine shrinks an
// unbreakable figure to fit its column, down to a 6pt floor; below that it
// would run into the next column. So each figure must print as one run, whole,
// overlapping no other text on its line. Reads the generated PDF, not the
// model, because the fit is a fact about the engine's layout.

const WIDE = -1234567.89;
const PRINTED = '($1,234,567.89)';

/** Every run on the same line as `run` (same page, within 2pt) whose span crosses it. */
function overlaps(runs: PdfTextRun[], run: PdfTextRun) {
  return runs.filter((o) => o !== run && o.page === run.page && Math.abs(o.y - run.y) < 2 && o.text.trim()
    && o.x < run.x + run.width - 0.5 && o.x + o.width > run.x + 0.5);
}

function checkFigures(runs: PdfTextRun[], minimum: number, where: string) {
  const figures = runs.filter((r) => r.text.trim() === PRINTED);
  expect(figures.length, `${where}: the figure prints whole, in parentheses, at least ${minimum} times`).toBeGreaterThanOrEqual(minimum);
  for (const figure of figures) {
    expect(overlaps(runs, figure).map((o) => o.text), `${where}: page ${figure.page} at x ${figure.x.toFixed(1)} overlaps its neighbours`).toEqual([]);
  }
  expect(runs.some((r) => /\$-1,234,567\.89|-\$1,234,567\.89/.test(r.text)), `${where}: no figure prints in the old style`).toBe(false);
}

async function pdfRuns(page: Page, kind: 'guardianPdf' | 'annualPdf') {
  const pdf = await page.evaluate(async (k) => {
    const t = (window as any).GuardianForms.testing;
    const filing = t.snapshot().filing;
    if (k === 'guardianPdf') {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await t.generateOutput.guardianPdf();
      return (await generateVerifiedInventoryPdf(buildVerifiedInventoryModel(filing, { printDate: '2026-10-08' }))).output();
    }
    const { buildAnnualAccountingModel, generateCourtFormPdf } = await t.generateOutput.annualPdf();
    return (await generateCourtFormPdf(buildAnnualAccountingModel(filing, { signatureStyle: 'typed', printDate: '2026-10-08' }))).output();
  }, kind);
  return extractPdfTextRuns(pdf);
}

test('Annual: Schedule E\'s narrow amount columns hold ($1,234,567.89) whole', async ({ page }) => {
  test.setTimeout(150_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Narrow Column Annual', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate((v) => (window as any).GuardianForms.testing.patchFiling({
    schE: [
      { bankName: 'First Bank checking 1234', transferInDate: '2026-02-01', transferInAmt: v, transferOutDate: '2026-02-01', transferOutAmt: v },
      { bankName: 'Second Bank savings 5678', transferInDate: '2026-03-01', transferInAmt: v, transferOutDate: '2026-03-01', transferOutAmt: v },
    ],
  }), WIDE);
  // Four row cells (the two totals print as one "in / out" cell).
  checkFigures(await pdfRuns(page, 'annualPdf'), 4, 'Annual Schedule E');
});

test('Inventory: every schedule table\'s amount columns hold ($1,234,567.89) whole', async ({ page }) => {
  test.setTimeout(150_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Narrow Column Inventory', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await page.evaluate((v) => {
    const t = (window as any).GuardianForms.testing;
    const addr = { streetAddress: '1 Main St', cityStateZip: 'Clearwater, FL 33755' };
    t.patchFiling({
      scheduleNoItems: {},
      scheduleA1: [{ propertyDescription: 'Home', ...addr, residence: 'Yes', income: 'No', fullAssetValue: v, wardPercent: 100 }],
      scheduleA2: [{ lenderName: 'Lender', lenderAddress: '1 Bank St', lenderCityStateZip: 'Tampa, FL 33601', liabilityType: 'Mortgage', fullDebtBalance: v, wardPercent: 100 }],
      scheduleB1: [{ institutionName: 'Bank', restricted: 'No', accountType: 'Checking', accountNumber: '1234', ...addr, fullAssetAmount: v, wardPercent: 100 }],
      scheduleB2: [{ description: 'Ring', ...addr, valuationMethod: 'Appraisal', fullAssetValue: v, wardPercent: 100, inSafeDepositBox: 'No' }],
      scheduleB3: [{ description: 'Fund', ...addr, restricted: 'No', fullAssetValue: v, wardPercent: 100, inSafeDepositBox: 'No' }],
      scheduleB4: [{ lenderName: 'Card', lenderAddress: '1 Card Way', liabilityType: 'Credit Card', fullLiabilityBalance: v, wardPercent: 100 }],
      scheduleC1: [{ payerName: 'SSA', payerAddress: '1 SSA Way', payerCityStateZip: 'Baltimore, MD 21235', typeOfIncome: 'Retirement', frequencyOfPayment: 'Monthly', paymentBasis: 'Monthly', annualIncomeAmount: v, wardPercent: 100 }],
      scheduleC4: [{ trustName: 'Trust', trusteeName: 'Trustee', trusteeAddress: '1 Trust Way', trusteeCityStateZip: 'Tampa, FL 33601', dateCreated: '2020-01-01', trustType: 'Pooled', trustAmount: v, wardPercent: 100 }],
      scheduleC5: [{ assetDescription: 'Joint account', ownerName: 'Owner', ownerAddress: '1 Main St', ownerCityStateZip: 'Clearwater, FL 33755', relationshipToWard: 'Sibling', totalAssetValue: v, jointOwnerPercent: 50 }],
    });
  }, WIDE);
  // Each schedule prints the full figure and the ward's 100% share of it at
  // least once; the count is a floor, not the layout.
  checkFigures(await pdfRuns(page, 'guardianPdf'), 9, 'Inventory schedules');
});
