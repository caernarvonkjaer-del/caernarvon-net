// Milestone 71B: filers who need no attorney are no longer blocked.
//
// Before this milestone five of the nine forms -- the Initial Inventory and the
// Annual, Final, Trust and Simplified Accountings -- required an attorney
// unconditionally: a pro se Simplified Accounting (section 744.3679(3): "The
// guardian need not be represented by an attorney") and a guardian advocate
// (Fla. Prob. R. 5.030(a)) could not export without overriding the gate, and the
// filed PDF then carried an empty attorney attestation and an attorney
// certificate of service nobody signed.
//
// The first describe is the regression proof (red-first: it fails on the
// pre-71B validators, which raise attorney issues on a filing with no
// attorney). The rest covers what 71B added: the shared "started" rule, who
// signs the certificate of service instead, the Preview & Export notes and the
// line the PDF prints. Feature modules are imported the way
// preparer-flag-validation.spec.js does, with `window` stubbed first; 71B's
// own modules are imported inside the tests that use them, so the regression
// describe still loads -- and fails for its stated reason -- without them.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { openFiling } from './support/open-filing.js';
import { emptyDataGuardian } from '../../src/core/filing/models/guardian.js';
import { emptyDataAnnual } from '../../src/core/filing/models/annual.js';
import { emptyDataSimplified } from '../../src/core/filing/models/simplified.js';
import { getD } from '../../src/core/state.js';

let validateGuardian;
let validateAnnual;
let validateSimplified;

beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  ({ validateGuardian } = await import('../../src/features/guardian-inventory/index.js'));
  ({ validateAnnual } = await import('../../src/features/annual-accounting/index.js'));
  ({ validateSimplified } = await import('../../src/features/simplified-accounting/index.js'));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const messagesOf = (issues) => issues.map((e) => String(e?.message ?? e));

const guardianFiling = (over = {}) => openFiling({ ...emptyDataGuardian(), inventoryType: 'guardian', ...over });
const annualFiling = (over = {}) => openFiling({ ...emptyDataAnnual(), inventoryType: 'annual', ...over });
const simplifiedFiling = (over = {}) => openFiling({ ...emptyDataSimplified(), inventoryType: 'simplified', ...over });

const inventoryMessages = () => messagesOf(validateGuardian());
const annualMessages = () => messagesOf(validateAnnual());
const simplifiedMessages = () => messagesOf(validateSimplified());

describe('Milestone 71B: a filing with no attorney raises no attorney issue', () => {
  test('Initial Inventory: no Cover attorney, D-2 attorney or D-5 attorney issue', () => {
    guardianFiling();
    const m = inventoryMessages();
    expect(m.filter((s) => s.startsWith('Cover — Attorney for Guardian'))).toEqual([]);
    expect(m.filter((s) => s.startsWith('D-2 Attorney'))).toEqual([]);
    expect(m.filter((s) => s.startsWith('D-5 Attorney'))).toEqual([]);
  });

  test('Annual Accounting: no Part V issue and no Part X attorney signature issue', () => {
    annualFiling();
    const m = annualMessages();
    expect(m.filter((s) => s.startsWith('Part V —') || s.startsWith('Part V ')).filter((s) => /attorney/i.test(s))).toEqual([]);
    expect(m.filter((s) => s.startsWith('Part X') && /attorney/i.test(s))).toEqual([]);
  });

  test.each(['finalAccounting', 'trustAccounting'])('%s shares the rule (one engine)', (inventoryType) => {
    annualFiling({ inventoryType, filingType: inventoryType === 'finalAccounting' ? 'Final' : 'Trust' });
    const m = annualMessages();
    expect(m.filter((s) => /attorney/i.test(s))).toEqual([]);
  });

  test('Simplified Accounting: no Cover attorney, Part V or Part VI attorney issue (section 744.3679(3))', () => {
    simplifiedFiling();
    const m = simplifiedMessages();
    expect(m.filter((s) => s.startsWith('Cover — Attorney for Guardian'))).toEqual([]);
    expect(m.filter((s) => s.startsWith('Part V —'))).toEqual([]);
    expect(m.filter((s) => s.startsWith('Part VI') && /attorney/i.test(s))).toEqual([]);
  });
});

