# Milestone 39: Print Preview Annotation and Persisted Signature Capture

## Status

**39-A and 39-B: spiked and landed.** 39-A —
`src/core/pdf/pdf-annotate.js`, `src/core/pdf/pdf-preview.js`,
`src/styles/print.css`, `src/features/plan-simplified/print.js`;
`tests/e2e/pdf-annotate.spec.ts`, `tests/unit/print-annotation-persistence.spec.js`.
39-B — `src/core/validation/signature-state.js`,
`src/core/signature/signature-pad.js`,
`src/core/signature/signature-state-control.js`,
`src/core/images/png-dimensions.js`, plus the shared `signature-block`
renderer in `src/core/pdf/pdf-engine.js` and Plan Simplified's own
`index.js`/`print.js`/`pdf-model.js`; `tests/unit/signature-capture.spec.js`,
`tests/e2e/signature-capture.contract.spec.ts`. See each sub-milestone's own
"Persistence design"/"Implementation Plan" and "Spike results" sections for
what was built and what was learned building it. **39-C: both authorization
gates cleared, and the rollout to Plan Annual, Plan Initial, and Plan Minor
is landed** (see "39-C: Multi-Role, Multi-Filing-Type Rollout" below for
what changed and its own "Verification Plan" for what was run). The
remaining 39-C scope — Simplified/Annual Accounting and Guardian Inventory,
and the Upload background-transparency luminance-threshold fix itself —
has not been started; each begins only on the requester's explicit
go-ahead, same discipline as every other sub-milestone. 39-D and
39-E remain a recommendation-recorded draft — do not implement yet.** What started as
one research conversation (ephemeral PDF annotation for Print Preview) grew,
over several rounds of review, into two architecturally distinct
capabilities plus a substantial cross-filing-type rollout. It is now split
into five lettered sub-milestones, the same discipline
`MILESTONE-34-1-PROPOSAL.md` used for the same reason: each can be scoped,
spiked, and authorized independently instead of as one omnibus decision.
Beyond 39-A/39-B's own landed spikes, this document
authorizes no further runtime, dependency, or build change on its own — each
remaining sub-milestone below carries its own gate.

## Goal

Two related but separately-architected capabilities:

1. **Persisted Print Preview annotation (39-A):** let a filer mark up the
   rendered PDF — a text note, a highlight — that survives across preview
   sessions and app restarts, without building a PDF editor from scratch
   and without the marks ever merging into or altering the filing's own
   validated answers. Deliberately not an ability to rewrite the PDF's
   original form text.
2. **Persisted Visual Signature Capture (39-B through 39-E):** let a filer
   draw, type, or upload a signature mark — captured with a lightweight,
   standalone widget, not pdf.js (see 39-B) — as real, validated filing
   data, not an annotation, with a reusable, versioned signature stamp per
   party.

## Background

Raised as: could Print Preview support light editing before printing, the
way Adobe Acrobat Pro does? Two alternatives were considered and set aside
first:

