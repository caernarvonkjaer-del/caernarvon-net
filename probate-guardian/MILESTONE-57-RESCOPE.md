# Milestone 57 — Re-scope After the Revert

## Status

**57C-R landed 2026-09-18.** Approved by name by Alan and shipped in
`aacbd56` / `460a228` / `ff1f97d`, with `8d5b5f6` updating the 18 fixtures the
prompt interrupts. Full suite green at the time: 607 passed, 6 skipped, 0
failed. See the dated note on the 57C-R section below for what actually
shipped and how it differs from the design here.

**Updated 2026-09-19, end of day. Two items remain to build, plus one
intermittent test; everything else is landed or closed.**

| Still open | State |
| --- | --- |
| **57B** | Certificate-of-service recipient rules. **Execution-ready — see the 57B section.** Not authorized |
| **57E-1** | `hasTrust: 'Yes'` with every trust field blank exports silently. **Execution-ready — see the 57E-1 section.** Not authorized |
| `routes.spec.ts:84` | Intermittent, **not** order-dependent, and not diagnosed — see the note at the end of this document |

Landed this day: **57A** (`4ad465b`), **57D** in full, **57F(b)**, and
**D10–D15**. Closed as premise-incorrect, unspecified, or not worth chasing:
**57G**, **57E-2**, **57F(a)**, the trust-question item. **57C-R** landed 2026-09-18. Nothing still open is
approved to build — per `AGENTS.md` §3 that needs Alan's word, by name, per
item.

Two of the remaining items shrank to almost nothing once the court's own
workbooks were read rather than the proposal: **57E-1 is already built** and
closer to the form than it proposed, and **57F's Excel half would have
destroyed the template's own header propagation.** That pattern is now
`AGENTS.md` §5.

Decisions 1–5 were settled before 57C-R was built and are about 57C-R only;
**D6–D9, near the end, are the ones that govern what is left.** This document
does not replace
`MILESTONE-57-PROPOSAL.md` — that one records what was originally asked for,
and `MILESTONE-57-REVIEW-HANDOFF.md` records the review verdict and the B-4
template research. Both are still current inputs. This is the third document:
what a *second attempt* should actually build, now that the first one has been
reverted and its failure understood.

Written for whoever executes the next attempt — Alan, or another agent picking
this up cold.

---

## Why the first attempt failed, in one paragraph

Milestone 57 landed with the unit suite red on four governance guards, needed
three repair commits, had 57H reverted outright for putting a full
plaintext copy of the case in browser storage, and — when a full Playwright run
was finally made against it — failed **46 e2e tests across 16 specs**, including
all four Plan filings, PDF rendering and signature capture, none of which it
claimed to touch. It was reverted in `ecabe69`.

The root cause is narrower than the blast radius suggests. **57C made every
populated financial schedule produce an outstanding validation issue, and
pushed the same condition into `computeNavChecks()`.** The first half meant no
filing was ever "clean", so the Preview blocked-panel appeared on filings the
suite expected to export. The second half meant the sidebar reported sections
incomplete, which broke the navigation/status contract on its own — 9 failures
before anything else was considered. The wiring was *correct*, and in the 1:1
sidebar/export parity the milestone claimed. The tests failed because the
product's behavior changed, which made it a policy question rather than a
defect.

**That policy question has now been answered** (Decision 1 below), and the
answer is a different design from the one that was built.

---

## The thing the first attempt did not notice

The app already contains an acknowledge-before-output mechanism, complete and
tested, and 57C did not use it:

| Capability | Where it already lives |
| --- | --- |
| Gate output on outstanding items | `src/core/filing/output-authorization.js` — `authorizeFilingOutput()` returns `allowed` / `acknowledgement-required` / `blocked` |
| Modal requiring an explicit yes | `src/core/pdf/pdf-preview.js:435` — `confirmModal(...)`, a `dialogs.js` modal per Milestone 50G |
| Re-arm the gate after any edit | `markFilingRevisionChanged()` bumps a revision and clears the acknowledgement |
| Hard block where bypass is wrong | `issue-registry.js` — `bypassable: false` (corrupt supplemental PDFs, missing templates, identity conflicts) |

Ordinary field-validation issues already default to **bypassable**
(`validation.legacy-unmapped: bypassable: true`), so they already flow through
that modal. The "Continue despite outstanding requirements" button in the
Preview blocked-panel is this mechanism, shipping today.

Worth stating plainly because it changes how the next attempt should be judged:
**57C's requirement could have been an ordinary bypassable issue and would then
have needed almost no new code.** It is not obvious from the outside that this
machinery exists, which is an argument for reading `output-authorization.js`
before designing any new gate, not an argument that the first attempt was
careless.

---

## Decision 1 — the evidence gate fires at data entry, not at export

**Alan's decision, 2026-09-17:** *a populated financial schedule should initiate
a warning modal that requires a yes they understand supplemental documentation
is required before proceeding* — asked **once per schedule, at the point the
schedule becomes populated**, not on every export.

The alternative considered and rejected was routing it through the existing
export-time acknowledgement path. That would have reused everything above and
needed very little code, but it would have put a click-through in front of
**every export of every accounting filing** (the acknowledgement clears on each
edit, by design), and it would have required roughly 46 e2e fixtures to
acknowledge before exporting. The chosen design asks once, when the obligation
becomes real, and leaves export gating and the sidebar untouched.

**What follows from that, and is the whole point of the choice:**

- `computeNavChecks()` is **not** touched. This is the single most important
  constraint in this document. It is what broke 9 navigation-status tests.
- `validateGuardian()` / `validateAnnual()` gain **no** new issue. No filing
  becomes un-clean, so the Preview blocked-panel behaves exactly as it does
  today and no export fixture needs changing.
- No `checklist-export-parity` `KNOWN_GAPS` entry is needed, because nothing
  becomes export-visible-but-not-a-nav-check.
- The acknowledgement is **persisted case data**, which means a data-model
  change — the one real cost of this design.

---

## 57C-R — Supplemental-Documentation Acknowledgement

> **LANDED 2026-09-18.** `aacbd56` (module + unit contract), `460a228`
> (persistence and legacy `.sav` migration), `ff1f97d` (modal, mount hooks,
> browser contract), `8d5b5f6` (the 18 fixtures the prompt interrupts). Suite
> green: 607 passed, 6 skipped, 0 failed.
>
> Shipped as designed below — `src/core/filing/schedule-doc-ack.js`, one mount
> hook per family, acknowledgement stored per period under
> `D.scheduleDocsAck`, participating in neither validation nor navigation.
> Coverage: 34 unit tests, 7 browser tests, plus `dismissScheduleDocPrompt()`
> in `tests/e2e/support/target.ts`.
>
> **Three things the design did not anticipate, worth knowing before building
> anything shaped like this again:**
>
> 1. **The prompt must not be awaited.** `mount()` calls it as a floating
>    `void promptScheduleAckIfNeeded(...).catch(() => {})`. Awaiting it wedges
>    `navigate()` — three tests timed out and the suite went from 17s to 3.2
>    minutes on that path before this was understood.
> 2. **It needs a re-entrancy guard.** Two mounts in quick succession stacked
>    two dialogs and tripped a Playwright strict-mode violation. A
>    module-level `promptInFlight` flag, cleared in a `finally`, fixes it;
>    `__resetScheduleAckPrompt()` exists so tests can clear it between cases.
> 3. **The fixture cost of Decision 1 was 18 fixtures, not zero.** The
>    data-entry trigger point interrupts any fixture that mounts a schedule
>    page with data already in it. That is still far cheaper than the
>    export-time alternative, which would have hit roughly 46 — but the
>    decision was not free, and this document's Decision 1 should be read with
>    that number attached.

**Risk: Medium.** Touches the data model and two feature dispatch points.
Low blast radius by construction — nothing it adds participates in validation
or navigation.

### The schedules in scope

Re-derived from the reverted `schedule-evidence.js`, which got this part right
and is worth reusing rather than re-deriving. **25 financial schedules**, being
those with both an entry collection and an upload section; narrative Plan pages
are deliberately excluded and have no evidence obligation.

- **Guardian Inventory (11):** `a1 a2 b1 b2 b3 b4 c1 c2 c3 c4 c5`
- **Annual family (14):** `schA schB1 schB2 schB3 schB4 schC schD1 schD2 schD3
  schD4 schD5 schE schF1 schF2`

The Annual family covers `annual`, `finalAccounting` and `trustAccounting`,
which share one engine. **Derive that from
`filing-descriptor.js`'s `resolveDescriptorForInventoryType(...).engineId`,
not by hand-listing the three type keys** — `efdd45a` had to fix exactly that
re-enumeration in the first attempt, and `filing-type-enumeration-guard.spec.js`
exists to catch it.

### Trigger point — one per family, on mount

**Decision D3 makes this a render-time check, not an Add-button hook.** The
modal fires when the filer lands on a financial schedule that has rows and no
acknowledgement for the current period, however those rows arrived.

| Family | Site |
| --- | --- |
| Guardian Inventory | `src/features/guardian-inventory/index.js:95` — `export async function mount(container, page)` |
| Annual family | `src/features/annual-accounting/index.js:100` — `export async function mount(container, page)` |

Both already switch on `page` to pick a schedule renderer, so the route → schedule
key mapping this needs is the one they already perform. Re-derive both line
numbers at execution time.

