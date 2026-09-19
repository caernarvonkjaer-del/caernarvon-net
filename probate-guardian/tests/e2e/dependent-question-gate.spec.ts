import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard, fillMinimalValidAnnualWard } from './support/target';

// Milestone 57A / Decision 6, at the export gate.
//
// "Has the surety bond been waived?" (Initial Inventory) and "does a
// restricted depository apply?" (Annual family) used to be inferred from their
// dates alone, which cannot separate "yes, date not entered yet" from "no". A
// blank date meant both, and the filing went out either way.
//
// The asymmetry is the whole point, so it is what these assert:
//
//   unanswered    -> an acknowledgement. The filer is told the filing reaches
//                    the clerk without stating it, and may proceed.
//   Yes + blank   -> a blocker. A half-finished answer is not the same as an
//                    unstated one, and cannot be acknowledged away.
//   No            -> complete; there is no date to give.
//
// Neither court form carries the question -- PART V asks only for the order
// date, PART IX only for the receipt date -- so neither answer is written to
// the workbook. That is checked in excel-write-targets.spec.js by the absence
// of any write target for them.

type Page = import('@playwright/test').Page;

/** The issues the export gate would raise right now, with their codes. */
async function gateIssues(page: Page, validator: 'validateGuardian' | 'validateAnnual') {
  return page.evaluate((name) => {
    const fn = (window as any)[name];
    if (typeof fn !== 'function') return { error: `${name} is not loaded` };
    const issues = fn() || [];
    return {
      codes: issues.map((i: any) => i?.code ?? '(none)'),
      messages: issues.map((i: any) => String(i?.message ?? i)),
      bypassable: issues.map((i: any) => i?.bypassable),
    };
  }, validator);
}

async function setField(page: Page, patch: Record<string, unknown>) {
  await page.evaluate((p) => {
    Object.assign((window as any).D, p);
    (window as any).autoSave();
  }, patch);
  await page.evaluate(() => (window as any).flushPendingSave());
}

test.describe('Initial Inventory: has the surety bond been waived?', () => {
  test.beforeEach(async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Bond Waiver Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).navigate('/d4'));
  });

  test('unanswered asks for an answer, and does not block', async ({ page }) => {
    await setField(page, { bondWaived: '', bondWaivedDate: '' });
    const g = await gateIssues(page, 'validateGuardian');
    const mine = (g.messages as string[]).filter((m) => /waived/i.test(m));
    expect(mine.length, 'the filer should be asked').toBeGreaterThan(0);
    expect(mine.join(' ')).toMatch(/Yes or No/i);
    const idx = (g.messages as string[]).findIndex((m) => /waived/i.test(m));
    expect((g.bypassable as boolean[])[idx], 'unanswered is acknowledgeable').toBe(true);
  });

  test('Yes with no order date blocks and cannot be acknowledged away', async ({ page }) => {
    await setField(page, { bondWaived: 'Yes', bondWaivedDate: '' });
    const g = await gateIssues(page, 'validateGuardian');
    const idx = (g.codes as string[]).indexOf('filing.bond-waiver.incomplete');
    expect(idx, 'the blocking issue should be raised').toBeGreaterThan(-1);
    expect((g.bypassable as boolean[])[idx], 'a half-finished Yes must block').toBe(false);
    expect((g.messages as string[])[idx]).toMatch(/date of the order/i);
  });

  test('No is complete on its own', async ({ page }) => {
    await setField(page, { bondWaived: 'No', bondWaivedDate: '' });
    const g = await gateIssues(page, 'validateGuardian');
    expect((g.codes as string[])).not.toContain('filing.bond-waiver.incomplete');
    expect((g.messages as string[]).filter((m) => /waived/i.test(m))).toEqual([]);
  });

  test('Yes with the order date is complete', async ({ page }) => {
    await setField(page, { bondWaived: 'Yes', bondWaivedDate: '2026-03-03' });
    const g = await gateIssues(page, 'validateGuardian');
    expect((g.codes as string[])).not.toContain('filing.bond-waiver.incomplete');
  });

  // A filing saved before the question existed has the date but no answer.
  test('a legacy filing carrying only the date is complete, not re-asked', async ({ page }) => {
    await setField(page, { bondWaived: '', bondWaivedDate: '2026-03-03' });
    const g = await gateIssues(page, 'validateGuardian');
    expect((g.codes as string[])).not.toContain('filing.bond-waiver.incomplete');
    expect((g.messages as string[]).filter((m) => /waived/i.test(m))).toEqual([]);
  });

  // Toggling away must not destroy what the filer typed.
  test('switching Yes -> No -> Yes keeps the order date', async ({ page }) => {
    await setField(page, { bondWaived: 'Yes', bondWaivedDate: '2026-03-03' });
    await setField(page, { bondWaived: 'No' });
    await setField(page, { bondWaived: 'Yes' });
    const kept = await page.evaluate(() => (window as any).D.bondWaivedDate);
    expect(kept, 'the date must survive the round trip through No').toBe('2026-03-03');
  });
});

