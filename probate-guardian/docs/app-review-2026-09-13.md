# Probate Guardian — End-to-End Code Hygiene & Maintainability Review

**Date:** 2026-09-13 · **Measured against:** `master` @ `d764e1e` (after 40H-A…J) ·
**Read-only:** this review changed no runtime code, tests, or docs other than
creating this file.

## How to read this

Every number below was measured directly against the working tree, not
recalled from proposals; the commands are in the appendix so anyone can
re-run them after the tree moves. Findings are grouped by area, and each one
says how it relates to what is already in flight:

- **40I** (label-alignment CSS fix, in progress in another session)
- **MS 41** (draft: 3-tier Field Primitives → Card Templates → Declarative
  Composition refactor of every form)

The relation tag on each finding is one of **PRECEDES 41** (do it first or
41 gets harder/riskier), **41 ABSORBS** (41's own scope will fix it as a
side effect if 41 is written to), or **INDEPENDENT** (unrelated to 41; can
be scheduled any time).

Line numbers are cited only where a finding is a single site. They rot
within hours in this repository (40H needed three citation passes in one
day) — function names are the durable anchor.

---

## Executive summary — the ten things that matter most

| # | Finding | Relation | Cost of leaving it |
| --- | --- | --- | --- |
| 1 | `npm test` is permanently red (9 known e2e failures + 1 flake). "Clean" now means "exactly the 9 we know about", a criterion that lives only in people's heads. | PRECEDES 41 | Every regression 41 introduces hides inside the known-red set until someone diffs failure lists by hand. |
| 2 | The classic-script ↔ module bridge is an undeclared API of **403 distinct `window.*` names** consumed by modules (**303** assignments) and **83** consumed by tests. **44** of those names are runtime-dead legacy twins (~680 lines, ~8% of `legacy-app.js`), including the entire encryption stack. | PRECEDES 41 | 40F, 40H-A and 40H-F were all "dangling global" bugs. 41 adds a new module layer that will reach through this bridge from both sides. |
| 3 | Validation is string-typed end to end: validators `push()` plain messages, and `validation-adapter.js` reverse-engineers field paths from message text with **380 `includes()` + 57 `startsWith()`** matchers. | PRECEDES 41 | 41's Tier 2 cards will change labels; every changed label is a silent mis-route to the wrong field. |
| 4 | Three independent form-write paths (`persistFormControl`, `persistAnnualControl`, `bindForms()`→`afterChange()`). | PRECEDES 41 | 41 promises tri-state enforcement "at the field primitive level" — impossible while a primitive can be written by three different commit paths. |
| 5 | No linter, formatter, `.editorconfig`, or `.gitattributes`. Working tree is **143 CRLF / 127 LF / 14 mixed**; index is all LF. | INDEPENDENT | Cost already paid this session (a CRLF bug duplicated 300 lines of a test file). Multiply by two concurrent agents on different machines. |
| 6 | `npm run check:types` type-checks **6 files** (`src/core/types/**` only); its 34 typedefs have **zero consumers** outside that directory. | INDEPENDENT | A green type check that checks nothing is worse than none — it gets cited as evidence. |
| 7 | A real CSP-dead control: `pdf-preview.js`'s stale-deploy "Reload Page" button is an inline `onclick=` that the app's own CSP (`script-src 'self'`) blocks. The security spec that should catch it is also red for a **false positive** (`const onAbort =` matches `/\son[a-z]+\s*=/i`), so nobody looked. | INDEPENDENT | The one error state where the user most needs Reload to work is the one where it doesn't. |
| 8 | The vocabulary is inverted: `caseFile.wards[]` holds *filings*; `addWard`/`activeWardId`/`wardId` (258 uses) all mean filing; the actual ward is a Party. 40C-1 made this concrete and MS 41 names a "Ward Demographics Card" for the person. | PRECEDES 41 (naming decision only) | Tier 2 will name things. Naming them against an inverted vocabulary bakes the inversion into the new architecture. |
| 9 | Shipped dead weight: `lib/tesseract` (9.5 MB, retired in M23) and `templates/ui-starter` (a starter kit with its own README) are copied into both builds (27 MB / 26 MB); the service worker precaches ~4 MB of tesseract JS into every offline install. | INDEPENDENT | Bandwidth for every user on every deploy; a retired OCR engine in the attack surface. |
| 10 | Documentation drift: 26 root `.md` files (17,993 lines), an 8,426-line single-file archive, landed proposals still marked "Draft"/"Executable", a reference to a `CLAUDE.md` that does not exist, no `README.md`, and config-file comments that describe Milestone 1. | INDEPENDENT | The codebase's own memory is what two concurrent agents rely on to avoid re-discovering everything. |

