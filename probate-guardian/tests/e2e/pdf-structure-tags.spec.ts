import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { extractPdfText } from './support/pdf-extract';

test.describe('PDF Accessibility: Tagged Structure, StructTreeRoot & Marked Content', () => {
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
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();

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
    expect(rawPdfString).toContain('Harold Thomas Bennett - 26-002487-GD - Verified Initial Inventory - Printed 2026-09-03');
    const extractedText = await extractPdfText(rawPdfString);
    expect(extractedText).toContain('Verified Initial Inventory');
    expect(extractedText).toContain('Harold Thomas Bennett');
    expect(rawPdfString).toContain('/Keywords (Florida, Probate, Guardianship, Verified Initial Inventory)');

    // 4. XMP Metadata Stream: /Metadata in /Catalog with Dublin Core dc:title, dc:creator
    expect(metadataId).not.toBeNull();
    expect(catalogObj).toContain(`/Metadata ${metadataId} 0 R`);
    expect(metadataObj).toContain('/Type /Metadata');
    expect(metadataObj).toContain('/Subtype /XML');
    expect(metadataObj).toContain('<dc:title>');
    expect(metadataObj).toContain('Harold Thomas Bennett - 26-002487-GD - Verified Initial Inventory - Printed 2026-09-03');
    expect(metadataObj).toContain('<dc:creator>');
    expect(metadataObj).toContain('Probate Guardian');

    // 5. StructTreeRoot Object Validity: MUST resolve to /Type /StructTreeRoot (NOT /StructElem)
    expect(structTreeRootObj).toContain('/Type /StructTreeRoot');
    expect(structTreeRootObj).not.toContain('/Type /StructElem');
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

  test('Slice 19D: Complete xref table byte offset integrity and zero untagged text operators across all filing outputs', async ({ page }) => {
    await freshStartNoPassword(page);

    const auditResults = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();
      const { buildSimplifiedAccountingModel, generateCourtFormPdf } = await (window as any).loadSimplifiedPdf();

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

  test('Milestone 19-1: checklist and wet-ink signature-block synthetic fixture — tagged structure, glyph rendering, page-break handling', async ({ page }) => {
    // checklist and the wet-ink signature-block variant have no consumer
    // until Milestone 19-2's plan-* features land, so this exercises the
    // block types directly with a hand-built model rather than deferring
    // their first real validation to whenever 19-2 happens -- a bug here
    // would otherwise be indistinguishable from a bug in 19-2's new
    // pdf-model.js wiring.
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const { generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();

      // Enough rows to force the checklist across a page boundary on its own.
      const checklistItems = Array.from({ length: 70 }, (_, i) => ({
        checked: i % 3 === 0,
        label: `Synthetic checklist item number ${i + 1} verifies wrapping and page-break handling`,
      }));

      const model = {
        metadata: {
          title: 'Synthetic Fixture - Milestone 19-1',
          subject: 'Synthetic Fixture',
          author: 'Probate Guardian',
          creator: 'Probate Guardian',
          formName: 'SYNTHETIC FIXTURE',
          formSubtitle: 'Milestone 19-1 Block Vocabulary Fixture',
          keywords: 'Synthetic, Fixture',
          wardName: 'Synthetic Ward',
          caseNumber: '26-000000-GD',
          county: 'Pinellas',
          signatureStyle: 'typed',
        },
        sections: [
          {
            id: 'checklist-fixture',
            title: 'Synthetic Checklist Section',
            bookmarkTitle: 'Synthetic Checklist Section',
            parentBookmark: null,
            level: 1,
            pageBreakBefore: false,
            blocks: [
              { type: 'checklist', title: 'Synthetic Checklist', items: checklistItems },
            ],
          },
          {
            id: 'wet-signature-fixture',
            title: 'Synthetic Wet-Ink Signature Section',
            bookmarkTitle: 'Synthetic Wet-Ink Signature Section',
            parentBookmark: null,
            level: 1,
            pageBreakBefore: true,
            blocks: [
              {
                type: 'signature-block',
                role: 'Synthetic Signer',
                signerName: 'Pat Example',
                wetSignatureExplicit: true,
                fields: [
                  [{ label: 'Phone', value: '555-0100' }, { label: 'Street', value: '1 Test Way' }],
                  [{ label: 'City/State/Zip', value: 'Testville, FL 00000' }],
                ],
              },
            ],
          },
        ],
      };

      const doc = await generateVerifiedInventoryPdf(model);
      const rawPdfString = doc.output();

      return {
        rawPdfString,
        numPages: doc.internal.getNumberOfPages(),
        hasStructTreeRoot: /\/StructTreeRoot/.test(rawPdfString),
        hasMarkInfo: /\/MarkInfo\s*<<\s*\/Marked\s*true/.test(rawPdfString),
      };
    });

    expect(result.hasStructTreeRoot).toBe(true);
    expect(result.hasMarkInfo).toBe(true);
    expect(result.numPages).toBeGreaterThan(1);

    const extracted191Text = await extractPdfText(result.rawPdfString);
    expect(extracted191Text).toContain('Synthetic checklist item number 1 verifies');
    expect(extracted191Text).toContain('Yes');
    expect(extracted191Text).toContain('No');
    // Wet-ink signatures carry no electronic-signature legal notice.
    expect(extracted191Text).not.toContain('pursuant to Fla. R. Gen. Prac');
    expect(extracted191Text).toContain('Signature');
    expect(extracted191Text).toContain('Testville');
    expect(extracted191Text).toContain('555-0100');
  });
});
