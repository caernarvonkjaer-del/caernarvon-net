// Dashboard -- Milestone 9 dashboard rendering extraction (ward card grid,
// summary strip, deadline/recent worklist, grouping by type/case/flat,
// search/sort/archive toggles). Dynamically imported by legacy-app.js's
// mountDashboardFeature() bridge, using the same window.createFeatureBridge()
// pattern as Guardian, Simplified, Plan, and Annual features.
const {
  esc, ic, navigate, getGuardianData, isContinuePromptShown, markContinuePromptShown,
  getRecentlyOpenedWards, saveWardToState, flushPendingSave, markDirtySinceExport, updateLastSavedIndicator,
  saveBlobAs, auditLog, encryptJSON, loadAppState, saveAppState,
  getWardHeadlineTotal, getWardProgress, typeIcon, INVENTORY_TYPE_META, formatDashboardCurrency,
  switchWard, showStartNewYearModal, toggleWardArchived, confirmDeleteWard,
  showConvertWardModal, showAddWardModal, fmtDateCard, formatRelativeTime,
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

// TOGGLE FUNCTIONS - bridged to window for inline onclick handlers in pageDashboard()
// These replace the raw variable-assignment pattern (_dashboardSort=this.value;)
// that won't work when these are module-private.

window.setDashboardSearch = function(value) {
  _dashboardSearch = value;
  renderDashboardGrid();
};

window.setDashboardSort = function(value) {
  _dashboardSort = value;
  renderDashboardGrid();
};

function toggleDashboardSection(key) {
  if (_dashboardExpandedSections.has(key)) _dashboardExpandedSections.delete(key);
  else _dashboardExpandedSections.add(key);
  renderDashboardGrid();
}
window.toggleDashboardSection = toggleDashboardSection;

window.setDashboardWorklistTab = function(tab) {
  _dashboardWorklistTab = tab;
  renderDashboardWorklist();
};

window.toggleDashboardGrouping = function() {
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
};

window.toggleArchivedSection = function() {
  _archivedSectionOpen = !_archivedSectionOpen;
  renderDashboardGrid();
};

// END BRIDGE FUNCTIONS

// One deadline rule per inventory type, derived from a date field the
// guardian has already entered on that ward — never a separate "due date"
// input, so there's nothing extra to keep in sync. Each offset matches the
// statute cited in that type's own in-app help content. Returns dueDate:null
// when the underlying date field is still blank, so nothing is shown until
// there's real data to compute from.
function getWardDeadline(ward) {
  const addDays = (dateStr, days) => {
    if (!dateStr) return null;
    const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + days);
    return d;
  };
  switch (formEngine(ward.inventoryType)) {
    case 'guardian':
      return { dueDate: addDays(ward.gid, 60), basis: '60 days after the Guardianship Inception Date (F.S. 744.365)' };
    case 'simplified':
    case 'annual':
      return { dueDate: addDays(ward.periodTo, 90), basis: '90 days after the end of the accounting period (F.S. 744.367)' };
    case 'planInitial':
      return { dueDate: addDays(ward.lettersSignedDate, 60), basis: '60 days after the Letters of Guardianship were signed (F.S. 744.632)' };
    case 'planAnnual':
    case 'planSimplified':
    case 'planMinor':
      return { dueDate: addDays(ward.periodTo, 90), basis: '90 days after the end of the reporting period (F.S. 744.367)' };
    default:
      return { dueDate: null, basis: '' };
  }
}

// Small badge shown on a ward card: overdue (red), due within two weeks
// (amber), or a plain future date (muted) — closed/archived cases never show
// one, since a deadline on a case that's already done is just noise.
function formatDeadlineBadge(ward) {
  if (ward.archived) return '';
  const { dueDate, basis } = getWardDeadline(ward);
  if (!dueDate) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDate - today) / 86400000);
  let cls, text;
  if (diffDays < 0) { cls = 'deadline-overdue'; text = `${ic('alert', 12)} ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`; }
  else if (diffDays === 0) { cls = 'deadline-soon'; text = `${ic('alert', 12)} Due today`; }
  else if (diffDays <= 14) { cls = 'deadline-soon'; text = `${ic('alert', 12)} Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`; }
  else { cls = 'deadline-ok'; text = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; }
  return `<div class="ward-card-deadline ${cls}" title="${esc(basis)}">${text}</div>`;
}

