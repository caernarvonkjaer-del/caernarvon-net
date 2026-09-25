import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { parse } from 'acorn';
import {
  FILING_REGISTRY, FILING_PAGES, INVENTORY_TYPES, INVENTORY_TYPE_META, ANNUAL_FORM_ALIASES, formEngine, formDisplayName,
  initializeEmptyData, normalizeWardData, typeIcon,
} from '../../src/core/filing/filing-registry.js';
import { FILING_TYPE_KEYS, resolveDescriptorForInventoryType } from '../../src/core/filing/filing-descriptor.js';
import { mk, PAGES_GUARDIAN } from '../../src/core/filing/models/guardian.js';
import { emptyRowAnnual } from '../../src/core/filing/models/annual.js';
import {
  PLAN_RIGHTS, PLAN_RIGHT_STATES, planRightLabel, PLAN_ADLS, PLAN_ADL_RATINGS, PLAN_BENEFITS,
} from '../../src/core/filing/models/plan-annual.js';
import { INITIAL_ADLS, INITIAL_ADL_RATINGS } from '../../src/core/filing/models/plan-initial.js';
import { planEmptyRow, planGuardianBlank, planGuardianMax, planGuardianHasAnyData, normalizePlanGuardians } from '../../src/core/filing/models/plan-rows.js';

// Milestone 70, 70C gate: "All nine filing identities can be created,
// normalized repeatedly without change, routed, and summarized through
// imports with no feature pack loaded ... serialized shapes are deeply equal
// to the pre-delivery shapes." tests/baseline/ms70-70C-filing-shapes.json was
// captured from the monolith and state.js before anything moved (see its
// generatedFrom); every value below is compared with it, key order ignored
// (toStrictEqual), values and defaults not.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BEFORE = JSON.parse(fs.readFileSync(path.join(root, 'tests/baseline/ms70-70C-filing-shapes.json'), 'utf8'));
const json = (x) => JSON.parse(JSON.stringify(x));

describe('the nine filing identities, created and normalized through imports', () => {
  test('the registry lists exactly the nine, in the descriptor order', () => {
    expect(Object.keys(FILING_REGISTRY)).toEqual([...FILING_TYPE_KEYS]);
    expect(BEFORE.types).toEqual([...FILING_TYPE_KEYS]);
    expect(Object.isFrozen(FILING_REGISTRY)).toBe(true);
  });

  test.each(BEFORE.types)('%s: a blank filing is exactly what it was before 70C', (type) => {
    expect(json(initializeEmptyData(type))).toStrictEqual(BEFORE.blank[type]);
    expect(json(FILING_REGISTRY[type].blank())).toStrictEqual(BEFORE.blank[type]);
    // A fresh object every time: filings never share rows.
    expect(initializeEmptyData(type)).not.toBe(initializeEmptyData(type));
  });

  test.each(BEFORE.types)('%s: normalizing twice changes nothing more than once, and matches before', (type) => {
    const once = json(normalizeWardData(json(initializeEmptyData(type))));
    const twice = json(normalizeWardData(json(once)));
    expect(twice).toStrictEqual(once);
    expect(twice).toStrictEqual(BEFORE.normalizedTwice[type]);
    expect(FILING_REGISTRY[type].normalize).toBe(normalizeWardData);
  });

  test.each(BEFORE.types)('%s: routed to its engine\'s feature, and summarized from the registry', (type) => {
    const entry = FILING_REGISTRY[type];
    expect(entry.engineId).toBe(BEFORE.engine[type]);
    expect(formEngine(type)).toBe(BEFORE.engine[type]);
    const engine = BEFORE.engine[type];
    expect(entry.mountFeature).toBe(`mount${engine[0].toUpperCase()}${engine.slice(1)}Feature`);
    expect(entry.info).toStrictEqual(BEFORE.inventoryTypes[type]);
    expect(entry.meta).toStrictEqual(BEFORE.meta[type]);
    expect(entry.descriptor).toBe(resolveDescriptorForInventoryType(type));
    expect(formDisplayName(type)).toBe(resolveDescriptorForInventoryType(type).displayName);
    expect(typeIcon(type, 16)).toContain('<svg');
  });

  test('Final and Trust are distinct identities on the one Annual engine', () => {
    expect(ANNUAL_FORM_ALIASES).toStrictEqual(BEFORE.constants.ANNUAL_FORM_ALIASES);
    for (const type of ['annual', 'finalAccounting', 'trustAccounting']) expect(FILING_REGISTRY[type].engineId).toBe('annual');
    expect(initializeEmptyData('finalAccounting')).toMatchObject({ inventoryType: 'finalAccounting', filingType: 'Final' });
    expect(initializeEmptyData('trustAccounting')).toMatchObject({ inventoryType: 'trustAccounting', filingType: 'Trust' });
    expect(initializeEmptyData('annual')).toMatchObject({ inventoryType: 'annual', filingType: 'Annual' });
    expect(new Set(['annual', 'finalAccounting', 'trustAccounting'].map(formDisplayName)).size).toBe(3);
  });

  test('an unknown type falls back as before: the Guardian blank, its own name as engine', () => {
    expect(json(initializeEmptyData('nonsense'))).toStrictEqual(BEFORE.blank.guardian);
    expect(formEngine('nonsense')).toBe('nonsense');
    expect(formDisplayName('nonsense')).toBe('Accounting');
  });
});

