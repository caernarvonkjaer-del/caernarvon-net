import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 40C-A. The governing decision: a ward has NO default county until the
// user selects County on that ward's first filing Cover. That first explicit
// choice is stored on the canonical ward Party, and later filings for the same
// ward hydrate from it.
//
// This spec exists because of a coverage gap the milestone review found by
// reading the harness: every `fillMinimalValid*Ward()` helper injects a complete
// ward -- county included -- straight onto `window.D` via page.evaluate(),
// bypassing the Cover page entirely. So no existing e2e test drove the real
// county selector, which is the feature's actual entry point. These tests use
// the real control: typing into the combobox and clicking its dropdown option.

const COUNTY_INPUT = 'input[data-form-control="county"]';

test.describe('Milestone 40C-A: the Cover county selector establishes the ward county', () => {
  test('a brand-new filing starts with no county at all', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Blank County Ward', 'annual');

    await expect(page.locator(COUNTY_INPUT).first()).toHaveValue('');
    expect(await page.evaluate(() => (window as any).D.county)).toBe('');
    // And nothing downstream invents one.
    expect(await page.evaluate(() => (window as any).circuitForCounty((window as any).D.county))).toBeNull();
  });

  test('selecting a county through the real dropdown stores it on the filing and the ward Party', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Cover Select Ward', 'annual');

    const county = page.locator(COUNTY_INPUT).first();
    await county.click();
    await county.fill('Oran');
    // The filtered dropdown is the real affordance -- not a <select>.
    await page.locator('[data-form-mousedown="select-county"][data-county="Orange"]').click();
    await expect(county).toHaveValue('Orange');

    const stored = await page.evaluate(() => {
      const w = window as any;
      const filing = w.D;
      const party = filing.wardPartyId
        ? (w.caseFile.parties || []).find((p: any) => p.id === filing.wardPartyId)
        : null;
      return { filingCounty: filing.county, wardPartyId: filing.wardPartyId || null, partyCounty: party ? party.county : null };
    });

    expect(stored.filingCounty).toBe('Orange');
    expect(stored.wardPartyId, 'the Cover selection links a canonical ward Party').toBeTruthy();
    expect(stored.partyCounty, 'and stores the county on it').toBe('Orange');
  });

  test('a second filing for the same ward hydrates the county without re-asking', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Hydrating Ward', 'annual');

    const county = page.locator(COUNTY_INPUT).first();
    await county.click();
    await county.fill('Orange');
    await page.locator('[data-form-mousedown="select-county"][data-county="Orange"]').click();
    await expect(county).toHaveValue('Orange');

    // Create a second filing carrying over from the first, which is the path
    // that links the same ward Party.
    const second = await page.evaluate(() => {
      const w = window as any;
      const source = w.caseFile.wards.find((x: any) => x.wardName === 'Hydrating Ward');
      const fields = w.carryOverFields(source, 'annual');
      return { wardPartyId: fields.wardPartyId || null, county: fields.county };
    });

    expect(second.wardPartyId, 'the destination links to the same ward Party').toBeTruthy();
    expect(second.county, 'and hydrates the canonical county').toBe('Orange');
  });

  test('a county the ward Party does not have is not invented from the source filing', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Unlinked Source Ward', 'annual');

    // A filing that carries a county but whose ward Party has none -- the case
    // the decision forbids drawing from. Set the snapshot directly (not through
    // the Cover) precisely so no Party county is established.
    const result = await page.evaluate(() => {
      const w = window as any;
      const source = w.caseFile.wards.find((x: any) => x.wardName === 'Unlinked Source Ward');
      source.county = 'Pasco';
      w.ensureWardPartyForFiling(source);
      const fields = w.carryOverFields(source, 'annual');
      return { county: fields.county, sourceCounty: source.county };
    });

    expect(result.sourceCounty, 'the source snapshot is left alone').toBe('Pasco');
    expect(result.county, 'but it does not supply the destination county').toBe('');
  });

  test('a blank county blocks export and never prints a Sixth Circuit caption', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'No Caption Ward', 'annual');

    const state = await page.evaluate(() => {
      const w = window as any;
      return {
        county: w.D.county,
        caption: w.circuitCourtCaption ? w.circuitCourtCaption(w.D.county, true) : null,
        blocked: w.validateAnnual().some((m: string) => /County/i.test(m)),
      };
    });

    expect(state.county).toBe('');
    expect(state.blocked, 'County validation still blocks export').toBe(true);
    expect(state.caption).not.toMatch(/SIXTH/i);
    expect(state.caption).not.toMatch(/PINELLAS/i);
    expect(state.caption).toContain('COUNTY NOT SELECTED');
  });

  test('the real Pinellas selection still produces the correct Sixth Circuit caption', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Pinellas Caption Ward', 'annual');

    const county = page.locator(COUNTY_INPUT).first();
    await county.click();
    await county.fill('Pinellas');
    await page.locator('[data-form-mousedown="select-county"][data-county="Pinellas"]').click();
    await expect(county).toHaveValue('Pinellas');

    const caption = await page.evaluate(() => (window as any).circuitCourtCaption((window as any).D.county, true));
    expect(caption).toContain('SIXTH JUDICIAL CIRCUIT');
    expect(caption).toContain('PINELLAS COUNTY, FLORIDA');
  });
});
