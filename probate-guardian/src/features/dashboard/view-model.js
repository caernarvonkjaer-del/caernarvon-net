export const EXPLICIT_WORKFLOW_STATUSES = new Set([
  'not-started',
  'draft',
  'ready-to-file',
  'pending-court-review',
  'disapproved-needs-correction',
  'approved',
]);

const ACTIONABLE_DEADLINE_STATUSES = new Set([
  'not-started',
  'draft',
  'ready-to-file',
  'disapproved-needs-correction',
]);

const ANNUAL_ACCOUNTING_TYPES = new Set(['annual', 'finalAccounting', 'trustAccounting']);

export function normalizeFilterKey(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

export function normalizeDashboardWorkflow(value) {
  const workflow = {};
  if (!value || typeof value !== 'object') return workflow;
  if (EXPLICIT_WORKFLOW_STATUSES.has(value.status)) workflow.status = value.status;
  if (typeof value.assigneeName === 'string') {
    const assigneeName = value.assigneeName.trim().replace(/\s+/g, ' ').slice(0, 120);
    if (assigneeName) workflow.assigneeName = assigneeName;
  }
  return workflow;
}

function contact(name, role) {
  const cleanName = String(name || '').trim();
  return cleanName ? { name: cleanName, role, filterKey: normalizeFilterKey(cleanName) } : null;
}

export function deriveFilingContacts(ward) {
  const contacts = [];
  const add = (name, role) => {
    const next = contact(name, role);
    if (!next) return;
    if (contacts.some(item => item.filterKey === next.filterKey && item.role === next.role)) return;
    contacts.push(next);
  };

  if (ward.inventoryType === 'guardian') {
    add(ward.preparer?.name, 'preparer');
    add(ward.attorney?.name, 'attorney');
    add(ward.attorneyForGuardian, 'attorney');
  } else if (ward.inventoryType === 'simplified') {
    add(ward.attorney, 'attorney');
  } else if (ANNUAL_ACCOUNTING_TYPES.has(ward.inventoryType)) {
    add(ward.preparer?.name, 'preparer');
    add(ward.attorney, 'attorney');
  } else if (ward.inventoryType === 'planInitial') {
    add(ward.attorneyName, 'attorney');
    add(ward.attorney_name, 'attorney');
  } else if (ward.inventoryType === 'planAnnual') {
    add(ward.attorney, 'attorney');
  } else if (ward.inventoryType === 'planMinor') {
    add(ward.preparer_name, 'preparer');
    add(ward.attorney_name, 'attorney');
  }

  return contacts;
}

function parseLocalDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addLocalDays(value, days) {
  const date = parseLocalDate(value);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return date;
}

function calendarDayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

export function deriveWardDeadline(ward) {
  if (ward.inventoryType === 'guardian') {
    return {
      deadlineDate: addLocalDays(ward.gid, 60),
      deadlineBasis: '60 days after the Guardianship Inception Date (F.S. 744.365)',
    };
  }
  if (ward.inventoryType === 'simplified' || ANNUAL_ACCOUNTING_TYPES.has(ward.inventoryType)) {
    return {
      deadlineDate: addLocalDays(ward.periodTo, 90),
      deadlineBasis: '90 days after the end of the accounting period (F.S. 744.367)',
    };
  }
  if (ward.inventoryType === 'planInitial') {
    return {
      deadlineDate: addLocalDays(ward.lettersSignedDate, 60),
      deadlineBasis: '60 days after the Letters of Guardianship were signed (F.S. 744.632)',
    };
  }
  if (['planAnnual', 'planSimplified', 'planMinor'].includes(ward.inventoryType)) {
    return {
      deadlineDate: addLocalDays(ward.periodTo, 90),
      deadlineBasis: '90 days after the end of the reporting period (F.S. 744.367)',
    };
  }
  return { deadlineDate: null, deadlineBasis: '' };
}

function deadlineState(deadlineDate, today) {
  if (!deadlineDate) return { deadlineBucket: 'none', daysUntilDeadline: null };
  const daysUntilDeadline = calendarDayNumber(deadlineDate) - calendarDayNumber(today);
  if (daysUntilDeadline < 0) return { deadlineBucket: 'overdue', daysUntilDeadline };
  if (daysUntilDeadline === 0) return { deadlineBucket: 'today', daysUntilDeadline };
  if (daysUntilDeadline <= 14) return { deadlineBucket: 'due-soon', daysUntilDeadline };
  return { deadlineBucket: 'future', daysUntilDeadline };
}

function workflowState(ward, dashboardWorkflow, progressPercent) {
  if (ward.archived) return { workflowStatus: 'closed', workflowSource: 'presentation' };
  const explicitStatus = dashboardWorkflow.status;
  if (EXPLICIT_WORKFLOW_STATUSES.has(explicitStatus)) {
    return { workflowStatus: explicitStatus, workflowSource: 'explicit' };
  }
  return {
    workflowStatus: progressPercent >= 100 ? 'ready-to-file' : 'draft',
    workflowSource: 'derived',
  };
}

function priorityRank(workflowStatus, deadlineBucket, isDeadlineActionable) {
  if (workflowStatus === 'disapproved-needs-correction') return 0;
  if (isDeadlineActionable && deadlineBucket === 'overdue') return 1;
  if (isDeadlineActionable && (deadlineBucket === 'today' || deadlineBucket === 'due-soon')) return 2;
  if (workflowStatus === 'pending-court-review') return 3;
  if (workflowStatus === 'ready-to-file') return 4;
  if (workflowStatus === 'draft') return 5;
  if (workflowStatus === 'not-started') return 6;
  if (workflowStatus === 'approved') return 7;
  return 8;
}

export function projectDashboardWard(ward, { displayType, total, progress, today = new Date() } = {}) {
  const progressPercent = Number.isFinite(progress?.pct) ? progress.pct : 0;
  const dashboardWorkflow = normalizeDashboardWorkflow(ward.dashboardWorkflow);
  const { workflowStatus, workflowSource } = workflowState(ward, dashboardWorkflow, progressPercent);
  const { deadlineDate, deadlineBasis } = deriveWardDeadline(ward);
  const { deadlineBucket, daysUntilDeadline } = deadlineState(deadlineDate, today);
  const isDeadlineActionable = !ward.archived && ACTIONABLE_DEADLINE_STATUSES.has(workflowStatus);
  const assigneeName = dashboardWorkflow.assigneeName || '';

  return {
    wardId: ward.wardId,
    wardName: ward.wardName || '',
    inventoryType: ward.inventoryType,
    displayType: displayType || ward.inventoryType || '',
    caseNumber: ward.caseNumber || ward.ucn || ward.ref || '',
    isArchived: !!ward.archived,
    total,
    progress,
    progressPercent,
    deadlineDate,
    deadlineBasis: deadlineDate ? deadlineBasis : '',
    deadlineBucket,
    daysUntilDeadline,
    isDeadlineActionable,
    workflowStatus,
    workflowSource,
    filingContacts: deriveFilingContacts(ward),
    assigneeName,
    assigneeKey: normalizeFilterKey(assigneeName),
    lastModified: ward.lastModified || null,
    priorityRank: priorityRank(workflowStatus, deadlineBucket, isDeadlineActionable),
    sourceWard: ward,
  };
}

export function compareDashboardPriority(left, right) {
  if (left.priorityRank !== right.priorityRank) return left.priorityRank - right.priorityRank;
  const leftDue = left.deadlineDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightDue = right.deadlineDate?.getTime() ?? Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) return leftDue - rightDue;
  const leftModified = new Date(left.lastModified || 0).getTime();
  const rightModified = new Date(right.lastModified || 0).getTime();
  if (leftModified !== rightModified) return leftModified - rightModified;
  return left.wardName.localeCompare(right.wardName);
}

export function getDashboardMetrics(projectedWards) {
  const active = projectedWards.filter(ward => !ward.isArchived);
  return {
    actionItems: active.filter(ward => (
      ward.workflowStatus === 'disapproved-needs-correction'
      || (ward.isDeadlineActionable && ward.deadlineBucket === 'overdue')
    )).length,
    approachingDeadlines: active.filter(ward => (
      ward.workflowStatus !== 'disapproved-needs-correction'
      && ward.isDeadlineActionable
      && (ward.deadlineBucket === 'today' || ward.deadlineBucket === 'due-soon')
    )).length,
    pendingCourtReview: active.filter(ward => ward.workflowStatus === 'pending-court-review').length,
  };
}