// Milestone 73E part 1: an import is one transaction
// (src/core/excel/import-transaction.js), driven here by synthetic adapters --
// no importer uses it until 73T parts 2-4. Today the Inventory and the Annual
// replace every page without asking, the Simplified's Cancel leaves half an
// import in the filing, and imported people bypass the shared records:
// importing another ward's workbook and then correcting the ward's name
// renamed that ward on its other filings.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
const audit = vi.hoisted(() => ({ calls: [] }));
vi.mock('../../src/core/activity/audit-log.js', () => ({ auditLog: async (...args) => { audit.calls.push(args); } }));
globalThis.window = globalThis.window || globalThis;
const events = new EventTarget();
globalThis.addEventListener = events.addEventListener.bind(events);
globalThis.removeEventListener = events.removeEventListener.bind(events);
globalThis.dispatchEvent = events.dispatchEvent.bind(events);

const { runImportTransaction, planImport, sameName, namesNearMatch } = await import('../../src/core/excel/import-transaction.js');
const { blankCaseFile, getCaseFile, replaceCaseFile, replaceSaveHook } = await import('../../src/core/state.js');
const { onModelChange } = await import('../../src/core/model-change.js');
const { importConfirmContent } = await import('../../src/core/excel/import-confirm.js');
const { resolveParty } = await import('../../src/core/party-resolver.js');

const STAMP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
const json = (x) => JSON.parse(JSON.stringify(x));

// A Trust Accounting open beside a Simplified Accounting; both share the
// ward's record and Guardian #1's.
function setUpCase() {
  const cf = blankCaseFile();
  cf.parties = [
    { id: 'p-ward', role: 'ward', name: 'Ward One', phone: null, email: null, address: { street: '', cityStateZip: '' }, identifiers: {} },
    { id: 'p-ann', role: 'guardian', name: 'Ann Guardian', phone: '555-0001', email: 'ann@example.com', address: { street: '1 Main St', cityStateZip: 'Clearwater, FL 33755' }, identifiers: { taxId: '' } },
  ];
  const open = {
    wardId: 'w-trust', inventoryType: 'trustAccounting', signaturePolicy: 2, wardName: 'Ward One', wardPartyId: 'p-ward',
    guardians: [{ name: 'Ann Guardian', ssn: '', phone: '555-0001', email: 'ann@example.com', mailingStreet: '1 Main St', mailingCityStateZip: 'Clearwater, FL 33755', signatureState: 'stamp', signatureImage: STAMP }],
    guardianPartyIds: ['p-ann'],
    schA: [], scheduleNoItems: { scha: true },
  };
  const other = {
    wardId: 'w-simple', inventoryType: 'simplified', wardName: 'Ward One', wardPartyId: 'p-ward',
    guardians: [{ name: 'Ann Guardian', ssn: '', phone: '555-0001', email: 'ann@example.com', mailingStreet: '1 Main St', mailingCityStateZip: 'Clearwater, FL 33755' }],
    guardianPartyIds: ['p-ann'],
  };
  cf.wards = [open, other];
  cf.activeWardId = open.wardId;
  replaceCaseFile(cf);
  return { open, other };
}

// The workbook as an adapter hands it over: the fields it carries.
const workbook = (overrides = {}) => ({
  wardName: 'Ward One',
  guardians: [{ name: 'Ann Guardian', ssn: '', phone: '555-9999', email: 'ann@example.com', mailingStreet: '1 Main St', mailingCityStateZip: 'Clearwater, FL 33755' }],
  schA: [{ payer: 'Bank', description: 'Interest', amount: 12.5 }],
  ...overrides,
});

let saves = 0;
const changes = [];
onModelChange((c) => changes.push(c));
beforeEach(() => {
  audit.calls.length = 0;
  saves = 0;
  changes.length = 0;
  replaceSaveHook(() => { saves++; });
});

describe('who is the same person', () => {
  it('the same name ignoring case, spaces and punctuation (the requester, 2026-10-05)', () => {
    expect(sameName('Ann Guardian', ' ann  guardian. ')).toBe(true);
    expect(sameName('Mary J. Smith', 'Mary Smith')).toBe(false);
    expect(sameName('', '')).toBe(true);
  });

  it('a near match is for the filer to decide -- never settled by the name alone', () => {
    expect(namesNearMatch('Mary Smith', 'Mary J. Smith')).toBe(true);
    expect(namesNearMatch('Robert T. Nguyen', 'Robert T. Nguyen, Esq.')).toBe(true);
    expect(namesNearMatch('Ann Guardian', 'Bob Other')).toBe(false);
    expect(namesNearMatch('Ann Guardian', 'ann guardian')).toBe(false);
    expect(namesNearMatch('', 'Ann')).toBe(false);
  });
});

