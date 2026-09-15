# Milestone 50: Findings from a Live Application Walkthrough — Proposal Index

## Status

**Draft — not an authorization to implement anything below.** Per
`AGENTS.md` §2, this is a proposal only; nothing here should be started
until Alan explicitly approves a specific sub-delivery by name.

**Verification pass completed 2026-09-14** (see "Verification pass" below).
Every item was checked against current `master` source and, where the claim
needed runtime evidence, against the running app. Each item now carries a
**Verified** block (what is actually true) and a **Corrective plan** (what
to do about it). Two items did not reproduce and are recommended for
closure; one is much larger than originally scoped; one was partly fixed
already. The Draft gate above still applies to every corrective plan.

## Source and an important caveat on confidence

Every item below was observed during a manual, page-by-page walkthrough of
every form and feature in the deployed build (`probate-guardian-web-build.zip`,
current as of this session), conducted while producing the end-user help
guide — clicking through all nine filing types, the dashboard, signatures,
annotations, and shared-record flows with a browser automation tool. **This
was black-box UI testing, not a source-code review.** I did not read the
application's actual source tree in this session; the only source-level
evidence I have is a handful of incidental reads of minified production
JS bundles (cited where relevant) and cross-references against
`MILESTONE-42-PROPOSAL.md`, which Alan supplied as a style example and
which happens to document this same codebase's real file layout in detail.

Where I name a file below, I am either quoting something I directly read
in a bundle, or inferring a plausible location from `MILESTONE-42-PROPOSAL.md`'s
own file inventory and from `AGENTS.md`'s architecture description — every
such inference is flagged **(inferred, verify)**. Please have Claude Code
confirm root cause against the actual source before scoping any fix; several
of these may turn out to be the same underlying issue, already-fixed, or
testing artifacts rather than real defects, and I'd rather flag that
honestly than overstate certainty the way `AGENTS.md`'s own confidence
conventions ask for.

None of these were reproduced with a controlled regression harness — each
is a single observation (or, where noted, two). Treat "reproduced" below as
"observed once, following the steps given," not "confirmed reliably
reproducible."

## How this index is organized

Each sub-delivery states a **Category**, my **Confidence** that it's a real,
current defect (not a testing artifact or already-fixed), what was
**Observed**, a **Suspected area** (file/function, flagged inferred where
applicable), **Steps** structured as investigate → decide → fix → guard
(matching `MILESTONE-42-PROPOSAL.md`'s pattern for genuinely-unknown-root-cause
items), **Verification**, and **Cross-cutting notes** per `AGENTS.md` §8
where an axis is actually implicated — marked N/A elsewhere rather than
left silent.

| Sub-delivery | Category | Verdict after the 2026-09-14 verification pass |
| --- | --- | --- |
| 50A — Attorney name duplicated on Plan-to-Plan carryover | Data correctness | **Not reproduced.** Stored value is correct and singular. Recommend closure (optional cheap guard). |
| 50B — Simplified Accounting eligibility "Load Ward Info From" not populating | Data correctness → **rendering** | **Confirmed, root cause found.** The carry works; the page never re-renders, so the Cover looks blank. Small fix. |
| 50C — City/State/Zip normalization regression risk | Data correctness / regression | **Not reproduced as described.** Nothing folds text into a ZIP field. A separate, narrower tolerance gap exists — needs a decision, not a fix. |
| 50D — Highlight annotation renders solid black | Visual rendering | **Confirmed, root cause found — and not in the file suspected.** A CSS gap, and the black is the *selection outline*, not the highlight. Severity depends on one unanswered check. |
| 50E — Annual Plan benefits schedule rows render oversized | Visual / layout | **Confirmed, measured, and NOT covered by Milestone 40I.** Needs a layout decision. |
| 50F — Typed-signature preview clips long names | Output accuracy | **Confirmed, and escalated.** The clipping is baked into the stored stamp PNG, so it reaches the filed PDF. Not preview-only. |
| 50G — Native `window.confirm()` dialogs break app-modal consistency | Consistency / robustness | **Confirmed but far larger than scoped:** 87 native-dialog sites, not 2. Needs a scoping decision before any work. |
| 50H — County & Active-Filing combobox interaction pattern | Accessibility | **Split.** County combobox has a real keyboard gap. The "plain click" claim is an automation artifact. The Active Filing half is already fixed. |
| 50I — Manage Shared Records: Save Controls accordion never auto-collapses | UI/UX Consistency | **Root cause correct; framing too narrow.** Affects all four `SPECIAL_PAGES`, and the symptom is session-path dependent. |

---

## Verification pass (2026-09-14)

**Method.** Every claim was checked two ways where possible: read against
current `master` source (not against either uploaded zip), and exercised in
the running app through temporary Playwright probes that measured real
values — stored field values after a carryover, computed SVG fill colours,
rendered row heights, canvas pixel coverage at the image edges, and the
collapsed state of the sidebar accordion on each route. The probes were
throwaway and are not in the tree; the specific numbers they produced are
quoted in each item's **Verified** block so the next person does not have
to re-derive them.

**What changed as a result.** Two findings (50A, 50C) did not reproduce and
should be closed rather than fixed. Two (50D, 50F) reproduced but with a
different root cause or a materially different severity than the
walkthrough could see from the outside. One (50G) is an order of magnitude
larger than its write-up implies. One (50H) is half already-fixed. The
remaining three (50B, 50E, 50I) are real and actionable close to as
described.

**Sequencing and file-overlap note (`AGENTS.md` §1, multi-agent).**
Three sub-deliveries touch `src/legacy-app.js` in different regions —
50B (`doConfirmSimplifiedEligibility`, ~4593-4640), 50H
(`countyAutocompleteHTML`/`filterCityDropdown`, ~1563-1600), and 50I
(`updateSidebar`, ~4905-4915). They are independent in content but should
be **sequenced, not parallelised across agents**, to avoid conflicting
edits to one large classic-script file. The other items are file-isolated:
50D is `src/styles/print.css` only, 50F is
`src/core/signature/signature-pad.js` only, 50E is
`src/features/plan-annual/index.js` plus one stylesheet.

**Suggested order, by value against effort:**

1. **50B** and **50I** — small, self-contained, and both fix something a
   filer sees immediately.
2. **50F** — small, and it is the only item confirmed to affect a filed
   court document.
3. **50D** — small (CSS only), but answer its Step 1 first; severity is
   unknown until then.
4. **50E**, **50H** — real, but each needs a design decision made first.
5. **50G** — do not start until its scope question is answered.
6. **50A**, **50C** — close with tests only, no production code change.

---

## 50A — Attorney Name Duplicated on Plan-to-Plan Carryover

**Category:** Data correctness. **Confidence:** Medium-High.

### Observed

Using "Create New Form for Existing Ward" (dashboard toolbar, per
`AGENTS.md`'s vocabulary this is the "New Filing from Existing" carryover
flow) to start an **Annual Guardianship Plan** from an existing **Initial
Guardianship Plan**, the attorney name field on the new form's cover/signature
area showed the attorney's name duplicated — appearing twice rather than
once. I did not capture whether the underlying stored value was actually
doubled (e.g. `"Daniel R. Okafor, Esq.Daniel R. Okafor, Esq."`) or whether
this was a display-only rendering issue (e.g. the field's value concatenated
with a label that itself repeats the name). That distinction matters a lot
for severity and needs to be resolved first.

### Suspected area (inferred, verify)

`MILESTONE-42-PROPOSAL.md` §42E (Tranche 4) names
`src/core/navigation/ward-lifecycle.js` as the live home of
`carryOverFieldsForPlan()` and `carryOverFieldsForAccounting()`, and notes
Milestone 40H-J recently touched nested attorney-object carryover in that
same function. That recency makes it a strong first place to look — this
may be a related or reopened edge of that same fix, not a fresh bug.

### Steps

1. **Reproduce deliberately with instrumented data.** Create an Initial
   Guardianship Plan with a distinctive, single-occurrence attorney name;
   use "Create New Form for Existing Ward" → Annual Guardianship Plan;
   inspect both the rendered field and the underlying stored value (e.g. via
   the app's own data inspection, or `window.D`/`getD()` per the app's
   bridge pattern) before assuming which layer is wrong.
2. **Decision branch, resolved by what's found, not pre-decided here:**
   - If the *stored* value is duplicated: this is a data-correctness bug in
     the carryover field-mapping logic (likely a concatenation instead of
     an assignment, or the carryover function running twice against the
     same target). Fix at the source; check whether any already-saved `.sav`
     files could have already picked up a duplicated value and whether a
     migration note is needed per `AGENTS.md` §8's Legacy Data Migration
     axis.
   - If only the *display* is duplicated (e.g. a template or label rendering
     the same bound field twice): fix the rendering, no data-model or
     migration concern.
3. **Fix** per the branch above, scoped to the mapping/render logic
   specifically implicated — this should not require touching the rest of
   `carryOverFieldsForPlan()`'s other field mappings, which appeared correct
   in this walkthrough.
