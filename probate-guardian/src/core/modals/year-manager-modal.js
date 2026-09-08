// Modal orchestration for prior year editing, new accounting year rollover, and year history.
import { getCaseFile, getD } from '../state.js';

export async function showYearManagerModal() {
  const d = getD();
  if (!d || !d.inventoryType) return;
  if (typeof window !== 'undefined' && typeof window.ensureFragment === 'function') {
    await window.ensureFragment('common-modals');
  }
  if (typeof window !== 'undefined' && typeof window.renderYearManagerBody === 'function') {
    window.renderYearManagerBody();
  }
  if (typeof window !== 'undefined' && typeof window.showModal === 'function') {
    window.showModal('yearManagerModal');
  }
}

export function getWardPriorYears(ward) {
  const target = ward || getD();
  if (!target || !Array.isArray(target.priorYears)) return [];
  return target.priorYears;
}

export function saveCurrentYearToHistory(targetWard, label) {
  const ward = targetWard || getD();
  if (!ward) return;
  if (!Array.isArray(ward.priorYears)) ward.priorYears = [];
  const snapshot = JSON.parse(JSON.stringify(ward));
  delete snapshot.priorYears;
  snapshot.savedAt = new Date().toISOString();
  snapshot.yearLabel = label || ward.periodTo || 'Prior Period';
  ward.priorYears.push(snapshot);
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.showYearManagerModal = showYearManagerModal;
  window.getWardPriorYears = getWardPriorYears;
  window.saveCurrentYearToHistory = saveCurrentYearToHistory;
}
