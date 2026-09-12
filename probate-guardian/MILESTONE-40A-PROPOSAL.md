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

Removal isn't just deleting `docx-engine.js`. Checked `TEST-INDEX.md`
directly — DOCX has its own real test surface, and one file in it is
shared with non-DOCX coverage:

- `docx-engine.spec.js` — unit tests for DOCX generation. DOCX-specific;
  safe to delete outright.
- `docx-extract.ts` — an e2e support helper. **Not** safe to delete
  outright: also imported by `output-semantics.artifact.spec.ts` and
  `filing-identity.contract.spec.ts` (`import { extractDocx } from
  './support/docx-extract'`), neither of which is DOCX-specific.
  (`xlsx-extract.ts` only *mentions* `docx-extract.ts` in a comment —
  "mirroring tests/e2e/support/docx-extract.ts" — it does not import it;
  an earlier version of this proposal listed it as a third importer in
  error.)
- `docx-xlsx-export` — a `TEST-INDEX.md` test category that currently
  bundles DOCX and Excel export coverage together.

## Decisions / Implementation

1. Delete `src/core/docx/docx-engine.js` and every "Save as Word" UI entry
   point (buttons, menu items) across all nine filing types, plus their
   e2e coverage — not just the generation code.
2. Delete `docx-engine.spec.js`.
3. Keep `docx-extract.ts`. Extract whatever cross-cutting piece
   `xlsx-extract.ts`, `output-semantics.artifact.spec.ts`, and
   `filing-identity.contract.spec.ts` actually need from it, rather than
   deleting the file wholesale and breaking three unrelated specs.
4. Split or rename the `docx-xlsx-export` `TEST-INDEX.md` category so
   Excel-export coverage isn't described as covering DOCX after DOCX no
   longer exists.
5. Sweep for any other reference to `docx-engine.js` or "Save as Word"
   (help text, onboarding copy, README-style docs) and remove or correct
   it — don't leave a dangling mention of a feature that no longer exists.

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| Any filing type's Preview & Export page | No "Save as Word" button or menu entry remains. |
| `docx-engine.js` import anywhere in `src/` | None found. |
| `output-semantics.artifact.spec.ts`, `filing-identity.contract.spec.ts` | Still pass, unaffected by the `docx-extract.ts` change. |
| `TEST-INDEX.md` | No row describes DOCX-specific coverage as still active; the `docx-xlsx-export` category (or its replacement) accurately scopes to Excel only. |
| Full grep for "Word" / "docx" in user-facing copy | No stale reference to a removed export option. |

## Verification

Run the full targeted set touched by removal (whatever remains of the
`docx-xlsx-export` category, `xlsx-extract.ts`-dependent specs,
`filing-identity.contract.spec.ts`, `output-semantics.artifact.spec.ts`)
plus a repo-wide grep for `docx-engine` and "Save as Word" to confirm no
dangling reference remains. Update `TEST-INDEX.md` in the same commit as
the test-file changes. This is a deletion-shaped change with a real risk
of breaking shared test helpers — recommend the full `npm test` regression
before commit/push, per `AGENTS.md`, given `docx-extract.ts`'s three
non-DOCX dependents.