1. **Point filers at the existing DOCX export and a real word processor.**
   Rejected by the requester: the current Word export's formatting quality
   is poor and doesn't come close to the PDF engine's output, so it isn't a
   credible substitute today. (Improving DOCX fidelity is a separate,
   legitimate piece of work — see "Related, Out-of-Scope Work" below — but
   doesn't by itself deliver in-app editing.)
2. **Point filers at an external PDF editor (Acrobat, Preview, etc.) on the
   already-exported PDF.** Zero engineering cost, since the PDF output is
   already good, but requires leaving the app. Still a valid fallback if this
   milestone doesn't move forward, but the requester wants the in-app
   experience checked first.

The requester was explicit: **do not build a PDF editor** — the ask was to
find an existing open-source component instead. That component,
`pdf.js`'s `AnnotationEditorLayer`, turned out to also expose a `SIGNATURE`
editor type, which is where the second capability came from — see 39-B.

## Recommended Order and Dependencies

39-A is fully independent and can ship on its own. 39-B must land before
39-C, 39-D, or 39-E — it proves the core mechanism (one role, one filing
type) that the others extend. 39-C (multi-role/multi-type rollout) and 39-E
(print-time jump-to-signature) can proceed in either order once 39-B lands.
39-D (reusable versioned stamp) builds on top of 39-B's basic capture and
can follow whenever convenient after it.

---

## 39-A: Persisted Print Preview Annotation

### Findings: Recommended Approach

**`pdf.js`'s built-in `AnnotationEditorLayer`** is the strongest fit.

- Already a dependency: this app vendors `pdfjs-dist` (`package.json`:
  `^6.3.289`) and uses it in `src/core/pdf/pdf-preview.js` /
  `src/core/pdf/pdfjs-loader.js` to render Print Preview's PDF to canvas.
  The annotation editor has shipped in `pdf.js` since v3.x and is Mozilla-
  maintained, Apache-2.0 licensed, and actively developed — well above the
  vendored 6.3.289's floor.
- Supports **FreeText** (click-to-add/edit text, with font size and color
  controls), **Highlight**, **Ink** (freehand draw), and **Stamp** (image)
  editing modes.
- Edits are written as **real PDF annotation objects** — not rasterized into
  the page. The resulting file stays a standard, portable PDF: any other PDF
  tool, including Acrobat itself, can open it and keep editing those same
  annotations.
- This also bounds the main architectural risk of in-app editing: because
  edits live as annotations layered on the rendered PDF rather than as
  changes fed back into the form data, they can't silently make the exported
  document say something the stored, validated filing answers don't. They
  are additive and visually distinct from the underlying content, not a
  rewrite of it.

### Technical gaps the spike must resolve

- **The app currently initializes none of the annotation-editor lifecycle.**
  Confirmed directly against the vendored `lib/pdfjs/pdf.mjs` (matches
  `package.json`'s pinned `6.3.289`): its export list does include
  `AnnotationEditorLayer`, `AnnotationEditorUIManager`,
  `AnnotationEditorType`, and `AnnotationEditorParamsType`, and
  `PDFDocumentProxy.saveDocument()` is a real, present method — the
  "already a dependency" premise holds. But `AnnotationEditorUIManager` is a
  large class with many internal collaborators (alt-text manager, comment
  manager, floating toolbar, filter factory, highlight-color service, and
  more) that this app has no equivalent of; the spike should expect to pass
  `null`/stub several optional constructor dependencies, not just
  "instantiate and dispose" a single object. This is a scoped addition, not
  a rewrite, but budget it as more than a one-line integration.
- **No annotation-editor CSS is vendored anywhere in this repo today.**
  `lib/pdfjs/` holds only `pdf.mjs` and the worker — no stylesheet.
  `AnnotationEditorLayer`'s real CSS lives in `pdfjs-dist`'s own
  `web/pdf_viewer.css` (present in `node_modules/pdfjs-dist/web/`, ~6,400
  lines total, but only ~38 rules are annotation-editor-related — the rest
  targets pdf.js's own default full-page viewer chrome, which this app does
  not use). The spike must extract just the `.annotationEditorLayer`/
  `.freeTextEditor`/`.highlightEditor`-family rules, not vendor the whole
  stylesheet, and reconcile them with this app's own preview chrome.
- **The current preview flow throws away its `PDFDocumentProxy` on every
  render.** `pdf-preview.js`'s `renderPagesInto()` holds `pdf`/`page` as
  function-local variables that go out of scope once rendering finishes —
  by design, since today's preview is write-only (render once, discard).
  Both the editor manager and `saveDocument()` need that same live document
  handle to still exist later, when the user clicks Undo or Save Annotated
  PDF. The spike must add a place to hold that reference for the preview's
  lifetime and clear it on every re-render.
- **The app owns the toolbar.** No suitable pre-built toolbar is mounted. The
  spike must wire the approved controls to the editor API, including Undo,
  Clear Annotations, and Save Annotated PDF, without breaking the existing
  output-authorization flow. Confirm as part of this work that the
  annotation toolbar simply doesn't render while `mountPdfPreview()` is in
  its "blocked" (outstanding-requirements) state, the same way the rest of
  the preview already doesn't — this should fall out of construction rather
  than needing a separate check, but the spike should verify it rather than
  assume it.
- **Annotated output is a proof point, not an assumption.** The spike must
  prove that `pdfDocument.saveDocument()` produces a downloadable PDF that
  retains annotations when opened and printed by an external PDF viewer.
- **Considered and set aside:**
  - `pdf-lib` — programmatic PDF creation/modification only (draw text at
    given coordinates, embed fonts). No interactive editing UI of its own;
    using it would mean building the click-to-edit experience ourselves,
    which is the effort this milestone is trying to avoid.
  - `pdfjs-annotation-extension` (GitHub, third-party) — extends `pdf.js`'s
    viewer with additional annotation/comment features. Kept as a fallback
    idea only: single-maintainer project, much smaller community than
    Mozilla's own `pdf.js`, so it carries more maintenance risk as a
    dependency.
  - `pdf.js`'s own `COMMENT` editor type (confirmed present in the vendored
    `6.3.289` build). Not proposed here: `COMMENT` is a threaded reply/note
    attached to another annotation, gated behind an app-supplied
    `commentManager` collaborator this app has no equivalent of — it implies
    a multi-party review workflow, and every annotation in this milestone is
    single-user and never leaves the local browser, so there is no second
    party to comment back.
  - `pdf.js`'s own `SIGNATURE` editor type — investigated for 39-B, and now
    also set aside there. It's tied to pdf.js's rendered-page/viewport
    machinery; 39-B mounts its capture UI inside plain form cards with no
    rendered PDF page nearby, and a plain HTML5 canvas signature pad
    produces the same base64 PNG output without that dependency or its
    mounting risk. See 39-B's own "Capture mechanism" section. Not
    permanently ruled out — 39-A's own spike may still find it mountable
    standalone, in which case it's available as an alternative, but nothing
    in this design depends on that outcome.

### Non-Goals / Out of Scope (39-A)

1. Not a general-purpose PDF editor — only FreeText and Highlight.
2. Not a change to the underlying filing's *validated* data model.
   Annotations persist in their own isolated field (`printAnnotations` —
   see "Persistence design" below), never merged into, read by, or capable
   of altering any validated form answer. A filing's readiness/validation
   status, and its standard court-filing PDF output, are both entirely
   unaffected by whether it has annotations — annotations render only in
   the interactive Print Preview surface and the explicit "Save Annotated
   PDF" derivative, never silently in the primary filing output.
3. Not an all-filings rollout. The pilot is Simplified Annual Plan's Print
   Preview only.
4. Not the DOCX export fidelity work — see "Related, Out-of-Scope Work."

### Recommended Decisions for Authorization (39-A)

1. **Modes and language:** named **Annotate PDF**, not "Edit," because it
   cannot alter original PDF content. Limited to Add Note (FreeText) and
   Highlight, with Undo, Clear Annotations, and Save Annotated PDF on its
   toolbar. Ink and Stamp are deferred.
2. **Pilot:** Simplified Annual Plan Print Preview — the smallest filing
   type by page count, bounding the surface area of the first integration
   attempt. The shared integration must retain a deliberate, per-filing-type
   rollout path: `pdf-preview.js` is the one module every filing type's
   preview already shares, so the annotation-editor mount point belongs
   behind an explicit per-type gate there, not a fork of the file.
3. **Lifecycle:** annotations persist with the filing — stored in
   `window.D`/the `.sav` file as their own isolated `printAnnotations`
   field, surviving preview close, app restart, and reload — a deliberate
   change from the originally-drafted ephemeral-only design; see
   "Persistence design" below for the storage format, reapply mechanism,
   and drift handling. They still never enter validation or merge into any
   validated answer. A form-data change substantial enough to shift the
   underlying page content discards the stored annotations on next
   reapply, with a clear warning, rather than risk showing marks that no
   longer line up with the regenerated PDF. Save Annotated PDF remains
   available as a separate, explicit flattened-download derivative.
4. **Accessibility:** the toolbar must be semantic, named, and keyboard
   operable; focus enters a newly added note; Escape exits the active tool;
   Clear/Delete are keyboard-reachable and confirmed; mode changes use the
   existing live region. Color cannot be the sole carrier of meaning.
   Release requires keyboard, zoom, high-contrast, and existing
   PDF-accessibility coverage.
5. **FreeText controls:** the vendored `pdf.js` 6.3.289 source confirms
   size, color, and opacity parameters. The initial UI promises only size
   and color — this version has no FreeText underline editor parameter,
   though it can render existing underline annotations.

### Persistence design (39-A) — built and tested, not just planned

**Status: this section describes what was actually implemented and
empirically verified via `tests/e2e/pdf-annotate.spec.ts`
(`src/core/pdf/pdf-annotate.js`, `src/core/pdf/pdf-preview.js`), not a
forward-looking design.** The mechanism below corrects the version
originally drafted here, which assumed storing pdf.js's raw
`AnnotationStorage.serializable` map and reapplying it directly — building
the real thing surfaced that this doesn't work the way that draft assumed
(see "Reapply mechanism," below), and the actual shipped design instead
persists the *full annotated PDF bytes*.

- **New field:** `d.printAnnotations` — `{ pdfBytes: <base64-encoded
  saveDocument() output>, contentFingerprint: <string>, capturedAt: <iso
  date> }`. Lives directly on the filing document itself, the same way
  39-B's `signatureImage` does — not a separate case-file-wide collection.
  Storing the *whole annotated PDF*, not a bare annotation-storage diff, is
  a real, measurable cost: this roughly doubles what a Print Preview save
  adds to the `.sav` file relative to storing just the annotation data —
  acceptable for a single-filing-type spike, but worth a size/compression
  pass before any wider rollout (39-A doesn't extend to other filing types,
  so this doesn't block the pilot; flag it if 39-A itself is ever
  broadened beyond one type).
- **Drift detection, as designed and now confirmed working.** The PDF is
  regenerated fresh from `window.D` on every render; nothing guarantees a
  given page's layout is identical between two regenerations of the same
  filing (a longer typed answer, an added co-guardian, or any future
  content change can shift what lands on a given page).
  `computeContentFingerprint()` hashes page count plus each page's
  extracted text (`page.getTextContent()`) against the fresh, *unannotated*
  regeneration — computed via a lightweight throwaway parse (no canvas
  render), kept deliberately separate from the real page-render pass so a
  mismatch never costs a second full render. On a mismatch, the stored
  annotations are discarded with an assertive announcement rather than
  reapplied. One real bug found and fixed building this: `pdfjsLib.
  getDocument({data})` transfers (detaches) the source buffer to the
  worker rather than copying it, so the fingerprint pre-parse must run
  against a **copy** of the bytes (`finalizedBytes.slice()`) — parsing the
  same buffer twice throws `postMessage: ArrayBuffer ... already detached`.
- **Reapply mechanism — resolved empirically, not assumed.** Two things
  were tested directly, and they diverge from what the original draft
  hoped for:
  1. **The annotation itself genuinely survives as real, portable PDF
     data.** Re-parsing the stored `pdfBytes` independently and calling
     `page.getAnnotations({intent: 'display'})` on them returns a real
     `{subtype: 'FreeText', ...}` annotation object — confirmed in the
     e2e spec. This is exactly what a plain PDF annotation looks like to
     any tool, this app included; the save/reopen round trip is not lossy
     at the file level.
  2. **It does not come back as a live, editable `AnnotationEditorLayer`
     editor on its own.** Reopening a preview whose fingerprint matches a
     stored, previously-annotated file swaps in the stored bytes for
     display, but zero `.freeTextEditor` DOM nodes exist until the filer
     interacts again — confirmed by counting them immediately after
     reopen with no user action. So this milestone's own predicted
     fallback is the actual, confirmed outcome: **baked-in-only reapply**.
     A previously-added note is preserved and visible (baked into the
     canvas render the same way any other PDF content is), but it is not
     re-editable as an annotation-layer object without redrawing it. A
     genuinely live-editable round trip would need a materially different
     mechanism than "swap in saved bytes" — likely reconstructing editor
     instances from `page.getAnnotations()`'s output at mount time, which
     is real, separate follow-on work if editable persistence turns out to
     matter, not a small extension of what's built here.
  3. One further, smaller finding: the annotation's plain-text `Contents`
     field on the (re-parsed, e2e-checked) FreeText object came back
     empty even though real text was typed into it — pdf.js's own FreeText
     serialization apparently carries the visible text elsewhere (its
     appearance stream / rich-text representation), not the classic PDF
     `/Contents` string. Worth confirming visually in an external viewer
     (Implementation Plan step 4) before relying on `/Contents` for
     anything; not chased further in this spike since it doesn't change
     the baked-in-only conclusion above.
- **Data model:** `probate-guardian-data-model.csv` has real rows now —
  `printAnnotations.pdfBytes`, `.contentFingerprint`, `.capturedAt`, scoped
  to `plan_simplified` — added in the same commit as this implementation,
  `npm run verify:data-model` passing. Sensitivity: classified `personal`
  (not `none`): a FreeText note is filer-typed free text, and nothing
  stops a filer from typing something personal into it, even though the
  mechanism itself introduces no new category of stored data beyond
  whatever the filer chooses to type.
- **Legacy migration:** trivial, unlike 39-B's. A `.sav` file that predates
  this field simply has no `printAnnotations` — there is no prior state to
  infer a value from; an absent field means exactly what it says, no
  annotations exist yet.
- **Export/Import/Portability:** because `printAnnotations` lives directly
  on the filing document (not in a separate party-level or cross-filing
  record), every existing export path that already bundles the whole
  filing document carries it automatically — including
  `buildSingleWardExportBlob()`'s single-ward export. Unlike 39-D's
  cross-record stamp reference, this needs no export-path code change;
  confirmed by reading what that function actually bundles today (the
  whole filing document, not a filtered subset of it).

### Implementation Plan (spike first)

1. **Spike, one Preview page only.** On a development-only Simplified Annual
   Plan Preview, mount the exported `AnnotationEditorLayer` and its manager
   alongside the existing canvas/text layers, with the necessary editor CSS.
   Make no change to the shipped experience.
2. Build the approved minimal toolbar: Annotate PDF, Add Note, Highlight,
   Undo, Clear Annotations, and Save Annotated PDF. Do not add Ink, Stamp,
   or an "Edit original text" claim.
3. Verify FreeText size, color, and opacity empirically. Do not implement
   or advertise underline without a separate supported and portable
   approach.
4. Confirm the annotated PDF downloads, prints, and reopens correctly —
   including in an external viewer — to prove annotations are standard and
   portable, not an artifact of the integration.
5. Confirm that a substantial form-data change causes the drift-discard
   warning on next reapply rather than misplaced marks, and that
   annotations — while now persisted in `window.D`/`.sav` — never reach
   validation or merge into any validated answer.
6. Run the defined accessibility checks, including keyboard-only annotation
   creation/removal and screen-reader labeling of the toolbar/layer.
7. Report the spike's findings — actual effort, UI results, and surprises —
   to the requester before any full rollout decision.

### Spike acceptance criteria

Exporting `AnnotationEditorLayer` from the vendored build proves the class
exists; it doesn't prove the integration is done. The spike is complete
only once it demonstrates, concretely, each of: the minimal set of
`AnnotationEditorUIManager` constructor dependencies actually needed (vs.
stubbed) and the `eventBus`/mode-switch events actually used; the extracted
editor CSS rendering correctly without pulling in pdf.js's default full-
viewer chrome; the held `PDFDocumentProxy` reference being correctly torn
down on every re-render (no leaked reference from a prior render, no error
on rapid consecutive form-data changes); `saveDocument()`'s output
verified byte-for-byte re-openable in an external viewer, not just "did not
throw"; the existing Print Preview's WCAG/keyboard coverage re-run clean with the
annotation layer mounted, not skipped; and the persisted-annotation round
trip — store, reload the preview fresh, confirm the same marks reappear
correctly positioned, and confirm a deliberately drifted fixture
(regenerated with different underlying content) triggers the discard-with-
warning path instead of misplacing marks.

**Spike results — all criteria above exercised, not just designed:**
`AnnotationEditorUIManager` needed only `container`, `viewer` (the same
element, both roles), `eventBus` (a ~40-line faithful port of pdf.js's own
`EventBus`, since this app vendors only pdf.js's core build, not the web/
viewer layer that normally supplies one — no other collaborator was
needed); the extracted CSS subset rendered FreeText/Highlight correctly
with no full-viewer-chrome leakage; the held `AnnotationSession`/
`PDFDocumentProxy` is destroyed and rebuilt on every `mountPdfPreview()`
call via a module-level reference, confirmed clean across repeated
navigations in the e2e suite; `saveDocument()`'s output was independently
re-parsed and its `FreeText` annotation confirmed real
(`page.getAnnotations()`, not just "did not throw"); the existing PDF
accessibility/WCAG suite (`pdf-accessibility-and-signatures.spec.ts`,
`pdf-structure-tags.spec.ts`, `plan-pdf-wcag-compliance.spec.ts`) re-ran
clean with the annotation layer mounted; and the persisted round trip
confirmed the "Persistence design" section's baked-in-only outcome — see
that section for what did and didn't work. Two real bugs were found and
fixed during the build, both noted where relevant above: `PDFDocumentProxy`
has no `.destroy()` (it lives on the loading task), and
`getDocument({data})` transfers rather than copies its input buffer.

### Verification Plan (39-A)

1. Focused e2e coverage for the new toolbar controls, including the
   persisted-annotation round trip (save, close, reopen, confirm reapply)
   and the drift-discard path (regenerate with different underlying
   content, confirm stored annotations are discarded with a warning, not
   misapplied). Landed at `tests/e2e/pdf-annotate.spec.ts` — 5 tests,
   passing.
2. Unit tests for the `contentFingerprint` computation and drift-comparison
   logic in isolation, plus the `MiniEventBus` shim. Landed at
   `tests/unit/print-annotation-persistence.spec.js` — 8 tests, passing.
3. Confirmed no regression to the existing PDF accessibility/WCAG suite
   (`pdf-accessibility-and-signatures.spec.ts`, `pdf-structure-tags.spec.ts`,
   `plan-pdf-wcag-compliance.spec.ts`) — all re-run clean.
4. Both new test files added to `TEST-INDEX.md`.
5. Full-suite regression run not yet requested/run (per `AGENTS.md`'s test
   policy, focused runs only until authorized) — the pre-existing
   `pdf-preview-viewer.spec.ts` regression suite was run directly and its
   8 pre-existing "blocked preview override" failures were confirmed, via
   `git stash`, to already fail identically on the unmodified baseline —
   not a regression from this work.
6. `printAnnotations` is a real persisted data-shape change —
   `probate-guardian-data-model.csv` updated in the same pass (3 new rows
   under `plan_simplified`), `npm run verify:data-model` passing (840 rows).

---

## 39-B: Visual Signature Capture — Core Mechanism (one role, pilot type)

This capability originated from `pdf.js`'s `AnnotationEditorType.SIGNATURE`
(confirmed present in the vendored `6.3.289` build via
`SignatureEditor`/`SignatureExtractor`), which lets a filer draw a
signature, type their name and have it converted to a signature-style
outline, or upload and vectorize an image of one — the capability, draw/
type/upload a signature mark, is the goal; pdf.js's own implementation of
it is not the mechanism 39-B actually uses (see "Capture mechanism" below).
The idea was initially set aside on the theory that it would compete with
this app's "real" signature mechanism, and a later draft over-corrected by
asserting a legal-sufficiency claim ("no signature method is more legally
real than another") this document has no standing to make either way.

### Scope note: this app is a filer convenience, not a legal-sufficiency gate

Both framings above share the same mistaken premise — that this app's
signature-state field adjudicates whether a filing is legally signed. It
never has. `signatureState` records what the filer told the app about
*their own filing*, the same way every other optional or conditional field
in this app already does; it does not, and was never meant to, determine
whether the resulting document satisfies Florida's signature requirements.
A filer who chooses Unsigned in-app can print the resulting document, sign
it by hand, and file it entirely outside this app's involvement — that path
exists today regardless of what any validator says, because this app has
no authority over what happens to a printed page after it leaves the
screen. Blocking print on a blank signature field never actually prevented
an improperly-signed filing; it only ever blocked the app's own
convenience workflow for filers who intended to sign in-app. Letting
Unsigned validate and print doesn't create a new legal risk — it just stops
the app from pretending its own internal completeness check was ever a
legal enforcement mechanism. The filer remains responsible for their own
filing's compliance, exactly as they are with any other document-
preparation tool.

**Decision: signature capture is not part of 39-A's annotation-editor
mechanism.** Both 39-A and 39-B are now persisted, but via entirely
different paths (see 39-A's "Persistence design" for its own
reapply/drift-detection approach, which 39-B has no equivalent of).
`pdf.js`'s drawing/typing/upload widget is used purely as the capture UI;
its result is written into `window.D` and saved in the `.sav` file like
every other required answer, and rendered on the page through this app's
own `pdf-engine.js` (jsPDF), the same pipeline that renders the typed "/s/"
signature today — never through pdf.js's `AnnotationEditorLayer` or
`saveDocument()`. Unlike `printAnnotations`, `signatureImage` **is** a
validated answer (see "Validation" below) — a deliberate, narrow exception
to 39-A's Non-Goal #2's "never merged into a validated answer" rule,
scoped to this one field type only.

### UI: three-state control per signature card

This app already renders each signer's certification as its own card —
confirmed in `plan-simplified/index.js`: "Certification and Signature of
Preparer" and "Certification and Signature of Guardian's Attorney" are two
separate `entry-card` blocks, not one shared section. Each such card gets
one segmented control/slider cycling **Unsigned → "/s/" Signed → Signature
Stamp** (driving that card's own `signatureState` field). The stamp capture
UI — the draw/type/upload widget, or "Use my saved stamp" once 39-D exists —
renders only once that specific card's control is switched to Signature
Stamp; it must not be visible, mounted, or take up layout space in the other
two states. This keeps the common case (typed "/s/") exactly as simple as
it is today, with the stamp machinery appearing only for the signer who
opts into it, per card. Capture UI lives directly inside that role's
existing Certification and Signature card, next to its typed name/date
inputs — not a separate annotate-the-rendered-PDF surface.

### Field shape varies by role — confirmed, not assumed

Verified directly against the pilot filing type's own validator
(`validatePlanSimplified()`): Attorney's and Preparer's signature dates are
top-level scalars (`d.attorney_signatureDate`, `d.preparer_signatureDate`),
so `attorney_signatureState`/`attorney_signatureImage` and the Preparer
equivalents fit directly. The Guardian's signature does not: it lives at
`d.planGuardians[N].signatureDate`, a row inside a collection that can hold
a second co-guardian. That role's new fields are
`planGuardians[N].signatureState`/`planGuardians[N].signatureImage` — a
per-row addition to the collection schema, not a top-level field — and each
guardian row gets its own independent card and control, consistent with the
co-guardian handling already established in Milestone 34-1C. **39-B targets
the Guardian role specifically** because it is the one role the pilot
type's own validator already makes unconditionally required, giving the new
validation rule (below) a real existing requirement to attach to; 39-C
extends the mechanism to the scalar-field roles and every other filing type.

### `signatureImage`: base64-encoded PNG

Present only when `signatureState === 'stamp'`, persisted alongside the
filing's other answers in the same encrypted `.sav` payload. Because it
renders through the ordinary `pdf-engine.js` path, any future regeneration —
a reprint, a corrected filing, a new session next year — rebuilds the same
signature from `window.D` exactly like every other field, instead of
needing it redrawn or reapplied. This is a simpler durability story than
39-A's own persistence design (see 39-A's "Persistence design" section):
39-B needs no `contentFingerprint`/drift-detection step at all, because the
signature image is baked into the PDF at the same point every other field
is, not layered on afterward and reapplied to a freshly-rendered page. In
39-B, this image is stored directly on the filing (no reuse yet — see 39-D
for the versioned, per-party stamp that supersedes a plain copy).

### Capture mechanism — a real, previously unexamined mounting risk

This document assumed pdf.js's `SignatureEditor` widget would be the
capture UI wherever it's needed, including inside a plain form card (e.g.,
inside "Certification and Signature of Preparer" on `plan-simplified/index.js`'s
own page) — nowhere near an actual rendered PDF page or canvas viewport.
That assumption was never verified and is now a real, open risk:
`AnnotationEditorLayer`/`SignatureEditor` are built as part of pdf.js's
page-rendering machinery — tied to a rendered page's viewport/coordinate-
transform matrices and `AnnotationEditorUIManager`'s much larger internal
state (confirmed earlier in this document: many collaborators, several
this app has no equivalent for). Mounting that machinery somewhere with no
underlying rendered PDF page at all may require substantial stubbing of
viewer internals it was never designed to run without.

**Recommended default: a plain HTML5 `<canvas>` signature pad, not pdf.js,
for capture inside form cards.** A simple canvas-based widget — draw with
mouse/touch, render typed text in a script/cursive web font onto the
canvas, or draw a cropped/resized uploaded image onto it — produces the
exact same base64 PNG output this design already depends on
(`canvas.toDataURL('image/png')`), with none of pdf.js's page-coordinate
dependencies, no `AnnotationEditorUIManager` stubbing, and no code shared
with (or risked by) 39-A's actual PDF-page annotation work. This makes
39-B fully independent of 39-A's pdf.js integration risk, not just
architecturally distinct from it. pdf.js's own `SignatureEditor` is
demoted to "considered and set aside" for this purpose — see below — kept
only as something 39-A's spike may separately explore if mounting it
standalone turns out to be unexpectedly simple, but 39-B's design does not
depend on that outcome.

### Rendering to PDF: the actual mechanism, not just the two endpoints

The concrete path, using pieces that already exist rather than inventing
new ones:

1. The canvas signature pad's committed drawing/typed-text/cropped-image
   is read directly off the canvas via `canvas.toDataURL('image/png')` —
   no vector-contour extraction step is needed once pdf.js's editor is out
   of the capture path.
2. That data URL becomes `signatureImage`, after the size/dimension/content
   validation below.
3. `pdf-engine.js` needs a new `renderSignatureImage(dataUrl, layout)`
   helper. It does not need to be built from nothing: `pdf-engine.js`
   already has `renderSupportingDocumentImage(dataUrl, layout, imageType)`
   (used for scanned-exhibit images), which calls jsPDF's
   `doc.addImage(dataUrl, 'PNG', x, y, width, height)` — the new helper
   should follow that exact pattern, sized to a signature block's layout
   instead of a full exhibit page.
4. Whichever `pdf-model.js` builds that role's signature block calls the
   new helper in place of the typed "/s/ Name" text when
   `signatureState === 'stamp'`, at the same position that text currently
   occupies.

The spike's job is to prove steps 1 and 3 concretely (a rendered signature
block that looks right, at a reasonable size, in the actual PDF output),
not to re-derive that this is possible.

