// Application navigation: the URL hash, the current route, what happens before
// a page is left, and mounting each page -- the router's alone since Milestone
// 70's 70K (the monolith held the route, the hash handler and the per-feature
// mounts, and this module reached them through window).
//
// One navigation at a time owns the page. Each render takes a fresh
// AbortSignal and aborts the one before it, and every await on the way --
// leaving a filing for the dashboard, loading a feature, the feature's own
// mount -- is followed by a check: a navigation that has been superseded
// commits nothing more to the page. So an older, slower mount (a feature whose
// code is still downloading) can no longer be drawn over a newer route or over
// the filing opened since (Milestone 70's 70G recorded that race, and left it
// here).
//
// A navigation renders once. navigate() rendered the page and set the hash,
// and the hashchange that followed rendered it again (startup and opening a
// filing did the same); a hash change that names the page already shown is
// now ignored, so one is only acted on when it is the filer's -- the Back
// button, or a link.
import { getActiveInventoryType, getActiveWard, getCaseFile } from '../state.js';
import { FILING_ENGINE_IDS } from '../filing/filing-descriptor.js';
import { resetReadinessCardState } from '../filing/readiness-card.js';
import { saveLastPosition } from '../persistence/recovery-cache.js';
import { decorateTestSystemTitles } from '../ui/test-system-title.js';
import { ic } from '../ui/icons.js';
import { pruneBlankCards } from '../form/prune-cards.js';
import { FILING_PAGES, formEngine } from '../filing/filing-registry.js';
import { PAGES_GUARDIAN } from '../filing/models/guardian.js';
import { linkLabelsToInputs, setupAmountFieldValidation } from '../form/form-runtime.js';
import { commitPendingFieldValues } from '../form/form-contract.js';
import { resetNavSectionExpanded, updateNavDots } from '../status/nav-marks.js';
import { refreshWardInfoCard } from '../shell/sidebar.js';
import { initPrintPager } from '../ui/print-pager.js';
import { pagePartyManagement, renderClosedFilingSyncNotice, renderPartyManagementBody } from '../parties/party-management.js';
import { updateHelpContext } from '../help/help-panel.js';
import { pageInventorySelector } from '../shell/start-new-form.js';
import { loadAndRenderActivityLog, pageActivityLog } from '../activity/activity-log-view.js';
import { disposeActiveFeature } from '../feature-bridge.js';
import { features } from '../runtime/features.js';
import { enterDashboardEditingFocus } from './leave-filing.js';
import { getCurrentPage, provideNavigate, setCurrentPage } from './route-state.js';

export { getCurrentPage, setCurrentPage } from './route-state.js';
export { enterDashboardEditingFocus } from './leave-filing.js';

// Milestone 51B removed addBeforeNavigateHook(), addAfterNavigateHook() and
// registerRoute() from this module, along with the _routeHooks arrays and
// _customRoutes map they populated and the three dispatch sites that read them.
// Nothing outside router.spec.js ever registered a hook or a custom route, so
// the arrays were permanently empty and the map permanently unset -- the two
// `for (const hook of ...)` loops in navigate() and the _customRoutes branch in
// renderPage() could never execute. This app routes by a hash + a switch in
// renderPage(); if a genuine cross-cutting navigation concern turns up later,
// reintroduce the hook mechanism at that point with a real caller.

/** The pages valid whatever filing is open (or none). */
export const SPECIAL_PAGES = Object.freeze(['/dashboard', '/inventory-select', '/activity-log', '/party-management']);

const currentHash = () => window.location.hash.replace('#', '');

/** Point the URL at a route (the hash change that follows draws nothing twice). */
export function setRouteHash(route) {
  if (typeof window === 'undefined') return;
  if (currentHash() !== route) window.location.hash = route;
}

// The page a hash shows: one of the pages valid with any filing (or none),
// else one of the open filing's own pages -- an unknown one is its Cover.
function routeForHash(h) {
  if (SPECIAL_PAGES.includes(h)) return h;
  const wizardPages = FILING_PAGES[getActiveInventoryType()] || PAGES_GUARDIAN;
  return wizardPages.some((p) => p.id === h) ? h : '/';
}

let navController = null;

/** A fresh signal for the navigation starting now; the one before it is aborted. */
function beginNavigation() {
  navController?.abort();
  navController = new AbortController();
  return navController.signal;
}

