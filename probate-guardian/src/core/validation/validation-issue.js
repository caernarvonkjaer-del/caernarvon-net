// Milestone 42F: the one way a validator reports an issue.
//
// Every validateX() used to push bare "<Section> — <detail>" strings and
// validation-adapter.js reverse-engineered the field path from the detail
// text with ~380 includes() matchers. Now each validator states the path
// itself, at the push site where it already knows the field -- the message
// convention is unchanged (section still derives from the " — " split, and
// resolveRouteFromSection() still maps it to a route), so every consumer
// that reads `.message` or stringifies an issue keeps working.
//
// Objects are built through issue-registry.js's createRequiredIssue() so
// prepareFilingOutput() passes them through as first-class, bypassable
// validation issues with their path/section intact. toString() returns the
// message so the two legacy stringifying consumers (validationPanel(),
// computeNavChecks()) and any `${issue}` interpolation see exactly the
// string they always did.
import { createRequiredIssue } from './issue-registry.js';

export function splitIssueMessage(message) {
  const str = String(message || '').trim();
  const dash = str.indexOf(' — ');
  return dash > -1
    ? { section: str.slice(0, dash).trim(), label: str.slice(dash + 3).trim() }
    : { section: '', label: str };
}

export function validationIssue(filingType, message, path = '') {
  const { section, label } = splitIssueMessage(message);
  const issue = createRequiredIssue({ filingType, path, section, label, message: String(message) });
  Object.defineProperty(issue, 'toString', { value() { return this.message; }, enumerable: false });
  return issue;
}

/** `const issue = issueFactory('planSimplified'); errs.push(issue('Cover — County is required', 'county'));` */
export function issueFactory(filingType) {
  return (message, path = '') => validationIssue(filingType, message, path);
}

/** Message text of a string or structured issue. */
export function issueMessage(issue) {
  return typeof issue === 'string' ? issue : (issue?.message ?? String(issue));
}

if (typeof window !== 'undefined') {
  window.validationIssue = validationIssue;
  window.issueMessage = issueMessage;
}
