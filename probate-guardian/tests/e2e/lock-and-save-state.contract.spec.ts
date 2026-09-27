import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gotoApp, startNewCase, chooseEncrypted, freshStartNoPassword, createWard } from './support/target';

// Milestone 70, 70I gate: what the persistence and security services owe a
// filer, each seen failing on the code before 70I (MILESTONE-70-PROPOSAL.md,
// 70I, and its build record's findings):
//   - the auto-save interval a filer picks, and when the case was last saved,
//     travel with the case file (the interval was never saved; an opened
//     file's last save showed as none);
//   - locking a case never saved to a file brings back its shared records --
//     cases, people -- and its circuit, not only its filings;
//   - locking after edits the case file does not have yet (a remembered file
//     this browser may only read) keeps the edits: the case comes back from
//     the recovery snapshot, not from the older file;
//   - a lock restores only a snapshot this page wrote -- never one an earlier
//     session left behind;
//   - no key or password is left on the page or written to the case file.
//
// A remembered file is a stand-in handle armed through the test adapter (the
// idiom backup-restore-sav.spec.ts established): Playwright cannot drive the
// native pickers. `window.__writable` is this spec's own switch for whether
// the browser lets the page write that file.

const PW = 'contract-password-1';

async function unlockWith(page: Page, pw: string) {
  await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
  await page.fill('#unlock-password', pw);
  await page.click('#unlock-submit-btn');
  await page.locator('#unlock-overlay').waitFor({ state: 'hidden' });
}

/** Lock (the promise resolves only after the unlock, so it is not awaited here), then unlock. */
async function lockAndUnlock(page: Page, pw: string) {
  await page.evaluate(() => { void (window as any).GuardianForms.testing.lock(); });
  await unlockWith(page, pw);
}

/** A remembered case file held in memory; writes land only while window.__writable is true. */
async function armRememberedFile(page: Page, name: string) {
  await page.evaluate(async (fileName) => {
    const w = window as any;
    w.__writable = true;
    w.__stored = await w.GuardianForms.testing.exportArchive.caseFile();
    await w.GuardianForms.testing.launchState.rememberHandle({
      name: fileName,
      queryPermission: async (o: any) => (o && o.mode === 'readwrite' && !w.__writable ? 'prompt' : 'granted'),
      requestPermission: async () => 'granted',
      getFile: async () => new File([w.__stored], fileName, { type: 'application/octet-stream' }),
      createWritable: async () => {
        const parts: any[] = [];
        return { write: async (b: any) => { parts.push(b); }, close: async () => { w.__stored = new Blob(parts); } };
      },
    });
  }, name);
}

const snapshot = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot());

test('the auto-save interval a filer picks, and when the case was last saved, travel with the case file', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Interval Filing', 'planAnnual');
  const toggle = page.locator('#save-controls-toggle-btn');
  if (await toggle.isVisible() && ((await toggle.textContent()) || '').includes('Show')) await toggle.click();
  await page.selectOption('#auto-export-interval-select', '30');
  await armRememberedFile(page, 'interval-case.sav');
  // A save to the file: it records its own time, as every save does.
  const b64 = await page.evaluate(async () => {
    const w = window as any;
    await w.GuardianForms.testing.save.saveData();
    const bytes = new Uint8Array(await w.__stored.arrayBuffer());
    let s = '';
    bytes.forEach((x) => { s += String.fromCharCode(x); });
    return btoa(s);
  });
  const file = path.join(os.tmpdir(), `ms70-70i-interval-${process.pid}.sav`);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));

  // The next launch opens that file from the start dialog.
  await page.reload();
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
  await page.setInputFiles('#startup-open-input', file);
  await page.locator('#startup-choice-overlay').waitFor({ state: 'hidden' });
  await expect(page.locator('#auto-export-interval-select')).toHaveValue('30');
  await expect(page.locator('#last-saved-indicator')).toContainText('Last backup:');
});

