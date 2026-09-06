// Native OpenXML (.docx) generator for Probate Guardian court filings.
// Consumes the canonical court form model (metadata + sections + blocks)
// and produces a real, fully editable .docx document matching the PDF's
// exact court styling, typography, colors, table layouts, headers, and footers.

import {
  getFloridaCircuitCourtCaption,
  getCaseCaptionTitle,
} from '../pdf/circuit-lookup.js';

export async function getJSZip() {
  if (typeof window !== 'undefined' && window.JSZip) {
    return window.JSZip;
  }
  try {
    const mod = await import('jszip');
    return mod.default || mod;
  } catch (e) {
    if (typeof window !== 'undefined') {
      await import('../../../lib/jszip.min.js');
      if (window.JSZip) return window.JSZip;
    }
    throw new Error('JSZip library not available in environment.');
  }
}

function xmlEscape(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Letter page geometry in twips (1 inch = 1440 twips)
// Page width: 8.5 in * 1440 = 12240 twips
// Page height: 11.0 in * 1440 = 15840 twips
// Margins: 1.0 in = 1440 twips
// Content width: 12240 - 2880 = 9360 twips
const PAGE_WIDTH_TWIPS = 12240;
const PAGE_HEIGHT_TWIPS = 15840;
const MARGIN_TWIPS = 1440;
const CONTENT_WIDTH_TWIPS = 9360;

function buildContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function buildRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function buildDocumentRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/>
</Relationships>`;
}

function buildSettingsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:evenAndOddHeaders w:val="0"/>
</w:settings>`;
}

function buildCorePropsXml(metadata) {
  const created = new Date().toISOString();
  const title = xmlEscape(metadata.title || metadata.formName || 'Court Filing');
  const subject = xmlEscape(metadata.subject || metadata.formSubtitle || 'Florida Probate Guardianship Filing');
  const author = xmlEscape(metadata.author || 'Probate Guardian');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${title}</dc:title>
  <dc:subject>${subject}</dc:subject>
  <dc:creator>${author}</dc:creator>
  <cp:lastModifiedBy>${author}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
</cp:coreProperties>`;
}

function buildAppPropsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Probate Guardian</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>Probate Guardian</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>1.0000</AppVersion>
</Properties>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
        <w:color w:val="111827"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="230" w:lineRule="auto" w:before="0" w:after="0"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <!-- Normal -->
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>

  <!-- Heading 1 (Section / Part Title) -->
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="220" w:after="60" w:line="240" w:lineRule="auto"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="6" w:space="3" w:color="B4BECB"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:b/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>

  <!-- Heading 2 (Schedule / Subsection Title) -->
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="160" w:after="50" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:b/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
      <w:color w:val="1A2D4A"/>
    </w:rPr>
  </w:style>

  <!-- Heading 3 (Block / Table Title) -->
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="120" w:after="40" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:b/>
      <w:sz w:val="19"/>
      <w:szCs w:val="19"/>
      <w:color w:val="1A2D4A"/>
    </w:rPr>
  </w:style>

  <!-- Header -->
  <w:style w:type="paragraph" w:styleId="Header">
    <w:name w:val="header"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:spacing w:before="0" w:after="0" w:line="220" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:sz w:val="16"/>
      <w:szCs w:val="16"/>
      <w:color w:val="323C4B"/>
    </w:rPr>
  </w:style>

  <!-- Footer -->
  <w:style w:type="paragraph" w:styleId="Footer">
    <w:name w:val="footer"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:spacing w:before="0" w:after="0" w:line="220" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:sz w:val="16"/>
      <w:szCs w:val="16"/>
      <w:color w:val="6E7887"/>
    </w:rPr>
  </w:style>
</w:styles>`;
}

