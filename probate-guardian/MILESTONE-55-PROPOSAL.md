# Milestone 55: Preview, Signature, and Validation Parity Fixes — Scoping & Execution Proposal

## Status

**Draft — not an authorization to implement.** Per `AGENTS.md` §2, this
document is a proposal only. Nothing below should be started until Alan
explicitly approves a named sub-delivery by name. Approval of one
sub-delivery authorizes only that one; every other sub-delivery, including
ones listed after it here, requires its own explicit approval.

**Numbering note.** Milestone 55 was confirmed unused on 2026-09-16 by
searching `src/`, `tests/`, project Markdown, and `git log` for Milestone 55,
`MILESTONE-55`, and `55A` references.

**Title note (2026-09-16).** This document started as a single PDF-annotation
fix (55A) and grew, one user-reported issue at a time, to cover navigation
parity, signature capture, and attorney-field validation as well — unrelated
areas that happen to share this milestone number because they were reported
in the same session, not because they share a root cause or a dependency.
The title above was renamed from "PDF Annotation Preview Integrity" to match
what the document actually now contains, per a code-review finding that the
old title was stale. **This is a container for four independent fixes, not
one coherent piece of work** — read "the order listed" below as reporting
order and rough sequencing convenience, not a required execution sequence:
any sub-delivery may be approved and landed before or without any other. The
one real ordering constraint is a file-level one, noted under 55B and 55D
below, not a priority ranking.

---

## Ordered Issue Register

| Order reported | Sub-delivery | Issue | Status | Risk |
| --- | --- | --- | --- | --- |
| 1 | **55A** | FreeText note color picker and delete control render as artifacts over the visible PDF | Corrected — still needs Alan's FreeText-only vs. FreeText+Highlight decision before it is approvable | Low–medium |
| 2 | **55B** | Sidebar/nav-check section markers show green while the real export validator still blocks on a date-order rule they never apply | Corrected — full 23-site inventory and a runtime test venue now in place; the 10-of-23 scope split (fix now vs. named-open-gap) is stated explicitly and approvable as scoped | Medium |
| 3 | **55C** | Signature Stamp capture widget's "Type" tab — global removal | Corrected — the deleted regression is now replaced with a real contract test; approvable as scoped | Low |
| 4 | **55D** | Attorney "Primary Email (e-filing)" renders a required asterisk that no validator enforces, in four filing types | Corrected — data-model/factory work added to scope, per-engine policy table replaces the false uniform-rule claim; **still needs Alan's choice of Option A/B/C** before it is approvable | Medium |

"Order reported" is the sequence these were raised in this session, kept for
traceability. It is not an execution order and not a priority ranking; treat
each row as independently approvable once its own status above says so.

**Correction record (2026-09-16, same day as authoring):** an independent
code review of this document, verified point-by-point against the actual
source before accepting any of it, found 55B and 55D contained real,
confirmed factual errors serious enough to block approval, and 55A and 55C
needed tightening before either was truly ready. Every specific, checkable
claim in that review was independently re-verified against the source before
being accepted — CSV rows, factory contents, validator line numbers, call
counts, and existing test behavior were all read directly, not taken on
either party's word. All four findings held up exactly as reported. Both
problem sub-deliveries are rewritten in place below; the rewrites are the
corrections, not a promise of a future pass.

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

### Decision needed from Alan: FreeText-only, or FreeText and Highlight

**Correction (code review, 2026-09-16):** this document originally scoped
"the two supported editor types, FreeText and Highlight" as one contract, but
designed and styled only the FreeText toolbar. That is not a documentation
gap; it is a real, separate problem — confirmed directly in
`lib/pdfjs/pdf.mjs`: FreeText's toolbar uses `class BasicColorPicker`
(`input.className = 'basicColorPicker'`, a single native `<input
type="color">`), while Highlight's uses a structurally different `class
ColorPicker` (`#mainHighlightColorPicker`, a dropdown of swatch buttons with
its own keyboard manager, `.colorPicker` DOM, and `data-l10n-id`-driven
labels per swatch). A generic decorator built for `.basicColorPicker` would
not style Highlight's dropdown at all, and reusing the FreeText "Delete note"
label on a Highlight control would mislabel it.

The **user-observed defect is FreeText-only** — the repro is "selecting or
committing an **Add Note** annotation," and Add Note is the FreeText editor;
nothing in the report describes a Highlight-toolbar artifact.

