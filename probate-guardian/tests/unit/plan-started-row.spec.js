import { describe, expect, test } from 'vitest';
import { rowStarted, startedRows } from '../../src/core/validation/row-started.js';

// Milestone 61B/61C. A plan row containing only "secondary" fields -- a phone
// number, a date, an address with no name yet -- used to vanish. The PDF
// models, the export validators and the sidebar each kept their own list of
// fields that made a row count, every list was shorter than the UI, and a row
// outside all three was dropped from the filed document without a validation
// error or any sidebar signal.
//
// These specs pin the shared predicate and then the PDF models' use of it.
// The validator and sidebar halves are covered by plan-*-parity.spec.js and
// tests/e2e/plan-started-row.spec.ts respectively.

global.window = { ...(global.window || {}) };

const { buildPlanAnnualModel } = await import('../../src/features/plan-annual/pdf-model.js');
const { buildPlanInitialModel } = await import('../../src/features/plan-initial/pdf-model.js');
const { buildPlanMinorModel } = await import('../../src/features/plan-minor/pdf-model.js');

/** Every table row and key-value item the model emits, flattened to strings. */
function renderedText(model) {
  const out = [];
  for (const section of model.sections || []) {
    for (const block of section.blocks || []) {
      if (block.type === 'table') {
        for (const row of block.rows || []) {
          for (const cell of row) {
            if (cell && typeof cell === 'object') {
              out.push(cell.main || '');
              for (const sub of cell.sub || []) out.push(sub.text || '');
            } else out.push(String(cell ?? ''));
          }
        }
      } else if (block.type === 'key-value-grid') {
        for (const item of block.items || []) out.push(String(item.value ?? ''));
      } else if (block.type === 'signature-block') {
        out.push(block.signerName || '');
        for (const line of block.fields || []) for (const f of line) out.push(String(f.value ?? ''));
      } else if (block.type === 'notice') {
        out.push(block.text || '');
      }
    }
  }
  return out.filter(Boolean);
}

const countTableRows = (model, titleFragment) => {
  for (const section of model.sections || []) {
    for (const block of section.blocks || []) {
      if (block.type === 'table' && String(block.title || '').includes(titleFragment)) {
        return (block.rows || []).length;
      }
    }
  }
  return 0;
};

describe('Milestone 61B: the shared started-row predicate', () => {
  test('a row with only a secondary field is started', () => {
    expect(rowStarted({ name: '', street: '', cityStateZip: '', phone: '(727) 555-0100' })).toBe(true);
  });

  test('a freshly seeded blank row is not started', () => {
    expect(rowStarted({ name: '', street: '', cityStateZip: '', phone: '', facilityType: '', from: '', to: '' })).toBe(false);
  });

  test('bookkeeping and untouched defaults do not make a row started', () => {
    expect(rowStarted({ id: 'row-3', name: '' })).toBe(false);
    expect(rowStarted({ name: '', q8DNR: false })).toBe(false);
    expect(rowStarted({ name: '', signatureState: 'none' })).toBe(false);
    expect(rowStarted({ name: '', signatureState: 'typed' })).toBe(true);
  });

  test('startedRows keeps order and drops blanks', () => {
    const rows = [{ name: 'A' }, { name: '' }, { phone: '555' }];
    expect(startedRows(rows)).toEqual([{ name: 'A' }, { phone: '555' }]);
    expect(startedRows(null)).toEqual([]);
  });
});

describe('Milestone 61B: secondary-only rows reach the filed PDF', () => {
  test('Annual Q1 residence with only a phone number', () => {
    const model = buildPlanAnnualModel({ q1Residences: [{ name: '', street: '', cityStateZip: '', phone: '(727) 555-0100' }] });
    expect(renderedText(model)).toContain('(727) 555-0100');
    expect(countTableRows(model, 'Places the Ward Has Resided')).toBe(1);
  });

  test('Annual Q4 provider with only an address', () => {
    const model = buildPlanAnnualModel({ q4Providers: [{ name: '', providerType: '', visits: '', street: '9 Clinic Way', cityStateZip: '' }] });
    expect(renderedText(model)).toContain('9 Clinic Way');
  });

  test('Annual Q10 directive with only an agent named', () => {
    const model = buildPlanAnnualModel({
      q10Executed: true,
      q10Directives: [{ title: '', dateSigned: '', signedBy: '', agents: 'Dana Reyes' }],
    });
    expect(renderedText(model)).toContain('Dana Reyes');
  });

  test('Initial Q9 provider with only a phone number', () => {
    const model = buildPlanInitialModel({ q9Providers: [{ name: '', providerType: '', examDate: '', phone: '(727) 555-0142' }] });
    expect(renderedText(model)).toContain('(727) 555-0142');
  });

  test('Initial Q11 directive with only a relationship', () => {
    const model = buildPlanInitialModel({
      q11Executed: true,
      q11Directives: [{ title: '', dateSigned: '', signedBy: '', relationship: 'Daughter' }],
    });
    expect(renderedText(model)).toContain('Daughter');
  });

  test('Minor Q2 residence with only a ZIP', () => {
    const model = buildPlanMinorModel({ q2Residences: [{ name: '', street: '', city: '', state: '', zip: '33756', phone: '' }] });
    expect(renderedText(model)).toContain('33756');
  });

  test('Minor Q3 provider with only a visit count', () => {
    const model = buildPlanMinorModel({ q3Providers: [{ first: '', last: '', providerType: '', visits: '4' }] });
    expect(renderedText(model)).toContain('4');
  });
});

describe('Milestone 61C: partly-filled optional guardians reach the filed PDF', () => {
  test('Annual co-guardian with only an SSN and phone', () => {
    const model = buildPlanAnnualModel({
      planGuardians: [{ name: 'First Guardian' }, { name: '', signatureDate: '', phone: '(727) 555-0163', mailingStreet: '4 Elm St' }],
    });
    expect(renderedText(model)).toContain('4 Elm St');
  });

  test('Initial third guardian with only an address', () => {
    const model = buildPlanInitialModel({
      planGuardians: [{ name: 'First' }, { name: 'Second' }, { name: '', signatureDate: '', street: '77 Oak Ave' }],
    });
    expect(renderedText(model)).toContain('77 Oak Ave');
  });

  test('Minor co-guardian with only a relationship', () => {
    const model = buildPlanMinorModel({
      planGuardians: [{ name: 'First' }, { name: '', signatureDate: '', relationship: 'Grandmother' }],
    });
    expect(renderedText(model)).toContain('Grandmother');
  });

  test('an untouched seeded co-guardian still does not print', () => {
    const blank = { name: '', tin: '', phone: '', mailingStreet: '', mailingCityStateZip: '', relationship: '', email: '', signatureDate: '', signatureState: 'none', signatureImage: '' };
    const model = buildPlanMinorModel({ planGuardians: [{ name: 'Only Guardian' }, blank] });
    const roles = [];
    for (const section of model.sections || []) {
      for (const block of section.blocks || []) if (block.type === 'signature-block') roles.push(block.role);
    }
    expect(roles).not.toContain('Co-Guardian');
  });
});
