// Milestone 73F part 1: the seven forms' export checks, registered by engine
// id, and one answer to "what does this filing still need?".
//
// evaluate<Engine>(filing) returns what Preview and the export gate judge the
// filing by today, without changing it:
//   - blockers: the form's own checks, a supporting document's problems, the
//     date entries still in progress, the filing's identity problems and the
//     workbook's capacity problems -- each as today's issue, with its code,
//     section, label, path and route, whether it can be overridden, and which
//     outputs it blocks (`capabilities`: a supporting-document problem blocks
//     Preview, Print and the PDF; a capacity problem only Excel). Filter by
//     capability to get one output's gate; grouping never merges outputs.
//   - advisories: what "Review recommended" shows; never blocks.
//   - prompts: the sidebar-only questions the Clerk accepts unanswered (an
//     Annual-family schedule's "no items" box, the bond question, a Plan's
//     certificate, the Annual Plan's 3G, the Initial Plan's Q7), each with the
//     words and path the page uses. Nothing reads these yet (73F part 2).
//
// It runs on a copy of the filing, with the stored date drafts committed into
// the copy first, exactly as prepareFilingOutput() does for real -- so the
// filing passed in, and the open one, are never touched. The export gate and
// every screen still use the validate<Engine>() wrappers until part 2.
import { formEngine, FILING_PAGES } from '../../filing/filing-registry.js';
import { collectOutputIssues } from '../../filing/output-preflight.js';
import { commitStoredDateDrafts } from '../../form/commit-coordinator.js';
import { setPath } from '../../form/paths.js';
import { getSupplementalFilingIssues } from '../../pdf/supplemental-pdf.js';
import { getExcelCapacityIssues } from '../../excel/excel-capacity.js';
import { GUARDIAN_EXCEL_CAPS, ANNUAL_EXCEL_CAPS, SIMPLIFIED_EXCEL_CAPS } from '../../excel/excel-caps.js';
import { planSchB4Export } from '../../excel/b4-export-plan.js';
import { SCH_B4_ACCOUNT_BLOCKS } from '../../excel/b4-register-pages.js';
import { createIssue } from '../issue-registry.js';
import { sidebarOnlyWants } from '../../status/section-guidance-policy.js';
import { rowStarted } from '../row-started.js';
import { isAffirmative } from '../../form/form-contract.js';
import { collectGuardianIssues } from './guardian.js';
import { collectAnnualIssues } from './annual.js';
import { collectSimplifiedIssues } from './simplified.js';
import { collectPlanInitialIssues } from './plan-initial.js';
import { collectPlanAnnualIssues } from './plan-annual.js';
import { collectPlanMinorIssues } from './plan-minor.js';
import { collectPlanSimplifiedIssues } from './plan-simplified.js';

/** @typedef {{ code: string, route: string, label: string, path: string, sidebarOnly: true }} Prompt */
/** @typedef {{ blockers: any[], advisories: any[], prompts: Prompt[] }} Evaluation */

// Save as Excel's own capacity checks, per engine (each feature's doSaveExcel()).
const annualB4Issues = (d, type) => planSchB4Export(d?.schB4, d?.schB4Accounts, SCH_B4_ACCOUNT_BLOCKS)
  .problems.map((p) => createIssue(`excel.capacity.${type}.schB4-${p.code}`, {
    message: p.message,
    label: 'Schedule B-4 — All Other Disbursements',
    section: 'Schedule B-4 — All Other Disbursements',
    route: '/schb4',
  }));

// The Annual family's fourteen schedules, each answered by a started row or
// its "I verify there are no items to report" box (completion.js's
// verifiedEmpty()); named as the workbook names them.
const ANNUAL_SCHEDULES = ['schA', 'schB1', 'schB2', 'schB3', 'schB4', 'schC', 'schD1', 'schD2', 'schD3', 'schD4', 'schD5', 'schE', 'schF1', 'schF2'];
function annualNoItemsPrompts(d, engineId) {
  return ANNUAL_SCHEDULES.flatMap((list) => {
    const key = list.toLowerCase();
    if (d?.scheduleNoItems?.[key] || (d?.[list] || []).some((row) => rowStarted(row))) return [];
    const { label, route } = ANNUAL_EXCEL_CAPS[list];
    return [{ code: `prompt.${engineId}.no-items.${key}`, route, label: `${label}: add an entry, or tick "I verify there are no items to report"`, path: `scheduleNoItems.${key}`, sidebarOnly: true }];
  });
}

