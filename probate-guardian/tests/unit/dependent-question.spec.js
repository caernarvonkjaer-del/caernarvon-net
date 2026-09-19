import { describe, expect, test } from 'vitest';
import {
  isYes, isNo, isAnswered, effectiveAnswer, dependentQuestionState,
} from '../../src/core/validation/dependent-question.js';
import { getIssueDefinition } from '../../src/core/validation/issue-registry.js';

// Milestone 57A. Two Yes/No questions whose "Yes" branch carries a detail the
// court needs: "has the surety bond been waived?" (order date) and "does a
// restricted depository apply?" (date of most recent receipt).
//
// Both used to be inferred from the date alone, which cannot separate "waived,
// date not entered yet" from "not waived". A blank date meant both, so the
// filing went out either way and the court could not tell which it had.
//
// Decision 6 sets the asymmetry these pin: an UNANSWERED question is worth an
// acknowledgement -- the filer is told the filing reaches the clerk without
// stating it, and may proceed -- while a "Yes" with the detail still blank is
// a half-finished answer and blocks.

describe('reading a tri-state', () => {
  test.each([
    ['Yes', true, false, true],
    ['No', false, true, true],
    [true, true, false, true],
    [false, false, true, true],
    ['', false, false, false],
    [null, false, false, false],
    [undefined, false, false, false],
  ])('%j -> yes=%s no=%s answered=%s', (value, yes, no, answered) => {
    expect(isYes(value)).toBe(yes);
    expect(isNo(value)).toBe(no);
    expect(isAnswered(value)).toBe(answered);
  });
});

describe('effectiveAnswer', () => {
  test('an explicit answer is used as given, whatever the detail says', () => {
    expect(effectiveAnswer('No', '2026-01-01')).toBe('No');
    expect(effectiveAnswer('Yes', '')).toBe('Yes');
    expect(effectiveAnswer(false, '2026-01-01')).toBe('No');
  });

  // A filing saved before the question existed has the date but no answer, and
  // a date can only have been entered because the thing happened.
  test('a legacy filing with the detail and no answer reads as Yes', () => {
    expect(effectiveAnswer('', '2026-01-01')).toBe('Yes');
    expect(effectiveAnswer(undefined, '2026-01-01')).toBe('Yes');
  });

  // The direction that must never be inferred. AGENTS.md section 3: an
  // unanswered field is never coerced to No at any stage.
  test('an absent detail stays unanswered and never becomes No', () => {
    expect(effectiveAnswer('', '')).toBe('');
    expect(effectiveAnswer(null, null)).toBe('');
    expect(effectiveAnswer(undefined, '   ')).toBe('');
  });
});

describe('dependentQuestionState (Decision 6)', () => {
  test('nothing answered at all is an acknowledgement, not a blocker', () => {
    expect(dependentQuestionState('', '')).toBe('unanswered');
  });

  test('Yes with the detail still blank is the blocking case', () => {
    expect(dependentQuestionState('Yes', '')).toBe('missing-detail');
    expect(dependentQuestionState('Yes', '   ')).toBe('missing-detail');
  });

  test('No is complete on its own -- there is no detail to give', () => {
    expect(dependentQuestionState('No', '')).toBe('complete');
  });

  test('Yes with the detail is complete', () => {
    expect(dependentQuestionState('Yes', '2026-01-01')).toBe('complete');
  });

  test('a legacy filing carrying only the detail is complete, not blocked', () => {
    expect(dependentQuestionState('', '2026-01-01')).toBe('complete');
  });
});

// The two halves of D6 must land on different sides of the export gate, and
// that is decided by the issue registry rather than by the validators.
describe('the issue codes behind the two halves', () => {
  test('a half-finished Yes blocks and cannot be acknowledged away', () => {
    for (const code of ['filing.bond-waiver.incomplete', 'filing.restricted-depository.incomplete']) {
      const def = getIssueDefinition(code);
      expect(def, `${code} is not registered`).toBeTruthy();
      expect(def.bypassable, `${code} must block`).toBe(false);
      expect(def.showInReadiness, `${code} must appear in the sidebar`).toBe(true);
    }
  });

  // The unanswered half rides the ordinary validator path, which is bypassable
  // -- that is what makes it an acknowledgement rather than a hard stop.
  test('an unanswered question stays bypassable', () => {
    for (const code of ['guardian.bondWaived.required', 'annual.restrictedDepository.required']) {
      const def = getIssueDefinition(code);
      expect(def, `${code} is not registered`).toBeTruthy();
      expect(def.bypassable, `${code} must be acknowledgeable`).toBe(true);
    }
  });
});
