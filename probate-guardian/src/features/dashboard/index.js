// Dashboard -- Milestone 9 dashboard rendering extraction (ward card grid,
// summary strip, deadline/recent worklist, grouping by type/case/flat,
// search/sort/archive toggles). Dynamically imported by legacy-app.js's
// mountDashboardFeature() bridge, using the same window.createFeatureBridge()
// pattern as Guardian, Simplified, Plan, and Annual features.
import { compareDashboardColumn, compareDashboardPriority, getDashboardMetrics, normalizeDashboardWorkflow, projectDashboardWard } from './view-model.js';
import { loadDashboardPreferences, saveDashboardPreferences } from './preferences.js';
import { caseNumberOf } from '../../core/case-resolver.js';

const {
  esc, ic, navigate, getCaseFile, isContinuePromptShown, markContinuePromptShown,
  getRecentlyOpenedWards, saveWardToState, flushPendingSave, markDirtySinceExport, updateLastSavedIndicator,
  saveBlobAs, auditLog, saveAppState,
  getWardHeadlineTotal, getWardProgress, typeIcon, INVENTORY_TYPE_META, formatDashboardCurrency,
  switchWard, showStartNewYearModal, confirmDeleteWard, showRenameWardModal,
  showConvertWardModal, showAddWardModal, showPriorYearsModal, fmtDateCard, formatRelativeTime,
  INVENTORY_TYPES, formEngine,
} = window;

// Dashboard's own module state -- all session-only, not persisted, reset on reload.
// These would be window properties if the dashboard stayed monolithic, but now that
// they're module-private via closure, they live entirely here.
let _dashboardSearch = '';
let _archivedSectionOpen = false;
let _dashboardContainer = null;
let _dashboardHost = null;
let _dashboardPreferences = loadDashboardPreferences();
let _dashboardStatusFilter = 'all';
let _dashboardDeadlineFilter = 'all';
let _dashboardContactFilter = 'all';
let _dashboardAssignmentFilter = 'all';
// Milestone 36-2: the sort carries a direction so a header click can flip it.
let _dashboardTriageSort = { key: 'priority', direction: 'asc' };

const WORKFLOW_LABELS = {
  'not-started': 'Not started',
  draft: 'Draft',
  'ready-to-file': 'Ready to file',
  'pending-court-review': 'Pending court review',
  'disapproved-needs-correction': 'Needs correction',
  approved: 'Approved',
  closed: 'Closed',
};

function projectWard(ward, today = new Date()) {
  return projectDashboardWard(ward, {
    displayType: INVENTORY_TYPES[ward.inventoryType]?.label || ward.inventoryType,
    total: getWardHeadlineTotal(ward),
    progress: getWardProgress(ward),
    today,
  });
}

function projectWards(wards) {
  const today = new Date();
  return wards.map(ward => projectWard(ward, today));
}

function option(value, label, selectedValue) {
  return `<option value="${esc(value)}"${value === selectedValue ? ' selected' : ''}>${esc(label)}</option>`;
}

