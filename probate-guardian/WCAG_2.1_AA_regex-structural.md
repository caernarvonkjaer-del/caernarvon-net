# WCAG 2.1 AA / PDF/UA-1 Verification: The Regex-Structural Methodology

This document captures everything this repository actually uses to generate
and verify PDF/UA-1 (ISO 14289-1) / WCAG 2.1 AA conformance for its generated
court-filing PDFs: the generation-side infrastructure that tags the PDF, the
rendering call sites that use it, and the verification code across the five
spec files that check it -- four quoted in full, one test of
`pdf-form-specific.spec.ts` quoted by line range with that file's two other
structural tests summarised -- plus the helper that reads the generated text
and `/ActualText` back.

**Compiled 2026-09-18; re-verified and updated 2026-10-27** against `master`
at `4f65f132`, by reading the real source directly rather than summarizing
from memory — file paths and line-anchored context are included throughout
so this document can be re-verified against the repo at any time. Every
"full file" quote below is the file as it stands at that commit.

---

## 1. Why regex-structural, not axe-core

Answered explicitly in this repo, more than once, because a milestone
proposal recommended axe-core as a default before anyone checked:

> Milestone 43F, Decision 1: the proposal's own recommended default (add
> real axe-core WCAG scans, using `pdf-form-specific.spec.ts:538` as the
> template) does not survive direct inspection — that test is titled
> "axesCheck" but never calls axe-core, and no axe-core dependency or call
> exists anywhere in this repo (confirmed via a repo-wide grep). axe-core
> is also architecturally the wrong tool here regardless: it scans a live
> browser DOM for accessibility issues, and this whole file (like the rest
> of the PDF-accessibility cluster) never renders anything to a DOM —
> jsPDF hands back raw PDF bytes, which axe-core has no way to inspect.
> What this cluster actually tests, everywhere, is PDF/UA-1 *tag*
> structure via direct regex assertions against the generated PDF bytes
> (StructTreeRoot, MarkInfo, /ColSpan, heading order, embedded fonts).

— `tests/e2e/plan-pdf-wcag-compliance.spec.ts`, lines 24–42

The `:538` in that comment is the test's line number when the comment was
written; the "axesCheck" test now starts at `pdf-form-specific.spec.ts:568`.

Re-confirmed for this revision: no `axe`/`axe-core` entry appears in
`package.json` or `package-lock.json`. In test code the word appears only in
the comment quoted above and in the *name* of the Milestone 20 test at
`pdf-form-specific.spec.ts:568` ("Milestone 20 / axesCheck"), which never
calls any such library (other hits are words that merely contain the
letters, such as "taxes").

**The methodology in one sentence:** generate the PDF entirely in-browser via
`page.evaluate()`, call `doc.output()` to get the raw PDF byte string, and
assert against that string directly with regular expressions — checking for
the literal PDF object syntax (`/StructTreeRoot`, `/MarkInfo`, `/S /Table`,
`/ColSpan`, `/Scope /Column`, `BDC ... EMC`, `/FontFile2`, etc.) that a
PDF/UA-1-conformant, tagged, non-raster document must contain.

One deliberate exception has joined it since 2026-09-18: a checklist row's
ticked state is carried in its structure element's `/ActualText` (§2.2), and
the tests read that with pdf-lib's object model, not a regex
(`pdfActualTexts()`, `tests/e2e/support/pdf-extract.ts` lines 162–177, whose
comment cites AGENTS.md §10 P2). The value can be a UTF-16BE hex string,
which a regex over the raw bytes would not decode.

---

## 2. Generation side: how the PDF gets tagged

### 2.1 `src/core/pdf/pdf-accessibility.js` — the accessibility infrastructure

This is the one module that owns the Structure Tree, Marked Content
operators, artifact demarcation, and catalog accessibility metadata. Full
source:

```js
// PDF Accessibility & Tagged PDF (PDF/UA-1 & WCAG 2.1 AA) Infrastructure.
// Manages the logical Structure Tree (/StructTreeRoot, /ParentTree, /StructElem),
// Marked Content operators (BDC/EMC), artifact demarcation, page tab order (/Tabs /S),
// and catalog accessibility metadata (/MarkInfo, /ViewerPreferences, /Metadata, /Lang).

export class PdfStructureNode {
  constructor({ tag, title = null, alt = null, actualText = null, summary = null, attributes = null, parent = null }) {
    this.tag = tag; // Standard structure type: Document, Part, H1, H2, H3, Table, TR, TH, TD, P, Figure, etc.
    this.title = title;
    this.alt = alt;
    // Milestone 76H item 10: what assistive technology reads in place of the
    // element's content (/ActualText) -- a checklist row's ticked state.
    this.actualText = actualText;
    this.summary = summary; // For Table summary or element description
    this.attributes = attributes; // e.g. { O: 'Table', Scope: 'Column', ColSpan: 3 }
    this.parent = parent;
    this.children = [];
    this.pageNumber = null; // 1-based page number
    this.pageObjId = null; // PDF object ID for /Page
    this.mcid = null; // Marked Content ID on that page (for leaf content)
    this.objId = null; // Assigned during serialization
  }

  addChild(childNode) {
    childNode.parent = this;
    this.children.push(childNode);
    return childNode;
  }
}

export class PdfStructureTree {
  constructor(metadata = {}) {
    this.metadata = { embedFonts: true, ...metadata };
    this.rootNode = new PdfStructureNode({ tag: 'Document' });
    this.currentNode = this.rootNode;
    this.mcidCounterByPage = {}; // pageNumber (1-based) -> next MCID integer
    this.pageElements = {}; // pageNumber (1-based) -> array of PdfStructureNode at mcid index
    this.pageObjIds = {}; // pageNumber (1-based) -> page indirect object ID
    this.rootObjId = null;
    this.parentTreeObjId = null;
    this.metadataObjId = null;
  }

  setPageObjId(pageNumber, pageObjId) {
    this.pageObjIds[pageNumber] = pageObjId;
  }

  allocateMcid(pageNumber) {
    if (!this.mcidCounterByPage[pageNumber]) {
      this.mcidCounterByPage[pageNumber] = 0;
      this.pageElements[pageNumber] = [];
    }
    const mcid = this.mcidCounterByPage[pageNumber]++;
    return mcid;
  }

  addStructureElement({ tag, title = null, alt = null, actualText = null, summary = null, attributes = null, pageNumber = null, isLeaf = false, parent = null }) {
    const parentNode = parent || this.currentNode || this.rootNode;
    const node = new PdfStructureNode({ tag, title, alt, actualText, summary, attributes, parent: parentNode });
    parentNode.addChild(node);


    if (pageNumber) {
      node.pageNumber = pageNumber;
      node.pageObjId = this.pageObjIds[pageNumber] || null;
      if (isLeaf) {
        node.mcid = this.allocateMcid(pageNumber);
        this.pageElements[pageNumber][node.mcid] = node;
      }
    }

    return node;
  }

  serialize(doc) {
    const allNodes = [];
    const collectNodes = (node) => {
      allNodes.push(node);
      for (const child of node.children) {
        collectNodes(child);
      }
    };
    collectNodes(this.rootNode);

    // 1. Allocate object IDs for all structure elements using newObjectDeferred()
    // (newObjectDeferred reserves the ID without prematurely writing empty object headers)
    for (const node of allNodes) {
      node.objId = doc.internal.newObjectDeferred();
    }

    // 2. Allocate object IDs for ParentTree, StructTreeRoot, and XMP Metadata
    this.parentTreeObjId = doc.internal.newObjectDeferred();
    this.rootObjId = doc.internal.newObjectDeferred();
    this.metadataObjId = doc.internal.newObjectDeferred();

    // 3. Write each /StructElem
    // Note: passing true to newObjectDeferredBegin(id, true) writes `${id} 0 obj`
    // and correctly records the byte offset in jsPDF's xref table!
    for (const node of allNodes) {
      doc.internal.newObjectDeferredBegin(node.objId, true);
      doc.internal.write('<<');
      doc.internal.write('/Type /StructElem');
      doc.internal.write(`/S /${node.tag}`);

      // Parent reference
      if (node === this.rootNode) {
        doc.internal.write(`/P ${this.rootObjId} 0 R`);
      } else if (node.parent && node.parent.objId) {
        doc.internal.write(`/P ${node.parent.objId} 0 R`);
      }

      // Page reference (for elements containing content on a page)
      if (node.pageNumber && this.pageObjIds[node.pageNumber]) {
        doc.internal.write(`/Pg ${this.pageObjIds[node.pageNumber]} 0 R`);
      }

      // Title & Alt Text
      if (node.title) {
        doc.internal.write(`/T (${escapePdfString(node.title)})`);
      }
      if (node.alt) {
        doc.internal.write(`/Alt (${escapePdfString(node.alt)})`);
      }
      if (node.actualText) {
        doc.internal.write(`/ActualText ${pdfTextString(node.actualText)}`);
      }

      // Attributes (e.g. Table Header Column Scope, ColSpan, Table Summary under /O /Table)
      const attrs = { ...(node.attributes || {}) };
      if (node.summary) {
        if (!attrs.O) attrs.O = 'Table';
        attrs.Summary = `(${escapePdfString(node.summary)})`;
      }

      // PDF/UA-1 (Matterhorn 15-003): ColSpan <= 1 is redundant/invalid and must not be written
      if (attrs.ColSpan !== undefined && attrs.ColSpan <= 1) {
        delete attrs.ColSpan;
      }
      if (attrs.RowSpan !== undefined && attrs.RowSpan <= 1) {
        delete attrs.RowSpan;
      }

      const attrKeys = Object.keys(attrs);
      if (attrKeys.length > 0) {
        doc.internal.write('/A <<');
        for (const [k, v] of Object.entries(attrs)) {
          if (typeof v === 'number' || typeof v === 'boolean') {
            doc.internal.write(`/${k} ${v}`);
          } else if (typeof v === 'string' && (v.startsWith('(') || v.startsWith('['))) {
            doc.internal.write(`/${k} ${v}`);
          } else {
            doc.internal.write(`/${k} /${v}`);
          }
        }
        doc.internal.write('>>');
      }

      // Children / Content (/K)
      if (node.children.length > 0) {
        const childRefs = node.children.map(c => `${c.objId} 0 R`).join(' ');
        doc.internal.write(`/K [ ${childRefs} ]`);
      } else if (node.mcid !== null && node.mcid !== undefined) {
        doc.internal.write(`/K ${node.mcid}`);
      }

      doc.internal.write('>>');
      doc.internal.write('endobj');
    }

    // 4. Write /ParentTree (Number tree mapping page index to array of /StructElem refs)
    // ISO 14289-1: Every page 0 .. totalPages-1 with /StructParents MUST have an entry in /Nums
    const totalPages = typeof doc.internal.getNumberOfPages === 'function' ? doc.internal.getNumberOfPages() : 1;
    doc.internal.newObjectDeferredBegin(this.parentTreeObjId, true);
    doc.internal.write('<<');
    doc.internal.write('/Nums [');
    for (let pNum = 1; pNum <= totalPages; pNum++) {
      const pageIndex = pNum - 1; // 0-based index matching /StructParents
      const elems = this.pageElements[pNum] || [];
      const elemRefs = elems.length > 0
        ? elems.map(e => e && e.objId ? `${e.objId} 0 R` : 'null').join(' ')
        : '';
      doc.internal.write(`  ${pageIndex} [ ${elemRefs} ]`);
    }
    doc.internal.write(']');
    doc.internal.write('>>');
    doc.internal.write('endobj');

    // 5. Write /StructTreeRoot (All tags are standard ISO 32000-1 / PDF/UA-1 structure types)
    doc.internal.newObjectDeferredBegin(this.rootObjId, true);
    doc.internal.write('<<');
    doc.internal.write('/Type /StructTreeRoot');
    doc.internal.write(`/K [ ${this.rootNode.objId} 0 R ]`);
    doc.internal.write(`/ParentTree ${this.parentTreeObjId} 0 R`);
    doc.internal.write('>>');
    doc.internal.write('endobj');

    // 6. Write XMP Metadata Stream with dc:title, dc:creator, dc:description, and pdfuaid:part 1
    const xmpData = buildXmpPacket(this.metadata);
    doc.internal.newObjectDeferredBegin(this.metadataObjId, true);
    doc.internal.write('<<');
    doc.internal.write('/Type /Metadata');
    doc.internal.write('/Subtype /XML');
    doc.internal.write(`/Length ${xmpData.length}`);
    doc.internal.write('>>');
    doc.internal.write('stream');
    doc.internal.write(xmpData);
    doc.internal.write('endstream');
    doc.internal.write('endobj');
  }
}

// Milestone 76H item 10: a PDF text string any reader decodes alike -- a
// literal for plain ASCII, otherwise UTF-16BE with its byte-order mark, as hex
// (a checklist label carries "—", curly quotes or the letters 76H item 4
// added, which a literal string would garble).
export function pdfTextString(str) {
  const s = String(str || '');
  if (/^[\x20-\x7e]*$/.test(s)) return `(${escapePdfString(s)})`;
  let hex = 'FEFF';
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
  return `<${hex}>`;
}

function escapePdfString(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Note on PDF/UA-1: ISO 14289-1 clause 7.21.4.1 requires all fonts to be embedded
// (/FontFile2). With Liberation Sans TrueType fonts embedded in the vector engine,
// <pdfuaid:part>1</pdfuaid:part> and the pdfuaid namespace are emitted by default
// (unless metadata.embedFonts === false).
export function buildXmpPacket(metadata = {}) {
  const title = escapeXml(metadata.title || 'Verified Initial Inventory');
  const author = escapeXml(metadata.author || 'Guardian Forms');
  const subject = escapeXml(metadata.subject || 'Verified Initial Inventory');
  const dateIso = new Date().toISOString();

  const isPdfUa = metadata.claimPdfUa || (metadata.embedFonts !== false && (metadata.embedFonts === true || metadata.claimPdfUa === undefined));
  const pdfUaNs = isPdfUa
    ? '\n        xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/"'
    : '';
  const pdfUaTag = isPdfUa
    ? '\n      <pdfuaid:part>1</pdfuaid:part>'
    : '';

  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"${pdfUaNs}>
      <dc:format>application/pdf</dc:format>
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${title}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>${author}</rdf:li>
        </rdf:Seq>
      </dc:creator>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${subject}</rdf:li>
        </rdf:Alt>
      </dc:description>
      <pdf:Producer>Guardian Forms</pdf:Producer>${pdfUaTag}
      <xmp:CreateDate>${dateIso}</xmp:CreateDate>
      <xmp:ModifyDate>${dateIso}</xmp:ModifyDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

// Low-level marked content stream emitters
export function writeMarkedContentStart(doc, tag, mcid) {
  if (doc && doc.internal && typeof doc.internal.write === 'function') {
    doc.internal.write(`/${tag} << /MCID ${mcid} >> BDC`);
  }
}

export function writeMarkedContentEnd(doc) {
  if (doc && doc.internal && typeof doc.internal.write === 'function') {
    doc.internal.write('EMC');
  }
}

export function writeArtifactStart(doc, type = 'Pagination', subtype = null) {
  if (doc && doc.internal && typeof doc.internal.write === 'function') {
    if (subtype) {
      doc.internal.write(`/Artifact << /Type /${type} /Subtype /${subtype} >> BDC`);
    } else {
      doc.internal.write(`/Artifact << /Type /${type} >> BDC`);
    }
  }
}

export function writeArtifactEnd(doc) {
  if (doc && doc.internal && typeof doc.internal.write === 'function') {
    doc.internal.write('EMC');
  }
}

// Hook all document and page level accessibility structures into jsPDF lifecycle
export function attachAccessibilityHooks(doc, structureTree) {
  if (!doc || !doc.internal || !doc.internal.events) return;

  // 1. Configure viewer preferences to display document title in window bar
  const hasNativeViewerPreferences = typeof doc.viewerPreferences === 'function';
  if (hasNativeViewerPreferences) {
    doc.viewerPreferences({ DisplayDocTitle: true });
  }

  // 2. Hook into putPage event to inject /Tabs /S and /StructParents into each /Page dictionary
  doc.internal.events.subscribe('putPage', (args) => {
    const pageNum = args.pageNumber;
    const pageIndex = pageNum - 1;
    const pageObjId = args.objId;

    structureTree.setPageObjId(pageNum, pageObjId);

    // Write directly into the open /Page dictionary
    doc.internal.write('/Tabs /S');
    doc.internal.write(`/StructParents ${pageIndex}`);
  });

  // 3. Hook into putResources to serialize the complete structure tree
  doc.internal.events.subscribe('putResources', () => {
    // Record page object IDs for all pages
    const totalPages = typeof doc.internal.getNumberOfPages === 'function' ? doc.internal.getNumberOfPages() : 1;
    for (let p = 1; p <= totalPages; p++) {
      const pageInfo = doc.internal.getPageInfo(p);
      if (pageInfo && pageInfo.pageContext && pageInfo.pageContext.objId) {
        structureTree.setPageObjId(p, pageInfo.pageContext.objId);
      }
    }

    structureTree.serialize(doc);
  });

  // 4. Hook into putCatalog to inject /ViewerPreferences, /MarkInfo, /StructTreeRoot, and /Metadata
  // (Notice: do NOT manually write /Lang here; doc.setLanguage('en-US') writes it, avoiding duplicates!)
  doc.internal.events.subscribe('putCatalog', () => {
    // Inject /ViewerPreferences only if jsPDF didn't already write it via doc.viewerPreferences()
    if (!hasNativeViewerPreferences) {
      doc.internal.write('/ViewerPreferences << /DisplayDocTitle true >>');
    }
    doc.internal.write('/MarkInfo << /Marked true >>');
    if (structureTree.rootObjId) {
      doc.internal.write(`/StructTreeRoot ${structureTree.rootObjId} 0 R`);
    }
    if (structureTree.metadataObjId) {
      doc.internal.write(`/Metadata ${structureTree.metadataObjId} 0 R`);
    }
  });
}
```

