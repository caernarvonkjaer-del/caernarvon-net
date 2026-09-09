// Canonical filing identity. Keep names, output copy, and engine routing in
// one place so a filing cannot present itself differently across UI and export.

const DESCRIPTORS = {
  guardian: {
    id: 'initial-inventory', family: 'inventory', engineId: 'guardian',
    inventoryType: 'guardian', displayName: 'Initial Inventory',
    outputName: 'Verified Initial Inventory',
    documentTitle: 'VERIFIED INITIAL INVENTORY', filenameStem: 'Initial-Inventory',
    capabilities: { pdf: true, docx: true, excel: true },
  },
  simplified: {
    id: 'simplified-annual-accounting', family: 'accounting', engineId: 'simplified',
    inventoryType: 'simplified', displayName: 'Simplified Annual Accounting',
    documentTitle: 'SIMPLIFIED ANNUAL ACCOUNTING', filenameStem: 'Simplified-Annual-Accounting',
    capabilities: { pdf: true, docx: true, excel: true },
  },
  annual: {
    id: 'annual-accounting', family: 'accounting', engineId: 'annual',
    inventoryType: 'annual', filingTypeValue: 'Annual', displayName: 'Annual Accounting',
    documentTitle: 'ANNUAL GUARDIANSHIP ACCOUNTING', filenameStem: 'Annual-Accounting',
    capabilities: { pdf: true, docx: true, excel: true },
  },
  finalAccounting: {
    id: 'final-accounting', family: 'accounting', engineId: 'annual',
    inventoryType: 'finalAccounting', filingTypeValue: 'Final', displayName: 'Final Accounting',
    documentTitle: 'FINAL GUARDIANSHIP ACCOUNTING', filenameStem: 'Final-Accounting',
    capabilities: { pdf: true, docx: true, excel: true },
  },
  trustAccounting: {
    id: 'trust-accounting', family: 'accounting', engineId: 'annual',
    inventoryType: 'trustAccounting', filingTypeValue: 'Trust', displayName: 'Trust Accounting',
    documentTitle: 'TRUST GUARDIANSHIP ACCOUNTING', filenameStem: 'Trust-Accounting',
    capabilities: { pdf: true, docx: true, excel: true },
  },
  planSimplified: {
    id: 'simplified-annual-plan', family: 'plan', engineId: 'planSimplified',
    inventoryType: 'planSimplified', displayName: 'Simplified Annual Plan',
    documentTitle: 'SIMPLIFIED ANNUAL PLAN', filenameStem: 'Simplified-Annual-Plan',
    capabilities: { pdf: true, docx: true, excel: false },
  },
  planAnnual: {
    id: 'annual-guardianship-plan', family: 'plan', engineId: 'planAnnual',
    inventoryType: 'planAnnual', displayName: 'Annual Guardianship Plan',
    documentTitle: 'ANNUAL GUARDIANSHIP PLAN', filenameStem: 'Annual-Guardianship-Plan',
    capabilities: { pdf: true, docx: true, excel: false },
  },
  planInitial: {
    id: 'initial-guardianship-plan', family: 'plan', engineId: 'planInitial',
    inventoryType: 'planInitial', displayName: 'Initial Guardianship Plan',
    documentTitle: 'INITIAL GUARDIANSHIP PLAN', filenameStem: 'Initial-Guardianship-Plan',
    capabilities: { pdf: true, docx: true, excel: false },
  },
  planMinor: {
    id: 'annual-plan-minor', family: 'plan', engineId: 'planMinor',
    inventoryType: 'planMinor',
    // Corrected to an em dash (was a plain hyphen), matching the three
    // hardcoded live-UI strings in src/features/plan-minor/index.js
    // (sidebar section label, Summary formTitle, Cover page <h1> -- all
    // "Annual Plan — Minors") -- confirmed directly. This descriptor's
    // displayName is what pdf-model.js writes into the real generated PDF/
    // DOCX metadata.subject, so the two disagreed on this filing type's own
    // name across UI vs. exported artifact until now. Found by Milestone
    // 33's filing-identity contract, the first test to compare this field
    // against a real generated artifact for this type.
    displayName: 'Annual Plan — Minors',
    documentTitle: 'ANNUAL GUARDIANSHIP PLAN - MINOR', filenameStem: 'Annual-Plan-Minor',
    capabilities: { pdf: true, docx: true, excel: false },
  },
};

