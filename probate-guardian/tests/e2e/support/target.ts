import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Page } from '@playwright/test';

// package.json has "type": "module", so this file runs as ESM under
// Playwright's loader -- no __dirname available, derive it the ESM way.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// See playwright.config.ts — same PG_TARGET values, same four parity targets
// from INDEX-SPLIT-PLAN.md's Milestone 1 acceptance criteria.
const target = process.env.PG_TARGET || 'source';

// Every browser project forces the File System Access API's feature-detect
// off, so the app always takes the download/upload fallback path that real
// Firefox/Safari users already hit today (index.html:3885, 3946, 4234 all
// gate on window.showSaveFilePicker). That fallback path is what makes
// save/open automatable at all — real native pickers can't be driven by
// Playwright, and this exercises a genuinely shipped path rather than a
// synthetic shortcut.
export async function gotoApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // @ts-expect-error - intentionally removing these for test automation
    delete window.showSaveFilePicker;
    // @ts-expect-error - intentionally removing these for test automation
    delete window.showOpenFilePicker;
  });
  if (target === 'portable') {
    const filePath = path.resolve(__dirname, '../../../dist/portable/index.html');
    await page.goto(pathToFileURL(filePath).href, { waitUntil: 'networkidle' });
  } else {
    await page.goto('/', { waitUntil: 'networkidle' });
  }
}

/** Fresh install / brand-new browser: dismiss the startup screen with "Start a New Case". */
export async function startNewCase(page: Page): Promise<void> {
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#startup-newcase-btn, #startup-newcase-link');
  await page.locator('#startup-choice-overlay').waitFor({ state: 'hidden' });
}

/** Choose "No Password / No Encryption" on the data-protection screen. */
export async function chooseNoPassword(page: Page): Promise<void> {
  await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#security-choice-overlay button[onclick*="selectSecurityMode(\'none\')"]');
  await page.locator('#security-choice-overlay').waitFor({ state: 'hidden' });
}

/** Choose "Encrypted & Password Protected" and set the master password. */
export async function chooseEncrypted(page: Page, pw: string): Promise<void> {
  await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#security-choice-overlay button[onclick*="selectSecurityMode(\'encrypted\')"]');
  await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
  await page.fill('#unlock-password', pw);
  await page.fill('#unlock-password-confirm', pw);
  await page.click('#unlock-submit-btn');
  await page.locator('#unlock-overlay').waitFor({ state: 'hidden' });
}

/** Full fresh-install fast path used by most specs that don't care about the choice screens themselves. */
export async function freshStartNoPassword(page: Page): Promise<void> {
  await gotoApp(page);
  await startNewCase(page);
  await chooseNoPassword(page);
}

/**
 * Creates a ward via the Add Ward modal (index.html: showAddWardModal() /
 * doAddWard()). Works from any page the modal is reachable from — the
 * inventory-select cards and the sidebar's "+ Add Ward" both just call
 * showAddWardModal()/showAddWardModalForType(type) then doAddWard().
 * 'simplified' has its own eligibility modal first and isn't handled here.
 */
export async function createWard(page: Page, name: string, type = 'guardian'): Promise<void> {
  await page.evaluate((t) => (window as any).showAddWardModalForType(t), type);
  await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
  await page.fill('#new-ward-name', name);
  await page.click('#addWardModal button[onclick="doAddWard()"]');
  await page.locator('#addWardModal').waitFor({ state: 'hidden' });
}

/**
 * Fills every field validate() (index.html:15854) requires for a Guardian
 * Inventory ward, directly on window.D via evaluate rather than driving 18
 * form pages of UI -- the export/validation logic under test doesn't care
 * how the data got there. All 11 schedules are marked via their "no items
 * to report" checkbox (scheduleNoItems) rather than populated with rows,
 * since validate() accepts either.
 */
export async function fillMinimalValidGuardianWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    Object.assign(d, {
      wardName: d.wardName || 'Export Test Ward',
      caseNumber: '2026-CP-000123',
      gid: '2026-01-01',
      county: 'Pinellas',
      guardianName: 'Sample Guardian',
      attorneyForGuardian: 'Sample Attorney',
      typeOfGuardianship: 'Plenary',
      bondAmount: '1000',
      bondPeriodFrom: '2026-01-01',
      bondPeriodTo: '2027-01-01',
      bondingCompany: 'Sample Bonding Co',
      serviceDate: '2026-01-02',
    });
    d.scheduleNoItems = Object.fromEntries(
      ['a1', 'a2', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'c5'].map((k) => [k, true])
    );
    d.guardians = [{
      name: 'Sample Guardian', ssnEin: '123-45-6789', phone: '555-555-5555',
      streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-02',
    }];
    d.preparer = {
      name: 'Sample Preparer', ssnEin: '987-65-4321', phone: '555-555-5556',
      streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-02',
    };
    d.attorney = {
      name: 'Sample Attorney', barNumber: '123456', phone: '555-555-5557',
      streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755',
      signatureDate: '2026-01-02', filingDate: '2026-01-02',
    };
    d.serviceRecipients = [{ name: 'Sample Recipient', address: '123 Main St', cityStateZip: 'Clearwater, FL 33755' }];
    d.serviceAttorney = {
      name: 'Sample Attorney', barNumber: '123456', phone: '555-555-5557',
      streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-02',
    };
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}
