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
    // Milestone 72G: a complete certificate states how the copies were served.
    const complete = { ...emptyCertificateOfService(), certRecipients: [{ name: 'Sam', line2: '', line3: '', line4: '' }], certDate: '2026-03-01', certIndicator: 'U.S. Mail', certSignatureState: 'typed', certSignatureDate: '2026-03-01' };
    expect(codes(complete)).toEqual([]);
    expect(codes({ ...complete, certIndicator: '' }), 'someone listed and no method: the 72G warning').toEqual(['plan-certificate.method']);
    expect(planCertificateAdvisories({ ...complete, certIndicator: '' })[0].message).toBe('Certificate of Service — How the copies were served is not stated. Rule 2.516(f) lists the method of service among what a certificate of service includes.');
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
    // Milestone 72G: the method has its own line after the date.
    const [certify, table, dated, method, sig] = s.blocks;
    expect(certify.text).toBe('I hereby certify that a copy of this plan has been furnished to:');
    expect(table.type).toBe('table');
    expect(table.rows).toEqual([['1', 'Sam Recipient', ['1 Main St', 'Clearwater, FL 33755']]]);
    expect(dated.text).toBe('on this date: 03/01/2026');
    expect(method.text).toBe('Method of service: mailed');
    expect(sig).toMatchObject({ type: 'signature-block', role: 'Certified by (Attorney)', signerName: 'Jordan Reyes, Esq.', signatureDate: '03/02/2026', signatureState: 'typed' });
  });

  // Milestone 74F (74F-2): a Yes prints "No service recipients are required." -- never the question or
  // its disclaimer, which it used to print onto the filed certificate.
  test('a Yes attestation prints "No service recipients are required." instead of the recipients, keeping the cards\' data out of the filed certificate', () => {
    const f = { ...emptyCertificateOfService(), planGuardians: [{ name: 'Pat Rivera' }], certRecipients: [{ name: 'Typed Then Attested', line2: '', line3: '', line4: '' }], certNoRecipients: 'Yes' };
    const s = planCertificateOfServiceSection(f, cfg, fmt);
    expect(s.blocks.some((b) => b.type === 'table')).toBe(false);
    expect(s.blocks[1].text).toBe('No service recipients are required.');
    expect(JSON.stringify(s.blocks)).not.toContain(ATTESTATION_57B);
    expect(JSON.stringify(s.blocks)).not.toMatch(/filer attestation|determine legal necessity/);
    expect(JSON.stringify(s.blocks)).not.toContain('Typed Then Attested');
    expect(s.blocks[3]).toMatchObject({ role: 'Certified by (Guardian)', signerName: 'Pat Rivera' });
    expect(s.blocks[2].text).toBe('on this date: the date indicated below');
  });

  test('nothing entered prints "No service recipients are listed." rather than an empty table (74F-2)', () => {
    const s = planCertificateOfServiceSection(emptyCertificateOfService(), cfg, fmt);
    expect(s.blocks[1]).toMatchObject({ type: 'notice', text: 'No service recipients are listed.' });
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

// Milestone 72C. The Simplified Plan's certificate looked for its attorney
// under `attorney`, a field that form does not have (its attorney is
// `attorney_name`), so it always defaulted to Guardian 1 and never printed an
// attorney. It finds the attorney now -- and, once, a certificate already
// signed under the old default is pinned to the guardian it printed, so a
// signature the guardian applied never moves under the attorney's name.
describe('Milestone 72C: the Simplified Plan certificate finds its attorney', () => {
  const signedBy = {
    'a date': { certSignatureDate: '2026-01-05' },
    '"/s/"': { certSignatureState: 'typed' },
    'a stamp': { certSignatureState: 'stamp' },
    'an image': { certSignatureImage: 'data:image/png;base64,AAAA' },
  };

  test.each(Object.entries(signedBy))('signed with %s and no stored signer: pinned to the guardian, once', async (_, signature) => {
    const { pinPlanSimplifiedCertSigner } = await import('../../src/core/filing/certificate-migrations.js');
    const d = { ...emptyCertificateOfService(), certSignerMigrated: false, attorney_name: 'Jordan Reyes, Esq.', ...signature };
    expect(pinPlanSimplifiedCertSigner(d)).toBe(true);
    expect(d).toMatchObject({ certSigner: 'guardian', certSignerMigrated: true });
  });

  test('an unsigned certificate is left to the default, and the marker still set', async () => {
    const { pinPlanSimplifiedCertSigner } = await import('../../src/core/filing/certificate-migrations.js');
    for (const extra of [{}, { certSignatureState: 'none' }, { certDate: '2026-01-05', certRecipients: [{ name: 'Sam Lee', line2: '', line3: '', line4: '' }] }]) {
      const d = { ...emptyCertificateOfService(), certSignerMigrated: false, ...extra };
      expect(pinPlanSimplifiedCertSigner(d)).toBe(true);
      expect(d.certSigner).toBe('');
      expect(d.certSignerMigrated).toBe(true);
    }
  });

  test('a stored choice is never changed, and a filing a 72C open has seen is never touched again', async () => {
    const { pinPlanSimplifiedCertSigner } = await import('../../src/core/filing/certificate-migrations.js');
    const chose = { ...emptyCertificateOfService(), certSigner: 'attorney', certSignatureDate: '2026-01-05' };
    pinPlanSimplifiedCertSigner(chose);
    expect(chose.certSigner).toBe('attorney');
    // Opened once since 72C, unsigned; the attorney signs later under the
    // default. The next open leaves it to the attorney.
    const later = { ...emptyCertificateOfService(), certSignerMigrated: true, certSignatureDate: '2026-02-01' };
    expect(pinPlanSimplifiedCertSigner(later)).toBe(false);
    expect(later.certSigner).toBe('');
    expect(pinPlanSimplifiedCertSigner(null)).toBe(false);
  });

  test('the filed certificate: the attorney by default, the guardian once pinned', async () => {
    globalThis.window = globalThis.window || {};
    const { buildPlanSimplifiedModel } = await import('../../src/features/plan-simplified/pdf-model.js');
    const { emptyDataPlanSimplified } = await import('../../src/core/filing/models/plan-simplified.js');
    const filing = (over) => ({ ...emptyDataPlanSimplified(), planGuardians: [{ name: 'Pat Rivera', signatureDate: '', email: '', phone: '', mailingAddress: '' }], attorney_name: 'Jordan Reyes, Esq.', ...over });
    const signer = (d) => buildPlanSimplifiedModel(d).sections.find((s) => s.id === 'certificate-of-service').blocks.find((b) => b.type === 'signature-block');
    expect(signer(filing({}))).toMatchObject({ role: 'Certified by (Attorney)', signerName: 'Jordan Reyes, Esq.' });
    expect(signer(filing({ certSigner: 'guardian' }))).toMatchObject({ role: 'Certified by (Guardian)', signerName: 'Pat Rivera' });
    // Chosen explicitly: it used to print "Certified by (Attorney)" over a
    // blank name.
    expect(signer(filing({ certSigner: 'attorney' }))).toMatchObject({ role: 'Certified by (Attorney)', signerName: 'Jordan Reyes, Esq.' });
  });
});
