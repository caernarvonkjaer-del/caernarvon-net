# Milestone 74 Proposal — Guardian cards: who is first, and who is in the filing

## Status

**Draft.** Every decision is settled (2026-10-05). **Built so far: 74A
(2026-10-05), approved by name.** Nothing else is approved; building 74B needs
the requester's named approval (AGENTS.md §3). Items 74A and 74B are the first two; more may be added.

Both were found on 2026-10-05 while building Milestone 73's 73C (the Plans'
"+ Add Co-Guardian"), recorded in 73C's build record as found and not
changed, and raised to their own milestone at the requester's request. Every
claim below was checked against the code at `861b6a9` (73C built); the two scripts that confirm them are described under each item's
Evidence.

| # | Item | What a filer sees today | Severity | Parts |
| --- | --- | --- | --- | --- |
| 1 | 74A | On the Inventory, the Annual, Final and Trust Accountings and the Simplified, an **empty Guardian #1 card is removed** when the filer leaves the page, and the co-guardian they filled in **becomes Guardian #1** without a word | Medium | **Built** (2026-10-05) |
| 2 | 74B | **A co-guardian whose only entry is a signature stamp is left out of the filing**: on the Inventory the PDF drops it; on the Annual family and the Simplified no check, workbook or PDF includes it at all | High | One |

---

## 74A — Guardian #1 stays Guardian #1

### What a filer sees today

A filer on the Inventory's D-1, the Annual, Final or Trust Accounting's
Part III, or the Simplified's Part IV fills in a co-guardian card before the
first card — for example, "+ Add Co-Guardian", then the co-guardian's details,
or Link Person on the second card — and then goes to another page or back to
the dashboard. When they come back:

- the co-guardian is in the **Guardian #1** card, and the empty first card is
  gone;
- nothing said so; the page shows "+ Add Co-Guardian" as if nothing happened;
- the export checks no longer say "Guardian #1 — Name" is missing, and the
  sidebar may now show the section complete — both are satisfied by the
  co-guardian;
- the co-guardian's details now go wherever Guardian #1's go: the sidebar's
  "Guardian:" line, the first guardian's boxes in the workbook, and the first
  signature block on the PDF.

If the filer then types the guardian into a new co-guardian card, the filing
lists the two in the reverse of the order they entered them. Nothing is lost,
but the order changes silently.

The four Plans don't do this: their first block always stays (73C kept that).

### Evidence

- **The clean-up removes it.** When the filer leaves a page (`router.js`
  near 117) or the filing (`leave-filing.js` near 34), `pruneBlankCards()`
  keeps the cards holding anything and then tops up to the list's minimum —
  one — from the start (`prune-cards.js` near 55–58). When the second card
  holds anything, the minimum is already met, so the empty first card goes.
- **Confirmed on all five filing types** by calling the clean-up on each
  type's own blank filing with an empty first card and a filled second one:
  every type ends with only the co-guardian, which also takes over the first
  slot's shared-record link (`['party-carol']`). The empty card's own link,
  if it had one, is dropped.
- **Everything else keeps the first card:**
  - the three pages offer no Remove on it (Inventory `index.js` near 1102–1104;
    Annual `index.js` near 744–746, whose own comment reads "Guardian #1 is the
    filer and always stays; only co-guardians can be removed, matching Guardian
    Inventory's D-1 page"; Simplified `index.js` near 574);
  - the three Excel imports always keep the first slot (Inventory `excel.js`
    near 768; Annual `excel.js` near 703; Simplified `excel.js` near 359);
  - the Plans' clean-up keeps the first block (`blank-rows.js`, `keepFirst`,
    73C).
- **Guardian #1 is special downstream:** the export checks always require its
  name (Annual `index.js` near 1677–1681; Simplified near 818–822; Inventory
  `validateGuardian()` near 1430); the sidebar requires it complete
  (`completion.js` near 134 and 188); the sidebar's name line
  (`sidebar.js` `getPrimaryGuardianDisplayName()`); the workbook-name warning
  (`form-derived-fields.js` near 121 and 142); the workbooks' first guardian
  block (Annual `excel.js` near 234–241, PART II, III row 25; Simplified
  `excel.js` near 165–170, PARTS III, IV row 15 onward).

### Decisions

None: a defect against the rule the pages, the imports and the Plans already
follow.

### Design

The clean-up keeps the first card of `guardians` whatever it holds — the
`keepFirst` flag 73C added for the Plans' guardian blocks, set on the
`guardians` entry in `blank-rows.js` (Inventory, Annual family, Simplified).
An untouched co-guardian card still goes when the filer leaves the page; an
empty first card stays, and the export checks keep asking for its name.

