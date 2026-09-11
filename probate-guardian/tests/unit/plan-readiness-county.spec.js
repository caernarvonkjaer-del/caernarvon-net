import { describe, expect, test, vi } from 'vitest';

// Milestone 37-1: the "serve interested persons / file certificate of
// service" manual reminder in every Plan's readiness checklist must show the
// Sixth Judicial Circuit local filing-and-file wording only for a Pinellas or
// Pasco filing, and the statewide statutory wording for every other county.
// These four print.js modules statically import the PDF/DOCX generation
// pipeline (canvas-backed at runtime), which has no place in a node-only
// unit test, so every side dependency except county-guidance.js itself is
// stubbed out -- planReadinessChecksXxx() is the only real code under test.

global.window = {
  highlightErrors: () => {},
  validationPanel: () => '',
  planReadinessPanel: () => '',
  renderPage: () => {},
  INITIAL_ADLS: [],
  PLAN_RIGHTS: [],
  PLAN_ADLS: [],
  ...(global.window || {}),
};

vi.mock('../../src/core/pdf/pdf-engine.js', () => ({ generateCourtFormPdf: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-finalizer.js', () => ({ finalizeCourtFormPdf: vi.fn(), saveFinalizedPdf: vi.fn() }));
vi.mock('../../src/core/docx/docx-engine.js', () => ({ generateCourtFormDocx: vi.fn(), saveFinalizedDocx: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-preview.js', () => ({ mountPdfPreview: vi.fn(), printGeneratedPdf: vi.fn() }));
vi.mock('../../src/core/pdf/supplemental-pdf.js', () => ({
  getSupplementalAccessibilityWarning: vi.fn(() => ''),
  getSupplementalFilingIssues: vi.fn(() => []),
}));
vi.mock('../../src/core/filing/output-preflight.js', () => ({ prepareFilingOutput: vi.fn() }));
vi.mock('../../src/core/filing/output-advisories.js', () => ({ renderOutputAdvisories: vi.fn(() => '') }));

vi.mock('../../src/features/plan-simplified/index.js', () => ({ validatePlanSimplified: vi.fn(() => []) }));
vi.mock('../../src/features/plan-simplified/pdf-model.js', () => ({ buildPlanSimplifiedModel: vi.fn() }));
vi.mock('../../src/features/plan-initial/index.js', () => ({ validatePlanInitial: vi.fn(() => []) }));
vi.mock('../../src/features/plan-initial/pdf-model.js', () => ({ buildPlanInitialModel: vi.fn() }));
vi.mock('../../src/features/plan-annual/index.js', () => ({ validatePlanAnnual: vi.fn(() => []) }));
vi.mock('../../src/features/plan-annual/pdf-model.js', () => ({ buildPlanAnnualModel: vi.fn() }));
vi.mock('../../src/features/plan-minor/index.js', () => ({ validatePlanMinor: vi.fn(() => []) }));
vi.mock('../../src/features/plan-minor/pdf-model.js', () => ({ buildPlanMinorModel: vi.fn() }));

const { planReadinessChecksSimplified } = await import('../../src/features/plan-simplified/print.js');
const { planReadinessChecksInitial } = await import('../../src/features/plan-initial/print.js');
const { planReadinessChecksAnnual } = await import('../../src/features/plan-annual/print.js');
const { planReadinessChecksMinor } = await import('../../src/features/plan-minor/print.js');

function manualTextFor(checkFn, county) {
  window.D = { county, planGuardians: [{}] };
  return checkFn().manual.join('\n');
}

describe('Simplified Plan readiness -- county-gated certificate-of-service wording', () => {
  test('Pinellas renders the local Sixth Circuit required-manual filing item', () => {
    const manual = manualTextFor(planReadinessChecksSimplified, 'Pinellas');
    expect(manual).toContain('Local Sixth Judicial Circuit requirement: serve a copy on all interested persons, and file the certificate of service.');
  });

  test('Pasco renders the same local requirement as Pinellas', () => {
    const manual = manualTextFor(planReadinessChecksSimplified, 'Pasco');
    expect(manual).toContain('Local Sixth Judicial Circuit requirement: serve a copy on all interested persons, and file the certificate of service.');
  });

  test('a non-Sixth-Circuit county renders the statutory instruction, with no certificate-of-service filing and no Pinellas/Pasco/Sixth Circuit text', () => {
    const manual = manualTextFor(planReadinessChecksSimplified, 'Orange');
    expect(manual).toContain("Serve a copy of this plan on the ward -- unless the ward is a minor or was declared totally incapacitated -- and on the ward's attorney, if any. Provide additional copies to anyone else the court directs (F.S. 744.367(3)(b)).");
    expect(manual).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit|certificate of service/i);
  });

  test('a blank county is treated as non-local, not defaulted to Sixth Circuit', () => {
    const manual = manualTextFor(planReadinessChecksSimplified, '');
    expect(manual).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit|certificate of service/i);
  });
});

describe('Initial, Annual, and Minor Plan readiness -- same county gate, existing exception wording preserved', () => {
  test('Initial Plan', () => {
    expect(manualTextFor(planReadinessChecksInitial, 'Pinellas')).toContain(
      'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor under 14 (see the certification checkboxes).'
    );
    const other = manualTextFor(planReadinessChecksInitial, 'Duval');
    expect(other).toContain('Serve a copy on all interested persons, unless the ward was declared totally incapacitated or is a minor under 14 (see the certification checkboxes).');
    expect(other).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit|certificate of service/i);
  });

  test('Annual Plan', () => {
    expect(manualTextFor(planReadinessChecksAnnual, 'Pasco')).toContain(
      'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service.'
    );
    const other = manualTextFor(planReadinessChecksAnnual, 'Leon');
    expect(other).toContain('Serve a copy on all interested persons.');
    expect(other).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit|certificate of service/i);
  });

  test('Minor Plan', () => {
    expect(manualTextFor(planReadinessChecksMinor, 'Pinellas')).toContain(
      'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor (see the certification checkboxes).'
    );
    const other = manualTextFor(planReadinessChecksMinor, 'Broward');
    expect(other).toContain('Serve a copy on all interested persons, unless the ward was declared totally incapacitated or is a minor (see the certification checkboxes).');
    expect(other).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit|certificate of service/i);
  });
});
