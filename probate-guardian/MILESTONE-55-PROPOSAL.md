# Milestone 55: PDF Annotation Preview Integrity — Scoping & Execution Proposal

## Status

**Draft — not an authorization to implement.** Per `AGENTS.md` §2, this
document is a proposal only. Nothing below should be started until Alan
explicitly approves the named sub-delivery. Approval of 55A would authorize
only 55A; any later sub-delivery added to this milestone would require its own
explicit approval.

**Numbering note.** Milestone 55 was confirmed unused on 2026-09-16 by
searching `src/`, `tests/`, project Markdown, and `git log` for Milestone 55,
`MILESTONE-55`, and `55A` references.

---

## Ordered Issue Register

| Order | Sub-delivery | Issue | Status | Risk |
| --- | --- | --- | --- | --- |
| **1** | **55A** | FreeText note color picker and delete control render as artifacts over the visible PDF | Proposed | Low–medium |
| **2** | **55B** | Sidebar/nav-check section markers show green while the real export validator still blocks on a date-order rule they never apply | Proposed | Medium |
| **3** | **55C** | Signature Stamp capture widget's "Type" tab — global removal | Proposed | Low |
| **4** | **55D** | Attorney "Primary Email (e-filing)" renders a required asterisk that no validator enforces, in four filing types | Proposed | Low–medium |

Each sub-delivery is independently approvable, in the order listed. Approving
one does not authorize any other, including ones listed after it here.

---

## 55A — Contain and Style the PDF.js FreeText Editor Toolbar

### User-observed defect

In Preview and Export, selecting or committing an **Add Note** annotation can
leave two controls visibly scattered across the filing:

1. a native color input rendered as a red rectangular swatch over the filing;
2. a short blank mark farther down the page, observed beside Schedule B.

These marks are application UI artifacts. They are not generated Guardian
Inventory content and should never visually overlap the court filing.

### Confirmed diagnosis

The two artifacts come from one PDF.js per-editor toolbar:

- `lib/pdfjs/pdf.mjs` creates `<div class="editToolbar hidden">` when a
  FreeText editor is selected.
- The toolbar contains `<input type="color" class="basicColorPicker">`, a
  block `<div class="divider">`, and an icon-only
  `<button class="basic deleteButton">`.
- `src/styles/print.css` contains a deliberately scoped-down copy of the
  upstream annotation-editor styles. Its own comment states that the floating
  per-editor delete toolbar was excluded.
- The current PDF.js FreeText path nevertheless creates that toolbar.
- The application has no scoped equivalent of the upstream
  `.editToolbar.hidden { display: none; }`, positioning, flex-row, divider,
  color-picker, delete-button, or icon rules.

Consequently, the browser renders the color input using its native appearance.
The block divider breaks the toolbar's normal flow, while the empty delete
button has no CSS-provided trash icon. Those controls inherit the annotation
layer's large scaled font context, explaining why they appear widely separated
but aligned at the same horizontal origin.

The save path is separate: `AnnotationSession.saveAnnotatedBytes()` calls
`pdfDocument.saveDocument()`, which serializes PDF annotation storage rather
than taking a screenshot of the DOM overlay. The controls therefore affect the
live preview, not the saved PDF's page content. 55A must preserve that boundary.

### Scope

55A will:

1. restore the minimal PDF.js toolbar layout and visibility contract required
   by the two supported editor types, FreeText and Highlight;
2. keep all new styling scoped beneath `.annotationEditorLayer`;
3. give the generated FreeText color and delete controls accessible names;
4. use the application's semantic tokens and existing SVG icon system;
5. add a browser regression that detects both the red-swatch artifact and the
   blank Schedule-B-style artifact mechanically.

55A will not:

- import the entire upstream `pdf_viewer.css`;
- edit the vendored `lib/pdfjs/pdf.mjs` implementation;
- add Ink, Stamp, Signature, comment, or alt-text editor support;
- change filing data, validation, PDF form content, or annotation persistence;
- redesign the top-level Annotate PDF toolbar;
- change the appearance of the court document itself.

### Files in scope

| File | Planned change |
| --- | --- |
| `src/styles/print.css` | Add the minimal, layer-scoped editor-toolbar layout, hidden-state, theme, focus, color-picker, divider, and button rules. Update the existing scoped-port comment so it no longer claims the active toolbar is intentionally absent. |
| `src/core/pdf/pdf-annotate.js` | Decorate dynamically created toolbar controls with stable accessible names and the existing `trash` SVG; own and disconnect any observer used to detect those controls. |
| `tests/e2e/pdf-annotate.spec.ts` | Add the toolbar visibility, containment, layout, accessibility, color-change, and no-artifact regression. |
| `TEST-INDEX.md` | Extend the existing `pdf-annotate.spec.ts` description to record 55A's toolbar regression scope. |

No new test file is expected. If implementation evidence shows that a separate
spec is clearer, creating one also requires a same-commit `TEST-INDEX.md` row.

### Implementation design

#### A. Restore the minimum toolbar CSS contract

Add only the active subset of the upstream toolbar behavior to
`src/styles/print.css`, expressed in repository styles rather than copying the
whole viewer theme:

- define `--editor-toolbar-vert-offset`;
- position `.annotationEditorLayer .editToolbar` absolutely adjacent to its
  owning editor;
- make the toolbar a compact, fit-content container with an explicit normal UI
  font size so it cannot inherit the annotation layer's scaled `100px` base;
