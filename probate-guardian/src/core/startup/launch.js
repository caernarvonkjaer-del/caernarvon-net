// Milestone 70, 70I: opening or starting a case at launch -- the remembered
// file, the start dialog, opening a .sav (and its password), dropping a file
// on the window, and the unsaved-changes warning. Moved from legacy-app.js's
// OPEN / START AT LAUNCH.
import { refreshAutoSaveArmedStatus, rememberCaseFileHandle } from '../persistence/case-file.js';
import { loadCaseFileFromZip } from '../persistence/case-reader.js';
import { clearCryptoKey, getCryptoKey, getSecurityMode, setSecurityMode } from '../persistence/crypto.js';
import { isDirtySinceExport } from '../persistence/export-state.js';
import { forgetPersistedCaseFileHandle, handleRememberedFileFailure, isRememberedFileUnavailable, loadPersistedCaseFileHandle, markCaseOpenedBefore, readRememberedFile, runRememberedHandleOperation } from '../persistence/launch-preferences.js';
import { clearLastPosition } from '../persistence/recovery-cache.js';
import { promptPasswordForFile } from '../security/app-lock.js';
import { validateImportFile } from '../security/input-hardening.js';
import { appStateObject, getCaseFile } from '../state.js';
import { applyTheme, currentTheme } from '../theme-preference.js';
import { alertModal, ensureFragment } from '../ui/dialogs.js';
import { importGuardianDataZip } from '../persistence/case-import.js';

// The zero-click path: a remembered handle whose read permission the browser
// still honors with no prompt at all. Runs before the startup screen even
// shows, so this is the only path that can be truly zero-click; everywhere
// else still needs the gesture openCaseFileAtLaunch() provides. Startup's
// launch state runs it before the start dialog.
export async function trySilentReopen(){
  let handle=null;
  try{
    handle=await loadPersistedCaseFileHandle();
    if(!handle||!handle.queryPermission)return false;
    if((await runRememberedHandleOperation(()=>handle.queryPermission({mode:'read'})))!=='granted')return false;
    const file=await readRememberedFile(handle);
    const res=await loadCaseFileAtLaunch(file);
    if(res&&res.ok){
      await rememberCaseFileHandle(handle);
      return true;
    }
    return false;
  }catch(e){
    await handleRememberedFileFailure(handle,e);
    return false;
  }
}

// Whether this launch opened a case file (and unlocked it as it opened), for
// startup (startup.js), which then skips asking for a password again.
let _openedFileAtLaunch=false;
export function openedFileAtLaunch(){return _openedFileAtLaunch;}

let _startupChoiceResolve=null;

// The start dialog: open a case file or start a new one. Resolves once a
// file has opened or a new case is started; a wrong password or a damaged
// file leaves it up.
export function showStartChoice(){
  document.getElementById('startup-newcase-btn').style.display='';
  const linkEl=document.getElementById('startup-newcase-link');
  if(linkEl)linkEl.style.display='none';
  const fileStatus=document.getElementById('startup-file-status');
  fileStatus.style.display=isRememberedFileUnavailable()?'block':'none';
  return new Promise((resolve)=>{
    _startupChoiceResolve=resolve;
    document.getElementById('startup-choice-overlay').classList.add('show');
  });
}

export function _resolveStartupChoice(){
  document.getElementById('startup-choice-overlay').classList.remove('show');
  const resolve=_startupChoiceResolve;_startupChoiceResolve=null;
  if(resolve)resolve();
}

export async function startNewWardAtLaunch(){
  _resolveStartupChoice();
  try{ await forgetPersistedCaseFileHandle(); }catch(e){}
  try{ clearLastPosition(); }catch(e){}
}

export const startNewCaseAtLaunch = startNewWardAtLaunch;

