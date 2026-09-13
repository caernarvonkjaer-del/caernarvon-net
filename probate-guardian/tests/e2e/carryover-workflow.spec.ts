import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 40C-F / 40C-G2. Exercises the REAL Initial-Inventory to
// Simplified-Accounting path through the eligibility modal -- the redirect that
// makes this flow awkward to reason about, because answering "no" to either
// eligibility question creates an Annual Accounting instead of the Simplified
// one the user asked for, and the carry-source choice has to survive that.
//
// Covers, per the milestone's verification plan: nested attorney fields, the
// selected-source copy, linked ward-Party county hydration, first-filing blank
// behaviour, accurate helper copy, and cancellation atomicity.

const COUNTY_INPUT = 'input[data-form-control="county"]';

/** Creates a Guardian Inventory with the nested attorney shape filled in. */
async function createInventorySource(page: Page, wardName: string, county: string | null) {
  await createWard(page, wardName, 'guardian');
  await page.evaluate((name) => {
    const w = window as any;
    w.D.attorney = {
      ...(w.D.attorney || {}),
      name: 'Nina Nested, Esq.',
      barNumber: '00456789',
      phone: '727-555-0142',
      streetAddress: '400 Cleveland St',
      cityStateZip: 'Clearwater, FL 33755',
    };
    w.D.guardianName = 'Gale Guardian';
    w.D.wardName = name;
  }, wardName);

  if (county) {
    // Through the real Cover control, so the ward Party county is established
    // the way a filer would establish it.
    const input = page.locator(COUNTY_INPUT).first();
    await input.click();
    await input.fill(county);
    await page.locator(`[data-form-mousedown="select-county"][data-county="${county}"]`).click();
    await expect(input).toHaveValue(county);
  }
  await page.evaluate(() => (window as any).flushPendingSave());
  return page.evaluate(() => (window as any).caseFile.activeWardId);
}

/** Drives the eligibility modal to completion, capturing any dialog text. */
async function confirmEligibility(page: Page, wardName: string, sourceWardId: string, qualifies: boolean) {
  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });

  await page.evaluate(({ name, srcId }) => (window as any).showSimplifiedEligibilityModal(name, srcId),
    { name: wardName, srcId: sourceWardId });
  await page.locator('#simplifiedEligibilityModal.show').waitFor({ state: 'visible' });
  await page.selectOption('#elig-depository', qualifies ? 'Yes' : 'No');
  await page.selectOption('#elig-only-transactions', 'Yes');
  await expect(page.locator('#elig-carry-source-ward')).toHaveValue(sourceWardId);
  await page.click('#simplifiedEligibilityModal [data-modal-action="confirm-simplified-eligibility"]');
  await page.locator('#simplifiedEligibilityModal').waitFor({ state: 'hidden' });
  return dialogs;
}

