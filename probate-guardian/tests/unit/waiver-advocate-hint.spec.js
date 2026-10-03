// Milestone 72I: the Guardian Advocate hint at "why is there no attorney?"
// appears as soon as Type of Guardianship is set to Guardian Advocate.
//
// The question and the Type of Guardianship dropdown share the Cover (Inventory)
// and Part I (Annual family). The hint was built only when the page was drawn,
// so it appeared only after the filer left the page and came back.
// syncWaiverAdvocateHint() now adds or removes the hint alone, and
// watchWaiverAdvocateHint() calls it whenever either field is written. The
// browser round trip is tests/e2e/guardian-advocate-hint.spec.ts.
//
// Red-first: against the module before 72I, the "as the filer changes it"
// tests fail -- nothing existed to update the hint after the page was drawn,
// which is the defect. The "drawn with the page" tests pass there too: drawing
// was never wrong, and they pin that the live hint is the one the page draws.
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  syncWaiverAdvocateHint,
  WAIVER_BASIS,
  waiverBasisQuestionHTML,
  watchWaiverAdvocateHint,
} from '../../src/core/filing/unrepresented-filing.js';

const ADVOCATE = { typeOfGuardianship: 'Guardian Advocate', attorneyWaiverBasis: '' };
const HINT_TAG = /<p[^>]*data-waiver-advocate-hint[^>]*>[\s\S]*?<\/p>/;
const drawn = (d) => waiverBasisQuestionHTML(d, { route: '/' });

/**
 * A stand-in for a page holding the question: its block, the reason choices
 * (each a `.form-check`), and wherever a hint has been inserted. Only what
 * syncWaiverAdvocateHint() touches.
 */
function pageWithQuestion({ hintAlready = false } = {}) {
  const page = { hints: [], inserts: [] };
  const hintElement = (html) => {
    const el = { html, remove: () => { page.hints = page.hints.filter((h) => h !== el); } };
    return el;
  };
  const choices = WAIVER_BASIS.map(({ value }, i, all) => ({
    value,
    insertAdjacentHTML: (where, html) => {
      page.inserts.push({ after: value, where, last: i === all.length - 1 });
      page.hints.push(hintElement(html));
    },
  }));
  if (hintAlready) page.hints.push(hintElement('<p data-waiver-advocate-hint>…</p>'));
  const block = {
    querySelector: (sel) => (sel === '[data-waiver-advocate-hint]' ? page.hints[0] || null : null),
    querySelectorAll: (sel) => (sel === '.form-check' ? choices : []),
  };
  page.container = { querySelector: (sel) => (sel === '[data-attorney-waiver-basis]' ? block : null) };
  return page;
}

describe('drawn with the page', () => {
  test('the hint shows while Type of Guardianship is Guardian Advocate and no reason is chosen', () => {
    expect(drawn(ADVOCATE).match(new RegExp(HINT_TAG, 'g'))).toHaveLength(1);
  });

  test('not once a reason is chosen, nor for any other type', () => {
    expect(drawn({ ...ADVOCATE, attorneyWaiverBasis: 'court-order' })).not.toMatch(HINT_TAG);
    expect(drawn({ typeOfGuardianship: 'Plenary', attorneyWaiverBasis: '' })).not.toMatch(HINT_TAG);
    expect(drawn({ typeOfGuardianship: '', attorneyWaiverBasis: '' })).not.toMatch(HINT_TAG);
  });
});

describe('as the filer changes it (syncWaiverAdvocateHint)', () => {
  test('choosing Guardian Advocate adds the same hint the page draws, after the last reason', () => {
    const page = pageWithQuestion();
    syncWaiverAdvocateHint(page.container, ADVOCATE);
    expect(page.hints).toHaveLength(1);
    expect(page.hints[0].html).toBe(drawn(ADVOCATE).match(HINT_TAG)[0]);
    expect(page.inserts).toEqual([{ after: WAIVER_BASIS.at(-1).value, where: 'afterend', last: true }]);
  });

  test('never twice', () => {
    const page = pageWithQuestion();
    syncWaiverAdvocateHint(page.container, ADVOCATE);
    syncWaiverAdvocateHint(page.container, ADVOCATE);
    expect(page.hints).toHaveLength(1);
  });

  test('choosing another type, or a reason, takes it away', () => {
    const changedType = pageWithQuestion({ hintAlready: true });
    syncWaiverAdvocateHint(changedType.container, { typeOfGuardianship: 'Plenary', attorneyWaiverBasis: '' });
    expect(changedType.hints).toHaveLength(0);

    const reasonChosen = pageWithQuestion({ hintAlready: true });
    syncWaiverAdvocateHint(reasonChosen.container, { ...ADVOCATE, attorneyWaiverBasis: 'guardian-advocate' });
    expect(reasonChosen.hints).toHaveLength(0);
  });

  test('a page without the question (an attorney is entered) is left alone', () => {
    expect(() => syncWaiverAdvocateHint({ querySelector: () => null }, ADVOCATE)).not.toThrow();
    expect(() => syncWaiverAdvocateHint(null, ADVOCATE)).not.toThrow();
  });
});

describe('watchWaiverAdvocateHint(): follows every write to either field', () => {
  afterEach(() => vi.unstubAllGlobals());

  const written = (path) => window.dispatchEvent(new CustomEvent('pg:field-written', { detail: { path } }));

  test('a write to Type of Guardianship or the reason updates the hint; other fields do not; dispose stops it', () => {
    vi.stubGlobal('window', new EventTarget());
    const page = pageWithQuestion();
    let filing = { typeOfGuardianship: 'Plenary', attorneyWaiverBasis: '' };
    const readFiling = vi.fn(() => filing);
    const watch = watchWaiverAdvocateHint(page.container, readFiling);

    written('wardName');
    expect(readFiling).not.toHaveBeenCalled();

    filing = { ...ADVOCATE };
    written('typeOfGuardianship');
    expect(page.hints).toHaveLength(1);

    filing = { ...ADVOCATE, attorneyWaiverBasis: 'court-order' };
    written('attorneyWaiverBasis');
    expect(page.hints).toHaveLength(0);

    watch.abort();
    filing = { ...ADVOCATE };
    written('typeOfGuardianship');
    expect(page.hints).toHaveLength(0);
  });
});