// Chrome/Edge: showOpenFilePicker() returns a handle that supports
// createWritable(), so opening a file arms silent auto-save immediately.
// Firefox/Safari implement neither picker — fall back to a plain
// <input type=file>, which can only ever hand back a read-only File.
// Those browsers can open a case file but can never auto-save it (see
// refreshAutoSaveArmedStatus()); that is stated on screen once the file is
// open, not hidden.
//
// trySilentReopen() already tried the fully-silent path with no prompt at
// all before this screen ever showed; reaching here means that either
// failed or was never possible (this is a first visit, a different
// browser, or the earlier grant lapsed). This click is still a real user
// gesture, so it can re-request permission on that SAME remembered
// handle — a small native "Allow?" prompt, not the full picker — before
// falling back to showOpenFilePicker() itself.
export async function openWardFileAtLaunch(){
  const remembered=await loadPersistedCaseFileHandle();
  if(remembered&&remembered.requestPermission){
    try{
      if((await runRememberedHandleOperation(()=>remembered.requestPermission({mode:'read'})))==='granted'){
        const file=await readRememberedFile(remembered);
        const res=await loadCaseFileAtLaunch(file);
        if(res&&res.ok){
          await rememberCaseFileHandle(remembered);
          _resolveStartupChoice();
          return;
        }
      }
    }catch(e){
      await handleRememberedFileFailure(remembered,e);
      const statusEl=document.getElementById('startup-file-status');
      if(statusEl){
        statusEl.textContent='Your previously opened file could not be found or was moved. Click "Open Case File (.sav)" below to select your file.';
        statusEl.style.display='block';
      }
      return; // Return so user can click with a fresh gesture
    }
  }
  if(window.showOpenFilePicker){
    try{
      const [handle]=await window.showOpenFilePicker({
        types:[{description:'Guardian Forms data file',accept:{'application/octet-stream':['.sav']}}]
      });
      const file=await handle.getFile();
      const res=await loadCaseFileAtLaunch(file);
      if(res&&res.ok){
        await rememberCaseFileHandle(handle);
        _resolveStartupChoice();
      }
    }catch(e){
      if(e&&e.name==='AbortError')return; // user cancelled the picker — leave the choice screen up
      if(e&&(String(e.message).includes('user gesture')||String(e).includes('user gesture'))){
        const statusEl=document.getElementById('startup-file-status');
        if(statusEl){
          statusEl.textContent='Click "Open Case File (.sav)" to select a file.';
          statusEl.style.display='block';
        }
        return;
      }
      console.error('Open case file failed',e);
      await alertModal('Could not open that file: '+(e&&e.message||e));
    }
    return;
  }
  document.getElementById('startup-open-input').click();
}

export const openCaseFileAtLaunch = openWardFileAtLaunch;

export async function handleStartupOpenInputChange(input){
  const file=input.files[0];
  input.value='';
  if(!file)return;
  // No handle to remember here — a plain <input> never yields a writable
  // one. loadCaseFileAtLaunch() -> refreshAutoSaveArmedStatus() already
  // says so on screen once this resolves.
  const ok=await loadCaseFileAtLaunch(file);
  if(ok)_resolveStartupChoice();
}

