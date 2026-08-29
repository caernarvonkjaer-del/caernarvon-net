# Probate Guardian index split plan

## Review summary

`index.html` is currently about 1.1 MB and 17,100 lines. It contains the app
shell, three CSS blocks, static overlays/modals, and nearly all application
JavaScript in one inline script. The browser must parse that script at startup,
including form types the current user may never open.

The largest practical saving will come from splitting JavaScript by feature and
loading it with dynamic `import()`. Moving markup into separate files helps only
when the app also removes the previous view's DOM, event listeners, observers,
timers, and object URLs.

## Required decision before implementation

The current package supports double-clicking `index.html` from `file://`.
JavaScript modules and `fetch()`-loaded HTML fragments are restricted on
`file://` in common browsers. Choose one of these release models:

1. **Recommended: hosted/local-server app.** Serve the modular files over HTTPS
   or `http://localhost`. This gives real lazy loading with the least complexity.
2. **Dual distribution.** Develop as modules, then use a build tool to publish:
   a chunked hosted/PWA build and a bundled single-file portable build. The
   portable build will still load most code at startup.

Do not begin fragment extraction until this decision is recorded. The current
`HOW-TO-RUN.txt` makes `file://` the primary workflow, so silently dropping it
would be a compatibility break.

## Target structure

```text
probate-guardian/
  index.html                    # shell and mounting containers only
  assets/
    app.css
    print.css
  src/
    main.js                     # startup sequence only
    router.js                   # route table and feature loader
    core/
      state.js
      config.js
      events.js
      forms.js
      validation.js
    persistence/
      sav.js
      recovery-cache.js
      launch-preferences.js
      legacy-migration.js
      tauri-backup.js
    security/
      crypto.js
      unlock.js
      audit-log.js
    ui/
      shell.js
      icons.js
      modals.js
      help.js
      walkthrough.js
    features/
      dashboard/index.js
      simplified-accounting/index.js
      annual-accounting/index.js
      guardian-inventory/index.js
      plans/
        simplified.js
        annual.js
        initial.js
        minors.js
    export/
      pdf.js
      excel.js
      templates.js
  fragments/
    startup.html
    security.html
    common-modals.html
  lib/
  templates/
  manifest.json
  sw.js
```

Keep static, trusted overlays in `fragments/`. Keep data-driven forms in their
feature modules; turning large JavaScript template strings into HTML files would
move code without fixing ownership or cleanup.

## Module contract

Each lazy feature should own its routes and return a cleanup function.

```js
// src/features/guardian-inventory/index.js
export async function mount({ container, route, state, services }) {
  container.replaceChildren(renderRoute(route, state));
  const controller = new AbortController();
  bindInventoryEvents(container, state, controller.signal);

  return function dispose() {
    controller.abort();
    releasePreviewObjectUrls();
    container.replaceChildren();
  };
}
```

The router loads only the required feature and disposes the previous one.

```js
const loaders = {
  dashboard: () => import('./features/dashboard/index.js'),
  guardian: () => import('./features/guardian-inventory/index.js'),
  simplified: () => import('./features/simplified-accounting/index.js'),
  annual: () => import('./features/annual-accounting/index.js'),
  plans: () => import('./features/plans/index.js')
};

let disposeCurrent = () => {};

export async function showFeature(name, context) {
  disposeCurrent();
  const feature = await loaders[name]();
  disposeCurrent = await feature.mount(context);
}
```

For trusted static fragments, use a same-origin loader and replace the prior
DOM rather than appending indefinitely.

