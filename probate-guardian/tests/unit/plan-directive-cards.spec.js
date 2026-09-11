import { describe, expect, test, vi } from 'vitest';

// Milestone 37-4 (see MILESTONE-37-PROPOSAL.md): Initial and Annual Plan's
// advance-directive detail-card collections (q11Directives/q10Directives)
// must start empty -- a card is created only once the execution checkbox is
// checked, not pre-seeded regardless of whether the ward executed anything
// -- and PDF/Word output must omit detail cards whenever execution is
// unchecked, even if the collection still carries legacy/imported data.

global.window = {
  PLAN_RIGHTS: [['marry', 'Right to marry']],
  PLAN_ADLS: [['eating', 'Eating']],
  PLAN_BENEFITS: [['socialSecurity', 'Social Security']],
  INITIAL_ADLS: [['bathing', 'Bathing']],
  emptyPlanResidence: () => ({ name: '', street: '', cityStateZip: '', phone: '', facilityType: '', from: '', to: '' }),
  emptyPlanProvider: () => ({ name: '', street: '', cityStateZip: '', phone: '', providerType: '', visits: '' }),
  emptyInitialProvider: () => ({ name: '', providerType: '', examDate: '', street: '', cityStateZip: '', phone: '' }),
  emptyPlanDirective: () => ({
    title: '', dateSigned: '', signedBy: '', agents: '', alternates: '',
    relationship: '', contact: '', courtRevoked: '', orderDate: '', orderCounty: '',
  }),
  ...(global.window || {}),
};

const { emptyDataPlanAnnual, emptyDataPlanInitial } = await import('../../src/core/state.js');

describe('Plan directive-card collections start empty (Milestone 37-4)', () => {
  test('emptyDataPlanAnnual() does not pre-seed q10Directives', () => {
    expect(emptyDataPlanAnnual().q10Directives).toEqual([]);
  });

  test('emptyDataPlanInitial() does not pre-seed q11Directives', () => {
    expect(emptyDataPlanInitial().q11Directives).toEqual([]);
  });
});

vi.mock('../../src/core/pdf/pdf-engine.js', () => ({ generateCourtFormPdf: vi.fn() }));

const { buildPlanInitialModel } = await import('../../src/features/plan-initial/pdf-model.js');
const { buildPlanAnnualModel } = await import('../../src/features/plan-annual/pdf-model.js');

function findSection(model, id) {
  return model.sections.find((s) => s.id === id);
}

const POPULATED_DIRECTIVE = { title: 'Healthcare Surrogate', dateSigned: '2024-05-01', signedBy: 'Jordan Rivera' };

describe('Plan Initial PDF/Word model gates directive detail on q11Executed', () => {
  test('executed unchecked with populated legacy data omits the detail cards', () => {
    const model = buildPlanInitialModel({ q11Executed: false, q11Directives: [POPULATED_DIRECTIVE] });
    const section = findSection(model, 'directive-detail');
    expect(section.blocks).toEqual([{ type: 'notice', text: 'No advance directives on file.' }]);
  });

  test('executed checked with populated data renders the detail card', () => {
    const model = buildPlanInitialModel({ q11Executed: true, q11Directives: [POPULATED_DIRECTIVE] });
    const section = findSection(model, 'directive-detail');
    expect(section.blocks).toHaveLength(1);
    expect(section.blocks[0].title).toBe('Directive 1');
    expect(section.blocks[0].items[0]).toEqual({ label: 'Title of order or directive', value: 'Healthcare Surrogate' });
  });

  test('executed checked but no populated rows shows the empty notice, not a blank card', () => {
    const model = buildPlanInitialModel({ q11Executed: true, q11Directives: [] });
    const section = findSection(model, 'directive-detail');
    expect(section.blocks).toEqual([{ type: 'notice', text: 'No advance directives on file.' }]);
  });
});

describe('Plan Annual PDF/Word model gates directive detail on q10Executed', () => {
  test('executed unchecked with populated legacy data omits the detail cards', () => {
    const model = buildPlanAnnualModel({ q10Executed: false, q10Directives: [POPULATED_DIRECTIVE] });
    const section = findSection(model, 'q10');
    const detailCards = section.blocks.filter((b) => b.type === 'key-value-grid');
    expect(detailCards).toEqual([]);
  });

  test('executed checked with populated data renders the detail card', () => {
    const model = buildPlanAnnualModel({ q10Executed: true, q10Directives: [POPULATED_DIRECTIVE] });
    const section = findSection(model, 'q10');
    const detailCards = section.blocks.filter((b) => b.type === 'key-value-grid');
    expect(detailCards).toHaveLength(1);
    expect(detailCards[0].title).toBe('Directive 1');
  });
});
