import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Milestone 1 (see INDEX-SPLIT-PLAN.md): index.html is still the untouched
// monolith. This config exists to prove the dual-output build pipeline
// itself works before any application code moves into src/. Two targets
// from one source tree:
//   - dist/web      chunked build served over HTTPS/localhost (Cloudflare Pages)
//   - dist/portable  self-contained folder for the file:// double-click workflow
//
// index.html loads several files (lib/*, templates/*, src/legacy-app.js) as
// classic (non-module) <script src> tags. Vite's HTML pipeline refuses to
// bundle those at all -- "can't be bundled without type='module' attribute"
// -- it neither inlines nor copies them, which silently produced a build
// missing JSZip/ExcelJS/html2pdf/Bootstrap/the print templates until this
// was caught. They're copied here as static passthrough assets instead.
// That also means dist/portable is not yet a literal single .html file:
// it's index.html plus a copied lib/templates/icons/src folder, functionally
// identical to today's existing file:// distribution. True single-file
// inlining of those needs them to become real ES modules first, which is
// step 6 of INDEX-SPLIT-PLAN.md's migration sequence (later milestone), not
// something to force here by changing untouched application code.
//
// Only src/legacy-app.js is copied this way, not all of src/ -- Milestone 2
// phases B/D add real ES modules under src/core/ and src/features/ that
// Vite's own import() analysis must actually process (bundle, hash,
// code-split), not bypass as an opaque static file.
const STATIC_COPY_TARGETS = [
  { src: 'lib', dest: '.' },
  { src: 'templates', dest: '.' },
  { src: 'icons', dest: '.' },
  { src: 'manifest.json', dest: '.' },
  // build:web runs scripts/generate-service-worker.mjs after Vite copies
  // this source template, injecting a manifest derived from dist/web.
  { src: 'sw.js', dest: '.' },
  { src: 'src/legacy-app.js', dest: '.' },
  // fragments/*.html: src/fragment-loader.js fetches these as plain static
  // files everywhere except file:// (see the comment there for the full
  // reasoning -- fetch() must keep working with zero Vite processing, since
  // that's how Cloudflare Pages actually serves this repo today). Needed
  // here for dist/web; dist/portable's own copy is unused at runtime (that
  // build takes the `?raw` dynamic-import branch instead) but harmless.
  { src: 'fragments', dest: '.' },
];

export default defineConfig(({ mode }) => {
  const portable = mode === 'portable';
  return {
    root: '.',
    base: portable ? './' : '/probate-guardian/',
    build: {
      outDir: portable ? 'dist/portable' : 'dist/web',
      emptyOutDir: true,
    },
    plugins: [
      viteStaticCopy({ targets: STATIC_COPY_TARGETS }),
      ...(portable ? [viteSingleFile()] : []),
    ],
  };
});
