// Milestone 73K part 2: the page stays where the filer was.
//
// keep-place.js reads what part 1 made every draw say (draw-reason.js): a
// change made on the page, or work that finished on its own, keeps the scroll
// position and puts the cursor back on the field or row named -- a new entry
// (Add, Duplicate) brought into view; arriving at a page, a switch and Preview
// start at the top. The browser cases are tests/e2e/redraw-keeps-scroll.spec.ts.
//
// Red-first: keep-place.js doesn't exist; afterAdd() and afterDuplicate()
// didn't mark the new entry to bring into view.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  addButtonOf, boxForPath, elementForTarget, firstBoxOfRow, isTypingIn, keepsPlace, rememberPlace, settlePlace,
} from '../../src/core/navigation/keep-place.js';
import { DRAW, afterAdd, afterDuplicate, afterRemove, fieldTarget, onChange } from '../../src/core/navigation/draw-reason.js';
import { rowIdentity } from '../../src/core/form/collections.js';

// A minimal stand-in for the page: boxes with the attributes the forms use.
const doc = { activeElement: null, body: { tagName: 'BODY' }, documentElement: { tagName: 'HTML' } };
let entry;
function box(tagName, attrs = {}, extra = {}) {
  const el = {
    tagName,
    type: extra.type ?? (tagName === 'INPUT' ? 'text' : ''),
    disabled: false,
    checked: false,
    value: '',
    dataset: {},
    ...extra,
    getAttribute: (name) => attrs[name] ?? null,
    getClientRects: () => (extra.hidden ? [] : [{}]),
    focus: vi.fn(() => { doc.activeElement = el; }),
    closest: () => entry,
  };
  return el;
}
function page(controls) {
  return {
    scrollTop: 0,
    controls,
    contains: (el) => controls.includes(el),
    querySelectorAll: () => controls,
    focus: vi.fn(),
  };
}
beforeEach(() => {
  vi.stubGlobal('document', doc);
  doc.activeElement = doc.body;
  entry = { scrollIntoView: vi.fn() };
});
afterEach(() => vi.unstubAllGlobals());

describe('which draws keep the place', () => {
  test('a change made on the page and work that finished on its own keep it; arriving, a switch and Preview start at the top', () => {
    expect(keepsPlace(DRAW.CHANGE)).toBe(true);
    expect(keepsPlace(DRAW.BACKGROUND)).toBe(true);
    for (const reason of [DRAW.NAVIGATION, DRAW.SWITCH, DRAW.PREVIEW, undefined]) expect(keepsPlace(reason)).toBe(false);
  });

  test('arriving at a page: the top, and the cursor is left alone', () => {
    const name = box('INPUT', { 'data-annual-path': 'wardName' });
    const main = page([name]);
    main.scrollTop = 900;
    const place = rememberPlace(main);
    settlePlace(main, place, { reason: DRAW.NAVIGATION });
    expect(main.scrollTop).toBe(0);
    expect(name.focus).not.toHaveBeenCalled();
  });

  test('a box the filer types in holds a background redraw back; a tick box or a button does not', () => {
    expect(isTypingIn(box('INPUT'))).toBe(true);
    expect(isTypingIn(box('INPUT', {}, { type: 'date' }))).toBe(true);
    expect(isTypingIn(box('TEXTAREA'))).toBe(true);
    expect(isTypingIn(box('SELECT'))).toBe(true);
    expect(isTypingIn(box('INPUT', {}, { type: 'checkbox' }))).toBe(false);
    expect(isTypingIn(box('INPUT', {}, { type: 'radio' }))).toBe(false);
    expect(isTypingIn(box('BUTTON'))).toBe(false);
    expect(isTypingIn(null)).toBe(false);
  });
});