### Files

`src/core/form/blank-rows.js` (one entry). Nothing else.

### Tests

- `tests/unit/prune-cards.spec.js`: on each of the five types, an empty first
  card and a filled second keep both, in order, with their links; an
  all-blank list still ends with one card.
- New `tests/e2e/first-guardian-stays.spec.ts`: on the Inventory's D-1, the
  Annual's Part III and the Simplified's Part IV, through the real "+ Add
  Co-Guardian" button and fields — fill only the co-guardian, leave the page,
  come back: the first card is still "Guardian #1" and empty, the co-guardian
  is still second, and Print Preview names Guardian #1's missing name.
  Red-first: each fails today (the co-guardian is first).

### Checklist (AGENTS.md §8)

1. **Data model:** no change.
2. **Legacy data:** a saved filing whose first card is empty and second is
   filled (saved before the filer left the page) now keeps the empty card,
   and the checks ask for its name — visible. A filing where the move already
   happened can't be told from one entered that way; nothing to migrate, and
   the filer sees the order on the page.
3. **Fixtures:** grep every `fillMinimalValid*Ward()` and fixture for a
   `guardians` list with an empty first entry; none is expected (the minimal
   wards fill Guardian #1), but the build checks.
4. **Tests and index:** as above; `TEST-INDEX.md`, `file_index.md`, the 70T
   list and the assertion baseline in the same commit.
5. **Export/import:** unchanged; the imports already keep the first slot.
6. **Security:** nothing new stored.
7. **UI:** no new control; the page's existing "Guardian #1" card.
8. **Legal framing:** none — this keeps the order the filer entered.
9. **Cross-form:** the Plans already behave this way (73C); this brings the
   other five filing types to the same rule.

### Build record — BUILT 2026-10-05 (approved by name by the requester, 2026-10-05)

**What changed for a filer:** on the Inventory, the Annual, Final and Trust
Accountings and the Simplified, an empty Guardian #1 card **stays** when the
filer leaves the page, and a filled co-guardian stays second. The checks keep
asking for Guardian #1's name (the page shows "👉 Guardian #1 — Name"). An
untouched co-guardian card still goes when the filer leaves, as before.

**How:** `keepFirst: true` on the `guardians` entry in
`src/core/form/blank-rows.js` — the setting 73C added for the Plans'
guardian blocks. Nothing else changed.

**Tests:**

- `tests/unit/prune-cards.spec.js` (+10): on each of the five filing types,
  an empty first card and a filled co-guardian both stay, in order, with
  their links; untouched co-guardian cards still go.
- New `tests/e2e/first-guardian-stays.spec.ts` (3): the Inventory's D-1, the
  Annual's Part III and the Simplified's Part IV, through the real "+ Add
  Co-Guardian" button and name box — empty Guardian #1, filled co-guardian,
  leave and return: the order holds, Guardian #1's box is empty, and the
  checks ask for its name.
- **Red-first:** with the fix stashed, the five keep-first unit cases and all
  three browser cases fail for the stated reason (the co-guardian moved into
  Guardian #1); with it, all pass.
- Fixture audit (checklist 3): every minimal ward fills Guardian #1, so none
  relied on the move.
- Full unit suite passes. **Related browser specs: 37 files (every one
  working with guardian cards on the Inventory or the accountings, the
  clean-up, shared-person links and the year rollover) — 383 passed, none
  failed.**

---

## 74B — A co-guardian the filer has started is in the filing

### What a filer sees today

A filer can apply a co-guardian's signature stamp — or choose "/s/" Signed or
Signature Stamp — before typing the co-guardian's name. The card shows the
stamp and keeps it. What happens next depends on the form:

| Form | Page and clean-up | Export checks and sidebar | Workbook | PDF |
| --- | --- | --- | --- | --- |
| Inventory (D-1) | kept (counts the stamp image) | **ask for the name and details** | written | **left out** — its PDF doesn't count the stamp image |
| Annual, Final, Trust (Part III) | kept | **ignored** — no check asks for anything | **not written** | **left out** — the PDF keeps only guardians with a name |
| Simplified (Part IV) | kept | **ignored** | **not written** | **left out** |
| The four Plans | kept | not checked (no Plan checks a co-guardian at all) | — | **printed** |

So on the Annual family and the Simplified a filer can see a stamped
co-guardian card on the page and file a document that doesn't contain it,
with no warning anywhere; Remove on that card also deletes it without the
confirmation those forms ask for a card with details.
On the Inventory the checks catch it, but a filer who overrides them (export
issues of this kind can be acknowledged, AGENTS.md §4) gets a PDF without the
stamped co-guardian.

The same holds for a card whose only entry is the "This person prepared this
filing" box: the Inventory and the accountings check it, but their PDFs leave
it out.

Two more effects of the same filters:

- **The PDFs renumber.** All three number their guardian blocks after
  dropping the cards they skip, so after an override a skipped card moves the
  next one up: a nameless Guardian #1 on the Annual or Simplified prints the
  co-guardian as "Guardian #1"; a nameless Co-Guardian #2 prints #3 as "#2".
- **The Plans' co-guardians are never checked.** Each Plan's checks cover
  only the first block (Initial `index.js` near 768–783, Annual near 762–777,
  Minors near 526–541, Simplified near 383–402), though the Initial Plan's page
  carries the form's own instruction: "All guardians of the person must sign
  and provide their most current address, telephone number, and SSN."

### Evidence

Each form asks "has the filer started this co-guardian?" differently:

| Test | Where | Counts a stamp image? | Counts a "/s/" or Stamp choice? | Used by |
| --- | --- | --- | --- | --- |
| `guardianHasData()` | `models/guardian.js` near 126 (moved there by 73C) | yes | no | Inventory page, checks, clean-up |
| The Inventory PDF's own list | `guardian-inventory/pdf-model.js` near 546 | **no** | no | Inventory PDF |
| `guardianHasAnyData()` | `row-started.js` near 72 | **no** | **no** | Annual and Simplified checks, sidebar (`completion.js` near 134, 188), workbooks (Annual `excel.js` near 246, 253; Simplified `excel.js` near 27, 175, 187), the Annual import (near 703), Remove's confirmation (Annual `index.js` near 422; Simplified near 127) |
| `isBlankCard()` | `blank-rows.js` | yes | yes | Annual and Simplified clean-up |
| A name | Annual `pdf-model.js` near 237; Simplified near 163 | **no** | **no** | Annual and Simplified PDFs |
| `rowStarted()` | `row-started.js` near 40 | yes | yes | the Plans' PDFs |

Confirmed by running each test on three cards — a stamp choice with a stamp
image, a "/s/" choice alone, and the preparer box alone — with no name: only
`rowStarted()` counts all three; the accountings' PDFs and the Inventory's PDF
count none of them.

**The precedent is already in the app.** Milestone 61B/61C wrote
`rowStarted()` for exactly this class of defect on the Plans' other rows, and
its comment states the lesson: each surface "used to carry its own
hand-written list of which fields make a row count. The lists disagreed …
The fix is not a longer list — a longer list is the same bug with a later
expiry date, since the next field added to a row is not added to it. This
asks the row itself." The guardian cards were never moved onto it.

### Authority

No statute or rule is read here. AGENTS.md §4: after an affirmative override,
court output "still generates faithfully". The Initial Plan's own
instruction is quoted above as the form's wording, not as a legal reading.

### Decisions (settled 2026-10-05 by the requester, both as recommended)

1. **Which test says a co-guardian is started?** — **Settled: the Plans'
   `rowStarted()`, everywhere.** The options as asked:
   - **The Plans' `rowStarted()`, everywhere (recommended).** One rule for the
     page's clean-up, the checks, the sidebar, the workbooks, the PDFs,
     Remove's existing confirmation and the Annual import, on all nine forms: anything
     the filer entered counts, a stamp image, a "/s/" or Stamp choice and the
     preparer box included; an untouched "Unsigned" does not.
   - Add the stamp image and the signature choice to each form's own lists
     (six lists stay, and the next new field repeats this).
   - The Inventory's PDF only, as first reported (the Annual family and the
     Simplified keep dropping stamped co-guardians silently).
2. **Check a started Plan co-guardian?** — **Settled: yes, like the first
   guardian.** The options as asked:
   - **Yes, like the first guardian (recommended):** a Plan co-guardian the
     filer has started needs what that Plan's first guardian needs; an
     untouched one is not checked. The other five forms already do this.
   - No: record it only.

### Design

- **One rule.** `rowStarted()` (`row-started.js`) is the test for "has the
  filer started this guardian card?" on all nine forms; `guardianHasAnyData()`,
  the Inventory's `guardianHasData()` and its PDF's list, and the
  accountings' name filters are retired onto it, and the list rules
  (`collections.js`, 73V/73C) use it as each guardian list's `isBlank`. No
  form's untouched card changes: every blank guardian row is `''`, `null` or
  `false` throughout.
- **Every started card is in the filing,** in its own card's place: the PDFs
  label a block by its card ("Guardian #1", "Co-Guardian #2", …), never by its
  position among the printed blocks, and a started card with no name still
  prints its block after an override (faithful output, §4). Before any
  override, the checks already name what is missing.
- **The workbooks** write every started card's slot; the imports' empty-slot
  test is the same rule (a workbook carries no stamp, so an import is
  unaffected).
- **Remove's existing confirmation** — on the Annual family, the Simplified
  and the Plans — asks before deleting a started card, the stamp included.
  The Inventory's D-1 Remove asks nothing for any card today; adding a
  confirmation there is 73P's ("ask before removing a card that holds
  anything"), which uses this rule for guardian cards.
- **The Plans** (decision 2): each Plan's checks run its first-guardian rules
  on every started co-guardian block.

### Files

`src/core/validation/row-started.js`; `src/core/filing/models/guardian.js`;
`src/core/form/collections.js`; `src/core/status/completion.js`;
the three accounting-type features' `index.js`, `pdf-model.js` and
`excel.js` (Inventory, Annual, Simplified); the four Plans' `index.js`
(their checks).

### Tests

- New `tests/unit/started-guardian.spec.js`: on all nine forms, a card with
  only a stamp image, only a signature choice, or only the preparer box is
  started; an untouched card and an "Unsigned" one are not — through each
  surface's own entry point (checks, sidebar, clean-up, Remove's
  confirmation, workbook writer, PDF model).
