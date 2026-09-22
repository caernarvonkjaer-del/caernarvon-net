# Milestone 66: The User Guide Catches Up Again — Findings and Corrections

## Status

**Authorized and executed 2026-09-22.** Not proposal-gated: the requester
authorized both finding and fixing the drift in the same run. Every item
below was independently verified against current `master` (file:line, or a
directly-captured screenshot) before any guide text or image was touched —
never from a milestone doc's own claim, a commit message alone, or memory.

| # | Finding | Disposition |
| :-- | :-- | :-- |
| 1 | D-5 "Indicate if Ward is:" (64A-2/65A) — required dropdown, undocumented | **Fixed** — guide text + drift-guard registration |
| 2 | "No recipients are required for this certificate" attestation (57B/63B) — undocumented on all three certificate-of-service pages | **Fixed** — guide text on D-5, Annual Part X, Simplified Part VI + registration |
| 3 | D-4 "Has the surety bond been waived by court order?" (64A-1/D16) — undocumented, and the exemption it creates | **Fixed** — guide text + registration |
| 4 | C-2 "Claimant's Attorney (if any)" (64A-2, item 3.4) — new optional field, undocumented | **Fixed** — guide text + registration |
| 5 | D-2 "Compilation \"as of\" date" (64A-2, item 2.5) — new optional field, undocumented | **Fixed** — guide text + registration |
| 6 | Excel export never carries Part XI (Declaration of Remuneration), even with entries | **Fixed** — added to "Excel export details" |
| 7 | Dashboard "TEST SYSTEM - Do not use for filing" label — undocumented | **Fixed** — guide text + registration |
| 8 | D-4 and D-5 figures predate findings 1–3 | **Fixed** — re-captured against current source, spliced in place |
| 9 | **Systemic: every screenshot showing the app name still reads "Probate Guardian"** (Milestone 62 renamed the *app* to "Guardian Forms"; the guide's own *prose* was fixed, its *screenshots* were not) | **Fixed** — all 83 images visually triaged (56G method); 56 confirmed stale and re-shot, 27 confirmed already correct and left alone (see Finding 9) |
| 10–19 | Ten other "known gaps to start from" (63A, 63D, 63E, 63F, 64A prints, 64B prints/calcs, 65B–65E) | **Verified already correct or already fixed by an earlier commit — no change made.** See "Verified, no change needed" below, each with its own evidence |

**Found but out of scope (behavioral, app-code):** nothing new. One
pre-existing, already-tracked cosmetic defect is relevant to Finding 3's
wording and is called out there, not re-reported.

**Tests:** `user-guide-drift-guard.spec.js` and `test-index-guard.spec.js`
green (see "Final regression" at the end). Six new drift-guard registrations,
zero regressions among the sixteen prior ones.

---

## Method

Per `AGENTS.md` §10 P2 and this milestone's own instructions: every claim
below is checked against the file and line that actually governs the
behavior, not against a milestone doc's summary of it, a diff, or a prior
session's memory. Screenshots were triaged by opening the image and looking
at it (Milestone 56G's method), not by trusting a caption or a filename.

**Commit reconciliation.** `git log --oneline 3dfed38..HEAD -- help/index.html`
shows nine commits touched the guide since the last full pass (Milestone
56H): `c95d766`, `c06cb03`, `5a9c091`, `bfdaae3`, `354797e`, `3a96e3d`,
`37f3d54`, `d51fddd`, `fff30b6`. The last of these lands inside Milestone 65
(2026-09-22); the guide was evidently kept reasonably in step through
Milestones 57–62 by these incremental syncs (`37f3d54` in particular reads
"correct the user guide against ... verified against source" — a deliberate
sync pass), which is consistent with this task's own scope instructions
naming Milestone 63 onward as the actual gap. This document's commit-by-commit
reconciliation (below, "Verified, no change needed") therefore covers
`c1770bc..HEAD` — every code commit from Milestone 63A's authorization
forward — cross-checked file:line against the guide's current text. Findings
1–7 are the drift this reconciliation surfaced beyond the task's own starting
list (2, 4, 5, 6, 7 were not named in the task's "known gaps" list; they were
found by reading every `git log -1 --format=%B` message in that range and
checking its claim against both source and the guide).

---

## Findings — text/field-level drift (Fixed)

### 1. D-5 "Indicate if Ward is:" — a required question the guide never mentioned

**What a filer observes:** Guardian Inventory D-5 (Certificate of Service)
has had a required dropdown since Milestone 64A-2 — *Indicate if Ward is:*
(Ward is totally incapacitated / Ward is under 14 years old / N/A) — that
blocks export until answered. The guide's D-5 bullet described Recipients
and the Attorney Certification's contact fields but never mentioned this
question at all, so a filer reading the guide before opening the page would
not know it exists, and a filer stuck on an export-blocking error naming it
would find nothing in the guide explaining what it is.

**Evidence, read directly:**
- On-screen label: `src/features/guardian-inventory/index.js:1198` —
  `reqLabel('Indicate if Ward is:')`.
- Required at export: `src/features/guardian-inventory/index.js:1362` —
  `req(d.serviceIndicateIf,'D-5 — Indicate if Ward is:','serviceIndicateIf');`
  with a comment confirming `'N/A'` is a real, complete answer, not a
  stand-in for unanswered.
- Printed sentence: `src/features/guardian-inventory/pdf-model.js:816` prints
  `Indicate if Ward is: ${...}` after the recipient list, citing
  § 744.362(1) in the certify sentence above it (commit `da908f6`).
- Wording: Milestone 65A (`3338e48`) confirmed this is the *only* place this
  exact question exists — the identically-worded "Indicate if" on
  Annual/Simplified's certificate pages (`certIndicator`) is a different
  question (method of service) and is correctly left alone.

**Fix:** `help/index.html`'s D-5 bullet now names the field, its three
options, and the statutory cite, with a `data-app-control="guardian-indicate-if-ward"`
registration (`tests/unit/user-guide-drift-guard.spec.js`).

### 2. The "no recipients" attestation — undocumented on all three surfaces it renders

**What a filer observes:** on Guardian Inventory D-5, Annual/Final/Trust
Part X, and Simplified Part VI, if Recipient 1 is left blank a checkbox
appears in its place: *"No recipients are required for this certificate
(filer attestation - app does not determine legal necessity)."* Starting to
fill in Recipient 1 makes the checkbox disappear; ticking it hides the
recipient cards instead. This control (originally Milestone 57B, with its
visibility rule narrowed in 63B so it only shows while it actually applies)
was never mentioned in the guide on any of the three pages that render it —
confirmed by searching the guide for "recipients are required" and "no
recipients," zero hits before this fix.

**Evidence, read directly:**
- The shared visibility rule: `src/core/form/service-attestation-visibility.js:1-15`
  — shown when Recipient 1 is not started, or when the attestation is
  already `'Yes'`.
- The exact string, declared independently in each of the three feature
  modules (not imported from one place): `src/features/guardian-inventory/index.js:23`,
  `src/features/annual-accounting/index.js:28`, `src/features/simplified-accounting/index.js:41`.

**Fix:** D-5's bullet gets the full explanation; Annual's Part X and
Simplified's Part VI bullets get a one-clause cross-reference back to D-5
(`"the same … checkbox described under the Initial Inventory's D-5 takes its
place"`), avoiding restating the mechanism three times. Registered as
`service-no-recipients-attestation` with evidence in all three files, per the
drift-guard's own "evidence must cover every surface" rule.

### 3. D-4 "Has the surety bond been waived by court order?" — undocumented, with a real exemption behind it

**What a filer observes:** D-4 (Surety Bond & Bond Calculation) has always
had a Yes/No question, *Has the surety bond been waived by court order?*,
but as of Milestone 64A-1/D16 answering **Yes** changes what the page
requires: Bond Amount, Bond Period From/To, and Name of Bonding Company are
no longer required (only the waiver order's date is), where previously all
three were required unconditionally. The guide's D-4 bullet listed Bond
Amount/Period/Company as if always needed and described the waiver date as
merely "optional," without ever naming the toggle that governs all of this.
A guardian with a real waiver order in hand, reading only the guide, would
not know the app lets them file without inventing bond figures.

**Evidence, read directly:** `src/features/guardian-inventory/index.js:1166`
(the toggle) and `:1316-1321` (the validator: `if (!triYes(d.bondWaived)) {
req(d.bondAmount,...); ... }`, with the comment explaining an unanswered
waiver question is not treated as "waived" — tri-state, `AGENTS.md` §4).

**Known, already-tracked cosmetic gap, not re-reported as new:**
`MILESTONE-64-PROPOSAL.md`'s own final-regression notes record that the
on-screen labels for these fields still render with a required-looking
asterisk even when waived relaxes the actual block (`index.js:1164-1165`) —
cosmetic only, export is never blocked by it. The guide's new text describes
what actually gates export, not the label styling, so this pre-existing,
already-recorded gap does not need restating here.

**Fix:** the D-4 bullet now names the toggle and its effect, registered as
`guardian-bond-waived`.

### 4 & 5. Two new optional fields from Milestone 64A-2, undocumented

**C-2's "Claimant's Attorney (if any)"** (`src/features/guardian-inventory/index.js:976`,
commit `7e5d8b3`): the form's own field is "Name of claimant/petitioner and
their attorney," and the app previously captured only the claimant. Now
optional, printed on the claimant line in the form's own shape (its worked
example: *"Atty John Smith for Bob Jones, plaintiff"*). **Worth a filer's
attention, and now in the guide:** re-importing an exported Excel workbook
merges the attorney back into the claimant-name field, because the form
gives the two one free-text line with no delimiter and the importer
deliberately does not invent a splitting rule the court's own template
doesn't have (decided by Alan 2026-09-22, per the commit). The `.sav` file
and the printed PDF always keep them separate; only the Excel round trip
merges them.

**D-2's "Compilation 'as of' date"** (`src/features/guardian-inventory/index.js:1087`,
commit `0c227ad`): the preparer's compilation statement is "as of" a date the
court's form gives its own box, separate from the date the preparer signs —
genuinely different when an inventory compiled as of the GID is signed weeks
later. Optional; blank falls back to the signature date, so a filing that
predates this field is unaffected.

