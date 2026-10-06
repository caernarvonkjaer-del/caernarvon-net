import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, fillMinimalValidAnnualWard, fillMinimalValidGuardianWard, autoAcceptDynDialogs,
} from './support/target';
import { exportWithWrites, loadWorkbook } from './support/workbook-vs-template';

// Milestone 73V: a guardian row's shared-record link (D.guardianPartyIds, a
// parallel array) must move with the row whenever rows are dropped. Four places
// dropped guardian rows without moving the links, so the next guardian was left
// linked to the dropped guardian's shared record -- and a later edit or Sync
// copied one person's details onto another (AGENTS.md section 6):
//   - a Plan's guardian list, which dropped blank co-guardians on every draw;
//   - the Inventory's D-1, which dropped co-guardians holding no details;
//   (since Milestone 73C both are dropped by the clean-up when the filer leaves
//   a page instead -- each case below arrives from another page, so it runs);
//   - the Annual family's Excel import, which drops the workbook's empty slots;
//   - the Inventory's Excel import, which skips a slot with no name.
// Each case is driven through the real page or the real Import control. The
// link ids are placeholders: only where they sit is under test.

const field = (page: Page, path: string) => page.evaluate((p) => (window as any).GuardianForms.testing.field(p), path);
const patch = (page: Page, shape: Record<string, unknown>) => page.evaluate((s) => (window as any).GuardianForms.testing.patchFiling(s), shape);
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function importWorkbook(page: Page, bytes: Buffer) {
  const file = path.join(os.tmpdir(), `pg-links-${Date.now()}.xlsx`);
  fs.writeFileSync(file, bytes);
  await patch(page, { wardName: 'Import Pending' });
  await go(page, '/');
  const dialogs = autoAcceptDynDialogs(page);
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  await expect.poll(() => page.evaluate(() => {
    const box = document.querySelector('input[type="file"][accept=".xlsx"]') as HTMLInputElement | null;
    return (window as any).GuardianForms.testing.field('wardName') !== 'Import Pending' && !box?.files?.length;
  }), { timeout: 30_000 }).toBe(true);
  await dialogs.stop();
  await page.waitForTimeout(300);
}

test('a Plan: dropping a blank co-guardian keeps the next guardian on its own shared record', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Links Plan', 'planAnnual');
  await patch(page, {
    planGuardians: [{ name: 'Ann First', phone: '(727) 555-0101' }, { name: '' }, { name: 'Carol Third', phone: '(727) 555-0103' }],
    guardianPartyIds: ['party-ann', 'party-blank', 'party-carol'],
  });
  await go(page, '/p11'); // leaving the Cover runs the clean-up; the Signatures page draws what is left
  expect((await field(page, 'planGuardians')).map((g: any) => g.name)).toEqual(['Ann First', 'Carol Third']);
  expect(await field(page, 'guardianPartyIds')).toEqual(['party-ann', 'party-carol']);
  expect(errors).toEqual([]);
});

test('the Inventory D-1: dropping a co-guardian with no details keeps the next guardian on its own shared record', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Links Inventory', 'guardian');
  await patch(page, {
    // A card with only a signature choice: no name or details, so D-1's own
    // rule -- which the clean-up on leaving a page uses since 73C -- drops it.
    guardians: [{ name: 'Ann First', phone: '(727) 555-0101' }, { name: '', signatureState: 'none' }, { name: 'Carol Third', phone: '(727) 555-0103' }],
    guardianPartyIds: ['party-ann', 'party-blank', 'party-carol'],
  });
  await go(page, '/d1');
  expect((await field(page, 'guardians')).map((g: any) => g.name)).toEqual(['Ann First', 'Carol Third']);
  expect(await field(page, 'guardianPartyIds')).toEqual(['party-ann', 'party-carol']);
  expect(errors).toEqual([]);
});

