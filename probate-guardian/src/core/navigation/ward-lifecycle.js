// Ward lifecycle management: creation, activation, exclusive locking, switching, and deletion.
import { getCaseFile, getD, setD } from '../state.js';
import { saveAppState } from '../persistence/launch-preferences.js';

export function createWardId() {
  return 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

export const ACCOUNTING_FORM_TYPES = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting'];
export const PRIOR_ACCOUNTING_SOURCES = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting'];

export const CARRY_SOURCE_TYPE = {
  planInitial: ['guardian'],
  planSimplified: ['simplified'],
  planAnnual: ['annual'],
  planMinor: ['guardian'],
  guardian: ['planInitial'],
  simplified: ['planSimplified', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'simplified')],
  annual: ['planAnnual', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'annual')],
  finalAccounting: ['planAnnual', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'finalAccounting')],
  trustAccounting: ['planAnnual', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'trustAccounting')],
};

export function carrySourcesFor(type) {
  return CARRY_SOURCE_TYPE[type] || [];
}

export function carryWardsFor(type, excludeWardId) {
  const srcs = carrySourcesFor(type);
  const caseFile = getCaseFile();
  return srcs.flatMap((st) => (caseFile.wards || []).filter((w) => w.inventoryType === st && w.wardId !== excludeWardId));
}

