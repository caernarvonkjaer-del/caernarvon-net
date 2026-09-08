# Milestone 26: Unified Form Engine, Field Centralization & Accessible Combobox Controller

## Goal

Centralize and standardize form control rendering, repeatable card row operations, and typeahead comboboxes across all 9 Florida probate form types:

1. **Unified Form Field Generator (`renderFormField`)**: Consolidate `inpD()` (Annual), `inpS()` (Simplified & Plans), `dateInput()` (Guardian Inventory), and `dateInputHTML()` (Core) into a single, canonical field generation API in `src/core/form/form-fields.js`.
2. **Accessible Typeahead / Combobox Controller**: Replace duplicated dropdown/combobox logic across the Ward Picker, County Selector, Party Picker, and Case Picker with a single, fully accessible `ComboboxController` supporting keyboard navigation (Arrow Up/Down, Enter, Escape, Tab), ARIA `role="combobox"` / `role="listbox"`, and live-region matching.
3. **Declarative Schedule & Repeatable Row Schemas**: Centralize repeatable group definitions (factories, maximums, minimum floors, and party ID synchronization) into declarative schema dictionaries with custom hooks for complex schedules (e.g. Schedule B-4 category breakdowns and Schedule E paired transfers).
4. **Eliminate Duplicated HTML Templates & Heuristics**: Remove ad-hoc regex label heuristics scattered across feature directories, ensuring consistent tooltips, format policies (`preserve`, `normalize`, `display-only`), and accessible hints.

---

## Why This Is Needed

Across Milestones 1–25, feature templates were extracted into dedicated feature folders (`src/features/annual-accounting/`, `src/features/simplified-accounting/`, `src/features/guardian-inventory/`, `src/features/plan-*/`). While this modularized the pages, each feature retained or reimplemented its own field generation helpers:

- **`inpD`** in Annual Accounting manually parses label strings with 12 distinct regexes on every render to classify kinds (`isDate`, `isSSN`, `isPhone`, `isCaseNumber`, `isZip`, etc.) and sets `data-annual-path`.
- **`inpS`** in `legacy-app.js` runs a near-identical set of label regexes but sets `data-form-path`.
- **`dateInput`** in Guardian Inventory sets `data-bind`.
- **`dateInputHTML`** in `date-parser.js` sets `data-field-path`.

This drift creates maintenance overhead and subtle inconsistencies in tooltip styling, error classes (`is-invalid`), ARIA descriptions (`aria-describedby`), and live auto-masking. Consolidating into a single engine directly extends the Milestone 24/25 Form Contract.

---

## Non-Negotiables

1. **Zero Data Model & `.sav` Breakage**: All fields must continue to read and write canonical paths (e.g. `window.D.periodFrom`, `window.D.guardians[0].name`) and preserve existing `.sav` archive structure.
2. **Strict Accessibility Parity**: Every rendered field must output proper `<label for="...">`, `aria-describedby` hint associations, and `aria-invalid` error states.
3. **Single-File Portable Build Compatibility**: All new modules must bundle seamlessly with `vite-plugin-singlefile` without generating runtime external module requests.
4. **Preserve Party Linking Synchronicity**: Resequencing and removing repeatable cards (guardians, recipients) must continue to update parallel `guardianPartyIds` arrays in lockstep.
5. **No Regressions on Bespoke Financial Rows**: Custom validation/formatting rules (e.g., Schedule B-4's category groupings and Schedule E's paired transfer dates/amounts) must be preserved via declarative schema hooks.
6. **100% Test Suite Green**: All 108+ Vitest unit tests and 202+ Playwright E2E tests must pass with 0 failures under `workers: 1`.

---

## Detailed Deliverables

### 1. Canonical `renderFormField()` Engine (`src/core/form/form-fields.js`)