describe('the plan: what changes and what the filer decides', () => {
  it('names the fields replaced, a shared person whose details differ and every other filing sharing them, and a workbook marked as another type', () => {
    const { open } = setUpCase();
    const plan = planImport(open, workbook(), { workbookType: 'annual' });
    expect(plan.fieldChanges.map((c) => c.path).sort()).toEqual(['guardians', 'schA']);
    expect(plan.typeDiffers).toEqual({ filing: 'trustAccounting', source: 'annual' });
    expect(plan.workbookWardName).toBe(null);
    const shared = plan.conflicts.filter((c) => c.kind === 'shared-record');
    expect(shared.map((c) => c.id)).toEqual(['shared:guardian:0']);
    expect(shared[0].person.differences).toEqual([{ key: 'phone', shared: '555-0001', incoming: '555-9999' }]);
    expect(shared[0].person.otherFilings.map((f) => f.wardId)).toEqual(['w-simple']);
  });

  it('a near-name match is a conflict of its own', () => {
    const { open } = setUpCase();
    const plan = planImport(open, workbook({ guardians: [{ name: 'Ann B. Guardian', phone: '555-0001' }] }));
    expect(plan.conflicts.map((c) => c.id)).toContain('near:guardian:0');
  });
});

describe('Cancel', () => {
  it('leaves the filing and the shared records byte-for-byte unchanged, with no save queued, no log entry and no change event', async () => {
    setUpCase();
    const before = JSON.stringify({ wards: getCaseFile().wards, parties: getCaseFile().parties });
    const result = await runImportTransaction({ filing: getCaseFile().wards[0], adapter: async () => ({ draft: workbook({ wardName: 'Other Ward' }) }), confirmChoices: async () => null });
    expect(result.committed).toBe(false);
    expect(JSON.stringify({ wards: getCaseFile().wards, parties: getCaseFile().parties })).toBe(before);
    expect(saves).toBe(0);
    expect(audit.calls).toEqual([]);
    expect(changes).toEqual([]);
  });

  it('a confirmation that leaves a conflict unanswered changes nothing either', async () => {
    setUpCase();
    const before = JSON.stringify({ wards: getCaseFile().wards, parties: getCaseFile().parties });
    await expect(runImportTransaction({ filing: getCaseFile().wards[0], adapter: async () => ({ draft: workbook() }), confirmChoices: async () => ({}) })).rejects.toThrow(/no choice/);
    expect(JSON.stringify({ wards: getCaseFile().wards, parties: getCaseFile().parties })).toBe(before);
    expect(saves).toBe(0);
  });
});

