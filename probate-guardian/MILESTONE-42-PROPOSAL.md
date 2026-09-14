# Milestone 42: Code Hygiene and Maintainability — Executable Delivery Index

## Status

**All eight sub-deliveries landed; full-milestone verification run and
recorded 2026-09-14.** See "Full-milestone verification, once all eight
sub-deliveries have landed" below for the closing note. This document's
original text (below) is left as the historical proposal; approvals per
`AGENTS.md` §2 are recorded by the commits cited in the closing note, not
by editing the original per-sub-delivery text in place.

**Source:** `docs/app-review-2026-09-13.md`, a read-only, directly-measured
review of `master` at `d764e1e`. This proposal converts that review's
findings into executable steps. Every fact below was re-verified against
current `master` (`ce93414`, after Milestone 40H landed in full) while
drafting this proposal, not copied from the review unchecked — three findings
needed correction in the process; each is called out where it appears,
per this repository's convention of recording proposal-accuracy corrections
in place rather than silently fixing them.

## How this index is organized

Each sub-delivery states: **Relation** (to Milestone 41, the draft 3-tier
form-architecture refactor), **Risk**, **Files**, numbered **Steps** (each
independently verifiable), a **Verification** block, and — per `AGENTS.md`
§8 — the cross-cutting ramifications, abbreviated to **N/A** where a
sub-delivery is genuinely inert on that axis (true for most of this
milestone; call this out explicitly rather than leaving it silent).

| Sub-delivery | Relation to MS 41 | Size |
| --- | --- | --- |
| 42A — Repo Hygiene Foundations | Independent | Small, many small commits |
| 42B — Close the Red Test Suite | **Precedes 41** | Small–medium |
| 42C — `window.*` Bridge Inventory & Freeze | **Precedes 41** | Small |
| 42D — Unify the Three Form-Write Paths | **Precedes 41** | Small–medium |
| 42E — Delete Runtime-Dead Legacy Twins | Independent | Medium, five commits |
| 42F — Structured Validation Results (full conversion) | **Precedes 41** | Large, nine phased commits |
| 42G — Filing-Type Registry Consolidation | Independent | Medium |
| 42H — Shipped Build Weight Cleanup | Independent | Small |

**Sequencing decision (approved during scoping):** Milestone 41 does not
start until every **Precedes 41** sub-delivery here (42B, 42C, 42D, 42F) has
landed and its own verification has gone green. The **Independent** ones
(42A, 42E, 42G, 42H) may run before, during, or after 41 in any order — they
touch no code 41 will read differently once they're done.

**Concurrency note:** as of this proposal's drafting, another session has an
untracked diagnostic file (`tests/e2e/_diag_row_pairing.spec.ts`) and is
actively editing `src/styles/forms.css` under Milestone 40I. **42A's
line-ending renormalization step (A2) must not run until 40I has landed** —
normalizing a file mid-edit in another session guarantees a merge conflict
on the next pull. Every other step here is safe to interleave with 40I;
none of them touch `forms.css` or the print-preview label-alignment markup
40I is fixing.

---

## 42A — Repo Hygiene Foundations

**Relation:** Independent. **Risk:** Low — no runtime behavior changes;
verified by `npm test` remaining exactly as red/green as before each step.

### Scope decisions taken (approved during scoping)

- **Tooling:** line-ending normalization only. No ESLint, no Prettier, no
  new commit gate. The review's finding that `no-undef` would catch the
  "dangling global" bug class (40F/40H-A/40H-F) is real, but a new lint gate
  both this session and any concurrent one must now pass is out of scope
  for this milestone; 42C's bridge-inventory test (a Vitest/Playwright
  snapshot, not a lint rule) catches the same class of regression without
  introducing a new tool.
- **Documentation backlog:** status-line corrections only. No file moves
  into a new `docs/milestones/` tree — root stays as-is; this closes the
  factual-drift gap without the larger, separately-decidable reorganization.

### Files

`.gitattributes` (new), `.editorconfig` (new), every file git currently
reports as `mixed` or `crlf` line endings, `package.json`,
`TEST-INDEX.md`, `vitest.config.ts`, `vite.config.js`, `src/features-loader.js`,
`src/core/feature-bridge.js`, `AGENTS.md`, `MILESTONE-41-PROPOSAL.md`,
six `src/features/*/print.js` files, `MILESTONE-37-PROPOSAL.md`,
`MILESTONE-38A-PROPOSAL.md`, `MILESTONE-38B-PROPOSAL.md`,
`MILESTONE-38D-PROPOSAL.md`, `README.md` (new).

### Steps

**A1. Add `.gitattributes` and `.editorconfig`, commit alone (no other changes in this commit).**

```gitattributes
* text=auto eol=lf
*.png binary
*.wasm binary
*.gz binary
*.woff binary
*.woff2 binary
*.ttf binary
```

```editorconfig
root = true

[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
indent_style = space
indent_size = 2
```

Verify: `git status --short` shows only the two new files; nothing else
changes on this commit (adding `.gitattributes` alone does not rewrite
tracked file content — that happens in A2).

**A2. GATE: wait for Milestone 40I to land and its own commit to be pulled.**
Confirm with `git log -1 -- src/styles/forms.css` showing a 40I commit, and
`git status --short` showing no untracked `_diag_*` files. Only then:

```sh
git add --renormalize .
git diff --cached --stat -w   # must show 0 changes -- confirms line-ending-only diff
git commit -m "chore: renormalize line endings to LF per .gitattributes"
```

If `git diff --cached --stat -w` shows anything, stop — a non-whitespace
change slipped in; investigate before committing.

**A3. `package.json`**: move `jszip`, `pdf-lib`, `pdfjs-dist` from
`dependencies` to `devDependencies` (they are upstream sources for files
copied into `lib/`, never imported by package name at runtime —
`lib/VENDORED-LIBRARIES.md` already documents this; the manifest should
agree). Run `npm install` to confirm the lockfile updates cleanly with no
resolution changes beyond the move itself.

**A4. `TEST-INDEX.md`**: delete the stale duplicate row (line 13, "Trust
Accounting PDF-model table layout for percentage and currency columns" —
confirm by re-reading current line numbers first, since this file has
shifted; keep the row whose description matches current
`annual-accounting-pdf-model.spec.js` content). Add a new unit spec
`tests/unit/test-index-guard.spec.js` asserting: every `.spec.js` file
under `tests/unit/` and every `.spec.ts` under `tests/e2e/` has exactly one
row in `TEST-INDEX.md` (by filename, appearing as a `|`-delimited table
cell), and every filename appearing in the tables exists on disk. This is
the same self-auditing pattern `tests/e2e/skip-classification-audit.spec.ts`
already uses for skip classification — reuse its shape rather than
inventing a new one.

**A5. Fix six duplicated internal print.js header comment blocks.**
Verified present (each file's header comment appears twice, verbatim,
consecutively) in `src/features/guardian-inventory/print.js`,
`plan-annual/print.js`, `plan-initial/print.js`, `plan-minor/print.js`,
`plan-simplified/print.js`, `simplified-accounting/print.js`.
`annual-accounting/print.js` does **not** have this duplication — confirm
before editing so it isn't touched needlessly. For each of the six: delete
the second (duplicate) copy of the header comment block, keeping one.
Verify via `git show HEAD:<file> | head -20` first (per
`MILESTONE-40H-PROPOSAL.md`'s own open-items register, item 5, which
already established this as pre-existing rather than introduced by 40A —
re-derive that confirmation rather than trusting the citation, since the
line numbers in that register have already drifted twice this week).
Run `node --check` on each file after editing.

