import { describe, expect, test, beforeAll } from 'vitest';

// The PDF equivalent of tests/unit/excel-write-targets.spec.js.
//
// That guard works by comparing each write against the court's template: the
// template is an external authority that says what is already in a cell. The
// PDF has no template -- the app emits the captions and the values together --
// so the same check cannot be written. The failure it protects against still
// exists here though, in a different shape.
//
// core/pdf/pdf-engine.js renders a table row by indexing `rowData[cIdx]`
// against widths derived from `headers`. So a row whose cell count does not
// match its headers does not error: every cell from the short point on shifts
// into the next column and prints under the wrong heading, or the last column
// silently renders blank. That is exactly the Excel defect -- a value under a
// caption that does not describe it -- reached by a different route.
//
// What is checkable without a template is internal consistency, so that is
// what this asserts, across every block of every filing type:
//
//   - every row carries exactly as many cells as the table has headers
//   - colWidths / colAlign, when given, line up with the headers
//   - colWidths sum to 100, since the engine treats them as percentages
//   - a totals row never claims more columns than the table has
//   - every key-value item has a label, so no value prints unlabelled
//
// Both an empty filing and a populated one are built: several blocks only
// appear once there is data, and an empty-state placeholder row ("No entries")
// is exactly the kind of hand-written row that drifts out of sync with its
// headers.

// Browser globals the feature modules touch at import time.
global.window = {
  esc: (s) => s || '',
  ic: () => '',
  autoSave: () => {},
  navigate: () => {},
  updateNavDots: () => {},
  renderScheduleDocsSection: () => '',
  txtP: () => '', chkP: () => '', planQ: () => '', planCheckGroup: () => '',
  yesNoCheckboxS: () => '', radioP: () => '', pageNavS: () => '',
  formatName: (s) => s, formatPhone: (s) => s, formatDisplayDate: (s) => s,
  toggleSsnReveal: () => '',
  INITIAL_ADLS: [], INITIAL_ADL_RATINGS: [], ANNUAL_ADLS: [], ANNUAL_ADL_RATINGS: [],
  calcTotals: () => ({}), countyInputS: () => '', inpS: () => '',
  ...(global.window || {}),
};

/** One populated row for every collection any model might read. */
const ROW = {
  payer: 'Payer', description: 'Description', bank: 'Bank', accountNo: '1234',
  amount: '100', payee: 'Payee', checkNo: '1001', datePaid: '2026-03-04',
  category: 'Utilities', date: '2026-03-04', gain: '10', loss: '5',
  name: 'Name', bankName: 'Bank', institutionName: 'Bank',
  propertyDescription: 'Property', streetAddress: '1 Main St',
  cityStateZip: 'Clearwater, FL 33755', fullAssetValue: 1000,
  fullAssetAmount: 1000, fullDebtBalance: 500, fullLiabilityBalance: 500,
  wardPercent: 50, jointOwnerPercent: 50, lenderName: 'Lender',
  accountNumber: '4321', payerName: 'Payer', annualIncomeAmount: 1200,
  assetDescription: 'Asset', ownerName: 'Owner', totalAssetValue: 900,
  trustName: 'Trust', trusteeName: 'Trustee', trustAmount: 500,
  lawsuitDescription: 'Suit', actionDescription: 'Action', amountOfClaim: 100,
  estimatedSettlement: 100, relationshipToWard: 'Sibling',
  signatureDate: '2026-03-04', address: '1 Main St', line2: 'Line 2', line3: 'Line 3',
  transferInAmt: '10', transferOutAmt: '5', bankAccountId: '',
};

const COLLECTIONS = [
  'schA', 'schB1', 'schB2', 'schB3', 'schB4', 'schC', 'schD1', 'schD2', 'schD3',
  'schD4', 'schD5', 'schE', 'schF1', 'schF2', 'remuneration', 'guardians',
  'serviceRecipients', 'certRecipients', 'witnesses', 'trusts',
  'scheduleA1', 'scheduleA2', 'scheduleB1', 'scheduleB2', 'scheduleB3',
  'scheduleB4', 'scheduleC1', 'scheduleC2', 'scheduleC3', 'scheduleC4',
  'scheduleC5',
];

function populatedD(extra = {}) {
  const d = {
    wardName: 'Test Ward', caseNumber: '26-CP-000123', county: 'Pinellas',
    gid: '2026-01-01', periodFrom: '2026-01-01', periodTo: '2026-12-31',
    guardian: 'Sample Guardian', attorney: 'Sample Attorney',
    typeOfGuardianship: 'Plenary', startingBalance: '1000', amendedForm: 'No',
    preparer: { ...ROW }, attorneyInfo: { ...ROW }, serviceAttorney: { ...ROW },
    ...extra,
  };
  for (const key of COLLECTIONS) d[key] = [{ ...ROW }];
  return d;
}

