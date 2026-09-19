# Milestone 57 — Re-scope After the Revert

## Status

**57C-R landed 2026-09-18.** Approved by name by Alan and shipped in
`aacbd56` / `460a228` / `ff1f97d`, with `8d5b5f6` updating the 18 fixtures the
prompt interrupts. Full suite green at the time: 607 passed, 6 skipped, 0
failed. See the dated note on the 57C-R section below for what actually
shipped and how it differs from the design here.

**No further 57 work is authorized as of 2026-09-19.** Alan's instruction that
day was to close what was closeable and start nothing new. 57G and the
trust-question item are closed (see the table below); D6 and D7 settle the
design questions for 57A and 57B so those are not re-litigated later, but
neither is approved to build.

**The rest of Milestone 57 is still unscoped and unauthorized.** All five of
this document's design questions were settled before 57C-R was built
(Decision 1 below, and Decisions 2–5 near the end), but those decisions were
about 57C-R only. Every remaining item in "The rest of Milestone 57" needs its
own decision first. Per `AGENTS.md` §2 nothing there is authorized until Alan
gives it by name. This document does not replace
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
| 57A | Defective validation | Bond-waived / restricted-depository tri-states. `bondWaived` and `restrictedDepository` already exist pre-57 (Guardian and Annual respectively) and are now documented in the data model. **Design decision settled — see D6 below.** Still needs a design and approval by name before any work starts |
| 57B | Incomplete / unsafe conversion | Certificate of Service recipient rules. **Design decision settled — see D7 below.** Still needs a design and approval by name before any work starts |
| 57D | Critical Excel regression, since fixed then reverted | **The template research survives and is the valuable part**: the B-4 workbook has 18 register pages in 4 account blocks with verified row capacities — see `MILESTONE-57-REVIEW-HANDOFF.md` |
| 57E-1 | Poorly integrated | Trust-accounting capture. 57E-2 (audit-fee formula) remains deferred pending an approved formula |
| 57F | Round-trip defect fixed; PDF claim unverified | The PDF period-date fix was never render-tested. The Guardian date round-trip fix survives the revert as defensive robustness |
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
