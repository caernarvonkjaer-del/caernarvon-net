import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, chooseCoverCounty, acceptDynDialog, dismissDynDialog } from './support/target';

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
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p9'));
    await page.fill('[data-form-path="planGuardians.0.name"]', 'Jane Doe');
    await page.fill('[data-form-path="planGuardians.0.phone"]', '5550100100');
    await page.click('[data-form-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
    const partyIdA = await page.evaluate(() => (window as any).GuardianForms.testing.field('guardianPartyIds.0'));

    // Ward B (annual): guardian 0, same name, different phone, a SEPARATE
    // party -- never linked to A. This is the exact scenario the de-dup
    // screen exists to catch.
    await createWard(page, 'Dedupe Ward B', 'annual');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p3'));
    await page.fill('[data-annual-path="guardians.0.name"]', 'Jane Doe');
    await page.fill('[data-annual-path="guardians.0.phone"]', '5550200200');
    await page.click('[data-annual-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
    const partyIdB = await page.evaluate(() => (window as any).GuardianForms.testing.field('guardianPartyIds.0'));

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
    // Since Milestone 48 the "?" inside a filing opens the user guide instead
    // of the panel; only the dashboard's "?" still opens the panel.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
    await page.waitForURL(/#\/dashboard/);
    await page.click('[data-shell-action="toggle-help"]');
    await page.click('[data-shell-action="party-management"]');
    await expect(page).toHaveURL(/#\/party-management/);

    const card = page.locator('#party-dedupe-queue > .entry-card').filter({ hasText: 'Jane Doe' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Same name only'); // phones differ -- not a strong match

    await card.locator(`[data-form-action="party-merge-keep"][data-keep-id="${partyIdA}"]`).click();
    await acceptDynDialog(page);

    await expect(page.locator('#party-dedupe-queue')).toContainText('No likely duplicates found.');

    // Ward B's guardian slot now resolves to A's data, re-hydrated immediately.
    const wardBPhone = await page.evaluate(() => {
      const w = window as any;
      const wardB = w.GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.inventoryType === 'annual');
      return wardB.guardians[0].phone;
    });
    expect(wardBPhone).toBe('(555) 010-0100');
  });

  test('two independently-created same-named wards with conflicting counties warn on merge, can be cancelled, and merge preserves kept county when accepted', async ({ page }) => {
    await freshStartNoPassword(page);

    // Ward A (annual): ward with county 'Orange'
    await createWard(page, 'Conflict Ward X', 'annual');
    await chooseCoverCounty(page, 'Orange');
    const partyIdA = await page.evaluate(() => (window as any).GuardianForms.testing.field('wardPartyId'));

    // Ward B (planInitial): same ward name, conflicting county 'Pasco', separate record (Start Blank)
    await page.evaluate((t) => (window as any).GuardianForms.testing.createFiling.openDialog(t), 'planInitial');
    await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
    await page.fill('#new-ward-name', 'Conflict Ward X');
    await page.selectOption('#carry-source-ward', '');
    await page.click('#addWardModal [data-modal-action="add-ward"]');
    await page.locator('#addWardModal').waitFor({ state: 'hidden' });
    await chooseCoverCounty(page, 'Pasco');
    const partyIdB = await page.evaluate(() => (window as any).GuardianForms.testing.field('wardPartyId'));

    expect(partyIdA).toBeTruthy();
    expect(partyIdB).toBeTruthy();
    expect(partyIdA).not.toBe(partyIdB);

    // Dismiss any auto-export reminder toast if visible
    const reminderDismiss = page.locator('[data-shell-action="hide-auto-export-reminder"]');
    if (await reminderDismiss.isVisible()) await reminderDismiss.click();

    // Re-expand sidebar if auto-collapsed
    const wardControlsToggle = page.locator('#ward-controls-toggle-btn');
    if (await wardControlsToggle.count() > 0 && (await wardControlsToggle.textContent())?.includes('Show')) await wardControlsToggle.click();

    // Navigate to Party Management via the dashboard's Help panel (see the
    // Milestone 48 note in the first test).
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
    await page.waitForURL(/#\/dashboard/);
    await page.click('[data-shell-action="toggle-help"]');
    await page.click('[data-shell-action="party-management"]');
    await expect(page).toHaveURL(/#\/party-management/);

    const card = page.locator('#party-dedupe-queue > .entry-card').filter({ hasText: 'Conflict Ward X' });
    await expect(card).toBeVisible();

    // First attempt: cancel the merge. Verify the confirm dialog warned about conflicting counties.
    await card.locator(`[data-form-action="party-merge-keep"][data-keep-id="${partyIdA}"]`).click();
    const dialogMessageFirst = await dismissDynDialog(page);

    expect(dialogMessageFirst).toContain('Conflicting ward counties');
    expect(dialogMessageFirst).toContain('Orange');
    expect(dialogMessageFirst).toContain('Pasco');
    // Card must still be visible in the queue because merge was cancelled
    await expect(card).toBeVisible();

    // Second attempt: accept the merge.
    await card.locator(`[data-form-action="party-merge-keep"][data-keep-id="${partyIdA}"]`).click();
    const dialogMessageSecond = await acceptDynDialog(page);

    expect(dialogMessageSecond).toContain('Conflicting ward counties');
    await expect(page.locator('#party-dedupe-queue')).toContainText('No likely duplicates found.');

    // Verify kept party retained 'Orange', discarded party marked mergedInto, and Ward B now points to partyIdA
    const mergeResult = await page.evaluate(([keepId, discardId]) => {
      const w = window as any;
      const keepParty = w.GuardianForms.testing.sharedRecords.resolveParty(keepId);
      const discardParty = (w.GuardianForms.testing.snapshot().caseFile.parties || []).find((p: any) => p.id === discardId);
      const wardB = w.GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.inventoryType === 'planInitial');
      return {
        keepCounty: keepParty?.county,
        discardMergedInto: discardParty?.mergedInto,
        wardBPartyId: wardB?.wardPartyId,
      };
    }, [partyIdA, partyIdB]);

    expect(mergeResult.keepCounty).toBe('Orange');
    expect(mergeResult.discardMergedInto).toBe(partyIdA);
    expect(mergeResult.wardBPartyId).toBe(partyIdA);
  });

  test('ticking Compare on two directory records makes them a merge candidate (a third box is disabled); This One is Primary merges; the sub lists beneath its primary and Unmerge Selected restores it', async ({ page }) => {
    await freshStartNoPassword(page);

    // A real linked guardian on a real filing, so the merge has an FK to repoint.
    await createWard(page, 'Compare Ward', 'planInitial');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p9'));
    await page.fill('[data-form-path="planGuardians.0.name"]', 'Alice Smith');
    await page.click('[data-form-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
    const idA = await page.evaluate(() => (window as any).GuardianForms.testing.field('guardianPartyIds.0'));

    // Two more records with clearly different names -- nothing auto-detects.
    const { idB, idC } = await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      const b = t.updateSharedRecords.createParty('guardian', { name: 'Robert Jones', email: 'robert@example.com' });
      const c = t.updateSharedRecords.createParty('guardian', { name: 'Carol White' });
      return { idB: b.id, idC: c.id };
    });

    const reminderDismiss = page.locator('[data-shell-action="hide-auto-export-reminder"]');
    if (await reminderDismiss.isVisible()) await reminderDismiss.click();
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/party-management'));
    await expect(page).toHaveURL(/#\/party-management/);

    const queue = page.locator('#party-dedupe-queue');
    const compareBox = (id: string) => page.locator(`[data-form-action="party-compare-toggle"][data-party-id="${id}"]`);
    const unmergeBox = (id: string) => page.locator(`[data-form-action="party-unmerge-toggle"][data-party-id="${id}"]`);
    await expect(queue).toContainText('No likely duplicates found.');

    await compareBox(idA).check();
    await expect(queue).toContainText('No likely duplicates found.'); // one box is not a pair yet
    await compareBox(idB).check();
    const card = queue.locator('> .entry-card').filter({ hasText: 'Selected by you' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Alice Smith');
    await expect(card).toContainText('Robert Jones');
    await expect(compareBox(idC)).toBeDisabled(); // never three or more
    await expect(compareBox(idA)).toBeEnabled();

    const primaryButton = card.locator(`[data-form-action="party-merge-keep"][data-keep-id="${idA}"]`);
    await expect(primaryButton).toHaveText('This One is Primary');
    await primaryButton.click();
    const mergeDialog = await acceptDynDialog(page);
    expect(mergeDialog).toContain('can be unmerged later');
    expect(mergeDialog).toContain('Email: robert@example.com'); // offered as a backfill onto the primary

    await expect(queue).toContainText('No likely duplicates found.');
    const primaryRow = page.locator('#party-directory-rows > .entry-card').filter({ has: compareBox(idA) });
    await expect(primaryRow).toContainText('Robert Jones');
    await expect(primaryRow).toContainText('merged into this record');
    await expect(unmergeBox(idB)).toBeVisible();
    await expect(compareBox(idB)).toHaveCount(0); // no longer a top-level record
    await expect(compareBox(idC)).toBeEnabled(); // the selection was cleared by the merge
    expect(await page.evaluate((id) => (window as any).GuardianForms.testing.sharedRecords.resolveParty(id).email, idA)).toBe('robert@example.com');

    await unmergeBox(idB).check();
    const unmergeButton = page.locator('[data-form-action="party-unmerge-selected"]');
    await expect(unmergeButton).toHaveText('Unmerge Selected (1)');
    await unmergeButton.click();
    const unmergeDialog = await acceptDynDialog(page);
    expect(unmergeDialog).toContain('"Robert Jones" (merged into "Alice Smith")');

    await expect(unmergeBox(idB)).toHaveCount(0);
    await expect(compareBox(idB)).toBeVisible(); // back at the top level
    await expect(unmergeButton).toHaveCount(0);
    const after = await page.evaluate(([a, b]) => {
      const w = window as any;
      const sub = w.GuardianForms.testing.snapshot().caseFile.parties.find((p: any) => p.id === b);
      return { primaryEmail: w.GuardianForms.testing.sharedRecords.resolveParty(a).email, subMergedInto: sub.mergedInto, subRecord: sub.mergeRecord };
    }, [idA, idB]);
    expect(after.primaryEmail).toBeNull();
    expect(after.subMergedInto).toBeNull();
    expect(after.subRecord).toBeNull();
  });
});
