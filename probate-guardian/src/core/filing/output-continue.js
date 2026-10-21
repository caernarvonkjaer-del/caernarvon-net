// Milestone 77A: "Continue despite outstanding requirements" where the filer
// meets the refusal. A guardian making a draft for her attorney concluded she
// couldn't: the reason line under the export buttons named a Continue button
// that wasn't there, Print and the Save buttons ended in OK, and the one
// button sat at the bottom of Preview & Export, under the readiness card.
// Now the reason line carries the button (output-reasons.js), and a refusal
// Continue can answer asks, with Continue and Cancel -- one confirmation, as
// the Preview's own button asks. What can't be overridden still can't, and an
// acknowledgement still lasts for the visit (output-revision.js).
//
// The open Preview registers how it redraws once an acknowledgement is given
// (pdf-preview.js), so a Continue given from a refusal says so on the page
// just as the Preview's own button does. Dependency-light: the save handlers
// reach it without loading the PDF engine.
import { acknowledgeOutstandingRequirements } from './output-authorization.js';
import { CONTINUE_LABEL, outputContinueQuestion, outputRefusal } from './output-reasons.js';
import { alertModal, confirmModal } from '../ui/dialogs.js';

let afterAcknowledged = null;

/** The open Preview's redraw after an acknowledgement; null when none is open. */
export function onOutputAcknowledged(fn) {
  afterAcknowledged = typeof fn === 'function' ? fn : null;
}

/**
 * Acknowledges what is outstanding for the filing `data` (the issues
 * `baseIssues` gives, as the export gate reads them) and lets the open Preview
 * say so. False when nothing could be acknowledged.
 */
export function continueDespiteOutstanding(data, baseIssues) {
  if (!acknowledgeOutstandingRequirements(data, baseIssues)) return false;
  try {
    afterAcknowledged?.(data);
  } catch (e) {
    console.error('Preview redraw after Continue failed', e);
  }
  return true;
}

/**
 * A refused output (authorizeFilingOutput() did not allow it). When Continue
 * can answer it, asks -- "Continue despite outstanding requirements" or
 * Cancel -- and acknowledges on Continue; otherwise says why it can't go on.
 * True when the output may now go on.
 *
 * @param {{ status: string, issues: any[] }} authorization
 * @param {'PDF' | 'Excel' | 'Print'} format
 * @param {Record<string, any>} data  the filing
 * @param {any} baseIssues  as authorizeFilingOutput() was given them
 */
export async function refuseOrContinue(authorization, format, data, baseIssues) {
  if (!authorization || authorization.status !== 'acknowledgement-required') {
    await alertModal(outputRefusal(authorization, format));
    return false;
  }
  const go = await confirmModal({
    title: 'Requirements outstanding',
    message: outputContinueQuestion(authorization, format),
    confirmLabel: CONTINUE_LABEL,
    cancelLabel: 'Cancel',
  });
  if (!go) return false;
  return continueDespiteOutstanding(data, baseIssues);
}
