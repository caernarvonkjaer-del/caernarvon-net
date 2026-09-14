import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

describe('Milestone 37-5 explicit Yes/No radio migration', () => {
  const legacy = read('src/legacy-app.js');
  const formFields = read('src/core/form/form-fields.js');
  const annual = read('src/features/annual-accounting/index.js');
  const initial = read('src/features/plan-initial/index.js');
  const planAnnual = read('src/features/plan-annual/index.js');

  // Milestone 41-1 made legacy-app.js's yesNoRadioHTML() delegate to Tier 1's
  // renderYesNoField() (form-fields.js) with zero call-site changes; the
  // markup this test pins moved with it. Dead-code cleanup later deleted
  // yesNoRadioHTML()'s own ~15-line duplicate fallback body (never reachable
  // in the running app -- window.renderYesNoField is always defined by the
  // time it's called, confirmed by MILESTONE-41-PROPOSAL.md's own audit), so
  // the literal fieldset/radio markup this test used to find in legacy-app.js
  // no longer exists there at all; form-fields.js is the one real source now.
  test('shared renderer is an accessible radio pair with an unanswered state', () => {
    expect(legacy).toContain('function yesNoRadioHTML(');
    expect(formFields).toContain('<fieldset class="plan-yes-no');
    expect(formFields).toContain('type="radio"');
    expect(formFields).toContain('value="Yes"');
    expect(formFields).toContain('value="No"');
    expect(legacy).not.toContain('function yesNoCheckboxHTML(');
  });

  test('does not leave a legacy Yes/No checkbox behind', () => {
    const source = [legacy, annual, initial, planAnnual].join('\n');
    expect(source).not.toMatch(/type="checkbox"[^>]*(?:data-form-value="yes-no"|data-annual-value="yes-no")/);
  });

  test('migrates each bespoke Annual Accounting and directive-record control', () => {
    for (const fieldPath of [
      'schD1.${i}.restricted', 'schD2.${i}.residence', 'schD2.${i}.income',
      'schD4.${i}.restricted',
    ]) {
      expect(annual).toContain(fieldPath);
    }
    expect(annual).toContain('yesNoRadioAnnualHTML');
    expect(initial).toContain("yesNoCheckboxS(`q11dir_${i}_revoked`");
    expect(planAnnual).toContain("yesNoCheckboxS(`q10dir_${i}_revoked`");
    expect(initial).toContain('r.courtRevoked');
    expect(planAnnual).toContain('r.courtRevoked');
  });
});
