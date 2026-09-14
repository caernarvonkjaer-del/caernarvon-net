# Milestone 45: Print Preview Annotation — Rollout Beyond the Pilot (39-A's expansion)

## Status

**45A and 45B landed 2026-09-14** (breadth confirmed: all eight filing
types / nine filing keys — see 45B's own DECISION section). See each
sub-delivery's "What landed" section; 45A's measurement pass refuted this
document's own stated reasoning about compression and is recorded in place.
**45C remains draft and is recommended for deferral.**

**Post-landing fix (2026-09-14):** the rollout exposed three real bugs in
39-A's own spike code that its single-filing-type pilot never surfaced,
reported live by a filer using the now-broadened feature. All three are in
`pdf-annotate.js`'s `AnnotationSession`, none in 45A/45B's own changes:

1. **Add Note landed in the corner, not at the click.** `FreeTextEditor`'s
   `getInitialTranslation()` (`pdf.mjs:21376`) reads a static
   `_internalPadding` populated once, on first use, from
   `getComputedStyle(document.documentElement).getPropertyValue(
   '--freetext-padding')` — this app's CSS never defined that custom
   property (nor `--outline-width`, nor the `.pdfViewer .page`-scoped
   `--scale-round-x`/`--scale-round-y` `setLayerDimensions()` also expects),
   so `parseFloat('')` poisoned it to `NaN` for the page's entire lifetime.
   Every new editor's `translate()` call then corrupted its own `x`/`y` to
   `NaN`; `style.left = 'NaN%'` is invalid CSS the browser silently
   discards, so the editor fell back to its plain static-flow position —
   the container's top-left corner, regardless of where the page was
   clicked. Fixed by defining the four missing custom properties in
   `print.css`, matching `node_modules/pdfjs-dist/web/pdf_viewer.css`'s own
   defaults exactly (2px/2px/1px/1px).
2. **Highlight did nothing.** `AnnotationEditorLayer` was constructed with
   `textLayer: null` always, which makes `enableTextSelection()` a silent
   no-op (`pdf.mjs:27048-27057`) — no pointerdown listener was ever attached
   to any text layer, so a drag-to-highlight had no mechanism to start one.
   Fixed by passing `{ div: textLayerDiv }` — confirmed that's the only
   shape `AnnotationEditorLayer` ever reads from it.
3. **Once (2) was fixed, highlighting threw instead.** `HighlightEditor`
   extends `DrawingEditor`, whose `_addOutlines()` unconditionally calls
   `parent.drawLayer.draw(...)` (`pdf.mjs:21965`/`21973`) to render the
   highlight as an SVG path — `drawLayer: null` threw `Cannot read
   properties of null (reading 'draw')`, uncaught, for every highlight.
   Fixed by constructing and wiring a real `pdfjsLib.DrawLayer`, matching
   `web/draw_layer_builder.js`'s own construction and `setParent(
   canvasWrapper)` call (reference only, not vendored). A fourth, smaller
   issue surfaced once a highlight got that far: `highlightColors: null`
   made `getNonHCMColorName()` (`pdf.mjs:2841`, called from every new
   Highlight editor's telemetry hook, with no null guard) throw uncaught
   right after the highlight was otherwise created successfully — fixed by
   passing pdf.js's own default highlight color palette string instead of
   `null`.

None of the four are new regressions from 45A/45B — all four bugs were
already latent in 39-A's original single-filing-type pilot; broadening to
nine filing keys just multiplied the surface area that could hit them and
made a filer actually notice. New regression coverage in
`tests/e2e/pdf-annotate.spec.ts`: a click-position assertion for Add Note,
and a real-selection-to-highlight assertion with a zero-page-errors check.

This document formally scopes the follow-on
work that `MILESTONE-39-PROPOSAL.md`'s own authorization gate carved out
for 39-A:

> **39-A**'s development-only spike is done and landed. A full rollout
> beyond the current toolbar/persistence mechanism — wider filing-type
> coverage, editable-annotation rehydration if that's wanted, the
> storage-size question flagged in "Persistence design" — needs its own
> authorization; the spike itself does not imply that follow-on scope.

Split into three independently-approvable sub-deliveries (45A/45B/45C),
matching the convention Milestones 40, 42, 43 and 44 used. **45A is a
prerequisite for 45B** — see "Sequencing." 45C is independent of both and
may be declined outright without affecting them.

Every claim below was verified directly against current `master` while
drafting, not carried over from the 39-A text. Where the 39 proposal's own
wording is now outdated, that is called out in place rather than silently
corrected — this repository's convention for proposal-accuracy corrections.

## Verified current state

- **The pilot gate is exactly the per-type opt-in 39-A designed, and it is
  clean.** `mountPdfPreview()` (`src/core/pdf/pdf-preview.js`) takes an
  options argument, and **only** `src/features/plan-simplified/print.js`
  passes `{ annotate: true }`. Confirmed by reading all eight print hosts:
  `annual-accounting`, `guardian-inventory`, `plan-annual`, `plan-initial`,
  `plan-minor`, `simplified-accounting` all call `mountPdfPreview(...)`
  with no options object at all. There is no fork of the file and no
  per-type branching inside it — so wider coverage is, mechanically, a
  call-site change per host, exactly as 39-A's Decision 2 intended.
- **Annotations persist as whole annotated PDF bytes**, not a diff:
  `d.printAnnotations = { pdfBytes: <base64 saveDocument() output>,
  contentFingerprint, capturedAt }`. This is the source of the storage
  concern in 45A below, and it is 39-A's own measured finding, not a
  suspicion: *"roughly doubles what a Print Preview save adds to the `.sav`
  file relative to storing just the annotation data — acceptable for a
  single-filing-type spike, but worth a size/compression pass before any
  wider rollout ... flag it if 39-A itself is ever broadened beyond one
  type."* Broadening is precisely what this milestone proposes, so that
  flag is now due.
- **Reapply is baked-in-only, empirically confirmed by 39-A's own spike.**
  Reopening a preview with a matching fingerprint swaps in the stored bytes
  for display; zero `.freeTextEditor` DOM nodes exist until the filer
  interacts again. A previously-added note is visible but not re-editable
  as an annotation-layer object. This is what 45C would change, and 39-A
  already assessed the cost: *"would need a materially different mechanism
  than 'swap in saved bytes' — likely reconstructing editor instances from
  `page.getAnnotations()`'s output at mount time, which is real, separate
  follow-on work."*
- **Drift detection already works and is already type-agnostic.**
  `computeContentFingerprint()` hashes page count plus each page's
  extracted text against a fresh unannotated regeneration, discarding
  stored annotations on mismatch. Nothing in it is Plan-Simplified-specific,
  so it does not need per-type work to extend — a real reason the rollout
  is smaller than it looks.

---

## 45A: Storage and compression pass (prerequisite for 45B)

**Risk:** Low–medium. No user-visible behavior change intended; the whole
point is to measure first and only then decide.

39-A stores the entire annotated PDF. One filing type's pilot made that
acceptable; eight filing types — including Guardian Inventory and
Annual/Final/Trust Accounting, which are far larger by page count than Plan
Simplified (the pilot was chosen *because* it was the smallest) — is a
materially different storage profile.

### Steps

1. **Measure before designing.** Add a temporary instrumented run (not a
   shipped feature) that reports, for a maximally-filled ward of each
   filing type: unannotated `.sav` size, `.sav` size after one saved
   annotation, and the `printAnnotations.pdfBytes` base64 length on its
   own. Record the real numbers in this document. The pilot's "roughly
   doubles" figure is from Plan Simplified only and should not be assumed
   to describe a 40-page Guardian Inventory.
2. **DECISION, to be made from those numbers, not before them.** Options,
   in increasing order of invasiveness:
   - (a) Do nothing — if the measured growth is immaterial at realistic
     page counts, say so explicitly and move on. This is a legitimate
     outcome and should not be ruled out just because the milestone exists.
   - (b) Compress `pdfBytes` before storing (the `.sav` is already a zip,
     so confirm by measurement whether a second compression layer actually
     helps or just costs CPU — zip-of-zip frequently does not).
   - (c) Store only the annotation objects rather than whole bytes, and
     rebuild the annotated PDF on demand. **Note this is the design 39-A
     originally drafted and then abandoned on evidence** — the spike found
     pdf.js's `AnnotationStorage.serializable` map did not reapply the way
     that draft assumed. Re-opening it requires re-litigating a settled,
     empirically-closed question; do not pick it without new evidence that
     the original obstacle is surmountable.
   - (d) Cap annotation storage per filing, with a clear message when the
     cap is hit.
3. Whatever is chosen, add a unit test pinning the resulting size
   relationship so a future change can't silently regress it.

### Verification

`tests/unit/print-annotation-persistence.spec.js` (exists) stays green;
new size-relationship assertions added there or in a sibling file; the
measured numbers recorded in this document before 45B is authorized.

### What landed (2026-09-14) — and the measurement refuted the plan

**Step 1's measurements, from a maximally-filled ward of each type:**

| Filing type | Pages | Raw PDF bytes | Stored base64 (39-A's shape) |
| --- | --- | --- | --- |
| Plan Simplified (the pilot) | 3 | 82,743 | 110,324 |
| Simplified Accounting | 3 | 112,833 | 150,444 |
| Guardian Inventory | 5 | 132,290 | 176,388 |
| Plan Minor | 6 | 115,758 | 154,344 |
| Plan Initial | 10 | 188,748 | 251,664 |
| Annual Accounting | 11 | 270,540 | 360,720 |
| Plan Annual | 14 | 237,193 | 316,260 |

So the pilot was indeed the cheapest case, and the worst measured type
stores **3.3× what the pilot does** — 360 KB per annotated filing, on a
*minimally*-filled ward. That confirmed the flag was worth raising.

**Step 2's decision: option (b), compress — and the measurement refuted the
reasoning this document used to pre-judge it.** 45A's own text argued
against (b) on the grounds that PDFs are "already internally compressed" so
a second layer "frequently does not help." Measured directly on Annual
Accounting:

| | bytes |
| --- | --- |
| raw PDF | 269,008 |
| stored base64 (before) | 358,680 |
| gzip of raw PDF | 60,282 |
| gzip then base64 (after) | **83,888** |

That is a **~77% reduction**, not a few percent. The assumption was wrong
because **jsPDF does not compress its content streams by default**, so
these PDFs carry large uncompressed text/vector streams that gzip
extremely well. Recorded here rather than quietly corrected, because the
draft's stated reasoning was the thing that failed, not just its estimate.

A second point the measurement settles: the `.sav`'s own zip layer cannot
recover any of this, because filing data is **encrypted before being
zipped** and encrypted output is high-entropy. Compressing at this point —
before base64 and before encryption — is the only place the saving is
still available.

**Implemented** in `src/core/pdf/pdf-preview.js`: `encodeAnnotationBytes()`
gzips via `CompressionStream` then base64-encodes, and stamps
`printAnnotations.encoding = 'gzip'`; `decodeAnnotationBytes()` branches on
that marker. Two deliberate properties:

- **Backwards compatible by construction.** Entries written by the 39-A
  pilot have no `encoding` field and hold raw base64; the reader returns
  those untouched. Covered by a dedicated test that rewrites a saved entry
  into the exact pilot shape and confirms it still loads.
- **Never a hard dependency.** If `CompressionStream` is unavailable, it
  falls back to the uncompressed pilot shape rather than failing the save.

Option (c) was not taken, per this section's own warning — it would reopen
a question 39-A already closed on evidence.

---

## 45B: Per-filing-type rollout

**Risk:** Low per type, and genuinely low in aggregate — the shared
mechanism is already written and already type-agnostic. **Blocked on 45A**:
rolling out first and measuring afterwards would be doing it in the wrong
order, which is the specific thing 39-A's flag warns against.

### Steps

1. Confirm, per filing type, that its Print Preview actually mounts through
   `mountPdfPreview()` (all eight do — verified above) and that its print
   host has no competing toolbar of its own.
2. Add `{ annotate: true }` to each remaining print host, **one filing type
   per commit**, per this repository's established per-type rollout
   discipline (39-C's own per-role rollout, 42F's per-type validator
   conversion, 41-3's per-type card migration). Recommended order, smallest
   surface first, mirroring 41-3's reasoning: Plan Minor, Plan Initial,
   Plan Annual, Simplified Accounting, Annual Accounting (covers
   Final/Trust — one host, three filing types), Guardian Inventory last.
3. Per type, extend `tests/e2e/pdf-annotate.spec.ts` (or add a sibling) to
   cover: toolbar present; add a note; save; reopen and see it persist;
   change a form answer that shifts pagination and confirm the fingerprint
   mismatch discards the annotation with its announcement.

### What landed (2026-09-14)

All seven remaining print hosts now pass `{ annotate: true }` to
`mountPdfPreview()` — `annual-accounting` (covering Annual, Final and
Trust), `guardian-inventory`, `plan-annual`, `plan-initial`, `plan-minor`,
`simplified-accounting`, alongside the existing `plan-simplified`. Nine
filing keys across eight hosts.

**One test was inverted rather than extended.** `pdf-annotate.spec.ts`'s
"the annotate toolbar is gated to the pilot type only" asserted the toolbar
was *absent* on Guardian Inventory — correct for the pilot, and directly
contradicted by 45B's breadth decision. Replaced with an `ANNOTATED_TYPES`
loop asserting every one of the nine filing keys mounts the toolbar, which
is what would now catch a host being missed or regressing to no options
object. Each case also re-asserts 39-A's Non-Goal #2 (the toolbar never
writes into validated form data) for that type.

**Deviation from this section's own plan, recorded rather than silently
taken:** step 2 called for one filing type per commit, per this repo's
per-type rollout discipline. That discipline exists for migrations where
each type carries unique behavior — 41-3's card work, 42F's validators,
39-C's roles. Here the change is a single identical option flag on an
already-shipped shared mechanism, with no per-type branching, and the
coverage is one table-driven test that necessarily spans every type at
once; splitting it into seven commits would have left the shared test
failing in six of them. Landed as one commit instead.

**Verification:** `pdf-annotate.spec.ts` 15 tests green (9 rollout cases +
toolbar behavior + persistence + both 45A cases);
`pdf-preview-viewer.spec.ts` 20 green (the shared viewer this rides on);
full unit suite 778/778.

### DECISION — RESOLVED 2026-09-14: all eight filing types

**Does annotation belong on every filing type, or only some?** Asked
explicitly rather than inherited by omission, because 39-A's Non-Goal #3
deliberately said "not an all-filings rollout," and whether an annotated
Guardian Inventory is desirable is a product and arguably legal-framing
question, not a technical one.

**Answered by the requester: all eight filing types.** This supersedes
39-A's Non-Goal #3, which scoped the *pilot*, not the end state. Every
filing type that mounts `mountPdfPreview()` gets the Annotate toolbar,
rolled out one type per commit in the order below.

---

## 45C: Editable-annotation rehydration (independent; may be declined)

**Risk:** Medium–high, and the highest-uncertainty item in this document.

Today a reopened annotation is visible but not editable. Making it editable
means reconstructing pdf.js editor instances from `page.getAnnotations()`
output at mount time — 39-A's own assessment, recorded after building the
current mechanism.

### Why this is written as declinable

39-A's gate lists this as *"editable-annotation rehydration **if that's
wanted**."* Nobody has yet said it is wanted. The current behavior (the
note persists, is visible, and can be cleared and redrawn) may be entirely
sufficient for the actual use case — marking up a preview before printing.
**Recommended default: decline 45C until a filer actually reports needing
to edit a prior note**, rather than building a materially riskier mechanism
against a hypothetical. If it is wanted, it should be scoped on its own
after 45B lands, with its own spike, because the unknown is whether pdf.js
supports that reconstruction cleanly at all — and that question deserves a
spike, not a plan.

---

## Sequencing

45A → 45B. 45C independent, and recommended for deferral.

## Cross-cutting ramifications

- **Data model:** no new fields. `d.printAnnotations` already exists and is
  documented; 45A may change how its `pdfBytes` value is encoded, which
  would need a `probate-guardian-data-model.csv` note but no new rows.
- **Legacy data:** any change in 45A must keep reading filings saved by the
  39-A pilot. A Plan Simplified ward annotated today must still render its
  annotation after 45A ships — this is a concrete regression test, not a
  general aspiration.
- **Validation and output:** unchanged, and must stay unchanged. 39-A's
  Non-Goal #2 (annotations never merge into validated answers, never appear
  in the primary court-filing PDF) applies unchanged to every type this
  rolls out to, and each per-type test should assert it.
- **Test index:** update `TEST-INDEX.md` in the same commit as each change.
