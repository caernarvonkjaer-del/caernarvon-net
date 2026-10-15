import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

// TEST-REVIEW.md Delivery 3 (N1, 2026-10-14): the fixture contract. A
// positive fixture -- what a complete filing of each type contains
// (fixtures.ts's MINIMAL_VALID_*), and the placement manifests' filings
// (export-manifests.ts) -- must pass the app's own export checks with the
// identity it claims, and every constrained field it answers must hold a
// value of the data model's domain. The checks are the app's (evaluateFiling,
// resolveFilingDescriptor); nothing here re-states a rule. The domain check
// exists because the validators only ask that a dropdown is answered, not
// what with: a county of "V0010" was once carried into a court workbook by a
// fixture that every assertion accepted (TEST-REVIEW.md, N1).

const ROOT = path.join(__dirname, '..', '..');
const SCOPE = {
  guardian: 'guardian_inventory', annual: 'annual_accounting', finalAccounting: 'annual_accounting', trustAccounting: 'annual_accounting',
  simplified: 'simplified_accounting', planSimplified: 'plan_simplified', planAnnual: 'plan_annual', planInitial: 'plan_initial', planMinor: 'plan_minor',
};

let m;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-14T12:00:00'));
  const [registry, engines, descriptor, options, planAnnual, planInitial, circuit, fixtures, manifests] = await Promise.all([
    import('../../src/core/filing/filing-registry.js'),
    import('../../src/core/validation/engines/index.js'),
    import('../../src/core/filing/filing-descriptor.js'),
    import('../../src/core/form/guardianship-options.js'),
    import('../../src/core/filing/models/plan-annual.js'),
    import('../../src/core/filing/models/plan-initial.js'),
    import('../../src/core/pdf/circuit-lookup.js'),
    import('../e2e/support/fixtures.ts'),
    import('../e2e/support/export-manifests.ts'),
  ]);
  m = { registry, engines, descriptor, options, planAnnual, planInitial, circuit, fixtures, manifests };
}, 120_000);
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const json = (x) => JSON.parse(JSON.stringify(x));
const answered = (list, answer) => Object.fromEntries(list.map(([k]) => [k, answer]));

/** A positive filing built the way the browser helpers build one (target.ts's fillMinimalValid*Ward). */
function positive(type) {
  const empty = json(m.registry.initializeEmptyData(type));
  if (!empty.inventoryType) empty.inventoryType = type;
  const overlay = json(m.fixtures.MINIMAL_VALID[type]);
  if (type === 'planSimplified' || type === 'planMinor' || type === 'planInitial') {
    // The Plan literals are applied with Object.assign (applyPlanOverlay); the Initial Plan's ADLs come from the app's list.
    const d = { ...empty, ...overlay };
    if (type === 'planInitial') d.adls = answered(m.planInitial.INITIAL_ADLS, 'Ward needs no help');
    return d;
  }
  const layers = type === 'planAnnual'
    ? [{ rights: answered(m.planAnnual.PLAN_RIGHTS, 'Not removed'), adls: answered(m.planAnnual.PLAN_ADLS, 'Ward needs no help') }, overlay]
    : [overlay];
  return layers.reduce((acc, o) => m.fixtures.mergeFixture(acc, o), empty);
}

/** The placement spec's merge (excel-form-field-placement.spec.ts): objects key by key, arrays index by index, surplus base rows kept. */
function mergeKeepingRows(into, from) {
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  for (const [k, v] of Object.entries(from)) {
    if (Array.isArray(v)) {
      if (!Array.isArray(into[k])) into[k] = [];
      v.forEach((item, i) => { if (isObj(item) && isObj(into[k][i])) mergeKeepingRows(into[k][i], item); else into[k][i] = item; });
    } else if (isObj(v) && isObj(into[k])) mergeKeepingRows(into[k], v);
    else into[k] = v;
  }
  return into;
}

/** The placement spec's filing for a manifest: the positive fixture with the manifest's patch and its first export's finite answers. */
function manifestFiling(type, manifest) {
  const patch = json(manifest.patch);
  const coding = m.manifests.codeFinite(manifest.finite, () => null);
  for (const f of manifest.finite) m.manifests.setPath(patch, f.path, coding.answer(f, 0));
  return mergeKeepingRows(positive(type), patch);
}

