import { describe, expect, test } from 'vitest';
import { serviceRecipientIssues, recipientRowStarted, attestationRelevant } from '../../src/core/validation/service-recipients.js';

// Milestone 57B. Three families had three different rules over the same idea,
// producing two opposite defects: the Initial Inventory blocked export on an
// accidentally-added empty card, while both accountings let a half-addressed
// second recipient reach the clerk unremarked. And on all three, a filer with
// genuinely nobody to serve could not say so.

const FIELDS = ['name', 'line2'];
const missingName = (r) => ((r.name || '').trim() ? [] : ['Name']);
const run = (rows, attestation) => serviceRecipientIssues({
  rows, attestation, startedFields: FIELDS, missingFields: missingName,
});

describe('serviceRecipientIssues() — D16, the attestation is asked only when nobody is listed', () => {
  test('nothing entered and unanswered: ask, and do not also demand Recipient 1', () => {
    const r = run([{ name: '', line2: '' }], '');
    expect(r.needsAttestation).toBe(true);
    expect(r.firstRowMissing).toEqual([]);
  });

  test('a listed recipient answers the question by itself — the filer never sees it', () => {
    expect(run([{ name: 'A Person' }], '').needsAttestation).toBe(false);
  });

  test("'Yes' ignores the rows entirely, without clearing them", () => {
    const rows = [{ name: '' }, { name: '', line2: 'orphan' }];
    const r = run(rows, 'Yes');
    expect(r).toEqual({ needsAttestation: false, firstRowMissing: [], extraRows: [] });
    expect(rows[1].line2, 'section 4: hiding never deletes').toBe('orphan');
  });

  test("'No' means recipients ARE required, so Recipient 1 becomes owed", () => {
    const r = run([{ name: '' }], 'No');
    expect(r.needsAttestation).toBe(false);
    expect(r.firstRowMissing).toEqual(['Name']);
  });
});

describe('serviceRecipientIssues() — D17, one rule for cards 2+', () => {
  test('an untouched extra card is ignored — the Inventory used to block on this', () => {
    expect(run([{ name: 'A Person' }, { name: '', line2: '' }], '').extraRows).toEqual([]);
  });

  test('a started extra card must be finished — the accountings used to export this silently', () => {
    expect(run([{ name: 'A Person' }, { name: '', line2: '1 Main St' }], '').extraRows)
      .toEqual([{ index: 1, missing: ['Name'] }]);
  });

  test('a complete extra card is fine', () => {
    expect(run([{ name: 'A' }, { name: 'B', line2: '1 Main St' }], '').extraRows).toEqual([]);
  });

  test('a started Recipient 1 is owed in full rather than offered the attestation', () => {
    const r = run([{ name: '', line2: '1 Main St' }], '');
    expect(r.needsAttestation).toBe(false);
    expect(r.firstRowMissing).toEqual(['Name']);
  });
});

describe('recipientRowStarted()', () => {
  test('blank, missing and absent rows are not started', () => {
    expect(recipientRowStarted({ name: '', line2: '' }, FIELDS)).toBe(false);
    expect(recipientRowStarted(undefined, FIELDS)).toBe(false);
    expect(recipientRowStarted({}, FIELDS)).toBe(false);
  });

  test('any content starts a row', () => {
    expect(recipientRowStarted({ name: '', line2: 'x' }, FIELDS)).toBe(true);
  });

  // A tri-state must never be inferred from absence (section 4).
  test('an empty list with no answer asks, rather than assuming none are required', () => {
    expect(run([], '').needsAttestation).toBe(true);
    expect(run(undefined, '').needsAttestation).toBe(true);
  });
});

// Milestone 63B. D16 says a filer who lists a recipient "never sees the
// question", but the three pages rendered the Yes/No unconditionally -- only the
// requirement was conditional, not the visibility. attestationRelevant() is the
// page's half of the rule, defined next to the validator's so neither can drift
// from the other: the question is shown exactly when serviceRecipientIssues()
// could ask it, plus when 'Yes' is selected (the cards are hidden then, and the
// control is the only way back).
describe('attestationRelevant() — Milestone 63B, D3', () => {
  const rel = (rows, attestation) => attestationRelevant({ rows, attestation, startedFields: FIELDS });

  test('a blank Recipient 1 shows the question', () => {
    expect(rel([{ name: '', line2: '' }], '')).toBe(true);
    expect(rel([{}], '')).toBe(true);
  });

  test('missing or empty rows show it too — nothing is listed', () => {
    expect(rel([], '')).toBe(true);
    expect(rel(undefined, '')).toBe(true);
  });

  test("a started Recipient 1 hides it when the answer is '' or 'No'", () => {
    expect(rel([{ name: 'A Person' }], '')).toBe(false);
    expect(rel([{ name: '', line2: '1 Main St' }], '')).toBe(false);
    expect(rel([{ name: 'A Person' }], 'No')).toBe(false);
  });

  test("'Yes' always shows it, even with a recipient typed — the cards are hidden and this is the way back", () => {
    expect(rel([{ name: 'A Person' }], 'Yes')).toBe(true);
    expect(rel([{ name: '' }], 'Yes')).toBe(true);
  });

  test('a started Recipient 2 does not hide it — only Recipient 1 answers the question', () => {
    expect(rel([{ name: '' }, { name: 'Second' }], '')).toBe(true);
  });

  test('it agrees with serviceRecipientIssues() everywhere the validator would ask', () => {
    const cases = [
      [[{ name: '', line2: '' }], ''], [[], ''], [[{ name: 'A' }], ''], [[{ name: 'A' }], 'No'],
      [[{ name: '' }], 'No'], [[{ name: 'A' }], 'Yes'], [[{ name: '' }], 'Yes'],
    ];
    for (const [rows, attestation] of cases) {
      const asked = run(rows, attestation).needsAttestation;
      // Wherever the validator asks, the page must be showing the question.
      if (asked) expect(rel(rows, attestation), JSON.stringify([rows, attestation])).toBe(true);
    }
  });
});
