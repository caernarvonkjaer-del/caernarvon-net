import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

describe('Milestone 37-5 explicit Yes/No radio migration', () => {
  const legacy = read('src/legacy-app.js');
  const annual = read('src/features/annual-accounting/index.js');
  const initial = read('src/features/plan-initial/index.js');
  const planAnnual = read('src/features/plan-annual/index.js');

  test('shared renderer is an accessible radio pair with an unanswered state', () => {
    expect(legacy).toContain('function yesNoRadioHTML(');
    expect(legacy).toContain('<fieldset class="plan-yes-no');
    expect(legacy).toContain('type="radio"');
    expect(legacy).toContain('value="Yes"');
    expect(legacy).toContain('value="No"');
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
