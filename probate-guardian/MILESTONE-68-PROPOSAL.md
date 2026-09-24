# Milestone 68: The Plans — Questions You Cannot Answer Truthfully

## Status

**Draft. This document authorizes no change.** Each item is proposed, not
approved. Nothing here may be implemented without the requester's explicit,
named approval of that specific item (AGENTS.md §3). Approving one item
authorizes only that item.

Listed worst first. The first four put something wrong on a filed court document
or stop a filing outright; the rest prevent a filer from recording the truth.

| Item | Subject | Severity | Decision | Build |
| --- | --- | --- | --- | --- |
| 68D | Period end date cut off on every Annual cover page | Wrong data on a filed document | **DECIDED** — fix the wrap width, derived from the layout | **LANDED 2026-09-24** — see the build record under 68D; Plan Initial rendered |
| 68A | Plan signatures must be dated after the period being planned for | **Blocks filing**; only remedy is a false sworn date | **DECIDED** — remove the rule from Plans; keep it on accountings | **LANDED 2026-09-24** — audit found 8 sites on three Plans (Minor had it too; Initial never did); see the build record under 68A |
| 68B | Initial Plan files with no reporting period, unflagged | Incomplete document filed, silently | **DECIDED** — require it, as the other Plans do | **LANDED 2026-09-24** — see the build record under 68B |
| 68C | No certificate of service on any Plan type | App states a requirement it cannot meet | **DECIDED** — build on all four; optional on Simplified; fix its wrong text; date + method optional and "Certified by the filer" settled at build (2026-09-24) | **LANDED 2026-09-24** — see the build record under 68C |
| 68E | Initial Plan Q5 accepts one answer where several apply | Cannot record the truth | **DECIDED** — the court's form is a checkbox list; convert to multi-select — Q5, Q4 and any other radio-rendered checkbox list the form shows (settled 2026-09-24) | **LANDED 2026-09-24** — Q2, Q4 and Q5 (the form's page 2, rendered and looked at); see the build record under 68E |
| 68F | Assistive-devices "None" can be ticked alongside real selections | A filed plan can state both | **DECIDED** — no "None" added (form has none); fix mutual exclusion on D and E | **LANDED 2026-09-24** — see the build record under 68F |
| 68G | Annual Plan Q6 cannot state a right is **not** restorable | **Statutory** — §744.3675(3)(b) requires that statement | **DECIDED** — the form's four columns: Yes / No / Not Removed / Needs to be Restored; stored values unchanged, "No" added (settled 2026-09-24) | **LANDED 2026-09-24** — see the build record under 68G |
| 68I | Initial Plan asks for two dates that look redundant | Real distinction, unexplained | **DECIDED** — keep both, explain them; the tester's premise holds only for original guardians | Ready to build |
| 68H | All three Plans call their period an "accounting period" | Wrong against the statute | **DECIDED** — "reporting period" for Plans | Ready to build |

### Provenance and scope

Same 2026-09-23 user test that produced Milestone 67. That milestone took the
Inventory and Accounting findings plus the Excel export; **this one takes the
Plan findings and the PDF cover page** — everything from that report not already
owned by 67.

Two of the tester's observations are **not** items here because 67 already owns
them: the Initial Plan's Q2/Q4/Q5 explanation boxes and the Annual Plan's Q11
wrong-box bug are both instances of 67F.

One is not an item because it is not a defect — see "Closed without change".

### How these were verified

Every finding below was confirmed against the current tree. Where a claim
concerns what a filer can *see or do* rather than what the source says, it was
confirmed by driving the app in a browser. That distinction is not pedantry:
during Milestone 67 two findings were classified from source reading and both
were wrong — a field that existed in source was unreachable at runtime, and a
validator whose field paths "matched" was reading a box the filer could never
fill. Each item below states which kind of evidence backs it.

---

## 68D — The period end date is cut off on every Annual filing's cover page

### What a filer observes

The filed PDF's cover page prints the accounting period as:

> From: 01/01/2026   To: 12/31/202

The last digit of the year is missing. A court document states a period that
ends in an incomplete year. This happens on **every** Annual, Final and Trust
Accounting filing — it is not triggered by unusual data.

### Evidence — seen in a rendered page, not inferred

A PDF was generated from the running app and page 1 rasterised at 6× with
pdfjs. The image is at
`…/scratchpad/pdfs/annual-row.png` and shows the truncation directly: the grey
background of the adjacent "Guardian" cell is painted over the final `6`.

**The text-layer check alone would have passed.** The full string *is* present
in the PDF's text content — it is visually covered, not absent. Any test that
only extracts text would report this defect as fixed. That is the trap here, and
it is why this was verified visually.

Measured from the generated file:

| Filing | Run | Right edge | Column 2 starts | Overrun |
| --- | --- | --- | --- | --- |
| Annual | `To: 12/31/2026` | 310.53 | 306 | **+4.53pt** |
| Annual, long attorney name | `Bartholomew Fitzgerald-Cunningham,` | 321.22 | 306 | **+15.22pt** |

4.53pt is about one digit at 8pt — hence exactly one character lost.

**The underlying fault is wider than the date.** Column 1's value text starts at
x=187 and column 2 begins at x=306, leaving **119pt** of real space — but the
renderer wraps at `KV_VALUE_MAX_W = 148` (`src/core/pdf/pdf-engine.js:976`,
used at :1005-1006). **Any column-1 value between 119pt and 148pt is silently
painted over**, because column 2's opaque background rectangle is drawn *after*
column 1's text in the same loop (:1053 then :1061). The period row is simply the
value every Annual filing happens to land in that window. A 46-character ward
name and a 39-character attorney name were confirmed truncated the same way.

### By filing type (verified visually unless noted)

| Filing | Status |
| --- | --- |
| Annual / Final / Trust Accounting | **Broken** — one character lost on every filing |
| Simplified Accounting | Not clipped. Its period lands in column 2, which overruns the table border by 2.31pt into the margin but has nothing painted after it — cosmetic |
| Plan Annual, Plan Minor | Fine, 7–28pt clearance |
| Plan Initial | Safe at 111.58pt — **inferred from the shared string, not rendered** |

### Decision — SETTLED 2026-09-23: Option 1

**Fix the geometry.** The wrap width becomes the space that actually exists
before column 2, **derived from the column geometry rather than hardcoded**, so
it cannot drift out of step with the layout again — which is how the 29pt blind
spot arose in the first place.

This fixes the whole class, not just the date: long ward names and attorney
names wrap to a second line instead of being painted over.

**The test must not be a text-extraction assertion.** The truncated text is
present in the PDF's text layer — it is covered, not missing — so a text check
passes while the defect is live. Assert rendered geometry (the drawn run's right
edge stays inside its column) or rasterise and compare. Cover a long ward name
and a long attorney name alongside the period.

**Simplified Accounting's margin overrun is covered by this fix, not a separate
decision.** Its period sits in *column 2* and overruns the table's right border
by 2.31pt into the page margin. Nothing is painted after it, so the text stays
legible — cosmetic, unlike column 1's truncation. It has the same cause: a wrap
width that does not match the space actually available. Deriving both columns'
wrap widths from the real geometry resolves it in the same change. **Assert it:**
column 2's drawn runs must stay inside the table border, or this one silently
survives a fix aimed at column 1.

**Completion gate — Plan Initial must be rendered, not inferred.** Its safety
margin (111.58pt against 119pt available) is **inferred from the shared string's
metrics, not observed in a rendered page**, and 7.4pt is thin enough that a
longer county name or a different font fallback crosses it. **This item is not
done until Plan Initial has been rasterised and looked at**, the same way the
other four were. It is a gate, not a note: the fix does not change either way,
but the item must not claim a filing type is safe on inference when every other
claim in it was made visually.

**The measurable assertion, both columns.** "Stays inside the column" needs a
number to be testable:

| Column | Drawn run's right edge must be ≤ | Which is |
| --- | --- | --- |
| 1 | `margin + contentWidth/2` = **306pt** | where column 2's background begins |
| 2 | the table's right border | today Simplified's period exceeds it by 2.31pt |

Assert against the **drawn run's measured width** taken from the generated file,
not against a wrap constant — the constant is the thing that was wrong.

**Superseded options, for the record:**

**Option 1 — Fix the geometry: wrap at the real boundary (RECOMMENDED — CHOSEN).** Set
the wrap width to the space that actually exists before column 2, rather than
148pt. *Filer sees:* the full date, and long names wrap to a second line instead
of vanishing. *Cost:* one constant, derived from the column geometry rather than
hardcoded so it cannot drift again. Fixes the whole class, not just the date.

**Option 2 — Draw column 2's background before column 1's text.** Reordering the
two draws stops the overpaint. *Filer sees:* the text is no longer covered — but
it now overruns *into* column 2 and collides with its label, which is worse to
read. Not recommended alone; it treats the symptom.

**Option 3 — Shorten the period string.** Print `01/01/2026 – 12/31/2026`
instead of `From: … To: …`, bringing it under 119pt. *Filer sees:* the full
date. *Cost:* trivial. *Downside:* leaves the 29pt blind spot in place for every
other value — the long-name truncation stays broken, silently.

### Cross-cutting checklist (§8)

1. **Data model.** No change.
2. **Legacy data migration.** None.
3. **Fixture and factory audit.** None — no new fields.
4. **Test coverage and index.** **A text-extraction assertion is insufficient
   and will give a false pass.** The regression test must check rendered
   geometry — that the drawn run's right edge stays inside the column — or
   rasterise and compare. Cover a long ward name and a long attorney name as
   well as the period, since they share the fault.
5. **Export/import/portability.** PDF only; Excel is unaffected.
6. **Security and sensitivity.** None.
7. **UI/UX consistency.** The shared key-value grid serves every filing type's
   cover page, so one fix covers all of them — and all of them need re-checking.
8. **Legal/compliance framing.** A filed court document currently misstates the
   accounting period's end date. Worth flagging to the requester as a filing
   defect on documents already submitted, not only a bug to fix going forward.
9. **Cross-form method consistency.** Simplified's overrun into the page margin
   is a second, milder instance of the same geometry being wrong. Fix or
   consciously accept it in the same pass rather than leaving one behind.

### Build record — LANDED 2026-09-24

**What a filer now gets.** The Annual, Final and Trust Accounting cover
prints its period as "From: 01/01/2026   To:" on one line and "12/31/2026"
on the next — the whole year, nothing painted over. A long ward name or
attorney name wraps to two or three lines inside its cell. The Simplified
Accounting's period and attorney, in column 2, stay inside the table border.
The Plans, which were never clipped, render exactly as before.

