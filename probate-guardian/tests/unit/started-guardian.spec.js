// Milestone 74B: a co-guardian the filer has started is in the filing.
//
// A filer could apply a co-guardian's stamp, or choose a signature, before
// typing the co-guardian's name. Each form asked "has the filer started this
// card?" differently: on the Annual family and the Simplified the checks, the
// workbook and the PDF ignored such a card (no check asked for its name, and
// the filing went out without it); the Inventory's checks caught it but its
// PDF left it out; no Plan checked a co-guardian at all. The requester's
// decisions (2026-10-05): one rule on all nine forms -- the Plans'
// rowStarted(), anything entered counts, a stamp image, a "/s/" or Stamp
// choice and the preparer box included, an untouched "Unsigned" not -- and a
// started Plan co-guardian is checked like the first guardian.
//
// For a second card holding only a stamp, only a signature choice, only the
// preparer box (where the form has one), and for an untouched card and an
// Unsigned one, through each surface's own entry point: the export checks,
// the page's list (the sidebar's marks read the same, 73F part 2), the
// clean-up's list rule, and the PDF model (each started card prints in its
// own place, labelled by its card).
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
globalThis.window = globalThis.window || globalThis;

const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { engineChecks } = await import('../../src/core/validation/engines/index.js');
const { judgeFiling } = await import('../../src/core/status/section-marks.js');
const { getCollection } = await import('../../src/core/form/collections.js');
const { rowStarted } = await import('../../src/core/validation/row-started.js');

const STAMP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
const json = (x) => JSON.parse(JSON.stringify(x));

// Each form: its guardian list, the page it sits on, its PDF builder, and
// whether its cards carry the preparer box.
const FORMS = {
  guardian: { list: 'guardians', route: '/d1', engine: 'guardian', pdf: ['guardian-inventory', 'buildVerifiedInventoryModel'], preparerBox: true, label: 'Guardian #2' },
  annual: { list: 'guardians', route: '/p3', engine: 'annual', pdf: ['annual-accounting', 'buildAnnualAccountingModel'], preparerBox: true, label: 'Co-Guardian #2' },
  finalAccounting: { list: 'guardians', route: '/p3', engine: 'annual', pdf: ['annual-accounting', 'buildAnnualAccountingModel'], preparerBox: true, label: 'Co-Guardian #2' },
  trustAccounting: { list: 'guardians', route: '/p3', engine: 'annual', pdf: ['annual-accounting', 'buildAnnualAccountingModel'], preparerBox: true, label: 'Co-Guardian #2' },
  simplified: { list: 'guardians', route: '/p4', engine: 'simplified', pdf: ['simplified-accounting', 'buildSimplifiedAccountingModel'], preparerBox: true, label: 'Co-Guardian #2' },
  planInitial: { list: 'planGuardians', route: '/p9', engine: 'planInitial', pdf: ['plan-initial', 'buildPlanInitialModel'], preparerBox: false },
  planAnnual: { list: 'planGuardians', route: '/p11', engine: 'planAnnual', pdf: ['plan-annual', 'buildPlanAnnualModel'], preparerBox: false },
  planMinor: { list: 'planGuardians', route: '/p6', engine: 'planMinor', pdf: ['plan-minor', 'buildPlanMinorModel'], preparerBox: false },
  planSimplified: { list: 'planGuardians', route: '/p3', engine: 'planSimplified', pdf: ['plan-simplified', 'buildPlanSimplifiedModel'], preparerBox: false },
};

const CARDS = {
  'only a stamp': { signatureState: 'stamp', signatureImage: STAMP },
  'only a "/s/" choice': { signatureState: 'typed' },
  'only a Stamp choice': { signatureState: 'stamp' },
  'only the preparer box': { isPreparer: true },
};
const UNTOUCHED = { untouched: {}, 'Unsigned only': { signatureState: 'none' } };

let pdf;
beforeAll(async () => {
  pdf = {};
  for (const [type, form] of Object.entries(FORMS)) pdf[type] = (await import(`../../src/features/${form.pdf[0]}/pdf-model.js`))[form.pdf[1]];
});