4. **Regression guard.** Add or extend an e2e/unit spec exercising this
   exact carryover path (Initial Plan → Annual Plan via "New Filing from
   Existing") asserting the attorney name field's value equals the source
   filing's value exactly once, not a duplicate or concatenation. If a
   carryover-workflow spec already exists (per §42D's "Verification"
   section referencing `carryover-workflow.spec.ts`), extend it there rather
   than starting a new file.

### Verification

Targeted spec above, green. If the carryover function is shared across
other Plan-type source/target pairs (Plan Minor → Annual, Plan Simplified →
Annual, etc.), spot-check at least one more pair to confirm this isn't
broader than the one path observed.

### Cross-cutting notes (`AGENTS.md` §8)

**Data Model:** only implicated if the stored value (not just the display)
is duplicated — confirm before assuming a `probate-guardian-data-model.csv`
change is needed; a display bug needs none. **Legacy Data Migration:** same
conditional — if stored duplication is confirmed, existing `.sav` files
created via this carryover path may already carry the bad value; decide
whether to detect-and-clean on load or leave existing files alone (state
the choice explicitly, per §8). **Legal/Compliance:** an attorney name field
that renders wrong on a document intended for court filing is exactly the
kind of accuracy issue `AGENTS.md`'s opening line calls out — worth treating
this at higher priority than its cosmetic-seeming symptom suggests until the
stored-vs-display question is answered.

### Verified 2026-09-14 — NOT REPRODUCED

The stored-vs-display question above is answered: **neither is duplicated.**

- `carryOverFieldsForPlan()`'s `planAnnual` branch
  (`src/core/navigation/ward-lifecycle.js:153-177`) performs a single
  assignment, `attorney: attyName`. There is no concatenation and no second
  write to the same key. The `attyName` chain itself
  (`:96`) resolves to exactly one source field.
- Exercised live: an Initial Guardianship Plan with attorney
  `"Zensiqua Okaforsson"`, converted via the real
  `convertExistingWard(srcId, 'planAnnual')` entry point. Result:
  `carryOverFields(src,'planAnnual').attorney === "Zensiqua Okaforsson"`,
  the converted filing's stored `D.attorney` is that string exactly once,
  and exactly one rendered input on the Cover carries it.

**Most likely explanation for the observation.** The Annual Plan binds the
same `attorney` field in three places by design — the Cover
(`src/features/plan-annual/index.js:225`), the Attorney Certification card
(`:631`), and the Summary list (`:171`). They are on different routes, so
no single page shows it twice, but moving between Cover and Certification
during a walkthrough shows the same name in what looks like two "Attorney
Name" fields. Plan Initial has the genuinely-two-field version of this:
`carryOverFieldsForPlan()` writes both `attorneyName` (Cover) and
`attorney_name` (Attorney card) with the same value (`:112-113`), because
that form really does collect it in two places.

### Corrective plan — close, no production change

1. **Close 50A.** No defect exists in the carryover mapping. Record the
   finding rather than deleting the item, so the same walkthrough
   observation doesn't get re-filed later.
2. **Optional, cheap:** extend `tests/e2e/carryover-workflow.spec.ts` with
   one assertion on the Initial Plan → Annual Plan path that
   `D.attorney` equals the source's attorney name exactly (not a
   concatenation). Costs a few lines, permanently pins the thing that was
   suspected. No new spec file, so no `TEST-INDEX.md` change.
3. **Do not** "fix" the two-field Plan Initial shape as part of this — that
   is the form's real structure, not a bug, and changing it is a form-design
   decision for Alan, not a defect repair.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A — confirmed no stored
duplication, so no `probate-guardian-data-model.csv` row is implicated.
Legacy Data Migration N/A — no `.sav` file can carry a doubled value from
this path. Legal/Compliance: the escalation condition stated above (a wrong
attorney name reaching a filed document) is not met.

---

## 50B — Simplified Accounting Eligibility "Load Ward Info From" Not Populating

**Category:** Data correctness. **Confidence:** Low-Medium — I flagged this
as "questionable" during the walkthrough itself, meaning I wasn't fully
confident in the observation even at the time.

### Observed

In the Simplified Accounting eligibility dialog, using the **Load Ward Info
From** picker to select an existing ward did not appear to carry that
ward's information into the new form's cover fields — the cover page
appeared to load with fields still blank after confirming eligibility and
selecting a source ward. I did not rule out timing (the picker may need an
explicit confirm step I missed) or that I was looking at the wrong filing
instance afterward.

### Suspected area (inferred, verify)

Same family as 50A — likely `carrySourcesFor()`/`carryWardsFor()` in
`src/core/navigation/ward-lifecycle.js` per `MILESTONE-42-PROPOSAL.md` §42E
Tranche 4, or a separate code path specific to the eligibility-dialog
picker rather than the dashboard's "New Filing from Existing" flow — worth
checking whether these are actually the same underlying function or two
independently-maintained carryover implementations, since if they're
separate, that's itself worth flagging as a duplication risk similar to
what `MILESTONE-42-PROPOSAL.md` §42D found for the three form-write paths.

### Steps

1. **Re-test deliberately before assuming a defect exists.** Create a ward
   with fully populated cover-page fields (name, case number, county,
   guardian, attorney). Start a new Simplified Accounting filing, trigger
   the eligibility dialog, use "Load Ward Info From" to select that ward,
   confirm, and check the resulting cover page immediately and after a
   reload. If fields populate correctly, this finding is unconfirmed/stale
   and can be closed with no code change — say so plainly rather than
   forcing a fix onto a non-reproducing report.
2. **If it reproduces:** trace whether the eligibility dialog's picker calls
   the same carryover function the dashboard's "New Filing from Existing"
   uses, or a separate implementation. Fix whichever is actually broken;
   if two implementations exist and diverge, consider unifying them (small
   version of the pattern `MILESTONE-42-PROPOSAL.md` §42D applied to the
   three form-write tails) rather than patching one in isolation.
3. **Regression guard**, only once reproduced and understood: an e2e spec
   covering the eligibility-dialog "Load Ward Info From" path specifically,
   since the existing carryover-workflow coverage (referenced in §50A) may
   only exercise the dashboard flow.

### Verification

Either a clean re-test closing this as not-reproducing, or a green targeted
spec confirming the fix.

### Cross-cutting notes

Same as 50A's Data Model / Legacy Data Migration conditionals, contingent
on confirming a real defect first. Export/Import/Portability: N/A unless
the fix touches the shared carryover function used elsewhere.

### Verified 2026-09-14 — CONFIRMED, and it is a rendering bug, not a carryover bug

The carryover itself works perfectly. What fails is the screen.

Exercised live: an Annual Accounting source with
`caseNumber = "24-000123-GD"` and county Pinellas, then the Simplified
eligibility modal with that filing chosen in **Load Ward Info From**.
Immediately after confirming:

- stored `D.caseNumber` === `"24-000123-GD"` ✅ (the carry ran)
- stored `D.county` === `"Pinellas"` ✅
- the rendered Cover input `[data-form-path="caseNumber"]` === `""` ❌

**Root cause (confirmed, not inferred).**
`doConfirmSimplifiedEligibility()` (`src/legacy-app.js:4593-4640`) mutates
`window.D` *after* the page has already been rendered, and never re-renders:

- `await addWard(name,'simplified')` →
  `addWard()` (`src/core/navigation/ward-lifecycle.js:432-442`) calls
  `activateWard()` then `navigate('/')`, which renders the Cover from the
  filing's **blank** state.
- `Object.assign(window.D, carryOverFields(src,'simplified'))` (`:4601`)
  then mutates that same object — but nothing repaints.
- Compare the equivalent tail in `doAddWard()` (`src/legacy-app.js:4506-4517`):
  after its own `Object.assign(...)` it calls `await saveWardToState(ward)`,
  **`renderPage('/')` and `updateSidebar()`**. Those two calls are exactly
  what the eligibility path is missing.

The same gap exists in the non-qualifying branch (`:4614-4628`), which
redirects to a standard Annual Accounting.

**Worse than the original report.** The carry note alert
(`carryOverSummaryNote()`, `:4572-4582`) still fires, so the filer is told
*"Details were carried over from the selected Annual Accounting. County
(Pinellas) was restored from this ward's record."* while looking at blank
fields — the app actively contradicts the screen. The data is intact and
appears as soon as the filer navigates away and back, which is very likely
why the walkthrough could not decide whether it had really failed.

### Corrective plan

1. **Fix, narrow (recommended).** In `doConfirmSimplifiedEligibility()`,
   add the same render tail `doAddWard()` already uses, in **both**
   branches, immediately after the existing `saveWardToState(...)` and
   **before** the `alert(...)` — so the filer dismisses the carry-over
   notice onto a populated Cover rather than a blank one:

   ```js
   await saveWardToState(window.D);
   renderPage('/');
   updateSidebar();
   if(carryNote)alert(carryNote);
   ```

   Note the non-qualifying branch currently calls `saveWardToState` *inside*
   its `if(src)` block (`:4625`) while the qualifying branch calls it
   outside (`:4611`) — do not "tidy" that difference while fixing; it is
   out of scope and the two branches create different filing types.

2. **Alternative, deeper — flagged, not recommended now.** Have `addWard()`
   accept an optional carry payload so the carry is applied *before* the
   first render, removing the whole class of "mutate after render" from
   every caller. That touches three call sites and `ward-lifecycle.js`'s
   public signature; it is a better end state but a materially larger change
   than the defect warrants. Raise separately if the pattern recurs.

