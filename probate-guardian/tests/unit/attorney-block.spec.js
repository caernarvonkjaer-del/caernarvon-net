// Milestone 58C's predicate (src/core/validation/attorney-block.js): the one
// answer to "has this filer started entering an attorney?" that the Initial
// Plan's export gate and its sidebar both use. The direct check of it moved
// here from tests/e2e/navigation-status.contract.spec.ts by Milestone 70's
// 70T (it called window.isPlanInitialAttorneyStarted in the page); the
// browser spec keeps what a filer sees -- the export issue and the sidebar
// mark, which must agree.
import { describe, expect, test } from 'vitest';
import { isPlanInitialAttorneyStarted, PLAN_INITIAL_ATTORNEY_FIELDS } from '../../src/core/validation/attorney-block.js';

const BLANK = Object.fromEntries([...PLAN_INITIAL_ATTORNEY_FIELDS, 'attorney_signatureState'].map((k) => [k, '']));

describe('isPlanInitialAttorneyStarted()', () => {
  test('a blank attorney block is not started: the pro se / Guardian Advocate exemption', () => {
    expect(isPlanInitialAttorneyStarted(BLANK)).toBe(false);
    expect(isPlanInitialAttorneyStarted(null)).toBe(false);
  });

  // The five 58C added (phone, address, either email), then the four it kept.
  test.each([
    ['attorney_phone', '727-555-0143'],
    ['attorney_street', '100 2nd Ave S, Suite 400'],
    ['attorney_cityStateZip', 'St. Petersburg, FL 33701'],
    ['attorney_email', 'atty@firm.example'],
    ['attorney_secondaryEmail', 'assistant@firm.example'],
    ['attorney_name', 'Rob Atty'],
    ['attorney_bar', '12345'],
    ['attorney_signatureDate', '2026-01-05'],
  ])('%s alone starts it', (field, value) => {
    expect(isPlanInitialAttorneyStarted({ ...BLANK, [field]: value })).toBe(true);
  });
});

// Milestone 71B generalized the rule to the Inventory and the Annual family and
// Simplified Accounting (isAttorneyStarted(d, engineId), one field list per
// engine); the Initial Plan's own function is now a thin wrapper over it, so
// its callers did not change. The per-engine behaviour is in
// tests/unit/attorney-optional.spec.js.
describe('isAttorneyStarted(): the one rule, per engine', () => {
  test('the Initial Plan wrapper answers exactly what the general rule answers', async () => {
    const { isAttorneyStarted } = await import('../../src/core/validation/attorney-block.js');
    for (const [field, value] of [['attorney_phone', '727-555-0143'], ['attorney_name', 'Rob Atty'], ['attorney_signatureState', 'typed'], ['attorney_signatureState', 'none']]) {
      const d = { ...BLANK, [field]: value };
      expect(isPlanInitialAttorneyStarted(d), field).toBe(isAttorneyStarted(d, 'planInitial'));
    }
    expect(isAttorneyStarted(BLANK, 'planInitial')).toBe(false);
  });
});
