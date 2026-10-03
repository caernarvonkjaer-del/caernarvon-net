// On-screen text that had stopped describing what the app does, found when
// the user guide was checked against the app (2026-10-03), and corrected at
// the requester's decision:
//
// 1. The Initial Inventory's General Instructions listed "Attorney" among the
//    required fields; an attorney has been optional since Milestone 71B.
// 2. The Simplified Accounting's General Instructions said to complete the
//    "attorney certification" -- Part V is needed only when an attorney
//    represents the guardian (Milestone 71B).
// 3. The Add New Form dialog's "Load Ward Info From" hint, and the New Filing
//    from Existing note for most pairs, left out the attorney's details,
//    which carry over since Milestone 72B.
// 4. Four New Filing from Existing notes said "the certificate of service"
//    carries over. Since Milestone 72G only its recipients do (and the ward's
//    status, between accountings of the same period).
// 5. The Activity Log labelled a move of the ward's status between two
//    certificate boxes (72G) "Certificate details moved to the filing
//    attorney" -- the label 72H gave its own, different, entry.
//
// Red-first: against the previous text every test below fails.
import { beforeAll, describe, expect, test } from 'vitest';
import { readRepoSource } from './support/source-slice.js';

let describeConversion;
let ACTIVITY_EVENT_META;
beforeAll(async () => {
  ({ describeConversion } = await import('../../src/core/filing/conversion.js'));
  ({ ACTIVITY_EVENT_META } = await import('../../src/core/activity/activity-log-view.js'));
});

const ACCOUNTINGS = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting'];
const PLANS = ['planInitial', 'planAnnual', 'planSimplified', 'planMinor'];

describe('New Filing from Existing: the note promises only what arrives', () => {
  test('a note that mentions the certificate of service says only its recipients carry', () => {
    for (const src of ACCOUNTINGS) {
      for (const dest of ACCOUNTINGS) {
        if (src === dest) continue;
        const note = describeConversion(src, dest);
        if (!/certificate/i.test(note)) continue;
        expect(note, `${src} -> ${dest}`).toMatch(/certificate[- ]of[- ]service('s)? recipients/i);
      }
    }
  });

  test('a plan made from another filing says the attorney\'s details carry over', () => {
    for (const src of [...PLANS, 'annual']) {
      for (const dest of PLANS) {
        if (src === dest) continue;
        expect(describeConversion(src, dest), `${src} -> ${dest}`).toMatch(/attorney/i);
      }
    }
  });
});

describe('the Add New Form dialog', () => {
  test('"Load Ward Info From" says the attorney\'s details carry over', () => {
    const html = readRepoSource('fragments/common-modals.html');
    const hint = html.match(/Carries over the ward's name, case number, county[^<]*/);
    expect(hint?.[0]).toMatch(/attorney/);
  });
});

describe('General Instructions', () => {
  test('the Inventory does not list the attorney as a required field', () => {
    const line = readRepoSource('src/features/guardian-inventory/index.js').match(/<li>Complete all Required Information fields \(([^)]*)\)/);
    expect(line, 'the required-fields line is still there').toBeTruthy();
    expect(line[1]).not.toMatch(/Attorney/);
  });

  test('the Simplified asks for Part V only when an attorney represents the guardian', () => {
    const line = readRepoSource('src/features/simplified-accounting/index.js').match(/<li>Complete Parts I through VII[^<]*<\/li>/);
    expect(line?.[0]).toMatch(/only if an attorney represents the guardian/);
  });
});

describe('the Activity Log', () => {
  test('a certificate move is labelled without claiming where it went', () => {
    expect(ACTIVITY_EVENT_META.CERTIFICATE_MIGRATION.label).toBe('Certificate of service details moved');
  });
});
