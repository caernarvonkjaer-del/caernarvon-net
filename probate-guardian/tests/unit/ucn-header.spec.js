import { beforeAll, describe, expect, test } from 'vitest';
import { headerIdentityLines } from '../../src/core/pdf/header-identity.js';

// Milestone 63E. The Uniform Case Number (UCN) prints in the page header beside
// Case #, on every filing type. Decisions (2026-09-21):
//   D7  Page 1: one line, "UCN: ...   CASE #: ...". Continuation pages: the right
//       cell shows UCN on its first line and Case # on its second, both 8 pt -- the
//       two together (209-222 pt) do NOT fit one line in a 146 pt cell, measured
//       with the embedded font, while each alone does (133 pt and 83-115 pt).
//   D8  Optional. Omitted when blank -- no "Pending" placeholder -- so a filing
//       without a UCN prints exactly as it did before, and an old .sav (which has no
//       `ucn` key at all on Guardian, Annual and Simplified) is unchanged.
//   D9  Plan - Minors already has both a UCN and a Case # field. Its UCN slot is the
//       UCN and its Case # slot is the Case # (`ref`); it stopped printing the UCN
//       as the Case #.
// Formatting is "identical to Case #": the same font, size, weight and colour --
// which is why this helper only decides the TEXT, and the engine draws it.

describe('headerIdentityLines()', () => {
  test('with no UCN it is exactly what the header printed before', () => {
    expect(headerIdentityLines({ caseNumber: '26-002487-GD', ucn: '' })).toEqual({
      firstPage: 'CASE #: 26-002487-GD',
      continuation: ['Case #: 26-002487-GD'],
    });
  });

  test('a missing ucn key (an old .sav) is the same as a blank one — nothing about the UCN prints', () => {
    const blank = headerIdentityLines({ caseNumber: 'C-1', ucn: '' });
    expect(headerIdentityLines({ caseNumber: 'C-1' })).toEqual(blank);
    expect(headerIdentityLines({ caseNumber: 'C-1', ucn: undefined })).toEqual(blank);
    expect(headerIdentityLines({ caseNumber: 'C-1', ucn: null })).toEqual(blank);
    expect(JSON.stringify(blank)).not.toMatch(/UCN/);
  });

  test('a UCN is on the same line as CASE # on page 1, and on its own line above Case # afterwards', () => {
    expect(headerIdentityLines({ caseNumber: '26-002487-GD', ucn: '50-2026-GA-000123-XXXX-XX' })).toEqual({
      firstPage: 'UCN: 50-2026-GA-000123-XXXX-XX   CASE #: 26-002487-GD',
      continuation: ['UCN: 50-2026-GA-000123-XXXX-XX', 'Case #: 26-002487-GD'],
    });
  });

  test('a blank case number still says Pending, whether or not there is a UCN', () => {
    expect(headerIdentityLines({ caseNumber: '', ucn: '' }).firstPage).toBe('CASE #: Pending');
    expect(headerIdentityLines({ caseNumber: '', ucn: 'U-1' }).firstPage).toBe('UCN: U-1   CASE #: Pending');
    expect(headerIdentityLines({ caseNumber: '', ucn: 'U-1' }).continuation).toEqual(['UCN: U-1', 'Case #: Pending']);
  });

  test('whitespace around either value is ignored, and a whitespace-only UCN is blank', () => {
    expect(headerIdentityLines({ caseNumber: '  C-1 ', ucn: '  U-1  ' }).firstPage).toBe('UCN: U-1   CASE #: C-1');
    expect(headerIdentityLines({ caseNumber: 'C-1', ucn: '   ' }).firstPage).toBe('CASE #: C-1');
  });
});

