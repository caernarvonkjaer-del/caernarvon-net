# Milestone 70: Complete Guardian Forms' ES-Module Migration

## Status

**70A complete (2026-09-24); 70T, 70B, 70C and 70D complete (2026-09-25) --
see their build records. Every remaining delivery, 70E through 70L, is approved.** The
requester approved delivery 70A on 2026-09-24 and it is complete on the
`milestone-70` branch (see the 70A build record), then approved 70T. On
2026-09-25 the requester approved every delivery after it ("Finish ms 70. That
means ms 70B and every other after until it's done.", then "Proceed with the
entire process."), to run in order on the plan owner's recommendations, with
defects fixed as they are found; that approval also covers the full-regression
runs the 70I, 70J and 70L gates ask approval for. The merge to `master` still
waits for the requester's release sign-off (D8). The deliveries are intentionally sequential because
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

### Decisions recorded 2026-09-24

The requester settled nine further questions after reviews of this plan
(D7's trigger was set after Codex's review of 2026-09-24):

| # | Question | Decision | What it means for the work |
| --- | --- | --- | --- |
| D1 | How does MS 70 coexist with production fixes? | **MS 70 is built on a dedicated branch, `milestone-70`.** Bug fixes keep landing on `master` and keep shipping to production. When the MS 70 work is done, the fixes that landed on `master` in the meantime are re-constituted in the new code before the branch merges. | A scoped exception to AGENTS.md section 2 ("direct to master; never create feature branches"), for MS 70 work only. Production zips are built from `master` only; nothing built from the branch is deployed before the merge. See **Branch workflow and the master-fix ledger**. |
| D2 | What must pass before a delivery lands? | **The shipped-build profiles run at checkpoints only** -- 70I, 70J, before deletion in 70L, and at the merge -- not on every delivery. The one exception is 70A, which runs the new `portable-http` profile once to bring it up: the profile has to be shown working against the unmigrated build before any checkpoint relies on it. | Safe because the branch never ships mid-migration. Every delivery still runs its targeted source tests and the static ratchets. The merge to `master` is the real release and carries the full gate. |
| D3 | How do browser tests set up and read data once the globals are gone? | **Through `GuardianForms.testing`, switched on by the test runner before the page loads.** | The adapter's code ships inside the production build, but the `testing` member is attached to the namespace only when the test runner enables it before the app starts, and it can never be enabled from a URL. The enabling flag is runner-owned, read once and deleted during boot, so `window.GuardianForms` stays the only application-owned global (T3). Release tests therefore exercise the exact package that is deployed. See **The approved `window.GuardianForms` boundary** and **70T**. |
| D4 | Pause for a tester pass after 70J's ownership flip? | **No pause.** 70K follows on automated evidence. | 70J is a one-way door within the branch; this plan no longer claims it can be reverted on its own (see 70J). |
| D5 | A tester pass on the test system before the branch merges? | **No tester pass.** The merge proceeds on automated evidence plus the requester's release sign-off (D8). | No tester exercises the migrated application before production does: it reaches production in one deploy, and the first person to use it interactively is a filer. This is a conscious risk decision, not evidence that automation makes the release safe; its mitigations are D8, the rollback contract, and the rollback runbook in **Reconstitution and merge**. |
| D6 | Freeze `master` while the ledger closes? | **Yes -- a short, announced freeze** on non-urgent `master` changes while the last fixes are re-constituted and the merge gate runs. | Urgent fixes still land on `master` and join the ledger. The ledger cannot keep growing while the merge gate is running. |
| D7 | Carry `master`'s fixes over only at the end? | **At the end, with a review at 70I.** If the ledger then holds **10 or more rows marked "re-implement"**, `master` is merged into the branch at 70I. | The trigger is a count read straight from the ledger, not a judgment of effort, so anyone checking it gets the same answer. For scale, seven `master` commits touched the monolith on 2026-09-24 alone. Below the threshold, reconstitution stays at the end. |
| D8 | Add a release sign-off to D5? | **Yes -- the requester signs off before the merge deploys.** | A release packet is assembled at the merge gate: the gate results, the package's file list compared with the last pre-merge zip, and each filing type's generated PDF and workbook side by side with the pre-merge build's output for the same synthetic case. No tester is involved; the merge waits for the sign-off. |
| D9 | How may converted browser tests change case data? | **Setup versus behavior.** A raw `patchFiling()` may only arrange a test's starting data; any test whose result depends on what an edit triggers makes that edit through `setField()` or the real UI. | Each data write in a converted spec is classified and recorded in 70T. A write moved to the real path may expose a test that passed only because it skipped the app's own processing; that is reported and resolved, not suppressed. Assertion counts remain a tripwire, not proof that a converted test means what it meant. |

No question is open as of this revision. New ones are added under **Open
decisions**, as numbered options with a recommendation, the moment they
surface; the technical choices the plan owner settled (T1-T3) are listed
there too, open to review.

### Document ownership

From 2026-09-24 Claude owns revisions to this proposal. Codex and
Antigravity review each revision and send suggestions through the
requester, who decides which to adopt; adopted suggestions are applied by
the owner and recorded in the **Revision log** at the end. This keeps one
author per revision while the plan is still changing, the same
single-writer rule the plan asks of the code.

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
| Explicit global bridge | The parser-based 70A audit finds 337 `window`/`globalThis` write sites, including 13 `Object.defineProperty` publications the regex audit misses (see the 70A build record). The current regex audit finds 319 `window.X =` assignment sites across 60 JavaScript files and 358 distinct application-defined names consumed from `window`. It does not yet see every implicit classic global or bare identifier dependency. |
| Highest fan-out globals | `D` is consumed by 41 files; `autoSave` by 14; `renderPage` and `setPath` by 13 each; `ic` and `navigate` by 12 each; and `computeNavChecks` by 8. |
| Feature coupling | Eighteen feature files destructure application services from `window` at module evaluation time. Those captured references create both ordering constraints and difficult test setup. |
| State ownership | `src/core/state.js` describes itself as a thin adapter around legacy globals. It reads and writes `window.caseFile` and `window.D`; the monolith still owns the underlying lexical state and many save/activity flags. |
| Build special case | `vite.config.js` copies `src/legacy-app.js` as a static file, and `scripts/generate-service-worker.mjs` treats it as a critical asset, instead of Vite compiling it as part of the module graph. |
| Test coupling | Parsed in 70A (`tests/baseline/ms70-e2e-globals.json`; see the 70A build record): 112 of the 115 browser spec files reach application globals inside `page.evaluate()`, 158 distinct application names in all (Milestone 42C had listed 83), and 42 files write into live case state in place -- 237 sites such as `Object.assign(w.D, patch)` followed by `autoSave()` -- which a copy-only adapter cannot serve without new commands. The text-search estimates first written here (about 83 files; at least 31 files and 177 sites) were low. On the unit side, specs evaluate monolith source through `tests/unit/support/legacy-source-extract.js` or source slicing, read `legacy-app.js` to pin its content, carry hand-copied mirrors of monolith code, or stub `window` (see **Known legacy-coupled test migrations**). These counts come from text searches and are lower bounds; 70A replaces them with parser counts. |
| Production configuration | Production is the **portable** build served over HTTPS from a subfolder of the DNN site. It registers no service worker: only the web build carries the `pg-build=web` marker that `src/pwa-ui.js` requires. The `portable` e2e profile opens that same build as a literal `file://` page and runs six parity specs. Four code paths branch on `file:` versus HTTP(S) -- the cross-tab filing lock (`src/core/ward-lock.js`, bypassed entirely under `file:`), fragment loading (`src/fragment-loader.js`), and two template-fetch startup steps in `legacy-app.js` (effectively dead today, since all three court templates are bundled) -- so no current profile runs the shipped portable bundle through the branches production takes. The source profile does take those branches, but against unbundled source. |
| Continuous integration | `.github/workflows/probate-guardian-tests.yml` runs only on manual dispatch (`workflow_dispatch`); nothing runs automatically on a push. Every ratchet in this plan is therefore enforced by the unit suite that agents run, and CI is available on demand for any branch, including `milestone-70`. |
| Existing duplicates | The single-implementation rule is already broken in places. `PBKDF2_ITERATIONS` and `CRYPTO_VERIFIER_PLAINTEXT` are defined in both `legacy-app.js` (lines 1701-1702) and `src/core/persistence/crypto.js`; the `pg-launch-pref` and `pg-session-cache` database names and the `hasOpenedBefore` key also exist in both the monolith and their modules. |
| Stale export rationales | Comments in `legacy-app.js` and the Plan Annual, Initial and Minor feature modules say a `window` export exists so that a rendered `onclick="..."` attribute still resolves. No such attribute remains in the source, and the page's `script-src 'self'` policy would block one. A comment's stated reason for an export is not evidence that the export is still needed. |
| Living references to the monolith | AGENTS.md names `legacy-app.js` in its stack line and locates section 4's sidebar-versus-export rule in `computeNavChecks()` in `legacy-app.js`; 14 `TEST-INDEX.md` rows and comments in 46 source files also name it. |

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
real controls rather than bypassing the UI.

**Enablement (decided, D3).** The testing member's code is present in the
shipped build, but the member is attached to `window.GuardianForms` only when
the test runner enables it before the application starts: a Playwright init
script sets a documented pre-boot flag, which the composition root reads
exactly once. On an ordinary launch the member does not exist. The flag
itself is runner-owned, not application-owned: one documented `window`
property that the init script defines, that the composition root reads once
and deletes during boot, and that the bridge audit lists as the single
runner-owned name (T3). The final-state rule -- `window.GuardianForms` is the
only application-owned global -- therefore stays true. It is never enabled by a URL, query
parameter, stored preference, or anything reachable from the running UI, and
enabling it after startup has no effect. Release tests therefore exercise the
exact package that is deployed; a separate test build would have meant the
release gate never tested what ships.

The threat model is deliberately narrow. A person who can run script in
their own browser -- developer tools, an extension -- can already read and
change their own case data, so the adapter does not try to stop them. What
enablement-before-boot prevents is accidental exposure: an ordinary launch,
a shared link, or a stale setting leaving mutation commands reachable. The
adapter never exposes key material or a live mutable object whether or not it
is enabled.

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
| Mixed versions during a deploy | Production has no service worker, so nothing forces open tabs to update: after the merge deploys, a filer can have a pre-MS-70 tab and a post-MS-70 tab open on the same case at once, and a tab reloaded into the new version keeps its own sessionStorage. What the versions share must stay compatible in **both** directions, by kind. **IndexedDB:** `pg-session-cache` (recovery snapshots) and `pg-launch-pref` (remembered file handle, first-run flag). **localStorage:** `pg-theme-v1`, `pg.termsAccepted`, `pg-last-position`, `pg-default-circuit`, `pg-offline-access-answered`, `pg-tab-heartbeats-v1`. **sessionStorage:** `pg-tab-warning-dismissed-v1`, and on the web build `pg-update-reload-pending-v1`. **BroadcastChannel and Web Locks:** the `probate-guardian-tabs` message shape and the `pg-ward-<id>` lock names. **Service-worker CacheStorage:** `pg-shell-<version>` and `pg-offline-<version>`, web build only and absent from production. **Process-local state is excluded:** the in-memory court-template cache (`_templateCache`, which replaced the old IndexedDB template store), the encryption key and module state are not shared between versions. The unlock-failure count travels inside the `.sav` archive's app state and is covered by the archive contract. An old tab must not misread, overwrite, or fail to honor what a new tab writes, and the reverse. |
| Rollback | Rolling back redeploys the last pre-merge zip, so an archive saved by the migrated version must open in the pre-merge version without loss, and recovery snapshots it wrote must not break the old version's startup. Tested at the merge gate with archives saved by the branch head and opened by the pre-merge build. |
| UI/accessibility | Existing labels, route URLs, focus behavior, announcements, responsive layout, theme behavior, delegated controls, and print suppression remain unchanged unless a separately approved defect fix says otherwise. |
| Offline/portable | Source, hosted web (with its service worker), and portable builds work without a network. The portable build is `index.html` plus its `lib/`, `icons/`, `src/`, `help/` and `fragments/` folders -- not a single file, before or after MS 70. It keeps working both as production runs it (served over HTTPS from a DNN subfolder, no service worker) and double-clicked from disk (`file://`), with no dangling chunk request, console error, or page error in either. |

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
6. delete the wrapper/global when the last classic consumer is gone; and
7. update every **living** reference to the moved code in the same commit --
   AGENTS.md, README.md, `TEST-INDEX.md` rows, `file_index.md`, the user guide,
   and source comments that name its old location. This is the `TEST-INDEX.md`
   same-commit rule applied to locations: AGENTS.md section 4 in particular
   locates a legally load-bearing rule in `computeNavChecks()`, and it must not
   point at a function that has moved. Historical milestone records are
   records and are not rewritten.

There must never be two substantive implementations of a calculation,
normalizer, persistence operation, or completion rule during transition. A
wrapper delegates; it does not fork logic. Each landed delivery must leave the
app releasable, and the global/dependency ratchet may stay level only when the
delivery first creates the infrastructure needed for a later drop. It may never
grow without an explicitly recorded exception and removal delivery.

---

## Branch workflow and the master-fix ledger

Decided (D1): MS 70 is built on a branch while production fixes continue on
`master`. The filer-visible reason is the one that matters: production keeps
receiving fixes on its usual cadence, and no zip ever contains a
half-migrated application. The cost moves to the end, where every fix made
on `master` meanwhile has to be carried into code that no longer looks like
the code it was written against. This section is how that cost is kept
visible and bounded.

### The branch

- `milestone-70`, created from `master` at the start of 70A. The branch-point
  SHA is the first line of the ledger.
- **AGENTS.md exception.** When the branch is created, a short, scoped note
  lands on `master` in AGENTS.md section 2: MS 70 work -- and only MS 70 work --
  is committed to `milestone-70`; everything else stays direct-to-master.
  Without it, an agent following section 2 as written will either push MS 70
  work to `master` or refuse the branch. The merge removes the note.
- **Recording D1 authorizes nothing by itself.** Creating the branch and
  editing AGENTS.md are 70A's first steps, and happen only when the requester
  approves 70A under the repository's normal gating.
- The repository's other rules apply on the branch unchanged: sync before
  starting, commit only your own delivery's files, `TEST-INDEX.md` and
  `file_index.md` in the same commit, red-first proof for any fix, and never a
  force-push. Deliveries stay sequential; the ledger names the one agent who
  owns the delivery in progress.
- Production zips are built from `master` only.

### The master-fix ledger

- `MILESTONE-70-FIX-LEDGER.md`, kept on the branch.
- One row per `master` commit after the branch point: SHA, date, one-line
  summary, files touched, **disposition** -- merges cleanly, re-implement in
  the new code, or not applicable (documentation-only or superseded) -- the
  test or tests that prove the fix, the branch commit that carries it, and
  status.
- Kept current throughout, not reconstructed at the end: whoever starts or
  finishes a delivery appends any new `master` commits. A guard script
  compares `git log <branch-point>..origin/master` with the ledger and fails
  on any commit it does not list; it runs at every checkpoint and blocks the
  merge.
- Expect most rows to be re-implementations. Production fixes usually touch
  `legacy-app.js`, which the branch deletes: on 2026-09-24 alone seven
  `master` commits touched it, five of them in `computeNavChecks()`, the
  function 70D splits.
- A re-implemented fix is proven the way it was proven on `master`: its
  red-first test -- converted to the 70T adapter if it reached into globals --
  fails on the branch without the port and passes with it. A fix whose test
  cannot be converted without changing what it asserts is reported, not
  quietly weakened.

### Reconstitution and merge (decided: at the end, reviewed at 70I)

Per D7, the ledger is reviewed at the 70I checkpoint: if it holds 10 or more
rows marked "re-implement", `master` is merged into the branch there, through
the same ledger rows, so the final port is smaller. Everything else is carried
over at the end:

1. Close the ledger under a short freeze on non-urgent `master` changes (D6),
   announced to every agent before it starts. A production hot-fix during the
   freeze still goes to `master` and into the ledger.
2. Re-constitute every open ledger row on the branch.
3. Run the merge gate on the branch head: the ledger guard, the full release
   tier (with the requester's approval at the time), the `portable-http`
   profile, a literal `file://` portable smoke, and the rollback test --
   archives saved by the branch head open in the pre-merge build without loss
   (**Contracts: Rollback**).
4. Assemble the release packet and obtain the requester's sign-off (D8): the
   gate results; the package's file list compared with the last pre-merge
   zip; and, for each filing type, the generated PDF and workbook side by side
   with the pre-merge build's output for the same synthetic case. Per D5 no
   tester pass follows; the gate and this sign-off are the whole check before
   production.
5. Merge `milestone-70` into `master` with a merge commit, not a squash, so the
   delivery commits stay individually reviewable. Git will report a
   modify/delete conflict on `legacy-app.js` for every `master` change to it;
   each resolves as the deletion only because its ledger row is already
   closed, and the guard is what proves that.
6. Build the deployment zip from the merged `master` and deploy it.

**Rollback runbook** -- written before the merge, and part of the release
packet. Keep the last pre-merge zip with the SHA it was built from. To roll
back: redeploy that zip to the production folder exactly as a normal
deployment, then revert the merge commit on `master` (`git revert -m 1
<merge-commit>`) so the next zip built from `master` is the pre-merge code.
Filers lose nothing that the rollback contract covers: archives they saved on
the migrated version open in the version rolled back to.

---

## Delivery map

| Delivery | Outcome | Primary risk retired |
| --- | --- | --- |
| 70A | Evidence baseline, compatibility fixtures, architecture contracts, and no-new-global ratchet | Migrating an incomplete dependency inventory or letting the bridge grow during the work |
| 70T | Test adapter and browser-suite migration, completed against the unmigrated monolith | Rewriting the proof and the code it proves at the same time, so a weakened test goes green exactly when it matters |
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

70T is out of alphabetical order on purpose: it runs immediately after 70A
and before 70B, and the A-L letters keep the meanings reviewers already use.
Every delivery lands on the `milestone-70` branch (D1).

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
- Create the branch, the scoped AGENTS.md exception on `master`, and the
  ledger with its guard script (see **Branch workflow and the master-fix
  ledger**).
- Add a production-parity e2e profile, `portable-http` (T1): build
  `dist/portable` and serve it from a non-root subfolder on `http://localhost`
  through a small Node static server with no new dependency, then run the
  portable parity specs plus the specs covering the four protocol-dependent
  paths (cross-tab lock, fragment loading, template fetch, startup). Record
  which of those specs skip or take a bypass under `file:` today. Parity with
  production is asserted, not assumed. The application's only protocol
  branches test for `file:` -- none distinguishes HTTP from HTTPS (checked
  2026-09-24) -- and `localhost` is a secure context, so every run asserts
  `window.isSecureContext === true`, that the page's path is the subfolder,
  and that `navigator.serviceWorker.getRegistrations()` returns none. The
  production site's response headers are captured once, with the requester's
  go-ahead since it contacts production, and the security-relevant ones --
  content-security policy, content types, caching -- are replayed; any that
  cannot be is recorded as a known difference. This profile, not the
  `file://` one, is the production gate at checkpoints and at the merge; 70A
  runs it once to bring it up (D2).
- Add an import-cycle and layering check to the ratchet, parser-based like the
  existing audit, with no new dependency. Moving classic code into modules
  creates cycles, and a cycle can pass under the source profile's native ES
  modules yet evaluate in a different order -- or fail -- in the Rolldown
  bundle that ships. Unlike the shipped-build profiles (D2), this static check
  runs on every delivery.
- Classify every `window` export by its **current** reason, verified against
  the code rather than its comment (see **Stale export rationales**).
- List every existing duplicate (see **Existing duplicates**) with the one
  canonical home it will keep; the parser inventory is expected to find more.
- Generate the old-format `.sav` corpus from history, not only from today's
  writer: check out several earlier commits -- at least one per milestone that
  changed a persisted shape -- run each in a temporary worktree, and save
  synthetic cases from it. Record each fixture's source SHA. Fixtures written
  by today's code prove only today's shape.
- Characterize the mixed-version surfaces (**Contracts: Mixed versions during
  a deploy**) by kind -- IndexedDB databases and stores, localStorage and
  sessionStorage keys, BroadcastChannel message shapes, Web Lock names, and
  the web build's CacheStorage names -- with a test that a record written by
  one version is read correctly by the other. List the process-local caches
  as excluded, with the reason, so their absence is a decision rather than an
  oversight.
- Design `GuardianForms.testing` from the real inventory -- the names the
  browser suite reaches and every in-place write site -- before 70T starts.
- Record each browser and unit spec's assertion count (a parser count of
  `expect` calls) as the baseline 70T and every later delivery are compared
  against.

### Gate

70A is complete only when every legacy declaration has a disposition, the
audit catches a deliberately injected implicit global and a bare cross-boundary
reference, the cycle check catches a deliberately injected cycle, the ledger
guard fails on a deliberately unlisted `master` commit, the historical and
current format-v1 fixtures open successfully, the `portable-http` profile passes
its one bring-up run (D2) against the unmigrated build with its parity
assertions, and the unit suite rejects any unapproved
increase in the compatibility surface. The exact final facade is a
reviewed artifact of this delivery, not an open-ended promise to preserve all
current debugging habits.

### 70A build record (complete)

Approved by the requester on 2026-09-24 ("Approve, skip the regression":
70A starts without a full `npm test` on `master` first). Everything below is
on the `milestone-70` branch unless it says otherwise.

**Done, with evidence.**

| Item | Commit | Evidence |
| --- | --- | --- |
| Scoped AGENTS.md exception (D1), on `master` | `a9c9930` | The branch point. |
| Branch `milestone-70`, as a separate worktree | -- | Checked out at `D:\caernarvon-net-ms70` so the main folder stays on `master`: Codex commits in that folder, and a folder holds one branch. The drive is not NTFS, so the worktree has its own `npm ci` install. |
| Branch-only test ports | `add5403` | `playwright.config.ts` serves on 4331/4183/5183: `master` uses 4321/4173/5173 and reuses a server already listening, so with both worktrees in use a run could silently test the other's files. Restored at the merge (ledger, "Branch-only settings"). `startup.spec.ts` 7/7 on the new ports. |
| Master-fix ledger and guard | `add5403` | `MILESTONE-70-FIX-LEDGER.md`; `scripts/ms70-ledger-guard.mjs`. **Gate item: seen failing** against real history (branch point moved back to `9c61cbb`: all five later `master` commits reported unlisted); `ms70-ledger-guard.spec.js` 8/8. |
| Parser-based dependency audit and ratchet | `0f86677` | `scripts/ms70-dependency-audit.mjs`; `tests/baseline/ms70-dependency-{baseline,inventory}.json`. **Gate items: seen failing on the real tree** for an injected implicit global in `legacy-app.js`, a bare `esc()` call in `src/core/case-resolver.js`, and a two-way import between `state.js` and `case-resolver.js`, each restored; `ms70-dependency-ratchet.spec.js` 19/19. |
| Assertion-count baseline | `122d0e9` | `scripts/ms70-assertion-counts.mjs`; `tests/baseline/ms70-assertion-counts.json`. Seen failing on a real spec with one `expect` removed (15 to 14). |
| Browser-suite global inventory | `122d0e9` | `scripts/ms70-e2e-global-inventory.mjs`; `tests/baseline/ms70-e2e-globals.json` -- what `GuardianForms.testing` is designed from. |
| `portable-http` profile (T1), brought up | `02ecde4`, then the headers commit | `scripts/serve-portable-http.mjs`; `PG_TARGET=portable-http`; `npm run test:e2e:portable-http`; also part of `test:release` through the `all` profile. **Gate item: the one bring-up run (D2) 33/33, 0 skipped**, including the five ward-lock tests and the backup lock test the `file://` profile skips. The parity spec was seen failing for the stated reason with `dist/portable/fragments` removed. Production's headers then captured with the requester's go-ahead (one GET of `https://www.mypinellasclerk.gov/Portals/0/Guardian-Forms/index.html`, recorded in `tests/e2e/support/production-headers.json`), the profile moved to production's own `/Portals/0/Guardian-Forms/` path, and `Cache-Control`, `X-Frame-Options` and `X-XSS-Protection` replayed with HTML sent as plain `text/html`; rerun 33/33, and the header check seen failing with the replay removed. |
| Load-aware audit | `b9b5381` | The audit counts a module's `window.X` as a provider only if something loads that module, and ratchets the modules nothing loads (8). Seen failing against the previous baseline, naming exactly the nine new entries. |
| Declaration dispositions (draft) and computed lookups | `90bc235` | `scripts/ms70-declaration-dispositions.mjs`; `tests/baseline/ms70-declaration-dispositions.json`: all 474 declarations -- 459 move, 1 test-only, 14 delete-as-dead candidates -- each with a delivery, `reviewed: false`. The audit now records computed `window[...]` lookups and resolves the two known name builders; the first draft had wrongly proposed the seven `mount<Engine>Feature` functions as dead. |
| Window-export reasons | `e603bbe` | Every `window` publication with the files that actually read it: 109 read only by the monolith, 98 only by modules, 22 by both, 32 only by tests, 65 by nothing, 4 from a module nothing loads. |
| `GuardianForms` schema draft | `55366db` | `tests/baseline/ms70-testing-adapter-design.json`: production member `version` only (its consumer is support, given the year-long cache); 21 testing members (14 commands, 7 copy-only queries; 25, 18 commands, after the schema review below) covering all 163 names the browser suite reaches (158 when drafted; later specs added `_cryptoKey`, `_securityMode` and `decryptJSONWithKey`, all to the `persistenceState` query, and two harness globals), plus 19 to the real UI, 21 to unit imports and 12 harness globals. |
| Fixture-helper inventory | `a94649a` | `tests/baseline/ms70-fixture-inventory.json`: 12 support modules, 67 exports, 16 factories. Found: `window-api.ts`'s typed wrappers from Milestone 42C are used by no spec. |
| Per-delivery estimate | `ebd0041`, re-sized after the dispositions review | 58-95 days remaining after 70A; the table above. |
| Security contract | `f4f368b` | `tests/unit/crypto-contract.spec.js` 8/8 and `tests/e2e/security-contract.spec.ts` 3/3, each seen failing with the fault injected (iterations 100,000, a 16-byte IV, an extractable key; auto-lock at 14 minutes, lockout threshold 6, a stored copy of the password). |
| Year-rollover characterization | `42b1ae9` | `tests/e2e/year-rollover.characterization.spec.ts` 9/9 against `tests/baseline/ms70-year-rollover-golden.json`; seen failing on exactly the four accountings that carry a starting balance when it was carried plus 1. Findings below. |
| `.sav` corpus, historical and current | `a16da1a` | `scripts/ms70-sav-corpus.mjs`; 56 fixtures in `tests/fixtures/sav/` (28 checkpoints: one per milestone that changed a stored shape from 9/10, the 9/16, 9/22 and both 9/24 builds matched to their commits by the monolith's exact bytes, and the branch point; each writes a plain five-ward, nine-filing caseload with shared records and a password-protected case, with its own writer; 611 KB) and `corpus.json`. `tests/e2e/sav-corpus.characterization.spec.ts` 66/66 in 5.1 min against `tests/baseline/ms70-sav-corpus-golden.json`: every file opens through the startup screen with every filing and every stored value; all 56 are format version 1. **Gate item: the historical and current fixtures open.** Seen failing: a reader that adds one field to each loaded filing passed every explicit check and failed the golden (digest and per-filing key counts). Found: a damaged file opens silently without the filings it cannot read, and in Chrome and Edge the first auto-save then rewrites the original without them -- fixed on `master` in `b2d97f5` with Alan's approval (a ledger row); a file marked format version 2 opens as if it were 1 (recorded; no version 2 exists). |
| Mixed-version characterization | `db16eb3` | `tests/e2e/mixed-version.characterization.spec.ts` 15/15: the 9/24 evening build (`b28bf25`; `PG_MIXED_OLD_SHA` re-pins it at the merge gate) under `/old/` and this tree under `/new/` on one origin (`scripts/serve-portable-http.mjs` gained `mounts`). In both directions: terms, theme at load, default circuit, resuming the last filing and page, the other-tab warning naming the open filing, a dismissal surviving a reload into the other version, the filing lock, the first-run flag, and the recovery snapshot decrypted by the other version. `tests/baseline/ms70-shared-storage-golden.json` holds the shape of everything shared, which both versions must match. Seen failing: a renamed dismissal key in the new version failed both directions; an extra tab-message field failed the shape test. Excluded, with reasons in the spec: the remembered file handle (needs a user-driven picker), the web build's offline answer, update flag and service-worker caches (production runs the portable build), and process-local state. |
| Dispositions reviewed | `89b659f` | All 474 declarations reviewed by the owner (`tests/baseline/ms70-declaration-review.json`, applied by `scripts/ms70-declaration-dispositions.mjs`). The section rule placed 94 wrongly -- sections whose banner no longer describes what sits under them: the case-state roots (`caseFile`, `activeInventoryType` to 70J), the save pipeline and template loading (to 70I), sidebar and picker UI under the old router banner (to 70H), 26 form-field helpers left in the feature-bridge sections (to 70F), registry data and normalizers (to 70C) -- each override with its reason. `_visitedPages` is dead on both sides (a `let` is never a window property, so the three module references never run): delete-as-dead, 15 in all, each searched for by name across source, markup and tests. The per-delivery sizes above are re-derived from the reviewed placement: the same 6,230 lines, redistributed. **Gate item: every legacy declaration has a disposition** -- now reviewed, and `tests/unit/ms70-declaration-dispositions.spec.js` fails on any entry whose placement drifts from the review (seen failing on one drifted entry). |
| `GuardianForms` schema confirmed | this commit | The owner's review (`SCHEMA_REVIEW` in `scripts/ms70-testing-adapter-design.mjs`) confirms the one production member, `version` (read-only build identity for support, since production caches `index.html` for a year), and every testing member with its kind. It corrected the draft where a query would have had a side effect -- the adapter's rule is that a query is a copy: `updateNavDots`/`updateSidebar` redraw (now the `refreshStatus` command), `auditLog` appends (`recordActivity`), `saveBlobAs`/`exportGuardianDataZip`/`finishSingleWardExport` save or announce (`saveArchive`), and `doSavePdf*`/`doSaveExcel*` download (`saveOutput`). 25 members: 18 commands, 7 queries. Each name's destination stays `reviewed: false` until 70T proves it by converting the specs. Seen failing: an unconfirmed member, and `updateSidebar` back in a query. |

**Parsed figures that replace this plan's estimates.** The Verified planning
baseline's "Test coupling" row said its counts were text-search lower
bounds; the parsers put the real numbers higher, so 70T is larger than first
written:

- 112 of the 115 browser spec files reach application globals (not "about
  83"); `navigate` alone is used by 86 and `D` by 78.
- The browser suite reaches 158 distinct application names (Milestone 42C
  had listed 83).
- 237 in-place writes to live case state, in 42 files (not "at least 177 in
  at least 31"): 214 assignments, 17 `Object.assign`, 3 array mutators, 3
  root replacements; 16 computed `window[...]` accesses.
- 337 `window`/`globalThis` write sites (the regex audit's 319 missed the 13
  `Object.defineProperty` publications, among them `currentPage`, `D`,
  `caseFile` and `_cryptoKey`); 219 captures off `window` at load time, in 18
  files; 474 implicit globals, all in `legacy-app.js`.
- 50 bare cross-boundary references the old audit could not see: the
  monolith calls 47 module-published functions by bare name, and three
  modules call monolith functions by bare name with no `window.` anywhere
  (`formDisplayName` in annual-accounting, `saveData` in guardian-inventory,
  `updateNavDots` in simplified-accounting).
- 0 static import cycles and 0 layer violations today.
- The assertion baseline: 245 spec files, 6,098 static `expect` calls, 1,759
  test declarations at the time of `122d0e9` (that commit's message says
  "246" and "6,100+"; the recorded baseline is the authority).

**Findings -- production defects on `master`, reported, not fixed here.**
Each is present in the build deployed on 2026-09-24. Fixing one is `master`
work that needs the requester's go-ahead, and then joins the ledger.

1. **Annual Accounting import stops at the first ward percentage.** Importing
   an Annual workbook with a ward percentage on any of Schedules D-1 to D-5
   fails with "Import failed: r2 is not a function". The exporter writes a
   percentage as a fraction (50% as 0.5), so a plain export then re-import
   triggers it. `annual-accounting/excel.js` takes `r2` off `window`, but
   `legacy-app.js` declares it with `const`, which is not a window property.
   The importer writes into the open filing as it reads: in the reproduction
   the Cover's case number imported and D-1 came back empty, so the filing
   can be left half-imported. No existing test imports a ward percentage.
2. **Blank-card clean-up does not run at all** (characterized with the
   requester's go-ahead). The first reading -- the schedule table undefined
   -- was the smaller half. `src/core/form/prune-cards.js` is imported by
   nothing, so `window.pruneBlankCards` never exists and the router's and
   filing lifecycle's guarded calls are skipped for every card: schedule
   rows, party cards, plan rows. Milestone 42E (`a5b5b52`, 2026-09-13)
   deleted `legacy-app.js`'s copy as a "runtime-dead twin" of the module's;
   nothing imported the module then either, so the deleted copy was the only
   live one. Observed effects:
   - **Guardian Inventory -- blocks export.** A row added with **+ Add** on a
     schedule and left untouched (A-1 probed) survives leaving the page,
     marks A-1 unfinished, disables that schedule page's Next button, and
     fails export validation four times ("A-1 row 1 -- Property Description",
     "Street Address", "City/State/Zip", "Full Asset Value must be > 0"). A
     Guardian blank row is not empty -- the ward's share starts at 100 and the
     value at 0 -- so validation treats it as a started row. A filer who
     clicks **+ Add** by mistake cannot export until they find and remove a
     card they never touched.
   - **Annual Accounting -- a false "unfinished" mark.** An untouched
     Schedule A row survives and marks Schedule A unfinished; an untouched
     co-guardian card survives. Export is not blocked: Annual's blank rows
     are genuinely empty, so validation skips them.
   - The Plans' and other party cards (certificate recipients, witnesses,
     plan rows) lose the same clean-up; not probed one by one.
   **Fixed on `master`** with the requester's go-ahead (`b28bf25`, red
   first): `main.js` loads the module and `legacy-app.js` publishes the
   schedule table. Five tests -- eight failing runs -- written while the
   clean-up was not running (two from 51E, two from 57C-R, and this session's
   own 68C follow-up, which runs once per Plan) had assumed
   untouched cards survive a page change; each was updated to the restored
   design with its reason. Ledger row: re-implement.
3. **Two guarded calls to functions nothing defines** (characterized).
   - `window.isHelpPanelOpen`: the router falls back to reading the help
     panel's visibility and behaves correctly; `legacy-app.js`'s Preview &
     Export header has no fallback, so its help button is drawn with
     `aria-expanded="false"` while the help panel is open, until the next
     toggle. Lower impact than it first looked: since Milestone 48, "?"
     inside a filing opens the user guide for the current page rather than
     the panel (`shell-events.js`), so the panel can be open on Preview &
     Export only if it was left open from the dashboard. That is also why the
     probe's click opened no panel. Confirmed in the code; not reproduced.
   - `window.renderYearManagerBody`: the Year Manager dialog is dead code.
     Nothing calls `showYearManagerModal()`, and no `#yearManagerModal`
     element exists in the page or its fragment; filers see nothing. Year
     rollover runs through other code. A "delete as dead" disposition.
4. **Dead state.** `_visitedPages` is declared in `legacy-app.js` and written
   by the router and ward lifecycle through `window`, where it does not
   exist; nothing reads it. Harmless; a "delete as dead" disposition.

Item 1 is fixed on `master` (`945b5a8`, with the requester's go-ahead,
red first) and recorded in the ledger. Its test found a further defect,
reported, not fixed: the shared exporter's `percentValue()`
(`src/core/excel/excel-engine.js`) treats any value up to 1 as already a
fraction, so a ward share entered as 1% is written to the court workbook as
100% (0.5% as 50%). Cross-form, Guardian Inventory's importer rounds an
imported percentage to 6 decimals and returns a number where Annual's rounds
to 2 and returns text -- unresolved which is right.

5. **Production caches the application for a year.** The production server
   sends `index.html` -- 7.1 MB, holding nearly all of the application's code
   in the portable build -- with `Cache-Control: public,max-age=31536000`.
   With no service worker, a browser that has the page may run that copy
   without checking for a newer one for up to a year; a normal reload usually
   revalidates, but a filer returning through a bookmark may not see a deploy
   at all. This is hosting configuration on the county's IIS server, not code
   in this repository.

**Findings -- for this plan.**

- `vite.config.js` calls `dist/portable`'s copy of `fragments/` "unused at
  runtime". That is true only over `file://`. Over HTTP -- production -- the
  portable build fetches it; removing it would stop every fragment-backed
  dialog on the live site while the `file://` profile stayed green. The
  `portable-http` parity spec now guards it.
- **The audit now follows what is actually loaded.** A module's
  `window.X = ...` publishes X only if something loads that module; the regex
  audit behind Milestone 42E's twin deletions never checked, and neither did
  this milestone's first parser pass. The audit now walks the page's entry
  points through static and dynamic imports, counts providers only from
  loaded files, and ratchets the list of modules nothing loads: eight today
  -- `prune-cards.js` (finding 2), six `src/core/types/*.js` modules that hold
  type definitions for the type checker and are not meant to run, and
  `src/features/guardian-inventory/pdf-accessibility.js`, a one-line
  re-export nothing imports (the real module under `src/core/pdf/` loads
  normally; a "delete as dead" disposition).
- **Names built at runtime.** `router.js` and `ward-lifecycle.js` mount a
  filing through `window[mountFeatureFnName(engine)]`, and
  `readiness-config.js` reads tables through `legacyGlobal('NAME')`. A static
  scan that ignores computed lookups calls the seven mount functions dead --
  the dispositions draft's first pass did exactly that. The audit resolves
  both builders now and ratchets every other computed lookup (one remains,
  inside `legacyGlobal` itself). The lesson generalizes: a "delete as dead"
  disposition needs a reference search that covers names built at runtime,
  and each one is confirmed before anything is deleted.
- **The existing-duplicates list.** 36 monolith declarations share a name
  with something a module exports. About 22 are live duplicates -- both
  copies in use -- among them `esc`, `r2`, `getActiveWard`, `getCaseFile`,
  the county-to-circuit tables, `CRYPTO_VERIFIER_PLAINTEXT`, and the
  session-cache and launch-preference helpers; the list is in
  `summary.liveDuplicates` of the dispositions draft. The rest are dead
  monolith copies of module-owned names (the 14 delete-as-dead candidates
  are mostly these). 70B proves each live pair behaves the same before one
  copy goes; they are not assumed equal because they share a name.
- `window.navigate` has two publishers, `main.js` and `router.js`, which
  publish the same imported function: a duplicate publication, not a
  conflict. Recorded for the duplicate list.
- The mixed-version window is not "the minutes after a deploy". Because of
  finding 5, a filer can keep running a pre-merge copy of the application for
  as long as the cached page lasts, so the mixed-version contract has to hold
  for that long -- and a rollback may never reach a filer whose browser still
  holds the migrated copy. Unless production's caching changes, it belongs
  in the release packet (D8).
- The lock and unlock behavior pinned by the security contract is exactly
  what 70I moves: 5 failures, 30 seconds doubling to a 5-minute cap, a
  15-minute inactivity lock, and a lock that clears the key and the
  in-memory case.

**Before-migration measurements** (`tests/baseline/ms70-70A-*.json`, taken
at `daafcc1` with Chromium 151.0.7922.34 and Node v24.16.0; 70L repeats the same commands):

| Target | Application script bytes at start | Resources | Script time | Navigation | Heap after 5 route cycles |
| --- | --- | --- | --- | --- | --- |
| source | 1,060,618 | 91 | 20 ms | 994 ms | 6.0-6.2 MB |
| web | 4,206,132 | 36 | 53 ms | 874 ms | 6.0-6.2 MB |
| portable (`file://`) | 7,245,476 | 1 | 91 ms | 366 ms | 10.6-10.7 MB |
| portable-http | 7,245,476 | 5 | 80 ms | 703 ms | 10.6-10.7 MB |

No page or console error on any target. Lifecycle (20 mount/dispose cycles
per filing type): heap growth simplified-accounting 50, plan-simplified 24, plan-annual 49, plan-initial 44, plan-minor 29, annual-accounting 45, guardian-inventory 29, dashboard 80 KB; Milestone 13 measured 10-33 KB on the same
cycle, so growth is two to three times what it was -- small in absolute terms,
recorded as a fact to compare at 70L, not as a threshold. Two fixes to the
tools themselves: both scripts had to accept the terms screen before the page
loads (added after Milestone 13 wrote them; the lifecycle script could no
longer start, and the baseline script measured an app waiting on the terms
screen), and both gained `--output` so these records never overwrite
Milestone 13's.

**Year-rollover characterization**
(`tests/e2e/year-rollover.characterization.spec.ts`, golden
`tests/baseline/ms70-year-rollover-golden.json`). All nine filing identities
start a new year through the dashboard card's New year button and return
through Prior years; the golden records every field the new year changes
(98-352 per identity), the keys the archive leaves out, where the archive
differs from the year before, and whether the return restores the archive.
Red first: carrying the prior total plus 1 as the next starting balance
failed exactly the four accountings that carry one. Findings:

- Switching back restores exactly what was archived, for every identity.
- The archive is not byte-for-byte the year before. "Start new year"
  re-opens the filing first, and opening a Guardian Inventory or an
  accounting runs `sanitizeNegativeAmounts()` (money text becomes a number,
  "12.50" to 12.5 -- the same value the form stores when a filer types it)
  and `normalizeWardData()`'s migration of pre-tri-state booleans (`false` to
  `'No'`). Both are lossless and both are recorded, so 70G must keep them in
  the same order relative to the snapshot. The Plans archive unchanged.
  Traced with a setter trap on the live field.
- Fixture note for 70T: the Guardian baseline fixture
  (`tests/e2e/support/fixtures.ts`) still writes `hasSafeDepositBox: false`
  and `safeDepositBoxFiled: false`, the pre-tri-state booleans the UI no
  longer writes, so every spec built on `fillMinimalValidGuardianWard()`
  exercises the migration rather than the stored shape. Not changed here;
  it is a `master` fixture that many specs share.
- It found a `master` defect: the 1% ward-share fix (dbee60f) had missed
  each Schedule D line's ward amount on the Annual pages and in the PDF,
  which still used copies of the old rule. Fixed on `master` in c62f890
  (a ledger row, `re-implement`, because it deletes `legacy-app.js`'s
  `pct()`; the branch's declaration dispositions still list it).

**Per-delivery estimate (replaces the 45-70 day guess).** Sized from the
dispositions draft: the monolith lines each delivery takes on, the module
consumers it must migrate, and for 70T the browser suite's measured
coupling. Units are focused engineering days, the same unit as the original
figure; the ranges assume the slower rate for stateful code (lifecycle,
persistence, security, startup) and include each delivery's tests, index and
record updates, but not waiting on full-suite runs or approvals.

| Delivery | What it carries | Estimate (days) |
| --- | --- | --- |
| 70A | Complete, 2026-09-24 | -- |
| 70T | 116 browser spec files, 163 application names, 239 in-place state writes; 21 adapter members | 8-14 |
| 70B | 337 monolith lines (44 declarations), plus proving about 22 live duplicate pairs equal | 3-5 |
| 70C | 436 lines (35 declarations) plus the registry, factories, normalizers and the 16 fixture factories | 3-6 |
| 70D | 584 lines -- `computeNavChecks()` alone is 504 -- with old/new differential parity on every fixture | 3-5 |
| 70E | 42 lines (9 declarations), but every module reading case state moves to the store seam (the active filing is read by 41 files) | 4-7 |
| 70F | 1,218 lines (71 declarations: form binding, the form-field markup helpers left in the feature-bridge sections, validation panels, schedule documents, preview paging) and the dispatchers' teardown | 7-10 |
| 70G | 1,189 lines (82 declarations) of filing lifecycle, conversion, carry-over, year rollover and shared records | 7-11 |
| 70H | 1,241 lines (93 declarations) of shell, sidebar, pickers, help, tours, activity and dialogs -- now the largest | 6-10 |
| 70I | 880 lines (83 declarations) of persistence, saving, templates, security and startup, with the golden archives and mixed-version tests | 7-10 |
| 70J | The ownership flip and its fault injection; the `caseFile` and `activeInventoryType` declarations go here | 3-5 |
| 70K | 293 lines (48 declarations) of router state, feature bridges and bootstrap, the 18 files that capture globals at load, and the namespace | 5-8 |
| 70L | Deleting the monolith, the release evidence and the merge gate | 2-4 |
| **Total (remaining)** | | **58-95** |

The range is higher than the first guess because 70T did not exist then and
the browser suite's coupling turned out larger than estimated. It excludes
the end-of-branch reconstitution of `master` fixes (D1): four ledger rows so
far, two of them `re-implement`, and the cost per row depends on what each
fix touches, so the ledger is the running measure of it.

**70A is complete.** Its gate, item by item:
- every legacy declaration has a disposition -- all 474, reviewed, and a
  drifted or new entry fails (`ms70-declaration-dispositions.spec.js`);
- the audit catches an injected implicit global and a bare cross-boundary
  reference, and the cycle check an injected cycle -- each seen failing on
  the real tree (`0f86677`);
- the ledger guard fails on an unlisted `master` commit -- seen failing
  (`add5403`); it reports 6 commits since the branch point, 0 unlisted, 3 to
  re-implement;
- the historical and current format-v1 fixtures open -- 56 fixtures from 28
  versions (`a16da1a`);
- the `portable-http` profile passed its one bring-up run with its parity
  assertions (`02ecde4`);
- the unit suite rejects an unapproved increase in the compatibility surface
  (the dependency ratchet); the branch's unit suite is 1,861/1,861.
The `GuardianForms` facade is the reviewed artifact the gate asks for: one
production member, `version`, and 25 testing members. The full browser suite
has not been run on the branch.

---

## 70T — Test adapter and browser-suite migration

### Why it is its own delivery

The browser suite is the evidence behind this milestone's central promise:
a filer observes no change. About 83 of its 115 spec files reach into globals
the migration deletes. The original plan rewrote them in 70K, alongside the
router and bootstrap. That would change the proof and the thing being proved
in the same delivery, so a spec that quietly lost an assertion would go green
exactly when it matters most. 70T moves every spec onto a stable adapter
**before** any production code moves, and proves the rewritten suite green
against the unmigrated monolith.

### Work

- Implement `GuardianForms.testing` first as a thin adapter over **today's**
  globals, enabled per D3. Commands are validated and named:
  - seed or import a case; create, activate and delete a filing;
  - `patchFiling(patch)`, with today's semantics -- assign in place, then save,
    exactly what specs do now with `Object.assign(w.D, patch); w.autoSave()`.
    **Setup only (D9):** it may arrange a test's starting data and nothing
    else, because it bypasses the normalization, side effects and validation
    a real edit triggers;
  - `setField(path, value)`, through the real form write path. Any test whose
    result depends on what an edit triggers -- normalization, sidebar marks,
    saving, validation -- makes that edit through `setField()` or the real
    UI;
  - navigate; flush a pending save.

  Queries return copies: the case snapshot, the active filing, validation
  issues per filing type, the sidebar check map, readiness. The adapter never
  returns a live object or key material.
- Move the browser test support layer onto the adapter first --
  `window-api.ts`, `target.ts`, the fixtures, `fixture-completeness.ts`,
  `plan-fixture.ts` -- so most specs change through their helpers rather than
  line by line.
- Migrate the remaining specs file by file, classifying each data write as
  setup or behavior (D9) and recording the classification. A write moved from
  a raw patch to `setField()` may make a test fail that passed before: that is
  a finding about today's test, reported and resolved, never suppressed. Each
  converted spec keeps or raises its 70A assertion count, and any drop is
  reviewed and recorded with its reason -- but the count is a tripwire, not
  proof that a converted test still means what it meant. That proof is the
  classification review plus the suite passing against the unmigrated
  monolith. Controls whose behavior is under test are still clicked for
  real.
- Add a guard: a browser spec may reference no app global other than
  `GuardianForms`. Converted files join the guard as they land until it covers
  the whole suite.
- From here on only the adapter's **internals** follow the migration -- the
  store seam in 70E, the owner flip in 70J, the router in 70K. The specs do not
  change again.

### Gate

Every browser spec reaches app state only through `GuardianForms.testing` or
the real UI; every data write in a converted spec is classified as setup or
behavior (D9); no spec lost an assertion without a recorded reason; and the
whole source suite is green on the adapter against the **unmigrated**
monolith -- a full `npm test`, so it is requested from the requester at the
time, per AGENTS.md section 2. A later failure then points at the migration,
not at the test rewrite. `npm run check:types` covers the adapter's types, which live in the
checked `tests/e2e/support/` scope.

### 70T build record

Approved by the requester on 2026-09-24 ("Baseline run, then 70T"). On
2026-09-25 the requester asked for the delivery to continue on the owner's
own recommendations, with defects fixed as they are found and both indexes
kept current; the full `npm test` this gate asks for is run under that
instruction. Everything below is on the `milestone-70` branch unless it says
otherwise.

**Baseline, before any spec changed.** The branch at `1a8c54c`, full
`npm test`: unit 1861/1861 (135 files); browser 916 passed, 7 skipped, 0
failed (1.8 h, source profile, chromium).

**Done, with evidence.**

| Item | Evidence |
| --- | --- |
| Commit | `e9b8251` (the whole delivery, gate evidence in its message). |
| `GuardianForms.testing` | `src/core/testing/testing-adapter.js`, installed first thing in `src/main.js` only when the runner sets `__GUARDIAN_FORMS_TEST_MODE__` before boot (read once, deleted; D3, T3). Queries return copies; commands call today's functions. `tests/unit/testing-adapter.spec.js` (18 tests; the copy and enablement rules each seen failing) and `tests/e2e/testing-adapter.spec.ts` (4, in a real page). |
| Members added while converting | `patchFiling(patch, filingId)` for filings that are not open; `replaceFiling()` (setup that deletes keys); `seedFiling()` (a record added without opening it, the open filing kept the same object); `save.markClean()`; `validate.open/structured/exportGate` (the export gate judged on a copy, since `prepareFilingOutput()` commits date drafts into what it is given); `status.annualTotals/guardianTotals/annualReconcile`; `createFiling.emptyDirective()`; `convertFiling.openDialog/targetsFor/describe`; `updateSharedRecords.mergeParties`; `sharedRecords.isPartyPairDismissed`. Removed: `commitCoverCounty`, which the reviewed design classes real-UI -- setup chooses the county on the Cover (`chooseCoverCounty()` in `target.ts`). |
| The browser suite | All 133 browser spec and support files reach the app only through `GuardianForms.testing` or the real UI. The one exemption, `tests/e2e/support/pre-70-build.ts`, drives the mixed-version characterization's pre-70 build, which has no `GuardianForms`; its reason and its single permitted importer are checked. |
| Guard | `tests/unit/ms70-70T-guard.spec.js`: no converted file names another app global -- through `window`, an alias of it, or bare -- writes live case state in place, writes into anything the adapter returned, or looks a global up by computed name; every browser file is converted or exempt. Each rule seen failing: bare `caseFile` in three mount specs, a restored write into a copy, a new uncovered spec. The bare-name and copy-write rules were added during 70T, after both defects were found in files already counted as converted. |
| Moved to unit specs | `case-resolver.spec.js` and `party-resolver.spec.js` (26 of 29 tests; pure logic whose identity checks copies cannot show), `fragment-loader.spec.js`, `attorney-block.spec.js`, `removed-window-bridges.spec.js` (three browser pins that deleted bridges stay deleted), `saveBlobAs()`'s contract in `case-file.spec.js`, Slice 19E's one-calculator claim in `annual-accounting-totals.spec.js`. Each seen failing under a mutation. |
| Assertion counts | Every drop is in the drop log of `tests/baseline/ms70-assertion-counts.json` with where the assertions went. |
| Findings | 24 (three from the gate run below), each with its resolution, in `tests/baseline/ms70-70T-progress.json`: among them seven sidebar checks that could never fail (`/complete/` also matches `incomplete`), a caption check against a function nothing calls, a validator chosen by load order, two tests on schedule keys no page renders, a converted test whose setup wrote into a copy, and tests of a dialog and a function no button reaches. |
| Design record | `tests/baseline/ms70-testing-adapter-design.json` regenerated; its spec now requires it to equal what the rules produce (it had kept two superseded rule sets unnoticed). |

**Fixed on `master` during 70T** (each in the ledger): `8f5a163` the vacuous
sidebar checks; `5de3707` ward names in a locked case file's manifest, and
newer-format case files refused; `ae9ecdc` what "?" announces inside a
filing; `6a8224d` the fragments comment; `56ff26a` the fixture's
safe-deposit answers.

**Handed to 70B as delete-as-dead** (no filer can reach them; the tests that
did now go through the real UI or were dropped with a reason):
`circuitCourtCaption()` in `legacy-app.js`; the Rename Ward dialog,
`showRenameWardModal()` and the shell and dashboard `rename-ward` cases (no
button since `e5fb9cf`); `triggerImportZip()` (no button since `4cd5723`).

**Gate run.** The full `npm test` on this tree, 2026-09-25: unit 1942/1942 (142 files);
browser 880 passed, 7 skipped, 6 failed (1.5 h, source profile, chromium) --
893 tests against the baseline's 923: 34 moved to unit specs or dropped with a
reason, 4 added. All six failures were defects in this delivery's own
conversions, none in the app, each recorded as a finding: a control step
clicking under the supporting-documentation prompt (guardian-inventory-mount),
seeded file records the app rightly rejected once the section was rendered
(schedule-docs-period-key), and a batch-2 setup that wrote into a copy it never
wrote back (signature-block-address-margin, four tests) -- the last now a guard
rule, seen failing on that defect. After the fixes the three spec files and the
adapter's own spec ran in full: 26/26. The whole source suite is green on the
adapter against the unmigrated monolith; 70T is complete.

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

### 70B build record

Approved by the requester on 2026-09-25, together with every later delivery
("Finish ms 70. That means ms 70B and every other after until it's done."),
to run in order on the plan owner's recommendations with defects fixed as they
are found. Everything below is on the `milestone-70` branch.

**What a filer sees.** Nothing, by design: every helper that moved produces
the same text, number and markup it did. The deleted code was unreachable --
the Rename Ward dialog has had no button since the Milestone 36 dashboard
consolidation (`e5fb9cf`), the ZIP-import path none since Milestone 41B
(`4cd5723`), and the monolith's court-caption helper and its copies of the
county-to-circuit tables were never called.

**Done, with evidence.**

| Item | Evidence |
| --- | --- |
| Commit | `4d0a603` (the whole delivery, gate evidence in its message). |
| Moved | 44 declarations, 612 monolith lines out and 65 in (net 547). Destinations, preferring existing modules: `esc()` to `src/core/filing/escape-html.js`; `guardianHasAnyData()` to `src/core/validation/row-started.js`; the field formatters and filters (phone, SSN, case and bar numbers, account and check numbers, name, address, the decimal filters, the ZIP digit cap, `capitalizeImportedFields()`) to `src/core/form/form-contract.js`; `FL_COUNTIES` to `src/core/pdf/circuit-lookup.js`; `calc` to `src/features/guardian-inventory/totals.js`. New where nothing fitted: `src/core/ui/icons.js`, `src/core/format/money.js` (`n`, `r2`, `fmt`, `formatDashboardCurrency`), `src/core/security/input-hardening.js`, `src/features/simplified-accounting/totals.js` (`calcTotals()`, kept out of the lazy feature for the dashboard). |
| Duplicates proven before one copy went | `formatDisplayDate()` identical to `src/core/form/date-parser.js`'s; `sanitizeForExcel()` equal to `excel-engine.js`'s `sanitizeCellValue()` for strings, the only thing its one caller passes, so the module's body is now the one guard; the monolith's `r2`, Guardian Inventory's and Annual import's local copy (master `945b5a8`) the same formula for the numbers they pass; the county-to-circuit tables and `circuitForCounty()` byte-identical to `circuit-lookup.js`'s and unreferenced. Not equal, so both kept: `esc()` prints a falsy value as empty, `escapeHtml()` does not -- the note in `escape-html.js` says so. |
| Deleted as unreachable | `circuitCourtCaption()`, the monolith's `hasSixthCircuitLocalGuidance()` copy, the Rename Ward dialog (`showRenameWardModal()`, `doRenameWard()`, `renameWard()`, its markup in `fragments/common-modals.html` and the shell, dashboard and dialog `rename-ward` cases), `triggerImportZip()` and the shell's change handler for the `zip-import-input` element deleted in 41B; `window.makeGuardianCalc` (no reader), and the "is it on window yet?" fallbacks the modules kept for helpers an import cannot lack (`form-fields.js`'s lock icon, `router.js`'s home and theme icons, `pdf-annotate.js`'s delete icons, `case-file.js`'s import check). Two destructured-but-unused `formatCityStateZip` reads went with them. |
| The bridge | `src/legacy-bridge.js`: a frozen `window.GuardianFormsLegacyBridge` of imported implementations, imported by `main.js` before `initApp()`. The monolith keeps a one-line wrapper per moved function it still calls (21: `function esc(s){return window.GuardianFormsLegacyBridge.esc(s);}`, a `fmt` arrow, a `calc` Proxy) and reads the one data member (`FL_COUNTIES`) inside the function that uses it. `tests/unit/legacy-bridge.spec.js` holds its rules -- members are module exports (identity-checked), read only by the monolith and only inside functions, only through one-line wrappers that are still called; red first, an injected top-level read and a mid-function call each failed it, and a wrapper given extra logic failed it. |
| Ratchet exception | The bridge's one `windowWrites` entry (`src/legacy-bridge.js::GuardianFormsLegacyBridge`) and one `windowReads` entry (`src/legacy-app.js::GuardianFormsLegacyBridge`) are the exception this plan records for the transition; both go with the monolith in 70L. Everything else fell: `classicDeclarations` 474 to 449, `windowWrites` 330 to 325, `windowReads` 678 to 583, `evalTimeWindowDestructures` 218 to 154, `bareCrossBoundary` 50 to 49. |
| Wrapper deletion targets | The declaration inventory gains a `wrapper` disposition: an implementation that moved, leaving its wrapper, with `movedIn` and a deletion target computed from the deliveries of the monolith code that still calls it (for example `formatPhone` and ten other field helpers go with `bindForms()` in 70F, `guardianHasAnyData` with `computeNavChecks()` in 70D). The owner's review records what left the monolith under `landed`. |
| Module consumers | Every module that read a moved helper off `window` imports it (18 files); 64 of the `const { ... } = window` reads evaluated at load went with them. |
| Tests converted | `bar-number.spec.js` imports instead of slicing the monolith; `excel-engine.spec.js` tests the one guard directly (5 assertions fewer: the two-copy comparison, in the drop log); `guardian-inventory-totals.spec.js` tests the imported `calc` and the monolith's one-line Proxy; `form-contract.spec.js` and `excel-capacity-issues.spec.js` no longer install window stand-ins; `window-bridge.spec.js`'s real-file examples moved to names still read off window. |
| Findings | (1) `form-cards.spec.js` checked a Case Number the browser would render as `26-000123`: in Node the formatter was a missing window global, so the test saw raw text the app never shows; it now uses a stored value. (2) The shell kept a change handler for an element deleted in 41B, and two features destructured `formatCityStateZip` without using it. (3) `excel-engine.spec.js` compared two copies of one rule by reading the monolith's regex out of its source; with one copy left it tests the rule. |
| Parser audit count | The promise was the 44 declarations; 21 of their names stay in the monolith as one-line wrappers until their last caller moves, so `classicDeclarations` fell by 25, not 44 (474 to 449, with the two Rename Ward functions 70T handed over). Every wrapper's deletion target is in the inventory. |
| Living references | `README.md`'s layout, `AGENTS.md` section 6's icon line (it named an `icons.js` that did not exist until now), and every source comment naming a moved helper's old home. |

**Gate run.** The full `npm test` on this tree, 2026-09-25: unit 1949/1949 (143 files); browser 887 passed, 7 skipped, 0 failed (1.4 h, source profile, chromium) -- 894 tests: 70T's 893 plus the one master carried in `299e17a`. `check:types` clean.

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

### 70C build record

Approved with every later delivery on 2026-09-25 (see Status). Everything
below is on the `milestone-70` branch.

**What a filer sees.** One thing changes, and it is a fix carried from
`master`: a card or row the filer added with +Add and never touched is removed
again when they leave the page (master `b28bf25`). On the branch that clean-up
had never run -- nothing loaded the module -- so an untouched Initial Inventory
schedule row stayed, marked its schedule unfinished and blocked export with
four "row 1" errors. Everything else is identical: every filing type starts
with the same blank filing, normalizes an older saved filing the same way, and
routes to the same pages.

**Done, with evidence.**

| Item | Evidence |
| --- | --- |
| Commit | `9b0fd6c` (the whole delivery, gate evidence in its message). |
| The registry | `src/core/filing/filing-registry.js`: each of the nine identities with its engine (Final and Trust are the Annual engine under their own names), name and description (`INVENTORY_TYPES`), dashboard look (`INVENTORY_TYPE_META`, `typeIcon()`), page list (`FILING_PAGES`), blank filing (`initializeEmptyData()`), normalizer and feature mount, as `FILING_REGISTRY`, built on `filing-descriptor.js`'s `FILING_TYPE_KEYS`. Its whole static import graph stays out of `src/features`, the output libraries and the PDF-building code (checked by the spec). |
| Per-engine models | `src/core/filing/models/`: `guardian.js`, `simplified.js`, `annual.js` (one model for Annual, Final and Trust), `plan-simplified.js`, `plan-annual.js`, `plan-initial.js`, `plan-minor.js`, and `plan-rows.js` for the rows the four Plans share. Form-specific row factories stay separate; nothing generic was invented. The blank-filing factories left `src/core/state.js`, which no longer reaches back into window for the Plan lists and rows. |
| Normalizer | `src/core/filing/normalize-filing.js` (`normalizeWardData()`); `setD()` imports it instead of calling a window global. |
| Moved | 26 declarations and the page lists (`PAGES`, `PAGES_*`), which the review had placed in 70K by their section; they are the registry's route metadata, so 70C took them and the review records why. `BLANK_CARD_COLLECTIONS` was dead (prune-cards.js keeps its own, diverged table) and went. legacy-app.js -780/+49 lines, state.js -438/+9. 15 functions the monolith still calls keep a one-line wrapper, each with its deletion target. |
| Proven equal | `tests/baseline/ms70-70C-filing-shapes.json`, captured from the 70B tree before anything moved (the declarations sliced out and run with state.js loaded as the app loads it): all nine blank filings, the normalizer twice equal to once, engines, names, looks, page lists, every row factory and list. `tests/unit/filing-registry.spec.js` (34 tests) requires the moved modules to reproduce every value, key order ignored; red first, a changed Schedule C row failed it. |
| Stays | `setAccountingFilingType()` assigns the monolith's own `let activeInventoryType`, which no module can; its pure half is already `applyAccountingFilingType()`. Review override to 70J with that reason. |
| Carried from master | `b28bf25`, re-implemented rather than merged: the router and the dashboard entry import `pruneBlankCards()`, and `prune-cards.js` owns the schedule table it compares against (it read `window.BLANK_SCHEDULE_ENTRY`, which on the branch no one published). Its test changes came across converted to `GuardianForms.testing`: the new `blank-card-pruning.spec.ts` (four of master's five cases; the fifth checked that `window.pruneBlankCards` exists, and the function is imported now) and the three updated specs. The clean-up now judges a filing by its own `inventoryType` instead of `window.activeInventoryType`, the same value for the open filing it is given. |
| Module consumers | 20 modules import the registry and models instead of reading window (among them `readiness-config.js`'s Plan lists, which it read by computed name, and the test adapter's reference lists and blank filings). Ratchet: `classicDeclarations` 449 to 423, `windowWrites` 325 to 300, `windowReads` 583 to 524, `evalTimeWindowDestructures` 154 to 139, `bareCrossBoundary` 49 to 48, `unownedWindowReads` 3 to 2, `lexicalOnlyWindowReads` 3 to 2, `computedWindowReads` 1 to 0, `unreachableModules` 8 to 7 (prune-cards.js is loaded). |
| Fixtures and factories | The browser suite's fixture overlays are merged over `initializeEmptyData()`, whose output is unchanged value for value, so none needed a change. The unit specs that stubbed the Plan lists and rows on window now run the real factories (`filing-county-defaults.spec.js` gains `emptyDataGuardian()`, which it could not reach before), and `guardian-inventory-yes-no-radio.spec.js` calls the Inventory factories instead of grepping the monolith's source. Two specs (`guardian-inventory-64a1-validation`, `preparer-flag-validation`) keep hand-written Inventory shapes holding only what their validator reads; they are not blank filings and were left as they are. |
| Findings | (1) The blank-card clean-up never ran on the branch (above). (2) The normalizer's acknowledgement step imported one pure helper from `supplemental-pdf.js`, so the registry pulled in the PDF-appending code and the pdf.js loader; `resolveActiveDocPeriod()` moved to `src/core/filing/doc-period.js`, re-exported where it was. `check:types` found it: the navigation modules now reach the registry. (3) In Node the Plan PDF models printed empty rights, daily-living and benefit tables, because the lists were window globals; `plan-tristate.spec.js` had stubbed a two-entry list, and now checks the real one. (4) The rewire left `typeof window !== 'undefined' && X` guards around imported lists in six files; each is now the plain import. (5) `year-rollover.characterization.spec.ts` (70A) had recorded the branch without the clean-up: the gate failed its Simplified and Plan for Minors records, which differed only by blank rows -- the Simplified fixture's two blank certificate recipients and the Plan's blank residence row, now removed when the test leaves the page. Master calls the same clean-up at the same two points with the same card rules, so those two records were regenerated with the reason in the golden's note; the other seven were unchanged. |

**Gate run.** The full `npm test` on this tree, 2026-09-25: unit 1986/1986 (144 files); browser 893 passed, 7 skipped, 2 failed (1.6 h, source profile, chromium) -- 902 tests: 70B's 894, `blank-card-pruning.spec.ts`'s four and the four `plan-certificate-of-service.spec.ts` cases master's `b28bf25` added. The two failures were `year-rollover.characterization.spec.ts`'s Simplified and Plan for Minors records (finding 5); with those two regenerated the spec passed 9/9. `check:types` clean.

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
- Update AGENTS.md section 4, which locates the sidebar-versus-export rule in
  `computeNavChecks()` in `legacy-app.js`, in the same commit that moves that
  code. The rule's substance and its Clerk-practice rationale do not change;
  only where it lives does.

### Gate

Old and new completion maps and percentages match across all fixture factories,
edge cases, and filing identities before the old dispatcher is removed. Tests
explicitly pin the intentional Annual blank-schedule rule: sidebar incomplete,
export still permitted where the court form and current accepted practice allow
it. Readiness remains a separate export-linked surface.

### 70D build record

Approved with every later delivery on 2026-09-25 (see Status). Everything
below is on the `milestone-70` branch.

**What a filer sees.** Nothing, by design. Every sidebar mark and every
dashboard percentage is computed by the same rules as before, now held in one
module per form. The dashboard no longer points the open filing at each card's
filing in turn to measure its progress; the rules are handed the filing they
measure (its headline totals still do, until 70K).

**Done, with evidence.**

| Item | Evidence |
| --- | --- |
| Commit | Named in the next docs commit (the whole delivery; gate evidence in its message). |
| The evaluators | `src/core/status/completion.js`: `computeNavChecks()`'s seven branches as one pure evaluator per engine (`guardianCompletion()` through `planMinorCompletion()`), each taking the filing and what it cannot import and returning the same `{ checks, incomplete }` map. The branch bodies moved as text; each global they read is now an import (the Plan lists, the row, signature, attorney, preparer and certificate rules) or is handed in: the Initial Inventory's validator, `errorRoute()` and the Annual totals and reconciliation. A missing validator still returns `null`, never a pass. |
| In the registry | Each of the nine identities carries its engine's evaluator (`FILING_REGISTRY[type].completion`; Final and Trust the Annual one), and the registry dispatches: `computeCompletion(filing, type, deps)` and `filingProgress(filing, deps)`. An unopened filing's progress needs no feature pack; the registry's import graph still stays out of `src/features`. |
| The monolith | `computeNavChecks()` and `getWardProgress()` are one-line wrappers handing the registry the open filing (or the one measured), the monolith's own `activeInventoryType`, and the dependencies above -- inline, since a helper would have been a new classic declaration. `getWardProgress()` no longer swaps `window.D` and the active type. `SCHEDULE_NAV_KEYS` moved to `src/core/filing/models/guardian.js`. `legacy-app.js` -539/+21 lines. |
| Consumers | The Simplified, Plan and Annual features import their own engine's evaluator instead of calling `window.computeNavChecks()`; the Initial Inventory feature imports `SCHEDULE_NAV_KEYS` instead of copying it off `window`, and `validateGuardian(d = window.D)` judges the filing it is handed. The dashboard still reaches progress through `getWardProgress()`, which is how the Inventory validator (loaded with its feature) and `errorRoute()` (70F) are handed in; the review names 70K, with `getWardHeadlineTotal()`, as when that read goes (override `dispatcher`, `until: 70K`). |
| Went with their reader | The monolith's `guardianHasAnyData()` wrapper and `validate()`, whose last caller was `computeNavChecks()`; four Plan lists on the bridge; and eight `window` publications that existed only for it -- `isSignatureComplete`, `isPlanInitialAttorneyStarted`, `rowStarted`, `startedRows`, `serviceRecipientIssues`, `recipientRowStarted`, `resolvePreparer`, `planCertificateStarted` -- with `main.js`'s imports that made three of them eager (the registry loads them now). |
| Proven equal | `tests/unit/completion-parity.spec.js` runs the pre-70D `computeNavChecks()` and `getWardProgress()` (frozen in `tests/baseline/ms70-70D-nav-checks-before.js.txt`, the app's real implementations handed in) against the registry on all nine identities: each blank and normalized filing, the browser suite's minimal valid filings, a saturated filing and every answer in it cleared one at a time, rows emptied, started or filled, and every "no items" box ticked -- 4,803 filings. Every map and every percentage equal, and no evaluator changes its filing; progress is measured with the open filing left on another. Red first: three deliberate breaks each failed it for its own reason -- the Annual reconciliation reading the open filing's explanation (a measured filing's progress fell from 42% to 38%), Plan for Minors' pm-p7 without the preparer's name, and Plan Initial's pi-p10 inverted. |
| The Annual rule, pinned | AGENTS.md section 4's rule is pinned in the browser (`annual-schedule-consistency.spec.ts`): with every schedule blank and none declared empty, the sidebar marks all fourteen unfinished and export is still allowed; with Part XI unanswered both stop. Red first: an export rule demanding a Schedule A row failed it ("export must not demand a blank schedule"). |
| Stays for 70F | The functions that apply the map to the page -- `updateNavDots()`, `applyNavChecks()`, `pageCompleteness()`, `isScheduleIncomplete()`, `updateCurrentScheduleNextButton()` -- are the "nav-dot updates" the plan gives 70F, with the section collapse and progress summary they call (review override `nav-dom`). |
| Ratchet | `classicDeclarations` 423 to 420, `windowWrites` 300 to 291, `windowReads` 524 to 511, `evalTimeWindowDestructures` 139 to 138; nothing grew. |
| Tests converted | `checklist-export-parity.spec.js` finds the evaluators by parsing `completion.js` (a text search stopped at their `deps = {}` default); `schedule-doc-ack.spec.js` reads the evaluators whole; `content-corrections.spec.js`'s note points at them; three Inventory validator specs stop stubbing `window.SCHEDULE_NAV_KEYS`, and two Plan specs their Plan lists; `legacy-bridge.spec.js` names the two wrappers that hand over monolith state and keeps a wrapper no monolith code calls only while a module the ratchet lists still reads it; the registry spec checks each identity's evaluator. One assertion went with its subject (`plan-certificate-of-service.spec.js`'s check of the `window` publication), recorded in the assertion baseline. |
| Findings | (1) Carrying the dashboard's progress off the `window.D` swap exposed a reader the swap had hidden: `annualReconcileState(t)` takes its explanation from `window.D`, so a filing measured while another is open was judged by the open one's explanation; the evaluator hands the measured filing in. (2) The declaration inventory computed a wrapper's deletion target from its monolith callers only, so a dispatcher kept for a module would have read as due at once; an override's `until` now names it. (3) Eight `window` publications, three eager imports in `main.js` and four bridge members outlived their one reader, found by the audit and removed. |
| Living references | AGENTS.md section 4 names `annualCompletion()` in `src/core/status/completion.js`, reached through `legacy-app.js`'s `computeNavChecks()` dispatcher; the rule and its Clerk-practice rationale are unchanged. |

**Gate run.** The full `npm test` on this tree, 2026-09-25: unit 1989/1989 (145 files); browser 896 passed, 7 skipped, 0 failed (1.7 h, source profile, chromium) -- 903 tests: 70C's 902 and the Annual blank-schedule pin. `check:types` clean.

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
for approval to run `npm run test:verify` at this checkpoint. As a checkpoint
(D2) it also runs the shipped-build profiles: `build:portable` with the
`portable` and `portable-http` profiles, and `build:web` with its profile. The
mixed-version tests from 70A run here, because 70I moves the owners of the
shared recovery cache and launch preferences. The master-fix ledger is
reviewed here too (D7): if it holds 10 or more rows marked "re-implement",
`master` is merged into the branch at this checkpoint.

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
This checkpoint also warrants requester approval for a full verification tier,
and runs the shipped-build profiles (D2), including `portable-http`.

Decided (D4): no tester pause follows. 70J is a one-way door: once 70K builds
on it, it cannot be reverted on its own, so this gate is the last point at
which to stop.

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
  (or replace it with an equally visible registry). The portable build, whose
  application code `vite-plugin-singlefile` inlines into `index.html`, must
  still discover and inline the lazy feature graphs; a runtime `file://`
  module request is not an acceptable substitute. Inlined is not the same as
  evaluated: today a filing's feature code sits in the portable page from the
  start but does not run until that filing opens (checked 2026-09-24 over
  `file://`: no Plan, Annual or Inventory validator exists at startup), and
  that deferred evaluation is part of the lazy boundary to keep.
- Create `startGuardianForms(services)` and call it directly from `main.js`
  after the terms gate. No `window.initApp` boot-order contract remains.
- Install the reviewed, frozen `window.GuardianForms` namespace in its final
  form. 70T introduced the namespace early with only its testing member,
  enabled per D3; 70K freezes the whole reviewed schema.
- Point the testing adapter's internals at the router and bootstrap. The specs
  themselves moved in 70T and do not change here.
- Delete the temporary unnamespaced `D`/`caseFile` compatibility getters; no
  browser spec has used them since 70T.
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
  with console and page-error capture, and run the `portable-http` profile
  against the same build.
- Remove the scoped AGENTS.md branch exception (D1) in the merge, and follow
  **Reconstitution and merge** for the ledger, the merge gate and the
  deployment zip.

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
| Packaging | startup, offline/PWA, feature-load failure, archive roundtrip, backup, and lock scenarios under source/web/portable profiles and the new `portable-http` production-parity profile, followed by literal portable smoke |

These names are a planning map, not permission to copy a stale command list.
Each delivery must use `TEST-INDEX.md` to select the current exact specs.

### Known legacy-coupled test migrations

70A must regenerate this inventory with a parser, but scoping (rechecked
2026-09-24) already found these concrete groups:

- tests that extract and evaluate a legacy function or closure:
  `bar-number.spec.js`, `cell-reader.spec.js`,
  `checklist-export-parity.spec.js`, `comment-card-hide.spec.js`,
  `form-fields-legacy-delegation.spec.js`, `form-write-side-effects.spec.js`,
  `guardian-inventory-date-roundtrip.spec.js`,
  `guardian-inventory-totals.spec.js`, `part-xi-remuneration.spec.js`, and
  `schedule-doc-ack.spec.js`;
- tests that read `legacy-app.js` to pin a factory, boot workaround, duplicate-
  code guard, content correction, or retired behavior: `boot-ordering.spec.js`,
  `case-file.spec.js`, `content-corrections.spec.js`,
  `date-range-no-mutation.spec.js`, `date-truncation-helpers.spec.js`,
  `excel-engine.spec.js`, `filing-type-enumeration-guard.spec.js`,
  `form-fields.spec.js`, `guardian-inventory-yes-no-radio.spec.js`,
  `guided-tour-content.spec.js`, `help-guide-pdf-orphan.spec.js`,
  `theme-persistence.spec.js`, `user-guide-drift-guard.spec.js`, and
  `yes-no-radio-migration.spec.js`;
- tests that carry **hand-copied mirrors** of monolith code:
  `form-contract.spec.js` ("verbatim copies of legacy-app.js's helpers"),
  `guardian-inventory-64a1-validation.spec.js` (the `SCHEDULE_NAV_KEYS`
  literal, cited by line number, and the `emptyDataGuardian()` shape), and
  `preparer-flag-validation.spec.js` (the `emptyDataGuardian()` shape). These
  are the most dangerous group: a sliced test fails when the code it slices
  changes, but a mirror never does, so it can pass indefinitely against code
  that no longer exists;
- tests that stub `window`, either to supply the globals a module captures at
  import or to assert that a module publishes itself: `comment-card-hide`,
  `feature-bridge`, `guardian-bond-amount`,
  `guardian-inventory-64a1-validation`, `plan-certificate-of-service`,
  `preparer-flag-validation`, `section-guidance-policy`, and
  `service-attestation-visibility`; and
- browser support and specs that assume writable global state: the
  `tests/e2e/support/` layer (`window-api.ts`, `target.ts`, the fixtures,
  `fixture-completeness.ts`, `plan-fixture.ts`) and the roughly 83 spec files
  counted in the baseline.

The first group becomes direct-import tests in the same delivery that moves the
function. The second is repointed to the canonical module or retired only when
its prohibition becomes structurally impossible. Each mirror is replaced by an
import of the real code in the delivery that makes that code importable, and
until then a mirror is treated as unverified. Window stubs go when the module
stops capturing or publishing globals. The browser layer moves in 70T, onto
the typed adapter, and stays inside the type-check gate.

### Verification cadence

1. **Each delivery:** focused unit specs and the browser contracts for the
   touched behavior on the source profile, plus the static ratchets -- globals,
   top-level destructures, import cycles and layers, assertion counts. Run
   `npm run check:types` whenever the checked navigation, persistence, state,
   or E2E-support graph is touched. Per D2, the shipped-build profiles do not
   run on every delivery; the branch does not ship until it merges. 70A runs
   `portable-http` once, to bring the new profile up.
2. **70T:** the whole source suite, green on the adapter against the
   unmigrated monolith -- a full `npm test`, requested at the time.
3. **70D:** old/new differential completion parity across all fixtures before
   switching consumers.
4. **Checkpoints -- 70I and 70J:** request authorization for
   `npm run test:verify`; these are broad shared-state/data-integrity
   checkpoints. Run the shipped-build profiles: `portable`, `portable-http`
   and web.
5. **Before deletion in 70L:** a green full source regression on the exact
   candidate, then web/portable builds and every distribution-sensitive
   profile, including `portable-http`.
6. **Merge gate:** the ledger guard; request authorization for
   `npm run test:release`; the `portable-http` profile; the literal portable
   `file://` smoke; the rollback test; the package inventory; and the
   requester's sign-off on the release packet (D8). `test:quick` is useful during
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
   test-only members are absent unless explicitly enabled. The test runner's
   pre-boot flag (D3, T3) is runner-owned and deleted during boot, so it is
   not an application global.
6. The bridge/dependency audit reports zero unowned app globals, zero implicit
   classic application globals, and zero unclassified cross-boundary edges.
7. Blank creation, normalization, routes, completion, and dashboard progress
   work without loading a heavy filing feature pack.
8. Route changes dispose/abort the old feature, and a stale async mount cannot
   write into the new route or filing.
9. All source-sliced/eval tests of legacy application functions have become
   direct-import or observable-behavior tests; `legacy-source-extract.js` is
   gone unless a separately documented non-legacy use justifies a renamed
   general helper; no unit test carries a hand-copied mirror of application
   code or stubs `window` to supply application globals.
10. Fixed pre-MS-70 plain and encrypted `.sav` fixtures -- including those
    generated from earlier commits -- open correctly, current archives
    round-trip, and the security/key contracts pass.
11. PDF/Excel artifacts, validation, readiness, sidebar completion, conversions,
    and all nine filing identities retain their pre-migration behavior.
12. Source, hosted web, `portable` and `portable-http` profiles pass; literal
    `file://` portable startup/save/open has no console or page error; the
    approved release gate is green on the release commit.
13. Before/after measurements are recorded. Any startup or first-feature
    regression is explained and accepted or corrected; no unsupported speedup
    claim appears in the build record.
14. Every browser spec reaches application state only through
    `GuardianForms.testing` or the real UI, and 70T's guard covers the whole
    suite.
15. The master-fix ledger is closed: every `master` commit after the branch
    point is listed with a disposition, every re-implemented fix's test passes
    on the merged result, and the scoped AGENTS.md branch exception is gone.
16. Browser storage written by a pre-MS-70 tab is read correctly by a
    post-MS-70 tab and the reverse, for every surface in the mixed-version
    contract.
17. An archive saved by the migrated version opens in the pre-merge build
    without loss (the rollback contract).
18. The requester's release sign-off (D8) is recorded against the release
    packet for the merge commit.

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
| Production fixes are lost or mis-ported at the merge | The master-fix ledger, kept current throughout; a guard that fails on any unlisted `master` commit; each ported fix proven by its own red-first test on the branch. |
| Tests pass on source but the shipped bundle fails | The import-cycle and layering check on every delivery; the `portable-http` and `portable` profiles at every checkpoint and at the merge. |
| The shipped configuration is never tested | The `portable-http` profile mirrors production -- the portable bundle served from a subfolder in a secure context, with production's security headers replayed and its parity asserted on every run -- and gates the checkpoints and the merge. |
| The release is decided on automated evidence (D5) | Recorded as a conscious risk, not as proof of safety. Mitigated by the requester's sign-off on a packet of real output (D8), the rollback contract, and the rollback runbook. |
| A rewritten test stops proving what it proved | 70T migrates the browser suite before any code moves, against the unmigrated monolith, with per-spec assertion counts compared to the 70A baseline. |
| An old and a new tab corrupt shared browser storage after the deploy | The mixed-version contract, characterized in 70A and tested at 70I and the merge. |
| Governance documents describe code that has moved | Migration method step 7: living references are updated in the same commit as the move, AGENTS.md section 4 in 70D. |

### Rollback discipline

Each delivery should be one or a small set of cohesive commits on the
`milestone-70` branch (D1) that can be reverted without reviving a second
implementation. A compatibility wrapper and its target move together; a
provider and consumers that must change atomically move together. 70J is the
exception to independent revertibility: once 70K builds on it, it cannot be
reverted on its own (D4). The branch is long-lived by decision, but it is not
a flag day: every delivery leaves the branch head working and tested, and
the merge happens once, through **Reconstitution and merge**. Concurrent work
on the branch is synchronized before each delivery, and only the delivery's
own files are staged. Production rollback happens at the merge: redeploy the
last pre-merge zip and revert the merge commit.

---

## Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** No persisted-shape change is planned. The data-model CSV is
   expected to remain byte-for-byte unchanged. A discovered shape need stops
   the affected delivery for separate scoping and verification.
2. **Legacy data migration.** MS 70 performs no version migration. Existing
   normalization/inference moves intact into importable modules. Format-v1 plain,
   encrypted, and missing-field fixtures -- including archives generated from
   earlier commits, not only today's writer -- prove that old data does not
   become less complete. Browser storage shared between an old and a new tab
   stays compatible in both directions during the deploy window.
3. **Fixture and factory audit.** 70A inventories every baseline/minimal-valid
   factory and E2E support helper. 70C changes production factories and their
   test analogs together; no new required field is introduced.
4. **Test coverage and index.** Each delivery names and runs targeted tests;
   bridge, archive, security, year, async-route, and portable gaps receive new
   coverage. 70T moves the browser suite onto the test adapter before any
   production code moves, with per-spec assertion counts compared to the 70A
   baseline. Every spec/helper scope change updates `TEST-INDEX.md` in the same
   commit.
5. **Export/import/portability.** Court artifact mappings do not change. `.sav`
   and workbook import paths are characterized before ownership moves. Source,
   web, service worker, and literal portable builds are explicit final gates,
   and the portable build served from a subfolder in a secure context,
   mirroring how production runs it, gates every checkpoint and the merge
   (`portable-http`).
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
| `MILESTONE-70-FIX-LEDGER.md` and its guard script | Branch-only record of every `master` fix to re-constitute (D1); retired at the merge once every row is closed. |
| `scripts/run-e2e-profile.mjs`, `playwright.config.ts`, `tests/e2e/support/target.ts` | The `portable-http` profile: the portable bundle served from a subfolder on `http://localhost` by a small Node static server (T1). |
| `AGENTS.md` section 2 (on `master`) | The scoped branch exception, added at branch creation and removed by the merge. |

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
and consumer counts. The range also predates 70T and the end-of-branch fix
reconstitution (D1). 70A has since replaced it with a per-delivery estimate
of 58-95 days after 70A, including 70T and excluding the reconstitution, whose running
cost the ledger records (see the 70A build record).

The safest approval shape is the whole target architecture plus one delivery at
a time, beginning with 70A. Approval of the plan does not waive later decisions
if a delivery discovers changed cost, legal ambiguity, a data-model change, or
an output difference.

---

## Open decisions

None open as of this revision. O1-O3 of the first revision became D5-D7.
Codex's review of 2026-09-24 raised three more, which the requester decided
as D8 (release sign-off), D9 (test writes: setup versus behavior) and D7's
trigger (10 re-implement rows). New questions are added here, as numbered
options with a recommendation, the moment they surface.

### Technical choices settled by the plan owner (open to review)

These are implementation choices with a conventional answer rather than
product or scope calls. The requester can overrule any of them.

- **T1 -- How `portable-http` is served.** A small Node static server, built
  on the standard library's `http` module with no new dependency, mounts
  `dist/portable` at a non-root subfolder on `http://localhost`. Chosen over
  `vite preview` so the mount path and the replayed response headers are
  entirely under the test's control. Chosen over local HTTPS with a
  self-signed certificate because the application has no code that
  distinguishes HTTP from HTTPS and `localhost` is already a secure context,
  so a certificate would add setup without adding coverage. The profile
  asserts both facts on every run, so the choice is re-verified rather than
  trusted.
- **T2 -- How the ledger is represented.** A markdown table in
  `MILESTONE-70-FIX-LEDGER.md`, one row per `master` commit keyed by its full
  SHA. The guard parses the SHAs and compares them with
  `git rev-list <branch-point>..origin/master`. Chosen over commit trailers,
  which cannot be added to commits other agents have already pushed without
  rewriting `master`'s history, and over git notes, which are not pushed or
  fetched by default and do not appear in ordinary review.
- **T3 -- How the test flag reaches the app.** A single documented `window`
  property set by the Playwright init script, read once and deleted by the
  composition root, and listed by the bridge audit as the one runner-owned
  name (D3). Chosen over a DOM attribute because the global object is the one
  place an init script can write that is certain to exist before the
  application's first script runs.

---

## Revision log

- **2026-09-24 -- Codex / Antigravity.** Initial plan (`07f4863`) and review
  safeguards (`a28bd54`).
- **2026-09-24 -- Claude.** Review findings and the requester's decisions D1-D4
  incorporated: the branch workflow and master-fix ledger; 70T, the test
  adapter and browser-suite migration, moved ahead of all code movement; the
  `portable-http` production-parity profile; the import-cycle and layering
  check; checkpoint-only shipped-build testing; test-runner enablement of
  `GuardianForms.testing`; the mixed-version contract; historical `.sav`
  fixtures; same-commit updates of living references, AGENTS.md section 4 in
  70D; a corrected and extended test-coupling inventory; baseline rows for
  production configuration, CI, existing duplicates and stale export
  rationales; the portable build's actual shape; 70J recorded as a one-way
  door; completion criteria 14-16 (the finished browser-suite migration, the
  closed ledger, mixed-version compatibility) and the `portable-http` profile
  in criterion 12; the merge procedure, including the modify/delete conflicts
  the ledger resolves; and open decisions O1-O3. Ownership of further
  revisions recorded under **Document ownership**.
- **2026-09-24 -- Claude.** O1-O3 decided by the requester and recorded as D5
  (merge on automated evidence, no tester pass), D6 (short announced `master`
  freeze while the ledger closes) and D7 (end-of-work reconstitution with a
  ledger review at 70I); the merge procedure and 70I updated to match.
- **2026-09-24 -- Claude.** Codex's review of the D1-D7 revision applied, all
  eight points: 70A's one bring-up run of `portable-http` made explicit in
  D2; `portable-http` defined as a secure-context, subfolder, no-service-worker
  profile with production's security headers replayed and parity asserted on
  every run (T1); the mixed-version contract rewritten by storage kind, with
  the template cache corrected to process-local memory and
  `pg-tab-warning-dismissed-v1` corrected to sessionStorage; the test flag
  made runner-owned and deleted at boot (T3); technical choices T1-T3 listed
  as reviewable; D9 (setup-versus-behavior test writes) added to 70T; D8
  (requester release sign-off), the rollback contract and the rollback
  runbook added to the merge; D7 given a countable trigger of 10 re-implement
  rows; and a note that recording D1 authorizes neither the branch nor the
  AGENTS.md edit. Completion criteria 17-18 added.
