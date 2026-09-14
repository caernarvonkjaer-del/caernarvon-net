import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

test.describe('PDF Accessibility: Embedded Fonts & PDF/UA-1 XMP Metadata', () => {
  // Milestone 43F, Decision 2: font embedding and XMP metadata were only
  // ever checked against Guardian Inventory's own generator. Annual
  // Accounting (also used, unmodified, by Trust/Final via the same
  // descriptor-driven pipeline) calls the same shared drawFooter()/XMP
  // packet code in pdf-engine.js, but nothing exercised that path directly.
  test('Milestone 43F: Annual Accounting PDFs also embed TrueType fonts, font descriptors, and default pdfuaid:part 1', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const { buildAnnualAccountingModel, generateCourtFormPdf } = await (window as any).loadAnnualPdf();
      const d = {
        wardName: 'Annual Fonts Ward',
        caseNumber: '26-004500-GD',
        county: 'Pinellas',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Priya Chandra',
        attorney: 'Owen Blake, Esq.',
        signatureStyle: 'script',
        schA: [], schB1: [], schB2: [], schB3: [], schB4: [], schC: [],
        schD1: [], schD2: [], schD3: [], schD4: [], schD5: [],
        schE: [], schF1: [], schF2: [],
        trusts: [{ hasTrust: 'No' }],
      };
      const model = buildAnnualAccountingModel(d);
      const doc = await generateCourtFormPdf(model);
      const rawPdfString = doc.output();

      return {
        hasFontFile2: rawPdfString.includes('/FontFile2'),
        hasFontDescriptor: rawPdfString.includes('/FontDescriptor'),
        hasCIDFontType2: rawPdfString.includes('/CIDFontType2') || rawPdfString.includes('/Type0'),
        hasToUnicode: rawPdfString.includes('/ToUnicode'),
        hasPdfUaIdInXmp: rawPdfString.includes('<pdfuaid:part>1</pdfuaid:part>'),
        hasPdfUaNsInXmp: rawPdfString.includes('xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/"'),
        hasPGSansFont: rawPdfString.includes('PGSans'),
      };
    });

    expect(result.hasFontFile2).toBe(true);
    expect(result.hasFontDescriptor).toBe(true);
    expect(result.hasCIDFontType2).toBe(true);
    expect(result.hasToUnicode).toBe(true);
    expect(result.hasPdfUaIdInXmp).toBe(true);
    expect(result.hasPdfUaNsInXmp).toBe(true);
    expect(result.hasPGSansFont).toBe(true);
  });

  test('Slice 19A: XMP metadata packet conditionally includes pdfuaid:part 1 when requested', async ({ page }) => {
    await freshStartNoPassword(page);
    const result = await page.evaluate(async () => {
      const { buildXmpPacket } = await (window as any).loadGuardianPdf();
      const standard = buildXmpPacket({ title: 'Test Form', embedFonts: false });
      const withPdfUa = buildXmpPacket({ title: 'Test Form', claimPdfUa: true });
      const defaultPacket = buildXmpPacket({ title: 'Test Form' });
      return {
        standardHasPdfUa: standard.includes('pdfuaid:part'),
        withPdfUaHasPdfUa: withPdfUa.includes('<pdfuaid:part>1</pdfuaid:part>'),
        defaultHasPdfUa: defaultPacket.includes('<pdfuaid:part>1</pdfuaid:part>'),
      };
    });
    expect(result.standardHasPdfUa).toBe(false);
    expect(result.withPdfUaHasPdfUa).toBe(true);
    expect(result.defaultHasPdfUa).toBe(true);
  });

  test('Milestone 19-5: PDF/UA-1 font embedding — generated PDFs contain embedded TrueType font programs, font descriptors, and default pdfuaid:part 1', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();
      const model = buildVerifiedInventoryModel({
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        guardianName: 'Rachel M. Alvarez',
        signatureStyle: 'script',
      });

      const doc = await generateVerifiedInventoryPdf(model);
      const rawPdfString = doc.output();

      return {
        hasFontFile2: rawPdfString.includes('/FontFile2'),
        hasFontDescriptor: rawPdfString.includes('/FontDescriptor'),
        hasCIDFontType2: rawPdfString.includes('/CIDFontType2') || rawPdfString.includes('/Type0'),
        hasToUnicode: rawPdfString.includes('/ToUnicode'),
        hasPdfUaIdInXmp: rawPdfString.includes('<pdfuaid:part>1</pdfuaid:part>'),
        hasPdfUaNsInXmp: rawPdfString.includes('xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/"'),
        hasPGSansFont: rawPdfString.includes('PGSans'),
      };
    });

    expect(result.hasFontFile2).toBe(true);
    expect(result.hasFontDescriptor).toBe(true);
    expect(result.hasCIDFontType2).toBe(true);
    expect(result.hasToUnicode).toBe(true);
    expect(result.hasPdfUaIdInXmp).toBe(true);
    expect(result.hasPdfUaNsInXmp).toBe(true);
    expect(result.hasPGSansFont).toBe(true);
  });
});
