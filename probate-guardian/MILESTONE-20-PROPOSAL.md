# Milestone 20: PDF Visual Formatting Harmonization (Eleanor Standard)

## Goal

Harmonize and restore the dense, high-contrast, authoritative visual design from the pre-Milestone 19 format (demonstrated in the reference *Eleanor* document) across all seven Florida probate guardianship court forms (`guardian-inventory`, `annual-accounting`, `simplified-accounting`, `plan-initial`, `plan-annual`, `plan-minor`, and `plan-simplified`).

This milestone eliminates visual regressions and layout drift introduced during the Milestone 19 render unification—most notably the ballooning page count (e.g., 17 pages vs. 10 pages for full inventories), low-contrast ice-blue table headers, unbounded top headers, and boxed signature card containers—while strictly preserving all PDF/UA-1 (ISO 14289-1), WCAG 2.1 AA tagged structure tree, embedded Liberation Sans font programs, and offline single-file execution capabilities.

---

## Non-Negotiables

1. **Zero Regression in WCAG 2.1 AA / PDF/UA-1 Conformance** — All structural tags (`/StructTreeRoot`, `/ParentTree`, `BDC`/`EMC`, `/TH`, `/TD`, `/Scope`, `/Summary`), `<pdfuaid:part>1</pdfuaid:part>` XMP declarations, and embedded TrueType font programs must remain 100% compliant.
2. **Page Economy & Natural Density** — Eliminate artificial 1-sentence pages caused by hardcoded `pageBreakBefore: true` flags on empty/minor schedules. Let content flow continuously, breaking pages only across major Part boundaries or when dynamic `checkPageSpace()` detects vertical margin exhaustion.
3. **100% Client-Side & Offline Execution** — All rendering remains pure vector/text jsPDF operations; zero runtime network requests in both `web` and `portable` builds.
4. **Universal Form Application** — All visual formatting enhancements apply universally across all seven court forms through the centralized `src/core/pdf/pdf-engine.js` engine and feature model definitions.

---

## Visual Drift Findings & Target Standards (Eleanor vs. Harold)

| Visual Category | Pre-Milestone 19 Standard (*Eleanor*) | Post-Milestone 19 Drift (*Harold*) | Milestone 20 Target Specification |
| :--- | :--- | :--- | :--- |
| **Top Metadata Bar** | Framed 3-column bounded box with vertical dividing rules | Plain text line with loose horizontal rule below | **Framed 3-column box** (`doc.rect` with vertical dividing rules) directly below centered court caption: `Name of Ward: ...` \| `[Section / Schedule Title] — Page X` \| `Case Number: ...` |
| **Section Titles (H1/H2)** | Strong dark/black text with sharp underline rule spanning content width | Maroon `#820024` text floating loosely without underline rule | **Bold black text (`#000000`)** with a distinct 0.75pt underline rule (`#B0BAC8`) across full content width |
| **Table Headers** | Deep Burgundy (`#800020` / `#7B112B`) with bold white text (`#FFFFFF`) | Pale ice-blue (`#EEF2F8`) with dark navy text (`#1a2d4a`) | **Deep Burgundy (`#800020` / RGB `[128, 0, 32]`)** with bold white text (`#FFFFFF`) and clean vertical column dividers |
| **Table Rows & Striping** | Crisp alternating zebra striping (`#FFFFFF` and subtle cool gray `#F8F9FA`) | `#FCFDFF` (barely visible tint) with weak row borders | **Crisp alternating zebra striping** (`#FFFFFF` & `#F8F9FA`) with 0.5pt grid borders (`#D0D5DD`) and dense 16pt row height |
| **Table Totals Row** | Highlighted tint with bold dark text and strong double/heavy border | Light gray `#F2F5FA` single border | **Highlighted tint (`#EAEFF5`)** with bold text (`#111827`) and strong top/bottom border rules |
| **Key-Value Grids** | Structured 2/4-column form grid with shaded label cells (`#F1F3F6`) | `#F8FAFC` label cells with loose padding | **Structured 2/4-column form grid** with shaded label cells (`#F1F3F6`), pure white value cells, and crisp borders |
| **Notices & Verification** | In-line compact verification notices within shaded callout block | Forced onto standalone pages (`pageBreakBefore: true`) | **In-line compact verification notices** (`#F8F9FA` background, `#D0D5DD` border) flowing naturally |
| **Signature Blocks** | Classic legal horizontal underline rules (`____________________`) | Bulky boxed card container (`doc.rect` filled container) | **Classic legal horizontal underline rule** (`____________________`) with selectable `/s/` or wet-ink line and multi-column contact info |
| **Page Flow & Page Count** | Dense 10 pages for full filing | Inflated to 17 pages due to empty schedule page breaks | **Dense ~10 pages** via dynamic `checkPageSpace()` continuous flow |

---

## Implementation Slices

### Slice 20A — Core PDF Engine Visual Primitives (`src/core/pdf/pdf-engine.js`)

1. **Top Header & Metadata Bar**:
   - Update `drawHeader`:
     - Centered court caption: `IN THE CIRCUIT COURT FOR ${county} COUNTY, FLORIDA` (bold, 8.5pt, `#1a2d4a`) & `PROBATE DIVISION — ${formTitle}` (bold, 10pt, `#1a2d4a`).
     - Framed 3-column metadata bar box at y=46 to y=64 (height = 18pt) with full outer border and vertical column divider lines at `margin + 180` and `margin + 360`.
     - Column 1: `Name of Ward: ${wardName}` (left-aligned at `margin + 6`).
     - Column 2: `${sectionTitle || ''}` (centered at `margin + 270`).
     - Column 3: `Case Number: ${caseNumber || 'Pending'}` (right-aligned at `pageWidth - margin - 6`).
   - Set content `curY` to start at `74pt`.

