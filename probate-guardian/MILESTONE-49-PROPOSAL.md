# Milestone 49: Two-Record Compare & Unmerge; Ward Identity as a Shared Role

## Status

**Landed 2026-09-14 as Milestone 49 + 49B. This document is a backfill,
written 2026-09-15.**

Like Milestones 47 and 48, 49 and 49B were implemented and committed straight
to `master` with no `MILESTONE-49-PROPOSAL.md` ever existing first. This is
the third instance of that pattern in this repository, and it was found the
way the other two were — by someone going looking for a document that turned
out never to have been written. Nothing in the repository references a
Milestone 49 proposal.

Both commits were authored under Alan's own git identity
(`caernarvonkjaer-del <caernarvonkjaer@gmail.com>`) with
`Co-Authored-By: Claude Fable 5.1` — so unlike 47 and 48 (which came from the
GitHub collaborator `egarrett021`), this was an in-session agent delivery:

- `f4a87ec` — 2026-09-14 20:59:54 -0400 — "feat: two-record Compare, unmerge
  with one-level tracking, near-name matches (Milestone 49)"
- `ec0b5cf` — 2026-09-14 21:36:19 -0400 — "feat: ward identity as a shared
  role; closed filings cut off until synced (Milestone 49B)"

This document reconstructs what shipped from those two commits' diffs and
messages, in the format this repository's other milestone docs use, so 49 has
the same paper trail. **It does not represent a plan that was reviewed and
authorized before the fact** — that step didn't happen here.

**Provenance.** Unlike Milestone 47, there is no dangling reference to a
lost planning artifact: neither commit message cites a lettered decision or a
numbered flag from an uncommitted document. Both messages are unusually
complete and carry their own rationale, including the product intent
("That was never the intent (per Alan)"). Everything below is derived from
the diffs and those messages. What is **not** recoverable is the set of
alternatives that were considered and rejected while scoping — those were
never written down, and this document does not invent them.

**Why 49 has no sub-delivery letters past B.** The dead-code and
parallel-implementation sweep originally handed over as "Milestone 49" is a
different body of work and was renumbered; it is
`MILESTONE-51-PROPOSAL.md`.

---

## 49: Two-Record Compare, Unmerge, and Near-Name Matching

### Observed (pre-49)

Manage Shared Records surfaced duplicate-party candidates only when two
records had an exactly matching normalized name. Two consequences:

- A real duplicate that differed by spacing, punctuation, an accent, a
  "Last, First" ordering, a middle name or initial, or a one-character typo
  was invisible — the user had no way to act on a pair the app didn't
  volunteer.
- A merge was a one-way operation. `mergeParties()` left a tombstone
  (`mergedInto`) on the merged-away record and nothing else, so a merge made
  in error could not be undone; the only recovery was reconstructing the
  record by hand.

The merge action was also labelled "Keep This One," which describes the
outcome ambiguously — it does not say what happens to the values on the
record being discarded.

### Design

Three changes, per the commit message:

1. **Manual Compare.** Any two directory records can be ticked to compare,
   regardless of whether detection proposed them. The pair surfaces above the
   list as a "Selected by you" candidate carrying the same merge buttons as a
   detected one. A third checkbox is disabled rather than hidden, so the
   two-record limit is visible rather than silently enforced.
2. **Merge with a reversal record.** "Keep This One" becomes **"This One is
   Primary"** — the primary survives with its own values, and only fields
   *blank* on the primary are filled from the sub. `mergeParties()` writes a
   `mergeRecord` on the sub capturing exactly what the merge changed: adopted
   fields, adopted roles, repointed filing slots, and repointed cases.
   `unmergeParty()` reverses it.
3. **A lower-confidence detection tier.** "Possible match" covers normalized
   spacing/punctuation/accents, `Last, First` ordering, middle name or
   initial, and 1–2 character typos scaled to name length. **Suffixes are
   never stripped** — Jr. and Sr. are different people, and collapsing them
   would merge two parties in a court filing.

**Unmerge scope — one level only.** A sub's own subs stay hidden until that
sub is itself unmerged, and tombstones written before merge tracking existed
(`mergedInto` set, no `mergeRecord`) cannot be unmerged at all. That
limitation is recorded in the data-model CSV as unchanged pre-tracking
behavior rather than treated as a defect.

### Implementation

- **`src/core/party-resolver.js`** (+212 lines): new exports
  `normalizePartyName()`, `namesNearlyMatch()`, `subPartiesOf()`,
  `unmergeParty()`, plus internal `editDistance()`, `sharesContactDetail()`
  and `partyPathValue()`. `mergeParties()` extended to write `mergeRecord`.
  Four new `window.*` bridges.
