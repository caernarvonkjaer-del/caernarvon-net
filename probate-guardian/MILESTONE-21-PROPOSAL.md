# Milestone 21: Florida Court Rules Layout Compliance (Rule 2.520, Rule 2.515, First-Page Pleading Header & "/s/" Signature Toggle)

## Goal

Align the shared vector/text PDF generation engine (`src/core/pdf/pdf-engine.js`), document accessibility tree (`src/core/pdf/pdf-accessibility.js`), user interface attestation cards, and all seven Florida probate court form models with:
1. **First-Page Formal Court Pleading Header** matching Florida judicial practice:
   - Dynamic Florida Judicial Circuit lookup from selected County (e.g. *Pinellas* $\to$ *Sixth Judicial Circuit*, *Hillsborough* $\to$ *Thirteenth*, *Orange* $\to$ *Ninth*, *Miami-Dade* $\to$ *Eleventh*, etc.)
   - Centered court banner: `IN THE CIRCUIT COURT OF THE [NTH] JUDICIAL CIRCUIT\nIN AND FOR [COUNTY] COUNTY, FLORIDA`
   - Centered `PROBATE DIVISION`
   - Case reference line: `CASE #: [CASE NUMBER]` (with section if entered)
   - Dynamic case caption / style:
     - Adult Guardianship: `IN RE: THE GUARDIANSHIP OF [WARD NAME]`
     - Minor Guardianship: `IN RE: THE GUARDIANSHIP OF [WARD NAME], A MINOR`
     - Guardian Advocacy: `IN RE: THE GUARDIAN ADVOCACY OF [WARD NAME]`
   - Centered, bold, underlined filing title (e.g. `<u>VERIFIED INITIAL INVENTORY</u>`) with tagged layout underline artifact
   - Pages 2+ continue with the compact running header and framed 3-column metadata bar (`Ward | Section Title | Case #`)
2. **Rule 2.520 Document Layout & Typography Standards**:
   - **Page Margins**: Exactly 1.0 inch (72 pt) on all sides (top, bottom, left, right), yielding a 468 pt printable content width on US Letter (`612pt x 792pt`).
   - **Pleading & Narrative Typography (Strict 12pt)**: Standard 12pt for narrative text, statutory notices, declarations, oaths of guardian, attorney attestations, and signature blocks; headings at 12–14pt bold.
   - **Table Schedule Typography (8.5–9.5pt)**: Standardized financial schedules formatted with compact, high-density typography to prevent cell clipping and multi-page ballooning across 6- to 8-column financial grids.
   - **Page Numbering**: Consecutively numbered `Page X of Y` in the running footer with 1-inch margin clearance.
   - **Clerk Recording Space**: Support for 3" × 3" clearance zone in the upper-right corner of Page 1 when an instrument is designated for County Official Records recording.
3. **Card-Level "Use /s/ format" Signature Sliders & Rule 2.515 Email Capture**:
   - Accessible toggle slider switch titled **"Use /s/ format"** located in the header toolbar of each signature/attestation card:
     1. **Guardian Attestation Card(s)** (`g.useSlashS`, independent per co-guardian, default `true`)
     2. **Attorney Attestation Card** (`attorney.useSlashS`, default `true`)
     3. **Preparer Attestation Card** (`preparer.useSlashS`, default `true`)
   - **Slider ON (Electronic /s/)**: Output PDF renders typographical electronic signature `/s/ [NAME]` with statutory citation (`pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515`). Respects the global script vs. typed signature style preference.
   - **Slider OFF (Physical Wet-Ink Signature)**: Output PDF renders a clean, blank signature line `____________________` with a "Signature" label beneath, allowing physical pen signing upon printing regardless of the global signature style.
   - **Rule 2.515 Attorney Email Capture**: Add explicit UI inputs for `Primary Email (e-filing)` and `Secondary Email (optional)` on Attorney cards across all forms, outputting them in the attorney signature block.
4. **100% PDF/UA-1 & WCAG 2.1 AA Compliance**:
   - Maintain strict logical tagging (`/StructTreeRoot`, `/ParentTree`, `BDC`/`EMC`, `/TH`, `/TD`, `/Scope`, `/Summary`), `<pdfuaid:part>1</pdfuaid:part>` metadata declarations, and embedded Liberation Sans TrueType font programs.

---

