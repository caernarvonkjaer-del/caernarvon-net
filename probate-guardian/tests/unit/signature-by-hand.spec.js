// Milestone 73A: Unsigned prints a blank line; guardians sign by hand or by
// stamp. On all nine forms an Unsigned block printed "/s/ Name" above the Rule
// 2.515 electronic-signature caption, a stamp chosen but never applied and a
// block with no name printed "/s/" too, typing a guardian's date pre-selected
// "/s/", and New Year kept last year's stamp. The requester's decision
// (2026-10-04, Pinellas Clerk practice resting on the court workbook's "Only
// the guardian's signature must be original"; flagged for a qualified person):
// guardians no longer sign with "/s/" -- by hand (Unsigned) or with a stamp --
// while attorneys and outside preparers keep all three choices. Each year's
// data carries a signature policy: 2 for new filings, New Year and filings
// being prepared; a closed filing and an archived year keep what they were
// filed with (1, a guardian's "/s/" honoured).
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
globalThis.window = globalThis.window || globalThis;

const sig = await import('../../src/core/validation/signature-state.js');
const policy = await import('../../src/core/signature/signature-policy.js');
const { renderSignatureStateControl, signerRoleForPath } = await import('../../src/core/signature/signature-state-control.js');
const { resolveSignatureModes } = await import('../../src/core/pdf/signature-modes.js');
const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { sectionMarks } = await import('../../src/core/status/section-marks.js');
const { engineChecks } = await import('../../src/core/validation/engines/index.js');
const { resetYearlyFieldsForNewYear } = await import('../../src/core/filing/filing-years.js');
const { partySlotForSignaturePath, partyForSignaturePath } = await import('../../src/core/party-resolver.js');
const { withFilingInView } = await import('../../src/core/state.js');

const STAMP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
const json = (x) => JSON.parse(JSON.stringify(x));

describe('73A: how a block prints, and whether it is complete, by role, choice and policy', () => {
  // [choice, date, image] -> [guardian policy 1, guardian policy 2, attorney/preparer (either policy)]
  const CASES = [
    ['blank, no date', '', '', '', ['blank', 'blank', 'blank'], [true, true, true]],
    ['blank with a date', '', '2026-01-05', '', ['typed', 'blank', 'typed'], [true, true, true]],
    ['Unsigned', 'none', '2026-01-05', '', ['blank', 'blank', 'blank'], [true, true, true]],
    ['"/s/" with a date', 'typed', '2026-01-05', '', ['typed', 'blank', 'typed'], [true, false, true]],
    ['"/s/" without a date', 'typed', '', '', ['typed', 'blank', 'typed'], [false, false, false]],
    ['a stamp applied', 'stamp', '', STAMP, ['stamp', 'stamp', 'stamp'], [true, true, true]],
    ['a stamp never applied', 'stamp', '', '', ['blank', 'blank', 'blank'], [false, false, false]],
  ];
  for (const [label, state, date, image, modes, complete] of CASES) {
    it(label, () => {
      const at = (role, p) => ({ state, date, image, name: 'Ann Guardian', role, policy: p });
      expect([sig.signaturePrintMode(at('guardian', 1)), sig.signaturePrintMode(at('guardian', 2)), sig.signaturePrintMode(at('attorney', 2))]).toEqual(modes);
      expect(sig.signaturePrintMode(at('preparer', 1))).toBe(modes[2]);
      expect([sig.isSignatureComplete(at('guardian', 1)), sig.isSignatureComplete(at('guardian', 2)), sig.isSignatureComplete(at('attorney', 2))]).toEqual(complete);
    });
  }

  it('any block with no name prints the blank line', () => {
    expect(sig.signaturePrintMode({ state: 'typed', date: '2026-01-05', name: '', role: 'attorney', policy: 2 })).toBe('blank');
    expect(sig.signaturePrintMode({ state: 'stamp', image: STAMP, name: '  ', role: 'guardian', policy: 2 })).toBe('blank');
  });

  it("a guardian's \"/s/\" under policy 2 is listed as missing, naming the two choices", () => {
    const errs = sig.checkSignatureState({ state: 'typed', date: '2026-01-05', sectionLabel: 'Part III', roleLabel: 'Guardian #1', filingType: 'annual', statePath: 'guardians.0.signatureState', role: 'guardian', policy: 2 });
    expect(errs.map((e) => e.message)).toEqual(['Part III — Guardian #1 signature: choose Unsigned (to sign by hand) or Signature Stamp; a guardian no longer signs with "/s/"']);
    expect(errs[0].path).toBe('guardians.0.signatureState');
  });
});