Changes since 2026-09-18, all visible above:

- **`/ActualText`** (Milestone 76H item 10). `PdfStructureNode` and
  `addStructureElement()` take an `actualText` (lines 7, 11–13, 57–59), and
  `serialize()` writes it as `/ActualText` (lines 124–126) through the new
  exported `pdfTextString()` (lines 212–222): a literal string for plain
  ASCII, otherwise UTF-16BE hex with its byte-order mark, so a label holding
  "—", curly quotes or accented letters is not garbled. The only caller is
  the checklist row (§2.2).
- **Producer and default creator** now read "Guardian Forms" (lines 248 and
  283; the app was renamed from "Probate Guardian" in Milestone 62).

Two things the module supports but nothing uses: `serialize()` would write
`/Alt` (lines 121–123), but no call site in `src/` passes `alt`; and the
`Figure` named in the comment at line 8 is never created — no
`addStructureElement()` call in `src/` uses it. The module writes no
`/RoleMap`: `/StructTreeRoot` (lines 188–195) carries only `/Type`, `/K` and
`/ParentTree`, and the comment at line 188 states every tag is a standard
structure type.

### 2.2 How `src/core/pdf/pdf-engine.js` wires it in

`pdf-engine.js` is the shared vector rendering engine every filing type's
PDF model runs through (`generateCourtFormPdf()`, line 175;
`generateVerifiedInventoryPdf` is an alias of it, line 2039). It imports the
six primitives above (lines 6–13):

```js
import {
  PdfStructureTree,
  attachAccessibilityHooks,
  writeMarkedContentStart,
  writeMarkedContentEnd,
  writeArtifactStart,
  writeArtifactEnd,
} from './pdf-accessibility.js';
```

...sets the PDF version to 1.7 (lines 190–193), registers the three embedded
Liberation Sans TrueType programs as `PGSans` normal/bold/italic (lines
196–202), instantiates one tree per document and attaches the hooks before
any page content is drawn (lines 276–277):

```js
const structureTree = new PdfStructureTree({ embedFonts: true, ...metadata });
attachAccessibilityHooks(doc, structureTree);
```

...and writes `/Lang (en-US)` through `doc.setLanguage('en-US')` (lines
294–297), which is why `attachAccessibilityHooks()` deliberately does not.

Every visual element the engine draws is then paired with a matching
structure-tree call and a matching `BDC`/`EMC` (or `/Artifact ... BDC`/`EMC`
for non-content chrome like the first-page court caption, continuation
headers, footers, background fills and rules — lines 343–344, 381–382 and
451–452 open the caption, continuation-header and footer artifacts).
Representative call sites, drawn from the real file and condensed (`// ...`
marks elided drawing code):

**A heading** (`pdf-engine.js` lines 936–956):

```js
const hTag = sec.level === 2 ? 'H2' : 'H1';
const subHTag = hTag === 'H1' ? 'H2' : 'H3';
const hNode = structureTree.addStructureElement({
  tag: hTag,
  title: sec.title,
  pageNumber: pageNum,
  isLeaf: true,
  parent: partNode,
});
writeMarkedContentStart(doc, hTag, hNode.mcid);
doc.setFont('PGSans', 'bold');
// ... doc.text(headingLines, ...) -- the title wrapped to the column (Milestone 73N part 1) ...
writeMarkedContentEnd(doc);
```

Each section is a `Part` under the document root (lines 900–905), and its
bookmark is registered only after the heading's page is settled (lines
907–934).

**A key-value grid cell** — `TH` with `Scope: Row`, and a `TD` that gets
`ColSpan: 3` when its pair is absent (`pdf-engine.js` lines 1180–1208):

```js
// Column 1 Label (TH)
const th1Node = structureTree.addStructureElement({
  tag: 'TH',
  attributes: { O: 'Table', Scope: 'Row' },
  pageNumber: pageNum,
  isLeaf: true,
  parent: trNode,
});
writeMarkedContentStart(doc, 'TH', th1Node.mcid);
// ... doc.text(label1, ...) ...
writeMarkedContentEnd(doc);

// Column 1 Value (TD) - Spans 3 columns if item2 is absent to maintain 4-column regularity
const td1Node = structureTree.addStructureElement({
  tag: 'TD',
  attributes: item2 ? null : { O: 'Table', ColSpan: 3 },
  pageNumber: pageNum,
  isLeaf: true,
  parent: trNode,
});
writeMarkedContentStart(doc, 'TD', td1Node.mcid);
// ... doc.text(value1, ...) ...
writeMarkedContentEnd(doc);
```