function wardCardHTML(ward) {
  const headline = getWardHeadlineTotal(ward);
  const meta = INVENTORY_TYPE_META[ward.inventoryType] || { iconName: 'folder', accent: '#525d6e', accentText: 'var(--ink-3)', totalLabel: 'Total' };
  const typeLabel = INVENTORY_TYPES[ward.inventoryType]?.label || ward.inventoryType;
  const lastMod = ward.lastModified ? formatRelativeTime(new Date(ward.lastModified).getTime()) : 'never saved';
  const guardianData = getGuardianData();
  const isActive = ward.wardId === guardianData.activeWardId;
  const hasPeriod = ward.inventoryType !== 'guardian' && (ward.periodFrom || ward.periodTo);
  const hasGid = ward.inventoryType === 'guardian' && ward.gid;
  const periodHTML = hasPeriod ? `<div class="ward-card-period">FY ${esc(fmtDateCard(ward.periodFrom) || '?')} – ${esc(fmtDateCard(ward.periodTo) || '?')}</div>`
    : hasGid ? `<div class="ward-card-period">GID: ${esc(fmtDateCard(ward.gid) || '?')}</div>` : '';
  // A Plan holds no money, so a dollar headline would be meaningless (and a
  // bare "—" under a "Total" label reads as a real, zero figure). Show how
  // much of the filing is done instead.
  const isFinancial = meta.financial !== false;
  const prog = isFinancial ? null : getWardProgress(ward);
  const headlineHTML = isFinancial
    ? `<div class="ward-card-total-label">${esc(meta.totalLabel)}</div>
       <div class="ward-card-total">${formatDashboardCurrency(headline)}</div>`
    : `<div class="ward-card-total-label">${esc(meta.totalLabel)}</div>
       <div class="ward-card-total">${prog ? prog.pct : 0}<span style="font-size:1rem;font-weight:600;">%</span></div>
       ${prog ? `<div class="ward-card-modified">${prog.complete} of ${prog.total} sections complete</div>` : ''}`;
  return `<div class="ward-card${isActive ? ' ward-card-active' : ''}${ward.archived ? ' ward-card-archived' : ''}" style="--card-accent:${meta.accent}">
    <div class="ward-card-header">
      <span class="ward-card-icon">${typeIcon(ward.inventoryType, 20)}</span>
      <div class="ward-card-title">
        <div class="ward-card-name">${esc(ward.wardName || '(unnamed)')}</div>
        <div class="ward-card-type">${esc(typeLabel)}</div>
        ${periodHTML}
        ${formatDeadlineBadge(ward)}
      </div>
      ${isActive ? '<span class="badge bg-primary ward-card-badge">Active</span>' : ward.archived ? '<span class="badge bg-secondary ward-card-badge">Closed</span>' : ''}
    </div>
    <div class="ward-card-body">
      ${headlineHTML}
      <div class="ward-card-modified">Last modified: ${esc(lastMod)}</div>
      ${(ward.years && ward.years.length) ? `<button type="button" class="btn btn-link ward-card-prior-years-link" onclick="showPriorYearsModal('${ward.wardId}')">${ward.years.length} prior year${ward.years.length === 1 ? '' : 's'} ▸</button>` : ''}
    </div>
    <div class="ward-card-quick-actions">
      <button class="btn btn-sm btn-outline-secondary" title="Save an encrypted backup of just this ward" onclick="window.exportSingleWardZip('${ward.wardId}')"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.6v10.8"/><path d="m8.2 10.8 3.8 3.8 3.8-3.8"/><path d="M4.4 19.9h15.2"/></svg> Backup</button>
      <button class="btn btn-sm btn-outline-secondary" title="Open Print Preview to export a PDF" onclick="window.quickExportPdf('${ward.wardId}')"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/></svg> PDF</button>
      <button class="btn btn-sm btn-outline-secondary" title="Archive this year and open a new one" onclick="showStartNewYearModal('${ward.wardId}')"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 5.6v12.8M5.6 12h12.8"/></svg> New Year</button>
      <button class="btn btn-sm btn-outline-secondary" title="${ward.archived ? 'Move back to active caseload' : 'Mark this case as closed'}" onclick="window.toggleWardArchived('${ward.wardId}')" aria-pressed="${!!ward.archived}">${ward.archived ? ic('undo', 14) + ' Restore' : ic('archive', 14) + ' Archive'}</button>
      <button class="btn btn-sm btn-outline-danger" title="Permanently delete this form" onclick="confirmDeleteWard('${ward.wardId}')"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.5 6.8h15"/><path d="M9.3 6.8V4.4h5.4v2.4"/><path d="M6.6 6.8 7.7 20h8.6l1.1-13.2"/></svg> Delete</button>
    </div>
    <div class="ward-card-footer">
      <button class="btn btn-sm btn-primary w-100" onclick="switchWard('${ward.wardId}')">${isActive ? 'Continue Editing →' : 'Open Ward →'}</button>
    </div>
  </div>`;
}