describe('the commit', () => {
  it('"Update the shared record": the filing and the record change together, the other filing follows; one save, one log entry, one change event', async () => {
    const { open, other } = setUpCase();
    const seen = [];
    const result = await runImportTransaction({
      filing: open,
      adapter: async () => ({ draft: { ...workbook(), inventoryType: 'annual' }, sourceName: 'trust.xlsx', workbookType: 'annual', notCarried: ['Part XI'] }),
      confirmChoices: async (plan) => { seen.push(plan); return { 'shared:guardian:0': 'update' }; },
      redraw: async () => { seen.push('redraw'); },
      notify: async (notice) => { seen.push(notice); },
    });
    expect(result.committed).toBe(true);
    expect(open.guardians[0].phone).toBe('555-9999');
    expect(resolveParty('p-ann').phone).toBe('555-9999');
    expect(other.guardians[0].phone).toBe('555-9999');
    // What the workbook can't carry stays for the same person; the filing keeps its type and signature rule.
    expect(open.guardians[0].signatureImage).toBe(STAMP);
    expect(open.guardians[0].signatureState).toBe('stamp');
    expect(open.inventoryType).toBe('trustAccounting');
    expect(open.signaturePolicy).toBe(2);
    expect(open.guardianPartyIds).toEqual(['p-ann']);
    // The schedule it fills is no longer declared empty.
    expect(open.schA).toHaveLength(1);
    expect(open.scheduleNoItems.scha).toBe(false);
    expect(saves).toBe(1);
    expect(audit.calls).toHaveLength(1);
    expect(audit.calls[0][0]).toBe('DATA_IMPORT');
    expect(changes.map((c) => c.reason)).toEqual(['excel-import']);
    // The notice comes after the redraw, and says what was kept.
    expect(seen[1]).toBe('redraw');
    expect(seen[2]).toMatch(/Imported trust\.xlsx into Ward One/);
    expect(seen[2]).toMatch(/stays a Trust Accounting; the workbook is marked Annual Accounting/);
    expect(seen[2]).toMatch(/Part XI/);
  });

  it('"This filing only": the record and the other filing are untouched, and this filing stops sharing it', async () => {
    const { open, other } = setUpCase();
    await runImportTransaction({ filing: open, adapter: async () => ({ draft: workbook() }), confirmChoices: async () => ({ 'shared:guardian:0': 'unlink' }) });
    expect(open.guardians[0].phone).toBe('555-9999');
    expect(open.guardianPartyIds[0]).toBe(null);
    expect(resolveParty('p-ann').phone).toBe('555-0001');
    expect(other.guardians[0].phone).toBe('555-0001');
  });

  it("another ward's workbook: this filing stops sharing the ward's record, so correcting the name later can't rename the ward elsewhere", async () => {
    const { open, other } = setUpCase();
    const result = await runImportTransaction({ filing: open, adapter: async () => ({ draft: workbook({ wardName: 'Other Ward' }) }), confirmChoices: async () => ({ 'shared:guardian:0': 'update' }) });
    expect(result.plan.workbookWardName).toBe('Other Ward');
    expect(open.wardName).toBe('Other Ward');
    expect(open.wardPartyId).toBe(null);
    expect(resolveParty('p-ward').name).toBe('Ward One');
    expect(other.wardName).toBe('Ward One');
  });

  it('what the workbook does not carry is never written over the shared record as a blank', async () => {
    const { open, other } = setUpCase();
    // This workbook's guardian row has a name and a phone only -- no email, no address.
    const plan = planImport(open, workbook({ guardians: [{ name: 'Ann Guardian', phone: '555-9999' }] }));
    expect(plan.conflicts.find((c) => c.id === 'shared:guardian:0').person.differences).toEqual([{ key: 'phone', shared: '555-0001', incoming: '555-9999' }]);
    await runImportTransaction({ filing: open, adapter: async () => ({ draft: workbook({ guardians: [{ name: 'Ann Guardian', phone: '555-9999' }] }) }), confirmChoices: async () => ({ 'shared:guardian:0': 'update' }) });
    expect(resolveParty('p-ann').email).toBe('ann@example.com');
    expect(resolveParty('p-ann').address.street).toBe('1 Main St');
    expect(open.guardians[0].email).toBe('ann@example.com');
    expect(other.guardians[0]).toMatchObject({ phone: '555-9999', email: 'ann@example.com', mailingStreet: '1 Main St' });
  });

  it('a guardian the workbook no longer lists stops sharing their record here; a role it does not carry is left alone', async () => {
    const { open } = setUpCase();
    open.attorney = 'Sam Lawyer';
    open.attorneyPartyId = 'p-sam';
    getCaseFile().parties.push({ id: 'p-sam', role: 'attorney', name: 'Sam Lawyer', identifiers: {} });
    await runImportTransaction({ filing: open, adapter: async () => ({ draft: workbook({ guardians: [] }) }), confirmChoices: async () => ({}) });
    expect(open.guardians).toEqual([]);
    expect(open.guardianPartyIds).toEqual([null]);
    expect(open.attorneyPartyId).toBe('p-sam');
    expect(open.attorney).toBe('Sam Lawyer');
  });

  it('a near match the filer calls a different person starts afresh: no stamp, no shared record', async () => {
    const { open } = setUpCase();
    await runImportTransaction({ filing: open, adapter: async () => ({ draft: workbook({ guardians: [{ name: 'Ann B. Guardian', phone: '555-0001' }] }) }), confirmChoices: async () => ({ 'near:guardian:0': 'different' }) });
    expect(open.guardians[0]).toEqual({ name: 'Ann B. Guardian', phone: '555-0001' });
    expect(open.guardianPartyIds[0]).toBe(null);
    expect(resolveParty('p-ann').name).toBe('Ann Guardian');
  });

  it('a near match the filer calls the same person keeps the stamp, and the record follows their choice', async () => {
    const { open, other } = setUpCase();
    await runImportTransaction({
      filing: open,
      adapter: async () => ({ draft: workbook({ guardians: [{ name: 'Ann B. Guardian', phone: '555-0001' }] }) }),
      confirmChoices: async () => ({ 'near:guardian:0': 'same', 'shared:guardian:0': 'update' }),
    });
    expect(open.guardians[0].signatureImage).toBe(STAMP);
    expect(open.guardianPartyIds[0]).toBe('p-ann');
    expect(resolveParty('p-ann').name).toBe('Ann B. Guardian');
    expect(other.guardians[0].name).toBe('Ann B. Guardian');
  });
});