**Fix:** both fields added to their respective bullets (C-2 under Schedule C,
D-2 under Attestations & Filings), each registered
(`guardian-c2-claimant-attorney`, `guardian-preparer-as-of-date`).

### 6. Excel never carries Part XI (Declaration of Remuneration)

**What a filer observes:** on the Annual/Final/Trust Accounting, Part XI's
remuneration entries print in full on the PDF but never appear in the Excel
export, even with real entries — not a bug, a deliberate Milestone 58D
decision, reaffirmed at 64B (item 11/D9): the Clerk's own workbook has no
data-row grid for Part XI (only a header block and the statutory paragraph),
so "inventing a grid where the court published none" would violate
`AGENTS.md` §5. The guide's existing "Excel export details" section already
explains the broader "Excel is not a backup" point but said nothing about
this specific, permanent gap.

**Evidence:** `src/features/annual-accounting/excel.js:106` —
`unsupported:"the court's Excel workbook has no entry area for Part XI, so
remuneration cannot be written to it. File this accounting as PDF, where
Part XI prints in full."` — and Milestone 64B-2's own fix (`0e5a9ec`) to the
readiness panel, which previously rendered a nonsensical "2 of 0 ... entries
would be left out" for this exact case.

**Fix:** a fourth bullet added to "Excel export details," describing the
gap and pointing to the readiness panel's own explanation, matching the
guide's existing style for the sibling "not every filing has an Excel
export" bullet immediately above it.

