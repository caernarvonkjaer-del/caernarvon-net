# Milestone 17: Per-Ward Save Files

## Goal

Replace the current single-file save model with one save file per ward.

Today, all wards live together inside a single `guardianshipwarddata.sav` archive (a ZIP with AES-256-GCM encrypted `.enc` entries per ward, a shared `manifest.json`, `appState`, and `auditLog`). A professional legal assistant or secretary who manages multiple guardianship cases carries all of those cases in one undifferentiated blob. They cannot hand a single ward's file to a colleague, keep wards in separate folders by client, or restore one ward from backup without restoring all of them at once.

This milestone splits the save model: each ward gets its own independent `.sav` file with its own encryption, manifest, and audit log. The startup dialog's labels and body copy are updated to match. Backwards compatibility with version-2 multi-ward archives is preserved — existing files can still be opened and their wards extracted into the new model.

## Non-Negotiables

- `SAV_FORMAT_VERSION` is bumped from `2` to `3` for per-ward files. Version-2 archives (existing files) remain openable; their wards are extracted and saved individually on first write.
- Do not break existing `.sav` version-2 files. A user who opens their existing file must be able to continue working without re-entering data.
- Per-ward files use the same AES-256-GCM encryption scheme as today. No weaker security path is introduced.
- Preserve CSP: no source-authored executable inline scripts or inline event handlers.
- Preserve `mount()`/`dispose()` lifecycle safety for all features.
- Web and portable builds must remain valid.
- The audit log moves into each ward's own file. No ward's activity should be readable from another ward's file.
- Dashboard workflow metadata (`workflowStatus`, `assigneeName`, `deadlineDate`, etc.) lives with each ward's file — not in a separate shared file.

## Current `.sav` Structure (version 2)

```
guardianshipwarddata.sav (ZIP)
├── manifest.json         ← format, version, exportedAt, securityMode, salt, verifier,
│                           guardian identity, appState blob, templates list, ward index
├── appState.enc          ← activeWardId, theme, walkthrough flags, recentWards,
│                           autoExport settings, unlockFailState
├── auditLog.enc          ← flat array of all entries across all wards
├── wards/
│   ├── {wardId}.enc      ← encrypted ward data object
│   └── {wardId}.enc
└── templates/
    └── {type}.b64
```

## Per-Ward `.sav` Structure (version 3)

Each ward saves as its own independent ZIP archive:

```
{wardName}-{wardId}.sav (ZIP)
├── manifest.json         ← format, version, exportedAt, securityMode, salt, verifier,
│                           wardId, wardName (plain for filename suggestions), appState blob
├── ward.enc              ← encrypted ward data object (single ward only)
└── auditLog.enc          ← audit log entries for this ward only
```

### Shared / cross-ward state

The following state is no longer inside any ward file — it lives in the app's launch-preferences store (`pg-launch-pref` / IndexedDB / `localStorage` fallback), the same place that already persists the file handle and theme between sessions:

| Field | New home |
|---|---|
| `theme` | Launch preferences (already written there today for next-launch restore) |
| `walkthroughCompleted` | Launch preferences |
| `firstLaunchSeen` | Launch preferences |
| `continuePromptShown` | Launch preferences |
| `recentWards` | Launch preferences (already a list of wardId + wardName + timestamp) |
| `autoExportIntervalMinutes` | Launch preferences |
| `lastExportAt` | Per-ward file (each ward has its own backup timestamp) |
| `unlockFailState` | Launch preferences |
| `guardianName` / `guardianEmail` | Per-ward file (replicated if shared, or removed if not needed) |
| `activeWardId` | Launch preferences (which ward was last open) |
| `templates` | Launch preferences or app-level store (shared across wards) |

> [!IMPORTANT]
> The `guardianName` / `guardianEmail` field is currently a single shared identity across all wards in the session. Per-ward files need a decision: does each ward carry its own guardian identity (appropriate if one user manages multiple people), or does the app keep one shared identity? This is an open question for the implementer to resolve before slice 17B.

