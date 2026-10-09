// Milestone 70, 70F: the field markup builders the Simplified, Annual and
// Plan pages share (text, checkbox, Yes/No, radio, county, question and page
// navigation rows). Moved from legacy-app.js.
import { esc } from '../filing/escape-html.js';
import { countyAutocompleteHTML } from './county-autocomplete.js';
import { renderCheckboxField, renderFormField, renderRadioGroupField, renderTextareaField, renderYesNoField } from './form-fields.js';

// Small banner shown at the top of a Cover page (Plan or Accounting), only
// when a matching ward of the other type exists to load from — kept out of
// Wraps a Cover page's "Import Excel" accordion. Used to also pair it with
// the "Load Ward Info" banner in a two-column layout; that banner (and the
// one-time carry-over UI generally) was retired in the persistence-rewrite's
// Case-entity milestone -- every filing type now has its own Party/Case
// picker instead, kept continuously in sync rather than copied once.
export function pageIntroRow(accordionHTML){
  return `<div class="dashboard-top-row single-col" style="margin-bottom:1.25rem;">${accordionHTML}</div>`;
}

export function inpS(id,label,val,req=false,type='text'){
  return renderFormField({
    path: id,
    label,
    value: val,
    type,
    required: req,
    id,
  });
}

// Filtered-autocomplete text input for county fields, using the same
// D['id']=this.value write convention as the other Simplified/Plan field helpers.
export function countyInputS(id,label,val,req=false){
  return `<div class="mb-2"><label class="form-label" for="${id}">${label}${req?'<span class="req">*</span>':''}</label>${countyAutocompleteHTML(id,val,id)}</div>`;
}

// The Guardianship Plans are narrative documents — long free-text answers,
// checkbox lists, and Yes/No questions — where the accountings are grids of
// numbers. Nothing in the app covered those controls (the only textarea was
// the schedule-comments box; the only checkbox was the unlock dialog), so
// these three are the shared foundation for all four Plan types.
//
// They follow the same convention as inpS above: write straight to
// D['id'] inline, then autoSave() and refresh the completion checkmarks.
// Values are escaped on the way out; free text is deliberately NOT run
// through formatName/formatAddress the way inpS guesses by label, because
// these are sentences and paragraphs, not names or addresses.
export function txtP(id,label,val,rows=4,req=false,hint=''){
  return renderTextareaField({ path: id, label, value: val, rows, required: req, hint, id });
}

// Milestone 67F: `route` is passed only by call sites whose checkbox reveals
// another field -- it makes the page re-render on change (form-events.js),
// which is what shows the revealed field without leaving the page.
export function chkP(id,label,checked,route=''){
  return renderCheckboxField({ path: id, label, checked, id, route });
}

// Explicit binary answers retain the literal 'Yes'/'No' string contract used
// by validators and every output format. Unlike the former checkbox, a radio
// pair has a real unanswered state: neither option is selected and the model
// remains ''. `binding` permits Annual Accounting's isolated event contract
// without teaching its schedule controls to use the general form listener.
export function yesNoRadioHTML(id,label,val,path,req=false,route='',binding='form',tooltipKey=''){
  return renderYesNoField({ path, label, value: val, id, required: req, route, binding, tooltipKey });
}

export function yesNoCheckboxS(id,label,val,req=false,route=''){
  return yesNoRadioHTML(id,label,val,id,req,route);
}

// Milestone 51C: `setter` used to accept a second shape -- an inline assignment
// string like "D.trusts[0].hasTrust=this.value;navigate('/p8')" -- which this
// function reverse-engineered a path and a route out of with two regexes. Every
// call site passes a plain dot path and the route as the 4th argument, so both
// regexes (and the 5th `explicitRoute` parameter, which nothing ever passed)
// were unreachable and are gone. tests/unit/form-fields.spec.js fails if a new
// call site reintroduces the inline shape, which would otherwise yield an empty
// path and silently stop recording the filer's answer.
export function yesNoCheckboxD(label,val,setter,reqOrRoute=false){
  const path=setter||'';
  const route=typeof reqOrRoute==='string'&&reqOrRoute.startsWith('/')?reqOrRoute:'';
  const req=typeof reqOrRoute==='boolean'?reqOrRoute:false;
  return yesNoRadioHTML(path||label,label,val,path,req,route);
}