describe('73A: the signature policy', () => {
  const legacyAnnual = () => ({
    ...json(initializeEmptyData('annual')), inventoryType: 'annual', signaturePolicy: undefined,
    guardians: [{ name: 'Ann', signatureState: '', signatureDate: '2026-01-05' }, { name: 'Bo', signatureState: 'none', signatureDate: '2026-01-05' }],
    attorney_signatureState: '', attorney_signatureDate: '2026-01-06',
    certGuardianSignatureState: '', certGuardianSignDate: '2026-01-07',
  });

  it('new filings start on policy 2', () => {
    for (const type of ['guardian', 'annual', 'finalAccounting', 'trustAccounting', 'simplified', 'planInitial', 'planAnnual', 'planMinor', 'planSimplified']) {
      expect(initializeEmptyData(type).signaturePolicy, type).toBe(2);
    }
  });

  it('upgrading makes a legacy guardian\'s implied "/s/" explicit (asked again), and leaves other signers alone', () => {
    const d = legacyAnnual();
    delete d.signaturePolicy;
    expect(policy.upgradeSignaturePolicy(d)).toBe(true);
    expect(d.signaturePolicy).toBe(2);
    expect(d.guardians.map((g) => g.signatureState)).toEqual(['typed', 'none']);
    expect(d.certGuardianSignatureState).toBe('typed');
    expect(d.attorney_signatureState).toBe('');
    expect(d.guardians[0].signatureDate).toBe('2026-01-05');
  });

  it('on open: a filing being prepared is upgraded; a closed one, or a year marked 1, is not -- unless Mark Open forces it', () => {
    const open = legacyAnnual(); delete open.signaturePolicy;
    expect(policy.applySignaturePolicyOnOpen(open)).toBe(true);
    const closed = { ...legacyAnnual(), archived: true }; delete closed.signaturePolicy;
    expect(policy.applySignaturePolicyOnOpen(closed)).toBe(false);
    expect(closed.signaturePolicy).toBeUndefined();
    const filedYear = legacyAnnual(); delete filedYear.signaturePolicy;
    policy.keepYearSignaturePolicy(filedYear);
    expect(filedYear.signaturePolicy).toBe(1);
    expect(policy.applySignaturePolicyOnOpen(filedYear)).toBe(false);
    expect(policy.upgradeSignaturePolicy(filedYear)).toBe(false);
    expect(policy.upgradeSignaturePolicy(filedYear, { force: true })).toBe(true);
    expect(filedYear.guardians[0].signatureState).toBe('typed');
  });

  it('a Plan\'s certificate is upgraded only while a guardian certifies it', () => {
    const plan = { ...json(initializeEmptyData('planAnnual')), inventoryType: 'planAnnual', planGuardians: [{ name: 'Ann' }], certSignatureState: '', certSignatureDate: '2026-02-01' };
    delete plan.signaturePolicy;
    policy.upgradeSignaturePolicy(plan);
    expect(plan.certSignatureState).toBe('typed');
    const byAttorney = { ...plan, signaturePolicy: undefined, attorney: 'Robin Cruz', certSignatureState: '' };
    policy.upgradeSignaturePolicy(byAttorney);
    expect(byAttorney.certSignatureState).toBe('');
  });

  it('New Year clears every signer\'s choice and stamp, on every form, and starts the year on policy 2', () => {
    for (const type of ['guardian', 'annual', 'simplified', 'planInitial', 'planAnnual', 'planMinor', 'planSimplified']) {
      const d = json(initializeEmptyData(type));
      d.signaturePolicy = 1;
      const fill = (o) => { if (o && typeof o === 'object' && 'signatureState' in o) { o.signatureState = 'stamp'; o.signatureImage = STAMP; } };
      (d.guardians || []).forEach(fill); (d.planGuardians || []).forEach(fill);
      ['preparer', 'attorney', 'serviceAttorney', 'serviceGuardian'].forEach((k) => fill(d[k]));
      for (const k of Object.keys(d)) if (/SignatureState$|_signatureState$/.test(k)) { d[k] = 'stamp'; d[k.replace(/State$/, 'Image')] = STAMP; }
      resetYearlyFieldsForNewYear(d, type);
      expect(d.signaturePolicy, type).toBe(2);
      const left = JSON.stringify(d).match(/"[A-Za-z_]*[sS]ignature(State|Image)":"[^"]+"/g);
      expect(left, `${type}: a choice or stamp survived`).toBeNull();
    }
  });
});

