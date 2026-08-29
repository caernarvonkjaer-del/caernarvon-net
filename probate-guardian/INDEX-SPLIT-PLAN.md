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

**What this plan actually achieves, and what it does not:** dynamic `import()`
reduces initial download, parse, and evaluation cost. It does **not** unload a
module from memory once it has been imported — the module stays in the page's
module registry until the tab/document is closed. `dispose()` only releases the
DOM, listeners, timers, and object URLs owned by that feature; the module code
itself remains resident. The goal of this plan is therefore reducing initial
memory/CPU and reclaiming per-view resources, not guaranteeing that all
previously visited JavaScript is unloaded. If strict reclamation of module code
itself is ever required, the only real options are a full page navigation
between separate applications, or running suitable Excel/ZIP work in a
short-lived Web Worker that is terminated after use.

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
        index.js
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

Each lazy feature should own its routes and return a cleanup function. Renderers
must return a `Node` or `DocumentFragment`, never an HTML string — passing a
string to `replaceChildren()` inserts it as literal text rather than parsing
it. Centralize any trusted-markup assignment (e.g. a `renderTrustedHtml(el,
html)` helper around `innerHTML`) instead of doing it ad hoc per feature.

```js
// src/features/guardian-inventory/index.js
export async function mount({ container, route, state, services, signal }) {
  const view = renderRoute(route, state); // must return a Node/DocumentFragment
  if (signal.aborted) return () => {};
  container.replaceChildren(view);
  const controller = new AbortController();
  bindInventoryEvents(container, state, controller.signal);

  return async function dispose() {
    controller.abort();
    releasePreviewObjectUrls();
    container.replaceChildren();
  };
}
```

The router must guard against slow/failed imports and out-of-order navigation
with a sequence token, and must show explicit loading/error states instead of a
blank screen.

```js
const loaders = {
  dashboard: () => import('./features/dashboard/index.js'),
  guardian: () => import('./features/guardian-inventory/index.js'),
  simplified: () => import('./features/simplified-accounting/index.js'),
  annual: () => import('./features/annual-accounting/index.js'),
  plans: () => import('./features/plans/index.js')
};

let disposeCurrent = async () => {};
let navSeq = 0;

export async function showFeature(name, context) {
  const loader = loaders[name];
  if (!loader) throw new Error(`Unknown route: ${name}`);

  const mySeq = ++navSeq;
  const controller = new AbortController();
  renderLoadingView(context.container);

  let feature;
  try {
    feature = await loader();
  } catch (err) {
    if (mySeq !== navSeq) return; // superseded by a newer navigation
    renderErrorView(context.container, err);
    return;
  }
  if (mySeq !== navSeq) return; // a later navigation started while we awaited

  await disposeCurrent();
  if (mySeq !== navSeq) return; // navigation changed again during dispose

  disposeCurrent = await feature.mount({ ...context, signal: controller.signal });
}
```

For trusted static fragments (ordinary modals and help content only — see
"Extract the shell and static fragments" below for why startup/security stay
inline), use a same-origin loader and replace the prior DOM rather than
appending indefinitely. The browser's HTTP cache and the service-worker cache
already avoid repeat network transfers, so this application-level cache only
needs to exist to avoid re-parsing HTML text within a single session, and
should be bounded so it cannot grow with every fragment ever opened.

