import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 70, 70H: 70A's characterized finding. Preview & Export draws its
// own banner with the Help button, and asked window.isHelpPanelOpen() whether
// the panel was open -- a function nothing defined. With the Help panel open
// the button said aria-expanded="false": a screen reader announced the panel
// closed. The Help panel's module answers now (isHelpPanelOpen()).
//
// "?" inside a filing opens the user guide for the page (Milestone 48), so the
// panel is opened where "?" still toggles it, on the dashboard, and stays open
// as the filer opens a filing and its preview.
test('Preview & Export says the Help panel is open when it is', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Help State', 'planAnnual');
  const id = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing.wardId);
  await page.evaluate(() => (window as any).GuardianForms.testing.activateFiling.close());
  await page.locator('#help-toggle-btn').first().click();
  await expect(page.locator('#help-panel')).toBeVisible();

  await page.evaluate((fid) => (window as any).GuardianForms.testing.activateFiling.open(fid), id);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
  await expect(page.locator('#help-panel')).toBeVisible();
  const help = page.locator('.pv-shell-actions #help-toggle-btn');
  await expect(help).toHaveCount(1);
  await expect(help).toHaveAttribute('aria-expanded', 'true');
});
