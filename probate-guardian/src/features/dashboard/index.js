// Dashboard -- Milestone 9 dashboard rendering extraction (ward card grid,
// summary strip, deadline/recent worklist, grouping by type/case/flat,
// search/sort/archive toggles). Dynamically imported by legacy-app.js's
// mountDashboardFeature() bridge, using the same window.createFeatureBridge()
// pattern as Guardian, Simplified, Plan, and Annual features.
import { compareDashboardPriority, getDashboardMetrics, normalizeDashboardWorkflow, projectDashboardWard } from './view-model.js';
import { loadDashboardPreferences, saveDashboardPreferences } from './preferences.js';

const {
  esc, ic, navigate, getGuardianData, isContinuePromptShown, markContinuePromptShown,
  getRecentlyOpenedWards, saveWardToState, flushPendingSave, markDirtySinceExport, updateLastSavedIndicator,
  saveBlobAs, auditLog, saveAppState,
  getWardHeadlineTotal, getWardProgress, typeIcon, INVENTORY_TYPE_META, formatDashboardCurrency,
  switchWard, showStartNewYearModal, confirmDeleteWard,
  showConvertWardModal, showAddWardModal, showPriorYearsModal, fmtDateCard, formatRelativeTime,
  INVENTORY_TYPES, formEngine,
} = window;

// Dashboard's own module state -- all session-only, not persisted, reset on reload.
// These would be window properties if the dashboard stayed monolithic, but now that
// they're module-private via closure, they live entirely here.
let _dashboardSearch = '';
let _dashboardSort = 'lastModified'; // 'lastModified' | 'name' | 'total'
let _archivedSectionOpen = false;
let _dashboardGroupMode = 'type'; // 'type' | 'case' | 'flat'
let _dashboardExpandedSections = new Set();
let _dashboardWorklistTab = null; // null = auto-pick; else 'deadlines' | 'recent'
let _dashboardContainer = null;
let _dashboardHost = null;
let _dashboardPreferences = loadDashboardPreferences();
let _dashboardStatusFilter = 'all';
let _dashboardDeadlineFilter = 'all';
let _dashboardContactFilter = 'all';
let _dashboardAssignmentFilter = 'all';
let _dashboardTriageSort = 'priority';

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

