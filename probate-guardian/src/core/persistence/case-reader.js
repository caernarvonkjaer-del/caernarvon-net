// Milestone 70, 70I: opening a case file -- the counterpart of case-file.js's
// buildCaseFileBlob(): the filings, the guardian, the shared records, the app
// preferences, the templates and the Activity Log, read out of an
// already-parsed .sav into memory. Moved from legacy-app.js. The archives
// under tests/fixtures/sav/, written by earlier versions of the app, are its
// proof (tests/e2e/sav-corpus.characterization.spec.ts).
import { replaceAuditLog } from '../activity/audit-log.js';
import { addToRecentlyOpened, loadRecentlyOpenedWards } from '../filing/recent-filings.js';
import { backfillWardPartyCounties } from '../navigation/ward-county.js';
import { fingerprintCase, rememberReadContents } from './case-merge.js';
import { readCaseFileZip } from './case-zip-read.js';
import { setAutoExportIntervalMinutes, setLastExportAt } from './export-state.js';
import { appStateObject, replaceCaseFile, replaceTemplateCache, setAppState } from '../state.js';
import { applyTheme, seedStoredThemeFromLegacy } from '../theme-preference.js';

// The counterpart to buildCaseFileBlob(): reads wards, guardian info,
// appState, cached templates, and the audit log out of an already-parsed
// .sav zip into memory. `key` may be null in 'none' mode — decryptJSONWithKey
// checks for the PLAIN: prefix before ever touching it. A file with no
// appState section at all (buildSingleWardExportBlob's single-ward exports
// never include one) defaults activeWardId to whichever ward the file
// contains, rather than failing.
//
// The case is read into a case of its own, which replaces the open one once,
// whole, through replaceCaseFile() (Milestone 70, 70J). It was read into the
// open case member by member, so across each await below the app held a case
// half this file and half the last; and a read that failed part-way left it
// that way. Since Milestone 76A the reading itself is case-zip-read.js's,
// which a save also uses to see what another tab saved; this file then makes
// what was read the open case, and remembers it as the file's contents.
export async function loadCaseFileFromZip(zip,manifest,key){
  // Every part of the file that exists (or that its manifest lists) but could
  // not be read. These used to be skipped with only a console warning, so a
  // damaged file opened silently without them -- and in Chrome/Edge the first
  // auto-save then rewrote the original without them, for good. Returned to
  // the caller, which hands it to case-file.js's protectPartiallyReadCaseFile()
  // to tell the filer and stop the original being saved over. A part a file
  // simply does not have (an older file with no parties.enc) is not damage and
  // is not listed. (master b2d97f5, carried into Milestone 70's reader.)
  const read=await readCaseFileZip(zip,manifest,key);
  const caseFile=read.caseFile;
  const unreadable=read.unreadable;
  // Milestone 76A (decision 76A-2): the file's contents as read, before
  // anything below changes them, so this tab's next save can tell its own
  // changes from another tab's.
  const asRead=await fingerprintCase(caseFile);
  setAppState('activeWardId',null);
  setAutoExportIntervalMinutes(10);
  setLastExportAt(null);
  const a=read.appState;
  if(a){
    try{
      // Milestone 38C: a legacy archive's activeWardId is resume HISTORY, not
      // an instruction to reopen an editor. Focus is forced null below, for
      // every archive shape.
      const legacyActiveWardId=a.activeWardId||null;
      // Milestone 40D: theme is no longer read back out of app state to drive
      // appearance, but this is where a legacy value arrives from the file, so it
      // is the natural hook for the one-time seed. seedStoredThemeFromLegacy()
      // writes to localStorage ONLY when nothing is stored there yet -- so an
      // upgrading user keeps the theme they had, and opening any later file can
      // never overwrite the per-device choice they have since made.
      appStateObject().theme=a.theme;
      if(seedStoredThemeFromLegacy(a.theme)){
          // Seeded: bring the live document in line, since nothing had painted
          // this value yet.
          applyTheme(a.theme,false);
        }
      appStateObject().walkthroughCompleted=a.walkthroughCompleted;
      appStateObject().firstLaunchSeen=a.firstLaunchSeen;
      appStateObject().continuePromptShown=a.continuePromptShown;
      appStateObject().recentWards=a.recentWards;
      // Consume the legacy value exactly once, as recent history: prepend it
      // if it names a ward this archive actually contains and is not already
      // listed. It then shows up under Continue Editing, which the user opts
      // into, instead of opening itself.
      if(legacyActiveWardId){
        const legacyWard=caseFile.wards.find(w=>w.wardId===legacyActiveWardId);
        const already=loadRecentlyOpenedWards().some(r=>r&&r.wardId===legacyActiveWardId);
        if(legacyWard&&!already)addToRecentlyOpened(legacyWard);
      }
      appStateObject().unlockFailState=a.unlockFailState;
      setAutoExportIntervalMinutes((a.autoExportIntervalMinutes==null)?10:Number(a.autoExportIntervalMinutes));
      setLastExportAt(a.lastExportAt||null);
      // Milestone 54: caseFile-scoped, not app-launch-scoped, but carried in
      // this blob rather than its own zip entry -- see buildCaseFileBlob()'s
      // comment on why. A full .sav open is the one path that should adopt
      // the archive's circuit selection; merge-import and crash recovery
      // deliberately do not (case-file.js, recovery-cache.js).
      const sc=Number(a.selectedCircuit);
      caseFile.selectedCircuit=(sc>=1&&sc<=20)?sc:6;
    }catch(e){console.warn('Could not read app preferences from .sav file',e);unreadable.push({kind:'preferences'});}
  }
  // Milestone 38C, same rule as above and deliberately outside the appState
  // branch: a single-ward export carries no appState section at all, and this
  // used to fall back to opening wards[0] "solely because data was imported",
  // which 38C's storage table prohibits. Focus stays null for every archive
  // shape -- the case read here names no open filing (blankCaseFile()) -- and
  // the user chooses Edit from the dashboard.
  replaceCaseFile(caseFile);
  // Milestone 40C-A legacy migration rule. Existing nonblank filing and attorney
  // counties are left exactly as stored. For a ward Party with no county, infer
  // one only when every linked filing that HAS a county agrees on the same
  // normalized Florida county, and persist that unanimous value. Conflicting or
  // absent counties leave it blank for the user to resolve on a Cover -- picking
  // silently between two real counties would mis-caption a filing. Never
  // inferred from attorney county, another ward's filing, or the old Pinellas
  // fallback. Runs here so an opened .sav is migrated before anything reads it.
  //
  // Also covers single-ward import, which carries no Party records: the
  // reconstructed ward Party is seeded from that exported filing's own explicit
  // county by the same unanimity rule (a single filing is trivially unanimous).
  try{backfillWardPartyCounties();}
    catch(e){console.warn('Could not backfill ward-party counties',e);}
  // A damaged template entry was skipped as it was read: exports fall back to
  // the app's own copy of that workbook. It used to fail the whole open after
  // the password was taken, leaving the filer on a blank page.
  replaceTemplateCache(read.templates);
  replaceAuditLog(read.auditLog||[]);
  rememberReadContents(asRead);
  return {unreadable};
}
