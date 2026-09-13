# Milestone 40A: Deprecate and Remove DOCX Export

## Status

**Landed 2026-09-13.** DOCX export is gone: the engine, all seven feature
entry points across three dispatch conventions, the capability declarations,
and the test surface. Two decisions and three corrections to this proposal are
recorded below.

### Decisions taken

**Item 6 — `filing-matrix.ts`'s `exports.docx`: dropped the key** rather than
pinning it false. No consumer read it (checked all five importers:
`filing-capability-matrix.spec.ts` reads `exports.xlsx` and otherwise iterates
`Object.entries(entry.exports)` generically, so it adapts to the smaller shape
on its own; `output-semantics.artifact.spec.ts` reads only `exports.xlsx`; the
other three never touch `exports`). A permanently-false flag would imply the
format is merely disabled when the app no longer has the concept.

**Item 7 — the `docx-xlsx-export` TEST-INDEX category is renamed
`xlsx-export`, not split.** Nothing remains on the DOCX side to split off.

### Correction 1: the runtime surface was larger than enumerated — a whole capability layer

The seven-`print.js` enumeration was accurate and complete for the *export
path*. But DOCX was also declared as a **product capability** in four places
this proposal did not list, none reachable from a "Save as Word" grep:

- `src/core/filing/filing-descriptor.js` — `capabilities: { pdf, docx, excel }`
  on **all nine descriptors**.
- `src/core/types/filing.js` — the `FilingCapabilities` typedef's `docx`
  property.
- `src/core/validation/issue-registry.js` — `'docx'` in the `ALL` channel list
  every issue's `capabilities` array is built from.
- `src/core/filing/output-preflight.js` and `src/core/pdf/pdf-preview.js` —
  comments describing DOCX as a live consumer of the shared export boundary.

Confirmed safe to remove rather than merely inert: **nothing reads
`capabilities.docx`**, and no caller ever passes `capability: 'docx'` to
`authorizeFilingOutput()` (the only literal in use is `'preview'`). So these
were declarations advertising a format, not logic gating one — but leaving them
would have left the app claiming a capability it no longer has.

### Correction 2: item 3 inverts — `docx-extract.ts` is deleted, not kept

This proposal says to keep `tests/e2e/support/docx-extract.ts` because
`output-semantics.artifact.spec.ts` and `filing-identity.contract.spec.ts`
import it and are "neither DOCX-specific."

Those two specs are not DOCX-specific *as wholes*, but the thing they import
`extractDocx` **for** is: each has a dedicated DOCX assertion block
(output-semantics' "2. DOCX Semantic Assertions" section, filing-identity's
"Surface 5"). Both blocks download a `.docx`, unzip it and assert on
`word/document.xml` and `docProps/core.xml` — there is nothing left for them to
extract once the format is gone. Those blocks are removed, along with each
spec's `saveWordValue` config field (nine entries each), `wordActionSelector`,
and the DOCX half of the Final/Trust "must not be emitted as an Annual
Accounting" check. `extractDocx` then has no importer, so the helper is deleted.
`xlsx-extract.ts`'s comment referencing it was updated — the proposal was right
that it only mentions the file rather than importing it.

### Correction 3: Milestone 40E's DOCX fix is deleted by this milestone

Milestone 40E (landed 2026-09-12, one commit earlier) fixed `docx-engine.js` to
render a multi-line address cell as one paragraph per component, because it
consumed the same `block.rows` model the PDF engine does. That fix, and the two
unit tests covering it, are removed here along with the engine.

That was avoidable and worth recording: this proposal's own shared-file table in
`MILESTONE-40-PROPOSAL.md` lists `docx-engine.js` under **40A and 40C-1 only**,
so a 40E implementer following the table had no signal that the file was slated
for deletion. The table is now corrected. The PDF half of 40E stands unchanged
and is what actually fixed the reported overflow.

## Goal

Remove the "Save as Word" DOCX export path entirely — code, UI entry
points, and its real test surface — rather than keep it as a maintained
fallback format.

## Background

