// Milestone 77C: dates left for whoever serves and files. A guardian signs the
// report and sends it to her attorney for audit; it is served and filed days
// or weeks later. The Initial Inventory, the Annual, Final and Trust
// Accountings and the Simplified Accounting listed a blank Certificate of
// Service date as a required field, and the Inventory a blank attorney Filing
// Date -- dates she can't know when she drafts. (The four Plans already
// allowed a blank Date of Service, 68C.) The requester, 2026-10-20, reversing
// the 2026-09-13 "keep required" decision: a blank date is no longer flagged;
// one that is entered is still checked; a reminder says the date is open
// (decision 77C-1), never a block.
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
globalThis.window = globalThis.window || globalThis;

const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { engineChecks } = await import('../../src/core/validation/engines/index.js');
const { withFilingInView } = await import('../../src/core/state.js');
const { serviceDateAdvisories } = await import('../../src/core/filing/service-method.js');

const json = (x) => JSON.parse(JSON.stringify(x));
const filing = (type, patch = {}) => Object.assign({ ...json(initializeEmptyData(type)), inventoryType: type }, patch);
const issuesAt = (type, d, path) => withFilingInView(d, () => engineChecks(type)(d)).filter((e) => e.path === path);

describe('77C: a blank certificate date is not listed', () => {
  it('the Inventory: a blank Service Date', () => {
    expect(issuesAt('guardian', filing('guardian'), 'serviceDate')).toEqual([]);
  });

  it("the Inventory: a blank attorney Filing Date, with an attorney entered (the attorney's other fields still are)", () => {
    const d = filing('guardian');
    d.attorney = { ...d.attorney, name: 'Robin Cruz', filingDate: null };
    const run = (p) => issuesAt('guardian', d, p);
    expect(run('attorney.filingDate')).toEqual([]);
    expect(run('attorney.barNumber').length, 'the attorney block is still checked').toBe(1);
  });

  it('the Annual, Final and Trust Accountings: a blank Certificate of Service Date', () => {
    for (const type of ['annual', 'finalAccounting', 'trustAccounting']) {
      // One engine checks the three (formEngine()).
      expect(issuesAt('annual', filing(type), 'certDate'), type).toEqual([]);
    }
  });

  it('the Simplified Accounting: a blank Date of Service', () => {
    expect(issuesAt('simplified', filing('simplified'), 'certServiceDate')).toEqual([]);
  });
});

describe('77C: a date that is entered is still checked', () => {
  it('the Annual: a Certificate of Service Date before Period To', () => {
    const d = filing('annual', { periodFrom: '2026-01-01', periodTo: '2026-12-31', certDate: '2026-06-01' });
    expect(issuesAt('annual', d, 'certDate').map((e) => e.message).join(' ')).toMatch(/Certificate of Service Date/);
  });

  it('the Simplified: a Date of Service before Period To', () => {
    const d = filing('simplified', { periodFrom: '2026-01-01', periodTo: '2026-12-31', certServiceDate: '2026-06-01' });
    expect(issuesAt('simplified', d, 'certServiceDate').map((e) => e.message).join(' ')).toMatch(/Date of Service/);
  });
});

describe('77C-1: a reminder, never a block', () => {
  it('each of the three certificates reminds when its date is blank, and not when it is filled or no one needs serving', () => {
    const CASES = [['guardian', 'serviceDate', 'serviceNoRecipients', 'D-5'], ['annual', 'certDate', 'certNoRecipients', 'Part X'], ['simplified', 'certServiceDate', 'certNoRecipients', 'Part VI']];
    for (const [engine, field, noRecipients, section] of CASES) {
      const d = filing(engine);
      const said = serviceDateAdvisories(d, engine);
      expect(said, engine).toEqual([{
        code: 'certificate.date-blank', severity: 'advisory', field,
        message: `${section} — Date of Service is blank. The report can be filed without it; fill it in when it is served.`,
      }]);
      expect(serviceDateAdvisories({ ...d, [field]: '2027-01-05' }, engine), `${engine}: filled`).toEqual([]);
      expect(serviceDateAdvisories({ ...d, [noRecipients]: 'Yes' }, engine), `${engine}: no one to serve`).toEqual([]);
    }
    expect(serviceDateAdvisories(filing('planAnnual'), 'plan'), 'the Plans have their own').toEqual([]);
  });

  it('Preview & Export carries it, among the advisories, never the issues', async () => {
    const { prepareFilingOutput } = await import('../../src/core/filing/output-preflight.js');
    const d = filing('annual');
    const out = withFilingInView(d, () => prepareFilingOutput(d, () => []));
    expect(out.advisories.map((a) => a.code)).toContain('certificate.date-blank');
    expect(out.structuredIssues.map((i) => i.path)).not.toContain('certDate');
  });
});
