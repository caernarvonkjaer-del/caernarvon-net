import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { extractPdfText, extractPdfTextItems, extractPdfTextRuns } from './support/pdf-extract';
import { installFixtureSupport, expectFileableFixture } from './support/fixture-completeness';
import {
  MINIMAL_VALID_GUARDIAN, MINIMAL_VALID_ANNUAL, MINIMAL_VALID_SIMPLIFIED, MINIMAL_VALID_PLAN_ANNUAL,
} from './support/fixtures';

test.describe('PDF Accessibility: Accounting & Inventory Filing-Specific Coverage', () => {
  test('Slice 19C: Shared accessible PDF generator produces tagged, non-raster PDF 1.7 for Simplified Accounting', async ({ page }) => {
    await freshStartNoPassword(page);
    await installFixtureSupport(page);

    const inspection = await page.evaluate(async (base) => {
      const { buildSimplifiedAccountingModel, generateCourtFormPdf } = await (window as any).loadSimplifiedPdf();

      const sampleData = (window as any).__pgBuildFixture('simplified', base, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        ssn: '***-**-1234',
        // Accounts for 2025, so the guardianship began before it.
        gid: '2024-06-01',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Eleanor Vance Bennett',
        attorney: 'Marcus Sterling, Esq.',
        typeOfGuardianship: 'Plenary',
        startingBalance: 250000,
        interestIncome: 4250.50,
        depositsSettlement: 15000,
        serviceCharges: 120,
        federalIncomeTax: 1850,
        guardians: [
          {
            name: 'Eleanor Vance Bennett',
            ssn: '***-**-6789',
            phone: '(727) 555-0199',
            email: 'eleanor.bennett@example.com',
            mailingStreet: '1204 Harbor View Drive',
            mailingCityStateZip: 'Dunedin, FL 34698',
            residenceStreet: '1204 Harbor View Drive',
            residenceCityStateZip: 'Dunedin, FL 34698',
            signatureDate: '2026-03-01',
          },
        ],
        attorney_barNumber: '1029384',
        attorney_phone: '(727) 555-0100',
        attorney_street: '100 N Belcher Rd, Suite 300',
        attorney_cityStateZip: 'Clearwater, FL 33765',
        attorney_signatureDate: '2026-03-01',
        certServiceDate: '2026-03-01',
        certAttySignDate: '2026-03-01',
        certAttyBarNumber: '1029384',
        certAttyPhone: '(727) 555-0100',
        certAttyStreet: '100 N Belcher Rd, Suite 300',
        certAttyCityStateZip: 'Clearwater, FL 33765',
        certIndicator: 'Hand-delivered via process server',
        certRecipients: [
          {
            name: 'Clerk of the Circuit Court — Probate Division',
            line2: '315 Court Street',
            line3: 'Clearwater, FL 33756',
          },
        ],
        remuneration: [
          {
            guardian: 'Eleanor Vance Bennett',
            type: 'Guardian Fee',
            description: 'Statutory guardian fee approved per court order dated 06/15/2025',
          },
        ],
      });

      const model = buildSimplifiedAccountingModel(sampleData, {
        signatureStyle: 'typed',
        printDate: '2026-03-01',
      });

      const doc = await generateCourtFormPdf(model);
      const rawPdfString = doc.output();
      const numPages = doc.internal.getNumberOfPages();

      // Check structure tree elements
      const tableMatches = [...rawPdfString.matchAll(/\/Type \/StructElem[\s\S]*?\/S \/Table[\s\S]*?>>/g)].map(m => m[0]);
      const tableAttrSummaryMatches = [...rawPdfString.matchAll(/\/A\s*<<[\s\S]*?\/O\s*\/Table[\s\S]*?\/Summary\s*\(([^)]+)\)[\s\S]*?>>/g)].map(m => m[1]);
      const straySummaryMatches = tableMatches.filter(tbl => !tbl.includes('/A <<') && tbl.includes('/Summary'));

      // Check for raster images (must be 0 - pure vector/text document)
      const imageMatches = [...rawPdfString.matchAll(/\/Subtype \/Image/g)].map(m => m[0]);
      const dctMatches = [...rawPdfString.matchAll(/\/DCTDecode/g)].map(m => m[0]);

      // Check for headings and signature parts
      const h1Matches = [...rawPdfString.matchAll(/\/S \/H1/g)].map(m => m[0]);
      const sigPartMatches = [...rawPdfString.matchAll(/\/T \(Signature: [^)]+\)/g)].map(m => m[0]);

      return {
        rawPdfString,
        numPages,
        tableCount: tableMatches.length,
        tableAttrSummaryMatches,
        straySummaryCount: straySummaryMatches.length,
        imageCount: imageMatches.length,
        dctCount: dctMatches.length,
        h1Count: h1Matches.length,
        sigPartCount: sigPartMatches.length,
        sectionTitles: model.sections.map(s => s.title),
        fixtureIssues: await (window as any).__pgFixtureIssues(sampleData),
      };
    }, MINIMAL_VALID_SIMPLIFIED);

    expectFileableFixture(inspection.fixtureIssues, "19C's Simplified Accounting fixture");

    const {
      rawPdfString,
      numPages,
      tableCount,
      tableAttrSummaryMatches,
      straySummaryCount,
      imageCount,
      dctCount,
      h1Count,
      sigPartCount,
      sectionTitles,
    } = inspection;

    // 1. PDF Standard Header: Must be %PDF-1.7
    expect(rawPdfString.startsWith('%PDF-1.7')).toBe(true);

    // 2. Tagged PDF Catalog & Structure Root
    expect(rawPdfString).toContain('/MarkInfo << /Marked true >>');
    expect(rawPdfString).toContain('/Type /StructTreeRoot');
    expect(rawPdfString).toContain('/Tabs /S');
    expect(rawPdfString).toContain('/ViewerPreferences');
    expect(rawPdfString).toContain('/DisplayDocTitle true');
    expect(rawPdfString).toContain('/Lang (en-US)');

    // 3. Multi-page form: Parts I through VII render across pages
    expect(numPages).toBeGreaterThanOrEqual(3);

    // 4. Pure vector and text: Absolutely NO raster screenshots or DCTDecode images
    expect(imageCount).toBe(0);
    expect(dctCount).toBe(0);

    // 5. Structure Elements: Headings and Signatures as Structured Parts
    expect(h1Count).toBeGreaterThanOrEqual(6);
    expect(sigPartCount).toBeGreaterThanOrEqual(2); // Guardian and Attorney signatures

    // 6. Table Semantics: All tables have /Summary inside /A << /O /Table >> dictionary with 0 stray keys
    expect(tableCount).toBeGreaterThanOrEqual(3); // Case Info grid, Accounting Summary, Remuneration
    expect(tableAttrSummaryMatches.length).toBe(tableCount);
    expect(straySummaryCount).toBe(0);

    // 7. Running Footer & Form Metadata Integrity
    const extractedText19C = await extractPdfText(rawPdfString);
    expect(extractedText19C).toContain('Simplified Annual Accounting');
    expect(extractedText19C).toContain('Harold Thomas Bennett');
    expect(rawPdfString).toContain('/Keywords (Florida, Probate, Guardianship, Simplified Annual Accounting)');

    // 8. Dropped Field Guard: certIndicator must render in Certificate of Service
    expect(extractedText19C).toContain('Hand-delivered via process server');

    // 9. Verify all sections present in model (with separate Part III and Part IV)
    expect(sectionTitles).toContain('Part I — REQUIRED INFORMATION');
    expect(sectionTitles).toContain('Part II — ACCOUNTING SUMMARY AND REMAINING ASSETS ON HAND');
    expect(sectionTitles).toContain('Part III — GUARDIAN(S) DECLARATION');
    expect(sectionTitles).toContain('Part IV — GUARDIAN(S) INFORMATION');
    expect(sectionTitles).toContain('Part V — SIGNATURE OF GUARDIAN ATTORNEY');
    expect(sectionTitles).toContain('Part VI — GUARDIAN ATTORNEY CERTIFICATE OF SERVICE');
    expect(sectionTitles).toContain('Part VII — GUARDIAN(S) DECLARATION OF REMUNERATION');
  });

  test('Slice 19E: Shared accessible PDF generator produces tagged PDF 1.7 for Annual Guardianship Accounting', async ({ page }) => {
    await freshStartNoPassword(page);
    await installFixtureSupport(page);

    const inspection = await page.evaluate(async (base) => {
      const { buildAnnualAccountingModel, generateCourtFormPdf } = await (window as any).loadAnnualPdf();

      const sampleAnnualData = (window as any).__pgBuildFixture('annual', base, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Rachel M. Alvarez',
        attorney: 'Robert Vance, Esq.',
        typeOfGuardianship: 'Plenary',
        filingType: 'Annual Accounting',
        amendedForm: 'No', // the form's answer is Yes/No; `false` reads as unanswered
        startingBalance: 125000,
        guardians: [
          { name: 'Rachel M. Alvarez', signatureDate: '2026-03-01', phone: '727-555-0144', ssn: '***-**-1234', mailingStreet: '1420 5th Ave N', mailingCityStateZip: 'St. Petersburg, FL 33705' }
        ],
        preparer: { name: 'Marcus Thorne', signatureDate: '2026-03-01', phone: '727-555-0188', ssn: '***-**-5678', street: '500 Central Ave', cityStateZip: 'St. Petersburg, FL 33701' },
        attorney_barNumber: '0184920',
        attorney_signatureDate: '2026-03-01',
        attorney_street: '100 2nd Ave S',
        attorney_cityStateZip: 'St. Petersburg, FL 33701',
        schA: [
          { payer: 'Social Security', description: 'Monthly Benefit', bank: 'Chase', accountNo: '***1234', amount: 24000 },
          { payer: 'Florida Pension', description: 'Retirement Annuity', bank: 'Chase', accountNo: '***1234', amount: 18000 }
        ],
        schB1: [
          { bankAcct: 'Chase ***1234', checkNo: '101', periodFrom: '2025-01-01', periodTo: '2025-06-30', datePaid: '2025-07-15', payee: 'Robert Vance, Esq.', courtOrderDate: '2025-07-01', amount: 3500 }
        ],
        schB2: [
          { bankAcct: 'Chase ***1234', checkNo: '102', periodFrom: '2025-01-01', periodTo: '2025-12-31', datePaid: '2026-01-10', payee: 'Rachel M. Alvarez', courtOrderDate: '2026-01-05', amount: 2400 }
        ],
        schB3: [
          { bankAcct: 'Chase ***1234', checkNo: '103', datePaid: '2025-04-10', payee: 'Care Assessment Team', courtOrderDate: '2025-04-01', amount: 1200 }
        ],
        schB4: [
          { checkNo: '104', datePaid: '2025-02-15', category: 'Medical / Pharmacy', payee: 'Walgreens', amount: 450 },
          { checkNo: '105', datePaid: '2025-03-20', category: 'Utilities', payee: 'Duke Energy', amount: 280 }
        ],
        schC: [
          { description: 'Sale of old vehicle', date: '2025-05-12', gain: 1500, loss: 0 }
        ],
        schD1: [
          { description: 'Checking Account', accountNo: '***1234', restricted: 'No', type: 'Checking', fullAmount: 42000, wardPct: 100 }
        ],
        schD2: [
          { description: '1420 5th Ave N, St. Petersburg', residence: 'Yes', income: 'No', fullValue: 285000, wardPct: 100, carryingValue: 285000 }
        ],
        schD3: [
          { description: 'Household furnishings', fullAmount: 15000, wardPct: 100, carryingValue: 15000 }
        ],
        schD4: [
          { description: 'Vanguard Index Fund', restricted: 'No', fullAmount: 65000, wardPct: 100, carryingValue: 65000 }
        ],
        schD5: [
          { description: 'Mortgage - Wells Fargo', loanNo: '***9876', loanType: 'First Mortgage', fullDebt: 45000, wardPct: 100 }
        ],
        schE: [
          { bankName: 'Chase to Vanguard', transferInDate: '2025-08-01', transferInAmt: 10000, transferOutDate: '2025-08-01', transferOutAmt: 10000 }
        ],
        schF1: [
          { description: 'Vacant Lot', bank: 'Title Co', accountNo: '***5555', courtOrderDate: '2025-09-15', salePrice: 35000 }
        ],
        schF2: [],
        trusts: [
          { hasTrust: 'Yes', name: 'Bennett Family Revocable Trust', trustee: 'Rachel M. Alvarez', accountNo: '***7777', createdAfterGID: 'No', wardPct: 100, wardAmount: 50000 }
        ],
        guardianRelationship: 'Daughter',
        // This filing carries a depository receipt date, so the Part IX
        // question it answers is 'Yes' -- the base answers 'No', which would
        // have the filing deny a depository and then produce its receipt.
        restrictedDepository: 'Yes',
        restrictedDepositoryReceiptDate: '2025-02-01',
        reconcileExplanation: 'Discrepancy due to late bank adjustment on vehicle proceeds.',
        attorney_bar: '0184920',
        bondAmount: 75000,
        bondingCompany: 'Travelers Casualty and Surety',
        bondPeriodFrom: '2025-01-01',
        bondPeriodTo: '2025-12-31',
        certRecipients: [
          { name: 'Clerk of Court', line2: '315 Court St', line3: 'Clearwater, FL 33756', line4: 'Room 100' }
        ],
        certDate: '2026-03-01',
        certIndicator: 'E-Portal / Florida Courts E-Filing',
        certAttySignDate: '2026-03-01',
        remuneration: [
          { guardian: 'Rachel M. Alvarez', type: 'Guardian Fee', description: 'Statutory care compensation', amount: 2400 }
        ],
      });

      const model = buildAnnualAccountingModel(sampleAnnualData, {
        signatureStyle: 'typed',
        printDate: '2026-09-03',
      });

      const doc = await generateCourtFormPdf(model);
      const rawPdf = doc.output();

      // Pre-map all objects by ID
      const objMap = new Map();
      const objHeaderRegex = /(?:^|\r|\n)(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
      let objMatch;
      while ((objMatch = objHeaderRegex.exec(rawPdf)) !== null) {
        objMap.set(objMatch[1], objMatch[2]);
      }

      // Table regularity analysis
      const structMatches = [...rawPdf.matchAll(/<<[\s\S]*?\/Type\s*\/StructElem[\s\S]*?>>/g)];
      const tableRows: { [k: string]: number[] } = {};

      for (const sm of structMatches) {
        const text = sm[0];
        if (/\/S\s*\/TR\b/.test(text)) {
          const parentMatch = text.match(/\/P\s+(\d+\s+\d+\s+R)/);
          const parentId = parentMatch ? parentMatch[1] : 'unknown';
          if (!tableRows[parentId]) tableRows[parentId] = [];

          let cellCount = 0;
          const kMatch = text.match(/\/K\s*\[([\s\S]*?)\]/);
          if (kMatch) {
            const children = kMatch[1].trim().split(/\s*R\s*/).filter(Boolean);
            for (const childRef of children) {
              const objNum = childRef.split(/\s+/)[0];
              const cellContent = objMap.get(objNum) || '';
              const colSpanMatch = cellContent.match(/\/ColSpan\s+(\d+)/);
              cellCount += colSpanMatch ? parseInt(colSpanMatch[1], 10) : 1;
            }
          }
          tableRows[parentId].push(cellCount);
        }
      }

      let irregularTables = 0;
      for (const [tableId, rowCounts] of Object.entries(tableRows)) {
        const expected = rowCounts[0];
        if (!rowCounts.every(c => c === expected)) irregularTables++;
      }

      // Xref audit for Annual Accounting
      const startxrefMatch = rawPdf.match(/startxref\s+(\d+)\s+%%EOF/);
      const declaredStartxref = parseInt(startxrefMatch ? startxrefMatch[1] : '-1', 10);
      const startxrefPointsToXref = rawPdf.slice(declaredStartxref, declaredStartxref + 4) === 'xref';

      const trailerIndex = rawPdf.indexOf('trailer', declaredStartxref);
      const xrefSection = rawPdf.slice(declaredStartxref, trailerIndex);
      const xrefLines = xrefSection.split(/\r?\n/).filter(l => /^\d{10}\s+\d{5}\s+[nf]/.test(l.trim()));
      let totalObjectsInXref = 0;
      let validOffsets = 0;

      for (let i = 1; i < xrefLines.length; i++) {
        const [offsetStr, gen, status] = xrefLines[i].trim().split(/\s+/);
        totalObjectsInXref++;
        if (status === 'n') {
          const offset = parseInt(offsetStr, 10);
          const snippet = rawPdf.slice(offset, offset + 30);
          if (new RegExp(`^${i}\\s+0\\s+obj`).test(snippet)) {
            validOffsets++;
          }
        }
      }

      // Content stream audit for untagged text
      const streamMatches = [...rawPdf.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
      let totalTextOperators = 0;
      let untaggedTextOperators = 0;

      for (const sm of streamMatches) {
        const content = sm[1];
        if (content.includes('<?xpacket')) continue;
        const tokens = content.split(/\s+/);
        let mcDepth = 0;
        let inText = false;
        for (let t = 0; t < tokens.length; t++) {
          const tok = tokens[t];
          if (tok === 'BDC' || tok === 'BMC') {
            mcDepth++;
          } else if (tok === 'EMC') {
            mcDepth = Math.max(0, mcDepth - 1);
          } else if (tok === 'BT') {
            inText = true;
          } else if (tok === 'ET') {
            inText = false;
          } else if (inText && (tok === 'Tj' || tok === 'TJ' || tok === "'" || tok === '"')) {
            totalTextOperators++;
            if (mcDepth === 0) untaggedTextOperators++;
          }
        }
      }

      return {
        rawPdfLength: rawPdf.length,
        rawPdfString: rawPdf,
        irregularTables,
        totalTables: Object.keys(tableRows).length,
        sectionTitles: model.sections.map((s: any) => s.title),
        startxrefPointsToXref,
        totalObjectsInXref,
        validOffsets,
        totalTextOperators,
        untaggedTextOperators,
        fixtureIssues: await (window as any).__pgFixtureIssues(sampleAnnualData),
      };
    }, MINIMAL_VALID_ANNUAL);

    expectFileableFixture(inspection.fixtureIssues, "19E's Annual Accounting fixture");

    // Assertions
    expect(inspection.rawPdfString.startsWith('%PDF-1.7')).toBe(true);
    expect(inspection.rawPdfString).toContain('/StructTreeRoot');
    expect(inspection.rawPdfString).toContain('/ParentTree');
    expect(inspection.rawPdfString).toContain('/Tabs /S');
    expect(inspection.rawPdfString).toContain('/ViewerPreferences');
    expect(inspection.rawPdfString).toContain('/DisplayDocTitle true');
    expect(inspection.rawPdfString).toContain('/Keywords (Florida, Probate, Guardianship, Annual Accounting)');
    expect(inspection.rawPdfString).not.toContain('/Subtype /Image');

    // Table regularity: all tables have uniform row widths
    expect(inspection.totalTables).toBeGreaterThanOrEqual(10);
    expect(inspection.irregularTables).toBe(0);

    // Xref integrity
    expect(inspection.startxrefPointsToXref).toBe(true);
    expect(inspection.validOffsets).toBe(inspection.totalObjectsInXref);
    expect(inspection.totalObjectsInXref).toBeGreaterThan(100);

    // Stream audit: 100% tagged text operators
    expect(inspection.totalTextOperators).toBeGreaterThan(100);
    expect(inspection.untaggedTextOperators).toBe(0);

    // Section outline coverage
    expect(inspection.sectionTitles).toContain('Part I — REQUIRED INFORMATION');
    expect(inspection.sectionTitles).toContain('Part II — GUARDIAN CERTIFICATION & AUDIT FEE');
    expect(inspection.sectionTitles).toContain('Part VI — CHANGES IN NET ASSETS');
    expect(inspection.sectionTitles).toContain('Part VII — ASSETS & LIABILITIES AT END OF PERIOD');
    expect(inspection.sectionTitles).toContain('SCHEDULE A: Income Received During Period');
    expect(inspection.sectionTitles).toContain('SCHEDULE B-1: Attorney Fees and Costs');
    expect(inspection.sectionTitles).toContain('SCHEDULE B-4: All Other Disbursements');
    expect(inspection.sectionTitles).toContain('SCHEDULE C: Capital Adjustments During Period');
    expect(inspection.sectionTitles).toContain('SCHEDULE D-1: Cash Assets');
    expect(inspection.sectionTitles).toContain('Part VIII — TRUST INFORMATION');
    expect(inspection.sectionTitles).toContain('Part IX — OTHER INFORMATION & BOND CALCULATION');
    expect(inspection.sectionTitles).toContain('Part X — GUARDIAN ATTORNEY CERTIFICATE OF SERVICE');
    expect(inspection.sectionTitles).toContain('Part XI — GUARDIAN(S) DECLARATION OF REMUNERATION');

    // 1. Reconciliation Explanation Fidelity: Guardian's exact explanation printed, zero fabricated text
    const extractedText19E = await extractPdfText(inspection.rawPdfString);
    expect(extractedText19E).toContain('Discrepancy due to late bank adjustment on vehicle proceeds.');
    expect(extractedText19E).not.toContain('Difference noted on file; pending review.');

    // 2. Attorney Bar & Bond Policy Details Fidelity
    expect(extractedText19E).toContain('0184920');
    expect(extractedText19E).toContain('Travelers Casualty and Surety');
    expect(extractedText19E).toContain('$75,000.00');

    // 3. Certificate of Service & Remuneration Content Fidelity
    expect(extractedText19E).toContain('E-Portal / Florida Courts E-Filing');
    expect(extractedText19E).toContain('315 Court St');
    expect(extractedText19E).toContain('Statutory care compensation');
  });

  test('Slice 19E: Architectural single source of truth for statutory math and preview-to-PDF drift guard', async ({ page }) => {
    await freshStartNoPassword(page);
    await installFixtureSupport(page);

    const driftGuardResults = await page.evaluate(async (base) => {
      // 1. Verify single source of truth: window.calcTotalsAnnual must exist BEFORE loadAnnualPdf
      const fnBefore = (window as any).calcTotalsAnnual;
      const fnBeforeStr = typeof fnBefore === 'function' ? fnBefore.toString() : '';

      // 2. Load PDF module
      const { buildAnnualAccountingModel, generateCourtFormPdf } = await (window as any).loadAnnualPdf();

      const fnAfter = (window as any).calcTotalsAnnual;
      const fnAfterStr = typeof fnAfter === 'function' ? fnAfter.toString() : '';

      // Check whether global was swapped or remained identical
      const globalSwapped = fnBeforeStr !== fnAfterStr;

      // 3. Distinct Sentinel Data for Preview/PDF Drift Guard.
      //
      // Sentinel here means distinctive, not incomplete: every DRIFT_GUARD_*
      // value is content chosen so it cannot be confused with anything the
      // renderer might supply itself. So this is a complete filing too, built
      // on the shared base like the rest -- a drift guard whose own document
      // could not be filed would be guarding the wrong thing.
      const sentinelData = (window as any).__pgBuildFixture('annual', base, {
        wardName: 'Arthur Pendragon',
        caseNumber: '52-2026-GD-009988',
        county: 'Pinellas',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Gawain Knight',
        attorney: 'Merlin Ambrosius, Esq.',
        typeOfGuardianship: 'Plenary',
        filingType: 'Annual Accounting',
        amendedForm: 'No', // the form's answer is Yes/No; `false` reads as unanswered
        startingBalance: 100000,
        reconcileExplanation: 'DRIFT_GUARD_RECONCILE_EXPLANATION_VERBATIM',
        attorney_bar: 'BAR-SENTINEL-998877',
        attorney_phone: '(555) 019-2834',
        attorney_street: '777 Camelot Way',
        attorney_cityStateZip: 'Avalon, FL 33000',
        attorney_signatureDate: '2026-03-01',
        guardians: [
          { name: 'Gawain Knight', signatureDate: '2026-03-01', phone: '555-0199', ssn: '***-**-1111', mailingStreet: '1 Round Table Rd', mailingCityStateZip: 'Camelot, FL 33000' }
        ],
        preparer: { name: 'Kay Seneschal', signatureDate: '2026-03-01', phone: '555-0188', ssn: '***-**-2222', street: '2 Court Way', cityStateZip: 'Camelot, FL 33000' },
        bondAmount: 88888,
        bondingCompany: 'DRIFT_GUARD_BONDING_CO_SENTINEL',
        bondPeriodFrom: '2025-01-01',
        bondPeriodTo: '2025-12-31',
        certRecipients: [
          { name: 'DRIFT_GUARD_RECIPIENT_NAME', line2: 'DRIFT_GUARD_ADDR_LINE2', line3: 'Clearwater, FL 33756', line4: '' }
        ],
        certDate: '2026-03-01',
        certIndicator: 'DRIFT_GUARD_PORTAL_INDICATOR',
        certAttySignDate: '2026-03-01',
        remuneration: [
          { guardian: 'Gawain Knight', type: 'Statutory Fee', description: 'DRIFT_GUARD_REMUNERATION_DESC', amount: 3333 }
        ],
        schA: [{ payer: 'Kingdom Pension', description: 'Monthly Pension', bank: 'Crown Bank', accountNo: '***1111', amount: 12000 }],
        schB1: [],
        schB2: [],
        schB3: [],
        schB4: [],
        schC: [],
        schD1: [{ description: 'Checking Account', accountNo: '***1111', restricted: 'No', type: 'Checking', fullAmount: 50000, wardPct: 100 }],
        schD2: [],
        schD3: [],
        schD4: [],
        schD5: [],
        schE: [],
        schF1: [],
        schF2: [],
        trusts: [{ hasTrust: 'No' }],
      });

      // Set global D for preview module
      (window as any).D = sentinelData;

      // Compute math via canonical calcTotalsAnnual
      const computedTotals = (window as any).calcTotalsAnnual(sentinelData);
      const computedReconcile = (window as any).annualReconcileState(computedTotals, sentinelData);

      // Generate accessible PDF model & document
      const model = buildAnnualAccountingModel(sentinelData, {
        signatureStyle: 'typed',
        printDate: '2026-09-03',
      });
      const doc = await generateCourtFormPdf(model);
      const rawPdfString = doc.output();

      return {
        rawPdfString,
        hasCalcTotalsBefore: typeof fnBefore === 'function',
        hasCalcTotalsAfter: typeof fnAfter === 'function',
        globalSwapped,
        isOutOfBalance: computedReconcile.outOfBalance,
        fixtureIssues: await (window as any).__pgFixtureIssues(sentinelData),
      };
    }, MINIMAL_VALID_ANNUAL);

    expectFileableFixture(driftGuardResults.fixtureIssues, "the drift guard's sentinel filing");

    // Architecture: Single source of truth was eager, never swapped
    expect(driftGuardResults.hasCalcTotalsBefore).toBe(true);
    expect(driftGuardResults.hasCalcTotalsAfter).toBe(true);
    expect(driftGuardResults.globalSwapped).toBe(false);

    // Form logic: Out of balance difference triggered explanation
    expect(driftGuardResults.isOutOfBalance).toBe(true);

    // Drift guard: Zero dropped fields between data model, preview, and PDF
    const extractedDriftText = await extractPdfText(driftGuardResults.rawPdfString);
    const checkSentinel = (str: string) => extractedDriftText.includes(str);
    expect(checkSentinel('DRIFT_GUARD_RECONCILE_EXPLANATION_VERBATIM')).toBe(true);
    expect(extractedDriftText.includes('Difference noted on file; pending review.')).toBe(false);
    expect(checkSentinel('BAR-SENTINEL-998877')).toBe(true);
    expect(checkSentinel('DRIFT_GUARD_BONDING_CO_SENTINEL')).toBe(true);
    expect(checkSentinel('$88,888.00')).toBe(true);
    expect(checkSentinel('DRIFT_GUARD_RECIPIENT_NAME')).toBe(true);
    expect(checkSentinel('DRIFT_GUARD_ADDR_LINE2')).toBe(true);
    expect(checkSentinel('DRIFT_GUARD_PORTAL_INDICATOR')).toBe(true);
    expect(checkSentinel('DRIFT_GUARD_REMUNERATION_DESC')).toBe(true);
  });

  test('Milestone 20 / axesCheck: Harold Thomas Bennett Initial Inventory PDF/UA-1 and WCAG 2.1 AA verification', async ({ page }) => {
    await freshStartNoPassword(page);
    await installFixtureSupport(page);

    const inspection = await page.evaluate(async (base) => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();

      const d = (window as any).__pgBuildFixture('guardian', base, {
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
          { payerName: 'Social Security Administration', payerAddress: '1 Lemon St, Clearwater, FL 33756', typeOfIncome: 'Retirement', paymentBasis: 'Monthly ($1,850/mo)', annualIncomeAmount: 22200 },
        ],
        scheduleC2: [],
        scheduleC3: [],
        scheduleC4: [],
        scheduleC5: [],
        // The populated schedules' "no items" boxes come off; the rest stay
        // ticked, as the base has them.
        scheduleNoItems: {
          a1: false,
          a2: false,
          b1: false,
          b2: false,
          c1: false,
        },
      });

      const model = buildVerifiedInventoryModel(d, {
        signatureStyle: 'typed',
        printDate: '2026-09-05',
      });

      const doc = await generateVerifiedInventoryPdf(model);
      const rawPdfString = doc.output();
      const numPages = doc.internal.getNumberOfPages();

      // Check ParentTree
      const parentTreeMatch = rawPdfString.match(/\/ParentTree\s+(\d+)\s+0\s+R/);
      const parentTreeId = parentTreeMatch ? parentTreeMatch[1] : null;
      const parentTreeObjMatch = rawPdfString.match(new RegExp(`${parentTreeId}\\s+0\\s+obj\\s*<<[\\s\\S]*?>>\\s*endobj`));
      const parentTreeObj = parentTreeObjMatch ? parentTreeObjMatch[0] : '';

      // Check Catalog ViewerPreferences
      const catalogMatch = rawPdfString.match(/\d+ 0 obj\s*<<[\s\S]*?\/Type \/Catalog[\s\S]*?>>\s*endobj/);
      const catalogObj = catalogMatch ? catalogMatch[0] : '';
      const viewerPrefMatches = catalogObj.match(/\/ViewerPreferences/g) || [];

      // Check XMP begin packet
      const xmpBeginMatch = rawPdfString.match(/<\?xpacket begin="([^"]*)"/);
      const xmpBeginValue = xmpBeginMatch ? xmpBeginMatch[1] : null;

      // Check StructElems: ensure no Figure for signatures
      const figureStructElems = [...rawPdfString.matchAll(/\/Type \/StructElem[\s\S]*?\/S \/Figure/g)].map(m => m[0]);

      // Check for redundant ColSpan 1
      const redundantColSpans = [...rawPdfString.matchAll(/\/ColSpan\s+1\b/g)].map(m => m[0]);
      const redundantRowSpans = [...rawPdfString.matchAll(/\/RowSpan\s+1\b/g)].map(m => m[0]);

      // Check heading hierarchy for skips
      const headingLevels = [...rawPdfString.matchAll(/\/S \/(H[1-6])/g)].map(m => parseInt(m[1].slice(1), 10));

      return {
        rawPdfString,
        numPages,
        parentTreeObj,
        catalogObj,
        viewerPrefMatchesCount: viewerPrefMatches.length,
        xmpBeginValue,
        figureStructElemsCount: figureStructElems.length,
        redundantColSpansCount: redundantColSpans.length,
        redundantRowSpansCount: redundantRowSpans.length,
        headingLevels,
        fixtureIssues: await (window as any).__pgFixtureIssues(d),
      };
    }, MINIMAL_VALID_GUARDIAN);

    expectFileableFixture(inspection.fixtureIssues, "the Milestone 20 Initial Inventory fixture");

    // Assertions
    // 1. All pages are present in ParentTree /Nums
    for (let p = 0; p < inspection.numPages; p++) {
      expect(inspection.parentTreeObj).toContain(`${p} [`);
    }

    // 2. ViewerPreferences is present exactly once in Catalog
    expect(inspection.viewerPrefMatchesCount).toBe(1);
    expect(inspection.catalogObj).toContain('/DisplayDocTitle true');

    // 3. XMP packet uses ASCII begin="" (no corrupted BOM)
    expect(inspection.xmpBeginValue).toBe('');

    // 4. Zero Figure tags for signature blocks
    expect(inspection.figureStructElemsCount).toBe(0);

    // 5. Zero redundant ColSpan: 1 or RowSpan: 1
    expect(inspection.redundantColSpansCount).toBe(0);
    expect(inspection.redundantRowSpansCount).toBe(0);

    // 6. Zero skipped heading levels
    let prev = 0;
    for (const lvl of inspection.headingLevels) {
      if (prev > 0) {
        expect(lvl).toBeLessThanOrEqual(prev + 1);
      }
      prev = lvl;
    }
  });

  test('Milestone 21: Court Pleading Header (Page 1), Dynamic Circuit Lookup, 1-Inch Margins, /s/ Format Sliders & Rule 2.515 Attorney Emails', async ({ page }) => {
    await freshStartNoPassword(page);
    await installFixtureSupport(page);

    const result = await page.evaluate(async ([guardianBase, planBase]) => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();
      const { generateCourtFormPdf } = await (window as any).loadSimplifiedPdf();
      const { buildPlanAnnualModel } = await (window as any).loadPlanAnnualPdf();
      const build = (window as any).__pgBuildFixture;

      // Test 1: Verified Initial Inventory with Electronic /s/ signature (default) in Miami-Dade County (11th Circuit)
      const d1 = build('guardian', guardianBase, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Miami-Dade',
        gid: '2026-01-15',
        typeOfGuardianship: 'Plenary',
        guardianName: 'Rachel M. Alvarez',
        attorneyForGuardian: 'Robert Vance, Esq.',
        guardians: [{ name: 'Rachel M. Alvarez', signatureDate: '2026-02-28', useSlashS: true, phone: '305-555-0144' }],
        preparer: { name: 'Marcus Thorne', signatureDate: '2026-02-28', useSlashS: true, phone: '305-555-0188' },
        attorney: {
          name: 'Robert Vance, Esq.',
          barNumber: '0184920',
          signatureDate: '2026-03-01',
          useSlashS: true,
          email: 'robert@vancelaw.com',
          secondaryEmail: 'service@vancelaw.com',
          phone: '305-555-0199',
        },
      });

      const m1 = buildVerifiedInventoryModel(d1, { printDate: '2026-09-05' });
      const doc1 = await generateVerifiedInventoryPdf(m1);
      const rawPdf1 = doc1.output();

      // Test 2: Verified Initial Inventory with Wet-ink signature (useSlashS: false) in Pinellas County (6th Circuit)
      const d2 = build('guardian', guardianBase, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        gid: '2026-01-15',
        typeOfGuardianship: 'Plenary',
        guardians: [{ name: 'Rachel M. Alvarez', signatureDate: '2026-02-28', useSlashS: false, phone: '727-555-0144' }],
        preparer: { name: 'Marcus Thorne', signatureDate: '2026-02-28', useSlashS: false, phone: '727-555-0188' },
        attorney: {
          name: 'Robert Vance, Esq.',
          barNumber: '0184920',
          signatureDate: '2026-03-01',
          useSlashS: false,
          email: 'robert@vancelaw.com',
          phone: '727-555-0199',
        },
      });

      const m2 = buildVerifiedInventoryModel(d2, { printDate: '2026-09-05' });
      const doc2 = await generateVerifiedInventoryPdf(m2);
      const rawPdf2 = doc2.output();

      // Test 3: Annual Plan with Minor variant
      const d3 = build('planAnnual', planBase, (window as any).__pgPlanDefaults(), {
        wardName: 'Tommy Pickles',
        caseNumber: '26-001122-GD',
        county: 'Hillsborough',
        guardian: 'Didi Pickles',
        attorney: 'Dil Pickles, Esq.',
        attorney_bar: '9988776',
        attorney_email: 'dil@law.com',
        attorney_secondary_email: 'filings@law.com',
        attorney_useSlashS: true,
        // The plan is signed after the period it reports on closes; the base's
        // period runs to the end of 2026, so this signature follows it.
        planGuardians: [{ name: 'Didi Pickles', signatureDate: '2027-01-05', useSlashS: true }],
      });
      const m3 = buildPlanAnnualModel(d3);
      m3.metadata.wardType = 'minor';
      const doc3 = await generateCourtFormPdf(m3);
      const rawPdf3 = doc3.output();

      return {
        rawPdf1,
        rawPdf2,
        rawPdf3,
        numPages1: doc1.internal.getNumberOfPages(),
        numPages2: doc2.internal.getNumberOfPages(),
        numPages3: doc3.internal.getNumberOfPages(),
        issues1: await (window as any).__pgFixtureIssues(d1),
        issues2: await (window as any).__pgFixtureIssues(d2),
        issues3: await (window as any).__pgFixtureIssues(d3),
      };
    }, [MINIMAL_VALID_GUARDIAN, MINIMAL_VALID_PLAN_ANNUAL]);

    expectFileableFixture(result.issues1, "the /s/ electronic-signature Initial Inventory");
    expectFileableFixture(result.issues2, "the wet-ink Initial Inventory");
    expectFileableFixture(result.issues3, "the minor-ward Annual Plan");

    const { rawPdf1, rawPdf2, rawPdf3, numPages1, numPages2, numPages3 } = result;

    // Test 1 Assertions (Miami-Dade / 11th Circuit, /s/ electronic signature, Rule 2.515 attorney emails)
    const text1 = await extractPdfText(rawPdf1);
    expect(text1).toContain('IN THE CIRCUIT COURT OF THE ELEVENTH JUDICIAL CIRCUIT');
    expect(text1).toContain('IN AND FOR MIAMI-DADE COUNTY, FLORIDA');
    expect(text1).toContain('PROBATE DIVISION');
    expect(text1).toContain('CASE #: 26-002487-GD');
    expect(text1).toContain('IN RE: THE GUARDIANSHIP OF');
    expect(text1).toContain('HAROLD THOMAS BENNETT');
    expect(text1).toContain('VERIFIED INITIAL INVENTORY');
    // Electronic signature with /s/ format and citation
    expect(text1).toContain('/s/ Rachel M. Alvarez');
    expect(text1).toContain('pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515');
    // Attorney primary and secondary email
    expect(text1).toContain('Primary Email');
    expect(text1).toContain('robert@vancelaw.com');
    expect(text1).toContain('Secondary Email');
    expect(text1).toContain('service@vancelaw.com');
    const partThreeIndex = text1.indexOf('Part III — ASSETS OF THE WARD');
    const scheduleA1Index = text1.indexOf('Schedule A-1: Real Property Assets');
    expect(partThreeIndex).toBeGreaterThan(-1);
    expect(scheduleA1Index).toBeGreaterThan(partThreeIndex);
    // Layout underline artifact tagged
    expect(rawPdf1).toContain('/Artifact << /Type /Layout >> BDC');

    // Test 2 Assertions (Pinellas / 6th Circuit, wet signature / slider OFF)
    const text2 = await extractPdfText(rawPdf2);
    expect(text2).toContain('IN THE CIRCUIT COURT OF THE SIXTH JUDICIAL CIRCUIT');
    expect(text2).toContain('IN AND FOR PINELLAS COUNTY, FLORIDA');
    // Wet signature does NOT contain electronic /s/ legal citation
    expect(text2).not.toContain('pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515 / F.S. 744.367');
    expect(text2).toContain('Signature');

    // Test 3 Assertions (Hillsborough / 13th Circuit, Minor caption)
    const text3 = await extractPdfText(rawPdf3);
    expect(text3).toContain('IN THE CIRCUIT COURT OF THE THIRTEENTH JUDICIAL CIRCUIT');
    expect(text3).toContain('IN AND FOR HILLSBOROUGH COUNTY, FLORIDA');
    expect(text3).toContain('ANNUAL GUARDIANSHIP PLAN');
    expect(text3).toContain('dil@law.com');
    expect(text3).toContain('filings@law.com');

    // Continuation headers on page 2+ across documents
    expect(numPages1).toBeGreaterThan(1);
    expect(rawPdf1).toContain('/Artifact << /Type /Pagination /Subtype /Header >> BDC');
  });

  // Milestone 40E. Reported against a live Annual Accounting export: the
  // Certificate of Service "Address Details" column ran off the right edge of
  // the page instead of breaking between the address components. The cell was
  // a comma-joined string, so the table renderer had no idea where the real
  // line breaks were and word-wrapped the whole run generically.
  //
  // Extracted text alone cannot tell "three lines inside the column" from "one
  // long line off the page" -- the characters are identical either way -- so
  // these assertions use extractPdfTextItems() and check the individual runs.
  test('Milestone 40E: certificate-of-service addresses break per component instead of overflowing', async ({ page }) => {
    await freshStartNoPassword(page);

    // The exact address from the live report, long enough to overflow the
    // ~50%-width column it renders in.
    const RECIPIENT = {
      name: 'Marcus Sterling, Esq. — Attorney for the Guardian',
      line2: '100 2nd Ave S',
      line3: 'Suite 400',
      line4: 'St. Petersburg, FL 33701',
    };

    await installFixtureSupport(page);
    const output = await page.evaluate(async ([recipient, annualBase, simplifiedBase]) => {
      const annual = await (window as any).loadAnnualPdf();
      const simplified = await (window as any).loadSimplifiedPdf();
      const build = (window as any).__pgBuildFixture;

      const period = {
        // Accounts for 2025, so the guardianship began before it.
        gid: '2024-06-01',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
      };

      const annualData = build('annual', annualBase, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        ...period,
        certRecipients: [recipient],
        certDate: '2026-03-01',
      });

      const simplifiedData = build('simplified', simplifiedBase, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        ...period,
        certRecipients: [recipient],
        certServiceDate: '2026-03-01',
      });

      const annualModel = annual.buildAnnualAccountingModel(annualData, { signatureStyle: 'typed', printDate: '2026-09-12' });
      const simplifiedModel = simplified.buildSimplifiedAccountingModel(simplifiedData, { signatureStyle: 'typed', printDate: '2026-09-12' });

      const annualDoc = await annual.generateCourtFormPdf(annualModel);
      const simplifiedDoc = await simplified.generateCourtFormPdf(simplifiedModel);
      return {
        annual: annualDoc.output(),
        simplified: simplifiedDoc.output(),
        annualIssues: await (window as any).__pgFixtureIssues(annualData),
        simplifiedIssues: await (window as any).__pgFixtureIssues(simplifiedData),
      };
    }, [RECIPIENT, MINIMAL_VALID_ANNUAL, MINIMAL_VALID_SIMPLIFIED] as const);

    expectFileableFixture(output.annualIssues, "40E's Annual certificate-of-service filing");
    expectFileableFixture(output.simplifiedIssues, "40E's Simplified certificate-of-service filing");

    for (const [form, raw] of [['Annual', output.annual], ['Simplified', output.simplified]] as const) {
      const runs = (await extractPdfTextItems(raw)).flat().map((s) => s.trim());

      // Each component stands alone as its own text run -- that is what proves
      // the forced break happened, rather than the characters merely being
      // present somewhere on the page (which was already true when it
      // overflowed).
      expect(runs, `${form}: street line should be its own run`).toContain('100 2nd Ave S');
      expect(runs, `${form}: suite line should be its own run`).toContain('Suite 400');
      expect(runs, `${form}: city/state/zip should be its own run`).toContain('St. Petersburg, FL 33701');

      // And no run is the old joined form. Annual used ', ' and Simplified used
      // a space; an un-fixed array would reach the renderer via String() and
      // join with bare commas. None of the three may reappear.
      for (const joined of [
        '100 2nd Ave S, Suite 400, St. Petersburg, FL 33701',
        '100 2nd Ave S Suite 400',
        '100 2nd Ave S,Suite 400,St. Petersburg, FL 33701',
      ]) {
        expect(runs, `${form}: must not re-join the address into one run`).not.toContain(joined);
      }
    }
  });

  // The data-loss half of Milestone 40E, kept separate because it is the one
  // that is invisible on inspection. Simplified Accounting omitted line4 from
  // both its recipient filter and its address join, so a recipient needing a
  // fourth address line had it silently missing from the filed document.
  test('Milestone 40E: Simplified Accounting no longer drops the fourth address line', async ({ page }) => {
    await freshStartNoPassword(page);

    await installFixtureSupport(page);
    const output = await page.evaluate(async (base) => {
      const { buildSimplifiedAccountingModel, generateCourtFormPdf } = await (window as any).loadSimplifiedPdf();
      const d = (window as any).__pgBuildFixture('simplified', base, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        certRecipients: [
          { name: 'Clerk of Court', line2: '315 Court St', line3: 'Clearwater, FL 33756', line4: 'Room 100' },
          // A recipient carrying nothing but line4 used to be filtered out
          // entirely, producing no row at all.
          { name: '', line2: '', line3: '', line4: 'Care of the Probate Division' },
        ],
        // Service date comes from the base: it has to fall on or after the
        // period it certifies service for, which the base's own period sets.
      });
      const model = buildSimplifiedAccountingModel(d, { signatureStyle: 'typed', printDate: '2026-09-12' });
      const doc = await generateCourtFormPdf(model);
      return { raw: doc.output(), issues: await (window as any).__pgFixtureIssues(d) };
    }, MINIMAL_VALID_SIMPLIFIED);

    // Milestone 57B made a name mandatory on every started certificate-of-
    // service row, so the nameless recipient below is no longer a state the
    // export gate passes. The exemption stays rather than the row being
    // completed, because a row whose only populated field is line4 is the one
    // shape that exercises the pdf-model filter's line4 term -- give it a name
    // and it survives the filter on the name alone, and 40E's data loss goes
    // untested. The state is still reachable in a filed document: this issue is
    // bypassable, so a filer who overrides the gate files exactly this row.
    expectFileableFixture(output.issues, "40E's fourth-address-line filing", {
      'simplified.certRecipients[].name.required':
        '57B requires a name on a started recipient row; a line4-only row is '
        + 'deliberately kept here because completing it would stop testing the '
        + 'filter branch 40E fixed.',
    });

    const runs = (await extractPdfTextItems(output.raw)).flat().map((s) => s.trim());
    expect(runs).toContain('Room 100');
    expect(runs).toContain('Care of the Probate Division');
  });

  // Milestone 63E. The Uniform Case Number prints beside Case # in the page header on every filing type.
  // D7: page 1 carries "UCN: ...   CASE #: ..." as ONE line in the existing Case # style; the running header's
  // right cell carries UCN on its first line and Case # on its second (both together are wider than that
  // 146 pt cell). D8: optional and silent when blank -- no "Pending" placeholder. D9: Plan - Minors prints
  // its UCN and its Case # separately instead of printing the UCN as the Case #.
  test('Milestone 63E: the UCN prints beside Case # -- one line on page 1, above it in the running header, absent when blank', async ({ page }) => {
    await freshStartNoPassword(page);
    await installFixtureSupport(page);
    const UCN = '50-2026-GA-000123-XXXX-XX';

    const raw = await page.evaluate(async ([guardianBase, ucn]) => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();
      const { buildPlanMinorModel } = await (window as any).loadPlanMinorPdf();
      const { generateCourtFormPdf } = await (window as any).loadSimplifiedPdf();
      const build = (window as any).__pgBuildFixture;
      const inventory = async (extra: Record<string, unknown>) => {
        const d = build('guardian', guardianBase, { wardName: 'Harold Thomas Bennett', caseNumber: '26-002487-GD', county: 'Pinellas', ...extra });
        return (await generateVerifiedInventoryPdf(buildVerifiedInventoryModel(d))).output();
      };
      const minor = async (extra: Record<string, unknown>) => (await generateCourtFormPdf(buildPlanMinorModel({
        inventoryType: 'planMinor', wardName: 'Minor Doe', county: 'Pinellas', periodFrom: '2026-01-01', periodTo: '2026-12-31', ...extra,
      }))).output();
      return {
        withUcn: await inventory({ ucn }),
        withoutUcn: await inventory({}),
        minorBoth: await minor({ ucn: '2024-MN-042', ref: 'REF-77' }),
        minorUcnOnly: await minor({ ucn: '2024-MN-042' }),
      };
    }, [MINIMAL_VALID_GUARDIAN, UCN]);

    // ---- with a UCN
    const runs = await extractPdfTextRuns(raw.withUcn);
    const pageCount = Math.max(...runs.map((r) => r.page));
    expect(pageCount, 'the inventory should run to more than one page so the running header is exercised').toBeGreaterThan(1);

    // pdf.js reports the one drawn line as adjacent text items (the gap between the two labels is wide), so
    // "one line" is asserted geometrically: same baseline, UCN to the left of CASE #.
    const ucnFirst = runs.find((r) => r.page === 1 && r.text.includes(`UCN: ${UCN}`));
    const caseFirst = runs.find((r) => r.page === 1 && /CASE #: 26-002487-GD/.test(r.text));
    expect(ucnFirst, 'page 1 shows the UCN').toBeTruthy();
    expect(caseFirst, 'page 1 still shows CASE #').toBeTruthy();
    if (ucnFirst !== caseFirst) {
      expect(Math.abs(ucnFirst!.y - caseFirst!.y), 'page 1: UCN and CASE # share one baseline').toBeLessThan(1);
      expect(ucnFirst!.x, 'page 1: UCN comes before CASE # on the line').toBeLessThan(caseFirst!.x);
    }

    for (let p = 2; p <= pageCount; p++) {
      const ucnRun = runs.find((r) => r.page === p && r.text.trim() === `UCN: ${UCN}`);
      const caseRun = runs.find((r) => r.page === p && r.text.trim() === 'Case #: 26-002487-GD');
      expect(ucnRun, `page ${p}: the running header shows the UCN`).toBeTruthy();
      expect(caseRun, `page ${p}: the running header still shows Case #`).toBeTruthy();
      // Two lines in the same cell: UCN directly above Case # (PDF y grows upward), one 8 pt line apart.
      const gap = (ucnRun!.y - caseRun!.y);
      expect(gap, `page ${p}: UCN sits one line above Case #`).toBeGreaterThan(6);
      expect(gap, `page ${p}: UCN sits one line above Case #`).toBeLessThan(11);
      // Right-aligned in the same cell: both lines end at the same right edge (within a point).
      expect(Math.abs((ucnRun!.x + 0) - (caseRun!.x + 0)), `page ${p}: both lines stay inside the header cell`).toBeLessThan(150);
    }

    // ---- without a UCN: nothing about it, and Case # exactly as before
    const plainText = await extractPdfText(raw.withoutUcn);
    expect(plainText).not.toMatch(/UCN/);
    expect(plainText).toContain('CASE #: 26-002487-GD');
    const plainRuns = await extractPdfTextRuns(raw.withoutUcn);
    expect(plainRuns.filter((r) => r.page === 2 && /^Case #:/.test(r.text.trim())).map((r) => r.text.trim()))
      .toEqual(['Case #: 26-002487-GD']);

    // ---- Plan - Minors (D9): the UCN slot is the UCN and the Case # slot is the Case #
    const both = (await extractPdfText(raw.minorBoth)).replace(/\s+/g, ' ');
    expect(both).toContain('UCN: 2024-MN-042 CASE #: REF-77');
    const ucnOnly = (await extractPdfText(raw.minorUcnOnly)).replace(/\s+/g, ' ');
    expect(ucnOnly, 'a Minor plan with only a UCN no longer prints it as the Case #').toContain('UCN: 2024-MN-042 CASE #: Pending');
  });
});
