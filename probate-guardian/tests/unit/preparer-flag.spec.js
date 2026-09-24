import { describe, expect, test } from 'vitest';
import {
  resolvePreparer, hasIdentifiedPreparer, claimPreparer, preparedByLine,
  preparerFlagPath, preparerFlagCheckboxHTML, preparerWaivedNoticeHTML,
} from '../../src/core/form/preparer-flag.js';

// Milestone 67A. A guardian who prepares their own Initial Inventory or
// Annual Accounting -- told by the form itself "DO NOT SIGN HERE" -- could not
// export, because the app required the outside preparer's six fields and a
// signature regardless. The Clerk accepts a filing with no outside preparer
// if the guardian identifies themself as the preparer, so the flag lives on
// the guardian (or attorney) row and names the person.
//
// Two shapes, deliberately: the Initial Inventory keeps its attorney as an
// object (attorney.isPreparer) and the Annual family keeps flat attorney_*
// keys (attorney_isPreparer). Every function below is exercised on both.

const inventory = (extra = {}) => ({
  guardians: [{ name: 'Rachel Alvarez' }, { name: 'Tomas Alvarez' }],
  attorney: { name: 'Daniel Okafor' },
  preparer: { name: '' },
  ...extra,
});

const annual = (extra = {}) => ({
  guardians: [{ name: 'Rachel Alvarez' }, { name: 'Tomas Alvarez' }],
  attorney: 'Daniel Okafor',
  attorney_bar: '123456',
  preparer: { name: '' },
  ...extra,
});

describe('resolvePreparer', () => {
  test('nobody flagged: null, on both shapes and on an empty filing', () => {
    expect(resolvePreparer(inventory())).toBeNull();
    expect(resolvePreparer(annual())).toBeNull();
    expect(resolvePreparer({})).toBeNull();
    expect(resolvePreparer(null)).toBeNull();
    expect(hasIdentifiedPreparer(annual())).toBe(false);
  });

  test('a flagged guardian is named by role and position, with the name read live from the row', () => {
    const d = inventory();
    d.guardians[1].isPreparer = true;
    expect(resolvePreparer(d)).toEqual({ role: 'guardian', index: 1, name: 'Tomas Alvarez' });
    d.guardians[1].name = 'Tomas A. Alvarez';
    expect(resolvePreparer(d).name).toBe('Tomas A. Alvarez');
  });

  test('a flagged attorney is named, on both shapes', () => {
    const inv = inventory(); inv.attorney.isPreparer = true;
    expect(resolvePreparer(inv)).toEqual({ role: 'attorney', index: 0, name: 'Daniel Okafor' });
    const ann = annual({ attorney_isPreparer: true });
    expect(resolvePreparer(ann)).toEqual({ role: 'attorney', index: 0, name: 'Daniel Okafor' });
  });

  test('preparerFlagPath follows the shape', () => {
    expect(preparerFlagPath(inventory(), 'guardian', 1)).toBe('guardians.1.isPreparer');
    expect(preparerFlagPath(inventory(), 'attorney')).toBe('attorney.isPreparer');
    expect(preparerFlagPath(annual(), 'attorney')).toBe('attorney_isPreparer');
  });
});

describe('claimPreparer -- only one party may be the preparer', () => {
  test('ticking a second guardian clears the first', () => {
    const d = annual();
    d.guardians[0].isPreparer = true;
    d.guardians[1].isPreparer = true; // the box just written
    claimPreparer(d, 'guardians.1.isPreparer');
    expect(d.guardians.map((g) => !!g.isPreparer)).toEqual([false, true]);
  });

  test('ticking the attorney clears every guardian, on both shapes', () => {
    const inv = inventory();
    inv.guardians[0].isPreparer = true;
    inv.attorney.isPreparer = true;
    claimPreparer(inv, 'attorney.isPreparer');
    expect(inv.guardians[0].isPreparer).toBe(false);
    expect(inv.attorney.isPreparer).toBe(true);

    const ann = annual({ attorney_isPreparer: true });
    ann.guardians[1].isPreparer = true;
    claimPreparer(ann, 'attorney_isPreparer');
    expect(ann.guardians[1].isPreparer).toBe(false);
    expect(ann.attorney_isPreparer).toBe(true);
  });

  test('ticking a guardian clears the attorney, on both shapes, without inventing the other shape\'s key', () => {
    const inv = inventory();
    inv.attorney.isPreparer = true;
    inv.guardians[0].isPreparer = true;
    claimPreparer(inv, 'guardians.0.isPreparer');
    expect(inv.attorney.isPreparer).toBe(false);
    expect('attorney_isPreparer' in inv).toBe(false);

    const ann = annual({ attorney_isPreparer: true });
    ann.guardians[0].isPreparer = true;
    claimPreparer(ann, 'guardians.0.isPreparer');
    expect(ann.attorney_isPreparer).toBe(false);
    expect(typeof ann.attorney).toBe('string');
  });

  test('a filing with no flags is left untouched', () => {
    const d = annual();
    claimPreparer(d, 'guardians.0.isPreparer');
    expect(d).toEqual(annual());
    claimPreparer(null, 'guardians.0.isPreparer');
  });
});

