// Milestone 73S: the UCN (request R4), as the requester decided it on
// 2026-10-04 -- starred on all nine covers as a reminder; Preview's "Review
// recommended" box reminds when it is blank or not in the UCN's shape; it
// never blocks and never changes a sidebar mark, in every county (73S-1 (2),
// 73S-2 (3), 73S-4 (1), 73S-N1). The Plan for Minors' Case # is required
// (73S-3) and identifies the filing first (73S-N2, which changed AGENTS.md
// section 6's rule). The cover-level browser case is ucn-cover-field.spec.ts.
//
// Red-first: the module doesn't exist, the UCN box carried no star, and the
// Plan for Minors took "UCN or Case #" and was identified by its UCN.
import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest';
import { UCN_HINT, UCN_LENGTH, ucnAdvisories, ucnProblem } from '../../src/core/filing/ucn-reminder.js';

let m;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [card, planMinor, resolver, viewModel, readiness, registry] = await Promise.all([
    import('../../src/core/form/cards/case-caption-card.js'),
    import('../../src/core/validation/engines/plan-minor.js'),
    import('../../src/core/case-resolver.js'),
    import('../../src/features/dashboard/view-model.js'),
    import('../../src/core/filing/readiness-config.js'),
    import('../../src/core/filing/filing-registry.js'),
  ]);
  m = { card, planMinor, resolver, viewModel, readiness, registry };
}, 120_000);
afterAll(() => vi.unstubAllGlobals());

describe('the shape check', () => {
  test('20 characters once hyphens and spaces are removed; no court code required; never reformatted', () => {
    expect(UCN_LENGTH).toBe(20);
    for (const ucn of ['522026GA001234XXXXXX', '52-2026-GA-001234-XXXX-XX', '50 2026 ga 000123 xxxx xx', ' 522026GA001234XXXXXX ']) {
      expect(ucnProblem(ucn), ucn).toBe('');
    }
    for (const ucn of ['26-000123-GD', '522026GA001234XXXXX', '522026GA001234XXXXXXX', '2024-MN-042']) {
      expect(ucnProblem(ucn), ucn).toBe('shape');
    }
    for (const blank of ['', '   ', null, undefined]) expect(ucnProblem(blank)).toBe('blank');
  });
});

describe('Preview\'s reminder', () => {
  test('a blank UCN, in the decided words; the Excel forms add that the workbook has no UCN box', () => {
    expect(ucnAdvisories({ ucn: '' })).toEqual([{
      code: 'ucn.blank', severity: 'advisory', field: 'ucn',
      message: "Cover — The UCN is blank. Enter it from the Clerk's case record.",
    }]);
    expect(ucnAdvisories({ ucn: '' }, { excel: true })[0].message)
      .toBe("Cover — The UCN is blank. Enter it from the Clerk's case record. The court's Excel workbook has no UCN box; the UCN prints on the PDF.");
  });

  test('a UCN out of shape is quoted as typed; one in shape says nothing', () => {
    expect(ucnAdvisories({ ucn: ' 26-000123-GD ' })).toEqual([{
      code: 'ucn.shape', severity: 'advisory', field: 'ucn',
      message: `Cover — The UCN "26-000123-GD" isn't in the UCN's 20-character shape (hyphens and spaces aside). Check it against the Clerk's case record.`,
    }]);
    expect(ucnAdvisories({ ucn: '52-2026-GA-001234-XXXX-XX' })).toEqual([]);
    expect(ucnAdvisories(null)).toEqual([]);
  });
});

describe('the UCN box', () => {
  test('starred as a reminder: the red star, hidden from a screen reader, which hears the hint; nothing marks it required', () => {
    const html = m.card.renderUcnField('', { id: 'ucn' });
    expect(html).toContain('UCN<span class="req" aria-hidden="true">*</span></label>');
    expect(html).toContain(UCN_HINT);
    expect(html).toContain('aria-describedby="ucn_hint"');
    expect(html).not.toContain('data-field-required');
    expect(html).not.toContain('aria-required');
    expect(html, 'kept as typed (Milestone 63E): text, never the Case Number formatter').toContain('data-field-kind="text"');
    expect(html).toContain('data-field-format-policy="preserve"');
  });

  test('the three Plans\' caption card draws the same box; the Inventory\'s keeps its own binding', () => {
    expect(m.card.renderCaseCaptionFields({ ucn: '' })).toContain('UCN<span class="req" aria-hidden="true">*</span>');
    const bound = m.card.renderUcnField('', { binding: 'bind', inputType: 'text', wrapperClass: '' });
    expect(bound).toContain('data-bind="ucn"');
    expect(bound).not.toContain('data-form-path="ucn"');
  });
});

describe('the Plan for Minors', () => {
  const minor = (extra) => ({ ...JSON.parse(JSON.stringify(m.registry.initializeEmptyData('planMinor'))), inventoryType: 'planMinor', ...extra });
  const messages = (d) => m.planMinor.collectPlanMinorIssues(d).map((i) => (typeof i === 'string' ? i : i.message));

  test('its Case # is required; a UCN no longer stands in for it', () => {
    expect(messages(minor({ ucn: '522026GA001234XXXXXX', ref: '' }))).toContain('Cover — Case # is required');
    expect(messages(minor({ ucn: '', ref: '26-000123-GD' }))).not.toContain('Cover — Case # is required');
    expect(messages(minor({ ucn: '', ref: '' })).filter((t) => /UCN/.test(t)), 'a blank UCN is never a missing item').toEqual([]);
  });

  test('the readiness item asks for the Case # the export check asks for', () => {
    const items = m.readiness.getFilingReadiness('planMinor', minor({ ucn: '522026GA001234XXXXXX', ref: '' }), []);
    const item = JSON.stringify(items);
    expect(item).toContain('Case # is on the plan');
    expect(item).not.toContain('UCN or Case #');
  });

  test('it is identified by its Case # first, then its UCN -- in the case resolver and on the dashboard', () => {
    const both = { inventoryType: 'planMinor', ucn: '522026GA001234XXXXXX', ref: '26-001234-GD' };
    expect(m.resolver.caseNumberOf(both)).toBe('26-001234-GD');
    expect(m.resolver.caseNumberOf({ ...both, ref: '' })).toBe('522026GA001234XXXXXX');
    expect(m.viewModel.projectDashboardWard({ wardId: 'w', ...both }, {}).caseNumber).toBe('26-001234-GD');
    expect(m.viewModel.projectDashboardWard({ wardId: 'w', ...both, ref: '' }, {}).caseNumber).toBe('522026GA001234XXXXXX');
    expect(m.viewModel.projectDashboardWard({ wardId: 'w', inventoryType: 'annual', caseNumber: '26-000001-GD', ucn: 'U' }, {}).caseNumber, 'other forms unchanged').toBe('26-000001-GD');
  });
});