| Option | Effect |
| --- | --- |
| **A — Narrow 55A to FreeText only (recommended)** | Scope, implementation, and regression below all apply to `.basicColorPicker`/FreeText's toolbar only, matching the actual reported defect. Highlight's toolbar is out of scope and named as a candidate follow-up, not assumed fine. |
| **B — Cover both editors** | Requires inventorying `ColorPicker`'s `.colorPicker` swatch-dropdown structure and keyboard behavior (not done in this document), role-specific accessible labels (a Highlight control is not a "note"), and its own regression test with its own red/green evidence. Materially larger than what is designed below. |

**The rest of this section assumes Option A** (FreeText only) unless Alan
selects Option B, in which case the Scope, Implementation design, and
Required regression test below need a second pass for Highlight's `ColorPicker`
before this sub-delivery is execution-ready.

### Scope

55A will:

1. restore the minimal PDF.js toolbar layout and visibility contract for the
   **FreeText editor's toolbar only** (`.basicColorPicker`/`BasicColorPicker`) —
   see the Decision above; Highlight's separate `ColorPicker` dropdown is not
   inventoried or styled by this sub-delivery as written;
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

**Correction (code review, 2026-09-16): how an ES module reaches `ic()` was
unspecified.** `ic()` is defined only as a bare top-level `function ic(n,
size)` in `legacy-app.js` (a classic script) — there is no separate
importable icon module, and `pdf-annotate.js` currently has zero imports and
zero existing use of `ic(`. Because a classic script's top-level function
declarations become real `window` properties automatically, `window.ic` is
reachable, and this exact pattern is already established in three other ES
modules (`form-fields.js`, `router.js`, `dashboard/resources.js`), all using
the same guard:

```js
const trashIcon = typeof window.ic === 'function' ? window.ic('trash', 14) : '';
```

`pdf-annotate.js` must use the identical guarded form, with a plain-text or
empty fallback if `window.ic` is ever unavailable (e.g. a future load-order
change) rather than assuming it always exists.

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

**Correction (code review, 2026-09-16): forced-colors was an acceptance
criterion with no test or manual step behind it.** The Acceptance criteria
below state "Light, dark, and forced-colors modes retain visible borders and
focus states," but neither the ten steps above nor the Verification gate
exercised `forced-colors: active` at all — an unverifiable promise. Add:

11. With the browser/OS forced-colors mode active (Chromium:
    `page.emulateMedia({ forcedColors: 'active' })`), repeat step 3 and
    assert the toolbar and its two controls still have a visible border or
    outline via computed style, not just that they render without throwing.

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

**This is not one filing type's bug, and it is bigger than first inventoried
here.** `computeNavChecks()` in `legacy-app.js` hand-writes a presence-only
nav-check per filing type, entirely independent of each feature's own
validator, for every filing type except Guardian Inventory (whose branch
derives its checks directly from `validate()`'s real errors, mapped to
section keys via `errorRoute()` — architecturally immune to this class of
drift by construction; confirmed by reading that branch, not assumed).

**Correction (code review, 2026-09-16): the first version of this section
said "ten confirmed sites." An independent, line-by-line recount of every
`checkDateOrder()` call across the other 7 filing types found 23, not 10 —
8 Cover-level pairs and 15 signature/certification pairs — and the first
version's signature/certification table silently dropped five of the
fifteen.** The full inventory, corrected:

**Cover: Reporting Period From must be strictly before Reporting Period To
(`allowSameDay:false`), and (where the field exists) GID must be on or before
Reporting Period From (`allowSameDay:true`) — 8 calls, all with an existing
presence-tracking nav-check key to extend:**

| Filing type | Nav-check key | Validator call |
| --- | --- | --- |
| Annual/Final/Trust | `a-p1` | `annual-accounting/index.js:1411` (periodFrom/periodTo), `:1415` (gid/periodFrom) |
| Simplified Accounting | `s-cover`, `s-p3` (duplicated) | `simplified-accounting/index.js:667`, `:671` |
| Plan Simplified | `ps-cover` | `plan-simplified/index.js:350` (no `gid` field in this filing type) |
| Plan Annual | `pa-cover` | `plan-annual/index.js:668`, `:672` |
| Plan Minor | `pm-cover` | `plan-minor/index.js:446` (no `gid` field in this filing type) |

**Signature/certification date must be on or after Reporting Period To
(`allowSameDay:true` at every site) — 15 calls. Ten have an existing
presence-tracking nav-check key to extend; five have no nav-check key at all
for that specific field, so ordering cannot be attached without first adding
presence-tracking that does not exist today:**

