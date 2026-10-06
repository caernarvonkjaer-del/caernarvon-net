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
  test('a blocked guardian signature card gets a working jump-to-field link from Print Preview', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PS Jump Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    // Milestone 73A: a guardian's saved "/s/" is asked again (a guardian
    // signs by hand or by stamp) -- a real, findable signature issue; a
    // blank choice is Unsigned and produces none.
    await page.evaluate(() => {
      const d = (window as any).GuardianForms.testing.snapshot().filing;
      d.planGuardians[0].signatureState = 'typed';
      d.planGuardians[0].signatureDate = '';
      (window as any).GuardianForms.testing.replaceFiling(d);
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

    const blockedPanel = page.locator('.pdf-preview-blocked');
    await expect(blockedPanel).toBeVisible();
    // The panel's "Show what is missing" list is collapsed by default.
    await blockedPanel.locator('.pdf-preview-blocked-details summary').click();

    const jumpLink = blockedPanel.locator('[data-form-action="jump-to-field"]', { hasText: 'choose Unsigned' });
    await expect(jumpLink).toBeVisible();
    await jumpLink.click();

    // Print Preview is its own route (/print) -- clicking must navigate
    // away to the Signatures page and focus the real field (the guardian's
    // first choice, Unsigned), not just look for it in the (wrong) current DOM.
    await expect(page.locator('#sigstate_planGuardians_0_none')).toBeFocused();
  });

  test('a blocked Guardian Inventory Preparer card resolves through its own section-embedded convention', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'GI Jump Ward', 'guardian');
    // A brand-new filing already has plenty of other blocking errors --
    // this only needs the Preparer's tri-state choice to also produce one.
    await page.evaluate(() => { (window as any).GuardianForms.testing.patchFiling({ 'preparer.signatureState': 'typed' }); });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

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
