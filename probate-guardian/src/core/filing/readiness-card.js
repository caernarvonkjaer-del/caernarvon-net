// Milestone 38B / 44C: the one readiness card every Preview & Export page
// renders. Configuration comes from readiness-config.js; the title from
// county-guidance.js. Escapes all text, renders no inline handlers, and is
// never called from a PDF/Excel/print builder -- the card is `.no-print`.
//
// Disclosure state: pending automatic checks open the card; otherwise a
// fresh render is collapsed. A user's own toggle is remembered in module
// memory for rerenders of the same wardId + filingType only, and
// resetReadinessCardState() forgets it on filing/ward switch and on fresh
// Preview entry (the router calls it whenever navigation leaves /print).

import { getFilingReadiness } from './readiness-config.js';
import { getReadinessJurisdiction } from './county-guidance.js';

export const READINESS_CARD_ID = 'filing-readiness-card';
export const MANUAL_REVIEW_SUMMARY = 'Automated checks passed; manual review remains.';
export const ALL_CHECKS_PASS_SUMMARY = 'All configured checks pass.';

let remembered = null; // { key, open }
const boundContainers = new WeakSet();

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const SHIELD_ICON = '<svg class="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.2 20 6v6.1c0 4.6-3.3 7.5-8 8.7-4.7-1.2-8-4.1-8-8.7V6Z"/></svg>';

function stateKey(data, filingType) {
  return `${data?.wardId ?? ''}:${filingType ?? ''}`;
}

function jumpLink(row) {
  if (!row.route && !row.path) return '';
  return `<button type="button" class="validation-go" data-form-action="jump-to-field" data-route="${escapeHtml(row.route)}" data-jump-path="${escapeHtml(row.path)}">Go to field</button>`;
}

function automaticRow(row) {
  const ok = row.ok === true;
  return `<div class="readiness-row" data-readiness-id="${escapeHtml(row.id)}" data-readiness-class="automatic">
      <span class="readiness-mark ${ok ? 'ok' : 'pending'}" aria-hidden="true">${ok ? '✓' : '⚠'}</span>
      <span><span class="visually-hidden">${ok ? 'Passed: ' : 'Outstanding: '}</span>${escapeHtml(row.label)}${row.blocking === false ? ' <em>(does not block export)</em>' : ''}</span>
      ${jumpLink(row)}
    </div>`;
}

function manualRow(row) {
  return `<div class="readiness-row" data-readiness-id="${escapeHtml(row.id)}" data-readiness-class="manual"><span class="readiness-mark manual" aria-hidden="true">•</span><span>${escapeHtml(row.label)}</span></div>`;
}

function overviewRow(row) {
  const ok = row.ok === true;
  return `<div class="readiness-row" data-readiness-id="${escapeHtml(row.id)}" data-readiness-class="overview"><span class="readiness-mark ${ok ? 'ok' : 'pending'}" aria-hidden="true">${ok ? '&#10003;' : '&#9888;'}</span><span><span class="visually-hidden">${ok ? 'Passed: ' : 'Needs review: '}</span>${escapeHtml(row.label)}</span></div>`;
}

export function resetReadinessCardState() {
  remembered = null;
}

export function renderReadinessCard({ filingType, data, validationIssues = [], expanded } = {}) {
  const d = data || {};
  const type = filingType || d.inventoryType;
  const readiness = getFilingReadiness(type, d, validationIssues);
  const { title } = getReadinessJurisdiction(d.county);
  const pending = readiness.automatic.filter(row => row.ok !== true).length;
  const remaining = readiness.manual.length + readiness.unsupportedCount;
  const key = stateKey(d, type);

  let open;
  if (typeof expanded === 'boolean') open = expanded;
  else if (remembered && remembered.key === key) open = remembered.open;
  else open = pending > 0;

  const summary = pending
    ? `${pending} item${pending === 1 ? '' : 's'} outstanding`
    : (remaining ? MANUAL_REVIEW_SUMMARY : ALL_CHECKS_PASS_SUMMARY);

  const automaticRows = [...(readiness.details || []).map(overviewRow), ...readiness.automatic.map(automaticRow)].join('')
    || '<div class="readiness-row"><span class="readiness-mark ok" aria-hidden="true">✓</span><span>No automated issues found.</span></div>';

  return `<details id="${READINESS_CARD_ID}" class="validation-panel readiness-panel no-print" data-readiness-key="${escapeHtml(key)}" data-readiness-filing="${escapeHtml(type)}"${open ? ' open' : ''}>
    <summary class="validation-head">
      ${SHIELD_ICON}
      <div>
        <div class="validation-title">${escapeHtml(title)} — ${escapeHtml(summary)}</div>
        <div class="validation-sub">Mirrors what a reviewer looks for before this filing is accepted. Passing every check does not guarantee approval.</div>
      </div>
    </summary>
    <div class="validation-group">
      <div class="validation-group-head"><span class="validation-group-name">Checked from this filing</span></div>
      <div class="readiness-list">${automaticRows}</div>
    </div>
    ${readiness.manual.length ? `<div class="validation-group">
      <div class="validation-group-head"><span class="validation-group-name">Before you file — the app can't verify these</span></div>
      <div class="readiness-list">${readiness.manual.map(manualRow).join('')}</div>
    </div>` : ''}
  </details>`;
}

// `toggle` does not bubble, so the listener is registered in the capture
// phase on the container (document, by default) and fires for any card the
// page later renders into it. Bound once per container.
export function bindReadinessCard(container = (typeof document !== 'undefined' ? document : null)) {
  if (!container || typeof container.addEventListener !== 'function' || boundContainers.has(container)) return;
  boundContainers.add(container);
  container.addEventListener('toggle', (event) => {
    const el = event.target;
    if (!el || el.id !== READINESS_CARD_ID) return;
    remembered = { key: el.dataset?.readinessKey ?? '', open: !!el.open };
  }, true);
}