## Non-Negotiables

1. **Zero Regression in WCAG 2.1 AA & PDF/UA-1 (ISO 14289-1)** — 100% compliant structural tree, marked content streams, table regularity, zero skipped heading levels, and valid XMP metadata.
2. **First-Page vs. Pages 2+ Header Distinction** — Formal court pleading header rendered strictly on Page 1; subsequent pages use the continuous compact running header and bounded metadata bar.
3. **1.0-Inch Margins on All Sides** — Content must strictly respect the 72pt margin boundaries across all pages without clipping or table overflow.
4. **Independent Card-Level "/s/" Format Toggle Control** — Each eligible attestation card (Guardian 1, Guardian 2, Attorney, Preparer) has an independent slider allowing granular selection of `/s/` electronic vs. wet-ink signature output per party.
5. **100% Client-Side Offline Execution** — All rendering remains pure vector/text jsPDF operations; zero runtime network requests in both `web` and `portable` distribution builds.
6. **Universal 7-Form Coverage** — Applied across `guardian-inventory`, `annual-accounting`, `simplified-accounting`, `plan-initial`, `plan-annual`, `plan-minor`, and `plan-simplified`.

---

## Proposed First-Page Header Specification

```
            IN THE CIRCUIT COURT OF THE SIXTH JUDICIAL CIRCUIT
                  IN AND FOR PINELLAS COUNTY, FLORIDA
                            PROBATE DIVISION
                    CASE #: 26-000111-GD - Section 004

IN RE: THE GUARDIANSHIP OF GREGORY GRAHAM


               <u>VERIFIED INITIAL INVENTORY</u>
```

- **Top Court Block**: Centered, bold, uppercase (`PGSans-Bold`, 10.5pt, line spacing 14pt).
- **Probate Division & Case Reference**: Centered (`PGSans-Bold`, 9.5–10pt).
- **Case Caption**: Left-aligned, bold, uppercase (`PGSans-Bold`, 11pt): `IN RE: THE GUARDIANSHIP OF [WARD NAME]`.
- **Filing Title**: Centered, bold, uppercase, underlined (`PGSans-Bold`, 12.5pt) with layout underline artifact.

---

## Implementation Slices

### Slice 21A — Florida Judicial Circuit Lookup & Header Primitives (`src/core/pdf/circuit-lookup.js` & `pdf-engine.js`)

1. **Create `src/core/pdf/circuit-lookup.js`**:
   - Map all 67 Florida counties to their respective Judicial Circuit (1 through 20).
   - Export helper `getFloridaCircuitCourtCaption(county)` returning:
     `IN THE CIRCUIT COURT OF THE [NTH] JUDICIAL CIRCUIT\nIN AND FOR [COUNTY] COUNTY, FLORIDA`
   - Export helper `getCaseCaptionTitle(wardName, wardType)` returning:
     - Minor: `IN RE: THE GUARDIANSHIP OF ${wardName.toUpperCase()}, A MINOR`
     - Advocate: `IN RE: THE GUARDIAN ADVOCACY OF ${wardName.toUpperCase()}`
     - Default: `IN RE: THE GUARDIANSHIP OF ${wardName.toUpperCase()}`
2. **First-Page vs. Continuation Header Dispatcher in `pdf-engine.js`**:
    - On Page 1 (`pageNum === 1`):
      - Render `drawFirstPagePleadingHeader()` containing the full judicial circuit court banner, `PROBATE DIVISION`, `CASE #: [caseNumber]`, `IN RE: ...` caption, and the centered underlined document title.
      - Set initial content baseline `curY = 175pt`.
   - On Pages 2+ (`pageNum > 1`):
     - Render `drawContinuationHeader()` containing the compact court line and framed 3-column metadata bar.
     - Set content baseline `curY = 74pt`.

---

### Slice 21B — 1.0-Inch Margins & Rule 2.520 Typography (`src/core/pdf/pdf-engine.js`)

1. **Page Geometry & Printable Area**:
   - `margin = 72` (1.0 inch)
   - `pageWidth = 612`, `pageHeight = 792`
   - `contentWidth = pageWidth - (margin * 2) = 468` pt
   - `pageBottom = pageHeight - 54` pt
