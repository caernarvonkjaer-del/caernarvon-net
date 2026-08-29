# Probate Guardian index split plan

## Review summary

`index.html` is currently 17,180 lines / 1.13 MB. The head has two CSS blocks
(777 + 31 lines) and roughly 230 lines of static modal markup, followed by one
single `<script>` block spanning lines 1,311–17,177 (15,866 lines) that holds
essentially the entire application: 589 function declarations, 291 inline
`onclick=` handlers, and 150 inline `oninput=` handlers. There is no
`package.json`, no bundler, and no CSP meta tag anywhere — the build tooling
and CSP work in this plan are greenfield additions, not a tightening of
something that already exists.

The script's own section-banner comments show its de facto structure: icon
set, theme, global state/config, help/tooltip/walkthrough systems, the
storage-strategy trio (`.sav` + session-restore cache + launch-preferences
db), county/circuit tables, validation summary, print-pager, security/crypto/
audit, in-memory state ops, export/import, ward management, modal functions,
legacy-storage migration, router, convert-ward, multi-year accounting,
Excel-capacity checks, the form-binding engine, then per-feature page
renderers and print/export for all nine filing types, closing with PDF/Excel
export/import and init. This matches the feature inventory used throughout
this plan.

There are 17 modals total. `startup-choice-overlay`, `security-choice-overlay`,
and `unlock-overlay` are the three always-needed ones this plan keeps inline
(see "Extract the shell and static fragments" below); the other 14
(add/convert/delete/rename ward, prior-years, new-year, eligibility,
load-ward-info, walkthrough, fallback-save, dropzone) are the real
fragment-extraction candidates.

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

## Required decision before implementation — RESOLVED: dual distribution

The current package supports double-clicking `index.html` from `file://` —
that is `HOW-TO-RUN.txt`'s primary, "easiest" documented workflow today, so
this choice is not a formality; it decides whether step 6 needs a bundler at
all. JavaScript modules and `fetch()`-loaded HTML fragments are restricted on
`file://` in common browsers, so this plan chose between:

1. Hosted/local-server app. Serve the modular files over HTTPS or
   `http://localhost`. Simplest, but drops the `file://` double-click workflow.
2. **Dual distribution (chosen).** Develop as modules, then use a build tool to
   publish a chunked hosted/PWA build (`dist/web/`) and a bundled single-file
   portable build (`dist/portable/`) that preserves the `file://` double-click
   workflow. The portable build will still load most code at startup — see the
   portable-build acceptance criteria later in this plan for the accepted
   tradeoff.

This decision unblocks fragment extraction and fixes step 2's bundler
requirement as necessary rather than optional. Update `HOW-TO-RUN.txt` to
document both the hosted/PWA and portable release paths once step 2's build
outputs exist.

A second decision must also be recorded before step 2 (Introduce the build
system) starts: whether the legacy entry point (`src/legacy-app.js`) stays a
classic non-module script until inline `onclick` handlers are removed, or is
loaded as a module alongside a generated `src/legacy-globals.js` window-
assignment shim. See step 2 for the tradeoffs; this is an implementation gate,
not a detail to leave implicit at that point.

## Target structure

```text
probate-guardian/
  .gitignore                   # excludes dist/, node_modules/, etc.
  package.json
  vite.config.js                # or the chosen bundler's config; produces dist/web and dist/portable
  index.html                    # shell and mounting containers only
  assets/
    app.css
    print.css
  src/
    main.js                     # startup sequence only
    router.js                   # route table and feature loader
    fragment-loader.js          # loadFragment(); ../fragments/ resolves from here
    legacy-app.js                # step 2: the existing monolith, moved in unchanged behaviorally
    legacy-globals.js            # step 2: window-assignment shim, only if that transition option is chosen
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
      simplified-accounting/
        index.js
        excel.js                # import AND export mapping for this feature, dynamically imported (step 6)
        print.js                # builds both the printable view and the PDF-ready document for this feature
      annual-accounting/
        index.js
        excel.js
        print.js
      guardian-inventory/
        index.js
        excel.js
        print.js
      plans/
        index.js                # route table; dynamically imports only the selected variant below
        simplified.js
        annual.js
        initial.js
        minors.js
    export/
      pdf-runtime.js             # shared html2pdf loader + final shared conversion step only
      excel-runtime.js           # shared ExcelJS loader/wrapper, no feature-specific mapping
      zip-runtime.js             # shared getJSZip() loader (step 6)
  fragments/
    common-modals.html
    help.html
  lib/
  templates/
  tests/
    fixtures/
      sav/                       # archive-format fixtures: encrypted/unencrypted/older-format/corrupted
      legacy-storage/            # seed helpers for pre-migration IndexedDB/localStorage/sessionStorage state
    e2e/
  dist/                        # generated build output — not committed; add to .gitignore
    web/                         # chunked/PWA build output; this is what deployment consumes
    portable/                    # single bundled index.html build output
  manifest.json
  sw.js
```

