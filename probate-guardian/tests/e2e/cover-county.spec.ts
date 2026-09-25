import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';
import { extractPdfText } from './support/pdf-extract';

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

/**
 * Adds a Plan Annual through the real Add Filing dialog, carrying over from
 * the filing named `sourceName` (Annual -> Plan Annual is a pairing the
 * dialog offers), and returns the new filing's ward Party link and county.
 */
async function addCarriedPlanAnnual(page: Page, sourceName: string) {
  const sourceId = await page.evaluate((n) => (window as any).GuardianForms.testing.snapshot().caseFile.wards
    .find((x: any) => x.wardName === n).wardId, sourceName);
  await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.openDialog('planAnnual'));
  await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
  await page.fill('#new-ward-name', sourceName);
  await page.selectOption('#carry-source-ward', sourceId);
  await page.click('#addWardModal [data-modal-action="add-ward"]');
  await page.locator('#addWardModal').waitFor({ state: 'hidden' });
  return page.evaluate((src) => {
    const snap = (window as any).GuardianForms.testing.snapshot();
    return {
      wardPartyId: snap.filing.wardPartyId || null,
      county: snap.filing.county,
      sourceCounty: snap.caseFile.wards.find((x: any) => x.wardId === src).county,
      inventoryType: snap.filing.inventoryType,
    };
  }, sourceId);
}

/**
 * The open Annual filing's court PDF as text -- the caption a filer would
 * print -- and whether its export gate blocks on County.
 */
async function annualPdfCaption(page: Page) {
  const out = await page.evaluate(async () => {
    const t = (window as any).GuardianForms.testing;
    const { buildAnnualAccountingModel, generateCourtFormPdf } = await t.generateOutput.annualPdf();
    const doc = await generateCourtFormPdf(buildAnnualAccountingModel(t.snapshot().filing));
    const issues = await t.validate.open();
    return {
      county: t.field('county'),
      rawPdf: doc.output(),
      blocked: issues.some((m: any) => /County/i.test(String(m?.message ?? m))),
    };
  });
  return { county: out.county, blocked: out.blocked, text: await extractPdfText(out.rawPdf) };
}

test.describe('Milestone 40C-A: the Cover county selector establishes the ward county', () => {
  test('a brand-new filing starts with no county at all', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Blank County Ward', 'annual');

    await expect(page.locator(COUNTY_INPUT).first()).toHaveValue('');
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('county'))).toBe('');
    // And nothing downstream invents one: the court PDF names no circuit.
    const { text } = await annualPdfCaption(page);
    expect(text).not.toMatch(/JUDICIAL CIRCUIT/);
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
      const filing = w.GuardianForms.testing.snapshot().filing;
      const party = filing.wardPartyId
        ? (w.GuardianForms.testing.snapshot().caseFile.parties || []).find((p: any) => p.id === filing.wardPartyId)
        : null;
      return { filingCounty: filing.county, wardPartyId: filing.wardPartyId || null, partyCounty: party ? party.county : null };
    });

    expect(stored.filingCounty).toBe('Orange');
    expect(stored.wardPartyId, 'the Cover selection links a canonical ward Party').toBeTruthy();
    expect(stored.partyCounty, 'and stores the county on it').toBe('Orange');
  });

  // Milestone 50H. The county dropdown previously had no keyboard route at
  // all: type-then-Tab discarded whatever was highlighted, since Tab-blur
  // closes the dropdown without committing. Selecting entirely by keyboard
  // must reach the exact same commit path a mouse click does -- asserting
  // only the input's value or only D.county would still pass a broken
  // "set .value directly" shortcut that skips commitCoverCounty() and
  // silently never establishes the canonical ward-Party county; the third
  // assertion below is what actually proves that didn't happen.
  test('selecting a county entirely by keyboard establishes the same canonical ward Party county as a mouse click', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Keyboard County Ward', 'annual');

    const county = page.locator(COUNTY_INPUT).first();
    await county.click();
    await county.pressSequentially('Pasc');
    await expect(page.locator('[data-form-mousedown="select-county"][data-county="Pasco"]')).toBeVisible();
    await county.press('ArrowDown');
    await county.press('Enter');

    await expect(county).toHaveValue('Pasco');
    await expect(page.locator('.county-combobox-dropdown.show')).toHaveCount(0); // closes on commit, no 150ms-timer race

    const stored = await page.evaluate(() => {
      const w = window as any;
      const filing = w.GuardianForms.testing.snapshot().filing;
      const party = filing.wardPartyId ? (w.GuardianForms.testing.snapshot().caseFile.parties || []).find((p: any) => p.id === filing.wardPartyId) : null;
      return { filingCounty: filing.county, wardPartyId: filing.wardPartyId || null, partyCounty: party ? party.county : null };
    });
    expect(stored.filingCounty).toBe('Pasco');
    expect(stored.wardPartyId, 'the keyboard path links a canonical ward Party too').toBeTruthy();
    expect(stored.partyCounty, 'and reaches commitCoverCounty(), not just the input\'s .value').toBe('Pasco');
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
    const second = await addCarriedPlanAnnual(page, 'Hydrating Ward');

    expect(second.inventoryType).toBe('planAnnual');
    expect(second.wardPartyId, 'the destination links to the same ward Party').toBeTruthy();
    expect(second.county, 'and hydrates the canonical county').toBe('Orange');
  });

  test('a county the ward Party does not have is not invented from the source filing', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Unlinked Source Ward', 'annual');

    // A filing that carries a county but whose ward Party has none -- the case
    // the decision forbids drawing from. Setup (D9): the county is patched onto
    // the filing, not chosen on the Cover, precisely so no Party county is
    // established; the Party itself is then linked with no county.
    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({ county: 'Pasco' });
      t.updateSharedRecords.ensureWardPartyForFiling(t.snapshot().filing.wardId);
    });
    const result = await addCarriedPlanAnnual(page, 'Unlinked Source Ward');

    expect(result.inventoryType).toBe('planAnnual');
    expect(result.sourceCounty, 'the source snapshot is left alone').toBe('Pasco');
    expect(result.county, 'but it does not supply the destination county').toBe('');
  });

  test('a blank county blocks export and never prints a Sixth Circuit caption', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'No Caption Ward', 'annual');

    // The caption is read from the court PDF itself. Until Milestone 70's 70T
    // this test read legacy-app.js's circuitCourtCaption(), which nothing in
    // the app calls -- so the caption a filer actually gets went unchecked.
    const state = await annualPdfCaption(page);

    expect(state.county).toBe('');
    expect(state.blocked, 'County validation still blocks export').toBe(true);
    expect(state.text).not.toMatch(/SIXTH/i);
    expect(state.text).not.toMatch(/PINELLAS/i);
    expect(state.text).toContain('COUNTY NOT SELECTED');
  });

  test('the real Pinellas selection still produces the correct Sixth Circuit caption', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Pinellas Caption Ward', 'annual');

    const county = page.locator(COUNTY_INPUT).first();
    await county.click();
    await county.fill('Pinellas');
    await page.locator('[data-form-mousedown="select-county"][data-county="Pinellas"]').click();
    await expect(county).toHaveValue('Pinellas');

    const { text: caption } = await annualPdfCaption(page);
    expect(caption).toContain('SIXTH JUDICIAL CIRCUIT');
    expect(caption).toContain('PINELLAS COUNTY, FLORIDA');
  });
});