// Continuation header (Pages 2+) matching PDF continuation bar
function buildHeaderXml(metadata) {
  const county = (metadata.county || 'Pinellas').toUpperCase();
  const caption = getFloridaCircuitCourtCaption(county);
  const formTitle = xmlEscape((metadata.formName || metadata.title || 'VERIFIED INITIAL INVENTORY').toUpperCase());
  const wardName = xmlEscape(metadata.wardName || 'Ward');
  const caseNumber = xmlEscape(metadata.caseNumber || 'Pending');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Header"/>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="20"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="1A2D4A"/></w:rPr>
      <w:t>${xmlEscape(caption.line1)} ${xmlEscape(caption.line2)}</w:t>
    </w:r>
  </w:p>
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Header"/>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="40"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="17"/><w:color w:val="1A2D4A"/></w:rPr>
      <w:t>PROBATE DIVISION — ${formTitle}</w:t>
    </w:r>
  </w:p>
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="${CONTENT_WIDTH_TWIPS}" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
        <w:insideH w:val="none"/>
        <w:insideV w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
      </w:tblBorders>
      <w:shd w:val="clear" w:color="auto" w:fill="F8F9FB"/>
      <w:tblCellMar>
        <w:top w:w="40" w:type="dxa"/>
        <w:left w:w="100" w:type="dxa"/>
        <w:bottom w:w="40" w:type="dxa"/>
        <w:right w:w="100" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="3120"/>
      <w:gridCol w:w="3120"/>
      <w:gridCol w:w="3120"/>
    </w:tblGrid>
    <w:tr>
      <w:trPr><w:cantSplit/></w:trPr>
      <w:tc>
        <w:tcPr><w:tcW w:w="3120" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr><w:pStyle w:val="Header"/><w:spacing w:before="0" w:after="0"/></w:pPr>
          <w:r><w:t>Ward: ${wardName}</w:t></w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="3120" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr><w:pStyle w:val="Header"/><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
          <w:r><w:t>Florida Guardianship Report</w:t></w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="3120" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr><w:pStyle w:val="Header"/><w:jc w:val="right"/><w:spacing w:before="0" w:after="0"/></w:pPr>
          <w:r><w:t>Case #: ${caseNumber}</w:t></w:r>
        </w:p>
      </w:tc>
    </w:tr>
  </w:tbl>
  <w:p><w:pPr><w:spacing w:before="0" w:after="80"/></w:pPr></w:p>
</w:hdr>`;
}

// First page header (empty for clean cover)
function buildHeader2Xml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>
</w:hdr>`;
}

