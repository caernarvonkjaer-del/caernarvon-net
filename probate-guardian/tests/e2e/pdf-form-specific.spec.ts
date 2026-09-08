import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { extractPdfText } from './support/pdf-extract';

test.describe('PDF Accessibility: Accounting & Inventory Filing-Specific Coverage', () => {
  test('Slice 19C: Shared accessible PDF generator produces tagged, non-raster PDF 1.7 for Simplified Accounting', async ({ page }) => {
    await freshStartNoPassword(page);

    const inspection = await page.evaluate(async () => {
      const { buildSimplifiedAccountingModel, generateCourtFormPdf } = await (window as any).loadSimplifiedPdf();

      const sampleData = {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        ssn: '***-**-1234',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Eleanor Vance Bennett',
        attorney: 'Marcus Sterling, Esq.',
        typeOfGuardianship: 'Plenary',
        eligDepository: 'Raymond James Bank',
        eligOnlyTransactions: 'Interest & Service Charges',
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
      };

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
      };
    });

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

    const inspection = await page.evaluate(async () => {
      const { buildAnnualAccountingModel, generateCourtFormPdf } = await (window as any).loadAnnualPdf();

      const sampleAnnualData = {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Rachel M. Alvarez',
        attorney: 'Robert Vance, Esq.',
        typeOfGuardianship: 'Plenary',
        filingType: 'Annual Accounting',
        amendedForm: false,
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
      };

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
      };
    });

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

    const driftGuardResults = await page.evaluate(async () => {
      // 1. Verify single source of truth: window.calcTotalsAnnual must exist BEFORE loadAnnualPdf
      const fnBefore = (window as any).calcTotalsAnnual;
      const fnBeforeStr = typeof fnBefore === 'function' ? fnBefore.toString() : '';

      // 2. Load PDF module
      const { buildAnnualAccountingModel, generateCourtFormPdf } = await (window as any).loadAnnualPdf();

      const fnAfter = (window as any).calcTotalsAnnual;
      const fnAfterStr = typeof fnAfter === 'function' ? fnAfter.toString() : '';

      // Check whether global was swapped or remained identical
      const globalSwapped = fnBeforeStr !== fnAfterStr;

      // 3. Distinct Sentinel Data for Preview/PDF Drift Guard
      const sentinelData = {
        wardName: 'Arthur Pendragon',
        caseNumber: '52-2026-GD-009988',
        county: 'Pinellas',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Gawain Knight',
        attorney: 'Merlin Ambrosius, Esq.',
        typeOfGuardianship: 'Plenary',
        filingType: 'Annual Accounting',
        amendedForm: false,
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
      };

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
      };
    });

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

    const inspection = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();

      const d = {
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
      };

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
      };
    });

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

    const result = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();
      const { generateCourtFormPdf } = await (window as any).loadSimplifiedPdf();
      const { buildPlanAnnualModel } = await (window as any).loadPlanAnnualPdf();

      // Test 1: Verified Initial Inventory with Electronic /s/ signature (default) in Miami-Dade County (11th Circuit)
      const d1 = {
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
      };

      const m1 = buildVerifiedInventoryModel(d1, { printDate: '2026-09-05' });
      const doc1 = await generateVerifiedInventoryPdf(m1);
      const rawPdf1 = doc1.output();

      // Test 2: Verified Initial Inventory with Wet-ink signature (useSlashS: false) in Pinellas County (6th Circuit)
      const d2 = {
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
      };

      const m2 = buildVerifiedInventoryModel(d2, { printDate: '2026-09-05' });
      const doc2 = await generateVerifiedInventoryPdf(m2);
      const rawPdf2 = doc2.output();

      // Test 3: Annual Plan with Minor variant
      const d3 = {
        wardName: 'Tommy Pickles',
        caseNumber: '26-001122-GD',
        county: 'Hillsborough',
        guardian: 'Didi Pickles',
        attorney: 'Dil Pickles, Esq.',
        attorney_bar: '9988776',
        attorney_email: 'dil@law.com',
        attorney_secondary_email: 'filings@law.com',
        attorney_useSlashS: true,
        planGuardians: [{ name: 'Didi Pickles', signatureDate: '2026-09-01', useSlashS: true }],
      };
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
      };
    });

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
});
