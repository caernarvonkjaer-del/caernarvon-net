// Milestone 70, 70H: the guided tours -- one per filing type and the
// dashboard's -- and stepping through them. Moved from legacy-app.js's
// WALKTHROUGH SYSTEM.
import { formEngine } from '../filing/filing-registry.js';
import { helpPanelOpen, toggleHelpPanel } from './help-panel.js';
import { saveAppState } from '../persistence/launch-preferences.js';
import { getActiveInventoryType } from '../state.js';

export const WALKTHROUGH_GUARDIAN=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for field guidance, the User Guide, backup controls, shared records, the Activity Log, and the guided tour.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. Each filing is stored in the case file and keeps its own progress.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Use the sun/moon button to switch light or dark mode. This display preference is remembered on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'The progress indicator updates as you work. Use “Jump to…” to open an incomplete section; review the readiness panel before exporting.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case and guardian information shown on the filing. The sidebar then takes you through the inventory schedules, preparer and attorney sections, bond information, and Certificate of Service.',position:'bottom'},
  {element:'[data-nav="b1"]',title:'6. Inventory schedules',text:'Complete the schedules that apply to this filing. Add rows when needed, and review the calculated totals after entering values.',position:'right'},
  {element:'[data-nav="d5"]',title:'7. Certificate of Service',text:'Review the recipients and attestation in the Certificate of Service section. The app can check entered fields, but it cannot determine whom you must serve.',position:'bottom'},
  {element:'[data-page="/print"]',title:'8. Print Preview',text:'Print Preview lists missing items and readiness reminders. Review the filing, then export the available PDF or Excel output; save a .sav backup separately.',position:'left'},
];

export const WALKTHROUGH_SIMPLIFIED=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for Simplified Annual Accounting guidance, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. Your case file keeps each filing separate.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find incomplete sections, then check Print Preview readiness.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case information for this accounting period.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Accounting Summary',text:'Enter the balances, income, expenses, and other fields shown on this page. Review the calculated result before signing.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'7. Signatures',text:'Complete the signature section for the people shown in the filing. Do not treat the tour as legal advice.',position:'bottom'},
  {element:'[data-page="/print"]',title:'8. Print Preview',text:'Review missing items and readiness reminders, then export the PDF. Simplified Annual Accounting does not offer Excel output.',position:'left'},
];

// Annual, Final, and Trust Accounting share the same schedule workspace.
export const WALKTHROUGH_ANNUAL=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for Annual, Final, or Trust Accounting guidance, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. Annual, Final, and Trust Accounting use the same accounting workspace with their own filing record.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find incomplete sections. A schedule prompt is a navigation aid; Print Preview is where export readiness is checked.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case and accounting-period information shown on this filing.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Certification',text:'Review the certification information shown on this page before continuing.',position:'bottom'},
  {element:'[data-nav="a-scha"]',title:'7. Accounting schedules',text:'Work through the schedules in the sidebar: income, disbursements, capital adjustments, assets and liabilities, transfers, and sales. The exact fields depend on the filing.',position:'right'},
  {element:'[data-page="/p3"]',title:'8. Signatures',text:'Complete the signature section and review the Certificate of Service fields in the filing. The app records entered information; it does not determine service obligations.',position:'bottom'},
  {element:'[data-page="/print"]',title:'9. Print Preview',text:'Review missing items, readiness reminders, totals, and the rendered filing, then export the available PDF or Excel output.',position:'left'},
];

export const WALKTHROUGH_PLAN_SIMPLIFIED=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for this plan, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. A Plan records information about the ward as a person; an Accounting records money and property.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find unanswered sections.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case and reporting-period information shown on this plan.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Plan pages',text:'Complete the questions and records presented by this plan. Add rows where the page provides an Add control.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'7. Signatures',text:'Review the signature and contact fields shown on the filing.',position:'bottom'},
  {element:'[data-page="/print"]',title:'8. Print Preview',text:'Review missing items and readiness reminders, then export the PDF. This plan has no Excel output.',position:'left'},
];

export const WALKTHROUGH_PLAN_ANNUAL=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for this plan, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. A Plan records the ward\'s residence, care, and wellbeing.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find unfinished sections.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case, reporting-period, and current-residence information shown on this plan.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Residence and care',text:'Complete the residence, care, treatment, skills, rights, and daily-living pages presented by the plan.',position:'right'},
  {element:'[data-page="/p11"]',title:'7. Signatures',text:'Review the guardian and attorney fields shown on the filing.',position:'right'},
  {element:'[data-page="/print"]',title:'8. Print Preview',text:'Review missing items and readiness reminders, then export the PDF. This plan has no Excel output.',position:'left'},
];

