# Milestone 70: Complete Guardian Forms' ES-Module Migration

## Status

**DRAFT — planning only.** This proposal authorizes no code change. Milestone
70, or an individual delivery within it, must be explicitly approved before
implementation begins. The deliveries are intentionally sequential because
most of them touch the same dependency graph and several will touch
`src/legacy-app.js`; they are not independent work streams that can safely be
implemented in parallel.

One architecture choice is already settled by the requester:

> **Option 1:** production code uses ES-module imports and explicit services.
> A small, documented, frozen `window.GuardianForms` namespace may remain for
> genuine host integration, diagnostics, and an explicitly enabled browser-test
> adapter. The current broad collection of unnamespaced `window.*` APIs is not
> an acceptable end state.

This proposal uses **Guardian Forms** as the product name. Existing repository,
package, archive-field, and persisted identifiers that contain
`probate-guardian`, `ward`, or similar historical names are compatibility
identifiers and are not renamed by this milestone.

Milestone 70 supersedes the remaining intent of the archived Milestone 27
proposal. That proposal described a codebase that no longer exists: persistence,
routing, modals, feature loaders, and most filing renderers have since been
partly extracted. MS 70 starts from today's hybrid dependency graph instead of
repeating Milestone 27's old file-move list.

---

## Outcome

A filer should observe **no change** in how Guardian Forms starts, opens a
case, edits a filing, reports completion, saves or restores a `.sav` file, or
produces a PDF or workbook. The visible outcome is intentionally boring. The
engineering outcome is not:

- `src/legacy-app.js` is deleted;
- Guardian Forms starts from one ES-module composition root;
- modules communicate through imports and explicit service/context objects,
  not a browser-global service locator;
- one runtime store owns the case and active filing instead of mirroring
  `caseFile` and `D` across lexical and `window` state;
- every filing type has eager, importable definitions for creation,
  normalization, routes, and completion, while its heavy UI/output pack keeps
  at least today's lazy-loading boundary;
- route changes and async feature mounts have an explicit lifecycle and cannot
  commit stale work after the user has moved to another filing;
- unit tests import the code they test rather than cutting function bodies out
  of a classic script; and
- the only application-owned browser global is the approved,
  narrowly enumerated `window.GuardianForms` boundary.

This is a reliability and maintainability milestone first. It should reduce
the cost and risk of future filing work, but it does not promise a particular
startup-time or bundle-size improvement. Those will be measured before and
after; the current feature-level lazy boundary must not regress. Moving output
modules from feature-load time to export-action time may be worthwhile later,
but it is not required to remove the monolith.

### Why the work is valuable

| Value | What it changes in practice |
| --- | --- |
| Safer filing changes | A developer can change one filing service and run it directly in a unit test, without recreating hundreds of ambient globals or accidentally changing another form's state. |
| One source of runtime truth | Switching filings, saving, restoring, and dashboard progress stop depending on synchronized copies of `caseFile`, `D`, and related global flags. This removes an entire class of cross-filing and stale-async failures. |
| Reviewable dependencies | Imports show which calculation, normalizer, persistence service, or UI controller a module actually uses. Hidden load-order contracts become build-time or test-time failures. |
| Better regression evidence | Tests exercise exported production functions and public workflows. A passing test no longer depends on a brace-counting copy of a function body from the monolith. |
| Safer startup and packaging | Vite owns the application module graph. The source, web, and portable builds share one bootstrap contract instead of separately copying a classic file beside the bundle. |
| Lower future migration cost | Guardian Forms remains vanilla JavaScript, but its core will be in a form that can adopt stronger typing, finer lazy loading, or a different UI layer later without first untangling browser globals. Those follow-ups are not part of MS 70. |

---

## Verified planning baseline

The following snapshot was rechecked against the working tree on 2026-09-24.
It is evidence of scale, not a completion baseline to preserve forever; 70A
will regenerate it after any work already in flight has landed.

| Surface | Current evidence |
| --- | --- |
| Legacy core | `src/legacy-app.js` is 457,190 bytes and about 8,300 physical lines, with 345 top-level function declarations and 129 top-level bindings. Classic top-level function declarations become implicit globals even when there is no `window.X =` line. |
| Hybrid boot | `index.html` loads `src/legacy-app.js` as a parser-blocking classic script and then `src/main.js` as a module. `main.js` waits for module evaluation and calls `window.initApp()`. |
| Explicit global bridge | The current audit finds 319 `window.X =` assignment sites across 60 JavaScript files and 358 distinct application-defined names consumed from `window`. It does not yet see every implicit classic global or bare identifier dependency. |
| Highest fan-out globals | `D` is consumed by 41 files; `autoSave` by 14; `renderPage` and `setPath` by 13 each; `ic` and `navigate` by 12 each; and `computeNavChecks` by 8. |
| Feature coupling | Eighteen feature files destructure application services from `window` at module evaluation time. Those captured references create both ordering constraints and difficult test setup. |
| State ownership | `src/core/state.js` describes itself as a thin adapter around legacy globals. It reads and writes `window.caseFile` and `window.D`; the monolith still owns the underlying lexical state and many save/activity flags. |
| Build special case | `vite.config.js` copies `src/legacy-app.js` as a static file, and `scripts/generate-service-worker.mjs` treats it as a critical asset, instead of Vite compiling it as part of the module graph. |
| Test coupling | Many browser specs read or write `window.D`, `window.caseFile`, or `currentPage`. A group of unit specs uses `tests/unit/support/legacy-source-extract.js`, regular expressions, or source slicing to evaluate functions that cannot be imported. |

There are intentional classic scripts that this count must not misclassify:

- `src/prepaint.js` stays synchronous so theme selection happens before first
  paint and does not flash the wrong theme; and
- vendored JSZip and Bootstrap may remain classic vendor scripts behind small
  adapters.

MS 70 removes the **Guardian Forms classic application monolith**. It does not
claim that every `<script>` tag on the page becomes a module.

---

## Scope and definition of the modern code model

For MS 70, "modern" means all of the following:

1. **Vanilla ES modules.** Guardian Forms remains framework-free. Application
   behavior is declared with `import`/`export`, compiled by Vite, and started
   from a module entry point.
