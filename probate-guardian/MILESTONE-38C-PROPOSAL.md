# Milestone 38C: Dashboard Editing Focus and Lifecycle Terminology

## Status

**Code landed 2026-09-11 (`b0321dd`). Remaining gaps closed 2026-09-13** —
see the completion note below. The specification text itself is unchanged.

### Completion note (2026-09-13)

`b0321dd` landed this milestone's central change (`buildCaseFileBlob()` stopped
writing `appState.activeWardId`) but **not the rest of the table**, and not the
E2E-test row of its own delivery checklist. That left seven persistence/export
specs red for two days, all asserting the pre-38C behavior this milestone
deliberately removed, which is how the gap was eventually found — by
investigating the failures rather than the code.

Four code paths still violated the storage table and were fixed:

1. **`loadCaseFileFromZip()`** set `caseFile.activeWardId = a.activeWardId || null`
   from the archive, so any pre-38C `.sav` auto-opened its filing through
   `initApp()`'s `getActiveWard()`. It now keeps focus `null` and consumes a
   legacy value exactly once as recent history — prepending it to
   `recentWards` if it names a ward the archive actually contains — which is
   what the table's "legacy read behavior" column specifies.
2. **The same function's `else` branch** fell back to
   `caseFile.activeWardId = wards[0].wardId` whenever an archive had no
   `appState` section at all, which is every single-ward export. That is
   precisely the prohibited "fall back to the first ward solely because data
   was imported." Focus is now forced `null` for every archive shape.
3. **`importSavArchiveOrWard()`** called `switchWard(activeWardId)`, and
   failing that `switchWard(wards[0].wardId)`, on completion. Both are gone;
   import now closes any open editor through `unloadWard()` *before* replacing
   ward data and lands on the neutral dashboard.
4. **Only `navigate()` ended editing focus.** `router.js` called
   `enterDashboardEditingFocus()` from `navigate()` alone, but
   `legacy-app.js`'s `handleHash()` calls `renderPage()` directly — so reaching
   the dashboard by hash or by the **browser Back button** released nothing:
   the ward lock stayed held, `activeWardId` stayed set, and `window.D` stayed
   populated. A held lock can stop another tab from opening that ward at all.
   The call moved into `renderPage()`, which covers every route in; it
   early-returns when no ward is open and de-dupes concurrent calls, so
   `navigate()` is unaffected. This is the "direct hash/history" case 38C's own
   E2E row named.

Point 4 also exposed a live instance of the Milestone 40F/40G hazard: the first
attempt at it was written into `legacy-app.js`'s `renderPage()`, which is
**shadowed** — `router.js:259` publishes `window.renderPage`, so the legacy copy
is dead code and the fix silently did nothing until a probe showed the lock
still held. `renderPage` is therefore another duplicated pair of the same kind
40F removed for the save pipeline, and is a candidate for the same treatment.

Point 3 is worth reading if you touch this again: the obvious-looking fix —
nulling `activeWardId` and then navigating — is wrong. `enterDashboardEditingFocus()`
early-returns on `if (!caseFile.activeWardId)`, so clearing the flag first makes
the dashboard skip committing pending values, clearing `window.D`, **and
releasing the ward lock**. Going through `unloadWard()` keeps that sequence
intact, and flushing before the data swap means the save writes the ward the
user was actually editing rather than an imported replacement of it. A test
caught this; the reasoning did not.

Tests updated to the post-38C contract, preserving what each one actually
protects rather than deleting the assertion: `case-file-roundtrip.spec.ts`
(both paths), `recovery-cache.spec.ts`, `dashboard-backup.spec.ts` (plus a
stale comment that documented the removed fallback), `unlock.spec.ts`, and
`backup-restore-sav.spec.ts` (two tests, retitled — one now proves no stale
`window.D` survives a restore, the other that cross-tab lock contention is
reached by an explicit Edit instead of by the restore itself). The idiom used
throughout — assert a neutral `#ward-selector`, switch explicitly, then assert
the name — was already present in `persistence-recovery.contract.spec.ts`,
which someone had partially updated.

`TEST-INDEX.md`: no change required, recorded here per this milestone's
Catalogue row. No test file was added, renamed, or repurposed, and no
category or scope changed — each updated spec still covers the same subject,
with corrected expectations. Two tests were retitled within their existing
files, which the file-level index does not describe.

### Three further failures, none of them 38C (2026-09-13)

Chasing the same set turned up three unrelated defects. All three had the same
shape — a test asserting something true before a *later* milestone changed it —
but one was a real user-facing bug:

