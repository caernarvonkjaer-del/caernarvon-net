// Milestone 72H: the certificate of service's attorney is the filing's
// attorney.
//
// The Clerk's workbooks link the certificate's attorney to the filing's (its
// name is a formula to the Cover; the Annual links the Bar number and address
// too). The Inventory's D-5 and the Simplified's Part VI asked for the name,
// Bar number, phone and address again and printed what was typed there, so a
// typo or a later correction left the certificate naming a different Bar
// number than Part IV / Part V for the same attorney. Now:
//   - the PDF and Excel certificate print D-2's / Part V's attorney;
//   - on the first open after 72H each detail typed on the old certificate
//     fills the filing attorney's field where that one is blank, once;
//   - a detail that still differs is listed on the certificate page until the
//     filer clicks "Discard old details";
//   - an imported pre-72H workbook is compared box by box;
//   - conversions write no certificate detail, and read a source not opened
//     since 72H as the fill would leave it, without changing it;
//   - the Inventory warns when its two attorney names differ.
//
// Red-first: the PDF, conversion and fill cases fail against the pre-72H
// models, conversions and the module without these functions.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { emptyDataGuardian } from '../../src/core/filing/models/guardian.js';
import { emptyDataSimplified } from '../../src/core/filing/models/simplified.js';
import { emptyDataAnnual } from '../../src/core/filing/models/annual.js';

let mig;
let conv;
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
  mig = await import('../../src/core/filing/certificate-migrations.js');
  conv = await import('../../src/core/filing/conversion.js');
  carry = await import('../../src/core/filing/carry-over.js');
});
afterAll(() => vi.unstubAllGlobals());

const D2 = { name: 'Robert T. Nguyen', barNumber: '00123456', phone: '(727) 555-0100', email: 'rn@law.example', secondaryEmail: 'desk@law.example', streetAddress: '1 Court St', cityStateZip: 'Clearwater, FL 33756' };
const OLD_D5 = { name: 'Robert Nguyen', barNumber: '01234567', phone: '(727) 555-0199', streetAddress: '9 Old Rd', cityStateZip: 'Largo, FL 33770' };

const inventory = (over = {}) => ({
  ...structuredClone(emptyDataGuardian()), inventoryType: 'guardian', attorneyForGuardian: D2.name,
  attorney: { ...emptyDataGuardian().attorney, ...D2 },
  serviceAttorney: { ...emptyDataGuardian().serviceAttorney, ...OLD_D5, signatureDate: '2026-01-05', signatureState: 'typed' },
  ...over,
});
const simplified = (over = {}) => ({
  ...structuredClone(emptyDataSimplified()), inventoryType: 'simplified', attorney: 'Rachel Lawyer',
  attorney_barNumber: '00765432', attorney_phone: '(727) 555-0200', attorney_email: 'rl@law.example',
  attorney_street: '2 Law Ave', attorney_cityStateZip: 'Tampa, FL 33602',
  certAttyBarNumber: '00999999', certAttyPhone: '', certAttyStreet: '2 Law Ave', certAttyCityStateZip: '',
  certAttySignDate: '2026-01-05', certAttySignatureState: 'typed',
  ...over,
});

describe('the PDF certificate prints the filing attorney, whatever the old certificate held', () => {
  test('Inventory Part VI: D-2\'s name, Bar number, phone, both emails and address; D-5\'s own signature date', async () => {
    const { buildVerifiedInventoryModel } = await import('../../src/features/guardian-inventory/pdf-model.js');
    const d5 = buildVerifiedInventoryModel(inventory()).sections.find((s) => s.id === 'd5');
    const block = d5.blocks.find((b) => b.type === 'signature-block');
    expect(block.signerName).toBe(D2.name);
    const values = Object.fromEntries(block.fields.flat().map((f) => [f.label, [].concat(f.value).join(' | ')]));
    expect(values).toMatchObject({ 'Florida Bar #': D2.barNumber, Phone: D2.phone, 'Primary Email': D2.email, 'Secondary Email': D2.secondaryEmail });
    expect(values.Address).toContain('1 Court St');
    expect(JSON.stringify(d5)).not.toContain(OLD_D5.barNumber);
    expect(block.signatureDate).toBe('01/05/2026');
  });

  test('Simplified Part VI: Part V\'s details; no certAtty... value printed', async () => {
    const { buildSimplifiedAccountingModel } = await import('../../src/features/simplified-accounting/pdf-model.js');
    const part6 = buildSimplifiedAccountingModel(simplified()).sections.find((s) => s.id === 'part6');
    const block = part6.blocks.find((b) => b.type === 'signature-block');
    const values = Object.fromEntries(block.fields.flat().map((f) => [f.label, [].concat(f.value).join(' | ')]));
    expect(values['Florida Bar #']).toBe('00765432');
    expect(JSON.stringify(part6)).not.toContain('00999999');
  });
});

