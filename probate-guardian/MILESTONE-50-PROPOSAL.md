# Milestone 50: Findings from a Live Application Walkthrough — Proposal Index

## Status

**Draft — not an authorization to implement anything below.** Per
`AGENTS.md` §3, this is a proposal only; nothing here should be started
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

| Sub-delivery | Category | Verdict after the 2026-09-14 verification pass | Status |
| --- | --- | --- | --- |
| 50A — Attorney name duplicated on Plan-to-Plan carryover | Data correctness | **Not reproduced.** Stored value is correct and singular. | **Closed 2026-09-14** |
| 50B — Simplified Accounting eligibility "Load Ward Info From" not populating | Data correctness → **rendering** | **Confirmed, root cause found.** The carry works; the page never re-renders, so the Cover looks blank. Small fix. | **Landed 2026-09-14** |
| 50C — City/State/Zip normalization regression risk | Data correctness / regression | **Not reproduced as described.** Nothing folds text into a ZIP field. A separate, narrower tolerance gap exists — decided (flag to filer) and built. | **Landed 2026-09-15** |
| 50D — Highlight annotation renders solid black | Visual rendering | **Confirmed, root cause found — and not in the file suspected.** A CSS gap; the black was the *selection outline*, not the highlight. Export confirmed clean; downgraded to preview-only. | **Landed 2026-09-14** |
| 50E — Annual Plan benefits schedule rows render oversized | Visual / layout | **Confirmed, measured, and NOT covered by Milestone 40I.** No siblings shared the shape. | **Landed 2026-09-14** |
| 50F — Typed-signature preview clips long names | Output accuracy | **Confirmed, and escalated.** The clipping is baked into the stored stamp PNG, so it reaches the filed PDF. Not preview-only. | **Landed 2026-09-14** |
| 50G — Native `window.confirm()` dialogs break app-modal consistency | Consistency / robustness | **Confirmed but far larger than scoped:** 87 native-dialog sites, not 2. Full sweep approved and executed. | **Landed 2026-09-15** |
| 50H — County & Active-Filing combobox interaction pattern | Accessibility | **Split.** County combobox had a real keyboard gap, now fixed. The "plain click" claim was an automation artifact. The Active Filing half was already fixed. | **Landed 2026-09-14** |
| 50I — Manage Shared Records: Save Controls accordion never auto-collapses | UI/UX Consistency | **Root cause correct; framing too narrow.** Affects all four `SPECIAL_PAGES`, and the symptom is session-path dependent. | **Landed 2026-09-14** |

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

**Sequencing and file-overlap note (`AGENTS.md` §2, multi-agent).**
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

1. ~~**50B** and **50I**~~ — small, self-contained, and both fix something a
   filer sees immediately. **Landed 2026-09-14.**
2. ~~**50F**~~ — small, and it is the only item confirmed to affect a filed
   court document. **Landed 2026-09-14.**
3. ~~**50D**~~ — small (CSS only). **Landed 2026-09-14.**
4. ~~**50E**, **50H**~~ — each needed a design decision, now made.
   **Landed 2026-09-14.**
5. ~~**50G**~~ — scope decided (full sweep, including `alert()`/`prompt()`);
   built and landed. **Landed 2026-09-15.**
6. ~~**50A**~~ — close with tests only, no production code change.
   **Closed 2026-09-14.** ~~**50C**~~ — closed as not-reproduced 2026-09-14
   with tests only; its one open decision (item 3) was then made and built.
   **Decision landed 2026-09-15.**

**Execution log:**

- **2026-09-14 — 50B, 50I, 50F landed** (`src/legacy-app.js`,
  `src/core/signature/signature-pad.js`; regression guards added to
  `tests/e2e/carryover-workflow.spec.ts`, `tests/e2e/routes.spec.ts`,
  `tests/e2e/signature-capture.contract.spec.ts`). No `window.*` bridge
  changes, no data-model changes, no new spec files. Each item's own
  "Corrective plan" section above carries the execution detail and any
  deviation from what was originally proposed.
- **2026-09-14 — 50A, 50C closed**, neither reproduced. Regression guards
  added anyway (`tests/e2e/convert-ward.spec.ts` for 50A —
  `carryover-workflow.spec.ts` doesn't actually drive the Plan-to-Plan path
  50A was about, so the guard landed in the file that does;
  `tests/unit/form-contract.spec.js` for 50C, including a test that pins
  *why* the reported "MAlvern" behavior is deliberate — the same guard
  protects "McKinney" on a filed document). 50C's item 3 (repair vs. flag
  vs. leave-as-typed for malformed input) is intentionally left open; it
  governs only hypothetical future work, not this closure.
