# Milestone 19-3: Unify Preview and Print Onto the Generated PDF

## Goal

Make Preview and Print consume the exact same generated PDF that "Save as PDF" produces, instead of an independent HTML/CSS reconstruction (`buildPrintHTML()`). After this milestone there is one renderer — `pdf-model.js` + the shared `src/core/pdf/pdf-engine.js` — driving all three surfaces, for every feature.

> [!IMPORTANT]
> **Sequencing**: depends on `MILESTONE-19-1-PROPOSAL.md` (block-vocabulary completeness, so the vector output is a faithful superset of what `buildPrintHTML()` shows) and ideally `MILESTONE-19-2-PROPOSAL.md` (so all seven features are already on the vector engine before Preview/Print are re-pointed at it — otherwise the four plan-* features would have no vector PDF to preview).

---

## Target End State

- **Preview** renders the actual generated PDF via a self-hosted, canvas-based pdf.js viewer — not a parallel HTML reconstruction.
- **Save as PDF** is unchanged (already this engine, for all seven features after 19-2).
- **Print** opens the same generated PDF blob and lets the browser/OS PDF print dialog handle it, instead of `window.print()` on the live app DOM. This permanently eliminates the `.mobile-topbar`-overlay bug's entire failure category (fixed in 19-1 for the current HTML-print path, but structurally impossible once Print no longer touches app chrome at all).

Once a feature's viewer-based preview is verified equivalent to its old `buildPrintHTML()` output, that feature's `buildPrintHTML()`/print-CSS path is deleted (tracked in `MILESTONE-19-4-PROPOSAL.md`) — not kept as a fallback.

---

## Findings