export function toggleMobileSidebar() {
  if (typeof document === 'undefined') return;
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const open = !sidebar.classList.contains('mobile-open');
  sidebar.classList.toggle('mobile-open', open);
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.classList.toggle('active', open);
  const btn = document.getElementById('mobile-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', String(open));
}

export function closeMobileSidebar() {
  if (typeof document === 'undefined') return;
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.classList.remove('active');
  const btn = document.getElementById('mobile-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

export async function navigate(page, { updateHash = true } = {}) {
  const previousPage = getCurrentPage();
  if (page !== previousPage && typeof window !== 'undefined') {
    // Leaving a page forgets a hand-opened sidebar nav section, so the section
    // holding the new page expands itself.
    resetNavSectionExpanded();
    commitPendingFieldValues();
    // Milestone 44C: leaving Preview forgets the readiness card's hand
    // toggle, so the next entry recomputes its default; a same-route
    // rerender (renderPage('/print') after a blocked export) keeps it.
    if (page !== '/print') resetReadinessCardState();
    pruneBlankCards();
  }

  if (page === '/dashboard' && typeof window !== 'undefined') {
    if (!await enterDashboardEditingFocus()) return false;
  }

  setCurrentPage(page);
  if (updateHash) setRouteHash(page);

  await renderPage(page);
  closeMobileSidebar();

  return true;
}
provideNavigate(navigate);

export async function renderPage(page) {
  const signal = beginNavigation();
  // Milestone 38C: entering the dashboard ends editing focus -- commit pending
  // values, release the ward lock, close the filing. navigate() above already
  // does this, but a hash change arrives here directly, so arriving by hash or
  // by the browser Back button would skip it and leave the ward lock held --
  // which can block another tab from opening that ward at all. Doing it here
  // covers every route in. It returns at once when no filing is open and joins
  // a leave already under way, so navigate() is unaffected.
  if (page === '/dashboard' && typeof window !== 'undefined') {
    if (!await enterDashboardEditingFocus()) return;
    if (signal.aborted) return;
  }

  if (typeof document === 'undefined') return;
  saveLastPosition(page, getCaseFile().activeWardId);
  const el = document.getElementById('main-content');
  if (!el) return;

  disposeActiveFeature(el);

  const caseFile = getCaseFile();

  if (page === '/dashboard') {
    updateHelpContext('default');
    if (!caseFile.wards || caseFile.wards.length === 0) {
      showInventorySelector(el);
      return;
    }
    await features().mountPage('dashboard', el, page, { signal });
    if (signal.aborted) return;
    // Milestone 68¾A: the dashboard's title carries the test-system warning too.
    decorateTestSystemTitles(el);
    return;
  }

  if (page === '/inventory-select') {
    updateHelpContext('inventory-select');
    el.innerHTML = pageInventorySelector();
    linkLabelsToInputs();
    return;
  }

  if (page === '/activity-log') {
    updateHelpContext('default');
    el.innerHTML = pageActivityLog();
    loadAndRenderActivityLog();
    return;
  }

  if (page === '/party-management') {
    updateHelpContext('default');
    el.innerHTML = pagePartyManagement();
    renderPartyManagementBody();
    return;
  }

  const activeWard = getActiveWard();
  const activeType = getActiveInventoryType() || (activeWard && activeWard.inventoryType);

  if (!activeType) {
    showInventorySelector(el);
    return;
  }

  updateHelpContext();

  const engine = formEngine(activeType);
  if (FILING_ENGINE_IDS.includes(engine)) {
    await features().mountPage(engine, el, page, { signal, filing: activeWard });
    // A newer navigation, or another filing opened meanwhile, owns the page.
    if (signal.aborted || getActiveWard() !== activeWard) return;
  }
  if (page === '/' && activeWard && activeWard.archived) {
    renderClosedFilingSyncNotice(el, activeWard);
  }
  linkLabelsToInputs();
  // Milestone 40C-C removed the `enforceDateRanges()` window-global; date-range
  // order is reported by checkDateOrder() in each validator, not wired onto the inputs.
  setupAmountFieldValidation();
  // The sidebar's filing card -- its headline total and, inside it, the
  // progress bar (refreshWardInfoCard() ends with updateNavDots()). A typed
  // edit refreshes it, but Remove, Duplicate and an Excel import change the
  // figures and then only redraw the page, which used to refresh the
  // progress bar alone: the total stayed stale until the next keystroke
  // (found 2026-10-03; tests/e2e/sidebar-total-follows-changes.spec.ts).
  if (document.getElementById('ward-info-display')) refreshWardInfoCard();
  else updateNavDots();
  initPrintPager();
  attachFormHeaderActions(el);
}

// No filing to show, or no filing in the case at all: the Start New Form
// picker, with the URL pointing at it.
function showInventorySelector(el) {
  setCurrentPage('/inventory-select');
  setRouteHash('/inventory-select');
  updateHelpContext('inventory-select');
  el.innerHTML = pageInventorySelector();
  linkLabelsToInputs();
}

/** Marks the sidebar link for the page being shown. */
export function updateNavActive(page) {
  /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.nav-link-item[data-page]')).forEach((btn) => {
    const isActive = btn.dataset.page === page;
    btn.classList.toggle('active', isActive);
    if (isActive) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
}

/**
 * Show the page the URL's hash names: one of the pages any filing (or none)
 * has, else one of the open filing's own pages -- an unknown one is its Cover.
 * Called on a hash change the filer made, and by startup and the unlock to
 * draw the first page. (Moved from legacy-app.js's handleHash().)
 */
export async function handleHash() {
  const h = currentHash();
  if (SPECIAL_PAGES.includes(h) && getCurrentPage() === h) return;
  const page = routeForHash(h);
  setCurrentPage(page);
  const rendered = renderPage(page);
  updateNavActive(page);
  await rendered;
}

// A hash change the router made itself -- navigate(), startup, opening a
// filing -- names the page already shown: nothing to do. Any other is the
// filer's.
function onHashChange() {
  if (routeForHash(currentHash()) === getCurrentPage()) return;
  handleHash();
}

/**
 * Installed once by startGuardianForms(): the hash change listener (it was
 * legacy-app.js's), and the observer that gives each filing page's heading its
 * header buttons however the page was drawn.
 */
/** @param {{ signal?: AbortSignal }} [options] */
export function installRouter({ signal } = {}) {
  window.addEventListener('hashchange', onHashChange, { signal });
  if (typeof MutationObserver === 'undefined') return;
  const observer = new MutationObserver(() => {
    attachFormHeaderActions();
  });
  const attachObserver = () => {
    const mainEl = document.getElementById('main-content');
    if (mainEl) observer.observe(mainEl, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachObserver, { once: true, signal });
  } else {
    attachObserver();
  }
  signal?.addEventListener('abort', () => observer.disconnect(), { once: true });
}

export function attachFormHeaderActions(container = (typeof document !== 'undefined' ? document.getElementById('main-content') : null)) {
  if (!container || typeof document === 'undefined') return;
  // Milestone 68¾A: the test-system warning goes on every title surface --
  // the dashboard, a filing page's heading, and the Preview & Export banner
  // -- before any early return below. Idempotent, so this function's
  // mutation observer calling it again never doubles the warning.
  decorateTestSystemTitles(container);
  if (container.querySelector('[data-dashboard-root], .dashboard-page-header')) return;

  const h1 = container.querySelector('.schedule-page > h1, .schedule-page h1');
  if (!h1 || h1.classList.contains('visually-hidden') || h1.querySelector('.form-header-actions')) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  // Inside a filing "?" opens the manual for this page in a new tab
  // (shell-events.js), not the Help panel, so the button says that and claims
  // no disclosure state -- it carried aria-haspopup, aria-controls and an
  // aria-expanded, and a screen reader announced a panel. (master ae9ecdc,
  // carried after Milestone 70's 70K.)

  const actions = document.createElement('div');
  actions.className = 'form-header-actions';
  const homeIcon = ic('home', 16);
  const themeIcon = ic(isDark ? 'sun' : 'moon', 16);

  actions.innerHTML = `<button type="button" class="topnav-btn" data-shell-action="dashboard">${homeIcon} All Filings</button><button type="button" class="topnav-btn topnav-theme" id="theme-toggle-btn" data-shell-action="toggle-theme" title="Switch theme" aria-label="Switch to ${isDark ? 'light' : 'dark'} theme" aria-pressed="${isDark}">${themeIcon}</button><button type="button" class="topnav-btn topnav-help" id="help-toggle-btn" data-shell-action="toggle-help" title="Help: open the user guide for this page (new tab)" aria-label="Help: open the user guide for this page (new tab)">?</button>`;
  h1.appendChild(actions);
}
