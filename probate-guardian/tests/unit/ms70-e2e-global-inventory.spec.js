import { describe, expect, test } from 'vitest';
import { inventoryFile } from '../../scripts/ms70-e2e-global-inventory.mjs';

// Milestone 70, 70A: the inventory GuardianForms.testing (70T) is designed
// from. It must see window accesses through aliases, tell application names
// from platform ones, and classify every in-place write to live case state.

describe('the browser-suite global inventory', () => {
  test('follows aliases, skips platform members, counts computed access, and classifies state writes', async () => {
    const ts = [
      "import { test } from '@playwright/test';",
      "test('x', async ({ page }) => {",
      '  await page.evaluate(() => {',
      '    const w = window as any;',
      "    w.navigate('/p1');",
      '    (window as any).D.wardName = "A";',
      '    Object.assign(w.D, { county: "Pinellas" });',
      '    w.D.certRecipients.push({ name: "B" });',
      '    w.caseFile = { wards: [] };',
      '    delete w.D.periodTo;',
      "    const v = 'validatePlanAnnual'; w[v]();",
      '    return window.location.href + w.localStorage.length;',
      '  });',
      '});',
    ].join('\n');
    const r = await inventoryFile('x.spec.ts', ts);
    expect(r.names).toEqual({ D: 4, caseFile: 1, navigate: 1 });
    expect(r.writes.map((x) => `${x.kind}:${x.target}`)).toEqual([
      'assign:D.wardName', 'object-assign:D', 'mutator:D.certRecipients.push', 'replace-root:caseFile', 'delete:D.periodTo',
    ]);
    expect(r.computed).toBe(1);
  });
});