describe('the Inventory\'s two attorney names', () => {
  test('warned when they differ, never for "Esq." or a blank, and never blocking', async () => {
    const { formDerivedOverwriteWarnings } = await import('../../src/core/filing/form-derived-fields.js');
    const codes = (d) => formDerivedOverwriteWarnings(d).filter((w) => w.code === 'form-derived.attorney-name');
    expect(codes(inventory({ attorneyForGuardian: 'Robert T. Nguyen, Esq.' }))).toEqual([]);
    expect(codes(inventory({ attorneyForGuardian: '' }))).toEqual([]);
    const w = codes(inventory({ attorneyForGuardian: 'Dana Reyes' }));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ severity: 'advisory', field: 'attorney.name' });
    expect(w[0].message).toBe("D-2 — The attorney's name (Robert T. Nguyen) differs from the Cover's Attorney for Guardian (Dana Reyes). The Excel workbook prints the Cover's name in Summary I and Parts IV and VI; the PDF prints D-2's name in its signature blocks. Confirm which is right before filing.");
  });
});

describe('the once-only fill of the filing attorney\'s blanks', () => {
  test('Inventory: the first open fills blanks only; the labels name fields, never values', () => {
    const d = inventory({ attorney: { ...emptyDataGuardian().attorney, name: D2.name, barNumber: '', phone: D2.phone } });
    const filled = mig.fillAttorneyFromOldCertificate(d, 'guardian');
    expect(filled).toEqual(['Florida Bar #', 'Street Address', 'City / State / Zip']);
    expect(filled.join(' ')).not.toMatch(/\d{5}|Old Rd|Largo/);
    expect(d.attorney).toMatchObject({ name: D2.name, barNumber: OLD_D5.barNumber, phone: D2.phone, streetAddress: OLD_D5.streetAddress });
    expect(d.certAttorneyMigrated).toBe(true);
  });

  test('a second open changes nothing; a field the filer clears afterwards stays clear', () => {
    const d = inventory({ attorney: { ...emptyDataGuardian().attorney, barNumber: '' } });
    mig.fillAttorneyFromOldCertificate(d, 'guardian');
    d.attorney.barNumber = '';
    expect(mig.fillAttorneyFromOldCertificate(d, 'guardian')).toBeNull();
    expect(d.attorney.barNumber).toBe('');
  });

  test('Simplified: Part V\'s blank phone and city/state/zip stay blank when the old certificate\'s are blank too', () => {
    const d = simplified({ attorney_barNumber: '', attorney_phone: '' });
    expect(mig.fillAttorneyFromOldCertificate(d, 'simplified')).toEqual(['Florida Bar #']);
    expect(d).toMatchObject({ attorney_barNumber: '00999999', attorney_phone: '', certAttorneyMigrated: true });
  });

  test('other engines are untouched', () => {
    const d = { ...emptyDataAnnual(), inventoryType: 'annual' };
    expect(mig.fillAttorneyFromOldCertificate(d, 'annual')).toBeNull();
    expect('certAttorneyMigrated' in d).toBe(false);
  });
});

