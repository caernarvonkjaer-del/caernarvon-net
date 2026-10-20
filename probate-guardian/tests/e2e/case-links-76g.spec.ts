import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, acceptDynDialog } from './support/target';

// Milestone 76G items 5, 7 and 8, through the real dialogs.
//  5. "+ New Case" could not split a filing off its case: it returned the
//     case the filing already had.
//  7. (decision 76G-4) Add Form, and the Simplified's eligibility dialog,
//     filled a new form in from a same-named ward's form -- and linked it to
//     that ward's record and case -- without saying so.
//  8. Create Form with a typed ward name, not one chosen from the list, did
//     nothing at all.

const DYN = '.modal-overlay[id^="dyn-dialog-"].show .modal-box';

async function wardWithCase(page: Page, name: string, caseNumber: string): Promise<{ wardId: string; caseId: string }> {
  await createWard(page, name, 'guardian');
  return page.evaluate(async (num) => {
    const t = (window as any).GuardianForms.testing;
    t.patchFiling({ caseNumber: num }); // setup (D9)
    await t.save.flush();
    const wardId = t.snapshot().caseFile.activeWardId;
    return { wardId, caseId: t.updateSharedRecords.getOrCreateCaseForWard(wardId).id };
  }, caseNumber);
}

const wards = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards
  .map((w: any) => ({ wardId: w.wardId, wardName: w.wardName, caseId: w.caseId, inventoryType: w.inventoryType })));

test.describe('76G: case links', () => {
  test('"+ New Case" gives the filing a case of its own', async ({ page }) => {
    await freshStartNoPassword(page);
    const a = await wardWithCase(page, 'Split Source', '26-000555-GD');
    // A second filing joined to the same case, as Pick Case's Link does.
    await createWard(page, 'Split Target', 'planInitial');
    const b = await page.evaluate(async (caseId) => {
      const t = (window as any).GuardianForms.testing;
      const wardId = t.snapshot().caseFile.activeWardId;
      t.patchFiling({ caseId, caseNumber: '26-000556-GD' }); // setup (D9)
      await t.save.flush();
      return wardId;
    }, a.caseId);

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
    await page.click(`[data-dashboard-action="link-case"][data-ward-id="${b}"]`);
    await page.locator('#pickCaseModal.show').waitFor({ state: 'visible' });
    await page.click('#pickCaseModal [data-modal-action="create-case-from-ward"]');
    await page.locator('#pickCaseModal').waitFor({ state: 'hidden' });

    const after = await page.evaluate(([aId, bId]) => {
      const t = (window as any).GuardianForms.testing;
      const ws = t.snapshot().caseFile.wards;
      const caseB = ws.find((w: any) => w.wardId === bId).caseId;
      return { caseA: ws.find((w: any) => w.wardId === aId).caseId, caseB, numberB: t.sharedRecords.resolveCase(caseB)?.caseNumber };
    }, [a.wardId, b] as const);
    expect(after.caseA).toBe(a.caseId);
    expect(after.caseB).not.toBe(a.caseId);
    expect(after.numberB).toBe('26-000556-GD');
  });

  test('Add Form asks before filling in from, and linking to, a same-named ward, naming its case', async ({ page }) => {
    await freshStartNoPassword(page);
    const a = await wardWithCase(page, 'Same Name Ward', '26-000777-GD');
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.openDialog('planInitial'));
    await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
    const nameBox = page.locator('#new-ward-name');
    await nameBox.fill('Same Name Ward');
    await nameBox.evaluate((el) => (el as HTMLInputElement).blur());
    await expect(page.locator('#carry-source-ward')).toHaveValue(a.wardId);

    await page.click('#addWardModal [data-modal-action="add-ward"]');
    const question = page.locator(DYN);
    await expect(question).toContainText('Fill in from this ward?');
    await expect(question).toContainText("Same Name Ward's Initial Inventory, case 26-000777-GD");
    await question.locator('[data-dyn-action="cancel"]').click();
    // "Go back": the dialog stays open and nothing was made.
    await expect(page.locator('#addWardModal.show')).toBeVisible();
    expect(await wards(page)).toHaveLength(1);

    await page.click('#addWardModal [data-modal-action="add-ward"]');
    expect(await acceptDynDialog(page)).toContain('links the two');
    await page.locator('#addWardModal').waitFor({ state: 'hidden' });
    const made = (await wards(page)).find((w) => w.inventoryType === 'planInitial');
    expect(made?.caseId).toBe(a.caseId);
  });

  test('a source picked from the list is not asked about', async ({ page }) => {
    await freshStartNoPassword(page);
    const a = await wardWithCase(page, 'Picked Ward', '26-000778-GD');
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.openDialog('planInitial'));
    await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
    await page.fill('#new-ward-name', 'Another Name');
    await page.locator('#new-ward-name').evaluate((el) => (el as HTMLInputElement).blur());
    await page.selectOption('#carry-source-ward', a.wardId);
    await page.click('#addWardModal [data-modal-action="add-ward"]');
    await page.locator('#addWardModal').waitFor({ state: 'hidden' });
    await expect(page.locator(DYN)).toHaveCount(0);
  });

  test("the Simplified's eligibility dialog asks the same", async ({ page }) => {
    await freshStartNoPassword(page);
    await wardWithCase(page, 'Elig Ward', '26-000779-GD');
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.openDialog('simplified'));
    await page.locator('#simplifiedEligibilityModal.show').waitFor({ state: 'visible' });
    await page.fill('#elig-ward-name', 'Elig Ward');
    await page.locator('#elig-ward-name').evaluate((el) => (el as HTMLInputElement).blur());
    await page.selectOption('#elig-depository', 'Yes');
    await page.selectOption('#elig-only-transactions', 'Yes');
    await page.click('#simplifiedEligibilityModal [data-modal-action="confirm-simplified-eligibility"]');
    await expect(page.locator(DYN)).toContainText('case 26-000779-GD');
    await page.locator(DYN).locator('[data-dyn-action="cancel"]').click();
    await expect(page.locator('#simplifiedEligibilityModal.show')).toBeVisible();
    expect(await wards(page)).toHaveLength(1);
  });

  test('Create Form with a typed ward name says what it needs', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Convert Source', 'annual');
    await page.evaluate(() => (window as any).GuardianForms.testing.convertFiling.openDialog());
    await page.locator('#convertWardModal.show').waitFor({ state: 'visible' });
    const input = page.locator('#convert-source-ward');
    await input.fill('Convert Sou');
    await page.click('#convertWardModal [data-modal-action="convert-ward"]');
    await expect(page.locator('#convert-source-error')).toBeVisible();
    await expect(page.locator('#convertWardModal.show')).toBeVisible();
    expect(await wards(page)).toHaveLength(1);

    await page.locator('#convert-source-ward-dropdown .ward-combobox-item').first().dispatchEvent('mousedown');
    await expect(page.locator('#convert-source-error')).toBeHidden();
    await expect(input).toHaveValue('Convert Source');
  });
});