- add `.annotationEditorLayer .editToolbar.hidden { display: none; }`;
- render `.editToolbar .buttons` as a single horizontal flex row;
- size `.basicColorPicker` and `.deleteButton` explicitly;
- render `.divider` as a vertical separator rather than a block-flow break;
- provide visible hover and `:focus-visible` states;
- support `forced-colors: active`;
- use `--surface-*`, `--ink-*`, and `--line` tokens for application chrome.

Selectors must remain under `.annotationEditorLayer`; generic selectors such as
`.hidden`, `.buttons`, `.divider`, `input[type="color"]`, or `.deleteButton`
must not be added globally.

#### B. Preserve the icon system and accessible names

The core-only PDF.js integration uses `nullL10n`; it does not run the full
viewer localization layer that normally turns `data-l10n-id` into an
accessible control label. Styling the controls alone would therefore leave an
accessibility defect.

`AnnotationSession` should decorate each newly created toolbar once:

- `.basicColorPicker`: `aria-label="Note color"` and `title="Note color"`;
- `.deleteButton`: `aria-label="Delete note"`, `title="Delete note"`, and the
  existing `ic('trash', 14)` decorative SVG.

Because PDF.js creates the toolbar asynchronously after editor selection, the
session may use one layer-scoped `MutationObserver` per page. The observer must:

- inspect only added nodes beneath that page's annotation layer;
- be stored with the layer lifecycle record;
- avoid rewriting already-decorated controls;
- be disconnected in `AnnotationSession.destroy()`.

If implementation finds a direct, supported PDF.js lifecycle hook that exposes
the toolbar after creation, prefer that hook over observation. Do not patch the
vendored PDF.js bundle to obtain one.

#### C. Do not conflate UI chrome with PDF content

The toolbar remains an HTML overlay. It must not be copied into annotation
storage, rasterized into a page, or added to filing state. Color changes should
continue through PDF.js's existing `updateParams()` path; deletion should
continue through PDF.js's existing UI manager.

### Required regression test

Extend `tests/e2e/pdf-annotate.spec.ts` with one focused 55A test using an
actual preview and FreeText editor:

1. Enable annotation mode, enable Add Note, place a note, and type text.
2. Commit the note by turning Add Note off rather than placing an accidental
   second note.
3. Select the committed note and assert one `.editToolbar` is visible.
4. Assert its `.buttons` container has a horizontal flex layout.
5. Assert the color picker and delete button have approximately the same
   vertical center and remain inside the toolbar bounds.
6. Assert the toolbar is inside the PDF page and adjacent to its owning note,
   not displaced over unrelated filing rows.
7. Assert both controls have the specified accessible names and titles.
8. Change the color and assert the note's rendered color changes through the
   real PDF.js parameter path.
9. Deselect the editor while Add Note is off and assert the toolbar is hidden
   (`display: none` / not visible), with no visible `.basicColorPicker` or
   `.deleteButton` remaining on the page.
10. Re-select the note and activate Delete; assert the note is removed using
    the real toolbar control.

Use computed styles and bounding boxes rather than a pixel screenshot as the
primary gate. This makes the regression identify the structural failure that
caused the screenshot while remaining stable across browser font rendering.

### Red/green evidence requirement

Before changing production code, add the focused regression and run it against
the current tree. Capture a failure demonstrating at least:

- the supposedly hidden editor toolbar remains visible, or
- its children are not horizontally contained.

After implementation, rerun the same test unchanged and capture the passing
result. A test that is first introduced only after the CSS is fixed does not
satisfy this gate.

### Verification gate

Run the targeted annotation spec:

```text
npx playwright test tests/e2e/pdf-annotate.spec.ts
```

Also run the production build because the annotation UI is loaded through the
Vite bundle and the portable target must receive the same CSS and icon markup:

```text
npm run build
```

This is a localized preview-layer correction, so a full `npm test` run is not
required by default. If implementation expands beyond the four files listed
above or changes shared PDF rendering, recommend the full regression and ask
before running it, per `AGENTS.md` §1.

### Acceptance criteria

55A is complete only when all of the following are true:

- Selecting a FreeText note shows one compact toolbar adjacent to that note.
- Its color picker, divider, and delete button stay in one horizontal row.
- The delete control has a recognizable trash icon.
- The color and delete controls have stable accessible names.
- Deselecting the note completely hides the editor toolbar.
- No native color swatch, blank button, or stray mark remains over filing
  content, including the rows around Schedule B.
- Note color changes and note deletion still use PDF.js's real behavior.
- Saving an annotated PDF still produces a parseable FreeText annotation and
  does not serialize toolbar chrome as page content.
- Light, dark, and forced-colors modes retain visible borders and focus states.
- The existing annotation E2E suite and production build pass.
- `TEST-INDEX.md` describes the expanded test scope.

### Risk and rollback

Risk is **low–medium**. The data and PDF serialization paths are unchanged, but
the affected DOM is created asynchronously inside a scaled, vendor-controlled
editor layer. The main implementation risks are overly broad CSS selectors,
an observer that outlives its preview session, and positioning that clips near
a page edge.

Rollback is limited to the 55A changes in `print.css`, `pdf-annotate.js`, the
focused E2E assertions, and the corresponding test-index text. No migration or
persisted-data repair would be required.

### Cross-cutting ramifications (`AGENTS.md` §8)

