import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, acceptDynDialog, reopenFilingWithStoredShape } from './support/target';

// Milestone 74O (with 73O part 1): what the ward's other filings already
// record, offered where the filer needs it -- a button, a note, "Last plan:" --
// and never written into an answer the filer didn't give (Milestone 73B).
// "The ward's other filings" are the case's: these filings share a Case #.
//
// Each test drives the real page: the button is clicked, the notes are read
// from what is drawn.

const CASE = '26-0042-GD';
const t = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing);
const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const activeId = async (page: Page) => (await t(page)).wardId as string;
const patch = (page: Page, values: Record<string, unknown>) => page.evaluate(async (v) => {
  const x = (window as any).GuardianForms.testing;
  x.patchFiling(v); // setup (D9)
  await x.save.flush();
}, values);

/** The case's Initial Inventory: its Cover names a guardian and an attorney; C-1 and C-4 list income and a trust. */
async function inventory(page: Page) {
  await createWard(page, 'Hint Ward', 'guardian');
  await patch(page, {
    caseNumber: CASE,
    guardianName: 'Pat Guardian',
    attorneyForGuardian: 'Robin Counsel',
    scheduleC1: [{ payerName: 'Social Security Administration' }],
    scheduleC4: [{ trustName: 'Pemberton Family Revocable Trust' }],
  });
  return activeId(page);
}

test.describe('74O: carried forward from the ward\'s other filings', () => {
  test('Inventory D-1 and D-2: "Use the Cover\'s name" fills the empty name box, and goes once it holds a name', async ({ page }) => {
    await freshStartNoPassword(page);
    await inventory(page);

    await navigate(page, '/d1');
    const guardianButton = page.getByRole('button', { name: "Use the Cover's name: Pat Guardian" });
    await expect(guardianButton).toBeVisible();
    await guardianButton.click();
    await expect(page.locator('[data-bind="guardians.0.name"]')).toHaveValue('Pat Guardian');
    await expect(guardianButton).toHaveCount(0);
    expect((await t(page)).guardians[0].name).toBe('Pat Guardian');

    await navigate(page, '/d2');
    const attorneyButton = page.getByRole('button', { name: "Use the Cover's name: Robin Counsel" });
    await attorneyButton.click();
    await expect(page.locator('[data-bind="attorney.name"]')).toHaveValue('Robin Counsel');
    await expect(attorneyButton).toHaveCount(0);
  });

  test('Initial Plan Question 7: a note lists the Inventory\'s income (C-1) and trusts (C-4); no answer is filled', async ({ page }) => {
    await freshStartNoPassword(page);
    await inventory(page);
    await createWard(page, 'Hint Ward', 'planInitial');
    await patch(page, { caseNumber: CASE });

    await navigate(page, '/p4');
    await expect(page.locator('[data-carry-hint="benefits"]'))
      .toHaveText('The Initial Inventory lists: Social Security Administration (C-1); Pemberton Family Revocable Trust (C-4).');
    const plan = await t(page);
    expect([plan.q7SocialSecurity, plan.q7Trusts], 'no answer the filer didn\'t give').toEqual(['', '']);
  });

  test('Annual Plan: the 3G note, "Last plan:" beside an activity, the accounting\'s Part XI beside Question 11', async ({ page }) => {
    await freshStartNoPassword(page);
    await inventory(page);
    await createWard(page, 'Hint Ward', 'annual');
    await patch(page, {
      caseNumber: CASE, periodFrom: '2025-01-01', periodTo: '2025-12-31',
      remuneration: [{ guardian: 'Pat Guardian', type: 'Guardian fee', description: '', amount: 1200 }],
    });
    await createWard(page, 'Hint Ward', 'planInitial');
    await patch(page, { caseNumber: CASE, 'adls.lightHousekeeping': 'Ward needs some assistance' });
    await createWard(page, 'Hint Ward', 'planAnnual');
    await patch(page, { caseNumber: CASE });

    await navigate(page, '/p4');
    await expect(page.locator('[data-carry-hint="benefits"]')).toContainText('Social Security Administration (C-1)');

    await navigate(page, '/p7');
    await expect(page.locator('[data-last-plan="lightHousekeeping"]')).toHaveText('Last plan: Ward needs some assistance');
    await expect(page.locator('[data-last-plan="eating"]'), 'an activity the last plan did not rate shows nothing').toHaveCount(0);
    await expect(page.locator('select[data-form-path="adls.lightHousekeeping"]'), 'never filled in').toHaveValue('');

    await navigate(page, '/p10');
    const reference = page.locator('[data-carry-hint="remuneration"]');
    await expect(reference).toContainText('Part XI');
    await expect(reference.locator('li')).toHaveText(['Pat Guardian — Guardian fee — $1,200.00']);
    const plan = await t(page);
    expect([plan.q11NoRemuneration, plan.q11ReceivedName, plan.q11Amount], 'reference only: nothing answered').toEqual([false, '', '']);
  });

  test('an Annual Plan made from the Initial Plan arrives with where the ward lives', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Residence Ward', 'planInitial');
    await patch(page, {
      wardLiving: 'In a facility (Skilled Nursing, Assisted Living, etc.)',
      residenceAddress: '14 Palm Court', residenceCityStateZip: 'Clearwater, FL 33755', residencePhone: '727-555-0101',
      mailingAddress: 'PO Box 12', mailingCityStateZip: 'Clearwater, FL 33757',
    });
    const sourceId = await activeId(page);
    await page.evaluate((id) => {
      (window as any).__pgConvert = (window as any).GuardianForms.testing.convertFiling.convert(id, 'planAnnual')
        .then(() => (window as any).GuardianForms.testing.snapshot().filing);
    }, sourceId);
    await acceptDynDialog(page);
    const plan = await page.evaluate(() => (window as any).__pgConvert);
    expect(plan.inventoryType).toBe('planAnnual');
    expect({
      wardLiving: plan.wardLiving, residenceAddress: plan.residenceAddress, residenceCityStateZip: plan.residenceCityStateZip,
      residencePhone: plan.residencePhone, mailingAddress: plan.mailingAddress, mailingCityStateZip: plan.mailingCityStateZip,
    }).toEqual({
      wardLiving: 'In a facility (skilled nursing, assisted living, etc.)',
      residenceAddress: '14 Palm Court', residenceCityStateZip: 'Clearwater, FL 33755', residencePhone: '727-555-0101',
      mailingAddress: 'PO Box 12', mailingCityStateZip: 'Clearwater, FL 33757',
    });
    await navigate(page, '/');
    await expect(page.getByLabel('In a facility (skilled nursing, assisted living, etc.)')).toBeChecked();
  });
});

