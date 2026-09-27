import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { parse } from 'acorn';
import { CLASSIC_STATE_PATH, classicStateInApp } from '../../scripts/ms70-classic-state.mjs';
import { classicScripts, classicScriptSources } from './support/classic-scripts.js';

// Milestone 70, 70J gate: "There is one case object and one derivation of the
// active filing ... No production module or classic wrapper can mutate a
// competing global mirror." The case is src/core/state.js's; the open filing
// and its type are derived from the case's activeWardId; none of the three is
// on window. (The faults and the one-update-each rule:
// ms70-case-authority.spec.js.)
//
// Milestone 70, 70E gate: "No ESM production module treats a browser global
// as its state API. The transition still has one legacy authority, not two
// synchronized stores; existing object identity and live update behavior
// remain intact. A transaction causes each required side effect once, and
// direct mutation outside an approved transition path is rejected by the
// audit/test guard where mechanically detectable."

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (f) => path.relative(root, f).split(path.sep).join('/');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name))
  : /\.js$/.test(e.name) ? [path.join(dir, e.name)] : []));
// The monolith's case state, as window members: the open filing, the case and
// its accessors, the filing type, app state and the template cache.
const STATE_GLOBALS = new Set(['D', 'caseFile', 'getCaseFile', 'getActiveWard', 'activeInventoryType', '_appState', '_templateCache']);
// The classic scripts index.html loads, held below by their empty list (the
// monolith was one until 70L deleted it). The store is no exception since
// 70J: it owns the case, and reads no window.
const OWNERS = new Set(classicScripts());

describe('modules reach case state only through src/core/state.js', () => {
  test('no other module reads or writes the monolith\'s state on window', () => {
    const offenders = [];
    for (const file of walk(path.join(root, 'src'))) {
      const r = rel(file);
      if (OWNERS.has(r)) continue;
      const ast = parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module', locations: true });
      (function visit(node) {
        if (!node || typeof node.type !== 'string') return;
        if (node.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier'
            && node.object.name === 'window' && STATE_GLOBALS.has(node.property.name)) {
          offenders.push(`${r}:${node.loc.start.line} window.${node.property.name}`);
        }
        // A destructure off window at load time is the same read.
        if (node.type === 'VariableDeclarator' && node.init?.type === 'Identifier' && node.init.name === 'window'
            && node.id.type === 'ObjectPattern') {
          for (const p of node.id.properties) {
            if (p.type === 'Property' && !p.computed && STATE_GLOBALS.has(p.key.name)) offenders.push(`${r}:${p.loc.start.line} { ${p.key.name} } = window`);
          }
        }
        for (const k of Object.keys(node)) {
          const c = node[k];
          if (Array.isArray(c)) c.forEach(visit); else if (c && typeof c.type === 'string') visit(c);
        }
      })(ast);
    }
    expect(offenders).toEqual([]);
  }, 60_000);

  // The list only shrank from 70E; 70J emptied it and it stays empty. It was
  // the monolith's; since 70L deleted that, it is every classic script's.
  test('no classic script holds case state: no caseFile, D or filing type of its own, and none on window', () => {
    const baseline = JSON.parse(fs.readFileSync(path.join(root, CLASSIC_STATE_PATH), 'utf8')).counts;
    expect(baseline, 'the recorded list').toEqual({});
    expect(classicStateInApp(root), 'a bare access to case state in a classic script').toEqual({});
    for (const { file, source } of classicScriptSources()) {
      expect(source, file).not.toMatch(/^(let|const|var) (caseFile|activeInventoryType|D)\b/m);
      expect(source, file).not.toMatch(/defineProperty\(window,\s*'(D|caseFile|activeInventoryType)'/);
    }
  }, 60_000);

  // "Confirm, mechanically, that all whole-case replacements use
  // replaceCaseFile()" (70J's work). Who calls it is held by
  // filing-lifecycle.spec.js; this holds the other way to replace a case --
  // writing its filings wholesale -- to the one module that merges into them.
  test('no module replaces a case\'s filings wholesale but the import, which merges into them', () => {
    const offenders = [];
    for (const file of walk(path.join(root, 'src'))) {
      const r = rel(file);
      if (OWNERS.has(r) || r === 'src/core/persistence/case-import.js') continue;
      const ast = parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module', locations: true });
      (function visit(node) {
        if (!node || typeof node.type !== 'string') return;
        // `x.wards = []` is the defensive start of a missing list, not a replacement.
        if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && !node.left.computed
            && node.left.property.name === 'wards' && !(node.right.type === 'ArrayExpression' && node.right.elements.length === 0)) {
          offenders.push(`${r}:${node.loc.start.line}`);
        }
        for (const k of Object.keys(node)) {
          const c = node[k];
          if (Array.isArray(c)) c.forEach(visit); else if (c && typeof c.type === 'string') visit(c);
        }
      })(ast);
    }
    expect(offenders).toEqual([]);
  }, 60_000);
});

