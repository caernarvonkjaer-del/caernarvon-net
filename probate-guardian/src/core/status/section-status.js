// Milestone 24: Section Status and Bounded Navigation Guidance Renderer

import { adaptValidationErrors } from '../validation/validation-adapter.js';
import { pageAlsoOwns } from './section-guidance-policy.js';

/**
 * Computes section-level status and local missing fields.
 */
export function computeSectionStatus(currentRoute, navChecks = null, rawErrors = []) {
  const errors = adaptValidationErrors(rawErrors);
  const routeKey = currentRoute.startsWith('/') ? currentRoute.slice(1) : currentRoute;
  const localErrors = errors.filter((e) => e.route === currentRoute || (currentRoute === '/' && e.route === '/'));

  let isComplete = false;
  if (navChecks && navChecks.checks) {
    const key = routeKey === '' ? 'cover' : routeKey;
    isComplete = !!navChecks.checks[key];
  } else {
    isComplete = localErrors.length === 0;
  }

  const status = isComplete ? 'complete' : localErrors.length > 0 ? 'blocked' : 'in-progress';
  return {
    status,
    isComplete,
    localErrors,
  };
}

/**
 * Renders every missing field near navigation buttons when Next is blocked.
 * The optional maxItems exists for callers with a deliberate compact mode;
 * normal section guidance must not hide work behind an aggregate count.
 */
export function renderLocalSectionGuidance(currentRoute, rawErrors = [], maxItems = Infinity, options = {}, filingType = 'guardian') {
  const structured = adaptValidationErrors(rawErrors, filingType);
  const localErrors = structured.filter(
    (e) => e.route === currentRoute || (currentRoute === '/' && (e.route === '/' || (e.section && e.section.toLowerCase().includes('cover'))))
  );

  // Milestone 63F. Two ways a page can owe the filer something its validator messages do not list here.
  // (1) A field rendered on two pages (Simplified's period dates: Cover and Part III) has one message filed
  //     under one of them: the other page claims it, and its jump link lands on THIS page's copy of the field.
  for (const e of structured) {
    if (e.route !== currentRoute && pageAlsoOwns(filingType, currentRoute).includes(e.path)) {
      localErrors.push({ ...e, route: currentRoute });
    }
  }
  // (2) A sidebar-only rule has no validator message at all: list what it still wants, unless a message
  //     already names that field. The caller supplies these only for a page the sidebar marks incomplete.
  if (options && Array.isArray(options.wants)) {
    const named = new Set(localErrors.map((e) => e.path));
    for (const w of options.wants) {
      if (!named.has(w.path)) localErrors.push({ route: currentRoute, path: w.path, label: w.label, message: w.label });
    }
  }

  if (localErrors.length === 0) {
    if (options && options.message) {
      return `<div class="section-local-guidance alert alert-warning py-2 px-3 mt-2 mb-0" role="status" style="font-size:0.85rem;">
    <div class="fw-bold mb-1"><svg class="ic me-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Required to continue:</div>
    <div class="ps-2 text-dark" style="font-size:0.85rem;">${options.message}</div>
  </div>`;
    }
    return '';
  }

  const visibleItems = localErrors.slice(0, maxItems);
  const remainingCount = localErrors.length - visibleItems.length;

  const itemsHtml = visibleItems.map((err) => {
    return `<li class="mb-1">
      <button
        type="button"
        class="btn btn-link btn-sm p-0 text-decoration-none text-start"
        style="font-size:0.85rem;color:var(--primary-color, #0d6efd);"
        data-form-action="jump-to-field"
        data-route="${err.route}"
        data-field-path="${err.path}"
      >
        👉 ${err.label || err.message}
      </button>
    </li>`;
  }).join('');

  const remainingHtml = remainingCount > 0
    ? `<li class="text-muted" style="font-size:0.8rem;list-style-type:none;"><em>...and ${remainingCount} more required item${remainingCount > 1 ? 's' : ''}</em></li>`
    : '';

  return `<div class="section-local-guidance alert alert-warning py-2 px-3 mt-2 mb-0" role="status" style="font-size:0.85rem;">
    <div class="fw-bold mb-1"><svg class="ic me-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Complete these items before continuing:</div>
    <ul class="mb-0 ps-3" style="margin-top:0.25rem;">
      ${itemsHtml}
      ${remainingHtml}
    </ul>
  </div>`;
}

if (typeof window !== 'undefined') {
  window.computeSectionStatus = computeSectionStatus;
  window.renderLocalSectionGuidance = renderLocalSectionGuidance;
}
