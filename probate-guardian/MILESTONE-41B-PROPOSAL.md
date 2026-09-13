# Milestone 41B: Consolidate Save/Backup UI Controls

## Status

**Draft only — do not implement yet.** Independent of `MILESTONE-41-PROPOSAL.md`'s
3-tier form architecture (referred to below as 41A): different files, different
subsystem (save/export, not form rendering), no shared touchpoints. Sequenced
after Milestone 42 per direct instruction (2026-09-13), though this task's
actual technical dependency on 42 is much lighter than 41A's — it never adds
or renames a `window.*` export, so it needs no special accommodation from
42C's now-landed bridge guard (`b5ec9d3`; confirmed that guard only fails on
a *new, undeclared* global, not a removed one). The real reason to sequence
it after 42 is scheduling: it touches `shell-events.js` and `index.html`,
both live files, while a separate agent is actively working through
Milestone 42 in this same repo. Re-verify all line citations below against
`master` before implementing — this document was written while 42's
sub-deliveries were still landing, and 42E's dead-code removal had already
shifted one of this proposal's own citations by ~100 lines before this
draft was even committed (noted inline below).

## Goal

The sidebar's Save Controls panel currently shows four separate file-backup
buttons — **Save Data File (.sav)**, **Open Data File (.sav)**,
**Backup All Filings (.sav)**, **Open Backup (.sav)** — from an era when a
"single ward" export and a "whole archive" backup were genuinely different
operations. Milestone 40F unified the save pipeline onto one case-file model
where that distinction no longer exists at the data layer. This task reduces
the four buttons to two, matching the UI to what the code has already become.

## Background

Confirmed by reading the current code (not assumed):

- **The two "save" actions are already the same function.**
  `src/core/persistence/case-file.js:915-917`:
  ```js
  window.exportCaseFileZip = exportCaseFileZip;
  window.exportGuardianDataZip = exportCaseFileZip;
  window.backupAllWardsNow = exportCaseFileZip;
  ```
  `exportGuardianDataZip` (what "Save Data File" calls when no ward is open)
  and `backupAllWardsNow` (what "Backup All Filings" always calls) are the
  *same function reference*. The comment directly above explains this is
  deliberate: "exportGuardianDataZip/backupAllWardsNow used to be two
  different exports... under the unified model they're the same operation.
  Kept as aliases so existing UI markup... keeps working unchanged"
  (`legacy-app.js:2848-2851`, current as of `master` `bd122e6` — Milestone
  42E's dead-code removal shifted this comment from its original position
  at `:2943-2946`; content unchanged, only line numbers moved). "Save Data
  File," when a ward *is* open, calls
  `saveBackupNow()` instead (`shell-events.js:13-20`), which is a strict
  superset — it tries a silent rewrite to a remembered file handle first and
  only falls back to the same `exportCaseFileZip()` "Backup All Filings"
  always runs.
- **The two "open" actions funnel into the same import logic.**
  `import-data` → `triggerImportZip()` and `open-backup-sav` →
  `triggerOpenBackupSav()` both ultimately call
  `importSavArchiveOrWard(file, { isBackupFlow })` (`case-file.js:660-864`),
  which merges wards/parties/cases by ID either way — there is no "wipe
  everything first" path for either flow. `isBackupFlow` only changes the
  confirm-prompt wording, the completion-alert wording, and whether
  `pg:backup-restored` fires (only consumed by test synchronization hooks
  today, per a repo-wide grep — no production feature listens for it).
  `tests/e2e/backup-restore-sav.spec.ts:236-239` already states this in its
  own comment: "Under the unified case-file model there is no separate
  'single-ward' file shape to special-case... Open Backup treats them
  identically."
- **A single-ward export is still a valid input to either Open button.**
  The dashboard's distinct "share a copy of one ward" export
  (`exportSingleWardZip`, `src/features/dashboard/index.js:380`, via
  `buildSingleWardExportBlob`, `case-file.js:265-303`) writes the identical
  `format: 'probate-guardian-case'` manifest shape with one `wards` entry —
  fully readable by `importSavArchiveOrWard` regardless of which button
  triggers it. This flow is untouched by this task and remains the one
  genuinely single-ward-scoped export in the app.
