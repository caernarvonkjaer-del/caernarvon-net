import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

test.describe('Milestone 19: PDF Accessibility, WCAG 2.1 & PDF/UA-1 Tagged Structure', () => {
  test('Slice 19A: generates tagged PDF with /StructTreeRoot, /ParentTree, /Tabs /S, /ViewerPreferences, and marked content operators', async ({ page }) => {
    // 1. Fresh start
    await freshStartNoPassword(page);

    // Create initial guardian inventory ward
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

    // 3. Generate native vector PDF in browser memory and inspect raw stream
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

      // Extract all page objects (/Type /Page only, excluding /Type /Pages)
      const pageObjs = rawPdfString.match(/\d+ 0 obj\s*<<\/Type \/Page[\s\r\n][\s\S]*?>>\s*endobj/g) || [];

      // Extract catalog object
      const catalogMatch = rawPdfString.match(/\d+ 0 obj\s*<<[\s\S]*?\/Type \/Catalog[\s\S]*?>>\s*endobj/);
      const catalogObj = catalogMatch ? catalogMatch[0] : '';

      // Extract StructTreeRoot object referenced by catalog
      const structTreeRootRefMatch = catalogObj.match(/\/StructTreeRoot\s+(\d+)\s+0\s+R/);
      const structTreeRootId = structTreeRootRefMatch ? structTreeRootRefMatch[1] : null;
      const structTreeRootRegex = new RegExp(`${structTreeRootId}\\s+0\\s+obj\\s*<<[\\s\\S]*?>>\\s*endobj`);
      const structTreeRootObjMatch = rawPdfString.match(structTreeRootRegex);
      const structTreeRootObj = structTreeRootObjMatch ? structTreeRootObjMatch[0] : '';

      // Extract Metadata object referenced by catalog
      const metadataRefMatch = catalogObj.match(/\/Metadata\s+(\d+)\s+0\s+R/);
      const metadataId = metadataRefMatch ? metadataRefMatch[1] : null;
      const metadataRegex = new RegExp(`${metadataId}\\s+0\\s+obj\\s*<<[\\s\\S]*?>>[\\s\\S]*?endobj`);
      const metadataObjMatch = rawPdfString.match(metadataRegex);
      const metadataObj = metadataObjMatch ? metadataObjMatch[0] : '';

      // Extract ParentTree object referenced by StructTreeRoot
      const parentTreeRefMatch = structTreeRootObj.match(/\/ParentTree\s+(\d+)\s+0\s+R/);
      const parentTreeId = parentTreeRefMatch ? parentTreeRefMatch[1] : null;
      const parentTreeRegex = new RegExp(`${parentTreeId}\\s+0\\s+obj\\s*<<[\\s\\S]*?>>\\s*endobj`);
      const parentTreeObjMatch = rawPdfString.match(parentTreeRegex);
      const parentTreeObj = parentTreeObjMatch ? parentTreeObjMatch[0] : '';

      // Check xref table integrity: every xref offset must point to exact object header
      const xrefIndex = rawPdfString.lastIndexOf('xref');
      const trailerIndex = rawPdfString.lastIndexOf('trailer');
      const xrefSection = rawPdfString.slice(xrefIndex, trailerIndex);
      const xrefLines = xrefSection.split('\n');
      const xrefErrors = [];
      let currentObjId = 0;
      for (let i = 2; i < xrefLines.length; i++) {
        const line = xrefLines[i].trim();
        if (!line) continue;
        currentObjId++;
        const parts = line.split(' ');
        if (parts.length >= 3 && parts[2] === 'n') {
          const offset = parseInt(parts[0], 10);
          const atOffset = rawPdfString.slice(offset, offset + 30);
          const expected = `${currentObjId} 0 obj`;
          if (!atOffset.startsWith(expected)) {
            xrefErrors.push({ objId: currentObjId, expected, actual: atOffset });
          }
        }
      }

      return {
        rawPdfString,
        numPages,
        pageObjs,
        catalogObj,
        structTreeRootId,
        structTreeRootObj,
        metadataId,
        metadataObj,
        parentTreeObj,
        xrefErrors,
      };
    });

    const {
      rawPdfString,
      numPages,
      pageObjs,
      catalogObj,
      structTreeRootId,
      structTreeRootObj,
      metadataId,
      metadataObj,
      parentTreeObj,
      xrefErrors,
    } = pdfInspection;

    // Verify Page Count
    expect(numPages).toBeGreaterThanOrEqual(5);
    expect(pageObjs.length).toBe(numPages);

    // ==========================================
    // PDF Specification & Header (PDF 1.7 for PDF/UA-1)
    // ==========================================
    expect(rawPdfString.startsWith('%PDF-1.7')).toBe(true);

    // ==========================================
    // Strict Object Syntax & XRef Table Integrity
    // ==========================================
    expect(xrefErrors).toEqual([]);

    // ==========================================
    // Category 1: Document Checks
    // ==========================================

    // 1. Tagged PDF: Catalog must contain /MarkInfo << /Marked true >> and /StructTreeRoot
    expect(catalogObj).toContain('/MarkInfo << /Marked true >>');
    expect(structTreeRootId).not.toBeNull();
    expect(catalogObj).toContain(`/StructTreeRoot ${structTreeRootId} 0 R`);

    // 2. Primary Language: Catalog must contain exactly ONE /Lang (en-US) (no duplicate)
    const langMatches = catalogObj.match(/\/Lang\s*\(/g) || [];
    expect(langMatches.length).toBe(1);
    expect(catalogObj).toContain('/Lang (en-US)');

    // 3. Document Title: Must contain /ViewerPreferences << /DisplayDocTitle true >>
    expect(rawPdfString).toContain('/ViewerPreferences');
    expect(rawPdfString).toContain('/DisplayDocTitle true');
    expect(rawPdfString).toContain('Harold Thomas Bennett - 26-002487-GD - Printed 2026-09-03');
    expect(rawPdfString).toContain('Verified Initial Inventory');
    expect(rawPdfString).toContain('Harold Thomas Bennett');
    expect(rawPdfString).toMatch(/Verified Initial Inventory[^\n\r]*Harold Thomas Bennett/);
    expect(rawPdfString).toContain('/Keywords (Florida, Probate, Guardianship, Verified Initial Inventory)');

    // 4. XMP Metadata Stream: /Metadata in /Catalog with Dublin Core dc:title, dc:creator
    expect(metadataId).not.toBeNull();
    expect(catalogObj).toContain(`/Metadata ${metadataId} 0 R`);
    expect(metadataObj).toContain('/Type /Metadata');
    expect(metadataObj).toContain('/Subtype /XML');
    expect(metadataObj).toContain('<dc:title>');
    expect(metadataObj).toContain('Harold Thomas Bennett - 26-002487-GD - Printed 2026-09-03');
    expect(metadataObj).toContain('<dc:creator>');
    expect(metadataObj).toContain('Probate Guardian');

    // 5. StructTreeRoot Object Validity: MUST resolve to /Type /StructTreeRoot (NOT /StructElem)
    expect(structTreeRootObj).toContain('/Type /StructTreeRoot');
    expect(structTreeRootObj).not.toContain('/Type /StructElem');
    expect(structTreeRootObj).toContain('/RoleMap <<');
    expect(structTreeRootObj).toContain('/ParentTree');
    expect(structTreeRootObj).toContain('/K [');

    // 6. ParentTree Object Validity: Must contain number keys for each page (0 .. numPages - 1)
    expect(parentTreeObj).toContain('/Nums [');
    for (let pIdx = 0; pIdx < numPages; pIdx++) {
      expect(parentTreeObj).toContain(`${pIdx} [`);
    }

    // ==========================================
    // Category 2: Page Content Checks
    // ==========================================

    // 7. Tab Order: EVERY single /Page dictionary must contain /Tabs /S
    for (let i = 0; i < pageObjs.length; i++) {
      const pObj = pageObjs[i];
      expect(pObj).toContain('/Tabs /S');
      expect(pObj).toContain(`/StructParents ${i}`);
    }

    // 8. Marked Content Operators: BDC and EMC must wrap page text streams
    expect(rawPdfString).toContain('BDC');
    expect(rawPdfString).toContain('EMC');

    // 9. Artifact Demarcation: Running headers and footers must be marked as Artifacts
    expect(rawPdfString).toContain('/Artifact << /Type /Pagination /Subtype /Header >> BDC');
    expect(rawPdfString).toContain('/Artifact << /Type /Pagination /Subtype /Footer >> BDC');
    expect(rawPdfString).toContain('/Artifact << /Type /Layout >> BDC');

    // ==========================================
    // Category 5: Tables Checks
    // ==========================================

    // 10. Table Structure Elements: /Table, /TR, /TH, /TD must exist in structure tree
    expect(rawPdfString).toContain('/S /Table');
    expect(rawPdfString).toContain('/S /TR');
    expect(rawPdfString).toContain('/S /TH');
    expect(rawPdfString).toContain('/S /TD');

    // 11. Table Header Column Scope
    expect(rawPdfString).toContain('/Scope /Column');

    // ==========================================
    // Category 7: Headings Checks
    // ==========================================

    // 12. Hierarchical Heading Structure Elements & Appropriate Nesting (Zero skipped heading levels)
    expect(rawPdfString).toContain('/S /H1');
    expect(rawPdfString).toContain('/S /H2');

    // Assert Acrobat "Appropriate nesting" rule: no heading jumps e.g. H1 -> H3
    const headingMatches = [...rawPdfString.matchAll(/\/S \/(H[1-6])/g)].map(m => parseInt(m[1].slice(1), 10));
    expect(headingMatches.length).toBeGreaterThan(0);
    let prevLevel = 0;
    for (const lvl of headingMatches) {
      if (prevLevel > 0) {
        expect(lvl).toBeLessThanOrEqual(prevLevel + 1);
      }
      prevLevel = lvl;
    }

    // ==========================================
    // Strict Non-Raster Vector Text Integrity
    // ==========================================
    expect(rawPdfString).toContain('BT');
    expect(rawPdfString).toContain('ET');
    expect(rawPdfString).not.toContain('/Subtype /Image');
    expect(rawPdfString).not.toContain('/Filter /DCTDecode');
  });

  test('Slice 19A: XMP metadata packet conditionally includes pdfuaid:part 1 when requested', async ({ page }) => {
    await freshStartNoPassword(page);
    const result = await page.evaluate(async () => {
      const { buildXmpPacket } = await import('/probate-guardian/src/features/guardian-inventory/pdf-accessibility.js');
      const standard = buildXmpPacket({ title: 'Test Form' });
      const withPdfUa = buildXmpPacket({ title: 'Test Form', claimPdfUa: true });
      return {
        standardHasPdfUa: standard.includes('pdfuaid:part'),
        withPdfUaHasPdfUa: withPdfUa.includes('<pdfuaid:part>1</pdfuaid:part>'),
      };
    });
    expect(result.standardHasPdfUa).toBe(false);
    expect(result.withPdfUaHasPdfUa).toBe(true);
  });

  test('Slice 19B: Table semantics, regularity with /ColSpan, /Summary, and multi-page table continuation', async ({ page }) => {
    await freshStartNoPassword(page);

    const inspection = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel } = await import('/probate-guardian/src/features/guardian-inventory/pdf-model.js');
      const { generateVerifiedInventoryPdf } = await import('/probate-guardian/src/features/guardian-inventory/pdf-engine.js');

      // Create model with:
      // 1. Asymmetric key-value grid (odd items)
      // 2. Multi-page Schedule A-1 table (25 items) to verify header repetition and regularity
      const mockItems = [];
      for (let i = 1; i <= 25; i++) {
        mockItems.push({
          propertyDescription: `Parcel #${i} - Residential Lot ${i}`,
          streetAddress: `${100 + i} Bayview Dr`,
          cityStateZip: 'Clearwater, FL 33755',
          valuationMethod: 'Appraisal',
          fullAssetValue: 150000 + (i * 5000),
          wardPercent: 100,
        });
      }

      const model = buildVerifiedInventoryModel({
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        gid: '2026-01-15',
        hasSafeDepositBox: true, // produces odd 3 items in Schedule D-3
        safeDepositBoxFiled: true,
        bondAmount: 100000,
        bondPeriodFrom: '2026-01-15',
        bondPeriodTo: '2027-01-15',
        bondingCompany: 'Travelers Casualty', // produces odd 3 items in Schedule D-4
        scheduleA1: mockItems,
        scheduleA2: [],
        scheduleB1: [],
        scheduleB2: [],
        scheduleB3: [],
        scheduleB4: [],
        scheduleC1: [],
        scheduleC2: [],
        scheduleC3: [],
        scheduleC4: [],
        scheduleC5: [],
        serviceRecipients: [], // verifies fallback row for empty service recipients
      });

      const doc = await generateVerifiedInventoryPdf(model);
      const rawPdfString = doc.output();
      const numPages = doc.internal.getNumberOfPages();

      // Find all Table elements
      const tableMatches = [...rawPdfString.matchAll(/\/Type \/StructElem[\s\S]*?\/S \/Table[\s\S]*?>>/g)].map(m => m[0]);

      // Verify Table Summaries are strictly located inside /A << /O /Table /Summary (...) >> per ISO 32000-1 Table 323
      const tableAttrSummaryMatches = [...rawPdfString.matchAll(/\/A\s*<<[\s\S]*?\/O\s*\/Table[\s\S]*?\/Summary\s*\(([^)]+)\)[\s\S]*?>>/g)].map(m => m[1]);

      // Check for stray /Summary direct entries on StructElem (which violate ISO 32000-1)
      const straySummaryMatches = tableMatches.filter(tbl => !tbl.includes('/A <<') && tbl.includes('/Summary'));

      // Check ColSpan attributes in raw PDF
      const colSpanMatches = [...rawPdfString.matchAll(/\/ColSpan\s+(\d+)/g)].map(m => parseInt(m[1], 10));

      // Check Table Header Column and Row scopes
      const columnScopeMatches = [...rawPdfString.matchAll(/\/Scope \/Column/g)].map(m => m[0]);
      const rowScopeMatches = [...rawPdfString.matchAll(/\/Scope \/Row/g)].map(m => m[0]);

      return {
        rawPdfString,
        numPages,
        sectionTitles: model.sections.map(s => s.title),
        tableCount: tableMatches.length,
        tableAttrSummaryMatches,
        straySummaryCount: straySummaryMatches.length,
        colSpanMatches,
        columnScopeCount: columnScopeMatches.length,
        rowScopeCount: rowScopeMatches.length,
      };
    });

    const {
      numPages,
      sectionTitles,
      tableCount,
      tableAttrSummaryMatches,
      straySummaryCount,
      colSpanMatches,
      columnScopeCount,
      rowScopeCount,
      rawPdfString,
    } = inspection;

    // Multi-page verification: 25 items in Schedule A-1 expands total pages significantly
    expect(numPages).toBeGreaterThanOrEqual(6);

    // Table Counts & Summaries: Every table must carry /Summary inside its /A << /O /Table >> dictionary
    expect(tableCount).toBeGreaterThan(0);
    expect(tableAttrSummaryMatches.length).toBe(tableCount);
    expect(straySummaryCount).toBe(0);
    for (const sumText of tableAttrSummaryMatches) {
      expect(sumText.length).toBeGreaterThan(3);
    }

    // Header Scopes: Column scope for schedule tables, Row scope for key-value grids
    expect(columnScopeCount).toBeGreaterThan(15);
    expect(rowScopeCount).toBeGreaterThan(5);

    // Regularity & ColSpan:
    // /ColSpan must be emitted as a numeric integer (e.g. /ColSpan 3 or /ColSpan 5), NOT /ColSpan /3
    expect(colSpanMatches.length).toBeGreaterThan(0);
    expect(colSpanMatches).toContain(3); // from odd key-value grid (1 + 3 = 4 cols)
    expect(colSpanMatches).toContain(5); // from Schedule A-1 totals (5 + 1 = 6 cols)
    expect(rawPdfString).not.toContain('/ColSpan /');

    // Verify Section Titles include Part VI
    expect(sectionTitles).toContain('Part VI — CERTIFICATE OF SERVICE');

    // Verify neutral notice when service recipients list is empty (no empty-table shell or procedural claims)
    expect(rawPdfString).toContain('None listed.');
  });

  test('Slice 19C: Shared accessible PDF generator produces tagged, non-raster PDF 1.7 for Simplified Accounting', async ({ page }) => {
    await freshStartNoPassword(page);

    const inspection = await page.evaluate(async () => {
      const { buildSimplifiedAccountingModel } = await import('/probate-guardian/src/features/simplified-accounting/pdf-model.js');
      const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');

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
    expect(rawPdfString).toContain('Simplified Annual Accounting');
    expect(rawPdfString).toContain('Harold Thomas Bennett');
    expect(rawPdfString).toMatch(/Simplified Annual Accounting[^\n\r]*Harold Thomas Bennett/);
    expect(rawPdfString).toContain('/Keywords (Florida, Probate, Guardianship, Simplified Annual Accounting)');

    // 8. Dropped Field Guard: certIndicator must render in Certificate of Service
    expect(rawPdfString).toContain('Hand-delivered via process server');

    // 9. Verify all sections present in model (with separate Part III and Part IV)
    expect(sectionTitles).toContain('Part I — REQUIRED INFORMATION');
    expect(sectionTitles).toContain('Part II — ACCOUNTING SUMMARY AND REMAINING ASSETS ON HAND');
    expect(sectionTitles).toContain('Part III — GUARDIAN(S) DECLARATION');
    expect(sectionTitles).toContain('Part IV — GUARDIAN(S) INFORMATION');
    expect(sectionTitles).toContain('Part V — SIGNATURE OF GUARDIAN ATTORNEY');
    expect(sectionTitles).toContain('Part VI — GUARDIAN ATTORNEY CERTIFICATE OF SERVICE');
    expect(sectionTitles).toContain('Part VII — GUARDIAN(S) DECLARATION OF REMUNERATION');
  });

  test('Slice 19D: Complete xref table byte offset integrity and zero untagged text operators across all filing outputs', async ({ page }) => {
    await freshStartNoPassword(page);

    const auditResults = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel } = await import('/probate-guardian/src/features/guardian-inventory/pdf-model.js');
      const { generateVerifiedInventoryPdf } = await import('/probate-guardian/src/features/guardian-inventory/pdf-engine.js');
      const { buildSimplifiedAccountingModel } = await import('/probate-guardian/src/features/simplified-accounting/pdf-model.js');
      const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');

      const mockInventoryData = {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        gid: '2026-01-15',
        typeOfGuardianship: 'Plenary',
        guardianName: 'Rachel M. Alvarez',
        attorneyForGuardian: 'Robert Vance, Esq.',
        witnesses: [{ name: 'David Miller', address: '120 Central Ave', occupation: 'Paralegal' }],
        guardians: [{ name: 'Rachel M. Alvarez', signatureDate: '2026-02-28', phone: '727-555-0144' }],
        preparer: { name: 'Marcus Thorne', signatureDate: '2026-02-28', phone: '727-555-0188' },
        attorney: { name: 'Robert Vance, Esq.', barNumber: '0184920', signatureDate: '2026-03-01' },
        serviceAttorney: { name: 'Elena Rostova', barNumber: '0293841', signatureDate: '2026-03-01' },
        serviceRecipients: [{ name: 'Sarah Bennett', address: '1420 5th Ave N', cityStateZip: 'St. Petersburg, FL', method: 'E-Portal' }],
        scheduleA1: [{ propertyDescription: 'Primary Residence', streetAddress: '1420 5th Ave N', cityStateZip: 'St. Petersburg, FL', valuationMethod: 'Appraisal', fullAssetValue: 250000, wardPercent: 100 }],
        scheduleA2: [{ lenderName: 'Wells Fargo', lenderAddress: 'PO Box 10335', lenderCityStateZip: 'Des Moines, IA', relatedProperty: '1420 5th Ave N', fullDebtBalance: 45000 }],
        scheduleB1: [{ institutionName: 'Raymond James', accountType: 'Checking', accountNumber: '***4821', streetAddress: '880 Carillon', cityStateZip: 'St. Pete', fullAssetAmount: 38250 }],
        scheduleB2: [{ description: '2021 Toyota Camry', streetAddress: '1420 5th Ave N', cityStateZip: 'St. Pete', valuationMethod: 'KBB', fullAssetValue: 18500, wardPercent: 100 }],
        scheduleC1: [{ payerName: 'SSA', typeOfIncome: 'Retirement', paymentBasis: 'Monthly', annualIncomeAmount: 22200 }],
      };

      const mockSimplifiedData = {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Eleanor Vance Bennett',
        attorney: 'Marcus Sterling, Esq.',
        guardians: [{ name: 'Eleanor Vance Bennett', signatureDate: '2026-03-01', phone: '727-555-0199' }],
        attorney_barNumber: '1029384',
        attorney_signatureDate: '2026-03-01',
        certServiceDate: '2026-03-01',
        certAttySignDate: '2026-03-01',
        certIndicator: 'Electronic / Florida Courts E-Filing Portal',
        certRecipients: [{ name: 'Clerk of Court', line2: '315 Court St', line3: 'Clearwater, FL 33756' }],
        startingBalance: 150000,
        interestIncome: 3500,
        depositsSettlement: 0,
        serviceCharges: 95,
        federalIncomeTax: 1200,
        remuneration: [{ guardian: 'Eleanor Vance Bennett', type: 'Guardian Fee', description: 'Statutory fee per court order' }],
      };

      const invModel = buildVerifiedInventoryModel(mockInventoryData, { signatureStyle: 'typed', printDate: '2026-09-03' });
      const simpModel = buildSimplifiedAccountingModel(mockSimplifiedData, { signatureStyle: 'script', printDate: '2026-09-03' });

      const invDoc = await generateVerifiedInventoryPdf(invModel);
      const simpDoc = await generateCourtFormPdf(simpModel);

      function auditPdf(rawPdf) {
        // 1. Audit Xref Table & Byte Offsets
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

        // 2. Audit Stream Content for Untagged Text Operators
        // Any text-showing operator (Tj, TJ, ', ") MUST be within a BDC ... EMC block
        const streamMatches = [...rawPdf.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
        let totalTextOperators = 0;
        let untaggedTextOperators = 0;
        const untaggedDetails: string[] = [];

        for (const sm of streamMatches) {
          const content = sm[1];
          // Only inspect PDF page content streams (skip XML metadata or non-content streams)
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
              if (mcDepth === 0) {
                untaggedTextOperators++;
                untaggedDetails.push(tokens.slice(Math.max(0, t - 10), t + 1).join(' '));
              }
            }
          }
        }

        return {
          startxrefPointsToXref,
          totalObjectsInXref,
          validOffsets,
          totalTextOperators,
          untaggedTextOperators,
          untaggedDetails,
        };
      }

      return {
        inventory: auditPdf(invDoc.output()),
        simplified: auditPdf(simpDoc.output()),
      };
    });

    const { inventory, simplified } = auditResults;

    // 1. Inventory Form Audit:
    // Zero xref displacement: declared startxref points directly to xref keyword at its exact byte offset
    expect(inventory.startxrefPointsToXref).toBe(true);
    // 100% of objects in xref table resolve to exact `<ID> 0 obj` at their declared byte offsets
    expect(inventory.totalObjectsInXref).toBeGreaterThan(50);
    expect(inventory.validOffsets).toBe(inventory.totalObjectsInXref);
    // 100% of text showing operators are enclosed in marked content / artifact blocks (zero untagged text)
    expect(inventory.totalTextOperators).toBeGreaterThan(50);
    expect(inventory.untaggedDetails).toEqual([]);
    expect(inventory.untaggedTextOperators).toBe(0);

    // 2. Simplified Accounting Audit:
    expect(simplified.startxrefPointsToXref).toBe(true);
    expect(simplified.totalObjectsInXref).toBeGreaterThan(50);
    expect(simplified.validOffsets).toBe(simplified.totalObjectsInXref);
    expect(simplified.totalTextOperators).toBeGreaterThan(50);
    expect(simplified.untaggedTextOperators).toBe(0);
  });
});


