// The Case entity core (src/core/case-resolver.js, persistence-rewrite
// Milestone 6), exercised directly against hand-built filings.
//
// Moved here from tests/e2e/case-resolver.spec.ts by Milestone 70's 70T: every
// test in it called the module's functions through their window.* bridges,
// and several depend on object identity (resolveCase() returning the very
// Case createCase() pushed), which a browser spec reaching the app only
// through GuardianForms.testing's copies cannot observe. Nothing in it
// needed a browser. Same five tests, same assertions; `window.caseFile` is a
// stub holding just the cases list the module reads.
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import { resolveCase, caseNumberOf, createCase, getOrCreateCaseForWard, casesGroupingWards } from '../../src/core/case-resolver.js';

let caseFile;
beforeEach(() => {
  caseFile = { cases: [], wards: [] };
  vi.stubGlobal('window', { caseFile });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('case-resolver', () => {
  test('createCase + resolveCase round-trip', () => {
    const kase = createCase({ caseNumber: '24-001234-GD', county: 'Pinellas' });
    const found = resolveCase(kase.id);

    expect(caseFile.cases.includes(kase)).toBe(true);
    expect(found === kase).toBe(true);
    expect(kase.caseNumber).toBe('24-001234-GD');
    expect(kase.county).toBe('Pinellas');
  });

  test('caseNumberOf reads ucn for planMinor and caseNumber for every other type', () => {
    expect(caseNumberOf({ inventoryType: 'planMinor', ucn: '24-000111-GD', caseNumber: 'wrong' })).toBe('24-000111-GD');
    expect(caseNumberOf({ inventoryType: 'annual', caseNumber: '24-000222-GD' })).toBe('24-000222-GD');
  });

  test('getOrCreateCaseForWard creates once and reuses on a second call', () => {
    const ward = { wardId: 'w1', inventoryType: 'guardian', caseNumber: '24-000333-GD', county: 'Pasco', caseId: null };
    const first = getOrCreateCaseForWard(ward);
    const wardIdAfterFirst = ward.caseId;
    const second = getOrCreateCaseForWard(ward);

    expect(wardIdAfterFirst).toBeTruthy();
    expect(caseFile.cases.filter((c) => c.id === wardIdAfterFirst).length).toBe(1);
    expect(first === second).toBe(true);
    expect(first.caseNumber).toBe('24-000333-GD');
    expect(first.county).toBe('Pasco');
  });

  test('casesGroupingWards groups linked wards by real caseId, and falls back to caseNumber string match for unlinked ones', () => {
    const kase = createCase({ caseNumber: '24-000444-GD', county: 'Pinellas' });
    const linkedA = { wardId: 'a', inventoryType: 'guardian', wardName: 'Jane', caseId: kase.id, caseNumber: 'stale-should-not-matter' };
    const linkedB = { wardId: 'b', inventoryType: 'annual', wardName: 'Jane', caseId: kase.id, caseNumber: '' };
    const unlinkedC = { wardId: 'c', inventoryType: 'guardian', wardName: 'Bob', caseId: null, caseNumber: '24-000555-GD' };
    const unlinkedD = { wardId: 'd', inventoryType: 'annual', wardName: 'Bob', caseId: null, caseNumber: '24-000555-GD' };
    const soloE = { wardId: 'e', inventoryType: 'guardian', wardName: 'Solo', caseId: null, caseNumber: '' };

    const groups = casesGroupingWards([linkedA, linkedB, unlinkedC, unlinkedD, soloE]);
    const linkedGroup = groups.find((g) => g.wards.includes(linkedA));
    const stringMatchGroup = groups.find((g) => g.wards.includes(unlinkedC));
    const soloGroup = groups.find((g) => g.wards.includes(soloE));

    expect(groups.length).toBe(3);
    expect(linkedGroup.wards).toHaveLength(2);
    expect(linkedGroup.caseNumber).toBe('24-000444-GD'); // from the Case record, not each ward's own (stale) field
    expect(stringMatchGroup.wards).toHaveLength(2); // unlinkedC + unlinkedD, matched by shared caseNumber string
    expect(soloGroup.wards).toHaveLength(1);
  });

  test('casesGroupingWards keeps a linked group together even after the case number is edited on only one of the two filings', () => {
    const kase = createCase({ caseNumber: '24-000666-GD', county: 'Pinellas' });
    const filingA = { wardId: 'a', inventoryType: 'guardian', caseId: kase.id, caseNumber: '24-000666-GD' };
    const filingB = { wardId: 'b', inventoryType: 'annual', caseId: kase.id, caseNumber: '24-000666-GD' };

    // Edit A's own caseNumber field directly (as if the user retyped it),
    // without updating B or the Case record -- the exact scenario the old
    // string-match grouping could never survive.
    filingA.caseNumber = '24-000666-GD-AMENDED';

    const groups = casesGroupingWards([filingA, filingB]);
    expect(groups.length).toBe(1);
    expect(groups[0]?.wards.length).toBe(2);
  });
});
