# Milestone 55: Preview, Signature, and Validation Parity Fixes — Scoping & Execution Proposal

## Status

**Landed in full, 2026-09-16–17.** Alan approved each sub-delivery
individually, per `AGENTS.md` §2's per-sub-delivery gating — this was never
approved or executed as one unit. All four are on `master`:

| Sub-delivery | Commit(s) | Verification |
| --- | --- | --- |
| 55A — Contain and style the PDF.js FreeText editor toolbar | `d029ceb` | Probe-verified both directions (decorator disabled → red on accessible-name assertions; toolbar flex layout disabled → red on containment); `tests/e2e/pdf-annotate.spec.ts` 19/19; unit 914/914; vite build clean |
| 55B — Sidebar agrees with the export validator's date-order rules | `ea41521` | Red-first (6 of 7 new tests failed exactly as expected — the reported Plan Annual case and both Borrowed-key cases among them — restored to green); `navigation-status.contract.spec.ts` 67/67; the 4 affected parity specs + `checklist-export-parity.spec.js` 144/144 combined; `routes.spec.ts` 23/23 |
| 55C — Remove the Signature Stamp widget's "Type" tab, globally | `70e2e28` | Red-first (2 new tests failed exactly as expected — 3 tabs found instead of 2 — restored to green); `signature-capture.contract.spec.ts` + `signature-stamp-reuse.spec.ts` 40/40; `tests/unit/signature-capture.spec.js` 27/27; unit 914/914; vite build clean; grep for every Type-tab identifier across `src/` and `tests/` returns nothing |
| 55D — Enforce `attorney_email` exactly where the UI already required it | `d6b8914`, `c103b06` | Red-first (5 of 8 new e2e tests failed exactly as expected, restored to green); `navigation-status.contract.spec.ts` 75/75, `routes.spec.ts` 23/23; `verify:data-model` clean (918 rows); unit 914/914. Follow-up commit `c103b06` fixed two attorney_email fixture gaps the full e2e run surfaced immediately after 55D landed (all 8 affected spec files + `signature-capture.contract.spec.ts` 132/132 afterward) |

**Closing regression.** No single full-suite run was recorded immediately
after 55D landed — each sub-delivery's own targeted verification is in the
table above. The first full-suite close covering all of Milestone 55's
changes came from Milestone 56's own execution (see `MS-56-findings.md`):
unit **935/935**, e2e **599 passed, 6 skipped, 0 failed**. (That document
also records that the first attempt at that run silently misreported a real
failure — unrelated to Milestone 55's own changes — by piping Playwright's
output through `tail`, discarding its exit code; corrected before the number
above was accepted.)

The original Draft text is kept below as the historical proposal. Per
`AGENTS.md` §2 it was a proposal only until the approvals above; nothing in
it should be read as authorizing anything further.

**Original status (historical):** Draft — not an authorization to implement.
Per `AGENTS.md` §2, this document is a proposal only. Nothing below should be
started until Alan explicitly approves a named sub-delivery by name. Approval
of one sub-delivery authorizes only that one; every other sub-delivery,
including ones listed after it here, requires its own explicit approval.

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
| 1 | **55A** | FreeText note color picker and delete control render as artifacts over the visible PDF | **Alan chose FreeText-only, 2026-09-16 — approvable as scoped.** | Low–medium |
| 2 | **55B** | Sidebar/nav-check section markers show green while the real export validator still blocks on a date-order rule they never apply | Corrected (round 2) — all 23 validator relationships (25 `datesOrdered()` additions) now in scope, none deferred; two attachments are a named, deliberate labeling trade-off (see section), not a technical limitation; approvable as scoped | Medium |
| 3 | **55C** | Signature Stamp capture widget's "Type" tab — global removal | Corrected — regression replaced rather than deleted; test-count wording aligned with acceptance criteria (one Plan, one Accounting type); approvable as scoped | Low |
| 4 | **55D** | Attorney "Primary Email (e-filing)" renders a required asterisk that no validator enforces, in four filing types | **Alan chose Option A (enforce it, per-engine), 2026-09-16 — approvable as scoped.** | Medium |

"Order reported" is the sequence these were raised in this session, kept for
traceability. It is not an execution order and not a priority ranking; treat
each row as independently approvable once its own status above says so.

**Correction record, round 1 (2026-09-16):** an independent code review
found 55B and 55D contained real, confirmed factual errors serious enough to
block approval, and 55A and 55C needed tightening. Every specific, checkable
claim was independently re-verified against the source before being
accepted, and held up. Both problem sub-deliveries were rewritten in place.

**Correction record, round 2 (2026-09-16, same day):** a second independent
review found the round-1 rewrite of 55B and 55D still contained real errors
— round 1 corrected the wrong things, not everything. 55B's "10 of 23,
5 deferred as technically unattachable" was itself wrong: the deferred five
*can* attach to an existing key, because the proposed `datesOrdered()` helper
already tolerates a blank date exactly like `checkDateOrder()` does — a
premise this document had itself written down in round 1 without applying
its consequence. 55D's Plan Annual policy table still claimed "nothing is
ever required regardless of signature state," when the same validator file
this document had already cited elsewhere conditionally requires the
attorney's name once a signature method other than Unsigned is chosen. Both
are corrected again, in place, below — every claim in round 2's review was
also independently re-verified before being accepted, not assumed correct
because it came from a second pass. Smaller wording fixes to 55A and 55C
from the same review are applied as well.

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