Strengths worth protecting are listed at the end — there are real ones.

---

## Part A — Architecture and module boundaries

### A1. `legacy-app.js` is still the center of gravity (INDEPENDENT, but sets 41's ceiling)

- **8,683 lines = 24% of all `src/`** (35,536). 375 top-level functions; 2,029
  comment lines (the file is well-documented, which is why it is still
  navigable at all).
- **Filing-type dispatch is hand-ladders:** 31 `activeInventoryType==='x'`
  comparisons and 21 `case 'x':` labels; 257 filing-type string literals in
  this one file. Nine `src/` files enumerate ≥4 of the 9 type keys
  (`legacy-app.js` 257, `ward-lifecycle.js` 89, `filing-descriptor.js` 26,
  `validation-adapter.js` 19, `prune-cards.js` 16, `types/filing.js` 16,
  `dashboard/view-model.js` 14, `state.js` 8, `router.js` 7).
- **What is left inside, by section banner** (so extraction can be ordered):
  help/tooltips/walkthrough (~500 lines), PDF help-guide export (252-line
  function), common helpers, county/circuit tables, validation summary and
  `errorRoute()`, print-preview pager, encryption at rest (dead twins — see
  A3), in-memory state ops, activity log, party management, `.sav`
  export/import, session-restore cache (dead twins), launch flow, ward
  management/activation, inventory-type management, modals, convert-ward,
  multi-year accounting, inventory selector page, the Guardian Inventory
  form-binding engine (`bindForms()` 166 lines, `computeNavChecks()` 346
  lines), schedule documents/comments, and init.
- **Longest functions:** `computeNavChecks()` 346, `exportHelpGuideAsPDF()`
  252, `setAccountingFilingType()` 223, `bindForms()` 166,
  `resetYearlyFieldsForNewYear()` 157, `loadCaseFileFromZip()` 134.

**Recommendation.** Do not plan a "finish the split" milestone; plan
extractions only where a bug or 41 forces one, and delete rather than move
wherever A3 applies. The one extraction with an outsized payoff is
`computeNavChecks()` + the type ladders into the filing registry (A7): it is
the largest function in the codebase and the one 40C-E and 40H-F both had to
touch.

### A2. The `window.*` bridge is an undeclared, unversioned API (PRECEDES 41)

Measured:

| Surface | Count |
| --- | --- |
| `window.X =` assignments across `src/` | **303** (legacy-app.js 53, case-file.js 41, party-resolver.js 16, ward-lifecycle.js 16, features-loader.js 15, guardian-inventory/index.js 14, crypto.js 13, …) |
| Distinct app-defined `window.*` names *read or called* by modules | **403** (`window.D` in 35 files; `setPath` 11; `navigate` 10; `printCurrentFilingPdf` 9; `computeNavChecks` 8; `queueAllScheduleDocValidations` 7 …) |
| Distinct `(window as any).X` names used by e2e tests | **83** (`navigate` 245 uses, `D` 174, `caseFile` 48, `addWard` 38, `switchWard` 24, `adaptValidationErrors` 21 …) |
| `window.D` direct reads in modules vs. the `getD()` accessor `state.js` provides | **305 vs. 8** |

