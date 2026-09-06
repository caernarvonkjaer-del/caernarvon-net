import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

const shellSteps = /Help|Ward|Light & Dark|Filing Progress|Select Your Ward/;

test('guided-tour filing steps remain attached to active sidebar navigation', async ({ page }) => {
  test.setTimeout(180000);
  await freshStartNoPassword(page);

  for (const formType of ['guardian', 'simplified', 'annual', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor']) {
    await page.evaluate((type) => (window as any).addWard(`Tour audit ${type}`, type), formType);
    await page.evaluate(() => (window as any).startWalkthrough());

    while (await page.locator('#walkthrough-overlay.active').count()) {
      await page.waitForTimeout(350);
      const title = await page.locator('#walkthrough-title').textContent();
      if (title && !shellSteps.test(title)) {
        const attachedToMenu = await page.locator('#walkthrough-overlay .walkthrough-highlight').evaluate((highlight) => {
          const highlightRect = highlight.getBoundingClientRect();
          return [...document.querySelectorAll('#sidebar .nav-link-item')]
            .some((item) => {
              const itemRect = item.getBoundingClientRect();
              return highlightRect.left < itemRect.right && highlightRect.right > itemRect.left
                && highlightRect.top < itemRect.bottom && highlightRect.bottom > itemRect.top;
            });
        });
        expect(attachedToMenu, `${formType}: ${title}`).toBe(true);
      }
      await page.locator('[data-shell-action="next-walkthrough"]').click();
    }
  }
});
