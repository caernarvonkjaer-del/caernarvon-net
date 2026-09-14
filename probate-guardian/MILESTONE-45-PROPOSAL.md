# Milestone 45: Print Preview Annotation — Rollout Beyond the Pilot (39-A's expansion)

## Status

**Draft — do not implement yet.** This document formally scopes the
follow-on work that `MILESTONE-39-PROPOSAL.md`'s own authorization gate
carved out for 39-A:

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

### DECISION required before starting

**Does annotation belong on every filing type, or only some?** Do not treat
"all eight" as the default answer just because the mechanism generalizes.
An annotated court filing is a document a filer may print and hand to a
court; whether that is desirable on, say, a Guardian Inventory is a product
and arguably a legal-framing question, not a technical one. 39-A's Non-Goal
#3 deliberately said "not an all-filings rollout" — this milestone should
confirm the intended breadth explicitly rather than inherit it by omission.

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