describe('once an attorney is started, the whole block is required again', () => {
  test('Inventory: an attorney name alone brings back the Cover and D-2 and D-5 attorney requirements', () => {
    guardianFiling({ attorney: { ...emptyDataGuardian().attorney, name: 'Jordan Pike' } });
    const m = inventoryMessages();
    expect(m).toContain('Cover — Attorney for Guardian is required.');
    expect(m.some((s) => s.startsWith('D-2 Attorney — Bar Number'))).toBe(true);
    expect(m.some((s) => s.startsWith('D-5 Attorney — Name'))).toBe(true);
  });

  test('Annual: a bar number alone brings back Part V', () => {
    annualFiling({ attorney_bar: '123456' });
    const m = annualMessages();
    expect(m).toContain('Part V — Attorney Phone');
    expect(m).toContain('Part V — Attorney Email');
  });

  test('Simplified: an attorney phone alone brings back the Cover name and Part V', () => {
    simplifiedFiling({ attorney_phone: '727-555-0143' });
    const m = simplifiedMessages();
    expect(m).toContain('Cover — Attorney for Guardian');
    expect(m).toContain('Part V — Attorney Bar Number');
  });

  test('an Unsigned signature choice alone does not start an attorney; "/s/" does', async () => {
    const { isAttorneyStarted } = await import('../../src/core/validation/attorney-block.js');
    expect(isAttorneyStarted({ ...emptyDataAnnual(), attorney_signatureState: 'none' }, 'annual')).toBe(false);
    expect(isAttorneyStarted({ ...emptyDataAnnual(), attorney_signatureState: 'typed' }, 'annual')).toBe(true);
    // The preparer flag counts only when ticked.
    expect(isAttorneyStarted({ ...emptyDataAnnual(), attorney_isPreparer: false }, 'annual')).toBe(false);
    expect(isAttorneyStarted({ ...emptyDataAnnual(), attorney_isPreparer: true }, 'annual')).toBe(true);
    // The certificate signer is not the attorney block: with no attorney the guardian certifies.
    expect(isAttorneyStarted({ ...emptyDataAnnual(), certAttySignatureState: 'typed' }, 'annual')).toBe(false);
    expect(isAttorneyStarted({ ...emptyDataGuardian(), serviceAttorney: { ...emptyDataGuardian().serviceAttorney, name: 'X' } }, 'guardian')).toBe(false);
    // An engine this rule does not know keeps its attorney requirements.
    expect(isAttorneyStarted({}, 'unknown-engine')).toBe(true);
  });
});

const g = (name, extra = {}) => ({ name, ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '', signatureDateLabel: '', signatureState: '', signatureImage: '', isPreparer: false, certifiesService: false, ...extra });

describe('with no attorney, the guardian who served the copies signs the certificate', () => {
  test('one guardian: nothing is asked, and the signature is checked under that guardian\'s name', () => {
    annualFiling({ guardians: [g('Maria Lopez')], certGuardianSignatureState: 'typed' });
    const m = annualMessages();
    expect(m.filter((s) => s.includes('Tick the guardian'))).toEqual([]);
    expect(m.some((s) => s.startsWith('Part X — Guardian'))).toBe(true); // "/s/" with no date
  });

  test('co-guardians and nobody ticked: an ordinary issue, never defaulted to Guardian #1', () => {
    annualFiling({ guardians: [g('Maria Lopez'), g('Ann Lopez')] });
    const issues = validateAnnual();
    const tick = issues.find((e) => String(e.message).includes('Tick the guardian'));
    expect(tick, 'unanswered with co-guardians').toBeTruthy();
    expect(tick.path).toBe('guardians.0.certifiesService');
    expect(tick.bypassable).not.toBe(false);
  });

  test('ticking one names that guardian; ticking another clears the first', async () => {
    const { resolveServiceCertifier, claimServiceCertifier } = await import('../../src/core/filing/unrepresented-filing.js');
    const d = annualFiling({ guardians: [g('Maria Lopez'), g('Ann Lopez', { certifiesService: true })] });
    expect(annualMessages().filter((s) => s.includes('Tick the guardian'))).toEqual([]);
    expect(resolveServiceCertifier(d)).toMatchObject({ index: 1, name: 'Ann Lopez' });
    d.guardians[0].certifiesService = true;
    claimServiceCertifier(d, 'guardians.0.certifiesService');
    expect(d.guardians[1].certifiesService).toBe(false);
    expect(resolveServiceCertifier(d)).toMatchObject({ index: 0, name: 'Maria Lopez' });
  });

  test('deleting a guardian before the ticked one keeps the same person; deleting the ticked one returns to unanswered', async () => {
    const { resolveServiceCertifier } = await import('../../src/core/filing/unrepresented-filing.js');
    const d = annualFiling({ guardians: [g('Maria Lopez'), g('Ann Lopez'), g('Joe Lopez', { certifiesService: true })] });
    d.guardians.splice(0, 1);
    expect(resolveServiceCertifier(d)).toMatchObject({ index: 1, name: 'Joe Lopez' });
    d.guardians.splice(1, 1);
    // One guardian left: nothing to choose, so that guardian certifies.
    expect(resolveServiceCertifier(d)).toMatchObject({ index: 0, name: 'Ann Lopez' });
    d.guardians.push(g('Kim Lopez'));
    expect(resolveServiceCertifier(d), 'two guardians again, neither ticked').toBeNull();
  });

  test('a blank co-guardian card with only the box ticked is still a blank card', async () => {
    const { certifyingCandidates } = await import('../../src/core/filing/unrepresented-filing.js');
    const d = annualFiling({ guardians: [g('Maria Lopez'), g('', { certifiesService: true })] });
    expect(certifyingCandidates(d).map((c) => c.index)).toEqual([0]);
  });

  test('Inventory and Simplified apply the same rule on D-5 and Part VI', () => {
    guardianFiling({ guardians: [{ ...emptyDataGuardian().guardians[0], name: 'A' }, { ...emptyDataGuardian().guardians[0], name: 'B' }] });
    expect(inventoryMessages().some((s) => s.startsWith('D-5 — Tick the guardian'))).toBe(true);
    simplifiedFiling({ guardians: [{ ...emptyDataSimplified().guardians[0], name: 'A' }, { ...emptyDataSimplified().guardians[0], name: 'B' }] });
    expect(simplifiedMessages().some((s) => s.startsWith('Part VI — Tick the guardian'))).toBe(true);
  });

  test('once an attorney is started, no guardian certificate is asked for', () => {
    annualFiling({ attorney: 'Jordan Pike', guardians: [g('Maria Lopez'), g('Ann Lopez')] });
    expect(annualMessages().filter((s) => s.includes('Tick the guardian'))).toEqual([]);
  });
});