// The Initial Plan's Q7 (benefits): the sidebar wants a benefit ticked or an
// explanation (completion.js 'pi-p4'); export doesn't.
const Q7_BENEFITS = ['q7SocialSecurity', 'q7Ssdi', 'q7Hmo', 'q7Ssi', 'q7StateSupplement', 'q7InstitutionalCare', 'q7SupplementalIns',
  'q7Pension', 'q7Medicare', 'q7Medicaid', 'q7Va', 'q7Trusts', 'q7PendingBenefits', 'q7Other'];
function planInitialQ7Prompts(d) {
  const answered = Q7_BENEFITS.some((k) => isAffirmative(d?.[k]) || d?.[k] === true) || String(d?.q7Explain || '').trim();
  return answered ? [] : [{ code: 'prompt.planInitial.q7', route: '/p4', label: 'Question 7: tick each benefit the ward receives or has applied for, or explain', path: 'q7SocialSecurity', sidebarOnly: true }];
}

/** Each engine's checks, Save as Excel's capacity checks, and its own prompts. */
const ENGINES = Object.freeze({
  guardian: { collect: collectGuardianIssues, excel: (d) => getExcelCapacityIssues('guardian', d, GUARDIAN_EXCEL_CAPS), prompts: () => [] },
  annual: {
    collect: collectAnnualIssues,
    excel: (d, type) => [...getExcelCapacityIssues(type, d, ANNUAL_EXCEL_CAPS), ...annualB4Issues(d, type)],
    prompts: (d) => annualNoItemsPrompts(d, 'annual'),
  },
  simplified: { collect: collectSimplifiedIssues, excel: (d) => getExcelCapacityIssues('simplified', d, SIMPLIFIED_EXCEL_CAPS), prompts: () => [] },
  planInitial: { collect: collectPlanInitialIssues, excel: null, prompts: planInitialQ7Prompts },
  planAnnual: { collect: collectPlanAnnualIssues, excel: null, prompts: () => [] },
  planMinor: { collect: collectPlanMinorIssues, excel: null, prompts: () => [] },
  planSimplified: { collect: collectPlanSimplifiedIssues, excel: null, prompts: () => [] },
});

/** The registered engine ids. */
export const ENGINE_IDS = Object.freeze(Object.keys(ENGINES));

/**
 * The form's own checks, unchanged: what validate<Engine>() returns.
 * @param {string} engineId
 */
export function engineChecks(engineId) {
  const engine = ENGINES[engineId];
  if (!engine) throw new Error(`No export checks registered for the engine "${engineId}"`);
  return engine.collect;
}

/** Every sidebar-only question still unanswered: the page's own, then the engine's. */
function promptsFor(engineId, type, d) {
  const fromPages = (FILING_PAGES[type] || []).flatMap((page) => sidebarOnlyWants(type, page.id, d)
    .map((want) => ({ code: `prompt.${engineId}${page.id.replace(/\//g, '.')}.${want.path}`, route: page.id, label: want.label, path: want.path, sidebarOnly: /** @type {const} */ (true) })));
  return [...fromPages, ...ENGINES[engineId].prompts(d)];
}

/**
 * What the filing still needs, judged on a copy: see the top of this file.
 * @param {Record<string, any>} filing
 * @returns {Evaluation}
 */
export function evaluateFiling(filing) {
  const type = filing?.inventoryType;
  const engineId = formEngine(type);
  const engine = ENGINES[engineId];
  if (!engine) throw new Error(`No export checks registered for the filing type "${type || '(none)'}"`);
  // Everything below reads the copy it is handed, never the open filing.
  const copy = JSON.parse(JSON.stringify(filing));
  commitStoredDateDrafts(copy, setPath);
  const checks = engine.collect(copy);
  const preview = collectOutputIssues(copy, [...checks, ...getSupplementalFilingIssues(copy)]);
  const capacity = engine.excel ? engine.excel(copy, type) : [];
  return {
    blockers: [...preview.structuredIssues, ...capacity],
    advisories: preview.advisories,
    prompts: promptsFor(engineId, type, copy),
  };
}

const evaluateAs = (engineId) => (filing) => {
  const actual = formEngine(filing?.inventoryType);
  if (actual !== engineId) throw new Error(`evaluate for "${engineId}" was handed a "${filing?.inventoryType || '(none)'}" filing`);
  return evaluateFiling(filing);
};
export const evaluateGuardian = evaluateAs('guardian');
export const evaluateAnnual = evaluateAs('annual');
export const evaluateSimplified = evaluateAs('simplified');
export const evaluatePlanInitial = evaluateAs('planInitial');
export const evaluatePlanAnnual = evaluateAs('planAnnual');
export const evaluatePlanMinor = evaluateAs('planMinor');
export const evaluatePlanSimplified = evaluateAs('planSimplified');
