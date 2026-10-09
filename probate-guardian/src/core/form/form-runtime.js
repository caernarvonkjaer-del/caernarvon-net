// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js imports it); moved
// as text from legacy-app.js in Milestone 70's 70F, never written with JSDoc types.
// Milestone 70, 70F: the page helpers every form's pages share -- labels
// linked to their inputs, accordions, unreadable amounts marked, the SSN
// reveal and the browser notice. Moved from legacy-app.js's FORM BINDING
// ENGINE and neighbours.
import { syncAmountFeedback, syncDateFeedback } from './form-contract.js';
import { ic } from '../ui/icons.js';

// Milestone 73G part 1: every amount box accepts a minus (decision 73G-N1,
// as all three of the Clerk's workbooks instruct), so the no-negatives
// enforcement that used to live here is gone, and with it the clamp that set
// negative D-1 to D-4, Simplified Part II and Part XI amounts to 0 -- and cut
// "1,234.56" to 1 -- on every page drawn (sanitizeNegativeAmounts()). Amounts
// saved as text are now read once, losslessly, when a filing opens
// (src/core/filing/amount-fields.js). What runs after a page is drawn is the
// marking of any amount box whose stored amount can't be read -- and, since
// Milestone 74L, of any date box still holding an impossible date.
export function setupAmountFieldValidation(container = document) {
  syncAmountFeedback(container);
  syncDateFeedback(container);
}

export function toggleSsnReveal(btn){
  const input=btn.previousElementSibling;
  const revealing=input.dataset.revealed!=='true';
  input.dataset.revealed=String(revealing);
  input.classList.toggle('ssn-revealed',revealing);
  btn.setAttribute('aria-label',revealing?'Hide SSN/EIN':'Show SSN/EIN');
  btn.innerHTML=ic(revealing?'unlock':'lock',14);
}

// Guardian page renderers moved to src/features/guardian-inventory/index.js
// (Milestone 8, Phase A). linkAccordions() stays shared because the
// extracted Cover page still calls it after mounting.
export function linkAccordions(idA,idB){
  const elA=document.getElementById(idA),elB=document.getElementById(idB);
  if(!elA||!elB||elA.dataset.linked)return;
  elA.dataset.linked='1';elB.dataset.linked='1';
  let syncing=false;
  const mirror=(target,open)=>{
    if(syncing)return;
    syncing=true;
    try{
      const inst=bootstrap.Collapse.getOrCreateInstance(target,{toggle:false});
      if(open)inst.show();else inst.hide();
    }finally{syncing=false;}
  };
  elA.addEventListener('show.bs.collapse',()=>mirror(elB,true));
  elA.addEventListener('hide.bs.collapse',()=>mirror(elB,false));
  elB.addEventListener('show.bs.collapse',()=>mirror(elA,true));
  elB.addEventListener('hide.bs.collapse',()=>mirror(elA,false));
}

// Chrome and Edge support writable file handles for background .sav updates.
// Other browsers require deliberate exports, so show this notice on every
// form's Case Info or Cover page.
export function browserRecommendationNotice(style = 'margin-bottom:1rem;'){
  return `<div class="schedule-instructions" style="${style}">${ic('alert',15)} <strong>Chrome or Microsoft Edge is recommended</strong> for the best experience — only those browsers support automatically saving your work in the background as you go. Firefox and Safari work fine too, but you'll need to save a backup file (.sav) manually and more often.</div>`;
}

// Accessibility: Link labels to inputs that have IDs but no for attribute
export function linkLabelsToInputs(){
  // First: ensure every input/select/textarea has an id BEFORE trying to
  // link labels to them — otherwise the linking pass below finds a blank
  // .id on fields like dateInput() and silently gives up on that label.
  document.querySelectorAll('input:not([id]), select:not([id]), textarea:not([id])').forEach(inp=>{
    inp.id='auto_'+Math.random().toString(36).slice(2,9);
  });

  // Then: link adjacent labels/inputs in the same parent
  document.querySelectorAll('label:not([for])').forEach(label=>{
    if(label.querySelector('input, select, textarea'))return;
    // Try next sibling
    let next=label.nextElementSibling;
    if(next&&(next.tagName==='INPUT'||next.tagName==='SELECT'||next.tagName==='TEXTAREA')&&next.id){
      label.setAttribute('for',next.id);
      return;
    }
    // Try next element after a div wrapper
    if(next&&next.tagName==='DIV'){
      const input=next.querySelector('input, select, textarea');
      if(input&&input.id){
        label.setAttribute('for',input.id);
        return;
      }
    }
    // Try parent div's siblings
    const parent=label.parentElement;
    if(parent){
      const input=parent.querySelector('input, select, textarea');
      if(input&&input.id){
        label.setAttribute('for',input.id);
        return;
      }
    }
  });

  // Give any remaining visible form control a usable accessible name. This
  // covers dynamic fields whose visible label cannot be linked structurally.
  document.querySelectorAll('input, select, textarea').forEach(control=>{
    if(control.type==='hidden' || control.type==='file' || control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby'))return;
    const hasAssociatedLabel=control.id&&[...document.querySelectorAll('label[for]')].some(label=>label.htmlFor===control.id);
    if(hasAssociatedLabel || control.closest('label'))return;
    // Milestone 73O part 3: never an internal name (a data path, an id) and
    // never the required star -- a screen reader said "startingBalance".
    const labelText=control.closest('.mb-2, .col-12, .col-md-2, .col-md-3, .col-md-4, .col-md-5, .col-md-6, .col-md-8, .col-md-12')?.querySelector('label')?.textContent
      || control.getAttribute('placeholder')
      || control.getAttribute('title')
      || control.dataset.annualLabel
      || control.dataset.fieldLabel;
    const name=String(labelText||'').replace(/\*/g,' ').replace(/\s+/g,' ').trim();
    if(name)control.setAttribute('aria-label',name);
  });
}