const ACCOUNTING_TYPE_BY_VALUE = new Map([
  ['annual', 'annual'], ['annual accounting', 'annual'],
  ['final', 'finalAccounting'], ['final accounting', 'finalAccounting'],
  ['trust', 'trustAccounting'], ['trust accounting', 'trustAccounting'],
]);

function descriptorForType(type) {
  return DESCRIPTORS[type] || null;
}

function issue(code, message, detail = {}) {
  return { code, severity: 'blocking', section: 'Part I', route: '/', path: 'filingType', label: 'Filing Type', message, ...detail };
}

export function resolveFilingDescriptor(data = {}) {
  const inventoryType = data.inventoryType || '';
  const byInventory = descriptorForType(inventoryType);
  const filingValue = String(data.filingType || '').trim().toLowerCase();
  const filingInventoryType = ACCOUNTING_TYPE_BY_VALUE.get(filingValue);
  const byFilingType = filingInventoryType ? descriptorForType(filingInventoryType) : null;
  const issues = [];

  if (byInventory?.family === 'accounting' && byInventory.engineId === 'annual') {
    if (data.filingType && !byFilingType) {
      issues.push(issue('filing.identity.unknown', `Part I - Filing Type "${data.filingType}" is not recognized.`));
    } else if (byFilingType && byFilingType.inventoryType !== inventoryType) {
      issues.push(issue(
        'filing.identity.conflict',
        `Part I - Filing Type (${byFilingType.displayName}) does not match this filing's ${byInventory.displayName} identity. Select Filing Type to confirm the intended filing.`,
      ));
    }
    return { descriptor: byInventory, issues };
  }

  if (byInventory) return { descriptor: byInventory, issues };
  if (byFilingType) return { descriptor: byFilingType, issues };

  // Older fixtures and pre-descriptor annual records may not yet carry either
  // identity field. Preserve their historical Annual behavior while new and
  // migrated filings are checked for a real identity conflict above.
  if (!inventoryType && !data.filingType) {
    return { descriptor: DESCRIPTORS.annual, issues };
  }

  issues.push(issue('filing.identity.unknown', 'Part I - Filing identity is missing or not recognized.'));
  return { descriptor: null, issues };
}

export function resolveDescriptorForInventoryType(inventoryType) {
  return descriptorForType(inventoryType) || null;
}

export function descriptorForAccountingFilingType(value) {
  return descriptorForType(ACCOUNTING_TYPE_BY_VALUE.get(String(value || '').trim().toLowerCase())) || null;
}

export function applyAccountingFilingType(data, filingType) {
  const descriptor = descriptorForAccountingFilingType(filingType);
  if (!descriptor) {
    return { descriptor: null, issues: [issue('filing.identity.unknown', `Part I - Filing Type "${filingType}" is not recognized.`)] };
  }
  data.inventoryType = descriptor.inventoryType;
  data.filingType = descriptor.filingTypeValue;
  return { descriptor, issues: [] };
}

export function filingCopy(descriptor) {
  const accountingName = descriptor?.displayName || 'Accounting';
  const lowerAccountingName = accountingName.toLowerCase();
  return {
    subject: `${accountingName} of Guardian of the Property (Section 744.3678)`,
    keywords: `Florida, Probate, Guardianship, ${accountingName}`,
    preparerStatement: (wardName, from, to) => `I have compiled the accompanying ${accountingName} of assets and liabilities arising from cash transactions, current market valuation, and current estimated market valuation of the guardianship of ${wardName} for the period ${from} through ${to}. This compilation is limited to presenting information in the form of a ${accountingName} and is the representation of the guardian. I have not audited or reviewed the accompanying guardianship accounting and, accordingly, do not express an opinion or any other form of assurance on it.\n\nNOTICE: If you are the Guardian, Co-Guardian, or Guardian Attorney - DO NOT SIGN HERE.`,
    attorneyStatement: (wardName, from, to, county) => `The undersigned Attorney hereby notifies the Court of the filing of the ${lowerAccountingName} of the Guardian ${wardName} for the period ${from} through ${to}. This ${lowerAccountingName} is the representation of the guardian. The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law and the standards for accountings in ${county} County, Florida.`,
  };
}

if (typeof window !== 'undefined') {
  window.resolveFilingDescriptor = resolveFilingDescriptor;
  window.resolveDescriptorForInventoryType = resolveDescriptorForInventoryType;
  window.applyAccountingFilingType = applyAccountingFilingType;
}