function buildFooterXml(metadata) {
  const footerSubtitle = xmlEscape(metadata.formSubtitle || metadata.formName || 'Florida Guardianship Report');
  const wardName = xmlEscape(metadata.wardName || 'Ward');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Footer"/>
      <w:pBdr>
        <w:top w:val="single" w:sz="4" w:space="4" w:color="DCE1EB"/>
      </w:pBdr>
      <w:tabs>
        <w:tab w:val="right" w:pos="${CONTENT_WIDTH_TWIPS}"/>
      </w:tabs>
      <w:spacing w:before="60" w:after="0"/>
    </w:pPr>
    <w:r>
      <w:t>${footerSubtitle} — ${wardName}</w:t>
    </w:r>
    <w:r>
      <w:tab/>
      <w:t xml:space="preserve">Page </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE"/>
    <w:r>
      <w:t xml:space="preserve"> of </w:t>
    </w:r>
    <w:fldSimple w:instr="NUMPAGES"/>
  </w:p>
</w:ftr>`;
}

function renderPleadingHeader(metadata) {
  const county = (metadata.county || 'Pinellas').toUpperCase();
  const caption = getFloridaCircuitCourtCaption(county);
  const wardName = metadata.wardName || 'Ward';
  const caseNumber = metadata.caseNumber || 'Pending';
  const caseCaption = getCaseCaptionTitle(wardName, metadata.wardType);
  const formTitle = (metadata.formName || metadata.title || 'VERIFIED INITIAL INVENTORY').toUpperCase();

  return `
  <!-- Florida Court Pleading Header (Page 1) -->
  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="20" w:line="230" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="000000"/></w:rPr>
      <w:t>${xmlEscape(caption.line1)}</w:t>
    </w:r>
  </w:p>
  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="20" w:line="230" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="000000"/></w:rPr>
      <w:t>${xmlEscape(caption.line2)}</w:t>
    </w:r>
  </w:p>
  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="20" w:line="230" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr>
      <w:t>${xmlEscape(caption.division)}</w:t>
    </w:r>
  </w:p>
  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="100" w:line="230" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr>
      <w:t>CASE #: ${xmlEscape(caseNumber)}</w:t>
    </w:r>
  </w:p>

  <w:p>
    <w:pPr>
      <w:spacing w:before="80" w:after="120" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="000000"/></w:rPr>
      <w:t>${xmlEscape(caseCaption)}</w:t>
    </w:r>
  </w:p>

  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="60" w:after="180" w:line="240" w:lineRule="auto"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="8" w:space="3" w:color="000000"/>
      </w:pBdr>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="25"/><w:szCs w:val="25"/><w:color w:val="000000"/></w:rPr>
      <w:t>${xmlEscape(formTitle)}</w:t>
    </w:r>
  </w:p>`;
}

function renderNoticeBlock(block) {
  const text = block.text || '';
  const lines = text.split('\n').filter(Boolean);
  return `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="${CONTENT_WIDTH_TWIPS}" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="D0D5DD"/>
        <w:left w:val="single" w:sz="18" w:space="0" w:color="1A2D4A"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D0D5DD"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="D0D5DD"/>
      </w:tblBorders>
      <w:shd w:val="clear" w:color="auto" w:fill="F8F9FB"/>
      <w:tblCellMar>
        <w:top w:w="80" w:type="dxa"/>
        <w:left w:w="120" w:type="dxa"/>
        <w:bottom w:w="80" w:type="dxa"/>
        <w:right w:w="120" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="${CONTENT_WIDTH_TWIPS}"/>
    </w:tblGrid>
    <w:tr>
      <w:tc>
        <w:tcPr><w:tcW w:w="${CONTENT_WIDTH_TWIPS}" w:type="dxa"/></w:tcPr>
        ${lines.map(line => `
        <w:p>
          <w:pPr>
            <w:spacing w:before="20" w:after="20" w:line="230" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="3C4655"/></w:rPr>
            <w:t>${xmlEscape(line)}</w:t>
          </w:r>
        </w:p>`).join('')}
      </w:tc>
    </w:tr>
  </w:tbl>`;
}

function renderKeyValueGridBlock(block, subHTag = 'Heading3') {
  let xml = '';
  if (block.title) {
    xml += `
    <w:p>
      <w:pPr><w:pStyle w:val="${subHTag}"/><w:spacing w:before="120" w:after="40"/></w:pPr>
      <w:r><w:t>${xmlEscape(block.title)}</w:t></w:r>
    </w:p>`;
  }

  const items = block.items || [];
  if (!items.length) return xml;

  const halfWidth = Math.floor(CONTENT_WIDTH_TWIPS / 2); // 4680 twips
  const labelColW = 2200; // 23.5%
  const valueColW = halfWidth - labelColW; // 2480 twips (26.5%)

  xml += `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="${CONTENT_WIDTH_TWIPS}" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="D0D5DD"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="D0D5DD"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D0D5DD"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="D0D5DD"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D0D5DD"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="50" w:type="dxa"/>
        <w:left w:w="80" w:type="dxa"/>
        <w:bottom w:w="50" w:type="dxa"/>
        <w:right w:w="80" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="${labelColW}"/>
      <w:gridCol w:w="${valueColW}"/>
      <w:gridCol w:w="${labelColW}"/>
      <w:gridCol w:w="${valueColW}"/>
    </w:tblGrid>`;

  for (let i = 0; i < items.length; i += 2) {
    const item1 = items[i];
    const item2 = items[i + 1];

    xml += `
    <w:tr>
      <w:trPr><w:cantSplit/></w:trPr>
      <!-- Item 1 Label -->
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${labelColW}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="F1F3F6"/>
        </w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="0" w:after="0" w:line="220" w:lineRule="auto"/></w:pPr>
          <w:r>
            <w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="374151"/></w:rPr>
            <w:t>${xmlEscape(item1?.label || '')}</w:t>
          </w:r>
        </w:p>
      </w:tc>
      <!-- Item 1 Value -->
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${item2 ? valueColW : (CONTENT_WIDTH_TWIPS - labelColW)}" w:type="dxa"/>
          ${item2 ? '' : '<w:gridSpan w:val="3"/>'}
        </w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="0" w:after="0" w:line="220" w:lineRule="auto"/></w:pPr>
          <w:r>
            <w:rPr><w:sz w:val="16"/><w:color w:val="111827"/></w:rPr>
            <w:t>${xmlEscape(item1?.value || '')}</w:t>
          </w:r>
        </w:p>
      </w:tc>`;

    if (item2) {
      xml += `
      <!-- Item 2 Label -->
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${labelColW}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="F1F3F6"/>
        </w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="0" w:after="0" w:line="220" w:lineRule="auto"/></w:pPr>
          <w:r>
            <w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="374151"/></w:rPr>
            <w:t>${xmlEscape(item2?.label || '')}</w:t>
          </w:r>
        </w:p>
      </w:tc>
      <!-- Item 2 Value -->
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${valueColW}" w:type="dxa"/>
        </w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="0" w:after="0" w:line="220" w:lineRule="auto"/></w:pPr>
          <w:r>
            <w:rPr><w:sz w:val="16"/><w:color w:val="111827"/></w:rPr>
            <w:t>${xmlEscape(item2?.value || '')}</w:t>
          </w:r>
        </w:p>
      </w:tc>`;
    }

    xml += `
    </w:tr>`;
  }

  xml += `
  </w:tbl>`;
  return xml;
}

function renderChecklistBlock(block, subHTag = 'Heading3') {
  let xml = '';
  if (block.title) {
    xml += `
    <w:p>
      <w:pPr><w:pStyle w:val="${subHTag}"/><w:spacing w:before="120" w:after="40"/></w:pPr>
      <w:r><w:t>${xmlEscape(block.title)}</w:t></w:r>
    </w:p>`;
  }

  const items = block.items || [];
  for (const item of items) {
    const label = item?.label || '';
    const checked = !!item?.checked;
    const boxSymbol = checked ? '☑' : '☐';
    const statePrefix = checked ? 'Yes — ' : 'No — ';

    xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="20" w:after="20" w:line="230" w:lineRule="auto"/>
        <w:ind w:left="180"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="${checked ? '1F7A3D' : '64748B'}"/></w:rPr>
        <w:t>${boxSymbol} </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="17"/><w:color w:val="${checked ? '1F7A3D' : '64748B'}"/></w:rPr>
        <w:t>${statePrefix}</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="17"/><w:color w:val="1E232D"/></w:rPr>
        <w:t>${xmlEscape(label)}</w:t>
      </w:r>
    </w:p>`;
  }

  return xml;
}