export function carryOverFieldsForPlan(sourceWard, planType) {
  const src = sourceWard || {};
  if (planType === 'planInitial') {
    const g = (src.guardians || [])[0] || {};
    return {
      wardName: src.wardName || '',
      caseNumber: src.caseNumber || '',
      county: src.county || 'Pinellas',
      inceptionDate: src.gid || '',
      guardianNames: src.guardianName || '',
      attorneyName: src.attorneyForGuardian || '',
      planGuardians: [
        {
          name: g.name || '',
          ssn: g.ssnEin || '',
          street: g.streetAddress || '',
          phone: g.phone || '',
          cityStateZip: g.cityStateZip || '',
          signatureDate: '',
          relationship: '',
        },
        { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
        { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
        { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
      ],
    };
  }
  if (planType === 'planSimplified') {
    const gs = src.guardians || [];
    const mail = (g) => [g.mailingStreet, g.mailingCityStateZip].filter(Boolean).join(', ');
    return {
      wardName: src.wardName || '',
      caseNumber: src.caseNumber || '',
      county: src.county || 'Pinellas',
      planGuardians: [0, 1].map((i) => {
        const g = gs[i] || {};
        return {
          name: g.name || '',
          signatureDate: '',
          email: g.email || '',
          phone: g.phone || '',
          mailingAddress: mail(g),
        };
      }),
    };
  }
  if (planType === 'planAnnual') {
    const gs = src.guardians || [];
    return {
      wardName: src.wardName || '',
      caseNumber: src.caseNumber || '',
      county: src.county || 'Pinellas',
      gid: src.gid || '',
      guardian: src.guardian || '',
      attorney: src.attorney || '',
      planGuardians: [0, 1, 2].map((i) => {
        const g = gs[i] || {};
        return {
          name: g.name || '',
          ssn: g.ssn || '',
          phone: g.phone || '',
          email: g.email || '',
          signatureDate: '',
          mailingStreet: g.mailingStreet || '',
          mailingCityStateZip: g.mailingCityStateZip || '',
          officeStreet: g.officeStreet || '',
          officeCityStateZip: g.officeCityStateZip || '',
          relationship: '',
        };
      }),
    };
  }
  return {};
}

export async function activateWard(ward, opts = {}) {
  if (!ward || !ward.wardId) return false;
  const caseFile = getCaseFile();

  // 1. If ward is already active and lock held, refresh UI and return true
  if (caseFile.activeWardId === ward.wardId && getD() === ward) {
    if (typeof window !== 'undefined' && window.acquireWardLock) {
      const alreadyHeld = await window.acquireWardLock(ward.wardId);
      if (alreadyHeld) {
        if (typeof window.updateSidebar === 'function') window.updateSidebar();
        if (typeof window.refreshAutoSaveArmedStatus === 'function') await window.refreshAutoSaveArmedStatus();
        return true;
      }
    } else {
      if (typeof window !== 'undefined' && typeof window.updateSidebar === 'function') window.updateSidebar();
      if (typeof window !== 'undefined' && typeof window.refreshAutoSaveArmedStatus === 'function') await window.refreshAutoSaveArmedStatus();
      return true;
    }
  }

  // 2. Flush while outgoing ward's lock is still held
  if (typeof window !== 'undefined' && typeof window.flushPendingSave === 'function') {
    await window.flushPendingSave();
  }

  // 3. Acquire target ward lock
  let acquired = true;
  if (typeof window !== 'undefined' && window.acquireWardLock) {
    acquired = await window.acquireWardLock(ward.wardId);
  }

  // 4. On contention: previous lock is still held untouched
  if (!acquired) {
    if (typeof window !== 'undefined' && typeof window.showWardLockedModal === 'function') {
      window.showWardLockedModal();
    }
    return false;
  }

  // 5. On success, set loaded state
  caseFile.activeWardId = ward.wardId;
  setD(ward);
  if (typeof window !== 'undefined') {
    window.activeInventoryType = ward.inventoryType;
    if (window._visitedPages && typeof window._visitedPages.clear === 'function') {
      window._visitedPages.clear();
    }
    if (typeof window.addToRecentlyOpened === 'function') {
      window.addToRecentlyOpened(ward);
    }
    if (typeof window.formEngine === 'function' && window.formEngine(ward.inventoryType) === 'guardian') {
      if (typeof window.ensureGuardianFeatureReady === 'function') {
        await window.ensureGuardianFeatureReady();
      }
    }
  }

  try {
    await saveAppState('activeWardId', ward.wardId);
  } catch (e) {
    console.warn('saveAppState activeWardId failed', e);
  }

  if (typeof window !== 'undefined') {
    if (typeof window.updateSidebar === 'function') window.updateSidebar();
    if (typeof window.refreshAutoSaveArmedStatus === 'function') await window.refreshAutoSaveArmedStatus();
    if (typeof window.notifyProbateGuardianTabStateChanged === 'function') window.notifyProbateGuardianTabStateChanged();
  }
  return true;
}

export async function unloadWard() {
  if (typeof window !== 'undefined' && typeof window.flushPendingSave === 'function') {
    await window.flushPendingSave();
  }
  if (typeof window !== 'undefined' && window.releaseWardLock) {
    await window.releaseWardLock();
  }
  const caseFile = getCaseFile();
  caseFile.activeWardId = null;
  setD({});
  if (typeof window !== 'undefined') {
    window.activeInventoryType = null;
  }
  try {
    await saveAppState('activeWardId', null);
  } catch (e) {
    console.warn('saveAppState activeWardId null failed', e);
  }
  if (typeof window !== 'undefined') {
    if (typeof window.updateSidebar === 'function') window.updateSidebar();
    if (typeof window.refreshAutoSaveArmedStatus === 'function') await window.refreshAutoSaveArmedStatus();
    if (typeof window.notifyProbateGuardianTabStateChanged === 'function') window.notifyProbateGuardianTabStateChanged();
    if (typeof window.navigate === 'function') window.navigate('/dashboard');
  }
}

export async function addWard(wardName, inventoryType) {
  const wardId = createWardId();
  const caseFile = getCaseFile();
  const isFirstWardEver = !caseFile.wards || caseFile.wards.length === 0;

  const emptyData = typeof window !== 'undefined' && typeof window.initializeEmptyData === 'function'
    ? window.initializeEmptyData(inventoryType)
    : {};

  const newWard = {
    wardId,
    inventoryType,
    createdDate: new Date().toISOString().split('T')[0],
    ...emptyData,
    wardName: wardName || '',
  };

  if (!Array.isArray(caseFile.wards)) caseFile.wards = [];
  caseFile.wards.push(newWard);

  if (typeof window !== 'undefined' && typeof window.saveWardToState === 'function') {
    await window.saveWardToState(newWard);
  }

  await activateWard(newWard);

  if (typeof window !== 'undefined') {
    window._dirtySinceExport = true;
    if (typeof window.updateLastSavedIndicator === 'function') window.updateLastSavedIndicator();
    if (isFirstWardEver && window._appState) {
      window._appState.firstLaunchSeen = false;
    }
    if (typeof window.navigate === 'function') {
      await window.navigate('/');
    }
    if (isFirstWardEver && !window._lastExportAt && typeof window.showAutoExportReminder === 'function') {
      window.showAutoExportReminder(true);
    }
  }
  return wardId;
}

export async function switchWard(wardId) {
  const caseFile = getCaseFile();
  const ward = (caseFile.wards || []).find((w) => w.wardId === wardId);
  if (!ward) return false;

  const ok = await activateWard(ward);
  if (!ok) return false;

  if (typeof window !== 'undefined') {
    window.currentPage = '/';
    window.location.hash = '';
    const formEngine = typeof window.formEngine === 'function' ? window.formEngine(ward.inventoryType) : null;
    switch (formEngine) {
      case 'guardian':
        if (typeof window.mountGuardianFeature === 'function') window.mountGuardianFeature('/');
        if (typeof window.updateHelpContext === 'function') window.updateHelpContext();
        if (typeof window.closeMobileSidebar === 'function') window.closeMobileSidebar();
        return true;
      case 'simplified':
        if (typeof window.mountSimplifiedFeature === 'function') window.mountSimplifiedFeature('/');
        break;
      case 'annual':
        if (typeof window.mountAnnualFeature === 'function') window.mountAnnualFeature('/');
        break;
      case 'planSimplified':
        if (typeof window.mountPlanSimplifiedFeature === 'function') window.mountPlanSimplifiedFeature('/');
        break;
      case 'planAnnual':
        if (typeof window.mountPlanAnnualFeature === 'function') window.mountPlanAnnualFeature('/');
        break;
      case 'planInitial':
        if (typeof window.mountPlanInitialFeature === 'function') window.mountPlanInitialFeature('/');
        break;
      case 'planMinor':
        if (typeof window.mountPlanMinorFeature === 'function') window.mountPlanMinorFeature('/');
        break;
    }
    if (typeof window.linkLabelsToInputs === 'function') window.linkLabelsToInputs();
    if (typeof window.updateNavDots === 'function') window.updateNavDots();
    if (typeof window.updateHelpContext === 'function') window.updateHelpContext();
    if (typeof window.closeMobileSidebar === 'function') window.closeMobileSidebar();
  }
  return true;
}

export async function deleteWard(wardId) {
  const caseFile = getCaseFile();
  if (!Array.isArray(caseFile.wards)) return;
  const idx = caseFile.wards.findIndex((w) => w.wardId === wardId);
  if (idx === -1) return;

  if (caseFile.activeWardId === wardId) {
    await unloadWard();
  }

  caseFile.wards.splice(idx, 1);
  if (typeof window !== 'undefined') {
    if (typeof window.deleteWardFromState === 'function') {
      await window.deleteWardFromState(wardId);
    }
    if (typeof window.deleteAutosaveFile === 'function') {
      window.deleteAutosaveFile(wardId);
    }
    if (typeof window.updateSidebar === 'function') window.updateSidebar();
    if (typeof window.notifyProbateGuardianTabStateChanged === 'function') window.notifyProbateGuardianTabStateChanged();
    if (typeof window.navigate === 'function') window.navigate('/dashboard');
  }
}

export async function renameWard(wardId, newName) {
  const caseFile = getCaseFile();
  const ward = (caseFile.wards || []).find((w) => w.wardId === wardId);
  if (!ward) return;
  ward.wardName = newName;
  if (typeof window !== 'undefined') {
    if (typeof window.saveWardToState === 'function') {
      await window.saveWardToState(ward);
    }
    if (typeof window.notifyProbateGuardianTabStateChanged === 'function') window.notifyProbateGuardianTabStateChanged();
    if (typeof window.updateSidebar === 'function') window.updateSidebar();
  }
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.createWardId = createWardId;
  window.activateWard = activateWard;
  window.unloadWard = unloadWard;
  window.addWard = addWard;
  window.switchWard = switchWard;
  window.deleteWard = deleteWard;
  window.renameWard = renameWard;
  window.carrySourcesFor = carrySourcesFor;
  window.carryWardsFor = carryWardsFor;
  window.carryOverFieldsForPlan = carryOverFieldsForPlan;
}
