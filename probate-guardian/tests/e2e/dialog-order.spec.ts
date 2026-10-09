import { test, expect, type Page } from '@playwright/test';
import { chooseEncrypted, createWard, freshStartNoPassword, gotoApp, startNewCase } from './support/target';

// Milestone 73L: dialogs that wait their turn. A pop-up (the app's own
// confirm, notice and question boxes) is shown, labelled and focused as soon
// as it is built, one at a time; Escape closes only the dialog on top;
// the Simplified eligibility questions close once the filing exists, before
// its notices; locking closes every pop-up. Also the Help panel, which now
// moves the page over on a wide window (decision 73L-1), and the reworded
// "Load Ward Info From" list (Milestone 74D's UX-07, approved 2026-10-09).
// Red-first: every case fails with the source set aside.

const POPUP = '.modal-overlay[id^="dyn-dialog-"]';
const SHOWN = `${POPUP}.show`;
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

test.describe('Milestone 73L: dialogs that wait their turn', () => {
  test('one Escape closes only the dialog on top: "Please enter a ward name" goes, New Form stays', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Escape Ward', 'annual');
    await go(page, '/dashboard');
    await page.locator('#main-content [data-dashboard-action="add-ward"]').first().click();
    await page.locator('#addWardModal.show').waitFor();
    await page.click('#addWardModal [data-modal-action="add-ward"]');
    await expect(page.locator(SHOWN)).toContainText('Please enter a ward name');
    await page.keyboard.press('Escape');
    await expect(page.locator(SHOWN)).toHaveCount(0);
    await expect(page.locator('#addWardModal'), 'New Form is still open').toHaveClass(/show/);
  });

  test('a pop-up is shown, labelled and focused as soon as it is asked for, not on a later frame', async ({ page }) => {
    await freshStartNoPassword(page);
    const seen = await page.evaluate(async () => {
      const dialogs = await import('/probate-guardian/src/core/ui/dialogs.js');
      void dialogs.confirmModal({ title: 'At once', message: 'Shown at once?' });
      const overlay = document.querySelector('.modal-overlay[id^="dyn-dialog-"]:last-of-type') as HTMLElement;
      const box = overlay?.querySelector('.modal-box');
      return {
        shown: !!overlay?.classList.contains('show'),
        role: box?.getAttribute('role'),
        labelled: !!box?.getAttribute('aria-labelledby'),
        focused: (document.activeElement as HTMLElement | null)?.dataset?.dynAction,
      };
    });
    expect(seen).toEqual({ shown: true, role: 'dialog', labelled: true, focused: 'confirm' });
    await page.locator(`${SHOWN} [data-dyn-action="cancel"]`).click();
  });

  test('one pop-up at a time: the second waits for the first, and the cursor goes back where it was', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Queue Ward', 'annual');
    await go(page, '/');
    const box = page.locator('#main-content input[data-annual-path="wardName"], #main-content input[data-form-path="wardName"]').first();
    await box.focus();
    await page.evaluate(async () => {
      const dialogs = await import('/probate-guardian/src/core/ui/dialogs.js');
      (window as any).__answers = [];
      void dialogs.confirmModal('First question').then((a) => (window as any).__answers.push(['first', a]));
      void dialogs.alertModal('Second notice').then(() => (window as any).__answers.push(['second']));
    });
    await expect(page.locator(POPUP), 'only the first is on the page').toHaveCount(1);
    await expect(page.locator(SHOWN)).toContainText('First question');
    await page.locator(`${SHOWN} [data-dyn-action="confirm"]`).click();
    await expect(page.locator(SHOWN)).toContainText('Second notice');
    await expect(page.locator(`${SHOWN} [data-dyn-action="ok"]`)).toBeFocused();
    await page.locator(`${SHOWN} [data-dyn-action="ok"]`).click();
    await expect(page.locator(POPUP)).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__answers)).toEqual([['first', true], ['second']]);
    await expect(box, 'the cursor is back in the box it was in').toBeFocused();
  });

  for (const qualifies of [true, false]) {
    test(`the eligibility questions close as soon as the filing exists, before its notice (${qualifies ? 'qualifies, with a source' : 'does not qualify'})`, async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, 'Source Ward', 'annual');
      await go(page, '/inventory-select');
      await page.click('[data-form-action="add-ward-type"][data-inventory-type="simplified"]');
      await page.locator('#simplifiedEligibilityModal.show').waitFor();
      await page.fill('#elig-ward-name', 'New Simplified Ward');
      const source = await page.locator('#elig-carry-source-ward option').nth(1).getAttribute('value');
      await page.selectOption('#elig-carry-source-ward', source!);
      await page.selectOption('#elig-depository', qualifies ? 'Yes' : 'No');
      await page.selectOption('#elig-only-transactions', 'Yes');
      await page.click('#simplifiedEligibilityModal [data-modal-action="confirm-simplified-eligibility"]');
      await expect(page.locator(SHOWN)).toContainText(qualifies ? 'Details were carried over' : 'does not qualify');
      await expect(page.locator('#simplifiedEligibilityModal'), 'the questions are closed behind the notice').not.toHaveClass(/show/);
      await page.locator(`${SHOWN} [data-dyn-action="ok"]`).click();
      await expect(page.locator('.modal-overlay.show')).toHaveCount(0);
    });
  }

  test('locking closes the pop-up that was open, as a "no": nothing over the lock screen, and nothing done', async ({ page }) => {
    const password = 'correct-horse-battery-staple';
    await gotoApp(page);
    await startNewCase(page);
    await chooseEncrypted(page, password);
    await createWard(page, 'Lock Ward', 'annual');
    await go(page, '/p3');
    await page.click('[data-annual-action="add-row"][data-collection="guardians"]');
    await page.locator('input[data-annual-path="guardians.1.name"]').fill('Second Guardian');
    await page.locator('input[data-annual-path="guardians.1.name"]').blur();
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    await page.click('[data-annual-action="remove-row"][data-collection="guardians"][data-index="1"]');
    await expect(page.locator(SHOWN)).toContainText('Remove co-guardian Second Guardian?');

    await page.evaluate(() => { void (window as any).GuardianForms.testing.lock(); });
    await expect(page.locator('#unlock-overlay')).toHaveClass(/show/);
    await expect(page.locator(SHOWN), 'no pop-up over the lock screen').toHaveCount(0);

    await page.fill('#unlock-password', password);
    await page.click('#unlock-submit-btn');
    await expect(page.locator('#unlock-overlay')).not.toHaveClass(/show/);
    await page.evaluate(() => (() => { const t = (window as any).GuardianForms.testing; return t.activateFiling.open(t.snapshot().caseFile.wards[0].wardId); })());
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('guardians.length')), 'the co-guardian was not removed').toBe(2);
  });

  test('the Help panel moves the page over on a wide window, and lies over it on a narrow one', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await freshStartNoPassword(page);
    await createWard(page, 'Help Ward', 'annual');
    await go(page, '/dashboard');
    await page.click('#help-toggle-btn');
    const panel = page.locator('#help-panel');
    await expect(panel).toBeVisible();
    const right = () => page.locator('#main-content').evaluate((el) => el.getBoundingClientRect().right);
    const panelLeft = async () => (await panel.boundingBox())!.x;
    expect(await right(), 'the page ends where the panel begins').toBeLessThanOrEqual(await panelLeft() + 1);

    await page.setViewportSize({ width: 900, height: 800 });
    expect(await right(), 'narrow: the panel lies over the page').toBeGreaterThan(await panelLeft() + 100);
    await page.click('.help-panel-close');
    await expect(panel).toBeHidden();
  });
});

test('Milestone 74D (UX-07): the empty "Load Ward Info From" list says why when other forms are on file', async ({ page }) => {
  await freshStartNoPassword(page);
  const listFor = async (type: string) => {
    await go(page, '/inventory-select');
    await page.click(`[data-form-action="add-ward-type"][data-inventory-type="${type}"]`);
    await page.locator('#addWardModal.show').waitFor();
    const text = (await page.locator('#carry-source-ward option').allTextContents()).join(' | ');
    await page.keyboard.press('Escape');
    await page.locator('#addWardModal').waitFor({ state: 'hidden' });
    return text;
  };
  expect(await listFor('guardian'), 'nothing on file').toBe('— No other forms yet to pull from —');
  await createWard(page, 'Inventory Ward', 'guardian');
  expect(await listFor('guardian'), 'only Inventories on file').toBe('— None of the forms on file can fill in an Initial Inventory —');
  expect(await listFor('annual'), 'an Inventory can fill in an Annual').toContain('Inventory Ward (Initial Inventory)');
});