Since Milestone 76H item 1 each grid row (and each notice box, checklist row,
schedule-table row and document comment) is drawn through
`drawRowAcrossPages()` (lines 500–517; the grid's call is at line 1162): a
row taller than a page now continues onto the next page instead of running
off the paper, and each page's part is its own tagged element — its own
`TR` in a table.

**A schedule-table column header** — `TH` with `Scope: Column`; note that a
*repeated* header on a page-break continuation is deliberately written as an
`/Artifact`, not a duplicate logical `TH`, per ISO 14289-1 Clause 7.5
(`pdf-engine.js` lines 1473–1559):

```js
if (isContinuation) {
  // ISO 14289-1 (PDF/UA-1 Clause 7.5): Repeated table headers across multi-page
  // continuations are visual pagination artifacts and MUST NOT be added as duplicate
  // TR / TH elements in the logical structure tree.
  writeArtifactStart(doc, 'Pagination', 'Header');
  // ... draw the repeated header row purely visually ...
  writeArtifactEnd(doc);
  curY += dynamicHeaderHeight;
  return;
}

// Initial Table Header (Single logical TR/TH row in structure tree)
// ... header background drawn inside writeArtifactStart(doc, 'Layout') ...
const headerTr = structureTree.addStructureElement({
  tag: 'TR',
  parent: tableNode,
});
for (let hIdx = 0; hIdx < headers.length; hIdx++) {
  // ... the header's wrapped lines and their position ...
  const thNode = structureTree.addStructureElement({
    tag: 'TH',
    attributes: { O: 'Table', Scope: 'Column' },
    pageNumber: pageNum,
    isLeaf: true,
    parent: headerTr,
  });
  writeMarkedContentStart(doc, 'TH', thNode.mcid);
  // ... doc.text(lineText, ...) for each wrapped line ...
  writeMarkedContentEnd(doc);
  // ... column divider drawn inside writeArtifactStart(doc, 'Layout') ...
}
```

The table itself is a `Table` element whose `summary` becomes
`/A << /O /Table /Summary (...) >>` (lines 1451–1456; the key-value grid's at
lines 1129–1134). A schedule's totals row spans its label across every
column but the totals (lines 1753 and 1785–1791):

```js
const labelColSpan = Math.max(1, headers.length - totalValues.length);
// ...
const totalLabelTd = structureTree.addStructureElement({
  tag: 'TD',
  attributes: labelColSpan > 1 ? { O: 'Table', ColSpan: labelColSpan } : null,
  pageNumber: pageNum,
  isLeaf: true,
  parent: totalTr,
});
```

**A checklist row** — the box and its tick are an `/Artifact`; the row is a
`P` whose `/ActualText` says whether it is ticked (Milestone 76H item 10,
decision 76H-2; `pdf-engine.js` lines 1386–1410). The page prints the label
alone, as the court's form reads — the "Yes — "/"No — " prefix it used to
print is gone — and a screen reader hears "Checked: <label>" or
"Not checked: <label>". A row split across pages carries the
`/ActualText` on its first part only:

```js
if (first) {
  writeArtifactStart(doc, 'Layout');
  // ... draw the box, and the cross when checked ...
  writeArtifactEnd(doc);
}

const rowNode = structureTree.addStructureElement({
  tag: 'P',
  pageNumber: pageNum,
  isLeaf: true,
  parent: partNode,
  actualText: first ? `${checked ? 'Checked' : 'Not checked'}: ${slices[0].join(' ')}` : null,
});
writeMarkedContentStart(doc, 'P', rowNode.mcid);
// ... doc.text(slices[0], ...) ...
writeMarkedContentEnd(doc);
```

**A signature block** (`pdf-engine.js` lines 1828–2015). Since Milestone 73A
the PDF model decides how each block prints (`src/core/pdf/signature-modes.js`)
and the engine draws exactly that, refusing a block with no mode (lines
1850–1853): `'blank'` (a line to sign by hand), `'typed'` ("/s/ Name") or
`'stamp'` (a drawn or uploaded image). Its tagging:

- the block is a `Part` titled `Signature: <signer name or role>` (lines
  1869–1873), with the role as a heading one level below the section's
  (lines 1876–1888) and the date as a `P` (lines 1890–1903);
- the signature line is a `/Layout` artifact (lines 1905–1910);
- **stamp**: the image is drawn by `renderSignatureImage()` (lines 715–736)
  entirely inside `writeArtifactStart(doc, 'Layout')`/`writeArtifactEnd()`,
  so it is not in the structure tree — no `/Figure` element and no `/Alt`
  text. What a screen reader gets is the caption beneath it, a tagged `P`
  reading "Signature of <name>" (lines 1912–1931). Since Milestone 77D-1
  the image sits on the line below the heading, at most 36pt tall;
- **blank**: a tagged `P` reading "Signature of <name>" (or "Signature"
  with no name), and no electronic-signature notice (lines 1932–1948);
- **typed**: a tagged `P` with the "/s/ Name" text (lines 1950–1962), then
  a tagged `P` caption that, since Milestone 77E-3, depends on who signs
  (lines 1964–1980):

```js
doc.text(block.signerRole === 'guardian'
  ? 'Electronic signature (/s/)'
  : 'Signature (Electronic /s/ pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515)', margin + 2, curY + 46);
```

- each of the block's field cells (phone, address, bar number and so on) is
  its own tagged `P` (lines 1983–2012).

The engine's only image-drawing helpers are `renderSignatureImage()` and
`renderSupportingDocumentImage()` (lines 701–706), and both wrap the image
in a `/Layout` artifact; `renderSupportingDocumentImage()` has no caller in
`src/` (searched), and an image-only supporting document is refused with a
"not a PDF" error (asserted at
`tests/e2e/pdf-accessibility-and-signatures.spec.ts` lines 360–398).

This pattern — `structureTree.addStructureElement()` immediately followed by
`writeMarkedContentStart()` / draw / `writeMarkedContentEnd()`, or
`writeArtifactStart()` / draw / `writeArtifactEnd()` for non-content chrome —
repeats for every drawable element across the whole engine (headers, footers,
notices, checklists, signature blocks, page-number footers, etc.). It is not
reproduced here in full: `pdf-engine.js` is the general-purpose rendering
engine for all nine filing types and is 2,039 lines of largely
filing-specific layout code, not itself WCAG methodology — the pattern above
is what's structurally significant, and it is uniform throughout the file.

### 2.3 Narrative summary (already documented)

`docs/pdf-architecture-and-signatures.md` §5 ("Tagged PDF / PDF/UA-1 (ISO
14289-1) Conformance", lines 97–110) gives the product-level summary of the
same infrastructure:

> Probate Guardian generates fully compliant **PDF/UA-1 (ISO 14289-1)**
> app-authored court-form pages conforming to WCAG 2.1 AA and Section 508
> accessibility standards. Uploaded supplemental PDF pages are user-supplied
> and copied inline for filing; their accessibility conformance remains the
> filer's responsibility.
>
> ### Structural Tagging & Engine Features
>
> 1. **Structure Tree Root (`/StructTreeRoot`)**: A logical tree mapping
>    every visual block to standard tags (`/Document`, `/Part`, `/H1`,
>    `/H2`, `/Table`, `/TR`, `/TH`, `/TD`, `/P`, `/Figure`).
> 2. **Marked Content Operators (`BDC ... EMC`)**: Wrapping 100% of text
>    operators across all pages with unique structure tag identifiers
>    (`/MCID`).
> 3. **Role Mapping Dictionary (`/RoleMap`)**: Mapping custom role
>    identifiers to standard PDF structure types.
> 4. **Header/Footer Artifacts**: Tagging repeated running headers, court
>    captions, and page number footers with `/Artifact` so screen readers
>    skip repetitive chrome.
> 5. **Full Font Embedding (`/FontFile2`, `/FontDescriptor`,
>    `/CIDFontType2`, `/ToUnicode`)**: All glyphs embedded with TrueType
>    programs and Unicode mapping tables, satisfying PDF/UA-1 Clause 7.2
>    (zero standard-14 metric dependencies, zero external network
>    requests).
> 6. **XMP Metadata & Identification**: Emits
>    `<pdfuaid:part>1</pdfuaid:part>` and Dublin Core (`dc:title`,
>    `dc:creator`, `dc:description`, `pdf:Keywords`) metadata packets.

That text has not changed since 2026-09-18, but the code does not bear out
all of it. Checked 2026-10-27:

- **`/Figure`** (item 1): no structure element of that type is created
  anywhere in `src/` (§2.1); a signature stamp is an artifact, not a
  Figure (§2.2). The tags actually used are `Document`, `Part`, `H1`–`H3`,
  `Table`, `TR`, `TH`, `TD` and `P`.
- **`/RoleMap`** (item 3): nothing writes one (§2.1). With only standard
  structure types in use, none is needed.
- **"100% of text operators"** (item 2) is what the engine aims at; the
  tests measure it for the Initial Inventory, the Simplified Accounting and
  the Annual Accounting only (§4).
- **"Clause 7.2"** (item 5): the code's own comment cites clause 7.21.4.1
  (`pdf-accessibility.js` line 242).
- **`pdf:Keywords`** (item 6): the XMP packet (`pdf-accessibility.js` lines
  246–290) holds `dc:format`, `dc:title`, `dc:creator`, `dc:description`,
  `pdf:Producer`, `pdfuaid:part` (by default) and `xmp:CreateDate`/
  `xmp:ModifyDate` — no `pdf:Keywords`. Keywords live in the Info dictionary
  (`/Keywords`, set from `pdf-engine.js` line 285 and asserted at
  `pdf-structure-tags.spec.ts` line 254).
- "Probate Guardian" is the app's former name; it is "Guardian Forms" since
  Milestone 62.

Important caveat from the same document (§2, "Supporting Documents", line
34): uploaded supplemental documents are copied inline via
`pdf-lib.copyPages()` without OCR, remediation, or structural merging —
"copying uploaded pages into the packet must not be described as preserving
the source document's `/StructTreeRoot`, parent tree, source PDF/UA
metadata, or conformance claim." Everything below verifies **app-authored**
pages only.

---

## 3. Verification side: the regex-structural test cluster

Every file below follows the same shape: generate a PDF via
`page.evaluate()` — reaching the real model builders and
`generateCourtFormPdf()`/`generateVerifiedInventoryPdf()` through
`window.GuardianForms.testing.generateOutput.<member>()`
(`src/core/testing/testing-adapter.js` lines 433–442; since Milestone 70T
the browser suite reaches the app only through `GuardianForms.testing`,
where it used to call `window.loadGuardianPdf()` and the like) — pull
`doc.output()` as a raw string, extract the PDF-syntax substructures the
test cares about with regular expressions, and assert on them with plain
Playwright `expect()`. `extractPdfText()` (§3.6) is layered on top only
where the test also needs to confirm *visible, readable text* (proving the
embedded fonts' `/ToUnicode` CMaps actually decode), and `pdfActualTexts()`
(§3.6) where it needs a checklist row's `/ActualText`.

Most fixtures are now complete filings rather than bare literals: they are
built with `__pgBuildFixture(type, MINIMAL_VALID_<TYPE>, overrides)` and the
test asserts, before anything structural, that the app's own export checks
would accept them (`expectFileableFixture()`;
`tests/e2e/support/fixture-completeness.ts` lines 92 and 121), so the PDF
under inspection is one a filer could actually submit. Exceptions:
`pdf-fonts-and-xmp.spec.ts`, `plan-pdf-wcag-compliance.spec.ts` and the
synthetic Milestone 19-1 test, which build their models directly.

### 3.1 `tests/e2e/pdf-structure-tags.spec.ts` — full file

The core structural-tag suite, three tests. **Slice 19A** (Initial
Inventory): `/StructTreeRoot`, `/ParentTree`, `/Tabs /S`, `/MarkInfo`,
`/Lang`, `/ViewerPreferences`, XMP metadata, artifacts, table tags, heading
nesting and no raster content. **Slice 19D**: xref integrity and a "zero
untagged text operators" audit across two filing types at once (Initial
Inventory and Simplified Accounting). 19A carried its own xref audit until
Milestone 59C-0 removed it as vacuous — it could never fail; lines 170–187
record why — so 19D alone owns xref integrity here. **Milestone 19-1**: a
hand-built checklist that crosses a page break and a hand-signed signature
block; since Milestone 76H item 10 it also requires all 70 checklist rows to
carry "Checked: …" or "Not checked: …" in `/ActualText`, both states to
occur, and no "Yes — "/"No — " prefix to print (lines 598–604).

```ts
import { test, expect } from '@playwright/test';
import { freshStartNoPassword, fillMinimalValidGuardianWard } from './support/target';
import { installFixtureSupport, expectFileableFixture } from './support/fixture-completeness';
import { MINIMAL_VALID_GUARDIAN, MINIMAL_VALID_SIMPLIFIED } from './support/fixtures';
import { extractPdfText, pdfActualTexts } from './support/pdf-extract';
import { expectedPdfMetadataTitle } from './support/filing-matrix';

test.describe('PDF Accessibility: Tagged Structure, StructTreeRoot & Marked Content', () => {
  test('Slice 19A: generates tagged PDF with /StructTreeRoot, /ParentTree, /Tabs /S, /ViewerPreferences, and marked content operators', async ({ page }) => {
    // 1. Fresh start
    await freshStartNoPassword(page);

    // Create initial guardian inventory ward
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.openDialog('guardian'));
    await page.locator('#new-ward-name').fill('Harold Thomas Bennett');
    await page.locator('#new-ward-type').selectOption('guardian');
    await page.locator('[data-modal-action="add-ward"]').click();
    await expect(page.locator('#addWardModal')).toBeHidden();

    // 2. Set up full Verified Initial Inventory mock state.
    //
    // The base layer is the shared helper, not this file's literal. This test
    // builds its PDF from the open filing, and its own fixture answers only the
    // fields it asserts on -- so as the court's required fields grow, the
    // "full" state drifts into a document no filer could actually submit
    // while every structural assertion here keeps passing. Milestone 57A was
    // the first instance: the fixture below sets a bond amount and a bonding
    // company but never says whether the bond was waived.
    //
    // The helper runs first and the fixture layers over it, so every value
    // this test names still wins; it only fills what the test is silent on.
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => {
      (window as any).GuardianForms.testing.patchFiling({
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        gid: '2026-01-15',
        typeOfGuardianship: 'Plenary',
        guardianName: 'Rachel M. Alvarez',
        attorneyForGuardian: 'Robert Vance, Esq.',
        isAmended: false,
        signatureStyle: 'typed',
        hasSafeDepositBox: false,
        safeDepositBoxFiled: null,
        bondAmount: 50000,
        bondPeriodFrom: '2026-01-15',
        bondPeriodTo: '2027-01-15',
        bondingCompany: 'Travelers Casualty and Surety',
        serviceDate: '2026-03-01',
        witnesses: [
          { name: 'David Miller', address: '120 Central Ave, St. Petersburg, FL', occupation: 'Paralegal' },
        ],
        guardians: [
          {
            name: 'Rachel M. Alvarez',
            signatureDate: '2026-02-28',
            phone: '727-555-0144',
            streetAddress: '450 2nd Ave N',
            cityStateZip: 'St. Petersburg, FL 33701',
            ssnEin: '***-**-6789',
          },
        ],
        preparer: {
          name: 'Marcus Thorne',
          signatureDate: '2026-02-28',
          phone: '727-555-0188',
          streetAddress: '780 4th St N',
          cityStateZip: 'St. Petersburg, FL 33701',
          ssnEin: '***-**-4321',
        },
        attorney: {
          name: 'Robert Vance, Esq.',
          // Milestone 72B: required once an attorney is entered.
          email: 'rvance@vancelaw.example',
          barNumber: '0184920',
          filingDate: '2026-03-01',
          signatureDate: '2026-03-01',
          phone: '727-555-0199',
          streetAddress: '100 2nd Ave S, Suite 400',
          cityStateZip: 'St. Petersburg, FL 33701',
        },
        serviceAttorney: {
          name: 'Elena Rostova',
          barNumber: '0293841',
          signatureDate: '2026-03-01',
          phone: '727-555-0177',
          streetAddress: '100 2nd Ave S, Suite 400',
          cityStateZip: 'St. Petersburg, FL 33701',
        },
        serviceRecipients: [
          { name: 'Sarah Bennett', line2: '1420 5th Ave N', line3: 'St. Petersburg, FL 33705', method: 'E-Portal' },
        ],
        scheduleA1: [
          { propertyDescription: 'Primary Residence', streetAddress: '1420 5th Ave N', cityStateZip: 'St. Petersburg, FL 33705', valuationMethod: 'Appraisal', fullAssetValue: 250000, wardPercent: 100 },
        ],
        scheduleA2: [
          { lenderName: 'Wells Fargo Home Mortgage', lenderAddress: 'PO Box 10335', lenderCityStateZip: 'Des Moines, IA 50306', relatedProperty: '1420 5th Ave N', liabilityType: 'Mortgage', fullDebtBalance: 45000, wardPercent: 100 },
        ],
        scheduleB1: [
          { institutionName: 'Raymond James Bank', accountType: 'Checking', accountNumber: '***4821', streetAddress: '880 Carillon Pkwy', cityStateZip: 'St. Petersburg, FL 33716', fullAssetAmount: 38250, wardPercent: 100 },
        ],
        scheduleB2: [
          { description: '2021 Toyota Camry', streetAddress: '1420 5th Ave N', cityStateZip: 'St. Petersburg, FL 33705', valuationMethod: 'KBB Private Party', fullAssetValue: 18500, wardPercent: 100 },
        ],
        scheduleB3: [],
        scheduleB4: [],
        scheduleC1: [
          { payerName: 'Social Security Administration', payerAddress: '1 Lemon St, Clearwater, FL 33756', typeOfIncome: 'Retirement', frequencyOfPayment: 'Monthly', paymentBasis: 'Monthly ($1,850/mo)', annualIncomeAmount: 22200, wardPercent: 100 },
        ],
        scheduleC2: [],
        scheduleC3: [],
        scheduleC4: [],
        scheduleC5: [],
        scheduleNoItems: {
          b3: true,
          b4: true,
          c2: true,
          c3: true,
          c4: true,
          c5: true,
        },
      });
    });

    // 3. Generate native vector PDF in browser memory and inspect raw stream
    const pdfInspection = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).GuardianForms.testing.generateOutput.guardianPdf();

      const filing = (window as any).GuardianForms.testing.snapshot().filing;
      const fixtureIssues = await (window as any).__pgFixtureIssues(filing);

      const model = buildVerifiedInventoryModel(filing, {
        signatureStyle: 'script',
        printDate: '2026-09-03',
      });

      const doc = await generateVerifiedInventoryPdf(model);
      const rawPdfString = doc.output();
      const numPages = doc.internal.getNumberOfPages();

      // Extract all page objects (/Type /Page only, excluding /Type /Pages)
      const pageObjs = rawPdfString.match(/\d+ 0 obj\s*<<\/Type \/Page[\s\r\n][\s\S]*?>>\s*endobj/g) || [];

      // Extract catalog object
      const catalogMatch = rawPdfString.match(/\d+ 0 obj\s*<<[\s\S]*?\/Type \/Catalog[\s\S]*?>>\s*endobj/);
      const catalogObj = catalogMatch ? catalogMatch[0] : '';

      // Extract StructTreeRoot object referenced by catalog
      const structTreeRootRefMatch = catalogObj.match(/\/StructTreeRoot\s+(\d+)\s+0\s+R/);
      const structTreeRootId = structTreeRootRefMatch ? structTreeRootRefMatch[1] : null;
      const structTreeRootRegex = new RegExp(`${structTreeRootId}\\s+0\\s+obj\\s*<<[\\s\\S]*?>>\\s*endobj`);
      const structTreeRootObjMatch = rawPdfString.match(structTreeRootRegex);
      const structTreeRootObj = structTreeRootObjMatch ? structTreeRootObjMatch[0] : '';

      // Extract Metadata object referenced by catalog
      const metadataRefMatch = catalogObj.match(/\/Metadata\s+(\d+)\s+0\s+R/);
      const metadataId = metadataRefMatch ? metadataRefMatch[1] : null;
      const metadataRegex = new RegExp(`${metadataId}\\s+0\\s+obj\\s*<<[\\s\\S]*?>>[\\s\\S]*?endobj`);
      const metadataObjMatch = rawPdfString.match(metadataRegex);
      const metadataObj = metadataObjMatch ? metadataObjMatch[0] : '';

      // Extract ParentTree object referenced by StructTreeRoot
      const parentTreeRefMatch = structTreeRootObj.match(/\/ParentTree\s+(\d+)\s+0\s+R/);
      const parentTreeId = parentTreeRefMatch ? parentTreeRefMatch[1] : null;
      const parentTreeRegex = new RegExp(`${parentTreeId}\\s+0\\s+obj\\s*<<[\\s\\S]*?>>\\s*endobj`);
      const parentTreeObjMatch = rawPdfString.match(parentTreeRegex);
      const parentTreeObj = parentTreeObjMatch ? parentTreeObjMatch[0] : '';

      // Milestone 59C-0: this test's own xref audit was removed, not repaired.
      //
      // It located the table with rawPdfString.lastIndexOf('xref'), which
      // matches the 'xref' inside the word 'startxref' -- positioned after the
      // trailer, so the slice ran backwards and returned ''. The loop below it
      // started at i = 2 over a single empty line and never executed, leaving
      // xrefErrors permanently [] and its assertion permanently true. Measured
      // before removal: sectionLen 0, and the assertion still passed against a
      // PDF with a deliberately corrupted offset.
      //
      // Slice 19D below owns xref integrity for this filing type and does it
      // correctly: it follows the startxref pointer, guards against an empty
      // parse with `totalObjectsInXref > 50`, and asserts every offset
      // resolves. Verified to actually fail on that same corrupted offset
      // (validOffsets 345 of 346). Nothing was lost here.
      //
      // 59C-2 unifies 19D's implementation with the equivalent one in
      // pdf-form-specific.spec.ts into a single shared helper.

      return {
        rawPdfString,
        numPages,
        pageObjs,
        catalogObj,
        structTreeRootId,
        structTreeRootObj,
        metadataId,
        metadataObj,
        parentTreeObj,
        fixtureIssues,
      };
    });

    // The state above is only "full Verified Initial Inventory mock state" if
    // the court would actually accept it. This is what makes that claim
    // checkable instead of a comment.
    expectFileableFixture(pdfInspection.fixtureIssues, "this test's Initial Inventory state");

    const {
      rawPdfString,
      numPages,
      pageObjs,
      catalogObj,
      structTreeRootId,
      structTreeRootObj,
      metadataId,
      metadataObj,
      parentTreeObj,
    } = pdfInspection;

    // Verify Page Count
    expect(numPages).toBeGreaterThanOrEqual(5);
    expect(pageObjs.length).toBe(numPages);

    // ==========================================
    // PDF Specification & Header (PDF 1.7 for PDF/UA-1)
    // ==========================================
    expect(rawPdfString.startsWith('%PDF-1.7')).toBe(true);

    // XRef table integrity is asserted by Slice 19D, not here -- see the note
    // in the evaluate above. This test covers tagged structure only.

    // ==========================================
    // Category 1: Document Checks
    // ==========================================

    // 1. Tagged PDF: Catalog must contain /MarkInfo << /Marked true >> and /StructTreeRoot
    expect(catalogObj).toContain('/MarkInfo << /Marked true >>');
    expect(structTreeRootId).not.toBeNull();
    expect(catalogObj).toContain(`/StructTreeRoot ${structTreeRootId} 0 R`);

    // 2. Primary Language: Catalog must contain exactly ONE /Lang (en-US) (no duplicate)
    const langMatches = catalogObj.match(/\/Lang\s*\(/g) || [];
    expect(langMatches.length).toBe(1);
    expect(catalogObj).toContain('/Lang (en-US)');

    // 3. Document Title: Must contain /ViewerPreferences << /DisplayDocTitle true >>
    const expectedTitle = expectedPdfMetadataTitle('guardian', 'Harold Thomas Bennett', '26-002487-GD', '2026-09-03');
    expect(rawPdfString).toContain('/ViewerPreferences');
    expect(rawPdfString).toContain('/DisplayDocTitle true');
    expect(rawPdfString).toContain(expectedTitle);
    const extractedText = await extractPdfText(rawPdfString);
    expect(extractedText).toContain('Verified Initial Inventory');
    expect(extractedText).toContain('Harold Thomas Bennett');
    expect(rawPdfString).toContain('/Keywords (Florida, Probate, Guardianship, Verified Initial Inventory)');

    // 4. XMP Metadata Stream: /Metadata in /Catalog with Dublin Core dc:title, dc:creator
    expect(metadataId).not.toBeNull();
    expect(catalogObj).toContain(`/Metadata ${metadataId} 0 R`);
    expect(metadataObj).toContain('/Type /Metadata');
    expect(metadataObj).toContain('/Subtype /XML');
    expect(metadataObj).toContain('<dc:title>');
    expect(metadataObj).toContain(expectedTitle);
    expect(metadataObj).toContain('<dc:creator>');
    expect(metadataObj).toContain('Guardian Forms');

    // 5. StructTreeRoot Object Validity: MUST resolve to /Type /StructTreeRoot (NOT /StructElem)
    expect(structTreeRootObj).toContain('/Type /StructTreeRoot');
    expect(structTreeRootObj).not.toContain('/Type /StructElem');
    expect(structTreeRootObj).toContain('/ParentTree');
    expect(structTreeRootObj).toContain('/K [');

    // 6. ParentTree Object Validity: Must contain number keys for each page (0 .. numPages - 1)
    expect(parentTreeObj).toContain('/Nums [');
    for (let pIdx = 0; pIdx < numPages; pIdx++) {
      expect(parentTreeObj).toContain(`${pIdx} [`);
    }

    // ==========================================
    // Category 2: Page Content Checks
    // ==========================================

    // 7. Tab Order: EVERY single /Page dictionary must contain /Tabs /S
    for (let i = 0; i < pageObjs.length; i++) {
      const pObj = pageObjs[i];
      expect(pObj).toContain('/Tabs /S');
      expect(pObj).toContain(`/StructParents ${i}`);
    }

    // 8. Marked Content Operators: BDC and EMC must wrap page text streams
    expect(rawPdfString).toContain('BDC');
    expect(rawPdfString).toContain('EMC');

    // 9. Artifact Demarcation: Running headers and footers must be marked as Artifacts
    expect(rawPdfString).toContain('/Artifact << /Type /Pagination /Subtype /Header >> BDC');
    expect(rawPdfString).toContain('/Artifact << /Type /Pagination /Subtype /Footer >> BDC');
    expect(rawPdfString).toContain('/Artifact << /Type /Layout >> BDC');

    // ==========================================
    // Category 5: Tables Checks
    // ==========================================

    // 10. Table Structure Elements: /Table, /TR, /TH, /TD must exist in structure tree
    expect(rawPdfString).toContain('/S /Table');
    expect(rawPdfString).toContain('/S /TR');
    expect(rawPdfString).toContain('/S /TH');
    expect(rawPdfString).toContain('/S /TD');

    // 11. Table Header Column Scope
    expect(rawPdfString).toContain('/Scope /Column');

    // ==========================================
    // Category 7: Headings Checks
    // ==========================================

    // 12. Hierarchical Heading Structure Elements & Appropriate Nesting (Zero skipped heading levels)
    expect(rawPdfString).toContain('/S /H1');
    expect(rawPdfString).toContain('/S /H2');

    // Assert Acrobat "Appropriate nesting" rule: no heading jumps e.g. H1 -> H3
    const headingMatches = [...rawPdfString.matchAll(/\/S \/(H[1-6])/g)].map(m => parseInt(m[1].slice(1), 10));
    expect(headingMatches.length).toBeGreaterThan(0);
    let prevLevel = 0;
    for (const lvl of headingMatches) {
      if (prevLevel > 0) {
        expect(lvl).toBeLessThanOrEqual(prevLevel + 1);
      }
      prevLevel = lvl;
    }

    // ==========================================
    // Strict Non-Raster Vector Text Integrity
    // ==========================================
    expect(rawPdfString).toContain('BT');
    expect(rawPdfString).toContain('ET');
    expect(rawPdfString).not.toContain('/Subtype /Image');
    expect(rawPdfString).not.toContain('/Filter /DCTDecode');
  });

  test('Slice 19D: Complete xref table byte offset integrity and zero untagged text operators across all filing outputs', async ({ page }) => {
    await freshStartNoPassword(page);
    await installFixtureSupport(page);

    const auditResults = await page.evaluate(async ([invBase, simpBase]) => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).GuardianForms.testing.generateOutput.guardianPdf();
      const { buildSimplifiedAccountingModel, generateCourtFormPdf } = await (window as any).GuardianForms.testing.generateOutput.simplifiedPdf();

      // Both filings are complete ones with this test's own details written
      // over them. Before, each was a bare literal carrying only the fields
      // this test reads, so the two documents whose xref tables and tagging
      // are audited here were filings the court would have rejected.
      const mockInventoryData = (window as any).__pgBuildFixture('guardian', invBase, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        gid: '2026-01-15',
        typeOfGuardianship: 'Plenary',
        guardianName: 'Rachel M. Alvarez',
        attorneyForGuardian: 'Robert Vance, Esq.',
        witnesses: [{ name: 'David Miller', address: '120 Central Ave', occupation: 'Paralegal' }],
        guardians: [{ name: 'Rachel M. Alvarez', signatureDate: '2026-02-28', phone: '727-555-0144' }],
        preparer: { name: 'Marcus Thorne', signatureDate: '2026-02-28', phone: '727-555-0188' },
        attorney: { name: 'Robert Vance, Esq.', barNumber: '0184920', signatureDate: '2026-03-01' },
        serviceAttorney: { name: 'Elena Rostova', barNumber: '0293841', signatureDate: '2026-03-01' },
        serviceRecipients: [{ name: 'Sarah Bennett', line2: '1420 5th Ave N', line3: 'St. Petersburg, FL', method: 'E-Portal' }],
        scheduleA1: [{ propertyDescription: 'Primary Residence', streetAddress: '1420 5th Ave N', cityStateZip: 'St. Petersburg, FL', valuationMethod: 'Appraisal', fullAssetValue: 250000, wardPercent: 100 }],
        scheduleA2: [{ lenderName: 'Wells Fargo', lenderAddress: 'PO Box 10335', lenderCityStateZip: 'Des Moines, IA', relatedProperty: '1420 5th Ave N', liabilityType: 'Mortgage', fullDebtBalance: 45000, wardPercent: 100 }],
        scheduleB1: [{ institutionName: 'Raymond James', accountType: 'Checking', accountNumber: '***4821', streetAddress: '880 Carillon', cityStateZip: 'St. Pete', fullAssetAmount: 38250, wardPercent: 100 }],
        scheduleB2: [{ description: '2021 Toyota Camry', streetAddress: '1420 5th Ave N', cityStateZip: 'St. Pete', valuationMethod: 'KBB', fullAssetValue: 18500, wardPercent: 100 }],
        scheduleC1: [{ payerName: 'SSA', payerAddress: '1 Lemon St, Clearwater, FL 33756', typeOfIncome: 'Retirement', frequencyOfPayment: 'Monthly', paymentBasis: 'Monthly', annualIncomeAmount: 22200, wardPercent: 100 }],
        // The base ticks every "no items" box; this filing lists real property,
        // debts, accounts, a vehicle and an income source, so those boxes come off.
        scheduleNoItems: { a1: false, a2: false, b1: false, b2: false, c1: false },
      });

      const mockSimplifiedData = (window as any).__pgBuildFixture('simplified', simpBase, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        // This filing accounts for 2025, so the guardianship has to have begun
        // on or before it -- the base's GID is 2026 and would put the period
        // before the guardianship existed.
        gid: '2024-06-01',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Eleanor Vance Bennett',
        attorney: 'Marcus Sterling, Esq.',
        guardians: [{ name: 'Eleanor Vance Bennett', signatureDate: '2026-03-01', phone: '727-555-0199' }],
        attorney_barNumber: '1029384',
        attorney_signatureDate: '2026-03-01',
        certServiceDate: '2026-03-01',
        certWardStatus: 'N/A', // Milestone 72G: the ward's status, required
        certAttySignDate: '2026-03-01',
        certIndicator: 'Electronic / Florida Courts E-Filing Portal',
        certRecipients: [{ name: 'Clerk of Court', line2: '315 Court St', line3: 'Clearwater, FL 33756' }],
        startingBalance: 150000,
        interestIncome: 3500,
        depositsSettlement: 0,
        serviceCharges: 95,
        federalIncomeTax: 1200,
        // Milestone 73F part 3 (73F-7): a remuneration line needs its Amount.
        remuneration: [{ guardian: 'Eleanor Vance Bennett', type: 'Guardian Fee', description: 'Statutory fee per court order', amount: 1800 }],
      });

      const invModel = buildVerifiedInventoryModel(mockInventoryData, { signatureStyle: 'typed', printDate: '2026-09-03' });
      const simpModel = buildSimplifiedAccountingModel(mockSimplifiedData, { signatureStyle: 'script', printDate: '2026-09-03' });

      const invDoc = await generateVerifiedInventoryPdf(invModel);
      const simpDoc = await generateCourtFormPdf(simpModel);

      function auditPdf(rawPdf) {
        // 1. Audit Xref Table & Byte Offsets
        const startxrefMatch = rawPdf.match(/startxref\s+(\d+)\s+%%EOF/);
        const declaredStartxref = parseInt(startxrefMatch ? startxrefMatch[1] : '-1', 10);
        const startxrefPointsToXref = rawPdf.slice(declaredStartxref, declaredStartxref + 4) === 'xref';

        const trailerIndex = rawPdf.indexOf('trailer', declaredStartxref);
        const xrefSection = rawPdf.slice(declaredStartxref, trailerIndex);
        const xrefLines = xrefSection.split(/\r?\n/).filter(l => /^\d{10}\s+\d{5}\s+[nf]/.test(l.trim()));
        let totalObjectsInXref = 0;
        let validOffsets = 0;

        for (let i = 1; i < xrefLines.length; i++) {
          const [offsetStr, gen, status] = xrefLines[i].trim().split(/\s+/);
          totalObjectsInXref++;
          if (status === 'n') {
            const offset = parseInt(offsetStr, 10);
            const snippet = rawPdf.slice(offset, offset + 30);
            if (new RegExp(`^${i}\\s+0\\s+obj`).test(snippet)) {
              validOffsets++;
            }
          }
        }

        // 2. Audit Stream Content for Untagged Text Operators
        // Any text-showing operator (Tj, TJ, ', ") MUST be within a BDC ... EMC block
        const streamMatches = [...rawPdf.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
        let totalTextOperators = 0;
        let untaggedTextOperators = 0;
        const untaggedDetails: string[] = [];

        for (const sm of streamMatches) {
          const content = sm[1];
          // Only inspect PDF page content streams (skip XML metadata or non-content streams)
          if (content.includes('<?xpacket')) continue;

          const tokens = content.split(/\s+/);
          let mcDepth = 0;
          let inText = false;
          for (let t = 0; t < tokens.length; t++) {
            const tok = tokens[t];
            if (tok === 'BDC' || tok === 'BMC') {
              mcDepth++;
            } else if (tok === 'EMC') {
              mcDepth = Math.max(0, mcDepth - 1);
            } else if (tok === 'BT') {
              inText = true;
            } else if (tok === 'ET') {
              inText = false;
            } else if (inText && (tok === 'Tj' || tok === 'TJ' || tok === "'" || tok === '"')) {
              totalTextOperators++;
              if (mcDepth === 0) {
                untaggedTextOperators++;
                untaggedDetails.push(tokens.slice(Math.max(0, t - 10), t + 1).join(' '));
              }
            }
          }
        }

        return {
          startxrefPointsToXref,
          totalObjectsInXref,
          validOffsets,
          totalTextOperators,
          untaggedTextOperators,
          untaggedDetails,
        };
      }

      return {
        inventory: auditPdf(invDoc.output()),
        simplified: auditPdf(simpDoc.output()),
        inventoryIssues: await (window as any).__pgFixtureIssues(mockInventoryData),
        simplifiedIssues: await (window as any).__pgFixtureIssues(mockSimplifiedData),
      };
    }, [MINIMAL_VALID_GUARDIAN, MINIMAL_VALID_SIMPLIFIED]);

    expectFileableFixture(auditResults.inventoryIssues, "19D's Initial Inventory fixture");
    expectFileableFixture(auditResults.simplifiedIssues, "19D's Simplified Accounting fixture");

    const { inventory, simplified } = auditResults;

    // 1. Inventory Form Audit:
    // Zero xref displacement: declared startxref points directly to xref keyword at its exact byte offset
    expect(inventory.startxrefPointsToXref).toBe(true);
    // 100% of objects in xref table resolve to exact `<ID> 0 obj` at their declared byte offsets
    expect(inventory.totalObjectsInXref).toBeGreaterThan(50);
    expect(inventory.validOffsets).toBe(inventory.totalObjectsInXref);
    // 100% of text showing operators are enclosed in marked content / artifact blocks (zero untagged text)
    expect(inventory.totalTextOperators).toBeGreaterThan(50);
    expect(inventory.untaggedDetails).toEqual([]);
    expect(inventory.untaggedTextOperators).toBe(0);

    // 2. Simplified Accounting Audit:
    expect(simplified.startxrefPointsToXref).toBe(true);
    expect(simplified.totalObjectsInXref).toBeGreaterThan(50);
    expect(simplified.validOffsets).toBe(simplified.totalObjectsInXref);
    expect(simplified.totalTextOperators).toBeGreaterThan(50);
    expect(simplified.untaggedTextOperators).toBe(0);
  });

  test('Milestone 19-1: checklist and wet-ink signature-block synthetic fixture — tagged structure, glyph rendering, page-break handling', async ({ page }) => {
    // checklist and the wet-ink signature-block variant have no consumer
    // until Milestone 19-2's plan-* features land, so this exercises the
    // block types directly with a hand-built model rather than deferring
    // their first real validation to whenever 19-2 happens -- a bug here
    // would otherwise be indistinguishable from a bug in 19-2's new
    // pdf-model.js wiring.
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const { generateVerifiedInventoryPdf } = await (window as any).GuardianForms.testing.generateOutput.guardianPdf();

      // Enough rows to force the checklist across a page boundary on its own.
      const checklistItems = Array.from({ length: 70 }, (_, i) => ({
        checked: i % 3 === 0,
        label: `Synthetic checklist item number ${i + 1} verifies wrapping and page-break handling`,
      }));

      const model = {
        metadata: {
          title: 'Synthetic Fixture - Milestone 19-1',
          subject: 'Synthetic Fixture',
          author: 'Probate Guardian',
          creator: 'Probate Guardian',
          formName: 'SYNTHETIC FIXTURE',
          formSubtitle: 'Milestone 19-1 Block Vocabulary Fixture',
          keywords: 'Synthetic, Fixture',
          wardName: 'Synthetic Ward',
          caseNumber: '26-000000-GD',
          county: 'Pinellas',
          signatureStyle: 'typed',
        },
        sections: [
          {
            id: 'checklist-fixture',
            title: 'Synthetic Checklist Section',
            bookmarkTitle: 'Synthetic Checklist Section',
            parentBookmark: null,
            level: 1,
            pageBreakBefore: false,
            blocks: [
              { type: 'checklist', title: 'Synthetic Checklist', items: checklistItems },
            ],
          },
          {
            id: 'wet-signature-fixture',
            title: 'Synthetic Wet-Ink Signature Section',
            bookmarkTitle: 'Synthetic Wet-Ink Signature Section',
            parentBookmark: null,
            level: 1,
            pageBreakBefore: true,
            blocks: [
              {
                type: 'signature-block',
                role: 'Synthetic Signer',
                signerName: 'Pat Example',
                // Milestone 73A: the model resolves each block's print mode
                // (signature-modes.js); 'blank' is the line signed by hand.
                signerRole: 'guardian',
                signatureMode: 'blank',
                fields: [
                  [{ label: 'Phone', value: '555-0100' }, { label: 'Street', value: '1 Test Way' }],
                  [{ label: 'City/State/Zip', value: 'Testville, FL 00000' }],
                ],
              },
            ],
          },
        ],
      };

      const doc = await generateVerifiedInventoryPdf(model);
      const rawPdfString = doc.output();

      return {
        rawPdfString,
        numPages: doc.internal.getNumberOfPages(),
        hasStructTreeRoot: /\/StructTreeRoot/.test(rawPdfString),
        hasMarkInfo: /\/MarkInfo\s*<<\s*\/Marked\s*true/.test(rawPdfString),
      };
    });

    expect(result.hasStructTreeRoot).toBe(true);
    expect(result.hasMarkInfo).toBe(true);
    expect(result.numPages).toBeGreaterThan(1);

    const extracted191Text = await extractPdfText(result.rawPdfString);
    expect(extracted191Text).toContain('Synthetic checklist item number 1 verifies');
    // Milestone 76H item 10 (decision 76H-2): each row's ticked state is in its
    // tag's /ActualText, on the row's first part; no "Yes — "/"No — " prints.
    const states = (await pdfActualTexts(result.rawPdfString)).map((t) => t.replace(/\s+/g, ' '));
    expect(states.filter((t) => /^(Checked|Not checked): Synthetic checklist item number \d+ /.test(t))).toHaveLength(70);
    expect(states.some((t) => t.startsWith('Checked: '))).toBe(true);
    expect(states.some((t) => t.startsWith('Not checked: '))).toBe(true);
    expect(extracted191Text).not.toMatch(/(?:Yes|No) — Synthetic/);
    // Wet-ink signatures carry no electronic-signature legal notice.
    expect(extracted191Text).not.toContain('pursuant to Fla. R. Gen. Prac');
    expect(extracted191Text).toContain('Signature');
    expect(extracted191Text).toContain('Testville');
    expect(extracted191Text).toContain('555-0100');
  });
});
```

### 3.2 `tests/e2e/pdf-table-semantics.spec.ts` — full file

Table-specific regularity checks, on the Annual Accounting (Milestone 43F)
and the Initial Inventory (Slice 19B): every `/Table` `/StructElem` must
carry a non-trivial `/Summary` nested correctly inside `/A << /O /Table ...
>>` (never as a stray direct entry), and `/ColSpan` must be numeric (never
`/ColSpan /3`). The Inventory test also requires `/Scope /Column` (at least
14) and `/Scope /Row` (more than 5) headers, and two specific spans: `3`
from the odd-sized key-value grid and `6` from Schedule A-1's totals row
(7 until Milestone 60E removed A-1's "Valuation Method" column).

```ts
import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { extractPdfText } from './support/pdf-extract';
import { installFixtureSupport, expectFileableFixture } from './support/fixture-completeness';
import { MINIMAL_VALID_ANNUAL, MINIMAL_VALID_GUARDIAN } from './support/fixtures';

test.describe('PDF Accessibility: Table Semantics, ColSpan & Multi-Page Continuation', () => {
  // Milestone 43F, Decision 2: this whole file exercised only
  // buildVerifiedInventoryModel (Guardian Inventory) -- a regression in
  // Annual/Trust/Final's own table rendering (they share the same
  // type:'table' section shape and the same pdf-engine.js renderer, but are
  // built by an entirely separate buildAnnualAccountingModel()) would ship
  // undetected. Scoped to Annual Accounting only, per the proposal's own
  // recommendation, rather than all nine filing types.
  test('Milestone 43F: Annual Accounting Schedule D-1 regularity with /ColSpan, /Summary, and multi-page table continuation', async ({ page }) => {
    await freshStartNoPassword(page);
    await installFixtureSupport(page);

    const inspection = await page.evaluate(async (base) => {
      const { buildAnnualAccountingModel, generateCourtFormPdf } = await (window as any).GuardianForms.testing.generateOutput.annualPdf();

      const schD1 = [];
      for (let i = 1; i <= 25; i++) {
        schD1.push({
          description: `Cash Account #${i}`,
          accountNo: `***${1000 + i}`,
          restricted: 'No',
          type: 'Checking',
          fullAmount: 10000 + i * 500,
          wardPct: 100,
        });
      }

      // A complete Annual filing, with only what this test is about written
      // over it: 25 Schedule D-1 rows to force multi-page continuation, and
      // every other schedule emptied so the pagination under test comes from
      // D-1 alone. Without the base, this literal was a filing the court
      // would have rejected -- 24 required answers missing -- and the PDF
      // whose table semantics are asserted here was a document no filer
      // could have submitted.
      const d = (window as any).__pgBuildFixture('annual', base, {
        wardName: 'Annual Table Semantics Ward',
        caseNumber: '26-004400-GD',
        county: 'Pinellas',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        guardian: 'Priya Chandra',
        attorney: 'Owen Blake, Esq.',
        schA: [],
        schB1: [], schB2: [], schB3: [], schB4: [],
        schC: [],
        schD1,
        schD2: [], schD3: [], schD4: [], schD5: [],
        schE: [], schF1: [], schF2: [],
        trusts: [{ hasTrust: 'No' }],
        // The base's reconcile explanation describes blank D schedules; this
        // fixture fills D-1 with 25 accounts, so it says so instead.
        reconcileExplanation: 'Test fixture: Schedule D-1 lists 25 cash accounts; no other schedules populated.',
      });

      const model = buildAnnualAccountingModel(d);
      const doc = await generateCourtFormPdf(model);
      const rawPdfString = doc.output();
      const numPages = doc.internal.getNumberOfPages();

      const tableMatches = [...rawPdfString.matchAll(/\/Type \/StructElem[\s\S]*?\/S \/Table[\s\S]*?>>/g)].map((m) => m[0]);
      const tableAttrSummaryMatches = [...rawPdfString.matchAll(/\/A\s*<<[\s\S]*?\/O\s*\/Table[\s\S]*?\/Summary\s*\(([^)]+)\)[\s\S]*?>>/g)].map((m) => m[1]);
      const straySummaryMatches = tableMatches.filter((tbl) => !tbl.includes('/A <<') && tbl.includes('/Summary'));
      const colSpanMatches = [...rawPdfString.matchAll(/\/ColSpan\s+(\d+)/g)].map((m) => parseInt(m[1], 10));
      const columnScopeMatches = [...rawPdfString.matchAll(/\/Scope \/Column/g)].map((m) => m[0]);

      return {
        numPages,
        tableCount: tableMatches.length,
        tableAttrSummaryMatches,
        straySummaryCount: straySummaryMatches.length,
        colSpanMatches,
        columnScopeCount: columnScopeMatches.length,
        rawPdfString,
        fixtureIssues: await (window as any).__pgFixtureIssues(d),
      };
    }, MINIMAL_VALID_ANNUAL);

    expectFileableFixture(inspection.fixtureIssues, 'the Annual table-semantics fixture');

    // 25 rows in a single schedule table forces multi-page continuation.
    expect(inspection.numPages).toBeGreaterThanOrEqual(2);
    expect(inspection.tableCount).toBeGreaterThan(0);
    expect(inspection.tableAttrSummaryMatches.length).toBe(inspection.tableCount);
    expect(inspection.straySummaryCount).toBe(0);
    for (const sumText of inspection.tableAttrSummaryMatches) {
      expect(sumText.length).toBeGreaterThan(3);
    }
    expect(inspection.columnScopeCount).toBeGreaterThan(0);
    expect(inspection.colSpanMatches.length).toBeGreaterThan(0);
    expect(inspection.rawPdfString).not.toContain('/ColSpan /');

    const extractedText = await extractPdfText(inspection.rawPdfString);
    expect(extractedText).toContain('Cash Account #1');
    expect(extractedText).toContain('Cash Account #25');
  });

  test('Slice 19B: Table semantics, regularity with /ColSpan, /Summary, and multi-page table continuation', async ({ page }) => {
    await freshStartNoPassword(page);
    await installFixtureSupport(page);

    const inspection = await page.evaluate(async (base) => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).GuardianForms.testing.generateOutput.guardianPdf();

      // Create model with:
      // 1. Asymmetric key-value grid (odd items)
      // 2. Multi-page Schedule A-1 table (25 items) to verify header repetition and regularity
      const mockItems = [];
      for (let i = 1; i <= 25; i++) {
        mockItems.push({
          propertyDescription: `Parcel #${i} - Residential Lot ${i}`,
          streetAddress: `${100 + i} Bayview Dr`,
          cityStateZip: 'Clearwater, FL 33755',
          valuationMethod: 'Appraisal',
          fullAssetValue: 150000 + (i * 5000),
          wardPercent: 100,
        });
      }

      const d = (window as any).__pgBuildFixture('guardian', base, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        gid: '2026-01-15',
        hasSafeDepositBox: true, // produces odd 3 items in Schedule D-3
        safeDepositBoxFiled: true,
        bondAmount: 100000,
        bondPeriodFrom: '2026-01-15',
        bondPeriodTo: '2027-01-15',
        bondingCompany: 'Travelers Casualty',
        // Schedule D-4's grid must hold an ODD number of items, which is what
        // makes the engine pad the leftover pair with /ColSpan 3 -- the
        // behaviour this test exists for. Amount + Period + Company was three
        // until Milestone 60H added the bond-waiver answer (four, even);
        // answering Yes adds its order date, restoring five. Asserting the
        // padding without a grid that needs padding would prove nothing.
        bondDepositoryState: 'bond-waived',
        bondWaivedDate: '2026-01-20',
        scheduleA1: mockItems,
        scheduleA2: [],
        scheduleB1: [],
        scheduleB2: [],
        scheduleB3: [],
        scheduleB4: [],
        scheduleC1: [],
        scheduleC2: [],
        scheduleC3: [],
        scheduleC4: [],
        scheduleC5: [],
        // A-1 now carries 25 entries, so its "no items" box must come off or
        // the filing both lists property and swears there is none.
        scheduleNoItems: { a1: false },
        serviceRecipients: [], // verifies fallback row for empty service recipients
        // Milestone 57B: an empty D-5 is only fileable once the filer says so.
        // 'Yes' leaves the list empty, so the no-recipients line below is
        // still the branch under test (Milestone 74F: "No service recipients
        // are required." for a Yes; it was "None listed.").
        serviceNoRecipients: 'Yes',
      });

      const model = buildVerifiedInventoryModel(d);

      const doc = await generateVerifiedInventoryPdf(model);
      const rawPdfString = doc.output();
      const numPages = doc.internal.getNumberOfPages();

      // Find all Table elements
      const tableMatches = [...rawPdfString.matchAll(/\/Type \/StructElem[\s\S]*?\/S \/Table[\s\S]*?>>/g)].map(m => m[0]);

      // Verify Table Summaries are strictly located inside /A << /O /Table /Summary (...) >> per ISO 32000-1 Table 323
      const tableAttrSummaryMatches = [...rawPdfString.matchAll(/\/A\s*<<[\s\S]*?\/O\s*\/Table[\s\S]*?\/Summary\s*\(([^)]+)\)[\s\S]*?>>/g)].map(m => m[1]);

      // Check for stray /Summary direct entries on StructElem (which violate ISO 32000-1)
      const straySummaryMatches = tableMatches.filter(tbl => !tbl.includes('/A <<') && tbl.includes('/Summary'));

      // Check ColSpan attributes in raw PDF
      const colSpanMatches = [...rawPdfString.matchAll(/\/ColSpan\s+(\d+)/g)].map(m => parseInt(m[1], 10));

      // Check Table Header Column and Row scopes
      const columnScopeMatches = [...rawPdfString.matchAll(/\/Scope \/Column/g)].map(m => m[0]);
      const rowScopeMatches = [...rawPdfString.matchAll(/\/Scope \/Row/g)].map(m => m[0]);

      return {
        rawPdfString,
        numPages,
        sectionTitles: model.sections.map(s => s.title),
        tableCount: tableMatches.length,
        tableAttrSummaryMatches,
        straySummaryCount: straySummaryMatches.length,
        colSpanMatches,
        columnScopeCount: columnScopeMatches.length,
        rowScopeCount: rowScopeMatches.length,
        fixtureIssues: await (window as any).__pgFixtureIssues(d),
      };
    }, MINIMAL_VALID_GUARDIAN);

    // No exemption needed even though this fixture empties the service-recipient
    // list on purpose: validateGuardian() requires a recipient's details only
    // once a recipient row exists, and since Milestone 57B an empty D-5 is a
    // fileable state as soon as the filer attests to it, which the fixture
    // above does. The no-recipients line asserted below is a real document,
    // not a test-only one.
    expectFileableFixture(inspection.fixtureIssues, 'the Initial Inventory table-semantics fixture');

    const {
      numPages,
      sectionTitles,
      tableCount,
      tableAttrSummaryMatches,
      straySummaryCount,
      colSpanMatches,
      columnScopeCount,
      rowScopeCount,
      rawPdfString,
    } = inspection;

    // Multi-page verification: 25 items in Schedule A-1 expands total pages significantly
    expect(numPages).toBeGreaterThanOrEqual(4);

    // Table Counts & Summaries: Every table must carry /Summary inside its /A << /O /Table >> dictionary
    expect(tableCount).toBeGreaterThan(0);
    expect(tableAttrSummaryMatches.length).toBe(tableCount);
    expect(straySummaryCount).toBe(0);
    for (const sumText of tableAttrSummaryMatches) {
      expect(sumText.length).toBeGreaterThan(3);
    }

    // Header Scopes: Column scope for schedule tables, Row scope for key-value grids
    // Note: Continuation table headers on page-splits are marked as Artifacts (not logical TH), so columnScopeCount is precisely 14
    expect(columnScopeCount).toBeGreaterThanOrEqual(14);
    expect(rowScopeCount).toBeGreaterThan(5);

    // Regularity & ColSpan:
    // /ColSpan must be emitted as a numeric integer (e.g. /ColSpan 3 or /ColSpan 7), NOT /ColSpan /3
    expect(colSpanMatches.length).toBeGreaterThan(0);
    expect(colSpanMatches).toContain(3); // from odd key-value grid (1 + 3 = 4 cols)
    // Milestone 43F: Schedule A-1 now has 8 columns (Personal Residence?/
    // Income Property? tri-state columns were added after this assertion
    // was written), so its single-value totals row spans headers.length -
    // 1 = 7, not the 5 this test asserted for years -- confirmed a stale
    // assertion, not a regression, by reading pdf-model.js's own current
    // 8-entry header array and pdf-engine.js's labelColSpan computation.
    // Milestone 60E then removed A-1's "Valuation Method" column, which read
    // a field scheduleA1 rows never had and printed blank on every filing, so
    // the same totals row now spans 6 of 7. Same check, one column narrower.
    expect(colSpanMatches).toContain(6); // from Schedule A-1 totals (6 + 1 = 7 cols)
    expect(rawPdfString).not.toContain('/ColSpan /');

    // Verify Section Titles include Part VI
    expect(sectionTitles).toContain('Part VI — CERTIFICATE OF SERVICE');

    // Verify neutral notice when service recipients list is empty (no empty-table shell or procedural claims)
    const extractedText19B = await extractPdfText(rawPdfString);
    expect(extractedText19B).toContain('No service recipients are required.');
  });
});
```

### 3.3 `tests/e2e/pdf-fonts-and-xmp.spec.ts` — full file

Embedded-font and XMP conditional-logic checks: `/FontFile2`,
`/FontDescriptor`, `/CIDFontType2` or `/Type0`, `/ToUnicode`, and the
`pdfuaid:part` XMP claim, both for the base case and for
`buildXmpPacket()`'s own three-way conditional (`embedFonts: false` ⇒ no
claim; `claimPdfUa: true` ⇒ claim; default ⇒ claim).

```ts
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
      const { buildAnnualAccountingModel, generateCourtFormPdf } = await (window as any).GuardianForms.testing.generateOutput.annualPdf();
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
      const { buildXmpPacket } = await (window as any).GuardianForms.testing.generateOutput.guardianPdf();
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
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).GuardianForms.testing.generateOutput.guardianPdf();
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
```

### 3.4 `tests/e2e/plan-pdf-wcag-compliance.spec.ts` — full file

Applies the same methodology across all four Plan filing types
(`planInitial`, `planAnnual`, `planMinor`, `planSimplified`) via one
`CONFIGS`-driven loop, checking `/StructTreeRoot`, `/MarkInfo`, "no raster
image" (`/Subtype /Image` / `/Filter /DCTDecode` absent), page count, expected
extracted text per type, and heading-order-never-skips-a-level. Two
additions since 2026-09-18: the Plan Initial's ticked "Private Residence"
row is read from its `/ActualText` (`expectedChecked`, Milestone 76H item
10), and the Plan Simplified's guardian signature must print
"/s/ Casey Nguyen" with the caption "Electronic signature (/s/)" (Milestone
77E). This is also the file that carries the axe-core rejection rationale
quoted in §1.

```ts
import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { extractPdfText, pdfActualTexts } from './support/pdf-extract';

