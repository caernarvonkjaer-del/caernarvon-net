global.window = global;

import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { extractXlsx } from '../e2e/support/xlsx-extract.ts';

const { annualTemplate, simplifiedTemplate, guardianTemplate } = await import('../../src/core/persistence/templates.js');

describe('xlsx-extract helper (Milestone 33, Phase 3.1)', () => {
  test('parses Annual Accounting bundled template sheets and shared strings', async () => {
    const buf = Buffer.from(annualTemplate, 'base64');
    const info = await extractXlsx(buf);

    expect(info.sheetNames).toContain('PART I');
    expect(info.sheetNames).toContain('PART II, III');
    expect(info.sheetNames).toContain('PART IV, V');
    expect(info.sheetNames).toContain('SCH A INCOME p1');
    expect(info.sheetNames).toContain('SCH B-1 ATTORNEY FEES');
    expect(info.sheetNames.length).toBeGreaterThanOrEqual(10);
    expect(info.allText.length).toBeGreaterThan(100);
  });

  test('parses Simplified Accounting bundled template sheets', async () => {
    const buf = Buffer.from(simplifiedTemplate, 'base64');
    const info = await extractXlsx(buf);

    // Simplified template's worksheet name has a trailing space: 'PARTS I, II '
    const hasPart12 = info.sheetNames.some((s) => s.trim() === 'PARTS I, II');
    expect(hasPart12).toBe(true);
    expect(info.sheetNames.some((s) => s.trim() === 'PARTS III, IV')).toBe(true);
  });

  test('parses Guardian Initial Inventory bundled template sheets', async () => {
    const buf = Buffer.from(guardianTemplate, 'base64');
    const info = await extractXlsx(buf);

    const hasSummary = info.sheetNames.some((s) => s.trim() === 'SUMMARY I');
    expect(hasSummary).toBe(true);
    expect(info.sheetNames.some((s) => s.includes('A-1-REAL ESTATE'))).toBe(true);
  });

  test('resolves shared strings, inline strings, booleans, and numbers from custom zip', async () => {
    const zip = new JSZip();

    zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="TestSheet" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);

    zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`);

    zip.file('xl/sharedStrings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" uniqueCount="2">
  <si><t>Shared Value A</t></si>
  <si><t>Shared Value &amp; B</t></si>
</sst>`);

    zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
      <c r="C1"><v>123.45</v></c>
      <c r="D1" t="b"><v>1</v></c>
      <c r="E1" t="inlineStr"><is><t>Inline Text</t></is></c>
    </row>
  </sheetData>
</worksheet>`);

    zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Test Workbook Title</dc:title>
  <dc:subject>Test Subject</dc:subject>
</cp:coreProperties>`);

    const data = await zip.generateAsync({ type: 'uint8array' });
    const info = await extractXlsx(data);

    expect(info.sheetNames).toEqual(['TestSheet']);
    expect(info.title).toBe('Test Workbook Title');
    expect(info.subject).toBe('Test Subject');
    expect(info.getCell('TestSheet', 'A1')).toBe('Shared Value A');
    expect(info.getCell('TestSheet', 'B1')).toBe('Shared Value & B');
    expect(info.getCell('TestSheet', 'C1')).toBe('123.45');
    expect(info.getCell('TestSheet', 'D1')).toBe('TRUE');
    expect(info.getCell('TestSheet', 'E1')).toBe('Inline Text');
    expect(info.getCell('TestSheet', 'Z99')).toBeNull();

    const allCells = info.getSheetCells('TestSheet');
    expect(allCells.A1).toBe('Shared Value A');
    expect(allCells.C1).toBe('123.45');
  });
});