**The change.** One place: the key-value grid in
`src/core/pdf/pdf-engine.js`. The value wrap width is now derived from the
column geometry — `contentWidth / 2 − KV_VALUE_X (115) − KV_VALUE_PAD (4)` =
**115pt** at the 468pt content width — instead of the hardcoded 148, and a
value that spans the row (no second item) gets `contentWidth − 115 − 4` =
349pt (was 343). Both places the value text is drawn use the same
`KV_VALUE_X`, so the wrap width and the drawing position cannot drift apart
again. No pdf-model changed; the period strings are untouched and simply
wrap.

**The test, and why it is not a text assertion.**
`tests/e2e/pdf-cover-geometry.spec.ts` (new), one test per cover-page filing
(Annual Accounting, Simplified Accounting, Initial / Annual / Minor Plan),
with a 57-character ward name, a 39-character attorney name and a 2026
period. It reads every drawn run's position **and width** from the generated
file (`width` added to `extractPdfTextRuns()` in
`tests/e2e/support/pdf-extract.ts`; `check:types` clean) and asserts each
grid value's right edge against the boundary the engine lays out: **306pt**
(where column 2's background begins) for a paired column-1 value, **540pt**
(the table border) for a column-2 or full-width value — both computed from
the margins and content width, never from the wrap constant. The reported
case is asserted by name, then the two names, then every grid value on the
page, all soft so one run lists every overrun.

**Red first, against the 148pt constant** — the numbers match this item's
own measurements to the hundredth, and add two cases it did not list:

| Filing | Run | Right edge | Limit |
| --- | --- | --- | --- |
| Annual | `To: 12/31/2026` | 310.53 | 306 |
| Annual | `Bartholomew Fitzgerald-Cunningham,` (attorney) | 321.22 | 306 |
| Annual | `Bartholomew Fitzgerald-Cunningham` (ward name, first line) | 319.00 | 306 — **not listed above** |
| Simplified | `From: 01/01/2026  To: 12/31/2026` (column 2) | 542.31 | 540 |
| Simplified | ward name, first line | 319.00 | 306 |
| Simplified | attorney (column 2) | 555.22 | 540 — **not listed above**: 15pt into the margin |

The three Plans passed before and after; Plan Initial's period
(`01/01/2026 through 12/31/2026`, 111.6pt) fits the 115pt width on one line.
Green: **5/5, 52.7 s.**

**Completion gate met — Plan Initial rendered, not inferred.** All five
covers were rasterised at 6× from the PDFs the green run generated, and the
Annual, Simplified and Plan Initial pages were looked at: the full end year
is visible, the names wrap, nothing is painted over, and Plan Initial's
period sits on one line with clearance to its column edge.

**Neighbours:** the 16 PDF, cover-page and mount specs that read generated
PDFs or snapshot the plan pages (`annual-bond-period`, `pdf-form-specific`,
`pdf-table-semantics`, `pdf-preview-viewer`,
`pdf-accessibility-and-signatures`, `supplemental-pdf-accounting`,
`pdf-evidence-lab`, `pdf-fonts-and-xmp`, the four `plan-*-mount`,
`simplified-mount`, `annual-mount`, `guardian-inventory-mount`,
`plan-readiness.contract`) — **126 passed, 1 failed, 14.0 min.** The one
failure was `annual-bond-period.spec.ts`'s own reader: it assumed the Bond
Period value sat on one line and took the first `To:` run, which is now
`"To:"` alone because the value wraps like the cover's (`Received: "From:
03/01/2026 To:"`). The reader now parses both dates out of the runs that
follow the label; the PDF itself was right. Re-run green: 3/3, 48.2 s.
Unit suite 124 files / 1,769 green; `check:types` clean.

**Discovery (§8.9), reported not fixed.** The page header — the bold "IN
RE: THE GUARDIANSHIP OF <ward name>" line every filing prints above its
title — is not wrapped: with the 57-character test name its run ends at
**x = 614.1 on a 612pt page**, past the physical page edge, on every filing
type. A real name of roughly 45 characters or more would be clipped by the
printer. It is a different code path from the grid (the caption block, not
the key-value rows) and is not part of this item; it needs its own scoping
if the requester wants it.

**§8.8, restated for the requester.** Every Annual, Final and Trust
Accounting PDF generated before this change states a period ending in an
incomplete year. That is a defect on documents already filed, not only a bug
now fixed.

---

## 68A — A plan cannot be signed honestly: the app demands a signature dated after a year that hasn't happened

### What a filer observes

A guardian files an Annual Guardianship Plan for the coming year — say
01/01/2027 to 12/31/2027 — and signs it today. The app refuses to export:

> Signatures — Guardian date signed must be on or after Reporting Period To
> Signatures — Attorney date signed must be on or after Reporting Period To

**Save as PDF is disabled.** Not a warning — a hard block, with no override and
no bypass. The Signatures section shows as incomplete.

The only way to satisfy it is to enter a signature date **after the end of a
period that has not happened yet.** The page above those signatures reads
*"Under penalties of perjury, I declare that I have read and examined the
foregoing plan, and the facts alleged are true."* So the app's only remedy is to
write a false date on a sworn filing.

The Simplified Plan is worse: **three** such errors — Guardian, Preparer and
Attorney — so a filer with both a preparer and an attorney must post-date three
signatures.

This is the rule the accountings need and the plans must not have. An accounting
reports on a period that has finished, so requiring the signature to come after
the period end is correct there. A plan is written **before** the period it
plans for. The rule was carried across unchanged.

### Evidence (confirmed at runtime in a browser, then against source)

Messages above are verbatim from the running app; `Save as PDF` was observed
`disabled`, and moving both dates past 12/31/2027 cleared every error and
enabled export. Signing exactly on 12/31/2027 also passes (`allowSameDay: true`).

Source, `src/features/plan-annual/index.js:763-770` — two call sites:

```js
errs.push(...checkDateOrder(d.periodTo, g0.signatureDate, {
  sectionLabel:'Signatures', earlierLabel:'Reporting Period To',
  laterLabel:'Guardian date signed', allowSameDay:true, ...
}));
```

`src/features/plan-simplified/index.js:393-405` — three call sites of the same
shape (Guardian 1, Preparer, Attorney).

`checkDateOrder(earlier, later, …)` raises when `later < earlier`, so each of
these requires `signatureDate >= periodTo`. The Annual **Accounting** uses the
identical helper at `annual-accounting/index.js:1563` — where it is correct.

**Five call sites across two files, each hardcoding `d.periodTo` inline.** There
is no shared plan-signature rule to fix in one place; the same defective pattern
was instantiated separately.

### Not verified here: the Initial Plan and Plan Minor

Only the Annual and Simplified Plans were driven. Both other Plan types should
be checked for the same pattern before building (§8.9) — the fix should not land
on two forms and leave a third.

### Decision — SETTLED 2026-09-23: Option 1

**Remove the rule from the Plans entirely.** All five call sites — two in
`plan-annual/index.js:763-770`, three in `plan-simplified/index.js:393-405`.

A plan is written before the period it plans for, so there is no defensible
ordering between its signature date and that period. Guardians sign with today's
date and file.

**What remains in force:** the existing signature-state checks still catch a
missing or malformed signature date, so removing this rule does not make an
unsigned plan exportable. And the identical `checkDateOrder(d.periodTo, …)` rule
on the **accountings** is correct and stays — there you sign after the period you
are reporting on.

**Blocking precondition — audit Plan Initial and Plan Minor first.** Only the
Annual and Simplified Plans were driven at runtime. The decision covers *the
Plans* as a class, so it authorizes the fix on all four — but **the other two
have not been checked for this pattern**, and shipping a fix to two forms while
leaving an identical defect on a third is exactly the split §8.9 exists to
prevent. Grep both for `checkDateOrder(d.periodTo` and drive each to confirm.

This is a build-time step, not an open decision: whatever the audit finds, the
chosen remedy does not change. It is listed as a precondition so the item is not
started as though its scope were already known.

**Superseded options, for the record:**

**Option 1 — Remove the rule from the Plans entirely (RECOMMENDED — CHOSEN).** A plan's
signature date has no defensible ordering relationship to the period it plans
for. *Filer sees:* they sign with today's date and file. *Cost:* five call sites
deleted. *What is lost:* nothing the court requires — and note the app would
still catch a signature date that is absent or malformed through the existing
signature-state checks.

**Option 2 — Invert it: require the signature on or *before* the period
starts.** Arguably what a prospective filing means. *Filer sees:* a plan signed
mid-period is now rejected. *Downside:* plans are routinely filed late, and a
guardian filing an overdue plan in March for a period beginning in January would
be blocked with no honest remedy — the same trap, pointed the other way. Not
recommended without the Clerk confirming plans must be signed before the period
opens.

**Option 3 — Downgrade to a warning.** Keep the check, stop blocking. *Filer
sees:* an advisory they can file past. *Downside:* the advisory would still be
wrong; warning someone about a correct date trains them to ignore warnings.

### Cross-cutting checklist (§8)

1. **Data model.** No change.
2. **Legacy data migration.** None. Filings currently blocked become exportable;
   filings with a post-dated signature entered *to get past this rule* keep that
   date, and nothing can identify or correct them — worth stating, since those
   dates are on filed documents.
3. **Fixture and factory audit.** Plan fixtures set signature dates after the
   period end to satisfy this rule (the Annual Plan fixture's guardian signs
   `01/05/2027` for a 2026 period). They will keep passing, but they encode the
   wrong behavior; update them to realistic dates so the suite stops asserting
   the defect is normal.
4. **Test coverage and index.** Red-first: a plan signed before its period end
   must export. Cover both forms and all five signer roles.
5. **Export/import/portability.** None.
6. **Security and sensitivity.** None.
7. **UI/UX consistency.** Removing a rule; no new pattern.
8. **Legal/compliance framing — not a blocker for the chosen option, and here
   is why.** An earlier revision said the Clerk's answer was needed "before
   choosing between Options 1 and 2." That contradicted the decision recorded
   above and is withdrawn.

   The distinction: **Option 2 (invert the rule) would have needed an authority
   basis, because it imposes a new constraint on filers.** Option 1 imposes
   nothing — it removes a rule that cannot be satisfied honestly. Removing a
   requirement the court never asked for needs no authority; adding one does.
   So the decision stands on its own.

   What remains genuinely open, and is **not** blocking: whether the court
   constrains a plan's signature date in some *other* way the app should
   eventually implement. Chapter 744 and the Probate Rules are now in the
   repository, so that is answerable by reading rather than by asking — worth
   doing before anyone proposes a replacement rule, not before removing this one.
9. **Cross-form method consistency.** The accountings' use of the same helper is
   correct and must not be changed. Check Initial Plan and Plan Minor, as above.

### Build record — LANDED 2026-09-24

**The audit the decision required, and what it found.** The item counted
five call sites on two Plans and had not checked the other two. Grepping
every Plan validator for `checkDateOrder(d.periodTo` and driving each form:

| Plan | Call sites | Signers |
| --- | --- | --- |
| Annual Plan | 2 (`plan-annual/index.js:763-770`) | guardian, attorney |
| Simplified Plan | 3 (`plan-simplified/index.js:393-404`) | guardian 1, preparer, attorney |
| **Minor Plan — not in the item** | **3** (`plan-minor/index.js:498-501, 529-536`) | guardian, preparer, attorney |
| Initial Plan | **0** | — its only `checkDateOrder` calls order the period itself |

So the fix landed on three Plans (eight sites), not two (five), and the
Initial Plan's freedom from the rule is now observed at runtime by the new
spec rather than assumed. The accountings' identical rule
(`annual-accounting/index.js:1587, 1613, 1639, 1645`;
`simplified-accounting/index.js:746, 759, 775`) is untouched.

**A second copy of the rule, in the sidebar.** Milestone 55B had mirrored
every one of those eight checks into `computeNavChecks()` so the sidebar
would agree with the export gate: `ps-p3` (three `datesOrdered()` terms),
`pa-p11` (two), `pm-p6` (one), `pm-p7` (two). Removing the validator's rule
alone would have left the sidebar marking Signatures incomplete for a
filing export now accepts — the exact disagreement 55B existed to prevent,
inverted. All eight terms are removed with the rule; the keys keep their
presence checks. `readiness-config.js` never mirrored it (checked), so the
readiness↔export invariant (AGENTS.md §4) holds without change.

**What a filer now gets.** A guardian who signs a plan for the coming year
with today's date files it: no "date signed must be on or after Reporting
Period To" on any Plan, Save as PDF enabled, Signatures marked complete. A
missing or malformed signature date is still caught by
`checkSignatureState()`, so an unsigned plan is no more exportable than
before.

**Fixtures (§8.3).** The Plan fixtures signed on 01/05/2027, 01/11/2027 and
01/12/2027 for 2026 periods — dates that existed only to satisfy this
rule. They now sign at the start of the plan year (2026-01-05 / -11 / -12),
and the three byte-exact page snapshots that carried the old dates
(`plan-annual-mount`, `plan-minor-mount`, `plan-simplified-mount`) are
updated with them. The Initial Plan fixture already signed in 2026.
`checklist-export-parity.spec.js`'s known-gap list grows back by the four
field names 55B's date checks had made visible to its static scan
(`attorney_signatureDate` on Annual Plan; both date fields on Simplified;
`preparer_signatureDate` on Minor) — the pre-55B gaps again, not a new
drift, and the reason is recorded in that list.

**Tests.** `tests/e2e/plan-signature-date.spec.ts` (new): every signer on
all four Plans dated before the period even starts, then the validator, the
sidebar key(s) and the real Save as PDF button — plus an Annual Accounting
control that must still block. `navigation-status.contract.spec.ts`'s four
55B Plan cases (Annual ×2, Simplified, Minor) and
`date-validation.contract.spec.ts`'s three Plan signer-date cases are
rescoped to assert the sidebar and gate agree there is no such rule; their
period-order and GID cases are untouched. **Red first, 6 failed / 2 passed**
against the unchanged source: the three Plans that carried the rule failed
in both specs; the Initial Plan and the accounting control passed
throughout. Green: the 12-spec neighbour set (the new spec,
`navigation-status.contract`, `date-validation.contract`, the four
`plan-*-mount` snapshots, `plan-readiness.contract`,
`readiness-card.contract`, `pdf-form-specific`, `plan-pdf-wcag-compliance`,
`signature-capture.contract`) ran **229 of 233, 22.2 min** with exactly the
four field-path cases above failing — they asserted the rule by field path,
which the first search for its message text missed — and **25/25, 2.1 min**
once rescoped. Unit: **124 files / 1,769 green** after
`checklist-export-parity` and `readiness-predicate-coverage` were re-listed
(the latter's assertion is what proved Plan Simplified's two signer-date
issues are no longer emitted at all); `check:types` clean.

**User guide.** The Milestone 55B sentence that a section can be incomplete
because "a signature dated before the period it covers" is out of order now
says an *accounting* signed before the period it reports on, and adds that a
plan's signature dates are not ordered against its period.

**§8.2, restated for the requester.** Filings already exported carry the
post-dated signatures their filers entered to get past this rule. Nothing
in the app can identify or correct them; those dates are on filed
documents.

---

## 68B — An Initial Plan can be filed with no reporting period, and nothing says so

### What a filer observes

The Initial Plan's Cover page asks for "For the Period From / Through". The
labels carry **no required marker**. Leave them blank and:

- the banner reads **"Ready to export"**
- the validation panel does not appear at all
- the readiness card reads **"Automated checks passed"** with nothing outstanding
- the sidebar Cover dot shows **complete**
- the Summary page reads **"Cover ✓ Complete"**
- **Save as PDF is enabled, and produces a real PDF**

That PDF prints its cover line as **"For the period   through"** — with nothing
between. The filing goes to the court with a visibly empty period and the app
never once suggested anything was wrong.

The only trace anywhere is on the Summary page, where the case-information block
renders "Period — – —". That is not a flag; it is two em-dashes.

### Evidence (confirmed at runtime, then against source)

All observations above were driven in a browser: the period was entered through
the real inputs, then cleared through them, and every surface listed was read
back from the live DOM. The PDF was generated and its cover text extracted.

Source confirms there is nothing to find:

- `src/features/plan-initial/index.js:286` renders the fields with
  `renderReportingPeriodFields({ …, required: false })`.
- `validatePlanInitial()` contains **zero** references to `periodFrom` or
  `periodTo` (verified by extracting the function and searching it).
- `planInitialAutomatic()` in `src/core/filing/readiness-config.js` likewise has
  **zero** — no readiness item exists for the period.
- `computeNavChecks()`'s `pi-cover` predicate omits them.

So this is not a rule that fails to fire. There is no rule.

### Authorization for the hard block — explicit, and recorded here

Making an empty period stop an export is a **substantive filing rule**, not a UI
consistency tidy-up, so it needs authorization rather than inference.

**It has it.** The requester was asked directly whether an Initial Plan needs a
reporting period, with three options — require it, derive it from the inception
date, or leave it optional with a warning — and chose **require it**
(2026-09-23). That is the authorization for the hard block.

**The basis is consistency plus the filed artefact**, not a statutory finding:
the Annual and Simplified Plans already require theirs, and an Initial Plan with
no period produces a PDF reading *"For the period   through"* with nothing
between. This document does **not** assert that Chapter 744 or the Probate Rules
require a period on this form. Those sources are now in the repository and can
settle it; doing so would strengthen the basis but is not a precondition, since
nothing here imposes a requirement the court forbids.

### Decision — SETTLED 2026-09-23: require it

**Make the reporting period required on the Initial Plan**, matching the Annual
and Simplified Plans. `renderReportingPeriodFields()` already takes a `required`
flag (`plan-initial/index.js:286` currently passes `false`), so the field-level
change is small — but the validator, the readiness config and `computeNavChecks()`
each need a rule added, because today **none of them mentions the period at all.**
This is not switching a flag; it is adding a check that does not exist.

**State this plainly to filers and to the requester:** an Initial Plan already
saved with a blank period will show as blocked the next time it is opened. That
is the correct outcome — the filing was incomplete — but it is a visible change
to filings already on disk, and it should not arrive unexplained.

**Superseded options, for the record:**

**Option 1 — Make it required, like the other Plans (RECOMMENDED — CHOSEN).** *Filer sees:* an asterisk, and a blocked export until it is
filled — consistent with the Annual and Simplified Plans. *Cost:* small; the
shared `renderReportingPeriodFields()` already takes `required`.

**Option 2 — Derive it and stop asking.** If an Initial Plan's period always
follows from the guardianship inception date, compute it and remove the fields.
*Filer sees:* two fewer things to fill in, and no way to get them wrong.
*Cost:* a derivation rule plus a migration for existing filings that typed
something different.

**Option 3 — Leave optional but warn.** The period stays optional and an
advisory appears when it is blank, using the non-blocking channel Milestone 67B
introduces. *Filer sees:* a nudge, no block. *Use if* the court genuinely does
not require a period on this form — in which case blocking would be wrong.

### Cross-cutting checklist (§8)

1. **Data model.** `periodFrom`/`periodTo` already exist for this filing type;
   Option 1 changes only their requiredness, Option 2 would make them derived.
2. **Legacy data migration.** Existing Initial Plans may have been filed with a
   blank period — under Option 1 they become blocked on next open, which is the
   correct outcome but is a visible change to a saved filing. State it plainly.
3. **Fixture and factory audit.** `fillMinimalValidPlanInitialWard()` populates
   the period today, so fixtures will pass either way; tests asserting the Cover
   is complete with a blank period are the ones to find.
4. **Test coverage and index.** Red-first: a blank period must be flagged
   somewhere a filer will see it. Assert against the export gate *and* the
   readiness card, since today both are silent.
5. **Export/import/portability.** The period appears on the generated PDF's
   cover line; confirm what Option 2's derived value prints.
6. **Security and sensitivity.** None.
7. **UI/UX consistency.** The other Plans already show the asterisk and
   validate; Option 1 is the consistency fix.
8. **Legal/compliance framing — authorized product behavior, no statutory
   claim.** An earlier revision said "unresolved by design"; that contradicted
   the recorded authorization and is withdrawn. The requester authorized making
   the period required (2026-09-23), and the basis is **consistency with the
   other Plans plus the filed artefact** — a PDF reading *"For the period
   through"* with nothing between. This document makes **no claim** that Chapter
   744 or the Probate Rules require a period on this form. Those sources are now
   in the repository and could supply a stronger basis; doing so would reinforce
   the decision, not change it.
9. **Cross-form method consistency.** `renderReportingPeriodFields()` is shared.
   Check what each filing type passes for `required` and report the full matrix
   before changing the default.

### Build record — LANDED 2026-09-24

**The `required` matrix (§8.9), checked before touching the default.** Seven
callers of `renderReportingPeriodFields()`: Annual Accounting, Simplified
Accounting (two pages), Annual Plan, Simplified Plan and Minor Plan all take
the default (`required: true`, with their own labels); the Initial Plan was
the only caller passing `required: false`. The default is untouched; the
Initial Plan's override is removed.

**What a filer now gets.** "For the Period From" and "Through" carry the
required marker. With either blank: the export gate lists "Cover — Reporting
Period From is required" / "… To is required", the sidebar's Cover dot and
the Summary line show incomplete, the readiness card carries its own
"Reporting period is stated" item with a jump link, and Save as PDF is
disabled. A period that ends before it begins is refused with the same
message the other Plans use. Entered, everything clears and the PDF cover
prints "01/01/2026 through 12/31/2026". **A plan saved before today with a
blank period shows its Cover incomplete the next time it is opened** — the
filing was incomplete; the user guide's Initial Plan section now says so.

**Where the rule lives — three places, because there was none in any of
them.** `validatePlanInitial()` (two `req()`s and the From/To
`checkDateOrder()`, mirroring the Annual Plan's), `computeNavChecks()`'s
`pi-cover` (presence and order, mirroring the validator), and the readiness
config's `planInitialAutomatic()` (`cover.period`, with its field map and
jump target). The data-model rows for `periodFrom`/`periodTo` (`common`
scope, `conditional`) now say where they are required.

**Correction to this item's own §8.3.** It said
`fillMinimalValidPlanInitialWard()` "populates the period today". It did
not — the fixture set no period at all, which is why nothing had ever
noticed the gap. It does now (2026-01-01 to 2026-12-31), and the Initial
Plan's byte-exact Cover snapshot gains the two required markers and the two
dates.

**Tests.** `tests/e2e/plan-initial-period.spec.ts` (new): every surface
above, blank then backwards then entered, through to the PDF's cover line.
**Red first** against the unchanged source, every surface soft-asserted so
one run shows the whole picture: no required marker on either date, the
gate returning `[]`, `computeNavChecks()`, the sidebar dot and the Summary
line all "complete", no readiness item, Save as PDF enabled. Green: the
10-spec neighbour set (the new spec, `plan-initial-mount`,
`navigation-status.contract`, `readiness-card.contract`,
`plan-readiness.contract`, `date-validation.contract`,
`signature-capture.contract`, `pdf-cover-geometry`, `party-resolver`,
`plan-pdf-wcag-compliance`) ran **232 of 234, 20.7 min**; the two failures
were the Initial Plan's Cover and Signatures page snapshots, whose
"Supporting Documents" note changed from "set the accounting period on the
Cover page…" to "accounting period 01/01/2026 to 12/31/2026" once the
fixture had a period — updated, **8/8, 1.1 min.** `plan-initial-parity.spec.js`
gains the `cover.period` condition (21 now) and two cases;
`readiness-source-map.spec.js`'s row count for this Plan goes 20 → 21. Unit
**124 files / 1,771 green**; `verify:data-model` OK (951 rows);
`check:types` clean.

---

## 68C — Every Plan tells the filer to file a certificate of service, and none can produce one

### What a filer observes

The readiness card on every Plan filing tells the guardian:

> Local Sixth Judicial Circuit requirement: serve a copy on all interested
> persons and file the certificate of service.

There is no certificate of service anywhere in any Plan filing type. The app
states the requirement and provides no way to meet it — the filer must produce
the document themselves, elsewhere, with no prompt as to who must be served.

The three accounting-family filings each have one: recipient cards, the "no
recipients are required" attestation, and the certificate rendered into both the
PDF and the Excel.

### Evidence (source; a grep answers it completely)

The instruction appears in four readiness configurations —
`src/core/filing/readiness-config.js:109, 174, 237, 294` — two of which add
*"unless the ward was declared totally incapacitated or is a minor"*, so the
requirement is modelled with real nuance.

Certificate-of-service implementation exists in exactly three feature
directories — `guardian-inventory`, `annual-accounting`, `simplified-accounting`
— across their `index.js`, `pdf-model.js` and `excel.js`. A repo-wide search for
`certificate of service`, `certRecipients` and `serviceRecipients` returns
**zero** hits under `plan-initial`, `plan-annual`, `plan-simplified` or
`plan-minor`.

### Authority — answered from the Clerk's own review checklists

The question "do Plans require a certificate of service?" was put to the
authorities available, in the order §5 sets out.

**Florida Statutes and Probate Rules — cited, not readable here.** The app bases
plan service on **F.S. 744.367(3)(b)**, and states the rule in its own words on
the Simplified Plan: *"Serve a copy of this plan on the ward — unless the ward is
a minor or was declared totally incapacitated — and on the ward's attorney, if
any. Provide additional copies to anyone else the court directs."*
(`readiness-config.js:110`). **This repository holds statute citations, never
statutory text** (AGENTS.md §4 records the same limitation), so the statute
cannot be quoted or interpreted here. The citation is reported, not relied on.

**The Sixth Circuit's administrative order — asserted, not readable here.** The
app repeatedly asserts a "Local Sixth Judicial Circuit requirement" and links AO
2024-025 (`dashboard/resources.js:95`), but the order's text is not in the
repository either.

**The Clerk's own workslips — in the repository, and decisive.** These are the
review checklists the Clerk's office works from (§5's third tier), parsed
directly from the `GD*.docx` files at the repo root. They answer the operational
question exactly:

