import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  REQUIRED_ITEMS_ADVICE,
  VERIFY_NONE_ADVICE,
  blocksNext,
  guidanceAdvice,
  isSectionIncomplete,
  sectionCheckKey,
} from '../../src/core/status/section-guidance-policy.js';

// Milestone 63A. On a Guardian Inventory the sidebar marked six pages incomplete
// (Cover, D-1..D-5) and the progress card counted them, but the page never said
// why: the yellow "Complete these items" box was drawn only when the Next button
// was gated, and the gate's list of pages (SCHEDULE_NAV_KEYS, the 11 schedules)
// was narrower than the sidebar's. Three separate questions had been answered by
// one function that existed twice:
//
//   1. Is this section incomplete?     -> the sidebar mark, and the explanation box
//   2. Does incompleteness block Next? -> a per-type policy
//   3. What should the advice say?     -> depends on whether the page has a
//                                         "verify there are none" checkbox
//
// They are pure functions here, so the classic-script live patch
// (legacy-app.js) and the Guardian module's initial render read the same rule.

describe('sectionCheckKey() — the key a route has in computeNavChecks().checks', () => {
  test.each([
    ['guardian', '/', 'cover'],
    ['guardian', '/d4', 'd4'],
    ['guardian', '/a1', 'a1'],
    ['annual', '/', 'a-p1'],
    ['annual', '/p3', 'a-p3'],
    ['finalAccounting', '/', 'a-p1'],
    ['trustAccounting', '/p10', 'a-p10'],
    ['simplified', '/', 's-cover'],
    ['simplified', '/p3', 's-p3'],
    ['planInitial', '/', 'pi-cover'],
    ['planInitial', '/p9', 'pi-p9'],
    ['planAnnual', '/p11', 'pa-p11'],
    ['planMinor', '/p7', 'pm-p7'],
    ['planSimplified', '/', 'ps-cover'],
  ])('%s %s -> %s', (type, route, expected) => {
    expect(sectionCheckKey(type, route)).toBe(expected);
  });

  test("Annual's Cover is 'Part I' (a-p1), never 'a-cover' — the bug the old override existed to avoid", () => {
    expect(sectionCheckKey('annual', '/')).toBe('a-p1');
    expect(sectionCheckKey('annual', '/')).not.toBe('a-cover');
  });

  test('an unknown filing type or an empty route has no key', () => {
    expect(sectionCheckKey('nonsense', '/p3')).toBeNull();
    expect(sectionCheckKey('guardian', '')).toBeNull();
    expect(sectionCheckKey('guardian', undefined)).toBeNull();
  });
});

describe('isSectionIncomplete() — question 1, the same completeness map the sidebar reads', () => {
  test('a key that is present and false is incomplete', () => {
    expect(isSectionIncomplete({ d4: false, d3: true }, 'd4')).toBe(true);
  });

  test('a key that is present and true is complete', () => {
    expect(isSectionIncomplete({ d4: true }, 'd4')).toBe(false);
  });

  test('a page with no completeness mark (Summary, Print) is never incomplete', () => {
    expect(isSectionIncomplete({ d4: false }, 'summary')).toBe(false);
    expect(isSectionIncomplete({ d4: false }, null)).toBe(false);
  });

  test('missing checks are not a reason to complain', () => {
    expect(isSectionIncomplete(undefined, 'd4')).toBe(false);
    expect(isSectionIncomplete(null, 'd4')).toBe(false);
  });

  test('it does not read inherited properties as a mark', () => {
    expect(isSectionIncomplete({}, 'toString')).toBe(false);
  });
});

