import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { parse } from 'acorn';
import { filingLifecycle } from '../../src/core/navigation/filing-lifecycle.js';
import { addWard, activateWard, switchWard, unloadWard, deleteWard } from '../../src/core/navigation/ward-lifecycle.js';
import { carryOverFields } from '../../src/core/filing/carry-over.js';
import { convertExistingWard } from '../../src/core/filing/conversion.js';
import { startNewWardYear, switchWardYear, deleteWardYear } from '../../src/core/filing/filing-years.js';
import { getActiveInventoryType, getCaseFile, getD, setActiveFiling, setCaseFile } from '../../src/core/state.js';

// Milestone 70, 70G gate: "Creation, switching, deletion, rename, carryover,
// conversion, year operations, party/case write-through, and cross-tab locks
// pass through the service in both UI and tests. No lifecycle path reassigns
// active/case state outside the store seam."
//
// The service is src/core/navigation/filing-lifecycle.js's filingLifecycle.
// There is no rename operation: a filing's name is an ordinary field. The
// cross-tab lock and party/case write-through are inside the operations
// (activateWard() takes the lock before anything changes; creation and
// conversion join the source's case), so a caller that goes through the
// service goes through them.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (f) => path.relative(root, f).split(path.sep).join('/');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name))
  : /\.js$/.test(e.name) ? [path.join(dir, e.name)] : []));
const read = (r) => fs.readFileSync(path.join(root, r), 'utf8');
const CLASSIC = new Set(['src/legacy-app.js', 'src/prepaint.js']);
const modules = () => walk(path.join(root, 'src')).map(rel).filter((r) => !CLASSIC.has(r));
const parseModule = (r) => parse(read(r), { ecmaVersion: 'latest', sourceType: 'module', locations: true });
function visit(node, fn) {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const k of Object.keys(node)) {
    const c = node[k];
    if (Array.isArray(c)) c.forEach((x) => visit(x, fn)); else if (c && typeof c.type === 'string') visit(c, fn);
  }
}
const isWindowMember = (n, names) => n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier'
  && n.object.name === 'window' && names.has(n.property.name);

// Each member of the service and the implementation it is.
const MEMBERS = {
  create: ['addWard', addWard],
  open: ['activateWard', activateWard],
  switchTo: ['switchWard', switchWard],
  unload: ['unloadWard', unloadWard],
  remove: ['deleteWard', deleteWard],
  convert: ['convertExistingWard', convertExistingWard],
  carry: ['carryOverFields', carryOverFields],
  newYear: ['startNewWardYear', startNewWardYear],
  switchYear: ['switchWardYear', switchWardYear],
  removeYear: ['deleteWardYear', deleteWardYear],
};
const OPERATIONS = new Set(Object.values(MEMBERS).map(([name]) => name));
// The service and the modules that implement the operations call one another
// directly; everything else goes through the service.
const IMPLEMENTATION = new Set([
  'src/core/navigation/filing-lifecycle.js',
  'src/core/navigation/ward-lifecycle.js',
  'src/core/filing/carry-over.js',
  'src/core/filing/conversion.js',
  'src/core/filing/filing-years.js',
]);
// A module that still reaches an operation through its window publication --
// the implementation itself, published by its own module -- and why, with the
// delivery that removes it.
// None since Milestone 70's 70I: opening a backup, which closes the open
// filing first, moved out of case-file.js into case-import.js, which imports
// the service.
const THROUGH_WINDOW = {};
// Callers the rule must see going through the service, so it cannot pass by
// finding nothing.
const SERVICE_CALLERS = [
  'src/shell-events.js',
  'src/modal-events.js',
  'src/core/modals/filing-dialogs.js',
  'src/core/modals/year-dialogs.js',
  'src/core/modals/convert-ward-modal.js',
  'src/features/dashboard/index.js',
  'src/core/testing/testing-adapter.js',
  // Milestone 70, 70I: opening a backup, the lock's reopening, startup's
  // remembered filing.
  'src/core/persistence/case-import.js',
  'src/core/security/app-lock.js',
  'src/core/startup/startup.js',
];