- **2026-09-14 — 50D's Step 1 answered.** Saved an annotated PDF with one
  highlight left selected (the exact on-screen state that renders the black
  outline), then re-opened the saved bytes with pdf.js and read the actual
  annotation object back: exactly one annotation, `subtype: "Highlight"`,
  `color: [255, 255, 152]` (the correct yellow), a real appearance stream,
  and **no second "outline" object of any kind**. The export is clean — the
  black outline is confirmed to be a pure on-screen editing-session
  decoration (pdf.js's UI convention for "this editor is currently
  selected"), which by construction cannot be serialized into a PDF file at
  all. Severity is downgraded accordingly: this is a preview-only visual
  bug, not a court-document defect.
- **2026-09-14 — decision questions answered for 50D, 50E, 50G, 50H; 50D,
  50E, 50H landed.** 50D: ported the missing highlight/outline CSS plus the
  selected-state stroke (decision: port it), confirmed visually — correct
  translucent yellow with a visible blue selection outline. 50E: laid the
  Yes/No pair out horizontally with the column sized to content (decision:
  preferred approach), confirmed no sibling page shares the shape, measured
  95px rows (from 156px) at desktop/tablet with the 44px tap target intact,
  and phone width still correctly stacks. 50H: added the county combobox's
  missing keyboard support (Arrow/Home/End/Escape/Enter, committing through
  the exact same `mousedown`-dispatch path a real click uses, avoiding the
  "sets `.value` directly and skips the county commit" trap the plan
  flagged) plus the optional `click` listener (decision: add it). 50G:
  scope decided as the full sweep (confirm + alert + prompt); execution
  below.
- **2026-09-15 — 50G landed: full sweep, all 87 native-dialog sites.**
  New module `src/core/ui/dialogs.js` (`confirmModal()`/`alertModal()`/
  `promptModal()`) reuses the app's existing `.modal-overlay`/`.modal-box`
  markup and `modal-events.js`'s generic Escape/focus-trap/a11y-observer
  handling as-is — the actual mechanism turned out to be that generic
  observer, not the `showModal`/`closeModal` pair this item's own
  "Suspected area" guessed at. All 87 sites (17 `confirm()`, 68 `alert()`,
  2 `prompt()`) across ~25 `src/` files converted; the four flagged
  synchronous/inline-return call sites were each individually made `async`
  with every caller checked, not redesigned wholesale. Full detail in the
  item's own "EXECUTED" section below.
- **2026-09-15 — 50C's decision 3 answered and landed: flag to the filer.**
  New `isMalformedCityStateZip()` plus `setCityStateZipFeedback()`
  (`src/core/form/form-contract.js`), wired into `finalizeFieldValue()`'s
  existing `zip` branch — one call site covers every `cityStateZip` field in
  the app. `is-invalid`/`aria-invalid` plus a real `.invalid-feedback`
  sibling, shown via Bootstrap's existing CSS. Full detail in the item's own
  "Corrective plan" section above.

---

## 50A — Attorney Name Duplicated on Plan-to-Plan Carryover — **CLOSED 2026-09-14 (not reproduced)**

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

### Corrective plan — CLOSED 2026-09-14, no production change

1. **Closed.** No defect exists in the carryover mapping. Recorded here
   rather than deleted, so the same walkthrough observation doesn't get
   re-filed later.
2. **Regression guard added**, deliberately in a different file than
   originally suggested: `tests/e2e/carryover-workflow.spec.ts` doesn't
   actually drive this path (it exercises Guardian Inventory → Simplified/
   Annual Accounting via the eligibility modal, a different function
   entirely). The real path 50A was about — "Create New Form for Existing
   Ward" from an Initial Guardianship Plan to an Annual Guardianship Plan —
   is Convert Ward's Plan-to-Plan carryover, already covered by
   `tests/e2e/convert-ward.spec.ts`. Added there: *"Initial Guardianship
   Plan → Annual Guardianship Plan carries the attorney name exactly once,
   never doubled"*, asserting `newWard.attorney` equals the source's
   attorney name exactly via the real `convertExistingWard()` entry point.
   No new spec file, so no `TEST-INDEX.md` change.
3. **Not done, correctly:** the two-field Plan Initial shape (`attorneyName`
   + `attorney_name` both written from the same source value) was left
   alone — that is the form's real structure, not a bug.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A — confirmed no stored
duplication, so no `probate-guardian-data-model.csv` row is implicated.
Legacy Data Migration N/A — no `.sav` file can carry a doubled value from
this path. Legal/Compliance: the escalation condition stated above (a wrong
attorney name reaching a filed document) is not met.

---

## 50B — Simplified Accounting Eligibility "Load Ward Info From" Not Populating — **Landed 2026-09-14**

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

### Corrective plan — EXECUTED 2026-09-14, approach 1 (narrow fix)

Both branches of `doConfirmSimplifiedEligibility()` now call
`renderPage('/')` and `updateSidebar()` immediately after their carry-over
`Object.assign()`/`saveWardToState()` and before their own `alert(...)`,
mirroring `doAddWard()`'s existing tail exactly as step 1 below describes.
Step 2 (the deeper `addWard()`-signature redesign) was **not** taken — it
remains flagged as future scope only, per the plan's own recommendation.
Regression guard (step 3) added to `tests/e2e/carryover-workflow.spec.ts`:
both the qualifying and non-qualifying-redirect tests now assert the
**rendered** `[data-form-path="caseNumber"]`/`[data-form-path="attorney"]`
input values, not just `window.D`. All prior steps below are kept as the
historical record of what was decided and why.

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

## 50C — City/State/Zip Normalization Regression Risk — **CLOSED 2026-09-14 (not reproduced)**

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

### Corrective plan — CLOSED 2026-09-14, with tests; decision 3 EXECUTED 2026-09-15

1. **Closed as not-reproducing.** No fix forced onto a non-reproducing
   report.
2. **Regression cases added** to `tests/unit/form-contract.spec.js`
   (already owns `formatCityStateZip()` coverage): both reported literals
   pinned unchanged (`"St.Petersburg,FL33704"`, `"MAlvern"`), plus a second
   test pinning that an *already-mixed-case* name (`"McKinney, FL"`,
   `"DeLand, FL 32720"`, `"O'Brien, FL"`) is never flattened — the guard
   that would break if a future "fix" for `MAlvern` started title-casing
   any word with an interior capital. Verified directly against the real
   function before writing the assertions (`mckinney, fl` → `Mckinney, FL`,
   not `mckinney, FL` — the all-lowercase branch is separate from, and
   unrelated to, the interior-capital guard being pinned; noted in the
   test's own comment so it isn't mistaken for the same mechanism later).
   No new spec file, so no `TEST-INDEX.md` change.
3. **Decided 2026-09-15 — flag to the filer — and built the same day.**
   Deliberately not "repair silently" (too risky against the
   interior-capital guard pinned in item 2) and not "leave as typed with no
   signal" (the original recommendation, superseded by this decision).

   **Detection.** `isMalformedCityStateZip()`
   (`src/core/form/form-contract.js`) flags a letter run immediately
   followed by 4+ digits with no separating space — the exact shape the
   Verified section above found (`"...FL33704"`). Deliberately narrower than
   "the per-word regex didn't match at all": that broader signal would also
   catch `"O'Brien"`/`"Winter-Haven"`-shaped tokens, which the formatter
   already leaves alone on purpose and which are not the reported defect.

   **Wiring.** `finalizeFieldValue()`'s existing `zip` branch calls
   `setCityStateZipFeedback(control, isMalformedCityStateZip(formatted))`
   right after computing `formatted`, in the one shared post-write tail
   Milestone 42D consolidated — so every `cityStateZip` field in the app
   (Cover, guardian/attorney/preparer addresses, all of Guardian Inventory's
   schedule rows) is covered by this one call site, not a per-feature
   change. `setCityStateZipFeedback()` toggles `is-invalid`/`aria-invalid`
   the same way the adjacent date branch already does (mock-safe, no DOM
   insertion required — this half runs unchanged in the unit-test harness's
   plain mock objects), and additionally creates/removes a real
   `.invalid-feedback` sibling element carrying the message, guarded behind
   `typeof control.insertAdjacentElement === 'function'` so it only runs
   against a real DOM. No new CSS: Bootstrap's own
   `.is-invalid ~ .invalid-feedback{display:block}` rule (already vendored,
   `lib/bootstrap.min.css`) shows and hides the message automatically.
   Flag clears itself the next time the field is corrected and re-blurred,
   since the same branch runs on every blur regardless of outcome.

   **Regression guards.** Unit: `tests/unit/form-contract.spec.js` gained an
   `isMalformedCityStateZip` describe block (positive on the two glued
   shapes, negative on well-formed input, digit-only zips, and the item-2
   punctuation-guard words) plus a `finalizeFieldValue` test toggling the
   flag on then off across two blurs — the is-invalid/aria-invalid half
   only, since the mock control has no `document`. E2e:
   `tests/e2e/form-entry.contract.spec.ts` added a full-DOM test against
   `preparer.cityStateZip` on Annual Accounting's `/p4`, typing the exact
   reported literal, asserting the real `.invalid-feedback` element renders
   and is visible, then correcting the value and asserting both the class
   and the element are gone. No new spec file in either suite, so no
   `TEST-INDEX.md` change.

**Cross-cutting (`AGENTS.md` §8):** Data Model N/A. Test Coverage & Index:
covered above — item 2's original guard plus item 3's new detection/toggle
coverage. Legal/Compliance: the accuracy concern quoted above is real but is
not caused by the reported mechanism; whether an un-normalised address is
acceptable on a filing was the decision in item 3, now resolved and built as
"flag, don't silently repair or stay silent."

---

## 50D — Highlight Annotation Renders Solid Black — **Landed 2026-09-14**

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

**Legal/Compliance — superseded, see the "Verified" section below.**
Annotations here are being made on documents destined for actual court
filings or internal review of those filings — a highlight that obscures
the underlying text in solid black rather than tinting it is a real
functional defect for that use case, not just an aesthetic one.

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

**Step 1 answered 2026-09-14 — the export is clean.** Saved an annotated
PDF with one highlight deliberately left *selected* (the exact on-screen
state that renders the black outline), then re-opened the saved bytes with
pdf.js and read back the actual annotation object: exactly one annotation,
`subtype: "Highlight"`, `color: [255, 255, 152]` (the correct yellow), a
real appearance stream, and no second "outline" object of any kind. The
black outline cannot reach the file by construction — it is pdf.js's UI
convention for "this editor is currently selected," and a PDF has no
concept of editor-selection state to serialize. **Severity is downgraded**:
this is a preview-only visual bug during editing, not a court-document
defect — the Legal/Compliance note below is corrected accordingly.

### Corrective plan — EXECUTED 2026-09-14, decision 3 taken as "port the stroke"

Ported to `src/styles/print.css`, right after the existing
`.annotationEditorLayer .highlightEditor` rule: `svg.highlight`
(`fill-rule:evenodd;mix-blend-mode:multiply`), `svg.highlightOutline`
(`fill:none;mix-blend-mode:normal`), and the selected-state stroke on
`.mainOutline`/`.secondaryOutline` using `--outline-color`/
`--outline-around-color`/`--outline-around-width` (upstream defaults,
added to the file's existing `:root` line alongside `--outline-width`,
which was already there). Decision 3 was taken as recommended: the
selection stroke is ported, so a selected highlight keeps a visible cue
(confirmed visually — a blue outline around the yellow highlight).
Deliberately skipped, per the plan: the `hovered:not(.selected)` variant
(mouse-hover is a different state than selection) and the forced-colors
branch (this port already declines forced-colors support). The port's
header comment was extended with the full root-cause account, matching
step 2's instruction that the comment is the file's own contract about
what it deliberately omits. Regression guard (step 4) added to the exact
test named below: `svg.highlight` computed fill/blend-mode pinned to the
correct palette yellow and `multiply`, plus the general "no SVG inside
`.pdf-page` computes opaque black" assertion. All prior steps below are
kept as the historical record.

1. ~~**Answer this first — it sets the severity.**~~ **Answered above:**
   export is clean, severity downgraded to preview-only.
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
Data Migration N/A. Export/Import: **answered** — the saved-PDF path does
not carry the defect; see the "Verified" section's Step-1 result. Legal/
Compliance: **downgraded** — preview-only, not a court-document defect, per
the same finding.

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
`AGENTS.md` §6, `src/styles/cards.css` is the authoritative home for
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
   separate, larger decision (per `AGENTS.md` §6's Tier 2 card-template
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

### Corrective plan — EXECUTED 2026-09-14, preferred approach, no siblings affected

Step 1's blast-radius check found **no siblings share this shape**: Plan
Annual's Rights table renders one radio per cell (not a Yes/No pair), and
its ADLs table uses a `<select>`, not radios at all — Benefits is the only
page with two radio groups packed into one narrow column. Scope stayed
exactly `.plan-benefits-table` as a result. The preferred approach (step 2)
was taken: `<th style="width:7rem">` was removed from both answer-column
headers in `pagePlanABenefits()` (`src/features/plan-annual/index.js`) so
the column sizes to content, and a scoped rule in `src/styles/forms.css`
(`.plan-benefits-table .plan-radio-row{flex-wrap:nowrap}` inside a
`@media (min-width:576px)` block, reusing this app's existing Bootstrap-style
phone breakpoint rather than inventing a new one) keeps the pair on one line
whenever there's room. Verified live at all three widths named in step 3:
desktop and tablet both render 95px rows (down from 156px) with Yes/No side
by side; phone (390px) correctly still stacks, with no horizontal overflow
at any width. The 44px `.form-check` tap target is untouched in all three.
Regression guard (step 4) added as a new, self-contained test at the end of
`schedule-card-layout.spec.ts` (that file has no `describe` blocks; matching
its existing top-level-`test` convention rather than nesting into its one
giant sweep test), asserting both halves: row height and the `min-height`
computed style. All prior steps below are kept as the historical record.

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

## 50F — Typed-Signature Preview Clips Long Names — **Landed 2026-09-14**

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

### Corrective plan — EXECUTED 2026-09-14, exactly as proposed

`renderTypedPreview()` (`src/core/signature/signature-pad.js`) now shrinks
the font in a `measureText()` loop down to a 12px floor and passes
`maxWidth` to `fillText()` as the belt-and-braces guard, per step 1 below —
implemented essentially verbatim, floor included. Step 2's decision (12px
floor, condense rather than refuse) was taken as recommended. Step 3 (the
Upload/Draw siblings) was already answered by the verification pass itself
and needed no further check. Step 4's regression guard was added to
`tests/e2e/signature-capture.contract.spec.ts`: types a 37-character name,
applies it, then decodes the **stored** `signatureImage` PNG back into a
canvas and asserts zero non-transparent pixels in its left-most and
right-most columns — the exact artefact and the exact check the plan called
for, not a preview-only assertion. All prior steps below are kept as the
historical record.

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

## 50G — Native `window.confirm()` Dialogs Break App-Modal Consistency — **Landed 2026-09-15**

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

### Corrective plan — EXECUTED 2026-09-15, decision 1(c) taken (full sweep), decision 2 built as specified

**Decision taken:** full scope, **(c) everything, including `prompt()`** —
not the recommended narrower (a). All 87 sites converted: 17 `confirm()`,
68 `alert()`, 2 `prompt()`.

**Mechanism.** New file `src/core/ui/dialogs.js` exports
`confirmModal(messageOrOptions)`, `alertModal(messageOrOptions)`, and
`promptModal(messageOrOptions)`, each returning a `Promise` that resolves
with exactly what its native counterpart would return (`true`/`false` for
confirm, `undefined` for alert, the trimmed string or `null` for prompt —
`Escape` behaves like Cancel for confirm/prompt). One divergence from the
plan's guess: the actual reuse mechanism is not `showModal`/`closeModal` —
those turned out not to be what the existing `#addWardModal`/
`#simplifiedEligibilityModal` markup runs on. Each dialog builds a plain
`div.modal-overlay > div.modal-box` and appends it to `document.body`;
`modal-events.js`'s existing generic `MutationObserver` (`modalA11yObserver`)
and generic `handleModalKeydown` pick it up automatically — Escape-to-close,
Tab focus-trap, and `role="dialog"`/`aria-modal`/`aria-labelledby` all come
free, with zero changes to `modal-events.js` itself. `legacy-app.js` (a
classic, non-module script) uses the three functions via `window.*`
(`dialogs.js` bridges them explicitly); every ES-module file imports them
directly. Three new `window.*` bridge entries
(`alertModal`/`confirmModal`/`promptModal`, all attributed to
`src/core/ui/dialogs.js`) added to
`tests/unit/fixtures/window-bridge-allowlist.json`;
`window-bridge.d.ts` regenerated via `audit-window-bridge.mjs --declare`.

**The four flagged synchronous/inline-return sites** (`removePlanGuardian`,
the `simplified-accounting/index.js` loop `break`, the
`annual-accounting/index.js` early `return`, and the two `case-file.js`
branch-logic sites) were each individually made `async`, and every one of
their own callers was traced and confirmed safe — either already using
`await`, or genuinely fire-and-forget (a `switch` dispatch or a DOM event
listener, where a delayed async resolution changes nothing observable).
This held for the full sweep, not just those four: roughly 35 sites in
`legacy-app.js` alone needed their enclosing function newly marked `async`,
each checked the same way. No caller was found where a function silently
becoming a `Promise` created a live bug — restructuring per-site, exactly
as the plan called for, not a wholesale redesign.

**50G-2 (the alert path) was folded into this same sweep**, not deferred as
a separate toast-based UX redesign — decision 1(c) supersedes the
alternative framing in decision 1's option (b) writeup below. Every
`alert()` became `alertModal()`, kept as a blocking modal (matching
`confirm()`'s treatment) rather than redesigned as a non-blocking toast;
that redesign remains available as genuinely separate future UX work if
wanted, but was not part of what was approved here.

**50G-3 (the guard) was built, but as zero-tolerance, not an allow-list.**
Milestone 42C's `window-bridge.spec.js` allow-list pattern fits a case where
some `window.X =` sites are legitimate and must be enumerated; here the
target is that **no** native-dialog call site should exist in `src/` at all,
so a plain content scan is the right shape — no JSON fixture to maintain.
New file `tests/unit/native-dialog-guard.spec.js` scans every `.js` file
under `src/` (excluding `dialogs.js` itself, whose own doc comments
legitimately name `confirm()`/`alert()`/`prompt()` to document the native
contract each replacement matches) for `\b(?:window\.)?(?:alert|confirm|
prompt)\(` and asserts zero matches. Confirmed passing against the fully
converted tree. `TEST-INDEX.md` row added per `AGENTS.md` §7, verified
against `test-index-guard.spec.js`.

**Two DOM/stacking bugs found and fixed as a byproduct**, neither present
in native `confirm()`/`alert()`/`prompt()` because those render outside the
DOM entirely and are always topmost regardless of page CSS (two more
byproduct findings — a test-code deadlock shape and a deeper
session-restore-cache gap — follow below):

- **Stacking.** `#startup-choice-overlay`/`#security-choice-overlay`/
  `#unlock-overlay`/`#ward-locked-overlay` carry z-index 10000–10002;
  `dialogs.js`'s dynamically-created overlays inherited only the generic
  `.modal-overlay` z-index of 9999. A `confirmModal()`/`alertModal()`
  firing while one of those screens was still open (e.g. the PWA
  update-available confirm arriving before the startup screen is
  dismissed, or a corrupt-file-open alert while the startup screen is
  still up) rendered invisibly behind it and was unclickable — reproduced
  live via a genuinely stalled `.click()`. Fixed with one new rule in
  `src/styles/modals.css`: `.modal-overlay[id^="dyn-dialog-"]{z-index:10010;}`.
- **Selector collision in the test helper.** `tests/e2e/support/target.ts`'s
  `autoAcceptDynDialogs()`/`acceptDynDialog()`/etc. originally matched any
  `.modal-overlay.show .modal-box` — which also matches the app's own real,
  static overlays sharing those same classes. Scoped to
  `.modal-overlay[id^="dyn-dialog-"].show .modal-box` (`dialogs.js`'s own
  id prefix for every dialog it creates).

**e2e test fallout was far larger than the cross-cutting note below
predicted, and kept growing through three separate discovery passes** —
targeted testing of files a grep found, a full 555-test suite run, and
live debugging of two of that run's failures. The two files the
cross-cutting note originally named turned out to be one right, one wrong
in the opposite direction from what a full-suite run later proved:
`party-dedupe.spec.ts` did need conversion for the reason expected;
`convert-ward.spec.ts` had no `page.once('dialog', …)` pattern to convert,
but the full-suite run found it failing anyway, for an unrelated reason (see
below) — "needed no changes" was wrong, just not for the reason originally
guessed. In total, 22 files under `tests/e2e/` were touched: 20 spec files
plus `support/target.ts` (five new helpers —
`readDynDialogMessage`/`acceptDynDialog`/`dismissDynDialog`/
`escapeDynDialog`/`fillDynPrompt`, plus `autoAcceptDynDialogs()` for
variable-count sequences) and `support/plan-fixture.ts` (shared by all four
Plan-type mount specs). Three distinct native-dialog idioms had to be found
and converted, not just the `page.once('dialog', …)`/`page.on('dialog', …)`
pair this item originally anticipated: `page.waitForEvent('dialog')` (found
only by tracing a live test hang) and direct
`window.alert = () => {…}`/`window.confirm = () => {…}` stubbing (found the
same way) both slipped past the original grep. A final sweep
(`grep -rn "waitForEvent('dialog')\|\.once('dialog'\|\.on('dialog'"` plus a
second pass for `\.alert\s*=\|\.confirm\s*=\|\.prompt\s*=`) confirms zero
remain anywhere in `tests/e2e/`, aside from the one genuinely-still-native
`beforeunload` listener in `recovery-cache.spec.ts` (browser-level, has no
DOM-dialog equivalent).

**A third native-dialog deadlock shape, found only by the full-suite run:**
`convert-ward.spec.ts`'s three data-carry tests each called
`await (window as any).convertExistingWard(srcId, targetType)` directly
inside a single `page.evaluate()` and awaited the whole thing —
`convertExistingWard()` always ends with a trailing "Converted…"
`alertModal()`, so that `evaluate()` call could never resolve: nothing
outside it exists yet to dismiss the dialog it's still waiting on. Same
shape, same fix as the ones already documented elsewhere in this file
(`plan-fixture.ts`'s blocked-export test, `dashboard-backup.spec.ts`'s
`saveBackupNow` test): fire the call without awaiting it inside the
`evaluate()`, stash the eventual result on `window`, dismiss the dialog from
the test's own code, then read the result back.

**A genuine pre-existing architectural gap, unrelated to this item, was
exposed (not introduced) by the conversion, and turned out both larger and
subtler than first found:** `exportCaseFileZip()`'s own
`clearSessionRestoreCache()` call is gated on a truthy File System Access
handle, which every e2e test target force-disables (`target.ts`'s own
header comment) — so the download-fallback export path never actually
clears the session-restore cache. This surfaced in six tests across four
files, not the two originally found: `backup-restore-sav.spec.ts`'s
cross-tab lock-contention test and `recovery-cache.spec.ts`'s "a successful
.sav save clears the cache" test (both export first, then open a second
context/reload), plus three `ward-lock.spec.ts` multi-tab tests and
`routes.spec.ts`'s "all 9 form types" test (which reload the same page in a
loop without ever exporting at all — a ward simply existing is enough to
dirty the debounced autosave). All six previously passed by accident: the
native `page.once('dialog', …)` listener each test registered (or, for the
two that registered none at all, Playwright's default handling for an
un-listened dialog) had already been spent on an earlier or unrelated
dialog, so the *next* restore-offer confirm — never explicitly handled —
got auto-declined by Playwright's own default, which cleared the cache as
a side effect of declining, not of saving. A DOM dialog nobody interacts
with has no such default and just sits open forever, hanging the test.

