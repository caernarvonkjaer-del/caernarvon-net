// Milestone 73F part 2: one answer to "is this section complete?".
//
// A section showed ✓ and Print Preview then blocked it, or stayed − while
// export passed, because the sidebar had its own hand-written rules beside the
// export checks. Every screen now reads the export checks' own answer
// (src/core/validation/engines/'s evaluateFiling()), split by page:
//
//   - a page shows ✓ when nothing that stops its Preview belongs to it and its
//     sidebar-only questions are answered (the enumerated prompts: an Annual
//     schedule's "no items" box, the bond question, a Plan's certificate, the
//     Annual Plan's 3G, the Initial Plan's Q7);
//   - the page checklist lists exactly those blockers and questions;
//   - "Ready to file" is every page ✓, and the percentage counts pages ✓.
//
// The invariant runs one way: a ✓ never hides a blocker; a page may stay − for
// a question the Clerk accepts unanswered while export passes (AGENTS.md
// section 4's intended divergence). An Excel-only problem -- more rows than the
// workbook holds -- stops only Save as Excel, which says so, and doesn't hold a
// page back: the filing can still be filed as a PDF.
//
// A blocker belongs to the page its route names, or, with none, the page its
// section names (as every "Go to field" link resolves it); a field rendered on
// two pages (pageAlsoOwns()) counts against both. "Begun" -- the Summary
// pages' "in progress" -- still comes from src/core/status/completion.js.
import { evaluateFiling, cloneData } from '../validation/engines/index.js';
import { FILING_PAGES, formEngine } from '../filing/filing-registry.js';
import { sectionCheckKey, pageAlsoOwns } from './section-guidance-policy.js';
import { resolveRouteFromSection } from '../validation/validation-adapter.js';
import { applySignaturePolicyOnOpen } from '../signature/signature-policy.js';
import { STARTED_BY_ENGINE } from './completion.js';

const UNMARKED_PAGES = new Set(['/summary', '/print']);

/** The pages a filing type marks, in sidebar order. */
export function markedPages(type) {
  return (FILING_PAGES[type] || []).filter((page) => !UNMARKED_PAGES.has(page.id));
}

/** The page an issue belongs to: its own route, else its section's. */
export function issueRoute(issue, type) {
  return issue?.route || resolveRouteFromSection(issue?.section, type);
}

/** Does the issue stop this filing's Preview, and so its PDF? */
const blocksPreview = (issue) => (issue?.capabilities || []).includes('preview');

// A filing being prepared that was saved before the guardian signature rule
// (Milestone 73A) is judged as opening it will leave it, so the dashboard can't
// call it ready while its guardian's "/s/" waits to be asked again. A filing
// already opened, closed, or carrying a rule is judged as it is.
function asOpened(filing) {
  if (!filing || filing.archived || filing.signaturePolicy != null) return filing;
  const copy = cloneData(filing);
  applySignaturePolicyOnOpen(copy);
  return copy;
}

/**
 * Everything the screens need from one reading of the export checks.
 * @param {Record<string, any>} filing
 * @param {string} [type] the filing's type (defaults to its own)
 * @returns {{ checks: Record<string, boolean>, incomplete: Record<string, boolean>, evaluation: ReturnType<typeof evaluateFiling>, pageIssues: (route: string) => { blockers: any[], prompts: any[] } } | undefined}
 */
export function judgeFiling(filing, type = filing?.inventoryType) {
  const engineId = formEngine(type);
  // Own keys only: a type named like an inherited property ("constructor") has no checks.
  const started = Object.hasOwn(STARTED_BY_ENGINE, engineId) ? STARTED_BY_ENGINE[engineId] : null;
  if (!started) return undefined;
  const judged = asOpened({ ...filing, inventoryType: type });
  const evaluation = evaluateFiling(judged);
  const pages = markedPages(type);
  const byPage = new Map(pages.map((page) => [page.id, { blockers: [], prompts: [] }]));
  const alsoOwns = pages.map((page) => [page.id, pageAlsoOwns(type, page.id)]);
  const unplaced = { blockers: [], prompts: [] };
  for (const issue of evaluation.blockers) {
    if (!blocksPreview(issue)) continue;
    const route = issueRoute(issue, type);
    let placed = false;
    if (byPage.has(route)) { byPage.get(route).blockers.push(issue); placed = true; }
    for (const [page, paths] of alsoOwns) {
      if (page !== route && paths.includes(issue.path)) { byPage.get(page).blockers.push(issue); placed = true; }
    }
    if (!placed) unplaced.blockers.push(issue);
  }
  for (const prompt of evaluation.prompts) {
    if (byPage.has(prompt.route)) byPage.get(prompt.route).prompts.push(prompt);
    else unplaced.prompts.push(prompt);
  }
  // A blocker no page owns (none is known) still holds a page back -- the
  // first -- so the sidebar can never read 100% over it.
  if (pages.length && (unplaced.blockers.length || unplaced.prompts.length)) {
    const first = byPage.get(pages[0].id);
    first.blockers.push(...unplaced.blockers);
    first.prompts.push(...unplaced.prompts);
  }
  const checks = Object.fromEntries(pages.map((page) => {
    const owed = byPage.get(page.id);
    return [sectionCheckKey(type, page.id), owed.blockers.length === 0 && owed.prompts.length === 0];
  }));
  const begun = started(judged);
  const incomplete = Object.fromEntries(Object.keys(begun).map((key) => [key, !checks[key] && !!begun[key]]));
  return {
    checks,
    incomplete,
    evaluation,
    pageIssues: (route) => byPage.get(route) || { blockers: [], prompts: [] },
  };
}

/**
 * The sidebar's marks for a filing -- what computeCompletion() returned:
 * { checks, incomplete }, or undefined for a type with no checks.
 */
export function sectionMarks(filing, type = filing?.inventoryType) {
  const judged = judgeFiling(filing, type);
  return judged ? { checks: judged.checks, incomplete: judged.incomplete } : undefined;
}

/**
 * Progress for any filing, open or not: how many of its pages are ✓. A filing
 * that can't be judged leaves its dashboard card without a percentage rather
 * than breaking the dashboard.
 */
export function filingProgress(filing) {
  try {
    const marks = sectionMarks(filing, filing?.inventoryType);
    if (!marks) return null;
    const keys = Object.keys(marks.checks);
    const complete = keys.filter((key) => marks.checks[key]).length;
    return { complete, total: keys.length, pct: keys.length ? Math.round(complete / keys.length * 100) : 0 };
  } catch (e) {
    console.warn('progress calc failed for ward', filing?.wardId, e);
    return null;
  }
}
