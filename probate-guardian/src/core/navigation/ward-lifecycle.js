// Ward lifecycle management: creation, activation, exclusive locking, switching, and deletion.
import { getCaseFile, getD, setD } from '../state.js';

export function createWardId() {
  return 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

export const ACCOUNTING_FORM_TYPES = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting'];
export const PRIOR_ACCOUNTING_SOURCES = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting'];
let dashboardEntryPromise = null;

/** Safely ends editor focus before the dashboard is rendered. */
export async function enterDashboardEditingFocus() {
  if (dashboardEntryPromise) return dashboardEntryPromise;
  dashboardEntryPromise = (async () => {
    const caseFile = getCaseFile();
    if (!caseFile.activeWardId) return true;
    try {
      window.commitPendingFieldValues?.();
      window.pruneBlankCards?.();
      if (typeof window.flushPendingSave === 'function') await window.flushPendingSave({ requireRecovery: true });
      if (typeof window.releaseWardLock === 'function') await window.releaseWardLock();
    } catch (error) {
      console.error('Unable to safely leave editor for dashboard:', error);
      window.showSaveError?.(error);
      return false;
    }
    caseFile.activeWardId = null;
    setD({});
    window.activeInventoryType = null;
    window._visitedPages?.clear?.();
    window.updateSidebar?.();
    await window.refreshAutoSaveArmedStatus?.();
    window.notifyProbateGuardianTabStateChanged?.();
    return true;
  })();
  try { return await dashboardEntryPromise; }
  finally { dashboardEntryPromise = null; }
}

// Which existing filings may seed a new one at creation time. Every filing for
// the same ward carries the same identity and contact block, so any type is a
// valid source for any other; the picker used to list one counterpart only and
// silently omitted the ward's other filings (Milestone 36-7 item 17).
export const CARRY_SOURCE_TYPE = {
  planInitial: ['guardian', 'annual', 'simplified', 'finalAccounting', 'trustAccounting', 'planInitial', 'planAnnual', 'planSimplified', 'planMinor'],
  planSimplified: ['simplified', 'guardian', 'annual', 'finalAccounting', 'trustAccounting', 'planSimplified', 'planInitial', 'planAnnual', 'planMinor'],
  planAnnual: ['annual', 'guardian', 'simplified', 'finalAccounting', 'trustAccounting', 'planAnnual', 'planInitial', 'planSimplified', 'planMinor'],
  planMinor: ['guardian', 'annual', 'simplified', 'finalAccounting', 'trustAccounting', 'planMinor', 'planInitial', 'planAnnual', 'planSimplified'],
  guardian: ['planInitial', 'annual', 'simplified', 'finalAccounting', 'trustAccounting', 'planAnnual', 'planSimplified', 'planMinor'],
  simplified: ['planSimplified', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'simplified'), 'planInitial', 'planAnnual', 'planMinor'],
  annual: ['planAnnual', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'annual'), 'planInitial', 'planSimplified', 'planMinor'],
  finalAccounting: ['planAnnual', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'finalAccounting'), 'planInitial', 'planSimplified', 'planMinor'],
  trustAccounting: ['planAnnual', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'trustAccounting'), 'planInitial', 'planSimplified', 'planMinor'],
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
  const caseNum = src.caseNumber || src.ucn || src.ref || '';
  const gName = src.guardianName || src.guardianNames || src.guardian || (src.guardians && src.guardians[0]?.name) || (src.planGuardians && src.planGuardians[0]?.name) || '';
  const attyName = src.attorneyForGuardian || src.attorney || src.attorney_name || src.attorneyName || '';
  const attyBar = src.attorneyBar || src.attorney_bar || '';
  const attyPhone = src.attorneyPhone || src.attorney_phone || '';
  const attyEmail = src.attorneyEmail || src.attorney_email || '';
  const attyStreet = src.attorneyAddress || src.attorney_street || '';
  const attyCityStateZip = src.attorneyCityStateZip || src.attorney_cityStateZip || '';
  const gs = (src.guardians && src.guardians.length ? src.guardians : src.planGuardians) || [];

  if (planType === 'planInitial') {
    const g = gs[0] || {};
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      county: src.county || 'Pinellas',
      inceptionDate: src.gid || src.inceptionDate || '',
      guardianNames: gName,
      attorneyName: attyName,
      attorney_name: attyName,
      attorney_bar: attyBar,
      attorney_phone: attyPhone,
      attorney_email: attyEmail,
      attorney_street: attyStreet,
      attorney_cityStateZip: attyCityStateZip,
      planGuardians: [
        {
          name: g.name || gName || '',
          ssn: g.ssn || g.ssnEin || g.tin || '',
          street: g.streetAddress || g.street || g.mailingStreet || '',
          phone: g.phone || '',
          cityStateZip: g.cityStateZip || g.mailingCityStateZip || '',
          signatureDate: '',
          relationship: g.relationship || '',
        },
        { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
        { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
        { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
      ],
    };
  }
  if (planType === 'planSimplified') {
    const mail = (g) => [g.mailingStreet || g.streetAddress || g.street, g.mailingCityStateZip || g.cityStateZip].filter(Boolean).join(', ');
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      county: src.county || 'Pinellas',
      planGuardians: [0, 1].map((i) => {
        const g = gs[i] || (i === 0 ? { name: gName } : {});
        return {
          name: g.name || (i === 0 ? gName : '') || '',
          signatureDate: '',
          email: g.email || '',
          phone: g.phone || '',
          mailingAddress: mail(g),
        };
      }),
    };
  }
  if (planType === 'planAnnual') {
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      county: src.county || 'Pinellas',
      gid: src.gid || src.inceptionDate || '',
      guardian: gName,
      attorney: attyName,
      planGuardians: [0, 1, 2].map((i) => {
        const g = gs[i] || (i === 0 ? { name: gName } : {});
        return {
          name: g.name || (i === 0 ? gName : '') || '',
          ssn: g.ssn || g.ssnEin || g.tin || '',
          phone: g.phone || '',
          email: g.email || '',
          signatureDate: '',
          mailingStreet: g.mailingStreet || g.streetAddress || g.street || '',
          mailingCityStateZip: g.mailingCityStateZip || g.cityStateZip || '',
          officeStreet: g.officeStreet || '',
          officeCityStateZip: g.officeCityStateZip || '',
          relationship: g.relationship || '',
        };
      }),
    };
  }
  if (planType === 'planMinor') {
    return {
      wardName: src.wardName || '',
      county: src.county || 'Pinellas',
      ucn: caseNum,
      ref: src.ref || '',
      guardianName: gName,
      attorney_name: attyName,
      attorney_bar: attyBar,
      attorney_phone: attyPhone,
      attorney_email: attyEmail,
      attorney_street: attyStreet,
      attorney_cityStateZip: attyCityStateZip,
      planGuardians: [0, 1].map((i) => {
        const g = gs[i] || (i === 0 ? { name: gName } : {});
        return {
          name: g.name || (i === 0 ? gName : '') || '',
          tin: g.ssn || g.ssnEin || g.tin || '',
          phone: g.phone || '',
          mailingStreet: g.mailingStreet || g.streetAddress || g.street || '',
          mailingCityStateZip: g.mailingCityStateZip || g.cityStateZip || '',
          relationship: g.relationship || '',
          email: g.email || '',
          signatureDate: '',
        };
      }),
    };
  }
  return {};
}