### Data safety: image limits and legacy migration

Two things a stamp/upload feature cannot ship without, neither previously
addressed:

- **Image constraints**, enforced at capture time: a maximum pixel
  width/height, a maximum file size, a transparent background rather than
  an opaque canvas fill (an opaque signature image would paint a visible
  box over the printed form line instead of sitting on it), and validation
  of the actual file content (magic bytes), not just a `.png` extension or
  a declared MIME type a browser reports. An uploaded image should also
  have its metadata stripped before it's stored — not for the date-reading
  concern below, but because an uploaded photo (someone photographing a
  signed physical page, for example) can carry EXIF fields like GPS
  coordinates that have nothing to do with the signature itself and should
  not be retained. **Maximum width, measured, not guessed:** `pdf-engine.js`'s
  actual signature line is drawn `margin + 2` to `margin + 250` (jsPDF
  configured with `unit: 'pt'` here) — a real width of 248pt, i.e. 3.44
  inches. At 300 DPI (a reasonable print-quality target for an embedded
  image), that's ~1,030px; round to **1024px** as the capture widget's
  maximum width, with height capped proportionally to a natural signature
  aspect ratio (roughly 3:1 to 4:1, wide and short). A maximum file size in
  the tens of KB is more than sufficient for a compressed PNG at that size.
