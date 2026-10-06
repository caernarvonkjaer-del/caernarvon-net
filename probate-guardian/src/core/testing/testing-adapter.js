// Milestone 70, 70T: window.GuardianForms.testing -- the one way browser specs
// reach application state (MILESTONE-70-PROPOSAL.md: 70T, decisions D3 and
// D9, technical choice T3; the member list is tests/baseline/
// ms70-testing-adapter-design.json, confirmed by the owner's schema review).
//
// Written as a thin adapter over the globals of the time; since then only this
// file's internals followed the migration -- the store seam in 70E, the owner
// flip in 70J, the router and bootstrap in 70K -- and the specs did not change.
// Since 70K each member runs an application function from an explicit table
// (applicationImplementations(), below): imported, or -- a filing feature's
// own, which core may not import -- reached through the feature services. It
// looked each one up on window by name.
//
// Enablement (D3, T3). The code ships in every build, but the member is
// installed only when the test runner set the pre-boot flag
// window.__GUARDIAN_FORMS_TEST_MODE__ = true (a Playwright init script, before
// any application script runs). src/core/runtime/browser-api.js reads the flag
// once at boot and deletes it; nothing reachable from the running UI -- a URL,
// a stored preference, a later assignment -- can enable it. On an ordinary
// launch window.GuardianForms holds only the version.
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
import { formEngine, initializeEmptyData } from '../filing/filing-registry.js';
import { sectionMarks, filingProgress } from '../status/section-marks.js';
import {
  PLAN_RIGHTS, PLAN_RIGHT_STATES, PLAN_ADLS, PLAN_ADL_RATINGS, PLAN_BENEFITS, emptyPlanDirective,
} from '../filing/models/plan-annual.js';
import { INITIAL_ADLS, INITIAL_ADL_RATINGS } from '../filing/models/plan-initial.js';
import { updateNavDots } from '../status/nav-marks.js';
import { showAddWardModalForType } from '../modals/filing-dialogs.js';
import { startWalkthrough } from '../help/walkthrough.js';
import { updateSidebar } from '../shell/sidebar.js';
import { filingLifecycle } from '../navigation/filing-lifecycle.js';
import { describeConversion } from '../filing/conversion.js';
import { planImport, runImportTransaction } from '../excel/import-transaction.js';
import { confirmImport } from '../excel/import-confirm.js';
import { alertModal } from '../ui/dialogs.js';
import { getRecentlyOpenedWards } from '../filing/recent-filings.js';
import { showSimplifiedEligibilityModal } from '../modals/filing-dialogs.js';
import { showConvertWardModal } from '../modals/convert-ward-modal.js';
import { FILING_TYPE_KEYS, convertTargetsFor } from '../filing/filing-descriptor.js';
// Milestone 70, 70I: what left the monolith, and the state no longer on window.
import { getActiveInventoryType, getCaseFile, getD, replaceSaveHook, requestSave, withFilingInView } from '../state.js';
import { flushPendingSave, saveData } from '../persistence/case-file.js';
import { loadCaseFileFromZip } from '../persistence/case-reader.js';
import { getCryptoKey, getSecurityMode } from '../persistence/crypto.js';
import { isDirtySinceExport, setDirtySinceExport } from '../persistence/export-state.js';
import { isContinuePromptShown } from '../persistence/launch-preferences.js';
import { _sessionCacheGet } from '../persistence/recovery-cache.js';
import { auditLog, loadAuditLogEntries } from '../activity/audit-log.js';
import { lockApp } from '../security/app-lock.js';
// Milestone 70, 70K: what the members ran through window by name.
import { features } from '../runtime/features.js';
import { getCurrentPage, navigate } from '../navigation/router.js';
import {
  buildCaseFileBlob, buildSingleWardExportBlob, exportCaseFileZip, finishSingleWardExport, loadCaseFileHandle,
  markDirtySinceExport, rememberCaseFileHandle, saveBackupNow, saveBlobAs,
} from '../persistence/case-file.js';
import { clearSessionRestoreCache, saveSessionRestoreCache } from '../persistence/recovery-cache.js';
import { hasOpenedCaseBefore, loadAppState, readRememberedFile } from '../persistence/launch-preferences.js';
import { decryptJSONWithKey } from '../persistence/crypto.js';
import { acquireWardLock, getCurrentLockedWardId, releaseWardLock } from '../ward-lock.js';
import { setTestSystemTitleWarningEnabledForTest } from '../ui/test-system-title.js';
import {
  addSignatureImage, createParty, dismissPartyPair, isPartyPairDismissed, mergeParties, resolveParty,
} from '../party-resolver.js';
import { casesGroupingWards, createCase, getOrCreateCaseForWard, resolveCase } from '../case-resolver.js';
import { ensureWardPartyForFiling, wardPartyForFiling } from '../navigation/ward-county.js';
import { adaptValidationErrors } from '../validation/validation-adapter.js';
import { prepareFilingOutput } from '../filing/output-preflight.js';
import { evaluateFiling } from '../validation/engines/index.js';
import { excelWriteRecorder } from '../excel/excel-engine.js';