3. **Regression guard.** Extend `tests/e2e/carryover-workflow.spec.ts` —
   which already covers the eligibility modal and its Annual redirect — with
   an assertion on the **rendered input value**, not just `window.D`:

   ```ts
   await expect(page.locator('[data-form-path="caseNumber"]')).toHaveValue('24-000123-GD');
   ```

   This is the assertion that matters: a `window.D`-only check passes today
   against the broken build, which is exactly how this shipped. Cover both
   branches (qualifying → Simplified, non-qualifying → Annual). No new spec
   file, so no `TEST-INDEX.md` change.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A — no persisted shape
changes; the stored values were always correct. Legacy Data Migration N/A —
no `.sav` file holds bad data from this path (a filer who navigated away and
back got correct values; one who didn't may have re-typed over correct data,
which is indistinguishable from ordinary editing and not worth detecting).
Export/Import N/A. UI/UX Consistency: the fix reuses `doAddWard()`'s
existing render tail rather than introducing a new refresh mechanism.

---

## 50C — City/State/Zip Normalization Regression Risk

**Category:** Data correctness / regression. **Confidence:** Medium.

### Observed

During this session, entering certain address strings caused city/state
into the ZIP field incorrectly on blur — e.g. a city/state pair typed as
`"St.Petersburg,FL33704"` and a city string `"MAlvern"` were each folded
into the ZIP field rather than parsed correctly. Alan separately confirmed
this exact bug class had already been fixed roughly a week prior, and
raised the same question I'd raise: how a previously-fixed bug reappeared
in what was represented as the current build. Two explanations are equally
plausible and neither is confirmed: (a) a genuine regression (the fix was
reverted or never fully merged to `master`), or (b) the build tested was
stale relative to the fix (the uploaded zip predated it). Given Alan later
supplied a fresh build specifically because an earlier zip "was a stale dev
copy," (b) is plausible — but that makes it more, not less, important to
confirm the fix is actually present in current `master` rather than assume
either way.

### Suspected area

`MILESTONE-42-PROPOSAL.md` §42E (Tranche 5) directly names
`formatCityStateZip()` in `src/core/form/form-contract.js` as a real,
current function in this codebase — a strong, non-inferred candidate for
where this normalization logic lives (or where its dead legacy twin was,
per that tranche; confirm which copy is now the live one before editing).

### Steps

1. **Confirm presence and correctness directly against current `master`,
   not against either zip I tested.** Read `formatCityStateZip()` (or
   wherever the actual city/state/zip blur-normalization logic lives) and
   trace what it does with an input containing no separating space before
   the state code, and with a lone city string with no comma/state/zip at
   all.
2. **Reproduce with a minimal unit test first**, independent of any UI
   walkthrough: call the normalization function directly with `"St.Petersburg,FL33704"`
   and `"MAlvern"` as inputs (or whatever field(s) these values actually
   landed in — re-derive the exact field boundaries and expected split from
   the UI, since I did not capture which literal field each string was
   typed into). If the unit-level call already produces the wrong result on
   current `master`, this is a confirmed live regression, not a stale-build
   artifact.
3. **Fix and guard.** If confirmed broken: fix the parsing logic (likely a
   missing space/format-tolerance case in whatever splits city from state
   from zip), and add the two exact failing inputs above as permanent unit
   test cases in whatever spec already covers this function (or a new one,
   added to `TEST-INDEX.md` per `AGENTS.md` §7) — this is exactly the kind
   of "we said we'd fixed X" claim `MILESTONE-42-PROPOSAL.md`'s own closing
   note warns should be checked against reality, not assumed, given it's
   apparently already recurred once.
4. **If not confirmed broken** on current `master`: close this as a
   stale-build artifact, but still add the two inputs as regression test
   cases anyway, since a fix with no permanent test coverage is exactly how
   this could have silently regressed (or appeared to) in the first place.

### Verification

New/extended unit spec passing with both literal inputs above as permanent
cases.

### Cross-cutting notes

**Test Coverage & Index:** this is the core deliverable here — a
previously-fixed bug with no apparent regression guard is a testing-index
gap on its own, independent of whether the code itself is currently broken.
**Legal/Compliance placeholder — see the verified block below.** An address that ends up wrong on a filed document
(guardian or ward residence, in particular) is a real-world accuracy
concern for court paperwork, not merely cosmetic.

### Verified 2026-09-14 — NOT REPRODUCED as described

Step 1 and Step 2 above were both run against current `master`.

`formatCityStateZip()` (`src/core/form/form-contract.js:137-160`), called
directly with the two literal inputs from the report:

| Input | Output |
| --- | --- |
| `"St.Petersburg,FL33704"` | `"St.Petersburg,FL33704"` (unchanged) |
| `"MAlvern"` | `"MAlvern"` (unchanged) |
| `"st. petersburg, fl 33704"` | `"St. Petersburg, FL 33704"` ✅ correct |

Driven through the real UI on a Plan Minor Cover — the only form in the app
with genuinely separate City / State / **Zip** boxes (`q1City` / `q1State` /
`q1Zip`, `src/features/plan-minor/index.js:208-210`) — typing the first
literal into City and blurring left `q1City` holding it, `q1State` empty,
and `q1Zip` untouched. **Nothing folds city or state text into a ZIP field.**
No code path in `src/` moves a value between those fields;
`applyZipLimit()` (`src/legacy-app.js:1665-1675`) only deletes digits beyond
nine from the field it is given, and neither literal has nine digits.

**What is actually true — a different, narrower gap.**
`formatCityStateZip()` declines to normalise two input shapes:

- **No separator before the state code** (`",FL33704"`): the per-word regex
  `^([a-zA-Z]+)([^a-zA-Z]*)$` (`:143`) cannot match a token with interior
  letters, so the whole token is returned verbatim.
- **Interior capitals** (`"MAlvern"`): the title-casing branch is guarded by
  `/^[a-z]+$/.test(alpha)` (`:154`), so anything already containing an
  uppercase letter mid-word is left alone.

That second guard is almost certainly **deliberate and load-bearing** — it
is what stops the formatter from destroying legitimately mixed-case Florida
names like `McKinney`, `DeLand`, `DeBary` and `O'Brien`. Any "fix" that
title-cases `MAlvern` → `Malvern` would also rewrite `McKinney` → `Mckinney`
on a court document. That is a worse failure than leaving a typo as typed.

**On the "previously fixed, now regressed" question:** there is no evidence
of a regression. The correct-format case normalises correctly, and the two
reported literals are inputs the formatter has no rule for, not inputs a
rule mishandles. Explanation (b) from the original write-up — a stale build,
or a misremembered field — is the better fit.

### Corrective plan — close, with tests and one decision

1. **Close 50C as not-reproducing.** Say so plainly in the record; do not
   force a fix onto a non-reproducing report.
2. **Still add the regression cases** (the original Step 4's reasoning is
   right, and is the one durable deliverable here). Extend
   `tests/unit/form-contract.spec.js`, which already owns
   `formatCityStateZip()` coverage, pinning **current** behaviour:
   both literals pass through unchanged, `"st. petersburg, fl 33704"`
   normalises correctly, and — the important one —
   `"mckinney"`/`"McKinney"` are **not** flattened. That last case
   documents *why* the interior-capital guard exists, so a future
   well-meaning "fix" for `MAlvern` fails the suite instead of shipping.
   No new spec file, so no `TEST-INDEX.md` change.
3. **One decision for Alan, not to be made unilaterally:** should a
   malformed combined entry like `"St.Petersburg,FL33704"` be *repaired*
   silently, *flagged* to the filer, or *left as typed*?
   - **Recommended: left as typed, and surfaced by validation if at all.**
     Silent repair of address text on a court document is the riskier
     direction, and the app's own convention (`AGENTS.md` §3's
     non-destructive principle) favours not rewriting what a filer entered.
   - If flagging is wanted, that is a readiness-panel item, not a formatter
     change, and must respect the §4 parity invariant (every `auto`
     readiness item maps 1-to-1 to an export validation error) — so it would
     be `manual`/advisory, not a blocker.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A. Test Coverage & Index:
this is the whole deliverable — item 2 above. Legal/Compliance: the accuracy
concern quoted above is real but is not caused by the reported mechanism;
whether an un-normalised address is acceptable on a filing is the decision
in item 3, flagged for Alan rather than resolved here.

---

## 50D — Highlight Annotation Renders Solid Black

**Category:** Visual rendering, on court-facing PDF output. **Confidence:**
Medium.

### Observed

Using the PDF annotation toolbar's Highlight tool (in Print Preview /
output review), marks made with the Highlight tool rendered as solid black
rather than a translucent color as expected of a highlight. This appeared
inconsistent across attempts — I did not get a clean, repeatable minimal
reproduction, so "unreliable" is the most honest characterization rather
than a fixed rule like "always renders black."

### Suspected area

`MILESTONE-42-PROPOSAL.md` §42B (Step B2) directly confirms
`src/core/pdf/pdf-annotate.js` as the real, current file implementing PDF
annotation event handling in this codebase (it's where that proposal found
the `onAbort` false-positive). The highlight tool's fill-color/opacity or
blend-mode handling is a reasonable first place to look in that same file
or its drawing/canvas layer.

### Steps