describe('why there is no attorney: asked, noted, never blocked on', () => {
  test('the basis is never an export issue', () => {
    annualFiling({ typeOfGuardianship: 'Guardian Advocate' });
    expect(annualMessages().filter((s) => /waiv|basis|why/i.test(s))).toEqual([]);
  });

  test('Preview & Export notes: unanswered basis, a court order without its date, and the Excel certificate', async () => {
    const { unrepresentedAdvisories } = await import('../../src/core/filing/unrepresented-filing.js');
    const where = { engineId: 'annual', basisSection: 'Part I', certificateSection: 'Part X' };
    const codes = (d) => unrepresentedAdvisories(d, where).map((a) => a.code);
    expect(codes(emptyDataAnnual())).toEqual(['attorney.waiver-basis-unanswered', 'attorney.guardian-certificate-excel']);
    expect(codes({ ...emptyDataAnnual(), attorneyWaiverBasis: 'court-order' })).toEqual(['attorney.waiver-order-date-missing', 'attorney.guardian-certificate-excel']);
    expect(codes({ ...emptyDataAnnual(), attorneyWaiverBasis: 'court-order', attorneyWaiverOrderDate: '2025-03-04' })).toEqual(['attorney.guardian-certificate-excel']);
    expect(codes({ ...emptyDataAnnual(), attorneyWaiverBasis: 'guardian-advocate' })).toEqual(['attorney.guardian-certificate-excel']);
    // Every note is advisory.
    expect(unrepresentedAdvisories(emptyDataAnnual(), where).every((a) => a.severity === 'advisory')).toBe(true);
    // The Simplified Accounting's basis is the statute: never asked.
    expect(unrepresentedAdvisories(emptyDataSimplified(), { engineId: 'simplified', basisSection: 'Cover', certificateSection: 'Part VI' }).map((a) => a.code))
      .toEqual(['attorney.guardian-certificate-excel']);
    // With an attorney, nothing.
    expect(codes({ ...emptyDataAnnual(), attorney: 'Jordan Pike' })).toEqual([]);
  });

  test('the line the PDF prints for each basis', async () => {
    const { unrepresentedStatement } = await import('../../src/core/filing/unrepresented-filing.js');
    expect(unrepresentedStatement({ ...emptyDataAnnual(), attorneyWaiverBasis: 'guardian-advocate' }, 'annual'))
      .toBe('The guardian is not represented by counsel: guardian advocate (Fla. Prob. R. 5.030(a)).');
    expect(unrepresentedStatement({ ...emptyDataAnnual(), attorneyWaiverBasis: 'court-order', attorneyWaiverOrderDate: '2025-03-04' }, 'annual'))
      .toBe('The guardian is not represented by counsel: representation waived by court order dated 03/04/2025.');
    expect(unrepresentedStatement({ ...emptyDataGuardian(), attorneyWaiverBasis: 'self-represented-attorney' }, 'guardian'))
      .toContain('the guardian is a Florida attorney representing themselves');
    expect(unrepresentedStatement(emptyDataAnnual(), 'annual')).toBe('The guardian is not represented by counsel.');
    expect(unrepresentedStatement(emptyDataSimplified(), 'simplified')).toContain('§744.3679(3)');
    expect(unrepresentedStatement({ ...emptyDataAnnual(), attorney: 'Jordan Pike' }, 'annual')).toBe('');
  });
});