1. **Data Model:** None. No persisted filing field is added, removed, renamed,
   or reshaped; `probate-guardian-data-model.csv` must remain unchanged.
2. **Legacy Data Migration:** None. Existing `.sav` files and stored annotated
   PDF bytes require no migration.
3. **Test Coverage & Index:** Modify `tests/e2e/pdf-annotate.spec.ts` and update
   its existing `TEST-INDEX.md` description in the same commit.
4. **Export/Import/Portability:** Annotation storage and PDF save behavior stay
   unchanged. Verify both Vite web and portable builds through `npm run build`;
   do not introduce a root-relative icon URL that would break arbitrary-folder
   portable hosting.
5. **Security & Sensitivity:** No new data is collected or stored. Toolbar text
   and icon markup are fixed application strings; do not derive HTML from note
   content.
6. **UI/UX Consistency:** Reuse semantic design tokens, the existing `ic()` SVG
   system, established 28px compact controls, and visible keyboard focus.
7. **Legal/Compliance Framing:** This change affects only annotation UI chrome.
   It makes no claim about a filing's legal sufficiency and must not alter the
   generated court form.

### Dependency and sequencing

55A has no dependency on Milestones 53 or 54; both are already landed. It
touches the same annotation surface established by Milestones 39-A, 43E, 45A,
and 45B, so implementation must preserve their save/reopen, compression,
all-filing availability, placement, and highlight regressions.

If another agent is editing `src/styles/print.css`,
`src/core/pdf/pdf-annotate.js`, `tests/e2e/pdf-annotate.spec.ts`, or
`TEST-INDEX.md`, 55A must wait or coordinate at file level rather than assuming
the overlap is harmless.

---

## 55B — Section Markers Green While Export Still Blocks on a Date-Order Rule

### User-observed defect

On a Plan Annual filing, the left sidebar reads "FILING PROGRESS 100% — 11 of
11 sections complete," every section including Signatures shows a green
checkmark, yet Preview & Export reports "1 required field still missing" and
the readiness card lists one outstanding item: "Signatures — Guardian date
signed must be on or after Reporting Period To." Nothing in the visible
navigation indicates which of the eleven green sections is actually the
problem, or that a problem exists at all until the filer reaches Preview &
Export.

### Confirmed diagnosis

Three independent mechanisms decide "done," at three levels of strictness,
and this is a case where only the strictest one applies the rule that
matters:

- **Real export validator** (`plan-annual/index.js:756-758`): calls
  `checkDateOrder(d.periodTo, g0.signatureDate, { allowSameDay: true, ... })`
  — the guardian's date signed must be on or after the reporting period's end
  date. This is the rule actually producing the blocking issue.
- **Readiness card predicate** (`readiness-config.js:137`, `signatures.guardian1.core`):
  calls `signedAndDated()` → `checkSignatureState()`, which only confirms a
  signature choice exists and, if "typed," that *some* date was entered — no
  comparison against `periodTo`. The card still reports the outstanding item
  correctly, because a separate, already-designed fallback lists any
  validator issue left over once every predicate passes (see the file's own
  header comment); this is not itself broken.
- **Sidebar nav-check** (`legacy-app.js:201`, `pa-p11`):
  `filled(g0.name)&&filled(g0.signatureDate)` — presence only, no idea what
  the reporting period is. This is the one that is actually wrong: it has no
  path to ever disagree with the validator on this field, so it reports
  "complete" on a filing that is not.

**This is not one filing type's bug.** `computeNavChecks()` in `legacy-app.js`
hand-writes a presence-only nav-check per filing type, entirely independent of
each feature's own validator, for every filing type except Guardian Inventory
(whose branch derives its checks directly from `validate()`'s real errors,
mapped to section keys via `errorRoute()` — architecturally immune to this
class of drift by construction; confirmed by reading that branch, not
assumed). Every `checkDateOrder()` call across the other 7 filing types was
checked against its filing type's own nav-check branch. Two date-order
relationships recur, and every site below was confirmed present in both the
validator (with its exact `allowSameDay` flag) and the nav-check (as a
presence-only check with no ordering):

**Cover: Reporting Period From must be strictly before Reporting Period To
(`allowSameDay:false`), and (where the field exists) GID must be on or before
Reporting Period From (`allowSameDay:true`):**

| Filing type | Nav-check key | Validator call |
| --- | --- | --- |
| Annual/Final/Trust | `a-p1` | `annual-accounting/index.js:1411` (periodFrom/periodTo), `:1415` (gid/periodFrom) |
| Simplified Accounting | `s-cover`, `s-p3` (duplicated) | `simplified-accounting/index.js:667`, `:671` |
| Plan Simplified | `ps-cover` | `plan-simplified/index.js:350` (no `gid` field in this filing type) |
| Plan Annual | `pa-cover` | `plan-annual/index.js:668`, `:672` |
| Plan Minor | `pm-cover` | `plan-minor/index.js:446` (no `gid` field in this filing type) |

**Signature/certification date must be on or after Reporting Period To
(`allowSameDay:true` at every site):**

