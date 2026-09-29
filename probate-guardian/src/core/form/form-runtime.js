// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js imports it); moved
// as text from legacy-app.js in Milestone 70's 70F, never written with JSDoc types.
// Milestone 70, 70F: the page helpers every form's pages share -- labels
// linked to their inputs, accordions, amount fields kept non-negative, the
// SSN reveal and the browser notice. Moved from legacy-app.js's FORM BINDING
// ENGINE and neighbours.
import { getD } from '../state.js';
import { ic } from '../ui/icons.js';

// Prevent negative values in number inputs (amount fields)
export function enforceNonNegative(input) {
  if (input.type === 'number') {
    let val = input.value;
    // Remove any minus signs
    val = val.replace(/^-/, '');
    input.value = val;
  }
}

// Apply no-negative enforcement to all amount inputs
export function setupAmountFieldValidation() {
  document.querySelectorAll('input[type="number"]').forEach(input => {
    const id = input.id || '';
    const name = input.name || '';
    const isAmountField = id.includes('amount') || id.includes('balance') || id.includes('price') ||
                          id.includes('starting') || id.includes('income') || id.includes('charge') ||
                          id.includes('tax') || id.includes('settlement') ||
                          name.includes('amount') || name.includes('balance') || name.includes('price');

    if (isAmountField) {
      input.min = '0';
      // Real-time validation as user types
      input.addEventListener('input', function() { enforceNonNegative(this); });
      input.addEventListener('change', function() { enforceNonNegative(this); });
      input.addEventListener('blur', function() { enforceNonNegative(this); });
    }
  });
}

export function sanitizeNegativeAmounts(){
  // Milestone 71C: wardPct and wardPercent are no longer here. A share is a
  // percent field whose minus sign stays visible so the range check can say
  // so; clamping it on every open would set a typed -10 back to 0 unseen.
  const amountFields=['fullAmount','restrictedAmt','fullValue','carryingValue','wardB2','wardB3','fullAssetValue','fullDebtBalance','fullAssetAmount','wardValue','wardAmt','income','charge','tax','balance','price'];
  const cleanValue=v=>{const n=parseFloat(v);return isNaN(n)?v:Math.max(0,n)};
  if(getD()){
    if(Array.isArray(getD().schD1)){getD().schD1.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    if(Array.isArray(getD().schD2)){getD().schD2.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    if(Array.isArray(getD().schD3)){getD().schD3.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    if(Array.isArray(getD().schD4)){getD().schD4.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    // Milestone 71E (decision D12): startingBalance is no longer here. A ward
    // whose debts exceed their assets ends a period with negative net assets,
    // and the next filing starts from them; clamping it on every open turned a
    // carried negative into $0 and left Line 20 off by the whole amount.
    ['interestIncome','depositsSettlement','serviceCharges','federalIncomeTax'].forEach(f=>{if(f in getD())getD()[f]=cleanValue(getD()[f])});
    // Simplified's remuneration rows no longer have an amount field, but Annual's still do.
    if(Array.isArray(getD().remuneration)){getD().remuneration.forEach(r=>{if('amount' in r)r.amount=cleanValue(r.amount);})}
  }
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
    const labelText=control.closest('.mb-2, .col-12, .col-md-2, .col-md-3, .col-md-4, .col-md-5, .col-md-6, .col-md-8, .col-md-12')?.querySelector('label')?.textContent
      || control.getAttribute('placeholder')
      || control.getAttribute('title')
      || control.dataset.annualLabel
      || control.dataset.formPath
      || control.dataset.bind
      || control.id;
    if(labelText)control.setAttribute('aria-label',labelText.replace(/\s+/g,' ').trim());
  });
}
