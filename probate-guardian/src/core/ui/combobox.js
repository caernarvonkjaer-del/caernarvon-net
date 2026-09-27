// @ts-nocheck -- in tsconfig.json's checked program only transitively (the moved dialogs import it); 
// moved as text from legacy-app.js in Milestone 70's 70H.
// Milestone 70, 70H: the shared combobox -- filtering, the dropdown, and its
// keyboard navigation. Moved from legacy-app.js's WARD ACTIVATION / UNLOAD.
import { esc } from '../filing/escape-html.js';

// The sidebar's "Switch Ward" button acts on whatever the dropdown is
// currently set to. If that's already the active ward, switchWard() would
// be a no-op with zero visible feedback — clicking the button would just
// silently do nothing, which reads as broken. Offer a picker instead.
// Generic searchable combobox: renders `items` ({label, sub?, ...}) into
// `dropdownEl`, filtered against `query` by case-insensitive substring match
// on label, calling `onPick(item)` when one is clicked.
export function comboboxFilterItems(items,query){
  const q=(query||'').trim().toLowerCase();
  if(!q)return items;
  return items.filter(it=>it.label.toLowerCase().includes(q));
}

export function comboboxRenderDropdown(dropdownEl,items,onPick){
  if(!dropdownEl)return;
  if(!items.length){
    dropdownEl.innerHTML='<div class="ward-combobox-empty">No matches</div>';
  }else{
    dropdownEl.innerHTML=items.map((it,i)=>`<div class="ward-combobox-item" data-idx="${i}" role="option">
        <span class="ward-combobox-item-name">${esc(it.label)}</span>
        ${it.sub?`<span class="ward-combobox-item-type">${esc(it.sub)}</span>`:''}
      </div>`).join('');
    [...dropdownEl.children].forEach((el,i)=>{
      if(el.classList.contains('ward-combobox-item'))el.addEventListener('mousedown',ev=>{ev.preventDefault();onPick(items[i]);});
    });
  }
  dropdownEl.style.display='block';
}

export function comboboxHide(dropdownEl){
  if(dropdownEl)dropdownEl.style.display='none';
}

// Gives each rendered option a stable id, scoped by the dropdown's own id so
// multiple comboboxes on the page never collide -- aria-activedescendant
// needs a real id to point at, and comboboxRenderDropdown() itself doesn't
// assign one (Milestone 52J: previously only the ward selector did this,
// inline, for itself alone).
export function comboboxAssignOptionIds(dropdownEl){
  [...dropdownEl.querySelectorAll('[role="option"]')].forEach((option,index)=>{
    option.id=`${dropdownEl.id}-option-${index}`;
  });
}

// Milestone 52J Decision 4: shared keyboard handler for the ward-selector /
// ward-name / convert-source combobox family (comboboxRenderDropdown()'s
// <div role="option"> items, each with a direct per-option mousedown
// listener). Extracted from onWardSelectorKeydown()'s complete
// implementation -- the only one of the four comboboxes with full
// Up/Down/Home/End/Enter support before this delivery; ward-name and
// convert-source had Escape only (plus a bare preventDefault on Enter for
// convert-source), a real capability gap for a keyboard-only or
// screen-reader user, which this closes.
//
// The county combobox (:1502 onCountyKeydown, near :1448
// countyAutocompleteHTML) is deliberately NOT switched to this, despite
// very similar logic (same comboIndex/aria-activedescendant bookkeeping,
// same Enter-dispatches-a-mousedown commit trick): it renders <button>
// options through its own filterCountyDropdown()/data-form-mousedown
// delegation, not comboboxRenderDropdown(), and hides via a CSS class
// toggle (hideCountyDropdown()), not this function's inline
// style.display. Wiring county to a hide callback hardcoded to
// comboboxHide() would set an inline style that filterCountyDropdown()
// never clears on reopen, permanently hiding the dropdown after the first
// Escape -- confirmed by reading both hide paths, not assumed. County
// already has full keyboard nav (Milestone 50H), so there is no
// capability gap to close there, only a code-shape win not worth that
// risk. See MILESTONE-52-PROPOSAL.md's 52J section.
export function bindComboboxKeyboardNav(input,dropdown,{onEnterWithNoSelection,hide=comboboxHide}={}){
  return function comboboxKeydownHandler(e){
    const options=[...dropdown.querySelectorAll('[role="option"]')];
    if(e.key==='Escape'){
      hide(dropdown);
      input.dataset.comboIndex='';
      input.removeAttribute('aria-activedescendant');
      input.setAttribute('aria-expanded','false');
    }
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      if(!options.length)return;
      const current=Number.parseInt(input.dataset.comboIndex,10);
      const next=Number.isInteger(current)
        ? (e.key==='ArrowDown' ? Math.min(current+1,options.length-1) : Math.max(current-1,0))
        : (e.key==='ArrowDown' ? 0 : options.length-1);
      input.dataset.comboIndex=String(next);
      input.setAttribute('aria-activedescendant',options[next].id);
      options.forEach((option,index)=>option.setAttribute('aria-selected',String(index===next)));
    }
    else if(e.key==='Home'||e.key==='End'){
      e.preventDefault();
      if(!options.length)return;
      const next=e.key==='Home'?0:options.length-1;
      input.dataset.comboIndex=String(next);
      input.setAttribute('aria-activedescendant',options[next].id);
      options.forEach((option,index)=>option.setAttribute('aria-selected',String(index===next)));
    }
    else if(e.key==='Enter'){
      e.preventDefault();
      const current=Number.parseInt(input.dataset.comboIndex,10);
      if(Number.isInteger(current)&&options[current]){
        options[current].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
      }else{
        hide(dropdown);
        input.setAttribute('aria-expanded','false');
        if(onEnterWithNoSelection)onEnterWithNoSelection();
      }
    }
  };
}
