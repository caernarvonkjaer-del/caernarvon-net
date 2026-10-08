import { describe, expect, test } from 'vitest';

// Milestone 73O part 2 (decisions 73O-3, 73O-N2) and 74F, on all seven
// certificates of service: the Inventory's D-5, the Annual, Final and Trust
// Accounting's Part X, the Simplified's Part VI and the four Plans'.
//
// What a filer saw: a recipient had three different shapes -- the Inventory a
// name, a street address and a city/state/ZIP; the accountings and the Plans a
// name and three lines; the Simplified a name and two lines on screen and a
// third line stored, printed and counted but with no box -- while each of the
// Clerk's three workbooks gives a recipient a five-line box. And with nobody
// listed the certificates said "None listed." (Inventory, Simplified) or "No
// service recipients listed." (Annual family, Plans); a Plan whose filer
// answered "no recipients are required" printed the question itself,
// "(filer attestation - app does not determine legal necessity)" included.
//
// Red-first: against the code before 73O part 2 and 74F every case fails.

globalThis.window = globalThis.window || globalThis;
const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { getCollection } = await import('../../src/core/form/collections.js');
const { normalizeWardData } = await import('../../src/core/filing/normalize-filing.js');
const shape = await import('../../src/core/filing/recipient-shape.js');
const { buildVerifiedInventoryModel } = await import('../../src/features/guardian-inventory/pdf-model.js');
const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
const { buildSimplifiedAccountingModel } = await import('../../src/features/simplified-accounting/pdf-model.js');
const { buildPlanAnnualModel } = await import('../../src/features/plan-annual/pdf-model.js');
const { buildPlanInitialModel } = await import('../../src/features/plan-initial/pdf-model.js');
const { buildPlanMinorModel } = await import('../../src/features/plan-minor/pdf-model.js');
const { buildPlanSimplifiedModel } = await import('../../src/features/plan-simplified/pdf-model.js');
const { collectGuardianIssues } = await import('../../src/core/validation/engines/guardian.js');
const { collectAnnualIssues } = await import('../../src/core/validation/engines/annual.js');
const {
  NO_RECIPIENTS_QUESTION, NO_RECIPIENTS_HINT, NO_RECIPIENTS_LISTED_LINE, NO_RECIPIENTS_REQUIRED_LINE, noRecipientsLine,
} = await import('../../src/core/validation/service-recipients.js');
const { renderServiceAttestationRow } = await import('../../src/core/form/service-attestation-visibility.js');
const { ATTESTATION_57B } = await import('../../src/core/filing/plan-certificate-of-service.js');
// Conversion reads each form's totals through the feature services, as the app provides them at startup.
{
  const { provideFeatureServices } = await import('../../src/core/runtime/features.js');
  const [annualTotals, guardianTotals, simplifiedTotals] = await Promise.all([
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
  ]);
  provideFeatureServices({ totals: { annual: annualTotals.calcTotalsAnnual, guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
}

const LINES = ['line2', 'line3', 'line4', 'line5'];
const FIVE = { name: 'Pat Recipient', line2: '1 Main St', line3: 'Suite 2', line4: 'Clearwater, FL 33755', line5: 'Attn: Probate' };

// Each certificate: its filing type, where its recipients live, its attestation, and its model.
const CERTIFICATES = [
  { label: 'Initial Inventory D-5', type: 'guardian', list: 'serviceRecipients', attest: 'serviceNoRecipients', build: buildVerifiedInventoryModel },
  { label: 'Annual Part X', type: 'annual', list: 'certRecipients', attest: 'certNoRecipients', build: buildAnnualAccountingModel },
  { label: 'Final Part X', type: 'finalAccounting', list: 'certRecipients', attest: 'certNoRecipients', build: buildAnnualAccountingModel },
  { label: 'Trust Part X', type: 'trustAccounting', list: 'certRecipients', attest: 'certNoRecipients', build: buildAnnualAccountingModel },
  { label: 'Simplified Part VI', type: 'simplified', list: 'certRecipients', attest: 'certNoRecipients', build: buildSimplifiedAccountingModel },
  { label: 'Annual Plan', type: 'planAnnual', list: 'certRecipients', attest: 'certNoRecipients', build: buildPlanAnnualModel },
  { label: 'Initial Plan', type: 'planInitial', list: 'certRecipients', attest: 'certNoRecipients', build: buildPlanInitialModel },
  { label: 'Plan for Minors', type: 'planMinor', list: 'certRecipients', attest: 'certNoRecipients', build: buildPlanMinorModel },
  { label: 'Simplified Plan', type: 'planSimplified', list: 'certRecipients', attest: 'certNoRecipients', build: buildPlanSimplifiedModel },
];
const text = (model) => JSON.stringify(model);

describe('one recipient shape on every certificate (73O part 2)', () => {
  test('a new filing\'s cards and every "+ Add" card are a name and four address lines', () => {
    for (const c of CERTIFICATES) {
      const blank = initializeEmptyData(c.type)[c.list];
      expect(blank.length, c.label).toBeGreaterThan(0);
      for (const row of blank) expect(Object.keys(row).sort(), c.label).toEqual([...shape.RECIPIENT_FIELDS].sort());
      expect(Object.keys(getCollection(c.type, c.list).factory()).sort(), c.label).toEqual([...shape.RECIPIENT_FIELDS].sort());
    }
  });

  test("an Inventory saved before keeps its street address and city/state/ZIP as the first two lines, once, losing nothing", () => {
    const d = { ...initializeEmptyData('guardian'), serviceRecipients: [{ name: 'Old Shape', address: '1 Main St', cityStateZip: 'Clearwater, FL 33755' }] };
    normalizeWardData(d);
    expect(d.serviceRecipients[0]).toEqual({ name: 'Old Shape', line2: '1 Main St', line3: 'Clearwater, FL 33755', line4: '', line5: '' });
    const again = JSON.stringify(d.serviceRecipients);
    normalizeWardData(d);
    expect(JSON.stringify(d.serviceRecipients), 'idempotent').toBe(again);
    const both = { serviceRecipients: [{ name: 'X', line2: 'Typed Line', address: 'Old Street' }] };
    shape.normalizeRecipientShape(both);
    expect(both.serviceRecipients[0], 'two different values: both kept').toMatchObject({ line2: 'Typed Line', address: 'Old Street' });
  });

  test('a card holding only its last line is started -- and needs a name; on every form a name is all a listed recipient needs (73O-N3)', () => {
    const lastOnly = { name: '', line2: '', line3: '', line4: '', line5: 'Attn: Probate' };
    const inv = { ...initializeEmptyData('guardian'), serviceRecipients: [lastOnly] };
    expect(collectGuardianIssues(inv).map((i) => String(i.message ?? i))).toContain('D-5 Recipient 1 — Name');
    const named = { ...initializeEmptyData('guardian'), serviceRecipients: [{ ...shape.emptyRecipient(), name: 'Pat' }] };
    expect(collectGuardianIssues(named).map((i) => String(i.message ?? i)).filter((m) => /D-5 Recipient/.test(m)), 'no address required').toEqual([]);
    const ann = { ...initializeEmptyData('annual'), certRecipients: [lastOnly] };
    expect(collectAnnualIssues(ann).map((i) => String(i.message ?? i)).some((m) => /Part X — Recipient 1 Name/.test(m))).toBe(true);
  });

  test("each certificate's PDF prints the name and all four address lines", () => {
    for (const c of CERTIFICATES) {
      const d = { ...initializeEmptyData(c.type), [c.list]: [{ ...FIVE }], [c.attest]: '' };
      const out = text(c.build(d));
      for (const v of Object.values(FIVE)) expect(out, `${c.label}: ${v}`).toContain(v);
    }
  });

  test("a blank card prints no row -- the Inventory printed one for every card", () => {
    const d = { ...initializeEmptyData('guardian'), serviceRecipients: [{ ...FIVE }, shape.emptyRecipient()] };
    const tables = [];
    const visit = (n) => { if (Array.isArray(n)) n.forEach(visit); else if (n && typeof n === 'object') { if (n.type === 'table' && n.title === 'Service Recipients') tables.push(n); Object.values(n).forEach(visit); } };
    visit(buildVerifiedInventoryModel(d));
    expect(tables, 'the recipients table').toHaveLength(1);
    expect(tables[0].rows).toHaveLength(1);
  });
});

describe('the question, asked plainly (74F-1)', () => {
  test('one question and one hint, beneath it on every certificate', () => {
    expect(NO_RECIPIENTS_QUESTION).toBe('Are you certifying that no one needs to be served with a copy of this filing?');
    expect(ATTESTATION_57B, "the Plans' name for it is the one constant").toBe(NO_RECIPIENTS_QUESTION);
    const html = renderServiceAttestationRow({ html: '<fieldset>q</fieldset>', rows: [], attestation: '', startedFields: shape.RECIPIENT_FIELDS, recipientsPath: 'certRecipients', attestationPath: 'certNoRecipients' });
    expect(html).toContain(NO_RECIPIENTS_HINT);
    expect(NO_RECIPIENTS_HINT).toBe('The app does not decide who must be served.');
  });

  test('the old wording is gone from every page and model', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of ['src/features/guardian-inventory/index.js', 'src/features/annual-accounting/index.js', 'src/features/simplified-accounting/index.js',
      'src/core/filing/plan-certificate-of-service.js', 'src/core/form/plan-certificate-of-service-page.js']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/No recipients are required for this certificate \(filer attestation/);
    }
  });
});

describe('what a certificate says when nobody is listed (74F-2, Pinellas Clerk practice)', () => {
  test('one wording on all seven: "listed" when nobody is listed, "required" when the filer answered Yes -- never the question', () => {
    expect(noRecipientsLine('')).toBe(NO_RECIPIENTS_LISTED_LINE);
    expect(noRecipientsLine('No')).toBe(NO_RECIPIENTS_LISTED_LINE);
    expect(noRecipientsLine('Yes')).toBe(NO_RECIPIENTS_REQUIRED_LINE);
    for (const c of CERTIFICATES) {
      const none = text(c.build({ ...initializeEmptyData(c.type), [c.list]: [shape.emptyRecipient()], [c.attest]: '' }));
      expect(none, `${c.label}: nobody listed`).toContain('No service recipients are listed.');
      const yes = text(c.build({ ...initializeEmptyData(c.type), [c.list]: [{ ...FIVE }], [c.attest]: 'Yes' }));
      expect(yes, `${c.label}: answered Yes`).toContain('No service recipients are required.');
      expect(yes, `${c.label}: the cards stay off the certificate`).not.toContain('Pat Recipient');
      for (const out of [none, yes]) {
        expect(out, c.label).not.toMatch(/None listed\.|No service recipients listed\.|filer attestation|determine legal necessity/);
        expect(out, c.label).not.toContain(NO_RECIPIENTS_QUESTION);
      }
    }
  });
});

describe('conversion copies a recipient whole (73O part 2)', () => {
  test("no line is folded or dropped between forms", async () => {
    const conv = await import('../../src/core/filing/conversion.js');
    // Annual -> Simplified: the Annual's fourth line used to be folded onto the Simplified's third.
    const simplified = initializeEmptyData('simplified');
    conv.convertToSimplified({ ...initializeEmptyData('annual'), certRecipients: [{ ...FIVE }] }, 'annual', simplified);
    expect(simplified.certRecipients[0]).toEqual(FIVE);
    // Simplified -> Annual: the fourth line used to be left blank.
    const annual = initializeEmptyData('annual');
    conv.convertSimplifiedToAnnual({ ...initializeEmptyData('simplified'), certRecipients: [{ ...FIVE }] }, annual);
    expect(annual.certRecipients[0]).toEqual(FIVE);
    // Inventory -> Annual, from a filing saved before 73O part 2: street and city/state/ZIP as lines 2 and 3.
    const fromInventory = initializeEmptyData('annual');
    conv.convertGuardianExtrasToAnnual({ ...initializeEmptyData('guardian'), serviceRecipients: [{ name: 'Old Shape', address: '1 Main St', cityStateZip: 'Clearwater, FL 33755' }] }, fromInventory);
    expect(fromInventory.certRecipients[0]).toEqual({ name: 'Old Shape', line2: '1 Main St', line3: 'Clearwater, FL 33755', line4: '', line5: '' });
  });
});
