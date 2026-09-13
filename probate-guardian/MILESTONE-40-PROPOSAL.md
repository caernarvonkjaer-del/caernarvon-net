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
| 40A | Deprecate and remove DOCX export, including its test surface | **Landed 2026-09-13**: engine deleted, all seven feature entry points across three dispatch conventions removed, plus a capability layer the proposal had not enumerated (`filing-descriptor` `capabilities.docx` on all nine descriptors, the `FilingCapabilities` typedef, and `'docx'` in `issue-registry`'s channel list). Two proposal corrections: `docx-extract.ts` is deleted rather than kept (both its importers used it only for their own DOCX assertion blocks), and Milestone 40E's DOCX fix is deleted along with the engine | `MILESTONE-40A-PROPOSAL.md` |
| 40B | 4-digit PIN per party for signature stamps | **Withdrawn** — requester chose not to build it (deterrent-only value judged not worth it) | `MILESTONE-40B-PROPOSAL.md` |
| 40C-1 | County establishment, hydration, and carryover (Tasks 40C-A, 40C-F, 40C-G2) — the only delivery touching persisted data | **Landed 2026-09-13**: all 8 items of 40C-A plus 40C-F and 40C-G2, using the unknown-circuit option (a) resolved 2026-09-12. Every Pinellas default removed (the 17 enumerated sites plus 7 factories, 2 Excel importers, 7 pdf-models, `pdf-engine.js` and all 3 layered `circuit-lookup.js` fallbacks); new `core/navigation/ward-county.js` holds the lifecycle; `verify:data-model` clean at 897 rows with `caseFile.parties[]` expanded. Three proposal corrections: the carryover attorney defect is in **three** functions not one, the Cover hook needed **all three** form write paths (hooking one covered only six of nine filing types), and seven of the eight legacy Pinellas sites were shadowed dead code | `MILESTONE-40C-PROPOSAL.md` |
| 40C-2 | Form-entry, readiness, and validation corrections (Tasks 40C-B, 40C-C, 40C-D, 40C-E, 40C-G1, 40C-H) — no persisted-data change | **Landed 2026-09-12**: all six tasks. 40C-C was a live data-corruption bug — date fields are `type="text"` holding MM/DD/YYYY, so the From/To pairing compared month-before-year and silently overwrote an endpoint on any period not starting January 1; the pairing is deleted and `checkDateOrder()` is the single reporter, now covering Guardian's D-4 bond period too. 40C-D reduced to test-only (premise does not reproduce). 40C-E closed two sidebar-vs-export disagreements; 40C-H one predicate plus a missing readiness condition | `MILESTONE-40C-PROPOSAL.md` |
| 40D | Move theme/UI-only preferences from `.sav` app state to `localStorage` | **Landed 2026-09-13**: new `core/theme-preference.js` owns the key/enum/seed; `prepaint.js` reads `localStorage` before `matchMedia`; the post-`.sav`-load re-apply that *was* the flash is gone; `case-file.js` no longer serializes `theme`. One fix beyond the checklist — `applyTheme()` set only `data-theme` while `prepaint.js` set both, so toggling left Bootstrap's `data-bs-theme` on the load-time palette. Decision 6's inventory found three further per-device candidates (`walkthroughCompleted`, `firstLaunchSeen`, `continuePromptShown`) and deliberately did **not** migrate them: each changes onboarding behaviour and needs its own decision | `MILESTONE-40D-PROPOSAL.md` |
| 40E | Fix PDF table cells overflowing instead of wrapping multi-line addresses | **Landed 2026-09-12**: `measureCell()` array branch plus both certificate-of-service call sites. Two additions the proposal had not anticipated — `docx-engine.js` reads the same model and would have rendered the array bare-comma-joined, and Simplified Accounting dropped `line4` in its recipient *filter* as well as its join | `MILESTONE-40E-PROPOSAL.md` |
| 40F | Unify the duplicate save/autosave/export pipeline (`legacy-app.js` vs. `case-file.js`), fix its false "Last backup" indicator bugs, and remove the inert Tauri desktop scaffolding (filesystem ward-backup, OS-keychain "remember password") | **Landed in full 2026-09-13** (`9ac92dd`, `4ad99c1`, `619cfd8`, `c0165c5`): boot `ReferenceError` fixed, one save clock, failure escalation centralized, Tauri scaffolding removed, and the legacy duplicates deleted (net −640 lines) once 40G unblocked Step 4. `c0165c5` applied the same treatment to the router's shadowed pair (−111 lines), which had silently killed the sidebar accordion's reset-on-navigate; 45 further shadowed pairs are catalogued there as a follow-up task | `MILESTONE-40F-PROPOSAL.md` |
| 40G | Fix the dashboard feature-bridge boot crash (`window.createFeatureBridge is not a function` on every load) | **Landed 2026-09-13** (`c05e4ad`) via option (a): `initApp()` now runs from `main.js` after module evaluation. This also unblocks 40F Steps 4 and 6 | `MILESTONE-40G-PROPOSAL.md` |
| 40H | Ten independent post-deploy fixes: dashboard guardian-validation crash guard, Safe Deposit Box conditional data loss, D-3 `fieldset`/`legend` accessibility gap, a malformed `<summary>` on the four Plan types' Print Preview readiness panel, a preparer-authorization note above every signature-page perjury statement, the same dangling-global crash pattern in all four Plan types' readiness routine, two free-text sanitization bugs (title-casing "of"/"and"/"the", apostrophe stripping), three schedule totals (Annual Accounting's E/F-1/F-2) that go stale after first render, a "New Filing from Existing" ward-selector default plus same-family carryover gap (starting balance, cert recipients, and a corrected confirmation message), and a second, symmetric carryover gap dropping the attorney's bar number/phone/address on Plan/Accounting → Guardian Inventory conversions | Draft, ready for approval. First five re-verified/added as previously recorded. Tasks 40H-F through 40H-I added from a same-day test-data-generation pass (`Probate_Guardian_TestData_Findings.md`), each independently re-verified against current `master` rather than taken on the report's word — one finding (F-1's exact trigger) could not be reproduced via normal navigation and is recorded as such; two findings (F-2, F-3) turned out to be the same gap, not two, and the "carry starting balance + cert recipients" fix was a requester-confirmed decision, not a unilateral call. Task 40H-J was then promoted from this same proposal's own open-items register (previously an unscoped "item 5"), per a second round of requester-confirmed decisions that also resolved one other open item in place (per-device onboarding flags — keep case-coupled, no code change) rather than leaving it an open question. Also documents (not scoped) a larger recommendation to unify the two non-unified readiness-panel architectures, and carries the **open-items register** for all of Milestone 40: 6 items remaining (two resolved above) after implementing the other deliveries, including 9 pre-existing full-suite e2e failures and 45 catalogued shadowed function pairs | `MILESTONE-40H-PROPOSAL.md` |
| 40I | Fix multi-column card-row label misalignment (a hand-rolled field's label sits lower than its primitive-built row-mates) — a single `forms.css` rule deletion, pinned by a new regression assertion | Draft, ready for approval. Resurrects `MILESTONE-34-1E`'s archived item 19: two of its three original causes (asterisk-wrap, `$`/`%` affix height) are already fixed on current `master`; only the `min-height`/direct-child mismatch remains, confirmed live by actually running `tests/e2e/schedule-card-layout.spec.ts:177` (fails with `33.6px`, expects `0px`). The current rule is itself the third of three CSS rewrites of this territory (`git log`-confirmed via commit `14e61d7`), neither of the first two pinned by a test — this delivery adds one. Confirmed blast radius: 13 sites across Annual Accounting, Simplified Accounting, Plan Initial, Plan Minor, and Plan Annual | `MILESTONE-40I-PROPOSAL.md` |

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
40F's own defect, crashing live. 40H surfaced from a separate, broader
exploratory QA pass run the same night — most of its findings turned out
to already be fixed (the two boot errors, re-confirmed against
`deployment.json` to have fired on the prior deployed commit) or out of
scope for a mechanical fix (recorded as open decisions instead), leaving
three confirmed defects worth bundling on their own. A same-day test-data
generation pass — completing one filing of every type end to end with
realistic data — then surfaced four more independent findings (Tasks 40H-F
through 40H-I), each re-verified against the code rather than taken on the
report's word before being folded into 40H rather than opened as a
separate delivery, since they share 40H's exact character: small,
independent, non-persisted-data fixes. 40I surfaced from a
live screenshot flagged directly during this session — a card field's
label rendering lower than its row-mates — which traced back through the
current `forms.css` to a mechanism distinct from, but in the same
territory as, an already-archived and partially-addressed item
(`MILESTONE-34-1E` item 19). Kept as its own delivery rather than folded
into 40H because its fix and blast radius are unrelated to any of 40H's
four tasks.

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
| ~~`src/core/docx/docx-engine.js`~~ | 40A, **40C-1**, and — unlisted at the time — 40E | 40C Task 40C-A item 6 removed the Pinellas caption fallback at `docx-engine.js:350`, and item 7 its `circuit-lookup` import at `:9`; 40A **deleted the whole file**. | **Resolved — 40A landed 2026-09-13 and deleted the file**, so 40C-1's docx half is moot. **This row was incomplete and cost work:** it named only 40A and 40C-1, so 40E — which had to fix this engine's table-cell rendering because it consumes the same `block.rows` model as the PDF engine — had no signal the file was slated for deletion, and that fix landed one commit before being deleted. Any future row here should list *every* delivery that touches the file, not only those whose own proposal text mentions it. |
| `buildCaseFileBlob()`'s `appStateBlob` — `src/core/persistence/case-file.js:188-197` | 40D, 40F | 40D stops serializing `theme` (`:189`); 40F changes the `lastExportAt` read (`:195`). Two lines apart in one object literal. Separately, 40F deletes `legacy-app.js`'s dead duplicate `buildCaseFileBlob()` (`:3066`), which carries its own `theme` line. | **40F first** — it removes one of 40D's seven theme sites for free. Otherwise 40D must edit both copies to avoid leaving one migrated and one not. |
| `src/core/pdf/pdf-engine.js` | **40C-1**, ~~40E~~ | 40C-1 edits the county caption fallback (`:166`); 40E added an array branch to `measureCell()` (`:1143`). Different functions, ~1000 lines apart. | **Resolved — 40E landed 2026-09-12.** 40C-1 now has this file to itself. Its `measureCell()` change sits well below the caption fallback, so the line numbers around `:166` are unmoved. |
| `tests/unit/content-corrections.spec.js` | **40C-1**, ~~40C-2~~ | The two halves of the former Task 40C-G: the D4 label (40C-2) and the eligibility-modal copy (40C-1). | **Resolved — 40C-2 landed 2026-09-12 without touching this file.** 40C-G1 was a sidebar nav label with no assertion here, so 40C-1 has the spec to itself. |

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