2. **Section Headings**:
   - `H1` titles: bold 11pt `#000000` text with a 0.75pt underline rule spanning `contentWidth` directly below the heading text.
   - `H2` sub-headings: bold 9.5pt `#1a2d4a` text with clean baseline spacing.

3. **Table Headers**:
   - Background fill: Deep Burgundy (`#800020` / RGB `[128, 0, 32]`).
   - Text: Pure White (`#FFFFFF` / RGB `[255, 255, 255]`), bold 8pt.
   - Subtle vertical column divider lines inside table headers.

4. **Table Rows & Zebra Striping**:
   - Row 0: `#FFFFFF` (pure white).
   - Row 1: `#F8F9FA` (cool gray tint).
   - Cell borders: 0.5pt `#D0D5DD`.
   - Text: `#111827` (crisp dark neutral), with secondary sub-lines (notes, addresses) rendered in 6.5pt italic/gray.

5. **Table Totals Row**:
   - Background fill: `#EAEFF5` (RGB `[234, 239, 245]`).
   - Bold label and right-aligned values in `#111827`.
   - Top border 0.75pt `#B0BAC8` and bottom border 1.0pt `#B0BAC8`.

6. **Key-Value Grids**:
   - Label cells: `#F1F3F6` background with bold 8pt `#374151` text.
   - Value cells: `#FFFFFF` background with regular 8pt `#111827` text.
   - Crisp grid borders enclosing every cell.

7. **Signature Blocks**:
   - Remove outer gray boxed card container.
   - Draw horizontal signature line `________________________________________` at y + 36 (`doc.line(margin + 6, curY + 36, margin + 250, curY + 36)`).
   - For electronic signatures: render selectable `/s/ ${block.signerName}` directly above/on the line, followed by the statutory electronic-signature citation below.
   - For wet-ink signatures: leave line blank with a 7.5pt "Signature" label below.
   - Render date line on right with line if present.
   - Render multi-column contact metadata grid (Name, Title, Address, Phone, Email, Bar #) cleanly beneath.

---

### Slice 20B — Form Models Continuous Flow & Page Economy Optimization

1. **`src/features/guardian-inventory/pdf-model.js`**:
   - Update `addScheduleSection`: remove `pageBreakBefore: true`.
   - Allow schedules A-1, A-2, B-1, B-2, B-3, B-4, C-1, C-2, C-3, C-4, C-5 to flow continuously, breaking only when vertical space runs out via `checkPageSpace()`.
   - Preserve major Part boundaries (Part I Cover, Part II Summary, Part III Assets start, Part IV Attestations start).
   - Allow empty schedules to render compact in-line verification notice blocks without generating blank pages.

2. **`src/features/annual-accounting/pdf-model.js`**:
   - Optimize schedule section definitions (A, B-1 through B-6, C-1 through C-4, D-1 through D-7, E, F) to eliminate unnecessary hard page breaks on empty schedules.

3. **`src/features/simplified-accounting/pdf-model.js`**:
   - Optimize section flow across bank account schedules, receipts, disbursements, and attestations.

4. **`src/features/plan-*/pdf-model.js` (`plan-initial`, `plan-annual`, `plan-minor`, `plan-simplified`)**:
   - Optimize section page breaks across ADL tables, benefits tables, rights restoration tables, physician reports, and attestations for natural, dense layout.

---

### Slice 20C — Automated Regression Verification & E2E Test Suite

1. **`tests/e2e/pdf-wcag-compliance.spec.ts` & `tests/e2e/plan-pdf-wcag-compliance.spec.ts`**:
   - Update any strict page-count assertions that previously expected 17 pages for synthetic empty-schedule filings.
   - Verify that all tagged PDF structure elements (`/StructTreeRoot`, `/ParentTree`, `BDC`/`EMC`, `/TH`, `/TD`, `/Scope`), `<pdfuaid:part>1</pdfuaid:part>`, and embedded TrueType fonts pass 100%.
2. Run full test suite:
   - `npm run test:unit`
   - `npm run test:e2e`
   - `npm run build` (both `web` and `portable` distribution targets).

---

## Acceptance Criteria

- [x] Top metadata bar renders as a framed 3-column bounded box with vertical divider rules across all forms.
- [x] Table headers render with Deep Burgundy (`#800020`) background and crisp white (`#FFFFFF`) bold text.
- [x] Table rows render with alternating zebra striping (`#FFFFFF` / `#F8F9FA`) and clean 0.5pt grid lines.
- [x] Table totals render with highlighted `#EAEFF5` background and reinforced border lines.
- [x] Section headings render with bold black text and solid content-width underline rules.
- [x] Key-value grids render with shaded `#F1F3F6` label cells and white value cells.
- [x] Signature blocks render with classic legal horizontal underline rules and clean contact info grids (no outer gray card container).
- [x] Empty schedules render compact in-line verification blocks without forcing artificial page breaks.
- [x] Page count for full Verified Initial Inventory returns to dense ~10 pages (Eleanor standard).
- [x] Full unit test suite (`vitest run`) and Playwright E2E suite (`playwright test`) pass with 0 errors (34/34 unit, 23/23 E2E).
- [x] Both `web` and `portable` builds build cleanly and operate 100% offline.
