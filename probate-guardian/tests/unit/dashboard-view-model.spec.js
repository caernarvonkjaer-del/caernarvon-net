import { describe, expect, test } from 'vitest';
import {
  compareDashboardColumn,
  compareDashboardPriority,
  deriveFilingContacts,
  deriveWardDeadline,
  getDashboardMetrics,
  isWeekendOrLegalHoliday,
  normalizeDashboardWorkflow,
  projectDashboardWard,
} from '../../src/features/dashboard/view-model.js';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

const TODAY = new Date('2026-08-30T12:00:00');
// A local date as YYYY-MM-DD, whatever the machine's time zone.
const ymd = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

describe('dashboard view model', () => {
  // Milestone 73I: the due dates the statute sets (F.S. 744.362(1),
  // 744.367(1)-(2)). Each type's own date and basis; the Final has none.
  test.each([
    ['guardian', { gid: '2026-07-01' }, '2026-08-30', 'F.S. 744.362(1)'],
    ['simplified', { periodTo: '2026-06-01' }, '2026-10-01', 'fourth month after the accounting period ends'],
    ['annual', { periodTo: '2026-06-01' }, '2026-10-01', 'fourth month after the accounting period ends'],
    ['trustAccounting', { periodTo: '2026-06-01' }, '2026-10-01', 'fourth month after the accounting period ends'],
    ['planInitial', { lettersSignedDate: '2026-07-01' }, '2026-08-30', 'Letters of Guardianship'],
    ['planAnnual', { periodFrom: '2026-07-01' }, '2026-09-28', 'anniversary month'],
    ['planMinor', { periodFrom: '2026-07-01' }, '2026-09-28', 'anniversary month'],
    ['planSimplified', { periodTo: '2026-06-01' }, '2026-09-28', 'the month the reporting period ends'],
  ])('derives the %s statutory deadline', (inventoryType, fields, expectedDate, basis) => {
    const deadline = deriveWardDeadline({ inventoryType, ...fields });
    expect(ymd(deadline.deadlineDate)).toBe(expectedDate);
    expect(deadline.deadlineBasis).toContain(basis);
  });

  // §744.367(2): the first day of the fourth month after the period ends --
  // April 1 for a calendar year. 90 days marked it overdue 0-3 days early
  // after a month's last day, up to a month early after a mid-month one.
  test.each([
    ['2025-01-31', '2025-05-01'], ['2025-02-28', '2025-06-01'], ['2024-02-29', '2024-06-01'],
    ['2025-03-31', '2025-07-01'], ['2025-04-30', '2025-08-01'], ['2025-05-31', '2025-09-01'],
    ['2025-06-30', '2025-10-01'], ['2025-07-31', '2025-11-01'], ['2025-08-31', '2025-12-01'],
    ['2025-09-30', '2026-01-01'], ['2025-10-31', '2026-02-01'], ['2025-11-30', '2026-03-01'],
    ['2025-12-31', '2026-04-01'], ['2026-06-15', '2026-10-01'], ['2026-06-01', '2026-10-01'],
  ])('an accounting whose period ends %s is due %s', (periodTo, due) => {
    for (const inventoryType of ['annual', 'trustAccounting', 'simplified']) {
      expect(ymd(deriveWardDeadline({ inventoryType, periodTo }).deadlineDate), inventoryType).toBe(due);
    }
  });

  // §744.367(1): the Annual and Minors Plans cover the coming plan year, due 90
  // days after the last day of the anniversary month (the month before Period
  // From); April 1 for a calendar year. The Simplified Plan looks back: 90 days
  // after the last day of Period To's month, April 1 after December 31.
  test.each([
    ['planAnnual', { periodFrom: '2026-01-01' }, '2026-04-01'],
    ['planMinor', { periodFrom: '2028-01-01' }, '2028-04-01'],
    ['planAnnual', { periodFrom: '2026-04-01' }, '2026-06-29'],
    ['planMinor', { periodFrom: '2026-03-01' }, '2026-05-29'],
    ['planAnnual', { periodFrom: '2024-03-01' }, '2024-05-29'],
    ['planAnnual', { periodFrom: '2026-03-15' }, '2026-06-29'],
    ['planSimplified', { periodTo: '2025-12-31' }, '2026-04-01'],
    ['planSimplified', { periodTo: '2027-12-31' }, '2028-04-01'],
    ['planSimplified', { periodTo: '2026-03-31' }, '2026-06-29'],
    ['planSimplified', { periodTo: '2024-02-29' }, '2024-05-29'],
    ['planSimplified', { periodTo: '2026-03-10' }, '2026-06-29'],
  ])('%s %o is due %s', (inventoryType, fields, due) => {
    expect(ymd(deriveWardDeadline({ inventoryType, ...fields }).deadlineDate)).toBe(due);
  });

  test('a Final Accounting has no due date: it says when it is due, is never overdue, and sorts after dated filings', () => {
    const final = projectDashboardWard({ wardId: 'final', wardName: 'Final', inventoryType: 'finalAccounting', periodTo: '2025-01-01' }, { progress: { pct: 50 }, today: TODAY });
    expect(final.deadlineDate).toBe(null);
    expect(final.deadlineBucket).toBe('none');
    expect(final.deadlineBasis).toBe('Due promptly; within 45 days after being served with letters of administration or curatorship if the ward has died; within 20 days after removal (F.S. 744.527(1), 744.511)');
    const dated = projectDashboardWard({ wardId: 'annual', wardName: 'Annual', inventoryType: 'annual', periodTo: '2026-12-31' }, { progress: { pct: 50 }, today: TODAY });
    expect(compareDashboardPriority(dated, final)).toBeLessThan(0);
    expect(compareDashboardColumn(dated, final, 'deadline', 'asc')).toBeLessThan(0);
    // Any other filing without its date still reads "No deadline".
    expect(projectDashboardWard({ wardId: 'a', inventoryType: 'annual' }, { today: TODAY }).deadlineBasis).toBe('');
  });

  // Rule 2.514(a)(6)(A)'s legal holidays and weekends get a note; the date
  // itself never moves (decision 73I-N1).
  test.each([
    ['2028-04-01', true, 'a Saturday April 1'], ['2029-04-01', true, 'a Sunday April 1'],
    ['2026-04-01', false, 'a Wednesday'], ['2026-10-01', false, 'a Thursday'],
    ['2026-01-01', true, "New Year's Day"], ['2026-01-19', true, 'Martin Luther King, Jr. Day'],
    ['2026-05-25', true, 'Memorial Day'], ['2026-07-03', true, 'Independence Day on a Saturday, the Friday before'],
    ['2026-09-07', true, 'Labor Day'], ['2026-11-11', true, "Veterans' Day"],
    ['2026-11-26', true, 'Thanksgiving'], ['2026-11-27', true, 'the Friday after'],
    ['2026-12-25', true, 'Christmas'], ['2027-12-31', true, "New Year's Day 2028 on a Saturday, the Friday before"],
    ['2027-01-01', true, "New Year's Day"], ['2026-06-19', false, 'Juneteenth, a clerk-only closure if any'],
  ])('%s is a weekend or legal holiday: %s (%s)', (date, expected) => {
    expect(isWeekendOrLegalHoliday(new Date(`${date}T00:00:00`))).toBe(expected);
  });

  test('a due date on a weekend or legal holiday carries the note; one on a business day does not', () => {
    const saturday = projectDashboardWard({ wardId: 's', inventoryType: 'annual', periodTo: '2027-12-31' }, { today: TODAY });
    expect(ymd(saturday.deadlineDate)).toBe('2028-04-01');
    expect(saturday.deadlineNote).toBe('Falls on a weekend or legal holiday: check whether the next business day applies (Rule 2.514).');
    expect(projectDashboardWard({ wardId: 'w', inventoryType: 'annual', periodTo: '2025-12-31' }, { today: TODAY }).deadlineNote).toBe('');
  });

  test('projects without mutating a deeply frozen ward', () => {
    const ward = deepFreeze({
      wardId: 'ward-1',
      wardName: 'Projection Ward',
      inventoryType: 'guardian',
      caseNumber: '26-000001-GD',
      gid: '2026-07-01',
      preparer: { name: 'Pat Preparer' },
      attorney: { name: 'Alex Attorney' },
      dashboardWorkflow: { assigneeName: 'Case Manager' },
    });

    const projected = projectDashboardWard(ward, {
      displayType: 'Initial Inventory',
      total: 1250,
      progress: { complete: 2, total: 4, pct: 50 },
      today: TODAY,
    });

    expect(projected).toMatchObject({
      wardId: 'ward-1',
      displayType: 'Initial Inventory',
      total: 1250,
      progressPercent: 50,
      workflowStatus: 'draft',
      workflowSource: 'derived',
      deadlineBucket: 'today',
      assigneeKey: 'case manager',
    });
    expect(projected.sourceWard).toBe(ward);
  });

  test('normalizes and deduplicates filing contacts without assigning them', () => {
    const contacts = deriveFilingContacts({
      inventoryType: 'guardian',
      preparer: { name: 'Alex Smith' },
      attorney: { name: 'Jordan Jones' },
      attorneyForGuardian: '  Jordan   Jones  ',
    });

    expect(contacts).toEqual([
      { name: 'Alex Smith', role: 'preparer', filterKey: 'alex smith' },
      { name: 'Jordan Jones', role: 'attorney', filterKey: 'jordan jones' },
    ]);
  });

  // Milestone 73N part 3: every Simplified Annual Plan said "No filing contact",
  // and a filing whose guardian or attorney ticked "This person prepared this
  // filing" listed no preparer.
  test("reads the Simplified Annual Plan's contacts, and names the guardian or attorney ticked as the preparer", () => {
    expect(deriveFilingContacts({ inventoryType: 'planSimplified', preparer_name: 'Pat Preparer', attorney_name: 'Rob Attorney' })).toEqual([
      { name: 'Pat Preparer', role: 'preparer', filterKey: 'pat preparer' },
      { name: 'Rob Attorney', role: 'attorney', filterKey: 'rob attorney' },
    ]);
    const annual = { inventoryType: 'annual', preparer: { name: 'Outside Accountant' }, attorney: 'Rob Attorney', guardians: [{ name: 'Gail Guardian', isPreparer: true }] };
    expect(deriveFilingContacts(annual).filter((c) => c.role === 'preparer').map((c) => c.name), 'the ticked guardian, not the hidden block').toEqual(['Gail Guardian']);
    expect(deriveFilingContacts({ ...annual, guardians: [{ name: 'Gail Guardian' }], attorney_isPreparer: true }).filter((c) => c.role === 'preparer').map((c) => c.name)).toEqual(['Rob Attorney']);
    const inventory = { inventoryType: 'guardian', preparer: { name: 'Outside Accountant' }, attorney: { name: 'Ann Attorney', isPreparer: true }, guardians: [{ name: 'Gail Guardian' }] };
    expect(deriveFilingContacts(inventory).filter((c) => c.role === 'preparer').map((c) => c.name)).toEqual(['Ann Attorney']);
    expect(deriveFilingContacts({ ...annual, guardians: [{ name: 'Gail Guardian' }] }).filter((c) => c.role === 'preparer').map((c) => c.name), 'no one ticked: the outside preparer').toEqual(['Outside Accountant']);
  });

  test('uses only valid explicit workflow statuses', () => {
    const explicit = projectDashboardWard({
      wardId: 'explicit', inventoryType: 'guardian', dashboardWorkflow: { status: 'approved' },
    }, { progress: { pct: 25 }, today: TODAY });
    const invalid = projectDashboardWard({
      wardId: 'invalid', inventoryType: 'guardian', dashboardWorkflow: { status: 'auto' },
    }, { progress: { pct: 100 }, today: TODAY });

    expect(explicit).toMatchObject({ workflowStatus: 'approved', workflowSource: 'explicit', isDeadlineActionable: false });
    expect(invalid).toMatchObject({ workflowStatus: 'ready-to-file', workflowSource: 'derived' });
  });

  test('normalizes workflow metadata without mutating its input', () => {
    const input = deepFreeze({ status: 'auto', assigneeName: '  Alex   Attorney  ', ignored: true });

    expect(normalizeDashboardWorkflow(input)).toEqual({ assigneeName: 'Alex Attorney' });
    expect(normalizeDashboardWorkflow({ status: 'approved', assigneeName: '   ' })).toEqual({ status: 'approved' });
  });

  test('does not infer not-started from zero progress', () => {
    const projected = projectDashboardWard({ wardId: 'new', inventoryType: 'planSimplified' }, {
      progress: { complete: 0, total: 3, pct: 0 }, today: TODAY,
    });
    expect(projected.workflowStatus).toBe('draft');
  });

  test('prioritizes disapproved and actionable overdue work ahead of pending review', () => {
    const project = (wardId, status, periodTo) => projectDashboardWard({
      wardId, wardName: wardId, inventoryType: 'annual', periodTo,
      dashboardWorkflow: { status },
    }, { progress: { pct: 50 }, today: TODAY });
    const rows = [
      project('pending', 'pending-court-review', '2026-01-01'),
      project('overdue', 'draft', '2026-01-01'),
      project('disapproved', 'disapproved-needs-correction', '2026-12-01'),
    ].sort(compareDashboardPriority);

    expect(rows.map(row => row.wardId)).toEqual(['disapproved', 'overdue', 'pending']);
    expect(rows[2].isDeadlineActionable).toBe(false);
  });

  test('calculates non-overlapping triage metrics', () => {
    const project = (wardId, status, periodTo) => projectDashboardWard({
      wardId, inventoryType: 'annual', periodTo, dashboardWorkflow: { status },
    }, { progress: { pct: 50 }, today: TODAY });
    const metrics = getDashboardMetrics([
      project('disapproved-soon', 'disapproved-needs-correction', '2026-08-25'),
      project('overdue', 'draft', '2026-01-01'),
      // Milestone 73I: due 2026-09-01, two days after TODAY (a period ending in
      // June is now due October 1, no longer "approaching").
      project('approaching', 'draft', '2026-05-31'),
      project('pending-overdue', 'pending-court-review', '2026-01-01'),
      project('approved-overdue', 'approved', '2026-01-01'),
    ]);

    expect(metrics).toEqual({
      actionItems: 2, approachingDeadlines: 1, pendingCourtReview: 1,
      totalFilings: 5, totalOpenFilings: 5, totalClosedFilings: 0,
    });
  });

  // Milestone 62: the dashboard's three new "Total Filings"/"Total Open
  // Filings"/"Total Closed Filings" cards. isArchived === closed, matching
  // dashboardPriority()'s own 'archived' branch and the Mark Closed/Mark
  // Open toggle's label in dashboard/index.js.
  test('total/open/closed counts include archived wards without letting them affect the other three metrics', () => {
    const project = (wardId, status, periodTo, archived) => projectDashboardWard({
      wardId, inventoryType: 'annual', periodTo, archived, dashboardWorkflow: { status },
    }, { progress: { pct: 50 }, today: TODAY });
    const metrics = getDashboardMetrics([
      project('overdue-open', 'draft', '2026-01-01', false),
      project('overdue-but-closed', 'draft', '2026-01-01', true),
      project('pending-closed', 'pending-court-review', '2026-01-01', true),
    ]);

    expect(metrics.totalFilings).toBe(3);
    expect(metrics.totalOpenFilings).toBe(1);
    expect(metrics.totalClosedFilings).toBe(2);
    // The one OPEN overdue filing still counts; the closed one, otherwise
    // identical, must not -- proving the archived gate, not just a zero
    // count that would pass for the wrong reason.
    expect(metrics.actionItems).toBe(1);
    expect(metrics.pendingCourtReview).toBe(0);
  });

  test('sorts columns direction-aware and breaks ties with priority', () => {
    const rowA = {
      wardName: 'Alice',
      displayType: 'Annual Accounting',
      caseNumber: '26-000100-GD',
      workflowStatus: 'approved',
      deadlineDate: new Date('2026-09-01'),
      assigneeName: 'Judge Baker',
      lastModified: '2026-08-01T10:00:00Z',
      priorityRank: 2,
    };
    const rowB = {
      wardName: 'Bob',
      displayType: 'Initial Inventory',
      caseNumber: '26-000200-GD',
      workflowStatus: 'draft',
      deadlineDate: new Date('2026-09-15'),
      assigneeName: 'Judge Adams',
      lastModified: '2026-08-02T10:00:00Z',
      priorityRank: 1,
    };

    // Name: asc & desc
    expect(compareDashboardColumn(rowA, rowB, 'name', 'asc')).toBeLessThan(0);
    expect(compareDashboardColumn(rowA, rowB, 'name', 'desc')).toBeGreaterThan(0);

    // Form Type: asc & desc
    expect(compareDashboardColumn(rowA, rowB, 'type', 'asc')).toBeLessThan(0);
    expect(compareDashboardColumn(rowA, rowB, 'type', 'desc')).toBeGreaterThan(0);

    // Case Number: asc & desc
    expect(compareDashboardColumn(rowA, rowB, 'case', 'asc')).toBeLessThan(0);
    expect(compareDashboardColumn(rowA, rowB, 'case', 'desc')).toBeGreaterThan(0);

    // Status: asc & desc
    expect(compareDashboardColumn(rowA, rowB, 'status', 'asc')).toBeLessThan(0);
    expect(compareDashboardColumn(rowA, rowB, 'status', 'desc')).toBeGreaterThan(0);

    // Deadline: asc & desc
    expect(compareDashboardColumn(rowA, rowB, 'deadline', 'asc')).toBeLessThan(0);
    expect(compareDashboardColumn(rowA, rowB, 'deadline', 'desc')).toBeGreaterThan(0);

    // Judge: asc & desc
    expect(compareDashboardColumn(rowA, rowB, 'judge', 'asc')).toBeGreaterThan(0);
    expect(compareDashboardColumn(rowA, rowB, 'judge', 'desc')).toBeLessThan(0);

    // Last Modified: asc & desc
    expect(compareDashboardColumn(rowA, rowB, 'lastModified', 'asc')).toBeLessThan(0);
    expect(compareDashboardColumn(rowA, rowB, 'lastModified', 'desc')).toBeGreaterThan(0);

    // Tie-break: identical judge falls back to priority
    const rowC = { ...rowA, assigneeName: 'Judge Baker', priorityRank: 3 };
    const rowD = { ...rowB, assigneeName: 'Judge Baker', priorityRank: 1 };
    expect(compareDashboardColumn(rowC, rowD, 'judge', 'asc')).toBeGreaterThan(0);
    expect(compareDashboardColumn(rowD, rowC, 'judge', 'asc')).toBeLessThan(0);
  });
});