### Decision: FreeText-only — resolved by Alan, 2026-09-16

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
| **A — Narrow 55A to FreeText only (chosen)** | Scope, implementation, and regression below all apply to `.basicColorPicker`/FreeText's toolbar only, matching the actual reported defect. Highlight's toolbar is out of scope and named as a candidate follow-up, not assumed fine. |
| **B — Cover both editors (not chosen)** | Requires inventorying `ColorPicker`'s `.colorPicker` swatch-dropdown structure and keyboard behavior (not done in this document), role-specific accessible labels (a Highlight control is not a "note"), and its own regression test with its own red/green evidence. Materially larger than what is designed below. |

**Alan selected Option A, FreeText-only, 2026-09-16.** The rest of this
section is written for FreeText only and is execution-ready on that basis;
Highlight's `ColorPicker` toolbar remains a separate, unscoped, not-yet
proposed follow-up if it is ever wanted.

**Option B landed 2026-09-18, on Alan's instruction ("Implement 55A option B
now").** Between the two dates a filer reported the Highlight artifact this
Decision had named as a risk — a selected highlight left dashes on the court
document and extended the page — which was fixed generically on
`.annotationEditorLayer .editToolbar` (commit `533c97c`) to contain every
editor type, without styling any of them. Option B is the appearance half:

- `src/styles/print.css` gained a `.highlightEditor`-scoped section, written
  to this subsection's own instruction that Option B needs equivalent
  editor-scoped rules for `ColorPicker`'s dropdown structure rather than a
  widened selector reusing FreeText's. It also defines
  `--editor-toolbar-vert-offset`, which `EditorToolbar.render()` reads as an
  inline style on any editor with a non-null `toolbarPosition` — Highlight
  has one, FreeText does not — and which was silently resolving to
  `top: auto`.
- `src/core/pdf/pdf-annotate.js` gained `decorateHighlightToolbar()`:
  "Highlight color" / "Delete highlight" plus per-swatch names, resolving
  this Decision's own point that reusing FreeText's "note" wording would
  mislabel a highlight control.
- `tests/e2e/highlight-toolbar-style.spec.ts` is Option B's own regression,
  with the red/green evidence this Decision required: the three Highlight
  cases failed before the change while the Add Note guard passed unchanged.

Still not done, and still not proposed: matching Highlight's keyboard
behaviour to the app's own dialog conventions (pdf.js's `ColorPicker` brings
its own arrow-key/Escape handling, which is left exactly as upstream wrote
it).

### Scope

55A will:

1. restore the minimal PDF.js toolbar layout and visibility contract for the
   **FreeText editor's toolbar only** (`.basicColorPicker`/`BasicColorPicker`) —
   per the Decision above; Highlight's separate `ColorPicker` dropdown is not
   inventoried or styled by this sub-delivery;
2. keep all new styling scoped beneath `.freeTextEditor` specifically, not
   the broader `.annotationEditorLayer` (see Implementation design §A for
   why that distinction is load-bearing, not stylistic);
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
| `src/styles/print.css` | Add the minimal, `.freeTextEditor`-scoped editor-toolbar layout, hidden-state, theme, focus, color-picker, divider, and button rules. Update the existing scoped-port comment so it no longer claims the active toolbar is intentionally absent. |
| `src/core/pdf/pdf-annotate.js` | Decorate dynamically created toolbar controls with stable accessible names and the existing `trash` SVG (with a visible text fallback, not an empty string, if `window.ic` is ever unavailable); own and disconnect any observer used to detect those controls. |
| `tests/e2e/pdf-annotate.spec.ts` | Add the toolbar visibility, containment, layout, accessibility, color-change, no-artifact, and forced-colors regression. |
| `TEST-INDEX.md` | Extend the existing `pdf-annotate.spec.ts` description to record 55A's toolbar regression scope. |

No new test file is expected. If implementation evidence shows that a separate
spec is clearer, creating one also requires a same-commit `TEST-INDEX.md` row.

### Implementation design

#### A. Restore the minimum toolbar CSS contract

Add only the active subset of the upstream toolbar behavior to
`src/styles/print.css`, expressed in repository styles rather than copying the
whole viewer theme:

**Correction (code review, round 2, 2026-09-16): `.annotationEditorLayer
.editToolbar` is not scoped to FreeText.** `EditorToolbar` (`lib/pdfjs/pdf.mjs`)
is one generic component every editor type instantiates for itself
(`this._editToolbar = new EditorToolbar(this); this.div.append(...)`) — the
`.editToolbar` class is shared, not FreeText-specific. What *is*
type-specific is each editor's own wrapper: `AnnotationEditor`'s base
constructor sets `div.className = this.name`, and `FreeTextEditor`/
`HighlightEditor` each declare their own `name` (`"freeTextEditor"`,
`"highlightEditor"`), confirmed directly in the vendored source. Given the
Decision above narrows this sub-delivery to FreeText only, every selector
below must be scoped under **`.freeTextEditor .editToolbar`**, not the
broader `.annotationEditorLayer .editToolbar` an earlier draft used — the
broader selector would also restyle Highlight's toolbar, undermining the
FreeText-only scope decision as an unintended side effect rather than
respecting it.

- define `--editor-toolbar-vert-offset`;
- position `.freeTextEditor .editToolbar` absolutely adjacent to its owning
  editor;