2. **One composition root.** `main.js` imports a `startGuardianForms()`-style
   bootstrap function, constructs the long-lived services, and passes them to
   the shell/router. Importing a module does not silently publish dozens of
   globals.
3. **Explicit state and side effects.** A canonical store owns persisted case
   data. Persistence, locks, audit, routing, and UI state are separate services.
   Mutations go through named transactions/commands so dirty marking,
   normalization, activity logging, and rendering happen deliberately and once.
4. **Lightweight filing definitions are eager.** Guardian Forms can create a
   blank filing, normalize an old one, resolve its routes, and compute dashboard
   progress before loading the filing's renderer or output code.
5. **Heavy feature packs remain lazy.** Dashboard and filing UI packs continue
   to load on demand. PDF/Excel code must be no more eager than it is today;
   action-level lazy output loading is an optional follow-up, not a hidden MS 70
   requirement.
6. **An explicit feature lifecycle.** A mounted feature receives its filing,
   route, services, host container, and abort signal. It returns or supports a
   deterministic dispose path. The router owns route changes, commit-before-
   leave, focus, nav/title updates, and stale-mount rejection.
7. **No ambient application API.** Production modules never call another
   Guardian Forms module through `window`. The approved namespace is an
   external boundary only.
8. **Importable tests.** Unit tests import functions and services. Browser tests
   use the real UI or the explicit namespaced test adapter; they do not rely on
   broad mutable globals.

This milestone is **not** a TypeScript rewrite. New core modules should be
written so the existing checked scope can reason about them, but MS 70 will not
expand `tsconfig.json` across the entire repository or retrofit unrelated JSDoc.
If an existing untyped module becomes transitively checked, the repository's
documented `// @ts-nocheck` rule applies rather than turning this migration into
a typing project.

---

## Target architecture

```text
index.html
  └─ src/main.js                         composition root only
       └─ startGuardianForms(services)
            ├─ runtime/case-store        one case + active-filing authority
            ├─ persistence/security      .sav, recovery, key, locks, audit
            ├─ filing registry           eager definitions for all 9 identities
            ├─ router                    route + mount/dispose/abort lifecycle
            ├─ shared form runtime       paths, binding, actions, status UI
            ├─ shell controllers         dashboard, picker, help, activity
            └─ lazy feature loaders      filing UI and court-output packs

external boundary only
  └─ window.GuardianForms
       ├─ documented production diagnostics/host members, if actually needed
       └─ testing (present only under an explicit test enablement)
```

### Composition and dependency rules

- Pure helpers are imported directly.
- Stateful infrastructure is created once and passed as an explicit service or
  feature context.
- A lower-level service cannot import the application bootstrap, router, or a
  feature renderer.
- A feature can depend on shared core services and its own filing modules, but
  one filing feature cannot reach into another filing's renderer.
- A filing definition can name a lazy loader; it cannot import the heavy pack
  eagerly merely to register metadata.
- Vendor globals such as `JSZip` are isolated by loader/adaptor modules. They
  are not mixed into the Guardian Forms application API.
- Newly extracted ESM code may publish a browser global only from the temporary
  compatibility module. Existing implicit globals in the still-loaded classic
  file are grandfathered during migration, counted down, and become forbidden
  at final cutover.

### Canonical case store

The target is a small transaction-oriented store, not Redux and not a deep-
immutable copy of the case on every edit. Filing objects can contain large
attachments and existing code relies on stable object identity. A representative
service contract is:

```js
caseStore.getCaseFile();
caseStore.getActiveFiling();
caseStore.select(selector);
caseStore.replaceCaseFile(nextCaseFile, reason);
caseStore.transaction(reason, mutator);
caseStore.subscribe(listener, { signal });
```

The persisted `caseFile.wards`, `wardId`, `activeWardId`, and archive field
names remain untouched. New source APIs use **filing** terminology. The active
filing is derived from the case and `activeWardId`; there is no independently
authoritative `D` pointer that can drift from it.

The store does not own everything. The in-memory encryption key, writable file
handle, recovery-cache connection, current route, modal state, and display
preferences belong to their respective services. In particular, no store
snapshot or browser facade may expose a `CryptoKey`, password, verifier payload,
or mutable reference to the full case.

The ownership flip happens late, but the interim adapter is not allowed to
become a second state store. During the transition it reads the same object
references that the legacy owner holds; its transaction method delegates to one
legacy bridge writer and then emits the resulting change. It does not maintain
a shadow case, copy changes back and forth, or silently reconcile two versions.
There is one authority at a time, with the adapter making that authority
explicit to migrated callers.

Only after every whole-case replacement uses `replaceCaseFile()`, every
activation uses the filing lifecycle service, and no remaining classic code
reads or writes the bare state variables will the module become the owner. A
`window` getter/setter cannot reliably solve this earlier: JavaScript cannot
observe arbitrary reassignment of a classic script's top-level lexical `let`
(`caseFile` is one of those bindings), and a proxy around `window.D` cannot
observe every mutation of the object it returns. Pretending that such a proxy
is canonical would hide, rather than remove, the dual-authority hazard.

### Filing registry

One eager registry will describe all nine filing identities:

- Verified Initial Inventory;
- Simplified Annual Accounting;
- Annual Accounting;
- Final Accounting;
- Trust Accounting;
- Simplified Annual Plan;
- Annual Guardianship Plan;
- Initial Guardianship Plan; and
- Annual Plan — Minors.

Each entry supplies its persisted type, shared engine/alias, display metadata,
route definitions, blank-filing factory, idempotent normalizer, pure completion
evaluator, dashboard projection, and lazy feature loader. Final and Trust remain
distinct filing identities backed by the Annual engine; they are not collapsed
in saved data or visible copy.

This registry is deliberately lightweight. Dashboard totals and sidebar status
must not require importing PDF, Excel, or full page-rendering code.

### Events and mounted features

The existing delegated `data-form-action`, `data-shell-action`, and related
patterns are worth keeping. Their dispatch tables will import or receive real
handlers instead of calling `window.*`. Unknown actions fail loudly in
development/test. Feature-local listeners and observers receive an
`AbortSignal`, so leaving a route cannot accumulate duplicate handlers.

