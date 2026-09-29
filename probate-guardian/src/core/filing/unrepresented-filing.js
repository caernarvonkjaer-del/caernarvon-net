// Milestone 71B: a filing with no attorney.
//
// Why, in filer terms. A pro se guardian filing a Simplified Accounting
// (section 744.3679(3): "The guardian need not be represented by an attorney
// in order to file the annual accounting allowed by subsection (1)"), a
// guardian advocate (Fla. Prob. R. 5.030(a)), a guardian whose representation
// the court waived, and a guardian who is a Florida attorney may all file with
// no attorney. The Initial Inventory and the Annual, Final, Trust and
// Simplified Accountings used to require one anyway, so none of them could
// finish without overriding the export gate -- and the filed PDF then carried
// an empty attorney attestation and an attorney certificate of service nobody
// signed.
//
// What this module owns, for all three engines:
//   - the "why is there no attorney?" question (Inventory and the Annual
//     family only; the Simplified Accounting's reason is the statute itself).
//     Unanswered is a Preview & Export note, never an export block: the
//     Clerk's own work slips check the waiver, and AGENTS.md section 4 keeps
//     attorney certification off an unrepresented filing's export gate;
//   - who signs the certificate of service instead: the guardian who served
//     the copies (Rules 2.515(a), 2.516(a) and (f), quoted in
//     MILESTONE-71-PROPOSAL.md). With co-guardians the filer ticks which one,
//     stored as a flag on that guardian's own row -- the pattern and the reason
//     are Milestone 67A's preparer flag (preparer-flag.js): guardian rows have
//     no stable id and are removed by position, so an index would name the
//     wrong person after a delete, while a flag travels with its row;
//   - the one-line statement the PDF prints in place of the attorney
//     attestation.
//
// Whether a filer actually qualifies is not decided here. The filer states
// the basis; the Clerk checks it.

import { escapeHtml as esc } from './escape-html.js';
import { isAttorneyStarted } from '../validation/attorney-block.js';
import { rowStarted } from '../validation/row-started.js';

/** The data-form-change token form-events.js dispatches claimServiceCertifier() on. */
export const SERVICE_CERTIFIER_CHANGE = 'service-certifier';

export const SERVICE_CERTIFIER_LABEL = 'This guardian served the copies and signs the certificate of service';

/** The engines whose filings ask the basis. Simplified's basis is the statute. */
const ASKS_BASIS = new Set(['guardian', 'annual']);

export const WAIVER_BASIS = Object.freeze([
  Object.freeze({
    value: 'guardian-advocate',
    label: 'Guardian Advocate',
    hint: 'A guardian advocate is not required to be represented by an attorney unless otherwise required by law or the court (Fla. Prob. R. 5.030(a)).',
  }),
  Object.freeze({
    value: 'court-order',
    label: 'A court order waived representation by an attorney',
    hint: 'The waiver may be in the Order Appointing Guardian, or in a Report and Recommendation of Magistrate approved by order.',
  }),
  Object.freeze({
    value: 'self-represented-attorney',
    label: 'The guardian is a Florida attorney representing themselves',
    hint: 'A guardian who is an attorney admitted to practice in Florida may represent himself or herself (Fla. Prob. R. 5.030(a)).',
  }),
]);

const basisOption = (value) => WAIVER_BASIS.find((b) => b.value === value) || null;

/** True when this filing has no attorney started, on an engine that allows it. */
export function isUnrepresented(d, engineId) {
  if (!d) return false;
  if (!['guardian', 'annual', 'simplified'].includes(engineId)) return false;
  return !isAttorneyStarted(d, engineId);
}

// A guardian row "in play": Guardian #1 always; a co-guardian once anything is
// entered on it. The certifier flag itself is not entry -- a blank card with
// only the box ticked is still a blank card.
const guardianInPlay = (g, i) => i === 0 || rowStarted(g, { ignore: ['certifiesService', 'signatureDateLabel'] });

