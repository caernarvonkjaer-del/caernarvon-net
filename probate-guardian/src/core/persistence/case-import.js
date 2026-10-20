// Milestone 70, 70I: bringing a backup into the case -- the Restore from Backup
// button and a file dropped on the window -- and, since Milestone 76D, Open
// Case File, which switches to another case file. Out of case-file.js, whose
// archive and save functions it uses: closing the filing (ward-lifecycle.js)
// and navigating (the router) are above the case file, which cannot import
// them.
//
// Milestone 76D (decision 76D-1, the requester's, 2026-10-19): Open Backup did
// two jobs at once and did both badly. It merged the backup into the open
// case, replacing each filing in both with the backup's copy however much
// older ("1 existing ward(s) will be updated"), bringing back filings the
// filer had deleted, and then made the backup the case's file -- reopened at
// the next launch, auto-save stopped until Save Backup wrote it, and that
// save rewrote a password-protected backup with the open case's password, or
// with none. Now:
// - Restore from Backup merges, filing by filing, as the filer chooses: each
//   filing in both is shown with both copies' last-edited dates; filings only
//   the backup has are offered, not silently added; the open case's file and
//   password never change; a protected backup's filings going into a case
//   with no password are warned about first.
// - Open Case File saves the open case (or says it can't), then closes it to
//   the start screen, where the other file opens with its own password.
import { auditLog } from '../activity/audit-log.js';
import { navigate } from '../navigation/router.js';
import { DRAW } from '../navigation/draw-reason.js';
import { backfillWardPartyCounties } from '../navigation/ward-county.js';
import { filingLifecycle } from '../navigation/filing-lifecycle.js';
import { notifyProbateGuardianTabStateChanged } from '../navigation/tab-state.js';
import { formDisplayName } from '../filing/filing-registry.js';
import { validateImportFile } from '../security/input-hardening.js';
import { updateSidebar } from '../shell/sidebar.js';
import { getCaseFile } from '../state.js';
import { alertModal, choicesModal, confirmModal, promptModal } from '../ui/dialogs.js';
import {
  decodeWardRecord,
  decryptCaseFileCore,
  describeUnreadableParts,
  newerCaseFileFormatMessage,
  flushPendingSave,
  forgetCaseFileHandle,
  getJSZip,
  saveData,
  saveWardToState,
  setDirtySinceExport,
  updateLastSavedIndicator,
} from './case-file.js';
import { recordText } from './case-merge.js';
import { decryptJSONWithKey, deriveKeyFromPassword, getCryptoKey, getSecurityMode, kdfIterationsOf, plainPartsRefused } from './crypto.js';
import { isDirtySinceExport } from './export-state.js';
import { loadAppState } from './launch-preferences.js';
import { clearLastPosition } from './recovery-cache.js';

/** "edited 10/12/2026, 3:04 PM", or the last save's date, marked approximate, for a filing saved before 76D. */
export function editedLabel(filing) {
  const when = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  if (filing && filing.lastEdited && when(filing.lastEdited)) return `edited ${when(filing.lastEdited)}`;
  if (filing && filing.lastModified && when(filing.lastModified)) return `last saved ${when(filing.lastModified)} (approximate)`;
  return 'no date recorded';
}

function filingTitle(filing) {
  const form = formDisplayName(filing && filing.inventoryType);
  const who = (filing && filing.wardName) || '(unnamed)';
  return form ? `The ${form} for ${who}` : `The filing for ${who}`;
}

/**
 * What a backup would bring: each filing in both that differs (`both`), each
 * filing only the backup has (`added`), and the people and case records the
 * open case lacks. Filings the same in both, apart from their save stamps,
 * are left alone and not asked about.
 */
export function restorePlan(caseFile, imported, importedParties = [], importedCases = []) {
  const current = new Map((caseFile.wards || []).map((w) => [w.wardId, w]));
  const both = [];
  const added = [];
  for (const backup of imported) {
    const mine = current.get(backup.wardId);
    if (!mine) added.push(backup);
    else if (recordText(mine) !== recordText(backup)) both.push({ mine, backup });
  }
  const parties = importedParties.filter((p) => p && p.id && !(caseFile.parties || []).some((x) => x.id === p.id));
  const cases = importedCases.filter((c) => c && c.id && !(caseFile.cases || []).some((x) => x.id === c.id));
  return { both, added, parties, cases };
}

