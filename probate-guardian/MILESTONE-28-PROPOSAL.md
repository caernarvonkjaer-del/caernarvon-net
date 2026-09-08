# Milestone 28: Export Engines, Performance & CSS Modularization

## Goal

Modernize export engines, eliminate legacy payload bloat, lazy-load spreadsheet tooling, and decompose the 100 KB monolithic stylesheet into a clean, maintainable design system:

1. **Shared Excel Engine (`src/core/excel/excel-engine.js`)**:
   - Create a centralized Excel generator modeled after `src/core/pdf/pdf-engine.js` and `src/core/docx/docx-engine.js`.
   - Abstract ExcelJS boilerplate (cell styling, border definitions, sheet protection, number formatting, header banners, formulas) so feature modules (`annual-accounting/excel.js`, `guardian-inventory/excel.js`, `simplified-accounting/excel.js`) contain only high-level declarative cell mappings.
2. **On-Demand Dynamic Loading of `ExcelJS`**:
   - Move `ExcelJS` from `<head>` in `index.html` to a dynamic loader (`src/core/excel/exceljs-loader.js`), loading the library only when an Excel import or export is explicitly triggered.
3. **Remove Legacy `html2pdf.bundle.min.js`**:
   - Completely remove `lib/html2pdf.bundle.min.js` from `<head>` and repository assets now that the native `jsPDF` + `pdf-lib` + `PDF.js` vector pipeline handles 100% of PDF generation and print previews.
4. **CSS Modularization**:
   - Split `src/styles/app.css` (~100 KB) into structured CSS layers:
     - `src/styles/tokens.css` (Design tokens: color palettes, typography, spacing, shadows, z-indexes)
     - `src/styles/shell.css` (App layout, sidebar, mobile topbar, toasts, banners)
     - `src/styles/forms.css` (Form controls, input groups, floating labels, validation states, masks)
     - `src/styles/cards.css` (Attestation cards, schedule rows, repeatable items, party blocks)
     - `src/styles/dashboard.css` (Filing grid, compliance overview, badge chips)
     - `src/styles/modals.css` (Modal dialogs, dropzones, overlays)
     - `src/styles/print.css` (Print layout, page breaks, print preview canvas)
   - Ensure Vite's build pipeline flattens these modules for `dist/portable/index.html` without external network requests.
5. **Memory & Object URL Management**:
   - Guarantee systematic `URL.revokeObjectURL()` cleanup after PDF blob rendering and Excel/DOCX file downloads to prevent memory accumulation in extended sessions.

---

## Why This Is Needed

1. **Export Code Duplication**: Feature modules currently spend hundreds of lines configuring ExcelJS font names, colors, alignment rules, and column widths manually. A centralized engine ensures consistent font scales, header styling, and currency formats across all court accounting workbooks.
2. **Initial Load Payload**: Statically bundling ExcelJS and legacy html2pdf in the initial HTML document adds ~1.5 MB of unneeded JavaScript parse overhead during application boot.
3. **CSS Maintainability**: A single 100 KB stylesheet makes finding and modifying component styles error-prone. Modularizing into design system tokens and component stylesheets prevents CSS rule collisions.

---

## Non-Negotiables

1. **Excel Formula & Cell Precision**: Excel exports must maintain exact cell coordinate compatibility (e.g. Schedule A1 mapping to E14, Part III totals formulas) across all three accounting workbooks.
2. **Zero Visual Regression**: Dark theme, light theme, mobile responsive views, and Print Preview canvas styling must render identically.
3. **Portable Single-File Integrity**: `npm run build:portable` must continue to inline all CSS rules directly into `dist/portable/index.html`.
4. **100% Test Suite Green**: All 108+ Vitest unit tests and 202+ Playwright tests must pass with 0 failures under `workers: 1`.

---

## Deliverables & Architecture

```text
src/
  core/
    excel/
      exceljs-loader.js        # Dynamic import wrapper (lazy-loads ExcelJS on demand)
      excel-engine.js          # Shared workbook creator, styling, cell protection, formulas
  styles/
    tokens.css                 # CSS variables, color palettes, dark/light theme definitions
    shell.css                  # Header, sidebar, navigation, status indicators
    forms.css                  # Input formatting, validation classes, hints
    cards.css                  # Schedule cards, attestation rows
    dashboard.css              # Dashboard overview, summary cards
    modals.css                 # Overlays and dialogs
    print.css                  # Paper styling & print preview
    app.css                    # Main entry point importing modular layers
```

---

## Critical Implementation Watch-Outs

1. **Excel Cell Coordinate Precision**:
   - Florida court accounting workbooks enforce exact cell coordinates (e.g., Schedule A-1 entries starting at row 14, Part III totals formulas referencing dynamically expanding row ranges).
   - `src/core/excel/excel-engine.js` must consume declarative cell-coordinate mapping definitions to guarantee 100% cell formula alignment.
2. **CSS `@import` Flattening in Bundler**:
   - In `src/styles/app.css`, `@import` rules will be used to structure the design system. Vite's build pipeline must flatten these imports during production builds so that `dist/portable/index.html` has zero unbundled `@import` statements.
3. **Static Copy Plugin Cleanup**:
   - In addition to removing `<script src="lib/html2pdf.bundle.min.js">` from `index.html`, remove `html2pdf.bundle.min.js` from `vite.config.js` (`vite-plugin-static-copy` targets) to avoid copying unneeded legacy files into `dist/`.

---

## Verification Plan

### Automated Unit Tests (`vitest`)
- `tests/unit/excel-engine.spec.js`: Test workbook construction, cell formatting, currency mask application, formula generation, and sheet protection.
- `tests/unit/docx-engine.spec.js`: Confirm DOCX export remains fully functional.
- Full Vitest suite: `npx vitest run`.

### Automated E2E Tests (`playwright`)
- `tests/e2e/annual-mount.spec.ts` (Exercises Excel export and template re-import round-trip)
- `tests/e2e/simplified-mount.spec.ts` (Exercises Simplified Excel export/import)
- `tests/e2e/pdf-preview-viewer.spec.ts` (Verifies print preview styles and vector rendering)
- `tests/e2e/dashboard-visual.spec.ts` (Verifies dashboard visual token styling)

### Performance & Build Verification
- Inspect `dist/web/` bundle sizes to confirm initial script weight reduction.
- Verify `dist/portable/index.html` contains inlined CSS and functions without external requests.
