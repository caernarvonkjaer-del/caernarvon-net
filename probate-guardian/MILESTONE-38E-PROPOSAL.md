# Milestone 38E: Global Explicit Yes/No Radio-Pair Migration

## Status

**Landed 2026-09-13.**

## Goal

Eliminate single-checkbox `Yes / Unanswered` ambiguity across remaining binary questions in the application, specifically within **Guardian Inventory** schedule/filing flags and **Plan Benefits Tables**. 

Single checkboxes conflate an explicit **"No"** (user verified an item is negative/unrestricted/not receiving) with **"Unanswered / Skipped"** (unreviewed field). This migration establishes explicit tri-state controls (`'' | 'Yes' | 'No'`) starting in an unselected state across all binary fields.

---

## Item 1: Guardian Inventory & Plan Benefits Yes/No Explicit Choice Migration

### 1. Scope of Fields to Migrate

#### A. Guardian Inventory Schedule Row Flags
- **Schedules B-1 & B-3:** `scheduleB1[].isRestricted` & `scheduleB3[].isRestricted` (`Restricted?`)
  - Migrate storage key / schema from boolean `isRestricted` to tri-state enum `restricted` (`'' | 'Yes' | 'No'`).
  - Render as accessible inline **Yes / No** radio pair starting unanswered (`''`).
- **Schedule A-1:** `scheduleA1[].isPersonalResidence` (`Personal Residence?`) & `scheduleA1[].isIncomeProperty` (`Income Property?`)
  - Migrate storage keys to tri-state enums `residence` and `income` (`'' | 'Yes' | 'No'`).
  - Render as accessible inline **Yes / No** radio pairs.
- **Schedules B-2 & B-3:** `scheduleB2[].inSafeDepositBox` & `scheduleB3[].inSafeDepositBox` (`In Safe Deposit Box?`)
  - Migrate storage keys to tri-state enums `inSafeDepositBox` (`'' | 'Yes' | 'No'`).
  - Render as accessible inline **Yes / No** radio pairs.

#### B. Guardian Inventory Cover & Filing Flags
- **Safe Deposit Box Cover Flags:** `hasSafeDepositBox` ("Safe deposit box exists?") and `safeDepositBoxFiled` ("Safe deposit box inventory filed?")
  - Migrate storage keys from nullable boolean to tri-state enum (`'' | 'Yes' | 'No'`).
- **Amended Inventory Flag:** `isAmended` ("Amended Inventory?")
  - Reconcile `guardian-inventory` with the canonical `amendedForm` (`'' | 'Yes' | 'No'`) enum used by all other filing types.

#### C. Plan Benefits Tables
- **Annual Plan (Question 8 Benefits Table):** `benefits.<key>.eligible` & `benefits.<key>.appliedFor`
  - Migrate 12 benefit rows (Social Security, SSDI, SSI, Medicare, Medicaid, HMO, Pension, Supplemental Ins, Institutional Care, State Supplement, Trusts, Other) from single checkboxes to explicit **Yes / No** radio choices (`'' | 'Yes' | 'No'`).
- **Initial Plan (Question 7 Benefits Table):** `q7SocialSecurity`, `q7Ssdi`, `q7Hmo`, `q7Ssi`, `q7StateSupplement`, `q7InstitutionalCare`, `q7SupplementalIns`, `q7Pension`, `q7Medicare`, `q7Medicaid`, `q7Va`, `q7Trusts`, `q7PendingBenefits`
  - Migrate from single boolean checkboxes to explicit **Yes / No** radio pairs (`'' | 'Yes' | 'No'`).

---

### 2. Implementation & Integration Specifications

#### A. Shared UI Renderer & Controls
- Use the shared radio-pair renderer `yesNoRadioHTML()` / `yesNoRadioAnnualHTML()` in `src/legacy-app.js`.
- Ensure each radio pair uses an accessible `<fieldset>` with legend, distinct input IDs, visible "Yes" and "No" labels, and data-bind wiring that updates model state to `'Yes'` or `'No'`.

#### B. Calculation Engine & Data Model Reconciliation
- **Restricted Asset Calculations:** Update calculation helpers (`restrictedCash`, `unrestrictedCash`, `restrictedIntang`, `unrestrictedIntang` in `src/legacy-app.js`) to evaluate `r.restricted === 'Yes'` (or legacy `r.isRestricted === true`).
- **Backward Compatibility for Saved Files (.sav):** Implement a normalization step in save file import / data loading:
  - `true` maps to `'Yes'`
  - `false` maps to `'No'`
  - `null` / `undefined` / `''` remains `''` (Unanswered).

