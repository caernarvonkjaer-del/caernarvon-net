// Milestone 74O (with 73O part 1): what the ward's other filings already
// record, shown beside the question it bears on -- never written into an
// answer. src/core/filing/carry-forward-hints.js.
import { describe, it, expect } from 'vitest';
import {
  accountingRemuneration,
  accountingRemunerationHTML,
  caseFilings,
  inventoryBenefitsNote,
  inventoryBenefitsNoteHTML,
  lastPlanRating,
  previousPlanRatings,
} from '../../src/core/filing/carry-forward-hints.js';
import { PLAN_ADLS } from '../../src/core/filing/models/plan-annual.js';
import { INITIAL_ADLS } from '../../src/core/filing/models/plan-initial.js';
import { blankCaseFile, replaceCaseFile } from '../../src/core/state.js';

const LISTS = { planAnnual: PLAN_ADLS, planInitial: INITIAL_ADLS };
const filing = (wardId, inventoryType, extra = {}) => ({ wardId, inventoryType, caseNumber: '26-0042-GD', ...extra });
const keyOf = (list, label) => list.find(([, l]) => l === label)[0];

describe('carry-forward hints: the case\'s other filings', () => {
  it('finds the same case\'s other filings, newest first, and none from another case', () => {
    const plan = filing('plan', 'planAnnual');
    const older = filing('old', 'guardian', { lastModified: '2026-01-01T00:00:00Z' });
    const newer = filing('new', 'annual', { lastModified: '2026-06-01T00:00:00Z' });
    const other = filing('else', 'guardian', { caseNumber: '26-9999-GD' });
    expect(caseFilings(plan, [plan, older, newer, other]).map((w) => w.wardId)).toEqual(['new', 'old']);
  });

  // Decision 74O-N1 (the requester, 2026-10-09): the same linked case, or the
  // same Case # when either filing isn't linked.
  it('finds a linked filing by its case\'s Case # from an unlinked one, and the other way round', () => {
    const cf = blankCaseFile();
    cf.cases = [{ id: 'case-1', caseNumber: '26-0042-GD' }, { id: 'case-2', caseNumber: '26-0042-GD' }];
    replaceCaseFile(cf);
    try {
      const inventory = filing('inv', 'guardian', { caseId: 'case-1', caseNumber: 'typed differently' });
      const plan = filing('plan', 'planAnnual', { caseId: null });
      expect(caseFilings(plan, [plan, inventory]).map((w) => w.wardId)).toEqual(['inv']);
      expect(caseFilings(inventory, [plan, inventory]).map((w) => w.wardId)).toEqual(['plan']);
      // Two filings linked to different cases stay apart, whatever their numbers.
      const elsewhere = filing('else', 'guardian', { caseId: 'case-2' });
      expect(caseFilings(inventory, [inventory, elsewhere])).toEqual([]);
    } finally {
      replaceCaseFile(blankCaseFile());
    }
  });

  it('never matches on a blank Case #', () => {
    const plan = filing('plan', 'planAnnual', { caseNumber: '' });
    expect(caseFilings(plan, [plan, filing('inv', 'guardian', { caseNumber: '' })])).toEqual([]);
  });
});

describe('carry-forward hints: the benefits note (74O-2)', () => {
  const inventory = filing('inv', 'guardian', {
    scheduleC1: [{ payerName: 'Social Security Administration' }, { payerName: '' }],
    scheduleC4: [{ trustName: 'Pemberton Family Revocable Trust' }],
  });

  it('lists the Inventory\'s income sources (C-1) and trusts (C-4)', () => {
    const plan = filing('plan', 'planInitial');
    expect(inventoryBenefitsNote(plan, [plan, inventory]))
      .toBe('The Initial Inventory lists: Social Security Administration (C-1); Pemberton Family Revocable Trust (C-4).');
  });

  it('says nothing when the case has no Inventory, or its C-1 and C-4 name nothing', () => {
    const plan = filing('plan', 'planAnnual');
    expect(inventoryBenefitsNote(plan, [plan])).toBeNull();
    expect(inventoryBenefitsNote(plan, [plan, filing('inv', 'guardian', { scheduleC1: [{ payerName: ' ' }] })])).toBeNull();
    expect(inventoryBenefitsNoteHTML(plan, [plan])).toBe('');
  });

  it('escapes what the filer typed', () => {
    const plan = filing('plan', 'planAnnual');
    const html = inventoryBenefitsNoteHTML(plan, [plan, filing('inv', 'guardian', { scheduleC1: [{ payerName: 'A & <B>' }] })]);
    expect(html).toContain('A &amp; &lt;B&gt; (C-1)');
    expect(html).toContain('data-carry-hint="benefits"');
  });
});

