// Dashboard -- Milestone 9 dashboard rendering extraction (ward card grid,
// summary strip, deadline/recent worklist, grouping by type/case/flat,
// search/sort/archive toggles). Dynamically imported by legacy-app.js's
// mountDashboardFeature() bridge, using the same window.createFeatureBridge()
// pattern as Guardian, Simplified, Plan, and Annual features.
import { compareDashboardColumn, compareDashboardPriority, getDashboardMetrics, normalizeDashboardWorkflow, projectDashboardWard } from './view-model.js';
import { caseNumberOf } from '../../core/case-resolver.js';

const {
  esc, ic, navigate, getCaseFile, isContinuePromptShown, markContinuePromptShown,
  getRecentlyOpenedWards, saveWardToState, flushPendingSave, markDirtySinceExport, updateLastSavedIndicator,
  saveBlobAs, auditLog, saveAppState,
  getWardHeadlineTotal, getWardProgress, typeIcon,
  switchWard, showStartNewYearModal, confirmDeleteWard, showRenameWardModal,
  showConvertWardModal, showAddWardModal, showPriorYearsModal, formatRelativeTime,
  INVENTORY_TYPES, formEngine,
} = window;

// Dashboard's own module state -- all session-only, not persisted, reset on reload.
// These would be window properties if the dashboard stayed monolithic, but now that
// they're module-private via closure, they live entirely here.
let _dashboardSearch = '';
let _closedSectionOpen = false;
let _dashboardContainer = null;
let _dashboardHost = null;
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
  return `${search}${actions}`;
}

