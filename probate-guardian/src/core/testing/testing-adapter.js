// Milestone 70, 70T: window.GuardianForms.testing -- the one way browser specs
// reach application state (MILESTONE-70-PROPOSAL.md: 70T, decisions D3 and
// D9, technical choice T3; the member list is tests/baseline/
// ms70-testing-adapter-design.json, confirmed by the owner's schema review).
//
// A thin adapter over TODAY's globals. From here on only this file's
// internals follow the migration -- the store seam in 70E, the owner flip in
// 70J, the router in 70K -- and the specs do not change again.
//
// Enablement (D3, T3). The code ships in every build, but the namespace is
// installed only when the test runner set the pre-boot flag
// window.__GUARDIAN_FORMS_TEST_MODE__ = true (a Playwright init script, before
// any application script runs). installTestingNamespace() reads the flag once
// at boot and deletes it; nothing reachable from the running UI -- a URL, a
// stored preference, a later assignment -- can enable it. On an ordinary
// launch there is no window.GuardianForms at all until 70K adds the
// production namespace (the `version` member).
//
// Rules the members keep:
//   - a query returns a copy (JSON-cloned) or a freshly built Blob/module, never
//     a live object, never key material;
//   - a command runs an existing application function and returns what it
//     returns (a promise where the function is async);
//   - patchFiling() is for SETUP only (D9): it assigns straight into the
//     active filing, bypassing the normalization, side effects and
//     validation a real edit triggers. Any test whose result depends on what
//     an edit triggers uses setField() or drives the real control.
import { initializeEmptyData } from '../filing/filing-registry.js';
import {
  PLAN_RIGHTS, PLAN_RIGHT_STATES, PLAN_ADLS, PLAN_ADL_RATINGS, PLAN_BENEFITS, emptyPlanDirective,
} from '../filing/models/plan-annual.js';
import { INITIAL_ADLS, INITIAL_ADL_RATINGS } from '../filing/models/plan-initial.js';

export const TEST_MODE_FLAG = '__GUARDIAN_FORMS_TEST_MODE__';

const copy = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

// The app's fixed reference lists a fixture may build its answers from (the
// plan rights and daily-living lists): read-only, returned as copies. Imported
// from the Plan models since Milestone 70's 70C (they were window globals).
const CONSTANT_LISTS = { PLAN_RIGHTS, PLAN_RIGHT_STATES, PLAN_ADLS, PLAN_ADL_RATINGS, PLAN_BENEFITS, INITIAL_ADLS, INITIAL_ADL_RATINGS };
export const CONSTANTS = Object.keys(CONSTANT_LISTS);

// Each filing type's validator, and the feature loader that defines it.
const VALIDATORS = {
  guardian: ['validateGuardian', 'loadGuardianFeature'],
  annual: ['validateAnnual', 'loadAnnualFeature'],
  finalAccounting: ['validateAnnual', 'loadAnnualFeature'],
  trustAccounting: ['validateAnnual', 'loadAnnualFeature'],
  simplified: ['validateSimplified', 'loadSimplifiedFeature'],
  planAnnual: ['validatePlanAnnual', 'loadPlanAnnualFeature'],
  planInitial: ['validatePlanInitial', 'loadPlanInitialFeature'],
  planMinor: ['validatePlanMinor', 'loadPlanMinorFeature'],
  planSimplified: ['validatePlanSimplified', 'loadPlanSimplifiedFeature'],
};

/** Read a dotted path ('guardians.0.name') from an object. */
function getPath(obj, path) {
  return String(path).split('.').reduce((v, k) => (v == null ? undefined : v[k]), obj);
}

