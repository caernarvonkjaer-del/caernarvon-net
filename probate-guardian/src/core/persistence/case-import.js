// Milestone 70, 70I: opening a backup into the case, or importing a case file
// -- the Open Backup (.sav) button and a file dropped on the window. It closes
// the filing being edited, merges the file's filings and shared records into
// the case, saves, and lands on the dashboard. Out of case-file.js, whose
// archive and save functions it uses: closing the filing (ward-lifecycle.js)
// and navigating (the router) are above the case file, which cannot import
// them.
import { auditLog } from '../activity/audit-log.js';
import { navigate } from '../navigation/router.js';
import { backfillWardPartyCounties } from '../navigation/ward-county.js';
import { filingLifecycle } from '../navigation/filing-lifecycle.js';
import { notifyProbateGuardianTabStateChanged } from '../navigation/tab-state.js';
import { validateImportFile } from '../security/input-hardening.js';
import { updateSidebar } from '../shell/sidebar.js';
import { getCaseFile } from '../state.js';
import { alertModal, confirmModal, promptModal } from '../ui/dialogs.js';
import {
  decodeWardRecord,
  decryptCaseFileCore,
  describeUnreadableParts,
  newerCaseFileFormatMessage,
  flushPendingSave,
  getJSZip,
  hideAutoExportReminder,
  rememberCaseFileHandle,
  saveData,
  saveWardToState,
  setDirtySinceExport,
  updateLastSavedIndicator,
} from './case-file.js';
import { decryptJSONWithKey, deriveKeyFromPassword, getCryptoKey, getSecurityMode } from './crypto.js';
import { loadAppState } from './launch-preferences.js';
import { clearSessionRestoreCache } from './recovery-cache.js';