- **`persistence-recovery.contract.spec.ts:30` — a real bug, and mine.** The
  D-3 Safe Deposit Box validator added earlier (commit `26380a5`) tested
  `!== true && !== false`. But `normalizeWardData()`
  (`legacy-app.js:6950-6951`) migrates a loaded ward's `hasSafeDepositBox` /
  `safeDepositBoxFiled` to the canonical `'Yes'`/`'No'` strings — the
  Milestone 37-5 radio convention — while the radios themselves still write
  booleans. So after any save-and-reopen the value is a string, and **three
  readers disagreed about one field**: the validator reported the question
  unanswered and blocked export, the radios (`=== true`/`=== false`) rendered
  as if nothing had been chosen, and the dependent "inventory filed" row hid
  itself. A filer who answered the question, saved, and reopened would be
  blocked from exporting with the answer apparently blank. Fixed by accepting
  both shapes in every reader via `sdbIsYes`/`sdbIsNo`/`sdbAnswered` in
  `guardian-inventory/index.js`. Isolated by bisecting the round trip: the
  archive holds `false` and load preserves it, but activation rewrites it.
- **`case-file-protection.spec.ts:165`** counted one write where it expected
  zero. Not an overwrite-protection failure: entering the dashboard commits
  and saves the open filing (this milestone), and that legitimate case-file
  save goes through the same stubbed handle. The counter is now reset
  immediately before the click so it measures only the button's effect.
- **`dashboard-backup.spec.ts:13`** compared ward JSON byte-for-byte across a
  dashboard navigation; the only difference was `lastModified`, re-stamped by
  that same save. The snapshot now excludes that one field, which cannot carry
  a dashboard preference and is therefore irrelevant to what the test guards.

Superseded note: an earlier revision of this section listed two of these as
"not 38C-related and still open." All three are now closed.

## Goal

Make the All Filings Dashboard a neutral work-selection screen and separate
editing focus from the filing's open/closed lifecycle without losing pending
work or leaving stale locks.

## Final Terminology

| Current label | New label | Meaning |
| --- | --- | --- |
| `Open` | **Edit** | Select the filing and enter its editor. |
| `Mark Closed` | **Mark Closed** | Move the filing to Closed Filings. |
| `Reopen` | **Mark Open** | Return the filing to Active Filings. |

There is no **Close Editor** button on the dashboard. Entering the dashboard
itself ends editing focus after pending values are committed and saved. This
resolves the former contradiction between a dashboard-only Close Editor action
and the requirement that the dashboard never retain an active editor.

## State Decision

`activeWardId` becomes runtime/session editing focus only:

1. Entering `/dashboard` flushes pending field values and autosave, releases
   the ward lock, clears `activeWardId`, clears `window.D` and active filing
   type, publishes no active editing target to peer tabs, and renders the
   neutral sidebar.
2. New `.sav` archives and recovery-cache records do not persist
   `activeWardId` as an instruction to reopen an editor. Existing archives may
   contain it; load treats it as legacy resume history and does not auto-open
   the filing.
3. Existing persisted `recentWards` is the source for an explicit **Continue
   Editing** prompt. No new competing last-edited field is introduced.
4. Tab state reports `hasActiveCase` only when a ward is actively selected for
   editing, not merely because the case file contains one or more wards.
5. `archived` remains the independent persisted lifecycle flag. Dashboard
   workflow status remains independent from both editing focus and `archived`.

## Implementation

1. Add one idempotent dashboard-entry transition and route every dashboard
   entry through it, including direct, browser-history, startup, and shell
   navigation paths.
2. Render a neutral sidebar with no ward, guardian, filing type, progress,
   filing navigation, output actions, or editing-session action. Keep only
   dashboard-wide controls that make sense without an editor.
3. Rename dashboard and Continue Editing row actions to **Edit**, and lifecycle
   `Reopen` actions to **Mark Open**. Update accessible names and descriptions.
4. Make every row action resolve its target from its own `wardId`. An action
   that intentionally enters filing context, such as Edit or PDF preview, may
   establish editing focus only after its target is resolved and its lock is
   acquired.
5. Stop serializing active editing focus in new archive/recovery output and
   migrate old resume metadata conservatively to existing recent history.
6. Correct tab-state semantics and audit autosave, lock release, dirty state,
   startup recovery, focus placement, and browser navigation.