| Filing type | Nav-check key | Role | Validator call | Has a key to extend? |
| --- | --- | --- | --- | --- |
| Annual/Final/Trust | `a-p3` | Guardian | `annual-accounting/index.js:1439` | Yes |
| Annual/Final/Trust | `a-p4` | Preparer | `annual-accounting/index.js:1459` | Yes |
| Annual/Final/Trust | `a-p5` | Attorney | `annual-accounting/index.js:1480` | Yes |
| Annual/Final/Trust | `a-p10` | Certificate of Service | `annual-accounting/index.js:1487` | Yes |
| Simplified Accounting | `s-p4` | Guardian | `simplified-accounting/index.js:704` | Yes |
| Simplified Accounting | — | Attorney | `simplified-accounting/index.js:713` | **No — `s-p5` exists but tracks only bar/phone/street/cityStateZip, never `attorney_signatureDate`** |
| Simplified Accounting | `s-p6` | Certificate of Service | `simplified-accounting/index.js:729` | Yes |
| Plan Simplified | `ps-p3` | Guardian | `plan-simplified/index.js:392` | Yes |
| Plan Simplified | — | Preparer | `plan-simplified/index.js:396` | **No — no `ps-` key exists for the preparer role at all** |
| Plan Simplified | — | Attorney | `plan-simplified/index.js:400` | **No — no `ps-` key exists for the attorney role at all** |
| Plan Annual | `pa-p11` | Guardian | `plan-annual/index.js:756` — **the reported defect** | Yes |
| Plan Annual | — | Attorney | `plan-annual/index.js:760` | **No — no `pa-` key exists for the attorney role at all** |
| Plan Minor | `pm-p6` | Guardian | `plan-minor/index.js:493` | Yes |
| Plan Minor | — | Preparer | `plan-minor/index.js:524` | **No — `pm-p7` tracks `preparer_name` presence but never `preparer_signatureDate`** |
| Plan Minor | `pm-p7` | Attorney | `plan-minor/index.js:528` | Yes |

8 + 15 = 23 total `checkDateOrder()` calls across these 5 filing types,
confirmed by grep against `src/features/*/index.js`, excluding
`guardian-inventory/index.js`'s one call (`bondPeriodFrom`/`bondPeriodTo`,
a different relationship on a validator-driven nav-check already immune to
this bug class) and the function's own definition in `date-rules.js`.

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

