// Milestone 76F: years and links. A filing keeps its open year's data at its
// top level and the other years in `years[]`. The case link and the ward's
// shared-record link were kept per year, so opening an older year lost them
// (the filing left its case group; setting the county made a second ward
// record); a new year was built from whichever year was open; the Initial
// Inventory's first-year documents disappeared after its first New Year; two
// years with one period shared a documents folder, and deleting either
// deleted both; and an edit to an older year reached the shared records.
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
// Deleting a year saves and redraws; neither is what these cases are about.
vi.mock('../../src/core/persistence/case-file.js', async (importOriginal) => ({
  ...(await importOriginal()),
  saveWardToState: async () => {}, setDirtySinceExport: () => {}, updateLastSavedIndicator: () => {}, flushPendingSave: async () => {},
}));
vi.mock('../../src/core/navigation/tab-state.js', async (importOriginal) => ({ ...(await importOriginal()), notifyProbateGuardianTabStateChanged: () => {} }));
globalThis.window = globalThis.window || globalThis;

const links = await import('../../src/core/filing/year-links.js');
const years = await import('../../src/core/filing/filing-years.js');
const docs = await import('../../src/core/filing/doc-period.js');
const party = await import('../../src/core/party-resolver.js');
const { blankCaseFile, replaceCaseFile } = await import('../../src/core/state.js');

const filing = (over = {}) => ({ wardId: 'w1', inventoryType: 'annual', wardName: 'Ward One', ...over });

describe('the case and ward links belong to the filing (decision 76F-2)', () => {
  it('a filing saved per year takes the latest year\'s links; an older differing one stays on its year; archived years lose the keys', () => {
    const w = filing({
      activeYearKey: 'Year 2', yearCounter: 2, caseId: 'case-new', wardPartyId: 'p-ward',
      years: [{ key: 'Year 1', label: '2024', data: { periodFrom: '2024-01-01', caseId: 'case-old', wardPartyId: 'p-ward' } }],
    });
    expect(links.migrateFilingLinks(w)).toBe(true);
    expect(w.caseId).toBe('case-new');
    expect(w.wardPartyId).toBe('p-ward');
    expect(w.years[0].data).toEqual({ periodFrom: '2024-01-01', yearCaseId: 'case-old' });
    const again = JSON.stringify(w);
    expect(links.migrateFilingLinks(w)).toBe(false);
    expect(JSON.stringify(w)).toBe(again);
  });

  it('with an older year open that lost its links, the filing takes the latest year\'s', () => {
    const w = filing({
      activeYearKey: 'Year 1', yearCounter: 2, caseId: null, wardPartyId: null, periodFrom: '2024-01-01',
      years: [{ key: 'Year 2', label: '2025', data: { periodFrom: '2025-01-01', caseId: 'case-1', wardPartyId: 'p-ward' } }],
    });
    links.migrateFilingLinks(w);
    expect(w).toMatchObject({ caseId: 'case-1', wardPartyId: 'p-ward' });
    expect(w).not.toHaveProperty('yearCaseId');
    expect(w.years[0].data).toEqual({ periodFrom: '2025-01-01' });
  });

  it('switching years never changes them: a year\'s data no longer carries them, and an old snapshot\'s are ignored', () => {
    const w = filing({ activeYearKey: 'Year 2', yearCounter: 2, caseId: 'case-1', wardPartyId: 'p-ward', periodFrom: '2025-01-01' });
    const snap = years.snapshotCurrentYearData(w);
    expect(snap).not.toHaveProperty('caseId');
    expect(snap).not.toHaveProperty('wardPartyId');
    years.applyYearData(w, { periodFrom: '2024-01-01', caseId: 'stale', wardPartyId: 'stale' });
    expect(w).toMatchObject({ caseId: 'case-1', wardPartyId: 'p-ward', periodFrom: '2024-01-01' });
  });

  it('the latest year is the highest "Year N", open or archived', () => {
    const w = filing({ activeYearKey: 'Year 1', years: [{ key: 'Year 3', data: {} }, { key: 'Year 2', data: {} }] });
    expect(links.latestYearKey(w)).toBe('Year 3');
    expect(links.isOlderYearOpen(w)).toBe(true);
    expect(links.isOlderYearOpen(filing())).toBe(false);
    expect(links.isOlderYearOpen(filing({ activeYearKey: 'Year 3', years: [{ key: 'Year 1', data: {} }] }))).toBe(false);
  });
});