test('locking a case never saved to a file brings back its shared records and its circuit', async ({ page }) => {
  await gotoApp(page);
  await startNewCase(page);
  await chooseEncrypted(page, PW);
  await createWard(page, 'Shared Records Filing', 'planAnnual');
  await page.evaluate(async () => {
    const t = (window as any).GuardianForms.testing;
    t.updateSharedRecords.createCase({ caseNumber: '2026-CP-000123' });
    t.updateSharedRecords.createParty('guardian', { name: 'Pat Guardian' });
    await t.navigate('/dashboard');
  });
  await page.locator('#sidebar-circuit-select').selectOption('13');
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  const before = await snapshot(page);
  expect(before.caseFile.cases.length).toBeGreaterThan(0);
  expect(before.caseFile.parties.length).toBeGreaterThan(0);

  await lockAndUnlock(page, PW);
  await expect.poll(async () => (await snapshot(page)).caseFile.wards.length).toBe(1);
  const after = (await snapshot(page)).caseFile;
  expect({ cases: after.cases, parties: after.parties, dismissedPartyPairs: after.dismissedPartyPairs, selectedCircuit: after.selectedCircuit })
    .toEqual({ cases: before.caseFile.cases, parties: before.caseFile.parties, dismissedPartyPairs: before.caseFile.dismissedPartyPairs, selectedCircuit: 13 });
});

test('locking after edits a remembered file could not take keeps the edits', async ({ page }) => {
  await gotoApp(page);
  await startNewCase(page);
  await chooseEncrypted(page, PW);
  await createWard(page, 'Original Name', 'planAnnual');
  await armRememberedFile(page, 'read-only-case.sav');
  await page.evaluate(() => (window as any).GuardianForms.testing.save.saveData());
  // From here the browser will not let this page write the file (after a
  // browser restart, until the filer clicks Save Backup).
  await page.evaluate(() => { (window as any).__writable = false; });
  const filingId = (await snapshot(page)).caseFile.wards[0].wardId;
  await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), filingId);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  await page.evaluate(() => (window as any).GuardianForms.testing.setField('wardName', 'Edited Name'));
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  expect((await snapshot(page)).hasUnsavedChanges, 'the file does not have the edit').toBe(true);

  await lockAndUnlock(page, PW);
  await expect.poll(async () => (await snapshot(page)).caseFile.wards.map((f: any) => f.wardName)).toEqual(['Edited Name']);
});

test('a lock never restores a recovery snapshot this page did not write', async ({ page }) => {
  await gotoApp(page);
  // An earlier session's snapshot, never saved to a file and left behind.
  await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const req = indexedDB.open('pg-session-cache', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('snapshot');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('snapshot', 'readwrite');
      tx.objectStore('snapshot').put({
        savedAt: 1,
        securityMode: 'none',
        guardian: 'PLAIN:' + JSON.stringify({ guardianName: 'Someone Else', guardianEmail: '' }),
        wards: [{ wardId: 'w-earlier', enc: 'PLAIN:' + JSON.stringify({ wardId: 'w-earlier', wardName: 'Earlier Session Filing', inventoryType: 'planAnnual' }) }],
      }, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await startNewCase(page);
  await chooseEncrypted(page, PW);

  await lockAndUnlock(page, PW);
  await page.waitForTimeout(1000); // the reload after the unlock settles
  const after = (await snapshot(page)).caseFile;
  expect(after.wards.map((f: any) => f.wardName)).toEqual([]);
  expect(after.guardianName || '').not.toBe('Someone Else');
});

test('no key or password is left on the page or written to the case file', async ({ page }) => {
  await gotoApp(page);
  await startNewCase(page);
  await chooseEncrypted(page, PW);
  await createWard(page, 'Private Filing', 'planAnnual');
  const look = () => page.evaluate(async (pw) => {
    const w = window as any;
    const blob = await w.GuardianForms.testing.exportArchive.caseFile();
    const zip = await w.JSZip.loadAsync(blob);
    let text = '';
    for (const name of Object.keys(zip.files)) {
      const entry = zip.file(name);
      if (entry) text += await entry.async('string');
    }
    return {
      passwordInFile: text.includes(pw),
      onWindow: ['_cryptoKey', '_securityMode'].filter((n) => Object.getOwnPropertyDescriptor(window, n) !== undefined),
      passwordFields: ['unlock-password', 'unlock-password-confirm'].map((id) => (document.getElementById(id) as HTMLInputElement).value),
      keyHeld: w.GuardianForms.testing.persistenceState.keyHeld(),
    };
  }, PW);
  const expected = { passwordInFile: false, onWindow: [], passwordFields: ['', ''], keyHeld: true };
  expect(await look(), 'after creating the password').toEqual(expected);
  await lockAndUnlock(page, PW);
  expect(await look(), 'after a lock and an unlock').toEqual(expected);
});
