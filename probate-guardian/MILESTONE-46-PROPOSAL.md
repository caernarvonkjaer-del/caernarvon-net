# Milestone 46: Reusable, Versioned Per-Party Signature Stamp (39-D promoted)

## Status

**Draft — do not implement yet. One genuine open question needs the
requester's answer before any code is written; see "Open question" below.**

This document promotes `MILESTONE-39-PROPOSAL.md`'s 39-D from a
recommendation-recorded draft into a formally scoped milestone. 39-D's own
authorization gate reads:

> **39-D** may not be authorized until the compound party+entry reference
> design, the single-ward export/import fix (confirmed necessary), and the
> storage-growth question are resolved with the requester.

Status of those three gate items, checked against the 39 proposal and
against current `master`:

| Gate item | State |
| --- | --- |
| Compound party+entry reference design | **Resolved in the draft** — `signatureImageRef: { partyId, imageId }`, because `signatureImages` ids are per-party scoped. Carried forward unchanged below. |
| Single-ward export/import fix | **Resolved in approach, still unbuilt** — re-verified as genuinely necessary against current code (see below). Scoped as 46C. |
| Storage-growth question | **Still open — needs the requester.** See "Open question." |

Split into three sub-deliveries (46A/46B/46C) with a strict order, since
each genuinely depends on the previous one.

---

## What changed since 39-D was drafted

**One of 39-D's stated premises is now outdated, and it shrinks the work.**
39-D's Design section says:

> The canonical data-model CSV's `caseFile.parties[]` was never fully
> expanded to begin with — checked directly. ... it has exactly one summary
> row (`array<object>`, no sub-fields), not rows for `name`, `phone`,
> `email`, `address`, or `identifiers.barNumber`/`taxId`. 39-D is adding
> `signatureImages` onto a collection that isn't properly documented yet
> ... Expand `caseFile.parties[]`'s existing fields to real rows in the same
> pass that adds `signatureImages`, rather than compounding the gap.

That was true when written. It is not true now: `probate-guardian-data-model.csv`
currently carries **18 `caseFile.parties` rows**, including
`parties[].id`, `parties[].roles`, `parties[].name`, and
`parties[].identifiers.taxId` — the expansion 39-D wanted to bundle in has
since happened independently. **Verify the row set is complete for the
fields this milestone touches before relying on that**, but the bundled
expansion work item is removed from scope on current evidence.

**Two premises re-verified as still accurate:**

- `signatureImages` appears **nowhere** in `src/` (zero matches) — this
  capability is genuinely unimplemented, not partially present.
- `buildSingleWardExportBlob()` (`src/core/persistence/case-file.js`) still
  packages only `wards/${ward.wardId}.enc` plus that ward's own filtered
  audit entries — **no party data at all**. So the dangling-reference
  problem 39-D identified is real and unaddressed, and 46C is not optional
  cleanup: it is what keeps a reference-based design from breaking an
  existing, shipped feature.

---

## Open question (blocks authorization)

**Is a per-image size cap sufficient, or is a hard cap on total per-party
signature storage wanted as a backstop?**

The constraint that makes this a real question: `party.signatureImages` is
**append-only and never deleted** — that is the requester's own "older
signatures must be maintained" requirement, and it is load-bearing, because
a filing signed with an old stamp holds a reference to that exact entry and
must keep rendering it forever. So the array cannot be trimmed to reclaim
space without breaking already-signed filings.

That leaves two honest options:

- **(a) Rely on 39-B's existing per-image limits** (capped dimensions,
  capped file size) and accept unbounded count. Growth in practice is slow —
  a person's signature changes rarely. **Recommended default.**
- **(b) Add a hard cap on total per-party signature bytes** as a backstop,
  which must refuse a *new* capture when full rather than delete an old
  entry, and therefore needs a user-facing message and a decision about
  what the filer does next.

Option (b) is materially more UI and error-path work for a scenario that may
never occur. This needs an answer, not a guess — it changes 46A's scope.

---

## 46A: Data model and the append-only store

**Prerequisite:** the open question above must be answered.

1. Add `party.signatureImages` — an array on the party record via
   `party-resolver.js`'s existing per-party convention (alongside `name`,
   `phone`, `email`, `address`), **not** a case-file-wide collection. Each
   entry: `{ id, imageData, capturedAt, active }`, with `id` a permanent
   incrementing counter **scoped to that party**.
