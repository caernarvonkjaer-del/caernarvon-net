import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';
import { extractPdfText } from './support/pdf-extract';

test.describe('Supplemental PDF inline rendering for Accounting forms (Annual, Trust, Final)', () => {
  test('Annual Accounting inserts uploaded Schedule A supporting PDF directly after Schedule A', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Accounting Supplemental Ward', 'annual');

    const result = await page.evaluate(async () => {
      const d = (window as any).D;
      d.wardName = 'Sarah Jenkins';
      d.caseNumber = '26-PR-009123';
      d.county = 'Pinellas';
      d.periodFrom = '2026-07-10';
      d.periodTo = '2027-07-09';
      d.schA = [
        { payer: 'Social Security Administration', description: 'Monthly Retirement', bank: 'Chase Bank', accountNo: '1234', amount: '12000.00' },
      ];

      const { buildAnnualAccountingModel, createJsPdfInstance, generateCourtFormPdf } = await (window as any).loadAnnualPdf();
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { digestDataUrl } = await import('/probate-guardian/src/core/pdf/supplemental-pdf.js');

      // 1. Calculate baseline pages without attachment
      const baseModel = buildAnnualAccountingModel(d);
      const baseDoc = await generateCourtFormPdf(baseModel, { sourceData: d });
      const basePageCount = baseDoc.internal.getNumberOfPages();

      // 2. Create a 1-page mock supporting document
      const attachDoc = await createJsPdfInstance();
      attachDoc.setFontSize(16);
      attachDoc.text('SCHEDULE A ATTACHMENT: Social Security Benefit Verification Letter', 50, 100);
      const attachmentDataUrl = attachDoc.output('datauristring');
      const attachmentDigest = await digestDataUrl(attachmentDataUrl);

      // Key under accounting period as legacy-app.js does
      const periodKey = `${d.periodFrom}__${d.periodTo}`;
      d.scheduleDocs = {
        schA: {
          [periodKey]: {
            comment: 'Official SSA Award Letter for 2026-2027.',
            files: [{
              id: 'test-ssa-letter',
              name: 'SSA_Award_Letter_2026.pdf',
              type: 'application/pdf',
              size: 4200,
              dataUrl: attachmentDataUrl,
              contentDigest: attachmentDigest,
              attestedDigest: attachmentDigest,
              technicalStatus: 'ready',
              attestationStatus: 'accepted',
              pageCount: 1,
            }],
          },
        },
      };

      const model = buildAnnualAccountingModel(d);
      const doc = await generateCourtFormPdf(model, { sourceData: d });
      const rawPdfBytes = await finalizeCourtFormPdf(doc);

      // Check section model blocks
      const schASection = model.sections.find((s: any) => s.id === 'schA');
      const supportingBlock = (schASection?.blocks || []).find((b: any) => b.type === 'supporting-documents');

      return {
        basePageCount,
        hasSupportingBlock: !!supportingBlock,
        supportingBlockComment: supportingBlock?.comment || '',
        numPages: doc.internal.getNumberOfPages(),
        rawPdfString: new TextDecoder('latin1').decode(rawPdfBytes),
      };
    });

    expect(result.hasSupportingBlock).toBe(true);
    expect(result.supportingBlockComment).toBe('Official SSA Award Letter for 2026-2027.');
    expect(result.numPages).toBe(result.basePageCount + 1);

    const extractedText = await extractPdfText(result.rawPdfString);
    expect(extractedText).toContain('SCHEDULE A: Income Received During Period');
    expect(extractedText).toContain('SCHEDULE A ATTACHMENT: Social Security Benefit Verification Letter');
    expect(extractedText).toContain('Official SSA Award Letter for 2026-2027.');
  });

  test('Trust Accounting alias inserts supporting documents in PDF preview and export', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Trust Accounting Supplemental Ward', 'trustAccounting');

    const result = await page.evaluate(async () => {
      const d = (window as any).D;
      d.wardName = 'Eleanor Vance';
      d.caseNumber = '26-TR-004567';
      d.periodFrom = '2026-01-01';
      d.periodTo = '2026-12-31';
      d.schA = [
        { payer: 'Vance Family Trust', description: 'Annual Trust Distribution', bank: 'Northern Trust', accountNo: '9876', amount: '50000.00' },
      ];

      const { buildAnnualAccountingModel, createJsPdfInstance, generateCourtFormPdf } = await (window as any).loadAnnualPdf();
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { digestDataUrl } = await import('/probate-guardian/src/core/pdf/supplemental-pdf.js');

      const baseModel = buildAnnualAccountingModel(d);
      const baseDoc = await generateCourtFormPdf(baseModel, { sourceData: d });
      const basePageCount = baseDoc.internal.getNumberOfPages();

      const attachDoc = await createJsPdfInstance();
      attachDoc.setFontSize(16);
      attachDoc.text('TRUST ACCOUNTING SCHEDULE A: 1099-DIV Statement', 50, 100);
      const attachmentDataUrl = attachDoc.output('datauristring');
      const attachmentDigest = await digestDataUrl(attachmentDataUrl);

      const periodKey = `${d.periodFrom}__${d.periodTo}`;
      d.scheduleDocs = {
        schA: {
          [periodKey]: {
            comment: 'Consolidated 1099 from Trustee.',
            files: [{
              id: 'test-trust-1099',
              name: 'Trust_1099_2026.pdf',
              type: 'application/pdf',
              size: 4500,
              dataUrl: attachmentDataUrl,
              contentDigest: attachmentDigest,
              attestedDigest: attachmentDigest,
              technicalStatus: 'ready',
              attestationStatus: 'accepted',
              pageCount: 1,
            }],
          },
        },
      };

      const model = buildAnnualAccountingModel(d);
      const doc = await generateCourtFormPdf(model, { sourceData: d });
      const rawPdfBytes = await finalizeCourtFormPdf(doc);

      const schASection = model.sections.find((s: any) => s.id === 'schA');
      const supportingBlock = (schASection?.blocks || []).find((b: any) => b.type === 'supporting-documents');

      return {
        basePageCount,
        hasSupportingBlock: !!supportingBlock,
        numPages: doc.internal.getNumberOfPages(),
        rawPdfString: new TextDecoder('latin1').decode(rawPdfBytes),
      };
    });

    expect(result.hasSupportingBlock).toBe(true);
    expect(result.numPages).toBe(result.basePageCount + 1);

    const extractedText = await extractPdfText(result.rawPdfString);
    expect(extractedText).toContain('TRUST ACCOUNTING SCHEDULE A: 1099-DIV Statement');
    expect(extractedText).toContain('Consolidated 1099 from Trustee.');
  });

  test('Final Accounting alias correctly resolves and embeds supplemental PDF', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Final Accounting Supplemental Ward', 'finalAccounting');

    const result = await page.evaluate(async () => {
      const d = (window as any).D;
      d.wardName = 'Arthur Pendelton';
      d.caseNumber = '26-GD-007890';
      d.periodFrom = '2026-01-01';
      d.periodTo = '2026-06-30';
      d.schA = [
        { payer: 'Pension Plan', description: 'Final Distribution', bank: 'Regions Bank', accountNo: '5544', amount: '8000.00' },
      ];

      const { buildAnnualAccountingModel, createJsPdfInstance, generateCourtFormPdf } = await (window as any).loadAnnualPdf();
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { digestDataUrl } = await import('/probate-guardian/src/core/pdf/supplemental-pdf.js');

      const baseModel = buildAnnualAccountingModel(d);
      const baseDoc = await generateCourtFormPdf(baseModel, { sourceData: d });
      const basePageCount = baseDoc.internal.getNumberOfPages();

      const attachDoc = await createJsPdfInstance();
      attachDoc.setFontSize(16);
      attachDoc.text('FINAL ACCOUNTING: Final Closing Bank Statement', 50, 100);
      const attachmentDataUrl = attachDoc.output('datauristring');
      const attachmentDigest = await digestDataUrl(attachmentDataUrl);

      const periodKey = `${d.periodFrom}__${d.periodTo}`;
      d.scheduleDocs = {
        schA: {
          [periodKey]: {
            comment: 'Closing statement showing zero balance.',
            files: [{
              id: 'test-final-statement',
              name: 'Final_Closing_Statement.pdf',
              type: 'application/pdf',
              size: 3900,
              dataUrl: attachmentDataUrl,
              contentDigest: attachmentDigest,
              attestedDigest: attachmentDigest,
              technicalStatus: 'ready',
              attestationStatus: 'accepted',
              pageCount: 1,
            }],
          },
        },
      };

      const model = buildAnnualAccountingModel(d);
      const doc = await generateCourtFormPdf(model, { sourceData: d });
      const rawPdfBytes = await finalizeCourtFormPdf(doc);

      const schASection = model.sections.find((s: any) => s.id === 'schA');
      const supportingBlock = (schASection?.blocks || []).find((b: any) => b.type === 'supporting-documents');

      return {
        basePageCount,
        hasSupportingBlock: !!supportingBlock,
        numPages: doc.internal.getNumberOfPages(),
        rawPdfString: new TextDecoder('latin1').decode(rawPdfBytes),
      };
    });

    expect(result.hasSupportingBlock).toBe(true);
    expect(result.numPages).toBe(result.basePageCount + 1);

    const extractedText = await extractPdfText(result.rawPdfString);
    expect(extractedText).toContain('FINAL ACCOUNTING: Final Closing Bank Statement');
    expect(extractedText).toContain('Closing statement showing zero balance.');
  });

  test('Guardian Inventory multi-year regression: activeYearKey attachments continue to insert correctly', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Inventory Regression Ward', 'guardian');

    const result = await page.evaluate(async () => {
      const d = (window as any).D;
      d.wardName = 'Robert Bruce';
      d.caseNumber = '26-GI-001122';
      d.activeYearKey = 'Year 2';
      d.scheduleB1 = [
        { description: 'Checking Account', accountNumber: '1111', fullAssetAmount: 25000, isRestricted: false },
      ];

      const { buildVerifiedInventoryModel, createJsPdfInstance, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { digestDataUrl } = await import('/probate-guardian/src/core/pdf/supplemental-pdf.js');

      const baseModel = buildVerifiedInventoryModel(d);
      const baseDoc = await generateVerifiedInventoryPdf(baseModel);
      const basePageCount = baseDoc.internal.getNumberOfPages();

      const attachDoc = await createJsPdfInstance();
      attachDoc.setFontSize(16);
      attachDoc.text('GUARDIAN INVENTORY YEAR 2: Bank Statement Verification', 50, 100);
      const attachmentDataUrl = attachDoc.output('datauristring');
      const attachmentDigest = await digestDataUrl(attachmentDataUrl);

      d.scheduleDocs = {
        b1: {
          'Year 2': {
            comment: 'Year 2 checking account statement.',
            files: [{
              id: 'test-gi-y2',
              name: 'Y2_Checking.pdf',
              type: 'application/pdf',
              size: 3500,
              dataUrl: attachmentDataUrl,
              contentDigest: attachmentDigest,
              attestedDigest: attachmentDigest,
              technicalStatus: 'ready',
              attestationStatus: 'accepted',
              pageCount: 1,
            }],
          },
        },
      };

      const model = buildVerifiedInventoryModel(d);
      const doc = await generateVerifiedInventoryPdf(model);
      const rawPdfBytes = await finalizeCourtFormPdf(doc);

      const b1Section = model.sections.find((s: any) => s.id === 'b1');
      const supportingBlock = (b1Section?.blocks || []).find((b: any) => b.type === 'supporting-documents');

      return {
        basePageCount,
        hasSupportingBlock: !!supportingBlock,
        numPages: doc.internal.getNumberOfPages(),
        rawPdfString: new TextDecoder('latin1').decode(rawPdfBytes),
      };
    });

    expect(result.hasSupportingBlock).toBe(true);
    expect(result.numPages).toBeGreaterThanOrEqual(result.basePageCount + 1);

    const extractedText = await extractPdfText(result.rawPdfString);
    expect(extractedText).toContain('GUARDIAN INVENTORY YEAR 2: Bank Statement Verification');
    expect(extractedText).toContain('Year 2 checking account statement.');
  });
});