A feature mount will receive a context resembling:

```js
mount({ container, route, filing, services, signal });
```

MS 70 will add a route sequence token and serialize commits to the live host so
an old dynamic import or render cannot overwrite a newer route. It will **not**
require detached staging DOM: current features use document-global IDs, and a
detached-host rewrite would be a second migration with different compatibility
risks.

### The approved `window.GuardianForms` boundary

The namespace is installed once by the composition root and frozen. Production
modules may publish to it through one browser-API module, but may never consume
it to communicate with each other.

70A will enumerate the final members and prove a present need for each. The
default is no member, not compatibility by habit. Expected categories are:

- immutable build/version information;
- a redacted diagnostic status snapshot;
- a narrowly defined host command only if a real host consumer is identified;
  and
- `GuardianForms.testing`, created only when an explicit test mode is enabled.

The test adapter returns copies/snapshots and invokes validated application
commands such as seed/import, activate, navigate, and flush-save. It does not
return live mutable case objects and never exposes the encryption key. Browser
tests that need data setup will move to this adapter through
`tests/e2e/support/window-api.ts`; user-affordance tests will still click the
real controls rather than bypassing the UI. Test mutation commands must be
absent from ordinary production artifacts/launches; a user-supplied query
parameter alone is not sufficient enablement.

---

## Non-negotiable compatibility contracts

MS 70 changes ownership and module boundaries, not filing rules. Every delivery
must preserve these contracts:

| Area | Contract |
| --- | --- |
| Persisted data | No row, default, enum, collection limit, field name, or meaning changes in `probate-guardian-data-model.csv`. Existing missing-field inference and normalization remain at least as complete as today. |
| `.sav` archives | Format version stays `1`. Existing plain and password-protected archives, multi-filing cases, parties, cases, dismissals, audit/app state, active filing, last position, filenames, writable-handle behavior, recovery cache, and fallback downloads remain compatible. |
| Encryption/security | Preserve PBKDF2 at 210,000 iterations with SHA-256, a 16-byte salt, AES-GCM-256 with a 12-byte IV, `PG_VERIFIER_V1`, `PLAIN:`, the in-memory-only key, key clearing on lock, 15-minute inactivity lock, five-attempt exponential UI lockout, audit behavior, and prototype/path hardening. This protects local data at rest; it does not claim to defeat an attacker who can run an offline password attack. |
| Tri-state and identity | `''` / `'Yes'` / `'No'` remains tri-state. Toggling does not delete hidden data. Live filing identity and stable object references are preserved where existing services rely on them. |
| Court output | No workbook address, formula, defined name, PDF field, rounding rule, output filename, capacity rule, or import mapping changes. Formula cells are never overwritten. Output parity is read from generated artifacts, not inferred from re-import alone. |
| Completion and export | Sidebar completion, readiness, and export validation keep their current distinct jobs. In particular, the 14 Annual schedules stay stricter in the sidebar than in the export gate; MS 70 may not "unify" that intentional difference. |
| Workflow | Creation, switching, locking, deletion, rename, carryover, conversion, prior-year rollover, activity history, and party/case write-through behave the same for all filing identities. |
| Startup | Terms acceptance remains the first application interaction. Fresh start, remembered file, recovery, encrypted unlock, wrong-password handling, import/drop, and cross-tab lock paths keep their current outcomes. |
| UI/accessibility | Existing labels, route URLs, focus behavior, announcements, responsive layout, theme behavior, delegated controls, and print suppression remain unchanged unless a separately approved defect fix says otherwise. |
| Offline/portable | Source, hosted web, service worker, and single-file portable builds work without a network. A double-clicked `file://` portable build has no dangling chunk request, console error, or page error. |

If implementation uncovers a behavior defect, calculation discrepancy, legal
question, or schema need, the delivery stops at the boundary needed to report
it. A defect may be fixed only as separately authorized scope and must use the
repository's red-first proof. The migration itself is not permission to
normalize cross-form differences or redesign workflows.

---

## Migration method

Each coherent island follows the same pattern:

1. characterize the current behavior and its consumers;
2. extract one canonical implementation into an importable module;
3. make the old classic name a one-line delegating wrapper only when a
   still-classic caller requires it;
4. convert all ESM consumers to imports, injected services, or feature context;
5. convert source-sliced tests to direct imports/observable behavior in the
   same delivery; and
6. delete the wrapper/global when the last classic consumer is gone.

There must never be two substantive implementations of a calculation,
normalizer, persistence operation, or completion rule during transition. A
wrapper delegates; it does not fork logic. Each landed delivery must leave the
app releasable, and the global/dependency ratchet may stay level only when the
delivery first creates the infrastructure needed for a later drop. It may never
grow without an explicitly recorded exception and removal delivery.

---

## Delivery map

| Delivery | Outcome | Primary risk retired |
| --- | --- | --- |
| 70A | Evidence baseline, compatibility fixtures, architecture contracts, and no-new-global ratchet | Migrating an incomplete dependency inventory or letting the bridge grow during the work |
| 70B | Pure helpers and source-sliced units become real imports | Low-level duplicate behavior and tests that validate copied source |
| 70C | Eager filing registry, blank factories, and normalizers | Feature-load dependencies during creation/hydration |
| 70D | Pure per-engine completion/progress evaluators | Global `D` swapping and accidental readiness/export rule changes |
| 70E | Store/service seam adopted by ESM consumers while legacy remains owner | Direct global state reads spread across the module graph |
| 70F | Shared form runtime and action dispatch use imports/context | Hidden write side effects and global event handlers |
| 70G | Filing lifecycle, conversion, carryover, year, and shared-record workflows move behind services | Cross-filing identity, locking, and write-through regressions |
| 70H | Shell, help, activity, picker, and modal controllers become modules | Remaining UI globals and leaked listeners |
| 70I | Persistence, security, recovery, and startup orchestration become importable services | Loss/corruption, lock/key mistakes, and startup-order regressions |
| 70J | Module store becomes the sole state owner | Dual `caseFile`/`D` authority |
| 70K | Router, feature context, bootstrap, and namespaced external API replace the bridge | Stale async mounts and broad `window.*` compatibility |
| 70L | Classic file and obsolete bridge machinery are deleted; release evidence is recorded | Shipping a source-only success that fails web/portable or old archives |