// Milestone 19-2: brings the four plan-* features (previously raster
// html2pdf/html2canvas only, outside the Milestone 17-19 accessibility
// work) onto the shared tagged/vector PDF engine. Mirrors the assertion
// style of pdf-wcag-compliance.spec.ts's Slice 19C/19E tests for the
// other three features: call the engine directly with a hand-built model
// via page.evaluate rather than through the UI Save-as-PDF button, since
// the app's navigate() has a pre-existing race (confirmed independent of
// this milestone -- it also reproduces on an unmodified checkout) where
// it doesn't await renderPage(), making UI-driven PDF-export specs flaky.
//
// Milestone 43E: the four bodies below were hand-duplicated (build model,
// generate PDF, check StructTreeRoot/no-raster/page-count, extract text,
// assert content) -- converted to one CONFIGS-driven loop, matching the
// pattern pdf-preview-viewer.spec.ts already established for these same
// four types. Each type's own model data (genuinely distinct field names
// per filing type) and its own list of expected extracted-text substrings
// are the only real per-type variation; `minPages` captures the one
// assertion that wasn't uniform across all four.
//
// Milestone 43F, Decision 1: the proposal's own recommended default (add
// real axe-core WCAG scans, using pdf-form-specific.spec.ts:538 as the
// template) does not survive direct inspection -- that test is titled
// "axesCheck" but never calls axe-core, and no axe-core dependency or call
// exists anywhere in this repo (confirmed via a repo-wide grep). axe-core
// is also architecturally the wrong tool here regardless: it scans a live
// browser DOM for accessibility issues, and this whole file (like the rest
// of the PDF-accessibility cluster) never renders anything to a DOM --
// jsPDF hands back raw PDF bytes, which axe-core has no way to inspect.
// What this cluster actually tests, everywhere, is PDF/UA-1 *tag*
// structure via direct regex assertions against the generated PDF bytes
// (StructTreeRoot, MarkInfo, /ColSpan, heading order, embedded fonts). This
// file only checked MarkInfo for one of the four Plan types (Plan Initial)
// -- an asymmetry inherited unchanged through 43E's own table-driven
// rewrite. Closing the actual coverage gap means applying that same
// structural-regex methodology uniformly: MarkInfo is now asserted for all
// four types, and a heading-order-has-no-skipped-level check (the same
// computation pdf-form-specific.spec.ts's Milestone 20 test already uses)
// is added for all four too.