Why it matters beyond aesthetics: the three most recent crash-class bugs
(40F's `_navSectionExpandedKey` reset, 40H-A's dashboard progress crash,
40H-F's `planReadinessChecks()` on a not-yet-loaded module) were all "a name
on `window` that existed at one moment and not another". Nothing declares
which names exist, when, or who owns them; the only inventory is a grep.

**Recommendation.**
1. Freeze growth: a unit spec that snapshots the sorted list of
   `window.X =` sites (file + name) and fails on additions without an
   explicit allow-list edit — same shape as `skip-classification-audit.spec.ts`,
   which already proves the pattern works here.
2. Give the test-facing subset (the 83) a name. Either a
   `window.__pg` facade the tests import through `support/`, or simply a
   `tests/e2e/support/window-api.ts` that types the 83 and is the only place
   `(window as any)` is allowed. 41 will rename and move things; this is the
   contract that tells you what you broke.
3. Decide `window.D` vs `getD()` (see A4) and stop straddling.

### A3. Forty-four runtime-dead legacy twins, ~680 lines (PRECEDES 41)

A top-level `function X(){}` in a classic script is a writable property of
`window`; a module doing `window.X = moduleX` afterwards replaces it, and
every bare `X()` call inside `legacy-app.js` then resolves to the module
version. 40F removed 4 such pairs and proved the class is not theoretical.
Today there are **44**, and their legacy bodies are dead once `main.js` has
evaluated (which, since 40G, is before anything runs):

| Module that owns the live version | Dead twins still in `legacy-app.js` |
| --- | --- |
| `core/navigation/ward-lifecycle.js` (11) | `createWardId activateWard unloadWard addWard switchWard deleteWard renameWard carrySourcesFor carryWardsFor carryOverFieldsForPlan carryOverFieldsForAccounting` |
| `core/persistence/launch-preferences.js` (10) | `hasOpenedCaseBefore markCaseOpenedBefore savePersistedCaseFileHandle loadPersistedCaseFileHandle forgetPersistedCaseFileHandle runRememberedHandleOperation readRememberedFile handleRememberedFileFailure saveAppState loadAppState` |
| `core/persistence/crypto.js` (8) | `_b64FromBytes _bytesFromB64 generateSaltB64 deriveKeyFromPassword encryptJSON decryptJSON decryptJSONWithKey deriveAndVerifyKey` |
| `core/modals/convert-ward-modal.js` (4) | `convertTargetsFor showConvertWardModal updateConvertTargetOptions convertSourceItems` |
| `core/form/prune-cards.js` (3), `core/persistence/recovery-cache.js` (3) | `isBlankCard isBlankScheduleEntry pruneBlankCards` / `saveSessionRestoreCache clearSessionRestoreCache checkSessionRestoreCacheAtLaunch` |
| `main.js` (2) | `activateWard switchWard` — **defined three times** (legacy, ward-lifecycle.js, and re-published by main.js) |
| one each | `formatCityStateZip` (form-contract.js), `embeddedTemplate` (templates.js), `duplicateAnnualRow` (annual-accounting/index.js) |

Approximate span of the dead bodies: **678 lines (7.8% of the file)**.
Largest: `carryOverFieldsForPlan` 83, `carryOverFieldsForAccounting` 68,
`clearSessionRestoreCache` 52, `activateWard` 50.

The crypto row is the one to lose sleep over: two implementations of
encryption-at-rest, one live and one dead-but-present, with the same names.
A future reader fixing "the" `deriveKeyFromPassword` has a coin-flip chance
of editing the dead one and seeing no effect.

**Recommendation.** Delete in tranches using 40F's method (prove the module
version is a behavioral superset, then remove the legacy body and the
`window.X =` that shadows it becomes the only definition). Order: crypto
(8) → persistence/launch (13) → ward lifecycle (11) → the rest. Each tranche
is a self-contained, test-verifiable commit. 40H-J just edited the *live*
`carryOverFieldsForAccounting` in `ward-lifecycle.js` while its dead twin
sat 3,700 lines into `legacy-app.js` — the next person may not pick the
right one.

### A4. `main.js`'s state bridging never runs; `state.js` is not the source of truth (INDEPENDENT, small)

`main.js` installs accessor properties for `window.D` and `window.caseFile`
only `if (!Object.getOwnPropertyDescriptor(window, 'D'))`. But
`legacy-app.js` assigns both at its own top level (`window.caseFile =
caseFile` at `:211`, `window.D = {}` at `:951`) and, being a parser-blocking
classic script, runs first. The descriptors therefore always exist as plain
data properties and both `defineProperty` branches are dead. Consequences:

- `state.js`'s `_D` / `_caseFile` shadow copies are never authoritative in a
  browser; `getD()` is a `window.D` read with extra steps — which is why
  modules bypass it 305:8.
- `setD()` is the only place `normalizeWardData()` is applied, and it is
  bypassed by every direct `window.D = …` write.

**Recommendation.** Pick a direction and delete the other half. Cheapest
consistent option: remove the two top-level assignments from
`legacy-app.js` so `main.js`'s accessors actually install, then `getD()`
becomes real and the 305 direct reads can migrate at leisure. Alternative:
delete the dead `defineProperty` blocks and `state.js`'s shadow copies, and
document `window.D` as the (only) truth.

### A5. Three form-write paths (PRECEDES 41)

Any cross-cutting form-level hook must be wired into all three or it
silently misses filing types — 40C-1's `maybeCommitCoverCounty` had to be
added to two of them and the third (Guardian Inventory's
`bindForms()`→`afterChange()`) routes differently again:

| Path | Owner | Filing types |
| --- | --- | --- |
| `persistFormControl()` | `core/form/form-contract.js` | Simplified Accounting, all four Plans |
| `persistAnnualControl()` | `features/annual-accounting/index.js` | Annual / Final / Trust |
| `bindForms()` → `afterChange()` | `legacy-app.js` | Guardian Inventory |

MS 41 §2.2 promises "tri-state values (`''`, `'Yes'`, `'No'`) are enforced
at the field primitive level". A primitive cannot enforce anything about a
write it does not own. **41 should list collapsing these into one commit
path as a Tier 1 prerequisite, not assume it.**

