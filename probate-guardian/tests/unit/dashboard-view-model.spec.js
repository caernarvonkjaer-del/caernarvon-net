import { describe, expect, test } from 'vitest';
import {
  compareDashboardPriority,
  deriveFilingContacts,
  deriveWardDeadline,
  getDashboardMetrics,
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

describe('dashboard view model', () => {
  test.each([
    ['guardian', { gid: '2026-07-01' }, '2026-08-30', 'Guardianship Inception Date'],
    ['simplified', { periodTo: '2026-06-01' }, '2026-08-30', 'accounting period'],
    ['annual', { periodTo: '2026-06-01' }, '2026-08-30', 'accounting period'],
    ['finalAccounting', { periodTo: '2026-06-01' }, '2026-08-30', 'accounting period'],
    ['trustAccounting', { periodTo: '2026-06-01' }, '2026-08-30', 'accounting period'],
    ['planInitial', { lettersSignedDate: '2026-07-01' }, '2026-08-30', 'Letters of Guardianship'],
    ['planAnnual', { periodTo: '2026-06-01' }, '2026-08-30', 'reporting period'],
    ['planSimplified', { periodTo: '2026-06-01' }, '2026-08-30', 'reporting period'],
    ['planMinor', { periodTo: '2026-06-01' }, '2026-08-30', 'reporting period'],
  ])('derives the %s statutory deadline', (inventoryType, fields, expectedDate, basis) => {
    const deadline = deriveWardDeadline({ inventoryType, ...fields });
    expect(deadline.deadlineDate.toISOString().slice(0, 10)).toBe(expectedDate);
    expect(deadline.deadlineBasis).toContain(basis);
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
      project('approaching', 'draft', '2026-06-01'),
      project('pending-overdue', 'pending-court-review', '2026-01-01'),
      project('approved-overdue', 'approved', '2026-01-01'),
    ]);

    expect(metrics).toEqual({ actionItems: 2, approachingDeadlines: 1, pendingCourtReview: 1 });
  });
});