1. **Get a clean, minimal repro first** — this is the priority before any
   fix, since the behavior was inconsistent in my own testing. Try the
   Highlight tool against a freshly opened Print Preview, in isolation from
   any other annotation type, and note whether it's consistently black,
   intermittently black, or dependent on some other state (e.g. annotating
   over an already-annotated area, browser zoom level, or which PDF page).
2. **Once reproduced:** read the highlight tool's drawing code for its
   fill-color and alpha/opacity handling — a common bug shape here is an
   opacity value being dropped or overwritten (e.g. a hex color set without
   its alpha channel, or a canvas `globalAlpha` reset between draw calls).
   Compare directly against another annotation type (e.g. underline or a
   colored box, if present) that is rendering correctly, to isolate what's
   different about the highlight tool's own code path specifically.
3. **Fix and guard** with a rendered-output check if the test suite has a
   pattern for asserting canvas/PDF pixel or color output (check for an
   existing visual-regression pattern before inventing one); otherwise, a
   unit test asserting the highlight tool's constructed fill/style value is
   the intended translucent color is a reasonable minimum guard even
   without full pixel-level verification.

### Verification

Clean, repeatable manual confirmation that the Highlight tool now renders
translucent, plus whatever automated guard Step 3 lands on.

### Cross-cutting notes

**Legal/Compliance:** annotations here are being made on documents destined
for actual court filings or internal review of those filings — a highlight
that obscures the underlying text in solid black rather than tinting it is
a real functional defect for that use case, not just an aesthetic one.

### Verified 2026-09-14 — CONFIRMED, but the black is not the highlight

Reproduced cleanly (the intermittency is explained below). Driving the real
toolbar on a Plan Simplified Print Preview and making a genuine text
selection produces **two** sibling SVGs inside `.pdf-page`, both created by
pdf.js's `DrawLayer` and appended to the page wrapper:

| SVG | `fill` attribute | computed fill | computed `mix-blend-mode` |
| --- | --- | --- | --- |
| `class="highlight"` | `#FFFF98` | `rgb(255, 255, 152)` ✅ yellow | `normal` |
| `class="highlightOutline selected"` | *(none)* | **`rgb(0, 0, 0)`** ❌ | `normal` |

So the highlight shape itself is the correct yellow. The black is the
**selection outline** pdf.js draws *on top of* a currently-selected
highlight, which carries no `fill` attribute and therefore falls back to the
SVG default `fill: black`, fully opaque.

**This explains the reported intermittency exactly.** The black shape exists
only while that highlight is selected. Click elsewhere and it disappears,
leaving yellow — which is why the walkthrough could not pin down a rule and
honestly described it as "unreliable" rather than "always black".

**Root cause — a CSS gap, and not in the suspected file.**
`src/core/pdf/pdf-annotate.js` is correct: it passes pdf.js's own default
palette string (`:108-109`) and the editor reads the colour from it
(`HighlightEditor.initialize()` sets `fill` from
`uiManager.highlightColors`). The gap is in
**`src/styles/print.css:58-112`**, the deliberately scoped-down port of
`pdf_viewer.css`. That port carries the `.annotationEditorLayer`,
`.freeTextEditor` and `.highlightEditor` families, but **omits every
`svg.highlight` / `svg.highlightOutline` rule** — and those are precisely
where upstream sets `fill: none` on the outline and blends the highlight.
The port's own header comment lists what it deliberately excludes
(theming, forced-colors, the per-editor delete toolbar); the highlight SVG
rules are not on that list, so this is an oversight rather than a decision.

**Second, separate defect in the same gap.** The correct yellow shape
computes `mix-blend-mode: normal` with `fill-opacity: 1`. Upstream applies
`multiply`, which is what lets the text show *through* a highlight. As
shipped, even a correctly-coloured highlight paints an opaque block over the
words it is meant to mark. The walkthrough did not report this separately —
it was hidden behind the black outline — but it is the same fix and the same
functional concern this item's cross-cutting note raises.

### Corrective plan

1. **Answer this first — it sets the severity.** Determine whether the
   defect reaches the **saved** annotated PDF or only the on-screen preview.
   The saved bytes come from pdf.js's own serialisation
   (`session.saveAnnotatedBytes()` → `saveBtn` handler,
   `src/core/pdf/pdf-preview.js:160-166`), **not** from the DOM, so page CSS
   very likely does not affect it — meaning the exported document probably
   has a correct highlight and no outline at all. Verify by saving an
   annotated PDF with one highlight and opening it. If the export is clean,
   this is an alarming-looking preview bug, **not** a court-document defect,
   and the Legal/Compliance framing above should be corrected in the record.
2. **Fix: complete the port.** Add the missing highlight rules to
   `src/styles/print.css`, immediately after the existing
   `.annotationEditorLayer .highlightEditor` rule (`:112`). Take the exact
   declarations from upstream `node_modules/pdfjs-dist/web/pdf_viewer.css`
   (a devDependency, retained for exactly this purpose per
   `lib/VENDORED-LIBRARIES.md`) rather than inventing them — at minimum the
   `svg.highlight` fill-rule/blend rules and `svg.highlightOutline`'s
   `fill: none`. Scope them under `.pdf-page` to match the rest of the port,
   and extend the port's header comment to record that these were added and
   why (the comment is the file's own contract about what it deliberately
   omits, and leaving it stale would reintroduce the same class of gap).
3. **One UX decision, small:** with `fill: none` applied, a *selected*
   highlight has no visual selection affordance unless upstream's stroke
   rules are ported too. Either port them (matches pdf.js), or accept no
   selection cue (consistent with this toolbar already excluding pdf.js's
   per-editor delete UI). Recommend porting the stroke — it is the same
   copy-paste and selection state is otherwise invisible.
4. **Regression guard.** Extend the existing
   `tests/e2e/pdf-annotate.spec.ts` test *"Highlight mode creates a
   highlight editor from a real text selection"* (`:176-207`), which already
   builds a real selection, with computed-style assertions: the
   `svg.highlight` computed `fill` is the palette colour, and **no SVG
   inside `.pdf-page` computes an opaque black fill**. That second assertion
   is the one that fails today and is worded to catch any future
   missing-rule regression of the same shape, not just this one element.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A — annotations are stored
as opaque PDF bytes (`D.printAnnotations`), unaffected by page CSS. Legacy
Data Migration N/A. Export/Import: **this is the open question in Step 1** —
check the saved-PDF path explicitly rather than assuming CSS carries into
it. Legal/Compliance: contingent entirely on Step 1; if the export is clean,
downgrade this item's severity in the record rather than leaving the
stronger claim standing.

---

## 50E — Annual Guardianship Plan Benefits Schedule: Oversized Rows

**Category:** Visual / layout. **Confidence:** High that the visual effect
is reproducible; genuinely uncertain whether this needs new work or is
already covered — see the note below.

### Observed

On the Annual Guardianship Plan's benefits schedule page, entered rows
rendered with unusually tall vertical space relative to their actual
content — noticeably taller and more scroll-heavy than comparably-dense
row/card components elsewhere in the same form family (e.g. the asset
schedules in Annual Accounting).

### Important overlap to check before scoping any work

`MILESTONE-42-PROPOSAL.md` §42B's concurrency note and its Step B4 both
describe **Milestone 40I** as in-flight work specifically on a
`min-height`/label-alignment rule affecting multi-column schedule-card
layout, tracked by `schedule-card-layout.spec.ts:177` and touching
`src/styles/forms.css`. That is a strong enough match in symptom
(oversized/misaligned schedule rows) that this finding may simply be the
same defect 40I was already scoped to fix, observed from a different form.
**Before scoping any new work here, confirm whether Milestone 40I has
landed and whether its fix already resolves this specific page** — per
`AGENTS.md` §10, `src/styles/cards.css` is the authoritative home for
`.entry-card`/`.summary-box` sizing generally, so also check whether this
page's benefits rows use those standard classes or a bespoke layout that
40I's fix wouldn't have touched.

### Steps

1. **Check Milestone 40I's landing status and diff** against this specific
   page first. If 40I already fixes it, close this item with a note, no
   new work.
2. **If not already covered:** identify whether the benefits schedule rows
   use the standard `.entry-card` pattern (`cards.css`) or a separate,
   form-specific layout. If standard: the oversizing is likely a
   content-specific issue (e.g. an unusually tall field inside the card
   forcing `min-height` upward) rather than a systemic `cards.css` bug —
   scope narrowly to this page's specific fields. If bespoke: consider
   whether migrating to the standard card pattern is in scope here or a
   separate, larger decision (per `AGENTS.md` §9's Tier 2 card-template
   guidance) — flag rather than deciding unilaterally.
3. **Fix and verify visually** against at least one comparable, correctly-sized
   schedule page in the same form to confirm consistency, not just that the
   benefits page alone looks better in isolation.

### Verification

Visual check (side-by-side against a correctly-sized comparable schedule);
existing `schedule-card-layout.spec.ts` (or equivalent) remains green if
this page is in that spec's scope, or gets extended to cover it if not.

### Cross-cutting notes

**UI/UX Consistency:** this is exactly the axis `AGENTS.md` §8 asks a plan
to address — prefer the existing card pattern over a new one, and name
which pattern is actually being reused once Step 2 above is answered.

### Verified 2026-09-14 — CONFIRMED, measured, and NOT covered by Milestone 40I