export const WALKTHROUGH_PLAN_INITIAL=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for this plan, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. Each filing remains separate in the case file.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find unfinished sections.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case and guardianship information shown on this initial plan.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Plan pages',text:'Complete the residential setting, care, provider, daily-living, and advance-directive pages presented by the plan.',position:'right'},
  {element:'[data-page="/p9"]',title:'7. Signatures',text:'Review the guardian signature and contact fields shown on the filing.',position:'right'},
  {element:'[data-page="/print"]',title:'8. Print Preview',text:'Review missing items and readiness reminders, then export the PDF. This plan has no Excel output.',position:'left'},
];

export const WALKTHROUGH_PLAN_MINOR=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for this plan, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. Each filing remains separate in the case file.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find unfinished sections.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the UCN, case number, reporting period, and other fields shown on this minor filing.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'6. Treatment providers',text:'Complete the provider records presented by the plan, adding rows where needed.',position:'right'},
  {element:'[data-page="/p6"]',title:'7. Signatures',text:'Review the guardian signature fields shown on the filing.',position:'right'},
  {element:'[data-page="/p7"]',title:'8. Preparer and attorney',text:'Complete the preparer and attorney fields shown on this filing.',position:'right'},
  {element:'[data-page="/print"]',title:'9. Print Preview',text:'Review missing items and readiness reminders, then export the PDF. This plan has no Excel output.',position:'left'},
];

export const WALKTHROUGH_DASHBOARD=[
  {element:'#help-toggle-btn',title:'1. Help & Guidance',text:'Click "?" for in-app help, the User Guide, Activity Log, shared party records, backup controls, and the guided tour.',position:'left'},
  {element:'#new-ward-btn, [data-dashboard-action="add-ward"]',title:'2. Create New Filing',text:'Choose a current filing type: Initial Inventory, Simplified Annual Accounting, Annual Accounting, Final Accounting, Trust Accounting, Simplified Annual Plan, Annual Guardianship Plan, Initial Guardianship Plan, or Annual Plan — Minors. Starting a new case also asks how to protect the case data.',position:'bottom'},
  {element:'.dashboard-summary-strip',title:'3. Status Overview',text:'Tracks urgent action items and approaching deadlines across all active wards.',position:'bottom'},
  {element:'#dashboard-search',title:'4. Search & Filter',text:'Quickly locate any filing by ward name, case number, or contact details.',position:'bottom'},
  {element:'#theme-toggle-btn',title:'5. Light & Dark Appearance',text:'Switch between light and dark mode here. Your preference is remembered across sessions on this device.',position:'left'},
  {element:'.dashboard-triage-queue, .dashboard-empty',title:'6. All Filings Queue',text:'Resume, edit, close, or find filings from one place. The case file is a local .sav file: use Save Backup (.sav) and Open Backup (.sav) to move or restore it. Automatic saving depends on the browser and an authorized file; keep manual backups.',position:'top'},
];

export let WALKTHROUGH_STEPS=[];

export let currentWalkthroughStep=0;

export let walkthroughActive=false;

export let _walkthroughAutoTriggered=false;

export function startWalkthrough(){
  if(helpPanelOpen)toggleHelpPanel();
  walkthroughActive=true;
  currentWalkthroughStep=0;
  if(getActiveInventoryType()==='guardian')WALKTHROUGH_STEPS=WALKTHROUGH_GUARDIAN;
  else if(getActiveInventoryType()==='simplified')WALKTHROUGH_STEPS=WALKTHROUGH_SIMPLIFIED;
  else if(formEngine(getActiveInventoryType())==='annual')WALKTHROUGH_STEPS=WALKTHROUGH_ANNUAL;
  else if(getActiveInventoryType()==='planSimplified')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_SIMPLIFIED;
  else if(getActiveInventoryType()==='planAnnual')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_ANNUAL;
  else if(getActiveInventoryType()==='planInitial')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_INITIAL;
  else if(getActiveInventoryType()==='planMinor')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_MINOR;
  else WALKTHROUGH_STEPS=WALKTHROUGH_DASHBOARD;
  document.getElementById('walkthrough-overlay').classList.add('active');
  showWalkthroughStep();
}

