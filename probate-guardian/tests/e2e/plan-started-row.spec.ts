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
      const D = (window as any).D;
      D.q1Residences = [{ name: '', street: '', cityStateZip: '', phone: '(727) 555-0100', facilityType: '', from: '', to: '' }];
    });

    // The validator now sees the row and says what it needs, rather than
    // silently discarding it. Before 61B this produced only the generic
    // "at least one residence must be listed".
    const issues = await page.evaluate(() => {
      const validate = (window as any).validatePlanAnnual;
      return validate ? validate().map((i: any) => (typeof i === 'string' ? i : i.message || '')) : [];
    });
    expect(issues.join('\n')).toMatch(/1\. Residences — row 1 needs a facility or owner name/);

    // And computeNavChecks() counts it as started, from the same rule: the
    // page is not silently "untouched" when the filer has typed into it.
    const startedByNav = await page.evaluate(() => {
      const started = (window as any).startedRows((window as any).D.q1Residences);
      return started.length;
    });
    expect(startedByNav, 'the bridged predicate must see the phone-only row').toBe(1);

    // The page is reported incomplete (it needs a name), never complete --
    // the failure this guards against is a green dot over dropped data.
    const complete = await page.evaluate(() => !!(window as any).computeNavChecks().checks['pa-p2']);
    expect(complete, 'a row missing its required name must not read as complete').toBe(false);
  });

  test('a blank seeded residence row still leaves the page untouched, not started', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Blank Row Ward', 'planAnnual');

    const started = await page.evaluate(() => {
      const D = (window as any).D;
      D.q1Residences = [{ name: '', street: '', cityStateZip: '', phone: '', facilityType: '', from: '', to: '' }];
      return (window as any).startedRows(D.q1Residences).length;
    });
    expect(started, 'an untouched seeded row must not count as started').toBe(0);
  });
});