**Step 1's overlap question is answered: no overlap.** Milestone 40I
**landed 2026-09-13** (`MILESTONE-ARCHIVE.md:13413`) and was a different
defect entirely — a single `min-height` rule *deletion* in `forms.css`
fixing multi-column card-row **label misalignment** (a hand-rolled field's
label sitting ~17px lower than its primitive-built row-mates). It does not
touch row height on this page and does not resolve this finding.

**Measured on the real page** (Annual Guardianship Plan → `/p4`,
*3G. Insurance & Benefits*):

- **156px per row**, uniformly, across all 12 rows
- **1909px total table height**
- the `.form-check` inside each cell measures exactly **44px**

**Root cause — arithmetic, not a stray rule.** `pagePlanABenefits()`
(`src/features/plan-annual/index.js:338-362`) renders a `<table
class="plan-benefits-table">` whose two answer columns are pinned narrow —
`<th class="text-center" style="width:7rem">` (`:353`) — and each cell holds
a `yesNoRadioHTML(...)` pair (`:345-346`). At 7rem the Yes and No options
cannot sit side by side, so they wrap to stacked; each is a `.form-check`
carrying `min-height:2.75rem` (44px) from `src/styles/forms.css:123`.
44 × 2, plus the legend and cell padding, is the observed 156px.

**The 44px is deliberate and must not be the thing that gets removed.**
`forms.css:121-122` states it outright: *"WCAG 2.5.5 wants at least a 44x44
tap target — a bare native checkbox is much smaller than that."* Shrinking
it to make rows shorter would trade a layout complaint for an accessibility
regression. The height is a symptom of the **column width**, not of the tap
target.

### Corrective plan

1. **Check the blast radius before scoping.** Grep for other
   `yesNoRadioHTML(...)` calls inside narrow fixed-width table cells —
   Plan Annual's ADLs and Rights pages (`PLAN_ADLS`/`PLAN_ADL_RATINGS`/
   `PLAN_RIGHTS`, same feature file) are built from the same primitives and
   may share the shape exactly. Fixing only the benefits page would leave
   siblings visibly inconsistent, which is the opposite of this item's own
   UI/UX Consistency axis. Decide scope from what that grep finds.
2. **Fix by letting the pair sit horizontally, not by shrinking the target.**
   Two candidate approaches, to be chosen against what Step 1 finds:
   - **Preferred:** make the radio pair explicitly horizontal within these
     cells — a scoped rule such that `.plan-benefits-table .form-check`
     siblings lay out in a nowrap row — and let the column size to its
     content instead of being pinned at `7rem`. Keeps `min-height:2.75rem`
     untouched, so the tap target survives.
   - **Alternative:** widen the two `width:7rem` columns to whatever the
     side-by-side pair actually needs (~10-11rem at the default font).
     Simpler, but a magic number that breaks again if the labels change.
   Either way the change is scoped to `.plan-benefits-table` (or a shared
   class if Step 1 finds siblings) — **not** to `.form-check` globally,
   which is used across every form in the app.
3. **Verify at real widths.** The app has a mobile/tablet breakpoint and
   container queries in the dashboard; check the fix at desktop (~1440px),
   tablet (~1024px) and phone (~390px). At the narrow end the stacked layout
   may be correct and should be allowed to stack — the goal is "not stacked
   when there is room", not "never stacked".
4. **Regression guard.** Extend `tests/e2e/schedule-card-layout.spec.ts`
   with a **paired** assertion on this page, both halves of which matter:
   - each benefits row renders below a sane height (e.g. ≤ 88px at desktop
     width), and
   - `.form-check` inside it still computes `min-height` ≥ 44px.

   The second assertion is what stops a future "fix" from hitting the target
   by deleting the accessibility rule. No new spec file, so no
   `TEST-INDEX.md` change — but update that spec's row text if its scope
   description no longer covers this page.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A — presentation only.
UI/UX Consistency: the reused pattern is `yesNoRadioHTML()` + `.form-check`
(`src/core/form/form-fields.js`, `src/styles/forms.css:123`); this item
changes only how that pattern is *laid out* inside one table, and invents no
new component. Accessibility: the 44px WCAG 2.5.5 tap target is explicitly
in scope to **preserve**, and pinned by the guard in step 4.

---

## 50F — Typed-Signature Preview Clips Long Names

**Category:** Visual / possible output accuracy. **Confidence:** High that
the on-screen preview clips; genuinely unconfirmed whether the exported
PDF signature stamp is also affected — this distinction matters a lot for
severity and should be resolved before scoping a fix.

### Observed

In the Signature Stamp control's "Type" tab, typing a sufficiently long
name caused the rendered preview text to clip/cut off at the container's
edge rather than shrinking to fit or wrapping to a second line.

### Steps

1. **First and most important: determine whether this is preview-only or
   also present in the applied stamp and the final exported PDF.** Apply a
   clipped-looking typed signature to a real field, then check the applied
   stamp's rendering on the form page itself, and generate a PDF via Print
   Preview to check the signature block there too. If the exported PDF
   signature is correct despite a clipped live preview, this is a low-severity
   cosmetic issue in the preview component only. If the clipping carries
   through to the applied stamp or the exported PDF, this becomes a
   legal-document accuracy issue — a signature that's visibly truncated on
   a filed court document — and should be treated with correspondingly
   higher priority.
2. **Fix, scoped by Step 1's finding.** A common, low-risk fix for this
   shape of bug is auto-scaling the font size down to fit the container
   width (either iteratively reduce `font-size` until the rendered text
   width fits, or use a CSS approach appropriate to whatever rendering
   method — canvas vs. DOM text — the "Type" tab actually uses; confirm
   which before assuming a CSS fix is even applicable, since a canvas-drawn
   signature needs a different technique than a styled `<div>`).
3. **Guard.** A unit or e2e test typing a long name (e.g. a full
   hyphenated name plus suffix, 30+ characters) and asserting the rendered
   signature — preview and, if Step 1 found it necessary, the applied
   stamp/exported output — is not visually truncated.

### Verification

Per Step 1's finding: either a preview-only fix confirmed visually, or a
fix confirmed through to the applied stamp and an exported PDF sample.

### Cross-cutting notes

**Legal/Compliance:** contingent entirely on Step 1's finding — flag for
Alan's own judgment on priority once it's known whether this reaches the
actual filed document, per `AGENTS.md` §8's instruction not to resolve
legal-sufficiency questions in a planning document.

### Verified 2026-09-14 — CONFIRMED, and Step 1 is answered: it reaches the document

**This is the highest-severity confirmed item in Milestone 50.** Step 1's
open question — preview-only, or does it carry through? — resolves to
*carries through*, because apply and preview draw on **the same canvas**.

Measured live (Plan Simplified → `/p3`, guardian 0 set to Stamp, Type tab,
name `"Bartholomew Fitzgerald-Montgomery III"`, 37 characters):

- canvas is **600 × 180** (`CANVAS_W`/`CANVAS_H`,
  `src/core/signature/signature-pad.js:136-137`)
- font resolves to **72px cursive**
- rendered text width is **1388px** — **2.3× the canvas width**
- non-transparent pixels are present on **both** the left edge column (31 px
  of height) and the right edge column (8 px) — i.e. the name is cut off at
  both ends, not merely overflowing on one side
- after clicking **Apply Signature**, the stored stamp
  (`D.planGuardians[0].signatureImage`) is a 600 × 180 PNG with
  **identical edge-pixel counts (31 / 8)** — the truncation is baked into
  the saved image

**Root cause.** `renderTypedPreview()`
(`src/core/signature/signature-pad.js:218-228`) sets a **fixed** font size,
`Math.round(typePreview.height * 0.4)`, and calls
`ctx.fillText(name, w/2, h/2)` with **no `measureText()` check and no
`maxWidth` argument**. Canvas `fillText` does not shrink or wrap; anything
wider than the canvas is simply clipped at its edges.

**Why it reaches the PDF.** The Apply handler (`:265-287`) for the `type`
tab does `renderTypedPreview(); sourceCanvas = typePreview; dataUrl =
typePreview.toDataURL('image/png')` (`:268`) — the very canvas that was just
clipped. That data URL is what `onApply` commits via `setImage(...)`
(`signature-state-control.js:88-93`) into the filing, what Milestone 46A
appends to the party's reusable stamp history (`:104-106`), and what the PDF
engine stamps onto the generated document. There is no separate
"export-quality" render path that would fix it later.

### Corrective plan

1. **Fix: scale to fit, never clip.** In `renderTypedPreview()`, measure and
   shrink before drawing — and pass `maxWidth` to `fillText` as a
   belt-and-braces guard so a name that bottoms out at the floor size is
   *condensed* rather than cut:

   ```js
   const maxWidth = typePreview.width * 0.92;      // leave a visual margin
   let size = Math.round(typePreview.height * 0.4);
   ctx.font = `${size}px cursive`;
   while (ctx.measureText(name).width > maxWidth && size > 12) {
     size -= 2;
     ctx.font = `${size}px cursive`;
   }
   ctx.fillText(name, typePreview.width / 2, typePreview.height / 2, maxWidth);
   ```

   Because Apply reuses this same canvas, **fixing the preview fixes the
   stored stamp and the exported PDF with no second change** — state that in
   the commit message so it is not re-investigated later.