export const TEST_MODE_FLAG = '__GUARDIAN_FORMS_TEST_MODE__';

const copy = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

// The app's fixed reference lists a fixture may build its answers from (the
// plan rights and daily-living lists): read-only, returned as copies. Imported
// from the Plan models since Milestone 70's 70C (they were window globals).
const CONSTANT_LISTS = { PLAN_RIGHTS, PLAN_RIGHT_STATES, PLAN_ADLS, PLAN_ADL_RATINGS, PLAN_BENEFITS, INITIAL_ADLS, INITIAL_ADL_RATINGS };
export const CONSTANTS = Object.keys(CONSTANT_LISTS);

// The filing types a validate query accepts -- every one: each is judged by
// its engine's validator (Final and Trust by the Annual one), which its
// feature defines.
const VALIDATED_TYPES = FILING_TYPE_KEYS;

/**
 * The application functions the members run, by the names they use. A filing
 * feature's own (its row commands, its Save as PDF, its validator) comes
 * through the feature services; everything else is imported. A unit test
 * passes its own table instead.
 */
export function applicationImplementations() {
  // A command of the open filing's feature, which has loaded to show it.
  const loadedFeature = (id, name) => (...args) => {
    const fn = features().loaded(id)?.[name];
    if (typeof fn !== 'function') throw new Error(`GuardianForms.testing: ${name}() is not available -- its filing is not open`);
    return fn(...args);
  };
  return {
    navigate, getCurrentPage,
    markDirtySinceExport, saveBackupNow, exportGuardianDataZip: exportCaseFileZip, saveBlobAs, finishSingleWardExport,
    addEntry: loadedFeature('guardian', 'addEntry'),
    duplicateEntry: loadedFeature('guardian', 'duplicateEntry'),
    doSavePdfGuardian: () => features().run('guardian', 'doSavePdfGuardian'),
    doSaveExcelGuardian: () => features().run('guardian', 'doSaveExcelGuardian'),
    doSavePdfPlanAnnual: () => features().run('planAnnual', 'doSavePdfPlanAnnual'),
    doSavePdfPlanInitial: () => features().run('planInitial', 'doSavePdfPlanInitial'),
    doSavePdfPlanMinor: () => features().run('planMinor', 'doSavePdfPlanMinor'),
    saveSessionRestoreCache, clearSessionRestoreCache, rememberCaseFileHandle,
    acquireWardLock, releaseWardLock, getCurrentLockedWardId,
    setTestSystemTitleWarningEnabledForTest,
    loadGuardianPdf: () => features().pdf.guardian(),
    loadAnnualPdf: () => features().pdf.annual(),
    loadSimplifiedPdf: () => features().pdf.simplified(),
    loadPlanAnnualPdf: () => features().pdf.planAnnual(),
    loadPlanInitialPdf: () => features().pdf.planInitial(),
    loadPlanMinorPdf: () => features().pdf.planMinor(),
    loadPlanSimplifiedPdf: () => features().pdf.planSimplified(),
    loadAppState, decryptJSONWithKey, hasOpenedCaseBefore, loadCaseFileHandle, readRememberedFile,
    resolveParty, resolveCase, isPartyPairDismissed, wardPartyForFiling, casesGroupingWards,
    createCase, getOrCreateCaseForWard, createParty, dismissPartyPair, mergeParties, ensureWardPartyForFiling,
    addSignatureImage, adaptValidationErrors, prepareFilingOutput, evaluateFiling,
    loadFeature: (engine) => features().load(engine),
    validatorFor: (engine) => features().validator(engine),
    loadedFeatures: () => features().loadedFeatures(),
    sectionMarks, filingProgress,
    calcTotalsAnnual: (d) => features().totals.annual(d),
    annualReconcileState: (t, d) => features().totals.annualReconcile(t, d),
    calcTotalsGuardian: (d) => features().totals.guardian(d),
    buildCaseFileBlob, buildSingleWardExportBlob,
  };
}

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