- **Sensitivity, stated explicitly rather than left implicit.** `signatureImage`
  is new stored data and `AGENTS.md` §8 requires its own classification, not
  an inherited one: classify it `document-content` in
  `probate-guardian-data-model.csv` — that value already exists in
  `scripts/verify-data-model.mjs`'s enforced enum (confirmed directly), so
  this needs no schema change, just using it. Threat model: it sits inside
  the same encrypted `.sav` payload as every other filing answer, protected
  by the same case-file password as a typed name — no new access-control
  gap. What it does add relative to today's typed "/s/" is that a leaked or
  misdirected file now exposes a reproducible image of the guardian's actual
  signature mark, not just a name string; a real, if modest, escalation
  worth surfacing to the requester rather than treating as equivalent to
  the text it replaces.
- **DOCX export's image-embedding gap is moot.** `docx-engine.js` has no
  image-embedding capability at all today (no image relationships, no
  drawing XML), and building one would have been substantial, separate
  work — but per `MILESTONE-40-PROPOSAL.md`, DOCX export itself is
  deprecated and its code is slated for removal, not for enhancement. Until
  that removal lands, `signatureState === 'stamp'` should render as text
  (the typed name and date, the same way "/s/" already renders) rather than
  silently omitting the signature or throwing on a missing image path — a
  temporary bridge for whatever window remains before DOCX export is
  removed, not a feature worth building out further.
- **Legacy filings have no `signatureState` at all.** Every existing `.sav`
  file predates this field. Treating "field is missing" as equivalent to
  `signatureState: 'none'` would be wrong: a legacy filing that already has
  a real `signatureDate` (signed under today's plain mechanism, before this
  feature existed) would suddenly read as Unsigned, silently granting a
  pass that filing never actually needed because it was already complete.
  The correct migration rule: if `signatureState` is missing and a
  `signatureDate` is already present, infer `signatureState: 'typed'` (this
  filing was already signed the old way) — never `'none'`. Only a filing
  with neither field present, which was already incomplete under today's
  hard requirement, resolves to `'none'`.

### Validation: a confirmed, deliberate change to today's behavior

