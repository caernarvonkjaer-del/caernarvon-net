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

  // Milestone 70, 70T: a name the spec never declares is a window property in
  // the page, so `caseFile.wards` reaches the app exactly as window.caseFile
  // does. Declared names -- parameters, locals, imports -- are not globals.
  test('finds application globals reached bare, and never a name the spec declares', async () => {
    const ts = [
      "import { test } from '@playwright/test';",
      "import { createWard } from './support/target';",
      "test('x', async ({ page }) => {",
      '  await page.evaluate(() => caseFile.wards.length + D.county.length);',
      '  await page.evaluate((navigate: string) => navigate.length, "/p1");',
      '  await page.evaluate(() => { const caseFile = { wards: [] }; return caseFile.wards; });',
      '  await page.evaluate(() => ({ navigate: 1, obj: { D: 2 } }).navigate);',
      '  await createWard(page, "A");',
      '  await page.evaluate(() => document.title + JSON.stringify([]));',
      '});',
    ].join('\n');
    const r = await inventoryFile('x.spec.ts', ts);
    expect(r.bare).toEqual({ caseFile: 1, D: 1 });
    expect(r.names).toEqual({});
  });

  // Milestone 70, 70T: GuardianForms.testing hands back copies, so a write
  // into one arranges nothing. Reported as a state write, whichever way the
  // namespace was reached; a copy edited and written back is fine.
  test('reports writes into what GuardianForms.testing returned, and nothing else', async () => {
    const ts = [
      "import { test } from '@playwright/test';",
      "test('x', async ({ page }) => {",
      '  await page.evaluate(() => {',
      '    const t = (window as any).GuardianForms.testing;',
      "    Object.assign(t.field('preparer'), { name: '' });",
      "    (window as any).GuardianForms.testing.snapshot().filing.county = 'Pasco';",
      '    t.snapshot().caseFile.wards.push({});',
      "    delete t.field('guardians.0').name;",
      '    const d = t.snapshot().filing; d.county = "Orange"; t.replaceFiling(d);',
      "    t.patchFiling({ county: 'Pinellas' });",
      '  });',
      '});',
    ].join('\n');
    const r = await inventoryFile('x.spec.ts', ts);
    expect(r.writes.map((x) => `${x.kind}:${x.target}`)).toEqual([
      'copy-write:field()', 'copy-write:snapshot()', 'copy-write:snapshot()', 'copy-write:field()',
    ]);
    expect(r.names).toEqual({ GuardianForms: 2 });
  });

  // The same rule for a copy held in a variable: a write through anything
  // derived from it -- a member, a for-of item, an array callback's
  // parameter -- is lost unless the copy is handed on (written back, given
  // to a builder, spread into a patch). signature-block-address-margin.spec.ts
  // lost its whole setup this way, unnoticed, until 70T's gate run.
  test('reports a written copy that goes nowhere, and not one written back, built from, or marked deliberate', async () => {
    const ts = [
      "import { test } from '@playwright/test';",
      "test('x', async ({ page }) => {",
      '  await page.evaluate(() => {',
      '    const t = (window as any).GuardianForms.testing;',
      '    const lost = t.snapshot().filing;',
      "    for (const g of lost.guardians || []) g.street = 'A';",
      '    t.save.auto();',
      '    const back = t.snapshot().filing;',
      "    back.guardians.forEach((g: any) => { g.street = 'B'; });",
      '    t.replaceFiling(back);',
      '    const built = t.snapshot().filing;',
      "    built.wardName = 'C';",
      '    buildModel(built);',
      "    const proof = t.snapshot(); // copy-write: deliberate",
      "    proof.filing.wardName = 'D';",
      '  });',
      '});',
    ].join('\n');
    const r = await inventoryFile('x.spec.ts', ts);
    expect(r.writes.map((x) => `${x.kind}:${x.target}`)).toEqual(['copy-write:lost (a copy, written and never handed on)']);
  });
});