type WcagConfig = {
  name: string;
  // The GuardianForms.testing.generateOutput member that hands back this Plan's PDF builders.
  outputMember: string;
  buildFnName: string;
  model: Record<string, unknown>;
  minPages: number;
  expectedText: string[];
  // Milestone 76H item 10: checklist rows a screen reader hears as ticked
  // (their tag's /ActualText, "Checked: ...").
  expectedChecked?: string[];
};

const CONFIGS: WcagConfig[] = [
  {
    name: 'Plan Initial',
    outputMember: 'planInitialPdf',
    buildFnName: 'buildPlanInitialModel',
    minPages: 1,
    model: {
      wardName: 'Initial Plan Ward',
      caseNumber: '26-003100-GD',
      county: 'Pinellas',
      successorGuardianship: '',
      inceptionDate: '2026-01-10',
      lettersSignedDate: '2026-01-12',
      periodFrom: '2026-01-12',
      periodTo: '2026-03-12',
      guardianNames: 'Jordan Alvarez',
      wardLiving: 'In a private residence leased or owned by them (house, condo or apartment)',
      residenceAddress: '10 Bay St',
      residenceCityStateZip: 'Clearwater, FL 33755',
      residencePhone: '727-555-0101',
      q1PreexistingDirectives: 'None on file.',
      q2PrivateResidence: true,
      q3MedPrimary: true,
      q3MedDentist: true,
      q4None: true,
      q4Explain: 'No mental health services are needed at this time.',
      q9Providers: [
        { name: 'Ann Rivera', providerType: 'Primary Care', examDate: '2026-01-05', street: '1 Med Plz', cityStateZip: 'Clearwater, FL 33755' },
      ],
      q7MajorDecisions: 'Coordinate specialized care.',
      q8RestoreRights: 'No change.',
      q9DNR: false,
      q9LivingWill: false,
      planGuardians: [
        { name: 'Jordan Alvarez', useSlashS: false, signatureDate: '2026-03-01', ssn: '***-**-1234', phone: '727-555-0102', relationship: 'Son', street: '10 Bay St', cityStateZip: 'Clearwater, FL 33755' },
      ],
      attorney_name: 'Casey Nolan, Esq.',
      attorney_signatureDate: '2026-03-01',
      attorney_bar: '0123456',
      attorney_phone: '727-555-0199',
      attorney_street: '200 Court Ave',
      attorney_cityStateZip: 'Clearwater, FL 33755',
    },
    // Legacy useSlashS values are inert: normal filings use the standard
    // electronic /s/ presentation.
    // Milestone 76H item 10 (decision 76H-2): the ticked row prints its label
    // alone; its "Yes" is in its tag (expectedChecked), not on the page.
    expectedText: ['Private Residence', 'Ann Rivera', 'Signature (Electronic /s/', 'Jordan Alvarez', '/s/ Jordan Alvarez', '0123456'],
    expectedChecked: ['Private Residence'],
  },
  {
    name: 'Plan Annual',
    outputMember: 'planAnnualPdf',
    buildFnName: 'buildPlanAnnualModel',
    minPages: 1,
    model: {
      wardName: 'Annual Plan Ward',
      caseNumber: '26-003200-GD',
      county: 'Pinellas',
      ssn: '***-**-9999',
      gid: '2025-01-10',
      periodFrom: '2026-01-10',
      periodTo: '2027-01-10',
      guardian: 'Morgan Ellis',
      attorney: 'Drew Sato, Esq.',
      wardLiving: 'In a private residence leased or owned by them',
      residenceAddress: '22 Palm Ct',
      residenceCityStateZip: 'Largo, FL 33770',
      q3SettingPrivate: true,
      q3MedPrimary: true,
      q3MentalNone: true,
      q3PersonalFamily: true,
      q3SocialFamily: true,
      q3BenefitsNone: true,
      q4Providers: [
        { name: 'Dr. Lee Park', street: '9 Clinic Rd', cityStateZip: 'Largo, FL 33770', providerType: 'Primary Care', visits: '4' },
      ],
      q5SocialSkills: 'Engages well with family.',
      q5Activities: 'Weekly community outings.',
      rights: { vote: 'Retained' },
      adls: { bathing: 'Independent' },
      q9MentalNone: true,
      q9PhysNone: true,
      q10NoDirectives: true,
      q10StepResidence: true,
      q11NoRemuneration: true,
      q11NoRemunerationName: 'Morgan Ellis',
      certConsulted: true,
      certPhysicianAttached: true,
      planGuardians: [
        { name: 'Morgan Ellis', signatureDate: '2026-03-01', ssn: '***-**-4321', phone: '727-555-0200', mailingStreet: '22 Palm Ct', mailingCityStateZip: 'Largo, FL 33770' },
      ],
      attorney_signatureDate: '2026-03-01',
      attorney_bar: '0234567',
      attorney_phone: '727-555-0299',
      attorney_street: '300 Court Ave',
      attorney_cityStateZip: 'Largo, FL 33770',
    },
    expectedText: ['Lee Park', 'Signature (Electronic /s/', 'Morgan Ellis', '0234567'],
  },
  {
    name: 'Plan Minor',
    outputMember: 'planMinorPdf',
    buildFnName: 'buildPlanMinorModel',
    minPages: 1,
    model: {
      wardName: 'Minor Ward',
      ucn: '522026GD001234',
      ref: 'REF-9001',
      county: 'Pinellas',
      periodFrom: '2026-01-01',
      periodTo: '2027-01-01',
      guardianName: 'Taylor Reed',
      q1ResidenceName: 'Family Home',
      q1Street: '5 Oak Ln',
      q1City: 'Clearwater',
      q1State: 'FL',
      q1Zip: '33755',
      q3Providers: [
        { first: 'Sam', last: 'Ortiz', providerType: 'Pediatrician', visits: '2', street: '1 Med Plz', city: 'Clearwater', state: 'FL', zip: '33755' },
      ],
      q4Primary: true,
      q4PT: true,
      q5SchoolProgress: 'Progressing well.',
      q5SocialDevelopment: 'Improving peer relationships.',
      q5Communicates: 'Communicates clearly.',
      q5Interpersonal: 'Maintains close friendships.',
      q5NoUnmetNeeds: true,
      certConsulted: true,
      certPhysicianAttached: true,
      planGuardians: [
        { name: 'Taylor Reed', signatureDate: '2026-03-01', tin: '***-**-1111', phone: '727-555-0300', mailingStreet: '5 Oak Ln', mailingCityStateZip: 'Clearwater, FL 33755' },
      ],
      preparer_name: 'Jamie Kim',
      preparer_signatureDate: '2026-03-01',
      attorney_name: 'Robin Cruz, Esq.',
      attorney_signatureDate: '2026-03-01',
      attorney_bar: '0345678',
    },
    expectedText: ['Ortiz', 'Signature (Electronic /s/', 'Taylor Reed', 'Robin Cruz'],
  },
  {
    name: 'Plan Simplified',
    outputMember: 'planSimplifiedPdf',
    buildFnName: 'buildPlanSimplifiedModel',
    minPages: 0,
    model: {
      wardName: 'Simplified Plan Ward',
      caseNumber: '26-003300-GD',
      county: 'Pinellas',
      periodFrom: '2026-01-01',
      periodTo: '2027-01-01',
      q1Residences: 'Same address throughout the year.',
      q2BestPlacement: 'Close to family support.',
      q3MedicalTreatment: 'Annual physical exam only.',
      q4Diagnosis: 'Mild cognitive impairment.',
      q5SocialServices: 'Weekly visits from family.',
      q6Interaction: 'Positive and engaged.',
      q7RestoreRights: 'No',
      q8DNR: true,
      q9Remuneration: 'No',
      planGuardians: [
        { name: 'Casey Nguyen', signatureDate: '2026-03-01', email: 'casey@example.com', phone: '727-555-0400', mailingAddress: '7 Bay Dr, Largo, FL 33770' },
      ],
    },
    // Milestone 77E: the guardian's "/s/" carries "Electronic signature (/s/)".
    expectedText: ['Do Not Resuscitate', '/s/ Casey Nguyen', 'Electronic signature (/s/)'],
  },
];

