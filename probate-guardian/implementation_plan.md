# Revised Implementation Plan: Declarative "Case Info" (Cover & Summary) Schedule Navigation Across All Forms

## 1. Executive Summary & Design Principles
Based on the architectural critique and requirements:
1. **Single Shared Declarative Renderer (`renderSummaryPage(config)`)**:
   Instead of hand-writing 6 bespoke HTML builders, we extract the Verified Initial Inventory Summary layout into a single, shared declarative renderer `renderSummaryPage(config)`. Each form only provides a concise `getSummaryConfig(data)` function.
2. **Auto-Derived Pagination & Navigation (`pageNavFor(currentRoute)`)**:
   Prev/next buttons, route targets, and `Page X of N` are computed directly from `PAGES[activeInventoryType]`, eliminating hardcoded navigation strings.
3. **Unified Single Source of Truth for Completion**:
   Attestation badges (`✓ Complete`, `In Progress`, `Not Started`) derive directly from `computeNavChecks()` / `validate()`, matching the sidebar and print export gates.
4. **First-Class Banner Variants**:
   - **Financial Forms** (`guardian`, `annual`, `simplified`, `finalAccounting`, `trustAccounting`): High-contrast currency banner showing Net Assets or Ending Balance.
   - **Plan Forms** (`planSimplified`, `planAnnual`, `planInitial`, `planMinor`): Progress & readiness banner showing real metric data (e.g. `X of Y sections complete` and filing readiness).
5. **Enforced Schedule Coverage Testing**:
   Automated test verifying that every schedule route in `PAGES[type]` (excluding `/`, `/summary`, `/print`) is represented on that form's Summary page.
6. **Print & Persistence Safety**:
   Verify `/summary` is strictly excluded from print/PDF generation and introduces zero persisted state into `.sav` files.

---

## 2. Declarative Architecture

### A. Shared Renderer Schema (`src/core/summary-renderer.js` / `window.renderSummaryPage`)
```typescript
interface SummaryCardLine {
  label: string;
  route?: string;            // Clickable link target
  anchor?: string;           // Optional element id anchor
  value?: string;            // Formatted dollar amount or text
  status?: 'complete' | 'in-progress' | 'not-started'; // For checklists
  isTotal?: boolean;         // Bold styling / top border
}

interface SummaryCard {
  heading: string;
  lines: SummaryCardLine[];
  footerAction?: { label: string; route: string };
}

interface SummaryBanner {
  kind: 'currency' | 'progress' | 'status';
  title: string;
  value: string;
  subtitle?: string;
  tone?: 'brand' | 'success' | 'warning';
}

interface SummaryConfig {
  formTitle: string;         // e.g. "Annual Accounting — Summary"
  actionPrefix: string;      // e.g. "inventory", "annual", "simplified", "plan"
  leftCards: SummaryCard[];
  rightCards: SummaryCard[];
  attestationsCard?: SummaryCard;
  banner: SummaryBanner;
}
```

### B. Auto-Derived Schedule Navigation (`pageNavFor(currentRoute)`)
Refactor navigation helpers into `pageNavFor(currentRoute)`:
- Looks up `PAGES[activeInventoryType]`.
- Computes index: `Page ${idx + 1} of ${pages.length}`.
- Sets previous route to `pages[idx - 1].id` with label `← Previous: ${pages[idx - 1].label}`.
- Sets next route to `pages[idx + 1].id` with label `Next: ${pages[idx + 1].label} →`.
- Automatically respects schedule completion gating where applicable.

---

## 3. Staged Implementation Steps

### Step 1: Core Engine & Shared Infrastructure
1. Create `src/core/summary-renderer.js` (or export on `window` in `src/legacy-app.js`):
   - Implements `renderSummaryPage(config)`.
   - Implements `pageNavFor(currentRoute)`.
   - Implements standard badge formatter `renderStatusBadge(status)`.
2. Update `PAGES_SIMPLIFIED`, `PAGES_ANNUAL`, `PAGES_PLAN_SIMPLIFIED`, `PAGES_PLAN_ANNUAL`, `PAGES_PLAN_INITIAL`, `PAGES_PLAN_MINOR` in `src/legacy-app.js` to insert `{id:'/summary', label:'Summary'}` as the 2nd item.
3. Update `getCurrentPageKey()` in `src/legacy-app.js` to associate `/summary` with `Case Info`.

### Step 2: Re-point Verified Initial Inventory (`guardian`)
1. Implement `getSummaryConfigGuardian(D, calc)` in `src/features/guardian-inventory/`.
2. Re-point `pageSummary()` to `renderSummaryPage(getSummaryConfigGuardian(D, calc))`.
3. **Verification**: Confirm 0 visual diff against the original Verified Initial Inventory layout.