The lettered deliveries are review and rollback boundaries, not permission to
land half of a state transition. Provider and consumers that must change
atomically stay in the same commit even when that makes a delivery larger.

---

## 70A — Baseline, contracts, and ratchets

### Work

- Replace or extend `scripts/audit-window-bridge.mjs` so it uses a parser and
  sees:
  - explicit `window.X` assignments and reads;
  - top-level function declarations in classic scripts;
  - top-level lexical declarations;
  - bare-identifier calls crossing the classic/module boundary;
  - top-level destructuring from `window`; and
  - the file and direction of every dependency edge.
- Classify every legacy top-level function/binding as **move**, **delete as
  dead/duplicate**, **temporary wrapper**, or **approved external facade**,
  with a named target delivery and module.
- Record a machine-readable MS 70 baseline under `tests/baseline/`, including
  bridge counts, dependency edges, feature lazy boundaries, source/web/portable
  asset inventories, and representative startup/performance measurements.
- Make the measurement reproducible rather than descriptive. Extend the
  existing `scripts/measure-baseline.mjs` and `scripts/measure-lifecycle.mjs`
  with an explicit output path and MS 70 record shape, then run the same
  commands at the beginning and end of the migration:
  `npm run measure:baseline -- --target=source --output=<ms70-source.json>`,
  `npm run measure:baseline -- --target=web --output=<ms70-web.json>`,
  `npm run measure:baseline -- --target=portable --output=<ms70-portable.json>`
  (after the corresponding web/portable build), and
  `npm run measure:lifecycle -- --output=<ms70-lifecycle.json>`. Keep the
  existing milestone-13 records untouched. The records must include the
  Chromium/browser and Node versions, git SHA, navigation timing, evaluated
  application script bytes, resource count, script duration, heap samples
  after the route cycle, lifecycle heap/node growth, and console/page errors.
  Treat memory samples as measurements to compare and investigate, not as a
  fabricated hard threshold before the baseline exists.
- Add a ratchet test: newly extracted modules cannot add application globals,
  top-level feature destructures from `window`, or undeclared facade members.
  Legacy implicit globals are an explicit shrinking grandfather list until 70L.
- Specify and test the exact `window.GuardianForms` schema. Any production host
  member needs a named consumer; test-only members require explicit enablement.
- Add synthetic, non-sensitive, committed **pre-MS-70 format-v1 `.sav` fixtures**:
  plain, encrypted with a documented test password, multi-filing/core-record
  content, audit/app state, and a supported legacy missing-field shape. Add
  corrupt and wrong-password cases without committing real user data.
- Fill the security contract gaps before ownership moves: SHA-256, AES key
  length, IV length, inactivity timeout, lockout/backoff, key erasure, and proof
  that no key/password is serialized.
- Add characterization for prior-year/year-rollover behavior, which currently
  lacks a single dedicated contract.
- Inventory all E2E fixture helpers and factories, especially
  `tests/e2e/support/fixture-completeness.ts`, `plan-fixture.ts`, every
  `fillMinimalValid*Ward()`, `BASELINE`, and form-specific factory.

### Gate

70A is complete only when every legacy declaration has a disposition, the
audit catches a deliberately injected implicit global and a bare cross-boundary
reference, current format-v1 fixtures open successfully, and CI can reject any
unapproved increase in the compatibility surface. The exact final facade is a
reviewed artifact of this delivery, not an open-ended promise to preserve all
current debugging habits.

---

## 70B — Pure helpers and direct-import tests

### Work

- Move genuinely stateless leaf behavior first: formatting and escaping,
  icon rendering, path/import guards, fixed vocabulary/metadata, small display
  helpers, and any pure preview/help constants still stranded in the monolith.
- Prefer an already existing module over creating a similarly named one.
  `icons.js`, field primitives, Excel sanitization, date/cell helpers,
  case/party resolvers, county/circuit modules, and import-hardening utilities
  must be audited before adding a destination.
- Consolidate only when behavior is proven equal. Output/caption/circuit
  differences are not assumed to be duplication merely because functions look
  similar.
- When a leaf service is extracted, migrate every ESM consumer that currently
  destructures that service from `window` in the same delivery. The 18-file
  zero-destructure criterion is a final gate, but it is not permission to leave
  an already-extracted service dependent on a top-level global until 70K.
- Convert affected source-slicing tests to import the canonical implementation.
  Known examples include bar-number formatting, Excel sanitization, date
  helpers, and legacy field wrapper tests. Delete wrapper-only assertions once
  all production call sites use the Tier 1 field primitive directly.
- Leave one-line classic wrappers only for remaining classic callers; include a
  deletion target in the declaration inventory.

### Gate

Every moved helper has one implementation, direct unit coverage, no new global
consumer, and no observable output/string-format drift. The parser audit count
falls by the number promised for 70B.

---

## 70C — Eager filing definitions, factories, and normalization

### Work

- Create the eager filing registry and per-engine model modules.
- Move blank filing/row/card factories, type aliases, route metadata, display
  metadata, and idempotent normalization out of the classic file.
- Update feature consumers of each moved factory/descriptor in the same commit;
  the eager registry must not be introduced as a second source while features
  continue reading the old global copy.
- Keep form-specific row factories separate where schemas differ. Do not invent
  a generic accounting/plan row merely to reduce file count.
- Remove `src/core/state.js` callbacks into legacy constants/factories. Creating
  a filing and hydrating an old filing must work without mounting its feature.
- Model Annual, Final, and Trust as distinct identities with an explicit shared
  Annual engine. Test all identities, not just the shared implementation name.
- Audit every fixture/factory alongside production defaults. A required sibling
  field added by existing behavior must appear everywhere it appears today;
  MS 70 adds no new required fields.

### Gate

