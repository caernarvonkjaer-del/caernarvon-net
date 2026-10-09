// Milestone 73J part 1: one change event for every committed change to a
// filing (src/core/model-change.js). Before it, only a typed field announced
// itself (`pg:field-written`); "+ Add", Remove, the clean-up, an import, Link
// Person, Sync, Merge, a stamp, New Year, a conversion and a year switch all
// changed a filing silently. No visible change on its own (73J part 2 uses it).
//
// Two halves:
//   1. what the event says, through the real entry points that run under Node
//      (the module, the field write, the clean-up, the Plans' row actions);
//   2. a structural guard over src/: every requestSave() is either a change
//      that announces itself, or one of the saves listed below, each with its
//      reason -- so a new way of changing a filing can't skip the event.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The page refreshes the field write and the row actions call need a page; as
// in output-revision-wiring.spec.js, they are stood in.
vi.mock('../../src/core/status/nav-marks.js', () => ({ updateNavDots: () => {} }));
vi.mock('../../src/core/shell/sidebar.js', () => ({ refreshWardInfoCard: () => {}, syncActiveWardNameDisplay: () => {}, syncGuardianNameDisplay: () => {}, updateSidebar: () => {} }));
vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));

// Under Node, `window` is a stand-in with no events: give it a real EventTarget.
globalThis.window = globalThis.window || globalThis;
const bus = new EventTarget();
for (const name of ['addEventListener', 'removeEventListener', 'dispatchEvent']) {
  if (typeof window[name] !== 'function') window[name] = bus[name].bind(bus);
}
const { MODEL_CHANGE_EVENT, WHOLE_FILING, announceModelChange, recordModelChange, commitModelChange, onModelChange } = await import('../../src/core/model-change.js');
const { getOutputRevision } = await import('../../src/core/filing/output-revision.js');
const { replaceSaveHook, setActiveFiling, getCaseFile } = await import('../../src/core/state.js');
const { runFieldWriteSideEffects } = await import('../../src/core/form/form-contract.js');
const { pruneBlankCards } = await import('../../src/core/form/prune-cards.js');
const { addPlanRow, removePlanRow, duplicatePlanRow } = await import('../../src/core/form/plan-row-actions.js');
const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let events;
let saves;
let stopListening;
let restoreSave;
beforeEach(() => {
  events = [];
  saves = 0;
  stopListening = onModelChange((change) => events.push(change));
  restoreSave = replaceSaveHook(() => { saves += 1; });
});
afterEach(() => {
  stopListening();
  restoreSave();
});

describe('73J part 1: the change event', () => {
  it('names its reason and paths, and defaults to the whole filing', () => {
    announceModelChange('collection-add', ['schA']);
    announceModelChange('excel-import');
    announceModelChange('clean-up', ['schA', 'schA', '']);
    expect(events).toEqual([
      { reason: 'collection-add', paths: ['schA'] },
      { reason: 'excel-import', paths: [WHOLE_FILING] },
      { reason: 'clean-up', paths: ['schA'] },
    ]);
    expect(MODEL_CHANGE_EVENT).toBe('pg:model-changed');
  });

  it('record marks the output revision; commit marks it and queues the save; announce does neither', () => {
    const before = getOutputRevision();
    announceModelChange('x');
    expect([getOutputRevision(), saves]).toEqual([before, 0]);
    recordModelChange('new-year');
    expect([getOutputRevision(), saves]).toEqual([before + 1, 0]);
    commitModelChange('collection-add', ['schA']);
    expect([getOutputRevision(), saves]).toEqual([before + 2, 1]);
    expect(events.map((e) => e.reason)).toEqual(['x', 'new-year', 'collection-add']);
  });

  it('a listener stops when its signal aborts', () => {
    const seen = [];
    const controller = new AbortController();
    onModelChange((c) => seen.push(c.reason), { signal: controller.signal });
    announceModelChange('a');
    controller.abort();
    announceModelChange('b');
    expect(seen).toEqual(['a']);
  });
});

describe('73J part 1: the real entry points announce once, after the change', () => {
  it('a field write: once, naming the field, after pg:field-written', () => {
    const order = [];
    const onField = () => order.push('field-written');
    window.addEventListener('pg:field-written', onField);
    const stop = onModelChange(() => order.push('model-changed'));
    setActiveFiling({ wardId: 'w1', inventoryType: 'annual', ...initializeEmptyData('annual') });
    runFieldWriteSideEffects('wardName');
    window.removeEventListener('pg:field-written', onField);
    stop();
    expect(events).toEqual([{ reason: 'field-write', paths: ['wardName'] }]);
    expect(order).toEqual(['field-written', 'model-changed']);
  });

  it('the clean-up: the lists it emptied, and nothing when nothing was untouched', () => {
    const data = initializeEmptyData('annual');
    data.certRecipients = [{ name: 'A', line2: '', line3: '', line4: '' }, { name: '', line2: '', line3: '', line4: '' }];
    data.remuneration = [{ guardian: '', type: '', amount: '', description: '' }];
    pruneBlankCards(data, 'annual');
    expect(events).toEqual([{ reason: 'clean-up', paths: ['certRecipients', 'remuneration'] }]);
    expect(saves).toBe(1);
    events.length = 0;
    pruneBlankCards(data, 'annual');
    expect(events).toEqual([]);
  });

  it("a Plan's row actions: add, duplicate and remove each announce their list once, and save", async () => {
    const filing = { wardId: 'w2', ...initializeEmptyData('planAnnual'), inventoryType: 'planAnnual' };
    getCaseFile().wards.push(filing); // the open filing is the case's, found by id
    setActiveFiling(filing);
    addPlanRow('q1Residences', 'residence', '/p4');
    duplicatePlanRow('q1Residences', 0, '/p4');
    // Milestone 73P: Remove asks first when the card holds anything (an
    // untouched copy goes at once), so it is awaited.
    await removePlanRow('q1Residences', 1, '/p4');
    expect(events).toEqual([
      { reason: 'collection-add', paths: ['q1Residences'] },
      { reason: 'collection-duplicate', paths: ['q1Residences'] },
      { reason: 'collection-remove', paths: ['q1Residences'] },
    ]);
    expect(saves).toBe(3);
  });
});

