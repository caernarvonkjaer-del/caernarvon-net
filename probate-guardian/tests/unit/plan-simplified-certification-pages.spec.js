import { describe, expect, test } from 'vitest';

// Milestone 61E. The Simplified Annual Plan's court original ends after the
// guardian / guardian-advocate signature blocks -- there is no preparer or
// attorney certification anywhere on it (reference/plan-forms/
// plan-simplified-original.txt:97-137, which runs straight from the two
// signature columns into Filing Instructions). The app was adding both.
//
// Decision (2026-09-20): remove them from the filed PDF so the output matches
// the court's form, and keep the UI capture, so the app still records who
// prepared and reviewed the filing. That combination is the point -- this
// spec pins the PDF half, tests/unit/plan-simplified-certification-schema.spec.js
// pins the state half. Neither is complete without the other.

global.window = { ...(global.window || {}) };

const { buildPlanSimplifiedModel } = await import('../../src/features/plan-simplified/pdf-model.js');

const FILLED = {
  planGuardians: [{ name: 'Robin Vance', signatureDate: '2026-01-05', email: 'r@example.com', phone: '(727) 555-0111', mailingAddress: '1 Main St' }],
  preparer_name: 'Casey Vale',
  preparer_phone: '(727) 555-0122',
  preparer_email: 'casey@example.com',
  preparer_mailingStreet: '2 Oak St',
  preparer_cityStateZip: 'Clearwater, FL 33756',
  preparer_signatureDate: '2026-01-06',
  attorney_name: 'Jordan Pike',
  attorney_bar: '123456',
  attorney_phone: '(727) 555-0133',
  attorney_email: 'jordan@example.com',
  attorney_street: '3 Pine St',
  attorney_cityStateZip: 'Clearwater, FL 33756',
  attorney_signatureDate: '2026-01-07',
};

function flatten(model) {
  const roles = [];
  const text = [];
  for (const section of model.sections || []) {
    for (const block of section.blocks || []) {
      if (block.type === 'signature-block') {
        roles.push(block.role || '');
        text.push(block.signerName || '');
        for (const line of block.fields || []) for (const f of line) text.push(String(f.value ?? ''));
      } else if (block.type === 'notice') {
        text.push(`${block.title || ''} ${block.text || ''}`);
      }
    }
  }
  return { roles, text: text.join('\n') };
}

describe('Milestone 61E: Simplified\'s filed PDF matches its own court form', () => {
  test('no preparer certification reaches the output, even fully filled in', () => {
    const { roles, text } = flatten(buildPlanSimplifiedModel(FILLED));
    expect(roles).not.toContain('Preparer Signature');
    expect(text).not.toMatch(/CERTIFICATION AND SIGNATURE OF PREPARER/i);
    expect(text).not.toMatch(/Casey Vale/);
  });

  test('no attorney certification reaches the output, even fully filled in', () => {
    const { roles, text } = flatten(buildPlanSimplifiedModel(FILLED));
    expect(roles).not.toContain('Attorney Signature');
    expect(text).not.toMatch(/CERTIFICATION AND SIGNATURE OF GUARDIAN'S ATTORNEY/i);
    expect(text).not.toMatch(/Jordan Pike/);
  });

  test('the guardian signature block and filing notice are untouched', () => {
    const { roles, text } = flatten(buildPlanSimplifiedModel(FILLED));
    expect(roles).toContain('Guardian / Guardian Advocate Signature');
    expect(text).toMatch(/Robin Vance/);
    expect(text).toMatch(/CERTIFICATION AND SIGNATURE OF GUARDIAN\(S\)/i);
    expect(text).toMatch(/File the original with the Clerk of the Circuit Court/);
  });
});
