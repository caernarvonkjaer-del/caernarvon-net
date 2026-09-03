# Milestone 18: Full Multi-Ward Backup .SAV & Save Controls Restore

## Goal

Provide guardians and legal assistants with a first-class, cohesive way to create a complete backup `.sav` file containing all of their wards, and to open/restore that backup directly from the **Save Controls** in the application sidebar.

In Milestone 17, the application migrated to per-ward files (`{wardName}-{wardId}.sav`) as the canonical day-to-day save model. However, a guardian or legal professional managing multiple wards also needs a unified safety net: a single master backup file containing the complete portfolio of wards in their care that can be safely archived, moved to secure offsite storage, or restored in one step when setting up a new device or recovering from an emergency.

This milestone formalizes the **Multi-Ward Backup (`.sav`)** format and adds dedicated **"Backup All Wards (.sav)"** and **"Open Backup (.sav)"** controls directly into the sidebar's Save Controls drawer.

---

## Non-Negotiables

1. **Security & Cryptography**:
   - Master backup files use the exact same AES-256-GCM encryption scheme and PBKDF2 key derivation (with salt and verification) as canonical ward files.
   - No unencrypted fallback or downgraded cipher modes.
   - Encryption password for the backup matches the active master session password (or unencrypted if running in 'none' mode).
2. **Backward & Forward Compatibility**:
   - Legacy version-2 archives (`guardianshipwarddata.sav`) and Milestone 17 version-3 archives must remain fully openable via "Open Backup (.sav)".
   - Opening a single-ward file via "Open Backup" should gracefully handle or guide the user without throwing uncaught exceptions.
   - `SAV_FORMAT_VERSION` is maintained at `3` with explicit `kind: 'backup'` (or `'archive'`) in `manifest.json`.
3. **Data Integrity & Audit Provenance**:
   - The backup file on disk must record its own creation in its embedded `auditLog.enc` (via `beginRecordingExport`) before serialization, ensuring audit self-containment.
   - Restoring a backup records a `DATA_IMPORT` audit event with the backup filename and the count of wards restored.
4. **Architectural & Usability Standards**:
   - **CSP Compliance**: No inline event handlers (`onclick`, etc.) or evaluated scripts. All button actions use `data-shell-action` handled via delegated listeners in `src/shell-events.js`.
   - **Lifecycle Safety**: Clean integration with existing `mount()` / `dispose()` lifecycles for active forms and feature modules.
   - **Platform Parity**: Seamless operation across Web (File System Access API with fallback to file input) and Portable single-file builds.
   - **Accessible UI**: Keyboard navigable buttons with appropriate ARIA roles, labels, and focus management.

---

## Backup File Specification (`.sav`)

The multi-ward backup `.sav` is an encrypted ZIP archive containing all wards, workflow metadata, system state, and cached templates:

```
{backupFilename}.sav (ZIP)
├── manifest.json         ← format: 'probate-guardian-export', kind: 'backup',
│                           version: 3, exportedAt, securityMode, salt, verifier,
│                           guardian identity, appState blob, templates list, ward index
├── appState.enc          ← encrypted app state (activeWardId, theme, recentWards, autoExport settings)
├── auditLog.enc          ← unified audit log across all wards (including the backup export event)
├── wards/
│   ├── {wardId1}.enc     ← encrypted ward data (forms, schedules, triage, workflow status)
│   ├── {wardId2}.enc
│   └── ...
└── templates/
    └── {type}.b64        ← court form template cache
```

### Suggested Filename Convention
- Default filename: `probate_guardian_all_wards_backup.sav`.
- Clear naming distinguishes master backups from single-ward files (which follow `{wardName}_backup.sav`).

---

## Save Controls UI Design

In the application sidebar (`#save-controls-body` in `index.html`), the Save Controls section is organized with clear visual hierarchy:

```
┌──────────────────────────────────────────────┐
│  AUTO-SAVE EVERY                             │
│  [ 10 minutes                           ▾ ]  │
│                                              │
│  ── WARD ACTIONS ─────────────────────────── │
│  [ Save Data File (.sav)                  ]  │
│  [ Open Data File (.sav)                  ]  │
│                                              │
│  ── CASE BACKUP ──────────────────────────── │
│  [ Backup All Wards (.sav)                ]  │
│  [ Open Backup (.sav)                     ]  │
│                                              │
│  ─────────────────────────────────────────── │
│  [ Lock                                   ]  │
│  [ Clear All Data                         ]  │
└──────────────────────────────────────────────┘
```

### New Buttons in `#save-controls-body`
1. **`Backup All Wards (.sav)`**:
   - Attribute: `data-shell-action="backup-all-wards"`
   - Functionality: Gathers all wards from `guardianData.wards`, records export provenance, serializes the multi-ward ZIP, and invokes `saveBlobAs()` with overwrite protection.