/** Write a dotted path into an object, creating plain objects along the way. */
function setPath(obj, path, value) {
  const keys = String(path).split('.');
  let target = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (target[keys[i]] == null || typeof target[keys[i]] !== 'object') target[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
}

export function createTestingAdapter(w) {
  const call = (name, ...args) => {
    const fn = w[name];
    if (typeof fn !== 'function') throw new Error(`GuardianForms.testing: ${name}() is not available`);
    return fn(...args);
  };
  // The live filing record for an id, for app functions that take one; never returned.
  const filingById = (filingId) => {
    const f = ((w.caseFile && w.caseFile.wards) || []).find((x) => x.wardId === filingId);
    if (!f) throw new Error(`GuardianForms.testing: no filing ${filingId}`);
    return f;
  };
  const requireActive = (what) => {
    const d = w.D;
    if (!d || !d.wardId) throw new Error(`GuardianForms.testing.${what}: no filing is open`);
    return d;
  };

  async function openIssues() {
    const d = requireActive('validate.open');
    const type = d.inventoryType;
    const entry = VALIDATORS[type];
    if (!entry) throw new Error(`GuardianForms.testing.validate.open: unrecognized inventoryType ${JSON.stringify(type)}`);
    const [validator, loader] = entry;
    if (typeof w[validator] !== 'function' && typeof w[loader] === 'function') await w[loader]();
    return copy(call(validator) || []);
  }

  const testing = {
    /**
     * SETUP ONLY (D9). Assign `patch` into a filing in place -- top-level
     * keys as Object.assign does, dotted keys ('guardians.0.name') at their
     * path -- then schedule the save, exactly what specs did with
     * Object.assign(window.D, patch); window.autoSave(). The open filing
     * unless `filingId` names another one in the case (a dashboard spec
     * seeding several filings); one save covers every filing in the case.
     */
    patchFiling(patch, filingId) {
      const d = filingId === undefined ? requireActive('patchFiling') : filingById(filingId);
      for (const [key, value] of Object.entries(patch || {})) {
        if (key.includes('.')) setPath(d, key, copy(value));
        else d[key] = copy(value);
      }
      call('autoSave');
    },

    /**
     * SETUP ONLY (D9). Assign top-level case-file keys -- parties, cases,
     * dismissedPartyPairs, selectedCircuit, guardianName, and so on -- as copies,
     * exactly what specs did by assigning onto window.caseFile. Saves nothing.
     */
    patchCase(patch) {
      const cf = w.caseFile;
      if (!cf) throw new Error('GuardianForms.testing.patchCase: no case is open');
      for (const [key, value] of Object.entries(patch || {})) cf[key] = copy(value);
    },

    /**
     * SETUP ONLY (D9). Add a filing record to the case without opening it --
     * as another tab, or an older save, left the case -- keeping every
     * existing record, the open filing included, the same object (patchCase
     * with a new wards list would not). Saves nothing.
     */
    seedFiling(record) {
      const cf = w.caseFile;
      if (!cf) throw new Error('GuardianForms.testing.seedFiling: no case is open');
      if (!record || !record.wardId) throw new Error('GuardianForms.testing.seedFiling: a filing record needs a wardId');
      if (!Array.isArray(cf.wards)) cf.wards = [];
      if (cf.wards.some((f) => f.wardId === record.wardId)) throw new Error(`GuardianForms.testing.seedFiling: the case already has filing ${record.wardId}`);
      cf.wards.push(copy(record));
    },

    /**
     * SETUP ONLY (D9). Make the open filing exactly `filing` -- an edited copy
     * from snapshot().filing: every key it has is written, every key it lacks
     * is removed (a spec reproducing an older save's shape deletes keys), then
     * the save is scheduled. Refuses a copy of a different filing.
     */
    replaceFiling(filing) {
      const d = requireActive('replaceFiling');
      if (!filing || filing.wardId !== d.wardId) throw new Error('GuardianForms.testing.replaceFiling: that is not a copy of the open filing');
      const next = copy(filing);
      for (const key of Object.keys(d)) if (!(key in next)) delete d[key];
      Object.assign(d, next);
      call('autoSave');
    },

    /**
     * BEHAVIOR (D9). Make the edit a filer makes: the rendered control bound
     * to `path` on the current page gets the value and the events a real edit
     * fires (input, then change), so normalization, sidebar marks, saving and
     * validation all run. Throws when the control is not on the page --
     * navigate to the page that shows it first.
     */
    setField(path, value) {
      // Every attribute a rendered field is bound by: the shared listener's
      // data-field-path, the form paths, and Guardian Inventory's data-bind.
      const key = String(path).replace(/"/g, '\\"');
      const find = (extra = '') => {
        for (const attr of ['data-field-path', 'data-form-path', 'data-annual-path', 'data-bind']) {
          const el = w.document.querySelector(`[${attr}="${key}"]${extra}`);
          if (el) return el;
        }
        return null;
      };
      const control = find();
      if (!control) throw new Error(`GuardianForms.testing.setField: no control for "${path}" on this page`);
      if (control.type === 'radio') {
        const radio = find(`[value="${String(value).replace(/"/g, '\\"')}"]`);
        if (!radio) throw new Error(`GuardianForms.testing.setField: no "${value}" option for "${path}"`);
        radio.checked = true;
        radio.dispatchEvent(new w.Event('input', { bubbles: true }));
        radio.dispatchEvent(new w.Event('change', { bubbles: true }));
        return;
      }
      if (control.type === 'checkbox') control.checked = !!value;
      else control.value = value == null ? '' : String(value);
      // The form's delegated listeners (src/form-events.js) draft on input and
      // finalize on change and on focusout.
      control.dispatchEvent(new w.Event('input', { bubbles: true }));
      control.dispatchEvent(new w.Event('change', { bubbles: true }));
      control.dispatchEvent(new w.FocusEvent('focusout', { bubbles: true }));
    },

    // ── Commands ────────────────────────────────────────────────────────────
    navigate: (route) => call('navigate', route),
    save: Object.freeze({
      flush: () => call('flushPendingSave'),        // flushPendingSave()
      auto: () => call('autoSave'),                 // autoSave()
      markDirty: () => call('markDirtySinceExport'),
      /** SETUP ONLY (D9): as though the case had just been saved to its file -- nothing unsaved since. */
      markClean: () => { w._dirtySinceExport = false; },
      backupNow: () => call('saveBackupNow'),
      saveData: () => call('saveData'),
    }),
    createFiling: Object.freeze({
      // Opens the real Add Filing dialog for a type from any page; the caller
      // then fills and clicks the dialog's own controls. (A spec testing the
      // app's entry points to that dialog clicks those buttons instead.)
      openDialog: (type) => call('showAddWardModalForType', type),
      // The Simplified Accounting eligibility dialog, opened for a named ward
      // carrying over from an existing filing (the carry-over flow's entry).
      openEligibility: (name, sourceFilingId) => call('showSimplifiedEligibilityModal', name, sourceFilingId),
      add: (name, type) => call('addWard', name, type),              // addWard(name, type)
      emptyData: (type) => copy(initializeEmptyData(type)), // a copy of a blank filing
      /** A blank advance-directive card, the one a Plan's "executed directives" box adds (a copy). */
      emptyDirective: () => copy(emptyPlanDirective()),
      addRow: (schedule) => call('addEntry', schedule),
      duplicateRow: (schedule, index) => call('duplicateEntry', schedule, index),
    }),
    activateFiling: Object.freeze({
      open: (filingId) => call('switchWard', filingId),   // switchWard(id)
      close: () => call('unloadWard'),                    // unloadWard()
    }),
    deleteFiling: (filingId) => call('deleteWard', filingId),
    saveArchive: Object.freeze({
      all: () => call('exportGuardianDataZip'),                       // the Save Backup (.sav) export
      blobAs: (blob, name, validator) => call('saveBlobAs', blob, name, validator),
      finishSingle: (handle, filing) => call('finishSingleWardExport', handle, filing),
    }),
    lock: () => call('lockApp'),
    // Conditions a spec cannot reach through the UI on demand, reproduced the
    // way the app would meet them. Test mode only, like everything here.
    simulate: Object.freeze({
      /** A filing type's code has not loaded yet: its validator is not defined. */
      validatorNotLoaded(type) {
        const entry = VALIDATORS[type];
        if (!entry) throw new Error(`GuardianForms.testing.simulate.validatorNotLoaded: unrecognized type ${JSON.stringify(type)}`);
        delete w[entry[0]];
      },
    }),
    // The guided tour itself (its steps and where they attach); how a filer
    // reaches the Help panel's "Start guided tour" is not what this starts.
    tour: Object.freeze({ start: () => call('startWalkthrough') }),
    saveOutput: Object.freeze({
      // Each starts that filing type's real Save as PDF / Save as Excel.
      pdfGuardian: () => call('doSavePdfGuardian'),
      excelGuardian: () => call('doSaveExcelGuardian'),
      pdfPlanAnnual: () => call('doSavePdfPlanAnnual'),
      pdfPlanInitial: () => call('doSavePdfPlanInitial'),
      pdfPlanMinor: () => call('doSavePdfPlanMinor'),
    }),
    recoveryCache: Object.freeze({
      save: () => call('saveSessionRestoreCache'),
      clear: () => call('clearSessionRestoreCache'),
    }),
    launchState: Object.freeze({ rememberHandle: (handle) => call('rememberCaseFileHandle', handle) }),
    filingLock: Object.freeze({
      acquire: (filingId) => call('acquireWardLock', filingId),
      release: () => call('releaseWardLock'),
    }),
    convertFiling: Object.freeze({
      convert: (sourceFilingId, targetType) => call('convertExistingWard', sourceFilingId, targetType),
      /** The Convert dialog (its entry points are the dashboard's; the dialog is what specs test). */
      openDialog: () => call('showConvertWardModal'),
      /** The target types a filing type may convert to, as the app lists them (a copy). */
      targetsFor: (type) => copy(call('convertTargetsFor', type)),
      /** The app's own description of a conversion. */
      describe: (fromType, toType) => copy(call('describeConversion', fromType, toType)),
    }),
    /** Opens an already-parsed case-file zip as the whole case (loadCaseFileFromZip()). */
    importArchive: (zip, manifest, key = null) => call('loadCaseFileFromZip', zip, manifest, key),
    setTestSystemTitleWarning: (enabled) => call('setTestSystemTitleWarningEnabledForTest', enabled),
    year: Object.freeze({
      startNew: (filingId) => call('startNewWardYear', filingId),
      switchTo: (filingId, yearKey) => call('switchWardYear', filingId, yearKey),
    }),
    /** Appends an Activity Log entry (auditLog()). */
    recordActivity: (type, details, success = true, filingId = null) => call('auditLog', type, details, success, filingId),
    refreshStatus() { call('updateNavDots'); call('updateSidebar'); },

    // ── Queries (copies) ────────────────────────────────────────────────────
    /** The case and the open filing, as copies. */
    snapshot() {
      const cf = w.caseFile || {};
      return copy({
        caseFile: cf,
        filing: w.D && w.D.wardId ? w.D : null,
        activeFilingId: cf.activeWardId ?? null,
        currentPage: w.currentPage ?? null,
        activeInventoryType: w.activeInventoryType ?? null,
        dirtySinceExport: !!w._dirtySinceExport,
        hasUnsavedChanges: typeof w.pgHasUnsavedChanges === 'function' ? !!w.pgHasUnsavedChanges() : null,
      });
    },
    /** One field of the open filing, by dotted path, as a copy. */
    field: (path) => copy(getPath(requireActive('field'), path)),
    /** A copy of one of the app's fixed reference lists (CONSTANTS). */
    constants(name) {
      if (!CONSTANTS.includes(name)) throw new Error(`GuardianForms.testing.constants: ${name} is not a published list`);
      return copy(CONSTANT_LISTS[name]);
    },
    generateOutput: Object.freeze({
      // Each hands back that filing type's PDF builders (a module, not state).
      guardianPdf: () => call('loadGuardianPdf'),
      annualPdf: () => call('loadAnnualPdf'),
      simplifiedPdf: () => call('loadSimplifiedPdf'),
      planAnnualPdf: () => call('loadPlanAnnualPdf'),
      planInitialPdf: () => call('loadPlanInitialPdf'),
      planMinorPdf: () => call('loadPlanMinorPdf'),
      planSimplifiedPdf: () => call('loadPlanSimplifiedPdf'),
    }),
    persistenceState: Object.freeze({
      /** A copy of one saved app-state value (loadAppState(key)). */
      appState: async (key) => copy(await call('loadAppState', key)),
      /** A copy of the recovery snapshot record, as stored (its entries still encrypted). */
      sessionCache: async () => copy(await call('_sessionCacheGet')),
      /** One stored entry decrypted with the key held in memory; the key itself never leaves. */
      decrypt: async (enc) => copy(await call('decryptJSONWithKey', enc, w._cryptoKey ?? null)),
      hasOpenedBefore: () => call('hasOpenedCaseBefore'),
      /** The remembered case file's name, never the handle. */
      async caseFileName() { const h = await call('loadCaseFileHandle'); return h ? h.name : null; },
      /** Whether an encryption key is held in memory -- a yes or no, never the key. */
      keyHeld: () => !!w._cryptoKey,
      securityMode: () => w._securityMode ?? null,
      lockedFilingId: () => call('getCurrentLockedWardId'),
      recentFilings: () => copy(call('getRecentlyOpenedWards')),
      continuePromptShown: () => !!call('isContinuePromptShown'),
      auditEntries: async () => copy(await call('loadAuditLogEntries')),
      /** Reads a remembered file handle with the app's own timeout (readRememberedFile()). */
      readRememberedFile: (handle, timeoutMs) => call('readRememberedFile', handle, timeoutMs),
    }),
    sharedRecords: Object.freeze({
      // Copies of the Party and Case records (src/core/party-resolver.js, case-resolver.js).
      resolveParty: (partyId) => copy(call('resolveParty', partyId)),
      resolveCase: (caseId) => copy(call('resolveCase', caseId)),
      /** Whether two parties were marked "not the same person" (either order). */
      isPartyPairDismissed: (idA, idB) => !!call('isPartyPairDismissed', idA, idB),
      wardPartyForFiling: (filingId) => copy(call('wardPartyForFiling', filingById(filingId))),
      /** The case groups for the given filings (all of them when omitted). */
      casesGroupingWards: (filingIds) => copy(call('casesGroupingWards',
        filingIds ? filingIds.map(filingById) : ((w.caseFile && w.caseFile.wards) || []))),
    }),
    // Changes to the shared Party and Case records -- setup, like patchFiling().
    // Each takes filing ids, never live objects, and returns copies.
    updateSharedRecords: Object.freeze({
      createCase: (fields) => copy(call('createCase', fields)),
      getOrCreateCaseForWard: (filingId) => copy(call('getOrCreateCaseForWard', filingById(filingId))),
      /** A new Party of `role` with `fields` applied, as a copy. */
      createParty(role, fields = {}) {
        const party = call('createParty', role);
        Object.assign(party, copy(fields));
        return copy(party);
      },
      dismissPartyPair: (idA, idB) => call('dismissPartyPair', idA, idB),
      /** Merge `discardId` into `keepId` (mergeParties()), as a copy of what it returns. */
      mergeParties: (keepId, discardId, options) => copy(call('mergeParties', keepId, discardId, options)),
      ensureWardPartyForFiling: (filingId) => copy(call('ensureWardPartyForFiling', filingById(filingId))),
      addSignatureImage: (partyId, imageData, options) => {
        const party = call('resolveParty', partyId);
        if (!party) throw new Error(`GuardianForms.testing.updateSharedRecords.addSignatureImage: no party ${partyId}`);
        return copy(call('addSignatureImage', party, imageData, options));
      },
    }),
    observe: Object.freeze({
      /**
       * Replaces the app's save scheduler with a counter, as specs used to do
       * by assigning window.autoSave themselves: edits then count, and save
       * nothing, until restore() is called.
       */
      countAutoSaves() {
        const original = w.autoSave;
        let count = 0;
        w.autoSave = () => { count += 1; };
        return Object.freeze({ get count() { return count; }, restore() { w.autoSave = original; } });
      },
    }),
    validate: Object.freeze({
      /** The open filing's own validator's issues (validateGuardian() and kin), as copies. */
      open: openIssues,
      /**
       * The same issues in the structured form the readiness card, the
       * blocked-export panel and the jump links receive them
       * (adaptValidationErrors(), with the filing's own type), as copies.
       */
      async structured() {
        const d = requireActive('validate.structured');
        return copy(call('adaptValidationErrors', await openIssues(), d.inventoryType));
      },
      /**
       * What the export gate says about the open filing -- prepareFilingOutput(),
       * which export itself runs over the type's validator: its messages and
       * whether it may export, as copies. Judged on a copy, as fixture() is:
       * prepareFilingOutput() commits stored date drafts into what it is
       * given, and a query changes nothing.
       */
      async exportGate() {
        const d = requireActive('validate.exportGate');
        const entry = VALIDATORS[d.inventoryType];
        if (!entry) throw new Error(`GuardianForms.testing.validate.exportGate: unrecognized inventoryType ${JSON.stringify(d.inventoryType)}`);
        const [validator, loader] = entry;
        if (typeof w[validator] !== 'function' && typeof w[loader] === 'function') await w[loader]();
        const filing = copy(d);
        const previous = w.D;
        w.D = filing;
        try {
          const prepared = call('prepareFilingOutput', filing, () => call(validator, filing));
          return copy({ messages: prepared.messages, canExport: prepared.canExport });
        } finally {
          w.D = previous;
        }
      },
      /**
       * The export-gate issues for a filing that exists only as data: the
       * app's own blank filing of that type with `fixture` on top, JSON
       * round-tripped as storage would, judged by the type's validator and
       * prepareFilingOutput(). The open filing is restored afterwards.
       */
      async fixture(fixture) {
        const type = fixture && fixture.inventoryType;
        const entry = VALIDATORS[type];
        if (!entry) throw new Error(`GuardianForms.testing.validate.fixture: unrecognized inventoryType ${JSON.stringify(type)}`);
        const [validator, loader] = entry;
        if (typeof w[validator] !== 'function' && typeof w[loader] === 'function') await w[loader]();
        const filing = copy({ ...initializeEmptyData(type), ...fixture });
        const previous = w.D;
        w.D = filing;
        try {
          const raw = call(validator, filing) || [];
          const prepared = call('prepareFilingOutput', filing, raw);
          return (prepared.structuredIssues || []).map((i) => ({
            code: String(i?.code || ''), message: String(i?.message || ''), bypassable: i?.bypassable !== false,
          }));
        } finally {
          w.D = previous;
        }
      },
    }),
    status: Object.freeze({
      navChecks: () => copy(call('computeNavChecks')),                 // computeNavChecks()
      progress: (filingId) => copy(call('getWardProgress', (w.caseFile.wards || []).find((x) => x.wardId === filingId))),
      /** The Annual family's totals for the open filing (calcTotalsAnnual()), as a copy. */
      annualTotals: () => copy(call('calcTotalsAnnual', requireActive('status.annualTotals'))),
      /** The Annual family's balance check for the open filing (annualReconcileState()): diff, outOfBalance, explanation, explained. */
      annualReconcile: () => {
        const d = requireActive('status.annualReconcile');
        return copy(call('annualReconcileState', call('calcTotalsAnnual', d), d));
      },
      /** Guardian Inventory's totals for the open filing (calcTotalsGuardian()), as a copy. */
      guardianTotals: () => copy(call('calcTotalsGuardian', requireActive('status.guardianTotals'))),
    }),
    exportArchive: Object.freeze({
      caseFile: async () => (await call('buildCaseFileBlob')).blob,   // a fresh Blob
      singleFiling: (filingId) => call('buildSingleWardExportBlob', filingId),
    }),
  };
  return Object.freeze(testing);
}

/**
 * Called once by the composition root (src/main.js) before anything else.
 * Reads and deletes the runner-owned flag; installs window.GuardianForms with
 * the testing member only when the flag was exactly `true`.
 */
export function installTestingNamespace(w = typeof window !== 'undefined' ? window : undefined) {
  if (!w) return false;
  // Read by its literal name so the window-bridge audit lists it: the one
  // runner-owned global (T3), never an application one.
  const enabled = w.__GUARDIAN_FORMS_TEST_MODE__ === true;
  try { delete w.__GUARDIAN_FORMS_TEST_MODE__; } catch { w.__GUARDIAN_FORMS_TEST_MODE__ = undefined; }
  // Installed once: a second call never replaces (or re-enables) it.
  if (!enabled || w.GuardianForms) return false;
  Object.defineProperty(w, 'GuardianForms', {
    value: Object.freeze({ testing: createTestingAdapter(w) }),
    writable: false, configurable: false, enumerable: false,
  });
  return true;
}