7. Update the `caseFile.activeWardId` row in
   `probate-guardian-data-model.csv` to describe its new runtime/session status,
   legacy-read behavior, and `recentWards` resume-history boundary. Treat this
   as a persistence-contract migration even though old archives remain
   readable.

## Executable Transition and Code Map

The former design gate is closed by this contract.

### Single transition owner

Add `enterDashboardEditingFocus()` to
`src/core/navigation/ward-lifecycle.js`. It is the sole owner of ending editing
focus. It keeps one module-level in-flight promise so concurrent dashboard
requests await the same transition. With no active ward and no held ward lock,
it is an idempotent success and republishes nothing.

For an active editor it performs exactly this sequence:

1. Call `commitPendingFieldValues()` and `pruneBlankCards()` while the editor
   DOM and ward lock still exist.
2. Call `flushPendingSave({ requireRecovery: true })` while the lock is held.
   Success means either no dirty data existed or the current encrypted recovery
   snapshot completed; an available writable `.sav` handle is also updated by
   the existing path. No file handle is a normal state and does not block the
   dashboard when recovery succeeded.
3. If the flush returns failure or throws, show the existing save-error surface,
   return `false`, and retain the current route, lock, `activeWardId`,
   `window.D`, and filing type.
4. Ensure the current ward is present at the head of `recentWards` using the
   existing bounded helper. This does not mark the ward `archived` or change
   dashboard workflow state.
5. Await `releaseWardLock()`. If it throws, return `false` and retain editing
   focus. The current lock implementation is idempotent and absorbs Web Locks
   completion errors; the catch is a contract backstop.
6. Set `caseFile.activeWardId = null`, `window.D = {}`, and
   `window.activeInventoryType = null` through the existing property bridge in
   `src/legacy-app.js`; clear visited-page/session editor state that is keyed
   to the former filing. Do not add a second active-type variable or setter.
7. Call `updateSidebar()`, `refreshAutoSaveArmedStatus()`, and
   `notifyProbateGuardianTabStateChanged()` in that order.
8. Return `true`; only then may the router dispose the editor and mount the
   dashboard.

Do not use a timeout, sleep, fire-and-forget save, or route recursion.
`unloadWard()` becomes a compatibility wrapper that awaits this transition and
then calls `navigate('/dashboard')` only on success. It must not clear state or
release a lock independently.

### Router and browser-history owner

Extend the ESM router signature to
`navigate(page, { updateHash = true } = {})`. When `page === '/dashboard'`, it
awaits `enterDashboardEditingFocus()` before `setCurrentPage()`, hash mutation,
feature disposal, or route rendering; `false` aborts navigation.

The classic `handleHash()` in `src/legacy-app.js` currently calls its lexical
`renderPage()` directly and therefore bypasses ESM `navigate()`. Change only
its special `/dashboard` branch to await
`window.navigate('/dashboard', { updateHash: false })`; use the same route for
startup and browser back/forward. Programmatic shell navigation continues to
call `window.navigate('/dashboard')`. Guard same-page dashboard requests with
the idempotent transition rather than bypassing it. `renderPage()` remains a
renderer and does not own save/lock mutation.

### Flush result contract

Update the classic persistence functions and the thin
`src/core/persistence.js` adapter so
`flushPendingSave(options)` returns `{ ok, recoverySaved, archiveSaved,
error }`. Update `saveSessionRestoreCache()` in both the active classic
bootstrap and `src/core/persistence/recovery-cache.js` to return `true` on a
completed write, `false` on a caught failure, and `true` when there is nothing
dirty to recover. Preserve existing debounce and writable-handle behavior.
Callers that omit options retain best-effort behavior; dashboard entry alone
sets `requireRecovery: true`.

### Persistence disposition

Apply all rows in this table; there is no remaining choice about
`activeWardId` storage.

| Store/path | New write behavior | Legacy read behavior |
| --- | --- | --- |
| In-memory `caseFile.activeWardId` | Retain as runtime editing focus. | Set only after explicit `activateWard()`/`switchWard()` succeeds. |
| App-state `saveAppState('activeWardId', ...)` | Remove writes from activation and unload in modular and classic paths. | Ignore for focus. If it names an imported ward, merge that ward once into existing `recentWards`; do not auto-open it. |
| `.sav` `appState.activeWardId` in `buildCaseFileBlob()` and classic counterpart | Omit from new archives; no format-version bump. | Consume only for the one-time recent-history merge above, then keep runtime focus `null`. |
| Recovery-cache `activeWardId` | Omit from new cache records. | On restore, merge a valid value into `recentWards`, set `activeWardId = null`, and never fall back to `restoredWards[0].wardId`. |
| Import/open completion | Never call `switchWard(activeWardId)` or fall back to the first ward solely because data was imported/restored. | Land on neutral dashboard; the user chooses Edit/Continue Editing. |
| `recentWards` | Continue existing bounded persistence and live-record rehydration. | Drop IDs not present in restored wards; preserve valid timestamp order and prepend a valid legacy active ID without duplication. |

