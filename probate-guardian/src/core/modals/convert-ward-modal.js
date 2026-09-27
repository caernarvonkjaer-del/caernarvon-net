// Modal orchestration for converting an existing ward filing to another form type.
import { getCaseFile, getActiveWard } from '../state.js';
import { convertTargetsFor } from '../filing/filing-descriptor.js';
import { alertModal, closeModal, ensureFragment, showModal } from '../ui/dialogs.js';
import { INVENTORY_TYPES } from '../filing/filing-registry.js';
import { describeConversion } from '../filing/conversion.js';
import { filingLifecycle } from '../navigation/filing-lifecycle.js';
import { bindComboboxKeyboardNav, comboboxAssignOptionIds, comboboxFilterItems, comboboxHide, comboboxRenderDropdown } from '../ui/combobox.js';

export { convertTargetsFor };

export function convertSourceItems() {
  const caseFile = getCaseFile();
  const inventoryTypes = INVENTORY_TYPES;
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
  await ensureFragment('common-modals');
  // Milestone 40H-I: defaulted to the first ward ever created in the case
  // file, never the one actually open -- easy to convert the wrong ward
  // without noticing. Default to the active ward; fall back to the first
  // ward only when nothing is active (e.g. opened straight from the
  // dashboard with no filing selected).
  const activeWard = getActiveWard();
  const defaultWard = activeWard || caseFile.wards[0];
  const input = document.getElementById('convert-source-ward');
  if (input) {
    input.value = defaultWard.wardName || '(unnamed)';
    input.dataset.wardId = defaultWard.wardId;
  }
  updateConvertTargetOptions();
  showModal('convertWardModal');
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
  const inventoryTypes = INVENTORY_TYPES;
  if (!targets.length) {
    targetSel.innerHTML = '';
    noteEl.textContent = `${inventoryTypes[ward.inventoryType]?.name || ward.inventoryType} wards can't be converted to another type.`;
    return;
  }
  targetSel.innerHTML = targets
    .map((t) => `<option value="${t}">${inventoryTypes[t]?.name || t}</option>`)
    .join('');
  // Milestone 42E: this used to call an `updateConvertNote()` window-global,
  // which has never existed -- the note preview was dead and changing the
  // target did nothing. updateConvertNotePreview() below and conversion.js's
  // describeConversion() are the real ones (the same text the post-conversion
  // alert reuses).
  const preview = () => updateConvertNotePreview(ward.inventoryType, targetSel.value);
  targetSel.onchange = preview;
  preview();
}

// Milestone 70, 70G: the source picker and note preview of the dialog above,
// moved from legacy-app.js's CONVERT EXISTING WARD.
export function convertSourceShowDropdown(query){
  const input=document.getElementById('convert-source-ward');
  const dropdown=document.getElementById('convert-source-ward-dropdown');
  comboboxRenderDropdown(dropdown,comboboxFilterItems(convertSourceItems(),query),item=>{
    input.value=item.label;
    input.dataset.wardId=item.wardId;
    input.dataset.comboIndex='';
    input.removeAttribute('aria-activedescendant');
    input.setAttribute('aria-expanded','false');
    comboboxHide(dropdown);
    updateConvertTargetOptions();
  });
  comboboxAssignOptionIds(dropdown);
  input.dataset.comboIndex='';
  input.setAttribute('aria-expanded','true');
}

export function onConvertSourceInput(){
  document.getElementById('convert-source-ward').dataset.wardId='';
  convertSourceShowDropdown(document.getElementById('convert-source-ward').value);
}

export function onConvertSourceFocus(){
  // Focusing (rather than typing) shows every ward, even though the field
  // may already be pre-filled with a ward's name.
  convertSourceShowDropdown('');
}

// Milestone 52J Decision 4: was Escape (dead in practice -- see below) and a
// bare preventDefault() on Enter. Now gains full Up/Down/Home/End/Enter via
// the shared handler. modal-events.js's handleModalKeydown() intercepts
// Escape for any open modal before this ever runs (closes the whole modal,
// not just the dropdown) -- true before this change too, so the shared
// handler's own Escape branch is reachable here in form only; not a
// regression, since Escape's dropdown-only behavior was already
// unreachable through this combobox specifically.
export function onConvertSourceKeydown(e){
  const input=document.getElementById('convert-source-ward');
  const dropdown=document.getElementById('convert-source-ward-dropdown');
  bindComboboxKeyboardNav(input,dropdown)(e);
}

export function updateConvertNotePreview(srcType,destType){
  const noteEl=document.getElementById('convert-note');
  noteEl.textContent=describeConversion(srcType,destType);
}

export async function doConvertWard(){
  const sourceWardId=document.getElementById('convert-source-ward').dataset.wardId||'';
  const targetType=document.getElementById('convert-target-type').value;
  if(!sourceWardId||!targetType)return;
  closeModal('convertWardModal');
  await filingLifecycle.convert(sourceWardId,targetType);
}

/** A click outside the source picker closes its list. Installed once by main.js; the signal removes it. */
export function installConvertSourceDismiss({ signal } = {}){
  document.addEventListener('click',e=>{
    const wrap=document.getElementById('convert-source-ward-wrap');
    if(wrap&&!wrap.contains(e.target)){
      comboboxHide(document.getElementById('convert-source-ward-dropdown'));
      document.getElementById('convert-source-ward')?.setAttribute('aria-expanded','false');
    }
  },{ signal });
}
