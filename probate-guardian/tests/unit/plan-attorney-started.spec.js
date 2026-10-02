// Milestone 72C: one "attorney entered" rule per Plan.
//
// Before, the Annual Plan counted an attorney only once the NAME was entered,
// and the Plan for Minors only by the name, the signature date or a signature
// state -- so an attorney with only a Bar number or phone was "no attorney":
// nothing more was asked for, and the filing exported with half an attorney.
// The accountings and the Initial Plan already counted any attorney field
// (attorney-block.js's isAttorneyStarted()); the Annual Plan and the Plan for
// Minors use that rule now, and once it holds, both ask for the attorney's
// name and primary email.
//
// The Simplified Plan is different by decision: its attorney fields print
// nowhere (the court's form has no attorney section, Milestone 61E), so nothing
// is ever required of them. An attorney there counts only for silencing the
// guardian-email warning, and only with a name and an email both
// (isPlanSimplifiedRepresented()).
//
// Red-first: the "each field alone" cases fail on the pre-72C validators and
// sidebar for every field but the name (and, on the Plan for Minors, the
// signature date).
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { openFiling } from './support/open-filing.js';
import { emptyDataPlanAnnual } from '../../src/core/filing/models/plan-annual.js';
import { emptyDataPlanMinor } from '../../src/core/filing/models/plan-minor.js';
import { emptyDataPlanSimplified } from '../../src/core/filing/models/plan-simplified.js';
import { ATTORNEY_ENTRY, isAttorneyStarted, isPlanSimplifiedRepresented } from '../../src/core/validation/attorney-block.js';

let validate;
let completion;
let guardianEmailAdvisories;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  validate = {
    planAnnual: (await import('../../src/features/plan-annual/index.js')).validatePlanAnnual,
    planMinor: (await import('../../src/features/plan-minor/index.js')).validatePlanMinor,
    planSimplified: (await import('../../src/features/plan-simplified/index.js')).validatePlanSimplified,
  };
  const c = await import('../../src/core/status/completion.js');
  completion = { planAnnual: (d) => c.planAnnualCompletion(d).checks['pa-p11'], planMinor: (d) => c.planMinorCompletion(d).checks['pm-p7'] };
  ({ guardianEmailAdvisories } = await import('../../src/core/filing/guardian-email.js'));
});
afterAll(() => vi.unstubAllGlobals());

const PLANS = {
  planAnnual: { make: emptyDataPlanAnnual, name: 'attorney', label: 'Signatures' },
  planMinor: { make: emptyDataPlanMinor, name: 'attorney_name', label: 'Preparer & Attorney' },
};
const VALUE = (field) => (/email/.test(field) ? 'atty@law.example' : /Date$/.test(field) ? '2026-01-05' : 'x');

function plan(type, over = {}) {
  const d = { ...structuredClone(PLANS[type].make()), inventoryType: type, ...over };
  // A guardian who has signed, so pa-p11's guardian half holds and only the
  // attorney decides it.
  d.planGuardians[0] = { ...d.planGuardians[0], name: 'Pat Rivera', signatureDate: '2026-01-05' };
  return d;
}
const issuePaths = (type, d) => { openFiling(d); return validate[type]().map((e) => e?.path); };

for (const type of Object.keys(PLANS)) {
  const { name } = PLANS[type];
  // Every field the shared rule lists, plus a signature state on its own.
  const fields = [...ATTORNEY_ENTRY[type].fields.map((f) => [f, VALUE(f)]), ['attorney_signatureState', 'typed']];

  describe(`${type}: each attorney field on its own counts as an attorney`, () => {
    test.each(fields)('%s', (field, value) => {
      const d = plan(type, { [field]: value });
      expect(isAttorneyStarted(d, type)).toBe(true);
      const paths = issuePaths(type, d);
      // The name and the email are asked for, unless this is the field entered.
      if (field !== name) expect(paths).toContain(name);
      if (field !== 'attorney_email') expect(paths).toContain('attorney_email');
      // The sidebar agrees: the attorney is unfinished.
      expect(completion[type](d)).toBe(false);
      // And the guardian-email warning goes quiet: the attorney is served.
      expect(guardianEmailAdvisories(d, type)).toEqual([]);
    });
  });

  describe(`${type}: an empty attorney is no attorney`, () => {
    test('nothing asked, the sidebar complete, the guardian-email warning shown', () => {
      const d = plan(type);
      expect(isAttorneyStarted(d, type)).toBe(false);
      const paths = issuePaths(type, d);
      expect(paths).not.toContain(name);
      expect(paths).not.toContain('attorney_email');
      expect(completion[type](d)).toBe(true);
      expect(guardianEmailAdvisories(d, type).map((a) => a.code)).toEqual(['guardian.email-for-service']);
    });

    test('an Unsigned choice alone is not an attorney', () => {
      expect(isAttorneyStarted(plan(type, { attorney_signatureState: 'none' }), type)).toBe(false);
    });
  });

  test(`${type}: a complete attorney -- name, email, "/s/" and date -- asks for nothing more`, () => {
    const d = plan(type, { [name]: 'Rachel Lawyer', attorney_email: 'rachel@law.example', attorney_signatureState: 'typed', attorney_signatureDate: '2026-01-05' });
    const paths = issuePaths(type, d);
    expect(paths).not.toContain(name);
    expect(paths).not.toContain('attorney_email');
    expect(completion[type](d)).toBe(true);
  });
}

test('planAnnual: a blank name is reported once, not again by the "/s/" check', () => {
  const d = plan('planAnnual', { attorney_email: 'rachel@law.example', attorney_signatureState: 'typed', attorney_signatureDate: '2026-01-05' });
  openFiling(d);
  const messages = validate.planAnnual().map((e) => String(e?.message ?? e)).filter((m) => /Attorney/.test(m) && /name/i.test(m));
  expect(messages).toEqual(['Signatures — Attorney name is required']);
});

describe('planSimplified: the attorney counts only with a name and an email, and is never required', () => {
  const attorneyFields = ['attorney_name', 'attorney_bar', 'attorney_phone', 'attorney_email', 'attorney_secondary_email', 'attorney_street', 'attorney_cityStateZip', 'attorney_signatureDate'];
  const simplified = (over = {}) => {
    const d = { ...structuredClone(emptyDataPlanSimplified()), inventoryType: 'planSimplified', ...over };
    d.planGuardians[0] = { ...d.planGuardians[0], name: 'Pat Rivera' };
    return d;
  };

  test.each(attorneyFields)('%s alone: the warning stays, and no attorney issue', (field) => {
    const d = simplified({ [field]: VALUE(field) });
    expect(isPlanSimplifiedRepresented(d)).toBe(false);
    expect(guardianEmailAdvisories(d, 'planSimplified').map((a) => a.code)).toEqual(['guardian.email-for-service']);
    openFiling(d);
    expect(validate.planSimplified().filter((e) => /^attorney/.test(e?.path || ''))).toEqual([]);
  });

  test('the name and email together silence the warning, still with no attorney issue', () => {
    const d = simplified({ attorney_name: 'Rachel Lawyer', attorney_email: 'rachel@law.example' });
    expect(isPlanSimplifiedRepresented(d)).toBe(true);
    expect(guardianEmailAdvisories(d, 'planSimplified')).toEqual([]);
    openFiling(d);
    expect(validate.planSimplified().filter((e) => /^attorney/.test(e?.path || ''))).toEqual([]);
  });
});