function isTriageRole() {
  return _dashboardPreferences.role === 'professional' || _dashboardPreferences.role === 'assistant';
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

function roleControlHTML() {
  return `<label class="dashboard-control dashboard-role-control"><span>View</span><select id="dashboard-role" class="form-select form-select-sm" aria-label="Dashboard view">
    ${option('family', 'Family', _dashboardPreferences.role)}
    ${option('professional', 'Professional', _dashboardPreferences.role)}
    ${option('assistant', 'Assistant', _dashboardPreferences.role)}
  </select></label>`;
}

function assignmentFilterHTML(rows, label, extraClass = '') {
  const assignees = uniqueFilterOptions(rows, row => row.assigneeKey ? [{ key: row.assigneeKey, label: row.assigneeName }] : []);
  if (!['all', 'unassigned'].includes(_dashboardAssignmentFilter) && !assignees.some(([key]) => key === _dashboardAssignmentFilter)) {
    _dashboardAssignmentFilter = 'all';
  }
  return `<label class="dashboard-control${extraClass ? ` ${extraClass}` : ''}"><span>${esc(label)}</span><select id="dashboard-assignment-filter" class="form-select form-select-sm">
    ${option('all', label === 'Working on behalf of' ? 'All professionals' : 'All assignments', _dashboardAssignmentFilter)}
    ${option('unassigned', 'Unassigned', _dashboardAssignmentFilter)}
    ${assignees.map(([key, name]) => option(key, name, _dashboardAssignmentFilter)).join('')}
  </select></label>`;
}

function triageControlsHTML() {
  const rows = projectWards(getGuardianData().wards).filter(row => !row.isArchived);
  const contacts = uniqueFilterOptions(rows, row => row.filingContacts.map(item => ({ key: item.filterKey, label: item.name })));
  if (_dashboardContactFilter !== 'all' && !contacts.some(([key]) => key === _dashboardContactFilter)) _dashboardContactFilter = 'all';
  const assignmentFilter = _dashboardPreferences.role === 'professional'
    ? assignmentFilterHTML(rows, 'Assignment')
    : '';
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
    ${assignmentFilter}
    <label class="dashboard-control"><span>Sort</span><select id="dashboard-triage-sort" class="form-select form-select-sm">
      ${option('priority', 'Priority', _dashboardTriageSort)}
      ${option('deadline', 'Deadline', _dashboardTriageSort)}
      ${option('lastModified', 'Last modified', _dashboardTriageSort)}
      ${option('name', 'Ward name', _dashboardTriageSort)}
    </select></label>`;
}

function dashboardToolbarHTML() {
  const search = `<span class="dashboard-search-wrap">${ic('search', 15)}<input type="text" id="dashboard-search" class="form-control form-control-sm dashboard-search-input" placeholder="Search wards by name…" aria-label="Search wards by name" value="${esc(_dashboardSearch)}"></span>`;
  if (isTriageRole()) return `${search}${triageControlsHTML()}`;
  return `${search}
    <select id="dashboard-sort" class="form-select form-select-sm dashboard-sort-select" aria-label="Sort wards by">
      ${option('lastModified', 'Sort: Last Modified', _dashboardSort)}
      ${option('name', 'Sort: Name (A–Z)', _dashboardSort)}
      ${option('total', 'Sort: Total (High–Low)', _dashboardSort)}
    </select>
    <button id="dashboard-group-toggle" class="btn btn-sm ${_dashboardGroupMode === 'flat' ? 'btn-outline-secondary' : 'btn-secondary'}" data-dashboard-action="group" aria-pressed="${_dashboardGroupMode !== 'flat'}" title="Cycle between grouping wards by type, by case number, and a flat grid">${dashboardGroupLabel(_dashboardGroupMode)}</button>`;
}

function dashboardHeaderHTML() {
  const activeRows = projectWards(getGuardianData().wards).filter(row => !row.isArchived);
  const supervisorFilter = _dashboardPreferences.role === 'assistant'
    ? assignmentFilterHTML(activeRows, 'Working on behalf of', 'dashboard-supervisor-control')
    : '';
  const activeWardId = getGuardianData().activeWardId;
  const activeWard = getGuardianData().wards.find(w => w.wardId === activeWardId);
  const closeLoadedWardBtn = activeWard ? `<button type="button" class="btn btn-sm btn-outline-secondary dashboard-close-ward" data-dashboard-action="close-ward" title="Close active ward and release lock">${ic('x', 14)} Close Active Ward</button>` : '';
  return `<header class="dashboard-page-header">
    <div class="dashboard-page-title">
      <div class="dashboard-page-kicker">Compliance overview</div>
      <h1>All Wards — Dashboard</h1>
      <p>Review exceptions, deadlines, and court status across active filings.</p>
    </div>
    <div class="dashboard-header-actions">
      ${closeLoadedWardBtn}
      ${roleControlHTML()}
      ${supervisorFilter}
      <button type="button" class="btn btn-sm btn-primary dashboard-new-existing" data-dashboard-action="select-existing">${ic('copy', 14)} New Filing from Existing</button>
    </div>
  </header>`;
}

function onboardingHTML() {
  if (_dashboardPreferences.onboardingDismissed) return '';
  return `<div class="dashboard-onboarding" id="dashboard-onboarding">
    <strong>Choose your dashboard view</strong>
    <div class="dashboard-onboarding-actions">
      <button type="button" class="btn btn-sm btn-primary" data-dashboard-action="set-role" data-role="family">Family</button>
      <button type="button" class="btn btn-sm btn-outline-primary" data-dashboard-action="set-role" data-role="professional">Professional</button>
      <button type="button" class="btn btn-sm btn-outline-primary" data-dashboard-action="set-role" data-role="assistant">Assistant</button>
      <button type="button" class="btn btn-sm btn-link" data-dashboard-action="dismiss-onboarding">Dismiss</button>
    </div>
  </div>`;
}

function setDashboardSearch(value) {
  _dashboardSearch = value;
  renderDashboardGrid();
}

function setDashboardSort(value) {
  _dashboardSort = value;
  renderDashboardGrid();
}

function toggleDashboardSection(key) {
  if (_dashboardExpandedSections.has(key)) _dashboardExpandedSections.delete(key);
  else _dashboardExpandedSections.add(key);
  renderDashboardGrid();
}

function setDashboardWorklistTab(tab) {
  _dashboardWorklistTab = tab;
  renderDashboardWorklist();
}

function toggleDashboardGrouping() {
  const DASHBOARD_GROUP_MODES = ['type', 'case', 'flat'];
  const i = DASHBOARD_GROUP_MODES.indexOf(_dashboardGroupMode);
  _dashboardGroupMode = DASHBOARD_GROUP_MODES[(i + 1) % DASHBOARD_GROUP_MODES.length];
  const btn = document.getElementById('dashboard-group-toggle');
  if (btn) {
    btn.innerHTML = dashboardGroupLabel(_dashboardGroupMode);
    btn.className = `btn btn-sm ${_dashboardGroupMode === 'flat' ? 'btn-outline-secondary' : 'btn-secondary'}`;
    btn.setAttribute('aria-pressed', String(_dashboardGroupMode !== 'flat'));
  }
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
  const guardianData = getGuardianData();
  const isActive = projectedWard.wardId === guardianData.activeWardId;
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
      <button class="btn btn-sm btn-outline-secondary" title="Save an encrypted backup of just this ward" data-dashboard-action="backup" data-ward-id="${esc(ward.wardId)}"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.6v10.8"/><path d="m8.2 10.8 3.8 3.8 3.8-3.8"/><path d="M4.4 19.9h15.2"/></svg> Backup</button>
      <button class="btn btn-sm btn-outline-secondary" title="Open Print Preview to export a PDF" data-dashboard-action="pdf" data-ward-id="${esc(ward.wardId)}"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/></svg> PDF</button>
      <button class="btn btn-sm btn-outline-secondary" title="Archive this year and open a new one" data-dashboard-action="new-year" data-ward-id="${esc(ward.wardId)}"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 5.6v12.8M5.6 12h12.8"/></svg> New Year</button>
      <button class="btn btn-sm btn-outline-secondary" title="${projectedWard.isArchived ? 'Move back to active caseload' : 'Mark this case as closed'}" data-dashboard-action="archive" data-ward-id="${esc(projectedWard.wardId)}" aria-pressed="${projectedWard.isArchived}">${projectedWard.isArchived ? ic('undo', 14) + ' Restore' : ic('archive', 14) + ' Archive'}</button>
      <button class="btn btn-sm btn-outline-danger" title="Permanently delete this form" data-dashboard-action="delete" data-ward-id="${esc(ward.wardId)}"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.5 6.8h15"/><path d="M9.3 6.8V4.4h5.4v2.4"/><path d="M6.6 6.8 7.7 20h8.6l1.1-13.2"/></svg> Delete</button>
    </div>
    <div class="ward-card-footer">
      <button class="btn btn-sm btn-primary w-100" data-dashboard-action="open-ward" data-ward-id="${esc(ward.wardId)}">${isActive ? 'Continue Editing →' : 'Open Ward →'}</button>
    </div>
  </div>`;
}

function renderDashboardSummary() {
  const container = document.getElementById('dashboard-summary-strip-container');
  if (!container) return;
  const activeWards = projectWards(getGuardianData().wards).filter(w => !w.isArchived);
  const metrics = getDashboardMetrics(activeWards);
  const combinedTotal = activeWards.reduce((s, w) => s + (w.total || 0), 0);
  container.innerHTML = `<div class="dashboard-summary-strip dashboard-triage-summary">
    <div class="dashboard-stat dashboard-stat-action"><div class="dashboard-stat-num dashboard-metric-alert">${metrics.actionItems}</div><div class="dashboard-stat-label">Action Items / Exceptions</div></div>
    <div class="dashboard-stat dashboard-stat-deadline"><div class="dashboard-stat-num dashboard-metric-warn">${metrics.approachingDeadlines}</div><div class="dashboard-stat-label">Approaching Deadlines</div></div>
    <div class="dashboard-stat dashboard-stat-pending"><div class="dashboard-stat-num dashboard-metric-pending">${metrics.pendingCourtReview}</div><div class="dashboard-stat-label">Pending Court Review</div></div>
    <div class="dashboard-stat dashboard-stat-secondary"><div class="dashboard-stat-num">${activeWards.length}</div><div class="dashboard-stat-label">Active Filings</div></div>
  </div>
  <div class="dashboard-summary-secondary">Combined total <strong>${formatDashboardCurrency(activeWards.length ? combinedTotal : null)}</strong></div>`;
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
  const guardianData = getGuardianData();
  if (!last || last.wardId === guardianData.activeWardId) return;
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

function getDashboardDeadlineRows() {
  return projectWards(getGuardianData().wards)
    .filter(w => !w.isArchived && w.isDeadlineActionable && w.deadlineDate)
    .sort((a, b) => a.deadlineDate - b.deadlineDate);
}

function renderDashboardWorklist() {
  const container = document.getElementById('dashboard-worklist-container');
  if (!container) return;
  const topRow = document.getElementById('dashboard-top-row');
  if (isTriageRole()) {
    container.hidden = true;
    container.innerHTML = '';
    if (topRow) topRow.classList.add('single-col');
    return;
  }
  container.hidden = false;
  const deadlineRows = getDashboardDeadlineRows();
  const recentRows = getRecentlyOpenedWards();
  if (!deadlineRows.length && !recentRows.length) {
    container.innerHTML = '';
    if (topRow) topRow.classList.add('single-col');
    return;
  }
  if (topRow) topRow.classList.remove('single-col');
  const tab = _dashboardWorklistTab || (deadlineRows.length ? 'deadlines' : 'recent');
  const SHOWN = 8;
  const guardianData = getGuardianData();

  const deadlineRowHTML = (r) => {
    const diffDays = r.daysUntilDeadline;
    const typeLabel = INVENTORY_TYPES[r.inventoryType]?.name || r.inventoryType;
    let cls, text;
    if (diffDays < 0) { cls = 'deadline-overdue'; text = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`; }
    else if (diffDays === 0) { cls = 'deadline-soon'; text = 'Due today'; }
    else if (diffDays <= 14) { cls = 'deadline-soon'; text = `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`; }
    else { cls = 'deadline-ok'; text = `Due ${r.deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; }
    return `<button type="button" class="dashboard-deadline-row" data-dashboard-action="open-ward" data-ward-id="${esc(r.wardId)}" title="${esc(r.deadlineBasis)}">
      <span class="dashboard-deadline-icon">${typeIcon(r.inventoryType, 16)}</span>
      <span class="dashboard-deadline-name">${esc(r.wardName || '(unnamed)')}<span class="dashboard-deadline-type">${esc(typeLabel)}</span></span>
      <span class="ward-card-deadline ${cls}">${text}</span>
    </button>`;
  };
  const recentRowHTML = (r) => {
    const isActive = r.wardId === guardianData.activeWardId;
    const typeLabel = INVENTORY_TYPES[r.inventoryType]?.name || r.inventoryType;
    return `<button type="button" class="recent-ward-item${isActive ? ' recent-active' : ''}" data-dashboard-action="open-ward" data-ward-id="${esc(r.wardId)}">
      <span class="recent-ward-icon">${typeIcon(r.inventoryType, 16)}</span>
      <span class="recent-ward-info">
        <span class="recent-ward-name">${esc(r.wardName || '(unnamed)')}${isActive ? ' <span class="badge bg-primary ward-card-badge">Active</span>' : ''}</span>
        <span class="recent-ward-type">${esc(typeLabel)}${r.archived ? ' · Closed' : ''}</span>
      </span>
      <span class="recent-ward-time">${formatRelativeTime(r.timestamp)}</span>
    </button>`;
  };

  let bodyHTML;
  if (tab === 'deadlines') {
    const shown = deadlineRows.slice(0, SHOWN);
    const overflow = deadlineRows.length - shown.length;
    bodyHTML = shown.length
      ? `<div class="dashboard-deadlines-list">${shown.map(deadlineRowHTML).join('')}</div>${overflow > 0 ? `<div class="dashboard-deadlines-more">+${overflow} more, sorted by due date</div>` : ''}`
      : `<div class="dashboard-empty-inline">No upcoming deadlines yet.</div>`;
  } else {
    bodyHTML = recentRows.length
      ? `<div class="recently-opened-list">${recentRows.map(recentRowHTML).join('')}</div>`
      : `<div class="dashboard-empty-inline">Nothing opened yet.</div>`;
  }

  const tabBtn = (key, label, count) => `<button type="button" class="dashboard-worklist-tab${tab === key ? ' active' : ''}" data-dashboard-action="worklist-tab" data-tab="${key}">${esc(label)}${count ? ` <span class="dashboard-worklist-tab-count">${count}</span>` : ''}</button>`;

  container.innerHTML = `<div class="dashboard-deadlines-panel">
    <div class="dashboard-worklist-tabs">
      ${tabBtn('deadlines', 'Deadlines', deadlineRows.length)}
      ${tabBtn('recent', 'Recent', recentRows.length)}
    </div>
    ${bodyHTML}
  </div>`;
}

function renderGroupedWardSections(wards) {
  if (!wards.length) return '<div class="dashboard-empty-inline">No matching active wards.</div>';
  const DASHBOARD_TYPE_ORDER = ['guardian', 'simplified', 'annual', 'planInitial', 'planSimplified', 'planAnnual', 'planMinor'];
  const known = new Set(DASHBOARD_TYPE_ORDER);
  const groups = DASHBOARD_TYPE_ORDER.map(t => ({ type: t, wards: wards.filter(w => w.inventoryType === t) }))
    .concat([{ type: null, wards: wards.filter(w => !known.has(w.inventoryType)) }])
    .filter(g => g.wards.length);
  return groups.map(g => {
    const meta = INVENTORY_TYPE_META[g.type] || { iconName: 'folder', accent: '#525d6e', accentText: 'var(--ink-3)' };
    const typeName = g.type ? (INVENTORY_TYPES[g.type]?.name || g.type) : 'Other';
    // Summing a group of Plans would print a bold "$0.00" beside the
    // heading, which reads as a real balance rather than "not applicable" —
    // so non-financial groups get no subtotal at all.
    const subtotal = g.wards.reduce((s, w) => s + (w.total || 0), 0);
    const subtotalHTML = meta.financial === false ? ''
      : `<span class="dashboard-type-header-subtotal" style="color:${meta.accentText}">${formatDashboardCurrency(subtotal)}</span>`;
    const key = `type:${g.type || 'other'}`;
    const isOpen = _dashboardExpandedSections.has(key);
    return `<div class="dashboard-type-section${isOpen ? '' : ' is-collapsed'}">
      <button type="button" class="dashboard-type-header" style="border-left-color:${meta.accent}" data-dashboard-action="toggle-section" data-section-key="${esc(key)}" aria-expanded="${isOpen}">
        <span class="dashboard-type-header-chevron">${isOpen ? '▾' : '▸'}</span>
        <span class="dashboard-type-header-icon" style="color:${meta.accentText}">${typeIcon(g.type, 17)}</span>
        <span class="dashboard-type-header-name">${esc(typeName)}</span>
        <span class="dashboard-type-header-count">${g.wards.length} ward${g.wards.length === 1 ? '' : 's'}</span>
        ${subtotalHTML}
      </button>
      ${isOpen ? `<div class="dashboard-grid">${g.wards.map(wardCardHTML).join('')}</div>` : ''}
    </div>`;
  }).join('');
}

// Three modes rather than a boolean. "By Case" exists because one person can
// require several filings at once — a guardian of both person and property
// files an Accounting AND a Plan — and those live as separate ward records
// sharing a case number. Grouping by case puts that person back together.
function dashboardGroupLabel(mode) {
  return mode === 'type' ? ic('list', 15) + ' Grouped by Type'
    : mode === 'case' ? ic('folder', 15) + ' Grouped by Case'
      : ic('grid', 15) + ' Flat Grid';
}

// Groups by case number so every filing for one person sits together.
// Wards with no case number yet can't be matched to anything, so they are
// listed individually rather than lumped into a misleading shared group.
function renderCaseWardSections(wards) {
  if (!wards.length) return '<div class="dashboard-empty-inline">No matching active wards.</div>';
  const groups = new Map();
  wards.forEach(w => {
    const c = String(w.caseNumber || '').trim();
    const key = c || `__nocase__${w.wardId}`;
    if (!groups.has(key)) groups.set(key, { mapKey: key, caseNumber: c, wards: [] });
    groups.get(key).wards.push(w);
  });
  return [...groups.values()].map(g => {
    const names = [...new Set(g.wards.map(w => String(w.wardName || '').trim()).filter(Boolean))];
    const title = names.length ? names.join(' / ') : '(unnamed)';
    const sub = g.caseNumber ? esc(g.caseNumber) : 'No case number yet';
    const sectionKey = `case:${g.mapKey}`;
    const isOpen = _dashboardExpandedSections.has(sectionKey);
    return `<div class="dashboard-type-section${isOpen ? '' : ' is-collapsed'}">
      <button type="button" class="dashboard-type-header" style="border-left-color:var(--accent)" data-dashboard-action="toggle-section" data-section-key="${esc(sectionKey)}" aria-expanded="${isOpen}">
        <span class="dashboard-type-header-chevron">${isOpen ? '▾' : '▸'}</span>
        <span class="dashboard-type-header-icon" style="color:var(--accent-text)">${ic('folder', 17)}</span>
        <span class="dashboard-type-header-name">${esc(title)}</span>
        <span class="dashboard-type-header-count">${sub}</span>
        <span class="dashboard-type-header-count">${g.wards.length} filing${g.wards.length === 1 ? '' : 's'}</span>
      </button>
      ${isOpen ? `<div class="dashboard-grid">${g.wards.map(wardCardHTML).join('')}</div>` : ''}
    </div>`;
  }).join('');
}

function getFilteredSortedWards(wards) {
  const q = _dashboardSearch.trim().toLowerCase();
  let list = wards.filter(w => !q || String(w.wardName || '').toLowerCase().includes(q));
  if (_dashboardSort === 'name') {
    list = list.slice().sort((a, b) => String(a.wardName || '').localeCompare(String(b.wardName || '')));
  } else if (_dashboardSort === 'total') {
    list = list.slice().sort((a, b) => (b.total || 0) - (a.total || 0));
  } else {
    list = list.slice().sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
  }
  return list;
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
  const priorYears = row.sourceWard.years?.length
    ? `<button class="btn btn-sm btn-outline-secondary" data-dashboard-action="prior-years" data-ward-id="${id}">Prior years</button>` : '';
  return `<div class="dashboard-triage-actions dashboard-triage-cell" data-label="Actions">
    <button class="btn btn-sm btn-primary" data-dashboard-action="open-ward" data-ward-id="${id}">Open</button>
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="backup" data-ward-id="${id}">Backup</button>
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="pdf" data-ward-id="${id}">PDF</button>
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="new-year" data-ward-id="${id}">New year</button>
    ${priorYears}
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="archive" data-ward-id="${id}">Archive</button>
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
  if (_dashboardTriageSort === 'name') return filtered.slice().sort((a, b) => a.wardName.localeCompare(b.wardName));
  return filtered.slice().sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
}

function renderTriageQueue(projectedWards) {
  const rows = getTriageRows(projectedWards);
  const body = rows.map(row => {
    const priority = dashboardPriority(row);
    const contacts = row.filingContacts.length
      ? row.filingContacts.map(item => `<span>${esc(item.name)} <small>${esc(item.role)}</small></span>`).join('')
      : '<span class="dashboard-triage-muted">No filing contact</span>';
    return `<article class="dashboard-triage-row dashboard-priority-${priority}" data-dashboard-priority="${priority}" data-dashboard-ward-id="${esc(row.wardId)}">
      <div class="dashboard-triage-identity dashboard-triage-cell" data-label="Filing">
        <strong>${esc(row.wardName || '(unnamed)')}</strong>
        <span>${esc(row.displayType)}${row.caseNumber ? ` · ${esc(row.caseNumber)}` : ''}</span>
      </div>
      <div class="dashboard-triage-cell" data-label="Status">${workflowStatusControl(row)}</div>
      <div class="dashboard-triage-deadline dashboard-triage-cell" data-label="Deadline">${deadlineDisplay(row)}</div>
      <div class="dashboard-triage-contacts dashboard-triage-cell" data-label="Contacts">${contacts}</div>
      <div class="dashboard-triage-assignee dashboard-triage-cell" data-label="Assignment">${assignmentControl(row)}</div>
      ${triageActionButtons(row)}
    </article>`;
  }).join('');
  return `<div class="dashboard-triage-queue">
    <div class="dashboard-triage-header"><span>Filing</span><span>Status</span><span>Deadline</span><span>Contacts</span><span>Assignment</span><span>Actions</span></div>
    ${body || '<div class="dashboard-empty-inline">No filings match these filters.</div>'}
  </div>`;
}

function renderFamilyDashboard(projectedWards) {
  const filtered = getFilteredSortedWards(projectedWards).filter(row => !row.isArchived);
  const activeWardId = getGuardianData().activeWardId;
  const featured = filtered.find(row => row.wardId === activeWardId)
    || filtered.slice().sort(compareDashboardPriority)[0];
  const list = filtered.map(row => {
    const priority = dashboardPriority(row);
    const nextAction = priorityBadgeHTML(row, true) || `<span class="dashboard-family-progress">${row.progressPercent}% complete</span>`;
    return `<button type="button" class="dashboard-family-row dashboard-priority-${priority}" data-dashboard-priority="${priority}" data-dashboard-action="open-ward" data-ward-id="${esc(row.wardId)}">
    <span class="dashboard-family-icon">${typeIcon(row.inventoryType, 17)}</span>
    <span class="dashboard-family-info"><strong>${esc(row.wardName || '(unnamed)')}</strong><small>${esc(row.displayType)}${row.caseNumber ? ` · ${esc(row.caseNumber)}` : ''}</small></span>
    <span class="dashboard-family-next">${nextAction}</span>
    <span class="btn btn-sm btn-outline-primary" aria-hidden="true">Open</span>
  </button>`;
  }).join('');
  return `${featured ? `<section class="dashboard-family-feature"><h2>Next filing to review</h2><div class="dashboard-grid dashboard-family-feature-grid">${wardCardHTML(featured)}</div></section>` : ''}
    <section class="dashboard-family-list"><h2>All active filings</h2>${list || '<div class="dashboard-empty-inline">No matching active filings.</div>'}</section>`;
}

function renderDashboardGrid() {
  const container = document.getElementById('dashboard-grid-container');
  if (!container) return;
  const allWards = getGuardianData().wards;
  if (!allWards.length) {
    container.innerHTML = `<div class="dashboard-empty">
      <div style="color:var(--ink-4);margin-bottom:.4rem;"><svg class="ic" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h9.6V19H3.4Z"/></svg></div>
      <p class="text-muted">No wards yet.</p>
      <button class="btn btn-primary btn-sm" data-dashboard-action="add-ward">+ Add Your First Ward</button>
    </div>`;
    return;
  }
  const projectedWards = projectWards(allWards);
  if (isTriageRole()) {
    let html = renderTriageQueue(projectedWards);
    const archived = projectedWards.filter(w => w.isArchived);
    if (archived.length) {
      html += `<div class="dashboard-section-divider"><button class="btn btn-sm btn-outline-secondary" data-dashboard-action="toggle-archived" aria-expanded="${_archivedSectionOpen}">${_archivedSectionOpen ? '▾' : '▸'} Archived / Closed Wards (${archived.length})</button></div>`;
      if (_archivedSectionOpen) html += `<div class="dashboard-grid dashboard-grid-archived">${archived.map(wardCardHTML).join('')}</div>`;
    }
    container.innerHTML = html;
    return;
  }
  if (_dashboardPreferences.role === 'family') {
    let html = renderFamilyDashboard(projectedWards);
    const archived = projectedWards.filter(w => w.isArchived);
    if (archived.length) {
      html += `<div class="dashboard-section-divider"><button class="btn btn-sm btn-outline-secondary" data-dashboard-action="toggle-archived" aria-expanded="${_archivedSectionOpen}">${_archivedSectionOpen ? '▾' : '▸'} Archived / Closed Wards (${archived.length})</button></div>`;
      if (_archivedSectionOpen) html += `<div class="dashboard-grid dashboard-grid-archived">${archived.map(wardCardHTML).join('')}</div>`;
    }
    container.innerHTML = html;
    return;
  }
  const filtered = getFilteredSortedWards(projectedWards);
  const active = filtered.filter(w => !w.isArchived);
  const archived = filtered.filter(w => w.isArchived);
  const totalArchivedCount = projectedWards.filter(w => w.isArchived).length;

  let html = _dashboardGroupMode === 'type'
    ? renderGroupedWardSections(active)
    : _dashboardGroupMode === 'case'
      ? renderCaseWardSections(active)
      : `<div class="dashboard-grid">${active.map(wardCardHTML).join('') || '<div class="dashboard-empty-inline">No matching active wards.</div>'}</div>`;

  if (totalArchivedCount > 0) {
    html += `<div class="dashboard-section-divider">
      <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="toggle-archived" aria-expanded="${_archivedSectionOpen}" aria-controls="archived-wards-grid">${_archivedSectionOpen ? '▾' : '▸'} Archived / Closed Wards (${totalArchivedCount})</button>
    </div>`;
    if (_archivedSectionOpen) {
      html += `<div class="dashboard-grid dashboard-grid-archived" id="archived-wards-grid">${archived.map(wardCardHTML).join('') || '<div class="dashboard-empty-inline">No matching archived wards.</div>'}</div>`;
    }
  }
  container.innerHTML = html;
}

async function quickExportPdf(wardId) {
  await switchWard(wardId);
  navigate('/print');
}

async function exportSingleWardZip(wardId) {
  const guardianData = getGuardianData();
  const ward = guardianData.wards.find(w => w.wardId === wardId);
  if (!ward) return;
  try {
    if (ward.wardId === guardianData.activeWardId) await flushPendingSave();
    const blob = await window.buildWardZipBlob(wardId);
    const stem = (ward.wardName || 'ward').trim().replace(/\s+/g, '_') || 'ward';
    await saveBlobAs(blob, `${stem}_backup.sav`);
    auditLog('DATA_EXPORT', `Exported single ward "${ward.wardName}" to archive`, true);
    alert(`Backup saved for ${ward.wardName || 'this ward'}.`);
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    console.error('single ward export failed', e);
    auditLog('DATA_EXPORT', String(e && e.message || e), false);
    alert('Export failed: ' + (e && e.message || e));
  }
}

async function toggleDashboardWardArchived(wardId) {
  const guardianData = getGuardianData();
  const ward = guardianData.wards.find(w => w.wardId === wardId);
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
  const ward = getGuardianData().wards.find(item => item.wardId === wardId);
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
  markDirtySinceExport();
  updateLastSavedIndicator();
  renderDashboardPage();
}

function dashboardActionElement(target) {
  return target instanceof Element ? target.closest('[data-dashboard-action]') : null;
}

function handleDashboardClick(event) {
  const actionElement = dashboardActionElement(event.target);
  if (!actionElement || !_dashboardContainer?.contains(actionElement)) return;
  const wardId = actionElement.dataset.wardId;
  switch (actionElement.dataset.dashboardAction) {
    case 'add-ward': showAddWardModal(); break;
    case 'archive': toggleDashboardWardArchived(wardId); break;
    case 'backup': exportSingleWardZip(wardId); break;
    case 'close-ward':
      if (window.unloadWard) {
        window.unloadWard().then(() => renderDashboardPage());
      }
      break;
    case 'delete': confirmDeleteWard(wardId); break;
    case 'dismiss-continue': document.getElementById('continue-prompt-container')?.replaceChildren(); break;
    case 'dismiss-onboarding':
      _dashboardPreferences = saveDashboardPreferences({ ..._dashboardPreferences, onboardingDismissed: true });
      renderDashboardPage();
      break;
    case 'group': toggleDashboardGrouping(); break;
    case 'new-year': showStartNewYearModal(wardId); break;
    case 'open-ward': switchWard(wardId); break;
    case 'pdf': quickExportPdf(wardId); break;
    case 'prior-years': showPriorYearsModal(wardId); break;
    case 'select-existing': showConvertWardModal(); break;
    case 'set-role':
      setDashboardRole(actionElement.dataset.role);
      break;
    case 'toggle-archived': toggleArchivedSection(); break;
    case 'toggle-section': toggleDashboardSection(actionElement.dataset.sectionKey); break;
    case 'worklist-tab': setDashboardWorklistTab(actionElement.dataset.tab); break;
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
  else if (target.id === 'dashboard-sort') setDashboardSort(target.value);
  else if (target.id === 'dashboard-role') setDashboardRole(target.value);
  else if (target.id === 'dashboard-status-filter') { _dashboardStatusFilter = target.value; renderDashboardGrid(); }
  else if (target.id === 'dashboard-deadline-filter') { _dashboardDeadlineFilter = target.value; renderDashboardGrid(); }
  else if (target.id === 'dashboard-contact-filter') { _dashboardContactFilter = target.value; renderDashboardGrid(); }
  else if (target.id === 'dashboard-assignment-filter') {
    _dashboardAssignmentFilter = target.value;
    if (_dashboardPreferences.role === 'assistant') {
      _dashboardPreferences = saveDashboardPreferences({
        ..._dashboardPreferences,
        supervisingProfessionalFilter: target.value === 'all' ? null : target.value,
      });
    }
    renderDashboardGrid();
  } else if (target.id === 'dashboard-triage-sort') { _dashboardTriageSort = target.value; renderDashboardGrid(); }
}

function setDashboardRole(role) {
  if (!['family', 'professional', 'assistant'].includes(role)) return;
  _dashboardPreferences = saveDashboardPreferences({ ..._dashboardPreferences, role, onboardingDismissed: true });
  _dashboardAssignmentFilter = role === 'assistant'
    ? (_dashboardPreferences.supervisingProfessionalFilter || 'all')
    : 'all';
  renderDashboardPage();
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
    ${onboardingHTML()}
    <div class="dashboard-toolbar">${dashboardToolbarHTML()}</div>
    <div id="dashboard-summary-strip-container"></div>
    <div class="dashboard-top-row single-col" id="dashboard-top-row">
      <div id="dashboard-worklist-container"></div>
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
  _dashboardAssignmentFilter = _dashboardPreferences.role === 'assistant'
    ? (_dashboardPreferences.supervisingProfessionalFilter || 'all')
    : 'all';
  renderDashboardPage();
}

export function dispose(container) {
  if (_dashboardContainer) unbindDashboardEvents(_dashboardContainer);
  container.innerHTML = '';
  // Reset session-only state on page change
  _dashboardSearch = '';
  _dashboardSort = 'lastModified';
  _archivedSectionOpen = false;
  _dashboardGroupMode = 'type';
  _dashboardExpandedSections.clear();
  _dashboardWorklistTab = null;
  _dashboardStatusFilter = 'all';
  _dashboardDeadlineFilter = 'all';
  _dashboardContactFilter = 'all';
  _dashboardAssignmentFilter = 'all';
  _dashboardTriageSort = 'priority';
  _dashboardHost = null;
}

// Optional nav rendering — this feature doesn't have custom nav per the
// ward-switch architecture (nav is always the shared topnav from legacy-app.js)
export async function mountNav(container) {
  // No-op: dashboard has no feature-specific nav
}
