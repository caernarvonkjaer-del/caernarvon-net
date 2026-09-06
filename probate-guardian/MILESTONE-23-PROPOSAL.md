# Milestone 23: Warning-Only Supplemental PDF Bundling

## Goal

Replace the current supplemental-document remediation ambition with a narrower, more defensible filing workflow:

1. Require users to upload already-accessible supplemental documentation as PDFs.
2. Preserve uploaded supplemental PDFs' visual pages and native text streams without rasterizing, OCRing, or visually recreating their page content.
3. Insert those uploaded PDF pages inline at the correct schedule or form-section location when the filing packet is finalized.
4. Send preview, print, and Save-as-PDF through the same finalized bundled PDF artifact.
5. Clearly document that Probate Guardian preserves user-supplied supplemental PDF pages for filing purposes but does not certify, repair, structurally merge, or guarantee their WCAG/PDF/UA compliance.

## Why This Is Needed

The previous supporting-document direction attempted to make arbitrary uploaded PDFs and image files accessible by extracting text, OCRing images, synthesizing text layers, and tagging the generated result. That is too broad for this product. OCR text, visual page preservation, and generated text overlays do not by themselves prove correct reading order, semantic headings, table structure, alt text, document language, or PDF/UA conformance.

The more honest product boundary is:

- Probate Guardian is responsible for generating accessible court-form pages from structured form data.
- The filer is responsible for supplying compliant supplemental documentation.
- Probate Guardian is responsible for preserving the visual/native-text page content of those supplemental PDFs and placing them correctly inside one bundled filing packet.

This milestone supersedes any prior requirement that the application remediate arbitrary uploaded supplemental documents into compliant PDFs. It does not reduce the accessibility requirement for the app-generated form pages.

## Non-Negotiables

1. **PDF-only supplemental uploads**: accept `application/pdf` supplemental documents only. JPG, PNG, BMP, Office files, and other formats must be rejected with a clear message.
2. **Warning required, confirmation not required**: print/export surfaces must show a clear warning that supplemental PDFs may not be ADA/accessibility compliant, but users are not forced through a separate confirmation step.
3. **No automated compliance claim for uploads**: the UI, PDF metadata, help text, tests, and documentation must not say Probate Guardian makes uploaded supplemental PDFs WCAG 2.1, Section 508, or PDF/UA compliant.
4. **No OCR or synthetic remediation path**: remove or disable the image/OCR supplemental-document path for filing-packet generation.
5. **Inline means physically merged pages**: final print/export must produce one PDF whose page order already includes the uploaded supplemental pages. Do not rely on PDF attachments, portfolios, viewer scripts, or print-time callbacks.
6. **Preserve source page appearance and native text streams**: uploaded PDF pages should be copied into the final packet with their original page geometry and visible/selectable page content where the local library supports it. This does not imply preservation of the source PDF's tag tree, `/StructTreeRoot`, `/StructParents`, parent tree, PDF/UA metadata, or conformance claim.
7. **Deterministic print artifact**: Preview, Print, and Save as PDF must operate on the same finalized PDF bytes.
8. **Obvious technical failures are blocked**: corrupt, unreadable, zero-page, renderably blank, encrypted/password-protected, or over-limit PDFs must not be accepted as inline supplements.
9. **Eligibility is enforced below the UI**: the PDF model and finalizer must reject ineligible supplemental files even if a stale UI, legacy save file, or developer error passes a `dataUrl`.
10. **Offline operation remains intact**: validation, preview, merge, print, and export must work in the raw static target and both Vite builds without runtime network requests.

## Product Boundary

### Application Responsibility

Probate Guardian must:

- Generate the court-form pages from structured data using the existing accessible PDF engine.
- Store uploaded supplemental PDFs with their original file data and insertion metadata.
- Preserve uploaded supplemental PDF pages' appearance and native text streams in the final bundled packet.
- Warn users when lightweight checks find obvious technical concerns.
- Warn that supplemental PDFs may not be ADA/accessibility compliant.
- Avoid degrading uploaded PDFs through rasterization or image conversion.

### User Responsibility

The filer must:

