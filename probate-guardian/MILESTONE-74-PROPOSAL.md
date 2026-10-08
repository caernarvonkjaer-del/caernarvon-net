# Milestone 74 Proposal — Guardian cards, and what the 2026-09-29 QA report left open

## Status

**Draft.** Every decision for 74A and 74B is settled (2026-10-05). **Built so
far: 74A (2026-10-05), 74B (2026-10-06), 74Q (2026-10-07), 74C (2026-10-07,
with 73M, `a0e987b`) and 74P (2026-10-07, after 73B), each approved by name.**
**Approved and not yet built** (2026-10-07, with Milestone 73's batch: 73O
part 2, 73G part 2, 73H and 73S): 74F with 73O part 2 and 74H with 73G part 2. Nothing else is
approved: building any other of 74D–74S needs the requester's named approval
of that item (AGENTS.md §3). **Every decision in 74C–74S is settled
(2026-10-06)**, each recorded under its item and gathered in
[Appendix B](#appendix-b--every-decision-in-74c74s-as-asked-and-settled): the
27 ordinary ones as recommended, taken together; the 18 questions of Clerk
practice, law, re-asks and new filed figures one by one, all as recommended
except **Bar numbers, kept padded to eight digits** (Milestone 36's rule), and
**the SSN, answered as Pinellas Clerk practice**: PDFs keep the last four
digits and the workbooks the full number. The questions marked for a
qualified person stay flagged; nothing here settles a legal reading. 74D has
no decision until its reports are reproduced, and 74M has nothing to build.

74A and 74B were found on 2026-10-05 while building Milestone 73's 73C (the
Plans' "+ Add Co-Guardian"), recorded in 73C's build record as found and not
changed, and raised to their own milestone at the requester's request. Every
claim about them was checked against the code at `861b6a9` (73C built).

**74C–74S come from an earlier QA report.** A QA pass against the test system
on 2026-09-29 (`guardian-forms-qa-report.md`, untracked in the repository
root) listed 83 items: 32 bugs, 7 accessibility findings, 40 suggestions and
4 legal questions. Milestone 71 took the four P0s the requester named and
cited the report directly; Milestones 72 and 73 fixed or planned more of it
without citing it. On 2026-10-06 every item was checked against Milestones
71–74, the commit log and the working tree:

| Status | Items |
| --- | --- |
| Fixed (a named commit; one, the guardian's "/s/" beside the "original signatures" note, by 73A) | 8 |
| Decided not to change (a recorded decision, or the Clerk's own workbook or form) | 12 |
| Planned in an unbuilt Milestone 73 item | 16 |
| **Open** | **47** — 14 of them only for a part a milestone left; 6 not yet seen in the code |

The requester chose (2026-10-06) to write all 47 open items into this
milestone as a Draft. They are grouped here by cause and surface into
74C–74S, as Milestone 73 grouped its findings. Where an item shares files
with an unbuilt Milestone 73 item it stays a separate 74 item, noted to be
built alongside that 73 item; Milestone 73's approved scope does not change.
Questions for the Clerk or a qualified person, and the five reports that need
a reproduction before anything is changed, are listed as such. The other 36
items, with where each was fixed, planned or decided, are in
[Appendix A](#appendix-a--qa-report-items-already-fixed-planned-or-decided);
the [coverage table](#appendix-c--coverage-every-open-qa-item-and-its-74-item)
maps every open item to its 74 item. **Every claim in 74C–74S was checked
against the working tree on 2026-10-06** by a reviewing agent, and a sample
re-checked by hand (the title-casing, the Simplified Plan's
Save as PDF, the e-mail checks, the "A1" label, the page title, Print's new
tab, the next-form list, "None listed.", the witness sentence and comment,
the Plans' certificate disclaimer, Bar-number padding, the SSN mask and Rule
2.425's text); where a claim rests on reading code rather than running it,
the item says so.

| # | Item | What a filer sees today | Severity | Parts |
| --- | --- | --- | --- | --- |
| 1 | 74A | On the Inventory, the Annual, Final and Trust Accountings and the Simplified, an **empty Guardian #1 card is removed** when the filer leaves the page, and the co-guardian they filled in **becomes Guardian #1** without a word | Medium | **Built** (2026-10-05) |
| 2 | 74B | **A co-guardian whose only entry is a signature stamp is left out of the filing**: on the Inventory the PDF drops it; on the Annual family and the Simplified no check, workbook or PDF includes it at all | High | **Built** (2026-10-06) |
| 3 | 74C | On the Simplified Annual Plan, **Save as PDF stays greyed out after "Continue despite outstanding requirements"**, though Print works; on every form a greyed-out export button gives no reason | High | One |
| 4 | 74D | Five reports **not yet seen in the code** — two entry points disagreeing on "Ready to export", Save as Excel hanging, the New Form dialog pointing at the wrong ward, a stale screen-reader message, a misleading "no other forms" note — need a reproduction first | Medium | One (investigation) |
| 5 | 74E | **What a filer types is changed:** "margaret a. collins" files as "Margaret a. Collins", a masked account "xxxx5510" as "Xxxx5510", and descriptions are capitalized word by word | High | One |
| 6 | 74F | The certificate's "no recipients" question is a **double negative**; the Simplified prints **"None listed." then "on this date:"**; the Plans print the app's own disclaimer on the filed page; the documents reminder names "Schedule A1" | Low | One |
| 7 | 74G | An **18-month or future-dated accounting period**, a line period that runs backwards, Letters signed before the guardianship began, residences dated backwards, and an e-mail address like **"rnguyen@"** are all accepted without a word | Medium | One |
| 8 | 74H | Answers that **contradict each other** are filed without a warning: a safe-deposit box answered No while items are listed in it, a bond below the calculated requirement, two personal residences, transfers that don't balance, a negative Remaining Assets On Hand, and more | Medium | Two |
| 9 | 74I | The Inventory's Cover says witnesses **"must"** be listed, stars their boxes, and then accepts **none, or a blank card** | Low | One |
| 10 | 74J | A Final or Trust Accounting's **Filing Type can be switched to Annual silently**; from an Initial Plan, New Filing from Existing **never offers the Annual Plan**; its notice says the source was "converted" | Medium | One |
| 11 | 74K | **Starting a new year hides an overdue, unfiled year** from the dashboard; the new year's period starts blank | Medium | One |
| 12 | 74L | Screen readers miss **error messages** and hear **checkbox headings as the first box's name**; the Judge box is announced as "Assignee"; the **browser tab title never changes**; some text is under 10px | Medium | One |
| 13 | 74M | **Full bank account numbers print** on filed PDFs, Bar numbers are **zero-padded to 8 digits**, and Social Security numbers print in part — each against Rule 2.425's text or unverified | Medium | **Decided 2026-10-06: no change** (account numbers still open for a qualified person) |
| 14 | 74N | **A Trust Accounting never says which trust it reports on**, and starts with a blank balance | High | One |
| 15 | 74O | Less is carried forward than the filer already entered elsewhere: the Cover's names into D-1/D-2, the Inventory's income and trusts into the Plans, the ward's residence into the next Plan, last year's daily-living ratings | Low | One |
| 16 | 74P | The Inventory makes the filer **annualize income by hand**, retype every jointly owned asset on C-5, and retype an address that is the same as another | Low | One |
| 17 | 74Q | An exported workbook **shows $0 totals** in any viewer that doesn't recalculate on opening | Low | One |
| 18 | 74R | No reminder of the **year-end statement** the statute and the Clerk's form require; no account of the **§744.3678(5) exemption** — **questions first** | Medium | One (decisions first) |
| 19 | 74S | Small fixes: vehicle Year and VIN checks; "Page 3 of 19" beside "16 of 17 sections"; no eligibility question on the Simplified Plan; a truncated filing name in the switcher; Delete and Mark Closed missing from the Activity Log | Low | One |

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

### Build record — BUILT 2026-10-06 (approved by name by the requester, 2026-10-06)

**What changed for a filer:**

- On the Inventory, the Annual, Final and Trust Accountings and the
  Simplified, a co-guardian card the filer has started -- a stamp applied, or
  a signature choice made, before the name is typed -- is part of the filing.
  Print Preview asks for its name. Before, the Annual family and the
  Simplified asked nothing and left the card out of the PDF; the Inventory
  asked, but its PDF still dropped the card after "Continue". After
  "Continue", the PDF prints the card's block in its own place, labelled by
  its card ("Co-Guardian #2"; "Guardian #2" on the Inventory), with the stamp.
- Leaving the page keeps such a card. (73C had removed a card holding only a
  signature choice on the Inventory's D-1.)
- Remove asks before deleting it. On the Annual family and the Simplified a
  card holding only a stamp used to go without a word, stamp and all; the
  Plans already asked.
- A co-guardian holding only a stamp keeps its place, its stamp and its
  shared-record link through importing the filing's own workbook. The
  workbook has no box for a stamp, so the slot goes out empty and the import
  carries the stamp back from the filing; the old rule then dropped the card.
  The design said imports were unaffected; this is the one way they are.
- On the four Plans, a started co-guardian is checked for what that Plan asks
  of its first guardian: name, signature, address, phone and SSN (the
  Simplified Plan asks no SSN). Before, only its signature was checked (73A).
- An untouched co-guardian card, or one left at "Unsigned", is still not in
  the filing and still goes when the filer leaves the page. On the Annual
  family, the Simplified and the Plans a card holding only "Unsigned" used to
  count as entered and stay; it now goes like any untouched card.

**How:** `rowStarted()` (`src/core/validation/row-started.js`) is the one
rule for a guardian card on all nine forms. `guardianHasAnyData()`
(row-started.js), `guardianHasData()` and `GUARDIAN_DATA_FIELDS`
(`models/guardian.js`) and `planGuardianHasAnyData()` (`plan-rows.js`) are
retired onto it. It decides: the seven export checks' guardian loops (the
Plans run their first-guardian checks on every started co-guardian); the
marks, which follow the checks since 73F part 2, and the Annual and
Simplified "begun" maps; the clean-up (`collections.js`, every guardian
list's untouched-card test, and `normalizePlanGuardians()`); the PDFs (the
Inventory, Annual and Simplified models print Guardian #1 and every started
co-guardian, labelled by card index; the Simplified Plan's block test); the
workbooks (a started card's slot is written, and the import's keep test);
the Simplified's workbook capacity count; and Remove's confirmation. The
data model's 18 `planGuardians[]` rows are required for the primary guardian
or a co-guardian the filer has started; `verify:data-model` passes.

**The workbook, as built:** each card already had its own numbered slot.
74B decides only whether a slot is written, and a stamp-only card's slot
holds nothing a workbook carries (no name, no stamp), so the exported file
does not change for it. There is nothing in the file to test; the design's
"the workbook writes slot 2" is recorded here as not observable. The
Simplified's capacity count (three slots) now counts a stamp-only card.

**Tests:**

- New `tests/unit/started-guardian.spec.js` (52 tests): on all nine forms,
  a second card holding only a stamp, only a signature choice, or only the
  preparer box (where the form has one) is checked, listed on its page,
  kept by the clean-up and printed in its own place with its label and
  stamp; an untouched or Unsigned-only card is none of those; a nameless
  Guardian #1 still prints its own block. Remove's confirmation and the
  workbook are covered in the browser instead (below). **Red-first:** with 74B's app changes set aside, 41 of the 52 fail, each at its first unmet expectation: the checks don't ask for the second card's name (every form; on the Inventory, for a signature choice alone); the PDF prints no block for it; the clean-up keeps a card holding only "Unsigned" (the Annual family, the Simplified, the Plans); the Inventory's PDF labels a co-guardian by its position among the printed blocks.
- New `tests/e2e/stamped-co-guardian.spec.ts` (7): on the Inventory, the
  Annual and the Simplified, a co-guardian holding only a stamp -- the
  checks ask for its name, Print Preview lists it, and after the override
  the saved PDF prints its block ("Co-Guardian #2"; "Guardian #2"); on the
  Annual Plan a started co-guardian is checked for name, mailing street,
  phone and SSN and its Signatures page names it; on the Annual, the
  Simplified and the Annual Plan, Remove asks first, Cancel keeps the card
  and its stamp, and confirming removes it. **Red-first:** with 74B's app
  changes set aside, the first four fail for the stated reasons (no check
  asks for the Annual's or the Simplified's card; the Inventory's PDF leaves
  it out; the Plan's co-guardian is not checked). The Annual's and the Simplified's Remove cases fail because no confirmation appears (the card is deleted at once); the Annual Plan's passes against the old code too -- the Plans already asked before removing a card holding a stamp image -- and stays as coverage.
- `tests/e2e/guardian-links-follow-rows.spec.ts`: the Annual import case
  made its empty middle slot from a card holding only "Unsigned", which 74B
  removes before export; it now empties slot 2 in the exported workbook
  itself. New: the stamp-only round trip above. **Red-first:** the stamp round trip fails against the old code (the card is dropped); the empty-slot case passes against it, as it should (it covers 73V's fix, not 74B's).
- `tests/e2e/plan-add-co-guardian.spec.ts`: the D-1 card holding only a
  signature choice stays after leaving the page, and the checks ask for its
  name. **Red-first:** fails against the old code (the card gone).
- Changed unit specs: `prune-cards.spec.js`, `collection-descriptors.spec.js`
  (a signature choice counts as entered, a bare Unsigned does not),
  `filing-registry.spec.js` (the normalizer case reads `rowStarted()`),
  `excel-capacity-issues.spec.js` (a stamp-only fourth card takes a slot;
  red-first: fails against the old code, the card taking no slot). Goldens: 8 Annual Plan variants in each, with notes. No PDF-model
  spec needed changing: none relied on a positional label for a started card.
- Fixture audit (checklist 3): every co-guardian row in the fixtures is
  entirely blank, so none is started and none is newly checked.
- Full unit suite passes; `npm run check:types` clean; `npm run
  verify:data-model` OK. **Related browser specs: 26 files, 283 tests -- 282 passed; the one failure was the Annual import case whose setup 74B made obsolete (above). Rewritten, it and the new stamp round trip pass (2/2), and the three Remove cases, added after that run, pass (3/3).**

---

## 74C — Save as PDF works after "Continue", and a greyed-out button says why

### What a filer sees today

- **Simplified Annual Plan.** Print Preview lists what is still missing. The
  filer chooses "Continue despite outstanding requirements" and confirms. The
  preview appears, Print works and opens the PDF — but **Save as PDF stays
  greyed out**, with nothing to say why. On the other eight forms Save as PDF
  comes back after Continue. (QA report BUG-11; the report's other two
  points — the sidebar's 100% and the missing asterisks on that form — are
  Milestone 73F's.)
- **Every form.** A greyed-out Save as PDF or Save as Excel gives no reason —
  not on hover, not to a screen reader. (QA report UX-30; Save as Excel's
  half is 73M step 5's: "Save as Excel stays clickable and says why it can't
  proceed".)
- **Print** opens the PDF in a new tab without the "noopener" protection the
  app already uses when it opens the Florida Courts E-Filing Portal. The tab
  holds only the app's own PDF, so the exposure is small. (QA report UX-38;
  the portal half was already done before the report.)

### Evidence

- After Continue, the Preview re-enables the save buttons it can find:
  `pdf-preview.js` near 470–479 selects
  `[data-form-action*="save"], [data-simplified-action^="save"],
  [data-annual-action^="save"], [data-inventory-action^="save"]`. The
  Simplified Plan's button is `data-plan-simplified-action="save-pdf"`
  (`plan-simplified/print.js` near 51) — none of those match it. The other
  three Plans use `data-form-action="save-pdf-plan-…"` (`plan-annual/print.js`
  and `plan-initial/print.js` near 51, `plan-minor/print.js` near 50), which
  the first selector catches. Read from the code; the QA report saw it in a
  browser; not re-run here.
- The same re-enable skips any button whose tooltip contains "template can
  hold" — a wording test 73M already plans to retire.
- Disabled buttons carry no `title` or description: Annual `print.js` near
  55–56, Simplified near 54–55, Inventory near 60–61, the four Plans near
  50–51. Each form's own click handler already explains a refusal — e.g.
  Annual `print.js` near 96–99: "Cannot export — N required fields missing.
  See the list on this page." — but a disabled button can't be clicked.
- Print: `pdf-preview.js` near 509, `window.open(blobUrl, '_blank')`. The
  portal: `src/core/shell/court-portal.js` near 16–20 passes
  `noopener,noreferrer`; the user guide, `src/core/help/user-guide.js` near
  60, passes `noopener`.

### Authority

No statute or rule. AGENTS.md §4: after an affirmative override, court output
"still generates faithfully" — Save as PDF must be as available as Print.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **What an export button does when it can't export yet.** — **Settled: clickable, and it says why.** The options as asked:
   - **Clickable, and it says why (recommended),** as 73M decided for Save as
     Excel: Save as PDF never looks dead; a click either saves or shows the
     form's existing "Cannot export — N required fields missing" message, and
     the same reason is written beside the buttons for screen readers. A
     filer sees one behaviour for both buttons on all nine forms.
   - Stays greyed out until Continue, with the reason written beside it and
     tied to it for screen readers. A filer sees a disabled button with a
     sentence explaining it.
   - Fix only the Simplified Plan's re-enable. Every other greyed-out button
     still gives no reason.

### Design

1. **One attribute for every export button**: `data-output-action="save-pdf"`
   / `"save-excel"` on all nine forms' buttons, beside each form's existing
   action attribute. The Preview's override code (near 475) and 73M's Save as
   Excel code select on it, never on per-form prefixes or tooltip text.
2. **Decision 1, recommended:** Save as PDF is drawn enabled on all nine
   forms; its click handler's existing check (`authorizeFilingOutput(…,
   { capability: 'pdf' })`) refuses with the existing message. A reason
   line (`<span id="export-reason">`) beside the buttons states what blocks
   each output, and each button's `aria-describedby` points to it.
3. **Print** opens with `'_blank', 'noopener'`. A browser check comes first:
   that a `blob:` URL opened with `noopener` still shows the PDF in Chromium,
   Firefox, WebKit and Edge (unconfirmed).

### Files

`src/core/pdf/pdf-preview.js`; the nine `print.js` (annual-accounting,
simplified-accounting, guardian-inventory, the four Plans); `src/core/ui/export-guard.js`
if the selector helper moves there.

### Tests

- New `tests/e2e/output-buttons-after-override.spec.ts`: on each of the nine
  forms, an incomplete filing, Preview, Continue, Save as PDF downloads a PDF.
  Red-first: the Simplified Annual Plan's case fails today (the button stays
  disabled); the other eight pass both ways.
- In the same spec: before Continue, the reason line names what blocks the
  PDF and the button is described by it (red-first: no such text today).
- In the same spec, **coming back to Preview**: a filer who clicked "Continue despite outstanding requirements", saved, left Preview and came back without changing anything sees Save as Excel enabled -- opening Preview clears the earlier override (`beginFreshPreview()` in `mountPdfPreview()`) after the page drew the button from it -- and the click only redraws Preview, saving nothing and saying nothing (`excel.js`'s acknowledgement-required branch calls `renderPage('/print')`). Found by the batch regression, 2026-10-07; a fix that greyed the buttons out was built and taken back out at the requester's choice, as it contradicts this design. Both buttons
  must either save or say why on that click.
- New unit case in `tests/unit/pdf-preview-print.spec.js` (new): Print calls
  `window.open` with `noopener` (red-first: it doesn't).
- Changed: every spec that waits for Save as PDF to become enabled as a
  "ready" signal (73M counted 18 such specs for Save as Excel; grep for the PDF
  equivalent at build).

### Checklist (AGENTS.md §8)

1. **Data model:** none.
2. **Legacy data:** none; nothing stored.
3. **Fixtures:** none; tests that wait on a disabled-then-enabled Save as PDF
   change (above).
4. **Tests and index:** as above; `TEST-INDEX.md`, `file_index.md`, the 70T
   list and the assertion baseline in the same commit.
5. **Export/import:** what is exported is unchanged; only when the button
   can be pressed.
6. **Security:** `noopener` on Print; nothing stored.
7. **UI:** the existing refusal message; one reason line, 73M's pattern.
8. **Legal framing:** none.
9. **Cross-form:** one attribute and one rule for all nine forms; the
   Simplified Plan was the one form the override missed.

### Overlap with Milestone 73

- **73M step 5** changes the same lines (`pdf-preview.js` near 470–479) and
  the three accountings' `print.js` for Save as Excel. **Build 74C alongside
  73M** (73M's build-order row 13), one after the other in the same session.
- **73O part 4** adds a Print button to the Annual-family and Simplified
  previews in the same nine `print.js`; **73F part 2** changes the Preview's
  counts and banner in `pdf-preview.js`; **73R part 3** changes
  `pdf-preview.js` for zoom. Sequence, not side by side.

### Build record — BUILT 2026-10-07 with 73M (approved by name by the requester, 2026-10-07)

**What changed for a filer, on all nine forms:**

- **Save as PDF and Save as Excel can always be clicked.** A click either
  saves or says why it can't: *"Cannot export — N required fields missing.
  See the list on this page, or choose “Continue despite outstanding
  requirements” to export anyway."* (or *"…; they can't be overridden."*).
- **A reason line beside the buttons** says the same before the click -- e.g.
  *"Save as PDF and Save as Excel: 3 requirements outstanding — see the list
  on this page, or choose “Continue despite outstanding requirements”."* --
  and each button's `aria-describedby` points to it, so a screen reader reads
  it with the button. Continue removes what it acknowledged; a capacity limit
  stays.
- **The Simplified Annual Plan's Save as PDF works after Continue** (QA
  report BUG-11). Every export button carries `data-output-action`; the
  Preview no longer re-enables buttons by per-form selectors or tooltip
  wording, because none is ever disabled for this.
- **Print** opens the PDF in a new tab that has no handle back to the app
  (QA report UX-38). **Design step 3 changed:** it asked for
  `window.open(url, '_blank', 'noopener')` after a browser check that a
  `blob:` PDF opened that way still loads. That check -- a throwaway
  Playwright script in Chromium, Firefox, WebKit and Edge -- was
  inconclusive in all four, so Print opens the tab exactly as before and then
  cuts the link (`tab.opener = null`), which needs no such check.
- **Coming back to Preview** after a Continue now says what a click will do
  (73M's record).

**Tests:**

- New `tests/e2e/output-buttons-after-override.spec.ts`, on each of the nine
  forms with a new, empty filing: after Continue, Save as PDF downloads the
  PDF; before Continue, the reason line names what stops each button, each
  button is described by it and carries `data-output-action`, the click says
  why and saves nothing, and Continue clears the reason; on the five
  accountings, coming back to Preview after a Continue and a save, Save as
  Excel's click says why and saves nothing. All 23 pass. **Red-first** (on a
  copy, with the nine Preview pages, the Preview module and the three Save as
  Excel handlers as they were): 15 of 23 fail, each for its reason -- the
  Simplified Annual Plan's Save as PDF stayed disabled after Continue, so the
  click never came; on every form the buttons were greyed out before Continue
  with no reason line; and coming back to Preview, Save as Excel's click said
  nothing. The other eight forms' first case passed both ways, as predicted.
- New `tests/unit/pdf-preview-print.spec.js`: Print's tab has its opener cut;
  a blocked pop-up is not an error; nothing opens when the filing can't be
  printed. **Red-first:** with `pdf-preview.js` set aside, the tab keeps its
  opener.
- New `tests/unit/output-reasons.spec.js` (73M's record) and the browser specs
  that read the reason line instead of a disabled button (73M's record).

---

## 74D — Five reports to reproduce before anything is changed

### What a filer sees today

Five things the QA report saw that the code does not obviously explain. None
is changed until it is reproduced.

| # | Report | What the filer saw |
| --- | --- | --- |
| 1 | Export gating differs by entry point (QA report BUG-10) | The same Simplified Annual Plan: Print Preview opened inside the filing said "3 issue(s)" with Save as PDF disabled; opened from the dashboard's PDF button it said "Ready to export" with Save as PDF enabled, while the readiness card below still said "1 item outstanding" |
| 2 | Save as Excel hangs (QA report BUG-12) | On one Initial Inventory with saved PDF annotations, Save as Excel showed "Loading template…" for over 30 seconds, twice; the preview's page list read "2 pages" for a 7-page document meanwhile |
| 3 | New Form dialog points at another ward (QA report BUG-19) | Seen once, right after creating a Simplified Accounting through the eligibility questions: the next New Form dialog opened on "Simplified Annual Accounting" with "Load Ward Info From" set to that other ward, and kept it after a different name was typed |
| 4 | Stale screen-reader message (QA report A11Y-06) | "Preview is blocked. 3 required items are still missing." stayed in an assertive live region after returning to the dashboard |
| 5 | "No other forms yet to pull from" (QA report UX-07) | The note appeared when, by the report's account, other filings existed but none matched |

### Evidence

1. **Both entry points draw the same page.** The dashboard's PDF button
   switches to the filing and opens `/print` (`dashboard/index.js` near
   381–384), the same page the filing's own Output link opens. A **plausible
   cause, unconfirmed:** the page's banner and Save as PDF state are computed
   when the page is drawn (`plan-simplified/print.js` near 35–41, through
   `prepareFilingOutput()`, which treats every issue as cleared once the
   filer has continued past them, `output-preflight.js` near 117–118), and the
   earlier "Continue" is cleared only afterwards, when the preview mounts
   (`pdf-preview.js` near 456, `beginFreshPreview()`). A filer who continued
   inside the filing, went to the dashboard without changing anything, and
   pressed PDF would see exactly the report's mixture. Milestone 38D's
   contract says the UI "must not change readiness labels to passed"
   (`MILESTONE-ARCHIVE.md` near 11612–11630).
2. **The export already recovers from errors** — the report's "no
   try/catch/finally" does not hold for current source: Inventory `excel.js`
   near 582–588 shows the error and re-enables the button. What is missing:
   no time limit on loading ExcelJS (`src/core/vendor-loader.js` near 31–46
   waits on the script's load or error event only) or on reading the template
   (Inventory `excel.js` near 144–150), and no Activity Log entry on failure.
3. **Both dialogs reset on opening**: the name and type are cleared
   (`filing-dialogs.js` near 24–31, 311–323, 92–110), and a name with no exact
   match clears the source selection (`carry-over.js` near 558–573). The
   eligibility dialog's hand-off from the New Form dialog (`filing-dialogs.js`
   near 104–106) is the one place a selection is carried; no path was found
   that carries it into the next New Form dialog.
4. The live region is created next to the preview's document container
   (`src/core/status/live-region.js` near 28–35), inside the page the router
   replaces; no path was found that puts it in the page body.
5. The note is drawn only when no filing of an eligible source type exists at
   all (`carry-over.js` near 551–555); a typed name that matches nothing falls
   back to the full list (near 558–560). An Initial Inventory, for example,
   can't be seeded from another Inventory (`CARRY_SOURCE_TYPE.guardian`, near
   46), so with only Inventories on file the note is accurate.

### Authority

None.

### Decisions

None until each is reproduced. A reproduced defect comes back as a choice
with its fix; one that can't be reproduced is recorded and dropped, as 72's
"Reported, not reproduced" did.

### Reproduction plan (in place of a design)

Each in a browser against the test system's current build and the working
tree's source build, with the steps recorded so a test can follow them.

1. **BUG-10.** A Simplified Annual Plan missing Guardian 1's phone and mailing
   address. (a) Open Print Preview from inside the filing; note the banner
   and Save as PDF. (b) Choose Continue, confirm. (c) Go to the dashboard
   without editing; press the filing's PDF button; note the banner, Save as
   PDF and the readiness card. (d) Repeat (c) after editing one field first,
   and again without step (b). If (c) shows "Ready to export" and (d) does
   not, the cause is the stale "Continue", and the fix belongs with 73F part
   2 ("after an override the banner says 'Continuing with N items
   outstanding'") plus clearing the "Continue" before the page is drawn.
2. **BUG-12.** An Initial Inventory with saved PDF annotations: Preview,
   Continue, Save as Excel, five times, with the browser's network and console
   panels open, noting which awaited step never finishes (the ExcelJS script,
   the template read, the write). Then the same without annotations, and with
   the preview still rendering. If the ExcelJS script load hangs, the fix is
   a time limit and a message; if it is the preview rendering at the same
   time, it belongs with 73R part 3's lazy rendering.
3. **BUG-19.** Create a Simplified Accounting through the Start New Form
   picker's Simplified card, picking a Load Ward Info source; then open New
   Form from the dashboard and from the picker; type a different ward's name;
   note the type and the source. Repeat with the "does not qualify" answer.
4. **A11Y-06.** Open a blocked preview, then the dashboard; check the page
   for an element with id `print-preview-status` and its text, in Chromium
   with a screen reader's live-region log if available.
5. **UX-07.** On a case holding only an Initial Inventory, then only a Plan,
   open New Form for each filing type and note when the note appears.

### Files

None until reproduced.

### Tests

Each reproduced defect gets a red-first browser test following its recorded
steps, in the item its fix joins.

### Checklist (AGENTS.md §8)

1–9: no change until reproduced; each fix is scoped with its own checklist
then.

### Overlap with Milestone 73

None for the reproduction itself (no source change). Likely homes for the
fixes: BUG-10 with **73F part 2** (the Preview banner); BUG-12 with **73M**
(Save as Excel) or **73R part 3** (the preview's rendering); BUG-19 with
**73L** (the eligibility dialog's order of closing); A11Y-06 with **73L** or
**73O part 3**.

---

## 74E — What the filer types stays as typed

### What a filer sees today

- A guardian named "margaret a. collins" is saved, shown and printed as
  **"Margaret a. Collins"** — the middle initial is treated like the word "a"
  — and that spelling carries into every later filing made from this one.
- On the Inventory, a masked account typed into a description, "xxxx5510",
  becomes **"Xxxx5510"**; "diamond ring, GIA cert #12; iPhone 14 serial 9"
  becomes **"Diamond Ring, GIA Cert #12; iPhone 14 Serial 9"**. The B-3
  description's own label asks the filer to "include account, policy, or
  certificate number".
- Some boxes are capitalized, others are not (Type of Income and Occupation
  are not), so a filer can't predict it.
- (QA report BUG-09)

### Evidence

- `formatSafeTitleCase()` (`src/core/form/form-contract.js` near 136–155)
  capitalizes any all-lowercase word, except the connecting words in
  `TITLE_CASE_STOP_WORDS` (near 126: of, and, the, **a**, an, for, in, on, at,
  to, by) after the first word. "a." is read as the word "a". A word that
  starts with lowercase letters and continues with anything else ("xxxx5510",
  "cert") matches its pattern (near 143) and is capitalized.
- **Confirmed by running it in node:** "margaret a. collins" → "Margaret a.
  Collins"; "xxxx5510" → "Xxxx5510"; "diamond ring GIA cert #12; iPhone 14
  serial 9" → "Diamond Ring GIA Cert #12; iPhone 14 Serial 9".
- It writes the changed text into the filing, not only the screen: a name or
  address box when the filer leaves it (`form-contract.js` near 557–560); the
  Inventory's own binding (`guardian-inventory/form-binding.js` near 58–60,
  187–197); a vehicle's Make and Model (`guardian-inventory/index.js` near
  290).
- The Inventory draws its free-text descriptions as name boxes: A-1 property
  description (near 836), B-2 description (near 905), B-3 description (near
  960), C-5 asset description (near 1054), all `'name'`.
- An Excel import runs the same function over every field whose key contains
  "description", "trust" and other words (`capitalizeImportedFields()`,
  `form-contract.js` near 820–841), called by all three importers (Annual
  `excel.js` near 942, Inventory near 794, Simplified near 503).
- History: Milestone 40H-G added the connecting-word list to stop "Living Of
  Clearwater" (comment near 117–125).

### Authority

None — no court form or rule capitalizes what a filer types. AGENTS.md §6:
Tier 1 primitives format input; nothing makes them rewrite it.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **Which boxes are capitalized automatically?** — **Settled: names and addresses only, with the token fixes; descriptions keep what was typed.** The options as asked:
   - **Names and addresses only, with the token fixes (recommended).** Person
     and business names, street addresses and city lines keep today's
     capitalization, fixed so a middle initial is capitalized and anything
     containing a digit is left alone. **Descriptions keep exactly what was
     typed.** A filer sees "Margaret A. Collins", "xxxx5510" and their own
     description, unchanged.
   - Every box that is capitalized today stays so, with the token fixes only.
     Descriptions still change word by word ("Diamond Ring").
   - No automatic capitalization anywhere. A filer who types in lower case
     files in lower case.

### Design

1. **Token rules** in `formatSafeTitleCase()`:
   - a word containing a digit is left as typed ("xxxx5510", "#12",
     "iPhone14");
   - a single letter followed by a period is an initial and is capitalized,
     even "a." and "i.";
   - as today: only all-lowercase words change; mixed case ("McLeod",
     "iPhone") and capitals ("LLC") are left alone; connecting words stay
     lowercase after the first word.
2. **Descriptions are plain text**: the A-1, B-2, B-3 and C-5 description
   boxes become plain text boxes (`data-input-type="text"`), which the
   Inventory's binding stores as typed: only `name` and `address` boxes are
   capitalized on leaving them (`form-binding.js` near 191–198).
3. **Imports** apply the same split: `capitalizeImportedFields()` stops
   matching "description"; names and addresses get the fixed rules. (73T part
   1 then limits the pass to values read from the workbook.)

### Files

`src/core/form/form-contract.js`; `src/core/form/form-fields.js` (if a
description label is resolved to a name kind there);
`src/features/guardian-inventory/index.js` (four description boxes);
`src/features/guardian-inventory/form-binding.js`.

### Tests

- New `tests/unit/typed-text-kept.spec.js`: the QA report's own cases —
  "margaret a. collins" → "Margaret A. Collins", "xxxx5510" unchanged,
  "iPhone" unchanged — plus "Sunrise Assisted Living of Clearwater"
  unchanged (40H-G's case) and "st. petersburg" as today. Red-first: the
  first two fail today.
- Extended `tests/e2e/form-entry.contract.spec.ts`: type a lowercase
  description into B-3, leave the box: the stored value is as typed.
  Red-first: it is capitalized today.
- `tests/unit/form-contract.spec.js` and `tests/e2e/annual-field-formatting.spec.ts`
  re-run; changed only where they pin a description's capitalization.

### Checklist (AGENTS.md §8)

1. **Data model:** the four description rows' `format` notes, if they say
   "title case"; `verify:data-model`.
2. **Legacy data:** text already changed stays as stored — the original is
   gone. The filer sees it and can retype it: visible and one-time (§8 item 2).
3. **Fixtures:** grep fixtures for descriptions or names whose expected value
   was capitalized by the app.
4. **Tests and index:** as above.
5. **Export/import:** the PDF and workbook print what is stored; the import
   change is above.
6. **Security:** none.
7. **UI:** no new control.
8. **Legal framing:** none.
9. **Cross-form:** one function serves all nine forms and all three imports;
   the description change is the Inventory's (the Annual's descriptions are
   already plain text: their labels resolve to `'text'` under
   `inferFieldKind()`'s rules — read from the code, unconfirmed for every
   Annual description box).

### Overlap with Milestone 73

- **73G part 1** (the amount codec) changes `form-contract.js`,
  `form-fields.js` and `guardian-inventory/form-binding.js`. **Build 74E
  alongside 73G part 1** (73's row 4), one after the other.
- **73T part 1**'s adapters limit the casing pass to imported values; 74E
  fixes the pass itself. Either order; each changes `capitalizeImportedFields()`.

---

## 74F — The certificate's "no recipients" question and lines read plainly

### What a filer sees today

- On the Inventory's D-5, the accountings' Part X / Part VI and the Plans'
  certificates, the question reads **"No recipients are required for this
  certificate (filer attestation - app does not determine legal
  necessity)"** with Yes / No — a double negative, with the app's own
  disclaimer inside the question. (QA report BUG-21, its wording. Its other
  point — the question disappearing once Recipient 1 is listed — was decided
  in Milestone 63B; the missing-item message was fixed in 72J, `f38b12f`.)
- When the filer answers Yes, **a Plan's filed PDF prints that sentence,
  disclaimer and all**, on the certificate. (Found while drafting.)
- The Simplified Accounting's certificate prints "…has been furnished to:",
  then **"None listed."**, then **"on this date: 09/28/2026"** when nobody is
  listed. The Inventory prints "None listed.", the Annual family and the
  Plans "No service recipients listed." (QA report BUG-22, its punctuation.
  Its citation of §744.362(1) is the Clerk's own text and stays — Milestone
  71's "Not covered" table.)
- The supporting-documents reminder says **"You have entered items on
  Schedule A1"**, where the form says A-1. (QA report BUG-27, the label. Its
  other point — firing on an empty new row — is 73L's.)

### Evidence

- The question: one sentence, defined four times — `plan-certificate-of-service.js`
  near 27, Annual `index.js` near 28, Inventory `index.js` near 68,
  Simplified `index.js` near 79 — used as the Yes/No label on all seven
  certificates (Annual near 1597, Inventory near 1286, Simplified near 715,
  `plan-certificate-of-service-page.js` near 50).
- The Plans' PDF: `planCertificateOfServiceSection()`
  (`plan-certificate-of-service.js` near 199) prints the question's text when
  the answer is Yes. **Confirmed by running it in node** with
  `certNoRecipients: 'Yes'`: the blocks are "I hereby certify that a copy of
  this plan has been furnished to:", "No recipients are required for this
  certificate (filer attestation - app does not determine legal necessity)",
  "on this date: …".
- The "nobody listed" lines: Simplified `pdf-model.js` near 309 ("None
  listed.") then near 318 ("on this date: …"); Inventory near 860; Annual
  near 1140 and the Plans near 199 ("No service recipients listed.").
- The reminder: `schedule-doc-ack.js` near 188 builds the label by removing
  "sch" and upper-casing the key, so the Inventory's `a1` reads "A1" and the
  Annual's `schB1` "B1".

### Authority

The Clerk's workbooks print the certificate as "…has been furnished to:",
the recipients' boxes, then "on this date………" and the date (read with a
parser: Inventory `PART VI` B8, B12/H12, B24; Annual `PART X` B9, B10/I10,
B22; Simplified `PARTS V, VI ` B25, B26/I26, B38). No workbook has a "nobody
listed" or "no recipients required" sentence; both are the app's.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **The question's wording on screen** (the stored answer keeps its meaning:
   Yes = no one needs to be served). — **Settled: "Are you certifying that no one needs to be served with a copy of this filing?", the disclaimer as a hint.** The options as asked:
   - **"Are you certifying that no one needs to be served with a copy of this
     filing?" (recommended),** with the disclaimer moved to a hint beneath:
     "The app does not decide who must be served." A filer reads one plain
     question; answers already given keep their meaning.
   - The QA report's "Does this certificate need to list service recipients?"
     Its Yes means the opposite of today's, so every saved answer is flipped
     by a migration, and a filer who has already answered sees it reversed if
     the migration misses one.
   - Keep the wording.
2. **What the filed certificate says when nobody is listed** *(filed
   wording — the requester's decision by name, as Clerk practice).* — **Settled: one wording on all seven certificates, and the app's disclaimer never prints (Pinellas Clerk practice).** The options as asked:
   - **One wording on all seven certificates (recommended):** "No service
     recipients are listed." when nobody is listed, and "No service
     recipients are required." when the filer answered Yes; the app's
     disclaimer never prints. A filer's Plan stops carrying the app's
     disclaimer onto the court's page.
   - Keep each form's wording; only remove the disclaimer from the Plans' PDF.
   - Keep everything as printed today.

### Design

1. One constant for the question and its hint, in
   `src/core/validation/service-recipients.js` beside 72J's
   `RECIPIENTS_OR_ATTESTATION`; the four copies go.
2. One PDF helper for the "nobody listed" / "none required" line, used by the
   three accounting models and the Plans' certificate; it never prints the
   question's text.
3. The reminder names the schedule as the form does: a letter followed by a
   digit gains a hyphen ("A1" → "A-1", "B1" → "B-1"); the Annual's single
   letters ("A", "C", "E") are unchanged.

### Files

`src/core/validation/service-recipients.js`; `src/core/filing/plan-certificate-of-service.js`;
`src/core/form/plan-certificate-of-service-page.js`; Annual, Inventory and
Simplified `index.js` and `pdf-model.js`; `src/core/filing/schedule-doc-ack.js`.

### Tests

- Extended `tests/unit/service-recipients.spec.js`: the question's text on all
  seven certificate pages comes from the one constant.
- New `tests/unit/certificate-no-recipients-line.spec.js`: each of the seven
  PDF models, with nobody listed and with Yes, prints the decided line and
  never the disclaimer. Red-first: the Plans print the disclaimer today.
- Extended `tests/e2e/schedule-doc-ack.spec.ts`: the reminder on the
  Inventory's A-1 names "Schedule A-1". Red-first: "Schedule A1".
- Changed: specs that read the old question text (grep "filer attestation"
  across `tests/`, as 72J's lesson says).

### Checklist (AGENTS.md §8)

1. **Data model:** none; the stored answers keep their meaning.
2. **Legacy data:** none.
3. **Fixtures:** none.
4. **Tests and index:** as above; search `tests/` for the old wording.
5. **Export/import:** PDFs change (the line); the workbooks have no such
   line and are unchanged.
6. **Security:** none.
7. **UI:** the existing Yes/No row and its hint.
8. **Legal framing:** the certificate's wording is filed text; decision 2 is
   the requester's, recorded as Clerk practice. Who must be served is not
   decided by the app.
9. **Cross-form:** one question, one line, seven certificates.

### Overlap with Milestone 73

- **73O part 2** (the certificate's shape) changes all seven certificate
  pages, the three accounting PDF models and `plan-certificate-of-service.js`.
  **Build 74F alongside 73O part 2** (73's row 29).
- **73N part 2** restores court wording in the same PDF models; sequence.
- **73L** changes `schedule-doc-ack.js` (the reminder's timing); the label
  fix is one line in the same file — build them together.

---

## 74G — Dates, periods and e-mail addresses that can't be right are caught

### What a filer sees today

All accepted with no error and no warning (QA report BUG-13, BUG-17):

- An Annual Accounting period of **18 months** (03/15/2026–09/14/2027), and a
  period that **ends in the future**.
- A Schedule B-1 or B-2 line whose own period runs **backwards** (06/01/2026
  to 04/30/2026).
- A guardian fee **paid before the order** that authorized it (paid
  07/05/2026, order 07/20/2026).
- On the Initial Plan, **Letters signed before the guardianship began**
  (03/01/2026, inception 03/15/2026).
- On the Annual Plan, a residence "from" **after** its "to", residences that
  **overlap**, and residences out of order.
- An e-mail address like **"rnguyen@"** on the attorney's, the guardian's or
  the preparer's card — printed on the filed PDF as the address for service.

(A payment dated **outside the accounting period** is 73F-8's: "Transaction
dates outside the period get a Preview warning".)

### Evidence

- Period checks: the Annual family checks only that the period runs forward
  and starts on or after the GID (`engines/annual.js` near 52–56); the
  Simplified the same (`engines/simplified.js` near 51–55); the Plans only the
  order (`engines/plan-*.js` near 21–28).
- B-1 and B-2 rows store `periodFrom` and `periodTo` (`models/annual.js` near
  10–11); the checks list neither (`engines/annual.js` near 230–231).
- No check compares a row's `courtOrderDate` with its `datePaid` anywhere in
  `src/core/validation/`.
- Initial Plan: `inceptionDate` and `lettersSignedDate` are checked for being
  filled only (`engines/plan-initial.js` near 32–33).
- Annual Plan residences: only a name is checked (`engines/plan-annual.js`
  near 44–46); rows store `from` and `to` (`models/plan-annual.js` near 72).
- E-mail: the one address pattern in the app is the feedback form's
  (`src/core/feedback/feedback-message.js` near 3); every validator checks an
  e-mail only for being filled. **Confirmed by running that pattern in node:**
  "rnguyen@" and "rnguyen@firm" fail, "rnguyen@firm.com" passes. The data
  model lists 27 e-mail fields across the nine forms and the case file.
- The shared date-order rule already exists: `checkDateOrder()`
  (`src/core/validation/date-rules.js` near 20).

### Authority

- **§744.367(2)** (Chapter 744 in `reference/legal/statutes/`, read): an
  annual accounting "must cover the preceding calendar year", or, on a
  fiscal-year basis, is filed "on or before the first day of the fourth month
  after the end of the fiscal year". **§744.367(1):** the plan "must cover the
  coming fiscal year, ending on the last day in such anniversary month". A
  first fiscal-year accounting that starts at the GID and ends with the
  anniversary month can run past twelve months (03/15/2026 to 03/31/2027). **For
  a qualified person:** how long a first or a final accounting may run is not
  settled here; the design only warns.
- The Clerk's Annual workbook, `PART I` C8 (parser): "The Guardianship
  Inception Date ("GID") is the date the Letters of Guardianship were
  signed." Letters signed before the inception date can't both be right.
- The Clerk's annual audit work slip records each court-ordered
  disbursement's "Date of court order" (`GD ANN WORK SLIP AUDIT.docx`, read)
  without saying a payment before its order is a discrepancy — whether it is
  is **Clerk practice**.
- Rule 2.515(c) (Rules of General Practice and Judicial Administration in
  `reference/legal/statutes/`, read): a signature block must include the
  signer's "e-mail address for service of court documents (if the document is
  filed or served electronically)". The rule names no format; a check that an
  address has a name, an "@" and a domain asserts nothing more than that.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **An accounting period longer than a year, or ending in the future**
   *(reads a statute — flagged for a qualified person).* — **Settled: a "Review recommended" warning.** The options as asked:
   - **A "Review recommended" warning (recommended)** when Period To is after
     the last day of the twelfth month after Period From's month (so
     03/15/2026–03/31/2027 passes, 03/15/2026–09/14/2027 is flagged), or after
     today, on the Annual family and the Simplified. A filer sees a warning
     they can file past.
   - The same as an ordinary error the filer can override.
   - No check.
2. **A date range that runs backwards** — a B-1/B-2 line's period, Letters
   before inception, a residence's from/to. — **Settled: an ordinary error the filer can override.** The options as asked:
   - **An ordinary error the filer can override (recommended),** as every
     other date-order check (`checkDateOrder()`). A filer sees the field
     named, and can still Continue.
   - A warning only.
3. **A fee paid before its court order** *(Clerk practice).* — **Settled: a "Review recommended" warning naming both dates (Pinellas Clerk practice).** The options as asked:
   - **A "Review recommended" warning (recommended)** on B-1, B-2 and B-3,
     naming both dates. A filer can still file.
   - No check.
4. **Annual Plan residences that overlap or are out of order.** — **Settled: a "Review recommended" warning.** The options as asked:
   - **A "Review recommended" warning (recommended).**
   - No check.
5. **An e-mail address that isn't one.** — **Settled: an ordinary error the filer can override, with the message beside the box.** The options as asked:
   - **An ordinary error the filer can override (recommended),** on every
     e-mail box that holds text, with the message beside the box ("Enter a
     complete e-mail address, such as name@example.com"). A blank box is
     judged exactly as today (72C: a missing guardian e-mail warns, never
     blocks). A filer sees the mistake where they typed it.
   - A warning only.
   - The message beside the box only, nothing at Preview.

### Design

1. `date-rules.js` gains `checkPeriodSpan(from, to, { today })` for decision
   1, and the existing `checkDateOrder()` is called for the B-1/B-2 rows, the
   Initial Plan's `inceptionDate` → `lettersSignedDate` (same day allowed: the
   workbook's GID is the Letters date) and each residence.
2. Warnings (decisions 1, 3, 4) are advisories in the shared checks' result
   (73F part 1's `evaluate<Engine>()` returns `advisories`), shown in Preview's
   "Review recommended" box; they never block.
3. A new `src/core/validation/email-format.js` holds the one pattern (moved
   from `feedback-message.js`, which imports it back). Every validator that
   reads an e-mail field adds the check for a non-blank value; the inline
   message uses the existing feedback shape (`setPercentFeedback()`'s pattern
   in `form-contract.js` near 661–690), tied to the box for screen readers.

### Files

`src/core/validation/date-rules.js`; new `src/core/validation/email-format.js`;
`src/core/feedback/feedback-message.js`; the seven engines under
`src/core/validation/engines/`; `src/core/form/form-contract.js` (inline
message); `probate-guardian-data-model.csv` (the e-mail rows' notes).

### Tests

- Extended `tests/unit/date-rules.spec.js`: the span rule's boundaries (the
  GID-to-anniversary case passes; 18 months and a future end are flagged).
- New `tests/unit/date-and-email-checks.spec.js`: each engine reports a
  backwards B-1/B-2 period, Letters before inception, a backwards residence,
  and "rnguyen@" on every e-mail field the data model lists for it; a blank
  e-mail adds nothing new. Red-first: every case is silent today.
- New `tests/e2e/email-format.spec.ts`: type "rnguyen@" on the Inventory's
  D-2, leave the box: the message appears beside it; Preview names it.
- The validator golden (`tests/baseline/ms73-validator-golden.json`) and the
  completion golden are regenerated, each change stated.

### Checklist (AGENTS.md §8)

1. **Data model:** `required_when` / notes for the 27 e-mail rows ("a valid
   address when entered"); `verify:data-model`.
2. **Legacy data:** a saved malformed e-mail or backwards date now shows an
   error the filer can see and correct, or override — visible.
3. **Fixtures:** grep every fixture for e-mail values without a domain and
   for B-1/B-2 period values; fix any that now fail (AGENTS.md §10 P6).
4. **Tests and index:** as above.
5. **Export/import:** an imported workbook's e-mail is judged like a typed
   one; nothing is rewritten.
6. **Security:** none new.
7. **UI:** the existing inline-feedback and "Review recommended" patterns.
8. **Legal framing:** decision 1 reads §744.367; flagged, warning only.
   Decision 3 is Clerk practice.
9. **Cross-form:** the e-mail rule on every form that has an e-mail; the date
   rules on each form that has the field.

### Overlap with Milestone 73

- **73F part 3** ("rules and asterisks") changes every validator, adds 73F-8's
  out-of-period warning and the impossible-date rule. **Build 74G alongside
  73F part 3** (73's row 18), after 73F part 2.
- **73G part 1** changes `form-contract.js` (inline feedback); sequence.

---

## 74H — Warnings when answers contradict each other

### What a filer sees today

Each of these is accepted silently and prints on the filed document (QA
report BUG-16 a–k, BUG-14's balance check, BUG-31):

| | Where | The contradiction |
| --- | --- | --- |
| a | Inventory | "Does the ward have a safe deposit box?" answered **No**, while B-2 or B-3 items are marked "In Safe Deposit Box: Yes" |
| b | Inventory D-4, Annual Part IX | The **Bond Amount is below the bond requirement** the form itself calculates |
| c | Inventory A-1, Annual D-2 | **Two properties** both marked Personal Residence |
| d | Inventory C-5 | A joint owner's share that, with the ward's share on the asset's own row, adds to **more than 100%** |
| e | Initial Plan | Cover says the ward lives **"In a facility"**, Question 2 ticks only **Private Residence** |
| f | Initial Plan | **"The ward retains the right to make their own decision"** ticked on a Plenary guardianship |
| g | Initial Plan, Plan for Minors | **Both** "declared totally incapacitated" and "a minor under the age of 14" ticked |
| h | Annual Plan | Question 2 **"N/A — the ward has not moved"** while Question 1 lists two residences |
| i | Initial Plan | Question 7 **Trusts: No** while the Inventory's C-4 lists a trust |
| j | Annual family | Part XI **"I verify there is no remuneration"** while Schedule B-2 lists guardian fees |
| k | Plan for Minors | Created for a **"Minor - Property"** guardianship |
| — | Annual family, Sch E | Transfers in and out that **don't balance** (QA report BUG-14) |
| — | Simplified | **Remaining Assets On Hand below zero** (−$1,999.13 in the report) (QA report BUG-31) |

(The QA report's 16e also asks that Question 2 accept one setting only; that
was decided otherwise in Milestone 68E, 2026-09-24, and stays.)

### Evidence

- a: the only safe-deposit rule is that the question is answered
  (`engines/guardian.js` near 138–141); B-2 and B-3 rows store
  `inSafeDepositBox` (`models/guardian.js` near 105–106).
- b: both forms compute the requirement — Annual `bondReq`
  (`src/core/accounting/annual-totals.js` near 79), Inventory
  `bondRequired()` (`guardian-inventory/totals.js` near 149) — and the bond
  advisories mention only a blank amount (`bond-depository.js` near 180).
- c: A-1 and D-2 rows store `residence` (`models/guardian.js` near 100,
  `models/annual.js` near 16); nothing counts them.
- d: a C-5 row stores free-text `assetDescription` and its own share
  (`models/guardian.js` near 115); **nothing links it to the A or B row**, so a
  check has nothing to compare against (see 74P decision 2).
- e: `wardLiving` holds the cover's answer (`plan-initial/index.js` near 324);
  Question 2's boxes are separate booleans (near 352).
- f, i, k: **the Plans have no Type of Guardianship field** (73B: "the Plans
  have no field"); the answer lives on the same case's Inventory or
  accountings. These three compare one filing with another.
- g: `certIncapacitatedNoCopy` and `certMinorNoCopy` (`plan-initial/index.js`
  near 637–638; the Plan for Minors' pair, `engines/plan-minor.js` near 58).
- h: `q2NoMove` (`models/plan-annual.js` near 98).
- j: Part XI's rule (`engines/annual.js` near 245–247) reads only its own
  tick and rows.
- Schedule E: totals summed as typed (`annual-totals.js` near 98); the check
  asks only for a date and amount per row (`engines/annual.js` near 278–280).
- Simplified Line 8: `starting + income − disbursements`
  (`simplified-accounting/totals.js` near 18). **Confirmed by running
  `calcTotals()` in node:** a $100 start, $50 service charges and $2,049.13
  federal tax give `remaining: −1999.13`, the report's figure; no check reads
  it.

### Authority

Read with a parser from the Clerk's workbooks:

- **Bond** — Inventory `PART V` H23 `=G20+G21+G22` and Annual `PART IX` H17
  `=SUM(G14:G16)` compute the requirement; the Bond Amount is an input below
  them; **no cell compares the two.** The Inventory's `PART V` text: "The
  court often requires a bond in the amount of the Ward's liquid assets."
  The Clerk's annual audit work slip: "Additional bond required: $ … (if the
  liquid assets exceed the existing bond by $5,000 or more)"; the inventory
  work slip lists "Additional bond required" with no threshold. A warning
  reads the workbook's own figure and changes no number; **the threshold is
  a new number the workbook doesn't have** (AGENTS.md §5) — decision 2.
- **Schedule E** — `SCH E BANK TRANS p1` C7: "Each transfer should be listed
  twice. Once going out of an account and again going into another account."
  F42 and H42 total each side; nothing nets them.
- **Simplified Line 8** — `PARTS I, II ` H31 `=H19+H24-H29`, the app's
  formula; the workbook doesn't flag a negative.
- **j** — §744.367(3)(a): the annual report must include "a declaration of
  all remuneration received by the guardian from any source"; "remuneration"
  means "any payment or other benefit made directly or indirectly … to the
  guardian". **Whether a Schedule B-2 guardian fee is remuneration for Part
  XI is for a qualified person**; the warning only puts the two side by side.
- **k** — §744.367(1): "each guardian of the person shall file … an annual
  guardianship plan". Whether a property-only guardian of a minor files the
  Plan for Minors is **for a qualified person**.
- **The app's own precedent:** the bond block decided 2026-09-23 that
  "nothing in the bond block gates export … a warning is enough"
  (`bond-depository.js` near 19–21).

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **Which contradictions warn, within one filing?** — **Settled: a, b, c, e, g, h, j, Schedule E and Line 8, each a "Review recommended" warning.** The options as asked:
   - **All of a, b, c, e, g, h, j, Schedule E and Line 8, as "Review
     recommended" warnings (recommended).** None blocks. A filer sees each
     contradiction named, with both answers, before filing.
   - The same as ordinary errors the filer can override.
   - A smaller list (the requester names it).
2. **How far below the requirement a bond must be to warn** *(Clerk
   practice; a new threshold — the requester's decision by name, AGENTS.md
   §5).* — **Settled: any shortfall, quoting the workbook (Pinellas Clerk practice; the threshold approved by name under AGENTS.md §5).** The options as asked:
   - **Any shortfall (recommended),** quoting the workbook's "The court often
     requires a bond in the amount of the Ward's liquid assets." A filer
     with any gap sees it.
   - $5,000 or more, the Clerk's annual audit work slip's trigger.
   - No check.
3. **Checks that compare one filing with another (f, i, k).** — **Settled: not now: a second part after 73F part 2.** The options as asked:
   - **Not now (recommended):** a second part after 73F part 2, when every
     filing — open or not — has one set of checks the others can read. A filer
     sees nothing new for these yet.
   - Now: read the same case's other filings (by case) at Preview.
4. **Part XI "no remuneration" beside B-2 guardian fees (j)** *(legal —
   for a qualified person).* — **Settled: a warning showing both, its wording reviewed by the requester.** The options as asked:
   - **A warning that shows both and lets the filer decide (recommended),**
     wording reviewed by the requester.
   - No check until a qualified person answers.

(d — the joint-owner share — needs a link from each C-5 row to its asset's
row. It is built only if 74P's decision 2 adds that link; otherwise it is
recorded as not checkable.)

### Design

1. New `src/core/filing/consistency-advisories.js`: one function per form
   engine, returning advisories in the shape `bondDepositoryAdvisories()`
   already uses (`code`, `severity: 'advisory'`, `field`, `message`), each
   message naming both answers and where they are. Preview's
   `collectOutputIssues()` (`output-preflight.js`) adds them, so they reach
   73F part 1's `evaluate<Engine>().advisories`.
2. Bond (b) joins `bondDepositoryAdvisories()`, comparing the stored Bond
   Amount with the form's own requirement, only when the chosen arrangement
   includes a bond.
3. Part 2 (decision 3) reads the case's other filings through the shared
   checks once 73F part 2 lands.

### Files

New `src/core/filing/consistency-advisories.js`; `src/core/filing/output-preflight.js`;
`src/core/filing/bond-depository.js`; tests below.

### Tests

- New `tests/unit/consistency-advisories.spec.js`: each contradiction raises
  its warning with both answers named; the consistent case raises none;
  nothing is a blocker. Red-first: every case is silent today.
- Extended `tests/unit/bond-depository.spec.js`: a bond below the requirement
  warns (per decision 2); a waived bond or depository-only arrangement doesn't.
- New `tests/e2e/contradiction-warnings.spec.ts`: one Inventory and one Annual
  Plan through the real pages — answer both sides, open Preview: the warning
  is in "Review recommended" and the PDF still saves.

### Checklist (AGENTS.md §8)

1. **Data model:** none; nothing stored.
2. **Legacy data:** saved filings with a contradiction now show a warning —
   visible, never blocking.
3. **Fixtures:** grep fixtures for `scheduleNoItems.remuneration` with B-2
   rows, bond amounts, and residence answers; warnings don't fail fixtures,
   but specs that count advisories change.
4. **Tests and index:** as above.
5. **Export/import:** none; Preview only.
6. **Security:** none.
7. **UI:** the existing "Review recommended" box.
8. **Legal framing:** j and k flagged for a qualified person; b's threshold
   is Clerk practice; no warning asserts which answer is right.
9. **Cross-form:** b on both bond blocks; c on the Inventory and the Annual;
   g on both Plans that carry the pair.

### Overlap with Milestone 73

- **73G part 2** adds its own sign warnings (a positive loss, a negative
  asset) in `output-preflight.js` and `ward-share-advisories.js`; Schedule
  E's positive "out" is 73G's, its balance is 74H's. **Build 74H alongside
  73G part 2** (73's row 19).
- **73F parts 2–3** change `output-preflight.js` and the advisories' display;
  **73M** changes the bond block's export. Sequence.
- Part 2 (decision 3) depends on **73F part 2**.

---

## 74I — Inventory witnesses: what the form asks, said accurately

### What a filer sees today

The Inventory's Cover says: **"A personal property inventory must include
the names, addresses, and occupations of witnesses present during the
physical inventory of the ward's personal effects."** A witness card stars
Name, Address and Occupation. Yet zero witnesses passes, and so does a
witness card left completely blank: the Cover shows ✓, Next works, the blank
card is quietly removed later, and the readiness card says the Cover is
complete. A half-filled card also passes. (QA report BUG-15)

### Evidence

- The sentence is the app's: `guardian-inventory/index.js` near 747, and the
  user guide `help/index.html` near 381. The Clerk's Inventory workbook has
  no witness text or cell anywhere (shared strings searched with a parser for
  "witness", "occupation", "present during": none).
- Witnesses are optional by a code comment, not a recorded decision:
  `models/guardian.js` near 59–63 ("Optional (not export-blocking) … not every
  inventory necessarily has a witness present").
- No check reads `witnesses` (none in `engines/guardian.js`, `completion.js`,
  `readiness-config.js`); the card's labels are starred (`index.js` near
  669–670); the PDF prints any witnesses listed (`guardian-inventory/pdf-model.js`
  near 162–167); the workbook has no place for them.

### Authority

**§744.365(5)** (read): "(a) The guardian shall maintain substantiating papers
and records sufficient to demonstrate the accuracy of the initial inventory
… The substantiating papers need not be filed with the court …" and "(b) As
part of the substantiating papers, the guardian must identify by name,
address, and occupation, the witness or witnesses, **if any**, who were
present during the initial inventory of the ward's personal property." The
app's "must include" reads stronger than these words. **For a qualified
person:** whether witnesses belong in the filed inventory at all; the app
asserts nothing.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **What the Inventory asks about witnesses** *(legal — for a qualified
   person).* — **Settled: optional, said accurately.** The options as asked:
   - **Optional, said accurately (recommended):** the Cover's sentence quotes
     §744.365(5)(b) ("…the witness or witnesses, if any, who were present…")
     instead of "must include"; no witness is required; a witness card the
     filer started must be complete (an ordinary error they can override), and
     an untouched card is dropped as today. A filer reads what the statute
     says and isn't asked for what isn't required.
   - Required: at least one complete witness whenever B-2 lists items (the
     QA report's request), as an ordinary error the filer can override. A
     filer with no witness present must override to file.
   - Leave it as it is.
2. **Whether listed witnesses print on the filed PDF** *(legal — for a
   qualified person).* — **Settled: keep printing them.** The options as asked:
   - **Keep printing them (recommended):** the filer chose to list them, and
     the PDF prints what was entered.
   - Stop printing them, since the statute places them among substantiating
     papers that "need not be filed".

### Design

(Decision 1, recommended.) The Cover's sentence becomes the statute's words,
cited. The witness card's stars are drawn only while the card is started
(73V's row rule decides "started"). `engines/guardian.js` checks each started
witness for name, address and occupation. The user guide's line changes with
73Q.

### Files

`src/features/guardian-inventory/index.js`; `src/core/validation/engines/guardian.js`;
`src/core/status/completion.js` (the sidebar follows the check, through 73F
part 2 if it has landed); `help/index.html` (with 73Q).

### Tests

- New cases in `tests/unit/validator-engines.spec.js` (or a new
  `tests/unit/inventory-witnesses.spec.js`): no witness passes; a started,
  incomplete witness is named; a complete one passes. Red-first: the
  incomplete witness passes today.
- Extended `tests/e2e/form-entry.contract.spec.ts`: the Cover's sentence
  quotes the statute.

### Checklist (AGENTS.md §8)

1. **Data model:** the `witnesses[]` rows' `required_when` ("a started
   witness"); `verify:data-model`.
2. **Legacy data:** a saved half-filled witness now shows an error the filer
   can complete or override — visible.
3. **Fixtures:** grep fixtures for `witnesses` with partial entries.
4. **Tests and index:** as above.
5. **Export/import:** the PDF as decided (decision 2); no workbook cell.
6. **Security:** witness names and addresses are already stored.
7. **UI:** the existing card; stars follow the rule.
8. **Legal framing:** the statute is quoted, not interpreted; both decisions
   flagged.
9. **Cross-form:** the Inventory only; no other form has witnesses.

### Overlap with Milestone 73

**73F part 3** draws every asterisk from the rules and changes the
Inventory's validator; **73Q** rewrites the guide. **Build 74I alongside 73F
part 3** (73's row 18).

---

## 74J — A filing keeps its type, and offers the right next form

### What a filer sees today

- On a Final or Trust Accounting, the Cover's **Filing Type** box can be
  changed to Annual (or any of the three) at any time. The filing is then
  relabelled everywhere — dashboard, sidebar, PDF title, workbook — with no
  question and no record. (QA report BUG-23. Its Final due date is 73I-2's:
  "Final: no due date, with its basis shown". The Final's fee heading, "Audit
  Fees – Annual Accountings per FS 744.3678", is the Clerk's own heading on
  the one workbook all three types share, so it stays.)
- A Final Accounting is the Annual's form with a different title; it asks
  nothing a final report may need beyond it (reason for termination, amounts
  reserved, assets to be turned over). (QA report BUG-23, questionable.)
- From an **Initial Guardianship Plan**, New Filing from Existing offers only
  **Initial Inventory** — never the Annual Guardianship Plan that follows it.
  (QA report BUG-24. The report's other example — only Initial Plan offered
  from an Inventory — did not hold: an Inventory offers five types.)
- After New Filing from Existing, the notice says **"Converted 'X' into a new
  Final Accounting form"**, though the source filing is untouched. (QA report
  UX-19)

### Evidence

- The select: Annual `index.js` near 680; its change goes straight to
  `setAccountingFilingType()` (near 326–327; `annual-accounting/filing-type.js`
  near 11–23), which changes the type and saves — no confirmation, no Activity
  Log entry. Crossing into or out of Trust also crosses 71E's carry boundary
  (`starting-balance-carry.js` near 39–40).
- Next forms: `CONVERT_SOURCE_TYPE` (`src/core/filing/filing-descriptor.js`
  near 111–121) lists the Annual Plan's only source as the Annual Accounting.
  **Confirmed by running `convertTargetsFor()` in node:** planInitial →
  guardian only; guardian → planInitial, simplified, annual, finalAccounting,
  trustAccounting. (New Form's Load Ward Info From does accept an Initial Plan
  for an Annual Plan, `carry-over.js` near 44 — so the gap is in New Filing
  from Existing only.)
- The notice: `conversion.js` near 389.

### Authority

- The Clerk's Annual workbook serves all three types: `PART I` H3/H4
  "Indicate Filing Type" with Annual / Final / Trust (parser). Its fee heading
  `PART II, III` B13 reads "Audit Fees – Annual Accountings per FS 744.3678".
- **Final reports:** Rule 5.680(c) (Probate Rules in `reference/legal/statutes/`,
  read): the final report "shall show receipts, disbursements, amounts reserved
  for unpaid and anticipated disbursements, costs, and fees … and a list of
  the assets to be turned over to the person entitled to them"; §744.527(1)
  and §744.511 (read) set when it is due. The Clerk's discharge work slip asks
  "Is a statement regarding costs/fees as listed above included in the final
  accounting?" **Whether the app's Final needs more than the Clerk's workbook
  is for a qualified person and the Clerk.**

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **Changing the Filing Type of an existing accounting.** — **Settled: ask first, and record it.** The options as asked:
   - **Ask first, and record it (recommended):** "Change this Final
     Accounting into an Annual Accounting? Its title, PDF and workbook will
     say Annual." Yes changes it and writes an Activity Log entry; a change
     into or out of Trust also says the Starting Balance isn't carried across
     (71E D9). A filer can't change it by a slip of the mouse.
   - Lock it on a filing created as Final or Trust; a different type is made
     with New Filing from Existing.
   - Leave it as it is.
2. **Final-specific content** *(legal and Clerk practice — for a qualified
   person and the Clerk).* — **Settled: no change until a qualified person and the Clerk answer.** The options as asked:
   - **No change until they answer (recommended);** the question records
     Rule 5.680(c)'s list and the discharge work slip's costs/fees question.
   - Add a Final-only section now: reason for termination, amounts reserved
     for unpaid costs and fees, and assets to be turned over.
3. **What New Filing from Existing offers from an Initial Plan.** — **Settled: the Annual Guardianship Plan too.** The options as asked:
   - **The Annual Guardianship Plan too (recommended),** carrying what New
     Form's Load Ward Info already carries for that pair, plus 74O's residence
     answers if built. A filer finds the next form where they look for it.
   - Every type, with the ones not offered shown greyed and a reason.
   - Leave it; the guide says to use New Form.

### Design

1. (Decision 1.) The select's change handler asks with `confirmModal()`;
   Cancel restores the previous value; Yes calls `setAccountingFilingType()`
   and `auditLog('FILING_TYPE_CHANGED', …)` under the filing's id.
2. (Decision 3.) `CONVERT_SOURCE_TYPE.planAnnual` gains `'planInitial'`;
   `convertExistingWard()` already runs the identity carry for that pair
   (`carrySourcesFor('planAnnual')` includes it).
3. The notice reads "Created a new <type> for <ward> from their <source
   type>. The <source type> is unchanged." (`conversion.js` near 389).

### Files

`src/features/annual-accounting/index.js`; `src/features/annual-accounting/filing-type.js`;
`src/core/filing/filing-descriptor.js`; `src/core/filing/conversion.js`.

### Tests

- New `tests/e2e/filing-type-change.spec.ts`: on a Final Accounting, choose
  Annual: a question appears; Cancel keeps Final; Yes changes it and the
  Activity Log records it. Red-first: no question today.
- Extended `tests/e2e/convert-ward.spec.ts`: from an Initial Plan, the target
  list includes the Annual Guardianship Plan, and the created filing carries
  the ward, guardians and attorney. Red-first: absent today.
- Extended unit coverage of `convertTargetsFor()` (the filing-type
  enumeration guard, `tests/unit/filing-type-enumeration-guard.spec.js`).
- The notice's text in `convert-ward.spec.ts`; grep `tests/` for "Converted \"".

### Checklist (AGENTS.md §8)

1. **Data model:** none (the Activity Log entry type is not a filing field).
2. **Legacy data:** none.
3. **Fixtures:** specs that change Filing Type by selecting it now answer the
   question; grep for `filingType` selections in `tests/e2e/`.
4. **Tests and index:** as above.
5. **Export/import:** unchanged; 73E-N2 already keeps a filing's type on
   import.
6. **Security:** the Activity Log entry records the type change, not values.
7. **UI:** the existing confirmation dialog.
8. **Legal framing:** decision 2 flagged; nothing asserted about a final
   report's contents.
9. **Cross-form:** the Annual family's three types; the Plans' next-form gap
   is fixed for the one pair the report found (the Plan for Minors stays
   excluded as a target, as today).

### Overlap with Milestone 73

- **73O part 4** changes `conversion.js`'s wording (near 335, "inventory
  type" → "filing type") and the filing-type names. **Build 74J alongside 73O
  part 4** (73's row 31).
- **73E part 1 / 73T part 3** keep a filing's type on import (Annual `excel.js`);
  **73I** gives the Final its due date. No shared lines with 74J's select, but
  the same subject: sequence after 73T part 3.

---

## 74K — Starting a new year doesn't hide an unfiled one

### What a filer sees today

- A Simplified Accounting for 07/01/2025–06/30/2026 is a day overdue and
  still marked Draft. The filer chooses **New year → Start New Year**. The
  dashboard row now reads **"No deadline"**, the overdue badge is gone, and
  the filing drops out of the action items. The unfiled year is reachable only
  through "Prior years", where nothing says it is overdue. (QA report BUG-20)
- The new year's **Period From starts blank**, though it is simply the day
  after last year's Period To; so does a Final Accounting made from an Annual.
  (QA report UX-06)

### Evidence

- The Start New Year dialog shows only a note on what carries over
  (`src/core/modals/year-dialogs.js` near 14–25) and starts the year without
  looking at the current year's status (near 27–34).
- New Year archives the current year's data — its workflow status included
  (`dashboardWorkflow` lives in each year's data; `filing-years.js` near 59–64
  keeps only the Judge) — and clears the period on every type (near 79, 87,
  96, 111, 141, 189).
- The dashboard computes one deadline per filing, from the open year's Period
  To (`dashboard/view-model.js` near 94–98), and builds its exception list
  from those rows only (near 228–235). Archived years appear only in the Prior
  Years dialog (`year-dialogs.js` near 36–48). Pending court review and
  Approved are not "actionable" statuses (near 10–15).
- Annual → Final through New Filing from Existing carries identity only; the
  carry's own comment says period dates are "deliberately left blank"
  (`carry-over.js` near 373–376).

### Authority

§744.367(2) (read): an annual accounting "must cover the preceding calendar
year" or the fiscal year; the due dates themselves are 73I's. Rule 5.680(c)
(read): a final report shows the financial information "from the date of the
previous annual accounting". Neither is asserted beyond prefilling a date the
filer can change.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **Starting a new year while the current one isn't marked filed** (Pending
   court review, Approved, or closed). — **Settled: say so, and keep the old year in view.** The options as asked:
   - **Say so, and keep the old year in view (recommended).** The dialog
     says: "Year 1 is still marked Draft and was due 09/28/2026. Starting Year
     2 keeps Year 1 under Prior years; the dashboard keeps showing it as
     overdue until it is marked filed." The filer can go ahead. The dashboard
     row shows an overdue earlier year as its own exception.
   - Refuse to start a new year until the current one is marked filed.
   - The dashboard exception only; no note in the dialog.
2. **The new period's dates.** — **Settled: Period From prefilled as the previous Period To plus one day; Period To left blank.** The options as asked:
   - **Period From = the previous Period To plus one day; Period To left
     blank (recommended),** on New Year (accountings and Plans) and on Annual
     → Final. A filer types one date instead of two, and the end — which
     depends on the court's fiscal-year order — stays theirs.
   - Both: Period To one year after Period From, less a day.
   - Neither, as today.

### Design

1. `showStartNewYearModal()` reads the open year's status and due date
   (through the dashboard's own deadline function) and fills a note element
   in `fragments/common-modals.html`.
2. `projectWard()` (`dashboard/view-model.js`) also projects each archived
   year in `ward.years[]` through the same deadline function; an archived year
   with an actionable status and a passed due date adds an "Earlier year
   overdue" exception naming the year's label.
3. `startNewWardYear()` (`filing-years.js` near 289) sets the seed's
   `periodFrom` from the closing year's `periodTo` before the reset clears it;
   the Annual → Final carry does the same from the source's `periodTo`.

### Files

`src/core/modals/year-dialogs.js`; `fragments/common-modals.html`;
`src/core/filing/filing-years.js`; `src/features/dashboard/view-model.js`;
`src/features/dashboard/index.js`; `src/core/filing/carry-over.js`.

### Tests

- Extended `tests/unit/dashboard-view-model.spec.js`: an archived Draft year
  past its due date is an exception; an archived Approved one is not.
  Red-first: no exception today.
- New `tests/e2e/new-year-keeps-overdue.spec.ts`: through the real New year
  button on a Simplified Accounting — the dialog names the unfiled year; after
  starting, the dashboard still lists it as overdue, and the new Period From
  is the day after. Red-first: neither today.
- `tests/e2e/year-rollover.characterization.spec.ts` and
  `tests/baseline/ms70-year-rollover-golden.json` regenerated with the
  prefilled Period From stated.

### Checklist (AGENTS.md §8)

1. **Data model:** none; `periodFrom` and the archived years' data exist.
2. **Legacy data:** saved earlier years with an overdue Draft status start
   appearing on the dashboard — visible, and correct.
3. **Fixtures:** the year-rollover golden; grep fixtures that start a New
   Year and assert a blank Period From.
4. **Tests and index:** as above.
5. **Export/import:** none.
6. **Security:** none.
7. **UI:** the existing dialog and dashboard exception patterns.
8. **Legal framing:** none asserted; due dates are 73I's.
9. **Cross-form:** every type with New Year; the Final carry for the Annual
   family.

### Overlap with Milestone 73

- **73A** (built 2026-10-06) changes `filing-years.js`: New Year
  clears every signer's choice and stamp. Build 74K after 73A.
- **73I** changes the dashboard's due dates in `dashboard/view-model.js`;
  74K's archived-year exceptions use them. **Build 74K alongside 73I** (73's
  row 21).
- **73P D23** rewrites the Start New Year dialog's sentence
  (`common-modals.html` near 107; `year-dialogs.js` near 19–21); **73J part 2**
  changes the dashboard's Automatic label. Sequence.

---

## 74L — Screen readers, page titles and text size

### What a filer sees today

For a filer using a screen reader or larger text (QA report A11Y-02, A11Y-03,
A11Y-04, A11Y-05, A11Y-07, UX-40):

- A date box holding an impossible date is announced only as "Use
  MM/DD/YYYY"; the error itself is never read. (Percent boxes and City/State/Zip
  boxes already read their errors: Milestone 71C, `5a5793a`.)
- On the Plans, a "check all that apply" question's heading — sometimes
  empty — is read as part of the **first checkbox's** name, e.g. "Check all
  that apply: The Ward was declared totally incapacitated…".
- The dashboard's **Judge** column box is announced as **"Assignee for
  <ward>"**.
- The browser tab always reads **"Guardian Forms App"**, on every page and
  every filing, so tabs, history and screen-reader page announcements can't
  tell pages apart.
- Dashboard labels, sidebar labels and badges are as small as **0.62rem
  (about 10px)**.

### Evidence

- Impossible date: `form-contract.js` near 486–489 marks the box invalid and
  keeps the draft but adds no message; the box's description points only to
  its hint (`form-fields.js` near 218, hint text near 247). The pattern that
  does tie a message in is `setPercentFeedback()` (`form-contract.js` near
  661–690).
- Check groups: `planCheckGroup()` (`src/core/form/field-html.js` near
  130–137) draws `<label class="form-label">${label}</label>` with no `for`;
  `linkLabelsToInputs()` (`form-runtime.js` near 100–133) then binds any
  unbound label to the first input in the next block — the first checkbox.
  Ten groups on the Initial Plan pass an empty label (`plan-initial/index.js`
  near 351, 355, 379, 383, 397, 406, 489, 501, 511, 557); "Check all that
  apply:" heads the Initial Plan's and the Plan for Minors' certifications
  (near 636; `plan-minor/index.js` near 413). Read from the code; not run in
  a browser here.
- Judge: the column header and sort say "Judge" (`dashboard/index.js` near
  300, 326); the box's `aria-label` says "Assignee for …" (near 225).
- Title: `index.html` near 8; nothing in `src/` writes `document.title`
  (searched). The router already runs a shared step after drawing every page
  (`decorateTestSystemTitles()`, `router.js` near 166 and 300).
- Text size: e.g. `dashboard.css` near 374 (0.62rem), 283 (0.63rem), 104
  (0.65rem); `shell.css` near 115 (0.67rem), 195 (0.68rem), 82 (0.71rem);
  `cards.css` near 78; `forms.css` near 159.

### Authority

The report cites WCAG 2.1 AA (2.4.2 Page Titled, 2.5.3 Label in Name, and
error identification); the WCAG text is not in `reference/` and was not read
here. AGENTS.md §6: binary radio pairs already sit "inside a semantic
`<fieldset>`/`<legend>`".

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **The Judge box's name.** — **Settled: "Judge for <ward>".** The options as asked:
   - **"Judge for <ward>" (recommended):** the visible column, the sort and
     the "Also set this judge…" confirmation all say Judge. A screen-reader
     user hears what a sighted filer reads.
   - Rename the column "Assignee" everywhere.
2. **What the browser tab says.** — **Settled: the page and the filing type, without the ward's name.** The options as asked:
   - **The page and the filing type, without the ward's name (recommended):**
     "Schedule B-1 — Initial Inventory — Guardian Forms", with the test
     system's warning first while it is on. The tab title reaches browser
     history and window lists, and 73O part 3 is already taking the ward's
     name out of the console (AGENTS.md §8 item 6).
   - Include the ward's name, as the QA report suggested ("…— Pemberton —…").
3. **The smallest text.** — **Settled: 0.75rem (12px).** The options as asked:
   - **0.75rem (12px) for any app text (recommended),** checked by a test
     over the stylesheets. Some dashboard and sidebar rows grow.
   - 0.6875rem (11px).
   - Leave it.

### Design

1. One helper, `setFieldMessage(control, key, text)`, generalizing
   `setPercentFeedback()`: draws the message, adds its id to the box's
   description beside the hint, removes it when cleared. The impossible-date
   branch uses it: "Enter a real date as MM/DD/YYYY, with a four-digit year."
2. `planCheckGroup()` draws a `<fieldset>` with a `<legend>`; an empty label
   takes the question's own heading (the `planQ()` `<h2>`) through
   `aria-labelledby`. No `<label>` is left unbound.
3. The Judge box's `aria-label` becomes "Judge for <ward>".
4. The router's post-draw step sets `document.title` from the page's visible
   heading and the filing type (decision 2).
5. Every `font-size` below the decided minimum is raised; a unit check reads
   `src/styles/*.css` for smaller values.

### Files

`src/core/form/form-contract.js`; `src/core/form/field-html.js`;
`src/core/form/form-runtime.js`; `src/features/dashboard/index.js`;
`src/core/navigation/router.js`; `src/core/ui/test-system-title.js` (if the
title shares its prefix); `src/styles/*.css`.

### Tests

- New `tests/e2e/accessible-errors-and-groups.spec.ts`: an impossible date's
  box is described by its error; a Plan check group is a fieldset named by its
  question, and its first checkbox's accessible name is its own label only;
  the Judge box is named "Judge for …". Red-first: all three fail today.
- New `tests/e2e/page-title.spec.ts`: the tab title changes with the page
  and names the filing type. Red-first: constant today.
- New `tests/unit/minimum-text-size.spec.js`: no stylesheet value below the
  minimum. Red-first: about 20 today.
- Changed: Plan page snapshots (`plan-*-mount` specs) for the fieldset markup;
  `form-field-labels.spec.ts`.

### Checklist (AGENTS.md §8)

1. **Data model:** none.
2. **Legacy data:** none.
3. **Fixtures:** none.
4. **Tests and index:** as above; `npm run check:types` (the router).
5. **Export/import:** none; PDFs are tagged separately and unchanged.
6. **Security:** decision 2 keeps the ward's name out of the tab title.
7. **UI:** the existing radio-group pattern (fieldset/legend) for checkbox
   groups; the existing inline-message pattern.
8. **Legal framing:** none.
9. **Cross-form:** all nine forms share each fix.

### Overlap with Milestone 73

- **73O part 3** (accessibility and the console) changes `form-runtime.js`'s
  label fallback and adds `tests/e2e/accessible-names.spec.ts`. **Build 74L
  alongside 73O part 3** (73's row 30).
- **73K part 1** changes `renderPage()` in `router.js` (the title step);
  **73F parts 2–3** change the page checklist and the date messages; **73R
  part 1** reshapes the sidebar's heights in `shell.css`; **73J part 2**
  changes `dashboard/index.js`. Sequence.

---

## 74M — Account numbers, Bar numbers and Social Security numbers on filed documents (decided: no change)

### What a filer sees today

- **Account numbers print in full** on the filed PDFs: the Inventory prints
  "Acct # 1234567890123"; the Annual family's schedules print the account and
  bank-account columns as typed. (QA report BUG-30, questionable.)
- A Florida Bar number typed **1234567 prints as 01234567**; 98765 as
  00098765. (QA report BUG-18 — counted as decided in the audit, because
  Milestone 36 chose the padding on purpose; **re-asked here** because the
  report questions its basis.)
- **Found while drafting, not in the QA report:** the PDFs print the last
  four digits of a guardian's SSN or EIN ("***-**-1234"), and the Excel
  workbooks write the whole number (73Q records the guide's misstatement of
  the latter).

### Evidence

- Account numbers are kept as typed (`formatAccountNumber()`,
  `form-contract.js` near 796–799) and printed as typed: Inventory
  `pdf-model.js` near 299; Annual `pdf-model.js` near 374, 401, 434, 467, 690,
  914, 949, 994.
- Bar numbers: `formatBarNumber()` (`form-contract.js` near 788–794) keeps up
  to eight digits and pads to eight. Milestone 36's record: "Florida Bar
  numbers normalize to eight digits: shorter numeric values are left-padded
  with zeroes" (`MILESTONE-ARCHIVE.md` near 9208); no source for the
  eight-digit form is cited there.
- SSN: `maskSSN()` (`src/core/pdf/ssn-format.js` near 4–17) prints the last
  four digits.

### Authority

Read from the Florida Rules of General Practice and Judicial Administration
in `reference/legal/statutes/` (July 1, 2026 compilation, pp. 137–139):
**Rule 2.425(a):** "Unless authorized by subdivision (b), statute, another
rule of court, or court order, designated sensitive information filed with
the court must be limited to: … (3) no portion of any: (A) social security
number, (B) bank account number, … (4) the last four digits of any: … (F)
financial account number, except as set forth in subdivision (a)(3), …".
**Rule 2.425(b):** "Subdivision (a) does not apply to: (1) an account number
which identifies the property alleged to be the subject of a proceeding; …
(9) information used by the clerk for case maintenance purposes or the courts
for case management purposes". **Rule 2.515(c):** an attorney's signature
block "must also include the signer's Florida Bar number" — no format given.

Against that, the Clerk's own instruments ask for these numbers: the
workbooks ask for "the Financial Institution's Account Number (NOT Routing
Number)" (Annual and Inventory shared strings, parser) and an SSN/EIN on the
signature pages; the annual audit work slip asks "Assets identified by name,
address and account numbers?" and "Are bank account numbers listed?", and the
review work slips "Is the guardian's social security number listed on the
signature page?" (`reference/legal/workslips/`, read).

**All three questions are for a qualified person and the Clerk.** Nothing here
decides whether a guardianship inventory's or accounting's account numbers
fall under subdivision (b)(1), or whether a statute or order authorizes the
SSN.

### Decisions (settled 2026-10-06 by the requester; Bar numbers against the recommendation)

1. **Account numbers on filed PDFs** *(legal and Clerk practice).* — **Settled: no change until a qualified person and the Clerk answer.** The options as asked:
   - **No change until a qualified person and the Clerk answer
     (recommended).** The PDFs keep printing what the Clerk's own form asks
     for; the question is recorded with the rule's text and the Clerk's
     instruments.
   - A per-filing choice, "Print account numbers as their last four digits",
     on the PDF only (the workbook keeps its own cells).
   - Always print the last four digits.
2. **Florida Bar numbers** *(re-ask of Milestone 36's decision, whose basis
   isn't recorded).* — **Settled: keep padding to eight digits, as Milestone 36 decided — against the recommendation.** The options as asked:
   - **Keep the digits exactly as typed, up to eight, with no padding
     (recommended).** A number the attorney typed can't be changed by the app;
     "0123456" stays "0123456".
   - Keep padding to eight digits, as Milestone 36 decided.
3. **Social Security numbers on filed PDFs and workbooks** *(legal — found
   while drafting; for a qualified person).* — **Settled: PDFs keep printing the last four digits — the requester: "PDF prints last 4 per minimization rule" — and the workbooks keep the full number their cells ask for (asked separately, the same day); both recorded as Pinellas Clerk practice. Rule 2.425(a)(3)(A)'s text, "no portion of any social security number", stands beside it, and (a)(4)'s last-four allowance names taxpayer and employer identification numbers; the rule's reading stays flagged for a qualified person.** The options as asked:
   - **No change until a qualified person answers (recommended);** the
     question records Rule 2.425(a)(3)(A)'s text beside the Clerk's
     instruments, which ask for the number.
   - Print no portion on the PDFs at once, pending the answer (the workbook
     unchanged).

### Design

**Nothing to build.** Decision 2 keeps Milestone 36's padding; decision 3
keeps today's output as Pinellas Clerk practice; decision 1 stays open for a
qualified person and the Clerk, with the PDFs printing what the Clerk's form
asks for meanwhile. The questions and the rule's text stay recorded here.

### Files

None. Should a qualified person answer decision 1 or the rule's reading in
decision 3 differently: the PDF models; `src/core/pdf/ssn-format.js`; the
three Excel exporters.

### Tests

None to add. Bar-number padding stays as `tests/unit/form-contract.spec.js`
pins it today.

### Checklist (AGENTS.md §8)

1. **Data model:** decision 2 — the Bar-number rows' format note;
   `verify:data-model`. Decision 1's option 2 would add one per-filing field.
2. **Legacy data:** a stored padded Bar number stays padded until retyped —
   visible, one-time.
3. **Fixtures:** grep fixtures for Bar numbers asserted padded.
4. **Tests and index:** as above.
5. **Export/import:** the workbooks write what is stored; an imported Bar
   number is kept as read.
6. **Security:** this item is the sensitive-data question itself; nothing
   new is stored.
7. **UI:** none, or one checkbox (decision 1, option 2).
8. **Legal framing:** every question flagged; the rule is quoted, not
   applied.
9. **Cross-form:** one formatter for every Bar number; account numbers and
   SSNs on all three accounting-type PDFs and workbooks.

### Overlap with Milestone 73

**73A** and **73B** change the same PDF models; **73T parts 2–4** the
workbooks' SSN and account cells; **73Q** corrects the guide's SSN statement.
Decision 2 touches only `form-contract.js` (with **73G part 1**: sequence).
Nothing here is built until the questions are answered.

---

## 74N — A Trust Accounting names the trust it reports on

### What a filer sees today

A filer makes a Trust Accounting — from scratch or with New Filing from
Existing from an Annual Accounting whose Part VIII lists a trust created after
the guardianship began. The Cover asks nothing about the trust: no name, no
trustee, no date it was created or funded. Nothing carries from Part VIII. The
Starting Balance is blank, with a note quoting the Clerk's work slip. The
filed PDF is titled "Trust Guardianship Accounting" and never says which
trust. (QA report BUG-08. Milestone 71E stopped the wrong carry of the whole
estate's net assets, `025657a`; the rest was left open: "Still open; still
rated P0 by the report".)

### Evidence

- The Cover has a Filing Type box and nothing trust-specific (Annual
  `index.js` near 680).
- A trust exists only as a Part VIII row on an Annual: name, trustee, account
  number, date created, type, share, amount (`models/annual.js` near 23).
- Across the trust boundary nothing is carried (`starting-balance-carry.js`
  near 21–24, 39–40, 65), and the note quotes the work slip (near 110–112).
- The title: `filing-descriptor.js` near 33 ("TRUST GUARDIANSHIP
  ACCOUNTING", kept by 73O-5).

### Authority

- **The Clerk's Annual workbook** (parser), the instrument for all three
  types: `PART VIII` asks "#1. Does the Ward have one or more Trusts?" and
  "#2. Was Trust 1 created after the Guardianship Inception Date?" for three
  trusts, and says: "If the answers to questions #1 and #2 for Each trust are
  both 'YES' you MUST file a separate trust accounting for Each trust." Its
  `PART I` has no trust-identity cell.
- **AO 2024-025 §D.1** (read): "Trust accountings may be filed in other
  formats but must include the information on the calculation of yearly fees
  and conform to the annual report filing schedule."
- **The Clerk's trust work slip** (`GD ANN Work Slip TRUST.docx`, read) asks:
  "Order to establish any type of trust after inception of guardianship?",
  "Date the funds were received by the trust", "Trustee's Name", "Is the
  trustee and the guardian the same person?", and for the starting figure:
  "If 1st trust accounting, is the disbursement amount on the annual
  accounting the same as the beginning of the trust accounting? OR Ending
  balance of last inventory/trust accounting or amended trust accounting".
- Milestone 71's Clerk question 8 (a first trust accounting's starting
  figure) is still unanswered.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **How a Trust Accounting identifies its trust.** — **Settled: a "This accounting reports on" block on the Cover.** The options as asked:
   - **A "This accounting reports on" block on the Cover (recommended):**
     name of the trust, trustee, whether the trustee is the guardian, date
     created, date the funds were received, trust account number. Made from
     an Annual, the filer picks one of its Part VIII trusts created after the
     guardianship began, and its details fill the block. The block prints on
     the PDF's first page; the Clerk's workbook has no cell for it, which the
     export says (73T's "not carried" notes). A filer's trust accounting says
     which trust it is.
   - The trust's name only.
   - Leave it.
2. **A first trust accounting's Starting Balance** *(Clerk practice — re-asks
   the open half of Milestone 71's D9 and Clerk question 8).* — **Settled: blank, with the work slip quoted, as today (Pinellas Clerk practice).** The options as asked:
   - **Blank, with the work slip quoted, until the Clerk answers
     (recommended)** — as today.
   - The filer picks the Annual's disbursement into the trust (a B-schedule
     row), and its amount fills the Starting Balance.
   - Part VIII's ward amount for that trust.
3. **One trust per Trust Accounting?** — **Settled: yes, one trust each.** The options as asked:
   - **Yes (recommended),** as the workbook says ("a separate trust
     accounting for Each trust"); New Filing from Existing offers one Trust
     Accounting per qualifying trust.
   - The filer may name several.

### Design

(Decision 1 and 3, recommended.)

1. The Annual-family model gains `trustInfo: { name, trustee,
   trusteeIsGuardian, dateCreated, dateFunded, accountNo }`, drawn on the
   Cover only while Filing Type is Trust; `trusteeIsGuardian` is tri-state
   (`''` / Yes / No, AGENTS.md §4).
2. New Filing from Existing, Annual → Trust: when the source's Part VIII has a
   trust answered Yes to both questions, the dialog asks which; its fields
   copy into `trustInfo`. None qualifying: the block starts blank.
3. The Trust Accounting's check names a blank trust name (an ordinary error
   the filer can override).
4. The PDF prints the block under the case caption. The workbook writes
   nothing for it; an import keeps it from the filing.

### Files

`src/core/filing/models/annual.js`; `src/features/annual-accounting/index.js`
(the Cover); `src/features/annual-accounting/pdf-model.js`;
`src/core/validation/engines/annual.js`; `src/core/filing/conversion.js` and
`src/core/modals/convert-ward-modal.js` (the trust choice);
`probate-guardian-data-model.csv`.

### Tests

- New `tests/unit/trust-accounting-identity.spec.js`: the block's copy from a
  Part VIII row, the check, the PDF block. Red-first: none exists.
- New `tests/e2e/trust-accounting-identity.spec.ts`: an Annual with two
  qualifying trusts → New Filing from Existing → Trust: the filer is asked
  which; the chosen trust's name, trustee and dates are on the Cover and the
  PDF. Red-first.
- The conversion golden (`tests/baseline/ms70-conversion-golden.json`)
  regenerated, the change stated.

### Checklist (AGENTS.md §8)

1. **Data model:** six `trustInfo.*` rows under `annual_accounting`, required
   when Filing Type is Trust (name only); the account number classed
   `financial`, like Part VIII's; `verify:data-model`.
2. **Legacy data:** a saved Trust Accounting shows an empty block and the
   check names it — visible; test-system data only.
3. **Fixtures:** every Trust Accounting fixture gains a trust name.
4. **Tests and index:** as above.
5. **Export/import:** the PDF prints it; the workbook has no cell (73T's
   notes say so); an import keeps the filing's block.
6. **Security:** one more account number, already classed `financial` on
   Part VIII.
7. **UI:** Part VIII's own field labels, reused.
8. **Legal framing:** decision 2 is Clerk practice; nothing is asserted about
   what a trust accounting must contain beyond the workbook, the AO and the
   work slip, quoted.
9. **Cross-form:** the Annual family only; the Inventory's C-4 trusts feed
   the Annual's Part VIII already (`conversion.js` near 152–158).

### Overlap with Milestone 73

- **73T part 3** (the Annual workbook, Part VIII's boxes) — 74N's block is a
  "not carried" entry in its contract. **Build 74N after 73T part 3** (73's
  row 11).
- **73B** changes `models/annual.js`; **73A**, **73H** and **73N** change the
  Annual's `pdf-model.js`; **73O-5** keeps the title and the guardian as
  signer. Sequence after them.

---

## 74O — More carried forward from the ward's other filings

### What a filer sees today

(QA report UX-01, UX-03, UX-04, UX-05, UX-11)

- **Inventory:** the Cover's "Guardian Name(s)" and "Attorney for Guardian"
  are typed again on D-1 and D-2. (The certificate on D-5 already uses D-2's
  attorney: Milestone 72H, `988f993`.)
- **Plans:** Question 7's benefits and trusts are answered from scratch,
  though the ward's Inventory lists the income sources (C-1) and trusts (C-4).
- **Annual Plan made from the Initial Plan:** where the ward lives — the
  residence, its address and phone, the mailing address — is typed again.
  (The attorney's e-mails already carry: 72B, `c9473a8`.)
- **Annual Plan, daily living:** nothing shows last year's rating beside each
  activity. (The two Plans' lists and scales differ because their court
  forms differ — 15 activities with "needs some assistance" on the Initial,
  16 with "needs assistance" on the Annual — and stay as they are.)
- **Remuneration:** the Annual Plan's Question 11 and the Annual Accounting's
  Part XI each declare remuneration, and neither shows the other.

### Evidence

- Inventory Cover boxes: `guardian-inventory/index.js` near 737–738; D-1 and
  D-2 start blank; 72A/72H warn when they differ
  (`form-derived-fields.js` near 90–160).
- No Q7 mapping from an Inventory anywhere (`carry-over.js`, `conversion.js`
  searched); Initial Plan Q7 fields `models/plan-initial.js` near 55–58.
- The Annual Plan's carry copies guardians and the attorney only
  (`carry-over.js` near 220–245); `wardLiving` and the residence and mailing
  fields (`models/plan-annual.js` near 93–94) aren't mentioned in it.
- `PLAN_ADLS` 16 (`models/plan-annual.js` near 51), `INITIAL_ADLS` 15
  (`models/plan-initial.js` near 8) — **counted by running both in node**;
  the original forms: `plan-annual-original.txt` near 281–311 (A–P, "Choose
  an item"), `plan-initial-original.txt` near 178–228.
- Q11: `q11NoRemuneration`, `q11ReceivedName`, `q11Amount`, `q11From`
  (`models/plan-annual.js` near 150–151).

### Authority

- §744.367(3)(a) (read): both the plan and the accounting "must both include
  a declaration of all remuneration received by the guardian". §744.367(1):
  the plan "must cover the coming fiscal year"; 73I-N3 made the Plans' period
  the coming plan year. **Which period a plan's remuneration declaration
  covers — and so which accounting it should match — is for a qualified
  person.**
- Milestone 73B's rule: no answer the filer didn't give. A hint is not an
  answer; a filled-in Yes/No is.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **Inventory D-1 and D-2 from the Cover.** — **Settled: a "Use the Cover's name" button.** The options as asked:
   - **A "Use the Cover's name" button beside an empty name box
     (recommended).** One click fills it; nothing is filled unasked, and a
     Cover listing two guardians doesn't put both names in one card.
   - Fill the empty box automatically when the Cover holds one name.
   - Leave it; 72A and 72H's warnings stay.
2. **The Plans' Question 7 from the Inventory.** — **Settled: a note listing what the Inventory records, no answer filled.** The options as asked:
   - **A note listing what the ward's Inventory records (recommended)** —
     "The Initial Inventory lists: Social Security Administration (C-1);
     Pemberton Family Revocable Trust (C-4)" — with no answer filled in (73B).
   - Pre-answer the matching questions Yes.
3. **The ward's residence on the next Plan.** — **Settled: carry it.** The options as asked:
   - **Carry it (recommended),** as the guardians and the attorney already
     carry: where the ward lives, the residence address and phone, the mailing
     address. A filer changes what changed.
   - Leave it blank.
4. **Last year's daily-living ratings.** — **Settled: show "Last plan: <rating>" beside each activity.** The options as asked:
   - **Show "Last plan: <rating>" beside each activity (recommended),**
     matched by activity name from the ward's previous Plan, and never fill
     the new rating.
   - Fill the new ratings with last year's.
5. **Remuneration between the Plan and the accounting** *(legal — for a
   qualified person).* — **Settled: reference only, no warning, until the period question is answered.** The options as asked:
   - **Show the same case's Annual Accounting Part XI entries beside Question
     11 for reference only, with no warning, until the period question is
     answered (recommended).**
   - Warn when the Plan says none and the accounting lists some.

### Design

(All recommended.) A button in the Inventory's D-1 and D-2 cards copying the
Cover's text into the empty name box. On the Initial and Annual Plans, a note
above Question 7 built from the case's latest Inventory (by case, as Link to
Case finds them). `carryOverFieldsForPlan()` adds `wardLiving`,
`residenceAddress`, `residenceCityStateZip`, `residencePhone`,
`mailingAddress`, `mailingCityStateZip` for an Annual Plan from an Initial or
Annual Plan. The Annual Plan's daily-living rows show the previous Plan's
rating as text. Question 11 shows a read-only list of the accounting's Part
XI entries.

### Files

`src/features/guardian-inventory/index.js`; `src/core/filing/carry-over.js`;
`src/features/plan-initial/index.js`; `src/features/plan-annual/index.js`;
`src/core/case-resolver.js` (finding the case's other filings, read only).

### Tests

- Extended `tests/unit/ward-carryover.spec.js`: Initial Plan → Annual Plan
  carries the residence fields. Red-first: they arrive blank today.
- New `tests/e2e/carry-forward-hints.spec.ts`: the D-1 button fills the name;
  the Q7 note lists the Inventory's C-1 and C-4; "Last plan:" shows beside an
  activity; Q11 lists Part XI entries. Each red-first.
- The conversion golden regenerated for the residence carry.

### Checklist (AGENTS.md §8)

1. **Data model:** none; every field exists. (`wardLiving` and the residence
   rows' notes say they carry.)
2. **Legacy data:** none; carries apply to new filings.
3. **Fixtures:** the conversion golden; grep Annual Plan fixtures made by
   carry for a blank residence.
4. **Tests and index:** as above.
5. **Export/import:** none; the Plans have no workbook.
6. **Security:** the residence is already in the source filing.
7. **UI:** the existing card buttons and note style (`schedule-instructions`).
8. **Legal framing:** decision 5 flagged; no answer is given for the filer.
9. **Cross-form:** the Inventory, the Initial and Annual Plans; the Plan for
   Minors' fields differ and are left for a later item (unconfirmed whether
   its residence fields map one to one).

### Overlap with Milestone 73

- **74B** changes the Inventory's guardian cards on D-1: build 74O after 74B.
- **73O part 1** (names) changes `carry-over.js` near 156, the Plans' attorney
  and guardian-name fields and their warnings. **Build 74O alongside 73O
  part 1** (73's row 28).
- **73N part 2** rewrites the Plans' question wording on the same pages;
  sequence.

---

## 74P — Entry helpers on the Inventory and the address cards

### What a filer sees today

(QA report UX-08, UX-09, UX-24)

- **C-1 income:** the filer records how often a payment comes, then works out
  the yearly total by hand.
- **C-5 joint owners:** every jointly owned asset already listed on A-1 to
  B-4 with a ward's share below 100% is typed again on C-5, with nothing
  connecting the two.
- **Addresses:** where a mailing address is the same as the residence (the
  Plans' ward), or an office address the same as the mailing address (a
  guardian on the Annual and the Plans), it is typed twice.

### Evidence

- C-1 stores the frequency and the annual amount only (`models/guardian.js`
  near 108; page near 992–995).
- C-5 stores a free-text description and its own share; no link to an A or B
  row (`models/guardian.js` near 115; page near 1054–1057).
- No "same as" control anywhere in `src/` (searched). The pairs:
  `models/plan-initial.js` near 36–37 and `models/plan-annual.js` near 93–94
  (ward residence / mailing); `models/annual.js` near 50 and
  `models/plan-rows.js` near 16 (guardian mailing / office).

### Authority

Read with a parser (AGENTS.md §5):

- **C-1** (`C-1 INCOME pg 1`): H18 "Annual Income Amount" is an **input**, with
  the instruction (C15) "Annual Income Amount = The total amount of money the
  Ward receives from the Payer in a 12-month period (regardless of the
  frequency of payments)"; C14 lists frequencies M / Q / S / A / O; J19
  `=H19*I19` multiplies the annual amount by the ward's share. **No cell
  computes an annual amount from a payment.** A helper that proposes one
  proposes a number the filer files — **the requester's decision by name.**
- **C-5** (`C-5 JOINT OWNERS pg 1 `): H `=F*G` (joint owner's value = total ×
  joint owner's share). The example row names the source row in its
  description ("Schedule A-1, item 1") and shows a 50% share; the workbook
  links nothing.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **A yearly-total helper on C-1** *(proposes a filed number — AGENTS.md §5,
   the requester's decision by name).* — **Settled: an optional helper that fills the box only on "Use" (approved by name under AGENTS.md §5).** The options as asked:
   - **An optional helper beside the box (recommended):** "Payment amount ×
     payments a year (Monthly 12, Quarterly 4, Semi-annually 2, Annually 1)";
     it fills the Annual Income Amount only when the filer presses "Use", and
     offers nothing for Other. The filed figure stays the filer's, as the
     Clerk's form asks.
   - No helper; the form's instruction is shown beside the box.
   - Compute the annual amount automatically from a payment amount.
2. **C-5 rows from A/B rows.** — **Settled: an "Add a joint owner for this asset" button; the share left blank; no stored link.** The options as asked:
   - **An "Add a joint owner for this asset" button on an A-1 to B-4 row whose
     ward's share is below 100% (recommended):** it adds a C-5 row with the
     description ("Schedule A-1, item 1 — <description>", as the workbook's
     example does) and the full value; the joint owner's share is left blank
     (73B); nothing links the rows afterwards. 74H's share check (d) is then
     not built.
   - The same, and the joint owner's share prefilled as 100 minus the ward's
     — which assumes one other owner *(a computed filed figure: AGENTS.md §5,
     the requester by name).*
   - The same as the first, plus a stored link to the source row, so 74H can
     check that the shares add up (a new stored field and its migration).
3. **"Same as" for repeated addresses.** — **Settled: a "Same as" checkbox.** The options as asked:
   - **A "Same as residence" / "Same as mailing" checkbox (recommended):**
     ticked, the second address is hidden and filed as the first; what was
     typed there is kept and returns when unticked (AGENTS.md §4).
   - A "Copy" button that copies once and stores nothing extra.

### Design

(Recommended.) C-1: a small calculator row with its own amount box (73G's
amount codec) and a "Use" button writing `annualIncomeAmount`. C-5: the button
calls the C-5 row factory with the source's description, label and full value.
"Same as": a boolean per pair (`mailingSameAsResidence`,
`officeSameAsMailing`); while ticked, the PDF models and checks read the first
address.

### Files

`src/features/guardian-inventory/index.js`; `src/core/filing/models/guardian.js`
(C-5 row from a source row); the Plans' and the Annual's `index.js` and
`pdf-model.js` for "same as"; `probate-guardian-data-model.csv`.

### Tests

- New `tests/unit/entry-helpers.spec.js`: the helper's arithmetic and that it
  writes only on "Use"; the C-5 row's description and value from each source
  schedule; "same as" read by the PDF model while ticked and the kept value on
  untick. Red-first: none exists.
- New `tests/e2e/entry-helpers.spec.ts`: one case per helper through the real
  pages.

### Checklist (AGENTS.md §8)

1. **Data model:** decision 3 adds the "same as" booleans (tri-state not
   needed: a checkbox), one row per form pair; decision 2's third option would
   add a link field. `verify:data-model`.
2. **Legacy data:** none; unticked by default.
3. **Fixtures:** none expected; the build greps.
4. **Tests and index:** as above.
5. **Export/import:** "same as" fills the second address on the PDF and the
   Annual's workbook from the first; the import reads the workbook's two
   addresses as typed (the box stays unticked).
6. **Security:** none.
7. **UI:** card buttons and a checkbox, the existing patterns.
8. **Legal framing:** none.
9. **Cross-form:** the Inventory's schedules; the Annual's and the Plans'
   address pairs.

### Overlap with Milestone 73

- **73B** changes the Inventory's new rows (blank shares, the frequency's
  "Monthly" default removed) in `models/guardian.js` and the Inventory
  `index.js`. **Build 74P after 73B** (73's row 16).
- **73G part 1** supplies the amount box the C-1 helper uses.
- **74H (d)** depends on decision 2.

### Build record — BUILT 2026-10-07 (approved by name by the requester, 2026-10-07)

**What changed for a filer:**

- **C-1's yearly total** (decision 1, approved by name under AGENTS.md §5).
  Once a Frequency other than Other is chosen, an optional "Work out the
  yearly total" box under the amounts takes one payment ("$1,850") and shows
  the yearly figure as it is typed -- "× 12 payments a year = $22,200.00"
  (Quarterly 4, Semi-Annually 2, Annually 1). It fills the Annual Income
  Amount only when the filer presses **Use**; nothing is stored for the
  payment, and for Other, or no frequency, it is not offered. The Clerk's
  form still gets the filer's own figure.
- **A C-5 joint owner from the asset** (decision 2). An A-1 to B-4 entry
  whose Ward's % is below 100 shows "+ Add a joint owner for this asset",
  which adds a C-5 entry naming the source as the workbook's example does --
  "Schedule A-1, Item 1 — Family Home" (a vehicle as the filing describes
  it) -- with the full value; the owner, relationship and share are left for
  the filer (the share blank, 73B), and nothing links the two entries
  afterwards. The button shows and hides as the share is typed.
- **"Same as" for an address typed twice** (decision 3). "Residence / office
  address same as mailing address" on each Annual, Final and Trust guardian
  (Part III) and Annual Plan guardian (Signatures), and "Mailing address
  same as residence" on the Initial and Annual Plans' covers. Ticked, the
  second address is hidden and filed as the first on the PDF -- and, for the
  Annual family, in the workbook's PART II, III office boxes; what was typed
  there stays in the filing and comes back when unticked (AGENTS.md §4). An
  import reads both addresses as the workbook holds them: a ticked box stays
  ticked while the workbook's office address is the mailing address (what
  the export writes), and unticks when it shows a different one, so the
  address the workbook carries is the one filed. Converting a filing carries
  the box with the addresses; the Initial Plan's New Year clears it with the
  ward's addresses, as it clears them.

No other check reads these addresses -- none is required -- so the PDFs and
the workbook are where "same as" applies.

**Data model:** `guardians[].officeSameAsMailing` (Annual family),
`planGuardians[].officeSameAsMailing` (Annual Plan) and
`mailingSameAsResidence` (Annual and Initial Plans), booleans, false by
default (checklist item 1; `verify:data-model` OK). **Legacy data:** none --
a filing saved before has no box, which reads as unticked.

**Tests:**

- New `tests/unit/entry-helpers.spec.js` (14): the yearly total's
  arithmetic and what it won't propose; the joint-owner offer and each source
  schedule's C-5 row; "same as" on the three PDFs and the Annual workbook,
  the import's untick, conversion. **Red-first:** the helper modules are new;
  with 74P's wiring set aside, the 7 wiring cases fail.
- New `tests/e2e/entry-helpers.spec.ts` (4): one case per helper through the
  real pages, the C-1 helper writing only on Use.
- Goldens regenerated, reason in each note: the blank-filing shapes (the
  unticked boxes), the validator and sidebar records (21 new variants for the
  new fields; no existing outcome changed), conversion and New Year (new
  keys, false). `model-change-event.spec.js` counts the two new changes.
- **Browser specs: 14 files, 144 tests** on a copy on C: -- the new spec, the
  three forms' page snapshots, the specs that read these pages' labels,
  asterisks and reveals, the export guard, conversion and New Year: 139
  passed at once. The three page snapshots gained the new boxes and were
  updated; the new spec's two Inventory cases first stopped behind the
  supporting-documents prompt (the spec now dismisses it, as other specs
  do) and on capitalization -- C-5's description box shows "Item 1",
  the Clerk's example says "item 1", so the row is now written "Item 1"
  and the box and the filed text agree. Those three files then passed (23
  tests). Full unit suite: 2,903 passed; `check:types` clean;
  `verify:data-model` OK. Full regression: next, the mid-batch run.

---

## 74Q — The exported workbook shows its totals when opened

### What a filer sees today

An exported workbook opened in a previewer, an e-filing viewer or a script
that doesn't recalculate shows **$0 in every total**, because the totals are
the Clerk's formulas and the file stores no computed results for them. Excel
itself recalculates on opening (unconfirmed for every Excel version). (QA
report UX-34)

### Evidence

- Nothing in `src/` sets ExcelJS's `calcProperties` or `fullCalcOnLoad`
  (searched).
- The vendored ExcelJS writes `<calcPr calcId="171027"
  fullCalcOnLoad="1">` when `workbook.calcProperties.fullCalcOnLoad` is set
  (`lib/exceljs.min.js`, read).
- The templates' own `<calcPr>` is `calcId="191029"` with no
  `fullCalcOnLoad`, and their formula cells hold a stored result of 0 (parser:
  e.g. Annual `PART IX ` H17 `=SUM(G14:G16)` with `<v>0</v>`).
- Every export is written by `saveWorkbookFile()`
  (`src/core/excel/excel-engine.js` near 311).

### Authority

AGENTS.md §5 and §10 P1: never write a formula cell. This writes none: it
asks the opening program to recompute the Clerk's own formulas.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **How the workbook gets its totals on opening.** — **Settled: mark it "recalculate on open".** The options as asked:
   - **Mark it "recalculate on open" (recommended).** A filer's viewer shows
     the Clerk's formulas' results wherever it honours the flag.
   - Also write the app's own computed totals as each formula's stored
     result — a second copy of every total that could disagree with the
     workbook's.
   - Leave it.

### Design

`saveWorkbookFile()` sets `workbook.calcProperties.fullCalcOnLoad = true`
before writing, for all three workbooks. Proof by reading the exported file's
`xl/workbook.xml` with a parser (AGENTS.md §10 P2), never by re-importing it.

### Files

`src/core/excel/excel-engine.js`.

### Tests

- New `tests/e2e/workbook-recalc-on-open.spec.ts`: export each of the three
  workbooks; read `xl/workbook.xml`; `calcPr` carries `fullCalcOnLoad="1"`;
  72A's workbook-versus-template guard still finds every formula unchanged.
  Red-first: the attribute is absent today.

### Checklist (AGENTS.md §8)

1. **Data model:** none.
2. **Legacy data:** none.
3. **Fixtures:** none.
4. **Tests and index:** as above.
5. **Export/import:** export only; the importer reads cells as before.
6. **Security:** none.
7. **UI:** none.
8. **Legal framing:** none.
9. **Cross-form:** all three workbooks through the one save function.

### Overlap with Milestone 73

**73T part 1** (the workbook contract) changes `excel-engine.js`. **Build 74Q
alongside 73T part 1** (73's row 7).

### Build record — BUILT 2026-10-07 (approved by name by the requester, 2026-10-07)

**What changed for a filer:** an exported Inventory, Annual, Final, Trust or
Simplified workbook is marked "recalculate on open", so a previewer, an
e-filing viewer or a script that honours the flag shows the Clerk's formulas'
totals instead of $0. Excel itself already recalculated on opening.

**How:** `saveWorkbookFile()` (`src/core/excel/excel-engine.js`), the one
save every export goes through, sets `workbook.calcProperties.fullCalcOnLoad`
before writing. No formula and no stored result is written (AGENTS.md §5,
§10 P1).

**Tests:** new `tests/unit/workbook-recalc-on-open.spec.js` in place of the
design's browser spec, as the requester asked for unit tests as the work goes:
each of the three court workbooks is opened with the app's own vendored
ExcelJS (new `tests/unit/support/exceljs-node.js`), saved through
`saveWorkbookFile()` itself, and the written file's `xl/workbook.xml` read
back -- `<calcPr fullCalcOnLoad="1">`. **Red-first:** with the change set
aside, all three saved workbooks lack the flag. The workbook-versus-template
guard (`excel-form-field-placement.spec.ts`, formulas unchanged in the
exported file) runs in the batch's full regression.

---

## 74R — Two statutory questions on the accountings: the year-end statement and the audit-fee exemption (questions first)

### What a filer sees today

- **Year-end statement.** Nothing on the Simplified Accounting reminds the
  filer to attach the year-end statement of the ward's account; its readiness
  list has only a general "statements, receipts, and explanations" line. The
  Annual family is the same. (QA report Q-02)
- **Audit fee.** The fee is chosen by Line 30 from the four statutory tiers.
  Nothing accounts for §744.3678(5), under which the section does not apply
  when the court determines the ward's only income is Social Security and the
  guardian is the representative payee. (QA report Q-03, its remaining part.
  The fee line's label is 73H design 5's: "Estate value (Net Assets, Line
  30)". Net versus gross is still Milestone 71's Clerk question 5.)

### Evidence

- Readiness: `readiness-config.js` near 334–335 (Simplified) and 338–339
  (Annual family), both general.
- Fee: `src/core/accounting/annual-totals.js` near 82–86; labelled "based on
  total assets" (Annual `index.js` near 725; `pdf-model.js` near 149). No
  reference to §744.3678(5) or a representative payee anywhere in `src/`
  (searched).

### Authority

Read from Chapter 744 in `reference/legal/statutes/`:

- **§744.3679(1)(a):** a simplified accounting consists of "The original or
  a certified copy of the year-end statement of the ward's account from the
  financial institution". The Clerk's Simplified workbook (parser): "Copies of
  the FISCAL year-end statement{s) of all the Ward's cash accounts from each
  of the designated depositories where cash is deposited must be attached."
  The statute says original or certified copy; the form says copies.
- **§744.3678(2)(b):** the annual accounting includes "A copy of the annual or
  year-end statement of all of the ward's cash accounts from each of the
  institutions where the cash is deposited."
- **§744.3678(5):** "This section does not apply if the court determines that
  the ward receives income only from social security benefits and the
  guardian is the ward's representative payee for the benefits." "This
  section" is the whole of §744.3678 — the accounting and its fee — and it
  turns on the court's determination. The Clerk's Annual workbook's guardian
  certification ends "…unless exempt by Florida Statute or Court Order"
  (`PART II, III`); its fee table (B13–G17) has no exemption line.
- AGENTS.md §4: a procedural duty such as attaching a statement is a
  `manual` readiness item and never blocks export.

### Decisions (settled 2026-10-06 by the requester, as recommended)

1. **A year-end statement reminder** *(Clerk practice: the statute's and the
   form's wording differ).* — **Settled: a manual readiness item on the Simplified and on the Annual family, the wording approved by the requester (Pinellas Clerk practice).** The options as asked:
   - **A manual readiness item on the Simplified and on the Annual family
     (recommended),** each quoting its statute and citing it; never blocking.
     The Clerk chooses the wording where the two differ.
   - The Simplified only.
   - None.
2. **§744.3678(5)** *(legal — for a qualified person and the Clerk; any
   change to the printed fee is AGENTS.md §5, the requester by name).* — **Settled: no change until answered.** The options as asked:
   - **No change until they answer (recommended).**
   - A box "The court has determined §744.3678(5) applies", with the order's
     date; checked, the fee line prints that the section does not apply
     instead of a fee.
3. **The audit-fee base: Line 30 (net) or gross** *(Clerk practice — carried
   from Milestone 71's Clerk question 5, not new).* — **Settled: Line 30, as today, until the Clerk answers (Pinellas Clerk practice).** The options as asked:
   - **Line 30, as today, until the Clerk answers (recommended).**
   - Gross assets (Schedules D-1 to D-4 without D-5) — a change to a filed
     fee, AGENTS.md §5.

### Design

Decision 1, recommended: two `manual` items in `readiness-config.js`, one per
form engine, worded as decided. Decisions 2 and 3: none until answered.

### Files

`src/core/filing/readiness-config.js`. If decision 2's second option is
chosen: `models/annual.js`, the Annual `index.js`, `annual-totals.js`, the
PDF model and the CSV.

### Tests

Extended `tests/unit/readiness-card.spec.js` and
`tests/unit/readiness-source-map.spec.js`: the new items are manual, present
on their forms and never block (AGENTS.md §4's invariant). Red-first: absent
today.

### Checklist (AGENTS.md §8)

1. **Data model:** none for decision 1.
2. **Legacy data:** none.
3. **Fixtures:** none.
4. **Tests and index:** as above.
5. **Export/import:** none.
6. **Security:** none.
7. **UI:** the existing readiness card.
8. **Legal framing:** every question flagged; the statutes are quoted, not
   applied.
9. **Cross-form:** both accounting engines; the Inventory's fee
   (§744.365(6)) is not part of this question.

### Overlap with Milestone 73

**73F part 2** derives the readiness card's overview rows; **73I** changes
`readiness-config.js` near 180 and 301; **73A** (built 2026-10-06) reworded one of
its labels; **73H design 5** fixes the fee line's label. Decision 1 builds
**alongside 73F part 2** (73's row 17).

---

## 74S — Small fixes

### What a filer sees today

(Each row also gives the recommended fix; the open choices are below.)

| QA item | What a filer sees today | Evidence | Fix (recommended) |
| --- | --- | --- | --- |
| UX-10 | A vehicle's Year accepts "19"; a VIN of any length; a boat or trailer must give a VIN and odometer reading, or be listed with "This item is a vehicle" unticked | Year, Make, Model, VIN and Odometer required for any vehicle (`engines/guardian.js` near 74); Year box `maxlength="4"` only (`guardian-inventory/index.js` near 895), VIN `maxlength="17"` (near 898) | Year must be four digits (an ordinary error the filer can override); a VIN that isn't 17 characters gets a "Review recommended" warning (older vehicles' VINs can be shorter — unconfirmed); no vehicle subtypes — a boat is listed as an ordinary B-2 item with its own identifiers |
| UX-13 | The Inventory's footer says "Page 3 of 19" while the sidebar says "16 of 17 sections complete" | 19 pages: Cover, Summary, 11 schedules, D-1–D-5, Print Preview (`models/guardian.js` near 67–87); 17 sections: the same less Summary and Print Preview (`nav-marks.js` near 194–198) | The progress card says it counts the pages with something to fill in ("16 of 17 pages to fill in complete") |
| UX-25 | Creating a Simplified Annual Plan asks no eligibility question (the Simplified Accounting does) | Only `type==='simplified'` goes to the eligibility questions (`filing-dialogs.js` near 51); the certificate counting as finished until started was decided in Milestone 68C (`completion.js` near 316–323) and stays | **No change**: any guardian may choose it (decision 3, Pinellas Clerk practice) |
| UX-27 | The Active Filing box shows "QA Rosa…", cut off, with no way to read the rest | The box holds the name only (`filing-switcher.js` near 14–19), with no `title` (`index.html` near 58); the list below shows name and type | The box's `title` and accessible description give the full name and filing type |
| UX-28 | Deleting a filing or a year, and Mark Closed / Mark Open, leave no Activity Log entry | `doDeleteWard()` (`filing-dialogs.js` near 220–231), `doDeleteWardYear()` (`year-dialogs.js` near 79), `toggleDashboardWardArchived()` (`dashboard/index.js` near 419–432) and the status change (near 434) call no `auditLog()`; today's entries are exports, imports, password events, shared-record syncs and merges, and certificate migrations | Each writes an entry naming the action and the filing (decision 4) |

### Evidence

As in the table; each line read in the working tree on 2026-10-06.

### Authority

- **UX-10:** the Clerk's Inventory workbook, B-2 instruction (parser):
  "Include VIN and odometer readings on vehicles." Its example: "1992 Toyota
  Corolla VIN# J123456789, 80,000 miles" — a ten-character VIN, so a length
  check can only warn.
- **UX-25:** Chapter 744 has no simplified-plan section (searched the
  extracted text: only §744.3679, the simplified accounting); the Simplified
  Annual Plan's original form states no eligibility
  (`reference/plan-forms/plan-simplified-original.txt`); AO 2024-025's text
  doesn't mention it (searched). Who may file it is **Clerk practice**.

### Decisions (settled 2026-10-06 by the requester; the eligibility question answered as Clerk practice)

1. **Vehicle checks.** — **Settled: as in the table.** The options as asked:
   - **As in the table (recommended):** a four-digit Year (overridable
     error), a VIN-length warning, no subtypes.
   - Add vehicle subtypes (boat: hull number and hours; trailer: no
     odometer).
2. **Page and section counts.** — **Settled: the progress card says what it counts.** The options as asked:
   - **The progress card says what it counts (recommended).**
   - The footer counts only pages with something to fill in.
   - Leave both.
3. **An eligibility question for the Simplified Annual Plan** *(Clerk
   practice).* — **Settled: no eligibility question: any guardian may choose the Simplified Annual Plan (Pinellas Clerk practice, answered by the requester).** The options as asked:
   - **Ask the Clerk first; no question added until then (recommended).**
   - Ask the same two questions the Simplified Accounting asks (their basis,
     §744.3679, is about accountings, not plans).
4. **What the Activity Log records.** — **Settled: deletions, Mark Closed / Mark Open, and status changes.** The options as asked:
   - **Deleting a filing or a year, Mark Closed / Mark Open, and a status
     change (recommended).** An entry names the filing and action, never the
     filing's contents.
   - Deletions only.

### Design

As in the table. UX-28: `auditLog('FILING_DELETED' | 'YEAR_DELETED' |
'FILING_CLOSED' | 'FILING_REOPENED' | 'STATUS_CHANGED', …)` under the filing's
id (72's fix keeps an entry with the filing it names).

### Files

`src/core/validation/engines/guardian.js`; `src/features/guardian-inventory/index.js`;
`src/core/status/nav-marks.js`; `src/core/shell/filing-switcher.js`;
`index.html`; `src/core/modals/filing-dialogs.js`; `src/core/modals/year-dialogs.js`;
`src/features/dashboard/index.js`.

### Tests

- Extended `tests/unit/validator-engines.spec.js` (or a new
  `tests/unit/vehicle-checks.spec.js`): "19" as a Year is named; a 10-character
  VIN warns. Red-first.
- Extended `tests/e2e/routes.spec.ts` or the sidebar specs: the progress
  card's wording.
- New `tests/e2e/activity-log-actions.spec.ts`: delete a filing, delete a
  year, Mark Closed and Mark Open, change a status: each appears in the
  Activity Log. Red-first: none today.
- Extended `tests/e2e/routes.spec.ts`: the switcher's description holds the
  full name and type.

### Checklist (AGENTS.md §8)

1. **Data model:** none.
2. **Legacy data:** a saved two-digit vehicle Year now shows an error the
   filer can correct or override — visible.
3. **Fixtures:** grep fixtures for vehicle Years and VINs.
4. **Tests and index:** as above; `npm run check:types` (the sidebar).
5. **Export/import:** none.
6. **Security:** Activity Log entries name the filing (the ward's name), as
   existing entries do; no contents.
7. **UI:** existing patterns.
8. **Legal framing:** decision 3 is Clerk practice.
9. **Cross-form:** UX-13's wording on every form's progress card; UX-28 on
   every filing.

### Overlap with Milestone 73

**73P** (small fixes: the filing switcher's Enter, the New Year sentence,
Remove's confirmation) touches `filing-switcher.js` and `year-dialogs.js`;
**73R part 1** reshapes the sidebar's progress card; **73F parts 2–3** change
`nav-marks.js` and the Inventory's validator; **73L** changes
`filing-dialogs.js`. **Build 74S alongside 73P** (73's row 32).

---

## Build order

| Order | Item | Depends on | Main files | Tests |
| --- | --- | --- | --- | --- |
| 1 | 74A | 73C | `src/core/form/blank-rows.js` | `prune-cards.spec.js`; new `tests/e2e/first-guardian-stays.spec.ts` — **Built** 2026-10-05 |
| 2 | 74B | 73A; sequenced with 73F part 1 and 73T parts 2–4 | `row-started.js`, `models/guardian.js`, `collections.js`, `completion.js`, three accounting-type features, four Plans' checks | new `tests/unit/started-guardian.spec.js`, new `tests/e2e/stamped-co-guardian.spec.ts` |
| 3 | 74C | alongside 73M (73's row 13); sequenced with 73O part 4, 73F part 2, 73R part 3 | `pdf-preview.js`, nine `print.js` | new `tests/e2e/output-buttons-after-override.spec.ts`, new `tests/unit/pdf-preview-print.spec.js` |
| 4 | 74D | — (no source change) | — | a red-first test per reproduced report, in the item its fix joins |
| 5 | 74E | alongside 73G part 1 (row 4) | `form-contract.js`, `form-fields.js`, Inventory `index.js`, `form-binding.js` | new `tests/unit/typed-text-kept.spec.js`; `form-entry.contract.spec.ts` |
| 6 | 74F | alongside 73O part 2 (row 29); the reminder label with 73L (row 24) | `service-recipients.js`, `plan-certificate-of-service.js`, three accounting `index.js` and `pdf-model.js`, `schedule-doc-ack.js` | new `tests/unit/certificate-no-recipients-line.spec.js`; `service-recipients.spec.js`, `schedule-doc-ack.spec.ts` |
| 7 | 74G | alongside 73F part 3 (row 18) | `date-rules.js`, new `email-format.js`, seven engines, `form-contract.js`, CSV | new `tests/unit/date-and-email-checks.spec.js`, new `tests/e2e/email-format.spec.ts`; `date-rules.spec.js`; validator and completion goldens |
| 8 | 74H | alongside 73G part 2 (row 19); part 2 after 73F part 2 | new `consistency-advisories.js`, `output-preflight.js`, `bond-depository.js` | new `tests/unit/consistency-advisories.spec.js`, new `tests/e2e/contradiction-warnings.spec.ts`; `bond-depository.spec.js` |
| 9 | 74I | alongside 73F part 3 (row 18) | Inventory `index.js`, `engines/guardian.js`, `completion.js` | new `tests/unit/inventory-witnesses.spec.js` |
| 10 | 74J | alongside 73O part 4 (row 31); after 73T part 3 | Annual `index.js`, `filing-type.js`, `filing-descriptor.js`, `conversion.js` | new `tests/e2e/filing-type-change.spec.ts`; `convert-ward.spec.ts`, `filing-type-enumeration-guard.spec.js` |
| 11 | 74K | after 73A; alongside 73I (row 21) | `year-dialogs.js`, `common-modals.html`, `filing-years.js`, `dashboard/view-model.js`, `carry-over.js` | new `tests/e2e/new-year-keeps-overdue.spec.ts`; `dashboard-view-model.spec.js`; year-rollover golden |
| 12 | 74L | alongside 73O part 3 (row 30); the title after 73K part 1 (row 3) | `form-contract.js`, `field-html.js`, `form-runtime.js`, `dashboard/index.js`, `router.js`, `src/styles/*.css` | new `tests/e2e/accessible-errors-and-groups.spec.ts`, `tests/e2e/page-title.spec.ts`, `tests/unit/minimum-text-size.spec.js`; `check:types` |
| 13 | 74M | — | — | nothing to build (decided 2026-10-06) |
| 14 | 74N | after 73T part 3 (row 11), 73B, 73A | `models/annual.js`, Annual `index.js` and `pdf-model.js`, `engines/annual.js`, `conversion.js`, `convert-ward-modal.js`, CSV | new `tests/unit/trust-accounting-identity.spec.js`, `tests/e2e/trust-accounting-identity.spec.ts`; conversion golden |
| 15 | 74O | after 74B; alongside 73O part 1 (row 28) | Inventory `index.js`, `carry-over.js`, Initial and Annual Plan `index.js` | new `tests/e2e/carry-forward-hints.spec.ts`; `ward-carryover.spec.js`; conversion golden |
| 16 | 74P | after 73B (row 16) and 73G part 1 | Inventory `index.js`, `models/guardian.js`, the Plans' and Annual's `index.js` and `pdf-model.js`, CSV | new `tests/unit/entry-helpers.spec.js`, `tests/e2e/entry-helpers.spec.ts` |
| 17 | 74Q | alongside 73T part 1 (row 7) | `excel-engine.js` | new `tests/e2e/workbook-recalc-on-open.spec.ts` |
| 18 | 74R | the questions answered; decision 1 alongside 73F part 2 (row 17) | `readiness-config.js` | `readiness-card.spec.js`, `readiness-source-map.spec.js` |
| 19 | 74S | alongside 73P (row 32) | `engines/guardian.js`, Inventory `index.js`, `nav-marks.js`, `filing-switcher.js`, `index.html`, `filing-dialogs.js`, `year-dialogs.js`, `dashboard/index.js` | new `tests/e2e/activity-log-actions.spec.ts`; vehicle units; `routes.spec.ts` |

74A can be built at any time; 74D changes no source. **Calculations:** none
of 74C–74S changes a total, fee or workbook formula as recommended. Three
open decisions would put a new number on a filed document and need the
requester's named approval under AGENTS.md §5 if chosen: 74H decision 2 (a
bond-shortfall threshold — a warning only, but a number the workbook doesn't
have), 74P decisions 1 and 2's second option (a proposed yearly income; a
computed joint owner's share), and 74R decisions 2 and 3's second options (the
§744.3678(5) exemption; a gross fee base).

---

## Appendix A — QA report items already fixed, planned or decided

The other 36 of the report's 83 items, checked 2026-10-06. "Planned" quotes
the Milestone 73 text that covers it. (The 47 open items are in 74C–74S.)

| QA item | What it reported | Status | Where |
| --- | --- | --- | --- |
| BUG-02 | D-1 told filers "1 for 100%"; the math read 1 as 1% | Fixed | 71D, `6cf544b` |
| BUG-03 | A share over 100% accepted; a typed minus silently removed | Fixed | 71C, `5a5793a` |
| BUG-04 | Line 20 and Line 30 a cent apart while the page said they balance | Fixed (the report's per-line rounding decided against) | 71A/71E, `025657a` — the balance check compares the printed figures; sums stay unrounded, as the Clerk's workbook does (Milestone 71, Provenance table) |
| BUG-05 | A carried Starting Balance shown as 797229.1849999999 | Fixed | 71E, `025657a` |
| BUG-07 | The Simplified Accounting required an attorney | Fixed | 71B, `ea703fe`; 72D, `f7100d4` (the attorney block prints blank, as the Clerk's forms do) |
| BUG-25 | A blank Ward's % counted as 100% but was flagged at export | Fixed | 71D, `6cf544b`; 72B, `c9473a8` (a share required on a started Inventory row) |
| UX-02 | The first Annual didn't take its Starting Balance from the Inventory | Fixed | 71E, `025657a`; Schedule D seeding already existed (`conversion.js` near 105–160) |
| BUG-06 | The attorney statement says "of the Guardian [ward's name]" | Decided not to change | Milestone 71, "Not covered": the Clerk's own text (`PART IV, V` B22–B24; Simplified `PARTS V, VI` B8–B10); Clerk question 4 |
| BUG-18 | Bar numbers zero-padded to eight digits | Decided (Milestone 36), **re-asked in 74M** | `MILESTONE-ARCHIVE.md` near 9208 |
| UX-16 | "Continue despite…" asked on every Preview visit | Decided not to change | Milestone 38D's contract: a "fresh preview render … invalidates acknowledgement" (`MILESTONE-ARCHIVE.md` near 11622) |
| UX-20 | The Initial Plan's disability questions have no "None" | Matches the court's form | The original Initial Plan has none (`plan-initial-original.txt` near 232–244); the Annual Plan's does (`plan-annual-original.txt` near 333) |
| UX-21 | The Initial Plan's sidebar skips section 8 | Matches the court's form | The original has no Question 8 (`plan-initial-original.txt` near 115–139) |
| UX-23 | Schedule B-4 offers "Taxes: Intangible" | Matches the Clerk's workbook | Annual workbook B-4 category (shared strings; the B-4 formula 73T corrects) |
| UX-31 | Bond wording "liquid assets" vs the calculation | Decided not to change | Milestone 71: "Answered by the workbook" (`PART IX` B11) |
| UX-33 | Initial Plan Question 2 allows several settings | Decided not to change | Milestone 68E, settled 2026-09-24 |
| UX-35 | An empty very-hidden sheet in the workbooks | Decided not to change | Milestone 71: the Clerk's templates; for the Clerk to fix |
| UX-36 | Sheet name "B-3 INTANGIBLE pg 1;" | Decided not to change | Milestone 71: the Clerk's template |
| Q-01 | Simplified Line 6 "Federal Income Tax" isn't in §744.3679(1)'s list | Matches the Clerk's workbook | Simplified `PARTS I, II ` C28 (parser) — the report's own condition ("Keep the line if the court's template requires it") |
| Q-04 | Bond wording vs math | Decided not to change | Milestone 71: closed, answered by the workbook |
| BUG-01 | A positive Schedule C loss is added | Planned (warning; turning it negative decided against) | 73G part 2: "A positive Loss or Transfer Out: a non-blocking warning on the page and in Preview, quoting the workbook's instruction"; 73G-1: "the figure stays as typed, as in the Clerk's workbook" |
| BUG-26 | B-4's Category Summary goes stale | Planned | 73J part 2: "Annual B-4's Category Summary and 'Assign a bank account' note … Built only when the page is drawn" |
| BUG-28 | An impossible date reads "X is required"; M/D/YY refused | Planned; two-digit years decided against | 73F part 2: the page checklist "names every blocker and prompt for the page, never the generic sentence"; part 3: "messages read 'Section — Label'"; two-digit years: Milestone 24 (`MILESTONE-ARCHIVE.md` near 4837) |
| BUG-29 | "Encrypted" claimed for an unencrypted case | Planned | 73P D25: "Said only when the case is encrypted"; 73Q |
| BUG-32 | The status pill says "Ready to file" while export blocks; "Automatic" mirrors an override | Planned | 73F-N1: "the dashboard, the sidebar, the page checklist and Preview read the same result"; 73J part 2: "the dashboard label shows what Automatic would infer" |
| A11Y-01 | Simplified Part II boxes announced as "startingBalance" | Planned | 73O part 3: "The Simplified's five Part II boxes get real labels" |
| UX-12 | Dates shown as 2026-03-15 on screens | Planned | 73H design 1: "Every displayed date goes through `formatDisplayDate()`" |
| UX-14 | Messages in different styles | Planned | 73F part 3: "messages read 'Section — Label'"; part 2: "the page list keeps the role (D28)" |
| UX-15 | "1 required items" | Planned | 73F part 2: "the screen-reader message pluralises (D17)" |
| UX-17 | Schedule C stars both Gain and Loss | Planned | 73G part 2: "Loss is not marked required (the rule is 'Gain or Loss')" — the check already accepts either (`engines/annual.js` near 253) |
| UX-18 | No "$" on accounting totals; zero lines print "($0.00)" | Planned | 73H-1: "Negative amounts print ($5,000.00) on every PDF and screen"; design 2 formats the negated value |
| UX-22 | "Only reports with original signatures will be audited" beside a "/s/" choice | Fixed (73A, built 2026-10-06) | 73A: "Guardians no longer sign with '/s/'"; the sentence is the Clerk's (Simplified workbook) |
| UX-26 | The Help panel's copy is out of date | Planned | 73P, Help panel row: "Nine filing types; the toolbar; cents" |
| UX-29 | Remove has no undo | Planned (a confirmation; undo decided against) | 73P D14: "A confirmation when the card holds anything (73P-1)"; 73P-1's "An Undo link instead" not chosen |
| UX-32 | The fee's tier and base unlabelled | Planned (the base is with the Clerk) | 73H design 5: "The fee line reads 'Estate value (Net Assets, Line 30)…'" |
| UX-37 | The bond period is overwritten; Part XI blocks Excel | Planned; the bond period decided | 73T-2: "Remuneration entries go one per line on Part XI … so a filing with remuneration can be saved as Excel"; bond period = accounting period: Milestone 67D (`form-derived-fields.js` near 24–30) |
| UX-39 | "Export All Filings" makes a backup | Planned | 73P D24: "Renamed 'Save case file as…', behaviour kept (73P-2)" |

Parts of open items already handled elsewhere, for the record: BUG-08's carry
(71E D9, `025657a`); BUG-11's sidebar 100% and asterisks (73F); BUG-13's
out-of-period payments (73F-8); BUG-14's positive "out" (73G part 2) and its
display (73H); BUG-21's missing-item message (72J, `f38b12f`) and the
question's hiding (63B); BUG-22's citation (Milestone 71; Milestone 73's
"Closed by the test itself"); BUG-23's Final due date (73I-2) and fee heading
(the Clerk's workbook); BUG-27's empty-row reminder (73L); UX-01's D-5 (72H,
`988f993`); UX-04's attorney e-mails (72B, `c9473a8`); UX-25's certificate ✓
(68C follow-up); UX-30's Save as Excel (73M step 5); UX-38's portal link
(before the report); A11Y-02's percent fields (71C, `5a5793a`); Q-03's label
(73H design 5) and base (Milestone 71's Clerk question 5).

---

## Appendix B — Every decision in 74C–74S, as asked and settled

**One by one** — Clerk practice, a legal question for a qualified person, a
re-ask, or a new filed number under AGENTS.md §5 (named approval):

| # | Item | Question | Options (recommended first) | Kind | Settled 2026-10-06 |
| --- | --- | --- | --- | --- | --- |
| 1 | 74F-2 | What the filed certificate says when nobody is listed, or none is required | (1) One wording on all seven: "No service recipients are listed." / "No service recipients are required."; the app's disclaimer never prints · (2) Remove the disclaimer from the Plans only · (3) As today | Filed wording — requester, as Clerk practice | one wording on all seven certificates, and the app's disclaimer never prints (Pinellas Clerk practice) |
| 2 | 74G-1 | An accounting period longer than a year or ending in the future | (1) Warning past the twelfth month after Period From's month, or after today · (2) Overridable error · (3) No check | Legal (§744.367(2)) | a "Review recommended" warning |
| 3 | 74G-3 | A fee paid before its court order | (1) Warning naming both dates · (2) No check | Clerk practice | a "Review recommended" warning naming both dates (Pinellas Clerk practice) |
| 4 | 74H-2 | How far below the requirement a bond must be to warn | (1) Any shortfall, quoting the workbook · (2) $5,000 or more (the audit work slip) · (3) No check | Clerk practice; a new threshold (§5, by name) | any shortfall, quoting the workbook (Pinellas Clerk practice; the threshold approved by name under AGENTS.md §5) |
| 5 | 74H-4 | Part XI "no remuneration" beside B-2 guardian fees | (1) A warning showing both · (2) No check until answered | Legal (§744.367(3)(a)) | a warning showing both, its wording reviewed by the requester |
| 6 | 74I-1 | What the Inventory asks about witnesses | (1) Optional, the statute quoted; a started card must be complete · (2) At least one complete witness when B-2 has items · (3) As today | Legal (§744.365(5)) | optional, said accurately |
| 7 | 74I-2 | Whether listed witnesses print on the filed PDF | (1) Keep printing · (2) Stop printing | Legal | keep printing them |
| 8 | 74J-2 | A Final Accounting's own content | (1) No change until answered · (2) Add a Final-only section (Rule 5.680(c)'s list) | Legal and Clerk practice | no change until a qualified person and the Clerk answer |
| 9 | 74M-1 | Account numbers on filed PDFs | (1) No change until answered · (2) A per-filing "last four only" choice · (3) Always last four | Legal (Rule 2.425) and Clerk practice | no change until a qualified person and the Clerk answer |
| 10 | 74M-2 | Florida Bar numbers | (1) Digits as typed, up to eight, no padding · (2) Pad to eight (Milestone 36) | Re-ask of Milestone 36 | keep padding to eight digits, as Milestone 36 decided — against the recommendation |
| 11 | 74M-3 | Social Security numbers on filed PDFs and workbooks | (1) No change until answered · (2) No portion on PDFs at once | Legal (Rule 2.425(a)(3)(A)) — found while drafting | PDFs keep the last four, workbooks the full number (Pinellas Clerk practice; the rule's reading flagged) |
| 12 | 74N-2 | A first trust accounting's Starting Balance | (1) Blank with the work slip quoted · (2) The Annual's disbursement into the trust, picked · (3) Part VIII's ward amount | Clerk practice — re-asks Milestone 71 D9's open half (Clerk question 8) | blank, with the work slip quoted, as today (Pinellas Clerk practice) |
| 13 | 74O-5 | Remuneration between the Plan and the accounting | (1) Reference only, no warning, until answered · (2) Warn on a mismatch | Legal (which period the Plan's declaration covers) | reference only, no warning, until the period question is answered |
| 14 | 74P-1 | A yearly-total helper on C-1 | (1) Optional helper; fills only on "Use" · (2) No helper · (3) Compute automatically | Proposes a filed number (§5, by name) | an optional helper that fills the box only on "Use" (approved by name under AGENTS.md §5) |
| 15 | 74R-1 | A year-end statement reminder | (1) Manual items on the Simplified and the Annual family, each quoting its statute · (2) Simplified only · (3) None | Clerk practice (the statute and the form differ) | a manual readiness item on the Simplified and on the Annual family, the wording approved by the requester (Pinellas Clerk practice) |
| 16 | 74R-2 | §744.3678(5) | (1) No change until answered · (2) A "court has determined" box replacing the fee line | Legal; the fee line (§5, by name) | no change until answered |
| 17 | 74R-3 | The audit-fee base | (1) Line 30 until the Clerk answers · (2) Gross assets | Clerk practice — carried from Milestone 71's Clerk question 5 | Line 30, as today, until the Clerk answers (Pinellas Clerk practice) |
| 18 | 74S-3 | An eligibility question for the Simplified Annual Plan | (1) Ask the Clerk first · (2) The Simplified Accounting's two questions | Clerk practice | no eligibility question: any guardian may choose the Simplified Annual Plan (Pinellas Clerk practice, answered by the requester) |

**Ordinary** — can be offered as "take the recommendations":

| # | Item | Question | Options (recommended first) | Settled 2026-10-06 |
| --- | --- | --- | --- | --- |
| 19 | 74C-1 | What an export button does when it can't export yet | (1) Clickable, says why (73M's rule) · (2) Greyed out with a reason line · (3) Fix only the Simplified Plan | clickable, and it says why |
| 20 | 74E-1 | Which boxes are capitalized automatically | (1) Names and addresses, token fixes; descriptions as typed · (2) As today with token fixes · (3) None | names and addresses only, with the token fixes; descriptions keep what was typed |
| 21 | 74F-1 | The certificate question's wording | (1) "Are you certifying that no one needs to be served with a copy of this filing?" · (2) The QA report's inverted question (migration) · (3) Keep | "Are you certifying that no one needs to be served with a copy of this filing?", the disclaimer as a hint |
| 22 | 74G-2 | Date ranges that run backwards | (1) Overridable error · (2) Warning | an ordinary error the filer can override |
| 23 | 74G-4 | Overlapping or out-of-order residences | (1) Warning · (2) No check | a "Review recommended" warning |
| 24 | 74G-5 | An e-mail address that isn't one | (1) Overridable error, message beside the box · (2) Warning · (3) Message only | an ordinary error the filer can override, with the message beside the box |
| 25 | 74H-1 | Which within-filing contradictions warn | (1) a, b, c, e, g, h, j, Schedule E, Line 8 as warnings · (2) As overridable errors · (3) A shorter list | a, b, c, e, g, h, j, Schedule E and Line 8, each a "Review recommended" warning |
| 26 | 74H-3 | Checks that compare filings (f, i, k) | (1) Later, after 73F part 2 · (2) Now | not now: a second part after 73F part 2 |
| 27 | 74J-1 | Changing an accounting's Filing Type | (1) Ask first and record it · (2) Lock Final and Trust · (3) As today | ask first, and record it |
| 28 | 74J-3 | Next forms from an Initial Plan | (1) Offer the Annual Plan · (2) Every type, greyed with reasons · (3) As today | the Annual Guardianship Plan too |
| 29 | 74K-1 | Starting a new year over an unfiled one | (1) Say so in the dialog; keep the year on the dashboard · (2) Refuse until filed · (3) Dashboard only | say so, and keep the old year in view |
| 30 | 74K-2 | The new period's dates | (1) Period From prefilled, Period To blank · (2) Both · (3) Neither | Period From prefilled as the previous Period To plus one day; Period To left blank |
| 31 | 74L-1 | The Judge box's name | (1) "Judge for <ward>" · (2) Rename the column "Assignee" | "Judge for <ward>" |
| 32 | 74L-2 | The browser tab's title | (1) Page and filing type, no ward name · (2) Include the ward's name | the page and the filing type, without the ward's name |
| 33 | 74L-3 | The smallest text | (1) 0.75rem · (2) 0.6875rem · (3) Leave | 0.75rem (12px) |
| 34 | 74N-1 | How a Trust Accounting identifies its trust | (1) A Cover block, picked from Part VIII · (2) Name only · (3) Leave | a "This accounting reports on" block on the Cover |
| 35 | 74N-3 | One trust per Trust Accounting | (1) Yes, as the workbook says · (2) Several | yes, one trust each |
| 36 | 74O-1 | Inventory D-1/D-2 from the Cover | (1) "Use the Cover's name" button · (2) Fill automatically when one name · (3) Leave | a "Use the Cover's name" button |
| 37 | 74O-2 | The Plans' Question 7 from the Inventory | (1) A note, no answer filled · (2) Pre-answer Yes | a note listing what the Inventory records, no answer filled |
| 38 | 74O-3 | The ward's residence on the next Plan | (1) Carry it · (2) Blank | carry it |
| 39 | 74O-4 | Last year's daily-living ratings | (1) Show beside each activity · (2) Prefill | show "Last plan: <rating>" beside each activity |
| 40 | 74P-2 | C-5 rows from A/B rows | (1) A button; share blank; no link · (2) Share prefilled (§5 if chosen) · (3) With a stored link | an "Add a joint owner for this asset" button; the share left blank; no stored link |
| 41 | 74P-3 | "Same as" for repeated addresses | (1) A checkbox, hidden values kept · (2) A copy button | a "Same as" checkbox |
| 42 | 74Q-1 | Totals on opening the workbook | (1) Recalculate on open · (2) Also write the app's totals · (3) Leave | mark it "recalculate on open" |
| 43 | 74S-1 | Vehicle checks | (1) Four-digit Year, VIN-length warning, no subtypes · (2) Subtypes | as in the table |
| 44 | 74S-2 | Page and section counts | (1) The progress card says what it counts · (2) The footer counts fillable pages · (3) Leave | the progress card says what it counts |
| 45 | 74S-4 | What the Activity Log records | (1) Deletions, close/open, status changes · (2) Deletions only | deletions, Mark Closed / Mark Open, and status changes |

45 decisions: 18 one by one, 27 ordinary. 74D has none until its reports are
reproduced.

---

## Appendix C — Coverage: every open QA item and its 74 item

| QA item | 74 item | Note |
| --- | --- | --- |
| BUG-08 | 74N | the carry part fixed in 71E |
| BUG-09 | 74E | |
| BUG-10 | 74D | reproduce first |
| BUG-11 | 74C | 100% and asterisks are 73F's |
| BUG-12 | 74D | reproduce first |
| BUG-13 | 74G | out-of-period payments are 73F-8's |
| BUG-14 | 74H | the balance; a positive "out" is 73G's |
| BUG-15 | 74I | |
| BUG-16 | 74H | e's multi-select decided in 68E; d depends on 74P-2; f, i, k in part 2 |
| BUG-17 | 74G | |
| BUG-19 | 74D | reproduce first |
| BUG-20 | 74K | |
| BUG-21 | 74F | the question's wording |
| BUG-22 | 74F | the "None listed." line |
| BUG-23 | 74J | the due date is 73I-2's |
| BUG-24 | 74J | |
| BUG-27 | 74F | the "A1" label; the empty-row firing is 73L's |
| BUG-30 | 74M | Clerk/legal |
| BUG-31 | 74H | |
| A11Y-02 | 74L | percent fields fixed in 71C |
| A11Y-03 | 74L | |
| A11Y-04 | 74L | |
| A11Y-05 | 74L | |
| A11Y-06 | 74D | reproduce first |
| A11Y-07 | 74L | |
| UX-01 | 74O | D-5 fixed in 72H |
| UX-03 | 74O | |
| UX-04 | 74O | e-mails fixed in 72B |
| UX-05 | 74O | |
| UX-06 | 74K | |
| UX-07 | 74D | reproduce first |
| UX-08 | 74P | §5 decision |
| UX-09 | 74P | |
| UX-10 | 74S | |
| UX-11 | 74O | legal decision |
| UX-13 | 74S | |
| UX-19 | 74J | |
| UX-24 | 74P | |
| UX-25 | 74S | Clerk question |
| UX-27 | 74S | |
| UX-28 | 74S | |
| UX-30 | 74C | Save as Excel's half is 73M's |
| UX-34 | 74Q | |
| UX-38 | 74C | |
| UX-40 | 74L | |
| Q-02 | 74R | |
| Q-03 | 74R | the label is 73H's |

47 open items, each in exactly one 74 item. **Also in 74M, not one of the 47:**
BUG-18 (decided in Milestone 36, re-asked) and the Social Security number
question found while drafting.
