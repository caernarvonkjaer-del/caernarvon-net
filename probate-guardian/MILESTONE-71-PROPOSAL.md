# Milestone 71: Filers the App Wrongly Blocks, and Figures That Disagree With the Court's Own

## Status

**Approved for build, 2026-09-29.** The requester approved the whole milestone
by name ("Begin the MS 71 work"): 71A–71E, in the order below, with the full
regression at the end. Until then this was a Draft that authorized no change.

**The design decisions are settled.** On 2026-09-29 the requester (Alan)
answered every design question this document raises, and first asked for this
write-up instead of a build ("No. Write this up as Milestone 71 Proposal."). Two rounds of independent review the same day (Codex)
found gaps. Each claim was checked against source; the four that needed a
decision were put to the requester and answered (D9–D12), and the rest were
corrected in the design. See [Independent review](#independent-review-2026-09-29)
and [Risks accepted](#risks-accepted-and-what-this-milestone-does-not-fix).

**Legacy data is proportionate (D13).** The requester confirmed on 2026-09-29
that the app is in production as a test system only, then set the rule now in
AGENTS.md §8 item 2: migrations are allowed, nothing is broken *silently*, and
compatibility work that only test-era data would need is skipped when its cost
is visible and one-time. Under that rule the earlier draft's on-open
normalization (D8), its activity-log entry, and the pre-60K import reader are
withdrawn. Each skip is visible: an old test-system Starting Balance shows its
long number until re-entered, and a pre-60K share imports as a flagged 5,000%.

Progress is in each item's Build record. The one item that was marked
**OPEN** -- the exact wording of one printed sentence in 71B -- closed on
2026-10-01: the requester decided no sentence is printed, and the PDF leaves
the attorney block blank as the Clerk's forms do (Milestone 72D). The decisions are recorded under each item and summarized in
[Decisions already made](#decisions-already-made).

Listed in build order. 71A has no source changes and may run alongside 71B;
everything else is sequential because the items share files (see
[Build order and file overlap](#build-order-and-file-overlap)).

| # | Item | Subject | Decision | Build |
| --- | --- | --- | --- | --- |
| 1 | 71A | Measure how the Clerk's workbook displays a half cent, in Microsoft Excel itself | **DECIDED** — measure before choosing the rounding rule | **Done** 2026-09-29 — Excel = 15 significant digits, half away from zero (Appendix B) |
| 2 | 71B | Filers who need no attorney are blocked on five of the nine forms | **DECIDED** — attorney optional when blank; ask the basis; the guardian who served the copies signs the certificate of service | **Built** 2026-09-29 (see its Build record) |
| 3 | 71C | Every percentage field is secretly a money field: 150% accepted, "-10" silently becomes 10 | **DECIDED** — a real percent field, 0–100; an out-of-range share is an ordinary, bypassable error; imported share cells read as the workbook stores them | **Built** 2026-09-29 (see its Build record) |
| 4 | 71D | Ward's %: a wrong on-screen instruction, and three different answers for a blank share | **DECIDED** — fix the text; a blank share counts as 0%, as in the court's workbook, and prints as blank, not "100%" | **Built** 2026-09-29 (see its Build record) |
| 5 | 71E | The app rounds money three different ways; carried balances are unrounded and inconsistent | **DECIDED** — one rounding rule matching the Clerk's workbook (per 71A); carry Line 30 and warn on mismatch; never carry the estate's net assets into or out of a Trust Accounting; keep negative balances | **Built** 2026-09-29 (see its Build record) |

### Provenance

A QA pass against the TEST SYSTEM build (bundle `assets/index-DkTncZKp-v2.js`)
on 2026-09-29, reported in `guardian-forms-qa-report.md` (untracked in the
repository root as of this writing), listed 32 bugs, 7 accessibility findings
and 40 UX items. The requester had the report reviewed against source, then
asked whether its four confirmed P0s — **BUG-07, BUG-02, BUG-03 and BUG-05** —
were bigger than the report suggested. They were. Every item here is that
deeper trace:

| Report item | What the report said | What tracing it found | Here |
| --- | --- | --- | --- |
| BUG-07 | Simplified Accounting requires an attorney | **Five of nine forms** require one unconditionally — Simplified, Initial Inventory, Annual, Final and Trust Accounting — including when Type of Guardianship is "Guardian Advocate", which Rule 5.030(a) exempts. The Minor Plan's sidebar also contradicts its own validator. | 71B |
| BUG-02 | D-1 says "1 = 100%"; the math treats 1 as 1% | The same wrong instruction is on the Help page, and contradicts the same form's own caution note. The share rule is implemented in six places that give **three different answers for a blank share**; after an override the filed PDF prints a column that does not foot. | 71D |
| BUG-03 | Ward's % over 100 accepted | **There is no percent field type.** Every share input is a money input; the money sanitizer deletes minus signs and has no ceiling. A `'percent'` kind is declared in the form contract and implemented nowhere. 17 share fields across 4 forms. | 71C |
| BUG-05 | Carried Starting Balance is a raw float | **Four** carry paths all carry an unrounded float; two different definitions of "ending balance"; and the app has **three rounding methods that disagree on half cents** — the root of BUG-04's one-cent mismatch too. The Clerk's audit work slip lists any starting/ending mismatch as a discrepancy. | 71A, 71E |
| BUG-04 | Round each line before summing | That fix would **violate** the rounding contract the requester approved 2026-09-20 for the Inventory (sum unrounded, round only at display — `src/core/format/money.js:14` states the same rule for every form) and diverge from the Clerk's workbook, which has no `ROUND()` anywhere. The real defect is display rounding. | 71A, 71E |
| BUG-25 | Blank Ward's % counts as 100% but is flagged at export | Folded into 71D's single blank-share rule. | 71D |

### What this milestone covers, and what it does not

**Covered:** BUG-02, BUG-03, BUG-04, BUG-05, BUG-07 and BUG-25, plus the
defects found while tracing them (the Help-page instruction, the D-1/D-5 PDF
row builders, the Ward's % column printing a blank share as "100%", the Minor
Plan sidebar, the Annual→Final $0 carry, the inventory/annual PDF rounding
split, the mount-time clamp that erases negative shares and negative balances,
and the Annual validator reading a $0.00 Starting Balance as missing). One part
of BUG-08 is covered too: 71E stops carrying the estate's net assets into a
Trust Accounting (D9).

**This is not a remediation of every item the report rated P0.** The report
rated eight items P0. On 2026-09-29 the requester named four of them — BUG-07,
BUG-02, BUG-03 and BUG-05 — as the real P0s, and this milestone is built around
those. Of the other four, BUG-04 is covered (it has the same root cause as
BUG-05); **BUG-01 and the rest of BUG-08 remain open**; BUG-06 is the Clerk's
own template text. Release notes for any part of this milestone must not
describe the report's P0 list as closed.

**Not covered, and why:**

| Report item | Why not here |
| --- | --- |
| BUG-06 (attestation "of the Guardian [ward]") | **Not an app defect.** The Clerk's own workbook prints exactly this: `PART IV, V` B22 "…accounting of the Guardian ____", with the blank (B24) labelled "Ward's name" (B23) and filled by `=Name_of_Ward`. The Simplified workbook is the same (`PARTS V, VI` B8–B10). A question for the Clerk, listed in [Questions for the Clerk](#questions-for-the-clerk). |
| BUG-22 (Simplified certificate cites §744.362(1)) | The citation is the Clerk's own text (`PARTS V, VI` B25). Listed for the Clerk. The "None listed. on this date" punctuation is a real app defect but unrelated to this milestone. |
| UX-35, UX-36 (hidden `Acerno_Cache_XXXXX` sheet; sheet name `B-3 INTANGIBLE pg 1;`) | Both are in the Clerk's templates. Removing or renaming a sheet is AGENTS.md §10 P1's positional-index hazard. For the Clerk to fix in the template. |
| Legal Q-04 (bond wording vs math) | **Answered by the workbook:** `PART IX` B11 "Bond Calculation consists of liquid assets: all cash, personal property or intangible assets. Only real property is not considered liquid." The app matches. Closed. |
| Legal Q-03 (audit-fee base) | The workbook's fee table (`PART II, III` rows 13–17) lists tiers by "value" with no base formula; net vs gross is a legal question for the Clerk. |
| BUG-08, except the carry (Trust Accounting never identifies the trust) | 71E only stops the wrong carry (D9). Choosing which Part VIII trust a Trust Accounting reports on, carrying its identity, and computing its starting figure need their own design: the Clerk's trust work slip starts a first trust accounting from "the disbursement amount on the annual accounting", which is not Part VIII's value. Still open; still rated P0 by the report. |
| BUG-01, BUG-09, BUG-10, BUG-12, and all other report items | Separate defects with separate root causes. BUG-09 (title-case) and BUG-01 (positive loss; the report rated it P0) are confirmed from source and are good candidates for a follow-on milestone. BUG-10's likely cause is a load race, not two gate functions, and needs a reproduction first. |
| Found while reviewing: the Part VIII trust amount prints as a date in Excel | The Clerk's `PART VIII` formats D16, D17 and D18 (type, percentage and amount of the trust) as dates (`[$-409]mmmm d, yyyy;@`, parsed). The exporter writes the percentage as text, which displays as typed, but writes the amount as a number (`annual-accounting/excel.js:467-468`). **Confirmed by 71A in a real export:** a trust amount of $80,000 displays as "January 11, 2119" ([Appendix B](#appendix-b--excel-rounding-measurement)). The fix is a separate item and a Clerk question. |
| Found while reviewing: activity-log entries tagged with the wrong filing | `appendAuditLogEntry()` (`src/core/activity/audit-log.js:46`) replaces an explicit `wardId` with the active filing's, so an entry about another filing (for example `PARTY_SYNC` on a closed filing) is tagged with whichever filing is open. That matters for single-filing exports. Found while designing D8's log entry, which D13 withdrew; the fix is a separate item. |

---

## Decisions already made

All on 2026-09-29, by the requester, answering choice prompts (AGENTS.md §3).
The recommended option was chosen every time except D8 (since withdrawn by
D13). D9–D12 were asked after the independent review. D13 is a statement of
fact from the requester, not a choice prompt.

| # | Question | Answer | Governs |
| --- | --- | --- | --- |
| D1 | On the Inventory and Accountings, when may a filer leave the attorney blank? | Whenever none is entered (as AGENTS.md §4 already says) | 71B |
| D2 | Which rounding should every printed figure and carried balance use? | Match the Clerk's workbook — the requester's AGENTS.md §5 approval, **contingent on 71A's measurement** | 71A, 71E |
| D3 | On the Annual/Final/Trust Accountings, what does a blank Ward's % count as? | 0%, like the workbook — AGENTS.md §5 approval (a change toward the template) | 71D |
| D4 | **Re-asked** (the Clerk's work slips showed D1 had a cost it was not asked against — AGENTS.md §3): how should an attorney-less Inventory/Annual/Final/Trust filing behave? | Optional, and the form asks the basis (Guardian Advocate / court order waiving representation, with its date / the guardian is a Florida attorney). An unanswered basis is a non-blocking reminder, never an export block. | 71B |
| D5 | Who signs the certificate of service when there is no attorney? | The guardian | 71B |
| D6 | Which prior figure becomes the new filing's Starting Balance? | Line 30; Line 20 only when the prior filing has no Schedule D at all; warn when the prior's Line 20 and Line 30 differ; always from the latest (amended) version. **Narrowed by D9** for Trust Accountings. | 71E |
| D7 | When a share is outside 0–100, can the filer still export with "Continue despite outstanding requirements"? | Yes — an ordinary, bypassable validation error | 71C |
| D8 | Existing filings may store a raw carried Starting Balance such as `797229.1849999999`. What happens to it? | ~~Normalize it to cents on load~~ **Withdrawn (D13):** there are no existing filings to normalize. New carries are rounded by D6 | — |
| D9 | **D6 re-asked** (the Clerk's trust work slip showed D6 had a cost it was not asked against — AGENTS.md §3): what does a carry into or out of a Trust Accounting carry? | Nothing. Annual/Final/Inventory/Simplified → Trust, and Trust → any other type, leave Starting Balance blank, with a note quoting the work slip. Trust → Trust carries under D6. The rest of BUG-08 is a follow-on. | 71E |
| D10 | How is an imported share cell above 1 read, when the Clerk's workbook stores 150% as `1.5` and pre-60K exports of this app stored 50% as `50`? | The way the workbook reads it: every share cell is a fraction. `1.5` imports as 150% and is flagged (D7); a cell holding `50` imports as 5,000% and is flagged. Nothing is silently rescaled. (No pre-60K export exists to be affected — D13.) | 71C |
| D11 | With no attorney and co-guardians, who signs the certificate of service? | One guardian: the one who served the copies. The form asks which guardian only when there is more than one. | 71B |
| D12 | A ward whose debts exceed their assets has negative net assets; today the Starting Balance box strips the minus and opening a filing turns a carried negative into $0. Fix it in 71E? | Yes — Starting Balance accepts and keeps a negative figure on the Annual family and the Simplified Accounting | 71E |
| D13 | Must any existing filing, case file or exported workbook be preserved or migrated? | **Proportionately** (requester, 2026-09-29; AGENTS.md §8 item 2): the app is a test system only. Migrations are allowed, nothing may break silently, and compatibility work is skipped when its only cost is visible and one-time. | All items |

---

## Independent review (2026-09-29)

Codex reviewed the draft and recommended approving 71A as a measurement task
and holding 71B–71E until four areas were tightened. Each claim was checked
against source before anything here changed (AGENTS.md: a reviewer's findings
are claims, not facts).

| # | Review said | Checked against source | What changed |
| --- | --- | --- | --- |
| 1 | 71B's certificate decision is unsettled: Rule 2.516 unread, Clerk unconfirmed; make Clerk confirmation a **release gate**. Guardian #1 as signer is unexplained. | **Rule 2.516 read** (official text as of July 1, 2026, Florida Bar; quoted in 71B). (a): "**The filer of a document** must serve it"; (f): "**A person** establishes prima facie proof of service by including" five elements. Only the sample certificate ends "Attorney at Law". Guardian #1: confirmed unexplained. | D5 now rests on the rule's text, not only on inference. **The release gate was not adopted.** The requester weighed "ask the Clerk first" under D5 and rejected it because it keeps these filers blocked, and a release gate has the same cost. The Clerk question stays open for wording and practice. Signer: **D11**. |
| 2 | `sanitizeNegativeAmounts()` clamps negative shares on mount, contradicting 71C; Excel `1.5` (150%) can't be told from a legacy 1.5%. | **Confirmed**, and wider than stated. `form-runtime.js:41-47` clamps `wardPct` on D-1 to D-4 every time an Annual, Final or Trust form opens, but not on D-5 or Part VIII. (`wardPercent` is in its list but never matches, since it only walks `schD*` rows.) Line 48 clamps `startingBalance` the same way on those forms and on the Simplified Accounting. Both importers read a cell above 1 as a legacy 0–100 value. A cleared money field stores `0`, not blank (`form-contract.js:555`). | 71C design rewritten. The clamp comes off shares; the percent kind keeps blank as blank. Import reading: **D10**. The design's claim that "a negative share cannot exist in saved data" was wrong and is corrected. |
| 3 | 71D misses Part VIII; blank **and unreadable** read as 100% in `pct()`. | **Confirmed**, and wider than stated. The Ward's % column prints a blank share as **"100%"** on all six tables (`pdf-model.js:686, 724, 758, 798, 838, 997`), not only Part VIII. After D3 alone, a blank D-1 row would print "100%" beside $0.00. | 71D adds the column fix. Unreadable is defined as 0% plus a validation error. Part VIII's share feeds no arithmetic, so there it is a print fix and 71C's range check. |
| 4 | 71E's persisted contract is underspecified: string vs number; exact `startingBalanceCarry` rows; log idempotency; "no Schedule D"; amended versions. | **Confirmed.** The draft said "two-decimal string", but every edit stores a number, and the mount clamp converts a carried string to a number anyway. The Annual validator then reads a number `0` as missing (`index.js:1545`). The log is saved inside the `.sav` with the data (`audit-log.js`), so an unsaved normalization and its entry are lost together. `headlineTotal()` tests computed ward-share totals, which 71D's blank-share rule would change. The app has no amendment versions, only a per-filing `amendedForm` flag. | 71E design steps 4, 7, 8 and 9 and the data-model rows rewritten. |
| 5 | 71A may overgeneralize: record the Excel build, locale, formats and widths; widen the sample. | **Fair.** Also checked: every money total cell read in all three templates uses the same format, `"$"#,##0.00_);("$"#,##0.00)` (numFmtId 7). | 71A method widened to a sweep. It records build, locale and formats, and treats a `####` reading as a failure. |
| 6 | Say plainly that this is not a complete P0 remediation; BUG-01, BUG-06, BUG-08 remain. | **Fair**, with one correction: the requester's triage named four real P0s, and BUG-06 is the Clerk's template text. **BUG-08 is closer than the draft said:** its wrong carry is one of 71E's four carry paths. | Scope statement added; D9 takes the carry part of BUG-08. |

**Second round, the same day.** Codex re-reviewed the revision, agreed the
first round's gaps were closed, and raised five more. Checked the same way:

| # | Review said | Checked against source | What changed |
| --- | --- | --- | --- |
| 7 | D12 misses a generic input guard: `setupAmountFieldValidation()` treats IDs containing `starting` as non-negative, so the boxes may still strip a typed minus. | **Not as stated.** The guard runs after every page mount (`router.js:212`), but it selects only `input[type="number"]` (`form-runtime.js:21-22`), and `renderFormField()` draws every amount as `type="text"`. The Simplified box is hand-written `type="text"` too. It reaches neither box. **The concern underneath is real,** through the layer in row 8. | The guard is recorded as not reached and left alone. D12's tests now type `-5000` into the real box with the keyboard, as Codex asked, so any layer that strips the minus fails them. |
| 8 | `signed-money` needs renderer/runtime treatment: rendering, input mode, drafts, blur, delegated writes. | **Confirmed, and wider.** `renderFormField()` has no signed or percent branch: a passed kind changes nothing, `type:'number'` is stamped `decimal`, and every amount is drawn through `sanitizeNonNegativeDecimal()`. The same gap sinks 71C. The Inventory's shares are written by **`bindForms()`** (`guardian-inventory/form-binding.js:72-88`), which `form-contract.js` never sees, and which strips the minus and stores `parseFloat(val) \|\| 0`. | 71C design step 1 is now a layer-by-layer table covering the renderer, kind resolution, live filter, blur, `bindForms()`, the mount clamp and the guard, for both `percent` and 71E's signed Starting Balance. The blank-keeping rule is a per-field opt-in, so Schedule C/E are untouched. |
| 9 | D11's `partyId` reference is not implementable; guardian rows carry none. | **Confirmed.** No row factory carries an id; `guardianPartyIds` is a parallel array filled only for slots linked to a party. The repository has already solved this: `preparer-flag.js` (Milestone 67A) rejects an index for this exact reason and stores a flag on the row. | D11 stores `guardians[i].certifiesService`, the `isPreparer` pattern. No ids, no migration. |
| 10 | Quote Rule 2.516(d)(3): a person serving makes the filer's representations. | **Substance right, citation wrong.** Rule 2.516(d) is "Oversized Documents". The language is **Rule 2.515(d)(3)**. Rule 2.515(a) (unrepresented parties sign what they file or serve) is relevant too. | Both quoted in 71B, with the limit stated: neither settles local Clerk practice. |
| 11 | Add the Rule PDF to `reference/` now, not when 71B lands. | Agreed: the proposal cites it as authority. | Added at `reference/legal/statutes/Florida-Rules-of-General-Practice-and-Judicial-Administration-07-01-26.pdf`, with `reference/README.md` (source URL) and `file_index.md`. |
| 12 | Keep residual risks visible. | Agreed. | [Risks accepted](#risks-accepted-and-what-this-milestone-does-not-fix), below. |

**Superseded by D13.** Both rounds were answered on the assumption that
existing filings and exported workbooks had to be preserved. The requester has
since confirmed they do not (D13). What rows 2 and 4 added for legacy data —
71E's on-open normalization (D8) with its activity-log entry, tagging
workaround and once-only guarantee, and D10's cost to pre-60K Inventory
exports — has been removed. The rest of what those rows found (the mount clamp,
the importers' above-1 rule, number vs string, "no Schedule D", amendments)
concerns new data too and stands.

## Risks accepted, and what this milestone does not fix

Each of these is a cost the requester chose, or a defect deliberately left
out. None may be described in release notes as solved.

| Risk | Accepted by | What a filer sees | Where it must stay visible |
| --- | --- | --- | --- |
| **The guardian's certificate of service is app-authored filed text the Clerk has not reviewed.** Rules 2.515 and 2.516 support a guardian certifying service; neither establishes what the Pinellas Clerk accepts or the wording it prefers. Releasing before the Clerk answers is a conscious **local-practice risk acceptance**, not a legal determination. | D5, D11; release gate declined | A certificate signed by the guardian, in the app's wording | Release notes; [Questions for the Clerk](#questions-for-the-clerk) 1–2; 71B's legal framing |
| **Inventory → Annual now carries a Starting Balance where it carried none.** Justified by Rule 5.696(b)(1), and what the draft wrongly said already happened, but still a behavior change a returning filer will notice. | D6 as corrected | A prefilled Starting Balance on a converted first Annual | Release notes; `describeConversion()`'s text; `filing-conversion.characterization.spec.ts` and 71E's `carried-balance.spec.js` |
| **A Trust Accounting starts with a blank Starting Balance.** D9 stops a wrong figure without supplying the right one. | D9 | A blank box and a note quoting the work slip | Release notes; BUG-08 stays open |
| **The Part VIII trust amount prints as a date in Excel.** Confirmed by 71A ($80,000 → "January 11, 2119"). | Not in scope | A date instead of the trust amount in the exported workbook's Part VIII | [Not covered](#what-this-milestone-covers-and-what-it-does-not); Clerk question 7 |
| **Activity-log entries about another filing are tagged with the open filing.** Untouched by this milestone, which (after D13) writes no activity-log entries. | Not in scope | Single-filing exports can include or omit the wrong entries | [Not covered](#what-this-milestone-covers-and-what-it-does-not) |
| **BUG-01 and the rest of BUG-08 remain open**, both rated P0 by the report. | Requester's triage | Unchanged | [What this milestone covers](#what-this-milestone-covers-and-what-it-does-not) |

---

## Build order and file overlap

AGENTS.md §2: a stated prerequisite usually means real file overlap. It does
here.

| File | 71B | 71C | 71D | 71E |
| --- | :---: | :---: | :---: | :---: |
| `src/features/annual-accounting/index.js` | ✓ | ✓ | ✓ | ✓ |
| `src/features/guardian-inventory/index.js` | ✓ | ✓ | | |
| `src/features/simplified-accounting/index.js` | ✓ | | | ✓ |
| `src/features/annual-accounting/pdf-model.js` | ✓ | | ✓ | ✓ |
| `src/features/annual-accounting/totals.js` | | | ✓ | ✓ |
| `src/core/status/completion.js` | ✓ | ✓ | | |
| `src/core/filing/output-preflight.js` | ✓ | | | ✓ |
| `src/core/form/form-contract.js` | | ✓ | | ✓ |
| `src/core/form/form-fields.js` | | ✓ | | ✓ |
| `src/core/form/form-runtime.js` | | ✓ | | ✓ |
| `src/features/guardian-inventory/form-binding.js` | | ✓ | | |
| `src/core/filing/models/*.js` (guardian row factories) | ✓ | | | |
| `src/features/annual-accounting/excel.js` | | ✓ | | ✓ |
| `src/core/format/money.js` | | | ✓ | ✓ |
| `probate-guardian-data-model.csv` | ✓ | ✓ | ✓ | ✓ |

Every pair of 71B–71E shares at least one file, so they run strictly in order.
**71A touches no source file** and may run alongside 71B, but must finish
before 71E starts: 71E's rounding function is specified by 71A's measurement.

---

## 71A — Measure how the Clerk's workbook displays a half cent

### What a filer observes

On the QA dataset (a 50% share of $40,000.01), the Annual Accounting prints
**Line 20 $797,229.19** and **Line 30 $797,229.18**, then says they are equal.
The same filer's next filing carries `797229.1849999999` as its Starting
Balance. The Clerk's audit work slip then compares that Starting Balance to the
prior filing's ending balance and lists any difference as a discrepancy
(`GD ANN WORK SLIP AUDIT.docx`: "If the balances are not the same, list as a
discrepancy").

### Why measure before building

The requester decided (D2) that the app should print what the Clerk's workbook
prints. What the workbook prints is a property of Microsoft Excel, not of the
workbook's formulas: the workbook has no `ROUND()` anywhere (verified by parsing
all sheets of `templates/annual-template.js`; zero matches), so every total is
an unrounded double that Excel rounds only when it displays it.

The app's three rounding methods already disagree with each other on exactly
these values (measured in Node 24.16.0, 2026-09-29):

| Value | `r2()` / `Math.round(x*100)/100` | `toLocaleString` / `Intl.NumberFormat` | `toFixed(2)` |
| --- | --- | --- | --- |
| `797229.1849999999` (the QA total) | **797,229.19** | **797,229.18** | 797,229.18 |
| `20000.005` (= `40000.01 * 0.5`) | 20,000.01 | 20,000.01 | 20,000.01 |
| `1.005` | **1.00** | **1.01** | 1.00 |
| `2.675` | 2.68 | 2.68 | **2.67** |
| `1234.565` | 1,234.57 | 1,234.57 | 1,234.57 |

Excel is believed to display a value by first reducing it to 15 significant
decimal digits and then rounding that decimal half away from zero — which would
print `797229.1849999999` as **.19** and `1.005` as **1.01**, agreeing with no
single one of the app's three methods. **That belief is unverified.** Building
71E on it without measuring would repeat the mistake the report made with
BUG-04: a confident fix to the wrong rule.

### Method

Desktop Excel is installed on the development workstation
(`C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE`, confirmed on
disk 2026-09-29). Drive it through its COM automation interface from
PowerShell, read-only, and record what Excel **displays** (`Range.Text`), not
what it stores (`Range.Value2`).

0. **Record the conditions** the display depends on: Excel's
   `Application.Version` and `Application.Build`; the decimal and thousands
   separators Excel is using (`Application.International`, and whether
   `UseSystemSeparators` is on); the Windows regional format. A result is only
   claimed for those conditions.
1. **Controlled workbook.** Create a scratch workbook in Excel itself with:
   - literal values: every value in the table above, their negatives, and
     `0.125`, `0.005`, `-0.005`, `999999999.995`;
   - **a sweep**, not a sample: a generated column of half-cent values at every
     power of ten from `0.005` to `999,999,999.995`, with several digit patterns
     at each magnitude (`…0.005`, `…1.005`, `…4.565`, `…7.675`), and their
     negatives. Several hundred cells, written and read by the script;
   - formula chains that produce the same doubles the app produces:
     `=40000.01*0.5`, a `SUM` over the QA dataset's five Part VII column values,
     and share products `=full*pct` for shares 0.5, 0.25, 0.333333, 0.125 over
     amounts ending in odd cents. These are the values that land a hair above or
     below a half cent, where the methods disagree;
   - each cell formatted with the **exact number format** the Clerk's templates
     use for money totals. Already read with a parser (2026-09-29): every total
     checked in all three templates uses the same format, numFmtId 7,
     `"$"#,##0.00_);("$"#,##0.00)`. That covers Annual `'PART VI, VII '!I8`,
     `I20`, `I30` and `'SCH D-1 CASH p1'!K25`, `K59`; Inventory
     `'A-1-REAL ESTATE pg 1'!I17` and `'SUMMARY I '!H39`; and Simplified
     `'PARTS I, II '!H19`. Share cells are `0.00%` (numFmtId 10). Also measure
     under General and `#,##0.00`, so it is known whether the result depends on
     the format;
   - columns set wide enough for every value. A `.Text` of `####` means the
     column was too narrow; it is a failed reading, never a value.
2. **The real thing.** Export the QA dataset's Annual Accounting from the
   running app (a throwaway Playwright script against the local dev server, the
   same way Milestone 67's Appendix A did), open the `.xlsx` read-only in Excel,
   force a full recalculation (`Application.CalculateFull()`), and read
   `.Text` for `'PART VI, VII '!I20` and `I30`, `'SCH D-1 CASH p1'!K59`, and the
   D-1 line holding the half-cent share. Do the same for an Initial Inventory
   and a Simplified Accounting export (their total cells above). **While the
   Annual export is open**, also read `'PART VIII'!D17` and `D18` for a filing
   with a trust. This confirms or clears the provisional finding that the
   Clerk's date format shows the trust amount as a date
   ([Not covered](#what-this-milestone-covers-and-what-it-does-not)).
3. Close without saving; quit Excel; delete the scratch script. Nothing is
   written to the repository except the results table, which goes into
   **Appendix B** of this document.

### Output

A table, value by value: the double, what Excel displays, and what each of the
app's three methods produces. From it, the rounding function 71E implements is
written down **as a specification**, including the case the table decides —
whether Excel rounds the 15-digit decimal half away from zero, half to even, or
otherwise.

**Decision point.** If Excel's displayed values cannot be reproduced by a
deterministic function of the stored double alone (for example, if the display
depends on the format string in a way the app cannot mirror), 71E stops and the
requester is asked again, per AGENTS.md §3 ("Re-ask an already-answered
decision if its cost changed"). D2 was answered on the premise that matching is
possible.

### Acceptance

Appendix B holds the recorded conditions (step 0), the measured table, and the
rounding specification. **The specification reproduces every cell of the sweep
and every real-export cell exactly**. Any cell it gets wrong is listed, and a
single disagreement triggers the decision point above rather than a
special case. Every row of the table becomes a case in 71E's
`tests/unit/money-rounding.spec.js`, and the sweep becomes a generated
table-driven case in the same spec.

### Cross-cutting checklist (AGENTS.md §8)

No source, data-model, fixture, test-index, export, security, or UI change.
Legal framing: none — this measures a display behavior. Cross-form: the
measurement covers all three workbooks' total cells (step 2), and the format
is the same in all three (step 1), so one function can serve every form. If
71A finds otherwise, that too is the decision point.

### Build record — DONE 2026-09-29

Measured on the development workstation (Excel 16.0.19127.20752, en-US).
Results and the specification are in [Appendix B](#appendix-b--excel-rounding-measurement):
the rule "15 significant digits, then half away from zero" matched Excel on
all 3,480 controlled cases and all 322 visible money cells of three real
exports. `r2()` missed 1,712 of the controlled cases, `toFixed(2)` 1,648, and
`toLocaleString` 3. The decision point did not trigger. Nothing in the
repository changed except this document. The Part VIII date-format finding
was confirmed from a real export (trust amount $80,000 shown as
"January 11, 2119").

---

## 71B — Filers who need no attorney are blocked on five of the nine forms

### What a filer observes

**A pro se guardian filing a Simplified Annual Accounting** — which
§744.3679(3) says needs no attorney — cannot finish. The Cover shows "Attorney
for Guardian *"; Part V shows Bar Number *, Phone *, Primary Email *, Street *,
City/State/Zip *; Part VI requires an attorney's signature on the certificate
of service. Export stays blocked until the filer overrides it, and the filed
PDF then carries an empty attorney attestation.

**A guardian advocate** (Chapter 393) filing an **Initial Inventory** or an
**Annual, Final or Trust Accounting** meets the same wall — even after choosing
"Guardian Advocate" as the Type of Guardianship on that very form's Cover.
Probate Rule 5.030(a) exempts guardian advocates from representation. So does
the Clerk's own review checklist ("Guardian shall be represented by an attorney
pursuant to Florida Probate Rule 5.030, **except for Guardian Advocate**").

**A pro se filer of an Annual Plan — Minors** can export (the validator is
conditional) but the sidebar never shows the Preparer & Attorney section
complete, so filing progress never reaches 100%.

### Evidence (verified against current source, not inferred)

| Form | Where attorney fields are required | Condition |
| --- | --- | --- |
| Simplified Accounting | `src/features/simplified-accounting/index.js:709` (Cover), `:755-762` (Part V bar, phone, email, street, city/state/ZIP), `:771-777` (Part V signature), the Part VI certificate signature check that follows `:797` | **None — always** |
| Simplified Accounting, required markers | `index.js:402` (Cover `inpS(..., true)`), `:568-573` (Part V) | Always shown |
| Initial Inventory | `src/features/guardian-inventory/index.js:1272` (Cover "Attorney for Guardian"), `:1337` (D-2 attorney name + signature), `:1397` (D-5 service attorney name + signature) | **None — always** |
| Initial Inventory, required markers | `index.js:708` (Cover), `:1128-1131` (D-2), `:1234-1236` (D-5), all `reqLabel(...)` | Always shown |
| Annual, Final, Trust Accounting (one engine) | `src/features/annual-accounting/index.js:1622-1629` (Part V bar, phone, email, street, city/state/ZIP), `:1634-1640` (Part V signature, with name), Part X certificate signature (`:1672` onward) | **None — always** |
| Initial Plan | `src/features/plan-initial/index.js:784-810`, via `src/core/validation/attorney-block.js` | Only once an attorney is started — **correct** |
| Annual Plan | `src/features/plan-annual/index.js:788` (`if(d.attorney)…`) | Conditional — correct |
| Annual Plan — Minors | `src/features/plan-minor/index.js:508-530` | Conditional — correct in the validator |
| Annual Plan — Minors, **sidebar** | `src/core/status/completion.js:527` (`'pm-p7'` requires preparer name, attorney name and date) | **None — always.** Contradicts the validator above |
| Simplified Accounting, sidebar | `completion.js:120` (`'s-cover'` requires `D.attorney`), `:127-129` (`'s-p5'`) | Always |
| Annual/Final/Trust, sidebar | `completion.js:180-181` (`'a-p5'`) | Always |
| Initial Inventory, sidebar | `completion.js:85-95` derives section completion from the validator's routed errors | Follows the validator automatically |

"Guardian Advocate" is an option on all four affected Covers:
`src/core/form/guardianship-options.js:4`, imported by the Inventory, Annual and
Simplified features.

**Cause.** The correct conditional rule exists. `attorney-block.js` (Milestone
58C) answers "has this filer started entering an attorney?" and its own header
states the pro se / Guardian Advocate reason for it. But it was written for the
Initial Plan — its field list is `PLAN_INITIAL_ATTORNEY_FIELDS`, its function
`isPlanInitialAttorneyStarted()` — and was then followed form by form on the
other Plans only. The Inventory and Accounting validators were never brought
under it.

### Legal framing (AGENTS.md §8.8 — flagged, not resolved)

What the repository's own copies of the authorities say (verified 2026-09-29;
`reference/legal/statutes/`, Chapter 744 as downloaded 2026-09-23 and the
Florida Probate Rules dated 2026-07-16):

| Authority | Text |
| --- | --- |
| Fla. Prob. R. 5.030(a) | "Every guardian … shall be represented by an attorney admitted to practice in Florida. A guardian … who is an attorney admitted to practice in Florida may represent himself or herself … A guardian advocate is not required to be represented by an attorney unless otherwise required by law or the court." |
| §744.3679(3) | "The guardian need not be represented by an attorney in order to file the annual accounting allowed by subsection (1)." |
| Clerk's audit and trust work slips | "Signature, name, address, phone and Florida Bar number of attorney:" then "**Date of court order waiving representation of attorney**" and "'Waiver' may be in either the Order Appointing or in the Report and Recommendation of Magistrate which was approved by the Order." |
| Clerk's review work slip | "Guardian shall be represented by an attorney pursuant to Florida Probate Rule 5.030, except for Guardian Advocate." |

So an attorney-less filing is legitimate in four situations the materials in
the repository name: a Simplified Accounting; a guardian advocate; a guardian
who is a Florida attorney; and a guardian whose representation the court
waived. This milestone **does not decide** whether any particular filer falls
in one. It stops the app from deciding for them — the filer states the basis;
the Clerk checks it, as the work slips show the Clerk already does.

**On who signs the certificate of service.** §744.362(1), §744.367(3)(b), and
Rules 5.690(b)/5.695(b) say *who must be served*. Rule 5.695(b) adds "**The
guardian** shall serve copies on such other persons as the court may direct."
Rule 5.041 sends the mechanics of service to Florida Rule of General Practice
and Judicial Administration 2.516. The text below is from the Florida Bar's
official compilation dated July 1, 2026, now in the repository at
`reference/legal/statutes/Florida-Rules-of-General-Practice-and-Judicial-Administration-07-01-26.pdf`
(pages 169–175, extracted with `pdftotext -layout`; SHA-256 `a7fba18f…dbba2`):

| Rule | Text |
| --- | --- |
| 2.515(a) | "Every document filed or served must be signed by the attorney, **unrepresented party**, or other person authorized by law to file or serve the document as provided in this rule." |
| 2.515(d)(3) | "**Representation by Person Serving.** A person serving a document under rule 2.516 makes the same representations contained in subdivisions (d)(1) and (d)(2)." — (d)(1) includes that "the filer has complied with all rules of procedure regarding filing and service of the document"; (d)(2) that the signer "has read the document". |
| 2.516(a) | "**The filer of a document** must serve it on all other parties as provided in this rule unless: …" (five exceptions, none relevant here) |
| 2.516(b)(2)(A) | "**A party not represented by an attorney** must file and serve a designation of a primary e-mail address …" — the rule expects unrepresented parties to serve. |
| 2.516(f) | "**A person** establishes prima facie proof of service by including the following: (1) certification; (2) date of service; (3) name(s) of person(s) served (4) service address(es); and (5) method of service." |
| 2.516(f), sample | "The following sample certificate complies with this rule: 'I certify that on ….(date)….this document has been furnished to (here insert name(s) and service address(es) by (here insert method of service such as portal, e-mail, delivery, or mail). **Attorney at Law**'" |

So the duty to serve belongs to the filer, and an unrepresented party signs what
they file or serve. The person who serves takes on the same representations as
the filer. The certificate's validity comes from its five elements, and the rule
states it for "a person", not only an attorney; the attorney signature appears
only in a sample the rule says "complies". D5 and D11 are consistent with that
text.

**What this does and does not settle.** This is a reading of the rules for
deciding what the app lets a filer do, not a legal-sufficiency ruling
(AGENTS.md §8.8). It does **not** establish what the Clerk of the Circuit
Court, Pinellas County, accepts in practice, or the wording it prefers. That is
unverified and is asked in [Questions for the Clerk](#questions-for-the-clerk).
The certificate text the app prints for a guardian is app-authored filed text.
Releasing it before the Clerk answers is a **conscious acceptance of a
local-practice risk** by the requester (D5, and the release gate declined
below), not a legal determination that the wording is sufficient.

### Court-form authority (AGENTS.md §5 — template read, not assumed)

All three workbooks were parsed (`xml.etree.ElementTree`, 2026-09-29):

- **Certificates of service are attorney-only in all three.** Inventory
  `PART VI` (heading F5 "GUARDIAN ATTORNEY", B26 "Attorney Signature", J27
  `='SUMMARY I '!D24`); Annual `PART X` (F6 "GUARDIAN ATTORNEY", B24 "Attorney
  Signature", K25 `=Attorney`); Simplified `PARTS V, VI` rows 22–42 (same
  shape, J41 `='PARTS I, II '!D15`). None has a line for a guardian to sign.
- **Neither requiredness nor a waiver is expressible in a workbook.** The
  forms' silence on an unrepresented filer is consistent with Rule 5.030's
  default, not a rule against it. Making attorney fields conditional does not
  diverge from any template calculation.
- **The Excel output has nowhere to put a guardian's certificate signature.**
  Writing the guardian's name into the workbook's attorney cells would
  misstate who certified service, and several of those cells are formulas over
  defined names (`Attorney`, `Attorney_Bar_No`, `Attorney_Address`, …) that
  AGENTS.md §5 forbids overwriting. See the design, step 6.

### Decision — SETTLED 2026-09-29 (D1, D4, D5, D11)

- **D1/D4.** Attorney fields on the Initial Inventory and the Annual, Final and
  Trust Accountings are required only once the filer has started entering an
  attorney. When the attorney is blank, the form asks the basis:
  Guardian Advocate; court order waiving representation (with the order's
  date); or the guardian is a Florida attorney representing themselves. An
  unanswered basis is a **non-blocking** reminder in Preview & Export, never an
  export block. The Simplified Accounting asks no basis — §744.3679(3) is the
  basis.
- **D5.** With no attorney, the guardian signs the certificate of service.
- **D11.** One guardian signs: the one who served the copies. With
  co-guardians, the form asks which guardian that was; with one guardian, no
  question appears. *How the answer is stored* (design step 5) follows
  Milestone 67A's preparer flag, not an id or an index.

**Not a release gate.** The independent review suggested building 71B but not
releasing it until the Clerk confirms D5. That was not adopted. Holding the
release keeps pro se filers and guardian advocates blocked until an answer
arrives, which is the same cost the requester weighed and declined when
choosing D5 over *ask the Clerk first*. Rules 2.515 and 2.516, read since, support
D5. If the Clerk answers differently, the certificate's signer is one design
step (step 5) and can change without touching the rest of 71B.

Options not taken, kept as the record of what was weighed: *optional with no
prompt* (a filer without a waiver order would learn of it only from the Clerk's
discrepancy list); *required unless a basis is given* (closest to Rule 5.030(a)
but contradicts AGENTS.md §4 as written); *Simplified only* (the report's fix —
leaves guardian advocates blocked, contrary to Rule 5.030(a) and AGENTS.md
§4); for D5, *leave the certificate unsigned* (the Clerk checks "Certificate of
service filed?") and *ask the Clerk first* (leaves these filers blocked until
an answer arrives); for D11, *every guardian signs* (mirrors the verification,
but certifies service by people who may not have served) and *always
Guardian #1* (the draft's unexplained rule; fails when Guardian #1 did not
serve or is blank).

### Design

1. **Generalize `attorney-block.js`.** Keep `isPlanInitialAttorneyStarted()`
   as a thin wrapper so its callers do not change, and add
   `isAttorneyStarted(d, fields, signatureKeys)` with one exported field list
   per engine:
   - Inventory: `attorneyForGuardian`, `attorney.name`, `attorney.barNumber`,
     `attorney.phone`, `attorney.email`, `attorney.secondaryEmail`,
     `attorney.streetAddress`, `attorney.cityStateZip`,
     `attorney.signatureDate`, plus the D-2 attorney signature state. The D-5
     `serviceAttorney.*` block is **not** in the list: it names whoever certifies
     service, which (D5) may be the guardian.
   - Annual engine: `attorney`, `attorney_bar`, `attorney_phone`,
     `attorney_email`, `attorney_secondaryEmail`, `attorney_street`,
     `attorney_cityStateZip`, `attorney_signatureDate`, plus signature state.
   - Simplified: `attorney`, `attorney_barNumber`, `attorney_phone`,
     `attorney_email`, `attorney_secondaryEmail`, `attorney_street`,
     `attorney_cityStateZip`, `attorney_signatureDate`, plus signature state.
   The signature-state rule is the existing one: only a real signing method
   ("/s/" or Stamp) counts as started; the default and "Unsigned" do not
   (`inferLegacySignatureState()`).
2. **Condition every attorney requirement** in the three validators on that
   answer, exactly as `validatePlanInitial()` does.
3. **Conditional required markers.** Reuse Plan Initial's live-marker pattern
   (`syncAttorneyEmailRequired()`, `plan-initial/index.js:201`): the asterisks
   appear once an attorney is started and disappear when the block is cleared.
4. **The basis question** (Inventory Cover; Annual/Final/Trust Cover), shown
   only while no attorney is started:
   - *"No attorney is entered. Why is this guardian filing without one?"* —
     Guardian Advocate / Court order waiving representation / The guardian is a
     Florida attorney representing themselves.
   - *Court order waiving representation* reveals *"Date of the order"*,
     labelled with the Clerk's own note that the waiver may be in the Order
     Appointing or in an approved Report and Recommendation of Magistrate.
   - Tri-state, never coerced (AGENTS.md §4): blank means unanswered.
     Choosing "Guardian Advocate" as the Type of Guardianship **does not**
     auto-answer it; the form shows a hint pointing at the matching answer.
   - Unanswered → a Preview & Export advisory through the existing non-blocking
     channel (`output-preflight.js`, the one Milestone 67B's bond advisories and
     68C's plan-certificate advisories use). Never an `auto` readiness item:
     AGENTS.md §4 says every `auto` item maps to a real export error, and this
     is deliberately not one.
5. **The certificate of service with no attorney (D5, D11).** On Inventory
   D-5, Annual Part X, and Simplified Part VI:
   - while no attorney is started, the certificate's signer is **the guardian
     who served the copies**. With one guardian on the filing, that is the
     guardian, and nothing is asked. With co-guardians, each guardian card
     shows a checkbox, *"This guardian served the copies and signs the
     certificate of service"*. No box ticked means unanswered, and the app
     never defaults to the first guardian (AGENTS.md §4). Unanswered is an
     ordinary, bypassable export error on the certificate, like today's
     missing attorney signature;
   - **stored as a flag on the guardian's own row**,
     `guardians[i].certifiesService`, exactly as Milestone 67A stores
     `guardians[i].isPreparer` (`src/core/form/preparer-flag.js`). The reason
     is the one that file records. Guardian rows have **no stable id**: the
     row factories carry none, and `guardianPartyIds` is a parallel array
     that starts empty (`filing-registry.js:167`) and holds an id only for a
     slot someone linked to a party (`party-resolver.js:626`). Rows are also
     removed by position (`guardian-inventory/index.js:614`,
     `simplified-accounting/index.js:106`, `prune-cards.js:125-127`). A
     stored index or `partyId` would name the wrong person, or no one, after
     a delete. A flag travels with its row and disappears with it, so
     deleting the certifying guardian returns the filing to "unanswered".
     At most one guardian is flagged, enforced at write time the way
     `claimPreparer()` does it. No ids are added and nothing is migrated:
     an absent flag is `false`;
   - the chosen guardian's name and contact details print, read from the
     Guardian card, not re-typed, with the certificate's own signature control
     and date. If the chosen guardian's name is blank, the certificate reports
     a missing signer name, as an ordinary, bypassable error;
   - the certificate carries **all five Rule 2.516(f) elements**: certification,
     date of service, names served, service addresses, method. It uses the same
     recipient list, addresses and method fields the attorney certificate
     already uses. The build confirms each element prints on each engine's
     PDF, rather than assuming the attorney version has them all;
     **Correction (Milestone 72G, 2026-10-02):** half right, for the wrong
     reason. A method box existed on the Annual and the Simplified, but under
     a ward-status label ("Indicate if") and written into the workbook's
     ward-status box; the Inventory had none. 72G relabels it as the method
     on all seven certificates (adding the Inventory's), prints it on its own
     PDF line, and gives the ward's status its own dropdown;
   - the certificate's heading drops "GUARDIAN ATTORNEY" in the PDF only when
     the guardian signs;
   - once an attorney is started, today's attorney certificate returns
     unchanged. Existing attorney certificate data, and a guardian answer
     already given, are never deleted when either block is cleared
     (AGENTS.md §4, non-destructive toggling).
6. **The PDF says why there is no attorney.** In place of the Part V / D-2
   attorney attestation, the PDF prints one line stating the basis, e.g.
   *"The guardian is not represented by counsel: guardian advocate (Fla. Prob.
   R. 5.030(a))."* or *"…representation waived by court order dated
   MM/DD/YYYY."* On the Simplified Accounting: *"…a simplified accounting
   (§744.3679(3))."* ~~**OPEN (wording only):** the exact sentences, which are
   app-authored filed text — to be confirmed with the Clerk before release;
   the proposed wording above is the default.~~ **Closed 2026-10-01: no
   sentence is printed.** No Clerk form has wording for a filing without an
   attorney; the forms leave the attorney block blank, so the PDF does too.
   The reason is still asked on screen and filed nowhere (Milestone 72D).
7. **Excel.** With no attorney, the workbook's attorney cells stay blank and
   the formula cells stay formulas (AGENTS.md §5). When the guardian signs the
   certificate, a Save-as-Excel advisory says so: *"The court's workbook has a
   certificate-of-service signature line for an attorney only. The guardian's
   certificate prints on the PDF; file the PDF, or sign the workbook's
   certificate by hand."*
8. **Sidebar and readiness parity.** Update `completion.js` `'s-cover'`,
   `'s-p5'`, the Simplified Part VI key, `'a-p5'`, the Annual Part X key, and fix
   `'pm-p7'` to the Minor Plan validator's conditional rule. The Inventory's
   sidebar follows its validator without change. Re-read
   `src/core/filing/readiness-config.js` for every attorney item on the three
   engines and keep each `auto` item mapped 1-to-1 to an export error.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** Change `requiredness` from `required` to `conditional`
   (`required_when`: "an attorney is started — Milestone 71B") on
   `simplified_accounting` `attorney`, `attorney_barNumber`, `attorney_phone`,
   `attorney_email`, `attorney_street`, `attorney_cityStateZip`, and
   `annual_accounting` `attorney_bar`, `attorney_phone`, `attorney_email`,
   `attorney_street`, `attorney_cityStateZip` (CSV rows found by grep
   2026-09-29), plus the Inventory's `attorneyForGuardian` and `attorney.*`
   rows. New rows: `attorneyWaiverBasis` (enum: `guardian-advocate`;
   `court-order`; `self-represented-attorney`; blank = unanswered) and
   `attorneyWaiverOrderDate` (ISO date, conditional on `court-order`) for
   `guardian_inventory` and `annual_accounting`; `guardians[].certifiesService`
   (D11 — boolean, default `false`, at most one `true`; `conditional`, "no
   attorney started and more than one guardian"; `sync_party_ids`
   `guardianPartyIds`, like its sibling `guardians[]` rows) for all three
   engines, and added to each engine's guardian row factory; the certificate
   guardian signature fields (state, date, stamp image) for all three engines —
   the stamp image classified `document-content`, like every existing signature
   image. `npm run verify:data-model` must pass.
2. **Legacy data.** None to preserve (D13). A test-system filing opened after
   71B simply has no basis answer and shows the advisory. A filing with an
   attorney behaves exactly as today. No migration.
3. **Fixtures.** `fillMinimalValidGuardianWard`, `…SimplifiedWard` and
   `…AnnualWard` (`tests/e2e/support/target.ts:147`, `:211`, `:379`) enter an
   attorney today. They keep doing so; relaxing a requirement cannot break
   them. Grep every unit fixture that asserts a *count* of export errors on a
   blank filing — those counts drop and must be re-derived, not edited to pass.
4. **Tests.** New: `tests/unit/attorney-optional.spec.js` (the three
   validators with a blank attorney, a started attorney, each basis, and the
   Simplified case needing none; the certifying guardian with one guardian
   (not asked), with co-guardians (unanswered is an error; each choice
   accepted; ticking a second guardian clears the first), and after a
   guardian **before** the flagged one is deleted (the flag still names the
   same person) and after the flagged guardian is deleted (unanswered, never
   moved to another guardian)), `tests/e2e/attorney-optional-export.spec.ts`
   (a pro se Simplified, and a Guardian Advocate Inventory and Annual, reach an
   enabled Save as PDF with no override; the PDF prints the basis line and the
   guardian's certificate with all five Rule 2.516(f) elements; a co-guardian
   Annual prints the chosen guardian, not Guardian #1; an Excel export shows
   the advisory). Updated:
   `tests/unit/attorney-block.spec.js` (the generalized API). Red-first per
   AGENTS.md §2: each new spec fails on current `master` for the stated reason
   (the unconditional `req()` calls) before the fix is applied.
   `TEST-INDEX.md` rows in the same commit.
5. **Export/import/portability.** PDF: steps 5–6. Excel: step 7 (no cell
   written that is not written today). Excel **import**: the workbook has no
   basis or guardian-certificate cells, so an imported filing arrives with the
   basis unanswered — the advisory says so. `.sav` round-trip carries the new
   fields (covered by the existing case-file round-trip specs once the fields
   are in the model; confirm, do not assume).
6. **Security and sensitivity.** The basis is not sensitive. The order date is
   public court record. The guardian certificate signature image is the same
   class as existing signature images. No new sensitive data.
7. **UI/UX.** Reuses: Milestone 67A's per-guardian "This person prepared this
   filing" checkbox, for the certifying guardian, the Plan Initial conditional-marker pattern, the
   signature-state control, the Guardian card as the single source of the
   guardian's contact details (no re-typing), and the Preview & Export
   advisory channel.
8. **Legal framing.** Stated above. This milestone decides what the app
   blocks, not who must be represented.
9. **Cross-form consistency.** All nine forms end on one rule (via
   `attorney-block.js`). The four Plans already comply; this brings the other
   five into line and fixes the Minor Plan's sidebar.

### Build record — BUILT 2026-09-29

**What was built.**

- `attorney-block.js`: `isAttorneyStarted(d, engineId)` with one field list
  per engine. The Initial Plan's function is now a wrapper over it.
- A new `src/core/filing/unrepresented-filing.js` holds everything else:
  - the "why no attorney?" question, the court-order date, and the
    Guardian Advocate hint (a hint, never an answer);
  - the certifying guardian, stored as a row flag with a
    `claimServiceCertifier()` write-time rule;
  - the PDF basis line, and the three Preview & Export notes (wired into
    `output-preflight.js`).
- A new `src/core/form/attorney-required-markers.js` gives live required
  markers on the Inventory Cover and D-2, Annual Part V, and Simplified
  Cover and Part V.
- The three validators, `completion.js` (`a-p5`, `a-p10`, `s-cover`, `s-p5`,
  `s-p6`, `pm-p7`) and the three PDF models follow the rule. The Inventory's
  sidebar follows its validator unchanged. The non-Plan readiness rows are
  built from the validator's own issues, so they needed no change.
- Models, factories and the data-model CSV: 16 rows changed from required
  to conditional, and 19 new rows. `npm run verify:data-model` passes.

**Decisions taken during the build** (the requester was away; each is
reversible):

1. *Where the "which guardian served?" checkboxes live.* The design said
   "each guardian card". They are on the **certificate page itself** (Annual
   Part X, Simplified Part VI, Inventory D-5), listed by guardian name,
   because that is where the filer is when the question matters. Storage is
   unchanged: the flag lives on the guardian's own row, and the same one-flag
   rule and the same wiring as Milestone 67A are used.
2. *A date-order check on the guardian's certificate signature* (not after
   the period end), matching Part V's rule for the attorney. The attorney's
   own Part X signature never had one; that is unchanged.
3. *The Minor Plan sidebar* now mirrors `validatePlanMinor()` exactly. Each
   of the preparer and the attorney is optional until started, then needs a
   name and a valid signature. The regenerated completion golden shows the
   consequence on its artificial "saturated" variants, whose signature
   fields hold the literal `Yes`: they now read incomplete there, exactly as
   the validator reads them.
4. *The Annual certificate's sidebar mark (`a-p10`)* checks the guardian's
   certificate signature when there is no attorney. The alternative was
   adding its three fields to `checklist-export-parity.spec.js`'s known-gap
   list, whose rule is "shrink, never grow".

**Found, not fixed.** The Inventory's D-2 "Primary Email (e-filing)" shows a
required marker that no validator rule enforces. This is the Milestone 55D
pattern, and it predates 71B. The marker now follows the attorney rule like
its siblings; whether to enforce the field is a separate question.

**Tests.**

- New: `tests/unit/attorney-optional.spec.js` (24) and
  `tests/e2e/attorney-optional-export.spec.ts` (3).
- Updated with a stated reason: `attorney-block.spec.js` (the generalized
  rule), and the fixtures of `filing-descriptor.spec.js`,
  `preparer-flag-validation.spec.js` and three field-path tests in
  `tests/e2e/navigation-status.contract.spec.ts`. Each tested behaviour that
  needs an attorney, so each now starts one; no assertion changed.
- Registries: the new e2e spec is listed as converted in
  `tests/baseline/ms70-70T-progress.json`, and
  `tests/baseline/ms70-assertion-counts.json` was rewritten by its script
  (no spec lost an assertion).
- Targeted e2e: `navigation-status.contract.spec.ts`,
  `preparer-flag.spec.ts` and `readiness-card.contract.spec.ts` (119 tests)
  pass. The three field-path tests above failed first, for the stated reason
  (they expected attorney issues on a filing with no attorney).
- `tests/baseline/ms70-70C-filing-shapes.json`: only the 71B fields were
  folded in. A script refused any other difference, and the file's
  `generatedFrom` records the change.
- `tests/baseline/ms70-completion-golden.json`: regenerated per its own
  instruction, with every changed key reviewed and the note extended.
- **Red-first:** with all `src/` changes stashed, the unit spec's
  no-attorney describe fails for its stated reason. The attorney issues it
  forbids appear, e.g. "Cover — Attorney for Guardian". The e2e spec fails at
  its first 71B assertion.
- All 159 unit files pass, and `npm run check:types` is clean.

**Commits.** `3103238` holds the code; it went in by mistake under the previous commit's (71A's) message.
`ea703fe` is an empty commit carrying its intended message. History was not rewritten.

**Follow-up, found by the milestone's full regression.** The Plan for
Minors' Preparer & Attorney page has a "what's missing" box. The box read
its own list (preparer name, attorney name, attorney signature date, each
whenever blank) from `section-guidance-policy.js`'s `sidebarOnlyWants()`,
which design step 8's change to `'pm-p7'` did not reach. A blank page was
fine: it is complete now, and the box only shows on an incomplete page.

A half-finished page was not. A filer who started only an attorney was told
to enter a **preparer name** as well. Entering one starts a preparer, which
then needs its own signature. The page is no longer a sidebar-only rule, so
its entry was removed: the export check's own messages explain the mark.

`tests/e2e/sidebar-only-wants.spec.ts` had pinned the pre-71B list, and it
was not in 71B's targeted runs. It now covers:

- a blank page: complete, with no box;
- a started attorney: lists only "Attorney name is required", never a
  preparer;
- the name entered: the mark turns green.

`tests/unit/section-guidance-policy.spec.js` was updated to match.
Red-first, with `section-guidance-policy.js` stashed: the box asked for a
preparer.

---

## 71C — Every percentage field is secretly a money field

### What a filer observes

On the Initial Inventory, a filer types **150** into A-1's "Ward's Ownership %
(0-100)". The Ward's Value becomes 150% of the property, the A-1 total and the
sidebar's TOTAL VALUE inflate, the schedule gets its ✓, and Next stays
enabled. Typing **-10** silently becomes **10**. The same is true of every
share field on the Inventory, and of Ward's % on Schedules D-1 to D-5 of the
Annual, Final and Trust Accountings.

### Evidence — one root cause, not seventeen missing checks

| Claim | Location |
| --- | --- |
| Inventory share inputs are rendered as **money** inputs | `src/features/guardian-inventory/index.js:440-446` (`numInput()` → `kind: 'money'`) |
| Annual Ward's % inputs are `type 'number'`, which the contract also maps to money | `src/features/annual-accounting/index.js:1059`, `:1094` and the D-3–D-5 equivalents; `src/core/form/form-contract.js:316` (`format === 'decimal' \|\| control.type === 'number'` → `'money'`) |
| Money fields run `sanitizeNonNegativeDecimal()` — which **deletes** a minus sign and has no upper bound | `form-contract.js:552-555`; the sanitizer's own comment says it exists to strip `-` |
| A `'percent'` kind is declared… | `form-contract.js:328` (listed among the `'normalize'` kinds) |
| …and implemented nowhere: the finalize branches handle `money` and `signed-money` only | `form-contract.js:548-561` |
| The only percent awareness anywhere is a label check that draws a "%" suffix | `src/core/form/form-fields.js:189` |
| No export validator, sidebar check or importer tests the range | grep for range checks on `wardPercent`/`wardPct`/`jointOwnerPercent`, 2026-09-29: none |
| A cleared money field stores **`0`**, not blank | `form-contract.js:555` (`parseFloat(cleaned) \|\| 0`). A percent kind copied from it would turn a cleared share into an entered 0%, and "Ward's % is required" would stop firing |
| Negative shares are **also erased on open**, not only while typing | `src/core/form/form-runtime.js:41-47`, `sanitizeNegativeAmounts()`, run on every mount of the Annual family (`annual-accounting/index.js:128`): `Math.max(0, …)` over `wardPct` on D-1 to D-4. **Not** D-5, **not** Part VIII — so an imported negative D-5 share survives today while a D-1 one silently becomes 0 |
| The Excel importers read a cell above 1 as an old export, silently | `guardian-inventory/excel.js:63-68` (`percentFromWorkbook`: a cell above 1 is kept as-is, so a 150% share cell holding `1.5` imports as **1.5%**; a blank or unreadable cell imports as an entered **0**, not blank); `annual-accounting/excel.js:612` (`gcPct`, same above-1 rule; blank stays blank). The above-1 rule exists for Inventory files exported before Milestone 60K (commit `86dcd01`, 2026-09-20), which wrote 50 for 50%. No such file needs to be read (D13), so the rule is compatibility code with nothing left to be compatible with |

**Scope — 17 fields on 4 forms.** Initial Inventory: `wardPercent` on A-1, A-2,
B-1, B-2, B-3, B-4, C-1, C-2, C-3, C-4 and `jointOwnerPercent` on C-5
(`src/core/filing/models/guardian.js:85-100`). Annual, Final and Trust
Accounting: `wardPct` on D-1 to D-5, and `trusts[].wardPct` on Part VIII
(`annual-accounting/index.js:1389`). Part VIII's percentage feeds no
calculation (the workbook's D17 is a plain cell), but it is still a share of a
whole and gets the same field.

### Court-form authority (AGENTS.md §5)

The workbooks format each share cell as a percentage (`0.00%`) and multiply it
into the ward's share (Inventory `'A-1-REAL ESTATE pg 1'!I17` `=G17*H17`;
Annual `'SCH D-1 CASH p1'!K25` `=H25*I25`, both parsed). A share above 100% or
below 0% is arithmetically accepted by the workbook and meaningless as
ownership. Range-checking input changes no formula and no computed figure for
any valid share.

**The workbooks set no range.** Every `<dataValidation>` on every sheet of all
three templates was read with a parser (2026-09-29). Annual: 60 `list`
dropdowns and one unconstrained entry on the first sheet. Inventory: 16 `list`.
Simplified: 3 `list`. None constrains a number. So 0–100 is the app's own input
check, not a workbook rule, and there are no workbook bounds to match.

**The workbook's share cells hold fractions.** Share cells are formatted
`0.00%` (numFmtId 10; Annual `'SCH D-1 CASH p1'!I25`, Inventory
`'A-1-REAL ESTATE pg 1'!H17`), so `0.5` is 50% and `1.5` is 150%. The
exporters already write fractions (`percentValue()`, `pctCell()`). **Part VIII
is the exception:** its "Ward's Percentage Interest in the Trust" cell
(`'PART VIII'!D17`) is not a percentage cell. The Clerk formatted it as a date,
and the app writes and reads it as plain text (`annual-accounting/excel.js:467`,
`:846`). D10 does not apply to it; it keeps its text round-trip and gets only
the range check.

### Decision — SETTLED 2026-09-29 (D7, D10)

Build the percent field once, at Tier 1, and use it everywhere. An
out-of-range share is an **ordinary, bypassable validation error**, like any
other field error: after "Continue despite outstanding requirements" the court
output generates faithfully and the error stays visible (AGENTS.md §4). *What
the filer sees:* the same red inline error and bottom-panel item as any
required field.

**D10.** An imported share cell is read the way the Clerk's workbook reads it:
as a fraction. *What the filer sees:* a workbook that says 150% imports as 150%
with the range error; a cell holding `50` imports as 5,000% with the range
error. No share is ever silently rescaled. The pre-60K reading this retires
has no files left to serve (D13).

Options not taken: *a non-bypassable data-integrity issue* (D7 — a ward cannot
own 150% of anything, but that would leave no way to export until the share is
corrected); *keep reading
values above 1 as an old export, with a notice on each* (D10 — a genuine 150%
would still arrive as 1.5%); *keep today's reading* (D10 — silent).

### Design

1. **Implement the `percent` kind in every layer a number passes through.**
   The field's behavior is:
   - accepts digits, one decimal point, and a leading minus — **kept visible**,
     never stripped, so the filer sees what they typed;
   - stores a number for a numeric entry, and **`''` for an empty box**. This
     is deliberately unlike `money`, whose `parseFloat(cleaned) || 0`
     (`form-contract.js:555`) would record a cleared share as an entered 0% and
     silence "Ward's % is required";
   - carries its range (default 0–100) for the validator.

   The kind is declared but implemented nowhere, and a number reaches the
   model through **three independent paths**: the Tier 1 renderer, the
   delegated `data-form-path` writer the Annual family and the Simplified
   Accounting use, and the Inventory's own `bindForms()`. A kind implemented
   in one of them is silently undone by another. **Field behavior, layer by
   layer** — the specification for both this item's `percent` and 71E's
   signed Starting Balance (D12):

   | Layer | Where | `money` today | `percent` (71C) | Starting Balance (71E) |
   | --- | --- | --- | --- | --- |
   | Kind chosen at render | `renderFormField()`, `form-fields.js` (`fieldKind = kind \|\| inferFieldKind(…)`; `isAmountField = type === 'number' \|\| fieldKind === 'money'`) | `type:'number'` is enough | Caller passes `kind:'percent'`; renderer adds a percent branch. **Today a passed kind changes nothing here:** with `type:'number'` the field is still stamped `decimal` (money) and drawn non-negative; without it, it is not treated as an amount at all | Caller passes `kind:'signed-money'`; renderer adds a signed branch. Same gap today |
   | Format stamped | same, `format = … isAmountField ? 'decimal'` → `data-form-format` | `decimal` | `percent` | `signed-decimal` (already understood by `form-contract.js:315`) |
   | Value drawn on render | same, `cleanedValue` = `sanitizeNonNegativeDecimal()` for every amount | minus stripped | percent sanitizer: minus kept, `''` stays `''` | `sanitizeDecimal()` (minus kept) |
   | `<input>` type / keyboard | same, `inputType = isAmountField ? 'text'`, `inputmode="decimal"` | text, decimal | text; **verify a phone keypad offers a minus** under `inputmode="decimal"` (iOS's decimal pad has none) — if not, `inputmode="text"` for signed fields; Schedule C/E's existing signed fields share the question | same |
   | "%" / "$" wrapper | same, `isPercentField` / `isDollarField` | `$` | `%` (existing detection kept) | `$` |
   | Kind resolved on write | `getControlKind()`, `form-contract.js:315-316` | `decimal` → `money` | `percent` → `percent` (new mapping) | `signed-decimal` → `signed-money` (exists) |
   | Live filter while typing | `writeDraftValue()`, `form-contract.js:399-406` | `sanitizeNonNegativeDecimal` | percent filter (new branch) | `sanitizeDecimal` (exists) |
   | Stored on blur | `finalizeFieldValue()`, `form-contract.js:552-561` | `parseFloat(cleaned) \|\| 0` | `''` when empty, else number (new branch) | **blank-keeping opt-in**: `''` when empty, else number |
   | Inventory write path | `bindForms()`, `guardian-inventory/form-binding.js:72-73` (render), `:83-88` (input) — the Inventory's `numInput()` binds with `binding:'bind'`, `inputType:'decimal'`, `claimSharedWriteListener:false`, so **`form-contract.js` never sees these fields** | `sanitizeNonNegativeDecimal`, `parseFloat(val) \|\| 0` | new `inputType:'percent'` branch: percent sanitizer, `''` when empty | not applicable (no Starting Balance) |
   | On every open | `sanitizeNegativeAmounts()`, `form-runtime.js:41-48` | clamps to ≥ 0 | removed from the list (step 4) | removed from the list (71E step 8) |
   | Generic `type=number` guard | `setupAmountFieldValidation()`, `form-runtime.js:21-38`, run after every page mount (`router.js:212`) | — | **not reached**: it matches only `input[type="number"]`, and `renderFormField()` draws amounts as `type="text"`. Left alone; the real-UI tests below would catch it if that changed | same |

   The **blank-keeping** rule is a per-field opt-in (a renderer option that
   stamps an attribute `finalizeFieldValue()` reads), not a change to
   `money` or `signed-money`. Schedule C losses, Schedule E transfers and
   every other amount keep storing `0` for a cleared box exactly as today, so
   no existing required-field check changes behind the filer's back.
2. **Route every share input through it.** The Inventory's `numInput()`
   passes `kind:'percent'` and `inputType:'percent'` for paths ending
   `Percent`; the Annual family's D-1 to D-5 and Part VIII `ward_pct` inputs
   (`annual-accounting/index.js:1059`, `:1094`, `:1130`, `:1166`, `:1204`,
   `:1389`) pass `kind:'percent'` through a new `kind` parameter on
   `inpDWithTooltip()` (`index.js:464`, which today forwards only `type`),
   since `type:'number'` alone keeps choosing `money`. The existing "%"
   suffix stays.
3. **One shared validator,** `src/core/validation/percent-range.js`:
   `percentRangeIssues(value, {label, path})` → "Ward's % must be between 0
   and 100." Called from `validateGuardian()`, `validateAnnual()`'s
   `checkRows()`, the sidebar completion for the Annual D schedules, and the
   inline error display. The Inventory sidebar follows its validator.
4. **Stop erasing negative shares on open.** Remove `wardPct` and
   `wardPercent` from `sanitizeNegativeAmounts()`'s list
   (`form-runtime.js:41`). Without this, design step 1's visible minus would
   be set back to 0 the next time the filing opened. The other money fields in
   that list are untouched here (Starting Balance: 71E, D12).
5. **Importers read the workbook's meaning, and flag rather than fix (D10).**
   One shared reader, `shareFromWorkbookCell(cell)`, used by both importers in
   place of `percentFromWorkbook()` and `gcPct`. Part VIII keeps its text
   reader.
   - A **number** cell is a fraction: the stored share is `value × 100`,
     rounded to six decimals as today (`1` → 100, `0.5` → 50, `1.5` → 150,
     `-0.1` → -10, `50` → 5000). `percentFromWorkbook()`'s and `gcPct`'s
     above-1 branch is deleted, not kept as a fallback (D13).
   - A **text** cell is read the way the workbook's `=H25*I25` would read it,
     since Excel's arithmetic turns number-like text into a number: `"50%"` →
     0.5 → 50; `"0.5"` → 50. Text Excel could not turn into a number (the
     workbook would show `#VALUE!`) imports as **blank**, with an import notice
     naming the schedule and line.
   - A **blank** cell imports as blank (`''`), on both importers. The
     Inventory's current blank-to-0 goes away, so "Ward's % is required" can
     fire on an imported blank.
   - Nothing is clamped or rescaled after reading. An out-of-range result
     arrives as read and 71C's validator flags it (AGENTS.md §4: never silently
     alter data).
6. **Legacy data.** None to preserve (D13). A test-system filing holding an
   out-of-range share simply shows the error when opened. (The draft also
   claimed a negative share could not exist in saved data; that was wrong —
   the mount clamp skips D-5 — but it no longer matters.)

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** The 17 share rows (`probate-guardian-data-model.csv`, e.g.
   `guardian_inventory,scheduleA1[].wardPercent` at line 191 through
   `annual_accounting,schD5[].wardPct` at line 672, and `trusts[].wardPct` at
   line 163) gain the range in `allowed_values` ("0–100"). Their `requiredness`
   is also out of step with the forms today — the CSV says `optional` while the
   Inventory draws a required marker and the Annual requires the share on every
   populated line; reconcile each row to its validator (`conditional`:
   "required on a populated row").
2. **Legacy data.** None (D13): no saved filing or exported workbook needs to
   keep working. Design step 6.
3. **Fixtures.** Grep every fixture and unit test for share values outside
   0–100 (for example, tests pinning the old fraction reading) — each is either
   deliberately testing a range error or needs its value corrected. Grep the
   importer specs (`guardian-inventory` and `annual-accounting` Excel import
   tests) for cases pinning the above-1 pre-60K reading or the Inventory's
   blank-to-0; each is deleted or rewritten under D10 and D13, with the reason
   stated.
4. **Tests.** New: `tests/unit/percent-field.spec.js` (normalize and validate
   `''`, `0`, `0.5`, `1`, `50`, `100`, `100.01`, `150`, `-10`, `-0`, `abc`; a
   cleared box stores `''`, not 0; `shareFromWorkbookCell()` over number cells
   `0.5`, `1`, `1.5`, `50`, `-0.1`, text cells `"50%"`, `"0.5"`, `"abc"`, and a
   blank cell, for both importers; `sanitizeNegativeAmounts()` leaves a `-10`
   share alone on D-1 and D-5; `renderFormField({kind:'percent'})` stamps
   `data-form-format="percent"` and draws `-10` with its minus;
   `bindForms()` with `inputType:'percent'` stores `''` for a cleared box),
   `tests/e2e/percent-range.spec.ts`. **Every value in the e2e spec is typed
   into the real box with the keyboard** (`locator.pressSequentially`, then
   Tab), never injected into the model, because each of the three write paths
   above can undo a value the others kept. It covers: A-1 at 150 shows the
   inline error, the schedule loses its ✓, export lists the issue; **A-1
   (the Inventory's `bindForms()` path) and D-1 (the delegated path) each
   typed as `-10`** keep the minus, **still show -10 after leaving the page,
   returning, and reopening the saved case file**, and error; a cleared share
   stays blank and reports "required"; Part VIII's share at 150 errors; an Excel import of
   a workbook with share cells `1.5` and `-0.1` arrives as 150 and -10, both
   flagged, on an Inventory and on an Annual; a share cell holding `50`
   arrives at 5,000% and flagged). Red-first. `TEST-INDEX.md`
   rows.
5. **Export/import.** Export writes shares exactly as today. Import: step 5.
   Re-verify, with a real exported file read by a parser, that exporting then
   importing a share of 0, 50, 100 and 150 returns the same four values.
6. **Security.** No new data.
7. **UI/UX.** Inline error in the existing `aria-invalid` pattern; the "%"
   suffix already drawn. Adding the error id to `aria-describedby` also
   addresses the report's A11Y-02 for these fields.
8. **Legal framing.** None — arithmetic range.
9. **Cross-form.** One field kind for every percentage in the app. The Plans
   have no percentages.

### Build record — BUILT 2026-09-29

**What was built** (every layer of the design's table):

- **The percent kind:**
  - `getControlKind()` maps the new `percent` format to it;
  - the live filter keeps the minus;
  - the blur branch stores a number, or `''` for an empty box;
  - `displayDecimal()` / `parseStoredDecimal()` draw and store shares
    without turning a real 0 into an empty box;
  - `setPercentFeedback()` and `syncPercentFeedback()` show an out-of-range
    share inline, on blur and on render.
- **The blank-keeping opt-in** for amounts (`data-field-blank="keep"`),
  ready for 71E.
- **The renderer** (`renderFormField()`) has percent and signed branches: its
  own format, the minus kept, `displayDecimal()`, and the `keepBlank`
  option. Signed amounts get `inputmode="text"`, because iOS's decimal pad
  has no minus key. Shares keep the decimal pad, since a negative share is
  an error anyway.
- **The Inventory's `bindForms()`** has a `percent` input type. `numInput()`
  routes every `...Percent` path to it. `inpDWithTooltip()` gains `kind`,
  and the six Annual share inputs (D-1 to D-5 and Part VIII) pass
  `percent`.
- **`sanitizeNegativeAmounts()`** no longer clamps shares.
- **`percent-range.js`**, used by:
  - `validateGuardian()` (all 11 Inventory share fields, C-5 as "Joint
    Owner's %");
  - `validateAnnual()` (D-1 to D-5 and Part VIII);
  - the Annual sidebar (`a-schd1` to `a-schd5`, `a-p8`).
- **`share-cell.js`** (D10) replaces both importers' above-1 readers.
- **The data model:** the 17 share rows gain the range; the Annual D rows
  and Inventory A-1 are `conditional`, "required on a populated row".

**Decisions taken during the build:**

1. *Unreadable imported text is kept as imported, not blanked with an
   import notice.* The importers have no notice channel. Keeping the text
   lets the range check report it ("must be a number from 0 to 100"), which
   is just as visible and alters nothing.
2. *The share reader lives in its own module* (`src/core/excel/share-cell.js`),
   not in `cell-reader.js`, whose header and spec keep it a closed
   three-function cluster.
3. *The inline message says "The percentage …"*, not "Ward's % …", because
   C-5's field is the Joint Owner's %.
4. *Inventory A-1 keeps its one existing "must be > 0" message* for a blank,
   zero or negative share. The range check adds only over-100 and
   unreadable, so a filer never sees two messages for one share.

**Found, not fixed:**

- The Inventory requires a share only on A-1. The other ten share fields
  show a required marker, but no validator rule checks for a blank.
- Schedule C's loss and Schedule E's transfer-out fields are hand-written
  signed inputs with `inputmode="decimal"`, so an iOS keyboard cannot type
  their minus.

Both predate 71C and are left for a decision.

**Tests:**

- New: `tests/unit/percent-field.spec.js` (44) and
  `tests/e2e/percent-range.spec.ts` (3). Every e2e value is typed with the
  keyboard, and the import round trip goes through the filer's real
  override.
- Updated with a stated reason:
  - `guardian-inventory-excel-schedule-layout.spec.ts`: its legacy-import
    case now expects a cell of 50 to arrive as 5000;
  - the completion golden: the D and Part VIII marks' range condition,
    with its note extended.
- **Red-first**, with `src/` stashed:
  - the six out-of-range validator cases fail, because no issue was raised;
  - the e2e Annual case fails because a typed `-10` shows as `10`, exactly
    the report's BUG-03.
- All unit specs pass. `verify:data-model` and `check:types` were run
  before the commit. The 48 existing share-related e2e tests pass.

**Commit.** `5a5793a`.

---

## 71D — Ward's %: a wrong instruction, and three answers for a blank share

### What a filer observes

On the Annual, Final and Trust Accountings, Schedule D-1 says: *"Enter Ward's
% as decimal (e.g., 1 for 100%, 0.5 for 50%) or as a percentage (e.g., 100,
50)."* A filer who follows it and types **1** for a wholly owned account files
**1%** of it — a 100× understatement. Since 2026-09-24 (commit `dbee60f`,
requester-approved under AGENTS.md §5) the app has read 1 as 1%, matching the
workbook. The instruction was never updated.

A filer who leaves a Ward's % **blank** sees the full amount counted in the
on-screen totals and Line 30. Export lists "Ward's % is required"; if the filer
chooses "Continue despite outstanding requirements", the PDF prints that row's
Ward's Amount as **$0.00** while the schedule total and Line 30 still include
100% of it — a filed column that does not add up.

### Evidence

**The wrong instruction, twice, and a contradiction:**

| Location | Text |
| --- | --- |
| `src/features/annual-accounting/index.js:1069` (D-1) | "Enter Ward's % as decimal (e.g., 1 for 100%, 0.5 for 50%) or as a percentage (e.g., 100, 50)." |
| `help/index.html:490` | "Ward's % may be entered as a decimal or a percentage." |
| `src/features/annual-accounting/index.js:580` (same form, instructions page) | "CAUTION on Ward's % fields: Enter percentages as plain digits (70, not 0.70)." — **correct, and contradicts the two above** |
| `src/core/excel/excel-engine.js:254` (developer-facing) | Docstring still says `0.5 -> 0.5`; the function below it divides by 100 |
| `src/core/types/schedules.js:51`, `:60` (developer-facing) | "Ward's fractional ownership percentage" |

**The share rule, implemented six times:**

| # | Implementation | A blank share counts as |
| --- | --- | --- |
| 1 | `pct()`, `src/features/annual-accounting/totals.js:18-22` — on-screen totals, Line 30, bond, audit-fee base | **100%** |
| 2 | `scheduleDRow()`, `totals.js:35-40` — D-2/D-3/D-4 totals and their PDF rows | 100% (via `pct()`) |
| 3 | D-1 PDF rows, `src/features/annual-accounting/pdf-model.js:674-678` (own copy) | **0%** |
| 4 | D-5 PDF rows, `pdf-model.js:827-831` (own copy) | **0%** |
| 5 | `percentValue()`, `src/core/excel/excel-engine.js:262-265` — the Excel export | 0% |
| 6 | `gcPct`, `src/features/annual-accounting/excel.js:612` — the Excel import | blank stays blank |
| — | Initial Inventory, `wardShare()`, `src/features/guardian-inventory/totals.js:48-56` | **0%, deliberately** — "exactly what a blank Ward's % cell produces in the workbook … it must not be silently read as 100%" |

`totals.js:24-34` records that D-2/D-3/D-4's row builders were moved onto the
shared helper because they "drifted once already". D-1 and D-5 were missed.

**And a seventh answer, in the printed Ward's % column.** Every PDF table
that shows a share prints a blank one as **"100%"**, whatever its amount
column counts:

| Table | Location | Blank share prints | Its amount column counts it as |
| --- | --- | --- | --- |
| D-1 | `annual-accounting/pdf-model.js:686` | "100%" | 0% |
| D-2 | `:724` | "100%" | 100% |
| D-3 | `:758` | "100%" | 100% |
| D-4 | `:798` | "100%" | 100% |
| D-5 | `:838` | "100%" | 0% |
| Part VIII (trusts) | `:997` | "100%" | — (the trust's Ward's Amount is typed, not computed) |

Changing only the arithmetic (D3) would leave every D-schedule row with a blank
share printing "100%" beside a Ward's Amount of $0.00. A Part VIII trust with a
blank share already prints a 100% interest the filer never stated.

A missing Ward's % is reported through `checkRows()`
(`annual-accounting/index.js:1721-1725`) as an ordinary validation issue, which
`src/core/validation/issue-registry.js` treats as bypassable — so the
override path that exposes the mismatch is real, not theoretical.

### Court-form authority (AGENTS.md §5)

The Annual workbook computes each share as `=H25*I25` (`'SCH D-1 CASH p1'!K25`,
parsed), so a blank share cell yields **0**. The Inventory's calculator follows
its workbook the same way and says so. The Annual's on-screen 100% is the one
reading no template supports.

### Decision — SETTLED 2026-09-29 (D3)

A blank Ward's % counts as **0%** on the Annual, Final and Trust Accountings,
matching the workbook, the Excel export and the Initial Inventory. This is a
calculation change toward the template, approved by the requester by name under
AGENTS.md §5.

What D3 means for the cases the draft left undefined (following D3, not new
decisions):

- **Unreadable is 0% too, and an error.** Today `pct()` reads a
  non-numeric share (`'abc'`, `NaN`) as 100% (`totals.js:21`). After 71D any
  value that is not a finite number contributes **0**, as the Inventory's
  `wardShare()` already does (`n()` returns 0 for `NaN`). 71C's validator
  reports it ("Ward's % must be a number from 0 to 100"). The workbook itself
  would show `#VALUE!` and stop the total; the app cannot print `#VALUE!`, and
  "counts as nothing, and says so" is the reading that can never inflate a
  total. With 71C in place such a value can only arrive in a hand-edited case
  file.
- **A blank share prints as blank**, not as a figure: "—", the PDF's existing
  mark for an absent value (as D-4's Restricted Amt column already uses). The
  workbook's empty share cell shows nothing, and the app should not print a
  percentage the filer did not enter, whether "100%" or "0%".
- **Part VIII.** Its share feeds no arithmetic, so D3 changes no figure there.
  It gets the print fix above and 71C's range check.

Option not taken: *keep 100% and make the PDF rows match* — the PDF would foot,
but the app would still disagree with the Clerk's workbook.

### Design

1. **Fix the text.** D-1 instruction → *"Enter Ward's % as a number from 0 to
   100: 100 if the ward owns the whole account, 50 for half."* Help page line
   490 to match. Correct the two developer-facing comments.
2. **One share helper for both forms.** Move `wardShare(full, percent)` from
   `guardian-inventory/totals.js` to `src/core/format/money.js` (beside `n()`
   and `r2()`, which already moved there in Milestone 70's 70B), re-export it
   from the Inventory module so its importers do not change, and have `pct()`,
   `scheduleDRow()`, and the D-1/D-5 PDF row builders use it. After this there
   is one implementation to be right, as Milestone 60A said of the Inventory.
3. **The on-screen per-row Ward's Amount** (`annual-accounting/index.js:240-244`,
   `:1050`, `:1087`, `:1124`) follows automatically: a blank share shows
   $0.00, as the PDF and the workbook do.
4. **Show the requirement where it is.** Ward's % gets a required marker on
   populated D-schedule rows; the export message stays. With 71C in place, a
   blank share is flagged inline.
5. **Keep `ward-share-advisories.js`** (the "reads as 1%" note for shares
   above 0 and at most 1). It was written for old saves, which D13 says do
   not matter. It stays because it still catches a filer typing `1` or `0.5`
   for a whole or half share — exactly the mistake the D-1 text taught (BUG-02).
6. **The printed Ward's % column shows what was entered.** One formatter,
   `formatShare(v)`, in `money.js` beside `wardShare()`: a number prints as
   `${v}%`; blank or unreadable prints "—". Used by the six sites in the
   Evidence table (D-1 to D-5 and Part VIII). The on-screen Ward's % inputs
   already show what was typed.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** Update the `notes` of the five `schD*[].wardPct` rows: a
   blank share counts as 0 (Milestone 71D).
2. **Legacy data.** None to preserve (D13). On the test system, a filing with
   a blank or unreadable share shows **lower totals** after this lands, and
   its PDF prints "—" where it printed "100%". That is the correction; no
   stored data changes.
3. **Fixtures.** Grep Annual fixtures and unit tests for rows with a blank
   `wardPct` that rely on the 100% reading (`tests/e2e/support/fixtures.ts`,
   `fillMinimalValidAnnualWard`, `annual-accounting-totals.spec.js`).
4. **Tests.** Updated: `tests/unit/annual-ward-percentage.spec.js` — its case
   "a blank or unreadable share still counts as the whole asset, as before"
   (`:30-31`, `expect(pct('')).toBe(1)`) pins the rule being changed; change it
   with the reason, and show it failing red-first. New:
   `tests/unit/annual-pdf-share-rows.spec.js` (for **each of D-1 to D-5**, each
   PDF row's Ward's Amount equals its contribution to the schedule total for
   blank, `'abc'`, 1, 50 and 100; the Ward's % column prints "—" for blank and
   unreadable and `50%` for 50, on D-1 to D-5 **and Part VIII**; the whole spec
   runs once each with `filingType` Annual, Final and Trust, since the three
   share one engine and "same engine" is an assumption a test should hold),
   `tests/e2e/annual-blank-share-footing.spec.ts` (override export with a blank
   share: the printed D-1 column foots to its printed total, and the row prints
   "—", not "100%"). A text assertion that D-1 and the Help page no longer
   mention decimals. `TEST-INDEX.md` rows.
5. **Export/import.** Excel export already writes a blank share as 0; unchanged.
   Import unchanged.
6. **Security.** None.
7. **UI/UX.** Existing instruction and required-marker patterns.
8. **Legal framing.** None.
9. **Cross-form.** The Inventory and the Annual family end on one helper and
   one blank-share rule.

### Build record — BUILT 2026-09-29

**What was built.**

- `wardShare()` moved to `src/core/format/money.js`, and
  `guardian-inventory/totals.js` re-exports it.
- The Annual `pct()` is now `wardShare(1, v)`, so a blank or unreadable
  share is 0% on screen, in Line 30, in the bond and in the audit-fee base.
- The D-1 and D-5 PDF rows use `wardShare()`.
- A new `formatShare()` prints the entered number as `50%`, or "—" for a
  blank or unreadable share. It is used by all six share columns (D-1 to D-5
  and Part VIII).
- The D-1 instruction now reads "Enter Ward's % as a number from 0 to 100:
  100 if the ward owns the whole account, 50 for half."
- The Help page line now says the same, and that a blank counts as 0%.
- D-1 to D-4's shares get the required marker D-5's already had.
- Stale developer comments were fixed in `excel-engine.js` and
  `types/schedules.js`.
- The data model's five D share rows note the rule.

**Decisions taken during the build.**

- None beyond D3. The design's unreadable-share rule (0%, and 71C's error)
  fell out of using `wardShare()`.

**Tests.**

- New: `tests/unit/annual-pdf-share-rows.spec.js`. It covers all five D
  tables and Part VIII, across Annual, Final and Trust. Every row's printed
  Ward's Amount must equal its contribution to the total, and the column
  must add up to it.
- New: `tests/e2e/annual-blank-share-footing.spec.ts`.
- Updated: `tests/unit/annual-ward-percentage.spec.js`. Its blank-share case
  pinned the old 100% rule and now pins 0%, with the reason stated.
- **Red-first**, with `src/` and `help/` stashed:
  - the unit spec fails because the D-1 column added to $1,510 against a
    $3,510 total (the report's footing defect);
  - D-2 counted a blank share as 100%;
  - Part VIII printed "100%";
  - the e2e spec fails with an on-screen D-1 total of $6,100, which counted
    the blank row's whole $5,000.
- All 161 unit files (2,164 tests) pass. `verify:data-model` and
  `check:types` are clean.
- The Annual PDF and share e2e specs pass (23 tests).

---

## 71E — One rounding rule, and carried balances that match the prior filing

### What a filer observes

- The Annual Accounting prints Line 20 **$797,229.19** and Line 30
  **$797,229.18**, then says "✓ Net Assets from Changes (797,229.19) equals Net
  Assets from Balances (797,229.18) — the accounting balances." The sidebar's
  NET ASSETS flips between the two.
- The next filing's Starting Balance box shows **`797229.1849999999`**.
- An Initial Inventory PDF and an Annual PDF can print **the same value a cent
  apart**, because they round differently.
- Creating a Final Accounting from an Annual Accounting that has no Schedule D
  rows carries a Starting Balance of **$0**; starting a New Year from the same
  filing carries its Line 20.
- Creating a **Trust Accounting** from the Annual carries the whole
  guardianship estate's net assets as the trust's Starting Balance (report
  BUG-08).
- Converting an **Initial Inventory into the first Annual Accounting** carries
  its schedules but leaves Starting Balance **blank**, although Rule
  5.696(b)(1) starts the first accounting at "the value of assets on the
  inventory".
- A ward whose debts exceed their assets ends the year with **negative** net
  assets. The next filing's Starting Balance box won't accept the minus sign,
  and opening the filing turns a carried negative into **$0**, so Line 20 is
  off by the whole amount.
- On the Annual family, a Starting Balance of **$0.00** is reported as
  missing ("Part II — Starting Balance").
- The Clerk's audit then compares the new Starting Balance with the prior
  filing's printed ending balance and, if they differ, **lists a discrepancy**
  (`GD ANN WORK SLIP AUDIT.docx`, `GD ANN Work Slip TRUST.docx`, `GD ANN Work
  slip Simplified 02272020.docx`).

### Evidence

**Three rounding methods, nine formatting sites, seven files** (grep,
2026-09-29):

| Method | Sites |
| --- | --- |
| `Math.round(x*100)/100` then format | `src/core/format/money.js:16` (`r2()`); `src/features/guardian-inventory/pdf-model.js:32-33` (the Inventory PDF) |
| `toLocaleString` / `Intl.NumberFormat` directly | `money.js:20` (`fmt`), `money.js:25` (`formatDashboardCurrency`); `annual-accounting/pdf-model.js:50`; `annual-accounting/index.js:423` (`fmtAnnual`, all Annual screens); `simplified-accounting/pdf-model.js:24`; `simplified-accounting/index.js:241` (`fmtS`) |
| `toFixed(2)` | `annual-accounting/pdf-model.js:148` and `index.js:668` (audit fee); `simplified-accounting/excel.js:248` (a formatted amount string) |

The measured disagreements are in 71A's table. `money.js:14` documents `r2()`
as "For DISPLAY of an aggregate", but the Annual and Simplified PDFs never call
it.

**Four carry paths, all unrounded — and one missing.** Corrected 2026-09-29:
the draft attributed `conversion.js:184-185` to Inventory → Annual; it is
`convertToSimplified()`.

| Path | Where | Figure carried |
| --- | --- | --- |
| Annual family → Annual family, any pair including Trust ("New Filing from Existing") | `src/core/filing/carry-over.js:443` | `String(totals.annual(src).netAssetsFromD)` — **always Line 30**, even when that is 0 |
| Initial Inventory or Annual family → Simplified | `src/core/filing/conversion.js:184-185` (`convertToSimplified()`) | `String(headlineTotal(src))` — the Inventory's Summary I total (`SUMMARY I!H39`), or the Annual's Line 30 / Line 20 |
| Simplified → Annual family | `conversion.js:252-253` (`convertSimplifiedToAnnual()`) | `String(headlineTotal(src))` — remaining assets on hand |
| New Year (Annual family and Simplified) | `src/core/filing/filing-years.js:274-280` | `String(headlineTotal(ward))` |
| **Initial Inventory → Annual family** | `conversion.js:79` (`convertGuardianSchedulesToAnnual()`), dispatched at `:305-307` | **Nothing.** The schedules carry; Starting Balance stays blank (`carry-over.js:438` excludes Inventory sources from its carry, and no converter sets it). The comment at `carry-over.js:426-429` says this mapper sets it; it does not. |

`headlineTotal()` (`src/features-loader.js:202-213`) returns Line 30 when the
filing has any Schedule D figure and Line 20 otherwise; `carry-over.js`
ignores that fallback. Two definitions of "ending balance" for one concept.
`headlineTotal()`'s test for "any Schedule D figure" is computed on
**ward's-share totals** (`schD1_total || schD2_ward || …`). Under 71D's
blank-share rule, a filing whose D rows have amounts but blank shares would
pass as "no Schedule D".

**Starting Balance is also damaged on the way in:**

| Defect | Where |
| --- | --- |
| Every time an Annual-family or Simplified filing opens, a negative Starting Balance becomes 0, and a string becomes a number | `form-runtime.js:48` (`sanitizeNegativeAmounts()`, `Math.max(0, parseFloat(v))`) |
| The box strips a typed minus sign | Annual: `inpD(…,'number')` → money kind (`annual-accounting/index.js:671`; `form-contract.js:316`, `:552-555`). Simplified: `data-form-format="decimal"`, rendered through `sanitizeNonNegativeDecimal()` (`simplified-accounting/index.js:439`) |
| A number `0` reads as missing on the Annual family | `validateAnnual()`'s `req` (`annual-accounting/index.js:1545`: `if(!v\|\|…)`). Every edit stores a number, and the line above converts a carried `"0"` to `0`, so a $0.00 Starting Balance is reported missing. The Simplified's `req` (`simplified-accounting/index.js:698`) and the sidebar's `filled()` (`completion.js:108`) already accept 0. Read from source; not reproduced in the running app. |
| The Clerk's workbook expects negatives | `'PART VI, VII '!I8` and Simplified `'PARTS I, II '!H19` are formatted `"$"#,##0.00_);("$"#,##0.00)`, with a negative section, and carry no data validation (parsed 2026-09-29) |

**The reconciliation banner** (`annual-accounting/index.js:1353`) prints two
separately formatted numbers after `annualReconcileState()` (`totals.js:104-112`)
decides they balance because they differ by less than $0.01 — so it can call
two visibly different numbers equal.

### Authority

| Source | Says |
| --- | --- |
| Fla. Prob. R. 5.696(b)(1) | An accounting shall include "a statement of the starting balance of assets on hand at the beginning of the accounting period **which shall be the ending balance of the preceding accounting, or if none, the value of assets on the inventory**." (The Simplified Accounting is excluded by 5.696(a).) |
| Annual workbook, `'PART VI, VII '` B8 | Starting Balance is labelled "Net Assets at End of Accounting Period, per the Prior Period Report". **Line 20 (B20) and Line 30 (B30) carry that same label**; B31: "Line 20 should equal line 30." |
| Inventory workbook, `'SUMMARY I '` H39 | The bottom line, "VERIFIED INITIAL INVENTORY OF GUARDIAN" = `H32+H38`, net of liabilities — the figure `headlineTotal()` already carries (`guardian-inventory/totals.js:138`). |
| Clerk's audit, trust and simplified work slips | "Ending balance of last inventory/accounting **or amended accounting**… Beginning balance of this accounting… If the balances are not the same, list as a discrepancy." |
| Clerk's trust work slip (`GD ANN Work Slip TRUST.docx`, parsed) | "If 1st trust accounting, is **the disbursement amount on the annual accounting** the same as the beginning of the trust accounting? OR Ending balance of **last inventory/trust accounting or amended trust accounting** / Beginning balance of this trust accounting / If the balances are not the same, list as a discrepancy." A trust accounting never starts from the guardianship estate's net assets. |
| Rounding contract, approved 2026-09-20 for the Inventory (`guardian-inventory/totals.js:31-38`); the same rule is stated for every form at `src/core/format/money.js:14` | Compute at full precision, sum unrounded values, round the aggregate to cents only when producing a displayed or output figure. **Kept, and applied to all forms.** This milestone changes *how* the display rounds, never *when*. |

### Decision — SETTLED 2026-09-29 (D2, D6, D9, D12; D8 withdrawn by D13)

- **D2.** Every printed figure and every carried balance uses one rounding
  function that reproduces what the Clerk's workbook displays in Excel, as
  measured by 71A. Approved by the requester under AGENTS.md §5 as a change to
  printed figures (at most one cent, on half-cent values) toward the template.
- **D6.** A new filing's Starting Balance is the prior filing's Line 30; Line 20
  only when the prior filing has no Schedule D figure at all; the carried value
  is rounded by the D2 function; when the prior filing's Line 20 and Line 30
  differ, the new filing says so; and the carry always reads the source filing's
  current (amended) data. *Corrected after review:* the draft said the carried
  value is "stored as a two-decimal string". It is stored as a **number**
  rounded to cents. That is the data model's `decimal`, what every edit of the
  box stores (`form-contract.js:555`), and what the mount pass converts a
  string to anyway. Precise meanings of "no Schedule D" and "amended": design
  step 4.
- **D9.** A carry into or out of a Trust Accounting carries nothing; Trust →
  Trust carries under D6.
- **D12.** Starting Balance accepts and keeps a negative figure.

Options not taken: *`r2()` everywhere* (self-consistent but not guaranteed to
match the workbook); *round only the carry* (leaves the Inventory and Annual
PDFs a cent apart); *Line 30 always* (carries $0 from a filing with no
Schedule D); *Line 20 always* (departs from "assets on hand"); for D9, *keep
carrying net assets* (the Clerk's trust audit would list a discrepancy on
nearly every first trust accounting) and *bring all of BUG-08 in* (needs its
own design); for D12, *a follow-on* (a carried negative keeps becoming $0).

### Design

1. **One function, specified by 71A.** Add `roundCents(v)` and
   `formatMoney(v, {style})` to `src/core/format/money.js`, implementing 71A's
   specification. If 71A confirms Excel's 15-significant-digit behavior, the
   implementation rounds the **decimal string** from `toPrecision(15)`, not a
   binary product — `Math.round(1.005 * 100)` is 100 because `1.005 * 100` is
   `100.49999999999999`, so any `Math.round(x*100)` implementation is wrong for
   that rule by construction.
2. **Replace every formatting site** in the Evidence table with `formatMoney`
   (keeping each site's style: parentheses for negatives on the Annual/Simplified
   screens, "-$" first on the Inventory PDF, and so on). `r2()` becomes
   `roundCents()` under its old name so its callers do not change.
3. **The banner compares what it prints.** `annualReconcileState()` compares
   `roundCents(line20)` with `roundCents(line30)`; "equals" is printed only when
   the two printed figures are identical. The explanation flow for a real
   imbalance is unchanged.
4. **One carry function.** `carriedEndingBalance(src, targetType)` in
   `src/core/filing/carry-over.js`:
   - **Trust boundary (D9):** when exactly one of `src.inventoryType` and
     `targetType` is `trustAccounting`, return
     `{ value: '', used: 'none-trust' }` and carry nothing. Trust → Trust,
     including New Year, falls through to the Annual-family rule;
   - Annual family: Line 30 if the source has **any Schedule D figure**, else
     Line 20. "Any Schedule D figure" means **at least one D-1 to D-5 row with a
     nonzero number in any money column** (Full Amount, Full Value, Full Debt,
     Carrying Value). Rows holding only text, or only zeros, do not count. This
     deliberately tests entered amounts rather than `headlineTotal()`'s
     ward's-share totals, so a blank share (0% under 71D) cannot turn a filled
     Schedule D into "no Schedule D". `headlineTotal()` adopts the same test,
     so the dashboard and the carry agree;
   - Initial Inventory: Summary I total (H39);
   - Simplified: remaining assets on hand;
   - returns `{ value, line20, line30, used }` where `value` is a **number**
     rounded by `roundCents` (negative allowed, D12), `line20`/`line30` are the
     source's rounded figures (Annual-family sources only, else `''`), and
     `used` is one of `line30`, `line20`, `inventoryTotal`,
     `simplifiedRemaining`, `none-trust`.
   - **Amended sources.** The app keeps no amendment versions: an accounting
     is either edited in place, or refiled as its own filing with Amended
     Form? = Yes (`amendedForm`, `models/annual.js:42`). So "the latest
     (amended) version" means two things. First, the carry reads the source
     filing **as it stands at the moment of the carry**, never a stored
     snapshot, so an accounting amended in place carries its amended figures.
     Second, when the chosen source is not marked amended, and the same case
     (`caseId`) holds another filing of the same type with the same
     `periodFrom` and `periodTo` marked Amended Form = Yes, the new filing shows
     a non-blocking note: *"An amended accounting for this period exists
     ([form type, period]). The Clerk compares Starting Balance with the
     amended accounting's ending balance."* The app does not switch sources on
     its own; the filer chose the source.

   **All five paths call it**, including the one that carries nothing today:
   Initial Inventory → Annual family gains a carry of the Summary I total.
   That is Rule 5.696(b)(1)'s "if none, the value of assets on the inventory",
   and the figure the audit work slip compares. The draft stated this path
   already carried H39, and D6 was answered on that premise; the correction
   makes the path do what the draft said it did. Inventory → Trust carries
   nothing (D9). `describeConversion()` (`conversion.js:21-52`) says
   "Starting Balance is set to this filing's ending net assets" for every
   Annual-family pair. Its text changes for the pairs that now carry nothing,
   and for Inventory → Annual, which now carries, so the conversion dialog
   never promises a figure that doesn't arrive.
5. **Carry provenance and the mismatch warning.** Each carry stores a small
   provenance record on the new filing — `startingBalanceCarry`, with exact
   fields in checklist item 1: source filing id and label, the source's Line 20
   and Line 30 (rounded), which was used, the value, and when. Non-blocking
   notes read it, shown beside Starting Balance and in Preview & Export (the
   `output-preflight.js` advisory channel):
   - **nothing was carried across the trust boundary (D9):** into a Trust
     Accounting, *"Starting Balance was not carried. A trust accounting does
     not start from the guardianship's net assets: the Clerk compares it with
     the amount the annual accounting disbursed into the trust (first trust
     accounting) or the last trust accounting's ending balance."* Out of a
     Trust Accounting: *"Starting Balance was not carried from the trust
     accounting. Enter the guardianship's ending net assets from its last
     accounting or inventory."*
   - **the source's two ending figures differed:** *"The prior filing's ending
     balances differ — Line 20 $X, Line 30 $Y. $Y was carried. The Clerk
     compares this Starting Balance with the prior filing's ending balance and
     lists any difference as a discrepancy."*
   - **the filer has since changed Starting Balance:** *"Starting Balance
     ($A) differs from the prior filing's ending balance ($B), carried
     MM/DD/YYYY."*
6. **Excel.** The carried Starting Balance is written to the workbook's input
   cell (`'PART VI, VII '!I8`, Simplified `'PARTS I, II '!H19`) as the rounded
   number, not the raw double, negative included. No formula cell is written.

7. **Withdrawn (D13).** The draft normalized raw Starting Balances already
   stored in existing filings (D8), with an activity-log entry for each.
   There are no existing filings to preserve, so there is nothing to
   normalize: every Starting Balance from here on is either typed or carried
   through step 4, which rounds it. Test-system filings holding a raw value
   are test data. The step number is kept so references to steps 8 and 9
   stay valid.

8. **Negative Starting Balances are kept (D12).**
   - Remove `startingBalance` from `sanitizeNegativeAmounts()`'s clamp
     (`form-runtime.js:48`). The other four fields on that line are
     unchanged.
   - Both boxes follow the **Starting Balance column of 71C's "Field
     behavior, layer by layer" table**. The `signed-money` kind exists
     (`form-contract.js:315`, `:399-406`, `:556-561`, used today by Schedule C
     losses and Schedule E transfers) but the renderer ignores it, so each box
     needs its own change:
     - Annual (`annual-accounting/index.js:671`): `inpD()` gains a `kind`
       parameter, as `inpDWithTooltip()` does in 71C, and passes
       `kind:'signed-money'` with the blank-keeping opt-in, relying on 71C's
       renderer branch. Today `inpD(…,'number')` makes it `money`: stamped
       `decimal` and drawn through `sanitizeNonNegativeDecimal()`.
     - Simplified (`simplified-accounting/index.js:439`): hand-written
       markup, not the renderer. Its `data-form-format="decimal"` becomes
       `signed-decimal`, its value is drawn through `sanitizeDecimal()`
       instead of `sanitizeNonNegativeDecimal()` (which strips a stored minus
       on display), and it carries the blank-keeping attribute. Better still,
       move it onto `renderFormField()` as the Annual box is. The build
       chooses whichever keeps its line-layout markup intact.
     - The generic `type=number` guard (`setupAmountFieldValidation()`) does
       not reach either box: both are `type="text"`. It is left alone, and
       the real-UI test below would fail if that changed.
   - `carriedEndingBalance()` returns a negative figure as it is. PDFs and
     screens print it the way `formatMoney` prints any negative on that form
     (parentheses on the Annual and Simplified), matching the workbook's own
     `("$"#,##0.00)` section for `I8`/`H19`.
9. **$0.00 is an answer, and an empty box is not.** Starting Balance, on both
   engines, stores `''` for an empty box and a number for anything typed
   (`0` included), through the per-field blank-keeping opt-in in 71C's table.
   It is needed here because `signed-money`, like `money`, stores `0` for a
   cleared box, and an opt-in leaves Schedule C and E's signed fields
   unchanged. The Annual's required check for Starting Balance uses the
   Simplified's test (`v === '' || v == null`,
   `simplified-accounting/index.js:698`) instead of `validateAnnual()`'s shared
   `req` (`!v`, `index.js:1545`). Only this field changes: `req` serves every
   Annual required field and is not touched globally. *What the filer sees:* a
   $0.00 Starting Balance, typed or carried, is accepted, and an empty box is
   still reported as missing.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** Exact rows, each added for **both** `annual_accounting` and
   `simplified_accounting` (storage root `D`, `persistence_status` `persisted`,
   `sensitive` `none` — the classification the `startingBalance` rows already
   carry; see item 6):

   | `field_path` | `data_type` | `format` | `requiredness` | `allowed_values` | `derived_or_input` | `notes` |
   | --- | --- | --- | --- | --- | --- | --- |
   | `startingBalanceCarry` | object | — | optional | — | derived | Written only by `carriedEndingBalance()` (71E). Absent = no carry recorded (typed by hand, or a test-system filing created before 71E); the notes simply do not appear. No migration (D13). |
   | `startingBalanceCarry.sourceWardId` | string | id | optional | — | derived | The source filing's `wardId`. |
   | `startingBalanceCarry.sourceLabel` | string | text | optional | — | derived | Form type and period only, e.g. "Annual Accounting 03/15/2026–08/31/2026" — no names — so the note still reads if the source is deleted. |
   | `startingBalanceCarry.used` | string | enum | optional | `line30`; `line20`; `inventoryTotal`; `simplifiedRemaining`; `none-trust` | derived | Which figure was carried (D6, D9). |
   | `startingBalanceCarry.value` | decimal | currency | optional | any, negative allowed | derived | The figure carried, `roundCents`-rounded; `''` when `used` is `none-trust`. |
   | `startingBalanceCarry.line20` | decimal | currency | optional | any | derived | Annual-family source only, rounded; else `''`. |
   | `startingBalanceCarry.line30` | decimal | currency | optional | any | derived | Annual-family source only, rounded; else `''`. |
   | `startingBalanceCarry.carriedAt` | string | ISO 8601 date-time | optional | — | derived | When the carry ran. |

   Update the two `startingBalance` rows (CSV lines 59 and 103): `data_type`
   stays `decimal`; `allowed_values` "any amount; negative allowed (Milestone
   71E, D12)"; `notes` "`''` = unanswered; `0` is an answer (71E step 9).
   Carried values are rounded to cents." `npm run verify:data-model` must pass.
2. **Legacy data.** None to preserve (D13): no migration, no on-open
   normalization, no compatibility reader. On the test system, printed
   figures may move by one cent where a total lands on a half cent (the
   intended correction, toward the workbook). Filings created before 71E
   simply have no `startingBalanceCarry`, so the step-5 notes don't appear on
   them.
3. **Fixtures.** `tests/baseline/ms70-conversion-golden.json` (20 occurrences
   of `startingBalance`) and `ms70-year-rollover-golden.json` (12) record carry
   output; re-derive them from the new function, never hand-edit them to pass.
   Grep unit and e2e specs for pinned money strings ending in a cent that a
   half-cent input could move.
4. **Tests.** New:
   - `tests/unit/money-rounding.spec.js`: every row of 71A's measured table
     and the whole sweep, `formatMoney` output === Excel's displayed text.
   - `tests/unit/carried-balance.spec.js`:
     - **All five paths** return a number equal to the source's printed ending
       figure: Annual family → Annual family, Inventory/Annual → Simplified,
       Simplified → Annual, New Year, and Inventory → Annual (now H39).
     - Line 20 is used when D has no nonzero money figure, including a D with
       text-only rows. Line 30 is used when D has amounts but every share is
       blank.
     - **Every pair across the trust boundary** carries nothing, with
       `used: 'none-trust'`: Annual/Final/Inventory/Simplified → Trust and
       Trust → each other type. Trust → Trust and a Trust New Year carry Line
       30.
     - A negative Line 30 carries as that negative.
     - Provenance is recorded with the item-1 fields. Every step-5 note,
       including the amended-period note, fires on the right inputs and on
       no others.
     - The QA source (Line 30 `797229.1849999999`) carries as the number
       `797229.19`, or whatever 71A's rule gives, never the raw double.
     - The Annual accepts a Starting Balance of 0 and still reports an
       empty one.
   - `tests/e2e/carry-balance-matches-prior.spec.ts`:
     - On the QA dataset, the Annual PDF prints Line 20 = Line 30, and New
       Filing from Existing → Final shows the same figure in Starting Balance.
     - → Trust shows a blank Starting Balance and the D9 note.
     - A ward with negative net assets carries the negative into the next
       filing, and it **survives leaving and reopening the form**.
     - On an Annual and a Simplified Accounting, **`-5000` typed into the
       real Starting Balance box with the keyboard** (never injected into
       the model) keeps its minus while typing and after Tab. It survives
       leaving the page, returning, and reopening the saved case file. It
       prints on the PDF as a negative in that form's existing negative
       style, and lands in the exported workbook as `-5000`, read with a
       parser. A typed `0` is accepted with no
       "required" error; a cleared box reports "required".
     - An Inventory PDF and an Annual PDF print the same half-cent value
       identically.
     - Every Annual-family assertion runs for Annual, Final and Trust.

   Red-first for each. `TEST-INDEX.md` rows.
   Existing: `filing-conversion.characterization.spec.ts`,
   `carryover-workflow.spec.ts`, `ward-carryover.spec.js`,
   `convert-ward.spec.ts` — re-run; update only with a stated reason.
5. **Export/import.** Excel: design step 6; re-verify with a real export that no
   formula was overwritten and that a negative Starting Balance lands in `I8`
   as a negative number (AGENTS.md §5 — read the exported file, never
   re-import it). Import: unchanged (`gcNum` already keeps a negative).
   `.sav`: `startingBalanceCarry` rides in the filing object; confirm with the
   existing case-file round-trip specs, do not assume.
6. **Security.** `startingBalanceCarry` holds figures and a filing id from the
   same case the file already holds, plus a label with no names. It is
   encrypted with the rest of the `.sav` when a password is set, and never
   leaves the device. It protects nothing and exposes nothing new. The new
   activity-log event records two money figures and a form label, inside the
   same encrypted log.
7. **UI/UX.** The advisory channel and inline-note pattern already used by
   Milestone 67B and `ward-share-advisories.js`.
8. **Legal framing.** Rule 5.696(b)(1) is quoted, not interpreted beyond "assets
   on hand" pointing at the asset schedule (Line 30), and "if none, the value
   of assets on the inventory" for the Inventory → Annual carry. Whether an
   out-of-balance prior filing's "ending balance" is Line 20 or Line 30 is the
   Clerk's call; the warning surfaces the question to the filer rather than
   hiding it. D9 rests on the Clerk's trust work slip, which is Pinellas
   practice (AGENTS.md §5). It is a reason for the app **not to supply** a
   figure, which cannot mislead a filer in another county the way supplying
   one could. What a trust accounting's starting figure should be is left to
   the filer and, in the follow-on, to BUG-08's own design.
9. **Cross-form.** One rounding function for all nine forms' printed money (the
   Plans print none), and one carry function for all five paths. Negative and
   $0 Starting Balances behave the same on the Annual family and the
   Simplified Accounting.

### Build record — BUILT 2026-09-29

**What was built.**

- `src/core/format/money.js`: `roundCents()` and `formatMoney(v, {style,
  grouping})`, implementing Appendix B's specification (15 significant
  digits, then half away from zero, on the decimal string). `r2()` is
  `roundCents()` under its old name; `fmt()` and `formatDashboardCurrency()`
  are `formatMoney()` in their existing styles.
- Every formatting site in the Evidence table now calls `formatMoney()`, in
  its own style: `dollar` on the Annual and Simplified PDFs ("$-1,234.50"),
  `signFirst` on the Inventory PDF ("-$1,234.50"), `parens` on the Annual
  screens, `dollarParens` on the Simplified screens and the dashboard, and
  no grouping for the Simplified workbook's amount string. Both audit-fee
  figures use it too.
- `annualReconcileState()` compares the two lines as they print: balanced
  only when `roundCents(line20) === roundCents(line30)`, and the difference
  shown is the difference of the printed figures.
- `src/core/filing/schedule-d-figure.js`: `hasScheduleDFigure()`, a D-1 to
  D-5 row with a nonzero number in any money column. `headlineTotal()` uses
  it, so the dashboard and the carry agree.
- `src/core/filing/starting-balance-carry.js`: `carriedEndingBalance()`,
  `applyCarriedStartingBalance()` (writes the number and the
  `startingBalanceCarry` record), `crossesTrustBoundary()`,
  `startingBalanceNotes()` and its HTML. All five paths call it:
  `carry-over.js` (New Filing from Existing), `conversion.js` (Inventory →
  Annual family, which now carries; → Simplified; Simplified → Annual
  family) and `filing-years.js` (New Year).
- `describeConversion()` says "Starting Balance is left blank…" for every
  pair across the trust boundary, and says that the Initial Inventory's total
  becomes the Starting Balance for Inventory → Annual/Final.
- The notes appear beside Starting Balance on both engines' pages and in
  Preview & Export (`output-preflight.js`), never blocking.
- Starting Balance keeps a negative: removed from
  `sanitizeNegativeAmounts()`; the Annual box is `signed-money` with the
  blank-keeping opt-in (through `inpD()`'s new options argument); the
  Simplified box is `signed-decimal`, `inputmode="text"`, drawn through
  `displayDecimal()`, with the blank-keeping opt-in.
- The Annual's required check for Starting Balance accepts 0 and reports only
  an empty value. `req` is unchanged.
- Data model: both `startingBalance` rows updated, and eight
  `startingBalanceCarry.*` rows per engine (1,041 rows; `verify:data-model`
  passes).

**Decisions taken during the build.**

- **The carry lives in its own module**, `starting-balance-carry.js`, not
  inside `carry-over.js` as design step 4 said. Five callers need it (two
  pages, Preview & Export, conversion, New Year), and `carry-over.js` also
  holds the carry-source picker's page code. It is the one allowed exception
  added to `filing-type-enumeration-guard.spec.js`. `conversion.js` asks it
  `crossesTrustBoundary()` rather than naming the Trust Accounting itself.
- **A figure that rounds to zero prints 0.00, never "-0.00" or "($0.00)".**
  Appendix B's measurement has no negative smaller than half a cent, so this
  is a choice, not a measurement. Where Excel shows such a value is
  unconfirmed. A reconciliation difference of −0.000000001 printing as
  "($0.00)" would mislead a filer.
- **"The prior filing's ending balances differ" appears only when Line 30
  was carried.** When the source has no Schedule D, its Line 30 is $0 by
  construction, and the note would fire on every such filing.
- **"Starting Balance differs from the prior filing's ending balance"**
  compares the figures as they print, and stays silent while the box is
  empty (the required-field error already covers that).
- **The amended-period note** matches the same form type, the same `caseId`,
  the same `periodFrom` and `periodTo`, Amended Form = Yes, and never the new
  filing itself.
- **The Simplified box keeps its hand-written markup** (the design's
  allowed choice), so its line layout is unchanged.
- **No activity-log entry.** Checklist item 6 mentions one; it belonged to
  the normalization withdrawn by D13.
- **Unused imports.** `carry-over.js`, `conversion.js` and `filing-years.js`
  no longer import `features`, which only the carry used.

**Found during the build.**

- `ms70-conversion-golden.json` and `ms70-year-rollover-golden.json` had
  been stale since 71B: 71B's new blank fields were not in them, and the two
  characterization specs were not in 71B's targeted runs. Both were
  regenerated here from the running app, not hand-edited. Each golden's note
  records the 71B and 71E changes.

**Tests.**

- New: `tests/unit/money-rounding.spec.js`. Every one of 71A's 3,480
  measured cases, in the Clerk's format and `#,##0.00`, and all 322 visible
  real-export cells, must equal Excel's own text.
- New: `tests/unit/carried-balance.spec.js`. It covers the one carry for
  every source, every pair across the trust boundary, the four conversion
  and carry-over paths called directly, the dialog text, the provenance
  record, each note, $0 versus blank, and the printed-equality balance check.
- New: `tests/e2e/carry-balance-matches-prior.spec.ts`. It runs for Annual,
  Final and Trust, and covers:
  - the QA figures balancing at $797,229.19;
  - the carry to a Final (a converted one, or a New Year);
  - a blank Trust Accounting with its note;
  - `-5000` typed with the keyboard, kept through leaving the page and
    reopening the filing, printed as "$-5,000.00", and landing in
    `'PART VI, VII '!I8` as −5000;
  - 0 accepted, and blank reported;
  - a negative ending balance carried and surviving a reopen.

  The Simplified box does the same through `'PARTS I, II '!H19`. The
  Inventory and Annual PDFs print a half cent alike. All three exported
  workbooks keep every template formula on every sheet they keep, read with
  ExcelJS from the exported file.
- Updated, with reasons: `convert-ward.spec.ts` (the Annual → Trust
  description), `filing-type-enumeration-guard.spec.js` (the exception), and
  both characterization goldens.
- **Red-first**, with the implementing files stashed:
  - unit: $0.00 was reported missing; −5000 became 0; 797,229.19 against
    797,229.18 read as balanced. With only `conversion.js` and
    `carry-over.js` stashed:
    - New Filing from Existing carried the text `"0"` (a $0 Line 30);
    - Inventory → Annual carried nothing;
    - the Annual → Trust dialog promised "Starting Balance is set to this
      filing's ending net assets".
  - e2e, `src/` stashed, all 11 fail:
    - the banner read "(797,229.18) equals … (797,229.19)";
    - −5000 showed as 5000, and −250.5 as 250.5;
    - a carried −5000 became 0 on opening;
    - a Final's or Trust's New Year carried the text `"-5000"`;
    - the Inventory PDF printed $1.00.
  - Formatter, with only the exponent handling reverted: a 19-digit value
    printed `1,234,567,890,123,460,096.00`, and a 22-digit value threw
    "Cannot convert 1e+21 to a BigInt", which would break the page showing
    it.
- All 163 unit files pass (2,212 tests). `check:types` and
  `verify:data-model` (1,041 rows) are clean.
- The targeted browser specs pass: 80 tests in the specs below, and the new
  spec's 11.
  - `carryover-workflow`, `convert-ward`, both characterization specs;
  - `annual-mount`, `excel-form-field-placement`, `pdf-form-specific`,
    `pdf-structure-tags`, `dashboard-visual`.
- **Excel acceptance (verification plan).** One real export of each
  template was read with ExcelJS and compared with the Clerk's template. On
  every sheet the export keeps, no template formula cell holds a plain value,
  with two exceptions, both listed exactly in the spec:
  - Annual `'PART II, III'!F25` (Guardian #1's name): decided 2026-09-19,
    allowed with an advisory.
  - Inventory `'PART III'!F8`: see "Found during the build".

  A formula that blank-page pruning rewrote is not counted. Pruning drops
  removed pages from each page-total formula by design, and its own specs
  cover that.

**Decision taken after review.**

- **A value past 15 significant digits prints its 15-digit figure with
  zeros.** The formatter first expanded exponent form through a JavaScript
  number, which brought back binary digits and threw from 10²¹ up. It now
  moves the decimal point in the 15-digit string itself. No filing holds such
  a figure; a mistyped one should print, not break the page.

**Found during the build, not fixed (outside Milestone 71).**

- **Inventory `'PART III'!F8`.** The export writes the first guardian's name
  over the template's `='SUMMARY I '!D23`, the guardian named on Summary I.
  Usually the two names are the same. When they differ, the filed Part III
  shows the guardian card's name, not Summary I's, and nothing warns the
  filer. The Annual has the same kind of overwrite at `F25`, which was
  decided with an advisory; the Inventory's was never decided.
  `excel-write-targets.spec.js` cannot see it: the Inventory writes Part III
  through a computed address (`` `F${b+1}` ``), which that guard's pattern
  does not read. The same blind spot would hide any other computed-address
  write. Needs its own decision: conform to the Annual's approach (allow,
  with an advisory) or stop writing F8.

---

## Verification plan for the milestone

Per AGENTS.md §2:

- **Each item:** its targeted specs, red-first for every new test that claims
  to catch a regression.
- **Type check:** 71C and 71E change `src/core/form/form-runtime.js`, which
  is in the checked program transitively (its own header says so; the router
  imports it), and 71E adds to `src/core/filing/`. Run `npm run check:types`
  after 71C and after 71E, and after any item that touches a file in
  `tsconfig.json`'s `include` list or pulled in by one.
- **Data model:** `npm run verify:data-model` after 71B, 71C, 71D and 71E.
- **Full regression:** all four code items are cross-cutting (three form
  engines, the shared form contract, every money figure). **Recommend `npm test`
  after 71E** — to be run only with the requester's go-ahead.
- **Excel:** 71E's acceptance includes opening a real exported workbook for each
  of the three templates and confirming, with a parser, that no formula cell was
  written.

### Full regression — run 2026-09-29, after 71E (`025657a`)

Pre-approved by the requester for this one point.

- **Unit:** 163 files, 2,212 tests, all pass.
- **Browser:** 971 passed, 7 skipped, 2 failed, in 1.7 hours (serial).

**Failure 1, a real defect from 71B.** `sidebar-only-wants.spec.ts`, Plan
for Minors, Preparer & Attorney. Fixed; see 71B's Build record, "Follow-up,
found by the milestone's full regression".

**Failure 2, time limit, not Milestone 71.** `routes.spec.ts`, "all 9 form
types render a standardized summary page", exceeded its 60-second limit. It
passes alone (47 s). The same test was timed on the code before and after
Milestone 71, on the same drive, at the same hour:

| Copy | Run 1 | Run 2 |
| --- | --- | --- |
| Before 71 (`4aa091f`), C: | 21.9 s | 22.6 s |
| After 71 (`025657a`), C: | 22.4 s | 24.4 s |
| After 71, D: (the repository) | 47.3 s | 49.1 s |

The difference is the drive. D: is FAT32, and pages and code modules load
from it about twice as slowly. That matches the whole run: files ran a
median 2.2 times longer than in `tests/baseline/milestone-59-runtime.json`,
including files no part of 71 touches. Near its limit on D:, this test fails
under full-suite load. It is not changed here. The options are for the
requester: a longer limit for this one test, or running the suite from an
NTFS drive.

After the fix, the targeted specs pass: `sidebar-only-wants`,
`section-guidance-invariant`, and `plan-minor-mount` with the Plan for
Minors navigation checks (25 tests), plus all 163 unit files. The full
browser suite was not re-run; the one pre-approved run was used.

---

## Questions for the Clerk

Collected here so they can be sent together. None blocks the build; each is
answered by a default the requester has chosen.

1. **Certificate of service by an unrepresented guardian (71B, D5, D11).** When
   a guardian advocate, a guardian with representation waived, or a Simplified
   Accounting filer has no attorney, the app will have the guardian who served
   the copies sign the certificate. Rule 2.516(a) puts service on "the filer",
   and 2.516(f) lets "a person" establish proof of service with five elements.
   Does the Clerk's office accept that? Is there wording it prefers, and with
   co-guardians, does it expect one certificate or one per guardian?
2. **The "no attorney" line on the PDF (71B, step 6).** Is the proposed
   one-line statement of the basis acceptable, and does the Clerk want the
   waiver order's date on it?
3. **Statute citations in the workbooks' certificates.** The Annual certificate
   cites §744.367(4); in the current statute service is §744.367(3)(b), and (4)
   concerns reviewing the report with the ward and objections. The Inventory and
   Simplified certificates cite §744.362(1), the initial-report section, which
   fits the Inventory but not the Simplified *annual* accounting.
4. **Attorney attestation wording (report BUG-06).** Both accounting
   workbooks print "…the filing of the [annual/simplified annual] accounting of
   the Guardian [ward's name]". Intended?
5. **Audit-fee base (report Legal Q-03).** Net assets (Line 30) or gross, for
   the §744.3678(4) tiers?
6. **Template housekeeping (report UX-35/36).** The very-hidden
   `Acerno_Cache_XXXXX` sheet in all three workbooks, and the trailing
   semicolon in `B-3 INTANGIBLE pg 1;`.
7. **Part VIII cell formats.** The Annual workbook's `PART VIII` formats Trust
   1's type, percentage and amount cells (D16, D17, D18) as dates
   (`mmmm d, yyyy`), and Trusts 2 and 3's percentage cells (D27, D37) the same
   way (the cells checked). Intended? A trust amount
   entered as a number displays as a date (71A: $80,000 shows as "January 11,
   2119").
8. **A trust accounting's starting figure (D9, BUG-08 follow-on).** For a first
   trust accounting, is "the disbursement amount on the annual accounting" a
   single line the app could identify (for example, a Schedule E transfer to
   the trust), or does the filer always supply it?

---

# Appendix A — Evidence record

Everything below was read with a parser or measured on 2026-09-29.

**Workbooks** (`templates/*-template.js`, base64-decoded, unzipped, sheets and
shared strings parsed with `xml.etree.ElementTree`):

| Book | Cell | Content |
| --- | --- | --- |
| Annual | `PART IV, V` B22 / B23 / B24 | "…accounting of the Guardian ____" / "Ward's name" / `=Name_of_Ward` |
| Annual | `PART VI, VII ` B8 | "Starting Balance [Net Assets at End of Accounting Period, per the Prior Period Report]" |
| Annual | `PART VI, VII ` I20 / I30 / B31 | `=I8+I11+I17+I19` / `=SUM(H25:H29)` / "Line 20 should equal line 30…" |
| Annual | `PART X` F6 / B9 / B24 / K25 | "GUARDIAN ATTORNEY" / "Pursuant to the Florida Statute 744.367(4), I hereby certify…" / "Attorney Signature" / `=Attorney` |
| Annual | `PART IX ` B11 | "Bond Calculation consists of liquid assets: all cash, personal property or intangible assets. Only real property is not considered liquid." |
| Annual | `PART II, III` B13–G17 | Audit-fee tiers $20 / $85 / $170 / $250 by "value"; no base formula |
| Annual | `SCH C CAPITAL ADJ p1` C17 | "IMPORTANT: Losses should be entered as negative numbers, e.g., -2500." |
| Annual | all sheets | zero `ROUND(` formulas |
| Inventory | `PART VI` F5 / B8 / B26 / J27 | "GUARDIAN ATTORNEY" / "Pursuant to the Florida Statute 744.362(1)…" / "Attorney Signature" / `='SUMMARY I '!D24` |
| Inventory | `SUMMARY I ` H39 | `=H32+H38`, "VERIFIED INITIAL INVENTORY OF GUARDIAN" |
| Simplified | `PARTS V, VI ` B8–B10 | "…of the Guardian ____." / "Ward's name" / `='PARTS I, II '!C4` |
| Simplified | `PARTS V, VI ` F22 / B25 / B40 | "GUARDIAN ATTORNEY" / "Pursuant to the Florida Statute 744.362(1)…" / "Attorney Signature" |
| All three | sheet list | `Acerno_Cache_XXXXX`, state `veryHidden` |
| Inventory | sheet list | `B-3 INTANGIBLE pg 1;` |

**Statutes and rules** (`reference/legal/statutes/`, extracted with
`pdftotext -layout`): §744.362(1), §744.365, §744.367(3)(b) and (4),
§744.3678(4)–(5), §744.3679(1)–(3), §744.527(1); Fla. Prob. R. 5.030(a), 5.041,
5.620, 5.690(b), 5.695(b), 5.696(a)–(b). Quoted text in the items above is
verbatim from those extractions.

**Rules 2.515 and 2.516**:
`reference/legal/statutes/Florida-Rules-of-General-Practice-and-Judicial-Administration-07-01-26.pdf`,
the Florida Bar's compilation dated July 1, 2026, downloaded 2026-09-29 from
`www-media.floridabar.org`
(`uploads/2026/08/2027_01-JULY-Florida-Rules-of-General-Practice-and-Judicial-Administration-7-1-2026.pdf`;
SHA-256 `a7fba18f1ca3c5d7f313b1a53c744a654ef29ca14bde57b3c22db0d92dbdbba2`),
pages 169–175, extracted with `pdftotext -layout`. Rule 2.515(a) and (d)(3),
and Rule 2.516(a), (b)(2)(A) and (f), are quoted verbatim in 71B.

**Form layers** (read 2026-09-29, for 71C's layer table):
`src/core/form/form-fields.js` `renderFormField()` (`isAmountField`,
`format`, `cleanedValue`, `inputType`); `src/core/form/form-contract.js`
`getControlKind()` `:297-316`, `writeDraftValue()` `:399-406`,
`finalizeFieldValue()` `:548-561`;
`src/features/guardian-inventory/form-binding.js` `bindForms()` `:16-88`;
`src/core/form/form-runtime.js` `setupAmountFieldValidation()` `:21-38`,
`sanitizeNegativeAmounts()` `:40-52`; `src/core/navigation/router.js:212`;
`src/core/form/preparer-flag.js` header (Milestone 67A).

**Workbook formats and validations** (parsed 2026-09-29): money totals
numFmtId 7 `"$"#,##0.00_);("$"#,##0.00)` at Annual `'PART VI, VII '!I8`, `I20`,
`I30`, `'SCH D-1 CASH p1'!K25`, `K59`, Inventory `'A-1-REAL ESTATE pg 1'!I17`,
`'SUMMARY I '!H39`, Simplified `'PARTS I, II '!H19`. Share cells numFmtId 10
`0.00%` at Annual `'SCH D-1 CASH p1'!I25`, Inventory
`'A-1-REAL ESTATE pg 1'!H17`. `'PART VIII'!D16`, `D17`, `D18`, `D27`, `D37`
numFmtId 165 `[$-409]mmmm d, yyyy;@`. Every `<dataValidation>` in all three workbooks:
Annual 60 `list` + 1 unconstrained, Inventory 16 `list`, Simplified 3 `list`.
None is numeric.

**Clerk's work slips** (`reference/legal/workslips/*.docx`, `word/document.xml`
parsed): the attorney / waiver-order and starting/ending-balance lines quoted in
71B and 71E, and the trust-accounting beginning-balance lines behind D9 (`GD
ANN Work Slip TRUST.docx`), appear in `GD ANN WORK SLIP AUDIT.docx`, `GD ANN Work Slip
TRUST.docx`, `GD ANN Work Slip Review.docx`, `GD ANN Work Slip Minor
Review.docx`, `GD INIT Work Slip Inventory.docx`, `GD INIT WORK SLIP
REVIEW.docx` and `GD ANN Work slip Simplified 02272020.docx`.

**Rounding** (Node 24.16.0): the table in 71A.

# Appendix B — Excel rounding measurement

Measured 2026-09-29 by 71A, through Excel's COM interface, read-only; the
scratch workbook was never saved and the throwaway export spec was deleted.

**Conditions.** Microsoft Excel 16.0.19127.20752 (`Application.Build` 19127),
Windows 11 Enterprise 10.0.26100, culture `en-US`; decimal separator `.`,
thousands separator `,`, `UseSystemSeparators` on. The result below is claimed
for these conditions only.

**Controlled workbook: 3,480 cases.** Each was generated in Node and written
into Excel as the identical double (emitted with `String(x)`, parsed by .NET's
round-trip parser). Excel then formatted each case three ways: the Clerk's
money format `"$"#,##0.00_);\("$"#,##0.00\)` (numFmtId 7), `#,##0.00`, and
`0.00`. Every column was 40 characters wide; no `####` reading occurred.

- *named* (16): the values in 71A's table, `0.125`, `0.005`, `999999999.995`,
  and the negative of each;
- *sweep* (3,400): every half-cent ending `.005`–`.995` on 17 integer parts
  from 0 to 999,999,999, and each negative;
- *product* (56): `full × share` computed by an Excel formula, for eight
  amounts ending in odd cents and seven shares (0.5, 0.25, 0.333333, 0.125,
  0.75, 0.1, 0.07);
- *sum* (8): additions whose binary result is not the decimal one
  (`0.1+0.2`, `797229.18+0.0049999999`, …).

For every formula case, Excel's stored double equalled JavaScript's own result
(no 15-digit snapping on these operations). The three formats agreed on every
case.

| Method | Cases where it prints a different figure from Excel |
| --- | --- |
| `r2()` — `Math.round(x*100)/100` (`money.js:16`, the Inventory PDF) | **1,712** of 3,480 (it rounds negative halves toward zero, and `1.005` down) |
| `toFixed(2)` (audit fee, Simplified Excel string) | **1,648** |
| `toLocaleString` / `Intl.NumberFormat` (Annual and Simplified screens and PDFs) | **3** (`±797229.1849999999`, and the same value built by a sum) |
| **Reduce to 15 significant digits, then round half away from zero** | **0** |

Selected rows:

| Value (double) | Excel displays | `r2()` | `toLocaleString` | `toFixed(2)` | 15 digits, half away |
| --- | --- | --- | --- | --- | --- |
| `797229.1849999999` | `$797,229.19` | 797,229.19 | **797,229.18** | **797,229.18** | 797,229.19 |
| `-797229.1849999999` | `($797,229.19)` | **-797,229.18** | **-797,229.18** | **-797,229.18** | -797,229.19 |
| `1.005` | `$1.01` | **1.00** | 1.01 | **1.00** | 1.01 |
| `-1.005` | `($1.01)` | **-1.00** | -1.01 | **-1.00** | -1.01 |
| `2.675` | `$2.68` | 2.68 | 2.68 | **2.67** | 2.68 |
| `-0.005` | `($0.01)` | **0.00** | -0.01 | -0.01 | -0.01 |
| `20000.005` (`40000.01×0.5`) | `$20,000.01` | 20,000.01 | 20,000.01 | 20,000.01 | 20,000.01 |
| `999999999.995` | `$1,000,000,000.00` | 1,000,000,000.00 | 1,000,000,000.00 | 1,000,000,000.00 | 1,000,000,000.00 |

**Real exports.** Three filings were built in the app (a throwaway Playwright
spec against the local server) with half-cent Ward's shares, and exported with
Save as Excel: an Annual Accounting, an Initial Inventory and a Simplified
Accounting. Each `.xlsx` was opened read-only in Excel and fully recalculated.
Then every formula cell on all 51 sheets whose value is a number and whose
format is a two-decimal, non-percent format was read: **340 cells**, and no
formula cell held an error value.

- The 15-digit rule reproduces all 322 cells with visible text.
- The other 18 hold `0` in the helper column `'SCH B-4 OTHER DISB p2'!AK8:AK25`,
  whose Accounting format (`_($* #,##0.00_);…;_($* "-"??_);…`) displays no
  digits for zero, so there is no rounding to compare.
- `r2()` and `toLocaleString` each misprint one real cell:
  `'PARTS I, II '!H31` on the Simplified workbook holds `1233.5549999999998`
  (`1234.56 + 0.1 + 0.2 − 0.3 − 1.005`) and Excel shows **`$1,233.56`**; both
  methods print 1,233.55.

Key cells:

| Workbook | Cell | Formula | Value | Excel displays |
| --- | --- | --- | --- | --- |
| Annual | `'SCH D-1 CASH p1'!K25` | `=H25*I25` | `20000.005` | `$20,000.01` |
| Annual | `'SCH D-1 CASH p1'!K28` | `=H28*I28` | `797229.185` | `$797,229.19` |
| Annual | `'PART VI, VII '!I20` | `=I8+I11+I17+I19` | `797729.18` | `$797,729.18` |
| Annual | `'PART VI, VII '!I30` | `=SUM(H25:H29)` | `819555.73621667` | `$819,555.74` |
| Inventory | `'SUMMARY I '!H39` | `=H32+H38` | `818772.39875` | `$818,772.40` |
| Simplified | `'PARTS I, II '!H31` | — | `1233.5549999999998` | `$1,233.56` |

**Part VIII, confirmed.** With a trust at 25% and $80,000, the exported
`'PART VIII'!D17` shows `25` (written as text, so the date format has no
effect), but **`D18` shows `January 11, 2119`**: the number 80000 under the
Clerk's date format `[$-409]mmmm d, yyyy;@`. The finding listed under
[Not covered](#what-this-milestone-covers-and-what-it-does-not) is therefore
confirmed, not provisional. It remains out of this milestone's scope.

**Specification for 71E.** `roundCents(x)`:

1. If `x` is not a finite number, the result is 0.
2. Take the decimal form of `x` to **15 significant digits** (`x.toPrecision(15)`,
   expanded if in exponent form).
3. Round that decimal — not the binary value — to two places, **half away
   from zero**: `…5` in the third decimal rounds up in magnitude for positive
   and negative alike.
4. Return the resulting two-decimal figure; `formatMoney()` prints that figure's
   digits directly, never re-rounding the binary result.

The decision point did not trigger. Excel's display is a deterministic
function of the stored double alone, and the same function holds under all
three formats measured.
