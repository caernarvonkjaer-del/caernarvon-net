# Milestone 67: Filings the App Blocks, and Filings It Corrupts

## Status

**Draft. This document authorizes no change.** Each item below is proposed,
not approved. Nothing here may be implemented without the requester's explicit,
named approval of that specific item (AGENTS.md §3). Approving one item
authorizes only that item.

**All six items are decided as of 2026-09-23.** The requester authorized
execution of the whole milestone in the recommended order on 2026-09-23
("execute MS 67 in your recommended order"). Each item's row below records
whether it has landed.

Listed in build order.

| # | Item | Subject | Decision | Build |
| --- | --- | --- | --- | --- |
| 1 | 67F | Questions whose answers reveal nothing; one files data in the wrong box | **DECIDED** — route only reveal-gating controls; no data migration | **LANDED 2026-09-23** — 40 controls, not the 5 first listed; see the build record under 67F |
| 2 | 67C | Every Annual/Final/Trust Excel export opens with Excel's corruption warning | **DECIDED** — strip defined names pointing outside the file | **LANDED 2026-09-23** — see the build record under 67C |
| 3 | 67D | Every Annual/Final/Trust Excel export destroys the Bond Period formulas | **DECIDED** — stop writing them; PDF falls back to the accounting period | Independent |
| 4 | 67E | Every exported date is written as text, not as a date | **DECIDED** — write real dates | Independent |
| 5 | 67A | Preparer block is mandatory on filings the app itself says have no preparer | **DECIDED** — name the preparer on the guardian/attorney cards; PDF prints the name | Independent |
| 6 | 67B | Bond fields block filings on Annual/Final/Trust **and Guardian Inventory** | **DECIDED** — nothing in the bond block gates export; warn only, one shared path | **After 67F** |

67C, 67D and 67E all touch the Excel export path and share its test surface, so
building them together is cheaper than separately — but none depends on another,
and 67C alone resolves five of the six reported Excel symptoms.

67C, 67D and 67E were each confirmed by generating a real `.xlsx` from the
running app and inspecting the produced file with an XML parser; 67C was
additionally reproduced in Microsoft Excel itself, whose own repair log is
quoted in the item. Raw evidence is in Appendix A.

### Numbering note

Commit `d563997` (2026-09-22, the Save-as-PDF double-click fix) already used the
tag `fix(milestone-67:` in its subject line. That fix was a direct bug response
with no proposal document, so no `MILESTONE-67-PROPOSAL.md` existed until now.
The number is therefore shared between that landed commit and this document.
`git log --grep="milestone-67"` will return both. Renaming this document to 68
is a one-line change if the requester prefers a clean separation — say so and it
will be renamed before any work starts.

### What this milestone covers, and what it does not

Stated plainly, because a reader could not otherwise tell where the boundary
sits. Against the tester's ten numbered observations of 2026-09-23:

| Observation | Status |
| --- | --- |
| 1 — preparer bypass | **Covered** by 67A (67F supplies the shared re-render fix it relies on) |
| 2 — bond waiver missing on Annual/Final | **Covered** by 67B |
| 3 — Inventory has no restricted-depository place | **Covered** by 67B. The requester decided 2026-09-23 that the tester expected a place for it, so the four-state question goes on the Inventory as well as the Annual. The per-row `Restricted?` flags stay; nothing is written to the Inventory workbook, which has no cell and directs receipts elsewhere |
| 4 — restricted depository on Annual | **Covered in full** by 67B and 67F. 67F makes the receipt-date field reachable; 67B replaces the separate bond/depository questions with the tester's four-state question (scope extended 2026-09-23 on the requester's instruction — this was briefly deferred and is no longer) |
| 5 — Excel export defects | **Covered** by 67C (the corruption and the five symptoms downstream of it), 67D (bond period) and 67E (dates) |
| 6-10 — PDF cover page and the Plan filings | **Not in this milestone.** Owned by Milestone 68 |

**So: Milestone 67 closes observations 1, 2, 4 and 5, and closes 3 as a
non-defect. Nothing from observations 1-5 is deferred.** Observations 6-10 are
Milestone 68's.

### Provenance

All six items trace to a user test of an older build, reported 2026-09-23. The
full report covered ten numbered observations, triaged against current code; the
coverage table above says where each landed. Observations 6-10 belong to
Milestone 68.

Two items here were **not** in that report and were found while verifying it:
67D (every Annual export destroys the Bond Period formulas) surfaced from
generating a real workbook, and 67F (controls that cannot trigger a re-render)
was traced from three separate symptoms the tester did report.

Several of the tester's Excel observations turned out to be **already fixed** by
work landed 2026-09-19 — and several that were first classified that way turned
out not to be. Appendix B records the two wrong calls and why.

---

## 67A — The form says "DO NOT SIGN HERE," then refuses to export unless you do

### What a filer observes

A guardian who prepares their own Initial Inventory or Annual Accounting — which
is the ordinary case for a family member serving without an outside accountant —
reads this on the Preparer page, in bold:

> *** If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE. ***

They correctly leave the Preparer block blank. They then cannot file. **Save as
PDF and Save as Excel are disabled**, and the validation panel lists five or six
outstanding requirements they have been expressly instructed not to satisfy:

- `D-2 Preparer — Name` / `Part IV — Preparer Name`
- `D-2 Preparer — SSN/EIN` / `Part IV — Preparer SSN/EIN`
- `D-2 Preparer — Phone` / `Part IV — Preparer Phone`
- `D-2 Preparer — Street Address` / `Part IV — Preparer Street`
- `D-2 Preparer — City/State/Zip` / `Part IV — Preparer City/State/Zip`
- plus a signature, via `checkSignatureState()`

There is no way out of this state short of entering a third party's name, home
address, phone number and taxpayer identification number — data the filer does
not have, about a person who does not exist — and attaching a signature the form
told them not to attach. The app has no toggle, no attestation, and no
skip-if-blank rule for this block anywhere.

### Why the block exists (and why a guardian must not sign it)

The Preparer block is a **third-party compilation attestation**, not a
"who typed this" field. Its sworn text
(`src/core/filing/filing-descriptor.js:191`) reads:

> I have compiled the accompanying [accounting] ... This compilation is limited
> to presenting information in the form of a [accounting] and **is the
> representation of the guardian**. I have not audited or reviewed the
> accompanying guardianship accounting and, accordingly, do not express an
> opinion or any other form of assurance on it.

That is standard accountant's compilation language. A guardian signing it would
be attesting that they compiled a document that is someone else's
representation — i.e. their own — and disclaiming assurance on their own work.
The app's "DO NOT SIGN HERE" notice is correct. The requiredness behind it is
the defect.

### Evidence (verified against current source, not inferred)

| Claim | Location |
| --- | --- |
| "DO NOT SIGN HERE" rendered on Inventory D-2 | `src/features/guardian-inventory/index.js:1079` |
| Same notice on Annual Part IV (bold, brand color) | `src/features/annual-accounting/index.js:713` |
| Same notice printed into the filed PDF | `src/features/guardian-inventory/pdf-model.js:644` |
| Compilation attestation text | `src/core/filing/filing-descriptor.js:191` |
| Inventory requires all six preparer fields unconditionally | `src/features/guardian-inventory/index.js:1292` |
| Annual requires the same, unconditionally | `src/features/annual-accounting/index.js:1568-1582` |
| All six rendered with `reqLabel(...)` / `inpD(..., true)` | `guardian-inventory/index.js:1086-1090`, `annual-accounting/index.js:723-729` |
| No bypass field exists anywhere | grep `preparedBy\|prepared.by\|self.prepared` — zero hits |

**Filing-type scope.** `finalAccounting` and `trustAccounting` are aliases of
Annual Accounting — `formEngine(type)` maps all three to `'annual'`
(`src/features/annual-accounting/index.js:66-68`), selected by the Filing Type
control at `index.js:614`. So "the annual and final accounting" in the user's
report is one code path, and a fix to Annual covers all three automatically.

### Court-form authority (AGENTS.md §5 — template read, not assumed)

The embedded workbooks were opened and their shared-string tables parsed with
`xml.etree.ElementTree` (a real parser, per §10 P2). Both contain the Preparer
block as ordinary labelled cells:

- `guardian-template.js`: `Preparer's Signature`, `Preparer's Name`,
  `Preparer's SSN / EIN`, `Preparer's Street Address`, `Preparer's Phone Number`,
  `Preparer's City / State / Zip Code`; section captions
  `PREPARER & GUARDIAN ATTORNEY ATTESTATIONS`, `PREPARER SIGNATURE`.
- `annual-template.js`: the same six labels, section caption
  `PREPARER ATTESTATION`.

**Neither workbook contains the "DO NOT SIGN HERE" instruction** — that string
appears nowhere in either shared-string table. It is app-authored copy.

This matters for the decision below: a spreadsheet cannot express requiredness,
so the workbook is silent on whether a filing without a preparer is acceptable.
The unconditional `req()` calls are an **app-authored choice**, not something the
court's instrument imposes. Removing or conditioning them does not diverge from
the template.

### Legal framing (AGENTS.md §8.8 — flagged, not resolved)

This document does **not** decide whether a Pinellas guardianship accounting may
be filed with an empty preparer block. That is a question for the Clerk's office
or counsel, and it is the same class of question §4 already records for blank
Annual schedules — where the answer turned out to be *the statute is ambiguous
and the office accepts them*. The parallel is close enough to be worth asking
the same way, and the answer should be recorded here before anything is built.

What can be said without a legal opinion: the app currently instructs the filer
not to sign, and then blocks the filing because they did not. Those two
behaviors contradict each other, and at least one of them is wrong regardless of
how the legal question comes out.

### Decision — SETTLED 2026-09-23: Option 1, with the PDF printing an explicit line

The requester chose **Option 1**, and chose **(b)** on the output sub-decision:
when the block is waived the filed PDF prints a line stating the guardian
prepared it. Options 2 and 3 were not taken and are kept below as the record of
what was weighed.

**The build, as decided.** Refined 2026-09-23 after the Clerk's answer (below)
made the original "hide it and print a generic line" shape insufficient.

The Clerk will accept an accounting with no outside preparer **if the guardian
identifies themself as the preparer.** So the filing must *name* that person,
not merely assert that a guardian prepared it — on a filing with co-guardians,
"prepared by the guardian" does not identify anyone.

- **A flag on each card, stored on the row itself** — `guardians[i].isPreparer`
  and an equivalent on the attorney — exactly as the requester first proposed.
  One checkbox per guardian card and one on the attorney card, reading roughly
  *"This person prepared this filing."*
- **Only one may be set.** Enforced at write time: ticking one clears the
  others. This is a synchronous operation on a known set of rows, easy to test
  directly.

  *An intermediate design was considered and rejected.* Storing a single
  `preparedBy` pointer (a guardian index, or "attorney") looks tidier and makes
  "only one" structurally impossible to violate. It is the wrong trade here.
  Guardian rows are plain objects with **no stable identifier**
  (`src/core/state.js:150,456`, `legacy-app.js:5671` — `{name, ssn, phone, …}`)
  and are removed by array position, so a stored index silently points at the
  wrong person whenever a guardian *before* the preparer is deleted and the rest
  shift up. That is a latent fault that misattributes the preparer on a filed
  court document at some later time. A flag on the row cannot drift: it travels
  with its guardian, and it disappears when that guardian is deleted — which is
  also the correct behavior, since a deleted preparer leaves no valid answer and
  the filing should return to unanswered. Mutual exclusion at write time is the
  easy problem; index drift is the dangerous one.
- **The attorney is selectable too.** The form's own notice names "Guardian,
  Co-Guardian, or Guardian Attorney," and the original request was "guardian or
  attorney," so restricting this to guardians would miss a real case.
- **When set:** the separate Preparer card's six requirements and its signature
  check all drop, and the card hides. Nothing already entered is deleted.
- **When unset:** behaves exactly as today. Unanswered is not an assertion (§4).
- **The filed PDF names them** — *"Prepared by «name», guardian"* (or
  *"…, guardian's attorney"*), resolved from whichever card is ticked. Excel
  needs no change: the workbook's preparer cells stay empty.

