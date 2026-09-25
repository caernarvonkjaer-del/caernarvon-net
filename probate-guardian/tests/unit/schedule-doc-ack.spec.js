import { describe, it, expect } from 'vitest';
import {
  FINANCIAL_SCHEDULE_COLLECTIONS,
  scheduleAckFamily,
  scheduleKeyForRoute,
  isFinancialSchedule,
  isSchedulePopulated,
  isScheduleAcknowledged,
  recordScheduleAck,
  needsScheduleAck,
  normalizeScheduleDocsAck,
  scheduleAckPeriod,
} from '../../src/core/filing/schedule-doc-ack.js';
import { FILING_ENGINE_IDS } from '../../src/core/filing/filing-descriptor.js';
import { readRepoSource, sliceBalancedFunction, LEGACY_APP } from './support/legacy-source-extract.js';

// Milestone 57C-R. The state model behind the supplemental-documentation
// acknowledgement: which schedules carry the obligation, whether one is
// populated, and whether the filer has confirmed it for the period being
// reported.
//
// The most important assertions in this file are the two NEGATIVE ones at the
// bottom. Milestone 57's first attempt wired the same condition into
// validateGuardian()/validateAnnual() and computeNavChecks(), which made no
// filing ever "clean" and cost 46 e2e failures across 16 specs. This module
// must never do that, and a source scan is what keeps it honest -- a
// behavioral test would pass right up until someone added the import.

const guardianData = (over = {}) => ({ inventoryType: 'guardian', scheduleA1: [], scheduleB1: [], ...over });
const annualData = (over = {}) => ({ inventoryType: 'annual', schA: [], schB1: [], ...over });

describe('scheduleAckFamily() derives the family from the descriptor registry', () => {
  it('maps the three accounting engines that share one implementation', () => {
    expect(scheduleAckFamily('annual')).toBe('annual');
    expect(scheduleAckFamily('finalAccounting')).toBe('annual');
    expect(scheduleAckFamily('trustAccounting')).toBe('annual');
  });

  it('maps Guardian Inventory to its own family', () => {
    expect(scheduleAckFamily('guardian')).toBe('guardian');
  });

  it.each(['planSimplified', 'planAnnual', 'planInitial', 'planMinor'])(
    'returns no family for the narrative Plan type %s',
    (type) => expect(scheduleAckFamily(type)).toBe(''),
  );

  // Not an oversight: Simplified Annual Accounting ships no Supporting
  // Documents sections, so there is nowhere to attach what this refers to.
  it('returns no family for Simplified Annual Accounting', () => {
    expect(scheduleAckFamily('simplified')).toBe('');
  });

  it('returns no family for an unknown or blank filing type', () => {
    expect(scheduleAckFamily('not-a-filing-type')).toBe('');
    expect(scheduleAckFamily('')).toBe('');
    expect(scheduleAckFamily(undefined)).toBe('');
  });

  // The guard against the drift filing-type-enumeration-guard.spec.js exists
  // for: every family key here must be a real engineId, so a typo or a
  // renamed engine fails here rather than silently disabling the feature for
  // a whole filing family.
  it('every family key is a real engineId from the descriptor registry', () => {
    for (const family of Object.keys(FINANCIAL_SCHEDULE_COLLECTIONS)) {
      expect(FILING_ENGINE_IDS, `${family} is not a known engineId`).toContain(family);
    }
  });
});

describe('the schedule inventory', () => {
  it('covers 11 Guardian and 14 Annual schedules', () => {
    expect(Object.keys(FINANCIAL_SCHEDULE_COLLECTIONS.guardian)).toHaveLength(11);
    expect(Object.keys(FINANCIAL_SCHEDULE_COLLECTIONS.annual)).toHaveLength(14);
  });

  it('resolves a route to its schedule key, case-insensitively', () => {
    expect(scheduleKeyForRoute('guardian', '/a1')).toBe('a1');
    expect(scheduleKeyForRoute('annual', '/scha')).toBe('schA');
    expect(scheduleKeyForRoute('trustAccounting', '/schf2')).toBe('schF2');
  });

  it('resolves nothing for a non-schedule route or the wrong family', () => {
    expect(scheduleKeyForRoute('guardian', '/summary')).toBe('');
    expect(scheduleKeyForRoute('guardian', '/print')).toBe('');
    // '/scha' is an Annual route; a Guardian filing has no such schedule.
    expect(scheduleKeyForRoute('guardian', '/scha')).toBe('');
    expect(scheduleKeyForRoute('planAnnual', '/a1')).toBe('');
  });

  it('isFinancialSchedule() agrees with the inventory', () => {
    expect(isFinancialSchedule('guardian', 'c5')).toBe(true);
    expect(isFinancialSchedule('annual', 'schD3')).toBe(true);
    expect(isFinancialSchedule('annual', 'a1')).toBe(false);
    expect(isFinancialSchedule('planMinor', 'schA')).toBe(false);
  });
});

