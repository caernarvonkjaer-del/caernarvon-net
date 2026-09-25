// Application navigation, URL hash router, and feature mounting.
import { getCaseFile } from '../state.js';
import { FILING_ENGINE_IDS, mountFeatureFnName } from '../filing/filing-descriptor.js';
import { resetReadinessCardState } from '../filing/readiness-card.js';
import { saveLastPosition } from '../persistence/recovery-cache.js';
import { decorateTestSystemTitles } from '../ui/test-system-title.js';
import { ic } from '../ui/icons.js';

let _currentPage = '/dashboard';

// Milestone 51B removed addBeforeNavigateHook(), addAfterNavigateHook() and
// registerRoute() from this module, along with the _routeHooks arrays and
// _customRoutes map they populated and the three dispatch sites that read them.
// Nothing outside router.spec.js ever registered a hook or a custom route, so
// the arrays were permanently empty and the map permanently unset -- the two
// `for (const hook of ...)` loops in navigate() and the _customRoutes branch in
// renderPage() could never execute. This app routes by a hash + a switch in
// renderPage(); if a genuine cross-cutting navigation concern turns up later,
// reintroduce the hook mechanism at that point with a real caller.

export function getCurrentPage() {
  if (typeof window !== 'undefined' && window.currentPage) {
    return window.currentPage;
  }
  return _currentPage;
}

export function setCurrentPage(page) {
  _currentPage = page;
  if (typeof window !== 'undefined') {
    window.currentPage = page;
  }
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
  if (page !== previousPage) {
    if (typeof window !== 'undefined') {
      // Leaving a page forgets a hand-opened sidebar nav section, so the
      // section holding the new page expands itself. The reset lives in
      // legacy-app.js because it owns the `let` behind it; it used to run from
      // that file's own navigate(), which this function's window.navigate
      // assignment silently replaced.
      window.resetNavSectionExpanded?.();
      window.commitPendingFieldValues?.();
      // Milestone 44C: leaving Preview forgets the readiness card's hand
      // toggle, so the next entry recomputes its default; a same-route
      // rerender (renderPage('/print') after a blocked export) keeps it.
      if (page !== '/print') resetReadinessCardState();
      if (typeof window.pruneBlankCards === 'function') {
        window.pruneBlankCards();
      }
    }
  }

  if (page === '/dashboard' && typeof window !== 'undefined' && typeof window.enterDashboardEditingFocus === 'function') {
    if (!await window.enterDashboardEditingFocus()) return false;
  }

  setCurrentPage(page);
  if (typeof window !== 'undefined') {
    if (updateHash) window.location.hash = page;
  }

  await renderPage(page);
  closeMobileSidebar();

  return true;
}