```js
const fragmentCache = new Map();

export async function loadFragment(name) {
  if (!fragmentCache.has(name)) {
    const url = new URL(`../fragments/${name}.html`, import.meta.url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load ${name}: ${response.status}`);
    fragmentCache.set(name, await response.text());
  }
  return fragmentCache.get(name);
}
```

Never use this loader for user-controlled HTML. Continue escaping case values
before interpolation.

## Migration sequence

### 1. Establish a safety baseline

- Add tests for startup, unlock, recovery, open/save, every route, PDF, Excel,
  and legacy migration.
- Record startup transfer size, script parse/evaluate time, heap size, DOM-node
  count, and route-switch heap behavior.
- Preserve the current `.sav` format and startup order.

### 2. Extract code that has no feature-specific UI

- Move icons, configuration, common helpers, state, crypto, audit logging,
  persistence, and file operations first.
- Replace global variables gradually with one explicit application context.
- Keep temporary compatibility exports on `window` only for existing inline
  `onclick` handlers; remove those handlers in a later pass.

### 3. Extract the shell and static fragments

- Leave `#main-content`, sidebar, toast hosts, and overlay hosts in `index.html`.
- Move startup, security, and common-modal markup into trusted fragments.
- Load critical startup/security fragments immediately; lazy-load ordinary
  modals on first use.

### 4. Extract one feature as a pilot

- Start with Simplified Accounting because it is smaller than the full annual
  and guardian feature sets.
- Move its page renderers, validation, print, Excel mapping, and route table as
  one unit.
- Add `mount()`/`dispose()` and verify repeated entry/exit does not grow heap or
  duplicate event handlers.

### 5. Extract the remaining feature packs

- Plans: simplified, annual, initial, and minors.
- Annual Accounting, including final/trust variants where they share code.
- Guardian Inventory, including schedules, validation, print, and Excel logic.
- Dashboard and ward-management views.

Keep shared calculations in `core/`; do not let one feature import another
feature's internal functions.

### 6. Lazy-load large libraries

- Load `html2pdf.bundle.min.js` only when PDF help/export is requested.
- Load `exceljs.min.js` only for Excel import/export.
- Load form template data only for the selected export type.
- JSZip is needed early for `.sav` open/save, but it can load after the startup
  choice is visible instead of blocking first paint.
- Keep Bootstrap available for modal/collapse behavior until those dependencies
  are explicitly removed.

Because the existing libraries are classic scripts rather than ES modules, add
a Promise-based script loader or introduce a bundler; do not mix ad-hoc script
injection throughout feature files.

### 7. Update PWA caching and deployment

The current `sw.js` activates immediately but does not cache app files. Add a
versioned app-shell cache and runtime caching for modules/fragments. Do not
preload every feature during service-worker installation, because that defeats
network-level lazy loading. Test an upgrade with an already-open tab and an old
cache before release.

### 8. Measure and finish

- Compare the new baseline with step 1.
- Confirm initial startup does not download or evaluate inactive feature packs.
- Navigate through every feature repeatedly; detached DOM and heap should return
  close to baseline after garbage collection.
- Test offline PWA startup and lazy navigation to a feature not previously used.
- Test Chrome, Edge, Firefox, and Safari separately because writable-file-handle
  behavior differs.

## Acceptance criteria

- `index.html` contains no feature implementation and is small enough to review.
- Startup loads only shell, security, persistence, and the selected first view.
- Excel and PDF libraries are absent from the initial request/evaluation path.
- Leaving a feature calls its cleanup function and removes its DOM/listeners.
- Existing `.sav` files remain readable and new files remain compatible.
- Recovery-cache, remembered-handle, lock, and legacy-migration behavior is
  unchanged or intentionally revised with tests and documentation.
- The chosen `file://` or hosted release policy is documented accurately.

## Issues found during review

- Some visible UI text still says that nothing is stored in the browser. That is
  incorrect because dirty recovery snapshots and launch preferences use
  IndexedDB. The comment cleanup does not alter user-facing copy.
- `lockApp()` depends on an open `.sav` handle to rebuild memory after locking;
  the session-recovery cache is not used by that flow. Locking before the first
  durable save therefore needs a product decision and a regression test.
- `saveData()` starts `saveSessionRestoreCache()` without awaiting it. A close,
  reload, or lock can race that asynchronous snapshot.
- The service worker currently provides no offline asset cache despite the PWA
  manifest.
- `HOW-TO-RUN.txt` contains storage, template, and recovery descriptions that no
  longer match the current implementation and should be reviewed separately.