**This replaces the two Add-button dispatch sites an earlier draft named**
(`guardian-inventory/index.js:172`'s `add-entry` and
`annual-accounting/index.js:263`'s `add-row`). Hooking `mount()` is both
simpler — one trigger per family instead of two, and no second mechanism for
imports — and strictly more complete: it catches a schedule populated by Excel
import or by *New Filing from Existing*, neither of which passes through an Add
button. That hole is the reason D3 was asked.

The cost, stated rather than discovered: the modal now interrupts **navigation**
rather than an action the filer just took. Combined with D4 (a non-yes does not
block), landing on a populated unacknowledged schedule shows the modal, and
dismissing it lets the page render normally — the modal simply returns next
visit. That is intended: it recurs until acknowledged. It also means the modal
must not fire on a schedule with no rows, or every fresh filing would greet the
filer with 25 dialogs.

### Steps

**C1.** Add `D.scheduleDocsAck` to the data model and to
`probate-guardian-data-model.csv`, period-nested per D2/D3, following the row
shape the existing `scheduleDocs.<key>[periodKey]…` rows use. Note that
`ecabe69`'s follow-up (`8987467`) removed 38 stale rows the first attempt left
behind — do not reintroduce a row for a field this design does not ship.

**C2.** Add a pure state module — which schedules are in scope for a filing
type, whether a given schedule is populated, and whether it is acknowledged for
the active period. Pure and exported, so C6 can unit-test it without a browser.
Derive the family from `filing-descriptor.js`'s
`resolveDescriptorForInventoryType(...).engineId`; do **not** hand-list
`annual` / `finalAccounting` / `trustAccounting`.

**C3.** Add the modal. `confirmModal({ title, message, confirmLabel,
cancelLabel })` from `src/core/ui/dialogs.js:103`. Wording should state what the
filer is confirming, not warn that something was refused (see D5): that
supporting documentation for this schedule is expected, that the app does not
collect it for them, and that they can attach it in this schedule's Supporting
Documents section. **No native `confirm()`** — `native-dialog-guard.spec.js`
(50G-3) forbids it outright.

**C4.** Hook both `mount()` functions: after the schedule renders, if the route
maps to a financial schedule that has rows and no acknowledgement for the
active period, show the modal and record a yes. A no leaves the page working
and the flag unset (D5). Guard against firing on an empty schedule.

**C5.** `normalizeWardData()` (`src/legacy-app.js:6351`) gives every legacy
`.sav` a defined value for the new field, so an old case file does not read as
"acknowledged" or crash on a missing object.

**C6.** Tests, red-first:
- A unit spec for the acknowledgement state model — which schedules are in
  scope per family, derived from the descriptor registry rather than a hand
  list; what an un-normalized legacy shape resolves to.
- An e2e spec: the modal appears on landing on a populated financial schedule,
  does **not** appear once acknowledged, does **not** appear on an empty
  schedule, does **not** appear on a narrative Plan page, returns after a
  dismissal (D5), appears for a schedule populated by **Excel import** rather
  than by the Add button (D4 — the hole this design exists to close), and
  survives a `.sav` round-trip.
- A period test: acknowledge, roll the filing to a new period, and confirm the
  modal returns (D3) — the assertion that proves the period key is wired to
  `resolveActiveDocPeriod()` and not to something that merely looks stable.
- **A regression assertion that this changes nothing about validation or
  navigation:** export a filing with populated schedules and no acknowledgement
  and confirm it still exports, and that `computeNavChecks()` is unchanged.
  This is the test that would have caught the first attempt on day one.

**C7.** `TEST-INDEX.md` rows per `AGENTS.md` §7; `verify:data-model`;
`window-bridge` allow-list if anything new is bridged.

### Verification

Targeted unit + the new e2e spec. **Plus a full e2e run before it is called
done** — this milestone's first attempt is the reason that is not optional
here, and the environment that produced it could not run Playwright at all.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration:** a new persisted field, so both apply.
  C5 is the migration.
- **Legal/Compliance:** the modal states a filing obligation. Its wording
  should not assert a statutory duty the app cannot substantiate — the original
  proposal was explicit that 57C "does not assert a legal duty to file every
  receipt", and that restraint should survive into the copy.
- **Export-Import:** the field rides in `D`, so it round-trips with the `.sav`
  automatically; the e2e should prove that rather than assume it.
- **UI/UX Consistency:** a modal on first data entry is a new interruption
  point in this app. It should look and behave like the other `dialogs.js`
  modals.
- **Security & Sensitivity:** N/A — a boolean per schedule, no case content.

---

## Decisions 2–5 — all settled, 2026-09-17

**D2 — Storage: a new flat field on the ward.**
`D.scheduleDocsAck`, not a flag inside `scheduleDocs`. One place to look, and
it round-trips with the `.sav` because it rides in `D`.

**D3 — The acknowledgement resets each reporting period.** A new period is a
new set of receipts and bank statements, so the obligation genuinely recurs.

> **These two interact, and the interaction is the design.** A *flat* field
> that *resets per period* must itself carry a period dimension, so the shape
> is nested by period, not by schedule alone:
>
> ```js
> D.scheduleDocsAck = { [periodKey]: { a1: true, schB1: true } }
> ```
>
> `periodKey` must come from **`resolveActiveDocPeriod(data)`**
> (`src/core/pdf/supplemental-pdf.js:113`) — the same resolver `scheduleDocs`
> already uses (`activeYearKey`, else `periodFrom__periodTo`, else
> `'initial'`). Deriving it any other way lets an acknowledgement drift out of
> alignment with the uploads it refers to, which would be invisible until a
> filer was asked again for a period they had already confirmed, or not asked
> for one they hadn't.

**D4 — Populated-schedule detection is on mount, not on Add.** See *Trigger
point* above. One hook per family; catches Excel import and *New Filing from
Existing*.

**D5 — A non-yes does not block.** The filer keeps whatever they were doing and
the schedule stays unacknowledged, so the modal returns on the next visit. This
is deliberate: `confirmModal` resolves `false` on **Escape** as well as Cancel,
so a blocking design would let a stray keypress silently discard a deliberate
action with nothing on screen to explain it. The obligation still gets in front
of the filer — repeatedly, until acknowledged — which is what the modal is for.

The copy should suit that: an acknowledgement the filer is being asked to
confirm, not a warning that something has been refused.

**Consequence for C6's regression test.** With D5, *nothing about export or
navigation changes whether or not the filer ever says yes*. That makes the
"this changes nothing" assertion easy to write and cheap to keep — which is
exactly the property the first attempt lacked.

---

## The rest of Milestone 57, unscoped

These carry the review's verdict and have **not** been re-scoped here. Each
needs the same treatment 57C just had — a decision first, then a design that
fits the app's existing mechanisms:

| Item | Review verdict | Note |
| --- | --- | --- |
| 57A | Defective validation | **LANDED 2026-09-19 in `4ad465b`**, authorized by Alan by name and built to D6: an unanswered question rides the ordinary bypassable validator path, a `'Yes'` with its detail still blank is a hard block with its own registry key. Shared reader in `src/core/validation/dependent-question.js`; `computeNavChecks()` extended in the same commit so readiness and the export gate stay 1:1 |
| 57B | Incomplete / unsafe conversion | Certificate of Service recipient rules. **Design decision settled — see D7 below.** Still needs a design and approval by name before any work starts |
| 57D | Critical Excel regression, since fixed then reverted. **Scope settled — see D8 and the 57D scope below.** Not authorized | **The template research survives and is the valuable part**: the B-4 workbook has 18 register pages in 4 account blocks with verified row capacities — see `MILESTONE-57-REVIEW-HANDOFF.md` |
| 57E-1 | Poorly integrated | Trust-accounting capture. **Scoped 2026-09-19 — almost all of it is already on master and closer to the court form than 57E-1 proposed.** One gap survives, settled by D9. See the 57E-1 scope below |
| 57E-2 | **CLOSED 2026-09-19 — premise incorrect** | Not deferred, closed. The audit fee schedules are defined in the court's own workbooks (Annual `PART II, III` rows 13-17; Inventory `PART V` rows 7-9) and the app already implements both exactly — `annual-accounting/totals.js:45-49` and `legacy-app.js:6341`. There is no separate trust-asset fee to formulate; the tiers key on estate or inventory value, which is why its formula could never be found. Simplified Accounting has no fee schedule at all. The one real question it surfaced — whether Schedule C belongs in the Inventory's fee base — is answered **no** by the court's own workslips: `SUMMARY I` B39 ("VERIFIED INITIAL INVENTORY OF GUARDIAN") is `H32 + H38`, Schedules A and B only, while `SUMMARY II` presents Schedule C as "Other Financial Information" with no grand total and no roll-up. The app matches. See `MILESTONE-57-PROPOSAL.md` §57E for the full table |
| 57F | **CLOSED 2026-09-19.** (b) landed — the real cause was `saveWorkbookFile()` wiping every defined name, not the header-writing 57F proposed, which would have destroyed the template's own propagation. (a) closed unchased per Alan: never reproduced, never render-tested, reopen only on a direct sighting | The Guardian date round-trip fix survives the revert as defensive robustness |
| 57G | **CLOSED 2026-09-19 — no defect, verified** | Annual Plan terminology. Not closed on the review's word: re-audited against master. `filing-descriptor.js`'s `planAnnual` entry carries `displayName: 'Annual Guardianship Plan'`, `documentTitle: 'ANNUAL GUARDIANSHIP PLAN'` and `filenameStem: 'Annual-Guardianship-Plan'`, and every one of the nine audited surfaces derives from those three strings through `resolveDescriptorForInventoryType()`. The word "Accounting" does not appear anywhere in `src/features/plan-annual/`, and nowhere in `src/` is the string "Annual Accounting" bound to `planAnnual`. Surface 6 (Excel worksheet titles) does not exist for this filing type at all — `capabilities.excel` is `false`. Reopen only against a specific sighting |
| Trust-question consistency | **CLOSED 2026-09-19 — unspecified** | Named once, in one line of `MILESTONE-57-REVIEW-HANDOFF.md`'s "Not started" paragraph, and specified nowhere in any of the three 57 documents. Nobody can act on it as written. Reopen if whoever raised it can say which question, in which filing type, was inconsistent with what |
| 57H | Privacy / product-design regression | Reverted. Its replacement — the `pg-last-position` marker — is live and documented in the user guide |

---

## Decisions 6–7 — settled 2026-09-19, ahead of any authorization

These two were asked and answered before either item was scoped, so that
whoever builds them is not also deciding them. **Neither item is authorized.**
Alan's standing instruction on 2026-09-19 was to close what was closeable and
start no new 57 work.

**D6 — 57A: an unanswered bond / restricted-depository question warns, it does
not block.** A filer who has answered neither question can still export, but
only through an acknowledgement they have to clear, and the acknowledgement is
recorded.

Rejected: a hard blocker (correct for the court record, but it forces every
filer to answer two questions that are frequently not applicable, on every
filing); and allowing silence entirely (which lets a filing reach the clerk
saying nothing about bond at all). The middle option exists here only because
the app already has the mechanism for it — `output-authorization.js`'s
`authorizeFilingOutput()` returns `acknowledgement-required`, and
`markFilingRevisionChanged()` re-arms it when the filing changes. **Whoever
builds this should use that path, not invent a second one.** A half-finished
affirmative — `'Yes'` with the depository name missing — stays a hard blocker
either way; that is an incomplete entry, not an unanswered question.

**D7 — 57B: a service attestation does NOT survive a filing conversion.**
Converting an Initial Inventory to an Annual or Simplified Accounting resets
`certNoRecipients` / `serviceNoRecipients` to unanswered (`''`) and raises a
review notice on the new filing. Recipient address cards still migrate, so
nothing is retyped.

The reasoning is legal rather than technical: "no recipients are required for
this certificate" is the filer's own assertion about one accounting period,
and a new period is a new set of facts. Carrying it forward would have the app
asserting a legal conclusion on the filer's behalf, which is exactly the line
the 57B attestation wording was written to stay on the right side of. A
review flag was rejected as the weaker form of the same thing — easy to click
past, and the app has still pre-filled the answer.

---

## Decisions 8–9 — settled 2026-09-19

**D8 — 57D supports UNLIMITED accounts. The four-block limit binds the Excel
artifact only.** Amended the same day it was taken, after Alan pushed back:
*"in real world use, they will need more than four account support."* He is
right, and the first version of this decision let a template constraint bind
the whole feature.

The four is the court's, not ours — the workbook has exactly four
account-header blocks (Line # restarts at 1 on p2, p8, p12, p16, each with its
own `BANK:` / `ACCOUNT NUMBER #:`). We cannot invent a fifth without modifying
the Clerk's form or writing one account's disbursements under another's
header, and `AGENTS.md` §5 forbids both.

**But only the Excel writer is bounded.** The data model, the assignment UI
and the PDF have no such limit, and **the PDF register is already uncapped
today** — `pdf-model.js`'s `d.schB4.map(...)` renders every row and paginates
naturally, because the PDF is app-generated rather than template-bound. It
simply has no account column yet, which is ours to add.

The original 57D proposal said this and the first version of D8 failed to
carry it forward: *"If the official template does not accommodate multiple
accounts on a single page, multi-account attribution remains an internal entry
convenience in the app/model. The app must never mislabel transactions by
placing an arbitrary 'primary account' in the court header."*

**At five or more accounts the Excel download is withheld, named, and the PDF
carries everything.** Not a partial workbook — a Schedule B-4 that silently
omits real disbursements does not reconcile against its own summary or against
Part II, and the clerk reading it has no way to know. The filer sees which
accounts will not fit; the PDF exports complete. This is the pattern
`excel-capacity.js` already uses for over-capacity schedules, so it is a
surface the app and its users already understand.

**SETTLED 2026-09-19 by Alan — no question remains.** This paragraph asked
what the Clerk expects for a ward with five or more accounts. It was written
before the workbook was extended from the court's four account blocks to
twelve, which is what the same day's work actually shipped; read against that,
the threshold it worries about is the *thirteenth* account, not the fifth.

Alan's answer: *"12 accounts is extreme edge case. I've never seen one."*
Twelve blocks is past the point of practical concern, the withhold-and-name
behaviour beyond it is already built and tested, and the Clerk does not need to
be asked about a case that does not occur. Closed, not deferred.

**D10 — SETTLED 2026-09-19, authorized by Alan: extend C-5 to the form's real
third page. Initial Inventory blank-page pruning landed alongside it.**

> **LANDED.** `SCHEDULE_C5_PAGES` now reaches `C-5 JOINT OWNERS pg 3` and
> `GUARDIAN_EXCEL_CAPS.scheduleC5` is **23**, matching the form's own
> pre-printed Line # 1-23 (7 slots on page 1, 8 each on pages 2 and 3). The
> page is structurally identical to page 2 and the schedule total on page 1
> already summed it, so nothing else had to change. `GUARDIAN_NEVER_WRITTEN_SHEETS`
> is now empty — C-5 page 3 was its only entry — and a new drift-guard case
> asserts that **no** schedule page in the workbook is unreachable, so the
> situation cannot recur silently.
>
> Verified by the existing full-capacity round trip
> (`guardian-inventory-excel-schedule-layout.spec.ts`), which now writes and
> reads back 23 joint-owner rows including the last row of page 3.

The finding, for the record:

Landed 2026-09-19, same standard as Annual Accounting: the Initial Inventory
export now drops the continuation pages a filing never reaches. The court's
workbook ships 21 of them across eleven schedules, so an inventory listing a
house, two bank accounts and a car went to the clerk carrying 21 pages of
empty pre-printed grid. It now ships 19 sheets instead of 40. Each schedule's
page-1 total is rebuilt in the same operation, because every continuation page
is named by one — removing a page and leaving the formula alone would put
`#REF!` in a filed court inventory. Re-import is unaffected and proven:
`parseInitialInventoryWorkbook()` skips a page that is not in the file.

Simplified Annual Accounting needed nothing. Its workbook is four filing pages,
a cover, and two hidden sheets; there are no continuation pages and all four
filing pages are written on every export. `tests/unit/simplified-no-blank-pages.spec.js`
pins that so a future template change cannot quietly reintroduce the problem.

**The question, now answered.** The workbook's Schedule C-5 (jointly owned assets) runs
to three pages. The exporter's page map stops at two, and always has, so
`GUARDIAN_EXCEL_CAPS.scheduleC5` is **15** where the form actually holds **23**.
Consequence today: a filer with 16 jointly owned assets is refused an Excel
export the court's own form could have carried, and is told the form is full
when it is not. The blank third page is now pruned either way, so nothing is
mis-stated in a filing — this is a capacity limit, not a correctness defect.

Alan authorized the extension on 2026-09-19; see the LANDED note above.

Two related items for the same decision, both verified rather than assumed:

- `Acerno_Cache_XXXXX`, flagged earlier as a stray sheet in the Annual and
  Guardian workbooks, is `veryHidden` in all three templates. It has no cells,
  never appears as a tab and never prints. **No action needed** — retiring that
  flag.
- **Simplified's Part I identity block is written one row low. Confirmed
  against a real exported file, 2026-09-19.** See **D11** below. An earlier
  note here blamed the template's `COVER!D7`; that was wrong, produced by a
  regex that mis-attributed a formula to the wrong cell (now forbidden by
  `AGENTS.md` §10). The template is correct; the app's writer is not.

**D11 — FIXED 2026-09-19, authorized by Alan by name. Simplified Annual
Accounting wrote its entire Part I identity block one row too low, so every
field printed under the wrong label on a filed court form.**

> **LANDED.** Writer and importer both moved to the cells the court's labels
> point at: period dates to `E13`/`H13`, attorney/guardian/type to
> `D15`/`D16`/`D17`. The duplicate case-number write to `D15` is gone — the
> case number already reaches Part I through the workbook's own `D14 = =H4`,
> which the app now leaves alone. The ward's SSN is no longer written at all:
> the court's Simplified workbook has no ward-SSN field (its only SSN cells
> are the guardians' SSN/EIN on PARTS III, IV), so a required and sensitive
> value was both destroying the printed `From` label and appearing **unmasked**
> on a form that never asked for it, while the PDF prints it through
> `maskSSN()`.
>
> One deliberate behaviour change: `D.ssn` no longer round-trips through Excel.
> An import leaves whatever the filing already holds rather than blanking a
> required field the workbook has nothing to say about. The `.sav` file remains
> the full-fidelity round trip.
>
> Coverage: `tests/e2e/simplified-part1-identity-cells.spec.ts`, which asserts
> against the **exported file**, never the re-import — agreeing with a broken
> exporter is exactly how this survived. Fault-injected: restoring the original
> writer fails all six cases. `tests/e2e/excel-import-cell-shapes.spec.ts`
> moved its fixtures to the corrected addresses.

The defect as found:

Found 2026-09-19 while confirming an unrelated claim. **Pre-existing** —
`src/features/simplified-accounting/excel.js` has not changed since Milestone
53B. Confirmed against a real exported `.xlsx`, not inferred from the template.

The court's form puts each label in column B and its value in the merged
`D<row>:I<row>` beside it. `doSaveExcel()` writes each value to the row *below*
its label:

| Form label | Should receive | Actually receives |
| --- | --- | --- |
| r13 `For the Period` (From/To) | period dates | nothing — and `D13`'s own `From` label is **overwritten with the ward's SSN** |
| r14 `Case Number` | case number | the period **end date** |
| r15 `Attorney for Guardian` | attorney | the **case number** |
| r16 `Guardian` | guardian | the **attorney's name** |
| r17 `Type of Guardianship` | type | the **guardian's name** |
| r18 `Part II` (a section heading) | nothing | the **type of guardianship** |

Two further consequences:

- The template ships `D14 = =H4`, which is how the case number reaches the
  form and, through `COVER!D7`, the cover page. `setCell(p1,'E14',…)` and
  `setCell(p1,'H14',…)` both land inside the `D14:I14` merge, and ExcelJS
  redirects a write on a merged member to the merge master — so those two
  writes **destroy that formula** and leave the period end date in its place.
  This is an instance of the "never write into a formula cell" rule in
  `AGENTS.md` §5, reached accidentally through a merge.
- The cover page's Case Number therefore prints the period end date.

**Why no test caught it.** `importExcel()` reads the same shifted cells
(`D13` ssn, `D16` attorney, `D17` guardian, `D18` type), so the app round-trips
its own output perfectly. It is self-consistent and wrong against the court's
form — precisely the failure mode `AGENTS.md` §5 exists for. It also means the
period dates do not survive a round trip at all: both are read back from inside
the same merge, so `periodFrom` and `periodTo` return the same value.

**Filers who already submitted a Simplified workbook — MOOT, confirmed
2026-09-19.** Alan: this is a test/development system and **no filings have
ever been submitted from it.** There is no affected workbook in the Clerk's
hands and nothing to re-file. The paragraph this replaces worried that the app
could not detect an affected file after the fact, which remains true and no
longer matters. The severity of the defect is unchanged — it is about what the
app *would* have filed.

**D12 — FIXED 2026-09-19. A print area displaced by 57D's own twelve-account
extension, found while fixing 57F(b). Self-inflicted, and it was shipping.**

A print area is stored as a defined name keyed by `localSheetId` — a
**positional index** into the sheet list, not a name. Commit `6c434af`
inserted 32 register sheets ahead of `PART XI`, whose print area kept saying
`localSheetId="57"`. Index 57 had become `SCH B-4 OTHER DISB p48`.

Not dormant, and not hidden by the defined-name strip: ExcelJS reads print
areas into `worksheet.pageSetup`, which the exporter never touched. So every
Annual workbook exported since that commit gave a B-4 register page a print
area of `A1:G32` — clipping columns H and I and the last rows of its own
register — and left `PART XI` with none.

Fixed by `scripts/fix-annual-print-area.py`, which repoints it at index 89 and
fails loudly if its patch does not match exactly once. `--check` verifies every
print area against sheet order.

Guarded by `tests/unit/template-print-areas.spec.js` across all three
templates. It has to be a **template** guard: ExcelJS regenerates each print
area from `pageSetup` on write, so an export-level self-consistency check
passes even on the broken template — it is consistently wrong. That was
confirmed by fault injection, not assumed.

**The general lesson, worth applying to any future template surgery.**
`scripts/extend-annual-b4-blocks.py` verified sheet content, ids, page labels
and every category total, and still missed this, because `localSheetId` is the
one thing in the file that is positional. Anything keyed by sheet index —
print areas, custom views, `_xlnm.*` names — needs re-basing whenever sheets
are inserted.

**D13 — FIXED 2026-09-19, authorized by Alan. The caption/box defect was not
one bug. It was a class, in all three filing types, and the worst instance
filed wrong money.**

Found while verifying 57A's premises. D11 fixed one instance; a mechanical
audit of every `setCell()` target against the templates found 48 suspect
sites, of which 26 were real.

**The worst: Simplified's Part II accounting summary.** Every figure was
written one row below its Line, so each landed on the next Line's row, and the
two that fell on the total rows overwrote the `Total Income` and
`Total Disbursements` captions *and* fell outside the workbook's own
`SUM(G22:G23)` / `SUM(G27:G28)` ranges. A filing reporting 100,000 opening,
2,200 in settlement deposits and 4,400 in federal income tax was filed as:

| Line | Should be | Was filed |
| --- | --: | --: |
| 1 Starting Balance | 100,000 | *blank* |
| 2 Interest Income | 11 | *blank* |
| 3 Deposits per Settlement | 2,200 | 11 |
| 4 Total Income | 2,211 | 11 |
| 5 Service Charges | 33 | *blank* |
| 6 Federal Income Tax | 4,400 | 33 |
| 7 Total Disbursements | 4,433 | 33 |
| 8 Remaining Assets On Hand | 97,778 | **−22** |

The starting balance did not merely go missing: `H20` sits inside the merged
`B20:I20`, so ExcelJS redirected it onto the printed `Income` banner.

**Initial Inventory.** PART IV's preparer and attorney block writes its values
onto the caption row instead of the box beneath it — twelve labels destroyed,
twelve boxes empty. PART V wrote the bond amount over `Bond Amount` and the
dates over `From:` and `To:`, on the page the court uses to check the surety
bond. PART VI had the bar number and the street address on each other's cells.
Two further consequences: the attorney's **signature date never survived a
round trip** (written to a caption, read back as the word "Date"), and the
form's two distinct dates — `C21` on the notification line, `G26` beside the
signature — were collapsed onto one.

**Annual.** `relatedCaseNumbers` was written to `I12`, inside the merged
`H12:J12`, replacing the prompt *"List case number(s) here:"*. Six redundant
literals over `=From_Date`/`=To_Date` were removed: same value, but they
replaced live propagation with a snapshot.

**Why the suites never caught any of it.** Every importer read the same wrong
cell as its exporter. The round trips confirmed the app agreed with itself.
This is the concrete case behind `AGENTS.md` §10's rule that a formula or a
placement is verified by reading the **exported file**, never by re-importing.

Guarded two ways: `tests/unit/excel-write-targets.spec.js` classifies every
write target against the template (label / formula / covered-by-merge, with a
dropdown validation distinguishing a default from a caption) and carries an
explicit, reasoned exceptions list; `tests/e2e/excel-form-field-placement.spec.ts`
proves the result in the exported file. Both fault-injected.

**Three writes kept deliberately, and they are open questions, not oversights.**
Each overwrites something the court's form supplies, and removing it would
discard a field the filer can edit:

- `PART IX` `E21`/`G21` — the form derives the **bond period** from the
  accounting period (`=From_Date`/`=To_Date`), but the app lets a filer enter a
  bond period of its own. **Does Pinellas accept a bond period different from
  the accounting period?** If not, the app's fields should go.
- `PART II, III` `F25` — the form links Guardian #1's name to PART I by
  formula; the app keeps `guardians[0].name` separately. **Should they be one
  field?**

**Filings already submitted — MOOT, confirmed 2026-09-19.** None exist; this
is a test/development system. See the matching note under D11.

**D9 — 57E-1's one surviving gap is an acknowledgement, matching D6.**
`hasTrust: 'Yes'` with blank trust fields shows in the sidebar and offers a
clearable acknowledgement at output rather than hard-blocking. Chosen for
consistency with 57A rather than on its own merits — two adjacent
"affirmative but empty" states should not behave differently. Uses
`output-authorization.js`, not a second mechanism.

---

## Decisions 14–15 — settled 2026-09-19

**D14 — the three form-derived cells: conform to the form, allow the overwrite,
warn on it. FIXED the same day, authorized by Alan by name.**

The annual template computes three cells for itself — `'PART IX '!E21`/`G21`
(the bond period, `=From_Date` / `=To_Date`) and `'PART II, III'!F25`
(Guardian #1, linked to PART I's Guardian) — and the app writes its own field
over each. Both halves of that were defensible and neither was decided, so they
sat in `excel-write-targets.spec.js`'s `ALLOWED` map as an open question.

Alan's answer: keep the write, report the divergence. Dropping the write would
silently discard something the filer typed; keeping it silently let a filing
reach the clerk with a bond period that disagreed with its own accounting
period, or two different names for the same guardian, while the on-screen form
— which still showed the derived value — agreed with neither.

> **LANDED.** `src/core/filing/form-derived-fields.js` raises an advisory per
> divergent cell, joined into `prepareFilingOutput()`'s existing `advisories`
> alongside `countyDriftWarnings()`, so it surfaces through the
> `renderOutputAdvisories()` panel every print page already renders. Advisory,
> never blocking: a bond written for a term other than the accounting year is
> ordinary and the app has no standing to overrule it. Silent when the app's
> field is blank — an unset field is not an overwrite, and warning there would
> push the filer to fill in what the form would have derived. Annual family
> only; the Initial Inventory's bond cells are genuine input boxes in its own
> template. Formatting differences (whitespace, letter case, `Date` vs ISO
> string) are not divergences, because a panel that cries wolf gets ignored.
> 15 cases in `tests/unit/form-derived-fields.spec.js`; the three `ALLOWED`
> entries now record the decision instead of the open question.

**D15 — the export status line is owned centrally. FIXED 2026-09-19, authorized
by Alan by name, across all filing types.**

Found while diagnosing a pre-existing e2e failure, not part of any 57 item.

What the filer saw: export a workbook, see "✓ Exported!", and watch it vanish a
moment later with no sign the file was ever written. Each export and import
ended with its own `setTimeout(() => el.textContent = '', 3000)` and nothing
cancelled it, so the first action's timer was still armed when a second one
finished within three seconds and wiped its message. A retry after a failed
export is exactly that pattern, which is how
`tests/e2e/vendor-loader-retry.spec.ts` caught it — and that test fails on
`master` for this reason, not for the reason its own name suggests.
`guardian-inventory/print.js` made it worse by clearing the shared
`#export-status` outright in its own `finally`, so saving a PDF wiped the Excel
export's confirmation immediately.

> **LANDED.** `src/core/ui/transient-status.js` owns the element: any pending
> clear is cancelled the moment anything else writes to it, so the only timer
> that can fire is the one belonging to the message on screen. All four call
> sites across the three filing families route through it, plus
> `print.js`'s immediate clear. 6 cases in
> `tests/unit/transient-status.spec.js`.
>
> **Noted, not fixed:** Annual and Simplified *exports* write no status at all
> — no progress, and no confirmation on success; they surface a modal only on
> failure. Only the Initial Inventory's export reports progress. That is a gap
> in feedback rather than a defect, and it was not in scope here.

---

## 57D — Schedule B-4 Multi-Account Export (scope, 2026-09-19)

> **LANDED 2026-09-19.** `ab14300` (B-4 register pruning), `26ea82d` (pruning
> across every schedule), `6c434af` (the workbook extended to twelve accounts
> and the layout planned), `f7477ef` (multi-account filing end to end), and
> this commit (scope item 8, the PDF's account attribution).
>
> Shipped beyond the scope below in one respect the Clerk authorized on
> 2026-09-19: the workbook was extended from the court's four account blocks
> to **twelve**, following the form's own pattern, because four is not enough
> for real guardianships. Capacity is now 1382 rows. A thirteenth account still
> withholds the workbook and names the accounts that will not fit.
>
> **Scope item 8 — PDF account attribution — landed last and is what made the
> rest safe to rely on.** The PDF register is now grouped: one register per
> account in filer (= workbook block) order, headed by that account's bank name
> and number, subtotalled, followed by a recap reconciling the subtotals to the
> schedule total. Disbursements not assigned to an account, and rows naming a
> deleted account, print under a heading saying so rather than being dropped or
> folded into a real account — the workbook refuses to write them, the PDF must
> still carry them. A filing with no accounts keeps the single unlabelled
> register unchanged. The `#` column stays the row's position in Schedule B-4
> as a whole rather than restarting per block, so it still matches the editor's
> "Line N" card.
>
> The naming rules moved to `src/core/accounting/bank-accounts.js` and are
> shared by the workbook header, the PDF heading, the row picker and the
> removal confirmation. There were three different rules before, one of which
> showed only the bank name in the picker — two accounts at the same bank were
> indistinguishable at the one moment the filer chooses which one the money
> left.
>
> Coverage: `tests/unit/annual-pdf-schb4-attribution.spec.js` (18),
> `tests/unit/b4-export-plan.spec.js` (23), `tests/unit/b4-block-map.spec.js`,
> `tests/e2e/excel-b4-multi-account.spec.ts`,
> `tests/e2e/schb4-bank-accounts-ui.spec.ts`.
>
> **One gap remains open and is not part of 57D**: the PDF now attributes
> disbursements, but see **D10** below for the Initial Inventory capacity
> question the same work turned up.

**Not authorized.** Implements **D8**. Full template research and the verified
block map are in `MILESTONE-57-REVIEW-HANDOFF.md` §3/§3b — read those first;
every capacity below was re-derived from the workbook on 2026-09-19.

### State on master

`excel.js` writes B-4 to `SCH B-4 OTHER DISB p2` only, rows 20-44, capped at
25 entries (`if(i<25)`), columns C/D/E/G/I; `importExcel()` reads the same
range; `ANNUAL_EXCEL_CAPS.schB4.cap` is 25. The app reaches **25 of the
template's 494 rows**. Two bank accounts cannot be represented at all. The
comment at the write site says "write to pages p2-p3 only" and is stale — it
only ever writes p2.

### Scope

1. `schB4Accounts[]` on the ward: bank name, account number, and an **opaque
   immutable id** from `crypto.randomUUID()` with the same fallback
   `createSupplementalFileId()` uses. Never derive the id from index, name or
   account number — renaming an account must not orphan its disbursements.
2. Per-disbursement `bankAccountId`, assigned by dropdown.
3. Deleting an account **unassigns** its disbursements (`bankAccountId: ''`)
   and never deletes a financial entry.
4. Legacy `bankAcct` strings migrate to a matching account on exact match;
   otherwise the row stays explicitly unassigned for the filer to resolve.
5. Export: group by account in `schB4Accounts[]` order, one account per block,
   writing each group across its block's pages and the account header once on
   the block's first page. Import: the inverse, one account per block, created
   only where that block's header has content.
6. **`schB4Accounts[]` is not capped at 4.** The model, the assignment UI and
   the PDF take any number; only the Excel writer is bounded by the template.
7. Excel capacity, per **D8**: the download is withheld — never partial — when
   there are more than 4 accounts, or when one account's rows exceed **its own
   block's** capacity. The message names the accounts that will not fit. A
   filing that fits must never be withheld.
8. **The PDF is the overflow path, so it has to carry account attribution.**
   Its register is already uncapped (`d.schB4.map(...)`, paginating naturally);
   it gains an account column or per-account grouping so that a filing the
   Excel cannot represent is still complete somewhere. This is load bearing,
   not a nicety — without it, a ward with five accounts has no complete output
   at all.
9. No-accounts filings fall back to a single unlabelled group on block 1,
   which is today's behaviour with 160 rows instead of 25.

### The block map (verified)

| Block | Pages (row ranges) | Capacity |
| --: | --- | --: |
| 1 | p2 (20-44), p3-p7 (8-34 each) | 160 |
| 2 | p8 (8-37), p9-p11 (8-34 each) | 111 |
| 3 | p12 (8-37), p13-p15 (8-34 each) | 111 |
| 4 | p16 (8-38), p17-p19 (8-34 each) | 112 |

Blocks start where the pre-printed Line # restarts at 1 — p2, p8, p12, p16.
p2 is the outlier at 25 rows because its column header sits at row 15 rather
than row 7, an instructions block pushing it down.

Account header cells: the label `ACCOUNT NUMBER #:` is the merged `B6:C6` and
its **value cell is the merged `D6:F6`**; the label `BANK:` is at `J5`. The
research's "C6/H6" is wrong — `H6` is `INSTRUCTIONS` on p2 and `Line #`
elsewhere. **The bank-name value cell right of `J5` is still unconfirmed and
must be pinned before anything writes to it.**

### The trap that made this a critical regression last time

`SCH B-4 OTHER DISB SUMMARY p1` is **formula-driven**: its 18 category rows
sum the `AK` column across every register page and B28 totals them. The app
writes the registers and **must not write the summary** — it recalculates
itself. See `AGENTS.md` §5.

### Cross-cutting ramifications (`AGENTS.md` §8)

Data model (new collection plus a per-row field); `.sav` round trip and the
legacy `bankAcct` migration; Excel export **and** import; `ANNUAL_EXCEL_CAPS`;
the capacity-issue surface shared with other schedules — note that surface now
has to express "this filing cannot be written to the workbook at all" and not
just "this schedule is over its row cap"; the PDF, which gains account
attribution per scope item 8; `TEST-INDEX.md`. Applies to all three filing
types sharing `engineId: 'annual'`, not just Annual Accounting.

**Verification must include the asymmetry**: a five-account filing produces a
complete PDF and no Excel, with both halves asserted. A four-account filing
that fits produces both. Neither should be reachable by accident.

---

## 57E-1 - Trust Capture (EXECUTION-READY 2026-09-19)

**Not authorized.** Implements **D9**. Re-derived against `master` on
2026-09-19; the state below is what the code does today, not what the original
57E-1 proposed.

### What a filer can do today that they should not

Answer **"#1. Does the Ward have one or more Trusts?"** with **Yes**, fill in
nothing else, and export. The filed Annual Accounting then tells the Clerk the
ward has trusts and names none - no trustee, no account number, no value. Part
VIII shows three blank trust cards and the export is clean.

### State on master (verified 2026-09-19)

Almost all of the original 57E-1 is already built, and closer to the court form
than 57E-1 proposed: `PART VIII` captures three trusts (`hasTrust`,
`createdAfterGID`, `name`, `trustee`, `accountNo`, `dateCreated`, `trustType`,
`wardPct`, `wardAmount` - `src/core/state.js:453`), the Excel writer and reader
work at verified merge anchors, and the UI asks the court's own question.
57E-1's proposed tri-state duplicates `hasTrust`, its single `trustAssetsValue`
duplicates the per-trust `wardAmount`, and its manual fee advisory would
describe a trust-asset fee that does not exist (57E-2, closed).

The gap is one branch in `validateAnnual()`
(`src/features/annual-accounting/index.js:1645-1650`). The question itself is
required - that part is right - but the branch then filters trust rows to those
with some non-`hasTrust` content and requires `createdAfterGID` on each. **When
every trust row is blank the filter yields nothing and the loop body never
runs**, so an affirmative with no trusts produces no issue at all.

**This is already a live readiness/export parity break, not one 57E-1 would
introduce.** The sidebar rule `a-p8` (`src/legacy-app.js:6711`) is
`verifiedEmpty('a-p8')||verifiedEmpty('p8')||(D.trusts||[]).some(t=>t.name)` -
it requires a trust *name*. So today the sidebar marks Part VIII incomplete
while the export validator finds nothing wrong: the exact disagreement
`tests/unit/checklist-export-parity.spec.js` exists to prevent. Check its
`KNOWN_GAPS` before starting - an `annual` entry covering this is what this
work should delete.

### Scope - one validator branch, nothing else

Add the missing issue in the `hasTrust === 'Yes'` branch: when **no** trust row
carries any content, require Trust 1's name. Nothing in Part VIII's UI, Excel
writer, reader, PDF or data model changes. No new field, so no
`probate-guardian-data-model.csv` row (§4) and no `.sav` migration (§8 #2).

**It must stay bypassable.** Per D9 this offers a clearable acknowledgement at
output rather than hard-blocking, matching 57A's unanswered half. That is the
default and needs no registry work: routed through the ordinary
`createRequiredIssue` path the code becomes `annual.trusts.0.name.required`,
falls through to `validation.legacy-unmapped`, which is `bypassable: true`, and
`authorizeFilingOutput()` returns `acknowledgement-required`. **Do not add a
literal `issue-registry.js` key** - that is what would make it a hard block,
which is what 57A's *other* half needed and this one must not have.

### Steps

1. In `validateAnnual()`, inside the existing `hasTrust === 'Yes'` branch,
   detect the all-blank case (the same `Object.entries` predicate the filter
   already uses, applied across every row rather than per row) and `req()`
   Trust 1's name. Keep the existing message shape - `Part VIII - Trust 1 -
   Name` - so `errorRoute()` buckets it onto the page's own key.
2. Confirm `a-p8` and the validator now agree in both directions. `a-p8`
   already requires a name, so this closes the gap rather than widening it;
   re-run the parity guard and delete any `KNOWN_GAPS` entry it makes stale.
3. Fixture audit (§8 #3): `MINIMAL_VALID_ANNUAL` in
   `tests/e2e/support/fixtures.ts` sets `trusts: [{hasTrust: 'No', ...}]`, so
   it is unaffected - but any fixture answering `'Yes'` with blank rows will
   now be caught by `expectFileableFixture()`, which is the intended effect.

### Verification

Red-first (§2), red for the stated reason: with the change stashed, a filing
with `hasTrust: 'Yes'` and three blank trust rows must produce **zero** issues
from `validateAnnual()` - that absence is the bug. Then green. Unit coverage
for: all-blank `'Yes'` raises it; one populated row does not; `'No'` does not;
`''` still raises the existing unanswered issue; and the issue is
`bypassable !== false`, since a hard block here would contradict D9.
`TEST-INDEX.md` row in the same commit (§7).

### Cross-cutting ramifications (`AGENTS.md` §8)

Data model: none. Legacy `.sav`: none. Export/import: none - validation only.
Readiness/export parity: **directly implicated, and improved**. Security: none.
UI: none. Legal framing: the app records that the filer said trusts exist and
did not describe them; it does not decide whether that is permissible.

---

## 57F — Export Fidelity (scope, 2026-09-19)

Two unrelated pieces. **(a) is CLOSED and (b) landed**, both 2026-09-19 — and
note for (b) that the cause was neither what 57F claimed nor what this section
first guessed.

**(a) PDF period-end clipping — CLOSED 2026-09-19 by Alan. Do not chase it.**

The claim was that the four-digit year in an Annual Accounting's period-end
date renders clipped. It was "fixed" in the reverted attempt by reading the
source only; it has never been reproduced, never render-tested, and no one has
reported seeing it. This section previously asked for a session to go and
measure it.

**Alan's instruction: ignore this unless it is directly observed during
testing.** A defect nobody can produce is not worth a session of hunting, and
carrying it as an open item invites each new agent to re-derive the same
nothing. It is closed on that basis — not because it was disproved.

So: no investigation, no speculative fix, no re-opening this row because it
looks unresolved. If a period-end year is ever actually seen clipped in a
rendered PDF, reopen it then, with the sighting attached. Whoever does should
measure the rendered canvas and not the pdf.js text layer — see
`tests/e2e/signature-block-address-margin.spec.ts`'s header for why that
distinction matters.

**(b) Excel header propagation — do NOT build as written.** 57F asks to extend
ward-name/case-number writing from `PART I` to every schedule sheet. **54 of
the annual template's 58 sheets already pull both by formula** from the
defined names `Name_of_Ward` (`'PART I'!$C$5`) and `Case_Number`
(`'PART I'!$I$5`), which are exactly the two cells the app writes. Writing
literals into those 54 sheets would overwrite the formulas and destroy the
propagation the item was meant to create.

**(b) RESOLVED 2026-09-19 — the real cause found and fixed.** The symptom was
real and the diagnosis above was still not right. `saveWorkbookFile()` wiped
**every defined name** before writing, with no recorded reason, and those
formulas name their source rather than referencing it: `'SCH A INCOME p1'!D2`
is literally `=Name_of_Ward`. Measured against the shipped template,
`Name_of_Ward` is named by **88** formulas, `Case_Number` by **86** and
`Filing_Type` by **86** — roughly 270 cells that resolved to `#NAME?` in every
filed Annual workbook. The Guardian template's county and Yes/No dropdowns
list their options by name too, so both lost their lists.

The original motive was probably the template's `.wvu.` custom-view names,
three of which point at `#REF!`. ExcelJS discards those on load, so they never
reached the model being wiped; writing with the remaining names produces a
file ExcelJS reads back cleanly. Only the custom-view leftovers are dropped
now.

Print areas were never part of this — ExcelJS keeps them on
`worksheet.pageSetup`, not in the defined-names model — but chasing it turned
up a separate live defect, recorded as **D12** below.

The original 57F(b) remains the wrong fix for the right symptom: writing
literals into those 54 sheets would have overwritten the very formulas that
carry the header, and the propagation would have appeared to work while
being frozen at export time.

---

## 57A — Bond Waived / Restricted Depository (design, 2026-09-19)

> **LANDED 2026-09-19**, authorized by Alan. Built as designed below, with the
> design's own open question answered first.
>
> **The question the design asked, answered against the templates.** *"The
> tri-state needs its own verified cells or a documented decision not to write
> it."* Read with an XML parser: **neither court form carries the question.**
> Initial Inventory PART V asks only *"If the surety bond has been waived, note
> the date of the order"*; Annual PART IX asks only *"Date of most recent
> Receipt of Cash Assets"*. So this is the documented decision **not to write
> either answer** — inventing a cell would put text on a court form the Clerk
> did not design (§5, §3). What reaches the workbook is what always did: the
> date. `excel-write-targets.spec.js` enforces the absence by having no write
> target for either field.
>
> **The premise check held.** Both CSV rows described fields that existed
> nowhere in `src/`. They exist now, at the exact sources the CSV names, so
> documentation and code agree without editing the CSV.
>
> Shipped: `src/core/validation/dependent-question.js` (the shared reader and
> the D6 state machine), two registry codes
> (`filing.bond-waiver.incomplete`, `filing.restricted-depository.incomplete`,
> both `bypassable: false`), `bondWaived` on `emptyDataGuardian()`,
> `restrictedDepository` on `emptyDataAnnual()`, a tri-state on each form
> revealing its date only on Yes, and the legacy inference applied **where the
> value is read** rather than migrated on load — so a stored `.sav` needs no
> migration and an absent date never becomes "No".
>
> **Readiness stayed 1:1**, which is what the reverted attempt broke.
> `computeNavChecks()`'s `a-p9` now counts the question, and
> `checklist-export-parity.spec.js` caught the drift the moment it appeared —
> it failed on the first run and was fixed before anything else. Guardian needs
> no equivalent edit: its branch derives from `validateGuardian()`'s own
> errors, so it is 1:1 by construction.
>
> Coverage: `tests/unit/dependent-question.spec.js` (17),
> `tests/e2e/dependent-question-gate.spec.ts` (11), including that toggling
> Yes→No→Yes keeps the date and that the sidebar's own rendered mark agrees
> with the export gate.

**Design as written, for the record.** Implements **D6**.

### The thing to check before writing a line of code

**The revert left the data dictionary ahead of the code.** Both tri-states are
documented in `probate-guardian-data-model.csv` but **exist nowhere in
`src/`**:

| CSV row | Field | Documented source | Actually in code? |
| --: | --- | --- | --- |
| 133 | `annual_accounting.restrictedDepository` | `src/core/state.js` `emptyDataAnnual()` | **No** — only `restrictedDepositoryReceiptDate` (state.js:451) |
| 861 | `guardian_inventory.bondWaived` | `src/legacy-app.js` `emptyDataGuardian()` | **No** — only `bondWaivedDate` (legacy-app.js:5624) |

Row 861's own note reads *"Milestone 57A tri-state"*, so these rows were added
by the reverted attempt and survived it. `npm run verify:data-model` passes
regardless — it validates the CSV's structure, not whether a documented field
exists in code. So the rescope table's claim that these fields "already exist
pre-57" is **wrong**: the documentation exists, the fields do not.

Two consequences. First, 57A creates these fields rather than fixing their
validation. Second, master currently ships a data dictionary that describes
two fields it does not have — **that is a defect today, independent of 57A**,
and should either be fixed by deleting the two rows or accepted knowingly as a
forward reference.

### Scope

1. Add `bondWaived` and `restrictedDepository` as real tri-states (`''`
   unanswered, `'Yes'`, `'No'`) to **both** filing types that print them, not
   one each as the CSV currently implies.
2. Reveal dependent detail inputs only on `'Yes'`, and **never delete** data on
   toggle away — the established non-destructive pattern.
3. Gate output per **D6**: unanswered produces an acknowledgement, a
   half-finished `'Yes'` stays a hard blocker.
4. Infer `'Yes'` from a legacy non-empty `bondWaivedDate` on load; an absent
   date stays unanswered, never `'No'`.
5. Correct the CSV so documentation and code agree.

57A will **not**: change bond amount, bonding company, or period fields;
introduce a depository-name field in Annual unless the court form has one
(verify against the template first — the CSV does not document one); or alter
any other acknowledgement's wording or arming behaviour.

### Implementation design

**Do not build a second acknowledgement mechanism.** `output-authorization.js`
already has this shape: `authorizeFilingOutput()` returns `allowed` /
`acknowledgement-required` / `blocked`, `markFilingRevisionChanged()` re-arms
it when the filing changes, and `issue-registry.js` entries carry
`bypassable`. 57A adds registry entries only:

- unanswered `bondWaived` / `restrictedDepository` → `bypassable: true`
- `'Yes'` with a missing dependent detail → `bypassable: false`

The acknowledgement text must state the consequence, not the field name — the
filing will reach the clerk without stating whether bond was waived.

Readiness and export validation must stay **1:1**, which is the discipline the
first attempt broke. A bypassable issue still appears in the sidebar; it
simply does not hard-block.

### Verification

Red-first per item. Unanswered → acknowledgement offered, export proceeds once
cleared, and the acknowledgement re-arms after a filing change. `'Yes'` with a
blank dependent → blocked, not bypassable. Toggle `'Yes'`→`'No'`→`'Yes'` →
dependent data still present. Legacy `.sav` with a `bondWaivedDate` and no
`bondWaived` → loads as `'Yes'`; one with neither → loads unanswered, **not**
`'No'`. Sidebar and export agree in every one of those states.

### Cross-cutting ramifications (`AGENTS.md` §8)

Data model (four rows, two corrected and two added); `.sav` round trip and the
legacy inference above; Excel import/export in both filing types (Guardian
writes `bondWaivedDate` at `PART V` `G15`, Annual reads/writes
`restrictedDepositoryReceiptDate` at `p9` `G9` — the tri-state needs its own
verified cells or a documented decision not to write it); PDF models in both;
`TEST-INDEX.md`; and the filing-type enumeration guard if any new branch
enumerates types by hand.

---

## 57B - Certificate of Service Recipient Rules (EXECUTION-READY 2026-09-19)

**Not authorized.** Implements **D7**, **D16** and **D17**. Re-derived against
`master` on 2026-09-19.

### What a filer can do today that they should not

Two things, in opposite directions:

1. **On an accounting**, list a second service recipient, type only their name,
   and export. The filed certificate shows a half-addressed recipient and
   nothing objects - `validateAnnual()` and `validateSimplified()` check
   **only** `certRecipients[0].name` and never look at rows 2-4 at all.
2. **On an Initial Inventory**, click "+ Add Recipient" by accident and be
   blocked from exporting until the empty card is filled in or removed -
   `validateGuardian()` requires name, street and city/state/zip on *every* row.

And on all three, a filer who genuinely has no one to serve cannot say so. They
either leave Recipient 1 blank and are blocked, or invent an entry.

### State on master (verified 2026-09-19)

- `certNoRecipients` and `serviceNoRecipients` exist **nowhere** - not in
  `src/`, not in `probate-guardian-data-model.csv`. Both attestations are new.
- Validation today:

  | Family | Rule | Site |
  | --- | --- | --- |
  | Initial Inventory | every `serviceRecipients` row needs name + address + cityStateZip | `features/guardian-inventory/index.js:1286` |
  | Annual | `certRecipients[0].name` only | `features/annual-accounting/index.js:1594` |
  | Simplified | `certRecipients[0].name` only | `features/simplified-accounting/index.js:738` |

- **Nav checks differ structurally, and this is the trap.** The Initial
  Inventory does not hand-write its checks: `computeNavChecks()` runs
  `validate()` and buckets each error onto a route key via `errorRoute()`
  (`src/legacy-app.js:6638-6652`), so a new issue prefixed `D-5 - ` lands on
  `d5` **with no nav edit at all**. Annual (`a-p10`, `:6721`) and Simplified
  (`s-p6`, `:6667`) are hand-written and must be edited in lockstep or
  `checklist-export-parity.spec.js` fires - which is how the first 57 attempt
  broke the navigation contract. See the architecture note at the end of this
  document for why unifying the two models is a separate job.
- **Four conversion paths, not the two the earlier draft named** - dispatcher at
  `src/legacy-app.js:5075-5082`: `convertGuardianSchedulesToAnnual` +
  `convertGuardianExtrasToAnnual` (`:4902`, `:4940`), `convertToSimplified`
  (`:4966`, two branches), and `convertSimplifiedToAnnual` (`:5018`).
  annual->guardian and simplified->guardian map header fields only.
- Excel import already behaves correctly and must not be "improved":
  `guardian-inventory/excel.js:585` filters imported recipients to those with
  content and falls back to one empty card - a blank `PART VI` becomes an empty
  card, never an attestation.

### Decisions this implements

**D16 - the attestation is required only when no recipient is listed.** A filer
who lists at least one recipient never sees the question; listing someone
already answers it. A filer who lists none must answer before the filing
exports. Rejected: asking on every filing, which would put a mandatory Yes/No
in front of the majority of filers for whom the answer is self-evident - the
same objection D6 weighed for 57A.

**D17 - 57B's recipient rule applies to all three families.** Recipient 1
complete satisfies validation; cards 2+ are optional; a partly-filled card
blocks until completed or cleared. This **loosens** the Initial Inventory (an
empty extra card stops blocking) and **tightens** both accountings (a
half-filled card 2 stops exporting silently). One rule, three families.

### Scope

1. **Two new tri-state fields**, `''` / `'Yes'` / `'No'` per §4, never coerced:
   `serviceNoRecipients` (Initial Inventory, D-5) and `certNoRecipients` (Annual
   family and Simplified). `probate-guardian-data-model.csv` rows in the same
   commit; `npm run verify:data-model` must pass.
2. **The attestation wording is load bearing and must be carried verbatim** from
   `MILESTONE-57-PROPOSAL.md` §57B - *"No recipients are required for this
   certificate (filer attestation - app does not determine legal necessity)"*.
   Do not paraphrase, shorten, or re-voice it. It exists to keep the app on the
   right side of asserting a legal conclusion for the filer (§8 #8).
3. **Control**: reuse the Tier 1 primitive (§6), `yesNoRadioHTML()` in
   `src/core/form/form-fields.js`, through each family's existing wrapper -
   `yesNoCheckboxD()` (`legacy-app.js:5877`) for Annual, `yesNoCheckboxS()` for
   Simplified. No new control.
4. **Selecting Yes hides the recipient cards without deleting their data** (§4
   non-destructive toggling); clearing it restores them.
5. **Validation**, all three families, replacing the three divergent rules:
   attestation `'Yes'` means recipient rows are ignored entirely; otherwise
   Recipient 1 complete is required; a row 2+ with *some* fields filled must be
   completed or cleared; a row 2+ entirely blank is ignored; and Recipient 1
   blank **with** the attestation unanswered requires the answer.
6. **Conversion reset (D7)**, inside each mapper, never in the dispatcher - a
   caller-side reset is the shape that earned the review's "incomplete/unsafe"
   verdict, because a fifth conversion path added later would inherit nothing.
   All four paths reset the destination's attestation to `''`;
   `serviceNoRecipients` never maps to `certNoRecipients` or the reverse.
   Recipient address cards keep migrating exactly as they do now.
7. **The "review notice" is the reset itself.** No bespoke banner: an unanswered
   attestation on a filing with no recipients is already a validation issue by
   rule 5, so it appears in the sidebar and readiness panel through machinery
   that already exists. Confirmed by inspection - the conversion path raises no
   notice of its own today, and adding one would be a second mechanism saying
   what the first already says.
8. **Excel import asymmetry**: a blank recipient section imports as `''`, never
   as `'Yes'`. This is the §4 tri-state rule; the guardian reader already has
   the right shape (above), so the work is to avoid adding inference.

57B does **not** determine whether service is legally required, print a
recipient list when the attestation is selected, or carry the attestation across
a conversion in any form - including pre-filled with a flag.

### Steps

1. CSV rows + `verify:data-model`.
2. Fields in `emptyDataGuardian()`, `emptyDataAnnual()`, `emptyDataSimplified()`.
3. The control on each of the three pages, wired to the Tier 1 primitive.
4. Validators - one shared reader for the rule, not three copies. A row-2+
   "started but incomplete" predicate already exists in spirit as
   `rowHasAnyData`/`guardianHasAnyData`; reuse rather than re-invent.
5. Nav checks for `a-p10` and `s-p6` only; the Inventory inherits parity through
   `errorRoute()` provided the message keeps its `D-5 - ` prefix.
6. Conversion resets in all four mappers.
7. Fixture audit (§8 #3): `MINIMAL_VALID_GUARDIAN`, `MINIMAL_VALID_ANNUAL` and
   `MINIMAL_VALID_SIMPLIFIED` in `tests/e2e/support/fixtures.ts` all list a
   complete Recipient 1, so under D16 none needs the attestation - and
   `expectFileableFixture()` will catch it if that stops being true.

### Verification

Red-first (§2) per rule, each red for its stated reason: a half-filled
Recipient 2 exports today and must stop; an empty extra card blocks the
Inventory today and must stop; a converted filing carries the attestation
forward (it will, once the field exists) and must not. Convert Inventory ->
Annual with `serviceNoRecipients: 'Yes'` and assert the new filing's
`certNoRecipients` is `''` with recipient addresses intact - then the same for
the other three paths. `checklist-export-parity.spec.js` must pass without a new
`KNOWN_GAPS` entry; needing one means the nav rules and validators disagree.
`TEST-INDEX.md` rows in the same commit (§7).

### Cross-cutting ramifications (`AGENTS.md` §8)

Data model: two new fields across three filing types. Legacy `.sav`: a file
saved before this exists has neither field - it must read as `''` (unanswered),
never inferred from an empty recipient list, which is the same one-way rule
`dependent-question.js` enforces for 57A. **All four** conversion paths plus the
Simplified->Annual mirror. Excel import and export; PDF recipient rendering (a
selected attestation must suppress the recipient block rather than print an
empty one). Readiness/export parity, hand-written for two families and derived
for the third. `TEST-INDEX.md`. Legal framing is directly implicated: this is
the filer's sworn assertion, in the filer's words, and the app neither makes nor
checks it.

---

## One process note worth carrying into the next attempt

The first attempt's e2e specs were, in the review's own words, *"edited by hand
and not run"*, because Playwright Chromium was unavailable in that environment.
That single gap produced at least three separate defects found here:
`readiness-card.contract.spec.ts` asserting behavior a sibling commit had
already changed, `recovery-cache.spec.ts` asserting synchronously against an
async clear, and the 46 failures themselves going undetected through landing and
three repair commits.

A hand-edited test that has never executed is not evidence. It is a guess with
the syntax of evidence, which is worse, because it reads as covered.

---

## `routes.spec.ts:84` — intermittent, not order-dependent, not diagnosed

Recorded 2026-09-19 so the next person does not start from the wrong premise.

"helpful resources panel is visible on dashboard, hidden inside filings, and
restored on return" fails occasionally in a full serial run and has never
failed in any smaller one. **Its failure message has never been seen**, which
is the whole difficulty: every attempt to capture it has passed.

What has been ruled out, with runs rather than reasoning:

| Hypothesis | Evidence against |
| --- | --- |
| A specific earlier spec leaks state | Specs 1-34 + routes: 229 passed. Specs 35-69 + routes: 317 passed. Neither half reproduces it |
| A click lands between the two `renderSidebarResources()` calls in the dashboard `mount()` | Both calls, and all three render steps they wrap, are synchronous. A click cannot interleave inside one JS task |
| It is the accordion assertions | Those were the *previous* cause, fixed in `dc5d1ad`. That fix was real |

The misleading part of the history: `dc5d1ad` verified its fix with
`-g "helpful resources panel"` — a single test in isolation, which is exactly
the configuration where this passes. So the residual failure was never
observed, and the item has looked resolved ever since.

What is left is a genuine intermittent that needs roughly 550 preceding tests
to appear, pointing at accumulated load rather than at any neighbour. Catching
it means a full run with `--repeat-each`, or `trace: 'on'` for this spec so the
artifact survives a pass. **Do not "fix" it from a theory** — every theory so
far has been wrong, and the last one that looked right was right about a
different bug.

---

## Architecture note: two ways of computing readiness, and why that matters

Raised by Alan 2026-09-19 while 57B was being made execution-ready. Recorded
here because it is real, it is bigger than 57B, and the order it is done in
decides whether it helps or hurts.

**The inconsistency.** There are two models for `computeNavChecks()`:

| Filing type | Model |
| --- | --- |
| Initial Inventory | **Derived.** Runs `validate()` and buckets each error onto a route key via `errorRoute()` (`src/legacy-app.js:6638-6652`) |
| Annual family, Simplified, all four Plans | **Hand-written.** A literal `checks` object per filing type, restating each rule in its own terms |

The derived model is strictly better, and for one reason: it makes the 1:1
readiness/export invariant (§4) **structural** rather than enforced after the
fact. Under it, a sidebar section cannot disagree with the validator, because
there is only one rule. The hand-written model needs
`tests/unit/checklist-export-parity.spec.js` plus a `KNOWN_GAPS` allowlist to
police a gap that the other model cannot open. That allowlist exists only
because of this split, and every entry in it is a field the sidebar silently
ignores.

**It is feasible, not theoretical.** `errorRoute()` already resolves every
family: `Part X` to `/p10`, `Parts VI & VII` to `/p67`, `D-5` to `/d5`,
`Schedule B-1` to `/schb1`, plus a per-type table for the Plans. It is already
called for all nine filing types by the validation panel's own "Go to section"
links. The machinery is not missing.

**The trap, and the reason this is not a free win.** The hand-written checks
are in places *stricter* than their validators, and unifying would delete that
strictness silently. The live example is in this document: `a-p8` requires a
trust name while `validateAnnual()` does not, which is the 57E-1 gap. Converting
Annual to the derived model **before** fixing that validator would not fix the
disagreement - it would resolve it in the wrong direction, marking Part VIII
complete whenever the validator is silent, and removing the only signal anyone
currently gets that the export gate has a hole in it. A `KNOWN_GAPS` entry is a
recorded disagreement; the derived model would make it an unrecorded one.

So the order is: **make each validator complete first, then unify.** Every
`KNOWN_GAPS` entry and every sidebar rule stricter than its validator has to be
resolved deliberately - either the validator gains the rule, or the rule is
consciously dropped - before that filing type can be converted. 57E-1 is one
such resolution. There will be others.

**Why it is not part of 57B.** 57B adds one field to three forms. This touches
navigation for all nine filing types, the parity guard, and its allowlist. The
first attempt at Milestone 57 was reverted largely because a scoped item reached
into `computeNavChecks()` and broke nine navigation-status tests; folding an
architectural change into a field addition is the same move. Scope it on its
own, after the validators it depends on.

### What "validators first" actually means - the enumerated work

Audited 2026-09-19. **Revised the same day after review by Codex and
Antigravity, both of whom were substantially right and are followed here.**
The first version of this section overstated what a static identifier scan
proves and understated the cost of the derived model. What follows is the
corrected version; the corrections are recorded rather than quietly swapped,
because the first version was committed and could have been acted on.

**1. Simplified Accounting is missing from the parity guard, and there is a
real defect behind the omission - but it is not "five required fields."**

`checklist-export-parity.spec.js` lists `simplified` in `BRANCH_MARKERS` but
not in `VALIDATORS`, so the assertion has never run for that filing type. That
part stands, and adding it surfaces five identifiers.

**The five identifiers are not five independently required values.** Both
sites go through `checkSignatureState()`
(`src/core/validation/signature-state.js:47`), which normalizes an absent
state to `NONE` and **returns no errors at all** for it. So:

| State | What is actually required |
| --- | --- |
| absent / `none` | nothing - an unsigned certification is valid under the current product rule |
| `typed` | the date (and the printed name where that role does not already require it) |
| `stamp` | the image |

So the defect is not missing requiredness on five fields. It is that **`s-p5`
and `s-p6` never evaluate the signature-state machine the validator uses.**

And the scan missed part of it. `attorney_signatureDate` *does* appear in
`s-p5` - but only inside `datesOrdered()`, which is deliberately blank
tolerant (`!earlier||!later||...`, `legacy-app.js:6608`, whose own comment
says that tolerance is what makes it safe to attach to a key that does not
otherwise track the date's presence). **A typed signature with no date passes
`s-p5` and is refused at export.** That is a rule-level divergence on a field
present on both sides, which no identifier scan - the shipped guard's or the
mirror below - can detect.

**The filer-facing description in the first version was also wrong.** Both
calls pass `sectionLabel: 'Part V'` / `'Part VI'`
(`features/simplified-accounting/index.js:726`, `:745`), so the issue message
names the section and `errorRoute()` routes to it. Print Preview *does* say
what is missing and where. The defect is that the sidebar says the section is
complete when it is not - a contradiction between two surfaces, not a silent
refusal.

**Scope, corrected:** add `simplified` to the guard, then fix the two
behavioural rules - `s-p5` and `s-p6` must evaluate signature completeness
through the shared rule rather than field presence.

**That helper is not reachable from `computeNavChecks()` today, and saying
"use the shared helper" without saying so reproduces the lazy-loading defect
this document warns about in item 4.** `checkSignatureState()` and
`inferLegacySignatureState()` are imported only by `core/filing/readiness-config.js`
and the seven feature modules; **there is no `window.*` bridge for either**,
and `computeNavChecks()` lives in `legacy-app.js`, a classic script that
cannot `import`. Dashboard progress is computed synchronously for filings that
have never been opened, so a rule reached through a lazily-loaded feature
module is exactly the wrong shape.

So this fix must also deliver an **eagerly available pure
signature-completeness primitive**, plus the plumbing that makes it usable
from legacy code. The concrete files, verified rather than assumed:

| What | Where |
| --- | --- |
| The rule | `src/core/validation/signature-state.js` - already pure and dependency-light; gains a `window.*` assignment the way `core/filing/output-preflight.js` already does for `window.prepareFilingOutput` |
| Eager load point | `src/main.js` - loaded as a module from `index.html:286` and already imported purely for its bridge side effects (`core/state.js`, `core/form/form-fields.js`, and others). Add the import there, **not** to a feature module |
| Type declaration | `src/core/types/window-bridge.d.ts` |
| Allow-list | `tests/unit/fixtures/window-bridge-allowlist.json` - a real fixture file, not a list inside the spec |
| Behavioural tests | `tests/e2e/navigation-status.contract.spec.ts` - already carries a `simplified` entry with `triggerBlockedExport`, so the eight-case matrix extends existing structure rather than adding a file |

That guard fails the build on an undeclared global - confirmed by tripping it
during this milestone's own D14 work, which is why D14 dropped its global
instead of declaring one. This is a wiring change rather than a rewrite, but
it is not optional, and it is where the derived-readiness architecture in item
4 should be prototyped in miniature before anything larger is attempted. **Do not satisfy the
guard by naming the five fields**, and do not add bare `req()` checks for the
date or image: that would make an unsigned filing incomplete and collide
directly with the pro se / Ch. 393 protection in AGENTS.md section 4. Required test
cases, both Parts - and note that **blank is not equivalent to explicit
`none`**, because `inferLegacySignatureState()`
(`core/validation/signature-state.js:70`) reads a blank state as `typed` when
a date is present and `none` when it is not:

| Case | Expected |
| --- | --- |
| explicit `none` | complete |
| blank state, no date (legacy) | complete - infers `none` |
| blank state, with date (legacy) | infers `typed`; complete, and must not demand a re-selection |
| `typed`, date present | complete |
| `typed`, no date | **incomplete** - the live defect |
| `stamp`, image present | complete |
| `stamp`, no image | **incomplete** - the live defect |
| unrecognized value | **incomplete** - `checkSignatureState()` has an explicit invalid branch and must never silently pass |

Eight cases per role, two roles per filing - the finite domain item 3 argues
should be tested as a truth table rather than sampled.

**2. The reverse-direction scan is a search heuristic, not an enumeration.**

The first version reported "24 candidates" as though each were an adjudication
item. Two independent errors in that number, in opposite directions:

- **Inflated.** The slice covered the whole filing branch including the
  `incomplete` object, which no longer affects rendering at all -
  `applyNavChecks()` keeps the parameter for back-compat and ignores it
  (`legacy-app.js:7116-7120`). Fields occurring only there are dead.
- **Deflated, on the correction.** Re-slicing to the `checks` object alone
  drops the helper definitions that sit just above it, so `scheduleNoItems`
  was mislabelled as dead when it is read by `verifiedEmpty()`
  (`legacy-app.js:6693`), which `rowsComplete()` uses throughout the Annual
  checks. Whole-branch gives 24, checks-only gives 13, and **both are wrong**.

The conclusion to carry forward is the method's limit, not a number: identifier
scanning finds candidates worth reading and cannot enumerate this class.
Aliases, helper indirection and rule-level differences each defeat it.

Reading the survivors, the substantive reverse-direction families are three:

| Family | Where |
| --- | --- |
| Annual `scheduleNoItems`, **Part XI remuneration only** | Owned by MS 58D - do not duplicate that instance |
| Annual `scheduleNoItems`, **the other fourteen schedules** | Same mechanism, NOT owned by 58D. Unadjudicated - see below |
| Initial Plan Question 7 benefit selection | `q7*` identifiers in `planInitial` |
| Annual Plan Part 4 insurance/benefit selection | `q3BenefitsNone`, `q3BenefitsOther` and neighbours in `planAnnual` |

**Coordinate with MS 58D - but only on Part XI.** 58D states the mechanism
exactly: *"Current sidebar logic requires either the explicit no-items
declaration or complete rows, while `validateAnnual()` does not require
either."* Its scope, however, is Part XI remuneration and nothing else.

**The same mechanism affects fourteen other schedules, and those are not
owned by anyone.** The sidebar rule is `verifiedEmpty(key) || (at least one
row, and every row complete)`. Twelve schedules reach it through the shared
`rowsComplete()` helper (`legacy-app.js:6694`); **Schedule C and Schedule E
write the identical expression inline** (`a-schc`, `:6729`; `a-sche`, `:6735`)
and are easy to miss precisely because they do not call the helper.

| | Schedules |
| --- | --- |
| via `rowsComplete()` | A, B-1, B-2, B-3, B-4, D-1, D-2, D-3, D-4, D-5, F-1, F-2 (12) |
| hand-written, same rule | C, E (2) |
| **total outside Part XI** | **14** |

Meanwhile `validateAnnual()`'s `checkRows()`
(`features/annual-accounting/index.js:1609-1617`) returns early for any row
with no data, and so does Schedule C's own extra gain/loss loop (`:1625`), so
**an entirely empty schedule with no "none" declaration produces no validator
error at all.**

What a filer sees: fourteen schedules can show a red dash in the sidebar while
Print Preview reports nothing wrong with them.

Two withdrawn claims, recorded because both were committed. First: "already
scoped as MS 58D - do not write a second fix" was too broad and would have
left the whole set unadjudicated on the belief another milestone had it.
Second: the correction to that said *twelve* schedules, because it was derived
by grepping `rowsComplete(` and reporting its call sites - the same
scan-as-finding mistake this section warns about, committed inside the
paragraph warning about it. C and E impose the rule without calling the
helper. **Read the rules; do not grep the helper.**

**3. Rule equivalence needs review, but "no mechanical way" was too absolute.**

The Annual trust case is real and remains the worked example: `a-p8`
(`legacy-app.js:6711`) requires a trust name or a none declaration;
`validateAnnual()` (`features/annual-accounting/index.js:1645`) requires
neither. No field-name set can see it, because both sides reference
`d.trusts`.

But the first version's "there is no way to enumerate this class mechanically"
overstates it. Where a rule's inputs form a **finite domain**, differential
truth-table tests over generated fixtures can compare sidebar and validator
across every combination mechanically. The signature-state machine in item 1
is exactly such a domain - eight semantically distinct cases per role once
legacy blank-state inference and the invalid-value branch are included, as
tabulated in item 1. That cannot prove equivalence of arbitrary
JavaScript, but it is materially stronger than a manual read and should be the
default wherever the inputs enumerate.

**4. The 14 recorded `KNOWN_GAPS` entries do NOT close "for free."**

This was the first version's worst claim. They close only once a derived
readiness architecture exists, and the design has a blocker it did not name:

- Feature validators are **lazily imported**.
- `getWardProgress()` is **synchronous** and computes progress for every
  filing on the dashboard, including ones never opened
  (`legacy-app.js:7100-7114`).
- So `validateSimplified` / `validatePlanAnnual` / the rest may not exist when
  dashboard progress is computed.
- The Initial Inventory already lives with this: its branch returns `null`
  when `window.validateGuardian` is not yet loaded (`legacy-app.js:6625`),
  with a comment explaining that a fabricated pass would be worse than no
  reading. **Extending the derived model naively would extend that `null` to
  most dashboard filings until each feature had been visited** - trading a
  hand-maintained invariant for a dashboard that shows no progress.

So conversion needs an architectural decision first, and the options are not
equivalent:

1. **Extract the pure validation rules into eagerly-available core modules**
   (e.g. `src/core/validation/rules/`) so they can be evaluated synchronously
   without the feature bundle. Cleanest, and the one to prefer.
2. Eagerly load every feature module - bundle and startup cost, against the
   lazy-loading this app deliberately does.
3. Make dashboard progress asynchronous - a broader UI change with its own
   render-ordering questions.

It must also be verified that every validator section string routes to the
correct nav key before that type is converted, not assumed from
`errorRoute()`'s coverage.

**Suggested order**, smallest risk first:

1. Add `simplified` to the guard **and** fix the two behavioural signature
   rules, with the twelve-case matrix above. Independent, live, cheap.
2. 57E-1 - closes the one known rule-level divergence.
3. Audit the three reverse-direction families, respecting MS 58D's ownership
   of the Annual one.
4. Resolve the lazy-validator / dashboard-progress architecture.
5. Only then convert one filing type, proving it against
   `navigation-status.contract.spec.ts`, before the rest.