describe('the old details on the certificate page', () => {
  test('listed while they differ (the marker set or not), gone once they match, and removed only by Discard', async () => {
    const d = inventory();
    mig.fillAttorneyFromOldCertificate(d, 'guardian');
    const diffs = mig.oldCertificateDetails(d, 'guardian');
    expect(diffs.map((x) => x.label)).toEqual(["Attorney's Name", 'Florida Bar #', 'Phone', 'Street Address', 'City / State / Zip']);
    expect(diffs[1]).toMatchObject({ old: OLD_D5.barNumber, current: D2.barNumber });

    const { oldCertificateDetailsHTML } = await import('../../src/core/form/certificate-attorney-note.js');
    const html = oldCertificateDetailsHTML(d, 'guardian', { actionAttr: 'data-inventory-action' });
    expect(html).toContain('Florida Bar #: 01234567. The certificate now prints D-2\'s (00123456).');
    expect(html).toContain('data-inventory-action="discard-old-certificate-details"');

    // Made to match, a detail drops off the list; the value stays in the file.
    d.attorney.barNumber = ` ${OLD_D5.barNumber} `;
    expect(mig.oldCertificateDetails(d, 'guardian').map((x) => x.label)).not.toContain('Florida Bar #');
    expect(d.serviceAttorney.barNumber).toBe(OLD_D5.barNumber);

    expect(mig.discardOldCertificateDetails(d, 'guardian')).toBe(5);
    expect(d.serviceAttorney).toMatchObject({ name: '', barNumber: '', phone: '', streetAddress: '', cityStateZip: '', signatureDate: '2026-01-05', signatureState: 'typed' });
    expect(mig.oldCertificateDetails(d, 'guardian')).toEqual([]);
    expect(oldCertificateDetailsHTML(d, 'guardian', { actionAttr: 'data-inventory-action' })).toBe('');
  });
});

describe('importing a workbook: the certificate\'s boxes against the filing attorney\'s', () => {
  test('the same, the certificate blank, the filing attorney blank, both different, and spaces only', () => {
    const out = mig.compareImportedCertificate(
      { bar: '00123456', phone: '', street: '1 Court St', csz: 'Tampa', extra: 'x' },
      { bar: '00123456', phone: '(727) 555-0199', street: '9 Old Rd', csz: ' Tampa ' });
    expect(out.attorney).toEqual({ bar: '00123456', phone: '(727) 555-0199', street: '1 Court St', csz: 'Tampa', extra: 'x' });
    expect(out.old).toEqual({ bar: '', phone: '', street: '9 Old Rd', csz: '' });
    expect(mig.compareImportedCertificate({ bar: '1' }, { bar: '' })).toEqual({ attorney: { bar: '1' }, old: { bar: '' } });
  });
});

describe('conversions', () => {
  const certDetailKeys = (d) => ['certAttyBarNumber', 'certAttyPhone', 'certAttyStreet', 'certAttyCityStateZip'].filter((k) => String(d[k] || ''));

  test('write no certificate detail: Inventory -> Simplified, Annual -> Simplified', () => {
    const fromInv = { ...emptyDataSimplified(), inventoryType: 'simplified' };
    conv.convertToSimplified(inventory({ certAttorneyMigrated: true }), 'guardian', fromInv);
    expect(certDetailKeys(fromInv)).toEqual([]);
    expect(fromInv.attorney_barNumber).toBe(D2.barNumber);
    const fromAnnual = { ...emptyDataSimplified(), inventoryType: 'simplified' };
    conv.convertToSimplified({ ...emptyDataAnnual(), inventoryType: 'annual', attorney_bar: '00765432' }, 'annual', fromAnnual);
    expect(certDetailKeys(fromAnnual)).toEqual([]);
    expect(fromAnnual.attorney_barNumber).toBe('00765432');
  });

  test('an Inventory not opened since 72H: its old D-5 Bar number reaches the new Annual; the source is unchanged', () => {
    const src = inventory({ attorney: { ...emptyDataGuardian().attorney, ...D2, barNumber: '' } });
    const before = structuredClone(src);
    const read = mig.withOldCertificateFilled(src, 'guardian');
    const dest = { ...emptyDataAnnual(), inventoryType: 'annual' };
    conv.convertGuardianExtrasToAnnual(read, dest);
    expect(dest.attorney_bar).toBe(OLD_D5.barNumber);
    // carry-over reads it the same way, for a new filing started from it
    expect(carry.carryOverFields(src, 'annual').attorney_bar).toBe(OLD_D5.barNumber);
    expect(src).toEqual(before);
  });

  test('a Simplified not opened since 72H: its old Part VI Bar number reaches the new Annual; once opened, it is read as it is', () => {
    const src = simplified({ attorney_barNumber: '' });
    const before = structuredClone(src);
    const dest = { ...emptyDataAnnual(), inventoryType: 'annual' };
    conv.convertSimplifiedToAnnual(mig.withOldCertificateFilled(src, 'simplified'), dest);
    expect(dest.attorney_bar).toBe('00999999');
    expect(src).toEqual(before);
    const opened = simplified({ attorney_barNumber: '', certAttorneyMigrated: true });
    expect(mig.withOldCertificateFilled(opened, 'simplified')).toBe(opened);
  });
});