function dashboardHeaderHTML() {
  const wards = getCaseFile().wards;
  const activeWardId = getCaseFile().activeWardId;
  const activeWard = wards.find(w => w.wardId === activeWardId);
  // Milestone 36-1 moved Close, Rename and Delete here from the sidebar. Close
  // and Delete then moved on again into the row's own Actions cell, where they
  // sit beside Open on the filing they act on. Rename stays: it is the one of
  // the three that only ever applies to whichever filing is currently open.
  const activeWardControls = activeWard ? `
    <button type="button" class="btn btn-sm btn-outline-secondary dashboard-rename-ward" id="rename-ward-btn" data-dashboard-action="rename-ward" title="Rename active filing">${ic('pencil', 14)} Rename</button>
  ` : '';
  const newFormBtn = `<button type="button" class="btn btn-sm btn-outline-primary dashboard-new-form" id="new-ward-btn" data-dashboard-action="add-ward">${ic('plus', 14)} New Form</button>`;
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

function toggleClosedSection() {
  _closedSectionOpen = !_closedSectionOpen;
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
  // Close acts on the open filing, so it belongs to that filing's own row
  // rather than to the page. Every other row reserves the column, for the
  // same alignment reason as Prior years above.
  const close = row.wardId === getCaseFile().activeWardId
    ? `<button class="btn btn-sm btn-outline-secondary dashboard-close-ward" id="close-ward-btn" data-dashboard-action="close-ward" data-ward-id="${id}" title="Close this filing and release its lock">Close</button>`
    : '<span class="dashboard-action-empty" aria-hidden="true"></span>';
  return `<div class="dashboard-triage-actions dashboard-triage-cell" data-label="Actions">
    <button class="btn btn-sm btn-primary" data-dashboard-action="open-ward" data-ward-id="${id}">Open</button>
    ${close}
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="backup" data-ward-id="${id}">Backup</button>
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="pdf" data-ward-id="${id}">PDF</button>
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="new-year" data-ward-id="${id}">New year</button>
    ${priorYears}
    <button class="btn btn-sm btn-outline-secondary" data-dashboard-action="archive" data-ward-id="${id}" aria-pressed="${row.isArchived}" title="${row.isArchived ? 'Move this filing back to the active queue' : 'Move this filing to Closed Filings'}">${row.isArchived ? 'Reopen' : 'Mark Closed'}</button>
    <button class="btn btn-sm btn-outline-danger" data-dashboard-action="delete" data-ward-id="${id}">Delete</button>
  </div>`;
}

// Search and sort, applied the same way to whichever set of filings it is
// given, so the closed list responds to the search box like the active one.
function applyQueueQuery(rows) {
  const query = _dashboardSearch.trim().toLocaleLowerCase('en-US');
  let filtered = rows;
  if (query) {
    filtered = filtered.filter(row => [row.wardName, row.caseNumber, row.assigneeName, ...row.filingContacts.map(item => item.name)]
      .some(value => String(value || '').toLocaleLowerCase('en-US').includes(query)));
  }

  if (_dashboardTriageSort === 'priority') return filtered.slice().sort(compareDashboardPriority);
  if (_dashboardTriageSort === 'deadline') return filtered.slice().sort((a, b) => (a.deadlineDate?.getTime() ?? Infinity) - (b.deadlineDate?.getTime() ?? Infinity));
  return filtered.slice().sort((a, b) => compareDashboardColumn(a, b, _dashboardTriageSort.key, _dashboardTriageSort.direction));
}

function getTriageRows(rows) {
  return applyQueueQuery(rows.filter(row => !row.isArchived));
}

function getClosedRows(rows) {
  return applyQueueQuery(rows.filter(row => row.isArchived));
}

function formatContactRole(role) {
  if (!role) return '';
  if (role === 'preparer') return 'Preparer';
  if (role === 'attorney') return 'Attorney';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// One queue row. Shared by the active queue and the closed-filings queue so a
// filing looks and behaves the same in both -- the closed section used to draw
// ward cards from the retired family layout, which gave it a different set of
// actions and no columns.
function triageRowHTML(row) {
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
    <div class="dashboard-triage-cell dashboard-triage-status" data-label="Status">${workflowStatusControl(row)}</div>
    <div class="dashboard-triage-deadline dashboard-triage-cell" data-label="Deadline">${deadlineDisplay(row)}</div>
    <div class="dashboard-triage-contacts dashboard-triage-cell" data-label="Contacts">${contacts}</div>
    <div class="dashboard-triage-assignee dashboard-triage-cell" data-label="Judge">${assignmentControl(row)}</div>
    ${triageActionButtons(row)}
  </article>`;
}

// The column strip. The closed queue gets plain labels rather than a second set
// of sort buttons: the sort state is single and global, so a second set would
// claim to sort that list independently when it does not. It still needs the
// headings, though -- above the container query's breakpoint the rows carry no
// inline data-label prefixes.
function triageHeaderHTML(sortable = true) {
  const sortBtn = (key, label) => {
    if (!sortable) return `<span>${esc(label)}</span>`;
    const isSorted = _dashboardTriageSort.key === key;
    const dir = isSorted ? _dashboardTriageSort.direction : 'none';
    const ariaSort = isSorted ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
    const indicator = isSorted ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<button type="button" class="dashboard-sort-btn" data-dashboard-sort="${key}" aria-sort="${ariaSort}">${esc(label)}<span class="dashboard-sort-indicator" aria-hidden="true">${indicator}</span></button>`;
  };
  return `<div class="dashboard-triage-header">
    ${sortBtn('name', 'Ward')}
    ${sortBtn('type', 'Form Type')}
    ${sortBtn('case', 'Case #')}
    ${sortBtn('status', 'Status')}
    ${sortBtn('deadline', 'Deadline')}
    <span title="Filing contacts (unsortable)">Contacts</span>
    ${sortBtn('judge', 'Judge')}
    <span>Actions</span>
  </div>`;
}

function triageQueueHTML(rows, { sortable = true, emptyMessage = '', extraClass = '' } = {}) {
  const body = rows.map(triageRowHTML).join('');
  return `<div class="dashboard-triage-queue${extraClass ? ` ${extraClass}` : ''}">
    ${triageHeaderHTML(sortable)}
    ${body || `<div class="dashboard-empty-inline">${esc(emptyMessage)}</div>`}
  </div>`;
}

function renderTriageQueue(projectedWards) {
  return triageQueueHTML(getTriageRows(projectedWards), { emptyMessage: 'No filings match this search.' });
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
  // Active filings sit directly under the metric strip; closed ones collapse
  // into the disclosure at the foot of the page. It opens only when the reader
  // asks: _closedSectionOpen is session state seeded false and reset by
  // dispose(), so every arrival at the dashboard finds it shut.
  let html = renderTriageQueue(projectedWards);
  const closed = getClosedRows(projectedWards);
  if (closed.length) {
    html += `<div class="dashboard-closed-section">
      <button type="button" class="dashboard-closed-toggle" data-dashboard-action="toggle-closed" aria-expanded="${_closedSectionOpen}" aria-controls="dashboard-closed-queue">
        <span class="dashboard-closed-chevron" aria-hidden="true">${_closedSectionOpen ? '▾' : '▸'}</span>
        <span class="dashboard-closed-label">Closed Filings</span>
        <span class="dashboard-closed-count">${closed.length}</span>
      </button>
      <div id="dashboard-closed-queue"${_closedSectionOpen ? '' : ' hidden'}>
        ${triageQueueHTML(closed, { sortable: false, extraClass: 'dashboard-triage-queue-closed' })}
      </div>
    </div>`;
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
    case 'toggle-closed': toggleClosedSection(); break;
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
  _dashboardTriageSort = { key: 'priority', direction: 'asc' };
  renderDashboardPage();
}

export function dispose(container) {
  if (_dashboardContainer) unbindDashboardEvents(_dashboardContainer);
  container.innerHTML = '';
  // Reset session-only state on page change
  _dashboardSearch = '';
  _closedSectionOpen = false;
  _dashboardTriageSort = { key: 'priority', direction: 'asc' };
  _dashboardHost = null;
}

// Optional nav rendering — this feature doesn't have custom nav per the
// ward-switch architecture (nav is always the shared topnav from legacy-app.js)
export async function mountNav(container) {
  // No-op: dashboard has no feature-specific nav
}
