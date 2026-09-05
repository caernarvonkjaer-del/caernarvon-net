# Milestone 19-5: Full PDF/UA-1 Font Embedding

## Goal

Complete the item explicitly deferred at the end of Milestone 19: embed a real TrueType font program into every generated court-filing PDF so the application can honestly claim **PDF/UA-1 (ISO 14289-1)** conformance — not just WCAG 2.1 AA tagged-PDF structure — and pass validation against the ISO 14289-1 reference validator (veraPDF), not only Adobe Acrobat's WCAG-focused Accessibility Checker.

> [!IMPORTANT]
> **Why this is numbered 19-5, not a new milestone**: ISO 14289-1 clause 7.21.4.1 requires every font used in the document to be embedded as a font program (`/FontFile`/`/FontFile2`). Milestone 19 shipped full tagged-structure/marked-content compliance but continued to render all text with jsPDF's standard-14 fonts (`helvetica`, `times`), which are never embedded — they rely on the PDF viewer's own built-in fonts. The `pdfuaid:part 1` XMP flag already exists in `pdf-accessibility.js` (`buildXmpPacket`'s `claimPdfUa`/`embedFonts` check) but is dormant — nothing in the real generation path sets it, precisely because font embedding wasn't implemented. Like 19-1 through 19-4, this is direct continuation work on the PDF engine Milestone 19 built, not a new top-level initiative — sequenced after 19-1 since both touch `pdf-engine.js`'s font/rendering calls and doing 19-1's block-vocabulary work first avoids rebasing this on top of it.
>
> **Siblings**: `MILESTONE-19-1-PROPOSAL.md` (immediate fixes, block vocabulary, data-integrity audit), `MILESTONE-19-2-PROPOSAL.md` (plan-* features onto the vector engine), `MILESTONE-19-3-PROPOSAL.md` (unify Preview/Print onto the generated PDF), `MILESTONE-19-4-PROPOSAL.md` (cleanup). This milestone's subject matter (font embedding) is independent of 19-2/19-3/19-4's subject matter — it can run in parallel with those *once 19-1 has landed*.
>
> **Merge-order note, not just subject-matter sequencing**: 19-5B rewrites the same `pdf-engine.js` `doc.setFont(...)` call sites that 19-1 is simultaneously adding new block types around (multi-line cells, multi-value totals, the checklist/wet-ink primitives — each new render path also calls `doc.setFont(...)`). This isn't just "do font embedding after block-vocabulary work for tidiness" — doing both concurrently against the same file risks real merge conflicts on nearly every touched line. 19-5 should start only after 19-1 is merged, not simply "queued" behind it while both are in flight.

---

## Findings From Codebase Research

- Font selection is already 100% centralized in `src/core/pdf/pdf-engine.js` — 22 `doc.setFont(...)` call sites, only two family names in use: `'helvetica'` (`normal`/`bold`/`italic` — body text, headers, footers, table cells, notices) and `'times'` (`italic`/`bold` — signature block only). No `pdf-model.js` file in any feature contains font logic, so the blast radius of this change is small.
- jsPDF v4.0.0 (vendored inside `lib/html2pdf.bundle.min.js`, confirmed via `addFileToVFS`/`addFont` symbols present in the bundle) has native TrueType embedding support. Calling `doc.addFileToVFS(name, base64)` + `doc.addFont(name, family, style)` makes jsPDF generate the entire compliant embedded-font object graph itself (`CIDFontType2`/`Type0`, `/FontDescriptor`, `/FontFile2`, `/ToUnicode` CMap, `/W` width array) automatically — **no hand-rolled low-level PDF object writing is needed for fonts**, unlike the structure tree in Milestone 19, which had to be hand-built because jsPDF has no native tagging support.
- `src/assets/signature-font.js` (a `local()`-only CSS `@font-face` for the on-screen "script-style" signature) is dead code, never wired into the PDF output — it is **not** an existing font-embedding pattern to reuse. There is no `addFileToVFS`/`addFont` call anywhere in the repo today; this is genuinely new work.
- No existing byte-size budget in `scripts/measure-baseline.mjs` would block a font asset in the 60–140KB range (after Latin-subset + base64), and `lib/` / feature-scoped assets are already excluded from the tracked "application" bytes as long as the font module stays on the PDF-generation lazy-load path.

---

## Decision: Consolidate to One Embedded Family

Today's 5 style combos span two unrelated font families: `helvetica` normal/bold/italic for body text, and `times` italic/bold for the `/s/` signature only. Embedding both means embedding 5 subsetted faces. Since the "script" signature style is already rendered in plain Times-Italic — not an actual cursive font (`signature-font.js`'s cursive CSS is dead, never wired to the PDF path) — there's no functional reason to keep a second serif family alive just for this.

