import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 70, 70H: 70A's characterized finding. Preview & Export draws its
// own banner with the Help button, which asked window.isHelpPanelOpen() -- a
// function nothing defined -- so with the Help panel open it said
// aria-expanded="false". 70H made it ask the Help panel's module.
//
// master's ae9ecdc, carried after 70K, settled it the other way: inside a
// filing "?" opens the user guide for the page in a new tab (Milestone 48), so
// it claims no panel state at all -- open or not. This holds that with the
// panel open, which ae9ecdc's own test (user-guide-wiring.spec.ts) does not:
// the panel is opened where "?" still toggles it, on the dashboard, and stays
// open as the filer opens a filing and its preview.
test("with the Help panel open, a filing's \"?\" still says what it does -- it opens the user guide -- and claims no panel state", async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Help State', 'planAnnual');
  const id = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing.wardId);
  await page.evaluate(() => (window as any).GuardianForms.testing.activateFiling.close());
  await page.locator('#help-toggle-btn').first().click();
  await expect(page.locator('#help-panel')).toBeVisible();
  await expect(page.locator('#help-toggle-btn').first()).toHaveAttribute('aria-expanded', 'true');

  await page.evaluate((fid) => (window as any).GuardianForms.testing.activateFiling.open(fid), id);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
  await expect(page.locator('#help-panel')).toBeVisible();
  const help = page.locator('.pv-shell-actions #help-toggle-btn');
  await expect(help).toHaveCount(1);
  await expect(help).toHaveAttribute('aria-label', 'Help: open the user guide for this page (new tab)');
  for (const attr of ['aria-expanded', 'aria-controls', 'aria-haspopup']) await expect(help).not.toHaveAttribute(attr, /.*/);
});
