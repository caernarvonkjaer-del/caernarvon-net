# Milestone 40I: Fix Multi-Column Label Alignment (Resurrects Milestone 34-1E Item 19)

## Status

**Landed 2026-09-13** (`0ea392b`). The reported bug is confirmed fixed:
Schedule B-4's Category now aligns with its primitive-built row-mates
(2px apart, down from 33.6px), spot-checked at two more of the 13
confirmed sites across two more filing types. Full e2e regression clean
beyond the pre-existing, already-catalogued baseline.

Three corrections, all caught by actually running the fix rather than
shipping the proposal's assumptions as written:

1. **The pre-existing regression test's own assertion was wrong.**
   `schedule-card-layout.spec.ts:177` (added for archived item 19)
   expected `getComputedStyle().minHeight` to read `'0px'` once the rule
   was deleted. A genuinely absent `min-height` computes to the CSS
   spec's initial value, `'auto'` — not `'0px'`. Corrected to match
   measured reality.
2. **Decision 2's planned test subject doesn't wrap to two lines where
   assumed.** Plan Initial Q11's "Relationship of Agent(s)/Surrogate(s)
   to the Ward" renders as one line at the 800px viewport this spec file
   uses elsewhere — confirmed by measuring it directly. Replaced with a
   direct pin on the actual reported bug site (Schedule B-4) instead.
3. **A genuine, narrower residual was found and deliberately not
   solved here.** Deleting the rule correctly fixes every confirmed
   primitive-vs-hand-rolled mismatch, but also removes an
   incidental side effect the same rule was providing: a row where
   *both* fields are hand-rolled (so neither was ever mismatched by the
   reported bug) can still misalign by up to ~17px, confirmed by
   measurement, in a roughly 500–620px viewport band, if one field's
   label happens to be long enough to wrap to two lines while its
   sibling's doesn't (e.g. Plan Initial Q11's Relationship/"Name of
   person who signed" pair — confirmed overlapping post-fix:
   `nameInputTop 1048 < relLabelBottom 1059`). Both fields already used
   identical markup, so this isn't the bug this delivery was scoped to
   fix; recorded as follow-up scope rather than expanded into, the same
   way Decision 3 already deferred markup migration. Extending the
   selector to also cover primitive-wrapped labels was reconsidered
   given this finding and rejected again, for the reason already on
   record: it would reintroduce forced padding on today's correct
   single-line primitive fields, which the corrected pre-existing test
   (point 1 above) now explicitly pins against.

## Goal

Fix a card-row layout defect where a field's label/input sits visibly lower
than its row-mates in the same multi-column schedule row — reported live
against Annual Accounting's Schedule B-4 "Category" field, but confirmed to
be app-wide and to already have its own failing regression test
(`tests/e2e/schedule-card-layout.spec.ts:177`) and its own prior diagnosis
(`MILESTONE-34-1E`, item 19, archived in `MILESTONE-ARCHIVE.md`). This
resurrects that item rather than re-diagnosing from scratch, but corrects
its analysis against the *current* CSS, which has changed since it was
written.

## Background

### What item 19 (2026, archived) found, and what's changed since

Item 19 named three causes of row misalignment: required-marker (`*`)
wrapping to its own line, inconsistent label spacing between single- and
multi-column rows, and `numInput()`'s `$`/`%` affix rendering taller than
`.form-control`. **Two of those three are already fixed**, confirmed by
direct code read and by actually running the test:

- **Asterisk-wrap: already fixed.** `forms.css:18` now has
  `.req{...white-space:nowrap;}`, and `.form-label` (`forms.css:14`) is
  `display:inline-flex;align-items:center;flex-wrap:wrap;gap:.25rem;`.
  Running `schedule-card-layout.spec.ts:177` today, its marker-position
  assertion (line 200, `markerTop <= lastTextBottom + 1`) **passes**.
- **`.input-group-text` height mismatch: already fixed.** `forms.css:23`
  now reads `.input-group-text{font-size:.88rem;...}`, matching
  `.form-control`'s override exactly — item 19's cited mismatch (Bootstrap
  default `1rem` vs. `.88rem`) no longer exists.