`src/core/docx/docx-engine.js` and its "Save as Word" export path are
deprecated by requester decision. This supersedes the DOCX-related notes in
`MILESTONE-39-PROPOSAL.md` (39-B's signature-image-in-DOCX fallback, and
the "Related, Out-of-Scope Work" DOCX-fidelity item): once this milestone
removes the feature, there's nothing left to design a fallback for. Until
this lands, DOCX export keeps working exactly as it does today, including
39-B's interim text-only fallback for signature stamps.

### Runtime surface, enumerated (review pass 2026-09-12)

"Every 'Save as Word' UI entry point across all nine filing types" was too
loose to execute against — the real surface is **seven** feature modules
(not nine: `annual-accounting` serves annual, final, and trust) reached
through **three different dispatch conventions**. Confirmed exhaustively;
treat as a minimum checklist, since line numbers will shift:

- **Seven `print.js` importers**, each
  `import { generateCourtFormDocx, saveFinalizedDocx } from '.../docx-engine.js'`
  plus that module's own `doSaveDocx()` implementation:
  `annual-accounting/print.js:17`, `guardian-inventory/print.js:21`,
  `plan-annual/print.js:21`, `plan-initial/print.js:21`,
  `plan-minor/print.js:18`, `plan-simplified/print.js:21`,
  `simplified-accounting/print.js:15`.
- **Seven "Save as Word" buttons**, in those same `print.js` files:
  `annual-accounting:46`, `guardian-inventory:56`, `plan-annual:125`,
  `plan-initial:116`, `plan-minor:106`, `plan-simplified:109`,
  `simplified-accounting:43`.
- **Dispatch convention 1 — feature-local action names**, four
  `case 'save-word': _printModule.doSaveDocx(); break;` handlers:
  `annual-accounting/index.js:302`, `guardian-inventory/index.js:160`,
  `plan-simplified/index.js:54`, `simplified-accounting/index.js:109`
  (buttons use `data-annual-action` / `data-inventory-action` /
  `data-plan-simplified-action` / `data-simplified-action`).
- **Dispatch convention 2 — global `data-form-action`**, three cases in
  `src/form-events.js:68,70,72` (`save-word-plan-annual`,
  `save-word-plan-initial`, `save-word-plan-minor`).
- **Dispatch convention 3 — `window.doSaveWordPlanX` globals** installed
  for convention 2 to call: `plan-annual/index.js:56`,
  `plan-initial/index.js:54`, `plan-minor/index.js:53`, each with an
  adjacent explanatory comment (`:50`, `:48`, `:48`) that also needs
  updating, not just the assignment deleted.
- **User-facing prose, not just a control:**
  `guardian-inventory/print.js:53` reads "use **Save as Word** (editable
  copy), **Save as PDF**, **Save as Excel**, or **Print**." That sentence
  must be rewritten, not have a button removed from it. Check the other
  six `print.js` headers for the same pattern before assuming this is the
  only one.

### Test surface, corrected (review pass 2026-09-12)

The earlier three-item list was substantially incomplete. Confirmed by
direct grep, the real surface is eleven files in four categories:

- **Delete outright (DOCX-specific):** `tests/unit/docx-engine.spec.js`.
- **Breaks at load time if `docx-engine.js` is deleted — five unit specs
  that `vi.mock` the module path.** Vitest fails to resolve a mocked
  module that no longer exists, so each of these must have its mock
  removed in the same change, not afterward:
  `plan-annual-parity.spec.js:55`, `plan-initial-parity.spec.js:51`,
  `plan-minor-parity.spec.js:37`, `plan-simplified-parity.spec.js:39`,
  and `plan-readiness-county.spec.js:25`. **Correction 2026-09-12:** an
  earlier version of this note claimed `plan-readiness-county.spec.js` is
  also modified by Milestone 40C. It is not — that spec passes `county`
  explicitly into every case (`:48-49`) and already asserts "a blank
  county is treated as non-local, not defaulted to Sixth Circuit" (`:70`),
  so 40C's county work leaves it alone. **40A is the only delivery that
  edits this file**, and only to drop the mock.