`export/` holds only shared, feature-agnostic runtimes (library loading, the
final shared conversion step). Feature-specific field mapping and document
construction (e.g. how Guardian Inventory maps to Excel columns) lives with
that feature, matching step 6's requirement that these are dynamically
imported per feature rather than globally:

- `features/<name>/excel.js` contains both import mapping (reading an
  uploaded workbook into app state) and export mapping (writing app state into
  the workbook) for that feature — not two separate files.
- `features/<name>/print.js` builds both the on-screen printable document and
  the PDF-ready document for that feature.
- `export/pdf-runtime.js` performs only the final, shared
  document-to-PDF conversion (the `html2pdf` wrapper); it has no
  feature-specific mapping.

Startup, unlock, recovery, and fatal-error markup stay inline in `index.html`
(see step 3 below) and are intentionally absent from `fragments/`.

Keep static, trusted overlays in `fragments/`. Keep data-driven forms in their
feature modules; turning large JavaScript template strings into HTML files would
move code without fixing ownership or cleanup.

## Module contract

Each lazy feature should own its routes and return a cleanup function.
Renderers should return a `Node` or `DocumentFragment` for new code. Migrated
legacy renderers that still produce an HTML string may pass it through one
audited `renderTrustedHtml(container, html)` helper (built on `innerHTML`)
rather than rewriting every renderer during extraction — rewriting all
existing HTML-string renderers is not required to get code splitting and would
add unnecessary migration risk. Continue escaping every case-derived value
regardless of which path is used. Callers must branch on the return type
explicitly; passing a string straight to `replaceChildren()` inserts it as
literal text.

`mount()` receives a state selector and mutation services, not a mutable state
object, matching the read-only-state rule in step 6 below. `selectState()`
takes a selector function and returns only the smallest required slice (e.g.
`selectState(state => state.wardsById[wardId])`), not the whole case —
deep-cloning an entire large case on every mount would temporarily double its
memory footprint, working against this plan's own memory goal. That returned
slice is read-only by convention (or shallowly frozen in development builds to
catch accidental mutation); it is a snapshot, so a feature that needs to react
to later changes uses a `subscribe(listener, { signal })` service that emits
the affected slice, not the whole case, rather than re-reading a captured
snapshot.

Because the router mounts a candidate feature into a detached staging host
before it is visible (see the router section below), a feature must locate its
own elements via `container.querySelector(...)`, never `document.getElementById()`
or other document-global selectors — the still-active feature may have
elements with the same IDs, and a document-global lookup could resolve to the
wrong (active vs. staging) element.

`mount()` may return either a plain cleanup function, or `{ dispose, activate }`
if it needs global side effects (starting a global timer, writing an
audit-log entry, etc.) that must not happen until the feature is actually
committed and visible. `dispose` must only touch `container` and things scoped
to `signal`; `activate` runs once, immediately after the router commits this
feature, and is where any such global effects belong. A feature with no
post-commit global behavior can just return `dispose` directly.

Two rules keep `activate()` from becoming its own source of bugs:

- **Focus is not one of `activate()`'s responsibilities.** The router's
  `restoreFocusAfterNavigation()` owns default focus management after commit;
  `activate()` must not call `.focus()` itself, so the two can't race or
  double-move focus.
- Any listener, timer, or subscription that `activate()` creates must either
  be registered against the same `signal` the feature was mounted with (so it
  is torn down automatically if the feature is later replaced) or be
  explicitly torn down inside `dispose()`. `activate()` must not create
  anything that outlives both.
- `activate()` may fail (rejected promise or throw). The router treats this as
  non-fatal — the DOM commit is not rolled back — and still disposes the
  previous feature; see the router section below for the exact sequencing and
  the reasoning for not rolling back.

```js
// src/features/guardian-inventory/index.js
export async function mount({ container, route, selectState, services, signal }) {
  if (signal.aborted) return async () => {}; // don't do expensive rendering for a nav that's already stale
  const ward = selectState(state => state.wardsById[route.wardId]); // smallest slice, not the whole case
  const view = renderRoute(route, ward); // Node/DocumentFragment, or HTML string via renderTrustedHtml
  if (signal.aborted) return async () => {}; // re-check: renderRoute() may have taken a while
  if (typeof view === 'string') {
    renderTrustedHtml(container, view);
  } else {
    container.replaceChildren(view);
  }
  bindInventoryEvents(container, services, signal); // reuse the router's signal, not a new controller

  return async function dispose() {
    releasePreviewObjectUrls();
    container.replaceChildren();
  };
}
```