function renderTableBlock(block, subHTag = 'Heading3') {
  let xml = '';
  const { headers = [], rows = [], totals, colWidths, colAlign, title: tblTitle } = block;

  if (tblTitle) {
    xml += `
    <w:p>
      <w:pPr><w:pStyle w:val="${subHTag}"/><w:spacing w:before="140" w:after="50"/></w:pPr>
      <w:r><w:t>${xmlEscape(tblTitle)}</w:t></w:r>
    </w:p>`;
  }

  const widths = (colWidths || headers.map(() => 100 / headers.length))
    .map(pct => Math.round((pct / 100) * CONTENT_WIDTH_TWIPS));

  xml += `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="${CONTENT_WIDTH_TWIPS}" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="640019"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="50" w:type="dxa"/>
        <w:left w:w="80" w:type="dxa"/>
        <w:bottom w:w="50" w:type="dxa"/>
        <w:right w:w="80" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:tblGrid>
      ${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}
    </w:tblGrid>

    <!-- Deep Burgundy Table Header Row -->
    <w:tr>
      <w:trPr>
        <w:tblHeader/>
        <w:cantSplit/>
      </w:trPr>
      ${headers.map((h, hIdx) => {
        const align = (colAlign && colAlign[hIdx]) || 'left';
        const jcVal = align === 'right' ? 'right' : align === 'center' ? 'center' : 'left';
        return `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${widths[hIdx]}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="800020"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="${jcVal}"/>
              <w:spacing w:before="30" w:after="30" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="FFFFFF"/></w:rPr>
              <w:t>${xmlEscape(h)}</w:t>
            </w:r>
          </w:p>
        </w:tc>`;
      }).join('')}
    </w:tr>`;

  // Data Rows
  rows.forEach((row, rIdx) => {
    const isAlt = rIdx % 2 === 1;
    xml += `
    <w:tr>
      <w:trPr><w:cantSplit/></w:trPr>
      ${row.map((cell, cIdx) => {
        const align = (colAlign && colAlign[cIdx]) || 'left';
        const jcVal = align === 'right' ? 'right' : align === 'center' ? 'center' : 'left';
        return `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${widths[cIdx]}" w:type="dxa"/>
            ${isAlt ? '<w:shd w:val="clear" w:color="auto" w:fill="F9FAFC"/>' : ''}
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="${jcVal}"/>
              <w:spacing w:before="20" w:after="20" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr><w:sz w:val="16"/><w:color w:val="111827"/></w:rPr>
              <w:t>${xmlEscape(typeof cell === 'object' && cell !== null && 'main' in cell ? cell.main : cell)}</w:t>
            </w:r>
          </w:p>
          ${typeof cell === 'object' && cell !== null && Array.isArray(cell.sub) ? cell.sub.map(s => `
          <w:p>
            <w:pPr>
              <w:jc w:val="${jcVal}"/>
              <w:spacing w:before="0" w:after="10" w:line="180" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr>${s.italic ? '<w:i/>' : ''}<w:sz w:val="13"/><w:color w:val="64748B"/></w:rPr>
              <w:t>${xmlEscape(typeof s === 'string' ? s : s.text)}</w:t>
            </w:r>
          </w:p>`).join('') : ''}
        </w:tc>`;
      }).join('')}
    </w:tr>`;
  });

  // Totals Row
  if (totals) {
    const totalValues = Array.isArray(totals.values) && totals.values.length
      ? totals.values
      : [{ value: totals.value }];
    const labelColSpan = Math.max(1, headers.length - totalValues.length);
    let labelSpanWidth = 0;
    for (let k = 0; k < labelColSpan && k < widths.length; k++) labelSpanWidth += widths[k];

    xml += `
    <w:tr>
      <w:trPr><w:cantSplit/></w:trPr>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${labelSpanWidth}" w:type="dxa"/>
          ${labelColSpan > 1 ? `<w:gridSpan w:val="${labelColSpan}"/>` : ''}
          <w:shd w:val="clear" w:color="auto" w:fill="F1F3F6"/>
        </w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="30" w:after="30" w:line="220" w:lineRule="auto"/></w:pPr>
          <w:r>
            <w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="111827"/></w:rPr>
            <w:t>${xmlEscape(totals.label || 'Total')}</w:t>
          </w:r>
        </w:p>
      </w:tc>
      ${totalValues.map((tv, tvIdx) => {
        const colIdx = labelColSpan + tvIdx;
        const colW = widths[colIdx] || Math.floor((CONTENT_WIDTH_TWIPS - labelSpanWidth) / totalValues.length);
        return `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${colW}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F1F3F6"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="right"/>
              <w:spacing w:before="30" w:after="30" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="111827"/></w:rPr>
              <w:t>${xmlEscape(tv.value ?? '')}</w:t>
            </w:r>
          </w:p>
        </w:tc>`;
      }).join('')}
    </w:tr>`;
  }

  xml += `
  </w:tbl>`;
  return xml;
}