test.describe('Annual: does a restricted depository apply?', () => {
  test.beforeEach(async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Restricted Depository Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => (window as any).navigate('/p9'));
  });

  test('unanswered asks for an answer, and does not block', async ({ page }) => {
    await setField(page, { restrictedDepository: '', restrictedDepositoryReceiptDate: '' });
    const g = await gateIssues(page, 'validateAnnual');
    const idx = (g.messages as string[]).findIndex((m) => /restricted depository/i.test(m));
    expect(idx, 'the filer should be asked').toBeGreaterThan(-1);
    expect((g.bypassable as boolean[])[idx], 'unanswered is acknowledgeable').toBe(true);
  });

  test('Yes with no receipt date blocks', async ({ page }) => {
    await setField(page, { restrictedDepository: 'Yes', restrictedDepositoryReceiptDate: '' });
    const g = await gateIssues(page, 'validateAnnual');
    const idx = (g.codes as string[]).indexOf('filing.restricted-depository.incomplete');
    expect(idx, 'the blocking issue should be raised').toBeGreaterThan(-1);
    expect((g.bypassable as boolean[])[idx]).toBe(false);
  });

  test('No is complete, and Yes with the date is complete', async ({ page }) => {
    await setField(page, { restrictedDepository: 'No', restrictedDepositoryReceiptDate: '' });
    let g = await gateIssues(page, 'validateAnnual');
    expect((g.codes as string[])).not.toContain('filing.restricted-depository.incomplete');

    await setField(page, { restrictedDepository: 'Yes', restrictedDepositoryReceiptDate: '2026-02-02' });
    g = await gateIssues(page, 'validateAnnual');
    expect((g.codes as string[])).not.toContain('filing.restricted-depository.incomplete');
  });

  test('a legacy filing carrying only the receipt date is complete', async ({ page }) => {
    await setField(page, { restrictedDepository: '', restrictedDepositoryReceiptDate: '2026-02-02' });
    const g = await gateIssues(page, 'validateAnnual');
    expect((g.codes as string[])).not.toContain('filing.restricted-depository.incomplete');
    expect((g.messages as string[]).filter((m) => /restricted depository/i.test(m))).toEqual([]);
  });

  // The discipline the reverted attempt broke: the sidebar and the export gate
  // must agree about what Part IX still owes.
  // Read from the sidebar's own rendered mark rather than from an internal:
  // applyNavChecks() writes a green check or a red dash into [data-nav="a-p9"],
  // which is exactly what a filer sees.
  test('the sidebar agrees with the export gate about Part IX', async ({ page }) => {
    const partIxMark = async () => {
      await page.evaluate(() => (window as any).updateNavDots?.());
      return page.locator('[data-nav="a-p9"] .nav-check').first().getAttribute('class');
    };

    await setField(page, { restrictedDepository: '', restrictedDepositoryReceiptDate: '' });
    await page.evaluate(() => (window as any).navigate('/p9'));
    expect(await partIxMark(), 'Part IX is incomplete while the question is unanswered')
      .toContain('incomplete');

    await setField(page, { restrictedDepository: 'No' });
    expect(await partIxMark(), 'answering No completes it').toBe('nav-check complete');
  });
});