describe('73A: the signature control', () => {
  const radios = (html) => [...html.matchAll(/value="(\w+)"( checked)?/g)].map((m) => `${m[1]}${m[2] ? '*' : ''}`);

  it('a guardian under policy 2 chooses Unsigned or Signature Stamp; a blank choice with a date is Unsigned', () => {
    const html = renderSignatureStateControl({ path: 'guardians.0', state: '', date: '2026-01-05', route: '/p3', policy: 2 });
    expect(radios(html)).toEqual(['none*', 'stamp']);
  });

  it('a saved guardian "/s/" under policy 2 is asked again: nothing chosen, and why', () => {
    const html = renderSignatureStateControl({ path: 'planGuardians.1', state: 'typed', date: '2026-01-05', route: '/p11', policy: 2 });
    expect(radios(html)).toEqual(['none', 'stamp']);
    expect(html).toContain('A guardian no longer signs with "/s/"');
  });

  it('under policy 1 a guardian\'s saved "/s/" shows as chosen but is never offered anew; attorneys and preparers keep all three', () => {
    expect(radios(renderSignatureStateControl({ path: 'certGuardian', state: 'typed', date: '2026-01-05', route: '/p10', policy: 1 }))).toEqual(['none', 'typed*', 'stamp']);
    expect(radios(renderSignatureStateControl({ path: 'serviceGuardian', state: 'none', route: '/d5', policy: 1 }))).toEqual(['none*', 'stamp']);
    expect(radios(renderSignatureStateControl({ path: 'attorney', state: '', date: '2026-01-05', route: '/p5', policy: 2 }))).toEqual(['none', 'typed*', 'stamp']);
    expect(radios(renderSignatureStateControl({ path: 'preparer', state: '', route: '/p4', policy: 2 }))).toEqual(['none*', 'typed', 'stamp']);
    expect(radios(renderSignatureStateControl({ path: 'cert', role: 'guardian', state: '', route: '/p12', policy: 2 }))).toEqual(['none*', 'stamp']);
  });

  it('every card path in use names its signer; an unknown one fails loudly', () => {
    expect(['guardians.2', 'planGuardians.0', 'certGuardian', 'serviceGuardian'].map(signerRoleForPath)).toEqual(['guardian', 'guardian', 'guardian', 'guardian']);
    expect(['attorney', 'certAttorney', 'serviceAttorney', 'preparer'].map(signerRoleForPath)).toEqual(['attorney', 'attorney', 'attorney', 'preparer']);
    expect(() => renderSignatureStateControl({ path: 'cert', state: '', route: '/p12' })).toThrow('No signer role for the signature control "cert"');
  });
});

