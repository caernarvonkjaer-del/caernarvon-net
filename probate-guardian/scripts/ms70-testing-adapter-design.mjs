// Milestone 70, 70A: "Design GuardianForms.testing from the real inventory
// -- the names the browser suite reaches and every in-place write site --
// before 70T starts", and "specify and test the exact window.GuardianForms
// schema". This proposes where each application name the browser suite
// reaches today goes once 70T moves the suite off raw globals, and so which
// adapter members exist. It reads tests/baseline/ms70-e2e-globals.json.
//
// Destinations:
//   command:<member>   GuardianForms.testing.<member>(), a validated mutation
//   query:<member>     GuardianForms.testing.<member>(), a copy, never live
//   real-ui            the spec drives the real control (AGENTS.md section 6)
//   unit-import        a pure helper: its checks move to a unit test that
//                      imports the module directly
//   harness            a global the test support installs itself; not an
//                      application name at all
// Writes to window.D / caseFile go through patchFiling (setup only) or
// setField / the real UI (behavior) -- decision D9.
//
// Production members (not testing): only what has a named consumer. The
// proposal is `version` -- immutable build identity -- because production
// caches index.html for a year (70A finding 5), so support has to be able to
// tell which build a filer is actually running. No diagnostic snapshot and no
// host command: nothing on the DNN site calls into the application.
//
// Usage: node scripts/ms70-testing-adapter-design.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DESIGN_PATH = 'tests/baseline/ms70-testing-adapter-design.json';
export const DESTINATION_KINDS = ['command', 'query', 'real-ui', 'unit-import', 'harness'];

// First matching rule wins. Each is [pattern, destination].
export const RULES = [
  [/^__/, 'harness'],
  [/^navigate$/, 'command:navigate'],
  [/^(flushPendingSave|autoSave|saveData|saveBackupNow|markDirtySinceExport)$/, 'command:save'],
  [/^(addWard|initializeEmptyData|addEntry|duplicateEntry)$/, 'command:createFiling'],
  [/^(switchWard|unloadWard)$/, 'command:activateFiling'],
  [/^deleteWard$/, 'command:deleteFiling'],
  [/^(lockApp)$/, 'command:lock'],
  [/^(clearSessionRestoreCache|saveSessionRestoreCache)$/, 'command:recoveryCache'],
  [/^(startNewWardYear|switchWardYear)$/, 'command:year'],
  [/^(convertExistingWard|convertToSimplified)$/, 'command:convertFiling'],
  [/^(acquireWardLock|releaseWardLock)$/, 'command:filingLock'],
  [/^(rememberCaseFileHandle)$/, 'command:launchState'],
  [/^setTestSystemTitleWarningEnabledForTest$/, 'command:setTestSystemTitleWarning'],
  // Party and case records change the live case, so they are not pure helpers.
  [/^(createParty|mergeParties|unmergeParty|dismissPartyPair|setPartyIdForSlot|syncIdentityField|syncFilingSlotWithParty|writeRoleFields|addSignatureImage|ensureWardPartyForFiling|backfillWardPartyCounties|backfillWardPartyIdentity|hydrateFromParty|dehydrateIntoParty|createCase|getOrCreateCaseForWard)$/, 'command:updateSharedRecords'],
  [/^(loadCaseFileFromZip)$/, 'command:importArchive'],
  [/^(resolveParty|resolveCase|wardPartyForFiling|referenceCountForParty|subPartiesOf|isPartyPairDismissed|casesGroupingWards|caseNumberOf|findDuplicateCandidates|closedFilingDrift|filingDriftFromParties|wardCountyMergeConflict|readRoleFields|identitySlotForPath)$/, 'query:sharedRecords'],
  [/^(D|caseFile|getCaseFile|getActiveWard|wardId|wardName|currentPage|activeInventoryType|_dirtySinceExport|pgHasUnsavedChanges)$/, 'query:snapshot'],
  [/^validate(Guardian|Annual|Simplified|Plan[A-Z]\w*)$|^adaptValidationErrors$|^prepareFilingOutput$/, 'query:validate'],
  [/^(computeNavChecks|updateNavDots|getWardProgress|updateSidebar|planReadinessChecks|planReadinessPanel)$/, 'query:status'],
  [/^load\w*Pdf$|^doSave(Pdf|Excel)\w*$/, 'query:generateOutput'],
  [/^(buildCaseFileBlob|buildSingleWardExportBlob|exportGuardianDataZip|finishSingleWardExport|saveBlobAs)$/, 'query:exportArchive'],
  [/^(_sessionCacheGet|_cryptoKey|loadCaseFileHandle|readRememberedFile|hasOpenedCaseBefore|getRecentlyOpenedWards|isContinuePromptShown|getCurrentLockedWardId|loadAppState|loadAuditLogEntries|auditLog)$/, 'query:persistenceState'],
  [/^show\w*Modal(ForType)?$|^closeModal$|^confirmDeleteWard$|^startWalkthrough$|^openFloridaCourtPortal$|^triggerImportZip$|^focusFieldByPath$|^importExcelGuardian$|^renderPage$|^renderScheduleDocsSection$|^loadFragment$|^loadSimplifiedFeature$|^commitCoverCounty$/, 'real-ui'],
];

export function destinationFor(name) {
  const hit = RULES.find(([re]) => re.test(name));
  return hit ? hit[1] : 'unit-import';
}

export function buildDesign(root = ROOT) {
  const inv = JSON.parse(fs.readFileSync(path.join(root, 'tests/baseline/ms70-e2e-globals.json'), 'utf8'));
  const names = Object.entries(inv.byName).map(([name, v]) => ({ name, files: v.files, destination: destinationFor(name), reviewed: false }));
  const members = {};
  for (const n of names) {
    const [kind, member] = n.destination.split(':');
    if (!member) continue;
    members[member] ||= { kind, replaces: [] };
    members[member].replaces.push(n.name);
  }
  const byDestination = {};
  for (const n of names) {
    const kind = n.destination.split(':')[0];
    byDestination[kind] = (byDestination[kind] || 0) + 1;
  }
  return {
    production: {
      version: { kind: 'value', consumer: 'support: which build a filer is running, given production caches index.html for a year' },
    },
    testing: { enabled: 'only when the test runner sets the pre-boot flag (D3, T3)', members },
    summary: { names: names.length, byDestination, members: Object.keys(members).length, inPlaceWriteSites: inv.summary.inPlaceStateWriteSites },
    names,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const design = buildDesign();
  console.log(JSON.stringify(design.summary, null, 1));
  console.log('testing members:', Object.entries(design.testing.members).map(([m, v]) => `${m}(${v.kind}, ${v.replaces.length})`).join(' '));
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(ROOT, DESIGN_PATH), JSON.stringify({
      generatedBy: 'node scripts/ms70-testing-adapter-design.mjs --write',
      note: 'Milestone 70, 70A: proposed window.GuardianForms schema -- production members with their named consumer, and GuardianForms.testing designed from the names the browser suite reaches today (tests/baseline/ms70-e2e-globals.json). A draft for 70T to review; each name is reviewed:false until confirmed.',
      ...design,
    }, null, 1) + '\n');
    console.log(`wrote ${DESIGN_PATH}`);
  }
}