| Workslip | Line |
| --- | --- |
| `GD INIT WORK SLIP REVIEW.docx` | **"Certificate of service filed?"** |
| `GD ANN Work Slip Review.docx` | **"Certificate of service filed?"** |
| `GD ANN Work Slip Minor Review.docx` | **"Certificate of service filed?"** |
| `GD ANN Work Slip Review DSHP.docx` | **"Certificate of service filed?"** |
| `GD ANN Work Slip Review Simplified Plan.docx` | *"If a certificate of service was filed **(not required for simplified plan)** were all entitled parties sent copies?"* |

All four of the first group also carry *"The following are entitled to copy of
report"*, with an instruction to check the court file and update the parties —
so the Clerk actively reconciles who was served.

**Conclusion, on the Clerk's own words:** a certificate of service **is**
reviewed for the Initial, Annual, Minor and DSHP plans, and is **expressly not
required for the Simplified Plan.**

### A second defect, found by asking the question

The app tells **Simplified Plan** filers:

> Local Sixth Judicial Circuit requirement: serve a copy on all interested
> persons, and file the certificate of service.

(`readiness-config.js:109`, inside `planSimplifiedManual()`.)

The Clerk's Simplified Plan workslip says a certificate is **not required** for
that form. So the app is instructing filers to prepare and file a document the
reviewing office does not ask for. That is the mirror of the main finding and
should be corrected in the same item.

