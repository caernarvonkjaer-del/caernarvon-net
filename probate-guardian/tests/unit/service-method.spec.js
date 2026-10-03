// Milestone 72G: the method of service and the ward's status, kept apart.
//
// Before: the Annual family, the Simplified and the four Plans had one
// free-text box labelled "Indicate if (e.g. hand-delivered, mailed)", where
// filers typed the method; on the Annual and Simplified it was written into
// the Clerk's workbook box "Indicate if:" -- the ward's status, a dropdown on
// the Clerk's form -- so a filed Annual could say "mailed" there, and neither
// form had anywhere for the ward's status. The Inventory had no method at all.
// The Simplified blocked export without the method. A new year, and some
// conversions, kept last filing's certificate answers.
//
// Now: the method is the relabelled box on all seven certificates (the
// Inventory gains one), printed on the PDF only, warned when missing and
// never required; the ward's status is its own dropdown on the Annual and
// Simplified, written to the workbook box and required on all three
// accountings; and a certificate describes one filing being served.
//
// Red-first: fails against the pre-72G module (absent), PDF models,
// validators, conversions and New Year reset.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { openFiling } from './support/open-filing.js';
import { emptyDataGuardian } from '../../src/core/filing/models/guardian.js';
import { emptyDataAnnual } from '../../src/core/filing/models/annual.js';
import { emptyDataSimplified } from '../../src/core/filing/models/simplified.js';
import { emptyDataPlanInitial } from '../../src/core/filing/models/plan-initial.js';
import { emptyDataPlanAnnual } from '../../src/core/filing/models/plan-annual.js';
import { emptyDataPlanMinor } from '../../src/core/filing/models/plan-minor.js';
import { emptyDataPlanSimplified } from '../../src/core/filing/models/plan-simplified.js';

