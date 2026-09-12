import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanSimplifiedWard } from './support/target';

// Milestone 39-E: Print Preview's blocked panel (pdf-preview.js's
// blockedPanelHTML()) used its own ad hoc "<section> — <detail>" string
// split, with no route/path resolution at all -- unlike every in-form
// "Complete these items before continuing" guidance box
// (section-status.js's renderLocalSectionGuidance()), which has called the
// shared adaptValidationErrors()/focusFieldByPath() pair since Milestone 24.
// A filer blocked on an incomplete signature card at Print Preview specifically
// had no working link to the field, just prose. This proves the fix: the
// blocked panel now resolves the same route/path every other guidance
// surface does, and the existing global [data-form-action="jump-to-field"]
// click delegation (src/form-events.js) picks it up with no new listener.
test.describe('Milestone 39-E: Print Preview missing-signature navigation', () => {
  test('a blocked "/s/" Signed signature card gets a working jump-to-field link from Print Preview', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PS Jump Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    // Explicit "typed" state with a blank date is a real, findable
    // checkSignatureState() error -- a blank date with no signatureState at
    // all would legitimately infer Unsigned and produce no error.
    await page.evaluate(() => {
      const d = (window as any).D;
      d.planGuardians[0].signatureState = 'typed';
      d.planGuardians[0].signatureDate = '';
    });
    await page.evaluate(() => (window as any).navigate('/print'));

    const blockedPanel = page.locator('.pdf-preview-blocked');
    await expect(blockedPanel).toBeVisible();
    // The panel's "Show what is missing" list is collapsed by default.
    await blockedPanel.locator('.pdf-preview-blocked-details summary').click();

    const jumpLink = blockedPanel.locator('[data-form-action="jump-to-field"]', { hasText: 'date signed' });
    await expect(jumpLink).toBeVisible();
    await jumpLink.click();

    // Print Preview is its own route (/print) -- clicking must navigate
    // away to the Signatures page and focus the real field, not just look
    // for it in the (wrong) current DOM.
    await expect(page.locator('[data-form-path="planGuardians.0.signatureDate"]')).toBeFocused();
  });

  test('a blocked Guardian Inventory Preparer card resolves through its own section-embedded convention', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'GI Jump Ward', 'guardian');
    // A brand-new filing already has plenty of other blocking errors --
    // this only needs the Preparer's tri-state choice to also produce one.
    await page.evaluate(() => { (window as any).D.preparer.signatureState = 'typed'; });
    await page.evaluate(() => (window as any).navigate('/print'));

    const blockedPanel = page.locator('.pdf-preview-blocked');
    await expect(blockedPanel).toBeVisible();
    await blockedPanel.locator('.pdf-preview-blocked-details summary').click();

    // Guardian Inventory folds the role into the section itself
    // ("D-2 Preparer", not "D-2" + a separate "Preparer" role label) --
    // proving this resolves correctly here covers the different message
    // shape checkSignatureState()'s roleLabel: '' accommodation produces.
    const jumpLink = blockedPanel.locator('[data-form-action="jump-to-field"]', { hasText: /Preparer.*date signed/ });
    await expect(jumpLink).toBeVisible();
    await jumpLink.click();

    await expect(page.locator('[data-bind="preparer.signatureDate"]')).toBeFocused();
  });
});