| Filing type | Nav-check key | Role | Validator call |
| --- | --- | --- | --- |
| Annual/Final/Trust | `a-p3` | Guardian | `annual-accounting/index.js:1439` |
| Annual/Final/Trust | `a-p4` | Preparer | `annual-accounting/index.js:1459` |
| Annual/Final/Trust | `a-p5` | Attorney | `annual-accounting/index.js:1480` |
| Annual/Final/Trust | `a-p10` | Certificate of Service | `annual-accounting/index.js:1487` |
| Simplified Accounting | `s-p4` | Guardian | `simplified-accounting/index.js:704` |
| Simplified Accounting | `s-p6` | Certificate of Service | `simplified-accounting/index.js:729` |
| Plan Simplified | `ps-p3` | Guardian | `plan-simplified/index.js:392` |
| Plan Annual | `pa-p11` | Guardian | `plan-annual/index.js:756` — **the reported defect** |
| Plan Minor | `pm-p6` | Guardian | `plan-minor/index.js:493` |
| Plan Minor | `pm-p7` | Attorney | `plan-minor/index.js:528` |

**Confirmed clean, not merely unexamined:**

- **Guardian Inventory** — validator-driven nav-check, immune by
  construction (above).
- **Plan Initial** — has no `periodFrom`/`periodTo`/reporting-period concept
  at all (uses one-time `inceptionDate`/`lettersSignedDate` fields instead);
  `plan-initial/index.js` contains zero `checkDateOrder()` calls, confirmed
  by grep, not inferred from the absence of a nav-check key.

**Why `tests/unit/checklist-export-parity.spec.js` did not already catch
this.** That spec's `KNOWN_GAPS` mechanism (Milestone 36-6 item 13) compares
which `d.`/`D.`-prefixed field *names* each validator body references against
which names each nav-check branch references, and fails on any name present
in the validator but absent from the nav-check, unless the name is on its
filing type's accepted list. It is real, working coverage for its own
question — but that question is "is this field name mentioned at all,"
not "does the nav-check apply the same rule to it." `periodFrom`, `periodTo`,
and `gid` are mentioned in both the validator and every affected nav-check
branch (as presence checks), so this spec sees no gap for the Cover-level
pairs even though the rule diverges completely. The signature-date pairs are
worse: `g.signatureDate`/`g0.signatureDate` are read through a destructured
per-guardian variable, never as a bare `d.signatureDate`, so this spec's
`modelFields()` regex (`/\b[dD]\.([A-Za-z_][A-Za-z0-9_]*)/g`) cannot see them
at all — not flagged as a known gap, not verified fine, simply invisible to
this tooling. (`attorney_signatureDate` **is** a bare `d.` field and **is**
already on `planAnnual`'s accepted `KNOWN_GAPS` list — that half of the
picture was already known; the guardian-date half the screenshot actually
shows was not.)

### Scope

55B will:

1. add one date-order-aware helper inside `computeNavChecks()`, matching
   `checkDateOrder()`'s own tolerant semantics (either side blank → no
   ordering failure, since a missing-field problem is the presence check's
   job, not this one's);
2. apply it alongside the *existing* presence check at each of the ten
   confirmed sites above — five Cover-level pairs, five signature/cert
   pairs — using the exact `allowSameDay` value the real validator uses at
   that site;
3. extend `checklist-export-parity.spec.js` (or a new focused spec, decided
   during implementation) with a regression that would have caught this: a
   fixture where the tracked field is present but out of order, asserting
   the nav-check now reports incomplete;
4. update `TEST-INDEX.md` for whatever spec carries the new coverage.

55B will not:

1. add nav-check presence-tracking for fields the sidebar does not track at
   all today — `simplified-accounting`'s `s-p5` never tracks
   `attorney_signatureDate`'s presence, and `ps-p3`/`pa-p11`/`pm-p7` have no
   preparer- or attorney-specific key covering every role their own
   validator checks. That is a missing-field gap, a different and broader
   problem than the misapplied-rule gap this sub-delivery fixes, and already
   partly catalogued by `checklist-export-parity.spec.js`'s own
   `KNOWN_GAPS`. Naming it here so it is not lost, not fixing it as a
   side effect;
2. touch the readiness card's predicate rows (`readiness-config.js`) — it
   already surfaces this exact outstanding issue correctly via its
   validator-issue fallback, confirmed above, not merely assumed;
3. change `checkDateOrder()`, `validatePlanAnnual()`, or any other real
   validator — the rule they enforce is correct and unchanged; only the
   sidebar's blindness to it is being fixed;
4. rearchitect the other 7 filing types' `computeNavChecks()` branches to
   the validator-driven model Guardian Inventory already uses. That is the
   structurally correct long-term direction — it is what makes Guardian
   Inventory immune to this whole bug class — but it is a large,
   cross-cutting rewrite with its own risk profile, not a targeted fix to
   one confirmed defect. Recorded here as a follow-up worth its own
   milestone, not undertaken now.

### Files in scope

| File | Planned change |
| --- | --- |
| `src/legacy-app.js` | Add the shared date-order helper inside `computeNavChecks()`; apply it at the ten confirmed sites listed above, in their respective filing-type branches. |
| `tests/unit/checklist-export-parity.spec.js` | Add the out-of-order-but-present regression fixture and assertion described above. |
| `TEST-INDEX.md` | Extend the existing `checklist-export-parity.spec.js` row to record the new date-order regression scope. |

### Implementation design

Add near the top of `computeNavChecks()`, once, shared by every branch:

```js
// Mirrors checkDateOrder()'s own tolerance: a blank date on either side is
// the presence check's problem, not this one's -- so it reports "in order"
// rather than manufacturing a second, redundant failure.
const datesOrdered=(earlier,later,allowSameDay=true)=>
  !earlier||!later||(allowSameDay?later>=earlier:later>earlier);
```

