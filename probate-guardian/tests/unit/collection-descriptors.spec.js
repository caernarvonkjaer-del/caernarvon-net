// Milestone 73V: one description per repeating list, found by (filing type,
// list key) -- src/core/form/collections.js -- and the shared row actions
// every form uses. This spec proves three things:
//   1. the registry holds exactly the lists the nine forms have, written out
//      below by hand (not derived from the registry, so a list nobody
//      registered fails here), and a missing pair fails loudly;
//   2. each form's rows, floors and limits are what that form used before 73V
//      (behaviour-preserving);
//   3. shared-record links move with their rows, and a row's identity is never
//      saved, exported or copied.
// Milestone 73C added what the clean-up counts as an untouched guardian card on
// the Inventory and the Plans, and retired the keep-until-leave policy.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendRow, duplicateRowAt, getCollection, keepRowsAt, registeredCollections, removeRowAt, rowIdentity,
} from '../../src/core/form/collections.js';
import { SCHEDULE_SCHEMAS } from '../../src/core/form/schedule-definitions.js';
import { mk } from '../../src/core/filing/models/guardian.js';
import { normalizePlanGuardians, planEmptyRow, planGuardianBlank } from '../../src/core/filing/models/plan-rows.js';
import { SCH_B4_ACCOUNT_BLOCKS } from '../../src/core/excel/b4-register-pages.js';
import { createSimplifiedGuardian } from '../../src/features/simplified-accounting/guardian-compatibility.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const ANNUAL_LISTS = ['guardians', 'certRecipients', 'remuneration', 'schA', 'schB1', 'schB2', 'schB3', 'schB4', 'schC',
  'schD1', 'schD2', 'schD3', 'schD4', 'schD5', 'schE', 'schF1', 'schF2', 'schB4Accounts'];

// Every repeating list each form adds, duplicates, removes or cleans up rows
// of -- written out, so an unregistered list fails rather than being skipped.
const EXPECTED = {
  guardian: ['scheduleA1', 'scheduleA2', 'scheduleB1', 'scheduleB2', 'scheduleB3', 'scheduleB4', 'scheduleC1', 'scheduleC2',
    'scheduleC3', 'scheduleC4', 'scheduleC5', 'guardians', 'serviceRecipients', 'witnesses'],
  annual: ANNUAL_LISTS,
  finalAccounting: ANNUAL_LISTS,
  trustAccounting: ANNUAL_LISTS,
  simplified: ['guardians', 'certRecipients', 'remuneration'],
  planInitial: ['planGuardians', 'certRecipients', 'q9Providers', 'q11Directives'],
  planAnnual: ['planGuardians', 'certRecipients', 'q1Residences', 'q4Providers', 'q10Directives'],
  planSimplified: ['planGuardians', 'certRecipients'],
  planMinor: ['planGuardians', 'certRecipients', 'q2Residences', 'q3Providers'],
};
const expectedPairs = Object.entries(EXPECTED).flatMap(([type, lists]) => lists.map(list => `${type}/${list}`)).sort();

const json = (value) => JSON.stringify(value);

describe('73V: the registry holds exactly the lists the nine forms have', () => {
  it('every (filing type, list) pair, no more and no fewer', () => {
    expect(registeredCollections().map(([type, list]) => `${type}/${list}`).sort()).toEqual(expectedPairs);
  });

  it('a pair with no rules fails loudly, naming it -- including a filing with no type', () => {
    expect(() => getCollection('simplified', 'schA')).toThrow('No row rules for the list "schA" on filing type "simplified"');
    expect(() => getCollection(undefined, 'guardians')).toThrow('No row rules for the list "guardians" on filing type "(none)"');
    for (const action of [
      () => appendRow({ inventoryType: 'planMinor', q1Residences: [] }, 'q1Residences'),
      () => duplicateRowAt({ inventoryType: 'guardian', schA: [{}] }, 'schA', 0),
      () => removeRowAt({ guardians: [{}, {}] }, 'guardians', 1),
      () => keepRowsAt({ inventoryType: 'annual', planGuardians: [{}] }, 'planGuardians', [0]),
    ]) expect(action).toThrow(/^No row rules for the list /);
  });
});

