import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { filingsFor } from './support/filing-variants.js';

// Milestone 73F part 2: one answer to "is this section complete?".
//
// A section showed ✓ and Print Preview then blocked it (a blank "Amended
// Form?", Part X's attorney signature, the Plans' guardian phone and SSN), or
// stayed − while export passed (an undated hand signature, Part VIII answered
// without the extra tick). The sidebar's marks now come from the export checks
// themselves (src/core/status/section-marks.js over evaluateFiling()). This
// proves, over every variant of all nine identities
// (tests/unit/support/filing-variants.js, the completion golden's):
//
//   1. a ✓ never hides a blocker: no page marked ✓ has anything that stops its
//      Preview, or a sidebar-only question, belonging to it;
//   2. 100% means nothing is outstanding -- no Preview blocker, no question;
//   3. every sidebar-only question is one of the enumerated few the Clerk
//      accepts unanswered, worded as the page asks it (sidebarOnlyWants(), or
//      the checks' own for the Annual schedules and the Initial Plan's Q7).
//
// The invariant is one-way by design (AGENTS.md section 4): a page may stay −
// for such a question while export passes.

let m;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T12:00:00'));
  const [registry, guardianModel, fixtures, marks, engines, policy] = await Promise.all([
    import('../../src/core/filing/filing-registry.js'),
    import('../../src/core/filing/models/guardian.js'),
    import('../e2e/support/fixtures.ts'),
    import('../../src/core/status/section-marks.js'),
    import('../../src/core/validation/engines/index.js'),
    import('../../src/core/status/section-guidance-policy.js'),
  ]);
  m = { registry, guardianModel, fixtures, marks, engines, policy };
}, 120_000);
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const json = (x) => JSON.parse(JSON.stringify(x));
const blocksPreview = (issue) => (issue.capabilities || []).includes('preview');

// The enumerated sidebar-only questions (MILESTONE-73-PROPOSAL.md, 73F "The
// model"): each code's shape, and where its words come from.
const PROMPTS = [
  { name: "an Annual-family schedule's \"no items\" box", code: /^prompt\.annual\.no-items\.(sch[a-f]\d?|sch[a-f])$/, own: true },
  { name: 'the bond question (the Inventory D-4, the Annual family Part IX)', code: /^prompt\.(guardian\.d4|annual\.p9)\.bondDepositoryState$/ },
  { name: "a Plan's certificate of service", code: /^prompt\.plan(Initial|Annual|Minor|Simplified)\.p(4|8|11|12)\.certRecipients\.\d+\.name$/ },
  { name: "the Annual Plan's 3G (benefits)", code: /^prompt\.planAnnual\.p4\.q3BenefitsNone$/ },
  { name: "the Initial Plan's Q7 (benefits)", code: /^prompt\.planInitial\.q7$/, own: true },
];

describe('73F part 2: the sidebar reads the export checks', () => {
  test('every variant of all nine identities: a ✓ never hides a blocker, 100% means nothing outstanding, and every question is an enumerated one', () => {
    const problems = [];
    const seenPrompts = new Set();
    let checked = 0;
    for (const type of Object.keys(m.registry.FILING_REGISTRY)) {
      for (const [label, variant] of filingsFor(type, m)) {
        const filing = { ...json(variant), inventoryType: type };
        const judged = m.marks.judgeFiling(filing, type);
        const pages = m.marks.markedPages(type);
        const keyOf = (route) => m.policy.sectionCheckKey(type, route);
        // 1. Each ✓ page owns no Preview blocker and no question -- judged
        // independently of section-marks.js's own bucketing: by the issue's
        // route, its section's page and the pages that also show its field.
        for (const issue of judged.evaluation.blockers.filter(blocksPreview)) {
          const route = m.marks.issueRoute(issue, type);
          const owners = pages.filter((page) => page.id === route || m.policy.pageAlsoOwns(type, page.id).includes(issue.path));
          if (!owners.length) problems.push(`${type} -- ${label}: a blocker no page owns: ${issue.message}`);
          for (const page of owners) {
            if (judged.checks[keyOf(page.id)]) problems.push(`${type} -- ${label}: ${page.id} shows ✓ over "${issue.message}"`);
          }
        }
        for (const prompt of judged.evaluation.prompts) {
          seenPrompts.add(prompt.code);
          if (judged.checks[keyOf(prompt.route)] !== false) problems.push(`${type} -- ${label}: ${prompt.route} shows ✓ over the question "${prompt.label}"`);
          // 3. One of the enumerated few, worded as the page asks it.
          const kind = PROMPTS.find((p) => p.code.test(prompt.code));
          if (!kind) problems.push(`${type} -- ${label}: an unlisted sidebar-only question ${prompt.code}`);
          else if (!kind.own) {
            const asked = m.policy.sidebarOnlyWants(type, prompt.route, filing).map((w) => w.label);
            if (!asked.includes(prompt.label)) problems.push(`${type} -- ${label}: "${prompt.label}" is not the page's wording (${asked.join(' | ')})`);
          }
        }
        // 2. 100% only when nothing is outstanding.
        const all = Object.values(judged.checks).every(Boolean);
        const outstanding = judged.evaluation.blockers.filter(blocksPreview).length + judged.evaluation.prompts.length;
        if (all && outstanding) problems.push(`${type} -- ${label}: 100% with ${outstanding} outstanding`);
        if (!all && !outstanding) problems.push(`${type} -- ${label}: a page shows − with nothing outstanding`);
        checked++;
      }
    }
    expect(problems.slice(0, 20)).toEqual([]);
    expect(checked).toBeGreaterThan(4000);
    // Every enumerated kind actually turned up somewhere in the variants.
    for (const kind of PROMPTS) expect([...seenPrompts].some((code) => kind.code.test(code)), kind.name).toBe(true);
  }, 300_000);

  test("Excel-only problems hold no page back: the filing can still be filed as a PDF", () => {
    // More B-4 rows than the Annual workbook holds is a capacity problem for Save as Excel only.
    const d = { ...json(m.registry.initializeEmptyData('annual')), inventoryType: 'annual' };
    d.schB4 = Array.from({ length: 2000 }, (_, i) => ({ checkNo: String(i), datePaid: '2026-01-02', category: 'Other', payee: 'P', amount: '1' }));
    const judged = m.marks.judgeFiling(d, 'annual');
    const excelOnly = judged.evaluation.blockers.filter((issue) => !blocksPreview(issue));
    expect(excelOnly.length, 'the capacity problem is reported').toBeGreaterThan(0);
    expect(judged.pageIssues('/schb4').blockers.filter((issue) => excelOnly.includes(issue))).toEqual([]);
  });

  test('a filing saved before the guardian signature rule is judged as opening it will leave it', () => {
    const d = { ...json(m.registry.initializeEmptyData('annual')), inventoryType: 'annual' };
    delete d.signaturePolicy;
    d.guardians[0] = { ...d.guardians[0], name: 'Ann', signatureState: '', signatureDate: '2026-01-05' };
    const owed = m.marks.judgeFiling(d, 'annual').pageIssues('/p3').blockers.map((issue) => issue.message);
    expect(owed.some((msg) => /choose Unsigned/.test(msg)), owed.join(' | ')).toBe(true);
    expect(d.signaturePolicy, 'the filing itself is untouched').toBeUndefined();
    // A closed filing keeps the rule it was filed under.
    const closed = { ...d, archived: true };
    expect(m.marks.judgeFiling(closed, 'annual').pageIssues('/p3').blockers.some((issue) => /choose Unsigned/.test(issue.message))).toBe(false);
  });
});