- New `tests/e2e/stamped-co-guardian.spec.ts`: on the Inventory, the Annual
  and the Simplified, apply a stamp to Co-Guardian #2 with nothing else, then
  open Print Preview: the checks ask for its name; after the override, the
  PDF has a "Co-Guardian #2" block with the stamp, and the workbook writes
  slot 2. On one Plan, a started co-guardian is checked. Red-first: today the
  Annual and Simplified raise nothing and print nothing, and the Inventory's
  PDF has no block.
- Changed: the three accounting PDF-model specs and goldens where a block's
  label was positional.

### Checklist (AGENTS.md §8)

1. **Data model:** no field change. Decision 2 makes a started Plan
   co-guardian's fields required where the first guardian's are: the CSV's
   `required_when` for the `planGuardians[]` rows on the four Plans (today
   "primary") becomes the first guardian or a started co-guardian, and
   `verify:data-model` passes.
2. **Legacy data:** nothing stored changes. A saved filing with a stamped,
   nameless co-guardian now shows checks asking for its name (visible); one
   that was filed without it can't be fixed by the app, and wasn't flagged
   before.
3. **Fixtures:** grep every `fillMinimalValid*Ward()` and Plan fixture for a
   co-guardian entry with partial data; decision 2 can make one fail its
   checks.
