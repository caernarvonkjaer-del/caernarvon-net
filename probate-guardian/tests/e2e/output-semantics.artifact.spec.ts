import { test, expect, type Page, type Locator } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, fillMinimalValidAnnualWard,
  fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard,
  fillMinimalValidPlanSimplifiedWard, fillMinimalValidPlanAnnualWard,
  fillMinimalValidPlanInitialWard, fillMinimalValidPlanMinorWard,
} from './support/target';
import { inspectPdf, extractPdfText } from './support/pdf-extract';
import { extractDocx } from './support/docx-extract';
import { extractXlsx } from './support/xlsx-extract';
import {
  filingCapabilities, expectedPdfMetadataTitle, expectedLegalCopy, type FilingType,
} from './support/filing-matrix';

// Milestone 33, Phase 3: Semantic Artifact Assertions (*.artifact.spec.ts per Phase 4.2).
// Proves generated outputs (PDF, DOCX, XLSX) across all 9 filing types satisfy
// the four capability layers defined in Phase 3.2:
// 1. Transport: download event, correct extension, nonempty bytes, file signature/magic bytes.
// 2. Identity: authoritative document title, metadata title/subject, filename stem.
// 3. Meaning: required section headings, filing-specific legal attestations/oaths
//    (proving Final/Trust distinct from Annual), and user-entered case values.
// 4. Structure: XLSX sheet/cell data where supported, explicit absence where not;
//    PDF supplemental document page placement immediately following its target schedule.

type ArtifactConfig = {
  filingType: FilingType;
  createFiling: (page: Page, name: string) => Promise<void>;
  exportActionAttr: string;
  savePdfValue: string;
  saveWordValue: string;
  saveExcelValue: string | null;
  filenameStem: string;
  expectedCaseNumber: string;
};

async function setAnnualFamilyIdentity(page: Page, id: FilingType): Promise<void> {
  await fillMinimalValidAnnualWard(page);
  if (id !== 'annual') {
    const filingTypeValue = id === 'finalAccounting' ? 'Final' : 'Trust';
    await page.evaluate((v) => { (window as any).D.filingType = v; }, filingTypeValue);
    await page.evaluate(() => (window as any).autoSave());
    await page.evaluate(() => (window as any).flushPendingSave());
  }
}