describe('blocksNext() — question 2, a per-type policy (D1: explain, do not block, on the Guardian pages)', () => {
  const schedules = ['a1', 'a2', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'c5'];
  const block = (type, checkKey, incomplete) => blocksNext({ type, checkKey, incomplete, guardianScheduleKeys: schedules });

  test('a complete section never blocks', () => {
    expect(block('guardian', 'a1', false)).toBe(false);
    expect(block('annual', 'a-p3', false)).toBe(false);
  });

  test('an incomplete Guardian schedule page blocks Next — unchanged', () => {
    expect(block('guardian', 'a1', true)).toBe(true);
    expect(block('guardian', 'c5', true)).toBe(true);
  });

  test('an incomplete Guardian Cover or D-1..D-5 page is explained but does NOT block Next (D1)', () => {
    for (const key of ['cover', 'd1', 'd2', 'd3', 'd4', 'd5']) {
      expect(block('guardian', key, true), key).toBe(false);
    }
  });

  test('every other filing type blocks Next on every page it marks — unchanged', () => {
    for (const type of ['annual', 'finalAccounting', 'trustAccounting', 'simplified', 'planInitial', 'planAnnual', 'planMinor', 'planSimplified']) {
      expect(block(type, `${type}-any`, true), type).toBe(true);
    }
  });

  // Milestone 68C follow-up, 2026-09-24. The page says nothing on it is
  // required to file, and its button to Preview & Export was disabled until
  // someone was listed. Decided by the requester: keep the button working;
  // the sidebar mark and the page's reminder still ask.
  test("a Plan's Certificate of Service page is explained but never blocks Next, on all four Plans", () => {
    for (const [type, key] of [['planAnnual', 'pa-p12'], ['planSimplified', 'ps-p4'], ['planInitial', 'pi-p11'], ['planMinor', 'pm-p8']]) {
      expect(block(type, key, true), `${type} ${key}`).toBe(false);
    }
  });

  test("the Plans' other pages still block, and another form's page of the same name is not exempted", () => {
    expect(block('planAnnual', 'pa-p11', true)).toBe(true);
    expect(block('planSimplified', 'ps-p3', true)).toBe(true);
    expect(block('planInitial', 'pi-p10', true)).toBe(true);
    expect(block('planMinor', 'pm-p7', true)).toBe(true);
    expect(block('planAnnual', 'pm-p8', true), 'a Minor Plan key on an Annual Plan').toBe(true);
    expect(block('simplified', 's-p4', true), 'the Simplified Accounting').toBe(true);
  });
});

describe('guidanceAdvice() — question 3 (D2): advice must fit the page', () => {
  test('a page with a "verify there are none" checkbox keeps the schedule sentence', () => {
    expect(guidanceAdvice({ hasVerifyNoneBox: true })).toBe(VERIFY_NONE_ADVICE);
    expect(VERIFY_NONE_ADVICE).toBe('Add at least one item, or check the box verifying there are none, before continuing.');
  });

  test("any other page — Cover, signature, bond, certificate — does not tell the filer to tick a box that isn't there", () => {
    expect(guidanceAdvice({ hasVerifyNoneBox: false })).toBe(REQUIRED_ITEMS_ADVICE);
    expect(REQUIRED_ITEMS_ADVICE).toBe('Complete the required items on this page before continuing.');
    expect(REQUIRED_ITEMS_ADVICE).not.toMatch(/check the box/i);
  });
});

describe('the bridge', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('publishes the policy on window for the classic legacy-app.js script', async () => {
    vi.stubGlobal('window', {});
    vi.resetModules();
    await import('../../src/core/status/section-guidance-policy.js');
    expect(Object.keys(window.sectionGuidancePolicy).sort())
      .toEqual(['blocksNext', 'guidanceAdvice', 'isSectionIncomplete', 'pageAlsoOwns', 'sectionCheckKey', 'sidebarOnlyWants']);
  });
});

// Milestone 63F. Two things the box could not say, both derived from the sidebar's own rule.
import { pageAlsoOwns, sidebarOnlyWants } from '../../src/core/status/section-guidance-policy.js';

describe('pageAlsoOwns() — a field rendered on two pages can be explained on either', () => {
  test("Simplified Part III also owns the two period dates the validator files under the Cover", () => {
    expect(pageAlsoOwns('simplified', '/p3')).toEqual(['periodFrom', 'periodTo']);
  });

  test('no other page claims foreign errors', () => {
    expect(pageAlsoOwns('simplified', '/p4')).toEqual([]);
    expect(pageAlsoOwns('annual', '/p3')).toEqual([]);
    expect(pageAlsoOwns('nonsense', '/p3')).toEqual([]);
  });
});

