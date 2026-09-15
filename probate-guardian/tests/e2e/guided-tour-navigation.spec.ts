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

test('guided-tour dashboard sequence covers all dashboard steps from help panel', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate((type) => (window as any).addWard('Tour Dashboard Ward', type), 'annual');
  await page.evaluate(() => (window as any).navigate('/dashboard'));

  const main = page.locator('#main-content');
  await main.locator('[data-dashboard-bound="true"]').waitFor();
  await expect(page).toHaveURL(/#\/dashboard/);

  // Open Help panel
  await page.locator('#help-toggle-btn').click();
  await expect(page.locator('#help-panel')).toBeVisible();

  // Click Start guided tour inside the help panel
  await page.locator('#help-panel [data-shell-action="start-walkthrough"]').click();

  // 1. Closes the Help panel
  await expect(page.locator('#help-panel')).toBeHidden();

  // 2. Activates the walkthrough overlay
  await expect(page.locator('#walkthrough-overlay')).toHaveClass(/active/);

  // 3. Starts at "Help & Guidance" and advances through all dashboard steps without skipping
  const expectedSteps = [
    { title: 'Help & Guidance', selector: '#help-toggle-btn' },
    { title: 'Create New Filing', selector: '#new-ward-btn' },
    { title: 'Compliance Overview', selector: '.dashboard-summary-strip' },
    { title: 'Search & Filter', selector: '#dashboard-search' },
    { title: 'Light & Dark Appearance', selector: '#theme-toggle-btn' },
    { title: 'All Filings Queue', selector: '.dashboard-triage-queue, .dashboard-empty' },
  ];

  for (let i = 0; i < expectedSteps.length; i++) {
    const step = expectedSteps[i];
    await page.waitForFunction(
      (expectedTitle) => document.getElementById('walkthrough-title')?.textContent?.includes(expectedTitle),
      step.title,
      { timeout: 5000 },
    );
    await expect(page.locator('#walkthrough-title')).toContainText(step.title);
    await expect(page.locator('#walkthrough-progress')).toHaveText(`${i + 1}/${expectedSteps.length}`);

    // Verify highlight is attached to the target element
    const highlightAttached = await page.locator('#walkthrough-overlay .walkthrough-highlight').evaluate((hl, sel) => {
      const target = document.querySelector(sel);
      if (!target) return false;
      const targetRect = target.getBoundingClientRect();
      const hlRect = hl.getBoundingClientRect();
      return Math.abs(hlRect.left - (targetRect.left - 6)) <= 2
        && Math.abs(hlRect.top - (targetRect.top - 6)) <= 2;
    }, step.selector);
    expect(highlightAttached, `Highlight attached to ${step.selector}`).toBe(true);

    // Advance to next step
    await page.locator('[data-shell-action="next-walkthrough"]').click();
  }

  // After the last step, walkthrough overlay deactivates
  await expect(page.locator('#walkthrough-overlay')).not.toHaveClass(/active/);
});
