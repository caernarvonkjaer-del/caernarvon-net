import { describe, expect, test, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Milestone 60F -- the `signature-block` renderer had two layouts, and the
// legacy one (`details`) was where a real defect lived: on 2026-09-18 a
// guardian's address printed past the right margin and on top of its own
// label on every annual, final, trust and simplified accounting, because
// `details` drew the value at a hardcoded offset and never wrapped it. The
// grid layout (`fields`) had already been fixed. Rather than maintain two
// renderers with one known-bad, the four Annual blocks and three Simplified
// blocks were migrated and the legacy branch deleted.
//
// What that migration can silently get wrong is ORDER and GROUPING: `details`
// rendered Object.keys() down one column, so "convert it" has no single right
// answer -- each block's rows are a decision. These assert the decision, not
// merely that something rendered.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

global.window = {
  esc: (s) => s || '', ic: () => '', autoSave: () => {}, navigate: () => {}, updateNavDots: () => {},
  renderScheduleDocsSection: () => '', txtP: () => '', chkP: () => '', planQ: () => '', planCheckGroup: () => '',
  yesNoCheckboxS: () => '', radioP: () => '', pageNavS: () => '', formatName: (s) => s, formatPhone: (s) => s,
  formatDisplayDate: (s) => s, toggleSsnReveal: () => '', INITIAL_ADLS: [], INITIAL_ADL_RATINGS: [],
  ANNUAL_ADLS: [], ANNUAL_ADL_RATINGS: [], calcTotals: () => ({}), countyInputS: () => '', inpS: () => '',
  ...(global.window || {}),
};

const PERSON = {
  name: 'Rachel M. Alvarez', signatureDate: '2026-02-28', phone: '727-555-0144', ssn: '123-45-6789',
  email: 'rachel@example.test', mailingStreet: '450 2nd Ave N', mailingCityStateZip: 'St. Petersburg, FL 33701',
  residenceStreet: '450 2nd Ave N', residenceCityStateZip: 'St. Petersburg, FL 33701',
  officeStreet: '450 2nd Ave N', officeCityStateZip: 'St. Petersburg, FL 33701',
  street: '450 2nd Ave N', cityStateZip: 'St. Petersburg, FL 33701',
};
const ATTORNEY = {
  attorney: 'Robert Vance, Esq.', attorney_barNumber: '0184920', attorney_bar: '0184920',
  attorney_phone: '727-555-0199', attorney_email: 'vance@example.test',
  attorney_secondaryEmail: 'paralegal@example.test', attorney_street: '100 2nd Ave S, Suite 400',
  attorney_cityStateZip: 'St. Petersburg, FL 33701', attorney_signatureDate: '2026-03-01',
  certAttySignDate: '2026-03-01', certAttyBarNumber: '0184920', certAttyPhone: '727-555-0199',
  certAttyStreet: '100 2nd Ave S, Suite 400', certAttyCityStateZip: 'St. Petersburg, FL 33701',
};

const BUILDERS = {};
beforeAll(async () => {
  BUILDERS.annual = (await import('../../src/features/annual-accounting/pdf-model.js')).buildAnnualAccountingModel;
  BUILDERS.simplified = (await import('../../src/features/simplified-accounting/pdf-model.js')).buildSimplifiedAccountingModel;
  BUILDERS.guardian = (await import('../../src/features/guardian-inventory/pdf-model.js')).buildVerifiedInventoryModel;
  BUILDERS.planAnnual = (await import('../../src/features/plan-annual/pdf-model.js')).buildPlanAnnualModel;
  BUILDERS.planInitial = (await import('../../src/features/plan-initial/pdf-model.js')).buildPlanInitialModel;
  BUILDERS.planMinor = (await import('../../src/features/plan-minor/pdf-model.js')).buildPlanMinorModel;
  BUILDERS.planSimplified = (await import('../../src/features/plan-simplified/pdf-model.js')).buildPlanSimplifiedModel;
});

const annualModel = () => BUILDERS.annual({
  wardName: 'Harold Bennett', caseNumber: '26-CP-1', county: 'Pinellas', inventoryType: 'annual',
  guardians: [{ ...PERSON }], preparer: { ...PERSON }, ...ATTORNEY,
}, {});
const simplifiedModel = () => BUILDERS.simplified({
  wardName: 'Harold Bennett', caseNumber: '26-CP-1', county: 'Pinellas', inventoryType: 'simplified',
  guardians: [{ ...PERSON }], ...ATTORNEY,
}, {});

const sigBlocks = (model) => (model.sections || []).flatMap((s) => (s.blocks || []).filter((b) => b.type === 'signature-block'));
const blockIn = (model, sectionId) => sigBlocks({ sections: (model.sections || []).filter((s) => s.id === sectionId) })[0];
/** Each row's labels, as rendered order: [['Phone','SSN / EIN'], ['Email'], ...] */
const shape = (block) => block.fields.map((row) => row.map((f) => f.label));

describe('60F: every migrated block\'s rows are the grouping that was chosen', () => {
  test('Annual guardian: identifiers pair, each address on its own row', () => {
    expect(shape(blockIn(annualModel(), 'part3'))).toEqual([
      ['Phone', 'SSN / EIN'], ['Email'], ['Mailing Address'], ['Residence / Office'],
    ]);
  });

  test('Annual preparer', () => {
    expect(shape(blockIn(annualModel(), 'part4'))).toEqual([['Phone', 'SSN / EIN'], ['Address']]);
  });

  test('Annual attorney: bar number with phone, the two emails together, address alone', () => {
    expect(shape(blockIn(annualModel(), 'part5'))).toEqual([
      ['Florida Bar #', 'Phone'], ['Primary Email', 'Secondary Email'], ['Address'],
    ]);
  });

  test('Annual certificate-of-service attorney has no secondary email row', () => {
    expect(shape(blockIn(annualModel(), 'part10'))).toEqual([
      ['Florida Bar #', 'Phone'], ['Primary Email'], ['Address'],
    ]);
  });

  test('Simplified guardian matches Annual\'s, with this form\'s own Residence label', () => {
    expect(shape(blockIn(simplifiedModel(), 'part4'))).toEqual([
      ['Phone', 'SSN/EIN'], ['Email'], ['Mailing Address'], ['Residence Address'],
    ]);
  });

  test('Simplified attorney and certificate-of-service attorney', () => {
    expect(shape(blockIn(simplifiedModel(), 'part5'))).toEqual([
      ['Florida Bar #', 'Phone'], ['Primary Email', 'Secondary Email'], ['Address'],
    ]);
    expect(shape(blockIn(simplifiedModel(), 'part6'))).toEqual([
      ['Florida Bar #', 'Phone'], ['Primary Email'], ['Address'],
    ]);
  });

  // An address must stay a structured array: the engine keeps the line breaks
  // its caller chose, and a joined string would be re-split on commas, which
  // loses the break entirely when a filer omits one.
  test('every address value is an array of discrete stored lines, not a joined string', () => {
    for (const model of [annualModel(), simplifiedModel()]) {
      for (const block of sigBlocks(model)) {
        for (const row of block.fields) {
          for (const field of row) {
            if (!/Address|Residence \/ Office/.test(field.label)) continue;
            expect(Array.isArray(field.value), `${block.role} / ${field.label} is not structured`).toBe(true);
          }
        }
      }
    }
  });
});

describe('60F: the legacy `details` layout is gone', () => {
  test('no signature block in any of the nine filing models sets `details`', () => {
    const seeds = [
      ['annual', annualModel()], ['simplified', simplifiedModel()],
      ['guardian', BUILDERS.guardian({ wardName: 'W', caseNumber: '1', county: 'Pinellas', guardians: [{ name: 'G' }], attorney: {}, serviceAttorney: {}, preparer: {} }, {})],
      ['planAnnual', BUILDERS.planAnnual({ wardName: 'W', caseNumber: '1', county: 'Pinellas' }, {})],
      ['planInitial', BUILDERS.planInitial({ wardName: 'W', caseNumber: '1', county: 'Pinellas' }, {})],
      ['planMinor', BUILDERS.planMinor({ wardName: 'W', caseNumber: '1', county: 'Pinellas' }, {})],
      ['planSimplified', BUILDERS.planSimplified({ wardName: 'W', caseNumber: '1', county: 'Pinellas' }, {})],
    ];
    const offenders = [];
    for (const [id, model] of seeds) {
      for (const block of sigBlocks(model)) {
        if ('details' in block) offenders.push(`${id} / ${block.role}`);
        else if (!Array.isArray(block.fields)) offenders.push(`${id} / ${block.role}: neither fields nor details`);
      }
    }
    expect(offenders, `signature blocks still on the legacy layout: ${offenders.join(', ')}`).toEqual([]);
  });

  // The static half of the same check: the renderer itself no longer carries
  // the branch, so a future caller cannot quietly land back on it.
  test('pdf-engine.js no longer implements planDetailStack or a details branch', () => {
    const src = fs.readFileSync(path.join(root, 'src', 'core', 'pdf', 'pdf-engine.js'), 'utf8');
    expect(src).not.toMatch(/const planDetailStack\s*=/);
    expect(src).not.toMatch(/block\.details/);
  });

  test('no source file anywhere still sets details on a signature block', () => {
    const files = ['annual-accounting', 'simplified-accounting', 'guardian-inventory', 'plan-annual', 'plan-initial', 'plan-minor', 'plan-simplified']
      .map((f) => path.join(root, 'src', 'features', f, 'pdf-model.js'));
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src.includes('details: {'), `${path.basename(path.dirname(file))} still builds a details object`).toBe(false);
    }
  });
});