All nine filing identities can be created, normalized repeatedly without
change, routed, and summarized through imports with no feature pack loaded.
With IDs and clocks fixed by the test harness, serialized shapes are deeply
equal to the pre-delivery shapes; comparisons normalize irrelevant object-key
ordering rather than hiding a value/default change.

---

## 70D — Completion and dashboard progress

### Work

- Split the current cross-form `computeNavChecks()` switch into pure per-engine
  evaluators accepting `(filing, dependencies)` and returning the same check map.
- Keep the old function temporarily as a delegating dispatcher and run old/new
  differential parity across every form fixture before switching callers.
- Make dashboard progress accept a filing explicitly. Delete the current
  technique that swaps `window.D` and active type to reuse sidebar logic.
- Migrate completion consumers as each evaluator is extracted. Any temporary
  dispatcher is a delegating compatibility wrapper, not a reason for a feature
  to capture `computeNavChecks` from `window` at module evaluation time.
- Put completion evaluators in the eager registry so unopened filings can show
  progress without importing their render/output pack.
- Convert checklist/source-slicing tests to imported completion tests and keep
  real browser coverage for sidebar dots and jump links.

### Gate

Old and new completion maps and percentages match across all fixture factories,
edge cases, and filing identities before the old dispatcher is removed. Tests
explicitly pin the intentional Annual blank-schedule rule: sidebar incomplete,
export still permitted where the court form and current accepted practice allow
it. Readiness remains a separate export-linked surface.

---

## 70E — Explicit store seam for existing ESM consumers

### Work

- Introduce the transaction/select/subscribe API while it still delegates to
  the legacy-owned case and active filing.
- Keep this as a zero-copy, single-writer adapter: no private shadow
  `caseFile`/`D`, no bidirectional synchronization loop, and no writable
  `window` proxy that claims to observe lexical `caseFile` reassignment. The
  adapter must either read the live legacy reference or call the one explicit
  bridge that owns the transition.
- Migrate ESM feature modules and core modules from `window.D`,
  `window.caseFile`, `window.getActiveWard()`, and window-backed references to
  the service/context API.
- Make state snapshots used for diagnostics/tests copies, not live references.
- Route new writes through named transactions that preserve today's
  normalization, dirty/save revision, activity, and re-render side effects.
- Keep a machine-checked list of remaining classic bare reads/writes. Do not
  claim canonical ownership yet.

### Gate

No ESM production module treats a browser global as its state API. The
transition still has one legacy authority, not two synchronized stores;
existing object identity and live update behavior remain intact. A transaction
causes each required side effect once, and direct mutation outside an approved
transition path is rejected by the audit/test guard where mechanically
detectable.

---

## 70F — Shared form runtime and action dispatch

### Work

- Extract path read/write, field binding, input coercion, `afterChange` side
  effects, nav-dot updates, section collapse, validation highlighting/panels,
  schedule-document acknowledgement/validation, and shared preview paging into
  importable services.
- Preserve the existing delegated-event design, replacing `window.*` calls in
  `form-events.js`, `shell-events.js`, `modal-events.js`, and related dispatchers
  with explicit handler maps.
- Keep semantic checkbox/radio behavior, dynamic-array re-indexing, focus, and
  accessible names exactly as documented in the repository rules.
- Give feature-local listeners, observers, and timers the route abort signal.
- Define the teardown contract explicitly. A feature's `dispose()` aborts its
  listeners/observers and cancels its route-owned timers, animation frames, and
  pending UI work. The autosave service owns its debounce: leaving the active
  filing flushes or cancels the pending save before the active pointer/lock is
  changed, while a same-filing page change may retain the debounce against that
  same filing. Preserve the existing `flushPendingSave()` and bound-filing
  guards as behavior contracts while moving them behind the service.
- Convert the affected `afterChange`, field-helper, schedule-document, capacity,
  and form-contract tests to direct imports/observable browser behavior.

### Gate

All filing mount contracts and the shared form-entry/navigation contracts pass
with no feature importing form services from `window`. Repeated mount/unmount
does not duplicate a listener, observer, autosave call, or validation update.
An edit followed by rapid route navigation or filing switching saves the old
filing exactly once and cannot write its data into the newly active filing.

---

## 70G — Filing lifecycle and shared-record workflows

### Work

- Consolidate existing extracted lifecycle/modal modules rather than copying
  them again. Move the remaining create/open-active/switch/unload/delete/rename
  orchestration behind a `filingLifecycle` service.
- Move carryover, conversion, eligibility, prior-year editing, new-year
  rollover, and their activity/audit consequences into importable workflow
  modules.
- Preserve the atomic lock handoff: failure to acquire the destination filing
  lock leaves the current filing intact and does not render a half-switched UI.
- Preserve party/case resolution, write-through, deduplication, dismissal links,
  guardian `partyId` cleanup, and Plan Minor's case fallback.
- Use **filing** in new APIs while preserving all historic persisted keys and
  user-facing legal vocabulary.

### Gate

Creation, switching, deletion, rename, carryover, conversion, year operations,
party/case write-through, and cross-tab locks pass through the service in both
UI and tests. No lifecycle path reassigns active/case state outside the store
seam. Every supported conversion produces exactly the same data it did before.

---

## 70H — Shell and support surfaces

### Work

- Move the Start New Form picker, shell controls, activity display, shared-
  record management, help panel/content, tours, theme button behavior, feedback
  surfaces, and remaining modal UI orchestration into focused controllers.
- Reuse existing UI modules and design-system classes. Do not turn controller
  extraction into a markup or visual redesign.
- Make each controller's listener/observer lifecycle explicit and disposable.
- Preserve first-focus, return-focus, keyboard, escape, dialog labeling,
  high-contrast, responsive, and light/dark behavior.
- Keep UI-only preferences in local storage and case/audit information in their
  existing protected stores.

### Gate

The dashboard, picker, activity log, Manage Shared Records, Help, tours,
feedback, theme, and dialogs work without a production call through a legacy
global. Accessibility behavior and help/control drift guards remain green.

---

## 70I — Persistence, security, recovery, and startup services

### Work

