import { describe, expect, test } from 'vitest';

// emptyDataPlanMinor() seeds its Q2/Q3 collections from window row factories
// (state.js:399-401), so it needs these before the module's functions run.
// Only the sibling-comparison test touches plan-minor; the stub stays minimal
// rather than pulling in the full plan test window.
global.window = {
  ...(global.window || {}),
  emptyMinorResidence: () => ({ name: '', street: '', city: '', state: '', zip: '', phone: '' }),
  emptyMinorProvider: () => ({ first: '', mi: '', last: '', providerType: '', visits: '' }),
  emptyMinorGuardianSig: () => ({ name: '', signatureDate: '', tin: '', phone: '' }),
};

const { emptyDataPlanSimplified, emptyDataPlanMinor } = await import('../../src/core/state.js');

// Milestone 61, delivery 61A. The Simplified Plan's UI captures preparer and
// attorney certification details (plan-simplified/index.js:298-326), but the
// blank-ward factory never initialized those keys. A filer who typed a
// preparer's name into a brand-new filing had it dropped on reload: the key
// did not exist on the object the case file was built from.
//
// 61E removed these two blocks from the *filed PDF* (Simplified's court
// original has no preparer or attorney certification page at all), so these
// fields are now deliberately captured-but-not-filed. That makes the factory
// the only thing standing between an entered value and silent loss, which is
// why this spec asserts the schema rather than any PDF output.
describe('Milestone 61A: Plan Simplified certification schema coverage', () => {
  const PREPARER_FIELDS = [
    'preparer_name',
    'preparer_phone',
    'preparer_email',
    'preparer_mailingStreet',
    'preparer_cityStateZip',
    'preparer_signatureDate',
  ];

  const ATTORNEY_FIELDS = [
    'attorney_name',
    'attorney_bar',
    'attorney_phone',
    'attorney_signatureDate',
    'attorney_email',
    'attorney_secondary_email',
    'attorney_street',
    'attorney_cityStateZip',
  ];

  test('the blank factory initializes every preparer field the UI writes to', () => {
    const d = emptyDataPlanSimplified();
    for (const field of PREPARER_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(d, field), `missing ${field}`).toBe(true);
      expect(d[field]).toBe('');
    }
  });

  test('the blank factory initializes every attorney field the UI writes to', () => {
    const d = emptyDataPlanSimplified();
    for (const field of ATTORNEY_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(d, field), `missing ${field}`).toBe(true);
      expect(d[field]).toBe('');
    }
  });

  // Guards the over-broad fix 61A's correction warned about: plan-minor is the
  // nearest sibling factory and the obvious thing to copy, but it carries a
  // TIN and per-role signature-stamp state that this form's own UI and PDF
  // path never reference. Adding them here would be an unrequested schema
  // change that verify:data-model would then demand CSV rows for.
  test('does not copy plan-minor fields this form never uses', () => {
    const d = emptyDataPlanSimplified();
    const minor = emptyDataPlanMinor();

    for (const field of ['preparer_tin', 'preparer_signatureState', 'preparer_signatureImage',
      'attorney_signatureState', 'attorney_signatureImage']) {
      expect(Object.prototype.hasOwnProperty.call(minor, field), `plan-minor should still have ${field}`).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(d, field), `plan-simplified should not have ${field}`).toBe(false);
    }
  });
});
