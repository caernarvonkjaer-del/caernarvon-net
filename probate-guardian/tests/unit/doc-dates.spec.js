import { describe, expect, it } from 'vitest';
import {
  documentsUnderOtherDates, earlierYearKeys, isDatedKey, joinUndatedDocuments, moveDocumentsToCurrentDates,
} from '../../src/core/filing/doc-dates.js';
import { normalizeWardData } from '../../src/core/filing/normalize-filing.js';

// Milestone 75A (decision 75A-1, "join and offer", the requester 2026-10-10):
// documents attached before the reporting dates join them once typed; after a
// correction the section offers to move documents filed under other dates;
// an earlier year's are never joined or offered; the Initial Inventory, filed
// by year, is untouched.

const PERIOD = '2026-01-01__2026-12-31';
const file = (name) => ({ id: name, name, dataUrl: 'data:application/pdf;base64,JVBERi0=' });
const plan = (scheduleDocs, extra = {}) => ({ inventoryType: 'planAnnual', periodFrom: '2026-01-01', periodTo: '2026-12-31', scheduleDocs, ...extra });

describe('Milestone 75A: documents attached before the dates join them', () => {
  it('a period key is dated only with both dates', () => {
    expect(isDatedKey(PERIOD)).toBe(true);
    expect(isDatedKey('__')).toBe(false);
    expect(isDatedKey('2026-01-01__')).toBe(false);
    expect(isDatedKey('initial')).toBe(false);
  });

  it('the no-dates bucket joins the dates, files and comment, and is gone', () => {
    const d = plan({ planACover: { __: { comment: 'Physician letter', files: [file('a.pdf')] }, [PERIOD]: { comment: '', files: [] } } });
    expect(joinUndatedDocuments(d)).toBe(true);
    expect(d.scheduleDocs.planACover).toEqual({ [PERIOD]: { comment: 'Physician letter', files: [file('a.pdf')] } });
    expect(joinUndatedDocuments(d), 'idempotent').toBe(false);
  });

  it('documents attached with one date typed join once both are', () => {
    const d = plan({ schA: { '2026-01-01__': { comment: '', files: [file('a.pdf')] } } }, { inventoryType: 'annual' });
    expect(joinUndatedDocuments(d)).toBe(true);
    expect(Object.keys(d.scheduleDocs.schA)).toEqual([PERIOD]);
  });

  it('the documents reminder\'s "I understand" moves with them', () => {
    const d = plan({ planACover: { __: { comment: '', files: [file('a.pdf')] } } }, { scheduleDocsAck: { __: { planACover: true } } });
    joinUndatedDocuments(d);
    expect(d.scheduleDocsAck).toEqual({ [PERIOD]: { planACover: true } });
  });

  it('nothing joins while the dates are incomplete', () => {
    const d = plan({ planACover: { __: { comment: '', files: [file('a.pdf')] } } }, { periodTo: '' });
    expect(joinUndatedDocuments(d)).toBe(false);
  });

  it('nothing joins into dates that already hold documents -- they are offered instead', () => {
    const d = plan({ planACover: { __: { comment: '', files: [file('a.pdf')] }, [PERIOD]: { comment: 'kept', files: [] } } });
    expect(joinUndatedDocuments(d)).toBe(false);
    expect(documentsUnderOtherDates(d, 'planACover').map((b) => b.key)).toEqual(['__']);
  });

  it('two undated buckets are offered, never merged unasked', () => {
    const d = plan({ schA: { __: { comment: '', files: [file('a.pdf')] }, '2026-01-01__': { comment: '', files: [file('b.pdf')] } } }, { inventoryType: 'annual' });
    expect(joinUndatedDocuments(d)).toBe(false);
    expect(documentsUnderOtherDates(d, 'schA')).toHaveLength(2);
  });

  it('an earlier year\'s documents are never joined or offered', () => {
    const years = [{ key: 'Year 1', data: { periodFrom: '', periodTo: '' } }, { key: 'Year 2', data: { periodFrom: '2025-01-01', periodTo: '2025-12-31' } }];
    expect([...earlierYearKeys({ years })]).toEqual(['__', '2025-01-01__2025-12-31']);
    const d = plan({ schA: { __: { comment: '', files: [file('a.pdf')] }, '2025-01-01__2025-12-31': { comment: '', files: [file('b.pdf')] } } }, { inventoryType: 'annual', years, activeYearKey: 'Year 3' });
    expect(joinUndatedDocuments(d)).toBe(false);
    expect(documentsUnderOtherDates(d, 'schA')).toEqual([]);
  });

  it('the Initial Inventory, filed by year, is untouched', () => {
    const d = { inventoryType: 'guardian', scheduleDocs: { a1: { __: { comment: '', files: [file('a.pdf')] } } } };
    expect(joinUndatedDocuments(d)).toBe(false);
    expect(documentsUnderOtherDates(d, 'a1')).toEqual([]);
  });

  it('a filing is joined when it is opened, as an older file needs', () => {
    const d = plan({ planACover: { __: { comment: '', files: [file('a.pdf')] } } }, { wardId: 'w1' });
    normalizeWardData(d);
    expect(Object.keys(d.scheduleDocs.planACover)).toEqual([PERIOD]);
  });
});

describe('Milestone 75A: after a correction, the section offers documents filed under other dates', () => {
  const corrected = () => plan({
    schA: { '2026-01-01__2025-12-31': { comment: 'Statements', files: [file('a.pdf'), file('b.pdf')] }, [PERIOD]: { comment: '', files: [] } },
  }, { inventoryType: 'annual', scheduleDocsAck: { '2026-01-01__2025-12-31': { schA: true } } });

  it('names what is where', () => {
    expect(documentsUnderOtherDates(corrected(), 'schA')).toEqual([
      { key: '2026-01-01__2025-12-31', from: '2026-01-01', to: '2025-12-31', files: 2, comment: true },
    ]);
  });

  it('nothing moves until the filer moves it, and then everything does', () => {
    const d = corrected();
    expect(joinUndatedDocuments(d), 'a dated bucket never joins by itself').toBe(false);
    expect(moveDocumentsToCurrentDates(d, 'schA', '2026-01-01__2025-12-31')).toBe(true);
    expect(d.scheduleDocs.schA).toEqual({ [PERIOD]: { comment: 'Statements', files: [file('a.pdf'), file('b.pdf')] } });
    expect(d.scheduleDocsAck).toEqual({ [PERIOD]: { schA: true } });
    expect(documentsUnderOtherDates(d, 'schA')).toEqual([]);
  });

  it('moving into dates that hold documents keeps both, comments one after the other', () => {
    const d = corrected();
    d.scheduleDocs.schA[PERIOD] = { comment: 'Already here', files: [file('c.pdf')] };
    moveDocumentsToCurrentDates(d, 'schA', '2026-01-01__2025-12-31');
    expect(d.scheduleDocs.schA[PERIOD].files.map((f) => f.name)).toEqual(['c.pdf', 'a.pdf', 'b.pdf']);
    expect(d.scheduleDocs.schA[PERIOD].comment).toBe('Already here\n\nStatements');
  });

  it('only an offered bucket moves', () => {
    const d = corrected();
    expect(moveDocumentsToCurrentDates(d, 'schA', 'no-such-dates')).toBe(false);
    expect(moveDocumentsToCurrentDates(d, 'schA', PERIOD)).toBe(false);
  });
});
