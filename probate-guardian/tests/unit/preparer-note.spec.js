import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

// Milestone 40H-E: every filing type's guardian/party signature page pairs a
// sworn "Under penalties of perjury..." statement with the actual signature
// capture, but nothing told the *preparer* -- the person operating this app,
// not necessarily the same person signing -- that attaching a signature on
// someone else's behalf requires that person's actual authorization. Seven
// hand-rolled sites (one per feature module, covering all nine filing types
// -- annual-accounting's single site serves Annual/Final/Trust) each needed
// the same one-line note inserted immediately above their existing sworn
// statement. Source-text assertions, matching this repo's established style
// for this kind of DOM-shape check (see guardian-inventory-yes-no-radio.spec.js).

const root = path.resolve(__dirname, '../..');
const read = (relPath) => fs.readFileSync(path.join(root, relPath), 'utf8');

const NOTE_TEXT = "Preparer's note: Before attaching any signature on this page, confirm you have that party's actual legal authorization to sign on their behalf. Do not sign for a party you have not been authorized to sign for.";

const SIGNING_PAGES = [
  { file: 'src/features/guardian-inventory/index.js', attestationNeedle: 'UNDER PENALTIES OF PERJURY, I declare that I have read the foregoing' },
  { file: 'src/features/simplified-accounting/index.js', attestationNeedle: 'Under penalties of perjury, I declare that I have read and examined the foregoing return' },
  { file: 'src/features/annual-accounting/index.js', attestationNeedle: "UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property" },
  { file: 'src/features/plan-simplified/index.js', attestationNeedle: 'Under penalty of perjury, I declare that I have read the foregoing' },
  { file: 'src/features/plan-minor/index.js', attestationNeedle: 'Under penalties of perjury, each signing guardian declares' },
  { file: 'src/features/plan-initial/index.js', attestationNeedle: 'Under penalties of perjury, each signing guardian declares' },
  { file: 'src/features/plan-annual/index.js', attestationNeedle: 'Under penalties of perjury, I declare that I have read and examined the foregoing plan' },
];

const PDF_MODEL_FILES = [
  'src/features/guardian-inventory/pdf-model.js',
  'src/features/simplified-accounting/pdf-model.js',
  'src/features/annual-accounting/pdf-model.js',
  'src/features/plan-simplified/pdf-model.js',
  'src/features/plan-minor/pdf-model.js',
  'src/features/plan-initial/pdf-model.js',
  'src/features/plan-annual/pdf-model.js',
];

describe('Milestone 40H-E: preparer-authorization note on every signing page', () => {
  test.each(SIGNING_PAGES)('$file has a .preparer-note immediately preceding its sworn statement', ({ file, attestationNeedle }) => {
    const code = read(file);
    const noteIndex = code.indexOf(NOTE_TEXT);
    const attestationIndex = code.indexOf(attestationNeedle);

    expect(noteIndex, `.preparer-note text not found in ${file}`).toBeGreaterThan(-1);
    expect(attestationIndex, `attestation text not found in ${file}`).toBeGreaterThan(-1);
    expect(noteIndex).toBeLessThan(attestationIndex);

    // "Immediately preceding" -- no other rendered content between the note
    // and the attestation statement (only the div wrapper markup itself).
    const between = code.slice(noteIndex + NOTE_TEXT.length, attestationIndex);
    expect(between.trim().replace(/<[^>]+>/g, '').trim()).toBe('');
  });

  test('the shared .preparer-note CSS class exists exactly once, in styles/cards.css', () => {
    const css = read('src/styles/cards.css');
    const matches = css.match(/\.preparer-note\s*\{/g) || [];
    expect(matches.length).toBe(1);
  });

  test.each(PDF_MODEL_FILES)('%s never emits the preparer-note text into the exported document', (file) => {
    const code = read(file);
    expect(code).not.toContain(NOTE_TEXT);
    expect(code.toLowerCase()).not.toContain('preparer-note');
    expect(code.toLowerCase()).not.toContain("preparer's note");
  });
});