```js
const MAX_CACHED_FRAGMENTS = 8;
const fragmentCache = new Map(); // bounded LRU, not one entry per feature ever opened

export async function loadFragment(name) {
  if (fragmentCache.has(name)) {
    const html = fragmentCache.get(name);
    fragmentCache.delete(name);
    fragmentCache.set(name, html); // refresh recency
    return html;
  }
  const url = new URL(`../fragments/${name}.html`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${name}: ${response.status}`);
  const html = await response.text();
  fragmentCache.set(name, html);
  if (fragmentCache.size > MAX_CACHED_FRAGMENTS) {
    fragmentCache.delete(fragmentCache.keys().next().value);
  }
  return html;
}
```

Never use this loader for user-controlled HTML. Continue escaping case values
before interpolation. Note that abort-based cleanup (`{ signal }`) only removes
listeners registered with that option — it does not remove existing inline
`onclick` attributes, jQuery `.on()` bindings, Bootstrap component listeners, or
document-level listeners added without a signal. Those must be tracked and torn
down explicitly during migration.

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
- Keep startup, unlock, recovery, and fatal-error shells inline in `index.html`.
  These views are required on every session, so moving them to fragments adds a
  fetch-failure mode and latency with no meaningful memory saving. Fragment
  extraction is reserved for markup that is not always needed: ordinary modals
  and noncritical help content.
- Lazy-load ordinary modals and help content on first use via `loadFragment()`.

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
- Load `print.js`, `pdf.js`, `excel.js`, and importer modules dynamically from
  inside the feature that needs them (e.g. on an "Export" click), not whenever
  the feature's form opens.
- JSZip must load before the first ZIP-dependent operation, not simply "after
  the startup choice is visible" — that point is too late. ZIP-dependent
  operations include: legacy `.sav` migration export, silent reopen of a
  remembered file handle, manual open, and save/export. Each of these code
  paths must independently ensure JSZip is loaded (a shared `getJSZip()`
  loader that caches the in-flight/resolved import is sufficient).
- Keep Bootstrap available for modal/collapse behavior until those dependencies
  are explicitly removed.

Because the existing libraries are classic scripts rather than ES modules, add
a Promise-based script loader or introduce a bundler; do not mix ad-hoc script
injection throughout feature files. Decide the build tool now rather than
leaving this open — a dual hosted/portable distribution needs explicit build
outputs (e.g. `dist/web/` for chunked/PWA and `dist/portable/` for a single
bundled file), plus `package.json` and build configuration checked in before
feature extraction begins.

Do not extract every shared subsystem before proving the approach on one
feature. Introduce the build system first while the app is still the existing
monolith, verify the build/dev workflow works end to end, then extract exactly
one vertical feature (Simplified Accounting, per step 4) before touching the
rest. Extracting all shared subsystems and every feature at once risks a broad,
hard-to-test rewrite with no working checkpoint.

Avoid passing one fully mutable state object into every feature module;
features should call service methods such as `updateWard()`, `markDirty()`, and
`saveCase()` so mutations cannot bypass recovery, audit logging, and
persistence hooks.

### 7. Update PWA caching and deployment

The current `sw.js` activates immediately but does not cache app files. Add a
versioned app-shell cache, and precache all feature JS chunks and fragments
(not just the shell) so offline navigation works for a feature never opened in
this session — runtime caching cannot serve a resource that was never fetched,
and the acceptance criteria below require offline navigation to an unused
feature. Precaching downloads the chunks but does not execute them, so startup
JavaScript evaluation remains lazy; this is a deliberate tradeoff favoring
offline reliability for legal-case data over saving a few KB of background
download.

Add an explicit service-worker update policy: the current immediate
`skipWaiting()` can let an already-open tab keep running old code while
`sw.js` serves new chunks to new requests, mixing versions. Either defer
`skipWaiting()` until all clients close, or prompt the user to reload when an
update is ready, and version the cache name so old and new chunk sets never
collide. Test an upgrade with an already-open tab and an old cache before
release.

### 8. Measure and finish

- Compare the new baseline with step 1.
- Confirm initial startup does not download or evaluate inactive feature packs.
- Navigate through every feature repeatedly; detached DOM and heap should return
  close to baseline after garbage collection.
- Test offline PWA startup and lazy navigation to a feature not previously used.
- Test Chrome, Edge, Firefox, and Safari separately because writable-file-handle
  behavior differs.

## Acceptance criteria

- `index.html` contains no feature implementation. Budget: shell markup stays
  under an agreed line/byte limit (to be set once the current shell is
  measured), rather than the vague "small enough to review."
- Startup loads only shell, security, persistence, and the selected first view.
  Budget: initial JavaScript bytes, initial request count, and DOM-node count
  are measured against the step-1 baseline and must not regress.
- Excel and PDF libraries are absent from the initial request/evaluation path.
- Leaving a feature calls its cleanup function and removes its DOM/listeners;
  heap growth after N repeated route changes (e.g. 20 cycles) stays within an
  agreed bound relative to baseline.
- Existing `.sav` files created by the current release open correctly in the
  split version. New `.sav` files either (a) remain fully openable by the
  current released version, or (b) carry an intentional, documented
  format-version bump with a clear compatibility statement — this must be
  decided explicitly, not left implicit.
- Recovery-cache, remembered-handle, lock, and legacy-migration behavior is
  unchanged or intentionally revised with tests and documentation.
- The chosen `file://` or hosted release policy is documented accurately.
- CSP is defined for the modular build, inline event handlers (`onclick=`) are
  removed in favor of listener registration, fragment names are validated
  against an allowlist before fetching, and script/module responses are
  confirmed to be served with correct JavaScript MIME types.
- A chunk load failure shows a visible error state with a retry action instead
  of a blank screen (see router error handling above).

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