const blockers = (d) => m.engines.evaluateFiling(d).blockers.map((b) => `${b.code}: ${b.message}`);

// ---- the data model's enum domains ----
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h.replace(/^﻿/, ''), r[i] ?? ''])));
}

// A domain the model states by the app's own symbol, resolved from the app.
const SYMBOLIC = () => ({
  'FL_COUNTY_CIRCUIT keys (src/core/pdf/circuit-lookup.js)': Object.keys(m.circuit.FL_COUNTY_CIRCUIT),
  PLAN_RIGHT_STATES: m.planAnnual.PLAN_RIGHT_STATES.map((s) => s.value), // { value, label } pairs
  PLAN_ADL_RATINGS: m.planAnnual.PLAN_ADL_RATINGS,
});
const unresolved = new Set();

let enumRows;
function enumDomains(type) {
  enumRows ??= parseCsv(fs.readFileSync(path.join(ROOT, 'probate-guardian-data-model.csv'), 'utf8'))
    .filter((r) => r.storage_root === 'D' && r.data_type === 'enum');
  const out = [];
  for (const r of enumRows) {
    if (r.scope !== 'common' && r.scope !== SCOPE[type]) continue;
    const stated = r.allowed_values.trim();
    if (!stated) continue; // an enum whose values the model does not list
    let domain;
    if (stated.includes(';')) domain = stated.split(';').map((s) => s.trim()).filter(Boolean);
    else if (SYMBOLIC()[stated]) domain = SYMBOLIC()[stated];
    else { unresolved.add(stated); continue; }
    // The model states every domain as text; a filing may hold a number (signaturePolicy).
    out.push({ path: r.field_path, domain: domain.map(String) });
  }
  return out;
}

/** Every value at a data-model path ('guardians[].relationship' walks each row), skipping unanswered ones. */
function valuesAt(obj, fieldPath) {
  let current = [obj];
  for (const seg of fieldPath.split('.')) {
    const list = seg.endsWith('[]');
    const key = list ? seg.slice(0, -2) : seg;
    current = current.flatMap((o) => {
      const v = o?.[key];
      return list ? (Array.isArray(v) ? v : []) : [v];
    });
  }
  return current.filter((v) => v !== undefined && v !== null && v !== '');
}

function outOfDomain(label, d, type) {
  const problems = [];
  for (const { path: p, domain } of enumDomains(type)) {
    for (const v of valuesAt(d, p)) if (!domain.includes(String(v))) problems.push(`${label}: ${p} = ${JSON.stringify(v)} is not one of [${domain.join('; ')}]`);
  }
  return problems;
}

