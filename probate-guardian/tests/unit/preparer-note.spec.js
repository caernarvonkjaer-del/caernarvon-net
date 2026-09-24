import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PREPARER_NOTE_TEXT, preparerNoteHTML } from '../../src/core/signature/preparer-note.js';

// Milestone 40H-E added a preparer-authorization note -- "confirm you have that
// party's actual legal authorization to sign on their behalf" -- because the
// person operating this app is not necessarily the person signing. It was placed
// "immediately above the existing sworn statement", one hand-typed copy per
// feature module, and this spec pinned exactly that: one note per file, next to
// one named perjury sentence.
//
// Milestone 63D found that the rule which was built ("next to the oath") is not
// the rule the note exists for ("where a signature is attached"). They differ on
// every attorney, preparer and certificate page (no oath), on three Plan pages
// (checkboxes sit between the heading and the oath, so the note was below the
// fold), and on Simplified Part III (the oath is there, the signatures are on
// Part IV -- so "on this page" was false). Ten signing pages had no note.
//
// So the page set is now DERIVED, not listed: every page function that renders a
// signature control (renderSignatureStateControl) must show the note as the first
// thing under its <h1>, through the one shared helper; no other page may show it.
// A new signing page, or a new filing type, is covered without touching this file.
// Source-text assertions, matching this repo's style for this kind of DOM-shape
// check; the rendered proof is tests/e2e/preparer-note-placement.spec.ts.

const root = path.resolve(__dirname, '../..');
const read = (relPath) => fs.readFileSync(path.join(root, relPath), 'utf8');

const featureIndexFiles = fs.readdirSync(path.join(root, 'src/features'))
  .map((dir) => `src/features/${dir}/index.js`)
  .filter((rel) => fs.existsSync(path.join(root, rel)));

// Milestone 68C put a signing page in a SHARED module -- the Plans' Certificate
// of Service, src/core/form/plan-certificate-of-service-page.js -- which this
// scan did not read, so the page shipped without the note and only the
// rendered spec caught it. Shared page modules follow the *-page.js naming, and
// are scanned alongside the feature modules.
const sharedPageFiles = fs.readdirSync(path.join(root, 'src/core/form'))
  .filter((name) => name.endsWith('-page.js'))
  .map((name) => `src/core/form/${name}`);
const pageFiles = [...featureIndexFiles, ...sharedPageFiles];

// Splits a module into its top-level functions. Anything between two functions
// (module constants) rides along with the earlier one, which is harmless: none of
// it renders a signature control or the note.
function topLevelFunctions(source) {
  const re = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  const starts = [];
  let match;
  while ((match = re.exec(source))) starts.push({ name: match[1], index: match.index });
  return starts.map((start, i) => ({
    name: start.name,
    body: source.slice(start.index, i + 1 < starts.length ? starts[i + 1].index : source.length),
  }));
}

const pages = pageFiles.flatMap((file) =>
  topLevelFunctions(read(file)).map((fn) => ({ file, ...fn, signs: fn.body.includes('renderSignatureStateControl(') })));
const signingPages = pages.filter((p) => p.signs);
const otherPages = pages.filter((p) => !p.signs);

describe('Milestone 63D: the preparer-authorization note is where a signature can be attached', () => {
  test('the derivation finds the signing pages of every filing type', () => {
    // Not a page count: a new page must not require editing this file. It only
    // has to prove the scan sees something in each module that captures signatures.
    const filesWithSignatures = new Set(signingPages.map((p) => p.file));
    expect([...filesWithSignatures].sort()).toEqual([
      'src/core/form/plan-certificate-of-service-page.js',
      'src/features/annual-accounting/index.js',
      'src/features/guardian-inventory/index.js',
      'src/features/plan-annual/index.js',
      'src/features/plan-initial/index.js',
      'src/features/plan-minor/index.js',
      'src/features/plan-simplified/index.js',
      'src/features/simplified-accounting/index.js',
    ]);
  });

  test.each(signingPages.map((p) => [`${p.file} :: ${p.name}`, p]))(
    '%s shows the note as the first thing under its <h1>',
    (_label, page) => {
      // <h1>…</h1>, then nothing but whitespace, then the helper call.
      expect(page.body, `${page.name} renders a signature control but has no preparerNoteHTML() directly under its <h1>`)
        .toMatch(/<h1[^>]*>[^<]*<\/h1>\s*\$\{preparerNoteHTML\(\)\}/);
    },
  );

  test.each(otherPages.map((p) => [`${p.file} :: ${p.name}`, p]))(
    '%s captures no signature, so it does not show the note',
    (_label, page) => {
      expect(page.body, `${page.name} shows the note but renders no signature control, so "on this page" is untrue`)
        .not.toContain('preparerNoteHTML(');
    },
  );

  test.each(pageFiles)('%s has no hand-typed copy of the note', (file) => {
    const code = read(file);
    expect(code).not.toContain(PREPARER_NOTE_TEXT);
    expect(code).not.toContain('class="preparer-note"');
  });

  test('the helper renders the one note, in the shared .preparer-note element', () => {
    expect(preparerNoteHTML()).toBe(`<div class="preparer-note">${PREPARER_NOTE_TEXT}</div>`);
    expect(PREPARER_NOTE_TEXT).toBe("Preparer's note: Before attaching any signature on this page, confirm you have that party's actual legal authorization to sign on their behalf. Do not sign for a party you have not been authorized to sign for.");
  });

  test('the shared .preparer-note CSS class exists exactly once, in styles/cards.css', () => {
    const css = read('src/styles/cards.css');
    const matches = css.match(/\.preparer-note\s*\{/g) || [];
    expect(matches.length).toBe(1);
  });

  const PDF_MODEL_FILES = [
    'src/features/guardian-inventory/pdf-model.js',
    'src/features/simplified-accounting/pdf-model.js',
    'src/features/annual-accounting/pdf-model.js',
    'src/features/plan-simplified/pdf-model.js',
    'src/features/plan-minor/pdf-model.js',
    'src/features/plan-initial/pdf-model.js',
    'src/features/plan-annual/pdf-model.js',
  ];

  test.each(PDF_MODEL_FILES)('%s never emits the preparer-note text into the exported document', (file) => {
    const code = read(file);
    expect(code).not.toContain(PREPARER_NOTE_TEXT);
    expect(code.toLowerCase()).not.toContain('preparer-note');
    expect(code.toLowerCase()).not.toContain("preparer's note");
  });
});
