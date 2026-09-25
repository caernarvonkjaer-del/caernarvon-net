import { test, expect, type Page } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword, createWard } from './support/target';

// A case file with a part that cannot be read -- a filing's entry missing or
// unreadable, or the shared people, case or dismissal records unreadable --
// used to open without that part and say nothing (only a console warning).
// In Chrome and Edge, opening a file also makes it the file auto-save writes
// to, so the first automatic save then rewrote the original without the lost
// part: permanently, with no notice. Found by Milestone 70's .sav corpus
// (tests/e2e on the milestone-70 branch); fixed with Alan's approval on
// 2026-09-24 ("warn and protect the original").
//
// Now, on every door a case file comes in through -- the startup screen's
// Open, the sidebar's Open backup, and the reload after an unlock -- the filer
// is told exactly which parts could not be read, everything else opens, and
// the damaged original is never the file auto-save writes to.
//
// A stand-in file handle (the File System Access API is Chrome/Edge's; tests
// remove the real pickers) counts every write, and silentAutoExport() -- the
// automatic save -- is run to prove nothing reaches the original. The control
// test proves the same harness sees a write for an undamaged file.

const DYN = '.modal-overlay[id^="dyn-dialog-"].show .modal-box';

/** A two-filing case file from a real session, as base64. */
async function writeCaseFile(page: Page): Promise<string> {
  await gotoApp(page);
  await startNewCase(page);
  await chooseNoPassword(page);
  await createWard(page, 'Damage Ward One');
  await createWard(page, 'Damage Ward Two');
  return page.evaluate(async () => {
    const { blob } = await (window as any).buildCaseFileBlob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  });
}

/** Damage it inside the page with the app's own JSZip: the second filing's entry removed, the case records unreadable. */
async function damage(page: Page, b64: string): Promise<string> {
  return page.evaluate(async (data) => {
    const zip = await (window as any).JSZip.loadAsync(data, { base64: true });
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    zip.remove(manifest.wards[1].file);
    zip.file('cases.enc', 'PLAIN:{"not json');
    return zip.generateAsync({ type: 'base64' });
  }, b64);
}

/** A stand-in handle holding `b64`, counting writes; installed as the picker's answer. */
async function installPicker(page: Page, b64: string, name: string) {
  await page.evaluate(({ data, name }) => {
    const w = window as any;
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    w.__writes = 0;
    w.__handle = {
      name,
      kind: 'file',
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
      isSameEntry: async (other: any) => !!other && other.name === name,
      getFile: async () => new File([bytes], name, { type: 'application/octet-stream' }),
      createWritable: async () => ({ write: async () => { w.__writes += 1; }, close: async () => {} }),
    };
    w.showOpenFilePicker = async () => [w.__handle];
  }, { data: b64, name });
}

async function dialogText(page: Page) {
  const box = page.locator(DYN);
  await box.waitFor({ state: 'visible', timeout: 10_000 });
  return {
    title: ((await box.locator('.modal-box-title').textContent()) || '').trim(),
    message: ((await box.locator('.modal-box-intro').textContent()) || '').trim(),
  };
}

async function accept(page: Page) {
  await page.locator(`${DYN} [data-dyn-action="confirm"], ${DYN} [data-dyn-action="ok"]`).click();
}

/** What auto-save would do now, and to which file. */
const saveTarget = (page: Page) => page.evaluate(async () => {
  const w = window as any;
  const handle = await w.loadCaseFileHandle();
  const wrote = await w.silentAutoExport();
  return { target: handle ? handle.name : null, autoSaveWrote: wrote, writesToOriginal: w.__writes };
});

const filings = (page: Page) => page.evaluate(() => (window as any).caseFile.wards.map((x: any) => x.wardName));