### A6. Two readiness-panel architectures (41 ABSORBS if written to; otherwise INDEPENDENT)

`filingReadinessCard()` (5 filing types, parity guaranteed by construction)
vs. `planReadinessPanel()` (4 Plan types, hand-maintained). 40C-E fixed
drift here twice and 40H-D/40H-F patched the Plan side again. 40H's own
"Recommended Standard" already says unify; it just is not scheduled. 41's
Tier 2 cards deriving readiness from validators (F3) is the natural home.

### A7. Adding a tenth filing type touches ~9 files and ~50 legacy sites (INDEPENDENT)

`filing-descriptor.js` already holds the 9 keys and their display data;
`formEngine()`, `PAGES_*`, `CARRY_SOURCE_TYPE`, the feature loaders, the
walkthrough tables, `prune-cards.js`, `view-model.js`, and `types/filing.js`
each re-enumerate them. **Recommendation:** make `filing-descriptor.js` the
registry (engine, loader, pages, carry sources) and derive the rest; a unit
spec asserting no other file enumerates ≥4 keys keeps it that way. This is
the same shape as the `filing-matrix.ts` the e2e support already has (D3).

### A8. `ward` means filing (PRECEDES 41 — as a decision, not a rename)

Measured: `caseFile.wards` 100, `wardId` 258, `activeWardId` 54,
`activateWard` 16, `unloadWard` 15, `switchWard` 21, `addWard` 9 — every one
of them refers to a filing record. `filingId` appears 7 times; `activeFilingId`,
`addFiling`, `getActiveFiling` do not exist. The person is a `Party`
(40C-1 established `party.county` as the ward's canonical county precisely
because "the ward" is not the filing). UI copy was already renamed
("Rename Ward-flavored copy in create/delete flows to Form"); the code was
not. MS 41 will introduce a "Ward Demographics Card" that means the person
while `WardRecord` in `types/` means the filing.

**Recommendation.** Record the vocabulary in `AGENTS.md` (filing = one form
instance in `caseFile.wards[]`; ward = the Party) before 41 names Tier 2
cards, and require new code to use it. Rename existing identifiers only at
module boundaries you are already touching — a big-bang rename across the
83 test-facing globals is not worth it.

---

## Part B — Correctness-adjacent findings (bugs the review found)

### B1. CSP-dead "Reload Page" button (INDEPENDENT, 5-line fix)

`src/core/pdf/pdf-preview.js` (the `catch` in the preview renderer) builds
`<button … onclick="window.location.reload()">Reload Page</button>` into
`innerHTML` for the stale-deployment error branch. `index.html`'s CSP is
`script-src 'self'` with no `'unsafe-inline'`/`'unsafe-hashes'`, so the
handler never fires. `feature-bridge.js`'s `showLoadFailure()` already does
the same button correctly (`createElement` + `addEventListener`). The
`vite:preloadError` auto-reload in `features-loader.js` masks this in the
common case, which is why it has not been reported.

### B2. The security guard is red for one real and one false reason (INDEPENDENT)

`tests/e2e/security.spec.ts:53` fails on `pdf-preview.js` (B1 — real) and
`pdf-annotate.js` (false: `/\son[a-z]+\s*=/i` matches
`const onAbort = () => …` at `:24` — any identifier beginning with "on"
trips it). Because the spec has been red since before 40A, a genuine
violation and a regex bug have been indistinguishable. Fix B1, then tighten
the regex to attribute context (e.g. only inside `<…>` in HTML files and
inside string/template literals in JS), and the guard means something again.

### B3. `npm test` is permanently red (PRECEDES 41)

As of this morning's full run on `46b8f11`: 401 passed, **9 failed**, 6
skipped (classified), 15.6 minutes. The nine:

| Spec | Count | Status |
| --- | --- | --- |
| `pdf-preview-viewer.spec.ts:114` "incomplete filing's embedded preview is blocked" (parametrized over 7 types) | 7 | **Un-triaged.** Either the 38D affirmative-override work changed the product behaviour and the test encodes the old expectation, or the gate regressed. Nobody has determined which. |
| `schedule-card-layout.spec.ts:177` | 1 | Owned by 40I. |
| `security.spec.ts:53` | 1 | B1 + B2 above. |

Plus one flake (`dashboard-backup.spec.ts:99`, passed on re-run today).

