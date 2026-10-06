// Milestone 58C's predicate (src/core/validation/attorney-block.js): the one
// answer to "has this filer started entering an attorney?" that the Initial
// Plan's export gate and its sidebar both use. The direct check of it moved
// here from tests/e2e/navigation-status.contract.spec.ts by Milestone 70's
// 70T (it called window.isPlanInitialAttorneyStarted in the page); the
// browser spec keeps what a filer sees -- the export issue and the sidebar
// mark, which must agree.
import { describe, expect, test } from 'vitest';
import { isPlanInitialAttorneyStarted, PLAN_INITIAL_ATTORNEY_FIELDS } from '../../src/core/validation/attorney-block.js';

const BLANK = Object.fromEntries([...PLAN_INITIAL_ATTORNEY_FIELDS, 'attorney_signatureState'].map((k) => [k, '']));

describe('isPlanInitialAttorneyStarted()', () => {
  test('a blank attorney block is not started: the pro se / Guardian Advocate exemption', () => {
    expect(isPlanInitialAttorneyStarted(BLANK)).toBe(false);
    expect(isPlanInitialAttorneyStarted(null)).toBe(false);
  });

  // The five 58C added (phone, address, either email), then the four it kept.
  test.each([
    ['attorney_phone', '727-555-0143'],
    ['attorney_street', '100 2nd Ave S, Suite 400'],
    ['attorney_cityStateZip', 'St. Petersburg, FL 33701'],
    ['attorney_email', 'atty@firm.example'],
    ['attorney_secondaryEmail', 'assistant@firm.example'],
    ['attorney_name', 'Rob Atty'],
    ['attorney_bar', '12345'],
    ['attorney_signatureDate', '2026-01-05'],
  ])('%s alone starts it', (field, value) => {
    expect(isPlanInitialAttorneyStarted({ ...BLANK, [field]: value })).toBe(true);
  });
});

// Milestone 71B generalized the rule to the Inventory and the Annual family and
// Simplified Accounting (isAttorneyStarted(d, engineId), one field list per
// engine); the Initial Plan's own function is now a thin wrapper over it, so
// its callers did not change. The per-engine behaviour is in
// tests/unit/attorney-optional.spec.js.
describe('isAttorneyStarted(): the one rule, per engine', () => {
  test('the Initial Plan wrapper answers exactly what the general rule answers', async () => {
    const { isAttorneyStarted } = await import('../../src/core/validation/attorney-block.js');
    for (const [field, value] of [['attorney_phone', '727-555-0143'], ['attorney_name', 'Rob Atty'], ['attorney_signatureState', 'typed'], ['attorney_signatureState', 'none']]) {
      const d = { ...BLANK, [field]: value };
      expect(isPlanInitialAttorneyStarted(d), field).toBe(isAttorneyStarted(d, 'planInitial'));
    }
    expect(isAttorneyStarted(BLANK, 'planInitial')).toBe(false);
  });
});

