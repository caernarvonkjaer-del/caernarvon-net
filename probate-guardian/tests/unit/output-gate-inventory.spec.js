import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';

// Milestone 38D / 44B: Static gate inventory verifying that every output
// boundary (PDF export, Excel export, PDF preview, and browser print)
// routes through the centralized, non-bypassable authorizeFilingOutput()
// authority with the appropriate capability and capacity issues.

const EXCEL_MODULES = [
  'simplified-accounting',
  'guardian-inventory',
  'annual-accounting',
];

const PRINT_MODULES = [
  'simplified-accounting',
  'guardian-inventory',
  'annual-accounting',
  'plan-simplified',
  'plan-annual',
  'plan-initial',
  'plan-minor',
];

describe('Output gate inventory — Excel exporters', () => {
  for (const feature of EXCEL_MODULES) {
    test(`${feature}/excel.js gates doSaveExcel through authorizeFilingOutput with capacity issues`, async () => {
      const source = await readFile(
        new URL(`../../src/features/${feature}/excel.js`, import.meta.url),
        'utf8'
      );

      // Must import authorizeFilingOutput
      expect(source).toMatch(/import\s*\{[^}]*\bauthorizeFilingOutput\b[^}]*\}\s*from\s*['"][^'"]*output-authorization(?:\.js)?['"]/);

      // Must import getExcelCapacityIssues
      expect(source).toMatch(/import\s*\{[^}]*\bgetExcelCapacityIssues\b[^}]*\}\s*from\s*['"][^'"]*excel-capacity(?:\.js)?['"]/);

      // Must export doSaveExcel
      expect(source).toMatch(/export\s+(?:async\s+)?function\s+doSaveExcel\s*\(/);

      // Must call getExcelCapacityIssues
      expect(source).toMatch(/getExcelCapacityIssues\s*\(/);

      // Must invoke authorizeFilingOutput with capability: 'excel' and additionalIssues
      expect(source).toMatch(/authorizeFilingOutput\s*\(.*capability:\s*['"]excel['"]/s);
      expect(source).toMatch(/additionalIssues:\s*(?:capacityIssues|getExcelCapacityIssues)/);

      // Must guard output on authorization.status !== 'allowed'
      expect(source).toMatch(/authorization\.status\s*!==\s*['"]allowed['"]/);

      // saveWorkbook must appear after authorizeFilingOutput in doSaveExcel
      const doSaveExcelStart = source.indexOf('function doSaveExcel');
      const authIdx = source.indexOf('authorizeFilingOutput', doSaveExcelStart);
      const saveIdx = source.indexOf('saveWorkbook', doSaveExcelStart);
      expect(authIdx).toBeGreaterThan(doSaveExcelStart);
      expect(saveIdx).toBeGreaterThan(authIdx);
    });
  }
});

describe('Output gate inventory — PDF exporters', () => {
  for (const feature of PRINT_MODULES) {
    test(`${feature}/print.js gates doSavePdf through authorizeFilingOutput`, async () => {
      const source = await readFile(
        new URL(`../../src/features/${feature}/print.js`, import.meta.url),
        'utf8'
      );

      // Must import authorizeFilingOutput
      expect(source).toMatch(/import\s*\{[^}]*\bauthorizeFilingOutput\b[^}]*\}\s*from\s*['"][^'"]*output-authorization(?:\.js)?['"]/);

      // Must export doSavePdf
      expect(source).toMatch(/export\s+(?:async\s+)?function\s+doSavePdf\s*\(/);

      // Must invoke authorizeFilingOutput with capability: 'pdf'
      expect(source).toMatch(/authorizeFilingOutput\s*\(.*capability:\s*['"]pdf['"]/s);

      // Must guard output on authorization.status !== 'allowed'
      expect(source).toMatch(/authorization\.status\s*!==\s*['"]allowed['"]/);

      // saveFinalizedPdf must appear after authorizeFilingOutput in doSavePdf
      const doSavePdfStart = source.indexOf('function doSavePdf');
      const authIdx = source.indexOf('authorizeFilingOutput', doSavePdfStart);
      const saveIdx = source.indexOf('saveFinalizedPdf', doSavePdfStart);
      expect(authIdx).toBeGreaterThan(doSavePdfStart);
      expect(saveIdx).toBeGreaterThan(authIdx);
    });
  }
});

describe('Output gate inventory — PDF Preview and Browser Print', () => {
  test('pdf-preview.js gates mountPdfPreview through authorizeFilingOutput with preview capability', async () => {
    const source = await readFile(
      new URL('../../src/core/pdf/pdf-preview.js', import.meta.url),
      'utf8'
    );

    expect(source).toMatch(/import\s*\{[^}]*\bauthorizeFilingOutput\b[^}]*\}\s*from\s*['"][^'"]*output-authorization(?:\.js)?['"]/);
    expect(source).toMatch(/export\s+async\s+function\s+mountPdfPreview\s*\(/);
    expect(source).toMatch(/authorizeFilingOutput\s*\(.*capability:\s*['"]preview['"]/s);
    expect(source).toMatch(/authorization\.status\s*!==\s*['"]allowed['"]/);
  });

  test('pdf-preview.js gates printGeneratedPdf through authorizeFilingOutput with print capability', async () => {
    const source = await readFile(
      new URL('../../src/core/pdf/pdf-preview.js', import.meta.url),
      'utf8'
    );

    expect(source).toMatch(/export\s+async\s+function\s+printGeneratedPdf\s*\(/);
    expect(source).toMatch(/authorizeFilingOutput\s*\(.*capability:\s*['"]print['"]/s);
    expect(source).toMatch(/authorization\.status\s*!==\s*['"]allowed['"]/);

    const printStart = source.indexOf('function printGeneratedPdf');
    const authIdx = source.indexOf('authorizeFilingOutput', printStart);
    const openIdx = source.indexOf('window.open', printStart);
    expect(authIdx).toBeGreaterThan(printStart);
    expect(openIdx).toBeGreaterThan(authIdx);
  });
});