- make the toolbar a compact, fit-content container with an explicit normal UI
  font size so it cannot inherit the annotation layer's scaled `100px` base;
- add `.freeTextEditor .editToolbar.hidden { display: none; }`;
- render `.freeTextEditor .editToolbar .buttons` as a single horizontal flex
  row;
- size `.freeTextEditor .basicColorPicker` and `.freeTextEditor .deleteButton`
  explicitly;
- render `.freeTextEditor .divider` as a vertical separator rather than a
  block-flow break;
- provide visible hover and `:focus-visible` states;
- support `forced-colors: active`;
- use `--surface-*`, `--ink-*`, and `--line` tokens for application chrome.

Selectors must remain under `.freeTextEditor`; generic selectors such as
`.hidden`, `.buttons`, `.divider`, `input[type="color"]`, `.editToolbar`
alone, or `.deleteButton` must not be added globally or under the broader
`.annotationEditorLayer`. If Option B (FreeText+Highlight) is chosen instead,
this whole subsection needs a second pass adding the equivalent
`.highlightEditor`-scoped rules for `ColorPicker`'s dropdown structure, not
a widened selector reusing these same rules.

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
const trashIcon = typeof window.ic === 'function' ? window.ic('trash', 14) : 'Delete';
```

**Correction (code review, round 2, 2026-09-16): the fallback must not be
empty.** An earlier draft's fallback was `''` — if `window.ic` were ever
unavailable (a future load-order change, for instance), the delete button
would render with **no visible content at all**, exactly reproducing the
"short blank mark" this entire sub-delivery exists to fix, just from a
different cause. The fallback must be a visible text label (`'Delete'`, or
similar), never empty, so the button always has *some* rendered content
regardless of `window.ic`'s availability.

**Correction (code review, round 3, 2026-09-16): "or empty" directly
contradicted the paragraph immediately above it.** `pdf-annotate.js` must use
the identical guarded form, with a plain-text fallback (never empty) if
`window.ic` is ever unavailable (e.g. a future load-order change) rather than
assuming it always exists.

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

**Correction (code review, round 1, 2026-09-16): the first version of this
section said "ten confirmed sites." A recount of every `checkDateOrder()`
call across the other 7 filing types found 23, and the signature/
certification table silently dropped five of them.**

**Correction (code review, round 2, 2026-09-16): the round-1 correction was
itself still wrong about those five.** It concluded ordering "cannot be
attached without first adding presence-tracking that does not exist today"
and scoped this sub-delivery to fixing only 10 of the 23. That conclusion
does not survive rereading `datesOrdered()`'s own definition (Implementation
design, below): `!earlier||!later||...` returns `true` — "no ordering
problem" — whenever *either* date is blank. That is precisely
`checkDateOrder()`'s own tolerance, deliberately carried over. It means the
helper can be `&&`'d onto **any** existing boolean, including one that does
not otherwise track the specific date field at all, with zero risk of a
false failure when that field is blank — presence-tracking is not a
prerequisite for attaching an ordering check, it never was. All 23
relationships are addressed below; none are deferred.

**Cover: Reporting Period From must be strictly before Reporting Period To
(`allowSameDay:false`), and (where the field exists) GID must be on or before
Reporting Period From (`allowSameDay:true`) — 8 validator relationships, 10
`datesOrdered()` additions, because Simplified Accounting's Cover is tracked
by two independent sidebar keys that both need the full pair:**

| Filing type | Nav-check key(s) | `datesOrdered()` calls added | Validator call |
| --- | --- | --- | --- |
| Annual/Final/Trust | `a-p1` | 2 (periodFrom/periodTo, gid/periodFrom) | `annual-accounting/index.js:1411`, `:1415` |
| Simplified Accounting | `s-cover` **and** `s-p3` | 2 each = **4** — `s-p3` today tracks only `periodFrom`/`periodTo` presence, but both relationships attach safely to it per the blank-tolerance above, matching what `s-cover` already gets | `simplified-accounting/index.js:667`, `:671` |
| Plan Simplified | `ps-cover` | 1 (periodFrom/periodTo only — no `gid` field in this filing type) | `plan-simplified/index.js:350` |
| Plan Annual | `pa-cover` | 2 (periodFrom/periodTo, gid/periodFrom) | `plan-annual/index.js:668`, `:672` |
| Plan Minor | `pm-cover` | 1 (periodFrom/periodTo only — no `gid` field in this filing type) | `plan-minor/index.js:446` |

**Signature/certification date must be on or after Reporting Period To
(`allowSameDay:true` at every site) — 15 validator relationships, 15
`datesOrdered()` additions, one each. Twelve attach to a key that already
labels the same role; three attach to the nearest existing key instead
(marked Borrowed below), landing on two distinct keys — the guardian's own,
not a role-matched one, because no better-labeled key exists in that filing
type today. (A self-check while fixing round 3's Borrowed-count error above:
this sentence itself previously said "ten... five... two," an independent
miscount from the "two of the fifteen" error already caught — corrected here
too, against the table below, not just against the earlier prose.)**

| Filing type | Nav-check key | Role | Validator call | Fit |
| --- | --- | --- | --- | --- |
| Annual/Final/Trust | `a-p3` | Guardian | `annual-accounting/index.js:1439` | Exact |
| Annual/Final/Trust | `a-p4` | Preparer | `annual-accounting/index.js:1459` | Exact |
| Annual/Final/Trust | `a-p5` | Attorney | `annual-accounting/index.js:1480` | Exact |
| Annual/Final/Trust | `a-p10` | Certificate of Service | `annual-accounting/index.js:1487` | Exact |
| Simplified Accounting | `s-p4` | Guardian | `simplified-accounting/index.js:704` | Exact |
| Simplified Accounting | `s-p5` | Attorney | `simplified-accounting/index.js:713` | Exact — `s-p5` already labels the attorney section (tracks bar/phone/street/cityStateZip); it just never tracked the signature date, which is fine per the blank-tolerance above |
| Simplified Accounting | `s-p6` | Certificate of Service | `simplified-accounting/index.js:729` | Exact |
| Plan Simplified | `ps-p3` | Guardian | `plan-simplified/index.js:392` | Exact |
| Plan Simplified | `ps-p3` | Preparer | `plan-simplified/index.js:396` | **Borrowed — no preparer-specific key exists anywhere in this filing type; attaching here means a preparer-only date problem shows as the *guardian's* signature section being incomplete** |
| Plan Simplified | `ps-p3` | Attorney | `plan-simplified/index.js:400` | **Borrowed — same key, same caveat, for the attorney role** |
| Plan Annual | `pa-p11` | Guardian | `plan-annual/index.js:756` — **the reported defect** | Exact |
| Plan Annual | `pa-p11` | Attorney | `plan-annual/index.js:760` | **Borrowed — no attorney-specific key exists in this filing type; same caveat as Plan Simplified above** |
| Plan Minor | `pm-p6` | Guardian | `plan-minor/index.js:493` | Exact |
| Plan Minor | `pm-p7` | Preparer | `plan-minor/index.js:524` | Exact — `pm-p7` is already labeled "Preparer & Attorney" combined (its validator `sectionLabel`), so attaching the preparer date here is not a mislabeling, unlike the three Borrowed relationships above |
| Plan Minor | `pm-p7` | Attorney | `plan-minor/index.js:528` | Exact |

**The "Borrowed" trade-off, named rather than hidden.** **Correction (code
review, round 3, 2026-09-16): this was previously miscounted as "two of the
fifteen."** It is **three relationships attached to two borrowed keys**:
Plan Simplified's preparer *and* attorney dates both attach to `ps-p3` (one
key hosting two relationships), and Plan Annual's attorney date attaches to
`pa-p11` (a second key hosting one relationship) — three relationships, two
keys, not two of either. None of the three has a role-matched key to attach
to in its filing type today, and the candidate homes are either the
guardian's own key (imprecise: the guardian did nothing wrong, but their
section shows incomplete) or the Cover key (further away, and Cover already
carries its own pair above). Attaching to the guardian's key is recommended
as the least-bad of the two, and it fully closes the reported defect class —
a present-but-invalid date now turns *some* visible section red rather than
none — but a filer seeing "Signatures incomplete" when their own signature
is actually fine, because the attorney's (or preparer's) date is wrong, is a
real, known imprecision this document is not hiding. Adding a dedicated
preparer/attorney key to these two filing types would remove the imprecision
entirely; that is a larger, additive change (new tracked keys, not just a
new check on an existing one) and is offered as an explicit alternative in
Scope below, not assumed.

8 + 15 = 23 total `checkDateOrder()` calls across these 5 filing types,
confirmed by grep against `src/features/*/index.js`, excluding
`guardian-inventory/index.js`'s one call (`bondPeriodFrom`/`bondPeriodTo`,
a different relationship on a validator-driven nav-check already immune to
this bug class) and the function's own definition in `date-rules.js`. 10 + 15
= 25 total `datesOrdered()` additions, the extra 2 coming from Simplified
Accounting's Cover relationship being duplicated across `s-cover` and
`s-p3`.

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
2. apply it at all **25** additions covering all **23** validator
   relationships in the two tables above — every Cover pair and every
   signature/certification date, using the exact `allowSameDay` value the
   real validator uses at that site, attached to the nearest existing key
   (exact-fit or Borrowed, as tabulated);
3. add a runtime regression to `tests/e2e/navigation-status.contract.spec.ts`
   (see "Why `checklist-export-parity.spec.js` did not already catch this"
   above) that would have caught the reported defect, covering at least one
   Exact-fit site and all three Borrowed relationships, across both
   Borrowed keys: a fixture where the tracked field
   is present but out of order, asserting `computeNavChecks()`'s
   corresponding key is now `false` through the real browser;
4. update `TEST-INDEX.md` for the extended spec.

55B will not:

1. add dedicated preparer/attorney nav-check keys to Plan Simplified or Plan
   Annual to remove the three Borrowed relationships' imprecise labeling — that is a
   strictly additive follow-up (new tracked keys, distinct from this
   sub-delivery's "attach ordering to what already exists" scope) named as
   an explicit alternative below, not attempted here;
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

**Alternative to "will not" #1, if Alan prefers precision over minimal
surface**: add a dedicated preparer key to Plan Simplified and Plan Minor
(Plan Minor's `pm-p7` already combines both, so only Plan Simplified needs a
new key there) and a dedicated attorney key to Plan Simplified and Plan
Annual, then attach each date-order check to its own role's key instead of
borrowing the guardian's. This removes all three Borrowed relationships' imprecision at
the cost of 2-3 new tracked nav-check keys (a larger, additive change) — a
real option, not a compromise forced by a technical limitation, since the
technical limitation this document originally cited (round 1) turned out not
to exist.

### Files in scope

| File | Planned change |
| --- | --- |
| `src/legacy-app.js` | Add the shared date-order helper inside `computeNavChecks()`; apply all 25 additions across the 5 filing-type branches, per the two tables above. |
| `tests/e2e/navigation-status.contract.spec.ts` | Add the out-of-order-but-present runtime regression fixtures and assertions described above, covering at least one Exact-fit site and all three Borrowed relationships. |
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

Then, at each site, `&&` the matching call onto the existing boolean — for
example, Plan Annual's `pa-cover` and `pa-p11` (the latter carrying both the
Exact guardian check and the Borrowed attorney check):

```js
'pa-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.gid)
  &&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.guardian)&&filled(D.wardLiving)
  &&filled(D.residenceAddress)&&filled(D.residenceCityStateZip)
  &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
...
'pa-p11':filled(g0.name)&&filled(g0.signatureDate)
  &&datesOrdered(D.periodTo,g0.signatureDate,true) // Exact: guardian's own date
  &&datesOrdered(D.periodTo,D.attorney_signatureDate,true), // Borrowed: no attorney key exists in this filing type
```

And Simplified Accounting's Cover duplication — both keys get the full pair:

```js
's-cover': /* ...existing fields... */
  &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
