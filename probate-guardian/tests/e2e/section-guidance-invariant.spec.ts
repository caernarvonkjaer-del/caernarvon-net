import { expect, test } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 63A -- the class-level guard.
//
// On a Guardian Inventory the sidebar marked six pages incomplete -- Cover and
// D-1..D-5 -- and counted them in "16 of 17 sections complete", but those pages
// never said what was missing. The yellow "Complete these items" box was drawn
// only when a page's Next button was gated, and the gate's list of pages was
// narrower than the sidebar's. Every test that existed passed while the bug was
// present: the marks were tested, the explanation box was tested only on the
// pages that had one, and the D-page tests bypassed the page entirely.
//
// This is the invariant those tests were missing, stated once and walked per
// filing type: a page whose sidebar mark says "incomplete" must explain itself --
// the box is there, it lists at least one item the filer can jump to (not just a
// generic sentence), and its advice fits the page. It is derived from the DOM the
// filer sees (the sidebar marks and the page), not from the mechanism, so it
// holds however the mechanism is written, and a new page or filing type is
// covered without editing this file.
//
// The advice must fit the page: "Add at least one item, or check the box
// verifying there are none" is right only on a page that HAS such a checkbox. On
// a Cover, a signature page or a bond page it told the filer to tick a box that
// does not exist.
const VERIFY_NONE = 'Add at least one item, or check the box verifying there are none, before continuing.';
const REQUIRED_ITEMS = 'Complete the required items on this page before continuing.';

const TYPES = [
  { label: 'Initial Inventory', type: 'guardian' },
  { label: 'Annual Accounting', type: 'annual' },
  { label: 'Simplified Accounting', type: 'simplified' },
  { label: 'Plan - Simplified', type: 'planSimplified' },
  { label: 'Plan - Initial', type: 'planInitial' },
  { label: 'Plan - Annual', type: 'planAnnual' },
  { label: 'Plan - Minor', type: 'planMinor' },
] as const;

for (const { label, type } of TYPES) {
  test(`${label}: every page the sidebar marks incomplete explains itself, in words that fit the page`, async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(([t]) => (window as any).addWard(`Guidance ${t}`, t), [type]);

    // What the filer sees in the sidebar on a blank filing: a mark per page.
    const marks: Array<{ nav: string; route: string; incomplete: boolean }> = await page.evaluate(() =>
      [...document.querySelectorAll('[data-nav]')]
        .map((el) => ({
          nav: el.getAttribute('data-nav') || '',
          route: el.getAttribute('data-route') || el.getAttribute('data-page') || '',
          incomplete: !!el.querySelector('.nav-check.incomplete'),
        }))
        .filter((m) => m.route && m.route !== '/print'));
    const incomplete = marks.filter((m) => m.incomplete);
    expect(incomplete.length, `a blank ${label} should have pages marked incomplete`).toBeGreaterThan(1);

    const problems: string[] = [];
    for (const mark of incomplete) {
      await page.evaluate((r) => (window as any).navigate(r), mark.route);
      await page.locator('#main-content h1').first().waitFor();

      const guidance = page.locator('#page-local-guidance .section-local-guidance');
      const shown = await guidance.count();
      const at = `${mark.route} [${mark.nav}]`;
      if (shown === 0) {
        problems.push(`${at}: marked incomplete but the page shows no explanation`);
        continue;
      }
      const hasVerifyNoneBox = (await page.locator('#main-content .schedule-empty-check').count()) > 0;
      const next = page.locator('#page-next-btn');
      const nextBlocked = (await next.count()) > 0 && (await next.isDisabled());
      const title = nextBlocked ? ((await next.getAttribute('title')) ?? '') : '';
      const boxText = (await guidance.first().innerText()).replace(/\s+/g, ' ');

      // The box must give the filer something to act on. A blank schedule has no
      // field to jump to yet -- its whole remedy is "add an item or tick the none
      // box", which is exactly what the sentence says -- so there the sentence is
      // the content. Anywhere else (no such box on the page) it must list the
      // missing items, each a link that jumps to the field; a page that shows only
      // a generic sentence tells the filer to do something without saying what.
      const jumpItems = await guidance.locator('button[data-form-action="jump-to-field"]').count();
      if (jumpItems === 0 && !(hasVerifyNoneBox && boxText.includes(VERIFY_NONE))) {
        problems.push(`${at}: the explanation lists nothing the filer can jump to — only a generic sentence`);
      }

      // Advice must fit the page: the "check the box" sentence belongs only where the box is.
      if (!hasVerifyNoneBox && /check the box verifying there are none/i.test(`${title} ${boxText}`)) {
        problems.push(`${at}: tells the filer to tick a "none" box, but this page has no such box`);
      }
      if (nextBlocked && title !== (hasVerifyNoneBox ? VERIFY_NONE : REQUIRED_ITEMS)) {
        problems.push(`${at}: Next is disabled with the wrong tooltip (${JSON.stringify(title)})`);
      }
    }

    expect(problems, `pages that fail the invariant:\n  ${problems.join('\n  ')}`).toEqual([]);
  });
}
