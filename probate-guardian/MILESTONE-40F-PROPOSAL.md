# Milestone 40F: Unify the Duplicate Save/Autosave/Export Pipeline

## Status

**Draft only — independently approved delivery.** This proposal authorizes
no runtime, test, or documentation change until the requester approves
Milestone 40F specifically. Approval of another Milestone 40 delivery does
not authorize this work.

## Goal

Collapse the save/backup/export/autosave system down to exactly one real
implementation, and remove the false "Last backup: just now" / "auto-save
needs one manual save to re-arm" claims that the current two-implementation
split produces.

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
   - New: `getLastExportAt()` / `setLastExportAt(ts)`, and
     `getAutoSaveArmed()` (read-only — `refreshAutoSaveArmedStatus()`
     stays the sole writer of `_autoSaveArmed`).
   - Update `beginRecordingExport()`, `updateLastSavedIndicator()`,
     `buildCaseFileBlob()`, and `loadAutoExportPrefs()` to use the new
     helpers instead of the bare module variable everywhere.
   - Add `window.getLastExportAt`, `window.isAutoSaveArmed` to the
     existing export block (`case-file.js:834-871`).
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
   so it no longer reads as a second "autosave": update its internal
   identifiers/comments (`_autoExportTimer`, `setupAutoExportTimer`, the
   "Auto-Export" reminder copy) to describe it as the fallback/retry sweep
   it actually is (first-save nudge, or permission-revoked recovery) —
   distinct from the always-on 1-second `autoSave()` debounce that does
   the continuous real work. No functional change requested here per
   Decision 1's scope; flag during review if the redundant write itself
   should be removed rather than just reworded.
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

## Verification

Run `tests/unit/case-file.spec.js` (updated) and the extended
`tests/e2e/case-file-protection.spec.ts`, plus the full existing
persistence e2e family (`case-file-roundtrip.spec.ts`,
`backup-restore-sav.spec.ts`, `dashboard-backup.spec.ts`,
`recovery-cache.spec.ts`, `persistence-recovery.contract.spec.ts`,
`ward-lock.spec.ts`) and `routes.spec.ts` (its existing "Unsaved changes"
assertion at `:198` must still pass unchanged). This is a deletion-shaped
change touching the single most cross-cutting subsystem in the app —
recommend the full `npm test` regression before commit/push, per
`AGENTS.md`, the same recommendation 40A made for a similarly
cross-cutting deletion. Update `TEST-INDEX.md` for the rewritten unit test
and any new e2e assertions in the same commit.
