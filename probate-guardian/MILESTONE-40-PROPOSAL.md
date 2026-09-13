# Milestone 40: Delivery Index

## Status

**Planning index only — no delivery is authorized.** The former single
draft has been split into six independently reviewed and approved
deliveries, the same pattern used for Milestone 38. Approval or
implementation of one does not authorize another.

| Delivery | Scope | Status | Proposal |
| --- | --- | --- | --- |
| 40A | Deprecate and remove DOCX export, including its test surface | Ready to scope for implementation | `MILESTONE-40A-PROPOSAL.md` |
| 40B | 4-digit PIN per party for signature stamps | **Withdrawn** — requester chose not to build it (deterrent-only value judged not worth it) | `MILESTONE-40B-PROPOSAL.md` |
| 40C | Validated browser QA/UX remediation (county defaulting, Cover labeling, date-range entry, readiness/export parity, carryover, Plan Initial Q7 validation bug) | Ready to scope for implementation | `MILESTONE-40C-PROPOSAL.md` |
| 40D | Move theme/UI-only preferences from `.sav` app state to `localStorage` | Ready to scope for implementation | `MILESTONE-40D-PROPOSAL.md` |
| 40E | Fix PDF table cells overflowing instead of wrapping multi-line addresses | Ready to scope for implementation | `MILESTONE-40E-PROPOSAL.md` |
| 40F | Unify the duplicate save/autosave/export pipeline (`legacy-app.js` vs. `case-file.js`), fix its false "Last backup" indicator bugs, and remove the inert Tauri desktop scaffolding (filesystem ward-backup, OS-keychain "remember password") | Ready to scope for implementation | `MILESTONE-40F-PROPOSAL.md` |

## How These Ended Up Together

40A and 40B surfaced during `MILESTONE-39-PROPOSAL.md`'s scoping
conversation but belong to neither that milestone's scope nor each
other's: DOCX removal is a deprecation decision, not a PDF/signature
feature, and the party PIN is a general security control, not a
PDF/signature feature either. 40C records the validated browser QA/UX
findings reviewed after Milestone 37. 40D and 40E each surfaced
independently while reviewing unrelated work (the portfolio UI starter
kit, and a live PDF export bug report). 40F surfaced from a requested
review of the autosave feature, which found two complete, independent
implementations of the same save pipeline silently shadowing each other.

## Implementation Order and Shared Files

**Correction (review pass 2026-09-12):** this section previously stated
"None of the six depends on any other; there is no required
implementation order between them." That is wrong — a task-by-task review
found four places where two deliveries edit the same file, and in three of
them the order changes how much work the second one is. No delivery
*blocks* another, so any of them can still be approved and implemented
alone; but whoever implements second needs to expect these.

| Shared file | Deliveries | Interaction | Recommended order |
| --- | --- | --- | --- |
| `src/core/docx/docx-engine.js` | 40A, 40C | 40C Task 40C-A item 6 removes the Pinellas caption fallback at `docx-engine.js:350`; 40A **deletes the whole file**. | **40A first** — then 40C's docx half is moot, and 40C should confirm which order actually landed rather than assume (it already says so). |
| `tests/unit/plan-readiness-county.spec.js` | 40A, 40C | 40A must remove this spec's `vi.mock('.../docx-engine.js')` at `:25`; 40C rewrites its readiness assertions. | Either, but expect a conflict in this file and reconcile rather than overwrite. |
| `buildCaseFileBlob()`'s `appStateBlob` — `src/core/persistence/case-file.js:188-197` | 40D, 40F | 40D stops serializing `theme` (`:189`); 40F changes the `lastExportAt` read (`:195`). Two lines apart in one object literal. Separately, 40F deletes `legacy-app.js`'s dead duplicate `buildCaseFileBlob()` (`:3066`), which carries its own `theme` line. | **40F first** — it removes one of 40D's seven theme sites for free. Otherwise 40D must edit both copies to avoid leaving one migrated and one not. |
| `src/core/pdf/pdf-engine.js` | 40C, 40E | 40C edits the county caption fallback (`:166`); 40E adds an array branch to `measureCell()` (`:1143`). Different functions, ~1000 lines apart. | Either. Lowest-risk pairing in the set — noted only so a merge conflict in this file isn't mistaken for a scope collision. |

One ordering consequence worth stating plainly: **40A before 40C, and 40F
before 40D**, is the sequence that minimizes total work. The
risk-ascending sequence recommended for a single continuous
implementation pass — 40E → 40D → 40A → 40C → 40F — does *not* satisfy
either of those. Pick one objective or the other deliberately rather than
discovering the tension mid-pass; if the deliveries are implemented one at
a time over separate sessions (the likelier case), the shared-file column
above is what matters and the global sequence does not.

## Approval

Each proposal is self-contained: its own Status, Goal, Background,
concrete implementation steps, Acceptance Criteria, and Verification
plan. Before implementing any one, obtain explicit approval naming that
delivery, re-check its assumptions against current `master` (several
reference exact file/line locations that may have moved), select tests
through `TEST-INDEX.md`, and follow `AGENTS.md`'s commit and regression
policy. 40B is withdrawn and will not be scoped further.
