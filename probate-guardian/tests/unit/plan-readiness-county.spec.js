import { describe, expect, test } from 'vitest';
import { getFilingReadiness } from '../../src/core/filing/readiness-config.js';

// Milestone 37-1: the "serve interested persons / file certificate of
// service" manual reminder in every Plan's readiness checklist must show the
// Sixth Judicial Circuit local filing-and-file wording only for a Pinellas or
// Pasco filing, and the statewide statutory wording for every other county.
// Milestone 44C moved those reminders out of the four print.js modules into
// src/core/filing/readiness-config.js, which has no PDF-pipeline imports --
// so nothing needs stubbing any more; getFilingReadiness() runs for real.

function manualTextFor(inventoryType, county) {
  return getFilingReadiness(inventoryType, { county, planGuardians: [{}] }).manual.map((row) => row.label).join('\n');
}

describe('Simplified Plan readiness -- county-gated certificate-of-service wording', () => {
  test('Pinellas renders the local Sixth Circuit required-manual filing item', () => {
    const manual = manualTextFor('planSimplified', 'Pinellas');
    expect(manual).toContain('Local Sixth Judicial Circuit requirement: serve a copy on all interested persons, and file the certificate of service.');
  });

  test('Pasco renders the same local requirement as Pinellas', () => {
    const manual = manualTextFor('planSimplified', 'Pasco');
    expect(manual).toContain('Local Sixth Judicial Circuit requirement: serve a copy on all interested persons, and file the certificate of service.');
  });

  test('a non-Sixth-Circuit county renders the statutory instruction, with no certificate-of-service filing and no Pinellas/Pasco/Sixth Circuit text', () => {
    const manual = manualTextFor('planSimplified', 'Orange');
    expect(manual).toContain("Serve a copy of this plan on the ward -- unless the ward is a minor or was declared totally incapacitated -- and on the ward's attorney, if any. Provide additional copies to anyone else the court directs (F.S. 744.367(3)(b)).");
    expect(manual).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit|certificate of service/i);
  });

  test('a blank county is treated as non-local, not defaulted to Sixth Circuit', () => {
    const manual = manualTextFor('planSimplified', '');
    expect(manual).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit|certificate of service/i);
  });
});

describe('Initial, Annual, and Minor Plan readiness -- same county gate, existing exception wording preserved', () => {
  test('Initial Plan', () => {
    expect(manualTextFor('planInitial', 'Pinellas')).toContain(
      'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor under 14 (see the certification checkboxes).'
    );
    const other = manualTextFor('planInitial', 'Duval');
    expect(other).toContain('Serve a copy on all interested persons, unless the ward was declared totally incapacitated or is a minor under 14 (see the certification checkboxes).');
    expect(other).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit|certificate of service/i);
  });

  test('Annual Plan', () => {
    expect(manualTextFor('planAnnual', 'Pasco')).toContain(
      'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service.'
    );
    const other = manualTextFor('planAnnual', 'Leon');
    expect(other).toContain('Serve a copy on all interested persons.');
    expect(other).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit|certificate of service/i);
  });

  test('Minor Plan', () => {
    expect(manualTextFor('planMinor', 'Pinellas')).toContain(
      'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor (see the certification checkboxes).'
    );
    const other = manualTextFor('planMinor', 'Broward');
    expect(other).toContain('Serve a copy on all interested persons, unless the ward was declared totally incapacitated or is a minor (see the certification checkboxes).');
    expect(other).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit|certificate of service/i);
  });
});

// Milestone 38B / 44C: the five accounting/inventory filings never carried
// county-gated wording, and their source-inventory reminders must stay free
// of any local-practice claim regardless of county.
describe('accounting and inventory filings -- no local-practice text for any county', () => {
  for (const type of ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting']) {
    test(type, () => {
      for (const county of ['Pinellas', 'Pasco', 'Orange', '']) {
        expect(manualTextFor(type, county)).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit/i);
      }
    });
  }
});