function renderSignatureBlock(block, subHTag = 'Heading3') {
  const isWetSignature = block.wetSignatureExplicit === true;
  const role = block.role || 'Signer';
  const signerName = block.signerName || '';
  const sigDate = block.signatureDate || '';
  const signatureText = block.signature || (signerName ? `/s/ ${signerName}` : '/s/');
  const fieldRows = Array.isArray(block.fields) ? block.fields : null;

  let xml = `
  <w:p>
    <w:pPr><w:pStyle w:val="${subHTag}"/><w:spacing w:before="140" w:after="30"/></w:pPr>
    <w:r><w:t>${xmlEscape(role)}</w:t></w:r>
  </w:p>`;

  // Signature line and Date table
  xml += `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="${CONTENT_WIDTH_TWIPS}" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="none"/>
        <w:left w:val="none"/>
        <w:bottom w:val="none"/>
        <w:right w:val="none"/>
        <w:insideH w:val="none"/>
        <w:insideV w:val="none"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="30" w:type="dxa"/>
        <w:left w:w="60" w:type="dxa"/>
        <w:bottom w:w="30" w:type="dxa"/>
        <w:right w:w="60" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="6000"/>
      <w:gridCol w:w="3360"/>
    </w:tblGrid>
    <w:tr>
      <w:trPr><w:cantSplit/></w:trPr>
      <w:tc>
        <w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="10" w:after="10" w:line="220" w:lineRule="auto"/></w:pPr>
          ${isWetSignature ? `
          <w:r>
            <w:rPr><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr>
            <w:t>_________________________________________</w:t>
          </w:r>` : `
          <w:r>
            <w:rPr><w:b/><w:sz w:val="21"/><w:color w:val="111827"/></w:rPr>
            <w:t>${xmlEscape(signatureText)}</w:t>
          </w:r>`}
        </w:p>
        <w:p>
          <w:pPr><w:spacing w:before="0" w:after="30" w:line="180" w:lineRule="auto"/></w:pPr>
          <w:r>
            <w:rPr><w:sz w:val="15"/><w:color w:val="64748B"/></w:rPr>
            <w:t>${isWetSignature ? `Signature of ${xmlEscape(signerName)}` : 'Signature (Electronic /s/ pursuant to Fla. R. Gen. Prac. &amp; Jud. Admin. 2.515)'}</w:t>
          </w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="3360" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="right"/><w:spacing w:before="10" w:after="10" w:line="220" w:lineRule="auto"/></w:pPr>
          <w:r>
            <w:rPr><w:sz w:val="17"/><w:color w:val="374151"/></w:rPr>
            <w:t>Date: ${xmlEscape(sigDate)}</w:t>
          </w:r>
        </w:p>
      </w:tc>
    </w:tr>
  </w:tbl>`;

  // Details or Fields grid
  if (fieldRows && fieldRows.length) {
    xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${CONTENT_WIDTH_TWIPS}" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
          <w:left w:val="none"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
          <w:right w:val="none"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="30" w:type="dxa"/>
          <w:left w:w="60" w:type="dxa"/>
          <w:bottom w:w="30" w:type="dxa"/>
          <w:right w:w="60" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>`;

    for (const row of fieldRows) {
      const numCols = row.length || 1;
      const colW = Math.floor(CONTENT_WIDTH_TWIPS / numCols);
      xml += `
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${row.map(field => `
        <w:tc>
          <w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="10" w:after="10" w:line="200" w:lineRule="auto"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:sz w:val="15"/><w:color w:val="46505F"/></w:rPr>
              <w:t>${xmlEscape(field?.label || '')}: </w:t>
            </w:r>
            <w:r>
              <w:rPr><w:sz w:val="16"/><w:color w:val="1E232D"/></w:rPr>
              <w:t>${xmlEscape(field?.value || '')}</w:t>
            </w:r>
          </w:p>
        </w:tc>`).join('')}
      </w:tr>`;
    }

    xml += `
    </w:tbl>`;
  } else if (block.details) {
    const detailKeys = Object.keys(block.details);
    for (const k of detailKeys) {
      const v = block.details[k];
      if (v) {
        xml += `
        <w:p>
          <w:pPr><w:spacing w:before="10" w:after="10" w:line="200" w:lineRule="auto"/><w:ind w:left="180"/></w:pPr>
          <w:r>
            <w:rPr><w:b/><w:sz w:val="15"/><w:color w:val="46505F"/></w:rPr>
            <w:t>${xmlEscape(k)}: </w:t>
          </w:r>
          <w:r>
            <w:rPr><w:sz w:val="16"/><w:color w:val="1E232D"/></w:rPr>
            <w:t>${xmlEscape(v)}</w:t>
          </w:r>
        </w:p>`;
      }
    }
  }

  return xml;
}

function renderSupportingDocumentsBlock(block, subHTag = 'Heading3') {
  let xml = '';
  const title = block.title || 'Supporting Documents';
  const comment = String(block.comment || '').trim();
  const files = block.files || [];

  xml += `
  <w:p>
    <w:pPr><w:pStyle w:val="${subHTag}"/><w:spacing w:before="140" w:after="40"/></w:pPr>
    <w:r><w:t>${xmlEscape(title)}</w:t></w:r>
  </w:p>`;

  if (comment) {
    xml += `
    <w:p>
      <w:pPr><w:spacing w:before="20" w:after="40" w:line="220" w:lineRule="auto"/><w:ind w:left="180"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="374151"/></w:rPr>
        <w:t>Comment: </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="16"/><w:color w:val="111827"/></w:rPr>
        <w:t>${xmlEscape(comment)}</w:t>
      </w:r>
    </w:p>`;
  }

  if (files.length) {
    xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${CONTENT_WIDTH_TWIPS}" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="B4BECB"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
        </w:tblBorders>
        <w:shd w:val="clear" w:color="auto" w:fill="F8F9FB"/>
        <w:tblCellMar>
          <w:top w:w="50" w:type="dxa"/>
          <w:left w:w="80" w:type="dxa"/>
          <w:bottom w:w="50" w:type="dxa"/>
          <w:right w:w="80" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="5800"/>
        <w:gridCol w:w="3560"/>
      </w:tblGrid>
      <w:tr>
        <w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>
        <w:tc>
          <w:tcPr><w:tcW w:w="5800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="EAEFF5"/></w:tcPr>
          <w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="1A2D4A"/></w:rPr><w:t>Attached PDF Document</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3560" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="EAEFF5"/></w:tcPr>
          <w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="1A2D4A"/></w:rPr><w:t>Filing Status</w:t></w:r></w:p>
        </w:tc>
      </w:tr>`;

    for (const file of files) {
      const fileName = file?.name || 'Supporting document';
      const pages = file?.pageCount ? `${file.pageCount} page(s)` : 'PDF Document';
      xml += `
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        <w:tc>
          <w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="111827"/></w:rPr><w:t>📄 ${xmlEscape(fileName)}</w:t></w:r>
            <w:r><w:rPr><w:sz w:val="14"/><w:color w:val="64748B"/></w:rPr><w:t> (${xmlEscape(pages)})</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3560" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>
            <w:r><w:rPr><w:i/><w:sz w:val="15"/><w:color w:val="1E5799"/></w:rPr><w:t>Attached PDF — Include with filing</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>`;
    }

    xml += `
    </w:tbl>
    <w:p>
      <w:pPr><w:spacing w:before="30" w:after="40"/><w:ind w:left="80"/></w:pPr>
      <w:r>
        <w:rPr><w:i/><w:sz w:val="14"/><w:color w:val="64748B"/></w:rPr>
        <w:t>Note: Supplemental PDF documents listed above must be filed separately with the court alongside this document.</w:t>
      </w:r>
    </w:p>`;
  }

  return xml;
}

