import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

// Milestone 61G. The engine's `notice` renderer drew block.text and nothing
// else. Every PDF model that set a `title` on a notice had that heading
// silently discarded -- the paragraph printed, unlabelled.
//
// Two kinds of content were affected. On a certification page carrying more
// than one block, the filer lost the label saying whose certification they
// were reading. On a question page with no entries, an empty-state sentence
// printed with nothing to say which question it answered.
//
// The renderer is inside generateCourtFormPdf(), which needs a real jsPDF
// document and font subsetting to run; rather than stand up a fake, these
// assertions read the source. Whether the heading actually lands on the page
// is proved in the browser by tests/e2e/pdf-notice-title.spec.ts.

const ENGINE = fs.readFileSync(path.resolve(__dirname, '../../src/core/pdf/pdf-engine.js'), 'utf8');

/** The body of the `if (block.type === 'notice')` branch. */
function noticeBranch() {
  const start = ENGINE.indexOf("if (block.type === 'notice')");
  const end = ENGINE.indexOf("else if (block.type === 'key-value-grid')", start);
  expect(start, 'notice branch should exist').toBeGreaterThan(-1);
  expect(end, 'key-value-grid branch should follow it').toBeGreaterThan(start);
  return ENGINE.slice(start, end);
}

describe('Milestone 61G: a notice block\'s title reaches the page', () => {
  test('the notice renderer reads block.title', () => {
    expect(noticeBranch()).toMatch(/block\.title/);
  });

  test('it draws the title as text, not only into the structure tree', () => {
    const branch = noticeBranch();
    // doc.text(...) carrying the title is what puts ink on the page; adding it
    // to the accessibility tree alone would leave the visible page unchanged.
    // Matches the value wherever it is drawn from, so trimming it into a local
    // first (as the implementation does) still counts.
    const local = branch.match(/const\s+(\w+)\s*=\s*block\.title/);
    expect(local, 'the branch should derive the title from block.title').toBeTruthy();
    expect(branch).toMatch(new RegExp(`doc\\.text\\(\\s*(?:${local[1]}|block\\.title)`));
  });

  test('a title with no body text renders as a heading without an empty box', () => {
    // plan-annual's 'Additional Guardian Signatures' introduces the
    // co-guardian page and has no body. Drawing the bordered notice box under
    // it would put a blank grey rectangle on a filed court document.
    const branch = noticeBranch();
    // The body is read from block.text and tested for content...
    expect(branch).toMatch(/String\(block\.text[^;]*\);/);
    expect(branch).toMatch(/!!\w*[Bb]ody\.trim\(\)/);
    // ...and an empty one skips the box rather than drawing it at zero height.
    expect(branch).toMatch(/if\s*\(\s*!has\w*Body\s*\)/);
  });

  test('the heading and the paragraph it introduces are kept on one page', () => {
    // Checking space for the heading alone let it take the last line of a page
    // while its body started the next one -- measured on a real Guardian
    // Inventory PDF, heading on page 3 and body on page 4. One check covering
    // both is what keeps them together.
    const branch = noticeBranch();
    expect(branch).toMatch(/checkPageSpace\(\s*\w*[Tt]itleHeight\s*\+\s*boxHeight/);
  });

  test('it tags the title as a heading, like key-value-grid and table do', () => {
    expect(noticeBranch()).toMatch(/subHTag/);
  });

  test('the heading is skipped when a notice has no title', () => {
    // Untitled notices are the common case -- every explanation and filing
    // line. They must not gain a blank heading row.
    expect(noticeBranch()).toMatch(/block\.title\s*&&|if\s*\(\s*block\.title/);
  });
});

describe('Milestone 61G: the models that were losing headings', () => {
  // Re-derived at implementation time rather than trusting the count recorded
  // in MILESTONE-61-PROPOSAL.md, which was taken with a one-line grep window
  // and missed every notice whose `tag:` key sits between `type:` and
  // `title:` -- including all three Milestone 60 forms.
  const MODELS = [
    'plan-annual', 'plan-initial', 'plan-minor', 'plan-simplified',
    'annual-accounting', 'guardian-inventory', 'simplified-accounting',
  ];

  test('every model that sets a notice title is covered by the one engine fix', () => {
    const withTitles = [];
    for (const model of MODELS) {
      const src = fs.readFileSync(path.resolve(__dirname, `../../src/features/${model}/pdf-model.js`), 'utf8');
      // A titled notice: `type: 'notice',` followed, within a few keys, by a
      // `title:` before the object closes.
      const matches = src.match(/type:\s*'notice',(?:[^}]*?)title:/g) || [];
      if (matches.length) withTitles.push([model, matches.length]);
    }
    // Not an exact-count pin -- that would break on any new notice. The point
    // is that the affected set spans both form families, so the fix belongs in
    // the engine and not in the plan models alone.
    const names = withTitles.map(([m]) => m);
    expect(names).toContain('plan-simplified');
    expect(names, 'the Milestone 60 forms share this gap too').toContain('guardian-inventory');
    expect(withTitles.length).toBeGreaterThanOrEqual(6);
  });
});
