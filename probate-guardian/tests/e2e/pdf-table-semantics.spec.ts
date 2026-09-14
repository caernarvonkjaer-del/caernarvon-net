import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { extractPdfText } from './support/pdf-extract';

test.describe('PDF Accessibility: Table Semantics, ColSpan & Multi-Page Continuation', () => {
  // Milestone 43F, Decision 2: this whole file exercised only
  // buildVerifiedInventoryModel (Guardian Inventory) -- a regression in
  // Annual/Trust/Final's own table rendering (they share the same
  // type:'table' section shape and the same pdf-engine.js renderer, but are
  // built by an entirely separate buildAnnualAccountingModel()) would ship
  // undetected. Scoped to Annual Accounting only, per the proposal's own
  // recommendation, rather than all nine filing types.
  test('Milestone 43F: Annual Accounting Schedule D-1 regularity with /ColSpan, /Summary, and multi-page table continuation', async ({ page }) => {
    await freshStartNoPassword(page);

    const inspection = await page.evaluate(async () => {
      const { buildAnnualAccountingModel, generateCourtFormPdf } = await (window as any).loadAnnualPdf();

      const schD1 = [];
      for (let i = 1; i <= 25; i++) {
        schD1.push({
          description: `Cash Account #${i}`,
          accountNo: `***${1000 + i}`,
          restricted: 'No',
          type: 'Checking',
          fullAmount: 10000 + i * 500,
          wardPct: 100,
        });
      }

      const d = {
        wardName: 'Annual Table Semantics Ward',
        caseNumber: '26-004400-GD',
        county: 'Pinellas',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Priya Chandra',
        attorney: 'Owen Blake, Esq.',
        schA: [],
        schB1: [], schB2: [], schB3: [], schB4: [],
        schC: [],
        schD1,
        schD2: [], schD3: [], schD4: [], schD5: [],
        schE: [], schF1: [], schF2: [],
        trusts: [{ hasTrust: 'No' }],
      };

      const model = buildAnnualAccountingModel(d);
      const doc = await generateCourtFormPdf(model);
      const rawPdfString = doc.output();
      const numPages = doc.internal.getNumberOfPages();

      const tableMatches = [...rawPdfString.matchAll(/\/Type \/StructElem[\s\S]*?\/S \/Table[\s\S]*?>>/g)].map((m) => m[0]);
      const tableAttrSummaryMatches = [...rawPdfString.matchAll(/\/A\s*<<[\s\S]*?\/O\s*\/Table[\s\S]*?\/Summary\s*\(([^)]+)\)[\s\S]*?>>/g)].map((m) => m[1]);
      const straySummaryMatches = tableMatches.filter((tbl) => !tbl.includes('/A <<') && tbl.includes('/Summary'));
      const colSpanMatches = [...rawPdfString.matchAll(/\/ColSpan\s+(\d+)/g)].map((m) => parseInt(m[1], 10));
      const columnScopeMatches = [...rawPdfString.matchAll(/\/Scope \/Column/g)].map((m) => m[0]);

      return {
        numPages,
        tableCount: tableMatches.length,
        tableAttrSummaryMatches,
        straySummaryCount: straySummaryMatches.length,
        colSpanMatches,
        columnScopeCount: columnScopeMatches.length,
        rawPdfString,
      };
    });

    // 25 rows in a single schedule table forces multi-page continuation.
    expect(inspection.numPages).toBeGreaterThanOrEqual(2);
    expect(inspection.tableCount).toBeGreaterThan(0);
    expect(inspection.tableAttrSummaryMatches.length).toBe(inspection.tableCount);
    expect(inspection.straySummaryCount).toBe(0);
    for (const sumText of inspection.tableAttrSummaryMatches) {
      expect(sumText.length).toBeGreaterThan(3);
    }
    expect(inspection.columnScopeCount).toBeGreaterThan(0);
    expect(inspection.colSpanMatches.length).toBeGreaterThan(0);
    expect(inspection.rawPdfString).not.toContain('/ColSpan /');

    const extractedText = await extractPdfText(inspection.rawPdfString);
    expect(extractedText).toContain('Cash Account #1');
    expect(extractedText).toContain('Cash Account #25');
  });

  test('Slice 19B: Table semantics, regularity with /ColSpan, /Summary, and multi-page table continuation', async ({ page }) => {
    await freshStartNoPassword(page);

    const inspection = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();

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
    expect(numPages).toBeGreaterThanOrEqual(4);

    // Table Counts & Summaries: Every table must carry /Summary inside its /A << /O /Table >> dictionary
    expect(tableCount).toBeGreaterThan(0);
    expect(tableAttrSummaryMatches.length).toBe(tableCount);
    expect(straySummaryCount).toBe(0);
    for (const sumText of tableAttrSummaryMatches) {
      expect(sumText.length).toBeGreaterThan(3);
    }

    // Header Scopes: Column scope for schedule tables, Row scope for key-value grids
    // Note: Continuation table headers on page-splits are marked as Artifacts (not logical TH), so columnScopeCount is precisely 14
    expect(columnScopeCount).toBeGreaterThanOrEqual(14);
    expect(rowScopeCount).toBeGreaterThan(5);

    // Regularity & ColSpan:
    // /ColSpan must be emitted as a numeric integer (e.g. /ColSpan 3 or /ColSpan 7), NOT /ColSpan /3
    expect(colSpanMatches.length).toBeGreaterThan(0);
    expect(colSpanMatches).toContain(3); // from odd key-value grid (1 + 3 = 4 cols)
    // Milestone 43F: Schedule A-1 now has 8 columns (Personal Residence?/
    // Income Property? tri-state columns were added after this assertion
    // was written), so its single-value totals row spans headers.length -
    // 1 = 7, not the 5 this test asserted for years -- confirmed a stale
    // assertion, not a regression, by reading pdf-model.js's own current
    // 8-entry header array and pdf-engine.js's labelColSpan computation.
    expect(colSpanMatches).toContain(7); // from Schedule A-1 totals (7 + 1 = 8 cols)
    expect(rawPdfString).not.toContain('/ColSpan /');

    // Verify Section Titles include Part VI
    expect(sectionTitles).toContain('Part VI — CERTIFICATE OF SERVICE');

    // Verify neutral notice when service recipients list is empty (no empty-table shell or procedural claims)
    const extractedText19B = await extractPdfText(rawPdfString);
    expect(extractedText19B).toContain('None listed.');
  });
});
