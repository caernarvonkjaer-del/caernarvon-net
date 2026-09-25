import { beforeEach, describe, expect, test } from 'vitest';
import { emptyDataSimplified } from '../../src/core/filing/models/simplified.js';
import { emptyDataPlanSimplified } from '../../src/core/filing/models/plan-simplified.js';
import { emptyDataPlanAnnual } from '../../src/core/filing/models/plan-annual.js';
import { emptyDataPlanInitial } from '../../src/core/filing/models/plan-initial.js';
import { emptyDataPlanMinor } from '../../src/core/filing/models/plan-minor.js';
import { emptyDataAnnual } from '../../src/core/filing/models/annual.js';
import { emptyDataGuardian } from '../../src/core/filing/models/guardian.js';
// Milestone 40C-A. The governing decision: a ward has NO default county until
// the user selects County on that ward's first filing Cover. That first explicit
// choice is stored on the canonical ward Party; later filings for the same ward
// hydrate from it. Nothing -- not a global, a form type, Pinellas, the case
// registry, or an unrelated source filing -- may precede that choice.
//
// Every factory here used to ship `county: 'Pinellas'`, which meant a filing
// silently claimed a court it had never been assigned. That is a correctness
// problem in a filed document, not a convenience default, which is why this
// spec asserts the absence rather than just the new behaviour.

// caseFile is a window global in this app (party-resolver.js reads
// window.caseFile directly, and state.js's getCaseFile() returns it), so these
// tests install a fresh one per test rather than importing a store.
function freshCaseFile() {
  return { wards: [], parties: [], cases: [] };
}

// The factories used to build their Plan maps and first rows from window
// globals legacy-app.js published, so this suite stubbed them. Since
// Milestone 70's 70C every factory is an import (src/core/filing/models/)
// and runs with its real lists and rows; window here only carries caseFile.
global.window = global.window || {};

describe('Milestone 40C-A: no filing starts with a county', () => {
  // The Annual factory also serves Final and Trust Accounting, so these seven
  // are the seven the milestone names. (emptyDataGuardian() was a legacy-app.js
  // classic-script global until Milestone 70's 70C, and was left out here.)
  const FACTORIES = {
    emptyDataGuardian,
    emptyDataSimplified,
    emptyDataPlanSimplified,
    emptyDataPlanAnnual,
    emptyDataPlanInitial,
    emptyDataPlanMinor,
    emptyDataAnnual,
  };

  for (const [name, factory] of Object.entries(FACTORIES)) {
    test(`${name}() starts with a blank county`, () => {
      const d = factory();
      expect(d.county).toBe('');
    });
  }

  test('no factory ships any field defaulted to Pinellas', () => {
    for (const [name, factory] of Object.entries(FACTORIES)) {
      const d = factory();
      for (const [key, value] of Object.entries(d)) {
        expect(value, `${name}().${key} must not default to Pinellas`).not.toBe('Pinellas');
      }
    }
  });

  // attorney_county is a SEPARATE field from the filing county and had its own
  // Pinellas default. It must also start blank, and must never be populated
  // from the ward's county.
  test('emptyDataAnnual() starts attorney_county blank too', () => {
    expect(emptyDataAnnual().attorney_county).toBe('');
  });
});

// Milestone 40C-A's blank/unrecognized-county null-safety on circuitForCounty()/
// getCircuitOrdinal()/getFloridaCircuitCourtCaption() lives in
// circuit-lookup.spec.js (Milestone 43C de-dup) -- this file's own concern is
// county *default assignment* behavior, not the lookup functions themselves.

