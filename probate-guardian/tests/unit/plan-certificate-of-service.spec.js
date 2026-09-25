import { describe, expect, test } from 'vitest';
import {
  ATTESTATION_57B, CERT_SIGNER_OPTIONS, emptyCertificateOfService, migratePlanCertificateOfService,
  resolveCertSigner, certificateRecipientsSettled, certificateStarted, certificateOptional, planCertificateAdvisories,
  planCertificateOfServiceSection,
} from '../../src/core/filing/plan-certificate-of-service.js';

// Milestone 68C. The Plans' certificate of service, shared by all four forms.
// The rules under test: a legacy filing gains the fields on load and never
// loses one; the signer defaults to the attorney when the plan names one and
// to Guardian 1 otherwise, a stored choice winning; the sidebar's "settled"
// rule is the accountings' recipient rule; the print preview warns and never
// blocks; and the PDF prints the recipients, or the attestation, and a
// "Certified by" block.

const fmt = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const cfg = { attorneyName: (d) => d.attorney_name || '', planNoun: 'plan' };

describe('shape and migration', () => {
  test('a filing saved before 68C gains every certificate field, once, and keeps what it has', () => {
    const legacy = { wardName: 'W', planGuardians: [{ name: 'Pat' }] };
    expect(migratePlanCertificateOfService(legacy)).toBe(true);
    expect(legacy).toMatchObject(emptyCertificateOfService());
    expect(legacy.wardName).toBe('W');
    expect(migratePlanCertificateOfService(legacy)).toBe(false);

    const kept = { certRecipients: [{ name: 'Sam', line2: '', line3: '', line4: '' }], certNoRecipients: 'No' };
    migratePlanCertificateOfService(kept);
    expect(kept.certRecipients[0].name).toBe('Sam');
    expect(kept.certNoRecipients).toBe('No');
    expect(migratePlanCertificateOfService(null)).toBe(false);
  });

  test('an empty recipient collection is given its one blank card, so the page always has a Recipient 1', () => {
    const f = { ...emptyCertificateOfService(), certRecipients: [] };
    expect(migratePlanCertificateOfService(f)).toBe(true);
    expect(f.certRecipients).toHaveLength(1);
  });
});

describe('who certifies', () => {
  test('two choices, Guardian and Attorney, in that order', () => {
    expect(CERT_SIGNER_OPTIONS.map((o) => o.value)).toEqual(['guardian', 'attorney']);
  });

  test('defaults to the attorney when the plan names one, otherwise Guardian 1; a stored choice wins', () => {
    const base = { planGuardians: [{ name: 'Pat Rivera' }] };
    expect(resolveCertSigner({ ...base }, cfg)).toEqual({ role: 'guardian', name: 'Pat Rivera', defaulted: true });
    expect(resolveCertSigner({ ...base, attorney_name: 'Jordan Reyes, Esq.' }, cfg)).toEqual({ role: 'attorney', name: 'Jordan Reyes, Esq.', defaulted: true });
    expect(resolveCertSigner({ ...base, attorney_name: 'Jordan Reyes, Esq.', certSigner: 'guardian' }, cfg)).toEqual({ role: 'guardian', name: 'Pat Rivera', defaulted: false });
    // A garbage stored value is ignored, not honoured.
    expect(resolveCertSigner({ ...base, certSigner: 'clerk' }, cfg).role).toBe('guardian');
    expect(resolveCertSigner({}, cfg)).toEqual({ role: 'guardian', name: '', defaulted: true });
  });
});

