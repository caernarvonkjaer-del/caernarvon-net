import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

test.describe('Non-Raster PDF Generation, Signatures & Bookmarks', () => {
  test('generates native vector/text PDF with metadata, hierarchical bookmarks, and selectable /s/ signatures', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));

    // 1. Fresh start
    await freshStartNoPassword(page);

    // Open Add Ward modal and create initial guardian inventory ward
    await page.evaluate(() => (window as any).showAddWardModalForType('guardian'));
    await page.locator('#new-ward-name').fill('Harold Thomas Bennett');
    await page.locator('#new-ward-type').selectOption('guardian');
    await page.locator('[data-modal-action="add-ward"]').click();
    await expect(page.locator('#addWardModal')).toBeHidden();

    // 2. Set up full Verified Initial Inventory mock state
    await page.evaluate(() => {
      Object.assign((window as any).D, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        gid: '2026-01-15',
        typeOfGuardianship: 'Plenary',
        guardianName: 'Rachel M. Alvarez',
        attorneyForGuardian: 'Robert Vance, Esq.',
        isAmended: false,
        signatureStyle: 'typed',
        hasSafeDepositBox: false,
        safeDepositBoxFiled: null,
        bondAmount: 50000,
        bondPeriodFrom: '2026-01-15',
        bondPeriodTo: '2027-01-15',
        bondingCompany: 'Travelers Casualty and Surety',
        serviceDate: '2026-03-01',
        witnesses: [
          { name: 'David Miller', address: '120 Central Ave, St. Petersburg, FL', occupation: 'Paralegal' },
        ],
        guardians: [
          {
            name: 'Rachel M. Alvarez',
            signatureDate: '2026-02-28',
            phone: '727-555-0144',
            streetAddress: '450 2nd Ave N',
            cityStateZip: 'St. Petersburg, FL 33701',
            ssnEin: '***-**-6789',
          },
        ],
        preparer: {
          name: 'Marcus Thorne',
          signatureDate: '2026-02-28',
          phone: '727-555-0188',
          streetAddress: '780 4th St N',
          cityStateZip: 'St. Petersburg, FL 33701',
          ssnEin: '***-**-4321',
        },
        attorney: {
          name: 'Robert Vance, Esq.',
          barNumber: '0184920',
          filingDate: '2026-03-01',
          signatureDate: '2026-03-01',
          phone: '727-555-0199',
          streetAddress: '100 2nd Ave S, Suite 400',
          cityStateZip: 'St. Petersburg, FL 33701',
        },
        serviceAttorney: {
          name: 'Elena Rostova',
          barNumber: '0293841',
          signatureDate: '2026-03-01',
          phone: '727-555-0177',
          streetAddress: '100 2nd Ave S, Suite 400',
          cityStateZip: 'St. Petersburg, FL 33701',
        },
        serviceRecipients: [
          { name: 'Sarah Bennett', address: '1420 5th Ave N', cityStateZip: 'St. Petersburg, FL 33705', method: 'E-Portal' },
        ],
        scheduleA1: [
          { propertyDescription: 'Primary Residence', streetAddress: '1420 5th Ave N', cityStateZip: 'St. Petersburg, FL 33705', valuationMethod: 'Appraisal', fullAssetValue: 250000, wardPercent: 100 },
        ],
        scheduleA2: [
          { lenderName: 'Wells Fargo Home Mortgage', lenderAddress: 'PO Box 10335', lenderCityStateZip: 'Des Moines, IA 50306', relatedProperty: '1420 5th Ave N', fullDebtBalance: 45000 },
        ],
        scheduleB1: [
          { institutionName: 'Raymond James Bank', accountType: 'Checking', accountNumber: '***4821', streetAddress: '880 Carillon Pkwy', cityStateZip: 'St. Petersburg, FL 33716', fullAssetAmount: 38250 },
        ],
        scheduleB2: [
          { description: '2021 Toyota Camry', streetAddress: '1420 5th Ave N', cityStateZip: 'St. Petersburg, FL 33705', valuationMethod: 'KBB Private Party', fullAssetValue: 18500, wardPercent: 100 },
        ],
        scheduleB3: [],
        scheduleB4: [],
        scheduleC1: [
          { payerName: 'Social Security Administration', typeOfIncome: 'Retirement', paymentBasis: 'Monthly ($1,850/mo)', annualIncomeAmount: 22200 },
        ],
        scheduleC2: [],
        scheduleC3: [],
        scheduleC4: [],
        scheduleC5: [],
        scheduleNoItems: {
          b3: true,
          b4: true,
          c2: true,
          c3: true,
          c4: true,
          c5: true,
        },
      });

      if ((window as any).autoSave) (window as any).autoSave();
    });

    await page.evaluate(() => (window as any).navigate('/print'));

    // 3. Verify Electronic Signature Format banner is present
    const sigBanner = page.locator('.summary-box:has-text("Electronic Signature Format")');
    await expect(sigBanner).toBeVisible();

    const typedRadio = page.locator('input[name="signatureStyle"][value="typed"]');
    const scriptRadio = page.locator('input[name="signatureStyle"][value="script"]');
    await expect(typedRadio).toBeChecked();

    // 4. Toggle to script signature style
    await scriptRadio.check();
    await expect(scriptRadio).toBeChecked();

    // Verify DOM preview applies script signature styling
    const sigLine = page.locator('.doc-signature-line.script-signature').first();
    await expect(sigLine).toBeAttached();
    await expect(sigLine).toHaveText('/s/ Rachel M. Alvarez');

    // 5. Generate native vector PDF in browser memory and inspect raw stream
    const pdfInspection = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel } = await import('/probate-guardian/src/features/guardian-inventory/pdf-model.js');
      const { generateVerifiedInventoryPdf } = await import('/probate-guardian/src/features/guardian-inventory/pdf-engine.js');

      const model = buildVerifiedInventoryModel((window as any).D, {
        signatureStyle: 'script',
        printDate: '2026-09-03',
      });

      const doc = await generateVerifiedInventoryPdf(model);
      const rawPdfString = doc.output();
      const numPages = doc.internal.getNumberOfPages();

      return {
        rawPdfString,
        numPages,
        title: model.metadata.title,
        subject: model.metadata.subject,
        author: model.metadata.author,
        lang: model.metadata.lang,
      };
    });

    const { rawPdfString, numPages, title, subject, author, lang } = pdfInspection;

    // Verify Page Count
    expect(numPages).toBeGreaterThanOrEqual(5);

    // Strict Non-Raster Verification:
    // Raw PDF must contain genuine text stream operators (BT ... ET) and ZERO raster image wrappers
    expect(rawPdfString).toContain('BT');
    expect(rawPdfString).toContain('ET');
    expect(rawPdfString).not.toContain('/Subtype /Image');
    expect(rawPdfString).not.toContain('/Filter /DCTDecode'); // No JPEG screenshots

    // Document Metadata & Catalog Verification
    expect(title).toBe('Harold Thomas Bennett - 26-002487-GD - Printed 2026-09-03');
    expect(subject).toBe('Verified Initial Inventory');
    expect(author).toBe('Probate Guardian');
    expect(lang).toBe('en-US');
    expect(rawPdfString).toContain('Harold Thomas Bennett - 26-002487-GD - Printed 2026-09-03');
    expect(rawPdfString).toContain('Verified Initial Inventory');
    expect(rawPdfString).toContain('/Lang (en-US)');

    // Hierarchical Outline / Bookmarks Verification
    expect(rawPdfString).toContain('/Outlines');
    expect(rawPdfString).toContain('Part I - Required Information');
    expect(rawPdfString).toContain('Part II - Summary of Assets');
    expect(rawPdfString).toContain('Part III - Assets of the Ward');
    expect(rawPdfString).toContain('Schedule A-1: Real Property');
    expect(rawPdfString).toContain('Schedule A-2: Debts on Real Property');
    expect(rawPdfString).toContain('Schedule B-1: Cash & Financial Accounts');
    expect(rawPdfString).toContain('Schedule B-2: Personal Property');
    expect(rawPdfString).toContain('Schedule B-3: Intangible & Other Personal Property');
    expect(rawPdfString).toContain('Schedule B-4: Debts on Personal Property');
    expect(rawPdfString).toContain('Schedule C-1: Periodic Income');
    expect(rawPdfString).toContain('Schedule C-2: Lawsuits & Claims Against Ward');
    expect(rawPdfString).toContain('Schedule C-3: Lawsuits & Claims by Ward');
    expect(rawPdfString).toContain('Schedule C-4: Trusts');
    expect(rawPdfString).toContain('Schedule C-5: Joint / Other Property');
    expect(rawPdfString).toContain('Guardian & Preparer Attestation');
    expect(rawPdfString).toContain('Attorney Attestation');
    expect(rawPdfString).toContain('Part V - Audit Fee, Bond & Safe Deposit');
    expect(rawPdfString).toContain('Part VI - Certificate of Service');

    // Verify Schedule C-2 precedes Schedule C-3 in the bookmark stream
    const c2Pos = rawPdfString.indexOf('Schedule C-2: Lawsuits & Claims Against Ward');
    const c3Pos = rawPdfString.indexOf('Schedule C-3: Lawsuits & Claims by Ward');
    expect(c2Pos).toBeGreaterThan(0);
    expect(c3Pos).toBeGreaterThan(c2Pos);

    // Selectable /s/ Signature Text Extraction Verification
    expect(rawPdfString).toContain('/s/ Rachel M. Alvarez');
    expect(rawPdfString).toContain('/s/ Marcus Thorne');
    expect(rawPdfString).toContain('/s/ Robert Vance, Esq.');
    expect(rawPdfString).toContain('/s/ Elena Rostova');
  });
});
