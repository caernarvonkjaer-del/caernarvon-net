import { describe, expect, test } from 'vitest';
import { migratePlanTriState, PLAN_TRISTATE_SCHEMA_VERSION } from '../../src/core/filing/plan-tristate.js';
import { buildPlanSimplifiedModel } from '../../src/features/plan-simplified/pdf-model.js';
import { buildPlanMinorModel } from '../../src/features/plan-minor/pdf-model.js';
import { buildPlanInitialModel } from '../../src/features/plan-initial/pdf-model.js';

function gridValues(model) {
  return model.sections.flatMap((section) => section.blocks || [])
    .filter((block) => block.type === 'key-value-grid')
    .flatMap((block) => block.items || []);
}

describe('Plan tri-state migration', () => {
  test('converts legacy boolean answers without turning omitted answers into No', () => {
    const ward = migratePlanTriState({
      inventoryType: 'planMinor', amendedForm: false, professionalGuardian: true,
    });
    expect(ward).toMatchObject({
      amendedForm: 'No', professionalGuardian: 'Yes', planTriStateSchemaVersion: PLAN_TRISTATE_SCHEMA_VERSION,
    });
    expect(ward.publicGuardian).toBeUndefined();
  });

  test('does not reinterpret a current-schema unanswered value', () => {
    const ward = migratePlanTriState({
      inventoryType: 'planSimplified', planTriStateSchemaVersion: PLAN_TRISTATE_SCHEMA_VERSION, q7RestoreRights: false,
    });
    expect(ward.q7RestoreRights).toBe(false);
  });
});

describe('Plan tri-state PDF output', () => {
  test('renders explicit legacy No values rather than blanking them', () => {
    const simplified = gridValues(buildPlanSimplifiedModel({ q7RestoreRights: false, q9Remuneration: false }));
    expect(simplified.find((item) => item.label.startsWith('Q7.')).value).toBe('No');
    expect(simplified.find((item) => item.label.startsWith('Q9.')).value).toBe('No');

    const minor = gridValues(buildPlanMinorModel({ amendedForm: false }));
    expect(minor.find((item) => item.label === 'Amended Form?').value).toBe('No');
  });

  test('marks an Initial Plan legacy false committee answer as No', () => {
    const model = buildPlanInitialModel({ committeeIncorporated: false });
    const committee = model.sections.flatMap((section) => section.blocks || [])
      .find((block) => block.type === 'checklist' && block.title?.includes('Committee Recommendations'));
    expect(committee.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'No', checked: true }),
      expect.objectContaining({ label: 'Yes', checked: false }),
    ]));
  });

  test('marks an Initial Plan explicit Yes and No committee answers accurately', () => {
    const modelYes = buildPlanInitialModel({ committeeIncorporated: 'Yes' });
    const committeeYes = modelYes.sections.flatMap((section) => section.blocks || [])
      .find((block) => block.type === 'checklist' && block.title?.includes('Committee Recommendations'));
    expect(committeeYes.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Yes', checked: true }),
      expect.objectContaining({ label: 'No', checked: false }),
    ]));

    const modelNo = buildPlanInitialModel({ committeeIncorporated: 'No', committeeExplain: 'Awaiting updated report' });
    const committeeNo = modelNo.sections.flatMap((section) => section.blocks || [])
      .find((block) => block.type === 'checklist' && block.title?.includes('Committee Recommendations'));
    expect(committeeNo.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'No', checked: true }),
      expect.objectContaining({ label: 'Yes', checked: false }),
    ]));
  });
});