test.describe('Milestone 19-2: Plan-* features on the shared vector PDF engine', () => {
  for (const config of CONFIGS) {
    test(`${config.name}: generates a tagged, non-raster PDF with electronic signature content`, async ({ page }) => {
      await freshStartNoPassword(page);

      const result = await page.evaluate(async ({ outputMember, buildFnName, model }) => {
        const mod = await (window as any).GuardianForms.testing.generateOutput[outputMember]();
        const doc = await mod.generateCourtFormPdf(mod[buildFnName](model));
        const rawPdfString = doc.output();
        const headingLevels = [...rawPdfString.matchAll(/\/S \/(H[1-6])/g)].map((m) => parseInt(m[1].slice(1), 10));
        return {
          numPages: doc.internal.getNumberOfPages(),
          hasStructTreeRoot: /\/StructTreeRoot/.test(rawPdfString),
          hasMarkInfo: /\/MarkInfo\s*<<\s*\/Marked\s*true/.test(rawPdfString),
          hasNoRasterImage: !/\/Subtype\s*\/Image/.test(rawPdfString) && !/\/Filter\s*\/DCTDecode/.test(rawPdfString),
          headingLevels,
          rawPdfString,
        };
      }, { outputMember: config.outputMember, buildFnName: config.buildFnName, model: config.model });

      const extractedText = await extractPdfText(result.rawPdfString);

      expect(result.hasStructTreeRoot).toBe(true);
      expect(result.hasMarkInfo).toBe(true);
      expect(result.hasNoRasterImage).toBe(true);
      expect(result.numPages).toBeGreaterThan(config.minPages);
      for (const text of config.expectedText) expect(extractedText).toContain(text);
      if (config.expectedChecked) {
        const states = (await pdfActualTexts(result.rawPdfString)).map((t) => t.replace(/\s+/g, ' '));
        for (const label of config.expectedChecked) {
          expect(states.some((t) => t.startsWith('Checked: ') && t.includes(label)), `${label} is tagged ticked`).toBe(true);
        }
      }

      // Milestone 43F: PDF/UA-1 heading order must never skip a level.
      let prevLevel = 0;
      for (const level of result.headingLevels) {
        if (prevLevel > 0) expect(level).toBeLessThanOrEqual(prevLevel + 1);
        prevLevel = level;
      }
    });
  }
});
```

### 3.5 `tests/e2e/pdf-form-specific.spec.ts` — the "axesCheck" test (lines 568–744)

This is the test whose name ("axesCheck") is the source of the "is axe
integrated?" question in the first place. As documented in §1, it does not
call axe-core; it runs the same regex-structural methodology against a
fileable Initial Inventory (built over `MINIMAL_VALID_GUARDIAN` and checked
with `expectFileableFixture()`), adding checks the other files don't:
`/ParentTree` completeness against actual page count, exactly-one
`/ViewerPreferences`, an unpolluted XMP `begin=""` (no BOM corruption), zero
`/Figure` tags used for signature blocks, and zero redundant `/ColSpan 1` or
`/RowSpan 1` (which `pdf-accessibility.js`'s `serialize()` — §2.1, lines
135–141 — strips before writing, per Matterhorn Protocol checkpoint 15-003).
Quoted verbatim, with the file's own indentation:

```ts
  test('Milestone 20 / axesCheck: Harold Thomas Bennett Initial Inventory PDF/UA-1 and WCAG 2.1 AA verification', async ({ page }) => {
    await freshStartNoPassword(page);
    await installFixtureSupport(page);

    const inspection = await page.evaluate(async (base) => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).GuardianForms.testing.generateOutput.guardianPdf();

      const d = (window as any).__pgBuildFixture('guardian', base, {
        wardName: 'Harold Thomas Bennett',
        caseNumber: '26-002487-GD',
        county: 'Pinellas',
        gid: '2026-01-15',
        typeOfGuardianship: 'Plenary',
        guardianName: 'Rachel M. Alvarez',
        attorneyForGuardian: 'Robert Vance, Esq.',
        isAmended: false,
        signatureStyle: 'typed',
        hasSafeDepositBox: false,
        safeDepositBoxFiled: null,
        bondAmount: 50000,
        bondPeriodFrom: '2026-01-15',
        bondPeriodTo: '2027-01-15',
        bondingCompany: 'Travelers Casualty and Surety',
        serviceDate: '2026-03-01',
        witnesses: [
          { name: 'David Miller', address: '120 Central Ave, St. Petersburg, FL', occupation: 'Paralegal' },
        ],
        guardians: [
          {
            name: 'Rachel M. Alvarez',
            signatureDate: '2026-02-28',
            phone: '727-555-0144',
            streetAddress: '450 2nd Ave N',
            cityStateZip: 'St. Petersburg, FL 33701',
            ssnEin: '***-**-6789',
          },
        ],
        preparer: {
          name: 'Marcus Thorne',
          signatureDate: '2026-02-28',
          phone: '727-555-0188',
          streetAddress: '780 4th St N',
          cityStateZip: 'St. Petersburg, FL 33701',
          ssnEin: '***-**-4321',
        },
        attorney: {
          name: 'Robert Vance, Esq.',
          barNumber: '0184920',
          filingDate: '2026-03-01',
          signatureDate: '2026-03-01',
          phone: '727-555-0199',
          streetAddress: '100 2nd Ave S, Suite 400',
          cityStateZip: 'St. Petersburg, FL 33701',
        },
        serviceAttorney: {
          name: 'Elena Rostova',
          barNumber: '0293841',
          signatureDate: '2026-03-01',
          phone: '727-555-0177',
          streetAddress: '100 2nd Ave S, Suite 400',
          cityStateZip: 'St. Petersburg, FL 33701',
        },
        serviceRecipients: [
          { name: 'Sarah Bennett', line2: '1420 5th Ave N', line3: 'St. Petersburg, FL 33705', method: 'E-Portal' },
        ],
        scheduleA1: [
          { propertyDescription: 'Primary Residence', streetAddress: '1420 5th Ave N', cityStateZip: 'St. Petersburg, FL 33705', valuationMethod: 'Appraisal', fullAssetValue: 250000, wardPercent: 100 },
        ],
        scheduleA2: [
          { lenderName: 'Wells Fargo Home Mortgage', lenderAddress: 'PO Box 10335', lenderCityStateZip: 'Des Moines, IA 50306', relatedProperty: '1420 5th Ave N', liabilityType: 'Mortgage', fullDebtBalance: 45000, wardPercent: 100 },
        ],
        scheduleB1: [
          { institutionName: 'Raymond James Bank', accountType: 'Checking', accountNumber: '***4821', streetAddress: '880 Carillon Pkwy', cityStateZip: 'St. Petersburg, FL 33716', fullAssetAmount: 38250, wardPercent: 100 },
        ],
        scheduleB2: [
          { description: '2021 Toyota Camry', streetAddress: '1420 5th Ave N', cityStateZip: 'St. Petersburg, FL 33705', valuationMethod: 'KBB Private Party', fullAssetValue: 18500, wardPercent: 100 },
        ],
        scheduleB3: [],
        scheduleB4: [],
        scheduleC1: [
          { payerName: 'Social Security Administration', payerAddress: '1 Lemon St, Clearwater, FL 33756', typeOfIncome: 'Retirement', frequencyOfPayment: 'Monthly', paymentBasis: 'Monthly ($1,850/mo)', annualIncomeAmount: 22200, wardPercent: 100 },
        ],
        scheduleC2: [],
        scheduleC3: [],
        scheduleC4: [],
        scheduleC5: [],
        // The populated schedules' "no items" boxes come off; the rest stay
        // ticked, as the base has them.
        scheduleNoItems: {
          a1: false,
          a2: false,
          b1: false,
          b2: false,
          c1: false,
        },
      });

      const model = buildVerifiedInventoryModel(d, {
        signatureStyle: 'typed',
        printDate: '2026-09-05',
      });

      const doc = await generateVerifiedInventoryPdf(model);
      const rawPdfString = doc.output();
      const numPages = doc.internal.getNumberOfPages();

      // Check ParentTree
      const parentTreeMatch = rawPdfString.match(/\/ParentTree\s+(\d+)\s+0\s+R/);
      const parentTreeId = parentTreeMatch ? parentTreeMatch[1] : null;
      const parentTreeObjMatch = rawPdfString.match(new RegExp(`${parentTreeId}\\s+0\\s+obj\\s*<<[\\s\\S]*?>>\\s*endobj`));
      const parentTreeObj = parentTreeObjMatch ? parentTreeObjMatch[0] : '';

      // Check Catalog ViewerPreferences
      const catalogMatch = rawPdfString.match(/\d+ 0 obj\s*<<[\s\S]*?\/Type \/Catalog[\s\S]*?>>\s*endobj/);
      const catalogObj = catalogMatch ? catalogMatch[0] : '';
      const viewerPrefMatches = catalogObj.match(/\/ViewerPreferences/g) || [];

      // Check XMP begin packet
      const xmpBeginMatch = rawPdfString.match(/<\?xpacket begin="([^"]*)"/);
      const xmpBeginValue = xmpBeginMatch ? xmpBeginMatch[1] : null;

      // Check StructElems: ensure no Figure for signatures
      const figureStructElems = [...rawPdfString.matchAll(/\/Type \/StructElem[\s\S]*?\/S \/Figure/g)].map(m => m[0]);

      // Check for redundant ColSpan 1
      const redundantColSpans = [...rawPdfString.matchAll(/\/ColSpan\s+1\b/g)].map(m => m[0]);
      const redundantRowSpans = [...rawPdfString.matchAll(/\/RowSpan\s+1\b/g)].map(m => m[0]);

      // Check heading hierarchy for skips
      const headingLevels = [...rawPdfString.matchAll(/\/S \/(H[1-6])/g)].map(m => parseInt(m[1].slice(1), 10));

      return {
        rawPdfString,
        numPages,
        parentTreeObj,
        catalogObj,
        viewerPrefMatchesCount: viewerPrefMatches.length,
        xmpBeginValue,
        figureStructElemsCount: figureStructElems.length,
        redundantColSpansCount: redundantColSpans.length,
        redundantRowSpansCount: redundantRowSpans.length,
        headingLevels,
        fixtureIssues: await (window as any).__pgFixtureIssues(d),
      };
    }, MINIMAL_VALID_GUARDIAN);

    expectFileableFixture(inspection.fixtureIssues, "the Milestone 20 Initial Inventory fixture");

    // Assertions
    // 1. All pages are present in ParentTree /Nums
    for (let p = 0; p < inspection.numPages; p++) {
      expect(inspection.parentTreeObj).toContain(`${p} [`);
    }

    // 2. ViewerPreferences is present exactly once in Catalog
    expect(inspection.viewerPrefMatchesCount).toBe(1);
    expect(inspection.catalogObj).toContain('/DisplayDocTitle true');

    // 3. XMP packet uses ASCII begin="" (no corrupted BOM)
    expect(inspection.xmpBeginValue).toBe('');

    // 4. Zero Figure tags for signature blocks
    expect(inspection.figureStructElemsCount).toBe(0);

    // 5. Zero redundant ColSpan: 1 or RowSpan: 1
    expect(inspection.redundantColSpansCount).toBe(0);
    expect(inspection.redundantRowSpansCount).toBe(0);

    // 6. Zero skipped heading levels
    let prev = 0;
    for (const lvl of inspection.headingLevels) {
      if (prev > 0) {
        expect(lvl).toBeLessThanOrEqual(prev + 1);
      }
      prev = lvl;
    }
  });
