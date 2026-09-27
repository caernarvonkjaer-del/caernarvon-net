import { test, expect } from '@playwright/test';
import {
  gotoApp, startNewCase, chooseNoPassword, chooseEncrypted,
  createWard, fillMinimalValidGuardianWard, exportAndCapture,
  acceptDynDialog,
} from './support/target';

// Milestone 33, Phase 2.4 -- Migration Sequence step 3. The persistence
// layer (src/core/persistence/*.js) is confirmed to have zero
// switch(inventoryType) branches -- it operates on whatever ward object is
// there, generically. That means one representative filing type (Guardian,
// the de-facto default every existing persistence spec already uses)
// suffices for most of this contract; only the "does this generalize to a
// non-accounting-family type" check below needs a second type.
//
// "Legacy migration fixtures" (Phase 2.4's remaining checklist item) is not
// covered here -- see MILESTONE-33-PROPOSAL.md for why: the old-format
// migration path was intentionally removed when the app unified to a single
// case-file format, and there is nothing left to migrate from or to.
//
// This is additive to case-file-roundtrip.spec.ts (normal + encrypted
// save/open, corruption handling), recovery-cache.spec.ts (a successful save
// clears the lock-recovery cache; the last-position marker), unlock.spec.ts
// (unencrypted lock/unlock before any .sav exists), and ward-lock.spec.ts
// (multi-tab lock contention) -- none of those are duplicated here.

async function forceCacheWrite(page: import('@playwright/test').Page) {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
}

test.describe('Persistence and recovery contract', () => {
  test('an invalid draft survives save and reopen, and export is still blocked afterward', async ({ browser }) => {
    // The one combined scenario nothing else tests: existing coverage proves
    // either half separately (case-file-roundtrip.spec.ts proves save+reopen
    // of an incomplete ward but never attempts export afterward;
    // navigation-status.contract.spec.ts proves export blocking live, with
    // no save/reopen around it) but never both together.
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Invalid Draft Ward', 'guardian');
      await fillMinimalValidGuardianWard(page);

      // Overwrite the otherwise-valid GID with an invalid draft through the
      // real UI, then save without ever blurring -- flushPendingSave() ->
      // commitPendingFieldValues() marks it aria-invalid and re-records the
      // draft (still invalid, so commitStoredDateDrafts() leaves it in
      // place) -> saveData() persists window.D, __fieldDrafts included.
      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
      const gidInput = page.locator('input[data-field-path="gid"]');
      await gidInput.fill('02/14/26');
      await forceCacheWrite(page);

      savPath = await exportAndCapture(page);
    } finally {
      await context.close();
    }

    const reopenContext = await browser.newContext();
    try {
      const reopenPage = await reopenContext.newPage();
      await gotoApp(reopenPage);
      await reopenPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      await reopenPage.setInputFiles('#startup-open-input', savPath);
      await expect(reopenPage.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('');
      await reopenPage.evaluate(() => (() => { const tt = (window as any).GuardianForms.testing; return tt.activateFiling.open(tt.snapshot().caseFile.wards[0].wardId); })());
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('Invalid Draft Ward');

      // The draft data itself survived the round trip. getFieldDraftDisplay()
      // is never called anywhere in the render pipeline, so the raw invalid
      // text does not re-appear in the input on remount -- a real, separate,
      // minor display-restoration gap, not something this test's scenario
      // depends on or that this change fixes.
      const draft = await reopenPage.evaluate(() => (window as any).GuardianForms.testing.field('__fieldDrafts')?.gid);
      expect(draft?.rawValue).toBe('02/14/26');

      await reopenPage.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
      // Milestone 50G: the export-blocked alert is now an awaitable
      // alertModal() DOM dialog, not a blocking native one -- trigger first,
      // then wait for it, rather than pre-arming a listener.
      await reopenPage.locator('[data-inventory-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
        button.disabled = false;
        button.click();
      });
      const alertMessage = await acceptDynDialog(reopenPage);
      expect(alertMessage).toContain('Cannot export — 1 required field missing');
    } finally {
      await reopenContext.close();
    }
  });

  test('pending valid input commits via save, not just blur', async ({ page }) => {
    // Every existing date test only ever checks the blur path
    // (finalizeFieldValue). commitStoredDateDrafts() firing from
    // flushPendingSave() (via commitPendingFieldValues()) rather than blur
    // is untested elsewhere.
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Pending Valid Draft Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));

    const gidInput = page.locator('input[data-field-path="gid"]');
    await gidInput.fill('Feb 14, 2026'); // valid but unparsed -- no blur
    await forceCacheWrite(page);

    const gid = await page.evaluate(() => (window as any).GuardianForms.testing.field('gid'));
    expect(gid).toBe('2026-02-14');
    const draft = await page.evaluate(() => (window as any).GuardianForms.testing.field('__fieldDrafts')?.gid);
    expect(draft).toBeFalsy();
  });

  test('an encrypted case with no .sav yet survives an auto-lock, wrong password rejected first', async ({ page }) => {
    // The Milestone 57 review removed the cross-session encrypted restore
    // this test used to cover (checkSessionRestoreCacheAtLaunch() --
    // see recovery-cache.js's file header for why). What lockApp() still
    // does -- same-tab recovery of a case that has never been saved to a
    // .sav file yet -- is covered unencrypted by unlock.spec.ts; this is
    // its encrypted-mode counterpart, including a wrong password first.
    const password = 'recovery-cache-password-77';
    await gotoApp(page);
    await startNewCase(page);
    await chooseEncrypted(page, password);
    await createWard(page, 'Encrypted Recovery Ward');
    await forceCacheWrite(page);

    await page.evaluate(() => { void (window as any).GuardianForms.testing.lock(); });
    await expect(page.locator('#unlock-overlay')).toHaveClass(/show/);
    await page.fill('#unlock-password', 'wrong-password');
    await page.click('#unlock-submit-btn');
    await expect(page.locator('#unlock-overlay')).toHaveClass(/show/); // still locked
    await expect(page.locator('#unlock-error')).toBeVisible();

    await page.fill('#unlock-password', password);
    await page.click('#unlock-submit-btn');
    await expect(page.locator('#unlock-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('');
    await page.evaluate(() => (() => { const tt = (window as any).GuardianForms.testing; return tt.activateFiling.open(tt.snapshot().caseFile.wards[0].wardId); })());
    await expect(page.locator('#ward-selector')).toHaveValue('Encrypted Recovery Ward');
  });

  test('the same save/open round trip works for a non-accounting-family type', async ({ browser }) => {
    // Empirically backs the "persistence is type-agnostic" architectural
    // finding (case-file.js/crypto.js/recovery-cache.js have zero
    // switch(inventoryType) branches) rather than resting solely on reading
    // the source -- every existing persistence spec uses Guardian.
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Roundtrip Plan Ward', 'planSimplified');
      savPath = await exportAndCapture(page);
    } finally {
      await context.close();
    }

    const reopenContext = await browser.newContext();
    try {
      const reopenPage = await reopenContext.newPage();
      await gotoApp(reopenPage);
      await reopenPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      await reopenPage.setInputFiles('#startup-open-input', savPath);
      await expect(reopenPage.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('');
      await reopenPage.evaluate(() => (() => { const tt = (window as any).GuardianForms.testing; return tt.activateFiling.open(tt.snapshot().caseFile.wards[0].wardId); })());
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('Roundtrip Plan Ward');
    } finally {
      await reopenContext.close();
    }
  });
});
