import { describe, expect, test } from 'vitest';
import { migratePlanTriState, PLAN_TRISTATE_SCHEMA_VERSION } from '../../src/core/filing/plan-tristate.js';
import { buildPlanSimplifiedModel } from '../../src/features/plan-simplified/pdf-model.js';
import { buildPlanMinorModel } from '../../src/features/plan-minor/pdf-model.js';
import { buildPlanInitialModel } from '../../src/features/plan-initial/pdf-model.js';
import { buildPlanAnnualModel } from '../../src/features/plan-annual/pdf-model.js';

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

  test('migrates legacy directive boolean values without changing omitted values', () => {
    const initial = migratePlanTriState({
      inventoryType: 'planInitial', planTriStateSchemaVersion: 1,
      q11Directives: [{ courtRevoked: true }, {}],
    });
    const annual = migratePlanTriState({
      inventoryType: 'planAnnual', planTriStateSchemaVersion: 1,
      q10Directives: [{ courtRevoked: false }, {}],
    });
    expect(initial.q11Directives).toEqual([{ courtRevoked: 'Yes' }, {}]);
    expect(annual.q10Directives).toEqual([{ courtRevoked: 'No' }, {}]);
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

  test('prints Initial Plan Q7 as Yes, No, or unanswered rather than a Yes-only checklist', () => {
    const model = buildPlanInitialModel({
      q7SocialSecurity: 'Yes',
      q7Ssdi: false,
      q7Trusts: 'No',
      q7PendingBenefits: '',
    });
    const q7 = model.sections.flatMap(section => section.blocks || [])
      .find(block => block.type === 'table' && block.title === '7. Insurance / Governmental Benefits');

    expect(q7.rows).toContainEqual(['Social Security', 'Yes']);
    expect(q7.rows).toContainEqual(['Social Security Disability Income (SSDI)', 'No']);
    expect(q7.rows).toContainEqual(['Trusts', 'No']);
    expect(q7.rows).toContainEqual(['Pending Benefits', '—']);
  });

  test('prints Annual Plan eligibility and application answers from the tri-state model', () => {
    const previousWindow = globalThis.window;
    globalThis.window = {
      PLAN_BENEFITS: [['socialSecurity', 'Social Security'], ['other', 'Other']],
    };
    try {
      const model = buildPlanAnnualModel({
        benefits: {
          socialSecurity: { eligible: 'Yes', appliedFor: 'No' },
          other: { eligible: '', appliedFor: 'Yes' },
        },
      });
      const benefits = model.sections.find(section => section.id === 'q3g')
        .blocks.find(block => block.type === 'table');

      expect(benefits.rows).toEqual([
        ['Social Security', 'Yes', 'No'],
        ['Other', '—', 'Yes'],
      ]);
    } finally {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }
  });
});

// Milestone 58B-3. The Minor Plan cover printed each of these three questions
// TWICE: once as a labelled Yes/No/unanswered value, and again as a checkbox
// list whose only test was `=== 'Yes'`. On paper an unanswered question and an
// explicit No were the same unchecked box, so the filed document contradicted
// itself -- "Amended Form? Not answered" beside an unchecked "Amended Form" --
// and the checkbox half silently asserted No on the filer's behalf.
describe('58B-3: Minor Plan cover states each Yes/No fact once', () => {
  const COVER_FACTS = ['Amended Form', 'Professional Guardian', 'Public Guardian'];

  function coverChecklistLabels(model) {
    return model.sections.flatMap((section) => section.blocks || [])
      .filter((block) => block.type === 'checklist')
      .flatMap((block) => block.items || [])
      .map((item) => item.label);
  }

  test('no Yes-only checkbox repeats a fact the grid already states', () => {
    const model = buildPlanMinorModel({
      inventoryType: 'planMinor', wardName: 'Minor Ward',
      amendedForm: '', professionalGuardian: 'No', publicGuardian: 'Yes',
    });
    const repeated = coverChecklistLabels(model).filter((label) => COVER_FACTS.includes(label));
    expect(repeated, 'these three are stated in the key-value grid, and must not be repeated as checkboxes').toEqual([]);
  });

  test('each fact still appears exactly once, keeping Yes / No / unanswered distinct', () => {
    const model = buildPlanMinorModel({
      inventoryType: 'planMinor', wardName: 'Minor Ward',
      amendedForm: '', professionalGuardian: 'No', publicGuardian: 'Yes',
    });
    const items = gridValues(model);
    const byLabel = (needle) => items.filter((i) => String(i.label).startsWith(needle));
    for (const fact of COVER_FACTS) {
      expect(byLabel(fact), `${fact} must be stated once`).toHaveLength(1);
    }
    expect(byLabel('Amended Form')[0].value, 'unanswered must not read as No').not.toBe('No');
    expect(byLabel('Professional Guardian')[0].value).toBe('No');
    expect(byLabel('Public Guardian')[0].value).toBe('Yes');
  });

  test('the amended-version notice survives', () => {
    const model = buildPlanMinorModel({
      inventoryType: 'planMinor', wardName: 'Minor Ward',
      amendedForm: 'Yes', amendedVersion: 'Second Amended',
    });
    const notices = model.sections.flatMap((s) => s.blocks || []).filter((b) => b.type === 'notice');
    expect(notices.some((n) => String(n.text).includes('Second Amended'))).toBe(true);
  });
});

// Milestone 58B-1. The Minor Plan PDF built its own case number by gluing the
// two cover fields together: `${ucn} ${ref}`. The court form treats UCN and
// Case # as two distinct, independently-editable references, so a filing with
// both filled printed a header naming neither -- "2024-MN-042 REF-77" is not a
// case number the clerk can match. caseNumberOf() is the app's single rule for
// that precedence, and the PDF now uses it instead of a local copy.
describe('58B-1: Minor Plan PDF uses the canonical case number', () => {
  const caseNumberOfModel = (d) => {
    const grid = gridValues(buildPlanMinorModel({ inventoryType: 'planMinor', wardName: 'W', ...d }));
    return grid;
  };

  test('both populated: the canonical value wins, and the two cover fields stay separate', () => {
    const model = buildPlanMinorModel({ inventoryType: 'planMinor', wardName: 'W', ucn: '2024-MN-042', ref: 'REF-77' });
    // The cover still shows each field under its own label -- only the
    // synthetic combined value changes.
    const items = gridValues(model);
    expect(items.find((i) => i.label === 'UCN').value).toBe('2024-MN-042');
    expect(items.find((i) => i.label === 'Case #').value).toBe('REF-77');
    // Nothing anywhere in the document glues them together.
    expect(JSON.stringify(model)).not.toContain('2024-MN-042 REF-77');
  });

  test('ucn blank falls back to ref, with no leading space', () => {
    const model = buildPlanMinorModel({ inventoryType: 'planMinor', wardName: 'W', ucn: '', ref: 'REF-77' });
    expect(JSON.stringify(model)).not.toContain('" REF-77"');
    expect(caseNumberOfModel({ ucn: '', ref: 'REF-77' }).length).toBeGreaterThan(0);
  });
});
