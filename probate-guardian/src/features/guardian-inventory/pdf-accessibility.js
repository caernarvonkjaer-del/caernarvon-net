// PDF Accessibility & Tagged PDF (PDF/UA-1 & WCAG 2.1 AA) Infrastructure.
// Manages the logical Structure Tree (/StructTreeRoot, /ParentTree, /StructElem),
// Marked Content operators (BDC/EMC), artifact demarcation, page tab order (/Tabs /S),
// and catalog accessibility metadata (/MarkInfo, /ViewerPreferences, /Lang).

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
  constructor() {
    this.rootNode = new PdfStructureNode({ tag: 'Document' });
    this.currentNode = this.rootNode;
    this.mcidCounterByPage = {}; // pageNumber (1-based) -> next MCID integer
    this.pageElements = {}; // pageNumber (1-based) -> array of PdfStructureNode at mcid index
    this.pageObjIds = {}; // pageNumber (1-based) -> page indirect object ID
    this.rootObjId = null;
    this.parentTreeObjId = null;
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

    // 1. Allocate object IDs for all structure elements
    for (const node of allNodes) {
      node.objId = doc.internal.newObject();
    }

    // 2. Allocate object ID for ParentTree and StructTreeRoot
    this.parentTreeObjId = doc.internal.newObject();
    this.rootObjId = doc.internal.newObject();

    // 3. Write each /StructElem
    for (const node of allNodes) {
      doc.internal.newObjectDeferredBegin(node.objId);
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
    doc.internal.newObjectDeferredBegin(this.parentTreeObjId);
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
    doc.internal.newObjectDeferredBegin(this.rootObjId);
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

  // 4. Hook into putCatalog to inject /MarkInfo, /StructTreeRoot, and /Lang
  doc.internal.events.subscribe('putCatalog', () => {
    doc.internal.write('/MarkInfo << /Marked true >>');
    if (structureTree.rootObjId) {
      doc.internal.write(`/StructTreeRoot ${structureTree.rootObjId} 0 R`);
    }
    doc.internal.write('/Lang (en-US)');
  });
}