- **`src/legacy-app.js`** (+105 lines): `manualCompareCandidate()`,
  `partyMatchBadge()`, `partyDedupeCardHTML()`, `partySubRowHTML()`,
  `togglePartyCompareSelection()`, `clearPartyCompareSelection()`,
  `togglePartyUnmergeSelection()`, `doPartyUnmergeSelected()`.
- **`src/form-events.js`**, **`src/core/types/parties.js`**,
  **`src/core/types/window-bridge.d.ts`**, **allowlist** — wiring and
  declarations.
- **`probate-guardian-data-model.csv`**: ten new rows for `mergeRecord` and
  its nested shape (`mergedAt`, `adoptedFields`, `adoptedRoles`,
  `repointedSlots[]` with `wardId`/`role`/`index`, `repointedCases`), plus a
  clarification to the existing `mergedInto` row to name the survivor as the
  "primary." Each row documents the unmerge semantics — e.g. an adopted field
  is cleared on unmerge *only if the primary still holds the sub's value*, so
  a field edited since the merge is not reverted.

### Verification

- **`tests/e2e/party-dedupe.spec.ts`** (+88 lines) and
  **`tests/e2e/party-resolver.spec.ts`** (+179 lines): two-checkbox Compare
  selection with the third disabled, "This One is Primary" merge, sub listed
  beneath its primary, Unmerge Selected restoring it, near-name candidate
  tier, `mergeRecord` written on merge, `unmergeParty()` full undo with
  edited-since-merge fields kept, one-level-only sub visibility, and
  pre-tracking tombstones never listed.
- `TEST-INDEX.md` rows for both specs updated in the same commit (§7).
- The commit also repaired two older dedupe tests that reached the Help panel
  from inside a filing — since Milestone 48 the in-filing "?" opens the user
  guide instead, so those tests now route via the dashboard.

### Cross-cutting notes (`AGENTS.md` §8)

**Data Model:** ten new CSV rows, in the same commit, per §3. **Legacy Data
Migration:** explicitly handled — a tombstone predating merge tracking has no
`mergeRecord` and stays un-unmergeable rather than being synthesized, and is
never listed as a sub. **Legal/Compliance:** the suffix rule is the one with
consequence — merging a "Jr." into a "Sr." would misidentify a party in a
filed document, and detection deliberately declines to do it.

---

## 49B: Ward Identity as a Shared Role; Closed Filings Cut Off Until Synced

### Observed (pre-49B)

The ward `Party` held only name and county. Two consequences, per the commit
message:

- Manage Shared Records' comparison view showed nothing else for a ward, so
  two ward records could not meaningfully be compared.
- Residence and SSN never followed the person between filings — each filing
  re-collected them, and a corrected address on one filing left the others
  stale.

The commit message records this as a gap rather than a design choice:
those are semi-permanent facts that should be shared, *with a closed filing
frozen as filed* ("That was never the intent (per Alan)").

### Design

**Ward becomes a full identity role, per filing type.** `ROLE_FIELD_MAPS`
gains a `ward` entry for every type:

- name on every type;
- SSN on Simplified Accounting and Annual Plan;
- residence address and phone on the Initial, Annual and Minor Plans, with
  Plan Minor's split city/state/zip joined on read and split on write;
- mailing address on Initial/Annual Plan, onto a new Party `mailingAddress`
  field, kept separate from the residence (which maps onto `address.*`).

County is deliberately excluded — it keeps its own rule in
`src/core/navigation/ward-county.js` (Milestone 40C-A/40C-1), which takes
county from the Party but under a unanimity-and-conflict policy the other
identity fields don't need.

**Closed filings are cut off in both directions.** A filing marked Closed on
the dashboard (`archived`) is frozen for every role: party edits don't reach
it, its own edits don't leave it, and merge/unmerge move its FK link without
rewriting its content. Marking it Open resumes live sync from the next edit
without retroactively rewriting anything — so reopening never silently
rewrites a filing the user hasn't touched.

**Drift is reported, not auto-resolved.** `closedFilingDrift()` and
`filingDriftFromParties()` report what has fallen behind. Manage Shared
Records lists each stale closed filing under its record with "Sync with
Current" (plus a Sync All), and the closed filing's own Cover shows the same
notice per slot. The user chooses.

**Linking reconciles rather than overwrites.** Linking a slot that already
has content (carry-over, or the first Cover county) now reconciles it with
the Party — Party wins, filing fills gaps — so the mirror holds from the
start rather than diverging until the next edit. A load-time backfill fills
the ward Party from its filings, and open filings from the Party, **without
overwriting a value or touching a closed filing**.

