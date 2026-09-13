import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { generateCourtFormDocx } from '../../src/core/docx/docx-engine.js';
import { buildVerifiedInventoryModel } from '../../src/features/guardian-inventory/pdf-model.js';
import { buildSimplifiedAccountingModel } from '../../src/features/simplified-accounting/pdf-model.js';
import { buildAnnualAccountingModel } from '../../src/features/annual-accounting/pdf-model.js';
import { buildPlanSimplifiedModel } from '../../src/features/plan-simplified/pdf-model.js';

describe('docx-engine generator', () => {
  test('generates a valid Office Open XML ZIP package with all required parts', async () => {
    const mockD = {
      wardName: 'Arthur Dent',
      caseNumber: '2026-CP-001234',
      county: 'Pinellas',
      gid: '2025-01-15',
      guardianName: 'Ford Prefect',
      attorneyForGuardian: 'Trillian Astra',
      typeOfGuardianship: 'Plenary',
      scheduleA1: [{ propertyDescription: 'Homestead', streetAddress: '42 Galaxy Way', cityStateZip: 'Clearwater, FL 33756', fullAssetValue: 250000, wardPercent: 100 }],
      scheduleA2: [],
      scheduleB1: [{ institutionName: 'First Galactic Bank', accountType: 'Checking', fullAssetAmount: 15000, streetAddress: '100 Bank St', cityStateZip: 'Tampa, FL 33602' }],
      scheduleB2: [],
      scheduleB3: [],
      scheduleB4: [],
      scheduleC1: [],
      scheduleC2: [],
      scheduleC3: [],
      scheduleC4: [],
      scheduleC5: [],
      guardians: [{ name: 'Ford Prefect', signatureDate: '2026-09-01', ssnEin: '123-45-6789', phone: '555-0199', streetAddress: '42 Galaxy Way', cityStateZip: 'Clearwater, FL 33756' }],
      preparer: { name: 'Ford Prefect', signatureDate: '2026-09-01', ssnEin: '123-45-6789', phone: '555-0199', streetAddress: '42 Galaxy Way', cityStateZip: 'Clearwater, FL 33756' },
      attorney: { name: 'Trillian Astra', signatureDate: '2026-09-01', filingDate: '2026-09-01', barNumber: '123456', phone: '555-0100', streetAddress: '1 Law Plaza', cityStateZip: 'Tampa, FL 33602' },
      serviceRecipients: [{ name: 'Zaphod Beeblebrox', address: '99 President Blvd', cityStateZip: 'Miami, FL 33101' }],
      serviceDate: '2026-09-01',
      serviceAttorney: { name: 'Trillian Astra', signatureDate: '2026-09-01', barNumber: '123456', phone: '555-0100', streetAddress: '1 Law Plaza', cityStateZip: 'Tampa, FL 33602' },
      hasSafeDepositBox: false,
    };

    const model = buildVerifiedInventoryModel(mockD, { printDate: '2026-09-06' });
    const docxUint8 = await generateCourtFormDocx(model, { type: 'uint8array' });

    expect(docxUint8).toBeInstanceOf(Uint8Array);
    expect(docxUint8.length).toBeGreaterThan(1000);

    const zip = await JSZip.loadAsync(docxUint8);

    // Verify OPC structure
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    expect(zip.file('_rels/.rels')).not.toBeNull();
    expect(zip.file('word/_rels/document.xml.rels')).not.toBeNull();
    expect(zip.file('word/document.xml')).not.toBeNull();
    expect(zip.file('word/styles.xml')).not.toBeNull();
    expect(zip.file('word/settings.xml')).not.toBeNull();
    expect(zip.file('word/header1.xml')).not.toBeNull();
    expect(zip.file('word/footer1.xml')).not.toBeNull();
    expect(zip.file('docProps/core.xml')).not.toBeNull();
    expect(zip.file('docProps/app.xml')).not.toBeNull();

    const docXml = await zip.file('word/document.xml').async('text');
    const headerXml = await zip.file('word/header1.xml').async('text');
    const footerXml = await zip.file('word/footer1.xml').async('text');

    // 1-inch margins (1440 twips) and Letter dimensions (12240 x 15840)
    expect(docXml).toContain('w:top="1440"');
    expect(docXml).toContain('w:right="1440"');
    expect(docXml).toContain('w:bottom="1440"');
    expect(docXml).toContain('w:left="1440"');
    expect(docXml).toContain('w:w="12240"');
    expect(docXml).toContain('w:h="15840"');

    // Content verification
    expect(docXml).toContain('ARTHUR DENT');
    expect(docXml).toContain('2026-CP-001234');
    expect(docXml).toContain('IN THE CIRCUIT COURT OF THE SIXTH JUDICIAL CIRCUIT');
    expect(docXml).toContain('PINELLAS COUNTY, FLORIDA');
    expect(docXml).toContain('Homestead');
    expect(docXml).toContain('First Galactic Bank');
    expect(docXml).toContain('Trillian Astra');

    // Header & Footer verification
    expect(headerXml).toContain('Arthur Dent');
    expect(headerXml).toContain('2026-CP-001234');
    expect(footerXml).toContain('fldSimple w:instr="PAGE"');
    expect(footerXml).toContain('fldSimple w:instr="NUMPAGES"');
  });

  test('renders tables with totals, checklists, and notices for simplified accounting and plan forms', async () => {
    const mockSimplifiedD = {
      wardName: 'Marvin Android',
      caseNumber: '2026-CP-009999',
      county: 'Hillsborough',
      periodFrom: '2025-01-01',
      periodTo: '2025-12-31',
      line1StartingAssets: 50000,
      line2Income: 12000,
      line3Disbursements: 8000,
      remuneration: [{ guardian: 'Marvin', type: 'Care', description: 'Assistance' }],
    };

    const simpModel = buildSimplifiedAccountingModel(mockSimplifiedD, { printDate: '2026-09-06' });
    const simpDocx = await generateCourtFormDocx(simpModel, { type: 'uint8array' });
    const simpZip = await JSZip.loadAsync(simpDocx);
    const simpDocXml = await simpZip.file('word/document.xml').async('text');

    expect(simpDocXml).toContain('MARVIN ANDROID');
    expect(simpDocXml).toContain('THIRTEENTH JUDICIAL CIRCUIT');
    expect(simpDocXml).toContain('HILLSBOROUGH COUNTY, FLORIDA');
    expect(simpDocXml).toContain('SIMPLIFIED');

    const mockPlanD = {
      wardName: 'Zaphod Beeblebrox',
      caseNumber: '2026-CP-007777',
      county: 'Miami-Dade',
      periodFrom: '2025-01-01',
      periodTo: '2025-12-31',
      q1Residences: 'Heart of Gold Ship',
      q2BestPlacement: 'Best captain quarters',
      q3MedicalTreatment: 'Regular checkups',
      q4Diagnosis: 'Two heads',
      q8LivingWill: true,
      q8DNR: false,
      planGuardians: [{ name: 'Ford Prefect', signatureDate: '2026-09-01' }],
    };

    const planModel = buildPlanSimplifiedModel(mockPlanD);
    const planDocx = await generateCourtFormDocx(planModel, { type: 'uint8array' });
    const planZip = await JSZip.loadAsync(planDocx);
    const planDocXml = await planZip.file('word/document.xml').async('text');

    expect(planDocXml).toContain('ZAPHOD BEEBLEBROX');
    expect(planDocXml).toContain('ELEVENTH JUDICIAL CIRCUIT');
    expect(planDocXml).toContain('MIAMI-DADE COUNTY, FLORIDA');
    expect(planDocXml).toContain('SIMPLIFIED ANNUAL PLAN');
    expect(planDocXml).toContain('Heart of Gold Ship');
  });

  // Milestone 40E. The DOCX writer reads the same model the PDF engine does, so
  // making a table cell an array of address lines changed this output too. Its
  // cell branch fell through to xmlEscape(cell), whose String() joins an array
  // with bare commas and no spaces -- worse than the ', ' join it replaced. The
  // cell now emits one <w:p> per component, mirroring the PDF.
  test('a multi-line address cell becomes one paragraph per component, not a comma-joined run', async () => {
    const model = buildAnnualAccountingModel({
      wardName: 'Arthur Dent',
      caseNumber: '2026-CP-001234',
      county: 'Pinellas',
      inventoryType: 'annual',
      certRecipients: [
        { name: 'Marcus Sterling, Esq.', line2: '100 2nd Ave S', line3: 'Suite 400', line4: 'St. Petersburg, FL 33701' },
      ],
    }, { printDate: '2026-09-12' });

    const docx = await generateCourtFormDocx(model, { type: 'uint8array' });
    const zip = await JSZip.loadAsync(docx);
    const xml = await zip.file('word/document.xml').async('text');

    // Each component present as its own run...
    expect(xml).toContain('<w:t>100 2nd Ave S</w:t>');
    expect(xml).toContain('<w:t>Suite 400</w:t>');
    expect(xml).toContain('<w:t>St. Petersburg, FL 33701</w:t>');
    // ...and never re-joined into one, by either the old separator or the bare
    // commas an unhandled array would have produced.
    expect(xml).not.toContain('100 2nd Ave S, Suite 400');
    expect(xml).not.toContain('100 2nd Ave S,Suite 400');
  });

  test('an empty address cell still emits a paragraph, keeping the table cell valid OOXML', async () => {
    const model = buildAnnualAccountingModel({
      wardName: 'Arthur Dent',
      caseNumber: '2026-CP-001234',
      county: 'Pinellas',
      inventoryType: 'annual',
      // Named recipient with no address at all: the cell is an empty array.
      certRecipients: [{ name: 'Recipient With No Address' }],
    }, { printDate: '2026-09-12' });

    const docx = await generateCourtFormDocx(model, { type: 'uint8array' });
    const zip = await JSZip.loadAsync(docx);
    const xml = await zip.file('word/document.xml').async('text');

    expect(xml).toContain('<w:t>Recipient With No Address</w:t>');
    // Every <w:tc> must contain at least one <w:p>; an empty one would make the
    // document unopenable in Word rather than merely look wrong. There are at
    // least as many paragraphs as cells, and no cell closes without one.
    const cellCount = (xml.match(/<w:tc>/g) || []).length;
    const paraCount = (xml.match(/<w:p>/g) || []).length;
    expect(cellCount).toBeGreaterThan(0);
    expect(paraCount).toBeGreaterThanOrEqual(cellCount);
    expect(xml).not.toMatch(/<w:tc>(?:(?!<w:p>)[\s\S])*?<\/w:tc>/);
  });

  test('handles supplemental documents with clear appendix reference and non-raster notice', async () => {
    const mockAnnualD = {
      wardName: 'Tricia McMillan',
      caseNumber: '2026-CP-005555',
      county: 'Orange',
      periodFrom: '2025-01-01',
      periodTo: '2025-12-31',
      scheduleA: [],
      scheduleB1: [],
      scheduleD1: [],
      guardians: [{ name: 'Tricia', signatureDate: '2026-09-01' }],
      preparer: 'Tricia',
      preparer_signatureDate: '2026-09-01',
      attorney: 'Lawyer',
      attorney_signatureDate: '2026-09-01',
      attorney_bar: '999999',
    };

    const model = buildAnnualAccountingModel(mockAnnualD, { printDate: '2026-09-06' });
    // Attach a mock supporting-documents block
    model.sections[0].blocks.push({
      type: 'supporting-documents',
      title: 'Schedule A Supporting Documents',
      comment: 'Bank Statement Attached',
      files: [{ name: 'BankStatement_2025.pdf', pageCount: 3 }],
    });

    const docxUint8 = await generateCourtFormDocx(model, { type: 'uint8array' });
    const zip = await JSZip.loadAsync(docxUint8);
    const docXml = await zip.file('word/document.xml').async('text');

    expect(docXml).toContain('Schedule A Supporting Documents');
    expect(docXml).toContain('Bank Statement Attached');
    expect(docXml).toContain('BankStatement_2025.pdf');
    expect(docXml).toContain('Supplemental PDF documents listed above must be filed separately with the court');
  });
});