The repository already has the right tool: `skipTemporaryGap(condition,
owningMilestone, detail)` in `support/target-profile.ts`, policed by
`skip-classification-audit.spec.ts`. **Recommendation:** triage the seven
within the week (they are one test), mark the 40I one
`skipTemporaryGap('40I', …)` until it lands, fix B1/B2 — and then require
`npm test` green, so red means new. CI (`.github/workflows/probate-guardian-tests.yml`)
runs the same suite on every push to `master`; if it has been red since the
first of these failures, it has been providing no signal for weeks — worth
checking the Actions tab, which this review cannot see.

---

## Part C — Tooling and repository hygiene

### C1. No lint, no format, no `.editorconfig`, no `.gitattributes` (INDEPENDENT, highest ROI)

- Git index: 306 files `i/lf`. Working tree: **143 `w/crlf`, 127 `w/lf`,
  14 `w/mixed`** (`MILESTONE-36-PROPOSAL.md`, `MILESTONE-ARCHIVE.md`,
  `playwright.config.ts`, `src/features/dashboard/index.js`, `src/pwa-ui.js`,
  four e2e specs, three unit specs, two `lib/` files). Git warns "LF will be
  replaced by CRLF" on nearly every commit. Behaviour depends on each
  machine's `core.autocrlf`, and this repository has at least three
  committers on different machines.
- Cost already paid: a `\n`-based `endMarker` search against a CRLF file
  returned −1 and duplicated ~300 lines of a test spec this session; it was
  caught by diffing line counts against HEAD.
- `package.json` has no `lint`/`format` script, no `engines` field.

**Recommendation** (one small commit, then one normalization commit):
1. `.gitattributes`: `* text=auto eol=lf`, with `*.png`/`*.wasm`/`*.gz`
   `binary`; `.editorconfig` with `end_of_line = lf`, 2-space, UTF-8.
2. `git add --renormalize .` as its own commit (the diff is line endings
   only; verify with `git diff --stat -w`).
3. ESLint flat config with a deliberately small rule set — `no-undef` is
   the one that catches A2's class, and it needs the bridge inventory as its
   `globals` list, which is one more reason to generate that inventory.
   Prettier is optional; if adopted, format only on touch, never as one
   repo-wide commit while 40I/41 are open.

### C2. `check:types` is vacuous (INDEPENDENT)

`tsconfig.json` `include` is `src/core/types/**/*`; `npx tsc --noEmit
--listFilesOnly` confirms exactly six files are checked. 34 `@typedef`s,
**0** files outside that directory reference any of them (`@param {Ward}`,
`import('../types/…')` — none). `checkJs: true` therefore checks nothing that
runs. **Either** widen `include` one directory at a time
(`src/core/persistence`, `src/core/navigation` first — they are the most
module-shaped) and fix what surfaces, **or** delete the script until it can
mean something. A green check that checks nothing gets cited.

### C3. The codebase's own memory is stale in the places new readers look first (INDEPENDENT)

- `vitest.config.ts`: "Milestone 1 has zero unit specs by design … `tests/unit/`
  doesn't exist yet". There are 57. `passWithNoTests: true` is now a hazard: a
  broken `include` glob would pass silently.
- `vite.config.js`: "index.html is still the untouched monolith" (Milestone 1).
  It also still says `index.html` loads `templates/*` as classic scripts —
  it does not; `templates.js` imports them as modules, and the static copy of
  `templates/` (including `ui-starter/`) into both builds is vestigial.
- `features-loader.js` and `feature-bridge.js`: "Remove once a real
  `src/main.js` bootstrap exists." It has existed since 40G.
- `AGENTS.md` §10: "theme still lives in `.sav` app state; closing that gap is
  an independently gated Milestone 40 candidate, not yet authorized." 40D
  landed it — this reviewer's omission.
- `TEST-INDEX.md` line 4 cites "the instruction in `CLAUDE.md`". No
  `CLAUDE.md` exists anywhere in the repository; `AGENTS.md` is the contract.
- 10 `console.log` calls in shipped code, including `main.js`'s boot banner.

### C4. Shipped dead weight (INDEPENDENT)

`vite.config.js` copies `lib/` and `templates/` wholesale into both outputs:

| Item | Size | Status |
| --- | --- | --- |
| `lib/tesseract/` | 9.5 MB (3.8 MB `.wasm.js`, 2.8 MB `.wasm`, 2.9 MB `.traineddata.gz`) | Retired in Milestone 23 (`VENDORED-LIBRARIES.md` says so). The service worker's `runtimeAsset` filter precaches every `.js`, so ~4 MB of it lands in every offline install. |
| `templates/ui-starter/` | small | A greenfield starter kit with its own `README.md`, `theme.js`, `tokens.css`, shipped to production. |
| `lib/html2pdf.bundle.min.js` | 924 KB | Kept only because jsPDF is inside it; html2canvas + dompurify are dead payload. `VENDORED-LIBRARIES.md` cannot even state its version. |

