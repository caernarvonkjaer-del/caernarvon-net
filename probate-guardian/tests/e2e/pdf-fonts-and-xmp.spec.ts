import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

test.describe('PDF Accessibility: Embedded Fonts & PDF/UA-1 XMP Metadata', () => {
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