// Milestone 67F: `route` was hardcoded '' here, so Annual's "Restricted
// depository?" could never reveal its receipt-date field on the click.
export function yesNoRadioAnnualHTML(id,label,val,path,req=false,tooltipKey='',route=''){
  return yesNoRadioHTML(id,label,val,path,req,route,'annual',tooltipKey);
}

// Inline radio group. Also used later for the Annual/Initial plans' 3-way
// ADL ratings ("no help" / "some assistance" / "cannot do at all"), which is
// why the options are a parameter rather than hardcoded Yes/No.
export function radioP(id,label,val,options=['Yes','No'],req=false,hint='',route=''){
  return renderRadioGroupField({ path: id, label, value: val, options, required: req, hint, id, route });
}

export function pageNavS(prev,next){
  const targetRoute=next||'/print';
  const label=next?'Next →':'Preview & Export →';
  return `<div class="page-nav-wrap no-print">
    <div class="page-nav d-flex justify-content-between align-items-center">
      ${prev?`<button class="btn btn-outline-primary btn-sm" data-form-action="navigate" data-route="${esc(prev)}">← Back</button>`:'<span></span>'}
      <button id="page-next-btn" class="btn btn-primary btn-sm" data-form-action="navigate" data-route="${esc(targetRoute)}">${label}</button>
    </div>
    <div id="page-local-guidance"></div>
  </div>`;
}

// Used by src/features/plan-simplified/print.js (via window.tdSig) --
// stays here rather than moving into that lazily-imported module. Despite
// an earlier comment's claim, Plan Annual's print builder never actually
// called this: it uses its own local y()/line()/fld()/boxes() helpers
// instead (confirmed by a fresh read while extracting it, Milestone 4).
export function tdSig(label,val){return td(label,val);}

// Shared section wrapper, mirroring the Simplified Plan's q() helper.
// Milestone 73F part 3: the asterisk a required question's title, check-group
// label or table caption carries (tests/e2e/asterisks-follow-rules.spec.ts
// holds every page's asterisks to what the export checks require).
export const REQ_MARK = '<span class="req">*</span>';

export function planQ(num,title,body,intro){
  // Milestone 74L: a check group in the question with no label of its own is
  // named by the question's heading (planCheckGroup()'s data-plan-q-group).
  const headingId=`plan-q-${String(num).toLowerCase().replace(/[^a-z0-9]+/g,'-')}-heading`;
  return `<div class="plan-question">
    <div class="plan-question-num">Question ${num}</div>
    <h2 id="${headingId}" style="font-size:.95rem;font-weight:650;color:var(--ink);margin-bottom:.7rem;line-height:1.45;">${title}</h2>
    ${intro?`<div class="plan-field-hint" style="margin-bottom:.7rem;">${intro}</div>`:''}
    ${String(body).split('data-plan-q-group>').join(`aria-labelledby="${headingId}">`)}
  </div>`;
}

// "Check all that apply" group with an optional free-text explanation that
// only appears once a box requiring one is ticked.
// Milestone 74L: a fieldset, so the group's caption names the group and not
// its first checkbox (the label linker bound a caption with no `for` to the
// first box: "Check all that apply: The Ward was declared..."). A group with
// no caption is named by its question's heading (planQ()).
export function planCheckGroup(label,boxes,explainId,explainVal,explainWhen,hint){
  return `<fieldset class="mb-3" ${label?'':'data-plan-q-group'}>
    ${label?`<legend class="form-label">${label}</legend>`:''}
    ${hint?`<div class="plan-field-hint">${hint}</div>`:''}
    <div class="plan-check-grid">${boxes}</div>
    ${explainWhen?`<div class="plan-conditional mt-2">${txtP(explainId,'Explanation',explainVal,3)}</div>`:''}
  </fieldset>`;
}

// td() emits display:table-row divs (not real <table> markup) — used only
// for the key-value "layout" blocks (Required Info, schedule totals, audit
// fee, etc). display:table-row/table-cell renders pixel-identical to a real
// table, but isn't flagged by accessibility tools as a misused layout table.
export function td(...cols){return `<div class="tr">${cols.map(c=>`<div class="td">${c||''}</div>`).join('')}</div>`;}
