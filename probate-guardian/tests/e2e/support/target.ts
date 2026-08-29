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

/**
 * Simplified Accounting has its own dedicated creation flow --
 * showAddWardModalForType('simplified') redirects straight to the
 * eligibility modal instead of the generic Add Ward modal (index.html's
 * doConfirmSimplifiedEligibility() then creates a 'simplified' ward if both
 * answers are 'Yes', or falls back to a plain 'annual' ward otherwise), so
 * createWard() above can't be used for this type. Always answers both
 * eligibility questions 'Yes' so the resulting ward is genuinely Simplified.
 */
export async function createSimplifiedWard(page: Page, name: string): Promise<void> {
  await page.evaluate(() => (window as any).showAddWardModalForType('simplified'));
  await page.locator('#simplifiedEligibilityModal.show').waitFor({ state: 'visible' });
  await page.fill('#elig-ward-name', name);
  await page.selectOption('#elig-depository', 'Yes');
  await page.selectOption('#elig-only-transactions', 'Yes');
  await page.click('#simplifiedEligibilityModal button[onclick="doConfirmSimplifiedEligibility()"]');
  await page.locator('#simplifiedEligibilityModal').waitFor({ state: 'hidden' });
}

/**
 * Fills every field validateSimplified() (src/features/simplified-
 * accounting/index.js) requires for a Simplified Accounting ward, directly
 * on window.D via evaluate -- same reasoning as fillMinimalValidGuardianWard.
 */
export async function fillMinimalValidSimplifiedWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    Object.assign(d, {
      wardName: d.wardName || 'Simplified Export Test Ward',
      caseNumber: '2026-CP-000456',
      ssn: '123-45-6789',
      gid: '2026-01-01',
      periodFrom: '2026-01-01',
      periodTo: '2026-12-31',
      guardian: 'Sample Guardian',
      attorney: 'Sample Attorney',
      typeOfGuardianship: 'Plenary',
      county: 'Pinellas',
      amendedForm: 'No',
      eligDepository: 'Yes',
      eligOnlyTransactions: 'Yes',
      startingBalance: '1000',
      interestIncome: '10',
      depositsSettlement: '0',
      serviceCharges: '5',
      federalIncomeTax: '0',
      attorney_barNumber: '123456',
      attorney_phone: '555-555-5557',
      attorney_street: '123 Main St',
      attorney_cityStateZip: 'Clearwater, FL 33755',
      certServiceDate: '2026-01-02',
      certIndicator: 'Mailed',
    });
    d.guardians = [{
      name: 'Sample Guardian', ssn: '123-45-6789', phone: '555-555-5555', email: 'guardian@example.com',
      mailingStreet: '123 Main St', mailingCityStateZip: 'Clearwater, FL 33755',
      residenceStreet: '123 Main St', residenceCityStateZip: 'Clearwater, FL 33755',
      signatureDate: '2026-01-02',
    }];
    d.certRecipients = [
      { name: 'Recipient One', line2: '', line3: '' },
      { name: '', line2: '', line3: '' },
      { name: 'Recipient Three', line2: '', line3: '' },
      { name: '', line2: '', line3: '' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}
