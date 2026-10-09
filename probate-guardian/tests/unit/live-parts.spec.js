// Milestone 73J part 2: page parts that keep up with a change.
//
// A live part declares the filing paths it depends on and how it draws
// itself; every announced change (73J part 1's pg:model-changed) redraws the
// parts it touches, and no others. A part holding the cursor waits until the
// cursor leaves it. The browser cases -- one per stale part the design lists
// -- are tests/e2e/live-page-parts.spec.ts.
//
// Red-first: live-parts.js doesn't exist; the dashboard's Automatic option
// showed the override.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { changeTouches, defineLivePart, livePartHtml, refreshLiveParts } from '../../src/core/ui/live-parts.js';
import { replaceCaseFile } from '../../src/core/state.js';
import { attorneyEntryPaths, ATTORNEY_ENTRY } from '../../src/core/validation/attorney-block.js';
import { projectDashboardWard } from '../../src/features/dashboard/view-model.js';

describe('which changes reach a part', () => {
  test('the same path, one beneath it, one above it, or the whole filing; nothing else', () => {
    expect(changeTouches(['schB4'], ['schB4.2.amount'])).toBe(true);
    expect(changeTouches(['schB4.2.bankAccountId'], ['schB4'])).toBe(true);
    expect(changeTouches(['attorney'], ['attorney'])).toBe(true);
    expect(changeTouches(['attorney'], ['*'])).toBe(true);
    expect(changeTouches(['attorney'], ['attorney_bar']), 'a sibling with a common prefix is another field').toBe(false);
    expect(changeTouches(['schB4'], ['schB4Accounts.0.bankName'])).toBe(false);
  });

  test("an attorney part depends on every field that makes an attorney \"started\", per form", () => {
    for (const engine of Object.keys(ATTORNEY_ENTRY)) {
      const paths = attorneyEntryPaths(engine);
      for (const f of ATTORNEY_ENTRY[engine].fields) expect(paths, `${engine} ${f}`).toContain(f);
      for (const f of ATTORNEY_ENTRY[engine].signature) expect(paths, `${engine} ${f}`).toContain(f);
    }
    expect(attorneyEntryPaths('nope')).toEqual([]);
  });
});

describe('the redraw', () => {
  // A minimal stand-in for the page: elements carrying data-live-part.
  const element = (name, key = '') => {
    const listeners = {};
    return {
      dataset: { livePart: name, ...(key !== '' ? { liveKey: key } : {}) },
      innerHTML: 'old',
      isConnected: true,
      contains: (node) => node === element.focusedInside,
      addEventListener: (type, fn) => { listeners[type] = fn; },
      removeEventListener: (type) => { delete listeners[type]; },
      fire: (type, event) => listeners[type]?.(event),
    };
  };
  let filing;
  beforeEach(() => {
    vi.stubGlobal('document', { activeElement: null });
    filing = { inventoryType: 'annual', wardId: 'w1', total: 1 };
    replaceCaseFile({ wards: [filing], parties: [], cases: [], activeWardId: 'w1' });
    defineLivePart('test-total', { paths: ['total'], render: (d, key) => `total ${d.total}${key ? ` #${key}` : ''}` });
  });
  afterEach(() => vi.unstubAllGlobals());

  test('livePartHtml draws the part inside its marker, with its key and class', () => {
    expect(livePartHtml('test-total', { key: 2, className: 'col-md-4' }))
      .toBe('<div class="col-md-4" data-live-part="test-total" data-live-key="2">total 1 #2</div>');
    expect(() => livePartHtml('no-such-part')).toThrow('No live part named "no-such-part"');
  });

  test('a change it depends on redraws it; any other change leaves it', () => {
    const el = element('test-total');
    const root = { querySelectorAll: () => [el] };
    filing.total = 5;
    expect(refreshLiveParts({ paths: ['other'] }, root)).toBe(0);
    expect(el.innerHTML).toBe('old');
    expect(refreshLiveParts({ paths: ['total'] }, root)).toBe(1);
    expect(el.innerHTML).toBe('total 5');
  });

  test('a part holding the cursor waits, and is redrawn when the cursor leaves it', async () => {
    const el = element('test-total');
    const inside = { id: 'box' };
    element.focusedInside = inside;
    globalThis.document.activeElement = inside;
    const root = { querySelectorAll: () => [el] };
    filing.total = 7;
    expect(refreshLiveParts({ paths: ['total'] }, root)).toBe(0);
    expect(el.innerHTML, 'not redrawn under the filer').toBe('old');
    expect(el.dataset.liveStale).toBe('1');
    el.fire('focusout', { relatedTarget: null });
    await new Promise((r) => setTimeout(r, 5));
    expect(el.innerHTML).toBe('total 7');
    expect(el.dataset.liveStale).toBeUndefined();
    element.focusedInside = null;
  });
});

describe("the dashboard's Automatic option", () => {
  test('says what Automatic would give, even while an override is chosen', () => {
    const ward = { wardId: 'w', inventoryType: 'annual', dashboardWorkflow: { status: 'pending-court-review' } };
    const row = projectDashboardWard(ward, { progress: { pct: 40 } });
    expect(row.workflowStatus).toBe('pending-court-review');
    expect(row.automaticStatus, 'it showed the override').toBe('draft');
    expect(projectDashboardWard({ ...ward, dashboardWorkflow: {} }, { progress: { pct: 100 } }).automaticStatus).toBe('ready-to-file');
    expect(projectDashboardWard({ ...ward, archived: true }, { progress: { pct: 100 } }).automaticStatus).toBe('closed');
  });
});
