import { describe, expect, test, vi } from 'vitest';
import { TEST_MODE_FLAG, createTestingAdapter, installTestingNamespace } from '../../src/core/testing/testing-adapter.js';
import { PLAN_RIGHTS } from '../../src/core/filing/models/plan-annual.js';

// Milestone 70, 70T: GuardianForms.testing's contract, against a stand-in
// window (setField, which needs a rendered form, is covered by
// tests/e2e/testing-adapter.spec.ts). Enablement is decision D3 and choice
// T3: only a runner-set pre-boot flag, read once and deleted.

function fakeWindow(extra = {}) {
  const filing = { wardId: 'w1', wardName: 'Ward One', inventoryType: 'guardian', guardians: [{ name: '' }], county: '' };
  return {
    caseFile: { activeWardId: 'w1', wards: [filing], parties: [], cases: [] },
    D: filing,
    autoSave: vi.fn(),
    flushPendingSave: vi.fn(async () => 'flushed'),
    navigate: vi.fn(async (r) => r),
    ...extra,
  };
}

describe('enablement (D3, T3)', () => {
  test('the namespace appears only when the runner set the flag to exactly true, and the flag is gone after boot', () => {
    for (const [value, expected] of [[true, true], ['true', false], [1, false], [undefined, false]]) {
      const w = fakeWindow();
      if (value !== undefined) w[TEST_MODE_FLAG] = value;
      expect(installTestingNamespace(w), `flag ${String(value)}`).toBe(expected);
      expect(TEST_MODE_FLAG in w, 'the flag is deleted during boot').toBe(false);
      expect(!!w.GuardianForms?.testing).toBe(expected);
    }
  });

  test('the namespace is frozen and cannot be replaced; setting the flag after boot enables nothing', () => {
    const w = fakeWindow({ [TEST_MODE_FLAG]: true });
    installTestingNamespace(w);
    const ns = w.GuardianForms;
    expect(Object.isFrozen(ns) && Object.isFrozen(ns.testing)).toBe(true);
    expect(() => { 'use strict'; w.GuardianForms = {}; }).toThrow();
    const late = fakeWindow();
    installTestingNamespace(late);
    late[TEST_MODE_FLAG] = true; // too late: boot has already read (and deleted) it
    expect(late.GuardianForms).toBeUndefined();
  });
});

describe('queries return copies, never live objects', () => {
  test('snapshot(): editing the result changes nothing in the app', () => {
    const w = fakeWindow();
    const t = createTestingAdapter(w);
    const snap = t.snapshot();
    expect(snap.filing.wardName).toBe('Ward One');
    expect(snap.activeFilingId).toBe('w1');
    snap.filing.wardName = 'Changed';
    snap.caseFile.wards.push({ wardId: 'w2' });
    expect(w.D.wardName).toBe('Ward One');
    expect(w.caseFile.wards).toHaveLength(1);
  });

  test('field(path) reads a dotted path of the open filing as a copy', () => {
    const t = createTestingAdapter(fakeWindow());
    expect(t.field('guardians.0.name')).toBe('');
    const g = t.field('guardians');
    g[0].name = 'x';
    expect(t.field('guardians.0.name')).toBe('');
  });
});

