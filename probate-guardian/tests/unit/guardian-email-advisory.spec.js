// Milestone 72C: a guardian's email, one rule on every form.
//
// Before this milestone the seven forms disagreed. The Simplified Accounting
// and the Simplified Plan refused to export without Guardian #1's email; the
// Annual family, the Annual Plan and the Plan for Minors collected it and never
// asked; the Initial Inventory and the Initial Plan had no field for it.
//
// Now (decided 2026-10-01/02, recorded as Pinellas Clerk practice): a missing
// guardian email is a Preview & Export warning, never an export issue, and
// only while no attorney is entered -- with an attorney, the attorney's email
// is the address for service (Fla. R. Gen. Prac. & Jud. Admin. 2.515(c)).
//
// Red-first: the "never an export error" and "the sidebar completes without
// it" tests fail on the pre-72C Simplified and Simplified Plan validators and
// sidebar; the warning tests fail without guardian-email.js.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { openFiling } from './support/open-filing.js';
import { emptyDataGuardian } from '../../src/core/filing/models/guardian.js';
import { emptyDataAnnual } from '../../src/core/filing/models/annual.js';
import { emptyDataSimplified } from '../../src/core/filing/models/simplified.js';
import { emptyDataPlanInitial } from '../../src/core/filing/models/plan-initial.js';
import { emptyDataPlanAnnual } from '../../src/core/filing/models/plan-annual.js';
import { emptyDataPlanMinor } from '../../src/core/filing/models/plan-minor.js';
import { emptyDataPlanSimplified } from '../../src/core/filing/models/plan-simplified.js';

