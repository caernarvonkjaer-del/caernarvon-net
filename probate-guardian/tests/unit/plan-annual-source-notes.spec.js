import { describe, expect, test } from 'vitest';

// Milestone 61D. The Annual Guardianship Plan's court original carries a note
// above question 1, telling the guardian that the rights shown on the
// physician's report have to match the order that granted the guardianship --
// and what to do when they don't. The app's generated plan left it out, so a
// guardian working from the app never saw the instruction their court form
// gives them.
//
// Source: reference/plan-forms/plan-annual-original.txt:46-49.
//
// The Disaster Plan note that sits beside it in the same source form is
// deliberately NOT here: it is a Sixth Circuit local requirement, delivered
// county-gated through Help, and tests/unit/content-corrections.spec.js
// guards it out of src/. See 61D.

global.window = { ...(global.window || {}) };

const { buildPlanAnnualModel } = await import('../../src/features/plan-annual/pdf-model.js');

const noticeTexts = (model) => {
  const out = [];
  for (const section of model.sections || []) {
    for (const block of section.blocks || []) {
      if (block.type === 'notice') out.push(`${block.title || ''} ${block.text || ''}`);
    }
  }
  return out;
};

describe('Milestone 61D: Annual Plan carries its source form\'s rights-consistency note', () => {
  test('the note appears in the generated plan', () => {
    const joined = noticeTexts(buildPlanAnnualModel({})).join('\n');
    expect(joined).toMatch(/rights on the physician's report should match the Order Determining Incapacity/);
    expect(joined).toMatch(/petition to remove or restore rights/);
  });

  test('it sits on the cover, ahead of question 1, as the source form has it', () => {
    const model = buildPlanAnnualModel({});
    const cover = (model.sections || []).find((s) => s.id === 'cover');
    const coverText = (cover.blocks || [])
      .filter((b) => b.type === 'notice')
      .map((b) => b.text || '')
      .join('\n');
    expect(coverText).toMatch(/Order Determining Incapacity/);
  });

  // The circuit-specific half of the same source page stays out of the PDF.
  test('no Administrative Order reaches the generated plan', () => {
    const joined = noticeTexts(buildPlanAnnualModel({})).join('\n');
    expect(joined).not.toMatch(/2019-005|2024-025|Administrative Order/);
  });
});