export async function importSavArchiveOrWard(file, options = {}) {
  const { isBackupFlow = false } = options;
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
      await alertModal('Please unlock the app before restoring from a backup.');
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
    // Milestone 76K item 2: the same salt is the same key only at the same count.
    const sameKey = manifest.salt === currentSalt
      && kdfIterationsOf(manifest.kdfIterations) === kdfIterationsOf(await loadAppState('cryptoIterations'));
    let key = cryptoKey;
    if (manifest.securityMode !== 'none' && !sameKey) {
      const pw = await promptModal({
        title: 'Password for this backup',
        message: 'This backup was saved with a different password. Enter the password it was saved with:',
        inputType: 'password',
      });
      if (!pw) return false;
      key = await deriveKeyFromPassword(pw, manifest.salt, kdfIterationsOf(manifest.kdfIterations));
    }

    // Milestone 76K item 1: a protected backup's unprotected part is refused.
    const refusePlain = plainPartsRefused(manifest);
    let guardianInfo = null;
    if (manifest.guardian) {
      try {
        guardianInfo = await decryptJSONWithKey(manifest.guardian, key, { refusePlain });
      } catch (e) {
        throw new Error('Wrong password for this file, or the file has been modified/corrupted.');
      }
    }

    const imported = [];
    // Listed in the manifest but not in the file: named in the confirmation
    // below instead of being skipped silently. (An entry that is present but
    // unreadable still stops the whole restore, as it always has.)
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
        ward = await decodeWardRecord(await f.async('string'), key, { refusePlain });
      } catch (err) {
        throw new Error(`The file's data for "${entry.file}" has been modified or corrupted since it was saved — nothing was restored.`);
      }
      if (ward && ward.wardId) imported.push(ward);
    }

    const importedPartiesFile = zip.file('parties.enc');
    const importedCasesFile = zip.file('cases.enc');
    const importedPartyDismissalsFile = zip.file('partyDismissals.enc');
    // Milestone 54: deliberately no selectedCircuit here -- it lives in the
    // appState blob (see buildCaseFileBlob()'s comment), which a restore
    // never reads: restoring a backup never changes the case's circuit.
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
      { source: 'from the backup', refusePlain },
    );
    if (!imported.length && !guardianInfo) throw new Error('File contained no readable data.');
    unreadable.push(...unreadableCore);

    const caseFile = getCaseFile();
    const plan = restorePlan(caseFile, imported, importedParties, importedCases);
    const unreadableNote = unreadable.length
      ? `Part of this backup could not be read and will not be restored:\n${describeUnreadableParts(unreadable).map((l) => `• ${l}`).join('\n')}\n\nThe backup itself will not be changed or saved over.\n\n`
      : '';
    const sharedNote = plan.parties.length || plan.cases.length
      ? `${plan.parties.length} shared record(s) of people and ${plan.cases.length} case record(s) this case does not have will be added.\n\n`
      : '';
    const plainNote = manifest.securityMode !== 'none' && getSecurityMode() === 'none' && (plan.both.length || plan.added.length)
      ? 'This backup is password-protected, and this case has no password: what you restore will be saved in this case without a password, readable by anyone who has the case file.\n\n'
      : '';
    if (!plan.both.length && !plan.added.length && !plan.parties.length && !plan.cases.length) {
      await alertModal({ title: 'Nothing to restore', message: `${unreadableNote}Every filing in "${file.name}" is the same as in this case.` });
      return false;
    }

    // Which copy of each filing: the filer's choice, never assumed. A case
    // with no filings yet (a new one) takes the backup's, after one confirm.
    const emptyCase = !(caseFile.wards || []).length;
    const questions = emptyCase ? [] : [
      ...plan.both.map(({ mine, backup }) => ({
        id: `both:${mine.wardId}`,
        prompt: filingTitle(mine),
        options: [
          { value: 'keep', label: `Keep this case's copy (${editedLabel(mine)})` },
          { value: 'backup', label: `Use the backup's copy (${editedLabel(backup)})` },
        ],
      })),
      ...plan.added.map((backup) => ({
        id: `added:${backup.wardId}`,
        prompt: `${filingTitle(backup)} — not in this case`,
        options: [
          { value: 'add', label: `Add it from the backup (${editedLabel(backup)})` },
          { value: 'skip', label: 'Leave it out' },
        ],
      })),
    ];
    const message = `${unreadableNote}${plainNote}${sharedNote}`
      + (questions.length ? `Choose what to restore from "${file.name}". This case's file and password do not change.`
        : `Restore from "${file.name}"${plan.added.length ? ` (${plan.added.length} filing(s))` : ''}? This case's file and password do not change.`);
    let answers = {};
    if (questions.length) {
      answers = await choicesModal({ title: 'Restore from backup', message, questions, confirmLabel: 'Restore', cancelLabel: 'Cancel' });
      if (!answers) return false;
    } else if (!(await confirmModal({ title: 'Restore from backup', message, confirmLabel: 'Restore' }))) {
      return false;
    }
    const replacing = plan.both.filter(({ mine }) => answers[`both:${mine.wardId}`] === 'backup').map(({ backup }) => backup);
    const adding = emptyCase ? plan.added : plan.added.filter((backup) => answers[`added:${backup.wardId}`] === 'add');

    // Milestone 38C: close any open editor BEFORE replacing filing data, using
    // the real unload path (it flushes pending values, releases the filing
    // lock and lands on the dashboard).
    if (caseFile.activeWardId) {
      await filingLifecycle.unload();
    } else {
      await flushPendingSave();
    }

    const nextWards = [...caseFile.wards];
    for (const ward of replacing) {
      const idx = nextWards.findIndex((x) => x.wardId === ward.wardId);
      if (idx >= 0) nextWards[idx] = ward;
    }
    nextWards.push(...adding);
    caseFile.wards = nextWards;

    if (!Array.isArray(caseFile.parties)) caseFile.parties = [];
    caseFile.parties.push(...plan.parties);
    if (!Array.isArray(caseFile.cases)) caseFile.cases = [];
    caseFile.cases.push(...plan.cases);
    if (!Array.isArray(caseFile.dismissedPartyPairs)) caseFile.dismissedPartyPairs = [];
    for (const pair of importedPartyDismissals) {
      if (Array.isArray(pair) && !caseFile.dismissedPartyPairs.some((p) => p[0] === pair[0] && p[1] === pair[1])) {
        caseFile.dismissedPartyPairs.push(pair);
      }
    }

    for (const ward of [...replacing, ...adding]) {
      await saveWardToState(ward);
    }
    try { backfillWardPartyCounties(); }
    catch (e) { console.warn('Could not backfill ward-party counties on restore', e); }
    // The open case's guardian stays; a blank one is filled from the backup.
    if (guardianInfo && guardianInfo.guardianName && !caseFile.guardianName) caseFile.guardianName = guardianInfo.guardianName;
    if (guardianInfo && guardianInfo.guardianEmail && !caseFile.guardianEmail) caseFile.guardianEmail = guardianInfo.guardianEmail;

    // Saved to the open case's own file, if it has one; the backup is never
    // remembered as the case's file (76D-1). Milestone 76A item 6: saved only if
    // this wrote the case.
    await saveData();

    if (typeof window !== 'undefined') {
      updateSidebar();
    }

    await auditLog('DATA_IMPORT', `Restored from backup "${file.name}": ${replacing.length} filing(s) replaced with the backup's copy, ${adding.length} added`, true);

    updateLastSavedIndicator();
    if (typeof window !== 'undefined') {
      notifyProbateGuardianTabStateChanged();
    }

    // Lands on the dashboard (Milestone 38C: a restore never opens an editor).
    await navigate('/dashboard', { reason: DRAW.SWITCH });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pg:backup-restored', {
          detail: { fileName: file.name, count: replacing.length + adding.length, isBackupFlow },
        })
      );
    }
    await alertModal({ title: 'Restore complete', message: `${replacing.length} filing(s) replaced with the backup's copy, ${adding.length} added.` });
    return true;
  } catch (e) {
    console.error('Restore failed', e);
    auditLog('DATA_IMPORT', String((e && e.message) || e), false);
    await alertModal('Could not restore from that backup: ' + ((e && e.message) || e));
    return false;
  }
}

// A case file dropped on the window: the same restore.
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
      await restoreBackupSavFile(file);
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
  await restoreBackupSavFile(file);
}

export async function restoreBackupSavFile(file) {
  return importSavArchiveOrWard(file, { isBackupFlow: true });
}

/**
 * Open Case File: switch to another case file. The open case is saved first;
 * if it can't be (no file it can write, or the save failed) the filer is
 * asked before its changes are lost. Then the case closes to the start
 * screen -- nothing remembered of it -- where the other file opens with its
 * own password through the same path as at launch.
 */
export async function openAnotherCaseFile() {
  await flushPendingSave();
  if (isDirtySinceExport()) {
    const go = await confirmModal({
      title: 'Changes not saved',
      message: 'This case has changes that are not saved to its file. If you open another case file now, they will be lost.\n\nTo keep them, choose Go back and use Save Backup first.',
      confirmLabel: 'Open another case file',
      cancelLabel: 'Go back',
      danger: true,
    });
    if (!go) return false;
    setDirtySinceExport(false);
  }
  await forgetCaseFileHandle();
  clearLastPosition();
  if (typeof window !== 'undefined' && window.location) window.location.reload();
  return true;
}
