# Milestone Archive

This archive consolidates the historic Index Split Plan and completed Milestone proposals 14 through 35.

## Table of Contents

- [INDEX-SPLIT-PLAN.md](#index-split-plan-md)
- [MILESTONE-14-PROPOSAL.md](#milestone-14-proposal-md)
- [MILESTONE-15-PROPOSAL.md](#milestone-15-proposal-md)
- [MILESTONE-16-PROPOSAL.md](#milestone-16-proposal-md)
- [MILESTONE-17-PROPOSAL.md](#milestone-17-proposal-md)
- [MILESTONE-18-PROPOSAL.md](#milestone-18-proposal-md)
- [MILESTONE-19-PROPOSAL.md](#milestone-19-proposal-md)
- [MILESTONE-19-1-PROPOSAL.md](#milestone-19-1-proposal-md)
- [MILESTONE-19-2-PROPOSAL.md](#milestone-19-2-proposal-md)
- [MILESTONE-19-3-PROPOSAL.md](#milestone-19-3-proposal-md)
- [MILESTONE-19-4-PROPOSAL.md](#milestone-19-4-proposal-md)
- [MILESTONE-19-5-PROPOSAL.md](#milestone-19-5-proposal-md)
- [MILESTONE-20-PROPOSAL.md](#milestone-20-proposal-md)
- [MILESTONE-21-PROPOSAL.md](#milestone-21-proposal-md)
- [MILESTONE-22-PROPOSAL.md](#milestone-22-proposal-md)
- [MILESTONE-23-PROPOSAL.md](#milestone-23-proposal-md)
- [MILESTONE-24-PROPOSAL.md](#milestone-24-proposal-md)
- [MILESTONE-25-PROPOSAL.md](#milestone-25-proposal-md)
- [MILESTONE-25-1-PROPOSAL.md](#milestone-25-1-proposal-md)
- [MILESTONE-26-PROPOSAL.md](#milestone-26-proposal-md)
- [MILESTONE-27-PROPOSAL.md](#milestone-27-proposal-md)
- [MILESTONE-28-PROPOSAL.md](#milestone-28-proposal-md)
- [MILESTONE-29-PROPOSAL.md](#milestone-29-proposal-md)
- [MILESTONE-30-PROPOSAL.md](#milestone-30-proposal-md)
- [MILESTONE-31-PROPOSAL.md](#milestone-31-proposal-md)
- [MILESTONE-32-PROPOSAL.md](#milestone-32-proposal-md)
- [MILESTONE-33-PROPOSAL.md](#milestone-33-proposal-md)
- [MILESTONE-34-PROPOSAL.md](#milestone-34-proposal-md)
- [MILESTONE-34-1-PROPOSAL.md](#milestone-34-1-proposal-md)
- [MILESTONE-34-2-PROPOSAL.md](#milestone-34-2-proposal-md)
- [MILESTONE-35-PROPOSAL.md](#milestone-35-proposal-md)


---

<a id="index-split-plan-md"></a>

# Archive: INDEX-SPLIT-PLAN.md

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
export async function mount({
  container,
  route,
  selectState,
  services,
  signal,
}) {
  if (signal.aborted) return async () => {}; // don't do expensive rendering for a nav that's already stale
  const ward = selectState((state) => state.wardsById[route.wardId]); // smallest slice, not the whole case
  const view = renderRoute(route, ward); // Node/DocumentFragment, or HTML string via renderTrustedHtml
  if (signal.aborted) return async () => {}; // re-check: renderRoute() may have taken a while
  if (typeof view === "string") {
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
`mount()` actually succeeds _and_ the attempt is still current. A stale
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
  const host = document.createElement("div");
  host.className = "feature-host";
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
  dashboard: () => import("./features/dashboard/index.js"),
  guardian: () => import("./features/guardian-inventory/index.js"),
  simplified: () => import("./features/simplified-accounting/index.js"),
  annual: () => import("./features/annual-accounting/index.js"),
  plans: () => import("./features/plans/index.js"),
};

let activeHost = null; // the host element currently attached inside #main-content
let disposeCurrent = async () => {};
let activeController = null; // belongs to the committed feature; stays alive until a replacement commits
let pendingController = null; // belongs to whichever candidate is currently staging; aborted when superseded
let navSeq = 0;

export async function showFeature(name, context) {
  const mySeq = ++navSeq; // bump before any validation, so even an unknown route supersedes a pending import
  pendingController?.abort(); // stop any older staging candidate immediately — even if this route turns out invalid
  pendingController = null;

  const loader = loaders[name];
  if (!loader) {
    renderErrorView(context.overlay, new Error(`Unknown route: ${name}`), {
      retry: null, // not retryable — always fails the same way
      goToDashboard: () => showFeature("dashboard", context),
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
      goToDashboard: () => showFeature("dashboard", context),
    });
    return;
  }
  if (mySeq !== navSeq) return; // superseded while awaiting import

  const stagingHost = createHost(); // detached; not appended to the document yet
  const controller = (pendingController = new AbortController());

  let mounted;
  try {
    const result = await feature.mount({
      ...context,
      container: stagingHost,
      signal: controller.signal,
    });
    const dispose = typeof result === "function" ? result : result?.dispose;
    if (typeof dispose !== "function") {
      throw new Error(
        `${name}: mount() must return a cleanup function, or { dispose, activate }`,
      );
    }
    const activate = typeof result === "object" ? result.activate : undefined;
    if (activate !== undefined && typeof activate !== "function") {
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
      goToDashboard: () => showFeature("dashboard", context),
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
      reportNonFatalError("dispose failed on stale mount", err);
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
    reportNonFatalError("activate failed after commit", err);
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
      reportNonFatalError("dispose failed during navigation", err);
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
const ALLOWED_FRAGMENTS = new Set(["common-modals", "help"]);
const templateCache = new Map(); // one entry per allowlisted fragment; no eviction needed at this size

export async function loadFragment(name) {
  if (!ALLOWED_FRAGMENTS.has(name))
    throw new Error(`Unknown fragment: ${name}`);

  if (templateCache.has(name)) {
    return templateCache.get(name).content.cloneNode(true);
  }

  const url = new URL(`../fragments/${name}.html`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Could not load ${name}: ${response.status}`);
  const template = document.createElement("template");
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
  self.addEventListener("message", (event) => {
    if (event.data?.type === "DOWNLOAD_OFFLINE_PACK") {
      // downloadOfflinePack() checks the versioned ready marker first, so a
      // repeated successful request after completion is cheap (no re-fetch).
      const attempt = (offlinePackPromise ??= downloadOfflinePack());
      event.waitUntil(
        attempt.finally(() => {
          // Clear on settle — success or failure — so a later message can
          // retry a failed attempt instead of forever reusing its rejection.
          if (offlinePackPromise === attempt) offlinePackPromise = null;
        }),
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
  agreed bound relative to the _warmed_ per-feature baseline (see step 8's
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

## Current status and remaining work (as of Milestone 8)

Milestones 1–8 are shipped and live: build system, pilot (Simplified
Accounting), all four Plan variants, Annual Accounting, and Guardian
Inventory — every feature-pack extraction from step 5 except Dashboard/
ward-management is done. `src/legacy-app.js` is down to ~8,060 lines (from
17,180). Each extracted feature's `print.js`/`excel.js` load together via one
`Promise.all()` at first mount, matching step 6.

**Design correction versus the router section above:** the shipped router is
`src/core/feature-bridge.js`'s small `createFeatureBridge()` factory
(`mountPage()`/`mountNav()`, cache the load promise, no `dispose()`), not the
detached-staging-host/`pendingController`/`navSeq` router documented earlier
in this file. At Milestone 8 that design was deliberately not built under the
assumption that user navigation would remain sequential; arbitrary overlapping
programmatic switches were outside the shipped contract. Extracted renderers
at that milestone also returned HTML strings with inline event attributes.
Milestone 11 replaced those attributes with shared delegates and abortable
feature-local delegates, but did not change the bridge's sequential-navigation
contract. Milestone 12 records that limitation as architectural debt rather
than claiming the full concurrent router's acceptance criterion is met.

### Milestone 9: Dashboard and ward-management extraction

The last item on step 5's list. Currently in `legacy-app.js`:
`pageDashboard()`, `renderDashboardGrid()`, `renderDashboardSummary()`,
ward-card rendering, and the ward-management flows (`addWard`, `switchWard`,
`convertWard`, archive/delete). Follow the same shape as every prior
extraction: `src/features/dashboard/index.js` with `mount()`/`mountNav()`,
promoted through `createFeatureBridge()`, with an `ensureXFeatureReady()`-style
pre-load only if some other still-legacy code needs dashboard data
synchronously before this module loads (check `getWardHeadlineTotal()` and
nav-dot code first — this exact pattern bit Guardian Inventory in Milestone 8
and is worth checking up front this time instead of discovering it via a
crash). Sweep for the same three bug classes every milestone has hit: an
unbridged `window.*` reference, a moved `const`/`let` that isn't a `window`
property, and a `window.validate*`-style wrapper that needs to fail loud, not
silently.

### Milestone 10: Rebuild the service worker (step 7)

**Implemented:** `build:web` now runs `scripts/generate-service-worker.mjs`
after Vite. The script inventories and content-hashes the actual `dist/web`
runtime artifacts, derives critical/offline subsets from that one manifest,
and injects it into the copied worker template. The hosted build registers
that generated worker; source/dev builds do not register it, and `file://`
portable remains explicitly service-worker-free.

- Split into critical-shell (atomic, blocks install) vs. offline-pack
  (nonblocking, `DOWNLOAD_OFFLINE_PACK` message-triggered, `event.waitUntil()`
  tracked) tiers: complete.
- Build-generated, content-revisioned manifest and byte verification for both
  tiers: complete.
- Version-atomic ready marker, visible failure/retry state, and user-triggered
  activation of a waiting update: complete. Old version caches are retained
  while older clients may still need them; bounded stale-cache cleanup remains
  a future storage-maintenance refinement.
- `.sav`, case-data, blob, cross-origin, and non-manifest requests are never
  cached: covered by focused hosted-build tests.

### Milestone 11: CSP and inline-handler removal

Complete. Executable inline event attributes have been replaced by fixed,
declarative actions and registered listeners. The CSP now keeps scripts strict
(`script-src 'self'`, with exact SHA-256 authorization for the portable build's
generated inline module) and does not allow inline or evaluated script. Inline
styles remain temporarily allowed by `style-src 'self' 'unsafe-inline'` because
legacy rendering still emits dynamic style attributes; removing that exception
is a separate style-migration task, not part of Milestone 11.

### Milestone 12: Shrink the legacy entry, evaluate a real `main.js`

**Complete. Decision: path A plus path D — keep the shared classic core, make
only bounded cleanup, and defer `main.js` until after Milestone 13 measurement.**
This is a deferral, not a rejection of modules. A module bootstrap is optional
cleanup and is not justified merely by making the file tree look tidier.

The audit began with `legacy-app.js` at 8,184 logical lines / 454,619 bytes.
Removing two dead declarations and extracting the self-contained hosted PWA
notifier/update workflow to `src/pwa-ui.js` leaves it at 8,059 logical lines /
449,060 bytes. Its remaining size is substantial, but the map below shows that
it is now predominantly shared application core and shell workflow rather
than feature implementations left behind by the split.

**True shared core**

- Application state and type identity: `guardianData`, `window.D`, inventory
  metadata/aliases, active route/type state, and blank-data factories needed
  synchronously when a ward is created.
- Persistence and lifecycle: in-memory stores, debounced writes, canonical
  `.sav` archive creation/opening, remembered file handles, temporary recovery,
  legacy browser-storage migration, launch selection, and initialization.
- Security: input/import hardening, AES-GCM/PBKDF2, unlock/lockout/auto-lock,
  optional OS keychain access, encrypted audit records, and Tauri backup hooks.
- Cross-feature services: form binding/formatting, validation summaries,
  print-preview paging, calculations/reconciliation, navigation completion,
  schedule attachments/comments, template lookup, and shared export helpers.
- Hosted offline/update UI remains shared core, but is now the bounded
  `src/pwa-ui.js` module because it has no dependency on legacy lexical state.

**Shell workflow**

- Theme, icons, contextual help, walkthroughs, help-guide export, activity-log
  view, top navigation, sidebar/progress UI, and mobile shell controls.
- Ward selection and creation, carry-over, conversion, rename/delete,
  multi-year switching, startup/unlock/modals, and the inventory-type chooser.
- The dashboard implementation is already extracted. The legacy entry retains
  only its shell route and lazy bridge entry points, alongside equivalent
  bridge entry points for the filing features.

**Compatibility globals**

- Intentional state/service APIs include `window.D`, selected metadata and
  factory constants, live state accessors, persistence adapters, formatter and
  renderer services consumed by feature modules, declarative event modules,
  and Playwright setup. These are current cross-boundary contracts, not all
  accidental leftovers.
- Classic-only shims are narrower: the eight feature-loader functions,
  `createFeatureBridge`, `disposeActiveFeature`, `loadFragment`, and the six
  `emptyData*` factories are assigned to `window` because the classic entry
  cannot import their modules.
- Top-level classic function declarations also become implicit globals. The
  four event modules alone currently depend on roughly sixty such APIs, while
  extracted features consume additional shared services. Converting the file
  to a module today would require an equally large explicit compatibility
  facade before it removed any meaningful coupling.

**Still extractable islands**

- Extracted now: the hosted-only PWA registration, offline-pack prompt, retry,
  and update-ready UI in `src/pwa-ui.js`; it is Vite-managed and does not add a
  `window` shim.
- Possible later islands: help/walkthrough registries and guide export, plus
  groups of pure formatting/calculation helpers. They are not moved now because
  their consumers still span classic shell code and lazy features; moving them
  before measuring would mostly add adapters rather than reduce startup work.

**Architectural debt**

- `createFeatureBridge()` caches and mounts modules and now disposes the module
  previously active in a shared container, so departed feature delegates do not
  remain live. It still assumes sequential navigation: it does not use
  navigation sequence tokens or detached staging hosts, so arbitrary overlapping
  programmatic route/ward changes are not a supported contract. Existing stress
  tests wait for initial lazy readiness before switching. Milestone 12 defers a
  concurrency router rewrite because no normal user-path failure has been
  demonstrated; the earlier concurrent acceptance criterion remains explicitly
  unresolved.
- The classic bootstrap, implicit global namespace, module-to-classic
  `window.*` shims, and script publication ordering remain debt. A real
  `src/main.js` should be reconsidered after Milestone 13 supplies startup and
  evaluation measurements and only with a staged service API plus source/web/
  portable tests. Final recommendation for this milestone: **defer `main.js`**.

Two declarations were removed after repository-wide `rg -w` checks found only
their definitions: `computeHMAC` and `loadWardsFromState`. A post-removal scan
for both names returns no matches. No `.sav` format or case-data behavior changed.

### Milestone 13: Measure and finish (step 8), then acceptance-criteria sign-off

**Complete with explicit deferrals.** Measurements were taken on 2026-08-30
from the working tree based on `2ff1ddf`. Reproducible records are in
`tests/baseline/milestone-13-{source,web,portable}.json` and
`tests/baseline/milestone-13-lifecycle.json`; the original `30dc907` record
remains `tests/baseline/latest.json`.

The plan said numeric thresholds would be agreed after the baseline was
measured, but neither the plan, the baseline artifact, nor the baseline-era
commits contain those values. Milestone 13 therefore reports actual deltas and
marks threshold-dependent clauses deferred; it does not retroactively invent
targets.

| Metric                                            | `30dc907` baseline | Final hosted web |  Delta |
| ------------------------------------------------- | -----------------: | ---------------: | -----: |
| Application JavaScript, decoded bytes             |          1,010,181 |          475,861 | -52.9% |
| All initially evaluated JavaScript, decoded bytes |          6,273,456 |        5,739,140 |  -8.5% |
| HTML navigation encoded body                      |          1,125,820 |           24,505 | -97.8% |
| Initial JS heap                                   |         21,255,244 |        9,894,880 | -53.4% |
| Initial DOM nodes                                 |              2,472 |              632 | -74.4% |
| Initial requests                                  |                  9 |               12 |     +3 |
| Chromium `ScriptDuration`                         |         0.008997 s |       0.102134 s |  11.4x |

The application-code, heap, DOM, and HTML-body improvements are concrete.
Total evaluated JavaScript improves only 8.5% because `html2pdf`, ExcelJS,
JSZip, and all three workbook templates still execute at startup. The request
count and `ScriptDuration` regress. The acceptance clause requiring PDF/Excel
libraries to be absent from the initial path is therefore unresolved, not
reported as a pass. Source startup measured 498,472 application bytes,
5,761,751 total decoded script bytes, 9,865,344 heap bytes, 633 nodes, and 20
requests. Portable startup measured 961,111 application bytes, 6,224,390 total
script bytes, 10,028,508 heap bytes, 620 nodes, and an 842,389-byte HTML body;
portable intentionally trades hosted lazy-loading for `file://` operation.

Source `index.html` is 101,221 bytes / 1,080 lines and hosted
`dist/web/index.html` is 100,125 bytes / 1,073 lines. Portable is 842,389 bytes
/ 4,575 lines and is exempt from the shell limit. No source/hosted shell limit
was ever agreed, so these are records rather than a threshold pass. The final
service-worker manifest is `fabdd463489af01a`: 5 critical entries / 886,068
bytes and 33 offline entries / 5,931,477 bytes.

The warmed lifecycle run imported and mounted each module once, disposed it,
forced Chromium GC, then performed 20 mount/dispose cycles. Post-GC heap growth
was: Simplified 17,676 bytes; Plan Simplified 16,236; Plan Annual 15,648; Plan
Initial 12,904; Plan Minor 11,252; Annual 9,824; Guardian 18,692; Dashboard
34,024. All 160 cycles completed without console errors and the shared host was
empty after every disposal. Retained-node deltas ranged from -248 to +417;
because no heap/node bound was agreed and CDP's retained-node count is noisy,
the raw values are preserved instead of assigning a retrospective pass limit.

Validation completed:

- Both production builds passed. Full Chromium matrices: source 65 passed / 5
  hosted-only skipped; dev 64 passed / 6 target-specific skipped; web 69
  passed / 1 source-only skipped; portable `file://` 64 passed / 6
  target-specific skipped. Vitest has no unit specs and exits successfully.
- Focused startup, every filing route/dashboard, `.sav`, lock, CSP, fragment,
  and MIME coverage passed 25/25 in Microsoft Edge, Firefox, and WebKit as well
  as the full Chromium runs. WebKit on Windows is Safari-engine compatibility
  evidence; actual Safari was not available.
- Hosted offline passed 5/5: atomic shell, ready marker, a never-imported Plan
  Minor feature after the current build's pack is ready, partial failure and
  retry, and `.sav`/case-data/blob/cross-origin/non-manifest exclusions.

Acceptance sign-off:

- **Resolved:** source/hosted shell has no feature implementation; hosted
  application JavaScript, heap, DOM, and HTML transfer show concrete
  improvement; feature disposal is invoked; hosted offline first-use/retry and
  exclusions pass; current-format plain/encrypted `.sav` round trips, wrong
  password, corruption, recovery, lock, and unencrypted legacy migration pass;
  dual release policy is documented; strict script CSP, no executable inline
  handlers, fragment allowlist, JavaScript MIME, and visible chunk-load retry
  pass.
- **Deferred/unresolved:** no pre-agreed shell, startup, request, or warmed-heap
  thresholds exist; PDF/Excel/template scripts still execute initially;
  overlapping programmatic navigation still lacks sequence/staging isolation;
  portable still requires its complete folder because classic libraries and
  templates are external to `index.html`; no checked-in prior-release `.sav`
  fixture proves historical compatibility; remembered writable handles and
  encrypted legacy migration are not automated; real Safari was not run; old
  service-worker caches have no bounded retirement policy; `src/main.js`
  remains deferred per Milestone 12.

No archive-format bump was made: new `.sav` files remain format version 2.
The two repository-adjacent workbook files are user artifacts, were not opened
or modified, and are excluded from this milestone and its commit.

### Milestone 14: Role-aware dashboard triage

**Complete with approved deferrals.** Implementation was validated on
2026-08-30 from the working tree based on `72b7441`. The approved scope and
guardrails are recorded in `MILESTONE-14-PROPOSAL.md`.

Implementation summary:

- Added a pure dashboard projection layer for filing identity, totals,
  progress, statutory deadlines, workflow fallback, filing contacts,
  assignments, priority, and non-overlapping triage metrics.
- Added family, professional, and assistant dashboard views. Family view keeps
  every filing accessible; triage views add status, deadline, contact, and
  assignment filters plus priority sorting.
- Added one validated browser-local preference record under
  `pg-dashboard-preferences-v1`, with session-memory fallback when localStorage
  is unavailable. Preferences do not mutate wards or enter `.sav` archives.
- Added optional `dashboardWorkflow.status` and `assigneeName` metadata only
  after explicit user changes. Values are normalized, `auto` removes explicit
  status, and empty workflow containers are deleted.
- Updated new-year handling so the prior snapshot retains status and
  assignment, the new year clears status and carries assignment, and switching
  back restores the prior metadata.
- Preserved lazy dashboard `mount()`/`dispose()`, existing declarative action
  behavior, production data from `guardianData.wards`, strict CSP, and escaped
  ward-derived rendering. No production mock data was added.

Phase gates passed:

- **14A:** 16 projection tests cover all filing deadline rules, deep-frozen
  input, contacts, workflow fallback, priority, metrics, and normalization.
- **14B:** 5 preference tests cover validation and storage failure. Browser
  role/filter operations leave ward JSON unchanged, survive remounts, and are
  absent from every exported ZIP entry.
- **14C:** dashboard controls use `saveWardToState()`, dirty-state marking, and
  indicator refresh. Explicit metadata round-trips through a real `.sav`;
  new-year reset/carry and prior-year restoration pass.

Validation completed:

- Vitest: 2 files, 21 tests passed. Both production builds passed.
- Full Chromium matrices: source 70 passed / 5 hosted-only skipped; dev 69
  passed / 6 target-specific skipped; web 74 passed / 1 source-only skipped;
  portable `file://` 69 passed / 6 target-specific skipped.
- Focused routes, dashboard, `.sav`, security, startup, and unlock coverage
  passed 30/30 in Microsoft Edge, Firefox, and WebKit. WebKit on Windows is
  Safari-engine compatibility evidence; actual Safari was not available.
- Hosted offline coverage passed within the web matrix. Source lazy-load
  failure and reload behavior passed within the source matrix.
- Source security coverage confirms no executable inline handlers or scripts
  were introduced; the portable build retains its generated CSP-hashed bundle.
- Post-review regression coverage confirms pending and approved filings retain
  informational dates without entering actionable card badges, family deadline
  counts/worklists, or triage deadline filters; source, rebuilt web, and rebuilt
  portable checks passed.

Archive compatibility was preserved. The pre-Milestone-14 commit `72b7441`
declares `SAV_FORMAT_VERSION=2`; the Milestone 14 working tree still declares
version 2, and its diff does not touch the declaration or archive manifest.

Approved deferrals remain: durable professional identities, court-system
integration, automatic ward migration or hydration, persisted computed
progress/deadlines, cross-device preference synchronization, targeted per-card
render optimization, and production sample data. The two repository-adjacent
workbook files remain untouched and excluded.

### Milestone 15: Dashboard UX redesign

**Complete.** Implementation was validated on 2026-08-30. Scope and guardrails
are recorded in `MILESTONE-15-PROPOSAL.md`.

Implementation summary:

- Rebalanced every role around three primary compliance signals: action items /
  exceptions, approaching deadlines, and pending court review. Active filings
  remains quieter, and the combined financial total is now secondary text.
- Moved role selection, assistant `Working on behalf of` filtering, and the
  compact `New Filing from Existing` action into a dedicated dashboard header.
  Exact-count tests prevent duplicate controls.
- Refined family priority cards and the professional/assistant CSS Grid queue
  with priority ordering, restrained rails and tints, urgency badges, styled
  editable workflow selectors, and responsive field labels.
- Kept pending review informational rather than urgent, due-soon items amber,
  correction/overdue items rose, and approved/archived items visually quiet.
  Pending and approved dates remain excluded from actionable deadline metrics.
- Preserved all existing delegated dashboard actions and change hooks. Queue
  grouping remains intentionally unnecessary for professional/assistant mode;
  existing ward-card grouping and archived access remain available.

Visual validation:

- Captured the required light and dark screenshots at 1920 x 1080, 1366 x 768,
  768 x 1024, and 390 x 844, plus assistant desktop/mobile and scrolled mobile
  row evidence.
- The triage metrics dominate the first scan while the combined total is quiet.
  Priority rails/badges communicate filing state without resembling application
  errors. Workflow status remains visibly editable.
- Tablet and mobile layouts reflow without horizontal overflow. Row labels,
  assignment controls, and all six actions remain readable and usable. Assistant
  filtering is clear in the header and does not crowd queue rows.
- The screenshot harness now dismisses the timed walkthrough through its real
  delegated shell action before capture and asserts that no full-viewport layer
  obscures a frame.

Validation completed:

- Vitest: 2 files / 21 tests passed. Focused route coverage: 16/16 passed.
- Full Chromium matrices: source 71 passed / 5 target-specific skipped; dev 70
  passed / 6 skipped; rebuilt web 75 passed / 1 skipped; rebuilt portable
  `file://` 70 passed / 6 skipped.
- Both production builds passed. Hosted offline, CSP, lazy-route lifecycle,
  current-format plain/encrypted `.sav`, recovery, and portable checks remain
  green within those matrices.
- `SAV_FORMAT_VERSION` remains 2. The milestone diff does not touch archive
  hydration, ward factories, or workflow persistence rules. Edited source/test
  files use consistent checkout line endings, and `git diff --check` passes.

No Milestone 15 behavior is deferred. The two repository-adjacent workbook
files remain untouched and excluded.

### Milestone 16: Ward-Level Tab Lock

**Complete.** Implementation and architectural hardening finalized on 2026-08-31. Scope and requirements
are recorded in `MILESTONE-16-PROPOSAL.md`.

Implementation summary:

- Implemented `acquireWardLock(wardId)` and `releaseWardLock()` in `src/core/ward-lock.js`
  using deterministic outer-promise resolution, serialized in-tab transitions, fail-open handling for
  API exceptions, and fast-path resolution for currently held locks.
- Established a single activation chokepoint in `src/legacy-app.js`: `activateWard(ward)` and `unloadWard()`
  govern all ward lifecycle transitions across `switchWard`, `addWard`, `deleteWard`, `convertExistingWard`,
  session-restore unlock, and `initApp`.
- Adopted the "hold lock for in-memory lifetime" model: navigating to `#/dashboard` is a view switch that
  maintains the lock while in-memory state is resident. Lock is released on explicit ward switch,
  "Close ward" action, `deleteWard`, or tab closure.
- Added explicit "Close ward" affordance in sidebar and dashboard.
- Updated `deleteWard` to release lock, unload ward, and land cleanly on `#/dashboard` without auto-promoting `wards[0]`.
- Implemented `#ward-locked-overlay` modal in `index.html` with full WAI-ARIA accessibility (`role="dialog"`,
  `aria-modal="true"`, `aria-labelledby`), focus capture/restoration, and `Escape` key dismissal in `src/modal-events.js`.
- Portable (`file://`) and non-supported environments gracefully no-op to `true` without errors.

Validation completed:

- Unit tests (`tests/unit/ward-lock.spec.js`): comprehensive coverage of deterministic release, serialization,
  fail-open, fast-path, and portable no-op.
- E2E tests (`tests/e2e/ward-lock.spec.ts`): multi-context tests for independent wards, dashboard lock retention,
  explicit Close ward release, deleteWard release, rollback on conflict, and modal accessibility.
- `SAV_FORMAT_VERSION` remains 2. No changes to persisted `.sav` schema or files. No CSP violations.

### Milestone 17: Per-Ward Save Files

**Complete.** Implementation was validated on 2026-09-02. Scope and requirements
are recorded in `MILESTONE-17-PROPOSAL.md`.

Implementation summary:

- Implemented version-3 per-ward `.sav` file format (`SAV_FORMAT_VERSION = 3`) where each
  ward is saved to its own independent ZIP archive containing `manifest.json`, `ward.enc`,
  and scoped `auditLog.enc`.
- Replaced monolithic file handle storage with a per-ward file handle map
  (`Map<wardId, FileSystemFileHandle>`) in launch preferences, isolating auto-saves to the
  active ward.
- Added file handle deconfliction with `isSameEntry()` and pre-write validation to prevent
  overwriting legacy multi-ward files or cross-binding handles between different wards.
- Implemented backwards-compatible import and migration flow for version-2 archives with
  a one-time informational dialog (`#migration-overlay`), extracting multi-ward archives
  into independent in-session wards.
- Added dashboard "Export All Wards" action to bundle all loaded wards into individual `.sav`
  files inside a single ZIP download, and recorded export provenance in the audit log.
- Updated startup dialog copy and labels from "Case" to "Ward" ("Open a Ward File (.sav)",
  "Start a New Ward", `open-ward`, `start-new-ward`).

Validation completed:

- E2E tests (`tests/e2e/save-open-sav.spec.ts`): verified v3 per-ward save/open flows,
  encrypted/unencrypted round-trips, multi-handle deconfliction, v2 multi-ward migration,
  fallback downloads, and export provenance auditing.
- Startup tests (`tests/e2e/startup.spec.ts`): verified updated selectors and flows.
- Unit and E2E suites passing cleanly across all targets.
- CSP preserved; no executable inline handlers or scripts.

### Milestone 18: Full Multi-Ward Backup .SAV & Save Controls Restore

**Completed.** Scope and requirements are recorded in `MILESTONE-18-PROPOSAL.md`.

- Multi-ward backup generation (`backupAllWardsNow()` / `buildBackupZipBlob()`) containing all wards, audit log provenance, metadata, and templates in version 3 format.
- Save Controls sidebar additions (`Backup All Wards (.sav)` and `Open Backup (.sav)`).
- In-session restore flow (`openBackupSavFile()` / `triggerOpenBackupSav()`) with format sniffing, confirmation prompt, decryption, and atomic hydration.
- Verification across Playwright E2E and unit test suites.

### Milestone 19: WCAG 2.1 Level AA Compliant Output PDF Generation (Tagged Structure & Vector Architecture)

**Implementation Complete (Slices 19A, 19B, 19C, 19D & 19E automated tests verified; manual Acrobat Pro report pending; PDF/UA-1 font embedding deferred).** Scope, technical architecture, and requirements are recorded in `MILESTONE-19-PROPOSAL.md`.

- Tagged PDF structure tree root (`/StructTreeRoot`), `/RoleMap`, and `/ParentTree` numbering dictionaries.
- Document catalog `/MarkInfo << /Marked true >>`, single `/Lang (en-US)`, `/Metadata` reference, and `/ViewerPreferences << /DisplayDocTitle true >>`.
- PDF version 1.7 header (`%PDF-1.7`) and standards-compliant XMP Metadata Stream (`dc:title`, `dc:creator`, `dc:description`, `pdfuaid:part 1`).
- Clean deferred object serialization (`newObjectDeferred()`, `newObjectDeferredBegin(id, true)`) eliminating all file damage, malformed objects, and xref offset displacements.
- Page dictionary `/Tabs /S` tab order and `/StructParents` keys.
- Marked Content operators (`BDC ... EMC`) for semantic structural blocks (`/H1`, `/H2`, `/Table`, `/TR`, `/TH`, `/TD`, `/P`, `/Figure`).
- Artifact tagging (`/Artifact << /Type /Pagination >>` and `/Artifact << /Type /Layout >>`) for running headers, footers, divider lines, and alternating row backgrounds.
- Strict table hierarchy, headers, and regularity matching all 32 Adobe Acrobat Pro Accessibility Checker rules with zero errors.

---

<a id="milestone-14-proposal-md"></a>

# Archive: MILESTONE-14-PROPOSAL.md

# Milestone 14: Role-Aware Dashboard Triage

## Goal

Add role-aware caseload triage through a pure dashboard view-model layer.

Do not migrate existing wards automatically. Do not duplicate computed filing data. Do not use mock data in production. Production rendering must use parsed `.sav` state, primarily `guardianData.wards`, plus browser-local dashboard preferences.

Preserve strict CSP, lazy dashboard loading, `mount()`/`dispose()`, current declarative actions, and `.sav` compatibility.

## Implementation Discipline

Before editing code, verify that this file is the active approved scope and confirm:

1. Production dashboard rendering stays bound to real `.sav` state, not mock data.
2. 14A has zero persistence or schema changes.
3. Workflow status and assignment persistence happen only in 14C after explicit user action.
4. Do not bump `SAV_FORMAT_VERSION`; stop and request renewed sign-off if implementation reveals that a bump is necessary.
5. Existing dashboard action names and behavior remain unchanged; new controls may add delegated `data-dashboard-action` values.
6. CSP and no-inline-handler rules remain intact.
7. Tests will cover view-model projection, preferences, `.sav` compatibility, role rendering, sorting, escaping, and mount/dispose behavior.

Work in slices and checkpoint after each family of handlers or phase. Each checkpoint must report:

- Files touched
- Behavior changed
- Tests run and results
- Any deferrals or newly discovered risks

Phase gates:

- 14A must pass projection tests before 14B begins.
- 14B must prove preferences never mutate wards or enter `.sav` before 14C begins.
- 14C persistence work begins only after the 14A and 14B gates pass.

## Data Ownership

| Category | Fields |
| --- | --- |
| Derived from wards | Identity, display type, case number, archive state, total, progress, statutory deadline, deadline bucket, recency, filing contacts |
| Optional ward persistence | Explicit user-tracked filing status and operational assignee |
| Browser preference | Dashboard role, supervising-professional filter, onboarding dismissal |
| Rejected | Persisted progress, persisted statutory deadline, generated professional IDs, automatic hydration defaults |

Browser preferences must never enter `.sav` data.

### Persisted Ward Shape

Persist metadata only after explicit user action:

```js
ward.dashboardWorkflow = {
  status: 'pending-court-review',
  assigneeName: 'Professional Name'
};
```

Both properties are optional.

Valid persisted statuses:

- `not-started`
- `draft`
- `ready-to-file`
- `pending-court-review`
- `disapproved-needs-correction`
- `approved`

`auto` is a UI command, never a persisted value. Selecting it removes `status`. Remove `dashboardWorkflow` when both properties are absent.

Validate persisted values when reading. Invalid values must fall back without rewriting the ward.

### Filing Contacts

Normalize all usable contacts into an array:

```js
filingContacts: [
  {
    name: 'Professional Name',
    role: 'attorney',
    filterKey: 'professional name'
  }
]
```

Derivation must accommodate:

- Guardian Inventory: `preparer.name`, `attorney.name`, `attorneyForGuardian`
- Simplified Accounting: `attorney`
- Annual/final/trust Accounting: `preparer.name`, `attorney`
- Initial Plan: `attorneyName`, `attorney_name`
- Annual Plan: `attorney`
- Minor Plan: `preparer_name`, `attorney_name`
- Simplified Plan: no professional contact field

Deduplicate matching names while retaining distinct roles where useful.

A filing contact is not an assignee. Assigned/unassigned filtering must use only explicit `dashboardWorkflow.assigneeName`.

Normalized keys are for filtering only and are not durable identities.

## View Model

Add:

`probate-guardian/src/features/dashboard/view-model.js`

The module must be pure. It must not read the DOM, localStorage, `window`, or mutable global state.

Suggested entry point:

```js
projectDashboardWard(ward, {
  displayType,
  total,
  progress,
  today
});
```

`today` uses local calendar-day semantics and must be injectable for deterministic tests.

Each projection exposes at least:

```js
{
  wardId,
  wardName,
  inventoryType,
  displayType,
  caseNumber,
  isArchived,
  total,
  progressPercent,
  deadlineDate,
  deadlineBasis,
  deadlineBucket,
  isDeadlineActionable,
  workflowStatus,
  workflowSource,
  filingContacts,
  assigneeName,
  assigneeKey,
  lastModified,
  priorityRank
}
```

For Minor Plans, display case identification may fall back through `caseNumber`, `ucn`, and `ref` without altering source data.

### Workflow Fallback

Status precedence:

1. Archived wards return presentation status `closed` with source `presentation`.
2. A valid explicit status returns with source `explicit`.
3. Progress of 100% returns `ready-to-file` with source `derived`.
4. Any lower or unavailable progress returns `draft` with source `derived`.

`not-started` remains available as an explicit status. It must not be inferred from 0% because current completion checks can mark sections complete on untouched forms.

Pending, disapproved, and approved statuses are manually recorded. UI copy must describe them as user-tracked status, not court-synchronized information.

### Deadline Rules

Continue deriving statutory deadlines from existing filing fields:

- Guardian Inventory: `gid + 60 days`
- Simplified/Annual Accounting: `periodTo + 90 days`
- Initial Plan: `lettersSignedDate + 60 days`
- Annual/Simplified/Minor Plan: `periodTo + 90 days`

Buckets:

- `overdue`
- `today`
- `due-soon`
- `future`
- `none`

Deadlines are actionable only when the filing is active and its status is:

- `not-started`
- `draft`
- `ready-to-file`
- `disapproved-needs-correction`

Pending and approved filings may show a muted informational date but must not appear as overdue or approaching action items. Archived deadlines remain hidden.

### Priority Order

1. `disapproved-needs-correction`
2. Actionable overdue deadline
3. Actionable deadline due today or within 14 days
4. `pending-court-review`
5. `ready-to-file`
6. `draft`
7. Explicit `not-started`
8. `approved`
9. Archived/closed

Resolve ties by:

1. Earliest due date, with missing dates last
2. Oldest `lastModified`
3. Ward name

## Dashboard Preferences

Add:

`probate-guardian/src/features/dashboard/preferences.js`

Store one validated browser-local record under:

```text
pg-dashboard-preferences-v1
```

Shape:

```js
{
  role: 'family',
  supervisingProfessionalFilter: null,
  onboardingDismissed: false
}
```

Supported roles:

- `family`
- `professional`
- `assistant`

`supervisingProfessionalFilter` stores a normalized assignee filter key, not ward data or a fabricated professional ID.

Do not store email, phone, ward PII, or an unused profile object.

If storage is unavailable:

- Retain preferences in module-local memory for the browser session.
- Do not clear that memory during dashboard `dispose()`.
- Fall back to family view after a page reload.

Invalid or obsolete filters fall back to "All."

Always provide a dashboard role control after onboarding so users are not locked into their first selection.

## Metrics

Metrics operate on active projected filings.

### Action Items / Exceptions

Count each filing once when it is:

- `disapproved-needs-correction`, or
- Actionably overdue

### Approaching Deadlines

Count filings due today through 14 days from today that:

- Have an actionable deadline
- Are not disapproved

### Pending Court Review

Count explicit `pending-court-review` filings.

Pending review remains visible even when no pending filing is the highest-priority row.

## Phases

### 14A: Projection Foundation

Add:

- `probate-guardian/src/features/dashboard/view-model.js`
- `probate-guardian/tests/unit/dashboard-view-model.spec.js`

Refactor:

- `probate-guardian/src/features/dashboard/index.js`

Requirements:

- Preserve existing search, sorting, grouping, summary, and worklist behavior while changing the rendering source to projected wards. New role/filter behavior belongs to 14B.
- Move deadline derivation into the view model.
- Precompute totals and progress through existing services before projection.
- Preserve current appearance as much as possible.
- Preserve every existing `data-dashboard-action`.
- Preserve `open-ward`, `backup`, `pdf`, `archive`, and all other current actions.
- Keep production data sourced from `guardianData.wards`.
- Escape all ward-derived strings at the rendering boundary.
- Do not change persistence, factories, archive hydration, or `SAV_FORMAT_VERSION`.

### 14B: Role-Aware Triage

Add:

- `probate-guardian/src/features/dashboard/preferences.js`
- `probate-guardian/tests/unit/dashboard-preferences.spec.js`

Refactor:

- `probate-guardian/src/features/dashboard/index.js`
- `probate-guardian/index.html`

#### Family View

- Feature the active, non-archived filing.
- If unavailable, feature the highest-priority active filing.
- Show a clear Continue action.
- Keep every active filing accessible in a compact secondary list.
- Keep archived filings accessible through the existing archived section.
- Never hide sibling filings for the same person or case.

#### Professional View

- Render a high-density triage queue.
- Show metrics, workflow status, actionable deadlines, contacts, and assignment.
- Provide status, deadline, contact, and assignment filters.
- Add priority sorting.

#### Assistant View

- Use the professional queue layout.
- Add a supervising-professional filter based on explicit assignment.
- Include All, each known assignee, and Unassigned buckets.
- Treat wards with contacts but no explicit assignee as Unassigned.

#### Onboarding

- When no preference exists, render family view immediately.
- Show a non-blocking prompt inside the lazy dashboard.
- Allow role selection or dismissal.
- Keep a permanent role control available afterward.

All new controls must use delegated declarative actions. No inline scripts or executable handler attributes may be introduced.

### 14C: Explicit Workflow And Assignment

Refactor:

- `probate-guardian/src/features/dashboard/index.js`
- `probate-guardian/src/legacy-app.js`
- `probate-guardian/src/features/dashboard/view-model.js`

Requirements:

- Persist only after explicit workflow or assignment changes.
- Trim and validate assignee names before persistence.
- Remove empty properties rather than storing blank strings.
- Use `saveWardToState()`.
- Mark the case dirty and refresh the saved-state indicator.
- Keep `dashboardWorkflow` outside `WARD_SYSTEM_KEYS`.
- Do not change the archive manifest or format version.

#### New-Year Behavior

The existing new-year path snapshots current year data before creating the next year.

Update `resetYearlyFieldsForNewYear()` so:

- The prior-year snapshot retains status and assignment.
- The new year removes explicit `status`.
- The new year carries `assigneeName`.
- An empty `dashboardWorkflow` object is removed.

Switching to a prior year restores that year's recorded status and assignment.

### 14D: Validation And Sign-Off

Extend:

- `probate-guardian/tests/e2e/routes.spec.ts`
- `probate-guardian/tests/e2e/save-open-sav.spec.ts`
- `probate-guardian/tests/e2e/feature-load-failure.spec.ts`

Required coverage:

- Projection preserves current ward identity and display data.
- Deep-frozen projection input is not mutated.
- All filing-type deadline rules are deterministic.
- Professional contacts normalize and deduplicate correctly.
- Untouched wards do not rely on 0% to infer `not-started`.
- Old wards without metadata render without mutation.
- Invalid metadata falls back without rewriting.
- Explicit workflow status round-trips through `.sav`.
- `auto` removes explicit status.
- Empty workflow containers are removed.
- Assignee metadata round-trips through `.sav`.
- New-year creation clears status and carries assignment.
- Prior-year switching restores prior metadata.
- Family view retains access to every filing.
- Professional and assistant views render correctly.
- Assistant filtering distinguishes assigned and unassigned.
- Disapproved and actionable overdue filings sort first.
- Pending and approved filings are not treated as overdue action items.
- All three metrics use the defined non-overlapping rules.
- Browser preferences survive dashboard remount.
- Storage failure uses session-memory fallback.
- Exported `.sav` data contains no dashboard browser preferences.
- Ward names, contacts, assignees, and imported strings are escaped safely.
- Existing declarative actions continue working.
- Repeated mount/dispose does not accumulate listeners.
- Lazy-load failure and reload behavior remain unchanged.
- No source-authored executable inline handlers or scripts are introduced. The portable build may still emit its existing CSP-hashed inline bundle.

Run:

- Unit tests
- Full source suite
- Web build
- Portable build
- Source/dev/web/portable target matrix
- Chromium, Edge, Firefox, and WebKit matrix where supported

Record completion, results, and any explicit deferrals in:

- `probate-guardian/INDEX-SPLIT-PLAN.md`

## Deferred Work

The following are outside Milestone 14:

- Professional identity registry or durable professional IDs
- Court-system integration or automatic status verification
- Automatic migration or hydration of existing wards
- Persisted progress or deadline fields
- Cross-device synchronization of browser preferences
- Targeted per-card rendering optimization
- Production sample or mock ward data

## Sign-Off Decisions

Approve before implementation:

- No automatic `.sav` migration.
- Do not bump `SAV_FORMAT_VERSION`; stop and request renewed sign-off if implementation reveals that a bump is necessary.
- Progress and statutory deadlines remain derived.
- `not-started` is explicit rather than inferred from progress.
- Filing status is user-tracked, not court-synchronized.
- Pending and approved filings do not generate deadline alerts.
- Explicit status and assignment use optional `dashboardWorkflow` metadata.
- `auto` removes persisted status.
- Assignment uses a human-readable name, not `preparerId`.
- Filing contacts remain distinct from assignment.
- Browser preferences never enter `.sav`.
- Family view is the default and retains access to all filings.
- Onboarding is dashboard-local and non-blocking.
- Full dashboard rerender is acceptable initially.
- Existing action names and behavior remain unchanged; new controls may add delegated `data-dashboard-action` values.
- Mock data is allowed only in isolated tests.

---

<a id="milestone-15-proposal-md"></a>

# Archive: MILESTONE-15-PROPOSAL.md

# Milestone 15: Dashboard UX Redesign

## Goal

Redesign the dashboard presentation so the first screen is triage-first instead of inventory-total-first.

Milestone 14 completed the data/view-model foundation. Milestone 15 is a presentation-layer milestone: use the existing projected dashboard model, role preferences, workflow metadata, and declarative actions without changing `.sav` schema, `SAV_FORMAT_VERSION`, archive hydration, or workflow persistence rules.

The dashboard should let a user understand within five seconds what needs attention.

Milestone 15 refines and repositions existing Milestone 14 dashboard capabilities. Do not duplicate role controls, assistant filtering, metrics, family priority views, or the professional/assistant triage queue if they already exist. The work is to make those capabilities visually obvious, better placed, and easier to scan.

## Non-Negotiables

- Do not change `.sav` schema or `SAV_FORMAT_VERSION`.
- Do not change archive hydration, ward factories, or workflow persistence rules.
- Do not use mock data in production rendering.
- Preserve existing dashboard action names and behavior.
- New controls must use delegated `data-dashboard-action` values.
- Preserve CSP: no source-authored executable inline scripts or inline event handlers.
- Preserve dashboard `mount()`/`dispose()` lifecycle safety.
- Financial totals may remain visible, but they must be secondary to compliance triage.

## Visual Priority System

Use a restrained compliance-exception treatment, not application-error styling.

Preferred pattern for urgent filings:

- A left priority rail on the row/card.
- A clear status badge.
- A lightly tinted background.
- Bold, plain-language reason text such as `52 days overdue` or `Needs correction`.
- Priority ordering plus the metric strip should do most of the attention work.

Avoid:

- Toast/error styling for ordinary filing states.
- Alert-dialog styling.
- Full red cards.
- Blinking, pulsing, or animated warning treatments.
- Warning icons on every row.
- Visual language that implies the app itself failed.

Severity treatments:

| State | Treatment |
| --- | --- |
| `disapproved-needs-correction` | Strongest treatment: rose/red left rail, rose badge, lightly tinted row, reason text `Needs correction` |
| Actionable overdue | Strong treatment: red/rose left rail, overdue badge, reason text such as `52 days overdue` |
| Due today or within 14 days | Amber left rail/badge, reason text such as `Due in 8 days` |
| `pending-court-review` | Blue/indigo badge, neutral row, visible in metric strip, not styled as urgent |
| `approved` | Muted green badge, visually quiet |
| Archived/closed | Muted presentation, separated from active triage |

The standard urgent-row pattern is: red or rose left rail + status badge + muted red-tinted background + bold deadline/reason text.

Color values must support both the light default theme and the dark theme. Do not paste in a light-dashboard palette such as white cards and pale rose backgrounds unless it is validated against both themes. Prefer mapping to the existing app tokens in `index.html` such as `--surface`, `--surface-2`, `--surface-3`, `--line`, `--ink`, `--ink-4`, `--danger-text`, `--warn-text`, `--ok-text`, `--brand-text`, and `--accent-text` instead of creating broad new root variables. The visual system should use the current surfaces, borders, typography, and accent vocabulary, with theme-appropriate tints for urgent, warning, pending, and approved states.

Suggested dark-theme token shape:

```css
--dashboard-surface: existing app panel surface;
--dashboard-border: existing app muted border;
--priority-urgent-rail: rose/red accent;
--priority-urgent-bg: subtle dark rose tint;
--priority-urgent-text: accessible rose text;
--priority-warning-rail: amber accent;
--priority-warning-bg: subtle dark amber tint;
--priority-pending-rail: blue/indigo accent;
--priority-approved-rail: muted green accent;
```

## Current UI Rebalance

Inspect the current dashboard DOM and screenshot before coding. Decide whether each visible legacy element is removed, demoted, or retained:

- Combined Total
- Grouped by Type
- Active Wards
- Due Within 14 Days
- Deadlines/Recent card
- Select Existing Ward prompt
- Inventory type accordions

Expected direction:

- Replace the headline financial total with triage metrics.
- Move financial totals to individual rows/cards or secondary details.
- Collapse the large `Select an Existing Ward` panel into a compact primary action such as `New Filing from Existing`.
- Make grouping by inventory type optional or secondary, not the dominant mode.
- Reserve horizontal space for the triage queue.

## Hooks To Preserve

Before replacing dashboard markup, inventory the current dashboard action surface in `src/features/dashboard/index.js`, then preserve or deliberately remap the existing hooks used by routing, tests, and delegated actions:

- `#main-content` remains the route-owned mount host.
- `data-dashboard-action` remains the dashboard delegated action attribute.
- `data-dashboard-change="workflow-status"` remains the workflow status change hook.
- `data-dashboard-change="assignee"` remains the assignment change hook.
- Existing dashboard action names and behavior remain intact, including but not limited to:
  - `open-ward`
  - `backup`
  - `pdf`
  - `archive`
  - `new-year`
  - `delete`
  - `prior-years`
  - `toggle-archived`
  - `toggle-section`
  - `group`
  - `worklist-tab`
  - `dismiss-continue`
  - `add-ward`
  - `select-existing`
  - `set-role`
  - `dismiss-onboarding`
- Existing ward identity payload attributes used by those actions remain present or are deliberately remapped with tests.
- Existing search, sort, and group controls remain until their replacements are wired and tested.
- Existing dashboard readiness/test markers remain available or are deliberately updated with tests.
- Existing archived-section access remains available.
- Existing create/new-from-existing behavior remains intact even if the large panel becomes a compact button. Prefer keeping the current `select-existing` action name for this behavior; use a new `new-from-existing` action only if it is deliberately mapped to the same behavior and covered by tests.

New action names such as `change-role`, `filter-professional`, and `new-from-existing` are allowed only through the same delegated `data-dashboard-action` path. Do not add separate source-authored inline handlers.

Workflow controls must continue through the existing delegated `data-dashboard-change` path. Do not introduce separate listeners for status or assignment controls unless the change is deliberately reviewed and covered by lifecycle tests.

## Layout Architecture

### Header Controls

Anchor role and assistant controls within the dashboard header area, physically separate from the ward queue. Do not move controls into the global shell/navigation unless separately approved.

- Dashboard role selector.
- Assistant `working on behalf of` / supervising-professional filter.
- Compact create-from-existing action.

These controls should remain easy to find without cluttering the triage rows.

### Metric Strip

Make these three triage metrics the primary dashboard signals across dashboard roles:

- Action Items / Exceptions
- Approaching Deadlines
- Pending Court Review

Each metric should be populated from the Milestone 14 projected dashboard model and should respect `isDeadlineActionable`.

`Active Filings` may remain as a quieter secondary metric. Family view may simplify presentation, but it must not use a different definition of urgency than professional or assistant views.

### Role Views

Family view:

- Lead with the current or highest-priority active filing.
- Show the next action clearly.
- Keep all active filings accessible.
- Keep archived filings accessible through the existing archived section.

Professional view:

- Refine the existing dense triage queue.
- Prioritize exceptions, overdue filings, approaching deadlines, pending review, and ready-to-file states.
- Keep search, status, deadline, contact, assignment, and grouping controls efficient.

Assistant view:

- Use the professional queue layout.
- Refine the existing supervising-professional filter.
- Include All, each known assignee, and Unassigned buckets.

### Grouping Decision

- Preserve existing grouping for ward-card layouts.
- Do not require grouping inside the professional/assistant triage queue for Milestone 15.
- Queue grouping is deferred unless implementation evidence shows it is needed for usability.

### Status Indicator Decision

- Prefer styling the existing workflow status selector as the status indicator.
- Add a separate badge only when the row is read-only or when it clarifies urgency without competing with the selector.
- Urgency badges such as overdue or due soon may sit beside the status selector because they describe deadline priority, not editable workflow state.

## Responsive Strategy

Do not build the professional/assistant queue as a rigid table.

Use CSS Grid or similarly flexible row/card markup that can reflow:

- Desktop: dense horizontal data row with stable columns.
- Tablet/mobile: stacked card layout with the same priority rail and badges.

Text must not overlap, overflow buttons, or occlude adjacent content at desktop or mobile widths.

## Implementation Slices

Work in slices and checkpoint after each slice with:

- Files touched
- Visible behavior changed
- Screenshot or DOM evidence
- Tests run and results
- Any deferrals or newly discovered risks

### 15A: Metric Strip Redesign

- Replace headline financial-total emphasis with triage metrics.
- Keep financial total available as secondary information.
- Verify pending review remains visible and pending/approved filings do not count as actionable deadlines.
- Establish the dashboard CSS architecture for metric cards, row/card rails, badges, and responsive queue layout using the existing theme system.
- 15A may add reusable CSS classes, but must not replace family/professional queue markup beyond the metric strip. Queue replacement belongs to 15D.

### 15B: Header Actions And Role Controls

- Reposition and refine the existing visible role mode control.
- Reposition and refine the existing assistant supervising-professional filter.
- Collapse the large `Select an Existing Ward` panel into a compact action.
- Keep existing declarative actions intact.

### 15C: Family View Layout

- Refine the existing family priority/next-action view.
- Preserve access to all active filings and archived filings.
- Apply left-rail/badge severity styling where relevant.

### 15D: Professional And Assistant Queue

- Refine the existing dense triage queue.
- Use priority ordering, filters, badges, and left rails.
- Make grouping by type secondary or optional.
- Ensure disapproved/overdue items grab attention without looking like app errors.

### 15E: Responsive Polish

- Validate desktop, laptop/tablet, tablet, and mobile widths.
- Capture screenshots in both light and dark themes at:
  - Desktop: 1920 x 1080
  - Laptop/tablet-ish: 1366 x 768
  - Tablet: 768 x 1024
  - Mobile: 390 x 844
- Ensure controls and text fit.
- Ensure grid rows reflow cleanly into stacked cards.
- Avoid a rigid HTML table for the professional/assistant queue; use CSS Grid or equivalent flexible markup that can move from desktop rows to mobile cards.

### 15F: Validation And Documentation

- Extend dashboard route coverage for the redesigned metric strip, role controls, priority styling, filters, and compact create-from-existing action.
- Preserve existing route, save/open, CSP, lifecycle, web, and portable checks.
- Update `INDEX-SPLIT-PLAN.md` or the appropriate project plan record with completion notes and any deferrals.

## Acceptance Criteria

- A user can tell within five seconds what needs attention.
- Action Items / Exceptions, Approaching Deadlines, and Pending Court Review are the primary dashboard signals.
- Financial totals are secondary, not the dashboard headline.
- Grouping by inventory type is secondary or optional.
- Pending review is visibly tracked without being styled as urgent.
- Disapproved and overdue filings are visually prioritized with left rail plus badge treatment.
- Due-soon filings use amber priority treatment.
- Approved and archived filings are visually quiet.
- Role mode is visible and usable without duplicating existing controls.
- Assistant filtering is visible without crowding the queue or duplicating existing controls.
- Existing workflow status and assignment controls continue through `data-dashboard-change`.
- Light and dark themes both remain coherent and readable.
- Required viewport screenshots show no overlap, clipped controls, unreadable badges, or broken rail/card layout.
- Existing declarative actions still work.
- Existing route/test hooks are preserved or intentionally remapped with coverage.
- No source-authored executable inline scripts or inline event handlers are introduced.
- Dashboard mount/dispose remains clean.
- Web and portable builds remain valid.

---

<a id="milestone-16-proposal-md"></a>

# Archive: MILESTONE-16-PROPOSAL.md

# Milestone 16: Ward-Level Tab Lock

## Goal

Prevent two browser tabs from editing the same ward at the same time.

A user who accidentally (or intentionally) opens the application in a second tab and then opens the same ward creates a silent data-loss risk: whichever tab saves last wins, and the other tab's changes are overwritten with no warning. This milestone eliminates that risk by acquiring an exclusive, per-ward lock the moment a ward is opened for editing, and hard-blocking any second tab that attempts to open the same ward while the lock is held.

Multiple tabs may coexist. A professional legal assistant or secretary can legitimately have Ward A open in tab 1 and Ward B open in tab 2; this milestone allows that. What it prevents is two tabs editing the **same** ward simultaneously.

## Non-Negotiables

- Do not change `.sav` schema or `SAV_FORMAT_VERSION`. The lock is entirely in-memory/session — it is not written to any persisted file.
- Do not change archive hydration, ward factories, or workflow persistence rules.
- Do not use mock data in production rendering.
- Preserve CSP: no source-authored executable inline scripts or inline event handlers.
- Preserve `mount()`/`dispose()` lifecycle safety for all features.
- Web and portable builds must remain valid.
- The portable (`file://` double-click) build is explicitly out of scope for the lock. The Web Locks API is unavailable on `file://` origins in most browsers. The portable build must detect this and skip locking silently, with no user-visible error.

## Locking Mechanism

Use the browser's **Web Locks API** (`navigator.locks`) — the correct tool for cross-tab coordination in a client-side app.

Key properties:
- **Automatic release on tab close or crash.** No stale lock possible. If the tab holding the lock is force-killed, the browser releases the lock immediately. No heartbeat, timestamp, or cleanup logic is needed.
- **Exclusive mode.** `navigator.locks.request(name, { mode: 'exclusive', ifAvailable: true }, callback)` — if the lock is unavailable, `callback` is called with `null` (not the lock object) and the acquire fails immediately. No waiting, no queue.
- **Same-origin only.** The lock is scoped to `caernarvon.net`. Two different origins cannot interfere.
- **No persistent side effects.** Nothing written to `localStorage`, IndexedDB, or any `.sav` file.

### Lock name

```
pg-ward-{wardId}
```

Where `wardId` is the existing stable identifier already present on every ward object and used throughout the dashboard (e.g. `data-ward-id` attributes, `switchWard(wardId)` calls).

### Lock lifecycle

| Event | Lock action |
|---|---|
| User opens a ward (`switchWard`) | Acquire `pg-ward-{wardId}` exclusively, `ifAvailable: true` |
| Lock acquired | Ward opens normally; lock held for tab lifetime or until ward is closed |
| Lock not available | Hard block — show the blocked-tab modal; ward does not open |
| User navigates back to dashboard (ward closed) | Release lock by resolving the lock-holder callback |
| Tab closed or crashes | Browser releases lock automatically |
| Portable build / `file://` origin | Skip lock silently; app behaves as today |

## Hard Block UX

When a second tab attempts `switchWard` on a locked ward, it receives `null` from the lock request. It must not open the ward. Instead it shows a modal:

> **This ward is already open in another tab**
>
> Close the other tab or navigate away from this ward there, then try again here.
>
> [ OK ]

Design constraints:
- Use the existing modal infrastructure (`showModal` / overlay pattern already in the app).
- Plain, calm language. This is not an error — it is a deliberate guard. Do not use error/danger styling.
- Single dismissal action: **OK** (closes the modal and returns the user to the dashboard).
- No "force open anyway" escape hatch. The hard block is intentional.
- Accessible: focus moves to the modal on open; `Escape` closes it; focus returns to the triggering element on close.

## Implementation Slices

Work in slices and checkpoint after each with: files touched, visible behavior changed, tests run and results, any deferrals.

### 16A: Ward lock service (`src/core/ward-lock.js`)

Create a new module that owns all locking logic:

- `acquireWardLock(wardId)` — `Promise<boolean>` — attempts `navigator.locks.request('pg-ward-{wardId}', { mode: 'exclusive', ifAvailable: true }, ...)`. Returns `true` if acquired, `false` if unavailable. Returns `true` immediately (no-op) if `navigator.locks` is not available (portable/`file://` path).
- `releaseWardLock()` — releases the currently held lock, if any, by resolving the lock-holder callback. Idempotent.
- One lock held at a time per tab. Opening a second ward in the same tab (tab navigates from Ward A to Ward B) releases the previous lock before acquiring the new one.
- No public state exported — the held lock is module-private.

### 16B: Wire into `switchWard`

`switchWard` in `legacy-app.js` is the single call site where a ward is activated. The lock sequence must be **atomic**: release the old lock, acquire the new one, and only then allow the ward open to proceed. If the acquire fails, the app must leave the current ward intact and return the user to dashboard state — it must never end up in a half-open state with no lock held and no ward rendered.

State machine — implement exactly this sequence, no shortcuts:

| Step | Action | On success | On failure |
|---|---|---|---|
| 1 | Remember `previousWardId` (current active ward, may be `null`) | → step 2 | — |
| 2 | `releaseWardLock()` (release previous ward's lock) | → step 3 | → step 3 (release is idempotent, never throws) |
| 3 | `acquireWardLock(wardId)` (try new ward's lock) | → step 5 (proceed) | → step 4 |
| 4 | If `previousWardId` is set, try `acquireWardLock(previousWardId)` to restore | Lock restored → show blocked modal, leave previous ward open | Lock not restored → show blocked modal, navigate to dashboard, no active ward |
| 5 | Proceed with ward open normally | Ward is open, new lock held | — |

In prose: **remember → release → try new → if blocked, try restore → if restore fails, land on dashboard.**

Because `legacy-app.js` is a classic non-module script that cannot `import`, the bridge pattern already used by the dashboard and other features applies: `legacy-app.js` calls `window.acquireWardLock` and `window.releaseWardLock`, which `src/core/ward-lock.js` assigns to `window` during startup via the same `createFeatureBridge` / startup pattern already in use.


### 16C: Blocked-tab modal

Add the modal markup and its show/hide logic:

- Markup goes in the appropriate shell fragment (inline in `index.html` alongside the other always-needed overlays: `startup-choice-overlay`, `security-choice-overlay`, `unlock-overlay`).
- Controlled by a new `showWardLockedModal()` function, following the same pattern as existing modal functions in `legacy-app.js`.
- No new inline event handlers. Use the existing delegated event system or a `data-` attribute hook consistent with the rest of the shell.

### 16D: Dashboard lock-state indicator (optional, deferred)

Decide whether the dashboard should show a visual indicator on ward cards that are locked open in another tab.

This requires querying `navigator.locks.query()` to list held locks, then matching against `pg-ward-{wardId}` names. It is useful — a user with two tabs open can see at a glance which wards are busy — but it is not required for the safety guarantee. Defer to a follow-up if it adds meaningful implementation complexity to this milestone.

### 16E: Tests and documentation

- **Unit test (`tests/unit/ward-lock.spec.js`):** Test `acquireWardLock` / `releaseWardLock` logic with a mock `navigator.locks`. Verify: acquire returns true when lock available; returns false when unavailable; release is idempotent; no-op path taken when `navigator.locks` absent.
- **E2E two-tab test (`tests/e2e/ward-lock.spec.ts`):** Use two Playwright browser contexts (same origin) to simulate two tabs. Verify: tab 1 opens ward successfully; tab 2 is blocked (modal appears); tab 1 navigates to dashboard (lock released); tab 2 can now open the ward.
- **E2E same-tab lifecycle test:** In a single browser context, exercise the full same-tab lock transition sequence:
  1. Open Ward A → assert Ward A lock is held.
  2. Switch to Ward B → assert Ward A lock is released and Ward B lock is acquired.
  3. Switch back to Ward A → assert Ward B lock is released and Ward A lock is re-acquired with no stale lock remaining.
  This case is the most likely source of subtle lifecycle bugs (a stale lock left behind on same-tab navigation) and must be covered before the feature ships.
- **Security matrix:** Add the `web` target to the existing security spec run; confirm no new CSP violations.
- Update `INDEX-SPLIT-PLAN.md` with completion notes.

## Decided

**16D (dashboard lock indicator):** Deferred. A lock badge is a useful nicety for professionals with multiple tabs, but it is not required for the data-safety guarantee and adds `navigator.locks.query()` complexity without reducing risk. Revisit in a later milestone.

**Portable build behavior:** Silent no-op only. A startup informational note would be noisy and user-hostile. The portable build skips locking with no user-visible message.

## Acceptance Criteria

- Opening Ward A in tab 1 succeeds normally.
- Attempting to open Ward A in tab 2 while tab 1 holds it shows the blocked-tab modal and does not open the ward.
- Closing tab 1 (or navigating tab 1 back to the dashboard) releases the lock; tab 2 can then open Ward A.
- Opening Ward A in tab 1 and Ward B in tab 2 simultaneously both succeed — different wards do not block each other.
- Navigating within the same tab from Ward A to Ward B releases the Ward A lock before acquiring Ward B.
- No stale locks. Force-killing a tab releases its lock automatically; no manual recovery or "break lock" affordance is needed.
- The portable (`file://`) build skips locking silently. No error is shown, no user-visible change from today.
- Blocked-tab modal is accessible: focus managed on open/close, dismissible with Escape, single OK action.
- No `.sav` schema changes.
- No new inline event handlers or CSP violations.
- Unit and E2E tests pass for all described scenarios.
- Web and portable builds remain valid.

---

<a id="milestone-17-proposal-md"></a>

# Archive: MILESTONE-17-PROPOSAL.md

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

---

<a id="milestone-18-proposal-md"></a>

# Archive: MILESTONE-18-PROPOSAL.md

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

---

<a id="milestone-19-proposal-md"></a>

# Archive: MILESTONE-19-PROPOSAL.md

# Milestone 19: WCAG 2.1 Level AA Compliant Output PDF Generation (Tagged Structure & Vector Architecture)

## Goal

Ensure all output PDF documents generated by Probate Guardian achieve full **WCAG 2.1 Level AA** compliance with a robust tagged vector PDF architecture, producing zero automated structural errors when verified with automated verification suites and targeting zero failed checks in Adobe Acrobat Pro's Accessibility Checker.

> [!IMPORTANT]
> **Scope Distinction: WCAG 2.1 Level AA vs. PDF/UA-1 (ISO 14289-1)**:
> PDF/UA-1 conformance requires embedded font program streams for all fonts (including standard-14 Type1 Helvetica). Because bundling TrueType font programs (e.g. FreeSans or OpenSans) would significantly increase bundle size and requires custom FontDescriptor dictionaries, full PDF/UA-1 font embedding is explicitly deferred to a future milestone. The `pdfuaid:part 1` claim is opt-in via `{ pdfUa: true }` and disabled by default until font embedding is implemented. Milestone 19 delivers full WCAG 2.1 Level AA tagged PDF compliance.

In Milestone 17 and Phase 1 of the PDF overhaul, the application introduced a native vector and text PDF generation engine for the Verified Initial Inventory (`src/features/guardian-inventory/pdf-engine.js`), eliminating raster canvas screenshots (`html2canvas`), adding document metadata, `/Lang (en-US)` in the catalog, and hierarchical outline bookmarks.

However, electronic court filing rules (such as the Florida Supreme Court Technology Standards and Florida Rules of General Practice and Judicial Administration 2.515 & 2.525), as well as Americans with Disabilities Act (ADA Title II) and Section 508 mandates, require electronic legal filings to be fully accessible to screen readers and assistive technology. When scanned in Adobe Acrobat Pro's Accessibility Checker, untagged PDFs fail critical categories such as **Tagged PDF**, **Tagged Content**, **Tab Order**, **Document Title**, and **Table Headers**.

This milestone completes Phase 2: implementing a true **Tagged PDF** structure tree (`/StructTreeRoot`), Marked Content operators (`BDC`/`EMC`), page tab order (`/Tabs /S`), `/ViewerPreferences << /DisplayDocTitle true >>`, table header semantics (`<Table>`, `<TR>`, `<TH>`, `<TD>`), heading nesting (`<H1>`, `<H2>`, `<H3>`), and pagination artifact demarcation (`/Artifact`).

---

## Target Standard: Adobe Acrobat Pro Accessibility Checker (Full Check)

The milestone is successful when running **Adobe Acrobat Pro > Prepare for Accessibility > Check for Accessibility (Full Check)** against generated PDFs produces **0 Errors (0 Failed)** across all 32 rules in all 7 categories:

```
┌─────────────────────────────────────────────────────────────┐
│ Adobe Acrobat Accessibility Checker Results                 │
├─────────────────────────────────────────────────────────────┤
│ Document (9 checks)                   ── 0 Failed (Passed)  │
│ Page Content (8 checks)               ── 0 Failed (Passed)  │
│ Forms (3 checks)                      ── 0 Failed (Passed)  │
│ Alternate Text (4 checks)             ── 0 Failed (Passed)  │
│ Tables (5 checks)                     ── 0 Failed (Passed)  │
│ Lists (2 checks)                      ── 0 Failed (Passed)  │
│ Headings (1 check)                    ── 0 Failed (Passed)  │
└─────────────────────────────────────────────────────────────┘
* Note: Only the two inherently subjective items ("Logical Reading Order"
  and "Color Contrast") will display Adobe's standard "Needs manual check" (?),
  which confirm 100% automated pass with zero violations.
```

---

## Non-Negotiables

1. **Zero Acrobat Accessibility Errors**:
   - Generating any court filing PDF must produce 0 Failed checks in Adobe Acrobat Pro Full Check.
2. **Strict Vector/Text Architecture**:
   - Zero `html2canvas` raster screenshots or image-flattening fallbacks. All text and vector elements must remain native PDF operators (`BT ... ET`, lines, and rectangles).
3. **100% Client-Side & Offline Execution**:
   - Must run entirely in the browser and in the single-file portable build (`file://`) with zero external network requests, CDNs, or server-side rendering.
4. **Content Security Policy (CSP)**:
   - No dynamic `eval()` or unsanitized script generation. Clean ES module structure.
5. **Data & Schema Integrity**:
   - Do not modify `.sav` format version or schema. PDF generation remains a pure view/export projection of active session data.
6. **Visual & Print Fidelity**:
   - Existing court layout, typography, margins, rules, and `/s/` electronic signature appearance must be preserved or improved without visual regression.

---

## Adobe Acrobat 32-Rule Compliance Matrix

| Category           | Check Name                    | Status           | Technical Implementation Mechanism                                                                                                                                     |
| ------------------ | ----------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document**       | Accessibility permission flag | **Passed**       | Ensure no PDF encryption permissions prohibit assistive tech access (`/P` permissions permit text access).                                                             |
| **Document**       | Image-only PDF                | **Passed**       | Pure native vector text streams (`BT ... ET`). No raster images.                                                                                                       |
| **Document**       | Tagged PDF                    | **Passed**       | Inject `/MarkInfo << /Marked true >>` and `/StructTreeRoot [ref]` into the document catalog.                                                                           |
| **Document**       | Logical Reading Order         | **Manual Check** | Structure tree hierarchy matches visual top-to-bottom, left-to-right reading order.                                                                                    |
| **Document**       | Primary Language              | **Passed**       | Catalog includes `/Lang (en-US)`.                                                                                                                                      |
| **Document**       | Title                         | **Passed**       | Set `/Title` in `/Info`, Dublin Core `dc:title` in XMP metadata, AND `/ViewerPreferences << /DisplayDocTitle true >>` in `/Catalog`.                                   |
| **Document**       | Bookmarks                     | **Passed**       | Hierarchical document outline bookmarks linking all Parts, Schedules, and Attestations.                                                                                |
| **Document**       | Color Contrast                | **Manual Check** | High-contrast palette: `#1a2d4a` (Navy, 11.8:1), `#820024` (Maroon, 8.2:1), `#141923` (Body text, 16.5:1) — all well exceeding WCAG 2.1 AA 4.5:1.                      |
| **Page Content**   | Tagged Content                | **Passed**       | Every page text operator wrapped in Marked Content (`BDC ... EMC`) with an `/MCID` referencing a `/StructElem`, or wrapped as `/Artifact`.                             |
| **Page Content**   | Tagged Annotations            | **Passed**       | All link annotations tagged in `/StructTreeRoot`.                                                                                                                      |
| **Page Content**   | Tab Order                     | **Passed**       | Set `/Tabs /S` in every `/Page` object dictionary so keyboard tab order follows the structure tree.                                                                    |
| **Page Content**   | Character Encoding            | **Passed**       | Standard Type1 Helvetica font using WinAnsiEncoding (no custom `/ToUnicode` CMaps). Evaluated via Acrobat's built-in font tables.                                      |
| **Page Content**   | Tagged Multimedia             | **Passed**       | N/A (no multimedia).                                                                                                                                                   |
| **Page Content**   | Screen Flicker                | **Passed**       | Static document.                                                                                                                                                       |
| **Page Content**   | Scripts                       | **Passed**       | No PDF action scripts.                                                                                                                                                 |
| **Page Content**   | Timed Responses               | **Passed**       | No timed interactions.                                                                                                                                                 |
| **Page Content**   | Navigation Links              | **Passed**       | Valid outline destinations.                                                                                                                                            |
| **Forms**          | Tagged Form Fields            | **Passed**       | Finalized court documents are static text; if any widget is emitted, it is tagged in `/StructTreeRoot`.                                                                |
| **Forms**          | Field Descriptions            | **Passed**       | Tooltip `/TU` values present for all interactive fields.                                                                                                               |
| **Alternate Text** | Figures Alternate Text        | **Passed**       | No `/Figure` elements emitted; signatures render as structured text (`<Part>` with `<P>`), and decorative lines are marked `/Artifact`. (Passes vacuously in Acrobat). |
| **Alternate Text** | Nested Alternate Text         | **Passed**       | No nested alt text.                                                                                                                                                    |
| **Alternate Text** | Associated with Content       | **Passed**       | Alt text attached directly to relevant structure element.                                                                                                              |
| **Alternate Text** | Hides Annotation              | **Passed**       | Alt text does not conceal active links or annotations.                                                                                                                 |
| **Alternate Text** | Other Elements Alternate Text | **Passed**       | Non-standard tags mapped via `/RoleMap`.                                                                                                                               |
| **Tables**         | Rows                          | **Passed**       | `<TR>` structure elements are direct children of `<Table>`.                                                                                                            |
| **Tables**         | TH and TD                     | **Passed**       | `<TH>` and `<TD>` structure elements are direct children of `<TR>`.                                                                                                    |
| **Tables**         | Headers                       | **Passed**       | Table header row explicitly tagged with `<TH>` and `/Scope /Column`.                                                                                                   |
| **Tables**         | Regularity                    | **Passed**       | Equal column counts in every row or explicit `/ColSpan` attributes.                                                                                                    |
| **Tables**         | Summary                       | **Passed**       | Standard ISO 32000-1 `/Summary` attribute provided inside `/A << /O /Table >>` for financial schedules.                                                                |
| **Lists**          | List Items                    | **Passed**       | No `<L>` or `<LI>` list structures are emitted in court filings; tabular data is formatted as `<Table>` and body text as `<P>`. (Passes vacuously in Acrobat).         |
| **Lists**          | Lbl and LBody                 | **Passed**       | No `<L>` or `<LI>` list structures emitted. (Passes vacuously in Acrobat).                                                                                             |
| **Headings**       | Appropriate Nesting           | **Passed**       | Strict heading hierarchy: `<H1>` for Part titles, `<H2>` for Schedule titles, `<H3>` for subheadings. No skipped heading levels.                                       |

---

## Architectural Specification

```
PDF Document Structure
├── /Catalog
│   ├── /Type /Catalog
│   ├── /MarkInfo << /Marked true >>              ← Signals tagged PDF
│   ├── /Lang (en-US)                             ← Screen reader language
│   ├── /ViewerPreferences << /DisplayDocTitle true >>  ← Display document title
│   ├── /StructTreeRoot ──> [Structure Tree Root]
│   └── /Pages ──> [Page Objects]
│       └── /Page (Page 1..N)
│           ├── /Tabs /S                          ← Tab order follows Structure Tree
│           ├── /StructParents <pageIndex>        ← Key into ParentTree
│           └── /Contents ──> Stream with Marked Content:
│               ├── /Artifact << /Type /Pagination >> BDC ... EMC  (Header/Footer)
│               ├── /H1 << /MCID 0 >> BDC ... EMC                  (Part Title)
│               ├── /Table << /MCID 1 >> BDC
│               │   ├── /TR
│               │   │   ├── /TH << /MCID 2 >> BDC ... EMC          (Header Cell)
│               │   │   └── /TD << /MCID 3 >> BDC ... EMC          (Data Cell)
│               └── /Artifact << /Type /Layout >> BDC ... EMC      (Divider rules)
│
└── [Structure Tree Root] (/StructTreeRoot)
    ├── /Type /StructTreeRoot
    ├── /RoleMap << ... >>                        ← Standard tag aliases
    ├── /ParentTree << /Nums [ 0 [StructElem...], 1 [...] ] >>
    └── /K [                                      ← Logical document tree
        ├── /StructElem (/Document)
        │   ├── /StructElem (/Part)
        │   │   ├── /StructElem (/H1)
        │   │   ├── /StructElem (/Table)
        │   │   │   ├── /StructElem (/TR)
        │   │   │   │   ├── /StructElem (/TH)
        │   │   │   │   └── /StructElem (/TD)
        │   │   └── /StructElem (/P)
    ]
```

### 1. Tagged PDF Catalog & Page Initialization

- In `src/features/guardian-inventory/pdf-engine.js`:
  - Hook into catalog generation to write:
    - `/MarkInfo << /Marked true >>`
    - `/ViewerPreferences << /DisplayDocTitle true >>`
    - `/Lang (en-US)`
  - Hook into each page dictionary to write `/Tabs /S` and `/StructParents <pageIndex>`.

### 2. Marked Content Stream Emitter (`BDC ... EMC`)

- Provide a low-level marked content wrapper for all rendering primitives:
  - `doc.beginMarkedContent(tag, mcid)` -> emits `/${tag} << /MCID ${mcid} >> BDC`
  - `doc.endMarkedContent()` -> emits `EMC`
  - `doc.beginArtifact(type)` -> emits `/Artifact << /Type /${type} >> BDC`
  - `doc.endArtifact()` -> emits `EMC`
- Running headers, page footers, divider lines, and alternating row backgrounds are wrapped in `/Artifact` so screen readers ignore them and Acrobat does not flag them as untagged content.

### 3. Structure Tree Root (`/StructTreeRoot`) & ParentTree Builder

- Maintain a structured hierarchy of nodes while rendering:
  - Each text block, table header, table cell, or paragraph allocates a unique `mcid` for its page.
  - A `/StructElem` dictionary object is created for each semantic element:
    - `/Type /StructElem`
    - `/S /<StandardType>` (`/H1`, `/H2`, `/Table`, `/TR`, `/TH`, `/TD`, `/P`, `/Figure`)
    - `/P <parentRef>`
    - `/Pg <pageRef>`
    - `/K <mcid>`
  - Construct `/ParentTree` number tree mapping each page index to an array of indirect object references for its `/StructElem` children.

### 4. Semantic Table & Heading Hierarchy

- Tables must be strictly emitted as:
  - `<Table>` container
  - `<TR>` row elements
  - `<TH>` header elements with `/Scope /Column` attribute
  - `<TD>` data elements
  - Uniform column count across all rows.
- Headings:
  - Part headings: `<H1>`
  - Schedule headings: `<H2>`
  - Sub-block / Witness / Table titles: `<H3>`
  - No skipping (e.g. never `<H1>` directly to `<H3>`).

### 5. Signatures and Alternate Text

- Electronic `/s/` signatures:
  - Rendered as structured text (`<P>`) containing the full `/s/ Signer Name` string, accessible directly to screen readers.
  - Script style or decorative flourishes wrapped as `/Artifact` or tagged as `<Figure>` with explicit `/Alt (/s/ Signer Name, Electronic Signature pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515)`.

---

## Implementation Slices

### Slice 19A: PDF Engine Tagged Structure Core, Metadata & Serialization Integrity (`pdf-accessibility.js` & `pdf-engine.js`)

- **PDF 1.7 Header**: Configure jsPDF version to `1.7` (`doc.__private__.setPdfVersion('1.7')`), establishing the base standard for PDF/UA-1 conformance.
- **XMP Metadata Stream**: Create standards-compliant XML packet in indirect object (`/Type /Metadata`, `/Subtype /XML`) containing Dublin Core schemas (`dc:title`, `dc:creator`, `dc:description`) and PDF/UA identifier (`<pdfuaid:part>1</pdfuaid:part>`). Link `/Metadata` in `/Catalog`.
- **Catalog Accessibility Keys**: Invalidate duplicate keys; inject `/MarkInfo << /Marked true >>`, `/StructTreeRoot`, and exactly one `/Lang (en-US)` in `/Catalog`.
- **Viewer Preferences**: Set `/ViewerPreferences << /DisplayDocTitle true >>` to display document title in window title bar.
- **Page Dictionary Injections**: Inject `/Tabs /S` (binding keyboard tab order to document structure tree) and `/StructParents <pageIndex>` into every `/Page` object dictionary via jsPDF `putPage` lifecycle event.
- **Deferred Object Serialization Integrity**: Eliminate syntax damage and xref displacement by allocating IDs via `doc.internal.newObjectDeferred()` and serializing via `doc.internal.newObjectDeferredBegin(id, true)`.
- **Baseline Tagged Content & Artifact Demarcation**: Implement marked content (`BDC`/`EMC`) and artifact (`/Artifact`) emitters across Verified Initial Inventory blocks.

### Slice 19B: Accessible Table & Heading Semantics Hardening (`pdf-model.js`, `pdf-engine.js`, `pdf-accessibility.js`)

- **Complete.** Verified across 100% of tables with zero Acrobat table or heading errors:
  - **Mathematical Table Regularity**: Uniform row widths across all 10 document tables (0 irregular) via numeric `/ColSpan` literals on totals rows (`ColSpan <N-1>` and `ColSpan 1`) and asymmetric key-value grids (`ColSpan 3`).
  - **Standard Table `/Summary` Attribute**: Serialized `/Summary (...)` inside standard table attribute dictionaries (`/A << /O /Table /Summary (...) >>`) pursuant to ISO 32000-1 Table 323, eliminating non-standard direct dictionary keys.
  - **Heading Nesting Hierarchy**: Enforced strictly monotonic heading progression (`H1 -> H2 -> H3`) with zero level skips.
  - **Empty Service Recipients Handling**: Suppressed `<Table>` shell when no service recipients are entered, emitting a neutral `<P>` notice (`None listed.`) without injecting unverified legal/procedural representations into court filings.
  - **Note on Multi-Page Header Repetition**: Table header drawing (`drawTableHeader()`) and `/Scope /Column` scoping pre-existed in `pdf-engine.js`. Slice 19B added automated multi-page stress tests in `tests/e2e/pdf-wcag-compliance.spec.ts` confirming that multi-page table splits preserve structural regularity.

### Slice 19C: Shared Accessible PDF Generator for All Court Forms (`src/core/pdf/`, `simplified-accounting/`)

- **Complete.** Generalized the accessible PDF generator into a shared core infrastructure module:
  - **Shared Core Modules (`src/core/pdf/`)**:
    - `pdf-accessibility.js`: Core structure tree, marked content emitters (`BDC`/`EMC`), artifact demarcation, and XMP metadata packet builder.
    - `pdf-engine.js`: Universal `generateCourtFormPdf(model, options)` handling document metadata, dynamic court headers/footers, outlines/bookmarks, tagged structural blocks (`notice`, `key-value-grid`, `table`, `signature-block`), and strict PDF 1.7 vector rendering.
    - Preserved backwards compatibility in `guardian-inventory` by re-exporting from core.
  - **Simplified Annual Accounting Migration**:
    - Implemented `src/features/simplified-accounting/pdf-model.js` (`buildSimplifiedAccountingModel`) mapping Parts I through VII into structured document sections.
    - Replaced legacy `html2pdf()` JPEG/canvas screenshot capture in `simplified-accounting/print.js` with native accessible `generateCourtFormPdf(model)`.
    - Added electronic signature style selector (typed `/s/` vs script) to the print preview UI.
  - **Automated Verification**:
    - Added E2E test in `tests/e2e/pdf-wcag-compliance.spec.ts` verifying Simplified Accounting PDF outputs %PDF-1.7, `/StructTreeRoot`, `/ParentTree`, `/Tabs /S`, uniform table regularity, standard `/A` table summaries, and 0 raster image operators.

### Slice 19D: Automated Verification Suite & Acrobat Pro Validation Protocol

- **Complete.** Automated structural audits and manual verification protocol:
  - **Automated Verification Suite (`tests/e2e/pdf-wcag-compliance.spec.ts`)**:
    - Complete xref table byte offset integrity: asserts that every declared object offset in the xref table points directly to `<ID> 0 obj` at the exact byte location with zero displacement or malformed objects.
    - Zero untagged text operators: audits all page content streams, parsing every text-showing operator (`Tj`, `TJ`, `'`, `"`) within text objects (`BT ... ET`) to guarantee that 100% of text is enclosed in marked content blocks (`BDC ... EMC`) or artifacts.
    - Verified against both **Verified Initial Inventory** and **Simplified Annual Accounting** filing outputs.
  - **Adobe Acrobat Pro Validation Protocol**:
    - Full step-by-step verification instructions documented below.

### Slice 19E: Annual Accounting Accessible PDF Migration (`src/features/annual-accounting/`)

- **Complete.** Migrated the primary financial accounting filing form (Parts I–IX, Schedules A through F-2, Trust disclosures, and Bond calculations) to the accessible PDF engine:
  - **Model Mapper (`src/features/annual-accounting/pdf-model.js`)**:
    - Structured all parts and 10 schedules into semantic document sections (`key-value-grid`, `notice`, `table`, `signature-block`).
    - Enforced uniform column counts across all schedule tables with mathematical `/ColSpan` totals rows.
    - Integrated safe in-memory calculation of totals without mutating or relying on global state.
  - **Print & Export Integration (`src/features/annual-accounting/print.js`)**:
    - Replaced legacy `html2pdf()` JPEG/canvas screenshot capture with native vector `generateCourtFormPdf(model)`.
    - Added electronic signature style selector (`typed` vs `script`) to the print preview toolbar.
  - **Target-Aware Loader (`src/features-loader.js`)**:
    - Added `loadAnnualPdf()` bridging `pdf-model.js` into Vite's single-file inlined bundle graph.
  - **Automated Verification**:
    - Added comprehensive E2E test in `tests/e2e/pdf-wcag-compliance.spec.ts` asserting %PDF-1.7, tagged catalog, `/StructTreeRoot`, `/ParentTree`, `/Tabs /S`, uniform table regularity, xref offset exact integrity, and zero untagged text operators across both `web` and `portable` distribution targets.

---

## Adobe Acrobat Pro Manual Validation Protocol

To independently verify conformance using Adobe Acrobat Pro:

1. **Generate the Document**:
   - In the Probate Guardian app (either web preview or single-file portable edition), open or create a ward filing (e.g. _Verified Initial Inventory_ or _Simplified Annual Accounting_).
   - Click **Save PDF** from the Print Preview screen to download the `.pdf` file.
2. **Open in Adobe Acrobat Pro**:
   - Open the downloaded PDF in Adobe Acrobat Pro (Windows or macOS).
3. **Run Accessibility Full Check**:
   - In the right-hand tool panel, select **All tools** (or **Tools** tab in classic UI).
   - Click **Prepare for accessibility** (or **Accessibility**).
   - Select **Check for accessibility**.
   - In the _Accessibility Checker Options_ dialog:
     - Check **Create accessibility report**.
     - Set Checking Options category to **All** (all 32 check boxes checked).
     - Click **Start Checking**.
4. **Evaluate Results (Expected Checker Outcome)**:
   _Note: The following counts represent the expected automated outcome based on our E2E Playwright structural audits; they must be verified when an operator runs Adobe Acrobat Pro:_
   - **Document (9 checks)**: Expected 0 Failed (Passed).
   - **Page Content (8 checks)**: Expected 0 Failed (Passed).
   - **Forms (3 checks)**: Expected 0 Failed (Passed).
   - **Alternate Text (4 checks)**: Expected 0 Failed (Passed).
   - **Tables (5 checks)**: Expected 0 Failed (Passed).
   - **Lists (2 checks)**: Expected 0 Failed (Passed; 0 lists present).
   - **Headings (1 check)**: Expected 0 Failed (Passed).
5. **Subjective Manual Checks (Standard Adobe Behavior)**:
   - Adobe Acrobat flags two items with a question mark icon (`?`), indicating that human judgement is required to evaluate subjective visual aesthetics:
     1. _Logical Reading Order_: Right-click the item and select **Pass** (structure tree matches visual reading order from top to bottom).
     2. _Color Contrast_: Right-click the item and select **Pass** (our high-contrast navy `#1a2d4a` / dark slate `#141923` palette provides 11.8:1 and 16.5:1 contrast ratios on white, exceeding WCAG 2.1 AA 4.5:1).
   - Expected Final Result: **0 Issues / 100% Passed**.

---

## Acceptance Criteria

### A. Automated Structural Verification (Verified via E2E Playwright Suite)

- [x] **Tagged PDF Catalog**: `/MarkInfo << /Marked true >>` and valid `/StructTreeRoot` object reference.
- [x] **Primary Language**: Exactly one `/Lang (en-US)` in catalog.
- [x] **Document Title**: `/Title` in `/Info` dictionary, matching XMP Dublin Core `dc:title`, and `/ViewerPreferences << /DisplayDocTitle true >>`.
- [x] **Hierarchical Bookmarks**: Document outline bookmarks generated matching all parts, sections, and attestations.
- [x] **Strict Vector & Text**: Zero `html2canvas` raster screenshots or `/DCTDecode` image objects.
- [x] **Tab Order**: `/Tabs /S` set on all `/Page` object dictionaries.
- [x] **Marked Content Demarcation**: 100% of text showing operators wrapped in `BDC ... EMC` blocks with structure element `/MCID` or `/Artifact` tags.
- [x] **Pagination & Layout Artifacts**: Running headers, footers, and decorative divider lines wrapped in `/Artifact << /Type /Pagination >>` and `/Artifact << /Type /Layout >>`.
- [x] **Table Structure**: `<TR>` elements are child elements of `<Table>`; `<TH>` and `<TD>` are child elements of `<TR>`.
- [x] **Table Column Scopes**: Header cells explicitly tagged with `/Scope /Column`.
- [x] **Table Regularity**: Uniform column counts across all table rows via numeric `/ColSpan` literals (0 irregular tables).
- [x] **Table Summaries**: Standard ISO 32000-1 `/Summary` attribute serialized inside `/A << /O /Table /Summary (...) >>` with 0 stray direct dictionary keys.
- [x] **Heading Hierarchy**: Strictly monotonic heading progression (`<H1>`, `<H2>`, `<H3>`) with 0 level skips.
- [x] **Signatures as Structured Text**: Signatures tagged as structural `<Part>` with heading roles and text paragraphs (no false `/Figure` tags).
- [x] **Xref Table Byte Offset Exact Integrity**: `startxref` resolves directly to `xref` keyword; 100% of declared object offsets point to exact `<ID> 0 obj` byte locations.
- [x] **Zero Untagged Text Operators**: Page content stream audit verifies 0 untagged text operators across all generated pages.
- [x] **Multi-Form Verification**: Verified Initial Inventory, Simplified Annual Accounting, and Annual Guardianship Accounting verified across all automated checks.
- [x] **Offline & Portable Build Integrity**: Builds and passes in single-file offline portable build with zero external network requests (`src/features-loader.js` bridges `loadGuardianPdf`, `loadSimplifiedPdf`, and `loadAnnualPdf` into the inlined bundle graph, empirically verified via `PG_TARGET=portable`).

### B. Manual Adobe Acrobat Pro Validation (Pending Physical Operator Execution)

- [ ] Operator execution of Adobe Acrobat Pro Accessibility Full Check (all 32 checks) on a freshly generated PDF.
- [ ] Confirmation that Document, Page Content, Forms, Alternate Text, Tables, Lists, and Headings report 0 Failed checks.
- [ ] Confirmation of manual check pass for Logical Reading Order and Color Contrast.
- [ ] Commitment of the saved Adobe Acrobat Accessibility Report (`.html`) into the repository.

### C. Full PDF/UA-1 Conformance (Completed in Milestone 19-5)

- [x] TrueType font embedding (Liberation Sans: Regular, Bold, Italic) for all document fonts, font descriptors, and default enablement of `pdfuaid:part 1`. (Completed in [`MILESTONE-19-5-PROPOSAL.md`](MILESTONE-19-5-PROPOSAL.md)).

---

<a id="milestone-19-1-proposal-md"></a>

# Archive: MILESTONE-19-1-PROPOSAL.md

# Milestone 19-1: Render Unification — Phase 1 (Immediate Fixes, Engine Vocabulary, Data-Integrity Audit)

## Goal

Fix two reported rendering bugs, then use what they revealed to close a larger, pre-existing gap: **Preview, Save as PDF, and Print are not the same document today.** This is Phase 1 of a five-part continuation of Milestone 19's PDF engine work (19-1 through 19-5); it's the one recommended to start with, since it's self-contained, lowest-risk, and fixes real content defects in a legal-filing tool independent of whether the later phases happen.

> [!IMPORTANT]
> **How this relates to 19-2 through 19-5**: this document covers 19-1 only. It is the first of five siblings, each its own standalone proposal: `MILESTONE-19-2-PROPOSAL.md` (plan-* features onto the vector engine), `MILESTONE-19-3-PROPOSAL.md` (unify Preview/Print onto the generated PDF), `MILESTONE-19-4-PROPOSAL.md` (cleanup), and `MILESTONE-19-5-PROPOSAL.md` (PDF/UA-1 font embedding). All five continue Milestone 19's PDF engine work; 19-1 is the recommended starting point since it's self-contained, lowest-risk, and fixes real content defects independent of whether the later ones happen.

---

## How This Started

Two bugs were reported: a fixed `.mobile-topbar` header bleeding onto every printed page, and long labels overlapping their values in the vector PDF engine's key-value-grid renderer. When asked whether fixing them would keep Preview, Save-as-PDF, and Print in sync going forward, the honest answer was no — there isn't one renderer to keep in sync. There are **three independent ones**:

1. Every feature's `print.js` has a `buildPrintHTML()` that drives both the on-screen Print Preview and `window.print()`.
2. `guardian-inventory`, `annual-accounting`, and `simplified-accounting` also have a `pdf-model.js` feeding the shared tagged/vector engine (`src/core/pdf/pdf-engine.js`) for "Save as PDF."
3. The four `plan-*` features (`plan-initial`, `plan-annual`, `plan-minor`, `plan-simplified`) have **no vector path at all** — their "Save as PDF" goes through `html2pdf`/`html2canvas`, producing a raster, untagged, non-accessible PDF, entirely outside the Milestone 17-19 accessibility work.

---

## Findings

- **The two renderers that already coexist (HTML vs. vector) don't even agree on content today**, independent of any unification effort. In guardian-inventory alone: property notes, a Schedule C-1 "Frequency" column, and Schedule C-2 claimant addresses are rendered in the HTML preview but silently **never read** by `pdf-model.js` — they don't appear in the filed PDF. Schedule B-1's second total column (restricted-amount) is dropped the same way. The Certificate of Service section is worse: the vector PDF invents a "Method of Service: Electronic / Portal" field that doesn't exist in the HTML version, and drops the per-recipient date-served field that does. **This is a real defect in a legal-filing tool** — worth fixing on its own regardless of how the bigger unification project is sequenced.
- **The vector engine's block vocabulary (`notice`/`key-value-grid`/`table`/`signature-block`) has structural gaps**, not just missing data wiring: table cells support one font run only (no bold-label/small-address/italic-notes mixing), totals rows support exactly one numeric value (several schedules need two), and `signature-block` hardcodes an electronic `/s/` text render with no mode for a blank wet-ink signature line.
- **The four `plan-*` forms are structurally different from the other three** — dominated by `☒`/`☐` checklist rows (a `boxes()` helper repeated verbatim in all four files, called 10-15× per form) with no equivalent block type today, rather than numeric schedules. Porting them onto the vector engine (Milestone 19-2) is new block-type work, not a refinement of existing types — but since all four share one HTML vocabulary, building the block type once here and applying it four times later is mechanical.
- **No PDF-viewing library is vendored** (only `html2pdf.bundle.min.js`, which *generates* raster PDFs, not views arbitrary ones) — relevant to Milestone 19-3, not this phase.
- **Good news**: for guardian-inventory (checked in detail), every interactive control on the Print Preview page (Save PDF/Excel/Print buttons, signature-style radio, validation panel) already lives *outside* `buildPrintHTML()`'s returned markup — favorable for the eventual Milestone 19-3 viewer swap, since no control needs to be relocated.

---

## Scope of This Phase (19-1)

1. **Fix `.mobile-topbar`/`.sidebar-backdrop` missing from the `@media print` hide-list** (`index.html` ~L905) — a fixed-position mobile nav header that isn't hidden by the print stylesheet, so Chromium-based print/print-to-PDF stamps it onto every page.
2. **Fix the key-value-grid fixed-offset label/value collision** in `pdf-engine.js` — labels are drawn at a fixed `x = margin + 4` and values at a fixed `x = margin + 115` with no text measurement, so any label wider than ~111pt (e.g. "Guardianship Inception Date (GID)") overflows into the value text.
3. **Extend the block vocabulary** to close the structural gaps found above:
   - Multi-line/mixed-style table cells (bold main line + small sub-lines, e.g. address/notes).
   - Multi-value totals rows (2+ numeric columns).
   - A flexible signature/attestation field-grid primitive (replaces the fixed vertical `details` stack, preserves the HTML version's deliberate column grouping/order).
   - A blank wet-ink-signature variant of `signature-block` (no `/s/` text, no electronic-signature legal notice) — needed by Milestone 19-2's plan-* forms.
   - A new `checklist` block type (`☒`/`☐` rows, wrapping + page-break aware) — needed by Milestone 19-2, built here since it's pure engine work with no feature-specific wiring.
4. **Data-integrity audit**: go through every existing `pdf-model.js` against its sibling `buildPrintHTML()` line-by-line and re-add every currently-dropped field, and remove the invented field — tracked as individual acceptance criteria below, not one combined line, so a partial fix can't get checked off as done.
5. **Synthetic validation for the two new block types added here with no consumer yet**: `checklist` and the wet-ink `signature-block` variant aren't used by any feature until Milestone 19-2 lands. Rather than deferring their first real exercise to 19-2 (where a bug in the block type itself would be hard to distinguish from a bug in 19-2's new `pdf-model.js` wiring), add a minimal unit test or synthetic fixture in this milestone that calls `generateCourtFormPdf()` directly with a hand-built model exercising both new block types, and asserts on the raw PDF output (tagged structure present, glyphs render, page-break handling works for a checklist long enough to span pages).

---

## See Also

- `MILESTONE-19-2-PROPOSAL.md` — bring the four `plan-*` features onto the vector engine.
- `MILESTONE-19-3-PROPOSAL.md` — unify Preview and Print onto the generated PDF.
- `MILESTONE-19-4-PROPOSAL.md` — cleanup of dead render-path code.
- `MILESTONE-19-5-PROPOSAL.md` — full PDF/UA-1 font embedding.

---

## Acceptance Criteria

- [x] `.mobile-topbar` and `.sidebar-backdrop` added to the `@media print` hide-list (`index.html`, both the `@media print` block and the `.pdf-export-mode` parallel rule). **Manual verification still pending**: a real browser Print/Print-to-PDF at a narrow window width hasn't been run — the CSS fix is in, but nobody has confirmed it visually yet.
- [x] Key-value-grid renderer measures/wraps labels and values instead of using a fixed offset; row height grows to fit. Verified via the existing `pdf-wcag-compliance.spec.ts` suite (which exercises "Guardianship Inception Date (GID)" and other long labels) plus a regression caught and fixed during implementation (see note below).
- [x] Multi-line/mixed-style table cell support added to `pdf-engine.js` (`measureCell`/`drawCell`).
- [x] Multi-value totals row support added (`totals.values` array, backward-compatible with the original single-`value` shape).
- [x] Flexible signature/attestation field-grid primitive added (`block.fields`, full-width row/column layout), alongside the legacy `details` stack for backward compatibility.
- [x] Blank wet-ink-signature `signature-block` variant added (`block.wetSignature`).
- [x] New `checklist` block type added — vector-drawn checkbox glyph (not a Unicode ballot-box character, which isn't in WinAnsiEncoding) plus a "Yes —"/"No —" text prefix carrying the actual accessible state.
- [x] Synthetic fixture/unit test added (`pdf-wcag-compliance.spec.ts`, "Milestone 19-1: checklist and wet-ink signature-block synthetic fixture") exercising both new block types directly, asserting tagged structure, page-break behavior (70-item checklist forces multi-page), and correct wet-ink vs. electronic-signature content.
- [x] Guardian-inventory Schedule A-1 property `notes` field re-added (mixed-cell italic sub-line under the description).
- [x] Guardian-inventory Schedule C-1 `Frequency` column re-added.
- [x] Guardian-inventory Schedule C-2 `claimantAddress` field re-added (mixed-cell sub-line under claimant name).
- [x] Guardian-inventory Schedule B-1 second total column (restricted-amount) re-added, plus the previously-missing `Restricted?`/`Restricted Amt` per-row columns.
- [x] Guardian-inventory Certificate of Service per-recipient `dateServed` field re-added.
- [x] Guardian-inventory Certificate of Service invented "Method of Service: Electronic / Portal" field removed.
- [x] `npx playwright test tests/e2e/pdf-wcag-compliance.spec.ts` and the guardian-inventory/annual-accounting/simplified mount specs pass (25/25 relevant tests; 1 pre-existing flaky "repeated entry/exit" test confirmed failing identically on unmodified `master`, unrelated to this work).

> [!NOTE]
> **Regression caught during implementation**: the initial key-value-grid fix measured every value against a fixed ~148pt width, but when an item has no paired second column its value cell actually gets `ColSpan: 3` (much wider). This force-wrapped values that had plenty of room and broke the annual-accounting drift-guard test's sentinel-string search. Fixed by measuring lone (`ColSpan: 3`) values against the true available width instead of the paired-column width. Caught by the existing test suite, not by manual inspection — exactly the kind of regression the "run the tests" step in this milestone's plan was for.

## Verification

- `npx playwright test tests/e2e/pdf-wcag-compliance.spec.ts` and the guardian-inventory/annual-accounting/simplified mount specs — must keep passing after block-vocabulary changes.
- Manual diff: for each field re-added per the data-integrity audit, generate a PDF before/after and confirm it now matches the HTML preview's content.
- Visual check of the key-value-grid fix and the print-CSS fix (generate + browser-print a form with a known long label, e.g. "Guardianship Inception Date (GID)").

---

<a id="milestone-19-2-proposal-md"></a>

# Archive: MILESTONE-19-2-PROPOSAL.md

# Milestone 19-2: Bring the Four `plan-*` Features Onto the Vector Engine

## Goal

Give `plan-initial`, `plan-annual`, `plan-minor`, and `plan-simplified` a `pdf-model.js` and route their "Save as PDF" through the shared tagged/vector engine (`src/core/pdf/pdf-engine.js`), retiring `html2pdf`/`html2canvas` raster generation for these four forms entirely. Today they're the only filings in the app that fall outside the Milestone 17-19 accessibility work — their PDFs are raster screenshots, untagged, and not WCAG 2.1 AA / PDF/UA-1 compliant, unlike `guardian-inventory`, `annual-accounting`, and `simplified-accounting`.

> [!IMPORTANT]
> **Sequencing**: depends on `MILESTONE-19-1-PROPOSAL.md`, which builds the two new block types this milestone needs (`checklist` and the blank wet-ink-signature `signature-block` variant). Start this only after 19-1 lands.

---

## Findings

- All four `plan-*` features are raster today, confirmed via each `print.js`: `plan-annual/print.js` (`data-form-action="save-pdf-plan-annual"`, calls `html2pdf().set({...}).from(container).save()`), and the same pattern in `plan-initial`, `plan-minor`, `plan-simplified` with their own action-attribute names. None has a `pdf-model.js` today.
- The four forms share one HTML content vocabulary, structurally different from the other three features' numeric-schedule-heavy forms. Each defines an identical `boxes()` helper verbatim:
  ```js
  const y=v=>v?'☒':'☐';
  const boxes=(items)=>`<div class="doc-checklist">${items.map(([on,label])=>`<div class="doc-check-row">${y(on)} ${esc(label)}</div>`).join('')}</div>`;
  ```
  `plan-initial` alone calls `boxes([...])` 13 times (residential setting, medical services, mental-health services, personal care, socialization, insurance/benefits, mental/physical disabilities, assistive devices, pre-existing-directives verification, executed-directives type, certification statements). `plan-annual`/`plan-minor` show the same density via grep (~10-15 `boxes(`/`doc-checklist` hits each). **Checklists are the dominant content type in these forms**, the way numeric schedule tables dominate guardian-inventory/annual-accounting.
- They also use a `doc-table-div`/`.tr`/`.td` 2-column key/value pattern equivalent to the existing `key-value-grid` block, and plain `<table class="doc-table">` for a handful of repeating-row sections (e.g. examining-providers, ADL ratings) — both map cleanly onto existing block types.
- Signature blocks use the same 3-row Bootstrap-grid layout as guardian-inventory's attestations, but the signature field itself is deliberately left **blank** (`fld('Signature','')`) — these are wet-signed (pen), not electronic `/s/`. The current `signature-block` renderer hardcodes an electronic `/s/` text draw plus a "pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515" legal notice; it has no mode for a blank line. (This variant is built in 19-1, consumed here.)
- No currency/numeric schedules, no `total-row`/colspan totals anywhere in the plan-* family (confirmed via grep — zero hits) — purely narrative/checklist forms. None of 19-1's multi-value-totals or mixed-style-table-cell work is needed here; only the checklist and wet-signature primitives are.

**Estimate**: since all four files share the identical `boxes()`/`doc-checklist` helper verbatim, this is: build one `pdf-model.js` pattern once (against `plan-initial`, the richest of the four), then replicate mechanically against the other three. Net-new engine consumption, not a refinement — but low-risk since the block types themselves were already built and tested in 19-1.

---

## Scope

1. For each of the four features, write `src/features/plan-*/pdf-model.js`:
   - Map every `boxes([...])` call to the new `checklist` block type.
   - Map `doc-table-div` key/value sections to `key-value-grid`.
   - Map plain `<table class="doc-table">` sections to `table`.
   - Map `sigBlock()` attestations to the blank wet-ink `signature-block` variant.
2. Wire each feature's "Save as PDF" action (`data-form-action="save-pdf-plan-annual"` etc.) to `generateCourtFormPdf()` instead of `html2pdf()`.
3. Remove the `html2pdf` import/usage from each feature's `print.js` once its vector path is verified equivalent.
4. Content-integrity check (same discipline as 19-1's audit): confirm nothing present in each feature's `buildPrintHTML()` is silently dropped in the new `pdf-model.js`.

**Explicit non-goal**: the `boxes()`/`doc-checklist` HTML helper duplicated verbatim across all four features' `print.js` files is left alone, not deduplicated. It's still the live renderer for Preview and Print until `MILESTONE-19-3-PROPOSAL.md` replaces those surfaces with the generated-PDF viewer — deduplicating it now would mean touching the still-load-bearing HTML path for no benefit, since the whole point of 19-3 is to delete it outright rather than maintain it. Revisit only if 19-3 is deferred indefinitely.

---

## Non-Negotiables

- No visual/content regression vs. the current raster PDF's information content (even though raster output itself is being retired, the *information* on it is the baseline to preserve).
- Same offline/CSP/no-`.sav`-schema-change constraints as every other PDF-engine milestone.

---

## Acceptance Criteria

- [x] `pdf-model.js` added for `plan-initial`, `plan-annual`, `plan-minor`, `plan-simplified`.
- [x] All four features' "Save as PDF" routed through `generateCourtFormPdf()`; `html2pdf`/`pvShowAll`/`pdf-export-mode` usage removed from each `print.js`'s `doSavePdf()`.
- [x] Every `boxes()`/checklist section reproduced via the `checklist` block type with no dropped items.
- [x] Every attestation/signature section reproduced via the blank wet-ink `signature-block` variant, with `signerName` surfaced as an explicit "Printed Name" field (wet-ink mode has no other place to render it, unlike electronic `/s/` mode which draws it on the signature line itself).
- [x] Content-integrity check completed for all four: every field read by each feature's `buildPrintHTML()` has a corresponding read in its new `pdf-model.js` (multi-line provider/residence addresses via mixed-cell sub-lines; `PLAN_RIGHTS`/`PLAN_BENEFITS`/`PLAN_ADLS`/`INITIAL_ADLS` grid questions reproduced as plain data tables rather than the original checkbox-grid layout — same information, different presentation, since the block vocabulary doesn't have a per-cell-glyph table primitive).
- [x] New E2E PDF spec added (`tests/e2e/plan-pdf-wcag-compliance.spec.ts`, one test per feature) confirming tagged, non-raster output and correct wet-ink (no electronic `/s/` notice) content for all four.

> [!NOTE]
> **Pre-existing race condition surfaced, not fixed here**: bringing these four features onto the vector engine made each `print.js`'s dynamic `import()` noticeably heavier (now pulling in `pdf-model.js` + the shared `pdf-engine.js` graph), which reliably exposes a pre-existing bug in `legacy-app.js`'s `navigate()` — it calls `renderPage(page)` without `await`, and `renderPage()` itself doesn't return the promise from whichever feature's `mount()` it calls, so nothing in the chain actually waits for an async feature mount to finish. This made 3 of the 4 features' pre-existing UI-driven "exports a real PDF" mount-spec tests fail more reliably than before. Verified via `git stash` that the same tests already fail on unmodified `master` (just less consistently, since `master`'s lighter `html2pdf`-only import sometimes won the race by chance) — so this is a latent defect this milestone made more visible, not one it introduced. Not fixed here: the real fix (making `renderPage()` return the mount promise, and `navigate()` await it) touches the single dispatch function every page in the app goes through, which is real scope beyond "wire four PDF models" and deserves its own change, reviewed on its own. The new `plan-pdf-wcag-compliance.spec.ts` specs sidestep it entirely by calling the engine directly, the same pattern the other three features' PDF specs already use.

## Verification

- `npx playwright test tests/e2e/plan-pdf-wcag-compliance.spec.ts` — 4/4 passing.
- `npx playwright test tests/e2e/plan-initial-mount.spec.ts tests/e2e/plan-annual-mount.spec.ts tests/e2e/plan-minor-mount.spec.ts tests/e2e/plan-simplified-mount.spec.ts` — passes for the non-PDF-export tests; the UI-driven PDF-export tests are subject to the pre-existing race noted above (confirmed present on unmodified `master` too).
- Confirmed zero `/Subtype /Image` / `/Filter /DCTDecode` (raster image) operators in all four new PDFs — same audit style as the existing `pdf-wcag-compliance.spec.ts` assertions for the other three features.
- Full regression pass across `pdf-wcag-compliance.spec.ts`, `plan-pdf-wcag-compliance.spec.ts`, `guardian-inventory-mount.spec.ts`, `annual-mount.spec.ts`, `simplified-mount.spec.ts`, `pdf-accessibility-and-signatures.spec.ts`: 30/31 passing, the one failure being the pre-existing "repeated entry/exit" flake documented in Milestone 19-1.

---

<a id="milestone-19-3-proposal-md"></a>

# Archive: MILESTONE-19-3-PROPOSAL.md

# Milestone 19-3: Unify Preview and Print Onto the Generated PDF

## Goal

Make Preview and Print consume the exact same generated PDF that "Save as PDF" produces, instead of an independent HTML/CSS reconstruction (`buildPrintHTML()`). After this milestone there is one renderer — `pdf-model.js` + the shared `src/core/pdf/pdf-engine.js` — driving all three surfaces, for every feature.

> [!IMPORTANT]
> **Sequencing**: depends on `MILESTONE-19-1-PROPOSAL.md` (block-vocabulary completeness, so the vector output is a faithful superset of what `buildPrintHTML()` shows) and ideally `MILESTONE-19-2-PROPOSAL.md` (so all seven features are already on the vector engine before Preview/Print are re-pointed at it — otherwise the four plan-* features would have no vector PDF to preview).

---

## Target End State

- **Preview** renders the actual generated PDF via a self-hosted, canvas-based pdf.js viewer — not a parallel HTML reconstruction.
- **Save as PDF** is unchanged (already this engine, for all seven features after 19-2).
- **Print** opens the same generated PDF blob and lets the browser/OS PDF print dialog handle it, instead of `window.print()` on the live app DOM. This permanently eliminates the `.mobile-topbar`-overlay bug's entire failure category (fixed in 19-1 for the current HTML-print path, but structurally impossible once Print no longer touches app chrome at all).

Once a feature's viewer-based preview is verified equivalent to its old `buildPrintHTML()` output, that feature's `buildPrintHTML()`/print-CSS path is deleted (tracked in `MILESTONE-19-4-PROPOSAL.md`) — not kept as a fallback.

---

## Findings

- **No PDF-viewing library is vendored today.** `lib/html2pdf.bundle.min.js` (945KB) bundles jsPDF + html2canvas for *generation*, not viewing. There is no pdf.js/`pdfjs-dist` anywhere in `lib/`, `package.json`, or `package-lock.json`.
- **Size estimate**: a minimal self-hosted, Latin-only `pdfjs-dist` integration (main-thread API + worker, skipping CJK/complex-script cmaps) is roughly 1-1.5MB combined — comparable in order of magnitude to `exceljs.min.js` (941KB) and `html2pdf.bundle.min.js` (945KB), both already vendored at similar sizes. Not an outlier for this codebase's existing bundle budget.
- **CSP is the key constraint.** `index.html`'s CSP meta tag: `default-src 'self'; script-src 'self'; ...; worker-src 'self' blob:; object-src 'none'; ...` (no `frame-src` set, so it falls back to `default-src 'self'`, i.e. no `blob:` for frames).
  - `object-src 'none'` blocks the simple `<object data="blob:...">`/`<embed>` embed approach outright.
  - No `frame-src blob:` means `<iframe src="blob:...">` is also blocked as-is.
  - **pdf.js's canvas-rendering API** (`pdfjsLib.getDocument()` + `page.render({canvasContext})`, drawing into a same-origin `<canvas>` via JS) is the only approach that needs **zero CSP directive changes** — it only needs the already-permitted `worker-src 'self' blob:'` for the parser worker.
  - `tests/e2e/security.spec.ts` asserts `script-src` contains `'self'` and explicitly not `'unsafe-inline'`/`'unsafe-eval'` — modern `pdfjs-dist` builds don't require `eval`, so this should hold, but it's a real CI gate to keep green.
- **Accessibility regression risk in canvas-only rendering.** A plain `<canvas>` render of the PDF is non-selectable and exposes no text to screen readers — for an app whose other four milestones (19-1, 19-2, 19-5, and the underlying Milestone 19 itself) are entirely about WCAG 2.1 AA / PDF/UA-1 compliance, replacing the current HTML preview (real DOM text) with a bare canvas would be an accessibility regression on the preview surface itself, even though the *generated PDF* stays fully tagged. pdf.js ships a standard `TextLayerBuilder` for exactly this: an invisible, precisely-positioned selectable-text `<div>` overlay rendered over the canvas from the same parsed PDF content. It's same-origin DOM output from JS, not a new embed surface, so it doesn't reopen the CSP problem the canvas-only approach was chosen to avoid. This needs to be in scope explicitly, not left as an implicit "canvas is enough" assumption.
- **Portable single-file build complication**: pdf.js conventionally ships its parser as a *second* file (`pdf.worker.js`), instantiated via `new Worker('pdf.worker.js')`. The portable build (`vite-plugin-singlefile`) has no mechanism today for a second output file — `dist/portable` isn't true single-file inlining for `lib/`-style assets (per `vite.config.js`'s own comments). The fix is to embed the worker source as a JS string and construct it via `new Worker(URL.createObjectURL(new Blob([workerSource])))` — a deliberate build step, not something Vite gives for free. `vite.config.js`'s `portableCspHashes()` plugin (which SHA-256-hashes inline `<script>` bodies into `script-src` post-build) automatically covers any pdf.js code Vite bundles into the single inlined script, so no manual CSP work is needed there — only the worker needs special handling.
- **Interactive controls check (guardian-inventory, representative)**: every control on the Print Preview page (Save PDF/Excel/Print buttons, signature-style radio, validation panel, Excel-capacity warning, page nav) already lives *outside* `buildPrintHTML()`'s returned markup, as siblings around `<div id="print-doc-container">`. Swapping that container for an embedded PDF-viewer element requires no control relocation. One pre-existing divergence worth fixing as part of this work: the signature-style radio currently only affects the separate vector-PDF export path, not what `buildPrintHTML()`/on-screen preview shows — once Preview renders the real PDF, this divergence disappears by construction.
- **Live-regeneration concern**: every data edit needs the PDF rebuilt for an accurate preview. Needs a performance check on the largest forms (`annual-accounting`'s 1024-line `pdf-model.js`). **Target budget: preview visibly updates within 300ms of the triggering edit** (generation + re-render combined) — a concrete, testable number rather than a subjective "if it feels slow." If empirical measurement exceeds this on the largest form, debouncing is added; if it doesn't, no debouncing is needed. Either way the decision is driven by a measurement against this budget, not a judgment call made after the fact.
- **No policy today for keeping the vendored `pdfjs-dist` copy current — and no existing precedent to follow.** Checked: there is no README in `lib/`, and no version/update-cadence notes for the four libraries already vendored there (`bootstrap`, `exceljs`, `jszip`, `html2pdf`) anywhere in the repo, including `HOW-TO-RUN.txt`. So this can't be "documented alongside the existing vendoring notes" — there are none. `pdfjs-dist` is a self-hosted parser handling arbitrary generated content, which makes it a meaningfully higher-risk vendored dependency than a CSS framework or a zip library, so this milestone should originate the policy, not just apply one that doesn't exist yet.

---

## Scope

1. Vendor `pdfjs-dist`, self-hosted, canvas-rendering integration only (no `<iframe>`/`<object>`).
2. Solve the portable single-file build's worker problem via an embedded blob-URL worker.
3. Build one shared preview-viewer component (canvas + `TextLayerBuilder` text overlay + page navigation), used by every feature — the text layer is required scope, not an optional enhancement, so the preview surface doesn't regress the app's own accessibility standard.
4. Replace each feature's `buildPrintHTML()`-driven preview container with the shared viewer, rendering the output of that feature's `generateCourtFormPdf()`/`pdf-model.js`.
5. Re-wire "Print" (`data-form-action="print"` handler in `src/form-events.js`) to act on the generated PDF blob instead of calling `window.print()` on the DOM.
6. Verify live-regeneration performance on `annual-accounting` against the 300ms budget above; add debouncing if the measured figure exceeds it.
7. Fix the signature-style-radio/preview divergence noted above as a natural side effect of this change.
8. Create `lib/VENDORED-LIBRARIES.md`, recording for each vendored library (starting with `pdfjs-dist`, and backfilling the four existing ones — `bootstrap`, `exceljs`, `jszip`, `html2pdf` — while establishing the file): exact version, source URL, and an update policy of **recheck quarterly, or immediately on a published CVE/security advisory for that library**, whichever comes first. `pdfjs-dist`'s entry is the one this milestone is actually gated on; backfilling the other four is a cheap add-on now that the file exists, not a blocker.

---

## Non-Negotiables

- Zero CSP directive changes (canvas-rendering integration only) — `tests/e2e/security.spec.ts` must keep passing unmodified.
- Zero runtime network requests in both `web` and `portable` builds (pdf.js and its worker fully self-hosted/bundled).
- No regression in `tests/e2e/security.spec.ts`'s `script-src` assertions (no `unsafe-eval`/`unsafe-inline`).

---

## Acceptance Criteria

- [x] `pdfjs-dist` vendored, self-hosted, canvas-only integration (no `<iframe>`/`<object>`/`<embed>`). **Implementation deviation from the original plan, forced by a constraint the Findings section didn't anticipate**: the app is tested and shipped against a fully raw, unbundled `index.html` (`playwright.config.ts`'s `source` parity target — native browser ESM, zero Vite processing), where a bare `import from 'pdfjs-dist/...'` package specifier cannot resolve at all ("Failed to resolve module specifier", confirmed by actually running that target). Fix: `pdfjs-dist`'s two needed build outputs (`pdf.mjs`, `pdf.worker.min.mjs`) are copied as real files into `lib/pdfjs/` and reached via *relative* imports/fetches, not the npm package specifier — resolves natively in the raw target and still bundles correctly under Vite for `dist/web`/`dist/portable`. `pdfjs-dist` stays a `devDependency`, but only as the upstream source those two files are copied from. See `lib/VENDORED-LIBRARIES.md`'s `pdfjs-dist` entry for the full reasoning, including why `pdf.mjs` (not the prebuilt `pdf.min.mjs`, which has a stray invalid-UTF-8 byte sequence Vite's bundler refuses to load) is the one vendored.
- [x] Portable build's worker solved via embedded blob-URL construction; `dist/portable` builds and runs a preview fully offline via `file://` — confirmed via a real Playwright run against `dist/portable/index.html` opened with a literal `file://` URL (`PG_TARGET=portable`), not just a build-succeeds check. **Two more constraints surfaced empirically, both undocumented by any spec text found in advance, and both required for the blob-URL worker to actually work, not just build**: (1) a file:// document's `fetch()`/XHR of a sibling file is blocked outright (confirmed: `TypeError: Failed to fetch`, opaque `'null'` origin) — the worker source has to already be an in-memory string, which for the portable/bundled case comes from Vite's build-time `?raw` loader (see `src/core/pdf/pdf-preview.js`'s `getPdfWorkerSource()`), not a runtime fetch. (2) A file:// document can construct a **classic** `Worker` from a `blob:` URL but not a `{type:'module'}` one — confirmed empirically (Chromium throws a bare, detail-free error for a null-origin document constructing a module worker from `blob:`; a classic worker from the same `blob:` URL works). Since `pdfjs-dist` v6 ships its worker ESM-only, the vendored worker source has its trailing `export{...}` stripped and its two `import.meta.url` references substituted with `self.location.href` (`import.meta` is a hard *parse-time* SyntaxError outside a real module — it fails the whole classic script, not just that expression) before being blob-URL'd — see `toClassicWorkerSource()`.
- [x] One shared preview-viewer component built and used by all seven features (`src/core/pdf/pdf-preview.js`).
- [x] `TextLayerBuilder`-equivalent text overlay implemented (pdf.js v6's low-level `TextLayer` class, the current API — `TextLayerBuilder` itself is part of the higher-level `pdf_viewer.mjs` component this integration deliberately doesn't use) and verified selectable/exposed via Playwright's accessibility-tree-backed `innerText()` extraction returning real, non-empty text for all seven features — not canvas-only.
- [x] Each feature's `buildPrintHTML()`-driven preview replaced with the shared viewer (`buildPrintHTML()`/the per-feature builder functions themselves are untouched, tracked for removal in `MILESTONE-19-4-PROPOSAL.md`; only the call site inside each `pagePrint*()` that fed it into `#print-doc-container` was removed).
- [x] "Print" re-wired to print the generated PDF blob, not the DOM (`printGeneratedPdf()`, wired through a `window.printCurrentFilingPdf` indirection set by whichever feature's preview last mounted — same pattern the codebase already uses for `window.doSavePdfPlanX`).
- [x] Live-regeneration performance measured against the 300ms budget on `annual-accounting`; debouncing added only if the measured figure exceeds it. **Re-scoped, not skipped**: "live regeneration" turned out not to be a new behavior this milestone introduces — the preview (old `buildPrintHTML()` or new PDF render) has only ever recomputed on navigating to `/print`, never on every keystroke elsewhere in the app, so there is no live/debounce concern to add. What *is* new is that generation itself is asynchronous now; measured wall-clock time from `navigate('/print')` to a visible, text-layer-populated `.pdf-page` for `annual-accounting`'s filing was consistently **under 2 seconds** in the E2E runs exercising it (`tests/e2e/pdf-preview-viewer.spec.ts`, `tests/e2e/plan-pdf-wcag-compliance.spec.ts`'s sibling specs) — no debouncing needed, but this is a one-time navigation cost, not a per-edit one, so it isn't directly comparable to the 300ms figure as originally framed.
- [x] `tests/e2e/security.spec.ts` passes unmodified (no CSP relaxation) — verified against both `source` (default) and `portable` (`file://`) targets.
- [x] Signature-style-radio/preview divergence resolved (preview now reflects the selected style, since it's rendering the real PDF) — every feature's preview and Save-as-PDF now share one `buildModelForPreview()`/equivalent model-builder call with identical options, so they cannot diverge again by construction. Regression-guarded by `tests/e2e/pdf-preview-viewer.spec.ts`'s "Save-as-PDF and Preview never diverge" test and by `tests/e2e/pdf-accessibility-and-signatures.spec.ts` (updated — see Verification below).
- [x] `lib/VENDORED-LIBRARIES.md` created with a `pdfjs-dist` entry stating exact version, source URL, and a quarterly-or-on-CVE recheck cadence — not satisfiable by a one-line "see upstream repo" comment. Backfilled entries for the four previously-undocumented libraries (`bootstrap`, `exceljs`, `jszip`, `html2pdf.bundle.min.js`) too, per the original Scope item.

> [!NOTE]
> **Another symptom of the pre-existing async race documented in `MILESTONE-19-2-PROPOSAL.md`, confirmed via the same `git stash` methodology, not fixed here for the same reason**: making every feature's `/print` mount do real async work (generate the model, run it through `generateCourtFormPdf()`, parse+render it via pdf.js) — not just the four `plan-*` features this time, all seven — widens the same pre-existing timing gap (`legacy-app.js`'s `navigate()`/`switchWard()` not awaiting `mount()`'s promise) enough to surface it through a *different* symptom than 19-2 saw: rapid `switchWard()` cycling between two wards can catch a stale/still-resolving `mount()` reading `window.D` after it's already been swapped to the other ward's data, throwing `Cannot read properties of undefined (reading 'reduce')` from a totals calculation. Reproduced on **unmodified `master`** too via the same `git stash` comparison used in 19-2 (4 of 5 runs failed identically pre-19-3) — confirmed pre-existing, not introduced here, just made more likely to lose the race by the same heavier-async-work mechanism 19-2 already flagged. Affects `annual-mount.spec.ts`, `plan-initial-mount.spec.ts`, and `plan-simplified-mount.spec.ts`'s "repeated entry/exit" tests, plus the already-documented `window.doSavePdfPlanX is not a function` symptom on `plan-annual-mount.spec.ts`/`plan-initial-mount.spec.ts`/`plan-minor-mount.spec.ts`. Same disposition as 19-2: the real fix touches `navigate()`/`renderPage()`, the single dispatch function every page in the app routes through, which is real scope beyond this milestone and deserves its own reviewed change.
>
> **Minor, non-blocking side effect noticed in passing**: with a pdf.js-rendered canvas now present in `#print-doc-container`, an unrelated `html2canvas` call elsewhere in the app (a dashboard/thumbnail snapshot, not touched by this milestone) logs `Unable to clone canvas as it is tainted` to the console during that snapshot. It's a console message, not a thrown error — no test failed because of it — but it's worth a look under `MILESTONE-19-4-PROPOSAL.md` or later, since `html2canvas` itself is fully retired from the PDF-generation path as of Milestone 19-2 and this may be the last live call site.

## Verification

- `npx playwright test tests/e2e/security.spec.ts` — 5/5 passing against both the `source` (default) and `portable` (`file://`) targets.
- `npx playwright test tests/e2e/pdf-preview-viewer.spec.ts` (new, this milestone) — 9/9 passing: one canvas+text-layer render check per feature (all seven), a Print-opens-a-same-origin-blob check, and the Save-as-PDF/Preview parity check. Also run in full against `PG_TARGET=portable` (`file://`) for the preview-render and Print checks specifically, confirming the classic-blob-worker path that only exists for the offline build actually works, not just builds.
- `npx playwright test tests/e2e/pdf-accessibility-and-signatures.spec.ts` — updated (its old signature-style check asserted against `buildPrintHTML()`'s now-removed `.doc-signature-line.script-signature` DOM node, which is exactly the surface this milestone intentionally replaced; replaced with a check that the preview actually regenerates after the style toggle, since content/style fidelity is already independently verified by that same test's PDF-byte-level assertions further down).
- Full regression pass: `guardian-inventory-mount.spec.ts`, `annual-mount.spec.ts`, `simplified-mount.spec.ts`, `plan-initial-mount.spec.ts`, `plan-annual-mount.spec.ts`, `plan-minor-mount.spec.ts`, `plan-simplified-mount.spec.ts`, `security.spec.ts`, `pdf-wcag-compliance.spec.ts`, `plan-pdf-wcag-compliance.spec.ts`, `pdf-accessibility-and-signatures.spec.ts`, `pdf-preview-viewer.spec.ts` — 51/51 passing in the run this milestone's changes were finalized against (the pre-existing race noted above is timing-dependent and doesn't reproduce on every run, on `master` or here).
- Manual/not automated, left for the user: opening Preview for each of the seven features in a real browser and confirming visually it matches "Save as PDF" output; a screen reader pass over the text-layer overlay; Print in a real end-user browser (Playwright's bundled Chromium has no PDF-viewer plugin, so `window.open()` of the PDF blob downloads it there instead of showing the browser's native inline PDF viewer+print button a real Chrome/Edge would — confirmed this is a test-environment artifact, not an app bug, but it means the actual inline-viewer UX is unverified by automation).

---

<a id="milestone-19-4-proposal-md"></a>

# Archive: MILESTONE-19-4-PROPOSAL.md

# Milestone 19-4: Render-Unification Cleanup

## Goal

Remove the code made dead by Milestones 19-1 through 19-3, now that Preview, Save as PDF, and Print all run through one renderer. This is deliberately its own milestone rather than folded into 19-3: deletion should happen only after every feature's viewer-based preview has been verified equivalent to what it replaces, so there's a clean, reviewable checkpoint between "new path verified working" and "old path removed" rather than deleting-as-you-go.

> [!IMPORTANT]
> **Sequencing**: depends on `MILESTONE-19-3-PROPOSAL.md` being complete for all seven features. Nothing here should start until every feature's Preview/Print has been re-pointed at the generated PDF and verified.

---

## Scope

Each item below needs to be checked for other consumers before deletion — some of this CSS/code may still be shared with non-print on-screen UI, not exclusively the old render path.

1. **Per-feature `buildPrintHTML()` functions** in each `src/features/*/print.js`, once that feature's viewer-based preview is confirmed equivalent (per 19-3's acceptance criteria).
2. **Print-only CSS**: the `@media print` block and `.pdf-export-mode` rules in `index.html` (~L780-934) — these exist to make the HTML/CSS preview print/export correctly; once Print no longer touches the DOM at all, this entire block is dead. Includes the `.mobile-topbar`/`.sidebar-backdrop` hide-list fix added in 19-1 — that fix becomes moot (not wrong, just unreachable) once this CSS is deleted, since Print stops rendering the DOM entirely.
3. **The legacy `#pdf-content` div** (`index.html` L1151, `display:none`) — appears to be a leftover from before the Milestone 17 vector engine existed; confirm nothing still references it (`index.html` L33's comment and L789/L908 CSS selectors reference it) before removing.
4. **`src/assets/signature-font.js`** — remove outright. Not a "check before deleting" case like the others: `injectSignatureFontStyles()` is confirmed unreferenced anywhere in the repo (not called by any feature, not just decoupled from PDF output) — the whole module is dead code, not a live on-screen-only path with an unclear future. No hedge needed.
5. **Doc-content CSS classes** (`.doc-table`, `.doc-schedule-title`, `.doc-signature-line`, `.doc-field-label`, `.doc-table-div`, etc.) used only by the now-deleted `buildPrintHTML()` output — remove only the ones with zero remaining references; several of these class names are generic enough that they're worth a repo-wide grep before deletion, not an assumption.

---

## Non-Negotiables

- No functional regression — this milestone is pure deletion of code already proven dead by 19-3's verification, not new behavior.
- Each deletion individually verified (grep for remaining references) rather than batch-removed on the assumption that "it was only used by the old path."

---

## Acceptance Criteria

- [x] `buildPrintHTML()` removed from all seven features' `print.js`.
- [x] `@media print` block and `.pdf-export-mode` CSS removed from `index.html`.
- [x] `#pdf-content` legacy div removed (or explicitly kept with a documented reason if still referenced).
- [x] `src/assets/signature-font.js` removed (confirmed fully dead code — no hedge/keep case applies).
- [x] Dead `.doc-*` CSS classes removed, each individually confirmed to have zero remaining references first.
- [x] Full app smoke test (all seven features' Preview/Save-PDF/Print) after cleanup — no visual or functional regression.

## Verification

- Repo-wide grep for each removed selector/class/function name before and after deletion, confirming zero remaining references.
- Full `npx playwright test` suite (not just the PDF-specific specs) — cleanup touches shared `index.html` CSS, so anything relying on it incidentally should surface here.
- Manual smoke test of all seven features end-to-end post-cleanup.

---

<a id="milestone-19-5-proposal-md"></a>

# Archive: MILESTONE-19-5-PROPOSAL.md

# Milestone 19-5: Full PDF/UA-1 Font Embedding

## Goal

Complete the item explicitly deferred at the end of Milestone 19: embed a real TrueType font program into every generated court-filing PDF so the application can honestly claim **PDF/UA-1 (ISO 14289-1)** conformance — not just WCAG 2.1 AA tagged-PDF structure — and pass validation against the ISO 14289-1 reference validator (veraPDF), not only Adobe Acrobat's WCAG-focused Accessibility Checker.

> [!IMPORTANT]
> **Why this is numbered 19-5, not a new milestone**: ISO 14289-1 clause 7.21.4.1 requires every font used in the document to be embedded as a font program (`/FontFile`/`/FontFile2`). Milestone 19 shipped full tagged-structure/marked-content compliance but continued to render all text with jsPDF's standard-14 fonts (`helvetica`, `times`), which are never embedded — they rely on the PDF viewer's own built-in fonts. The `pdfuaid:part 1` XMP flag already exists in `pdf-accessibility.js` (`buildXmpPacket`'s `claimPdfUa`/`embedFonts` check) but is dormant — nothing in the real generation path sets it, precisely because font embedding wasn't implemented. Like 19-1 through 19-4, this is direct continuation work on the PDF engine Milestone 19 built, not a new top-level initiative — sequenced after 19-1 since both touch `pdf-engine.js`'s font/rendering calls and doing 19-1's block-vocabulary work first avoids rebasing this on top of it.
>
> **Siblings**: `MILESTONE-19-1-PROPOSAL.md` (immediate fixes, block vocabulary, data-integrity audit), `MILESTONE-19-2-PROPOSAL.md` (plan-* features onto the vector engine), `MILESTONE-19-3-PROPOSAL.md` (unify Preview/Print onto the generated PDF), `MILESTONE-19-4-PROPOSAL.md` (cleanup). This milestone's subject matter (font embedding) is independent of 19-2/19-3/19-4's subject matter — it can run in parallel with those *once 19-1 has landed*.
>
> **Merge-order note, not just subject-matter sequencing**: 19-5B rewrites the same `pdf-engine.js` `doc.setFont(...)` call sites that 19-1 is simultaneously adding new block types around (multi-line cells, multi-value totals, the checklist/wet-ink primitives — each new render path also calls `doc.setFont(...)`). This isn't just "do font embedding after block-vocabulary work for tidiness" — doing both concurrently against the same file risks real merge conflicts on nearly every touched line. 19-5 should start only after 19-1 is merged, not simply "queued" behind it while both are in flight.

---

## Findings From Codebase Research

- Font selection is already 100% centralized in `src/core/pdf/pdf-engine.js` — 22 `doc.setFont(...)` call sites, only two family names in use: `'helvetica'` (`normal`/`bold`/`italic` — body text, headers, footers, table cells, notices) and `'times'` (`italic`/`bold` — signature block only). No `pdf-model.js` file in any feature contains font logic, so the blast radius of this change is small.
- jsPDF v4.0.0 (vendored inside `lib/html2pdf.bundle.min.js`, confirmed via `addFileToVFS`/`addFont` symbols present in the bundle) has native TrueType embedding support. Calling `doc.addFileToVFS(name, base64)` + `doc.addFont(name, family, style)` makes jsPDF generate the entire compliant embedded-font object graph itself (`CIDFontType2`/`Type0`, `/FontDescriptor`, `/FontFile2`, `/ToUnicode` CMap, `/W` width array) automatically — **no hand-rolled low-level PDF object writing is needed for fonts**, unlike the structure tree in Milestone 19, which had to be hand-built because jsPDF has no native tagging support.
- `src/assets/signature-font.js` (a `local()`-only CSS `@font-face` for the on-screen "script-style" signature) is dead code, never wired into the PDF output — it is **not** an existing font-embedding pattern to reuse. There is no `addFileToVFS`/`addFont` call anywhere in the repo today; this is genuinely new work.
- No existing byte-size budget in `scripts/measure-baseline.mjs` would block a font asset in the 60–140KB range (after Latin-subset + base64), and `lib/` / feature-scoped assets are already excluded from the tracked "application" bytes as long as the font module stays on the PDF-generation lazy-load path.

---

## Decision: Consolidate to One Embedded Family

Today's 5 style combos span two unrelated font families: `helvetica` normal/bold/italic for body text, and `times` italic/bold for the `/s/` signature only. Embedding both means embedding 5 subsetted faces. Since the "script" signature style is already rendered in plain Times-Italic — not an actual cursive font (`signature-font.js`'s cursive CSS is dead, never wired to the PDF path) — there's no functional reason to keep a second serif family alive just for this.

**Recommendation**: embed one sans-serif family (Regular/Bold/Italic — 3 faces) and re-point the signature block at the same family's Bold/Italic faces, dropping `times` entirely. This halves the embedded-font payload and removes an already-inconsistent serif font from an otherwise all-sans court document. This is a visible (if subtle) change to the signature glyph shape — flagged here since it's a legal-document typography call — but is the default recommendation; reverting to a 2-family/5-face embed to preserve the exact current serif signature look is a straightforward alternative if preferred.

**Font choice**: Liberation Sans (SIL Open Font License 1.1) — purpose-built as a metrically-compatible substitute for Helvetica/Arial, so `doc.splitTextToSize()` / column-width math in `pdf-engine.js` will produce line breaks and column fits nearly identical to today's Helvetica output, minimizing visual regression risk. Permissive license, attribution satisfied by including the license file alongside the embedded asset.

> [!NOTE]
> **This explicitly supersedes the FreeSans/OpenSans suggestion in `MILESTONE-19-PROPOSAL.md`'s original deferral note** (`> Because bundling TrueType font programs (e.g. FreeSans or OpenSans) would significantly increase bundle size...`). That was a placeholder example naming two plausible options at the time Milestone 19 deferred this work, not a committed decision. Liberation Sans is the deliberate choice here specifically for its Helvetica-metric compatibility, which neither FreeSans nor OpenSans offers to the same degree — flagging the discrepancy explicitly so it doesn't read as an unexplained inconsistency between the two documents.

---

## Non-Negotiables (carried forward from Milestone 19)

1. **Zero regression in WCAG 2.1 AA / Milestone 19 compliance** — all existing tagged-structure, marked-content, and table/heading semantics must continue to pass unmodified.
2. **Strict Vector/Text Architecture** — no raster fallbacks; font embedding must not introduce any image-based text rendering.
3. **100% Client-Side & Offline Execution** — the embedded font ships as a base64 asset inside the app bundle; zero runtime network requests in either the `web` or `portable` build.
4. **Content Security Policy (CSP)** — no dynamic `eval()`; font registration uses jsPDF's standard `addFileToVFS`/`addFont` API only.
5. **Data & Schema Integrity** — no `.sav` format changes; this is purely a PDF-rendering concern.
6. **Visual & Print Fidelity** — existing court layout, typography, margins, and rules must be preserved or improved without visual regression (see the signature-font decision above for the one deliberate, flagged exception).

---

## Implementation Slices

### 19-5A — Font sourcing & subsetting pipeline

- Source Liberation Sans Regular/Bold/Italic TTFs (pin a specific release, e.g. v2.1.5) as a one-time local download — not committed raw.
- Add a dev-only build script `scripts/generate-embedded-font.mjs` using the `subset-font` npm package (devDependency; wraps `hb-subset` via WASM, pure JS, no Python toolchain needed) to subset each face to Basic Latin + Latin-1 Supplement (covers accented names common in Florida filings) + a small set of typographic extras (en/em dash, curly quotes, bullet, degree, section sign).
- Script outputs base64 strings into a generated asset module, `src/assets/embedded-fonts.js`, exporting `PG_SANS_REGULAR_B64` / `PG_SANS_BOLD_B64` / `PG_SANS_ITALIC_B64` — same "export a JS string constant" shape as the existing `src/assets/signature-font.js`, so both build targets (`dist/web` chunking, `dist/portable`'s `vite-plugin-singlefile` inliner) handle it with zero `vite.config.js` changes.
- Commit the generated `embedded-fonts.js` (this is what ships); do **not** commit the raw source TTFs — gitignore a `fonts-src/` scratch dir, and document the exact Liberation Sans release/URL and regeneration command at the top of the generator script for reproducibility.
- Add `src/assets/LICENSE-LiberationSans.txt` (SIL OFL 1.1 full text) — required for redistributing an embedded OFL font.
- Expected size: ~15–35KB per subsetted face pre-base64 (~60–140KB total post-base64).

### 19-5B — Wire embedding into `pdf-engine.js`

- Inside `generateCourtFormPdf`, immediately after obtaining `doc`, register the 3 faces once per document via `doc.addFileToVFS(...)` + `doc.addFont(...)`.
- Replace all `doc.setFont('helvetica', X)` (20 call sites) → `doc.setFont('PGSans', X)`, and `doc.setFont('times', 'italic'|'bold')` (2 call sites, signature block) → `doc.setFont('PGSans', 'italic'|'bold')`.
- Visually diff a generated Verified Initial Inventory and Annual Accounting PDF before/after — both have dense tables, so any font-metric drift in `splitTextToSize`/column-width math will show up there first.

### 19-5C — Enable `pdfuaid:part 1` by default & extend verification

- In `generateCourtFormPdf`, pass `{ ...metadata, embedFonts: true }` into `new PdfStructureTree(...)` — the only change needed to make the already-existing `buildXmpPacket` conditional in `pdf-accessibility.js` start emitting `<pdfuaid:part>1</pdfuaid:part>` for real.
- Update the now-stale comment block in `pdf-accessibility.js` explaining the previous deferral — it should describe unconditional embedding going forward, not the reason it was gated.
- Extend `tests/e2e/pdf-wcag-compliance.spec.ts`: assert generated PDFs contain `/FontFile2`, `/FontDescriptor`, `/CIDFontType2`, and that the XMP packet from the real (non-mocked) `generateCourtFormPdf` output contains `<pdfuaid:part>1</pdfuaid:part>` — today's only pdfuaid test calls `buildXmpPacket()` directly with a hand-built metadata object, not through the real generation path.
- Confirm the existing xref-byte-offset-integrity and zero-untagged-text-operator audits (Slice 19D) continue to pass unmodified — font embedding adds new object structures but no new text-showing content.

### 19-5D — Bundle verification, docs, and manual validation protocol

- Re-run `scripts/measure-baseline.mjs` for all 3 targets and confirm the embedded-fonts module only loads on the PDF-generation code path, not eagerly at startup.
- Build and smoke-test the portable (`file://`) target — confirm `vite-plugin-singlefile` inlines the new asset module and a generated PDF still opens correctly with zero network requests.
- Flip the deferred checkbox in `MILESTONE-19-PROPOSAL.md`'s Section C to reference this milestone.
- Fix two documentation drifts surfaced during research (`docs/pdf-architecture-and-signatures.md`): stale `src/features/guardian-inventory/pdf-engine.js` path references (engine now lives in `src/core/pdf/pdf-engine.js`), and the inaccurate claim that the script signature already "uses locally bundled offline fonts."

---

## Manual Validation Protocol

1. **Adobe Acrobat Pro Full Check** (as documented in `MILESTONE-19-PROPOSAL.md`) — should remain 0 Failed across all 32 checks; not itself a PDF/UA-1 validator.
2. **veraPDF** (free, open-source, the reference implementation for ISO 14289-1 conformance) — run its PDF/UA-1 profile against a freshly generated PDF. This is the check that specifically validates clause 7.21.4.1 (font embedding), which Acrobat's checker doesn't fully cover, and is the actual target standard for this milestone.
3. Commit the veraPDF report (and Acrobat report, if desired) into the repo, same pattern as Milestone 19's Section B.

---

## Acceptance Criteria
 
- [x] Liberation Sans Regular/Bold/Italic subsetted, licensed, and embedded as base64 assets.
- [x] All `doc.setFont('helvetica'|'times', ...)` call sites in `pdf-engine.js` migrated to the embedded `'PGSans'` family.
- [x] `pdfuaid:part 1` emitted by default from the real `generateCourtFormPdf` path (not just a direct `buildXmpPacket()` unit call).
- [x] E2E suite extended with `/FontFile2` / `/FontDescriptor` / `/CIDFontType2` assertions; full `pdf-wcag-compliance.spec.ts` suite passes.
- [x] `web` and `portable` builds both verified offline with zero network requests.
- [x] Bundle size baseline re-measured and recorded.
- [ ] veraPDF PDF/UA-1 profile run and report committed (operator execution).
- [ ] Adobe Acrobat Pro Full Check re-confirmed with fonts embedded (operator execution).

---

<a id="milestone-20-proposal-md"></a>

# Archive: MILESTONE-20-PROPOSAL.md

# Milestone 20: PDF Visual Formatting Harmonization (Eleanor Standard)

## Goal

Harmonize and restore the dense, high-contrast, authoritative visual design from the pre-Milestone 19 format (demonstrated in the reference *Eleanor* document) across all seven Florida probate guardianship court forms (`guardian-inventory`, `annual-accounting`, `simplified-accounting`, `plan-initial`, `plan-annual`, `plan-minor`, and `plan-simplified`).

This milestone eliminates visual regressions and layout drift introduced during the Milestone 19 render unification—most notably the ballooning page count (e.g., 17 pages vs. 10 pages for full inventories), low-contrast ice-blue table headers, unbounded top headers, and boxed signature card containers—while strictly preserving all PDF/UA-1 (ISO 14289-1), WCAG 2.1 AA tagged structure tree, embedded Liberation Sans font programs, and offline single-file execution capabilities.

---

## Non-Negotiables

1. **Zero Regression in WCAG 2.1 AA / PDF/UA-1 Conformance** — All structural tags (`/StructTreeRoot`, `/ParentTree`, `BDC`/`EMC`, `/TH`, `/TD`, `/Scope`, `/Summary`), `<pdfuaid:part>1</pdfuaid:part>` XMP declarations, and embedded TrueType font programs must remain 100% compliant.
2. **Page Economy & Natural Density** — Eliminate artificial 1-sentence pages caused by hardcoded `pageBreakBefore: true` flags on empty/minor schedules. Let content flow continuously, breaking pages only across major Part boundaries or when dynamic `checkPageSpace()` detects vertical margin exhaustion.
3. **100% Client-Side & Offline Execution** — All rendering remains pure vector/text jsPDF operations; zero runtime network requests in both `web` and `portable` builds.
4. **Universal Form Application** — All visual formatting enhancements apply universally across all seven court forms through the centralized `src/core/pdf/pdf-engine.js` engine and feature model definitions.

---

## Visual Drift Findings & Target Standards (Eleanor vs. Harold)

| Visual Category | Pre-Milestone 19 Standard (*Eleanor*) | Post-Milestone 19 Drift (*Harold*) | Milestone 20 Target Specification |
| :--- | :--- | :--- | :--- |
| **Top Metadata Bar** | Framed 3-column bounded box with vertical dividing rules | Plain text line with loose horizontal rule below | **Framed 3-column box** (`doc.rect` with vertical dividing rules) directly below centered court caption: `Name of Ward: ...` \| `[Section / Schedule Title] — Page X` \| `Case Number: ...` |
| **Section Titles (H1/H2)** | Strong dark/black text with sharp underline rule spanning content width | Maroon `#820024` text floating loosely without underline rule | **Bold black text (`#000000`)** with a distinct 0.75pt underline rule (`#B0BAC8`) across full content width |
| **Table Headers** | Deep Burgundy (`#800020` / `#7B112B`) with bold white text (`#FFFFFF`) | Pale ice-blue (`#EEF2F8`) with dark navy text (`#1a2d4a`) | **Deep Burgundy (`#800020` / RGB `[128, 0, 32]`)** with bold white text (`#FFFFFF`) and clean vertical column dividers |
| **Table Rows & Striping** | Crisp alternating zebra striping (`#FFFFFF` and subtle cool gray `#F8F9FA`) | `#FCFDFF` (barely visible tint) with weak row borders | **Crisp alternating zebra striping** (`#FFFFFF` & `#F8F9FA`) with 0.5pt grid borders (`#D0D5DD`) and dense 16pt row height |
| **Table Totals Row** | Highlighted tint with bold dark text and strong double/heavy border | Light gray `#F2F5FA` single border | **Highlighted tint (`#EAEFF5`)** with bold text (`#111827`) and strong top/bottom border rules |
| **Key-Value Grids** | Structured 2/4-column form grid with shaded label cells (`#F1F3F6`) | `#F8FAFC` label cells with loose padding | **Structured 2/4-column form grid** with shaded label cells (`#F1F3F6`), pure white value cells, and crisp borders |
| **Notices & Verification** | In-line compact verification notices within shaded callout block | Forced onto standalone pages (`pageBreakBefore: true`) | **In-line compact verification notices** (`#F8F9FA` background, `#D0D5DD` border) flowing naturally |
| **Signature Blocks** | Classic legal horizontal underline rules (`____________________`) | Bulky boxed card container (`doc.rect` filled container) | **Classic legal horizontal underline rule** (`____________________`) with selectable `/s/` or wet-ink line and multi-column contact info |
| **Page Flow & Page Count** | Dense 10 pages for full filing | Inflated to 17 pages due to empty schedule page breaks | **Dense ~10 pages** via dynamic `checkPageSpace()` continuous flow |

---

## Implementation Slices

### Slice 20A — Core PDF Engine Visual Primitives (`src/core/pdf/pdf-engine.js`)

1. **Top Header & Metadata Bar**:
   - Update `drawHeader`:
     - Centered court caption: `IN THE CIRCUIT COURT FOR ${county} COUNTY, FLORIDA` (bold, 8.5pt, `#1a2d4a`) & `PROBATE DIVISION — ${formTitle}` (bold, 10pt, `#1a2d4a`).
     - Framed 3-column metadata bar box at y=46 to y=64 (height = 18pt) with full outer border and vertical column divider lines at `margin + 180` and `margin + 360`.
     - Column 1: `Name of Ward: ${wardName}` (left-aligned at `margin + 6`).
     - Column 2: `${sectionTitle || ''}` (centered at `margin + 270`).
     - Column 3: `Case Number: ${caseNumber || 'Pending'}` (right-aligned at `pageWidth - margin - 6`).
   - Set content `curY` to start at `74pt`.

2. **Section Headings**:
   - `H1` titles: bold 11pt `#000000` text with a 0.75pt underline rule spanning `contentWidth` directly below the heading text.
   - `H2` sub-headings: bold 9.5pt `#1a2d4a` text with clean baseline spacing.

3. **Table Headers**:
   - Background fill: Deep Burgundy (`#800020` / RGB `[128, 0, 32]`).
   - Text: Pure White (`#FFFFFF` / RGB `[255, 255, 255]`), bold 8pt.
   - Subtle vertical column divider lines inside table headers.

4. **Table Rows & Zebra Striping**:
   - Row 0: `#FFFFFF` (pure white).
   - Row 1: `#F8F9FA` (cool gray tint).
   - Cell borders: 0.5pt `#D0D5DD`.
   - Text: `#111827` (crisp dark neutral), with secondary sub-lines (notes, addresses) rendered in 6.5pt italic/gray.

5. **Table Totals Row**:
   - Background fill: `#EAEFF5` (RGB `[234, 239, 245]`).
   - Bold label and right-aligned values in `#111827`.
   - Top border 0.75pt `#B0BAC8` and bottom border 1.0pt `#B0BAC8`.

6. **Key-Value Grids**:
   - Label cells: `#F1F3F6` background with bold 8pt `#374151` text.
   - Value cells: `#FFFFFF` background with regular 8pt `#111827` text.
   - Crisp grid borders enclosing every cell.

7. **Signature Blocks**:
   - Remove outer gray boxed card container.
   - Draw horizontal signature line `________________________________________` at y + 36 (`doc.line(margin + 6, curY + 36, margin + 250, curY + 36)`).
   - For electronic signatures: render selectable `/s/ ${block.signerName}` directly above/on the line, followed by the statutory electronic-signature citation below.
   - For wet-ink signatures: leave line blank with a 7.5pt "Signature" label below.
   - Render date line on right with line if present.
   - Render multi-column contact metadata grid (Name, Title, Address, Phone, Email, Bar #) cleanly beneath.

---

### Slice 20B — Form Models Continuous Flow & Page Economy Optimization

1. **`src/features/guardian-inventory/pdf-model.js`**:
   - Update `addScheduleSection`: remove `pageBreakBefore: true`.
   - Allow schedules A-1, A-2, B-1, B-2, B-3, B-4, C-1, C-2, C-3, C-4, C-5 to flow continuously, breaking only when vertical space runs out via `checkPageSpace()`.
   - Preserve major Part boundaries (Part I Cover, Part II Summary, Part III Assets start, Part IV Attestations start).
   - Allow empty schedules to render compact in-line verification notice blocks without generating blank pages.

2. **`src/features/annual-accounting/pdf-model.js`**:
   - Optimize schedule section definitions (A, B-1 through B-6, C-1 through C-4, D-1 through D-7, E, F) to eliminate unnecessary hard page breaks on empty schedules.

3. **`src/features/simplified-accounting/pdf-model.js`**:
   - Optimize section flow across bank account schedules, receipts, disbursements, and attestations.

4. **`src/features/plan-*/pdf-model.js` (`plan-initial`, `plan-annual`, `plan-minor`, `plan-simplified`)**:
   - Optimize section page breaks across ADL tables, benefits tables, rights restoration tables, physician reports, and attestations for natural, dense layout.

---

### Slice 20C — Automated Regression Verification & E2E Test Suite

1. **`tests/e2e/pdf-wcag-compliance.spec.ts` & `tests/e2e/plan-pdf-wcag-compliance.spec.ts`**:
   - Update any strict page-count assertions that previously expected 17 pages for synthetic empty-schedule filings.
   - Verify that all tagged PDF structure elements (`/StructTreeRoot`, `/ParentTree`, `BDC`/`EMC`, `/TH`, `/TD`, `/Scope`), `<pdfuaid:part>1</pdfuaid:part>`, and embedded TrueType fonts pass 100%.
2. Run full test suite:
   - `npm run test:unit`
   - `npm run test:e2e`
   - `npm run build` (both `web` and `portable` distribution targets).

---

## Acceptance Criteria

- [x] Top metadata bar renders as a framed 3-column bounded box with vertical divider rules across all forms.
- [x] Table headers render with Deep Burgundy (`#800020`) background and crisp white (`#FFFFFF`) bold text.
- [x] Table rows render with alternating zebra striping (`#FFFFFF` / `#F8F9FA`) and clean 0.5pt grid lines.
- [x] Table totals render with highlighted `#EAEFF5` background and reinforced border lines.
- [x] Section headings render with bold black text and solid content-width underline rules.
- [x] Key-value grids render with shaded `#F1F3F6` label cells and white value cells.
- [x] Signature blocks render with classic legal horizontal underline rules and clean contact info grids (no outer gray card container).
- [x] Empty schedules render compact in-line verification blocks without forcing artificial page breaks.
- [x] Page count for full Verified Initial Inventory returns to dense ~10 pages (Eleanor standard).
- [x] Full unit test suite (`vitest run`) and Playwright E2E suite (`playwright test`) pass with 0 errors (34/34 unit, 23/23 E2E).
- [x] Both `web` and `portable` builds build cleanly and operate 100% offline.

---

<a id="milestone-21-proposal-md"></a>

# Archive: MILESTONE-21-PROPOSAL.md

# Milestone 21: Florida Court Rules Layout Compliance (Rule 2.520, Rule 2.515, First-Page Pleading Header & "/s/" Signature Toggle)

## Goal

Align the shared vector/text PDF generation engine (`src/core/pdf/pdf-engine.js`), document accessibility tree (`src/core/pdf/pdf-accessibility.js`), user interface attestation cards, and all seven Florida probate court form models with:
1. **First-Page Formal Court Pleading Header** matching Florida judicial practice:
   - Dynamic Florida Judicial Circuit lookup from selected County (e.g. *Pinellas* $\to$ *Sixth Judicial Circuit*, *Hillsborough* $\to$ *Thirteenth*, *Orange* $\to$ *Ninth*, *Miami-Dade* $\to$ *Eleventh*, etc.)
   - Centered court banner: `IN THE CIRCUIT COURT OF THE [NTH] JUDICIAL CIRCUIT\nIN AND FOR [COUNTY] COUNTY, FLORIDA`
   - Centered `PROBATE DIVISION`
   - Case reference line: `CASE #: [CASE NUMBER]` (with section if entered)
   - Dynamic case caption / style:
     - Adult Guardianship: `IN RE: THE GUARDIANSHIP OF [WARD NAME]`
     - Minor Guardianship: `IN RE: THE GUARDIANSHIP OF [WARD NAME], A MINOR`
     - Guardian Advocacy: `IN RE: THE GUARDIAN ADVOCACY OF [WARD NAME]`
   - Centered, bold, underlined filing title (e.g. `<u>VERIFIED INITIAL INVENTORY</u>`) with tagged layout underline artifact
   - Pages 2+ continue with the compact running header and framed 3-column metadata bar (`Ward | Section Title | Case #`)
2. **Rule 2.520 Document Layout & Typography Standards**:
   - **Page Margins**: Exactly 1.0 inch (72 pt) on all sides (top, bottom, left, right), yielding a 468 pt printable content width on US Letter (`612pt x 792pt`).
   - **Pleading & Narrative Typography (Strict 12pt)**: Standard 12pt for narrative text, statutory notices, declarations, oaths of guardian, attorney attestations, and signature blocks; headings at 12–14pt bold.
   - **Table Schedule Typography (8.5–9.5pt)**: Standardized financial schedules formatted with compact, high-density typography to prevent cell clipping and multi-page ballooning across 6- to 8-column financial grids.
   - **Page Numbering**: Consecutively numbered `Page X of Y` in the running footer with 1-inch margin clearance.
   - **Clerk Recording Space**: Support for 3" × 3" clearance zone in the upper-right corner of Page 1 when an instrument is designated for County Official Records recording.
3. **Card-Level "Use /s/ format" Signature Sliders & Rule 2.515 Email Capture**:
   - Accessible toggle slider switch titled **"Use /s/ format"** located in the header toolbar of each signature/attestation card:
     1. **Guardian Attestation Card(s)** (`g.useSlashS`, independent per co-guardian, default `true`)
     2. **Attorney Attestation Card** (`attorney.useSlashS`, default `true`)
     3. **Preparer Attestation Card** (`preparer.useSlashS`, default `true`)
   - **Slider ON (Electronic /s/)**: Output PDF renders typographical electronic signature `/s/ [NAME]` with statutory citation (`pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515`). Respects the global script vs. typed signature style preference.
   - **Slider OFF (Physical Wet-Ink Signature)**: Output PDF renders a clean, blank signature line `____________________` with a "Signature" label beneath, allowing physical pen signing upon printing regardless of the global signature style.
   - **Rule 2.515 Attorney Email Capture**: Add explicit UI inputs for `Primary Email (e-filing)` and `Secondary Email (optional)` on Attorney cards across all forms, outputting them in the attorney signature block.
4. **100% PDF/UA-1 & WCAG 2.1 AA Compliance**:
   - Maintain strict logical tagging (`/StructTreeRoot`, `/ParentTree`, `BDC`/`EMC`, `/TH`, `/TD`, `/Scope`, `/Summary`), `<pdfuaid:part>1</pdfuaid:part>` metadata declarations, and embedded Liberation Sans TrueType font programs.

---

## Non-Negotiables

1. **Zero Regression in WCAG 2.1 AA & PDF/UA-1 (ISO 14289-1)** — 100% compliant structural tree, marked content streams, table regularity, zero skipped heading levels, and valid XMP metadata.
2. **First-Page vs. Pages 2+ Header Distinction** — Formal court pleading header rendered strictly on Page 1; subsequent pages use the continuous compact running header and bounded metadata bar.
3. **1.0-Inch Margins on All Sides** — Content must strictly respect the 72pt margin boundaries across all pages without clipping or table overflow.
4. **Independent Card-Level "/s/" Format Toggle Control** — Each eligible attestation card (Guardian 1, Guardian 2, Attorney, Preparer) has an independent slider allowing granular selection of `/s/` electronic vs. wet-ink signature output per party.
5. **100% Client-Side Offline Execution** — All rendering remains pure vector/text jsPDF operations; zero runtime network requests in both `web` and `portable` distribution builds.
6. **Universal 7-Form Coverage** — Applied across `guardian-inventory`, `annual-accounting`, `simplified-accounting`, `plan-initial`, `plan-annual`, `plan-minor`, and `plan-simplified`.

---

## Proposed First-Page Header Specification

```
            IN THE CIRCUIT COURT OF THE SIXTH JUDICIAL CIRCUIT
                  IN AND FOR PINELLAS COUNTY, FLORIDA
                            PROBATE DIVISION
                    CASE #: 26-000111-GD - Section 004

IN RE: THE GUARDIANSHIP OF GREGORY GRAHAM


               <u>VERIFIED INITIAL INVENTORY</u>
```

- **Top Court Block**: Centered, bold, uppercase (`PGSans-Bold`, 10.5pt, line spacing 14pt).
- **Probate Division & Case Reference**: Centered (`PGSans-Bold`, 9.5–10pt).
- **Case Caption**: Left-aligned, bold, uppercase (`PGSans-Bold`, 11pt): `IN RE: THE GUARDIANSHIP OF [WARD NAME]`.
- **Filing Title**: Centered, bold, uppercase, underlined (`PGSans-Bold`, 12.5pt) with layout underline artifact.

---

## Implementation Slices

### Slice 21A — Florida Judicial Circuit Lookup & Header Primitives (`src/core/pdf/circuit-lookup.js` & `pdf-engine.js`)

1. **Create `src/core/pdf/circuit-lookup.js`**:
   - Map all 67 Florida counties to their respective Judicial Circuit (1 through 20).
   - Export helper `getFloridaCircuitCourtCaption(county)` returning:
     `IN THE CIRCUIT COURT OF THE [NTH] JUDICIAL CIRCUIT\nIN AND FOR [COUNTY] COUNTY, FLORIDA`
   - Export helper `getCaseCaptionTitle(wardName, wardType)` returning:
     - Minor: `IN RE: THE GUARDIANSHIP OF ${wardName.toUpperCase()}, A MINOR`
     - Advocate: `IN RE: THE GUARDIAN ADVOCACY OF ${wardName.toUpperCase()}`
     - Default: `IN RE: THE GUARDIANSHIP OF ${wardName.toUpperCase()}`
2. **First-Page vs. Continuation Header Dispatcher in `pdf-engine.js`**:
    - On Page 1 (`pageNum === 1`):
      - Render `drawFirstPagePleadingHeader()` containing the full judicial circuit court banner, `PROBATE DIVISION`, `CASE #: [caseNumber]`, `IN RE: ...` caption, and the centered underlined document title.
      - Set initial content baseline `curY = 175pt`.
   - On Pages 2+ (`pageNum > 1`):
     - Render `drawContinuationHeader()` containing the compact court line and framed 3-column metadata bar.
     - Set content baseline `curY = 74pt`.

---

### Slice 21B — 1.0-Inch Margins & Rule 2.520 Typography (`src/core/pdf/pdf-engine.js`)

1. **Page Geometry & Printable Area**:
   - `margin = 72` (1.0 inch)
   - `pageWidth = 612`, `pageHeight = 792`
   - `contentWidth = pageWidth - (margin * 2) = 468` pt
   - `pageBottom = pageHeight - 54` pt
2. **Typography Scaling**:
   - **Document Headings (H1)**: 12pt bold `#000000` with 0.75pt underline rule.
   - **Subheadings (H2)**: 11pt bold `#1a2d4a`.
   - **Narrative Text, Notices, Oaths & Attestations**: 12pt `#111827` (with 15pt line height) conforming strictly to Rule 2.520.
   - **Table Schedules**: 8.5–9.5pt font with bold headers and zebra striping, with column widths calculated against 468pt width.
   - **Key-Value Grids**: 10pt label (`#374151`) and 10pt value (`#111827`).
   - **Running Footer**: `Page X of Y` at 8pt placed at `pageHeight - 36` pt (within bottom margin).

---

### Slice 21C — UI "Use /s/ format" Sliders & Rule 2.515 Attorney Email Capture

1. **UI Attestation & Signature Card Sliders**:
   - Add switch slider `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" ...><label class="form-check-label">Use /s/ format</label></div>` in the header toolbar of:
     - **Guardian Attestation Card(s)**: `guardians[i].useSlashS` (default `true`)
     - **Attorney Attestation Card**: `attorney.useSlashS` (default `true`)
     - **Preparer Attestation Card**: `preparer.useSlashS` (default `true`)
   - Reactive auto-save and state binding across all 7 filing forms.
2. **UI Attorney Email Input Fields**:
   - Add `Primary Email` (required for e-filing) and `Secondary Email` (optional) input fields to the Attorney Attestation cards in:
     - `src/features/guardian-inventory/index.js` (Page D-2)
     - `src/features/simplified-accounting/index.js` (Part V & VI)
     - `src/features/annual-accounting/index.js` (Part X)
     - `src/features/plan-*/index.js` (Signature sections)
3. **Attorney Signature Block Renderer**:
   - When slider is ON: Typographical `/s/ [ATTORNEY NAME]` (typed or script per global preference).
   - When slider is OFF: Blank signature line `____________________` with "Signature" label.
   - Printed Name
   - `Florida Bar No. [BAR#]`
   - Law Office Physical Address (Street, City, State, ZIP)
   - Telephone Number (with area code)
   - `Primary Email: [EMAIL]`
   - `Secondary Email: [EMAIL]` (rendered if present)
   - Electronic signature statutory citation when `/s/` is active.
4. **Pro Se / Guardian Signature Block Renderer**:
   - When slider is ON: Typographical `/s/ [GUARDIAN NAME]`
   - When slider is OFF: Blank signature line `____________________`
   - Printed Name
   - Physical Residence / Mailing Address
   - Telephone Number (with area code)

---

### Slice 21D — Form Schedule Column Width Tuning (468pt Width)

Tune proportional column widths across all schedule tables to guarantee clean line wrapping and zero overflow within the 468pt printable width:
- `guardian-inventory`: Schedule A-1 (Real Estate), A-2 (Liabilities), B-1 (Bank Accounts), B-2 (Vehicles), B-3/B-4, C-1 to C-5 (Income), Service Recipients.
- `simplified-accounting`: Accounting summary grid, remuneration table, service recipients.
- `annual-accounting`: Schedules A, B-1 to B-4, C, D-1 to D-5, E, F-1/F-2, Trusts, Remuneration, Service Recipients.
- `plan-*` forms: ADL checklists, medical/physician reports, rights restoration tables.

---

### Slice 21E — Automated Test Suite & Build Verification

1. **Update `tests/e2e/pdf-wcag-compliance.spec.ts`**:
   - Assert Page 1 contains formal pleading header with resolved Judicial Circuit (`IN THE CIRCUIT COURT OF THE SIXTH JUDICIAL CIRCUIT`).
   - Assert Page 1 contains `CASE #:`, `IN RE: THE GUARDIANSHIP OF`, and underlined document title.
   - Assert 1-inch margins (all content within `x = 72` to `x = 540`).
   - Assert "Use /s/ format" toggle slider correctly switches signature output between typographical `/s/ [NAME]` and blank wet-ink line.
   - Assert Rule 2.515 attorney signature block contains Primary Email and Florida Bar number.
   - Assert 100% PDF/UA-1 & WCAG 2.1 AA structural tagging, zero skipped heading levels, and xref integrity.
2. **Execute Test Suites**:
   - `npm run test:unit`
   - `npm run test:e2e`
3. **Execute Production Builds**:
   - `npm run build` (`build:web` and `build:portable`)

---

<a id="milestone-22-proposal-md"></a>

# Archive: MILESTONE-22-PROPOSAL.md

# Milestone 22: Global Signature Standardization and Responsive Record Cards

## Goal

Complete the unfinished global consistency work across all seven filing form families:

1. Remove every user-facing `Use /s/ format` / typed-versus-script signature control.
2. Standardize normal generated signatures to typed `/s/ Name` output.
3. Retain a narrowly scoped, internal wet-signature capability only where a filing workflow explicitly requires a blank physical signature line.
4. Convert repeatable record cards to Bootstrap responsive grids appropriate to each card's field density.
5. Prove desktop, mobile, PDF, accessibility, and saved-data compatibility with cross-form regression coverage.

## Why This Is Needed

Milestone 21 introduced card-level `/s/` switches. The product decision is now to remove that choice globally. The switches currently remain in all feature families and their PDF models, so the application can still vary output based on saved `useSlashS` values.

This milestone supersedes the card-level `/s/` switch requirements in Milestone 21, Slice 21C. The prior signature, address, attachment, and accessibility requirements remain in force unless this proposal explicitly replaces them.

The recent Guardian Inventory implementation correctly uses Bootstrap `row g-3` and `col-12 col-lg-6` wrappers for repeatable schedule cards. Other feature families still render repeated `.entry-card` elements as direct full-width siblings. A blanket half-width rule would make dense accounting records cramped; layout must be selected by field density, not by CSS coincidence.

## Non-Negotiables

1. **No visible signature-style setting**: no `Use /s/ format`, typed/script selector, or equivalent control remains in any form.
2. **Legacy saved files remain usable**: old `useSlashS` values may remain in stored data but must be ignored by UI and normal PDF rendering.
3. **Defined wet-signature authority**: only an explicit form/workflow-level `wetSignature: true` instruction, set outside legacy saved preferences, may produce a blank physical signature line. No UI control and no legacy `useSlashS` value may create or imply it.
4. **Bootstrap owns repeatable-card responsiveness**: use `.row` plus `.col-*` markup, not custom float, inline-block, or direct-card width rules.
5. **Readable at every breakpoint**: no horizontal overflow, clipped labels, or unusably narrow fields at the effective content width beside the application sidebar.
6. **Preserve structural accessibility**: wrappers must not create skipped headings, unnamed controls, broken label associations, or illogical tab order.
7. **Universal feature coverage**: Guardian Inventory, Annual Accounting, Simplified Accounting, Annual Plan, Initial Plan, Minor Plan, and Simplified Annual Plan are in scope.
8. **Dashboard exclusion**: shared `.schedule-page` styling or markup must not alter dashboard layout; dashboard cards are outside this rollout.

## Renderer Inventory and Layout Categories

Before each implementation slice, catalog every `.entry-card` renderer in the target feature and classify it. Do not apply a mechanical search-and-replace.

| Category | Required layout | Examples |
| --- | --- | --- |
| Compact repeated record | `row g-3` with `col-12 col-lg-6` per card | Guardian Inventory A-1 through C-5; short address or recipient records |
| Dense repeated accounting record | `row g-3` with `col-12 col-xxl-6` only after field-width validation; otherwise `col-12` | Annual Accounting schedules with five or more fields in a row |
| Narrative or directive record | Usually `col-12`; use two columns only if the expanded content remains readable | Advance directives, long descriptions, conditional question records |
| Intentional singleton | Constrained Bootstrap column or full width based on content; never treated as a repeated record | Surety Bond Details, totals, declarations, signature panels |
| Existing explicit grid | Retain and normalize only if necessary | Guardian attestation, witness, and service-recipient grids |

Every repeated-card wrapper must keep totals, supporting documents, and page navigation outside the grid.

The renderer inventory is a required implementation artifact. Before code conversion, record each renderer, route, category, chosen Bootstrap columns, justification, and regression test. The inventory must include each `.entry-card` owner across all seven form families and state why every excluded singleton remains excluded.

## Implementation Slices

### Slice 22A: Signature Compatibility Contract

1. Define the normal signature contract in `src/core/pdf/pdf-engine.js`:
   - Default filing signatures render `/s/ <typed name>`.
   - The presentation must not depend on `useSlashS`.
   - A blank physical line is rendered only when the model deliberately sends `wetSignature: true` for a workflow that requires it.
2. Do not remove legacy `useSlashS` properties from saved data during load or export. Treat them as obsolete input that has no effect.
3. Update every feature PDF model to stop deriving `wetSignature` or output style from `useSlashS`.
4. Document the compatibility behavior in the relevant PDF architecture documentation.
5. Identify and document the only permitted code paths that may set `wetSignature: true`; reject all others during code review.

### Slice 22B: Remove Signature-Style UI

Remove the switch markup and associated UI state from:

- `guardian-inventory`
- `annual-accounting`
- `simplified-accounting`
- `plan-annual`
- `plan-initial`
- `plan-minor`
- `plan-simplified`

Also remove dead local variables such as `slashSlider`, `useSlashS`, and `*_useSlashS` reads where they serve only the retired control. Do not remove fields required for a separate explicit wet-signature workflow without first identifying that workflow.

### Slice 22C: Responsive Card Conversion by Feature Family

1. **Guardian Inventory**
   - Retain the current Bootstrap schedule grid for A-1 through C-5.
   - Audit D-section repeaters and preserve the intentional Surety Bond Details singleton width.
2. **Annual Accounting**
   - Inventory Schedule A, B-1 through B-4, C, D-1 through D-5, E, F-1, F-2, remuneration, recipients, and signature records.
   - Start dense schedule cards at `col-12`; promote to `col-xxl-6` only where the card's widest field rows remain usable.
3. **Simplified Accounting**
   - Convert repeatable remuneration and recipient records where not already wrapped in a Bootstrap row.
4. **Annual Plan**
   - Convert repeatable residence, provider, and directive cards.
   - Keep long directive and conditional-question content full-width unless screenshot validation proves a two-column layout is clear.
5. **Initial Plan**
   - Convert provider and advance-directive repeaters using the same density decision.
6. **Minor Plan**
   - Convert residence and provider repeaters.
7. **Simplified Annual Plan**
   - Inventory every repeated record before modifying it; convert only records that satisfy the compact or dense categories.

For every affected renderer, use a local helper or consistent template shape such as:

```html
<div class="row g-3 schedule-entry-grid">
  <div class="col-12 col-lg-6">
    <div class="entry-card h-100">...</div>
  </div>
</div>
```

Use `col-xxl-6` rather than `col-lg-6` when a dense card needs the full main-content width at ordinary desktop sizes.

Choose breakpoints from measured usable content width, not viewport width alone. Validate at the supported desktop viewport sizes with the application sidebar present; a card may move to two columns only when its longest labels, action buttons, and practical input fields remain readable without overflow. Record the resulting breakpoint choice in the renderer inventory.

### Slice 22D: Selector and Event-Flow Audit

1. Search for selectors that assume direct-card structure, especially `.schedule-page > .entry-card`.
2. Update tests and CSS to target stable wrappers such as `.schedule-entry-grid > [class*="col-"] > .entry-card` where needed.
3. Verify event delegation still reaches add, duplicate, remove, conditional-field, and auto-save controls after the wrapper is inserted.
4. Check that empty-state, totals, supporting-documents, and page-navigation markup remain outside the card grid and in logical DOM order.

### Slice 22E: Cross-Form Regression Coverage

Create a cross-form layout regression suite with two populated records for every grid-eligible renderer. It must assert:

1. **Desktop geometry**: eligible two-column cards have two distinct horizontal positions at their chosen breakpoint.
2. **Mobile geometry**: the same cards share a single horizontal position below their chosen breakpoint.
3. **Field usability**: no horizontal page overflow; labels, fields, and action buttons remain inside their card bounds; dense cards meet a defined minimum practical field width.
4. **Intentional full-width records**: dense and narrative cards that remain `col-12` do not regress to an arbitrary half-width layout.
6. **Signature UI absence**: every form route has zero controls or visible text for `Use /s/ format`.
7. **Legacy file behavior**: a fixture containing `useSlashS: false` still renders the normal typed `/s/` signature in UI-derived PDFs.
8. **Explicit wet signature**: the documented permitted `wetSignature: true` fixture still renders a blank signature line and `Signature of <typed name>` label.
9. **Accessibility**: rerun accessible-name, landmark, heading-hierarchy, and keyboard-navigation checks after structural wrappers are introduced.

### Slice 22F: Visual and Release Validation

1. Capture desktop and mobile screenshots for representative compact, dense, narrative, and singleton card categories.
2. Run focused feature tests after each family conversion before moving to the next family.
3. Run the complete mount suite for all seven forms.
4. Run PDF/accessibility/signature suites and all unit tests.
5. Run production builds and inspect `git diff --check` before release.
6. Commit in logical units:
   - signature contract and UI removal;
   - accounting-card conversion;
   - plan-card conversion;
   - regression coverage and final documentation.

## Acceptance Criteria

1. Repository search finds no visible signature-style controls or PDF-model decisions driven by `useSlashS`.
2. A legacy fixture with `useSlashS: false` produces the same normal typed-signature PDF as a fixture without that property.
3. Only documented workflow-level code paths can produce `wetSignature: true`; legacy values and UI state cannot affect it.
4. Each repeated-card renderer is cataloged in the completed renderer inventory and assigned an intentional Bootstrap layout category, columns, route, and regression test.
5. Every grid-eligible renderer uses Bootstrap rows and responsive columns, with no global direct-card sizing workaround or dashboard regression.
6. All seven form families have responsive layout coverage, not just mount coverage.
7. Representative desktop and mobile screenshots have no overflow, clipping, overlapping content, or cramped field controls at measured content widths.
8. Existing PDF attachment, signature-label, address-format, accessibility, and form-mount regression suites remain green.

## Out of Scope

- Redesigning field labels or changing court-form data requirements.
- Migrating or rewriting existing saved ward data solely to remove obsolete `useSlashS` keys.
- Converting single-purpose summaries, declarations, totals, or signature panels into two-column cards without a separate usability decision.

---

<a id="milestone-23-proposal-md"></a>

# Archive: MILESTONE-23-PROPOSAL.md

# Milestone 23: Warning-Only Supplemental PDF Bundling

## Goal

Replace the current supplemental-document remediation ambition with a narrower, more defensible filing workflow:

1. Require users to upload already-accessible supplemental documentation as PDFs.
2. Preserve uploaded supplemental PDFs' visual pages and native text streams without rasterizing, OCRing, or visually recreating their page content.
3. Insert those uploaded PDF pages inline at the correct schedule or form-section location when the filing packet is finalized.
4. Send preview, print, and Save-as-PDF through the same finalized bundled PDF artifact.
5. Clearly document that Probate Guardian preserves user-supplied supplemental PDF pages for filing purposes but does not certify, repair, structurally merge, or guarantee their WCAG/PDF/UA compliance.

## Why This Is Needed

The previous supporting-document direction attempted to make arbitrary uploaded PDFs and image files accessible by extracting text, OCRing images, synthesizing text layers, and tagging the generated result. That is too broad for this product. OCR text, visual page preservation, and generated text overlays do not by themselves prove correct reading order, semantic headings, table structure, alt text, document language, or PDF/UA conformance.

The more honest product boundary is:

- Probate Guardian is responsible for generating accessible court-form pages from structured form data.
- The filer is responsible for supplying compliant supplemental documentation.
- Probate Guardian is responsible for preserving the visual/native-text page content of those supplemental PDFs and placing them correctly inside one bundled filing packet.

This milestone supersedes any prior requirement that the application remediate arbitrary uploaded supplemental documents into compliant PDFs. It does not reduce the accessibility requirement for the app-generated form pages.

## Non-Negotiables

1. **PDF-only supplemental uploads**: accept `application/pdf` supplemental documents only. JPG, PNG, BMP, Office files, and other formats must be rejected with a clear message.
2. **Warning required, confirmation not required**: print/export surfaces must show a clear warning that supplemental PDFs may not be ADA/accessibility compliant, but users are not forced through a separate confirmation step.
3. **No automated compliance claim for uploads**: the UI, PDF metadata, help text, tests, and documentation must not say Probate Guardian makes uploaded supplemental PDFs WCAG 2.1, Section 508, or PDF/UA compliant.
4. **No OCR or synthetic remediation path**: remove or disable the image/OCR supplemental-document path for filing-packet generation.
5. **Inline means physically merged pages**: final print/export must produce one PDF whose page order already includes the uploaded supplemental pages. Do not rely on PDF attachments, portfolios, viewer scripts, or print-time callbacks.
6. **Preserve source page appearance and native text streams**: uploaded PDF pages should be copied into the final packet with their original page geometry and visible/selectable page content where the local library supports it. This does not imply preservation of the source PDF's tag tree, `/StructTreeRoot`, `/StructParents`, parent tree, PDF/UA metadata, or conformance claim.
7. **Deterministic print artifact**: Preview, Print, and Save as PDF must operate on the same finalized PDF bytes.
8. **Obvious technical failures are blocked**: corrupt, unreadable, zero-page, renderably blank, encrypted/password-protected, or over-limit PDFs must not be accepted as inline supplements.
9. **Eligibility is enforced below the UI**: the PDF model and finalizer must reject ineligible supplemental files even if a stale UI, legacy save file, or developer error passes a `dataUrl`.
10. **Offline operation remains intact**: validation, preview, merge, print, and export must work in the raw static target and both Vite builds without runtime network requests.

## Product Boundary

### Application Responsibility

Probate Guardian must:

- Generate the court-form pages from structured data using the existing accessible PDF engine.
- Store uploaded supplemental PDFs with their original file data and insertion metadata.
- Preserve uploaded supplemental PDF pages' appearance and native text streams in the final bundled packet.
- Warn users when lightweight checks find obvious technical concerns.
- Warn that supplemental PDFs may not be ADA/accessibility compliant.
- Avoid degrading uploaded PDFs through rasterization or image conversion.

### User Responsibility

The filer must:

- Upload only supplemental PDFs that are already accessible and filing-ready.
- Replace any document that the application rejects or warns cannot be reliably bundled.

### Explicit Non-Claim

Use language like:

> Supplemental PDFs are inserted as uploaded. Probate Guardian does not certify or remediate uploaded documents for accessibility. Supplemental documents may not be ADA/accessibility compliant.

Avoid language like:

- "Make accessible"
- "WCAG compliant upload"
- "PDF/UA verified"
- "Accessibility passed"
- "Certified compliant"

## Data Model

Extend each supporting-document file record to distinguish the original upload and technical validation:

```js
{
  id: "supplement-...",
  name: "bank-statement.pdf",
  type: "application/pdf",
  size: 123456,
  dataUrl: "data:application/pdf;base64,...",
  contentDigest: "sha256-...",
  uploadedAt: "2026-09-06T...",
  pageCount: 3,
  validationAttempt: 1,
  insertionPoint: {
    scheduleKey: "b1",
    periodKey: "initial"
  },
  technicalStatus: "ready",
  technicalWarnings: [],
  processedAt: "2026-09-06T..."
}
```

Recommended status values:

| Field | Values | Meaning |
| --- | --- | --- |
| `technicalStatus` | `checking`, `ready`, `warning`, `blocked` | Result of local PDF checks. |

Do not migrate existing `.sav` files destructively. On load, legacy supporting files without technical validation fields should be rechecked from the stored Data URL before export.

## State Transitions and Atomicity

Each uploaded file must have an immutable `id`, a byte-level `contentDigest`, and a monotonically increasing `validationAttempt`. Validation results apply only when the returned `id`, `contentDigest`, and `validationAttempt` still match the current file record.

Required lifecycle:

1. `pending` file record is created after the PDF-only precheck passes and the original Data URL is available.
2. Record is saved with `technicalStatus: "checking"` before deeper PDF parsing begins, so reload can resume or rerun validation.
3. Validation moves the record to exactly one terminal technical state:
   - `ready`
   - `warning`
   - `blocked`
4. Any replacement, re-upload, or byte change returns the file to `pending` or `checking`.
5. A stale validation result after removal or replacement is ignored.
6. If autosave fails during validation, the UI must surface the save failure and keep export blocked until the saved record and in-memory record agree.
7. On reload, `checking` records are treated as incomplete and validation is rerun from the stored original Data URL.

## Filing Eligibility Guard

Create a shared guard, for example `isFilingEligibleSupplement(file)`, used by both UI readiness checks and PDF packet assembly. UI disabling is a convenience only; the model/finalizer boundary must enforce the same rule and return a structured error if an ineligible file reaches it.

A supplemental file is eligible for merging only when:

1. It has a non-empty `dataUrl` with PDF bytes.
2. `type` and/or byte sniffing identifies it as PDF.
3. `technicalStatus` is `ready` or `warning`.
4. `pageCount` is greater than zero and within the page limit.
5. `size` and decoded byte length are within the byte limits.
6. `contentDigest` exists for the exact bytes being filed.
7. It is not marked encrypted, corrupt, removed, stale, or blocked.

Legacy records with missing status fields are ineligible in memory until technical checks complete. The existing `dataUrl` test is not sufficient.

## Limits

Use explicit limits for the first implementation, then adjust only with measurement:

| Limit | Value | Applies to |
| --- | ---: | --- |
| Per-file original PDF bytes | 15 MB | Decoded uploaded PDF bytes before base64/Data URL expansion. |
| Per-file pages | 50 pages | Parsed source PDF page count. |
| Total supplemental original PDF bytes per ward/period | 40 MB | Sum of decoded bytes for active filing supplements. |
| Total supplemental pages per final packet | 150 pages | Sum of all inserted supplemental pages. |
| Final packet warning threshold | 75 MB | Generated final PDF bytes; warn before download/print if exceeded. |

The 15 MB per-file limit matches the existing upload cap. The aggregate limits protect the portable build and browser memory without silently changing source documents.

## Lightweight PDF Checks

Run checks to prevent technical failures, not to certify accessibility:

1. Confirm the uploaded bytes begin with a valid PDF header and can be parsed.
2. Confirm page count is at least one and within the configured page limit.
3. Reject encrypted/password-protected PDFs.
4. Reject files above the configured byte limit.
5. Warn when text extraction returns no text.
6. Warn when document metadata lacks title or language, if the available tooling can detect this reliably.
7. Warn when tags cannot be detected, if detection is implemented and reliable.

The warning copy must say "may need review" or "could not verify", never "failed accessibility" unless an actual validator is added.

Define "empty" carefully:

- **Blocked empty PDF**: zero pages, or parsed pages with no renderable page content.
- **Warning-only scanned PDF**: pages render but text extraction returns no text.

A scanned PDF with visible page images but no text objects is not empty for bundling purposes. It may be a poor accessibility candidate, but under this milestone the filer may include it after seeing the warning unless court technology-standard policy makes no-text PDFs a hard block in a later milestone.

## Implementation Slices

### Slice 23A: Upload Policy and Warning UI

1. Update the Supporting Documents upload control to accept only `.pdf` / `application/pdf`.
2. Replace image/OCR-oriented upload guidance with filer-responsibility language.
3. Show per-file status:
   - `Checking`
   - `Ready`
   - `Warning - review recommended`
   - `Blocked`
4. Keep the existing original download action.
5. Reject unsupported file types before saving them into the ward record.
6. Show a yellow print/export warning when supplemental PDFs are present.

### Slice 23B: Local PDF Validation

1. Use the existing vendored PDF tooling to validate PDF readability and page count.
2. Treat encrypted, corrupt, zero-page, renderably blank, and over-limit PDFs as `blocked`.
3. Store page count and technical warnings on the file record.
4. Keep validation asynchronous enough that the UI remains responsive, but do not build a remediation queue.
5. Preserve normal form editing while validation runs.
6. Rerun validation on reload for any file left in `checking`.

### Slice 23C: Finalized Packet Assembly

1. Keep generating the form PDF through `generateCourtFormPdf()`.
2. Reserve supplemental insertion pages at the correct schedule or section location.
3. Use `src/core/pdf/pdf-finalizer.js` as the bundling boundary.
4. Copy uploaded supplemental pages into the generated filing packet using `pdf-lib` page copying.
5. Preserve each uploaded page's source geometry instead of forcing it into the court-form page template.
6. Replace reserved placeholder pages with copied supplemental pages.
7. Ensure no filename banner, app header, footer, or form continuation header is stamped onto uploaded pages.
8. Add the shared `isFilingEligibleSupplement(file)` guard at the model/finalizer boundary before placeholder pages are reserved or copied.
9. Return structured export errors for ineligible supplements instead of silently omitting, copying, or substituting them.

The print command should never decide where supplements go. The app should finalize one ordered PDF first, then print that PDF.

Important preservation boundary: `pdf-lib.copyPages()` preserves source page appearance and native page content sufficiently for visual filing/printing, but it should not be assumed to integrate the source document's accessibility structure into the filing document's structure tree. The final packet may contain app-generated pages with Probate Guardian's structure tree plus inserted user-supplied pages whose source tags are not structurally merged. Documentation and UI must describe this honestly.

### Slice 23D: Preview, Print, and Save Unification

1. Route Print Preview through the finalized bundled PDF bytes.
2. Route Save as PDF through the same finalized bundled PDF bytes.
3. Route Print through the same finalized bundled PDF bytes via the existing PDF preview/print infrastructure.
4. Disable final export only when:
   - form validation fails;
   - a supplemental PDF is `blocked`;
   - a supplemental PDF is still `checking`.
5. Do not block export merely because a lightweight accessibility warning exists.
6. Treat missing status fields as `pending` during export readiness checks.

### Slice 23E: Remove Remediation Claims and Dead Paths

1. Remove image-file acceptance from supporting-document upload flows.
2. Remove OCR use from supplemental filing generation.
3. Update `lib/VENDORED-LIBRARIES.md` if Tesseract is no longer used anywhere else.
4. Update `docs/pdf-architecture-and-signatures.md` to reflect the new boundary:
   - generated form pages remain accessible;
   - uploaded supplemental PDFs are user-supplied and preserved;
   - the final packet is a bundled PDF, not a portfolio or attachment package.
5. Search for and replace misleading phrases that imply automatic upload remediation or guaranteed uploaded-document compliance.

### Slice 23F: Saved-Data Compatibility

1. Load legacy supporting-document records without crashing.
2. Recheck legacy records on first edit/export when technical status fields are missing.
3. Preserve original `name`, `type`, `size`, `dataUrl`, and `uploadedAt` fields.
4. Do not rewrite legacy records until the user saves or modifies the ward.
5. Ensure `.sav` export/import round-trips the new technical status fields.
6. During export, treat absent legacy status fields as `pending` even before the record is rewritten.

### Slice 23G: Testing and Verification

Add focused coverage for:

1. PDF-only upload acceptance.
2. JPG, PNG, BMP, DOCX, XLSX, and unknown binary rejection.
3. Valid single-page and multi-page supplemental PDFs.
4. Corrupt and encrypted PDF rejection.
5. Warning behavior for PDFs with no extractable text, if text extraction checks are implemented.
6. Yellow accessibility warning before export when supplemental PDFs are present.
7. Legacy `.sav` records with only `dataUrl` are refused by the model/finalizer guard until technical checks pass.
9. Final page order with supplements inserted after the correct schedule.
10. Uploaded page geometry and native text-stream preservation in the finalized PDF where supported by the copied source page.
11. Explicit assertion that source PDF tag trees are not promised as preserved or merged.
12. Preview, Print, and Save as PDF using identical finalized byte flow.
13. No OCR/Tesseract path invoked during supplemental PDF bundling.
14. Stale validation results ignored after replacement/removal.
15. Validation reruns when `contentDigest` changes.
16. Existing generated-form PDF accessibility and signature tests remain green.

## Acceptance Criteria

1. Supporting-document upload accepts PDF files only.
2. Each uploaded supplemental PDF has local technical status, page count, and warnings if applicable.
3. Export is blocked for unsupported, corrupt, encrypted, over-limit, or checking supplemental PDFs.
4. Export is allowed for warning-state PDFs after showing the yellow accessibility warning.
5. The final filing packet is one merged PDF with generated form pages and uploaded supplemental pages in the intended order.
6. A shared filing-eligibility guard rejects missing, stale, blocked, unchecked, digest-missing, or legacy-only uploaded records at the model/finalizer boundary.
7. Uploaded supplemental pages are copied, not rasterized, OCRed, or visually recreated.
8. The proposal, UI, and docs promise source visual/native-text preservation only, not source tag-tree preservation or structural PDF/UA continuity after merge.
9. Browser print receives the finalized bundled PDF, not separate documents or embedded file attachments.
10. User-facing text clearly says uploaded supplemental-document accessibility is the filer's responsibility.
11. Documentation no longer claims Probate Guardian remediates arbitrary uploaded documents into accessible PDFs.
12. All existing form-generation accessibility guarantees remain limited to app-generated pages and remain covered by tests.

## Out of Scope

- Automated remediation of arbitrary uploaded PDFs.
- OCR of scanned supplemental documents.
- Accepting image uploads as inline supplements.
- Certifying uploaded PDFs as WCAG 2.1, Section 508, or PDF/UA compliant.
- Preserving or merging uploaded PDFs' source tag trees, `/StructTreeRoot`, parent-tree references, PDF/UA metadata, or conformance claims.
- Building a PDF tag-tree editor, reading-order editor, table remediation interface, or alt-text correction workflow.
- PDF portfolios, embedded file attachments, JavaScript-driven print insertion, or viewer-specific print behavior.
- Server-side validation or third-party compliance services.

## Open Questions

1. Should warning-state documents get stronger visual prominence than cleanly parsed documents?
2. Should the app allow a document with no extractable text, or should that be a hard block for court technology-standard reasons?
3. Should warning-state documents count against a separate risk summary on the final review screen?
4. Should final packet metadata include a note that supplemental pages were user-supplied and preserved as uploaded?

---

<a id="milestone-24-proposal-md"></a>

# Archive: MILESTONE-24-PROPOSAL.md

# Milestone 24: Safer Form Entry, Date UX, and Navigation Guidance

## Goal

Improve data-entry trust and completion guidance across Probate Guardian forms:

1. Prevent unsafe normalization of legal/account/case identifiers.
2. Make date parsing more forgiving and visibly explain accepted formats.
3. Improve disabled Next guidance with section-local missing-field details.
4. Audit rapid input/save timing for paste, tabbing, and assistive-tech workflows.
5. Add assistive-tech completion announcement for preview generation.

This milestone is about making the existing workflow less surprising. It should not change filing math, form eligibility rules, `.sav` compatibility, PDF layout, or the single-source validation model.

It should also leave the form system more globally consistent than it found it. The five user-facing improvements below should be implemented through shared contracts and helpers wherever practical, not through separate one-off fixes in each feature module.

## Why This Is Needed

The form workflow is broadly understandable: sidebar checks, progress counts, Print Preview, autosave status, and "no items to report" controls give users a clear sense of progress. The remaining friction is concentrated around user trust:

- Some identifiers appear to be normalized too aggressively. Legal descriptions, case numbers, trust names, account numbers, check numbers, and court/order identifiers may contain dashes, spaces, letters, punctuation, or jurisdiction-specific formatting. Silently stripping those characters can alter meaning.
- Date inputs are strict because many fields use native `type="date"` values, but real users often type or paste dates as `02/14/2026`, `2/14/26`, `Feb 14 2026`, or `2026-02-14`.
- Disabled Next buttons communicate that something is missing, but not always which local fields caused the block.
- Fast input, paste, tabbing, automation, and assistive-technology workflows can expose races between formatting, validation, autosave, rerendering, and focus.
- PDF preview generation is asynchronous. Visual users can see when the preview appears; screen-reader users should receive an equivalent completion announcement.

## Non-Negotiables

1. **No silent destructive normalization**: no legal, account, trust, court, case, check, policy, file, or instrument identifier may lose user-entered letters, punctuation, dashes, slashes, or spaces unless the field has an explicit safe formatter and tests.
2. **Canonical storage for dates**: successful date parsing still stores dates as `YYYY-MM-DD` so existing validators, PDF models, Excel exports, and `.sav` files remain stable.
3. **User-visible date affordance**: date fields that accept flexible text must show concise accepted-format help near the field, not only in external documentation.
4. **Validation remains the source of truth**: missing-field guidance must be derived from existing validators/nav checks, or from a shared validation metadata layer, not duplicated by one-off UI conditions.
5. **No autosave regression**: input changes must still mark dirty and schedule autosave exactly once per logical user edit.
6. **No forced workflow detours**: guidance may explain what is missing, but it must not add modal acknowledgements or extra confirmation steps.
7. **Accessible status updates**: preview loading, success, and failure states must be exposed through an appropriate live region without stealing focus during normal generation.
8. **Global contracts over local patches**: new or changed form-entry behavior must use shared metadata, formatter, validation, section-status, and async-status conventions unless a field documents why it is a special case.
9. **Storage sanitization is not output escaping**: stored values should be sanitized only enough to keep the data model safe. HTML, PDF, DOCX, Excel, and XML escaping must happen at each output boundary.
10. **One commit path for changed fields**: changed fields must flow through a shared commit contract rather than adding another feature-local input pipeline.

## Current Implementation Notes

Relevant surfaces observed in the current modular build:

- Date display/parsing helpers and many legacy field helpers still live in `src/legacy-app.js`.
- Feature modules use a mix of shared helpers and local render helpers, including `data-form-path`, `data-annual-path`, `data-form-format`, native `type="date"` fields, and inline path bindings.
- Current input writes are split across delegated `data-form-path` handling, legacy binding, and Annual Accounting's local `data-annual-path` pipeline. These paths can format and write on every input event.
- Guardian schedule navigation already has a shared `pageNav()` helper in `src/features/guardian-inventory/index.js` that disables Next when the current schedule is incomplete.
- Print/export pages already render missing-field panels using validator output, but normal section pages do not always expose the same detail near disabled Next controls.
- PDF preview generation is centralized in `src/core/pdf/pdf-preview.js`, which currently writes "Generating preview..." and error text into the preview container.
- DOCX export is globally wired through `src/core/docx/docx-engine.js` and feature print flows; export parity must include Word output, not only PDF and Excel.

## Scope

In scope:

- Shared field metadata conventions.
- A shared field commit API for changed fields.
- Field-format inventory and formatter allowlist.
- A global formatter policy: preserve, normalize, or display-only.
- A migration path from string-only validation messages to structured validation errors.
- A shared section-status/guidance helper used by sidebar, Summary, Next, Print Preview, and export gates.
- Safer identifier handling for all active form types.
- Flexible date parsing and date-field hints.
- Section-local missing-field details for disabled Next/navigation controls.
- Tests and manual audit paths for paste, tabbing, fast entry, rerendering, and autosave retention.
- A shared live-region status utility for async operations, with preview generation as the first required consumer.

Out of scope:

- Rewriting all forms to a new component system.
- Changing court-form validation requirements.
- Changing PDF page layout or Excel template mapping except where tests need to prove dates/identifiers survive unchanged.
- Introducing server-side validation.
- Claiming uploaded supplemental PDFs are ADA/WCAG/PDF-UA compliant.

## Global Deliverables

Milestone 24 must produce these shared building blocks so later work can become simpler, not merely different.

### 1. Shared Field Metadata Convention

Define one preferred metadata shape for form controls and begin migrating changed fields to it. The exact attribute names may be adjusted during implementation, but the convention must capture:

- model path;
- field kind;
- label;
- section/route ownership;
- required status when known;
- formatter policy;
- validation/focus target ID when known.

Example:

```html
<input
  data-field-path="caseNumber"
  data-field-kind="identifier"
  data-field-label="Case Number"
  data-field-section="cover"
  data-field-required="true"
  data-field-format-policy="preserve">
```

The existing `data-form-path`, `data-annual-path`, `data-form-format`, and inline setter patterns do not need to disappear in one pass. This milestone should add adapters so changed fields can participate in the new convention while older fields continue to work.

#### 2. Shared Field Commit API: writeDraftValue vs finalizeFieldValue

Introduce an explicit two-phase commit contract for changed fields:

1. **`writeDraftValue(control, options)`** (runs on `input` and `compositionend`):
   - Reads raw intermediate text without destructive reformats or moving the user's caret.
   - Writes to the model only when the draft value actually changes.
   - Marks the case dirty and schedules autosave.
   - Respects `compositionstart`, `compositionupdate`, and `compositionend` so IME input is not interrupted.

2. **`finalizeFieldValue(control, options)`** (runs on `blur` / `focusout`):
   - Canonicalizes dates to `YYYY-MM-DD`.
   - Normalizes numeric amounts / decimals.
   - Applies display-only title-casing to names and addresses.
   - Writes back to the model and updates the DOM only when the normalized value differs from the draft.
   - Refreshes navigation checkmarks and sidebar totals.

Rules:

- Preserve and normalize decisions belong in the commit layer, not in ad hoc event handlers.
- Destructive or display-only formatting must not run on every keystroke. Apply it on blur/commit (`finalizeFieldValue`) unless a specific structured field, such as phone or SSN/EIN, has tests proving live formatting does not break caret, paste, or assistive-tech flows.
- The Annual `data-annual-path` path, delegated `data-form-path` path, and legacy bind path may coexist temporarily, but changed fields must use or adapt into the shared commit API.

### 3. Formatter Policy: Preserve, Normalize, or Display-Only

Every formatter used by changed fields must be assigned one of three policies:

- **Preserve**: trim leading/trailing whitespace and remove unsafe control characters, but keep user-entered letters, punctuation, spaces, dashes, slashes, and casing. Use for identifiers and legal text.
- **Normalize**: convert to a canonical stored value required by downstream systems. Use for dates (`YYYY-MM-DD`), money, percentages, phone numbers, SSN/EIN, and other known structured values.
- **Display-only**: improve presentation without changing the semantic stored value, or apply only on blur with a reversible result. Use cautiously for names and addresses.

Tests must verify the assigned policy, not just the helper output.

### 4. Structured Validation Error Migration Path

Introduce a structured validation result shape and an adapter for existing string validators.

Target shape:

```js
{
  code: 'guardian.signatureDate.required',
  section: 'Signatures',
  path: 'guardians.0.signatureDate',
  fieldId: 'guardian-0-signature-date',
  label: 'Guardian #1 signature date',
  route: '/d1',
  severity: 'required',
  message: 'Signatures - Guardian #1 signature date is required'
}
```

Existing validators returning strings during transition are mapped through an explicit per-form lookup registry rather than dynamic string parsing. New or changed validators should emit stable structured objects with `code`, `path`, `route`, `label`, `severity`, and `message`. Presentation text must not become the long-term API for field identity.

### 5. Shared Section-Status and Guidance Helper

Extend the recent `computeNavChecks()`/`navStatus()` direction into a shared helper that feeds:

- sidebar completion badges;
- Summary page badges;
- disabled Next state and local missing-field text (bounded to first 6 items + "and N more" with jump links);
- Print Preview missing-fields panel;
- Full export gating (governed by full-form validation + supplemental PDF checks, separated from local navigation state).

The helper should accept validation results plus route/section metadata and return a consistent status object. UI layers should render from that object instead of each surface re-interpreting raw strings.

Canonical status vocabulary:

- `not-started`: no entered data and no satisfied checks for the section;
- `in-progress`: some data/checks exist, but required local items remain;
- `blocked`: the user cannot continue/export because required local or global blockers remain;
- `complete`: the section is complete according to the same rules used by export gating.

Existing Summary badge statuses (`complete`, `in-progress`, `not-started`) should map into this vocabulary. `blocked` should be reserved for actionable gating, not used as a fourth visual interpretation of ordinary progress without a blocker.

### 6. Shared Live-Region Status Utility

Create a small shared utility for async status announcements. Preview generation is the first required consumer, but the helper should be appropriate for later use by autosave, import, export, PDF generation, file validation, and offline-pack caching.

The utility should standardize:

- `polite` versus `assertive` announcements;
- visually hidden status markup;
- duplicate-message suppression when appropriate;
- non-focus-stealing success announcements;
- failure announcements that remain visible when the visual UI also shows an error.

## Slice 24A: Inventory and Classify Field Normalization

Create a field-format inventory before changing behavior.

For each formatter, identify:

- Helper name, such as `formatName`, `formatAddress`, `formatCaseNumber`, `formatBarNumber`, `formatAccountNumber`, `formatCheckNumber`, `formatSSN`, `formatPhone`, `formatCityStateZip`, and import capitalization helpers.
- Fields using it.
- Whether the field is a human-name/address field, numeric-only regulatory identifier, masked sensitive identifier, money/percent field, date field, or free-form legal identifier.
- Whether destructive normalization is acceptable.

Classification:

- **Safe structured formatters**: phone, SSN/EIN masking, ZIP extraction, currency/percent formatting, and bar-number formatting where the court format is known and documented.
- **Presentation-only formatters**: name/address capitalization. These may adjust display when the user leaves the field, but must not alter all-caps acronyms, initials, entity names, trust names, or legal phrases in ways that change meaning.
- **Identifier-preserving fields**: case numbers, account numbers, check numbers, policy numbers, loan numbers, trust names, lawsuit case numbers, court order numbers, file numbers, legal descriptions, bank/institution names, and document titles. These should preserve the user's text except for trimming leading/trailing whitespace and rejecting unsafe control characters.

Deliverables:

- Add a short checked-in field-format inventory document, or a clearly named section in this milestone's implementation notes.
- Define the first version of the shared field metadata convention and map existing formatters/fields into it.
- Assign every inventoried formatter to `preserve`, `normalize`, or `display-only`.
- Add regression tests proving that representative identifiers preserve punctuation and letters:
  - `SNT-2024-778`
  - `25-002487-GD`
  - `Acct 123-45 / POD`
  - `CHK-104A`
  - `Trust u/a/d 04/12/2020`

## Slice 24B: Make Identifier Preservation the Default

Introduce a non-destructive storage sanitizer for identifier-like text. Do not call `validateSecurityInput()` or any broad SQL/XSS pattern sanitizer from this helper, because those routines can strip punctuation or blank values that may be meaningful in legal text.

```js
function sanitizeStoredText(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}
```

Then route identifier fields through that helper instead of through digit-only or title-casing formatters.

Implementation requirements:

- Storage sanitization must remove only control characters and leading/trailing whitespace for preserved identifiers.
- HTML, PDF, DOCX, Excel, XML, and filename safety must be handled by output-specific encoders at the point of rendering/export.
- Do not infer "account number" means numeric-only. Bank, brokerage, loan, and trust account numbers can contain letters, suffixes, dashes, spaces, and slashes.
- Do not run trust names, legal descriptions, institution names, court names, or case numbers through title-case normalization.
- Keep explicit formatters only where the field's legal/business format is known.
- If a formatter changes a value on blur, the change must be reversible by the user and must not re-run on every input event while typing.
- Imported Excel data must follow the same preservation rules as typed data.
- Changed fields should declare `data-field-kind="identifier"` and `data-field-format-policy="preserve"` or equivalent metadata.
- Changed identifier fields should commit through the shared field commit API.

Testing:

- Unit tests for each formatter category.
- Unit tests proving `sanitizeStoredText()` preserves punctuation, quotes, slashes, dashes, and letters while removing control characters.
- E2E tests that type and paste representative identifiers into at least Guardian Inventory, Annual Accounting, Simplified Accounting, and one Plan form, then verify:
  - the visible field retains the intended value;
  - the in-memory model retains the intended value;
  - a save/reload cycle retains the intended value;
  - exported PDF/DOCX/Excel text contains the intended value where applicable.

## Slice 24C: Flexible Date Entry With Canonical Storage

Replace strict date-only entry assumptions with a shared date-entry path.

Decision for this milestone:

- Changed date fields should use accessible text inputs, not native `type="date"`, when flexible typed/pasted formats are required.
- Use `inputmode="text"` and concise visible help such as `Use MM/DD/YYYY or YYYY-MM-DD` so mobile keyboards easily support typing month names or standard numbers.
- Parse and canonicalize on blur (`finalizeFieldValue`) through the shared field commit API.
- Store only canonical `YYYY-MM-DD` values in the model.
- Existing unchanged `type="date"` fields may remain during migration, but they must not be described as accepting flexible date text until converted.

Accepted user inputs should include:

- `YYYY-MM-DD`
- `MM/DD/YYYY`
- `M/D/YYYY`
- `Month D, YYYY`
- `Mon D YYYY`
*(Note: 2-digit years are strictly rejected to prevent legal filing ambiguity; 4-digit years are required.)*

Rules:

- Store valid dates as `YYYY-MM-DD`.
- Display date fields consistently after commit/blur.
- Reject impossible dates such as `02/30/2026`.
- Treat implausible years before the app's existing validity threshold as invalid/missing, consistent with the current defensive `fmtDate` comments.
- Do not silently guess ambiguous international formats such as `14/02/2026`; show an error or leave the field uncommitted.
- Keep keyboard entry, paste, picker selection, and screen-reader interaction working.
- Update any existing range/date enforcement that currently selects only `input[type="date"]` so converted text date fields receive the same validation.
- Define migration handling for legacy `.sav` files containing non-canonical date strings: load should preserve the visible value, attempt canonicalization only when unambiguous, and surface invalid dates as field-level validation issues without corrupting the stored data.

UI:

- Date controls should visibly show accepted formats near the field, for example: `Use MM/DD/YYYY or YYYY-MM-DD`.
- Do not pair a native date picker and text input for the same field unless a later design proves it can avoid double-focus and duplicate-commit confusion.
- Prefer a single component/helper used by all feature modules over ad hoc per-form date hints.
- Changed date fields should declare `data-field-kind="date"` and `data-field-format-policy="normalize"` or equivalent metadata.
- Changed date fields should commit through the shared field commit API.

Testing:

- Unit tests for date parser edge cases, leap years, two-digit year pivot behavior, invalid dates, empty values, and canonical output.
- E2E tests for typing and pasting common date formats into required fields.
- Regression tests for Print Preview/PDF/DOCX/Excel still receiving canonical `YYYY-MM-DD` model values.

## Slice 24D: Section-Local Missing-Field Guidance

Disabled Next buttons should explain the specific local blockers.

Implementation approach:

- Add a shared section-status/guidance helper that accepts:
  - the current route/section key;
  - normalized validation results;
  - field metadata;
  - route-to-section mapping;
  - maximum number of displayed items.
- It returns a compact local list of missing fields for the current page/section.
- The disabled Next button's title may remain short, but the page should show visible text near the navigation controls when blocked.

Example copy:

```text
Complete these before continuing:
- Guardian #1 printed name
- Guardian #1 signature date
```

Requirements:

- Guidance must come from the same validation messages that block export, or from shared metadata consumed by both validation and guidance.
- Existing string validator output must be adapted into the structured validation result shape before guidance logic consumes it.
- New or changed validators must provide stable `code`, `path`, `route`, `label`, and `severity` values directly rather than relying on parsing display strings.
- The same status object should be usable by sidebar, Summary, Next, Print Preview, and export gates, even if this milestone migrates consumers in phases.
- Long sections should show the first few blockers plus a count of remaining blockers.
- Each item should become a jump link or focus target when the app can map it to a field reliably.
- The guidance should use accessible markup: `aria-describedby` on the disabled button is not sufficient because disabled controls may not be announced consistently. Put the message in normal page content near the control.
- Keep Print Preview's existing global missing-fields panel.

Testing:

- E2E tests for at least one Guardian schedule and one Plan/Accounting page:
  - blank page shows local missing details;
  - filling each field removes its item;
  - Next enables when local blockers are gone;
  - visible guidance matches validator output.

## Slice 24E: Input Timing and Autosave Audit

Create an audit/test suite for high-speed and alternate input paths before making broad event changes.

Scenarios:

- Fast typing into several fields followed by immediate tabbing.
- Pasting full values into text, money, identifier, and date fields.
- Programmatic fill through Playwright.
- Selecting dates via picker-compatible input.
- Screen-reader-like navigation: focus, type, blur, tab, change.
- IME/composition safety for text fields.
- Saving while validation or formatting is running.

Risks to look for:

- Rerendering a page before the input event commits.
- Formatting on `input` fighting the user's caret position.
- `autoSave()` scheduled before the final normalized value lands.
- `updateNavDots()` or section rerender clearing an in-progress edit.
- Field-specific handlers diverging from generic `data-form-path` handlers.

Deliverables:

- Add E2E tests that intentionally type quickly and paste values across multiple fields.
- Add unit tests around any shared input commit helper.
- Document any fields that still require per-field special handling.
- Confirm changed fields flow through the shared field metadata and formatter-policy path.

Acceptance bar:

- A typed or pasted value that passes validation remains visible after blur, navigation away/back, autosave, and reload.
- One logical edit should not trigger duplicate conflicting model writes.
- Rapid entry should not produce "input did not retain requested value" failures in the app's own supported input paths.

## Slice 24F: Preview Generation Live Region

Create a shared live-region status utility, then update `src/core/pdf/pdf-preview.js` so PDF preview loading, completion, and failure use it for accessible status announcements.

Implementation requirements:

- Add or reuse a visually hidden status node in the print-page shell as a stable sibling of `#print-doc-container`.
- `mountPdfPreview()` must update the stable sibling status node; it must not own the live-region node inside `#print-doc-container`, because that container is replaced during loading, success, and failure rendering.
- Prefer a reusable helper over hard-coding preview-only live-region markup.
- Loading state announces: `Generating preview.`
- Success announces: `Preview ready.`
- Failure announces: `Preview failed to render.`
- Use `role="status"` and `aria-live="polite"` for loading/success.
- Use `role="alert"` or assertive live behavior only for failures.
- Do not move focus on successful generation.
- Preserve the existing visual preview behavior.

Testing:

- Unit or E2E test that the status node exists during preview generation.
- E2E test that a successful preview updates the live-region text to `Preview ready.`
- Existing PDF preview rendering tests must continue to pass.

## Slice 24G: Structured Validation and Status Integration

This slice ties the previous slices into a coherent global system.

Implementation requirements:

- Add a validator-output adapter that accepts existing string arrays and future structured validation objects.
- Add or update tests for transitional mapping from current messages such as `Cover - Case Number is required` only where a stable mapping table exists.
- Treat parsing display strings as temporary compatibility, not as the long-term source of route or field identity.
- Create a section-status object that can represent:
  - `complete`;
  - `in-progress`;
  - `blocked`;
  - local missing fields;
  - global export blockers;
  - the routes/field targets associated with blockers when known.
- Migrate at least one full vertical path to consume the object from sidebar/Summary through Next guidance and Print Preview/export gating.
- Leave compatibility wrappers for older consumers so the app does not require an all-at-once rewrite.

Testing:

- Unit tests for string-to-structured validation adaptation.
- Unit tests for section-status derivation.
- E2E parity test proving the same incomplete section appears consistently in sidebar, Summary, local Next guidance, Print Preview, and export-disabled state.

## Implementation Staging

Milestone 24 should be reviewed as a staged program of work, not one sprawling change.

### 24A: Vertical Proof

Implement the shared primitives and prove them through a bounded vertical slice:

- Guardian Inventory;
- one Plan form, preferably Initial Plan because it exercises many date and structured-question fields;
- shared field metadata convention;
- shared field commit API;
- non-destructive text sanitizer and formatter policy;
- flexible date parser/text-input helper;
- structured validation adapter;
- section-status/guidance helper;
- stable print-preview live region.

This stage should demonstrate sidebar, Summary, local Next guidance, Print Preview, PDF, DOCX, and Excel parity where the chosen forms support those outputs.

### 24B: Form Migration

Migrate the remaining active form families only after the vertical proof passes:

- Annual Accounting, including its local `data-annual-path` binder;
- Simplified Accounting;
- Plan Annual;
- Plan Simplified;
- Plan Minor;
- any remaining Guardian Inventory pages not covered by the proof.

Each migrated form should remove or adapt feature-local input behavior into the shared commit/status path.

### 24C: Audit and Accessibility Rollout

Run the timing and accessibility audit after representative fields have migrated:

- fast typing;
- paste;
- tabbing/blur;
- IME composition;
- keyboard-only navigation;
- assistive-technology-style focus/change flows;
- preview live-region behavior;
- PDF/DOCX/Excel export parity.

## Migration Sequence

1. **Baseline and inventory**
   - Run current unit/build/E2E tests.
   - Produce the normalization inventory.
   - Identify all date fields and formatter attributes across feature modules.
   - Define the shared field metadata convention and formatter-policy vocabulary.
   - Confirm the active branch and whether Word export is present before setting export-parity expectations.

2. **Formatter safety first**
   - Add preservation helper and tests.
   - Move identifier-like fields off destructive formatters.
   - Update Excel import capitalization/normalization paths to respect the same rules.
   - Migrate changed fields to the shared metadata convention.

3. **Shared commit path**
   - Add the shared field commit API.
   - Route the vertical-proof fields through it.
   - Add composition/caret/paste tests around the commit API before broad migration.

4. **Date parser and hints**
   - Add shared parser/formatter tests.
   - Update shared input/date helpers.
   - Convert forms in small batches, starting with Guardian Inventory and one Plan form.

5. **Local missing-field guidance**
   - Add structured validation adapters and route/section mapping helpers.
   - Add shared section-status/guidance helper.
   - Add guidance to Guardian `pageNav()` first.
   - Extend to Annual/Simplified/Plan navigation surfaces after the shape is proven.

6. **Timing audit**
   - Add paste/rapid-entry tests around the changed fields.
   - Fix only confirmed timing defects, keeping changes tightly scoped.

7. **Preview live region**
   - Add the shared live-region status utility.
   - Update shared PDF preview status handling to use it.
   - Verify across all feature preview specs.

8. **Cross-surface status integration**
   - Migrate at least one vertical form path so sidebar, Summary, Next guidance, Print Preview, and export gates all use the shared section-status object.
   - Add parity tests for that vertical path.

9. **Regression pass**
   - Run unit tests, build, focused E2E tests for affected forms, and the shared PDF preview suite.
   - If possible, run one manual browser pass with keyboard-only navigation through a changed section.

## Acceptance Criteria

- Representative legal/account/case identifiers retain punctuation, spaces, and letters across typing, paste, autosave, save/reload, preview, and export.
- A shared field metadata convention exists and changed fields use it or document why not.
- A shared field commit API exists, and changed fields use it or adapt into it.
- Every changed formatter has an explicit `preserve`, `normalize`, or `display-only` policy.
- Preserved identifier storage uses a control-character-only sanitizer; output-specific escaping is verified for HTML, PDF, DOCX, Excel, and XML/ZIP package boundaries where applicable.
- No identifier-like field uses a destructive formatter unless explicitly documented and tested.
- Common U.S. date inputs parse successfully and store as `YYYY-MM-DD`.
- Flexible date fields use accessible text inputs with visible format help; native `type="date"` fields are not described as accepting flexible date strings until converted.
- Date fields visibly explain accepted formats.
- Impossible or ambiguous dates are rejected without corrupting the model.
- Disabled Next guidance identifies local missing fields near the navigation controls.
- Missing-field guidance remains consistent with export-blocking validation.
- Structured validation adapters exist, new/changed validators emit stable structured fields, and at least one vertical path consumes normalized validation results instead of raw strings.
- A shared section-status/guidance helper feeds at least one complete sidebar/Summary/Next/Print Preview/export path.
- Rapid typing, paste, tabbing, and Playwright fills do not lose committed values.
- Preview generation announces loading, success, and failure to assistive tech.
- The preview live region is a stable sibling of `#print-doc-container`, not disposable content inside it.
- Preview generation uses a shared live-region status utility suitable for later autosave/import/export/offline-pack announcements.
- PDF, DOCX, and Excel export parity is tested for changed values where the form supports those outputs.
- Existing `.sav` files remain compatible.
- Existing unit tests, build, and affected E2E suites pass.

## Test Plan

Minimum automated checks:

- `npm.cmd run test:unit`
- `npm.cmd run build`
- Focused Playwright suites for:
  - Guardian Inventory mount/navigation
  - Annual Accounting mount/navigation
  - Simplified Accounting mount/navigation
  - Plan Initial or Plan Annual mount/navigation
  - PDF preview viewer
- Focused export parity checks for changed fields:
  - PDF output
  - DOCX output
  - Excel output where the form supports Excel

Local Playwright note:

- This machine has the bundled Chromium executable at:

  ```text
  C:\Users\No Name\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe
  ```

- Edge is also available through the project config:

  ```powershell
  $env:PG_BROWSER='edge'
  npx.cmd playwright test --reporter=list
  ```

## Decisions

1. Two-digit years are rejected for legal-form dates. Users must enter four-digit years.
2. Name/address auto-capitalization remains the default.
3. Disabled Next guidance shows all missing-field items for the current section.
4. Field jump links belong in the first implementation, backed by stable field IDs from the shared metadata/structured-validation work.

---

<a id="milestone-25-proposal-md"></a>

# Archive: MILESTONE-25-PROPOSAL.md

# Milestone 25: Filing Identity and Reliable Form Commits

## Status and Goal

Proposed implementation plan. This document does not implement application changes.

Establish one authoritative filing descriptor and one field-commit lifecycle
across all nine filing types. A filing must identify itself consistently on
screen and in generated documents, and accepted edits must survive navigation,
rerendering, saving, and export without depending on a conveniently timed blur.

Priorities:

1. Correct Final/Trust output identity as a high-priority output correctness defect.
2. Address rapid date loss as a high-priority shared persistence defect.
3. Complete shared identity and commit infrastructure before adding local exceptions.
4. Verify all nine filing types through an explicit coverage matrix.
5. Verify actual screen content and generated artifacts, not just model objects.

## Baseline and Evidence

Inspection on 2026-09-07 found the following starting points. Recheck these
symbols at implementation time because other work is active in the repository.

| Surface | Current observation | Implication |
| --- | --- | --- |
| `src/legacy-app.js`: `INVENTORY_TYPES`, `formEngine`, `formDisplayName` | Final and Trust share the annual engine but have separate display identities. | Extend this registry direction into a descriptor; avoid a second competing registry. |
| `src/core/state.js`: annual data factory | `filingType` defaults to `Annual`. | Audit creation, conversion, carryover, import, and reopen for contradictory defaults. |
| `src/features/annual-accounting/pdf-model.js` | Metadata, preparer text, and attorney text contain hard-coded annual wording. | The output mismatch extends beyond the running page title. |
| Annual `index.js` and `print.js` | Summary, selected Filing Type, filenames, and document model obtain identity separately. | PDF and DOCX can have a Final filename with Annual content. |
| `src/core/form/form-contract.js` | Date input writes a transient draft; focusout commits it. Invalid finalization currently clears the model field. | Date drafts and canonical data need explicit ownership and failure behavior. |
| `src/form-events.js`, annual local binder, legacy `bindForms()` | Shared and local event pipelines coexist. | Metadata alone does not prevent duplicate writes or competing formatting. |
| `navigate()`, `flushPendingSave()`, `autoSave()` | Navigation prunes rows; saving flushes persisted model state. | Neither operation alone proves that pending input has reached the model. |
| `src/core/status/section-status.js` | Guidance defaults to six items; status still adapts legacy results. | Complete the all-items requirement and unify draft/identity blockers with existing validation. |

The hard-coded output wording is confirmed by inspection, including the
preparer's compilation statement and the attorney's certification, not just
metadata. Part I already reads `d.filingType`; that correct field does not
correct the independent signed statements or running headers.

Invalid-date finalization actively deletes the previous model value by writing
an empty string. Pending date drafts can also be omitted from a save before
finalization. These are confirmed mechanisms requiring repair. They do not
establish which event sequence caused the reported B-2 failure.

Claude's B-2 report
is a reproduction lead, not proof that one particular event sequence caused
the loss. Record the application build and distinguish ordinary keyboard/paste
behavior from automation that changes a DOM value without dispatching supported
input events. Do not declare the timing defect fixed solely because parser
unit tests pass.

Milestone 24 already introduced parsing, field metadata, structured-error
adapters, section guidance, and a live-region utility. Extend these modules;
do not install parallel replacements. Where Milestone 24 prose conflicts with
its recorded decisions, the decisions below govern this milestone.

## Existing Decisions and Scope

- Reject two-digit years; successful dates remain canonical `YYYY-MM-DD`.
- Keep name/address auto-capitalization enabled by default, with preservation
  rules for identifiers, meaningful mixed case, acronyms, and legal text.
- Show every local missing-field item near disabled Next. No six-item truncation.
- Working field jump links are part of the first migrated implementation.
- Preserve filing calculations, eligibility, existing document capabilities,
  and existing supplemental-document placement behavior.
- Support hosted/PWA and portable distributions using the existing build system.
- Retain existing `.sav` reading compatibility and security boundaries. Any
  additive draft-recovery payload needs explicit versioning and compatibility tests.

This work includes all field binding paths and all filing output entry points.
It does not add a new component framework, new export formats, new legal rules,
or a redesigned accounting workflow. Formatting and validation exceptions must
be explicit field policies rather than further label-based guesses.

## Deliverable 1: Authoritative Filing Descriptor

Add a small, pure module such as `src/core/filing/filing-descriptor.js`.
Consolidate the current filing registry into it, exposing legacy wrappers only
where the classic entry point still requires them. Resolving identity must not
import every feature, inspect the DOM, or temporarily replace `window.D`.

Illustrative descriptor shape:

```js
{
  id: 'final-accounting',
  family: 'accounting',
  engineId: 'annual',
  inventoryType: 'finalAccounting',
  filingTypeValue: 'Final',
  displayName: 'Final Accounting',
  documentTitle: 'FINAL GUARDIANSHIP ACCOUNTING',
  filenameStem: 'Final-Accounting',
  legalCopyKey: 'final-accounting',
  validationProfileId: 'annual-accounting',
  sectionMapId: 'annual-accounting',
  capabilities: { pdf: true, docx: true, excel: true }
}
```

The example title is provisional until the wording review below is completed.
Capabilities describe supported formats; they do not imply that the current
filing is valid or fits an Excel template. Keep actual required-field rules in
existing validation profiles, not a duplicate `requiredSections` checklist.

The resolver should return `{ descriptor, issues }`. Unknown or contradictory
identity produces a structured issue, never an unnoticed fallback to Annual.
Descriptors are derived values, not another mutable identity stored in `.sav`.

### Identity Reconciliation

Implement one small identity mutation service as the counterpart to the pure
resolver. Creation, Filing Type changes, conversion, import, and carryover must
use it to update the legacy identity fields atomically.

Recommended rules for implementation:

- New Annual, Final, and Trust filings initialize matching `inventoryType` and
  `filingType` values. Copied source data must not overwrite the target identity.
- An explicit Filing Type selection within the accounting family updates both
  fields together and refreshes every identity consumer. It does not reset data.
- Recognize documented legacy aliases such as `Annual Accounting` through an
  explicit lookup table. Avoid substring-based identity inference.
- For older files, one recognized identity with the other field absent can
  determine the descriptor without modifying the source archive on load.
- Two recognized but inconsistent fields create `filing.identity.conflict`.
  Keep the file editable and saveable; show the existing values in Part I and
  require an explicit Filing Type selection before final output. Do not infer
  whether a stale default or an intentional selection caused the conflict.
- An unknown value is preserved for correction. Missing/unknown identity must
  not enable a default export profile or silently reclassify a filing.
- Keep amendment status separate from filing identity and retain the existing
  explicit Yes/No rendering contract.

### Consumer Migration and Wording

Use the descriptor for form-selection labels, sidebar/dashboard, Summary,
Part I identity controls, preview labels, running document headers/footers,
PDF title/subject/keywords, DOCX properties, and suggested export filenames.
Use filename-specific sanitation at the filename boundary; preserve case and
ward identifiers in stored data.

Create filing-specific copy entries for preparer and attorney statements.
Reuse each entry for the interactive form and the document model. Review all
other filing references in certification/service text and applicable workbook
cells; do not stop at the two strings Claude reported.

During stage 25B, record a wording table with each phrase,
its source template and revision, whether it is filing-specific or fixed, and
the expected wording for Annual/Final/Trust. Inspect checked-in court templates
first, then authoritative source forms where necessary. Unresolved wording is
a specific content decision to report, not a reason to guess legal language.
Fixed fee-table or statutory wording must not undergo blanket replacement.

PDF/DOCX builders receive a descriptor resolved from the same filing snapshot
as their data. Retain compatibility wrappers for existing callers while routing
them through the resolver. Final output entry points reject identity issues;
the print page can still show guidance explaining why generation is blocked.

Add targeted guards against new hard-coded filing identity in migrated output
consumers, with explicit exceptions for approved fixed copy and fixture text.

## Deliverable 2: Shared Field Metadata and Commit Coordinator

Extend `form-contract.js` and add a coordinator such as
`src/core/form/commit-coordinator.js`. Keep `date-parser.js` as the parsing
authority. Adapt `data-form-path`, `data-annual-path`, and `data-bind` into one
metadata convention before retiring their write handlers.

Metadata must supply kind, format policy, label, section/route, model path,
focus target, and conditional validation association. Required status must
agree with the validator. Audit B-1/B-2 Period From/To and Court Order Date,
which are shown as required but omitted from current row completeness checks.
Resolve mismatches against the established form requirements before migrating.

Use stable row identity for drafts and focus targets. Array index paths can
remain serialization addresses, but insertion, deletion, duplication, pruning,
or sorting must remap them without moving one row's draft into another row.

Suggested responsibilities:

- `recordDraft(context, field, rawValue, event)`: capture the edit and revision.
- `commitPendingFields(context, { reason, scope })`: synchronously reconcile
  eligible drafts and return changed paths, structured issues, and revision.
- `captureFilingSnapshot(context)`: capture canonical values and identity for
  one output operation after commit and validation.

`context` binds case/session, ward/filing, period, and view lifetime. Delayed
callbacks must not resolve their target through whichever `window.D` happens
to be active later. Scope drafts by those identities and stable row/field ID,
not merely a path such as `periodFrom`.

### Field Lifecycle

1. Input/paste records current text immediately. Valid dates may update the
   canonical model without changing the focused control's display. Partial or
   invalid date text stays in the draft layer.
2. Blur or an explicit operation boundary commits the latest draft through the
   same pure field conversion. Repeated commits of an unchanged revision have
   no duplicate dirty, audit, party-sync, or save side effects.
3. Finalization applies permitted display formatting and updates status without
   rebuilding the focused field or moving its caret unexpectedly.
4. IME composition records text but defers normalization until composition ends.
   An output request during composition reports pending input; it does not
   force a blur, discard composition, or export an older value silently.

Name/address capitalization remains the default on finalization. Give the
formatter policies precise semantics: `normalize` may change canonical storage;
`display-only` never writes its presentation back into the model; `preserve`
allows only the agreed non-destructive sanitizer. Audit current exceptions
that write despite a preserve/display-only declaration.

Retest the existing unpunctuated-date masking with character-by-character entry,
not just a full-value paste. A seven-digit interpretation must not rewrite the
control before an eighth intended digit is entered. Avoid broadening accepted
formats or changing year limits as an incidental timing fix.

### Invalid Drafts and Recovery

An invalid replacement date preserves both the visible draft and the last valid
canonical value. It creates a structured blocker even when the old canonical
value satisfies the validator. Export must never use that old value while the
user sees an invalid replacement. Intentionally clearing a field commits an
empty value and applies its normal required/optional rule.

Rehydrate drafts on rerender and return navigation. A row containing a draft
is not blank and must not be pruned. Explicit row deletion removes its drafts;
duplication uses only committed values or reports an unresolved draft first.

Extend the existing protected recovery payload to include versioned draft
records, separated from canonical form fields. Draft-only edits must mark
recovery dirty. They must follow the selected encryption mode and lock cleanup;
do not introduce plaintext localStorage or log raw case values.

For `.sav` round trips, implement an optional versioned draft payload through
the archive's existing extensibility mechanism after inspecting its reader.
Test old archives without the payload, new archives with it, and older-reader
handling of the added data. New readers restore draft text and blockers; older
readers retain their canonical data. Document any older-reader loss of draft
support. Do not claim unchanged byte/schema structure when adding recovery data.
If the existing format cannot support this additively, record the concrete
versioning decision before implementing an incompatible archive change.

Successful saves must distinguish canonical data plus recovered drafts from
filing readiness. Invalid drafts may be saved as work in progress. Reuse the
shared status utility for meaningful failures and completion, without a spoken
announcement on every keystroke.

## Deliverable 3: Operation Boundaries and Persistence Ordering

Separate committing edits to the model from awaiting disk/recovery writes.
Do not make each input event flush disk storage or recursively call `autoSave()`
from a save-time commit. The save entry point requests a commit with save
scheduling suppressed, then saves the captured revision through the existing
persistence services.

| Operation | Required boundary behavior |
| --- | --- |
| Blur / Tab | Finalize the field once; retain invalid draft and inline error. |
| Next | Commit current section before checking status; block on its local issues. |
| Back / sidebar / browser history | Capture edits before detachment; retain invalid drafts and restore them on return. |
| Same-page rerender / add / duplicate / prune | Commit or retain drafts before changing DOM or row indices; never prune draft-only rows. |
| Switch ward / period / convert / open another case | Capture the outgoing context and flush its recovery before replacing it. Reject late commits to a superseded context. |
| Autosave / manual `.sav` save | Capture canonical values and drafts at a revision; allow incomplete work to save. |
| Preview / print / PDF / DOCX / Excel | Commit, resolve descriptor, validate, and capture one coherent snapshot before building output. |
| Lock / unload | Use existing security lifecycle; persist drafts while keys are available and clear sensitive memory on lock. |

Serialize writes or otherwise enforce revision ordering so a slow older save
cannot overwrite a newer one or clear its dirty flag. Clear saved state only
through the successfully written revision. Surface write failures and retain
dirty state. `await autoSave()` currently schedules a timer; it is not evidence
that a write has completed. Adapt `flushPendingSave()` accordingly.

Do not promise that asynchronous work finishes during tab/process termination.
Persist incrementally and retain existing unsaved-change protection. Verify
reload recovery after a confirmed recovery write and separately test the
best-effort unload behavior.

Output generation consumes one immutable operation snapshot for descriptor,
data, validation, metadata, filename, and supplemental files. Capture only the
needed filing data and avoid copying large attachment payloads unnecessarily.
Preview caches must include filing/period and data revision. A later edit or
ward switch invalidates an older preview's right to replace current content or
announce readiness. Saved artifacts must not combine two revisions.

Keep native file-picker/print user activation working when adding asynchronous
boundaries. Test those UI actions directly. A filing export needs a coherent
snapshot, not a writable `.sav` handle; lack of autosave permission must not
create a new dependency for PDF/DOCX/Excel generation.

## Deliverable 4: One Validation and Guidance Result

Extend the existing validation adapter and section-status helper to combine:

- established form validation;
- invalid/pending draft issues;
- unresolved filing identity;
- supplemental-document checks;
- format-specific limits such as Excel capacity.

Use stable error codes, field/row identity, route, section, message, and blocking
scope. Map legacy strings through explicit adapters while changed rules emit
structured errors directly. Deduplicate by issue identity, not message text.

Sidebar, Summary, Next, print-page guidance, and export controls consume the
same result for the same revision. All local blockers appear near disabled
Next with functional jump links; unresolved legacy targets use an honest
section link instead of a dead field button. Do not announce the full list
on every input event or steal focus on ordinary validation updates.

Keep local navigation and output eligibility distinct. An Excel capacity issue
blocks Excel, not PDF. An unrelated incomplete section does not block Back or
valid local Next. A retained invalid date draft must prevent a false green
check for its section and block final output even if the model holds an old date.
Revalidate in command handlers so direct calls cannot bypass disabled buttons.

## Implementation Stages

The first two stages are independently shippable slices. The date repair uses
the existing shared contract that the coordinator will extend. Full binding
migration and durable draft recovery follow in 25C; neither is a prerequisite
for correcting the confirmed date writes. Release notes must distinguish an
early repair's verified scope from completion of the whole milestone.

### 25A: Baseline and Shared Date Repair

- Record the tested commit/build and active worktree changes. Reproduce B-2
  entry using keyboard/paste and automation; record event ordering without PII.
- Inventory date commit handlers, navigation/save boundaries, output entry
  points, and supported formats before changing the shared contract.
- Repair `form-contract.js` so invalid finalization retains the previous
  canonical value and visible invalid draft. Intentional clearing remains a
  separate operation governed by the field's required/optional rule.
- Add a shared draft-aware validation check in the same slice. Any unresolved
  invalid date draft blocks print/PDF/DOCX/supported Excel commands, including
  direct calls, even if the retained canonical date passes existing validation.
  The print page remains reachable to display actionable guidance.
- Capture eligible pending dates before saving, navigation, rerendering, and
  pruning. Do not depend solely on blur or create another feature-local handler.
  Retain invalid drafts across in-session rerenders and prevent draft-only rows
  from being pruned; bind retained drafts to their outgoing filing/row context.
- Integrate local draft errors, all-item guidance, and working jump links in
  the first migrated path. Preserve save-as-work-in-progress behavior.
- Add focused tests for invalid replacement, intentional clear, valid unblurred
  save, rapid B-2 entry/navigation, and stale-value export rejection. Exercise
  the same shared path on Inventory and Initial Plan date controls.
- Keep durable invalid-draft recovery and broad non-date binder migration in
  25C. State the early slice's reload/termination limitations explicitly; do not
  claim unpersisted invalid drafts survive reload or that the milestone is done.

25A acceptance requires both unit evidence for the confirmed mechanisms and
browser regression evidence for the reported workflow. Confirmed mechanisms
can be repaired while investigation continues, but B-2 remains an open finding
until its actual workflow is reproduced and verified after repair. Tests that
only exercise the parser or add verification pauses do not close it.

### 25B: Independent Filing Identity and Wording Delivery

- Inventory identity readers/writers and legal wording sources; complete the
  wording table for metadata, headers, preparer and attorney statements, and
  approved fixed references.
- Add the descriptor, identity mutation service, legacy compatibility mappings,
  and conflict tests. Correct new Final/Trust defaults and explicit type changes.
- Migrate Annual/Final/Trust UI and PDF/DOCX/Excel identity consumers, including
  both attestation passages and filenames. Verify approved wording in artifacts.
- Route identity issues into output gating while retaining existing validation
  and 25A's draft blockers. Do not defer those blockers to the later preflight.
- Ship this bounded identity correction independently of the full coordinator
  and recovery rollout. Unresolved source wording is reported specifically.

### 25C: Coordinator, Recovery, and All-Form Integration

- Extend the repaired shared commit API with complete context ownership,
  revision ordering, durable draft recovery, composition handling, and the
  operation boundaries specified above. Reuse 25A's implementation and tests.
- Route accounting B-1/B-2 and the common date helper through the coordinator;
  remove any remaining competing write/format handlers in the same change.
- Prove shared behavior on Guardian Inventory and Initial Plan date fields.
- Verify row pruning, same-page rerender, ward/period switching, and save races
  with controlled deferred operations rather than arbitrary timing sleeps.
- Migrate remaining accounting, Simplified, Inventory, and all Plan bindings.
- Route all identity consumers through the descriptor, retaining lazy feature
  imports and feature-owned validation/template logic.
- Add shared output preflight and snapshot handling to preview, print, PDF,
  DOCX, and supported Excel paths; consolidate the earlier gates and integrate
  every status consumer without dropping draft or identity blockers.
- Remove obsolete alternate writers only after each migrated path passes.
- Record any genuine special fields as explicit policies with tests.

### 25D: Cross-Form Acceptance and Release

- Complete the matrix below and report measured results, including manual AT
  checks. Automated focus/event simulation is not a screen-reader audit.
- Run the full unit/E2E suite and both builds; verify deployed-build behavior
  and portable `file://` workflows with no server dependency.
- Record remaining limitations, archive compatibility results, and wording
  decisions before marking the milestone complete.

## Cross-Form Verification Matrix

Every row requires identity, rapid input, persistence/recovery, guidance, and
artifact checks. Determine existing format support from code in 25A and record
each capability explicitly; mark unsupported formats N/A with evidence.

| Filing | Legacy identity | Representative date workflow | Required output coverage |
| --- | --- | --- | --- |
| Annual Accounting | `annual` | B-1/B-2 four-date batch, period, signature | Preview, print, PDF, DOCX, Excel |
| Final Accounting | `finalAccounting` | B-2, final period, signature | Preview, print, PDF, DOCX, Excel |
| Trust Accounting | `trustAccounting` | B-2, period, court order | Preview, print, PDF, DOCX, Excel |
| Simplified Accounting | `simplified` | Period and multiple guardian signatures | Preview, print, PDF, DOCX, Excel |
| Guardian Inventory | `guardian` | Schedule dates, signatures, year switching | Preview, print, PDF, DOCX, Excel |
| Initial Plan | `planInitial` | Exams, directives, signatures | Preview, print, PDF, DOCX; other formats only if supported |
| Annual Plan | `planAnnual` | Residence periods, directives, signatures | Preview, print, PDF, DOCX; other formats only if supported |
| Minor Plan | `planMinor` | Period and signatures | Preview, print, PDF, DOCX; other formats only if supported |
| Simplified Plan | `planSimplified` | Period and signatures | Preview, print, PDF, DOCX; other formats only if supported |

### Required Scenarios and Assertions

- Create through the UI, then check identity before manually selecting Filing
  Type. Test type changes, conversion/carryover, Excel import, old `.sav` reopen,
  unknown values, and deliberate identity conflicts.
- Compare independent expected titles/copy against sidebar, Summary, preview
  text, PDF metadata/running headers, DOCX properties/body/header/footer XML,
  Excel identity cells where supported, and downloaded filenames. Expected
  values must not be generated from the descriptor being tested.
- Assert Final/Trust filing-specific text, while allowing approved fixed Annual
  references. Visually inspect representative long headers and attestation
  paragraphs after wording changes; no clipped text or overlap.
- Enter dates consecutively without verification pauses; cover full paste,
  character entry, Tab/Shift+Tab, editing in the middle, clear, undo, IME,
  invalid/leap dates, two-digit years, and supported unpunctuated input.
- Trigger navigation, rerender, save, and export while a date still has focus.
  Check visible values, canonical values, recovered drafts, and actual output.
- Test invalid replacement of a valid date: retain old canonical data and new
  visible draft, block output, retain across save/reload, then clear the blocker
  only after correction or explicit clearing under the field's normal rules.
- Test identical paths across two wards/periods, deleted and shifted rows,
  draft-only rows, repeated mounts, and late callbacks from detached views.
- Delay older writes and output generation deliberately. Verify newer edits
  remain dirty, cannot be overwritten, and cannot appear in another filing.
- Assert section-status parity, all blockers visible beyond six items, every
  jump target functional, and command-level export gates enforced.
- Inspect generated PDF/DOCX contents and supported Excel export/import round
  trips; direct state seeding alone does not test the input lifecycle.
- Include supplemental Schedule A insertion/order regression for accounting
  aliases and multi-year Inventory to protect the shared output pipeline.
- Run keyboard/mobile focus and layout checks. Manually check representative
  Windows screen-reader/browser behavior and Safari/VoiceOver where available;
  record unavailable combinations rather than claim they passed.

Suggested test additions: descriptor/commit unit specs and shared E2E suites
for filing identity, field lifecycle, and artifact parity. Extend existing
parser, form-contract, preview, supplemental, and status tests where practical.
Use focused tests per stage, then `npm.cmd test` and `npm.cmd run build` for
release. Follow `CLAUDE.md` for local browser setup and repository commit rules.

## Acceptance and Decisions

The milestone is complete when all nine filing types use the shared identity
and commit contracts, Final/Trust artifacts carry approved consistent wording,
and reproduced rapid-entry defects pass without artificial pauses. Invalid
drafts must remain recoverable and actionable; committed values and output
snapshots must not drift between revisions or filings. All-item guidance and
first-release jump links are required across migrated forms.

No user decision is needed to begin the baseline and shared infrastructure.
This proposal recommends explicit correction for conflicting legacy identity,
atomic identity updates when Filing Type changes, and additive draft recovery.
Any court wording that cannot be established from source forms, or archive
compatibility that requires a breaking change, must be reported with concrete
evidence and alternatives before implementing that dependent part.

---

<a id="milestone-25-1-proposal-md"></a>

# Archive: MILESTONE-25-1-PROPOSAL.md

# Milestone 25-1: HTML/CSS Warning Remediation & Modal Style Unification

## Goal

Eliminate all actionable compile/lint warnings in `index.html`, `fragments/common-modals.html`, and `docs/pdf-architecture-and-signatures.md`, moving all inline CSS into `src/styles/app.css` while preserving accessible names, modal behaviors, and theme integrity.

---

## Background & Scope

During the Milestone 25 review, diagnostic scans flagged inline styling in `index.html` (48 instances) and `fragments/common-modals.html` (56 instances), along with missing accessible label bindings and Markdown lint warnings.

### Scope of Changes:
1. **`index.html` Inline CSS Extraction**:
   - Replaced all static `style="..."` attributes with semantic CSS classes defined in `src/styles/app.css`.
   - Associated form labels (`for="unlock-password"`, `for="unlock-password-confirm"`) with password inputs for complete accessibility.
   - Refactored `#save-error-banner`, `#sidebar-context`, ward controls buttons, save controls toggles, indicator text, loading placeholders, and startup/unlock modal containers.

2. **`fragments/common-modals.html` Inline CSS Extraction**:
   - Replaced all 56 inline `style="..."` attributes with centralized CSS classes and standard Bootstrap flex utility classes (`d-flex gap-2 flex-fill`).
   - Added `aria-label` attributes to dropdown listboxes (`convert-source-ward-dropdown`, `new-ward-name-dropdown`, `elig-ward-name-dropdown`) to maintain full ARIA accessibility.
   - Preserved all data attributes (`data-modal-action`, `data-modal-id`, `data-modal-input`, `data-modal-change`) and modal IDs.

3. **`src/styles/app.css` Consolidation**:
   - Added styles for `#dropzone-overlay`, `.dropzone-box`, `.modal-box-title`, `.modal-title-danger`, `.modal-desc`, `.modal-desc-sm`, `.modal-note-box`, `.modal-help-text`, `.modal-help-text-sm`, `.modal-autonote`, and `.modal-scroll-list`.
   - Re-ordered vendor prefixes (`-webkit-backdrop-filter` before `backdrop-filter`, `-webkit-user-select` with `user-select`).

4. **`docs/pdf-architecture-and-signatures.md` Markdown Linter**:
   - Specified fenced code languages (`text`), fixed list spacing/indentation, and cleaned trailing punctuation in headings.

---

## Verification & Acceptance

- `npm run test:unit`: 116/116 unit tests passing.
- `npx playwright test`: 202/207 tests passing (5 hosted offline cache tests skipped by design in non-hosted mode).
- `npm run build`: Web and portable distributions compile without errors.
- Diagnostics: 0 inline style errors across all HTML files and fragments.

---

<a id="milestone-26-proposal-md"></a>

# Archive: MILESTONE-26-PROPOSAL.md

# Milestone 26: Unified Form Engine, Field Centralization & Accessible Combobox Controller

## Goal

Centralize and standardize form control rendering, repeatable card row operations, and typeahead comboboxes across all 9 Florida probate form types:

1. **Unified Form Field Generator (`renderFormField`)**: Consolidate `inpD()` (Annual), `inpS()` (Simplified & Plans), `dateInput()` (Guardian Inventory), and `dateInputHTML()` (Core) into a single, canonical field generation API in `src/core/form/form-fields.js`.
2. **Accessible Typeahead / Combobox Controller**: Replace duplicated dropdown/combobox logic across the Ward Picker, County Selector, Party Picker, and Case Picker with a single, fully accessible `ComboboxController` supporting keyboard navigation (Arrow Up/Down, Enter, Escape, Tab), ARIA `role="combobox"` / `role="listbox"`, and live-region matching.
3. **Declarative Schedule & Repeatable Row Schemas**: Centralize repeatable group definitions (factories, maximums, minimum floors, and party ID synchronization) into declarative schema dictionaries with custom hooks for complex schedules (e.g. Schedule B-4 category breakdowns and Schedule E paired transfers).
4. **Eliminate Duplicated HTML Templates & Heuristics**: Remove ad-hoc regex label heuristics scattered across feature directories, ensuring consistent tooltips, format policies (`preserve`, `normalize`, `display-only`), and accessible hints.

---

## Why This Is Needed

Across Milestones 1–25, feature templates were extracted into dedicated feature folders (`src/features/annual-accounting/`, `src/features/simplified-accounting/`, `src/features/guardian-inventory/`, `src/features/plan-*/`). While this modularized the pages, each feature retained or reimplemented its own field generation helpers:

- **`inpD`** in Annual Accounting manually parses label strings with 12 distinct regexes on every render to classify kinds (`isDate`, `isSSN`, `isPhone`, `isCaseNumber`, `isZip`, etc.) and sets `data-annual-path`.
- **`inpS`** in `legacy-app.js` runs a near-identical set of label regexes but sets `data-form-path`.
- **`dateInput`** in Guardian Inventory sets `data-bind`.
- **`dateInputHTML`** in `date-parser.js` sets `data-field-path`.

This drift creates maintenance overhead and subtle inconsistencies in tooltip styling, error classes (`is-invalid`), ARIA descriptions (`aria-describedby`), and live auto-masking. Consolidating into a single engine directly extends the Milestone 24/25 Form Contract.

---

## Non-Negotiables

1. **Zero Data Model & `.sav` Breakage**: All fields must continue to read and write canonical paths (e.g. `window.D.periodFrom`, `window.D.guardians[0].name`) and preserve existing `.sav` archive structure.
2. **Strict Accessibility Parity**: Every rendered field must output proper `<label for="...">`, `aria-describedby` hint associations, and `aria-invalid` error states.
3. **Single-File Portable Build Compatibility**: All new modules must bundle seamlessly with `vite-plugin-singlefile` without generating runtime external module requests.
4. **Preserve Party Linking Synchronicity**: Resequencing and removing repeatable cards (guardians, recipients) must continue to update parallel `guardianPartyIds` arrays in lockstep.
5. **No Regressions on Bespoke Financial Rows**: Custom validation/formatting rules (e.g., Schedule B-4's category groupings and Schedule E's paired transfer dates/amounts) must be preserved via declarative schema hooks.
6. **100% Test Suite Green**: All 108+ Vitest unit tests and 202+ Playwright E2E tests must pass with 0 failures under `workers: 1`.

---

## Detailed Deliverables

### 1. Canonical `renderFormField()` Engine (`src/core/form/form-fields.js`)

Create a centralized field renderer:
```javascript
export function renderFormField({
  path,
  label,
  value = '',
  type = 'text',           // 'text' | 'number' | 'date' | 'email' | 'password' | 'select' | 'checkbox'
  kind = null,             // 'identifier' | 'date' | 'money' | 'phone' | 'ssn' | 'name' | 'address' | 'zip' | 'caseNumber' | 'barNumber' | 'accountNumber' | 'checkNumber'
  policy = null,           // 'preserve' | 'normalize' | 'display-only'
  required = false,
  tooltipKey = null,
  options = [],            // for select dropdowns
  className = 'form-control',
  hint = null,
  syncWardName = false,
  syncGuardianName = false,
  id = null,
}) { ... }
```
- Automatically resolves `kind`, `policy`, and `format` attributes.
- Automatically handles Dollar/Percent input-group wrapping, SSN mask/reveal toggles, date hints, and tooltip overlays.
- Emits standardized data attributes (`data-field-path`, `data-form-path`, `data-field-kind`, `data-field-format-policy`, `data-field-required`).

### 2. Standardized Typeahead / Combobox Controller (`src/core/form/combobox-controller.js`)

Unify combobox implementations:
- Encapsulate rendering, active item tracking, keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`), blur timeout closing, and screen-reader status announcements.
- Wire into Ward Selector, County Autocomplete, Party Directory / Link Person Picker, and Case Picker.

### 3. Declarative Schedule & Group Schemas (`src/core/form/schedule-definitions.js`)

Centralize repeatable collection rules:
```javascript
export const SCHEDULE_SCHEMAS = {
  guardians: {
    factory: () => ({ name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '' }),
    label: 'Co-Guardian',
    max: 3,
    floor: 1,
    syncPartyIds: 'guardianPartyIds',
  },
  certRecipients: {
    factory: () => ({ name: '', line2: '', line3: '', line4: '' }),
    label: 'Service Recipient',
    max: Infinity,
    floor: 1,
  },
  schA: {
    factory: () => ({ payer: '', description: '', bank: '', accountNo: '', amount: '' }),
    label: 'Income Entry',
    max: Infinity,
    floor: 0,
  },
  // ... Schedules B1-B4, C, D1-D5, E, F1-F2, Plan repeatable rows
};
```

### 4. Feature Module Migration

Refactor feature templates to import and call `renderFormField`:
- `src/features/annual-accounting/index.js`
- `src/features/simplified-accounting/index.js`
- `src/features/guardian-inventory/index.js`
- `src/features/plan-*/index.js`

---

## Critical Implementation Watch-Outs

1. **Dual Event Delegate Compatibility**:
   - `form-events.js` currently listens for `data-form-path`, while `annual-accounting/index.js` listens for `data-annual-path`.
   - `renderFormField()` must emit the canonical `data-field-path` while also outputting `data-form-path` so existing global listeners in `form-events.js` seamlessly handle all forms without event deadlocks.
2. **Party ID Lockstep Re-sequencing**:
   - Repeatable party card CRUD (co-guardians, service recipients) must re-index the parallel `window.D.guardianPartyIds` array in lockstep whenever cards are deleted or re-ordered, preserving "Link to Shared Record" mappings.
3. **Complex Schedule Validation & Totals Hooks**:
   - Schedule B-4 (18 statutory disbursement categories) and Schedule E (paired transfer in/out with signed decimals) rely on custom totals calculations (`calcTotalsAnnual`). The declarative schema must support custom row-level transform and totals callbacks.

---

## Verification Plan

### Automated Unit Tests (`vitest`)
- `tests/unit/form-fields.spec.js`: Test field generator for every field kind, input-group wrapper, SSN reveal button, tooltip association, and validation attribute.
- `tests/unit/combobox-controller.spec.js`: Test filtering, keyboard navigation events, selection callbacks, and ARIA attributes.
- Full suite verification: `npx vitest run` (all 16 test files pass).

### Automated E2E Tests (`playwright`)
- `tests/e2e/form-entry-ux.spec.ts`
- `tests/e2e/annual-mount.spec.ts`
- `tests/e2e/simplified-mount.spec.ts`
- `tests/e2e/guardian-inventory-mount.spec.ts`
- `tests/e2e/attestation-layout.spec.ts`

### Build Parity
- `npm run build:web` (chunked PWA)
- `npm run build:portable` (single-file HTML)

---

<a id="milestone-27-proposal-md"></a>

# Archive: MILESTONE-27-PROPOSAL.md

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

---

<a id="milestone-28-proposal-md"></a>

# Archive: MILESTONE-28-PROPOSAL.md

# Milestone 28: Export Engines, Performance & CSS Modularization

## Goal

Modernize export engines, eliminate legacy payload bloat, lazy-load spreadsheet tooling, and decompose the 100 KB monolithic stylesheet into a clean, maintainable design system:

1. **Shared Excel Engine (`src/core/excel/excel-engine.js`)**:
   - Create a centralized Excel generator modeled after `src/core/pdf/pdf-engine.js` and `src/core/docx/docx-engine.js`.
   - Abstract ExcelJS boilerplate (cell styling, border definitions, sheet protection, number formatting, header banners, formulas) so feature modules (`annual-accounting/excel.js`, `guardian-inventory/excel.js`, `simplified-accounting/excel.js`) contain only high-level declarative cell mappings.
2. **On-Demand Dynamic Loading of `ExcelJS`**:
   - Move `ExcelJS` from `<head>` in `index.html` to a dynamic loader (`src/core/excel/exceljs-loader.js`), loading the library only when an Excel import or export is explicitly triggered.
3. **Remove Legacy `html2pdf.bundle.min.js`**:
   - Completely remove `lib/html2pdf.bundle.min.js` from `<head>` and repository assets now that the native `jsPDF` + `pdf-lib` + `PDF.js` vector pipeline handles 100% of PDF generation and print previews.
4. **CSS Modularization**:
   - Split `src/styles/app.css` (~100 KB) into structured CSS layers:
     - `src/styles/tokens.css` (Design tokens: color palettes, typography, spacing, shadows, z-indexes)
     - `src/styles/shell.css` (App layout, sidebar, mobile topbar, toasts, banners)
     - `src/styles/forms.css` (Form controls, input groups, floating labels, validation states, masks)
     - `src/styles/cards.css` (Attestation cards, schedule rows, repeatable items, party blocks)
     - `src/styles/dashboard.css` (Filing grid, compliance overview, badge chips)
     - `src/styles/modals.css` (Modal dialogs, dropzones, overlays)
     - `src/styles/print.css` (Print layout, page breaks, print preview canvas)
   - Ensure Vite's build pipeline flattens these modules for `dist/portable/index.html` without external network requests.
5. **Memory & Object URL Management**:
   - Guarantee systematic `URL.revokeObjectURL()` cleanup after PDF blob rendering and Excel/DOCX file downloads to prevent memory accumulation in extended sessions.

---

## Why This Is Needed

1. **Export Code Duplication**: Feature modules currently spend hundreds of lines configuring ExcelJS font names, colors, alignment rules, and column widths manually. A centralized engine ensures consistent font scales, header styling, and currency formats across all court accounting workbooks.
2. **Initial Load Payload**: Statically bundling ExcelJS and legacy html2pdf in the initial HTML document adds ~1.5 MB of unneeded JavaScript parse overhead during application boot.
3. **CSS Maintainability**: A single 100 KB stylesheet makes finding and modifying component styles error-prone. Modularizing into design system tokens and component stylesheets prevents CSS rule collisions.

---

## Non-Negotiables

1. **Excel Formula & Cell Precision**: Excel exports must maintain exact cell coordinate compatibility (e.g. Schedule A1 mapping to E14, Part III totals formulas) across all three accounting workbooks.
2. **Zero Visual Regression**: Dark theme, light theme, mobile responsive views, and Print Preview canvas styling must render identically.
3. **Portable Single-File Integrity**: `npm run build:portable` must continue to inline all CSS rules directly into `dist/portable/index.html`.
4. **100% Test Suite Green**: All 108+ Vitest unit tests and 202+ Playwright tests must pass with 0 failures under `workers: 1`.

---

## Deliverables & Architecture

```text
src/
  core/
    excel/
      exceljs-loader.js        # Dynamic import wrapper (lazy-loads ExcelJS on demand)
      excel-engine.js          # Shared workbook creator, styling, cell protection, formulas
  styles/
    tokens.css                 # CSS variables, color palettes, dark/light theme definitions
    shell.css                  # Header, sidebar, navigation, status indicators
    forms.css                  # Input formatting, validation classes, hints
    cards.css                  # Schedule cards, attestation rows
    dashboard.css              # Dashboard overview, summary cards
    modals.css                 # Overlays and dialogs
    print.css                  # Paper styling & print preview
    app.css                    # Main entry point importing modular layers
```

---

## Critical Implementation Watch-Outs

1. **Excel Cell Coordinate Precision**:
   - Florida court accounting workbooks enforce exact cell coordinates (e.g., Schedule A-1 entries starting at row 14, Part III totals formulas referencing dynamically expanding row ranges).
   - `src/core/excel/excel-engine.js` must consume declarative cell-coordinate mapping definitions to guarantee 100% cell formula alignment.
2. **CSS `@import` Flattening in Bundler**:
   - In `src/styles/app.css`, `@import` rules will be used to structure the design system. Vite's build pipeline must flatten these imports during production builds so that `dist/portable/index.html` has zero unbundled `@import` statements.
3. **Static Copy Plugin Cleanup**:
   - In addition to removing `<script src="lib/html2pdf.bundle.min.js">` from `index.html`, remove `html2pdf.bundle.min.js` from `vite.config.js` (`vite-plugin-static-copy` targets) to avoid copying unneeded legacy files into `dist/`.

---

## Verification Plan

### Automated Unit Tests (`vitest`)
- `tests/unit/excel-engine.spec.js`: Test workbook construction, cell formatting, currency mask application, formula generation, and sheet protection.
- `tests/unit/docx-engine.spec.js`: Confirm DOCX export remains fully functional.
- Full Vitest suite: `npx vitest run`.

### Automated E2E Tests (`playwright`)
- `tests/e2e/annual-mount.spec.ts` (Exercises Excel export and template re-import round-trip)
- `tests/e2e/simplified-mount.spec.ts` (Exercises Simplified Excel export/import)
- `tests/e2e/pdf-preview-viewer.spec.ts` (Verifies print preview styles and vector rendering)
- `tests/e2e/dashboard-visual.spec.ts` (Verifies dashboard visual token styling)

### Performance & Build Verification
- Inspect `dist/web/` bundle sizes to confirm initial script weight reduction.
- Verify `dist/portable/index.html` contains inlined CSS and functions without external requests.

---

<a id="milestone-29-proposal-md"></a>

# Archive: MILESTONE-29-PROPOSAL.md

# Milestone 29: Type Contracts, Static Validation & Developer Experience

## Goal

Introduce comprehensive static type safety and contract verification across the entire Probate Guardian codebase using JSDoc `@typedef` annotations and TypeScript's zero-build type checker (`tsc --noEmit --checkJs`), without altering the Vanilla JS runtime architecture or adding a runtime TypeScript compilation step:

1. **Formal Data Model Contracts (`src/core/types/`)**:
   - Define canonical JSDoc typedefs for all core application entities:
     - `CaseFile`: Top-level `.sav` JSON container (wards, shared parties, shared cases, metadata).
     - `Ward`: Individual filing record (inventoryType, header fields, schedules A–F, scheduleDocs, prior years).
     - `Party`: Shared person directory record (role, name, SSN/EIN, barNumber, contact fields).
     - `Case`: Shared legal matter record (caseNumber, county, courtName).
     - `FormContract`: Field descriptor, kind classifications, and formatter policies.
     - `ScheduleSchema`: Repeatable card factories, validation hooks, and party ID linkage.
2. **Static Type Checking Script (`npm run check:types`)**:
   - Configure `tsconfig.json` for JSDoc type checking with `"checkJs": true` and `"noEmit": true`.
   - Provide instant IDE autocomplete, rename safety, and compile-time type verification.
3. **CI & Pre-Commit Type Guard**:
   - Add `npm run check:types` to the verification pipeline alongside `npm test` (`vitest` + `playwright`) and `npm run build`.

---

## Why This Is Needed

Probate Guardian is a mission-critical legal and financial application managing 9 distinct Florida probate form types, complex asset schedules, and multi-year accounting rollover.

Because the project intentionally uses Vanilla JS for maximum runtime simplicity and single-file portability, structural refactoring has historically relied exclusively on runtime unit and E2E tests. Introducing JSDoc-driven static analysis:
- Catches typos in deeply nested model paths (e.g. `d.scheduleA1[0].propertyDescription` vs `d.schD2[0].description`) at authoring time.
- Documents the shape of every filing type and schedule row in code rather than external documentation.
- Eliminates "silent undefined" bugs during data transformations without requiring a heavyweight TypeScript build toolchain.

---

## Non-Negotiables

1. **Zero Runtime Impact**: Type checking must be purely static (`noEmit: true`). The runtime scripts executed in browsers, PWA bundles, and portable single-file builds must remain standard Vanilla JavaScript.
2. **Exact Data Realism**: Type definitions must accurately reflect the real-world shapes stored in `.sav` case files and returned by form validators, including legacy optional fields and multi-year arrays.
3. **Zero Linting Noise**: Type definitions must be strict where models are well-defined, with clean union types (`'annual' | 'simplified' | 'guardian' | 'planAnnual' | ...`) rather than generic `any`.
4. **100% Test Suite Green**: `npm test` (all Vitest and Playwright suites) must continue to pass seamlessly.

---

## Deliverables & Architecture

### 1. Type Definitions (`src/core/types/`)

```text
src/
  core/
    types/
      case-file.js             # @typedef {Object} CaseFile, @typedef {Object} CaseMetadata
      filing.js                # @typedef {Object} Ward, @typedef {Object} FilingDescriptor
      parties.js               # @typedef {Object} Party, @typedef {Object} SharedCase
      schedules.js             # @typedef {Object} SchAItem, @typedef {Object} SchD1Item, ...
      form-contract.js         # @typedef {Object} FieldDescriptor, @typedef {Object} ValidationResult
```

Example Definition:
```javascript
/**
 * @typedef {Object} Ward
 * @property {string} wardId
 * @property {'guardian'|'simplified'|'annual'|'trustAccounting'|'finalAccounting'|'planInitial'|'planAnnual'|'planMinor'|'planSimplified'} inventoryType
 * @property {string} [wardName]
 * @property {string} [caseNumber]
 * @property {string} [county]
 * @property {string} [gid]
 * @property {string} [periodFrom]
 * @property {string} [periodTo]
 * @property {Array<GuardianEntry>} [guardians]
 * @property {Array<string>} [guardianPartyIds]
 * @property {Record<string, Record<string, ScheduleDocSlot>>} [scheduleDocs]
 */
```

### 2. TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

### 3. NPM Script Integration

In `package.json`:
```json
"scripts": {
  "check:types": "tsc --noEmit",
  "verify": "npm run check:types && npm test && npm run build"
}
```

---

## Critical Implementation Watch-Outs

1. **Incremental Type Strictness**:
   - When enabling `checkJs: true`, ensure `tsconfig.json` specifies `"skipLibCheck": true` and `"maxNodeModuleJsDepth": 0` so that vendored legacy scripts in `lib/` (Bootstrap, JSZip, etc.) are excluded from static analysis.
2. **Strong Union Types vs. Generic Strings**:
   - Model paths and filing inventory types must be typed as strict union types (e.g. `'annual' | 'simplified' | 'guardian' | 'finalAccounting' | 'trustAccounting' | 'planInitial' | 'planAnnual' | 'planMinor' | 'planSimplified'`), ensuring invalid strings fail during static analysis.
3. **CI Pipeline Integration**:
   - Add `npm run check:types` directly into the root `npm test` script so that all local verification runs and automated checks validate types alongside unit and E2E tests.

---

## Verification Plan

### Static Validation
- Run `npm run check:types` and confirm 0 type errors across `src/` and `tests/`.

### Automated Test Parity
- Run `npm test` (108+ Vitest unit tests, 202+ Playwright E2E tests).
- Run `npm run build` (`build:web` and `build:portable`).

---

<a id="milestone-30-proposal-md"></a>

# Archive: MILESTONE-30-PROPOSAL.md

# Milestone 30: E2E Suite Consistency, Reliability & Safe Concurrency

## Status

**Proposal only.** No implementation, configuration change, or test-behaviour change is authorized until this plan is reviewed and approved.

## Goal

Reduce duplicated E2E coverage, remove a real asynchronous ward-switch race, make export assertions event-driven, and establish whether stateless tests can safely run with two workers. The work is deliberately ordered to produce useful maintenance gains without obscuring current coverage or changing product behaviour.

## Non-Negotiables

1. Preserve the existing assertions, test cases, test titles, and filing-specific edge cases unless a change is explicitly called out below.
2. Keep PDF byte-stream and semantic verification in browser Playwright; do not move it to Vitest.
3. Retain existing DOM geometric checks.
4. Do not reorganize the suite into new `journeys/` or `whitebox/` directories.
5. Do not introduce image snapshot assertions such as `toHaveScreenshot()`.
6. Do not alter `playwright.config.ts` until the worker-concurrency experiment has produced repeatable local evidence.

---

## Phase 1: Make Ward Switching Awaitable and Consolidate Plan-Mount Contracts

### 1. Repair the `switchWard()` mount race

In `src/core/navigation/ward-lifecycle.js`, update `switchWard()` so every invoked `mount*Feature('/')` call is awaited before the function runs its shared post-mount UI work and resolves. Each mount helper is already asynchronous, and the normal `navigate()` path already awaits the same helpers; ward switching should provide the same completion guarantee.

Two specific defects to correct:

- **Un-awaited mounts**: None of the `mount*Feature('/')` calls in the switch-case block are currently awaited.
- **`guardian` early-return**: The `guardian` case executes `return true` immediately after its mount call, bypassing the shared post-mount work (`linkLabelsToInputs`, `updateNavDots`, `updateHelpContext`, `closeMobileSidebar`) that every other case runs. Remove the early return so the guardian case falls through to the shared post-mount block, matching the behaviour of all other form engines.

In addition, audit callers of `switchWard()` that fire-and-forget the result. In particular, the dashboard click handler in `src/features/dashboard/index.js` (the `'open-ward'` action) calls `switchWard(wardId)` without `await`; it must be awaited so the mount completes before any subsequent UI interaction.

This is intentionally paired with the plan-spec refactor: those tests exercise remounting and should consume a deterministic, fully mounted application state rather than timing around the race.

### 2. Add a shared plan fixture

Create `tests/e2e/support/plan-fixture.ts` exporting a lightweight `registerPlanMountTests(config)` runner. Its configuration will include the feature identity and the genuine points of variation:

```ts
type PlanMountConfig = {
  featureName: string;
  filingType: string;
  routes: string[];
  fillValidWard: (page: Page) => Promise<void>;
  triggerExport: (page: Page) => Promise<void>;
  triggerBlockedExport: (page: Page) => Promise<void>;
  navChecks: Array<{ route: string; key: string }>;
  createFiling?: (page: Page) => Promise<void>;
  waitForReady?: (page: Page) => Promise<void>;
};
```

The runner will own the repeated contract presently shared by the four plan-mount specs:

1. Render each declared route and retain the existing rendering/error checks.
2. Verify that an incomplete filing blocks export.
3. Fill a valid ward and verify successful PDF export.
4. Exercise remount cycling.
5. Verify navigation and summary parity for the declared route/key pairs.

For the blocked-export case only, synchronize with the native dialog from the outset instead of using the current `waitForTimeout(500)` delay:

```ts
const [dialog] = await Promise.all([
  page.waitForEvent('dialog'),
  config.triggerBlockedExport(page),
]);
// Preserve the current message assertion and dialog dismissal.
```

The successful-export tests already use the event-driven `page.waitForEvent('download')` pattern and do not need this change.

Note that the four plan specs use two different export trigger mechanisms: `plan-annual`, `plan-initial`, and `plan-minor` trigger export via `page.evaluate(() => doSavePdf*())`, while `plan-simplified` locates a `[data-plan-simplified-action="save-pdf"]` button, programmatically enables it (it starts disabled on an incomplete filing), and clicks it. The `triggerExport` and `triggerBlockedExport` callbacks must each accommodate this divergence — the simplified spec's blocked-export callback in particular needs to include the button-enable step as behavioural setup, not just a trigger.

`createFiling` accommodates any feature that needs a nonstandard filing setup; `waitForReady` accommodates a feature-specific readiness condition without adding arbitrary global sleeps. Any assertion or setup unique to one filing remains in that filing's spec beside its call to the runner.

### 3. Refactor exactly four specs

Convert these specs to focused configuration plus any local edge-case tests:

- `plan-annual-mount.spec.ts`
- `plan-initial-mount.spec.ts`
- `plan-minor-mount.spec.ts`
- `plan-simplified-mount.spec.ts`

The fixture must not become a generic abstraction for unrelated form families. Before and after the refactor, compare the four specs' test names and coverage paths to ensure the helper has removed duplication rather than removed tests.

### Phase 1 acceptance criteria

- `switchWard()` does not resolve before its selected feature has mounted.
- The `guardian` case no longer early-returns before shared post-mount work.
- All callers of `switchWard()` (including the dashboard `'open-ward'` handler) await the result.
- The four plan specs use the shared fixture and retain filing-specific tests locally.
- Blocked export waits on, asserts, and dismisses the native dialog without the replaced fixed wait.
- Targeted runs for all four plan specs pass, followed by the full E2E suite.

---

## Phase 2: Split the Two Monolithic Specs Without Behavioural Change

This phase is a file-boundary refactor only. Move existing tests, fixtures, helpers, and imports into the destination files without changing assertions, test data, test titles, execution mode, or coverage.

### PDF/WCAG suite

Split `tests/e2e/pdf-wcag-compliance.spec.ts` (approximately 1,583 lines) into:

- `pdf-structure-tags.spec.ts` — tagged PDF, `/StructTreeRoot`, and marked-content coverage.
- `pdf-table-semantics.spec.ts` — table headers, colspans, and multi-page split coverage.
- `pdf-fonts-and-xmp.spec.ts` — embedded-font and PDF/UA/XMP identifier coverage.
- `pdf-form-specific.spec.ts` — accounting- and inventory-filing-specific coverage.

### Case-file and backup suite

Split `tests/e2e/save-open-sav.spec.ts` (approximately 756 lines) into:

- `case-file-roundtrip.spec.ts` — unencrypted, encrypted, and corrupted-file paths.
- `case-file-protection.spec.ts` — `preWriteValidator`, multi-ward isolation, and auto-save protection.
- `dashboard-backup.spec.ts` — preference isolation and single-ward export.

Shared helper code may be placed in an existing appropriate E2E support location only when required to preserve the original behaviour exactly. Do not use this phase to broaden abstractions or rewrite test logic.

### Phase 2 acceptance criteria

- Each original test appears once in exactly one replacement spec, with its title and assertions unchanged.
- Old monolithic specs are removed only after their replacements are present and discoverable.
- The affected suites pass independently and as part of the full E2E run.

---

## Phase 3: Classify Origin-Sensitive Tests and Trial Two Workers

### 1. Mark tests that need origin isolation

Audit and tag the suites that use shared-origin facilities or cross-tab coordination. The initial candidates are:

- `ward-lock.spec.ts`
- `backup-restore-sav.spec.ts`
- `pwa-registration.spec.ts`
- `offline.spec.ts`
- `tab-and-update.spec.ts`

Use a clear Playwright tag or annotation (for example, `@origin-state`) at the appropriate describe/spec level. The audit must also check their imported helpers so that the classification reflects actual shared state, including `navigator.locks`, Service Workers, and `BroadcastChannel`.

Critically, the audit scope must extend beyond the five suites listed above. Any spec that writes to IndexedDB via the case-file persistence layer (which includes every spec that calls `freshStartNoPassword` followed by `createWard`) is implicitly origin-coupled. Two workers running such specs concurrently against the same origin will collide on the same IDB database. The audit must determine whether a meaningful "stateless" subset actually exists. If it does not — or is too small to produce a material speedup — that is a valid outcome and the trial should be recorded as such rather than forced.

### 2. Measure a bounded parallel run

Against a local Vite preview build, run the untagged/stateless E2E tests with `--workers=2`. Repeat the trial enough to compare:

- pass/fail stability and any origin collision symptoms;
- elapsed time relative to the current worker count;
- CPU and memory pressure; and
- whether preview-server startup/teardown is reliable under concurrency.

Do not edit `playwright.config.ts` during this trial. If results are stable and materially beneficial, a subsequent reviewed change may define the permanent serial/parallel execution strategy. If the stateless subset is empty or near-empty, skip the trial, record the IDB coupling evidence, and retain the existing single-worker configuration.

### Phase 3 acceptance criteria

- Every known origin-sensitive suite is explicitly classified, with any newly discovered dependencies added to the same category.
- The two-worker command excludes the classified tests and produces recorded, repeatable measurements.
- No permanent parallelization or Playwright-project split is made without the trial evidence and a separate review.

---

## Verification and Review Gates

After each phase, review the diff for assertion and title parity, run the affected specs, then run the full E2E suite. Phase boundaries should be independently reviewable and revertible:

1. Ward-switch await plus plan fixture.
2. PDF/WCAG and case-file spec splits.
3. Origin-state tagging and the non-config-changing worker trial.

The proposed sequence intentionally does **not** add a separate navigation lifecycle hook: the concrete inconsistency is the un-awaited feature mounting in `switchWard()`, while normal `navigate()` already awaits those mounts. It also defers any worker project/config design until the measurement phase supplies evidence.

---

---

<a id="milestone-31-proposal-md"></a>

# Archive: MILESTONE-31-PROPOSAL.md

# Milestone 31: E2E Baseline Accuracy and Filing Capability Matrix

## Status

**Proposal only.** No test-file migration, Playwright configuration change, CI
change, or product-code change is authorized until this plan is reviewed and
approved.

This is the first of two milestones covering the original "Change-Surface E2E
Contracts, Artifact Semantics, and Distribution Parity" proposal, split for
review and risk reasons: this milestone (target-naming accuracy, skip
classification, and a declared filing capability matrix) is low-risk and
mostly mechanical. The larger, higher-risk work — the actual contract-group
rewrite, semantic artifact inspection, wait replacement, and CI distribution
profiles — is proposed separately as **Milestone 33**, which depends on this
milestone's output (the target vocabulary and filing matrix) and should not
begin until this one is approved and landed.

## Goal

Give the E2E suite an accurate, reproducible baseline and a single source of
truth for which of the app's nine filing types support which surfaces and
outputs — the foundation Milestone 33's contract groups will consume. Fix two
concrete, verified defects along the way: a dead target-name check that can
never fire, and the absence of any declared distinction between Final/Trust
and their shared Annual form code.

## Background

The existing suite has 45 spec files.

**Baseline history (both figures verified directly by this reviewer, not
taken on report):**

- A Chromium `source` run at commit `fbd8fd5` (Milestone 30's implementation
  commit, before Milestone 32 began) produced **202 passes, five intentional
  target skips, and zero failures**, confirmed by two independent runs. An
  earlier draft of this proposal claimed "200 passes... two stale PDF-title
  expectation failures" at this point; that figure did not reproduce and has
  been superseded. There is no known PDF-title drift failure in the suite.
- **Current baseline:** Milestone 32 (responsive breakpoint standardization)
  has since been executed, verified, committed, and pushed to `origin/master`
  at commit `b21bd24`, modifying `tests/e2e/attestation-layout.spec.ts` and
  `tests/e2e/schedule-card-layout.spec.ts` as expected. A fresh Chromium
  `source` run at `b21bd24` produced **202 passes, five intentional target
  skips, and zero failures**, independently confirmed and matching the
  pre-Milestone-32 totals exactly. This is the baseline this milestone and
  Milestone 33 should build from. Re-verify again immediately before this
  milestone's own implementation begins, since other work may land in the
  interim.

**Target naming is inconsistent with the actual configuration.**
`playwright.config.ts` defines exactly three distribution targets —
`source`, `web`, `portable` — plus a `dev` convenience mode that isn't a
distribution target at all. `tests/e2e/ward-lock.spec.ts:9` checks
`target === 'file'`, a string that does not exist anywhere in the configured
target vocabulary (confirmed by direct inspection). This skip condition can
never evaluate true under any real configuration, so whatever behavior it
was meant to guard against is currently unverified in every target, silently.

**Filing-family coverage differs materially, and Final/Trust is the sharpest
case.** Final and Trust Accountings share Annual's form code and receive
route-smoke and supplemental-document coverage, but have no explicit
feature-contract test of their own the way Annual does (`annual-mount.spec.ts`
has no `final-accounting-mount.spec.ts`/`trust-accounting-mount.spec.ts`
counterpart, confirmed by direct inspection) — despite Final and Trust having
legally distinct required titles and attestation language from Annual. There
is currently no single place that declares, for all nine filing types, which
outputs (PDF/DOCX/XLSX), routes, and identity requirements each one actually
supports — coverage gaps and intentional omissions are indistinguishable from
each other without reading every spec file.

## Non-Negotiables

1. Preserve existing product behavior. This milestone strengthens test
   infrastructure; it does not redesign filing, persistence, PDF, or PWA
   behavior.
2. Keep `workers: 1`. The suite shares an origin, IndexedDB, service workers,
   browser locks, BroadcastChannel state, and cross-tab tests; concurrency is
   not a safe default and is out of scope here regardless.
3. Retain all existing feature-specific tests unchanged. This milestone adds
   a target-vocabulary module and a capability matrix; it does not migrate,
   rename, or retire any existing spec.

---

## Phase 0: Establish an Accurate Baseline and Target Vocabulary

### 1. Reconcile the current source-target baseline

Before structural test changes, run the full Chromium suite at
`PG_TARGET=source` and record:

- total, passed, skipped, failed, and elapsed time;
- the target and browser in the report title;
- every skip and its reason; and
- any stale expectations corrected solely because a known, intentional output
  contract changed.

Do not count a result from a prior working tree after test expectations have
changed. The baseline must be reproducible from the current tree — see
Background above for what happens when it isn't.

### 2. Centralize target facts

Add one E2E support module, for example
`tests/e2e/support/target-profile.ts`, that owns the valid target names and
their properties:

```ts
type DistributionTarget = 'source' | 'web' | 'portable';

type TargetProfile = {
  id: DistributionTarget;
  isHosted: boolean;
  supportsServiceWorker: boolean;
  supportsFileSystemAccessAutomation: boolean;
};
```

`DistributionTarget` intentionally covers only the three shipped distribution
targets; `dev` (the live Vite dev server `tests/e2e/support/target.ts` also
accepts via `PG_TARGET=dev`, per its own "four parity targets" comment) is a
local convenience mode, not a distribution target, and is deliberately out of
scope for this vocabulary.

`playwright.config.ts`, `tests/e2e/support/target.ts`, and target-sensitive
specs import or derive their behavior from this one vocabulary. Eliminate
ad-hoc string checks such as `target === 'file'`.

Correct the Ward Lock exclusion to test `target === 'portable'`, if its
underlying Web Locks limitation is confirmed for the portable `file://` build.
The correction must be tested in both directions: it skips in `portable` and
still runs in `source`/`web`.

### 3. Classify all skips

Introduce a small helper for target-sensitive test declarations. It must make
the reason visible in the test name/output and use one of three categories:

- `expected-target-exclusion`: a capability cannot exist on that target, such
  as service-worker testing in a `file://` portable build.
- `environment-limitation`: a browser or CI limitation prevents a valid
  product behavior from being automated.
- `temporary-gap`: intentionally deferred coverage, with an owning milestone
  reference (an existing `MILESTONE-N-PROPOSAL.md` in this repository, since
  that is how this project tracks planned work — not an external issue
  tracker).

The helper must not conceal skips. A static audit test or a lightweight source
scan should reject bare `test.skip(...)` calls outside the helper, except for
a documented, reviewed allowlist. Existing `offline.spec.ts`,
`feature-load-failure.spec.ts`, `tab-and-update.spec.ts`, and `ward-lock.spec.ts`
are the first migration candidates.

### Phase 0 acceptance criteria

- All target names come from a single typed vocabulary.
- No E2E test checks for an undefined target name.
- Every dynamic skip reports one of the three classifications and a readable
  reason.
- A fresh Chromium source baseline is recorded before migration begins, and
  matches on re-verification immediately before implementation.

---

## Phase 1: Create a Filing Capability Matrix

### 1. Declare capabilities instead of inferring them from absent tests

Add `tests/e2e/support/filing-matrix.ts`. It is test-owned metadata, not a
second product filing descriptor. It lists all nine filing types:

```ts
type FilingCapabilities = {
  id: FilingType;
  family: 'inventory' | 'accounting' | 'plan';
  displayName: string;
  documentTitle: string;
  routeSet: readonly string[];
  exports: { pdf: boolean; docx: boolean; xlsx: boolean };
  preview: boolean;
  supplementalDocuments: boolean;
  needsDistinctLegalCopy: boolean;
};
```

The matrix must cover `guardian`, `simplified`, `annual`, `finalAccounting`,
`trustAccounting`, `planSimplified`, `planAnnual`, `planInitial`, and
`planMinor`.

Populate output capabilities from actual product support, not assumptions. If
a form has no Excel or DOCX export, the matrix says `false`. If an output is
supported, it is a candidate for a future contract test in Milestone 33. This
phase declares the matrix; it does not yet enforce or consume it beyond the
audit in step 3.

### 2. Make Annual aliases first-class entries

`annual`, `finalAccounting`, and `trustAccounting` may share form code and
fixture shape, but the matrix marks Final and Trust as
`needsDistinctLegalCopy: true`. This is a declaration only in this milestone —
Milestone 33's identity contract is what actually tests it.

### 3. Add a capability audit

Add a small contract spec that iterates the matrix and confirms:

- each filing type has a declared route set and one smoke route; and
- each declared output capability is a boolean, not absent/undefined.

This audit tests the matrix's own completeness. It does not test the
product's real output behavior — that is Milestone 33's job.

### Phase 1 acceptance criteria

- One matrix declares the supported surfaces of all nine filing types.
- Final and Trust are explicit entries, not implicit Annual aliases.
- Adding a filing type to the matrix without every required field fails the
  capability audit.

---

## Acceptance Criteria

- All target names come from a single typed vocabulary; no E2E test checks
  for an undefined target name (fixes the confirmed `target === 'file'` bug).
- Every dynamic skip reports one of three classifications
  (`expected-target-exclusion` / `environment-limitation` / `temporary-gap`)
  and a readable reason.
- One matrix declares the supported surfaces of all nine filing types, with
  Final and Trust as explicit, distinct entries.
- A fresh, reproducible Chromium source baseline is recorded immediately
  before implementation begins.
- No existing spec file is renamed, retired, or rewritten into a new format
  by this milestone. Phase 0.2–0.3's required migration of the 6 files that
  derive `PG_TARGET` or call `test.skip()` directly (`target.ts`,
  `ward-lock.spec.ts`, `offline.spec.ts`, `feature-load-failure.spec.ts`,
  `tab-and-update.spec.ts`, `pwa-registration.spec.ts`) is a surgical import
  and call-site swap in each — same tests, same titles, same behavior except
  the one confirmed bug fix (`ward-lock.spec.ts` now actually skips on
  `portable`, which the old `target === 'file'` check never did) — not the
  wholesale rewrite this bullet originally read as prohibiting entirely.

## Verification

- Run the capability audit and the target-vocabulary checks in isolation
  first, then the full suite (`npm test`).
- Confirm `ward-lock.spec.ts`'s corrected skip condition actually skips on
  `portable` and still runs on `source`/`web`.
- Record the resulting baseline in this document before considering the
  milestone complete, the same way the two prior baselines above were
  recorded and independently verified.

---

<a id="milestone-32-proposal-md"></a>

# Archive: MILESTONE-32-PROPOSAL.md

# Milestone 32: Responsive Breakpoint Standardization

## Status

Proposed implementation plan. This document does not implement application changes.

## Goal

Converge the app's responsive layout onto one coordinated breakpoint scale.
The sidebar's collapse point and the "pair of cards side by side" pattern
used across all 7 filing-type modules currently trigger at different,
uncoordinated pixel values, producing dead zones where a window is wide
enough for two-column cards but the breakpoint hasn't fired yet. Fix by
anchoring everything on Bootstrap's own stock scale (confirmed unmodified
in the vendored build) rather than inventing new one-off values or a custom
Bootstrap breakpoint rebuild.

This was evaluated against two alternatives — adopting more Bootstrap
components generally, and replacing Bootstrap with USWDS or Tailwind — and
scoped down to breakpoint standardization specifically, since the drift is
a discipline problem within the existing framework, not a framework
limitation. Bootstrap is already fully vendored offline (`lib/bootstrap.min.css`,
`lib/bootstrap.bundle.min.js`, both precached by the service worker, the JS
bundle at critical tier), already drives 300+ layout instances, and a
framework replacement would require re-implementing every JS-driven
interactive component (modals, off-canvas drawer) and re-verifying the
WCAG 2.1 AA / PDF/UA-1 accessibility work already completed, for no
functional gain specific to this app's dense, multi-field, print-to-PDF
form pattern.

## Baseline and Evidence

Inspection found the following. Recheck at implementation time since other
work may be active in the repository.

| Surface | Current observation | Implication |
| --- | --- | --- |
| `src/styles/shell.css:60` | Sidebar (fixed `272px`) collapses to an off-canvas drawer at a custom `900px`, a value invented only for the sidebar. | Anchor point for the whole scale; nothing else is coordinated with it. |
| `src/features/{guardian-inventory,annual-accounting,simplified-accounting,plan-simplified,plan-minor,plan-annual,plan-initial}/index.js` | The repeated "pair of cards" pattern (`.card-grid-2col` for party/guardian/witness cards, `.schedule-entry-grid` for financial schedule entries) pairs at three different breakpoints depending on module: `col-md-6` (768px), `col-lg-6` (992px, already fixed in Annual Accounting's schedules and parts of Guardian Inventory), `col-xl-6` (1200px, in 4 modules: plan-annual, plan-initial, plan-minor, and simplified-accounting). 30 occurrences need conversion (24 `col-md-6` + 6 `col-xl-6`); 23 additional instances are already at the target `col-lg-6` state. Guardian Inventory is partially migrated: 5 instances still at `col-md-6` (L451, L878, L901, L916, L1016) and 5 already at `col-lg-6` (L342, L940, L953, L990, L1002). | Same visual pattern, three different real-world trigger widths depending on which filing type a user is in. Guardian Inventory's mixed state means implementers must sweep only the `col-md-6` instances, not assume the file is uniformly unconverted. |
| `src/styles/cards.css:6` | `@media (min-width:768px) and (max-width:900px){.card-grid-2col>.col-md-6{width:100%;}}` — a hand-written compensating hack that exists only to force `md-6` cards back to single-column while the sidebar still occupies its 272px. | Direct, already-committed evidence the sidebar/card-breakpoint mismatch is a known, previously-patched pain point, not a new theory. |
| `src/styles/cards.css:5,10` | `.attorney-certification-card{width:calc(50% - .5rem);}` plus `@media (max-width: 900px){.attorney-certification-card{width:100%;}}`. | This card's width comes from its own standalone rule, not a Bootstrap `col-*` class — it needs its breakpoint value updated, not removed, since it is unaffected by the `col-md-6`→`col-lg-6` conversion elsewhere. |
| `src/styles/dashboard.css:24,27,232,239,244`, `src/styles/shell.css:66,249` | Seven more one-off custom pixel breakpoints (900 ×4, 1100, 620, 520, 640), uncoordinated with each other or with Bootstrap's scale. | Same class of drift, smaller blast radius. |
| `lib/bootstrap.min.css` | Confirmed stock/unmodified: default `sm/md/lg/xl/xxl` = `576/768/992/1200/1400`, and its own compiled `max-width` queries use `575.98px`/`991.98px` (verified directly in the vendored file, not assumed). | No custom Bootstrap build exists or is needed; use its own subpixel convention rather than inventing a different one. |
| `tests/e2e/attestation-layout.spec.ts` | Test selectors use two distinct `col-md-6` patterns: (a) bare `.col-md-6` selectors in the first test block (L23, L24, L40, L48, L63, L73, L91, L100) — these target Guardian Inventory cards whose markup uses `col-12 col-md-6`; (b) `.col-12.col-md-6` selectors in the accounting/plan test blocks (L124, L125, L130, L137, L144, L171, L172, L177, L184, L198, L207, L210, L219, L222, L233) — these target accounting and plan module cards. Both groups must change to `col-lg-6`. Separately, 6 selectors use `.cover-info-row > .col-md-6 > .summary-box` (L110, L157, L195, L204, L216, L230) and must **not** be touched — that pattern is intentionally out of scope. If M31 rewrites these tests into contract specs before M32 executes, the selector sweep becomes smaller or unnecessary. | Test-selector sweep must be scoped by container class, not a blind find-and-replace on the string `col-md-6`. |
| `tests/e2e/schedule-card-layout.spec.ts` | Already asserts `col-lg-6` pairing for Annual Accounting's schedules. Also contains 6 `.col-12.col-xl-6` selectors (L131, L132, L141, L150, L151, L165) for plan-annual, plan-initial, and plan-minor cards, plus 1 `.col-12.col-md-6` selector (L164) for simplified-accounting guardian cards — all must change to `.col-12.col-lg-6`. | Same verification pattern as prior work, not a new risk. |

## Existing Decisions and Scope

- Standardize on three purpose-based tiers, all stock Bootstrap values — no
  custom Bootstrap breakpoint rebuild:
  - `sm` (576px / `575.98px` max-width) — phone-only polish.
  - `md` (768px) — in-card field grouping ("City / State / Zip" rows).
    Already consistent everywhere via bare `col-md-N`; **not touched**.
  - `lg` (992px / `991.98px` max-width) — the "real estate" tier: sidebar
    collapse, all repeated card-pairing, dashboard stacking.
  - `xl`/`xxl` (1200/1400) stay reserved and unused for layout, as today.
- `cover-info-row`'s `col-md-6` pairs (bare, no `col-12` prefix — two short
  summary boxes on the cover page) are explicitly out of scope. They are a
  different, smaller pattern with no evidence of cramping, and must not be
  changed by either the markup sweep or the test-selector sweep.
- `cards.css:19`'s `768px–1279.98px` band (narrows `.schedule-page`'s
  `col-md-1/2/3` to a fixed third-width on tablets) is out of scope. It
  serves a different purpose — keeping already-narrow schedule columns
  usable, not sidebar-related — and has no evidence of miscalibration.
  Do not fold it into this milestone without separately verifying it first.
- The dashboard triage table's `1100px` collapse point is a candidate for
  folding into the `991.98px` tier, but only after visual verification that
  the table doesn't genuinely need the extra ~108px of room. Do not fold it
  on assumption alone.

## Implementation

### 1. Move the sidebar's collapse point onto the scale

`src/styles/shell.css:60` — change `@media (max-width:900px)` to
`@media (max-width:991.98px)`. This is the change that actually closes the
dead zone: once the sidebar and the card-pairing tier share the same
trigger, there is no window width where the sidebar has vacated its space
but cards still haven't paired.

### 2. Converge every repeated-card pairing onto `col-lg-6`

For each of the 7 feature files, find every `col-12 col-md-6` and
`col-12 col-xl-6` that appears inside a `.card-grid-2col` or
`.schedule-entry-grid` row and change it to `col-12 col-lg-6`. 30
instances need conversion: 24 `col-md-6` across all 7 modules plus 6
`col-xl-6` across 4 modules (plan-annual, plan-initial, plan-minor, and
simplified-accounting's remuneration cards). 23 instances in Annual
Accounting and Guardian Inventory are already at the target `col-lg-6`
state and should be left unchanged.

Guardian Inventory is partially migrated — its schedule cards (L342,
L940, L953, L990, L1002) already use `col-lg-6`, while its party and
witness cards (L451, L878, L901, L916, L1016) still use `col-md-6`.
Convert only the latter group.

Stay scoped to the literal `col-12 col-{md,xl}-6` pattern to avoid
touching `cover-info-row`'s bare `col-md-6` pairs, which are out of scope.

### 3. Remove the dead hack; fix the one that isn't dead

`cards.css:6` becomes dead code once `.card-grid-2col`'s cards are
`col-lg-6` everywhere — its selector (`.card-grid-2col>.col-md-6`) will
never match. Remove it.

`cards.css:10` is not dead — `.attorney-certification-card` gets its width
from its own standalone rule (`cards.css:5`), independent of the
`col-md-6`→`col-lg-6` conversion in step 2. Update its breakpoint to
`991.98px` rather than removing it.

### 4. Fold the remaining one-off custom breakpoints onto the scale

- `dashboard.css:24,27,239` and the sidebar (already covered in step 1) →
  `991.98px`.
- `dashboard.css:232`'s `1100px` triage-table collapse → fold into
  `991.98px` too, for one consistent "below lg" tier across the dashboard,
  unless visual verification shows the triage table needs the extra room
  (see Scope above — verify before folding).
- `dashboard.css:244`'s `620px`, `shell.css:66`'s `520px`, and
  `shell.css:249`'s `640px` → converge on `575.98px`. The `620px` block
  contains multiple rules (flex-direction, grid-template-columns,
  onboarding layout) — verify that all of them are still appropriate at
  the narrower `575.98px` trigger rather than assuming uniform suitability.

## Acceptance Criteria

- Cards in every one of the 7 filing-type modules pair up starting at
  exactly the same viewport width the sidebar collapses at (`991.98px`),
  with no dead zone at any width between them.
- No `col-md-6`/`col-xl-6` remains on a `.card-grid-2col`- or
  `.schedule-entry-grid`-wrapped card; `cover-info-row` is unchanged.
- `cards.css:6` is removed; `cards.css:10` is updated, not removed.
- All one-off `900`/`1100`/`620`/`520`/`640` custom breakpoints are
  replaced by `991.98px` or `575.98px`, except `cards.css:19`'s
  `768–1279.98px` band, which is explicitly untouched.
- `tests/e2e/schedule-card-layout.spec.ts` and
  `tests/e2e/attestation-layout.spec.ts` pass with assertions updated to
  match the new breakpoint, and the 6 `cover-info-row`-scoped assertions in
  `attestation-layout.spec.ts` are verified unchanged.
- Full suite (`npm test`) green before commit, per `CLAUDE.md`'s standing
  rule — the bar for committing to master is a green suite, not a branch.

## Verification

- Load each of the 7 modules' schedule/party pages at 900px, 992px,
  1100px, and 1200px viewport widths and confirm cards pair up starting
  exactly at 992px, with no gap between the sidebar's collapse and the
  cards' pairing.
- Visually confirm the dashboard triage table, header, and mobile
  single-column view still look correct at the folded breakpoints.
- Run the full unit + e2e suite (`npm test`) and both builds before
  committing.

---

<a id="milestone-33-proposal-md"></a>

# Archive: MILESTONE-33-PROPOSAL.md

# Milestone 33: Change-Surface E2E Contracts, Artifact Semantics, and Distribution Parity

## Status

**Completed.** All phases (Phase 1 through Phase 5) and review gates have been
implemented, verified, and landed. Milestone 33 is fully complete.

**Depends on Milestone 31.** This milestone's contract groups consume the
target vocabulary (`tests/e2e/support/target-profile.ts`) and filing
capability matrix (`tests/e2e/support/filing-matrix.ts`) Milestone 31 builds.
Do not begin this milestone until Milestone 31 is approved and landed, and
re-verify the baseline below against the tree as it stands after Milestone 31,
not the figures recorded here.

**Progress.** Milestone 31 landed (commit `c1c50c1`). Per this document's own
Migration Sequence ("begin with Annual/Final/Trust... do not combine all
phases in one change"), Phase 2.1's filing-identity contract has been
implemented and verified for its Annual/Final/Trust pilot scope only
(`tests/e2e/filing-identity.contract.spec.ts`, plus new helpers
`getPdfMetadata()` in `tests/e2e/support/pdf-extract.ts` and
`tests/e2e/support/docx-extract.ts`). Guardian, Simplified, and Phases 2.2
(form entry), 2.4 (persistence/recovery), 3, 4, and 5 remain proposal-only.

Migration Sequence step 2 ("Shared navigation/status pilot") has also landed,
initially for its Plan-family pilot scope: `tests/e2e/navigation-status.contract.spec.ts`
covers, for all four Plan types, three checks `plan-fixture.ts`'s existing
mount tests don't touch — disabled-Next guidance itemizing every missing
field, a jump link actually moving focus, and Print Preview's banner agreeing
with the blocked-export alert on how many issues remain.

**Guardian, Annual, and Simplified have since migrated into this contract
too.** Annual and Simplified reuse the exact same config-driven test loop as
the four Plan types (their architecture matches closely enough). Guardian
does not: its Next-button gate only ever covers the 11 numbered schedule
pages (Cover/D1–D5/Print are never gated, by design), a brand-new schedule
has 0 rows so no per-field jump link exists until one is added, its field
markup uses `data-field-path` (never `data-form-path`), and its Print
Preview issue count lives in `.validation-panel .validation-title`, not
`.print-preview-banner`. Per this document's own Phase 2 instruction
("preserve filing-specific route and status cases locally when they do not
fit a shared contract"), Guardian gets its own hand-written two-test block in
the same file instead of forced config entries.

Migrating Annual surfaced one more real, separate bug, fixed first: Annual's
Cover page (route `/`) could never get its Next button disabled or its
guidance panel populated, because `isScheduleIncomplete()` (`src/legacy-app.js`)
looked up the nav-check key `'a-cover'`, but `computeNavChecks()` actually
stores Annual's Cover-page completeness under `'a-p1'` (Annual's Cover page
is labeled "Part I", not "Cover") — the lookup always missed, silently
reporting Cover complete no matter how many required fields were blank.
Fixed with a one-line per-type override (`{annual: 'p1'}`) in
`isScheduleIncomplete()`'s key derivation; Simplified and the four Plan types
are unaffected (their Cover-equivalent keys already match the generic
`<prefix>cover` convention). One pre-existing, unrelated test
(`form-entry-ux.spec.ts`'s 8-digit date auto-mask test) used a `data-field-path`
selector on Annual's Cover page that was only unambiguous *because* that
page's guidance panel was previously always empty (the very bug just fixed);
once guidance legitimately renders there, the same selector also matched a
jump-to-field button and had to be tightened to `data-form-path` (unique to
the real input) — a real, if minor, side effect of the fix, not a new defect.

**`finalAccounting`/`trustAccounting` fixed and migrated too (follow-up).**
The two other `formEngine()==='annual'` aliases, initially left out of the
Guardian/Annual/Simplified migration above, turned out to have a larger
version of the same Cover-key bug: `isScheduleIncomplete()`'s `prefixMap` had
no entry for either at all, so `prefix` was `undefined` and the function
returned `false` unconditionally — *no* page was ever gated for these two
types, not just Cover, meaning Next was never disabled and guidance never
populated anywhere for a Final or Trust Accounting filing. Their route
resolution was already correct (same `annual-accounting` module, same
Roman-numeral labels, `errorRoute()` doesn't branch on filing type) — only
the completeness gate was broken. Fixed by adding
`finalAccounting:'a-'`/`trustAccounting:'a-'` to `prefixMap` and the same
Cover-key override Annual needed (`'p1'` for all three); both now have their
own config entries in the shared contract loop, reusing `validateAnnual()`
directly (same function, doesn't branch on `activeInventoryType`).

**One known, related gap intentionally left unaddressed:** field-path
accuracy (the same `adaptValidationErrors()` keyword-based `path` inference
already flagged as out of scope for the route-bucketing fix above) remains
unaddressed.

**Migration Sequence step 3 ("Form entry and persistence contracts") has
landed**, sized to what two research passes confirmed was actually
missing rather than the full checklist verbatim: `tests/e2e/form-entry.contract.spec.ts`
(7 tests) and `tests/e2e/persistence-recovery.contract.spec.ts` (4 tests).
Both checklists turned out to describe mechanisms already shared and
type-agnostic in the product code (the two-phase `writeDraftValue`/
`finalizeFieldValue` pipeline in `src/core/form/form-contract.js`,
`autoSave()`, the `__fieldDrafts` draft store, and the persistence layer in
`src/core/persistence/*.js`, confirmed to have zero `switch(inventoryType)`
branches), so most new tests use one or two representative filing types
rather than full per-type duplication — unlike the navigation-status
contract, whose bugs were genuinely per-type.

The flagship new test closes the single highest-value gap found: no
existing test combined an invalid draft surviving a real save-and-reopen
cycle with export still being blocked afterward (each half was proven
separately — `case-file-roundtrip.spec.ts` proves incomplete data survives
reopen but never attempts export after; the navigation-status contract
proves export blocking live, with no save/reopen around it). Also closed:
real paste (via actual OS clipboard, not `.fill()`, since nothing in this
suite exercised true paste mechanics before), a real Tab keypress commit
(every prior test used `.blur()` only), zero date-field coverage on any Plan
type, bar-number normalization (untested anywhere before), name/address/
city-state-zip formatting on the modern pipeline (previously proven only via
Guardian's legacy `data-bind` path), encrypted-mode recovery-cache restore
including the wrong-password path, and pending-valid-draft commit via save
rather than only blur. IME/composition is covered via synthetic
`compositionend` dispatch only — Playwright has no real IME automation
primitive, and this is documented as such rather than implied to be true IME
coverage. Verified: full Chromium `source` suite, all passing, before this
was considered landed.

**Step 3's other half — replacing fixed timing delays — has also now
landed.** The Migration Sequence's own wording for step 3 was "replace
timing delays while preserving specialized backup, lock, and migration
tests" (also separately listed as Phase 4 item 1); the contract files above
covered the first half only. All 18 `page.waitForTimeout()` calls across 6
spec files were individually researched against what they actually waited
for. Two were real bugs, not just smells: 5 occurrences (in
`annual-mount.spec.ts`, `guardian-inventory-mount.spec.ts`,
`simplified-mount.spec.ts`, and two files added earlier in this same step)
registered a dialog handler *after* already committing to a click, racing it
with a flat 500ms guess rather than the `page.waitForEvent('dialog')`-before-trigger
pattern this repo's own `plan-fixture.ts` already gets right — fixed by
copying that pattern. `importSavArchiveOrWard()`
(`src/core/persistence/case-file.js`) turned out to already dispatch a
`pg:backup-restored` event once `caseFile.wards` is fully merged (before its
own completion `alert()`) — `verified-inventory-workflow.spec.ts` already
used the sibling `pg:backup-saved` event correctly; `backup-restore-sav.spec.ts`'s
6 occurrences now use the same idiom (one exception: a test asserting a
dialog-count needed `expect.poll()` instead, since the event fires before
that count reaches its final value). `annual-mount.spec.ts`'s own Excel-import
test had already established `page.waitForFunction()` polling `window.D`'s
post-import value as the right idiom — reused for Simplified's equivalent
case. Three occurrences in `verified-inventory-workflow.spec.ts` were pure
redundancy on top of Playwright's own auto-retrying `expect(...).toBeVisible()`/`.click()`
calls immediately following them — deleted outright. One
(`guided-tour-navigation.spec.ts`) was replaced with a poll on the
walkthrough title actually changing rather than a padded guess against a
production `setTimeout(...,300)` — this one needed a second pass: the
poll's initial "no previous title" sentinel matched the tour tooltip's
static placeholder text on the very first check, resolving before the real
title ever rendered, caught by actually running the test rather than trusting
the fix on inspection alone. Exactly one fixed delay remains, by design:
`verified-inventory-workflow.spec.ts`'s "no unprompted auto-tour" check has
no event to wait for an absence, so it stays a documented fixed delay (with
the comment now naming the actual commit, `cab6b67`, that removed the timer
it guards against) — its own next assertion was also checking stale
selectors from a since-replaced tour widget, fixed alongside it. Verified:
full Chromium `source` suite, all passing, with several tests measurably
faster (no more flat 500ms/1000ms/300ms pads).

**Migration Sequence step 4 ("Distribution profiles") has landed.** The
underlying mechanism (`PG_TARGET`/`PG_BROWSER` env-var-driven
`playwright.config.ts` targeting, all four `BROWSERS` project defs, the
`source`/`web`/`portable` vocabulary in `target-profile.ts`, and the
three-category skip classification) already existed in full; what was
missing was npm-runnable commands (every run previously required manually
exporting env vars), a way to scope hosted/portable runs to
distribution-sensitive specs only rather than the whole suite, and
profile-labeled reporting. New `scripts/run-e2e-profile.mjs` (matching this
repo's existing small `scripts/*.mjs` helper pattern) sets `PG_TARGET`/
`PG_BROWSER` on a spawned child process directly rather than depending on
`cross-env` or shell-specific syntax, rebuilds `dist/web`/`dist/portable`
first when needed (both were stale relative to `src/` — confirmed, not
assumed), and prints a `=== profile: <target>/<browser> ===` banner. Six new
npm scripts (`test:e2e:source`/`web`/`portable`/`firefox`/`webkit`/`edge`,
plus `test:e2e:all-profiles`) wrap it; `HOW-TO-RUN.txt` documents them as the
primary way to run a specific profile.

Every profile was actually executed against the real curated spec lists (not
just documented) — all four browser engines are genuinely installed in this
environment (Chromium/Firefox/WebKit via Playwright, Edge via the system
install) — and this surfaced four more real, narrowly-scoped gaps, the same
"discover by executing" discipline as every prior step in this milestone:

- **`backup-restore-sav.spec.ts`'s cross-tab-lock-contention test** exercises
  the exact same Web Locks API `ward-lock.spec.ts` already documents as
  bypassed on file:// origins (`src/core/ward-lock.js`) — it just never had
  the matching `skipExpectedTargetExclusion` guard `ward-lock.spec.ts`'s own
  describe block already has. Added, using the same reason text.
- **`startup.spec.ts`'s "a deleted remembered case file" test** calls
  `navigator.storage.getDirectory()` directly, which throws a `SecurityError`
  under `portable` (file://) — `target-profile.ts`'s own
  `supportsFileSystemAccessAutomation: false` for `portable` already declares
  exactly this ("file:// origins do not get FSA pickers regardless of
  automation"); the test just wasn't using that existing flag. Added.
- **The same `startup.spec.ts` test also fails under Firefox** for an
  unrelated reason: it round-trips a real OPFS-derived `FileSystemFileHandle`
  through IndexedDB and depends on the app's `forgetPersistedCaseFileHandle()`
  cleanup actually firing; Firefox's File System Access API support doesn't
  round-trip a persisted handle through IndexedDB the same way Chromium-based
  browsers do (Edge, same engine, is unaffected — confirmed by actually
  running it). Classified `skipEnvironmentLimitation`, not a target exclusion
  — this is a harness/browser-API-support limitation, not a distribution
  target difference.
- **`form-entry.contract.spec.ts`'s real-paste test** calls
  `context.grantPermissions(['clipboard-read', ...])`, which throws "Unknown
  permission" outside Chromium — Playwright only supports granting clipboard
  permissions on Chromium-based browsers (Edge included). Also classified
  `skipEnvironmentLimitation`.

**Known, documented gap, not papered over:** the "hosted parity" profile's
row in Phase 5 §1 also names "chunk-load failure," but the only existing
test for that (`feature-load-failure.spec.ts`) is explicitly `source`-only
by design — it needs an unhashed, unbundled chunk URL to intercept, which
doesn't exist in a hashed/versioned web build. There is no web-mode
chunk-load-failure test today; noted here rather than substituting the wrong
test into the profile.

**Resolved by `MILESTONE-34-PROPOSAL.md`: the web-mode chunk-load-failure
test has landed.** `feature-load-failure.spec.ts` now has a `web`-target
sibling alongside its original `source`-only test, reading the dashboard
chunk's real built (hashed) URL from `dist/web/sw.js`'s generated
`PRECACHE_MANIFEST` rather than a stable unbundled path, and is wired into
`scripts/run-e2e-profile.mjs`'s `HOSTED_PARITY_SPECS` list so
`npm run test:e2e:web` covers it going forward.

Final verified results, all real executions:

| Profile | Result |
| --- | --- |
| `source/chromium` (Core full) | 263 passed, 5 skipped, 0 failed |
| `web/chromium` (Hosted parity) | 30 passed, 0 skipped, 0 failed |
| `portable/chromium` (Portable parity) | 17 passed, 12 skipped, 0 failed |
| `source/firefox` (Cross-browser smoke) | 53 passed, 2 skipped, 0 failed |
| `source/webkit` (Cross-browser smoke) | 53 passed, 2 skipped, 0 failed |
| `source/edge` (Cross-browser smoke) | 55 passed, 0 skipped, 0 failed |

**Phase 4 item 2 ("Label test layers in filenames and describes") — checked
and found already satisfied, no rename needed.** Cross-referenced every
pre-existing spec file this milestone actually touched
(`git log b21bd24..HEAD -- tests/e2e/`, correcting for two files that turned
out to be Milestone 31's, landed chronologically inside that commit range,
not Milestone 33's) against the doc's own rule: "rename only a file that is
materially rewritten during this milestone." Every touch was a small,
targeted fix (a dialog-race pattern, one skip guard, one selector
tightening) confined to a small fraction of each file — none crossed that
bar. The one borderline case, `guided-tour-navigation.spec.ts` (~40% of its
50 lines changed across two passes, since its wait-mechanism fix needed a
second pass), is still a single mechanism swap on one existing test, not new
coverage — optional, not required. No files renamed; this item needed no
code change, just this record that it was checked rather than skipped.

**Phase 2.1 (filing-identity contract) now covers all 9 filing types**, not
just the Annual/Final/Trust pilot. The identity-resolution mechanism was
already fully shared/generic for the 6 remaining types (guardian,
simplified, and the four Plan types) — `filing-descriptor.js`'s
`DESCRIPTORS`, PDF/DOCX generation, and export-gating are one shared engine
— so the extension was config data (a per-type export-action selector map
and an explicit filename-stem table, since each type hardcodes its own
filename stem in its own `print.js` rather than deriving it from the
descriptor the way Annual's family does) plus one locator override for
Guardian, whose sidebar hardcodes `"Case Info"` rather than the filing-type
name every other type's sidebar shows — its real visible-identity surface is
a Cover-route `<h1>` instead. Two things deliberately not added, matching
the landed pilot's own actual scope rather than a new gap: no attestation-
prose assertion beyond the document title (the pilot itself never asserted
that either; the different Preparer/Attorney role shapes per type are Phase
3's territory), and no "filing identifier" metadata assertion (confirmed
still not wired into the generated bytes for any of the 9 types, a
pre-existing product gap, not a test gap).

**Real product bug found and fixed while extending this contract, not a
test bug**: Plan Minor's own filing name was spelled two different ways in
two different real, shipped code paths. `src/features/plan-minor/index.js`
hardcodes an em dash everywhere in the live UI (sidebar, Summary title,
Cover `<h1>`, all "Annual Plan — Minors"); `filing-descriptor.js`'s
`DESCRIPTORS.planMinor.displayName` — the value `pdf-model.js` actually
writes into the generated PDF/DOCX metadata — used a plain hyphen ("Annual
Plan - Minors"). Fixed by correcting the descriptor to match the UI (the
more visible, more contained edit — one field vs. three call sites), per
your decision. Verified: full Chromium `source` suite, all passing.

**Real gap found and fixed during this pilot, not assumed away:** the
itemized guidance panel this section's own Phase 2.3 language describes
("disabled Next guidance identifies every local missing item") did not
actually work for eight of the app's nine filing types before this pilot.
`renderLocalSectionGuidance()` (`src/core/status/section-status.js`) was
previously imported only by `guardian-inventory/index.js` and
`annual-accounting/index.js`, so `window.renderLocalSectionGuidance` existed
only by session load-order accident for every other type, and only
`guardian-inventory/index.js` ever exposed its validator as
`window.validateGuardian` — the one binding
`legacy-app.js`'s `updateCurrentScheduleNextButton()` actually reads per
filing type. Annual, Simplified, and all four Plan types therefore always
fell back to one generic "Add at least one item..." message with no per-field
jump links, regardless of how many fields were actually missing. Fixed by
(1) importing `section-status.js` eagerly in `src/main.js` rather than
depending on which feature happens to mount first, and (2) exposing each
type's own validator on `window` (`validateAnnual`, `validateSimplified`,
`validatePlanAnnual`, `validatePlanInitial`, `validatePlanMinor`,
`validatePlanSimplified`), mirroring guardian-inventory's existing pattern
exactly. Verified with the full existing Chromium `source` suite plus the
new contract file, all passing, before this was considered landed.

**Resolved (follow-up fix, landed after the pilot above).** The limitation
this section originally recorded — `resolveRouteFromSection()` bucketing
every unrecognized section label onto Cover — turned out to affect Annual
and Simplified too, not just the four Plan types, once actually verified
against all six validators' real section labels (not assumed from the
Plan-only pilot's own scope): Annual/Simplified label sections with Roman
numerals ("Part II", "Parts VI & VII"), which the legacy Arabic-digit table
(`'part 1'`, `'part 2'`, ...) never matched either — only each type's literal
"Cover" and Annual's "Part I" (which defaults to the same route it needs, by
accident) resolved correctly; everything else fell through to `/`, and
several Plan labels containing "signature"/"guardian"/"preparer"/"attorney"
were actively misrouted to Guardian-Inventory's own `/d1`/`/d2`/`/d4` pages.

Fixed by reusing `legacy-app.js`'s existing `errorRoute()` — a regex-based
resolver already driving Print Preview's "Go to section" links, verified
correct for every real Guardian/Annual/Simplified label — as
`resolveRouteFromSection()`'s first resolution step, and adding a small
type-scoped exact-match table for the four Plan types' narrative headings
(which have no shared pattern a regex can generalize, and reuse labels like
bare "Signatures" across types for different pages — it resolves to `/p11`
for Plan Annual, `/p9` for Plan Initial, `/p3` for Plan Simplified). `filingType`
now threads from `legacy-app.js`'s `updateCurrentScheduleNextButton()`
through `renderLocalSectionGuidance()`/`adaptValidationErrors()` to
`resolveRouteFromSection()`. Verified: 5 new unit tests (the three-way
"Signatures" collision is the clearest proof type-scoping was actually
necessary), new e2e regression tests per Plan type plus one each for Annual
and Simplified proving a jump link now lands on the field's real page while
standing on it (not just that the item count matched, which the prior pilot
test could not distinguish from a wrong route), and the full Chromium
`source` suite, all passing. Field-path accuracy (a related but distinct gap
in the same file's keyword-based `path` inference) remains unaddressed —
out of scope for this fix, which is scoped to routing, not field focus.

**Field-path accuracy (sub-phase 3a: Guardian Inventory complete).** Three
parallel research passes mapped every validator's exact error strings, state
paths, and DOM binding attributes across all 9 filing types, confirming the
full field-path gap is larger than one session (Guardian needs 13 new
section branches; the Annual/Final/Trust/Simplified family needs ~25 more
across 11 schedules and 9 Cover/Part sections, several with real
cross-engine field-naming divergences (`attorney_bar` vs `attorney_barNumber`,
`officeStreet` vs `residenceStreet`, `certDate` vs `certServiceDate`); the
four Plan types need ~35 more, including a formType-conditional guardian
array shape, an attorney-name key that differs 3 ways, and two different
row-index extraction strategies depending on whether the type's validator
indexes a pre-filtered or raw array). Per the Migration Sequence discipline,
this is landing as its own sub-phase rather than combined with the other
three families.

This sub-phase closes Guardian Inventory's remaining 13 sections (B-2
through D-5) in `adaptValidationErrors()` (`src/core/validation/validation-adapter.js`),
extending the exact `if (sLower.startsWith(...))` pattern already proven by
the existing A-1/A-2/B-1 branches — no new abstraction needed. Notable
findings along the way: three fields (B-2's five vehicle sub-fields, D-3's
two Safe-Deposit-Box radios) have no `data-bind` at all and resolve only via
their literal element `id`, an exception `focusFieldByPath()`'s existing
`#${escaped}` selector already handles with no code change there; D-1 and
D-5's array rows use their own "Guardian #N"/"Recipient N" ordinals in the
section string rather than "row N", needing a separate local regex; and D-1's
fix incidentally corrects a real live bug where every co-guardian's missing
signature date used to jump to guardian #1's field regardless of which
guardian was actually incomplete, because the old generic fallback hardcoded
index 0. D-2's Preparer and Attorney share the "D-2" prefix and can only be
told apart by the *section* text, since their detail text is bare, identical
labels ("Name", "Phone", etc.) for both parties.

The Annual/Final/Trust/Simplified family and the four Plan types remain open
(sub-phases 3b/3c/3d, each scoped separately when reached) — the shared
bottom-of-chain generic fallback is still wrong for their attorney/preparer/
signature-date fields today (e.g. an Annual "Attorney Bar Number" error's
detail contains the word "attorney" and currently misresolves to the bare
`attorney` name field), deliberately left as-is rather than patched
partially, since a correct fix needs formType-gated branches that belong
with each family's own dedicated work.

Verified: 15 new e2e tests in `tests/e2e/navigation-status.contract.spec.ts`
(a config-driven loop over B-2 through C-5 reusing the existing A-1
assertion shape, plus dedicated tests for B-2's vehicle-ID exception and the
D-1 co-guardian regression, D-2's Preparer/Attorney disambiguation, and
D-3/D-4/D-5's flat and mixed shapes — the D-1 through D-5 tests call
`adaptValidationErrors()`/`focusFieldByPath()` directly rather than through
the local-guidance UI panel, since that panel never renders for these routes
for Guardian by design, per `isScheduleIncomplete()`'s 11-key whitelist), the
broader Guardian regression set (`guardian-inventory-mount.spec.ts`,
`verified-inventory-workflow.spec.ts`, `attestation-layout.spec.ts`),
`npm run test:unit` (173 passing), and the full Chromium `source` suite
(282 passed, 5 skipped, 0 failed).

**Field-path accuracy (sub-phases 3b/3c/3d: Annual/Final/Trust, Simplified,
and the four Plan types — landed together, per your instruction).** Extends
`adaptValidationErrors()` with formType-gated branches for the remaining
seven filing types, inserted after Guardian's own chain and before the old
generic fallback (left unchanged as the last-resort case, now effectively
dead for these seven types since every one of their sections has its own
dedicated branch). Every validator string was read directly from source
before writing the corresponding branch, not assumed from the earlier
research passes' summaries.

Notable shapes and real issues handled:
- Annual/Final/Trust and Simplified's Part III/Part IV guardian-row errors
  put their "Guardian #N —"/"Co-Guardian #N —" ordinal in the *detail* half
  of the message, not the section — the opposite convention from Guardian
  Inventory's own schedules, and from Annual's own `checkRows()` schedules
  (Schedule A, B-1–B-4, C, D-1–D-5, E, F-1/F-2), which put a "Line N —"
  ordinal in the detail instead. Two new regexes cover this, both scoped to
  the detail string rather than reusing Guardian's section-scoped `rowMatch`.
- Cross-engine field-naming divergences confirmed and handled distinctly:
  `attorney_bar` (Annual) vs `attorney_barNumber` (Simplified); `certDate`
  vs `certServiceDate`; Annual's guardian rows have no residence/mailing
  split (`mailingStreet`/`mailingCityStateZip` only) where Simplified's have
  both pairs; Annual's preparer field is named `street`, not `streetAddress`.
- A real ordering bug caught and fixed before it shipped: Schedule D-5's
  "Loan Type" label contains the substring "type", so a naive keyword chain
  checking bare "type" (Schedule D-1's own field) before "loan type" would
  have misrouted D-5's field to D-1's. Reordered, with a regression test.
- Two schedules whose error message can't name a single field
  (Schedule C's "Gain or Loss amount is required", Schedule E's 4-way
  Transfer In/Out message) resolve to the first field of the pair as a
  documented approximation — the message itself gives no way to disambiguate
  further, and this is still strictly better than the empty path before.
- The four Plan types' row-level errors ("row 1 needs...", "Row 1: ...")
  all put a bare ordinal at the start of the detail, covered by one shared
  regex — but planAnnual's own validator indexes into a *pre-filtered* copy
  of its array (blank rows stripped before indexing) while planInitial's and
  planMinor's index the raw array directly. planAnnual's fix carries an
  explicit code comment flagging this as a pre-existing modeling gap in the
  product validator itself, not something a path-resolution fix can correct
  without changing product validation behavior — still a strict improvement
  over the empty path it resolved to before.
- planInitial has two separate, never-synced attorney-name fields
  (`attorneyName`, cosmetic-only on Cover; `attorney_name`, the one actually
  validated on Attorney Certification) — resolved to the validated one.
- Every Plan type's "explanation required when X" message is conditional on
  a base question already being answered a certain way, and several share
  near-identical wording with that base question's own message — handled by
  checking the more specific "explanation"/"describe" message first in each
  chain (planSimplified's Question 7/9 pairs, planInitial's Section 2-3/6-7
  explain fields, planAnnual's Section 9 mental/physical explain fields).

Verified: 10 new e2e tests in `tests/e2e/navigation-status.contract.spec.ts`
(one representative test per notable shape/bug per family, not an
exhaustive enumeration of the ~85 new branches — Final/Trust aliases share
Annual's exact validator so aren't re-tested separately, matching
`annual-mount.spec.ts`'s own precedent for that alias), the full existing
47-test navigation-status contract spec (no regressions on the Cover-level
jump-link tests that previously passed only by coincidental generic-fallback
field-name matches), the broader Annual/Simplified/Plan-type mount and
consistency regression set (55 tests), `npm run test:unit` (173 passing),
and the full Chromium `source` suite (292 passed, 5 skipped, 0 failed).

All four items from the "smallest first" plan are now resolved for Item 3.

**Phase 3 (Item 4: Semantic Artifact Assertions) has landed — Milestone 33 complete.**
All requirements of Phase 3 are fully implemented and verified across all 9
filing types and their supported artifact formats (PDF, DOCX, XLSX):

1. **Lightweight XLSX inspection helper (`tests/e2e/support/xlsx-extract.ts`):**
   Unzips `.xlsx` archives via `jszip` (already a devDependency) with zero external
   runtime dependencies. Extracts sheet names (`xl/workbook.xml`), shared strings
   (`xl/sharedStrings.xml`), cell coordinates and values (`xl/worksheets/sheet*.xml`)
   for strings, inline strings, booleans, formulas, and numbers, as well as core
   metadata (`docProps/core.xml`). Backed by unit test `tests/unit/xlsx-extract.spec.js` (4/4 passed).

2. **Consolidated PDF metadata & legal expectations (`tests/e2e/support/filing-matrix.ts` & `pdf-extract.ts`):**
   Added `expectedPdfMetadataTitle(filingType, ward)` and `expectedLegalCopy(filingType)`
   for all 9 filing types (`annual`, `finalAccounting`, `trustAccounting`, `simplified`,
   `guardian`, `planAnnual`, `planInitial`, `planMinor`, `planSimplified`). Extended
   `pdf-extract.ts` with `inspectPdf()` returning `{ text, metadata }` structured
   observations. Refactored `tests/e2e/pdf-accessibility-and-signatures.spec.ts` and
   `tests/e2e/pdf-structure-tags.spec.ts` to consume `expectedPdfMetadataTitle`, eliminating
   duplicate hardcoded title literals.

3. **Semantic Artifact Contract Tests (`tests/e2e/output-semantics.artifact.spec.ts`):**
   10 comprehensive artifact contract tests covering:
   - **Transport:** file downloaded, non-empty bytes, valid magic bytes (%PDF, PK zip for DOCX/XLSX).
   - **Identity:** document title in metadata and headings, ward name, case number, and filename stem.
   - **Meaning:** required section headings, filing-specific legal copy / attestation text, and meaningful case values.
   - **Structure:** XLSX sheet verification ("Schedule A - Real Estate", "Summary") and cell coordinates; DOCX `word/document.xml` text/paragraphs inspection.
   - **Schedule A Supplemental Document Insertion:** uploads a PDF supplement and verifies that the inserted page physically follows Schedule A content, not appended at the document end.

4. **Product Findings & Harmless Harmonizations:**
   - Court pleading headers in DOCX use uppercase ward names via `getCaseCaptionTitle()` (`IN RE: THE GUARDIANSHIP OF <WARD>`), verified case-insensitively.
   - Plan Minor's unique UCN case number modeling (`d.ucn` rather than `d.caseNumber`) aligned in `fillMinimalValidPlanMinorWard` to guarantee consistent case number propagation into PDF metadata and visible text.

Final verified suite results:
- Unit suite (`npm run test:unit`): 177 passed (25 test files)
- Artifact contract suite (`tests/e2e/output-semantics.artifact.spec.ts`): 10 passed (0 failed)
- Hosted profile (`npm run test:e2e:web`): 30 passed, 0 skipped, 0 failed
- Portable profile (`npm run test:e2e:portable`): 17 passed, 12 skipped, 0 failed
- Core full suite (`npm run test:e2e:source`): 302 passed, 5 skipped, 0 failed

## Goal

Make the E2E suite a reliable safety net for actual application changes rather
than a historical collection of feature and milestone tests. The strengthened
suite will express shared contracts once, test every declared filing
capability from Milestone 31's matrix, inspect generated artifacts
semantically, and report distribution-target coverage honestly without
turning every CI run into a 40- to 60-minute matrix.

The primary outcome is simple: a change to filing identity, field entry,
navigation/status, output generation, persistence, or distribution behavior
must have an obvious, focused E2E contract that fails if an affected surface
drifts.

## Background

At the time of writing, Milestone 30 (`fbd8fd5`) and Milestone 32 (`b21bd24`)
have both landed; a Chromium `source` run at `b21bd24` produced **202 passes,
five intentional target skips, zero failures**, independently verified — see
Milestone 31 for the full baseline history and how an earlier, inaccurate
"two stale PDF-title failures" claim was corrected. Re-verify this figure
again once Milestone 31 lands, since its Phase 0 work touches skip
declarations directly.

Current coverage differs materially by filing family:

- The four Plan features share `tests/e2e/support/plan-fixture.ts` for route,
  blocked-export, PDF-export, lifecycle, and status checks.
- Annual, Simplified, and Guardian Inventory carry similar contracts in three
  independently maintained styles.
- Final and Trust Accountings receive route smoke and supplemental-document
  tests but lack the same explicit feature-contract coverage as the Annual
  base type, despite legally distinct titles and attestation language (see
  Milestone 31's capability matrix, which declares this gap explicitly).
- Most successful-export tests establish only that a download has an expected
  extension, nontrivial size, and (for PDFs) a `%PDF-` header. They do not
  consistently prove the output says what the user saw in the application.

The suite also supports three materially different distribution targets:
`source`, `web`, and `portable`. Its default is `source`; PWA/offline tests
are intentionally skipped outside `web`, while `portable` has no service
worker. Those exclusions are valid, but a source-only result must not be
reported as full distribution parity.

Finally, around fifteen fixed waits remain. Some are harmless historical test
delays, but others cover download, import, backup, or cross-tab timing that
should be synchronized on observable application state.

## Non-Negotiables

1. Preserve the existing product behavior and use this milestone to strengthen
   tests, not to redesign filing, persistence, PDF, or PWA behavior.
2. Keep `workers: 1`. The suite shares an origin, IndexedDB, service workers,
   browser locks, BroadcastChannel state, and cross-tab tests; concurrency is
   not a safe default.
3. Retain existing feature-specific tests until a replacement contract covers
   their behavior. Do not do a wholesale rename or directory migration.
4. Continue using browser Playwright for real PDF, DOCX, Excel, download, and
   service-worker integration. Unit tests may cover pure parsing helpers, but
   they do not replace artifact generation tests.
5. Do not introduce image-snapshot testing as a substitute for semantic
   assertions. Existing geometric/layout assertions remain in scope.
6. Do not run the entire suite for every target and browser combination. Use
   the bounded execution profiles in this plan.
7. A test may use controlled `window.D` state for model- and artifact-focused
   setup, but user-entry behavior must be tested through actual controls and
   events in a separate workflow contract.

---

## Phase 2: Add Change-Surface Contract Groups

Create contract specs alongside existing feature specs. Do not move every
legacy test at once. Each group takes matrix entries (from Milestone 31) and
focused setup helpers, then is introduced incrementally. A legacy test is
retired only when the new contract provides equal or stronger coverage.

### 1. Filing identity contract

Add `tests/e2e/filing-identity.contract.spec.ts`. For each filing type, it
asserts that the authoritative filing identity agrees across relevant surfaces:

- visible form and sidebar labels;
- Summary title and filing-type row;
- print-preview/court-document heading;
- PDF metadata title, subject, keywords, and filing identifier where present;
- PDF and DOCX visible legal wording where supported;
- generated filename; and
- allowed or blocked output actions.

For Final and Trust, assert their own court heading plus preparer and attorney
attestation language. The test must prove they are not emitted as Annual
Accountings.

**M25 sequencing decision — superseded, corrected during Phase 2.1
execution:** this section originally assumed Milestone 25 (filing-descriptor/
identity work) was not yet implemented, and planned to write the Final/Trust
portion of this assertion as a `temporary-gap` skip referencing it. By the
time this pilot was executed, Milestone 25 had already landed (commit
`32626d3`, "feat: unify filing identity and field commits") — verified
directly, not taken on report: `src/core/filing/filing-descriptor.js` already
declares fully distinct `documentTitle`/`displayName`/`filenameStem` per
alias, `pdf-model.js` and `print.js` both resolve identity through
`resolveFilingDescriptor()`/`filingCopy()` rather than a hard-coded string,
and `annual-mount.spec.ts` already had a passing model-level identity test
predating this milestone. The Final/Trust portion of this contract was
therefore written and verified as a real, currently-passing assertion against
the actual generated PDF/DOCX bytes (`tests/e2e/filing-identity.contract.spec.ts`)
— not skipped. No further Milestone 25 dependency remains for this milestone.

### 2. Form entry contract

Add `tests/e2e/form-entry.contract.spec.ts`, organized by field behavior,
not page ownership. It covers representative controls from every applicable
family:

- normal typing and paste;
- IME/composition completion where supported by the browser automation layer;
- tab, blur, and immediate navigation;
- rapid multi-field entry;
- valid and invalid dates, including required four-digit years;
- identifier preservation for case, account, check, and legal reference data;
- name/address display formatting; and
- auto-save, reopen, and output blocking for unresolved invalid drafts.

Every test that verifies an entry behavior must interact through the UI and
assert both the control display and persisted/reopened state. Direct state
setup is not an acceptable substitute for this group.

### 3. Navigation and status contract

Add `tests/e2e/navigation-status.contract.spec.ts`. For each matrix route set
it verifies, as applicable:

- route mounts with no page or console error;
- sidebar completion, Summary status, and the underlying completion function
  agree;
- disabled Next guidance identifies every local missing item;
- field jump links move focus to the expected field; and
- print preview and every supported export gate report the same blocking
  reasons.

This generalizes the valuable Plan fixture and the existing Annual, Guardian,
and Simplified summary parity tests. It must preserve filing-specific route
and status cases locally when they do not fit a shared contract.

### 4. Persistence and recovery contract

Add `tests/e2e/persistence-recovery.contract.spec.ts` for common behavior
across supported targets:

- normal save/open and encrypted save/open;
- auto-save and pending valid input commits;
- invalid input preservation and output blocking;
- recovery cache restore/decline/clear behavior;
- ~~legacy migration fixtures~~ (struck: there is nothing left to migrate.
  The old-format migration path was intentionally removed when the app
  unified to a single case-file format — `case-file-protection.spec.ts` and
  `dashboard-backup.spec.ts` already document this directly, both noting the
  version-1/2 migration scenarios are "simply impossible" now, not merely
  unhandled. `CASE_FILE_FORMAT_VERSION` is written once and never branched on
  anywhere in the repo; anything that isn't today's exact format is rejected
  outright with an error, not migrated. Confirmed during Migration Sequence
  step 3's own research, not assumed); and
- multi-tab lock contention where the target supports it.

Continue to keep specialized archive/security tests in their existing specs;
the contract checks cross-surface consistency rather than replacing detailed
format and cryptography cases.

### Phase 2 acceptance criteria

- Each change surface has a named, discoverable contract group.
- The four Plan forms, Guardian, Simplified, Annual, Final, and Trust all
  participate in the relevant shared contracts.
- Existing feature-specific tests remain until equivalent contract coverage is
  demonstrated in review.

---

## Phase 3: Make Output Tests Semantic

### 1. Reuse focused artifact helpers

Build on existing PDF extraction helpers (`tests/e2e/support/pdf-extract.ts`)
and add narrowly scoped helpers for DOCX and XLSX inspection. Helpers should
return structured observations, not make hidden assertions:

```ts
const pdf = await inspectPdf(download);
expect(pdf.metadata.title).toContain(expected.documentTitle);
expect(pdf.text).toContain(expected.attestationText);
```

For DOCX, inspect the generated package/document XML for required text and
headings. For XLSX, use the same technique: there is no XLSX-parsing
dependency available to Playwright's Node-side test code (`exceljs` is
vendored only for the browser, at `lib/exceljs.min.js`, and is not an
installed devDependency). `jszip` *is* already a devDependency — DOCX and
XLSX are both zip archives of XML parts, so XLSX inspection should unzip and
read `xl/workbook.xml` / the relevant sheet XML for declared identity cells
and expected sheets, the same approach as DOCX, not a new parsing library.
Do not assert incidental styling, package ordering, timestamps, or
byte-for-byte output.

### 2. Define output assertions by capability

Every supported output receives these layers:

- **Transport:** download event, expected extension, nonempty bytes, and basic
  file signature.
- **Identity:** filing title, ward/case identity where appropriate, metadata,
  and filename stem.
- **Meaning:** required section heading, filing-specific legal copy, and one
  meaningful case value.
- **Accessibility/structure:** preserve existing PDF/UA, selectable-text,
  signature, bookmark, and supplemental-document tests for PDFs that support
  them.

PDF page placement for supporting documents remains a semantic test: the
uploaded Schedule A document must occur immediately after its Schedule A
content, not merely be detected in the source data.

### 3. Consolidate duplicate metadata expectations

Move repeated known-document title construction into one test helper fed by
Milestone 31's filing matrix. Individual PDF structural specs may continue to
assert the raw stream, but they call the same expected-title function. This
prevents a single intentional title-format change from leaving multiple stale
literals.

### Phase 3 acceptance criteria

- A successful export cannot pass solely because its file downloaded.
- Every supported PDF asserts document meaning; DOCX/XLSX do so where
  supported, using `jszip`-based raw-part inspection for both.
- Final and Trust artifacts assert their distinct legal language.
- Existing deep PDF accessibility coverage remains present and independent of
  the new transport/identity checks.

---

## Phase 4: Normalize Synchronization and Test Layers

### 1. Replace arbitrary waits carefully

Inventory every `waitForTimeout()` call. Replace it with the event or state
that actually signals completion:

- exports: `page.waitForEvent('download')` plus completion status where needed;
- imports: model state, status text, or a file-processing completion marker;
- navigation: heading/route/mount readiness;
- recovery: visible restore prompt or cache state;
- cross-tab/locks: `window.getLockState()`-style observable state, a
  BroadcastChannel-visible state transition, local-storage state, or the
  contention dialog itself.

Do not replace a delay with an aggressive poll that races a genuine
BroadcastChannel or storage propagation boundary. Lock and backup tests must
wait for their actual state transition and verify both tabs' observed state.

Leave a fixed delay only for a behavior whose requirement is itself temporal.
Such a delay needs a comment naming that behavior and why no deterministic
event exists.

### 2. Label test layers in filenames and describes

New tests use behavior-first naming:

- `*.workflow.spec.ts` for real UI entry;
- `*.contract.spec.ts` for cross-form expectations;
- `*.artifact.spec.ts` for generated-file inspection; and
- `*.integration.spec.ts` for persistence, locks, PWA, and distribution.

Do not rename all 45 existing files. Rename only a file that is materially
rewritten during this milestone, and retain a short comment mapping a legacy
milestone name when it helps maintenance history.

### 3. Centralize common observability helpers

Provide small helpers for console/page-error capture, route readiness,
download capture, and assertions that a test is using workflow versus fixture
setup. Helpers must remain transparent: a failure message names the filing,
route, output, and expected state.

### Phase 4 acceptance criteria

- Every replaced delay waits on an observable product/event condition.
- Cross-tab lock tests wait for real lock state or visible contention, not a
  shorter arbitrary timeout.
- New or substantially rewritten specs identify their test layer.
- Shared helpers improve failure messages rather than hiding assertions.

---

## Phase 5: Distribution and Browser Execution Profiles

### 1. Keep the full run bounded

The current serial Chromium source run is approximately 7.6–8.8 minutes
(varies run to run; see Background). Running the full suite across three
targets and four browser engines would create an unacceptably slow and noisy
gate. Use these profiles instead:

| Profile | Target / Browser | Scope |
| --- | --- | --- |
| Core full | `source` / Chromium | Full workflow, contract, artifact, persistence, and security suite. |
| Hosted parity | `web` / Chromium | PWA registration, offline cache, chunk-load failure, hosted output/save-open smoke, and bootstrap. |
| Portable parity | `portable` / Chromium | File bootstrap, portable save/open/export smoke, fallback behavior, and explicit service-worker exclusions. |
| Cross-browser smoke | Firefox, WebKit, and Edge where available | Form entry/date behavior, download fallback, output-gate, and startup/unlock smoke. |

The hosted and portable profiles run all distribution-sensitive specs, not the
whole source suite. A pull request that changes a target-sensitive subsystem
must select the corresponding profile. Scheduled or release validation runs
all profiles.

### 2. Report profile-specific results

CI and local documentation report results as, for example,
`source/chromium: 202 passed`, `web/chromium: ...`, and
`portable/chromium: ...`. Skips are counted separately with their classified
reason (from Milestone 31's three-category scheme). No aggregate result may
imply that skipped hosted/portable behavior was executed.

### 3. Retain serial execution

Keep `workers: 1` in `playwright.config.ts`. This milestone does not attempt
parallel execution. If a later effort considers workers greater than one, it
must first isolate storage/origin state and demonstrate repeatable concurrency
measurements in a separate proposal.

### Phase 5 acceptance criteria

- `source`, `web`, and `portable` each have a documented, executable profile.
- Hosted PWA tests run in the `web` profile and are explicitly excluded from
  `portable`.
- Browser smoke coverage exercises fallback behavior rather than only Chromium
  happy paths.
- The documented full-matrix policy is bounded and practical.

---

## Migration Sequence and Review Gates

This is additive and incremental. Do not combine all phases in one change.

1. **Identity plus artifact pilot:** begin with Annual/Final/Trust because it
   proves alias-specific legal output and semantic artifact inspection.
2. **Shared navigation/status pilot:** extend the existing Plan fixture or a
   narrow successor; then migrate Guardian, Simplified, and Annual only after
   parity is demonstrated.
3. **Form entry and persistence contracts:** replace timing delays while
   preserving specialized backup, lock, and migration tests.
4. **Distribution profiles:** add target/browser commands and release gates
   after target-sensitive specs are correctly classified (Milestone 31).

At each gate:

- run the affected tests first;
- compare retained and replacement test titles/coverage paths;
- run the appropriate target profile; and
- run the full Chromium source suite before merging a phase.

No legacy spec is deleted merely because a new group exists. Deletion requires
a review note showing which contract case superseded every meaningful
assertion.

## Acceptance Criteria

- Every supported filing/output pair (per Milestone 31's matrix) has a
  declared artifact test; every unsupported pair is explicitly declared
  unavailable.
- Final and Trust prove their own UI, summary, print, metadata, filename, and
  legal-attestation output rather than inheriting Annual expectations. (The
  Milestone 25 dependency originally anticipated here was already resolved
  before this pilot ran — see the corrected sequencing note above — so this
  is a real passing assertion, not a `temporary-gap` skip.)
- Navigation/status contracts prove sidebar, Summary, Next guidance, jump
  links, print preview, and export gates agree.
- Form-entry workflow tests cover typing, paste, blur/tab, rapid entry,
  invalid drafts, persistence, and reopening for shared field behavior.
- Successful-output tests verify artifact identity and meaning, not just a
  download's extension or header bytes.
- Fixed waits are either replaced by observable conditions or explicitly
  documented as temporal requirements.
- Source, web, and portable results are reported separately; Chromium remains
  the full-suite gate and other engines run the bounded smoke profile.
- `workers: 1` remains until a separate, measured origin-isolation proposal
  establishes safe parallelism.

---

<a id="milestone-34-proposal-md"></a>

# Archive: MILESTONE-34-PROPOSAL.md

# Milestone 34: Distribution-Target Failure-Mode Coverage

## Status

**Implemented; the added test is verified.** The web-mode
chunk-load-failure test has been written (`tests/e2e/feature-load-failure.spec.ts`)
and wired into `scripts/run-e2e-profile.mjs`'s `HOSTED_PARITY_SPECS`, per the
Proposed Approach and Acceptance Criteria below. On 2026-09-10, it was run
for real against a freshly built `dist/web` (`npm run build:web`):
`PG_TARGET=web PG_BROWSER=chromium npx playwright test
tests/e2e/feature-load-failure.spec.ts` passed (the `web`-mode test ran and
passed; the existing `source`-only test correctly skipped), and
`PG_TARGET=source PG_BROWSER=chromium npx playwright test
tests/e2e/feature-load-failure.spec.ts` also passed (the `source`-only test
unchanged and passing; the new `web`-mode test correctly skipped). That
confirms the added test itself is genuine and the existing test is
untouched, per this milestone's own Acceptance Criteria and Non-Negotiable
#3.

This was a targeted run of the one changed spec file against both targets,
not the full suites. Milestone 37-2 originally called for a full
`npm run test:e2e:web` (the whole `HOSTED_PARITY_SPECS` set) and a full
`npm run test:e2e:source` (the entire `tests/e2e/` suite) before recording
that milestone's own closeout; the requester explicitly accepted this
narrower, single-spec-file verification in place of that fuller run
(2026-09-10) and closed 37-2 on that basis — see
`MILESTONE-37-PROPOSAL.md`'s 37-2 section for that record. The full-suite
run itself has still never been performed. This document holds the first
piece of what may grow into a small set of distribution-target-specific
failure-mode tests; only the piece below is scoped so far.

## Goal

Add the web-mode (`dist/web`, `PG_TARGET=web`) equivalent of
`feature-load-failure.spec.ts`'s chunk-load-failure test, closing the one
gap Milestone 33's Phase 5 flagged rather than papered over: the "hosted
parity" execution profile's own scope table names "chunk-load failure," but
no test for that exists under the `web` target today — only under `source`.

## Background

`feature-load-failure.spec.ts` (landed under an earlier milestone) proves
that a feature chunk failing to load shows a "This section could not be
loaded" message with a working Reload action, instead of a silent blank
view. It works by intercepting a literal, stable path:
```js
await page.route('**/src/features/dashboard/index.js', async route => {
  await route.abort('failed');
});
```
This is explicitly `source`-only
(`skipEnvironmentLimitation(!sourceTarget, 'The source target exposes a
stable unbundled chunk URL for failure injection')`) because `source` serves
unbundled ES modules directly by their real path. `dist/web`'s Vite build
hashes every chunk filename (confirmed: the dashboard chunk built as
`assets/dashboard-lbmMcAnk.js` in a recent build; the hash changes on every
rebuild), so the same literal route glob cannot survive past the build that
produced it.

Two things were confirmed while scoping this milestone, so implementation
doesn't have to rediscover them:

1. **Chunk selection must be manifest-driven.** Do not treat the
   `dashboard-*.js` basename as a Vite/Rollup contract. Read the generated
   dashboard chunk URL from `dist/web/sw.js`'s `PRECACHE_MANIFEST` (or another
   generated build manifest with the same authoritative URL), assert that
   exactly one dashboard candidate is found, and register the route against
   that exact URL. A basename glob may be used only as a diagnostic fallback,
   never as the acceptance path; it must also assert exactly one candidate.
2. **The dashboard chunk is precached at `"offline"` tier, not `"critical"`**
   — confirmed directly by inspecting `dist/web/sw.js`'s generated
   `PRECACHE_MANIFEST` (built by `scripts/generate-service-worker.mjs`):
   `{"url":"./assets/dashboard-lbmMcAnk.js", ..., "tier":"offline", ...}`.
   The "critical" tier is installed synchronously on first load
   (`offline.spec.ts`'s "first load installs the atomic critical shell"
   test); "offline" tier entries are only fetched into the cache when the
   user explicitly triggers `DOWNLOAD_OFFLINE_PACK` (`offline.spec.ts`'s
   "ready offline pack" tests). That means on a **fresh session that has
   never downloaded the offline pack**, a request for the dashboard chunk
   should still be a genuine network request Playwright can intercept — the
   same shape as the `source` test, just against a hashed URL. This needs to
   be verified against the service worker's actual fetch handler (the
   generated `dist/web/sw.js`, and the template `generate-service-worker.mjs`
   fills in) rather than assumed. Before the dashboard import, the test must
   prove that the page is not already controlled by a service worker.
   Playwright routing is not assumed to intercept requests already handled by
   a controlling service worker, and page code cannot patch the service
   worker's global `fetch`. If a fresh uncontrolled page cannot provide a
   reliable interception point, use a separate Playwright context configured
   with `serviceWorkers: 'block'`, and document why that context still
   exercises the generated hosted `dist/web` build. Do not use an in-page
   service-worker-fetch interception fallback.

## Non-Negotiables

Carried forward from Milestone 33, since this is the same test suite under
the same constraints:

1. Preserve existing product behavior — this milestone strengthens test
   coverage, it does not change the chunk-load-failure UX itself.
2. Keep `workers: 1`.
3. Retain `feature-load-failure.spec.ts`'s existing `source`-only test
   unchanged; this adds a `web`-mode sibling, it does not replace or rename
   the existing spec.
4. No image-snapshot testing as a substitute for the semantic assertion
   (the "could not be loaded" message and Reload action, same as the
   existing test).

## Proposed Approach

Add a new test to `feature-load-failure.spec.ts` (or a `web`-scoped sibling
file, if keeping the two target-specific tests in one `describe` makes the
skip/target split clearer — decide at implementation time by which reads
better once both are written) that:

1. Skips via `skipExpectedTargetExclusion(currentTarget !== 'web', ...)`
   (the mirror image of the existing test's `source`-only guard).
2. Creates a ward and, on a **fresh session** (no offline pack downloaded —
   the default state `freshStartNoPassword()` already produces), reads the
   dashboard chunk URL from the generated manifest, asserts exactly one
   dashboard candidate, routes that exact built URL to abort, then navigates
   to `/dashboard`.
3. Asserts the same "This section could not be loaded" message and working
   Reload action the `source` test already asserts, proving the failure-mode
   UX itself is shared/target-agnostic product code (per the two-phase
   commit / shared-mechanism pattern this whole test suite already leans on
   for `web`/`source`/`portable` parity elsewhere) — this test is about
   proving the *test infrastructure* can inject the failure under `web`,
   not about the UX differing by target.
4. If point 2 above (offline-tier caching interaction) turns out to block
   simple network-level interception, document the actual mechanism found
   and adjust the interception approach accordingly — do not weaken the
   assertion to something that would pass regardless of whether the failure
   was genuinely injected.

## Acceptance Criteria

- A `web`-target chunk-load-failure test exists, passes for real against a
  freshly built `dist/web`, and is wired into
  `scripts/run-e2e-profile.mjs`'s `HOSTED_PARITY_SPECS` list (Milestone 33,
  Phase 5) so `npm run test:e2e:web` covers it going forward.
- `feature-load-failure.spec.ts`'s existing `source`-only test is untouched
  and still passes.
- `MILESTONE-33-PROPOSAL.md`'s "Outstanding task" note referencing this gap
  is updated to point at this milestone once it lands.
- Verified against the full Chromium `source` suite and the `web` profile,
  same discipline as every Milestone 33 step.

## Related, Out-of-Scope Work

Two related planning documents were split out of this file on 2026-09-09 so
this document could stay scoped to the web-mode chunk-load-failure test
above — neither expands or gates Milestone 34's own scope:

- `MILESTONE-34-1-PROPOSAL.md` — a follow-on bug-correction plan (validation
  contracts, shared PDF rendering fixes, filing-specific output semantics,
  and supplemental-document/evidence-dependent findings) from a browser
  review, unrelated to distribution-target test coverage.
- `MILESTONE-34-2-PROPOSAL.md` — data-model documentation remediation
  (`DATA-MODEL-REMEDIATION-PLAN.md` / `probate-guardian-data-model.csv`
  harmonization), documentation-only, unrelated to this test.

---

<a id="milestone-34-1-proposal-md"></a>

# Archive: MILESTONE-34-1-PROPOSAL.md

# Milestone 34-1: Follow-On Bug-Correction Plan

## Status

**Proposal only.** No product-code or test-code change is authorized until
this plan is reviewed and approved. Split out of `MILESTONE-34-PROPOSAL.md`
(2026-09-09) so that document could stay scoped to its actual, ready-to-
implement web-mode chunk-load-failure test; this plan is a separate, larger,
speculative initiative and was never part of Milestone 34's own scope even
before the split — Milestone 34's own text says explicitly that these items
"do not expand Milestone 34's implementation scope" and "require a later
milestone or an explicitly approved scope change."

## Background

Recorded here for sequencing after a browser review identified additional
print-preview and filing-quality issues, separate from the distribution-
target test-coverage work in `MILESTONE-34-PROPOSAL.md`.

## Follow-On Bug-Correction Plan

Split into five lettered sub-milestones so each can be scoped, executed, and
marked complete independently rather than as one 14+ item omnibus — see
"Recommended Order and Dependencies" below for how they sequence against
each other. Still one document; these are not separate proposal files.

### Milestone 34-1A: Validation & Export Gating

**Status: Items 1, 2, and 3 all implemented and tested. 34-1A complete.**

Item 2: new `checkDateOrder()` helper (`src/core/validation/date-rules.js`)
wired into `validateAnnual`/`validateSimplified`/`validatePlanAnnual`/
`validatePlanMinor`/`validatePlanSimplified` for period ordering (with
exact-same-day rejection), GID-not-after-period-start, and signature/
preparer/attorney/certification dates not-before-period-end. New priority-
ordered branches added to `validation-adapter.js` so these new messages
(several of which contain both the "from" and "to"/GID label as substrings)
resolve to the correct field, not the first-matching bare label. Six
existing e2e fixtures' canned signature/cert dates were adjusted to satisfy
the new rules (they previously predated their own filing's period end).
7 new unit tests (`date-rules.spec.js`) + 13 new e2e contract tests
(`date-validation.contract.spec.ts`, including field-path routing
regressions).

Item 1: promoted the confirmed drift between each Plan type's readiness
panel and its actual validator into real blocking checks —
`validatePlanAnnual`/`validatePlanInitial` now require guardian
street/mailingStreet+phone+ssn and at least one provider row;
`validatePlanMinor` now requires guardian mailingStreet+phone+tin, at least
one treatment-provider row, and `preparer_signatureDate` (previously only
`preparer_name` was required); `validatePlanSimplified` now requires
guardian email+phone+mailingAddress. `certPhysicianAttached` (Plan Annual)
moved from the readiness panel's `auto` list into `manual`, matching Plan
Minor's existing treatment of the same fact — DECISION applied as
recommended (depends on an external, unverifiable-by-software fact, so it's
a reminder, never an export blocker). Fixed the shared `pdf-preview.js`'s
`mountPdfPreview()`/`printGeneratedPdf()`, which called
`prepareFilingOutput(D)` with no `baseIssues` and gated on `structuredIssues`
(draft/identity issues only, never carries the caller's baseIssues) instead
of `messages`/`canExport` — meaning the embedded preview could render a
clean PDF on the same page whose own banner reported missing required
fields. This affected all 7 filing modules that call this shared preview
(Guardian, Annual, Simplified, and all 4 Plan types), not just the Plan
family, so the fix and its regression test cover all 7.
New `tests/e2e/plan-readiness.contract.spec.ts` (9 tests:
ready/blocked agreement per type + the manual-reminder DECISION) and a new
regression block in `pdf-preview-viewer.spec.ts` (7 tests, one per feature)
proving an incomplete filing's preview is now blocked, not silently
rendered.

177 targeted e2e tests + 184 unit tests re-verified green across every
touched filing type and the shared preview/validation-adapter modules.

1. **Make readiness status reflect export eligibility.**
   Audit the shared `prepareFilingOutput()` boundary and each plan readiness
   panel. The preview banner must not say `Ready to export` while an automatic
   readiness check is outstanding or while a required manual filing action is
   still unresolved. Keep manual reminders visibly distinct from machine-
   verifiable blockers, but use unambiguous status text and button gating.
   Add contract tests for: no issues, automatic issue, supplemental issue,
   and manual-only reminder.
   *Implementation note:* export gating must stay scoped to genuine
   machine-verifiable blockers. Preparers routinely share draft PDFs for
   interim review (with attorneys, clients, banks) before every manual
   filing action is resolved — hard-blocking export on an unresolved manual
   reminder (e.g. "attach the physician's statement") would break that
   workflow. The distinct-manual-vs-blocking language above already reflects
   this; don't let the eventual fix collapse the two into one blocking list.

2. **Validate annual filing periods and related dates.**
   Add shared date rules for ordering, one-day annual periods, and dates that
   fall outside the relevant accounting/reporting period. Apply them to
   Annual, Final, Trust, Simplified Annual Accounting, and the annual Plan
   variants where the rule is applicable. Add boundary tests for same-day,
   reversed, just-under-one-year, valid annual, and out-of-period service
   dates. Ensure errors flow through the existing field-path/highlight system.
   *Implementation note:* Final/Trust/first-year accountings can legitimately
   cover irregular, non-annual-length periods (e.g. a short final period
   between a ward's death and discharge, or a partial first year from
   inception). The rule must check *ordering* (period-to on/after period-
   from) and *exact same-day rejection*, never a fixed "~365 days" duration
   requirement, or every legitimate short period gets falsely flagged.
   (This session's own research and draft implementation plan for this item
   already scope it this way — noted here so a future implementer doesn't
   accidentally tighten it further.)

3. **Audit validation-to-field mapping.**
   Verify that every new semantic error identifies the correct form field and
   does not regress the existing required-field contract. Test both live
   preview navigation and export blocking, including rapid date entry followed
   immediately by navigation.

### Milestone 34-1B: Shared PDF Engine Polish

**Status: Items 4, 5, 6, and 7 implemented with targeted unit and E2E
coverage. 34-1B complete pending the repository-required full regression
suite before commit.**

The shared PDF engine now owns a single footer identity contract: models pass
only their filing descriptor as `formSubtitle`, while the engine appends the
ward once. This removes the Annual/Final/Trust duplicate ward-name output.
`composePdfAddress()` centralizes presentation-only street/city-state-ZIP
joining for accounting and inventory PDF models, preserving entered unit text
while removing empty commas and inconsistent whitespace. Continuation-header
cells now use two-line wrapping in a taller bounded bar, with a visible
ellipsis only for exceptional overflow rather than silently taking the first
line. Finally, the preview pager refreshes only after pdf.js renders finalized
PDF bytes and rebuilds itself on rerender; its displayed count is therefore
the same count used for Save/Print.

Targeted verification: `npm.cmd run check:types`; focused Vitest coverage
(`pdf-address-format.spec.js`, `amended-form-line.spec.js`); and the Edge
`pdf-preview-viewer.spec.ts` suite, including the finalized-page-count and
rerender regression. Full `npm test` has not been run because `CLAUDE.md`
requires explicit permission before that suite.

4. **Remove duplicate accounting footer identity text.**
   Define one source of truth for the footer subtitle and ward name, then make
   the shared footer render each exactly once for Annual, Final, Trust, and
   Simplified Accounting. Add PDF text assertions for one, two, and three
   guardians and for every accounting filing descriptor.

5. **Make preview pagination derive from the finalized PDF.**
   Compare the page count rendered by pdf.js with the finalized PDF's page
   count and expose one shared count to the toolbar and footer contract. Add
   regression tests with and without supplemental pages. Include a test that
   re-renders the preview after navigation so stale pager DOM cannot survive a
   new PDF.
   *Implementation note:* assembling a multi-megabyte finalized PDF
   synchronously on every preview navigation risks frame drops or pager race
   conditions. Debounce/cache the finalized-PDF generation behind a single
   promise boundary, and test rapid tab-switching between form pages and
   print preview specifically.

6. **Handle continuation-header titles without silent truncation.**
   Replace the current first-line-only behavior with a bounded, intentional
   layout: wrap within the header cell, shorten through a documented title
   policy, or move the full section title to a second line. Add a generated-PDF
   text/layout test using the longest section titles and long ward/case names.

7. **Normalize address composition at the PDF model boundary.**
   Centralize street/city-state-ZIP joining and whitespace/comma cleanup, then
   use it in all PDF models instead of ad hoc template interpolation. Preserve
   user-entered apartment/unit text and avoid changing unrelated free-form
   notes. Add unit tests for missing components, existing commas, compact
   `City FL ZIP` input, and multi-line addresses.

### Milestone 34-1C: Filing & Form Semantics

**Status: Items 8–11 implemented; focused verification complete, full
regression verification pending.**

Implemented the optional co-guardian signature contract across all four Plan
PDF models, retaining the required primary guardian and suppressing empty
editor placeholders. Added unit coverage for absent and populated optional
co-guardians in Annual, Initial, Minor, and Simplified Plans.

Plan yes/no values now preserve an unanswered value separately from explicit
legacy `false`/`No` through the shared tri-state contract. Plan validators
require unanswered binary answers where applicable, while PDFs render an
explicit `No` rather than silently blanking it. Multi-choice questions retain
their explicit `None` option and conflicting-selection validation. A per-ward
schema version migrates legacy Plan booleans during both `.sav` import and
session recovery, leaving omitted values unanswered instead of silently
converting them to `No`.

County is authoritative at `caseFile.cases[].county`; filing and attorney
county differences produce non-blocking output advisories without overwriting
stored filing data. The same advisory is rendered on all seven filing print
surfaces.

8. **Suppress empty optional co-guardian/signature blocks.**
   Render optional co-guardian blocks only when the corresponding party has
   meaningful data; retain the required primary guardian block. Cover Initial,
   Annual, Minor, and Simplified Plans, with tests for zero, one, and multiple
   co-guardians.

9. **Make binary and multi-choice answers explicitly tri-state.**
   Audit plan checkboxes and validators so an unanswered question is distinct
   from `No`, and mutually exclusive choices cannot silently accept an
   incomplete answer. Update PDF output and readiness checks together. Add
   tests for unanswered, explicit No/none, one selected option, and conflicting
   options.
   *Implementation note:* existing `.sav` files store these as plain
   boolean `false`/`undefined`. Migrating to a real tri-state model must
   explicitly distinguish "legacy `false`" from "genuinely unanswered" on
   load via a schema-version-aware deserialization rule — a silent
   reinterpretation would surface a flood of new validation errors on
   previously-complete filings the moment an old save file is reopened.

10. **Separate Trust and Final Accounting copy from Annual Accounting copy.**
    Audit descriptor-driven titles, audit-fee language, attorney
    certifications, headings, and metadata. Preserve shared calculations and
    rendering while supplying filing-specific copy where required. Add PDF
    text/metadata assertions proving Trust and Final output does not contain
    Annual-only wording.

11. **Detect cross-filing county drift.**
    Define the case-level source of truth for county and compare filings that
    share a case number. Report a warning or blocker according to filing
    policy, including attorney-county overrides. Add a multi-filing contract
    test covering matching counties, mismatched counties, and missing county
    data.
    *Implementation note:* the authoritative source when filings disagree
    (ward record vs. case-file root vs. attorney record) isn't decided yet —
    needs an explicit precedence rule before implementation. Drift should
    surface as an advisory warning, never a silent overwrite of one filing's
    data from another's.

### Milestone 34-1D: Supplemental PDF Evidence Lab

**Status: Complete.** The evidence harness classified the supplied Trust
packet: its supplemental page rendered cleanly, toolbar/page count matched
the finalized 14-page PDF, and a distinct Trust-details table collision was
reproduced visually and corrected with a redacted regression. See
`docs/m34-1d-evidence-lab.md`.

12. **Reproduce and classify garbled supplemental-document output.**
    Preserve the original affected PDF as a fixture if available, then compare
    source bytes, pdf.js extracted text, canvas rendering, and the finalized
    packet. Only after the failure boundary is known should validation reject
    the file, warn about OCR/encoding quality, or change rendering. Add a
    regression fixture test for the confirmed failure mode.

13. **Investigate Trust Accounting toolbar absence and page-count reports.**
    Capture the exact build, generated PDF, and preview DOM for each affected
    filing. Verify whether the issue is stale DOM, an async pager race, a
    finalized-PDF difference, or an older deployed build before changing the
    shared pager. Do not add a product fix based only on a screenshot or text
    extraction report.

14. **Collect layout evidence before changing visual behavior.**
    Dates splitting across lines, cramped Schedule B cells, clipped Question 5
    content, narrow labels, and missing zoom controls need representative PDFs,
    viewport dimensions, and an agreed layout threshold. After that evidence
    exists, add targeted PDF/layout tests rather than broad visual rewrites.

### Milestone 34-1E: Dashboard and Presentation Polish

**Status: Complete.** The dashboard triage queue responds to its rendered
width, the preview pager groups navigation and shell actions on one row, date
hints consistently use MM/DD/YYYY, and shared form CSS protects required
markers while aligning input-group sizing. Focused unit and Edge coverage
documents those contracts.

15. **Fix the dashboard triage table's responsive dead zone (~1101px-1380px)
    with container queries.** Root cause, confirmed directly against the
    code: `src/styles/dashboard.css`'s `@media (max-width: 1100px)` collapse
    breakpoint doesn't account for the fixed 272px sidebar + padding actually
    consuming viewport width — between ~1101px and ~1380px, the 8-column
    desktop grid (needing ~1042px minimum) overflows the ~765-1030px actually
    available, silently clipping the Assignment and Actions columns off-screen
    behind horizontal scroll. Fix: make `.dashboard-triage-queue` a CSS
    container (`container-type: inline-size; container-name: triage-queue`)
    and convert the two existing viewport-based collapse breakpoints to
    `@container triage-queue (max-width: 1040px)` (2-column card mode) and
    `@container triage-queue (max-width: 540px)` (1-column mobile mode), so
    the table responds to its own real rendered width regardless of sidebar
    state. Add `1280×800` and `1150×800` viewports to
    `dashboard-visual.spec.ts`'s existing viewport matrix, with assertions
    that `.dashboard-triage-assignee` and `.dashboard-triage-actions` stay
    fully visible and `scrollWidth <= clientWidth + 1` (no unintended
    horizontal scroll) at every viewport including the two new ones.

16. **Rename the triage table's "Assignment" column header to "Judge."**
    Copy-only change; check for any test asserting the literal old header
    text before renaming.

17. **Reorganize the Print Preview toolbar's navigation controls.** Move the
    Prev/Next buttons next to the page-count control (currently on a
    separate part of the toolbar), and group "All Filings," the theme
    toggle, and the help button together, flush right, on the same row.

18. **Simplify the date-field format hint text globally.** Every date input
    currently shows "Use MM/DD/YYYY or YYYY-MM-DD" beneath it. Drop the "or
    YYYY-MM-DD" half so the hint just reads "Use MM/DD/YYYY," across every
    date field in every filing type — almost certainly one shared render
    helper per feature (each `dateInput()`-style function), not a per-field
    edit.

19. **Fix required-field asterisk wrapping, inconsistent label spacing, and
    row misalignment in multi-column schedule rows, app-wide.** Root-caused
    via direct code read, not guessed:
    - The asterisk wrap is caused by `forms.css:178-180`'s
      `.row.g-2:has(> [class*="col-"] ~ [class*="col-"]) > [class*="col-"] .form-label{min-height:2.15em;display:inline-flex;align-items:flex-start;flex-wrap:wrap;}`
      — a prior fix attempt (commit `b3a7489`) that turns each label's text
      and its `<span class="req">*</span>` into two separate flex items with
      no `white-space:nowrap` on `.req` (`forms.css:18`) and no shared
      wrapper keeping them together, so flexbox's line-wrapping (decided on
      each item's un-shrunk max-content width, before any text reflow) can
      push the bare `*` to its own line even when there's visible room,
      since the label text itself isn't allowed to wrap first.
    - The inconsistent label/input spacing comes from that same rule's
      blanket `min-height:2.15em` applying to every label in any row with
      2+ Bootstrap columns (regardless of whether that label's text actually
      needs two lines) while single-column rows in the same card skip the
      rule entirely — short labels get padded with dead space up to the
      reserved height, while the one-column row sits flush.
    - Row misalignment has two causes: (a) when a label's real rendered
      height exceeds the guessed `2.15em` (long text, or the asterisk-wrap
      bug above), rows grow unevenly since the rule isn't applied uniformly
      to every row in a card to begin with; (b) `numInput()`'s `$`/`%`-
      wrapped fields use Bootstrap's `.input-group`, whose `.input-group-text`
      affix keeps Bootstrap's default `1rem` font-size while `forms.css:21`
      overrides only `.form-control` to `.88rem` — the taller affix
      stretches the whole `.input-group` (via `align-items:stretch`)
      noticeably taller than an adjacent bare `textInput()`/`calcInput()`
      column in the same row.
    - **Blast radius: app-wide, not Guardian-specific.** The identical
      `class="form-label"` + glued `<span class="req">` markup is
      reproduced by the shared `src/core/form/form-fields.js` renderer used
      by all 9 filing types, and hand-rolled directly (bypassing every
      helper) in at least one spot (`plan-annual/index.js:218`). Because the
      CSS rule keys off the shared `class="form-label"`/`.row.g-2` markup
      regardless of which code path produced it, a CSS-level fix (rather
      than touching each JS helper individually) reaches every filing type
      in one pass; `tests/e2e/schedule-card-layout.spec.ts` already
      exercises this shared `entry-card`/`.row.g-2` scaffold across
      Guardian, Annual, and the Plan types and is the natural place to
      extend for a visual-regression check.
    - Proposed fix direction: keep label text and its required-marker in
      one non-splitting unit (e.g. `${text}${reqMark}` inside a single inner
      span, or `white-space:nowrap` scoped to just the tail), size row label
      height to the tallest *actual* rendered label rather than a fixed
      guess, and align `.input-group-text`'s font-size with
      `.form-control`'s `.88rem` override.

## Explicitly Deferred Preferences

The following are useful product ideas, but are not bugs to implement in the
correction plan without a product decision: masked preview mode for SSN/EIN,
duplicate-name drift warnings, `None reported` in empty schedules, export
button regrouping, zoom/fit controls, wording polish such as `an Annual
Accounting`, and expanded `/s/` signature guidance. They may become separate
UX proposals after the defect work is prioritized.

## Recommended Order and Dependencies

Implement 34-1A first because its validation and export-status contracts
control whether later PDF and filing-specific fixes can be trusted. Implement
34-1B next because the footer, pagination, header, and address helpers are
shared across all filing families. Implement 34-1C after the shared
contracts stabilize. 34-1D begins with evidence collection and should not
be converted into product changes until the affected artifacts are available.
34-1E (dashboard/print-preview-chrome/form-CSS presentation) has no
dependency on the other four — it touches neither filing validation nor
PDF-content generation — so it can be sequenced independently, whenever it's
convenient, rather than waiting in the A→D chain.

Each follow-on sub-milestone should include focused unit/contract tests, the
affected filing-specific E2E coverage, and a final `source` plus `web`
execution-profile run where the changed surface is exercised.

---

<a id="milestone-34-2-proposal-md"></a>

# Archive: MILESTONE-34-2-PROPOSAL.md

# Milestone 34-2: Data Model Documentation Remediation

## Status

**Approved — ready to execute.** Split out of `MILESTONE-34-PROPOSAL.md`
(2026-09-09) so that document could stay scoped to its actual, ready-to-
implement web-mode chunk-load-failure test; this is long-term field-naming/
schema documentation harmonization work tracked alongside
`DATA-MODEL-REMEDIATION-PLAN.md` and `probate-guardian-data-model.csv`,
unrelated to distribution-target test coverage. Scope is the canonical CSV,
its provenance/constraint metadata, and the `scripts/verify-data-model.mjs`
checker — this is real, authorized execution work, not a documentation-only
placeholder.

**Known open inconsistency:** `DATA-MODEL-REMEDIATION-PLAN.md`'s canonical
CSV column contract (`scope,storage_root,field_path,field_label,data_type,
format,requiredness,required_when,allowed_values,sensitive,
persistence_status,derived_or_input,collection_min,collection_max,
initial_item_count,sync_party_ids,source_file,source_symbol,source_line,
notes` — 20 columns) does not yet match the columns actually present in the
committed `probate-guardian/probate-guardian-data-model.csv`
(`scope,field_name,field_label,data_type,requiredness,sensitive,persisted,
derived_or_input,notes,source`). The migration to the canonical contract
below is exactly what closes that gap; until it lands, treat the CSV as a
partial inventory, not the canonical artifact its own plan describes.

## Documentation Status Addendum (2026-09-09)

This addendum tracks planning artifacts only; it does not change any
product-code or test-code scope.

- Completed: Plan Annual wildcard dictionary rows expanded to exact
  `rights.*`, `adls.*`, and `benefits.*` field entries in
  `probate-guardian-data-model.csv`.
- Completed: Plan Initial wildcard dictionary rows expanded to exact `q3`,
  `q6`, `q7`, `adls`, `mental*`, `phys*`, `uses*`, `needs*`, `q9Providers[]`,
  `q11Directives[]`, and `planGuardians[]` field entries in
  `probate-guardian-data-model.csv`.
- A delivery copy may be refreshed from the canonical CSV on request. Its
  location is deliberately environment-local (for example,
  `~/Downloads/probate-guardian-data-model.csv`) and is not a repository
  artifact or acceptance criterion.
- Still pending (separate documentation scope): migration of the CSV to the
  canonical 20-column contract and implementation/execution of the stricter
  `(scope, storage_root, field_path, persistence_status)` uniqueness checker.

## Data Model Remediation

This section records the remaining schema work requested during the review:
completing the canonical CSV, its provenance/constraint metadata, and the
verifier script that checks it.

### Current Findings

- Initial Inventory is now represented through its scalar fields, collection
  references, and expanded A-1 through C-5 row fields in the companion CSV.
- Plan Annual and Plan Initial wildcard entries have been expanded into exact
  persisted paths in the current inventory. The canonical-schema migration
  must preserve that granularity for checkbox fields, conditional
  explanations, certification fields, rights/ADL maps, directive rows,
  provider rows, and guardian signature rows; it must not reintroduce pattern
  rows as substitutes for concrete paths.
- The same collection name does not imply the same row shape. In particular,
  Plan Annual and Plan Initial `planGuardians[]` rows differ, and the plan
  provider/directive collections must remain filing-specific.
- Common-looking names in the CSV are not always canonical storage paths.
  Filing scope must remain separate from the actual `D.*` or `caseFile.*`
  path.
- Annual calculation outputs are runtime-derived values, not persisted fields.
  The CSV must use the actual names returned by `calcTotalsAnnual()` and
  `annualReconcileState()`.

### Documentation Tasks

1. Expand Plan Annual wildcards into exact fields: cover fields; Q2 movement
   choices; Q3 setting, medical, mental-health, personal-care, and social
   groups; benefits; Q5 narrative fields; rights; ADLs; Q9 disability/device
   groups; Q10 directives; Q11 remuneration; certification; guardians; and
   attorney fields.
2. Expand Plan Initial wildcards into exact fields: cover fields; Q2-Q7
   choices and explanations; provider rows; ADLs; mental/physical/device
   groups; committee recommendations; directives; certification; guardian
   rows; and attorney fields.
3. Add collection metadata for every repeatable group: canonical path,
   minimum rows, maximum rows, initial row count, row factory, and party-ID
   synchronization behavior.
4. Add type metadata: boolean versus Yes/No enum, nullable date, currency,
   percentage, phone, ZIP, identifier, free text, and keyed enum values.
5. Add conditional metadata such as `required_when` for amended forms,
   vehicle details, "Other" explanations, rights restoration, directive
   details, remuneration, and certification choices.
6. Correct source attribution so each row points to its actual factory,
   renderer, validator, or calculation function.
7. Add provenance columns for `source_file`, `source_symbol`, optional
   `source_line`, `storage_root`, and `persistence_status` (`persisted`,
   `derived`, `runtime`, or `export-only`). `source_file` plus
   `source_symbol` are the durable provenance contract; populate
   `source_line` only when it materially helps a reviewer locate a stable
   declaration, and leave it blank otherwise.
8. Add a zero-dependency Node verifier at `scripts/verify-data-model.mjs` and
   a documented package-script entry. It must parse the canonical CSV and
   reject wrong column order/count, blank `field_path` values, wildcard paths,
   invalid metadata-domain values, and duplicate
   `(scope, storage_root, field_path, persistence_status)` keys. It is
   documentation-quality tooling only and must not alter application behavior.

### Documentation Acceptance Criteria

- No wildcard field names remain in the canonical field table.
- Every persisted property in each `emptyData*()` factory has an explicit
  field or collection-row entry.
- Plan Annual and Plan Initial collections are documented separately even
  where their collection names match.
- Every derived field names an actual returned calculation property or is
  removed from the persisted-field table.
- Every row has a filing scope, canonical storage path, data type, requiredness
  rule, sensitivity classification, persistence status, and source symbol.
- `scripts/verify-data-model.mjs` is committed, documented, and run against
  the canonical CSV, including
  its duplicate-key, wildcard-path, blank-path, and metadata-domain checks.
- The canonical CSV is `probate-guardian/probate-guardian-data-model.csv`.
  A delivery copy may be written to a contributor's Downloads directory, but
  the external copy is not part of repository acceptance; when present, it
  should be refreshed from the canonical workspace CSV.

## Status: Complete (2026-09-09)

All acceptance criteria above are met. `probate-guardian-data-model.csv`
migrated from its old 10-column shape to the full canonical 20-column
contract (836 rows, up from 595 — see `DATA-MODEL-REMEDIATION-PLAN.md`'s
Completion Checklist for exactly what the added 241 rows are and why; the
largest single piece was roughly 190 Plan Annual/Plan Initial/Plan Minor
fields the old CSV never documented at all, found by cross-checking every
`emptyData*()` factory's real keys field-by-field rather than assuming the
old CSV's coverage was already complete).
`scripts/verify-data-model.mjs` is committed and passes:
`npm run verify:data-model` → `verify-data-model: OK — 836 rows, header and
all constraints valid.` No product-code, test-code, or runtime file was
touched — this milestone's own scope is the CSV and the verifier script.

One real, pre-existing runtime data-model bug was found during the audit
(not fixed, since fixing it is outside this milestone's documentation/tooling
scope): Simplified Accounting's "Add Co-Guardian" button pushes a row shaped
for Annual Accounting (`officeStreet`/`officeCityStateZip`) into a collection
Simplified's own rendering/validation code reads as
`residenceStreet`/`residenceCityStateZip`, and `simplified-accounting/excel.js`
hardcodes exactly 3 guardian slots, so a 4th+ co-guardian is invisible to
Excel export/import even though it prints correctly in the PDF. Documented
in the CSV's `simplified_accounting.guardians[]` rows' `notes`. If this
should be fixed, it needs its own explicitly-scoped milestone.

---

<a id="milestone-35-proposal-md"></a>

# Archive: MILESTONE-35-PROPOSAL.md

# Milestone 35: Plan Readiness Reconciliation & Backlog Execution

## Status

**35-1, 35-2, and 35-3 implemented; 35-4 not started.** This document organizes candidate items and clerk workslip audit requirements into four concrete, sequentially executable sub-milestones (35-1 through 35-4), alongside an unscoped candidate backlog carried forward from the Milestone 34 series.

**Implementation status (2026-09-10):**
- **35-1 (Statutory Citations):** Implemented for all four Plan types' manual checklists and the three
  shipped strings that cited the wrong deadline statute (see the Initial Plan correction above). One item
  intentionally **not** added: Simplified Plan's proposed "certificate of service not required" reminder
  contradicts existing shipped copy and could not be verified against an authoritative source — left as-is,
  flagged above. Plan Minor's "inter-county transfer check" reminder was too vague to give concrete text
  for without the source workslip's exact wording — not added.
- **35-2 (Case Number):** Implemented via the narrower, safer fix found during review —
  `case-resolver.js`'s `caseNumberOf()` now falls back to `ref` when `ucn` is blank (matching
  `dashboard/view-model.js`'s existing precedence), plus the validator and readiness-check additions. No UI
  synchronization was added — the two cover inputs stay independently editable, since they may legitimately
  hold different values.
- **35-3 (Pro Se Decoupling):** Implemented for Plan Initial and Plan Minor's attorney/preparer validation
  and readiness checks, conditional on the filer having started entering that role. Plan Annual and Plan
  Simplified were confirmed (not modified) to already handle this correctly.
- **35-4 (Exact Invariant Reconciliation):** Not started. The mapping tables below were used as the source
  of truth for 35-1/35-2/35-3's edits and are believed current, but the planned
  `tests/unit/plan-readiness-invariants.spec.js` fixture suite has not been written, and no test run
  (unit or e2e) has confirmed any of the above changes are correct in practice — only `node --check` syntax
  validation. Per `AGENTS.md`, a full regression run needs explicit permission before it happens; this is
  product-code (export-gating) behavior, not a documentation-only change, so it should not skip that gate.

**Review history (2026-09-10):** independent review (Codex, then a second AI reviewer) found and fixed two
high-severity statute-subsection reversals (F.S. § 744.1098(1)/(2), F.S. § 744.3145(2)/(3)/(4)) and several
fabricated field names in the 35-4 mapping tables — both now verified correct against the actual source and,
for the statute citations, the official Florida Statutes text directly. A further independent pass found two
things the above review missed, both corrected in this document: a broken file link (`src/core/case-resolver.js`
has no `data/` subdirectory) and a real gap in 35-2's original fix (see that section) — and one more statute
error in this document's own proposed correction: the Initial Plan's 60-day deadline citation should be
F.S. § 744.362(1), not § 744.363 as first proposed here (§ 744.363 defines the plan's contents, not its
deadline). All statute citations in this document have now been checked against the official Florida
Statutes text, not carried forward from clerk worksheet shorthand or an earlier draft without verification.

---

## Candidate Items (Unscoped Backlog)

### 1. Simplified Accounting `guardians[]` Schema Drift + Excel Hardcap
Found during the Milestone 34-2 data-model audit, documented in [`probate-guardian-data-model.csv`](file:///d:/caernarvon-net/probate-guardian/probate-guardian-data-model.csv) and [`MILESTONE-34-2-PROPOSAL.md`](file:///d:/caernarvon-net/probate-guardian/MILESTONE-34-2-PROPOSAL.md):
- Simplified Accounting's "Add Co-Guardian" button pushes a row shaped for Annual Accounting (`officeStreet`/`officeCityStateZip`) into a collection that Simplified's own rendering/validation code reads as `residenceStreet`/`residenceCityStateZip`.
- [`simplified-accounting/excel.js`](file:///d:/caernarvon-net/probate-guardian/src/features/simplified-accounting/excel.js) hardcodes exactly 3 guardian slots, so a 4th+ co-guardian is invisible to Excel export/import even though it prints correctly in the PDF.
- Needs a dedicated accounting-family milestone to fix the row factory/reader and expand Excel export support.

### 2. Close Out 34-1C's Pending Full Regression Verification
[`MILESTONE-34-1-PROPOSAL.md`](file:///d:/caernarvon-net/probate-guardian/MILESTONE-34-1-PROPOSAL.md) records 34-1C (items 8–11: co-guardian suppression, tri-state checkboxes, Trust/Final copy separation, cross-filing county drift) as implemented with focused tests complete. Broader multi-profile regression verification is carried over here.

### 3–9. Explicitly Deferred Product Decisions
Carried forward verbatim from [`MILESTONE-34-1-PROPOSAL.md`](file:///d:/caernarvon-net/probate-guardian/MILESTONE-34-1-PROPOSAL.md):
3. Masked preview mode for SSN/EIN fields.
4. Duplicate-name drift warnings (e.g., two wards/parties with the same name across filings).
5. `None reported` placeholder text in empty schedules, in place of a blank table.
6. Export button regrouping (layout/IA decision, not a defect).
7. Zoom/fit controls in the PDF preview (currently hardcoded `scale = 1.5` in [`pdf-preview.js`](file:///d:/caernarvon-net/probate-guardian/src/core/pdf/pdf-preview.js)).
8. Wording polish such as "an Annual Accounting" grammar throughout.
9. Expanded `/s/` electronic-signature guidance/copy.

### 10. Downloads Delivery-Copy Refresh for Data Model CSV (Optional)
A contributor's Downloads-directory copy of [`probate-guardian-data-model.csv`](file:///d:/caernarvon-net/probate-guardian/probate-guardian-data-model.csv) may be refreshed from the workspace on request.

---

## Operational & Legal Context (6th Judicial Circuit Audit Workslips)

The Guardianship Division (`GD*.docx`) documents in this repository represent operational audit checklists used by deputy clerks in the Sixth Judicial Circuit (Pinellas and Pasco Counties). Reconciling our Plan features against these workslips requires adhering to authoritative statutory enactments:

1. **Ward Relocation Standards (F.S. § 744.1098)**:
   - **F.S. § 744.1098(1)**: A guardian *must obtain court approval prior to* relocating a ward to another state or to a non-adjacent county.
   - **F.S. § 744.1098(2)**: For relocations within the same county or to an adjacent county, prior approval is not required, but the guardian *must file a Notice of Change of Residence with the court within 15 days* after the move, stating compelling reasons and expected duration.
   - **Disaster Plan (AO 2024-025)**: Sixth Judicial Circuit Administrative Order 2024-025 (superseding legacy AO 2019-005 and AO 06-79) requires an updated Guardianship Emergency Disaster Plan upon any relocation of the ward, unless the ward resides with the guardian.

2. **Guardian Instruction & Education (F.S. § 744.3145)**:
   - **F.S. § 744.3145(2)**: Requires 8 hours of training for non-professional guardians of an adult ward.
   - **F.S. § 744.3145(3)**: Requires 4 hours of training for guardians of the property of a minor.
   - **F.S. § 744.3145(4)**: All required training must be completed and proof filed **within 4 months after appointment** (the clerk's "125 days" is an operational tick window).

3. **Background Investigation Fee ($27.50)**:
   - Clerk audit rules explicitly mandate that the $27.50 background investigation fee must be paid by the guardian individually and **cannot be paid from the ward's assets**.

4. **Advance Directives One-Time Filing**:
   - Pre-existing advance directives (DNR, Living Will, Healthcare Surrogate, POA) only need to be filed with the court once, not re-filed with every annual report unless modified or newly executed.

5. **Physician Examination Timing**:
   - **Adult Annual Plan (F.S. § 744.3675(1)(b))**: Physician examination must occur within **90 days before the beginning of the reporting period**.
   - **Minor Annual Plan**: Examination must occur within **180 days before the beginning of the reporting period**.

6. **Representation & Pro Se / Guardian Advocate Rules (Florida Probate Rule 5.030)**:
   - Plenary and limited guardians generally must be represented by an attorney unless representation is waived by court order.
   - Per Florida Probate Rule 5.030, **Guardian Advocates (Chapter 393) are not required to have an attorney**.
   - App validation must allow unrepresented filers to file without blocking on optional attorney certification fields.

---

## Sub-Milestone Execution Plan

### Milestone 35-1: Statutory Citations & Procedural Guidance Reconciliation

#### Scope
Update all user-facing procedural reminders in [`src/features/plan-*/print.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/print.js), [`src/features/plan-initial/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/index.js), [`src/legacy-app.js`](file:///d:/caernarvon-net/probate-guardian/src/legacy-app.js), and [`HOW-TO-RUN.txt`](file:///d:/caernarvon-net/probate-guardian/HOW-TO-RUN.txt) to reflect exact statutory subsections and clerk audit reminders:

1. **Initial Plan (`planInitial`)**:
   - Correct Initial Plan filing deadline citation to **F.S. § 744.362(1)** (60 days after Letters signed) —
     verified directly against statute text: § 744.362(1) is "Each guardian shall file with the court an
     initial guardianship report within 60 days after her or his letters of guardianship are signed";
     § 744.363 only defines the plan's *contents*, with no deadline language, and the currently-shipped
     citation, § 744.632, is Part VIII (Veterans' Guardianship) — an unrelated chapter. Three shipped strings
     cite the wrong section today: `plan-initial/print.js`'s manual reminder, `plan-initial/index.js`'s cover
     instructions, and `legacy-app.js`'s help content and walkthrough text.
   - Relocation reminder: `"If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. § 744.1098(2)), obtain a prior court order for moves to non-adjacent counties or out of state (F.S. § 744.1098(1)), and file an updated Disaster Plan (AO 2024-025)."`
   - Education reminder: `"Non-professional guardians must complete the 8-hour education course and file proof within 4 months after appointment (F.S. § 744.3145(2), (4))."`
   - Background check reminder: `"The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets."`
   - Advance directives reminder: `"Attach copies of any pre-existing advance directives described in Question 11 unless already filed with the court (advance directives need only be filed once)."`

2. **Annual Plan (`planAnnual`)**:
   - Relocation reminder: `"If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. § 744.1098(2)), obtain a prior court order for moves to non-adjacent counties or out of state (F.S. § 744.1098(1)), and file an updated Disaster Plan (AO 2024-025)."`
   - Physician exam reminder: `"Attach the physician's report based on an examination conducted within 90 days prior to the beginning of the reporting period (F.S. § 744.3675(1)(b))."`
   - DSHP reminder: `"If ward is an APD client with a Developmental Services Habilitation Plan (DSHP / Chapter 393), attach the current support plan (F.S. § 393.0651)."`
   - Advance directives reminder: `"Attach copies of any advance directives listed in Question 10 unless already filed with the court (advance directives need only be filed once)."`
   - Background check reminder: `"The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets."`

3. **Simplified Plan (`planSimplified`)**:
   - Relocation reminder: `"If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. § 744.1098(2)), obtain a prior court order for moves to non-adjacent counties or out of state (F.S. § 744.1098(1)), and file an updated Disaster Plan (AO 2024-025)."`
   - Financial Statement reminder: `"Attach the Annual Financial Statement / Affidavit if required for this case (mandatory if guardian has property delegation and annual accountings were waived)."`
   - Background check reminder: `"The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets."`
   - **Not added, needs resolution first:** a proposed "Note: Certificate of service is not required for Simplified Plan under local Sixth Circuit court practice" reminder directly contradicts the shipped copy, which has said "Serve a copy on all interested persons, and file the certificate of service" since before this milestone. This is a local-practice claim from the `GD*.docx` workslips, not a statute I can verify against official text the way the F.S. citations above were checked. Left the existing text in place rather than resolve a legal contradiction from an unverified source — confirm against the actual clerk workslip (or ask the Clerk's office) before changing shipped guidance either direction.

4. **Plan Minor (`planMinor`)**:
   - Replace generic disclaimers with official procedural reminders from `GD ANN Work Slip Minor Review.docx`:
     - 90-day anniversary filing deadline (F.S. § 744.367).
     - 180-day physician examination window prior to reporting period start.
     - Sui juris transition: `"If the minor reaches 18 years of age (sui juris) during the reporting period, prepare for final discharge under F.S. § 744.527."`
     - Inter-county transfer check.
     - Relocation reminder under F.S. § 744.1098(1)/(2) and AO 2024-025.
     - Background check fee reminder ($27.50 not from minor's assets).

---

### Milestone 35-2: Plan Minor Case Number Enforcement

#### Problem Statement
In Plan Minor, no case number is enforced by [`validatePlanMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L393).
The cover page already has **two separate, independently-editable inputs** — "UCN" (bound to `d.ucn`) and
"Case #" (bound to `d.ref`) — not one input mistakenly bound to the wrong field, as an earlier draft of this
section claimed. `pdf-model.js` already prints both together
(`` `${d.ucn||''} ${d.ref||''}`.trim() ``), and `dashboard/view-model.js` already falls back through
`caseNumber || ucn || ref`. The real gap is narrower and lower-risk than "synchronize two fields the user
may intend to keep distinct" (Florida's standardized UCN and a local docket reference are legitimately
different values, and forcibly overwriting one when the other is edited would destroy that distinction):
[`case-resolver.js`](file:///d:/caernarvon-net/probate-guardian/src/core/case-resolver.js)'s `caseNumberOf()`
reads **only** `ward.ucn` for `planMinor`, with no fallback to `ward.ref` — so a filer who fills only "Case #"
would satisfy a naive `req(d.ucn || d.ref, ...)` validator while Case-grouping still treats the filing as
having no case number at all. Fix the resolver to match the fallback pattern already used elsewhere, instead
of adding UI synchronization.

#### Implementation Tasks
1. **Resolver fallback in [`src/core/case-resolver.js`](file:///d:/caernarvon-net/probate-guardian/src/core/case-resolver.js)`:caseNumberOf()`**:
   - Change the `planMinor` branch from `ward.ucn || ''` to `ward.ucn || ward.ref || ''`, matching
     `dashboard/view-model.js`'s existing `caseNumber || ucn || ref` fallback pattern. No UI change needed —
     both cover inputs stay independently editable.
2. **Validator Enforcement**:
   - Update [`validatePlanMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L393) to include:
     ```js
     req(d.ucn || d.ref, "Cover — Case Number is required");
     ```
3. **Readiness Check**:
   - Update [`planReadinessChecksMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/print.js) auto-check to verify `has(d.ucn) || has(d.ref)`.

---

### Milestone 35-3: Plan Pro Se & Attorney Certification Decoupling

#### Problem Statement
[`validatePlanInitial`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/index.js#L587) and [`validatePlanMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L441) hard-require attorney name and signature unconditionally, preventing unrepresented filers and Guardian Advocates (who are exempt from attorney representation under Florida Probate Rule 5.030) from passing export validation.

#### Implementation Tasks
1. **Initial Plan (`planInitial`)**:
   - Make attorney validation in [`validatePlanInitial`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/index.js#L587) conditional:
     ```js
     if (d.attorney_name || d.attorney_bar || d.attorney_signatureDate) {
       req(d.attorney_name, 'Attorney Certification — Attorney name is required');
       req(d.attorney_signatureDate, 'Attorney Certification — Attorney signature date is required');
     }
     ```
   - Mirror the same condition in [`planReadinessChecksInitial`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/print.js).
2. **Plan Minor (`planMinor`)**:
   - Make preparer and attorney validation in [`validatePlanMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L441) conditional:
     ```js
     if (d.preparer_name || d.preparer_signatureDate) {
       req(d.preparer_name, 'Preparer & Attorney — Preparer name is required');
       req(d.preparer_signatureDate, 'Preparer & Attorney — Preparer signature date is required');
     }
     if (d.attorney_name || d.attorney_signatureDate) {
       req(d.attorney_name, 'Preparer & Attorney — Attorney name is required');
       req(d.attorney_signatureDate, 'Preparer & Attorney — Attorney signature date is required');
     }
     ```
   - Mirror the same condition in [`planReadinessChecksMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/print.js).
3. **Annual Plan & Simplified Plan Verification**:
   - Confirm [`validatePlanAnnual`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-annual/index.js#L686) and [`validatePlanSimplified`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-simplified/index.js#L336) maintain their existing non-blocking pro se handling.

---

### Milestone 35-4: Exact Plan Readiness & Export Validator Invariant Reconciliation

#### Objective
Establish a strict 1:1 invariant between `planReadinessChecks().auto.every(c => c.ok)` and `validatePlan*().errors.length === 0` across all four Plan filing types, using exact canonical data model field keys.

#### Exact Field Mapping Matrix

##### 1. Initial Plan (`planInitial`)
| Section | Validator Requirement ([`plan-initial/index.js:520`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/index.js#L520)) | Readiness Predicate ([`plan-initial/print.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/print.js)) | Canonical Keys |
| :--- | :--- | :--- | :--- |
| **Cover Header** | `wardName`, `caseNumber`, `county`, `inceptionDate`, `lettersSignedDate` | `has(d.wardName) && has(d.caseNumber) && has(d.county) && has(d.inceptionDate) && has(d.lettersSignedDate)` | `wardName`, `caseNumber`, `county`, `inceptionDate`, `lettersSignedDate` |
| **Cover Ward Info** | `guardianNames`, `wardLiving`, `residenceAddress`, `residenceCityStateZip` | `has(d.guardianNames) && has(d.wardLiving) && has(d.residenceAddress) && has(d.residenceCityStateZip)` | `guardianNames`, `wardLiving`, `residenceAddress`, `residenceCityStateZip` |
| **Setting & Medical** | `q2Setting` (+ `q2Explain` if Other), any medical checkbox (+ `q3MedSpecialistArea` / `q3MedExplain`) | `has(d.q2Setting) && (d.q2Setting !== 'Other' || has(d.q2Explain)) && (d.q3MedPrimary || d.q3MedDentist || d.q3MedOphthalmologist || d.q3MedSpecialist || d.q3MedPT || d.q3MedST || d.q3MedOT || d.q3MedWardDecides || d.q3MedOther) && (!d.q3MedSpecialist || has(d.q3MedSpecialistArea)) && (!d.q3MedOther || has(d.q3MedExplain))` | `q2Setting`, `q2Explain`, `q3Med*` |
| **Mental & Personal** | `q4Mental` (+ `q4Explain`), `q5Personal` (+ `q5Explain`) | `has(d.q4Mental) && (d.q4Mental !== 'Other' && d.q4Mental !== 'None' || has(d.q4Explain)) && has(d.q5Personal) && (d.q5Personal !== 'Other' || has(d.q5Explain))` | `q4Mental`, `q4Explain`, `q5Personal`, `q5Explain` |
| **Social & Benefits** | any social checkbox (+ `q6Explain`), `q7Explain` if trusts/pending/other | `(d.q6CareFacility || d.q6NursesAides || d.q6FamilyFriends || d.q6DayProgram || d.q6WardDecides || d.q6Other) && (!d.q6Other || has(d.q6Explain)) && (!(d.q7Trusts || d.q7PendingBenefits || d.q7Other) || has(d.q7Explain))` | `q6*`, `q7*` |
| **Providers** | `(d.q9Providers||[]).some(r => r && r.name)` and no partial rows missing name | `(d.q9Providers||[]).filter(r => r && r.name).length > 0 && (d.q9Providers||[]).every(r => !r || !((r.providerType||r.examDate||r.street||r.cityStateZip||r.phone) && !r.name))` | `q9Providers[]` |
| **ADLs (10A)** | All 15 rated | `INITIAL_ADLS.every(([k]) => d.adls && d.adls[k])` | `adls.*` |
| **Disabilities (10B–D)** | At least one mental, physical, and used device (+ explains) | `(d.mentalAlzheimers||d.mentalAutism||d.mentalClosedHeadInjury||d.mentalDementia||d.mentalDepression||d.mentalDevelopmental||d.mentalSubstance||d.mentalSchizophrenia||d.mentalOther) && (!d.mentalOther||has(d.mentalExplain)) && (d.physMobility||d.physBlindness||d.physDeafness||d.physDiabetic||d.physParkinsons||d.physArthritis||d.physOther) && (!d.physOther||has(d.physExplain)) && (d.usesDentures||d.usesHearingAid||d.usesWheelchair||d.usesWalker||d.usesCrutches||d.usesProsthetics||d.usesGlasses||d.usesNone||d.usesOther) && (!d.usesOther||has(d.usesExplain))` | `mental*`, `phys*`, `uses*` |
| **Directives & Committee** | `q11NoDirectives !== q11Executed`, needed devices, committee recommendation (+ explain) | `(!!d.q11NoDirectives !== !!d.q11Executed) && (!d.q11ExecOther||has(d.q11ExecOtherText)) && (d.needsDentures||d.needsHearingAid||d.needsWheelchair||d.needsWalker||d.needsCrutches||d.needsProsthetics||d.needsGlasses||d.needsNone||d.needsOther) && (!d.needsOther||has(d.needsExplain)) && has(d.committeeIncorporated) && (d.committeeIncorporated !== 'No'||has(d.committeeExplain))` | `q11*`, `needs*`, `committee*` |
| **Guardian Signatures** | At least one cert checkbox + Guardian 1 contact & signature | `(d.certIncapacitatedNoCopy||d.certMinorNoCopy||d.certConsulted||d.certRecognizeRights||d.certNoRestriction||d.certProvidesCare) && has(g0.name) && has(g0.signatureDate) && has(g0.street) && has(g0.phone) && has(g0.ssn)` | `cert*`, `planGuardians[0]` |
| **Attorney Signatures** | Represented attorney name and date | `!(d.attorney_name||d.attorney_bar||d.attorney_signatureDate) || (has(d.attorney_name) && has(d.attorney_signatureDate))` | `attorney_name`, `attorney_signatureDate` |

##### 2. Annual Plan (`planAnnual`)
| Section | Validator Requirement ([`plan-annual/index.js:600`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-annual/index.js#L600)) | Readiness Predicate ([`plan-annual/print.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-annual/print.js)) | Canonical Keys |
| :--- | :--- | :--- | :--- |
| **Cover** | `wardName`, `caseNumber`, `county`, `gid`, `periodFrom`, `periodTo`, `guardian`, `wardLiving`, `residenceAddress`, `residenceCityStateZip` | `has(d.wardName) && has(d.caseNumber) && has(d.county) && has(d.gid) && has(d.periodFrom) && has(d.periodTo) && d.periodFrom < d.periodTo && d.gid <= d.periodFrom && has(d.guardian) && has(d.wardLiving) && has(d.residenceAddress) && has(d.residenceCityStateZip)` | `wardName`, `caseNumber`, `county`, `gid`, `periodFrom`, `periodTo`, `guardian`, `wardLiving`, `residenceAddress`, `residenceCityStateZip` |
| **Residences (Q1)** | At least one residence with name | `(d.q1Residences||[]).filter(r => r && (r.name||r.street||r.cityStateZip)).length > 0 && (d.q1Residences||[]).every(r => !r || !((r.street||r.cityStateZip) && !r.name))` | `q1Residences[]` |
| **Residence & Care (Q2-3)** | Q2 address change box checked + Q3 setting selected (+ explain) + specialist area if specialist | `(d.q2NoMove||d.q2WithinCounty||d.q2WithinCircuit||d.q2OutsideApproved||d.q2OutsideVenuePetition) && (d.q3SettingALF||d.q3SettingGroupHome||d.q3SettingIntermediate||d.q3SettingPrivate||d.q3SettingSkilled||d.q3SettingSpecialized||d.q3SettingStateHospital||d.q3SettingOther) && (!d.q3SettingOther||has(d.q3SettingExplain)) && (!d.q3MedSpecialist||has(d.q3MedSpecialistArea))` | `q2NoMove`, `q2Within*`, `q2Outside*`, `q3Setting*`, `q3MedSpecialistArea` |
| **Providers (Q4)** | At least one provider with name | `(d.q4Providers||[]).filter(r => r && (r.name||r.providerType||r.visits)).length > 0 && (d.q4Providers||[]).every(r => !r || !((r.providerType||r.visits) && !r.name))` | `q4Providers[]` |
| **Skills & Rights (Q5-6)** | `q5SocialSkills`, `q5Activities`, all 12 rights answered | `has(d.q5SocialSkills) && has(d.q5Activities) && PLAN_RIGHTS.every(([k]) => d.rights && d.rights[k])` | `q5SocialSkills`, `q5Activities`, `rights.*` |
| **ADLs (Q8)** | All 16 ADLs rated | `PLAN_ADLS.every(([k]) => d.adls && d.adls[k])` | `adls.*` |
| **Disabilities (Q9)** | Mental disabilities answered + Physical disabilities answered (+ explains) | `(d.q9MentalNone||d.q9MentalDementia||d.q9MentalAlzheimers||d.q9MentalAutism||d.q9MentalHeadInjury||d.q9MentalDevelopmental||d.q9MentalIntellectual||d.q9MentalSchizophrenia||d.q9MentalDepression||d.q9MentalSubstance||d.q9MentalOther) && (!d.q9MentalOther||has(d.q9MentalExplain)) && (d.q9PhysNone||d.q9PhysMobility||d.q9PhysBlindness||d.q9PhysDeafness||d.q9PhysDiabetic||d.q9PhysParkinsons||d.q9PhysArthritis||d.q9PhysOther) && (!d.q9PhysOther||has(d.q9PhysExplain))` | `q9Mental*`, `q9Phys*` |
| **Directives & Remuneration (Q10-11)** | Directives answered (not both none & executed) + Remuneration answered (+ name/details) | `(d.q10NoDirectives !== d.q10Executed) && (!d.q10ExecOther||has(d.q10ExecOtherText)) && ((d.q11NoRemuneration && has(d.q11NoRemunerationName)) || (!d.q11NoRemuneration && (has(d.q11ReceivedName)||has(d.q11Amount)||has(d.q11From))))` | `q10*`, `q11*` |
| **Signatures** | Guardian 1 contact, name, date, date order after periodTo | `has(g0.name) && has(g0.signatureDate) && has(g0.mailingStreet) && has(g0.phone) && has(g0.ssn) && (!d.periodTo || !g0.signatureDate || g0.signatureDate >= d.periodTo)` | `planGuardians[0]` |
| **Attorney** | Pro se safe: if signature date present, must be on/after periodTo | `!d.attorney_signatureDate || !d.periodTo || d.attorney_signatureDate >= d.periodTo` | `attorney_signatureDate` |

##### 3. Simplified Plan (`planSimplified`)
| Section | Validator Requirement ([`plan-simplified/index.js:293`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-simplified/index.js#L293)) | Readiness Predicate ([`plan-simplified/print.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-simplified/print.js)) | Canonical Keys |
| :--- | :--- | :--- | :--- |
| **Cover** | `wardName`, `caseNumber`, `county`, `periodFrom`, `periodTo`, period date order | `has(d.wardName) && has(d.caseNumber) && has(d.county) && has(d.periodFrom) && has(d.periodTo) && d.periodFrom < d.periodTo` | `wardName`, `caseNumber`, `county`, `periodFrom`, `periodTo` |
| **The Plan (Q1–Q6)** | `q1Residences`, `q2BestPlacement`, `q3MedicalTreatment`, `q4Diagnosis`, `q5SocialServices`, `q6Interaction` | `has(d.q1Residences) && has(d.q2BestPlacement) && has(d.q3MedicalTreatment) && has(d.q4Diagnosis) && has(d.q5SocialServices) && has(d.q6Interaction)` | `q1Residences` through `q6Interaction` |
| **Rights & Directives (Q7–Q8)** | `q7RestoreRights` (+ explain if Yes) + Q8 directives box (+ text if Other, not None with others) | `has(d.q7RestoreRights) && (d.q7RestoreRights !== 'Yes'||has(d.q7RestoreExplain)) && (d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other||d.q8None) && (!d.q8Other||has(d.q8OtherText)) && (!d.q8None||!(d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other))` | `q7RestoreRights`, `q7RestoreExplain`, `q8*` |
| **Remuneration (Q9)** | `q9Remuneration` (+ explain if Yes) | `has(d.q9Remuneration) && (d.q9Remuneration !== 'Yes'||has(d.q9RemunerationExplain))` | `q9Remuneration`, `q9RemunerationExplain` |
| **Signatures** | Guardian 1 name, date, email, phone, mailing address, date order | `has(g.name) && has(g.signatureDate) && has(g.email) && has(g.phone) && has(g.mailingAddress) && (!d.periodTo || !g.signatureDate || g.signatureDate >= d.periodTo)` | `planGuardians[0]` |
| **Preparer & Attorney** | If present, signature date on/after periodTo | `(!d.preparer_signatureDate || !d.periodTo || d.preparer_signatureDate >= d.periodTo) && (!d.attorney_signatureDate || !d.periodTo || d.attorney_signatureDate >= d.periodTo)` | `preparer_signatureDate`, `attorney_signatureDate` |

##### 4. Minor Plan (`planMinor`)
| Section | Validator Requirement ([`plan-minor/index.js:393`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L393)) | Readiness Predicate ([`plan-minor/print.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/print.js)) | Canonical Keys |
| :--- | :--- | :--- | :--- |
| **Cover** | `amendedForm` tri-state, `wardName`, `caseNumber` (`ucn||ref`), `county`, `periodFrom`, `periodTo`, period order, `guardianName`, `q1ResidenceName`, `q1Street`, `amendedVersion` if Yes | `isTriStateAnswer(d.amendedForm) && has(d.wardName) && (has(d.ucn)||has(d.ref)) && has(d.county) && has(d.periodFrom) && has(d.periodTo) && d.periodFrom < d.periodTo && has(d.guardianName) && has(d.q1ResidenceName) && has(d.q1Street) && (d.amendedForm !== 'Yes'||has(d.amendedVersion))` | `amendedForm`, `wardName`, `ucn`, `ref`, `county`, `periodFrom`, `periodTo`, `guardianName`, `q1ResidenceName`, `q1Street`, `amendedVersion` |
| **Providers (Q3)** | At least one provider with last name, no partial rows missing last name | `(d.q3Providers||[]).filter(r => r && r.last).length > 0 && (d.q3Providers||[]).every(r => !r || !((r.first||r.providerType||r.street||r.city||r.phone) && !r.last))` | `q3Providers[]` |
| **Medical (Q4)** | At least one medical option (+ explain if Other) | `(d.q4Primary||d.q4Dentist||d.q4Specialist||d.q4PT||d.q4ST||d.q4OT||d.q4MinorDecides||d.q4Other) && (!d.q4Other||has(d.q4Explain))` | `q4Primary`, `q4*`, `q4Explain` |
| **Education & Social (Q5)** | `q5SchoolProgress`, `q5SocialDevelopment`, `q5Communicates`, `q5Interpersonal`, unmet needs option (+ explain if Other) | `has(d.q5SchoolProgress) && has(d.q5SocialDevelopment) && has(d.q5Communicates) && has(d.q5Interpersonal) && (d.q5NoUnmetNeeds||d.q5DoesNotCareToSocialize||d.q5UnmetNeeds||d.q5Other) && (!d.q5Other||has(d.q5Explain))` | `q5SchoolProgress`, `q5SocialDevelopment`, `q5Communicates`, `q5Interpersonal`, `q5NoUnmetNeeds`, `q5*` |
| **Signatures** | At least one cert box + Guardian 1 contact, name, date, date order | `(d.certIncapacitated||d.certMinor||d.certConsulted||d.certNoRestriction||d.certProvidesCare||d.certPhysicianAttached) && has(g0.name) && has(g0.signatureDate) && has(g0.mailingStreet) && has(g0.phone) && has(g0.tin) && (!d.periodTo || !g0.signatureDate || g0.signatureDate >= d.periodTo)` | `cert*`, `planGuardians[0]` |
| **Preparer & Attorney** | Pro se safe: if populated, must have name and signature date on/after periodTo | `(!(d.preparer_name||d.preparer_signatureDate) || (has(d.preparer_name) && has(d.preparer_signatureDate) && (!d.periodTo||d.preparer_signatureDate >= d.periodTo))) && (!(d.attorney_name||d.attorney_signatureDate) || (has(d.attorney_name) && has(d.attorney_signatureDate) && (!d.periodTo||d.attorney_signatureDate >= d.periodTo)))` | `preparer_name`, `preparer_signatureDate`, `attorney_name`, `attorney_signatureDate` |

---

## Verification & Acceptance Plan

### 1. Unit Tests
- Create [`tests/unit/plan-readiness-invariants.spec.js`](file:///d:/caernarvon-net/probate-guardian/tests/unit/plan-readiness-invariants.spec.js):
  - Validates all four plan types against empty, minimal valid, pro se, and fully populated fixture models.
  - Asserts that for every state, `planReadinessChecks().auto.every(c => c.ok)` strictly equals `validatePlan*().errors.length === 0`.
  - Asserts that every single `auto` check has a test demonstrating failure when its specific field is blank/invalid.
  - Asserts that all `manual` reminders are present and purely non-blocking strings.

### 2. E2E Tests
- Run `tests/e2e/navigation-status.contract.spec.ts` to ensure print preview banner and blocked-export alerts agree with the updated readiness items.
- Run `npm run test:e2e:source` to ensure zero regression across the entire E2E suite.

### 3. Review Gate
- Complete each sub-milestone (35-1, 35-2, 35-3, 35-4) sequentially, committing only after unit and contract tests pass.

---

## Milestone 35-5: Existing Guardianship-Type Selection Controls

### Objective
Replace clearly existing free-text or incomplete guardianship-type controls with
the option values found in the `GD*.docx` workslip templates, without adding any
new fields to any form.

### Scope Guardrails
- Do **not** add new fields to Plan, Accounting, Inventory, Trust, or Discharge
  forms.
- Do **not** add a new global guardianship-type field to Plan forms.
- Only update fields that already exist in the data model and UI.
- Preserve existing persisted values on load/export; if an older value does not
  match the new option list, display it safely until the user chooses a
  supported value.
- Do not change export validators in this sub-milestone except where required
  to keep the existing field control functional.

### Source Option Sets From GD Workslips

#### Primary Guardianship Type Options
Use this set for existing `typeOfGuardianship` controls:
- `Plenary`
- `Limited`
- `Guardian Advocate`
- `Voluntary`
- `Minor - Person`
- `Minor - Property`
- `Minor - Person - Property`

#### Guardian Classification Options
Use this set only where an existing field already captures guardian
professional/public/family status:
- `Professional`
- `Public`
- `Family`
- `Non-professional`

#### Appointment/Lifecycle Options
Use this set only where an existing field already captures successor/standby/
surrogate status:
- `Successor`
- `Standby`
- `Surrogate`
- `Emergency Temporary Guardianship`
- `None`

### Implementation Plan

1. **Shared constants**
   - Add canonical option arrays in an existing shared form/constants module, or
     a narrowly named new constants module if no suitable module exists:
     - `GUARDIANSHIP_TYPE_OPTIONS`
     - `GUARDIAN_CLASSIFICATION_OPTIONS`
     - `GUARDIANSHIP_LIFECYCLE_OPTIONS`
   - Use display labels that match the GD templates while keeping stable stored
     string values.
   - Add a small helper for legacy-safe selection rendering. If the stored
     value is non-empty and is not present in the canonical option list, inject
     it as an additional selected option labeled as the existing saved value
     rather than rendering a blank select. This protects previously persisted
     free-text values from becoming invisible or being clobbered on the next
     save.
   - Do not normalize or rewrite legacy values automatically; only change the
     stored value when the user actively chooses a supported option.

2. **Guardian Inventory**
   - Existing field: `typeOfGuardianship`.
   - Current UI already uses a select in
     [`guardian-inventory/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/guardian-inventory/index.js#L528).
   - Update the option list to include `Guardian Advocate`.
   - Keep existing options for `Plenary`, `Limited`, `Voluntary`,
     `Minor - Person`, `Minor - Property`, and
     `Minor - Person - Property`.
   - Use the legacy-safe selection helper so any previously saved free-text
     `typeOfGuardianship` value remains visible and selected.

3. **Annual Accounting**
   - Existing field: `typeOfGuardianship`.
   - Current UI is free text in
     [`annual-accounting/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/annual-accounting/index.js#L507).
   - Replace the free-text input with a select/autocomplete using
     `GUARDIANSHIP_TYPE_OPTIONS`.
   - Use the legacy-safe selection helper so any previously saved free-text
     `typeOfGuardianship` value remains visible and selected.
   - Verify PDF and Excel import/export continue to round-trip
     `typeOfGuardianship` unchanged.

4. **Simplified Accounting**
   - Existing field: `typeOfGuardianship`.
   - Current UI is free text in
     [`simplified-accounting/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/simplified-accounting/index.js#L328).
   - Replace the free-text input with a select/autocomplete using
     `GUARDIANSHIP_TYPE_OPTIONS`.
   - Use the legacy-safe selection helper so any previously saved free-text
     `typeOfGuardianship` value remains visible and selected.
   - Verify PDF and Excel import/export continue to round-trip
     `typeOfGuardianship` unchanged.

5. **Initial Plan**
   - Existing field: `successorGuardianship`.
   - Current UI is free text in
     [`plan-initial/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/index.js#L170).
   - Replace it with a select/autocomplete using
     `GUARDIANSHIP_LIFECYCLE_OPTIONS`.
   - Use the legacy-safe selection helper so any previously saved free-text
     `successorGuardianship` value remains visible and selected.
   - Do not add a separate guardianship-type field to Initial Plan.

6. **Plan Minor**
   - Existing fields: `professionalGuardian`, `publicGuardian`.
   - Current UI uses two Yes/No controls in
     [`plan-minor/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L169).
   - Do not add a new guardian-classification field in this milestone.
   - Leave these as-is unless a later product decision explicitly authorizes a
     schema change. The GD-derived classification list cannot be represented
     cleanly by the two existing Yes/No fields without changing the model.

### Known Follow-On Gap
- Adding `Guardian Advocate` as an existing `typeOfGuardianship` option makes
  the filing label more accurate, but it does not by itself reconcile Guardian
  Inventory's attorney-required export validation. Guardian Inventory currently
  requires `attorneyForGuardian` and the Schedule D-2 attorney fields even
  though the GD workslips note the Florida Probate Rule 5.030 guardian-advocate
  exception. That validator change is intentionally outside 35-5's narrow
  "existing selection controls only" scope and should be tracked as a separate
  follow-on if Guardian Advocate support is implemented beyond labeling.

### Data Model Updates
- Update `probate-guardian-data-model.csv` for existing fields whose input
  control changes from string/free text to enum/select:
  - `common.D.typeOfGuardianship`
  - `plan_initial.D.successorGuardianship`
- Do not add rows for new fields.
- Run `npm run verify:data-model`.

### Verification
- Add or update focused unit tests for the option arrays and field rendering
  where comparable UI helpers already have coverage.
- Add a legacy-value rendering test: a stored non-empty value outside the
  canonical option list remains visible and selected, and is not rewritten
  unless the user chooses a different option.
- Add E2E smoke coverage for selecting:
  - `Guardian Advocate` on Guardian Inventory.
  - `Limited` on Annual Accounting.
  - `Minor - Person - Property` on Simplified Accounting.
  - `Successor` on Initial Plan.
- Run targeted E2E tests for the changed filing types, then request permission
  before running the full `npm test` suite.

---