/** The guardians who could certify service, with their original indexes. */
export function certifyingCandidates(d) {
  const guardians = Array.isArray(d?.guardians) ? d.guardians : [];
  return guardians.map((g, index) => ({ g, index })).filter(({ g, index }) => g && guardianInPlay(g, index));
}

/** True when the filer must say which guardian served: more than one in play. */
export function certifierChoiceNeeded(d) {
  return certifyingCandidates(d).length > 1;
}

/**
 * The guardian who signs the certificate of service when there is no
 * attorney: the only guardian, or the one flagged. Null when co-guardians
 * exist and none is flagged -- unanswered, never defaulted to Guardian #1.
 * The name is read live from the row.
 * @returns {{ index: number, name: string, guardian: object } | null}
 */
export function resolveServiceCertifier(d) {
  const candidates = certifyingCandidates(d);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) {
    const { g, index } = candidates[0];
    return { index, name: String(g.name || '').trim(), guardian: g };
  }
  const flagged = candidates.find(({ g }) => g.certifiesService === true);
  return flagged ? { index: flagged.index, name: String(flagged.g.name || '').trim(), guardian: flagged.g } : null;
}

/**
 * Only one guardian certifies. Called after the ticked box has been written
 * to `path`: clears every other guardian's flag. Unticking clears nothing
 * else -- the filing returns to "unanswered".
 */
export function claimServiceCertifier(filing, path) {
  const guardians = Array.isArray(filing?.guardians) ? filing.guardians : [];
  guardians.forEach((g, i) => {
    if (g && g.certifiesService && `guardians.${i}.certifiesService` !== path) g.certifiesService = false;
  });
}

/**
 * "Which guardian served these copies?" -- one checkbox per guardian in play,
 * on the certificate page, shown only while the filing has no attorney and
 * more than one guardian. Each box writes that guardian's own row flag. Same
 * wiring as Milestone 67A's preparer flag: data-form-change runs
 * claimServiceCertifier(), data-form-route re-renders so the other boxes
 * visibly clear.
 */
export function serviceCertifierChoiceHTML(d, { route, labels = null }) {
  const candidates = certifyingCandidates(d);
  if (candidates.length < 2) return '';
  const boxes = candidates.map(({ g, index }) => {
    const path = `guardians.${index}.certifiesService`;
    const safeId = `service_certifier_${index}`;
    const who = (labels && labels[index]) || `Guardian #${index + 1}`;
    const name = String(g.name || '').trim();
    return `<div class="form-check plan-check">
      <input class="form-check-input" type="checkbox" id="${safeId}" ${g.certifiesService === true ? 'checked' : ''} data-form-path="${esc(path)}" data-field-path="${esc(path)}" data-form-value="boolean" data-form-change="${SERVICE_CERTIFIER_CHANGE}" data-form-route="${esc(route)}">
      <label class="form-check-label" for="${safeId}">${esc(who)}${name ? ` — ${esc(name)}` : ''}</label>
    </div>`;
  }).join('');
  return `<fieldset class="mb-3" data-service-certifier>
    <legend class="form-label mb-1">Which guardian served these copies? <span class="req">*</span></legend>
    <p class="form-text mt-0 mb-1">${esc(SERVICE_CERTIFIER_LABEL)}. Tick one.</p>
    ${boxes}
  </fieldset>`;
}

/**
 * The "why is there no attorney?" question, for the Cover of the Inventory
 * and the Annual family, shown only while no attorney is started. Radios
 * write `attorneyWaiverBasis`; "court order" reveals the order date, rendered
 * by the caller's own date renderer (`dateField(path, label)`), so the field
 * uses that form's date input and draft handling.
 */