export function showWalkthroughStep(){
  if(currentWalkthroughStep>=WALKTHROUGH_STEPS.length){
    endWalkthrough();
    return;
  }
  const step=WALKTHROUGH_STEPS[currentWalkthroughStep];
  const sidebarTarget=step.element.startsWith('[data-page')||step.element.startsWith('[data-nav');
  const el=document.querySelector(sidebarTarget?`#sidebar ${step.element}`:step.element);
  if(!el){currentWalkthroughStep++;showWalkthroughStep();return;}

  // Scroll element into view, centered
  el.scrollIntoView({behavior:'smooth',block:'center'});

  // Re-get rect after scroll
  setTimeout(()=>{
    const rect=el.getBoundingClientRect();
    const tooltip=document.getElementById('walkthrough-tooltip');
    const overlay=document.getElementById('walkthrough-overlay');
    if(!overlay.querySelector('.walkthrough-highlight')){
      const highlight=document.createElement('div');
      highlight.className='walkthrough-highlight';
      overlay.appendChild(highlight);
    }
    const highlight=overlay.querySelector('.walkthrough-highlight');
    highlight.style.left=(rect.left-6)+'px';
    highlight.style.top=(rect.top-6)+'px';
    highlight.style.width=(rect.width+12)+'px';
    highlight.style.height=(rect.height+12)+'px';

    // Update progress
    const progress=currentWalkthroughStep+1;
    const total=WALKTHROUGH_STEPS.length;
    const progressPct=(progress/total)*100;
    document.getElementById('walkthrough-title').textContent=step.title;
    document.getElementById('walkthrough-text').textContent=step.text;
    document.getElementById('walkthrough-progress').textContent=`${progress}/${total}`;
    const progressBar=document.querySelector('#walkthrough-progress-bar div');
    if(progressBar)progressBar.style.width=progressPct+'%';

    tooltip.style.display='block';
    // Shrinks on narrow screens so the tooltip never exceeds the viewport —
    // matches the CSS max-width:calc(100vw - 32px) on .walkthrough-tooltip.
    const tooltipW=Math.min(360,window.innerWidth-2*20), tooltipH=200, pad=20, gap=25;
    // Only reserve room for the sidebar where it's actually taking up
    // screen space. Below the mobile breakpoint the sidebar is an
    // off-canvas drawer (closed by default) reporting itself off-screen, so
    // this naturally collapses to 0 there instead of forcing the tooltip
    // past the right edge of a narrow viewport.
    const sidebarRectNow=document.getElementById('sidebar').getBoundingClientRect();
    const sidebarW=Math.max(0,Math.min(sidebarRectNow.right,window.innerWidth-tooltipW-pad));

    // Prefer right positioning (away from sidebar), then bottom, top, left
    const positions=[
      {name:'right',top:rect.top-tooltipH/2+rect.height/2,left:rect.right+gap},
      {name:'bottom',top:rect.bottom+gap,left:rect.left-tooltipW/2+rect.width/2},
      {name:'top',top:rect.top-tooltipH-gap,left:rect.left-tooltipW/2+rect.width/2},
      {name:'left',top:rect.top-tooltipH/2+rect.height/2,left:rect.left-tooltipW-gap}
    ];

    let best=positions[0];
    for(const pos of positions){
      const clampedLeft=Math.max(pad, Math.min(pos.left, window.innerWidth-tooltipW-pad));
      const clampedTop=Math.max(pad, Math.min(pos.top, window.innerHeight-tooltipH-pad));

      // Check if tooltip would overlap with sidebar or highlighted element
      const tooltipRect={left:clampedLeft,top:clampedTop,right:clampedLeft+tooltipW,bottom:clampedTop+tooltipH};
      const elemRect={left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom};
      const sidebarRect={left:0,top:0,right:sidebarW,bottom:window.innerHeight};

      // Check collision with element and sidebar
      const overlapElement=!(tooltipRect.right<elemRect.left||tooltipRect.left>elemRect.right||tooltipRect.bottom<elemRect.top||tooltipRect.top>elemRect.bottom);
      const overlapSidebar=!(tooltipRect.right<sidebarRect.left||tooltipRect.left>sidebarRect.right||tooltipRect.bottom<sidebarRect.top||tooltipRect.top>sidebarRect.bottom);

      if(!overlapElement && !overlapSidebar){
        best=pos;
        break;
      }
    }

    let top=Math.max(pad, Math.min(best.top, window.innerHeight-tooltipH-pad));
    // minLeft is capped at the same maxLeft used below so the two can never
    // cross — on a screen too narrow to both clear the sidebar AND fit the
    // tooltip, fitting inside the viewport wins over clearing the sidebar.
    const maxLeft=window.innerWidth-tooltipW-pad;
    const minLeft=Math.min(sidebarW+pad,maxLeft);
    let left=Math.max(minLeft, Math.min(best.left, maxLeft));
    tooltip.style.top=top+'px';
    tooltip.style.left=left+'px';
  },300);
}

export function nextWalkthroughStep(){currentWalkthroughStep++;showWalkthroughStep();}

export function skipWalkthrough(){endWalkthrough();}

export function endWalkthrough(){
  walkthroughActive=false;
  document.getElementById('walkthrough-overlay').classList.remove('active');
  document.getElementById('walkthrough-tooltip').style.display='none';
  if(_walkthroughAutoTriggered)saveAppState('walkthroughCompleted','true');
}
