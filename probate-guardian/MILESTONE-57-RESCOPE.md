# Milestone 57 — Re-scope After the Revert

## Status

**Draft.** Per `AGENTS.md` §2 nothing here is authorized until Alan approves a
named sub-delivery. This document does not replace
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
product's behaviour changed, which made it a policy question rather than a
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

### Trigger points

Two single dispatch sites, both already central:

| Family | Site | Action |
| --- | --- | --- |
| Guardian Inventory | `src/features/guardian-inventory/index.js:172` | `case 'add-entry': addEntry(control.dataset.schedule)` |
| Annual family | `src/features/annual-accounting/index.js:263` | `case 'add-row': addAnnualRow(collection, control.dataset.route)` |

Re-derive both line numbers at execution time.

### Steps

**C1.** Add the acknowledgement field to the data model and to
`probate-guardian-data-model.csv`, with a row per schedule in the same shape the
`scheduleDocs` rows use. Decide the storage shape first (Open Decision A).

**C2.** Add the modal. `confirmModal({ title, message, confirmLabel,
cancelLabel })` from `src/core/ui/dialogs.js` — it resolves `true` on confirm
and `false` on Cancel or Escape. Wording should say what the filer is
acknowledging, not just warn: that supporting documentation for this schedule
is required, that the app does not collect it for them, and that they can
attach it in this schedule's Supporting Documents section. **No native
`confirm()`** — `native-dialog-guard.spec.js` (50G-3) forbids it.

**C3.** Wire both dispatch sites: on adding a row to a financial schedule whose
acknowledgement is not yet recorded, show the modal and record the answer.

**C4.** Handle the non-click paths (Open Decision C).

**C5.** `normalizeWardData()` (`src/legacy-app.js:6351`) gives every legacy
`.sav` a defined value for the new field, so an old case file does not read as
"acknowledged" or crash on a missing object.

**C6.** Tests, red-first:
- A unit spec for the acknowledgement state model — which schedules are in
  scope per family, derived from the descriptor registry rather than a hand
  list; what an un-normalized legacy shape resolves to.
- An e2e spec: the modal appears on the first row added to a financial
  schedule, does **not** appear on the second row, does **not** appear on a
  narrative Plan page, and survives a `.sav` round-trip.
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

## Open decisions — these need Alan before C1 starts

**A. Where does the acknowledgement live?**
Either a new top-level `D.scheduleDocsAck = { <key>: true }`, or a flag inside
the existing `scheduleDocs[<key>]` structure. The existing structure is already
**period-scoped** (`resolveActiveDocPeriod(data)`), which forces question B.
A flat top-level object is simpler and period-independent.

**B. Does the acknowledgement reset for a new reporting period?**
"Once per schedule" is unambiguous within one filing. When a case rolls into a
new year via *New Year*, the supporting-documentation obligation arguably
recurs — a fresh period is a fresh set of receipts. Resetting means asking
again each year; not resetting means asking once in the life of the case.

**C. What about schedules populated without clicking Add?**
An Excel import fills schedules directly, and *New Filing from Existing* can
carry rows forward. Neither passes through `add-entry` / `add-row`, so the
modal never fires and the schedule ends up populated but unacknowledged.
Options: accept it (the gate is advisory, not a blocker); check on schedule
page render instead of on add; or fire once after an import completes.

**D. What happens on Cancel?**
`confirmModal` resolves `false` on Cancel *and* on Escape. Either the row is
not added — which makes the modal a genuine gate and risks a filer who pressed
Escape wondering why nothing happened — or the row is added and the modal
re-appears next time. The phrase "before proceeding" suggests the former;
the Escape behaviour argues for care in the wording either way.

---

## The rest of Milestone 57, unscoped

These carry the review's verdict and have **not** been re-scoped here. Each
needs the same treatment 57C just had — a decision first, then a design that
fits the app's existing mechanisms:

| Item | Review verdict | Note |
| --- | --- | --- |
| 57A | Defective validation | Bond-waived / restricted-depository tri-states. `bondWaived` and `restrictedDepository` already exist pre-57 (Guardian and Annual respectively) and are now documented in the data model |
| 57B | Incomplete / unsafe conversion | Certificate of Service recipient rules |
| 57D | Critical Excel regression, since fixed then reverted | **The template research survives and is the valuable part**: the B-4 workbook has 18 register pages in 4 account blocks with verified row capacities — see `MILESTONE-57-REVIEW-HANDOFF.md` |
| 57E-1 | Poorly integrated | Trust-accounting capture. 57E-2 (audit-fee formula) remains deferred pending an approved formula |
| 57F | Round-trip defect fixed; PDF claim unverified | The PDF period-date fix was never render-tested. The Guardian date round-trip fix survives the revert as defensive robustness |
| 57G | No defect found | Annual Plan terminology |
| 57H | Privacy / product-design regression | Reverted. Its replacement — the `pg-last-position` marker — is live and documented in the user guide |

---

## One process note worth carrying into the next attempt

The first attempt's e2e specs were, in the review's own words, *"edited by hand
and not run"*, because Playwright Chromium was unavailable in that environment.
That single gap produced at least three separate defects found here:
`readiness-card.contract.spec.ts` asserting behaviour a sibling commit had
already changed, `recovery-cache.spec.ts` asserting synchronously against an
async clear, and the 46 failures themselves going undetected through landing and
three repair commits.

A hand-edited test that has never executed is not evidence. It is a guess with
the syntax of evidence, which is worse, because it reads as covered.