describe('the store is the one authority, live and zero-copy', () => {
  let state;
  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('window', {});
    state = await import('../../src/core/state.js');
  });
  afterEach(() => vi.unstubAllGlobals());

  test('getters hand back the live objects, never copies, and the open filing and its type are the ones activeWardId names', () => {
    const filing = { wardId: 'w1', wardName: 'A', inventoryType: 'planMinor' };
    const caseFile = { activeWardId: 'w1', wards: [filing] };
    state.replaceCaseFile(caseFile);
    expect(state.getD()).toBe(filing);
    expect(state.getActiveFiling()).toBe(filing);
    expect(state.getCaseFile()).toBe(caseFile);
    expect(state.getActiveWard()).toBe(filing);
    expect(state.getActiveInventoryType()).toBe('planMinor');
    expect(state.select(({ filing: f }) => f)).toBe(filing);
    expect(state.select(({ caseFile: c }) => c)).toBe(caseFile);
    // Another filing opened: the open filing and its type follow at once.
    const next = { wardId: 'w2', inventoryType: 'annual' };
    caseFile.wards.push(next);
    state.setActiveFiling(next);
    expect(state.getD()).toBe(next);
    expect(state.getActiveInventoryType()).toBe('annual');
    // Closed: a scratch {} and no type, and a fresh scratch after each close.
    state.setActiveFiling(null);
    const scratch = state.getD();
    expect(scratch).toEqual({});
    expect(state.getActiveInventoryType()).toBeNull();
    state.setActiveFiling(null);
    expect(state.getD()).not.toBe(scratch);
    // None of it is on window.
    for (const name of ['caseFile', 'D', 'activeInventoryType']) expect(name in window, `window.${name}`).toBe(false);
  });

  test('getActiveWard() answers as the monolith\'s did: null with none open, find() otherwise', () => {
    state.replaceCaseFile({ activeWardId: null, wards: [{ wardId: 'w1' }] });
    expect(state.getActiveWard()).toBeNull();
    state.replaceCaseFile({ activeWardId: 'gone', wards: [{ wardId: 'w1' }] });
    expect(state.getActiveWard()).toBeUndefined();
    state.replaceCaseFile(null);
    expect(state.getCaseFile()).toEqual(state.blankCaseFile());
  });

  test('a filing put in view is what the validators read, for the call only; the case is untouched', () => {
    const open = { wardId: 'w1', wardName: 'Open' };
    state.replaceCaseFile({ activeWardId: 'w1', wards: [open] });
    const judged = { wardId: 'copy', wardName: 'Judged' };
    expect(state.withFilingInView(judged, () => state.getD().wardName)).toBe('Judged');
    expect(state.getD()).toBe(open);
    expect(() => state.withFilingInView(judged, () => { throw new Error('boom'); })).toThrow('boom');
    expect(state.getD()).toBe(open);
    expect(state.getActiveWard()).toBe(open);
  });

  test('app state and the template cache are this module\'s own (70I)', () => {
    state.setAppState('firstLaunchSeen', false);
    expect(state.getAppState('firstLaunchSeen')).toBe(false);
    expect(state.appStateObject()).toEqual({ firstLaunchSeen: false });
    expect(state.getAppState('missing')).toBeNull();
    expect(window._appState, 'no window copy').toBeUndefined();
    state.replaceTemplateCache({ annual: 'UEsDB' });
    expect(state.getTemplateCache()).toEqual({ annual: 'UEsDB' });
    expect(window._templateCache, 'no window copy').toBeUndefined();
  });

  test('requestSave() and commitPendingEdits() run the hooks main.js configures, and do nothing before it does', () => {
    expect(state.requestSave()).toBeUndefined();
    expect(state.commitPendingEdits()).toBeUndefined();
    const calls = [];
    state.configureCaseStore({ save: () => calls.push('save'), commitPending: () => calls.push('commit') });
    state.commitPendingEdits();
    state.requestSave();
    expect(calls).toEqual(['commit', 'save']);
    // countAutoSaves() (the test adapter) swaps the save hook and restores it.
    const restore = state.replaceSaveHook(() => calls.push('counted'));
    state.requestSave();
    restore();
    state.requestSave();
    expect(calls).toEqual(['commit', 'save', 'counted', 'save']);
  });

  test('a transaction changes the open filing in place and runs each side effect once, in order', () => {
    const filing = { wardId: 'w1', wardName: 'A' };
    state.replaceCaseFile({ activeWardId: 'w1', wards: [filing] });
    const calls = [];
    state.configureCaseStore({ markRevision: (r) => calls.push(`revision:${r}`), save: () => calls.push('save') });
    state.subscribe((e) => calls.push(`${e.type}:${e.reason}`));
    const out = state.transaction('rename', (d) => { d.wardName = 'B'; return 'done'; });
    expect(out).toBe('done');
    expect(state.getD()).toBe(filing);
    expect(filing.wardName).toBe('B');
    expect(calls).toEqual(['revision:rename', 'save', 'transaction:rename']);
  });

  test('a transaction that throws runs no side effect, and a reason is required', () => {
    state.replaceCaseFile({ activeWardId: 'w1', wards: [{ wardId: 'w1' }] });
    const save = vi.fn();
    state.configureCaseStore({ save });
    expect(() => state.transaction('x', () => { throw new Error('nope'); })).toThrow('nope');
    expect(save).not.toHaveBeenCalled();
    expect(() => state.transaction('', () => {})).toThrow('reason');
  });

  test('a subscriber can leave, by its function or its AbortSignal, and a failing one does not stop the rest', () => {
    state.replaceCaseFile({ activeWardId: null, wards: [] });
    const heard = [];
    const ac = new AbortController();
    const off = state.subscribe(() => heard.push('a'));
    state.subscribe(() => heard.push('b'), { signal: ac.signal });
    state.subscribe(() => { throw new Error('bad listener'); });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    state.transaction('one', () => {});
    off(); ac.abort();
    state.transaction('two', () => {});
    expect(heard).toEqual(['a', 'b']);
    expect(err).toHaveBeenCalledTimes(2);
    err.mockRestore();
  });
});

describe('main.js wires the store to the owner once', () => {
  test('the store\'s hooks are the revision counter, the persistence service\'s autoSave() and the form layer\'s pending-edit commit, and no window accessor is installed', () => {
    const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
    expect(main).toContain("configureCaseStore({ markRevision: markFilingRevisionChanged, save: autoSave, commitPending: commitPendingFieldValues });");
    expect(main).toContain("import { autoSave, installSaveListeners } from './core/persistence/case-file.js';");
    expect(main).toContain("import { commitPendingFieldValues } from './core/form/form-contract.js';");
    expect(main).not.toMatch(/defineProperty\(window,\s*'(D|caseFile|activeInventoryType)'/);
  });
});
