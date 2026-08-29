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
// index.html loads 7 files (lib/*, templates/*) as classic (non-module)
// <script src> tags. Vite's HTML pipeline refuses to bundle those at all --
// "can't be bundled without type='module' attribute" -- it neither inlines
// nor copies them, which silently produced a build missing JSZip/ExcelJS/
// html2pdf/Bootstrap/the print templates until this was caught. They're
// copied here as static passthrough assets instead. That also means
// dist/portable is not yet a literal single .html file: it's index.html
// plus a copied lib/templates/icons folder, functionally identical to
// today's existing file:// distribution. True single-file inlining of
// those 7 files needs them to become real ES modules first, which is
// step 6 of INDEX-SPLIT-PLAN.md's migration sequence (later milestone),
// not something to force here by changing untouched application code.
const STATIC_COPY_TARGETS = [
  { src: 'lib', dest: '.' },
  { src: 'templates', dest: '.' },
  { src: 'icons', dest: '.' },
  { src: 'manifest.json', dest: '.' },
  { src: 'sw.js', dest: '.' },
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