function renderDashboardSummary() {
  const container = document.getElementById('dashboard-summary-strip-container');
  if (!container) return;
  const guardianData = getGuardianData();
  const activeWards = guardianData.wards.filter(w => !w.archived);
  const combinedTotal = activeWards.reduce((s, w) => s + (getWardHeadlineTotal(w) || 0), 0);
  const typeCounts = activeWards.reduce((acc, w) => { acc[w.inventoryType] = (acc[w.inventoryType] || 0) + 1; return acc; }, {});
  const typeChipsStr = Object.keys(typeCounts).map(t => {
    const label = INVENTORY_TYPES[t]?.name || t;
    return `<span class="dashboard-type-chip" title="${esc(label)}">${typeIcon(t, 13)}<span>${typeCounts[t]}</span></span>`;
  }).join('');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueSoonCount = activeWards.filter(w => {
    const { dueDate } = getWardDeadline(w);
    if (!dueDate) return false;
    return Math.round((dueDate - today) / 86400000) <= 14;
  }).length;
  const dueSoonHTML = dueSoonCount > 0
    ? `<div class="dashboard-stat"><div class="dashboard-stat-num" style="color:var(--warn-text);">${dueSoonCount}</div><div class="dashboard-stat-label">Due Within 14 Days</div></div>`
    : '';
  container.innerHTML = `<div class="dashboard-summary-strip">
    <div class="dashboard-stat"><div class="dashboard-stat-num">${activeWards.length}</div><div class="dashboard-stat-label">Active Wards</div></div>
    <div class="dashboard-stat"><div class="dashboard-stat-num">${formatDashboardCurrency(activeWards.length ? combinedTotal : null)}</div><div class="dashboard-stat-label">Combined Total</div></div>
    ${dueSoonHTML}
    <div class="dashboard-stat dashboard-stat-wide"><div class="dashboard-type-chips">${typeChipsStr || '—'}</div><div class="dashboard-stat-label">By Inventory Type</div></div>
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
      <button type="button" class="continue-prompt-btn" onclick="switchWard('${last.wardId}')">Open</button>
      <button type="button" class="continue-prompt-dismiss" onclick="document.getElementById('continue-prompt-container').innerHTML=''" aria-label="Dismiss">&times;</button>
    </div>
  </div>`;
}

function getDashboardDeadlineRows() {
  const guardianData = getGuardianData();
  return guardianData.wards
    .filter(w => !w.archived)
    .map(w => ({ ward: w, ...getWardDeadline(w) }))
    .filter(r => r.dueDate)
    .sort((a, b) => a.dueDate - b.dueDate);
}

