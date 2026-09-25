import { test, expect, type Page } from '@playwright/test';
import { gotoApp, startNewCase, chooseEncrypted, createWard } from './support/target';

// Milestone 70, 70A: "Fill the security contract gaps before ownership
// moves" -- the inactivity lock, the unlock lockout and its backoff, key
// erasure on lock, and proof that no password reaches the saved case file or
// any browser storage. 70I moves all of this out of legacy-app.js into
// services; these characterize today's behavior so the move can be checked
// against it. tests/unit/crypto-contract.spec.js pins the cipher parameters.
//
// What this protects: an unattended, unlocked app locks itself; guessing
// the password in the app is throttled; a saved or cached copy of the case
// holds no password. What it does not: offline guessing against a copied
// .sav file, which only PBKDF2's cost slows down.
//
// Like tests/e2e/unlock.spec.ts, the lock is started with lockApp() -- the
// function the Lock button runs -- because the button sits in a collapsed
// panel, and the button is not what is under test. These specs reach app
// globals directly; 70T moves them onto GuardianForms.testing.

const PASSWORD = 'Pg-Contract-Secret-9427';

async function encryptedCaseWithWard(page: Page) {
  await gotoApp(page);
  await startNewCase(page);
  await chooseEncrypted(page, PASSWORD);
  await createWard(page, 'Security Contract Ward');
  await expect(page.locator('#sidebar')).toBeVisible();
}

const overlay = (page: Page) => page.locator('#unlock-overlay');
const keyHeld = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.keyHeld());

async function attempt(page: Page, password: string) {
  await page.fill('#unlock-password', password);
  await page.click('#unlock-submit-btn');
}

test.describe('security contract (Milestone 70, 70A)', () => {
  test('the app locks itself after 15 minutes without activity, and not before; locking clears the key', async ({ page }) => {
    test.setTimeout(120_000);
    await encryptedCaseWithWard(page);
    expect(await keyHeld(page)).toBe(true);

    // Fake the clock from here, then make activity so the inactivity timer is
    // re-armed on it (any mousemove/keydown/scroll/touch resets it).
    await page.clock.install();
    await page.mouse.move(40, 40);
    await page.mouse.move(60, 60);

    await page.clock.fastForward('14:50');
    await expect(overlay(page), 'still unlocked at 14 minutes 50 seconds').not.toHaveClass(/show/);
    expect(await keyHeld(page)).toBe(true);

    await page.clock.fastForward('00:20');
    await expect(overlay(page), 'locked after 15 minutes idle').toHaveClass(/show/);
    expect(await keyHeld(page), 'the key is cleared on lock').toBe(false);
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards.length), 'the case is cleared from memory while locked').toBe(0);

    await attempt(page, PASSWORD);
    await expect(overlay(page)).not.toHaveClass(/show/);
    expect(await keyHeld(page)).toBe(true);
  });

  test('five wrong passwords lock unlocking for 30 seconds, then the wait doubles per failure up to 5 minutes; success resets it', async ({ page }) => {
    test.setTimeout(180_000);
    await encryptedCaseWithWard(page);
    await page.clock.install();
    await page.evaluate(() => { void (window as any).GuardianForms.testing.lock(); });
    await expect(overlay(page)).toHaveClass(/show/);
    const error = page.locator('#unlock-error');

    for (let i = 1; i <= 4; i++) {
      await attempt(page, `wrong-${i}`);
      await expect(error, `failure ${i}`).toHaveText('Incorrect password. Please try again.');
    }
    await attempt(page, 'wrong-5');
    await expect(error).toHaveText('Incorrect password. Too many attempts — try again in 30 seconds.');

    // During the lockout even the right password is refused, without being tried.
    await attempt(page, PASSWORD);
    await expect(error).toHaveText(/^Too many incorrect attempts\. Try again in (29|30) seconds\.$/);
    await expect(overlay(page)).toHaveClass(/show/);

    // Each further failure after a lockout expires doubles the wait, capped at 5 minutes.
    const ladder: [number, string][] = [[31, '1 minute'], [61, '2 minutes'], [121, '4 minutes'], [241, '5 minutes'], [301, '5 minutes']];
    for (const [waitSeconds, next] of ladder) {
      await page.clock.fastForward(waitSeconds * 1000);
      await attempt(page, 'still-wrong');
      await expect(error).toHaveText(`Incorrect password. Too many attempts — try again in ${next}.`);
    }

    // After the last lockout, the right password unlocks and the count resets.
    await page.clock.fastForward(301_000);
    await attempt(page, PASSWORD);
    await expect(overlay(page)).not.toHaveClass(/show/);
    await page.evaluate(() => { void (window as any).GuardianForms.testing.lock(); });
    await expect(overlay(page)).toHaveClass(/show/);
    await attempt(page, 'wrong-again');
    await expect(error, 'the count restarted at one').toHaveText('Incorrect password. Please try again.');
  });

  test('no password reaches the saved case file, localStorage, sessionStorage or IndexedDB', async ({ page }) => {
    test.setTimeout(120_000);
    await encryptedCaseWithWard(page);
    await page.evaluate(() => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ 'wardName': 'Eleanor Whitfield' });
      w.GuardianForms.testing.save.auto();
      return w.GuardianForms.testing.save.flush();
    });

    const found = await page.evaluate(async (secret) => {
      const w = window as any;
      const needles = [secret, btoa(secret), encodeURIComponent(secret)];
      const hits: string[] = [];
      const check = (where: string, text: string) => { for (const n of needles) if (text.includes(n)) hits.push(where); };

      const blob = await w.GuardianForms.testing.exportArchive.caseFile();
      const zip = await w.JSZip.loadAsync(blob);
      const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
      for (const name of names) check(`sav:${name}`, await zip.file(name).async('string'));
      const manifest = JSON.parse(await zip.file('manifest.json').async('string'));

      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; check(`localStorage:${k}`, `${k}=${localStorage.getItem(k)}`); }
      for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i)!; check(`sessionStorage:${k}`, `${k}=${sessionStorage.getItem(k)}`); }

      const dbs = (await (indexedDB as any).databases?.()) || [];
      for (const { name } of dbs) {
        const db: IDBDatabase = await new Promise((res, rej) => { const r = indexedDB.open(name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        for (const store of Array.from(db.objectStoreNames)) {
          const values: unknown[] = await new Promise((res, rej) => {
            const req = db.transaction(store, 'readonly').objectStore(store).getAll();
            req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
          });
          check(`indexedDB:${name}/${store}`, JSON.stringify(values, (_k, v) => (v instanceof CryptoKey ? '[CryptoKey]' : v)));
        }
        db.close();
      }
      return { hits, entries: names.length, manifestKeys: Object.keys(manifest), dbCount: dbs.length };
    }, PASSWORD);

    expect(found.entries, 'the archive has entries to search').toBeGreaterThan(1);
    expect(found.hits, 'the password appears nowhere').toEqual([]);
    expect(found.manifestKeys.filter((k: string) => /pass(word)?|secret|rawkey/i.test(k)), 'no manifest field holds a password or raw key').toEqual([]);
  });
});