2. **One decision, small:** the minimum font floor. Below roughly 12px a
   cursive signature stops being legible, and the input is already bounded
   at `maxlength="80"` (`:192`). Recommend **floor at 12px plus the
   `maxWidth` condense** — always render something, never refuse. Rejecting
   a long legal name would be a worse outcome than a condensed one, and a
   filer with a genuinely long name has no alternative.
3. **Check the two sibling previews while in the file.** The Upload tab
   draws with `drawImage(..., uploadPreview.width, uploadPreview.height)`
   (`:240`), which scales rather than clips, and Draw is inherently
   in-bounds — so neither shares this bug. Confirm rather than assume, and
   record it, so the next reader does not re-check all three.
4. **Regression guard.** Extend
   `tests/e2e/signature-capture.contract.spec.ts` (which already drives the
   Stamp state and the pad) with a test that types a 37+ character name,
   clicks Apply, loads the **stored** `signatureImage` back into a canvas,
   and asserts **zero non-transparent pixels in its left-most and right-most
   columns**. Asserting on the stored PNG rather than the on-screen preview
   is the point: it is the artefact that reaches the court document, and it
   is what measures 31/8 today. No new spec file, so no `TEST-INDEX.md`
   change.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A — same field, same PNG
dimensions, no persisted shape change; no
`probate-guardian-data-model.csv` row is affected. **Legacy Data Migration —
a real decision, answer it explicitly:** filings and Milestone 46A stamp
histories saved before this fix may already hold a clipped PNG.
**Recommended: leave them alone.** Silently re-rendering a stored signature
image would rewrite a filer's executed mark without asking, which is worse
than leaving a known-bad one they can re-capture deliberately; consider
instead surfacing nothing and letting re-capture (an existing, explicit user
action) be the remedy. Export/Import: the PDF stamping path consumes the
stored data URL unchanged, so no export code needs touching. Legal/Compliance:
Step 1 is now answered — a visibly truncated signature **can** reach a filed
document today, which is the escalation condition this item set for itself.
Flagging for Alan's priority call rather than asserting a legal conclusion.

---

## 50G — Native `window.confirm()` Dialogs Break App-Modal Consistency

**Category:** Consistency / robustness. **Confidence:** High — confirmed
both by direct observation and by reading the relevant bundle.

### Observed

Two destructive/consequential actions used the browser's native
`confirm()` dialog rather than the app's own custom modal system
(`.modal-overlay`/`.modal-box`, used consistently everywhere else observed
in the app — e.g. `#addWardModal`, `#simplifiedEligibilityModal`):

- **"Clear Annotations"** in the PDF annotation toolbar triggered a native
  confirm dialog. In this session, that native dialog froze the browser
  automation tooling being used for testing for an extended period until
  manually dismissed — which is itself informative: a native dialog is
  modal at the *browser* level, not just the page level, and behaves
  differently from the app's own modals in embedded contexts, some
  extensions, and any future automated-testing or accessibility tooling
  that expects consistent in-page modal behavior.
- **"Use my saved signature"** reuse — confirmed directly by reading
  `signature-state-control-<hash>.js` in the built bundle — calls
  `window.confirm('Apply your saved signature to this filing?')` before
  copying a saved stamp onto a new signature block.

### Suspected area

The Clear-Annotations confirm is most likely in the same file
`MILESTONE-42-PROPOSAL.md` §42B already confirms as real and current,
`src/core/pdf/pdf-annotate.js`, or its associated toolbar component. The
saved-signature confirm is in whatever source file compiles to the bundle
named `signature-state-control-*.js` **(inferred filename; the built bundle
confirms the code exists, not its source path — likely something under
`src/core/form/` or a shared UI component directory, given the naming
convention of other files `MILESTONE-42-PROPOSAL.md` references)**.

### Steps

1. **Audit all `window.confirm`/`window.alert`/`window.prompt` call sites**
   across `src/` (a simple grep, similar in spirit to the pattern
   `MILESTONE-42-PROPOSAL.md` §42C used for `window.*` bridge assignments)
   to get a complete list rather than assuming these two are the only ones.
2. **Convert each to the app's existing modal pattern**, reusing whatever
   shared confirm/modal component already exists (the app clearly has one,
   given `#addWardModal`/`#simplifiedEligibilityModal`) rather than building
   a new one-off. Preserve the exact same trigger condition and message
   text per site — this should be a mechanical replacement of the dialog
   mechanism, not a UX redesign of when confirmation is asked for.
3. **Regression guard.** A unit test (matching 42C's allow-list pattern) that
   fails if a new `window.confirm`/`alert`/`prompt` call site appears
   anywhere in `src/` going forward, so this can't silently reappear as new
   destructive actions get added.

### Verification

Grep-based guard test passes with zero remaining native-dialog call sites;
manual confirmation that both flows above now show the app's own modal and
behave identically otherwise (same trigger, same effect on confirm/cancel).

### Cross-cutting notes

**UI/UX Consistency:** directly the axis in question — the app already has
an established modal pattern; this brings two outliers into line with it,
per `AGENTS.md` §8's preference for reusing existing patterns over
inventing new ones (here, the reverse: eliminating a non-conforming
pattern).

### Verified 2026-09-14 — CONFIRMED, but roughly 40× the scope described

Both named sites are real:

- `src/core/pdf/pdf-preview.js:157` —
  `window.confirm('Remove all annotations from this preview?')` behind the
  Clear Annotations button (`:155`). The exact wording differs from this
  item's paraphrase, but the mechanism is as reported.
- `src/core/signature/signature-state-control.js:159` —
  `window.confirm('Apply your saved signature to this filing?')`, quoted
  correctly from the bundle.

**Step 1's audit, run against `src/`:**

| Dialog | Call sites |
| --- | --- |
| `confirm(` | **17** |
| `alert(` | **68** |
| `prompt(` | **2** |
| **Total** | **87** |

Across at least ten files: `pdf-preview.js`, `persistence/case-file.js`,
`persistence/recovery-cache.js`, `signature/signature-state-control.js`,
`features/annual-accounting/*`, `features/simplified-accounting/*`,
`features/dashboard/index.js`, `legacy-app.js`, `pwa-ui.js`. A third
`confirm()` sits in `pdf-preview.js:440` (proceed past outstanding
requirements). **The finding is correct; "two outliers" is not** — this is a
codebase-wide convention, not an oversight in two places, and that changes
how it should be scoped and approved.

**Disclosure:** Milestone 49/49B (landed 2026-09-14) added three further
`confirm()` sites in `legacy-app.js` — the party merge, unmerge, and
closed-filing sync prompts — deliberately following the surrounding
`doPartyMergeKeep()` pattern. They are in scope for whatever 50G becomes.

**The hard part is not the swap.** The app's modal system
(`showModal`/`closeModal`, `fragments/common-modals.html`) is imperative and
returns nothing. `confirm()` is synchronous and returns a boolean, and
several call sites use that return value inline in ways an awaitable modal
cannot drop into unchanged:

- `src/legacy-app.js:6006` — `removePlanGuardian` uses `!window.confirm(...)`
  to `return false` from a **synchronous** function.
- `src/features/simplified-accounting/index.js:88` — inside a loop, using
  the result to `break`.
- `src/features/annual-accounting/index.js:276` — early `return` in the same
  shape.
- `src/core/persistence/case-file.js:494,756` — return values feeding
  persistence branch logic.

Those need restructuring, not replacing. This is why 50G cannot honestly be
described as "a mechanical replacement of the dialog mechanism".

### Corrective plan — do not start until the scope question is answered

**Decision required from Alan before any work (`AGENTS.md` §2).**

1. **Scope.** Which of these three?
   - **(a) Confirms only — recommended.** The 17 `confirm()` sites are the
     destructive/consequential ones this item is actually about. Highest
     value, bounded, and the `alert()`s are a different problem.
   - **(b) Confirms + alerts (85).** Much larger. Many `alert()`s are
     success/failure notices in `catch` blocks ("Export failed: …",
     "Backup complete: N form(s) saved") where a blocking modal is arguably
     *worse* UX than a native dialog, and where the right answer is probably
     a non-blocking toast — which is a UX redesign, not a mechanism swap,
     and is explicitly out of this item's stated intent.
   - **(c) Everything, including `prompt()`.**
2. **Mechanism.** Whichever scope is chosen, the first deliverable is shared
   infrastructure that does not exist yet: an **awaitable confirm modal**
   (e.g. `confirmModal({ title, message, confirmLabel, danger })` returning
   `Promise<boolean>`), built on the existing `.modal-overlay`/`.modal-box`
   markup and `showModal`/`closeModal` so it inherits the app's focus
   handling and styling rather than inventing a second modal system.

**Suggested split, if approved:**

- **50G-1 — the confirm path.** Build `confirmModal()`; convert the 17
  `confirm()` sites. Most are already inside `async` functions
  (`doPartyMergeKeep`, `doPartyUnmergeSelected`, dashboard delete) and take
  an `await` cleanly. Budget the real work for the four synchronous /
  inline-return sites listed above, each of which needs its caller made
  async or restructured — handle those individually and verify each
  caller's own callers still behave (a function that silently became a
  Promise is a live bug, not a refactor).
- **50G-2 — the alert path.** Separate sub-delivery, separate approval,
  contingent on decision 1(b)/1(c). Likely wants a toast/inline-status
  pattern rather than a modal, and should be scoped as UX work.
