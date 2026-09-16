# Milestone 53: The Excel Cell-Reader Cluster Crosses the Script Boundary — Executable Delivery Index

## Status

**Draft — not an authorization to implement anything below.** Per
`AGENTS.md` §2, this is a proposal only; nothing here should be started until
Alan explicitly approves a specific sub-delivery by name. Approval of one
sub-delivery does not authorize the others. 53A is a prerequisite for 53B;
53C and 53D are optional and independently approvable.

**Numbering note.** 53 is free — checked against `src/`, `tests/`, every
`*.md`, and `git log --grep=53` on 2026-09-16 at `73496e8`. The only hits for
the string "53" are unrelated commit hashes and Milestone 40-era SHAs.

**Concurrent work.** Antigravity is writing Milestone 54 (dashboard "helpful
links" handling) on this same tree. Its uncommitted working-tree footprint
as observed on 2026-09-16 was `MILESTONE-54-PROPOSAL.md`,
`probate-guardian-data-model.csv`, `src/core/persistence/case-file.js`,
`src/core/persistence/recovery-cache.js`, `src/core/state.js`,
`src/features/dashboard/index.js`, `src/features/dashboard/resources.js`,
and `src/styles/shell.css` — broader than the last dashboard-resources
commit (`7e9596e`) but still **no file 53 touches**. The one file both are
likely to edit is `TEST-INDEX.md` (each adds rows); that is a trivial
line-level merge, not a correctness risk. See "Sequencing and concurrency"
for the sync rule anyway — 54's footprint may grow before 53 starts.

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
| 53A — Delete dead `fmtDateCard` | **Low** | One dead function, red-first dead-code detector | Prerequisite for 53B: it is the only other `fmtDate` caller in `legacy-app.js` |
| 53B — Move the cluster to `src/core/excel/cell-reader.js` | **Medium** | The milestone. Three functions move, three consumers switch to `import`, three globals go | Requires 53A landed. Independent of 53C/53D |
| 53C — Annual Accounting's `fmtD` adopts core `fmtDate` | **Low** (optional) | One character-identical twin removed | Requires 53B. Own approval |
| 53D — Teach the bridge audit to see `const {…} = window` | **Low** (optional) | Governance: closes the blind spot finding 3 describes | Independent of 53A–C. Own approval. Regenerates `window-bridge.d.ts` |

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

## 53A — Delete Dead `fmtDateCard`

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

## 53B — Move the Cluster to `src/core/excel/cell-reader.js`

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
attributable.

**B1. Capture the pre-move baseline for the import gate (B8's "before").**
Before changing any source: run the four existing Excel round-trip e2e specs
and record pass/fail; then run the new
`excel-import-cell-shapes.spec.ts` (B8) against **current** code — it must
pass against the legacy implementation first, or it is testing the wrong
thing.

**B2. Write the shape matrix (B7) against the legacy implementation and
confirm green.** Use `extractLegacyFunction()` from
`tests/unit/support/legacy-source-extract.js` for all three names, compose
them with `new Function(fmtSrc + unwrapSrc + readSrc + '; return { fmtDate,
unwrapCellValue, readCellText };')()`, and run the matrix. Every expected
value in the matrix is a **literal**, not a computed comparison — this run
proves the literals describe shipped behavior. (Milestone 52L built this
extraction helper for exactly this use.)

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
B2 adapter to `import { fmtDate, unwrapCellValue, readCellText } from
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
src/core/types/window-bridge.d.ts` — the diff must be exactly the removal
of `readCellText: any;`. If it is not, either the new comment still contains
the token `window.readCellText` (fix the comment — a comment should not
manufacture a phantom bridge entry) or the tree was not quiet at B0.

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
4. `npm run check:types` — unchanged result expected. Note `tsconfig.json`'s
   `include` does not cover `src/core/excel/`, so the new module is not
   type-checked; that is the status quo for `excel-engine.js` and
   `excel-capacity.js` too and is not changed here (see out of scope).

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
  `simplified:402`). The threat model — a hostile `.xlsx`
  reaching the parser — is addressed upstream by `validateImportFile` and
  `assertWorkbookWithinLimits`, neither of which 53B touches. No new stored
  data.
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

## 53C — Annual Accounting's `fmtD` Adopts Core `fmtDate` (optional)

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
`import { fmtDate } from '../../core/excel/cell-reader.js';` and
`export { fmtDate as fmtD };` — keeping the exported name so the
`date-truncation-helpers.spec.js:6` import is unaffected. Verified
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

## 53D — Teach the Bridge Audit to See `const { … } = window` (optional)

**Risk: Low.** Governance tooling only; no runtime code. Own approval.
Independent of 53A–C.

### Files

`scripts/audit-window-bridge.mjs` (`:78-88`), `src/core/types/window-bridge.d.ts`
(regenerated), `tests/unit/window-bridge.spec.js` (possibly a new case).

### Background

Finding 3: the consumer scan matches only `window.X`. Every feature
`excel.js` and `index.js` — and `dashboard/index.js:12-19`, per Milestone
52's Decision 1 — reaches legacy functions by destructuring, which the audit
does not see. The generated `.d.ts`, whose stated purpose is to let
`tsc --noEmit` check "modules that reach through window," therefore omits
every destructured name. And a consumer can hide from a "who still uses
this global?" question, which is precisely the question 53B had to answer
by hand.

### Steps

**D1.** In `auditWindowBridge()`, add a second consumer pass that matches
`const\s*\{([^}]*)\}\s*=\s*window\b` (multi-line — the destructure blocks
span several lines), splits the captured list on commas, strips
`name: alias` renames and defaults, and records each name as a consumer of
that file under the same `PLATFORM` exclusion.

**D2.** Regenerate the declaration (`--declare`). Expect a **large** additive
diff in `window-bridge.d.ts` — every legacy function destructured anywhere
in `src/` — and no change to the allow-list (it tracks assignments, which
D1 does not touch).

**D3.** Add a case to `window-bridge.spec.js` asserting that a known
destructured-only name (after 53B: `capitalizeImportedFields`, which no
module reads as `window.capitalizeImportedFields`) appears in the audit's
`consumers`. Red before D1, green after.

**D4.** Optionally, a `consumers` diff before/after 53B becomes a
mechanical acceptance check for 53B ("`readCellText` and `unwrapCellValue`
have zero consumers after") — if 53D lands first. Otherwise 53B relies on
the text-search inventory in this document, which is sufficient but manual.

### Verification

`npx vitest run tests/unit/window-bridge.spec.js`, `npm run check:types`
(expect no new errors — every added name is `any`).

### Cross-cutting ramifications (`AGENTS.md` §8)

N/A across the board — this touches no application code. **Sequencing
note:** it regenerates the same `.d.ts` that 53B regenerates. Land it either
strictly before 53B or strictly after; never interleave, per the "regenerate
from merged source, never hand-merge a generated file" rule Milestones 51
and 52 both record.

---

## Sequencing and concurrency

- **53A before 53B.** Not optional: 53B deletes `fmtDate`, and `fmtDateCard`
  calls it.
- **53B is one commit** (Decision 4). Do not leave the tree between "module
  created" and "legacy deleted" — that state has two live implementations.
- **53C after 53B**; **53D before or after 53B**, never interleaved with it
  (both regenerate `window-bridge.d.ts`).
- **Milestone 54 (Antigravity, concurrent).** No shared source file based on
  the last dashboard-resources commit (`7e9596e`). Both will touch
  `TEST-INDEX.md`. Per `AGENTS.md` §1: sync before each sub-delivery,
  re-check `git log`, and verify actual file overlap at the time work starts
  rather than trusting this snapshot. If 54 turns out to touch
  `src/legacy-app.js`, note that 53B's edits are confined to `:970-978` and
  `:1202-1238` (pre-53A numbering) — a conflict is unlikely but if one
  occurs, take both sides; the regions are unrelated.
- **Milestone 51's generated-file rule applies:** a conflict in
  `window-bridge.d.ts` has no correct manual resolution. Regenerate from
  merged source.

---

## Acceptance criteria

| Scenario | Expected result |
| --- | --- |
| `git grep -nE '^(async )?function (fmtDate|fmtDateCard|unwrapCellValue|readCellText)\(' src/legacy-app.js` after 53B | No output |
| `node scripts/audit-window-bridge.mjs --json` after 53B, `assignments` | Byte-identical to before 53A (no global was ever explicitly assigned) |
| `git diff src/core/types/window-bridge.d.ts` for the 53B commit | Exactly one line removed: `  readCellText: any;` |
| `tests/unit/cell-reader.spec.js` shape matrix (B7) | Green against the legacy extract before the move (B2), green against the ES import after; red under both B12 faults |
| `tests/e2e/excel-import-cell-shapes.spec.ts` (B8) | Green before and after 53B; red under both B12 faults; each of the six cell shapes lands in `window.D` as the table specifies |
| Runtime `['fmtDate','fmtDateCard','unwrapCellValue','readCellText'].filter(n => n in window)` (B9) | `[]` |
| Export → re-import round-trip, all three Excel types (`simplified-mount`, `annual-mount`, `guardian-inventory-mount`) | Pass, unchanged |
| 52K's all-schedules-at-capacity round-trip (`guardian-inventory-excel-schedule-layout`) | Pass, unchanged — including the pre-existing `wardPercent` behavior it documents (53B must not mask or fix it) |
| `tests/unit/date-truncation-helpers.spec.js` | Five copies still found (one relocated), all five still guard `Date` before `String(`; `fmtDate` now also behaviorally tested |
| `npm run check:types` | Same result as before 53 |
| 53C only: `expect(fmtD).toBe(fmtDate)` | True — a re-export, not a copy |
| 53D only: audit `consumers` lists `capitalizeImportedFields` | Present, with the three feature `excel.js` files as its consumers |
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

## Appendix: Milestone 54 code review, applied 2026-09-16 (recorded here at Alan's direction)

**Scope note, stated plainly because it doesn't match this document's own
title.** Everything below concerns Milestone 54 (the dashboard Judicial
Circuit selector and Helpful Links accordions, `src/features/dashboard/`
and `src/core/persistence/`) — none of it touches the cell-reader cluster
`legacy-app.js`/`src/core/excel/` this document is otherwise about, and it
shares no file with 53A/53B/53C/53D above. It is recorded here, not in
`MILESTONE-54-PROPOSAL.md`, because Alan asked for it here specifically.
Anyone reconciling the two documents later should treat this appendix as
Milestone 54's change record and `MILESTONE-54-PROPOSAL.md` as its design
proposal — the same split 47/48/49 already use between a proposal and the
commits that actually landed it, just carried by a different file this one
time.

### Defects found in Milestone 54's working-tree implementation and fixed

Found during code review of the (uncommitted, then-unapproved) 54A–54C
implementation Antigravity staged in the working tree; fixed directly since
they were unambiguous bugs, not scope decisions. All six are in files
Milestone 54 already owns; none touch anything Milestone 53 does.

1. **Merge-import clobbered the selected circuit (`src/core/persistence/case-file.js`,
   `decryptCaseFileCore()`).** Defaulted a missing/unreadable
   `selectedCircuit` to `6` unconditionally, so `importSavArchiveOrWard()` —
   which **merges** into the current `caseFile` rather than replacing it —
   overwrote an already-selected circuit to `6` on every import of an
   archive that predates this milestone, including a plain backup restore.
   **First fix (superseded within this same pass — see design decision 8
   below):** the decode returned `null` for absent/invalid instead, so the
   caller's own `if (importedSelectedCircuit)` guard actually guarded.
   **Verified red-first**, not just asserted: temporarily reverted the
   one-line fix and re-ran the new e2e test — `Expected: 12, Received: 6`
   (the first attempt at this confirmation showed a false pass, traced to a
   leftover `vite preview` server reused across two back-to-back
   `playwright test` invocations rather than the fix itself; a second run
   against a verified cold server reproduced the failure). Green after
   restoring the fix. **Then superseded, same day:** decision 8 moved
   `selectedCircuit` out of `encryptCaseFileCore()`/`decryptCaseFileCore()`
   entirely, into the `appState` blob, which the merge-import path never
   reads for anything — removing the write path this bug depended on
   rather than gating it. The regression test below was simplified to match
   (no more zip-stripping needed; the guarantee is now unconditional).
   Recorded both because the *finding* (a merge path must not clobber this
   field) and the *first fix* were both real and red-first-verified, even
   though the code that fix touched was later deleted outright.
2. **Keyboard focus lost on circuit change (`src/features/dashboard/index.js`,
   `renderSidebarResources()`).** The `change` handler replaced
   `sidebarResources.innerHTML` synchronously, destroying the `<select>` the
   user was mid-interaction with — a closed `<select>` fires `change` on
   every arrow-key press in Chromium, so keyboard selection worked for
   exactly one keystroke. Fixed: re-focus `#sidebar-circuit-select` after
   the re-render (same node re-queried from the still-attached
   `sidebarResources` container). Not separately covered by a new automated
   test in this pass — flagged below as the one item still worth a
   dedicated e2e case.
3. **Polymorphic `resourcesPanelHTML()` signature (`src/features/dashboard/resources.js`).**
   The function type-sniffed its second argument
   (`selectedCircuitOrHelpers`) to distinguish a Milestone 47B-style helpers
   object from a Milestone 54-style circuit number, so any call could be
   silently coerced into the wrong branch by a wrong-shaped second argument.
   Fixed: one signature, `resourcesPanelHTML(groups, { selectedCircuit, esc,
   ic })`. Every call site (`index.js`, both spec files) updated in the same
   change; one new unit test added confirming `groups === undefined` still
   derives from `selectedCircuit` via `groupsForCircuit()`.
4. **Loose county-to-group matching (`resources.js`, `groupsForCircuit()`).**
   Matched `g.scope === county || g.heading.startsWith(county)` — the
   `startsWith` half was unneeded (every real group's `scope` already equals
   its `FL_COUNTY_CIRCUIT` key) and could in principle match a county whose
   name prefixes another's. Fixed: `scope` match only.
5. **Always-true guard writing the zip entry (`case-file.js`,
   `buildCaseFileBlob()`).** `if (core.selectedCircuit) zip.file(...)` —
   `core.selectedCircuit` is always a populated encrypted string at that
   point (produced by `encryptCaseFileCore()`'s own `|| 6` default), so the
   condition could never be false. Fixed: write unconditionally, matching
   the three sibling `zip.file(...)` calls immediately above it.
6. **Empty accordion rendered no content (`resources.js`,
   `resourcesPanelHTML()`).** A county with no defined links rendered a bare
   `<div class="sidebar-resource-empty"></div>` even though the CSS styles
   that class as visible italic copy — expanding it showed nothing. Fixed:
   the div now carries "No county-specific links yet — see Florida below."
   Existing spec assertion for the old empty markup updated to match.

**Verification after all six fixes:** full unit suite `npx vitest run` —
78 files / 851 tests, all passing (one net new test, item 1's regression
case). `tests/e2e/case-file-core-fields-roundtrip.spec.ts` — 4/4 passing,
including the new case. `tests/e2e/routes.spec.ts` — run separately;
confirm and record its result before this appendix's fixes are considered
verified, per this repository's own rule that a claimed pass is not
verification until it has actually been run in this session.

### Design decisions — asked, answered, and implemented (2026-09-16)

Three questions were put to Alan as choices; all three were answered and
then implemented in the working tree, not merely recorded. Superseding the
"still open" framing this section originally had.

**8. Where `caseFile.selectedCircuit` persists — moved to the `appState`
blob.** Chosen over the original CSV-row + dedicated `.enc` zip-entry
design (which widened the four-field `encryptCaseFileCore()`/
`decryptCaseFileCore()` fan-out Milestone 52B had just consolidated) and
over `localStorage` (which would not travel with an exported `.sav`).
Implemented:

- `encryptCaseFileCore()`/`decryptCaseFileCore()` (`case-file.js`) reverted
  to their pre-54 four-field shape — `selectedCircuit` removed from both.
- `buildCaseFileBlob()`'s `appStateBlob` object gained
  `selectedCircuit: caseFile.selectedCircuit || 6` alongside
  `walkthroughCompleted`/`recentWards`/etc. (case-scoped, not launch-scoped,
  hence sourced from `caseFile` rather than `loadAppState()` like its
  siblings — commented in place).
- `legacy-app.js`'s `loadCaseFileFromZip()` (the **full .sav open** path)
  reads it back inside the existing `if(manifest.appState)` block and sets
  `caseFile.selectedCircuit`, clamped to 1–20 with a fallback to 6.
- `importSavArchiveOrWard()` (the **merge** path — Open Backup/Restore/
  Import) does not read `manifest.appState` for anything, including this,
  and now never did for `selectedCircuit` either — this is what makes the
  original clobber bug (defect 1, above) structurally impossible rather
  than patched: there is no longer a write path from a merge-import to
  `caseFile.selectedCircuit` at all.
- `recovery-cache.js`'s `saveSessionRestoreCache()`/
  `checkSessionRestoreCacheAtLaunch()` (crash recovery) likewise no longer
  carry it, matching every other `appState` field — none of which survive
  crash recovery either.
- The `probate-guardian-data-model.csv` row added for 54A was removed
  (`npm run verify:data-model`: back to 914 rows, clean) — `appState` blob
  fields have never had CSV rows, matching `walkthroughCompleted` etc.
- `tests/e2e/case-file-core-fields-roundtrip.spec.ts`'s regression test
  (defect 1, above) was simplified accordingly: it no longer needs to
  strip a zip entry to prove the point, since the guarantee is now
  unconditional — importing *any* archive, regardless of what circuit data
  it itself carries, must never change the current session's selection.

**9. Decision D4's fate — its intent survives as the selector's *default*,
not as a filter.** `groupsForCounties()` (which filtered which of a fixed
four groups to show, based on the filing's county) is deleted. In its
place, `resources.js` exports `deriveDefaultCircuit(counties)`: tallies the
circuits implied by the user's filings' counties (via the existing
`circuitForCounty()` in `circuit-lookup.js`) and returns the most common one
(ties broken toward the lower circuit number), or `null` if no filing has a
resolvable county. `dashboard/index.js`'s `renderSidebarResources()` now
computes `cf?.selectedCircuit ?? deriveDefaultCircuit(counties) ?? 6` —
a manual selection (a concrete number on `caseFile.selectedCircuit`, set
only by the `<select>`'s `change` handler) always wins; absent one, the
default tracks the filings live rather than sitting at a fixed 6. This also
resolves the dead-code item the original punch list flagged: there is no
longer an unused `groupsForCounties()` sitting next to its replacement.
`tests/unit/dashboard-resources.spec.js`'s old "groupsForCounties policy
(Decision D4)" block was replaced with a `deriveDefaultCircuit` block
covering the empty/no-match case, single-county resolution, multi-filing
plurality, and the tie-break rule.

**A gating mechanism this deletion touched, found and fixed in the same
pass.** `groupsForCounties()` was also the AO 2024-025 compliance gate
`tests/unit/content-corrections.spec.js` pins (Milestone 36-5/47B, per
`AGENTS.md` §5's county-gating rule: a circuit-specific administrative
order must never be shown as a statewide requirement). Deleting it without
adjustment would have left the Sixth Circuit's resource group — and the AO
2024-025 link inside it — rendering unconditionally. It does not: the group
is included only when its own `scope` (`'circuit-6'`) matches the
*selected* circuit, generalized in `groupsForCircuit()` from a hardcoded
`cNum === 6` check to a `RESOURCE_GROUPS.find(g => g.scope === \`circuit-${cNum}\`)`
lookup — which also means a future circuit-level group (the helpful-links
task below) is picked up automatically. The content-corrections test was
updated to check for this new mechanism rather than the deleted function's
name. **Flagged, not resolved:** this is a *different* exposure than 47B's,
not merely a mechanical substitute — 47B gated the group by the counties on
the user's own filings (a filer outside Pinellas/Pasco never saw it); the
circuit selector gates it by the user's own *browsing choice*, so a filer
whose filings are entirely in, say, the 13th Circuit can now see the AO
2024-025 link by manually selecting the Sixth Circuit from the dropdown.
Nothing in the UI asserts the order applies to their filing, and it remains
inside the panel's own third-party disclaimer either way — but whether that
satisfies `AGENTS.md` §5's intent is a judgment call for a qualified
reviewer, not settled here, per §8's "flag for a qualified person" rule.
Both the code comment (`resources.js`) and the test comment
(`content-corrections.spec.js`) record this explicitly.

**10. County ordering — kept alphabetical everywhere.** No code change:
this was already the implementation (`countiesForCircuit()`'s
`.sort((a, b) => a.localeCompare(b))`), so Pasco sorting before Pinellas in
the Sixth Circuit is confirmed deliberate, not an oversight.

**Verification after all three decisions' implementation:** full unit
suite `npx vitest run` — 78 files / 852 tests, all passing (one net new
test versus the six-defects pass: the import-clobber regression stayed at
one test, simplified; the `deriveDefaultCircuit` block added six covering
the old `groupsForCounties` block's five). `npm run verify:data-model` —
914 rows, clean (back to the pre-54A count). `npx tsc --noEmit` — no new
errors in any touched file (the pre-existing failures elsewhere are
unrelated to Milestone 54 and predate this session).
`tests/e2e/case-file-core-fields-roundtrip.spec.ts` — 4/4.
`tests/e2e/routes.spec.ts` — 23/23, including "helpful resources panel is
visible on dashboard, hidden inside filings, and restored on return," which
exercises `resourcesPanelHTML()`/`groupsForCircuit()`/`deriveDefaultCircuit()`
end to end through a real browser. All commands actually run in this
session; none of these numbers are asserted from memory.

**Net effect on the working tree versus what Antigravity staged.** Every
fix and decision above was applied directly to the same uncommitted
working-tree files Milestone 54's implementation already occupied — nothing
here has been committed, and the whole tree remains gated on Alan's
approval per `AGENTS.md` §2, same as before this appendix. One file ended up net-unchanged from `origin/master` despite being edited
along the way: `probate-guardian-data-model.csv` (54A added the
`selectedCircuit` row, decision 8 removed it again once the field moved to
the `appState` blob). `git status` reflects only files that still differ
from `origin/master`.

### New task: wire `MILESTONE-54-HELPFUL-LINKS.md` into `RESOURCE_GROUPS`

Added at Alan's direction, **gated on Milestone 54's circuit-selector
structure landing and working first** — this task assumes `groupsForCircuit()`,
the stub-group shape (`{ id, heading, scope, links: [] }` for a county with
no data), and the fixes above are already in place and approved, since it
is meaningless to wire real link data into stub groups that might still
change shape.

`MILESTONE-54-HELPFUL-LINKS.md` (Alan's own research, confirmed not
AI-fabricated) is a county-by-county and circuit-by-circuit link catalog
covering all 67 Florida counties and all 20 judicial circuits, prepared as
the data source for populating every county's accordion beyond the
currently-hardcoded Pinellas/Pasco/Sixth-Circuit/Florida groups in
`RESOURCE_GROUPS`.

**What "wiring it in" means concretely:**

- Parse `MILESTONE-54-HELPFUL-LINKS.md`'s circuit map and per-county link
  tables into `RESOURCE_GROUPS` entries matching the existing shape (`id`,
  `heading`, `scope`, `links: [{ id, label, description, url }]`), reusing
  its own "Suggested standard county/circuit descriptions" where a
  county-specific description wasn't given.
- Every added `url` must be `https:` and added to
  `dashboard-resources.spec.js`'s `EXPECTED_HOSTS` allowlist — that spec
  already asserts every `RESOURCE_GROUPS` link's host is on the allowlist,
  so this is not optional scaffolding, it is the existing test gate.
  67 counties' worth of new hostnames is a large, mechanical addition to
  that Set; generate it from the same source rather than retyping it by
  hand, so the two lists can't drift.
- `RESOURCE_GROUPS`'s existing `Object.freeze()` wrapping (group and link
  level) must cover every newly-added group and link the same way the
  current ones are covered — `dashboard-resources.spec.js`'s "RESOURCE_GROUPS
  and link collections are frozen" test already checks this and will catch
  an unfrozen addition.
- Circuit-level groups (the "Sixth Judicial Circuit" pattern, `scope:
  'circuit-N'`) should be added for every circuit `MILESTONE-54-HELPFUL-LINKS.md`
  gives one for, not only the Sixth. **Already generalized, not still
  needed:** `groupsForCircuit()`'s circuit-level lookup no longer hardcodes
  `cNum === 6` — fixed during this appendix's own defect/decision pass
  (it was also the AO 2024-025 compliance gate, see decision 9 above) to
  `RESOURCE_GROUPS.find(g => g.scope === \`circuit-${cNum}\`)`. A new
  `scope: 'circuit-N'` group is picked up automatically; no `resources.js`
  change needed for this part.
- Once real data exists for a county, `countiesForCircuit()` /
  `groupsForCircuit()` should no longer need the empty-stub fallback for
  that county — a good acceptance check is that the number of stub
  (`links: []`) groups an expanded circuit's `groupsForCircuit()` call
  produces drops to zero.
- Update `TEST-INDEX.md`'s row for `dashboard-resources.spec.js` and add
  whatever new assertions make sense for the expanded catalog (at minimum:
  link-id uniqueness and the host allowlist, both already generic over
  `RESOURCE_GROUPS` and needing no new test code — just the data).

**Not scoped here:** deciding *which* circuits/counties to prioritize if
not all 67 land in one pass, or resolving `MILESTONE-54-HELPFUL-LINKS.md`'s
own noted placeholder choices (e.g. pointing both "Clerk — Guardianships"
and "Court Records" at the same landing page where no deep link was found)
— those are content decisions for whoever executes this task, working from
that document's own stated research notes.