- Finish consolidating the existing modules under `src/core/persistence/` and
  remove duplicate classic implementations. Cover archive build/open, manual
  backup/restore, writable handles, fallback download, silent save, debounced
  flush, dirty/save revisions, recovery cache, launch preferences, import/drop,
  and last-position restoration.
- Extract unlock/create-password/lock/autolock, failure backoff, security audit,
  and key lifetime orchestration behind services. The `CryptoKey` remains in
  closure-owned memory and is cleared on every lock/failed derivation path.
- Make startup an explicit state machine covering terms acceptance, fresh case,
  remembered file, recovery snapshot, file import, password prompt, template
  readiness, and first route.
- Prove the new reader against the fixed pre-MS-70 golden archives; do not rely
  only on new-writer/new-reader round trips, which can drift together.
- Preserve import sanitization and path/prototype defenses on every ingress.

### Gate

Plain/encrypted old archives open; wrong password, corrupt archive, missing
entry, and unsupported data fail safely; no key or password is serialized; save
clocks and recovery semantics match; switching flushes before changing filing;
and startup reaches the correct route under every characterized path. Because
this is a broad, data-integrity-sensitive cutover, implementation should ask
for approval to run `npm run test:verify` at this checkpoint.

---

## 70J — Canonical module-owned state

### Work

- Confirm, mechanically, that all whole-case replacements use
  `replaceCaseFile()`, all active-filing changes use the lifecycle service, and
  the remaining classic code has no bare state reads or assignments.
- Move ownership of the case into the module store and derive the active filing
  from `activeWardId`.
- Remove `window.caseFile`, `window.D`, `_caseFile`/`_D` mirrors, and
  `windowBackedRef`-style authority. A temporary compatibility getter may exist
  only inside the controlled MS 70 adapter until 70K's callers move; it is not
  writable and is deleted by the end of 70K.
- Keep security, handles, route state, display preferences, and caches in their
  separate services; wire subscriptions at the composition root.
- Fault-inject transaction failure and route change during a pending save to
  prove rollback/error handling does not leave a half-activated filing.

### Gate

There is one case object and one derivation of the active filing. A save,
recovery restore, import, switch, and delete each update that authority once.
No production module or classic wrapper can mutate a competing global mirror.
This checkpoint also warrants requester approval for a full verification tier.

---

## 70K — Router, feature context, bootstrap, and browser API

### Work

- Replace string/global route dispatch with the eager registry and direct lazy
  loader functions.
- Give the router sole ownership of the hash/route, commit-before-leave,
  lock/dashboard focus, readiness reset, DOM commit, title/nav decoration,
  mount abortion, and feature disposal.
- Add a monotonically increasing navigation token and a serialized live-host
  commit so an older async mount cannot overwrite a newer route or read the
  wrong active filing.
- Convert every feature's top-level `const { ... } = window` dependency capture
  that remains after the earlier lockstep migrations to imports or mount
  context. Keep at least today's feature-level lazy loading.
- Preserve the Vite-visible dynamic-import boundary in `src/features-loader.js`
  (or replace it with an equally visible registry). The portable single-file
  build must still discover and inline the lazy feature graphs; a runtime
  `file://` module request is not an acceptable substitute.
- Create `startGuardianForms(services)` and call it directly from `main.js`
  after the terms gate. No `window.initApp` boot-order contract remains.
- Install the reviewed, frozen `window.GuardianForms` namespace. Enable its
  test-only adapter only under the explicit test mechanism agreed in 70A.
- Move Playwright support and fixtures to the namespaced commands/snapshots.
  Controls whose behavior is under test continue to be exercised by real click.
- Delete the temporary unnamespaced `D`/`caseFile` compatibility getters after
  the last browser fixture moves.
- Make feature-load failure visible and recoverable; do not hide it with a
  forced reload that can discard unsaved context.

### Gate

All routes and all filing identities mount through the imported registry;
rapid navigation cannot commit stale work; there are zero top-level feature
destructures of the application API from `window`; startup is a direct import;
and the bridge audit permits only the reviewed `GuardianForms` namespace plus
explicit platform/vendor globals.

---

## 70L — Delete the monolith and prove the release

### Work

- Delete `src/legacy-app.js`.
- Remove its script tag from `index.html`, its static-copy rule/comments from
  `vite.config.js`, and its service-worker critical reference from
  `scripts/generate-service-worker.mjs`.
- Remove transitional wrappers, broad assignments in `features-loader.js`,
  obsolete feature-bridge machinery, legacy state adapters, source-slicing
  helper/tests, and broad bridge declaration/allow-list entries.
- Replace or delete `src/core/types/window-bridge.d.ts` and
  `tests/unit/fixtures/window-bridge-allowlist.json` as a coordinated change
  with `tests/unit/window-bridge.spec.js`; the surviving declaration/contract
  describes only the approved namespaced API.
- Repurpose bridge tests around the namespaced API schema and the zero-global
  rule. Delete only tests that asserted a retired wrapper; preserve their
  behavior coverage at the canonical module or browser level.
- Update `README.md`, `AGENTS.md`'s stack description, `file_index.md`,
  `TEST-INDEX.md`, architecture comments, and package/build documentation.
- Re-run the baseline measurements and record facts, not promises: source/web/
  portable asset lists, initial/eager bytes, first route readiness, first
  feature mount, and first PDF/Excel action. Use the exact versioned commands
  and output schema established in 70A, and retain both before/after JSON
  records. Investigate a material regression; do not hold completion to an
  invented performance percentage.
- Inspect the built packages and open the portable build over literal `file://`
  with console and page-error capture.

### Gate

The completion criteria below are mechanically true on the exact release
commit. The final `npm run test:release` is the appropriate release gate, but
it and any other full regression require the requester's explicit approval at
execution time.

---

## Verification strategy

### Proof standard

This is primarily a refactor, so the central proof is **characterize before,
compare during, and rerun after**. Red-first is still mandatory for any defect
fix discovered and separately authorized. A new architecture guard should be
seen failing against its deliberately injected forbidden case before it is
trusted.

Every changed/added/deleted/repurposed spec receives exactly one synchronized
`TEST-INDEX.md` row. Every repository file addition/deletion/move is reflected
in `file_index.md` in the same commit.