If `mount()` throws, it is responsible for cleaning up any partial DOM or
listeners it already created before throwing — it cannot return a disposer in
that case, so the router cannot do this cleanup on its behalf.

### Router: per-navigation hosts prevent a stale mount from destroying a newer view

A router that mounts every feature into the same shared container has a race:
if navigation B is superseded by C, but B's async `mount()` finishes after C
is already mounted, B's stale `dispose()` calling `container.replaceChildren()`
would wipe out C's DOM even though aborting B's controller correctly stopped
its listeners. Aborting a controller does not stop a disposer that is later
awaited and clears a container that now belongs to someone else.

Fix: give every navigation attempt its own host element, mount into a fully
**detached** staging host — not merely hidden but never appended to the live
document until commit — and only attach/swap it into the visible shell after
`mount()` actually succeeds *and* the attempt is still current. A stale
attempt's cleanup then only ever touches its own (never-shown, or
already-detached) host — never the container the newer feature is using.

Merely `hidden`-but-attached is not sufficient: while attached, a staging host
can contain the same element IDs as the still-active feature, and any code
using `document.getElementById()`, Bootstrap ID-based targeting, or other
document-level selectors could resolve to the wrong (active vs. staging)
element. This is why the module contract requires features to look up their
own elements via `container.querySelector(...)`, not global ID lookups — see
below.

```html
<main id="main-content"></main>
```

```js
function createHost() {
  const host = document.createElement('div');
  host.className = 'feature-host';
  return host; // intentionally NOT appended anywhere yet — stays fully
               // detached from the document until the router commits it
}
```

**Staging-compatibility requirement**, not just a layout caveat: while a
feature is staged (mounted into a detached host, before commit), its `mount()`
may only perform host-local work — rendering into `container`, and
event-listener registration scoped to `container` (or document-level listeners
that are immediately abortable via `signal`). It must not move focus, change
the URL/hash, start global timers, write audit-log entries, or mutate shared
state, because the currently active feature is still live and interactive and
must not be disturbed by a candidate that hasn't committed yet. If a feature
genuinely needs one of those (initial focus, a measurement that requires real
layout, a global timer that should start immediately), it exposes that work
through an optional `activate()` returned alongside `dispose()` (see the
module contract) that the router calls only after commit — or, if the feature
cannot be split into a staged phase at all (e.g. it fundamentally requires
document connection during its own render), use the serialized live-mount
fallback described below instead of the two-phase staging flow.

If a feature genuinely needs layout measurements that a detached host can't
provide and can't be deferred to `activate()`, serialize the commit/mount
phase behind a navigation queue instead (only one navigation's `mount()` runs
against the live container at a time) rather than mounting concurrently into a
shared container.

The router must guard against slow/failed imports and out-of-order navigation.
The **current feature stays mounted and interactive** while the replacement
loads and mounts into its own detached staging host — only a replacement that
both succeeds and is still the latest navigation gets attached and swapped in,
at which point the old feature's controller is aborted and its `dispose()`
runs against its own (now-detached) host. Aborting the current feature before
the replacement is ready would leave a dead, unresponsive view visible if the
import fails or is slow. A second, independent `pendingController` tracks the
in-flight staging candidate itself (separate from `activeController`, which
belongs to the committed feature) and is aborted whenever a newer navigation
supersedes it — so an abandoned candidate stops its own abortable work
promptly instead of continuing to consume CPU/memory until it happens to
resolve.

Because the previous feature is never disposed until a replacement actually
commits, a failed candidate (import failure, `mount()` throwing, or an invalid
disposer) leaves the previous feature fully mounted and usable — its error
view should reflect that, not imply the user has lost their place.

An unknown route is a permanently invalid navigation, not a transient failure:
it still consumes a navigation-sequence token (so it correctly supersedes an
older in-flight import), but its error view offers "Return to dashboard"
instead of "Retry," since retrying would just re-fail the same way.

The loading/error overlay is an accessibility surface, not just visual: mark it
with `role="status"`/`aria-live="polite"` (or `"assertive"` for the error
state) so screen-reader users are told navigation is in progress or failed,
move focus to the error heading when an error view appears, restore focus to a
sensible target (e.g. the newly mounted view's heading, or the nav item that
was activated) after a successful navigation, and present the loading state
non-blockingly since the previous feature intentionally remains interactive
underneath it.