describe('populated detection', () => {
  it('an empty schedule is not populated', () => {
    expect(isSchedulePopulated(guardianData(), 'guardian', 'a1')).toBe(false);
  });

  it('one row makes it populated', () => {
    expect(isSchedulePopulated(guardianData({ scheduleA1: [{ desc: 'x' }] }), 'guardian', 'a1')).toBe(true);
    expect(isSchedulePopulated(annualData({ schA: [{ payer: 'x' }] }), 'annual', 'schA')).toBe(true);
  });

  it('a missing or non-array collection is not populated rather than a crash', () => {
    expect(isSchedulePopulated({}, 'guardian', 'a1')).toBe(false);
    expect(isSchedulePopulated({ scheduleA1: 'nope' }, 'guardian', 'a1')).toBe(false);
    expect(isSchedulePopulated(null, 'guardian', 'a1')).toBe(false);
  });
});

describe('acknowledgement is recorded per period', () => {
  it('is false before anything is recorded', () => {
    expect(isScheduleAcknowledged(guardianData(), 'guardian', 'a1')).toBe(false);
  });

  it('records and reads back for the active period', () => {
    const d = guardianData({ activeYearKey: '2026' });
    expect(recordScheduleAck(d, 'guardian', 'a1')).toBe(true);
    expect(isScheduleAcknowledged(d, 'guardian', 'a1')).toBe(true);
    expect(d.scheduleDocsAck).toEqual({ 2026: { a1: true } });
  });

  it('does not leak to a sibling schedule', () => {
    const d = guardianData({ activeYearKey: '2026' });
    recordScheduleAck(d, 'guardian', 'a1');
    expect(isScheduleAcknowledged(d, 'guardian', 'b1')).toBe(false);
  });

  // The assertion that proves the period key is live rather than decorative:
  // rolling the filing into a new period must bring the question back.
  it('does NOT carry over when the reporting period changes', () => {
    const d = guardianData({ activeYearKey: '2026' });
    recordScheduleAck(d, 'guardian', 'a1');
    expect(isScheduleAcknowledged(d, 'guardian', 'a1')).toBe(true);
    d.activeYearKey = '2027';
    expect(isScheduleAcknowledged(d, 'guardian', 'a1')).toBe(false);
  });

  it('uses the same period key scheduleDocs uses', () => {
    expect(scheduleAckPeriod({ activeYearKey: '2026' })).toBe('2026');
    expect(scheduleAckPeriod({ periodFrom: '2026-01-01', periodTo: '2026-12-31' })).toBe('2026-01-01__2026-12-31');
    expect(scheduleAckPeriod({})).toBe('initial');
  });

  it('refuses to record against a schedule that is not in scope', () => {
    const d = { inventoryType: 'planAnnual' };
    expect(recordScheduleAck(d, 'planAnnual', 'schA')).toBe(false);
    expect(d.scheduleDocsAck).toBeUndefined();
  });
});

