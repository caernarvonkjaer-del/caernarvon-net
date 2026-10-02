// Milestone 72B. Every form collects the attorney's primary and secondary
// email, under one of three spellings, and every one of them is kept: in the
// form's model, through reopening, into each new filing made from it
// (carry-over) and through each conversion.
//
// Before: the secondary email was in no model but the Simplified Plan's and
// was never carried; the Inventory's attorney had no email keys at all;
// several destinations dropped even the primary (into an Inventory, and
// accounting to accounting); Plan -> Annual wrote attorneyBar/attorneyPhone/
// attorneyEmail, keys the Annual never reads, so all three were lost; Plan ->
// Simplified and -> Annual Plan carried only the name; the Simplified Plan got
// no attorney; and a Simplified source's Bar number (attorney_barNumber) was
// never read.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { emptyDataGuardian } from '../../src/core/filing/models/guardian.js';
import { emptyDataAnnual } from '../../src/core/filing/models/annual.js';
import { emptyDataSimplified } from '../../src/core/filing/models/simplified.js';
import { emptyDataPlanInitial } from '../../src/core/filing/models/plan-initial.js';
import { emptyDataPlanAnnual } from '../../src/core/filing/models/plan-annual.js';
import { emptyDataPlanMinor } from '../../src/core/filing/models/plan-minor.js';
import { emptyDataPlanSimplified } from '../../src/core/filing/models/plan-simplified.js';
import { normalizeWardData } from '../../src/core/filing/normalize-filing.js';

let carry, conv;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [{ provideFeatureServices }, annualTotals, guardianTotals, simplifiedTotals] = await Promise.all([
    import('../../src/core/runtime/features.js'),
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
  ]);
  provideFeatureServices({ totals: { annual: annualTotals.calcTotalsAnnual, guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
  carry = await import('../../src/core/filing/carry-over.js');
  conv = await import('../../src/core/filing/conversion.js');
});
afterAll(() => vi.unstubAllGlobals());

// Where each form keeps the attorney: [name, Bar number, primary, secondary].
const SPELLING = {
  guardian: ['attorney.name', 'attorney.barNumber', 'attorney.email', 'attorney.secondaryEmail'],
  annual: ['attorney', 'attorney_bar', 'attorney_email', 'attorney_secondaryEmail'],
  finalAccounting: ['attorney', 'attorney_bar', 'attorney_email', 'attorney_secondaryEmail'],
  trustAccounting: ['attorney', 'attorney_bar', 'attorney_email', 'attorney_secondaryEmail'],
  simplified: ['attorney', 'attorney_barNumber', 'attorney_email', 'attorney_secondaryEmail'],
  planInitial: ['attorney_name', 'attorney_bar', 'attorney_email', 'attorney_secondaryEmail'],
  planAnnual: ['attorney', 'attorney_bar', 'attorney_email', 'attorney_secondary_email'],
  planMinor: ['attorney_name', 'attorney_bar', 'attorney_email', 'attorney_secondary_email'],
  planSimplified: ['attorney_name', 'attorney_bar', 'attorney_email', 'attorney_secondary_email'],
};
const MODEL = {
  guardian: emptyDataGuardian, annual: emptyDataAnnual, simplified: emptyDataSimplified, planInitial: emptyDataPlanInitial,
  planAnnual: emptyDataPlanAnnual, planMinor: emptyDataPlanMinor, planSimplified: emptyDataPlanSimplified,
};
const get = (o, dotted) => dotted.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
const set = (o, dotted, value) => {
  const keys = dotted.split('.');
  let t = o;
  for (const k of keys.slice(0, -1)) t = (t[k] ??= {});
  t[keys[keys.length - 1]] = value;
};
const ATTORNEY = ['Rachel Lawyer', '0123456', 'rachel@law.example', 'desk@law.example'];
function source(type) {
  const s = { inventoryType: type, wardName: 'Ward', ...structuredClone(MODEL[type === 'finalAccounting' || type === 'trustAccounting' ? 'annual' : type]()) };
  s.inventoryType = type;
  SPELLING[type].forEach((path, i) => set(s, path, ATTORNEY[i]));
  if (type === 'guardian') s.attorneyForGuardian = ATTORNEY[0];
  return s;
}
const read = (type, filing) => SPELLING[type].map((p) => get(filing, p));

// carryOverFields()'s own dispatch, without the case-file Party reconcile it
// adds afterwards (which needs an open case and changes no attorney field).
function carried(src, target) {
  const accounting = carry.ACCOUNTING_FORM_TYPES;
  if (accounting.includes(target)) {
    return accounting.includes(src.inventoryType)
      ? carry.carryOverAccountingToAccounting(src, target)
      : carry.carryOverFieldsForAccounting(src, ['finalAccounting', 'trustAccounting'].includes(target) ? 'annual' : target);
  }
  return carry.carryOverFieldsForPlan(src, target);
}

const TYPES = Object.keys(SPELLING);

describe("each form's model names both emails", () => {
  for (const [type, make] of Object.entries(MODEL)) {
    test(type, () => {
      const blank = make();
      const [, , primary, secondary] = SPELLING[type];
      expect(get(blank, primary), `${primary}`).toBe('');
      expect(get(blank, secondary), `${secondary}`).toBe('');
    });
  }
});

describe('both emails survive reopening (the load-time normalizer keeps them)', () => {
  for (const type of TYPES) {
    test(type, () => {
      const filing = source(type);
      normalizeWardData(filing);
      expect(read(type, filing)).toEqual(ATTORNEY);
    });
  }
});

describe('a new filing made from another starts with its attorney -- name, Bar number and both emails', () => {
  for (const from of TYPES) {
    for (const to of TYPES) {
      test(`${from} -> ${to}`, () => {
        expect(read(to, carried(source(from), to))).toEqual(ATTORNEY);
      });
    }
  }
});

describe('the conversions keep both emails', () => {
  test('Inventory -> Annual', () => {
    const dest = { ...emptyDataAnnual(), inventoryType: 'annual' };
    conv.convertGuardianExtrasToAnnual(source('guardian'), dest);
    expect([dest.attorney_email, dest.attorney_secondaryEmail]).toEqual(ATTORNEY.slice(2));
  });
  test('Inventory -> Simplified', () => {
    const dest = { ...emptyDataSimplified(), inventoryType: 'simplified' };
    conv.convertToSimplified(source('guardian'), 'guardian', dest);
    expect([dest.attorney_email, dest.attorney_secondaryEmail]).toEqual(ATTORNEY.slice(2));
  });
  test('Annual -> Simplified', () => {
    const dest = { ...emptyDataSimplified(), inventoryType: 'simplified' };
    conv.convertToSimplified(source('annual'), 'annual', dest);
    expect([dest.attorney_email, dest.attorney_secondaryEmail]).toEqual(ATTORNEY.slice(2));
  });
  test('Simplified -> Annual', () => {
    const dest = { ...emptyDataAnnual(), inventoryType: 'annual' };
    conv.convertSimplifiedToAnnual(source('simplified'), dest);
    expect([dest.attorney_email, dest.attorney_secondaryEmail]).toEqual(ATTORNEY.slice(2));
  });
});
