import { expect, test } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 63D. The preparer-authorization note -- "confirm you have that
// party's actual legal authorization to sign on their behalf" -- exists for the
// person operating the app, who may not be the person signing. It belongs at the
// top of every page where a signature can be attached, on every form, and nowhere
// else. It had been placed next to the perjury statement instead, which put it on
// 6 of the 16 signing pages (three of them below the fold), on none of the ten
// attorney/preparer/certificate pages, and on one page that captures no signature.
//
// tests/unit/preparer-note.spec.js derives the same rule from source and is the
// fast tripwire. This is the rendered proof: for each filing type, walk every page
// its sidebar offers and check, in a browser, that a page with a signature control
// shows the note as the first element under its <h1>, exactly once, and that no
// other page shows it. The page list comes from the sidebar, so a new page or a
// new filing type is covered without editing this file.

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
  test(`${label}: the preparer note is first under the heading on every signing page, and nowhere else`, async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(([t]) => (window as any).addWard(`Note ${t}`, t), [type]);

    const routes: string[] = await page.evaluate(() => [
      ...new Set([...document.querySelectorAll('nav [data-page], nav [data-route]')]
        .map((el) => el.getAttribute('data-page') || el.getAttribute('data-route'))
        .filter(Boolean) as string[]),
    ]);
    // The print page is a preview of the whole filing, not a form page.
    const pagesToWalk = routes.filter((route) => route !== '/print');
    expect(pagesToWalk.length, 'the sidebar should offer this filing type\'s pages').toBeGreaterThan(1);

    const signing: string[] = [];
    for (const route of pagesToWalk) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.locator('#main-content h1').first().waitFor();
      const facts = await page.evaluate(() => {
        const main = document.querySelector('#main-content') as HTMLElement;
        const h1 = main.querySelector('h1');
        const note = main.querySelector('.preparer-note');
        return {
          heading: h1?.textContent?.trim().slice(0, 50) || '',
          signatureControls: main.querySelectorAll('.signature-state-control').length,
          notes: main.querySelectorAll('.preparer-note').length,
          firstUnderHeading: !!note && h1?.nextElementSibling === note,
        };
      });

      if (facts.signatureControls > 0) {
        signing.push(route);
        expect(facts.notes, `${route} "${facts.heading}" captures a signature, so it must show the note exactly once`).toBe(1);
        expect(facts.firstUnderHeading, `${route} "${facts.heading}": the note must be the first element under the <h1>, not below the fold`).toBe(true);
      } else {
        expect(facts.notes, `${route} "${facts.heading}" captures no signature, so "on this page" would be untrue`).toBe(0);
      }
    }

    expect(signing.length, `the walk must find at least one signing page for ${label}`).toBeGreaterThan(0);
  });
}
