// PDF Accessibility & Tagged PDF (PDF/UA-1 & WCAG 2.1 AA) Infrastructure.
// Manages the logical Structure Tree (/StructTreeRoot, /ParentTree, /StructElem),
// Marked Content operators (BDC/EMC), artifact demarcation, page tab order (/Tabs /S),
// and catalog accessibility metadata (/MarkInfo, /ViewerPreferences, /Metadata, /Lang).

export class PdfStructureNode {
  constructor({ tag, title = null, alt = null, attributes = null, parent = null }) {
    this.tag = tag; // Standard structure type: Document, Part, H1, H2, H3, Table, TR, TH, TD, P, Figure, etc.
    this.title = title;
    this.alt = alt;
    this.attributes = attributes; // e.g. { O: 'Table', Scope: 'Column' }
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
    this.metadata = metadata;
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

  addStructureElement({ tag, title = null, alt = null, attributes = null, pageNumber = null, isLeaf = false, parent = null }) {
    const parentNode = parent || this.currentNode || this.rootNode;
    const node = new PdfStructureNode({ tag, title, alt, attributes, parent: parentNode });
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

      // Attributes (e.g. Table Header Column Scope)
      if (node.attributes) {
        doc.internal.write('/A <<');
        for (const [k, v] of Object.entries(node.attributes)) {
          doc.internal.write(`/${k} /${v}`);
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
    doc.internal.newObjectDeferredBegin(this.parentTreeObjId, true);
    doc.internal.write('<<');
    doc.internal.write('/Nums [');
    const pageKeys = Object.keys(this.pageElements).map(Number).sort((a, b) => a - b);
    for (const pNum of pageKeys) {
      const pageIndex = pNum - 1; // 0-based index matching /StructParents
      const elems = this.pageElements[pNum] || [];
      const elemRefs = elems.map(e => e && e.objId ? `${e.objId} 0 R` : 'null').join(' ');
      doc.internal.write(`  ${pageIndex} [ ${elemRefs} ]`);
    }
    doc.internal.write(']');
    doc.internal.write('>>');
    doc.internal.write('endobj');

    // 5. Write /StructTreeRoot
    doc.internal.newObjectDeferredBegin(this.rootObjId, true);
    doc.internal.write('<<');
    doc.internal.write('/Type /StructTreeRoot');
    doc.internal.write('/RoleMap <<');
    doc.internal.write('  /InventorySchedule /Table');
    doc.internal.write('  /CaseInfo /Table');
    doc.internal.write('>>');
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

export function buildXmpPacket(metadata = {}) {
  const title = escapeXml(metadata.title || 'Verified Initial Inventory');
  const author = escapeXml(metadata.author || 'Probate Guardian');
  const subject = escapeXml(metadata.subject || 'Verified Initial Inventory');
  const dateIso = new Date().toISOString();

  // Note on PDF/UA-1: ISO 14289-1 clause 7.21.4.1 requires all fonts to be embedded
  // (/FontFile). Because standard-14 Type1 fonts (Helvetica, Times) are used without
  // embedded font descriptors, declaring <pdfuaid:part>1</pdfuaid:part> would cause veraPDF/PAC
  // to flag font non-conformance. Acrobat Pro's 32-rule Accessibility Full Check tests
  // WCAG 2.1 AA (Tagged PDF, Language, Title, Tab Order, Headings, Tables, Artifacts),
  // which does not require font embedding. We only emit <pdfuaid:part>1</pdfuaid:part> if
  // fonts are embedded (metadata.embedFonts === true or metadata.claimPdfUa === true).
  const pdfUaNs = (metadata.claimPdfUa || metadata.embedFonts)
    ? '\n        xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/"'
    : '';
  const pdfUaTag = (metadata.claimPdfUa || metadata.embedFonts)
    ? '\n      <pdfuaid:part>1</pdfuaid:part>'
    : '';

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
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
      <pdf:Producer>Probate Guardian</pdf:Producer>${pdfUaTag}
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
  if (typeof doc.viewerPreferences === 'function') {
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

  // 4. Hook into putCatalog to inject /MarkInfo, /StructTreeRoot, and /Metadata
  // (Notice: do NOT manually write /Lang here; doc.setLanguage('en-US') writes it, avoiding duplicates!)
  doc.internal.events.subscribe('putCatalog', () => {
    doc.internal.write('/MarkInfo << /Marked true >>');
    if (structureTree.rootObjId) {
      doc.internal.write(`/StructTreeRoot ${structureTree.rootObjId} 0 R`);
    }
    if (structureTree.metadataObjId) {
      doc.internal.write(`/Metadata ${structureTree.metadataObjId} 0 R`);
    }
  });
}