// ── Structural guard ─────────────────────────────────────────────────────────

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return walk(rel);
    return e.name.endsWith('.js') ? [rel] : [];
  });
}
const SOURCES = walk('src');
const code = (rel) => read(rel).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const count = (text, re) => (text.match(re) || []).length;

// Saves that announce no change, and why. Anything else that calls
// requestSave() must be a change that announces itself instead.
const SAVES_THAT_ANNOUNCE_NOTHING = {
  'src/core/model-change.js': [1, 'commitModelChange() itself'],
  'src/core/form/form-contract.js': [1, 'the field write marks, saves and refreshes the page in its own order, then announces last'],
  'src/core/pdf/pdf-preview.js': [2, "Preview's annotations: storing them must not undo the override the filer just gave"],
  'src/core/filing/schedule-docs.js': [3, 'a supporting document\'s background check finishing (a status, not a filer\'s change; the upload announced)'],
  'src/core/persistence/launch-preferences.js': [1, 'app preferences, not a filing'],
  'src/core/persistence/templates.js': [1, 'a saved template, not a filing'],
  'src/core/testing/testing-adapter.js': [3, 'test hooks'],
  'src/features/annual-accounting/index.js': [2, 'repairs on opening the page (the bond answer, the ward status)'],
  'src/features/guardian-inventory/index.js': [1, 'a filing with no guardian card gets one when D-1 is drawn'],
  'src/features/plan-annual/index.js': [1, 'a repair on opening the page'],
  'src/features/plan-initial/index.js': [3, 'repairs on opening the page (73O part 1: the one attorney name)'],
  'src/features/plan-minor/index.js': [1, 'a repair on opening the page'],
  'src/features/plan-simplified/index.js': [2, 'repairs on opening the page'],
  'src/features/simplified-accounting/index.js': [2, 'repairs on opening the page (the certificate details, the ward status)'],
};

// Where each kind of change announces itself (commit/record/announce calls).
const ANNOUNCEMENTS = {
  'src/core/form/form-contract.js': 2,              // the field write; a date draft
  'src/core/form/plan-row-actions.js': 5,           // the Plans' add/remove guardian, add/remove/duplicate row
  'src/core/form/prune-cards.js': 1,                // the clean-up on leaving a page
  'src/core/modals/pick-record-dialogs.js': 2,      // Link Person; a new shared record from a slot
  'src/core/signature/signature-state-control.js': 1, // a signature stamp
  'src/core/parties/party-management.js': 6,        // Sync (3), Merge, Dismiss, Unmerge
  'src/core/filing/schedule-docs.js': 3,            // a supporting document added, removed, its comment
  'src/core/filing/filing-years.js': 2,             // New Year; a switch to another year
  'src/core/filing/conversion.js': 1,               // a conversion
  'src/core/excel/import-transaction.js': 1,        // an import as one transaction (73E part 1): every Excel import since 73T parts 2-4
  'src/features/annual-accounting/filing-type.js': 1, // Annual/Final/Trust
  'src/features/annual-accounting/index.js': 6,     // no-items; add/remove/duplicate row; add/remove B-4 account
  'src/features/guardian-inventory/index.js': 16,   // rows, guardians, recipients, witnesses, the vehicle box and fields, old D-5 details; 74P's C-5 joint owner and C-1 yearly total; 74O's "Use the Cover's name"
  'src/features/plan-initial/index.js': 1,          // 73O part 1: which attorney the filer keeps
  'src/features/simplified-accounting/index.js': 9, // guardians, recipients, remuneration, no-items, the address conflict, old certificate details
};

describe('73J part 1: every change announces itself', () => {
  it('every requestSave() is a listed save that announces nothing', () => {
    const found = Object.fromEntries(SOURCES.map((f) => [f, count(code(f), /\brequestSave\(\)/g)]).filter(([f, n]) => n && !/export function requestSave/.test(f)));
    delete found['src/core/state.js']; // its definition
    const expected = Object.fromEntries(Object.entries(SAVES_THAT_ANNOUNCE_NOTHING).map(([f, [n]]) => [f, n]));
    expect(found, 'a change that saves must call commitModelChange() (or recordModelChange() if it saves itself), not requestSave()').toEqual(expected);
  });

  it('each kind of change announces where it is made', () => {
    const found = Object.fromEntries(SOURCES
      .filter((f) => f !== 'src/core/model-change.js')
      .map((f) => [f, count(code(f).split('\n').filter((l) => !l.startsWith('import ')).join('\n'), /\b(commit|record|announce)ModelChange\(/g)])
      .filter(([, n]) => n));
    expect(found).toEqual(ANNOUNCEMENTS);
  });

  it('only model-change.js dispatches the event', () => {
    const dispatchers = SOURCES.filter((f) => f !== 'src/core/model-change.js' && /pg:model-changed|MODEL_CHANGE_EVENT/.test(code(f)));
    expect(dispatchers).toEqual([]);
  });
});
