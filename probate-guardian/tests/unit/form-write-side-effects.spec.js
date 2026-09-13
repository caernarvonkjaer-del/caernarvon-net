// Milestone 42D: one post-write tail for every filing type.
//
// Before 42D the same six side effects were copied into three write paths
// (form-contract.js, annual-accounting/index.js, legacy-app.js's
// afterChange()) and drifted -- 40C-A had to wire maybeCommitCoverCounty()
// into each separately. This spec pins (a) what the shared tail does and in
// what order, and (b) that all three paths call it rather than re-growing
// their own copies.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function freshWindow() {
  const calls = [];
  const rec = (name, impl) => vi.fn((...args) => { calls.push(name); return impl ? impl(...args) : undefined; });
  const w = {
    D: { wardName: 'W', county: 'Orange' },
    calls,
    maybeCommitCoverCounty: rec('county'),
    identitySlotForPath: rec('slot', (_d, p) => (p === 'guardians.0.name' ? { role: 'guardian', index: 0 } : null)),
    syncIdentityField: rec('identity'),
    autoSave: rec('autoSave'),
    updateNavDots: rec('navDots'),
    refreshWardInfoCard: rec('wardCard'),
    syncActiveWardNameDisplay: rec('wardName'),
    syncGuardianNameDisplay: rec('guardianName'),
  };
  return w;
}

describe('runFieldWriteSideEffects()', () => {
  let run;
  let w;
  beforeEach(async () => {
    w = freshWindow();
    globalThis.window = w;
    globalThis.document = globalThis.document || { querySelectorAll: () => [] };
    vi.resetModules();
    ({ runFieldWriteSideEffects: run } = await import('../../src/core/form/form-contract.js'));
  });

  it('runs county commit and Party write-through before autosave, then the display refreshes', () => {
    run('guardians.0.name', { dataset: {} });
    expect(w.calls).toEqual(['county', 'slot', 'identity', 'autoSave', 'navDots', 'wardCard', 'guardianName']);
  });

  it('hands every path to maybeCommitCoverCounty (it is the one that scopes to `county`)', () => {
    run('county', { dataset: {} });
    run('attorney_county', { dataset: {} });
    expect(w.maybeCommitCoverCounty.mock.calls.map((c) => c[0])).toEqual(['county', 'attorney_county']);
  });

  it('skips the Party write-through when the path has no identity slot', () => {
    run('periodFrom', { dataset: {} });
    expect(w.syncIdentityField).not.toHaveBeenCalled();
    expect(w.autoSave).toHaveBeenCalledTimes(1);
  });

  it('syncs the sidebar names by data-sync-* flag (primitive-built fields) or by path (legacy data-bind)', () => {
    run('someOtherPath', { dataset: { syncWardName: 'true' } });
    expect(w.syncActiveWardNameDisplay).toHaveBeenCalledTimes(1);
    run('wardName');
    expect(w.syncActiveWardNameDisplay).toHaveBeenCalledTimes(2);
    run('guardianName');
    run('guardians.0.name');
    run('unrelated', { dataset: { syncGuardianName: 'true' } });
    expect(w.syncGuardianNameDisplay).toHaveBeenCalledTimes(3);
  });

  it('does nothing for an empty path', () => {
    run('');
    expect(w.calls).toEqual([]);
  });
});

describe('all three binding paths call the shared tail', () => {
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
  const bodyOf = (source, name) => {
    const start = source.indexOf(`function ${name}(`);
    expect(start, `${name} not found`).toBeGreaterThan(-1);
    const end = source.indexOf('\n}', start);
    return source.slice(start, end);
  };

  it('finalizeFieldValue and writeDraftValue (data-form-path)', () => {
    const src = read('src/core/form/form-contract.js');
    expect(bodyOf(src, 'writeDraftValue')).toContain('runFieldWriteSideEffects(path, control)');
    expect(bodyOf(src, 'finalizeFieldValue')).toContain('runFieldWriteSideEffects(path, control)');
  });

  it('persistAnnualControl (data-annual-path)', () => {
    const body = bodyOf(read('src/features/annual-accounting/index.js'), 'persistAnnualControl');
    expect(body).toContain('runFieldWriteSideEffects(path, control)');
    expect(body).not.toContain('identitySlotForPath');
    expect(body).not.toContain('maybeCommitCoverCounty');
  });

  it('afterChange (legacy data-bind)', () => {
    const body = bodyOf(read('src/legacy-app.js'), 'afterChange');
    expect(body).toContain('window.runFieldWriteSideEffects(path)');
    expect(body).not.toContain('identitySlotForPath');
    expect(body).not.toContain('maybeCommitCoverCounty');
  });

  it('persistFormControl no longer exists anywhere', () => {
    for (const rel of ['src/form-events.js', 'src/core/form/form-contract.js', 'src/legacy-app.js']) {
      expect(read(rel)).not.toMatch(/function persistFormControl/);
    }
  });
});
