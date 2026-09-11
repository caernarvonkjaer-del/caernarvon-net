# Milestone 38C: Dashboard Editing Focus and Lifecycle Terminology

## Status

**Executable, independent delivery specification.** No runtime, persistence,
or test change is included in this documentation pass.

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