Update `src/core/types/case-file.js` to describe runtime-only focus. Update the
`caseFile.activeWardId` CSV row from `persisted,input` to runtime/session state
and document legacy-read-to-`recentWards`. Existing archives stay readable.

### Dashboard, sidebar, and tab state

In `src/features/dashboard/index.js`:

- remove active-filing Rename/Close controls from the dashboard header/rows;
- label every `open-ward` action **Edit** and every archived queue action
  **Mark Open**;
- require `data-ward-id` for Edit, Backup, PDF, New year, Prior years, Mark
  Closed/Open, and Delete; missing/unknown IDs return without acting;
- Continue Editing reads only `recentWards`, labels its action **Edit**, and
  opens nothing until clicked;
- PDF calls `switchWard(rowWardId)` and proceeds only when it returns true;
  Backup remains context-free and never activates a ward.

In `updateSidebar()`'s no-active-focus branch, keep the application shell and
dashboard-wide controls visible but clear/hide the ward selector value and ID,
ward information card, filing context strip, filing navigation, progress,
output/save controls, and editor actions. Return before form-engine dispatch.

Change `getProbateGuardianTabState()` to
`hasActiveCase: Boolean(activeWard)` and `activeCase: null` otherwise.
`src/tab-state.js` keeps its normalization behavior; add regression coverage
that a supplied false/no activeCase stays false even when wards exist. Dirty
state remains independent and may still make a peer tab risky.

### Files and outcomes

| Outcome | Required files/result |
| --- | --- |
| Code | Update ESM router/lifecycle, classic hash/persistence/sidebar/tab publisher, dashboard feature, modular recovery/case-file/type owners, and thin persistence adapter exactly as above. |
| Persistence | Update `probate-guardian-data-model.csv`; run `npm run verify:data-model`; prove old `.sav` and cache records are readable but cannot auto-open. |
| Unit tests | Extend `router.spec.js`, `ward-lock.spec.js`, `tab-state.spec.js`, `case-file.spec.js`, and `dashboard-view-model.spec.js`; add/extend recovery helper coverage for the explicit migration table. |
| E2E tests | Extend `ward-lock.spec.ts`, `recovery-cache.spec.ts`, `case-file-roundtrip.spec.ts`, `backup-restore-sav.spec.ts`, `dashboard-backup.spec.ts`, and `persistence-recovery.contract.spec.ts` for transaction failure, direct hash/history, neutral sidebar, and explicit Edit. |
| Catalogue | Update `TEST-INDEX.md` only if a test file is added/renamed/repurposed or its category/scope changes; record the actual disposition. |
| Documentation | Update dashboard/help text that says Open/Reopen/Close; otherwise record `No additional documentation update required`. |

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| Enter dashboard from editor | Pending input is retained, lock is released, and no editing focus remains. |
| Dashboard sidebar | Neutral state; no filing identity, progress, navigation, output, or Close Editor action. |
| Dashboard row Edit | Acquires the selected filing and restores its editor/sidebar without changing `archived`. |
| Mark Closed/Mark Open | Changes only lifecycle queue state, not editing history or workflow status. |
| Edit a closed filing | It remains lifecycle-closed until Mark Open is chosen. |
| Row action with no active editor | Uses its own `wardId`; no stale prior filing is targeted. |
| Continue Editing | Uses `recentWards` and opens nothing until explicitly selected. |
| Save/recovery/startup | Dashboard navigation is not serialized as a destructive case-data change and no editor auto-opens from legacy `activeWardId`. |
| Peer tabs | Dashboard reports no active editing case; dirty state still reflects actual unsaved case changes. |

## Verification

Add router/state tests for repeated dashboard entry, pending drafts, archive and
recovery compatibility, recent-history behavior, and tab-state semantics. Add
E2E coverage for neutral sidebar, Edit restoration, row actions without active
focus, closed filings, lock handoff, browser history, startup, accessibility
focus, and no data loss. Run `npm run verify:data-model` and focused archive,
import, recovery, and save/reopen compatibility tests selected through
`TEST-INDEX.md`.