### Implementation

- **`src/core/party-resolver.js`** (+232 lines): `isFilingClosed()`,
  `closedFilingDrift()`, `filingDriftFromParties()`,
  `reconcileSlotWithParty()`, `backfillWardPartyIdentity()`,
  `syncFilingSlotWithParty()`, plus internal `slotDrift()`,
  `splitCityStateZipValue()` and `joinCityStateZipValue()` for Plan Minor's
  split fields. Six new `window.*` bridges.
- **`src/legacy-app.js`** (+96 lines): `filingLabel()`, `slotLabel()`,
  `partyReferenceLinesHTML()`, `partyClosedDriftHTML()`,
  `doPartySyncClosed()`, `doPartySyncClosedAll()`,
  `renderClosedFilingSyncNotice()`, `doFilingSyncClosed()`. Comparison cards
  gain County and Mailing Address rows and list the filings each record is
  used by.
- **`src/core/navigation/router.js`** and **`ward-county.js`**: the load-time
  backfill rides the existing load hook (`ward-county.js:277`).
- **`probate-guardian-data-model.csv`**: two new rows,
  `parties[].mailingAddress.street` and `.cityStateZip`, both classified
  **`personal`** sensitivity.

### Verification

- **`tests/e2e/closed-filing-sync.spec.ts`** (new, +101 lines): drives the
  whole thing through the real UI — residence details shared between two
  Plans linked to one ward Party; Mark Closed cutting a filing off; Manage
  Shared Records listing the stale closed filing with "Sync with Current";
  the closed filing's own Cover showing the same notice and syncing one slot;
  Mark Open not rewriting until the next live edit.
- **`tests/e2e/party-resolver.spec.ts`** (+161 lines): ward identity role per
  type (SSN, residence, split city/state/zip, mailing), closed-filing cut-off
  in both directions, the three drift/sync functions, and merge/unmerge
  leaving a closed copy alone.
- `TEST-INDEX.md` updated in the same commit, including a new row for
  `closed-filing-sync.spec.ts` (§7).

### Cross-cutting notes (`AGENTS.md` §8)

**Data Model:** two new CSV rows in the same commit (§3). **Legacy Data
Migration:** the load-time backfill is the migration, and its rule is
non-destructive by construction — it fills blanks only, never overwrites, and
never touches a closed filing, so no existing `.sav` resolves to a *less*
complete state than it had (§8's explicit requirement). **Security &
Sensitivity:** ward SSN and residence now live on a shared `Party` record
rather than only on individual filings, and `mailingAddress.*` is classified
`personal` in the CSV. The threat model is unchanged — everything still
lives in the same local `.sav` blob under the same optional AES-GCM
encryption (`AGENTS.md` §0), so this widens what a single decrypted case file
exposes about a ward internally, without changing what any attacker outside
the file can reach. **Non-Destructive Toggling (§3):** Mark Closed / Mark
Open never deletes data in either direction; closing freezes and reopening
resumes, which is the same principle as §3's toggle rule applied to a filing
rather than a section. **Legal/Compliance:** "frozen as filed" is the point —
a closed filing is a historical record of what was submitted to the court,
and letting later party edits rewrite it would misrepresent the filing. The
drift notice surfaces the divergence instead of resolving it, which keeps the
decision with the filer. This document does not assess whether that matches
any particular clerk's expectations; it records what the code does.

---

## What this backfill does not establish

Per the caveat this repository applies to reconstructed documents:

- **No pre-authorization.** `AGENTS.md` §2 requires a named approval per
  sub-delivery before implementation. That gate was not exercised for 49 or
  49B. This document does not retroactively supply it; it records what
  landed.
- **No alternatives record.** Both commit messages state what was built and
  why, but not what was rejected. Any future change to the ward-identity
  field maps or the closed-filing cut-off rule should be reasoned from the
  code and these commit messages, not from an assumption that some other
  approach was already considered and ruled out.
- **Verification is as-committed.** The e2e specs cited above were written
  alongside the change, so they demonstrate the feature works as built; they
  are not an independent check that the design is right. Neither spec was
  re-run for this backfill — this was a documentation-only pass
  (`AGENTS.md` §1 skips tests for those) — so the "Verification" sections
  above describe what the commits assert, not a fresh green run. Anyone
  building on 49B should re-run `closed-filing-sync.spec.ts` and
  `party-resolver.spec.ts` first, per §1's rule that a "Landed" status line
  is a claim rather than proof.
