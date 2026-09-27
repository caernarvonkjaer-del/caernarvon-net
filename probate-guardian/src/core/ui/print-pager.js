// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js imports it); moved
// as text from legacy-app.js in Milestone 70's 70F, never written with JSDoc types.
// Milestone 70, 70F: the Print Preview pager every form's preview shares --
// which pages show, stepping through them, and their labels. Moved from
// legacy-app.js's PRINT-PREVIEW PAGER.
import { esc } from '../filing/escape-html.js';
import { ic } from './icons.js';

export let _pvSelection='1';

export function pvPages(){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return [];
  return [...cont.children].filter(el=>el.classList&&el.classList.contains('pdf-page'));
}

export function pvLabelFor(page,i){
  // docHeader() puts "<Schedule> — Page <n>" in the middle cell of .doc-meta.
  const meta=page.querySelector('.doc-meta');
  if(meta){
    const spans=meta.querySelectorAll('span');
    if(spans.length>=2){
      const t=spans[1].textContent.replace(/\s+/g,' ').trim();
      if(t)return t;
    }
  }
  const title=page.querySelector('.doc-schedule-title');
  if(title){
    const t=title.textContent.replace(/\s+/g,' ').trim();
    if(t)return t;
  }
  return 'Page '+(i+1);
}

// Drop the viewing filter so every page is in the layout. Called before any
// export or print, and by the "All pages" option.
export function pvShowAll(){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return;
  cont.classList.remove('pv-single');
  pvPages().forEach(p=>p.classList.remove('pv-show'));
}

export function pvApply(){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return;
  const pages=pvPages();
  if(_pvSelection==='all'||pages.length<2){pvShowAll();}
  else{
    let idx=parseInt(_pvSelection,10)-1;
    if(!(idx>=0&&idx<pages.length))idx=0;
    cont.classList.add('pv-single');
    pages.forEach((p,i)=>p.classList.toggle('pv-show',i===idx));
  }
  const sel=document.getElementById('pv-select');
  if(sel&&sel.value!==_pvSelection)sel.value=_pvSelection;
  const count=document.getElementById('pv-count');
  if(count){
    count.textContent=_pvSelection==='all'
      ? `All ${pages.length} pages`
      : `Page ${parseInt(_pvSelection,10)} of ${pages.length}`;
  }
  const prev=document.getElementById('pv-prev'),next=document.getElementById('pv-next');
  const n=parseInt(_pvSelection,10);
  if(prev)prev.disabled=(_pvSelection==='all'||n<=1);
  if(next)next.disabled=(_pvSelection==='all'||n>=pages.length);
}

export function pvSelect(v){
  _pvSelection=v;
  pvApply();
  // .pv-bar is sticky (position:sticky;top), so it never has to be scrolled
  // into view — it's pinned at a fixed screen position no matter how tall
  // the page below it is, which is what makes Next/Prev clickable repeatedly
  // without moving the mouse. This just scrolls the new page's own content
  // to the top; #print-doc-container's scroll-margin-top keeps that top
  // edge from landing underneath the sticky bar.
  const cont=document.getElementById('print-doc-container');
  if(cont&&cont.scrollIntoView)cont.scrollIntoView({block:'start',behavior:'smooth'});
}

export function pvStep(delta){
  const pages=pvPages();
  if(_pvSelection==='all')return;
  let n=parseInt(_pvSelection,10)+delta;
  n=Math.max(1,Math.min(pages.length,n));
  pvSelect(String(n));
}

export function initPrintPager(options={}){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return;
  const pages=pvPages();
  // The filing-level shell actions belong to the Preview & Export banner,
  // regardless of whether the generated filing needs a multi-page pager.
  // This must run before the single-page early return below; otherwise those
  // previews lose All Filings, theme, and Help entirely.
  const destination=document.querySelector('[data-preview-shell-actions]');
  const headerActions=document.querySelector('.schedule-page > h1 .form-header-actions, .schedule-page h1 .form-header-actions');
  if(headerActions&&destination&&!destination.querySelector('.pv-shell-actions')){
    headerActions.classList.remove('form-header-actions');
    headerActions.classList.add('pv-shell-actions');
    destination.appendChild(headerActions);
  }else if(destination&&!destination.querySelector('.pv-shell-actions')){
    const isDark=document.documentElement.getAttribute('data-theme')==='dark';
    // "?" in a filing opens the manual, not the Help panel: see the router's
    // attachFormHeaderActions(). (master ae9ecdc, carried.)
    const shellActions=document.createElement('div');
    shellActions.className='pv-shell-actions';
    shellActions.innerHTML=`<button type="button" class="topnav-btn" data-shell-action="dashboard">${ic('home',16)} All Filings</button><button type="button" class="topnav-btn topnav-theme" id="theme-toggle-btn" data-shell-action="toggle-theme" title="Switch theme" aria-label="Switch to ${isDark?'light':'dark'} theme" aria-pressed="${isDark}">${ic(isDark?'sun':'moon',16)}</button><button type="button" class="topnav-btn topnav-help" id="help-toggle-btn" data-shell-action="toggle-help" title="Help: open the user guide for this page (new tab)" aria-label="Help: open the user guide for this page (new tab)">?</button>`;
    destination.appendChild(shellActions);
  }
  if(pages.length<2)return;                       // nothing to page through
  const existing=document.getElementById('pv-bar');
  if(existing){
    if(!options.refresh)return;
    const existingActions=existing.querySelector('.pv-shell-actions');
    const destination=document.querySelector('[data-preview-shell-actions]');
    if(existingActions&&destination)destination.replaceChildren(existingActions);
    existing.remove();
  }
  if(!(_pvSelection==='all'||(parseInt(_pvSelection,10)>=1&&parseInt(_pvSelection,10)<=pages.length))){
    _pvSelection='1';
  }
  const opts=pages.map((p,i)=>
    `<option value="${i+1}">${i+1}. ${esc(pvLabelFor(p,i))}</option>`).join('');
  const bar=document.createElement('div');
  bar.id='pv-bar';
  bar.className='pv-bar no-print';
  bar.innerHTML=`
    <span class="pv-viewing"><span class="pv-label">Viewing</span>
      <select id="pv-select" class="form-select form-select-sm pv-select"
              aria-label="Choose which page of the filing to preview"
              data-form-change="preview-page">
        ${opts}
        <option value="all">All pages (continuous)</option>
      </select>
    </span>
    <span class="pv-navigation"><span class="pv-count" id="pv-count"></span>
      <span class="pv-nav">
        <button type="button" class="btn btn-sm btn-outline-secondary" id="pv-prev" data-form-action="preview-step" data-step="-1">← Prev</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" id="pv-next" data-form-action="preview-step" data-step="1">Next →</button>
      </span>
    </span>`;
  cont.parentNode.insertBefore(bar,cont);
  pvApply();
}