function uniqueFilterOptions(rows, values) {
  const options = new Map();
  rows.forEach(row => values(row).forEach(item => {
    if (item?.key && !options.has(item.key)) options.set(item.key, item.label);
  }));
  return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

function assignmentFilterHTML(rows, label = 'Assignment', extraClass = '') {
  const assignees = uniqueFilterOptions(rows, row => row.assigneeKey ? [{ key: row.assigneeKey, label: row.assigneeName }] : []);
  if (!['all', 'unassigned'].includes(_dashboardAssignmentFilter) && !assignees.some(([key]) => key === _dashboardAssignmentFilter)) {
    _dashboardAssignmentFilter = 'all';
  }
  return `<label class="dashboard-control${extraClass ? ` ${extraClass}` : ''}"><span>${esc(label)}</span><select id="dashboard-assignment-filter" class="form-select form-select-sm">
    ${option('all', 'All assignments', _dashboardAssignmentFilter)}
    ${option('unassigned', 'Unassigned', _dashboardAssignmentFilter)}
    ${assignees.map(([key, name]) => option(key, name, _dashboardAssignmentFilter)).join('')}
  </select></label>`;
}

function triageControlsHTML() {
  const rows = projectWards(getCaseFile().wards).filter(row => !row.isArchived);
  const contacts = uniqueFilterOptions(rows, row => row.filingContacts.map(item => ({ key: item.filterKey, label: item.name })));
  if (_dashboardContactFilter !== 'all' && !contacts.some(([key]) => key === _dashboardContactFilter)) _dashboardContactFilter = 'all';
  return `
    <label class="dashboard-control"><span>Status</span><select id="dashboard-status-filter" class="form-select form-select-sm">
      ${option('all', 'All statuses', _dashboardStatusFilter)}
      ${Object.entries(WORKFLOW_LABELS).filter(([key]) => key !== 'closed').map(([key, label]) => option(key, label, _dashboardStatusFilter)).join('')}
    </select></label>
    <label class="dashboard-control"><span>Deadline</span><select id="dashboard-deadline-filter" class="form-select form-select-sm">
      ${option('all', 'All deadlines', _dashboardDeadlineFilter)}
      ${option('overdue', 'Overdue', _dashboardDeadlineFilter)}
      ${option('due-soon', 'Due within 14 days', _dashboardDeadlineFilter)}
      ${option('future', 'Later', _dashboardDeadlineFilter)}
      ${option('none', 'No deadline', _dashboardDeadlineFilter)}
    </select></label>
    <label class="dashboard-control"><span>Contact</span><select id="dashboard-contact-filter" class="form-select form-select-sm">
      ${option('all', 'All contacts', _dashboardContactFilter)}
      ${contacts.map(([key, label]) => option(key, label, _dashboardContactFilter)).join('')}
    </select></label>
    ${assignmentFilterHTML(rows, 'Assignment')}`;
}

function dashboardToolbarActionsHTML() {
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const helpOpen = typeof document !== 'undefined' && document.getElementById('help-panel')?.style.display === 'flex';
  return `<div class="dashboard-toolbar-actions">
    <button type="button" class="topnav-btn topnav-theme" id="theme-toggle-btn" data-shell-action="toggle-theme" title="Switch theme" aria-label="Switch to ${isDark ? 'light' : 'dark'} theme" aria-pressed="${isDark}">${ic(isDark ? 'sun' : 'moon', 16)}</button>
    <button type="button" class="topnav-btn topnav-help" id="help-toggle-btn" data-shell-action="toggle-help" title="Help" aria-label="Help" aria-haspopup="true" aria-expanded="${helpOpen}" aria-controls="help-panel">?</button>
  </div>`;
}

function dashboardToolbarHTML() {
  const searchHint = 'Search by ward, case #, or contact…';
  const search = `<label class="dashboard-control dashboard-search-control"><span>Search</span><span class="dashboard-search-wrap">${ic('search', 15)}<input type="text" id="dashboard-search" class="form-control form-control-sm dashboard-search-input" placeholder="${esc(searchHint)}" aria-label="${esc(searchHint)}" value="${esc(_dashboardSearch)}"></span></label>`;
  const actions = dashboardToolbarActionsHTML();
  return `${search}${triageControlsHTML()}${actions}`;
}

function dashboardHeaderHTML() {
  const wards = getCaseFile().wards;
  const activeWardId = getCaseFile().activeWardId;
  const activeWard = wards.find(w => w.wardId === activeWardId);
  // Milestone 36-1: Close, Rename and Delete acted on a filing but lived in the
  // sidebar, invisible from the dashboard where filings are chosen. They join
  // the header's filing-controls cluster, alongside Close Active Filing.
  const activeWardControls = activeWard ? `
    <button type="button" class="btn btn-sm btn-outline-secondary dashboard-close-ward" id="close-ward-btn" data-dashboard-action="close-ward" title="Close active filing and release lock">${ic('close', 14)} Close Active Filing</button>
    <button type="button" class="btn btn-sm btn-outline-secondary dashboard-rename-ward" id="rename-ward-btn" data-dashboard-action="rename-ward" title="Rename active filing">${ic('pencil', 14)} Rename</button>
    <button type="button" class="btn btn-sm btn-outline-danger dashboard-delete-ward" id="delete-ward-btn" data-dashboard-action="delete-ward" data-ward-id="${esc(activeWard.wardId)}" title="Delete active filing">${ic('trash', 14)} Delete</button>
  ` : '';
  const newFormBtn = `<button type="button" class="btn btn-sm btn-outline-primary dashboard-new-form" id="new-ward-btn" data-dashboard-action="add-ward">${ic('plus', 14)} + New Form</button>`;
  const exportAllBtn = wards.length > 0 ? `<button type="button" class="btn btn-sm btn-outline-secondary dashboard-export-all" data-dashboard-action="export-all" title="Export all filings into a single combined .sav archive">${ic('archive', 14)} Export All Filings</button>` : '';
  const newExistingBtn = `<button type="button" class="btn btn-sm btn-primary dashboard-new-existing" data-dashboard-action="select-existing">${ic('copy', 14)} New Filing from Existing</button>`;

  return `<header class="dashboard-page-header">
    <div class="dashboard-page-title">
      <div class="dashboard-page-kicker">Compliance overview</div>
      <h1>All Filings — Dashboard</h1>
      <p>Review exceptions, deadlines, and court status across active filings.</p>
    </div>
    <div class="dashboard-header-actions">
      <div class="dashboard-filing-controls">
        ${activeWardControls}
        ${newFormBtn}
      </div>
      ${exportAllBtn}
      ${newExistingBtn}
    </div>
  </header>`;
}

function setDashboardSearch(value) {
  _dashboardSearch = value;
  renderDashboardGrid();
}

function toggleArchivedSection() {
  _archivedSectionOpen = !_archivedSectionOpen;
  renderDashboardGrid();
}

function dashboardPriority(row) {
  if (row.isArchived) return 'archived';
  if (row.workflowStatus === 'disapproved-needs-correction') return 'urgent';
  if (row.isDeadlineActionable && row.deadlineBucket === 'overdue') return 'urgent';
  if (row.isDeadlineActionable && (row.deadlineBucket === 'today' || row.deadlineBucket === 'due-soon')) return 'warning';
  if (row.workflowStatus === 'pending-court-review') return 'pending';
  if (row.workflowStatus === 'approved') return 'approved';
  return 'standard';
}

function priorityBadgeHTML(row, includeWorkflowStates = false) {
  if (row.workflowStatus === 'disapproved-needs-correction') {
    return '<span class="dashboard-priority-badge dashboard-priority-badge-urgent">Needs correction</span>';
  }
  if (row.isDeadlineActionable && row.deadlineBucket === 'overdue') {
    return '<span class="dashboard-priority-badge dashboard-priority-badge-urgent">Overdue</span>';
  }
  if (row.isDeadlineActionable && row.deadlineBucket === 'today') {
    return '<span class="dashboard-priority-badge dashboard-priority-badge-warning">Due today</span>';
  }
  if (row.isDeadlineActionable && row.deadlineBucket === 'due-soon') {
    return '<span class="dashboard-priority-badge dashboard-priority-badge-warning">Due soon</span>';
  }
  if (includeWorkflowStates && row.workflowStatus === 'pending-court-review') {
    return '<span class="dashboard-priority-badge dashboard-priority-badge-pending">Pending review</span>';
  }
  if (includeWorkflowStates && row.workflowStatus === 'approved') {
    return '<span class="dashboard-priority-badge dashboard-priority-badge-approved">Approved</span>';
  }
  return '';
}

// Small badge shown on a ward card: overdue (red), due within two weeks
// (amber), or a plain future date (muted) — closed/archived cases never show
// one, since a deadline on a case that's already done is just noise.
function formatDeadlineBadge(projectedWard) {
  if (projectedWard.isArchived) return '';
  const { deadlineDate: dueDate, deadlineBasis: basis, daysUntilDeadline: diffDays } = projectedWard;
  if (!dueDate) return '';
  if (!projectedWard.isDeadlineActionable) {
    const text = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return `<div class="ward-card-deadline deadline-ok" title="${esc(basis)}">${text}</div>`;
  }
  let cls, text;
  if (diffDays < 0) { cls = 'deadline-overdue'; text = `${ic('alert', 12)} ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`; }
  else if (diffDays === 0) { cls = 'deadline-soon'; text = `${ic('alert', 12)} Due today`; }
  else if (diffDays <= 14) { cls = 'deadline-soon'; text = `${ic('alert', 12)} Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`; }
  else { cls = 'deadline-ok'; text = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; }
  return `<div class="ward-card-deadline ${cls}" title="${esc(basis)}">${text}</div>`;
}

function wardCardHTML(projectedWard) {
  const ward = projectedWard.sourceWard;
  const headline = projectedWard.total;
  const meta = INVENTORY_TYPE_META[projectedWard.inventoryType] || { iconName: 'folder', accent: '#525d6e', accentText: 'var(--ink-3)', totalLabel: 'Total' };
  const typeLabel = projectedWard.displayType;
  const lastMod = projectedWard.lastModified ? formatRelativeTime(new Date(projectedWard.lastModified).getTime()) : 'never saved';
  const caseFile = getCaseFile();
  const isActive = projectedWard.wardId === caseFile.activeWardId;
  const hasPeriod = projectedWard.inventoryType !== 'guardian' && (ward.periodFrom || ward.periodTo);
  const hasGid = projectedWard.inventoryType === 'guardian' && ward.gid;
  const periodHTML = hasPeriod ? `<div class="ward-card-period">FY ${esc(fmtDateCard(ward.periodFrom) || '?')} – ${esc(fmtDateCard(ward.periodTo) || '?')}</div>`
    : hasGid ? `<div class="ward-card-period">GID: ${esc(fmtDateCard(ward.gid) || '?')}</div>` : '';
  // A Plan holds no money, so a dollar headline would be meaningless (and a
  // bare "—" under a "Total" label reads as a real, zero figure). Show how
  // much of the filing is done instead.
  const isFinancial = meta.financial !== false;
  const prog = isFinancial ? null : projectedWard.progress;
  const headlineHTML = isFinancial
    ? `<div class="ward-card-total-label">${esc(meta.totalLabel)}</div>
       <div class="ward-card-total">${formatDashboardCurrency(headline)}</div>`
    : `<div class="ward-card-total-label">${esc(meta.totalLabel)}</div>
       <div class="ward-card-total">${prog ? prog.pct : 0}<span style="font-size:1rem;font-weight:600;">%</span></div>
       ${prog ? `<div class="ward-card-modified">${prog.complete} of ${prog.total} sections complete</div>` : ''}`;
  const priority = dashboardPriority(projectedWard);
  const priorityBadge = priorityBadgeHTML(projectedWard, true);
  return `<div class="ward-card dashboard-priority-${priority}${isActive ? ' ward-card-active' : ''}${projectedWard.isArchived ? ' ward-card-archived' : ''}" data-dashboard-priority="${priority}" style="--card-accent:${meta.accent}">
    <div class="ward-card-header">
      <span class="ward-card-icon">${typeIcon(projectedWard.inventoryType, 20)}</span>
      <div class="ward-card-title">
        <div class="ward-card-name">${esc(ward.wardName || '(unnamed)')}</div>
        <div class="ward-card-type">${esc(typeLabel)}</div>
        ${periodHTML}
        ${formatDeadlineBadge(projectedWard)}
      </div>
      <span class="ward-card-badges">${isActive ? '<span class="badge bg-primary ward-card-badge">Active</span>' : projectedWard.isArchived ? '<span class="badge bg-secondary ward-card-badge">Closed</span>' : ''}${priorityBadge}</span>
    </div>
    <div class="ward-card-body">
      ${headlineHTML}
      <div class="ward-card-modified">Last modified: ${esc(lastMod)}</div>
      ${(ward.years && ward.years.length) ? `<button type="button" class="btn btn-link ward-card-prior-years-link" data-dashboard-action="prior-years" data-ward-id="${esc(ward.wardId)}">${ward.years.length} prior year${ward.years.length === 1 ? '' : 's'} ▸</button>` : ''}
    </div>
    <div class="ward-card-quick-actions">
      <button class="btn btn-sm btn-outline-secondary" title="Save an encrypted backup of just this ward" aria-label="Backup ${esc(ward.wardName || 'this ward')}" data-dashboard-action="backup" data-ward-id="${esc(ward.wardId)}"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.6v10.8"/><path d="m8.2 10.8 3.8 3.8 3.8-3.8"/><path d="M4.4 19.9h15.2"/></svg> Backup</button>
      <button class="btn btn-sm btn-outline-secondary" title="Open Print Preview to export a PDF" aria-label="Export PDF for ${esc(ward.wardName || 'this ward')}" data-dashboard-action="pdf" data-ward-id="${esc(ward.wardId)}"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/></svg> PDF</button>
      <button class="btn btn-sm btn-outline-secondary" title="Archive this year and open a new one" aria-label="Start a new year for ${esc(ward.wardName || 'this ward')}" data-dashboard-action="new-year" data-ward-id="${esc(ward.wardId)}"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 5.6v12.8M5.6 12h12.8"/></svg> New Year</button>
      <button class="btn btn-sm btn-outline-secondary" title="Link this filing to another filing's Case, so they group together on the dashboard even if the case number changes later" aria-label="Link ${esc(ward.wardName || 'this filing')} to a Case" data-dashboard-action="link-case" data-ward-id="${esc(ward.wardId)}">${ic('folder', 14)} Link to Case</button>
      <button class="btn btn-sm btn-outline-secondary" title="${projectedWard.isArchived ? 'Move back to active caseload' : 'Mark this case as closed'}" aria-label="${projectedWard.isArchived ? 'Restore' : 'Archive'} ${esc(ward.wardName || 'this ward')}" data-dashboard-action="archive" data-ward-id="${esc(projectedWard.wardId)}" aria-pressed="${projectedWard.isArchived}">${projectedWard.isArchived ? ic('undo', 14) + ' Restore' : ic('archive', 14) + ' Archive'}</button>
      <button class="btn btn-sm btn-outline-danger" title="Permanently delete this form" aria-label="Delete ${esc(ward.wardName || 'this ward')}" data-dashboard-action="delete" data-ward-id="${esc(ward.wardId)}"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.5 6.8h15"/><path d="M9.3 6.8V4.4h5.4v2.4"/><path d="M6.6 6.8 7.7 20h8.6l1.1-13.2"/></svg> Delete</button>
    </div>
    <div class="ward-card-footer">
      <button class="btn btn-sm btn-primary w-100" data-dashboard-action="open-ward" data-ward-id="${esc(ward.wardId)}">${isActive ? 'Continue Editing →' : 'Open Filing →'}</button>
    </div>
  </div>`;
}

function renderDashboardSummary() {
  const container = document.getElementById('dashboard-summary-strip-container');
  if (!container) return;
  const activeWards = projectWards(getCaseFile().wards).filter(w => !w.isArchived);
  const metrics = getDashboardMetrics(activeWards);
  container.innerHTML = `<div class="dashboard-summary-strip dashboard-triage-summary">
    <div class="dashboard-stat dashboard-stat-action"><div class="dashboard-stat-num dashboard-metric-alert">${metrics.actionItems}</div><div class="dashboard-stat-label">Action Items / Exceptions</div></div>
    <div class="dashboard-stat dashboard-stat-deadline"><div class="dashboard-stat-num dashboard-metric-warn">${metrics.approachingDeadlines}</div><div class="dashboard-stat-label">Approaching Deadlines</div></div>
    <div class="dashboard-stat dashboard-stat-pending"><div class="dashboard-stat-num dashboard-metric-pending">${metrics.pendingCourtReview}</div><div class="dashboard-stat-label">Pending Court Review</div></div>
    <div class="dashboard-stat dashboard-stat-secondary"><div class="dashboard-stat-num">${activeWards.length}</div><div class="dashboard-stat-label">Active Filings</div></div>
  </div>`;
}

// Shows a one-time "Continue where you left off" banner when the app
// resumes on a different ward than the one most recently worked on — e.g.
// it reopened to whatever was active last save, but that's not necessarily
// what was being edited right before closing. Gated on the accessor
// isContinuePromptShown() which reads _appState.continuePromptShown
// (part of the .sav file now, not sessionStorage).
function showContinuePromptIfNeeded() {
  const container = document.getElementById('continue-prompt-container');
  if (!container) return;
  container.innerHTML = '';
  if (isContinuePromptShown()) return;
  const recent = getRecentlyOpenedWards().filter(r => !r.archived);
  const last = recent[0];
  const caseFile = getCaseFile();
  if (!last || last.wardId === caseFile.activeWardId) return;
  markContinuePromptShown();
  const typeLabel = INVENTORY_TYPES[last.inventoryType]?.name || last.inventoryType;
  container.innerHTML = `<div class="continue-prompt-banner" id="continue-prompt-banner">
    <div class="continue-prompt-content">
      <span class="continue-prompt-icon">${typeIcon(last.inventoryType, 20)}</span>
      <div class="continue-prompt-text">
        <div class="continue-prompt-label">Continue where you left off</div>
        <div class="continue-prompt-ward-name">${esc(last.wardName || '(unnamed)')}</div>
        <div class="continue-prompt-meta">${esc(typeLabel)} · ${formatRelativeTime(last.timestamp)}</div>
      </div>
      <button type="button" class="continue-prompt-btn" data-dashboard-action="open-ward" data-ward-id="${esc(last.wardId)}">Open</button>
      <button type="button" class="continue-prompt-dismiss" data-dashboard-action="dismiss-continue" aria-label="Dismiss">&times;</button>
    </div>
  </div>`;
}

function renderDashboardWorklist() {
  // The deadlines/recent panel belonged to the family layout, which Milestone
  // 36-1 removed. The triage queue already surfaces deadlines as a sortable
  // column, so the top row collapses to a single column and stays empty.
  const container = document.getElementById('dashboard-worklist-container');
  if (!container) return;
  const topRow = document.getElementById('dashboard-top-row');
  container.hidden = true;
  container.innerHTML = '';
  if (topRow) topRow.classList.add('single-col');
}


function deadlineDisplay(row) {
  if (!row.deadlineDate) return '<span class="dashboard-triage-muted">No deadline</span>';
  const date = row.deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!row.isDeadlineActionable) return `<span class="dashboard-triage-muted">${esc(date)}</span>`;
  if (row.workflowStatus === 'disapproved-needs-correction') return `${priorityBadgeHTML(row)}<strong class="dashboard-priority-reason">Needs correction</strong>`;
  if (row.deadlineBucket === 'overdue') return `${priorityBadgeHTML(row)}<strong class="dashboard-priority-reason deadline-overdue">${Math.abs(row.daysUntilDeadline)} day${Math.abs(row.daysUntilDeadline) === 1 ? '' : 's'} overdue</strong>`;
  if (row.deadlineBucket === 'today') return `${priorityBadgeHTML(row)}<strong class="dashboard-priority-reason deadline-soon">Due today</strong>`;
  if (row.deadlineBucket === 'due-soon') return `${priorityBadgeHTML(row)}<strong class="dashboard-priority-reason deadline-soon">Due in ${row.daysUntilDeadline} days</strong>`;
  return `<span class="dashboard-triage-muted">${esc(date)}</span>`;
}

