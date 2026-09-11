import { hasSixthCircuitLocalGuidance } from './county-guidance.js';

const manual = {
  guardian: 'Confirm required statements, appraisals, supporting records, filing timing, and service are complete.',
  simplified: 'Confirm statements, receipts, filing deadline, service, fees, and any separate case requirements are complete.',
  annual: 'Confirm required statements, service, approvals, fee petitions, and other case-specific filing steps are complete.',
  finalAccounting: 'Confirm discharge papers, notice/service, distributions, receipts or releases, and approvals are complete.',
  trustAccounting: 'Confirm the trust instrument, supporting records, service, compensation approval, and court-directed steps are complete.',
  planSimplified: 'Confirm required attachments and service are complete.',
  planAnnual: 'Confirm required attachments, physician material, and service are complete.',
  planInitial: 'Confirm required attachments, service, education proof, and original signatures are complete.',
  planMinor: 'Confirm required physician material, service, deadlines, and majority/discharge planning are complete.',
};

function escapeHtml(value) { const el = document.createElement('span'); el.textContent = value; return el.innerHTML; }

export function filingReadinessCard(data, issues = []) {
  const local = hasSixthCircuitLocalGuidance(data?.county);
  const title = local ? "Clerk's Review Readiness" : 'Filing Readiness';
  const automatic = issues.filter(issue => issue?.showInReadiness !== false);
  const failed = automatic.length;
  const reminder = manual[data?.inventoryType] || 'Confirm any required filing steps outside this application are complete.';
  const summary = failed ? `${failed} automated check${failed === 1 ? '' : 's'} needs attention` : 'Automated checks passed; manual review remains';
  const rows = automatic.map(issue => `<li>${escapeHtml(issue.message || String(issue))}</li>`).join('') || '<li>No automated issues found.</li>';
  return `<details class="validation-panel readiness-panel no-print"${failed ? ' open' : ''}><summary><strong>${title}</strong> — ${summary}</summary><div class="validation-group"><div class="validation-group-head"><span class="validation-group-name">Checked from this filing</span></div><ul class="readiness-list">${rows}</ul></div><div class="validation-group"><div class="validation-group-head"><span class="validation-group-name">Manual review</span></div><p>${escapeHtml(reminder)}</p></div></details>`;
}
