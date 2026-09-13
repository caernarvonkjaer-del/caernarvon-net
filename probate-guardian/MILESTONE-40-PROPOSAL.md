# Milestone 40: Delivery Index

## Status

**Planning index only — no delivery is authorized.** The former single
draft has been split into independently reviewed and approved deliveries,
the same pattern used for Milestone 38. Approval or implementation of one
does not authorize another. 40C was itself split in two on 2026-09-12
(both halves documented inside `MILESTONE-40C-PROPOSAL.md`) after a
task-by-task review found it bundled a data-model expansion and a
one-predicate validation bug behind a single gate.

| Delivery | Scope | Status | Proposal |
| --- | --- | --- | --- |
| 40A | Deprecate and remove DOCX export, including its test surface | Ready to scope for implementation | `MILESTONE-40A-PROPOSAL.md` |
| 40B | 4-digit PIN per party for signature stamps | **Withdrawn** — requester chose not to build it (deterrent-only value judged not worth it) | `MILESTONE-40B-PROPOSAL.md` |
| 40C-1 | County establishment, hydration, and carryover (Tasks 40C-A, 40C-F, 40C-G2) — the only delivery touching persisted data | Ready to implement on approval; the unknown-circuit decision was resolved 2026-09-12 (option (a)) | `MILESTONE-40C-PROPOSAL.md` |
| 40C-2 | Form-entry, readiness, and validation corrections (Tasks 40C-B, 40C-C, 40C-D, 40C-E, 40C-G1, 40C-H) — no persisted-data change | Ready to implement on approval; claims code-verified 2026-09-12 | `MILESTONE-40C-PROPOSAL.md` |
| 40D | Move theme/UI-only preferences from `.sav` app state to `localStorage` | Ready to scope for implementation | `MILESTONE-40D-PROPOSAL.md` |
| 40E | Fix PDF table cells overflowing instead of wrapping multi-line addresses | **Landed 2026-09-12**: `measureCell()` array branch plus both certificate-of-service call sites. Two additions the proposal had not anticipated — `docx-engine.js` reads the same model and would have rendered the array bare-comma-joined, and Simplified Accounting dropped `line4` in its recipient *filter* as well as its join | `MILESTONE-40E-PROPOSAL.md` |
| 40F | Unify the duplicate save/autosave/export pipeline (`legacy-app.js` vs. `case-file.js`), fix its false "Last backup" indicator bugs, and remove the inert Tauri desktop scaffolding (filesystem ward-backup, OS-keychain "remember password") | **Landed in full 2026-09-13** (`9ac92dd`, `4ad99c1`, `619cfd8`, `c0165c5`): boot `ReferenceError` fixed, one save clock, failure escalation centralized, Tauri scaffolding removed, and the legacy duplicates deleted (net −640 lines) once 40G unblocked Step 4. `c0165c5` applied the same treatment to the router's shadowed pair (−111 lines), which had silently killed the sidebar accordion's reset-on-navigate; 45 further shadowed pairs are catalogued there as a follow-up task | `MILESTONE-40F-PROPOSAL.md` |
| 40G | Fix the dashboard feature-bridge boot crash (`window.createFeatureBridge is not a function` on every load) | **Landed 2026-09-13** (`c05e4ad`) via option (a): `initApp()` now runs from `main.js` after module evaluation. This also unblocks 40F Steps 4 and 6 | `MILESTONE-40G-PROPOSAL.md` |

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
40G surfaced on 2026-09-13 from a browser verification session that was
only meant to confirm two UI claims for 40C, and instead found two
uncaught exceptions firing on every production page load — one of them
40F's own defect, crashing live.

## Implementation Order and Shared Files

**Correction (review pass 2026-09-12):** this section previously stated
"None of the six depends on any other; there is no required
implementation order between them." That is wrong — a task-by-task review
found four places where two deliveries edit the same file, and in two of
them the order changes how much work the second one is. No delivery
*blocks* another, so any of them can still be approved and implemented
alone; but whoever implements second needs to expect these.