```js
const loaders = {
  dashboard: () => import('./features/dashboard/index.js'),
  guardian: () => import('./features/guardian-inventory/index.js'),
  simplified: () => import('./features/simplified-accounting/index.js'),
  annual: () => import('./features/annual-accounting/index.js'),
  plans: () => import('./features/plans/index.js')
};

let activeHost = null;          // the host element currently attached inside #main-content
let disposeCurrent = async () => {};
let activeController = null;    // belongs to the committed feature; stays alive until a replacement commits
let pendingController = null;   // belongs to whichever candidate is currently staging; aborted when superseded
let navSeq = 0;

export async function showFeature(name, context) {
  const mySeq = ++navSeq; // bump before any validation, so even an unknown route supersedes a pending import
  pendingController?.abort(); // stop any older staging candidate immediately — even if this route turns out invalid
  pendingController = null;

  const loader = loaders[name];
  if (!loader) {
    renderErrorView(context.overlay, new Error(`Unknown route: ${name}`), {
      retry: null, // not retryable — always fails the same way
      goToDashboard: () => showFeature('dashboard', context),
    });
    return;
  }

  showLoadingOverlay(context.overlay); // separate from #main-content; old feature stays live underneath

  let feature;
  try {
    feature = await loader();
  } catch (err) {
    if (mySeq !== navSeq) return; // superseded
    renderErrorView(context.overlay, err, {
      retry: () => showFeature(name, context),
      goToDashboard: () => showFeature('dashboard', context),
    });
    return;
  }
  if (mySeq !== navSeq) return; // superseded while awaiting import

  const stagingHost = createHost(); // detached; not appended to the document yet
  const controller = (pendingController = new AbortController());

  let mounted;
  try {
    const result = await feature.mount({ ...context, container: stagingHost, signal: controller.signal });
    const dispose = typeof result === 'function' ? result : result?.dispose;
    if (typeof dispose !== 'function') {
      throw new Error(`${name}: mount() must return a cleanup function, or { dispose, activate }`);
    }
    const activate = typeof result === 'object' ? result.activate : undefined;
    if (activate !== undefined && typeof activate !== 'function') {
      // Validated here, before commit — an invalid activate() must never be
      // discovered only after the DOM has already been swapped.
      throw new Error(`${name}: activate must be a function if provided`);
    }
    mounted = { dispose, activate: activate || (async () => {}) };
  } catch (err) {
    controller.abort(); // mount() is contractually responsible for its own partial cleanup on throw
    if (pendingController === controller) pendingController = null;
    // stagingHost was never appended anywhere, so there is nothing to remove from the document
    if (mySeq !== navSeq) return;
    // The previous feature was never touched and remains fully mounted and
    // usable — the error view must reflect that, not imply lost state.
    renderErrorView(context.overlay, err, {
      retry: () => showFeature(name, context),
      goToDashboard: () => showFeature('dashboard', context),
    });
    return;
  }
  if (pendingController === controller) pendingController = null;

  if (mySeq !== navSeq) {
    // A newer navigation committed (or is staging) while this mount() was
    // awaiting. Dispose this candidate's own (still-detached) host only —
    // never touch activeHost, which belongs to the newer feature.
    controller.abort();
    try {
      await mounted.dispose();
    } catch (err) {
      reportNonFatalError('dispose failed on stale mount', err);
    }
    return;
  }

  // Commit point: still the latest navigation. Attach/replace atomically —
  // both hosts are never simultaneously visible — then run the new feature's
  // post-commit activation. The overlay stays visible until activation
  // finishes, since activation can still fail. Each disposer only ever
  // removes its own host, in `finally`, even if dispose() itself throws.
  const oldHost = activeHost;
  const oldDispose = disposeCurrent;
  activeController?.abort();
  activeController = controller;
  disposeCurrent = async () => {
    try {
      await mounted.dispose();
    } finally {
      stagingHost.remove();
    }
  };

  if (oldHost) {
    oldHost.replaceWith(stagingHost); // atomic: old host leaves the document the instant the new one enters
  } else {
    context.root.appendChild(stagingHost);
  }
  activeHost = stagingHost;

  // Activation-failure policy: the DOM commit above is not rolled back on an
  // activate() failure. Rolling back would mean flickering back to a feature
  // whose controller is already aborted and re-running a mount that may have
  // partial side effects — worse than accepting a committed-but-not-fully-
  // activated feature. A failed activation is therefore logged as non-fatal;
  // the router still hides the overlay and disposes the old feature below.
  try {
    await mounted.activate();
  } catch (err) {
    reportNonFatalError('activate failed after commit', err);
  }

  if (mySeq === navSeq) {
    // Only do post-activation UI work (hiding the overlay, moving focus) if
    // nothing newer has started since — a slow activate() must not steal
    // focus or dismiss the overlay for a navigation that already moved on.
    // restoreFocusAfterNavigation() owns focus management here; activate()
    // must not move focus itself (see the module contract note above).
    hideLoadingOverlay(context.overlay);
    restoreFocusAfterNavigation(stagingHost);
  }

  if (oldHost) {
    try {
      await oldDispose();
    } catch (err) {
      reportNonFatalError('dispose failed during navigation', err);
    }
  }
}
```