## Startup Dialog Changes

Update the startup dialog (`#startup-choice-overlay`) to reflect per-ward files:

### Labels

| Current | New |
|---|---|
| **Open a Case File (.sav)** | **Open a Ward File (.sav)** |
| **Start a New Case** | **Start a New Ward** |

### Body copy

Current:
> "This app keeps nothing in this browser between visits — every case lives entirely in a .sav file you choose and control. Open one to continue where you left off, or start a brand-new case."

Replacement:
> "This app keeps nothing in this browser between visits — every ward lives in its own .sav file you choose and control. Open one to continue where you left off, or start a brand-new ward."

### `data-startup-action` values

The action names `open-case` and `start-new-case` are referenced in:
- [`src/startup-events.js`](file:///c:/Users/No%20Name/caernarvon.net/probate-guardian/src/startup-events.js) — delegated click handler
- [`legacy-app.js`](file:///c:/Users/No%20Name/caernarvon.net/probate-guardian/src/legacy-app.js) — `openCaseFileAtLaunch()`, `startNewCaseAtLaunch()`
- E2E tests — `#startup-newcase-btn`, `#startup-newcase-link`, `data-startup-action="open-case"` / `"start-new-case"`

Options:
1. **Rename** — change `open-case` → `open-ward` and `start-new-case` → `start-new-ward` throughout. Cleaner long-term. Requires updating tests.
2. **Keep action names, update only labels** — display text changes but `data-startup-action` values stay. Tests require no update.

Prefer option 1 (rename), but document the full set of test selectors and strings that need updating before executing.

## Version-2 Migration Path

When a user opens a version-2 multi-ward `.sav` file on a version-3 build:

1. The file is detected as version 2 from `manifest.json`.
2. All wards are extracted and decrypted using the existing import path.
3. A migration dialog informs the user:

   > **Your save file has been updated to the new format.**
   >
   > Each ward is now saved as its own separate file. We'll save each ward individually when you next open it or use Save/Export.
   >
   > [ Got it ]

4. Wards are loaded into memory normally. Each ward is written to its own per-ward file on the next save event (auto-save, manual export, or backup).
5. The old multi-ward file is **not deleted automatically** — the user retains it as a backup until they choose to remove it.
6. `SAV_FORMAT_VERSION` is written as `3` on the first per-ward save, so subsequent opens recognize the new format.

## Auto-Save Behaviour Changes

Today: one `FileSystemFileHandle` points to the multi-ward archive. Auto-save rewrites the whole ZIP.

Per-ward: each open ward holds its own `FileSystemFileHandle`. Auto-save rewrites only that ward's file. The handle is remembered per-ward in launch preferences (`pg-launch-pref`) keyed by `wardId`.

Implications:
- Opening Ward A re-arms auto-save for Ward A's handle.
- Switching to Ward B re-arms auto-save for Ward B's handle (if one exists).
- The "Save Backup" button saves the currently active ward's file.
- A "Save All" option is not required for this milestone — wards are only modified when active.

## Dashboard Changes

The "Backup" per-ward action on the dashboard already calls `exportSingleWardZip(wardId)`, which already builds a single-ward ZIP. In M17 this becomes the canonical save format, not a secondary export path. The implementation aligns naturally — the existing single-ward export logic becomes the primary path.

## Implementation Slices

Work in slices and checkpoint after each with: files touched, visible behavior changed, tests run and results, any deferrals.

### 17A: Version-3 per-ward file format

- Define the version-3 manifest shape (single `ward.enc`, per-ward `auditLog.enc`, no ward index array).
- Update `buildExportZipBlob()` (currently builds a multi-ward ZIP) to instead build a single-ward ZIP for version 3.
- Add a new `buildWardZipBlob(wardId)` function that replaces `exportSingleWardZip` as the canonical save path.
- Bump `SAV_FORMAT_VERSION` to `3`.
- Keep `buildExportZipBlob()` available for the multi-ward "export all" path (a user may still want a single backup of everything — this becomes an explicit "Export All Wards" action rather than the default save).

### 17B: Per-ward file handle management

- Replace the single `_zipFileHandle` with a per-ward handle map (`Map<wardId, FileSystemFileHandle>`), stored in launch preferences.
- `rememberZipHandle(wardId, handle)` — stores handle for the given ward.
- `loadZipHandle(wardId)` — retrieves handle for the given ward.
- `refreshAutoSaveArmedStatus()` — checks the active ward's handle, not a global one.
- Resolve the `guardianName` / `guardianEmail` shared-identity question before implementing this slice.

### 17C: Version-2 import and migration

- Detect version-2 files in the import path.
- Extract wards from the version-2 multi-ward ZIP using the existing decryption path.
- Show the migration dialog (one-time, dismissible).
- Load extracted wards into memory normally; write each ward's file on next save.

### 17D: Startup dialog relabelling

- Update `index.html` startup overlay text: "Open a Ward File (.sav)" / "Start a New Ward" and body copy.
- Rename `data-startup-action` values: `open-case` → `open-ward`, `start-new-case` → `start-new-ward`.
- Update `openCaseFileAtLaunch()` → `openWardFileAtLaunch()` and `startNewCaseAtLaunch()` → `startNewWardAtLaunch()` in `legacy-app.js`.
- Update `startup-events.js` switch cases.
- Update all E2E test selectors and `startNewCase()` helper in `tests/e2e/support/target.ts`.

### 17E: "Export All Wards" action

- Add an explicit "Export All Wards" action to the dashboard or settings panel.
- This builds the multi-ward ZIP (the old default format, repurposed as an explicit backup-all action).
- The file can still be named `guardianshipwarddata.sav` for continuity, or a new suggested name.

### 17F: Tests and documentation

- Update `tests/e2e/support/target.ts`: rename `startNewCase` → `startNewWard`, update all selectors.
- Update `save-open-sav.spec.ts` for per-ward open/save flows.
- Add migration spec: open a version-2 fixture `.sav`, verify migration dialog, verify wards load correctly.
- Add per-ward handle spec: open Ward A, save → re-open → verify handle is remembered.
- Update `INDEX-SPLIT-PLAN.md` with completion notes.
- Update `HOW-TO-RUN.txt` to describe the per-ward file model.

## Open Questions

> [!IMPORTANT]
> **Guardian identity**: `guardianName` / `guardianEmail` is currently one shared identity across all wards. With per-ward files, does each ward carry its own guardian identity, or does the app maintain one shared identity written to launch preferences? This must be resolved before slice 17B.

> [!IMPORTANT]
> **`data-startup-action` rename**: Confirm that renaming `open-case` → `open-ward` and `start-new-case` → `start-new-ward` is acceptable (it requires updating test selectors). If not, labels change but action attribute values stay.

> [!NOTE]
> **Templates**: The current `.sav` bundles Excel/PDF templates as `templates/{type}.b64`. With per-ward files, templates should move to the launch-preferences store (shared across wards) or be replicated into each ward's file. Confirm which model is preferred.

> [!NOTE]
> **"Export All Wards" placement**: Should the bulk-export action live on the dashboard header, in a settings/preferences panel, or somewhere else?

## Acceptance Criteria

- Each ward saves as its own independent `.sav` file with format version 3.
- Opening a ward file loads exactly that ward; the dashboard shows all wards whose files have been opened this session.
- Auto-save re-arms per ward, not per session.
- Existing version-2 `.sav` files open successfully; wards are extracted and the migration dialog is shown once.
- The startup dialog reads "Open a Ward File (.sav)" and "Start a New Ward."
- The startup body copy refers to "ward" not "case."
- An "Export All Wards" action produces a multi-ward ZIP backup.
- Per-ward audit logs are isolated — one ward's log is not readable from another's file.
- No existing E2E test scenario is broken (updated selectors pass in the renamed world).
- `SAV_FORMAT_VERSION` is `3` in all new files.
- CSP is preserved; no new inline handlers.
- Web and portable builds remain valid.