describe("73V: each form's rows, floors and limits are what it used before", () => {
  it('the Inventory: its schedules, guardians, recipients and witnesses', () => {
    for (const [list, kind] of Object.entries({ scheduleA1: 'a1', scheduleA2: 'a2', scheduleB1: 'b1', scheduleB2: 'b2', scheduleB3: 'b3',
      scheduleB4: 'b4', scheduleC1: 'c1', scheduleC2: 'c2', scheduleC3: 'c3', scheduleC4: 'c4', scheduleC5: 'c5' })) {
      const rules = getCollection('guardian', list);
      expect(json(rules.factory())).toBe(json(mk[kind]()));
      expect([rules.floor, rules.max]).toEqual([0, Infinity]);
    }
    // D-1 shows "+ Add Co-Guardian" below three and no Remove on the first;
    // D-5 shows "+ Add Recipient" below four and Remove only above one.
    expect([getCollection('guardian', 'guardians').floor, getCollection('guardian', 'guardians').max]).toEqual([1, 3]);
    expect(json(getCollection('guardian', 'guardians').factory())).toBe(json(mk.guardian()));
    expect([getCollection('guardian', 'serviceRecipients').floor, getCollection('guardian', 'serviceRecipients').max]).toEqual([1, 4]);
    expect(json(getCollection('guardian', 'serviceRecipients').factory())).toBe(json(mk.recipient()));
    expect(json(getCollection('guardian', 'witnesses').factory())).toBe(json({ name: '', address: '', occupation: '' }));
  });

  it('the Annual, Final and Trust: exactly what SCHEDULE_SCHEMAS held, plus the B-4 accounts', () => {
    for (const type of ['annual', 'finalAccounting', 'trustAccounting']) {
      for (const list of ANNUAL_LISTS.filter(l => l !== 'schB4Accounts')) {
        const rules = getCollection(type, list);
        const schema = SCHEDULE_SCHEMAS[list];
        expect(json(rules.factory())).toBe(json(schema.factory()));
        expect([rules.floor, rules.max, rules.label]).toEqual([schema.floor, schema.max, schema.label]);
      }
      const accounts = getCollection(type, 'schB4Accounts');
      expect(accounts.max).toBe(SCH_B4_ACCOUNT_BLOCKS.length);
      const account = accounts.factory();
      expect(Object.keys(account)).toEqual(['id', 'bankName', 'accountNumber']);
      expect(account.id).not.toBe(accounts.factory().id);
    }
  });

  it("the Simplified: Part IV's own guardian row, the shared recipient and remuneration rows", () => {
    const guardians = getCollection('simplified', 'guardians');
    expect(json(guardians.factory())).toBe(json(createSimplifiedGuardian()));
    expect([guardians.floor, guardians.max]).toEqual([1, 3]);
    expect(json(getCollection('simplified', 'certRecipients').factory())).toBe(json(SCHEDULE_SCHEMAS.certRecipients.factory()));
    expect(json(getCollection('simplified', 'remuneration').factory())).toBe(json(SCHEDULE_SCHEMAS.remuneration.factory()));
  });

  it("the Plans: each Plan's guardian row and limit, and the row every '+ Add' button names", () => {
    const limits = { planInitial: 4, planAnnual: 3, planSimplified: 2, planMinor: 2 };
    for (const [type, max] of Object.entries(limits)) {
      const rules = getCollection(type, 'planGuardians');
      expect([rules.floor, rules.max]).toEqual([1, max]);
      expect(json(rules.factory())).toBe(json(planGuardianBlank(type)));
      expect([getCollection(type, 'certRecipients').floor, getCollection(type, 'certRecipients').max]).toEqual([0, Infinity]);
    }
    // Every Plan "+ Add" button's data-collection / data-row-type, read from
    // the pages themselves: the list rules must give the same row the button's
    // kind did before 73V.
    const pages = {
      'src/features/plan-annual/index.js': ['planAnnual'],
      'src/features/plan-initial/index.js': ['planInitial'],
      'src/features/plan-minor/index.js': ['planMinor'],
      'src/core/form/plan-certificate-of-service-page.js': ['planAnnual', 'planInitial', 'planMinor', 'planSimplified'],
    };
    let buttons = 0;
    for (const [file, types] of Object.entries(pages)) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      for (const match of source.matchAll(/data-form-action="add-plan-row" data-collection="(\w+)" data-row-type="(\w+)"/g)) {
        const [, list, kind] = match;
        for (const type of types) {
          expect(json(getCollection(type, list).factory()), `${type} ${list} (${kind})`).toBe(json(planEmptyRow(kind)));
          buttons++;
        }
      }
    }
    expect(buttons).toBe(11); // 3 Annual Plan + 2 Initial + 2 Minors tables, and the certificate on 4 Plans
  });

  // Milestone 73C retired keepBlankUntilLeave: a new row staying until the filer
  // leaves the page is now the rule on every list.
  it('nothing reads the inactive policies yet (73F part 3, 73K part 2, 73P)', () => {
    for (const [type, list] of registeredCollections()) {
      expect(getCollection(type, list).policies).toEqual({ confirmRemove: null, clearNoItemsOnAdd: null, focusAfterAction: null });
    }
  });
});