- **50G-3 — the guard.** A unit test in the Milestone 42C allow-list style
  (`tests/unit/window-bridge.spec.js` + its JSON fixture is the working
  model): a fixture enumerating every permitted native-dialog site, and a
  test that fails when a new one appears in `src/`. Seed the allow-list with
  whatever survives the chosen scope so it passes on day one, then it
  ratchets. Add its row to `TEST-INDEX.md` per `AGENTS.md` §7.

**Sequencing note:** land 50G-3's guard **last**, not first — an allow-list
seeded before the conversions would need editing on every commit of 50G-1.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A. Test Coverage & Index:
one new unit spec (50G-3) plus a `TEST-INDEX.md` row; existing e2e specs
that dismiss native dialogs via `page.once('dialog', …)` — including
`party-dedupe.spec.ts` and `convert-ward.spec.ts` — **will break** when
their call sites convert, and updating them is part of 50G-1's cost, not a
surprise to discover later. UI/UX Consistency: reuses the existing modal
markup; the new piece is the awaitable wrapper, which should be named as
shared infrastructure rather than a one-off.

---

## 50H — County & Active-Filing Combobox Interaction Pattern

**Category:** Interaction robustness / possible accessibility gap.
**Confidence:** Medium — the non-standard event handling is confirmed;
whether it actually affects real users (as opposed to only the automation
tooling used for this testing) is not.

### Observed

Two combobox-style controls required interaction patterns that a plain
click did not satisfy:

- The **county autocomplete** (on filing cover pages) required a
  `mousedown` event on the dropdown option specifically — a plain `click`
  did not reliably select an entry, and blurring the field (e.g. via Tab)
  closed the dropdown without committing whatever was highlighted.
- The **Active Filing** picker in the sidebar (the ward/filing switcher)
  similarly required `mousedown` on the target entry, followed by either
  pressing Enter or clicking a separate "Switch Filing" affirmative action
  to actually commit the selection — a plain click-and-release on the
  option did not commit it by itself.

I want to be direct about the limits of this observation: I encountered
this through browser-automation tooling, which does not always replicate
real mouse/keyboard event sequences identically to a human using a trackpad,
touchscreen, or physical mouse. It's possible these controls work perfectly
normally for ordinary point-and-click use and this is purely an automation
quirk. What makes it worth flagging anyway is that this specific event
pattern (requiring `mousedown` rather than `click`, and requiring a
secondary commit step rather than treating the initial selection as final)
is also exactly the pattern that tends to fail for keyboard-only navigation
and some assistive technology, which follow standard combobox interaction
expectations (arrow keys to move, Enter or a single unambiguous action to
commit) rather than a `mousedown`-specific handler.

### Suspected area

`MILESTONE-42-PROPOSAL.md` §42D (Step D4) confirms
`src/core/navigation/ward-county.js` as a real, current file — a solid
candidate for the county autocomplete specifically. The Active Filing
sidebar picker's source location is **not confirmed** by anything I've
read directly; it's plausibly in the same `src/core/navigation/` area
given the file-organization pattern, but that's a guess.

### Steps

1. **Confirm with a real-input test, not just automation**, before assuming
   this needs fixing: have a person click through both controls normally
   (mouse and, separately, keyboard-only — Tab to the control, type to
   filter, arrow keys, Enter) and note where each one does or doesn't
   behave as expected.
2. **If keyboard-only or standard click interaction is confirmed broken**
   (not just an automation artifact): bring both controls' event handling
   in line with the standard combobox interaction pattern — listening for
   `click`, not only `mousedown`, on options, and supporting keyboard
   selection (arrow keys + Enter) without requiring a mouse at all. The
   WAI-ARIA combobox pattern is a reasonable reference for the expected
   event/keyboard contract if a from-scratch redesign is in scope; if not,
   the minimal fix is just adding the missing `click` handler and keyboard
   support alongside the existing `mousedown` handler rather than replacing
   it, to avoid regressing whatever the current handler is relied on for.
3. **If real-input testing shows no problem:** close this as an automation-tooling
   artifact, but consider whether e2e test coverage for these two controls
   should itself be updated to use the same `mousedown`-then-commit sequence
   documented here, so future test authors don't hit the same confusion
   this walkthrough did.

### Verification

Manual confirmation (mouse and keyboard-only) that both controls select and
commit correctly; if changed, existing e2e specs touching either control
(county selection, ward switching) re-run and stay green.

### Cross-cutting notes

**UI/UX Consistency:** if a genuine keyboard-accessibility gap is confirmed,
this is worth treating as more than cosmetic — court-facing professional
software should support keyboard-only operation as a baseline, independent
of whether any specific user has requested it.

### Verified 2026-09-14 — three findings, only one actionable

This item's own caution was well placed. Tested three interaction modes
against the real county combobox on a filing Cover:

| Interaction | Result |
| --- | --- |
| Real mouse click (`mousedown` → `mouseup` → `click`) | ✅ **works** — commits "Orange" |
| JS `element.click()` only (no `mousedown`) | ❌ fails — value unchanged |
| Keyboard: type, `ArrowDown`, `Enter` | ❌ **fails** — value unchanged |

**1. The "plain click" claim is an automation artifact — as suspected.** A
real click fires `mousedown` first, which is the only listener there is
(`src/form-events.js:140-144`). A tool driving `element.click()` in JS fires
*only* a `click` event, which nothing handles. The `mousedown` +
`preventDefault()` pattern is deliberate and load-bearing — the comment at
`src/legacy-app.js:1587-1592` explains it stops the input's `blur` from
closing the dropdown before selection registers. **Do not replace it.**

**2. The keyboard gap is real.** The county dropdown
(`filterCountyDropdown()`, `src/legacy-app.js:1574-1582`) renders plain
`<button class="county-combobox-item">` elements with **no `role="option"`,
no `aria-activedescendant`, and no `keydown` handler anywhere**. Worse,
`focusout` schedules `hideCountyDropdown()` 150ms later
(`src/form-events.js:134`), so tabbing toward the buttons closes the list
before it can be reached. There is no keyboard route to a county at all.
This is a genuine WCAG gap on a required field of every filing.