- **The target wording already exists elsewhere in the app.** The
  auto-export-reminder toast already has a button reading "Save Backup Now"
  (`index.html:28`, `data-shell-action="save-backup"` → `saveBackupNow()`).
  This task's relabeling reuses that established term rather than inventing
  new copy.
- **Milestone 40F scoped itself to the backend only.** Its proposal and
  landed-status notes (`MILESTONE-40F-PROPOSAL.md`) never mention the UI
  buttons or their copy — the aliasing above was done specifically so the
  UI would *not* need to change at the time. This task picks up exactly
  where that one stopped.

## Decisions Required

1. **DECISION (recommended default): keep the `backup-all-wards` and
   `open-backup-sav` DOM ids/`data-shell-action` values as the two
   survivors; delete `export-data`, `import-data`, and the
   `zip-import-input` hidden file input.** These two ids carry the existing
   test investment — 6 locator references across
   `backup-restore-sav.spec.ts` (`:59,63,93,197,315,396`) — versus 2 for
   `export-data` (`backup-restore-sav.spec.ts:250`, `ward-lock.spec.ts:307`)
   and 0 for `import-data`. Keeping the more-referenced pair minimizes test
   churn to a handful of locator/label updates instead of rewrites.
2. **DECISION (recommended default): re-point the surviving
   `backup-all-wards` handler from `window.backupAllWardsNow?.()` to
   `window.saveBackupNow()`** (`shell-events.js:7`), so the surviving Save
   button gains the silent-handle-reuse optimization `backupAllWardsNow`
   currently lacks, rather than losing the better behavior "Save Data File"
   used to have. **Verified safe against every existing caller**: all 5
   tests that click `backup-all-wards` run inside a fresh
   `browser.newContext()` with no prior save in that session, so
   `loadCaseFileHandle()` returns nothing and every one already falls
   through to the identical `exportCaseFileZip()` call `backupAllWardsNow`
   makes directly today — checked each call site
   (`:59-61, 93-96, 197-200, 315-317, 395-396`) individually, not assumed.
   The one behavior this change actually introduces — silent rewrite on a
   *second* save once a handle exists — has no existing test either way
   (see Implementation Step 6).
3. **DECISION (recommended default): relabel the surviving Save button
   "Save Backup (.sav)"**, reusing the wording already established by the
   toast's "Save Backup Now" button rather than inventing new copy. Leave
   "Open Backup (.sav)" exactly as it is today — its label and prompt copy
   are already accurate under the unified model and need no change.
4. **DECISION NEEDED (genuinely open, no recommended default):** whether to
   also delete the now-UI-orphaned `triggerImportZip()`/
   `importGuardianDataZip()` (`case-file.js:630-651, 866-868`) and their
   `window.*` exports, since nothing in the UI will call them once
   `import-data` is deleted. **Recommend against doing so in this task**,
   but not because it's unsafe: Milestone 42C (`b5ec9d3`, landed) added
   `tests/unit/window-bridge.spec.js` against
   `tests/unit/fixtures/window-bridge-allowlist.json` — per that commit's
   own message, "a new window global outside the allow-list fails a test; a
   removed one never does," so deleting these two exports would not break
   that guard. It would, however, leave the generated
   `src/core/types/window-bridge.d.ts` stale until regenerated
   (`--declare`) and is backend dead-code cleanup unrelated to the UI
   consolidation this task is actually about — keep the two changes
   separate so each has its own clean red/green test story, the same
   granularity this repo used throughout 40H's ten independent tasks. File
   it as its own small follow-up once this task has landed.

## Implementation Steps

1. **`index.html`**: delete the `export-data` button (`:84`), the
   `import-data` button (`:85`), and the `zip-import-input` file input
   (`:86`). Relabel the `backup-all-wards` button (`:87`) from "Backup All
   Filings (.sav)" to "Save Backup (.sav)" and its `title` attribute from
   "Save a complete backup containing all filings" to "Save a backup of
   this case". Leave `open-backup-sav` (`:88`) and `backup-import-input`
   (`:89`) unchanged.
