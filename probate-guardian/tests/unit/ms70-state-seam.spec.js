import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { parse } from 'acorn';
import { CLASSIC_STATE_PATH, classicStateAccesses } from '../../scripts/ms70-classic-state.mjs';

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
// The seam itself and the classic scripts (the monolith is held below by the
// only-shrinks list).
const OWNERS = new Set(['src/core/state.js', 'src/legacy-app.js', 'src/prepaint.js']);

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

  test("the monolith's own bare state accesses may only shrink (the list 70J empties)", () => {
    const baseline = JSON.parse(fs.readFileSync(path.join(root, CLASSIC_STATE_PATH), 'utf8')).counts;
    const now = classicStateAccesses(fs.readFileSync(path.join(root, 'src/legacy-app.js'), 'utf8'));
    const grown = Object.entries(now).filter(([k, n]) => n > (baseline[k] || 0)).map(([k, n]) => `${k}: ${baseline[k] || 0} -> ${n}`);
    const stale = Object.entries(baseline).filter(([k, n]) => (now[k] || 0) < n).map(([k, n]) => `${k}: ${n} -> ${now[k] || 0}`);
    expect(grown, 'a new bare access to the monolith-owned state').toEqual([]);
    expect(stale, 'accesses went away -- lock the shrink in: node scripts/ms70-classic-state.mjs --write-baseline').toEqual([]);
  }, 60_000);
});

describe('the seam is the one authority, live and zero-copy', () => {
  let state;
  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('window', {});
    state = await import('../../src/core/state.js');
  });
  afterEach(() => vi.unstubAllGlobals());

  test('getters hand back the live objects the monolith holds, never copies', () => {
    const filing = { wardId: 'w1', wardName: 'A' };
    const caseFile = { activeWardId: 'w1', wards: [filing] };
    window.D = filing; window.caseFile = caseFile;
    expect(state.getD()).toBe(filing);
    expect(state.getActiveFiling()).toBe(filing);
    expect(state.getCaseFile()).toBe(caseFile);
    expect(state.getActiveWard()).toBe(filing);
    expect(state.select(({ filing: f }) => f)).toBe(filing);
    expect(state.select(({ caseFile: c }) => c)).toBe(caseFile);
    // A reassignment by the owner is seen at once: nothing was cached.
    const next = { wardId: 'w2' };
    window.D = next;
    expect(state.getD()).toBe(next);
  });

  test('getActiveWard() answers exactly as the monolith\'s did: null with none open, find() otherwise', () => {
    window.caseFile = { activeWardId: null, wards: [{ wardId: 'w1' }] };
    expect(state.getActiveWard()).toBeNull();
    window.caseFile = { activeWardId: 'gone', wards: [{ wardId: 'w1' }] };
    expect(state.getActiveWard()).toBeUndefined();
  });

  test('the filing type and app state are the monolith\'s, written where it reads them', () => {
    state.setActiveInventoryType('planMinor');
    expect(window.activeInventoryType).toBe('planMinor');
    expect(state.getActiveInventoryType()).toBe('planMinor');
    window._appState = { firstLaunchSeen: true };
    state.setAppState('firstLaunchSeen', false);
    expect(window._appState).toEqual({ firstLaunchSeen: false });
    expect(state.getAppState('firstLaunchSeen')).toBe(false);
    expect(state.getAppState('missing')).toBeNull();
  });

  test('a transaction changes the open filing in place and runs each side effect once, in order', () => {
    const filing = { wardId: 'w1', wardName: 'A' };
    window.D = filing; window.caseFile = { wards: [filing] };
    const calls = [];
    state.configureCaseStore({ markRevision: (r) => calls.push(`revision:${r}`), save: () => calls.push('save') });
    state.subscribe((e) => calls.push(`${e.type}:${e.reason}`));
    const out = state.transaction('rename', (d) => { d.wardName = 'B'; return 'done'; });
    expect(out).toBe('done');
    expect(window.D).toBe(filing);
    expect(filing.wardName).toBe('B');
    expect(calls).toEqual(['revision:rename', 'save', 'transaction:rename']);
  });

  test('a transaction that throws runs no side effect, and a reason is required', () => {
    window.D = { wardId: 'w1' }; window.caseFile = { wards: [] };
    const save = vi.fn();
    state.configureCaseStore({ save });
    expect(() => state.transaction('x', () => { throw new Error('nope'); })).toThrow('nope');
    expect(save).not.toHaveBeenCalled();
    expect(() => state.transaction('', () => {})).toThrow('reason');
  });

  test('a subscriber can leave, by its function or its AbortSignal, and a failing one does not stop the rest', () => {
    window.D = {}; window.caseFile = { wards: [] };
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
  test('the transaction hooks are the revision counter and the monolith\'s own autoSave(), and no window accessor is installed', () => {
    const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
    expect(main).toContain("configureCaseStore({ markRevision: markFilingRevisionChanged, save: () => monolith.autoSave() });");
    expect(main).not.toMatch(/defineProperty\(window,\s*'(D|caseFile)'/);
  });
});