A fifth entry was listed here in error and has been removed:
`tests/unit/plan-readiness-county.spec.js` is edited by **40A only** (to
drop its `vi.mock` of the deleted DOCX engine). It passes `county`
explicitly into every case and already asserts that a blank county is
treated as non-local, so 40C's county work does not touch it.

| Shared file | Deliveries | Interaction | Recommended order |
| --- | --- | --- | --- |
| `src/core/docx/docx-engine.js` | 40A, **40C-1** | 40C Task 40C-A item 6 removes the Pinellas caption fallback at `docx-engine.js:350`, and item 7 updates its `circuit-lookup` import at `:9`; 40A **deletes the whole file**. | **40A first** — then 40C-1's docx half is moot, and 40C-1 should confirm which order actually landed rather than assume (it already says so). |
| `buildCaseFileBlob()`'s `appStateBlob` — `src/core/persistence/case-file.js:188-197` | 40D, 40F | 40D stops serializing `theme` (`:189`); 40F changes the `lastExportAt` read (`:195`). Two lines apart in one object literal. Separately, 40F deletes `legacy-app.js`'s dead duplicate `buildCaseFileBlob()` (`:3066`), which carries its own `theme` line. | **40F first** — it removes one of 40D's seven theme sites for free. Otherwise 40D must edit both copies to avoid leaving one migrated and one not. |
| `src/core/pdf/pdf-engine.js` | **40C-1**, ~~40E~~ | 40C-1 edits the county caption fallback (`:166`); 40E added an array branch to `measureCell()` (`:1143`). Different functions, ~1000 lines apart. | **Resolved — 40E landed 2026-09-12.** 40C-1 now has this file to itself. Its `measureCell()` change sits well below the caption fallback, so the line numbers around `:166` are unmoved. |
| `tests/unit/content-corrections.spec.js` | **40C-1, 40C-2** | The two halves of the former Task 40C-G: the D4 label (40C-2) and the eligibility-modal copy (40C-1). | Either; whichever lands second extends the spec rather than rewriting it. |

Only two orderings actually save work: **40A before 40C-1** and **40F
before 40D**. Both are satisfiable together, and the sequence below does
so while still starting with the smallest, most isolated deliveries:

**40F → 40G → 40E → 40C-2 → 40D → 40A → 40C-1.**

**Revised 2026-09-13:** 40F moves to the front. It is no longer a
cosmetic-indicator cleanup — its defect crashes on every production page
load and takes the unsaved-changes warning down with it, so it outranks
everything else here on severity regardless of size. 40G follows because
it is the second half of the same boot-time failure and is cheapest to
verify while the startup path is already under the microscope. If 40G
takes option (a) (moving `initApp()` module-side), 40F must land first
anyway — its deletions shrink what a startup-ordering change has to be
regression-tested against.

That supersedes the earlier `40E → 40D → 40A → 40C → 40F` suggestion,
which violated both work-saving orderings (it put 40D before 40F and 40C
before 40A) and predates the 40C split. 40C-2 sits early because it is
self-contained, touches no persisted data, and shares only one test file
with anything else; 40C-1 sits last because it is the largest delivery and
benefits from 40A having already removed the DOCX engine it would
otherwise have to edit.

If the deliveries are implemented one at a time across separate sessions —
the likelier case — the shared-file table above is what matters and this
global sequence does not.

## Approval

Each proposal is self-contained: its own Status, Goal, Background,
concrete implementation steps, Acceptance Criteria, and Verification
plan. Before implementing any one, obtain explicit approval naming that
delivery, re-check its assumptions against current `master` (several
reference exact file/line locations that may have moved), select tests
through `TEST-INDEX.md`, and follow `AGENTS.md`'s commit and regression
policy. 40B is withdrawn and will not be scoped further.
