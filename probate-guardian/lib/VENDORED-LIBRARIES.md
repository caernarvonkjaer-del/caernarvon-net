# Vendored Libraries

Everything in this folder is self-hosted (no runtime network requests, no
CDN) so the app works fully offline in the `dist/portable` `file://`
distribution. Nothing here is an npm `dependency` — see each entry for how
it actually gets into `lib/`.

**Update policy**: recheck every library below on a **quarterly** cadence,
or **immediately** on a published CVE/security advisory for that library,
whichever comes first. This file did not exist before Milestone 19-3 — the
four pre-`pdfjs-dist` entries are a first-time backfill (their "Last
checked" dates are this milestone's date, not a real prior audit), so
treat their next quarterly recheck as the first one that actually means
anything.

---

## pdfjs-dist

- **Version**: 6.3.289
- **Source**: [npmjs.com/package/pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) (`npm install pdfjs-dist@6.3.289`)
- **How it gets here**: `pdfjs-dist` is a `devDependency` in
  `package.json`, but only as the *upstream source* two files are copied
  from: `node_modules/pdfjs-dist/build/pdf.mjs` → `lib/pdfjs/pdf.mjs`, and
  `.../build/pdf.worker.min.mjs` → `lib/pdfjs/pdf.worker.min.mjs`. Unlike
  the four libraries below, these are real ES modules, not classic
  `<script>`-tag globals (pdfjs-dist v4+ dropped its non-module build
  entirely) — `src/core/pdf/pdf-preview.js` reaches them via a *relative*
  import/fetch (`../../../lib/pdfjs/...`), not the bare `pdfjs-dist/...`
  package specifier. That's deliberate, not a style choice: this app is
  tested and shipped against a raw, completely unbundled `index.html`
  (see `playwright.config.ts`'s `source` target) where a bare package
  specifier simply cannot resolve — a browser's native ES module loader
  only understands relative/absolute URLs, not Node-style package
  resolution. A relative import of a real vendored file resolves natively
  in that raw target *and* still bundles correctly under Vite for
  `dist/web`/`dist/portable`, so it works everywhere with one code path.
  `pdf.mjs`, not the prebuilt `pdf.min.mjs`: that minified build contains
  a stray invalid-UTF-8 byte sequence that makes Vite's bundler refuse to
  load it outright (confirmed via a strict UTF-8 decode check) — the
  unminified build doesn't have this problem, and Vite minifies everything
  it bundles anyway, so nothing is lost. **At the next version bump, redo
  both copies from a freshly installed `node_modules/pdfjs-dist`, not a
  patch to the checked-in copies.**
- **Used for**: Milestone 19-3's canvas + `TextLayer` PDF preview/print
  viewer.
- **Why it's the highest-risk entry here**: it's a parser for arbitrary
  generated PDF content (the app's own output, but still complex binary
  parsing), unlike the CSS/zip/spreadsheet libraries below — worth the
  quarterly-or-CVE cadence more than any of the other four.
- **Last checked**: 2026-09-04 (this milestone).

## bootstrap

- **Version**: 5.3.8 (`bootstrap.bundle.min.js`, `bootstrap.min.css`)
- **Source**: [getbootstrap.com](https://getbootstrap.com/)
- **Last checked**: 2026-09-04 (backfilled; not previously tracked).

## exceljs

- **Version**: 4.4.0 (`exceljs.min.js` — build-date comment `19-10-2023` matches ExcelJS 4.4.0's 2023-10-19 npm release)
- **Source**: [npmjs.com/package/exceljs](https://www.npmjs.com/package/exceljs)
- **Last checked**: 2026-09-04 (backfilled; not previously tracked).

## jszip

- **Version**: 3.10.1 (`jszip.min.js`)
- **Source**: [npmjs.com/package/jszip](https://www.npmjs.com/package/jszip) — also a real `devDependency` in `package.json` (the one library of the original four that is)
- **Last checked**: 2026-09-04 (backfilled; not previously tracked).

## html2pdf.bundle.min.js

- **Version**: bundles jsPDF **4.0.0** (confirmed via an embedded version
  string in the minified bundle) + html2canvas + dompurify. The
  `html2pdf.js` wrapper's own version could not be recovered from the
  minified bundle or its (near-empty) `LICENSE.txt` — re-vendor from a
  known npm version at the next update to restore full version
  traceability for this one.
- **Source**: originally [npmjs.com/package/html2pdf.js](https://www.npmjs.com/package/html2pdf.js)
- **Used for**: `plan-*` PDF export before Milestone 19-2 (now removed —
  see `MILESTONE-19-2-PROPOSAL.md`); still used by `src/core/pdf/pdf-engine.js`
  for jsPDF itself, since jsPDF isn't separately vendored.
- **Last checked**: 2026-09-04 (backfilled; not previously tracked).
