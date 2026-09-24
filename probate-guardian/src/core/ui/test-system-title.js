// Milestone 68¾A. Every page inside every filing, the dashboard, and the
// Preview & Export banner begin their visible title with
//
//   TEST SYSTEM - Do not use for filing -
//
// so a tester can never mistake this deployment for one that produces court
// filings. One constant for the words and one switch for whether they are
// shown; nothing else in the app owns a copy. The warning is real DOM text,
// not CSS `content`, so it is part of the heading's accessible name, is
// copyable, and tests can read the exact words. It is never added to a PDF,
// a workbook, a .sav file, metadata, a filename or the browser-tab title --
// this module only touches the live page -- and print CSS hides it.
//
// To remove the warning everywhere, set the switch to false. It is a build
// decision, not a user preference: a tester must not be able to switch it
// off by accident, and deployment status is not filing data.
export const TEST_SYSTEM_TITLE_WARNING_ENABLED = true;
export const TEST_SYSTEM_TITLE_WARNING = 'TEST SYSTEM - Do not use for filing';

const GROUP_CLASS = 'test-system-title';
const PREFIX_CLASS = 'test-system-title-prefix';
const ACTIONS_CLASS = 'form-header-actions';

let enabled = TEST_SYSTEM_TITLE_WARNING_ENABLED;

/**
 * The surfaces a page's title lives on, in the order the page has them:
 * the dashboard's heading; a filing page's visible `<h1>`; and, on Preview &
 * Export -- whose only `<h1>` is the visually hidden "Print Preview" -- the
 * first line of the visible banner.
 */
function titleTargets(root) {
  const targets = [];
  const dashboard = root.querySelector('.dashboard-page-header h1');
  if (dashboard) targets.push(dashboard);
  const h1 = root.querySelector('.schedule-page > h1, .schedule-page h1');
  if (h1 && !h1.classList.contains('visually-hidden')) targets.push(h1);
  const banner = root.querySelector('.print-preview-banner > :first-child');
  if (banner) targets.push(banner);
  return targets;
}

/**
 * Puts the warning at the start of one title, once. The warning and the
 * original title are wrapped together in one span so the heading's flex
 * layout wraps them as a unit, apart from the header action buttons.
 */
function decorate(target) {
  if (target.querySelector(`.${PREFIX_CLASS}`)) return false;
  const group = document.createElement('span');
  group.className = GROUP_CLASS;
  const prefix = document.createElement('span');
  prefix.className = PREFIX_CLASS;
  prefix.textContent = `${TEST_SYSTEM_TITLE_WARNING} - `;
  group.appendChild(prefix);
  for (const node of Array.from(target.childNodes)) {
    if (node.nodeType === 1 && node.classList.contains(ACTIONS_CLASS)) continue;
    group.appendChild(node);
  }
  target.insertBefore(group, target.firstChild);
  return true;
}

/** Takes the warning back out, restoring the original title node for node. */
function undecorate(target) {
  const group = target.querySelector(`:scope > .${GROUP_CLASS}`);
  if (!group) return false;
  group.querySelector(`:scope > .${PREFIX_CLASS}`)?.remove();
  while (group.firstChild) target.insertBefore(group.firstChild, group);
  group.remove();
  return true;
}

/**
 * Decorates every title surface under `root`. Idempotent: a title that
 * already carries the warning is left alone, so the router's post-render
 * path and its mutation observer may both call it.
 */
export function decorateTestSystemTitles(root = (typeof document !== 'undefined' ? document.getElementById('main-content') : null)) {
  if (!root || typeof document === 'undefined') return 0;
  const targets = titleTargets(root);
  let changed = 0;
  for (const target of targets) {
    if (enabled ? decorate(target) : undecorate(target)) changed += 1;
  }
  return changed;
}

/**
 * Test seam (Milestone 68¾A verification plan): flips the switch for this
 * page load only -- nothing is stored -- and re-applies it to what is on
 * screen, so a test can prove that "off" leaves every title exactly as it
 * was. A reload returns to TEST_SYSTEM_TITLE_WARNING_ENABLED.
 */
export function setTestSystemTitleWarningEnabledForTest(value) {
  enabled = !!value;
  return decorateTestSystemTitles();
}

if (typeof window !== 'undefined') {
  window.setTestSystemTitleWarningEnabledForTest = setTestSystemTitleWarningEnabledForTest;
}
