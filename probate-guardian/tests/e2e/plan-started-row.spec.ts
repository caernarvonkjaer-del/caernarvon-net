import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 61B. A plan collection row carrying only "secondary" fields -- a
// phone number, a ZIP, a relationship -- used to be invisible to all three
// surfaces at once: dropped from the filed PDF, raising no export error, and
// never mentioned by the sidebar. The PDF and validator halves are covered by
// tests/unit/plan-started-row.spec.js; computeNavChecks() lives in
// legacy-app.js, a classic script, so its half is proved here in the browser.
//
// What matters is not the specific colour of the dot but that the three
// surfaces agree about whether the filer has started that row.

test.describe('Milestone 61B: a secondary-only plan row is visible to every surface', () => {
  test('Annual Q1: a residence with only a phone number is seen by the sidebar and the export validator', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Started Row Ward', 'planAnnual');

    // A single residence row carrying nothing but a phone number -- exactly the
    // shape that used to disappear.
    await page.evaluate(() => {
      (window as any).GuardianForms.testing.patchFiling({ q1Residences: [{ name: '', street: '', cityStateZip: '', phone: '(727) 555-0100', facilityType: '', from: '', to: '' }] });
    });

    // The validator now sees the row and says what it needs, rather than
    // silently discarding it. Before 61B this produced only the generic
    // "at least one residence must be listed".
    const issues = await page.evaluate(async () =>
      (await (window as any).GuardianForms.testing.validate.open()).map((i: any) => (typeof i === 'string' ? i : i.message || '')));
    expect(issues.join('\n')).toMatch(/1\. Residences — row 1 needs a facility or owner name/);

    // And computeNavChecks() counts the page as started: it is not silently
    // "untouched" when the filer has typed into it. (Milestone 70, 70T: this
    // read the bridged startedRows() helper, which tests/unit/plan-started-row.spec.js
    // covers; the browser half now reads what the sidebar itself reports.)
    const startedByNav = await page.evaluate(() => !!(window as any).GuardianForms.testing.status.navChecks().incomplete['pa-p2']);
    expect(startedByNav, 'the sidebar must see the phone-only row as a started page').toBe(true);

    // The page is reported incomplete (it needs a name), never complete --
    // the failure this guards against is a green dot over dropped data.
    const complete = await page.evaluate(() => !!(window as any).GuardianForms.testing.status.navChecks().checks['pa-p2']);
    expect(complete, 'a row missing its required name must not read as complete').toBe(false);
  });

  test('a blank seeded residence row still leaves the page untouched, not started', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Blank Row Ward', 'planAnnual');

    const started = await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({ q1Residences: [{ name: '', street: '', cityStateZip: '', phone: '', facilityType: '', from: '', to: '' }] });
      return !!t.status.navChecks().incomplete['pa-p2'];
    });
    expect(started, 'an untouched seeded row must not count as started').toBe(false);
  });
});