export function createTestingAdapter(w, impl = applicationImplementations()) {
  const call = (name, ...args) => {
    const fn = impl[name];
    if (typeof fn !== 'function') throw new Error(`GuardianForms.testing: ${name}() is not available`);
    return fn(...args);
  };
  // A filing type's validator, its feature loaded first.
  async function validatorFor(type, what) {
    if (!VALIDATED_TYPES.includes(type)) throw new Error(`GuardianForms.testing.${what}: unrecognized inventoryType ${JSON.stringify(type)}`);
    const engine = formEngine(type);
    await call('loadFeature', engine);
    const validate = call('validatorFor', engine);
    if (typeof validate !== 'function') throw new Error(`GuardianForms.testing.${what}: the ${engine} validator is not available`);
    return validate;
  }
  // The live filing record for an id, for app functions that take one; never returned.
  const filingById = (filingId) => {
    const f = (getCaseFile().wards || []).find((x) => x.wardId === filingId);
    if (!f) throw new Error(`GuardianForms.testing: no filing ${filingId}`);
    return f;
  };
  const requireActive = (what) => {
    const d = getD();
    if (!d || !d.wardId) throw new Error(`GuardianForms.testing.${what}: no filing is open`);
    return d;
  };

  async function openIssues() {
    const d = requireActive('validate.open');
    const validate = await validatorFor(d.inventoryType, 'validate.open');
    return copy(validate() || []);
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
      requestSave();
    },

    /**
     * SETUP ONLY (D9). Assign top-level case-file keys -- parties, cases,
     * dismissedPartyPairs, selectedCircuit, guardianName, and so on -- as copies,
     * exactly what specs did by assigning onto window.caseFile. Saves nothing.
     */
    patchCase(patch) {
      const cf = getCaseFile();
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
      const cf = getCaseFile();
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
      requestSave();
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
      flush: () => flushPendingSave(),
      auto: () => requestSave(),                    // autoSave(), through the case store
      markDirty: () => call('markDirtySinceExport'),
      /** SETUP ONLY (D9): as though the case had just been saved to its file -- nothing unsaved since. */
      markClean: () => { setDirtySinceExport(false); },
      backupNow: () => call('saveBackupNow'),
      saveData: () => saveData(),
    }),
    createFiling: Object.freeze({
      // Opens the real Add Filing dialog for a type from any page; the caller
      // then fills and clicks the dialog's own controls. (A spec testing the
      // app's entry points to that dialog clicks those buttons instead.)
      openDialog: (type) => showAddWardModalForType(type),
      // The Simplified Accounting eligibility dialog, opened for a named ward
      // carrying over from an existing filing (the carry-over flow's entry).
      openEligibility: (name, sourceFilingId) => showSimplifiedEligibilityModal(name, sourceFilingId),
      add: (name, type) => filingLifecycle.create(name, type),
      emptyData: (type) => copy(initializeEmptyData(type)), // a copy of a blank filing
      /** A blank advance-directive card, the one a Plan's "executed directives" box adds (a copy). */
      emptyDirective: () => copy(emptyPlanDirective()),
      addRow: (schedule) => call('addEntry', schedule),
      duplicateRow: (schedule, index) => call('duplicateEntry', schedule, index),
    }),
    activateFiling: Object.freeze({
      open: (filingId) => filingLifecycle.switchTo(filingId),
      close: () => filingLifecycle.unload(),
    }),
    deleteFiling: (filingId) => filingLifecycle.remove(filingId),
    saveArchive: Object.freeze({
      all: () => call('exportGuardianDataZip'),                       // the Save Backup (.sav) export
      blobAs: (blob, name, validator) => call('saveBlobAs', blob, name, validator),
      finishSingle: (handle, filing) => call('finishSingleWardExport', handle, filing),
    }),
    lock: () => lockApp(),
    // The guided tour itself (its steps and where they attach); how a filer
    // reaches the Help panel's "Start guided tour" is not what this starts.
    tour: Object.freeze({ start: () => startWalkthrough() }),
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
      convert: (sourceFilingId, targetType) => filingLifecycle.convert(sourceFilingId, targetType),
      /** The Convert dialog (its entry points are the dashboard's; the dialog is what specs test). */
      openDialog: () => showConvertWardModal(),
      /** The target types a filing type may convert to, as the app lists them (a copy). */
      targetsFor: (type) => copy(convertTargetsFor(type)),
      /** The app's own description of a conversion. */
      describe: (fromType, toType) => copy(describeConversion(fromType, toType)),
    }),
    /**
     * Milestone 73E part 1: the import transaction (src/core/excel/
     * import-transaction.js) and its confirmation, which no importer uses
     * until 73T parts 2-4. `plan` is what importing `draft` into the open
     * filing would change and ask, as a copy; `confirm` shows a plan's
     * confirmation and resolves the filer's choices, or null; `run` imports
     * `draft` into the open filing through the whole transaction -- the
     * confirmation, the commit, the redraw and the notice.
     */
    importTransaction: Object.freeze({
      plan: (draft, options) => copy(planImport(requireActive('importTransaction.plan'), draft, options)),
      confirm: (plan, options) => confirmImport(plan, options),
      run: async (draft, { sourceName = '', workbookType = '', notCarried = [] } = {}) => copy(await runImportTransaction({
        filing: requireActive('importTransaction.run'),
        adapter: async () => ({ draft, sourceName, workbookType, notCarried }),
        confirmChoices: (plan) => confirmImport(plan, { sourceName }),
        redraw: () => navigate(getCurrentPage() || '/'),
        notify: (notice) => alertModal({ title: 'Import complete', message: notice }),
      })),
    }),
    /** Opens an already-parsed case-file zip as the whole case (loadCaseFileFromZip()). */
    importArchive: (zip, manifest, key = null) => loadCaseFileFromZip(zip, manifest, key),
    setTestSystemTitleWarning: (enabled) => call('setTestSystemTitleWarningEnabledForTest', enabled),
    year: Object.freeze({
      startNew: (filingId) => filingLifecycle.newYear(filingId),
      switchTo: (filingId, yearKey) => filingLifecycle.switchYear(filingId, yearKey),
    }),
    /** Appends an Activity Log entry (auditLog()). */
    recordActivity: (type, details, success = true, filingId = null) => auditLog(type, details, success, filingId),
    refreshStatus() { updateNavDots(); updateSidebar(); },

    // ── Queries (copies) ────────────────────────────────────────────────────
    /** The case and the open filing, as copies. */
    snapshot() {
      const cf = getCaseFile();
      return copy({
        caseFile: cf,
        filing: getD().wardId ? getD() : null,
        activeFilingId: cf.activeWardId ?? null,
        currentPage: call('getCurrentPage') ?? null,
        activeInventoryType: getActiveInventoryType(),
        dirtySinceExport: !!isDirtySinceExport(),
        hasUnsavedChanges: !!isDirtySinceExport(),
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
      sessionCache: async () => copy(await _sessionCacheGet()),
      /** One stored entry decrypted with the key held in memory; the key itself never leaves. */
      decrypt: async (enc) => copy(await call('decryptJSONWithKey', enc, getCryptoKey() ?? null)),
      hasOpenedBefore: () => call('hasOpenedCaseBefore'),
      /** The remembered case file's name, never the handle. */
      async caseFileName() { const h = await call('loadCaseFileHandle'); return h ? h.name : null; },
      /** Whether an encryption key is held in memory -- a yes or no, never the key. */
      keyHeld: () => !!getCryptoKey(),
      securityMode: () => getSecurityMode() ?? null,
      lockedFilingId: () => call('getCurrentLockedWardId'),
      recentFilings: () => copy(getRecentlyOpenedWards()),
      continuePromptShown: () => !!isContinuePromptShown(),
      auditEntries: async () => copy(await loadAuditLogEntries()),
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
        filingIds ? filingIds.map(filingById) : (getCaseFile().wards || []))),
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
       * nothing, until restore() is called. Since Milestone 70's 70I every
       * save request goes through the case store's hook, which this swaps.
       */
      countAutoSaves() {
        let count = 0;
        const restore = replaceSaveHook(() => { count += 1; });
        return Object.freeze({ get count() { return count; }, restore() { restore(); } });
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
      /**
       * Milestone 73F part 1: the open filing's evaluation by the shared
       * export checks (src/core/validation/engines/) -- its blockers (with the
       * outputs each blocks), advisories and sidebar-only prompts -- judged on
       * a copy, as copies. Nothing in the app reads this yet (73F part 2).
       */
      evaluate() {
        const d = requireActive('validate.evaluate');
        return copy(call('evaluateFiling', d));
      },
      async exportGate() {
        const d = requireActive('validate.exportGate');
        const validate = await validatorFor(d.inventoryType, 'validate.exportGate');
        const filing = copy(d);
        return withFilingInView(filing, () => {
          const prepared = call('prepareFilingOutput', filing, () => validate(filing));
          return copy({ messages: prepared.messages, canExport: prepared.canExport });
        });
      },
      /**
       * The export-gate issues for a filing that exists only as data: the
       * app's own blank filing of that type with `fixture` on top, JSON
       * round-tripped as storage would, judged by the type's validator and
       * prepareFilingOutput(). The open filing is restored afterwards.
       */
      async fixture(fixture) {
        const type = fixture && fixture.inventoryType;
        const validate = await validatorFor(type, 'validate.fixture');
        const filing = copy({ ...initializeEmptyData(type), ...fixture });
        return withFilingInView(filing, () => {
          const raw = validate(filing) || [];
          const prepared = call('prepareFilingOutput', filing, raw);
          return (prepared.structuredIssues || []).map((i) => ({
            code: String(i?.code || ''), message: String(i?.message || ''), bypassable: i?.bypassable !== false,
          }));
        });
      },
    }),
    status: Object.freeze({
      /** The open filing's section marks, { checks, incomplete } (the sidebar's; section-marks.js). */
      navChecks: () => copy(call('sectionMarks', getD(), getActiveInventoryType())),
      /** A filing's progress (the dashboard's filingProgress()). */
      progress: (filingId) => copy(call('filingProgress', (getCaseFile().wards || []).find((x) => x.wardId === filingId))),
      /** The Annual family's totals for the open filing (calcTotalsAnnual()), as a copy. */
      annualTotals: () => copy(call('calcTotalsAnnual', requireActive('status.annualTotals'))),
      /** The Annual family's balance check for the open filing (annualReconcileState()): diff, outOfBalance, explanation, explained. */
      annualReconcile: () => {
        const d = requireActive('status.annualReconcile');
        return copy(call('annualReconcileState', call('calcTotalsAnnual', d), d));
      },
      /** Guardian Inventory's totals for the open filing (calcTotalsGuardian()), as a copy. */
      guardianTotals: () => copy(call('calcTotalsGuardian', requireActive('status.guardianTotals'))),
      /**
       * The feature packs loaded so far, by id ('dashboard', 'annual', ...),
       * as a copy: a filing's code runs only once one of its pages is shown
       * (Milestone 70, 70K; it was visible as window.validate<Type> appearing).
       */
      loadedFeatures: () => copy(call('loadedFeatures')),
    }),
    /**
     * Milestone 72A. Every cell an Excel export writes, for the export guard
     * (tests/e2e/excel-form-field-placement.spec.ts): start() before clicking
     * Save as Excel, stop() after the download to get [{sheet, aimed,
     * landed}] -- landed differs from aimed when the address was a covered
     * member of a merged range. See excelWriteRecorder in excel-engine.js.
     */
    excelWrites: Object.freeze({
      start: () => excelWriteRecorder.start(),
      stop: () => copy(excelWriteRecorder.stop()),
    }),
    exportArchive: Object.freeze({
      caseFile: async () => (await call('buildCaseFileBlob')).blob,   // a fresh Blob
      singleFiling: (filingId) => call('buildSingleWardExportBlob', filingId),
    }),
  };
  return Object.freeze(testing);
}
