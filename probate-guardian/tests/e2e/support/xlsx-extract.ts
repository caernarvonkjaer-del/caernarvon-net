import JSZip from 'jszip';

// Milestone 33, Phase 3.1: Lightweight XLSX inspector using jszip (already an
// installed devDependency), mirroring tests/e2e/support/docx-extract.ts.
// DOCX and XLSX are both zip archives of XML parts (Open Packaging Conventions).
// This inspects xl/workbook.xml, xl/sharedStrings.xml, xl/worksheets/sheet*.xml,
// and docProps/core.xml directly to extract structured observations without
// pulling in an external Node-side spreadsheet dependency.

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractTagText(xml: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? decodeXmlEntities(match[1]) : '';
}

export type XlsxInfo = {
  /** Declared sheet names from xl/workbook.xml in document order. */
  sheetNames: string[];
  /** Look up a cell's string/formatted value by sheet name and coordinate (e.g. ('PART I', 'C5')). */
  getCell: (sheetName: string, cellRef: string) => string | null;
  /** Returns all populated cells for a given sheet as coordinate-value pairs. */
  getSheetCells: (sheetName: string) => Record<string, string>;
  /** All visible text strings found in the workbook (shared strings and cell values). */
  allText: string;
  /** Document title from docProps/core.xml, if present. */
  title: string;
  /** Document subject from docProps/core.xml, if present. */
  subject: string;
};

/**
 * Unzips a generated or template .xlsx archive and parses its workbook definition,
 * shared string table, worksheet cells, and core properties.
 */
export async function extractXlsx(xlsxData: Uint8Array | Buffer): Promise<XlsxInfo> {
  const zip = await JSZip.loadAsync(xlsxData);

  // 1. Read workbook definition to get sheet names and relationship IDs
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  if (workbookXml === undefined) {
    throw new Error('extractXlsx: xl/workbook.xml not found in archive');
  }

  type SheetMeta = { name: string; rId: string; sheetId: string };
  const sheets: SheetMeta[] = [];
  const sheetTagRegex = /<sheet\b([^>]*?)(?:\/>|>[\s\S]*?<\/sheet>)/g;
  let sm: RegExpExecArray | null;
  while ((sm = sheetTagRegex.exec(workbookXml)) !== null) {
    const attrs = sm[1];
    const nameMatch = /\bname="([^"]+)"/.exec(attrs);
    const rIdMatch = /\br:id="([^"]+)"/.exec(attrs);
    const sheetIdMatch = /\bsheetId="([^"]+)"/.exec(attrs);
    if (nameMatch) {
      sheets.push({
        name: decodeXmlEntities(nameMatch[1]),
        rId: rIdMatch ? rIdMatch[1] : '',
        sheetId: sheetIdMatch ? sheetIdMatch[1] : '',
      });
    }
  }

  // 2. Map relationship IDs to worksheet archive paths (xl/_rels/workbook.xml.rels)
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  const relMap = new Map<string, string>();
  if (relsXml) {
    const relRegex = /<Relationship\b([^>]*?)\/>/g;
    let rm: RegExpExecArray | null;
    while ((rm = relRegex.exec(relsXml)) !== null) {
      const attrs = rm[1];
      const idMatch = /\bId="([^"]+)"/.exec(attrs);
      const targetMatch = /\bTarget="([^"]+)"/.exec(attrs);
      if (idMatch && targetMatch) {
        let target = targetMatch[1].replace(/^\/?xl\//, '');
        relMap.set(idMatch[1], `xl/${target}`);
      }
    }
  }

  // 3. Shared string table (xl/sharedStrings.xml)
  const sharedStrings: string[] = [];
  const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  if (sharedStringsXml) {
    const siRegex = /<si>([\s\S]*?)<\/si>/g;
    let siMatch: RegExpExecArray | null;
    while ((siMatch = siRegex.exec(sharedStringsXml)) !== null) {
      const siContent = siMatch[1];
      const runs: string[] = [];
      const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
      let tm: RegExpExecArray | null;
      while ((tm = tRegex.exec(siContent)) !== null) {
        runs.push(decodeXmlEntities(tm[1]));
      }
      sharedStrings.push(runs.join(''));
    }
  }

  // 4. Parse cells per sheet
  const sheetCellsMap = new Map<string, Map<string, string>>();
  const allTextSnippets: string[] = [...sharedStrings];

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const sheetPath = (sheet.rId && relMap.get(sheet.rId)) || `xl/worksheets/sheet${i + 1}.xml`;
    const sheetFile = zip.file(sheetPath);
    const cellMap = new Map<string, string>();

    if (sheetFile) {
      const sheetXml = await sheetFile.async('string');
      const cellRegex = /<c\b([^>]*?)(?:>([\s\S]*?)<\/c>|\/>)/g;
      let cm: RegExpExecArray | null;
      while ((cm = cellRegex.exec(sheetXml)) !== null) {
        const attrs = cm[1];
        const content = cm[2] || '';
        const rMatch = /\br="([A-Z0-9]+)"/.exec(attrs);
        if (!rMatch) continue;
        const cellRef = rMatch[1];

        const tMatch = /\bt="([a-zA-Z]+)"/.exec(attrs);
        const cellType = tMatch ? tMatch[1] : '';

        let cellValue = '';
        if (cellType === 's') {
          // Shared string reference
          const vMatch = /<v>(\d+)<\/v>/.exec(content);
          if (vMatch) {
            const idx = parseInt(vMatch[1], 10);
            cellValue = sharedStrings[idx] ?? '';
          }
        } else if (cellType === 'inlineStr') {
          // Inline string
          const runs: string[] = [];
          const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
          let tm: RegExpExecArray | null;
          while ((tm = tRegex.exec(content)) !== null) {
            runs.push(decodeXmlEntities(tm[1]));
          }
          cellValue = runs.join('');
        } else if (cellType === 'b') {
          // Boolean
          const vMatch = /<v>([01])<\/v>/.exec(content);
          cellValue = vMatch ? (vMatch[1] === '1' ? 'TRUE' : 'FALSE') : '';
        } else {
          // Default numeric, direct string, or formula result in <v>
          const vMatch = /<v>([\s\S]*?)<\/v>/.exec(content);
          if (vMatch) {
            cellValue = decodeXmlEntities(vMatch[1]);
          }
        }

        if (cellValue !== '') {
          cellMap.set(cellRef, cellValue);
          allTextSnippets.push(cellValue);
        }
      }
    }

    sheetCellsMap.set(sheet.name, cellMap);
  }

  // 5. docProps/core.xml metadata
  const coreXml = await zip.file('docProps/core.xml')?.async('string');
  const title = coreXml ? extractTagText(coreXml, 'dc:title') : '';
  const subject = coreXml ? extractTagText(coreXml, 'dc:subject') : '';

  return {
    sheetNames: sheets.map((s) => s.name),
    getCell: (sheetName: string, cellRef: string) => {
      // Normalize exact sheet name lookup, with trimmed fallback
      const map = sheetCellsMap.get(sheetName) || sheetCellsMap.get(sheetName.trim());
      if (!map) return null;
      return map.get(cellRef.toUpperCase()) ?? null;
    },
    getSheetCells: (sheetName: string) => {
      const map = sheetCellsMap.get(sheetName) || sheetCellsMap.get(sheetName.trim());
      if (!map) return {};
      const obj: Record<string, string> = {};
      for (const [k, v] of map.entries()) {
        obj[k] = v;
      }
      return obj;
    },
    allText: allTextSnippets.join(' '),
    title,
    subject,
  };
}

