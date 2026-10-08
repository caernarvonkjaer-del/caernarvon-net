// Shared export boundary. Preview, PDF and Excel all use this instead
// of independently deciding whether a filing has a safe identity or pending
// date input.

import { resolveFilingDescriptor } from './filing-descriptor.js';
import { countyDriftWarnings } from '../case-county-drift.js';
import { formDerivedOverwriteWarnings } from './form-derived-fields.js';
import { bondDepositoryAdvisories } from './bond-depository.js';
import { planCertificateAdvisories, certificateOptional } from './plan-certificate-of-service.js';
import { inventoryShareAdvisories, wardShareAdvisories } from './ward-share-advisories.js';
import { signAdvisories } from './sign-advisories.js';
import { consistencyAdvisories } from './consistency-advisories.js';
import { calcTotalsAnnual } from '../accounting/annual-totals.js';
import { features, hasFeatureServices } from '../runtime/features.js';
import { unrepresentedAdvisories } from './unrepresented-filing.js';
import { startingBalanceNotes } from './starting-balance-carry.js';
import { guardianEmailAdvisories } from './guardian-email.js';
import { serviceMethodAdvisories } from './service-method.js';
import { amountFieldIssues } from './amount-fields.js';
import { periodDateAdvisories, trustCreatedAfterGidAdvisories } from './date-advisories.js';
import { guardianRelationshipAdvisories } from './guardian-relationship.js';

// Milestone 71B. Where each accounting form asks why there is no attorney,
// and where its certificate of service is, by the registry's engine id.
const UNREPRESENTED_SECTIONS = Object.freeze({
  guardian: { basisSection: 'Cover', certificateSection: 'D-5' },
  annual: { basisSection: 'Part I', certificateSection: 'Part X' },
  simplified: { basisSection: 'Cover', certificateSection: 'Part VI' },
});

// Milestone 67B. The page each form asks the bond / restricted-depository
// question on, by the registry's own engine id (the Annual family shares
// one); every other type has no bond block and gets no advisory.
const bondSectionFor = (descriptor) => (
  descriptor?.engineId === 'guardian' ? 'D-4' : descriptor?.engineId === 'annual' ? 'Part IX' : ''
);

// Milestone 74H: the form's own totals, where a warning reads one -- the bond
// requirement (b) and the Simplified's Line 8. The Annual's are core; the
// Inventory's and the Simplified's live in their features, reached through
// the feature services (a unit test that runs core alone has none, and gets
// no such warning).
function formTotals(engineId, target) {
  if (engineId === 'annual') return calcTotalsAnnual(target);
  if (!hasFeatureServices() || !['guardian', 'simplified'].includes(engineId)) return null;
  return features().totals[engineId](target);
}
const bondRequirementOf = (engineId, totals) => (
  engineId === 'annual' ? totals?.bondReq : engineId === 'guardian' ? totals?.bondRequired : null
);
import {
  commitStoredDateDrafts,
  formatDraftIssues,
  getFieldDraftIssues,
} from '../form/commit-coordinator.js';
import { createIssue } from '../validation/issue-registry.js';
import { getCaseFile, getD } from '../state.js';
import { setPath } from '../form/paths.js';
import { isOutputAcknowledgedFor } from './output-revision.js';

function normalizeIssue(issue) {
  if (typeof issue === 'string') return createIssue('validation.legacy-unmapped', { message: issue });
  if (issue?.code) return createIssue(issue.code, issue);
  return createIssue('validation.legacy-unmapped', { message: issue?.message || String(issue) });
}

/**
 * What Preview and the export gate judge a filing by, without changing it: its
 * issues -- the base issues handed in, the date entries still in progress, the
 * filing's identity problems -- and its advisories. prepareFilingOutput()
 * commits the stored date drafts first and then asks this; Milestone 73F part
 * 1's evaluate<Engine>() (src/core/validation/engines/) asks it of a copy that
 * has had the same done. Split out of prepareFilingOutput() unchanged.
 */