- **Blanket/inconsistent `min-height`: still broken, and the current rule
  is not vestigial — it is a deliberate third-generation fix, confirmed by
  `git log`.** Item 19 cited `forms.css:178-180`, a `:has()`-based selector
  (`.row.g-2:has(> [class*="col-"] ~ [class*="col-"]) > [class*="col-"]
  .form-label`) applying to any 2+-column row. That rule no longer exists —
  it was itself replacing a still-earlier `margin-top:auto`-pushing
  mechanism. Both were removed by commit `14e61d7`
  ("fix: resolve row field misalignment by eliminating margin-top auto
  pushing and standardizing label zoning", 2026-09-11), which installed the
  current rule as its intentional replacement, with its own explanatory
  comment still in place at `forms.css:219-220`: "For multi-column rows in
  cards/schedules, ensure 1-line and 2-line labels align vertically at the
  bottom of the label zone so adjacent input fields start at the exact same
  vertical baseline." This delivery is not deleting incidental drift — it is
  proposing a **fourth** change to the same CSS territory (margin-top:auto →
  the `:has()` rule item 19 diagnosed → `14e61d7`'s current rule → this
  proposal), and neither of the first two rewrites left behind a regression
  test pinning the behavior it was solving for. That history is exactly why
  Decision 2 below requires a real assertion this time, not another
  unpinned visual judgment call.

  The current rule, `forms.css:219-231` (comment plus declaration):

  ```css
  /* For multi-column rows in cards/schedules, ensure 1-line and 2-line labels align vertically
     at the bottom of the label zone so adjacent input fields start at the exact same vertical baseline. */
  .schedule-entry-grid .row > [class*="col-"] > .form-label,
  .entry-card-body .row > [class*="col-"] > .form-label,
  .card-grid-2col .row > [class*="col-"] > .form-label,
  .schedule-entry-grid .row > [class*="col-"] > legend,
  .entry-card-body .row > [class*="col-"] > legend,
  .card-grid-2col .row > [class*="col-"] > legend {
    min-height: 2.1rem;
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  ```

  This is a **direct-child** selector (`>`). Every field built through the
  shared Tier 1 primitives — `renderFormField()`/`inpD()`-style helpers
  (`core/form/form-fields.js:171`, `return `<div class="${wrapperClass}">
  ...`, default `wrapperClass:'mb-2'`) and `renderSelectField()`
  (`:199`, same `.mb-2` wrapper) — puts its `<label>` **inside** that
  wrapper div, one level too deep to match. A hand-rolled field with no
  wrapper (`<label class="form-label">` as a direct child of the column
  `div`) *does* match, and gets pushed down by `align-items:flex-end`
  filling a `min-height:2.1rem` box it doesn't need. That's the exact
  mechanism behind the screenshot: Category (`annual-accounting/index.js:880`)
  is hand-rolled, its `inpD()`-built row-mates are not.

  **The three `> legend` selector lines (`:224-226`) are already dead
  code, independent of this proposal.** A repo-wide `grep '<legend'`
  finds exactly two `<legend>` elements anywhere in `src/`
  (`legacy-app.js:6337`, `signature-state-control.js:57`), and both sit
  inside a `<fieldset class="...mb-2">` — never a direct child of
  `[class*="col-"]`. So half this rule already matches nothing today;
  removing it has zero behavioral effect and is recorded here only so a
  reader doesn't assume it was live.

### Confirmed by running the test, not by reasoning about it

```
tests\e2e\schedule-card-layout.spec.ts:177:1 › multi-column labels retain their required marker and natural height
Expected: "0px"
Received: "33.6px"
```

Only the `minHeight` assertion (line 201) fails — `33.6px` is `2.1rem` at
the default root size, i.e. the rule firing on a label that needs exactly
one line. The test's own expectation is unambiguous: a label not spanning
two lines should carry **no** forced minimum height at all, not a
relocated or renamed one.

### Blast radius — confirmed hand-rolled-in-a-mixed-row sites

Audited directly (not from the archive, which predates several of these).
A site is "mixed" — the actual failure condition — when a raw,
wrapper-less label shares a `.row` with at least one field built through a
primitive (`.mb-2`-wrapped, or a `<fieldset class="...mb-2">` like
`yesNoRadioHTML()`/`renderSignatureStateControl()`), so one sibling gets
pushed down and the other doesn't. **13 confirmed sites across five
files** (Annual Accounting, Simplified Accounting, Plan Initial, Plan
Minor, Plan Annual):

- `annual-accounting/index.js`: Schedule B-4 Category (`:880`), Schedule C
  "Loss / Reduction" (`:915`), Schedule D-1 "Ward's Amount" (`:952`),
  Schedule D-2 "Total Value" (`:989`), Schedule D-3 "Ward's Amount"
  (`:1024`), Schedule D-4 "Total Value" (`:1060`), Schedule D-5 "Type
  (M/N/L/O)" (`:1094`) and "Ward's Balance Due" (`:1097`, same row),
  Schedule E "Transfer Out Amt" (`:1129`).
- `simplified-accounting/index.js`: Certificate of Service "Attorney Name
  (linked)" (`:566`, shares a row with `inpSWithTooltip()`-built
  "Signature Date" at `:567`).
- `plan-initial/index.js`: Question 11 advance-directives row (`:413-422`)
  — raw text-field labels share a row with `yesNoCheckboxS()`'s
  `<fieldset class="plan-yes-no mb-2">` at `:420`.
- `plan-minor/index.js`: the equivalent Question 10 advance-directives row
  (`:499-509`), same shape, `yesNoCheckboxS()` at `:506`.
- `plan-annual/index.js:218` (`q1Residences` "Facility name") — the site
  the existing test already targets.

**Not confirmed broken, deliberately excluded:** rows where every field in
the row is hand-rolled with no primitive-built sibling (e.g. Simplified
Accounting's remuneration row, `:597-598` — both "Guardian Name" and
"Type" are raw, so both get pushed down *together* and stay aligned with
each other), and `col-12` fields that are alone on their own line (no
adjacent sibling to misalign against). These don't exhibit the bug — they
just don't use the shared primitive, which is a separate, lower-priority
`AGENTS.md` Section 9 convention gap, not a visual defect, and is not in
scope here.

Several Plan-family collection rows (`q9Providers`, `planGuardians` across
all four Plan types, `q2Residences`, `q3Providers`, `q4Providers`) were
grepped but not individually confirmed mixed-or-uniform with full
confidence — some contain omitted/truncated matches in the audit pass.
Re-check these against the fix during implementation rather than assuming
the list above is exhaustive.

## Decisions / Implementation

1. **Remove the `min-height`/`align-items:flex-end`/`flex-wrap` treatment
   at `forms.css:219-231`, comment and declaration together** (leaving the
   comment behind would describe a rule that no longer exists) — rather
   than extending its selector to also
   match `.mb-2`-wrapped labels. Extending the selector was considered and
   rejected: it would apply the same forced `min-height:2.1rem` to every
   *currently correct* primitive-built field across the entire app (every
   `inpD()`/`selD()`/equivalent call in all nine filing types), adding
   unwanted empty space above single-line labels that render correctly
   today via ordinary top-aligned block flow. Deleting the rule instead
   makes hand-rolled and primitive-built labels behave identically (plain
   block flow, top-aligned), which is exactly what the existing test
   expects (`minHeight: '0px'`) and what the requester's own corrected
   mockup showed (the short field pulled up to match its neighbors, not
   its neighbors pushed down).
2. **Pin the one real tradeoff with an assertion, not a one-time visual
   check.** The deleted rule existed to bottom-align labels when one in a
   row genuinely wraps to two lines, so that row's inputs don't start at
   visibly different heights. Given neither of this rule's two prior
   rewrites (see above) left behind a test for the behavior it was solving,
   a third unpinned change would repeat the same mistake. Use
   `plan-initial/index.js`'s Question 11 directives row (`:413-422`,
   already in the confirmed-broken list) as the concrete subject: its
   "Relationship of Agent(s)/Surrogate(s) to the Ward" label (`col-md-6`)
   is long enough to genuinely wrap to two lines at the viewport width
   `schedule-card-layout.spec.ts` already uses elsewhere. Add a new
   assertion (extending that spec, not a separate file) that: (a) confirms
   the label actually renders as two lines at the test's viewport width —
   don't assert against a case that silently fits on one line; (b) after
   the fix, asserts no overlap between that column's label/input and the
   adjacent column's label/input — e.g. the shorter column's input top is
   not above the taller column's label bottom. This gives the tradeoff a
   red/green signal a future rewrite can't silently break, instead of
   relying on someone's eyes at implementation time.
3. **Do not touch the hand-rolled fields' markup as part of this
   delivery.** Once the CSS no longer discriminates between wrapped and
   unwrapped labels, every confirmed site in the blast-radius list above
   is fixed by the one CSS change alone. Migrating those hand-rolled
   fields onto `inpD()`/`selD()` (per `AGENTS.md` Section 9) is a
   legitimate follow-up but a different, lower-stakes piece of work — do
   not bundle it here.

## Data, Portability, Security, and Legal Scope

Pure CSS change to one rule in `forms.css`. No persisted data, export
format, or validation logic is touched. No `probate-guardian-data-model.csv`
change; no `verify:data-model` run required.

## File/Delivery Overlap Check

Touches only `src/styles/forms.css`. No other open or landed Milestone 40
delivery edits this file.

## Implementation Order and Dependencies

**No dependency on `MILESTONE-40H-PROPOSAL.md` or any other Milestone 40
delivery**, in either direction. 40A, 40B (withdrawn), 40C-1, 40C-2, 40D,
40E, 40F, and 40G have all landed and none touched `forms.css`
(`git log` confirms the last commit to touch it predates all of Milestone
40); 40H's ten tasks touch `legacy-app.js` and nine other files, none of
them `forms.css`. This delivery can be approved and implemented on its
own, in any order relative to 40H.

**Relationship to `MILESTONE-41-PROPOSAL.md`** (Draft, unscheduled — a
future architectural migration of hand-rolled field markup onto centralized
Tier 1/2/3 components): not a dependency, but worth recording since the
two touch the same underlying mechanism from opposite ends. This delivery's
root cause *is* the gap between hand-rolled markup and primitive-built
markup (Decision 1's Background section above); Milestone 41, if it ever
lands, would close that gap for good by migrating every hand-rolled site
onto `renderFormField()`/`inpD()`-style primitives, which would make the
underlying mismatch this delivery fixes structurally impossible to
reintroduce. That is not a reason to wait: 41 is a large, unscheduled,
multi-filing-type refactor, while this is a single CSS rule deletion with
an immediate, confirmed production defect (the live screenshot that
started this proposal). Landing this delivery now fixes the defect today;
if 41 lands later, deleting this rule causes it no friction — a page built
entirely from Tier 1 primitives never matched the deleted selector's
`> .form-label`/`> legend` direct-child pattern in the first place (see
the dead-`> legend`-selector finding in Decision 1's Background), so
Milestone 41 arriving after this delivery finds nothing left to conflict
with.

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| `tests/e2e/schedule-card-layout.spec.ts:177` | Passes — `minHeight` reads `0px` for a single-line label in a multi-column row |
| Annual Accounting Schedule B-4, Category field | Aligns with Check #/Date Paid/Payee/Amount in the same row, matching the requester's corrected mockup |
| Every other confirmed site in the blast-radius list | Same — raw field aligns with its primitive-built row-mates |
| Plan Initial Question 11's "Relationship of Agent(s)/Surrogate(s) to the Ward" row, at the viewport width where it wraps to two lines | New assertion (Decision 2) passes: the label genuinely renders as two lines, and no adjacent column's label/input overlaps another's |
| Any row where every field is uniformly hand-rolled (e.g. Simplified Accounting's remuneration row) | Unchanged — was never broken, must not regress |

## Verification Plan

Add the two-line-label assertion described in Decision 2 to
`tests/e2e/schedule-card-layout.spec.ts` **before** removing the CSS rule,
and confirm it fails against current `master` for the right reason (no
overlap protection exists yet) — this repository's own convention for
proving a regression test actually tests something. Then remove the rule
and run `npx playwright test tests/e2e/schedule-card-layout.spec.ts` in
full (not just the one test) to confirm both the pre-existing failing
assertion (line 201) and the new one pass, with no other assertion in the
file regressing. Visually spot-check at least three of the confirmed
blast-radius sites across at least two different filing types (Annual
Accounting and one Plan type). This is a single-file CSS fix with a
pre-existing failing test plus one new assertion as its acceptance gate —
targeted `npm run test:e2e` on the one spec file (plus the visual
spot-check) is the appropriate gate; a full regression is not warranted on
its own, per `AGENTS.md`'s Test Execution Gate. Update `TEST-INDEX.md`
only if `schedule-card-layout.spec.ts`'s description changes materially.
