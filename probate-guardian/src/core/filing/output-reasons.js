// Milestone 74C and 73M step 5: an export button that can't export yet says
// why -- before the click, in a reason line beside the buttons (each button's
// aria-describedby points to it), and on the click. Save as PDF and Save as
// Excel stay clickable on all nine forms (decision 74C-1, as 73M decided for
// Save as Excel). Before, a greyed-out button gave no reason, not on hover and
// not to a screen reader, and could not be clicked; after "Continue despite
// outstanding requirements" the Preview re-enabled only the buttons its
// per-form selectors happened to match, which missed the Simplified Plan's.
//
// Dependency-free apart from the HTML escaper: every form's print page and
// the Preview read it.
import { esc } from './escape-html.js';

/** Every export button carries data-output-action="save-pdf" or "save-excel". */
export const OUTPUT_BUTTONS = '[data-output-action]';
/** The reason line's id; each export button's aria-describedby names it. */
export const EXPORT_REASON_ID = 'export-reason';
/** The Preview's override button's own words. */
export const CONTINUE_LABEL = 'Continue despite outstanding requirements';

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const them = (n) => (n === 1 ? 'it' : 'them');
const HEAD = { PDF: 'Cannot export', Excel: 'Cannot export to Excel', Print: 'Cannot print' };
const VERB = { PDF: 'save the PDF', Excel: 'save the Excel workbook', Print: 'print' };

/**
 * What stops an output now, as [kind, sentence], or null when nothing does.
 * kind is 'capacity' (the workbook can't hold every entry -- never
 * overridden), 'blocked' (items that can't be overridden) or 'outstanding'
 * (requirements "Continue" can acknowledge).
 *
 * @param {{ status: string, issues: any[] } | null | undefined} authorization  authorizeFilingOutput()'s result
 * @param {{ capacity?: Array<{ label?: string, key?: string }> }} [options]  the Excel capacity overages
 */
export function outputReason(authorization, { capacity = [] } = {}) {
  if (capacity.length) return ['capacity', `more entries than the court's workbook can hold (${capacity.map((c) => c.label || c.key).join(', ')}) — save as PDF instead`];
  if (!authorization || authorization.status === 'allowed') return null;
  const n = authorization.issues.length;
  if (authorization.status === 'blocked') return ['blocked', `${count(n, 'item', 'items')} to correct first — see the list on this page`];
  // Milestone 77A: the sentence ends at the button that follows it
  // (exportReasonHtml()); it named a button that wasn't there.
  return ['outstanding', `${count(n, 'requirement', 'requirements')} outstanding — see the list on this page, or continue with ${them(n)} blank`];
}

/**
 * The reason line beside the export buttons: one sentence per output that
 * can't proceed, the same sentence once for both when they share it. Empty
 * (but present, for aria-describedby) when every output can.
 *
 * @param {{ pdf?: any, excel?: { authorization: any, capacity?: any[] } }} outputs
 */
export function exportReasonHtml({ pdf, excel } = {}) {
  const reasons = [];
  if (pdf !== undefined) reasons.push(['Save as PDF', outputReason(pdf)]);
  if (excel !== undefined) reasons.push(['Save as Excel', outputReason(excel.authorization, { capacity: excel.capacity || [] })]);
  const shown = reasons.filter(([, r]) => r);
  const groups = [];
  for (const [label, [kind, text]] of shown) {
    const same = groups.find((g) => g.text === text);
    if (same) same.labels.push(label); else groups.push({ labels: [label], kind, text });
  }
  // Milestone 76J item 1: each reason names its outputs, so the Preview can
  // give Save as Excel its own Continue when only the PDF is blocked.
  const outputKey = { 'Save as PDF': 'pdf', 'Save as Excel': 'excel' };
  // Milestone 77A: a reason Continue can answer carries the button, named for
  // the outputs it covers (the Preview wires it, pdf-preview.js).
  const parts = groups.map((g) => {
    const outputs = g.labels.map((l) => outputKey[l]).join(' ');
    const button = g.kind === 'outstanding'
      ? `<button type="button" class="btn btn-link btn-sm p-0 align-baseline" data-export-continue="${outputs}">${esc(CONTINUE_LABEL)}</button>`
      : '';
    return `<span data-export-reason="${g.kind}" data-export-outputs="${outputs}">${esc(g.labels.join(' and '))}: ${esc(g.text)}.${button ? ` ${button}` : ''}</span>`;
  }).join(' ');
  return `<span id="${EXPORT_REASON_ID}" class="export-reason" style="font-size:.8rem;color:var(--ink-2);">${parts}</span>`;
}

/**
 * The message a save handler shows when authorizeFilingOutput() didn't allow
 * it -- today's "Cannot export" sentence, and how to go on when "Continue"
 * can. Since Milestone 77A a refusal Continue can answer asks instead
 * (outputContinueQuestion(), output-continue.js); this is said when it can't.
 *
 * @param {{ status: string, issues: any[] }} authorization
 * @param {'PDF' | 'Excel' | 'Print'} format
 */
export function outputRefusal(authorization, format = 'PDF') {
  const n = authorization.issues.length;
  const head = HEAD[format] || HEAD.PDF;
  const what = `${n} required field${n === 1 ? '' : 's'} missing`;
  if (authorization.status === 'blocked') return `${head} — ${what}. See the list on this page; ${n === 1 ? 'it' : 'they'} can't be overridden.`;
  return `${head} — ${what}. See the list on this page, or choose “${CONTINUE_LABEL}” to export anyway.`;
}

/**
 * Milestone 77A: what Print, Save as PDF and Save as Excel ask when what is
 * outstanding can be acknowledged -- Continue or Cancel.
 *
 * @param {{ status: string, issues: any[] }} authorization
 * @param {'PDF' | 'Excel' | 'Print'} format
 */
export function outputContinueQuestion(authorization, format = 'PDF') {
  const n = authorization.issues.length;
  return `${HEAD[format] || HEAD.PDF} yet — ${n} required field${n === 1 ? '' : 's'} missing, listed on this page. Choose “${CONTINUE_LABEL}” to ${VERB[format] || VERB.PDF} anyway, with ${them(n)} blank, or Cancel to complete ${them(n)} first.`;
}

/**
 * Milestone 73M: what this filing holds that the court's Excel workbook has no
 * box for (workbook-contract/index.js's excelOmissions()), said beside the
 * export buttons -- the PDF includes it all.
 *
 * @param {Array<{ text: string }>} omissions
 */
export function excelOmissionsHtml(omissions) {
  if (!omissions || !omissions.length) return '';
  return `<span class="export-omissions" data-excel-omissions style="display:block;font-size:.8rem;color:var(--ink-2);">Not in the Excel workbook (it has no box for ${omissions.length === 1 ? 'it' : 'them'}; the PDF includes ${omissions.length === 1 ? 'it' : 'them'}): ${esc(omissions.map((o) => o.text).join('; '))}.</span>`;
}

/**
 * The question Save as Excel asks when the filing holds something the
 * workbook has no box for that the filer must file another way (73M-1: A-2's
 * Notes; 73M-2: the Lines 20/30 explanation).
 *
 * @param {Array<{ text: string }>} omissions
 */
export function excelOmissionsQuestion(omissions) {
  const them = omissions.length === 1 ? 'it' : 'them';
  return `The court's Excel workbook has no box for ${omissions.map((o) => o.text).join(' or ')}. The PDF includes ${them}; file the PDF, or file ${them} separately. Save the workbook without ${them}?`;
}
