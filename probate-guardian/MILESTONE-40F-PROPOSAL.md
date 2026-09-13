# Milestone 40F: Unify the Duplicate Save/Autosave/Export Pipeline

## Status

**Draft only — independently approved delivery.** This proposal authorizes
no runtime, test, or documentation change until the requester approves
Milestone 40F specifically. Approval of another Milestone 40 delivery does
not authorize this work.

## Goal

Collapse the save/backup/export/autosave system down to exactly one real
implementation, remove the false "Last backup: just now" / "auto-save
needs one manual save to re-arm" claims that the current two-implementation
split produces, and delete the inert Tauri-desktop scaffolding discovered
during this review (there is no Tauri shell anywhere in this repo — no
`src-tauri/`, no `@tauri-apps/*` dependency, no `tauri.conf.json` — so this
code can never do anything in either shipped build).

## Background

`src/legacy-app.js` and `src/core/persistence/case-file.js` each contain a
**complete, independent implementation** of the same save/export/autosave
pipeline — `loadCaseFileHandle`, `writeCaseToHandle`, `buildCaseFileBlob`,
`refreshAutoSaveArmedStatus`, `updateLastSavedIndicator`,
`beginRecordingExport`, `exportCaseFileZip` (+ `exportGuardianDataZip`/
`backupAllWardsNow` aliases), `silentAutoExport`, `saveBackupNow`,
`getWardFileStem`/`getWardFileName`, `validateWardBackupOverwrite`,
`finishSingleWardExport`, `showAutoExportReminder`/`hideAutoExportReminder`,
`loadAutoExportPrefs`, `saveAutoExportIntervalPref`,
`setupAutoExportTimer`/`setupLastSavedTicker`/`setupFallbackSaveReminder`,
`markDirtySinceExport`, `saveBlobAs`, `suggestedCaseFileName`,
`buildSingleWardExportBlob`, and the whole
`triggerImportZip`/`importSavArchiveOrWard`/`importGuardianDataZip`/
`triggerOpenBackupSav`/`handleBackupImportChange`/`restoreBackupSavFile`
import family — same names, same jobs, defined twice
(`legacy-app.js:2757-3670`ish vs. `case-file.js` in full).

`index.html` loads `legacy-app.js` as a classic script (`:252`) before
`main.js` as `type="module"` (`:253`), and `main.js` unconditionally
imports `case-file.js` (`main.js:20`). Classic scripts run first; module
scripts always run after. `case-file.js`'s own top-level
`if (typeof window !== 'undefined') {...}` block (`case-file.js:834-871`)
assigns `window.loadCaseFileHandle = loadCaseFileHandle;` and ~30 more of
the exact names `legacy-app.js` already declared as plain top-level
functions (which, in a classic script, are themselves just `window`
properties). Because `case-file.js`'s assignments run second, **they win**
— every one of those ~30 names in `legacy-app.js` is dead code, unreachable
even from `legacy-app.js`'s own surviving functions that call them by bare
identifier (e.g. `saveData()`).

This is not cosmetic. Because the two implementations keep separate
private state (`_lastExportAt`, `_autoSaveArmed`, `_caseFileHandle`,
`_autoExportIntervalMinutes`), and only some of it round-trips through
shared `window.*` properties, three concrete bugs are live in production
today:

1. **"Last backup" can claim success that never happened.**
   `saveData()` (`legacy-app.js:2801-2836`, not shadowed — this one really
   runs) sets `window._lastAutoSavedAt = Date.now()` and refreshes the
   indicator (`:2818-2819`) *before* it even checks whether a file handle
   exists, has permission, or the write succeeds. `#last-saved-indicator`
   and `#auto-save-armed-indicator` sit side by side in the sidebar
   (`index.html:66-67`), so a Firefox/Safari user — structurally incapable
   of a background file write — can see "✓ Last backup: just now" directly
   next to "Auto-save: not available in this browser." The same false
   "just now" persists even when the real write throws and the
   `#save-error-banner` appears.
