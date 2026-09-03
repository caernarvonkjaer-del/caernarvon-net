# PDF Architecture, Electronic Signatures & Accessibility Guide

## 1. Regulatory & Court Rules Context

### Florida Rule of General Practice and Judicial Administration 2.515
- **Rule 2.515(c) (Electronic Signature)**: Authorizes `/s/`, `s/`, or `/s` preceding the typed name for e-filing portal submissions by registered users.
- **Rule 2.515(a) (Attorney Identification)**: Mandates that attorney signatures include the typed full name, Florida Bar Number, firm name, mailing address, telephone number, and designated primary email address.
- **Florida Supreme Court Technology Standards**: Specifies that electronically filed documents must be text-searchable PDFs and discourages scanned or flattened raster image documents.
- **Decorative Script Disclaimer**: While script fonts provide a familiar visual aesthetic, they are not legally required or superior to plain typed text. The underlying machine-readable content must strictly preserve the standard `/s/ Full Legal Name` format.

---

## 2. Non-Raster Vector PDF Generation Engine

### Architecture
To prevent "scanned document / OCR" warnings and satisfy accessibility requirements:
1. **Zero `html2canvas` Rasterization**: The legacy DOM rasterization approach (which captured bitmap images into canvas objects) has been replaced with pure vector and text generation via `src/features/guardian-inventory/pdf-engine.js`.
2. **True PDF Text Operators**: All text elements, headings, numbers, table cells, and signatures are emitted as native PDF text streams (`BT ... /F1 ... Tj ... ET`).
3. **Structured Intermediate Model**: `src/features/guardian-inventory/pdf-model.js` converts ward data into a typed `FilingSection[]` tree with `PdfBlock[]` items, serving as the single source of truth for:
   - Reading order
   - Outline / bookmark navigation hierarchy
   - Document metadata
   - Table layouts, columns, and data rollups
   - Signature block details

---

## 3. PDF Catalog, Metadata & Outline Bookmarks

### Document Information Dictionary (`/Info`)
- **Title**: `{Ward Name} - {Case Number} - Printed {YYYY-MM-DD}` (e.g. `Harold Thomas Bennett - 26-002487-GD - Printed 2026-09-03`)
- **Subject**: `Verified Initial Inventory`
- **Author**: `Probate Guardian`
- **Creator**: `Probate Guardian`
- **CreationDate**: Current filing/export timestamp

### PDF Document Catalog (`/Catalog`)
- **Language**: `/Lang (en-US)` is written directly to the document catalog to establish the primary language for assistive technologies.

### Hierarchical Bookmark Hierarchy (App/Form Sequence)
```
├── Part I — Required Information (Cover)
├── Part II — Summary of Assets (Summary)
├── Part III — Assets of the Ward
│   ├── Schedule A-1: Real Property
│   ├── Schedule A-2: Debts on Real Property
│   ├── Schedule B-1: Cash & Financial Accounts
│   ├── Schedule B-2: Personal Property
│   ├── Schedule B-3: Intangible & Other Personal Property
│   ├── Schedule B-4: Debts on Personal Property
│   ├── Schedule C-1: Periodic Income
│   ├── Schedule C-2: Lawsuits & Claims Against Ward
│   ├── Schedule C-3: Lawsuits & Claims by Ward
│   ├── Schedule C-4: Trusts
│   └── Schedule C-5: Joint / Other Property
├── Part IV — Attestations & Oaths
│   ├── Guardian & Preparer Attestation (D-1 & D-2)
│   └── Attorney Attestation (D-2)
├── Part V — Audit Fee, Bond & Safe Deposit (D-3 & D-4)
└── Part VI — Certificate of Service (D-5)
```

---

## 4. Electronic `/s/` Signatures

### Supported Presentation Modes
1. **Typed `/s/` Signature (Default)**:
   - Renders `/s/ Full Legal Name` in standard document serif/sans typography.
2. **Script-style `/s/` Signature (Optional)**:
   - Renders `/s/ Full Legal Name` in an elegant cursive style using locally bundled offline fonts.
   - Text remains 100% vector-based, searchable, and extractable.

---

## 5. Phase 2 Roadmap: Tagged PDF / PDF/UA-1 Structure

While Phase 1 delivers 100% non-raster text, metadata, bookmarks, high contrast, and accessible reading order, full **PDF/UA-1 (ISO 14289-1)** compliance requires deep structural tagging.

### Phase 2 Implementation Requirements:
1. **Structure Tree Root (`/StructTreeRoot`)**: A logical tree mapping every visual block to standard tags (`/Document`, `/Part`, `/H1`, `/H2`, `/Table`, `/TR`, `/TH`, `/TD`, `/P`, `/Figure`).
2. **Marked Content Operators (`BDC ... EMC`)**: Wrapping every text operator on every page with a unique structure tag identifier (`/MCID`).
3. **Role Mapping Dictionary (`/RoleMap`)**: Mapping custom role identifiers to standard PDF structure types.
4. **Header/Footer Artifacts**: Tagging repeated running headers, court captions, and page number footers with `/Artifact` so screen readers do not read them repetitively mid-sentence.
