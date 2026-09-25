import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { createHash } from 'node:crypto';

// Two build targets from one source tree:
//   - dist/web      chunked build served over HTTPS/localhost (Cloudflare Pages)
//   - dist/portable  self-contained folder for the file:// double-click workflow
//
// Most application code now lives in ES modules under src/core/ and
// src/features/ (Milestones 2-40), which Vite bundles normally through
// src/main.js. What remains classic is index.html's <script src> tags for
// lib/* and src/legacy-app.js (Milestone 1's recorded decision, still in
// force). Vite's HTML pipeline refuses to bundle those at all -- "can't be
// bundled without type='module' attribute" -- it neither inlines nor copies
// them, which silently produced a build missing JSZip/Bootstrap/legacy-app.js
// until this was caught. They're copied here as static passthrough assets
// instead. (templates/*.js -- the embedded court Excel templates -- are
// real ES-module imports of src/core/persistence/templates.js and need no
// separate copy target: Vite's bundler already inlines their content into
// the built JS. Milestone 42H removed the redundant `templates` copy
// target along with templates/ui-starter/, a greenfield starter kit that
// had been shipping in every build for no runtime reason.)
// That also means dist/portable is not yet a literal single .html file:
// it's index.html plus a copied lib/icons/src folder, functionally
// identical to today's existing file:// distribution. True single-file
// inlining of lib/* needs it to become real ES modules first, which is
// step 6 of INDEX-SPLIT-PLAN.md's migration sequence (later milestone), not
// something to force here by changing untouched application code.
//
// Only src/legacy-app.js is copied this way, not all of src/ -- Milestone 2
// phases B/D add real ES modules under src/core/ and src/features/ that
// Vite's own import() analysis must actually process (bundle, hash,
// code-split), not bypass as an opaque static file.
const STATIC_COPY_TARGETS = [
  { src: 'lib', dest: '.' },
  { src: 'icons', dest: '.' },
  { src: 'manifest.json', dest: '.' },
  // build:web runs scripts/generate-service-worker.mjs after Vite copies
  // this source template, injecting a manifest derived from dist/web.
  { src: 'sw.js', dest: '.' },
  // Standalone end-user help page, opened via window.open()
  // from the "?" button and the Help panel's "View User Guide" button --
  // a plain same-origin navigation, not something Vite's HTML pipeline or
  // bundler ever sees a reference to, so without this it builds fine and
  // 404s the moment either button is clicked.
  { src: 'help/index.html', dest: '.' },
  { src: 'src/legacy-app.js', dest: '.' },
  { src: 'src/prepaint.js', dest: 'src', rename: { stripBase: true, name: 'prepaint.js' } },
  // fragments/*.html: src/fragment-loader.js fetches these as plain static
  // files everywhere except file:// (see the comment there for the full
  // reasoning -- fetch() must keep working with zero Vite processing, since
  // that's how Cloudflare Pages actually serves this repo today). Needed in
  // BOTH builds: fragment-loader.js chooses by protocol at runtime, not by
  // build, so dist/portable fetches these too whenever it is served over
  // http(s) -- which is how production runs it, from the DNN site. Only a
  // file:// launch takes the `?raw` dynamic-import branch. (This comment used
  // to call dist/portable's copy "unused at runtime"; deleting it on that
  // advice would break every fragment-backed dialog in production.)
  { src: 'fragments', dest: '.' },
];

function portableCspHashes() {
  return {
    name: 'portable-csp-hashes',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || !asset.fileName.endsWith('.html')) continue;
        const html = String(asset.source);
        const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
          .map((match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
        asset.source = html.replace("script-src 'self'", `script-src 'self' ${hashes.join(' ')}`);
      }
    },
  };
}

function rewriteManifestIconPaths(portable) {
  return {
    name: 'rewrite-manifest-icon-paths',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || !/^assets\/manifest-.*\.json$/.test(asset.fileName)) continue;
        const iconPrefix = portable ? '../icons/' : '/probate-guardian/icons/';
        asset.source = String(asset.source).replaceAll('"src": "icons/', `"src": "${iconPrefix}`);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const portable = mode === 'portable';
  return {
    root: '.',
    base: portable ? './' : '/probate-guardian/',
    build: {
      outDir: portable ? 'dist/portable' : 'dist/web',
      emptyOutDir: true,
      rollupOptions: portable ? undefined : {
        output: {
          entryFileNames: 'assets/[name]-[hash]-v2.js',
        },
      },
    },
    plugins: [
      viteStaticCopy({ targets: STATIC_COPY_TARGETS }),
      rewriteManifestIconPaths(portable),
      ...(portable ? [viteSingleFile(), portableCspHashes()] : []),
    ],
  };
});