- **No PDF-viewing library is vendored today.** `lib/html2pdf.bundle.min.js` (945KB) bundles jsPDF + html2canvas for *generation*, not viewing. There is no pdf.js/`pdfjs-dist` anywhere in `lib/`, `package.json`, or `package-lock.json`.
- **Size estimate**: a minimal self-hosted, Latin-only `pdfjs-dist` integration (main-thread API + worker, skipping CJK/complex-script cmaps) is roughly 1-1.5MB combined — comparable in order of magnitude to `exceljs.min.js` (941KB) and `html2pdf.bundle.min.js` (945KB), both already vendored at similar sizes. Not an outlier for this codebase's existing bundle budget.
- **CSP is the key constraint.** `index.html`'s CSP meta tag: `default-src 'self'; script-src 'self'; ...; worker-src 'self' blob:; object-src 'none'; ...` (no `frame-src` set, so it falls back to `default-src 'self'`, i.e. no `blob:` for frames).
  - `object-src 'none'` blocks the simple `<object data="blob:...">`/`<embed>` embed approach outright.
  - No `frame-src blob:` means `<iframe src="blob:...">` is also blocked as-is.
  - **pdf.js's canvas-rendering API** (`pdfjsLib.getDocument()` + `page.render({canvasContext})`, drawing into a same-origin `<canvas>` via JS) is the only approach that needs **zero CSP directive changes** — it only needs the already-permitted `worker-src 'self' blob:'` for the parser worker.
  - `tests/e2e/security.spec.ts` asserts `script-src` contains `'self'` and explicitly not `'unsafe-inline'`/`'unsafe-eval'` — modern `pdfjs-dist` builds don't require `eval`, so this should hold, but it's a real CI gate to keep green.
- **Accessibility regression risk in canvas-only rendering.** A plain `<canvas>` render of the PDF is non-selectable and exposes no text to screen readers — for an app whose other four milestones (19-1, 19-2, 19-5, and the underlying Milestone 19 itself) are entirely about WCAG 2.1 AA / PDF/UA-1 compliance, replacing the current HTML preview (real DOM text) with a bare canvas would be an accessibility regression on the preview surface itself, even though the *generated PDF* stays fully tagged. pdf.js ships a standard `TextLayerBuilder` for exactly this: an invisible, precisely-positioned selectable-text `<div>` overlay rendered over the canvas from the same parsed PDF content. It's same-origin DOM output from JS, not a new embed surface, so it doesn't reopen the CSP problem the canvas-only approach was chosen to avoid. This needs to be in scope explicitly, not left as an implicit "canvas is enough" assumption.
- **Portable single-file build complication**: pdf.js conventionally ships its parser as a *second* file (`pdf.worker.js`), instantiated via `new Worker('pdf.worker.js')`. The portable build (`vite-plugin-singlefile`) has no mechanism today for a second output file — `dist/portable` isn't true single-file inlining for `lib/`-style assets (per `vite.config.js`'s own comments). The fix is to embed the worker source as a JS string and construct it via `new Worker(URL.createObjectURL(new Blob([workerSource])))` — a deliberate build step, not something Vite gives for free. `vite.config.js`'s `portableCspHashes()` plugin (which SHA-256-hashes inline `<script>` bodies into `script-src` post-build) automatically covers any pdf.js code Vite bundles into the single inlined script, so no manual CSP work is needed there — only the worker needs special handling.
- **Interactive controls check (guardian-inventory, representative)**: every control on the Print Preview page (Save PDF/Excel/Print buttons, signature-style radio, validation panel, Excel-capacity warning, page nav) already lives *outside* `buildPrintHTML()`'s returned markup, as siblings around `<div id="print-doc-container">`. Swapping that container for an embedded PDF-viewer element requires no control relocation. One pre-existing divergence worth fixing as part of this work: the signature-style radio currently only affects the separate vector-PDF export path, not what `buildPrintHTML()`/on-screen preview shows — once Preview renders the real PDF, this divergence disappears by construction.
- **Live-regeneration concern**: every data edit needs the PDF rebuilt for an accurate preview. Needs a performance check on the largest forms (`annual-accounting`'s 1024-line `pdf-model.js`). **Target budget: preview visibly updates within 300ms of the triggering edit** (generation + re-render combined) — a concrete, testable number rather than a subjective "if it feels slow." If empirical measurement exceeds this on the largest form, debouncing is added; if it doesn't, no debouncing is needed. Either way the decision is driven by a measurement against this budget, not a judgment call made after the fact.
- **No policy today for keeping the vendored `pdfjs-dist` copy current — and no existing precedent to follow.** Checked: there is no README in `lib/`, and no version/update-cadence notes for the four libraries already vendored there (`bootstrap`, `exceljs`, `jszip`, `html2pdf`) anywhere in the repo, including `HOW-TO-RUN.txt`. So this can't be "documented alongside the existing vendoring notes" — there are none. `pdfjs-dist` is a self-hosted parser handling arbitrary generated content, which makes it a meaningfully higher-risk vendored dependency than a CSS framework or a zip library, so this milestone should originate the policy, not just apply one that doesn't exist yet.

---

## Scope

1. Vendor `pdfjs-dist`, self-hosted, canvas-rendering integration only (no `<iframe>`/`<object>`).
2. Solve the portable single-file build's worker problem via an embedded blob-URL worker.
3. Build one shared preview-viewer component (canvas + `TextLayerBuilder` text overlay + page navigation), used by every feature — the text layer is required scope, not an optional enhancement, so the preview surface doesn't regress the app's own accessibility standard.
4. Replace each feature's `buildPrintHTML()`-driven preview container with the shared viewer, rendering the output of that feature's `generateCourtFormPdf()`/`pdf-model.js`.
5. Re-wire "Print" (`data-form-action="print"` handler in `src/form-events.js`) to act on the generated PDF blob instead of calling `window.print()` on the DOM.
6. Verify live-regeneration performance on `annual-accounting` against the 300ms budget above; add debouncing if the measured figure exceeds it.
7. Fix the signature-style-radio/preview divergence noted above as a natural side effect of this change.
8. Create `lib/VENDORED-LIBRARIES.md`, recording for each vendored library (starting with `pdfjs-dist`, and backfilling the four existing ones — `bootstrap`, `exceljs`, `jszip`, `html2pdf` — while establishing the file): exact version, source URL, and an update policy of **recheck quarterly, or immediately on a published CVE/security advisory for that library**, whichever comes first. `pdfjs-dist`'s entry is the one this milestone is actually gated on; backfilling the other four is a cheap add-on now that the file exists, not a blocker.

---

## Non-Negotiables

- Zero CSP directive changes (canvas-rendering integration only) — `tests/e2e/security.spec.ts` must keep passing unmodified.
- Zero runtime network requests in both `web` and `portable` builds (pdf.js and its worker fully self-hosted/bundled).
- No regression in `tests/e2e/security.spec.ts`'s `script-src` assertions (no `unsafe-eval`/`unsafe-inline`).

---

## Acceptance Criteria

- [ ] `pdfjs-dist` vendored, self-hosted, canvas-only integration (no `<iframe>`/`<object>`/`<embed>`).
- [ ] Portable build's worker solved via embedded blob-URL construction; `dist/portable` builds and runs a preview fully offline via `file://`.
- [ ] One shared preview-viewer component built and used by all seven features.
- [ ] `TextLayerBuilder` text overlay implemented and verified selectable/screen-reader-exposed over the canvas render — not canvas-only.
- [ ] Each feature's `buildPrintHTML()`-driven preview replaced with the shared viewer.
- [ ] "Print" re-wired to print the generated PDF blob, not the DOM.
- [ ] Live-regeneration performance measured against the 300ms budget on `annual-accounting`; debouncing added only if the measured figure exceeds it.
- [ ] `tests/e2e/security.spec.ts` passes unmodified (no CSP relaxation).
- [ ] Signature-style-radio/preview divergence resolved (preview now reflects the selected style, since it's rendering the real PDF).
- [ ] `lib/VENDORED-LIBRARIES.md` created with a `pdfjs-dist` entry stating exact version, source URL, and a quarterly-or-on-CVE recheck cadence — not satisfiable by a one-line "see upstream repo" comment.

## Verification

- `npx playwright test tests/e2e/security.spec.ts` — CSP assertions must still pass.
- Manual: open Preview for each of the seven features, confirm it matches "Save as PDF" output exactly (same renderer now).
- Manual: with a screen reader (or the browser accessibility tree inspector), confirm preview text is exposed and selectable via the `TextLayerBuilder` overlay, not just visually present on canvas.
- Manual: Print each of the seven features, confirm no app-chrome overlay (the `.mobile-topbar` bug class), and confirm it matches the saved PDF.
- Build and smoke-test `dist/portable` via `file://` — confirm PDF preview and print both work fully offline.