**Correction (code review, 2026-09-16): the proposed test location cannot
run the code under test.** The first version of this section proposed
extending `checklist-export-parity.spec.js` with a runtime fixture ("build a
fixture where the tracked field is present but out of order, assert the
nav-check now reports incomplete"). That spec never executes
`computeNavChecks()` — it slices the function's source into a string and
regexes over the text (`sliceFunction`/`modelFields`, confirmed by reading
the file); there is no mechanism there to evaluate the function against a
real data fixture and read back a boolean. `computeNavChecks()` also
references dozens of other globals (`D`, `activeInventoryType`, `PLAN_RIGHTS`,
`annualReconcileState`, `errorRoute`, `validate`, and more), so a standalone
extraction-and-`new Function()` harness (the technique
`tests/unit/support/legacy-source-extract.js` uses for small, self-contained
functions) would need to stub all of them to be safe, which is not a small
undertaking. `tests/e2e/navigation-status.contract.spec.ts` already calls
`w.computeNavChecks()` for real, inside the actual browser, at multiple
points (confirmed: `navComplete: w.computeNavChecks().checks['pa-p5']` and
five further calls) — that is the real, already-used venue for a runtime
parity assertion, and is where 55B's regression belongs instead.

### Scope

55B will:

1. add one date-order-aware helper inside `computeNavChecks()`, matching
   `checkDateOrder()`'s own tolerant semantics (either side blank → no
   ordering failure, since a missing-field problem is the presence check's
   job, not this one's);
2. apply it alongside the *existing* presence check at each of the **ten**
   sites in the tables above marked "Yes" (five Cover-level pairs, five
   signature/cert pairs), using the exact `allowSameDay` value the real
   validator uses at that site;
3. add a runtime regression to `tests/e2e/navigation-status.contract.spec.ts`
   (see "Why `checklist-export-parity.spec.js` did not already catch this"
   above) that would have caught the reported defect: a fixture where the
   tracked field is present but out of order, asserting
   `computeNavChecks()`'s corresponding key is now `false` through the real
   browser;
4. update `TEST-INDEX.md` for the extended spec.

55B will not:

1. add nav-check presence-tracking for the **five** sites in the second
   table above marked "No" — Simplified Accounting's attorney, Plan
   Simplified's preparer and attorney, Plan Annual's attorney, and Plan
   Minor's preparer. Each would need a brand-new tracked field added to its
   filing type's nav-check branch before any ordering rule could even attach
   to it — a missing-field gap, not a misapplied-rule gap, and a different,
   larger piece of work than extending an existing check. Leaving these five
   unresolved does mean the same green-sidebar/export-blocker discrepancy
   this document reports for Plan Annual's guardian date persists,
   unaddressed, for these five roles — stated plainly rather than implied by
   omission, which is exactly the error the first version of this section
   made;
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

**If Alan wants the five gaps in "will not" #1 closed too**, that is a
larger version of this same sub-delivery (add the missing nav-check keys,
then apply ordering the same way) rather than a different one — worth an
explicit decision before starting, since it roughly doubles the file/branch
surface touched and needs its own presence-tracking design per role, not
just a call to the ordering helper.

### Files in scope

| File | Planned change |
| --- | --- |
| `src/legacy-app.js` | Add the shared date-order helper inside `computeNavChecks()`; apply it at the ten sites marked "Yes" above, in their respective filing-type branches. |
| `tests/e2e/navigation-status.contract.spec.ts` | Add the out-of-order-but-present runtime regression fixture and assertion described above. |
| `TEST-INDEX.md` | Extend the existing `navigation-status.contract.spec.ts` row to record the new date-order regression scope. |

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

Add to `tests/e2e/navigation-status.contract.spec.ts`, alongside its existing
`w.computeNavChecks()` calls:

1. For at least Plan Annual (the reported case) and one Cover-level pair
   (e.g. Annual's `periodFrom`/`periodTo`): build a fixture, through the real
   UI, where the tracked field is present but chronologically out of order.
2. Assert the real validator reports the issue (already true; this pins it).
3. Assert `w.computeNavChecks().checks['<key>']` for the affected key is now
   also `false` — red before the fix, green after, per this repo's red-first
   convention.

A static complement in `checklist-export-parity.spec.js` may still be worth
adding (e.g. asserting the new `datesOrdered(...)` calls are textually
present in each affected branch), but it cannot substitute for the runtime
assertion above — name it as a complement, not the regression, if added.

### Verification gate

```text
npx playwright test tests/e2e/navigation-status.contract.spec.ts tests/e2e/routes.spec.ts
npx vitest run tests/unit/checklist-export-parity.spec.js tests/unit/plan-annual-parity.spec.js tests/unit/plan-initial-parity.spec.js tests/unit/plan-minor-parity.spec.js tests/unit/plan-simplified-parity.spec.js
```

`computeNavChecks()` is shared, hand-maintained, load-bearing logic touched by
5 of 9 filing-type branches in one file — recommend a full `npm test` before
commit per `AGENTS.md` §1's "broad, cross-cutting, touches shared/core
modules" criterion, and ask before running it.

### Acceptance criteria

- Every one of the ten sites marked "Yes" above: presenting the tracked
  date(s) out of order flips that section's sidebar marker from green to
  red, matching the real validator's own judgment.
- A filing with every date in valid order is unaffected — no new false
  negatives introduced (the reported filing's other ten sections must not
  turn red).
- Guardian Inventory, Plan Initial, and every field not named above are
  bit-for-bit unaffected.
- The five sites marked "No" above remain exactly as broken as they are
  today — not worse, not silently fixed as an unverified side effect.
- `checklist-export-parity.spec.js`'s existing `KNOWN_GAPS` assertions are
  unaffected — this fix does not remove or add any field-name-level gap.
- New regression is red against pre-fix `computeNavChecks()`, green after.

### Risk and rollback

Risk is **medium** — the change is small and mechanical, but
`computeNavChecks()` gates the Next-button and sidebar dot for the 5 filing
types this sub-delivery touches, from one function, so a typo in one
branch's condition risks that branch alone, not the others (each `checks`
object is independent), but is still worth the full-suite gate above rather
than the lite default.

Rollback is limited to the `datesOrdered()` helper and its ten call sites in
`legacy-app.js`, plus the new test assertions. No data model or persisted
shape change; no migration.

### Cross-cutting ramifications (`AGENTS.md` §8)

1. **Data Model:** None.
2. **Legacy Data Migration:** None — this reads existing fields already
   present in every `.sav` file; no new field, no reshape.
3. **Test Coverage & Index:** New runtime regression in
   `tests/e2e/navigation-status.contract.spec.ts`; update `TEST-INDEX.md` in
   the same commit.
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

No logical dependency on 55A or 55C. **File-level overlap with 55D, not a
priority ordering**: both this sub-delivery and 55D touch
`legacy-app.js`/`computeNavChecks()` and `TEST-INDEX.md`, and 55D's scope (if
Option A there proceeds) adds its own nav-check keys to some of the same
filing-type branches this sub-delivery edits. Land one fully before starting
the other, or coordinate at the branch level within `computeNavChecks()` if
both are approved close together — per `AGENTS.md` §1, check `git log`/`git
diff` for real overlap at the time work starts rather than assuming this
document's snapshot still holds. `legacy-app.js` is also a large,
frequently-edited shared file independent of 55D — sync with `master` and
re-check before starting regardless.

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
2. **replace** the now-meaningless long-typed-name regression in
   `tests/e2e/signature-capture.contract.spec.ts` with a new contract test
   for the trimmed widget (see Required regression test below) — not a bare
   deletion;