test.describe('a case file with a part that cannot be read', () => {
  test('control: an undamaged file opened at startup becomes the auto-save file', async ({ browser }) => {
    const writer = await browser.newContext();
    const b64 = await writeCaseFile(await writer.newPage());
    await writer.close();

    const context = await browser.newContext();
    const page = await context.newPage();
    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await installPicker(page, b64, 'case.sav');
    await page.click('#startup-choice-overlay [data-startup-action="open-ward"]');
    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    expect(await filings(page)).toEqual(['Damage Ward One', 'Damage Ward Two']);
    expect(await page.locator(DYN).count(), 'no warning for a sound file').toBe(0);
    expect(await saveTarget(page)).toEqual({ target: 'case.sav', autoSaveWrote: true, writesToOriginal: 1 });
    await context.close();
  });

  test('opened at startup: the filer is told what was not read, and the original is never saved over', async ({ browser }) => {
    const writer = await browser.newContext();
    const writerPage = await writer.newPage();
    const b64 = await damage(writerPage, await writeCaseFile(writerPage));
    await writer.close();

    const context = await browser.newContext();
    const page = await context.newPage();
    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await installPicker(page, b64, 'damaged-case.sav');
    await page.click('#startup-choice-overlay [data-startup-action="open-ward"]');

    const { title, message } = await dialogText(page);
    expect(title).toBe('Part of this file could not be read');
    expect(message).toContain('These parts of "damaged-case.sav" could not be read, so they were not opened:');
    expect(message).toContain('• The filing for "Damage Ward Two"');
    expect(message).toContain('• The case records (case numbers and counties)');
    expect(message).toContain('Your original file has not been changed, and it will not be saved over automatically.');
    await accept(page);

    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    expect(await filings(page), 'everything else opened').toEqual(['Damage Ward One']);
    expect(await saveTarget(page), 'auto-save never writes to the damaged original').toEqual({ target: null, autoSaveWrote: false, writesToOriginal: 0 });
  });

  test('restored through Open backup: the prompt says what will not be imported, and the file never becomes the save file', async ({ browser }) => {
    const writer = await browser.newContext();
    const writerPage = await writer.newPage();
    const b64 = await damage(writerPage, await writeCaseFile(writerPage));
    await writer.close();

    const context = await browser.newContext();
    const page = await context.newPage();
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await installPicker(page, b64, 'damaged-backup.sav');
    // The sidebar's Open backup action; not awaited, since it waits on the dialogs below.
    await page.evaluate(() => { const w = window as any; w.__restored = false; w.triggerOpenBackupSav().finally(() => { w.__restored = true; }); });

    const { message } = await dialogText(page);
    expect(message).toContain('Part of this file could not be read and will not be imported:');
    expect(message).toContain('• The filing for "Damage Ward Two"');
    expect(message).toContain('• The case records (case numbers and counties)');
    expect(message).toContain('The file itself will not be changed or saved over.');
    await accept(page);
    // Then the closing "Backup restored" notice, which arrives a moment later.
    await expect.poll(async () => {
      if (await page.locator(DYN).count()) await accept(page);
      return page.evaluate(() => (window as any).__restored);
    }, { timeout: 20_000 }).toBe(true);

    expect(await filings(page)).toEqual(['Damage Ward One']);
    expect(await saveTarget(page), 'the damaged backup is not the file auto-save writes to').toEqual({ target: null, autoSaveWrote: false, writesToOriginal: 0 });
  });

  test('re-read after an unlock: a file damaged on disk is reported and detached', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const good = await writeCaseFile(page);
    const damaged = await damage(page, good);
    // The open case's file, damaged on disk since it was opened.
    await installPicker(page, damaged, 'case-on-disk.sav');
    await page.evaluate(async () => {
      const w = window as any;
      await w.rememberCaseFileHandle(w.__handle);
      w.__lock = w.lockApp();
    });

    const { title, message } = await dialogText(page);
    expect(title).toBe('Part of this file could not be read');
    expect(message).toContain('• The filing for "Damage Ward Two"');
    await accept(page);
    await page.evaluate(() => (window as any).__lock);
    expect(await filings(page)).toEqual(['Damage Ward One']);
    // lockApp() saved the complete case to the file before locking -- that
    // write is correct, and in real life is what the re-read then reads. What
    // matters is that nothing is written to it after the damaged re-read.
    await page.evaluate(() => { (window as any).__writes = 0; });
    expect(await saveTarget(page)).toEqual({ target: null, autoSaveWrote: false, writesToOriginal: 0 });
    await context.close();
  });
});