Then, at each confirmed site, `&&` the matching call onto the existing
boolean — for example, Plan Annual's two affected keys become:

```js
'pa-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.gid)
  &&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.guardian)&&filled(D.wardLiving)
  &&filled(D.residenceAddress)&&filled(D.residenceCityStateZip)
  &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
...
'pa-p11':filled(g0.name)&&filled(g0.signatureDate)&&datesOrdered(D.periodTo,g0.signatureDate,true),
```

No change to any `incomplete` object (the "started but not finished" nav-dot
state) — a date that is present but out of order is not "not started," it is
"present and wrong," which is exactly what the newly-red `checks[key]` (with
`incomplete[key]` still `false`, since every underlying field is filled) is
meant to convey.

### Required regression test

Add to `checklist-export-parity.spec.js` (co-located with the existing
`KNOWN_GAPS` guard it complements) or a new focused spec:

1. For at least Plan Annual (the reported case) and one Cover-level pair
   (e.g. Annual's `periodFrom`/`periodTo`): build a fixture where the
   tracked field is present but chronologically out of order.
2. Assert the real validator reports the issue (already true; this pins it).
3. Assert `computeNavChecks()`'s corresponding key is now also `false` — red
   before the fix, green after, per this repo's red-first convention.

### Verification gate

```text
npx vitest run tests/unit/checklist-export-parity.spec.js
npx vitest run tests/unit/plan-annual-parity.spec.js tests/unit/plan-initial-parity.spec.js tests/unit/plan-minor-parity.spec.js tests/unit/plan-simplified-parity.spec.js
npx playwright test tests/e2e/routes.spec.ts tests/e2e/navigation-status.contract.spec.ts
```

`computeNavChecks()` is shared, hand-maintained, load-bearing logic touched by
7 of 9 filing-type branches in one file — recommend a full `npm test` before
commit per `AGENTS.md` §1's "broad, cross-cutting, touches shared/core
modules" criterion, and ask before running it.

### Acceptance criteria

- Every one of the ten confirmed sites: presenting the tracked date(s) out of
  order flips that section's sidebar marker from green to red, matching the
  real validator's own judgment.
- A filing with every date in valid order is unaffected — no new false
  negatives introduced (the reported filing's other ten sections must not
  turn red).
- Guardian Inventory, Plan Initial, and every field not named above are
  bit-for-bit unaffected.
- `checklist-export-parity.spec.js`'s existing `KNOWN_GAPS` assertions are
  unaffected — this fix does not remove or add any field-name-level gap.
- New regression is red against pre-fix `computeNavChecks()`, green after.

### Risk and rollback

Risk is **medium** — the change is small and mechanical, but
`computeNavChecks()` gates the Next-button and sidebar dot for 7 filing types
from one function, so a typo in one branch's condition risks that branch
alone, not the others (each `checks` object is independent), but is still
worth the full-suite gate above rather than the lite default.

Rollback is limited to the `datesOrdered()` helper and its ten call sites in
`legacy-app.js`, plus the new test assertions. No data model or persisted
shape change; no migration.

### Cross-cutting ramifications (`AGENTS.md` §8)

1. **Data Model:** None.
2. **Legacy Data Migration:** None — this reads existing fields already
   present in every `.sav` file; no new field, no reshape.
3. **Test Coverage & Index:** New regression in `checklist-export-parity.spec.js`
   (or a new file); update `TEST-INDEX.md` in the same commit.
4. **Export/Import/Portability:** None — export behavior itself (what the
   real validator blocks on) is unchanged; only the sidebar's agreement with
   it improves.
5. **Security & Sensitivity:** None.
6. **UI/UX Consistency:** Directly implicated, positively — a filer now sees
   the same section marked incomplete in the sidebar that Preview & Export
   will block on, instead of discovering the mismatch only at Preview.
7. **Legal/Compliance Framing:** None beyond what the existing, unchanged
   validator rule already establishes (a signature or certification dated
   before the period it certifies is not a coherent filing).

### Dependency and sequencing

No dependency on 55A, 55C, or 55D. Touches `legacy-app.js`, which is a large,
frequently-edited shared file — sync with `master` and re-check `git log`
before starting, per `AGENTS.md` §1, and coordinate at file level with any
other agent mid-edit there rather than assuming the overlap is harmless.

---

## 55C — Signature Stamp Capture Widget: Remove the "Type" Tab, Globally

### User-observed defect

The Signature Stamp capture widget offers three tabs — Draw, Type, Upload.
The "Type" tab (type a name, rendered onto the stamp canvas in a cursive
font) should be removed as a global fix, across every role and filing type.

### Confirmed diagnosis

`mountSignaturePad()` in `src/core/signature/signature-pad.js` is the one
shared implementation of this widget — its own header comment states it is
"meant to be reused verbatim by every future role/card 39-C adds -- nothing
here is Guardian- or Plan-Simplified-specific." Confirmed, not assumed: it
has exactly one caller in the entire codebase,
`mountSignatureStateControls()` in `src/core/signature/signature-state-control.js`,
which is itself the shared mount point every signature-capable role/filing
type renders through (per its own header comment: "39-C's rollout to every
other role/filing type reuses this exact markup and JS wiring instead of
each card hand-rolling its own copy"). Removing the Type tab from this one
file is therefore genuinely a global, one-file fix, not nine per-filing-type
edits.

The Type tab's surface inside `signature-pad.js`:

- the tab button, `data-sig-tab="type"` (`:183`);
- its panel, `data-sig-panel="type"`, the `#sig-pad-typed-name` text input,
  and its preview `<canvas>` (`:190-194`);
- `renderTypedPreview()` and its `TYPE_MAX_FONT_PX`/`TYPE_MIN_FONT_PX`
  shrink-to-fit constants (`:219-243`, Milestone 50F);
- the `typeInput`/`typePreview` element lookups and the `input` listener
  wiring them to `renderTypedPreview()` (`:209-210`, `:244`);
- the `activeTab === 'type'` branch in the tab-switch handler's implicit
  behavior (no branch-specific code there, just the generic show/hide) and
  the two explicit `activeTab === 'type'` branches in the Apply handler —
  one selecting `typePreview` as the source canvas (`:291`), one supplying
  the "nothing is visible yet" empty-canvas message (`:301`).

One existing regression test is Type-tab-specific and must be removed, not
adapted: `tests/e2e/signature-capture.contract.spec.ts`'s "Signature Stamp: a
long typed name is condensed to fit, not clipped" test (`:134-172`) drives
the Type tab, types a name, and asserts the shrink-to-fit rendering
`renderTypedPreview()` performs. Once the Type tab is gone, there is nothing
left for this test to exercise.

**Not affected, and must not be confused with this change:** the
`SIGNATURE_STATES.TYPED` value and the `"/s/" Signed` radio option one level
up, in `signature-state-control.js`'s three-way Unsigned / "/s/" Signed /
Signature Stamp choice. That is a different, independent concept (a
certification-style typed signature, entered as plain text on the form
itself) from the "Type" *tab inside the Stamp capture widget* (rendering a
typed name as an image onto the stamp canvas). This sub-delivery removes only
the latter.

### Scope

55C will:

1. remove the Type tab button, panel, and all Type-specific logic from
   `mountSignaturePad()`, leaving Draw and Upload as the only two capture
   methods;
2. remove the now-meaningless long-typed-name regression from
   `tests/e2e/signature-capture.contract.spec.ts`;
3. confirm no other test or code path references `data-sig-tab="type"`,
   `data-sig-panel="type"`, `#sig-pad-typed-name`, or `renderTypedPreview`
   before removal, and again after, as the actual gate that the removal is
   total;
4. update `TEST-INDEX.md` for the trimmed contract spec.

55C will not:

1. touch the "/s/" Signed radio option or `SIGNATURE_STATES.TYPED` — see the
   distinction above;
2. touch Draw or Upload's own logic, `validateSignatureImage()`,
   `removeLightBackground()`, or any other exported helper in
   `signature-pad.js` unrelated to the Type tab;
3. migrate or reinterpret any `.sav` file's already-stored
   `signatureImage` produced by a past Type-tab capture — those are already
   plain PNG bytes indistinguishable from a Draw or Upload capture at rest;
   nothing about existing stored data needs to change or can even tell how
   it was produced.

### Files in scope

| File | Planned change |
| --- | --- |
| `src/core/signature/signature-pad.js` | Remove the Type tab button, panel, `typeInput`/`typePreview` lookups, `renderTypedPreview()` and its constants, the `input` listener, and both `activeTab === 'type'` branches in the Apply handler. |
| `tests/e2e/signature-capture.contract.spec.ts` | Remove the long-typed-name regression test (`:126-172`) and its Milestone 50F comment block. |
| `TEST-INDEX.md` | Update the `signature-capture.contract.spec.ts` row to drop the Type-tab-specific coverage it currently describes. |

No CSS removal is required as part of this scope: `src/styles/forms.css`'s
`.signature-pad-*` selectors are shared structurally by all three tabs/panels
(tabs, canvas, actions, footer, error) with nothing Type-specific to prune;
confirm this holds during implementation rather than assuming it from this
document.

### Required regression test

No new regression is needed for a removal; the gate is negative-space
verification:

1. `grep -rn "data-sig-tab=\"type\"\|data-sig-panel=\"type\"\|sig-pad-typed-name\|renderTypedPreview" src/ tests/` returns nothing after the change.
2. Manual pass: open the Signature Stamp capture widget for at least one
   role (e.g. Guardian on any Plan type) and confirm exactly two tabs, Draw
   and Upload, with Draw active by default and no visual or layout gap left
   by the removed middle tab.
3. Confirm Draw and Upload still apply, clear, and validate correctly —
   this sub-delivery must not regress the two capture methods it keeps.

### Verification gate

```text
npx playwright test tests/e2e/signature-capture.contract.spec.ts tests/e2e/signature-stamp-reuse.spec.ts
npx vitest run tests/unit/signature-capture.spec.js
npm run build
```

This is a contained, single-file removal with no data or validator change;
a full `npm test` is not required by default per `AGENTS.md` §1.

### Acceptance criteria

- The Signature Stamp widget shows exactly two tabs, Draw and Upload, for
  every role and filing type (verified through at least one Plan and one
  Accounting filing type's Signature card, not assumed identical from the
  shared-implementation argument alone).
- No dead reference to the Type tab remains anywhere in `src/` or `tests/`.
- Draw and Upload continue to apply, validate, and clear exactly as before.
- `TEST-INDEX.md` reflects the trimmed contract spec.

### Risk and rollback

Risk is **low** — this is a subtractive change to one shared, well-isolated
module with a single caller, removing one of three independent code paths
inside it. The main risk is an overlooked reference outside the two files
named above; the grep gate above is the check for that.

Rollback is limited to `signature-pad.js`, the one removed test, and the
test-index row.

### Cross-cutting ramifications (`AGENTS.md` §8)

1. **Data Model:** None. `signatureImage` remains a base64 PNG regardless of
   capture method; no field is added, removed, or reshaped.
2. **Legacy Data Migration:** None — see "will not" above; existing stored
   images are unaffected and their capture method is not recoverable or
   relevant.
3. **Test Coverage & Index:** Remove the Type-tab regression from
   `signature-capture.contract.spec.ts`; update its `TEST-INDEX.md` row in
   the same commit.
4. **Export/Import/Portability:** None — the produced PNG's format and the
   PDF-stamping path are unchanged regardless of capture method.
5. **Security & Sensitivity:** None new. If anything, marginally reduces
   surface (one fewer canvas-rendering code path per Milestone 46B's
   reusable-stamp feature, which stores whatever `onApply` receives
   regardless of which tab produced it).
6. **UI/UX Consistency:** Directly implicated — every signature-capable
   card across all nine filing types loses the Type option identically,
   since all of them mount through the one shared widget. Confirm this
   uniformity through the widget's single implementation, not per filing
   type.
7. **Legal/Compliance Framing:** None. This does not change what a
   Signature Stamp legally represents, only how a filer may produce the
   image.

### Dependency and sequencing

No dependency on 55A, 55B, or 55D. Touches
`src/core/signature/signature-pad.js`, `tests/e2e/signature-capture.contract.spec.ts`,
and `TEST-INDEX.md` — sync and check for concurrent edits to those files
before starting, per `AGENTS.md` §1.

---

## 55D — Attorney "Primary Email (e-filing)" Shows Required, Enforces Nothing

### User-observed defect

On a Plan Annual filing's Attorney Certification card, with the attorney's
name filled in and Signature set to "Unsigned," every other field in the
card — Bar Number, Phone, Primary Email, Street Address, City/State/ZIP — is
left blank, yet the sidebar still shows Signatures as 100% complete and no
incomplete error is raised for any of them, including the one field
("Primary Email (e-filing)") the form itself marks with a required-field
asterisk.

### Confirmed diagnosis

Two separate things are true here, and they should not be conflated:

**1. A confirmed, unambiguous defect: the required asterisk on Primary Email
is not backed by any validator rule, in four filing types.**
`inpS(id, label, value, required, type)`'s fourth argument sets
`renderFormField()`'s `required` flag, whose only effects are a `<span
class="req">*</span>` marker and an inert `data-field-required="true"`
attribute — confirmed to be read nowhere else in `src/` (grepped). The
attorney email field is passed `required: true` (rendering the asterisk) in:

| Filing type | Call site |
| --- | --- |
| Annual/Final/Trust | `annual-accounting/index.js:686` |
| Plan Annual | `plan-annual/index.js:641` — the reported case |
| Plan Initial | `plan-initial/index.js:572` |
| Simplified Accounting | `simplified-accounting/index.js:537` |

None of these four validators contains a `req(...)` call (or any other
requiredness check) on `attorney_email` — confirmed by grep across all four
files, zero matches. A filer can leave Primary Email blank forever; nothing
in the sidebar, the readiness card, or the export blocker will ever flag it.
Two other filing types with the same field, Plan Simplified and Plan Minor,
render it *without* the required flag (`plan-simplified/index.js:323`,
`plan-minor/index.js:422`) — internally consistent with their own equally
unenforced validators, and further evidence the asterisk on the other four is
the anomaly, not the norm.

**2. A separate, broader question this document does not resolve: should
naming an attorney make their other contact fields required at all?**
`plan-annual/index.js`'s own comment at the attorney block states this is
deliberate, Milestone 39-C policy: "the attorney card has never had any
requiredness of its own ('Leave blank if no attorney is involved')" — only
the attorney's printed *name* becomes conditionally required, and only
through `checkSignatureState()`'s `name` parameter when a signature choice
other than Unsigned is made. Bar number, phone, street, city/state/zip are
not required in any of the nine filing types today, by design, regardless of
whether a name is present or what signature state is chosen. Whether that
policy should change — so that typing an attorney's name obligates the rest
of the card, independent of signature state — is a product decision, not a
defect this document can resolve unilaterally.

### Decision needed from Alan

**Recommendation: fix (1) now; treat (2) as a separate decision, not bundled
into this sub-delivery.** The narrow fix — make the four validators actually
require `attorney_email` once an attorney is named, matching what their own
forms already visually promise — is small, contained, and resolves an
internal inconsistency no reasonable reading of the current UI would accept
("the app tells me this is required" while genuinely enforcing nothing). The
broader question (2) changes real behavior for every filing type that
currently allows a named-but-incomplete attorney to export cleanly, and
deserves its own explicit yes/no rather than being decided as a side effect
of fixing the asterisk.

| Option | Effect |
| --- | --- |
| **A — Enforce the asterisk (recommended)** | Add `req(d.attorney_email, ...)` gated on `has(d.attorney)` to the four validators named above, and the matching nav-check presence key. Primary Email becomes actually required exactly where the UI already claims it is. |
| **B — Remove the asterisk instead** | Drop `required: true` from the four `inpS('attorney_email', ...)` calls, making the UI honest about the field being optional, matching Plan Simplified/Plan Minor's existing treatment. |
| **C — Expand to the full card (out of scope for 55D as written)** | Make bar number, phone, street, city/state/zip also conditionally required once an attorney is named, across all nine filing types. This is question (2) above — named, not decided, not sized here. |

### Scope (Option A, pending Alan's confirmation)

55D will, if Option A is confirmed:

1. add `req(d.attorney_email, ...)` (gated on `has(d.attorney)`, matching
   the existing conditional-attorney pattern each of these validators
   already uses for the attorney's signature state) to `validateAnnual()`,
   `validatePlanAnnual()`, `validatePlanInitial()`, and
   `validateSimplified()`;
2. add the matching presence key to each filing type's `computeNavChecks()`
   branch, gated the same way, so the sidebar agrees with the newly-real
   requirement rather than reopening the exact class of gap 55B fixes;
3. add or extend regression coverage proving a named attorney with no email
   now blocks export, and that no attorney named still exports cleanly with
   email blank.

55D will not, regardless of which option is chosen:

1. resolve Option C — recorded as a named, open question, not attempted;
2. touch Plan Simplified or Plan Minor, which are already internally
   consistent and out of scope for this specific mismatch;
3. change any other attorney field's requiredness (bar, phone, street,
   city/state/zip) — that is exactly Option C.

### Files in scope (Option A)

| File | Planned change |
| --- | --- |
| `src/features/annual-accounting/index.js` | Add gated `req(d.attorney_email, ...)`. |
| `src/features/plan-annual/index.js` | Add gated `req(d.attorney_email, ...)`. |
| `src/features/plan-initial/index.js` | Add gated `req(d.attorney_email, ...)`. |
| `src/features/simplified-accounting/index.js` | Add gated `req(d.attorney_email, ...)`. |
| `src/legacy-app.js` | Add the matching gated presence key to each of the four filing types' `computeNavChecks()` branches. |
| `tests/unit/checklist-export-parity.spec.js` or per-type parity specs | New regression fixture; update `KNOWN_GAPS` if `attorney_email` was already listed for any of the four (needs a fresh check at implementation time — not confirmed either way here). |
| `TEST-INDEX.md` | Update affected rows. |

### Required regression test

1. A fixture with `d.attorney` set (name present), `d.attorney_email` blank,
   for each of the four filing types: confirm the real validator now blocks,
   red before the fix, green after.
2. A fixture with `d.attorney` blank entirely: confirm no attorney-email
   requirement is introduced when no attorney is named at all, in all four
   and in the two already-consistent types (Plan Simplified, Plan Minor)
   unaffected.
3. Sidebar parity: the newly-added nav-check key agrees with the validator
   for both fixtures above.

### Verification gate

```text
npx vitest run tests/unit/checklist-export-parity.spec.js tests/unit/plan-annual-parity.spec.js tests/unit/plan-initial-parity.spec.js
npx playwright test tests/e2e/routes.spec.ts
```

Recommend a full `npm test` before commit given this changes real export
behavior (a filing that exports cleanly today may not once this lands) —
per `AGENTS.md` §1, ask before running it.

### Acceptance criteria

- A named attorney with no Primary Email now blocks export in all four
  affected filing types, with a sidebar marker that agrees.
- A filing with no attorney named at all is completely unaffected in all six
  filing types that have this field.
- Plan Simplified and Plan Minor are untouched.
- No new gap or false parity-pass is introduced in
  `checklist-export-parity.spec.js`.

### Risk and rollback

Risk is **low–medium**: this is the one sub-delivery in this milestone that
changes real export-blocking behavior for existing filings (a Plan Annual,
Plan Initial, Annual, or Simplified Accounting filing with a named attorney
and no email, previously exportable, will no longer be until Option A lands
and the filer supplies one). State this plainly in the commit message, per
this repo's convention for behavior changes buried in what could look like a
pure bugfix.

Rollback is limited to the four `req()` additions, the four nav-check
additions, and the new test fixtures.

### Cross-cutting ramifications (`AGENTS.md` §8)

1. **Data Model:** None — no field added, removed, or reshaped;
   `attorney_email` already exists in all six filing types' data model.
2. **Legacy Data Migration:** Not a migration concern, but real: an existing
   `.sav` file with a named attorney and no email, valid under today's rules,
   becomes an incomplete filing under Option A. No data changes; the filer's
   next Preview & Export simply now reports it. Worth a one-line note in
   release communication, not a code migration.
3. **Test Coverage & Index:** New fixtures per Verification above; update
   `TEST-INDEX.md` in the same commit.
4. **Export/Import/Portability:** Directly implicated — this changes which
   filings the real export gate accepts. See risk note above.
5. **Security & Sensitivity:** None.
6. **UI/UX Consistency:** Resolves an existing inconsistency (asterisk
   promises a rule that isn't enforced) rather than introducing one.
7. **Legal/Compliance Framing:** An attorney of record's contact email
   supports e-filing service and correspondence; requiring it once the
   attorney is named is defensible on that basis, but this document does not
   assert it is legally mandatory for every filing type equally — that
   judgment, and Option C's broader version of it, belongs to Alan.

### Dependency and sequencing

Depends on 55B only insofar as both touch `computeNavChecks()` — if 55B
lands first, 55D's nav-check additions should follow its pattern (the
`datesOrdered()` helper is unrelated, but the file-level proximity means
checking `git log`/`git diff` before starting either is required per
`AGENTS.md` §1, not merely advisable). No dependency on 55A or 55C.