**Why not the existing party system.** `preparerPartyId` already exists on every
filing (`src/core/party-resolver.js:585,621`) and would have been the natural
home — single-valued, stable across re-indexing, and already surviving party
merges. It does not work here: `guardianPartyIds` starts empty
(`legacy-app.js:4150-4154`) and fills only when the filer uses "Link Person,"
which is optional, so most filings have guardian rows with no party to point at.
If guardian rows ever gain stable identifiers, this decision is worth revisiting
— the row-flag design is chosen because no stable id exists today, not because
pointing at one would be wrong.

**Two UI details that need care:**

1. **The checkbox and the card it hides are on different pages.** The filer
   ticks it on the guardian card (D-1 / Part III) and the Preparer card
   disappears from a later page (D-2 / Part IV). The Preparer page should say
   why it is empty rather than simply showing nothing — otherwise it reads as a
   missing section.
2. **The control must carry a route.** Ticking one card has to visually uncheck
   the others on the same page, which requires a re-render. Use a routed helper
   (`yesNoCheckboxS`/`yesNoCheckboxD`, as the certificate-of-service pattern
   does) and **not** `chkP()`, which cannot pass one — see Appendix B.

**Reuse the certificate-of-service implementation directly.** This is the
pattern the requester named, and it is already correct on all three surfaces:

| Surface | Existing call | Route passed |
| --- | --- | --- |
| Inventory D-5 | `yesNoCheckboxS('serviceNoRecipients', ATTESTATION_57B, …, '/d5')` | `/d5` |
| Annual Part X | `yesNoCheckboxD(ATTESTATION_57B, d.certNoRecipients, …, '/p10')` | `/p10` |
| shared row | `renderServiceAttestationRow({ html, rows, attestation, … })` | — |

**This item does not hit the re-render trap that blocks 67B.** Both helpers
above take a route and pass it, so the conditional hide re-renders correctly on
the click. That is precisely why this pattern must be copied rather than
reimplemented with `chkP()` or `yesNoRadioAnnualHTML()`, neither of which can
carry a route (see Appendix B).

**The Clerk's answer, obtained 2026-09-23 — and it is why the shape above
changed.** Whether a Pinellas guardianship accounting may be filed with no
preparer identified was flagged here as a question for the Clerk's office, not
for this repository (§8.8). The requester obtained it:

> The Clerk will accept an accounting with no preparer **if the guardian
> identifies themself as the preparer.**

Recorded the same way §4 records the Clerk's answer on blank Annual schedules,
and with the same caution: **this is county practice, not a statutory finding.**
This repository holds no statutory text on the point and must not present the
permissive reading as law. A different county could read it otherwise.

**A tension this answer creates, left deliberately unresolved.** The form itself
says a guardian must *not* sign the preparer block; the Clerk will accept the
filing if a guardian identifies as the preparer. Those reconcile only if "DO NOT
SIGN HERE" governs the block's *sworn compilation attestation* — whose text is
an outside accountant's disclaimer ("I have compiled… I have not audited or
reviewed… this is the representation of the guardian") — while the Clerk's
requirement is the lighter one of naming who prepared the document.

The build above is deliberately consistent with **both** readings: the guardian
is *named* as preparer, satisfying the Clerk, but is never placed into the
compilation attestation or made to sign it, so the form's own prohibition is
respected. Nobody needs to settle which reading is right for this to be correct.
If that ever has to be settled, it is a question for counsel, not for this
document.

**Superseded options, for the record:**

**Option 1 — An explicit attestation that waives the block (RECOMMENDED — CHOSEN).**
Add a tri-state question to Inventory D-2 and Annual Part IV, worded in the
requester's own terms, e.g. *"This filing was prepared by the guardian,
co-guardian, or guardian attorney — no outside preparer."* Answering **Yes**
hides the preparer card and drops all six requirements; **No** or unanswered
behaves exactly as today. This is precisely the certificate-of-service pattern
the requester cited: `ATTESTATION_57B` / `serviceNoRecipients` /
`certNoRecipients`, which hides the recipient cards without deleting what was
entered (`guardian-inventory/index.js:23,1193`;
`annual-accounting/index.js:28,1446`). *Filer sees:* one checkbox, ticked once,
and the block disappears and stops blocking. *Cost:* two new data-model rows per
filing type, one migration rule, and a decision on what the PDF prints.

**Option 2 — Skip the block automatically when it is entirely blank.**
No new field and no new UI: the preparer requirements apply only once the filer
has entered *something* identifying a preparer, mirroring
`isPlanInitialAttorneyStarted()` (`src/core/validation/attorney-block.js`), which
already protects pro se and Ch. 393 filers on the Initial Plan the same way.
*Filer sees:* nothing at all — leaving it blank simply stops blocking. *Cost:*
smallest change, no schema work. *Downside:* silent. The filing carries no
affirmative statement of who prepared it, and a filer who typed one character
into Phone is blocked again with no visible explanation of why.

**Option 3 — Make the preparer fields plainly optional.**
Drop the `req()` calls; leave the UI as is. *Filer sees:* the asterisks
disappear and nothing blocks. *Cost:* one-line change per form, plus a
`probate-guardian-data-model.csv` update (`preparer.name` is currently marked
`required` for both filing types — rows 116 and 283). *Downside:* also removes
the requirement for a filing that genuinely *does* have an outside preparer, so a
half-entered preparer would reach the court with no address or phone.

**Sub-decision — ANSWERED 2026-09-23: (b).** When the block is waived, what
should the filed output show? (a) print the Preparer section with its fields
blank, exactly as the paper form would look; **(b) print the section with an
explicit line such as "Prepared by the guardian — no outside preparer"
← chosen**; or (c) omit the section from the PDF entirely. The Excel side needed
no decision: the workbook's preparer cells simply stay empty, and nothing is
written into them.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** Two new rows per filing type: `guardians[].isPreparer` (on
   the existing guardian collection) and the attorney's equivalent, both
   defaulting to unset. Added to `probate-guardian-data-model.csv` in the same
   commit, passing `npm run verify:data-model`. Check the guardian collection is
   already fully expanded in the CSV before adding — one summary row is not an
   expanded collection (§8.1). Rows 116/283 (`preparer.name`, currently
   `required`) become conditional on nobody being flagged as preparer; the CSV's
   `conditional` + condition columns already express this shape elsewhere, so
   reuse that rather than inventing a new convention.
2. **Legacy data migration.** A `.sav` saved today carries no preparer flag on
   any row. Unset must resolve exactly as today, so no existing filing silently
   becomes exportable or newly blocked on load. Deletion needs no maintenance
   code — the flag lives on the guardian row and is removed with it — but the
   *consequence* must be tested: deleting the flagged guardian returns the
   filing to "no preparer identified," which correctly re-blocks export until
   someone answers again. Deleting any other guardian must leave the flag
   untouched on its own row.
3. **Fixture and factory audit.** `fillMinimalValid*Ward()` helpers and every
   `BASELINE` fixture for Guardian Inventory and Annual currently populate the
   preparer block to get past these very rules. Grep them all before building —
   Milestone 55D needed three discovery rounds for exactly this.
4. **Test coverage and index.** Needs a unit spec proving that identifying a
   preparer drops all six issues and that leaving it unset keeps them; an e2e
   proving the card actually hides, the other cards' checkboxes visually clear,
   and export becomes enabled; a test that the PDF prints the **correct name**
   (not just any name) when a co-guardian rather than guardian 1 is selected;
   a test that ticking a second card clears the first (mutual exclusion, the one
   real cost of this design); and both deletion cases from item 2.
   `TEST-INDEX.md` row in the same commit (§7). Red-first verification is
   required (§2).
5. **Export/import/portability.** Guardian Inventory's Excel importer reads the
   preparer block back by address (`excel.js:660`) and Annual's at
   `excel.js:633-636`. A waived filing round-trips as blank cells; confirm the
   importer does not then infer a half-entered preparer.
6. **Security and sensitivity.** The new flag is non-sensitive. Note that
   waiving the block means the filing no longer carries a preparer SSN/EIN —
   strictly a reduction in stored sensitive data (rows 117 and 284 are classified
   `government-id`).
7. **UI/UX consistency.** Reuses the certificate-of-service attestation pattern
   — same routed checkbox helper, same hide-without-deleting behavior. Note the
   difference from that precedent: there, the checkbox and the fields it hides
   sit on one page; here they are on different pages, so the Preparer page needs
   a line explaining why its card is gone.
8. **Legal/compliance framing.** **Answered** — see the Clerk's answer above.
   Recorded as county practice, not as a statutory finding, and the build is
   deliberately consistent with both readings of the "DO NOT SIGN HERE" notice.