export function waiverBasisQuestionHTML(d, { route, dateField }) {
  const current = d?.attorneyWaiverBasis || '';
  const group = 'attorney_waiver_basis';
  const radios = WAIVER_BASIS.map((b) => `<div class="form-check">
      <input class="form-check-input" type="radio" name="${group}" id="${group}_${b.value}" value="${b.value}" ${current === b.value ? 'checked' : ''} data-form-path="attorneyWaiverBasis" data-field-path="attorneyWaiverBasis" data-form-route="${esc(route)}">
      <label class="form-check-label" for="${group}_${b.value}">${esc(b.label)}</label>
    </div>`).join('');
  const advocateHint = !current && d?.typeOfGuardianship === 'Guardian Advocate'
    ? '<p class="form-text mb-1" data-waiver-advocate-hint>Type of Guardianship is Guardian Advocate — if that is why there is no attorney, choose "Guardian Advocate" above.</p>'
    : '';
  const chosen = basisOption(current);
  const orderDate = current === 'court-order' && typeof dateField === 'function'
    ? `<div class="mt-2" style="max-width:18rem;">${dateField('attorneyWaiverOrderDate', 'Date of the order')}</div>`
    : '';
  return `<fieldset class="entry-card mb-3" data-attorney-waiver-basis>
    <legend class="entry-card-header" style="font-size:.9rem;">No attorney is entered. Why is this guardian filing without one?</legend>
    <div class="entry-card-body">
      <p class="form-text mt-0">Optional here, but the Clerk checks it. If an attorney represents the guardian, enter the attorney instead and this question goes away.</p>
      ${radios}
      ${advocateHint}
      ${chosen ? `<p class="form-text mb-0">${esc(chosen.hint)}</p>` : ''}
      ${orderDate}
    </div>
  </fieldset>`;
}

const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
};

/**
 * The sentence the filed PDF prints in place of the attorney attestation,
 * or '' when an attorney is started. OPEN (MILESTONE-71-PROPOSAL.md, 71B step
 * 6): the wording is app-authored filed text awaiting the Clerk's review;
 * this is the proposal's default.
 */
export function unrepresentedStatement(d, engineId) {
  if (!isUnrepresented(d, engineId)) return '';
  if (engineId === 'simplified') {
    return 'The guardian is not represented by counsel: a simplified accounting (§744.3679(3), Florida Statutes).';
  }
  switch (d.attorneyWaiverBasis) {
    case 'guardian-advocate':
      return 'The guardian is not represented by counsel: guardian advocate (Fla. Prob. R. 5.030(a)).';
    case 'court-order': {
      const date = fmtDate(d.attorneyWaiverOrderDate);
      return `The guardian is not represented by counsel: representation waived by court order${date ? ` dated ${date}` : ''}.`;
    }
    case 'self-represented-attorney':
      return 'The guardian is not represented by counsel: the guardian is a Florida attorney representing themselves (Fla. Prob. R. 5.030(a)).';
    default:
      return 'The guardian is not represented by counsel.';
  }
}

/**
 * Preview & Export notes for a filing with no attorney. Never blocking
 * (output-preflight.js's advisory channel).
 * @param {Record<string, any>} d
 * @param {{ engineId: string, basisSection: string, certificateSection: string }} where
 */
export function unrepresentedAdvisories(d, { engineId, basisSection, certificateSection }) {
  if (!isUnrepresented(d, engineId)) return [];
  const out = [];
  if (ASKS_BASIS.has(engineId)) {
    if (!basisOption(d.attorneyWaiverBasis)) {
      out.push({
        code: 'attorney.waiver-basis-unanswered',
        severity: 'advisory',
        field: 'attorneyWaiverBasis',
        message: `${basisSection} — No attorney is entered, and the filing does not say why. The Clerk checks for a guardian advocate, a court order waiving representation, or a guardian who is a Florida attorney.`,
      });
    } else if (d.attorneyWaiverBasis === 'court-order' && !d.attorneyWaiverOrderDate) {
      out.push({
        code: 'attorney.waiver-order-date-missing',
        severity: 'advisory',
        field: 'attorneyWaiverOrderDate',
        message: `${basisSection} — Representation was waived by court order, but the order's date is blank. The Clerk's work slip records the date of that order.`,
      });
    }
  }
  out.push({
    code: 'attorney.guardian-certificate-excel',
    severity: 'advisory',
    field: '',
    message: `${certificateSection} — The court's Excel workbook has a certificate-of-service signature line for an attorney only. The guardian's certificate prints on the PDF; file the PDF, or sign the workbook's certificate by hand.`,
  });
  return out;
}
