import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// End-to-end proof for persistence-rewrite Milestone 4: syncIdentityField()
// wired into the real UI's write path (persistFormControl() for planInitial,
// persistAnnualControl() for annual), driven entirely through actual form
// inputs and the new "Link Person" / pick-party modal -- nothing here pokes
// window.D directly. This is the exact pair (planInitial + annual) that
// exposed the original same-guardian-different-SSN bug this rewrite exists
// to fix.

async function wardId(page: import('@playwright/test').Page, name: string): Promise<string> {
  return page.evaluate((n) => {
    const w = (window as any).caseFile.wards.find((x: any) => x.wardName === n);
    return w.wardId;
  }, name);
}

test.describe('party write-through (Milestone 4, planInitial + annual)', () => {
  test('linking both filings to the same guardian party keeps their SSN in sync in both directions, through the real UI', async ({ page }) => {
    await freshStartNoPassword(page);

    await createWard(page, 'Sync Plan Ward', 'planInitial');
    const planWardId = await wardId(page, 'Sync Plan Ward');
    await page.evaluate(() => (window as any).navigate('/p9'));

    const planSsnInput = page.locator('[data-form-path="planGuardians.0.ssn"]');
    await planSsnInput.fill('123-45-6789');
    await planSsnInput.dispatchEvent('input');

    await page.click('[data-form-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });

    const partyId = await page.evaluate(() => (window as any).D.guardianPartyIds[0]);
    expect(partyId).toBeTruthy();

    await createWard(page, 'Sync Annual Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/p3'));

    await page.click('[data-annual-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.selectOption('#pick-party-existing', partyId);
    await page.click('#pickPartyModal [data-modal-action="pick-party"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });

    // Selecting the existing party should have immediately hydrated its SSN
    // (dehydrated a moment ago from the Plan Initial slot) into the Annual
    // guardian row, overwriting whatever was there (nothing, in this case).
    const annualSsnInput = page.locator('[data-annual-path="guardians.0.ssn"]');
    await expect(annualSsnInput).toHaveValue('123-45-6789');

    // Now edit the SSN on the Annual side and confirm it propagates back to
    // Plan Initial -- the reverse direction from the bug report.
    await annualSsnInput.fill('987-65-4321');
    await annualSsnInput.dispatchEvent('input');

    await page.evaluate((id) => (window as any).switchWard(id), planWardId);
    await page.evaluate(() => (window as any).navigate('/p9'));
    await expect(page.locator('[data-form-path="planGuardians.0.ssn"]')).toHaveValue('987-65-4321');

    // And the party record itself now reflects the latest edit.
    const partyTaxId = await page.evaluate((id) => (window as any).resolveParty(id).identifiers.taxId, partyId);
    expect(partyTaxId).toBe('987-65-4321');
  });
});