### Step 3: Implement Annual Accounting (`annual`, `finalAccounting`, `trustAccounting`)
1. In `src/features/annual-accounting/`:
   - Implement `getSummaryConfigAnnual(D, calcTotalsAnnual, annualReconcileState)`.
   - Left Column: Receipts & Disbursements (Sch A, B1–B4, C, Line 20) and Assets & Liabilities (Sch D1–D5, E, F1/F2, Line 30).
   - Right Column: Reconciliation & Bond (Line 20 vs Line 30 status, Trusts, Bond, Remuneration) and Attestations (Part III, IV, V, VI/VII, X).
   - Banner: `ANNUAL ACCOUNTING — NET ASSETS ON HAND` ($...).
   - Add `/summary` to `renderPageAnnual()` route dispatch.
   - Update `buildNavAnnual()` to group `Case Info` (`Cover`, `Summary`), `Accounting Parts`, `Schedules`, `Certification`, `Output`.
   - Wire `pageNavFor` on all pages.
2. Add schedule coverage test and calculation reconciliation tests.

### Step 4: Implement Simplified Annual Accounting (`simplified`)
1. In `src/features/simplified-accounting/`:
   - Implement `getSummaryConfigSimplified(D, calcTotals)`.
   - Left Column: Lines 1–4 financial breakdown and Depository eligibility.
   - Right Column: Remuneration (Part VII) and Attestations (Part III, IV, V, VI).
   - Banner: `SIMPLIFIED ACCOUNTING — YEAR-ENDING ASSETS` ($...).
   - Add `/summary` to `renderPageSimplified()` route dispatch.
   - Update `buildNavSimplified()` with `Case Info` (`Cover`, `Summary`).

### Step 5: Implement the 4 Plan Forms
1. **Simplified Annual Plan (`planSimplified`)**:
   - `getSummaryConfigPlanSimplified(D)`: Residence & Care (Q1–4), Rights & Wellbeing (Q5–9), Physician report notice, Signatures checklist.
   - Banner: `SIMPLIFIED ANNUAL PLAN PROGRESS` (`X of 9 sections complete`).
2. **Annual Guardianship Plan (`planAnnual`)**:
   - `getSummaryConfigPlanAnnual(D)`: Living Arrangements (Sec 1–3), Medical/Rights/ADLs (Sec 4–9), Directives/Remuneration (Sec 10–11), Signatures checklist.
   - Banner: `ANNUAL GUARDIANSHIP PLAN PROGRESS` (`X of 11 sections complete`).
3. **Initial Guardianship Plan (`planInitial`)**:
   - `getSummaryConfigPlanInitial(D)`: Initial Setting (Sec 2–5), Social/Examining/ADLs (Sec 6–10), Directives & Disaster Plan, Signatures checklist.
   - Banner: `INITIAL GUARDIANSHIP PLAN PROGRESS` (`X of 10 sections complete`).
4. **Annual Plan — Minors (`planMinor`)**:
   - `getSummaryConfigPlanMinor(D)`: Minor Residence & Care (Sec 2–4), Education & Social (Sec 5), Court info, Signatures checklist.
   - Banner: `ANNUAL MINOR PLAN PROGRESS` (`X of 7 sections complete`).

---

## 4. Verification & Testing Plan

### 1. Automated Schedule Coverage & Completeness Test
- Add `tests/unit/summary-coverage.spec.js` (or E2E equivalent):
  - For each of the 9 form types:
    - Assert that every route in `PAGES[type]` (excluding `/`, `/summary`, `/print`) is represented by at least one link on that form's Summary page.
    - Assert that `/summary` renders `Page 2 of N` with Next pointing to page 3 and Previous pointing to Cover.

### 2. Form Calculation & Data Integrity Tests
- In `tests/e2e/routes.spec.ts` and `*-mount.spec.ts`:
  - Verify that summary page totals match known fixture inputs for each accounting type (Inventory total, Annual line 20/30, Simplified line 4).
  - Verify plan forms show accurate section completion counts in their banner.

### 3. Print Preview & Export Isolation Test
- Assert that `/summary` is **NOT** included in the print preview DOM or generated PDF output for any form.

### 4. Persistence & Backward Compatibility Test
- Verify that saving a `.sav` file and reopening it introduces no `/summary` persisted state and restores the ward data without error (`tests/e2e/save-open-sav.spec.ts`).

### 5. Visual Regression & Responsiveness Test
- Run `tests/e2e/dashboard-visual.spec.ts` across viewports (1400px, 1100px, 800px, 400px) and light/dark themes.
