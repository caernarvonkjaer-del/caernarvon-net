import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';

// Milestone 73E part 1: an import is one transaction
// (src/core/excel/import-transaction.js), with one confirmation
// (src/core/excel/import-confirm.js on dialogs.js's choicesModal()). No
// importer uses it until 73T parts 2-4, so it is reached here through
// GuardianForms.testing.importTransaction, with a draft standing in for what
// a workbook would hold. Those parts test it through the real Import control.

const DIALOG = '.modal-overlay[id^="dyn-dialog-"].show .modal-box';

// A plan with a near-name match whose shared-record question is asked only
// if the filer says it is the same person, as planImport() builds it.
const PLAN = {
  filingName: 'Ward One', filingType: 'trustAccounting', workbookWardName: null, typeDiffers: { filing: 'trustAccounting', source: 'annual' },
  fieldChanges: [{ path: 'guardians' }, { path: 'schA' }],
  people: [],
  conflicts: [
    { id: 'near:guardian:0', kind: 'near-name', person: { label: 'Guardian #1', before: 'Ann Guardian', after: 'Ann B. Guardian', otherFilings: [], differences: [] },
      options: [{ value: 'same', label: 'The same person' }, { value: 'different', label: 'A different person' }] },
    { id: 'shared:guardian:0', kind: 'shared-record', onlyIf: { id: 'near:guardian:0', value: 'same' },
      person: { label: 'Guardian #1', before: 'Ann Guardian', sharedName: 'Ann Guardian', otherFilings: [{ wardName: 'Ward One', type: 'simplified' }], differences: [{ key: 'name', shared: 'Ann Guardian', incoming: 'Ann B. Guardian' }] },
      options: [{ value: 'update', label: 'Update the shared record' }, { value: 'unlink', label: 'This filing only' }] },
  ],
};

function openConfirmation(page: Page) {
  return page.evaluate((plan) => {
    (window as any).__choices = (window as any).GuardianForms.testing.importTransaction.confirm(plan, { sourceName: 'trust.xlsx' });
  }, PLAN);
}
const choices = (page: Page) => page.evaluate(() => (window as any).__choices);

test('the confirmation says what changes and asks each question; Import waits for every answer shown, and a conditional question appears only when it applies', async ({ page }) => {
  await freshStartNoPassword(page);
  await openConfirmation(page);
  const box = page.locator(DIALOG);
  await expect(box).toBeVisible();
  await expect(box).toContainText('Importing trust.xlsx replaces');
  await expect(box).toContainText('this filing stays a Trust Accounting');
  const importButton = box.locator('[data-dyn-action="confirm"]');
  const shared = box.locator('fieldset[data-dyn-question="shared:guardian:0"]');
  await expect(importButton).toBeDisabled();
  await expect(shared).toBeHidden();
  await box.getByLabel('The same person').check();
  await expect(shared).toBeVisible();
  await expect(shared.locator('legend')).toContainText('It is also used by Ward One (Simplified Annual Accounting)');
  await expect(importButton).toBeDisabled();
  await box.getByLabel('Update the shared record').check();
  await expect(importButton).toBeEnabled();
  await importButton.click();
  expect(await choices(page)).toEqual({ 'near:guardian:0': 'same', 'shared:guardian:0': 'update' });
});

test('a different person needs no record answer; Cancel and Escape answer nothing', async ({ page }) => {
  await freshStartNoPassword(page);
  await openConfirmation(page);
  const box = page.locator(DIALOG);
  await box.getByLabel('A different person').check();
  await box.locator('[data-dyn-action="confirm"]').click();
  expect(await choices(page)).toEqual({ 'near:guardian:0': 'different' });

  await openConfirmation(page);
  await page.locator(DIALOG).locator('[data-dyn-action="cancel"]').click();
  expect(await choices(page)).toBe(null);

  await openConfirmation(page);
  await expect(page.locator(DIALOG)).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await choices(page)).toBe(null);
});

test('the whole transaction: Cancel changes nothing and saves nothing; Import replaces, saves once, logs once, and tells the filer after the redraw', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshStartNoPassword(page);
  await createWard(page, 'Transaction Ward', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  const draft = { schA: [{ payer: 'Bank', description: 'Interest', bank: 'Bank', accountNo: '1', amount: 12.5 }] };
  const before = await page.evaluate(() => JSON.stringify((window as any).GuardianForms.testing.snapshot().filing));
  const logBefore = (await page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.auditEntries())).length;

  await page.evaluate(() => { (window as any).__saves = (window as any).GuardianForms.testing.observe.countAutoSaves(); });
  await page.evaluate((d) => { (window as any).__run = (window as any).GuardianForms.testing.importTransaction.run(d, { sourceName: 'annual.xlsx' }); }, draft);
  await page.locator(DIALOG).locator('[data-dyn-action="cancel"]').click();
  expect(await page.evaluate(() => (window as any).__run)).toMatchObject({ committed: false });
  expect(await page.evaluate(() => JSON.stringify((window as any).GuardianForms.testing.snapshot().filing))).toBe(before);
  expect(await page.evaluate(() => (window as any).__saves.count)).toBe(0);

  await page.evaluate((d) => { (window as any).__run = (window as any).GuardianForms.testing.importTransaction.run(d, { sourceName: 'annual.xlsx' }); }, draft);
  await page.locator(DIALOG).locator('[data-dyn-action="confirm"]').click();
  // The notice, after the redraw.
  const notice = page.locator(DIALOG);
  await expect(notice).toContainText('Imported annual.xlsx into Transaction Ward');
  await notice.locator('[data-dyn-action="ok"]').click();
  expect(await page.evaluate(() => (window as any).__run)).toMatchObject({ committed: true });
  expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('schA'))).toEqual(draft.schA);
  expect(await page.evaluate(() => (window as any).__saves.count)).toBe(1);
  await page.evaluate(() => (window as any).__saves.restore());
  const log = await page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.auditEntries());
  expect(log.length - logBefore).toBe(1);
  expect(JSON.stringify(log[log.length - 1])).toContain('Imported annual.xlsx into Transaction Ward');
  expect(errors).toEqual([]);
});
