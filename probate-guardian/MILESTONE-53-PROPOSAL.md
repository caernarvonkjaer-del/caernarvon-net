# Milestone 53: The Excel Cell-Reader Cluster Crosses the Script Boundary — Executable Delivery Index

## Status

**Landed in full, 2026-09-16.** Alan approved the whole milestone ("Execute
MS 53 in dependency order then alpha order"), which is 53A → 53B, then 53C and
53D. All four sub-deliveries are on `master`:

| Sub-delivery | Commit | Verification |
| --- | --- | --- |
| 53A — Delete dead `fmtDateCard` | `086cf54` | Red-first detector (red naming `fmtDateCard`, green after); `date-truncation-helpers` + `window-bridge` unaffected; 14 deletions, 0 additions |
| 53B — Move the cluster to `cell-reader.js` | `01630fa` | 36-row shape matrix green against the EXTRACTED LEGACY bodies before the move, then flipped to the ES import; new e2e import gate green pre-move; **both B12 faults confirmed red**; `.d.ts` diff exactly one line; `check:types` byte-identical to baseline; e2e 39/39 |
| 53C — `fmtD` adopts core `fmtDate` | `261261a` | `expect(fmtD).toBe(fmtDate)`; unit 50/50; e2e 18/18; rendered sworn statement read in a real browser |
| 53D — AST-based bridge audit | `e0d99be` | 16-row parser fixture table; 39 names added to the `.d.ts`, none removed; allow-list untouched; `check:types` unchanged |

**Closing regression:** full unit suite **79 files / 914 tests, all passing**,
run at the end of the milestone rather than per sub-delivery.
`npm run verify:data-model`: 914 rows, clean, and unchanged — correct for a
milestone that moved code without touching a single persisted shape. The
production Vite build also succeeds (124 modules transformed), which is the
check that the three feature modules' new `import` of `cell-reader.js`
resolves in a real bundle and not only under vitest's resolver.

**Full e2e suite: 580 passed, 6 skipped, 0 failed** (20.5 min, exit 0) — run
to completion at the end of this milestone. The pre-53 baseline earlier the
same day was 576 passed / 6 skipped, and the difference is accounted for: this
milestone added two tests (`excel-import-cell-shapes.spec.ts`'s import gate and
its runtime globals-gone assertion), with the remainder from an authorized
concurrent side task (Codex, Preview-and-Export card controls, documented in
`MILESTONE-54-PROPOSAL.md`).

Recorded with one caveat stated rather than buried: that side task was editing
the working tree while this run was in flight, and Playwright's default
`source` target is `vite preview --outDir .`, which serves source **from disk
per request** rather than from a frozen build — so the run spans more than one
tree state. Its edits landing inside the window were comment rewrites (and its
own spec/doc files), which are behavior-neutral, and the suite came back fully
green, so the result stands. The per-sub-delivery e2e evidence above was each
gathered against a stable tree regardless: 39/39 for 53B (the new import gate
plus all four Excel round-trips, which were 37/37 before the move), 18/18 for
53C.

**What the execution found that the plan did not predict.** Recorded here
rather than only in commit messages, per this repository's convention:

1. **53C's C1 snippet, as originally written, was a runtime bug** — caught in
   review before execution, not by a failing test. `export { fmtDate as fmtD }`
   renames only the external export and creates no local `fmtD` binding, so
   the three bare `fmtD(...)` call sites in the attestation and the
   preparer/attorney statements would have thrown `ReferenceError`. Fixed to
   `import { fmtDate as fmtD }`; the wrong form is recorded in 53C's own
   section so it is not reintroduced.
2. **53D's original regex design was unsound and was replaced outright.** See
   53D's "Why the design changed." The premise that TypeScript's compiler API
   was available turned out to be false — typescript@7 is the native port and
   exports only `version`/`versionMajorMinor` — so `acorn` was added as a
   devDependency instead, on Alan's explicit decision.
3. **B12's Date-guard fault injection reproduced the real bug the guard
   exists to prevent**, through a real browser import: expected
   `"2026-03-15"`, received `"Sat Mar 14"` — wrong format *and* off by a day.
   That is the strongest evidence in this milestone that the gate is not
   vacuous, and it is exactly the failure `656cccf` fixed.
4. **The `readCellText` entry in `window-bridge.d.ts` was confirmed to be a
   comment artifact**, as finding 3 predicted: rewriting `excel-engine.js`'s
   header to drop the literal token `window.readCellText` made it vanish, with
   no code change to any consumer. Once 53D landed, the parser-aware audit
   independently reported zero consumers for all four names — a mechanical
   confirmation of the hand-done text-search inventory 53B relied on (D4's
   purpose, obtained in the only direction that works given the landing order).

The original Draft text is kept below as the historical proposal. Per
`AGENTS.md` §2 it was a proposal only until the approval above; nothing in it
should be read as authorizing anything further.

**Original status (historical):** Draft — not an authorization to implement
anything below. Per `AGENTS.md` §2, this is a proposal only; nothing here
should be started until Alan explicitly approves a specific sub-delivery by
name. Approval of one sub-delivery does not authorize the others. 53A is a
prerequisite for 53B; 53C and 53D are optional and independently approvable.

**Numbering note.** 53 is free — checked against `src/`, `tests/`, every
`*.md`, and `git log --grep=53` on 2026-09-16 at `73496e8`. The only hits for
the string "53" are unrelated commit hashes and Milestone 40-era SHAs.

**Concurrency note, refreshed 2026-09-16 (current HEAD `55a3d5e`).** The
paragraph below described Milestone 54 as Antigravity's in-flight,
uncommitted work; that is now stale — Milestone 54 (circuit selector,
per-county Helpful Links, and the code review that preceded it) landed in
full and is closed. See `MILESTONE-54-PROPOSAL.md` for its status and change
record. No file Milestone 54 touched overlaps any file 53A–D touch (confirmed
against the actual landed diff, not the snapshot below), so the substance of
this document's premise is unaffected — only this paragraph's tense was
wrong. Left below for its historical record of what was true when this
document was first drafted (`de72b6f`, 21:21:57 on 2026-09-16 — before
Milestone 54 or its own follow-up commits landed).

**Concurrent work (historical, as observed while drafting this document).**
Antigravity is writing Milestone 54 (dashboard "helpful links" handling) on
this same tree. Its uncommitted working-tree footprint as observed on
2026-09-16 was `MILESTONE-54-PROPOSAL.md`,
`probate-guardian-data-model.csv`, `src/core/persistence/case-file.js`,
`src/core/persistence/recovery-cache.js`, `src/core/state.js`,
`src/features/dashboard/index.js`, `src/features/dashboard/resources.js`,
and `src/styles/shell.css` — broader than the last dashboard-resources
commit (`7e9596e`) but still **no file 53 touches**. The one file both are
likely to edit is `TEST-INDEX.md` (each adds rows); that is a trivial
line-level merge, not a correctness risk. See "Sequencing and concurrency"
for the sync rule anyway — re-verify actual overlap at the time 53 actually
starts rather than trusting either snapshot.

**Execution environment note.** Every shell command in this document (`grep`,
`sed`, `ls`, heredoc commit messages, `npm run …`) is POSIX/Bash syntax,
intended to run through a Bash-capable tool (Git Bash or equivalent), not
raw Windows PowerShell — `npm` resolves cleanly there but a plain PowerShell
session blocks `npm.ps1` by default. This is a documentation note, not an
execution blocker: an agent with Bash-tool access runs these exactly as
written.

---

## What this milestone is, in one paragraph

`legacy-app.js` defines three functions — `fmtDate` (`:978`),
`unwrapCellValue` (`:1211`), and `readCellText` (`:1233`) — whose **only
callers in the entire application** are the Excel *import* paths of the three
feature `excel.js` files, which reach them by destructuring off `window`
(`annual-accounting/excel.js:23`, `guardian-inventory/excel.js:19`,
`simplified-accounting/excel.js:14`). They are the parse-side twins of the
writers Milestone 51D already moved into `src/core/excel/excel-engine.js`.
This milestone moves the three into one ES module, switches the three
consumers to `import`, and deletes the classic-script originals — leaving
**one implementation, reached one way**, with the import direction gated the
way 51D gated the export direction.

---

## Source and verification status

This proposal descends from a single "known follow-up" that two earlier
documents recorded rather than executed:

- `MILESTONE-51-PROPOSAL.md`, Decision D8 ("Leave `readCellText`'s
  passthrough in place, documented") and its "Deliberately out of scope"
  entry ("`readCellText` passthrough → left in place, blocker documented in
  `excel-engine.js`").
- `src/core/excel/excel-engine.js:60-79`, the header block titled "WHY
  readCellText CANNOT SIMPLY MOVE TO CORE", which ends: "Do not re-raise this
  as a trivial one-function swap; it is a cluster move or nothing."

This document takes that instruction at its word: it is the cluster move.
Every claim below was re-derived from current `master` (`73496e8`,
2026-09-16), not copied from those two sources — and three things they said
turned out to be **different today** than when they were written. Recorded
here rather than silently corrected, per this repository's convention:

1. **There is no passthrough left to unwind.** 51's out-of-scope entry and
   52's summary both describe "the `readCellText` passthrough." 51D itself
   deleted that passthrough (`5328954`): `excel-engine.js` no longer defines
   `readCellText` at all. What remains is the *shape* the passthrough
   existed to paper over — three ES modules reaching into a classic script
   through `window` for a function that has no other consumer. So the
   correct framing is not "unwind a wrapper" but "move a cluster and delete
   three globals," which is what the `excel-engine.js` header already says.

2. **The feared failure mode cannot occur.** The header's reason for leaving
   the cluster alone was that moving `readCellText` alone "leaves a core
   function reaching back through `window` for two helpers." That would be
   true only if `legacy-app.js` still needed `fmtDate` or `unwrapCellValue`
   after the move — and it does not. A full-source search finds exactly two
   callers of `fmtDate` inside `legacy-app.js`: `readCellText` itself
   (`:1236`) and `fmtDateCard` (`:989`). `unwrapCellValue` has one caller
   (`readCellText`, `:1234`) plus its own recursion. `readCellText` has
   **none** — `legacy-app.js` contains no `.getCell(` outside a comment
   (`:1226`). And `fmtDateCard` is **dead**: its only reference in the
   repository is its own declaration (`:988`). Its dashboard caller left in
   `5d318ed` ("Extract dashboard into lazy feature module"), which is the
   last commit `git log -S"fmtDateCard("` reports before the one that created
   `legacy-app.js`. So once `fmtDateCard` is deleted, nothing in
   `legacy-app.js` needs any of the three — the whole cluster can leave with
   no `window` reach-back in either direction.

3. **The bridge audit cannot see these consumers, and the one entry it does
   show is an artifact.** `scripts/audit-window-bridge.mjs:81` detects
   consumers with `/\bwindow\.([A-Za-z_$][\w$]*)/` — member access only. The
   three feature files use `const { readCellText, ... } = window`, which that
   regex never matches. `unwrapCellValue` therefore appears **nowhere** in
   `src/core/types/window-bridge.d.ts` despite two live module consumers.
   `readCellText` *does* appear (`window-bridge.d.ts:316`) — but only
   because the regex does not skip comments, and `excel-engine.js:54` says
   "delegated to window.readCellText" in prose. Two consequences for this
   milestone: the consumer inventory in this document was done by
   repository-wide text search (`src/`, `fragments/`, `index.html`, `sw.js`,
   `tests/`), not by the audit; and after 53B rewrites that comment and
   regenerates the declaration, `readCellText` should vanish from the `.d.ts`
   — which is listed below as an acceptance criterion, because its
   disappearance is evidence the last textual trace is gone. Optional 53D
   closes the blind spot itself.

Two further facts that shape the design, verified the same way:

4. **These globals have no `window.X =` line to delete.** All three (and
   `fmtDateCard`) are top-level `function` declarations in a classic script,
   which the browser exposes on `window` implicitly. Deleting the
   declarations *is* deleting the globals. `tests/unit/fixtures/window-bridge-allowlist.json`
   has no entry for any of them (the allow-list tracks explicit assignments
   only), so 53B changes that file not at all. Because nothing static can
   prove the globals are gone at runtime, 53B adds a runtime assertion.

5. **`fmtDate` has a character-identical twin in module land.**
   `src/features/annual-accounting/index.js:344`'s exported `fmtD` is the
   same body, token for token. Milestone 51's `fmtDate` audit grouped these
   two as "A1" and left them alone because both were reachable only from
   different worlds. After 53B they are both ES-importable, which makes the
   duplication trivially removable — optional 53C.

---

## Why this is one milestone and not one commit

The move itself (53B) is small in diff terms: a new ~50-line module, two
lines changed in each of three feature files, ~40 lines deleted from
`legacy-app.js`, one header comment rewritten, one generated file
regenerated. What earns it a milestone document is the same thing that
earned 51D one — it changes which code runs on a path that produces a
document filed with a Florida probate court, and `AGENTS.md` §1 says that
kind of change gets recommended for a full regression run and gated by
evidence rather than by "tests pass." The gate here is the mirror of 51D's:
51D proved the **export** direction unchanged cell-by-cell; 53B must prove
the **import** direction unchanged shape-by-shape — including the cell shapes
(formula, rich text, hyperlink, error, native Date) that an app-generated
workbook never contains and so no existing round-trip test exercises.

The prerequisite (53A) and the two optional follow-ons (53C, 53D) are
separated so each can be approved, executed, and reverted on its own.

---

## How this index is organized

| Sub-delivery | Risk | What it is | Relation |
| --- | --- | --- | --- |
| 53A — Delete dead `fmtDateCard` (**landed `086cf54`**) | **Low** | One dead function, red-first dead-code detector | Prerequisite for 53B: it is the only other `fmtDate` caller in `legacy-app.js` |
| 53B — Move the cluster to `src/core/excel/cell-reader.js` (**landed `01630fa`**) | **Medium** | The milestone. Three functions move, three consumers switch to `import`, three globals go | Requires 53A landed. Independent of 53C/53D |
| 53C — Annual Accounting's `fmtD` adopts core `fmtDate` (**landed `261261a`**) | **Low** (optional) | One character-identical twin removed | Requires 53B. Own approval |
| 53D — Teach the bridge audit to see `const {…} = window` (**landed `e0d99be`**) | **Low** (optional) | Governance: closes the blind spot finding 3 describes | Independent of 53A–C. Own approval. Regenerates `window-bridge.d.ts` |

Recommended execution order: **53A → 53B**, then 53C and 53D in either
order if approved. 53D can also run first or concurrently — see Sequencing.

---

## Decisions taken during scoping

**Decision 1 — Destination is a new module, `src/core/excel/cell-reader.js`,
not `excel-engine.js`.** Three reasons, in descending weight. (a)
`excel-engine.js`'s 51D header is a contract about what that module
deliberately *does not* contain: it records that the old core readers
(`readCellNumber`, `readCellDate`, `readCellText`, …) were deleted, and why
their semantics were **not** interchangeable with the features' local
readers. Putting a `readCellText` back into that file — even the correct
one — makes that history harder to read, and invites a future reader to
assume the deleted 0-for-unparseable `readCellNumber` might be "next." (b)
Direction: `excel-engine.js` is the writer (`setCell`, `sanitizeCellValue`,
`saveWorkbookFile`); the cluster is the reader. The three feature files
already keep these apart, and `src/core/excel/` already has the precedent of
small single-purpose modules (`excel-capacity.js`, `exceljs-loader.js`).
(c) `cell-reader.js` has zero imports — it is three pure functions — so it
cannot participate in any load-order or circular-import concern, which
`excel-engine.js` (importing `exceljs-loader.js`) could in principle. The
alternative — appending to `excel-engine.js` — was rejected on (a) alone.

**Decision 2 — `fmtDate` moves with the cluster and is exported, byte-identical.**
Three options were considered. *(i)* Make it a private helper inside
`cell-reader.js` (its only surviving caller after 53A is `readCellText`).
*(ii)* Export it from `cell-reader.js`. *(iii)* Give it its own
`src/core/…/iso-date.js`. Chosen: (ii). Against (i): exporting costs
nothing and turns `tests/unit/date-truncation-helpers.spec.js`'s source-scan
for this copy into a real behavioral test (that spec currently says "the
only Group A copy that is importable" is annual's `fmtD` — after 53B there
are two), and it is what makes 53C possible at all. Against (iii): one
caller today, and 52H's precedent is to choose a home by who imports it,
not by what the function might someday be for. If 53C lands and a
*non-Excel* importer later appears, relocating a one-line function is a
one-line follow-up; deciding that now is speculation.
**The body does not change in 53B.** Including the `instanceof Date` guard
and its `toISOString()` normalization from `656cccf`, and including the
comment block at `legacy-app.js:970-977` that explains why the guard is
load-bearing — that comment moves with the function.

**Decision 3 — Bodies move byte-for-byte; no tidying in the move commit.**
There is one visible micro-simplification available: `readCellText:1236`
calls `fmtDate(v.toISOString())`, and since `fmtDate` guards `Date` itself,
`fmtDate(v)` would return the same string. It is not taken. The whole
evidentiary basis of 53B is "the function that runs after is the function
that ran before"; a change that is *provably* equivalent still has to be
proven, and that proof buys nothing. Recorded under "Deliberately out of
scope" so it is not rediscovered as an omission.

**Decision 4 — 53B is one commit, not a two-phase shim.** A "phase 1: add
the core module and have legacy delegate to it; phase 2: delete legacy" plan
was considered and rejected. It would mean two live definitions for a
window, and — because `audit-window-bridge.mjs:89-91` flags any module-side
`window.X =` that shadows a legacy top-level `function X` — the shim would
either trip the `shadowed` check or have to avoid `window` entirely, at
which point it is not a shim. Since finding 2 establishes that no code in
`legacy-app.js` needs the three after 53A, there is no consumer a phased
approach would protect. One commit: add the module, switch the three
imports, delete the four declarations, rewrite the header, regenerate the
declaration file, land the tests.

**Decision 5 — The import-direction gate must contain cell shapes the app
never writes, or it is vacuous.** 51D's commit message records that its
first workbook gate "reported identical even with `percentValue`
deliberately broken" because the fixture never reached the code under
test. The same trap is larger here: every existing Excel round-trip spec
(`annual-mount`, `simplified-mount`, `guardian-inventory-mount`,
`guardian-inventory-excel-schedule-layout`) imports a workbook **this app
exported** — and `setCell` writes only `null`, numbers, or sanitized
strings. Those workbooks contain no formula cells, no rich text, no
hyperlinks, no `#REF!`, and no native `Date` values, so they exercise
exactly one branch of `unwrapCellValue` (the primitive passthrough). A court
clerk's template, or a workbook a filer edited by hand in Excel, contains
all of them — that is the documented reason `unwrapCellValue` exists
(`legacy-app.js:1202-1210`). So 53B's gate has two halves: a unit matrix
pinning every branch (B7), and an e2e that builds a workbook *with* those
shapes at real template addresses and imports it (B8). Both must be shown to
go red under an injected fault before they count.

**Decision 6 — 53A is its own commit, not folded into 53B.** 51D's
precedent for sweeping in an orphan ("dropping local `setCell` left
`sanitizeForExcel` unused, so that went too") applies to code *this change*
orphans. `fmtDateCard` was already dead before 53 existed; deleting it is
51C-class work with 51C's discipline (a dead-code detector that is red
before the fix and green after), and keeping it separate means 53B's diff
contains only the move.

---

## 53A — Delete Dead `fmtDateCard` — **Landed `086cf54`, 2026-09-16**

**Risk: Low.** Pure deletion of an unreferenced function.

### Files

`src/legacy-app.js` (`:979-992`), `tests/unit/cell-reader.spec.js` (new —
see 53B; 53A lands only its first `describe` block, the dead-code
detector).

### Background

`fmtDateCard(s)` (`:988-992`) wraps `fmtDate` with a year-plausibility
check for dashboard summary cards. Its comment (`:979-987`) is accurate
about *why* it existed; its caller no longer does. `git log -S"fmtDateCard("`
shows the call count last changed in `5d318ed` ("Extract dashboard into
lazy feature module"), and nothing in today's `src/features/dashboard/`
references it or any equivalent. Repository-wide search for `fmtDateCard` —
`src/`, `fragments/`, `index.html`, `sw.js`, `tests/`, all `*.md` — finds
only the declaration.

It matters for 53B because it is the only caller of `fmtDate` in
`legacy-app.js` other than `readCellText`. With it gone, 53B's deletion of
`fmtDate` leaves nothing dangling.

### Execution plan

Written to be followed top to bottom in one sitting. Every step names the
command to run and what its output must be before the next step starts.
**Stop and report rather than improvise** if any "expect" line is not met —
each one is there because a mismatch means the tree is not the tree this
plan was written against. Line numbers are as of `73496e8`; step A0
re-derives them.

**A0. Sync and re-derive the target.**

```
git pull
git status                      # expect: clean (nothing to commit)
git log --oneline -3            # note HEAD for the commit message
grep -n "fmtDateCard" src/legacy-app.js
```

Expect **exactly one** line of output, the declaration
`function fmtDateCard(s){`. Record its line number as `L` (988 at
`73496e8`). If two or more lines match, a caller has appeared since this
document was written — **stop**; 53A's premise is void.

```
grep -rn "fmtDateCard" src fragments index.html sw.js tests --include=*.js --include=*.ts --include=*.html
```

Expect the same single line and nothing else. Then confirm the block
boundaries: `sed -n "$((L-10)),$((L+5))p" src/legacy-app.js`. Expect line
`L-10` to be `function fmtDate(s){…}` (the neighbor that **stays**), lines
`L-9`..`L-1` to be the nine-line `// Dashboard-card-only variant:` comment,
lines `L`..`L+4` to be the five-line function ending in `}`, and `L+5` to be
blank. The deletion range is therefore **`L-9` through `L+4`** (fourteen
lines: 979–992 at `73496e8`). Line `L-10` and line `L+5` are not touched.

**A1. Confirm the target spec file does not exist yet.**

```
ls tests/unit/cell-reader.spec.js        # expect: No such file
grep -n "cell-reader" TEST-INDEX.md       # expect: no output
```

If either exists, 53B (or a concurrent agent) has started — **stop** and
reconcile before continuing.

**A2. Write the detector, red.** Create `tests/unit/cell-reader.spec.js`
with exactly this content (53B appends to it; 53A lands only this):

```js
import { describe, it, expect } from 'vitest';
import { readRepoSource, LEGACY_APP } from './support/legacy-source-extract.js';

// Milestone 53A: fmtDateCard() was dead in legacy-app.js -- its dashboard
// caller left in 5d318ed and nothing replaced it. This is the red-first
// dead-code detector for that deletion; Milestone 53B widens the name list
// to the whole cell-reader cluster (fmtDate, unwrapCellValue, readCellText)
// once those move to src/core/excel/cell-reader.js, and it then stays as the
// permanent guard against any of them being reintroduced as a classic-script
// global. legacy-app.js exposes top-level function declarations on `window`
// implicitly, so there is no `window.X =` line for the bridge allow-list to
// catch -- the declaration itself is the global, and this scan is the check.
describe('legacy-app.js carries no copy of the cell-reader cluster', () => {
  const NAMES = ['fmtDateCard'];

  it.each(NAMES)('does not declare a top-level function %s', (name) => {
    const source = readRepoSource(LEGACY_APP);
    const decl = new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm');
    // A boolean, not `expect(source).not.toMatch(decl)`: on failure vitest
    // prints the received value, and the received value here is all of
    // legacy-app.js.
    expect(decl.test(source), `${name} is still declared in ${LEGACY_APP}`).toBe(false);
  });
});
```

Run it:

```
npx vitest run tests/unit/cell-reader.spec.js
```

Expect **1 failed**, with a one-line message naming `fmtDateCard`. (Dry-run
against `73496e8` while writing this plan: `Test Files 1 failed (1)`,
`Tests 1 failed (1)` — the detector is red on the current tree.) If it
passes, the regex is not finding the declaration it is supposed to find —
fix the test before touching source; a detector that is green on dirty
input detects nothing.

**A3. Delete the block.** Remove lines `L-9` through `L+4` inclusive from
`src/legacy-app.js` — the nine comment lines beginning `// Dashboard-card-only
variant:` and the five-line `function fmtDateCard(s){…}`. Do it with an
editor or a line-range tool, not a regex over the file. Then:

```
git diff --stat src/legacy-app.js       # expect: 1 file changed, 14 deletions(-)
git diff src/legacy-app.js | grep '^+'  # expect: only the +++ header, no added lines
sed -n "$((L-10)),$((L-8))p" src/legacy-app.js
```

The last command must print `function fmtDate(s){…}`, a blank line, and
`// Neutralizes formula/CSV injection:` — i.e. `fmtDate` is intact and now
directly precedes the `sanitizeForExcel` comment block.

**A4. Detector green, neighbors untouched.**

```
npx vitest run tests/unit/cell-reader.spec.js tests/unit/date-truncation-helpers.spec.js tests/unit/window-bridge.spec.js
```

Expect all three files green. `date-truncation-helpers.spec.js` scans
`legacy-app.js` for `function fmtDate(s)` and requires its `instanceof Date`
guard — that is the check that A3 did not take the neighbor.
`window-bridge.spec.js` proves the generated declaration file did not need
to change (it should not: `fmtDateCard` was never in it, because no module
ever read `window.fmtDateCard`). Do **not** run `--declare`; if
`window-bridge.spec.js` fails here, something other than 53A is dirty —
**stop**.

**A5. Index the new spec** (`AGENTS.md` §7). In `TEST-INDEX.md`'s
`tests/unit` table, insert one row after `case-county-drift.spec.js`
(`:19`) and before `checklist-export-parity.spec.js` (`:20`) — the table is
only loosely alphabetical, so match its neighbors rather than sorting —
keeping the table's column widths:

```
| cell-reader.spec.js                  | Milestone 53A: red-first dead-code detector -- legacy-app.js declares no top-level fmtDateCard (dead since 5d318ed); Milestone 53B widens it to the whole cell-reader cluster and adds the behavioral shape matrix for src/core/excel/cell-reader.js |
```

Then:

```
npx vitest run tests/unit/test-index-guard.spec.js    # expect: green
```

Leave the "tests/unit by category" table (`TEST-INDEX.md:226-233`) alone in
53A; 53B decides the coverage axis (B11) and files the row then.

**A6. Review the whole diff once, as a reader.**

```
git status                      # expect exactly: M src/legacy-app.js, M TEST-INDEX.md, ?? tests/unit/cell-reader.spec.js
git diff
```

Three files, nothing else. The `legacy-app.js` hunk is fourteen `-` lines
and zero `+` lines. If `git status` lists anything else — a regenerated
`window-bridge.d.ts`, a stray probe, a concurrent agent's file — it does
not go in this commit (`AGENTS.md` §1: commit only your own task's files).

**A7. Commit and push** (direct to `master`, per `AGENTS.md` §1):

```
git add src/legacy-app.js TEST-INDEX.md tests/unit/cell-reader.spec.js
git commit -m "$(cat <<'EOF'
refactor: delete dead fmtDateCard() from legacy-app.js (Milestone 53A)

fmtDateCard() wrapped fmtDate() with a year-plausibility check for the
dashboard's summary cards. Its only caller left in 5d318ed ("Extract
dashboard into lazy feature module"); since then the declaration has been
its sole reference anywhere in the repository (src/, fragments/,
index.html, sw.js, tests/). Deleted with its comment block.

Why now and not in 53B: it was the only caller of fmtDate() inside
legacy-app.js other than readCellText(). With it gone, Milestone 53B can
move the fmtDate/unwrapCellValue/readCellText cluster to
src/core/excel/cell-reader.js and delete the originals with nothing left
dangling on the legacy side.

Verification: new tests/unit/cell-reader.spec.js is a red-first detector --
it asserts legacy-app.js declares no top-level fmtDateCard, was red against
the pre-deletion tree, and is green after. date-truncation-helpers.spec.js
and window-bridge.spec.js also green (fmtDate untouched; no generated-file
change). TEST-INDEX.md row added per AGENTS.md section 7.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
git push
```

On a rejected push: `git pull --rebase`, re-run A4, push again — never force.

**A8. Record the landing.** Amend this document's Status and the "How this
index is organized" table with the commit SHA (read it from `git log -1
--format=%h`, never from memory — `AGENTS.md` §1 "Verify Commit
Citations"), and push that as a `docs:` commit. 53B's A0-equivalent step
starts from that SHA.

### Verification

Steps A2 (red) → A4 (green) are the verification: there is no behavior to
preserve because there is no caller, so the only things that can go wrong
are deleting the wrong lines (A3's `sed` check and A4's
`date-truncation-helpers` run) or deleting them in a tree that is not the
one this plan describes (A0's single-match requirement, A1, A6). Every
"expect" line above is a stop condition, not a suggestion.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export-Import / Security / UI /
  Legal:** N/A — dead code.
- **Test Coverage & Index:** `tests/unit/cell-reader.spec.js` is created
  here (one block) and grows in 53B. Its `TEST-INDEX.md` row is added in
  53A's commit per §7 and amended in 53B's. `tests/unit/test-index-guard.spec.js`
  enforces the row's presence.

---

## 53B — Move the Cluster to `src/core/excel/cell-reader.js` — **Landed `01630fa`, 2026-09-16**

**Risk: Medium.** Changes which code runs on the Excel *import* path for all
three Excel-capable filing types (Annual/Final/Trust Accounting, Verified
Initial Inventory, Simplified Accounting). The function bodies do not
change; the mechanism by which they are reached does, and the originals are
deleted. Same risk class as 51D and 51F.

### Files

| File | Change |
| --- | --- |
| `src/core/excel/cell-reader.js` | **New.** `fmtDate`, `unwrapCellValue`, `readCellText`, each exported, bodies and doc-comments byte-identical to `legacy-app.js:970-978` and `:1202-1238` |
| `src/legacy-app.js` | Delete `:970-978` (`fmtDate` + its Milestone 51 comment) and `:1202-1238` (`unwrapCellValue`, `readCellText`, their comments). Line numbers are pre-53A; re-derive after 53A lands |
| `src/features/annual-accounting/excel.js` | `:23` — remove `readCellText, unwrapCellValue` from the `window` destructure; add `import { readCellText, unwrapCellValue } from '../../core/excel/cell-reader.js';` beside the existing `excel-engine.js` import at `:16` |
| `src/features/guardian-inventory/excel.js` | `:19` — same two names removed; same import added beside `:13` |
| `src/features/simplified-accounting/excel.js` | `:14` — remove `readCellText`; add `import { readCellText } from '../../core/excel/cell-reader.js';` beside `:8` |
| `src/core/excel/excel-engine.js` | Rewrite header lines `:54-79`. The "readCellText here was a passthrough" bullet becomes history; the "WHY readCellText CANNOT SIMPLY MOVE TO CORE" block is replaced by a short pointer to `cell-reader.js` and to this document. **Write the new text without the literal token `window.readCellText`** — see B10 |
| `src/core/types/window-bridge.d.ts` | Regenerated by `node scripts/audit-window-bridge.mjs --declare`. Expected diff: `readCellText: any;` (`:316`) disappears; nothing else changes |
| `tests/unit/cell-reader.spec.js` | Grows: the four-name dead-code detector (A1, widened), the shape matrix (B7), and a "one implementation" import test |
| `tests/unit/date-truncation-helpers.spec.js` | `:53` — `COPIES` entry `{ file: 'src/legacy-app.js', name: 'fmtDate' }` becomes `{ file: 'src/core/excel/cell-reader.js', name: 'fmtDate' }`; add `fmtDate` to the importable-copy behavioral tests alongside `fmtD` (`:28-43`); update the header comment at `:25-27` which says only one copy is importable |
| `tests/e2e/excel-import-cell-shapes.spec.ts` | **New.** The non-vacuous import gate (B8) plus the runtime "globals gone" assertion (B9) |
| `TEST-INDEX.md` | Row for the new e2e spec; amend the rows for `cell-reader.spec.js` and `date-truncation-helpers.spec.js` (`:27`); add `cell-reader.spec.js` to the `xlsx-export` unit category at `:231` (or introduce an `xlsx-import` coverage axis — see B11) |

**Not touched, deliberately:** the three `fD`/`fmtD` closures in the feature
`excel.js` writers (`annual:94`, `guardian:105`, `simplified:64`) — those are
Group A2, export-direction, and type-preserving; 51's audit and
`summary-renderer.js:56-63` both explain why they must not merge with
`fmtDate`. The feature-local import readers built *on top of* the cluster
(`annual`'s `gcDate`/`gcNum`/`gcPct` at `:433-448`, `guardian`'s
`dt`/`num`/`pct`/`triState` at `:495-499`) — those encode per-filing
semantics and stay where they are.

### Background

After 53A, the call graph of the three functions is closed and one-directional:

```
legacy-app.js                          feature excel.js (×3)
  fmtDate         ◄── readCellText ◄──── const { readCellText } = window
  unwrapCellValue ◄── readCellText           (annual, guardian, simplified)
                  ◄────────────────────── const { unwrapCellValue } = window
                                             (annual, guardian)
```

No arrow originates inside `legacy-app.js` except the two internal ones.
That is what makes this a clean cut rather than the entanglement 51 feared.

The consumers' call sites need no edit — every one already goes through a
local alias (`annual:431-432` `gcv`/`gcStr`; `guardian:493-494`
`rawv`/`txt`; `simplified:24,233,257,312,361` `text`/`gc`/`gc34`/`gc56`/
`gc7`), so the only change per file is the destructure line and the new
`import`.

### Steps

**B0. Sync and confirm the tree is quiet.** `git pull`, `git log -3`, then
`node scripts/audit-window-bridge.mjs` (summary mode) and
`npx vitest run tests/unit/window-bridge.spec.js` — both must be clean
*before* 53B touches anything, so any drift in the generated files is
attributable. Also run `npm run check:types` now and save its full output
verbatim — this is the baseline the Verification section's type-check step
compares against later; "unchanged" is not demonstrable without a captured
"before" to diff. (As of this writing the baseline is 10 pre-existing
errors, in `src/core/filing/readiness-card.js`, `src/core/ui/dialogs.js`,
`src/core/validation/validation-adapter.js`, and
`tests/e2e/support/supplemental-pdf-fixture.ts` — none in a file 53B
touches. Re-run it at B0 time rather than trusting this count; the tree may
have drifted.)

**B1. Read B7 and B8 now, out of their step order, before writing anything.**
Both are written below as the target *content* of files this step creates —
the shape-matrix table (B7) and the e2e spec's cell-shape table (B8) — not
as work that happens later. Concretely, in this order:

1. Write `tests/e2e/excel-import-cell-shapes.spec.ts` per B8's design (the
   six cell shapes, addresses, and expected values in B8's list below) and
   confirm it passes against the **current, unmoved** `legacy-app.js`
   implementation — it must pass against the legacy code first, or it is
   testing the wrong thing.
2. Write `tests/unit/cell-reader.spec.js`'s shape matrix per B7's tables
   below, using `extractLegacyFunction()` from
   `tests/unit/support/legacy-source-extract.js` for all three names,
   composed with `new Function(fmtSrc + unwrapSrc + readSrc + '; return {
   fmtDate, unwrapCellValue, readCellText };')()` (Milestone 52L built this
   extraction helper for exactly this use), and confirm it is green against
   that legacy extraction. Every expected value in the matrix is a
   **literal**, not a computed comparison — this run proves the literals
   describe shipped behavior, before anything moves.
3. Run the four existing Excel round-trip e2e specs and record pass/fail —
   this is the "before" the Verification section's regression list compares
   against.

Only after all three are green against the legacy code does B3 (create the
new module) begin. B7 and B8 below describe what these files' *final* form
looks like after B4–B7 switch their adapter to the ES import — read them now
for content, come back to them for that later switch.

**B3. Create `src/core/excel/cell-reader.js`.** Module header: what it is
(the Excel *import*-direction readers; the parse-side counterpart of
`excel-engine.js`'s writers), that Milestone 53 moved it from
`legacy-app.js` unchanged, and a pointer to the reader-semantics notes in
`excel-engine.js`'s header (0-vs-'' for unparseable numbers) so nobody
"completes" the consolidation by adding a `readCellNumber` here without
reading them. Then the three functions with their existing comment blocks,
as `export function`. No other exports. No imports.

**B4. Switch the three consumers** per the Files table. Keep import
ordering consistent with each file's existing style (core imports after the
`./index.js` import, before `alertModal`).

**B5. Delete from `legacy-app.js`:** `fmtDate` and its comment
(`:970-978`), and the `unwrapCellValue`/`readCellText` block with both
comments (`:1202-1238`). Leave the `// ── IMPORTED FILE HARDENING ──`
section header (`:1127`) and everything else in it (`validateImportFile`,
`getImportProgressEl`, `EXCEL_IMPORT_LIMITS`, `assertWorkbookWithinLimits`,
`sanitizeObjectData`, …) exactly as is — those are consumed by the same
three files but are outside this cluster and have their own reasons to move
or not (see "Deliberately out of scope").

**B6. Widen the 53A detector** in `cell-reader.spec.js` to all four names.
Add a second test that imports `cell-reader.js` and asserts exactly the
three named exports exist and are functions (a guard against a fourth
"helpful" export slipping in later).

**B7. The shape matrix** (`tests/unit/cell-reader.spec.js`) — switch the
B1-step-2 adapter to `import { fmtDate, unwrapCellValue, readCellText } from
'../../src/core/excel/cell-reader.js'` and delete the extraction adapter in
the same commit; the spec's final form must not depend on `legacy-app.js`.
The matrix is derived from the bodies at `legacy-app.js:1211-1238`, one row
per branch, and pins each function's output for each input. At minimum:

| Input to `unwrapCellValue` | Expected | Branch |
| --- | --- | --- |
| `null`, `undefined` | `null` | `v==null` |
| `new Date('2026-05-20T00:00:00Z')` | the same `Date` instance | `instanceof Date` |
| `'abc'`, `42`, `0`, `true`, `false`, `''` | itself, unchanged | `typeof v!=='object'` |
| `{ error: '#REF!' }` | `null` | `'error' in v` |
| `{ formula: 'A1+1', result: 7 }` | `7` | `'result' in v` |
| `{ formula: 'A1', result: { richText: [{text:'a'},{text:'b'}] } }` | `'ab'` | recursion, one level |
| `{ formula: 'A1', result: undefined }` | `null` | recursion into `undefined` |
| `{ sharedFormula: 'A1', result: 3 }` | `3` | `'result' in v` (no `formula` key needed) |
| `{ richText: [{text:'x'}, null, {text:'y'}] }` | `'xy'` | richText join, null run tolerated |
| `{ richText: 'not an array' }` | `null` | falls through to the final `return null` |
| `{ text: 'display', hyperlink: 'https://…' }` | `'display'` | hyperlink, string text |
| `{ text: [{text:'a'},{text:'b'}], hyperlink: '…' }` | `'ab'` | hyperlink, richText-array text |
| `{ text: undefined, hyperlink: '…' }` | `undefined` | **shipped behavior**: this branch returns `t` as-is, not `null` |
| `{ anything: 'else' }`, `[]`, `{}` | `null` | final fallthrough |

| Input to `readCellText` (as `{ value: … }`) | Expected | Branch |
| --- | --- | --- |
| `null`, `undefined` (the cell itself), `{ value: null }` | `''` | `cell?cell.value:null` then `v==null` |
| `{ value: new Date('2026-05-20T00:00:00Z') }` | `'2026-05-20'` | Date → `fmtDate(v.toISOString())` |
| `{ value: new Date('2026-01-01T23:59:59Z') }` | `'2026-01-01'` | the timezone-shift case `656cccf` guards |
| `{ value: '  padded  ' }` | `'padded'` | `String(v).trim()` |
| `{ value: 0 }` | `'0'` | number zero is not "no value" |
| `{ value: false }` | `'false'` | boolean stringifies |
| `{ value: { text: undefined, hyperlink: '…' } }` | `''` | the `undefined` from `unwrapCellValue` is caught by `v==null` |
| `{ value: { error: '#DIV/0!' } }` | `''` | error → null → '' |
| `{ value: { formula: '…', result: '  r  ' } }` | `'r'` | unwrap then trim |

`fmtDate` rows: reuse the exact cases `date-truncation-helpers.spec.js:28-43`
already applies to `fmtD`, since the bodies are identical.

The `{ text: undefined, hyperlink }` → `undefined` row is deliberately
included as-is. It is arguably a wart (`unwrapCellValue`'s own comment says
it "returns null instead of ever handing back a raw object," and
`undefined` is not `null`), but every caller feeds the result through
`readCellText`'s `v==null` or a `Number(…)||0`, so it is unobservable today
— and 53B's job is to move the function, not improve it. Pin it, and note
it under "Deliberately out of scope."

**B8. The non-vacuous import gate** (`tests/e2e/excel-import-cell-shapes.spec.ts`).
Simplified Accounting is the right vehicle — smallest import surface, and its
Cover reads go straight through `readCellText` with no feature-local wrapper
(`simplified:233-245`). In-page, using the already-loaded ExcelJS (the
pattern `guardian-inventory-excel-schedule-layout.spec.ts` uses to build
fixtures), construct a workbook whose `'PARTS I, II '` sheet holds, at the
addresses `importExcel` reads:

- `C4` (`wardName`): a `richText` value — `{ richText: [{text:'Eleanor '},{text:'Whitfield', font:{bold:true}}] }` → expect `'Eleanor Whitfield'`
- `H4` (`caseNumber`): a formula with a cached result — `{ formula: '"26-"&"001234"', result: '26-001234' }` → expect `'26-001234'`
- `D16` (`attorney`): a hyperlink — `{ text: 'Daniel R. Okafor, Esq.', hyperlink: 'mailto:…' }` → expect the display text
- `F4` (`gid`): a native `Date` — `new Date('2026-03-15T00:00:00Z')` → expect `'2026-03-15'` after the caller's `.substring(0,10)`
- `D17` (`guardian`): an `{ error: '#REF!' }` → expect `''` (and the readiness card flags the field as missing rather than showing `[object Object]`)
- `G2` (`county`): a plain string with surrounding whitespace → expect trimmed

Save it to a temp path (Playwright `page.evaluate` → `workbook.xlsx.writeBuffer()`
→ Node side writes the file), import via
`page.setInputFiles('input[type="file"][accept=".xlsx"]', path)` exactly as
`simplified-mount.spec.ts:85` does, then read `window.D` fields back and
assert each. This spec runs identically before and after 53B (B1 establishes
"before"); its value is that it reaches the branches the app's own exports
never do.

**B9. Runtime "globals gone" assertion** — in the same e2e file, one test:
`page.evaluate(() => ['fmtDate','fmtDateCard','unwrapCellValue','readCellText'].filter(n => n in window))`
must equal `[]`. Static removal from `legacy-app.js` is checked by B6; this
is the only check that would catch a copy living in an inline `<script>` in
`index.html` or a fragment (none exists today — this pins that).

**B10. Rewrite `excel-engine.js:54-79`**, then `node
scripts/audit-window-bridge.mjs --declare`, then `git diff
src/core/types/window-bridge.d.ts`. The expected diff depends on whether
53D has already landed — check this document's own landed-notes table
before running this step:

- **53D not yet landed:** the diff must be exactly the removal of
  `readCellText: any;` — the only trace of the phantom-comment artifact
  (finding 3). If it is not, either the new comment still contains the
  token `window.readCellText` (fix the comment — a comment should not
  manufacture a phantom bridge entry) or the tree was not quiet at B0.
- **53D already landed:** its destructure-consumer pass now sees the real
  consumers — `readCellText` (all three feature `excel.js` files) and
  `unwrapCellValue` (`annual-accounting`, `guardian-inventory`, but not
  `simplified-accounting` — confirmed by grep, `simplified-accounting/excel.js`
  destructures `readCellText` only) — so the diff must remove exactly those
  two entries, `readCellText: any;` and `unwrapCellValue: any;`, and nothing
  else. `fmtDate` is never destructured directly by any feature file (only
  `readCellText` calls it internally, before the move), so it does not
  appear as a D1-detected consumer either way. If the diff shows anything
  else, the tree was not quiet at B0.

**B11. `TEST-INDEX.md`.** Three rows touched, one added. On the coverage
axis: `TEST-INDEX.md:218` defines `xlsx-export` as "Generated .xlsx
content" and `:231` lists its unit specs. `cell-reader.spec.js` and the new
e2e are the import direction. Recommend adding an `xlsx-import` category
("Parsed .xlsx content → in-memory filing data") rather than stretching
`xlsx-export`; the four existing round-trip mount specs stay where they are
(they are `form-data` specs that happen to round-trip) but the new e2e goes
under the new axis. This is a one-table edit and is the honest label. If
Alan prefers not to add an axis, put both under `xlsx-export` with a
parenthetical.

**B12. Inject a fault and watch both gates go red** — before committing,
per 51D's lesson. Temporarily delete the `richText` branch from the moved
`unwrapCellValue` (or make it return `'[object Object]'`): B7's matrix and
B8's e2e must both fail, and specifically on the rich-text rows. Revert.
Then temporarily remove the `instanceof Date` guard from the moved
`readCellText`: the two Date rows in B7 and the `gid` assertion in B8 must
fail. Revert. Record both in the commit message. A gate that cannot fail is
not evidence.

**B13. Recommend a full regression to Alan** (`npm test`) before commit,
per `AGENTS.md` §1's "touches shared/core modules on a court-output path"
clause, with the reasons: three feature import paths change implementation
mechanism; 51D got one for the mirror-image change. Do not run it without
the go-ahead.

### Verification

Lite gate (run by the executor, no approval needed):

1. `npx vitest run tests/unit/cell-reader.spec.js tests/unit/date-truncation-helpers.spec.js tests/unit/window-bridge.spec.js tests/unit/excel-engine.spec.js tests/unit/test-index-guard.spec.js`
2. `npx playwright test tests/e2e/excel-import-cell-shapes.spec.ts tests/e2e/simplified-mount.spec.ts tests/e2e/annual-mount.spec.ts tests/e2e/guardian-inventory-mount.spec.ts tests/e2e/guardian-inventory-excel-schedule-layout.spec.ts`
   — the three export→re-import round-trips (`simplified-mount:75-85`,
   `annual-mount:81-91`, `guardian-inventory-mount:228-238`) plus 52K's
   all-schedules-at-capacity round-trip. These prove each feature's *wiring*
   to the moved functions; B8 proves the functions.
3. The fault-injection record from B12, in the commit message.
4. `npm run check:types` — diff the output against B0's captured baseline;
   expect zero difference. Note `tsconfig.json`'s `include` does not cover
   `src/core/excel/`, so the new module is not type-checked; that is the
   status quo for `excel-engine.js` and `excel-capacity.js` too and is not
   changed here (see out of scope).

Full gate (with Alan's go-ahead per B13): `npm test`.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** N/A. No persisted shape changes; the functions produce the
  same values into the same `window.D` fields.
- **Legacy Data Migration:** N/A for `.sav` files. For *workbooks*: a
  template or filer-edited `.xlsx` that imported correctly on 2026-09-16
  imports identically after 53B, because the bodies are unchanged — B7 and
  B8 are the evidence, and B8 specifically covers the non-app-generated
  shapes that a legacy workbook may contain.
- **Test Coverage & Index:** named above — one new unit spec (started in
  53A), one new e2e spec, one amended unit spec, three `TEST-INDEX.md` rows
  plus a coverage-axis decision (B11).
- **Export/Import/Portability:** the **import** path of all three
  Excel-capable filing types changes *mechanism* (ES import instead of
  `window` destructure) but not implementation. The **export** path is
  untouched — it never used any of the three (the writers use their own
  `fD`/`fmtD` closures and `setCell`). `.sav` export/import is untouched.
- **Security & Sensitivity:** these functions are the first thing untrusted
  file content touches after ExcelJS parses it. Moving them changes no
  handling: `unwrapCellValue` still refuses to return a raw object,
  `readCellText` still stringifies and trims, and every importer still
  passes the assembled object through `sanitizeObjectData` /
  `sanitizeObjectDataInPlace` afterward (`guardian:471`, `annual:689`,
  `simplified:402`). The threat model — a hostile `.xlsx` reaching the
  parser — is **partially mitigated**, not "addressed," upstream:
  `validateImportFile` checks file size and ZIP signature before parsing,
  but `assertWorkbookWithinLimits` takes an already-fully-parsed `workbook`
  object as its argument, so ExcelJS has parsed the complete file before
  the sheet/row-count limits ever run — a small, valid-ZIP workbook crafted
  to exploit the parser itself is not stopped pre-parse. 53B does not
  change this exposure in either direction; it moves code that runs
  strictly after both existing checks. No new stored data.
- **UI/UX Consistency:** N/A. No user-visible change; the import progress
  text and readiness behavior are downstream of unchanged values.
- **Legal/Compliance:** the values these functions produce become the
  ward's name, case number, guardian, attorney, dates, and dollar amounts in
  a court filing. The `instanceof Date` → `toISOString()` path is the one
  that prevents a timezone-shifted date (`656cccf`), and it moves intact —
  B7's two Date rows and B8's `gid` case are the specific checks. This
  document asserts nothing about whether any template's cell addresses are
  legally correct; it records only that what was read from each address
  before is what is read after.

---

## 53C — Annual Accounting's `fmtD` Adopts Core `fmtDate` — **Landed `261261a`, 2026-09-16**

**Risk: Low.** Removes one character-identical duplicate. Own approval.

### Files

`src/features/annual-accounting/index.js` (`:344`, plus its consumers at
`:614`, `:627`, `:660` and any other in-file uses),
`tests/unit/date-truncation-helpers.spec.js` (`:6`, `:54`).

### Background

`export function fmtD(s){const v=s instanceof Date?s.toISOString():s;return v?String(v).substring(0,10):'';}`
at `index.js:344` is the same body as `fmtDate`, token for token —
Milestone 51's audit called these two "A1" and left them because they lived
on opposite sides of the script boundary. After 53B they are both ES
exports. `fmtD` feeds the annual accounting's under-penalties-of-perjury
attestation text (`:614`) and the preparer/attorney statements
(`:627`, `:660`) — so this is on a court-output path even though the change
is a rename.

### Steps

**C1.** Replace the declaration at `:344` with
`import { fmtDate as fmtD } from '../../core/excel/cell-reader.js';` and
`export { fmtD };` — **not** `import { fmtDate } from …; export { fmtDate as
fmtD };`, which was this step's first draft and is a real bug: `export {
fmtDate as fmtD }` only renames the *external* export, it creates no local
`fmtD` binding, so the bare `fmtD(...)` calls at `:614`, `:627`, `:660`
(confirmed — all three call the unqualified name, not `fmtDate(...)`) would
throw `ReferenceError: fmtD is not defined`. Importing under the alias
directly (`import { fmtDate as fmtD } from …`) creates the local `fmtD`
binding those three call sites need, and re-exporting that same local
binding keeps `date-truncation-helpers.spec.js:6`'s import unaffected.
Verified
consumers of the export: `index.js` itself (`:614`, `:627`, `:660`) and that
spec — nothing else. `print.js` imports only `validateAnnual` from
`index.js` (`print.js:13`), and `pdf-model.js:49` declares its **own** local
`fmtD` closure, which belongs to a different group in Milestone 51's audit
(the PDF-model display formatters) and is not touched by 53C. (`index.js:462`'s
comment says `DISB_CATS` is exported "same pattern as fmtAnnual/fmtD" — that
describes why `fmtD` is exported, not a live importer of it.)

**C2.** In `date-truncation-helpers.spec.js`, the `COPIES` list drops the
`annual-accounting/index.js fmtD` entry (there is no longer a copy there —
the source scan for a body would fail) and the behavioral block imports
`fmtDate` from `cell-reader.js`; the `fmtD` behavioral tests can stay as a
re-export identity check (`expect(fmtD).toBe(fmtDate)`).

### Verification

`npx vitest run tests/unit/date-truncation-helpers.spec.js`, then the annual
print-path e2e coverage from `TEST-INDEX.md`
(`annual-schedule-consistency.spec.ts` and `annual-mount.spec.ts`), and a
manual read of the rendered attestation on a populated Annual Accounting
fixture confirming the "from X through Y" dates are unchanged.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Legal/Compliance:** the dates in a sworn statement come from this
  function. The re-export is provably the same function object, so the
  only failure mode is an import-path mistake, which the existing spec's
  `fmtD` tests would catch.
- Everything else: N/A.

**Why it is optional and not folded into 53B:** the home question. If
`fmtDate` is imported by a print/attestation renderer, `cell-reader.js` is
a slightly odd address for it (Decision 2 acknowledged this). Taking 53C is
a signal that a later one-line relocation to a date-formatting module is
worth doing; not taking it leaves two identical, separately-tested
implementations, which 51/52 have shown is how drift starts. Recommend
taking it.

---

## 53D — Teach the Bridge Audit to See `const { … } = window` — **Landed `e0d99be`, 2026-09-16**

**Risk: Low.** Governance/dev tooling only; no runtime code. Own approval.
Independent of 53A–C. **Revised 2026-09-16 after a review found the
original design unsound** — see "Why the design changed" below; the
regex-based D1 originally here is not carried forward.

### Files

`scripts/audit-window-bridge.mjs` (new consumer pass),
`src/core/types/window-bridge.d.ts` (regenerated),
`tests/unit/window-bridge.spec.js` (new fixture-based test block),
`package.json`/`package-lock.json` (**new devDependency: `acorn`** — see
"Why the design changed").

### Background

Finding 3: the consumer scan matches only `window.X` member access. Every
feature `excel.js` and `index.js` — and `dashboard/index.js:12-19`, per
Milestone 52's Decision 1 — reaches legacy functions by destructuring
(`const { … } = window`), which the audit does not see. The generated
`.d.ts`, whose stated purpose is to let `tsc --noEmit` check "modules that
reach through window," therefore omits every destructured name. And a
consumer can hide from a "who still uses this global?" question, which is
precisely the question 53B had to answer by hand.

### Why the design changed

The original D1 proposed a second regex —
`const\s*\{([^}]*)\}\s*=\s*window\b`, split on commas, strip aliases/defaults
— on top of the existing `\bwindow\.([A-Za-z_$][\w$]*)/g` member-access
scan. A review confirmed this would misfire on real code already in this
repository: `annual-accounting/index.js:56-67` and
`guardian-inventory/index.js:18-30` both have a multi-line `//` comment
**inside** the destructure's braces — one of them (`guardian-inventory`)
literally spells out `toggleSsnReveal` in prose, not as a binding. A
comma-split with no comment-stripping either manufactures a garbage
"consumer name" out of comment text or silently absorbs a real name into
the wrong token; it is the same class of false-positive risk finding 3
already identified in the existing `window.X` scan, being reintroduced in a
structurally harder spot (multi-line, nested braces, commas inside default
expressions) with no way to bound it by inspection the way "the regex is
anchored to line-start" bounds the assignment scan.

The instinct to reach for a real parser instead of a sharper regex was
right, but "use the TypeScript compiler API, it's already available" turned
out to be false and worth recording so it is not repeated: this repository
pins `"typescript": "^7.0.2"` — the new native/Go-ported compiler — and its
npm package's default export is `./lib/version.cjs`, exposing exactly two
names, `version` and `versionMajorMinor`. Verified directly: `require('typescript')`
in this repo's own `node_modules` returns an object with no
`createSourceFile`, `forEachChild`, or any AST-node type guard. There is a
lower-level scanner/AST surface under `typescript/unstable/ast` and sibling
`unstable/*` subpaths, but it is explicitly marked unstable (no semver
guarantee across patch releases) and exposes token/scanner primitives, not
a parse-and-walk convenience API — building on it would mean writing the
same kind of hand-rolled bracket/comma tracking this section exists to
retire, just on top of correct tokens instead of raw text. No other JS
parser (`acorn`, `espree`, `@babel/parser`, `esprima`) exists anywhere in
`node_modules`, including transitively through Vite/Rollup — confirmed by
search, not assumed.

**Decision (Alan, 2026-09-16): add `acorn` as a new devDependency.** It is
small (~150KB), has zero dependencies of its own, is one of the most widely
used and stable JS parsers in the ecosystem, and produces a real ESTree AST
— `ObjectPattern` nodes for destructuring — that a ~20-line hand-written
recursive visitor can walk without needing the separate `acorn-walk`
package. This is a real, if small, addition to the project's dependency
footprint for a script that currently has zero; it is called out explicitly
here rather than folded in silently, matching this document's own
convention for the C1 fix and the security-wording change below.

### Steps

**D1 (revised).** Add `acorn` to `devDependencies`. In
`auditWindowBridge()`, add a second consumer pass, per file:

```js
import { parse } from 'acorn';

// Generic ESTree walk -- acorn ships a parser, not a walker; the tree is
// plain nested objects/arrays keyed by `type`, so a short recursive visit
// covers every node shape without a second dependency (acorn-walk).
function walkAst(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) walkAst(n, visit); return; }
  if (typeof node.type === 'string') visit(node);
  for (const key in node) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    const value = node[key];
    if (value && typeof value === 'object') walkAst(value, visit);
  }
}

function findWindowDestructureConsumers(source) {
  let ast;
  try {
    ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch {
    // A file this parses can't handle isn't this pass's problem -- the
    // existing window.X member-access scan still covers it independently.
    return [];
  }
  const names = new Set();
  walkAst(ast, (node) => {
    if (
      node.type !== 'VariableDeclarator' ||
      !node.init || node.init.type !== 'Identifier' || node.init.name !== 'window' ||
      !node.id || node.id.type !== 'ObjectPattern'
    ) return;
    for (const prop of node.id.properties) {
      if (prop.type !== 'Property' || prop.computed) continue; // skips
        // `...rest` (RestElement -- not a named consumer of one property)
        // and `{ [dynamicKey]: x }` (not a static name; out of scope, same
        // as the existing window.X scan's own limits).
      if (prop.key.type === 'Identifier') names.add(prop.key.name);
      else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') names.add(prop.key.value);
    }
  });
  return [...names];
}
```

Record each name `findWindowDestructureConsumers()` returns as a consumer of
that file, under the same `PLATFORM` exclusion the existing pass uses. This
correctly handles every case the regex design could not, by construction
rather than by added special-casing: comments and string/template-literal
contents are never visited (acorn tokenizes them out before the AST exists
at all — they are not nodes), `prop.key.name` is the real `window` property
name regardless of a `foo: bar` alias or a `foo = default` (`AssignmentPattern`
as `prop.value`, which never affects `prop.key`) or nested destructuring
(`foo: { bar }` — `prop.value` is itself an `ObjectPattern`, still doesn't
affect `prop.key`), `VariableDeclarator` is matched regardless of the
enclosing declaration's `const`/`let`/`var` keyword, and formatting/line
breaks are irrelevant to a parsed tree.

**D2.** Regenerate the declaration (`--declare`). Expect a **large** additive
diff in `window-bridge.d.ts` — every legacy function destructured anywhere
in `src/` — and no change to the allow-list (it tracks assignments, which
D1 does not touch).

**D3.** Add a dedicated parser-fixture test block to `window-bridge.spec.js`
(or a new `tests/unit/audit-window-bridge-destructure.spec.js`, matching
whichever this repo's convention prefers by the time this lands), feeding
`findWindowDestructureConsumers()` literal source strings and asserting the
exact returned name array for each — the shape-matrix convention 53B's B7
already uses, applied here. At minimum, one fixture per case that broke the
original regex design, plus the standard shapes:

| Fixture source | Expected consumer names |
| --- | --- |
| `` const { esc, ic } = window; `` | `['esc', 'ic']` |
| `` const {\n  esc,\n  // comment\n  ic,\n} = window; `` (multi-line, trailing comment) | `['esc', 'ic']` — comment text never enters the result |
| `` const {\n  esc,\n  // Milestone 51C dropped \`toggleSsnReveal\` from this list\n  // -- destructured but never called here.\n  ic,\n} = window; `` (the exact shape found in `annual-accounting/index.js:56-67` and `guardian-inventory/index.js:18-30`, including a decoy identifier named in prose) | `['esc', 'ic']` — `toggleSsnReveal` does **not** appear; this is the regression case for the original bug |
| `` const { foo: bar } = window; `` (alias) | `['foo']` — the `window` property name, not the local binding |
| `` const { foo = 1 } = window; `` (default) | `['foo']` |
| `` const { foo = fn(1, 2, 3) } = window; `` (default expression containing commas) | `['foo']` — the commas inside the default never split the property list |
| `` const { foo: { bar } } = window; `` (nested destructuring) | `['foo']` |
| `` let { foo } = window; `` / `` var { foo } = window; `` | `['foo']` for each |
| `` const s = "const { fake } = window"; `` (string literal containing the pattern as text) | `[]` — never a real declaration |
| `` const { ...rest } = window; `` (rest element) | `[]` — not a named single-property consumer |
| `` const { [dynamicKey]: x } = window; `` (computed key) | `[]` — not a static name, same limit the existing `window.X` scan has |

Also keep the existing audit-level assertion: a known destructured-only name
(after 53B: `capitalizeImportedFields`, which no module reads as
`window.capitalizeImportedFields`) appears in `auditWindowBridge()`'s
`consumers`. Red before D1, green after.

**D4.** Optionally, a `consumers` diff before/after 53B becomes a
mechanical acceptance check for 53B ("`readCellText` and `unwrapCellValue`
have zero consumers after") — if 53D lands first. Otherwise 53B relies on
the text-search inventory in this document, which is sufficient but manual.

### Verification

`npx vitest run tests/unit/window-bridge.spec.js` (including the new
fixture block), `npm run check:types` (expect no new errors — every added
`.d.ts` name is `any`), and confirm `npm ls acorn` resolves to exactly one
version with no peer-dependency warnings.

### Cross-cutting ramifications (`AGENTS.md` §8)

N/A for application code — this touches no runtime `src/` behavior.
**Dependency footprint:** one new devDependency (`acorn`), called out
explicitly rather than folded in silently — see "Why the design changed."
**Sequencing note:** it regenerates the same `.d.ts` that 53B regenerates.
Land it either strictly before 53B or strictly after; never interleave, per
the "regenerate from merged source, never hand-merge a generated file" rule
Milestones 51 and 52 both record. If it lands **before** 53B, see 53B's B10
step for the resulting change to that step's expected diff.

---

## Sequencing and concurrency

- **53A before 53B.** Not optional: 53B deletes `fmtDate`, and `fmtDateCard`
  calls it.
- **53B is one commit** (Decision 4). Do not leave the tree between "module
  created" and "legacy deleted" — that state has two live implementations.
- **53C after 53B**; **53D before or after 53B**, never interleaved with it
  (both regenerate `window-bridge.d.ts`).
- **Milestone 54 — landed, no longer concurrent.** See the Status section's
  refreshed concurrency note. Confirmed no overlap with any file 53A–D
  touch. `TEST-INDEX.md` is the one file both milestones edited; that has
  already resolved as a normal sequence of row additions, not a conflict.
  Per `AGENTS.md` §1, still re-check `git log`/`git status` immediately
  before 53 actually starts — this document may not be the last thing to
  land on `master` before then either.
- **Milestone 51's generated-file rule applies:** a conflict in
  `window-bridge.d.ts` has no correct manual resolution. Regenerate from
  merged source.

---

## Acceptance criteria

| Scenario | Expected result |
| --- | --- |
| `git grep -nE '^(async )?function (fmtDate|fmtDateCard|unwrapCellValue|readCellText)\(' src/legacy-app.js` after 53B | No output |
| `node scripts/audit-window-bridge.mjs --json` after 53B, `assignments` | Byte-identical to before 53A (no global was ever explicitly assigned) |
| `git diff src/core/types/window-bridge.d.ts` for the 53B commit | See B10: exactly one line removed (`readCellText: any;`) if 53D has not landed; exactly two (`readCellText: any;` and `unwrapCellValue: any;`) if it has |
| `tests/unit/cell-reader.spec.js` shape matrix (B7) | Green against the legacy extract before the move (B1, step 2), green against the ES import after; red under both B12 faults |
| `tests/e2e/excel-import-cell-shapes.spec.ts` (B8) | Green before and after 53B; red under both B12 faults; each of the six cell shapes lands in `window.D` as the table specifies |
| Runtime `['fmtDate','fmtDateCard','unwrapCellValue','readCellText'].filter(n => n in window)` (B9) | `[]` |
| Export → re-import round-trip, all three Excel types (`simplified-mount`, `annual-mount`, `guardian-inventory-mount`) | Pass, unchanged |
| 52K's all-schedules-at-capacity round-trip (`guardian-inventory-excel-schedule-layout`) | Pass, unchanged — including the pre-existing `wardPercent` behavior it documents (53B must not mask or fix it) |
| `tests/unit/date-truncation-helpers.spec.js` | Five copies still found (one relocated), all five still guard `Date` before `String(`; `fmtDate` now also behaviorally tested |
| `npm run check:types` | Byte-identical to B0's captured baseline (10 pre-existing errors as of this writing — see B0; re-verify at execution time) |
| 53C only: `expect(fmtD).toBe(fmtDate)` | True — a re-export, not a copy |
| 53D only: audit `consumers` lists `capitalizeImportedFields` | Present, with the three feature `excel.js` files as its consumers |
| 53D only: `findWindowDestructureConsumers()` fixture table (D3) | Every row matches its expected name array exactly, including the comment-decoy and string-literal false-positive cases |
| `MILESTONE-53-PROPOSAL.md` | Amended in place with a dated "Landed" note per sub-delivery, per repo convention |

---

## Verification plan

Per sub-delivery, the **Verification** block is the lite gate (`AGENTS.md`
§1). One sub-delivery warrants more:

- **53B** — recommend a full `npm test` to Alan before committing. It is a
  change to a shared core module on the import path of three court-filed
  document types — the same reason 51D and 52K each got one. The lite gate
  proves the functions and each feature's wiring; the full run is what
  catches an interaction no one thought to name.

Red-first convention, applied: 53A's detector is red on `master` before the
deletion. 53B's shape matrix is written and run green *against the legacy
implementation* before the move, so that its literals are known to describe
shipped behavior rather than the mover's belief about it — then flipped to
the ES import. 53B's e2e gate is run green before the move for the same
reason. Both are then shown red under an injected fault (B12) before they are
allowed to count. 53D's spec case is red before D1.

The 51D commit message is the template for what 53B's commit message should
record: what moved, what the gate was, that the gate was shown non-vacuous,
and the full-regression result if one was run.

---

## Deliberately out of scope

Named here so they are not rediscovered as omissions:

- **`sanitizeCellValue` → `window.sanitizeForExcel` (`excel-engine.js:102-111`)**
  — the *last* core→legacy reach in the Excel modules after 53B. It is a
  different shape: export direction, deliberately dual-implemented with a
  Node fallback, and pinned equal by `excel-engine.spec.js`. Moving
  `sanitizeForExcel` (`legacy-app.js:1024`) to core is its own decision with
  a security-review dimension 51 already flagged; it is not a cell reader
  and does not belong in this milestone.
- **The rest of the IMPORTED FILE HARDENING section** (`validateImportFile`,
  `getImportProgressEl`, `assertWorkbookWithinLimits`,
  `capitalizeImportedFields`, `sanitizeObjectData[InPlace]`) — consumed by
  the same three files by the same destructure, and a plausible "next
  cluster." Not here: they have DOM, `window.D`, and sanitization
  dependencies the reader trio does not, and the point of 53B is that the
  trio is *closed*. If someone scopes that move, finding 2's method
  (enumerate every caller inside `legacy-app.js` first) is the way to do it.
- **The three `fD`/`fmtD` export-side closures** (Group A2) — do not merge
  with `fmtDate`. Restated from 51 because 53B puts `fmtDate` next to them
  in the import graph and the temptation will be visible: their
  `length >= 10` branch preserves the *type* of short input, and `setCell`
  branches on `typeof value === 'number'`, so merging can flip a filed date
  cell between numeric and text.
- **The feature-local import readers** built on the cluster (`annual`'s
  `gcDate`/`gcNum`/`gcPct`; `guardian`'s `dt`/`num`/`pct`/`triState`).
  Per-filing semantics (blank-vs-zero, US-date parsing, percent scaling).
  Not duplicates of each other in any behavior-neutral way.
- **The `wardPercent` / `jointOwnerPercent` round-trip bug** Milestone 52K
  found and left (writer stores 0–100, reader's `pct()` multiplies by 100).
  Still open. 53B's fixtures must not be shaped to hide it, and 53B must not
  fix it as a side effect — it is a field-semantics decision, not a reader
  move.
- **`readCellText`'s `fmtDate(v.toISOString())` → `fmtDate(v)`** (Decision
  3). Equivalent; not taken; buys nothing.
- **`unwrapCellValue` returning `undefined` for `{ text: undefined,
  hyperlink }`** — pinned as shipped behavior in B7, unobservable through
  every current caller, contradicts the function's own comment. If it is
  ever changed, change the comment's promise or the code, and re-run B7.
- **Adding `src/core/excel/` to `tsconfig.json`'s `include`** — would
  type-check the new module (and `excel-engine.js`, `excel-capacity.js`,
  `exceljs-loader.js`). Reasonable; a separate decision with its own error
  budget to triage.
- **`legacy-app.js`'s other implicit globals.** Finding 4 applies to every
  top-level `function` in that file, not just these four; the allow-list
  governs only explicit `window.X =` sites. Whether the audit should also
  inventory implicit globals (top-level declarations in the classic script)
  is a governance question adjacent to 53D and larger than it.

---

## Milestone 54's change record — moved out of this document

This document previously carried an appendix covering Milestone 54's
pre-landing code review, three design decisions, and the
`MILESTONE-54-HELPFUL-LINKS.md` wiring task — none of which touch the
cell-reader cluster this document is about, and none of which shared a file
with 53A/53B/53C/53D. It was recorded here originally only because Alan
asked for it here specifically, while this document was mid-draft on the
same tree as Milestone 54's own in-flight work. A review of this document
flagged that arrangement as a scope-boundary hazard: a reader approving one
of 53's sub-deliveries could mistake unrelated Milestone 54 content for
part of 53's own approval surface. **Moved to `MILESTONE-54-PROPOSAL.md`'s
own "Appendix: Change record" section, 2026-09-16, content unchanged.** See
that document for the full account.