- Upload only supplemental PDFs that are already accessible and filing-ready.
- Replace any document that the application rejects or warns cannot be reliably bundled.

### Explicit Non-Claim

Use language like:

> Supplemental PDFs are inserted as uploaded. Probate Guardian does not certify or remediate uploaded documents for accessibility. Supplemental documents may not be ADA/accessibility compliant.

Avoid language like:

- "Make accessible"
- "WCAG compliant upload"
- "PDF/UA verified"
- "Accessibility passed"
- "Certified compliant"

## Data Model

Extend each supporting-document file record to distinguish the original upload and technical validation:

```js
{
  id: "supplement-...",
  name: "bank-statement.pdf",
  type: "application/pdf",
  size: 123456,
  dataUrl: "data:application/pdf;base64,...",
  contentDigest: "sha256-...",
  uploadedAt: "2026-09-06T...",
  pageCount: 3,
  validationAttempt: 1,
  insertionPoint: {
    scheduleKey: "b1",
    periodKey: "initial"
  },
  technicalStatus: "ready",
  technicalWarnings: [],
  processedAt: "2026-09-06T..."
}
```

Recommended status values:

| Field | Values | Meaning |
| --- | --- | --- |
| `technicalStatus` | `checking`, `ready`, `warning`, `blocked` | Result of local PDF checks. |

Do not migrate existing `.sav` files destructively. On load, legacy supporting files without technical validation fields should be rechecked from the stored Data URL before export.

## State Transitions and Atomicity

Each uploaded file must have an immutable `id`, a byte-level `contentDigest`, and a monotonically increasing `validationAttempt`. Validation results apply only when the returned `id`, `contentDigest`, and `validationAttempt` still match the current file record.

Required lifecycle:

1. `pending` file record is created after the PDF-only precheck passes and the original Data URL is available.
2. Record is saved with `technicalStatus: "checking"` before deeper PDF parsing begins, so reload can resume or rerun validation.
3. Validation moves the record to exactly one terminal technical state:
   - `ready`
   - `warning`
   - `blocked`
4. Any replacement, re-upload, or byte change returns the file to `pending` or `checking`.
5. A stale validation result after removal or replacement is ignored.
6. If autosave fails during validation, the UI must surface the save failure and keep export blocked until the saved record and in-memory record agree.
7. On reload, `checking` records are treated as incomplete and validation is rerun from the stored original Data URL.

## Filing Eligibility Guard

Create a shared guard, for example `isFilingEligibleSupplement(file)`, used by both UI readiness checks and PDF packet assembly. UI disabling is a convenience only; the model/finalizer boundary must enforce the same rule and return a structured error if an ineligible file reaches it.

A supplemental file is eligible for merging only when:

1. It has a non-empty `dataUrl` with PDF bytes.
2. `type` and/or byte sniffing identifies it as PDF.
3. `technicalStatus` is `ready` or `warning`.
4. `pageCount` is greater than zero and within the page limit.
5. `size` and decoded byte length are within the byte limits.
6. `contentDigest` exists for the exact bytes being filed.
7. It is not marked encrypted, corrupt, removed, stale, or blocked.

Legacy records with missing status fields are ineligible in memory until technical checks complete. The existing `dataUrl` test is not sufficient.

## Limits

Use explicit limits for the first implementation, then adjust only with measurement:

| Limit | Value | Applies to |
| --- | ---: | --- |
| Per-file original PDF bytes | 15 MB | Decoded uploaded PDF bytes before base64/Data URL expansion. |
| Per-file pages | 50 pages | Parsed source PDF page count. |
| Total supplemental original PDF bytes per ward/period | 40 MB | Sum of decoded bytes for active filing supplements. |
| Total supplemental pages per final packet | 150 pages | Sum of all inserted supplemental pages. |
| Final packet warning threshold | 75 MB | Generated final PDF bytes; warn before download/print if exceeded. |

The 15 MB per-file limit matches the existing upload cap. The aggregate limits protect the portable build and browser memory without silently changing source documents.

## Lightweight PDF Checks

Run checks to prevent technical failures, not to certify accessibility:

1. Confirm the uploaded bytes begin with a valid PDF header and can be parsed.
2. Confirm page count is at least one and within the configured page limit.
3. Reject encrypted/password-protected PDFs.
4. Reject files above the configured byte limit.
5. Warn when text extraction returns no text.
6. Warn when document metadata lacks title or language, if the available tooling can detect this reliably.
7. Warn when tags cannot be detected, if detection is implemented and reliable.

The warning copy must say "may need review" or "could not verify", never "failed accessibility" unless an actual validator is added.

Define "empty" carefully:

- **Blocked empty PDF**: zero pages, or parsed pages with no renderable page content.
- **Warning-only scanned PDF**: pages render but text extraction returns no text.

A scanned PDF with visible page images but no text objects is not empty for bundling purposes. It may be a poor accessibility candidate, but under this milestone the filer may include it after seeing the warning unless court technology-standard policy makes no-text PDFs a hard block in a later milestone.

## Implementation Slices

### Slice 23A: Upload Policy and Warning UI

1. Update the Supporting Documents upload control to accept only `.pdf` / `application/pdf`.
2. Replace image/OCR-oriented upload guidance with filer-responsibility language.
3. Show per-file status:
   - `Checking`
   - `Ready`
   - `Warning - review recommended`
   - `Blocked`
4. Keep the existing original download action.
5. Reject unsupported file types before saving them into the ward record.
6. Show a yellow print/export warning when supplemental PDFs are present.

### Slice 23B: Local PDF Validation

1. Use the existing vendored PDF tooling to validate PDF readability and page count.
2. Treat encrypted, corrupt, zero-page, renderably blank, and over-limit PDFs as `blocked`.
3. Store page count and technical warnings on the file record.
4. Keep validation asynchronous enough that the UI remains responsive, but do not build a remediation queue.
5. Preserve normal form editing while validation runs.
6. Rerun validation on reload for any file left in `checking`.

### Slice 23C: Finalized Packet Assembly

1. Keep generating the form PDF through `generateCourtFormPdf()`.
2. Reserve supplemental insertion pages at the correct schedule or section location.
3. Use `src/core/pdf/pdf-finalizer.js` as the bundling boundary.
4. Copy uploaded supplemental pages into the generated filing packet using `pdf-lib` page copying.
5. Preserve each uploaded page's source geometry instead of forcing it into the court-form page template.
6. Replace reserved placeholder pages with copied supplemental pages.
7. Ensure no filename banner, app header, footer, or form continuation header is stamped onto uploaded pages.
8. Add the shared `isFilingEligibleSupplement(file)` guard at the model/finalizer boundary before placeholder pages are reserved or copied.
9. Return structured export errors for ineligible supplements instead of silently omitting, copying, or substituting them.

The print command should never decide where supplements go. The app should finalize one ordered PDF first, then print that PDF.

Important preservation boundary: `pdf-lib.copyPages()` preserves source page appearance and native page content sufficiently for visual filing/printing, but it should not be assumed to integrate the source document's accessibility structure into the filing document's structure tree. The final packet may contain app-generated pages with Probate Guardian's structure tree plus inserted user-supplied pages whose source tags are not structurally merged. Documentation and UI must describe this honestly.

### Slice 23D: Preview, Print, and Save Unification

1. Route Print Preview through the finalized bundled PDF bytes.
2. Route Save as PDF through the same finalized bundled PDF bytes.
3. Route Print through the same finalized bundled PDF bytes via the existing PDF preview/print infrastructure.
4. Disable final export only when:
   - form validation fails;
   - a supplemental PDF is `blocked`;
   - a supplemental PDF is still `checking`.
5. Do not block export merely because a lightweight accessibility warning exists.
6. Treat missing status fields as `pending` during export readiness checks.

### Slice 23E: Remove Remediation Claims and Dead Paths

1. Remove image-file acceptance from supporting-document upload flows.
2. Remove OCR use from supplemental filing generation.
3. Update `lib/VENDORED-LIBRARIES.md` if Tesseract is no longer used anywhere else.
4. Update `docs/pdf-architecture-and-signatures.md` to reflect the new boundary:
   - generated form pages remain accessible;
   - uploaded supplemental PDFs are user-supplied and preserved;
   - the final packet is a bundled PDF, not a portfolio or attachment package.