function workflowStatusControl(row) {
  const selectedStatus = row.workflowSource === 'explicit' ? row.workflowStatus : 'auto';
  return `<select class="form-select form-select-sm dashboard-workflow-select dashboard-workflow-${esc(row.workflowStatus)}" data-dashboard-change="workflow-status" data-ward-id="${esc(row.wardId)}" aria-label="Workflow status for ${esc(row.wardName || 'ward')}">
    ${option('auto', `Automatic (${WORKFLOW_LABELS[row.workflowStatus] || row.workflowStatus})`, selectedStatus)}
    ${Object.entries(WORKFLOW_LABELS).filter(([key]) => key !== 'closed').map(([key, label]) => option(key, label, selectedStatus)).join('')}
  </select>`;
}

function assignmentControl(row) {
  return `<input type="text" class="form-control form-control-sm dashboard-assignee-input" maxlength="120" value="${esc(row.assigneeName)}" placeholder="Unassigned" data-dashboard-change="assignee" data-ward-id="${esc(row.wardId)}" aria-label="Assignee for ${esc(row.wardName || 'ward')}">`;
}

function triageActionButtons(row) {
  const id = esc(row.wardId);
  // Rendered as an empty cell rather than omitted: hiding the button without
  // reserving its column is what let every later button shift left relative to
  // the row above (Milestone 36-1).
  const priorYears = row.sourceWard.years?.length
    ? `<button class="btn btn-sm btn-outline-secondary" data-dashboard-action="prior-years" data-ward-id="${id}">Prior years</button>`
    : '<span class="dashboard-action-empty" aria-hidden="true"></span>';
  return `<div class="dashboard-triage-actions dashboard-triage-cell" data-label="Actions">
    <button class="btn btn-sm btn-primary" data-dashboard-action="open-ward" data-ward-id="${id}">Open</button>
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="backup" data-ward-id="${id}">Backup</button>
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="pdf" data-ward-id="${id}">PDF</button>
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="new-year" data-ward-id="${id}">New year</button>
    ${priorYears}
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="archive" data-ward-id="${id}">${row.isArchived ? 'Restore' : 'Archive'}</button>
    <button class="btn btn-sm btn-outline-danger" data-dashboard-action="delete" data-ward-id="${id}">Delete</button>
  </div>`;
}