// The reason the flag lives on the row rather than as an index pointer.
describe('deleting guardians -- the flag travels with its row', () => {
  test('deleting a guardian BEFORE the preparer keeps the right person named', () => {
    const d = annual();
    d.guardians[1].isPreparer = true;
    d.guardians.splice(0, 1);
    expect(resolvePreparer(d)).toEqual({ role: 'guardian', index: 0, name: 'Tomas Alvarez' });
  });

  test('deleting the preparer returns the filing to "no preparer identified"', () => {
    const d = annual();
    d.guardians[1].isPreparer = true;
    d.guardians.splice(1, 1);
    expect(resolvePreparer(d)).toBeNull();
  });

  test('deleting any other guardian leaves the flag where it is', () => {
    const d = inventory({ guardians: [{ name: 'A' }, { name: 'B', isPreparer: true }, { name: 'C' }] });
    d.guardians.splice(2, 1);
    expect(resolvePreparer(d)).toEqual({ role: 'guardian', index: 1, name: 'B' });
  });
});

describe('what the filing says', () => {
  test('preparedByLine names the person and their role, and is empty with an outside preparer', () => {
    expect(preparedByLine(annual())).toBe('');
    const g = annual(); g.guardians[0].isPreparer = true;
    expect(preparedByLine(g)).toBe('Prepared by Rachel Alvarez, guardian. No outside preparer.');
    const a = inventory(); a.attorney.isPreparer = true;
    expect(preparedByLine(a)).toBe("Prepared by Daniel Okafor, guardian's attorney. No outside preparer.");
  });

  test('a flagged row with no name yet prints a placeholder rather than "Prepared by , guardian"', () => {
    const d = annual({ guardians: [{ name: '', isPreparer: true }] });
    expect(preparedByLine(d)).toBe('Prepared by [name], guardian. No outside preparer.');
  });

  test('the checkbox carries its path, the change hook and the route, and escapes what it prints', () => {
    const html = preparerFlagCheckboxHTML({ path: 'guardians.1.isPreparer', checked: true, route: '/d1' });
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('data-form-path="guardians.1.isPreparer"');
    expect(html).toContain('data-form-value="boolean"');
    expect(html).toContain('data-form-change="preparer-flag"');
    expect(html).toContain('data-form-route="/d1"');
    expect(html).toContain(' checked ');
    expect(html).toContain('id="preparer_flag_guardians_1_isPreparer"');
    expect(preparerFlagCheckboxHTML({ path: 'attorney.isPreparer', route: '/d2' })).not.toContain(' checked ');
  });

  test('the notice names who is identified and where the box lives, and is empty otherwise', () => {
    expect(preparerWaivedNoticeHTML(annual(), { cardLocation: 'Part III' })).toBe('');
    const d = annual(); d.guardians[1].isPreparer = true;
    const html = preparerWaivedNoticeHTML(d, { cardLocation: 'Part III' });
    expect(html).toContain('Tomas Alvarez (Guardian #2)');
    expect(html).toContain('Part III');
    expect(html).toContain('data-preparer-waived');
    const a = inventory(); a.attorney = { name: 'O\'Brien & <Co>', isPreparer: true };
    const esc = preparerWaivedNoticeHTML(a, { cardLocation: 'D-2' });
    expect(esc).toContain('O&#39;Brien &amp; &lt;Co&gt;');
    // escapeHtml() escapes apostrophes too; the browser renders it as the
    // plain character.
    expect(esc).toContain('(guardian&#39;s attorney)');
  });
});