describe('the filing lifecycle service', () => {
  test('is one frozen object whose members are the implementations themselves', () => {
    expect(Object.isFrozen(filingLifecycle)).toBe(true);
    expect(Object.keys(filingLifecycle).sort()).toEqual(Object.keys(MEMBERS).sort());
    for (const [member, [name, fn]] of Object.entries(MEMBERS)) expect(filingLifecycle[member], `${member} is ${name}`).toBe(fn);
  });

  test('the UI and the test adapter start a lifecycle operation only through it', () => {
    const offenders = [];
    const callers = new Set();
    for (const r of modules()) {
      if (IMPLEMENTATION.has(r)) continue;
      const allowed = new Set(THROUGH_WINDOW[r]?.names || []);
      visit(parseModule(r), (n) => {
        const at = (what) => offenders.push(`${r}:${n.loc.start.line} ${what}`);
        if (n.type === 'ImportDeclaration') {
          for (const s of n.specifiers) {
            if (s.type === 'ImportSpecifier' && OPERATIONS.has(s.imported.name)) at(`imports ${s.imported.name}`);
            if (s.type === 'ImportSpecifier' && s.imported.name === 'filingLifecycle') callers.add(r);
          }
        }
        if (isWindowMember(n, OPERATIONS) && !allowed.has(n.property.name)) at(`window.${n.property.name}`);
        if (n.type === 'VariableDeclarator' && n.init?.type === 'Identifier' && n.init.name === 'window' && n.id.type === 'ObjectPattern') {
          for (const p of n.id.properties) if (p.type === 'Property' && OPERATIONS.has(p.key.name)) at(`{ ${p.key.name} } = window`);
        }
        // The test adapter's call('name') reaches a function by name off its host.
        if (n.type === 'Literal' && typeof n.value === 'string' && OPERATIONS.has(n.value)) at(`'${n.value}'`);
      });
    }
    expect(offenders, 'call filingLifecycle.<member> (src/core/navigation/filing-lifecycle.js)').toEqual([]);
    expect(SERVICE_CALLERS.filter((r) => !callers.has(r)), 'these callers import the service').toEqual([]);
  }, 60_000);

  test("the monolith implements no lifecycle operation, and what it and the listed modules reach through window is the implementation's own publication", () => {
    const ast = parse(read('src/legacy-app.js'), { ecmaVersion: 'latest', sourceType: 'script' });
    const declared = new Set();
    for (const st of ast.body) {
      if (st.type === 'FunctionDeclaration') declared.add(st.id.name);
      if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier') declared.add(d.id.name);
    }
    expect([...OPERATIONS].filter((n) => declared.has(n)), 'declared in legacy-app.js').toEqual([]);
    // Names the monolith calls bare (window globals to a classic script).
    const calledBare = new Set();
    visit(ast, (n) => { if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && OPERATIONS.has(n.callee.name)) calledBare.add(n.callee.name); });
    const needed = new Set([...calledBare, ...Object.values(THROUGH_WINDOW).flatMap((x) => x.names)]);
    // window.X = X, where X is the implementing module's own binding.
    const published = new Set();
    for (const r of IMPLEMENTATION) {
      visit(parseModule(r), (n) => {
        if (n.type === 'AssignmentExpression' && isWindowMember(n.left, OPERATIONS) && n.right.type === 'Identifier' && n.right.name === n.left.property.name) published.add(n.left.property.name);
      });
    }
    expect([...needed].filter((n) => !published.has(n)), 'reached through window but not published as itself by its module').toEqual([]);
    expect([...calledBare], 'the monolith opens no filing itself: the switcher moved out in 70H, loading a case in 70I').toEqual([]);
  }, 60_000);

  test("which filing is open changes only through state.js's setActiveFiling()", () => {
    const SETTERS = new Set(['setD', 'setActiveInventoryType', 'setCaseFile']);
    const offenders = [];
    let transitions = 0;
    for (const r of modules()) {
      if (r === 'src/core/state.js') continue;
      visit(parseModule(r), (n) => {
        if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && !n.left.computed && n.left.property.name === 'activeWardId') {
          offenders.push(`${r}:${n.loc.start.line} assigns activeWardId`);
        }
        if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && SETTERS.has(n.callee.name)) offenders.push(`${r}:${n.loc.start.line} ${n.callee.name}()`);
        if (r === 'src/core/navigation/ward-lifecycle.js' && n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'setActiveFiling') transitions += 1;
      });
    }
    expect(offenders).toEqual([]);
    expect(transitions, "ward-lifecycle.js's open and close").toBe(2);

    const ward = { wardId: 'w1', inventoryType: 'annual', wardName: 'One' };
    setCaseFile({ wards: [ward], activeWardId: null });
    setActiveFiling(ward);
    expect(getCaseFile().activeWardId).toBe('w1');
    expect(getD()).toBe(ward);
    expect(getActiveInventoryType()).toBe('annual');
    setActiveFiling(null);
    expect(getCaseFile().activeWardId).toBe(null);
    expect(getD()).toEqual({});
    expect(getActiveInventoryType()).toBe(null);
  }, 60_000);

  test('the carry-over rules are declared in one module', () => {
    const TABLES = new Set(['ACCOUNTING_FORM_TYPES', 'PRIOR_ACCOUNTING_SOURCES', 'CARRY_SOURCE_TYPE', 'carryOverFields', 'carryOverFieldsForPlan', 'carryOverFieldsForAccounting', 'extractCarryIdentity', 'carrySourcesFor', 'carryWardsFor']);
    const where = [];
    for (const r of [...modules(), 'src/legacy-app.js']) {
      const ast = r === 'src/legacy-app.js' ? parse(read(r), { ecmaVersion: 'latest', sourceType: 'script' }) : parseModule(r);
      for (let st of ast.body) {
        if (st.type === 'ExportNamedDeclaration' && st.declaration) st = st.declaration;
        if (st.type === 'FunctionDeclaration' && TABLES.has(st.id.name)) where.push(`${st.id.name} ${r}`);
        if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier' && TABLES.has(d.id.name)) where.push(`${d.id.name} ${r}`);
      }
    }
    expect(where.sort()).toEqual([...TABLES].map((n) => `${n} src/core/filing/carry-over.js`).sort());
  }, 60_000);
});