// Milestone 72C: the Annual Plan and the Plan for Minors join the rule, and the
// Simplified Plan gets its own, narrower test. Behaviour through each Plan's
// validator and sidebar is in tests/unit/plan-attorney-started.spec.js.
describe('Milestone 72C: every Plan has an entry, and each lists a real field', () => {
  test('the Annual Plan and the Plan for Minors list every attorney field their blank filing has', async () => {
    const { ATTORNEY_ENTRY } = await import('../../src/core/validation/attorney-block.js');
    const { emptyDataPlanAnnual } = await import('../../src/core/filing/models/plan-annual.js');
    const { emptyDataPlanMinor } = await import('../../src/core/filing/models/plan-minor.js');
    for (const [type, blank] of [['planAnnual', emptyDataPlanAnnual()], ['planMinor', emptyDataPlanMinor()]]) {
      const listed = new Set([...ATTORNEY_ENTRY[type].fields, ...ATTORNEY_ENTRY[type].signature]);
      for (const f of listed) expect(Object.prototype.hasOwnProperty.call(blank, f), `${type}.${f}`).toBe(true);
      // Every attorney_* field the model carries counts, except the stamp image
      // (an image needs a stamp state, which counts) and the "Unsigned" state.
      const modelFields = Object.keys(blank).filter((k) => /^attorney/.test(k) && k !== 'attorney_signatureImage');
      for (const f of modelFields) expect(listed.has(f), `${type}: ${f} is not in its entry`).toBe(true);
    }
  });

  test('the Simplified Plan has no entry; isPlanSimplifiedRepresented() needs the name and the email', async () => {
    const { ATTORNEY_ENTRY, isPlanSimplifiedRepresented } = await import('../../src/core/validation/attorney-block.js');
    expect(ATTORNEY_ENTRY.planSimplified).toBeUndefined();
    expect(isPlanSimplifiedRepresented(null)).toBe(false);
    expect(isPlanSimplifiedRepresented({ attorney_name: 'Rob Atty' })).toBe(false);
    expect(isPlanSimplifiedRepresented({ attorney_email: 'rob@law.example' })).toBe(false);
    expect(isPlanSimplifiedRepresented({ attorney_name: '  ', attorney_email: 'rob@law.example' })).toBe(false);
    expect(isPlanSimplifiedRepresented({ attorney_name: 'Rob Atty', attorney_email: 'rob@law.example' })).toBe(true);
  });
});

// Milestone 72C, the Annual, Final and Trust Accountings: the attorney's name
// was asked for only through the "/s/" check, so a Bar number, phone and email
// exported under a blank name. Once an attorney is started it is required in
// its own right, reported once, and Part V's sidebar mark waits for it.
describe('Milestone 72C: the Annual family asks for the attorney\'s name', () => {
  let validateAnnual;
  let sectionMarks;
  let openFiling;
  let emptyDataAnnual;
  const deps = { calcTotalsAnnual: () => ({}), annualReconcileState: () => ({ outOfBalance: false, explained: true }) };
  const ready = async () => {
    if (validateAnnual) return;
    globalThis.window = globalThis.window || globalThis;
    ({ openFiling } = await import('./support/open-filing.js'));
    ({ emptyDataAnnual } = await import('../../src/core/filing/models/annual.js'));
    ({ validateAnnual } = await import('../../src/features/annual-accounting/index.js'));
    ({ sectionMarks } = await import('../../src/core/status/section-marks.js'));
  };
  const COMPLETE = {
    attorney_bar: '0123456', attorney_phone: '(727) 555-0100', attorney_email: 'rachel@law.example',
    attorney_street: '1 Court St', attorney_cityStateZip: 'Clearwater, FL 33756', attorney_signatureDate: '2027-01-05',
  };
  const annual = (over) => ({ ...emptyDataAnnual(), inventoryType: 'annual', periodFrom: '2026-01-01', periodTo: '2026-12-31', ...over });
  const messages = (d) => { openFiling(d); return validateAnnual().map((e) => String(e?.message ?? e)); };

  test.each(['annual', 'finalAccounting', 'trustAccounting'])('%s: a Bar number alone asks for the name', async (inventoryType) => {
    await ready();
    expect(messages(annual({ inventoryType, attorney_bar: '0123456' }))).toContain('Part V — Attorney Name');
    expect(messages(annual({ inventoryType }))).not.toContain('Part V — Attorney Name');
  });

  test('"/s/" with no name: the name is reported once, not again by the signature check', async () => {
    await ready();
    const m = messages(annual({ ...COMPLETE, attorney_signatureState: 'typed' }));
    expect(m.filter((s) => /Attorney (Name|printed name)/.test(s))).toEqual(['Part V — Attorney Name']);
  });

  test('a-p5 stays unfinished until the name is entered', async () => {
    await ready();
    // Milestone 73F part 2: the mark is the export checks' own answer for Part V.
    expect(sectionMarks(annual(COMPLETE), 'annual').checks['a-p5']).toBe(false);
    expect(sectionMarks(annual({ ...COMPLETE, attorney: 'Rachel Lawyer' }), 'annual').checks['a-p5']).toBe(true);
    expect(messages(annual({ ...COMPLETE, attorney: 'Rachel Lawyer' })).filter((s) => s.startsWith('Part V —'))).toEqual([]);
  });
});
