// The accountings' Summary badges (the requester's choice, 2026-10-18, after
// the code review of 74J-2): whether a schedule has been started -- "In
// progress" against "Not started" on the Summary page (summary-renderer.js's
// navStatus()) -- is decided by each list's own blank test, the one the export
// checks use (collections.js). It had its own test: any value counted, so a
// Schedule D row an older version saved with its old default "No"
// (blank-rows.js's FORMER_DEFAULTS) read "In progress" while the export checks
// treated it as blank and the sidebar asked for an entry, and Schedules C and E
// counted a row "+ Add" added and never touched. The sidebar marks, the export
// and the filed documents never read this.
import { describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {}, getCurrentPage: () => '/' }));
globalThis.window = globalThis.window || globalThis;

const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { getCollection } = await import('../../src/core/form/collections.js');
const { sectionMarks } = await import('../../src/core/status/section-marks.js');
const { navStatus } = await import('../../src/core/summary-renderer.js');

const json = (x) => JSON.parse(JSON.stringify(x));
const blankRow = (type, list, extra = {}) => ({ ...getCollection(type, list).factory(), ...extra });
const badge = (type, extra, key) => navStatus(sectionMarks({ ...json(initializeEmptyData(type)), inventoryType: type, ...json(extra) }), key);

describe("the accountings' Summary: a schedule is started by its list's own blank test", () => {
  for (const type of ['annual', 'finalAccounting', 'trustAccounting']) {
    test(`${type}: an old default "No", or a row added and never touched, is not a start; a typed row is`, () => {
      expect(badge(type, { schD1: [blankRow(type, 'schD1', { restricted: 'No' })] }, 'a-schd1'), 'D-1, old default').toBe('not-started');
      expect(badge(type, { schD2: [blankRow(type, 'schD2', { residence: 'No', income: 'No' })] }, 'a-schd2'), 'D-2, old defaults').toBe('not-started');
      expect(badge(type, { schC: [blankRow(type, 'schC')] }, 'a-schc'), 'C, untouched').toBe('not-started');
      expect(badge(type, { schE: [blankRow(type, 'schE')] }, 'a-sche'), 'E, untouched').toBe('not-started');
      expect(badge(type, { schD1: [blankRow(type, 'schD1', { description: 'Checking account' })] }, 'a-schd1'), 'D-1, typed').toBe('in-progress');
      expect(badge(type, { schC: [blankRow(type, 'schC', { description: 'Stock sale' })] }, 'a-schc'), 'C, typed').toBe('in-progress');
    });
  }
});