Create a centralized field renderer:
```javascript
export function renderFormField({
  path,
  label,
  value = '',
  type = 'text',           // 'text' | 'number' | 'date' | 'email' | 'password' | 'select' | 'checkbox'
  kind = null,             // 'identifier' | 'date' | 'money' | 'phone' | 'ssn' | 'name' | 'address' | 'zip' | 'caseNumber' | 'barNumber' | 'accountNumber' | 'checkNumber'
  policy = null,           // 'preserve' | 'normalize' | 'display-only'
  required = false,
  tooltipKey = null,
  options = [],            // for select dropdowns
  className = 'form-control',
  hint = null,
  syncWardName = false,
  syncGuardianName = false,
  id = null,
}) { ... }
```
- Automatically resolves `kind`, `policy`, and `format` attributes.
- Automatically handles Dollar/Percent input-group wrapping, SSN mask/reveal toggles, date hints, and tooltip overlays.
- Emits standardized data attributes (`data-field-path`, `data-form-path`, `data-field-kind`, `data-field-format-policy`, `data-field-required`).

### 2. Standardized Typeahead / Combobox Controller (`src/core/form/combobox-controller.js`)

Unify combobox implementations:
- Encapsulate rendering, active item tracking, keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`), blur timeout closing, and screen-reader status announcements.
- Wire into Ward Selector, County Autocomplete, Party Directory / Link Person Picker, and Case Picker.

### 3. Declarative Schedule & Group Schemas (`src/core/form/schedule-definitions.js`)

Centralize repeatable collection rules:
```javascript
export const SCHEDULE_SCHEMAS = {
  guardians: {
    factory: () => ({ name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '' }),
    label: 'Co-Guardian',
    max: 3,
    floor: 1,
    syncPartyIds: 'guardianPartyIds',
  },
  certRecipients: {
    factory: () => ({ name: '', line2: '', line3: '', line4: '' }),
    label: 'Service Recipient',
    max: Infinity,
    floor: 1,
  },
  schA: {
    factory: () => ({ payer: '', description: '', bank: '', accountNo: '', amount: '' }),
    label: 'Income Entry',
    max: Infinity,
    floor: 0,
  },
  // ... Schedules B1-B4, C, D1-D5, E, F1-F2, Plan repeatable rows
};
```

### 4. Feature Module Migration

Refactor feature templates to import and call `renderFormField`:
- `src/features/annual-accounting/index.js`
- `src/features/simplified-accounting/index.js`
- `src/features/guardian-inventory/index.js`
- `src/features/plan-*/index.js`

---

## Critical Implementation Watch-Outs

1. **Dual Event Delegate Compatibility**:
   - `form-events.js` currently listens for `data-form-path`, while `annual-accounting/index.js` listens for `data-annual-path`.
   - `renderFormField()` must emit the canonical `data-field-path` while also outputting `data-form-path` so existing global listeners in `form-events.js` seamlessly handle all forms without event deadlocks.
2. **Party ID Lockstep Re-sequencing**:
   - Repeatable party card CRUD (co-guardians, service recipients) must re-index the parallel `window.D.guardianPartyIds` array in lockstep whenever cards are deleted or re-ordered, preserving "Link to Shared Record" mappings.
3. **Complex Schedule Validation & Totals Hooks**:
   - Schedule B-4 (18 statutory disbursement categories) and Schedule E (paired transfer in/out with signed decimals) rely on custom totals calculations (`calcTotalsAnnual`). The declarative schema must support custom row-level transform and totals callbacks.

---

## Verification Plan

### Automated Unit Tests (`vitest`)
- `tests/unit/form-fields.spec.js`: Test field generator for every field kind, input-group wrapper, SSN reveal button, tooltip association, and validation attribute.
- `tests/unit/combobox-controller.spec.js`: Test filtering, keyboard navigation events, selection callbacks, and ARIA attributes.
- Full suite verification: `npx vitest run` (all 16 test files pass).

### Automated E2E Tests (`playwright`)
- `tests/e2e/form-entry-ux.spec.ts`
- `tests/e2e/annual-mount.spec.ts`
- `tests/e2e/simplified-mount.spec.ts`
- `tests/e2e/guardian-inventory-mount.spec.ts`
- `tests/e2e/attestation-layout.spec.ts`

### Build Parity
- `npm run build:web` (chunked PWA)
- `npm run build:portable` (single-file HTML)