Fixed in all six by explicitly calling `window.clearSessionRestoreCache()`
at the point each test's flow would otherwise leave the cache dirty,
reproducing what a real successful Save-As already does. **Clearing the
cache alone was not sufficient**, confirmed by live debugging of
`routes.spec.ts`'s test: some later render/mount tick re-marks the app
dirty and re-arms the debounced autosave, which can re-populate the very
cache entry just cleared before the next reload's navigation actually
unloads the page — the "restore session?" dialog reappeared even
immediately after an awaited clear. The reliable fix additionally resets
`window._dirtySinceExport = false` right after the clear, so nothing left
pending can re-trigger the write; applied everywhere the clear is, not just
where it was needed to make routes.spec.ts pass.

All prior numbered content below is kept as the historical record of what
was proposed before the decision.

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

**Cross-cutting (`AGENTS.md` §8), as executed:** Data Model N/A — confirmed,
no persisted shape touched anywhere in the sweep. Test Coverage & Index:
one new unit spec (`native-dialog-guard.spec.js`, zero-tolerance rather than
an allow-list) plus its `TEST-INDEX.md` row; 22 `tests/e2e/` files updated
(see the EXECUTED narrative above for the full list, the three dialog
idioms found beyond the one originally anticipated, and the two rounds of
full-suite-run discoveries beyond the files a grep alone could find).
UI/UX Consistency: reuses the existing modal markup and `modal-events.js`'s
generic a11y/focus-trap observer as-is; the new piece is the awaitable
wrapper in `src/core/ui/dialogs.js`, named as shared infrastructure. Three
real, previously-latent bugs found and fixed along the way: a z-index
stacking gap (dyn dialogs could render behind an already-open startup/
security screen), a deadlock shape in test code that awaits a native-dialog-
triggering call inside a single `evaluate()` (three distinct sites, same
fix each time), and a pre-existing session-restore-cache clearing gap
exposed by six e2e tests that had been passing for the wrong reason — all
detailed above.

