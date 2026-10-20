// Milestone 76H item 6 (decision 76H-7, the requester's): the remuneration
// Part -- the Annual family's Part XI and the Simplified's Part VII -- in one
// place, so the two forms print it alike (AGENTS.md section 8 item 9).
//
// The Part always prints. Milestones 58D and 60J made it print with entries or
// with the "none received" declaration, since s. 744.367(3)(a) requires the
// report to include a declaration of remuneration; an unanswered Part, which
// the filer can override at export, was left out of the PDF entirely. It now
// prints the statutory paragraph with blank lines to complete by hand -- never
// "none received", which the filer did not declare (60J's reason: a filer who
// never opened the Part must not file a PDF affirming none was received).
import { REMUNERATION_DECLARATION, REMUNERATION_NONE_REPORTED } from '../filing/statutory-text.js';

const HEADERS = ['#', 'Guardian Name', 'Type', 'Description', 'Amount'];
const COL_WIDTHS = [6, 22, 18, 38, 16];
const COL_ALIGN = ['center', 'left', 'left', 'left', 'right'];
/** Blank lines printed for a Part left unanswered. */
export const UNANSWERED_REMUNERATION_LINES = 5;

/** The entries the Part lists: anything entered. */
export const remunerationEntries = (d) => (d.remuneration || []).filter((r) => r && (r.guardian || r.type || r.description || r.amount));

/**
 * The Part's blocks: the statute, then the entries, the "none" declaration, or
 * -- unanswered -- blank lines.
 * @param {Record<string, any>} d the filing
 * @param {(v: any) => string} fmtAmount the form's amount presenter
 */
export function remunerationBlocks(d, fmtAmount) {
  const entries = remunerationEntries(d);
  const declaredNone = !!(d.scheduleNoItems && d.scheduleNoItems.remuneration);
  const statute = { type: 'notice', tag: 'P', text: `Per s. 744.367(3)(a), Florida Statutes: ${REMUNERATION_DECLARATION}` };
  if (entries.length) {
    return [statute, {
      type: 'table',
      tag: 'Table',
      title: 'Declaration of Remuneration',
      headers: HEADERS,
      rows: entries.map((r, i) => [
        String(i + 1),
        r.guardian || '',
        r.type || '',
        r.description || '',
        r.amount === '' || r.amount == null ? '' : fmtAmount(r.amount),
      ]),
      colWidths: COL_WIDTHS,
      colAlign: COL_ALIGN,
    }];
  }
  if (declaredNone) {
    return [statute, { type: 'notice', tag: 'P', title: 'Declaration of Remuneration', text: REMUNERATION_NONE_REPORTED }];
  }
  return [statute, {
    type: 'table',
    tag: 'Table',
    title: 'Declaration of Remuneration (to be completed)',
    headers: HEADERS,
    rows: Array.from({ length: UNANSWERED_REMUNERATION_LINES }, (_, i) => [String(i + 1), '', '', '', '']),
    colWidths: COL_WIDTHS,
    colAlign: COL_ALIGN,
  }];
}