2. **`Open Backup (.sav)`**:
   - Attribute: `data-shell-action="open-backup-sav"`
   - Functionality: Prompts the user to pick a backup file (via `showOpenFilePicker` or `#backup-import-input`), validates manifest, decrypts, and displays a restore confirmation dialog before hydrating the wards into the session.

---

## In-Session Restore & Conflict Handling

When a user selects **"Open Backup (.sav)"** while a session is already active:

1. **File Selection**:
   - Browser with File System Access: Uses `showOpenFilePicker({ types: [{ accept: { 'application/octet-stream': ['.sav', '.zip'] } }] })`.
   - Fallback / Portable: Triggers a dedicated hidden file input `#backup-import-input`.
2. **Inspection & Decryption**:
   - Reads `manifest.json`. Checks `format === 'probate-guardian-export'`.
   - If encrypted, verifies key against `manifest.salt` / `manifest.verifier` (or prompts user for master password if salt differs).
3. **Confirmation & Scope Modal**:
   - If the session already contains wards, prompts user with a confirmation modal:
     > **Open All-Wards Backup**
     >
     > This backup contains **X ward(s)** exported on **[Date]**.
     >
     > • **[A] new ward(s)** will be added
     > • **[B] existing ward(s)** will be updated/replaced
     >
     > [ Cancel ]   [ Restore Backup ]
4. **Hydration & Navigation**:
   - Merges or replaces wards into `guardianData.wards`.
   - Re-derives dashboard triage and workflow states.
   - Clears active form view if replaced; navigates to `/dashboard` to display all loaded wards.
   - Emits `pg:backup-saved` / `pg:backup-restored` custom events and refreshes the sidebar.

---

## Implementation Slices

### Slice 18A: Master Backup Serialization & Provenance
- Standardize `buildBackupZipBlob()` (or refine `buildExportZipBlob()`) to produce version-3 multi-ward backup files with `kind: 'backup'`.
- Ensure `beginRecordingExport` records `"Exported full backup of X ward(s) to archive"` *before* ZIP serialization so `auditLog.enc` inside the backup contains the event.
- Export `window.backupAllWardsNow()` to trigger the Save As dialog with suggested name `probate_guardian_all_wards_backup.sav`.

### Slice 18B: Dedicated "Open Backup (.sav)" Flow
- Implement `openBackupSavFile()` in `src/legacy-app.js`.
- Add format sniffing: if user opens an archive/backup, restore all wards; if user accidentally selects a single-ward file, display a helpful notice and offer to load that ward.
- Add restore confirmation modal (`#backup-restore-modal` or clean confirmation dialog).
- Record `DATA_IMPORT` audit event upon successful restoration.

### Slice 18C: Save Controls Sidebar UI & Shell Events
- Update `#save-controls-body` in `index.html` with:
  - `Backup All Wards (.sav)` button (`data-shell-action="backup-all-wards"`)
  - `Open Backup (.sav)` button (`data-shell-action="open-backup-sav"`)
  - Associated hidden `<input type="file" id="backup-import-input" accept=".sav,.zip">`
- Update `src/shell-events.js` to dispatch these actions with auto-collapse handling (`collapseSaveControls?.()`).
- Add keyboard accessibility, SVG icons, and focus management.

### Slice 18D: Automated Testing & Verification
- Unit tests: verify manifest generation for multi-ward backups and validation of backup kinds.
- E2E Playwright specs (`tests/e2e/backup-restore-sav.spec.ts`):
  1. Create multiple wards -> click "Backup All Wards (.sav)" -> verify generated ZIP contains all wards and audit log.
  2. Clear session -> click "Open Backup (.sav)" -> verify all wards restored with full data and workflow status.
  3. Open backup in session with existing wards -> verify confirmation prompt and merge behavior.
  4. Encrypted multi-ward backup round-trip with master password verification.
  5. Fallback download/file-input path verification.

---

## Acceptance Criteria

- [ ] "Backup All Wards (.sav)" in Save Controls exports a valid version-3 `.sav` archive containing all current wards.
- [ ] The backup archive's `auditLog.enc` contains the record of its own export.
- [ ] "Open Backup (.sav)" in Save Controls opens the file picker and successfully restores all wards from a multi-ward backup file.
- [ ] Opening a backup file with existing session data prompts the user with the ward count and replacement details.
- [ ] Opening an encrypted backup prompts for password if salt differs, or unlocks transparently if session is already unlocked with matching key.
- [ ] Single-ward files can still be saved and opened independently without interference.
- [ ] All buttons follow CSP rules (no inline handlers) and support sidebar auto-collapse.
- [ ] All unit and Playwright E2E tests pass cleanly.
