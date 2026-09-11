import { test, expect } from '@playwright/test';
import {
  gotoApp, startNewCase, chooseNoPassword, chooseEncrypted,
  createWard, fillMinimalValidGuardianWard, exportAndCapture,
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
// save/open, corruption handling), recovery-cache.spec.ts (unencrypted
// restore/decline/clear), and ward-lock.spec.ts (multi-tab lock contention)
// -- none of those are duplicated here.

async function forceCacheWrite(page: import('@playwright/test').Page) {
  await page.evaluate(() => (window as any).flushPendingSave());
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
      await page.evaluate(() => (window as any).navigate('/'));
      const gidInput = page.locator('[data-field-path="gid"]');
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
      await reopenPage.evaluate(() => (window as any).switchWard((window as any).caseFile.wards[0].wardId));
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('Invalid Draft Ward');

      // The draft data itself survived the round trip. getFieldDraftDisplay()
      // is never called anywhere in the render pipeline, so the raw invalid
      // text does not re-appear in the input on remount -- a real, separate,
      // minor display-restoration gap, not something this test's scenario
      // depends on or that this change fixes.
      const draft = await reopenPage.evaluate(() => (window as any).D.__fieldDrafts?.gid);
      expect(draft?.rawValue).toBe('02/14/26');

      await reopenPage.evaluate(() => (window as any).navigate('/print'));
      // dialog must be registered before the trigger, not after -- otherwise
      // this races the dialog handler rather than waiting on it deterministically.
      const dialogPromise = reopenPage.waitForEvent('dialog');
      const triggerPromise = reopenPage.locator('[data-inventory-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
        button.disabled = false;
        button.click();
      });
      const dialog = await dialogPromise;
      const alertMessage = dialog.message();
      await dialog.accept();
      await triggerPromise;
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
    await page.evaluate(() => (window as any).navigate('/'));

    const gidInput = page.locator('[data-field-path="gid"]');
    await gidInput.fill('Feb 14, 2026'); // valid but unparsed -- no blur
    await forceCacheWrite(page);

    const gid = await page.evaluate(() => (window as any).D.gid);
    expect(gid).toBe('2026-02-14');
    const draft = await page.evaluate(() => (window as any).D.__fieldDrafts?.gid);
    expect(draft).toBeFalsy();
  });

  test('encrypted recovery-cache restore, including a wrong password', async ({ page }) => {
    // recovery-cache.spec.ts only ever exercises the unencrypted branch of
    // checkSessionRestoreCacheAtLaunch() -- the encrypted branch (a native
    // prompt() for the password, plus the documented wrong-password alert
    // that leaves the cache in place) is untested anywhere.
    const password = 'recovery-cache-password-77';
    await gotoApp(page);
    await startNewCase(page);
    await chooseEncrypted(page, password);
    await createWard(page, 'Encrypted Recovery Ward');
    await forceCacheWrite(page);

    // A single persistent handler, not two .once() calls -- Node's
    // EventEmitter fires every registered 'dialog' listener on each event,
    // so two queued .once() handlers would both fire on the FIRST dialog
    // rather than one per dialog. Distinguish by type instead, same idiom
    // recovery-cache.spec.ts's own "declining the offer" test already uses.
    // Three dialogs fire on the failed attempt: confirm() (restore offer),
    // prompt() (password), then alert() (the wrong-password error) -- an
    // unhandled alert blocks the page, so it must be accepted too.
    page.on('dialog', (d) => {
      if (d.type() === 'confirm') d.accept(); // "unsaved work" restore-offer
      else if (d.type() === 'prompt') d.accept('wrong-password');
      else d.accept(); // the wrong-password alert()
    });
    await gotoApp(page);
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/); // failed restore falls through

    // Cache left in place -- the offer repeats on the next launch.
    page.removeAllListeners('dialog');
    page.on('dialog', (d) => {
      if (d.type() === 'confirm') d.accept();
      else if (d.type() === 'prompt') d.accept(password);
      else d.accept(); // the success alert()
    });
    await gotoApp(page);
    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('');
    await page.evaluate(() => (window as any).switchWard((window as any).caseFile.wards[0].wardId));
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
      await reopenPage.evaluate(() => (window as any).switchWard((window as any).caseFile.wards[0].wardId));
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('Roundtrip Plan Ward');
    } finally {
      await reopenContext.close();
    }
  });
});