const TYPES = ['guardian', 'annual', 'finalAccounting', 'trustAccounting', 'simplified', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor'];
const MANIFESTS = () => [
  ['guardian', m.manifests.inventoryManifest()],
  ['annual', m.manifests.annualManifest('Annual')],
  ['simplified', m.manifests.simplifiedManifest()],
];

describe('positive fixtures pass the export checks with the identity they claim', () => {
  test.each(TYPES)('%s: the minimal-valid filing has nothing outstanding', (type) => {
    const d = positive(type);
    const { descriptor, issues } = m.descriptor.resolveFilingDescriptor(d);
    expect(issues, 'identity').toEqual([]);
    expect(descriptor?.inventoryType, 'the identity it claims').toBe(type);
    expect(blockers(d), 'what the export checks say the filing still needs').toEqual([]);
  });

  test('every placement manifest, on its first export, has nothing outstanding', () => {
    for (const [type, manifest] of MANIFESTS()) {
      const d = manifestFiling(type, manifest);
      expect(m.descriptor.resolveFilingDescriptor(d).issues, `${type} manifest: identity`).toEqual([]);
      expect(blockers(d), `${type} manifest`).toEqual([]);
    }
  });
});

describe('constrained fields hold values of the data model\'s domain', () => {
  test('the model lists enum fields for every type, the rule reads them, and every domain it states by symbol is resolved', () => {
    for (const type of TYPES) expect(enumDomains(type).length, type).toBeGreaterThan(2);
    expect(enumDomains('guardian').find((e) => e.path === 'county')?.domain).toContain('Pinellas');
    expect(enumDomains('guardian').find((e) => e.path === 'typeOfGuardianship')?.domain).toEqual([...m.options.GUARDIANSHIP_TYPE_OPTIONS]);
    expect(enumDomains('planAnnual').find((e) => e.path === 'rights.marry')?.domain).toEqual(m.planAnnual.PLAN_RIGHT_STATES.map((s) => s.value));
    expect([...unresolved], 'domains the model states by a symbol this spec does not know: add it to SYMBOLIC').toEqual([]);
  });

  test('every positive fixture and every manifest filing answers each enum field from its domain', () => {
    const problems = [];
    for (const type of TYPES) problems.push(...outOfDomain(`${type} fixture`, positive(type), type));
    for (const [type, manifest] of MANIFESTS()) problems.push(...outOfDomain(`${type} manifest`, manifestFiling(type, manifest), type));
    expect(problems).toEqual([]);
  });

  test('the manifests give the type of guardianship the app\'s own options, never a probe', () => {
    expect([...m.manifests.GUARDIANSHIP_TYPES]).toEqual([...m.options.GUARDIANSHIP_TYPE_OPTIONS]);
    for (const [type, manifest] of MANIFESTS()) {
      const choice = manifest.finite.find((f) => f.path === 'typeOfGuardianship');
      expect(choice, `${type}: typeOfGuardianship is a choice`).toBeTruthy();
      expect([...choice.options]).toEqual([...m.options.GUARDIANSHIP_TYPE_OPTIONS]);
      expect(manifest.patch.typeOfGuardianship, `${type}: no probe text`).toBeUndefined();
    }
  });
});

describe('the faults the contract exists for (synthetic)', () => {
  test('a county of "V0010" in a positive fixture is named by the export checks and by the domain rule', () => {
    const d = { ...positive('guardian'), county: 'V0010' };
    expect(blockers(d).join('\n')).toMatch(/County: "V0010" is not a Florida county/);
    expect(outOfDomain('guardian fixture', d, 'guardian')).toEqual(['guardian fixture: county = "V0010" is not one of [' + Object.keys(m.circuit.FL_COUNTY_CIRCUIT).join('; ') + ']']);
  });

  test('a type of guardianship of "V0010" passes the export checks -- which is why the domain rule exists', () => {
    const d = { ...positive('guardian'), typeOfGuardianship: 'V0010' };
    expect(blockers(d)).toEqual([]);
    expect(outOfDomain('guardian fixture', d, 'guardian')).toEqual([`guardian fixture: typeOfGuardianship = "V0010" is not one of [${m.options.GUARDIANSHIP_TYPE_OPTIONS.join('; ')}]`]);
  });

  test('a manifest whose patch carried a probe county would be caught the same way', () => {
    const [type, manifest] = MANIFESTS()[0];
    const d = manifestFiling(type, { ...manifest, patch: { ...manifest.patch, county: 'V0010' } });
    expect(blockers(d).join('\n')).toMatch(/County: "V0010"/);
  });
});

// ---- every key a fixture writes is one its form has ----
// TEST-REVIEW.md Delivery 6, item 1 (2026-10-15): a key the form never reads
// is inert -- it fills nothing, passes every check above, and rides into the
// goldens as variants that mean nothing (the Plan for Minors' fixture carried
// a caseNumber for a form that keeps its Case # in ref). A path is the form's
// when its blank filing has it, or the data model lists it for that identity
// by name (a common row does not count: the blank filing is the authority on
// whether this form has the field), or it lies under a map the model types as
// an object with no rows of its own (scheduleNoItems, created on demand).
let modelRows;
function modelPaths(type) {
  modelRows ??= parseCsv(fs.readFileSync(path.join(ROOT, 'probate-guardian-data-model.csv'), 'utf8')).filter((r) => r.storage_root === 'D');
  const rows = modelRows.filter((r) => r.scope === SCOPE[type]);
  const exact = new Set(rows.map((r) => r.field_path));
  const maps = rows.filter((r) => r.data_type === 'object' && !rows.some((o) => o.field_path.startsWith(`${r.field_path}.`))).map((r) => r.field_path);
  return { exact, maps };
}

/** Every path an object writes, rows as `[]` ('guardians[].name'), each object and array once as itself. */
function* writtenPaths(obj, at = '') {
  for (const [k, v] of Object.entries(obj)) {
    const p = at ? `${at}.${k}` : k;
    yield p;
    if (Array.isArray(v)) { for (const item of v) if (item && typeof item === 'object') yield* writtenPaths(item, `${p}[]`); }
    else if (v && typeof v === 'object') yield* writtenPaths(v, p);
  }
}

/** Whether a blank filing has a path; '[]' walks the rows it has (a collection with no seeded row cannot vouch for a row's keys -- the model does). */
function hasPath(obj, fieldPath) {
  let current = [obj];
  for (const seg of fieldPath.split('.')) {
    const list = seg.endsWith('[]');
    const key = list ? seg.slice(0, -2) : seg;
    current = current.flatMap((o) => {
      if (!o || typeof o !== 'object' || !(key in o)) return [];
      const v = o[key];
      return list ? (Array.isArray(v) ? v : []) : [v];
    });
    if (!current.length) return false;
  }
  return true;
}

const asRows = (p) => p.replace(/\.\d+(?=\.|$)/g, '[]'); // a manifest's 'scheduleA1.0.residence' is the row path 'scheduleA1[].residence'

function unknownPaths(label, type, paths) {
  const { exact, maps } = modelPaths(type);
  const blank = json(m.registry.initializeEmptyData(type));
  const problems = [];
  for (const raw of paths) {
    const p = asRows(raw);
    if (hasPath(blank, p) || exact.has(p) || maps.some((map) => p.startsWith(`${map}.`))) continue;
    problems.push(`${label}: ${raw} is not a field of this form (not in its blank filing, nor a ${SCOPE[type]} row of the data model)`);
  }
  return problems;
}

describe('every key a fixture writes is one its form has', () => {
  test('the model lists rows for every type, and a map created on demand is known as one', () => {
    for (const type of TYPES) expect(modelPaths(type).exact.size, type).toBeGreaterThan(10);
    expect(modelPaths('annual').maps).toContain('scheduleNoItems');
    expect(modelPaths('guardian').exact.has('serviceAttorney.signatureDate'), 'a row the blank filing lacks, which the model vouches for').toBe(true);
  });

  test('every positive fixture, every manifest patch and every manifest path is a path of its form', () => {
    const problems = [];
    for (const type of TYPES) problems.push(...unknownPaths(`${type} fixture`, type, writtenPaths(m.fixtures.MINIMAL_VALID[type])));
    for (const [type, manifest] of MANIFESTS()) {
      problems.push(...unknownPaths(`${type} manifest patch`, type, writtenPaths(manifest.patch)));
      problems.push(...unknownPaths(`${type} manifest`, type, manifest.finite.map((f) => f.path)));
    }
    expect(problems).toEqual([]);
  });

  test('a typo\'d key is named with its form; a row key, a map key and a numbered manifest row are read as the form\'s (synthetic)', () => {
    expect(unknownPaths('guardian fixture', 'guardian', writtenPaths({ wardname: 'x', guardians: [{ name: 'y', nmae: 'z' }] })))
      .toEqual([
        'guardian fixture: wardname is not a field of this form (not in its blank filing, nor a guardian_inventory row of the data model)',
        'guardian fixture: guardians[].nmae is not a field of this form (not in its blank filing, nor a guardian_inventory row of the data model)',
      ]);
    expect(unknownPaths('annual fixture', 'annual', writtenPaths({ scheduleNoItems: { scha: true, anything: true }, guardians: [{ name: 'y' }] }))).toEqual([]);
    expect(unknownPaths('guardian manifest', 'guardian', ['scheduleA1.3.residence', 'scheduleA1.3.nowhere'])).toEqual([
      'guardian manifest: scheduleA1.3.nowhere is not a field of this form (not in its blank filing, nor a guardian_inventory row of the data model)',
    ]);
    // A common row alone does not make a field the form's: the Plan for Minors has no caseNumber.
    expect(unknownPaths('planMinor fixture', 'planMinor', ['caseNumber', 'ref'])).toEqual([
      'planMinor fixture: caseNumber is not a field of this form (not in its blank filing, nor a plan_minor row of the data model)',
    ]);
  });
});
