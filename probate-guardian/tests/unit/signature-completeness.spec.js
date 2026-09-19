import { describe, expect, test } from 'vitest';
import {
  isSignatureComplete,
  checkSignatureState,
  inferLegacySignatureState,
  SIGNATURE_STATES,
} from '../../src/core/validation/signature-state.js';

// Milestone 57, Simplified parity gap.
//
// What a filer hit: select "/s/ Signed" on Part V or Part VI of a Simplified
// Accounting, leave the date blank, and every sidebar marker turns green --
// then Print Preview refuses the export. The sidebar tested those fields by
// presence (Part V only through the deliberately blank-tolerant
// datesOrdered(); Part VI not at all) while validateSimplified() ran the
// three-state signature machine. Two rules over the same data, disagreeing.
//
// isSignatureComplete() is the sidebar's half, defined as
// checkSignatureState(...).length === 0 so the two cannot drift again. These
// cases pin the whole finite domain rather than sampling it: three explicit
// states, the two legacy blank-state inferences, and the invalid branch.
//
// The matrix is duplicated as behaviour in
// tests/e2e/navigation-status.contract.spec.ts, which drives the real sidebar
// and the real export gate. This spec pins the rule; that one pins the wiring.

const complete = (o) => isSignatureComplete(o);

describe('isSignatureComplete', () => {
  test('an unsigned card is complete -- signing is not required by the app', () => {
    expect(complete({ state: SIGNATURE_STATES.NONE })).toBe(true);
    expect(complete({ state: 'none', date: '', image: '' })).toBe(true);
  });

  // A blank state is NOT equivalent to an explicit 'none': it resolves by
  // whether a date exists, so a filing saved before the control existed keeps
  // whatever completeness it already had.
  test('a legacy blank state infers from the date, not to none', () => {
    expect(inferLegacySignatureState('', '')).toBe(SIGNATURE_STATES.NONE);
    expect(inferLegacySignatureState('', '2026-01-02')).toBe(SIGNATURE_STATES.TYPED);

    expect(complete({ state: '', date: '' }), 'blank + no date -> none -> complete').toBe(true);
    expect(complete({ state: '', date: '2026-01-02' }), 'blank + date -> typed, satisfied').toBe(true);
  });

  test('a typed signature needs its date -- the live defect', () => {
    expect(complete({ state: 'typed', date: '2026-01-02' })).toBe(true);
    expect(complete({ state: 'typed', date: '' })).toBe(false);
    expect(complete({ state: 'typed' })).toBe(false);
  });

  test('a stamp needs its image -- the live defect', () => {
    expect(complete({ state: 'stamp', image: 'data:image/png;base64,AAAA' })).toBe(true);
    expect(complete({ state: 'stamp', image: '' })).toBe(false);
    expect(complete({ state: 'stamp' })).toBe(false);
  });

  // Corrupt data, or a state written by a future version. Never a silent pass.
  test('an unrecognized state is incomplete', () => {
    expect(complete({ state: 'notarized' })).toBe(false);
    expect(complete({ state: 'notarized', date: '2026-01-02', image: 'x' })).toBe(false);
  });

  // The printed-name check is opt-in on both sides: Simplified omits it
  // because the attorney's name is already required at Cover, and passing it
  // here would report the same blank field twice.
  test('the printed name is checked only when the caller passes it', () => {
    expect(complete({ state: 'typed', date: '2026-01-02' }), 'name omitted').toBe(true);
    expect(complete({ state: 'typed', date: '2026-01-02', name: '' }), 'name passed, blank').toBe(false);
    expect(complete({ state: 'typed', date: '2026-01-02', name: 'A. Attorney' })).toBe(true);
  });

  test('an absent argument object does not throw', () => {
    expect(() => isSignatureComplete()).not.toThrow();
    expect(isSignatureComplete()).toBe(true); // nothing selected == unsigned
  });

  // The anti-drift property itself. If someone later reimplements this as its
  // own state machine, this fails -- which is the whole reason the sidebar and
  // the validator disagreed in the first place.
  test('it agrees with checkSignatureState() across the entire domain', () => {
    const states = ['', 'none', 'typed', 'stamp', 'notarized', undefined];
    const dates = ['', '2026-01-02', undefined];
    const images = ['', 'data:image/png;base64,AAAA', undefined];
    const disagreements = [];
    for (const state of states) {
      for (const date of dates) {
        for (const image of images) {
          const viaMessages = checkSignatureState({
            state: inferLegacySignatureState(state, date),
            date, image, sectionLabel: '', roleLabel: '',
          }).length === 0;
          if (isSignatureComplete({ state, date, image }) !== viaMessages) {
            disagreements.push(`state=${JSON.stringify(state)} date=${JSON.stringify(date)} image=${JSON.stringify(image)}`);
          }
        }
      }
    }
    expect(disagreements, `boolean and message forms disagree:\n${disagreements.join('\n')}`).toEqual([]);
  });
});