describe('carry-forward hints: "Last plan:" ratings (74O-4)', () => {
  it('reads the same filing\'s previous year first', () => {
    const k = keyOf(PLAN_ADLS, PLAN_ADLS[0][1]);
    const plan = filing('plan', 'planAnnual', {
      activeYearKey: 'Year 2',
      years: [{ key: 'Year 1', data: { adls: { [k]: 'Ward needs no help' } } }],
    });
    expect(lastPlanRating(previousPlanRatings(plan, [plan], LISTS), PLAN_ADLS[0][1])).toBe('Last plan: Ward needs no help');
  });

  it('takes the latest earlier year by number, never a later one, whatever order the years are stored in', () => {
    // Switching to Year 2 and back files Year 3 after Year 1 and Year 2.
    const k = PLAN_ADLS[0][0];
    const year = (n, rating) => ({ key: `Year ${n}`, data: { adls: { [k]: rating } } });
    const onYear3 = filing('plan', 'planAnnual', { activeYearKey: 'Year 3', years: [year(2, 'Ward needs assistance'), year(1, 'Ward needs no help')] });
    expect(lastPlanRating(previousPlanRatings(onYear3, [onYear3], LISTS), PLAN_ADLS[0][1])).toBe('Last plan: Ward needs assistance');
    const onYear2 = filing('plan', 'planAnnual', { activeYearKey: 'Year 2', years: [year(1, 'Ward needs no help'), year(3, 'Ward cannot do at all')] });
    expect(lastPlanRating(previousPlanRatings(onYear2, [onYear2], LISTS), PLAN_ADLS[0][1])).toBe('Last plan: Ward needs no help');
  });

  it('else matches an Initial Plan\'s activities by name across the two lists', () => {
    // "Administration of Medication" on the Initial Plan's list is
    // "Administration of medication" (or similar) on the Annual Plan's; the
    // match ignores case and punctuation.
    const shared = PLAN_ADLS.find(([, label]) => INITIAL_ADLS.some(([, l]) => l.toLowerCase().replace(/[^a-z]+/g, ' ').trim() === label.toLowerCase().replace(/[^a-z]+/g, ' ').trim()));
    expect(shared, 'the two lists share at least one activity by name').toBeTruthy();
    const initialLabel = INITIAL_ADLS.find(([, l]) => l.toLowerCase().replace(/[^a-z]+/g, ' ').trim() === shared[1].toLowerCase().replace(/[^a-z]+/g, ' ').trim());
    const plan = filing('plan', 'planAnnual');
    const initial = filing('init', 'planInitial', { adls: { [initialLabel[0]]: 'Ward needs some assistance' } });
    expect(lastPlanRating(previousPlanRatings(plan, [plan, initial], LISTS), shared[1])).toBe('Last plan: Ward needs some assistance');
  });

  it('shows nothing when no previous plan rated the activity', () => {
    const plan = filing('plan', 'planAnnual');
    expect(previousPlanRatings(plan, [plan], LISTS).size).toBe(0);
    expect(lastPlanRating(new Map(), PLAN_ADLS[0][1])).toBe('');
  });
});

describe('carry-forward hints: the accounting\'s Part XI beside Question 11 (74O-5)', () => {
  const plan = filing('plan', 'planAnnual');

  it('lists the newest accounting\'s Part XI entries with its period', () => {
    const accounting = filing('acct', 'annual', {
      periodFrom: '2025-01-01', periodTo: '2025-12-31',
      remuneration: [{ guardian: 'Pat Guardian', type: 'Fee', description: 'Court-approved', amount: 1200 }, { guardian: '', type: '', amount: '' }],
    });
    const found = accountingRemuneration(plan, [plan, accounting]);
    expect(found.entries).toEqual(['Pat Guardian — Fee — Court-approved — $1,200.00']);
    expect(found.none).toBe(false);
    expect(found.period).toMatch(/2025.*through.*2025/);
    expect(accountingRemunerationHTML(plan, [plan, accounting])).toContain('data-carry-hint="remuneration"');
  });

  it('reports a verified "none", and says nothing when Part XI is unanswered or there is no accounting', () => {
    const none = filing('acct', 'annual', { remuneration: [], scheduleNoItems: { remuneration: true } });
    expect(accountingRemuneration(plan, [plan, none])).toMatchObject({ entries: [], none: true });
    expect(accountingRemuneration(plan, [plan, filing('acct', 'annual', { remuneration: [] })])).toBeNull();
    expect(accountingRemuneration(plan, [plan])).toBeNull();
    expect(accountingRemunerationHTML(plan, [plan])).toBe('');
  });
});