describe('patchFiling (setup only, D9)', () => {
  test('assigns top-level and dotted keys into the open filing in place, then schedules the save', () => {
    const w = fakeWindow();
    const t = createTestingAdapter(w);
    const rows = [{ amount: 1 }];
    t.patchFiling({ county: 'Pinellas', 'guardians.0.name': 'Pat Guardian', schA: rows });
    expect(w.D.county).toBe('Pinellas');
    expect(w.D.guardians[0].name).toBe('Pat Guardian');
    expect(w.D.schA).toEqual(rows);
    rows[0].amount = 99; // the patch was copied in: the caller keeps no live handle
    expect(w.D.schA[0].amount).toBe(1);
    expect(w.autoSave).toHaveBeenCalledTimes(1);
  });

  test('replaceFiling makes the open filing exactly the edited copy -- deleted keys included -- and refuses another filing', () => {
    const w = fakeWindow();
    const t = createTestingAdapter(w);
    const edited = t.snapshot().filing;
    delete edited.county;
    edited.guardians[0].name = 'Pat';
    t.replaceFiling(edited);
    expect('county' in w.D).toBe(false);
    expect(w.D.guardians[0].name).toBe('Pat');
    expect(w.autoSave).toHaveBeenCalledTimes(1);
    expect(() => t.replaceFiling({ ...edited, wardId: 'other' })).toThrow('not a copy of the open filing');
  });

  test('seedFiling() adds a filing record without opening it and keeps the open filing the same object', () => {
    const w = fakeWindow();
    const open = w.D;
    const t = createTestingAdapter(w);
    const record = { wardId: 'w2', inventoryType: 'guardian', wardName: 'Ward B' };
    t.seedFiling(record);
    record.wardName = 'changed'; // a copy went in
    expect(w.caseFile.wards.map((f) => f.wardName)).toEqual(['Ward One', 'Ward B']);
    expect(w.caseFile.wards[0]).toBe(open);
    expect(w.caseFile.activeWardId).toBe('w1');
    expect(() => t.seedFiling({ wardId: 'w2' })).toThrow('already has filing w2');
    expect(() => t.seedFiling({ wardName: 'no id' })).toThrow('needs a wardId');
  });

  test('refuses when no filing is open', () => {
    const t = createTestingAdapter(fakeWindow({ D: {} }));
    expect(() => t.patchFiling({ county: 'Pinellas' })).toThrow('no filing is open');
  });

  test('with a filing id, patches that filing in the case -- not the open one -- and refuses an unknown id', () => {
    const w = fakeWindow();
    const other = { wardId: 'w2', wardName: 'Ward Two', inventoryType: 'annual', dashboardWorkflow: { status: 'draft' } };
    w.caseFile.wards.push(other);
    const t = createTestingAdapter(w);
    t.patchFiling({ periodTo: '2026-06-30', 'dashboardWorkflow.status': 'approved' }, 'w2');
    expect(other.periodTo).toBe('2026-06-30');
    expect(other.dashboardWorkflow.status).toBe('approved');
    expect(w.D.periodTo).toBeUndefined();
    expect(w.autoSave).toHaveBeenCalledTimes(1);
    expect(() => t.patchFiling({ county: 'Pasco' }, 'nope')).toThrow('no filing nope');
  });
});