function getTriageRows(rows) {
  const query = _dashboardSearch.trim().toLocaleLowerCase('en-US');
  let filtered = rows.filter(row => !row.isArchived);
  if (query) {
    filtered = filtered.filter(row => [row.wardName, row.caseNumber, row.assigneeName, ...row.filingContacts.map(item => item.name)]
      .some(value => String(value || '').toLocaleLowerCase('en-US').includes(query)));
  }
  if (_dashboardStatusFilter !== 'all') filtered = filtered.filter(row => row.workflowStatus === _dashboardStatusFilter);
  if (_dashboardDeadlineFilter !== 'all') {
    filtered = filtered.filter(row => {
      if (!row.isDeadlineActionable) return false;
      if (_dashboardDeadlineFilter === 'due-soon') return row.deadlineBucket === 'today' || row.deadlineBucket === 'due-soon';
      return row.deadlineBucket === _dashboardDeadlineFilter;
    });
  }
  if (_dashboardContactFilter !== 'all') filtered = filtered.filter(row => row.filingContacts.some(item => item.filterKey === _dashboardContactFilter));
  if (_dashboardAssignmentFilter === 'unassigned') filtered = filtered.filter(row => !row.assigneeKey);
  else if (_dashboardAssignmentFilter !== 'all') filtered = filtered.filter(row => row.assigneeKey === _dashboardAssignmentFilter);

  if (_dashboardTriageSort === 'priority') return filtered.slice().sort(compareDashboardPriority);
  if (_dashboardTriageSort === 'deadline') return filtered.slice().sort((a, b) => (a.deadlineDate?.getTime() ?? Infinity) - (b.deadlineDate?.getTime() ?? Infinity));
  return filtered.slice().sort((a, b) => compareDashboardColumn(a, b, _dashboardTriageSort.key, _dashboardTriageSort.direction));
}

