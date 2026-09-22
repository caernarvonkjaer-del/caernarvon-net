import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../src/legacy-app.js', import.meta.url), 'utf8');

describe('guided tour content', () => {
  test('covers the current dashboard capabilities without promising unsupported behavior', () => {
    const dashboard = source.match(/const WALKTHROUGH_DASHBOARD=\[(.*?)];/s)?.[1] || '';
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
      for (const selector of ['#help-toggle-btn', '.ward-picker-select', '#theme-toggle-btn', '.ward-progress', '[data-page="/"]', '[data-page="/print"]']) {
        expect(body, `${name} contains ${selector}`).toContain(selector);
      }
    }
    expect(source).toContain('[data-nav="d5"]');
    expect(source).toContain('Certificate of Service');
  });

  test('tour copy does not manufacture legal conclusions or browser guarantees', () => {
    const tours = source.match(/const WALKTHROUGH_[A-Z_]+=\[(.*?)]\;/gs)?.join('\n') || '';
    expect(tours).not.toMatch(/it'?s a legal requirement|the court checks this|best for courts/i);
    expect(tours).not.toMatch(/works offline|works on mobile|all browsers|always saves automatically/i);
  });
});