```

The same file holds two more tests built the same way, not quoted here:

- **Slice 19C** (lines 10–174), the Simplified Accounting: `%PDF-1.7`;
  `/MarkInfo << /Marked true >>`, `/Type /StructTreeRoot`, `/Tabs /S`,
  `/ViewerPreferences`, `/DisplayDocTitle true` and `/Lang (en-US)` present;
  no `/Subtype /Image` or `/DCTDecode`; at least six `/S /H1` headings and
  two signature `Part`s (`/T (Signature: ...)`); at least three tables, every
  one with its `/Summary` inside `/A << /O /Table >>` and none stray.
- **Slice 19E** (lines 176–450), the Annual Accounting: `/StructTreeRoot`,
  `/ParentTree`, `/Tabs /S` and `/ViewerPreferences` present, no
  `/Subtype /Image`; a **table-regularity** audit (lines 288–318) that maps
  every object, sums each `TR`'s cells (counting a cell's `/ColSpan`) and
  requires every row of each of at least ten tables to sum alike; and the
  same xref and untagged-text audits as Slice 19D (lines 320–369; asserted
  at lines 412–419 with more than 100 xref objects and more than 100 text
  operators).

### 3.6 `tests/e2e/support/pdf-extract.ts` — the text- and tag-reading support helper

Layered on top of the regex checks wherever a test also needs to prove
*visible, readable* text — i.e. that the embedded TrueType fonts'
`/ToUnicode` CMaps actually decode correctly, not just that the tag
structure exists. Uses `pdfjs-dist` (the same PDF.js engine used elsewhere in
this repo for supplemental-document handling) to parse the generated bytes
and extract real text content. Since Milestone 59C-2 the decode and the
load are shared by every reader in the file, and each load is released
afterwards. The parts this document relies on, by line range — the shared
decode and loading (lines 1–55):

```ts
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib';

