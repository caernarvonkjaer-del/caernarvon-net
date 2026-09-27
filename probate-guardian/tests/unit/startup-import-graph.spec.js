import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { auditApplication, moduleEntriesFromHtml } from '../../scripts/ms70-dependency-audit.mjs';

// Milestone 70, 70L: what the first page loads. The PDF engine -- pdf-lib and
// the embedded fonts, about 1.8 MB -- loads when a filer first opens Preview &
// Export, not at startup. 70K broke that: the page's action dispatcher
// (src/form-events.js) imported the Print button's target from
// src/core/pdf/pdf-preview.js, which imports the engine, so every start
// downloaded and ran it (the 70L measurements found it: 2 MB more heap on the
// first page). The Print button's target is its own small module now
// (src/core/pdf/print-current.js).
//
// Read from the dependency audit's static-import edges, starting at the
// module index.html loads. A dynamic import() is where an on-demand load
// begins, so it is not followed. The lazy boundary of the filing features
// themselves is proved in the browser (tests/e2e/feature-lazy-boundary.spec.ts).

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// On demand at 70A, before Milestone 70 touched any of it.
const ON_DEMAND = [
  'lib/pdf-lib.esm.js',
  'src/assets/embedded-fonts.js',
  'src/core/pdf/pdf-engine.js',
  'src/core/pdf/pdf-finalizer.js',
  'src/core/pdf/pdf-preview.js',
  'src/core/pdf/pdf-annotate.js',
  'src/core/pdf/pdf-accessibility.js',
];

describe('what the first page loads', () => {
  const audit = auditApplication(root);
  const entries = moduleEntriesFromHtml(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const next = new Map();
  for (const e of audit.edges) {
    if (e.kind !== 'import-static') continue;
    if (!next.has(e.from)) next.set(e.from, []);
    next.get(e.from).push(e.to);
  }
  // Every module reachable from the entry by static imports, with the path
  // that reaches it (the first found), to name the culprit when one appears.
  const via = new Map(entries.map((f) => [f, [f]]));
  const queue = [...entries];
  while (queue.length) {
    const from = queue.shift();
    for (const to of next.get(from) || []) {
      if (via.has(to)) continue;
      via.set(to, [...via.get(from), to]);
      queue.push(to);
    }
  }

  test('the entry is src/main.js, and the walk reaches the app', () => {
    expect(entries).toEqual(['src/main.js']);
    expect(via.size).toBeGreaterThan(100);
  });

  test('the PDF engine, its fonts and pdf-lib load on demand, not at startup', () => {
    const eager = ON_DEMAND.filter((f) => via.has(f)).map((f) => via.get(f).join(' -> '));
    expect(eager, 'reached from the startup module by static imports').toEqual([]);
  });

  test("no filing feature's page, print or workbook module loads at startup", () => {
    const eager = [...via.keys()].filter((f) => /^src\/features\/[^/]+\/(index|print|excel|pdf-model)\.js$/.test(f))
      .map((f) => via.get(f).join(' -> '));
    expect(eager).toEqual([]);
  });
});
