// Milestone 70, 70F: the county field's autocomplete -- its markup, filtering,
// keyboard handling and choice. Moved from legacy-app.js's COMMON HELPERS.
import { esc } from '../filing/escape-html.js';
import { FL_COUNTIES } from '../pdf/circuit-lookup.js';

// Shared markup: a plain text input plus an initially-empty dropdown right
// after it, both wrapped so the dropdown can be absolutely positioned
// against the input (see .ward-combobox-wrap, reused as-is here — the
// positioning rule was never ward-specific). `writeExpr` is whatever this
// particular field's own data-write convention is (D['field']=this.value,
// a custom setter string, or nothing at all for data-bind fields, which
// wire their own listener in bindForms() instead) — this function only
// ever concerns itself with the dropdown, never how the value gets saved.
export function countyAutocompleteHTML(id,val,path){
  const binding=path?` data-form-path="${esc(path)}" data-annual-path="${esc(path)}"`:'';
  // Milestone 50H: a real WAI-ARIA combobox contract -- aria-controls names
  // the listbox, aria-expanded/aria-activedescendant are kept in sync by
  // filterCountyDropdown()/hideCountyDropdown()/onCountyKeydown() below,
  // and the listbox+options below carry the matching roles. Previously the
  // dropdown was mousedown-only with no keyboard route to it at all.
  return `<div class="ward-combobox-wrap county-combobox-wrap">
    <input type="text" class="form-control" id="${id}" autocomplete="off" value="${esc(val||'')}"
      role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-dropdown"
      data-form-control="county"${binding}>
    <div class="county-combobox-dropdown" id="${id}-dropdown" role="listbox"></div>
  </div>`;
}

// Up to 4 counties whose name starts with what's typed so far (case-
// insensitive); with nothing typed yet, the first 4 alphabetically, so
// focusing an empty field isn't just a dead dropdown.
export function filterCountyDropdown(inp){
  const dd=document.getElementById(inp.id+'-dropdown');
  if(!dd)return;
  const q=inp.value.trim().toLowerCase();
  const counties=FL_COUNTIES;
  const matches=(q?counties.filter(c=>c.toLowerCase().startsWith(q)):counties).slice(0,4);
  inp.dataset.comboIndex='';
  inp.removeAttribute('aria-activedescendant');
  if(!matches.length){dd.classList.remove('show');dd.innerHTML='';inp.setAttribute('aria-expanded','false');return;}
  dd.innerHTML=matches.map((c,i)=>`<button type="button" class="county-combobox-item" id="${esc(inp.id)}-option-${i}" role="option" data-form-mousedown="select-county" data-input-id="${esc(inp.id)}" data-county="${esc(c)}">${esc(c)}</button>`).join('');
  dd.classList.add('show');
  inp.setAttribute('aria-expanded','true');
}

export function hideCountyDropdown(id){
  const dd=document.getElementById(id+'-dropdown');
  if(dd)dd.classList.remove('show');
  const inp=document.getElementById(id);
  if(inp){inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');inp.dataset.comboIndex='';}
}

// onmousedown/onclick (below) on each item stops the input's blur from
// firing before the selection registers, the standard combobox trick —
// dispatching a real 'input' event here re-runs whatever write-expr this
// field was wired with in countyAutocompleteHTML() rather than duplicating
// that logic, and also re-triggers filterCountyDropdown(), which
// hideCountyDropdown() right after this correctly closes back up.
export function selectCountyOption(id,county){
  const inp=document.getElementById(id);
  if(!inp)return;
  inp.value=county;
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  hideCountyDropdown(id);
}

// Milestone 50H. Modelled on onWardSelectorKeydown() (this file, the sidebar
// Active Filing picker's own combobox): ArrowDown/ArrowUp move a highlighted
// option, Home/End jump, Escape closes, Enter commits. `inp` is whichever
// county field the keydown fired on -- unlike the ward selector this isn't
// a singleton, countyAutocompleteHTML() is reused for the ward's own county
// and (elsewhere) an attorney's, each with its own id/dropdown.
export function onCountyKeydown(inp,e){
  const dd=document.getElementById(inp.id+'-dropdown');
  if(!dd)return;
  const options=[...dd.querySelectorAll('[role="option"]')];
  if(e.key==='Escape'){
    hideCountyDropdown(inp.id);
  }else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    if(!options.length)return;
    const current=Number.parseInt(inp.dataset.comboIndex,10);
    const next=Number.isInteger(current)
      ? (e.key==='ArrowDown' ? Math.min(current+1,options.length-1) : Math.max(current-1,0))
      : (e.key==='ArrowDown' ? 0 : options.length-1);
    inp.dataset.comboIndex=String(next);
    inp.setAttribute('aria-activedescendant',options[next].id);
  }else if(e.key==='Home'||e.key==='End'){
    e.preventDefault();
    if(!options.length)return;
    const next=e.key==='Home'?0:options.length-1;
    inp.dataset.comboIndex=String(next);
    inp.setAttribute('aria-activedescendant',options[next].id);
  }else if(e.key==='Enter'){
    const current=Number.parseInt(inp.dataset.comboIndex,10);
    if(Number.isInteger(current)&&options[current]){
      e.preventDefault();
      // Commits through the exact same path a real click does -- see the
      // "trap to avoid" note above selectCountyOption(): a real click's
      // mousedown listener is what actually calls it, so dispatching one
      // here (rather than calling selectCountyOption() directly) guarantees
      // the keyboard path can never diverge from the mouse path, including
      // the maybeCommitCoverCounty()/commitCoverCounty() chain that
      // establishes the canonical ward-Party county.
      options[current].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    }
    // No highlighted option: leave Enter's default behavior alone rather
    // than guessing a selection -- matches the WAI-ARIA combobox contract.
  }
}