let sm;
let mig;
let conv;
let carry;
let years;
let validate;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [{ provideFeatureServices }, annualTotals, guardianTotals, simplifiedTotals] = await Promise.all([
    import('../../src/core/runtime/features.js'),
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
  ]);
  provideFeatureServices({ totals: { annual: annualTotals.calcTotalsAnnual, guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
  sm = await import('../../src/core/filing/service-method.js');
  mig = await import('../../src/core/filing/certificate-migrations.js');
  conv = await import('../../src/core/filing/conversion.js');
  carry = await import('../../src/core/filing/carry-over.js');
  years = await import('../../src/core/filing/filing-years.js');
  validate = {
    guardian: (await import('../../src/features/guardian-inventory/index.js')).validateGuardian,
    annual: (await import('../../src/features/annual-accounting/index.js')).validateAnnual,
    simplified: (await import('../../src/features/simplified-accounting/index.js')).validateSimplified,
  };
});
afterAll(() => vi.unstubAllGlobals());

const RECIPIENT = { name: 'Sam Lee', line2: '1 Main St', line3: 'Clearwater, FL 33755', line4: '' };
const blocksText = (section) => section.blocks.map((b) => b.text).filter(Boolean);

describe('the PDF: the method on its own line, omitted when blank; the ward\'s status as the Inventory prints it', () => {
  test('Annual Part X', async () => {
    const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
    const d = { ...emptyDataAnnual(), inventoryType: 'annual', certDate: '2026-12-31', certIndicator: 'U.S. Mail', certWardStatus: 'Ward is under 14 years old', certRecipients: [RECIPIENT] };
    const lines = blocksText(buildAnnualAccountingModel(d).sections.find((s) => s.id === 'part10'));
    expect(lines).toContain('on this date: 12/31/2026');
    expect(lines).toContain('Method of service: U.S. Mail');
    expect(lines).toContain('Indicate if Ward is: Ward is under 14 years old');
    const none = blocksText(buildAnnualAccountingModel({ ...d, certIndicator: '' }).sections.find((s) => s.id === 'part10'));
    expect(none.some((l) => /Method of service/.test(l))).toBe(false);
  });

  test('Simplified Part VI', async () => {
    const { buildSimplifiedAccountingModel } = await import('../../src/features/simplified-accounting/pdf-model.js');
    const d = { ...emptyDataSimplified(), inventoryType: 'simplified', certServiceDate: '2027-01-05', certIndicator: 'mailed', certWardStatus: 'N/A' };
    const lines = blocksText(buildSimplifiedAccountingModel(d).sections.find((s) => s.id === 'part6'));
    expect(lines).toContain('on this date: 01/05/2027');
    expect(lines).toContain('Method of service: mailed');
    expect(lines).toContain('Indicate if Ward is: N/A');
    expect(lines.some((l) => /Indicate if: mailed/.test(l))).toBe(false);
  });

  test('Inventory Part VI', async () => {
    const { buildVerifiedInventoryModel } = await import('../../src/features/guardian-inventory/pdf-model.js');
    const d = { ...emptyDataGuardian(), inventoryType: 'guardian', serviceIndicateIf: 'N/A', serviceMethod: 'Hand delivery' };
    const lines = blocksText(buildVerifiedInventoryModel(d).sections.find((s) => s.id === 'd5'));
    expect(lines).toContain('Indicate if Ward is: N/A');
    expect(lines).toContain('Method of service: Hand delivery');
    expect(blocksText(buildVerifiedInventoryModel({ ...d, serviceMethod: '' }).sections.find((s) => s.id === 'd5')).some((l) => /Method of service/.test(l))).toBe(false);
  });

  test('a Plan', async () => {
    const { planCertificateOfServiceSection } = await import('../../src/core/filing/plan-certificate-of-service.js');
    const s = planCertificateOfServiceSection({ ...emptyDataPlanAnnual(), certDate: '2026-03-01', certIndicator: 'e-mail' }, { attorneyName: () => '' }, (v) => v);
    expect(blocksText(s)).toEqual(expect.arrayContaining(['on this date: 2026-03-01', 'Method of service: e-mail']));
  });
});

describe('the warning: someone listed, no "no recipients" answer, no method -- never an export issue', () => {
  test.each([
    ['guardian', () => ({ ...emptyDataGuardian(), serviceRecipients: [{ name: 'Sam Lee', address: '', cityStateZip: '' }] }), 'D-5', 'serviceMethod'],
    ['annual', () => ({ ...emptyDataAnnual(), certRecipients: [RECIPIENT] }), 'Part X', 'certIndicator'],
    ['simplified', () => ({ ...emptyDataSimplified(), certRecipients: [RECIPIENT] }), 'Part VI', 'certIndicator'],
  ])('%s', (engine, make, section, field) => {
    const d = make();
    expect(sm.serviceMethodAdvisories(d, engine)).toEqual([{ code: 'certificate.method-missing', severity: 'advisory', field, message: `${section} — How the copies were served is not stated. Rule 2.516(f) lists the method of service among what a certificate of service includes.` }]);
    expect(sm.serviceMethodAdvisories({ ...d, [field]: 'U.S. Mail' }, engine)).toEqual([]);
    const noRecipients = engine === 'guardian' ? 'serviceNoRecipients' : 'certNoRecipients';
    expect(sm.serviceMethodAdvisories({ ...d, [noRecipients]: 'Yes' }, engine)).toEqual([]);
    const listKey = engine === 'guardian' ? 'serviceRecipients' : 'certRecipients';
    expect(sm.serviceMethodAdvisories({ ...d, [listKey]: [] }, engine), 'nobody listed: nothing to say about how').toEqual([]);
    openFiling({ ...d, inventoryType: engine });
    expect(validate[engine]().filter((e) => (e?.path || '') === field)).toEqual([]);
  });
});

describe('the ward\'s status, required on all three accountings', () => {
  test.each([
    ['guardian', () => emptyDataGuardian(), 'serviceIndicateIf', 'D-5 — Indicate if Ward is:'],
    ['annual', () => emptyDataAnnual(), 'certWardStatus', 'Part X — Indicate if Ward is:'],
    ['simplified', () => emptyDataSimplified(), 'certWardStatus', 'Part VI — Indicate if Ward is:'],
  ])('%s', (engine, make, field, message) => {
    openFiling({ ...make(), inventoryType: engine });
    const blank = validate[engine]().find((e) => e?.path === field);
    expect(blank?.message).toBe(message);
    openFiling({ ...make(), inventoryType: engine, [field]: 'N/A' });
    expect(validate[engine]().find((e) => e?.path === field)).toBeUndefined();
  });
});

describe('a ward\'s status typed into the old method box moves out, once', () => {
  test('exact matches only, case and spacing ignored; "mailed" stays the method; a second open changes nothing', () => {
    const d = { ...emptyDataAnnual(), certIndicator: '  ward IS under 14   years old ' };
    expect(mig.moveWardStatusFromMethod(d)).toEqual({ moved: true });
    expect(d).toMatchObject({ certWardStatus: 'Ward is under 14 years old', certIndicator: '', certIndicatorMigrated: true });
    expect(mig.moveWardStatusFromMethod(d)).toBeNull();
    const mailed = { ...emptyDataSimplified(), certIndicator: 'mailed' };
    expect(mig.moveWardStatusFromMethod(mailed)).toEqual({ moved: false });
    expect(mailed).toMatchObject({ certIndicator: 'mailed', certWardStatus: '', certIndicatorMigrated: true });
    const near = { ...emptyDataAnnual(), certIndicator: 'N/A - mailed' };
    mig.moveWardStatusFromMethod(near);
    expect(near.certIndicator, 'nothing guessed from other free text').toBe('N/A - mailed');
  });

  test('the log line names fields, never the value', async () => {
    // The mount() entries are fixed text; the value never appears in them.
    const fs = await import('node:fs');
    for (const f of ['src/features/annual-accounting/index.js', 'src/features/simplified-accounting/index.js']) {
      const line = fs.readFileSync(f, 'utf8').split('\n').find((l) => l.includes('status moved from the method-of-service box'));
      expect(line, f).toMatch(/certIndicator.*certWardStatus/);
      expect(line, f).not.toMatch(/\$\{/);
    }
  });
});

describe('importing a workbook\'s "Indicate if:" box, read by what it holds', () => {
  test('each ward-status value, "mailed", and blank', () => {
    for (const v of sm.WARD_STATUS_VALUES) expect(mig.readIndicateIfBox(v.toUpperCase())).toEqual({ wardStatus: v });
    expect(mig.readIndicateIfBox('mailed')).toEqual({ method: 'mailed' });
    expect(mig.readIndicateIfBox('')).toEqual({ wardStatus: '' });
    // A 72G workbook carries no method, so a blank box never erases the filing's.
    expect('method' in mig.readIndicateIfBox('')).toBe(false);
  });
});

// ── The certificate's lifecycle (72G step 6), every cell ────────────────────

const ANNUAL_CERT = {
  certDate: '2026-12-31', certIndicator: 'U.S. Mail', certNoRecipients: 'No', certWardStatus: 'N/A',
  certAttySignDate: '2027-01-02', certAttySignatureState: 'typed', certAttySignatureImage: 'data:image/png;base64,AA',
  certGuardianSignDate: '2027-01-03', certGuardianSignatureState: 'stamp', certGuardianSignatureImage: 'data:image/png;base64,BB',
  attorney_signatureDate: '2027-01-02',
  certRecipients: [RECIPIENT, { name: '', line2: '', line3: '', line4: '' }, { name: '', line2: '', line3: '', line4: '' }, { name: '', line2: '', line3: '', line4: '' }],
};
const SIMPLIFIED_CERT = { ...ANNUAL_CERT, certServiceDate: '2027-01-05' };
delete SIMPLIFIED_CERT.certDate;
const ANSWERS = ['certIndicator', 'certNoRecipients', 'certAttySignDate', 'certAttySignatureState', 'certAttySignatureImage', 'certGuardianSignDate', 'certGuardianSignatureState', 'certGuardianSignatureImage'];

describe('the lifecycle: a same-period conversion carries the recipients and the ward\'s status; every other answer starts blank', () => {
  test('Annual -> Simplified', () => {
    const src = { ...emptyDataAnnual(), inventoryType: 'annual', ...ANNUAL_CERT };
    const dest = { ...emptyDataSimplified(), inventoryType: 'simplified' };
    conv.convertToSimplified(src, 'annual', dest);
    expect(dest.certRecipients[0].name).toBe('Sam Lee');
    expect(dest.certWardStatus).toBe('N/A');
    for (const k of [...ANSWERS, 'certServiceDate', 'attorney_signatureDate']) expect(dest[k], k).toBe('');
  });

  test('Simplified -> Annual', () => {
    const src = { ...emptyDataSimplified(), inventoryType: 'simplified', ...SIMPLIFIED_CERT };
    const dest = { ...emptyDataAnnual(), inventoryType: 'annual' };
    conv.convertSimplifiedToAnnual(src, dest);
    expect(dest.certRecipients[0].name).toBe('Sam Lee');
    expect(dest.certWardStatus).toBe('N/A');
    for (const k of [...ANSWERS, 'certDate', 'attorney_signatureDate']) expect(dest[k], k).toBe('');
  });

  test('from a source not opened since 72G: an exact ward status still in the old box carries; the source is unchanged', () => {
    const src = { ...emptyDataAnnual(), inventoryType: 'annual', ...ANNUAL_CERT, certWardStatus: '', certIndicator: 'ward is totally incapacitated' };
    delete src.certIndicatorMigrated;
    const before = structuredClone(src);
    const dest = { ...emptyDataSimplified(), inventoryType: 'simplified' };
    conv.convertToSimplified(src, 'annual', dest);
    expect(dest.certWardStatus).toBe('Ward is totally incapacitated');
    expect(dest.certIndicator).toBe('');
    expect(src).toEqual(before);
    // Once opened (the marker set), the old box is the method, never a status.
    const opened = { ...src, certIndicatorMigrated: true };
    const dest2 = { ...emptyDataSimplified(), inventoryType: 'simplified' };
    conv.convertToSimplified(opened, 'annual', dest2);
    expect(dest2.certWardStatus).toBe('');
  });
});

describe('the lifecycle: a later filing carries only the recipients', () => {
  test('Inventory -> Annual and -> Simplified', () => {
    const src = { ...emptyDataGuardian(), inventoryType: 'guardian', serviceDate: '2026-01-02', serviceMethod: 'mail', serviceNoRecipients: 'No', serviceIndicateIf: 'N/A',
      serviceRecipients: [{ name: 'Sam Lee', address: '1 Main St', cityStateZip: 'Clearwater, FL 33755' }] };
    const toAnnual = { ...emptyDataAnnual(), inventoryType: 'annual' };
    conv.convertGuardianExtrasToAnnual(src, toAnnual);
    expect(toAnnual.certRecipients[0].name).toBe('Sam Lee');
    for (const k of ['certDate', 'certIndicator', 'certNoRecipients', 'certWardStatus', 'certAttySignDate']) expect(toAnnual[k], k).toBe('');
    const toSimplified = { ...emptyDataSimplified(), inventoryType: 'simplified' };
    conv.convertToSimplified(src, 'guardian', toSimplified);
    expect(toSimplified.certRecipients[0].name).toBe('Sam Lee');
    for (const k of ['certServiceDate', 'certIndicator', 'certNoRecipients', 'certWardStatus', 'certAttySignDate']) expect(toSimplified[k], k).toBe('');
  });

  test('New Filing from Existing (Annual -> Final): recipients only', () => {
    const src = { ...emptyDataAnnual(), inventoryType: 'annual', ...ANNUAL_CERT, guardians: [{ ...emptyDataAnnual().guardians[0], name: 'Pat', certifiesService: true }] };
    const out = carry.carryOverAccountingToAccounting(src, 'finalAccounting');
    expect(out.certRecipients[0].name).toBe('Sam Lee');
    for (const k of [...ANSWERS, 'certDate', 'certWardStatus']) expect(out[k] ?? '', k).toBe('');
    expect(out.guardians[0].certifiesService ?? false).toBe(false);
  });
});

describe('the lifecycle: a new year keeps the recipients for review and blanks every answer, on all seven forms', () => {
  test.each(['annual', 'finalAccounting', 'trustAccounting'])('%s', (type) => {
    const d = { ...emptyDataAnnual(), inventoryType: type, ...ANNUAL_CERT, guardians: [{ ...emptyDataAnnual().guardians[0], certifiesService: true }] };
    years.resetYearlyFieldsForNewYear(d, type);
    expect(d.certRecipients[0].name).toBe('Sam Lee');
    for (const k of [...ANSWERS, 'certDate', 'certWardStatus']) expect(d[k], k).toBe('');
    expect(d.guardians[0].certifiesService).toBe(false);
  });

  test('simplified', () => {
    const d = { ...emptyDataSimplified(), inventoryType: 'simplified', ...SIMPLIFIED_CERT };
    years.resetYearlyFieldsForNewYear(d, 'simplified');
    expect(d.certRecipients[0].name).toBe('Sam Lee');
    for (const k of [...ANSWERS, 'certServiceDate', 'certWardStatus']) expect(d[k], k).toBe('');
  });

  test('guardian (Initial Inventory)', () => {
    const d = { ...emptyDataGuardian(), inventoryType: 'guardian', serviceDate: '2026-01-02', serviceMethod: 'mail', serviceNoRecipients: 'No', serviceIndicateIf: 'N/A',
      serviceAttorney: { ...emptyDataGuardian().serviceAttorney, signatureDate: '2026-01-02', signatureState: 'typed', signatureImage: 'x' },
      serviceGuardian: { signatureDate: '2026-01-02', signatureState: 'stamp', signatureImage: 'y' },
      serviceRecipients: [{ name: 'Sam Lee', address: '1 Main St', cityStateZip: 'Clearwater' }] };
    years.resetYearlyFieldsForNewYear(d, 'guardian');
    expect(d.serviceRecipients[0].name).toBe('Sam Lee');
    expect(d).toMatchObject({ serviceDate: null, serviceMethod: '', serviceNoRecipients: '', serviceIndicateIf: '' });
    expect(d.serviceAttorney).toMatchObject({ signatureDate: null, signatureState: '', signatureImage: '' });
    expect(d.serviceGuardian).toMatchObject({ signatureDate: null, signatureState: '', signatureImage: '' });
  });

  test.each([
    ['planInitial', emptyDataPlanInitial], ['planAnnual', emptyDataPlanAnnual], ['planMinor', emptyDataPlanMinor], ['planSimplified', emptyDataPlanSimplified],
  ])('%s', (type, make) => {
    const d = { ...make(), inventoryType: type, certDate: '2026-03-01', certIndicator: 'mail', certNoRecipients: 'No', certSigner: 'attorney',
      certSignatureDate: '2026-03-02', certSignatureState: 'typed', certSignatureImage: 'x', certRecipients: [RECIPIENT] };
    years.resetYearlyFieldsForNewYear(d, type);
    expect(d.certRecipients[0].name).toBe('Sam Lee');
    for (const k of ['certDate', 'certIndicator', 'certNoRecipients', 'certSigner', 'certSignatureDate', 'certSignatureState', 'certSignatureImage']) expect(d[k], k).toBe('');
  });
});

// Found while building 72G: the new label mentions "attorney" and "ward", so
// the shared renderer took the box for a name and title-cased what the filer
// typed ("U.S. Mail to Each Recipient"); an e-mail address typed there would
// have been mangled too. The kind is stated, so the text is kept as typed.
describe('the method box keeps what the filer types', () => {
  test('its kind is plain text, preserved -- not the name the label would be guessed as', async () => {
    const { inferFieldKind, renderFormField } = await import('../../src/core/form/form-fields.js');
    expect(inferFieldKind(sm.SERVICE_METHOD_LABEL), 'why it must be stated').toBe('name');
    const html = renderFormField({ path: 'certIndicator', label: sm.SERVICE_METHOD_LABEL, value: 'e-mail to jane@example.com', kind: sm.SERVICE_METHOD_KIND });
    expect(html).toContain('data-field-kind="text"');
    expect(html).toContain('data-field-format-policy="preserve"');
  });

  test("the Plans' shared certificate page renders it that way", async () => {
    const { renderPlanCertificateOfServicePage } = await import('../../src/core/form/plan-certificate-of-service-page.js');
    const html = renderPlanCertificateOfServicePage({ filing: { ...emptyDataPlanAnnual(), certIndicator: 'U.S. Mail' }, route: '/p12', cfg: { attorneyName: () => '' } });
    const box = html.match(/<input[^>]*data-form-path="certIndicator"[^>]*>/)?.[0] || '';
    expect(box).toContain('data-field-format-policy="preserve"');
  });
});