test.describe('73O part 1: the Initial Plan keeps one attorney name', () => {
  test('a plan naming two different attorneys asks which to keep; the choice is kept in the one field', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Attorney Ward', 'planInitial');
    await reopenFilingWithStoredShape(page, { attorneyName: 'Ana Ruiz', attorney_name: 'Robert T. Nguyen' });
    await navigate(page, '/');

    const dialog = page.locator('.modal-overlay.show');
    await expect(dialog.getByRole('heading', { name: 'Which attorney?' })).toBeVisible();
    await dialog.getByLabel('Ana Ruiz (the cover)').check();
    await dialog.getByRole('button', { name: 'Keep this name' }).click();
    await expect(dialog).toHaveCount(0);

    const plan = await t(page);
    expect(plan.attorney_name).toBe('Ana Ruiz');
    expect('attorneyName' in plan).toBe(false);
    await expect(page.locator('[data-form-path="attorney_name"]').first()).toHaveValue('Ana Ruiz');
  });

  test('a plan whose cover alone named the attorney opens with it in the one field, asking nothing', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Attorney Ward', 'planInitial');
    const plan = await reopenFilingWithStoredShape(page, { attorneyName: 'Ana Ruiz', attorney_name: '' });
    expect(plan.attorney_name).toBe('Ana Ruiz');
    expect('attorneyName' in plan).toBe(false);
    await navigate(page, '/');
    await expect(page.locator('.modal-overlay.show')).toHaveCount(0);
  });
});
