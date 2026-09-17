import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readRepoSource, LEGACY_APP } from './support/legacy-source-extract.js';

// Milestone 56A deleted exportHelpGuideAsPDF() from legacy-app.js -- roughly
// 200 lines that built a complete HTML user guide (cover, table of contents,
// section prose, Q&A) and rendered it through html2pdf. It was dead: no call
// site anywhere in src/, fragments/ or index.html, no `window.X =` bridge
// entry, and no appearance in the generated window-bridge.d.ts.
//
// The deletion mattered beyond ordinary cleanup because the function carried
// its own hand-maintained second copy of the user-guide prose. Every
// correction Milestone 56B-56F made to help/index.html would have needed
// making twice if it were ever revived. This scan is the guard against that
// trap being re-laid.
//
// Same shape as cell-reader.spec.js's dead-code detector, and for the same
// reason: legacy-app.js is a classic script, so a top-level `function X(){}`
// IS the global. There is no `window.X =` line for the bridge allow-list to
// catch -- the declaration itself is the exposure, and this scan is the check.
describe('legacy-app.js carries no copy of exportHelpGuideAsPDF', () => {
  it('does not declare a top-level function exportHelpGuideAsPDF', () => {
    const source = readRepoSource(LEGACY_APP);
    const decl = /^(?:async\s+)?function\s+exportHelpGuideAsPDF\s*\(/m;
    // A boolean, not `expect(source).not.toMatch(decl)`: on failure vitest
    // prints the received value, and the received value here is all of
    // legacy-app.js.
    expect(
      decl.test(source),
      `exportHelpGuideAsPDF is still declared in ${LEGACY_APP}`,
    ).toBe(false);
  });

  // The stale comment in tokens.css was the function's only other mention in
  // the repository. Left as-is it would name a function that does not exist,
  // which is how a reader concludes the theme tokens still have a PDF-guide
  // consumer to worry about.
  it('is not named by the tokens.css theme-isolation comment', () => {
    const tokens = readFileSync(
      new URL('../../src/styles/tokens.css', import.meta.url),
      'utf8',
    );
    expect(
      tokens.includes('exportHelpGuideAsPDF'),
      'src/styles/tokens.css still names exportHelpGuideAsPDF',
    ).toBe(false);
  });
});