3. confirm no other test or code path references `data-sig-tab="type"`,
   `data-sig-panel="type"`, `#sig-pad-typed-name`, or `renderTypedPreview`
   before removal, and again after, as the actual gate that the removal is
   total;
4. add a `TEST-INDEX.md` row description of the new contract test (see
   correction below — nothing currently needs removing from that row).

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
| `tests/e2e/signature-capture.contract.spec.ts` | Replace the long-typed-name regression test (`:126-172`) and its Milestone 50F comment block with the new contract test described below. |
| `TEST-INDEX.md` | Add a description of the new contract test to the existing `signature-capture.contract.spec.ts` row (see correction below). |

No CSS removal is required as part of this scope: `src/styles/forms.css`'s
`.signature-pad-*` selectors are shared structurally by all three tabs/panels
(tabs, canvas, actions, footer, error) with nothing Type-specific to prune;
confirm this holds during implementation rather than assuming it from this
document.

### Required regression test

**Correction (code review, 2026-09-16): "no new regression is needed for a
removal" was the wrong standard.** A pure negative-space grep proves the code
is gone; it does not prove the widget still behaves correctly afterward, and
it is the only thing left once the one existing Type-tab test is deleted
rather than replaced. Add a real contract test to
`tests/e2e/signature-capture.contract.spec.ts`, replacing the deleted one, in
at least one role/filing type:

1. Open the Signature Stamp capture widget and assert exactly two elements
   match `[data-sig-tab]` (Draw, Upload) and none matches
   `[data-sig-tab="type"]`.
2. Assert no element matches `[data-sig-panel="type"]` or
   `#sig-pad-typed-name` anywhere in the DOM.
3. Assert the Draw tab is selected by default (`aria-selected="true"` on
   `[data-sig-tab="draw"]`, its panel not `hidden`).
4. Draw a signature and apply it; assert `signatureImage` is set (the
   existing Draw-path assertion pattern this spec already uses elsewhere).
5. Switch to Upload, upload a valid PNG, and apply it; assert
   `signatureImage` updates (the existing Upload-path assertion pattern this
   spec already uses elsewhere).

Steps 4–5 are not new capability tests — Draw and Upload are already covered
elsewhere in this spec — but re-asserting them here in the same test as
steps 1–3 is what proves the *trimmed* widget, not just its markup, still
works end to end.

The negative-space grep from the first version of this section is still
useful as a source-level complement, not a replacement:

`grep -rn "data-sig-tab=\"type\"\|data-sig-panel=\"type\"\|sig-pad-typed-name\|renderTypedPreview" src/ tests/` returns nothing after the change.

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
- The new contract test (not a deletion) replaces the removed Type-tab
  regression, and `TEST-INDEX.md`'s `signature-capture.contract.spec.ts` row
  describes it.

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
3. **Test Coverage & Index:** Replace the Type-tab regression in
   `signature-capture.contract.spec.ts` with the new contract test above;
   its current `TEST-INDEX.md` row does not mention Type-tab coverage today
   (checked directly — it describes the 39-B/39-C tri-state rollout and the
   Upload background-transparency fix, nothing about Draw/Type/Upload
   specifically), so this is an addition to that row, not a correction of
   one.
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

**Correction (code review, 2026-09-16): this section's original diagnosis had
three confirmed factual errors, one of which is a data-governance violation
serious enough to have blocked approval on its own.** Each is verified
directly against the repository below, not asserted from the earlier
write-up.

**Error 1 — the data-model claim was false.** The original text stated
"`attorney_email` already exists in all six filing types' data model." Direct
check of `probate-guardian-data-model.csv`: `attorney_email`/`attorney.email`
is documented for exactly **two** filing types —
`guardian_inventory` (CSV row 287, `attorney.email`) and `plan_minor` (row
554, `attorney_email`). It has **no row at all** for `annual`, `simplified`,
`plan_annual`, or `plan_initial` — the four engines this sub-delivery
proposed changing. Per `AGENTS.md` §3 (Data Model & Schema Governance), the
CSV is the canonical source of truth; adding requiredness to a field
necessarily changes its documented contract and requires a corresponding CSV
row and a clean `npm run verify:data-model` run, neither of which this
document previously scoped.