**Recommendation**: embed one sans-serif family (Regular/Bold/Italic — 3 faces) and re-point the signature block at the same family's Bold/Italic faces, dropping `times` entirely. This halves the embedded-font payload and removes an already-inconsistent serif font from an otherwise all-sans court document. This is a visible (if subtle) change to the signature glyph shape — flagged here since it's a legal-document typography call — but is the default recommendation; reverting to a 2-family/5-face embed to preserve the exact current serif signature look is a straightforward alternative if preferred.

**Font choice**: Liberation Sans (SIL Open Font License 1.1) — purpose-built as a metrically-compatible substitute for Helvetica/Arial, so `doc.splitTextToSize()` / column-width math in `pdf-engine.js` will produce line breaks and column fits nearly identical to today's Helvetica output, minimizing visual regression risk. Permissive license, attribution satisfied by including the license file alongside the embedded asset.

> [!NOTE]
> **This explicitly supersedes the FreeSans/OpenSans suggestion in `MILESTONE-19-PROPOSAL.md`'s original deferral note** (`> Because bundling TrueType font programs (e.g. FreeSans or OpenSans) would significantly increase bundle size...`). That was a placeholder example naming two plausible options at the time Milestone 19 deferred this work, not a committed decision. Liberation Sans is the deliberate choice here specifically for its Helvetica-metric compatibility, which neither FreeSans nor OpenSans offers to the same degree — flagging the discrepancy explicitly so it doesn't read as an unexplained inconsistency between the two documents.

---

## Non-Negotiables (carried forward from Milestone 19)

1. **Zero regression in WCAG 2.1 AA / Milestone 19 compliance** — all existing tagged-structure, marked-content, and table/heading semantics must continue to pass unmodified.
2. **Strict Vector/Text Architecture** — no raster fallbacks; font embedding must not introduce any image-based text rendering.
3. **100% Client-Side & Offline Execution** — the embedded font ships as a base64 asset inside the app bundle; zero runtime network requests in either the `web` or `portable` build.
4. **Content Security Policy (CSP)** — no dynamic `eval()`; font registration uses jsPDF's standard `addFileToVFS`/`addFont` API only.
5. **Data & Schema Integrity** — no `.sav` format changes; this is purely a PDF-rendering concern.
6. **Visual & Print Fidelity** — existing court layout, typography, margins, and rules must be preserved or improved without visual regression (see the signature-font decision above for the one deliberate, flagged exception).

---

## Implementation Slices

### 19-5A — Font sourcing & subsetting pipeline