**A6. Stale comments.** Fix each, confirming current truth first:
- `vitest.config.ts`: replace "Milestone 1 has zero unit specs by design...
  `tests/unit/` doesn't exist yet" with a comment stating the real reason
  `include`/`passWithNoTests` are set the way they are (Playwright globals
  conflict with Vitest's, hence the split — that part is still true and
  worth keeping).
- `vite.config.js`: the "index.html is still the untouched monolith" framing
  is stale (Milestones 2–40 moved most application logic into `src/`);
  update the comment to describe the *current* reason `legacy-app.js` is
  still copied as a static passthrough (Milestone 1's classic-script
  decision, still true) without implying nothing else has moved.
- `src/features-loader.js` and `src/core/feature-bridge.js`: both say
  "Remove once a real `src/main.js` bootstrap exists" — it has, since
  Milestone 40G (`d764e1e`'s ancestry includes 40G). Re-read both comments
  in full first: if the *reason* they're bridged through `window.*` (Vite
  import-graph visibility for a classic script) is still accurate
  independent of `main.js`'s existence, correct the comment to say so
  rather than deleting it — don't remove a load-bearing explanation because
  one clause in it went stale.

**A7. `TEST-INDEX.md` line 4** cites "the instruction in `CLAUDE.md`". No
such file exists in this repository (confirmed: `find . -iname CLAUDE.md`
returns nothing). Change the citation to `AGENTS.md`, which is the actual
contract document.

