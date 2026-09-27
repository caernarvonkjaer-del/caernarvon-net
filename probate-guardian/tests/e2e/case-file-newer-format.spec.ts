import { test, expect, type Page } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword, createWard } from './support/target';

// Every case file carries its format version in its manifest (1, for every
// version so far). A file marked with a newer version used to open as if it
// were version 1: an older tab -- production caches the page for a year, so
// old tabs linger -- would drop whatever the newer format added and, in
// Chrome/Edge, auto-save over the file. Found by Milestone 70's .sav corpus;
// fixed on master in 5de3707 and carried onto the milestone-70 branch after
// 70I (converted to GuardianForms.testing; Open Backup through its real
// button). Now a newer-format file is refused on the startup screen, by Open
// backup, and on the re-read after an unlock; the filer is told to refresh to
// the current version, and the file never becomes the one auto-save writes to.

const DYN = '.modal-overlay[id^="dyn-dialog-"].show .modal-box';

async function newerFormatFile(page: Page): Promise<string> {
  await gotoApp(page);
  await startNewCase(page);
  await chooseNoPassword(page);
  await createWard(page, 'Newer Format Ward');
  return page.evaluate(async () => {
    const w = window as any;
    const blob = await w.GuardianForms.testing.exportArchive.caseFile();
    const zip = await w.JSZip.loadAsync(blob);
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    zip.file('manifest.json', JSON.stringify({ ...manifest, version: 2 }));
    return zip.generateAsync({ type: 'base64' });
  });
}

async function installPicker(page: Page, b64: string, name: string) {
  await page.evaluate(({ data, name }) => {
    const w = window as any;
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    w.__writes = 0;
    w.__handle = {
      name, kind: 'file',
      queryPermission: async () => 'granted', requestPermission: async () => 'granted',
      isSameEntry: async (o: any) => !!o && o.name === name,
      getFile: async () => new File([bytes], name, { type: 'application/octet-stream' }),
      createWritable: async () => ({ write: async () => { w.__writes += 1; }, close: async () => {} }),
    };
    w.showOpenFilePicker = async () => [w.__handle];
  }, { data: b64, name });
}

/** Which file auto-save writes to now, and what the automatic save writes to it. */
const saveTarget = (page: Page) => page.evaluate(async () => {
  const w = window as any;
  const t = w.GuardianForms.testing;
  const target = await t.persistenceState.caseFileName();
  await t.save.saveData();
  return { target, writesToFile: w.__writes };
});

const filingCount = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards.length);

test.describe('a case file saved in a newer format', () => {
  test('is refused on the startup screen, and never becomes the save file', async ({ browser }) => {
    const writer = await browser.newContext();
    const b64 = await newerFormatFile(await writer.newPage());
    await writer.close();

    const context = await browser.newContext();
    const page = await context.newPage();
    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await installPicker(page, b64, 'newer.sav');
    await page.click('#startup-choice-overlay [data-startup-action="open-ward"]');
    const box = page.locator(DYN);
    await expect(box.locator('.modal-box-intro')).toContainText('This file was saved by a newer version of Guardian Forms than the one open in this tab');
    await box.locator('[data-dyn-action="ok"]').click();
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
    expect(await filingCount(page), 'nothing opened').toBe(0);
    expect(await saveTarget(page)).toEqual({ target: null, writesToFile: 0 });
    await context.close();
  });

  test('is refused by Open backup, and never becomes the save file', async ({ browser }) => {
    const writer = await browser.newContext();
    const b64 = await newerFormatFile(await writer.newPage());
    await writer.close();

    const context = await browser.newContext();
    const page = await context.newPage();
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    // A case with one filing of its own, so the sidebar's Open backup button is on screen.
    await createWard(page, 'Existing Filing');
    await installPicker(page, b64, 'newer-backup.sav');
    const toggle = page.locator('#save-controls-toggle-btn');
    if (await toggle.isVisible() && ((await toggle.textContent()) || '').includes('Show')) await toggle.click();
    await page.click('[data-shell-action="open-backup-sav"]');
    const box = page.locator(DYN);
    await expect(box.locator('.modal-box-intro')).toContainText('Could not open backup file: This file was saved by a newer version of Guardian Forms');
    await box.locator('[data-dyn-action="ok"]').click();
    await expect(page.locator(DYN)).toHaveCount(0);
    expect(await filingCount(page), 'nothing imported').toBe(1);
    expect(await saveTarget(page)).toEqual({ target: null, writesToFile: 0 });
    await context.close();
  });

  test('saved over by a newer tab while this one was locked: not read on unlock, and never saved over from here', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const b64 = await newerFormatFile(page);
    // The open case's file, as a newer version has since saved it.
    await installPicker(page, b64, 'case-on-disk.sav');
    await page.evaluate(async () => {
      const w = window as any;
      await w.GuardianForms.testing.launchState.rememberHandle(w.__handle);
      w.__lock = w.GuardianForms.testing.lock();
    });
    const box = page.locator(DYN);
    await expect(box.locator('.modal-box-intro')).toContainText('This file was saved by a newer version of Guardian Forms than the one open in this tab');
    await box.locator('[data-dyn-action="ok"]').click();
    await page.evaluate(() => (window as any).__lock);
    // The lock saved this tab's case before locking; nothing may be written after the refusal.
    await page.evaluate(() => { (window as any).__writes = 0; });
    expect(await saveTarget(page)).toEqual({ target: null, writesToFile: 0 });
    await context.close();
  });
});