test.describe('Milestone 40C-F: carryover through the eligibility-modal redirect', () => {
  test('a qualifying filing carries nested attorney details, links the ward Party, and hydrates county', async ({ page }) => {
    await freshStartNoPassword(page);
    const sourceId = await createInventorySource(page, 'Nested Carry Ward', 'Orange');
    const dialogs = await confirmEligibility(page, 'Nested Carry Ward', sourceId, true);

    const dest = await page.evaluate(() => {
      const w = window as any;
      const d = w.D;
      const party = d.wardPartyId ? (w.caseFile.parties || []).find((p: any) => p.id === d.wardPartyId) : null;
      return {
        inventoryType: d.inventoryType,
        attorneyName: d.attorney_name || d.attorney,
        attorneyBar: d.attorney_barNumber || d.attorney_bar || d.attorneyBar,
        attorneyPhone: d.attorney_phone || d.attorneyPhone,
        county: d.county,
        wardPartyId: d.wardPartyId || null,
        partyCounty: party ? party.county : null,
        attorneyCounty: d.attorney_county || '',
      };
    });

    expect(dest.inventoryType).toBe('simplified');
    // The nested shape the old flat-only chains dropped entirely.
    expect(dest.attorneyName).toBe('Nina Nested, Esq.');
    expect(dest.attorneyBar).toBe('00456789');
    expect(dest.attorneyPhone).toBe('727-555-0142');
    // Same canonical ward Party, county from that Party.
    expect(dest.wardPartyId).toBeTruthy();
    expect(dest.partyCounty).toBe('Orange');
    expect(dest.county).toBe('Orange');
    // attorney_county is a separate field and is never filled from the ward's.
    expect(dest.attorneyCounty).toBe('');

    // 40C-G2: the copy names the real source type and says county was restored.
    const note = dialogs.join('\n');
    expect(note).toContain('Initial Inventory');
    expect(note).toContain('restored');
    expect(note).toContain('Orange');
    expect(note, 'must not claim a Simplified Annual Plan source').not.toContain('Simplified Annual Plan');
  });

  test('a source whose ward has no county on record says so instead of implying carryover', async ({ page }) => {
    await freshStartNoPassword(page);
    const sourceId = await createInventorySource(page, 'No County Ward', null);
    const dialogs = await confirmEligibility(page, 'No County Ward', sourceId, true);

    expect(await page.evaluate(() => (window as any).D.county)).toBe('');
    const note = dialogs.join('\n');
    expect(note).toContain('Initial Inventory');
    expect(note).toContain('still needs to be selected');
  });

  test('the non-qualifying redirect keeps the source and reports both facts in one message', async ({ page }) => {
    await freshStartNoPassword(page);
    const sourceId = await createInventorySource(page, 'Redirect Ward', 'Orange');
    const dialogs = await confirmEligibility(page, 'Redirect Ward', sourceId, false);

    const dest = await page.evaluate(() => {
      const w = window as any;
      return {
        inventoryType: w.D.inventoryType,
        attorneyName: w.D.attorney || w.D.attorney_name,
        county: w.D.county,
        wardPartyId: w.D.wardPartyId || null,
      };
    });

    // The redirect produced an Annual Accounting, and the carry-source choice
    // still applied to the form the user actually ended up with.
    expect(dest.inventoryType).toBe('annual');
    expect(dest.attorneyName).toBe('Nina Nested, Esq.');
    expect(dest.county).toBe('Orange');
    expect(dest.wardPartyId).toBeTruthy();

    const note = dialogs.join('\n');
    expect(note).toContain('does not qualify');
    expect(note).toContain('Initial Inventory');
    expect(note).toContain('Orange');
  });

  test('cancelling the eligibility flow creates no destination and changes no source data', async ({ page }) => {
    await freshStartNoPassword(page);
    const sourceId = await createInventorySource(page, 'Cancelled Ward', 'Orange');

    const before = await page.evaluate(() => {
      const w = window as any;
      return { wardCount: w.caseFile.wards.length, sources: JSON.stringify(w.caseFile.wards) };
    });

    await page.evaluate(({ name, srcId }) => (window as any).showSimplifiedEligibilityModal(name, srcId),
      { name: 'Cancelled Ward', srcId: sourceId });
    await page.locator('#simplifiedEligibilityModal.show').waitFor({ state: 'visible' });
    await page.selectOption('#elig-depository', 'Yes');
    await page.selectOption('#elig-only-transactions', 'Yes');
    // Dismiss instead of confirming.
    await page.evaluate(() => (window as any).closeModal('simplifiedEligibilityModal'));
    await page.locator('#simplifiedEligibilityModal').waitFor({ state: 'hidden' });

    const after = await page.evaluate(() => {
      const w = window as any;
      return { wardCount: w.caseFile.wards.length, sources: JSON.stringify(w.caseFile.wards) };
    });

    expect(after.wardCount, 'no partial destination filing exists').toBe(before.wardCount);
    expect(after.sources, 'source data is untouched').toBe(before.sources);
  });

  test('a later Cover edit on the new filing does not rewrite the source filing', async ({ page }) => {
    await freshStartNoPassword(page);
    const sourceId = await createInventorySource(page, 'Auditable Ward', 'Orange');
    await confirmEligibility(page, 'Auditable Ward', sourceId, true);

    const county = page.locator(COUNTY_INPUT).first();
    await county.click();
    await county.fill('Pasco');
    await page.locator('[data-form-mousedown="select-county"][data-county="Pasco"]').click();
    await expect(county).toHaveValue('Pasco');

    const state = await page.evaluate((srcId) => {
      const w = window as any;
      const source = w.caseFile.wards.find((x: any) => x.wardId === srcId);
      const party = w.D.wardPartyId ? (w.caseFile.parties || []).find((p: any) => p.id === w.D.wardPartyId) : null;
      return { sourceCounty: source.county, destCounty: w.D.county, partyCounty: party ? party.county : null };
    }, sourceId);

    // The source keeps its own auditable snapshot; only the canonical
    // forward-looking value moves.
    expect(state.sourceCounty).toBe('Orange');
    expect(state.destCounty).toBe('Pasco');
    expect(state.partyCounty).toBe('Pasco');
  });
});