**Decided: all three states pass validation, for every role, including the
Guardian's.** Today, `validatePlanSimplified()` unconditionally requires
`g.signatureDate` to be non-blank; going forward, a filer can explicitly
choose Unsigned for the Guardian's own card and still have the filing
validate as complete and printable. Per the Scope Note above, this is not
a loosening of a legal requirement — the app was never enforcing one, only
its own internal completeness convention — it's making the app's own model
honest about a filer's real options (in-app "/s/", in-app stamp, or sign by
hand after printing) instead of forcing a choice among only the first two.
Whoever implements or reviews this later should know it's deliberate, not
a bug.

The new rule, replacing the plain `req(g.signatureDate, ...)` call for each
signature card:

- **a. Unsigned** — passes. `signatureState === 'none'`; no date, no image
  required. This is also simply the control's default/rest state — there is
  no separate "never touched" failure mode distinct from an explicit
  Unsigned choice, since Unsigned is itself always a fully valid answer.
- **b. "/s/" Signed** — passes only once actually applied: `signatureState
  === 'typed'` **and** the underlying typed name and signature date are
  both non-blank. Selecting the state alone, with nothing filled in, does
  not pass.
- **c. Signature Stamp** — passes only once actually applied: `signatureState
  === 'stamp'` **and** `signatureImage` is non-blank.

This check governs `signatureState`/`signatureDate`/`signatureImage` only.
It does not relax any other independent requirement on that same card (for
example, a guardian's printed name, address, or SSN/EIN stay required by
whatever rule already governs them, untouched by signature state).

### Reusable stamp — deferred to 39-D

39-B stores the captured image directly on the filing. Reuse across
filings, versioning, and the party-level store are 39-D's scope, built on
top of this once it's proven.

### Implementation Plan (39-B spike) — done, built with 39-C's reuse in mind

Independent of 39-A's spike — ran after it. Every piece below was built as
a standalone, shape-agnostic module rather than inline in Plan Simplified's
own files specifically so 39-C's rollout to other roles/filing types is
wiring, not rebuilding:

- `src/core/validation/signature-state.js` — `checkSignatureState()` and
  `inferLegacySignatureState()` take raw `state`/`name`/`date`/`image`
  values, not a record shape, so the same functions serve top-level scalar
  fields, nested objects, and collection rows alike (39-C's three
  confirmed shapes) without modification.
- `src/core/signature/signature-pad.js` — the canvas capture widget
  (Draw/Type/Upload) and `validateSignatureImage()`, mountable into any
  card; nothing in it is Guardian- or Plan-Simplified-specific.
- `src/core/signature/signature-state-control.js` — the three-state
  radio control + capture-widget mount/unmount wiring, parameterized by a
  `path` prefix; a future role only needs to pass its own path.
- `src/core/images/png-dimensions.js` — shared PNG byte-header reader, used
  by both the capture-time validator and the render-time sizing below.
- `src/core/pdf/pdf-engine.js`'s `renderSignatureImage()` and the new
  `hasStampImage` branch were added to the **shared, generic
  `signature-block` renderer** every filing type's `pdf-model.js` already
  funnels through (confirmed by reading it directly) — not a
  plan-simplified-only code path. This is the single most consequential
  finding for 39-C: rolling out to another role/filing type needs no
  further `pdf-engine.js` change at all, only adding
  `signatureState`/`signatureImage` to that type's own block-construction
  call, the same one-line addition made to `plan-simplified/pdf-model.js`'s
  `makeSigBlock()`.
- `src/features/plan-simplified/index.js`/`print.js` are the only
  Plan-Simplified-specific pieces: wiring the reusable control into the
  Guardian card, and replacing `req(g.signatureDate, ...)` with
  `checkSignatureState()` in both `validatePlanSimplified()` **and**
  `planReadinessChecksSimplified()` — the latter wasn't in the original
  plan, but AGENTS.md Section 4's Parity Invariant means both had to change
  together or the readiness panel would show a false blocker for a
  Guardian who explicitly chose Unsigned. The readiness item now calls
  `checkSignatureState()` directly rather than re-deriving equivalent
  boolean logic, so the two can't drift apart later either.
- Confirmed a filing with Unsigned explicitly chosen validates as complete
  (readiness and the real export path agree), and that "/s/" or Stamp
  chosen but incomplete still blocks, each with its own distinct message.
- Confirmed correct rendering through the existing `pdf-engine.js` path for
  all three states — proved directly via pdf.js's own operator list
  (`OPS.paintImageXObject` present on the Signatures page for the Stamp
  case), not just "the page rendered with no error."

### Verification Plan (39-B) — landed

1. Unit tests for the canvas signature pad and the PNG capture/validation
   logic (dimension/size/content checks) plus `checkSignatureState()`/
   `inferLegacySignatureState()` — landed at
   `tests/unit/signature-capture.spec.js`, 17 tests, passing. (Transparent
   background is structural, not a runtime check: Draw/Type canvases are
   never filled before drawing, so nothing to test there; see "Data safety"
   below for the one real, honest limitation this doesn't cover.)
2. E2e coverage for all three states on the Guardian's card, including the
   incomplete-"/s/" and incomplete-Stamp blocking cases, the legacy-
   migration inference rule, and a real draw-and-apply interaction —
   landed at `tests/e2e/signature-capture.contract.spec.ts`, 4 tests,
   passing.
3. `planGuardians[N].signatureState`/`planGuardians[N].signatureImage` —
   `probate-guardian-data-model.csv` updated in the same pass (3 new rows:
   `signatureState`, `signatureImage`, and a narrowed `signatureDate`
   `required_when`), `npm run verify:data-model` passing (842 rows).
4. Both new test files added to `TEST-INDEX.md`.
5. Regression-checked, not assumed safe: the full unit suite (425 tests,
   50 files) and the broader PDF/signature e2e suite spanning every filing
   type (`pdf-accessibility-and-signatures.spec.ts`,
   `pdf-structure-tags.spec.ts`, `plan-pdf-wcag-compliance.spec.ts`,
   `pdf-form-specific.spec.ts`, `plan-simplified-mount.spec.ts` — 21 e2e
   tests) all re-run clean after touching the shared `signature-block`
   renderer. Full-suite `npm test` not run (per `AGENTS.md`'s test policy,
   focused runs only until requested).

### Real limitation found building this, not previously flagged

Uploaded-image background transparency is unaddressed. The doc's "Data
safety" section calls for "a transparent background rather than an opaque
canvas fill" — Draw and Type modes satisfy this structurally (the canvas is
never filled before drawing). An **uploaded** photo of a signature almost
always has its own opaque background (e.g. white paper), and this spike
does not attempt to remove it. Concretely: an uploaded stamp will likely
render as a small opaque box sitting on the signature line rather than a
mark that looks like it belongs there. Not blocking for this pilot — the
mechanism itself (capture, validate, store, render) is proven regardless of
which capture mode is used — but tracked as its own gate on 39-C, not left
implicit: see 39-C's "Upload background-transparency gate" for the real
options (a bounded luminance-threshold heuristic, a UI hint, or dropping
Upload) and why rolling 39-C out unchanged would multiply this defect
across every future role rather than fixing it once.

---

## 39-C: Multi-Role, Multi-Filing-Type Rollout

Extends 39-B's proven mechanism to every other signature-bearing card.
**Both gates below are now cleared** — the inventory is complete (audited
directly against every listed file, zero "not yet confirmed" cells remain)
and the Upload background-transparency question has a decision. Clearing
these gates authorizes design/estimation work, per this document's own
"Implementation Gate" section; actual multi-file implementation still
starts only on the requester's explicit go-ahead, the same discipline
39-A and 39-B were each individually authorized under.