describe('needsScheduleAck() -- the single question the mount hook asks', () => {
  it('is false for an empty schedule, so a fresh filing shows no dialogs', () => {
    expect(needsScheduleAck(guardianData(), 'guardian', '/a1')).toBe(false);
  });

  it('is true for a populated, unacknowledged schedule', () => {
    expect(needsScheduleAck(guardianData({ scheduleA1: [{ desc: 'x' }] }), 'guardian', '/a1')).toBe(true);
  });

  it('is false once acknowledged, and true again in a new period', () => {
    const d = guardianData({ scheduleA1: [{ desc: 'x' }], activeYearKey: '2026' });
    recordScheduleAck(d, 'guardian', 'a1');
    expect(needsScheduleAck(d, 'guardian', '/a1')).toBe(false);
    d.activeYearKey = '2027';
    expect(needsScheduleAck(d, 'guardian', '/a1')).toBe(true);
  });

  it('is false on a non-schedule route and on a Plan filing', () => {
    expect(needsScheduleAck(guardianData({ scheduleA1: [{ desc: 'x' }] }), 'guardian', '/summary')).toBe(false);
    expect(needsScheduleAck({ inventoryType: 'planAnnual', schA: [{ payer: 'x' }] }, 'planAnnual', '/a1')).toBe(false);
  });

  // Rows can arrive without a filer ever clicking Add -- an Excel import, or
  // New Filing from Existing. Detection is on the DATA, not on the action,
  // which is why the hook lives in mount() rather than on the Add button.
  it('is true for rows that arrived without passing through an Add button', () => {
    const imported = annualData({ schB1: [{ payee: 'from a workbook' }] });
    expect(needsScheduleAck(imported, 'annual', '/schb1')).toBe(true);
  });
});

describe('legacy .sav normalization', () => {
  it('gives a case file with no acknowledgement an empty object', () => {
    const d = guardianData();
    normalizeScheduleDocsAck(d);
    expect(d.scheduleDocsAck).toEqual({});
  });

  it('replaces a non-object, so an old or corrupt shape cannot read as acknowledged', () => {
    for (const bad of ['yes', 7, [], null]) {
      const d = guardianData({ scheduleDocsAck: bad });
      normalizeScheduleDocsAck(d);
      expect(d.scheduleDocsAck).toEqual({});
    }
  });

  it('keeps well-formed periods and drops malformed ones', () => {
    const d = guardianData({ scheduleDocsAck: { 2026: { a1: true }, 2027: 'nope' } });
    normalizeScheduleDocsAck(d);
    expect(d.scheduleDocsAck).toEqual({ 2026: { a1: true } });
  });

  it('does not throw on a null or non-object ward', () => {
    expect(() => normalizeScheduleDocsAck(null)).not.toThrow();
    expect(() => normalizeScheduleDocsAck('ward')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// The two assertions this sub-delivery exists to keep true.
//
// 57C-R is an advisory prompt. It must not decide whether a filing can be
// exported and must not change what the sidebar reports. Doing either is what
// took Milestone 57's first attempt from a feature to 46 e2e failures.
// These must be BODY-scoped, not file-scoped. Both feature files legitimately
// import this module for their mount() hook, so "the file does not import it"
// is not the assertion -- "the validator does not call it" is. An earlier
// draft sliced from the first `export function validate` to the end of file,
// which was wrong in both directions: it missed anything above that point and
// swept in everything below it. sliceBalancedFunction() is the repo's existing
// tool for exactly this and is brace-accurate.
const ACK_REFERENCE = /scheduleDocsAck|needsScheduleAck|isScheduleAcknowledged|recordScheduleAck|isSchedulePopulated/;

describe('57C-R never becomes an export or navigation gate', () => {
  it.each([
    ['src/features/guardian-inventory/index.js', 'export function validateGuardian'],
    ['src/features/annual-accounting/index.js', 'export function validateAnnual'],
  ])('%s: its validator never calls the acknowledgement', (file, header) => {
    const source = readRepoSource(file);
    const body = sliceBalancedFunction(source, header);
    expect(body, `${header} not found in ${file} -- this guard needs re-pointing`).toBeTruthy();
    expect(
      ACK_REFERENCE.test(body),
      `${header} references the acknowledgement -- 57C-R must never gate export`,
    ).toBe(false);
  });

  it('the sidebar\'s completion evaluators never call the acknowledgement', () => {
    // Milestone 70, 70D: the section marks are src/core/status/completion.js
    // (legacy-app.js's computeNavChecks() only dispatches to it now), so the
    // guard reads the whole module rather than one function of the monolith.
    const body = readRepoSource('src/core/status/completion.js');
    expect(body, 'src/core/status/completion.js not found -- this guard needs re-pointing').toBeTruthy();
    expect(
      ACK_REFERENCE.test(body),
      'the completion evaluators reference the acknowledgement -- the sidebar must not report it',
    ).toBe(false);
  });
});
