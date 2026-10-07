import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freshStartNoPassword, createWard, createSimplifiedWard, fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard } from './support/target';
import { exportWithWrites } from './support/workbook-vs-template';

// Milestone 73T part 2: the Initial Inventory's Import control runs on the
// import transaction (src/core/excel/import-transaction.js) -- one
// confirmation before anything changes, a Cancel that changes nothing and
// saves nothing, and a notice after the redraw of what was kept. Before part
// 2 choosing a workbook replaced every page at once, with no question. Part 3
// connects the Annual family the same way (a Trust or Final keeps its type;
// the old importer turned it into whatever the workbook said, and re-cased
// the attorney's signature choice "typed" to "Typed"); part 4 the Simplified
// (whose import wrote the cover before it asked, so its Cancel left that in
// the filing; and whose re-import blanked Guardian #1's name and stamp).

const DIALOG = '.modal-overlay[id^="dyn-dialog-"].show .modal-box';
const snapshot = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.stringify((window as any).GuardianForms.testing.snapshot().filing));

test("the Inventory's Import: Cancel changes and saves nothing; Import replaces, saves once, and says what it kept", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshStartNoPassword(page);
  await createWard(page, 'Confirm Inventory', 'guardian');
  await fillMinimalValidGuardianWard(page);
  const { bytes } = await exportWithWrites(page, 'guardian');
  const file = path.join(os.tmpdir(), `pg-73t2-confirm-${Date.now()}.xlsx`);
  fs.writeFileSync(file, bytes);

  // Changes the workbook would undo, and a guardian's email it doesn't carry.
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ caseNumber: '2026-GD-999999', 'guardians.0.email': 'keep@example.com' }));
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  const before = await snapshot(page);
  const logBefore = (await page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.auditEntries())).length;

  // Cancel: the filing is byte-for-byte as it was, and nothing is saved.
  await page.evaluate(() => { (window as any).__saves = (window as any).GuardianForms.testing.observe.countAutoSaves(); });
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  const box = page.locator(DIALOG);
  await expect(box).toContainText('replaces', { timeout: 30_000 });
  expect(await snapshot(page), 'nothing changes while the confirmation is open').toBe(before);
  await box.locator('[data-dyn-action="cancel"]').click();
  await expect(page.locator('input[type="file"][accept=".xlsx"]')).toHaveJSProperty('value', '', { timeout: 30_000 });
  expect(await snapshot(page)).toBe(before);
  expect(await page.evaluate(() => (window as any).__saves.count), 'Cancel queues no save').toBe(0);

  // Import: the workbook's values replace the filing's, once, with a notice after the redraw.
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  await page.locator(DIALOG).locator('[data-dyn-action="confirm"]').click({ timeout: 30_000 });
  const notice = page.locator(DIALOG).filter({ hasText: 'Imported' });
  await expect(notice).toContainText(`Imported ${path.basename(file)} into Confirm Inventory`, { timeout: 30_000 });
  await expect(notice).toContainText('Kept as they were');
  await expect(notice).toContainText('Brought back as the workbook holds it');
  await notice.locator('[data-dyn-action="ok"]').click();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  const after = await page.evaluate(() => {
    const t = (window as any).GuardianForms.testing;
    return { caseNumber: t.field('caseNumber'), email: t.field('guardians.0.email') };
  });
  expect(after.caseNumber, "the workbook's case number").not.toBe('2026-GD-999999');
  expect(after.email, "the same guardian keeps the email the workbook doesn't carry").toBe('keep@example.com');
  expect(await page.evaluate(() => (window as any).__saves.count), 'one save').toBe(1);
  await page.evaluate(() => (window as any).__saves.restore());
  const log = await page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.auditEntries());
  expect(log.length - logBefore, 'one Activity Log entry').toBe(1);
  expect(errors).toEqual([]);
});