2. **`window._lastExportAt` never advances during a session.** It's backed
   by a real accessor in `legacy-app.js` (`Object.defineProperty`,
   `:979-983`), but the live (shadowed) `beginRecordingExport()` in
   `case-file.js` only updates its own private `_lastExportAt` and
   `window._appState.lastExportAt` (`case-file.js:323-341`) — never the
   `window._lastExportAt` accessor. It gets set once, correctly, when a
   `.sav` is opened at launch (`legacy-app.js`'s still-live
   `loadCaseFileFromZip`, `:4034` on, sets the bare `_lastExportAt`
   variable the accessor is bound to), then never again for the rest of
   the session no matter how many real saves happen.
3. **Two more surfaces read the dead copies directly.**
   `renderStorageReadout()` (Activity Log page, still `legacy-app.js`'s
   own, unshadowed — `:2512-2525`) reads `legacy-app.js`'s private
   `_lastExportAt`/`_autoSaveArmed`, which are effectively frozen for the
   reasons above, so it can permanently show "auto-save needs one manual
   save to re-arm" and "not saved yet this session" even mid-session after
   real saves have succeeded. `ward-lifecycle.js:387`'s
   `isFirstWardEver && !window._lastExportAt` first-backup-reminder check
   reads the same frozen value directly, so it can't reliably distinguish
   a genuinely new user from a returning one.

Separately (smaller, not incorrect, just confusing): three independent
timers all react to `_dirtySinceExport` — the 1s `autoSave()` debounce
(real, continuous work), a 10-minute `_autoExportTimer`/
`silentAutoExport()` ("Auto-Export," almost always a no-op once the 1s
debounce has already cleared `dirty`, useful only for first-save/
permission-revoked recovery), and a 15-minute fallback-reminder timer
(browsers with no File System Access API only). And
`silentAutoExport()`/`saveBackupNow()`/`exportCaseFileZip()` never touch
`_consecutiveSaveFailures`/`showSaveError()` — that escalation-to-banner
logic exists only inside `saveData()` — so the identical underlying write
failure is reported to the user differently depending on which of the two
redundant timers happened to trigger it.

No existing test catches any of this: the one relevant unit test
(`tests/unit/case-file.spec.js:152-166`, `'incremental save timestamp
indicator'`) imports `case-file.js` directly and tests
`recordAutoSaveTimestamp()` in isolation — a function that is itself
never actually called by the live `saveData()`, so the test passes while
the real bug remains invisible to it.

### Inert Tauri scaffolding found during this review

Confirmed there is no Tauri project in this repo at all: no `src-tauri/`
directory, no `@tauri-apps/*` entry in `package.json`, no
`tauri.conf.json`, no `capabilities/default.json` (despite a code comment
referencing one). Both real build targets (`build:web`, `build:portable`)
are plain Vite/browser builds. Two Tauri-shaped subsystems exist anyway,
both gated on a `window.__TAURI__` global that can never be present, and
both are exactly the same "declared twice, classic-script copy silently
shadowed" pattern as the main save pipeline above:

1. **Filesystem ward-backup ("FILESYSTEM AUTOSAVE").**
   `legacy-app.js:4195-4294` — `AUTOSAVE_DIR`, `_autosaveDirPath`,
   `autosaveWarn()`, `tauriFs()`, `tauriPath()`, `getAutosaveDirPath()`,
   `ensureAutosaveDir()`, `autosaveWardToFile()`, `deleteAutosaveFile()`,
   `restoreFromFileBackupIfEmpty()` — would back up each ward to
   `Documents/ProbateGuardian/<wardId>.json` on a Tauri desktop build.
   Referenced from `saveData()` (`:2811`), ward deletion (`:5102` and the
   guarded `window.deleteAutosaveFile` call in
   `ward-lifecycle.js:452-453`), and app boot (`restoreFromFileBackupIfEmpty()`
   at `:9072`). None of it is duplicated elsewhere — it simply never runs.
