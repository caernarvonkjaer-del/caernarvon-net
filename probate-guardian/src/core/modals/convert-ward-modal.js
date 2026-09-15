// Modal orchestration for converting an existing ward filing to another form type.
import { getCaseFile } from '../state.js';
import { convertTargetsFor } from '../filing/filing-descriptor.js';
import { alertModal } from '../ui/dialogs.js';

export { convertTargetsFor };

export function convertSourceItems() {
  const caseFile = getCaseFile();
  const inventoryTypes = (typeof window !== 'undefined' && window.INVENTORY_TYPES) || {};
  return (caseFile.wards || []).map((w) => ({
    wardId: w.wardId,
    label: w.wardName || '(unnamed)',
    sub: inventoryTypes[w.inventoryType]?.name || w.inventoryType,
  }));
}

export async function showConvertWardModal() {
  const caseFile = getCaseFile();
  if (!caseFile.wards || !caseFile.wards.length) {
    await alertModal(
      "You don't have any existing forms yet to convert. Create a form first using one of the options above, then come back here to convert it later if needed."
    );
    return;
  }
  if (typeof window !== 'undefined' && typeof window.ensureFragment === 'function') {
    await window.ensureFragment('common-modals');
  }
  // Milestone 40H-I: defaulted to the first ward ever created in the case
  // file, never the one actually open -- easy to convert the wrong ward
  // without noticing. Default to the active ward; fall back to the first
  // ward only when nothing is active (e.g. opened straight from the
  // dashboard with no filing selected).
  const activeWard = (typeof window !== 'undefined' && typeof window.getActiveWard === 'function') ? window.getActiveWard() : null;
  const defaultWard = activeWard || caseFile.wards[0];
  const input = document.getElementById('convert-source-ward');
  if (input) {
    input.value = defaultWard.wardName || '(unnamed)';
    input.dataset.wardId = defaultWard.wardId;
  }
  updateConvertTargetOptions();
  if (typeof window !== 'undefined' && typeof window.showModal === 'function') {
    window.showModal('convertWardModal');
  }
}

export function updateConvertTargetOptions() {
  if (typeof document === 'undefined') return;
  const input = document.getElementById('convert-source-ward');
  const wardId = (input && input.dataset.wardId) || '';
  const caseFile = getCaseFile();
  const ward = (caseFile.wards || []).find((w) => w.wardId === wardId);
  const targetSel = document.getElementById('convert-target-type');
  const noteEl = document.getElementById('convert-note');
  if (!targetSel || !noteEl) return;
  if (!ward) {
    targetSel.innerHTML = '';
    noteEl.textContent = '';
    return;
  }
  const targets = convertTargetsFor(ward.inventoryType);
  const inventoryTypes = (typeof window !== 'undefined' && window.INVENTORY_TYPES) || {};
  if (!targets.length) {
    targetSel.innerHTML = '';
    noteEl.textContent = `${inventoryTypes[ward.inventoryType]?.name || ward.inventoryType} wards can't be converted to another type.`;
    return;
  }
  targetSel.innerHTML = targets
    .map((t) => `<option value="${t}">${inventoryTypes[t]?.name || t}</option>`)
    .join('');
  // Milestone 42E: this used to call window.updateConvertNote(), which has
  // never existed -- the note preview was dead and changing the target did
  // nothing. legacy-app.js's updateConvertNotePreview()/describeConversion()
  // are the real ones (the same text the post-conversion alert reuses).
  const preview = () => window.updateConvertNotePreview?.(ward.inventoryType, targetSel.value);
  targetSel.onchange = preview;
  preview();
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.convertTargetsFor = convertTargetsFor;
  window.showConvertWardModal = showConvertWardModal;
  window.updateConvertTargetOptions = updateConvertTargetOptions;
  window.convertSourceItems = convertSourceItems;
}