const CONFIGS: ArtifactConfig[] = [
  {
    filingType: 'annual',
    createFiling: async (page, name) => { await createWard(page, name, 'annual'); await setAnnualFamilyIdentity(page, 'annual'); },
    exportActionAttr: 'data-annual-action', savePdfValue: 'save-pdf', saveWordValue: 'save-word', saveExcelValue: 'save-excel',
    filenameStem: 'AnnualAccounting', expectedCaseNumber: '2026-CP-000789',
  },
  {
    filingType: 'finalAccounting',
    createFiling: async (page, name) => { await createWard(page, name, 'finalAccounting'); await setAnnualFamilyIdentity(page, 'finalAccounting'); },
    exportActionAttr: 'data-annual-action', savePdfValue: 'save-pdf', saveWordValue: 'save-word', saveExcelValue: 'save-excel',
    filenameStem: 'FinalAccounting', expectedCaseNumber: '2026-CP-000789',
  },
  {
    filingType: 'trustAccounting',
    createFiling: async (page, name) => { await createWard(page, name, 'trustAccounting'); await setAnnualFamilyIdentity(page, 'trustAccounting'); },
    exportActionAttr: 'data-annual-action', savePdfValue: 'save-pdf', saveWordValue: 'save-word', saveExcelValue: 'save-excel',
    filenameStem: 'TrustAccounting', expectedCaseNumber: '2026-CP-000789',
  },
  {
    filingType: 'guardian',
    createFiling: async (page, name) => { await createWard(page, name, 'guardian'); await fillMinimalValidGuardianWard(page); },
    exportActionAttr: 'data-inventory-action', savePdfValue: 'save-pdf', saveWordValue: 'save-word', saveExcelValue: 'save-excel',
    filenameStem: 'InitialInventory', expectedCaseNumber: '2026-CP-000123',
  },
  {
    filingType: 'simplified',
    createFiling: async (page, name) => { await createSimplifiedWard(page, name); await fillMinimalValidSimplifiedWard(page); },
    exportActionAttr: 'data-simplified-action', savePdfValue: 'save-pdf', saveWordValue: 'save-word', saveExcelValue: 'save-excel',
    filenameStem: 'SimplifiedAccounting', expectedCaseNumber: '2026-CP-000456',
  },
  {
    filingType: 'planAnnual',
    createFiling: async (page, name) => { await createWard(page, name, 'planAnnual'); await fillMinimalValidPlanAnnualWard(page); },
    exportActionAttr: 'data-form-action', savePdfValue: 'save-pdf-plan-annual', saveWordValue: 'save-word-plan-annual', saveExcelValue: null,
    filenameStem: 'AnnualGuardianshipPlan', expectedCaseNumber: '2026-CP-000321',
  },
  {
    filingType: 'planInitial',
    createFiling: async (page, name) => { await createWard(page, name, 'planInitial'); await fillMinimalValidPlanInitialWard(page); },
    exportActionAttr: 'data-form-action', savePdfValue: 'save-pdf-plan-initial', saveWordValue: 'save-word-plan-initial', saveExcelValue: null,
    filenameStem: 'InitialGuardianshipPlan', expectedCaseNumber: '2026-CP-000654',
  },
  {
    filingType: 'planMinor',
    createFiling: async (page, name) => { await createWard(page, name, 'planMinor'); await fillMinimalValidPlanMinorWard(page); },
    exportActionAttr: 'data-form-action', savePdfValue: 'save-pdf-plan-minor', saveWordValue: 'save-word-plan-minor', saveExcelValue: null,
    filenameStem: 'AnnualPlanMinors', expectedCaseNumber: '2026-CP-000987',
  },
  {
    filingType: 'planSimplified',
    createFiling: async (page, name) => { await createWard(page, name, 'planSimplified'); await fillMinimalValidPlanSimplifiedWard(page); },
    exportActionAttr: 'data-plan-simplified-action', savePdfValue: 'save-pdf', saveWordValue: 'save-word', saveExcelValue: null,
    filenameStem: 'SimplifiedAnnualPlan', expectedCaseNumber: '2026-CP-000789',
  },
];

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

function isZipMagic(bytes: Buffer): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

