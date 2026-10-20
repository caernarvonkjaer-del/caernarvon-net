// Milestone 76E: a date still being typed (a "draft": text that isn't a date
// yet) blocks every output only while its box is in use -- shown by the page,
// or carried by the court output (design 1, the rule chosen for amounts on
// 2026-10-17) -- and is named in its page's words. A bad attorney-waiver
// order date, then an attorney entered, blocked every output with the box
// nowhere on the page; a trust date under No the same; an imported date that
// couldn't be read was named "Imported from Excel — Line 1".
//
// date-fields.js is the list; which boxes another answer hides was read from
// each page, its PDF and its workbook contract (2026-10-20). Its conditions
// are held to the pages by tests/e2e/hidden-date-drafts.spec.ts.
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
globalThis.window = globalThis.window || globalThis;

const { getFieldDraftIssues } = await import('../../src/core/form/commit-coordinator.js');
const { dateFieldsFor, dateUse } = await import('../../src/core/filing/date-fields.js');
const { ANNUAL_CONTRACT } = await import('../../src/core/excel/workbook-contract/annual.js');
const { GUARDIAN_CONTRACT } = await import('../../src/core/excel/workbook-contract/guardian.js');
const { SIMPLIFIED_CONTRACT } = await import('../../src/core/excel/workbook-contract/simplified.js');

const BAD = '02/30/2026';
const typed = (section, label, route) => ({ kind: 'date', rawValue: BAD, label, section, route });
const imported = (text = BAD) => ({ kind: 'date', rawValue: text, label: '', section: '', route: '', imported: true });
const messages = (d) => getFieldDraftIssues(d).map((i) => i.message);
const ATTORNEY = { attorney: 'Ann Lawyer', attorney_bar: '123456' };

describe('a draft blocks only while its box is in use', () => {
  it('the attorney-waiver order date: blocks while its box shows, not once an attorney is entered -- and again when the attorney is removed', () => {
    const d = { inventoryType: 'annual', attorneyWaiverBasis: 'court-order', __fieldDrafts: { attorneyWaiverOrderDate: typed('Part I', 'Date of the order', '/') } };
    expect(messages(d)).toEqual(['Part I — Date of the order must be a valid date using a four-digit year.']);
    Object.assign(d, ATTORNEY);
    expect(messages(d)).toEqual([]);
    expect(d.__fieldDrafts.attorneyWaiverOrderDate.rawValue).toBe(BAD); // kept, for the box when it shows again
    d.attorney = ''; d.attorney_bar = '';
    expect(messages(d)).toHaveLength(1);
  });

  it('a Part VIII trust date under No blocks nothing; under Yes it is "Trust 2" (it said "Line 2")', () => {
    const d = { inventoryType: 'trustAccounting', trusts: [{ hasTrust: 'No' }, {}], __fieldDrafts: { 'trusts.1.dateCreated': typed('Part VIII', 'Date Trust Created', '/p8') } };
    expect(messages(d)).toEqual([]);
    d.trusts[0].hasTrust = 'Yes';
    expect(messages(d)).toEqual(['Part VIII — Trust 2 — Date Trust Created must be a valid date using a four-digit year.']);
  });

  it("the bond period, hidden yet printed while the bond question is unanswered, still blocks and says which answer shows its box; it doesn't once the answer has no bond", () => {
    for (const [type, section] of [['guardian', 'D-4'], ['annual', 'Part IX']]) {
      const d = { inventoryType: type, bondDepositoryState: '', __fieldDrafts: { bondPeriodFrom: imported('Jan 2025') } };
      const [issue] = getFieldDraftIssues(d);
      expect(issue.route).toBe(type === 'guardian' ? '/d4' : '/p9');
      expect(issue.message.startsWith(`${section} — Bond Period`)).toBe(true);
      expect(issue.message).toContain('The imported workbook has "Jan 2025" here.');
      expect(issue.message).toContain('Its box shows once the bond question is answered with a bond; until then the date is still printed on the filing.');
      d.bondDepositoryState = 'bond-only';
      expect(messages(d)[0]).not.toContain('Its box shows once');
      d.bondDepositoryState = 'bond-waived';
      expect(messages(d)).toEqual([]);
    }
  });

  it("the certificate's signer: the attorney's date while an attorney is entered, the guardian's otherwise", () => {
    for (const type of ['annual', 'simplified']) {
      const d = { inventoryType: type, __fieldDrafts: { certAttySignDate: imported(), certGuardianSignDate: imported() } };
      expect(getFieldDraftIssues(d).map((i) => i.path)).toEqual(['certGuardianSignDate']);
      Object.assign(d, ATTORNEY);
      expect(getFieldDraftIssues(d).map((i) => i.path)).toEqual(['certAttySignDate']);
    }
  });

  it("the Plans' advance directives: only while the directives are ticked; the order date only under a court's Yes", () => {
    const a = { inventoryType: 'planAnnual', q10Executed: false, q10Directives: [{ courtRevoked: 'No' }], __fieldDrafts: { 'q10Directives.0.dateSigned': typed('10. Advance Directives', 'Date executed / signed', '/p9'), 'q10Directives.0.orderDate': typed('10. Advance Directives', 'Date of order', '/p9') } };
    expect(messages(a)).toEqual([]);
    a.q10Executed = true;
    expect(getFieldDraftIssues(a).map((i) => i.path)).toEqual(['q10Directives.0.dateSigned']);
    a.q10Directives[0].courtRevoked = 'Yes';
    expect(messages(a)).toEqual([
      '10. Advance Directives — Directive 1 — Date executed / signed must be a valid date using a four-digit year.',
      '10. Advance Directives — Directive 1 — Date of order must be a valid date using a four-digit year.',
    ]);
    const i = { inventoryType: 'planInitial', q11Executed: false, q11Directives: [{}], __fieldDrafts: { 'q11Directives.0.orderDate': typed('11. Advance Directives', 'Date of Order', '/p8') } };
    expect(messages(i)).toEqual([]);
    i.q11Executed = true;
    // Milestone 76H item 14: the Initial Plan's order date too, as the Annual Plan's.
    expect(messages(i)).toEqual([]);
    i.q11Directives[0].courtRevoked = 'Yes';
    expect(messages(i)).toHaveLength(1);
  });

  it("a box another answer never hides is always in use; so is a path the list doesn't name", () => {
    expect(dateUse({ inventoryType: 'annual' }, 'certDate').inUse).toBe(true);
    expect(dateUse({ inventoryType: 'planMinor' }, 'planGuardians.0.signatureDate').inUse).toBe(true);
    expect(dateUse({}, 'periodFrom').inUse).toBe(true);
  });
});

