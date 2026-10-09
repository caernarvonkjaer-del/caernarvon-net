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

// Milestone 73I: the due dates the statute sets. An accounting is due on the
// first day of the fourth month after its period ends -- §744.367(2)'s
// fiscal-year date, April 1 for a calendar year (decision 73I-1, Pinellas Clerk
// practice confirmed). It counted 90 days, so a filing read overdue up to a
// month early.
function firstOfFourthMonthAfter(value) {
  const date = parseLocalDate(value);
  return date ? new Date(date.getFullYear(), date.getMonth() + 4, 1) : null;
}

function ninetyDaysAfterMonthEnd(date) {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setDate(end.getDate() + 90);
  return end;
}

// The Annual and Minors Plans cover the coming plan year (73I-N3): its
// anniversary month is the month before it begins -- the month of the day
// before Period From -- and the plan is due 90 days after that month's last
// day (73I-N2, §744.367(1)); a plan year beginning January 1 is calendar-year
// filing, due April 1.
function comingYearPlanDue(periodFrom) {
  const from = parseLocalDate(periodFrom);
  if (!from) return null;
  if (from.getMonth() === 0 && from.getDate() === 1) return new Date(from.getFullYear(), 3, 1);
  return ninetyDaysAfterMonthEnd(new Date(from.getFullYear(), from.getMonth(), from.getDate() - 1));
}

// The Simplified Plan looks back and has no plan year of its own: 90 days
// after the last day of Period To's month, and April 1 for a period ending
// December 31, as on the other Plans (the requester, 2026-10-06).
function lookBackPlanDue(periodTo) {
  const to = parseLocalDate(periodTo);
  if (!to) return null;
  if (to.getMonth() === 11 && to.getDate() === 31) return new Date(to.getFullYear() + 1, 3, 1);
  return ninetyDaysAfterMonthEnd(to);
}

// A Final Accounting has no date the app can count from (73I-2): it says when
// it is due instead (§744.527(1), §744.511).
const FINAL_DEADLINE_BASIS = 'Due promptly; within 45 days after being served with letters of administration or curatorship if the ward has died; within 20 days after removal (F.S. 744.527(1), 744.511)';

export function deriveWardDeadline(ward) {
  if (ward.inventoryType === 'guardian') {
    return {
      deadlineDate: addLocalDays(ward.gid, 60),
      deadlineBasis: '60 days after the Guardianship Inception Date (F.S. 744.362(1))',
    };
  }
  if (ward.inventoryType === 'finalAccounting') {
    return { deadlineDate: null, deadlineBasis: FINAL_DEADLINE_BASIS, basisWithoutDate: true };
  }
  if (ward.inventoryType === 'simplified' || ANNUAL_ACCOUNTING_TYPES.has(ward.inventoryType)) {
    return {
      deadlineDate: firstOfFourthMonthAfter(ward.periodTo),
      deadlineBasis: 'The first day of the fourth month after the accounting period ends; April 1 for a calendar year (F.S. 744.367(2))',
    };
  }
  if (ward.inventoryType === 'planInitial') {
    return {
      deadlineDate: addLocalDays(ward.lettersSignedDate, 60),
      deadlineBasis: '60 days after the Letters of Guardianship were signed (F.S. 744.362(1))',
    };
  }
  if (ward.inventoryType === 'planAnnual' || ward.inventoryType === 'planMinor') {
    return {
      deadlineDate: comingYearPlanDue(ward.periodFrom),
      deadlineBasis: '90 days after the last day of the anniversary month, the month before the plan year begins; April 1 for a plan year beginning January 1 (F.S. 744.367(1))',
    };
  }
  if (ward.inventoryType === 'planSimplified') {
    return {
      deadlineDate: lookBackPlanDue(ward.periodTo),
      deadlineBasis: '90 days after the last day of the month the reporting period ends; April 1 for a period ending December 31 (F.S. 744.367(1))',
    };
  }
  return { deadlineDate: null, deadlineBasis: '' };
}

// Milestone 73I (decision 73I-N1): a due date on a weekend or legal holiday
// keeps its date and gains a note -- whether the next business day applies is
// for the filer to check, not for the app to decide. Rule 2.514(a)(6)(A)'s
// legal holidays: the days §110.117 sets aside for New Year's Day, Martin
// Luther King, Jr.'s Birthday, Memorial Day, Independence Day, Labor Day,
// Veterans' Day, Thanksgiving Day, the Friday after it and Christmas Day. One
// on a Saturday is flagged on the Friday before as well, one on a Sunday on
// the Monday after (the days §110.117 observes them; that statute isn't in
// reference/, and the note only asks). Days only the clerk's office observes
// (Rule 2.514(a)(6)(B)) are not listed (the requester, 2026-10-06).
export const DEADLINE_WEEKEND_NOTE = 'Falls on a weekend or legal holiday: check whether the next business day applies (Rule 2.514).';

function nthWeekdayOfMonth(year, month, weekday, n) {
  const first = new Date(year, month, 1);
  return new Date(year, month, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7);
}

function lastWeekdayOfMonth(year, month, weekday) {
  const last = new Date(year, month + 1, 0);
  return new Date(year, month, last.getDate() - ((last.getDay() - weekday + 7) % 7));
}

function legalHolidays(year) {
  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4);
  const days = [
    new Date(year, 0, 1), nthWeekdayOfMonth(year, 0, 1, 3), lastWeekdayOfMonth(year, 4, 1),
    new Date(year, 6, 4), nthWeekdayOfMonth(year, 8, 1, 1), new Date(year, 10, 11),
    thanksgiving, new Date(year, 10, thanksgiving.getDate() + 1), new Date(year, 11, 25),
  ];
  return days.flatMap((day) => {
    const shift = day.getDay() === 6 ? -1 : day.getDay() === 0 ? 1 : 0;
    return shift ? [day, new Date(year, day.getMonth(), day.getDate() + shift)] : [day];
  });
}

