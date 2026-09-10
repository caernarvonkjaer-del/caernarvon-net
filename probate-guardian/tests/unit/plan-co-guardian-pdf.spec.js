import { describe, expect, test } from 'vitest';
import { buildPlanAnnualModel } from '../../src/features/plan-annual/pdf-model.js';
import { buildPlanInitialModel } from '../../src/features/plan-initial/pdf-model.js';
import { buildPlanMinorModel } from '../../src/features/plan-minor/pdf-model.js';
import { buildPlanSimplifiedModel } from '../../src/features/plan-simplified/pdf-model.js';

function signatures(model) {
  return model.sections.flatMap((section) => section.blocks || [])
    .filter((block) => block.type === 'signature-block' && (block.role === 'Guardian' || block.role.startsWith('Co-Guardian') || block.role.startsWith('Guardian / Guardian Advocate')))
    .map((block) => block.signerName);
}

describe('Plan co-guardian PDF signatures', () => {
  test('Annual Plan omits an empty co-guardian and includes a populated one', () => {
    expect(signatures(buildPlanAnnualModel({ planGuardians: [{ name: 'Primary' }, {}] }))).toEqual(['Primary']);
    expect(signatures(buildPlanAnnualModel({ planGuardians: [{ name: 'Primary' }, { name: 'Co Annual' }] }))).toContain('Co Annual');
  });

  test('Initial Plan omits an empty co-guardian and includes a populated one', () => {
    expect(signatures(buildPlanInitialModel({ planGuardians: [{ name: 'Primary' }, {}] }))).toEqual(['Primary']);
    expect(signatures(buildPlanInitialModel({ planGuardians: [{ name: 'Primary' }, { name: 'Co Initial' }] }))).toContain('Co Initial');
  });

  test('Minor Plan omits an empty co-guardian and includes a populated one', () => {
    expect(signatures(buildPlanMinorModel({ planGuardians: [{ name: 'Primary' }, {}] }))).toEqual(['Primary']);
    expect(signatures(buildPlanMinorModel({ planGuardians: [{ name: 'Primary' }, { name: 'Co Minor' }] }))).toContain('Co Minor');
  });

  test('Simplified Plan omits an empty co-guardian and includes a populated one', () => {
    expect(signatures(buildPlanSimplifiedModel({ planGuardians: [{ name: 'Primary' }, {}] }))).toEqual(['Primary']);
    expect(signatures(buildPlanSimplifiedModel({ planGuardians: [{ name: 'Primary' }, { name: 'Co Simplified' }] }))).toContain('Co Simplified');
  });
});