**3. The Active Filing half is already fixed — this finding is stale.** The
sidebar ward selector commits on a plain click (verified: `activeWardId`
changes), and it already has full keyboard support — `ArrowDown`/`ArrowUp`/
`Home`/`End`/`Enter`/`Escape` with `aria-activedescendant`, in
`onWardSelectorKeydown()` (`src/legacy-app.js:4115-4155`). `Enter`
dispatches a synthetic `mousedown` on the highlighted option so both paths
share one commit. The code comment at `:4092-4094` records the exact
behaviour this item reported ("selecting an entry left the active filing
unchanged; a separate Switch Filing button was required") as a **past bug
that was fixed**. The walkthrough build predated that fix.

### Corrective plan — scope to the county combobox's keyboard support only

**Explicitly out of scope:** the Active Filing picker (already correct, and
is the reference implementation to copy), and any change to the `mousedown`
handler (working as designed).

1. **Mark up the dropdown as a real combobox.** In
   `countyAutocompleteHTML()` (`src/legacy-app.js:1563-1570`) add
   `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, and
   `aria-controls` to the input. In `filterCountyDropdown()` (`:1574-1582`)
   add `role="listbox"` to the dropdown and `role="option"` plus a stable
   `id` to each item.
2. **Add keyboard handling, modelled on the ward selector.** Mirror
   `onWardSelectorKeydown()` (`:4115-4155`) — `ArrowDown`/`ArrowUp` move a
   `data-combo-index`, `Home`/`End` jump, `Escape` closes, `Enter` commits —
   and wire it next to the existing county `focusin`/`focusout` listeners in
   `src/form-events.js:125-138` rather than inventing a new dispatch site.
3. **Commit through the existing path — this is the trap to avoid.** `Enter`
   must call `selectCountyOption(id, county)` (`src/legacy-app.js:1593`), the
   same function the `mousedown` path uses, **not** set `input.value`
   directly. `selectCountyOption()` dispatches a real `input` event
   specifically so the field's normal write path runs, which is what
   triggers `maybeCommitCoverCounty()` →
   `commitCoverCounty()` — establishing the canonical ward-Party county
   (Milestone 40C-A). Setting `.value` directly would select a county on
   screen while silently skipping that commit, producing a filing whose
   Cover shows a county the ward Party never recorded.
4. **Handle the `focusout` race.** The 150ms deferred
   `hideCountyDropdown()` (`src/form-events.js:134`) must not fire between a
   keyboard commit and the re-render. Confirm behaviour when `Enter` is
   pressed and focus stays in the input — the existing ward selector solves
   the same problem by hiding the dropdown itself before committing.
5. **Optional, cheap:** add a `click` listener alongside the existing
   `mousedown` one. It changes nothing for real users but makes the control
   behave under JS-driven `.click()`, so the next person writing a test does
   not lose the time this walkthrough did. Worth a line of comment saying
   that is *why* it exists.
6. **Regression guard.** Extend `tests/e2e/cover-county.spec.ts` — which
   already drives the real combobox by `mousedown` — with a **keyboard-only**
   selection test: focus the input, type a prefix, `ArrowDown`, `Enter`, then
   assert all three of the input's value, `D.county`, **and the ward Party's
   canonical `county`**. That third assertion is what proves step 3 was done
   correctly; the first two would pass even with the broken direct-`.value`
   shortcut. No new spec file, so no `TEST-INDEX.md` change.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A — no persisted shape
changes, but note the county **commit side effect** in step 3 is the
integration risk, not the markup. Legacy Data Migration N/A. UI/UX
Consistency: the pattern being reused is named — `onWardSelectorKeydown()`'s
existing combobox implementation in the same file; this brings the second
combobox up to the first one's standard rather than inventing a third
convention. Accessibility: a keyboard-only filer currently cannot set county
on any filing, which is a baseline-operation gap, not a refinement.

---

## 50I — Manage Shared Records: Save Controls Accordion Never Auto-Collapses

**Category:** UI/UX Consistency. **Confidence:** High — unlike most items
above, this was root-caused directly against current `master` source by
Claude Code, not observed via black-box walkthrough or inferred from a
style-reference proposal.

### Observed

Alan: "Save tools on the manage shared records page should display in the
bottom left, and default accordion collapsed, like every other page."

### Root cause (confirmed, not inferred)

`updateSidebar()` (`src/legacy-app.js:4878-4905`) is the one place that
decides whether the sidebar's "Save controls" accordion (the
`save-controls-toggle-btn`/`save-controls-body` pair — last-saved/auto-save
indicators plus manual save/export controls, which always renders at the
bottom of the sidebar via `.sidebar-save-section`'s position in the shared
flex layout, per `src/styles/shell.css:38,49,172`) auto-collapses on page
entry:

```js
const saveToggleBtn=document.getElementById('save-controls-toggle-btn');
if(saveToggleBtn)saveToggleBtn.style.display=activeWardId?'block':'none';
if(activeInventoryType&&!_saveControlsUserToggled)_saveControlsCollapsed=true;
applySaveControlsCollapsedState();
```

The auto-collapse (line 4904) only fires when `activeInventoryType` is
truthy — i.e. only while one of the nine real filing types' own pages is
open. `/party-management` is one of four routes in `SPECIAL_PAGES`
(`src/legacy-app.js:7815`: `'/dashboard','/inventory-select',
'/activity-log','/party-management'`), which by design run with no
`activeInventoryType` set. So on this page, `_saveControlsCollapsed` is
never flipped to `true` on arrival and the section renders however it was
last left — expanded by default (`_saveControlsCollapsed` initializes
`false` at line 4856) unless the user happened to have manually collapsed
it earlier in the session. The comment directly above this code
(`src/legacy-app.js:4850-4855`) states the intended behavior in the code's
own words — "collapses automatically once a form is active... so the
schedule list gets the room back" — confirming this is a real gap against
the code's own stated intent, not a matter of interpretation. The section's
*position* (bottom-left) is unaffected — it's the same shared DOM node on
every page — so the actual defect is entirely the missing auto-collapse,
which is most likely what reads as "wrong" about its placement when it
shows up expanded and taller than usual.

### Steps

1. Confirm live whether the other two non-form `SPECIAL_PAGES` (Dashboard,
   Activity Log) show the identical always-expanded symptom, or whether
   something else about those two happens to mask it — this determines
   whether the fix belongs narrowly on party-management or in the shared
   `updateSidebar()` gate for all `SPECIAL_PAGES`.
2. Fix the gate at `src/legacy-app.js:4904` to also auto-collapse when a
   ward is active but no filing type is open (party-management always has
   an active ward context while visible, since the whole sidebar is hidden
   when `caseFile.wards.length===0`, per lines 4880-4883) — e.g. collapse
   whenever `activeWardId` is set, not only when `activeInventoryType` is
   set. Preserve `_saveControlsUserToggled`'s existing override so a user
   who manually re-expands it keeps that choice for the rest of the
   session, matching current filing-page behavior.
3. **Regression guard.** Extend whatever e2e coverage already exercises
   `save-controls-toggle-btn`/`applySaveControlsCollapsedState` to also
   visit `/party-management` and assert the section arrives collapsed,
   matching a filing page.

### Verification

New/extended e2e assertion green; manual confirmation that Save Controls
arrives collapsed on Manage Shared Records, identical to any filing page.

### Cross-cutting notes

**UI/UX Consistency:** directly this axis — one shared sidebar component
should behave identically everywhere it mounts; this is a single missed
condition in a shared function, not a design disagreement or a case for a
page-specific override.

### Verified 2026-09-14 — root cause correct; framing is too narrow

**The code analysis above holds.** Line numbers have shifted by roughly +8
since it was written (Milestone 49/49B edits to `legacy-app.js`); the gate
is now at **`src/legacy-app.js:4912`**, with `_saveControlsCollapsed`
initialised `false` at **`:4864`**:

```js
const saveToggleBtn=document.getElementById('save-controls-toggle-btn');
if(saveToggleBtn)saveToggleBtn.style.display=activeWardId?'block':'none';
if(activeInventoryType&&!_saveControlsUserToggled)_saveControlsCollapsed=true;
applySaveControlsCollapsedState();
```

**Two corrections to the write-up, both from live measurement:**

1. **It is not specific to `/party-management`.** `/dashboard`,
   `/inventory-select` and `/activity-log` run through the identical gate
   with no `activeInventoryType`. Step 1 above suspected this; it is
   confirmed. The fix belongs in the shared `updateSidebar()` condition, and
   the sub-delivery should be retitled accordingly rather than implying a
   page-specific defect.
2. **The symptom is session-path dependent, which is why it is hard to
   catch.** In any session that reaches Manage Shared Records the ordinary
   way, a filing page has already been visited — creating *or* opening a
   filing calls `navigate('/')` — so the flag is already `true` and the
   accordion measures **collapsed** on `/party-management`, `/dashboard` and
   a filing page alike. Measured: `#save-controls-body` computed
   `display: none` on all three, toggle reading *"Show save controls ▾"*.

   The genuine reproduction is a session that reaches a special page
   **without ever opening a filing** — restore a case file, land on the
   dashboard, then Help → Manage shared records. That path could not be
   staged in the e2e harness (a reload in the no-password harness does not
   restore the case file), so this half rests on the code reading, which is
   unambiguous: with `activeInventoryType` null, `_saveControlsCollapsed`
   keeps its initial `false` and the section renders expanded.

Alan's original report is consistent with exactly that path.

### Corrective plan

1. **Fix the gate at `src/legacy-app.js:4912`.** The intent stated in the
   code's own comment (`:4850-4855` in the original numbering) is that the
   section collapses on arrival unless the user has said otherwise. The
   simplest change that matches both that intent and Alan's ask ("default
   accordion collapsed, like every other page") is to drop the
   filing-type condition entirely:

   ```js
   if(!_saveControlsUserToggled)_saveControlsCollapsed=true;
   ```

   `_saveControlsUserToggled` continues to protect a filer who deliberately
   expanded it, so the sticky behaviour on filing pages is unchanged.
2. **Check the predicate against reality before settling on it.** Two
   candidates were considered — gating on `activeWardId` instead of
   `activeInventoryType`, or removing the condition. `activeWardId` is
   **not** safe without checking: `routes.spec.ts` already pins that
   *"returning to the dashboard clears the previous filing's sidebar
   context"*, so `activeWardId` may be null on `/dashboard`, which would
   leave that page still uncollapsed. Confirm what `activeWardId` actually
   holds on each of the four `SPECIAL_PAGES` (`src/legacy-app.js:7815`)
   before choosing; the unconditional form in step 1 sidesteps the question
   and is recommended for that reason. (`SPECIAL_PAGES` is now at
   `src/legacy-app.js:7823`, also shifted by the Milestone 49/49B edits.)
3. **Confirm the toggle button's own visibility separately.** The line above
   the gate hides `save-controls-toggle-btn` entirely when `activeWardId` is
   falsy (`:4911`). If a special page can have no active ward, the section
   could end up collapsed with no visible control to expand it — worse than
   the bug being fixed. Check this while doing step 2 and, if it happens,
   show the toggle whenever the sidebar itself is shown.
4. **Do not change the section's position.** As the write-up correctly
   notes, `.sidebar-save-section` is the same DOM node in the same shared
   flex layout on every page (`src/styles/shell.css:38,49,172`) — it is
   already bottom-left. The "should display in the bottom left" half of the
   report is satisfied today; only the collapse is missing.
5. **Regression guard.** Extend `tests/e2e/routes.spec.ts`, which already
   owns sidebar-behaviour coverage, with two assertions:
   - arriving at `/dashboard`, `/party-management` and `/activity-log`
     leaves `#save-controls-body` collapsed, and
   - after the user manually expands it, navigating does **not** re-collapse
     it — pinning `_saveControlsUserToggled`'s override, so a later
     "simplification" of the gate cannot quietly remove the user's choice.

   No new spec file, so no `TEST-INDEX.md` change.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A — `_saveControlsCollapsed`
and `_saveControlsUserToggled` are session-only script state, not persisted,
so no `probate-guardian-data-model.csv` row is involved. Legacy Data
Migration N/A. Export/Import N/A. UI/UX Consistency: directly this axis, and
the corrected scope (all four `SPECIAL_PAGES`, one shared condition)
strengthens rather than weakens the original argument — the fix is one
condition in one shared function, with no page-specific override anywhere.