4. **Tests and index:** as above, with `TEST-INDEX.md`, `file_index.md`, the
   70T list and the assertion baseline.
5. **Export/import:** the PDFs and workbooks change by design (above); the
   imports don't (no stamp in a workbook).
6. **Security:** nothing new stored; the stamp image is already in the case
   file.
7. **UI:** no new control; existing check messages and Remove's existing
   confirmation.
8. **Legal framing:** none asserted; the Plan instruction is the form's own
   wording.
9. **Cross-form:** this item *is* the cross-form fix: one rule on all nine
   forms, taken from the Plans' existing one.

### Overlap with Milestone 73

- **73A** (signatures) changes the same signature blocks in the same
  `pdf-model.js` files: what a block shows. 74B changes which blocks appear
  and their labels. Build 74B after 73A.
- **73F part 1** moves the validators into `src/core/validation/engines/`;
  74B changes their guardian loops. Build them one after the other, not side
  by side.
- **73T parts 2–4** connect each workbook to the import transaction in the
  same `excel.js` files. Same.
- **73P**'s Remove confirmation reuses 74B's rule for guardian cards.

74A overlaps nothing pending: it is one entry in `blank-rows.js`, which 73C
already changed.

---

## Build order

| Order | Item | Depends on | Main files | Tests |
| --- | --- | --- | --- | --- |
| 1 | 74A | 73C | `src/core/form/blank-rows.js` | `prune-cards.spec.js`; new `tests/e2e/first-guardian-stays.spec.ts` — **Built** 2026-10-05 |
| 2 | 74B | 73A; sequenced with 73F part 1 and 73T parts 2–4 | `row-started.js`, `models/guardian.js`, `collections.js`, `completion.js`, three accounting-type features, four Plans' checks | new `tests/unit/started-guardian.spec.js`, new `tests/e2e/stamped-co-guardian.spec.ts` |

74A can be built at any time. Neither changes a calculation or a workbook
formula.
