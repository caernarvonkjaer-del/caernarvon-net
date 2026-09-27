import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gotoApp, startNewCase, chooseEncrypted, chooseNoPassword, createWard } from './support/target';

// A password-protected case file encrypted every filing, the people and case
// records, the guardian and the activity history -- but its manifest, the
// one part a zip tool shows without any password, listed every filing with
// its ward's name in plain text. Anyone holding the file could read the
// names of the people in the case (wards are incapacitated adults or
// minors) without the password. Found by Milestone 70's .sav corpus; fixed on
// master in 5de3707 and carried onto the milestone-70 branch after 70I
// (converted to GuardianForms.testing).
//
// Now a password-protected file carries no ward name outside its encrypted
// parts: this reads every entry of the file as text and looks for the name.
// Opening it with the password still shows every filing by name (the names
// come from the encrypted filings, which is where every version has always
// read them). An unencrypted file is readable by anyone anyway and keeps the
// names in its manifest.

const PASSWORD = 'manifest-privacy-password';
const NAME = 'Hypothetical Private Ward';

/** Every entry of a case file as text, keyed by entry name. */
async function entriesAsText(page: Page, b64: string): Promise<Record<string, string>> {
  return page.evaluate(async (data) => {
    const zip = await (window as any).JSZip.loadAsync(data, { base64: true });
    const out: Record<string, string> = {};
    for (const name of Object.keys(zip.files)) if (!zip.files[name].dir) out[name] = await zip.file(name).async('string');
    return out;
  }, b64);
}

const toBase64 = (page: Page, which: 'case' | 'single') => page.evaluate(async (kind) => {
  const t = (window as any).GuardianForms.testing;
  const blob = kind === 'case'
    ? await t.exportArchive.caseFile()
    : await t.exportArchive.singleFiling(t.snapshot().caseFile.wards[0].wardId);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}, which);

test.describe('ward names in a saved case file', () => {
  test('a password-protected file shows no ward name to anyone without the password, and still opens with every name', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await gotoApp(page);
    await startNewCase(page);
    await chooseEncrypted(page, PASSWORD);
    await createWard(page, NAME);

    const file = path.join(os.tmpdir(), `pg-manifest-privacy-${process.pid}.sav`);
    for (const which of ['case', 'single'] as const) {
      const b64 = await toBase64(page, which);
      const entries = await entriesAsText(page, b64);
      expect(Object.keys(entries), `${which}: the file has its manifest`).toContain('manifest.json');
      const revealing = Object.entries(entries).filter(([, text]) => text.includes(NAME)).map(([name]) => name);
      expect(revealing, `${which} file: entries that show the ward's name without the password`).toEqual([]);
      if (which === 'case') fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    }
    await context.close();

    // Opened with the password, the filing is there by name.
    const reopen = await browser.newContext();
    const p2 = await reopen.newPage();
    await gotoApp(p2);
    await p2.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await p2.setInputFiles('#startup-open-input', file);
    await p2.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
    await p2.fill('#unlock-password', PASSWORD);
    await p2.click('#unlock-submit-btn');
    await expect(p2.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await expect.poll(() => p2.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards.map((f: any) => f.wardName))).toEqual([NAME]);
    await reopen.close();
  });

  test('an unencrypted file, readable by anyone anyway, keeps the names in its manifest', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, NAME);
    const manifest = JSON.parse((await entriesAsText(page, await toBase64(page, 'case')))['manifest.json']);
    expect(manifest.wards.map((f: any) => f.wardName)).toEqual([NAME]);
  });
});