describe("the Initial Inventory's first year is one documents folder (item 3)", () => {
  it('"Year 1" is the \'initial\' folder, open or archived', () => {
    expect(docs.inventoryDocKey('Year 1')).toBe('initial');
    expect(docs.inventoryDocKey(undefined)).toBe('initial');
    expect(docs.inventoryDocKey('Year 2')).toBe('Year 2');
    expect(docs.resolveActiveDocPeriod({ inventoryType: 'guardian', activeYearKey: 'Year 1' })).toBe('initial');
    expect(years.periodKeyForYearData({ inventoryType: 'guardian' }, { key: 'Year 1', data: {} })).toBe('initial');
  });

  it('documents already filed under "Year 1" join the \'initial\' folder', () => {
    const w = { inventoryType: 'guardian', scheduleDocs: { a1: { initial: { comment: 'Deed', files: [{ name: 'deed.pdf' }] }, 'Year 1': { comment: 'Appraisal', files: [{ name: 'appraisal.pdf' }] } } } };
    expect(docs.mergeInventoryYearOneDocs(w)).toBe(true);
    expect(w.scheduleDocs.a1).toEqual({ initial: { comment: 'Deed\n\nAppraisal', files: [{ name: 'deed.pdf' }, { name: 'appraisal.pdf' }] } });
    expect(docs.mergeInventoryYearOneDocs(w)).toBe(false);
  });
});

describe('two years with one period share their documents; deleting one keeps them (decision 76F-3)', () => {
  it('a year sharing its folder with another is named, and its deletion leaves the folder', async () => {
    const cf = blankCaseFile();
    const w = filing({
      activeYearKey: 'Year 2', yearCounter: 2, periodFrom: '', periodTo: '',
      scheduleDocs: { scha: { __: { comment: 'Shared', files: [{ name: 'bank.pdf' }] } } },
      years: [{ key: 'Year 1', label: 'Year 1', data: { periodFrom: '', periodTo: '' } }],
    });
    cf.wards = [w];
    replaceCaseFile(cf);
    expect(years.yearSharingDocuments(w, 'Year 1')).toMatchObject({ key: 'Year 2' });
    await years.deleteWardYear('w1', 'Year 1');
    expect(w.years).toEqual([]);
    expect(w.scheduleDocs.scha.__.files).toHaveLength(1);
  });

  it('a year with its own period still takes its documents with it', async () => {
    const cf = blankCaseFile();
    const w = filing({
      activeYearKey: 'Year 2', yearCounter: 2, periodFrom: '2025-01-01', periodTo: '2025-12-31',
      scheduleDocs: { scha: { '2024-01-01__2024-12-31': { comment: '', files: [{ name: 'old.pdf' }] } } },
      years: [{ key: 'Year 1', label: '2024', data: { periodFrom: '2024-01-01', periodTo: '2024-12-31' } }],
    });
    cf.wards = [w];
    replaceCaseFile(cf);
    expect(years.yearSharingDocuments(w, 'Year 1')).toBe(null);
    await years.deleteWardYear('w1', 'Year 1');
    expect(w.scheduleDocs.scha).toEqual({});
  });
});

describe('the shared records and older years (decisions 76F-2, 76F-4)', () => {
  it('an earlier year open for correction is treated as closed', () => {
    expect(party.isFilingClosed(filing({ activeYearKey: 'Year 1', years: [{ key: 'Year 2', data: {} }] }))).toBe(true);
    expect(party.isFilingClosed(filing({ activeYearKey: 'Year 2', years: [{ key: 'Year 1', data: {} }] }))).toBe(false);
  });

  it('a merge reaches the archived years\' guardian links, and an unmerge puts them back', () => {
    const cf = blankCaseFile();
    cf.parties = [
      { id: 'p-keep', role: 'guardian', roles: ['guardian'], name: 'Ann Guardian', address: { street: '', cityStateZip: '' }, identifiers: {} },
      { id: 'p-dup', role: 'guardian', roles: ['guardian'], name: 'Ann Guardian', address: { street: '', cityStateZip: '' }, identifiers: {} },
    ];
    const w = filing({
      activeYearKey: 'Year 2', yearCounter: 2, guardians: [{ name: 'Ann Guardian' }], guardianPartyIds: ['p-dup'],
      years: [{ key: 'Year 1', label: '2024', data: { guardians: [{ name: 'Ann Guardian' }], guardianPartyIds: ['p-dup'] } }],
    });
    cf.wards = [w];
    replaceCaseFile(cf);
    expect(party.mergeParties('p-keep', 'p-dup')).toBe(true);
    expect(w.guardianPartyIds).toEqual(['p-keep']);
    expect(w.years[0].data.guardianPartyIds).toEqual(['p-keep']);
    expect(party.unmergeParty('p-dup')).toBe(true);
    expect(w.guardianPartyIds).toEqual(['p-dup']);
    expect(w.years[0].data.guardianPartyIds).toEqual(['p-dup']);
  });
});