const BUILDERS = [];
beforeAll(async () => {
  const mods = [
    ['annual', '../../src/features/annual-accounting/pdf-model.js', 'buildAnnualAccountingModel', { inventoryType: 'annual' }],
    ['finalAccounting', '../../src/features/annual-accounting/pdf-model.js', 'buildAnnualAccountingModel', { inventoryType: 'finalAccounting' }],
    ['trustAccounting', '../../src/features/annual-accounting/pdf-model.js', 'buildAnnualAccountingModel', { inventoryType: 'trustAccounting' }],
    ['guardian', '../../src/features/guardian-inventory/pdf-model.js', 'buildVerifiedInventoryModel', { inventoryType: 'guardian' }],
    ['simplified', '../../src/features/simplified-accounting/pdf-model.js', 'buildSimplifiedAccountingModel', { inventoryType: 'simplified' }],
    ['planAnnual', '../../src/features/plan-annual/pdf-model.js', 'buildPlanAnnualModel', { inventoryType: 'planAnnual' }],
    ['planInitial', '../../src/features/plan-initial/pdf-model.js', 'buildPlanInitialModel', { inventoryType: 'planInitial' }],
    ['planMinor', '../../src/features/plan-minor/pdf-model.js', 'buildPlanMinorModel', { inventoryType: 'planMinor' }],
    ['planSimplified', '../../src/features/plan-simplified/pdf-model.js', 'buildPlanSimplifiedModel', { inventoryType: 'planSimplified' }],
  ];
  for (const [id, path, fnName, seed] of mods) {
    const mod = await import(path);
    BUILDERS.push({ id, build: mod[fnName], seed });
  }
});

/** Every violation in one model, as readable strings. */
function violations(model, label) {
  const out = [];
  for (const section of model?.sections || []) {
    const where = `${label} / ${section.id || section.title || '(untitled section)'}`;
    for (const block of section.blocks || []) {
      const at = `${where} / ${block.title || block.type}`;
      if (block.type === 'table') {
        const headers = block.headers || [];
        if (!headers.length) { out.push(`${at}: table has no headers`); continue; }
        (block.rows || []).forEach((row, i) => {
          if (!Array.isArray(row)) { out.push(`${at}: row ${i} is not an array`); return; }
          if (row.length !== headers.length) {
            out.push(`${at}: row ${i} has ${row.length} cells for ${headers.length} headers`);
          }
        });
        if (block.colWidths) {
          if (block.colWidths.length !== headers.length) {
            out.push(`${at}: ${block.colWidths.length} colWidths for ${headers.length} headers`);
          }
          const sum = block.colWidths.reduce((a, b) => a + b, 0);
          if (Math.abs(sum - 100) > 0.5) out.push(`${at}: colWidths sum to ${sum}, not 100`);
        }
        if (block.colAlign && block.colAlign.length !== headers.length) {
          out.push(`${at}: ${block.colAlign.length} colAlign entries for ${headers.length} headers`);
        }
        const tv = block.totals?.values;
        if (Array.isArray(tv) && tv.length > headers.length) {
          out.push(`${at}: totals claims ${tv.length} value columns for ${headers.length} headers`);
        }
      } else if (block.type === 'key-value-grid') {
        (block.items || []).forEach((item, i) => {
          if (!item || typeof item.label !== 'string' || !item.label.trim()) {
            out.push(`${at}: key-value item ${i} has no label`);
          }
        });
      }
    }
  }
  return out;
}

describe('every PDF table prints its values under the right heading', () => {
  test('an empty filing produces no misaligned block', () => {
    const found = [];
    for (const { id, build, seed } of BUILDERS) {
      let model;
      try { model = build({ ...seed }, {}); } catch (e) {
        found.push(`${id}: builder threw on an empty filing -- ${e.message}`);
        continue;
      }
      found.push(...violations(model, id));
    }
    expect(found, `misaligned PDF blocks:\n${found.join('\n')}`).toEqual([]);
  });

  test('a populated filing produces no misaligned block', () => {
    const found = [];
    for (const { id, build, seed } of BUILDERS) {
      let model;
      try { model = build(populatedD(seed), {}); } catch (e) {
        found.push(`${id}: builder threw on a populated filing -- ${e.message}`);
        continue;
      }
      found.push(...violations(model, id));
    }
    expect(found, `misaligned PDF blocks:\n${found.join('\n')}`).toEqual([]);
  });

  // The guard would be worthless if it walked past empty models, so this
  // proves it reached real blocks. Not every filing type has tables --
  // planMinor and planSimplified are built entirely from key-value grids,
  // checklists, notices and signature blocks -- so what each model owes is at
  // least one block this guard actually inspects.
  test('the walk reaches checkable blocks in every filing type', () => {
    let tablesSeen = 0;
    for (const { id, build, seed } of BUILDERS) {
      const model = build(populatedD(seed), {});
      const blocks = (model.sections || []).flatMap((s) => s.blocks || []);
      const checkable = blocks.filter((b) => b.type === 'table' || b.type === 'key-value-grid');
      tablesSeen += blocks.filter((b) => b.type === 'table').length;
      expect(checkable.length, `${id} produced nothing this guard inspects`).toBeGreaterThan(0);
    }
    // And the table path specifically is exercised, not just the grid one.
    expect(tablesSeen, 'no table blocks were checked at all').toBeGreaterThan(20);
  });
});