// Milestone 73T part 2: what the Inventory's workbook needs of the transaction.
describe('nested records and rows that move (73T part 2)', () => {
  // An Inventory: its attorney is a nested record, as are the preparer and the certificate's attorney.
  function setUpInventory() {
    const cf = blankCaseFile();
    cf.parties = [
      { id: 'p-a', role: 'guardian', name: 'Ann Guardian', identifiers: {} },
      { id: 'p-b', role: 'guardian', name: 'Bob Guardian', identifiers: {} },
      { id: 'p-c', role: 'guardian', name: 'Cy Guardian', identifiers: {} },
    ];
    const open = {
      wardId: 'w-inv', inventoryType: 'guardian', wardName: 'Ward One',
      attorney: { name: 'Sam Lawyer', email: 'sam@example.com', barNumber: '00012345', signatureState: 'stamp', signatureImage: STAMP },
      guardians: [{ name: 'Ann Guardian' }, { name: 'Bob Guardian' }, { name: 'Cy Guardian', signatureState: 'stamp', signatureImage: STAMP }],
      guardianPartyIds: ['p-a', 'p-b', 'p-c'],
    };
    cf.wards = [open];
    cf.activeWardId = open.wardId;
    replaceCaseFile(cf);
    return open;
  }

  it('a nested record takes only the fields the workbook carries; the rest stay as the filing has them', async () => {
    const open = setUpInventory();
    const plan = planImport(open, { attorney: { barNumber: '00099999' } });
    expect(plan.fieldChanges.map((c) => c.path)).toEqual(['attorney']);
    await runImportTransaction({ filing: open, adapter: async () => ({ draft: { attorney: { barNumber: '00099999' } } }), confirmChoices: async () => ({}) });
    expect(open.attorney).toEqual({ name: 'Sam Lawyer', email: 'sam@example.com', barNumber: '00099999', signatureState: 'stamp', signatureImage: STAMP });
  });

  it("a different person in a nested record doesn't inherit what the workbook can't carry", async () => {
    const open = setUpInventory();
    await runImportTransaction({
      filing: open,
      adapter: async () => ({ draft: { attorney: { name: 'Pat Other', barNumber: '00099999' } }, unboxed: { attorney: ['attorney.email', 'attorney.signatureState', 'attorney.signatureImage'] } }),
      confirmChoices: async () => ({}),
    });
    expect(open.attorney).toEqual({ name: 'Pat Other', email: '', barNumber: '00099999', signatureState: '', signatureImage: '' });
  });

  it("rows that move up past a skipped slot keep their person's link and what the workbook can't carry", async () => {
    const open = setUpInventory();
    // The workbook's Guardian #2 slot is blank: its Guardian #3 is the draft's second row.
    const draft = { guardians: [{ name: 'Ann Guardian', phone: '1' }, { name: 'Cy Guardian', phone: '3' }] };
    const plan = planImport(open, draft, { rowSources: { guardians: [0, 2] } });
    expect(plan.people.filter((p) => p.role === 'guardian').map((p) => [p.identity, p.partyId])).toEqual([['same', 'p-a'], ['same', 'p-c']]);
    // Their phones differ from the shared records: the filer is asked, about Cy as Guardian #2.
    expect(plan.conflicts.map((c) => c.id)).toEqual(['shared:guardian:0', 'shared:guardian:1']);
    await runImportTransaction({ filing: open, adapter: async () => ({ draft, rowSources: { guardians: [0, 2] } }), confirmChoices: async () => ({ 'shared:guardian:0': 'update', 'shared:guardian:1': 'update' }) });
    expect(open.guardians).toEqual([{ name: 'Ann Guardian', phone: '1' }, { name: 'Cy Guardian', phone: '3', signatureState: 'stamp', signatureImage: STAMP }]);
    expect(open.guardianPartyIds).toEqual(['p-a', 'p-c']);
  });
});

describe("the confirmation, in a filer's words", () => {
  it('says what is replaced, a different ward and type, and asks each question -- the record question only if a near match is the same person', () => {
    const { open } = setUpCase();
    const plan = planImport(open, workbook({ wardName: 'Other Ward', guardians: [{ name: 'Ann B. Guardian', phone: '555-0001' }] }), { workbookType: 'annual' });
    const content = importConfirmContent(plan, { sourceName: 'trust.xlsx' });
    expect(content.message).toMatch(/^Importing trust\.xlsx replaces what Ward One's Trust Accounting holds in 3 place\(s\)/);
    expect(content.message).toMatch(/The workbook is for Other Ward, not Ward One\. This filing will no longer share Ward One's record/);
    expect(content.message).toMatch(/The workbook is marked Annual Accounting; this filing stays a Trust Accounting\./);
    expect(content.message).toMatch(/Kept as they are: the signature rule/);
    expect(content.questions.map((q) => [q.id, q.onlyIf?.id || null])).toEqual([['near:guardian:0', null], ['shared:guardian:0', 'near:guardian:0']]);
    expect(content.questions[0].prompt).toBe('Guardian #1: the workbook says "Ann B. Guardian", this filing "Ann Guardian". Is this the same person?');
    expect(content.questions[1].prompt).toMatch(/It is also used by Ward One \(Simplified Annual Accounting\)\. The workbook changes: Name "Ann Guardian" to "Ann B\. Guardian"\./);
  });
});
