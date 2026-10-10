// Milestone 75A (decision 75A-1, "join and offer", the requester 2026-10-10):
// supporting documents and the reporting dates.
//
// An Accounting's or Plan's documents are filed under the dates in force when
// they were attached (schedule-docs.js's scheduleDocPeriodKey(); one bucket
// per period, Milestone 40C-D). Two things followed that a filer couldn't
// see: a document attached before the dates were typed dropped out of the
// screen and the PDF once they were, and so did everything on a page when a
// date was corrected. Now:
//   - joinUndatedDocuments(): documents attached before both dates were set
//     join the dates once they are, into a bucket that holds nothing yet --
//     there is nothing else the filer could have meant. Run when the dates
//     change (schedule-docs.js's installDocumentsFollowDates()) and when a
//     filing is opened (normalize-filing.js), for older files.
//   - documentsUnderOtherDates() / moveDocumentsToCurrentDates(): after a
//     correction, the section offers to bring documents filed under other
//     dates here; nothing moves without the filer's click, so 40C-D's change
//     and change back still restores everything.
// An earlier year's documents (Start New Year) are never joined or offered:
// each year keeps its own. The Initial Inventory files by year and is not
// affected. A move carries the files, the comment and the documents
// reminder's "I understand" (scheduleDocsAck, Milestone 57C-R), which is
// keyed the same way.
import { resolveActiveDocPeriod } from './doc-period.js';

const hasContent = (slot) => !!slot && typeof slot === 'object'
  && ((Array.isArray(slot.files) && slot.files.length > 0) || !!String(slot.comment || '').trim());

/** Whether the filing files its documents by dates (every type but the Initial Inventory). */
const filedByDates = (d) => !!d && typeof d === 'object' && !!d.inventoryType && d.inventoryType !== 'guardian';

/** Whether a period key carries both dates. @param {string} key */
export function isDatedKey(key) {
  const [from, to] = String(key || '').split('__');
  return !!from && !!to;
}

/** The period keys the filing's earlier years (Start New Year) are filed under. */
export function earlierYearKeys(d) {
  return new Set((Array.isArray(d?.years) ? d.years : [])
    .map((year) => `${year?.data?.periodFrom || ''}__${year?.data?.periodTo || ''}`));
}

/** A schedule's period buckets, or null for none or the old flat slot. */
function bucketsOf(d, scheduleKey) {
  const buckets = d?.scheduleDocs?.[scheduleKey];
  if (!buckets || typeof buckets !== 'object' || Array.isArray(buckets.files)) return null;
  return buckets;
}

function moveBucket(d, scheduleKey, from, to) {
  const buckets = d.scheduleDocs[scheduleKey];
  const source = buckets[from] || {};
  const target = buckets[to] && typeof buckets[to] === 'object' ? buckets[to] : { comment: '', files: [] };
  target.files = [...(Array.isArray(target.files) ? target.files : []), ...(Array.isArray(source.files) ? source.files : [])];
  const kept = String(target.comment || '').trim();
  const brought = String(source.comment || '').trim();
  if (!kept) target.comment = source.comment || '';
  else if (brought && brought !== kept) target.comment = `${target.comment}\n\n${source.comment}`;
  buckets[to] = target;
  delete buckets[from];
  const ack = d.scheduleDocsAck;
  if (ack && typeof ack === 'object' && ack[from] && typeof ack[from] === 'object' && ack[from][scheduleKey] === true) {
    if (!ack[to] || typeof ack[to] !== 'object') ack[to] = {};
    ack[to][scheduleKey] = true;
    delete ack[from][scheduleKey];
    if (!Object.keys(ack[from]).length) delete ack[from];
  }
}

/**
 * Documents attached before both dates were set join the filing's dates,
 * schedule by schedule, where the dates' own bucket holds nothing yet and
 * there is one such undated bucket (two are offered, never merged unasked).
 * @returns {boolean} whether anything moved
 */
export function joinUndatedDocuments(d) {
  if (!filedByDates(d) || !d.scheduleDocs || typeof d.scheduleDocs !== 'object') return false;
  const current = resolveActiveDocPeriod(d);
  if (!isDatedKey(current)) return false;
  const earlier = earlierYearKeys(d);
  let moved = false;
  for (const scheduleKey of Object.keys(d.scheduleDocs)) {
    const buckets = bucketsOf(d, scheduleKey);
    if (!buckets || hasContent(buckets[current])) continue;
    const undated = Object.keys(buckets).filter((key) => key !== current && !isDatedKey(key) && !earlier.has(key) && hasContent(buckets[key]));
    if (undated.length !== 1) continue;
    moveBucket(d, scheduleKey, undated[0], current);
    moved = true;
  }
  return moved;
}

/**
 * The buckets of a schedule's documents filed under dates other than the
 * filing's -- what its section offers to move here. None while the filing's
 * own dates are incomplete, and never an earlier year's.
 * @returns {Array<{ key: string, from: string, to: string, files: number, comment: boolean }>}
 */
export function documentsUnderOtherDates(d, scheduleKey) {
  if (!filedByDates(d)) return [];
  const current = resolveActiveDocPeriod(d);
  const buckets = bucketsOf(d, scheduleKey);
  if (!buckets || !isDatedKey(current)) return [];
  const earlier = earlierYearKeys(d);
  return Object.keys(buckets)
    .filter((key) => key !== current && !earlier.has(key) && hasContent(buckets[key]))
    .map((key) => {
      const [from = '', to = ''] = key.split('__');
      const slot = buckets[key];
      return { key, from, to, files: Array.isArray(slot.files) ? slot.files.length : 0, comment: !!String(slot.comment || '').trim() };
    });
}

/**
 * The filer's "Move them to these dates": the bucket's documents, comment and
 * acknowledgement join the filing's dates.
 * @returns {boolean} whether it moved (only an offered bucket moves)
 */
export function moveDocumentsToCurrentDates(d, scheduleKey, from) {
  if (!documentsUnderOtherDates(d, scheduleKey).some((bucket) => bucket.key === from)) return false;
  moveBucket(d, scheduleKey, from, resolveActiveDocPeriod(d));
  return true;
}