describe('73V: shared-record links move with their rows', () => {
  const linked = registeredCollections().filter(([type, list]) => getCollection(type, list).linkedIds);
  const named = (n) => ({ name: n, phone: '555-0100' });

  it('only the guardian lists carry links', () => {
    expect(linked.map(([type, list]) => `${type}/${list}`).sort()).toEqual([
      'annual/guardians', 'finalAccounting/guardians', 'guardian/guardians', 'planAnnual/planGuardians', 'planInitial/planGuardians',
      'planMinor/planGuardians', 'planSimplified/planGuardians', 'simplified/guardians', 'trustAccounting/guardians',
    ]);
  });

  for (const [type, list] of registeredCollections().filter(([t, l]) => getCollection(t, l).linkedIds)) {
    it(`${type}/${list}: remove, clean up, duplicate and add keep each row's link`, () => {
      const data = { inventoryType: type, [list]: [named('A'), named('B'), named('C')], guardianPartyIds: ['pA', 'pB', 'pC'] };
      expect(removeRowAt(data, list, 1)).toBe(true);
      expect(data[list].map(r => r.name)).toEqual(['A', 'C']);
      expect(data.guardianPartyIds).toEqual(['pA', 'pC']);

      data[list].push(named('D')); data.guardianPartyIds.push('pD');
      expect(keepRowsAt(data, list, [0, 2])).toBe(true);
      expect(data[list].map(r => r.name)).toEqual(['A', 'D']);
      expect(data.guardianPartyIds).toEqual(['pA', 'pD']);

      if (getCollection(type, list).max > 2) {
        const copy = duplicateRowAt(data, list, 0);
        expect(copy.name).toBe('A');
        expect(data.guardianPartyIds).toEqual(['pA', null, 'pD']);
        removeRowAt(data, list, 1);
        expect(appendRow(data, list)).not.toBeNull();
        expect(data.guardianPartyIds).toEqual(['pA', 'pD', null]);
      } else {
        // Two guardians is this Plan's limit: nothing is added, links untouched.
        expect(duplicateRowAt(data, list, 0)).toBeNull();
        expect(appendRow(data, list)).toBeNull();
        expect(data.guardianPartyIds).toEqual(['pA', 'pD']);
      }
    });
  }

  // Milestone 73C: drawing the Signatures page keeps an empty co-guardian
  // block (the clean-up on leaving the page drops it, with its link --
  // tests/unit/prune-cards.spec.js); over a Plan's limit, empty blocks go first.
  it("the Plans' guardian list keeps an empty co-guardian block when the page is drawn (73C)", () => {
    const data = { inventoryType: 'planAnnual', planGuardians: [named('A'), planGuardianBlank('planAnnual'), named('C')], guardianPartyIds: ['pA', 'pB', 'pC'] };
    normalizePlanGuardians(data);
    expect(data.planGuardians.map(r => r.name)).toEqual(['A', '', 'C']);
    expect(data.guardianPartyIds).toEqual(['pA', 'pB', 'pC']);
  });

  it("over a Plan's limit, empty co-guardian blocks go first, each with its link (73C)", () => {
    const data = { inventoryType: 'planSimplified', planGuardians: [named('A'), planGuardianBlank('planSimplified'), named('C')], guardianPartyIds: ['pA', 'pB', 'pC'] };
    normalizePlanGuardians(data);
    expect(data.planGuardians.map(r => r.name)).toEqual(['A', 'C']);
    expect(data.guardianPartyIds).toEqual(['pA', 'pC']);
  });

  it("the Plans' guardian list leaves the links alone when nothing is dropped", () => {
    const data = { inventoryType: 'planInitial', planGuardians: [named('A'), named('B')], guardianPartyIds: ['pA', 'pB', 'stale'] };
    normalizePlanGuardians(data);
    expect(data.guardianPartyIds).toEqual(['pA', 'pB', 'stale']);
  });
});