*Caveat worth carrying:* a workslip is the Clerk's review checklist, not the
statute. "Not required for simplified plan" is Pinellas operational practice —
the same class of fact §4 already records for blank Annual schedules, and it is
county-specific. It should not be generalised into "no Simplified Plan anywhere
needs service."

### Decision — SETTLED 2026-09-23: build it on all four, optional on Simplified

**The build.**

1. **Port the accounting family's certificate of service to the Initial, Annual
   and Minor Plans**, where the Clerk's workslips check for it. Reuse the
   existing implementation wholesale — recipient cards, the
   `renderServiceAttestationRow()` shape, the "no recipients are required"
   attestation, and the PDF section. This is porting, not designing.
2. **Offer it on the Simplified Plan too, clearly marked not required.** The
   Clerk's own workslip anticipates one being filed — *"If a certificate of
   service was filed (not required for simplified plan) were all entitled
   parties sent copies?"* — so they do check one when present. A guardian who
   serves copies anyway can produce the document; nobody is pushed to.
3. **Correct the Simplified Plan's readiness text.** It currently reads *"Local
   Sixth Judicial Circuit requirement: serve a copy on all interested persons,
   and file the certificate of service"* (`readiness-config.js:109`), which
   contradicts the Clerk's own checklist. It must say the certificate is not
   required for this form, while still describing the service the statute cites.
4. **No new exception logic.** The carve-outs the app names — a ward who is a
   minor, or declared totally incapacitated — govern *who must be served*, not
   whether a certificate exists. The existing "no recipients are required"
   attestation already expresses that, and the Minor Plan workslip still asks
   "Certificate of service filed?", confirming the certificate persists even
   where the ward is not served.

**Nothing here blocks export.** Consistent with the requester's standing
direction that blocking should be rare: the certificate is captured and printed,
and its absence is not an export gate on any plan type.

**Settled 2026-09-24, at build time — two points the row list left open.**

1. **Date and method, optional.** The accountings' certificate records a Date
   of Service and a method ("hand-delivered, mailed") and prints them in the
   certificate sentence; the row list above named only recipients and the
   attestation. The Plans' certificate carries both, optional, so the PDF can
   read "furnished to the recipients listed below on 03/01/2026 | mailed".
2. **Certified by the filer.** The requester asked how the court's form does
   it. **It does not:** none of the four plan forms in `reference/plan-forms/`
   contains a certificate of service — each ends with "Certification and
   Signature of Guardian(s)" and "… of Guardian's Attorney" (the Minor Plan
   adds a preparer). The Probate Rules put the duty to serve on the
   guardian: Rule 5.690(b) for the initial report and 5.695(b) for the annual
   plan ("Copies of the annual plan and accounting shall be served on the
   ward, unless the ward is a minor or is totally incapacitated, and the
   attorney for the ward, if any … on such other persons as the court may
   direct"); Rule 5.041 sends service to Fla. R. Gen. Prac. & Jud. Admin.
   2.516, whose certificate is signed by "the attorney or party" (2.516 is
   cited by the rules in the repository, not reproduced in them). So the
   certificate is signed by whoever serves: **one "Certified by" block with
   a Guardian / Attorney choice** — shown as Attorney when the plan names
   one, otherwise Guardian 1, the name carried from the plan — with the date
   and the same signature-state control the plan's own signatures use. Not
   the accountings' attorney-only block (most Plan filers are pro se and
   would have nowhere to sign), and not "no block at all" (a certificate
   under 2.516 is signed as such).
3. **AO 2024-025 says nothing about serving plans** (its text was searched
   for "certificate of service", "serve" and "service of"). The readiness
   text this app shows on three Plans — "Local Sixth Judicial Circuit
   requirement: serve a copy on all interested persons and file the
   certificate of service" — is therefore not traceable to the order it
   implies. §8.9: reported here, not changed by this item, which corrects
   only the Simplified Plan's text as decided; the "local requirement"
   attribution on the other three is for the requester to re-source or
   reword.

**Superseded options, for the record:**

**Option 1 — Add the existing certificate-of-service card to the Plans
(RECOMMENDED as originally written; superseded by the decision above, which
extends it to the Simplified Plan as an optional section).** Reuse the accounting
family's implementation wholesale: recipient cards, the "no recipients are
required" attestation, and PDF rendering. *Filer sees:* the same page they
already know from the Inventory, on their Plan. *Cost:* meaningful but
well-trodden — the pattern, the validation and the PDF section all exist;
this is porting, not designing. Needs data-model rows per Plan type.