test("a Trust Accounting's Import: it stays a Trust Accounting, and the attorney's signature choice isn't re-cased", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshStartNoPassword(page);
  await createWard(page, 'Confirm Trust', 'trustAccounting');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ attorney_signatureState: 'typed' }));
  const { bytes } = await exportWithWrites(page, 'annual');
  const file = path.join(os.tmpdir(), `pg-73t3-confirm-${Date.now()}.xlsx`);
  fs.writeFileSync(file, bytes);
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ caseNumber: '2026-GD-999999' }));
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));

  // Cancel changes nothing and saves nothing.
  const before = await snapshot(page);
  await page.evaluate(() => { (window as any).__saves = (window as any).GuardianForms.testing.observe.countAutoSaves(); });
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  await expect(page.locator(DIALOG)).toContainText('replaces', { timeout: 30_000 });
  await page.locator(DIALOG).locator('[data-dyn-action="cancel"]').click();
  await expect(page.locator('input[type="file"][accept=".xlsx"]')).toHaveJSProperty('value', '', { timeout: 30_000 });
  expect(await snapshot(page)).toBe(before);
  expect(await page.evaluate(() => (window as any).__saves.count), 'Cancel queues no save').toBe(0);
  await page.evaluate(() => (window as any).__saves.restore());

  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  await page.locator(DIALOG).locator('[data-dyn-action="confirm"]').click({ timeout: 30_000 });
  const notice = page.locator(DIALOG).filter({ hasText: 'Imported' });
  await expect(notice).toContainText(`Imported ${path.basename(file)} into Confirm Trust`, { timeout: 30_000 });
  await notice.locator('[data-dyn-action="ok"]').click();
  const after = await page.evaluate(() => {
    const t = (window as any).GuardianForms.testing;
    return { type: t.snapshot().filing.inventoryType, filingType: t.field('filingType'), caseNumber: t.field('caseNumber'), state: t.field('attorney_signatureState') };
  });
  expect(after).toEqual({ type: 'trustAccounting', filingType: 'Trust', caseNumber: expect.not.stringMatching('2026-GD-999999'), state: 'typed' });
  expect(errors).toEqual([]);
});

test("the Simplified's Import: Cancel no longer leaves the cover half-imported; Guardian #1 keeps their name and stamp through a re-import", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Confirm Simplified');
  await fillMinimalValidSimplifiedWard(page);
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  await page.evaluate((png) => (window as any).GuardianForms.testing.patchFiling({ 'guardians.0.signatureState': 'stamp', 'guardians.0.signatureImage': png }), PNG);
  const { bytes } = await exportWithWrites(page, 'simplified');
  const file = path.join(os.tmpdir(), `pg-73t4-confirm-${Date.now()}.xlsx`);
  fs.writeFileSync(file, bytes);
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ caseNumber: '2026-GD-999999' }));
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  const guardianBefore = await page.evaluate(() => (window as any).GuardianForms.testing.field('guardians.0.name'));

  // Cancel: the old import had already written the cover and Part II before
  // it asked, and its Cancel left them in the filing.
  const before = await snapshot(page);
  await page.evaluate(() => { (window as any).__saves = (window as any).GuardianForms.testing.observe.countAutoSaves(); });
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  await expect(page.locator(DIALOG)).toContainText('replaces', { timeout: 30_000 });
  await page.locator(DIALOG).locator('[data-dyn-action="cancel"]').click();
  await expect(page.locator('input[type="file"][accept=".xlsx"]')).toHaveJSProperty('value', '', { timeout: 30_000 });
  expect(await snapshot(page)).toBe(before);
  expect(await page.evaluate(() => (window as any).__saves.count), 'Cancel queues no save').toBe(0);
  await page.evaluate(() => (window as any).__saves.restore());

  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  await page.locator(DIALOG).locator('[data-dyn-action="confirm"]').click({ timeout: 30_000 });
  const notice = page.locator(DIALOG).filter({ hasText: 'Imported' });
  await expect(notice).toContainText(`Imported ${path.basename(file)} into Confirm Simplified`, { timeout: 30_000 });
  await notice.locator('[data-dyn-action="ok"]').click();
  const after = await page.evaluate(() => {
    const t = (window as any).GuardianForms.testing;
    return { caseNumber: t.field('caseNumber'), name: t.field('guardians.0.name'), state: t.field('guardians.0.signatureState'), hasImage: !!t.field('guardians.0.signatureImage') };
  });
  expect(after).toEqual({ caseNumber: expect.not.stringMatching('2026-GD-999999'), name: guardianBefore, state: 'stamp', hasImage: true });
  expect(errors).toEqual([]);
});
