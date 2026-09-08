// Eligibility checks and qualification modals for Simplified and Specialized forms.
import { getD } from '../state.js';

export function checkSimplifiedEligibility(data) {
  const d = data || getD();
  if (!d) return { eligible: false, reasons: ['No active filing data.'] };
  const reasons = [];
  if (d.eligDepository !== 'Yes') {
    reasons.push('All assets must be held in a designated depository.');
  }
  if (d.eligOnlyTransactions !== 'Yes') {
    reasons.push('Only permitted depository transactions are allowed.');
  }
  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

export function showEligibilityModal(formType) {
  if (typeof window !== 'undefined' && typeof window.showModal === 'function') {
    window.showModal('eligibilityModal');
  }
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.checkSimplifiedEligibility = checkSimplifiedEligibility;
  window.showEligibilityModal = showEligibilityModal;
}
