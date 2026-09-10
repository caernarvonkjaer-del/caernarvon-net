import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// End-to-end proof for persistence-rewrite Milestone 7: the party
// de-duplication screen (src/legacy-app.js's pagePartyManagement(), backed
// by src/core/party-resolver.js's findDuplicateCandidates()/mergeParties())
// reached through the real Help-panel button, surfacing two independently
// -created (never linked) same-named guardian records and merging them.

test.describe('party de-duplication (Milestone 7)', () => {
  test('two independently-created same-named guardians surface in the review queue and merge through the real UI', async ({ page }) => {
    await freshStartNoPassword(page);

    // Ward A (planInitial): guardian 0, its own party.
    await createWard(page, 'Dedupe Ward A', 'planInitial');
    await page.evaluate(() => (window as any).navigate('/p9'));
    await page.fill('[data-form-path="planGuardians.0.name"]', 'Jane Doe');
    await page.fill('[data-form-path="planGuardians.0.phone"]', '5550100100');
    await page.click('[data-form-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
    const partyIdA = await page.evaluate(() => (window as any).D.guardianPartyIds[0]);

    // Ward B (annual): guardian 0, same name, different phone, a SEPARATE
    // party -- never linked to A. This is the exact scenario the de-dup
    // screen exists to catch.
    await createWard(page, 'Dedupe Ward B', 'annual');
    await page.evaluate(() => (window as any).navigate('/p3'));
    await page.fill('[data-annual-path="guardians.0.name"]', 'Jane Doe');
    await page.fill('[data-annual-path="guardians.0.phone"]', '5550200200');
    await page.click('[data-annual-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
    const partyIdB = await page.evaluate(() => (window as any).D.guardianPartyIds[0]);

    expect(partyIdA).toBeTruthy();
    expect(partyIdB).toBeTruthy();
    expect(partyIdA).not.toBe(partyIdB);

    // The first-ward "save a backup" toast can overlap the sidebar's help
    // button -- dismiss it if it appeared before reaching for Help.
    const reminderDismiss = page.locator('[data-shell-action="hide-auto-export-reminder"]');
    if (await reminderDismiss.isVisible()) await reminderDismiss.click();

    // The sidebar's whole top nav (including Help) shares .ward-collapsible
    // with the filing controls, and gets auto-collapsed by actions like
    // creating a new form (see ward-lock.spec.ts's own "auto-collapse" test)
    // -- re-expand it before reaching for Help.
    const wardControlsToggle = page.locator('#ward-controls-toggle-btn');
    if (await wardControlsToggle.count() > 0 && (await wardControlsToggle.textContent())?.includes('Show')) await wardControlsToggle.click();

    // Reach the screen through the real Help-panel button, not window.navigate.
    await page.click('[data-shell-action="toggle-help"]');
    await page.click('[data-shell-action="party-management"]');
    await expect(page).toHaveURL(/#\/party-management/);

    const card = page.locator('#party-dedupe-queue > .entry-card').filter({ hasText: 'Jane Doe' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Same name only'); // phones differ -- not a strong match

    page.once('dialog', (d) => d.accept());
    await card.locator(`[data-form-action="party-merge-keep"][data-keep-id="${partyIdA}"]`).click();

    await expect(page.locator('#party-dedupe-queue')).toContainText('No likely duplicates found.');

    // Ward B's guardian slot now resolves to A's data, re-hydrated immediately.
    const wardBPhone = await page.evaluate(() => {
      const w = window as any;
      const wardB = w.caseFile.wards.find((x: any) => x.inventoryType === 'annual');
      return wardB.guardians[0].phone;
    });
    expect(wardBPhone).toBe('(555) 010-0100');
  });
});