export function isWeekendOrLegalHoliday(date) {
  if (!date) return false;
  if (date.getDay() === 0 || date.getDay() === 6) return true;
  const day = calendarDayNumber(date);
  // The next year's list too: a New Year's Day on a Saturday is observed on
  // December 31.
  return [date.getFullYear(), date.getFullYear() + 1]
    .some((year) => legalHolidays(year).some((holiday) => calendarDayNumber(holiday) === day));
}

function deadlineState(deadlineDate, today) {
  if (!deadlineDate) return { deadlineBucket: 'none', daysUntilDeadline: null };
  const daysUntilDeadline = calendarDayNumber(deadlineDate) - calendarDayNumber(today);
  if (daysUntilDeadline < 0) return { deadlineBucket: 'overdue', daysUntilDeadline };
  if (daysUntilDeadline === 0) return { deadlineBucket: 'today', daysUntilDeadline };
  if (daysUntilDeadline <= 14) return { deadlineBucket: 'due-soon', daysUntilDeadline };
  return { deadlineBucket: 'future', daysUntilDeadline };
}

// Milestone 73J part 2: what "Automatic" means for a filing -- shown in the
// status picker's Automatic option even while an override is chosen (it
// showed the override there, so the filer couldn't see what Automatic would
// give back).
function automaticWorkflowStatus(ward, progressPercent) {
  if (ward.archived) return 'closed';
  return progressPercent >= 100 ? 'ready-to-file' : 'draft';
}

function workflowState(ward, dashboardWorkflow, progressPercent) {
  if (ward.archived) return { workflowStatus: 'closed', workflowSource: 'presentation' };
  const explicitStatus = dashboardWorkflow.status;
  if (EXPLICIT_WORKFLOW_STATUSES.has(explicitStatus)) {
    return { workflowStatus: explicitStatus, workflowSource: 'explicit' };
  }
  return {
    workflowStatus: automaticWorkflowStatus(ward, progressPercent),
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
  const automaticStatus = automaticWorkflowStatus(ward, progressPercent);
  const { deadlineDate, deadlineBasis, basisWithoutDate } = deriveWardDeadline(ward);
  const { deadlineBucket, daysUntilDeadline } = deadlineState(deadlineDate, today);
  const isDeadlineActionable = !ward.archived && ACTIONABLE_DEADLINE_STATUSES.has(workflowStatus);
  const assigneeName = dashboardWorkflow.assigneeName || '';

  return {
    wardId: ward.wardId,
    wardName: ward.wardName || '',
    inventoryType: ward.inventoryType,
    displayType: displayType || ward.inventoryType || '',
    // Milestone 73S (73S-N2): the Plan for Minors by its Case # (`ref`) first,
    // as case-resolver.js's caseNumberOf() (this module imports nothing).
    caseNumber: (ward.inventoryType === 'planMinor' ? (ward.ref || ward.ucn) : (ward.caseNumber || ward.ucn || ward.ref)) || '',
    isArchived: !!ward.archived,
    automaticStatus,
    total,
    progress,
    progressPercent,
    deadlineDate,
    deadlineBasis: deadlineDate || basisWithoutDate ? deadlineBasis : '',
    deadlineNote: isWeekendOrLegalHoliday(deadlineDate) ? DEADLINE_WEEKEND_NOTE : '',
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

export function compareDashboardColumn(left, right, sortKey = 'priority', direction = 'asc') {
  const dir = direction === 'desc' ? -1 : 1;
  if (!sortKey || sortKey === 'priority') {
    return compareDashboardPriority(left, right) * dir;
  }
  let diff = 0;
  if (sortKey === 'name' || sortKey === 'ward') {
    diff = (left.wardName || '').localeCompare(right.wardName || '');
  } else if (sortKey === 'type') {
    diff = (left.displayType || '').localeCompare(right.displayType || '');
  } else if (sortKey === 'case') {
    diff = (left.caseNumber || '').localeCompare(right.caseNumber || '');
  } else if (sortKey === 'status') {
    diff = (left.workflowStatus || '').localeCompare(right.workflowStatus || '');
  } else if (sortKey === 'deadline') {
    const leftDue = left.deadlineDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const rightDue = right.deadlineDate?.getTime() ?? Number.POSITIVE_INFINITY;
    diff = leftDue - rightDue;
  } else if (sortKey === 'judge' || sortKey === 'assignee') {
    diff = (left.assigneeName || '').localeCompare(right.assigneeName || '');
  } else if (sortKey === 'lastModified') {
    diff = new Date(left.lastModified || 0).getTime() - new Date(right.lastModified || 0).getTime();
  }
  if (diff !== 0) return diff * dir;
  return compareDashboardPriority(left, right);
}

// Milestone 62: takes every projected ward now, not just the active ones --
// harmless for the pre-existing three fields (each already re-derives
// `active` by excluding isArchived internally, so an archived ward passed
// in was always going to be filtered right back out of them), and is what
// lets totalFilings/totalOpenFilings/totalClosedFilings below see the
// closed side at all.
export function getDashboardMetrics(projectedWards) {
  const active = projectedWards.filter(ward => !ward.isArchived);
  const closed = projectedWards.filter(ward => ward.isArchived);
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
    totalFilings: projectedWards.length,
    totalOpenFilings: active.length,
    totalClosedFilings: closed.length,
  };
}