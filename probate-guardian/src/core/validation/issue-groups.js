// Milestone 73F part 2: one way to group a filing's issues into sections.
//
// Print Preview counted "sections" three ways: the missing-items panel by each
// issue's full section text ("D-1 Guardian #1" and "D-1 Guardian #2" were two
// sections), the blocked-preview panel by its first word ("Part III" and
// "Part IV" were both "Part"), and the sidebar by page. Every list now groups
// by the page an issue belongs to -- its route, else its section's, as every
// "Go to field" link and the sidebar's marks resolve it -- named as the
// sidebar names the page, in sidebar order. An issue keeps its owner in its
// text ("Guardian #2 — Phone"), as the page checklist shows it.
import { FILING_PAGES } from '../filing/filing-registry.js';
import { splitIssueMessage } from './validation-issue.js';
import { resolveRouteFromSection } from './validation-adapter.js';

/** An item's text: its label, with the card it belongs to when the section names one ("D-1 Guardian #2"). */
export function issueItemText(section, label) {
  const owner = /^[A-Z]-\d+\s+(.+)$/.exec(String(section || '').trim())?.[1];
  const text = String(label ?? '');
  return owner && !text.startsWith(owner) ? `${owner} — ${text}` : text;
}

function partsOf(issue) {
  if (issue && typeof issue === 'object' && issue.message) {
    const split = splitIssueMessage(issue.message);
    return { section: issue.section || split.section, label: issue.label || split.label, route: issue.route || '', path: issue.path || '' };
  }
  const split = splitIssueMessage(String(issue ?? ''));
  return { section: split.section, label: split.label, route: '', path: '' };
}

/**
 * @param {any[]} issues structured issues or messages
 * @param {string} type the filing type
 * @returns {{ route: string, name: string, items: { text: string, route: string, path: string, label: string }[] }[]}
 */
export function groupIssuesByPage(issues, type) {
  const pages = FILING_PAGES[type] || [];
  const order = new Map(pages.map((page, i) => [page.id, i]));
  const names = new Map(pages.map((page) => [page.id, page.label]));
  const groups = new Map();
  for (const issue of issues || []) {
    const parts = partsOf(issue);
    const route = parts.route || resolveRouteFromSection(parts.section, type);
    const onPage = names.has(route);
    // An issue no page holds keeps its own section as its group.
    const key = onPage ? route : `section:${parts.section || 'Other'}`;
    if (!groups.has(key)) groups.set(key, { route: onPage ? route : '', name: onPage ? names.get(route) : (parts.section || 'Other'), items: [] });
    groups.get(key).items.push({ text: issueItemText(parts.section, parts.label), route, path: parts.path, label: parts.label });
  }
  const rank = (group) => (order.has(group.route) ? order.get(group.route) : Number.MAX_SAFE_INTEGER);
  return [...groups.values()].sort((a, b) => rank(a) - rank(b));
}