export function collectOutputIssues(target, baseIssues = []) {
  const identity = resolveFilingDescriptor(target);
  const base = (baseIssues || []).map(normalizeIssue);
  // Milestone 73G part 1: amounts kept as text that can't be read, beside
  // the impossible dates -- one check for every form.
  const structuredIssues = [...base, ...getFieldDraftIssues(target).map(normalizeIssue), ...amountFieldIssues(target).map(normalizeIssue), ...identity.issues.map(normalizeIssue)];
  const bondSection = bondSectionFor(identity.descriptor);
  const engineId = identity.descriptor?.engineId;
  const totals = formTotals(engineId, target);
  const advisories = [
    ...countyDriftWarnings(target),
    // Cells the court's form computes for itself that this filing overwrites
    // with a different value. Advisory by decision, not by omission -- see
    // form-derived-fields.js.
    ...formDerivedOverwriteWarnings(target, identity.descriptor),
    // Milestone 67B: nothing in the bond block gates export on either form;
    // what it still wants is said here, in the same non-blocking channel.
    // Milestone 74H (b): and a Bond Amount below the requirement the form calculates.
    ...(bondSection ? bondDepositoryAdvisories(target, { section: bondSection, form: engineId, requirement: bondRequirementOf(engineId, totals) ?? null }) : []),
    // Milestone 68C: the Plans' Certificate of Service gates nothing; what it
    // still wants is said here. Not required at all on the Simplified Plan,
    // per the Clerk's own checklist, so an untouched one says nothing there.
    ...(identity.descriptor?.family === 'plan'
      ? planCertificateAdvisories(target, { optional: certificateOptional(identity.descriptor.engineId) })
      : []),
    // Schedule D ward shares of 1% or less, on the Annual, Final and Trust
    // Accountings: Ward's % now reads as a percentage everywhere, so a share
    // typed as a fraction under the old reading is pointed out, never blocked.
    ...(identity.descriptor?.engineId === 'annual' ? wardShareAdvisories(target) : []),
    // Milestone 73G part 2: the Inventory's shares the same way, and every
    // amount whose sign is unexpected -- a positive loss or transfer out, or
    // a negative where one is unusual -- filed as entered.
    ...(engineId === 'guardian' ? inventoryShareAdvisories(target) : []),
    ...signAdvisories(target),
    // Milestone 74H: answers within the filing that contradict each other.
    ...consistencyAdvisories(target, engineId, { totals }),
    // Milestone 73F part 3 (73F-6, 73F-8): a trust dated after the GID but
    // answered No to "created after the GID?", and transactions dated outside
    // the accounting period -- warned, never blocked.
    ...(identity.descriptor?.engineId === 'annual' ? [...trustCreatedAfterGidAdvisories(target), ...periodDateAdvisories(target)] : []),
    // Milestone 73B (73B-2): an unanswered Part IX relationship prints blank;
    // it is pointed out, never blocked.
    ...(identity.descriptor?.engineId === 'annual' ? guardianRelationshipAdvisories(target) : []),
    // Milestone 71B: a filing with no attorney is never blocked for it; the
    // unanswered basis and the Excel certificate's attorney-only line are
    // said here instead.
    ...(UNREPRESENTED_SECTIONS[identity.descriptor?.engineId]
      ? unrepresentedAdvisories(target, { engineId: identity.descriptor.engineId, ...UNREPRESENTED_SECTIONS[identity.descriptor.engineId] })
      : []),
    // Milestone 71E: what the carried Starting Balance needs the filer to
    // know -- nothing carried into or out of a Trust Accounting, a prior
    // filing whose Lines 20 and 30 differ, a Starting Balance changed since
    // the carry, an amended accounting for the source's period.
    ...(['annual', 'simplified'].includes(identity.descriptor?.engineId)
      ? startingBalanceNotes(target, { wards: getCaseFile()?.wards || null, section: 'Part II' })
      : []),
    // Milestone 72C: a guardian with no email address while no attorney is
    // entered, on all seven forms -- warned, never blocked (Pinellas Clerk
    // practice, 2026-10-01/02; Rule 2.515(c)). See guardian-email.js.
    ...guardianEmailAdvisories(target, identity.descriptor?.engineId),
    // Milestone 72G: a certificate that lists someone served but not how
    // (Rule 2.516(f)) -- warned, never blocked. The Plans' comes through
    // planCertificateAdvisories() above.
    ...serviceMethodAdvisories(target, identity.descriptor?.engineId),
  ];
  return { descriptor: identity.descriptor, structuredIssues, advisories };
}

/**
 * Milestone 73F part 2: Print Preview's banner status, one wording on every
 * form. Before an override it counts what blocks; after "Continue despite
 * outstanding requirements" it says what is still outstanding -- it used to
 * read "Ready to export" over items the filer had chosen to file past.
 * `readyHtml` is what the banner says with nothing outstanding.
 * @param {{ messages?: any[], structuredIssues?: any[] }} preflight
 * @param {string} [readyHtml]
 */
export function previewStatusHtml(preflight, readyHtml = ' — Ready to export') {
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const blocking = preflight?.messages?.length || 0;
  const outstanding = preflight?.structuredIssues?.length || 0;
  const status = (inner) => `<span data-preview-status>${inner}</span>`;
  if (blocking) return status(`<span style="color:var(--danger-text)"> — ${plural(blocking, 'issue')}</span>`);
  if (outstanding) return status(`<span style="color:var(--warn-text)"> — Continuing with ${plural(outstanding, 'item')} outstanding</span>`);
  return status(readyHtml);
}

/**
 * @param {Record<string, any>} data
 * @param {any[] | (() => any[])} [baseIssues]
 * @param {{ setPath?: Function }} [options]
 */
export function prepareFilingOutput(data, baseIssues = [], options = {}) {
  const target = data || getD() || {};
  commitStoredDateDrafts(target, options.setPath || setPath);
  const resolvedBaseIssues = typeof baseIssues === 'function'
    ? baseIssues()
    : baseIssues;

  const { descriptor, structuredIssues, advisories } = collectOutputIssues(target, resolvedBaseIssues);
  const rawMessages = [
    ...structuredIssues.map(issue => issue?.message || String(issue)),
  ];
  // Existing feature-owned save actions still consume `messages`.  Once the
  // in-memory acknowledgement matches this filing revision, bypassable issues
  // remain visible in `structuredIssues` but no longer veto ordinary output.
  const acknowledged = isOutputAcknowledgedFor(target, descriptor);
  const messages = acknowledged && structuredIssues.every(issue => issue.bypassable !== false) ? [] : rawMessages;

  return {
    descriptor,
    structuredIssues,
    messages,
    advisories,
    canExport: messages.length === 0,
  };
}