2. Enforce the two invariants in code, not by convention: **at most one
   entry per party has `active: true`**, and **no entry is ever deleted or
   mutated once created** — the array is append-only and the `active` flag
   is the only thing that ever moves.
3. `probate-guardian-data-model.csv`: one row per sub-field (`id`,
   `imageData`, `capturedAt`, `active`), per this project's
   no-wildcard-fields rule — not one blanket collection row. Classify
   `imageData` as `sensitive = document-content` at minimum: a reusable
   signature is a portable mark someone could apply to a document its owner
   never saw, which is categorically more sensitive than a one-off dated
   capture.
4. `npm run verify:data-model` must pass.

### Verification

New `tests/unit/signature-stamp-history.spec.js`: adding a new active stamp
preserves all prior entries and clears only the old `active` flag; ids stay
per-party and never collide across parties; there is no delete path to test
because none exists.

---

## 46B: Applying a stamp to a filing

**Depends on 46A.**

1. Each filing's signature card gains `signatureImageRef: { partyId,
   imageId }` — a **compound** reference. A bare `imageId` is insufficient
   and this is not a stylistic choice: ids are per-party scoped, so `id: 3`
   is ambiguous the first time two different signers each have a third
   stamp.
2. Applying a stamp records **the reference, not a copy**, so a later change
   to the party's active stamp never retroactively alters an
   already-signed filing.
3. **The signing date is always per-document**, entered fresh every time,
   never inherited from the stamp entry's `capturedAt`. (Largely moot in
   practice — 39-B's metadata-stripping already removes embedded dates
   before storage — but the rule stands in case a future capture path
   bypasses stripping.)
4. **Require an explicit confirmation every time** a stored stamp is applied
   to a new filing ("Apply your saved signature to this filing?"). No silent
   one-click reuse — this follows directly from the sensitivity
   classification in 46A.
5. Wire the "Use my saved stamp" affordance into the existing
   `signature-state-control.js` Stamp state rather than adding a fourth
   signature state.

### Verification

Extend `tests/e2e/signature-capture.contract.spec.ts`: a filing referencing
entry 2 still renders entry 2's mark after the party's active stamp changes
twice more; the confirmation prompt appears on every apply; the filing's own
signature date is independent of `capturedAt`.

---

## 46C: Single-ward export/import portability

**Depends on 46B. Not optional** — without it, 46B ships a regression in an
existing shipped feature.

1. When a filing is packaged by `buildSingleWardExportBlob()`, **resolve
   every `signatureImageRef` (including co-guardian rows') and embed a
   snapshot of the referenced image bytes in the export payload.** This
   matches that same function's existing pattern of selectively bundling
   decoupled data — it already filters the audit log down to just this
   ward's own entries rather than shipping the whole case's log.
2. On import into a different case file, that snapshot seeds a new
   `party.signatureImages` entry when no matching party exists.
3. The fix lives in the export/import path, **not** in the reference design
   — the compound reference is correct; standalone export is what needs to
   carry its own copy.

### Verification

New `tests/e2e/signature-stamp-portability.spec.ts`: a filing with a stamp
reference, exported via `buildSingleWardExportBlob()` and re-imported into a
**fresh** case file, still renders its signature. This is the exact
regression a reference-based design introduces if 46C is skipped, so this
test is the milestone's real exit criterion.

---

## Sequencing

46A → 46B → 46C, strictly. Do not land 46B without 46C in the same
milestone: the window between them is a period where standalone export
silently produces filings with dangling signature references.

## Cross-cutting ramifications

- **Legacy data:** filings signed before this milestone hold
  `signatureImage` (a direct copy, per 39-B) rather than a reference. Both
  shapes must render indefinitely; this milestone adds a path, it does not
  migrate or retire the existing one.
- **Security:** `imageData` is `document-content`-sensitive and rides the
  existing at-rest encryption in `src/core/persistence/`. The new exposure
  this milestone creates is *reuse*, which is why the per-apply confirmation
  in 46B is a requirement and not a nicety.
- **Test index:** add all three new test files to `TEST-INDEX.md` in the
  same commits.