2. **OS keychain "remember this password" feature.** Duplicated exactly
   like the main pipeline: a dead copy in `legacy-app.js:1946-1974`
   (`tauriInvoke`, `hasKeychainSupport`, `keychainSave`, `keychainLoad`,
   `keychainDelete` — comment references a `src-tauri/src/lib.rs` that
   does not exist in this repo) and the live, shadowed copy in
   `crypto.js:61-103` (same five functions, exported to `window` at
   `:183-186`). Both always return falsy/no-op, because
   `window.__TAURI__` is never present. This isn't just dead function
   definitions — it drives real, always-inert UI: the "Remember this
   password on this device (Windows Credential Manager)" checkbox
   (`index.html:229-234`, `#unlock-remember-row`/`#unlock-remember-checkbox`)
   is unconditionally hidden by `hasKeychainSupport() ? 'block' : 'none'`
   in both `promptUnlock()` (`:2143-2145`) and `promptCreatePassword()`
   (`:2203-2205`), so it can never be shown, checked, or acted on; the
   silent-auto-unlock-via-keychain branch at boot (`:2089-2101`) can never
   fire; and `submitUnlockForm()`'s `remember` branches (`:2256`, `:2298`)
   always take the harmless-but-pointless `keychainDelete()` path. A
   one-off `window.tauriInvoke('set_secure_permissions')` call at app boot
   (`:9066`) is the same dead pattern in miniature.

## Decisions Required

1. **DECISION (recommended default): `case-file.js` becomes the sole
   canonical implementation**, since it already wins the shadow race at
   runtime and matches this repo's stated direction of moving persistence
   logic into ES modules (`AGENTS.md` Section 0). `legacy-app.js` keeps
   only what genuinely has no ES-module counterpart today: `autoSave()`'s
   1s debounce orchestration, `flushPendingSave()`, `getActiveWard()`,
   `autosaveWardToFile()` (Tauri-only backup), the session-restore-cache
   functions, `_consecutiveSaveFailures`/`showSaveError`/`hideSaveError`,
   and the distinct "open a `.sav` at launch" parser (`loadCaseFileFromZip`
   — not a duplicate of `importSavArchiveOrWard`, keep as-is). Everything
   `legacy-app.js` still needs from `case-file.js` is reached the same way
   dozens of other call sites in this codebase already reach ES-module
   globals from classic-script code: through `window.*`, which is a real,
   already-established bridge pattern here, not a new one being
   introduced for this fix.
