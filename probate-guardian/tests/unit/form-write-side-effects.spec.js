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
    // The tail closes by dispatching `pg:field-written` on window -- the hook
    // Annual Accounting's refreshAnnualTotals() subscribes to now that its
    // own persistAnnualControl() (which called it directly) is gone.
    dispatchEvent: rec('fieldWritten'),
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
    expect(w.calls).toEqual(['county', 'slot', 'identity', 'autoSave', 'navDots', 'wardCard', 'guardianName', 'fieldWritten']);
    expect(w.dispatchEvent.mock.calls[0][0]).toMatchObject({ type: 'pg:field-written', detail: { path: 'guardians.0.name' } });
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

  // Milestone 43B: writeDraftValue/finalizeFieldValue are exported from
  // form-contract.js, so this path can invoke the real functions -- reusing
  // the same window mock as the describe block above -- instead of grepping
  // their source text for the call. A source-text check would pass even if
  // the call were unreachable (e.g. behind a condition that's always false);
  // invoking for real and asserting the mock actually ran cannot.
  it('finalizeFieldValue and writeDraftValue (data-form-path) actually invoke the shared tail', async () => {
    const w = freshWindow();
    globalThis.window = w;
    globalThis.document = globalThis.document || { querySelectorAll: () => [] };
    vi.resetModules();
    const { writeDraftValue, finalizeFieldValue } = await import('../../src/core/form/form-contract.js');

    // window.getPath is undefined in this mock, so writeDraftValue's
    // `currentVal !== rawValue` guard (comparing against undefined) is
    // satisfied by any non-undefined value -- reaching its real call site
    // rather than being skipped as a no-op write.
    writeDraftValue({ dataset: { formPath: 'someTextField', fieldKind: 'text' }, type: 'text', value: 'New Value' });
    expect(w.calls).toContain('autoSave');

    w.calls.length = 0;
    finalizeFieldValue({ dataset: { formPath: 'someTextField', fieldKind: 'text' }, type: 'text', value: 'Some Value' });
    expect(w.calls).toContain('autoSave');
  });

  // Annual/Final/Trust (data-annual-path) no longer has a write path of its
  // own: persistAnnualControl() was retired, and form-events.js's listeners
  // claim data-annual-path exactly as they do data-form-path, so the tail is
  // reached through the same two real functions as above.
  it('data-annual-path reaches the shared tail through writeDraftValue/finalizeFieldValue, with no persistAnnualControl left', async () => {
    const w = freshWindow();
    globalThis.window = w;
    globalThis.document = globalThis.document || { querySelectorAll: () => [] };
    vi.resetModules();
    const { writeDraftValue, finalizeFieldValue } = await import('../../src/core/form/form-contract.js');

    writeDraftValue({ dataset: { annualPath: 'schC.0.description' }, type: 'text', value: 'Sale of homestead' });
    expect(w.calls).toContain('autoSave');
    w.calls.length = 0;
    finalizeFieldValue({ dataset: { annualPath: 'schC.0.description' }, type: 'text', value: 'Sale of homestead' });
    expect(w.calls).toContain('autoSave');

    expect(read('src/features/annual-accounting/index.js')).not.toMatch(/function persistAnnualControl/);
    // The document-level listeners are what route the events here: all four
    // binding checks go through one helper that names all three attributes.
    const events = read('src/form-events.js');
    expect(events).toMatch(/const boundPath = \(control\) => control\.dataset\.fieldPath \|\| control\.dataset\.formPath \|\| control\.dataset\.annualPath;/);
    expect((events.match(/boundPath\(control\)/g) || []).length).toBe(4);
    expect(events).not.toMatch(/dataset\.fieldPath \|\| control\.dataset\.formPath\)/);
  });

  // afterChange (legacy-app.js) is module-private -- not exported, so there
  // is no way to import and invoke it directly the way writeDraftValue/
  // finalizeFieldValue are above. Source-text confirmation of the call site
  // is the best available check in this Node-only suite; a real invocation
  // would need e2e (a real browser/window), same reachability gap Milestone
  // 43A found for normalizeWardData()/window.calc.
  it('afterChange (legacy data-bind)', () => {
    const body = bodyOf(read('src/legacy-app.js'), 'afterChange');
    expect(body).toContain('window.runFieldWriteSideEffects(path)');
    expect(body).not.toContain('identitySlotForPath');
    expect(body).not.toContain('maybeCommitCoverCounty');
  });

  // A negative existence check ("this pattern appears nowhere") is
  // legitimately best done via source scan, not a proxy for behavior --
  // there is no function to invoke to prove an absence.
  it('persistFormControl no longer exists anywhere', () => {
    for (const rel of ['src/form-events.js', 'src/core/form/form-contract.js', 'src/legacy-app.js']) {
      expect(read(rel)).not.toMatch(/function persistFormControl/);
    }
  });
});