describe('reference lists and fixture validation', () => {
  test('constants(name) returns a copy of a published list and refuses anything else', () => {
    // The lists are the Plan models' own since Milestone 70's 70C (they were
    // read off window), so a stand-in on window no longer counts.
    const w = fakeWindow({ PLAN_RIGHTS: [['vote', 'Right to vote']], caseFile: { activeWardId: null, wards: [] } });
    const t = createTestingAdapter(w);
    const rights = t.constants('PLAN_RIGHTS');
    expect(rights).toEqual(PLAN_RIGHTS);
    rights.push(['x', 'y']);
    expect(PLAN_RIGHTS).toHaveLength(12);
    expect(() => t.constants('caseFile')).toThrow('not a published list');
  });

  test('validate.exportGate() reports the open filing\'s export gate, judged on a copy that nothing keeps', async () => {
    const judged = [];
    const w = fakeWindow({
      validateGuardian: (d) => (d.guardians[0].name ? [] : [{ message: 'Guardian name is required' }]),
      prepareFilingOutput: (d, base) => {
        judged.push(d);
        d.committedDraft = true; // what commitStoredDateDrafts() does to its argument
        const messages = base().map((i) => i.message);
        return { messages, canExport: messages.length === 0 };
      },
    });
    const live = w.D;
    const t = createTestingAdapter(w);
    expect(await t.validate.exportGate()).toEqual({ messages: ['Guardian name is required'], canExport: false });
    expect(judged[0]).not.toBe(live);
    expect(w.D).toBe(live);
    expect('committedDraft' in live).toBe(false);
  });

  test('status.annualReconcile() is the balance check over the open filing\'s own totals', () => {
    const w = fakeWindow({
      calcTotalsAnnual: (d) => ({ netAssets: 100, netAssetsFromD: d === w.D ? 90 : 0 }),
      annualReconcileState: (t, d) => ({ diff: t.netAssets - t.netAssetsFromD, outOfBalance: true, explanation: d.reconcileExplanation || '', explained: false }),
    });
    w.D.reconcileExplanation = 'Late deposit';
    const t = createTestingAdapter(w);
    expect(t.status.annualReconcile()).toEqual({ diff: 10, outOfBalance: true, explanation: 'Late deposit', explained: false });
  });

  test('shared-record merge and dismissal pass ids through and return copies', () => {
    const merged = { id: 'p1', roles: ['guardian'] };
    const calls = [];
    const w = fakeWindow({
      mergeParties: (keep, discard, options) => { calls.push([keep, discard, options]); return merged; },
      isPartyPairDismissed: (a, b) => (a === 'p1' && b === 'p2' ? 1 : 0),
    });
    const t = createTestingAdapter(w);
    const result = t.updateSharedRecords.mergeParties('p1', 'p3', { adoptBlankFields: false });
    expect(result).toEqual(merged);
    expect(result).not.toBe(merged);
    expect(calls).toEqual([['p1', 'p3', { adoptBlankFields: false }]]);
    expect(t.sharedRecords.isPartyPairDismissed('p1', 'p2')).toBe(true);
    expect(t.sharedRecords.isPartyPairDismissed('p2', 'p3')).toBe(false);
  });

  test("validate.structured() adapts the open filing's own issues with its own type", async () => {
    const calls = [];
    const w = fakeWindow({
      validateGuardian: () => [{ message: 'Guardian name is required', section: 'D-1' }],
      adaptValidationErrors: (issues, type) => { calls.push(type); return issues.map((i) => ({ ...i, route: '/d1' })); },
    });
    const t = createTestingAdapter(w);
    expect(await t.validate.structured()).toEqual([{ message: 'Guardian name is required', section: 'D-1', route: '/d1' }]);
    expect(calls).toEqual(['guardian']);
  });

  test("validate.fixture judges a data-only filing on the app's blank filing and restores the open one", async () => {
    const seen = [];
    const open = { wardId: 'w1', wardName: 'Open' };
    const w = fakeWindow({
      D: open,
      validateGuardian: (d) => { seen.push(d); return d.guardians[0].name ? [] : [{ message: 'name' }]; },
      prepareFilingOutput: (d, raw) => ({ structuredIssues: raw.map(() => ({ code: 'guardian.name', message: 'Name is required' })) }),
    });
    const t = createTestingAdapter(w);
    expect(await t.validate.fixture({ inventoryType: 'guardian' })).toEqual([{ code: 'guardian.name', message: 'Name is required', bypassable: true }]);
    expect(await t.validate.fixture({ inventoryType: 'guardian', guardians: [{ name: 'Pat' }] })).toEqual([]);
    expect(w.D).toBe(open);
    await expect(t.validate.fixture({ inventoryType: 'nope' })).rejects.toThrow('unrecognized inventoryType');
  });
});

describe('persistence and shared records never hand out key material or live objects', () => {
  test('keyHeld() is a yes or no; decrypt() uses the key held in memory without returning it; caseFileName() is a name, not the handle', async () => {
    const key = { algorithm: 'AES-GCM', secret: 'never-leaves' };
    const handle = { name: 'case.sav', createWritable: () => {} };
    const w = fakeWindow({
      _cryptoKey: key,
      decryptJSONWithKey: vi.fn(async (enc, k) => ({ enc, usedKey: k === key })),
      loadCaseFileHandle: async () => handle,
    });
    const t = createTestingAdapter(w);
    expect(t.persistenceState.keyHeld()).toBe(true);
    expect(await t.persistenceState.decrypt('ENC')).toEqual({ enc: 'ENC', usedKey: true });
    expect(await t.persistenceState.caseFileName()).toBe('case.sav');
    expect(JSON.stringify([t.persistenceState.keyHeld(), await t.persistenceState.decrypt('x')])).not.toContain('never-leaves');
  });

  test('resolveParty() is a copy', () => {
    const party = { id: 'p1', name: 'Pat' };
    const t = createTestingAdapter(fakeWindow({ resolveParty: () => party }));
    const copy = t.sharedRecords.resolveParty('p1');
    copy.name = 'Changed';
    expect(party.name).toBe('Pat');
  });
});

describe('commands call the application function they replace', () => {
  test('navigate and save.flush pass through; a missing function fails loudly', async () => {
    const w = fakeWindow();
    const t = createTestingAdapter(w);
    expect(await t.navigate('/print')).toBe('/print');
    expect(await t.save.flush()).toBe('flushed');
    expect(() => t.lock()).toThrow('lockApp() is not available');
  });
});
