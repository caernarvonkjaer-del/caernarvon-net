// Application navigation, URL hash router, and feature mounting.
import { getCaseFile } from '../state.js';

let _currentPage = '/dashboard';
const _routeHooks = {
  before: [],
  after: [],
};
const _customRoutes = new Map();

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

export function addBeforeNavigateHook(fn) {
  _routeHooks.before.push(fn);
  return () => {
    const idx = _routeHooks.before.indexOf(fn);
    if (idx >= 0) _routeHooks.before.splice(idx, 1);
  };
}

export function addAfterNavigateHook(fn) {
  _routeHooks.after.push(fn);
  return () => {
    const idx = _routeHooks.after.indexOf(fn);
    if (idx >= 0) _routeHooks.after.splice(idx, 1);
  };
}

export function registerRoute(path, handler) {
  _customRoutes.set(path, handler);
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

export async function navigate(page) {
  const previousPage = getCurrentPage();
  if (page !== previousPage) {
    if (typeof window !== 'undefined') {
      window.commitPendingFieldValues?.();
      if (typeof window.pruneBlankCards === 'function') {
        window.pruneBlankCards();
      }
    }
  }

  for (const hook of _routeHooks.before) {
    try {
      const allowed = await hook(page, previousPage);
      if (allowed === false) return false;
    } catch (e) {
      console.warn('beforeNavigate hook threw', e);
    }
  }

  setCurrentPage(page);
  if (typeof window !== 'undefined') {
    window.location.hash = page;
  }

  await renderPage(page);
  closeMobileSidebar();

  for (const hook of _routeHooks.after) {
    try {
      await hook(page, previousPage);
    } catch (e) {
      console.warn('afterNavigate hook threw', e);
    }
  }
  return true;
}

export async function renderPage(page) {
  if (_customRoutes.has(page)) {
    const handler = _customRoutes.get(page);
    return await handler(page);
  }

  if (typeof document === 'undefined') return;
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
    switch (engine) {
      case 'guardian':
        if (typeof window.mountGuardianFeature === 'function') await window.mountGuardianFeature(page);
        return;
      case 'simplified':
        if (typeof window.mountSimplifiedFeature === 'function') await window.mountSimplifiedFeature(page);
        break;
      case 'annual':
        if (typeof window.mountAnnualFeature === 'function') await window.mountAnnualFeature(page);
        break;
      case 'planSimplified':
        if (typeof window.mountPlanSimplifiedFeature === 'function') await window.mountPlanSimplifiedFeature(page);
        break;
      case 'planAnnual':
        if (typeof window.mountPlanAnnualFeature === 'function') await window.mountPlanAnnualFeature(page);
        break;
      case 'planInitial':
        if (typeof window.mountPlanInitialFeature === 'function') await window.mountPlanInitialFeature(page);
        break;
      case 'planMinor':
        if (typeof window.mountPlanMinorFeature === 'function') await window.mountPlanMinorFeature(page);
        break;
    }
    if (typeof window.linkLabelsToInputs === 'function') window.linkLabelsToInputs();
    if (typeof window.enforceDateRanges === 'function') window.enforceDateRanges();
    if (typeof window.setupAmountFieldValidation === 'function') window.setupAmountFieldValidation();
    if (typeof window.updateNavDots === 'function') window.updateNavDots();
    if (typeof window.initPrintPager === 'function') window.initPrintPager();
  }
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.navigate = navigate;
  window.renderPage = renderPage;
  window.toggleMobileSidebar = toggleMobileSidebar;
  window.closeMobileSidebar = closeMobileSidebar;
}