**Error 2 — the four affected blank-data factories were never checked.**
None of `emptyDataAnnual()`, `emptyDataSimplified()`, `emptyDataPlanAnnual()`,
or `emptyDataPlanInitial()` (all in `src/core/state.js`) initializes
`attorney_email` — confirmed by reading each factory in full. Each does
initialize `attorney_bar`/`attorney_barNumber`, `attorney_phone`,
`attorney_street`, `attorney_cityStateZip`, and the signature-state fields
for the attorney card, but not email. A brand-new ward of any of these four
types has `d.attorney_email === undefined` until a filer types into the
field — which works today by accident of JavaScript's loose typing, not by
design, and would need to be corrected as part of formalizing this field.

**Error 3 — "not required in any of the nine filing types" was false, and
the real picture is four different policies, not one.** Direct check of each
validator:

| Filing type | Attorney card's actual current policy | Source |
| --- | --- | --- |
| Annual/Final/Trust | Bar Number, Phone, Street, City/State/Zip are **unconditionally required** — no gate at all. Attorney name is never required. | `annual-accounting/index.js:1463-1466` |
| Simplified Accounting | Attorney name is **unconditionally required** at Cover; Bar Number, Phone, Street, City/State/Zip are **unconditionally required** at Part V — no gate. | `simplified-accounting/index.js:663` (name), `:709-712` (contact fields) |
| Plan Annual | **Nothing on the attorney card is required, ever**, regardless of whether a name is present or what signature state is chosen — the only sub-delivery where the original "never any requiredness" description is actually accurate. | `plan-annual/index.js`'s own comment at the attorney block |
| Plan Initial | An **"attorney information started" predicate**: `if(d.attorney_name||d.attorney_bar||d.attorney_signatureDate||(d.attorney_signatureState&&d.attorney_signatureState!=='none'))` — only once any one of those is present does attorney name become required and does `checkSignatureState()` run. Explicitly documented as protecting a legal exemption: "pro se filers and Guardian Advocates (Ch. 393, exempt from attorney representation under Fla. Prob. R. 5.030) must be able to export without an attorney." | `plan-initial/index.js:675-694` |

So the actual gap this sub-delivery reports — Primary Email carrying a
required asterisk that nothing enforces — is real and confirmed in all four
engines (below), but the claim that surrounded it ("nothing about the
attorney card is required anywhere") was true for only one of the four, and
a naive uniform fix built on that false premise would have been wrong for
the other three:

- In **Annual** and **Simplified**, gating `attorney_email` behind
  `has(d.attorney)` while its sibling fields (bar, phone, street,
  city/state/zip) stay unconditionally required in the same block would
  introduce a *new*, unexplained inconsistency — one field on the card
  optional-until-named, four others always required.
- In **Plan Initial**, a bare `has(d.attorney)` gate is not equivalent to the
  existing "started" predicate: `attorney_bar` alone (no name) already
  triggers "started" under the real predicate, so an email requirement
  keyed on a different condition than the one already gating the rest of
  the card would drift the moment either changes, and any implementation
  must ensure it does not accidentally narrow the documented pro se/Guardian
  Advocate exemption.
- Only **Plan Annual** matches the original "gate on `has(d.attorney)`"
  framing cleanly, precisely because it is the one engine with no other
  requiredness on the card to be inconsistent with.

The asterisk-only fields, confirmed unchanged from the original diagnosis:
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
requiredness check) on `attorney_email` specifically — confirmed by grep
across all four files, zero matches for that field, even where sibling
fields are unconditionally required. Two other filing types with the same
field, Plan Simplified and Plan Minor, render it *without* the required flag
(`plan-simplified/index.js:323`, `plan-minor/index.js:422`) — internally
consistent with their own equally unenforced validators.

### Decision needed from Alan

Given the four genuinely different per-engine policies above, this is not a
single yes/no. **This document does not recommend Option A as a default any
longer** — the original recommendation rested on the now-corrected premise
that a single `has(d.attorney)` rule would be a small, uniform, low-risk
change; it is not, and Plan Initial's documented legal exemption raises the
stakes of getting the gating condition exactly right past what a proposal
document should decide alone.

| Option | Effect |
| --- | --- |
| **A — Enforce the asterisk, per-engine** | Add CSV rows for `attorney_email` in `annual`, `simplified`, `plan_annual`, `plan_initial`; initialize it in all four blank-data factories; require it in each engine using **that engine's own existing gating shape** (unconditional in Annual/Simplified, matching their sibling fields; `has(d.attorney)`-equivalent in Plan Annual, the one engine where that framing is actually clean; the exact existing "started" predicate in Plan Initial, not a different condition). Requires `npm run verify:data-model` clean and per-engine tests, not one shared fixture. |
| **B — Remove the asterisk instead** | Drop `required: true` from the four `inpS('attorney_email', ...)` calls, matching Plan Simplified/Plan Minor's existing, internally-consistent treatment. No CSV, factory, or validator change needed. Smaller and lower-risk than Option A, at the cost of making Primary Email look less encouraged than Bar Number/Phone/Street/City-State-Zip in Annual and Simplified, where those ARE required and email alone would remain visibly optional. |
| **C — Expand to the full card** | Make bar/phone/street/city-state-zip also conditionally required once an attorney is named, in Plan Annual and Plan Initial specifically (Annual and Simplified already require them). A larger behavior and policy change than either A or B, and the most direct answer to "should naming an attorney obligate the rest of the card" — named, not sized here. |

