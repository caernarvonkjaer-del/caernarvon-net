# Milestone 27: Legacy Monolith Decomposition & Pure ESM Bootstrapping

## Goal

Decompose the remaining ~8,900-line monolithic script (`src/legacy-app.js`) into focused, testable ES modules under `src/core/` and bootstrap the application as a modern, pure ES Module application while preserving the single-file portable distribution (`dist/portable/index.html`).

1. **Extract Core Persistence & Case File Services (`src/core/persistence/`)**:
   - `case-file.js`: ZIP archive building, WebCrypto AES-GCM encryption/decryption, File System Access API handles (`showSaveFilePicker`, `showOpenFilePicker`), fallback downloads, and auto-export timers.
   - *Architecture Note*: `JSZip` remains a core boot dependency to support opening `.sav` files immediately on startup or restoring encrypted session state.
2. **Extract Navigation & Routing (`src/core/navigation/`)**:
   - `router.js`: Route registration, URL hash/path navigation (`navigate()`), active filing lifecycle (`activateWard()`, `switchWard()`), and scroll/focus management.
3. **Extract Modal Orchestration (`src/core/modals/`)**:
   - Modal handlers for filing conversion, year management, ward renaming/deletion, and eligibility checks.
4. **Pure ESM Application Entry Point (`src/main.js`)**:
   - Convert `index.html` script loading from classic script evaluation to `<script type="module" src="./src/main.js"></script>`.
   - Remove global `window.*` assignments in favor of standard ES module imports and exports.

---

## Why This Is Needed

While Milestones 1–25 extracted page renderers into `src/features/`, `src/legacy-app.js` still contains over 8,900 lines of critical business logic. It relies on global `window.*` assignments for cross-module coordination.

Decomposing this monolith:
- Eliminates circular dependencies and hidden global mutations.
- Enables bundler tree-shaking and module code-splitting.
- Makes individual subsystems (crypto, persistence, routing, modals) independently unit-testable without mocking global `window` objects.

---

## Non-Negotiables

1. **Zero Storage Format Regression**: `.sav` archive structure (ZIP containing `manifest.json`, `ward.enc`, `auditLog.enc`) and encryption parameters must remain 100% backward and forward compatible.
2. **Single-File Portable Build Continuity**: `npm run build:portable` via `vite-plugin-singlefile` must continue to produce a completely self-contained `dist/portable/index.html` that runs from double-clicked `file://` URLs in any browser.
3. **Immediate Boot JSZip Availability**: JSZip must be available synchronously or immediately during startup so `.sav` drops and encrypted restores do not encounter race conditions.
4. **Full Test Parity**: All 108+ unit tests and 202+ Playwright tests must pass with 0 regressions.

---

## Target Architecture

```text
src/
  main.js                      # Application bootstrap, DOMContentLoaded init
  core/
    persistence/
      case-file.js             # buildCaseFileBlob, openCaseFileZip, FileSystemAccess handles
      crypto.js                # WebCrypto PBKDF2/AES-GCM encryption/decryption
      recovery-cache.js        # IndexedDB session restore & autosave cache
      launch-preferences.js    # Device preferences (theme, assistant view)
    navigation/
      router.js                # navigate(), route matching, active feature mounting
      ward-lifecycle.js        # activateWard(), switchWard(), deleteWard(), renameWard()
    modals/
      convert-ward-modal.js    # New form from existing filing logic
      year-manager-modal.js    # Prior year editing, new year rollover
      eligibility-modal.js     # Form qualification checks
    state.js                   # Canonical caseFile, activeWardId, state observers
```

---

## Critical Implementation Watch-Outs

1. **Templates Modules Conversion (`templates/*-template.js`)**:
   - Currently, `templates/annual-template.js`, `simplified-template.js`, and `guardian-template.js` are loaded as classic scripts in `<head>`.
   - Convert these to clean ESM exports and import them directly into their feature loaders/modules rather than keeping script tags in `<head>`.
2. **Preserve `window.D` & `window.caseFile` Read/Debug Getters**:
   - Multiple Playwright E2E tests and debugging workflows inspect `window.D` and `window.caseFile` via `page.evaluate()`.
   - Expose read/debug getters on `window` bound to `src/core/state.js` so test harnesses and console inspection remain 100% operational during and after the ESM transition.
3. **Vite Single-File Inlining Assurance**:
   - Ensure `vite-plugin-singlefile` continues to inline the modular ESM graph into `dist/portable/index.html` without creating external module requests or dangling dynamic import failures when opened over `file://`.

---

## Verification Plan

### Automated Unit Tests (`vitest`)
- `tests/unit/case-file.spec.js`: Test ZIP creation, encryption/decryption round-trips, corrupted file rejection, and single-ward export isolation.
- `tests/unit/router.spec.js`: Test route resolution, feature mounting/unmounting, and route change hooks.
- Full Vitest suite: `npx vitest run`.

### Automated E2E Tests (`playwright`)
- `tests/e2e/save-open-sav.spec.ts` (17 tests covering unified case file, backups, and overwrite protection)
- `tests/e2e/ward-lock.spec.ts` (Multi-tab locking & atomic handover)
- `tests/e2e/startup.spec.ts` (Fresh start, encrypted case restore, password creation)
- `tests/e2e/routes.spec.ts` (All route navigations)

### Production Build Validation
- `npm run build:web`
- `npm run build:portable`
- Verify `dist/portable/index.html` opens and restores a `.sav` file in a clean browser session without console errors.