describe("a draft is named in its page's words", () => {
  it("an imported one names its page, section, row and field, and quotes the workbook (it said \"Imported from Excel — Line 1\")", () => {
    const d = { inventoryType: 'annual', schB1: [{}, {}], __fieldDrafts: { 'schB1.1.courtOrderDate': imported('3rd of May') } };
    const [issue] = getFieldDraftIssues(d);
    expect(issue.route).toBe('/schb1');
    expect(issue.message).toBe('Schedule B-1 — Line 2 — Court Order Date must be a valid date using a four-digit year. The imported workbook has "3rd of May" here.');
  });

  it('the Inventory\'s rows read "C-2 row 2", as its checks do (they read "Line 2" under the page\'s heading)', () => {
    const d = { inventoryType: 'guardian', scheduleC2: [{}, {}], __fieldDrafts: { 'scheduleC2.1.dateFiled': typed('Schedule C-2 — Lawsuits Against Ward', 'Date Filed', '/c2') } };
    expect(messages(d)).toEqual(['C-2 row 2 — Date Filed must be a valid date using a four-digit year.']);
  });

  it("a draft typed on a page keeps its box's label, under the section words the form's checks use", () => {
    const d = { inventoryType: 'annual', __fieldDrafts: { periodFrom: typed('Part I', 'Accounting Period From', '/') } };
    expect(messages(d)).toEqual(['Part I — Accounting Period From must be a valid date using a four-digit year.']);
  });
});

describe('every date a workbook import can bring back has a place in the list', () => {
  // The contract's date fields, as the importer's dateDrafts name them.
  function contractDatePaths(contract) {
    const out = [];
    for (const e of contract.entries) {
      if (e.codec?.kind === 'date') out.push(e.path);
      for (const col of e.columns || []) if (col.codec?.kind === 'date') out.push(`${e.path}.0.${col.field || col.key}`);
      for (const [k, v] of Object.entries(e.fields || {})) if (v?.codec?.kind === 'date') out.push(`${e.path}.0.${k}`);
    }
    return out;
  }
  for (const [type, contract] of [['annual', ANNUAL_CONTRACT], ['guardian', GUARDIAN_CONTRACT], ['simplified', SIMPLIFIED_CONTRACT]]) {
    it(`${type}: each is named by its page`, () => {
      const paths = contractDatePaths(contract);
      expect(paths.length).toBeGreaterThan(5);
      const unnamed = paths.filter((p) => !dateUse({ inventoryType: type }, p).entry);
      expect(unnamed).toEqual([]);
      for (const entry of dateFieldsFor(type)) expect(entry.route).toMatch(/^\//);
    });
  }
});
