import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { gotoApp } from './support/target';

// Milestone 70, completion criterion 7: "Blank creation, normalization, routes,
// completion, and dashboard progress work without loading a heavy filing
// feature pack" -- and 70K's work: "Keep at least today's feature-level lazy
// loading". A filing's code runs only once one of its pages is shown, in every
// build (the portable page carries every pack inlined; inlined is not
// evaluated). Seen through GuardianForms.testing's status.loadedFeatures():
// until 70K a loaded pack showed as its window.validate<Type> appearing.
//
// The case is the .sav corpus's newest plain archive (tests/fixtures/sav/),
// written by the production build of 2026-09-24: one filing of each of the
// nine types.
const ARCHIVE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/sav/28-zip-0924b-plain.sav');

test("a case of every filing type opens to its dashboard with no filing's code loaded, and opening one loads only its own", async ({ page }) => {
  await gotoApp(page);
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
  await page.setInputFiles('#startup-open-input', ARCHIVE);
  await expect(page.locator('#main-content [data-dashboard-root]')).toBeVisible();

  const status = await page.evaluate(() => {
    const t = (window as any).GuardianForms.testing;
    const filings = t.snapshot().caseFile.wards.map((f: any) => ({ id: f.wardId, type: f.inventoryType }));
    return {
      loaded: t.status.loadedFeatures(),
      types: filings.map((f: any) => f.type).sort(),
      // Each filing's dashboard progress, from the eager registry.
      progress: Object.fromEntries(filings.map((f: any) => [f.type, t.status.progress(f.id)])),
      // A blank filing of each type, from the eager registry.
      blanks: filings.map((f: any) => typeof t.createFiling.emptyData(f.type)),
      loadedAfter: t.status.loadedFeatures(),
    };
  });
  expect(status.types).toHaveLength(9);
  expect(status.loaded, 'only the dashboard, drawn now').toEqual(['dashboard']);
  // Every type's progress is computed without its pack -- but the Initial
  // Inventory's, whose rules are its validator, which lives in its pack: it
  // reads as not computed until that loads (completion-parity.spec.js).
  for (const [type, p] of Object.entries(status.progress)) {
    if (type === 'guardian') expect(p, type).toBeNull();
    else expect(p, type).toMatchObject({ total: expect.any(Number), pct: expect.any(Number) });
  }
  expect(status.blanks).toEqual(Array(9).fill('object'));
  expect(status.loadedAfter, 'progress and blank filings loaded no pack').toEqual(['dashboard']);

  const afterOpen = await page.evaluate(async () => {
    const t = (window as any).GuardianForms.testing;
    const plan = t.snapshot().caseFile.wards.find((f: any) => f.inventoryType === 'planMinor');
    await t.activateFiling.open(plan.wardId);
    return t.status.loadedFeatures();
  });
  await expect(page.locator('#main-content h1').first()).toContainText('Annual Plan — Minors');
  expect(afterOpen, "opening a Plan for a minor loads its pack, and no other filing's").toEqual(['dashboard', 'planMinor']);
});