describe('a change made on the page', () => {
  test('a Yes/No answer: the scroll position is kept and the cursor is on the answer given', () => {
    const yes = box('INPUT', { 'data-form-path': 'q2NoMove' }, { type: 'radio', value: 'Yes' });
    const no = box('INPUT', { 'data-form-path': 'q2NoMove' }, { type: 'radio', value: 'No' });
    const before = page([yes, no]);
    before.scrollTop = 1240;
    doc.activeElement = no;
    const place = rememberPlace(before);
    expect(place).toMatchObject({ scrollTop: 1240, path: 'q2NoMove', value: 'No', inside: true });

    const yes2 = box('INPUT', { 'data-form-path': 'q2NoMove' }, { type: 'radio', value: 'Yes' });
    const no2 = box('INPUT', { 'data-form-path': 'q2NoMove' }, { type: 'radio', value: 'No', checked: true });
    const after = page([box('INPUT', { 'data-form-path': 'q2Reason' }), yes2, no2]);
    const focused = settlePlace(after, place, { ...onChange(fieldTarget('q2NoMove')), data: {} });
    expect(after.scrollTop, 'not thrown back to the top').toBe(1240);
    expect(focused).toBe(no2);
    expect(no2.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(entry.scrollIntoView, 'a field answered is already in view').not.toHaveBeenCalled();
  });

  test('Add and Duplicate: the new entry is brought into view and its first box takes the cursor', () => {
    const rows = [{ name: 'a' }, { name: 'b' }];
    const data = { q1Residences: rows };
    const main = page([
      box('INPUT', { 'data-form-path': 'q1Residences.0.name' }),
      box('BUTTON', {}, { dataset: { formAction: 'remove-plan-row', collection: 'q1Residences', index: '0' } }),
      box('INPUT', { 'data-form-path': 'q1Residences.1.name' }),
    ]);
    doc.activeElement = doc.body;
    const place = { ...rememberPlace(main), scrollTop: 300 };
    const added = afterAdd(data, 'q1Residences');
    expect(added.reveal).toBe(true);
    const focused = settlePlace(main, place, { ...onChange(added), data });
    expect(focused).toBe(main.controls[2]);
    expect(entry.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    expect(main.scrollTop).toBe(300);
    expect(afterDuplicate(data, 'q1Residences', 0)).toMatchObject({ row: rowIdentity(rows[1]), reveal: true });
  });

  test('Remove: the row that took its place takes the cursor, and the page is not moved to show it', () => {
    const kept = { name: 'kept' };
    const data = { schA: [{ name: 'first' }, kept] };
    const target = afterRemove(data, 'schA', 1);
    expect(target.reveal).toBeUndefined();
    const main = page([box('INPUT', { 'data-annual-path': 'schA.0.name' }), box('INPUT', { 'data-annual-path': 'schA.1.name' })]);
    const focused = settlePlace(main, { scrollTop: 50, mayFocus: true, inside: true, path: '', value: '' }, { ...onChange(target), data });
    expect(focused).toBe(main.controls[1]);
    expect(entry.scrollIntoView).not.toHaveBeenCalled();
  });

  test("a row's first box is one the filer types in, ahead of a button carrying the row's path (the Plans' residence rows)", () => {
    const pick = box('BUTTON', { 'data-field-path': 'q1Residences.0.name' });
    const name = box('INPUT', { 'data-form-path': 'q1Residences.0.name' });
    expect(firstBoxOfRow(page([pick, name]), 'q1Residences', 0)).toBe(name);
    expect(firstBoxOfRow(page([pick]), 'q1Residences', 0), 'a button when it is all the row has').toBe(pick);
  });

  test("a row known only by its buttons, and a list with no row left: the row's button, else the list's Add", () => {
    const row = {};
    const data = { scheduleA1: [row] };
    const remove = box('BUTTON', {}, { dataset: { inventoryAction: 'remove-entry', list: 'scheduleA1', index: '0' } });
    const add = box('BUTTON', {}, { dataset: { annualAction: 'add-row', collection: 'schB1' } });
    expect(firstBoxOfRow(page([remove]), 'scheduleA1', 0)).toBe(remove);
    expect(addButtonOf(page([remove, add]), 'schB1')).toBe(add);
    expect(elementForTarget(page([add]), afterRemove({ schB1: [] }, 'schB1', 0), { schB1: [] })).toBe(add);
    expect(elementForTarget(page([remove]), { list: 'scheduleA1', row: rowIdentity(row) }, data)).toBe(remove);
  });

  test('no target named: the box that held the cursor, found again by its path; a hidden or disabled box is passed over', () => {
    const hidden = box('INPUT', { 'data-bind': 'attorney.name' }, { hidden: true });
    const shown = box('INPUT', { 'data-bind': 'attorney.name' });
    expect(boxForPath(page([hidden, shown]), 'attorney.name')).toBe(shown);
    const disabled = box('INPUT', { 'data-bind': 'x' }, { disabled: true });
    expect(boxForPath(page([disabled]), 'x')).toBe(null);
    const focused = settlePlace(page([shown]), { scrollTop: 0, mayFocus: true, inside: true, path: 'attorney.name', value: '' }, { ...onChange(), data: {} });
    expect(focused).toBe(shown);
  });

  test("nothing matches: a cursor that was on the page goes to the page, not the document's top; one in the sidebar stays there", () => {
    const main = page([box('INPUT', { 'data-form-path': 'other' })]);
    settlePlace(main, { scrollTop: 10, mayFocus: true, inside: true, path: 'gone', value: '' }, { ...onChange(), data: {} });
    expect(main.focus).toHaveBeenCalledWith({ preventScroll: true });

    const sidebarBox = box('SELECT');
    doc.activeElement = sidebarBox;
    const place = rememberPlace(main);
    expect(place.mayFocus).toBe(false);
    const field = box('INPUT', { 'data-form-path': 'x' });
    expect(settlePlace(page([field]), place, { ...onChange(fieldTarget('x')), data: {} })).toBe(null);
    expect(field.focus, 'the filer working in the sidebar keeps the cursor').not.toHaveBeenCalled();
  });
});