describe('settled and started -- the sidebar and the print preview', () => {
  test('settled: Recipient 1 named, or the attestation answered Yes; never by an unanswered blank page', () => {
    expect(certificateRecipientsSettled(emptyCertificateOfService())).toBe(false);
    expect(certificateRecipientsSettled({ ...emptyCertificateOfService(), certNoRecipients: 'Yes' })).toBe(true);
    expect(certificateRecipientsSettled({ ...emptyCertificateOfService(), certRecipients: [{ name: 'Sam', line2: '', line3: '', line4: '' }] })).toBe(true);
    // A started but nameless second card is not settled -- the accountings' rule.
    expect(certificateRecipientsSettled({ ...emptyCertificateOfService(), certRecipients: [{ name: 'Sam', line2: '', line3: '', line4: '' }, { name: '', line2: 'PO Box 1', line3: '', line4: '' }] })).toBe(false);
    expect(certificateRecipientsSettled(null)).toBe(false);
  });

  test('started: any recipient field, the attestation, the date, the method, the signer or the signature', () => {
    expect(certificateStarted(emptyCertificateOfService())).toBe(false);
    for (const patch of [
      { certRecipients: [{ name: '', line2: 'PO Box 1', line3: '', line4: '' }] }, { certNoRecipients: 'No' }, { certDate: '2026-03-01' },
      { certIndicator: 'mailed' }, { certSigner: 'guardian' }, { certSignatureDate: '2026-03-01' }, { certSignatureState: 'typed' },
    ]) expect(certificateStarted({ ...emptyCertificateOfService(), ...patch }), JSON.stringify(patch)).toBe(true);
    expect(certificateStarted({ ...emptyCertificateOfService(), certSignatureState: 'none' }), 'an explicit "none" is not a start').toBe(false);
  });

  test('advisories: one line for an untouched certificate (none at all where it is optional), otherwise what is blank; every one advisory', () => {
    const codes = (f, opts) => planCertificateAdvisories(f, opts).map((a) => a.code);
    const untouched = planCertificateAdvisories(emptyCertificateOfService(), { section: 'Certificate of Service' });
    expect(untouched).toHaveLength(1);
    expect(untouched[0]).toMatchObject({ code: 'plan-certificate.not-started', severity: 'advisory', field: 'certRecipients.0.name' });
    expect(untouched[0].message).toMatch(/^Certificate of Service — /);
    expect(untouched[0].message).toContain('can be filed without it');
    // Follow-up, 2026-09-24: on the Simplified Plan, whose certificate the
    // Clerk does not require, an untouched one says nothing at all -- every
    // filer who skipped it was being told "Not completed" about a page their
    // form does not need.
    expect(planCertificateAdvisories(emptyCertificateOfService(), { optional: true })).toEqual([]);

    const started = { ...emptyCertificateOfService(), certIndicator: 'mailed' };
    expect(codes(started)).toEqual(['plan-certificate.recipients', 'plan-certificate.date', 'plan-certificate.signature']);
    expect(codes(started, { optional: true }), 'once started, an optional certificate is told the same as any other').toEqual(codes(started));
    const complete = { ...emptyCertificateOfService(), certRecipients: [{ name: 'Sam', line2: '', line3: '', line4: '' }], certDate: '2026-03-01', certSignatureState: 'typed', certSignatureDate: '2026-03-01' };
    expect(codes(complete)).toEqual([]);
    const attested = { ...emptyCertificateOfService(), certNoRecipients: 'Yes', certDate: '2026-03-01', certSignatureDate: '2026-03-01' };
    expect(codes(attested), 'a legacy-style date alone counts as a typed signature').toEqual([]);
    expect(codes({ ...complete, certRecipients: [...complete.certRecipients, { name: '', line2: 'PO Box 1', line3: '', line4: '' }] })).toEqual(['plan-certificate.recipient-2']);
    for (const a of planCertificateAdvisories(started)) expect(a.severity).toBe('advisory');
    expect(planCertificateAdvisories(null)).toEqual([]);
  });
});

describe('the PDF section', () => {
  test('prints the recipients, the date and method, and a "Certified by" block naming the resolved signer', () => {
    const f = {
      ...emptyCertificateOfService(),
      planGuardians: [{ name: 'Pat Rivera' }], attorney_name: 'Jordan Reyes, Esq.',
      certRecipients: [{ name: 'Sam Recipient', line2: '1 Main St', line3: 'Clearwater, FL 33755', line4: '' }, { name: '', line2: '', line3: '', line4: '' }],
      certDate: '2026-03-01', certIndicator: 'mailed', certSignatureDate: '2026-03-02', certSignatureState: 'typed',
    };
    const s = planCertificateOfServiceSection(f, cfg, fmt);
    expect(s).toMatchObject({ id: 'certificate-of-service', title: 'Certificate of Service', pageBreakBefore: true });
    const [certify, table, dated, sig] = s.blocks;
    expect(certify.text).toBe('I hereby certify that a copy of this plan has been furnished to:');
    expect(table.type).toBe('table');
    expect(table.rows).toEqual([['1', 'Sam Recipient', ['1 Main St', 'Clearwater, FL 33755']]]);
    expect(dated.text).toBe('on this date: 03/01/2026 | mailed');
    expect(sig).toMatchObject({ type: 'signature-block', role: 'Certified by (Attorney)', signerName: 'Jordan Reyes, Esq.', signatureDate: '03/02/2026', signatureState: 'typed' });
  });

  test('a Yes attestation prints the attestation instead of the recipients, keeping the cards\' data out of the filed certificate', () => {
    const f = { ...emptyCertificateOfService(), planGuardians: [{ name: 'Pat Rivera' }], certRecipients: [{ name: 'Typed Then Attested', line2: '', line3: '', line4: '' }], certNoRecipients: 'Yes' };
    const s = planCertificateOfServiceSection(f, cfg, fmt);
    expect(s.blocks.some((b) => b.type === 'table')).toBe(false);
    expect(s.blocks[1].text).toBe(ATTESTATION_57B);
    expect(JSON.stringify(s.blocks)).not.toContain('Typed Then Attested');
    expect(s.blocks[3]).toMatchObject({ role: 'Certified by (Guardian)', signerName: 'Pat Rivera' });
    expect(s.blocks[2].text).toBe('on this date: the date indicated below');
  });

  test('nothing entered prints "No service recipients listed." rather than an empty table', () => {
    const s = planCertificateOfServiceSection(emptyCertificateOfService(), cfg, fmt);
    expect(s.blocks[1]).toMatchObject({ type: 'notice', text: 'No service recipients listed.' });
  });
});

// Follow-up, 2026-09-24. Which Plan's certificate is optional is decided once,
// here, so the print preview, the page's guidance box and the sidebar cannot
// disagree about it.
describe('which certificate is optional', () => {
  test('only the Simplified Plan\'s, per the Clerk\'s own Simplified Plan checklist', () => {
    expect(certificateOptional('planSimplified')).toBe(true);
    for (const type of ['planAnnual', 'planInitial', 'planMinor', 'annual', 'simplified', 'guardian', '', undefined]) {
      expect(certificateOptional(type), String(type)).toBe(false);
    }
  });
});