export async function renderPage(page) {
  // Milestone 38C: entering the dashboard ends editing focus -- commit pending
  // values, release the ward lock, clear activeWardId and window.D. navigate()
  // above already does this, but legacy-app.js's handleHash() calls renderPage
  // directly, so arriving by hash or by the browser Back button skipped it and
  // left the ward lock held -- which can block another tab from opening that
  // ward at all. Doing it here covers every route in. It early-returns when no
  // ward is open and de-dupes concurrent calls, so navigate() is unaffected.
  if (page === '/dashboard' && typeof window !== 'undefined' && typeof window.enterDashboardEditingFocus === 'function') {
    if (!await window.enterDashboardEditingFocus()) return;
  }

  if (typeof document === 'undefined') return;
  saveLastPosition(page, getCaseFile().activeWardId);
  const el = document.getElementById('main-content');
  if (!el) return;

  if (typeof window !== 'undefined') {
    window.disposeActiveFeature?.(el);
  }

  const caseFile = getCaseFile();

  if (page === '/dashboard') {
    if (typeof window !== 'undefined' && typeof window.updateHelpContext === 'function') {
      window.updateHelpContext('default');
    }
    if (!caseFile.wards || caseFile.wards.length === 0) {
      setCurrentPage('/inventory-select');
      if (typeof window !== 'undefined') {
        window.location.hash = '/inventory-select';
        if (typeof window.updateHelpContext === 'function') window.updateHelpContext('inventory-select');
        if (typeof window.pageInventorySelector === 'function') {
          el.innerHTML = window.pageInventorySelector();
        }
        if (typeof window.linkLabelsToInputs === 'function') window.linkLabelsToInputs();
      }
      return;
    }
    if (typeof window !== 'undefined' && typeof window.mountDashboardFeature === 'function') {
      await window.mountDashboardFeature(page);
    }
    // Milestone 68¾A: the dashboard's title carries the test-system warning too.
    decorateTestSystemTitles(el);
    return;
  }

  if (page === '/inventory-select') {
    if (typeof window !== 'undefined') {
      if (typeof window.updateHelpContext === 'function') window.updateHelpContext('inventory-select');
      if (typeof window.pageInventorySelector === 'function') {
        el.innerHTML = window.pageInventorySelector();
      }
      if (typeof window.linkLabelsToInputs === 'function') window.linkLabelsToInputs();
    }
    return;
  }

  if (page === '/activity-log') {
    if (typeof window !== 'undefined') {
      if (typeof window.updateHelpContext === 'function') window.updateHelpContext('default');
      if (typeof window.pageActivityLog === 'function') el.innerHTML = window.pageActivityLog();
      if (typeof window.loadAndRenderActivityLog === 'function') window.loadAndRenderActivityLog();
    }
    return;
  }

  if (page === '/party-management') {
    if (typeof window !== 'undefined') {
      if (typeof window.updateHelpContext === 'function') window.updateHelpContext('default');
      if (typeof window.pagePartyManagement === 'function') el.innerHTML = window.pagePartyManagement();
      if (typeof window.renderPartyManagementBody === 'function') window.renderPartyManagementBody();
    }
    return;
  }

  const activeWard = typeof window !== 'undefined' && typeof window.getActiveWard === 'function'
    ? window.getActiveWard()
    : (caseFile.wards || []).find((w) => w.wardId === caseFile.activeWardId);
  const activeType = (typeof window !== 'undefined' && window.activeInventoryType) || (activeWard && activeWard.inventoryType);

  if (!activeType) {
    setCurrentPage('/inventory-select');
    if (typeof window !== 'undefined') {
      window.location.hash = '/inventory-select';
      if (typeof window.updateHelpContext === 'function') window.updateHelpContext('inventory-select');
      if (typeof window.pageInventorySelector === 'function') {
        el.innerHTML = window.pageInventorySelector();
      }
      if (typeof window.linkLabelsToInputs === 'function') window.linkLabelsToInputs();
    }
    return;
  }

  if (typeof window !== 'undefined') {
    if (typeof window.updateHelpContext === 'function') window.updateHelpContext();

    const pageKey = typeof window.getCurrentPageKey === 'function' ? window.getCurrentPageKey() : null;
    if (pageKey && window._visitedPages) window._visitedPages.add(pageKey);

    const engine = typeof window.formEngine === 'function' ? window.formEngine(activeType) : activeType;
    if (FILING_ENGINE_IDS.includes(engine)) {
      const mount = window[mountFeatureFnName(engine)];
      if (typeof mount === 'function') await mount(page);
    }
    if (page === '/' && activeWard && activeWard.archived && typeof window.renderClosedFilingSyncNotice === 'function') {
      window.renderClosedFilingSyncNotice(el, activeWard);
    }
    if (typeof window.linkLabelsToInputs === 'function') window.linkLabelsToInputs();
    // Milestone 40C-C removed the `enforceDateRanges()` window-global; date-range
    // order is reported by checkDateOrder() in each validator, not wired onto the inputs.
    if (typeof window.setupAmountFieldValidation === 'function') window.setupAmountFieldValidation();
    if (typeof window.updateNavDots === 'function') window.updateNavDots();
    if (typeof window.initPrintPager === 'function') window.initPrintPager();
    attachFormHeaderActions(el);
  }
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
  const helpOpen = typeof window.isHelpPanelOpen === 'function'
    ? window.isHelpPanelOpen()
    : (document.getElementById('help-panel')?.style.display === 'flex');

  const actions = document.createElement('div');
  actions.className = 'form-header-actions';
  const homeIcon = ic('home', 16);
  const themeIcon = ic(isDark ? 'sun' : 'moon', 16);

  actions.innerHTML = `<button type="button" class="topnav-btn" data-shell-action="dashboard">${homeIcon} All Filings</button><button type="button" class="topnav-btn topnav-theme" id="theme-toggle-btn" data-shell-action="toggle-theme" title="Switch theme" aria-label="Switch to ${isDark ? 'light' : 'dark'} theme" aria-pressed="${isDark}">${themeIcon}</button><button type="button" class="topnav-btn topnav-help" id="help-toggle-btn" data-shell-action="toggle-help" title="Help" aria-label="Help" aria-haspopup="true" aria-expanded="${helpOpen}" aria-controls="help-panel">?</button>`;
  h1.appendChild(actions);
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.navigate = navigate;
  window.renderPage = renderPage;
  window.toggleMobileSidebar = toggleMobileSidebar;
  window.closeMobileSidebar = closeMobileSidebar;
  window.attachFormHeaderActions = attachFormHeaderActions;

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      attachFormHeaderActions();
    });
    const attachObserver = () => {
      const mainEl = document.getElementById('main-content');
      if (mainEl) observer.observe(mainEl, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachObserver, { once: true });
    } else {
      attachObserver();
    }
  }
}
