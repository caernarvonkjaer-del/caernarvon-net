# Milestone 46: Reusable, Versioned Per-Party Signature Stamp (39-D promoted)

## Status

**Landed 2026-09-14 as 46A + 46B. 46C was cancelled, not deferred.**

39-D's central design choice — a filing storing a `{ partyId, imageId }`
reference rather than a copy — was reversed during 46B after its own stated
justification didn't hold up (a copy is equally immutable; the real tradeoff
was storage dedup versus export portability, and portability won). Applying
a saved stamp now copies bytes into the filing's existing 39-B
`signatureImage` field, which removed the entire export/import sub-delivery
from the milestone. See "46B: What landed" and "46C: REMOVED".

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
| Compound party+entry reference design | **Resolved, then reversed in 46B** — the compound shape was correct *if* a reference were used at all, but copy-on-apply proved the better call. Per-party id scoping still matters for 46A's store itself. |
| Single-ward export/import fix | **Moot** — the reference design it protected was dropped in 46B, so there is nothing to repair. The analysis stands and is what motivated dropping it. |
| Storage-growth question | **Resolved 2026-09-14 — option (a).** See "Open question." |

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

## Open question — RESOLVED 2026-09-14: option (a)

**Answered by the requester: per-image limits only.** Rely on 39-B's
existing capped dimensions and capped file size; accept unbounded entry
count, since a person's signature changes rarely. **No total-per-party cap,
and therefore no "storage full" refusal path, message, or recovery flow** —
that whole branch of UI and error handling is out of scope for this
milestone. 46A implements the append-only store with no count or byte
ceiling of its own.

The original question and its reasoning are kept below, because the
constraint that made it a real question still governs the design.

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
  a person's signature changes rarely. **Recommended default — and the
  option chosen.**
- **(b) Add a hard cap on total per-party signature bytes** as a backstop,
  which must refuse a *new* capture when full rather than delete an old
  entry, and therefore needs a user-facing message and a decision about
  what the filer does next.

Option (b) is materially more UI and error-path work for a scenario that may
never occur. This needs an answer, not a guess — it changes 46A's scope.

---

## 46A: Data model and the append-only store

**Prerequisite:** satisfied — the open question above was answered
2026-09-14 (option (a), per-image limits only, no total-per-party cap).

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

## 46B: What landed (2026-09-14) — and why the reference design was dropped

**39-D's central design choice did not survive scrutiny, and was reversed
with the requester's agreement.** Its Design section argued a filing must
store `signatureImageRef: { partyId, imageId }` — *"records this reference,
not a copy, so a later change to the party's active stamp never
retroactively alters an already-signed filing."* That justification does
not actually distinguish the two options: **a copy is immutable too.** A
filing holding its own bytes is equally unaffected by anything the party
does later.

The real tradeoff is different from the one the design stated:

| | Reference | Copy |
| --- | --- | --- |
| Old filing keeps its exact mark | Yes | Yes |
| Storage | One image shared across filings | One per signed filing |
| Single-ward export | **Breaks** — dangling `partyId` in any other case file | Works, untouched |
| Extra machinery needed | 46C's export/import snapshot fix | None |

Since a signature PNG is small under 39-B's existing per-image caps, the
dedup benefit is minor and the portability cost is real. **Decision:
copy-on-apply.** Applying a saved stamp writes the bytes into the filing's
existing 39-B `signatureImage` field.

Consequences, all verified rather than assumed:

- **No new filing-level field.** `signatureImageRef` was never added — the
  existing `signatureImage` carries it, so no filing-side data-model change
  and no new rows in `probate-guardian-data-model.csv`.
- **46C is removed from this milestone entirely** (see below). The
  dangling-reference problem it existed to solve cannot occur.
- **`buildSingleWardExportBlob()` is untouched**, so single-ward export and
  import keep working exactly as before with no new code.

**What was built:**

- `partySlotForSignaturePath()` / `partyForSignaturePath()`
  (`party-resolver.js`) map a signature control's `path` to its role/index
  slot and resolve the linked party — the three shapes
  `renderSignatureStateControl()` is ever called with across all nine filing
  types (`planGuardians.N`, `guardians.N`, `attorney`, `preparer`). This is
  what let the affordance work generically instead of each filing type
  wiring it through by hand.
- Capturing a stamp now also appends it to that party's history via
  `addSignatureImage()` — which is what finally populates 46A's store;
  nothing else would have. Best-effort and never blocking: a slot not yet
  linked to a party still signs normally, it just has nothing to reuse.
- A "Use my saved signature" button appears in the Stamp state when the
  linked party has an active stamp. **Every apply is confirmed**, per 46A's
  sensitivity classification — a reusable mark must never attach silently
  to a document its owner never saw.

**One implementation detail worth recording:** the affordance is inserted as
a *sibling before* the pad's mount element, not inside it. `mountSignaturePad()`
assigns `innerHTML` on that element, which silently wiped the button out
from under the first implementation — caught by the new tests failing, not
by inspection.

**Verification:** new `tests/e2e/signature-stamp-reuse.spec.ts` (4 tests)
covers the cross-filing reuse flow through the real party-linking UI, the
confirmation being required, declining applying nothing, an unlinked slot
offering nothing while still signing, and an already-signed filing keeping
its exact mark after the party captures a newer stamp. No regression:
`signature-capture.contract.spec.ts` 33 green, `party-write-through.spec.ts`
green, full unit suite 789/789. The five new `window.*` globals were caught
by Milestone 42C's frozen-bridge guard and added deliberately to the
checked-in allowlist, with `window-bridge.d.ts` regenerated.

---

## 46C: REMOVED — not needed under copy-on-apply

**This sub-delivery is cancelled, not deferred.** It existed solely to stop
a reference-based design from breaking single-ward export/import. With 46B
storing copies, a filing's signature travels inside the ward payload that
`buildSingleWardExportBlob()` already packages, so there is no dangling
reference to repair and no export/import change to make.

The original scope is kept below for the record, because the *analysis* that
produced it remains correct and is what justified dropping the reference
design in the first place — `buildSingleWardExportBlob()` genuinely does
package only `wards/${wardId}.enc` plus that ward's own filtered audit
entries, with no party data, re-verified against current `master`.

### Original scope (not implemented)

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

Planned as 46A → 46B → 46C strictly, with the warning that landing 46B
without 46C would leave a window where standalone export silently produced
filings with dangling signature references. **That risk was designed out
rather than sequenced around:** 46B stores copies, so there are no
references to dangle and 46C was cancelled. Delivered as 46A → 46B.

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
