// Milestone 70, 70H: the sidebar's filing switcher and the switch picker, which
// open a filing through the filing lifecycle service. Moved from
// legacy-app.js's WARD ACTIVATION / UNLOAD.
import { esc } from '../filing/escape-html.js';
import { INVENTORY_TYPES, typeIcon } from '../filing/filing-registry.js';
import { filingLifecycle } from '../navigation/filing-lifecycle.js';
import { getCaseFile } from '../state.js';
import { bindComboboxKeyboardNav, comboboxFilterItems, comboboxHide, comboboxRenderDropdown } from '../ui/combobox.js';
import { ensureFragment, showModal } from '../ui/dialogs.js';

// Active Ward combobox: lets you type a ward's name to filter/select it, or
// click into the field to see every ward as a dropdown — same as the plain
// picker before it, just also typeable.
export function wardSelectorItems(){
  return getCaseFile().wards.map(w=>({
    wardId:w.wardId,
    label:w.wardName||'(unnamed)',
    sub:INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType
  }));
}

export function wardSelectorShowDropdown(query){
  const input=document.getElementById('ward-selector');
  const dropdown=document.getElementById('ward-selector-dropdown');
  const items=comboboxFilterItems(wardSelectorItems(),query);
  comboboxRenderDropdown(dropdown,items,item=>{
    input.value=item.label;
    input.dataset.wardId=item.wardId;
    input.dataset.comboIndex='';
    input.removeAttribute('aria-activedescendant');
    input.setAttribute('aria-expanded','false');
    comboboxHide(dropdown);
    // Picking an option switches the filing outright. It used to only stage a
    // choice that the separate Switch Filing button consumed, so selecting an
    // entry by mouse or by ArrowDown+Enter left the active filing unchanged.
    if(item.wardId)filingLifecycle.switchTo(item.wardId);
  });
  [...dropdown.querySelectorAll('[role="option"]')].forEach((option,index)=>{
    option.id=`ward-selector-option-${index}`;
  });
  input.dataset.comboIndex='';
  input.setAttribute('aria-expanded','true');
}

export function onWardSelectorInput(){
  const input=document.getElementById('ward-selector');
  input.dataset.wardId='';
  input.removeAttribute('aria-activedescendant');
  wardSelectorShowDropdown(document.getElementById('ward-selector').value);
}

export function onWardSelectorFocus(){
  // Focusing (rather than typing) shows every ward, even though the field
  // is pre-filled with the current ward's name — that text isn't a filter
  // yet, it's just what's active.
  wardSelectorShowDropdown('');
}

// Milestone 52J: thin wrapper kept under this exact name -- shell-events.js
// calls window.onWardSelectorKeydown(event) by name via its own delegated
// listener, so the id lookups stay here (fresh each call, matching every
// other handler in this file) rather than baking input/dropdown into a
// closure created once at script-parse time.
export function onWardSelectorKeydown(e){
  const input=document.getElementById('ward-selector');
  const dropdown=document.getElementById('ward-selector-dropdown');
  bindComboboxKeyboardNav(input,dropdown,{onEnterWithNoSelection:handleSwitchWardClick})(e);
}

export async function handleSwitchWardClick(){
  const input=document.getElementById('ward-selector');
  if(!input)return;
  let wardId=input.dataset.wardId||'';
  if(!wardId&&input.value.trim()){
    // Typed a name without picking from the dropdown — resolve it directly
    // if exactly one ward matches; otherwise show the dropdown to disambiguate.
    const q=input.value.trim().toLowerCase();
    const matches=getCaseFile().wards.filter(w=>(w.wardName||'').trim().toLowerCase()===q);
    // Milestone 73P (D26): or the one filing the typed text leaves in the list.
    const shown=comboboxFilterItems(wardSelectorItems(),input.value);
    if(matches.length===1){
      wardId=matches[0].wardId;
    }else if(shown.length===1){
      wardId=shown[0].wardId;
    }else{
      wardSelectorShowDropdown(input.value);
      return;
    }
  }
  if(!wardId)return;
  if(wardId===getCaseFile().activeWardId){
    showSwitchWardPickerModal();
    return;
  }
  await filingLifecycle.switchTo(wardId);
}

export async function showSwitchWardPickerModal(){
  await ensureFragment('common-modals');
  const current=getCaseFile().wards.find(w=>w.wardId===getCaseFile().activeWardId);
  const nameEl=document.getElementById('switch-ward-picker-current-name');
  if(nameEl)nameEl.textContent=current&&current.wardName?`"${current.wardName}"`:'This ward';
  const listEl=document.getElementById('switch-ward-picker-list');
  const others=getCaseFile().wards.filter(w=>w.wardId!==getCaseFile().activeWardId);
  if(!others.length){
    listEl.innerHTML='<div class="dashboard-empty-inline">You only have one ward — nothing to switch to yet.</div>';
  }else{
    listEl.innerHTML=others.map(w=>{
      const typeLabel=INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType;
      return `<button type="button" class="recent-ward-item" data-modal-action="switch-ward" data-ward-id="${esc(w.wardId)}">
        <span class="recent-ward-icon">${typeIcon(w.inventoryType,16)}</span>
        <span class="recent-ward-info">
          <span class="recent-ward-name">${esc(w.wardName||'(unnamed)')}${w.archived?' <span class="badge bg-secondary ward-card-badge">Closed</span>':''}</span>
          <span class="recent-ward-type">${esc(typeLabel)}</span>
        </span>
      </button>`;
    }).join('');
  }
  showModal('switchWardPickerModal');
}

/** A click outside the switcher closes its list. Installed once by main.js; the signal removes it. */
export function installFilingSwitcherDismiss({ signal } = {}){
  document.addEventListener('click',e=>{
    const wrap=document.getElementById('ward-selector-wrap');
    if(wrap&&!wrap.contains(e.target)){
      comboboxHide(document.getElementById('ward-selector-dropdown'));
      document.getElementById('ward-selector')?.setAttribute('aria-expanded','false');
    }
  },{ signal });
}