Router tests (step 1's baseline suite) should use controllable deferred
promises for `loader()`/`mount()`/`dispose()` to exercise the races this design
is meant to prevent:

- Navigation B mounts slowly; C is requested and completes first — C is
  visible and B's eventual resolution does not affect it.
- B later resolves successfully after being superseded; it is disposed without
  touching C's host or DOM.
- B throws after C has already committed.
- The old feature's `dispose()` throws during a commit — the new host is still
  committed and visible regardless.
- After rapid repeated navigation, exactly one `.feature-host` is connected to
  the document at any time.
- No duplicate element IDs exist in the live document while a candidate is
  staging (i.e. staging hosts are genuinely never attached before commit).
- A pending candidate's `signal` is aborted as soon as it is superseded by a
  newer navigation — including immediately for an unknown/invalid route, not
  only after a valid candidate resolves.
- `activate()` rejects after commit — the old feature is still disposed, the
  error is reported non-fatally, and the router does not hang.
- `mount()` resolves with a truthy non-function `activate` (e.g. a string or
  object without a `dispose`/`activate` shape) — the router rejects it before
  committing, and the previous feature remains untouched.
- `activate()` resolves slowly and a second navigation starts before it
  finishes — the slow `activate()`'s completion must not hide the newer
  navigation's overlay or move focus away from it.
- Focus ends up on the correct (latest) feature after a superseded navigation,
  never on a stale one that finished activating late.

For trusted static fragments (ordinary modals and help content only — see
"Extract the shell and static fragments" below for why startup/security stay
inline), use a same-origin loader restricted to an allowlisted set of names and
replace the prior DOM rather than appending indefinitely. Caching the raw HTML
string does not avoid reparsing — assigning a string to `innerHTML` (or
inserting it via `replaceChildren` after parsing) parses it every time it is
used. To actually skip reparsing, cache a `<template>` element and clone its
`content` on each use; otherwise, drop the cache and rely on the HTTP and
service-worker caches to avoid repeat network transfers.

This loader lives at `src/fragment-loader.js` (added to the target structure
below), so `../fragments/` resolves to `probate-guardian/fragments/` as
intended. If it is instead implemented inside a nested module such as
`src/ui/modals.js`, adjust the relative path accordingly (`../../fragments/`)
— the path must be verified against the actual file location, not assumed.
Because only two names are allowlisted, a full LRU is overkill; a two-entry
map (or no cache at all, relying on HTTP/service-worker caching) is simpler.

```js
const ALLOWED_FRAGMENTS = new Set(['common-modals', 'help']);
const templateCache = new Map(); // one entry per allowlisted fragment; no eviction needed at this size

export async function loadFragment(name) {
  if (!ALLOWED_FRAGMENTS.has(name)) throw new Error(`Unknown fragment: ${name}`);

  if (templateCache.has(name)) {
    return templateCache.get(name).content.cloneNode(true);
  }

  const url = new URL(`../fragments/${name}.html`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${name}: ${response.status}`);
  const template = document.createElement('template');
  template.innerHTML = await response.text(); // parsed once, here
  templateCache.set(name, template);
  return template.content.cloneNode(true);
}
```

Never use this loader for user-controlled HTML. Continue escaping case values
before interpolation. Note that abort-based cleanup (`{ signal }`) only removes
listeners registered with that option — it does not remove existing inline
`onclick` attributes, jQuery `.on()` bindings, Bootstrap component listeners, or
document-level listeners added without a signal. Those must be tracked and torn
down explicitly during migration.

## Migration sequence

The order below deliberately proves the build and one vertical feature before
touching shared subsystems, rather than extracting every shared subsystem
first. Do not extract state, security, persistence, or file-operation modules
wholesale up front — only pull out what the pilot feature (step 4) actually
needs, and treat the rest as legacy code accessed through adapters until a
second feature proves what is genuinely shared.

### 1. Establish a safety baseline

- Add tests for startup, unlock, recovery, open/save, every route, PDF, Excel,
  and legacy migration. This baseline suite must cover the now-fixed lock,
  recovery-cache, and storage-copy behavior (the correctness fixes formerly
  tracked in a separate "Phase 0" section are in scope for these tests, even
  though that section has been removed as resolved).
- Record startup transfer size, script parse/evaluate time, heap size, DOM-node
  count, and route-switch heap behavior.
- Preserve the current `.sav` format and startup order.
- "`.sav` compatibility" and "legacy migration" need distinct fixtures, not one
  shared set, since they exercise different code paths:
  - `tests/fixtures/sav/` — archive-format compatibility fixtures: encrypted,
    unencrypted, older-format (pre-migration `.sav`), and corrupted/truncated
    files. Wrong-password is not a separate file; it's a test input run
    against an encrypted fixture.
  - `tests/fixtures/legacy-storage/` — seed helpers that populate IndexedDB,
    `localStorage`, and `sessionStorage` the way pre-`.sav` releases did, used
    to test `runLegacyBrowserStorageMigrationIfNeeded()`-style migration, which
    is a different code path than opening an old `.sav` archive.
- Checkpoint: before any extraction begins (end of this step), record concrete
  numeric targets — not just "measure and compare later" — for initial
  evaluated JavaScript bytes, initial request count, and the warmed-heap bound
  used in step 8's leak tests. Extraction does not start until these numbers
  are written down.
- Delete known-dead code before it can be migrated as if it were live:
  `index.html:14140` declares `renderPageGuardian(page)` with 18 placeholder
  stub pages (`pageGuardianHome()`, etc. — each just `<p>Placeholder</p>`), but
  a second, real `function renderPageGuardian` is declared later at
  `index.html:15005`. Function-declaration hoisting means the second
  definition silently wins at runtime, so the entire first ~50-line block is
  unreachable today. Confirm this with a coverage run, delete the dead block,
  and add a regression test/lint rule against duplicate top-level function
  declarations so a stub doesn't accidentally get carried into a feature
  module as though it were the real renderer.

### 2. Introduce the build system without restructuring behavior

- Decide the build tool now (bundler/dev server), and check in `package.json`
  and build configuration before any code is moved. A dual hosted/portable
  distribution needs explicit build outputs, e.g. `dist/web/` for chunked/PWA
  and `dist/portable/` for a single bundled file.
- Move the existing monolithic script into a build-managed legacy entry point,
  and confirm the build produces a behaviorally equivalent app, verified
  against the step-1 baseline test suite, before any extraction begins.
  (Bundling necessarily changes emitted bytes, so "byte-for-byte" is not the
  right bar — passing the baseline tests is.) "Unchanged" needs one explicit
  caveat: many existing inline `onclick="..."` handlers depend on their target
  functions being real globals on `window`. An ES module's top-level
  declarations are not automatically global, so simply wrapping the monolith
  as a module would silently break every inline handler. Pick one transition
  explicitly, don't leave it implied by "unchanged":
  - Keep this legacy entry point as a classic (non-module) script, loaded
    by the build as a plain external `<script>`, until inline handlers are
    removed in a later pass; or
  - Generate an explicit compatibility object at the top of the legacy entry
    that assigns every existing `onclick` target function to `window`
    (`window.saveBackupNow = saveBackupNow;` etc.), then load it as a module.
  Either is acceptable, but the plan must say which, since "build-managed
  legacy entry" alone does not guarantee the UI keeps working.
- Establish thin adapter modules around existing globals (state, crypto,
  persistence, audit log) so future extracted code can import them instead of
  reaching into `window`. The adapters wrap the legacy code in place; they do
  not yet move it.
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
- Move only the dependencies this feature actually needs — its page renderers,
  validation, route table, and Excel mapping. `print.js` and `excel.js` belong
  to this feature's boundary conceptually, but stay as separate, dynamically
  imported modules (per step 6), not files moved in bulk "as one unit."
- Add `mount()`/`dispose()` and verify repeated entry/exit does not grow heap or
  duplicate event handlers.
- Only after this pilot works end to end, extract a second feature (e.g. one
  Plans variant) and move into `core/` only the modules both features actually
  share. This is what determines what step 2's adapters get promoted to real
  shared modules — do not guess shared boundaries before two features exist.

### 5. Extract the remaining feature packs

- Plans: simplified, annual, initial, and minors. `plans/index.js` is a route
  table only — it dynamically imports whichever single variant (`simplified.js`,
  `annual.js`, `initial.js`, `minors.js`) matches the current route, rather
  than statically importing all four, so it doesn't become another eager
  mini-monolith. Apply the same per-variant dynamic import within Annual
  Accounting if its final/trust variants are substantially independent
  implementations rather than shared code with small branches.
- Annual Accounting, including final/trust variants where they share code.
- Guardian Inventory, including schedules, validation, print, and Excel logic.
- Dashboard and ward-management views.

Keep shared calculations in `core/`; do not let one feature import another
feature's internal functions.

### 6. Lazy-load large libraries

- Load `html2pdf.bundle.min.js` only when PDF help/export is requested.
- Load `exceljs.min.js` only for Excel import/export.
- Load form template data only for the selected export type.
- Load each feature's own `excel.js` (import + export mapping) and `print.js`
  (printable view + PDF-ready document) dynamically from inside that feature
  (e.g. on an "Export" click), not whenever the feature's form opens. The
  shared `export/pdf-runtime.js` and `export/excel-runtime.js` runtimes are
  themselves only imported when a feature's `excel.js`/`print.js` actually
  needs them, so no library loads until an export is requested.
- JSZip must load before the first ZIP-dependent operation, not simply "after
  the startup choice is visible" — that point is too late. ZIP-dependent
  operations include: legacy `.sav` migration export, silent reopen of a
  remembered file handle, manual open, and save/export. Each of these code
  paths must independently ensure JSZip is loaded (a shared `getJSZip()`
  loader that caches the in-flight/resolved import is sufficient).
- Keep Bootstrap available for modal/collapse behavior until those dependencies
  are explicitly removed.

Because the existing libraries are classic scripts rather than ES modules, use
the bundler/loader chosen in step 2; do not mix ad-hoc script injection
throughout feature files.

Each `mount()` should receive read-only state (a selector function or a
snapshot) plus mutation services, not the fully mutable state object — the
module contract example above and this step must agree: features call
`updateWard()`, `markDirty()`, `saveCase()`, etc., so mutations cannot bypass
recovery, audit logging, and persistence hooks.

### 7. Update PWA caching and deployment

The current `sw.js` activates immediately but does not cache app files. Split
installation into two tiers instead of one large `cache.addAll()`: a
traditional atomic install-time `cache.addAll()` is all-or-nothing and would
fail the entire service-worker installation if a single optional asset
failed to fetch.

- **Critical-shell precache (atomic, blocks install):** the app shell,
  `main.js`, `router.js`, and other assets required for first paint and
  startup. Small enough that `cache.addAll()` failing on any of these should
  legitimately fail installation.
- **Offline pack (nonblocking, best-effort):** feature JS chunks, fragments,
  lazy libraries (`exceljs.min.js`, `html2pdf.bundle.min.js`, JSZip), CSS,
  icons, and export templates. Fetched individually after install/activation,
  with retry for interrupted downloads. Otherwise offline PDF/Excel/`.sav`
  operations will fail even though the feature chunk itself was "cached" in
  name.
- A service worker can be terminated by the browser at any point once it has
  no event whose lifetime is being extended by `waitUntil()` — a bare
  `setTimeout`/async chain started from `install`/`activate` is not guaranteed
  to finish. Trigger and extend the offline-pack download from a page-sent
  message instead, so its promise is properly tracked:

  ```js
  let offlinePackPromise = null; // dedupe: one in-flight download per build version, not one per message
  self.addEventListener('message', event => {
    if (event.data?.type === 'DOWNLOAD_OFFLINE_PACK') {
      // downloadOfflinePack() checks the versioned ready marker first, so a
      // repeated successful request after completion is cheap (no re-fetch).
      const attempt = (offlinePackPromise ??= downloadOfflinePack());
      event.waitUntil(
        attempt.finally(() => {
          // Clear on settle — success or failure — so a later message can
          // retry a failed attempt instead of forever reusing its rejection.
          if (offlinePackPromise === attempt) offlinePackPromise = null;
        })
      );
    }
  });
  ```

  Multiple tabs (or repeated calls from one tab) can each post this message;
  caching the promise means a second message while a download is already
  in-flight awaits the same attempt instead of starting a redundant one, while
  clearing it on settle means a failed download doesn't permanently poison
  every future retry attempt.
  The page posts this message once it decides offline availability matters
  (e.g. after the startup screen, or from a user-facing "Make available
  offline" action).
- The "offline ready" marker must include the build/cache version it was
  computed for (e.g. `{ ready: true, cacheVersion: 'v7' }`) and be reset
  whenever the version changes — a marker from a previous version must not be
  read as "this version's offline pack is ready." Completion must be
  version-atomic from the UI's perspective: download the offline pack into a
  version-specific cache name (e.g. `pg-offline-v7`), and only flip the marker
  to ready for that exact version after every required asset in its manifest
  has succeeded. A partial download must never be reported as ready, and a
  ready marker for an old version must never be presented as covering the
  current version.
- The service worker caches only revisioned static assets. It must never
  cache `.sav` files, case data, blob URLs, or other user-generated exports —
  those are handled entirely by the app's own persistence layer, not the
  cache.
- Precache lists (critical-shell and offline-pack) must be build-generated,
  not hand-maintained — a bundler emits hashed chunk filenames, and a
  hand-written list will eventually go stale (omitting a new chunk or
  retaining a deleted one). Use the chosen bundler's PWA plugin, Workbox, or
  an equivalent build step to emit a single revisioned manifest, and derive
  both the critical-shell list and the offline-pack list as two subsets of
  that one manifest — never two independently generated lists that could
  disagree about a hash or version.
- Do not delete an old cache purely because a new one exists — a client from
  the previous version may still be running and depending on it. Delete old
  caches only after those clients have closed or been forced to reload (see
  the update policy below), not simply "the new version activated."

Runtime caching alone cannot serve a resource that was never fetched. "Offline
navigation to a feature never opened in this session" (used in the acceptance
criteria and step 8) has an explicit precondition: the service worker must
already be installed and this exact build version's offline pack must have
previously reached the ready state before going offline. A genuinely first
visit that goes offline before the pack finishes cannot be expected to serve
an unopened feature — that is the tradeoff of best-effort background
precaching, not a bug.

This does not conflict with the "page must not import/evaluate inactive
feature chunks" requirement: those are two different budgets.

> The page's initial execution path must not import or evaluate inactive
> feature chunks. Service-worker background precaching is a separate,
> excluded-from-page-load transfer that happens after install, measured on its
> own budget — not counted against initial page-load transfer size.

Measure and record the full precache payload size (it is unlikely to be "a few
KB" once libraries, templates, and every feature chunk are included) and define
install-failure behavior — e.g. the app must still work online if background
precaching fails or is interrupted, and should not block first paint on it.

Add an explicit service-worker update policy: the current immediate
`skipWaiting()` can let an already-open tab keep running old code while
`sw.js` serves new chunks to new requests, mixing versions. Either defer
`skipWaiting()` until all clients close, or prompt the user to reload when an
update is ready, and version the cache name so old and new chunk sets never
collide. Test an upgrade with an already-open tab and an old cache before
release.

### 8. Measure and finish

- Compare the new baseline with step 1.
- Confirm the page's initial execution path does not import or evaluate
  inactive feature packs (service-worker background precache is measured
  separately and is expected to download them).
- Leak-test each feature with a warmed baseline, not the cold startup baseline
  — an imported module's code stays resident even after `dispose()`, so heap
  cannot be expected to return to pre-import size. For each feature: (1) import
  and mount it once, (2) dispose it and force/allow garbage collection, (3)
  record this as the warmed baseline, (4) repeat mount/dispose 20 times, (5)
  compare against the warmed baseline, not the cold one. This isolates
  genuinely leaked views/listeners from the module code that is expected to
  stay resident.
- Test offline PWA startup and lazy navigation to a feature not previously used.
- Test that a first `DOWNLOAD_OFFLINE_PACK` attempt which fails partway
  (simulate a fetch rejection for one asset) leaves the version's "offline
  ready" marker unset and does not poison future attempts; a later
  `DOWNLOAD_OFFLINE_PACK` message for the same version successfully completes
  and sets the marker.
- Test Chrome, Edge, Firefox, and Safari separately because writable-file-handle
  behavior differs.

## Acceptance criteria

- `index.html` contains no feature implementation. Budget: shell markup stays
  under an agreed line/byte limit (to be set once the current shell is
  measured), rather than the vague "small enough to review." This criterion
  applies to the source and `dist/web/index.html`. The generated single-file
  `dist/portable/index.html` is expected to bundle feature implementation for
  offline double-click use and is exempt from this line/byte budget; its own
  criteria are, explicitly:
  - All feature code, CSS, required templates, fragments, and libraries are
    inlined or otherwise bundled into the single file for `file://` use — no
    runtime fragment `fetch()` calls and no dynamic `import()` of separate
    chunk files, since both are unreliable or blocked under `file://`.
  - Service-worker registration is disabled in this build (there is no origin
    for it to control, and no update model applies).
  - Portable startup and every export path (PDF, Excel, `.sav` open/save,
    legacy migration) are tested by double-clicking the file with no web
    server running.
  - This build intentionally does not receive the hosted build's
    startup-memory/lazy-loading benefit — that tradeoff is accepted in
    exchange for `file://` compatibility, not a regression to fix.
- Startup's page-level execution loads and evaluates only shell, security,
  persistence, and the selected first view. Budget: measured against the
  step-1 baseline, this must show a concrete improvement, not merely avoid
  regressing — e.g. initial evaluated JavaScript reduced by an agreed minimum
  percentage (to be set once the current baseline is measured; a `"must not
  regress"` bar alone would accept a refactor with zero startup benefit),
  along with initial request count and DOM-node count tracked against
  baseline. Background service-worker precache transfer is tracked as a
  separate, larger budget (see step 7) and is not part of this figure.
- Excel and PDF libraries are absent from the page's initial
  import/evaluation path (they may still be precached in the background by the
  service worker per step 7).
- Leaving a feature calls its cleanup function and removes its DOM/listeners;
  heap growth after N repeated route changes (e.g. 20 cycles) stays within an
  agreed bound relative to the *warmed* per-feature baseline (see step 8's
  leak-test procedure), not the cold startup baseline.
- Rapid or overlapping navigation never loses the most recently requested
  feature's DOM: a stale/superseded mount only ever disposes its own
  per-navigation host, never a container a newer feature is using (see the
  per-navigation host design in the module contract section above).
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
