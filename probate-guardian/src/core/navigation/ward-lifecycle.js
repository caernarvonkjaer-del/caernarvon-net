// Ward lifecycle management: creation, activation, exclusive locking, switching, and deletion.
//
// Milestone 40C-A item 3: every carry-over/conversion builder below emits
// `county: ''`. Each used to read `src.county || 'Pinellas'`, which was wrong
// twice over -- it injected Pinellas when the source had no county, and it took
// the county from an arbitrary SOURCE FILING even when that filing was an older
// one filed in a county the ward has since left. County is now supplied from the
// canonical ward Party after the destination is linked to it. When the Party has
// no county the destination stays blank and the Cover asks -- which is the point
// of the decision.
//
// Milestone 51B corrected this comment. It used to name
// core/navigation/ward-county.js's linkDestinationToSourceWardParty() as the
// single entry point that legacy-app.js's carryOverFields() called. That was
// never true -- legacy-app.js never referenced that function -- and the stale
// pointer outlived the thing it pointed at until the function was deleted as
// dead code. The real single entry point is legacy-app.js's carryOverFields(),
// which does this work inline (blanks county, carries wardPartyId, reconciles a
// filing-shaped probe against the Party, then sets county from the resolved
// Party). Every carry-over surface -- Add Ward, Convert Ward, in-place Load Ward
// Info, and new-year creation -- routes through it.
import { getCaseFile, getD, setD } from '../state.js';
import { FILING_ENGINE_IDS, mountFeatureFnName } from '../filing/filing-descriptor.js';

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

// Milestone 40C-F item 2. A Guardian Inventory source keeps attorney details
// NESTED at src.attorney.{name,barNumber,phone,streetAddress,cityStateZip}
// (see emptyDataGuardian()); every other source type stores them flat. The
// chains below read both. attyName has a second defect fixed the same way:
// a bare `src.attorney` fallback would, for a Guardian source with a blank
// attorneyForGuardian, resolve to the nested OBJECT and get assigned into a
// destination string field -- reading atty.name explicitly avoids that.
//
// Milestone 52F Decision 6: attyName's fallback order used to differ between
// carryOverFieldsForPlan() and carryOverFieldsForAccounting() -- the Plan
// version checked the cosmetic attorneyForGuardian before the authoritative
// atty.name; the Accounting version checked the cosmetic attorneyName before
// the authoritative attorney_name. probate-guardian-data-model.csv's own
// field descriptions (guardian_inventory rows 158/284, plan_initial rows
// 806/836) call one of each pair a cover/cosmetic field and the other
// validated/certification -- neither function actually implemented a
// consistent policy once that's known. Resolved: the authoritative field
// wins. See MILESTONE-52-PROPOSAL.md's 52F section for the full reasoning.
//
// gName's fallback order also differed (guardianName-then-guardianNames vs.
// the reverse; guardians[]-then-planGuardians[] vs. the reverse) but,
// unlike attyName, this was verified harmless before unifying it:
// guardianName belongs to guardian_inventory/plan_minor and guardianNames
// to plan_initial alone (per the same CSV), so a source ward never has both
// populated; guardians[] and planGuardians[] are likewise exclusive to the
// Accounting and Plan families respectively. Check order therefore never
// changes the result for any real ward shape. caseNum and the other four
// atty* fields (Bar, Phone, Email, Street, CityStateZip) already matched
// exactly between the two functions -- nothing to resolve there.
export function extractCarryIdentity(sourceWard) {
  const src = sourceWard || {};
  // Milestone 63E. The Uniform Case Number is its own number, so the two are carried
  // separately: `caseNum` is the Case # (caseNumber on every type; `ref` on a Minor plan,
  // whose cover has both a UCN and a Case #), and `ucn` is the UCN. This used to fold
  // caseNumber || ucn || ref into one value, and the Minor branch wrote it into `ucn` --
  // so a Case # carried into a Minor plan became its UCN, and a Minor plan's UCN carried
  // out as its Case #. Neither is ever written into the other now. (A source saved before
  // 63E has no `ucn` key on any type but Plan Minor; it reads as blank.) The dashboard's
  // identity rule, caseNumberOf() = ucn || ref for Minor, is separate and unchanged.
  const caseNum = src.caseNumber || src.ref || '';
  const ucn = src.ucn || '';
  const gName = src.guardianName || src.guardianNames || src.guardian
    || (src.guardians && src.guardians[0]?.name) || (src.planGuardians && src.planGuardians[0]?.name) || '';
  const atty = (src.attorney && typeof src.attorney === 'object') ? src.attorney : {};
  const attyFlat = typeof src.attorney === 'string' ? src.attorney : '';
  const attyName = src.attorney_name || atty.name || src.attorneyForGuardian || src.attorneyName || attyFlat || '';
  const attyBar = src.attorneyBar || src.attorney_bar || atty.barNumber || '';
  const attyPhone = src.attorneyPhone || src.attorney_phone || atty.phone || '';
  const attyEmail = src.attorneyEmail || src.attorney_email || atty.email || '';
  const attyStreet = src.attorneyAddress || src.attorney_street || atty.streetAddress || '';
  const attyCityStateZip = src.attorneyCityStateZip || src.attorney_cityStateZip || atty.cityStateZip || '';
  return { caseNum, ucn, gName, attyName, attyBar, attyPhone, attyEmail, attyStreet, attyCityStateZip };
}

