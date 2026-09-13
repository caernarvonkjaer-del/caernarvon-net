import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';

// Milestone 40G. legacy-app.js is a classic, parser-blocking script, so all of
// its top-level code runs before any `<script type="module">` has evaluated.
// Starting the app from there meant initApp() ran against a half-built global
// surface and threw on every load once a case existed:
//
//   TypeError: window.createFeatureBridge is not a function   (feature-bridge.js)
//   ReferenceError: _lastAutoSavedAt is not defined            (Milestone 40F)
//
// The fix is an ordering guarantee: main.js calls window.initApp() as its last
// statement, after every import has evaluated.
//
// These are source-structure assertions on purpose. The crash is effectively
// unreproducible in e2e -- every path that reaches the failing code first
// awaits a prompt (session-restore, open-or-start, unlock), and that await
// gives deferred modules ample time to evaluate, so the race resolves the
// harmless way. The live site hit it because it auto-opened a remembered case
// with no prompt at all. A behavioural test would therefore pass whether or
// not the bug is present, which is exactly how this shipped: startup.spec.ts
// has asserted a clean console since long before the bug was found.
describe('Milestone 40G: app startup is ordered after ES-module evaluation', () => {
  const read = (rel) => readFile(new URL(`../../${rel}`, import.meta.url), 'utf8');

  // Strip line comments so the prose above (and in legacy-app.js) can discuss
  // initApp() without tripping the assertions.
  const executableLines = (source) =>
    source.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//') && !l.startsWith('*'));

  test('legacy-app.js does not start the app itself', async () => {
    const lines = executableLines(await read('src/legacy-app.js'));
    const selfStarts = lines.filter((l) => /^initApp\(\s*\)\s*;?$/.test(l) || /^window\.initApp\(\s*\)\s*;?$/.test(l));
    expect(
      selfStarts,
      'legacy-app.js must not call initApp() at top level -- it runs before any module has evaluated'
    ).toEqual([]);
  });

  test('main.js starts the app, after its imports', async () => {
    const source = await read('src/main.js');
    expect(source).toMatch(/window\.initApp\(\s*\)/);

    // The call must come after the last import, or the guarantee is void.
    const lastImport = source.lastIndexOf('\nimport ');
    const callSite = source.indexOf('window.initApp()');
    expect(lastImport).toBeGreaterThan(-1);
    expect(callSite).toBeGreaterThan(lastImport);
  });

  test('main.js imports the module that provides the global startup depends on', async () => {
    // window.createFeatureBridge is published by core/feature-bridge.js, and
    // the dashboard mount calls it during the very first renderPage().
    const source = await read('src/main.js');
    expect(source).toContain("import './core/feature-bridge.js'");
  });

  test('feature-bridge.js still publishes createFeatureBridge on window', async () => {
    // If this moves to a named export only, legacy-app.js's classic-script
    // call site breaks silently again.
    const source = await read('src/core/feature-bridge.js');
    expect(source).toMatch(/window\.createFeatureBridge\s*=/);
  });
});
