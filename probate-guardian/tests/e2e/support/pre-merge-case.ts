import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createWard, createSimplifiedWard, fillMinimalValidAnnualWard, fillMinimalValidGuardianWard,
  fillMinimalValidSimplifiedWard, fillMinimalValidPlanSimplifiedWard, fillMinimalValidPlanAnnualWard,
  fillMinimalValidPlanInitialWard, fillMinimalValidPlanMinorWard,
} from './target';

// Milestone 70, the merge gate: the case the rollback test
// (tests/e2e/rollback.contract.spec.ts) and the pre-merge output comparison
// (tests/e2e/pre-merge-output.characterization.spec.ts) have this tree save,
// for the pre-merge build to open. One filing of each of the nine types, each
// complete -- the values the browser suite's fillMinimalValid*Ward() helpers
// give, so every type can be previewed and exported without an outstanding
// requirement -- under four wards: the Plan for Minors has its own, since a
// minor's plan filed under a ward with adult filings makes the app ask
// whether the ward is really a minor (and a filer would not do it).
//
// PREMERGE_SHA is the pre-merge build both compare against: by default
// master's head when this was written; PG_PREMERGE_SHA re-pins it to the
// commit the rollback zip is built from, at the merge gate.

export const PREMERGE_SHA = process.env.PG_PREMERGE_SHA || '44f46ec';

async function annualFamily(page: Page, type: string) {
  await fillMinimalValidAnnualWard(page);
  if (type === 'annual') return;
  await page.evaluate((v) => (window as any).GuardianForms.testing.patchFiling({ filingType: v }), type === 'finalAccounting' ? 'Final' : 'Trust');
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
}

/** Each filing: its type, its ward, how this tree makes it complete, and its Preview & Export controls. */
export const COMPLETE_CASE: Array<{
  type: string; name: string; create: (page: Page) => Promise<void>;
  action: string; savePdf: string; saveExcel: string | null;
}> = [
  { type: 'guardian', name: 'Pre-Merge Ward One', action: 'data-inventory-action', savePdf: 'save-pdf', saveExcel: 'save-excel',
    create: async (p) => { await createWard(p, 'Pre-Merge Ward One', 'guardian'); await fillMinimalValidGuardianWard(p); } },
  { type: 'annual', name: 'Pre-Merge Ward One', action: 'data-annual-action', savePdf: 'save-pdf', saveExcel: 'save-excel',
    create: async (p) => { await createWard(p, 'Pre-Merge Ward One', 'annual'); await annualFamily(p, 'annual'); } },
  { type: 'planAnnual', name: 'Pre-Merge Ward One', action: 'data-form-action', savePdf: 'save-pdf-plan-annual', saveExcel: null,
    create: async (p) => { await createWard(p, 'Pre-Merge Ward One', 'planAnnual'); await fillMinimalValidPlanAnnualWard(p); } },
  { type: 'planInitial', name: 'Pre-Merge Ward One', action: 'data-form-action', savePdf: 'save-pdf-plan-initial', saveExcel: null,
    create: async (p) => { await createWard(p, 'Pre-Merge Ward One', 'planInitial'); await fillMinimalValidPlanInitialWard(p); } },
  { type: 'simplified', name: 'Pre-Merge Ward Two', action: 'data-simplified-action', savePdf: 'save-pdf', saveExcel: 'save-excel',
    create: async (p) => { await createSimplifiedWard(p, 'Pre-Merge Ward Two'); await fillMinimalValidSimplifiedWard(p); } },
  { type: 'planSimplified', name: 'Pre-Merge Ward Two', action: 'data-plan-simplified-action', savePdf: 'save-pdf', saveExcel: null,
    create: async (p) => { await createWard(p, 'Pre-Merge Ward Two', 'planSimplified'); await fillMinimalValidPlanSimplifiedWard(p); } },
  { type: 'finalAccounting', name: 'Pre-Merge Ward Three', action: 'data-annual-action', savePdf: 'save-pdf', saveExcel: 'save-excel',
    create: async (p) => { await createWard(p, 'Pre-Merge Ward Three', 'finalAccounting'); await annualFamily(p, 'finalAccounting'); } },
  { type: 'trustAccounting', name: 'Pre-Merge Ward Three', action: 'data-annual-action', savePdf: 'save-pdf', saveExcel: 'save-excel',
    create: async (p) => { await createWard(p, 'Pre-Merge Ward Three', 'trustAccounting'); await annualFamily(p, 'trustAccounting'); } },
  { type: 'planMinor', name: 'Pre-Merge Ward Four', action: 'data-form-action', savePdf: 'save-pdf-plan-minor', saveExcel: null,
    create: async (p) => { await createWard(p, 'Pre-Merge Ward Four', 'planMinor'); await fillMinimalValidPlanMinorWard(p); } },
];

/** Starts a case on the startup screen, with a password or without. */
export async function startCase(page: Page, password: string | null) {
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible', timeout: 30_000 });
  await page.click('#startup-newcase-btn, #startup-newcase-link');
  await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click(`#security-choice-overlay [data-startup-action="select-security"][data-security-mode="${password ? 'encrypted' : 'none'}"]`);
  if (password) {
    await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
    await page.fill('#unlock-password', password);
    await page.fill('#unlock-password-confirm', password);
    await page.click('#unlock-submit-btn');
    await page.locator('#unlock-overlay').waitFor({ state: 'hidden' });
  }
  await page.locator('#security-choice-overlay').waitFor({ state: 'hidden' });
}

/**
 * In a tab on this tree, at the startup screen: makes COMPLETE_CASE and saves
 * it as a case file. Returns the file's path.
 */
export async function saveCompleteCase(page: Page, password: string | null): Promise<string> {
  await startCase(page, password);
  // The first filing raises the "Save Your First Backup" reminder, a toast
  // that can land on a dialog's button between Playwright's check and its
  // click; Remind Me Later puts it away, as a filer would.
  const reminder = page.locator('#auto-export-reminder [data-shell-action="hide-auto-export-reminder"]');
  for (const filing of COMPLETE_CASE) {
    if (await reminder.isVisible()) await reminder.click();
    await filing.create(page);
    const type = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing?.inventoryType);
    expect(type, `${filing.type} created and open`).toBe(filing.type);
  }
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  const base64 = await page.evaluate(async () => {
    const blob: Blob = await (window as any).GuardianForms.testing.exportArchive.caseFile();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ms70-premerge-')), 'Pre-Merge Case.sav');
  fs.writeFileSync(file, Buffer.from(base64, 'base64'));
  return file;
}