test.describe('Output semantics artifact contract (Milestone 33, Phase 3)', () => {
  for (const config of CONFIGS) {
    const {
      filingType: id, createFiling, exportActionAttr, savePdfValue,
      saveWordValue, saveExcelValue, filenameStem, expectedCaseNumber,
    } = config;
    const expected = filingCapabilities(id);
    const legal = expectedLegalCopy(id);
    const pdfActionSelector = `[${exportActionAttr}="${savePdfValue}"]`;
    const wordActionSelector = `[${exportActionAttr}="${saveWordValue}"]`;

    test(`${id}: PDF, DOCX, and XLSX satisfy transport, identity, and semantic meaning`, async ({ page }) => {
      await freshStartNoPassword(page);
      const wardName = `${expected.displayName} Artifact Ward`;
      await createFiling(page, wardName);
      await page.evaluate(() => (window as any).navigate('/print'));

      // ─────────────────────────────────────────────────────────────────────────
      // 1. PDF Semantic Assertions
      // ─────────────────────────────────────────────────────────────────────────
      const pdfDownloadPromise = page.waitForEvent('download', { timeout: 25_000 });
      await page.locator(pdfActionSelector).click();
      const pdfDownload = await pdfDownloadPromise;

      // Layer 1: Transport
      expect(pdfDownload.suggestedFilename()).toMatch(new RegExp(`_${filenameStem}\\.pdf$`));
      const pdfBytes = await readAll(await pdfDownload.createReadStream());
      expect(pdfBytes.length, 'PDF artifact must not be empty').toBeGreaterThan(2000);
      expect(pdfBytes.subarray(0, 5).toString('latin1'), 'PDF must start with %PDF- file signature').toBe('%PDF-');

      // Layer 2: Identity
      const pdf = await inspectPdf(pdfBytes);
      expect(pdf.metadata.title).toContain(expected.displayName);
      expect(pdf.metadata.title).toContain(wardName);
      expect(pdf.metadata.title).toContain(expectedCaseNumber);
      expect(pdf.metadata.subject).toContain(expected.displayName);
      expect(pdf.text).toContain(expected.documentTitle);

      // Layer 3: Meaning (headings, legal attestations, case values)
      for (const heading of legal.requiredHeadings) {
        expect(pdf.text, `${id} PDF must contain required section heading "${heading}"`).toContain(heading);
      }
      for (const statement of legal.requiredStatements) {
        expect(pdf.text, `${id} PDF must contain required legal attestation copy`).toContain(statement);
      }
      if (legal.prohibitedStatements) {
        for (const prohibited of legal.prohibitedStatements) {
          expect(pdf.text, `${id} PDF must not contain aliased type legal copy`).not.toContain(prohibited);
        }
      }
      expect(pdf.text, `${id} PDF text must contain ward name`).toContain(wardName);
      expect(pdf.text, `${id} PDF text must contain case number`).toContain(expectedCaseNumber);
      expect(pdf.text, `${id} PDF text must contain guardian name`).toContain('Sample Guardian');

      // ─────────────────────────────────────────────────────────────────────────
      // 2. DOCX Semantic Assertions
      // ─────────────────────────────────────────────────────────────────────────
      const docxDownloadPromise = page.waitForEvent('download', { timeout: 25_000 });
      await page.locator(wordActionSelector).click();
      const docxDownload = await docxDownloadPromise;

      // Layer 1: Transport
      expect(docxDownload.suggestedFilename()).toMatch(new RegExp(`_${filenameStem}\\.docx$`));
      const docxBytes = await readAll(await docxDownload.createReadStream());
      expect(docxBytes.length, 'DOCX artifact must not be empty').toBeGreaterThan(2000);
      expect(isZipMagic(docxBytes), 'DOCX must carry PK zip magic bytes').toBe(true);

      // Layer 2: Identity
      const docx = await extractDocx(docxBytes);
      expect(docx.title).toContain(expected.displayName);
      expect(docx.visibleText).toContain(expected.documentTitle);

      // Layer 3: Meaning (headings, legal attestations, case values)
      for (const heading of legal.requiredHeadings) {
        expect(docx.visibleText, `${id} DOCX must contain required section heading "${heading}"`).toContain(heading);
      }
      for (const statement of legal.requiredStatements) {
        expect(docx.visibleText, `${id} DOCX must contain required legal attestation copy`).toContain(statement);
      }
      if (legal.prohibitedStatements) {
        for (const prohibited of legal.prohibitedStatements) {
          expect(docx.visibleText, `${id} DOCX must not contain aliased type legal copy`).not.toContain(prohibited);
        }
      }
      expect(docx.visibleText.toUpperCase(), `${id} DOCX visible text must contain ward name`).toContain(wardName.toUpperCase());
      expect(docx.visibleText, `${id} DOCX visible text must contain case number`).toContain(expectedCaseNumber);
      expect(docx.visibleText, `${id} DOCX visible text must contain guardian name`).toContain('Sample Guardian');

      // ─────────────────────────────────────────────────────────────────────────
      // 3. XLSX Semantic Assertions (or declared absence)
      // ─────────────────────────────────────────────────────────────────────────
      if (expected.exports.xlsx) {
        expect(saveExcelValue).not.toBeNull();
        const excelActionSelector = `[${exportActionAttr}="${saveExcelValue}"]`;
        await expect(page.locator(excelActionSelector)).toBeEnabled();

        const xlsxDownloadPromise = page.waitForEvent('download', { timeout: 25_000 });
        await page.locator(excelActionSelector).click();
        const xlsxDownload = await xlsxDownloadPromise;

        // Layer 1: Transport
        expect(xlsxDownload.suggestedFilename()).toMatch(/\.xlsx$/i);
        const xlsxBytes = await readAll(await xlsxDownload.createReadStream());
        expect(xlsxBytes.length, 'XLSX artifact must not be empty').toBeGreaterThan(2000);
        expect(isZipMagic(xlsxBytes), 'XLSX must carry PK zip magic bytes').toBe(true);

        // Layer 2 & 3: Identity & Meaning
        const xlsx = await extractXlsx(xlsxBytes);
        if (id === 'annual' || id === 'finalAccounting' || id === 'trustAccounting') {
          expect(xlsx.sheetNames).toContain('PART I');
          expect(xlsx.sheetNames).toContain('PART II, III');
          expect(xlsx.getCell('PART I', 'C5')).toBe(wardName);
          expect(xlsx.getCell('PART I', 'I5')).toBe(expectedCaseNumber);
          expect(xlsx.getCell('PART I', 'D20')).toBe('Sample Guardian');

          // Part I cell H4 holds the authoritative distinct filing type value
          const expectedFilingType = id === 'finalAccounting' ? 'Final' : id === 'trustAccounting' ? 'Trust' : 'Annual';
          expect(xlsx.getCell('PART I', 'H4'), `${id} XLSX cell H4 must declare distinct filing type`).toBe(expectedFilingType);
        } else if (id === 'simplified') {
          const p12Name = xlsx.sheetNames.find((s) => s.trim() === 'PARTS I, II') || 'PARTS I, II ';
          expect(xlsx.getCell(p12Name, 'C4')).toBe(wardName);
          expect(xlsx.getCell(p12Name, 'H4')).toBe(expectedCaseNumber);
          expect(xlsx.getCell(p12Name, 'D17')).toBe('Sample Guardian');
        } else if (id === 'guardian') {
          const sum1Name = xlsx.sheetNames.find((s) => s.trim() === 'SUMMARY I') || 'SUMMARY I ';
          expect(xlsx.getCell(sum1Name, 'C7')).toBe(wardName);
          expect(xlsx.getCell(sum1Name, 'H7')).toBe(expectedCaseNumber);
          expect(xlsx.getCell(sum1Name, 'D23')).toBe('Sample Guardian');
        }
      } else {
        // For forms without XLSX export (Plan types), confirm no Excel button is exposed
        await expect(page.locator(`[${exportActionAttr}="save-excel"]`)).toHaveCount(0);
      }
    });
  }

  test('PDF Schedule A supplemental document insertion occurs directly after Schedule A content', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Schedule A Supplemental Order Ward', 'annual');

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

      // 1-page mock supporting document for Schedule A
      const attachDoc = await createJsPdfInstance();
      attachDoc.setFontSize(16);
      attachDoc.text('SCHEDULE A ATTACHMENT: Official SSA Award Letter for 2026-2027', 50, 100);
      const attachmentDataUrl = attachDoc.output('datauristring');
      const attachmentDigest = await digestDataUrl(attachmentDataUrl);

      const periodKey = `${d.periodFrom}__${d.periodTo}`;
      d.scheduleDocs = {
        schA: {
          [periodKey]: {
            comment: 'Official SSA Award Letter for 2026-2027.',
            files: [{
              id: 'test-ssa-award-doc',
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

      return {
        rawPdfString: new TextDecoder('latin1').decode(rawPdfBytes),
      };
    });

    // Milestone 33, Phase 3.2: "The uploaded Schedule A document must occur
    // immediately after its Schedule A content, not merely be detected in the source data."
    const fullText = await extractPdfText(result.rawPdfString);
    const schAIndex = fullText.indexOf('SCHEDULE A: Income Received During Period');
    const attachmentIndex = fullText.indexOf('SCHEDULE A ATTACHMENT: Official SSA Award Letter for 2026-2027');
    const schB1Index = fullText.indexOf('SCHEDULE B-1: Attorney Fees');

    expect(schAIndex, 'Schedule A heading must be present').toBeGreaterThan(-1);
    expect(attachmentIndex, 'Attachment text must be present in output').toBeGreaterThan(-1);
    expect(schB1Index, 'Schedule B-1 heading must be present').toBeGreaterThan(-1);

    // Attachment occurs after Schedule A and before Schedule B-1
    expect(attachmentIndex, 'Attachment must occur after Schedule A content').toBeGreaterThan(schAIndex);
    expect(schB1Index, 'Schedule B-1 must occur after Schedule A attachment').toBeGreaterThan(attachmentIndex);
  });
});