Builds are 27 MB (web) / 26 MB (portable). Removing tesseract and
`ui-starter` from `STATIC_COPY_TARGETS` (and deleting `lib/tesseract/`) is
a one-line change plus a `git rm`; vendoring jsPDF alone is a small follow-up.

### C5. `package.json` disagrees with the vendoring contract (INDEPENDENT, trivial)

`jszip`, `pdf-lib`, `pdfjs-dist` are under `dependencies`; `VENDORED-LIBRARIES.md`
correctly says they are upstream sources for files copied into `lib/` and
"nothing here is an npm `dependency`". Move them to `devDependencies` so the
manifest states the truth (runtime uses `lib/` only).

### C6. E2E throughput (INDEPENDENT)

416 tests, 15.6 min, `workers: 1` by design because "concurrent contexts
overloaded" the shared `vite preview` server. Options that keep the
one-server-per-run invariant: shard by file in CI (3-way matrix ≈ 5–6 min),
or replace `vite preview` for the `source` target with a plain static server
(`sirv`, `http-server`) and try `workers: 2–3` — the recorded "overload"
was `vite preview` under concurrent contexts, which is a server choice, not
an app constraint; measure before assuming. Do this after B3, so a faster
suite is also a green one.

---

## Part D — Test-suite maintainability (with 41 in mind)

### D1. Tests are white-box through the bridge (PRECEDES 41)

**753** `page.evaluate` calls; **83** distinct `(window as any).X` names.
Every one is an implicit contract with the internals 41 will move. See
A2 (2) — inventory and type the 83, and make `support/` the only place
`(window as any)` appears.

### D2. Seven unit specs assert on source text (PRECEDES 41)

`bar-number`, `checklist-export-parity`, `content-corrections`,
`field-kind-inference`, `guardian-inventory-yes-no-radio`, `preparer-note`,
`yes-no-radio-migration` read source files with `readFileSync` and match
strings — e.g. `checklist-export-parity.spec.js`'s `BRANCH_MARKERS` are
literal `activeInventoryType==='simplified'` fragments of `legacy-app.js`.
These are valuable *guards* today (they caught real regressions), but 41
will move the code they grep by design. **List them in 41 as expected
casualties with a replacement behaviour test each**, or convert them first.
(The two e2e source-audit specs — `security` and `skip-classification-audit`
— are legitimately about source and should stay.)

### D3. Filing-type lists are duplicated across tests (INDEPENDENT)

26 e2e files hardcode filing-type key literals; `support/filing-matrix.ts`
exists and is used by 5. One matrix, like A7's registry, and the next type
is one row.

### D4. `KNOWN_GAPS` is tracked debt done right — give it owners (INDEPENDENT)

`checklist-export-parity.spec.js`'s allow-list shrank by four in 40C-E and
each remaining entry has a reason comment. Add an owning milestone per
entry (the `skipTemporaryGap` convention) so the list keeps shrinking on
purpose rather than by accident.

### D5. Strengths (protect these)

Classified skips policed by an audit spec; red-before-green verification of
every new assertion as a written norm and a practiced one; `TEST-INDEX.md`
kept in the same commit; four parity targets (source/dev/web/portable) in
CI; contract specs (`filing-identity`, `date-validation`, `form-entry`) that
pin behaviour rather than markup; a real data-model dictionary (897 rows)
with a zero-dependency verifier.

---

## Part E — Documentation and process

### E1. Root-level document sprawl and status drift (INDEPENDENT)

26 `.md` files at the root, 17,993 lines; `MILESTONE-ARCHIVE.md` alone is
8,426 lines in one file. Status lines have drifted from reality:

| File | Status line says | Reality |
| --- | --- | --- |
| `MILESTONE-36-PROPOSAL.md` (861 lines) | Implemented; historical record | Correct — but still at root, not archived |
| `MILESTONE-37-PROPOSAL.md` (855) | "Draft only — do not implement yet" | 37-1…37-5 landed (5 commits) |
| `MILESTONE-38A/38B/38D` | "Executable, independent delivery specification" | The deliverables their titles name (`excelCapacityPanel`, `readiness-card.js`, `output-authorization.js`) exist on `master`; no commit message names them; no status line says landed |
| `MILESTONE-40H-PROPOSAL.md` (1,092) | "Draft only" | All ten tasks landed today |
| `implementation_plan.md` | (no status) | The `/summary` renderer it specifies exists (`core/summary-renderer.js`, `routes.spec.ts`). Un-numbered, un-archived, at root. |
| `DATA-MODEL-REMEDIATION-PLAN.md` | (no status line) | Its verifier is in use; unclear whether the plan is complete |

