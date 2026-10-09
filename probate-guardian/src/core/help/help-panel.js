// @ts-nocheck -- in tsconfig.json's checked program only transitively (the router imports it); 
// moved as text from legacy-app.js in Milestone 70's 70H.
// Milestone 70, 70H: the Help panel -- its content by page, opening and
// closing it, and keeping it on the page the filer is on. Moved from
// legacy-app.js's HELP SYSTEM.
import { formEngine } from '../filing/filing-registry.js';
import { HELP_CONTENT } from './help-content.js';
import { getActiveInventoryType, getCaseFile } from '../state.js';

export let helpPanelOpen = false;

export let currentHelpContext = 'dashboard';

// The Help text by page is ./help-content.js's (Milestone 48 separated it
// from the code; the monolith reached it through a Proxy over window).

export function toggleHelpPanel(){
  helpPanelOpen=!helpPanelOpen;
  const panel=document.getElementById('help-panel');
  // Only the buttons that really open this panel (the dashboard's "?"); a
  // filing's "?" opens the manual instead and carries no disclosure state.
  // (master ae9ecdc, carried.)
  const btns=document.querySelectorAll('[aria-controls="help-panel"]');
  panel.style.display=helpPanelOpen?'flex':'none';
  // Milestone 73L (decision 73L-1): on a window wide enough, the page moves
  // over to make room (shell.css); the panel covered the dashboard's toolbar
  // and Actions column. Narrower, it still lies over the page.
  document.body.classList.toggle('help-panel-open',helpPanelOpen);
  btns.forEach(btn=>btn.setAttribute('aria-expanded',String(helpPanelOpen)));
  if(helpPanelOpen){
    updateHelpContext();
    showContextualHelp();
    // Move focus into the panel so a keyboard/screen-reader user lands
    // somewhere meaningful, not stranded on a now off-screen-adjacent button.
    const closeBtn=document.querySelector('.help-panel-close');
    if(closeBtn)closeBtn.focus();
  }else if(btns.length){
    // Closing (via the close button, Escape, or toggling the "?" again)
    // returns focus to the control that opened it, so keyboard users don't
    // lose their place in the page.
    btns[0].focus();
  }
}

export function showContextualHelp(){
  const content=HELP_CONTENT[currentHelpContext]||HELP_CONTENT['default'];
  if(!content)return;
  const body=typeof content.content==='function'?content.content():content.content;
  const panel=document.getElementById('help-panel-content');
  panel.innerHTML=`<h3>${content.title}</h3>${body}`;
  panel.scrollTop=0;
}

export function updateHelpContext(context){
  // A page that is not a filing's names its own help (the router passes the
  // dashboard's, the Start New Form picker's); otherwise the open filing's
  // form decides. The argument was ignored until Milestone 70's 70H, so Help
  // on the Start New Form page showed the dashboard's welcome.
  if(context&&Object.prototype.hasOwnProperty.call(HELP_CONTENT,context)){
    currentHelpContext=context;
  }else if(!getCaseFile().activeWardId){
    // At dashboard or no ward yet
    currentHelpContext='default';
  }else if(getActiveInventoryType()==='guardian'){
    currentHelpContext='guardian-inventory';
  }else if(getActiveInventoryType()==='simplified'){
    currentHelpContext='simplified-accounting';
  }else if(formEngine(getActiveInventoryType())==='annual'){
    currentHelpContext='annual-accounting';
  }else if(getActiveInventoryType()==='planSimplified'){
    currentHelpContext='plan-simplified';
  }else if(getActiveInventoryType()==='planAnnual'){
    currentHelpContext='plan-annual';
  }else if(getActiveInventoryType()==='planInitial'){
    currentHelpContext='plan-initial';
  }else if(getActiveInventoryType()==='planMinor'){
    currentHelpContext='plan-minor';
  }else{
    currentHelpContext='default';
  }
  if(helpPanelOpen)showContextualHelp();
}

/**
 * Escape closes the Help panel from anywhere inside it and returns focus to
 * the toggle button -- the standard behaviour for a disclosure panel.
 * Installed once by main.js; the signal removes it.
 */
export function installHelpPanelKeys({ signal } = {}){
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'&&helpPanelOpen&&document.getElementById('help-panel')?.contains(document.activeElement)){
      toggleHelpPanel();
    }
  },{ signal });
}