### Scope (pending Alan's choice of option)

55D will, once an option is confirmed:

1. if Option A: add the missing CSV rows (`annual`, `simplified`,
   `plan_annual`, `plan_initial`), run `npm run verify:data-model` clean,
   initialize `attorney_email` in all four blank-data factories in
   `src/core/state.js`, and add the requiredness rule to each of the four
   validators **in that engine's own existing gating shape**, per the table
   above — not one shared `has(d.attorney)` call reused four times;
2. if Option A: add the matching presence key to each affected filing type's
   `computeNavChecks()` branch, gated identically to its validator, so the
   sidebar agrees with the newly-real requirement rather than reopening the
   exact class of gap 55B addresses;
3. if Option B: drop the four `required: true` flags — no CSV, factory, or
   validator work;
4. either way: add or extend regression coverage for the four affected
   engines specifically (not just Plan Annual and Plan Initial, which is
   what the original version of this section actually tested) — Annual and
   Simplified need their own fixtures given their unconditional-requirement
   shape differs from Plan Annual/Plan Initial's conditional one.

55D will not, regardless of which option is chosen:

1. resolve Option C unless it is the one explicitly selected;
2. touch Plan Simplified or Plan Minor, which are already internally
   consistent and out of scope for this specific mismatch;
3. change any other attorney field's requiredness under Option A or B — that
   is exactly Option C;
4. narrow Plan Initial's documented pro se/Guardian Advocate exemption as a
   side effect of whatever gating condition is chosen — the exemption's
   existing "started" predicate is the one this sub-delivery must match,
   not redesign.

### Files in scope (Option A; Option B touches only the four `inpS(...)` call sites)

| File | Planned change (Option A) |
| --- | --- |
| `probate-guardian-data-model.csv` | Add `attorney_email` rows for `annual`, `simplified`, `plan_annual`, `plan_initial`. |
| `src/core/state.js` | Initialize `attorney_email:''` in `emptyDataAnnual()`, `emptyDataSimplified()`, `emptyDataPlanAnnual()`, `emptyDataPlanInitial()`. |
| `src/features/annual-accounting/index.js` | Add **unconditional** `req(d.attorney_email, ...)`, alongside its existing unconditional bar/phone/street/cityStateZip requirements. |
| `src/features/simplified-accounting/index.js` | Add **unconditional** `req(d.attorney_email, ...)`, alongside its existing unconditional requirements. |
| `src/features/plan-annual/index.js` | Add `req(d.attorney_email, ...)` gated on `has(d.attorney)` — the one engine where this framing is clean. |
| `src/features/plan-initial/index.js` | Add the email requirement **inside the existing "started" `if` block** (`:685`), using the same condition already gating attorney name and signature state — not a new, separately-evaluated condition. |
| `src/legacy-app.js` | Add the matching, identically-gated presence key to each of the four filing types' `computeNavChecks()` branches. |
| `tests/unit/checklist-export-parity.spec.js` or per-type parity specs | New regression fixtures per engine; update `KNOWN_GAPS` if `attorney_email` was already listed for any of the four (check fresh at implementation time). |
| `TEST-INDEX.md` | Update affected rows. |

### Required regression test

1. **Annual and Simplified** (unconditional shape): a fixture with
   `d.attorney_email` blank and every other attorney field filled: confirm
   the real validator now blocks on email specifically, red before the fix,
   green after — proving the new rule, not just that the existing
   unconditional bar/phone/street/cityStateZip rules still work.
2. **Plan Annual** (conditional-on-name shape): a fixture with `d.attorney`
   set and `d.attorney_email` blank: confirm the validator now blocks; a
   fixture with `d.attorney` blank entirely: confirm no email requirement is
   introduced.
3. **Plan Initial** (matches the "started" predicate): a fixture where only
   `d.attorney_bar` is set (name blank, matching the predicate's own
   already-tested "started via bar number alone" case) and email blank:
   confirm the requirement fires; a fixture with the whole card blank:
   confirm the pro se/Guardian Advocate exemption still exports cleanly,
   unchanged.