// Shared by both pickers above: validate, parse, ask for a password if the
// file is encrypted, then hand off to loadCaseFileFromZip(). Returns true
// on success (state is now populated and the key is held if needed) or
// false (already reported to the user; the startup choice screen stays up
// so they can try again or start a new case instead).
export async function loadCaseFileAtLaunch(file){
  try{
    const check=await validateImportFile(file,'sav');
    if(!check.ok){await alertModal(check.message);return false;}
    if(typeof JSZip==='undefined'){await alertModal('ZIP library failed to load — cannot open this file.');return false;}
    const zip=await JSZip.loadAsync(file);
    const manifestEntry=zip.file('manifest.json');
    if(!manifestEntry){await alertModal('Not a Guardian Forms data file (no manifest.json inside).');return false;}
    const manifest=JSON.parse(await manifestEntry.async('string'));
    if(manifest.format!=='probate-guardian-case'){await alertModal('Not a Guardian Forms data file.');return false;}
    setSecurityMode(manifest.securityMode||(manifest.salt?'encrypted':'none'));
    if(getSecurityMode()==='encrypted'){
      await promptPasswordForFile(manifest,zip); // holds the key; only resolves on a verified password
    }else{
      clearCryptoKey();
    }
    // Hydrate app state directly (not via saveAppState()) so ensureUnlocked()
    // finds securityMode/cryptoSalt/cryptoVerifier already in place without
    // this counting as an edit that needs writing straight back out.
    appStateObject().securityMode=getSecurityMode();
    appStateObject().cryptoSalt=manifest.salt||null;
    appStateObject().cryptoVerifier=manifest.verifier||null;
    await loadCaseFileFromZip(zip,manifest,getCryptoKey());
    // Milestone 40D: this line used to be `if(_appState.theme)applyTheme(...)`,
    // re-applying the FILE's theme once the .sav finished loading. That was the
    // flash this delivery removes, and it also meant opening someone else's file
    // changed your appearance. A loaded file no longer overrides what already
    // painted; the one-time seed below (in loadCaseFileFromZip) is what carries
    // an upgrading user's legacy choice across, exactly once.
    //
    // applyTheme() is still called, with the theme prepaint.js already painted,
    // purely to bring the toggle button's icon/aria state into agreement -- not
    // to change the theme.
    applyTheme(currentTheme(),false);
    _openedFileAtLaunch=true;
    markCaseOpenedBefore();
    refreshAutoSaveArmedStatus(); // covers the plain-<input> path too, where no handle was ever remembered
    return { ok: true, wardId: (getCaseFile().wards[0] && getCaseFile().wards[0].wardId) || null };
  }catch(e){
    clearCryptoKey(); // a file that did not open leaves no key behind
    console.error('Failed to open case file',e);
    await alertModal('Could not open that file: '+(e&&e.message||e));
    return false;
  }
}

// Lets a user drag a .zip data file straight onto the app window instead of
// clicking through the file picker. Started by startup once the case is
// open; a signal removes its listeners. dragCounter (rather than a boolean)
// correctly tracks enter/leave across child elements — dragenter/dragleave
// fire once per element boundary crossed, not just once for the window.
export function setupDragAndDropImport({signal}={}){
  let dragCounter=0;
  // #dropzone-overlay lives in the lazy 'common-modals' fragment, not yet
  // in the DOM when this runs at startup -- a reference captured once here
  // would stay null forever. Look it up fresh each time instead, after
  // ensureFragment() (idempotent) confirms it exists.
  const isFileDrag=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
  window.addEventListener('dragenter',async e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
    dragCounter++;
    await ensureFragment('common-modals');
    const overlay=document.getElementById('dropzone-overlay');
    if(overlay)overlay.style.display='flex';
  },{signal});
  window.addEventListener('dragover',e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
  },{signal});
  window.addEventListener('dragleave',e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
    dragCounter=Math.max(0,dragCounter-1);
    const overlay=document.getElementById('dropzone-overlay');
    if(dragCounter===0&&overlay)overlay.style.display='none';
  },{signal});
  window.addEventListener('drop',async e=>{
    if(!isFileDrag(e)){return;}
    e.preventDefault();
    dragCounter=0;
    const overlay=document.getElementById('dropzone-overlay');
    if(overlay)overlay.style.display='none';
    const files=Array.from(e.dataTransfer.files||[]);
    const zipFile=files.find(f=>{const n=f.name.toLowerCase();return n.endsWith('.sav')||n.endsWith('.zip');});
    if(!zipFile){
      if(files.length)await alertModal('Please drop a Guardian Forms .sav case data file.');
      return;
    }
    await importGuardianDataZip(zipFile);
  },{signal});
}

// beforeunload cannot reliably await either file or IndexedDB writes. The
// recovery snapshot is best-effort, so retain the native dirty-state warning.
// Startup (startup.js) arms it only once the first page is up.
export function warnBeforeUnloadIfDirty(e){
  if(!isDirtySinceExport())return;
  e.preventDefault();
  e.returnValue=''; // required for Chrome to show its native confirmation
}