**Option 2 — Add it only where the app says it is required.** Two of the four
readiness entries carve out totally-incapacitated wards and minors. Follow that
nuance rather than adding the section unconditionally. *Cost:* same as Option 1
plus conditional logic. *Note:* the existing "no recipients are required"
attestation may already express this better than a conditional section would.

**Option 3 — Change the instruction instead.** If Plans do not require a
certificate, the readiness text is wrong and should say so. *Cost:* trivial.
**Only correct if the Clerk says service is not required** — do not choose this
to avoid the work.

### Cross-cutting checklist (§8)

1. **Data model.** Options 1-2 need recipient-collection rows per Plan type,
   mirroring the accounting family's (`certRecipients` / `serviceRecipients`
   plus the attestation field). Check the collection is fully expanded in the
   CSV, not summarised (§8.1).
2. **Legacy data migration.** New collections default empty; existing Plans must
   not become blocked on load without the filer being told why.
3. **Fixture and factory audit.** Every Plan fixture needs the new required
   fields wherever a sibling required field already appears — Milestone 55D
   needed three discovery rounds for exactly this shape of change.
4. **Test coverage and index.** Per Plan type: recipients render, the
   attestation hides them without deleting, the certificate reaches the PDF.
5. **Export/import/portability.** Plans have no Excel export, so the PDF is the
   only output surface — simpler than the accounting family.
6. **Security and sensitivity.** Recipient names and addresses are personal
   data; classify as the accounting family already does rather than inventing a
   new classification.
7. **UI/UX consistency.** Reuses `renderServiceAttestationRow()` and the
   existing recipient card; name that reuse in the plan.
8. **Legal/compliance framing — ANSWERED, no longer blocking.** An earlier
   revision marked this "Blocking. Must be answered before building." That was
   written before the Clerk's workslips were parsed, and is withdrawn. Those
   checklists answer the operational question directly — a certificate is
   reviewed on the Initial, Annual, Minor and DSHP plans and expressly not
   required on the Simplified — and the requester decided the build on that
   basis. Carry the caveat recorded above: a workslip is Pinellas review
   practice, not a statutory finding, and must not be generalised to other
   counties. Chapter 744 and the Probate Rules are now in the repository if a
   statutory basis is wanted; it would reinforce this decision, not change it.
9. **Cross-form method consistency.** All four Plan types are covered by the
   decision, and they do not behave identically — three expect the certificate,
   the Simplified offers it as optional. Implement from the per-form table
   below rather than applying one rule to four forms.

### Per-form schema and test matrix

Spelled out because "build on all four" is not buildable as written.

| Form | Certificate | Readiness text | New data-model rows |
| --- | --- | --- | --- |
| Initial Plan | Expected | unchanged (already tells filer to serve) | recipients collection + attestation |
| Annual Plan | Expected | unchanged | recipients collection + attestation |
| Minor Plan | Expected | unchanged | recipients collection + attestation |
| Simplified Plan | **Optional**, marked not required | **must be corrected** — currently calls it a requirement | recipients collection + attestation |

**Exact rows per form.** Two incompatible recipient shapes already exist in the
codebase, so this has to be pinned rather than left as "mirror the accountings":

| Existing form | Collection | Per-recipient fields | Max |
| --- | --- | --- | --- |
| Annual Accounting (CSV:877-880) | `certRecipients[]` | `.name`, `.line2`, `.line3`, `.line4` | unbounded |
| Simplified Accounting (CSV:92-95) | `certRecipients[]` | `.name`, `.line2`, `.line3`, `.line4` | unbounded |
| Guardian Inventory (CSV:898-900) | `serviceRecipients[]` | `.name`, `.address`, `.cityStateZip` | 4 |

**The Plans adopt the `certRecipients[]` shape** — `.name`, `.line2`, `.line3`,
`.line4`, unbounded — because two of the three existing implementations use it,
it imposes no arbitrary cap, and free-form address lines handle institutional
recipients that a structured `cityStateZip` does not. The Inventory's older
shape is not the model; do not introduce a third.

Per Plan type (`plan_initial`, `plan_annual`, `plan_minor`, `plan_simplified`),
add: `certRecipients[].name`, `.line2`, `.line3`, `.line4`, and the attestation
field `certNoRecipients` (matching the accountings' name, **not** the
Inventory's `serviceNoRecipients` — one name for one concept).

**Sensitivity — resolve an existing inconsistency rather than copy it.** The
Inventory classifies its recipient rows `personal`; Annual and Simplified
classify the identical data `none`. The Plans' rows are recipient names and
addresses, so classify them `personal`, and note the accountings' rows look
mis-classified. **Report that, do not fix it here** (§8.9).

**Migration: default empty on every form.** No existing Plan changes state on
load, and since nothing here blocks export, an empty collection never makes a
previously-exportable filing fail.

**Tests, per form:**
1. Recipients render, add and remove.
2. The attestation hides the recipient cards **without deleting** what was
   entered.
3. The certificate reaches the filed PDF with the right recipients.
4. **Export is never blocked** by anything in this section — on any of the four,
   in any state. This is the regression guard for the requester's standing
   direction that blocking should be rare.
5. Simplified Plan only: its readiness text no longer calls the certificate a
   requirement. Assert on the rendered string, since that wording is the defect.

### Build record — LANDED 2026-09-24

**What a filer now gets.** Every Plan has a **Certificate of Service** page,
last before Print Preview: recipient cards in the accountings' shape (name
and three free address lines; add as many as needed, remove any but the
first), the "No recipients are required for this certificate" attestation
that appears only when nobody is listed and hides the cards — never clears
them — when answered Yes, a Date of Service and a method, and one
**Certified by** block: a Guardian / Attorney choice shown as Attorney when
the plan names one and Guardian 1 otherwise, the printed name carried from
the plan, a date, and the same signature-state control the plan's own
signatures use. Nothing on the page is required to file. The PDF appends
the certificate as its own section: "I hereby certify that a copy of this
plan has been furnished to:", the recipients (or the attestation), "on this
date: 03/01/2026 | mailed", and "Certified by (Guardian)" with the
signature. The Simplified Plan's page and readiness card say the
certificate is **not required for this form** — the Clerk's own checklist —
instead of calling it a local requirement.

**Where the sidebar and the gate stand.** The sidebar asks (someone listed,
or the attestation Yes — the accountings' recipient rule through the same
bridge) and the page explains the mark with jump links; the export gate
never demands anything. The print preview carries the certificate's
advisories: one line for an untouched certificate, otherwise what is still
blank. This is the 67B pattern (sidebar-only rule + advisories), applied to
a whole page.