### Targeted matrix

| Area | Representative existing evidence to run/convert |
| --- | --- |
| Bridge/bootstrap | `window-bridge.spec.js`, `boot-ordering.spec.js`, `startup.spec.ts`, plus the new dependency/facade ratchets |
| Factories/models | filing default/schema/factory specs; converted `guardian-inventory-yes-no-radio.spec.js`; all fixture-completeness helpers |
| Completion/readiness | `checklist-export-parity.spec.js`, `schedule-doc-ack.spec.js`, `navigation-status.contract.spec.ts`, `readiness-card.contract.spec.ts`, Plan readiness, Annual schedule consistency, and sidebar-only expectation specs |
| Form runtime | `form-write-side-effects.spec.js`, form-contract/field units, all seven feature mount specs, `form-entry.contract.spec.ts`, form-entry UX, and `routes.spec.ts` |
| State/lifecycle | case/filing/party resolver and write-through units; carryover, conversion, year, delete/rename, filing identity, route, and cross-tab lock E2E |
| Persistence/security | `case-file.spec.js`, the new golden-archive/security contracts, `case-file-roundtrip.spec.ts`, `case-file-protection.spec.ts`, `case-file-core-fields-roundtrip.spec.ts`, `backup-restore-sav.spec.ts`, `dashboard-backup.spec.ts`, `recovery-cache.spec.ts`, `persistence-recovery.contract.spec.ts`, `save-pipeline-boot.spec.ts`, `unlock.spec.ts`, and `ward-lock.spec.ts` |
| Packaging | startup, offline/PWA, feature-load failure, archive roundtrip, backup, and lock scenarios under source/web/portable profiles, followed by literal portable smoke |

These names are a planning map, not permission to copy a stale command list.
Each delivery must use `TEST-INDEX.md` to select the current exact specs.

### Known legacy-coupled test migrations

70A must regenerate this inventory, but scoping already found these concrete
groups:

- tests that currently extract/evaluate a legacy function or closure:
  `bar-number.spec.js`, `checklist-export-parity.spec.js`,
  `comment-card-hide.spec.js`, `form-fields-legacy-delegation.spec.js`,
  `form-write-side-effects.spec.js`, `guardian-inventory-date-roundtrip.spec.js`,
  `guardian-inventory-totals.spec.js`, `part-xi-remuneration.spec.js`, and
  `schedule-doc-ack.spec.js`;
- tests that read `legacy-app.js` to pin a factory, boot workaround, duplicate-
  code guard, or retired behavior: `boot-ordering.spec.js`, `case-file.spec.js`,
  `cell-reader.spec.js`, `excel-engine.spec.js`,
  `guardian-inventory-yes-no-radio.spec.js`, `guided-tour-content.spec.js`,
  `help-guide-pdf-orphan.spec.js`, `theme-persistence.spec.js`,
  `user-guide-drift-guard.spec.js`, and `yes-no-radio-migration.spec.js`; and
- browser support that assumes writable global state, including
  `tests/e2e/support/window-api.ts`, `fixture-completeness.ts`, and
  `plan-fixture.ts`.

The first group becomes direct-import tests in the same delivery that moves the
function. The second is repointed to the canonical module or retired only when
its prohibition becomes structurally impossible. The support group moves to
the typed namespaced test adapter and stays inside the type-check gate.

### Verification cadence

1. **Each delivery:** focused unit specs and the browser contracts for the
   touched behavior. Run `npm run check:types` whenever the checked navigation,
   persistence, state, or E2E-support graph is touched.
2. **70D:** old/new differential completion parity across all fixtures before
   switching consumers.
3. **70I and 70J:** request authorization for `npm run test:verify`; these are
   broad shared-state/data-integrity checkpoints.
4. **Before deletion in 70L:** a green full source regression on the exact
   candidate, then web/portable builds and distribution-sensitive profiles.
5. **Final:** request authorization for `npm run test:release`, plus the literal
   portable `file://` smoke and package inventory. `test:quick` is useful during
   slices but is not a merge/release gate.

`npm run verify:data-model` should remain green and the CSV should remain
unchanged. If implementation discovers a real persisted-shape need, that is a
scope decision, not an automatic MS 70 edit.

---

## Completion criteria

MS 70 is complete only when all of the following are true:

1. `src/legacy-app.js` is absent, with no script tag, static-copy rule, service-
   worker asset, documentation claim, or test path referring to it as live code.
2. Guardian Forms boots through a direct module import; `window.initApp` is
   absent.
3. One module-owned store is the authority for the case and active filing. No
   production window-backed mirror participates in reads or writes.
4. Production modules communicate through imports/context/services. There are
   zero top-level application-API destructures from `window`.
5. The only application-owned global is the frozen, documented
   `window.GuardianForms` namespace. Every member has a named external purpose;
   test-only members are absent unless explicitly enabled.
6. The bridge/dependency audit reports zero unowned app globals, zero implicit
   classic application globals, and zero unclassified cross-boundary edges.
7. Blank creation, normalization, routes, completion, and dashboard progress
   work without loading a heavy filing feature pack.
8. Route changes dispose/abort the old feature, and a stale async mount cannot
   write into the new route or filing.
9. All source-sliced/eval tests of legacy application functions have become
   direct-import or observable-behavior tests; `legacy-source-extract.js` is
   gone unless a separately documented non-legacy use justifies a renamed
   general helper.
10. Fixed pre-MS-70 plain and encrypted `.sav` fixtures open correctly, current
    archives round-trip, and the security/key contracts pass.
11. PDF/Excel artifacts, validation, readiness, sidebar completion, conversions,
    and all nine filing identities retain their pre-migration behavior.
12. Source, hosted web, and portable profiles pass; literal `file://` portable
    startup/save/open has no console or page error; the approved release gate is
    green on the release commit.
13. Before/after measurements are recorded. Any startup or first-feature
  regression is explained and accepted or corrected; no unsupported speedup
  claim appears in the build record.

---

## Principal risks and controls

