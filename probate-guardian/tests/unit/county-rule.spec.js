// Milestone 73F part 3: a filing's county must be a Florida county, on all
// nine forms (decision 73F-2). Every form checked only that it wasn't blank,
// so "P", "Pinelas" or "Zzyzx" passed everywhere and the PDF printed no court
// heading. The common ways a county is written are read as the official name
// (73F-N3); anything else is named, and -- like a blank county -- can still be
// overridden at Preview (73F-N2, the requester's choice).
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
globalThis.window = globalThis.window || globalThis;

const { canonicalFloridaCounty, circuitForCounty } = await import('../../src/core/pdf/circuit-lookup.js');
const { countyProblem, isFloridaCounty } = await import('../../src/core/validation/county-rule.js');
const { normalizeCountyName } = await import('../../src/core/navigation/ward-county.js');
const { normalizeWardData } = await import('../../src/core/filing/normalize-filing.js');
const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { engineChecks } = await import('../../src/core/validation/engines/index.js');
const { evaluateFiling } = await import('../../src/core/validation/engines/index.js');
const { getFilingReadiness } = await import('../../src/core/filing/readiness-config.js');

describe('the official name, written any of the common ways (73F-N3)', () => {
  it('reads variants as the official name', () => {
    const cases = [['St Lucie', 'St. Lucie'], ['saint lucie', 'St. Lucie'], ['Saint Johns', 'St. Johns'], ['Miami Dade', 'Miami-Dade'],
      ['miami-dade county', 'Miami-Dade'], ['Dade', 'Miami-Dade'], ['De Soto', 'DeSoto'], ['Desoto', 'DeSoto'], ['Pinellas County', 'Pinellas'],
      [' PINELLAS ', 'Pinellas'], ['palm  beach', 'Palm Beach'], ['Indian River County', 'Indian River']];
    for (const [written, official] of cases) {
      expect(canonicalFloridaCounty(written), written).toBe(official);
      expect(normalizeCountyName(written), written).toBe(official);
    }
    expect(circuitForCounty('St Lucie')).toBe(19);
    expect(circuitForCounty('Pinellas County')).toBe(6);
  });

  it('is nothing for a name that is not a Florida county', () => {
    for (const written of ['', '  ', 'P', 'Pinelas', 'Zzyzx', 'Cook', 'County']) expect(canonicalFloridaCounty(written), written).toBe('');
    expect(countyProblem('')).toBe('blank');
    expect(countyProblem('   ')).toBe('blank');
    expect(countyProblem('Pinelas')).toBe('Pinelas');
    expect(countyProblem('pinellas county')).toBe('');
    expect(isFloridaCounty('Zzyzx')).toBe(false);
  });

  it('opening a filing writes a variant as the official name, and leaves anything else as written', () => {
    expect(normalizeWardData({ inventoryType: 'annual', county: 'St Lucie' }).county).toBe('St. Lucie');
    expect(normalizeWardData({ inventoryType: 'annual', county: 'Zzyzx' }).county).toBe('Zzyzx');
  });
});

describe('every form names a county that is not a Florida county', () => {
  const ENGINES = { guardian: 'guardian', annual: 'annual', finalAccounting: 'annual', trustAccounting: 'annual', simplified: 'simplified',
    planInitial: 'planInitial', planAnnual: 'planAnnual', planMinor: 'planMinor', planSimplified: 'planSimplified' };
  for (const [type, engine] of Object.entries(ENGINES)) {
    it(type, () => {
      const d = { ...JSON.parse(JSON.stringify(initializeEmptyData(type))), inventoryType: type, county: 'Pinelas' };
      const named = engineChecks(engine)(d).filter((i) => i.path === 'county');
      expect(named.map((i) => i.message), type).toEqual([expect.stringMatching(/County: "Pinelas" is not a Florida county/)]);
      // Blank is the blank message, as before, and whitespace counts as blank.
      const blank = engineChecks(engine)({ ...d, county: '   ' }).filter((i) => i.path === 'county');
      expect(blank).toHaveLength(1);
      expect(blank[0].message).not.toMatch(/not a Florida county/);
      expect(engineChecks(engine)({ ...d, county: 'Pinellas' }).filter((i) => i.path === 'county')).toEqual([]);
      // Like a blank county, it can be overridden at Preview (73F-N2).
      const issue = evaluateFiling(d).blockers.find((i) => i.path === 'county');
      expect(issue.bypassable).toBe(true);
    });
  }

  it("the Plans' readiness rows follow the same rule", () => {
    for (const [type, id] of [['planSimplified', 'cover.wardCaseCounty'], ['planAnnual', 'cover.county'], ['planInitial', 'cover.wardCaseCounty'], ['planMinor', 'cover.wardCountyPeriod']]) {
      const d = { wardName: 'W', caseNumber: '1', periodFrom: '2026-01-01', periodTo: '2026-12-31', county: 'Pinelas' };
      const row = (data) => { const r = getFilingReadiness(type, data); return [...r.automatic, ...r.manual].find((x) => x.id === id); };
      expect(row(d).ok, type).toBe(false);
      expect(row({ ...d, county: 'Pinellas' }).ok, type).toBe(true);
    }
  });
});