test("the Annual's Excel import: an empty middle slot no longer moves slot 3's guardian onto slot 2's shared record", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Links Annual Import', 'annual');
  await fillMinimalValidAnnualWard(page);
  const first = (await field(page, 'guardians'))[0];
  await patch(page, {
    guardians: [first, { name: 'Bob Second', phone: '(727) 555-0102', mailingStreet: '2 Second St', mailingCityStateZip: 'Clearwater, FL 33755' }, { name: 'Carol Third', phone: '(727) 555-0103', mailingStreet: '3 Third St', mailingCityStateZip: 'Clearwater, FL 33755' }],
    guardianPartyIds: ['party-first', 'party-bob', 'party-carol'],
  });
  const { bytes } = await exportWithWrites(page, 'annual');
  expect((await field(page, 'guardians')).length, 'the filing still has three guardian rows when it is exported').toBe(3);
  // Slot 2 emptied in the workbook, as by hand. (Until Milestone 74B a card
  // holding only "Unsigned" exported an empty slot; it is untouched now, so
  // the clean-up removes it before export, and every card the filing keeps
  // fills its slot.)
  const wb = await loadWorkbook(bytes);
  for (const cell of ['D35', 'F35', 'B37', 'F37', 'B39', 'F39', 'B41', 'F41', 'F43']) wb.getWorksheet('PART II, III').getCell(cell).value = '';
  await importWorkbook(page, Buffer.from(await wb.xlsx.writeBuffer()));
  expect((await field(page, 'guardians')).map((g: any) => g.name)).toEqual([first.name, 'Carol Third']);
  expect(await field(page, 'guardianPartyIds')).toEqual(['party-first', 'party-carol']);
  expect(errors).toEqual([]);
});

// Milestone 74B: a co-guardian holding only a stamp is started. The workbook
// has no box for a stamp, so its slot goes out empty and the import carries
// the stamp back from the filing (import-keep.js); the old rule then dropped
// the card, stamp and link, because it did not count a stamp.
test("the Annual's Excel import: a co-guardian holding only a stamp keeps its place, its stamp and its shared record", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Links Annual Stamp', 'annual');
  await fillMinimalValidAnnualWard(page);
  const first = (await field(page, 'guardians'))[0];
  const stamp = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
  await patch(page, {
    guardians: [first, { name: '', signatureState: 'stamp', signatureImage: stamp }, { name: 'Carol Third', phone: '(727) 555-0103', mailingStreet: '3 Third St', mailingCityStateZip: 'Clearwater, FL 33755' }],
    guardianPartyIds: ['party-first', 'party-stamp', 'party-carol'],
  });
  const { bytes } = await exportWithWrites(page, 'annual');
  expect((await field(page, 'guardians')).length, 'the filing still has three guardian rows when it is exported').toBe(3);
  await importWorkbook(page, bytes);
  const after = await field(page, 'guardians');
  expect(after.map((g: any) => g.name)).toEqual([first.name, '', 'Carol Third']);
  expect(after[1].signatureImage, 'the stamp stays').toBe(stamp);
  expect(await field(page, 'guardianPartyIds')).toEqual(['party-first', 'party-stamp', 'party-carol']);
  expect(errors).toEqual([]);
});

test("the Inventory's Excel import: a slot with no name no longer moves slot 3's guardian onto slot 2's shared record", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Links Inventory Import', 'guardian');
  await fillMinimalValidGuardianWard(page);
  const first = (await field(page, 'guardians'))[0];
  await patch(page, {
    // Slot 2 has a phone but no name: kept on the page, exported, and skipped
    // by the import (a co-guardian slot without a name).
    guardians: [first, { name: '', phone: '(727) 555-0102' }, { name: 'Carol Third', phone: '(727) 555-0103' }],
    guardianPartyIds: ['party-first', 'party-noname', 'party-carol'],
  });
  const { bytes } = await exportWithWrites(page, 'guardian');
  expect((await field(page, 'guardians')).length, 'the filing still has three guardian rows when it is exported').toBe(3);
  await importWorkbook(page, bytes);
  expect((await field(page, 'guardians')).map((g: any) => g.name)).toEqual([first.name, 'Carol Third']);
  expect(await field(page, 'guardianPartyIds')).toEqual(['party-first', 'party-carol']);
  expect(errors).toEqual([]);
});
