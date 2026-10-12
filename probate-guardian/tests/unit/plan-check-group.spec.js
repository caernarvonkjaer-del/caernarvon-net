import { describe, expect, it } from 'vitest';
import { planCheckGroup } from '../../src/core/form/field-html.js';

// Milestone 73Q, found while checking the user guide's figures: the Initial
// Plan's Question 11B printed "Describe the "Other" directive." above its four
// boxes whether or not Other was ticked -- asking for a description nobody had
// to give. The prompt now labels the box that appears when Other is ticked, as
// the Annual Plan's Question 10 already did.

const boxes = '<input type="checkbox" id="q11ExecOther">';
const PROMPT = 'Describe the "Other" directive';

describe('a Plan check group with a description prompt', () => {
  it('shows no prompt while the box it asks about is not ticked', () => {
    const html = planCheckGroup('', boxes, 'q11ExecOtherText', '', false, PROMPT);
    expect(html).not.toContain('Describe the');
    expect(html).not.toContain('q11ExecOtherText');
  });

  it('labels the description box with it once the box is ticked', () => {
    const html = planCheckGroup('', boxes, 'q11ExecOtherText', 'Living will', true, PROMPT);
    const label = html.match(/<label[^>]*for="q11ExecOtherText"[^>]*>([\s\S]*?)<\/label>/)?.[1] || '';
    expect(label).toContain('Describe the');
    expect(html.indexOf('Describe the'), 'not above the boxes').toBeGreaterThan(html.indexOf('plan-check-grid'));
  });

  it('keeps "Explanation" as the label where no prompt is given', () => {
    const html = planCheckGroup('', boxes, 'q3Explain', '', true);
    const label = html.match(/<label[^>]*for="q3Explain"[^>]*>([\s\S]*?)<\/label>/)?.[1] || '';
    expect(label).toContain('Explanation');
  });
});