describe('73A: every form\'s PDF prints each signer by the rule', () => {
  let build;
  beforeAll(async () => {
    build = {
      guardian: (await import('../../src/features/guardian-inventory/pdf-model.js')).buildVerifiedInventoryModel,
      annual: (await import('../../src/features/annual-accounting/pdf-model.js')).buildAnnualAccountingModel,
      simplified: (await import('../../src/features/simplified-accounting/pdf-model.js')).buildSimplifiedAccountingModel,
      planInitial: (await import('../../src/features/plan-initial/pdf-model.js')).buildPlanInitialModel,
      planAnnual: (await import('../../src/features/plan-annual/pdf-model.js')).buildPlanAnnualModel,
      planMinor: (await import('../../src/features/plan-minor/pdf-model.js')).buildPlanMinorModel,
      planSimplified: (await import('../../src/features/plan-simplified/pdf-model.js')).buildPlanSimplifiedModel,
    };
  });
  const blocks = (model) => model.sections.flatMap((s) => s.blocks || []).filter((b) => b?.type === 'signature-block');
  const GUARDIAN_LIST = { guardian: 'guardians', annual: 'guardians', simplified: 'guardians', planInitial: 'planGuardians', planAnnual: 'planGuardians', planMinor: 'planGuardians', planSimplified: 'planGuardians' };

  for (const type of ['guardian', 'annual', 'simplified', 'planInitial', 'planAnnual', 'planMinor', 'planSimplified']) {
    it(`${type}: a guardian's "/s/" prints "/s/" only under policy 1; an Unsigned guardian prints the blank line`, () => {
      const make = (p, state) => {
        const d = { ...json(initializeEmptyData(type)), inventoryType: type, wardName: 'Ward', signaturePolicy: p };
        const list = GUARDIAN_LIST[type];
        d[list] = [{ ...(d[list]?.[0] || {}), name: 'Ann Guardian', signatureState: state, signatureDate: '2026-01-05', ssn: '1', ssnEin: '1', tin: '1', phone: '1', email: 'a@b.c' }];
        const all = blocks(build[type](d));
        expect(all.length, `${type}: has signature blocks`).toBeGreaterThan(0);
        for (const b of all) expect(['guardian', 'attorney', 'preparer'], `${type}: ${b.role}`).toContain(b.signerRole);
        return all.find((b) => b.signerRole === 'guardian' && b.signerName === 'Ann Guardian');
      };
      expect(make(1, 'typed').signatureMode).toBe('typed');
      expect(make(2, 'typed').signatureMode).toBe('blank');
      expect(make(2, 'none').signatureMode).toBe('blank');
      expect(make(1, 'none').signatureMode).toBe('blank');
    });
  }

  it('a block that names no signer role fails loudly', () => {
    expect(() => resolveSignatureModes({ sections: [{ blocks: [{ type: 'signature-block', role: 'Someone' }] }] }, {})).toThrow('names no signer role');
  });
});

