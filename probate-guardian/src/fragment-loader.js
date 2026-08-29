// Lazy-loads trusted static HTML fragments, per INDEX-SPLIT-PLAN.md's
// module contract. Startup, unlock, recovery, and fatal-error markup stay
// inline in index.html (needed on every session — see step 3); this is for
// markup only some sessions ever need.
//
// A `help.html` fragment was considered (INDEX-SPLIT-PLAN.md's target
// structure lists one) but isn't created yet: the help panel's actual
// content is data-driven from legacy-app.js's HELP_CONTENT registry and
// injected at runtime, not static HTML sitting inline in index.html — there
// was nothing substantial to extract. Revisit if that changes.
//
// Fragment HTML is loaded two different ways depending on how the page
// itself was loaded, because no single mechanism works everywhere:
//
// - Normally (http/https, whether Vite-processed or served completely raw
//   -- source/dev/web all qualify, and so does today's actual no-build-step
//   Cloudflare Pages deployment of the raw repo root): plain fetch() of the
//   static file. This needs zero build tooling to work at all, which
//   matters because right now Cloudflare deploys the raw repo with no build
//   step -- code that only works after Vite processing would break that
//   live deployment. Verified empirically: a `?raw` dynamic import alone
//   throws "Failed to fetch dynamically imported module" when the page is
//   served with no Vite transformation at all.
// - Under file:// (dist/portable's double-click workflow): Chrome blocks
//   fetch() of local files entirely (the exact restriction
//   INDEX-SPLIT-PLAN.md's "Required decision" section warns about), so this
//   branch instead uses a dynamic import() of a `?raw`-suffixed module.
//   dist/portable IS built by Vite, and vite-plugin-singlefile sets
//   `codeSplitting:false` for that target, so this same import() call gets
//   merged into the one inlined script at build time rather than staying a
//   runtime import -- no fetch, no separate chunk, satisfying the portable
//   build's own "no runtime fragment fetch() calls" requirement. This
//   branch is unreachable (and its import() target simply unresolved) on
//   every other target, which is fine -- dynamic import() is only evaluated
//   when the line actually runs, and Vite's bundler still discovers and
//   pre-builds the chunk regardless of which runtime branch reaches it.
const ALLOWED_FRAGMENTS = new Set(['common-modals']);
const templateCache = new Map(); // one entry per allowlisted fragment; no eviction needed at this size

async function loadFragmentHtml(name) {
  if (location.protocol === 'file:') {
    switch (name) {
      case 'common-modals':
        return (await import('../fragments/common-modals.html?raw')).default;
      default:
        throw new Error(`Unknown fragment: ${name}`);
    }
  }
  const url = new URL(`fragments/${name}.html`, document.baseURI);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${name}: ${response.status}`);
  return response.text();
}

export async function loadFragment(name) {
  if (!ALLOWED_FRAGMENTS.has(name)) throw new Error(`Unknown fragment: ${name}`);

  if (templateCache.has(name)) {
    return templateCache.get(name).content.cloneNode(true);
  }

  const html = await loadFragmentHtml(name);
  const template = document.createElement('template');
  template.innerHTML = html; // parsed once, here
  templateCache.set(name, template);
  return template.content.cloneNode(true);
}

// Temporary: legacy-app.js stays a classic (non-module) script per
// Milestone 1's recorded decision, so it can't `import` this module
// directly -- its ensureFragment() helper reaches this via window instead.
// Remove this assignment once a real src/main.js bootstrap exists to own
// this wiring explicitly (a later milestone, once more of the app is
// module-based and main.js's actual job -- the startup sequence -- exists).
window.loadFragment = loadFragment;