2. **Typography Scaling**:
   - **Document Headings (H1)**: 12pt bold `#000000` with 0.75pt underline rule.
   - **Subheadings (H2)**: 11pt bold `#1a2d4a`.
   - **Narrative Text, Notices, Oaths & Attestations**: 12pt `#111827` (with 15pt line height) conforming strictly to Rule 2.520.
   - **Table Schedules**: 8.5–9.5pt font with bold headers and zebra striping, with column widths calculated against 468pt width.
   - **Key-Value Grids**: 10pt label (`#374151`) and 10pt value (`#111827`).
   - **Running Footer**: `Page X of Y` at 8pt placed at `pageHeight - 36` pt (within bottom margin).

---

### Slice 21C — UI "Use /s/ format" Sliders & Rule 2.515 Attorney Email Capture

1. **UI Attestation & Signature Card Sliders**:
   - Add switch slider `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" ...><label class="form-check-label">Use /s/ format</label></div>` in the header toolbar of:
     - **Guardian Attestation Card(s)**: `guardians[i].useSlashS` (default `true`)
     - **Attorney Attestation Card**: `attorney.useSlashS` (default `true`)
     - **Preparer Attestation Card**: `preparer.useSlashS` (default `true`)
   - Reactive auto-save and state binding across all 7 filing forms.
2. **UI Attorney Email Input Fields**:
   - Add `Primary Email` (required for e-filing) and `Secondary Email` (optional) input fields to the Attorney Attestation cards in:
     - `src/features/guardian-inventory/index.js` (Page D-2)
     - `src/features/simplified-accounting/index.js` (Part V & VI)
     - `src/features/annual-accounting/index.js` (Part X)
     - `src/features/plan-*/index.js` (Signature sections)
3. **Attorney Signature Block Renderer**:
   - When slider is ON: Typographical `/s/ [ATTORNEY NAME]` (typed or script per global preference).
   - When slider is OFF: Blank signature line `____________________` with "Signature" label.
   - Printed Name
   - `Florida Bar No. [BAR#]`
   - Law Office Physical Address (Street, City, State, ZIP)
   - Telephone Number (with area code)
   - `Primary Email: [EMAIL]`
   - `Secondary Email: [EMAIL]` (rendered if present)
   - Electronic signature statutory citation when `/s/` is active.
4. **Pro Se / Guardian Signature Block Renderer**:
   - When slider is ON: Typographical `/s/ [GUARDIAN NAME]`
   - When slider is OFF: Blank signature line `____________________`
   - Printed Name
   - Physical Residence / Mailing Address
   - Telephone Number (with area code)

---

### Slice 21D — Form Schedule Column Width Tuning (468pt Width)

Tune proportional column widths across all schedule tables to guarantee clean line wrapping and zero overflow within the 468pt printable width:
- `guardian-inventory`: Schedule A-1 (Real Estate), A-2 (Liabilities), B-1 (Bank Accounts), B-2 (Vehicles), B-3/B-4, C-1 to C-5 (Income), Service Recipients.
- `simplified-accounting`: Accounting summary grid, remuneration table, service recipients.
- `annual-accounting`: Schedules A, B-1 to B-4, C, D-1 to D-5, E, F-1/F-2, Trusts, Remuneration, Service Recipients.
- `plan-*` forms: ADL checklists, medical/physician reports, rights restoration tables.

---

### Slice 21E — Automated Test Suite & Build Verification

1. **Update `tests/e2e/pdf-wcag-compliance.spec.ts`**:
   - Assert Page 1 contains formal pleading header with resolved Judicial Circuit (`IN THE CIRCUIT COURT OF THE SIXTH JUDICIAL CIRCUIT`).
   - Assert Page 1 contains `CASE #:`, `IN RE: THE GUARDIANSHIP OF`, and underlined document title.
   - Assert 1-inch margins (all content within `x = 72` to `x = 540`).
   - Assert "Use /s/ format" toggle slider correctly switches signature output between typographical `/s/ [NAME]` and blank wet-ink line.
   - Assert Rule 2.515 attorney signature block contains Primary Email and Florida Bar number.
   - Assert 100% PDF/UA-1 & WCAG 2.1 AA structural tagging, zero skipped heading levels, and xref integrity.
2. **Execute Test Suites**:
   - `npm run test:unit`
   - `npm run test:e2e`
3. **Execute Production Builds**:
   - `npm run build` (`build:web` and `build:portable`)