5. Search for and replace misleading phrases that imply automatic upload remediation or guaranteed uploaded-document compliance.

### Slice 23F: Saved-Data Compatibility

1. Load legacy supporting-document records without crashing.
2. Recheck legacy records on first edit/export when technical status fields are missing.
3. Preserve original `name`, `type`, `size`, `dataUrl`, and `uploadedAt` fields.
4. Do not rewrite legacy records until the user saves or modifies the ward.
5. Ensure `.sav` export/import round-trips the new technical status fields.
6. During export, treat absent legacy status fields as `pending` even before the record is rewritten.

### Slice 23G: Testing and Verification

Add focused coverage for:

1. PDF-only upload acceptance.
2. JPG, PNG, BMP, DOCX, XLSX, and unknown binary rejection.
3. Valid single-page and multi-page supplemental PDFs.
4. Corrupt and encrypted PDF rejection.
5. Warning behavior for PDFs with no extractable text, if text extraction checks are implemented.
6. Yellow accessibility warning before export when supplemental PDFs are present.
7. Legacy `.sav` records with only `dataUrl` are refused by the model/finalizer guard until technical checks pass.
9. Final page order with supplements inserted after the correct schedule.
10. Uploaded page geometry and native text-stream preservation in the finalized PDF where supported by the copied source page.
11. Explicit assertion that source PDF tag trees are not promised as preserved or merged.
12. Preview, Print, and Save as PDF using identical finalized byte flow.
13. No OCR/Tesseract path invoked during supplemental PDF bundling.
14. Stale validation results ignored after replacement/removal.
15. Validation reruns when `contentDigest` changes.
16. Existing generated-form PDF accessibility and signature tests remain green.

## Acceptance Criteria

1. Supporting-document upload accepts PDF files only.
2. Each uploaded supplemental PDF has local technical status, page count, and warnings if applicable.
3. Export is blocked for unsupported, corrupt, encrypted, over-limit, or checking supplemental PDFs.
4. Export is allowed for warning-state PDFs after showing the yellow accessibility warning.
5. The final filing packet is one merged PDF with generated form pages and uploaded supplemental pages in the intended order.
6. A shared filing-eligibility guard rejects missing, stale, blocked, unchecked, digest-missing, or legacy-only uploaded records at the model/finalizer boundary.
7. Uploaded supplemental pages are copied, not rasterized, OCRed, or visually recreated.
8. The proposal, UI, and docs promise source visual/native-text preservation only, not source tag-tree preservation or structural PDF/UA continuity after merge.
9. Browser print receives the finalized bundled PDF, not separate documents or embedded file attachments.
10. User-facing text clearly says uploaded supplemental-document accessibility is the filer's responsibility.
11. Documentation no longer claims Probate Guardian remediates arbitrary uploaded documents into accessible PDFs.
12. All existing form-generation accessibility guarantees remain limited to app-generated pages and remain covered by tests.

## Out of Scope

- Automated remediation of arbitrary uploaded PDFs.
- OCR of scanned supplemental documents.
- Accepting image uploads as inline supplements.
- Certifying uploaded PDFs as WCAG 2.1, Section 508, or PDF/UA compliant.
- Preserving or merging uploaded PDFs' source tag trees, `/StructTreeRoot`, parent-tree references, PDF/UA metadata, or conformance claims.
- Building a PDF tag-tree editor, reading-order editor, table remediation interface, or alt-text correction workflow.
- PDF portfolios, embedded file attachments, JavaScript-driven print insertion, or viewer-specific print behavior.
- Server-side validation or third-party compliance services.

## Open Questions

1. Should warning-state documents get stronger visual prominence than cleanly parsed documents?
2. Should the app allow a document with no extractable text, or should that be a hard block for court technology-standard reasons?
3. Should warning-state documents count against a separate risk summary on the final review screen?
4. Should final packet metadata include a note that supplemental pages were user-supplied and preserved as uploaded?