- **A whole e2e test to delete, not update:**
  `tests/e2e/guardian-inventory-mount.spec.ts:299-325`, "a fully completed
  filing exports a valid editable Word document (.docx)" — it downloads
  the file, unzips it, and asserts on `word/document.xml`. There is
  nothing left for it to assert once the feature is gone.
- **Shared capability matrix:** `tests/e2e/support/filing-matrix.ts`
  declares `exports: { pdf: boolean; docx: boolean; xlsx: boolean }`
  (`:38`) with `docx: true` on all nine filing-type entries (`:80-128`),
  plus explanatory comments at `:7`, `:28`, `:69-70`, and `:166`. Decide
  deliberately whether to drop the `docx` key from the type and every
  entry, or keep the key and set it false — dropping it is cleaner but
  touches every consumer of the matrix, so check those first.
- **Keep, don't delete:** `tests/e2e/support/docx-extract.ts` is imported
  by `output-semantics.artifact.spec.ts` and
  `filing-identity.contract.spec.ts` (`import { extractDocx } from
  './support/docx-extract'`), neither of which is DOCX-specific. Extract
  whatever cross-cutting piece those two actually need.
  (`xlsx-extract.ts` only *mentions* it in a comment — "mirroring
  tests/e2e/support/docx-extract.ts" — it does not import it; an earlier
  version of this proposal listed it as a third importer in error.)
- **`TEST-INDEX.md` category:** `docx-xlsx-export` currently bundles DOCX
  and Excel export coverage together.

## Decisions / Implementation

1. Delete `src/core/docx/docx-engine.js` and every "Save as Word" UI entry
   point (buttons, menu items) across all nine filing types, plus their
   e2e coverage — not just the generation code.
2. Delete `docx-engine.spec.js`.
3. Keep `docx-extract.ts`. Extract whatever cross-cutting piece
   `output-semantics.artifact.spec.ts` and `filing-identity.contract.spec.ts`
   actually need from it, rather than deleting the file wholesale and
   breaking two unrelated specs.
4. **Remove the `vi.mock('.../docx-engine.js', ...)` line from all five
   unit specs listed above in the same commit as the deletion** — not as
   follow-up cleanup. A `vi.mock` pointing at a deleted path fails at
   module resolution, so leaving these until "after" means the unit suite
   is red in between. Confirm each spec still passes on its own merits
   once the mock is gone (they mock it only to keep DOCX out of a
   readiness/parity assertion, so removing the mock should be inert — but
   verify rather than assume, especially `plan-readiness-county.spec.js`,
   which Milestone 40C also edits).
5. Delete `tests/e2e/guardian-inventory-mount.spec.ts:299-325` (the
   `.docx` export test) outright.
6. Resolve `tests/e2e/support/filing-matrix.ts`'s `exports.docx`
   capability field — drop the key from the type and all nine entries, or
   set it false — and update its four explanatory comments. Check every
   consumer of the matrix before choosing, since dropping the key changes
   the shape they destructure.
7. Split or rename the `docx-xlsx-export` `TEST-INDEX.md` category so
   Excel-export coverage isn't described as covering DOCX after DOCX no
   longer exists.
8. Sweep for any other reference to `docx-engine.js` or "Save as Word"
   (help text, onboarding copy, README-style docs) and remove or correct
   it — don't leave a dangling mention of a feature that no longer exists.
   `pdf-engine.js:759`'s comment ("matching docx-engine.js:447") is one
   confirmed instance: a code comment cross-referencing a file that will
   no longer exist.

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| Any filing type's Preview & Export page | No "Save as Word" button or menu entry remains. |
| `docx-engine.js` import anywhere in `src/` | None found. |
| Each of the seven feature `print.js` files | No `generateCourtFormDocx`/`saveFinalizedDocx` import and no `doSaveDocx()` implementation remains. |
| All three dispatch conventions | No `case 'save-word'`, no `save-word-plan-*` `data-form-action` case, and no `window.doSaveWordPlanX` global remains. |
| `guardian-inventory/print.js`'s preview header sentence | Reads naturally without "Save as Word" — not a sentence with a gap or dangling comma. |
| `npm run test:unit` immediately after the deletion commit | Green. Specifically, none of the five former `vi.mock` specs fails at module resolution. |
| `tests/e2e/support/filing-matrix.ts` | No entry advertises a DOCX export capability that no longer exists; every consumer still type-checks (`npm run check:types`). |
| `output-semantics.artifact.spec.ts`, `filing-identity.contract.spec.ts` | Still pass, unaffected by the `docx-extract.ts` change. |
| `TEST-INDEX.md` | No row describes DOCX-specific coverage as still active; the `docx-xlsx-export` category (or its replacement) accurately scopes to Excel only. |
| Full grep for "Word" / "docx" in user-facing copy | No stale reference to a removed export option. |

