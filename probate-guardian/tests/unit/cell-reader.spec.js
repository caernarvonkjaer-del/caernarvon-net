import { describe, it, expect } from 'vitest';
import { readRepoSource, LEGACY_APP } from './support/legacy-source-extract.js';

// Milestone 53A: fmtDateCard() was dead in legacy-app.js -- its dashboard
// caller left in 5d318ed and nothing replaced it. This is the red-first
// dead-code detector for that deletion; Milestone 53B widens the name list
// to the whole cell-reader cluster (fmtDate, unwrapCellValue, readCellText)
// once those move to src/core/excel/cell-reader.js, and it then stays as the
// permanent guard against any of them being reintroduced as a classic-script
// global. legacy-app.js exposes top-level function declarations on `window`
// implicitly, so there is no `window.X =` line for the bridge allow-list to
// catch -- the declaration itself is the global, and this scan is the check.
describe('legacy-app.js carries no copy of the cell-reader cluster', () => {
  const NAMES = ['fmtDateCard'];

  it.each(NAMES)('does not declare a top-level function %s', (name) => {
    const source = readRepoSource(LEGACY_APP);
    const decl = new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm');
    // A boolean, not `expect(source).not.toMatch(decl)`: on failure vitest
    // prints the received value, and the received value here is all of
    // legacy-app.js.
    expect(decl.test(source), `${name} is still declared in ${LEGACY_APP}`).toBe(false);
  });
});