export function carryOverFieldsForPlan(sourceWard, planType) {
  const src = sourceWard || {};
  const { caseNum, ucn, gName, attyName, attyBar, attyPhone, attyEmail, attyStreet, attyCityStateZip } = extractCarryIdentity(sourceWard);
  const gs = (src.guardians && src.guardians.length ? src.guardians : src.planGuardians) || [];

  if (planType === 'planInitial') {
    const g = gs[0] || {};
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      ucn,
      county: '',
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
      ucn,
      county: '',
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
      ucn,
      county: '',
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
      county: '',
      // Milestone 58B-2: the facility or home the minor lives in. It rarely
      // changes year to year and was the one cover field the carry dropped,
      // so each new year reopened with it blank. `|| ''` deliberately: a
      // source without the field yields a blank for the filer to complete,
      // never an invented facility name carried in from somewhere else.
      q1ResidenceName: src.q1ResidenceName || '',
      ucn,
      ref: caseNum,
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
  const { caseNum, ucn, gName, attyName, attyBar, attyPhone, attyEmail, attyStreet, attyCityStateZip } = extractCarryIdentity(sourceWard);
  const gs = src.planGuardians || src.guardians || [];

  if (accountingType === 'guardian') {
    const g = gs[0] || {};
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      ucn,
      county: '',
      gid: src.inceptionDate || src.gid || '',
      guardianName: gName,
      attorneyForGuardian: attyName,
      // Milestone 40H-J: emptyDataGuardian() has no flat attorneyBar/
      // attorneyPhone/attorneyAddress/attorneyCityStateZip keys at all --
      // only attorneyForGuardian (flat name) and a nested attorney{...}
      // object, which is what validateGuardian()/pdf-model.js actually
      // read. Writing the flat keys here computed the values correctly and
      // then silently dropped them onto a shape the destination's editor,
      // validator, and PDF model never look at -- the symmetric defect to
      // 40C-F item 2 (which fixed the read side), on the write side. Mirrors
      // the nested shape legacy-app.js's carryOverAccountingToAccounting()
      // guardian branch already emits. No email field: Guardian Inventory's
      // attorney block has none, nested or flat -- attyEmail is correctly
      // computed above and correctly has nowhere to go.
      attorney: {
        name: attyName,
        barNumber: attyBar,
        phone: attyPhone,
        streetAddress: attyStreet,
        cityStateZip: attyCityStateZip,
        signatureDate: null,
        filingDate: null,
        signatureState: '',
        signatureImage: '',
      },
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
      ucn,
      county: '',
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
      ucn,
      county: '',
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
    const engine = typeof window.formEngine === 'function' ? window.formEngine(ward.inventoryType) : null;
    if (FILING_ENGINE_IDS.includes(engine)) {
      const mount = window[mountFeatureFnName(engine)];
      if (typeof mount === 'function') await mount('/');
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
  window.extractCarryIdentity = extractCarryIdentity;
}
