import JSZip from 'jszip';

// Milestone 33, Phase 3.1: DOCX is a zip of XML parts, same as XLSX would be
// -- there is no DOCX-parsing dependency available to Playwright's Node-side
// test code beyond jszip (already a devDependency), so this reads the raw
// XML parts src/core/docx/docx-engine.js writes (word/document.xml,
// docProps/core.xml) rather than pulling in a full OOXML library.

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

export type DocxInfo = {
  /** Concatenated text of every <w:t> run in word/document.xml, space-joined. */
  visibleText: string;
  title: string;
  subject: string;
};

/**
 * Unzips a generated .docx (from generateCourtFormDocx()) and returns its
 * visible body text and docProps/core.xml identity fields, for the same
 * kind of "does the artifact actually say what we expect" check
 * extractPdfText()/getPdfMetadata() do for PDFs.
 */
export async function extractDocx(docxData: Uint8Array | Buffer): Promise<DocxInfo> {
  const zip = await JSZip.loadAsync(docxData);

  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (documentXml === undefined) throw new Error('extractDocx: word/document.xml not found in archive');
  const runs: string[] = [];
  const runPattern = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = runPattern.exec(documentXml)) !== null) {
    runs.push(decodeXmlEntities(m[1]));
  }

  const coreXml = await zip.file('docProps/core.xml')?.async('string');
  if (coreXml === undefined) throw new Error('extractDocx: docProps/core.xml not found in archive');

  return {
    visibleText: runs.join(' '),
    title: extractTagText(coreXml, 'dc:title'),
    subject: extractTagText(coreXml, 'dc:subject'),
  };
}