4. Plan Simplified and Plan Minor: confirm both remain completely
   unaffected by any of the above.
5. Sidebar parity: each newly-added nav-check key agrees with its engine's
   validator for every fixture above.
6. `npm run verify:data-model` passes clean against the new CSV rows.

### Verification gate

```text
npm run verify:data-model
npx vitest run tests/unit/checklist-export-parity.spec.js tests/unit/plan-annual-parity.spec.js tests/unit/plan-initial-parity.spec.js
npx playwright test tests/e2e/routes.spec.ts
```

Recommend a full `npm test` before commit given this changes real export
behavior for four different engines in four different ways (a filing that
exports cleanly today may not once this lands) — per `AGENTS.md` §1, ask
before running it.

### Acceptance criteria

- A named attorney with no Primary Email now blocks export in all four
  affected filing types, using each engine's own existing gating shape, with
  a sidebar marker that agrees.
- A filing with no attorney named at all is completely unaffected in Plan
  Annual and Plan Initial (the two conditional engines); Annual and
  Simplified's existing unconditional requirements are unaffected in shape,
  only extended to cover email too.
- Plan Initial's pro se/Guardian Advocate exemption still exports cleanly
  with the entire attorney card blank — explicitly tested, not assumed.
- Plan Simplified and Plan Minor are untouched.
- `npm run verify:data-model` passes; no new gap or false parity-pass is
  introduced in `checklist-export-parity.spec.js`.

### Risk and rollback

Risk is **medium**, raised from the original "low–medium" now that the real
scope is known: this sub-delivery changes real export-blocking behavior for
existing filings across four different engines with four different gating
shapes, touches the data-model CSV (governance-gated per `AGENTS.md` §3),
and touches four blank-data factories. State the behavior change plainly in
the commit message, per this repo's convention for changes buried in what
could look like a pure bugfix.

Rollback is limited to the CSV rows, the four factory initializations, the
four `req()` additions (in three different shapes), the four nav-check
additions, and the new test fixtures — more moving parts than the original
version of this section implied, but still fully self-contained to this
sub-delivery.

### Cross-cutting ramifications (`AGENTS.md` §8)

1. **Data Model:** **Not N/A — directly implicated**, corrected from the
   original "None." `attorney_email` needs a new CSV row in four filing
   types it is not currently documented for at all; `npm run verify:data-model`
   must pass clean before this lands, per `AGENTS.md` §3.
2. **Legacy Data Migration:** Two real, distinct concerns, not one: (a) an
   existing `.sav` file with a named attorney and no email, valid under
   today's rules, becomes an incomplete filing under Option A — no data
   changes, the filer's next Preview & Export simply now reports it; (b) a
   ward created **before** the four factories are updated has
   `attorney_email === undefined` rather than `''` — confirm this reads
   identically to an empty string everywhere the new `req()`/nav-check calls
   touch it (JavaScript's own looseness likely makes this a non-issue, but
   it must be checked, not assumed, given `AGENTS.md` §3's explicit-tristate
   discipline for this exact class of field).
3. **Test Coverage & Index:** New per-engine fixtures per Verification
   above — the original version's single shared fixture undertested this;
   update `TEST-INDEX.md` in the same commit.
4. **Export/Import/Portability:** Directly implicated — this changes which
   filings the real export gate accepts, differently in four engines. See
   risk note above.
5. **Security & Sensitivity:** None.
6. **UI/UX Consistency:** Resolves an existing inconsistency (asterisk
   promises a rule that isn't enforced) rather than introducing one, but
   only if each engine's fix matches its own existing pattern — an
   inconsistent implementation (e.g. gating Annual's email while its bar/
   phone/street/cityStateZip stay unconditional) would trade one
   inconsistency for another.
7. **Legal/Compliance Framing:** Directly implicated, more than the original
   version of this section reflected. An attorney of record's contact email
   supports e-filing service and correspondence, defensible grounds for
   requiring it once an attorney is meaningfully included — but Plan
   Initial's attorney-card gate exists specifically to protect a documented
   statutory exemption (pro se filers and Ch. 393 Guardian Advocates under
   Fla. Prob. R. 5.030). Any implementation must be verified, not assumed,
   to leave that exemption's export path exactly as unblocked as it is
   today. This judgment, and Option C's broader version of it, belongs to
   Alan, with the added weight this correction surfaces.

### Dependency and sequencing

No logical dependency on 55A or 55C. **File-level overlap with 55B, not a
priority ordering** — see 55B's own "Dependency and sequencing" for the
shared-file detail; the same coordination applies here in reverse. Land one
of 55B/55D fully before starting the other, or coordinate at the
`computeNavChecks()` branch level if both are approved close together.