function filing(type, second) {
  const { list } = FORMS[type];
  const d = { ...json(initializeEmptyData(type)), inventoryType: type, wardName: 'Ward', signaturePolicy: 2 };
  const first = { ...(d[list]?.[0] || {}), name: 'Ann Guardian', signatureState: 'none' };
  const blank = Object.fromEntries(Object.keys(d[list]?.[0] || {}).map((k) => [k, typeof d[list][0][k] === 'boolean' ? false : '']));
  d[list] = [first, { ...blank, ...second }];
  return d;
}
const guardianBlocks = (model) => model.sections.flatMap((s) => s.blocks || []).filter((b) => b?.type === 'signature-block' && b.signerRole === 'guardian');

describe('74B: rowStarted() decides that a guardian card is started, on all nine forms', () => {
  it('the rule itself: anything entered counts; untouched and Unsigned do not', () => {
    for (const card of Object.values(CARDS)) expect(rowStarted(card), JSON.stringify(card)).toBe(true);
    for (const card of Object.values(UNTOUCHED)) expect(rowStarted(card), JSON.stringify(card)).toBe(false);
  });

  for (const [type, form] of Object.entries(FORMS)) {
    describe(type, () => {
      const cases = Object.entries(CARDS).filter(([name]) => name !== 'only the preparer box' || form.preparerBox);
      for (const [name, second] of cases) {
        it(`a second card holding ${name} is started: checked, listed on its page, kept by the clean-up, printed in its own place`, () => {
          const d = filing(type, second);
          const at = `${form.list}.1.`;
          const issues = engineChecks(form.engine)(json(d));
          expect(issues.some((i) => i.path === `${at}name`), `${type}: the checks ask for its name`).toBe(true);
          const page = judgeFiling(json(d), type).pageIssues(form.route).blockers;
          expect(page.some((i) => i.path === `${at}name`), `${type}: its page lists it`).toBe(true);
          expect(getCollection(type === 'finalAccounting' || type === 'trustAccounting' ? 'annual' : type, form.list).isBlank(d[form.list][1]), `${type}: kept`).toBe(false);
          const blocks = guardianBlocks(pdf[type](json(d)));
          const untouched = guardianBlocks(pdf[type](json(filing(type, {}))));
          expect(blocks.length, `${type}: one more guardian block than with an untouched card`).toBe(untouched.length + 1);
          if (second.signatureImage) expect(blocks.some((b) => b.signatureImage === STAMP), `${type}: the stamp prints`).toBe(true);
          if (form.label) expect(blocks.map((b) => b.role), `${type}: labelled by its card`).toContain(form.label);
        });
      }
      for (const [name, second] of Object.entries(UNTOUCHED)) {
        it(`a second card ${name} is not started: not checked, not listed, removed by the clean-up, not printed`, () => {
          const d = filing(type, second);
          const at = `${form.list}.1.`;
          expect(engineChecks(form.engine)(json(d)).filter((i) => String(i.path).startsWith(at))).toEqual([]);
          expect(judgeFiling(json(d), type).pageIssues(form.route).blockers.filter((i) => String(i.path).startsWith(at))).toEqual([]);
          expect(getCollection(type === 'finalAccounting' || type === 'trustAccounting' ? 'annual' : type, form.list).isBlank(d[form.list][1])).toBe(true);
          // As many guardian blocks as a filing with no second card at all.
          const alone = filing(type, {});
          alone[form.list] = alone[form.list].slice(0, 1);
          expect(guardianBlocks(pdf[type](json(d))).length).toBe(guardianBlocks(pdf[type](json(alone))).length);
        });
      }
    });
  }

  it('a nameless Guardian #1 prints its own block, and a co-guardian keeps its own label (the PDFs numbered by position)', () => {
    for (const type of ['guardian', 'annual', 'simplified']) {
      const { list, label } = FORMS[type];
      const d = filing(type, { name: 'Bo Second' });
      d[list][0] = { ...d[list][0], name: '' };
      const roles = guardianBlocks(pdf[type](json(d))).map((b) => [b.role, b.signerName]);
      expect(roles.find(([, n]) => n === 'Bo Second')?.[0], type).toBe(label);
      expect(roles.some(([r]) => r === 'Guardian #1'), type).toBe(true);
    }
  });
});