**Recommendation.** (1) A required first line for every proposal:
`**Status:** Draft | Approved <date> | Landed <date> <sha> | Withdrawn`.
(2) Landed → moves to `docs/milestones/<name>.md` (one file per milestone,
not appended to an 8k-line archive) in the landing commit. (3) Root keeps
`AGENTS.md`, `README.md`, `TEST-INDEX.md`, the milestone index, and only
open proposals.

### E2. No `README.md` (INDEPENDENT)

`AGENTS.md` is an excellent *contract*; it is not an orientation. A new
contributor (or a fresh agent session) has no page that says what the app
is, how it is laid out (`legacy-app.js` + `src/core` + `src/features` +
`lib/` + `templates/`), how to run it, and where the four build/test targets
come from. Thirty lines would do.

### E3. Proposal citations rot in hours (INDEPENDENT, convention)

40H needed three correction passes in one day because tasks cited
`legacy-app.js` line numbers. Convention change: cite `function name()` and
the file; add a line number only with the commit sha it was read at.

### E4. MS 41 draft carries stale facts (PRECEDES 41)

- §2.4 lists "PDF, Word/DOCX, and Excel export pipelines" — DOCX was removed
  in 40A.
- §2.3 names `tests/unit/form-fields.spec.js` as a *new* spec (it exists,
  covering `inferFieldKind`/`renderFormField`) and
  `tests/unit/filing-identity.contract.spec.js` (exists as
  `tests/e2e/filing-identity.contract.spec.ts`).
- §2.2's "legacy helpers `inpS`, `txtP`, `radioP` will delegate to Tier 1
  renderers" — accurate that they exist (`inpS` alone has 130 uses), but
  they live in `legacy-app.js` (classic script) and Tier 1 is a module, so
  "delegate" means another round-trip through the `window` bridge (A2)
  unless the helpers move first. 41 should say which.
- 41 is silent on A5 (three write paths), F3 (string-matched validation),
  D1/D2 (tests that will break), and A8 (vocabulary) — all of which its
  own §8 checklist would flag under Test Coverage and UI/UX Consistency.

### E5. `TEST-INDEX.md` needs a guard (INDEPENDENT, trivial)

`annual-accounting-pdf-model.spec.js` has two rows (lines 13 and 15) with
different descriptions; rows are not in file order. A 20-line unit spec
asserting "every spec file has exactly one row and every row names an
existing file" makes the index self-maintaining.

---

## Part F — Data model, persistence, validation

### F1. Migrations have no home (PRECEDES 41 only if 41 touches persisted data — it says it won't)

`CASE_FILE_FORMAT_VERSION = 1` is written into every archive but nothing
reads it to gate a migration; "migrat" logic lives in ten files
(`plan-tristate.js`, `guardian-inventory/index.js`, `recovery-cache.js`,
`theme-preference.js`, four `plan-*/index.js`, `case-file.js`,
`legacy-app.js`). Each is correct on its own; together they are an ordering
nobody can state. A `core/persistence/migrations/` ladder keyed by version,
run once in `loadCaseFileFromZip()`, is the standard shape and is cheap
while there is only one version.

### F2. Three tri-state conventions (41 ABSORBS)

Canonical `'Yes'`/`'No'`/`''` strings (AGENTS §3); legacy booleans;
boolean-`null` tri-state for Safe Deposit Box (38E's documented exception,
pinned by `guardian-inventory-yes-no-radio.spec.js`). 41's Tier 1 radio
primitive is the right place to make the string form the only one a
primitive can emit — with the SDB exception listed explicitly in the
data-model CSV's `allowed_values`, not only in a test.

### F3. Validation is string-typed end to end (PRECEDES 41)

Validators `push()` prose (`"Cover — County is required"`);
`validation-adapter.js` (872 lines) maps prose back to routes and field
paths with **380 `includes()` and 57 `startsWith()`** checks, plus
per-type section tables whose keys must match validator wording exactly
(the file's own comments document the "Signatures" collision that forced
exact matching). Every new message is a chance to route the user to the
wrong field silently; 34-1A's date rules needed priority-ordered branches to
disambiguate messages that begin the same way.

**Recommendation.** Validators return `{ path, section, message, severity }`
(the `ValidationResult` typedef in `types/` already sketches it and has zero
users — C2); the adapter becomes a fallback for legacy strings and shrinks
as validators convert. This is the single most valuable prerequisite for
41: Tier 1 primitives can then carry `data-form-path` and the readiness
panels (A6) can derive from validators instead of hand-maintained tables.

---

## Part G — UI, CSS, DOM

### G1. The design-token system is bypassed where it matters most (41 ABSORBS partly)