describe('sidebarOnlyWants() — what a sidebar-only rule still wants, as items the box can link to', () => {
  const paths = (items) => items.map((i) => i.path);

  test('Plan - Annual 3G: an unanswered page wants one benefit, or None, or Other', () => {
    const items = sidebarOnlyWants('planAnnual', '/p4', { benefits: {} });
    expect(paths(items)).toEqual(['q3BenefitsNone']);
    expect(items[0].label).toMatch(/benefit/i);
  });

  test('Plan - Minors Preparer & Attorney: wants only what is blank', () => {
    expect(paths(sidebarOnlyWants('planMinor', '/p7', {}))).toEqual(['preparer_name', 'attorney_name', 'attorney_signatureDate']);
    expect(paths(sidebarOnlyWants('planMinor', '/p7', { preparer_name: 'P', attorney_signatureDate: '2027-01-01' }))).toEqual(['attorney_name']);
    expect(sidebarOnlyWants('planMinor', '/p7', { preparer_name: 'P', attorney_name: 'A', attorney_signatureDate: '2027-01-01' })).toEqual([]);
  });

  // Milestone 67B. The bond / restricted-depository arrangement is asked, never
  // demanded: no validator message exists for it, so the sidebar's mark on
  // D-4 / Part IX names what it is waiting for here. Blank means unanswered;
  // any of the four states satisfies it, and its revealed fields are never
  // wanted -- they are advisory on the print preview instead.
  test('Inventory D-4 and Annual-family Part IX: the arrangement, until it is stated', () => {
    const wantsState = (items) => { expect(paths(items)).toEqual(['bondDepositoryState']); expect(items[0].label).toMatch(/restricted depository, a bond, both, or a bond waived/i); };
    wantsState(sidebarOnlyWants('guardian', '/d4', {}));
    wantsState(sidebarOnlyWants('guardian', '/d4', { bondDepositoryState: '', bondAmount: '5000' }));
    for (const type of ['annual', 'finalAccounting', 'trustAccounting']) wantsState(sidebarOnlyWants(type, '/p9', {}));
    for (const state of ['depository-only', 'bond-and-depository', 'bond-only', 'bond-waived']) {
      expect(sidebarOnlyWants('guardian', '/d4', { bondDepositoryState: state }), state).toEqual([]);
      expect(sidebarOnlyWants('annual', '/p9', { bondDepositoryState: state, bondAmount: '' }), state).toEqual([]);
    }
    // Only those pages, and only those types.
    expect(sidebarOnlyWants('guardian', '/p9', {})).toEqual([]);
    expect(sidebarOnlyWants('annual', '/d4', {})).toEqual([]);
    expect(sidebarOnlyWants('simplified', '/p9', {})).toEqual([]);
  });

  test('a page with no sidebar-only rule wants nothing', () => {
    expect(sidebarOnlyWants('planMinor', '/p3', {})).toEqual([]);
    expect(sidebarOnlyWants('annual', '/p3', {})).toEqual([]);
    expect(sidebarOnlyWants('guardian', '/d3', {})).toEqual([]);
  });

  test('missing data is not an error', () => {
    expect(() => sidebarOnlyWants('planMinor', '/p7', undefined)).not.toThrow();
    expect(() => sidebarOnlyWants('planAnnual', '/p4', null)).not.toThrow();
  });
});

// Milestone 68C follow-up, 2026-09-24. The Plans' Certificate of Service is
// asked, never demanded; on the Simplified Plan, whose certificate the Clerk
// does not require, an untouched one is not asked about at all.
describe('sidebarOnlyWants() -- the Plans\' Certificate of Service', () => {
  const blankCert = { certRecipients: [{ name: '', line2: '', line3: '', line4: '' }], certNoRecipients: '', certDate: '' };
  const paths = (type, route, data) => sidebarOnlyWants(type, route, data).map((w) => w.path);

  test('the Simplified Plan asks nothing until the filer starts the certificate, then asks like every other Plan', () => {
    expect(sidebarOnlyWants('planSimplified', '/p4', blankCert)).toEqual([]);
    expect(paths('planSimplified', '/p4', { ...blankCert, certDate: '2026-03-01' })).toEqual(['certRecipients.0.name']);
  });

  test('the Annual, Initial and Minor Plans ask from the start -- unchanged', () => {
    for (const [type, route] of [['planAnnual', '/p12'], ['planInitial', '/p11'], ['planMinor', '/p8']]) {
      expect(paths(type, route, blankCert), type).toEqual(['certRecipients.0.name']);
    }
  });
});