2. **`shell-events.js`**: delete the `case 'export-data':` block (`:13-20`)
   and the `case 'import-data':` line (`:22`). Change `case
   'backup-all-wards':` (`:7`) to call `window.saveBackupNow()` instead of
   `window.backupAllWardsNow?.()`.
3. **Update onboarding/help copy** that still names the deleted buttons:
   `index.html:391` (help panel, "Creating a Backup"), `index.html:395`
   (help panel, "Restoring from Backup" — verify wording flows naturally
   once only one Open button exists), `index.html:876-877` (onboarding
   walkthrough's "Create a backup" / "Restore a backup" rows), and
   `index.html:898` (troubleshooting: "click Save Data File once" → "click
   Save Backup once").
4. **`tests/e2e/backup-restore-sav.spec.ts`**: update the button-text
   assertion at `:61` (`/Backup All Filings \(\.sav\)/` →
   `/Save Backup \(\.sav\)/`); rename the two test titles at `:48` and
   `:75` to drop "All Wards" language ("Save Controls has Save Backup and
   Open Backup buttons...", "Save Backup exports a valid..."). Re-point the
   `:250` `saveWardBtn` locator from `data-shell-action="export-data"` to
   `data-shell-action="backup-all-wards"` — same button now covers both
   roles, and the test's own single-ward assertions are unaffected since
   the underlying export call is unchanged.
5. **`tests/e2e/ward-lock.spec.ts:307`**: re-point the
   `data-shell-action="export-data"` locator to
   `data-shell-action="backup-all-wards"`.
6. **New test** (genuine coverage gap, not currently exercised by anything):
   in one session, click Save Backup once (expect the existing Save-As
   `download` event, as today), then click it again without navigating away
   — expect a silent write with only the `alert('Backup saved.')` path, no
   second `download` event. This is the one real behavioral change this
   task introduces and it currently has zero coverage in either direction.
7. **`TEST-INDEX.md`**: update the `backup-restore-sav.spec.ts` row to
   describe the two-button surface and the new handle-reuse test.

## Acceptance Criteria

- Sidebar Save Controls shows exactly two file-backup buttons: **Save
  Backup (.sav)** and **Open Backup (.sav)**.
- A first Save Backup click in a session behaves exactly as today's "Backup
  All Filings" (Save-As prompt, full case export, self-contained audit log
  entry, `pg:backup-saved` event) — confirmed by the existing tests listed
  in Decision 2 passing unchanged apart from the label-text assertion.
- A second Save Backup click in the same session, after a handle was
  granted, silently rewrites with no repeat Save-As dialog (new test, Step
  6).
- Open Backup behaves exactly as today — no code path it reaches is
  touched by this task.
- No `.sav` file format, manifest, or encryption change. A file produced by
  today's "Save Data File" still opens via the surviving "Open Backup"
  button, since both already write/read the identical
  `probate-guardian-case` manifest shape.
- `npx playwright test backup-restore-sav.spec.ts ward-lock.spec.ts` green.
  Full regression deferred to the end, per this repo's standing convention
  for a multi-step delivery.

## Out of Scope

- Any change to `window.*` exports/aliases (`exportGuardianDataZip`,
  `backupAllWardsNow`, `triggerImportZip`, `importGuardianDataZip`,
  `saveBackupNow`) — permitted by Milestone 42C's landed bridge guard
  (removals don't fail `window-bridge.spec.js`) but deliberately kept as a
  separate follow-up rather than bundled into this UI-only task (see
  Decision 4).
- Any change to the `.sav` file format, encryption, or manifest schema.
- The dashboard's single-ward "share a copy" export (`exportSingleWardZip`)
  — untouched; it remains the one genuinely single-ward-scoped flow in the
  app.
- `MILESTONE-41-PROPOSAL.md`'s 3-tier form architecture (41A) — no shared
  files, no shared risk, no reason to sequence one before the other beyond
  both following Milestone 42.
