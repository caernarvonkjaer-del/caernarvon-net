// Milestone 74L (decision 74L-2) and 73O part 3: a page's own name, read from
// its visible heading, names the browser tab and the page's supporting-
// documents controls.
//
//   - The tab: "Schedule B-1 — Initial Inventory — Guardian Forms", the test
//     system's warning first while it is on. Never the ward's name: the tab
//     title reaches browser history and window lists (AGENTS.md §8 item 6),
//     and no page heading holds anything the filer typed.
//   - The documents section's upload box and Comments box are drawn named
//     "... this page" (schedule-docs.js) and take the page's heading here --
//     a screen reader said "Comments about schA".
import { formDisplayName } from '../filing/filing-registry.js';
import { testSystemTitlePrefix } from './test-system-title.js';

const APP_NAME = 'Guardian Forms';
/** A Plan question's heading is a sentence or more; the tab shows its start. */
const LONGEST_HEADING = 80;

/** The page's heading as a filer reads it: without the test-system warning or the header's buttons. */
export function pageHeadingText(root) {
  if (!root || typeof root.querySelector !== 'function') return '';
  const h1 = root.querySelector('.dashboard-page-header h1')
    || root.querySelector('.schedule-page > h1, .schedule-page h1')
    || root.querySelector('h1');
  if (!h1) return '';
  const copy = /** @type {Element} */ (h1.cloneNode(true));
  copy.querySelectorAll('.test-system-title-prefix, .form-header-actions, [aria-hidden="true"]').forEach((node) => node.remove());
  return String(copy.textContent || '').replace(/\s+/g, ' ').trim();
}

const shortened = (text) => {
  if (text.length <= LONGEST_HEADING) return text;
  const cut = text.slice(0, LONGEST_HEADING);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), LONGEST_HEADING / 2)).replace(/[\s,;:—-]+$/, '')}…`;
};

/**
 * The tab title for a page heading and the open filing's type (none outside a
 * filing). The type is left out when the heading already names it ("Initial
 * Guardianship Plan — Cover").
 * @param {string} heading
 * @param {string | null | undefined} filingType
 */
export function pageTitle(heading, filingType) {
  const typeName = filingType ? formDisplayName(filingType) : '';
  const parts = [shortened(heading)];
  if (typeName && !heading.includes(typeName)) parts.push(typeName);
  parts.push(APP_NAME);
  return testSystemTitlePrefix() + parts.filter(Boolean).join(' — ');
}

/**
 * After a page is drawn: the tab title, and the documents controls' names.
 * @param {ParentNode | null} root
 * @param {string | null | undefined} filingType
 */
export function namePage(root, filingType) {
  if (typeof document === 'undefined' || !root) return;
  const heading = pageHeadingText(root);
  document.title = pageTitle(heading, filingType);
  if (!heading) return;
  root.querySelectorAll('[data-page-named]').forEach((element) => {
    const el = /** @type {HTMLElement} */ (element);
    el.setAttribute('aria-label', `${el.dataset.pageNamed} ${heading}`);
  });
}
