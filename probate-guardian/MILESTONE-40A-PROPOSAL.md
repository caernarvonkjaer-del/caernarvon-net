# Milestone 40A: Deprecate and Remove DOCX Export

## Status

**Draft only — independently approved delivery.** This proposal authorizes
no runtime, test, or documentation change until the requester approves
Milestone 40A specifically. Approval of another Milestone 40 delivery does
not authorize this work.

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
  and `plan-readiness-county.spec.js:25`. **Note:
  `plan-readiness-county.spec.js` is also modified by Milestone 40C** —
  see the dependency table in `MILESTONE-40-PROPOSAL.md`.
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