| Risk | Control |
| --- | --- |
| Two state owners silently diverge | Introduce the API first, inventory every writer, and flip ownership only after bare assignments reach zero. Never run dual substantive stores. |
| Circular imports replace global coupling | Enforce dependency layers in 70A; construct stateful services in the composition root; keep filing definitions lightweight and one-directional. |
| Audit says zero while implicit globals remain | Use parser-based classic-scope and bare-identifier analysis, deliberate fault injections, and a final script-tag inventory. |
| Refactor changes a filing rule | Differential tests, generated-artifact checks, sibling-form review, and a hard rule that discovered behavior fixes require separate approval. |
| Async route finishes against the wrong filing | Route sequence token, abort signal, serialized live-host commit, explicit filing in mount context, and rapid-switch E2E. |
| Autosave, activity, or render fires twice | Named store transactions and service-level assertions for exactly-once side effects; listener teardown tests. |
| Old archive opens only with old code | Committed pre-migration golden archives, not just same-version writer/reader round trips. |
| Test facade becomes a production backdoor | One frozen namespace, explicit test activation, copy-only snapshots, command validation, no key/password/raw mutable object, and schema ratchet. |
| Portable build passes source tests but fails from disk | Distribution-profile specs, dynamic-import inventory, package inspection, and literal `file://` smoke before completion. |
| Migration becomes an unreviewable rewrite | Small dependency-ordered deliveries, one canonical implementation per concern, wrappers only as temporary delegates, and release-ready state after each landing. |

### Rollback discipline

Each delivery should be one or a small set of cohesive direct-to-master commits
that can be reverted without reviving a second implementation. A compatibility
wrapper and its target move together; a provider and consumers that must change
atomically move together. No branch-long flag day is planned. Concurrent
changes are synchronized before each delivery, and only the delivery's own
files are staged.

---

## Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** No persisted-shape change is planned. The data-model CSV is
   expected to remain byte-for-byte unchanged. A discovered shape need stops
   the affected delivery for separate scoping and verification.
2. **Legacy data migration.** MS 70 performs no version migration. Existing
   normalization/inference moves intact into importable modules. Format-v1 plain,
   encrypted, and missing-field fixtures prove that old data does not become
   less complete.
3. **Fixture and factory audit.** 70A inventories every baseline/minimal-valid
   factory and E2E support helper. 70C changes production factories and their
   test analogs together; no new required field is introduced.
4. **Test coverage and index.** Each delivery names and runs targeted tests;
   bridge, archive, security, year, async-route, and portable gaps receive new
   coverage. Every spec/helper scope change updates `TEST-INDEX.md` in the same
   commit.
5. **Export/import/portability.** Court artifact mappings do not change. `.sav`
   and workbook import paths are characterized before ownership moves. Source,
   web, service worker, and literal portable builds are explicit final gates.
6. **Security and sensitivity.** No new sensitive data is stored. The test and
   diagnostic API is redacted, the crypto key remains memory-only, imports stay
   hardened, and the plan accurately limits encryption/lockout claims to local
   at-rest and UI protections.
7. **UI/UX consistency.** Existing cards, labels, delegated buttons, dialogs,
   focus management, themes, and accessibility structures are retained. This
   is controller/state extraction, not visual redesign.
8. **Legal/compliance framing.** No legal-sufficiency determination is made.
   Validation and output are held to current behavior and authoritative court
   templates. Any legal or calculation discrepancy is reported, not silently
   resolved inside the migration.
9. **Cross-form method consistency.** Recurring concepts are inventoried across
   Initial Inventory, Annual/Final/Trust, Simplified, and all Plans before a
   shared helper is chosen. Genuine template differences remain. A discovered
   divergence is classified as authority-backed, defective, or unresolved and
   brought back for scope authorization before behavior changes.

---

## Expected file impact

Exact filenames are finalized in 70A after the dependency inventory. The likely
shape is:

| Area | Likely change |
| --- | --- |
| `src/main.js` / new bootstrap module | Become the composition root and direct startup call. |
| `src/core/state.js` or `src/core/runtime/case-store.js` | Replace the thin window adapter with the canonical case store. Only one of these should own state; do not create competing stores. |
| `src/core/filing/` and feature model files | Filing registry, identity descriptors, blank factories, normalizers, completion evaluators, and dashboard projections. |
| `src/core/form/` and event modules | Shared binding/write/runtime services and imported action maps. |
| `src/core/navigation/` | Filing lifecycle, route registry, mount/dispose/abort orchestration, and stale-navigation protection. |
| `src/core/persistence/` | Canonical archive, save, recovery, security, audit, and startup services; delete duplicate classic bodies. |
| shell/help/modal modules | Controllers for application surfaces remaining in the monolith. |
| one compatibility/browser-API module | Temporary delegating bridge during migration; final installer for the frozen `window.GuardianForms` namespace. |
| `tests/baseline/` and synthetic `.sav` fixtures | Dependency/performance baseline and old-format compatibility corpus. |
| `tests/unit/`, `tests/e2e/`, `tests/e2e/support/` | Direct-import tests, namespaced browser adapter, security/year/async route coverage, and fixture migration. |
| `index.html`, `vite.config.js`, service-worker generator | Remove the legacy classic-file special case at 70L. |
| `README.md`, `AGENTS.md`, `TEST-INDEX.md`, `file_index.md` | Describe the landed architecture and keep repository governance synchronized. |

The permanent architecture should not contain a folder named `legacy` merely
because a migration used one temporarily. Compatibility code carries an owner
and deletion delivery.

---

## Size and sequencing expectation

This is a program of work, not one pull-sized refactor. For budgeting, the
current evidence suggests roughly **45–70 focused engineering days** across the
twelve deliveries, excluding separately authorized behavior defects and waiting
time for full browser/release suites. That range is intentionally broad and is
not a calendar commitment. 70A must replace it with a delivery-by-delivery
estimate after the parser-backed inventory identifies the actual declaration
and consumer counts.

The safest approval shape is the whole target architecture plus one delivery at
a time, beginning with 70A. Approval of the plan does not waive later decisions
if a delivery discovers changed cost, legal ambiguity, a data-model change, or
an output difference.