**One implementation, four forms.** `src/core/filing/plan-certificate-of-service.js`
(fields, migration, who certifies, the settled rule, the advisories, the PDF
section — no DOM imports, so the state factories, the print preflight and
the four PDF models import it) and
`src/core/form/plan-certificate-of-service-page.js` (the page body). Each
Plan adds one route, one nav item, one summary line, one page-nav link, its
`CERT_CFG` (which field holds the attorney's name) and a migration call on
mount, so a plan saved before today gains the fields on load. Recipient rows
ride the Plans' existing +Add/Remove row path (row type `certRecipient`).
Data model: 44 rows (11 per Plan), the recipient rows classified `personal`
as decided; `verify:data-model` OK (995 rows). The user guide gains the page
in each Plan's page list and a bullet, with the Simplified Plan's saying not
required; the drift guard's `service-no-recipients-attestation` control now
has nine evidence surfaces (the three accounting pages, the shared
declaration, the page renderer, and the four Plans' calls).

**Tests.** `tests/e2e/plan-certificate-of-service.spec.ts` (new, one
describe per Plan, through the real buttons): the page and its nav item
exist; add/remove; blank, attested, named and half-finished certificates
raise no export issue and Save as PDF stays enabled; the attestation hides
without deleting and restores on No; the sidebar asks until settled and the
page explains; the PDF's recipients, date, method and signer; the
Simplified readiness text. **Red first: 13/13 failed** against the source
before any Plan had the page — no heading (4), no recipient inputs (4), no
certificate in any PDF (4), the Simplified card still calling it a local
requirement (1). Green: the 15-spec neighbour set (the new spec, the four `plan-*-mount` snapshots, `navigation-status.contract`, `readiness-card.contract`, `plan-readiness.contract`, `sidebar-only-wants`, `section-guidance-invariant`, `plan-pdf-wcag-compliance`, `pdf-form-specific`, `signature-capture.contract`, `plan-signature-date`, `plan-initial-period`) ran **231 of 241, 28.2 min**, every failure test-side: the page's `h1` carries the shell's injected "All Filings ?" text (matched by containment now); the yes/no radios are named `yesno_<id>_yes/_no`; the four attestation cases ticked Yes with Recipient 1 already named, which the accountings' D16 rule hides the question for — the retained data now lives in a second card, and the case also proves that naming Recipient 1 retires the question; and the Annual and Simplified Plan Signatures-page snapshots read "Next →" now that those pages lead on to the certificate. Rescoped: the three affected specs 27/27, and the certificate spec alone **13/13, 1.8 min** on the unchanged source. `tests/unit/plan-certificate-of-service.spec.js`
(new, 10 cases) covers the shared rules; `plan-readiness-county.spec.js`'s
two Simplified cases now assert the corrected local text; unit **125 of 126 files / 1,790 of 1,791 green** — the one failure is the index guard naming the two Milestone 68E spec files already staged in the tree, which 68E's commit indexes; `security-source-audit` failed once while a concurrent e2e run was writing `test-results/` and passes 3/3 alone and in the full suite.

**Discovery carried from the decision note above (§8.9):** the "Local Sixth
Judicial Circuit requirement" wording on the Initial, Annual and Minor
Plans' service reminders is not traceable to AO 2024-025's text and is left
as it was; the accountings' `certRecipients` rows remain classified `none`
while the Plans' are `personal` — the inconsistency this item's own §8
predicted, reported here, not fixed.

---

## 68E — Initial Plan Question 5 accepts only one answer where several apply

### What a filer observes

Question 5 asks how the ward's personal care — bathing, grooming, feeding — will
be provided, offering *Care Facility*, *Nurses and Aides*, *Family and Friends*
and *Other*. Only one can be selected. A ward in an assisted-living facility
whose family also provides daily care cannot say so; picking one answer makes
the filed plan inaccurate about how the ward is actually cared for.

### Evidence (source; the control type is not a runtime question)

`src/features/plan-initial/index.js:353-355`:

```js
radioP('q5Personal','',d.q5Personal,['Care Facility','Nurses and Aides','Family and Friends','Other'])
```

`radioP()` renders real `<input type="radio">` elements
(`legacy-app.js:5953-5955` → `renderRadioGroupField()`), which are
mutually exclusive by definition. The stored field is scalar: `q5Personal` is
typed `enum` in `probate-guardian-data-model.csv:439`, not a list.

### Decision — SETTLED 2026-09-24: convert every radio-rendered checkbox list

**Scope, as the requester set it:** Q5, Q4, and any other Initial Plan
question the court's form (`reference/plan-forms/plan-initial-original.pdf`)
shows as a checkbox list but the app renders single-select — Q3 and Q6 are
audited against the form during the build and converted only if they are the
same shape. The form is the authority for which questions qualify. One
data-model migration pattern (a saved single value becomes a one-item set)
applied to each affected field; the PDF renders each as a list.

**Superseded options, for the record:**

**Option 1 — Convert to checkboxes (RECOMMENDED — CHOSEN, widened as above).** Several answers may be true
at once, so the control should allow several. *Filer sees:* they tick every
arrangement that applies. *Cost:* the stored field changes from one value to a
set, which is a data-model change plus a migration for existing filings (a saved
single value becomes a one-item set). The PDF and any export rendering this
answer must handle more than one.

**Option 2 — Leave single-select, add guidance.** Keep one answer and tell the
filer to choose the primary arrangement, explaining the rest under "Other".
*Cost:* nearly nothing. *Downside:* the filed plan still cannot state the actual
arrangement, and "Other" becomes a dumping ground.

### Statutory basis — §744.363(1)(a) requires the provision to be described, and sets no cardinality

Read from the statutes PDF, page 47:

> **744.363 Initial guardianship plan.** — (1) The initial guardianship plan
> shall include all of the following:
> **(a) The provision of medical, mental, or personal care services for the
> welfare of the ward.**
> (b) The provision of social and personal services for the welfare of the ward.

The statute requires the plan to **include the provision** of personal care
services. It prescribes no list of providers and no limit of one — the four
options (`Care Facility`, `Nurses and Aides`, `Family and Friends`, `Other`) are
the app's own construction, and so is the restriction to one.

**That settles the direction, if not the mechanism.** A ward in an
assisted-living facility whose family also provides daily care has their care
provided by two of those four. A form that permits only one cannot describe that
provision accurately, and describing it is what the statute requires. Nothing in
§744.363 supports the restriction; the statute is served better by allowing
several.

### The court's form settles it: a checkbox list, not a single choice

`reference/plan-forms/plan-initial-original.pdf`, page 2, question 5:

> **5. For the plan period, the guardian proposes the following as to the
> provision of personal care of the ward, such as bathing, grooming and
> feeding:**
> ☐ Care Facility ☐ Nurses and Aides ☐ Family and Friends ☐ Other (Please
> Explain Below)

A checkbox list, identical in shape to its siblings on the same form — question
3 (medical services: primary care physician, dentist, ophthalmologist,
specialist, PT, ST, OT…), question 4 (mental health services), question 6
(socialisation), question 7 (benefits). Several of those are obviously
multi-valued: a ward can have both a dentist and an ophthalmologist. The app
already renders question 7 as checkboxes.

**Multi-select confirmed, from the form rather than by inference.**

*An earlier revision of this section said no plan form existed in this
repository. That was wrong — `reference/plan-forms/` holds all four originals.
The claim was made without searching properly.*

### The same defect on question 4, which the tester did not report

`plan-initial/index.js:351` renders **question 4** (mental health services) with
`radioP(...)` — single-select — against the same checkbox list on the form:

> ☐ Routine examination by Psychiatrist/Psychologist ☐ Ongoing Treatment
> Outpatient ☐ Ongoing Treatment Inpatient ☐ None ☐ Other

A ward receiving both outpatient treatment and routine psychiatric examination
cannot be described. **Reported, not proposed** (§8.9) — but it is the same
defect, on the adjacent question, and fixing one while leaving the other would
repeat the split this milestone already had to correct on the "None" questions.
Check questions 3 and 6 for the same shape before scoping.

### Cross-cutting notes (§8)

Data model row 439 changes type and needs a migration rule (§8.1, §8.2); the
`Other` explanation box is *also* affected by Milestone 67F, since it is a
conditional reveal behind `radioP()` — if 68E converts this control, coordinate
with 67F rather than fixing the reveal twice. PDF rendering of `q5Personal` must
handle a set. Test coverage must drive the real click (§6 corollary).

### Build record — LANDED 2026-09-24

**Which questions, decided by the form, not by inference.** Page 2 of
`reference/plan-forms/plan-initial-original.pdf` was rasterised and looked
at: questions **2, 3, 4 and 5 all use the same checkbox glyphs**, and
question 6 on page 3 likewise. The app already rendered 3 and 6 as
checkboxes; **2, 4 and 5 were radio groups** and all three convert. Question
2's stem reads singular ("the … setting best suited … is:"), but the form
offers it as a checkbox list and the requester's rule is that the form
decides — recorded here so nobody re-litigates it from the wording.

**What a filer now gets.** On questions 2, 4 and 5 they tick every answer
that applies; each ticked row prints ticked on the PDF. "Other" reveals its
explanation on the click and a blank explanation still blocks, as before;
on question 4 "None" does the same, and **"None" is exclusive** — ticking it
clears the other boxes and ticking any other box clears "None", on the
click, in the model and on screen — since a plan cannot state both. Nothing
ticked on a question is still an export issue, the sidebar agrees, and the
readiness card's three items are unchanged in name.

**Shape.** One boolean per option (`q2ALF` … `q2Other`, `q4Psych` …
`q4Other`, `q5CareFacility` … `q5Other`; 17 in all), the shape questions 3,
6 and 7 already use on this form and the Annual Plan uses for the same
residential-setting question — not an array, so nothing on this form stores
a list where its siblings store booleans. The three enum rows
(`q2Setting`, `q4Mental`, `q5Personal`) leave the data model; 17 boolean rows
enter; the three `…Explain` rows' conditions now name the boxes.
`verify:data-model` OK (1,009 rows).

**Legacy filings (§8.2).** On load, a saved single value ticks the one box
it named and the retired scalar is removed. A value that names no option —
the parity fixture had stored free text like "Weekly counseling provided by
community mental health center" in the enum, so real filings may too — lands
under **Other with the text kept as the explanation**, never dropped. Blank
stays blank (never coerced). `src/core/filing/plan-initial-multiselect.js`
holds the option lists and the migration; the exclusivity rule is
`src/core/form/exclusive-none.js`, driven by two data attributes the checkbox
renderer now emits and applied from `form-events.js` after the changed box is
written — **68F reuses it as-is** for the assistive-devices "None" boxes.

**Tests.** `tests/e2e/plan-initial-multiselect.spec.ts` (new, real clicks):
several answers on all three questions through to the PDF's "Yes —"/"No —"
rows; None exclusivity in both directions; Other/None reveals and the blank
explanation blocking; the legacy shape reading back, free text under Other;
nothing ticked still blocking. **Red first, 5/5 failed** against the radio
pages (no such boxes to click, no migration, the validator blind to the new
boxes — `Received array: []`). Green: the 12-spec neighbour set (the new spec, `conditional-reveal-routes`, `plan-initial-mount`, `plan-pdf-wcag-compliance`, `readiness-card.contract`, `plan-readiness.contract`, `navigation-status.contract`, `pdf-cover-geometry`, `plan-signature-date`, `plan-initial-period`, `plan-certificate-of-service`, `signature-capture.contract`) **221/221, 21.7 min**, first run. Unit:
`tests/unit/plan-initial-multiselect.spec.js` (new, 6 cases);
`plan-initial-parity`, `readiness-predicate-coverage`, the 67F reveal-route
case and the WCAG fixture re-pointed at the boxes; full suite **126 files /
1,791 green**; `check:types` clean (which also caught a 68C typing slip,
fixed in its own commit). The Initial Plan mount snapshots cover the Cover
and Signatures pages only, so none changed.

---

## 68F — Initial Plan Question 10c has no "None"

### What a filer observes

Question 10c asks for the ward's physical disabilities, offering Mobility,
Blindness, Deafness, Diabetic, Parkinson's disease, Severe arthritis and Other.
A ward with **no** physical disabilities has nothing to tick. The filer either
leaves the question blank — indistinguishable from not having reached it — or
ticks "Other" and explains that there are none.

### Evidence (source)

`src/features/plan-initial/index.js:470-479` lists the seven options above with
no "None". The contrast is immediately below: question 10d, *"assistive devices
currently used"*, **does** include one — `cb('usesNone','None')` at
`index.js:489`. So the pattern exists in the same function, on the adjacent
question, and 10c simply lacks it.

### Decision needed

**Option 1 — Add "None" to 10c, matching 10d (RECOMMENDED).** *Filer sees:* they
can state affirmatively that the ward has no physical disabilities. *Cost:* one
checkbox and one data-model row, mirroring `usesNone`.

**Option 2 — Add "None" to 10b as well.** Question 10b (mental disabilities) has
the same gap. Fixing 10c alone leaves its sibling inconsistent. *Cost:* two
rows instead of one. **This is the same defect and arguably should not be split**
— raised because the tester reported only 10c, and §8.9 makes reporting the
sibling an obligation rather than a licence to expand scope unasked.

**Option 3 — Leave it.** Blank continues to mean both "none" and "not yet
answered".

### REVERSED 2026-09-23 — the court's form has no "None" here, and the app already matches it

`reference/plan-forms/plan-initial-original.pdf`, page 6:

| Form question | Options |
| --- | --- |
| B. The mental disabilities of the Ward are | …types… ☐ Other — **no "None"** |
| C. The physical disabilities of the Ward are | …types… ☐ Other — **no "None"** |
| D. The assistive devices **used** by the Ward are | … ☐ **None** ☐ Other |
| E. The assistive devices **needed** by the Ward are | … ☐ **None** ☐ Other |

The form omits "None" on B and C while including it on D and E — on the same
page, in the same block. That is a deliberate distinction, not an oversight, and
**the app reproduces the form exactly today.**

**So no "None" is added to either question.** The requester reversed the earlier
decision on seeing the form (2026-09-23), applying their own guidance that the
original form carries very strong persuasive weight. The filer's difficulty the
tester reported is real, but it is the court's design; adding a checkbox the
official form lacks would put app-authored content on a filed document.

**What survives from the earlier decision, and is still worth doing:** the
mutual-exclusion hole on questions D and E. Those *do* have "None" on the form,
and the app lets a filer tick "None" alongside "Wheelchair" with nothing
stopping them — so a filed plan can state the ward uses no assistive devices and
list three. That is an app defect regardless of the form, and the form's own
design (offering "None" as one option among the others) implies it is meant to
be exclusive.

**Still open, if the requester wants it pursued:** asking the Clerk how a
guardian is expected to record "no physical disabilities" on a form that offers
no way to say it. That would settle whether blank is the expected answer.

### Superseded reasoning, for the record

**Both questions get "None".** 10b (mental disabilities) has the same gap as
10c; the tester reported only the one they hit. Fixing one would leave the group
internally inconsistent — "None" on 10c and 10d but not 10b — so both are in.

**"None" is mutually exclusive, and the existing one is fixed too.** Ticking
"None" clears every other box in its group; ticking any other box clears "None".

**This is a fix, not a copy — verified before deciding.** The existing `usesNone`
on 10d is a plain independent boolean (`cb()` → `chkP()`, `state.js:365`) with
**no exclusion logic anywhere in the codebase**. A filer can tick "None" and
"Wheelchair" together today and nothing stops them, so a filed plan can state
the ward uses no assistive devices *and* list three. Copying that pattern to two
more questions would have tripled the defect.

**So the build covers three questions:** add "None" with exclusion to 10b and
10c, and **add the exclusion to 10d's existing "None"**, so all three behave
alike.

**Watch the reveal.** These checkboxes render through `chkP()`, which cannot
request a re-render (67F). Clearing sibling boxes must actually repaint, and the
"Other" explanation box in each group is itself a conditional reveal behind the
same helper — so this item depends on 67F exactly as 67B does. Confirm that
dependency before scheduling it.

### Cross-cutting notes

Data model: one new boolean per group for 10b and 10c, matching `usesNone`'s
shape (`state.js:365`). Migration: default `false`, which reads as "not
answered" exactly as today — no existing filing changes meaning. Tests must
drive the real click (§6 corollary) and assert the clearing in both directions,
plus that 10d's pre-existing "None" now clears too.

### Build record — LANDED 2026-09-24

**What a filer now gets.** On 10D (assistive devices used) and 10E (assistive
devices needed), ticking "None" clears every device box and ticking a device
clears "None" — on the click, in the saved answer and on screen — so a filed
plan can no longer state both. Unticking "None" clears nothing else. No
"None" is added to 10B or 10C: the court's form has none there (page 6),
and the reversal above stands.

**How, and why it is small.** The rule is the one 68E built for question
4's "None" (`src/core/form/exclusive-none.js`, applied from `form-events.js`
through two data attributes the checkbox renderer emits). 10D's and 10E's
boxes now carry those attributes — group `uses` / `needs`, the "None" box in
role `none` — and nothing else changes: no data-model rows (the booleans
already existed), no readiness or validator change (the lists still need any
one box), no migration (an old filing with both "None" and a device ticked
keeps both until the filer touches the list, which is the moment the rule
can act; nothing is guessed on load).

**Tests.** `tests/e2e/plan-initial-assistive-none.spec.ts` (new, real clicks,
one case per list): the fixture ticks "None"; a device clears it; two
devices then "None" clears both; unticking "None" leaves the question
unanswered. **Red first, 2/2 failed**: "a device clears None — Expected: not
checked, Received: checked". Green: with the Initial Plan neighbours (`plan-initial-multiselect`, `conditional-reveal-routes`, `plan-initial-mount`, `readiness-card.contract`, `plan-pdf-wcag-compliance`) **51/51, 5.8 min**, first run. The guide's 10B–D bullet says
what the lists do and why the disabilities lists have no "None".

---

## 68G — Annual Plan Question 6 has no plain "No"

### What a filer observes

Question 6 asks, for each of twelve rights, whether the ward is now capable of
having that right restored. The three available answers are *Not removed*,
*Needs to be restored* and *Capable of restoration*. There is no plain **No**.

A guardian whose ward had a right removed and is **not** capable of having it
restored has no accurate answer. *Not removed* is false — it was removed.
*Needs to be restored* and *Capable of restoration* both assert the opposite of
what they mean to say.

This matters more than a wording nit, because the app attaches a consequence:
the page tells the filer *"'Capable of restoration' is a formal statement — if
the physician's report agrees, you must file a separate petition to restore that
right."* So the only answers available to that guardian either misstate the
ward's status or commit them to a petition they do not intend to file.

### Evidence (source)

`src/legacy-app.js:4035`:

```js
const PLAN_RIGHT_STATES=['Not removed','Needs to be restored','Capable of restoration'];
```

Consequence text at `src/features/plan-annual/index.js:427`. Field rows at
`probate-guardian-data-model.csv:350-361`, enum domain `PLAN_RIGHT_STATES`.

### The court's own form has a "No" column — the app dropped it

`reference/plan-forms/plan-annual-original.pdf`, page 6, question 6:

> **6. Is the Ward now capable of having some or all of the following rights
> restored?** Place a checkmark where applicable
>
> | | **Yes** | **No** | **Not Removed** | **Needs to be Restored** |

Twelve rights, A through L, against **four** columns.

The app offers three (`legacy-app.js:4035`):

| Court's form | App |
| --- | --- |
| Yes | `Capable of restoration` (renamed) |
| **No** | **— missing —** |
| Not Removed | `Not removed` |
| Needs to be Restored | `Needs to be restored` |

**The tester was precisely right**: "Question 6 should have a 'no' column." The
form has one; the app dropped exactly that column and renamed another. Under the
requester's 2026-09-23 guidance the original form carries very strong persuasive
weight, and here it is unambiguous.

**This also settles the labels.** Rather than inventing a fourth state's
wording, match the form's four columns exactly — `Yes`, `No`, `Not Removed`,
`Needs to be Restored`. That means renaming `Capable of restoration` back to
`Yes`, which is a display change over stored values and needs a migration note.

### Statutory basis — §744.3675(3) requires the answer the app cannot give

Read from `Statutes & Constitution _View Statutes_744 _Online Sunshine.pdf`,
page 50:

> **(3) Each plan for an adult ward must address the issue of restoration of
> rights to the ward and include:**
> (a) A summary of activities during the preceding year that were designed to
> enhance the capacity of the ward.
> **(b) A statement of whether the ward can have any rights restored.**
> (c) A statement of whether restoration of any rights will be sought.

**(b) settles the tester's finding.** The statute requires a *statement of
whether* the ward can have rights restored — which is a question admitting
"no". The app's three states (`Not removed`, `Needs to be restored`, `Capable of
restoration`) provide no way to state that a removed right **cannot** be
restored. A guardian in that position cannot comply with (b) through this app.
This is no longer a UI-wording preference; it is a statutory requirement the
form cannot satisfy.

### §744.3675(3)(c) — a known divergence, closed with no work proposed

The statute lists three required statements; (c) is *"a statement of whether
restoration of any rights will be sought"*. The app does not ask that as a
separate question.

**Neither does the court's form**, and that settles it. The form's question 7
(`plan-annual-original.pdf`, page 7) handles the same ground through an
obligation rather than a question:

> **7.** If you answered "Yes" to any right in question 5 [*sic* — 6], and the
> doctor has indicated on the physician's report that a right may be restored,
> **you must file a petition to restore the right.** If you do not agree with
> the physician's report, please provide an explanation.

The app already implements exactly this, including the explanation box shown
when a right is marked restorable (`plan-annual/index.js:430-431`).

**Decision, 2026-09-23: no work.** The requester declined to scope a separate
(c) question on seeing that the form does not ask one. Adding it would place
app-authored content on a filed document to satisfy a reading of the statute the
court's own form evidently does not take.

Recorded rather than dropped, because the divergence is real and a future reader
comparing the statute to the form will find it again: **(a) and (b) are explicit
on the form; (c) is addressed indirectly through the petition obligation.**

*(a) appears to be covered* by question 5's capacity-building activities — the
readiness config already tracks *"Question 5 — social skills and capacity-building
activities described"*. Confirm before relying on it.

### Decision — SETTLED 2026-09-24: the form's four columns

The table's "relabelling rejected" and this section's "match the form's four
columns exactly" were in conflict; the requester settled it on the form.
**Q6 shows the court's four columns — Yes / No / Not Removed / Needs to be
Restored.** A fourth stored state is added for the "No" column. The existing
`Capable of restoration` keeps its stored value and is *displayed* as "Yes";
`Not removed` and `Needs to be restored` keep both value and label. No saved
answer changes meaning — the objection the table recorded was to relabelling
`Needs to be restored` as "No" (Option 2 below), which this does not do.
Migration: none; a blank right stays blank (never guessed, as below).

**Superseded options, for the record:**

**Option 1 — Add a fourth state, "Removed, not capable of restoration"
(RECOMMENDED as originally written — now backed by §744.3675(3)(b), not preference).** Spelled out rather than a bare "No", because the column is not
a yes/no question — it is a status. *Filer sees:* an accurate answer for the
common case of a right that was removed and remains appropriate to leave
removed. *Cost:* one enum value across twelve fields, a migration decision for
existing filings (see below), plus PDF/readiness handling.

**Option 2 — Relabel "Needs to be restored" as "No".** The tester's own
suggestion, on the grounds that two of the three options are near-synonyms.
*Cost:* smallest change. *Downside:* it changes the meaning of an answer already
stored in existing filings — a filing that said "Needs to be restored" would
start displaying "No", which is a different statement about a ward. Not
recommended for that reason alone.

**Option 3 — Leave it.**

**Migration question, if Option 1:** existing filings that chose one of the three
states keep their value and need no change. But filings that left a right
**blank** because none of the options fit are indistinguishable from filings not
yet completed, and nothing can recover the filer's intent. No migration should
attempt to guess.

**Legal framing (§8.8):** whether the court requires a positive statement for
every right, and whether "not capable of restoration" is a statement a guardian
may make without a physician's report, is not resolved here. Flag for the Clerk
or counsel before building.

### Build record — LANDED 2026-09-24

**What a filer now gets.** Question 6 shows the court form's four columns in
its order — **Yes / No / Not Removed / Needs to be Restored** — so a guardian
whose ward had a right removed and is not capable of having it restored can
say **No**. The PDF prints the form's words ("Right to marry — No", "Right to
vote — Yes"). "Yes" still carries the formal-statement note and the
question 7 prompt.

**No saved answer changes meaning.** Each column is a stored value plus the
form's label: `Capable of restoration` (shown as **Yes**), `No` (new),
`Not removed`, `Needs to be restored`. Nothing is migrated; a blank right
stays blank and unanswered. The constant lives in `legacy-app.js` with a
`planRightLabel()` bridge the PDF model uses (allowlisted; window-bridge
declarations regenerated). The twelve data-model rows' notes record the
four-value domain; `verify:data-model` OK.

**Legal framing (§8.8), unchanged:** whether a guardian may state "No"
without a physician's report is not resolved here; the app records what the
form asks and gives no advice on it.

**Tests.** `tests/e2e/plan-annual-rights-no.spec.ts` (new): the four-column
header in order; "No" stored; "Yes" keeps its stored value and its note;
both count as answered; the PDF's words; a legacy `Capable of restoration`
shown as Yes; a blank right stays unanswered. **Red first, 1 failed / 1
passed** — the header had three columns (the legacy case is designed to pass
before and after). Green with the Annual Plan neighbours
(`plan-annual-mount`, `plan-readiness.contract`, `readiness-card.contract`,
`plan-pdf-wcag-compliance`, `pdf-form-specific`) 58/59, the one failure
this spec's own note assertion — the question 7 note is decided when the
page renders, not on the click (unchanged by this item), so the case now
re-opens the page; then **2/2**. Unit 126 files / 1,792 green; `check:types`
clean.

---

## 68H — All three Plans call their period an "accounting period"

### What a filer observes

On the Cover page of the Initial, Annual and Simplified Plans, the Supporting
Documents section reads *"set the accounting period on the Cover page to file
these by year"*, or once dates are entered, *"— accounting period 01/01/2026 to
12/31/2026"*. A Plan reports on the ward as a person — where they live, their
care, their rights. It has no accounting period. The wording tells the filer
they are working on the wrong kind of filing.

### Evidence (source, corroborated by existing e2e snapshots)

One shared function serves every non-Inventory filing type,
`src/legacy-app.js:7715-7716`:

```js
const periodNote=activeInventoryType==='guardian'?''
  :(fmtPf||fmtPt?` — accounting period ${fmtPf||'?'} to ${fmtPt||'?'}`:' — set the accounting period on the Cover page to file these by year');
```

Confirmed user-facing by the suite's own byte-exact snapshots, which contain the
string today: `tests/e2e/plan-initial-mount.spec.ts:45`,
`plan-annual-mount.spec.ts:45`, `plan-simplified-mount.spec.ts:47`.

Not affected: the dashboard's deadline text already says "reporting period" for
Plan types (`src/features/dashboard/view-model.js:106-109`); only this shared
note is wrong.

### Statutory basis — the statute never calls a plan's period an accounting period

§744.367(1): the annual guardianship plan *"must cover the coming fiscal year"*.
§744.3675: the plan *"must specify the current needs of the ward and how those
needs are proposed to be met **in the coming year**"*. By contrast §744.367(2)
gives the guardian of the **property** an annual *accounting* covering *"the
preceding calendar year"*.

So the statute draws exactly the distinction the app's wording erases: a plan
looks forward over a year, an accounting looks back over an accounting period.
Calling a plan's period an "accounting period" is wrong against the statute, not
merely inelegant — and it is the same conflation behind the signature-date
defect in this milestone, where the accounting's backward-looking rule was
applied to a forward-looking plan.

The app's own dashboard already says "reporting period" for Plan types
(`dashboard/view-model.js:106-109`), so the correct term is already in use
elsewhere in the product.

### Decision — SETTLED 2026-09-23 by statute: Option 1

Say **"reporting period"** for the Plans and keep "accounting period" for the
accountings, matching both the statute's distinction and the app's own existing
dashboard wording. The shared function already branches on filing type
(`legacy-app.js:7715-7716`), so the branch exists.

Three e2e snapshot strings change in the same commit
(`plan-initial-mount.spec.ts:45`, `plan-annual-mount.spec.ts:45`,
`plan-simplified-mount.spec.ts:47`) — that is where this will first appear as
failing tests.

**Superseded options, for the record:**

**Option 1 — Say "reporting period" for Plans, keep "accounting period" for
accountings (RECOMMENDED — CHOSEN).** The function already branches on filing type, so
the branch exists. *Filer sees:* wording that matches the form they are filling
in. *Cost:* one conditional; three e2e snapshot strings updated in the same
commit, which is where this change will show up as "failing" tests.

**Option 2 — Say "reporting period" everywhere.** Simpler, one string, no
branch. *Downside:* the accountings genuinely do have an accounting period, and
the Annual Accounting's own validator messages already say "Accounting Period
To" — so this would introduce a new inconsistency to remove an old one.

---

## 68I — Initial Plan asks for two dates that may be the same thing

### What a filer observes

The Initial Plan's Cover page asks for both *"Guardianship Inception Date"* and
*"Date Letters Were Signed"*, both required, with no explanation of how they
differ. The tester reports they are the same thing. A filer who believes that
must either enter the same date twice or guess at a distinction the form does
not explain.

### Evidence (source)

`src/features/plan-initial/index.js:284-285` — both rendered via `inpS(...)`
with the required flag set. `inpS()` takes no help-text parameter
(`legacy-app.js:5852-5861`), and no tooltip is wired to either field. The
data-model rows (`probate-guardian-data-model.csv:828-829`) carry only
migration-provenance notes, nothing distinguishing them.

### The court's form asks for both — decisive

`reference/plan-forms/plan-initial-original.pdf`, page 1, in the header block:

> **Guardianship Inception Date:** ______
> **Date Letters were signed:** ______
> **Indicate if this is a Successor Guardianship:** ______

The court's own form asks for both dates, adjacent, immediately followed by the
successor-guardianship question — which is the reason they can differ. The app
reproduces the form correctly. **The fields stay.**

The supporting reasoning below was worked out before the form was found and
independently reaches the same place.

### Also answered from statute and the Clerk's workslips — and the tester's premise is wrong

**The two dates can legitimately differ, so both fields must stay.**

The statute anchors every deadline to letters of guardianship being signed —
§744.362(1): *"within 60 days after her or his letters of guardianship are
signed"*; §744.367(1): *"within 90 days after the last day of the anniversary
month that the letters of guardianship were signed"*. It never defines a
separate "guardianship inception date", which is why the two look redundant.

But the Clerk's workslips track **several distinct sets of letters** for one
guardianship — parsed from the `GD*.docx` files:

- `Date of Letters:`
- `Date of ETG Letters:` (emergency temporary guardianship)
- `Date of Letters of Successor GD:`
- `Date of Amended Letters:`

So a **successor guardian's** letters are signed long after the guardianship
itself began. For that filer, "when this guardianship started" and "when my
letters were signed" are different dates, and §744.362(1)'s 60-day clock runs
from *their* letters — not from the guardianship's inception.

**The app already knows this case exists.** The Cover page asks *"Successor
Guardianship? (if applicable)"* immediately above these two fields
(`plan-initial/index.js:283`), and `state.js:330` groups all three together:
`inceptionDate`, `lettersSignedDate`, `successorGuardianship`.

**So the tester's report is accurate about their own filings and wrong as a
general rule.** For an original guardian the two dates coincide, which is most
filings — hence "they are one and the same". For a successor guardian they do
not, and collapsing them would destroy real information and mis-anchor the
filing deadline.

**What is actually defective is the absence of any explanation.** Both fields are
required, adjacent, and unlabelled as to how they differ, so a filer in the
common case reasonably concludes one is redundant — exactly as the tester did.

### Decision needed

**Option 1 — Keep both, explain the difference (RECOMMENDED).** Add help text:
the inception date is when the guardianship began; the letters date is when
*this guardian's* letters were signed, which differs on a successor
guardianship. *Filer sees:* why they are being asked twice. *Cost:* tooltip or
hint text on two fields. Note `inpS()` takes no help parameter
(`legacy-app.js:5852-5861`), so this needs the tooltip-capable variant.

**Option 2 — Keep both, and prefill the inception date from the letters date
unless it is a successor guardianship.** Same explanation, plus the app fills in
the common case. *Filer sees:* one less thing to type when the two coincide.
*Cost:* a prefill rule plus care that it never overwrites a value the filer
typed.

**Option 3 — Collapse to one field.** *Rejected on the evidence above* — it
would be wrong for successor guardianships and would mis-anchor the §744.362(1)
deadline. Recorded so the tester's suggestion is visibly considered rather than
ignored.

---

## Discovery note — found while verifying the above, not proposed for work

Recorded because §8.9 makes finding this a reporting obligation, not a licence
to fix it.

**The validation panel's markup is malformed.** `validationPanel()`
(`src/legacy-app.js:1449-1456`) opens `<summary class="validation-head">` and
closes it with `</div>`. The parser therefore closes the surrounding
`.validation-panel` element on that stray tag, leaving `.validation-groups` as a
**sibling** of the panel rather than a child.

Filer impact: **none visible.** The list renders and reads correctly. But any
CSS or test selector scoped as `.validation-panel .validation-group` will match
nothing — so this is a trap for future work on that panel, including several
tests this milestone's items would otherwise want to write. Worth fixing when
someone is next in that function; not worth a change of its own.

---

## Moved to Milestone 67 — the Inventory and restricted depositories

The tester reported: *"The inventory does not have a place for restricted
depository information."*

**This section previously closed that observation with no change.** That was
reversed on 2026-09-23: the requester read the tester as expecting a place for
it, and directed that the Inventory receive the same four-state bond/depository
question the Annual is getting. **It is now part of Milestone 67B**, not a
Milestone 68 item, because it is the same question on a second form rather than
a separate finding.

The reasoning that follows remains accurate and is kept because it constrains
how that work must be done — in particular, that nothing may be written into the
Inventory workbook, which has no cell for a receipt date and directs the receipt
document elsewhere.

**A note on how this was closed the first time.** I classified this observation
as needing no action on my own judgement and reported it as settled. That was a
decision to make as a recommendation, not one to take unilaterally — the
requester caught it ("Did I just notice that you closed them with no action?").
Recorded here because the same instinct would close the next observation the
same way.

The Guardian Inventory does capture restricted-depository information, per
asset rather than as a summary block: a *"Restricted?"* flag on each Schedule
B-1 and B-3 row (`guardian-inventory/index.js:824, 929`;
`probate-guardian-data-model.csv:198, 221`) feeding the bond calculation, which
the workbook totals as *"Cash Assets in RESTRICTED Depository"* and
*"Other Liquid Assets - Intangible Assets RESTRICTED"*.

What it does not have is a place for the depository **receipt**, and the court's
own Inventory workbook says why — its shared strings were parsed, and they
contain:

> ***Receipts of Depository are to be filed into the respective Case separate
> from the Inventory.***

and

> ***Updated Receipts of Depository are required when the name of the bank
> changes, the Guardian changes, or there is a change in the amount which is
> NOT the result of market fluctuations…***

So the receipt is a **separate filing by the court's own instruction**, not a
field missing from this one. Adding a receipt block to the Inventory would
invite filers to put it in the wrong place.

This differs from the Annual Accounting, which *does* ask for a depository
receipt date on its own form — which is why that one is a real item (67F covers
the field being unreachable; the four-state model below remains unscoped).

---

## Nothing carried forward

An earlier revision of this section recorded the restricted-depository / bond
four-state model as unscoped. **That is no longer true.** On 2026-09-23 the
requester directed that it be built alongside the non-blocking change, and
Milestone 67B was extended to cover it. Nothing from the tester's report is
now without an owner.