`tokens.css` exists (41 hex literals, all definitions). But `forms.css` has
**50** hex literals and **19** `!important` in 237 lines; `shell.css` 36
hex; `dashboard.css` 12 `!important`; 45 `!important` total; **128** inline
`style="…"` attributes in JS/HTML. `forms.css` is the file on its fourth
label-alignment rewrite (40I). AGENTS §10 already forbids arbitrary hex in
component stylesheets; nothing checks it. A `stylelint` rule
(`color-no-hex` scoped to non-token files) is the enforcement; 41's Tier 2
cards are the opportunity to write the replacement rules once.

### G2. 87 native dialogs (INDEPENDENT)

`alert()` 68, `confirm()` 16, `prompt()` 3 — alongside a modal system
(`showModal`, `fragments/common-modals.html`). Native dialogs are
unstyled, untestable without dialog handlers, and blocked outright in some
embedded/PWA contexts. Convert opportunistically; add the count to the
bridge-inventory spec so it only goes down.

### G3. `innerHTML` with manual escaping (41 ABSORBS)

83 `innerHTML` assignments; `esc()` 313 uses, `escapeHtml()` 11. The
discipline exists (the dashboard has an XSS test with an
`<img onerror>` ward name) but nothing enforces it per interpolation. 41's
Tier 1 is where escaping becomes the primitive's default rather than the
caller's habit.

---

## Part H — What MS 41 should absorb vs. what must precede it

| Precede 41 (do first) | 41 absorbs (write 41 to include) | Independent (any time) |
| --- | --- | --- |
| B3 green suite · A5 one write path · F3 structured validation · D1/D2 test contracts · A8 vocabulary decision · E4 fix 41's draft · C1 `.gitattributes` (41 is a large diff; do not mix a line-ending change into it) | A6 readiness unification · F2 tri-state at the primitive · G1 tokenized card styles · G3 escaping by default · the 13 hand-rolled label sites 40I is patching around (41 deletes that markup; 40I's guard test must survive 41) | A3 dead twins (crypto first) · A4 state bridge · A7 filing registry · C2–C6 · E1–E3, E5 · F1 migrations · G2 dialogs |

Suggested proposal-sized deliveries, in order, each one commit-day or less:

1. **Repo hygiene** — `.gitattributes` + normalize, `.editorconfig`, stale
   comments (C3), `README.md`, `package.json` deps (C5), `TEST-INDEX` guard
   (E5), tsconfig decision (C2).
2. **Green suite** — B1, B2, triage the seven, `skipTemporaryGap` for 40I's.
3. **Dead twins** — crypto → persistence → lifecycle (A3), plus A4.
4. **Structured validation** — F3, then A6 rides on it.
5. **Filing registry** — A7 + D3.
6. **Build weight** — C4.
7. **41**, with E4's corrections and the Part H prerequisites named in its
   own §8 checklist.

---

## Appendix — how the numbers were produced

All run from `probate-guardian/` on `d764e1e`.

```sh
# size / structure
find src -name '*.js' -o -name '*.css' -o -name '*.html' | xargs wc -l | sort -rn | head
grep -cE '^(async )?function ' src/legacy-app.js          # top-level functions
grep -c "activeInventoryType==='" src/legacy-app.js       # type ladders
# bridge surface
grep -rcE '^\s*window\.[A-Za-z_$][\w$]*\s*=' src | grep -v ':0'
grep -rhoE '\(window as any\)\.[A-Za-z_$][\w$]*' tests/e2e | sort -u | wc -l
grep -rho '\bwindow\.D\b' src --include=*.js | wc -l ; grep -rho 'getD()' src | wc -l
# dead twins: legacy top-level function X also assigned by a module's `window.X =`
#   (scratch script: intersect the two sets; sum decl-to-column-0-brace spans)
# line endings
git ls-files --eol | awk '{print $2}' | sort | uniq -c ; git ls-files --eol | grep mixed
# type check scope
npx tsc --noEmit --listFilesOnly | grep -v node_modules
# validation adapter
grep -o '\.includes(' src/core/validation/validation-adapter.js | wc -l
# CSS
for f in src/styles/*.css; do echo "$f $(grep -oE '#[0-9a-fA-F]{3,8}\b' $f | wc -l) $(grep -o '!important' $f | wc -l)"; done
# dialogs, innerHTML
grep -rhoE '\b(alert|confirm|prompt)\(' src --include=*.js | wc -l
grep -rhoE '\.innerHTML\s*[+]?=' src --include=*.js | wc -l
# shipped weight
du -sh lib/* dist/web dist/portable ; git ls-files lib/tesseract
# docs
ls *.md | wc -l ; cat *.md | wc -l ; wc -l MILESTONE-ARCHIVE.md
```
