// Modal orchestration for converting an existing ward filing to another form type.
import { getCaseFile } from '../state.js';
import { CARRY_SOURCE_TYPE, carrySourcesFor } from '../navigation/ward-lifecycle.js';

export function convertTargetsFor(srcType) {
  return Object.keys(CARRY_SOURCE_TYPE).filter(
    (target) => target !== srcType && target !== 'planMinor' && carrySourcesFor(target).includes(srcType)
  );
}

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
    alert(
      "You don't have any existing forms yet to convert. Create a form first using one of the options above, then come back here to convert it later if needed."
    );
    return;
  }
  if (typeof window !== 'undefined' && typeof window.ensureFragment === 'function') {
    await window.ensureFragment('common-modals');
  }
  const first = caseFile.wards[0];
  const input = document.getElementById('convert-source-ward');
  if (input) {
    input.value = first.wardName || '(unnamed)';
    input.dataset.wardId = first.wardId;
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
  targetSel.innerHTML = targets
    .map((t) => `<option value="${t}">${inventoryTypes[t]?.name || t}</option>`)
    .join('');
  if (typeof window !== 'undefined' && typeof window.updateConvertNote === 'function') {
    window.updateConvertNote();
  }
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.convertTargetsFor = convertTargetsFor;
  window.showConvertWardModal = showConvertWardModal;
  window.updateConvertTargetOptions = updateConvertTargetOptions;
  window.convertSourceItems = convertSourceItems;
}