// The seven PDF models. Each passes the UCN next to caseNumber; there is no shared metadata
// builder, so each is checked.
const MODELS = [];
beforeAll(async () => {
  const table = [
    ['annual', '../../src/features/annual-accounting/pdf-model.js', 'buildAnnualAccountingModel', { inventoryType: 'annual' }],
    ['finalAccounting', '../../src/features/annual-accounting/pdf-model.js', 'buildAnnualAccountingModel', { inventoryType: 'finalAccounting' }],
    ['trustAccounting', '../../src/features/annual-accounting/pdf-model.js', 'buildAnnualAccountingModel', { inventoryType: 'trustAccounting' }],
    ['guardian', '../../src/features/guardian-inventory/pdf-model.js', 'buildVerifiedInventoryModel', { inventoryType: 'guardian' }],
    ['simplified', '../../src/features/simplified-accounting/pdf-model.js', 'buildSimplifiedAccountingModel', { inventoryType: 'simplified' }],
    ['planAnnual', '../../src/features/plan-annual/pdf-model.js', 'buildPlanAnnualModel', { inventoryType: 'planAnnual' }],
    ['planInitial', '../../src/features/plan-initial/pdf-model.js', 'buildPlanInitialModel', { inventoryType: 'planInitial' }],
    ['planSimplified', '../../src/features/plan-simplified/pdf-model.js', 'buildPlanSimplifiedModel', { inventoryType: 'planSimplified' }],
  ];
  for (const [id, path, fnName, seed] of table) {
    const mod = await import(path);
    MODELS.push({ id, build: mod[fnName], seed });
  }
});

describe('the PDF models pass the UCN to the header', () => {
  test('every non-Minor model: metadata.ucn is the ward\'s UCN, alongside its unchanged caseNumber', () => {
    for (const { id, build, seed } of MODELS) {
      const { metadata } = build({ ...seed, wardName: 'Harold Test', caseNumber: '26-002487-GD', ucn: '50-2026-GA-000123-XXXX-XX' });
      expect(metadata.ucn, id).toBe('50-2026-GA-000123-XXXX-XX');
      expect(metadata.caseNumber, id).toBe('26-002487-GD');
    }
  });

  test("an old .sav ward has no `ucn` key at all — every model reads it as '' and prints as before", () => {
    for (const { id, build, seed } of MODELS) {
      const ward = { ...seed, wardName: 'Harold Test', caseNumber: '26-002487-GD' };
      expect('ucn' in ward, `${id}: the fixture must genuinely lack the key`).toBe(false);
      const { metadata } = build(ward);
      expect(metadata.ucn, id).toBe('');
      expect(headerIdentityLines(metadata).firstPage, id).toBe('CASE #: 26-002487-GD');
    }
  });

  test('a UCN with surrounding whitespace is trimmed, like the case number', () => {
    const { build, seed } = MODELS.find((m) => m.id === 'guardian');
    expect(build({ ...seed, caseNumber: ' C-1 ', ucn: '  U-1 ' }).metadata).toMatchObject({ caseNumber: 'C-1', ucn: 'U-1' });
  });
});

describe('Plan - Minors (D9): the UCN slot is the UCN, the Case # slot is the Case #', () => {
  let buildPlanMinorModel;
  beforeAll(async () => { ({ buildPlanMinorModel } = await import('../../src/features/plan-minor/pdf-model.js')); });

  test('both filled: UCN is the UCN and Case # is the Case #, not the UCN twice', () => {
    const { metadata } = buildPlanMinorModel({ inventoryType: 'planMinor', wardName: 'M', ucn: '2024-MN-042', ref: 'REF-77' });
    expect(metadata.ucn).toBe('2024-MN-042');
    expect(metadata.caseNumber).toBe('REF-77');
    expect(headerIdentityLines(metadata).firstPage).toBe('UCN: 2024-MN-042   CASE #: REF-77');
  });

  test('only a UCN: it prints as the UCN and the Case # is Pending — it is no longer printed as the Case #', () => {
    const { metadata } = buildPlanMinorModel({ inventoryType: 'planMinor', wardName: 'M', ucn: '2024-MN-042' });
    expect(metadata.caseNumber).toBe('');
    expect(headerIdentityLines(metadata).firstPage).toBe('UCN: 2024-MN-042   CASE #: Pending');
  });

  test('only a Case #: prints exactly as any other filing does', () => {
    const { metadata } = buildPlanMinorModel({ inventoryType: 'planMinor', wardName: 'M', ref: 'REF-77' });
    expect(metadata.ucn).toBe('');
    expect(headerIdentityLines(metadata).firstPage).toBe('CASE #: REF-77');
  });

  test('the document title still names the filing by its one identifying number (ucn || ref), unchanged', () => {
    const { metadata } = buildPlanMinorModel({ inventoryType: 'planMinor', wardName: 'M', ucn: '2024-MN-042', ref: 'REF-77' });
    expect(metadata.title).toContain('2024-MN-042');
  });
});
