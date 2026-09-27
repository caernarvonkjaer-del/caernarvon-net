import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore -- plain .mjs tooling, no types
import { extract } from '../../scripts/ms70-sav-corpus.mjs';
// @ts-ignore -- plain .mjs tooling, no types
import { startServer } from '../../scripts/serve-portable-http.mjs';
import { enableTestMode } from './support/target';
import { currentBuild, type AppDriver } from './support/app-driver';
import { pre70Build } from './support/pre-70-build';
import { COMPLETE_CASE, PREMERGE_SHA, saveCompleteCase } from './support/pre-merge-case';

// Milestone 70, the merge gate's rollback test (MILESTONE-70-PROPOSAL.md,
// "Contracts: Rollback"): "Rolling back redeploys the last pre-merge zip, so
// an archive saved by the migrated version must open in the pre-merge version
// without loss." A filer who saves on the migrated version and is then rolled
// back opens that same file in the old one.
//
// Both builds are served from one origin, as production swaps versions under
// one URL: /new/ is this tree, /old/ the pre-merge build (PG_PREMERGE_SHA; see
// support/pre-merge-case.ts). This tree saves a case with a complete filing
// of every type -- without a password and with one -- opens it, and saves it
// again, as a filer's second save would: the first file has no people
// records (the case was filled through the test adapter's setup path, which
// does not write through to them), and opening it builds them, so the second
// file carries them as a filer's does. Both versions then open that file
// through the startup screen: the old one must hold everything the new one
// reads back from it, value for value (opening a file normalizes some values
// in both -- a bond amount typed as text reads back as a number -- so the new
// version's own reading is the measure, not its memory), open every filing
// for editing, and raise no page error. (A
// recovery snapshot the new version writes, decrypted by the old:
// tests/e2e/mixed-version.characterization.spec.ts.)
//
// The old build is driven through its own globals, which only
// ./support/pre-70-build.ts may name (70T).

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const PORT = 4340; // the milestone-70 branch's own (MILESTONE-70-FIX-LEDGER.md)
const PASSWORD = 'rollback-contract-2026';
type Version = 'old' | 'new';

let server: any;
test.beforeAll(async () => {
  server = await startServer({ port: PORT, mounts: [{ base: '/old/', dir: extract(PREMERGE_SHA) }, { base: '/new/', dir: ROOT }] });
});
test.afterAll(async () => { await new Promise((resolve) => server.close(resolve)); });

async function openApp(page: Page, v: Version) {
  if (v === 'new') await enableTestMode(page);
  await page.addInitScript(() => {
    delete (window as any).showSaveFilePicker;
    delete (window as any).showOpenFilePicker;
    localStorage.setItem('pg.termsAccepted', '2026-09-15');
  });
  await page.goto(`http://localhost:${PORT}/${v}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible', timeout: 30_000 });
}

async function openFile(page: Page, file: string, password: string | null, driver: AppDriver) {
  await page.setInputFiles('#startup-open-input', file);
  if (password) {
    await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
    await page.fill('#unlock-password', password);
    await page.click('#unlock-submit-btn');
    await expect(page.locator('#unlock-overlay')).not.toHaveClass(/show/);
  }
  await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
  await expect.poll(async () => (await driver.filings(page)).length, { timeout: 30_000 }).toBe(COMPLETE_CASE.length);
  return driver.loadedCase(page);
}

/** Every leaf of `expected` that `loaded` does not hold with the same value. */
function lost(expected: any, loaded: any, at = ''): string[] {
  if (Array.isArray(expected)) {
    if (!Array.isArray(loaded)) return [`${at || '(root)'}: an array, read back as ${JSON.stringify(loaded)?.slice(0, 60)}`];
    const out = expected.flatMap((v, i) => lost(v, loaded[i], `${at}[${i}]`));
    return loaded.length < expected.length ? [...out, `${at}: ${expected.length} entries, ${loaded.length} read back`] : out;
  }
  if (expected && typeof expected === 'object') {
    if (!loaded || typeof loaded !== 'object') return [`${at || '(root)'}: an object, read back as ${JSON.stringify(loaded)?.slice(0, 60)}`];
    return Object.keys(expected).flatMap((k) => lost(expected[k], loaded[k], at ? `${at}.${k}` : k));
  }
  return expected === loaded ? [] : [`${at}: ${JSON.stringify(expected)} expected, ${JSON.stringify(loaded)} read back`];
}

for (const password of [null, PASSWORD]) {
  const kind = password ? 'with a password' : 'without a password';
  test(`a case file the migrated version saves ${kind} opens in the pre-merge version, with nothing lost`, async ({ browser }) => {
    test.setTimeout(240_000);
    const context = await browser.newContext();
    try {
      // The migrated version writes the case.
      const writer = await context.newPage();
      await openApp(writer, 'new');
      const first = await saveCompleteCase(writer, password);
      await writer.close();

      // The migrated version opens it and saves it again: the file under test.
      const resave = await context.newPage();
      await openApp(resave, 'new');
      await openFile(resave, first, password, currentBuild);
      const file = first.replace(/\.sav$/, ' (second save).sav');
      fs.writeFileSync(file, Buffer.from(await resave.evaluate(async () => {
        const blob: Blob = await (window as any).GuardianForms.testing.exportArchive.caseFile();
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(s);
      }), 'base64'));
      await resave.close();

      // The migrated version reads that back: the measure.
      const again = await context.newPage();
      await openApp(again, 'new');
      const expected = await openFile(again, file, password, currentBuild);
      expect(expected.wards.map((w: any) => w.inventoryType), 'a filing of every type').toEqual(COMPLETE_CASE.map((f) => f.type));
      expect(expected.parties.length, 'the file carries its people records').toBeGreaterThan(0);
      await again.close();

      // The pre-merge version opens it.
      const reader = await context.newPage();
      const pageErrors: string[] = [];
      reader.on('pageerror', (e) => pageErrors.push(e.message));
      await openApp(reader, 'old');
      const old: AppDriver = pre70Build;
      const loaded = await openFile(reader, file, password, old);
      // A filing's lastModified is the one value the pre-merge build changes as
      // it opens a file: it re-stamps a Plan for Minors when opening it, with
      // no value in it changed (every other field is compared). A timestamp of
      // the reader's own, not something the file held and lost.
      const unstamped = (c: any) => ({ ...c, wards: c.wards.map(({ lastModified, ...w }: any) => w) });
      expect(lost(unstamped(expected), unstamped(loaded)), 'everything the migrated version reads back from the file, read by the pre-merge version too').toEqual([]);
      for (const ward of loaded.wards) {
        await old.openFiling(reader, ward.wardId);
        expect(await old.activeFilingId(reader), `${ward.inventoryType} (${ward.wardName}) opens for editing`).toBe(ward.wardId);
      }
      expect(pageErrors, 'no page error in the pre-merge version').toEqual([]);
    } finally {
      await context.close();
    }
  });
}