function buildDocumentXml(model) {
  const { metadata = {}, sections = [] } = model;
  let bodyXml = renderPleadingHeader(metadata);

  sections.forEach((sec, sIdx) => {
    const isLevel2 = sec.level === 2;
    const hStyle = isLevel2 ? 'Heading2' : 'Heading1';
    const subHStyle = isLevel2 ? 'Heading3' : 'Heading2';

    // Page Break if requested
    if (sIdx > 0 && sec.pageBreakBefore) {
      bodyXml += `
      <w:p>
        <w:r><w:br w:type="page"/></w:r>
      </w:p>`;
    }

    // Section Heading
    bodyXml += `
    <w:p>
      <w:pPr>
        <w:pStyle w:val="${hStyle}"/>
      </w:pPr>
      <w:r>
        <w:t>${xmlEscape(sec.title)}</w:t>
      </w:r>
    </w:p>`;

    // Blocks in this section
    const blocks = sec.blocks || sec.renderBlocks || [];
    for (const block of blocks) {
      if (block.type === 'notice') {
        bodyXml += renderNoticeBlock(block);
      } else if (block.type === 'key-value-grid') {
        bodyXml += renderKeyValueGridBlock(block, subHStyle);
      } else if (block.type === 'checklist') {
        bodyXml += renderChecklistBlock(block, subHStyle);
      } else if (block.type === 'table') {
        bodyXml += renderTableBlock(block, subHStyle);
      } else if (block.type === 'signature-block') {
        bodyXml += renderSignatureBlock(block, subHStyle);
      } else if (block.type === 'supporting-documents') {
        bodyXml += renderSupportingDocumentsBlock(block, subHStyle);
      }
    }
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
    <!-- Section Properties: Different First Page, 1.0 inch margins, Letter size, Header/Footer references -->
    <w:sectPr>
      <w:headerReference w:type="first" r:id="rId5"/>
      <w:headerReference w:type="default" r:id="rId3"/>
      <w:footerReference w:type="first" r:id="rId4"/>
      <w:footerReference w:type="default" r:id="rId4"/>
      <w:titlePg/>
      <w:pgSz w:w="${PAGE_WIDTH_TWIPS}" w:h="${PAGE_HEIGHT_TWIPS}" w:orient="portrait"/>
      <w:pgMar w:top="${MARGIN_TWIPS}" w:right="${MARGIN_TWIPS}" w:bottom="${MARGIN_TWIPS}" w:left="${MARGIN_TWIPS}"
        w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

export async function generateCourtFormDocx(model, options = {}) {
  const JSZip = await getJSZip();
  const zip = new JSZip();

  const metadata = model?.metadata || {};
  zip.file('[Content_Types].xml', buildContentTypesXml());
  zip.file('_rels/.rels', buildRootRelsXml());

  const wordFolder = zip.folder('word');
  wordFolder.file('_rels/document.xml.rels', buildDocumentRelsXml());
  wordFolder.file('styles.xml', buildStylesXml());
  wordFolder.file('settings.xml', buildSettingsXml());
  wordFolder.file('header1.xml', buildHeaderXml(metadata));
  wordFolder.file('header2.xml', buildHeader2Xml());
  wordFolder.file('footer1.xml', buildFooterXml(metadata));
  wordFolder.file('document.xml', buildDocumentXml(model));

  const docPropsFolder = zip.folder('docProps');
  docPropsFolder.file('core.xml', buildCorePropsXml(metadata));
  docPropsFolder.file('app.xml', buildAppPropsXml());

  const blob = await zip.generateAsync({
    type: options.type || (typeof window !== 'undefined' ? 'blob' : 'uint8array'),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return blob;
}

export function saveFinalizedDocx(docxData, filename) {
  const blob = docxData instanceof Blob
    ? docxData
    : new Blob([docxData], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