**A8. Vocabulary decision, recorded rather than renamed.** The review found
`caseFile.wards[]`/`wardId`/`activeWardId`/`addWard`/`activateWard`/
`switchWard`/`unloadWard` (258+ call sites combined) all actually mean *one
filing instance*, while the person is a `Party` (established concretely by
Milestone 40C-1's `party.county`). Milestone 41 is about to name a "Ward
Demographics Card" for the person. **Do not rename the 258+ existing call
sites** — that is a large, high-risk, purely-cosmetic change with no
functional payoff. Instead, add one paragraph to `AGENTS.md` §6 (UI, DOM &
Event Handling) stating the vocabulary explicitly: *"`ward` in code
(`caseFile.wards[]`, `wardId`, `activateWard`, etc.) refers to one filing
instance, for historical reasons predating the Party model. The person is a
`Party` (`src/core/party-resolver.js`). New code should prefer `filing`
terminology where practical (e.g. a new `filingId` parameter over a new
`wardId` one) without renaming existing identifiers at sites not otherwise
being touched."* This gives Milestone 41 a documented convention to follow
when it names Tier 2 cards, at zero migration risk.

**A9. Correct `MILESTONE-41-PROPOSAL.md`'s stale facts** (found during this
review's drafting, listed there as finding E4):
- §2.4 lists "PDF, Word/DOCX, and Excel export pipelines" — DOCX export was
  removed in Milestone 40A. Remove the DOCX reference.
- §2.3 lists `tests/unit/form-fields.spec.js` and
  `tests/unit/filing-identity.contract.spec.js` as *new* specs to add. Both
  already exist (`form-fields.spec.js` in `tests/unit/`; the identity
  contract spec is `tests/e2e/filing-identity.contract.spec.ts`, not a
  `tests/unit/` file). Correct the paths and reframe as "extend" rather
  than "add," or name the actual gap if one remains.
- Add a short "Prerequisites" note near the top of §1 naming 42B, 42C, 42D,
  and 42F as required before implementation begins, per the sequencing
  decision above — so a reader who opens 41 first sees the gate immediately
  rather than discovering it only in this file.

**A10. Fix drifted proposal status lines** (this milestone's user-approved
scope: status-line correction only, no file moves):
- `MILESTONE-37-PROPOSAL.md`: currently reads "Draft only — do not
  implement yet." Verified landed: `10d90dd` (37-1/37-2/37-3), `f8d95d3`
  (37-4), `c032b3b`, `4d0afd5`. Before writing the new status line, check
  `MILESTONE-37-PROPOSAL.md`'s own task list against these four commits'
  diffs to confirm which numbered sub-items (37-1 through 37-7) are
  actually covered — this repository's own `MEMORY.md`-equivalent notes
  suggest 37-5/37-6/37-7 may have landed under different attribution or may
  remain open. Write the status line to match what is *actually* confirmed
  landed (e.g. "Landed: 37-1–37-4 (`10d90dd`, `f8d95d3`); verify 37-5–37-7
  against the task list before marking those closed" if full coverage
  cannot be confirmed) rather than asserting blanket completion.
- `MILESTONE-38A-PROPOSAL.md`, `MILESTONE-38B-PROPOSAL.md`,
  `MILESTONE-38D-PROPOSAL.md`: all three currently say "Executable,
  independent delivery specification," but all three landed together in
  one commit, `b0321dd` (2026-09-11) — confirmed via `git log
  --diff-filter=A` on `readiness-card.js` (38B),
  `guardian-compatibility.js` and the `schedule-definitions.js` changes
  (38A), and `output-authorization.js` (38D), all first appearing in that
  commit. `MILESTONE-38C-PROPOSAL.md` already correctly cites `b0321dd` as
  its landing commit — bring the other three in line with the same wording
  and date.

Do not touch `MILESTONE-40H-PROPOSAL.md`, `MILESTONE-40I-PROPOSAL.md`, or
`MILESTONE-40-PROPOSAL.md` in this task — 40H already marks itself Landed
correctly, and 40I is open, in-flight work by another session.

**A11. `README.md`** — new file at repo root. Thirty to fifty lines: what
the app is (Florida guardianship court-filing generator), the
classic-script + ES-module architecture in one paragraph
(`legacy-app.js` + `src/core/` + `src/features/`), how to run it
(`npm install`, `npm run dev`), how to test (`npm run test:unit`,
`npx playwright test tests/e2e/<spec>` per `AGENTS.md`'s lite-by-default
rule), and the four build/test targets (source/dev/web/portable) with a
pointer to `playwright.config.ts`'s own comment for detail. Point to
`AGENTS.md` as the operating contract, not a duplicate of it.

### Verification

`npm run test:unit` and the targeted specs touched by A4/A5 pass. Full
`npm test` is not required for this sub-delivery (no runtime code changes;
recommend it only after A2's renormalization, per `AGENTS.md`'s "recommend,
then ask" rule for cross-cutting changes) — run it once after A2 to confirm
the line-ending commit alone changed nothing behaviorally, then again is not
needed for the remaining, purely-textual steps.

### Cross-cutting ramifications (AGENTS §8)

Data Model: N/A. Legacy Migration: N/A. Test Coverage & Index: A4 is
exactly this — the new guard spec is the deliverable. Export/Import/
Portability: N/A. Security & Sensitivity: N/A. UI/UX: N/A. Legal/
Compliance: N/A.

---

## 42B — Close the Red Test Suite

**Relation:** Precedes 41 — a regression 41 introduces must be visible
against a clean baseline, not buried in nine already-red tests.
**Risk:** Low for the two known fixes (B1, B2); **unknown** for the seven
`pdf-preview-viewer.spec.ts` failures until investigated — Step 3 below is
explicitly an investigation, not a pre-decided fix, matching this
repository's own precedent for genuinely-unknown-root-cause items
(`MILESTONE-34-1-PROPOSAL.md`'s Phase D "evidence lab, not a fix").

### Files

`src/core/pdf/pdf-preview.js`, `tests/e2e/security.spec.ts`, and — pending
Step 3's finding — one or more of: `tests/e2e/pdf-preview-viewer.spec.ts`,
`src/core/filing/output-preflight.js`, each feature's `print.js`.

### Steps

**B1. Fix the CSP-dead "Reload Page" button.** In `pdf-preview.js`'s
stale-deployment error branch, the button is built as
`` `<br/><button type="button" class="btn btn-sm btn-primary mt-3" onclick="window.location.reload()">Reload Page</button>` ``
inside an `innerHTML` string. `index.html`'s CSP is `script-src 'self'`
with no `'unsafe-inline'`, so this handler never fires. Replace with DOM
construction and `addEventListener`, matching the working pattern already
used by `src/core/feature-bridge.js`'s `showLoadFailure()`:

```js
const actionBtn = document.createElement('button');
actionBtn.type = 'button';
actionBtn.className = 'btn btn-sm btn-primary mt-3';
actionBtn.textContent = 'Reload Page';
actionBtn.addEventListener('click', () => window.location.reload(), { once: true });
```

Build the error panel via `createElement`/`append` rather than a single
`innerHTML` template literal for this branch, so the button is a real node
with its listener attached before insertion.

New test: `tests/e2e/security.spec.ts` or a small addition to
`pdf-preview-viewer.spec.ts` that forces the chunk-load-error branch (the
`isChunkError` condition already checked in the code) and asserts a real
click on the rendered "Reload Page" button triggers a reload (Playwright
can assert on `page.on('framenavigated')` or a `beforeunload` firing, since
CSP-blocked inline handlers silently no-op — this test must fail on
pre-fix code to be a real regression guard, not merely pass post-fix).

**B2. Fix `security.spec.ts:53`'s false positive.** The regex
`/\son[a-z]+\s*=/i` matches any identifier starting with "on" preceded by
whitespace — `const onAbort = () => this.off(eventName, listener);` in
`src/core/pdf/pdf-annotate.js:24` trips it despite being an ordinary
variable declaration, not an event-attribute assignment. Tighten the check
so it only fires on genuine `on<event>=` attribute syntax:
- For `.html` files: keep matching inside tag content (`<[^>]*\son[a-z]+\s*=`).
- For `.js` files (source, not markup): the check should look for the
  *attribute-assignment* shape specifically — `on[a-z]+\s*=\s*["'\`]` (an
  assignment to a quoted string, as an inline handler would need) rather
  than a bare `=`, which also matches ordinary variable declarations. Add a
  unit test with both a true positive (a literal `onclick="..."` string
  built into an HTML template) and B1's exact false-positive shape as a
  case that must NOT trip it, so this regex cannot regress silently again.

Do these two first and independently verify `npx playwright test
tests/e2e/security.spec.ts` passes clean before Step 3, so the seven
remaining failures are isolated.

**B3. Investigate `pdf-preview-viewer.spec.ts:114`'s seven parametrized
failures** ("an incomplete filing's embedded preview is blocked, not
silently rendered," failing for all seven of Guardian/Annual/Simplified/
Plan Initial/Plan Annual/Plan Minor/Plan Simplified). This is one test
body parametrized over `FEATURES`, so it is very likely one root cause, not
seven independent ones.

- Reproduce locally: `npx playwright test tests/e2e/pdf-preview-viewer.spec.ts -g "embedded preview is blocked"` and read the actual failure
  (assertion mismatch vs. timeout vs. thrown error) — the review did not
  capture this detail; do not assume which without looking.
- Cross-reference `src/core/filing/output-preflight.js`'s
  `prepareFilingOutput()` and each feature's `print.js` call site for how
  `baseIssues` is threaded through — Milestone 34-1A's own history records
  a real bug here once (`pdf-preview.js` calling `prepareFilingOutput(D)`
  with no `baseIssues` argument); confirm whether Milestone 38D's
  affirmative-override work (`output-authorization.js`, landed in
  `b0321dd`) changed this contract in a way the test's expectations never
  caught up with, since that is the most likely intersection point in time.
- **Decision branch, to be resolved by what Step 3's investigation finds,
  not pre-decided here:**
  - If the product behavior is correct and the test's expectation is stale
    (e.g. it expects a block that 38D's override flow deliberately changed):
    update the test to match current, intended behavior, with a comment
    explaining why, and a new assertion proving the *replacement* guarantee
    (whatever 38D actually promises here) is upheld.
  - If the product behavior is wrong (a real regression in the export-block
    gate): fix the gate, following this test as the specification, and add
    the regression-guard discipline this repository requires — confirm the
    fix's own new/changed assertions fail against pre-fix code first.
- Either branch closes with `npx playwright test
  tests/e2e/pdf-preview-viewer.spec.ts` fully green.

**B4. `schedule-card-layout.spec.ts:177`** is Milestone 40I's own scope
(the `min-height`/label-alignment rule). Do not fix it here. If 40I has not
landed by the time B1–B3 are done, add
`skipEnvironmentLimitation`-equivalent classification — actually, per
`tests/e2e/support/target-profile.ts`'s three helpers, use
`skipTemporaryGap(condition, '40I', 'multi-column label alignment fix pending')`
around this one assertion so the suite reports 100% green (with one
classified, attributed skip) rather than a fourth "known" red. Once 40I
lands, remove the skip in the same commit that confirms it passes
unconditionally.

### Verification

`npm test` (full regression, per `AGENTS.md`'s recommend-then-ask rule —
recommend it here explicitly, since this sub-delivery's entire purpose is
the full-suite result): **0 failed, 0 unclassified skips** attributable to
this milestone. `tests/e2e/skip-classification-audit.spec.ts` continues to
pass (confirms B4's skip is properly classified, not a bare `test.skip()`).

### Cross-cutting ramifications (AGENTS §8)

Data Model: N/A. Legacy Migration: N/A. Test Coverage & Index: this
sub-delivery's entire content. Export/Import/Portability: B3's outcome may
touch the export-block gate directly — whichever branch is taken must
re-verify `checklist-export-parity.spec.js` still holds (readiness panel
and export validator must keep agreeing, per `AGENTS.md` §4's Parity
Invariant). Security & Sensitivity: B1/B2 are exactly this axis. UI/UX:
N/A. Legal/Compliance: N/A.

---

## 42C — `window.*` Bridge Inventory & Freeze

**Relation:** Precedes 41 — 41 adds a new module layer that will reach
through this same bridge from both sides; freezing it first means 41's own
additions are visible as intentional, reviewed growth rather than
indistinguishable from existing sprawl.

**Risk:** Low — this sub-delivery adds tests and one new support file; it
changes no runtime behavior.

### Files

New: `scripts/audit-window-bridge.mjs`, `tests/unit/window-bridge.spec.js`,
`tests/e2e/support/window-api.ts`. No existing runtime file changes.

### Steps

**C1. Promote the review's ad hoc analysis script into a permanent,
committed tool**, `scripts/audit-window-bridge.mjs`, that walks `src/**/*.js`
and reports:
- Every `window.X =` assignment site (file + name).
- Every `window.X` *read or call* site in a module other than the one that
  assigned it.
- The current totals, for a human-readable summary line (as of this
  writing: 303 assignments, 403 distinct consumed names — re-run to get the
  live numbers rather than hardcoding these into the script).

**C2. New unit spec `tests/unit/window-bridge.spec.js`** that runs the C1
script's assignment-site enumeration and compares it against a checked-in
allow-list, `tests/unit/fixtures/window-bridge-allowlist.json` (an array of
`{file, name}` pairs, generated once from C1's current output). The test
fails if the live enumeration contains an entry not in the allow-list
(a new, undeclared global was added) — it does **not** fail on an entry in
the allow-list that's gone missing (a global was removed, which is
progress, not a regression). This is the same shape as
`tests/e2e/skip-classification-audit.spec.ts`'s existing pattern: a
generated allow-list, policed by a test, updated deliberately in the same
commit as the change that grows it.

**C3. Type the 83 test-facing globals.** New
`tests/e2e/support/window-api.ts` exporting a typed interface (or a set of
narrow helper functions, e.g. `getCaseFile(page)`, `navigate(page, route)`)
covering the names e2e specs currently reach via bare
`(window as any).X` — starting with the top dozen by usage
(`navigate`, `D`, `caseFile`, `addWard`, `switchWard`,
`adaptValidationErrors`, `getCaseFile`, `loadGuardianPdf`,
`focusFieldByPath`, `autoSave`, `flushPendingSave`, `validateGuardian`) is
sufficient for this sub-delivery; the remaining ~70 lower-frequency names
can be typed opportunistically as specs are touched, not required
up front. Do **not** convert every existing `(window as any).X` call site
in this sub-delivery — that is a much larger, separate mechanical pass with
no functional payoff on its own; this step only establishes the typed
surface for new and touched tests to use going forward.

### Verification

`npx vitest run tests/unit/window-bridge.spec.js` passes against current
`master` (the allow-list matches reality at commit time).
`npx tsc --noEmit` remains clean (the new `window-api.ts` file must type-check;
it sits outside `tsconfig.json`'s current `include`, so add
`tests/e2e/support/**/*.ts` to `include` as part of this step — confirm
this doesn't newly fail on existing files in that directory before
committing).

### Cross-cutting ramifications (AGENTS §8)

Data Model: N/A. Legacy Migration: N/A. Test Coverage & Index: add the two
new spec/support files to `TEST-INDEX.md` in this commit, per `AGENTS.md`
§7. Export/Import/Portability: N/A. Security & Sensitivity: N/A. UI/UX:
N/A. Legal/Compliance: N/A.

---

## 42D — Unify the Three Form-Write Paths

**Relation:** Precedes 41 — Milestone 41 §2.2 states tri-state values "are
enforced at the field primitive level," which is not achievable while a
primitive's committed value can arrive through three differently-behaved
write paths.

**Risk:** Medium — touches the event-handling tail for every field write
across all nine filing types. Mitigated by extracting only the *already
common* tail behavior (verified identical in substance across all three
paths below), not rewriting the value-formatting logic that legitimately
differs per binding convention.

### Correction to the source review, verified during this proposal's drafting

The review characterized this as three parallel implementations rooted in
`persistFormControl()` (`core/form/form-contract.js`),
`persistAnnualControl()` (`annual-accounting/index.js`), and
`bindForms()`/`afterChange()` (`legacy-app.js`). Re-verified directly:
**`persistFormControl()` is not in `form-contract.js` — it is declared in
`src/form-events.js:24`, and it has zero call sites anywhere in the
codebase.** Every actual write for Simplified Accounting and all four Plan
types goes through `writeDraftValue()`/`finalizeFieldValue()` (exported
from `form-contract.js`, wired directly by `form-events.js`'s `input`/
`change`/`focusout` listeners). `persistFormControl()` is dead code —
several comments across `ward-county.js`, `party-resolver.js`,
`annual-accounting/index.js`, and `legacy-app.js` cite it by name and file
incorrectly; those citations are fixed in Step 4 below.

The real picture, confirmed by direct comparison of all three functions'
bodies:

| Path | Used by | Tail (duplicated across all three) |
| --- | --- | --- |
| `finalizeFieldValue()` (`form-contract.js:312`) | Simplified Accounting, all 4 Plan types (`data-form-path`) | `window.autoSave()`, `window.updateNavDots()`, `window.refreshWardInfoCard()`, `window.identitySlotForPath?.()` → `window.syncIdentityField()` |
| `persistAnnualControl()` (`annual-accounting/index.js:187`) | Annual/Final/Trust (`data-annual-path`) | Same four calls, plus `refreshAnnualTotals()` (Annual-specific — must stay local) and conditional `syncActiveWardNameDisplay()`/`syncGuardianNameDisplay()` (**not present** in `finalizeFieldValue()` — see Step 3) |
| `afterChange()` (`legacy-app.js:7861`) | Guardian Inventory (`data-bind`, via `bindForms()`) | Same four calls, plus Guardian-specific calc/summary DOM updates and the same conditional name-sync pair as Annual |
| — | — | `window.maybeCommitCoverCounty?.(path)` — called from `writeDraftValue()` on every `input` event for the shared path, but only at finalize-time in the other two (see Step 2) |

This is a materially better-scoped finding than the original review stated:
the fix is not "merge three implementations" but "extract one already-
duplicated tail into a shared function all three call," leaving each path's
genuinely-different value-formatting logic untouched.

### Files

`src/core/form/form-contract.js`, `src/features/annual-accounting/index.js`,
`src/legacy-app.js`, `src/form-events.js`, plus the four files with stale
`persistFormControl()` comments named in Step 4.

### Steps

**D1. Add a new exported function in `form-contract.js`**,
`runFieldWriteSideEffects(path)`, containing exactly the four-call tail
above (`autoSave`, `updateNavDots`, `refreshWardInfoCard`,
`identitySlotForPath`/`syncIdentityField`), reading each `window.*`
function defensively (`window.autoSave?.()`, matching the existing
optional-chaining style already used for `maybeCommitCoverCounty`).

**D2. Decide `maybeCommitCoverCounty`'s timing** (currently on every
keystroke for the shared path, finalize-only for the other two).
**DECISION (recommended default):** move it into `runFieldWriteSideEffects`
so all three paths commit county at the same point — finalize/blur, not
every keystroke, matching two of the three paths' existing behavior and
the commit-not-draft semantics `commitCoverCounty()`'s own name implies.
Confirm no existing test in `tests/e2e/cover-county.spec.ts` or
`tests/unit/filing-county-defaults.spec.js` depends on the input-event
timing before making this change; if one does, flag it in the commit
message and adjust the test's expectation deliberately rather than
silently, per this repository's established practice for a confirmed,
deliberate behavior change.

**D3. Replace each of the three tails** with a call to
`runFieldWriteSideEffects(path)`, keeping each path's own remaining
specific calls (`refreshAnnualTotals()`, the calc/summary DOM updates,
etc.) immediately after it. For the conditional `syncActiveWardNameDisplay()`/
`syncGuardianNameDisplay()` pair present in Annual and Guardian Inventory
but absent from the shared `finalizeFieldValue()` path: **investigate
before deciding** whether Simplified Accounting and the four Plan types
already get equivalent live-sidebar-name-update behavior some other way
(e.g. a broader re-render on save) or whether this is a genuine,
previously-undiscovered cross-type inconsistency. Write a small manual or
e2e check (edit a ward's name field on a Simplified Accounting filing,
confirm whether the sidebar ward-name display updates without a full page
navigation) before deciding whether to add the same conditional check into
`runFieldWriteSideEffects` universally. Record the finding either way in
the commit message.

**D4. Delete the dead `persistFormControl()` function** in
`src/form-events.js` (confirmed zero call sites in Step above). Fix the
four stale comments that cite it by the wrong file/status:
`core/navigation/ward-county.js:135`, `core/party-resolver.js:326`,
`features/annual-accounting/index.js:218,230`, `legacy-app.js:7869` — each
should instead point to `writeDraftValue()`/`finalizeFieldValue()` in
`form-contract.js` as the shared path for the six non-Annual, non-Guardian
filing types, or be removed if the comment's point is now fully covered by
the new `runFieldWriteSideEffects()` doc comment.

### Verification

New unit spec `tests/unit/form-write-side-effects.spec.js`: for each of the
three call sites, mock `window.autoSave`/`updateNavDots`/
`refreshWardInfoCard`/`identitySlotForPath`/`syncIdentityField` and assert
all four fire exactly once per committed write, for at least one field in
each of the three binding conventions (`data-form-path`, `data-annual-path`,
`data-bind`). Targeted e2e re-run: `cover-county.spec.ts`,
`carryover-workflow.spec.ts`, and one mount/contract spec per filing-type
family (guardian, annual, plan-annual) to confirm no visible regression in
autosave/nav-dot/ward-name-sync behavior. Full `npm test` recommended
before commit given this touches a shared path across every filing type
(per `AGENTS.md`'s cross-cutting-change rule) — ask before running it if
time-boxing this sub-delivery separately from 42B/42C/42F.

### Cross-cutting ramifications (AGENTS §8)

Data Model: N/A — no persisted shape changes. Legacy Migration: N/A.
Test Coverage & Index: new spec above, added to `TEST-INDEX.md`.
Export/Import/Portability: N/A. Security & Sensitivity: N/A. UI/UX: D3's
name-sync investigation may surface a real, small, cross-type UI
consistency gap — if so, fixing it is in scope for this sub-delivery since
it falls directly out of the unification. Legal/Compliance: N/A.

---

## 42E — Delete Runtime-Dead Legacy Twins

**Relation:** Independent — reduces `legacy-app.js`'s size and risk surface
but blocks nothing else in this proposal or in Milestone 41.

**Risk:** Low per tranche if each is verified as a true behavioral
superset before deletion (40F's established method); cumulative risk is
"death by a thousand cuts" if tranches are rushed — do not batch multiple
tranches into one commit.

### Files

`src/legacy-app.js` (deletions only), no other file changes except where a
tranche also removes a now-unnecessary `window.X =` line in the owning
module (there should be none needed — the module versions already declare
their own `window.X =`).

### Steps

Re-run the review's exact matching script first (`docs/app-review-2026-09-13.md`'s
appendix names the method: intersect `legacy-app.js`'s top-level
`function X(){}` declarations against every module's `window.X = ...`
assignments) against current `master` before starting, to confirm the list
below is still accurate and to resolve one open discrepancy: the review's
direct measurement found **44** such pairs; `MILESTONE-40F-PROPOSAL.md`'s
own catalog (inherited into `MILESTONE-40H-PROPOSAL.md`'s open-items
register) says **45**. Reconcile by re-running the matcher and diffing
its output against 40F's named distribution before deleting anything —
this reconciliation is itself Step 1, not assumed.

**E1. Tranche 1 — Encryption at rest** (`src/core/persistence/crypto.js`
owns the live versions): delete the dead bodies of `_b64FromBytes`,
`_bytesFromB64`, `generateSaltB64`, `deriveKeyFromPassword`, `encryptJSON`,
`decryptJSON`, `decryptJSONWithKey`, `deriveAndVerifyKey` from
`legacy-app.js` (approximate spans: `:1949`, `:1954`, `:1961`, `:1966`,
`:2001`, `:2010`, `:2877`, `:3545` — re-derive exact current line numbers
before editing, per this repository's citation-rot lesson). Before
deleting each: confirm `crypto.js`'s exported version is a strict
behavioral superset by reading both side by side (per 40F's method) —
this is the highest-consequence tranche in this sub-delivery, since a
subtly-wrong deletion here touches data-at-rest encryption; take the extra
care of running the full `tests/unit/case-file.spec.js` and every `.sav`
round-trip e2e spec after this tranche specifically, not just the targeted
subset.

**E2. Tranche 2 — Launch/persistence preferences**
(`src/core/persistence/launch-preferences.js` owns the live versions):
`hasOpenedCaseBefore`, `markCaseOpenedBefore`, `savePersistedCaseFileHandle`,
`loadPersistedCaseFileHandle`, `forgetPersistedCaseFileHandle`,
`runRememberedHandleOperation`, `readRememberedFile`,
`handleRememberedFileFailure`, `saveAppState`, `loadAppState`.

**E3. Tranche 3 — Session-restore cache and card pruning**
(`src/core/persistence/recovery-cache.js` and `src/core/form/prune-cards.js`
own the live versions): `saveSessionRestoreCache`, `clearSessionRestoreCache`,
`checkSessionRestoreCacheAtLaunch`, `isBlankCard`, `isBlankScheduleEntry`,
`pruneBlankCards`.

**E4. Tranche 4 — Ward lifecycle** (`src/core/navigation/ward-lifecycle.js`
owns the live versions — the largest tranche): `createWardId`,
`activateWard`, `unloadWard`, `addWard`, `switchWard`, `deleteWard`,
`renameWard`, `carrySourcesFor`, `carryWardsFor`, `carryOverFieldsForPlan`,
`carryOverFieldsForAccounting`. Note Milestone 40H-J very recently edited
the *live* `carryOverFieldsForAccounting()` in `ward-lifecycle.js` (nested
attorney-object carryover) — confirm that fix is present and unaffected
before deleting the dead twin, as a direct check that this tranche is
touching the right copy.

**E5. Tranche 5 — Remainder**: `convertTargetsFor`, `showConvertWardModal`,
`updateConvertTargetOptions`, `convertSourceItems`
(`core/modals/convert-ward-modal.js` owns the live versions);
`formatCityStateZip` (`form-contract.js`); `embeddedTemplate`
(`core/persistence/templates.js`); `duplicateAnnualRow`
(`annual-accounting/index.js`); and `main.js`'s re-exported
`activateWard`/`switchWard`, which are declared a third time there purely
as a `window.*` re-publish — confirm `main.js`'s re-export is still needed
(it may be redundant now that `ward-lifecycle.js` presumably already
exposes them on `window` directly; check before removing `main.js`'s
lines, since removing a genuinely-needed re-export would be a regression,
not a cleanup).

### Verification

Per tranche: `node --check src/legacy-app.js`, the targeted unit/e2e specs
for the owning module (e.g. `tests/unit/case-file.spec.js` for E1,
`tests/unit/ward-carryover.spec.js` + `tests/e2e/ward-lock.spec.ts` for
E4), and a `grep` confirming zero remaining references to the deleted
function names anywhere in `src/` outside the owning module and the (now
sole) `window.X =` line. Full `npm test` once after all five tranches land,
per `AGENTS.md`'s cross-cutting-change recommendation — this sub-delivery
touches `legacy-app.js` broadly even though each individual tranche is
narrow.

### Cross-cutting ramifications (AGENTS §8)

Data Model: N/A. Legacy Migration: N/A — E1/E2 touch code that *implements*
migration/persistence but change no behavior, only which copy of identical
logic runs (confirmed by the superset check required before each
deletion). Test Coverage & Index: no new specs required; existing coverage
is the verification. Export/Import/Portability: E1/E2 directly implement
`.sav` encryption and file-handle persistence — this is exactly why E1's
verification is scoped more heavily above. Security & Sensitivity: E1 is
the encryption-at-rest implementation; treat with the care stated in E1's
step. UI/UX: N/A. Legal/Compliance: N/A.

---

## 42F — Structured Validation Results (Full Conversion, All 9 Filing Types)

**Relation:** Precedes 41 — Milestone 41's Tier 2 cards will change field
labels; every changed label is currently a silent mis-route risk through
`validation-adapter.js`'s message-text matching. This is the largest and
highest-value sub-delivery in this milestone; it is also the one where the
review's original framing needed the most correction once verified, and
that correction substantially de-risks the work — see below.

**Risk:** Medium-high in aggregate (touches every filing type's
export-blocking logic), mitigated to low-per-phase by: (a) the receiving
side already exists and accepts a mixed rollout, (b) a self-verifying
oracle test design (Step 0) that catches a wrong path mapping
automatically rather than relying on manual review, and (c) one filing
type per commit with a full checkpoint after each.

### Correction to the source review, verified during this proposal's drafting

The review characterized this as needing a new `ValidationResult` shape to
be invented. **It already exists and is already accepted.**
`validation-adapter.js`'s `adaptValidationErrors()` (`:147`) opens with:

```js
if (err && typeof err === 'object' && err.message) {
  return {
    code: err.code || 'validation.error',
    section: err.section || '',
    path: err.path || '',
    label: err.label || err.message,
    route: err.route || resolveRouteFromSection(err.section, formType),
    severity: err.severity || 'required',
    message: err.message,
  };
}
// ...else parse err as a legacy bare string
```

No validator produces this shape today — every `errs.push(...)` call across
all seven validator functions pushes a bare string — but the adapter
already branches on `typeof err === 'object'` per-item, meaning **a
validator can emit a mix of structured objects and legacy strings in the
same array, safely, today, with zero adapter changes.** This is not a
future/target design; it is dead-but-functional capability already
sitting in the codebase. It also means `resolveRouteFromSection(section,
formType)` — the part of the adapter that maps a section label to a route —
is **not** part of the fragile surface the review's "380 `includes()`"
count was really about. That count is almost entirely the *separate*,
much larger `if/else` chain (`:206` onward) that derives **`path`** from
free-text pattern-matching against the message's `detail` half. Route
derivation from section labels is comparatively stable (a handful of exact-
match table lookups) and is **not** touched by this sub-delivery.

This reframes the actual task, more narrowly and more safely than the
review stated: **each validator needs to supply its own `path` (and,
trivially, let `section` be auto-derived from its existing `"Section —
Detail"` message convention) at the point where it already knows the exact
field it is validating** — which, for every row/collection validator, is
*easier* for the validator to state directly (it already has the loop
index in scope) than it is for the adapter to reverse-engineer via regex
after the fact.

### The mechanical procedure (this is what "ready to execute" means here)

For each filing type's validator, `validation-adapter.js`'s own existing
per-type `if/else` branch (found by section-prefix, e.g. `sLower.startsWith('a-1')`
for Guardian Inventory, or `formType === 'planSimplified'` for that Plan
type) **is the answer key.** Each `else if (dLower.includes('...')) path =
'some.path'` line already states the correct mapping from that field's
message wording to its correct dotted path — it has to, or `focusFieldByPath()`
would already be jumping to the wrong field today. Converting a validator
means: for every `errs.push(...)` call site in that validator, read the
adapter's corresponding branch to find what path it currently derives for
that exact message, and hard-code that same path directly at the push
site, as a new argument.

**Step 0 — build the self-verifying oracle *before* converting anything.**
Add a temporary export from `validation-adapter.js`,
`_legacyDerivePath(section, detail, formType)` — literally the existing
`:206`-onward `if/else` chain extracted into its own function, unchanged
byte-for-byte (this is a pure extraction, not a rewrite; verify with a
diff that the chain's logic is untouched). Write
`tests/unit/validation-path-conversion-oracle.spec.js`: for each filing
type, run its validator against a fixture that maximizes triggered issues
(reuse or extend each type's existing `fillMinimalValid*Ward()` fixture,
inverted to "leave everything blank"), and for every returned issue —
whether structured or a legacy string — assert that its resolved `path`
(the structured one directly, or `_legacyDerivePath()`'s output for a
still-unconverted string) is **non-empty** wherever the adapter's chain
would have produced a non-empty path for that message today, and, for any
issue already converted, that the two agree exactly. This test is
deliberately written to pass against **today's fully-unconverted** state
(everything routes through `_legacyDerivePath()` and agrees with itself)
— its value is that every subsequent phase's conversion is checked against
this same oracle, so a wrong hard-coded path is caught by "the new explicit
path disagrees with what the old regex chain would still say for that
message," not by manual inspection.

**Step 1 — add optional path parameters to the two shared cross-cutting
helpers**, since they are called from every validator and converting them
once has the widest leverage:
- `checkDateOrder()` (`src/core/validation/date-rules.js`): add
  `earlierPath`/`laterPath` to its options object; when both are given,
  return `{ message, section, path }` objects instead of bare strings
  (derive `section` from `sectionLabel` directly — it's already a
  parameter — no text-splitting needed here, unlike the general case).
  When omitted, keep returning bare strings (backward compatible for any
  call site not yet updated).
- `checkSignatureState()` (`src/core/validation/signature-state.js`):
  add `namePath`/`datePath`/`imagePath` options for its three possible
  messages; same conditional structured-vs-string behavior.

**Step 2 — convert filing types one per commit**, in this order (smallest
and most-isolated first, building confidence before the two largest):
1. Plan Simplified (`plan-simplified/index.js` — smallest validator, ~50 lines)
2. Plan Minor (`plan-minor/index.js`)
3. Plan Initial (`plan-initial/index.js`)
4. Plan Annual (`plan-annual/index.js`)
5. Simplified Accounting (`simplified-accounting/index.js`)
6. Guardian Inventory (`guardian-inventory/index.js` — has the most
   row/collection schedules; do this after the Plan types establish the
   pattern for row-indexed paths)
7. Annual Accounting (`annual-accounting/index.js` — covers
   annual/final/trust; largest and last)

For each: replace the local `req(value, label)` helper (present in each
validator, per the `plan-simplified/index.js` example already read
directly during this proposal's drafting) with a version taking a third
`path` argument, building `{ message: label, section: <derived from " — "
split, same as the oracle>, path }`; do the same at every bare
`errs.push('literal string')` call site; pass `earlierPath`/`laterPath` and
`namePath`/`datePath`/`imagePath` into every `checkDateOrder`/
`checkSignatureState` call using Step 1's new options. For every
row/collection loop (e.g. Guardian Inventory's Schedule A/B/C/D pushes),
the path is `` `schedule${X}.${rowIdx}.<field>` `` using the loop's own
index variable directly — the adapter's `rowMatch`/`guardianOrdMatch`/
`recipientMatch` regex parsing (which exists purely to recover an index the
validator already has) becomes unnecessary for every converted call site.

After each filing type: run `tests/unit/validation-path-conversion-oracle.spec.js`
(it must show 100% agreement for every issue that type's validator can
produce against the maximally-blank fixture) plus that type's existing
mount/contract/parity specs
(`plan-simplified-parity.spec.js`, `plan-minor-parity.spec.js`, etc. —
already exist and assert readiness/export parity, which must be unaffected
by this change since no requiredness logic changes, only how each issue
reports its own location) before moving to the next type.

**Step 3 — prune, only after all seven validators are 100% converted**
(confirmed by the oracle test reporting zero remaining bare-string issues
across all nine filing types' maximally-blank fixtures): delete the large
`:206`-onward path-derivation `if/else` chain from `validation-adapter.js`,
keeping only `resolveRouteFromSection()` (untouched) and the thin
object-passthrough branch. Delete `_legacyDerivePath()` and the oracle
test's dependency on it, converting that spec into a permanent regression
guard asserting every validator's output has a non-empty `path` for every
issue (still valuable long-term, now without the legacy-comparison
machinery). This is the step that actually removes the ~380 `includes()`/
57 `startsWith()` matchers the review counted.

### Files

`src/core/validation/validation-adapter.js`,
`src/core/validation/date-rules.js`, `src/core/validation/signature-state.js`,
and the `index.js` of all seven feature modules named in Step 2.

### Verification

Per phase: the oracle spec plus that type's existing parity/contract specs,
green. After Step 3: full `npm test` — this is the single change in this
milestone most likely to have a subtle miss (a wrong path silently sending
a "Go to field" click somewhere wrong), so the full regression here is not
optional; run it and read the `pdf-preview-viewer.spec.ts`/
`checklist-export-parity.spec.js`/`*-parity.spec.js` results specifically,
not just the pass count.

### Cross-cutting ramifications (AGENTS §8)

Data Model: N/A — no persisted field changes; `path` values are the same
dotted strings already used by `data-form-path`/`data-bind`/
`data-annual-path` attributes, just supplied explicitly instead of
regex-derived. Legacy Migration: N/A. Test Coverage & Index: the oracle
spec (Step 0) plus its post-Step-3 conversion into a permanent guard, added
to `TEST-INDEX.md`. Export/Import/Portability: `checklist-export-parity.spec.js`'s
`KNOWN_GAPS` allow-list must be re-verified unchanged after each phase —
this change must not alter *which* fields are required, only how their
location is reported. Security & Sensitivity: N/A. UI/UX: `focusFieldByPath()`'s
"jump to field" behavior is the direct, user-visible beneficiary — a
misrouted jump is the failure mode this sub-delivery eliminates; verify it
positively (click through at least one "Go to section" link per filing
type post-conversion, not just via the oracle). Legal/Compliance: N/A —
no validation rule's substance changes, only its internal reporting.

---

## 42G — Filing-Type Registry Consolidation

**Relation:** Independent — makes adding a tenth filing type cheaper, but
blocks nothing else here or in Milestone 41.

**Risk:** Medium — touches dispatch tables used by every filing type, so a
mistake is broad, but each derivation is independently verifiable against
the existing hand-maintained table it replaces.

### Files

`src/core/filing/filing-descriptor.js` (becomes the registry),
`src/legacy-app.js` (`PAGES_*` tables, `CARRY_SOURCE_TYPE` usage sites),
`src/features-loader.js`, `src/core/form/prune-cards.js`,
`src/features/dashboard/view-model.js`, `src/core/types/filing.js`.

### Steps

**G1.** Confirm `filing-descriptor.js` already holds engine mapping and
display data for all nine types (it does, per the review's direct count:
26 filing-type literals, 9 distinct keys). Add whatever is currently
missing there so it can become the single source: page lists
(`PAGES_GUARDIAN`, `PAGES_ANNUAL`, etc., currently in `legacy-app.js`),
carry-source eligibility (`CARRY_SOURCE_TYPE`, currently in
`ward-lifecycle.js` — confirm this isn't already the intended home before
moving it; `ward-lifecycle.js` may be the correct place and
`filing-descriptor.js` the wrong one — decide based on which module the
other eight consuming files already import from, minimizing new
cross-module dependencies), and the feature-loader function reference
(currently a hand-written `switch` in `features-loader.js`).

**G2.** Replace each of the nine `src/` files' independent
≥4-key enumerations (per the review: `legacy-app.js`, `ward-lifecycle.js`,
`filing-descriptor.js` itself, `validation-adapter.js`, `prune-cards.js`,
`types/filing.js`, `dashboard/view-model.js`, `state.js`, `router.js`) with
a derivation from the new registry, one file at a time, each independently
testable against that file's existing behavior (e.g. `prune-cards.js`'s
per-type blank-detection rules should produce byte-identical output before
and after switching from a hardcoded list to a registry-derived one — write
this as an explicit before/after comparison test if one doesn't already
exist for that file).

**G3.** New unit spec `tests/unit/filing-type-enumeration-guard.spec.js`:
asserts no file under `src/` other than `filing-descriptor.js` itself (and
its designated carry-source home, if different per G1) contains ≥4 distinct
filing-type-key string literals. This is the permanent guard preventing
the next new filing type from re-fragmenting the registry.

### Verification

Full `npm test` (this touches dispatch used by every filing type across the
whole app) — recommend explicitly per `AGENTS.md`'s cross-cutting rule.

### Cross-cutting ramifications (AGENTS §8)

Data Model: N/A. Legacy Migration: N/A. Test Coverage & Index: G3's new
guard spec. Export/Import/Portability: carry-source eligibility
(`CARRY_SOURCE_TYPE`) directly gates the "New Filing from Existing" import
path — verify `carryover-workflow.spec.ts` unaffected. Security &
Sensitivity: N/A. UI/UX: N/A. Legal/Compliance: N/A.

---

## 42H — Shipped Build Weight Cleanup

**Relation:** Independent.

**Risk:** Low — removes files from the build output only; the underlying
functionality (OCR, a greenfield starter kit) was already confirmed retired
or never runtime-referenced.

### Files

`vite.config.js`, `lib/tesseract/` (deleted), `templates/ui-starter/`
(deleted), `lib/VENDORED-LIBRARIES.md`.

### Steps

**H1.** Confirm zero runtime references to `tesseract`/`ui-starter` outside
comments and `VENDORED-LIBRARIES.md` itself (the review already confirmed
this — `tesseract.js` has been retired since Milestone 23, per that file's
own text; re-run `grep -rn "tesseract\|ui-starter" src index.html
scripts` immediately before deleting, to catch anything introduced since).

**H2.** Remove `lib/tesseract/` (5 files, ~9.5 MB) and
`templates/ui-starter/` from `vite.config.js`'s `STATIC_COPY_TARGETS`
(currently copies `lib` and `templates` wholesale — change to copy only
the subdirectories/files still needed, or add explicit exclusions if
`vite-plugin-static-copy` supports an `ignore` pattern per target).
`git rm -r lib/tesseract templates/ui-starter`.

**H3.** Update `lib/VENDORED-LIBRARIES.md`'s `tesseract.js` entry to state
it has been fully removed as of this milestone (not just "may remain until
the next cleanup" — this *is* that cleanup), with the commit sha.

**H4.** Rebuild both targets (`npm run build`) and confirm: `du -sh
dist/web dist/portable` shows the expected ~9.5 MB+ reduction, and the
generated service worker (`scripts/generate-service-worker.mjs`'s output)
no longer lists any `tesseract` or `ui-starter` path in its precache
manifest (its file-walk is over the actual build output directory, so
removing the source files is sufficient — no separate SW code change is
needed, but confirm this by inspection rather than assumption).

### Verification

`npm run build` succeeds for both `web` and `portable` targets.
`npx playwright test tests/e2e/offline.spec.ts` (the hosted offline suite,
already run in CI per `.github/workflows/probate-guardian-tests.yml`)
passes, confirming the service worker's offline guarantees are unaffected
by removing files that were never part of the app's own runtime path.

### Cross-cutting ramifications (AGENTS §8)

Data Model: N/A. Legacy Migration: N/A. Test Coverage & Index: N/A (no
test file changes). Export/Import/Portability: N/A — OCR was already
retired from the supplemental-document pipeline in Milestone 23; this
removes only leftover vendored bytes. Security & Sensitivity: reduces
attack surface (one fewer parser shipped, even if unreferenced). UI/UX:
N/A. Legal/Compliance: N/A.

---

## Full-milestone verification, once all eight sub-deliveries have landed

`npm test` — full green, zero unclassified failures, matching 42B's exit
criterion still holding after 42D/42E/42F/42G's later changes. Re-run
`docs/app-review-2026-09-13.md`'s appendix commands (or `scripts/audit-window-bridge.mjs`
from 42C) and record the new numbers in a short closing note appended to
this file, the same way `MILESTONE-40H-PROPOSAL.md` recorded its own
implementation-time corrections in place — this milestone is exactly the
kind of work where "we said we'd remove X" should be checked against "X is
actually gone," not assumed.

### Closing note (2026-09-14)

**All eight sub-deliveries confirmed landed directly via `git log`, not
assumed from status text:** 42A (`e805ab5`, `7b182c3`), 42B (`5b8da75`),
42C (`b5ec9d3`), 42D (`c42f903`), 42E (`a5b5b52`, `bd122e6`), 42F
(`5088c27`, `c168799`), 42G (`3890669`), 42H (`1fafa80`).

**`npm test` full green** — 786/786 unit, 517/523 e2e passed with 6
intentionally skipped, zero failures. This was not the first attempt: the
first full run this session (before the fix below) found 2 real e2e
failures, both traced to a single root cause and fixed — see "A regression
found by this closing run, not by any sub-delivery's own verification"
below.

**Appendix commands re-run against current `master`, compared to the
review's `d764e1e` baseline:**

| Metric | Baseline (`d764e1e`) | Now | Sub-delivery |
| --- | --- | --- | --- |
| `validation-adapter.js` `.includes()` / `.startsWith()` | 380 / 57 | 7 / 1 | 42F |
| Working-tree line endings, `w/mixed` | 14 | 0 | 42A |
| `lib/tesseract` tracked in git | present (9.5 MB) | 0 files | 42H |
| `templates/ui-starter` tracked in git | present | 0 files | 42H |
| `dist/web` / `dist/portable` | ~27 MB / ~26 MB | 14 MB / 13 MB | 42H |
| `filing-type-enumeration-guard.spec.js` | did not exist | 2/2 passing | 42G |
| Shadowed legacy twins (`scripts/audit-window-bridge.mjs`) | not measured this way | 0 | 42E |
| `jszip`/`pdf-lib`/`pdfjs-dist` in `package.json` | `dependencies` | `devDependencies` | 42A (A3) |

**One number moved the wrong direction, and it is not a 42-scope
shortfall:** direct `window.D` reads (`grep -rho '\bwindow\.D\b' src`) went
from 305 to 424, not down. 42D's own scope (re-verified above, "Correction
to the source review") was never about reducing `window.D`/`getD()` reads
— it unifies the post-write side-effect *tail* across the three binding
paths, leaving each path's read/write style untouched. The likely source
is later work this milestone doesn't own: Milestone 41-3's page-by-page
migration out of `legacy-app.js` is, as of this note, still landing new
feature-module files that read `window.D` directly rather than through
`getD()` — a real, separate drift worth its own finding if Milestone 41
doesn't already plan to correct it, but not evidence against anything 42D
claimed or delivered.

**A regression found by this closing run, not by any sub-delivery's own
verification:** the first `npm test` run here (2026-09-14, before any fix)
was not green — `ward-lock.spec.ts`'s "entering the dashboard releases the
ward lock" and `backup-restore-sav.spec.ts`'s "Open Backup replacing
actively open ward" both failed. Neither failure's own assertion names a
normalization bug (one asserts `Object.keys(window.D).length === 0` and
got `16`; the other's `waitForFunction` waiting on the same condition
timed out and surfaced as a 60s test-timeout inside its own cleanup,
masking the real cause). Root cause, confirmed by direct read of
`legacy-app.js`: `setD({})` (`src/core/state.js`, added by Milestone 38E's
`48b39b77` on 2026-09-11) unconditionally runs `normalizeWardData(d)`
whenever `d` is truthy — and `{}` is truthy. Every `/dashboard`
navigation's `enterDashboardEditingFocus()` calls `setD({})` to mean "no
active ward," but `normalizeWardData()`'s top-level `migrateBoolean()`
calls (three named booleans plus the 13 `q7*` keys) backfill `''` onto any
merely-*absent* field, so the "empty" sentinel silently grew 16
blank-string keys the instant it was set. `legacy-app.js`'s own
`lockApp()` sets `window.D={}` directly for the same purpose and was never
affected, which is why this had gone unnoticed since 38E landed. Fixed
with a one-line guard in `normalizeWardData()` (empty object returns
unchanged); pinned with a new direct regression test in
`tests/e2e/legacy-ward-data-normalization.spec.ts`, confirmed failing
(16 keys) before the fix and passing after; both originally-failing tests
confirmed passing after the fix; full suite re-run clean (786/786 unit,
517/523 e2e, the figures recorded above). Landed as `e4b6d23`, separately
from this milestone's own eight sub-delivery commits since it is a defect
in 38E's code, found incidentally while closing 42, not a 42 deliverable
itself. This is the same "milestone lands without a full-suite run, a
later closing pass finds what it missed" pattern `MILESTONE-44-PROPOSAL.md`
independently records for 38E elsewhere — see that document's own closing
note.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