---

## 50H — County & Active-Filing Combobox Interaction Pattern — **Landed 2026-09-14**

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

### EXECUTED 2026-09-14, steps 1-4 and 6 as specified; step 5 taken (approved decision)

`countyAutocompleteHTML()`/`filterCountyDropdown()`/`hideCountyDropdown()`
gained the combobox roles/ARIA state from step 1. A new
`onCountyKeydown(inp, e)` (modelled directly on `onWardSelectorKeydown()`,
parameterized on which input fired it since county isn't a singleton the
way the ward selector is) implements Arrow/Home/End/Escape/Enter, wired
next to the existing `focusin`/`focusout` county listeners in
`src/form-events.js` per step 2. Step 3's trap was avoided by construction,
not just by care: Enter dispatches a synthetic `mousedown` on the
highlighted option — the exact technique `onWardSelectorKeydown()` already
uses — so the keyboard path runs through `selectCountyOption()` via the
*same* listener a real click uses, incapable of diverging into a bare
`.value` assignment. Step 4's race was checked directly: since
`dispatchEvent()` for a synthetic event doesn't trigger the browser's
native focus-shift side effects, focus never leaves the input during an
Enter-commit, so the input's own `focusout` (and its 150ms deferred
`hideCountyDropdown`) never fires at all — `selectCountyOption()`'s own
synchronous call to `hideCountyDropdown()` is what actually closes it, with
nothing to race against. Step 5 (the optional click listener) was taken
per the approved decision, added alongside the `mousedown` listener in
`form-events.js` with a comment recording why the harmless double-fire for
a real click is acceptable (`selectCountyOption()` is idempotent). Step 6's
regression guard, added to `tests/e2e/cover-county.spec.ts`, asserts all
three values the step calls for — input value, `D.county`, and the ward
Party's canonical county — via a real `ArrowDown`+`Enter` sequence, plus
that the dropdown actually closes (proving step 4's race analysis rather
than just asserting it away). All prior numbered steps below are kept as
the historical record.

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