2. **DECISION (recommended default): one "last successful save" clock, not
   two.** Delete `_lastAutoSavedAt` entirely. Keep `_lastExportAt`
   (`case-file.js`'s), fixed per Step 1 below so it's always accurate.
   There is no genuine second event worth tracking separately here — two
   clocks exist only because two implementations happened to exist.
3. **DECISION (recommended default): centralize failure-escalation in
   `writeCaseToHandle()` itself**, so the 1s debounce, the 10-minute
   periodic timer, and the manual "Save Backup Now" button all report a
   write failure identically (banner after N consecutive failures),
   instead of only the debounce path escalating today.
4. **DECISION (per requester instruction): remove the Tauri scaffolding
   entirely** — both subsystems above, not merely de-duplicated. This
   includes deleting the "Remember this password" checkbox from the
   unlock/create-password UI (`index.html:229-234`) rather than leaving a
   permanently-hidden control in the markup, since it can never be shown
   under either real build target.

## Implementation Steps

1. **Add real accessor helpers for `_lastExportAt` and `_autoSaveArmed` in
   `case-file.js`**, mirroring the `getCaseFileHandle()`/
   `setCaseFileHandle()` and `isDirtySinceExport()`/`setDirtySinceExport()`
   pattern already established in the same file (`:32-62`) — every read
   today is an ad hoc inline `(typeof window !== 'undefined' &&
   window._lastExportAt !== undefined) ? window._lastExportAt :
   _lastExportAt` duplicated in three places (`:195`, `:307`, and
   `buildCaseFileBlob`), while the sole writer (`beginRecordingExport`,
   `:323-341`) never follows that same dual-sync pattern — that read/write
   asymmetry is the direct cause of bug 2 above.
   - New: `getLastExportAt()` / `setLastExportAt(ts)` (mirrors
     `setCaseFileHandle()`'s plain-property write — sets both the private
     variable and `window._lastExportAt` directly, not just a same-named
     getter function, since `ward-lifecycle.js:387` reads
     `window._lastExportAt` as a bare property, not a function call; fixing
     it this way requires no change to `ward-lifecycle.js` itself), and
     `getAutoSaveArmed()` (read-only — `refreshAutoSaveArmedStatus()` stays
     the sole writer of `_autoSaveArmed`).
   - Update `beginRecordingExport()`, `updateLastSavedIndicator()`,
     `buildCaseFileBlob()`, and `loadAutoExportPrefs()` to use the new
     helpers instead of the bare module variable everywhere.
   - Drop `beginRecordingExport()`'s separate `window._appState.lastExportAt
     = _lastExportAt` write (`case-file.js:329`, and its rollback
     counterpart at `:337`) — confirmed nothing anywhere in `src/` ever
     reads `_appState.lastExportAt`/`window._appState.lastExportAt` back
     (`buildCaseFileBlob()`'s own `lastExportAt` field is populated from
     `window._lastExportAt` directly, `:195`, not from `_appState`). It's a
     write with no reader, predating this fix; keeping it alongside the new
     `setLastExportAt()` helper would just be a second, redundant place the
     same value is written.
   - Add `window.getLastExportAt`, `window.isAutoSaveArmed` to the
     existing export block (`case-file.js:834-871`).
   - **Cross-delivery conflict (review pass 2026-09-12):**
     `buildCaseFileBlob()`'s `appStateBlob` literal is also edited by
     Milestone 40D, which must stop `theme` (`case-file.js:189`) from
     being serialized into new `.sav` files — two lines apart from this
     delivery's `lastExportAt` change (`:195`) in the same object. Expect
     a conflict in that literal if both land independently. Relatedly,
     Step 4 here deletes `legacy-app.js`'s dead duplicate
     `buildCaseFileBlob()` (which carries its own `theme` line at
     `:3066`), so **landing 40F first removes one of 40D's sites for
     free**. See the dependency table in `MILESTONE-40-PROPOSAL.md`.
2. **Move failure-escalation into `writeCaseToHandle()`** (`case-file.js:
   387-419`): add `_consecutiveSaveFailures`/`SAVE_FAILURE_THRESHOLD` as
   module state here, and call through `window.showSaveError`/
   `window.hideSaveError` (kept in `legacy-app.js`, since they're pure DOM
   banner toggles with no state worth moving) on the same success/failure
   edges the try/catch already has — matching how this same file already
   reaches back into `legacy-app.js` globals elsewhere (`window.auditLog`,
   `window.notifyProbateGuardianTabStateChanged`). This makes
   `silentAutoExport()`, `saveBackupNow()`, and `exportCaseFileZip()` share
   identical failure reporting with the debounce path for the first time.
3. **Simplify `saveData()`** (`legacy-app.js:2801-2836`):
   - Delete the premature `window._lastAutoSavedAt = Date.now();
     updateLastSavedIndicator();` (`:2818-2819`) — `writeCaseToHandle()`
     already calls the real `updateLastSavedIndicator()` truthfully right
     after a confirmed successful write (`case-file.js:407`).
   - Delete the local `_consecutiveSaveFailures`/`SAVE_FAILURE_THRESHOLD`
     and the try/catch's failure-counting (now centralized per Step 2);
     `saveData()`'s try/catch around the handle-write becomes a thin call
     into the shared write path.
   - Keep unchanged: the `_securityMode`/`_cryptoKey` early-return guard,
     `getActiveWard()`, the `activeWard.lastModified` stamp,
     `autosaveWardToFile()` (Tauri), and the `saveSessionRestoreCache()`
     call — none of this exists in `case-file.js` and all of it is still
     needed exactly as-is.
4. **Delete the ~30 now-fully-dead duplicate functions and their backing
   private state from `legacy-app.js`**, confirmed unreachable per the
   load-order analysis above:
   - Functions: `loadCaseFileHandle`, `rememberCaseFileHandle`,
     `forgetCaseFileHandle`, `refreshAutoSaveArmedStatus`,
     `buildCaseFileBlob`, `buildSingleWardExportBlob` (`:3110`),
     `suggestedCaseFileName`, `writeCaseToHandle`, `silentAutoExport`,
     `saveBackupNow`, `exportCaseFileZip` (+ `exportGuardianDataZip`/
     `backupAllWardsNow` aliases), `getWardFileStem`, `getWardFileName`,
     `validateWardBackupOverwrite`, `finishSingleWardExport`,
     `showAutoExportReminder`, `hideAutoExportReminder`,
     `loadAutoExportPrefs`, `saveAutoExportIntervalPref`,
     `setupAutoExportTimer`, `setupLastSavedTicker`,
     `setupFallbackSaveReminder`, `beginRecordingExport`,
     `markDirtySinceExport`, `saveBlobAs` (`:2919`), `triggerImportZip`
     (`:3425`), `importSavArchiveOrWard` (`:3443`),
     `importGuardianDataZip` (`:3609`), `triggerOpenBackupSav` (`:3614`),
     `handleBackupImportChange` (`:3633`), `restoreBackupSavFile`
     (`:3641`).
   - Private state: `_caseFileHandle`, `_lastExportAt` (+ its
     `Object.defineProperty(window, ...)` accessor, `:979-983`),
     `_autoSaveArmed`, `_autoExportTimer`, `_autoExportIntervalMinutes`,
     `_fallbackReminderTimer`, `_lastSavedTickTimer`.
   - Keep `_dirtySinceExport`'s accessor exactly as-is — `case-file.js`'s
     `setDirtySinceExport()`/`isDirtySinceExport()` already correctly
     round-trips through it both ways; it's the one piece of shared state
     that was never actually broken.
   - Sweep for any call site inside the surviving `legacy-app.js` code
     that referenced a deleted name and repoint it at the `window.`
     global explicitly (most already do so implicitly via bare-identifier
     resolution and need no code change, only the dead definition removed).
5. **Fix `renderStorageReadout()`** (`legacy-app.js:2512-2525`) to read
   `window._lastExportAt` (now genuinely live, via Step 1) and call
   `window.isAutoSaveArmed()` instead of the (now-deleted) private
   `_lastExportAt`/`_autoSaveArmed`.
6. **Rename the periodic 10-minute mechanism's naming, not its behavior**,
   so it no longer reads as a second "autosave": it should describe the
   fallback/retry sweep it actually is (first-save nudge, or
   permission-revoked recovery), distinct from the always-on 1-second
   `autoSave()` debounce that does the continuous real work. No functional
   change requested here per Decision 1's scope; flag during review if the
   redundant write itself should be removed rather than just reworded.

   "Update its identifiers/comments" was too vague to execute against, so
   the intended split is spelled out (review pass 2026-09-12). **Rename**
   the internals: `_autoExportTimer`, `setupAutoExportTimer()`,
   `silentAutoExport()`, `_autoExportIntervalMinutes`,
   `saveAutoExportIntervalPref()`, `loadAutoExportPrefs()`. **Do not
   rename** anything that is a persisted key, a DOM id, or a public
   contract, because each has a compatibility cost that outweighs the
   clarity gain:
   - `loadAppState('autoExportIntervalMinutes')` / the `.sav`
     `appState.autoExportIntervalMinutes` field — renaming this key
     silently discards every existing user's saved interval preference.
     Keep the stored key; rename only the variable that holds it.
   - `#auto-export-reminder`, `#auto-export-reminder-title`,
     `#auto-export-reminder-text`, `#auto-export-interval-select`, and
     `data-shell-action="hide-auto-export-reminder"` — referenced from
     `index.html` and asserted by `tests/e2e/party-dedupe.spec.ts:44` and
     `tests/e2e/dashboard-visual.spec.ts:43`. Renaming these buys nothing
     and breaks two unrelated specs.
   - The user-visible toast copy ("Unsaved Changes" / "Save Your First
     Backup") is already accurate about what it's telling the filer;
     leave it alone. The confusing name was only ever internal.
7. **Rewrite `tests/unit/case-file.spec.js:152-166`** (`'incremental save
   timestamp indicator'`) to drop `recordAutoSaveTimestamp` (deleted per
   Decision 2) and instead assert that a successful `writeCaseToHandle()`
   updates `window._lastExportAt` and the indicator text via the new
   `getLastExportAt()`/`setLastExportAt()` helpers.
8. **Extend `tests/e2e/case-file-protection.spec.ts`** (already covers
   auto-save) with assertions covering the three confirmed bugs directly:
   - No handle yet, an edit is made and the 1s debounce fires →
     `#last-saved-indicator` stays "Unsaved changes," never flips to
     "Last backup: ...".
   - Handle + permission granted, an edit is made → within ~1s,
     `#last-saved-indicator` shows "✓ Last backup: just now" **and** the
     underlying file write is confirmed to have actually happened (not
     merely that the timer fired).
   - Permission revoked mid-session → the indicator does not claim
     success; `#auto-save-armed-indicator` reflects the revoked state.
   - A forced write failure (twice) → `#save-error-banner` appears and
     `#last-saved-indicator` is not simultaneously claiming a fresh
     success.
   - On the Activity Log page, after a real successful save →
     `#storage-usage-readout` says "auto-save is on" and a real elapsed
     time, not the old permanent defaults.

### Tauri scaffolding removal

9. **Delete the filesystem ward-backup subsystem** from `legacy-app.js`:
   the whole `:4195-4294` block (`AUTOSAVE_DIR`, `_autosaveDirPath`,
   `autosaveWarn`, `tauriFs`, `tauriPath`, `getAutosaveDirPath`,
   `ensureAutosaveDir`, `autosaveWardToFile`, `deleteAutosaveFile`,
   `restoreFromFileBackupIfEmpty`), plus its three call sites: the
   `autosaveWardToFile(activeWard)` call in `saveData()` (already being
   simplified in Step 3 — drop this line too), the `deleteAutosaveFile(wardId)`
   call in the ward-deletion flow (`:5102`), the guarded
   `window.deleteAutosaveFile` call in `ward-lifecycle.js:452-453`, and the
   `restoreFromFileBackupIfEmpty()` call at app boot (`:9072`).
10. **Delete the OS-keychain "remember password" feature** in full:
    - `legacy-app.js:1946-1974`'s dead copy (`tauriInvoke`,
      `hasKeychainSupport`, `keychainSave`, `keychainLoad`,
      `keychainDelete`).
    - `crypto.js:61-103`'s live copy of the same five functions, and their
      `window.*` exports at `:183-186`.
    - The silent-auto-unlock-via-keychain branch at boot
      (`legacy-app.js:2089-2101`).
    - The `keychainAvailable`/`hasSavedPw` setup and `rememberRow`
      show/hide logic in `promptUnlock()` (`:2132-2145`) and
      `promptCreatePassword()` (`:2203-2205`).
    - The `remember`/`keychainSave`/`keychainDelete` handling in
      `submitUnlockForm()` (`:2243`, `:2256`, `:2298`) — these branches
      collapse to nothing once `remember` can no longer be read from a
      checkbox that no longer exists.
    - The `#unlock-remember-row`/`#unlock-remember-checkbox` markup
      (`index.html:229-234`).
    - The one-off `window.tauriInvoke('set_secure_permissions')` call and
      its try/catch at app boot (`legacy-app.js:9066`).
11. **Sweep comments and docs for stale Tauri claims**: the
    `src-tauri/src/lib.rs` and `capabilities/default.json` references
    inside the deleted code are removed along with it; check for any other
    comment or doc (outside `MILESTONE-ARCHIVE.md`, which is a historical
    record and stays as-is) that still describes Tauri support as present
    or planned-and-scaffolded, and correct it.

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| No case-file handle yet; an edit is made and the 1s debounce fires | `#last-saved-indicator` shows "● Unsaved changes," never "Last backup: ..." |
| Handle exists, permission granted, an edit is made | Within ~1s, `#last-saved-indicator` shows "✓ Last backup: just now" tied to a real, confirmed write |
| Handle exists, permission revoked mid-session | Indicator does not claim success; `#auto-save-armed-indicator` shows the revoked state |
| A real write throws twice in a row | `#save-error-banner` appears; the indicator is not simultaneously showing a fresh success claim |
| Activity Log page, after any real successful save | `#storage-usage-readout` says "auto-save is on" and a real elapsed time, not the old permanent defaults |
| A first ward is created in a new session, after a prior session already saved | "Save Your First Backup" reminder does not incorrectly fire |
| The periodic timer's write fails repeatedly | Same escalation to `#save-error-banner` as the 1s debounce path, not silently different |
| grep across `src/legacy-app.js` for the deleted function/variable names | none found outside historical comments, if any are kept |
| `npm run verify:data-model` | unaffected — no data-model shape changes in this milestone |
| Unlock screen (create-password and unlock forms) | No "Remember this password" checkbox or row present |
| Deleting a ward | No error/console warning about `deleteAutosaveFile`; ward deletion behaves identically to today (the file it targeted never existed in a browser build) |
| grep for `__TAURI__`, `tauriInvoke`, `tauriFs`, `tauriPath`, `hasKeychainSupport`, `keychainSave`, `keychainLoad`, `keychainDelete`, `autosaveWardToFile`, `deleteAutosaveFile`, `restoreFromFileBackupIfEmpty` across `src/` | none found |
| `capabilities/default.json` / `src-tauri/src/lib.rs` mentions in code comments | none remain |

## Verification

Run `tests/unit/case-file.spec.js` (updated) and the extended
`tests/e2e/case-file-protection.spec.ts`, plus the full existing
persistence e2e family (`case-file-roundtrip.spec.ts`,
`backup-restore-sav.spec.ts`, `dashboard-backup.spec.ts`,
`recovery-cache.spec.ts`, `persistence-recovery.contract.spec.ts`,
`ward-lock.spec.ts`) and `routes.spec.ts` (its existing "Unsaved changes"
assertion at `:198` must still pass unchanged). Also run `tests/e2e/unlock.spec.ts`
and `tests/e2e/startup.spec.ts` — the closest existing coverage of the
create-password/unlock overlay the checkbox removal touches; neither
currently references `unlock-remember-row`/`hasKeychainSupport` (confirmed
by grep — no test anywhere in `tests/` touches any of the Tauri-scaffolding
names), so no test changes are expected there, only confirmation nothing
regresses. This is a deletion-shaped change touching the single most
cross-cutting subsystem in the app plus the unlock flow — recommend the
full `npm test` regression before commit/push, per `AGENTS.md`, the same
recommendation 40A made for a similarly cross-cutting deletion. Update
`TEST-INDEX.md` for the rewritten unit test and any new e2e assertions in
the same commit.