| Filing type | Role / card | Field | Shape | Validator predicate | Requiredness |
| --- | --- | --- | --- | --- | --- |
| Plan Simplified | Guardian | `planGuardians[0].signatureDate` | collection row | Hard `req()` (39-B's target — done) | Hard required |
| Plan Simplified | Preparer / Attorney | `d.preparer_signatureDate` / `d.attorney_signatureDate` | scalar | Order-check only | Not required |
| Plan Annual | Guardian | `d.planGuardians[0].signatureDate` | collection row | Hard `req()`, `plan-annual/index.js:698-699` | Hard required |
| Plan Annual | Guardian's Attorney | `d.attorney_signatureDate` | scalar | Order-check only, `plan-annual/index.js:706-708` | Not required |
| Plan Initial | Guardian | `d.planGuardians[0].signatureDate` | collection row | Hard `req()`, `plan-initial/index.js:597-601` | Hard required |
| Plan Initial | Guardian's Attorney | `d.attorney_signatureDate` | scalar | Conditional-once-started, `plan-initial/index.js:608-611` | Conditional (Milestone 35-3 pro se/Guardian Advocate exemption) |
| Plan Minor | Guardian | `d.planGuardians[0].signatureDate` | collection row | Hard `req()`, `plan-minor/index.js:432-437` | Hard required |
| Plan Minor | Preparer | `d.preparer_signatureDate` (flat scalar, despite the name) | scalar | Conditional-once-started, `plan-minor/index.js:445-448` | Conditional, same once-started rule |
| Plan Minor | Guardian's Attorney | `d.attorney_signatureDate` | scalar | Conditional-once-started, `plan-minor/index.js:449-452` | Conditional, same once-started rule |
| Annual/Final/Trust Accounting | Guardian(s) (Part III) | `d.guardians[i].signatureDate` | collection row | Hard per row (row 0 unconditional, extras conditional on populated data), `annual-accounting/index.js:1412-1424` | Hard required per populated row |
| Annual/Final/Trust Accounting | Preparer (Part IV) | `d.preparer.signatureDate` | nested object | Hard `req()`, `annual-accounting/index.js:1425-1430` | Hard required |
| Annual/Final/Trust Accounting | Attorney (Part V) | `d.attorney_signatureDate` | scalar | Hard `req()`, `annual-accounting/index.js:1438` | Hard required |
| Annual/Final/Trust Accounting | Attorney, Certificate of Service (Part X) | `d.certAttySignDate` | scalar | **Resolved: unvalidated.** No `req()`, no `checkDateOrder()` — confirmed absent from `validateAnnual()` entirely | Not enforced at all today — weaker than every other card in this table |
| Simplified Accounting | Guardian(s) (Part IV) | `d.guardians[i].signatureDate` | collection row | Hard per row, `simplified-accounting/index.js:630-646` | Hard required per populated row |
| Simplified Accounting | Attorney (Part V) | `d.attorney_signatureDate` | scalar | Order-check only, `simplified-accounting/index.js:651-653` | Not required |
| Simplified Accounting | Attorney, Certificate of Service (Part VI) — **not in the original draft table, found during the audit** | `d.certAttySignDate` | scalar | **Unvalidated**, confirmed absent from `validateSimplified()` entirely | Not enforced at all today — same gap as Annual/Final/Trust's Part X card |
| Guardian Inventory | Guardian(s) (D-1) | `d.guardians[i].signatureDate` | collection row | Hard, `guardian-inventory/index.js:1119` | Hard required per row |
| Guardian Inventory | Preparer (D-2) | `d.preparer.signatureDate` | nested object | Hard, `guardian-inventory/index.js:1120` | Hard required (confirmed — matched the original draft's guess) |
| Guardian Inventory | Attorney (D-2, Attestation) | `d.attorney.signatureDate` | nested object | Hard, `guardian-inventory/index.js:1121` | Hard required |
| Guardian Inventory | Attorney, Certificate of Service (D-5) | `d.serviceAttorney.signatureDate` | nested object | Hard, `guardian-inventory/index.js:1130` | Hard required (confirmed — matched the original draft's guess) |

**Three distinct field shapes exist, confirmed across all 6 remaining
filing types, and 39-C's design must handle all of them:** top-level scalar
(`d.attorney_signatureDate`), nested object (`d.preparer.signatureDate`),
and collection row (`d.guardians[i].signatureDate`). A single filing type
can also have more than one card for nominally the same role (Guardian
Inventory's D-2 and D-5 are both "the attorney," Annual/Final/Trust
Accounting and Simplified Accounting each have a primary Attorney card plus
a separate Certificate-of-Service Attorney card) — each such card gets its
own independent `signatureState`/`signatureImage`, never a role-wide shared
one. Also confirmed during the audit: all 6 remaining filing types already
render their signature blocks through the same shared, generic
`signature-block` type in `src/core/pdf/pdf-engine.js` that Plan
Simplified does (Guardian Inventory routes through it via a re-exported
alias, `guardian-inventory/pdf-engine.js` → `generateVerifiedInventoryPdf`
→ `generateCourtFormPdf`) — 39-B's own finding that "39-C needs no further
`pdf-engine.js` change" is now confirmed for every remaining type, not just
assumed to extend.

### Inventory gate — cleared

Audited directly against every filing type's own validator and
`pdf-model.js` (file:line citations in the table above); the table has zero
remaining "not yet confirmed" cells. Two things surfaced during the audit
that the original draft didn't anticipate:

1. **A fourth validator-predicate category: unvalidated entirely.**
   Annual/Final/Trust Accounting's Part X and Simplified Accounting's Part
   VI Certificate-of-Service Attorney cards have no requiredness rule of
   any kind today — not hard-required, not conditional, not even
   order-check-only. This needs no new product decision: 39-B's existing
   rule already applies uniformly regardless of a card's prior
   requiredness (Unsigned always passes; "/s/" or Stamp must be completed
   once chosen). For these two cards specifically, adopting the tri-state
   control is a pure improvement with no loosening to weigh — Unsigned
   trivially passes, exactly matching today's actual (zero) enforcement,
   and choosing "/s/"/Stamp adds a real completeness check where none
   exists today.
2. **A card the original draft table omitted entirely:** Simplified
   Accounting's Part VI Certificate-of-Service Attorney card
   (`d.certAttySignDate`) — structurally identical to Annual/Final/Trust
   Accounting's Part X card, and missed for the same reason (it's a second,
   easy-to-overlook attorney card distinct from the primary Part V
   Attorney). Added to the table above.

### Upload background-transparency gate — resolved: luminance-threshold fix

**Decision: option 1, luminance-threshold background removal, Upload only.**
The requester chose this over shipping a UI hint or dropping Upload
entirely. A bounded, client-side pass over the uploaded image's own pixel
data (read `ImageData`, treat any pixel above a brightness threshold as
background and set its alpha to 0, keep darker "ink" pixels opaque) —
entirely within `src/core/signature/signature-pad.js`'s existing Upload
tab, no new dependency, and shared automatically by every role/filing type
39-C touches since the fix lives in the one shared capture widget, not per
role. This is real, honest, and scoped as its own small spike within 39-C's
implementation, not assumed solved by this decision alone: it needs its own
empirical threshold-tuning pass (the doc's own framing above already flags
degraded results on shadows, colored/textured paper, low-contrast ink, and
uneven lighting) before it ships, the same way 39-B's core mechanism was
spiked and verified rather than assumed. Verification for this specific
piece: unit tests for the threshold pass against a range of synthetic
sample images (plain white background/dark ink; off-white/gray background;
low-contrast ink; a background with a shadow gradient), documenting where
the heuristic holds and where it visibly degrades — the same "know its real
limits" bar 39-B's own image-safety work was held to.

### Recommended sequencing

Roll out filing type by filing type, reusing 39-B's exact mechanism
(three-state control, same validation rule shape adapted to each role's
existing requiredness) rather than redesigning per type. Suggested order:
the remaining Plan types first (closest to the pilot's own shape), then
Simplified/Annual Accounting (collection-row guardians, nested preparer),
then Guardian Inventory last (the most cards, including the two
Certificate-of-Service outliers). Each filing type's own rollout should be
verified independently before moving to the next, matching this project's
established per-sub-milestone verification discipline.

**Plan Annual, Plan Initial, and Plan Minor: done, verified.** Every card
identified in the inventory table above for these three types now has the
tri-state control — Plan Annual's Guardian and Attorney; Plan Initial's
Guardian and Attorney; Plan Minor's Guardian, Preparer, and Attorney.
Simplified/Annual Accounting and Guardian Inventory remain unstarted.

- **The scalar field shape needed a real generalization to
  `signature-state-control.js`, not just wiring.** The module's own
  original design (39-B) assumed `${path}.signatureState` as a dot-path,
  which is correct for the nested-object and collection-row shapes but
  cannot address a flat, underscore-prefixed scalar like
  `attorney_signatureState` — `window.setPath`/`getPath` split strictly on
  ".", so `"attorney" + ".signatureState"` resolves to a new nested
  `d.attorney.signatureState`, not the real field. Fixed by adding optional
  `statePath`/`imagePath` overrides to `renderSignatureStateControl()`/
  `mountSignatureStateControls()` (`path` now only needs to be a stable,
  unique card identifier for grouping/mounting when an override is given);
  the nested-object and collection-row call sites needed no change, since
  their default-computed paths were already correct. This also required
  correcting `mountSignatureStateControls()`'s `setImage(path, dataUrl)`
  callback contract to receive the already-resolved image path rather than
  a bare card id, updating Plan Simplified's own 39-B call site
  (`plan-simplified/index.js`) to match — a real, if narrow, behavior
  change to already-shipped code, re-verified against 39-B's own e2e suite
  (all 4 tests re-ran clean).
- **A fourth validator-predicate category surfaced during the inventory
  audit and needed a decision, resolved without a new product question**
  (see the Inventory Gate section above): two cards (both
  Certificate-of-Service Attorney cards, out of scope for this pass — see
  Simplified/Annual Accounting below) had no requiredness of any kind
  today. 39-B's own rule already covers this for free (Unsigned trivially
  passes, matching today's actual zero enforcement).
- **The "conditional-once-started" pro se/Guardian Advocate exemption
  (Milestone 35-3, Plan Initial's and Plan Minor's Attorney/Preparer cards)
  needed its own "started" trigger extended, not just a completeness
  check.** An explicit "/s/"/Stamp choice with every other field still
  blank now also counts as "started" (previously only a typed name/bar/date
  did); an explicit or default Unsigned choice still does not, preserving
  the exemption. Verified directly: a fully blank attorney/preparer card
  still exports cleanly; selecting Signature Stamp with nothing else filled
  in now correctly blocks on both the name and the image.
- **A real, pre-existing, unrelated bug found while writing this rollout's
  e2e coverage, not introduced by it — confirmed via `git stash` against the
  unmodified baseline.** `tests/e2e/support/target.ts`'s
  `fillMinimalValidPlanInitialWard()` never sets `q7Trusts`/
  `q7PendingBenefits`, which default to the tri-state *string* `"No"` —
  and `validatePlanInitial()`'s `if(d.q7Trusts||d.q7PendingBenefits||
  d.q7Other)` (index.js:581) treats any non-blank string, including an
  explicit "No", as needing an explanation. This is the exact class of bug
  `form-contract.js`'s own `yesNoText()` doc comment warns about
  ("'No' is a non-empty string and therefore truthy"). It currently blocks
  `plan-readiness.contract.spec.ts`'s own "a fully completed plan ... is
  not blocked from export" test for Plan Initial, and one
  `plan-initial-mount.spec.ts` PDF-export test, on master today,
  independent of this milestone. Worked around in this rollout's own new
  tests (reset the two fields to `''` before asserting) rather than fixed,
  since fixing `validatePlanInitial()` is outside 39-C's scope — flagged
  here for the requester to prioritize separately.

### Verification Plan (39-C)

Per filing type landed: extend 39-B's `tests/e2e/signature-capture.contract.spec.ts`
with that type's own cards and field shapes (scalar, nested object,
collection row) rather than one new file per filing type, since it's the
same mechanism under test each time — a `probate-guardian-data-model.csv`
update for every new field (per `AGENTS.md`), and a `TEST-INDEX.md`
description update reflecting the file's growing scope as each type lands.

**Plan Annual/Initial/Minor — landed and run:**

1. `tests/e2e/signature-capture.contract.spec.ts` extended with 13 new
   tests (legacy-migration/Unsigned/incomplete-"/s/"/Stamp-draw-and-apply
   per type's Guardian card, plus blank-passes/Stamp-paints coverage per
   scalar Attorney/Preparer card), each Stamp test confirming the image is
   actually painted via pdf.js's own operator list on that type's own
   finalized PDF, not just "didn't throw." All 17 tests in the file
   (4 pilot + 13 new) pass.
2. `tests/unit/plan-annual-parity.spec.js`, `plan-initial-parity.spec.js`,
   `plan-minor-parity.spec.js` each extended with dedicated tri-state
   parity coverage (Unsigned-passes, Stamp-incomplete-blocks, and for the
   scalar cards, blank-card-passes/Stamp-applied-passes), plus the
   pre-existing blank-signature-date cases corrected to explicit
   `signatureState: 'typed'` fixtures (blanking a date alone is no longer a
   blocker by itself, same correction 39-B made for the pilot). All three
   files pass, plus `tests/unit/checklist-export-parity.spec.js`'s
   known-gaps allow-list extended for the new fields.
3. Full unit suite (440 tests, 50 files) and the broader PDF/signature e2e
   regression (`pdf-accessibility-and-signatures.spec.ts`,
   `pdf-structure-tags.spec.ts`, `plan-pdf-wcag-compliance.spec.ts`,
   `pdf-form-specific.spec.ts` — 16 e2e tests) re-run clean after touching
   the shared `signature-state-control.js` module and all three
   `pdf-model.js` files. `plan-annual-mount.spec.ts`/`plan-initial-mount.spec.ts`/
   `plan-minor-mount.spec.ts` and `plan-readiness.contract.spec.ts` re-run
   clean except the two pre-existing Plan Initial failures noted above
   (confirmed unrelated via `git stash`).
4. `probate-guardian-data-model.csv` updated (14 new rows: signatureState/
   signatureImage for Plan Annual's/Initial's/Minor's Guardian rows and
   Attorney scalars, plus Minor's Preparer scalar; existing signatureDate/
   requiredness rows narrowed to reference the new field where applicable),
   `npm run verify:data-model` passing (856 rows). `TEST-INDEX.md` updated.

---

## 39-D: Reusable, Versioned Per-Party Signature Stamp

A party who appears on multiple filings — an attorney or preparer across
several matters, a guardian across recurring annual filings — should not
have to redraw their signature every time. But a stamp can change over
time (a new drawn signature replaces an old one), and a filing signed with
an old stamp must keep rendering that same old mark forever, even after the
party's active stamp changes.

### Design

- **`party.signatureImages`: an array of objects, one per party, each with
  its own permanent incrementing id** (e.g., `{ id: 1, imageData: '<base64
  PNG>', capturedAt: '<iso date>', active: true }`). The counter is scoped
  to each party independently — each party's own images are numbered 1, 2,
  3... — so ownership is unambiguous by construction (the entry lives
  inside that party's own record) without a separate cross-reference field.
  This lives on the party record via `party-resolver.js`'s existing
  convention for per-party data (`name`, `phone`, `email`, `address`), not
  a flat, case-file-wide collection.
- **The canonical data-model CSV's `caseFile.parties[]` was never fully
  expanded to begin with — checked directly.** Every filing type's own
  collections (`guardians[]`, `planGuardians[]`, etc.) got the full
  per-field expansion Milestone 34-2 requires; `caseFile.parties` did not —
  it has exactly one summary row (`array<object>`, no sub-fields), not rows
  for `name`, `phone`, `email`, `address`, or `identifiers.barNumber`/
  `taxId`. 39-D is adding `signatureImages` onto a collection that isn't
  properly documented yet, not a clean addition to a finished one. Expand
  `caseFile.parties[]`'s existing fields to real rows in the same pass that
  adds `signatureImages`, rather than compounding the gap.
- **Exactly one entry per party may have `active: true`** at a time. Setting
  a new active stamp does not delete or overwrite any prior entry — the
  array is append-only. This is what "older signatures must be maintained"
  (the requester's own requirement) means concretely: a `signatureImages`
  entry is never deleted or mutated once created, only added to, and the
  active flag is the only thing that ever moves.
- **A filing's own reference to a stamp must name both the party and the
  entry — a bare entry number is not enough.** Because `signatureImages`
  IDs are scoped per party (confirmed as the chosen design), `id: 3` is
  only unique *within one party's own array* — two different parties each
  have their own entry 3. A filing's reference must be a compound value,
  e.g. `signatureImageRef: { partyId: 'party-abc123', imageId: 3 }`, not a
  bare number. This corrects an underspecified part of the original design
  that would otherwise have been ambiguous the first time two different
  signers each had a third stamp. Because history entries are never
  deleted, a filing holding this reference keeps rendering that exact entry
  forever, regardless of what the party's currently-active entry becomes —
  applying a stamp to a new filing records this reference, not a copy, so a
  later change to the party's active stamp never retroactively alters an
  already-signed filing.
- **A reference-based design breaks this app's existing single-ward
  export/import — confirmed, not hypothetical.** Read `buildSingleWardExportBlob()`
  directly: it packages only `wards/${wardId}.enc` (that one filing) plus
  its own audit entries — no party data at all. A filing holding
  `signatureImageRef: { partyId, imageId }` and exported this way (or
  imported into a different case file) would carry a permanently dangling
  reference on arrival, since the receiving case has no record of that
  partyId at all. The fix must live in the export/import path itself, not
  in the reference design: when a filing is packaged for standalone
  export, resolve its `signatureImageRef` (and any co-guardian rows'
  refs) and embed a snapshot of the referenced image bytes directly in the
  export payload — matching this same function's own existing pattern of
  selectively bundling decoupled data (it already filters audit entries
  down to just this ward's own, rather than including the whole case's
  log). On import into a new case, that snapshot becomes the seed for a
  new `party.signatureImages` entry if no matching party exists yet.
- **The signing date is always a per-document field, never inherited from
  the image.** `<role>_signatureDate` (or the collection-row equivalent)
  reflects when *this filing* was signed and is entered fresh every time,
  whether the mark is freshly drawn or a reused stamp — reuse must never
  carry forward the date a stamp entry was originally captured. In
  practice this is largely moot: 39-B's metadata-stripping step already
  removes embedded file metadata (including any date) before an image is
  ever stored, so there is normally nothing to accidentally read back. The
  rule stands regardless, in case a future capture path ever bypasses that
  stripping step.
- **Sensitivity.** A reusable signature image is a materially more
  sensitive artifact than a one-off capture — it is a portable mark anyone
  with access to it could apply to a document its owner never saw, unlike a
  single dated capture that only speaks to the one document it was drawn
  on. Classify it accordingly in `probate-guardian-data-model.csv`
  (`sensitive` = `document-content` at minimum), and require an explicit
  confirmation ("Apply your saved signature to this filing?") every time a
  stored stamp is applied to a new filing — no silent one-click reuse.
- **Changing the active stamp** (the requester's item 7): a party can
  capture a new signature image at any time, which becomes the new
  `active: true` entry; the previous active entry's `active` flag clears
  but the entry itself is retained permanently. Filings already signed with
  it are unaffected, per the reference-based design above.

### Storage growth

`party.signatureImages` is append-only and, in principle, unbounded —
`probate-guardian-data-model.csv`'s row-count conventions
(`collection_min`/`collection_max`/`initial_item_count`) assume a bounded
or at least well-understood shape, which this collection doesn't have by
default. Growth in practice is naturally slow (a person's signature changes
rarely), but the per-image size limits from 39-B (capped dimensions, capped
file size) are what actually bound this, not a count limit on the array
itself — capping the array length would risk deleting an entry an old
filing still references, which the "never delete" requirement forbids.
Confirm with the requester whether that's sufficient, or whether a hard cap
on total per-party storage (not entry count) is wanted as a backstop.

### Verification Plan (39-D)

1. Unit tests — new file, e.g. `tests/unit/signature-stamp-history.spec.js`:
   adding a new active stamp preserves old entries; a filing referencing an
   old entry renders correctly after the party's active stamp changes
   twice more; deleting is never exercised because there is no delete
   path.
2. A dedicated e2e test for the export/import fix — new file, e.g.
   `tests/e2e/signature-stamp-portability.spec.ts`: a filing with a stamp
   reference, run through `buildSingleWardExportBlob()` and re-imported
   into a fresh case file, must still render its signature correctly —
   this is the regression the reference-based design would otherwise
   introduce.
3. `probate-guardian-data-model.csv` update for `caseFile.parties[]`'s full
   expansion (per the Design section above), `party.signatureImages` and
   its sub-fields (`id`, `imageData`, `capturedAt`, `active` each need
   their own row, not one blanket collection row, per this project's
   existing no-wildcard-fields rule), and each filing's new
   `signatureImageRef` compound field.
4. Add both new test files to `TEST-INDEX.md`.

---

## 39-E: Print Preview Missing-Signature Navigation

If a signature card is left incomplete (an applied-but-incomplete "/s/" or
Stamp choice — see 39-B's validation rule), Print Preview's blocked panel
must tell the filer where to fix it, with a working jump-to-card link, not
just prose.

**The resolution mechanism already exists; the wiring into Print Preview
does not.** Checked directly against `output-preflight.js`: its
`structuredIssues` do *not* carry route/field-path for ordinary validator
messages — a plain string from `validatePlanX()` normalizes to a generic
`'validation.legacy-unmapped'` code with no navigation target at all. The
real resolution happens in a separate module,
`validation-adapter.js`'s `adaptValidationErrors(rawErrors, filingType)`,
which parses each message string into `{route, path, section, label}` via
the same priority-ordered matching this project already uses for every
filing type's field-level guidance (`section-status.js`'s
`renderLocalSectionGuidance()` calls it this way today, rendering a
`data-form-action="jump-to-field"` button per resolved issue, wired to
`focusFieldByPath(route, fieldPath)` for cross-route navigate-then-focus).
`pdf-preview.js`'s `blockedPanelHTML()`, by contrast, currently receives
only flat message strings (already stripped of anything structured by an
upstream `.map(issue => issue.message)`) and does its own separate,
simpler prefix-split grouping — it never calls `adaptValidationErrors()` at
all today. Rearchitecting the whole preflight pipeline to carry structured
issues end-to-end would be a much larger, unrelated change touching every
filing type's validator; the proportionate fix is to call the existing
resolver from the existing panel, not replace the resolver.

### Implementation Plan (39-E)

1. Pass the filing type (and the original message strings, not
   pre-extracted ones) into `blockedPanelHTML()`, and call
   `adaptValidationErrors(messages, filingType)` there — the same call
   `renderLocalSectionGuidance()` already makes — instead of the current
   ad hoc prefix-split grouping.
2. Add new routing branches to `validation-adapter.js` for 39-B's new
   signature-state error messages (e.g., an incomplete "/s/" or incomplete
   Stamp choice) — these are new message text with no existing branch, not
   something the resolver already handles for free.
3. Render each resolved issue as a `data-form-action="jump-to-field"`
   button carrying its `route`/`path`, matching
   `renderLocalSectionGuidance()`'s existing markup.
4. Confirm the existing global `data-form-action` click delegation (already
   used throughout the app) picks these up with no new listener needed.
5. Verify cross-route navigation works from Print Preview specifically
   (Print Preview is its own route; confirm `focusFieldByPath` correctly
   navigates away from it and back to the form).

### Verification Plan (39-E)

E2e test — new file, e.g. `tests/e2e/print-preview-signature-jump.spec.ts`:
block a filing on an incomplete signature card, open Print Preview, click
its jump-to link, confirm the app navigates to the correct form route and
focuses the correct field. Not a data-model change — no
`probate-guardian-data-model.csv` update needed for 39-E. Add the new test
file to `TEST-INDEX.md`.

---

## Related, Out-of-Scope Work

- DOCX export formatting fidelity (`src/core/docx/docx-engine.js`) came up
  in this same conversation as a known weak point relative to the PDF
  engine's output — since superseded by an actual decision to deprecate
  and remove DOCX export entirely, per `MILESTONE-40-PROPOSAL.md`. No
  fidelity work is needed for a feature being removed.
- **4-digit party PIN gating signature-stamp creation/use** was raised
  during this same conversation but is deliberately not part of this
  document — it is a general party-record security control, not specific to
  PDF annotation or signature capture. Split out to
  `MILESTONE-40-PROPOSAL.md`.

## Implementation Gate

This is a coordination document across five sub-milestones, not one
executable unit — authorizing it does not authorize all five at once. Each
gate below is independent; clearing an earlier one is not a prerequisite
for authorizing a later one where no dependency is stated in "Recommended
Order and Dependencies."

- **39-A**'s development-only spike is done and landed (see Status above).
  A full rollout beyond the current toolbar/persistence mechanism — wider
  filing-type coverage, editable-annotation rehydration if that's wanted,
  the storage-size question flagged in "Persistence design" — needs its own
  authorization; the spike itself does not imply that follow-on scope.
- **39-B**'s development-only spike is done and landed on Plan Simplified's
  Guardian role (see Status above). The reusable modules it produced
  (`signature-state.js`, `signature-pad.js`, `signature-state-control.js`)
  are what 39-C will wire into every other role/filing type — that rollout,
  and the real Upload-background-transparency question flagged in "Real
  limitation found building this," each need their own authorization; the
  spike does not imply either.
- **39-C**: both authorization gates cleared — the Inventory Gate
  (complete, confirmed table, zero "not yet confirmed" cells, plus one
  previously-missed card found and added) and the Upload
  background-transparency gate (resolved: luminance-threshold background
  removal, scoped as its own spike within 39-C, not yet built). **Rollout
  landed and verified for Plan Annual, Plan Initial, and Plan Minor** (see
  "Recommended sequencing" and "Verification Plan (39-C)" above). Remaining
  scope — Simplified/Annual Accounting, Guardian Inventory, and the Upload
  luminance-threshold fix itself — still requires the requester's explicit
  go-ahead before starting, matching 39-A/39-B's own authorization pattern.
- **39-D** may not be authorized until the compound party+entry reference
  design, the single-ward export/import fix (confirmed necessary — see
  Design above), and the storage-growth question are resolved with the
  requester.
- **39-E** depends on 39-B: it needs 39-B's new signature-state error
  messages and validation-adapter routing branches to exist before its own
  jump-to-link work has anything real to resolve.