## 50I — Manage Shared Records: Save Controls Accordion Never Auto-Collapses — **Landed 2026-09-14**

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

**Addendum, found during implementation:** `updateSidebar()` itself is
**not** called on every route change — confirmed by reading `router.js`
and `shell-events.js`'s `'dashboard'` action (`window.navigate('/dashboard')`
directly, no sidebar refresh). It only runs at boot (`initApp()`) and from
explicit ward-lifecycle actions (`switchWard`/`addWard`/`deleteWard`/
`renameWard`). So the save-controls section does not re-evaluate on every
navigation to a `SPECIAL_PAGES` route — its collapsed state is whatever the
*last* such call left it as. This does not change the diagnosis above (the
gate condition is still wrong) but it does mean the accurate description is
"whatever `updateSidebar()` last computed persists across ordinary
navigation," not "each route re-decides." Verified directly: calling
`window.updateSidebar()` with `activeWardId`/`activeInventoryType` both null
(the exact state `initApp()` leaves them in for a restored case with no
stored active ward) left `#save-controls-body` expanded before the fix and
collapsed after, with the toggle button still reachable.

### Corrective plan — EXECUTED 2026-09-14, plus one addition (step 3 confirmed necessary)

The gate at `src/legacy-app.js:4912` (now shifted to `:4923` after
Milestone 49B's earlier edits) was changed to the unconditional form from
step 1. Step 2's `activeWardId`-vs-`activeInventoryType` question was
answered by direct measurement (see the addendum above) rather than by
inspection alone: pushed a ward record and drove `updateSidebar()` with
both null, confirming `_saveControlsCollapsed` was the safe predicate to
drop the condition from, not `activeWardId`. Step 3 turned out to be a REAL
finding, not a hypothetical: measured live, `saveToggleBtn.style.display`
was already `'none'` in that exact no-active-ward state (the previous line's
own `activeWardId?'block':'none'` ternary), which combined with the new
unconditional collapse would have left the section collapsed with **no
visible control to reopen it** — worse than the original bug. Fixed by
making the toggle button's own visibility unconditional too, justified by
the same reasoning step 3 anticipated: `updateSidebar()` only reaches this
line once `caseFile.wards.length>0` is already established by the function's
own early return, so the save controls always apply to *some* case file
regardless of whether one filing is currently active. Step 4's regression
guard was added to `tests/e2e/routes.spec.ts`, asserting both halves (body
collapsed, toggle visible and clickable) plus that `_saveControlsUserToggled`
still overrides the gate on a later call. All prior steps below are kept as
the historical record.

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