describe('Milestone 40C-A: the ward-county lifecycle', () => {
  let wardCounty;

  beforeEach(async () => {
    window.caseFile = freshCaseFile();
    // Imported after window.caseFile exists: party-resolver.js reads it at call
    // time, but keeping the order explicit documents the dependency.
    wardCounty = await import('../../src/core/navigation/ward-county.js');
  });

  const newFiling = (overrides = {}) => {
    const filing = { wardId: `w_${window.caseFile.wards.length}`, wardName: 'Ward One', county: '', ...overrides };
    window.caseFile.wards.push(filing);
    return filing;
  };

  test('normalizeCountyName canonicalizes case and whitespace, and rejects non-Florida', () => {
    const { normalizeCountyName } = wardCounty;
    expect(normalizeCountyName('  pinellas ')).toBe('Pinellas');
    expect(normalizeCountyName('MIAMI-DADE')).toBe('Miami-Dade');
    expect(normalizeCountyName('Atlantis')).toBe('');
    expect(normalizeCountyName('')).toBe('');
    expect(normalizeCountyName(null)).toBe('');
  });

  test('the first Cover choice lands on both the filing and the ward Party', () => {
    const filing = newFiling();
    const result = wardCounty.commitCoverCounty(filing, 'orange');

    expect(result.established).toBe(true);
    expect(result.county).toBe('Orange');
    expect(filing.county).toBe('Orange');
    expect(filing.wardPartyId).toBeTruthy();
    expect(wardCounty.wardPartyCounty(filing)).toBe('Orange');
  });

  test('a later filing for the same ward hydrates without re-asking', () => {
    const first = newFiling();
    wardCounty.commitCoverCounty(first, 'Orange');

    const second = newFiling({ wardPartyId: first.wardPartyId });
    expect(second.county).toBe('');
    expect(wardCounty.hydrateCountyFromWardParty(second)).toBe(true);
    expect(second.county).toBe('Orange');
  });

  test('a ward Party with no county leaves a new filing blank', () => {
    const first = newFiling();
    wardCounty.ensureWardPartyForFiling(first);
    const second = newFiling({ wardPartyId: first.wardPartyId });

    expect(wardCounty.hydrateCountyFromWardParty(second)).toBe(false);
    expect(second.county).toBe('');
  });

  test('an unlinked filing hydrates nothing -- no name-based guessing', () => {
    newFiling({ wardName: 'Ward One', county: 'Orange', wardPartyId: 'p_known' });
    const stranger = newFiling({ wardName: 'Ward One' });
    expect(wardCounty.hydrateCountyFromWardParty(stranger)).toBe(false);
    expect(stranger.county).toBe('');
  });

  test('hydration never overwrites a county the filing already carries', () => {
    const first = newFiling();
    wardCounty.commitCoverCounty(first, 'Orange');
    const second = newFiling({ wardPartyId: first.wardPartyId, county: 'Pasco' });
    expect(wardCounty.hydrateCountyFromWardParty(second)).toBe(false);
    expect(second.county).toBe('Pasco');
  });

  // The auditability rule: a later Cover edit moves the canonical value forward
  // for FUTURE filings but must not rewrite what a sibling already filed.
  test('a later Cover edit does not rewrite existing sibling filings', () => {
    const first = newFiling();
    wardCounty.commitCoverCounty(first, 'Orange');
    const sibling = newFiling({ wardPartyId: first.wardPartyId });
    wardCounty.hydrateCountyFromWardParty(sibling);
    expect(sibling.county).toBe('Orange');

    const result = wardCounty.commitCoverCounty(first, 'Pasco');
    expect(result.changed).toBe(true);
    expect(result.previousPartyCounty).toBe('Orange');
    expect(result.siblingCount).toBe(1);

    expect(sibling.county, 'an already-filed sibling snapshot is auditable').toBe('Orange');
    expect(first.county).toBe('Pasco');
    expect(wardCounty.wardPartyCounty(first)).toBe('Pasco');

    const future = newFiling({ wardPartyId: first.wardPartyId });
    wardCounty.hydrateCountyFromWardParty(future);
    expect(future.county, 'filings created afterwards take the new value').toBe('Pasco');
  });

  test('a non-Florida county is not committed at all', () => {
    const filing = newFiling();
    const result = wardCounty.commitCoverCounty(filing, 'Atlantis');
    expect(result.county).toBe('');
    expect(result.established).toBe(false);
    expect(filing.county).toBe('');
  });

  // Milestone 51B: two tests were removed here with the function they covered,
  // ward-county.js's linkDestinationToSourceWardParty(), which had no production
  // caller. They were not unique coverage -- tests/e2e/cover-county.spec.ts
  // already asserts both of the same semantic cases (with the same 'Orange' and
  // 'Pasco' values) against legacy-app.js's carryOverFields(), which is the
  // carry-over path the app actually takes:
  //
  //   'a second filing for the same ward hydrates the county without re-asking'
  //     -- the destination links to the same ward Party and takes its county.
  //   'a county the ward Party does not have is not invented from the source filing'
  //     -- a source snapshot of 'Pasco' whose Party has no county supplies
  //        nothing, which is the case Milestone 40C-A item 3 forbids.
  //
  // So the rule stayed covered and moved from the dead twin to the live path,
  // rather than being dropped. Do not re-add unit coverage here for a function
  // that no longer exists; extend cover-county.spec.ts instead.

  describe('legacy migration: infer only a unanimous county', () => {
    test('infers when every linked filing with a county agrees', () => {
      const a = newFiling({ county: 'Orange' });
      const party = wardCounty.ensureWardPartyForFiling(a);
      newFiling({ wardPartyId: party.id, county: 'Orange' });
      newFiling({ wardPartyId: party.id, county: '' });

      expect(wardCounty.inferWardPartyCounty(party)).toBe('Orange');
      expect(wardCounty.backfillWardPartyCounties().inferred).toBe(1);
      expect(party.county).toBe('Orange');
    });

    test('treats differently-cased spellings of one county as agreement', () => {
      const a = newFiling({ county: 'orange' });
      const party = wardCounty.ensureWardPartyForFiling(a);
      newFiling({ wardPartyId: party.id, county: 'ORANGE' });
      expect(wardCounty.inferWardPartyCounty(party)).toBe('Orange');
    });

    test('leaves it blank when linked filings conflict -- never picks a winner', () => {
      const a = newFiling({ county: 'Orange' });
      const party = wardCounty.ensureWardPartyForFiling(a);
      newFiling({ wardPartyId: party.id, county: 'Pasco' });

      expect(wardCounty.inferWardPartyCounty(party)).toBe('');
      wardCounty.backfillWardPartyCounties();
      expect(wardCounty.normalizeCountyName(party.county)).toBe('');
    });

    test('leaves it blank when no linked filing has a county', () => {
      const a = newFiling();
      const party = wardCounty.ensureWardPartyForFiling(a);
      expect(wardCounty.inferWardPartyCounty(party)).toBe('');
    });

    test('never infers from an attorney county', () => {
      const a = newFiling({ county: '', attorney_county: 'Hillsborough' });
      const party = wardCounty.ensureWardPartyForFiling(a);
      expect(wardCounty.inferWardPartyCounty(party)).toBe('');
    });

    test("never infers from another ward Party's filing", () => {
      const mine = newFiling();
      const party = wardCounty.ensureWardPartyForFiling(mine);
      newFiling({ wardPartyId: 'p_someone_else', county: 'Pasco' });
      expect(wardCounty.inferWardPartyCounty(party)).toBe('');
    });

    test('an already-stored Party county is left exactly as it was', () => {
      const a = newFiling({ county: 'Pasco' });
      const party = wardCounty.ensureWardPartyForFiling(a);
      party.county = 'Orange';
      expect(wardCounty.inferWardPartyCounty(party)).toBe('');
      expect(wardCounty.backfillWardPartyCounties().untouched).toBe(1);
      expect(party.county).toBe('Orange');
    });
  });

  describe('party merge must not silently choose a county', () => {
    test('reports a conflict between two different nonblank ward counties', () => {
      const a = newFiling();
      const keep = wardCounty.ensureWardPartyForFiling(a);
      keep.county = 'Orange';
      const b = newFiling();
      const discard = wardCounty.ensureWardPartyForFiling(b);
      discard.county = 'Pasco';

      expect(wardCounty.wardCountyMergeConflict(keep.id, discard.id)).toEqual({
        keepCounty: 'Orange', discardCounty: 'Pasco',
      });
    });

    test('reports no conflict when they agree or either side is blank', () => {
      const a = newFiling();
      const keep = wardCounty.ensureWardPartyForFiling(a);
      const b = newFiling();
      const discard = wardCounty.ensureWardPartyForFiling(b);

      expect(wardCounty.wardCountyMergeConflict(keep.id, discard.id)).toBeNull();
      keep.county = 'Orange';
      expect(wardCounty.wardCountyMergeConflict(keep.id, discard.id)).toBeNull();
      discard.county = 'orange';
      expect(wardCounty.wardCountyMergeConflict(keep.id, discard.id)).toBeNull();
    });
  });

  test('a linked case record follows an explicit Cover edit, but never seeds one', () => {
    const filing = newFiling({ caseNumber: '26-000123-GD' });
    window.caseFile.cases.push({ id: 'c1', caseNumber: '26-000123-GD', county: 'Pasco' });

    wardCounty.commitCoverCounty(filing, 'Orange');
    expect(window.caseFile.cases[0].county, 'the Cover edit updates the linked case').toBe('Orange');

    // And the reverse never happens: a stale case county is not a default.
    const fresh = newFiling({ caseNumber: '26-000123-GD' });
    expect(wardCounty.hydrateCountyFromWardParty(fresh)).toBe(false);
    expect(fresh.county).toBe('');
  });
});