let validators;
let advisories;
let carry;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [{ provideFeatureServices }, annualTotals, guardianTotals, simplifiedTotals] = await Promise.all([
    import('../../src/core/runtime/features.js'),
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
  ]);
  provideFeatureServices({ totals: { annual: annualTotals.calcTotalsAnnual, guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
  validators = {
    guardian: (await import('../../src/features/guardian-inventory/index.js')).validateGuardian,
    annual: (await import('../../src/features/annual-accounting/index.js')).validateAnnual,
    simplified: (await import('../../src/features/simplified-accounting/index.js')).validateSimplified,
    planInitial: (await import('../../src/features/plan-initial/index.js')).validatePlanInitial,
    planAnnual: (await import('../../src/features/plan-annual/index.js')).validatePlanAnnual,
    planMinor: (await import('../../src/features/plan-minor/index.js')).validatePlanMinor,
    planSimplified: (await import('../../src/features/plan-simplified/index.js')).validatePlanSimplified,
  };
  advisories = await import('../../src/core/filing/guardian-email.js');
  carry = await import('../../src/core/filing/carry-over.js');
});
afterAll(() => vi.unstubAllGlobals());

// engine -> [inventoryType, blank filing, guardian rows key, page label, one attorney field to start one]
const FORMS = {
  guardian: ['guardian', emptyDataGuardian, 'guardians', 'D-1', (d) => { d.attorney.barNumber = '0123456'; }],
  annual: ['annual', emptyDataAnnual, 'guardians', 'Part III', (d) => { d.attorney_bar = '0123456'; }],
  simplified: ['simplified', emptyDataSimplified, 'guardians', 'Part IV', (d) => { d.attorney_barNumber = '0123456'; }],
  planInitial: ['planInitial', emptyDataPlanInitial, 'planGuardians', 'Signatures', (d) => { d.attorney_bar = '0123456'; }],
  planAnnual: ['planAnnual', emptyDataPlanAnnual, 'planGuardians', 'Signatures', (d) => { d.attorney_bar = '0123456'; }],
  planMinor: ['planMinor', emptyDataPlanMinor, 'planGuardians', 'Guardian Signatures', (d) => { d.attorney_bar = '0123456'; }],
  // The Simplified Plan counts an attorney only with a name and email both.
  planSimplified: ['planSimplified', emptyDataPlanSimplified, 'planGuardians', 'Signatures', (d) => { d.attorney_name = 'Rachel Lawyer'; d.attorney_email = 'rachel@law.example'; }],
};
const ENGINES = Object.keys(FORMS);

function filing(engine, { guardianEmail = '', attorney = false, coGuardian = null } = {}) {
  const [type, make, rows, , startAttorney] = FORMS[engine];
  const d = { ...structuredClone(make()), inventoryType: type };
  d[rows][0] = { ...d[rows][0], name: 'Pat Rivera', email: guardianEmail };
  if (coGuardian) d[rows][1] = { ...d[rows][0], name: '', email: '', ...coGuardian };
  if (attorney) startAttorney(d);
  return d;
}

const emailIssues = (engine, d) => {
  openFiling(d);
  const rows = FORMS[engine][2];
  return validators[engine]().filter((e) => new RegExp(`^${rows}\\.\\d+\\.email$`).test(e?.path || '')
    || /guardian[^—]*\bemail\b/i.test(String(e?.message ?? e)));
};

describe('no attorney and no guardian email: one warning, on every form', () => {
  for (const engine of ENGINES) {
    test(engine, () => {
      const out = advisories.guardianEmailAdvisories(filing(engine), engine);
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({ code: 'guardian.email-for-service', severity: 'advisory', field: `${FORMS[engine][2]}.0.email` });
      expect(out[0].message).toBe(`${FORMS[engine][3]} — Guardian #1 has no email address. With no attorney, the court's rules expect each signer's e-mail address for service in the signature block when a document is filed electronically (Fla. R. Gen. Prac. & Jud. Admin. 2.515(c)).`);
    });
  }
});

describe('no warning once an attorney is entered, or the email is', () => {
  for (const engine of ENGINES) {
    test(`${engine}: an attorney`, () => {
      expect(advisories.guardianEmailAdvisories(filing(engine, { attorney: true }), engine)).toEqual([]);
    });
    test(`${engine}: the email`, () => {
      expect(advisories.guardianEmailAdvisories(filing(engine, { guardianEmail: 'pat@example.com' }), engine)).toEqual([]);
    });
  }
});

describe('co-guardians: each one in play, a blank card is not', () => {
  for (const engine of ENGINES) {
    test(engine, () => {
      const started = advisories.guardianEmailAdvisories(filing(engine, { guardianEmail: 'pat@example.com', coGuardian: { phone: '(727) 555-0100' } }), engine);
      expect(started.map((a) => a.field)).toEqual([`${FORMS[engine][2]}.1.email`]);
      expect(started[0].message).toMatch(/Guardian #2 has no email address/);
      const blank = advisories.guardianEmailAdvisories(filing(engine, { guardianEmail: 'pat@example.com', coGuardian: {} }), engine);
      expect(blank).toEqual([]);
    });
  }
});

describe('never an export error', () => {
  for (const engine of ENGINES) {
    test(`${engine}: no guardian-email issue with no attorney and no email`, () => {
      expect(emailIssues(engine, filing(engine))).toEqual([]);
    });
  }
});

describe('the warning reaches Preview & Export without blocking it', () => {
  test('prepareFilingOutput() lists it as an advisory, and an otherwise clean filing can export', async () => {
    const { prepareFilingOutput } = await import('../../src/core/filing/output-preflight.js');
    for (const engine of ['simplified', 'planSimplified']) {
      const d = filing(engine);
      openFiling(d);
      const out = prepareFilingOutput(d, () => []);
      expect(out.advisories.map((a) => a.code), engine).toContain('guardian.email-for-service');
      expect(out.canExport, engine).toBe(true);
    }
  });
});

describe('the two forms that used to require it: the sidebar completes without it', () => {
  test('Simplified Accounting Part IV', async () => {
    const { sectionMarks } = await import('../../src/core/status/section-marks.js');
    // A filing made today carries the guardian signature rule (73A).
    const d = { ...filing('simplified'), signaturePolicy: 2 };
    Object.assign(d.guardians[0], {
      signatureDate: '2026-01-05', ssn: '123-45-6789', phone: '(727) 555-0100',
      mailingStreet: '1 Main St', mailingCityStateZip: 'Clearwater, FL 33756',
      residenceStreet: '1 Main St', residenceCityStateZip: 'Clearwater, FL 33756',
    });
    expect(sectionMarks(d, 'simplified').checks['s-p4']).toBe(true);
  });

  test('Simplified Plan Signatures', async () => {
    const { sectionMarks } = await import('../../src/core/status/section-marks.js');
    const d = { ...filing('planSimplified'), signaturePolicy: 2 };
    Object.assign(d.planGuardians[0], { signatureDate: '2026-01-05', phone: '(727) 555-0100', mailingAddress: '1 Main St' });
    expect(sectionMarks(d, 'planSimplified').checks['ps-p3']).toBe(true);
  });
});

describe('the Initial Inventory collects it now', () => {
  test('an email-only co-guardian is a started card: validated, and printed', async () => {
    const d = filing('guardian', { guardianEmail: 'pat@example.com', coGuardian: { email: 'sam@example.com' } });
    openFiling(d);
    const second = validators.guardian().filter((e) => String(e?.path || '').startsWith('guardians.1.'));
    expect(second.length).toBeGreaterThan(0);

    const { buildVerifiedInventoryModel } = await import('../../src/features/guardian-inventory/pdf-model.js');
    const text = JSON.stringify(buildVerifiedInventoryModel(d));
    expect(text).toContain('sam@example.com');
    expect(text).toContain('pat@example.com');
  });

  test('the Initial Plan prints it in the signature block', async () => {
    const d = filing('planInitial', { guardianEmail: 'pat@example.com' });
    const { buildPlanInitialModel } = await import('../../src/features/plan-initial/pdf-model.js');
    expect(JSON.stringify(buildPlanInitialModel(d, {}))).toContain('pat@example.com');
  });
});

describe('it carries into a new filing', () => {
  test('Inventory -> Annual, Simplified and each Plan', () => {
    const src = filing('guardian', { guardianEmail: 'pat@example.com' });
    for (const to of ['annual', 'simplified']) {
      expect(carry.carryOverFieldsForAccounting(src, to).guardians[0].email, to).toBe('pat@example.com');
    }
    for (const to of ['planInitial', 'planAnnual', 'planMinor', 'planSimplified']) {
      expect(carry.carryOverFieldsForPlan(src, to).planGuardians[0].email, to).toBe('pat@example.com');
    }
  });

  test('between the Initial Plan and the Annual Plan, both ways', () => {
    expect(carry.carryOverFieldsForPlan(filing('planInitial', { guardianEmail: 'pat@example.com' }), 'planAnnual').planGuardians[0].email).toBe('pat@example.com');
    expect(carry.carryOverFieldsForPlan(filing('planAnnual', { guardianEmail: 'pat@example.com' }), 'planInitial').planGuardians[0].email).toBe('pat@example.com');
  });

  test('an Annual or a Simplified -> an Inventory', () => {
    for (const from of ['annual', 'simplified']) {
      const src = filing(from, { guardianEmail: 'pat@example.com' });
      expect(carry.carryOverAccountingToAccounting(src, 'guardian').guardians[0].email, from).toBe('pat@example.com');
    }
  });
});

describe("the Plan for Minors' attorney email", () => {
  test('required once an attorney is started, as on every other form', () => {
    const d = filing('planMinor');
    d.attorney_name = 'Rachel Lawyer';
    openFiling(d);
    expect(validators.planMinor().map((e) => e.path)).toContain('attorney_email');
    d.attorney_email = 'rachel@law.example';
    openFiling(d);
    expect(validators.planMinor().map((e) => e.path)).not.toContain('attorney_email');
  });

  test('never asked with no attorney', () => {
    openFiling(filing('planMinor'));
    expect(validators.planMinor().map((e) => e.path)).not.toContain('attorney_email');
  });
});
