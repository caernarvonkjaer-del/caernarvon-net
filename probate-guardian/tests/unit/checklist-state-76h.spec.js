// Milestone 76H item 10 (decision 76H-2): checklist rows print their label
// alone and carry the ticked state in their tag's /ActualText (the engine
// itself is read in the browser: pdf-structure-tags.spec.ts,
// plan-initial-multiselect.spec.ts). Here: the text string that entry is
// written as, and 10F, a Yes/No question, printing its answer.
import { beforeAll, describe, expect, test, vi } from 'vitest';

let pdfTextString;
let buildPlanInitialModel;
let T;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  ({ pdfTextString } = await import('../../src/core/pdf/pdf-accessibility.js'));
  ({ buildPlanInitialModel } = await import('../../src/features/plan-initial/pdf-model.js'));
  T = (await import('../../src/core/filing/court-text/plan-initial.js'));
});

describe('the /ActualText string', () => {
  test('plain ASCII is a literal, its parentheses and backslashes escaped', () => {
    expect(pdfTextString('Checked: Group Home (ALF)')).toBe('(Checked: Group Home \\(ALF\\))');
  });
  test('anything else is UTF-16BE hex with its byte-order mark, so "—" and accents survive', () => {
    expect(pdfTextString('Not checked: a — é')).toBe('<FEFF004E006F007400200063006800650063006B00650064003A00200061002020140020' + '00E9>');
  });
});

describe('10F prints its answer', () => {
  const q10F = (answer) => buildPlanInitialModel({ inventoryType: 'planInitial', wardName: 'Ward Doe', county: 'Pinellas', committeeIncorporated: answer })
    .sections.flatMap((s) => s.blocks || []).flatMap((b) => [b, ...(b.items || [])]);
  const question = () => Object.values(T).find((v) => typeof v === 'object' && v && typeof v.q10F === 'string')?.q10F;
  test('as a labelled answer, never a "Yes"/"No" checklist', () => {
    const label = question();
    expect(label).toContain('examining committee');
    for (const answer of ['Yes', 'No', '']) {
      const items = q10F(answer);
      expect(items.find((i) => i.label === label)?.value).toBe(answer);
      expect(items.some((b) => b.type === 'checklist' && b.title === label)).toBe(false);
    }
  });
});
