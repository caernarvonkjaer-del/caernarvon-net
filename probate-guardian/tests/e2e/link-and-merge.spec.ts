import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, acceptDynDialog, dismissDynDialog } from './support/target';

// Milestone 73E part 2 (decision 73E-N3), through the real dialogs: Link
// Person fills only what the slot leaves blank and asks before replacing what
// was typed -- it used to overwrite every field with the shared record's,
// blanks included -- and Merge's confirmation names the open filings whose
// typed details it will change. Red-first: no question; the typed name and
// phone replaced; Merge silent about the filing it changes.

const field = (page: Page, p: string) => page.evaluate((x) => (window as any).GuardianForms.testing.field(x), p);
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

/** A Plan's guardian saved as a shared record, from the slot. Returns its id. */
async function sharedGuardianFromPlan(page: Page, ward: string, details: { name: string; phone: string }) {
  await createWard(page, ward, 'planInitial');
  await go(page, '/p9');
  await page.fill('[data-form-path="planGuardians.0.name"]', details.name);
  await page.fill('[data-form-path="planGuardians.0.phone"]', details.phone);
  await page.locator('[data-form-path="planGuardians.0.phone"]').blur();
  await page.click('[data-form-action="link-party"][data-role="guardian"][data-index="0"]');
  await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
  await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
  await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
  return String(await field(page, 'guardianPartyIds.0'));
}

/** An Annual whose guardian has a typed name and phone and no email, then Link Person to `partyId`. */
async function annualLinkedTo(page: Page, ward: string, partyId: string) {
  await createWard(page, ward, 'annual');
  await go(page, '/p3');
  await page.fill('[data-annual-path="guardians.0.name"]', 'Mary Smith');
  await page.fill('[data-annual-path="guardians.0.phone"]', '7275550199');
  await page.locator('[data-annual-path="guardians.0.phone"]').blur();
  await page.click('[data-annual-action="link-party"][data-role="guardian"][data-index="0"]');
  await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
  await page.selectOption('#pick-party-existing', partyId);
  await page.click('#pickPartyModal [data-modal-action="pick-party"]');
}

test.describe('Milestone 73E part 2: Link Person and Merge', () => {
  test('Link Person asks before replacing typed details; "Keep" keeps them and fills only the blanks', async ({ page }) => {
    await freshStartNoPassword(page);
    // The source is an Annual: its guardian's email is part of the shared
    // record (the Initial Plan's isn't -- found 2026-10-08, reported, not changed here).
    await createWard(page, 'Link Source Ward', 'annual');
    await go(page, '/p3');
    await page.fill('[data-annual-path="guardians.0.name"]', 'Mary J. Smith');
    await page.fill('[data-annual-path="guardians.0.phone"]', '7275550100');
    await page.fill('[data-annual-path="guardians.0.email"]', 'mary@example.com');
    await page.locator('[data-annual-path="guardians.0.email"]').blur();
    await page.click('[data-annual-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
    const partyId = String(await field(page, 'guardianPartyIds.0'));
    await annualLinkedTo(page, 'Link Keep Ward', partyId);

    const message = await dismissDynDialog(page);
    expect(message).toContain('Name: typed "Mary Smith"; shared record "Mary J. Smith"');
    expect(message).toContain('Phone: typed "(727) 555-0199"; shared record "(727) 555-0100"');
    expect(message).toContain('Blank boxes are filled from the shared record either way.');

    expect(await field(page, 'guardianPartyIds.0'), 'linked').toBe(partyId);
    expect(await field(page, 'guardians.0.name'), 'typed, kept').toBe('Mary Smith');
    expect(await field(page, 'guardians.0.phone'), 'typed, kept').toBe('(727) 555-0199');
    expect(await field(page, 'guardians.0.email'), 'blank, filled from the record').toBe('mary@example.com');
  });

  test('Link Person: "Use the shared record\'s" replaces the typed details', async ({ page }) => {
    await freshStartNoPassword(page);
    const partyId = await sharedGuardianFromPlan(page, 'Link Source Ward', { name: 'Mary J. Smith', phone: '7275550100' });
    await annualLinkedTo(page, 'Link Replace Ward', partyId);
    await acceptDynDialog(page);
    await expect.poll(() => field(page, 'guardians.0.name')).toBe('Mary J. Smith');
    expect(await field(page, 'guardians.0.phone')).toBe('(727) 555-0100');
  });

  test("Merge's confirmation names the open filing whose typed details it will change", async ({ page }) => {
    await freshStartNoPassword(page);
    const keepId = await sharedGuardianFromPlan(page, 'Merge Ward A', { name: 'Jane Doe', phone: '5550100100' });
    // A second, separate record for the same person, on an Annual.
    await createWard(page, 'Merge Ward B', 'annual');
    await go(page, '/p3');
    await page.fill('[data-annual-path="guardians.0.name"]', 'Jane Doe');
    await page.fill('[data-annual-path="guardians.0.phone"]', '5550200200');
    await page.locator('[data-annual-path="guardians.0.phone"]').blur();
    await page.click('[data-annual-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });

    await go(page, '/party-management');
    const card = page.locator('#party-dedupe-queue > .entry-card').filter({ hasText: 'Jane Doe' });
    await card.locator(`[data-form-action="party-merge-keep"][data-keep-id="${keepId}"]`).click();
    const message = await dismissDynDialog(page);
    expect(message).toContain(`These open filings' typed details will change to match "Jane Doe":`);
    expect(message).toContain('• Merge Ward B — Annual Accounting (guardian 1): Phone');
    expect(message, 'the filing on the record kept is not changed, so not named').not.toContain('Merge Ward A —');
  });
});