function formatContactRole(role) {
  if (!role) return '';
  if (role === 'preparer') return 'Preparer';
  if (role === 'attorney') return 'Attorney';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function renderTriageQueue(projectedWards) {
  const rows = getTriageRows(projectedWards);
  const body = rows.map(row => {
    const priority = dashboardPriority(row);
    const contacts = row.filingContacts.length
      ? row.filingContacts.map(item => `<span class="dashboard-contact-item"><span class="dashboard-contact-role">${esc(formatContactRole(item.role))}:</span> <span class="dashboard-contact-name">${esc(item.name)}</span></span>`).join('')
      : '<span class="dashboard-triage-muted">No filing contact</span>';
    return `<article class="dashboard-triage-row dashboard-priority-${priority}" data-dashboard-priority="${priority}" data-dashboard-ward-id="${esc(row.wardId)}">
      <div class="dashboard-triage-cell dashboard-triage-ward" data-label="Ward">
        <strong>${esc(row.wardName || '(unnamed)')}</strong>
      </div>
      <div class="dashboard-triage-cell dashboard-triage-filing" data-label="Form Type">
        <span>${esc(row.displayType)}</span>
      </div>
      <div class="dashboard-triage-cell dashboard-triage-case" data-label="Case Number">
        <span>${esc(row.caseNumber || '—')}</span>
        <button type="button" class="btn btn-link btn-sm p-0 ms-1 dashboard-link-case-btn" title="Link this filing to a Case" aria-label="Link ${esc(row.wardName || 'this filing')} to a Case" data-dashboard-action="link-case" data-ward-id="${esc(row.wardId)}"><svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h9.6V19H3.4Z"/></svg></button>
      </div>
      <div class="dashboard-triage-cell" data-label="Status">${workflowStatusControl(row)}</div>
      <div class="dashboard-triage-deadline dashboard-triage-cell" data-label="Deadline">${deadlineDisplay(row)}</div>
      <div class="dashboard-triage-contacts dashboard-triage-cell" data-label="Contacts">${contacts}</div>
      <div class="dashboard-triage-assignee dashboard-triage-cell" data-label="Judge">${assignmentControl(row)}</div>
      ${triageActionButtons(row)}
    </article>`;
  }).join('');

  const sortBtn = (key, label) => {
    const isSorted = _dashboardTriageSort.key === key;
    const dir = isSorted ? _dashboardTriageSort.direction : 'none';
    const ariaSort = isSorted ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
    const indicator = isSorted ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<button type="button" class="dashboard-sort-btn" data-dashboard-sort="${key}" aria-sort="${ariaSort}">${esc(label)}<span class="dashboard-sort-indicator" aria-hidden="true">${indicator}</span></button>`;
  };

  return `<div class="dashboard-triage-queue">
    <div class="dashboard-triage-header">
      ${sortBtn('name', 'Ward')}
      ${sortBtn('type', 'Form Type')}
      ${sortBtn('case', 'Case #')}
      ${sortBtn('status', 'Status')}
      ${sortBtn('deadline', 'Deadline')}
      <span title="Filing contacts (unsortable)">Contacts</span>
      ${sortBtn('judge', 'Judge')}
      <span>Actions</span>
    </div>
    ${body || '<div class="dashboard-empty-inline">No filings match these filters.</div>'}
  </div>`;
}

function renderDashboardGrid() {
  const container = document.getElementById('dashboard-grid-container');
  if (!container) return;
  const allWards = getCaseFile().wards;
  if (!allWards.length) {
    container.innerHTML = `<div class="dashboard-empty">
      <div style="color:var(--ink-4);margin-bottom:.4rem;"><svg class="ic" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h9.6V19H3.4Z"/></svg></div>
      <p class="text-muted">No wards yet.</p>
      <button class="btn btn-primary btn-sm" data-dashboard-action="add-ward">+ Add Your First Ward</button>
    </div>`;
    return;
  }
  const projectedWards = projectWards(allWards);
  // Milestone 36-1 collapsed three role layouts to one. The archived/closed
  // section below was shared by both former branches and stays.
  let html = renderTriageQueue(projectedWards);
  const archived = projectedWards.filter(w => w.isArchived);
  if (archived.length) {
    html += `<div class="dashboard-section-divider"><button class="btn btn-sm btn-outline-secondary" data-dashboard-action="toggle-archived" aria-expanded="${_archivedSectionOpen}">${_archivedSectionOpen ? '▾' : '▸'} Archived / Closed Wards (${archived.length})</button></div>`;
    if (_archivedSectionOpen) html += `<div class="dashboard-grid dashboard-grid-archived">${archived.map(wardCardHTML).join('')}</div>`;
  }
  container.innerHTML = html;
}

async function quickExportPdf(wardId) {
  await switchWard(wardId);
  navigate('/print');
}

// Shares a standalone copy of just this one ward -- deliberately decoupled
// from the case's own save state (see finishSingleWardExport()'s comment in
// legacy-app.js): it does NOT touch _lastExportAt/the "last backup" readout,
// since this action says nothing about whether the real case file itself
// has been saved.
async function exportSingleWardZip(wardId) {
  const caseFile = getCaseFile();
  const ward = caseFile.wards.find(w => w.wardId === wardId);
  if (!ward) return;
  try {
    if (ward.wardId === caseFile.activeWardId) await flushPendingSave();
    const wardName = ward.wardName || 'ward';
    const blob = await window.buildSingleWardExportBlob(wardId);
    const fileName = typeof window.getWardFileName === 'function' ? window.getWardFileName(ward)
      : `${((ward.wardName || 'Ward').trim().replace(/[\s_]+/g, '-') || 'Ward')}-guardianshipwarddata.sav`;
    const validator = window.validateWardBackupOverwrite;
    if (typeof validator !== 'function') {
      throw new Error('validateWardBackupOverwrite is required but not available');
    }
    const handle = await saveBlobAs(blob, fileName, validator);
    const logFn = window.auditLog || auditLog;
    if (typeof logFn === 'function') logFn('DATA_EXPORT', `Exported single ward "${wardName}" to ward file`, true, wardId);
    if (window.finishSingleWardExport) window.finishSingleWardExport(handle, ward);
    alert(`Backup saved for ${ward.wardName || 'this ward'}.`);
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    console.error('single ward export failed', e);
    const logFn = window.auditLog || auditLog;
    if (typeof logFn === 'function') logFn('DATA_EXPORT', String(e && e.message || e), false, wardId);
    alert('Export failed: ' + (e && e.message || e));
  }
}

async function toggleDashboardWardArchived(wardId) {
  const caseFile = getCaseFile();
  const ward = caseFile.wards.find(w => w.wardId === wardId);
  if (!ward) return;
  ward.archived = !ward.archived;
  await saveWardToState(ward);
  markDirtySinceExport();
  updateLastSavedIndicator();
  renderDashboardSummary();
  renderDashboardWorklist();
  renderDashboardGrid();
}

async function updateDashboardWorkflow(wardId, field, value) {
  const caseFile = getCaseFile();
  const wards = caseFile.wards;
  const ward = wards.find(item => item.wardId === wardId);
  if (!ward) return;
  const workflow = normalizeDashboardWorkflow(ward.dashboardWorkflow);
  if (field === 'workflow-status') {
    if (value === 'auto') delete workflow.status;
    else if (Object.prototype.hasOwnProperty.call(WORKFLOW_LABELS, value) && value !== 'closed') workflow.status = value;
    else return;
  } else if (field === 'assignee') {
    const normalized = normalizeDashboardWorkflow({ assigneeName: value }).assigneeName;
    if (normalized) workflow.assigneeName = normalized;
    else delete workflow.assigneeName;
  } else return;

  if (Object.keys(workflow).length) ward.dashboardWorkflow = workflow;
  else delete ward.dashboardWorkflow;
  await saveWardToState(ward);

  // Judge propagation across case siblings on assignee commit
  if (field === 'assignee') {
    const caseNum = (typeof caseNumberOf === 'function' ? caseNumberOf(ward) : (ward.caseNumber || '')).trim();

    // 1. Explicit caseId-linked siblings are automatically updated
    const linkedSiblings = ward.caseId
      ? wards.filter(w => w.wardId !== ward.wardId && w.caseId === ward.caseId)
      : [];
    for (const sibling of linkedSiblings) {
      const sibWf = normalizeDashboardWorkflow(sibling.dashboardWorkflow);
      if (workflow.assigneeName) sibWf.assigneeName = workflow.assigneeName;
      else delete sibWf.assigneeName;
      if (Object.keys(sibWf).length) sibling.dashboardWorkflow = sibWf;
      else delete sibling.dashboardWorkflow;
      await saveWardToState(sibling);
    }

    // 2. Unlinked siblings sharing case number string require confirmation
    if (caseNum) {
      const unlinkedSiblings = wards.filter(w => {
        if (w.wardId === ward.wardId) return false;
        if (ward.caseId && w.caseId === ward.caseId) return false;
        const sCaseNum = (typeof caseNumberOf === 'function' ? caseNumberOf(w) : (w.caseNumber || '')).trim();
        return sCaseNum && sCaseNum.toLowerCase() === caseNum.toLowerCase();
      });
      if (unlinkedSiblings.length > 0) {
        const confirmMsg = `Also set this judge on ${unlinkedSiblings.length} other filing${unlinkedSiblings.length === 1 ? '' : 's'} for case "${caseNum}"?`;
        if (confirm(confirmMsg)) {
          for (const sibling of unlinkedSiblings) {
            const sibWf = normalizeDashboardWorkflow(sibling.dashboardWorkflow);
            if (workflow.assigneeName) sibWf.assigneeName = workflow.assigneeName;
            else delete sibWf.assigneeName;
            if (Object.keys(sibWf).length) sibling.dashboardWorkflow = sibWf;
            else delete sibling.dashboardWorkflow;
            await saveWardToState(sibling);
          }
        }
      }
    }
  }

  markDirtySinceExport();
  updateLastSavedIndicator();
  renderDashboardPage();
}

function dashboardActionElement(target) {
  return target instanceof Element ? target.closest('[data-dashboard-action]') : null;
}

async function handleDashboardClick(event) {
  const sortElement = event.target instanceof Element ? event.target.closest('[data-dashboard-sort]') : null;
  if (sortElement && _dashboardContainer?.contains(sortElement)) {
    const key = sortElement.dataset.dashboardSort;
    if (_dashboardTriageSort.key === key) {
      if (_dashboardTriageSort.direction === 'asc') {
        _dashboardTriageSort = { key, direction: 'desc' };
      } else {
        _dashboardTriageSort = { key: 'priority', direction: 'asc' };
      }
    } else {
      _dashboardTriageSort = { key, direction: 'asc' };
    }
    renderDashboardGrid();
    return;
  }

  const actionElement = dashboardActionElement(event.target);
  if (!actionElement || !_dashboardContainer?.contains(actionElement)) return;
  const wardId = actionElement.dataset.wardId;
  switch (actionElement.dataset.dashboardAction) {
    case 'add-ward': showAddWardModal(); break;
    case 'archive': toggleDashboardWardArchived(wardId); break;
    case 'backup': exportSingleWardZip(wardId); break;
    case 'export-all':
      if (window.exportGuardianDataZip) window.exportGuardianDataZip();
      break;
    case 'close-ward':
      if (window.unloadWard) {
        window.unloadWard().then(() => renderDashboardPage());
      }
      break;
    case 'delete':
    case 'delete-ward':
      confirmDeleteWard(wardId || getCaseFile().activeWardId);
      break;
    case 'rename-ward':
      if (window.showRenameWardModal) window.showRenameWardModal();
      break;
    case 'dismiss-continue': document.getElementById('continue-prompt-container')?.replaceChildren(); break;
    case 'link-case': window.showPickCaseModal(wardId); break;
    case 'new-year': showStartNewYearModal(wardId); break;
    case 'open-ward': await switchWard(wardId); break;
    case 'pdf': quickExportPdf(wardId); break;
    case 'prior-years': showPriorYearsModal(wardId); break;
    case 'select-existing': showConvertWardModal(); break;
    case 'toggle-archived': toggleArchivedSection(); break;
  }
}

function handleDashboardInput(event) {
  if (event.target instanceof HTMLInputElement && event.target.id === 'dashboard-search') {
    setDashboardSearch(event.target.value);
  }
}

function handleDashboardChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) return;
  if (target.dataset.dashboardChange) {
    void updateDashboardWorkflow(target.dataset.wardId, target.dataset.dashboardChange, target.value);
  } else if (!(target instanceof HTMLSelectElement)) return;
  else if (target.id === 'dashboard-status-filter') { _dashboardStatusFilter = target.value; renderDashboardGrid(); }
  else if (target.id === 'dashboard-deadline-filter') { _dashboardDeadlineFilter = target.value; renderDashboardGrid(); }
  else if (target.id === 'dashboard-contact-filter') { _dashboardContactFilter = target.value; renderDashboardGrid(); }
  else if (target.id === 'dashboard-assignment-filter') {
    _dashboardAssignmentFilter = target.value;
    _dashboardPreferences = saveDashboardPreferences({
      ..._dashboardPreferences,
      supervisingProfessionalFilter: target.value === 'all' ? null : target.value,
    });
    renderDashboardGrid();
  }
}

function handleDashboardKeydown(event) {
  const actionElement = dashboardActionElement(event.target);
  if (actionElement?.dataset.dashboardAction !== 'select-existing') return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    showConvertWardModal();
  }
}

function bindDashboardEvents(container) {
  if (_dashboardContainer) unbindDashboardEvents(_dashboardContainer);
  _dashboardContainer = container;
  container.addEventListener('click', handleDashboardClick);
  container.addEventListener('input', handleDashboardInput);
  container.addEventListener('change', handleDashboardChange);
  container.addEventListener('keydown', handleDashboardKeydown);
  container.dataset.dashboardBound = 'true';
}

function unbindDashboardEvents(container) {
  container.removeEventListener('click', handleDashboardClick);
  container.removeEventListener('input', handleDashboardInput);
  container.removeEventListener('change', handleDashboardChange);
  container.removeEventListener('keydown', handleDashboardKeydown);
  delete container.dataset.dashboardBound;
  if (_dashboardContainer === container) _dashboardContainer = null;
}

function pageDashboard() {
  return `<div class="schedule-page" data-dashboard-root>
    <div id="continue-prompt-container"></div>
    ${dashboardHeaderHTML()}
    <div class="dashboard-toolbar">${dashboardToolbarHTML()}</div>
    <div id="dashboard-summary-strip-container"></div>
    <div class="dashboard-top-row single-col" id="dashboard-top-row">
      <div id="dashboard-worklist-container" hidden></div>
    </div>
    <div id="dashboard-grid-container"></div>
  </div>`;
}

function renderDashboardPage() {
  if (!_dashboardHost) return;
  if (_dashboardContainer) unbindDashboardEvents(_dashboardContainer);
  _dashboardHost.innerHTML = pageDashboard();
  bindDashboardEvents(_dashboardHost.querySelector('[data-dashboard-root]'));
  showContinuePromptIfNeeded();
  renderDashboardSummary();
  renderDashboardWorklist();
  renderDashboardGrid();
}

// Feature bridge contract: mount(container, page) and dispose(container)
// Expected by window.createFeatureBridge() and called via
// legacy-app.js's mountDashboardFeature().
export async function mount(container, page) {
  _dashboardHost = container;
  _dashboardPreferences = loadDashboardPreferences();
  _dashboardAssignmentFilter = _dashboardPreferences.supervisingProfessionalFilter || 'all';
  _dashboardTriageSort = { key: 'priority', direction: 'asc' };
  renderDashboardPage();
}

export function dispose(container) {
  if (_dashboardContainer) unbindDashboardEvents(_dashboardContainer);
  container.innerHTML = '';
  // Reset session-only state on page change
  _dashboardSearch = '';
  _archivedSectionOpen = false;
  _dashboardStatusFilter = 'all';
  _dashboardDeadlineFilter = 'all';
  _dashboardContactFilter = 'all';
  _dashboardAssignmentFilter = 'all';
  _dashboardTriageSort = { key: 'priority', direction: 'asc' };
  _dashboardHost = null;
}

// Optional nav rendering — this feature doesn't have custom nav per the
// ward-switch architecture (nav is always the shared topnav from legacy-app.js)
export async function mountNav(container) {
  // No-op: dashboard has no feature-specific nav
}