## Verification

Run `npm run test:unit` first and in full — the five `vi.mock` specs make
the unit suite the most likely thing to break, and it's fast enough to
gate on. Then run the e2e set touched by removal (whatever remains of the
`docx-xlsx-export` category, `filing-identity.contract.spec.ts`,
`output-semantics.artifact.spec.ts`, `guardian-inventory-mount.spec.ts`)
plus `npm run check:types` for the `filing-matrix.ts` shape change, and a
repo-wide grep for `docx-engine` and "Save as Word" to confirm no dangling
reference remains. Update `TEST-INDEX.md` in the same commit as the
test-file changes. This is a deletion-shaped change that touches eleven
test files including two shared support helpers — recommend the full
`npm test` regression before commit/push, per `AGENTS.md`.

### What was actually run (2026-09-13)

Followed as written, and the recommended full regression was run rather than
skipped:

- `npm run test:unit` first, as the gate: **492 passed**, down five with
  `docx-engine.spec.js` deleted. None of the five former `vi.mock` specs failed
  at module resolution, which was this milestone's most likely breakage.
- `npm run check:types` clean, covering the `filing-matrix.ts` shape change
  (`exports` losing a key) across all five of its importers.
- A fail-fast e2e sweep of the six most-affected specs — `output-semantics`,
  `filing-identity`, `filing-capability-matrix`, `guardian-inventory-mount`,
  `pdf-structure-tags`, `pdf-accessibility-and-signatures`: **48 passed**.
- Then the full e2e suite (all 62 specs), per the recommendation above:
  **385 passed, 6 skipped, 9 failed — and all 9 failures were confirmed
  pre-existing on `master`**, not caused by this milestone. Verified by
  stashing the entire 40A change set, re-running those three spec files
  against untouched HEAD, and getting the identical nine failures; the work
  was then restored and the diffstat compared line-for-line
  (40 files, 200 insertions, 1818 deletions) to prove the round trip lost
  nothing. The failures are `pdf-preview-viewer.spec.ts:114` (the same
  "incomplete filing's embedded preview is blocked" test across seven filing
  types), `schedule-card-layout.spec.ts:177`, and `security.spec.ts:53`.
  They are recorded here because the full-suite recommendation is what
  surfaced them, but they belong to no Milestone 40 delivery and are
  **unfixed**.
- Acceptance greps all clean: no `docx-engine` reference in `src/`, no
  `generateCourtFormDocx`/`saveFinalizedDocx`/`doSaveDocx`, no `case
  'save-word'`, no `save-word-plan-*`, no `window.doSaveWordPlanX`, and no
  "Save as Word" anywhere in `src/`.

Two intentional keeps, both checked rather than assumed:

- **`AGENTS.md`'s `GD*.docx`** stays. That names the Clerk of Court's own
  published Word audit guidelines — an external document set in the authority
  hierarchy, not this app's export. The same file's review-checklist mention of
  "DOCX/Excel export" *was* ours and is now "PDF/Excel export".
- **`jszip` stays a devDependency.** `docx-extract.ts` was not its only
  consumer: `xlsx-extract.ts`, `case-file.spec.js`, `xlsx-extract.spec.js`,
  `backup-restore-sav.spec.ts` and `guardian-inventory-mount.spec.ts` all still
  import it.

`verify:data-model` was not required: no persisted field changed.
`filing-descriptor.capabilities` is runtime-declarative and never serialized
into a `.sav`.