export function carryOverFieldsForAccounting(sourceWard, accountingType) {
  const src = sourceWard || {};
  const caseNum = src.caseNumber || src.ucn || src.ref || '';
  const gName = src.guardianNames || src.guardianName || src.guardian || (src.planGuardians && src.planGuardians[0]?.name) || (src.guardians && src.guardians[0]?.name) || '';
  const attyName = src.attorneyName || src.attorney_name || src.attorneyForGuardian || src.attorney || '';
  const attyBar = src.attorneyBar || src.attorney_bar || '';
  const attyPhone = src.attorneyPhone || src.attorney_phone || '';
  const attyEmail = src.attorneyEmail || src.attorney_email || '';
  const attyStreet = src.attorneyAddress || src.attorney_street || '';
  const attyCityStateZip = src.attorneyCityStateZip || src.attorney_cityStateZip || '';
  const gs = src.planGuardians || src.guardians || [];

  if (accountingType === 'guardian') {
    const g = gs[0] || {};
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      county: src.county || 'Pinellas',
      gid: src.inceptionDate || src.gid || '',
      guardianName: gName,
      attorneyForGuardian: attyName,
      attorneyBar: attyBar,
      attorneyPhone: attyPhone,
      attorneyEmail: attyEmail,
      attorneyAddress: attyStreet,
      attorneyCityStateZip: attyCityStateZip,
      guardians: [
        {
          name: g.name || gName || '',
          ssnEin: g.ssn || g.ssnEin || g.tin || '',
          phone: g.phone || '',
          streetAddress: g.street || g.streetAddress || g.mailingStreet || '',
          cityStateZip: g.cityStateZip || g.mailingCityStateZip || '',
          signatureDate: null,
        },
      ],
    };
  }
  if (accountingType === 'simplified') {
    const split = (addr) => {
      const s = String(addr || '');
      const i = s.indexOf(', ');
      return i === -1 ? { street: s, cityStateZip: '' } : { street: s.slice(0, i), cityStateZip: s.slice(i + 2) };
    };
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      county: src.county || 'Pinellas',
      gid: src.gid || src.inceptionDate || '',
      guardian: gName,
      attorney: attyName,
      guardians: [0, 1, 2].map((i) => {
        const g = gs[i] || (i === 0 ? { name: gName } : {});
        const addr = g.mailingStreet ? { street: g.mailingStreet, cityStateZip: g.mailingCityStateZip || '' } : split(g.mailingAddress || g.streetAddress || g.street);
        return {
          name: g.name || (i === 0 ? gName : '') || '',
          ssn: g.ssn || g.ssnEin || g.tin || '',
          phone: g.phone || '',
          email: g.email || '',
          mailingStreet: addr.street || '',
          mailingCityStateZip: addr.cityStateZip || '',
          residenceStreet: '',
          residenceCityStateZip: '',
          signatureDate: '',
        };
      }),
    };
  }
  if (accountingType === 'annual') {
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      county: src.county || 'Pinellas',
      gid: src.gid || src.inceptionDate || '',
      guardian: gName,
      attorney: attyName,
      attorneyBar: attyBar,
      attorneyPhone: attyPhone,
      attorneyEmail: attyEmail,
      guardians: [0, 1, 2].map((i) => {
        const g = gs[i] || (i === 0 ? { name: gName } : {});
        return {
          name: g.name || (i === 0 ? gName : '') || '',
          ssn: g.ssn || g.ssnEin || g.tin || '',
          phone: g.phone || '',
          email: g.email || '',
          mailingStreet: g.mailingStreet || g.streetAddress || g.street || '',
          mailingCityStateZip: g.mailingCityStateZip || g.cityStateZip || '',
          officeStreet: g.officeStreet || '',
          officeCityStateZip: g.officeCityStateZip || '',
          signatureDate: '',
          signatureDateLabel: '',
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

  if (typeof window !== 'undefined') {
    if (typeof window.updateSidebar === 'function') window.updateSidebar();
    if (typeof window.refreshAutoSaveArmedStatus === 'function') await window.refreshAutoSaveArmedStatus();
    if (typeof window.notifyProbateGuardianTabStateChanged === 'function') window.notifyProbateGuardianTabStateChanged();
  }
  return true;
}

export async function unloadWard() {
  if (await enterDashboardEditingFocus() && typeof window !== 'undefined' && typeof window.navigate === 'function') window.navigate('/dashboard');
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
        if (typeof window.mountGuardianFeature === 'function') await window.mountGuardianFeature('/');
        break;
      case 'simplified':
        if (typeof window.mountSimplifiedFeature === 'function') await window.mountSimplifiedFeature('/');
        break;
      case 'annual':
        if (typeof window.mountAnnualFeature === 'function') await window.mountAnnualFeature('/');
        break;
      case 'planSimplified':
        if (typeof window.mountPlanSimplifiedFeature === 'function') await window.mountPlanSimplifiedFeature('/');
        break;
      case 'planAnnual':
        if (typeof window.mountPlanAnnualFeature === 'function') await window.mountPlanAnnualFeature('/');
        break;
      case 'planInitial':
        if (typeof window.mountPlanInitialFeature === 'function') await window.mountPlanInitialFeature('/');
        break;
      case 'planMinor':
        if (typeof window.mountPlanMinorFeature === 'function') await window.mountPlanMinorFeature('/');
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
  window.enterDashboardEditingFocus = enterDashboardEditingFocus;
  window.unloadWard = unloadWard;
  window.addWard = addWard;
  window.switchWard = switchWard;
  window.deleteWard = deleteWard;
  window.renameWard = renameWard;
  window.carrySourcesFor = carrySourcesFor;
  window.carryWardsFor = carryWardsFor;
  window.carryOverFieldsForPlan = carryOverFieldsForPlan;
  window.carryOverFieldsForAccounting = carryOverFieldsForAccounting;
}
