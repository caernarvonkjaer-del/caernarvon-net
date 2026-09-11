# Milestone 39: Light In-App PDF Editing for Print Preview

## Status

**Draft only — do not implement yet.** This document captures a research
conversation, not an approved implementation plan. It authorizes no runtime,
dependency, or build change. Several open questions below must be answered by
the requester before implementation starts, and the recommended first step is
a small spike, not a full rollout.

## Goal

Let a filer make light text edits directly on the Print Preview's rendered
PDF — add a text note, edit existing text, adjust font size, highlight —
similar to Adobe Acrobat's basic editing tools, without building a PDF editor
from scratch and without the edits silently diverging from the filing's
underlying validated data.

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
find an existing open-source component instead.

## Findings: Recommended Approach

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
- Edits are written as **real PDF annotation objects** — FreeText/Ink/Stamp/
  Highlight — not rasterized into the page. The resulting file stays a
  standard, portable PDF: any other PDF tool, including Acrobat itself, can
  open it and keep editing those same annotations.
- This also bounds the main architectural risk of in-app editing: because
  edits live as annotations layered on the rendered PDF rather than as
  changes fed back into the form data, they can't silently make the exported
  document say something the stored, validated filing answers don't. They
  are additive and visually distinct from the underlying content, not a
  rewrite of it.

### Gaps and things not yet confirmed

- **This app currently vendors only `pdf.js`'s rendering core**
  (`lib/pdfjs/pdf.mjs` + `pdf.worker.min.mjs`), used solely to draw pages to
  a canvas. The `AnnotationEditorLayer` lives in `pdf.js`'s `web/` viewer
  layer, which is not currently pulled in. Integrating it is a scoped
  addition, not a rewrite, but it is real work, not a config flag.
- **No pre-built toolbar ships with it.** The editor is a mode toggled via
  `pdf.js`'s `eventBus` (`switchannotationeditormode` /
  `switchannotationeditorparams`); this app would need to build its own
  small set of buttons (Edit toggle, Add Text, Highlight, etc.) to drive it.
- **Underline support for FreeText annotations was not confirmed** from the
  documentation reviewed (font size and color are). This needs direct
  verification against the actual API before any UI promises it.
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

## Non-Goals / Out of Scope

1. Not a general-purpose PDF editor — only the light-touch modes above.
2. Not a change to the underlying filing data model. Preview annotations are
   not synced back into `window.D` or any persisted answer; they exist only
   on the rendered/exported PDF. (This is a recommendation from the research
   above, not yet confirmed as a hard decision by the requester.)
3. Not (yet) a commitment to which filing types or Preview pages get this —
   see Open Questions.
4. Not the DOCX export fidelity work. That was raised in the same
   conversation as a related gap, but it is a separate, independently
   valuable item — see "Related, Out-of-Scope Work" below.

## Open Questions

These need answers from the requester before or at implementation start —
none are decided by this document:

1. Which editor modes are actually wanted: FreeText + Highlight only, or
   also Ink and/or Stamp?
2. Confirm the real available FreeText controls (size, color) and settle
   whether underline is available or needs a workaround, before any UI
   copy promises it.
3. Scope: which filing type(s) and which Preview page(s) get this control —
   all nine filing types, or a pilot subset?
4. **Annotation persistence across re-export.** Because edits live on the
   rendered PDF, not the form model, a filer who re-opens the form, changes
   an answer, and re-generates the PDF will get a fresh render with none of
   the prior annotations. Is that acceptable (edit-then-export is a final
   step), or does this need a persistence/merge strategy — and if so, what
   would that even mean given the annotations reference a specific prior
   render?
5. **Accessibility.** This app has significant existing PDF accessibility/
   WCAG test coverage (e.g. `tests/e2e/pdf-accessibility-and-signatures.spec.ts`,
   `pdf-structure-tags.spec.ts`). Annotations added through this layer need
   to be checked against that bar, and the in-app editing UI itself needs
   its own accessibility pass (keyboard operation, screen-reader labeling
   for the toolbar and the annotation layer).

## Recommended Implementation Plan (spike first)

1. **Spike, one Preview page only** (Simplified Plan is the smallest filing
   type, a reasonable pilot). Pull in the additional `pdf.js` `web/` viewer
   pieces the `AnnotationEditorLayer` needs, alongside the currently-vendored
   rendering core, behind a dev-only entry point — no change to the shipped
   Preview experience yet.
2. Build the minimal toolbar: an Edit toggle plus FreeText and Highlight
   buttons, wired to `pdf.js`'s `eventBus` mode-switch events.
3. Verify FreeText's actual font-size/color controls, and settle the
   underline question empirically.
4. Confirm the edited PDF downloads correctly and reopens correctly —
   including in an external viewer, to prove the annotations are standard
   and portable, not an artifact of this integration.
5. Report the spike's findings back to the requester — actual effort
   observed, what the resulting UI looks like, anything surprising — before
   deciding on full rollout scope. Do not proceed past the spike without
   that check-in.

## Verification Plan (for the later full rollout, after the spike)

1. Focused e2e coverage for the new toolbar controls on whichever page(s)
   the spike is expanded to.
2. Confirm no regression to the existing PDF accessibility/WCAG suite.
3. Add or update `TEST-INDEX.md` for every new or repurposed test file.
4. Run focused tests during implementation; request permission before a
   full-suite run, per `AGENTS.md`'s test policy.

## Related, Out-of-Scope Work

DOCX export formatting fidelity (`src/core/docx/docx-engine.js`) came up in
the same conversation as a known weak point relative to the PDF engine's
output. It is not part of this milestone's scope, but is worth its own
proposal if the requester wants it pursued — it would also independently
improve the "export and lightly edit outside the app" fallback path.

## Implementation Gate

Do not start any part of this milestone — including the spike — until the
requester reviews the open questions above and explicitly authorizes
proceeding.
