// Milestone 70, 70F: the validation panel a Print Preview shows over the
// export, and the highlighting of the fields it names. Moved from
// legacy-app.js's VALIDATION SUMMARY and PRINT-PREVIEW PAGER.
import { esc } from '../filing/escape-html.js';
import { FILING_PAGES } from '../filing/filing-registry.js';
import { PAGES_GUARDIAN } from '../filing/models/guardian.js';
import { getActiveInventoryType } from '../state.js';
import { ic } from '../ui/icons.js';
import { groupIssuesByPage } from './issue-groups.js';

export function validationPanel(errors,opts){
  opts=opts||{};
  // Milestone 73F part 2: grouped by page, as the sidebar and the blocked
  // preview count sections (src/core/validation/issue-groups.js); it grouped
  // by each issue's full section text, so "D-1 Guardian #1" and "D-1 Guardian
  // #2" were two sections. Each field keeps its owner ("Guardian #2 — Phone").
  const type=getActiveInventoryType();
  const groups=groupIssuesByPage(errors,type);
  // Only offer a jump link when the route is a real page in this wizard.
  const valid=new Set((FILING_PAGES[type]||PAGES_GUARDIAN||[]).map(p=>p.id));
  const rows=groups.map(({route,name,items})=>{
    const fields=items.map(item=>item.text.replace(/\s+is required\.?$/i,'').replace(/\.$/,''));
    const go=(route&&valid.has(route))
      ? `<button type="button" class="validation-go" data-form-action="navigate" data-route="${esc(route)}">Go to section ${ic('external',13)}</button>`
      : '';
    return `<div class="validation-group">
      <div class="validation-group-head">
        <span class="validation-group-name">${esc(name)}</span>
        <span class="validation-count">${fields.length}</span>
        ${go}
      </div>
      <div class="validation-fields">${fields.map(f=>`<span class="validation-field">${esc(f)}</span>`).join('')}</div>
    </div>`;
  }).join('');
  const n=errors.length;
  return `<div class="validation-panel no-print">
    <summary class="validation-head">
      ${ic('alert',17)}
      <div>
        <div class="validation-title">${n} required field${n===1?'':'s'} still missing</div>
        <div class="validation-sub">${opts.subtitle||`Across ${groups.length} section${groups.length===1?'':'s'}, listed below. These must be completed before this ward can be exported.`}</div>
      </div>
    </div>
    <div class="validation-groups">${rows}</div>
  </div>`;
}

export function highlightErrors(errorMessages){
  // First, clear all previous error highlights
  document.querySelectorAll('.validation-error-field').forEach(el=>{
    el.classList.remove('validation-error-field');
  });

  // Then highlight fields matching each error message
  errorMessages.forEach(err=>{
    // Extract field name from error message (e.g., "Ward Name" from "Ward Name is required")
    const match=err.match(/^([^(]+?)\s+(?:is required|must be|cannot)/i);
    if(!match)return;
    const fieldName=match[1].toLowerCase().trim();

    // Find all labels and inputs that mention this field
    document.querySelectorAll('label, input, select, textarea').forEach(el=>{
      const text=el.textContent||el.placeholder||el.id||'';
      if(text.toLowerCase().includes(fieldName)){
        let target=el;
        if(el.tagName==='LABEL'){
          // Find the input associated with this label
          const labelFor=el.getAttribute('for');
          if(labelFor){
            target=document.getElementById(labelFor);
          }else{
            target=el.querySelector('input, select, textarea')||el.parentElement.querySelector('input, select, textarea');
          }
        }
        if(target&&['INPUT','SELECT','TEXTAREA'].includes(target.tagName)){
          target.classList.add('validation-error-field');
        }
      }
    });
  });
}