function renderDashboardWorklist() {
  const container = document.getElementById('dashboard-worklist-container');
  if (!container) return;
  const topRow = document.getElementById('dashboard-top-row');
  const deadlineRows = getDashboardDeadlineRows();
  const recentRows = getRecentlyOpenedWards();
  if (!deadlineRows.length && !recentRows.length) {
    container.innerHTML = '';
    if (topRow) topRow.classList.add('single-col');
    return;
  }
  if (topRow) topRow.classList.remove('single-col');
  const tab = _dashboardWorklistTab || (deadlineRows.length ? 'deadlines' : 'recent');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const SHOWN = 8;
  const guardianData = getGuardianData();

  const deadlineRowHTML = (r) => {
    const diffDays = Math.round((r.dueDate - today) / 86400000);
    const typeLabel = INVENTORY_TYPES[r.ward.inventoryType]?.name || r.ward.inventoryType;
    let cls, text;
    if (diffDays < 0) { cls = 'deadline-overdue'; text = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`; }
    else if (diffDays === 0) { cls = 'deadline-soon'; text = 'Due today'; }
    else if (diffDays <= 14) { cls = 'deadline-soon'; text = `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`; }
    else { cls = 'deadline-ok'; text = `Due ${r.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; }
    return `<button type="button" class="dashboard-deadline-row" onclick="switchWard('${r.ward.wardId}')" title="${esc(r.basis)}">
      <span class="dashboard-deadline-icon">${typeIcon(r.ward.inventoryType, 16)}</span>
      <span class="dashboard-deadline-name">${esc(r.ward.wardName || '(unnamed)')}<span class="dashboard-deadline-type">${esc(typeLabel)}</span></span>
      <span class="ward-card-deadline ${cls}">${text}</span>
    </button>`;
  };
  const recentRowHTML = (r) => {
    const isActive = r.wardId === guardianData.activeWardId;
    const typeLabel = INVENTORY_TYPES[r.inventoryType]?.name || r.inventoryType;
    return `<button type="button" class="recent-ward-item${isActive ? ' recent-active' : ''}" onclick="switchWard('${r.wardId}')">
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

  const tabBtn = (key, label, count) => `<button type="button" class="dashboard-worklist-tab${tab === key ? ' active' : ''}" onclick="setDashboardWorklistTab('${key}')">${esc(label)}${count ? ` <span class="dashboard-worklist-tab-count">${count}</span>` : ''}</button>`;

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
    const subtotal = g.wards.reduce((s, w) => s + (getWardHeadlineTotal(w) || 0), 0);
    const subtotalHTML = meta.financial === false ? ''
      : `<span class="dashboard-type-header-subtotal" style="color:${meta.accentText}">${formatDashboardCurrency(subtotal)}</span>`;
    const key = `type:${g.type || 'other'}`;
    const isOpen = _dashboardExpandedSections.has(key);
    return `<div class="dashboard-type-section${isOpen ? '' : ' is-collapsed'}">
      <button type="button" class="dashboard-type-header" style="border-left-color:${meta.accent}" onclick="toggleDashboardSection('${key}')" aria-expanded="${isOpen}">
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
    // g.mapKey is user-typed case number text (or a safe internal wardId
    // fallback) — escape quotes/backslashes so it can't break out of the
    // inline onclick string.
    const jsKey = sectionKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `<div class="dashboard-type-section${isOpen ? '' : ' is-collapsed'}">
      <button type="button" class="dashboard-type-header" style="border-left-color:var(--accent)" onclick="toggleDashboardSection('${jsKey}')" aria-expanded="${isOpen}">
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
    list = list.slice().sort((a, b) => (getWardHeadlineTotal(b) || 0) - (getWardHeadlineTotal(a) || 0));
  } else {
    list = list.slice().sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
  }
  return list;
}

function renderDashboardGrid() {
  const container = document.getElementById('dashboard-grid-container');
  if (!container) return;
  const allWards = getGuardianData().wards;
  if (!allWards.length) {
    container.innerHTML = `<div class="dashboard-empty">
      <div style="color:var(--ink-4);margin-bottom:.4rem;"><svg class="ic" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h9.6V19H3.4Z"/></svg></div>
      <p class="text-muted">No wards yet.</p>
      <button class="btn btn-primary btn-sm" onclick="showAddWardModal()">+ Add Your First Ward</button>
    </div>`;
    return;
  }
  const filtered = getFilteredSortedWards(allWards);
  const active = filtered.filter(w => !w.archived);
  const archived = filtered.filter(w => w.archived);
  const totalArchivedCount = allWards.filter(w => w.archived).length;

  let html = _dashboardGroupMode === 'type'
    ? renderGroupedWardSections(active)
    : _dashboardGroupMode === 'case'
      ? renderCaseWardSections(active)
      : `<div class="dashboard-grid">${active.map(wardCardHTML).join('') || '<div class="dashboard-empty-inline">No matching active wards.</div>'}</div>`;

  if (totalArchivedCount > 0) {
    html += `<div class="dashboard-section-divider">
      <button class="btn btn-sm btn-outline-secondary" onclick="toggleArchivedSection()" aria-expanded="${_archivedSectionOpen}" aria-controls="archived-wards-grid">${_archivedSectionOpen ? '▾' : '▸'} Archived / Closed Wards (${totalArchivedCount})</button>
    </div>`;
    if (_archivedSectionOpen) {
      html += `<div class="dashboard-grid dashboard-grid-archived" id="archived-wards-grid">${archived.map(wardCardHTML).join('') || '<div class="dashboard-empty-inline">No matching archived wards.</div>'}</div>`;
    }
  }
  container.innerHTML = html;
}

window.quickExportPdf = async function(wardId) {
  await switchWard(wardId);
  navigate('/print');
};

window.exportSingleWardZip = async function(wardId) {
  const guardianData = getGuardianData();
  const ward = guardianData.wards.find(w => w.wardId === wardId);
  if (!ward) return;
  try {
    if (typeof JSZip === 'undefined') { alert('ZIP library failed to load — cannot export.'); return; }
    if (ward.wardId === guardianData.activeWardId) await flushPendingSave();
    const salt = await loadAppState('cryptoSalt');
    const zip = new JSZip();
    const file = `wards/${ward.wardId}.enc`;
    zip.file(file, await encryptJSON(ward));
    zip.file('manifest.json', JSON.stringify({
      format: 'probate-guardian-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      salt,
      guardian: await encryptJSON({ guardianName: guardianData.guardianName, guardianEmail: guardianData.guardianEmail }),
      wards: [{ wardId: ward.wardId, file }]
    }, null, 2));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
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
};

window.toggleWardArchived = async function(wardId) {
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
};

function pageDashboard() {
  return `<div class="schedule-page">
    <div id="continue-prompt-container"></div>
    <h1>All Wards — Dashboard</h1>
    <div class="dashboard-toolbar">
      <span class="dashboard-search-wrap">${ic('search', 15)}<input type="text" id="dashboard-search" class="form-control form-control-sm dashboard-search-input" placeholder="Search wards by name…" aria-label="Search wards by name" value="${esc(_dashboardSearch)}" oninput="setDashboardSearch(this.value)"></span>
      <select id="dashboard-sort" class="form-select form-select-sm dashboard-sort-select" aria-label="Sort wards by" onchange="setDashboardSort(this.value)">
        <option value="lastModified"${_dashboardSort === 'lastModified' ? ' selected' : ''}>Sort: Last Modified</option>
        <option value="name"${_dashboardSort === 'name' ? ' selected' : ''}>Sort: Name (A–Z)</option>
        <option value="total"${_dashboardSort === 'total' ? ' selected' : ''}>Sort: Total (High–Low)</option>
      </select>
      <button id="dashboard-group-toggle" class="btn btn-sm ${_dashboardGroupMode === 'flat' ? 'btn-outline-secondary' : 'btn-secondary'}" onclick="toggleDashboardGrouping()" aria-pressed="${_dashboardGroupMode !== 'flat'}" title="Cycle between grouping wards by type, by case number, and a flat grid">${dashboardGroupLabel(_dashboardGroupMode)}</button>
    </div>
    <div id="dashboard-summary-strip-container"></div>
    <div class="dashboard-top-row" id="dashboard-top-row">
      <div id="dashboard-worklist-container"></div>
      <div class="inventory-convert-banner" onclick="showConvertWardModal()" role="button" tabindex="0" aria-label="Select an existing ward to create a new form for" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showConvertWardModal();}">
        <span class="inventory-convert-icon"><svg class="ic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.4 8.6h13.2"/><path d="m14.4 5.4 3.2 3.2-3.2 3.2"/><path d="M19.6 15.4H6.4"/><path d="m9.6 12.2-3.2 3.2 3.2 3.2"/></svg></span>
        <div class="inventory-convert-text">
          <div class="inventory-convert-title">Select an Existing Ward</div>
          <div class="inventory-convert-desc">Select any ward below to create a new form of a different inventory type — e.g. Initial Inventory → Annual Accounting — and carry its data over instead of starting from scratch.</div>
        </div>
        <span class="btn btn-outline-primary btn-sm" aria-hidden="true">Select Ward</span>
      </div>
    </div>
    <div id="dashboard-grid-container"></div>
  </div>`;
}

// Feature bridge contract: mount(container, page) and dispose(container)
// Expected by window.createFeatureBridge() and called via
// legacy-app.js's mountDashboardFeature().
export async function mount(container, page) {
  container.innerHTML = pageDashboard();
  showContinuePromptIfNeeded();
  renderDashboardSummary();
  renderDashboardWorklist();
  renderDashboardGrid();
}

export function dispose(container) {
  container.innerHTML = '';
  // Reset session-only state on page change
  _dashboardSearch = '';
  _dashboardSort = 'lastModified';
  _archivedSectionOpen = false;
  _dashboardGroupMode = 'type';
  _dashboardExpandedSections.clear();
  _dashboardWorklistTab = null;
}

// Optional nav rendering — this feature doesn't have custom nav per the
// ward-switch architecture (nav is always the shared topnav from legacy-app.js)
export async function mountNav(container) {
  // No-op: dashboard has no feature-specific nav
}