describe('73C: what the clean-up counts as an untouched guardian card', () => {
  // Milestone 74B: the one rule on all nine forms (rowStarted()) -- anything
  // entered counts, a signature choice included (73C counted it untouched).
  it("the Inventory's D-1: anything entered counts, a signature choice included; an untouched card and Unsigned do not", () => {
    const { isBlank } = getCollection('guardian', 'guardians');
    expect(isBlank(mk.guardian())).toBe(true);
    expect(isBlank({ ...mk.guardian(), signatureState: 'none' })).toBe(true);
    for (const entered of [{ signatureState: 'typed' }, { signatureState: 'stamp' }, { certifiesService: true }, { email: 'a@b.c' }, { signatureImage: 'data:image/png;base64,AA==' }, { isPreparer: true }, { name: 'Ann' }]) {
      expect(isBlank({ ...mk.guardian(), ...entered }), JSON.stringify(entered)).toBe(false);
    }
  });

  it('a Plan: anything at all, a signature choice included (as the page always counted it)', () => {
    for (const type of ['planInitial', 'planAnnual', 'planSimplified', 'planMinor']) {
      const { isBlank } = getCollection(type, 'planGuardians');
      expect(isBlank(planGuardianBlank(type)), type).toBe(true);
      expect(isBlank({ ...planGuardianBlank(type), signatureState: 'typed' }), type).toBe(false);
    }
  });

  it('every other list keeps its 73V blank test', () => {
    expect(getCollection('annual', 'guardians').isBlank({ name: '', signatureState: '' })).toBe(true);
    expect(getCollection('annual', 'guardians').isBlank({ name: '', signatureState: 'typed' })).toBe(false);
    expect(getCollection('simplified', 'guardians').isBlank({ name: '', signatureState: 'typed' })).toBe(false);
  });
});

describe('73V: a row identity lives in memory only', () => {
  it('is stable for a row, new for its duplicate, and never written onto the row', () => {
    const data = { inventoryType: 'annual', schA: [{ payer: 'SSA', description: '', bank: '', accountNo: '', amount: '10' }] };
    const before = json(data);
    const original = data.schA[0];
    const identity = rowIdentity(original);
    expect(identity).toEqual(expect.any(Number));
    expect(rowIdentity(original)).toBe(identity);
    expect(json(data)).toBe(before); // nothing saved or exported carries it
    const copy = duplicateRowAt(data, 'schA', 0);
    expect(rowIdentity(copy)).not.toBe(identity);
    expect(Object.keys(copy)).toEqual(Object.keys(original));
    expect(rowIdentity(null)).toBeNull();
  });
});