### 7. The dashboard's "TEST SYSTEM - Do not use for filing" label

**What a filer observes:** every dashboard, unconditionally, carries a red
label next to its heading warning this deployment is not for producing a
real court filing. Added by an unlabelled `fix(dashboard)` commit
(`653cd0e`, same day as Milestone 65, carrying MS65's proposal doc but not
itself numbered into it) and confirmed still present and unconditional at
`src/features/dashboard/index.js:97`. The guide's Dashboard section never
mentioned it, and — worth stating plainly — it is now visible in the
Dashboard figure itself after Finding 9's re-capture, so a filer comparing
the screenshot to the prose would see red text the prose never explains.

**Fix:** one sentence added to the Dashboard section's opening paragraph;
registered as `dashboard-test-system-label`.

---

## Findings — screenshots (Fixed)

### 8. D-4 and D-5's figures predate Findings 1–3

Opened both images as embedded in `help/index.html` before writing anything
(per this milestone's own method requirement, and `AGENTS.md` §10 P2's
"verify against the generated artifact, not the source claim, where the
question is what a filer receives"):

- **D-4's image** ran directly from "Name of Bonding Company" to "If bond
  waived – date of order" with **no Yes/No question rendered between them**
  — conclusive: the question exists in current source (confirmed above) and
  is absent from the image, so the image predates it.
- **D-5's image** showed "Service Date (on this date)" alone on its row with
  nothing where the required dropdown now sits.

**Fix:** `tests/capture/guide-screenshots.capture.ts` gained two new capture
tests (`d4-bond.jpg`, `d5-certificate.jpg`), reusing the existing
`freshStartNoPassword`/`createWard` fixture helpers, filling the bond-waiver
toggle (answered "No," all three fields filled) and the Certificate of
Service (two recipients, Indicate if Ward is: "Ward is totally
incapacitated," full attorney block), each asserting the new control is
visible — and, for D-5, has the expected value — before shooting. A shared
`dismissFloatingToasts()` helper dismisses the PWA offline-access offer and
the "Save Your First Backup" reminder first; both floated over the captured
region on their own timers in the first run and had to be dismissed the same
way the existing dashboard capture test already does (see Finding 9's own
discovery of the identical problem). Both images verified visually after
splicing into `help/index.html` in place (re-extracted from the committed
file, not from the intermediate `.guide-shots/` output, per "verify the
exported artifact" discipline) — both clearly show the new control with a
value, no toast overlay.

### 9. Systemic: the Milestone 62 app rename never reached any screenshot

**What a filer observes, and why it matters more than a typical cosmetic
miss:** Milestone 62 renamed the product "Probate Guardian" → "Guardian
Forms" throughout the live app. The guide's own *prose* is completely clean
— a full-text scan of the de-imaged guide (`data:image/...;base64,...`
payloads stripped, exactly as `user-guide-drift-guard.spec.js` does its own
scan) found **zero** remaining occurrences of "Probate Guardian." But no
screenshot was ever re-captured, so every image that shows the app's own
branding — the sidebar's brand badge, the startup dialog's own title, and
scattered in-app copy that names the product (e.g., "Probate Guardian does
not certify or remediate uploaded documents…" under Supporting Documents) —
still shows the retired name. A filer opening the guide today sees a product
called "Guardian Forms" described in text and captioned as "Guardian Forms"
in the figure captions, while the pictures themselves show an app called
something else — exactly the kind of contradiction that erodes trust in a
document meant to be authoritative.

**Confirmed stale by direct visual inspection** (not inferred from alt text
or caption, per the 56G method) in at least seven images spanning unrelated
sections, before any fix: the dashboard figure, the Helpful Resources panel
figure, the Help & Guidance panel figure, the startup "Open Case File /
Start a New Case" dialog figure, the workspace/Guardian Inventory cover
figure, the Schedule B-1 figure, and the Annual Accounting Schedule A
figure. The dashboard figure was additionally three further versions stale
at once: it showed the *Comment Card* link (hidden by Milestone 62 on that
surface, and by 65D on the Start New Form page), the old "Probate Guardian
isn't affiliated…" disclaimer wording (pre-65B/65C), and only four counters
where the current dashboard shows six (Action Items/Exceptions, Approaching
Deadlines, Active Filings, Total Filings, Total Open Filings, Total Closed
Filings) — the guide's own prose already correctly says "six counters," so
that image was already contradicting the guide's own text even before this
milestone, on top of the rename.

**Completed as a dedicated follow-up (2026-09-22), same-day.** The
follow-up this section originally recommended was authorized and run
immediately rather than deferred. Every one of the guide's 83 embedded
images was opened and looked at directly — the 56G method: never infer
staleness from a filename, alt text, or caption. **56 of the 83 still
carried the retired "Probate Guardian" branding** (the sidebar's brand
badge, a dialog's own title such as "Unlock Probate Guardian," or in-app
boilerplate such as "Probate Guardian does not certify or remediate…" under
Supporting Documents); the other 27 were already correct, either because
they already showed "Guardian Forms" (the five this milestone's own D-4/D-5
work and the free three above had already fixed) or because they are tight
crops of a single control or dialog with no app-name text or chrome in
frame at all (e.g. the SSN-mask close-ups, the signature-capture panel, the
readiness-panel close-up). All 56 were re-shot against current source and
spliced into `help/index.html` in place of the stale ones; the other 27
were left untouched.

**The 56, by section:** the three startup screens (start dialog,
protect-data dialog, unlock dialog); the workspace overview and the
Active-Filing dropdown; the Start New Form selector; all fifteen Guardian
Inventory (Initial Inventory) figures — cover, summary, Schedules A-1
through C-5, the empty-A-1 checklist state, the C-3 "verify none" state,
the Supporting Documents close-up, and D-1 through D-3 (D-4/D-5 were
already current from this milestone's own earlier work); Simplified
Accounting's cover, Part II, Part IV, Part VI, and Part VII; Annual
Accounting's cover, Schedule A, Schedule B-4, Parts VI/VII, and Part IX;
all five Initial Guardianship Plan figures; all seven Annual Guardianship
Plan figures; the Simplified Annual Plan's Questions 1-9; all three Annual
Plan — Minors figures; Print Preview; and the sidebar save controls,
Manage Shared Records, guided-tour, Activity Log, and dark-mode figures.
`tests/capture/guide-screenshots.capture.ts` gained twelve new test cases
covering these, reusing the D-4/D-5 example case (Eleanor Marie Whitfield /
guardian Margaret Whitfield-Harris / attorney Daniel R. Okafor, Esq. / case
26-001234-GD / Pinellas County) for visual continuity, and reusing Jacob
Whitfield for the Minors plan the same way the stale figures themselves
already did. Guardian Inventory's schedule rows (A-1, A-2, B-1 through B-4,
C-1, C-2, C-4, C-5) were populated with the same values the stale figures
themselves showed, transcribed by direct visual inspection before writing
any capture code — this pass changes branding, not the guide's example
case. Simplified/Annual Accounting's Part II amounts, D-2's
signature-method state, and per-row Comments instead use the shared
`fixtures.ts`/`target.ts` `MINIMAL_VALID_*`/`fillMinimalValidPlan*Ward()`
defaults already used throughout the e2e suite — still realistic and
correctly branded, just not byte-identical to the numbers they replace; a
deliberate simplification, not an oversight.

**Four real bugs surfaced and fixed while building the new captures — all
in this file's own test helpers, none in the app:**

1. `dismissFloatingToasts()`'s check for
   `[data-shell-action="hide-auto-export-reminder"]` used `.count()`, which
   is always 1 — that button is static markup in `index.html`
   (`#auto-export-reminder`), always present in the DOM whether or not it's
   actually shown. Calling `.click()` whenever `.count()` was truthy made
   Playwright wait the full 60-second test timeout on every page where the
   reminder wasn't genuinely visible yet, silently consuming the run.
   Fixed to check `.isVisible()`, which resolves immediately either way.
2. The advisory "Supporting documentation" modal
   (`schedule-doc-ack.js`) re-appears on *every* navigation to a financial
   schedule that has rows, not once per ward — confirmed live, it blocked
   Schedule C-3 (zero rows, verify-none checked) exactly like it blocked
   the populated schedules, and it was still sitting on top of Annual
   Accounting's Parts VI/VII and IX after being dismissed once earlier in
   the same test. Fixed by calling the existing `dismissScheduleDocPrompt()`
   helper after every such navigation, not just the first.
3. The guided-tour walkthrough overlay does not close on Escape. A capture
   that navigated away while it was still open hung the browser context's
   own teardown for the full test timeout, surfacing only as "Tearing down
   context exceeded the test timeout" with no other error. Fixed to use the
   tour's real close control, the "Skip Tour" button
   (`[data-shell-action="skip-walkthrough"]`).
4. Creating three filings under one shared ward name (deliberately, to
   match what the stale Active-Filing-dropdown figure itself already
   showed) triggers the app's own carry-over auto-detection
   (`doConfirmSimplifiedEligibility()`), which raises an `alertModal()`
   summarizing what was carried over. Left unacknowledged, the eligibility
   dialog never finished closing and the capture hung. Fixed with
   `autoAcceptDynDialogs()` around the three ward-creation calls.

None of these four are user-facing app defects — all four are gaps in the
capture tooling's own handling of already-correct app behavior, fixed so
the tooling reflects the app accurately.

**One content gap found and deliberately left alone, not silently forced
to fit:** the guided-tour figure's own alt text says it highlights "the
filing progress card," but no entry in the current `WALKTHROUGH_STEPS`
(any filing type) mentions a progress card — grepped for "progress card,"
zero hits. That tour step no longer exists under that description; the
re-shot figure shows the tour's actual current first step instead. This is
a real, separate content drift (which step number means what), not a
branding question, and is out of this pass's scope — recorded here rather
than fixed or ignored per this task's own instructions.

**Two accepted, deliberate simplifications, not defects:**

- The Print Preview figure (`print-preview.jpg`) uses
  `fillMinimalValidGuardianWard()`'s own generic fixture identity
  (`Sample Guardian`, case `2026-CP-000123`) rather than the Eleanor Marie
  Whitfield / Margaret Whitfield-Harris continuity the other Guardian
  Inventory figures share, because that capture doesn't overlay the same
  custom fields the schedule-figure capture does. The PDF it shows is
  fully valid and correctly branded — just a different sample case than
  its neighbors.
- The sidebar's own "TOTAL VALUE" / "NET ASSETS" widget reads $0.00 in
  several figures (e.g. `inventory-cover.jpg`) even where the page's own
  schedule totals are correct and non-zero (confirmed on
  `inventory-summary.jpg`, which shows every schedule total correctly).
  This widget is populated by mutating `window.D` directly rather than
  through the UI's normal input-change flow, and evidently doesn't
  recompute from that path alone. Cosmetic only, and — worth noting — it
  matches what the *original* stale cover figure already showed ($0.00),
  so this is not a new inconsistency this pass introduced.

**Verification.** Every one of the 56 replacement JPEGs was viewed twice:
once from the raw `.guide-shots/` capture output (to confirm the capture
itself was correct and un-blocked by either of the two dialog/modal bugs
above), and a second time re-extracted from the committed `help/index.html`
after splicing (to confirm the swap landed and shows the intended content —
the same "verify the exported artifact, not the source claim" discipline
`AGENTS.md` §5/§10 require for court output, applied here to the guide's
own images). The 27 untouched images were each viewed once, during the
initial triage, and confirmed to already be correct. All 83 have now been
opened and looked at directly in this milestone; that is how "no image
still shows the old name" is known, not inferred from the text scan below
(which cannot see inside a JPEG's pixels — see the Judgment calls section
for why that scan alone was never sufficient evidence for this finding).

---

## Verified, no change needed

Every item below was checked against current source before being marked
this way — "the guide is already right" is a claim like any other in this
document and gets the same evidence standard as a finding.

| Item | Why no change |
| :-- | :-- |
| **63A** — per-page "what's missing" box | Guide's "Required fields and completion" section (`help/index.html:262-269`) already describes the yellow box, its jump links, and the date-order rule accurately against `src/core/status/section-guidance-policy.js` and `legacy-app.js:7226-7275`. |
| **63B** visibility rule | Subsumed by Finding 2 above — the control itself was undocumented, not misdescribed; now fixed. |
| **63D** preparer-authorization note | Guide's Signatures section (`:335`) already describes the note's substance (confirm authorization before signing) against `src/core/signature/preparer-note.js:23`. Minor wording variance only (guide paraphrases "on this page" as implicit) — not a factual error, left as house style. |
| **63E** UCN placement | Guide (`:293`, `:646`) says the UCN "prints on the same line on the first page, and above Case # in the running header on the pages after it," and that it is not carried in Excel. Verified word-for-word against `src/core/pdf/header-identity.js:12-14,19` (`firstPage: "UCN: … CASE #: …"`, `continuation: ["UCN: …", "Case #: …"]`) and Milestone 63E's own D7–D10 decisions. Commit `3a96e3d` got this right the first time. |
| **63F** page-specific listings | Same mechanism as 63A; the guide makes no page-specific claim that 63F's fix (Simplified Part III, Plan-Annual 3G, Plan-Minors Preparer & Attorney) would contradict. |
| **64A-1** Bond Amount numeric storage | Internal storage-format fix (was a free-text field silently truncated by `parseFloat`, now a real numeric input). The guide's general "Money fields have a `$` prefix" rule (`:287`) already covers the corrected field; nothing in the guide claimed the old, wrong behavior. |
| **64A-2** Safe Deposit Box prints on Part I | PDF-print-only relocation (`944b1de`) — the answer is still entered on-screen at D-3, which the guide correctly describes (`:416`); only where it *also* prints, in the PDF header block, changed. |
| **64A-2** Part III/IV/V restructure & relabeling | Guide's D-1→Part III / D-2→Part IV / D-3,D-4→Part V / D-5→Part VI mapping (`:414-418`) is **unchanged since the guide's own creation** (`git log -S` on this exact text returns only `fc05e55`, the file's first commit) and already matched the corrected structure — the restructure (`8227643`) changed the PDF's *printed attestation wording* per part, not the on-screen part numbering the guide describes. |
| **64A-2** every schedule's printed title matches the form | PDF-print-only (`f6a3ceb`); the guide's own schedule names (e.g. "A-1 Real Estate / Real Property," `:371`) already use the court form's wording, not the app's prior paraphrase — spot-checked, not contradicted. |
| **64A-1** B-4 Related Property / C-3 Action Date & Case Number now optional | Guide's B-4 and C-3 bullets (`:384`, `:399`) never asserted these were required (no required-field styling used in prose); the fix relaxes validation to match what the field labels already implied ("(if secured)," "if filed"). |
| **64A-1** Summary page Part V Personal Property total | On-screen display bug fix (blank line → bound value); guide's Summary description (`:366`) is generic and was never wrong about it. |
| **64B-1** Schedule D-2/D-3/D-4 Carrying Value / Restricted Amt | Internal calculation-only fix; the guide never described this calculation (searched for "Carrying Value" and "Restricted Amt" — zero hits before or after), so there was nothing to correct. |
| **64B-2** Schedules E, F-1, F-2 always print their first page | Brings these three in line with every other schedule's pre-existing behavior, which the guide's "I verify there are none" section (`:283`) already describes correctly and generically ("the printed form shows the schedule as empty"). No misleading claim existed. |
| **64B-2** Part VIII prints trust creation date/type | PDF-print-only (`2ae794d`); the fields were already captured on-screen and in Excel, the guide's terse Part VIII description (`:510`, "describe each") doesn't itemize fields and isn't contradicted. |
| **64B-2** Excel-limit panel explains Part XI | Superseded by Finding 6's own guide addition, which documents the underlying gap rather than the panel's wording specifically. |
| **65A** D-5 "Indicate if" → "Indicate if Ward is:" | This is Finding 1 above — the guide never described the field under either wording, so 65A's rename had nothing to correct; the fix adds the field with its current, correct wording directly. |
| **65B/65C** Helpful Resources disclaimer | Verified byte-for-byte: `help/index.html:849` already reads "Other than Pinellas Clerk sites, Guardian Forms is not affiliated…" — 65B's exact wording. 65C's third sentence ("This service is provided, Free to Use…") deliberately has **no** guide copy, because `resources.js` has no matching anchor sentence in the guide (65C's own proposal doc records this scope decision explicitly). Both already correct; no text change made. Screenshot currency addressed by Finding 9. |
| **65D** Comment Card removed from Start New Form page | Guide already says nothing about Comment Card anywhere (removed by `d51fddd` when the dashboard copy was hidden) — confirmed with a repo-wide search, zero hits. Correct as-is; nothing to add back. |
| **65E** Report a Bug border color | Cosmetic (`--line` → `var(--brand)`). No guide *text* references button border colors. The three re-captured screenshots (Finding 9) incidentally now show the current maroon border since they're live captures of current source; no separate action needed. |

---

## Drift-guard registry (six new entries)

`tests/unit/user-guide-drift-guard.spec.js`'s `GUIDE_CONTROLS` registry grew
from ten entries to sixteen, following the file's own established
evidence-pattern conventions exactly (a stable `data-app-control` id in the
guide, mapped to the exact source markup that renders it, every rendering
surface required as evidence):

| ID | Surfaces | Why it wasn't there before |
| :-- | :-- | :-- |
| `guardian-bond-waived` | Guardian Inventory D-4 (1) | New control (64A-1/D16), and the guide never mentioned bond-waiver at all before this pass. |
| `guardian-indicate-if-ward` | Guardian Inventory D-5 (1) | New control (64A-2), same reason. |
| `service-no-recipients-attestation` | Guardian Inventory D-5, Annual Part X, Simplified Part VI (3) | Existed since 57B; never documented, on any of its three surfaces, until now. |
| `guardian-c2-claimant-attorney` | Guardian Inventory C-2 (1) | New field (64A-2, item 3.4). |
| `guardian-preparer-as-of-date` | Guardian Inventory D-2 (1) | New field (64A-2, item 2.5). |
| `dashboard-test-system-label` | Dashboard (1) | Existing label, never documented. |

Also added to `RETIRED_TERMS` (Part 1's zero-tolerance scan): **`Probate
Guardian`**, citing Milestone 62. The guide's prose was already clean (zero
hits) when checked; this ratchets it against a future regression. Recorded
in-file, and worth repeating here: this scan is text-only and **cannot**
catch the same string sitting in a screenshot's pixels — Finding 9 is the
part of this problem no automated gate in this repository can ever detect,
which is exactly why it needed a human looking at the images.

`TEST-INDEX.md` rows for `user-guide-drift-guard.spec.js` and
`guide-screenshots.capture.ts` updated in the same commit as the code
changes that made them stale (the new registry entries; the two new capture
tests and the nine-file expected inventory), per `AGENTS.md` §7.

---

## Judgment calls made without stopping to ask

Recorded here per this task's "no user is watching this run" instruction,
so they're visible on review:

1. **Finding 9's scope was bounded on first pass, then completed the same
   day as an authorized follow-up.** The original run fixed what came free
   and named/recommended the rest rather than rushing an 11 MB file,
   matching this repo's 63A→63F precedent. The follow-up that completed it
   ran as its own dedicated pass (full 56G-method triage of all 83 images,
   twelve new capture tests, four real test-tooling bugs found and fixed
   along the way — see Finding 9's own "Completed as a dedicated follow-up"
   section for the full account) rather than folding the work silently into
   this same document's earlier narrative.
2. **The "no recipients" attestation's full explanation lives on D-5 only**,
   with Annual Part X and Simplified Part VI cross-referencing it, rather
   than repeating the same three sentences three times. Matches this guide's
   existing pattern elsewhere (e.g., "See Dark mode" cross-references) and
   keeps the file from growing prose it doesn't need.
3. **§ 744.362(1) is cited alongside "Indicate if Ward is:"** the same way
   D-3's safe-deposit-box question already cites "(FS 744.365(4))" in this
   guide — for consistency of house style, not because the citation was
   otherwise in doubt (it's the app's own printed certify sentence, per
   `da908f6`).
4. **C-2's Excel-merge caveat was included** even though it's a fairly deep
   technical nuance, because it is genuinely filer-relevant (a guardian who
   exports to Excel and later re-imports would see their claimant and
   attorney names merged with no warning otherwise) and the app's own
   decision record (`7e5d8b3`) treats it as worth stating plainly rather than
   hiding.
5. **Screenshots were re-extracted from the committed file and re-viewed
   after splicing**, not just trusted from the `.guide-shots/` intermediate
   output — the same "verify the exported artifact" discipline `AGENTS.md`
   §5/§10 requires for court output, applied here to the guide's own images.
6. **Guardian Inventory's schedule rows were transcribed from the stale
   figures' own old content**, not re-invented, so this pass changes only
   branding. Simplified/Annual Accounting's Part II amounts and similar
   fields instead used the shared e2e-suite fixture defaults
   (`MINIMAL_VALID_*` / `fillMinimalValidPlan*Ward()`) rather than
   hand-authoring matching numbers for every field on every figure — still
   realistic and correctly branded, chosen for time, not because the
   distinction didn't matter.
7. **The guided-tour figure's alt-text mismatch (predates "the filing
   progress card," a step that no longer exists under that name) was left
   as a recorded gap, not fixed.** Renaming a tour step or rewriting the
   guide's alt text is a content decision outside a branding-only pass;
   Finding 9's own section names it explicitly rather than silently
   reshooting a step that happens to match old prose or silently leaving
   the mismatch undocumented.
8. **The sidebar TOTAL VALUE/NET ASSETS widget's $0.00 reading in several
   figures was left as-is rather than chased down**, once confirmed (a) the
   page's own schedule totals are correct where it matters
   (`inventory-summary.jpg`), and (b) the original stale figure showed the
   same $0.00 — so this is a pre-existing capture-technique quirk, not a
   regression this pass introduced, and not this pass's job to fix.
9. **The "sidebar save controls, Manage Shared Records, guided tour,
   Activity Log, dark mode" capture was split into two separate tests**
   once the help-panel-driven captures turned out to need `/dashboard`
   specifically — the one context this exact `#help-toggle-btn` →
   `#help-panel` sequence was already proven reliable in (this file's own
   pre-existing dashboard capture test). Splitting isolates the two so a
   future failure in one doesn't block the other's screenshots.
10. **The workspace-overview figure and the Guardian Inventory cover figure
    share one capture** (`inventory-cover.jpg`, spliced into both image
    slots) rather than two near-identical shoots, since they show the same
    screen.

---

## Final regression and push

| Gate | Result |
| :-- | :-- |
| `npx vitest run tests/unit/user-guide-drift-guard.spec.js tests/unit/test-index-guard.spec.js` | **27/27 passed**, both files green. First invocation this session was clean (no flake). |
| Guide image count | 83 `<img src=` tags before and after — no image added or removed, only five payloads replaced in place. |
| Guide text scan | Zero remaining occurrences of "Probate Guardian" (unchanged — was already zero); zero occurrences of any of the six `RETIRED_TERMS` strings. |
| `help/index.html` size | 11,416,895 → 11,348,129 bytes (**-68,766 bytes, ≈ -67 KB**) — the five replacement JPEGs compress slightly better than what they replaced; the text additions are a rounding error against 11 MB of embedded images. |
| Full regression (`npm test`) | **Not run.** Per `AGENTS.md` §2, documentation-only changes skip the full suite; the two test-file changes here (registry entries, two new capture tests) are exercised directly by the commands above, and neither touches `src/core/types/`, `src/core/persistence/`, `src/core/navigation/`, or a `tests/e2e/support/*.ts` file, so `check:types` is not in scope either. |
| `npm run capture:guide` | Run in full once (all 7 pre-existing captures + 2 new ones); the two new tests failed on their first attempt (a selector collision with 63A/63F's jump-to-field buttons, which share `data-field-path` with the real inputs — fixed by scoping to `input[...]`/`select[...]`), passed clean on retry. |

**Not run, and why:** `npm test` / `npm run test:verify` (full regression) —
this is a documentation and test-registry change with no `src/` behavior
touched; per `AGENTS.md` §2 these need explicit go-ahead and are not run
unprompted. If a reviewer wants one, the specific reason to ask for it here
would be to double-check the two new Playwright capture tests don't collide
with anything in the full e2e suite — they are capture-only tooling
(`playwright.capture.config.ts`), not part of `npm test`'s target list, so
the risk is low but not zero.

**Pushed to `origin/master`** after this document's own commit (see commit
log for the exact SHAs of each incremental change).

---

## Finding 9 completion — final regression and push (2026-09-22, same day)

The table above is the original Milestone 66 landing's own verification
record and is left as it was written. This section is the separate
verification for the Finding 9 completion follow-up authorized the same
day.

| Gate | Result |
| :-- | :-- |
| `npx vitest run tests/unit/user-guide-drift-guard.spec.js tests/unit/test-index-guard.spec.js` | **27/27 passed**, both files green. |
| Images visually triaged | **All 83**, individually opened and looked at (56G method) — not the 7 this milestone's first pass had reached. 56 confirmed stale, re-shot; 27 confirmed already correct, untouched. |
| Guide image count | 83 `<img src=` tags before and after splicing — no image added or removed, 56 payloads replaced in place. |
| Guide text scan | Unchanged from the original landing: zero occurrences of "Probate Guardian" or any `RETIRED_TERMS` string (this scan was already known insufficient for this finding — it cannot see inside a JPEG). |
| `help/index.html` size | 11,348,129 → 10,089,169 bytes (**-1,258,960 bytes, ≈ -1.20 MB**) — the 56 replacement JPEGs (1280x800, q82, most 90-140 KB) collectively compress smaller than the 56 stale ones they replaced. |
| `tests/capture/guide-screenshots.capture.ts` | Grew from 9 to 17 test cases (55 new figures; the 56th, the workspace-overview figure, reuses the Guardian Inventory cover capture). Full `npm run capture:guide` run clean (17/17 passed, exact 64-file output inventory) after fixing the four test-tooling bugs Finding 9's own section describes; two earlier full runs during development caught those bugs (10 and 2 failures respectively) before the clean run. |
| `TEST-INDEX.md` | `guide-screenshots.capture.ts` row updated in the same commit as the test-file change, per `AGENTS.md` §7. |
| Full regression (`npm test`) | **Not run.** Same reasoning as the original landing: a documentation and capture-tooling change, touching none of `src/core/types/`, `src/core/persistence/`, `src/core/navigation/`, or `tests/e2e/support/*.ts`, so `check:types` is not in scope either. |

**Pushed to `origin/master`** after this section's own commit(s) (see commit
log for exact SHAs).
