import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { classicScriptSources } from './support/classic-scripts.js';

// Milestone 40G. legacy-app.js was a classic, parser-blocking script, so all
// of its top-level code ran before any `<script type="module">` had evaluated.
// Starting the app from there meant initApp() ran against a half-built global
// surface and threw on every load once a case existed:
//
//   TypeError: window.createFeatureBridge is not a function   (feature-bridge.js)
//   ReferenceError: _lastAutoSavedAt is not defined            (Milestone 40F)
//
// The fix is an ordering guarantee: main.js starts the app as its last
// statement, after every import has evaluated. Since Milestone 70's 70K that is
// a direct call -- startGuardianForms(), imported from
// src/core/startup/bootstrap.js, with the feature services handed in -- and
// window.initApp and window.createFeatureBridge are gone: nothing is looked up
// on window at all.
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

  // Strip line comments so the prose above (and in any script) can discuss
  // initApp() without tripping the assertions.
  const executableLines = (source) =>
    source.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//') && !l.startsWith('*'));

  // Milestone 70's 70L deleted legacy-app.js; the rule holds for every classic
  // script index.html loads, since each runs before any module has evaluated.
  test('no classic script starts the app itself', () => {
    for (const { file, source } of classicScriptSources()) {
      const selfStarts = executableLines(source).filter((l) => /\b(initApp|startGuardianForms)\s*\(/.test(l));
      expect(selfStarts, `${file} must not start the app -- it runs before any module has evaluated`).toEqual([]);
    }
  });

  test('main.js starts the app with startGuardianForms(), after its imports', async () => {
    const source = await read('src/main.js');
    expect(source).toContain("import { startGuardianForms } from './core/startup/bootstrap.js';");
    expect(executableLines(source).join('\n')).not.toMatch(/initApp/);

    // The call must come after the last import, or the guarantee is void.
    const lastImport = source.lastIndexOf('\nimport ');
    const callSite = source.indexOf('await startGuardianForms(');
    expect(lastImport).toBeGreaterThan(-1);
    expect(callSite).toBeGreaterThan(lastImport);
  });

  test('the features go in as a service: main.js hands in the loader it imports', async () => {
    // The dashboard's first mount needs the feature bridges; they come from
    // src/features-loader.js's featureServices, handed to startGuardianForms(),
    // not from a window global a classic script called.
    const source = await read('src/main.js');
    expect(source).toContain("import { featureServices } from './features-loader.js';");
    expect(source).toMatch(/startGuardianForms\(\{ features: featureServices,/);
  });

  test('no module publishes the feature bridge, or looks for initApp, on window', async () => {
    const bridge = executableLines(await read('src/core/feature-bridge.js')).join('\n');
    expect(bridge).not.toMatch(/window\.createFeatureBridge|window\.disposeActiveFeature/);
    const bootstrap = executableLines(await read('src/core/startup/bootstrap.js')).join('\n');
    expect(bootstrap).not.toMatch(/window\./);
  });
});