- Source Liberation Sans Regular/Bold/Italic TTFs (pin a specific release, e.g. v2.1.5) as a one-time local download — not committed raw.
- Add a dev-only build script `scripts/generate-embedded-font.mjs` using the `subset-font` npm package (devDependency; wraps `hb-subset` via WASM, pure JS, no Python toolchain needed) to subset each face to Basic Latin + Latin-1 Supplement (covers accented names common in Florida filings) + a small set of typographic extras (en/em dash, curly quotes, bullet, degree, section sign).
- Script outputs base64 strings into a generated asset module, `src/assets/embedded-fonts.js`, exporting `PG_SANS_REGULAR_B64` / `PG_SANS_BOLD_B64` / `PG_SANS_ITALIC_B64` — same "export a JS string constant" shape as the existing `src/assets/signature-font.js`, so both build targets (`dist/web` chunking, `dist/portable`'s `vite-plugin-singlefile` inliner) handle it with zero `vite.config.js` changes.
- Commit the generated `embedded-fonts.js` (this is what ships); do **not** commit the raw source TTFs — gitignore a `fonts-src/` scratch dir, and document the exact Liberation Sans release/URL and regeneration command at the top of the generator script for reproducibility.
- Add `src/assets/LICENSE-LiberationSans.txt` (SIL OFL 1.1 full text) — required for redistributing an embedded OFL font.
- Expected size: ~15–35KB per subsetted face pre-base64 (~60–140KB total post-base64).

### 19-5B — Wire embedding into `pdf-engine.js`

- Inside `generateCourtFormPdf`, immediately after obtaining `doc`, register the 3 faces once per document via `doc.addFileToVFS(...)` + `doc.addFont(...)`.
- Replace all `doc.setFont('helvetica', X)` (20 call sites) → `doc.setFont('PGSans', X)`, and `doc.setFont('times', 'italic'|'bold')` (2 call sites, signature block) → `doc.setFont('PGSans', 'italic'|'bold')`.
- Visually diff a generated Verified Initial Inventory and Annual Accounting PDF before/after — both have dense tables, so any font-metric drift in `splitTextToSize`/column-width math will show up there first.

### 19-5C — Enable `pdfuaid:part 1` by default & extend verification

- In `generateCourtFormPdf`, pass `{ ...metadata, embedFonts: true }` into `new PdfStructureTree(...)` — the only change needed to make the already-existing `buildXmpPacket` conditional in `pdf-accessibility.js` start emitting `<pdfuaid:part>1</pdfuaid:part>` for real.
- Update the now-stale comment block in `pdf-accessibility.js` explaining the previous deferral — it should describe unconditional embedding going forward, not the reason it was gated.
- Extend `tests/e2e/pdf-wcag-compliance.spec.ts`: assert generated PDFs contain `/FontFile2`, `/FontDescriptor`, `/CIDFontType2`, and that the XMP packet from the real (non-mocked) `generateCourtFormPdf` output contains `<pdfuaid:part>1</pdfuaid:part>` — today's only pdfuaid test calls `buildXmpPacket()` directly with a hand-built metadata object, not through the real generation path.
- Confirm the existing xref-byte-offset-integrity and zero-untagged-text-operator audits (Slice 19D) continue to pass unmodified — font embedding adds new object structures but no new text-showing content.

### 19-5D — Bundle verification, docs, and manual validation protocol

- Re-run `scripts/measure-baseline.mjs` for all 3 targets and confirm the embedded-fonts module only loads on the PDF-generation code path, not eagerly at startup.
- Build and smoke-test the portable (`file://`) target — confirm `vite-plugin-singlefile` inlines the new asset module and a generated PDF still opens correctly with zero network requests.
- Flip the deferred checkbox in `MILESTONE-19-PROPOSAL.md`'s Section C to reference this milestone.
- Fix two documentation drifts surfaced during research (`docs/pdf-architecture-and-signatures.md`): stale `src/features/guardian-inventory/pdf-engine.js` path references (engine now lives in `src/core/pdf/pdf-engine.js`), and the inaccurate claim that the script signature already "uses locally bundled offline fonts."

---

## Manual Validation Protocol

1. **Adobe Acrobat Pro Full Check** (as documented in `MILESTONE-19-PROPOSAL.md`) — should remain 0 Failed across all 32 checks; not itself a PDF/UA-1 validator.
2. **veraPDF** (free, open-source, the reference implementation for ISO 14289-1 conformance) — run its PDF/UA-1 profile against a freshly generated PDF. This is the check that specifically validates clause 7.21.4.1 (font embedding), which Acrobat's checker doesn't fully cover, and is the actual target standard for this milestone.
3. Commit the veraPDF report (and Acrobat report, if desired) into the repo, same pattern as Milestone 19's Section B.

---

## Acceptance Criteria
 
- [x] Liberation Sans Regular/Bold/Italic subsetted, licensed, and embedded as base64 assets.
- [x] All `doc.setFont('helvetica'|'times', ...)` call sites in `pdf-engine.js` migrated to the embedded `'PGSans'` family.
- [x] `pdfuaid:part 1` emitted by default from the real `generateCourtFormPdf` path (not just a direct `buildXmpPacket()` unit call).
- [x] E2E suite extended with `/FontFile2` / `/FontDescriptor` / `/CIDFontType2` assertions; full `pdf-wcag-compliance.spec.ts` suite passes.
- [x] `web` and `portable` builds both verified offline with zero network requests.
- [x] Bundle size baseline re-measured and recorded.
- [ ] veraPDF PDF/UA-1 profile run and report committed (operator execution).
- [ ] Adobe Acrobat Pro Full Check re-confirmed with fonts embedded (operator execution).
