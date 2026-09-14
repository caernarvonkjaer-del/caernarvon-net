import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 43G: split from one test looping all seven filing types in a
// single run, where one early failure masked the other six results.

const shellSteps = /Help|Ward|Light & Dark|Filing Progress|Select Your Ward/;

for (const formType of ['guardian', 'simplified', 'annual', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor']) {
  test(`guided-tour filing steps remain attached to active sidebar navigation (${formType})`, async ({ page }) => {
    test.setTimeout(60000);
    await freshStartNoPassword(page);

    await page.evaluate((type) => (window as any).addWard(`Tour audit ${type}`, type), formType);
    // #walkthrough-title carries static placeholder text in the base HTML
    // until showWalkthroughStep() first overwrites it -- captured before
    // starting the tour so the poll below correctly waits for a real change
    // away from that placeholder, not just any non-null text.
    let previousTitle = await page.locator('#walkthrough-title').textContent();
    await page.evaluate(() => (window as any).startWalkthrough());

    // showWalkthroughStep() (src/legacy-app.js) repositions the tooltip and
    // updates #walkthrough-title inside its own internal setTimeout(...,300)
    // (to let a scrollIntoView({behavior:'smooth'}) settle first), but that
    // callback runs synchronously in one tick once it fires -- poll for the
    // actual title change (or the tour ending) instead of guessing a delay.
    while (await page.locator('#walkthrough-overlay.active').count()) {
      await page.waitForFunction(
        (prevTitle) => document.getElementById('walkthrough-title')?.textContent !== prevTitle
          || !document.getElementById('walkthrough-overlay')?.classList.contains('active'),
        previousTitle,
        { timeout: 5000 },
      );
      if (!(await page.locator('#walkthrough-overlay.active').count())) break;

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
      previousTitle = title;
    }
  });
}