describe('73A: every form\'s checks list a guardian\'s "/s/" under policy 2, and only then', () => {
  const MESSAGE = /signature: choose Unsigned \(to sign by hand\) or Signature Stamp/;
  const SETUPS = {
    // The certificate a guardian signs, too, where the form has one.
    guardian: (d) => { d.guardians[0] = { ...d.guardians[0], name: 'Ann', signatureState: 'typed', signatureDate: '2026-01-05' }; d.serviceGuardian = { ...d.serviceGuardian, signatureState: 'typed', signatureDate: '2026-01-05' }; },
    annual: (d) => { d.guardians[0] = { ...d.guardians[0], name: 'Ann', signatureState: 'typed', signatureDate: '2026-01-05' }; d.certGuardianSignatureState = 'typed'; d.certGuardianSignDate = '2026-01-05'; },
    simplified: (d) => { d.guardians[0] = { ...d.guardians[0], name: 'Ann', signatureState: 'typed', signatureDate: '2026-01-05' }; d.certGuardianSignatureState = 'typed'; d.certGuardianSignDate = '2026-01-05'; },
    planInitial: (d) => { d.planGuardians[0] = { ...d.planGuardians[0], name: 'Ann', signatureState: 'typed', signatureDate: '2026-01-05' }; },
    planAnnual: (d) => { d.planGuardians[0] = { ...d.planGuardians[0], name: 'Ann', signatureState: 'typed', signatureDate: '2026-01-05' }; },
    planMinor: (d) => { d.planGuardians[0] = { ...d.planGuardians[0], name: 'Ann', signatureState: 'typed', signatureDate: '2026-01-05' }; },
    planSimplified: (d) => { d.planGuardians[0] = { ...d.planGuardians[0], name: 'Ann', signatureState: 'typed', signatureDate: '2026-01-05' }; },
  };
  const ENGINE = { guardian: 'guardian', annual: 'annual', simplified: 'simplified', planInitial: 'planInitial', planAnnual: 'planAnnual', planMinor: 'planMinor', planSimplified: 'planSimplified' };
  for (const [type, setup] of Object.entries(SETUPS)) {
    it(type, () => {
      const run = (p) => {
        const d = { ...json(initializeEmptyData(type)), inventoryType: type, signaturePolicy: p };
        setup(d);
        return withFilingInView(d, () => engineChecks(ENGINE[type])(d)).filter((e) => MESSAGE.test(e.message));
      };
      const asked = run(2);
      expect(asked.length, `${type}: policy 2`).toBeGreaterThan(0);
      // Its jump link lands on the guardian's signature choice, not the date.
      expect(asked.map((e) => e.path), `${type}: each asked block names its choice`).toContain(type.startsWith('plan') ? 'planGuardians.0.signatureState' : 'guardians.0.signatureState');
      for (const e of asked) expect(e.path, e.message).toMatch(/[sS]ignatureState$/);
      expect(run(1), `${type}: policy 1`).toEqual([]);
    });
  }

  it("a Plan's started co-guardian is checked too (no Plan checked a co-guardian before)", () => {
    const d = { ...json(initializeEmptyData('planAnnual')), inventoryType: 'planAnnual', signaturePolicy: 2 };
    d.planGuardians = [{ ...d.planGuardians[0], name: 'Ann', signatureState: 'none' }, { name: 'Bo', signatureState: 'typed', signatureDate: '2026-01-05' }];
    const messages = engineChecks('planAnnual')(d).map((e) => e.message);
    expect(messages).toContain('Signatures — Co-Guardian 2 signature: choose Unsigned (to sign by hand) or Signature Stamp; a guardian no longer signs with "/s/"');
  });

  it('the sidebar: a guardian who signs by hand, undated, reaches the mark (it needed a date)', () => {
    const d = { ...json(initializeEmptyData('planSimplified')), inventoryType: 'planSimplified', signaturePolicy: 2 };
    // Contact details as export asks (73F part 2: the mark is the export checks').
    d.planGuardians[0] = { ...d.planGuardians[0], name: 'Ann', signatureState: 'none', signatureDate: '', phone: '(727) 555-0100', mailingAddress: '1 Main St' };
    expect(sectionMarks(d, 'planSimplified').checks['ps-p3']).toBe(true);
    d.planGuardians[0].signatureState = 'typed';
    expect(sectionMarks(d, 'planSimplified').checks['ps-p3']).toBe(false);
  });
});

describe('73A: "Use my saved signature" on the certificate blocks a guardian signs', () => {
  it('certGuardian and serviceGuardian find the certifying guardian; a Plan\'s cert its signer', async () => {
    const { getCaseFile } = await import('../../src/core/state.js');
    getCaseFile().parties = [{ id: 'p-ann', name: 'Ann' }, { id: 'p-bo', name: 'Bo' }, { id: 'p-atty', name: 'Robin Cruz' }];
    // Only the card paths that map straight to a slot resolve without the filing.
    expect(partySlotForSignaturePath('certGuardian')).toBeNull();
    const accounting = { inventoryType: 'annual', guardians: [{ name: 'Ann' }, { name: 'Bo', certifiesService: true }], guardianPartyIds: ['p-ann', 'p-bo'] };
    expect(partyForSignaturePath(accounting, 'certGuardian')?.id).toBe('p-bo');
    const inventory = { ...accounting, inventoryType: 'guardian' };
    expect(partyForSignaturePath(inventory, 'serviceGuardian')?.id).toBe('p-bo');
    const plan = { inventoryType: 'planMinor', planGuardians: [{ name: 'Ann' }], guardianPartyIds: ['p-ann'], attorneyPartyId: 'p-atty' };
    expect(partyForSignaturePath(plan, 'cert')?.id).toBe('p-ann');
    expect(partyForSignaturePath({ ...plan, attorney_name: 'Robin Cruz' }, 'cert')?.id).toBe('p-atty');
    getCaseFile().parties = [];
  });
});