#### C. PDF & Excel Output Parity
- **PDF Generation:** Update `pdf-model.js` for Guardian Inventory (Schedules A-1, B-1, B-2, B-3) and Plan print modules to output `'Yes'`, `'No'`, or `'—'` (unanswered) based on the tri-state model.
- **Excel Export/Import:** Update `src/features/guardian-inventory/excel.js` cell writers and sheet readers to handle tri-state `'Yes'` / `'No'` / `''`.

#### D. Schema & Verification Integrity
- Update `probate-guardian-data-model.csv` rows for `guardian_inventory`, `plan_annual`, and `plan_initial` to reflect `enum ('Yes; No')` data types for migrated fields.
- Add unit test coverage in `tests/unit/` verifying radio rendering, model persistence, calculation formulas, and backward-compatible import handling.

## What was found broken, and fixed, in follow-up test-suite regression checks

A same-day follow-up review (2026-09-13, separate session, while troubleshooting
an unrelated Milestone 44B timeout) ran the full unit and several e2e suites
against this landing and found three pre-existing test failures this migration
introduced but did not itself catch, since `npm test` was not run as part of
this milestone's own landing verification. All three were confirmed via
`git stash`/re-run to be absent on the commit before this migration and
present after, then fixed:

1. **`tests/unit/amended-form-line.spec.js`** — Guardian Inventory's "Amended
   Form?" test still expected an unset filing to print "No" (the pre-migration
   boolean-coercion default). This migration correctly changed
   `emptyDataGuardian()` to seed `amendedForm:''` (unanswered) rather than a
   boolean, and `pdf-model.js`'s `triText()` correctly renders that as blank
   ("—") — consistent with this very file's own Annual/Simplified cases,
   which already expect blank for an unanswered filing. The code was right;
   only the test's stale expectation was wrong. Fixed by updating the test to
   expect "—" for a genuinely untouched filing, while adding explicit
   coverage for both the current tri-state string and the legacy boolean
   fallback answering Yes/No correctly.
2. **`tests/e2e/navigation-status.contract.spec.ts`**'s D-3 field-path test
   still expected the validator's reported path to resolve to a DOM element
   with `id="sdb-yes"` — the pre-migration hand-rolled radio's own id. This
   migration correctly moved D-3 onto the shared `yesNoRadioHTML()` component,
   whose Yes/No inputs share one `data-form-path` value (the real field name,
   `hasSafeDepositBox`) rather than each having a distinct element id derived
   from that name. Fixed by updating the expected path and switching the
   focus-target assertion from an `#id` selector to a `[data-form-path="..."]`
   selector, matching how `focusFieldByPath()` itself resolves the two
   binding conventions differently.
3. **`tests/e2e/guardian-inventory-mount.spec.ts`**'s D-3 lifecycle test
   still asserted `null` for an unanswered `hasSafeDepositBox`/
   `safeDepositBoxFiled` (matching the pre-migration factory default) and
   `true`/`false` booleans after answering (matching the pre-migration write
   path), and still queried the pre-migration `#sdb-yes`/`#sdb-no`/
   `#sdb-filed-yes` element ids. Fixed by updating every assertion to the
   current tri-state string contract (`''`/`'Yes'`/`'No'`) and every
   locator to the shared component's actual rendered ids
   (`#yesno_hasSafeDepositBox_yes`, etc.) — `#sdb-filed-row`'s own wrapper
   id was unchanged and needed no update.

4. **`tests/e2e/verified-inventory-workflow.spec.ts`**'s D-3 tri-state-flow
   test queried the same pre-migration `#sdb-yes`/`#sdb-no`/`#sdb-filed-yes`
   element ids as item 3 above. Fixed by locating via the shared
   component's `data-yes-no-group` fieldset attribute plus
   `input[value="Yes"|"No"]` instead of an id — a slightly more robust
   pattern than the id-based locators used in item 3's fix, since it needs
   no knowledge of `yesNoRadioHTML()`'s internal id-sanitization scheme.

None of these were product-code defects — the migration's actual runtime
behavior was correct in each case; only the tests describing the pre-
migration contract were stale. All four now pass and correctly describe the
current, intentional tri-state behavior. This is recorded here as a reminder
that landing a milestone without running its own full regression suite
(`npm test`) leaves exactly this kind of drift for the next session to find
by accident rather than by design.
