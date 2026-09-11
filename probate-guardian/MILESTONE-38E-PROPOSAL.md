# Milestone 38E: Global Explicit Yes/No Radio-Pair Migration

## Status

**Executable, independently deliverable specification.**

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