describe('the filed PDF', () => {
  test('Annual: Part V states the basis instead of an empty attestation; Part X is signed by the guardian', async () => {
    const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
    const model = buildAnnualAccountingModel({ ...emptyDataAnnual(), inventoryType: 'annual', attorneyWaiverBasis: 'guardian-advocate', guardians: [g('Maria Lopez', { phone: '727-555-0100' })] });
    const part5 = model.sections.find((s) => s.id === 'part5');
    expect(part5.blocks).toEqual([{ type: 'notice', tag: 'P', text: 'The guardian is not represented by counsel: guardian advocate (Fla. Prob. R. 5.030(a)).' }]);
    const part10 = model.sections.find((s) => s.id === 'part10');
    expect(part10.title).toBe('Part X — CERTIFICATE OF SERVICE');
    const signer = part10.blocks.find((b) => b.type === 'signature-block');
    expect(signer).toMatchObject({ role: 'Guardian (Service)', signerName: 'Maria Lopez' });
  });

  test('Annual with an attorney: the attestation and attorney certificate print unchanged', async () => {
    const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
    const model = buildAnnualAccountingModel({ ...emptyDataAnnual(), inventoryType: 'annual', attorney: 'Jordan Pike' });
    expect(model.sections.find((s) => s.id === 'part5').blocks.some((b) => b.type === 'signature-block' && b.role === 'Attorney for Guardian')).toBe(true);
    expect(model.sections.find((s) => s.id === 'part10').title).toBe('Part X — GUARDIAN ATTORNEY CERTIFICATE OF SERVICE');
  });

  test('co-guardians: the certificate prints the ticked guardian, not Guardian #1', async () => {
    const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
    const model = buildAnnualAccountingModel({ ...emptyDataAnnual(), inventoryType: 'annual', guardians: [g('Maria Lopez'), g('Ann Lopez', { certifiesService: true })] });
    const signer = model.sections.find((s) => s.id === 'part10').blocks.find((b) => b.type === 'signature-block');
    expect(signer.signerName).toBe('Ann Lopez');
  });

  test('Simplified and Inventory follow the same rule', async () => {
    const { buildSimplifiedAccountingModel } = await import('../../src/features/simplified-accounting/pdf-model.js');
    const s = buildSimplifiedAccountingModel({ ...emptyDataSimplified(), inventoryType: 'simplified', guardians: [{ ...emptyDataSimplified().guardians[0], name: 'Rosa Delgado' }] });
    expect(s.sections.find((x) => x.id === 'part5').blocks[0].text).toContain('§744.3679(3)');
    expect(s.sections.find((x) => x.id === 'part6').blocks.find((b) => b.type === 'signature-block').signerName).toBe('Rosa Delgado');

    const { buildVerifiedInventoryModel } = await import('../../src/features/guardian-inventory/pdf-model.js');
    const inv = buildVerifiedInventoryModel({ ...emptyDataGuardian(), inventoryType: 'guardian', attorneyWaiverBasis: 'court-order', attorneyWaiverOrderDate: '2025-03-04', guardians: [{ ...emptyDataGuardian().guardians[0], name: 'Harold Pemberton' }] });
    const d2 = inv.sections.find((x) => x.id === 'd2_attorney');
    expect(d2.blocks.some((b) => b.text === 'The guardian is not represented by counsel: representation waived by court order dated 03/04/2025.')).toBe(true);
    expect(d2.blocks.some((b) => b.type === 'signature-block' && b.role === 'Attorney for Guardian')).toBe(false);
    expect(inv.sections.find((x) => x.id === 'd5').blocks.find((b) => b.type === 'signature-block')).toMatchObject({ role: 'Guardian (Service)', signerName: 'Harold Pemberton' });
  });
});

// A guard for the shared field lists: every path they name must exist on the
// engine's blank filing (a typo would silently never "start" an attorney).
test('every attorney-entry path names a real field of its engine\'s blank filing', async () => {
  const { ATTORNEY_ENTRY } = await import('../../src/core/validation/attorney-block.js');
  const blanks = { guardian: emptyDataGuardian(), annual: emptyDataAnnual(), simplified: emptyDataSimplified() };
  // Fields a blank filing leaves undefined until typed (rendered by the page, absent from the factory).
  const typedOnly = new Set(['attorney.email', 'attorney.secondaryEmail', 'attorney_secondaryEmail']);
  for (const [engine, blank] of Object.entries(blanks)) {
    for (const path of [...ATTORNEY_ENTRY[engine].fields, ...ATTORNEY_ENTRY[engine].signature]) {
      if (typedOnly.has(path)) continue;
      const value = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), blank);
      expect(value, `${engine}: ${path}`).not.toBeUndefined();
    }
  }
  expect(getD()).toBeTruthy();
});