describe('the rows, lists and page list moved with them', () => {
  test('every row factory gives the row it gave before', () => {
    for (const [key, row] of Object.entries(BEFORE.rows)) {
      const [kind, name] = key.split(':');
      if (kind === 'annual') expect(json(emptyRowAnnual(name)), key).toStrictEqual(row);
      else if (kind === 'guardian') expect(json(mk[name]()), key).toStrictEqual(row);
      else if (kind === 'plan') expect(json(planEmptyRow(name)), key).toStrictEqual(row);
    }
  });

  test('the Plan and Inventory lists are the ones the court forms were transcribed into', () => {
    expect(json({ PLAN_RIGHTS, PLAN_RIGHT_STATES, PLAN_ADLS, PLAN_ADL_RATINGS, PLAN_BENEFITS, INITIAL_ADLS, INITIAL_ADL_RATINGS, ANNUAL_FORM_ALIASES }))
      .toStrictEqual(BEFORE.constants);
    expect(json(PAGES_GUARDIAN)).toStrictEqual(BEFORE.pagesGuardian);
    expect(FILING_REGISTRY.guardian.pages).toBe(PAGES_GUARDIAN);
    // Every identity's page list, the way the router and sidebar read them.
    expect(json(FILING_PAGES)).toStrictEqual(BEFORE.pages);
    for (const type of BEFORE.types) expect(FILING_REGISTRY[type].pages, type).toBe(FILING_PAGES[type]);
    expect(FILING_PAGES.finalAccounting).toBe(FILING_PAGES.annual);
    expect(json(INVENTORY_TYPES)).toStrictEqual(BEFORE.inventoryTypes);
    expect(json(INVENTORY_TYPE_META)).toStrictEqual(BEFORE.meta);
    for (const [value, label] of Object.entries(BEFORE.planRightLabels)) expect(planRightLabel(value)).toBe(label);
  });

  test('each Plan\'s guardian block and how many it allows', () => {
    for (const type of BEFORE.types) {
      expect(json(planGuardianBlank(type)), type).toStrictEqual(BEFORE.plan[type].guardianBlank);
      expect(planGuardianMax(type), type).toBe(BEFORE.plan[type].guardianMax);
    }
    const d = { inventoryType: 'planInitial', planGuardians: [{ name: 'A' }, { name: '' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }] };
    expect(normalizePlanGuardians(d).map((g) => g.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(planGuardianHasAnyData({ name: '', signatureDate: '' })).toBe(false);
    expect(planGuardianHasAnyData({ name: '', phone: '555' })).toBe(true);
  });
});

describe('no feature pack loaded', () => {
  // Every module the registry pulls in, followed through static imports: none
  // may be a feature, and none a court-output library.
  const reach = (rel, seen = new Set()) => {
    if (seen.has(rel)) return seen;
    seen.add(rel);
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const st of parse(src, { ecmaVersion: 'latest', sourceType: 'module' }).body) {
      if (st.type !== 'ImportDeclaration' && !(st.type === 'ExportNamedDeclaration' && st.source)) continue;
      const spec = st.source.value;
      if (!spec.startsWith('.')) { seen.add(spec); continue; }
      reach(path.relative(root, path.resolve(path.dirname(path.join(root, rel)), spec)).split(path.sep).join('/'), seen);
    }
    return seen;
  };

  test('the registry\'s whole static import graph stays out of src/features and the vendored output libraries', () => {
    const graph = [...reach('src/core/filing/filing-registry.js')];
    expect(graph.filter((f) => f.startsWith('src/features/'))).toEqual([]);
    expect(graph.filter((f) => /pdf-lib|exceljs|html2pdf|jszip|^lib\//.test(f))).toEqual([]);
    // Nor the PDF-building code: the acknowledgement the normalizer runs used
    // to import one helper from supplemental-pdf.js, which pulled in the
    // pdf.js loader (moved to src/core/filing/doc-period.js in 70C).
    expect(graph.filter((f) => /^src\/core\/pdf\/(supplemental-pdf|pdfjs-loader|pdf-engine)\.js$/.test(f))).toEqual([]);
    expect(graph).toContain('src/core/filing/models/annual.js');
  });
});
