import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';

// The tours are src/core/help/walkthrough.js's since Milestone 70's 70H.
const source = await readFile(new URL('../../src/core/help/walkthrough.js', import.meta.url), 'utf8');

describe('guided tour content', () => {
  test('covers the current dashboard capabilities without promising unsupported behavior', () => {
    const dashboard = source.match(/(?:export )?const WALKTHROUGH_DASHBOARD=\[(.*?)];/s)?.[1] || '';
    expect(dashboard).toContain('Starting a new case also asks how to protect the case data');
    expect(dashboard).toContain('local .sav file');
    expect(dashboard).toContain('Save Backup (.sav)');
    expect(dashboard).toContain('Open Backup (.sav)');
    expect(dashboard).toContain('Automatic saving depends on the browser');
    for (const label of [
      'Initial Inventory', 'Simplified Annual Accounting', 'Annual Accounting',
      'Final Accounting', 'Trust Accounting', 'Simplified Annual Plan',
      'Annual Guardianship Plan', 'Initial Guardianship Plan', 'Annual Plan — Minors',
    ]) expect(dashboard).toContain(label);
  });

  test('each filing tour includes current shell, progress, review, and real route targets', () => {
    for (const name of [
      'WALKTHROUGH_GUARDIAN', 'WALKTHROUGH_SIMPLIFIED', 'WALKTHROUGH_ANNUAL',
      'WALKTHROUGH_PLAN_SIMPLIFIED', 'WALKTHROUGH_PLAN_ANNUAL',
      'WALKTHROUGH_PLAN_INITIAL', 'WALKTHROUGH_PLAN_MINOR',
    ]) {
      const body = source.match(new RegExp(`const ${name}=\\[(.*?)]\\;`, 's'))?.[1] || '';
      expect(body, `${name} exists`).not.toBe('');
      // Milestone 73Q: '#ward-selector', the sidebar's box itself -- '.ward-picker-select'
      // also matched the Convert dialog's hidden ward box.
      for (const selector of ['#help-toggle-btn', '#ward-selector', '#theme-toggle-btn', '.ward-progress', '[data-page="/"]', '[data-page="/print"]']) {
        expect(body, `${name} contains ${selector}`).toContain(selector);
      }
    }
    expect(source).toContain('[data-nav="d5"]');
    expect(source).toContain('Certificate of Service');
  });

  // Milestone 73Q: the Simplified Accounting's tour said it had no Excel output
  // (it has the Clerk's workbook) and sent its Signatures stop to Part III, the
  // declaration; its guardians sign in Part IV. No tour names a hidden box.
  test('the Simplified Accounting tour: Signatures is Part IV, and Excel is offered', () => {
    const body = source.match(/const WALKTHROUGH_SIMPLIFIED=\[(.*?)]\;/s)?.[1] || '';
    expect(body).toMatch(/\{element:'\[data-page="\/p4"\]',title:'7\. Signatures'/);
    expect(body).not.toMatch(/no(?:t offer)? Excel/i);
    expect(body).toContain('Excel workbook');
    expect(source).not.toContain("element:'.ward-picker-select'");
  });

  test('tour copy does not manufacture legal conclusions or browser guarantees', () => {
    const tours = source.match(/const WALKTHROUGH_[A-Z_]+=\[(.*?)]\;/gs)?.join('\n') || '';
    expect(tours).not.toMatch(/it'?s a legal requirement|the court checks this|best for courts/i);
    expect(tours).not.toMatch(/works offline|works on mobile|all browsers|always saves automatically/i);
  });
});