9. **Cross-form method consistency.** Simplified Accounting captures preparer
   fields too, and the Simplified *Plan* captures them as `optional` and
   deliberately does not print them (CSV rows 336-341, Milestone 61E: "this
   form's court original has no preparer/attorney certification page"). Read
   Simplified Accounting's preparer rules before building, and report whether it
   shares this defect — do not silently expand scope to fix it (§8.9).

---

## 67B — Bond fields block a filing that has no bond (both Inventory and Annual)

### What a filer observes

A guardian whose bond was waived by court order, or whose assets sit in a
restricted depository instead of under a surety bond, fills out an Annual, Final
or Trust Accounting and cannot file. **Save as PDF and Save as Excel stay
disabled**, with two outstanding requirements:

- `Part IX — Bond Amount`
- `Part IX — Bonding Company`

There is no waiver question on this form, so there is nothing to tick and no way
to declare that no bond exists. The only way to export is to type a bond amount
and the name of a bonding company that do not exist.

The same filer doing an **Initial Inventory** has no such problem: that form asks
*"Has the surety bond been waived by court order?"*, and answering Yes drops all
four bond requirements.

### It is worse than a missing feature: the requirement is invisible

Three sources disagree about whether these two fields are required at all:

| Source | Says | Location |
| --- | --- | --- |
| Data model | `optional` | `probate-guardian-data-model.csv:137` (bondAmount), `:140` (bondingCompany) |
| The UI | not required — rendered with the required flag `false`, so **no asterisk is shown** | `src/features/annual-accounting/index.js:1410-1411` |
| The export gate | **required** — blocks the filing | `src/features/annual-accounting/index.js:1612-1613` |

So the filer is blocked by a rule that the field itself never advertised. This
is the mirror image of the bug Milestone 55D fixed for `attorney_email` (an
asterisk with no rule behind it); here it is a rule with no asterisk in front of
it. Whatever is decided about the waiver question, these three should be made to
agree.

### Evidence — how Inventory already solves this

```js
// src/features/guardian-inventory/index.js:1320-1321
if (!triYes(d.bondWaived)) {
  req(d.bondAmount,'D-4 — Bond Amount','bondAmount');
  if(!d.bondPeriodFrom)push('D-4 — Bond Period From is required.','bondPeriodFrom');
  if(!d.bondPeriodTo)push('D-4 — Bond Period To is required.','bondPeriodTo');
  req(d.bondingCompany,'D-4 — Bonding Company','bondingCompany');
}
```

with the question and its conditional date row at `index.js:1166-1168`, and the
fields at `probate-guardian-data-model.csv:882-883` (`bondWaived` tri-state
`Yes; No`, `bondWaivedDate`). Annual has **no** `bondWaived` field in the CSV, in
`emptyDataAnnual()`, or anywhere in `src/features/annual-accounting/` — confirmed
by grep. Its four bond fields exist (CSV rows 137-140) with no waiver concept
attached.

### Court-form authority (AGENTS.md §5 — and this one cuts against simple parity)

Parsed from the embedded workbooks' shared strings:

- **`guardian-template.js` contains the waiver line:**
  `"If the surety bond has been waived, note the date of the order…"`
  That is why Inventory has the field — Milestone 64A-1/D16 implemented the
  court's own question.
- **`annual-template.js` contains no waiver string at all.** Searching its
  shared strings for `waiv` returns nothing. Its bond material is
  `Bond Amount`, `Bond Requirement`, `Bond Period`, `Name of Bonding Company`,
  `Bond Calculation`, `Total for BOND REQUIREMENT`, and the guidance line
  *"Guardianship bond amount should be the amount of all liquid assets less those
  in a restricted depository or frozen account."*

**Consequence:** a bond-waiver toggle on Annual would be an app-invented
affordance with no cell to write to, not a transcription of the court's
question. That is allowed, but §4 already governs exactly this situation through
the `scheduleNoItems` precedent: an affordance this app invented to help the
filer is fine to *ask*, and must never become something *export demands*. The
same logic applies in reverse here — the app may offer a waiver question, but it
must not make the absence of one a blocker, which is what it does today.

Note also that the workbook's own guidance line ties the bond amount to
liquid assets *less those in a restricted depository* — which is the same
territory as the user's observation #4 (restricted depository vs. bond). Those
two should be decided together; see "Not yet scoped."

### Decision — SETTLED 2026-09-23: Option 1, in its non-blocking form

Option 1 was chosen, then three follow-up questions settled its shape. The
combined answer is **"ask, but never demand"**: the waiver question is added,
and the bond fields stop blocking export entirely.

**Scope correction, 2026-09-23 — this item now covers Guardian Inventory too.**

An earlier draft of this section argued that Guardian Inventory should keep
blocking, on the grounds that its workbook asks the waiver question and
Annual's does not. **That reasoning was wrong and is withdrawn.** A field
existing on a court form does not make it a precondition for filing — the form
asks for information where it applies, which is not the same as the court
refusing a filing without it. The requester rejected the distinction, and the
code itself contradicts the premise: Guardian Inventory's own validator carries
the note *"The court's form has no Yes/No for this — it asks only for the order
date"* (`guardian-inventory/index.js:1302-1305`). So even Inventory's waiver
**question** is app-invented; only the order-date line comes from the workbook.
There was never a court requirement to preserve on either side.

**Governing principle, stated by the requester: blocking should be rare.** This
is a place where a warning is enough. Nothing in the bond block on either filing
type prevents an export.

**Scope extension, 2026-09-23 — the tester's four-state question is in.** The
requester's instruction: *"Don't block, but also implement the tester's
suggestion."* So this item now delivers **both** halves of observation 4 — the
bond block stops gating export **and** the separate bond/depository questions are
replaced by the single question the tester proposed. The deferral recorded
earlier in this document is withdrawn.

**The four-state question, on Annual Part IX.** One question replaces the
current pair (*"Restricted depository?"* and the bond fields standing alone):

> Which applies to this guardianship?
> - Restricted depository only → *Date of most recent receipt*
> - Bond and restricted depository → *both* the receipt date and the bond details
> - Bond only → bond details
> - Bond waived by court order → *Date of the order*

Each state reveals only the fields it needs, and **none of them blocks export** —
the two decisions compose rather than conflict.

**Why this does not touch a calculation (AGENTS.md §5).** The workbook's bond
calculation in `PART IX ` derives from the schedules' own totals — `H12` is
`'SCH D-1 CASH p1'!J59`, `H13` is `'SCH D-4 INTANGIBLE p1 '!K55`, `H17` is
`SUM(G14:G16)` — and those in turn come from the per-row `Restricted?` flags on
Schedules D-1 and D-4. **The summary question feeds none of them.** It records
what arrangement is in place; the numbers continue to come from the rows. This
is a data-capture change, not a calculation change, which is what keeps it clear
of §5's prohibition. **Any implementation that starts writing this answer into
the bond-calculation cells has misunderstood the item and must stop.**

The workbook's own guidance line — *"Guardianship bond amount should be the
amount of all liquid assets less those in a restricted depository or frozen
account"* — is the court explaining that relationship to the filer. It is
already implemented through the row flags. The four-state question makes the
arrangement explicit; it must not re-derive the amount.

**Guardian Inventory gets the same four-state question — decided 2026-09-23.**

This reverses an earlier reading in this document, which scoped the question to
Annual only on the grounds that the Inventory's workbook does not collect a
depository receipt. The requester's decision: the tester's observation 3 — *"The
inventory does not have a place for restricted depository information"* — is
read as expecting one, so the Inventory gets the question too. One question,
both forms, worded identically.

**What the Inventory already has, and why it was not enough.** It records
restricted accounts *per asset* — a `Restricted?` flag on each Schedule B-1 and
B-3 row (`guardian-inventory/index.js:824, 929`) — and the workbook totals those
as *"Cash Assets in RESTRICTED Depository"*. Those flags feed the bond
calculation and **must stay exactly as they are**; the four-state question sits
alongside them and does not replace them. What was missing is any summary-level
statement of the arrangement, which is what the tester went looking for.

**The constraint that survives, and must be respected.** The Inventory's
workbook has no cell for a depository receipt date, and it directs the receipt
document elsewhere in its own words:

> ***Receipts of Depository are to be filed into the respective Case separate
> from the Inventory.***

So on the Inventory the answer and any receipt date live in the saved file and
the PDF only. **Nothing is written into the Inventory workbook for this** —
there is no cell, and §5 forbids inventing one. Capturing the date is not the
same as filing the receipt; the receipt still goes to the court separately, and
the app should not imply otherwise.

**On both forms the question blocks nothing**, per this item's governing
decision.

**The build, as decided. One shared code path for the non-blocking behavior,
both filing types.**

1. **Remove every bond-related export blocker.** Six in total:
   - Annual, `src/features/annual-accounting/index.js:1612-1613` — the
     `req()` calls for Bond Amount and Bonding Company.
   - Inventory, `src/features/guardian-inventory/index.js:1320-1321` — the
     `if (!triYes(d.bondWaived))` block requiring Bond Amount, Bond Period
     From, Bond Period To and Bonding Company.
   - Inventory, `:1307-1309` — the "please indicate whether the surety bond has
     been waived" blocker raised when the question is unanswered.
   - Inventory, `:1310-1314` — the `filing.bond-waiver.incomplete` blocker
     requiring the order date once waiver is claimed.
2. **Replace them with one shared advisory producer**, so both forms warn
   identically and neither can drift from the other. The app already has the
   channel: `prepareFilingOutput()` builds an `advisories` array
   (`src/core/filing/output-preflight.js:41-47`) that is rendered in the print
   preview by `renderOutputAdvisories()` and is deliberately **not** part of
   `messages`, which is what gates export (`canExport: messages.length === 0`).
   A bond warning belongs beside the two producers already there
   (`countyDriftWarnings`, `formDerivedOverwriteWarnings`) — same shape, same
   non-blocking guarantee, no new mechanism invented.
3. **Replace Annual Part IX's bond/depository questions with the single
   four-state question above.** It subsumes the waiver question — "bond waived
   by court order" is one of its four states — so Annual does not get a separate
   waiver toggle. New field, working name `bondDepositoryState`, with the four
   values plus unanswered (`''`).
4. **Wire each state to the fields it needs**, none of them required:
   `restrictedDepositoryReceiptDate` (already exists, CSV:136) for the two
   depository states; the existing bond fields for the two bond states; and a
   new `bondWaivedDate` for the waived state. **Not required — on either form.**
   The requester was explicit that the date is not mandatory. Inventory's
   existing requirement on its own waiver date is removed as part of item 1.
5. **The PDF states the arrangement, per state.** One rule per value, so the
   Clerk always sees why the bond block looks as it does:

   | State | PDF prints |
   | --- | --- |
   | `bond-waived` | *"Bond waived by court order dated «date»."* |
   | `depository-only` | *"Assets held in a restricted depository. Most recent receipt dated «date»."* |
   | `bond-and-depository` | the bond details **and** the depository line above |
   | `bond-only` | the bond details, as today |
   | `''` (unanswered) | the bond block as today, with no added line |

   **Wording approved by the requester 2026-09-23** — these are the sentences to
   ship, not placeholders. They are app-authored: neither workbook contains any
   such line, so any change to them is a change to a filed court document and
   needs the requester again.
6. **Excel is unchanged on both forms.** The Annual workbook has no waiver cell
   at all; Inventory's has only the order-date line it already writes. **The
   filed PDF and the filed Excel therefore differ on this point** — a
   consequence of the workbooks, not an oversight, recorded here so nobody
   later "fixes" the Excel by writing into a cell that does not exist.

**Note for the record:** the Inventory gating being removed here was added
deliberately and recently — the code comment attributes it to *"D16
(2026-09-21, Alan)"*. This is a considered reversal by the same requester two
days later, not the discovery of an oversight.

**Sequencing: this item is blocked, deliberately.** The conditional reveal for
`bondWaivedDate` must not be built on a control that cannot request a re-render
— that is the defect already confirmed on this very page (the
restricted-depository receipt date), in the Initial Plan, and in the Annual
Plan's Q11. The decision is to **fix the renderer first**, which resolves all
four at once, and build 67B on top of it. See "Prerequisite" in the status
section.

**Superseded options, for the record.** These are the three choices as they were
put on 2026-09-23, before the scope extension above. **They no longer describe
the build** — Option 1 was chosen as written, then superseded twice: once when
the requester directed that the blocking be removed outright, and again when the
four-state question was brought in. Option 3 below, marked "DEFER", is precisely
the work that is now in scope. Kept only as the record of what was weighed; read
the decision above for what gets built.

**Option 1 — Mirror Inventory's D-4 question (chosen, then superseded — see above).**
Add `bondWaived` / `bondWaivedDate` to Annual Part IX, worded as Inventory words
it, and make the four bond fields required only when the answer is not Yes.
*Filer sees:* the same question they already know from the Inventory, in the same
place on the equivalent page, and answering Yes unblocks the filing. *Cost:* two
CSV rows, a migration default of `''`, and the note above that nothing is written
to Excel because the Annual workbook has no cell for it — the answer would live
in the `.sav` and, if desired, in the PDF.

**Option 2 — Make the two fields genuinely optional.**
Delete the two `req()` calls so the validator agrees with the CSV and the UI,
which both already call them optional. *Filer sees:* the block simply stops
blocking; a guardian with no bond leaves it empty. *Cost:* two lines, no schema
change, no migration, no new UI. *Downside:* no affirmative record of *why* the
bond fields are empty — waived, restricted depository, or just not filled in yet.

**Option 3 — Model the four real states.** *(The "DEFER" label this option
originally carried is struck: this is the work now in scope, on both filing
types. The paragraph below is the original wording, kept unedited as the record
of how it was first weighed — its "should be scoped as its own item" advice was
overtaken on 2026-09-23.)*
The requester's own observation #4 proposes asking whether there is a restricted
depository only (with date of most recent receipt), a bond and a restricted
depository, a bond only, or a waived bond (with the date of the order). That is a
better model than either option above, and it subsumes both. It is also
materially larger, touches Part IX's bond-calculation area, and should be scoped
as its own item alongside observation #4 rather than decided here.

Options 1 and 2 are not exclusive: Option 1 contains Option 2's effect. If the
requester wants the smallest safe change now and the fuller model later, Option 2
followed by Option 3 is a coherent path.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model — the four-state schema, on both filing types.**

   **New field, both `annual_accounting` and `guardian_inventory`:**
   `bondDepositoryState`, an enum with exactly these values —

   | Value | Meaning | Reveals |
   | --- | --- | --- |
   | `''` | unanswered (default) | nothing |
   | `depository-only` | restricted depository, no bond | receipt date |
   | `bond-and-depository` | both | receipt date **and** bond details |
   | `bond-only` | bond, no restricted depository | bond details |
   | `bond-waived` | bond waived by court order | order date |

   **Fields retained, not replaced:**
   - `bondAmount`, `bondPeriodFrom`, `bondPeriodTo`, `bondingCompany` — Annual
     rows 137-140, Inventory's equivalents. Still collected, now shown only in
     the two bond states.
   - `restrictedDepositoryReceiptDate` — Annual row 136, already exists. Shown
     in the two depository states. **On the Inventory this is a new field**, and
     see §8.5 below: it has no workbook cell there.
   - `bondWaivedDate` — exists on Inventory (rows 882-883); **new on Annual**.
     Shown only in `bond-waived`.
   - The per-row `Restricted?` flags on Inventory Schedules B-1/B-3 and Annual
     Schedules D-1/D-4 are **untouched**. They feed the bond calculation and are
     not superseded by this question.

   **Fields removed:** `bondWaived` (Inventory, row 883) is subsumed —
   `bond-waived` is one of the four states. Do not leave both in place; two
   fields expressing the same fact will drift.

   **Rows 137 and 140** (`bondAmount`, `bondingCompany`) already say `optional`
   and, once the two `req()` calls are removed, that finally becomes true — the
   data model, the UI and the export gate agree for the first time.

   **Inventory vs Annual:** the question and its four states are identical. The
   difference is only in what reaches the filed Excel — see §8.5.
2. **Legacy data migration — `bondDepositoryState` must be inferred, not
   defaulted.** New field defaults to `''` for a filing with nothing entered.
   But existing filings already hold the facts, and dropping them to "unanswered"
   would lose information the filer supplied. Infer on load, per form:

   | Existing state | Inferred value |
   | --- | --- |
   | Inventory `bondWaived === 'Yes'` (or a `bondWaivedDate` present) | `bond-waived` |
   | Annual `restrictedDepository === 'Yes'` **and** bond details entered | `bond-and-depository` |
   | Annual `restrictedDepository === 'Yes'`, no bond details | `depository-only` |
   | Bond details entered, no depository answer | `bond-only` |
   | Nothing entered | `''` — unanswered |

   **Never coerce an unanswered tri-state into a state** (§4). A blank
   `restrictedDepository` with blank bond fields is unanswered, not
   `depository-only`, and must stay `''`.

   Two consequences to state plainly rather than discover:
   - **An existing `.sav` with blank bond fields becomes exportable on load,
     deliberately** — that is the point of the item. A filing blocked today stops
     being blocked, with no filer action.
   - **`bondWaived` is removed** (item 1), so the inference above is the only
     thing that preserves an existing waiver answer. If it is not written, every
     filing that recorded a waived bond silently forgets it.
3. **Fixture and factory audit.** Both filing types' fixtures currently populate
   bond fields (and Inventory's also answer the waiver question) purely to get
   past these rules. Grep every `fillMinimalValidAnnual*`,
   `fillMinimalValidGuardian*` and `BASELINE` before building. Expect fixtures
   to keep passing either way — removing a requirement cannot break a fixture
   that satisfies it — so the real risk is the reverse: **tests that assert
   these errors are raised will fail, and those are the ones to find.** Grep for
   `'D-4 — Bond`, `'Part IX — Bond`, and `filing.bond-waiver.incomplete`.
4. **Test coverage and index — the matrix, on both filing types.**

   | What | Assertion |
   | --- | --- |
   | Export gate | **No** export issue in any combination of the five states × blank/filled bond fields × blank/filled dates. Nothing in this section ever blocks. |
   | Each state's reveal | Selecting a state shows exactly its fields and hides the others, **without navigating away** — the regression guard for the 67F defect this item is sequenced behind |
   | Switching states | Moving between states does not delete what was entered (§4 non-destructive toggling) |
   | Migration | Each row of the item-2 inference table, asserted from a fixture saved in the old shape |
   | PDF | Each of the five states prints its specified line, and unanswered prints none |
   | Excel — Annual | Nothing is written for the state or either date; the workbook has no cells for them |
   | Excel — Inventory | Same, **plus** `bondWaivedDate` must continue to reach `PART V` G15, which it does today (`guardian-inventory/excel.js:520`) |

   `TEST-INDEX.md` row in the same commit, red-first proof.
5. **Export/import/portability — both forms, stated separately because they
   differ.**

   **Annual.** Nothing new is written: the workbook has no cell for the state,
   the receipt date, or a waiver date. The importer
   (`annual-accounting/excel.js:633`) must be checked — an imported workbook
   carries none of these, so import must **not** reset `bondDepositoryState` to
   `''` on a filing that already has one. Preserve the in-app value; do not let
   a silent absence overwrite it.

   **Inventory.** Not symmetrical, and this is the trap. Its workbook **does**
   have a cell for the waiver date — `PART V` G15, written at
   `guardian-inventory/excel.js:520` and read back at `:667`. So:
   - `bondWaivedDate` continues to round-trip through G15 as it does today.
   - `bondDepositoryState` itself has **no** cell and does not round-trip.
   - The receipt date on the Inventory has no cell either (the workbook directs
     receipts to be filed separately), so it lives in the `.sav` and PDF only.

   **Therefore an Inventory round-trip can produce a waiver date with no state.**
   Decide the import rule deliberately: a G15 value with no in-app state should
   infer `bond-waived`, by the same rule as item 2's migration table. Without
   that, re-importing loses the answer while keeping the date.
6. **Security and sensitivity.** Neither the state nor either date is sensitive;
   no new classification needed. Note the bond fields they gate are likewise
   unclassified today.
7. **UI/UX consistency.** One question, worded identically on both forms,
   replacing Inventory's existing D-4 waiver question
   (`guardian-inventory/index.js:1166-1168`) and Annual's separate
   restricted-depository and bond questions. The control **must carry a route**,
   which is why 67F comes first — four of the five states reveal a field, and on
   the current helpers none of them would appear.
8. **Legal/compliance framing.** This decision does **not** assert that a filing
   may be made without bond information. It asserts something narrower: the app
   will not block a filing on a field the court's own workbook does not ask for.
   Whether the Clerk accepts such a filing is their call and worth asking — the
   answer belongs in this document, as §4 records the equivalent for blank
   schedules. Chapter 744 and the Probate Rules are now in the repository, so
   the statutory side is answerable by reading; that would strengthen the basis
   and cannot weaken it, since removing an app-invented blocker needs no
   authority. Contrast 67A, where the Clerk's answer *was* obtained and did
   change the design.
9. **Cross-form method consistency.** This item now *is* the cross-form fix for
   Inventory and Annual — one advisory producer serving both is the point, not a
   side effect. Simplified Accounting's bond handling was still not examined.
   Read it before building (§8.9) and report
   whether it shares the defect; do not fix it silently.

---

## 67C — Every Annual/Final/Trust Excel export opens with a corruption warning

### What a filer observes

The guardian saves their accounting as Excel and files it. When anyone opens
that file — the guardian, their attorney, or **the Clerk's reviewer** — Excel
says:

> We found a problem with some content in 'X.xlsx'. Do you want us to try to
> recover as much as we can? If you trust the source of this workbook, click Yes.

On a court filing, that dialog is its own harm regardless of what follows: the
document announces itself as damaged to the person reviewing it. If the reader
clicks **No**, the workbook does not open at all. If they click **Yes**, Excel
silently deletes part of the file and reports what it removed.

This is not a stale-build problem. It reproduces on a file generated from
current `master`, and it fires on **every** Annual, Final and Trust Accounting
Excel export — all three are one code path.

### Evidence

Excel's own repair log, from a file generated 2026-09-23 from current `master`:

```
Errors were detected in file 'annual-runtime.xlsx'
Removed Records: Named range from /xl/workbook.xml part (Workbook)
```

That is the only record Excel removed — no formulas, no sheets, no data.

The named range is `yesORno`. The Annual template defines it as
`[1]DropDownData!$A$6:$A$8` — a reference to an **external** workbook — and
carries the machinery that makes it resolvable: an `<externalReferences>` block,
`xl/externalLinks/externalLink1.xml`, its rels, and its Content_Types override.
The exported file keeps the name and drops all of that machinery, so `[1]`
points at nothing.

Two independent causes combine:

1. `saveWorkbookFile()` filters only `.wvu.` custom-view names
   (`src/core/excel/excel-engine.js:177-180`), so `yesORno` survives the write.
2. ExcelJS does not carry external links through `workbook.xlsx.writeBuffer()`,
   so the parts the name depends on are not written.

Neither is wrong on its own; together they emit a dangling reference.

### Court-form authority (AGENTS.md §5)

All three embedded templates were parsed to establish what actually depends on
this name before proposing to remove it:

| Template | `yesORno` target | Sheets referencing it |
| --- | --- | --- |
| `annual-template.js` | `[1]DropDownData!$A$6:$A$8` — **external** | **0** |
| `guardian-template.js` | `DropDownData!$A$6:$A$8` — internal | 1 (`sheet20`, a live dropdown) |
| `simplified-template.js` | not defined | — |

**Annual's copy is orphaned leftover.** It points outside the workbook, and
nothing inside the workbook uses it — the Annual template has no `DropDownData`
sheet at all. It was almost certainly inherited when the Annual workbook was
authored from the Guardian one. Removing it from the *export* removes something
the court's own instrument does not use and cannot resolve.

**Guardian's copy is internal, live, and must be kept** — `sheet20` drives a
Yes/No dropdown from it. Any fix must distinguish the two, which is why the
recommended option keys on the external-reference marker rather than on the
name.

Note that this changes nothing the court computes: no formula, threshold, fee or
total is touched. This is structural metadata only, so §5's "push back on any
change that alters a calculation" does not bite here.

### Consequences beyond the dialog

Removing the name is what Excel does during repair, and after that repair the
workbook is fully healthy: every formula recalculates correctly (Appendix A has
the post-repair values). The tester's other five Excel symptoms — blank summary
page, missing schedule totals, empty Schedule B-4 summary, unpopulated Part IX
bond calculation — are all consistent with this single defect and its repair
path, and **no other structural defect capable of producing them was found in
the file**.

One honest qualification: on the machine used here, clicking Yes produced a
repair that removed only the named range and left every total computing. The
tester saw blank totals, which implies their Excel build repaired more
aggressively, or they viewed the file in something that does not recalculate.
That exact variant was not reproduced. What is established is that the
corruption is real, universal, and upstream of all of it — so fixing 67C
removes the whole class, whatever each reader's Excel does with a damaged file.

### Decision — SETTLED 2026-09-23: Option 1

**Strip the dead pointer.** Options 2 and 3 are kept below only as the record of
what was weighed; neither was judged worth doing.

**In plain terms, for anyone reading this without the file open.** The exported
workbook carries a leftover pointer to a *different* spreadsheet that does not
exist and is never attached — like a contact card listing a disconnected
number. Excel follows it, finds nothing, and declares the file damaged. The
pointer is a ghost: the county built the Annual workbook by copying the
Inventory one, where that pointer does something real (it fills a Yes/No
dropdown). Annual's copy has nothing to point at and nothing that reads it.

**The build.** Extend the existing filter in `saveWorkbookFile()`
(`src/core/excel/excel-engine.js:177-180`) so that, alongside the `.wvu.`
custom-view names it already drops, it also removes any defined name whose
target references an external workbook (`[n]`). The test is on the **target**,
not on the name — which is what makes it safe:

- Annual's `yesORno` → `'[1]DropDownData'!$A$6:$A$8` is removed. It is the only
  external-target name in that export, and **zero** Annual sheets reference it.
- Guardian's `yesORno` → `DropDownData!$A$6:$A$8` is untouched: internal target,
  and `sheet20` genuinely uses it for a dropdown.
- Every other name — `Name_of_Ward`, `Case_Number`, `Filing_Type`, `From_Date`,
  `To_Date`, `Guardian`, `Attorney`, print areas — is untouched.

**What changes for a filer:** the repair dialog stops appearing. And because
that repair is what was stripping the workbook's computed values, the summary
page, schedule totals, Schedule B-4 summary and Part IX bond calculation all
start showing numbers again. This single change resolves five of the six
symptoms originally reported against the Excel export.

**Superseded options, for the record:**

**Option 1 — Drop defined names whose target references an external workbook
(RECOMMENDED — CHOSEN).** Extend the existing filter in `saveWorkbookFile()` so it also
removes any name whose formula contains an external-workbook marker (`[n]`).
*Filer sees:* the file opens normally, with no dialog, on every filing type.
*Cost:* one predicate added to a filter that already exists. Removes exactly
Annual's orphan; Guardian's internal `yesORno` and every other name are
untouched, because the test is on the target, not the name.

**Option 2 — Write the external-link parts through so the reference resolves.**
Carry `externalLink1.xml`, its rels and the Content_Types override into the
output. *Filer sees:* the same clean open. *Cost:* materially more work —
ExcelJS has no supported path for this, so it means post-processing the produced
zip. *And it buys nothing:* the reference would resolve to a dropdown list that
no Annual sheet uses. Not recommended — it preserves dead weight at real cost.

**Option 3 — Rewrite `yesORno` to an internal range.** Point it at a range
inside the Annual workbook. *Cost:* small, but the Annual workbook has no
`DropDownData` sheet to point at, so this means inventing one — writing a new
sheet into the court's instrument to satisfy a name nothing reads. Not
recommended.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** No change — this is export-time structural metadata, not
   persisted filing data.
2. **Legacy data migration.** None. Nothing about saved `.sav` files changes;
   the fix affects only what is written into a generated workbook.
3. **Fixture and factory audit.** None needed — no new required field.
4. **Test coverage and index.** Red-first proof must be against a **generated
   file**, not the model: assert that no defined name in the output references
   an external workbook, and that Guardian's internal `yesORno` still survives
   its own export (that second assertion is what stops an over-broad filter).
   `tests/e2e/excel-defined-names.spec.ts` already exists and is the natural
   home; `TEST-INDEX.md` updated in the same commit if a new file is added (§7).
5. **Export/import/portability.** The importer reads cells by address and does
   not consult defined names, so round-trip is unaffected — but confirm that,
   rather than assuming it, since §5 warns that re-importing agrees with a
   broken exporter perfectly.
6. **Security and sensitivity.** None.
7. **UI/UX consistency.** No UI surface.
8. **Legal/compliance framing.** None — no filed value changes. The filing's
   numbers are identical; only a piece of unreadable metadata stops being
   emitted.
9. **Cross-form method consistency.** `saveWorkbookFile()` is shared by all
   three Excel-producing filing types, so the fix lands once and covers
   Guardian Inventory and Simplified Accounting too. Verify each still exports
   cleanly — Guardian is the one with a live internal name to protect.

### Build record — LANDED 2026-09-23

**What a filer now sees.** An Annual, Final or Trust Accounting saved as Excel
opens in Excel with no repair dialog. Because that repair was what stripped
the workbook's computed values, the summary page, schedule totals, Schedule
B-4 summary and Part IX bond calculation show their numbers.

**The build.** `saveWorkbookFile()` (`src/core/excel/excel-engine.js`) now
drops, alongside the `.wvu.` custom-view names it already dropped, any defined
name whose target contains an external-workbook marker (`[n]`). The test is on
the *target*: Annual's `yesORno → '[1]DropDownData'!$A$6:$A$8` goes;
Guardian's `yesORno → DropDownData!$A$6:$A$8`, which a live dropdown reads,
stays, as does every other name. No cell, formula or filed value changes.

**Verification.**

- **Red first**, against the unfixed exporter: the new case in
  `tests/e2e/excel-defined-names.spec.ts` failed naming exactly
  `yesORno -> '[1]DropDownData'!$A$6:$A$8`; the file's other five cases
  passed, including the new assertion that Guardian's internal `yesORno` is
  present — so the fix could not pass by over-stripping. Green: 6/6.
- **Cross-form (§8.9):** `tests/e2e/excel-form-field-placement.spec.ts`
  (Simplified and Guardian exports, plus a Guardian re-import) ran with it:
  **14/14 in 2.0 min** across the two files. All three exporters share the
  changed function and all three still export and read back.
- **Unit:** `tests/unit/excel-engine.spec.js` +3 cases pinning the predicate
  (Annual's orphan dropped, Guardian's same-named internal target kept, print
  areas and `.wvu.` handling unchanged): 13/13.
- `TEST-INDEX.md` rows rescoped for both specs; no new file, so no index row
  needed.

**Still open, unchanged from the item:** the tester saw blank totals after
repair, which this machine's Excel did not reproduce (it repaired by removing
only the name, and every total computed). The corruption itself is now gone,
which removes the whole class regardless of how a given Excel build repaired
it. If a tester still sees blank totals on a post-67C export, that is a new
finding, not this one.

Landed in the commit whose subject begins `fix(milestone-67C):`.

---

## 67D — Every Annual/Final/Trust export destroys the Bond Period formulas

### What a filer observes

On the filed workbook's `PART IX`, **Bond Period From and Bond Period To print
blank** — even when the accounting period is filled in, and even after Excel's
repair. The court's workbook is built to fill those two boxes automatically from
the accounting period; the app overwrites that mechanism on every export.

Unlike 67C, this one is not recoverable by the reader: Excel's repair does not
restore it, because the formulas were destroyed before Excel ever saw the file.

### Evidence

Template, `PART IX ` (parsed from `templates/annual-template.js`):

```xml
<c r="E21" s="548"><f>From_Date</f><v>0</v></c>
<c r="G21"><f>To_Date</f>...</c>
```

Generated file, same two cells: empty, no `<f>` element, no value.

The write, `src/features/annual-accounting/excel.js:470-471`:

```js
setCell(p9,'E21',fD(inv.bondPeriodFrom));
setCell(p9,'G21',fD(inv.bondPeriodTo));
```

`From_Date` and `To_Date` are defined names carrying the accounting period, and
they survive in the export (confirmed — 67C's parse lists them intact). So the
template would have filled both boxes correctly on its own.

**This fires on every export, not only when the field is blank.** A blank input
writes empty over the formula; a filled input replaces the formula with a
literal. Either way the auto-fill is gone from the filed workbook permanently.

*A superseded diagnosis, recorded so it is not repeated:* an earlier pass
attributed this to Annual lacking `bondPeriodFrom`/`bondPeriodTo` fields, on the
theory that they are Guardian Inventory fields. That is wrong — both exist for
Annual (`probate-guardian-data-model.csv:138-139`, UI at
`src/features/annual-accounting/index.js:1412-1413`). The defect is writing into
a formula cell at all, independent of whether the source field has a value.

### Court-form authority (AGENTS.md §5 / §10 P1)

This is the anti-pattern §5 states in as many words: *"Never write into a
formula cell. The app writes inputs; the template's formulas compute totals.
Overwriting one with a literal is silent — the file still opens, the number is
just wrong forever after."* P1 records this as the mechanism by which Milestone
57D became a critical regression.

The template's intent is unambiguous and authoritative: the Clerk's workbook
propagates the period into the bond block by name. The app must not replace
that.

### Decision — SETTLED 2026-09-23: Option 1, with the PDF falling back

**The bond period is always the same as the accounting period** — settled by the
requester, and consistent with the court's own workbook, which fills the bond
period from the accounting period by formula rather than asking for it.

**The build.**

1. **Stop writing `PART IX ` E21/G21.** Delete both `setCell` calls at
   `src/features/annual-accounting/excel.js:470-471`. The template's
   `=From_Date` / `=To_Date` formulas survive and fill the boxes, which is what
   they were built to do.
2. **Keep the app's Bond Period From/To entry fields on screen.** They continue
   to feed the PDF (`annual-accounting/pdf-model.js:1064`). The requester chose
   to keep them rather than remove them.
3. **The PDF falls back to the accounting period when those fields are blank.**
   This is not a separate decision; it is required to stop the chosen option
   from *introducing* a mismatch. Today both outputs are blank when the fields
   are empty. After step 1 the Excel shows the accounting period, so a PDF that
   still printed blank would disagree with it **in the ordinary case, on every
   filing where the filer left those boxes alone** — which is most of them.
   With the fallback: blank fields → both documents show the accounting period
   and agree; a typed value → the PDF shows it as a deliberate override.

### Named decision: a typed Bond Period is not preserved, and that is deliberate

Raised to its own heading because it is a **product decision with a data-loss
consequence**, not an implementation detail, and it should be approved as one
rather than absorbed into a checklist.

**What happens.** The Bond Period From/To boxes stay on the Annual screen and
remain editable. If a filer types a period different from the accounting period:

| Path | Result |
| --- | --- |
| The filed PDF | shows **what they typed** |
| The filed Excel | shows the **accounting period** — the form computes it; the app no longer writes there |
| Re-importing that Excel | **overwrites** what they typed with the accounting period |

So a deliberately different bond period survives in the app and the PDF, and is
lost the moment the filing round-trips through Excel. Nothing warns the filer at
any point.

**Why it was accepted.** The requester decided (2026-09-23) that the bond period
is *always* the same as the accounting period. On that premise nothing is
actually lost, because the differing value should not exist. The fields were kept
anyway — also the requester's decision — because the PDF still renders from them.

**The exposure, stated plainly:** the premise and the retained editable fields
are in tension. If the premise is right, the fields are redundant and should
eventually go. If a filer ever *does* have a genuinely different bond period,
this design silently discards it.

**RESOLVED 2026-09-23: warn when the two differ.** The requester chose not to
accept the silent loss. The fields stay, the Excel keeps taking the accounting
period from the form, but the filer is told before they submit.

**What to build.** A non-blocking advisory, raised when `bondPeriodFrom` or
`bondPeriodTo` is populated **and** differs from `periodFrom`/`periodTo`:

> The bond period entered differs from the accounting period. The filed Excel
> will show the accounting period.

It belongs in the `advisories` array this milestone already extends
(`src/core/filing/output-preflight.js:41-47`) — the same channel as 67B's bond
warnings, so it renders in the print preview and **never gates export**.

**Required test.** Assert all three at once, because the point is the
combination: with a differing bond period entered, (a) the advisory appears,
(b) the PDF still shows the typed value, (c) the Excel still shows the
accounting period. A test of any one of those alone would pass while the
behavior as a whole was wrong.

This closes the tension named above: the loss is still real, but it is no longer
silent, and the filer can correct it before filing rather than discovering it
after a round-trip.

**Scope note: this is Annual only.** Guardian Inventory writes its own bond
block to `PART V` G26/E27/G27/D28 (`guardian-inventory/excel.js:516-519`), and
those template cells are **plain and empty — no formulas** (verified by parse).
Inventory also has no accounting period to derive a bond period from, which is
why it must collect one. Its writes are correct and must not be changed.

**Superseded options, for the record:**

**Option 1 — Stop writing E21/G21 entirely and let the template fill them
(RECOMMENDED — CHOSEN, with the PDF fallback above).** Delete both `setCell` calls. *Filer sees:* Bond Period From/To
populate automatically from the accounting period, which is what the court's
form was built to do. *Cost:* two lines removed. *Consequence to confirm before
building:* the app's own Bond Period From/To inputs
(`annual-accounting/index.js:1412-1413`) would then no longer reach the Excel
output at all. If a filer is ever meant to enter a bond period that differs from
the accounting period, this option silently discards it — which is why the next
option exists, and why the requester should say which behavior is intended.

**Option 2 — Write only when the filer entered a value, otherwise leave the
formula.** *Filer sees:* auto-fill when they leave it blank, their own value
when they enter one. *Cost:* small, and it preserves both behaviors. *Downside:*
entering a value still destroys the formula for good in that file — acceptable
if that is a deliberate override, but it should be a deliberate one.

**Option 3 — Remove the Bond Period inputs from the Annual UI instead.** If the
period is always the accounting period, the two inputs are misleading and should
go. *Cost:* UI change plus a data-model decision about the now-unused fields.
Raised only because Option 1 makes those inputs dead; not recommended without
the requester confirming the fields serve no purpose.

**This decision needs an answer about intent, not just implementation:** is the
bond period ever legitimately different from the accounting period? The
template's own design says no. If that is right, Option 1 is correct and the UI
fields are redundant.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** No row changes. `bondPeriodFrom`/`bondPeriodTo` (rows
   138-139) stay exactly as they are — still collected, still persisted, still
   feeding the PDF. Only their route into the Excel is removed.
2. **Legacy data migration.** None needed. An existing `.sav` holding a bond
   period keeps it, and keeps showing it in the PDF. What changes is that the
   Excel now derives the bond period from the accounting period instead of
   taking it from those fields — so a saved filing whose bond period differs
   from its accounting period will export an Excel that differs from its PDF.
   That is the accepted consequence recorded in the decision, and it applies to
   existing files on load, not just new ones.
3. **Fixture and factory audit.** Annual fixtures that set bond period values
   will stop seeing them in the output; any assertion on E21/G21 must be updated.
4. **Test coverage and index.** Red-first against a generated file: assert
   E21/G21 still contain their `<f>` elements after export. This is exactly the
   class §5 says to verify by reading the exported file, never by re-importing.
5. **Export/import/portability — DECIDED 2026-09-23: stop reading those cells.**
   This was the sharpest risk in the item and is now closed. The importer
   currently reads E21/G21 back (`excel.js:820-821`, `gcDate(p9,'E21')`). After
   this change those cells hold a *formula*, and a freshly written file carries
   no computed result — Appendix A found 1,193 of 1,228 formula cells sitting at
   a cached `0` until Excel recalculates. Importing a workbook the app just
   produced would therefore read `0` or empty and silently wipe the filer's bond
   period.

   **The decision: the importer stops consulting E21/G21 entirely and derives
   `bondPeriodFrom`/`bondPeriodTo` from the imported accounting period instead.**
   This follows directly from the item's premise — the two are always the same —
   and it removes the dependency on whether Excel has calculated the file. There
   is nothing to wipe because nothing is read.

   *Accepted consequence:* a filer who typed a bond period different from the
   accounting period (which the UI still allows, per the decision to keep those
   fields) will not get that value back on re-import; it will be replaced by the
   accounting period. That is consistent with the Excel export, which already
   carries the accounting period in those cells, and with the item's premise.
   It is the same trade recorded in the decision above, surfacing on the import
   side.

   Still required: a full round-trip test — export, re-import, compare — not an
   assumption. §5 is explicit that re-importing is not proof of a correct
   export, and this is exactly that trap.
6. **Security and sensitivity.** None.
7. **UI/UX consistency.** Options 1 and 2 change no UI. Option 3 does.
8. **Legal/compliance framing.** The bond period is a filed value. Getting it
   blank on a court document is a filing defect, which is what makes this worth
   fixing; no legal question is resolved here.
9. **Cross-form method consistency.** Guardian Inventory has its own bond block
   and its own PART V writes. Read them before building (§8.9) and report
   whether the same formula-overwrite exists there — do not fix it silently.

---

## 67E — Every exported date is written as text, not as a date

### What a filer observes

Dates in the filed workbook show as `2026-01-01` instead of `01/01/2026`, in
cells the court's form has already formatted for US dates. They also sort as
text rather than chronologically, and any date arithmetic against them fails.
The Clerk receives a workbook whose dates do not match the form's own
convention.

### Evidence

Parsed from the generated file. Every date the app writes is a shared string:

| Sheet | Cell | Stored as | Value | Cell's number format |
| --- | --- | --- | --- | --- |
| `PART I` | E18 (period from) | `t="s"` — text | `'2026-01-01'` | `mm/dd/yy;@` |
| `PART I` | H18 (period to) | `t="s"` — text | `'2026-12-31'` | `mm/dd/yy;@` |
| `PART I` | F5 (inception) | `t="s"` — text | `'2025-01-01'` | — |
| `SCH B-4 OTHER DISB p2` | D20 | `t="s"` — text | `'2026-03-04'` | `m/d/yyyy` (numFmtId 14) |
| `SCH B-4 OTHER DISB p2` | D21 | `t="s"` — text | `'2026-04-15'` | `m/d/yyyy` |

The contrast sits in the same column of the same sheet: the court's own
untouched example row at `D16` is `42279` — a real Excel date serial under
numFmtId 14. The template formats these cells for dates; text ignores the
format.

Source: `fD()` (`src/features/annual-accounting/excel.js:177`) truncates to
`YYYY-MM-DD` and returns a **string**; `setCell()`
(`src/core/excel/excel-engine.js:116-127`) branches only on
`typeof value === 'number'`, so a string is written as literal text with no
`numFmt` applied. Confirmed by grep: no `numFmt` handling exists on Annual's
write path.

### Court-form authority (AGENTS.md §5)

The template's own cells carry US date formats (`m/d/yyyy`, `mm/dd/yy;@`) and
its own example data uses real serials. The court's instrument expects dates;
the app supplies text. Matching the template needs no permission (§5) — this is
a correction toward the template, not a divergence from it.

No calculation changes: none of these cells feeds a total. This is a
presentation and data-type defect, not a numeric one.

### Decision — SETTLED 2026-09-23: Option 1

**Write real dates.** Options 2 and 3 are kept below as the record of what was
weighed.

**The build.** Convert at the write boundary so each date cell carries a real
date rather than a string, and let the cell's existing number format display it.
Two places:

- `fD()` (`src/features/annual-accounting/excel.js:177`) currently truncates to
  a `YYYY-MM-DD` **string**.
- `setCell()` (`src/core/excel/excel-engine.js:116-127`) branches only on
  `typeof value === 'number'`, so a string is written as literal text with no
  number format applied.

Both are shared across the three Excel-producing filing types, so this lands
once and covers Guardian Inventory and Simplified Accounting too — all three
need re-testing together.

**Reading files back in already works — verified, not assumed.** `gcDate()`
(`src/features/annual-accounting/excel.js:574-583`) already accepts a real date
first (`if (v instanceof Date) return v.toISOString().slice(0,10)`), before its
ISO-text and US-text fallbacks. So the importer needs no change and the
round-trip is not at risk. This was the highest-risk unknown in the item when it
was written up; it is now closed.

**The conversion contract — DECIDED 2026-09-23: calendar days, no timezone.**

A filing date is a **calendar day**, not an instant. `2026-01-01` on a
guardianship filing means that day, and it means the same day regardless of
where the filer, the Clerk, or the server happens to be. The conversion must
therefore never involve a timezone in either direction:

- **Writing:** build the Excel date from the year, month and day components of
  the stored `YYYY-MM-DD` string directly. Do not construct it from an instant,
  and do not let a local-timezone offset enter the calculation.

  **The concrete representation, because "a real date" is not specific enough to
  build from.** The exporter writes an **Excel serial number** — the integer day
  count the format expects — and sets the cell's number format, rather than
  handing ExcelJS a JavaScript `Date`. A `Date` is an instant, and every route
  from an instant back to a calendar day reintroduces the timezone question this
  contract exists to remove; a serial is a pure day count and cannot carry one.

  Implement it as a single named helper — working name
  `toExcelSerialDate('YYYY-MM-DD')` — used by **every** date write on every
  filing type, so there is exactly one place this can be got wrong. `setCell()`
  (`src/core/excel/excel-engine.js:116-127`) already special-cases numbers, so a
  serial travels its existing numeric path; what it needs is the number format
  applied alongside.

  **Introducing the helper is not the deliverable — routing every writer through
  it is.** A helper that half the date writes bypass leaves the defect in place
  on whichever cells were missed, and those are invisible until a filer sorts a
  column. Before this is called done:

  - Enumerate every date write across all three exporters. `fD()` in
    `annual-accounting/excel.js:177` is one; `fmtD()` in
    `guardian-inventory/excel.js` (used at `:485-486`, `:517-518` and elsewhere)
    is another; Simplified has its own. Find them all — grep the formatters, not
    just the call sites.
  - Assert **coverage**, not just correctness: a test that walks the generated
    workbook and fails if *any* cell whose template number format is a date
    format holds a string. That catches a missed writer, which a
    per-cell test cannot.
  - **Verify the reader component-wise too.** `gcDate()`
    (`annual-accounting/excel.js:574-583`) converts a `Date` via
    `toISOString()`, which is UTC. Once serials are written, confirm what
    ExcelJS hands back and that the path from it to `YYYY-MM-DD` never applies
    an offset. If it does, that reader changes as part of this item — the write
    side alone does not close the timezone hole.

  **The assertion, stated exactly:** the generated sheet XML for a date cell
  must carry **no `t` attribute** (numeric is the default) and a `<v>` holding
  the integer serial — e.g. `2026-01-01` → `<c r="E18" s="…"><v>46023</v></c>`,
  *not* `t="s"` with a shared-string index, which is what it emits today. A test
  asserting the rendered display string would pass on the current broken output
  and must not be used as the guard.
- **Reading:** take the year, month and day back out the same way. Note that
  `gcDate()` (`excel.js:574-583`) currently converts a `Date` via
  `toISOString()`, which **is** UTC-based — so if a written value ever carries a
  time component, this is precisely where a day would be lost. That path must be
  made component-based too, or proven to be safe for the values actually written.

*Why not "use UTC consistently":* it works only while every path agrees, and the
failure mode is silent — a filing simply carries the wrong date. The repository
has already shipped and fixed one timezone-shifted date (commit `656cccf`).
Removing timezones from the question entirely means no future path can
disagree.

**Required test, specifically:** an exact round-trip across a year boundary —
export a filing dated `01/01`, re-import, assert it is still `01/01` and not
`12/31` of the prior year; and the same for `12/31`. A general "dates work" test
will pass while this bug is present.

**Superseded options, for the record:**

**Option 1 — Write real Excel dates and let the template's format display them
(RECOMMENDED — CHOSEN).** Convert to a `Date`/serial at the write boundary so each cell
carries a real date under the cell's existing format. *Filer sees:* dates in the
form's own US format, sorting correctly, usable in formulas. *Cost:* a typed
branch in `setCell()` plus a date-aware variant of `fD()`; every date write
across the three filing types goes through this path, so the change is shared
and needs the shared test.

**Option 2 — Write US-formatted text (`01/01/2026`).** *Filer sees:* the right
format on screen. *Cost:* smallest possible change. *Downside:* still text — it
still sorts wrong and still breaks date arithmetic, so it fixes the appearance
and leaves the defect.

**Option 3 — Leave as is.** Recorded only for completeness. The filed document
disagrees with the court form's own convention, which is the kind of thing a
reviewer notices.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** No change — storage stays ISO (`iso-date`), which is correct;
   only the Excel write boundary changes.
2. **Legacy data migration.** None; this is an output-format change.
3. **Fixture and factory audit.** Any test asserting an exported date equals the
   string `'2026-01-01'` will need updating to assert a serial or a formatted
   value. Grep for those before building — they are the likeliest breakage.
4. **Test coverage and index.** Red-first against a generated file: assert the
   cell's type is numeric and its value is the expected serial, not a string.
   Guard against timezone drift explicitly — an off-by-one-day date is precisely
   the bug this class produces, and commit `656cccf` already fixed one
   timezone-shifted date in this codebase.
5. **Export/import/portability. Checked — not a blocker.** `gcDate()`
   (`excel.js:574-583`) already handles a real `Date` before falling back to ISO
   text and US text, so the importer needs no change. What still must be tested
   is the **exact** round-trip across a date boundary, because of the UTC
   conversion noted in the decision — export a filing dated 01/01, re-import it,
   and assert it is still 01/01 and not 12/31.
6. **Security and sensitivity.** None.
7. **UI/UX consistency.** No UI surface; the app's own date inputs are unchanged.
8. **Legal/compliance framing.** Dates are filed values, but no legal question
   is resolved here — the correct value is already known, only its encoding is
   wrong.
9. **Cross-form method consistency.** `setCell()` is shared by all three Excel
   exporters, so Guardian Inventory and Simplified Accounting write dates the
   same way and would be fixed — and would need re-testing — together.

---

## 67F — Questions whose answers reveal nothing, and one that files data in the wrong box

**Prerequisite for 67B** (decided 2026-09-23). 67B's waiver date would sit
behind exactly this defect, so fixing it first prevents shipping a fifth
instance of a bug already confirmed four times.

### What a filer observes

Three symptoms, all the same underlying fault, in order of severity:

**1. Annual Plan, Question 11 — a name typed into the wrong box.** Reproduced
end to end in a browser (Appendix B):

- The filer sees one box labelled *"Declaring guardian's name."*
- They tick *"I have received NO remuneration…"*. **The page does not change.**
- They type their name into the only such box on screen. It is the *other*
  branch's box, so the value lands in `q11ReceivedName` while the validator
  reads `q11NoRemunerationName` — still empty. Both branches label their field
  identically, so nothing on screen suggests anything is wrong.
- At Preview & Export: *"1 required field still missing — 11. Remuneration —
  declaring guardian's name"*, with a name plainly filled in on the page they
  just left. Re-typing puts it in the same wrong box every time.

This is the worst of the three because it silently misfiles data rather than
merely hiding a control, and the filer has no way to resolve it from the UI.

**2. Annual Accounting, Part IX — a date with nowhere to type it.** Answering
*"Restricted depository? → Yes"* is supposed to reveal a "Date of Most Recent
Receipt" field. It does not appear. The form asks for a date and gives the filer
nowhere to put it. It materialises only after navigating to another page and
back — which nothing tells them to do.

**3. Initial Plan, Questions 2, 4 and 5 — explanation boxes that never appear.**
Same mechanism: selecting the answer that requires an explanation does not
reveal the explanation box until the filer leaves the page and returns.

### Evidence — one fault, four instances

A conditional reveal is re-evaluated only when its page re-renders. The only
thing that triggers a re-render on a field change is
`src/form-events.js:117-119`:

```js
if (control.dataset.formRoute && window.renderPage) {
  window.renderPage(control.dataset.formRoute);
}
```

So a control that gates a reveal must carry `data-form-route`. Three helpers
cannot produce one:

| Helper | Delegates to | Route? |
| --- | --- | --- |
| `chkP(id,label,checked)` (`legacy-app.js:5883-5885`) | `renderCheckboxField()` (`form-fields.js:378-389`) | **no parameter exists** |
| `radioP(id,label,val,options,req,hint)` (`legacy-app.js:5953-5955`) | `renderRadioGroupField()` (`form-fields.js:346+`) | **no parameter exists** |
| `yesNoRadioAnnualHTML(id,label,val,path,req,tooltipKey)` (`legacy-app.js:5946-5948`) | `yesNoRadioHTML(...,route:'',...)` | **hardcoded empty** |

The helpers that *do* take a route — `yesNoRadioHTML()`, `yesNoCheckboxS()`,
`yesNoCheckboxD()` — are used correctly wherever a reveal depends on them
(Inventory's `/d3`, `/d4`, `/d5`; Annual's `/p8`, `/p10`). So this is not
carelessness at the call sites; **the call sites had no route to pass.** That is
why it cannot be fixed one page at a time, and why it recurred four times.

Annual's own change listener does not help: it handles only `filingType`,
`schedule-no-items` and `import-excel`
(`annual-accounting/index.js:270-280`).

### Decision — SETTLED 2026-09-23: Option 1, and existing wrong-box data is left alone

**The build.**

1. **Give the three helpers a route parameter** — `chkP()`, `radioP()` and
   `yesNoRadioAnnualHTML()` (`legacy-app.js:5883, 5953, 5946`) — and let it
   through to the renderers, which already emit `data-form-route` when given one
   (`form-fields.js:322`).
2. **Pass a route only at call sites that gate a conditional reveal.** Known
   set: Annual Plan Q11's `q11NoRemuneration`; Annual Part IX's
   `restrictedDepository`; Initial Plan Q2, Q4 and Q5's `radioP()` groups; plus
   67B's bond waiver when that is built. Everything else keeps today's behavior.
3. **Do not route the rest.** A route re-renders the page, costing the filer
   their scroll position and focus. The roughly twenty controls that gate
   nothing — the Initial Plan's benefits checkboxes, Annual's per-row
   `Restricted?` / `Income Property?` flags — must not pay that cost on pages
   that behave correctly today.
4. **Add the guard test.** Assert that any control gating a conditional reveal
   can request a re-render. This defect recurred four times because nothing
   detected it; without the guard, the fifth arrives with the next form.

**Existing wrong-box data is left as it is.** Filings already saved may carry a
guardian's name in `q11ReceivedName` with `q11NoRemuneration` ticked. Nothing
migrates it. The filing keeps raising its existing "declaring guardian's name"
issue, and the filer resolves it by hand — which **now actually works**, because
the correct box finally appears when they open the page.

*Why not migrate:* that state is indistinguishable from a filer who genuinely
received remuneration, typed who paid them, and ticked the box in error. The app
cannot tell the two apart, so an automatic move would silently rewrite a correct
filing into a wrong one on a guess. Leaving it means the only filings that
change are ones a human deliberately corrected.

**Superseded options, for the record:**

**Option 1 — Give the three helpers a route parameter, pass it only where a
reveal depends on it (RECOMMENDED — CHOSEN).** *Filer sees:* answering a question
immediately shows the field it asks for, on all four surfaces. *Cost:* three
helper signatures plus the handful of call sites that gate a reveal. *Why only
those:* a route makes every change to that control re-render the whole page,
which costs the filer their scroll position and focus. Controls that gate
nothing do not need it and should not pay for it.

**Option 2 — Re-render on every change to these controls.** Emit a route
unconditionally from all three helpers. *Filer sees:* the same fix, plus a
full page re-render on every checkbox and radio click — including the ~20 that
gate nothing, such as the Initial Plan's benefits checkboxes and Annual's
per-row schedule flags. *Cost:* smallest diff, worst interaction cost, and a
real risk of introducing focus/scroll regressions on pages that work today.

**Option 3 — Reveal without re-rendering.** Toggle the hidden block's
visibility directly, as Inventory's bond-waiver row already does with a
`d-none` class (`guardian-inventory/index.js:1167`). *Filer sees:* the same
fix, with no page re-render at all. *Cost:* every conditional block needs a
stable id and a matching toggle, and the markup for the hidden branch must
already be in the DOM — which is **not** true for the Q11 case, where the two
branches render entirely different fields. Does not solve the worst symptom.

**A guard test is part of whichever option is chosen.** The reason this
recurred four times is that nothing detects it. A test should assert that any
control gating a conditional reveal can request a re-render — otherwise the
fifth instance arrives with the next form.

### The Q11 stranded-data question — ANSWERED: leave it

Settled above. Recorded separately here because it is a data decision rather
than a rendering one, and because "we chose not to migrate" is the kind of thing
a later reader will otherwise assume was an oversight.

### Build record — LANDED 2026-09-23

**What a filer now sees.** Answering a question shows the field it asks for,
on the click, without leaving the page. On the Annual Plan's Question 11,
ticking *"I have received NO remuneration"* swaps in the declaring-guardian
name box, and the name typed into it is saved as `q11NoRemunerationName` —
the field the validator reads — so the "declaring guardian's name" flag now
clears. Annual Part IX's *"Restricted depository? Yes"* reveals the receipt
date. The Initial Plan's Q2, Q4 and Q5 *"Other"* answers reveal their
explanation boxes. Existing wrong-box data is untouched, as decided.

**The count was 40, not 5.** The "known set" of five call sites in the
decision above was what the tester's report exposed. The audit this item
required of the Minor and Simplified Plans (§8.9) was widened to every
conditional render in all five forms and found 37 by reading; the guard test
then corrected the reading in both directions:

- **Three the reading missed**, all on the Initial Plan's Q7 (Benefits):
  `q7Trusts` and `q7PendingBenefits` — `yesNoCheckboxS()` calls, a helper
  that *could* carry a route but was not given one — and the `q7Other` box.
  Each reveals the shared explanation box.
- **Two the reading found that the guard could not see** on a fresh filing:
  `q10ExecOther` (Annual Plan) and `q11ExecOther` (Initial Plan) render only
  inside the "the ward executed directives" reveal. The guard grew a second
  pass for exactly this — see below.

| Form | Page | Controls routed |
| --- | --- | --- |
| Initial Plan | `/p2` | `q2Setting` (radio), `q3MedSpecialist`, `q3MedOther` |
| | `/p3` | `q4Mental` (radio), `q5Personal` (radio) |
| | `/p4` | `q6Other`, `q7Trusts`, `q7PendingBenefits`, `q7Other` |
| | `/p7` | `mentalOther`, `physOther`, `usesOther` |
| | `/p8` | `q11ExecOther`, `needsOther` |
| Annual Plan | `/p3` | `q3SettingOther`, `q3MedSpecialist`, `q3MedNone`, `q3MedOther`, `q3MentalNone`, `q3MentalOther`, `q3PersonalNone`, `q3PersonalOther`, `q3SocialNone`, `q3SocialOther` |
| | `/p4` | `q3BenefitsNone`, `q3BenefitsOther` |
| | `/p8` | `q9MentalOther`, `q9PhysOther`, `q9UsesOther`, `q9NeedsOther` |
| | `/p9` | `q10NoDirectives`, `q10ExecOther` |
| | `/p10` | `q11NoRemuneration` |
| Plan Minor | `/p4` | `q4Primary`, `q4Dentist`, `q4Specialist`, `q4Other` |
| | `/p5` | `q5Other` |
| Plan Simplified | `/p2` | `q8Other` |
| Annual Accounting | `/p9` | `restrictedDepository` (yes/no) |
| **Total** | | **40** (14 + 19 + 5 + 1 + 1) |

Guardian Inventory needed nothing: every reveal there already carried a route,
and the guard confirmed it (below). Every other checkbox and radio in the app
— the "check all that apply" siblings, the per-row schedule flags — is
unchanged and does not re-render, per the decision.

**The build, as landed.**

- `renderRadioGroupField()` and `renderCheckboxField()`
  (`src/core/form/form-fields.js`) take `route` and emit `data-form-route`
  when given one, exactly as `renderYesNoField()` already did. Given none,
  their output is byte-identical to before.
- `chkP()`, `radioP()` and `yesNoRadioAnnualHTML()` (`src/legacy-app.js`)
  take `route` as a **trailing** argument and forward it. Trailing so that
  every existing call site is untouched — `yesNoRadioAnnualHTML()`'s four
  per-row schedule flags still pass `tooltipKey` in the same position.
- Each page's local `cb(id,label)` shorthand became `cb(id,label,route='')`;
  the 40 call sites above pass their page's route.

**The guard** (`tests/e2e/conditional-reveal-routes.spec.ts`) works by
observation, not by reading templates: on every page of all six forms it
clicks every checkbox and radio that carries no `data-form-route`, forces the
render a routed control would have requested, and compares the set of bound
fields before and after. A control whose click changed that set is a reveal
gate with no route, and the failure names it by page, id and path. Pass 2
opens every *routed* checkbox gate on the page (setting the model directly,
so the test's own render is the only one running) and sweeps what that
exposed — that is how the nested `q10ExecOther`/`q11ExecOther` are covered.
Runs in the browser in one evaluate per page: roughly 300 controls across
the six forms in about 60 seconds.

Its limits, stated: pass 2 opens checkbox gates only, not radio ones, so a
reveal nested inside a "Yes" radio's block on a fresh filing would still be
missed; none exists today. And it compares *which fields exist*, so a control
that only changes a label, a hint or a completion marker is deliberately not
a reveal.

**Verification.**

- Unit: `tests/unit/form-fields.spec.js` (+2 cases: route emitted on every
  option / on the box, none when absent) and
  `tests/unit/form-fields-legacy-delegation.spec.js` (+1: all three helpers
  forward the trailing route, including through the two hops of
  `yesNoRadioAnnualHTML()` → `yesNoRadioHTML()` → `renderYesNoField()`).
  34/34 pass.
- E2E, **red first** with the seven source files stashed: 10 of 11 tests
  failed for the stated reason — the five symptom tests because the revealed
  field was absent (`element(s) not found`), five guards listing their
  offenders. The **Guardian Inventory guard passed** on the unfixed code,
  which is the false-positive check: a form where every reveal is routed
  reports nothing. Pass 2 was proven separately by stripping
  `q10ExecOther`'s route and re-running the Annual Plan guard alone: it
  named exactly that control. Green: 11/11 in 1.1 min.
- `tests/unit/test-index-guard.spec.js` passes with the new `TEST-INDEX.md`
  row; `file_index.md` lists the new spec.
- Neighbouring specs (the four plan mounts, `annual-mount`,
  `dependent-question-gate`, `plan-benefits-tristate`,
  `form-entry.contract`, `plan-readiness.contract`,
  `guardianship-selection-controls`): **85/85 passed, 7.8 min.**

**Accepted cost.** Each of the 40 controls now re-renders its page on change,
which resets scroll position and focus — the same cost Milestone 37-4
accepted for `q10Executed`/`q11Executed`, and the reason nothing else was
routed.

Landed in the commit whose subject begins `fix(milestone-67F):` —
`git log --grep="milestone-67F"` finds it.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** No change — this is rendering behavior, not stored data.
   Except: see the stranded-data question above, which concerns existing values,
   not the schema.
2. **Legacy data migration.** None for the fix itself. The Q11 stranded-data
   decision is the only migration question in the item.
3. **Fixture and factory audit.** Fixtures set values directly on the model
   rather than by clicking, so most will not exercise this path at all — which
   is precisely why the suite never caught it. New tests must **drive the real
   click**, per §6's corollary ("a UI-affordance e2e test must drive the real
   click, never call the underlying function directly — that's the only way
   this bug class gets caught").
4. **Test coverage and index.** One e2e per symptom, each asserting the revealed
   field is present **without navigating away**; a Q11 test asserting the typed
   name lands in `q11NoRemunerationName`; and the guard test above.
   `TEST-INDEX.md` rows in the same commit (§7). Red-first is required and is
   straightforward here — all four symptoms reproduce today.
5. **Export/import/portability.** None directly. But note the Q11 bug means
   some saved filings hold a name in the wrong field, so any export reading
   `q11NoRemunerationName` has been emitting a blank where the filer typed a
   name.
6. **Security and sensitivity.** None.
7. **UI/UX consistency.** Option 1 makes these three helpers behave like the
   three that already work correctly, which is the consistency argument for it.
8. **Legal/compliance framing.** None resolved here. Worth noting the filed
   consequence: a filer who believed they declared no remuneration may have
   filed a plan where that declaration is blank.
9. **Cross-form method consistency.** This item *is* the cross-form fix — it
   spans Annual Accounting, the Initial Plan and the Annual Plan, and unblocks
   67B. Check the Simplified and Minor Plans for the same pattern before
   building; they use the same helpers and were not audited for this document.

---

## Discovery notes — found while verifying the above, not proposed for work

Recorded because §8.9 makes finding these a reporting obligation, not a licence
to fix them. No change is proposed for either.

**D-1. The attorney block on the same pages is also unconditionally required.**
`src/features/guardian-inventory/index.js:1293` requires Attorney Name, Bar
Number, Phone, Street, City/State/Zip, Filing Date and a signature with no
gating whatever; Annual does the same at `index.js:1587+`. AGENTS.md §4 states:
*"never make attorney-certification fields mandatory blockers on an unrepresented
filing — skip attorney validation entirely if no attorney is entered."*
`isPlanInitialAttorneyStarted()` implements that rule, but **only for the Initial
Plan**. Whether the same protection should extend to Inventory and Annual is a
genuine legal question and not obviously the same answer — Fla. Prob. R. 5.030
generally requires counsel for a guardian of the property, with exceptions,
whereas the Plan Initial exemption exists for Ch. 393 Guardian Advocates. **This
needs a qualified answer before anyone treats it as a bug.** Flagged, not
resolved.

**D-2. Annual's `preparer.ssn` is classified `government-id` but marked
`optional` in the CSV (row 117) while the validator requires it**
(`index.js:1579`). Same three-way disagreement as 67B's table. Worth folding
into whichever option is chosen for 67A.

---

## Findings carried by other items, and by Milestone 68

**Nothing from observations 1-5 is unscoped.** This section previously listed
deferred work; it no longer does. The four-state bond/depository model, once
listed here, is now part of 67B (extended 2026-09-23 on the requester's
instruction, and extended again to cover the Inventory). Observations 6-10 are
Milestone 68's and are written up there.

What follows is the evidence behind findings now owned by 67F and by Milestone
68, kept here because it was gathered during this milestone's verification and
is cited by those items.

- **Annual's "Date of Most Recent Receipt" never appears when you answer the
  question that asks for it.** Answering *"Restricted depository? → Yes"* writes
  the value but does not reveal the date input; it materializes only after
  navigating to another page and back. Verified mechanism, not inference:
  the input is behind a ternary re-evaluated only on a full page render
  (`annual-accounting/index.js:1407`); the radio is emitted by
  `yesNoRadioAnnualHTML()`, whose signature is
  `(id,label,val,path,req,tooltipKey)` and which hardcodes `route=''` when
  delegating (`legacy-app.js:5946-5948`) — so **no `data-form-route` attribute is
  ever produced** (`form-fields.js:322`), and the only re-render trigger is
  `if (control.dataset.formRoute) window.renderPage(...)`
  (`form-events.js:117-119`). Annual's own change listener handles solely
  `filingType`, `schedule-no-items` and `import-excel`
  (`annual-accounting/index.js:270-280`), so it does not re-render either.
  Guardian Inventory's equivalent controls do not have this problem because they
  call `yesNoRadioHTML()` directly and pass a real route — `'/d3'` for the safe
  deposit box (`guardian-inventory/index.js:1135`), `'/d4'` for the bond waiver
  (`:1166`). The root cause is that `yesNoRadioAnnualHTML()` has no route
  parameter to pass, so this is unfixable at the call site alone. Of its five
  call sites, only `restrictedDepository` (`:1406`) gates a conditional reveal;
  the other four are per-row schedule flags whose repaint is already handled by
  `refreshAnnualTotals()`, so they are unaffected.
  **This is the same defect class as the Initial Plan's Q4/Q2/Q5 explanation
  boxes** (there via `radioP()`/`renderRadioGroupField()`, which likewise emits
  no route) — a shared "conditional reveal behind a radio that cannot request a
  re-render" bug, worth fixing once at the renderer level rather than four times
  at call sites.
- PDF cover page truncates the period-end date (value column allowed ~148pt of
  wrap against ~119pt of real space before column 2's background is painted over
  it).
- All three Plan types' Cover page says "accounting period" where it should say
  Plan period.
- Initial Plan: Q4/Q2/Q5 explanation boxes appear only after navigating away and
  back; Q5 is single-select where multiple answers can apply; Q10c has no
  "None"; no certificate of service on any Plan type; the reporting period is
  never validated.
- Annual Plan: Q6 has no plain "No" option.
- **Annual Plan Q11: the guardian's name you type is written into the wrong
  field, so the "declaring guardian's name is required" flag never clears.**
  Same root cause as the two entries above, and the most damaging instance
  because it silently misfiles data instead of merely hiding a control.
  Reproduced at runtime, end to end, in a browser:
  1. The filer arrives at page 11 with nothing declared. On screen:
     *"Declaring guardian's name"* → `q11ReceivedName`.
  2. They tick *"I have received NO remuneration…"*. The model flips to `true`,
     **and the screen does not change** — `chkP()` emits no `data-form-route`
     (`legacy-app.js:5883-5885`, `form-fields.js:378-389`), so nothing
     re-renders and the *unchecked* branch stays on screen.
  3. They type their name into the only "Declaring guardian's name" box
     visible. It lands in `q11ReceivedName`. The field the validator actually
     reads, `q11NoRemunerationName`, is still empty — both branches label their
     name field identically (`plan-annual/index.js:568-572`), so there is no
     visible cue anything is wrong.
  4. At Preview & Export the panel reads *"1 required field still missing …
     11. Remuneration … declaring guardian's name"*, and the readiness card
     shows *"⚠ Outstanding: Question 11 — remuneration declared"* — with a
     name plainly filled in on the page they just left.
  There is no way for the filer to resolve this from the UI: re-typing the name
  puts it in the same wrong field every time. It clears only if they navigate
  away and back first, which nothing tells them to do.
- Annual and Simplified Plans require the signature date to fall on or after the
  *end* of the period being planned for — a rule copied from the retrospective
  accounting forms onto forward-looking ones, impossible to satisfy honestly
  (`plan-annual/index.js:763-769`, `plan-simplified/index.js:393-404`).

---

# Appendix A — Runtime verification record (Excel)

Raw evidence behind items 67C, 67D and 67E. An Annual .xlsx was produced from
the running app (populated Schedule A, B-4 with two accounts, D-1, D-3) and
inspected with `xml.etree.ElementTree` against the decoded template — direct
parse, not source reading (AGENTS.md §10 P2). It was then opened in Microsoft
Excel, repaired, saved, and re-parsed. **The earlier "already fixed" verdict was
half right.**

**Genuinely fixed.** Defined-name stripping is repaired: `Name_of_Ward`,
`Case_Number`, `Filing_Type`, `From_Date`, `To_Date`, `Guardian`, `Attorney` all
survive and resolve; zero `#NAME?`/`#REF!`/`#VALUE!` in the file; all 1,228
formulas present; B-4's category chains correctly rewritten after page pruning.

**Still broken — three defects, each now written up as its own item.** The
argument and the proposed fixes live there; only the raw observations are
recorded here.

| Observed in the generated file | Item |
| --- | --- |
| `PART IX ` E21/G21 hold `<f>From_Date</f>` / `<f>To_Date</f>` in the template; both empty with no formula in the export | **67D** |
| `yesORno` = `'[1]DropDownData'!$A$6:$A$8` survives while `<externalReferences>` and all `xl/externalLinks/*` parts are absent | **67C** |
| `PART I` E18/H18/F5 and `SCH B-4 OTHER DISB p2` D20/D21 are `t="s"` shared strings holding ISO text, in cells formatted `mm/dd/yy;@` and `m/d/yyyy`; the court's own example at D16 is the serial `42279` | **67E** |

### Excel's repair log, verbatim

Generated from current `master`, opened in Microsoft Excel 2026-09-23. Excel
showed *"We found a problem with some content in 'annual-runtime.xlsx'…"*;
`%TEMP%\error334240_01.xml` recorded:

```xml
<recoveryLog>
  <summary>Errors were detected in file 'annual-runtime.xlsx'</summary>
  <removedRecords>
    <removedRecord>Removed Records: Named range from /xl/workbook.xml part (Workbook)</removedRecord>
  </removedRecords>
</recoveryLog>
```

One record removed. No formulas, sheets or data. This is primary evidence from
Excel itself, not an inference from file structure.

### What depends on the name (parsed from all three templates)

| Template | `yesORno` target | Sheets referencing it |
| --- | --- | --- |
| annual | `[1]DropDownData!$A$6:$A$8` — **external** | **0** |
| guardian | `DropDownData!$A$6:$A$8` — internal | 1 (`sheet20`, a dropdown) |
| simplified | not defined | — |

### The blank-totals mechanism — the formula chain is provably healthy

The tester's own hypothesis ("5a could be the cause of the issues listed below")
holds up. After letting Excel repair the generated file and re-parsing it, every
total computes — so nothing is wrong with the formulas themselves, and the four
blank-value symptoms have no separate cause of their own:

| Cell | Formula | Value after repair |
| --- | --- | --- |
| `SCH A INCOME p1` H41 | `SUM(H21:H40)` | **2012.84** (= 1200 + 800.5 + 12.34) |
| `PART VI, VII ` I11 | `'SCH A INCOME p1'!H42` | **2012.84** |
| `PART VI, VII ` I20 | `I8+I11+I17+I19` | **11862.84** |
| `PART VI, VII ` I30 | `SUM(H25:H29)` | **26000** |
| `SCH B-4 OTHER DISB SUMMARY p1` I28 | `SUM(I10:I27)` | **150** |
| `PART IX ` H12 | `'SCH D-1 CASH p1'!J59` | **9000** |
| `PART IX ` H17 | `SUM(G14:G16)` | **17000** |

Every total, the summary page, the B-4 summary and the bond calculation compute
correctly once the orphaned name is gone — Excel wrote a `calcChain.xml` and
recalculated the whole workbook. **So symptoms (b), (c), (d), (e) and (f) are
not separate defects at all. They are downstream of E-2**, and removing the
orphaned `yesORno` name fixes all of them at once.

**A superseded theory, recorded so it is not revived.** An earlier pass
explained the blank totals as stale cached zeros that nothing told Excel to
recalculate. That was wrong. The template ships the same cached zeros and the
same absent `calcChain.xml` (verified in both), and Excel recalculates on open
regardless — as the table above demonstrates. The cached zeros are a red
herring; the orphaned named range is the whole cause.

**E-1 is confirmed genuinely separate.** After repair and full recalculation,
`PART IX ` E21/G21 are *still* empty with no formula — they survive the repair
because the app destroyed them before Excel ever saw the file. Fixing E-2 will
not fix the blank Bond Period.

---

# Appendix B — Correction log: two "already fixed" verdicts that were wrong

**2026-09-23.** A triage of the tester's report classified several observations
as already fixed. Two of those verdicts have since been disproved, both by the
same reasoning error, and both are recorded here rather than silently amended.

**C-1. Annual's restricted-depository receipt-date field.** Recorded as "already
exists and works correctly," on the strength of a source read confirming the
input is present at `annual-accounting/index.js:1407`. Wrong. The field exists
and is unreachable: it sits behind a conditional that nothing re-evaluates when
the controlling answer changes.

**C-2. Annual Plan Q11's guardian-name flag.** Recorded as "already fixed — the
UI path and the validator path match." The paths do match; that was true and
irrelevant. The visible input belongs to the *other* branch of the conditional,
so the filer types a real name into a real field and the validator correctly
reports a different field as empty. Disproved by driving a browser through the
tester's exact sequence.

**The shared error.** Both verdicts came from reading a render function without
tracing the event that re-runs it. Confirming a field exists in source answers a
different question from whether a filer can reach it, and confirming two code
paths agree answers a different question from whether the filer is looking at
the field those paths name. In a codebase where conditional reveals are
re-evaluated only on a full page render, **no claim about a conditionally
rendered control should be made from source alone** — drive it in a browser.

**The shared cause.** Three separate symptoms in this report (C-1, C-2, and the
Initial Plan's Q4/Q2/Q5 explanation boxes) are one defect: a control that gates
a conditional reveal but cannot request a re-render, because the helper that
renders it has no route parameter to pass — `chkP()` (`legacy-app.js:5883`),
`radioP()` (`:5953`) and `yesNoRadioAnnualHTML()` (`:5946`) all delegate without
one. The helpers that *do* accept a route (`yesNoRadioHTML()`,
`yesNoCheckboxS()`, `yesNoCheckboxD()`) are used correctly wherever a reveal
depends on them. This is worth fixing once, at the renderer level, rather than
symptom by symptom — and a guard test should assert that any control gating a
conditional reveal carries a route.