const DATA_URI_PREFIX = 'data:application/pdf;base64,';

/**
 * Milestone 59C-2 (C4). One decode, shared by every entry point below; this
 * logic was copy-pasted into three of them.
 *
 * pdfjs-dist rejects a Node Buffer (a Uint8Array subclass) with "Please
 * provide binary data as Uint8Array", and separately detaches whatever
 * ArrayBuffer it is given -- so a second call sharing that same buffer (as
 * getPdfMetadata() and extractPdfText() used to, on the same downloaded
 * bytes) failed with "Cannot perform Construct on a detached ArrayBuffer".
 * `new Uint8Array(typedArray)` copies into an independent plain Uint8Array
 * rather than viewing the source's buffer, avoiding both.
 */
function toUint8Array(pdfData: Uint8Array | string): Uint8Array {
  if (typeof pdfData === 'string') {
    if (pdfData.startsWith(DATA_URI_PREFIX)) {
      return new Uint8Array(Buffer.from(pdfData.slice(DATA_URI_PREFIX.length), 'base64'));
    }
    return new Uint8Array(Buffer.from(pdfData, 'latin1'));
  }
  return new Uint8Array(pdfData);
}

/**
 * Loads the PDF once, hands the document to `read`, and always releases the
 * loading task. PDF.js holds a worker and page caches per document; without
 * the destroy() these accumulated for every inspection in a run.
 */
async function withPdfDocument<T>(
  pdfData: Uint8Array | string,
  read: (pdf: any) => Promise<T>,
): Promise<T> {
  const loadingTask = pdfjsLib.getDocument({ data: toUint8Array(pdfData), verbosity: 0 });
  try {
    return await read(await loadingTask.promise);
  } finally {
    // Never let cleanup failure mask the real result or a real error.
    await loadingTask.destroy().catch(() => {});
  }
}

/** Text runs per page, kept apart. The shared basis for both text readers. */
async function pageTextItems(pdf: any): Promise<string[][]> {
  const pages: string[][] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => String(item.str)));
  }
  return pages;
}
```

`extractPdfText()` (lines 101–108):

```ts
/**
 * Extracts readable Unicode text from a PDF binary string, data URI, or Buffer using PDF.js.
 * Validates that TrueType font programs with /ToUnicode CMaps correctly decode to readable text.
 */
export async function extractPdfText(pdfData: Uint8Array | string): Promise<string> {
  return withPdfDocument(pdfData, async (pdf) =>
    (await pageTextItems(pdf)).map((runs) => runs.join(' ') + '\n').join(''));
}
```

and, new since 2026-09-18, `pdfActualTexts()` (lines 162–177), which reads
every structure element's `/ActualText` with pdf-lib's object model rather
than a regex:

```ts
/**
 * Milestone 76H item 10: every structure element's /ActualText, decoded --
 * what assistive technology reads in place of the element's content (a
 * checklist row's ticked state). Read with pdf-lib's object model, never a
 * regex over the file (AGENTS.md section 10, P2).
 */
export async function pdfActualTexts(pdfData: Uint8Array | string): Promise<string[]> {
  const doc = await PDFDocument.load(toUint8Array(pdfData), { updateMetadata: false });
  const out: string[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict) || obj.get(PDFName.of('Type')) !== PDFName.of('StructElem')) continue;
    const actual = obj.get(PDFName.of('ActualText'));
    if (actual instanceof PDFString || actual instanceof PDFHexString) out.push(actual.decodeText());
  }
  return out;
}
```

(The same file also exports `extractPdfTextRuns()` (lines 76–89),
`extractPdfTextItems()` (lines 119–121), `getPdfMetadata()` (lines
137–139) and `inspectPdf()` (lines 155–160) for related but non-WCAG
purposes — positioned text runs for layout assertions, per-run text-item
extraction for table-cell-address assertions, and PDF Info-dictionary
metadata reads. Not reproduced here as they're outside this document's
scope.)

---

## 4. Summary: what each check proves, and where

| Check | Regex / method | Proves | File(s) |
| --- | --- | --- | --- |
| Tagged PDF | `/MarkInfo << /Marked true >>` in Catalog | Screen readers will treat this as a tagged, navigable document | `pdf-structure-tags` (19A, 19-1), `plan-pdf-wcag-compliance`, `pdf-form-specific` (19C) |
| Structure tree exists & resolves | `/StructTreeRoot` referenced from Catalog resolves to an object whose own `/Type` is `/StructTreeRoot` (not `/StructElem`) | The logical structure tree is real, not a dangling/wrong reference | `pdf-structure-tags` (19A); presence only in `plan-pdf-wcag-compliance` and `pdf-form-specific` (19C, 19E) |
| Every page reachable | `/ParentTree`'s `/Nums` contains an entry `N [ ... ]` for every page index `0..numPages-1` | Assistive tech can map any page back into the structure tree | `pdf-structure-tags` (19A), `pdf-form-specific` (axesCheck) |
| Tab order | Every `/Page` dict contains `/Tabs /S` and the correct `/StructParents N` | Keyboard/AT navigation follows structure order, not physical draw order | `pdf-structure-tags` (19A); `pdf-form-specific` (19C, 19E) checks only that `/Tabs /S` occurs |
| 100% marked content | Every `Tj`/`TJ`/`'`/`"` text-showing operator inside `BT...ET` occurs at marked-content depth > 0 (inside `BDC...EMC`) | Zero invisible-to-AT text anywhere in the document — measured for the Initial Inventory, the Simplified Accounting and the Annual Accounting; not for the Plans | `pdf-structure-tags` (Slice 19D), `pdf-form-specific` (Slice 19E) |
| Chrome excluded from reading order | Running headers/footers/backgrounds wrapped in `/Artifact << ... >> BDC ... EMC`, not tagged content | Screen readers skip repetitive/decorative chrome | `pdf-structure-tags` (19A) |
| Table semantics | `/S /Table`, `/S /TR`, `/S /TH`, `/S /TD` structure elements exist; every `/Table` carries `/A << /O /Table /Summary (...) >>` (never a stray direct `/Summary`) | Tables are read as tables, with a real summary, not as unstructured text | `pdf-structure-tags`, `pdf-table-semantics`, `pdf-form-specific` (19C) |
| Header scope | `/Scope /Column` on schedule-table headers, `/Scope /Row` on key-value grid labels | AT can announce "Column: X" / "Row: Y" for any cell | `pdf-structure-tags`, `pdf-table-semantics` |
| Valid ColSpan/RowSpan | `/ColSpan`/`/RowSpan` always numeric (`/ColSpan 3`, never `/ColSpan /3`); never emitted as `1` (redundant per Matterhorn 15-003) | Spanning cells are announced correctly; no protocol violations | `pdf-table-semantics`, `pdf-form-specific` (axesCheck) |
| Table regularity | Each `TR`'s cells, counted with their `/ColSpan`, sum alike across every row of a table (objects mapped by id, then each `TR`'s `/K` children looked up) | No ragged table for AT to misread | `pdf-form-specific` (19E, Annual Accounting only) |
| Multi-page table continuation | Repeated headers on a page break are `/Artifact`, not duplicate logical `TH`/`TR` | AT doesn't re-announce the same header row on every page | `pdf-engine.js` (§2.2) only. `pdf-table-semantics` asserts `columnScopeCount` **≥ 14** — a lower bound (its comment says "precisely 14"), so a duplicate logical `TH` on a continuation page would raise the count and still pass; no test pins this behaviour |
| Heading hierarchy | `/S /H1`..`/S /H6` levels never increase by more than 1 from the previous heading | Screen-reader heading navigation ("jump to next heading") never skips a conceptual level (Acrobat's "Appropriate nesting" rule) | `pdf-structure-tags`, `plan-pdf-wcag-compliance`, `pdf-form-specific` (axesCheck) |
| Checklist state | Each checklist row's `StructElem` carries `/ActualText` "Checked: <label>" or "Not checked: <label>", read with pdf-lib's object model (`pdfActualTexts()`), not a regex; no "Yes — "/"No — " prefix in the extracted text | A screen reader hears whether a box is ticked, although the box itself is a decorative artifact | `pdf-structure-tags` (19-1, synthetic 70-row checklist), `plan-pdf-wcag-compliance` (Plan Initial) |
| Embedded fonts | `/FontFile2`, `/FontDescriptor`, `/CIDFontType2` or `/Type0`, `/ToUnicode` all present; extracted text via PDF.js actually decodes to readable strings | No reliance on standard-14 metrics or external fonts (ISO 14289-1 Clause 7.21.4.1); text is genuinely readable/extractable, not just visually present | `pdf-fonts-and-xmp`, `pdf-structure-tags` (via `extractPdfText`) |
| XMP / PDF-UA identification | `<pdfuaid:part>1</pdfuaid:part>` + `xmlns:pdfuaid=...` present by default; `dc:title` (the expected title) and `dc:creator` ("Guardian Forms") present; `<?xpacket begin="">` uncorrupted (no BOM). `dc:description` is written (`pdf-accessibility.js` lines 278–282) but no test asserts it | Document self-identifies as PDF/UA-1 conformant with correct Dublin Core title and creator | `pdf-fonts-and-xmp`, `pdf-structure-tags`, `pdf-form-specific` (axesCheck) |
| No raster fallback | `/Subtype /Image` and `/Filter /DCTDecode` both absent | Content is vector/text, never an inaccessible flattened image — on fixtures with no signature stamp. A stamp is a PNG image (`/Subtype /Image`) wrapped in a `/Layout` artifact (§2.2), so these checks prove "no rasterised text", not "no image ever" | `pdf-structure-tags`, `plan-pdf-wcag-compliance`, `pdf-form-specific` (19C, 19E) |
| No `/Figure` misuse | Zero `/S /Figure` structure elements anywhere | Signature blocks are tagged as text (`Part`, heading, `P`), not images. The engine creates no `Figure` at all (§2.1), and the fixture has no stamp; how a stamp image is tagged (artifact, captioned by a `P`) is not asserted by any test — `signature-capture.contract.spec.ts` (e.g. lines 129–150) checks only that the image is painted | `pdf-form-specific` (axesCheck) |
| Signature captions | Extracted text contains "/s/ <name>" with "Signature (Electronic /s/" for an attorney or preparer, and "Electronic signature (/s/)" for a guardian (Milestone 77E) | The electronic-signature wording reaches the PDF as readable text; this is content, not tagging | `plan-pdf-wcag-compliance` |
| xref/byte-offset integrity | `startxref` points at the `xref` keyword, and every `xref` table offset points to the exact literal `N 0 obj` header at that byte position | The PDF file itself is well-formed at the binary level (a prerequisite for any reader, AT or otherwise, to parse the structure tree at all) | `pdf-structure-tags` (Slice 19D: Initial Inventory, Simplified Accounting), `pdf-form-specific` (Slice 19E: Annual Accounting). Slice 19A's copy was removed in Milestone 59C-0 |

---

## 5. Adjacent but out of scope for this document

- **`tests/e2e/pdf-accessibility-and-signatures.spec.ts`** — regexes PDF
  bookmark/outline destinations (`/A << /S /GoTo /D (pg_dest_N) >>`,
  `/XYZ x y z`; lines 236–247). This is PDF navigation (bookmarks), not the
  `/StructTreeRoot` tagging methodology this document covers, though it's
  listed alongside these files in `TEST-INDEX.md`'s `pdf-export` /
  `all forms` cross-reference group. The same test also asserts no raster
  image, `/Lang (en-US)`, the `/Outlines` bookmark titles and the signature
  text ("Signature of Rachel M. Alvarez" for the hand-signing guardian,
  "/s/ Marcus Thorne" and "/s/ Robert Vance, Esq." for the others; lines
  180–263); the file's other three tests cover supporting PDFs (lines
  266–358) and the refusal of image-only supporting documents (lines
  360–398). The precise-destination outline writer it checks is
  `patchOutlineDestinations()`, `pdf-engine.js` lines 60–126.
- **`tests/e2e/plan-initial-multiselect.spec.ts`** (lines 27–70) — reads the
  Plan Initial's `/ActualText` with `pdfActualTexts()` from a PDF saved
  through the real Save-as-PDF button: every ticked box tagged
  "Checked: <label>", an unticked one "Not checked: <label>". A feature
  test that uses this document's helper, not part of the cluster.
- **`tests/unit/checklist-state-76h.spec.js`** — unit-tests
  `pdfTextString()`: a literal for plain ASCII, escaped; UTF-16BE hex with
  the byte-order mark for anything else.
- **`tests/e2e/signature-capture.contract.spec.ts`** — confirms a drawn or
  uploaded stamp is actually painted into the PDF (pdf.js's
  `paintImageXObject`, e.g. lines 129–150); it does not inspect tagging.
- **`src/core/pdf/pdf-engine.js`** in full — the general-purpose vector
  rendering engine for all nine filing types. §2.2 above extracts the
  structurally significant, repeating pattern; the file itself is 2,039
  lines of largely filing-specific layout code and is not reproduced
  wholesale.
- **`docs/pdf-architecture-and-signatures.md`** — the existing narrative doc
  this document's §2.3 quotes from; covers signature capture and
  supplemental-PDF handling as well, which are separate concerns from WCAG
  tag structure. Last changed 2026-09-07, it predates the Guardian Forms
  rename (its §3 still gives the author as "Probate Guardian"; the code
  writes "Guardian Forms") and Milestone 73A (its §4 says a blank signature
  line needs `wetSignatureExplicit: true`, which the engine's comment at
  `pdf-engine.js` lines 1842–1849 says no model set and the model's
  `signatureMode` replaced).
