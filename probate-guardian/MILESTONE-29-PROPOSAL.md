# Milestone 29: Type Contracts, Static Validation & Developer Experience

## Goal

Introduce comprehensive static type safety and contract verification across the entire Probate Guardian codebase using JSDoc `@typedef` annotations and TypeScript's zero-build type checker (`tsc --noEmit --checkJs`), without altering the Vanilla JS runtime architecture or adding a runtime TypeScript compilation step:

1. **Formal Data Model Contracts (`src/core/types/`)**:
   - Define canonical JSDoc typedefs for all core application entities:
     - `CaseFile`: Top-level `.sav` JSON container (wards, shared parties, shared cases, metadata).
     - `Ward`: Individual filing record (inventoryType, header fields, schedules A–F, scheduleDocs, prior years).
     - `Party`: Shared person directory record (role, name, SSN/EIN, barNumber, contact fields).
     - `Case`: Shared legal matter record (caseNumber, county, courtName).
     - `FormContract`: Field descriptor, kind classifications, and formatter policies.
     - `ScheduleSchema`: Repeatable card factories, validation hooks, and party ID linkage.
2. **Static Type Checking Script (`npm run check:types`)**:
   - Configure `tsconfig.json` for JSDoc type checking with `"checkJs": true` and `"noEmit": true`.
   - Provide instant IDE autocomplete, rename safety, and compile-time type verification.
3. **CI & Pre-Commit Type Guard**:
   - Add `npm run check:types` to the verification pipeline alongside `npm test` (`vitest` + `playwright`) and `npm run build`.

---

## Why This Is Needed

Probate Guardian is a mission-critical legal and financial application managing 9 distinct Florida probate form types, complex asset schedules, and multi-year accounting rollover.

Because the project intentionally uses Vanilla JS for maximum runtime simplicity and single-file portability, structural refactoring has historically relied exclusively on runtime unit and E2E tests. Introducing JSDoc-driven static analysis:
- Catches typos in deeply nested model paths (e.g. `d.scheduleA1[0].propertyDescription` vs `d.schD2[0].description`) at authoring time.
- Documents the shape of every filing type and schedule row in code rather than external documentation.
- Eliminates "silent undefined" bugs during data transformations without requiring a heavyweight TypeScript build toolchain.

---

## Non-Negotiables

1. **Zero Runtime Impact**: Type checking must be purely static (`noEmit: true`). The runtime scripts executed in browsers, PWA bundles, and portable single-file builds must remain standard Vanilla JavaScript.
2. **Exact Data Realism**: Type definitions must accurately reflect the real-world shapes stored in `.sav` case files and returned by form validators, including legacy optional fields and multi-year arrays.
3. **Zero Linting Noise**: Type definitions must be strict where models are well-defined, with clean union types (`'annual' | 'simplified' | 'guardian' | 'planAnnual' | ...`) rather than generic `any`.
4. **100% Test Suite Green**: `npm test` (all Vitest and Playwright suites) must continue to pass seamlessly.

---

## Deliverables & Architecture

### 1. Type Definitions (`src/core/types/`)

```text
src/
  core/
    types/
      case-file.js             # @typedef {Object} CaseFile, @typedef {Object} CaseMetadata
      filing.js                # @typedef {Object} Ward, @typedef {Object} FilingDescriptor
      parties.js               # @typedef {Object} Party, @typedef {Object} SharedCase
      schedules.js             # @typedef {Object} SchAItem, @typedef {Object} SchD1Item, ...
      form-contract.js         # @typedef {Object} FieldDescriptor, @typedef {Object} ValidationResult
```

Example Definition:
```javascript
/**
 * @typedef {Object} Ward
 * @property {string} wardId
 * @property {'guardian'|'simplified'|'annual'|'trustAccounting'|'finalAccounting'|'planInitial'|'planAnnual'|'planMinor'|'planSimplified'} inventoryType
 * @property {string} [wardName]
 * @property {string} [caseNumber]
 * @property {string} [county]
 * @property {string} [gid]
 * @property {string} [periodFrom]
 * @property {string} [periodTo]
 * @property {Array<GuardianEntry>} [guardians]
 * @property {Array<string>} [guardianPartyIds]
 * @property {Record<string, Record<string, ScheduleDocSlot>>} [scheduleDocs]
 */
```

### 2. TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

### 3. NPM Script Integration

In `package.json`:
```json
"scripts": {
  "check:types": "tsc --noEmit",
  "verify": "npm run check:types && npm test && npm run build"
}
```

---

## Critical Implementation Watch-Outs

1. **Incremental Type Strictness**:
   - When enabling `checkJs: true`, ensure `tsconfig.json` specifies `"skipLibCheck": true` and `"maxNodeModuleJsDepth": 0` so that vendored legacy scripts in `lib/` (Bootstrap, JSZip, etc.) are excluded from static analysis.
2. **Strong Union Types vs. Generic Strings**:
   - Model paths and filing inventory types must be typed as strict union types (e.g. `'annual' | 'simplified' | 'guardian' | 'finalAccounting' | 'trustAccounting' | 'planInitial' | 'planAnnual' | 'planMinor' | 'planSimplified'`), ensuring invalid strings fail during static analysis.
3. **CI Pipeline Integration**:
   - Add `npm run check:types` directly into the root `npm test` script so that all local verification runs and automated checks validate types alongside unit and E2E tests.

---

## Verification Plan

### Static Validation
- Run `npm run check:types` and confirm 0 type errors across `src/` and `tests/`.

### Automated Test Parity
- Run `npm test` (108+ Vitest unit tests, 202+ Playwright E2E tests).
- Run `npm run build` (`build:web` and `build:portable`).
