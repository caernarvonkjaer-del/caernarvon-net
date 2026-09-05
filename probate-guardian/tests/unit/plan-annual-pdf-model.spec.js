import { describe, expect, test } from 'vitest';
import { buildPlanAnnualModel } from '../../src/features/plan-annual/pdf-model.js';

function attorneyEmailFields(data = {}) {
  const model = buildPlanAnnualModel({
    wardName: 'Test Ward',
    caseNumber: '26-000001-GD',
    county: 'Pinellas',
    attorney: 'Alex Attorney',
    attorney_email: 'primary@example.test',
    ...data,
  });
  const attorneySection = model.sections.find(section => section.id === 'attorney-certification');
  const signatureBlock = attorneySection.blocks.find(block => block.type === 'signature-block');
  return signatureBlock.fields.flat();
}

describe('plan annual PDF model', () => {
  test('renders secondary attorney email from the canonical snake_case field', () => {
    expect(attorneyEmailFields({ attorney_secondary_email: 'secondary@example.test' })).toContainEqual({
      label: 'Secondary Email',
      value: 'secondary@example.test',
    });
  });

  test('keeps rendering secondary attorney email from legacy camelCase saved data', () => {
    expect(attorneyEmailFields({ attorney_secondaryEmail: 'legacy@example.test' })).toContainEqual({
      label: 'Secondary Email',
      value: 'legacy@example.test',
    });
  });
});