export async function importSavArchiveOrWard(file, options = {}) {
  const { handle = null, isBackupFlow = false } = options;
  try {
    const JSZip = getJSZip();
    const check = await validateImportFile(file, 'sav');
    if (!check.ok) {
      await alertModal(check.message);
      return false;
    }
    const securityMode = getSecurityMode();
    let cryptoKey = getCryptoKey();
    if (securityMode === 'encrypted' && !cryptoKey) {
      await alertModal('Please unlock the app before importing a data file.');
      return false;
    }
    const zip = await JSZip.loadAsync(file);
    const manifestEntry = zip.file('manifest.json');
    if (!manifestEntry) throw new Error('Not a Guardian Forms data file (no manifest.json inside).');
    const manifest = JSON.parse(await manifestEntry.async('string'));
    if (manifest.format !== 'probate-guardian-case') throw new Error('Not a Guardian Forms data file.');
    const newerFormat = newerCaseFileFormatMessage(manifest);
    if (newerFormat) throw new Error(newerFormat);

    const currentSalt = await loadAppState('cryptoSalt');
    let key = cryptoKey;
    if (manifest.securityMode !== 'none' && manifest.salt !== currentSalt) {
      const pw = await promptModal('This file came from a different installation.\nEnter the master password that was in use when it was exported:');
      if (!pw) return false;
      key = await deriveKeyFromPassword(pw, manifest.salt);
    }

    let guardianInfo = null;
    if (manifest.guardian) {
      try {
        guardianInfo = await decryptJSONWithKey(manifest.guardian, key);
      } catch (e) {
        throw new Error('Wrong password for this file, or the file has been modified/corrupted.');
      }
    }

    const imported = [];
    // Listed in the manifest but not in the file: named in the confirmation
    // below instead of being skipped silently. (An entry that is present but
    // unreadable still stops the whole import, as it always has.)
    const unreadable = [];
    for (const entry of Array.isArray(manifest.wards) ? manifest.wards : []) {
      const f = zip.file(entry.file);
      if (!f) {
        console.warn('Case file entry missing:', entry.file);
        unreadable.push({ kind: 'filing', name: entry.wardName || '', file: entry.file || '' });
        continue;
      }
      let ward;
      try {
        ward = await decodeWardRecord(await f.async('string'), key);
      } catch (err) {
        throw new Error(`The file's data for "${entry.file}" has been modified or corrupted since it was saved — nothing was imported.`);
      }
      if (ward && ward.wardId) imported.push(ward);
    }

    const importedPartiesFile = zip.file('parties.enc');
    const importedCasesFile = zip.file('cases.enc');
    const importedPartyDismissalsFile = zip.file('partyDismissals.enc');
    // Milestone 54: deliberately no selectedCircuit here -- it lives in the
    // appState blob now (see buildCaseFileBlob()'s comment), which this
    // merge-import path has never read for anything. Importing/restoring a
    // backup must never change which circuit the current session has
    // selected.
    const {
      parties: importedParties,
      cases: importedCases,
      dismissedPartyPairs: importedPartyDismissals,
      unreadable: unreadableCore,
    } = await decryptCaseFileCore(
      {
        parties: importedPartiesFile ? await importedPartiesFile.async('string') : null,
        cases: importedCasesFile ? await importedCasesFile.async('string') : null,
        partyDismissals: importedPartyDismissalsFile ? await importedPartyDismissalsFile.async('string') : null,
      },
      key,
      { source: 'from imported file' },
    );
    if (!imported.length && !guardianInfo) throw new Error('File contained no readable data.');

    const caseFile = getCaseFile();
    const replacing = imported.filter((w) => caseFile.wards.some((x) => x.wardId === w.wardId)).length;
    const adding = imported.length - replacing;
    const promptText = isBackupFlow
      ? caseFile.wards.length === 0
        ? `Open backup containing ${imported.length} ward(s) from "${file.name}"?`
        : `Restore backup containing ${imported.length} ward(s) from "${file.name}"?\n\n• ${adding} new ward(s)\n• ${replacing} existing ward(s) will be updated\n\nDo you want to proceed?`
      : `Import ${imported.length} form(s) from "${file.name}"?\n\n• ${adding} new form(s)\n• ${replacing} will replace existing form(s) with the same ID`;
    unreadable.push(...unreadableCore);
    // A backup with parts that cannot be read: say exactly which before the
    // filer decides, and never make it the file auto-save writes to (below),
    // so the damaged original is not saved over. (master b2d97f5, carried.)
    const unreadableNote = unreadable.length
      ? `Part of this file could not be read and will not be imported:\n${describeUnreadableParts(unreadable).map((l) => `• ${l}`).join('\n')}\n\nThe file itself will not be changed or saved over.\n\n`
      : '';
    if (!(await confirmModal(unreadableNote + promptText))) return false;

    // Milestone 38C: close any open editor BEFORE replacing ward data, using
    // the real unload path. unloadWard() flushes pending values, releases the
    // ward lock, nulls focus, clears window.D and lands on the dashboard.
    // Nulling activeWardId directly instead would make
    // enterDashboardEditingFocus() early-return on its `if (!activeWardId)`
    // guard and skip all of that -- leaking the ward lock. Flushing before the
    // swap also means the save writes the ward the user was actually editing,
    // not an imported replacement of it.
    if (caseFile.activeWardId) {
      await filingLifecycle.unload();
    } else {
      await flushPendingSave();
    }

    const nextWards = [...caseFile.wards];
    for (const ward of imported) {
      const idx = nextWards.findIndex((x) => x.wardId === ward.wardId);
      if (idx >= 0) nextWards[idx] = ward;
      else nextWards.push(ward);
    }
    caseFile.wards = nextWards;

    if (!Array.isArray(caseFile.parties)) caseFile.parties = [];
    for (const party of importedParties) {
      if (party && party.id && !caseFile.parties.some((p) => p.id === party.id)) caseFile.parties.push(party);
    }
    if (!Array.isArray(caseFile.cases)) caseFile.cases = [];
    for (const c of importedCases) {
      if (c && c.id && !caseFile.cases.some((x) => x.id === c.id)) caseFile.cases.push(c);
    }
    if (!Array.isArray(caseFile.dismissedPartyPairs)) caseFile.dismissedPartyPairs = [];
    for (const pair of importedPartyDismissals) {
      if (Array.isArray(pair) && !caseFile.dismissedPartyPairs.some((p) => p[0] === pair[0] && p[1] === pair[1])) {
        caseFile.dismissedPartyPairs.push(pair);
      }
    }

    for (const ward of imported) {
      await saveWardToState(ward);
    }
    try { backfillWardPartyCounties(); }
    catch (e) { console.warn('Could not backfill ward-party counties on import', e); }
    if (guardianInfo && guardianInfo.guardianName) caseFile.guardianName = guardianInfo.guardianName;
    if (guardianInfo && guardianInfo.guardianEmail) caseFile.guardianEmail = guardianInfo.guardianEmail;

    await saveData();

    // Milestone 38C: importing or restoring data must never open an editor by
    // itself. This used to switchWard() to a legacy archive's activeWardId,
    // and failing that to wards[0] "solely because data was imported" -- both
    // of which 38C's storage table explicitly prohibits. Focus was already
    // released by the unload above; just refresh the neutral sidebar.
    if (typeof window !== 'undefined') {
      updateSidebar();
    }

    if (handle && !unreadable.length) {
      await rememberCaseFileHandle(handle);
    }

    const auditMsg = isBackupFlow
      ? `Restored backup containing ${imported.length} ward(s) from "${file.name}"`
      : `Imported ${imported.length} form(s) from "${file.name}"`;
    await auditLog('DATA_IMPORT', auditMsg, true);

    setDirtySinceExport(false);
    await clearSessionRestoreCache();
    hideAutoExportReminder();
    updateLastSavedIndicator();
    if (typeof window !== 'undefined') {
      notifyProbateGuardianTabStateChanged();
    }

    // Both flows land on the dashboard. Only the backup flow did before,
    // because a plain import relied on the switchWard() call removed above to
    // move the user somewhere; without it an import would silently leave them
    // on whatever page they were editing.
    await navigate('/dashboard');

    if (isBackupFlow) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pg:backup-restored', {
            detail: { fileName: file.name, count: imported.length },
          })
        );
      }
      await alertModal(`Backup restored: ${imported.length} ward(s) loaded.`);
    } else {
      await alertModal(`Import complete: ${imported.length} form(s) loaded.`);
    }
    return true;
  } catch (e) {
    console.error('Import failed', e);
    auditLog('DATA_IMPORT', String((e && e.message) || e), false);
    await alertModal((isBackupFlow ? 'Could not open backup file: ' : 'Import failed: ') + ((e && e.message) || e));
    return false;
  }
}

export async function importGuardianDataZip(file) {
  return importSavArchiveOrWard(file, { isBackupFlow: false });
}

export async function triggerOpenBackupSav() {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Guardian Forms backup file (.sav)', accept: { 'application/octet-stream': ['.sav', '.zip'] } }],
      });
      const file = await handle.getFile();
      await restoreBackupSavFile(file, handle);
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      console.warn('showOpenFilePicker failed or cancelled, falling back to input', e);
    }
  }
  if (typeof document !== 'undefined') {
    const inp = /** @type {HTMLInputElement|null} */ (document.getElementById('backup-import-input'));
    if (inp) {
      inp.value = '';
      inp.click();
    }
  }
}

export async function handleBackupImportChange(input) {
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  await restoreBackupSavFile(file, null);
}

export async function restoreBackupSavFile(file, handle) {
  return importSavArchiveOrWard(file, { handle, isBackupFlow: true });
}