's-p3':filled(D.periodFrom)&&filled(D.periodTo)
  &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
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

- Every one of the 23 validator relationships in the two tables above:
  presenting the tracked date(s) out of order flips its attached sidebar
  key from green to red, matching the real validator's own judgment —
  including all three Borrowed relationships, verified to actually flip (not assumed
  from the exact-fit sites' behavior).
- For each of the three Borrowed relationships specifically: confirm the flip is on the
  correct key (the guardian's) and that this is the intended, documented
  trade-off, not a mistaken attachment.
- A filing with every date in valid order is unaffected — no new false
  negatives introduced (the reported filing's other sections must not turn
  red).
- Guardian Inventory, Plan Initial, and every field not named above are
  bit-for-bit unaffected.
- `checklist-export-parity.spec.js`'s existing `KNOWN_GAPS` assertions are
  unaffected — this fix does not remove or add any field-name-level gap.
- New regressions are red against pre-fix `computeNavChecks()`, green after.

### Risk and rollback

Risk is **medium** — the change is mechanical (25 additions of one helper
call, no new logic branches), but `computeNavChecks()` gates the Next-button
and sidebar dot for the 5 filing types this sub-delivery touches, from one
function, so a typo in one branch's condition risks that branch alone, not
the others (each `checks` object is independent), but is still worth the
full-suite gate above rather than the lite default. The three Borrowed
attachments carry a UX trade-off, not a technical risk — explicitly named
above rather than being a hidden cost.

Rollback is limited to the `datesOrdered()` helper and its 25 call sites in
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
**at least one Plan filing type and one Accounting filing type** — matching
Acceptance criteria below, not the narrower "one role/filing type" an earlier
draft of this section said, which would leave the Accounting family
completely unverified for a widget this sub-delivery claims is genuinely
global:

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
554, `attorney_email`). It has **no row at all** for `annual_accounting`,
`simplified_accounting`, `plan_annual`, or `plan_initial` — the four engines
this sub-delivery proposed changing. Per `AGENTS.md` §3 (Data Model & Schema
Governance), the
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
| Plan Annual | **No field is unconditionally required.** But this is *not* "nothing is ever required regardless of signature state," which is what an earlier draft of this table said and which is itself a second, confirmed error caught on a further review pass: choosing "/s/" Signed or Signature Stamp runs `checkSignatureState({ name: d.attorney, ... })` (`plan-annual/index.js:771-778`), which conditionally requires the attorney's printed name (and the date or image the chosen method needs) the moment a signature method other than Unsigned is picked. The reported screenshot happened to show Unsigned selected, which genuinely has zero requirements — but that is one state among three, not the card's policy in general. | `plan-annual/index.js:764-778` |
| Plan Initial | An **"attorney information started" predicate**: `if(d.attorney_name||d.attorney_bar||d.attorney_signatureDate||(d.attorney_signatureState&&d.attorney_signatureState!=='none'))` — only once any one of those is present does attorney name become required and does `checkSignatureState()` run. Explicitly documented as protecting a legal exemption: "pro se filers and Guardian Advocates (Ch. 393, exempt from attorney representation under Fla. Prob. R. 5.030) must be able to export without an attorney." | `plan-initial/index.js:675-694` |

Plan Annual and Plan Initial's policies are consequently closer to each
other than the round-1 correction stated: both are conditional-on-signature-
choice-or-content, neither is unconditional, and neither is genuinely "never
anything." The real, load-bearing difference between them is which condition
gates it — Plan Annual's is the signature-state choice alone; Plan Initial's
is the broader "started" predicate, which can also trigger from bar number
alone with no name and no signature choice, and which carries the documented
pro se exemption Plan Annual's does not need to.

So the actual gap this sub-delivery reports — Primary Email carrying a
required asterisk that nothing enforces — is real and confirmed in all four
engines (below), but the claim that surrounded it ("nothing about the
attorney card is required anywhere") was true for only one of the four, and
a naive uniform fix built on that false premise would have been wrong for
the other three:

- In **Annual** and **Simplified**, gating `attorney_email` behind
  `d.attorney` (literal truthiness) while its sibling fields (bar, phone, street,
  city/state/zip) stay unconditionally required in the same block would
  introduce a *new*, unexplained inconsistency — one field on the card
  optional-until-named, four others always required.
- In **Plan Initial**, a bare `d.attorney` (literal truthiness) gate is not equivalent to the
  existing "started" predicate: `attorney_bar` alone (no name) already
  triggers "started" under the real predicate, so an email requirement
  keyed on a different condition than the one already gating the rest of
  the card would drift the moment either changes, and any implementation
  must ensure it does not accidentally narrow the documented pro se/Guardian
  Advocate exemption.
- **Plan Annual** is the one engine where a bare `d.attorney` (literal truthiness) gate for
  email would sit cleanly *alongside* its existing rule, not in place of it:
  `checkSignatureState()`'s name/date/image requirement (above) is keyed on
  the signature-state choice, not on `d.attorney`'s truthiness, so the two
  conditions co-exist without conflicting — but "clean" here means
  non-conflicting, not that this engine already has an equivalent pattern to
  copy the way Annual/Simplified do for their sibling fields.

**Correction (code review, round 3, 2026-09-16): `has(...)` was undefined.**
Earlier drafts wrote the Plan Annual gate as `has(d.attorney)` — no function
by that name exists in `plan-annual/index.js` or anywhere reachable from it
(confirmed by grep; the file's only helper is `req()`), so implementing that
literally would throw a `ReferenceError`. The fix is a bare truthiness check,
`d.attorney`, with no wrapper — this matches Plan Initial's own "started"
predicate one filing type over, which uses raw `||`-chained truthiness with
no helper function either (`plan-initial/index.js:685`), so this is
consistent with the codebase's existing convention for this exact kind of
condition, not a new one invented for this sub-delivery. Every occurrence
below is corrected to the literal form.

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

**Error 4 (code review, round 3, 2026-09-16) — Plan Initial's sidebar key for
this card is not merely missing an email condition, it is already wrong for
the two fields it does track, in a way that blocks this sub-delivery's own
acceptance criterion.** `computeNavChecks()`'s Plan Initial branch has:

```js
'pi-p10':filled(D.attorney_name)&&filled(D.attorney_signatureDate),
```

— `legacy-app.js:7008`, confirmed by direct read. This is **unconditional**:
a completely blank attorney card (the pro se/Guardian Advocate case Error 3
describes) reports `pi-p10` as incomplete in the sidebar *today, before this
sub-delivery touches anything* — directly contradicting the real validator,
which requires nothing at all until the "started" predicate trips. That is
the identical class of defect 55B exists to fix (sidebar disagrees with the
real validator), just inverted in direction: 55B's cases show green when the
validator blocks; this one shows red when the validator does not. It was not
caught earlier because 55D's earlier drafts only asked "does the sidebar
track this field's presence," never "does the sidebar's *condition* match
the validator's."

The consequence for this sub-delivery specifically: Acceptance criteria
below promises "a filing with the whole card blank still exports cleanly ...
explicitly tested" and implies the sidebar agrees. Merely adding an email
condition to `pi-p10` as it stands would produce, e.g.,
`filled(D.attorney_name)&&filled(D.attorney_signatureDate)&&datesOrThingsOK`
— still unconditional, still red on a blank card, so the acceptance
criterion's sidebar-agreement half would remain false regardless of what is
added to it. `pi-p10` must be **replaced**, not extended: gated behind the
same "started" predicate already used at `plan-initial/index.js:685`, with
name, date, and now email all inside that gate, matching the real validator
exactly rather than adding one more condition to an already-wrong one.

### Decision: Option A — resolved by Alan, 2026-09-16

Given the four genuinely different per-engine policies above, this was not a
single yes/no.

| Option | Effect |
| --- | --- |
| **A — Enforce the asterisk, per-engine (chosen)** | Add CSV rows for `attorney_email` in `annual_accounting`, `simplified_accounting`, `plan_annual`, `plan_initial`; initialize it in all four blank-data factories; require it in each engine using **that engine's own existing gating shape** (unconditional in Annual/Simplified, matching their sibling fields; `d.attorney` (literal truthiness) in Plan Annual, co-existing with its separate signature-state-triggered name requirement rather than replacing it; the exact existing "started" predicate in Plan Initial, not a different condition). Requires `npm run verify:data-model` clean and per-engine tests, not one shared fixture. |
| **B — Remove the asterisk instead (not chosen)** | Drop `required: true` from three `inpS('attorney_email', ...)` calls (Plan Annual, Plan Initial, Simplified Accounting) and the equivalent flag on Annual Accounting's **`inpD(...)`** call — a different rendering function with a different argument shape (label, value, an inline `onchange` string, required, type — no `id` parameter), confirmed by reading `annual-accounting/index.js:686`. Matches Plan Simplified/Plan Minor's existing, internally-consistent treatment. |
| **C — Expand to the full card (not chosen; would have needed its own scoping pass)** | Make bar/phone/street/city-state-zip also conditionally required once an attorney is named, in Plan Annual and Plan Initial specifically. The most direct answer to "should naming an attorney obligate the rest of the card," but not sized in this document. |

**Alan selected Option A, 2026-09-16.** This sub-delivery is execution-ready
on that basis, per the corrected Scope, Files in scope, and Verification
gate below — all already written for Option A.

### Scope

55D will:

1. add the missing CSV rows, exact contents specified below, run `npm run
   verify:data-model` clean, initialize `attorney_email` in all four
   blank-data factories in `src/core/state.js`, and add the requiredness
   rule to each of the four validators **in that engine's own existing
   gating shape**, per the table above — not one shared `d.attorney`
   truthiness check reused four times;
2. **Correction (code review, round 3, 2026-09-16): "add the matching
   presence key" read as four new keys — it is not.** Every one of the four
   engines already has an existing sidebar key touching this exact role;
   this sub-delivery adds a condition to each, and replaces one outright:
   - Annual/Final/Trust: extend **`a-p5`** (already tracks bar/phone/street/
     cityStateZip for the attorney) with `filled(D.attorney_email)`.
   - Simplified Accounting: extend **`s-p5`** (same shape) with
     `filled(D.attorney_email)`.
   - Plan Annual: extend **`pa-p11`** — the guardian's own key, borrowed for
     the same reason 55B borrows it for the attorney's signature-date check
     (no attorney-specific key exists in this filing type) — with
     `(!D.attorney||filled(D.attorney_email))`, matching the validator's
     bare-truthiness gate exactly.
   - Plan Initial: **replace `pi-p10` outright**, per Error 4 above — it
     does not merely need an email condition added, its existing
     unconditional form is already wrong and must be replaced with a
     version gated by the same "started" predicate the validator uses,
     with name, date, and email all inside that one gate;
3. add regression coverage for the four affected engines specifically — not
   just Plan Annual and Plan Initial, which is what an earlier draft of this
   section actually tested — since Annual and Simplified's
   unconditional-requirement shape differs from Plan Annual/Plan Initial's
   conditional one and needs its own fixtures.

55D will not:

1. implement Option B or C — both declined; see the table above;
2. touch Plan Simplified or Plan Minor, which are already internally
   consistent and out of scope for this specific mismatch;
3. change any other attorney field's requiredness (bar, phone, street,
   city/state/zip) — that would be Option C's territory, not this one's;
4. narrow Plan Initial's documented pro se/Guardian Advocate exemption as a
   side effect of the new email requirement — the exemption's existing
   "started" predicate is the one this sub-delivery must match, not
   redesign.

### Files in scope

**Correction (code review, round 3, 2026-09-16): the four CSV rows were named
by scope only, not specified.** `AGENTS.md` §3 requires the actual row
contents, not just which engines get one. Exact rows to add (20-column
format per the CSV's own header; columns not listed here are blank, matching
the existing `guardian_inventory`/`plan_minor` rows for the same field):

| scope | requiredness | required_when | notes |
| --- | --- | --- | --- |
| `annual_accounting` | `required` | (blank — unconditional, matching sibling fields `attorney_bar`/`attorney_phone`/`attorney_street`/`attorney_cityStateZip`) | Email address |
| `simplified_accounting` | `required` | (blank — unconditional, same reasoning) | Email address |
| `plan_annual` | `conditional` | `attorney is named` | Email address |
| `plan_initial` | `conditional` | `attorney information started` | Email address |

Full rows (`field_path=attorney_email`, `field_label=Attorney email`,
`data_type=string`, `format=email`, `sensitive=none`,
`persistence_status=persisted`, `derived_or_input=input`,
`source_file=src/core/state.js`):

```csv
annual_accounting,D,attorney_email,Attorney email,string,email,required,,,none,persisted,input,,,,,src/core/state.js,emptyDataAnnual(),,Email address
simplified_accounting,D,attorney_email,Attorney email,string,email,required,,,none,persisted,input,,,,,src/core/state.js,emptyDataSimplified(),,Email address
plan_annual,D,attorney_email,Attorney email,string,email,conditional,attorney is named,,none,persisted,input,,,,,src/core/state.js,emptyDataPlanAnnual(),,Email address
plan_initial,D,attorney_email,Attorney email,string,email,conditional,attorney information started,,none,persisted,input,,,,,src/core/state.js,emptyDataPlanInitial(),,Email address
```

`required_when` phrasing matches this CSV's own existing style for
conditional rows (e.g. row 50's `amendedVersion`: `conditional,amendedForm is
Yes`) rather than inventing new wording.

| File | Planned change |
| --- | --- |
| `probate-guardian-data-model.csv` | Add the four rows above. |
| `src/core/state.js` | Initialize `attorney_email:''` in `emptyDataAnnual()`, `emptyDataSimplified()`, `emptyDataPlanAnnual()`, `emptyDataPlanInitial()`. |
| `src/features/annual-accounting/index.js` | Add **unconditional** `req(d.attorney_email, ...)`, alongside its existing unconditional bar/phone/street/cityStateZip requirements. |
| `src/features/simplified-accounting/index.js` | Add **unconditional** `req(d.attorney_email, ...)`, alongside its existing unconditional requirements. |
| `src/features/plan-initial/index.js` | Add the email requirement **inside the existing "started" `if` block** (`:685`), using the same condition already gating attorney name and signature state — not a new, separately-evaluated condition. |
| `src/features/plan-annual/index.js` | Add `req(d.attorney_email, ...)` gated on `d.attorney` (literal truthiness), as its own condition alongside (not replacing) the existing `checkSignatureState()` name requirement. |
| `src/legacy-app.js` | Extend `a-p5` and `s-p5` with an `attorney_email` presence check; extend `pa-p11` with `(!D.attorney\|\|filled(D.attorney_email))`; **replace `pi-p10` outright** with a version gated by the "started" predicate covering name, date, and email together. No new nav-check keys are added anywhere — four existing keys are modified, one of them (`pi-p10`) substantially. |
| `tests/e2e/date-validation.contract.spec.ts` and/or `navigation-status.contract.spec.ts` | New regression fixtures for Annual/Simplified (neither has a `*-parity.spec.js`, confirmed — that naming pattern exists only for the four Plan types); see Verification gate. |
| `tests/unit/plan-annual-parity.spec.js`, `plan-initial-parity.spec.js` | New regression fixtures for the two Plan engines, including Plan Initial's blank-card-still-exports-cleanly case against the replaced `pi-p10`. |
| `tests/unit/checklist-export-parity.spec.js` | Update `KNOWN_GAPS` if `attorney_email` was already listed for any of the four (check fresh at implementation time). |
| `TEST-INDEX.md` | Update affected rows. |

### Required regression test

1. **Annual and Simplified** (unconditional shape): a fixture with
   `d.attorney_email` blank and every other attorney field filled: confirm
   the real validator now blocks on email specifically, red before the fix,
   green after — proving the new rule, not just that the existing
   unconditional bar/phone/street/cityStateZip rules still work. Since
   neither engine has a `*-parity.spec.js`, this belongs in
   `tests/e2e/date-validation.contract.spec.ts` (already exercises
   `validateAnnual`/`validateSimplified` directly) or a comparable unit-level
   fixture against the exported validator function — confirm which at
   implementation time.
2. **Plan Annual** (conditional on bare `d.attorney` truthiness, co-existing with
   its separate signature-state rule): a fixture with `d.attorney` set,
   Unsigned selected, and `d.attorney_email` blank: confirm the validator
   now blocks on email alone even though Unsigned itself requires nothing
   else — this is the exact reported screenshot's state. A fixture with
   `d.attorney` blank entirely: confirm no email requirement is introduced.
3. **Plan Initial** (matches the "started" predicate): a fixture where only
   `d.attorney_bar` is set (name blank, matching the predicate's own
   already-tested "started via bar number alone" case) and email blank:
   confirm the requirement fires; a fixture with the whole card blank:
   confirm the pro se/Guardian Advocate exemption still exports cleanly,
   unchanged. **This second fixture is also the regression for `pi-p10`'s
   replacement (Error 4)** — run it against the *current, unreplaced*
   `pi-p10` first and confirm it is red (the pre-existing bug, present before
   this sub-delivery touches anything), then again after the replacement and
   confirm it is green, per this repo's red-first convention. A blank-card
   fixture that was never actually red on old `pi-p10` would not prove
   anything about the replacement.
4. Plan Simplified and Plan Minor: confirm both remain completely
   unaffected by any of the above.
5. Sidebar parity, through the real browser (per 55B's own corrected
   reasoning — `computeNavChecks()` cannot be verified any other way):
   `tests/e2e/navigation-status.contract.spec.ts` asserts `a-p5`, `s-p5`,
   `pa-p11`, and the replaced `pi-p10` each agree with their engine's
   validator for every fixture above — four existing keys checked, not four
   new ones.
6. `npm run verify:data-model` passes clean against the new CSV rows.

### Verification gate

```text
npm run verify:data-model
npx vitest run tests/unit/checklist-export-parity.spec.js tests/unit/plan-annual-parity.spec.js tests/unit/plan-initial-parity.spec.js
npx playwright test tests/e2e/date-validation.contract.spec.ts tests/e2e/navigation-status.contract.spec.ts tests/e2e/routes.spec.ts
```

The `navigation-status.contract.spec.ts` run is required, not optional — it
is the only venue that actually executes `computeNavChecks()` (55B's own
correction applies identically here); an earlier draft of this gate omitted
it along with any Annual/Simplified-specific test at all.

Recommend a full `npm test` before commit, given this changes real export
behavior for four different engines in four different ways (a filing that
exports cleanly today may not once this lands) — per `AGENTS.md` §1, ask
before running it.

### Acceptance criteria

- A named attorney with no Primary Email now blocks export in all four
  affected filing types, using each engine's own existing gating shape, with
  a sidebar marker that agrees.
- Plan Annual specifically: the reported screenshot's exact state (attorney
  named, Unsigned selected, email blank) now blocks — this is the case that
  matters, since Unsigned alone triggers none of Plan Annual's *other*
  requirements.
- A filing with no attorney named at all is completely unaffected in Plan
  Annual and Plan Initial (the two conditional engines); Annual and
  Simplified's existing unconditional requirements are unaffected in shape,
  only extended to cover email too.
- Plan Initial's pro se/Guardian Advocate exemption still exports cleanly
  with the entire attorney card blank — explicitly tested, not assumed.
- Plan Simplified and Plan Minor are untouched.
- `npm run verify:data-model` passes; no new gap or false parity-pass is
  introduced in `checklist-export-parity.spec.js`; the sidebar parity
  assertion in `navigation-status.contract.spec.ts` passes for every fixture.

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
   today. Alan weighed this and chose Option A over the narrower Option B
   and the broader, unscoped Option C, 2026-09-16.

### Dependency and sequencing

No logical dependency on 55A or 55C. **File-level overlap with 55B, not a
priority ordering** — see 55B's own "Dependency and sequencing" for the
shared-file detail; the same coordination applies here in reverse. Land one
of 55B/55D fully before starting the other, or coordinate at the
`computeNavChecks()` branch level if both are approved close together.

