// Milestone 70, 70I: unlocking and locking the case -- choosing plain or
// password-protected storage, creating the password, the unlock prompt and
// its failure backoff, the password for a file being opened, locking on
// request and after inactivity. The key itself is crypto.js's, in closure
// memory. Moved from legacy-app.js's ENCRYPTION AT REST.
import { auditLog } from '../activity/audit-log.js';
import { filingLifecycle } from '../navigation/filing-lifecycle.js';
import { decryptCaseFileCore, flushPendingSave, forgetCaseFileHandle, loadCaseFileHandle, newerCaseFileFormatMessage, protectPartiallyReadCaseFile } from '../persistence/case-file.js';
import { isDirtySinceExport } from '../persistence/export-state.js';
import { loadCaseFileFromZip } from '../persistence/case-reader.js';
import { CRYPTO_VERIFIER_PLAINTEXT, clearCryptoKey, decryptJSONWithKey, deriveAndVerifyKey, deriveKeyFromPassword, encryptJSON, generateSaltB64, getCryptoKey, getSecurityMode, setCryptoKey, setSecurityMode } from '../persistence/crypto.js';
import { loadAppState, saveAppState } from '../persistence/launch-preferences.js';
import { readOwnSessionRestoreCache } from '../persistence/recovery-cache.js';
import { monolith } from '../runtime/monolith.js';
import { sanitizeObjectData } from './input-hardening.js';
import { updateSidebar } from '../shell/sidebar.js';
import { getActiveWard, getCaseFile } from '../state.js';
import { alertModal } from '../ui/dialogs.js';
import { releaseWardLock } from '../ward-lock.js';

// Decides whether the user needs to create a master password (fresh install,
// or an existing pre-encryption install with plaintext wards) or unlock with
// one that's already set up, then blocks until a valid key is in memory.
export async function ensureUnlocked(){
  if(!window.crypto||!window.crypto.subtle){
    document.getElementById('main-content').innerHTML=
      '<div style="max-width:520px;margin:3rem auto;text-align:center;color:var(--danger-text);">'
      +'<h2>Secure context required</h2>'
      +'<p>Encryption requires a secure context. Open this file directly (double-click '
      +'<code>index.html</code>) in Chrome or Edge, or serve it via <code>localhost</code> '
      +'(not a LAN IP) — a network address like <code>192.168.x.x</code> does not qualify.</p></div>';
    document.getElementById('sidebar').style.display='none';
    throw new Error('window.crypto.subtle unavailable (insecure context)');
  }
  const storedMode=await loadAppState('securityMode');
  const salt=await loadAppState('cryptoSalt');
  const verifier=await loadAppState('cryptoVerifier');

  if(!storedMode&&!(salt&&verifier)){
    // No mode has been selected. A ward can already be present only when an
    // older .sav file omitted securityMode; otherwise this is a new case.
    setSecurityMode(await promptChooseSecurityMode());
    await saveAppState('securityMode',getSecurityMode()); // stored in the
    // clear, like cryptoSalt — must be readable before any password exists
    if(getSecurityMode()==='none'){
      updateLockButtonVisibility();
      return; // no password, no encryption key, nothing further to do
    }
    await promptCreatePassword(getCaseFile().wards.length>0);
    updateLockButtonVisibility();
    return;
  }

  // Mode already chosen previously — or this is a pre-existing encrypted
  // install from before this feature existed (salt+verifier present with no
  // explicit mode saved yet): treat that case as 'encrypted' for backward
  // compatibility rather than re-asking.
  setSecurityMode(storedMode||(salt&&verifier?'encrypted':'none'));
  updateLockButtonVisibility();

  if(getSecurityMode()==='none')return; // no password gate at all

  if(salt&&verifier){
    // A silent auto-unlock path used to sit here, reading the master password
    // back from the OS credential store through Tauri. No Tauri shell exists
    // in this repo, so it could never fire; the password is always entered.
    await promptUnlock(salt,verifier);
    return;
  }
  await promptCreatePassword(getCaseFile().wards.length>0);
}

// A case file opened at launch was unlocked as it opened (its own password,
// asked by loadCaseFileAtLaunch()), so startup does not ask again: it shows
// the Lock button and starts the inactivity timer, as an unlock does.
export function resumeUnlockedSession(){
  updateLockButtonVisibility();
  resetAutoLockTimer();
}

let _securityChoiceResolve=null;

export function promptChooseSecurityMode(){
  return new Promise((resolve)=>{
    _securityChoiceResolve=resolve;
    document.getElementById('security-choice-overlay').classList.add('show');
  });
}

export function selectSecurityMode(mode){
  document.getElementById('security-choice-overlay').classList.remove('show');
  const resolve=_securityChoiceResolve;_securityChoiceResolve=null;
  if(resolve)resolve(mode);
}

// The Lock button is meaningless with no password to re-enter — hide it in
// 'none' mode so users can't confuse themselves clicking it.
export function updateLockButtonVisibility(){
  const btn=document.getElementById('lock-app-btn');
  if(btn)btn.style.display=getSecurityMode()==='none'?'none':'';
}

let _unlockResolve=null;

let _unlockMode=null; // 'create' | 'unlock' | 'openFile'

export async function promptUnlock(saltB64,verifierPacked){
  return new Promise((resolve)=>{
    _unlockMode='unlock';
    _unlockResolve=resolve;
    const overlay=document.getElementById('unlock-overlay');
    document.getElementById('unlock-title').textContent='Unlock Guardian Forms';
    document.getElementById('unlock-subtitle').textContent='Enter your master password to decrypt your case data.';
    document.getElementById('unlock-confirm-row').style.display='none';
    document.getElementById('unlock-password').value='';
    document.getElementById('unlock-error').style.display='none';
    overlay.dataset.salt=saltB64;
    overlay.dataset.verifier=verifierPacked;
    overlay.classList.add('show');
    document.getElementById('unlock-password').focus();
  });
}

// Same overlay, a different question: not "unlock THIS device's data" but
// "what's the password for the file you just picked". Kept separate from
// promptUnlock() rather than reusing its verifier-equality check, because a
// version-1 .sav file has no dedicated verifier field to compare
// against — see deriveAndVerifyKey(), which this delegates the actual
// check to via the 'openFile' branch of submitUnlockForm(): this password
// belongs to the file, not necessarily to this device's own install.
let _pendingOpenManifest=null,_pendingOpenZip=null;

export function promptPasswordForFile(manifest,zip){
  return new Promise((resolve)=>{
    _unlockMode='openFile';
    _unlockResolve=resolve;
    _pendingOpenManifest=manifest;
    _pendingOpenZip=zip;
    // This can fire while #startup-choice-overlay is still up (its own
    // z-index is higher, since it's normally hidden by the time any later
    // overlay shows) -- opening a file is the one path where that hasn't
    // happened yet, since _resolveStartupChoice() only runs once
    // loadCaseFileAtLaunch() fully succeeds, i.e. after this password is
    // entered. Left showing, it would sit on top and silently swallow every
    // click meant for the password field below. Hiding it here is safe: this
    // flow has no "go back" from an in-progress file open.
    document.getElementById('startup-choice-overlay').classList.remove('show');
    const overlay=document.getElementById('unlock-overlay');
    document.getElementById('unlock-title').textContent='Enter Password';
    document.getElementById('unlock-subtitle').textContent='This case file is encrypted. Enter the master password it was saved under.';
    document.getElementById('unlock-confirm-row').style.display='none';
    document.getElementById('unlock-password').value='';
    document.getElementById('unlock-error').style.display='none';
    overlay.dataset.salt=manifest.salt||'';
    overlay.classList.add('show');
    document.getElementById('unlock-password').focus();
  });
}

export function promptCreatePassword(hasExistingData){
  return new Promise((resolve)=>{
    _unlockMode='create';
    _unlockResolve=resolve;
    const overlay=document.getElementById('unlock-overlay');
    document.getElementById('unlock-title').textContent=hasExistingData?'Secure Your Existing Data':'Create a Master Password';
    document.getElementById('unlock-subtitle').textContent=hasExistingData
      ?'This app now encrypts case data at rest. Choose a master password — your existing wards will be encrypted with it.'
      :'Choose a master password to encrypt all case data stored on this device.';
    document.getElementById('unlock-confirm-row').style.display='block';
    document.getElementById('unlock-password').value='';
    document.getElementById('unlock-password-confirm').value='';
    document.getElementById('unlock-error').style.display='none';
    overlay.classList.add('show');
    document.getElementById('unlock-password').focus();
  });
}

// The password is not left in the dialog's fields once it has been used.
function clearPasswordFields(){
  for(const id of ['unlock-password','unlock-password-confirm']){
    const el=document.getElementById(id);
    if(el)el.value='';
  }
}

export function showUnlockError(msg){
  const el=document.getElementById('unlock-error');
  el.textContent=msg;
  el.style.display='block';
}

// Rate-limits guesses at the unlock screen itself. This doesn't stop an
// offline attacker who copies the encrypted files and brute-forces them
// outside the app (PBKDF2's 210k iterations is the only defense against
// that) — it stops someone with physical access to a locked screen from
// just sitting there trying passwords one after another through the UI.
// The counter lives in app state and is included in the next .sav write or
// temporary recovery snapshot.
export const UNLOCK_FAIL_THRESHOLD=5;

export const UNLOCK_LOCKOUT_BASE_MS=30*1000;

export const UNLOCK_LOCKOUT_MAX_MS=5*60*1000;

export async function getUnlockFailState(){
  const state=await loadAppState('unlockFailState');
  return state||{count:0,lockoutUntil:0};
}

export async function saveUnlockFailState(state){
  await saveAppState('unlockFailState',state);
}

export function formatLockoutRemaining(ms){
  const s=Math.ceil(ms/1000);
  return s>=60?`${Math.ceil(s/60)} minute${s>=120?'s':''}`:`${s} second${s===1?'':'s'}`;
}

export async function submitUnlockForm(){
  const btn=document.getElementById('unlock-submit-btn');
  const pw=document.getElementById('unlock-password').value;
  btn.disabled=true;
  try{
    if(_unlockMode==='create'){
      const confirmPw=document.getElementById('unlock-password-confirm').value;
      if(!pw||pw.length<8){showUnlockError('Password must be at least 8 characters.');return;}
      if(pw!==confirmPw){showUnlockError('Passwords do not match.');return;}
      const saltB64=generateSaltB64();
      // The key is derived into this function and held for the session only
      // once the verifier that proves it is saved (Milestone 70, 70I).
      try{
        const key=await deriveKeyFromPassword(pw,saltB64);
        const verifier=await encryptJSON(CRYPTO_VERIFIER_PLAINTEXT,key,'encrypted');
        await saveAppState('cryptoSalt',saltB64);
        await saveAppState('cryptoVerifier',verifier);
        setCryptoKey(key);
      }catch(e){
        clearCryptoKey();
        throw e;
      }
      clearPasswordFields();
      await auditLog('PASSWORD_CREATED', 'Master password created', true);
      resetAutoLockTimer();
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }else if(_unlockMode==='unlock'){
      const overlay=document.getElementById('unlock-overlay');
      const saltB64=overlay.dataset.salt;
      const verifierPacked=overlay.dataset.verifier;
      if(!pw){showUnlockError('Please enter your password.');return;}

      const failState=await getUnlockFailState();
      const now=Date.now();
      if(failState.lockoutUntil>now){
        showUnlockError(`Too many incorrect attempts. Try again in ${formatLockoutRemaining(failState.lockoutUntil-now)}.`);
        return;
      }

      // Derived and checked here; held for the session only once it verifies.
      try{
        const key=await deriveKeyFromPassword(pw,saltB64);
        const decoded=await decryptJSONWithKey(verifierPacked,key);
        if(decoded!==CRYPTO_VERIFIER_PLAINTEXT)throw new Error('verifier mismatch');
        setCryptoKey(key);
      }catch(e){
        clearCryptoKey();
        const newCount=failState.count+1;
        let lockoutUntil=0;
        await auditLog('UNLOCK_FAILED', `Incorrect password attempt ${newCount}`, false);
        if(newCount>=UNLOCK_FAIL_THRESHOLD){
          const backoffMs=Math.min(UNLOCK_LOCKOUT_BASE_MS*Math.pow(2,newCount-UNLOCK_FAIL_THRESHOLD),UNLOCK_LOCKOUT_MAX_MS);
          lockoutUntil=now+backoffMs;
          await saveUnlockFailState({count:newCount,lockoutUntil});
          await auditLog('UNLOCK_LOCKOUT', `Account locked after ${newCount} failed attempts`, false);
          showUnlockError(`Incorrect password. Too many attempts — try again in ${formatLockoutRemaining(backoffMs)}.`);
        }else{
          await saveUnlockFailState({count:newCount,lockoutUntil:0});
          showUnlockError('Incorrect password. Please try again.');
        }
        return;
      }

      clearPasswordFields();
      await saveUnlockFailState({count:0,lockoutUntil:0});
      await auditLog('UNLOCK_SUCCESS', 'User successfully unlocked the application', true);
      resetAutoLockTimer();
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }else if(_unlockMode==='openFile'){
      if(!pw){showUnlockError('Please enter your password.');return;}
      try{
        setCryptoKey(await deriveAndVerifyKey(pw,_pendingOpenManifest,_pendingOpenZip));
      }catch(e){
        clearCryptoKey();
        showUnlockError('Incorrect password for this file.');
        return;
      }
      clearPasswordFields();
      _pendingOpenManifest=null;_pendingOpenZip=null;
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }
  }finally{
    btn.disabled=false;
  }
}

// Flushes pending work, clears the key and decrypted case data from memory,
// then requires the password again. After the unlock the case comes back from
// the open .sav file when the flush wrote everything to it; otherwise -- no
// file yet, or changes the file does not have because this browser may only
// read it -- from the recovery snapshot the flush just wrote (the same
// password derives the same key). Until Milestone 70's 70I it reloaded the
// file whenever there was one, losing every edit the file lacked, and the
// snapshot held only the filings and the guardian.
export async function lockApp(){
  if(_autoLockTimer){clearTimeout(_autoLockTimer);_autoLockTimer=null;}
  await flushPendingSave();
  await releaseWardLock();
  const handleToReload=await loadCaseFileHandle();
  const fileLacksChanges=isDirtySinceExport();
  clearCryptoKey();
  monolith.clearCaseForLock();
  document.getElementById('sidebar').style.display='none';
  document.getElementById('main-content').innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-3);">Locked</div>';
  await ensureUnlocked();
  const restored=(fileLacksChanges||!handleToReload)?await restoreRecoverySnapshot():false;
  if(!restored&&handleToReload){
    // Rebuild memory from the open .sav file now that the key is available.
    try{
      const handleFile=await handleToReload.getFile();
      const zip=await JSZip.loadAsync(handleFile);
      const manifestEntry=zip.file('manifest.json');
      if(manifestEntry){
        const manifest=JSON.parse(await manifestEntry.async('string'));
        // Another tab on a newer version may have saved this file since it was
        // opened: do not read it, and never save over it from this tab.
        const newerFormat=newerCaseFileFormatMessage(manifest);
        if(newerFormat){
          await forgetCaseFileHandle();
          await alertModal(newerFormat);
        }else{
          const loaded=await loadCaseFileFromZip(zip,manifest,getCryptoKey());
          // The file on disk may have been damaged since it was opened.
          await protectPartiallyReadCaseFile(loaded&&loaded.unreadable,handleFile&&handleFile.name);
        }
      }
    }catch(e){console.error('Could not reload case data after unlocking',e);}
  }
  const activeWard=getActiveWard();
  if(activeWard){
    const ok = await filingLifecycle.open(activeWard);
    if (!ok) {
      window.location.hash = '/dashboard';
    }
  }
  updateSidebar();
  monolith.handleHash();
}

// The case as the flush before a lock left it in this page's recovery
// snapshot: its filings, the guardian and the circuit, and the shared records
// (a snapshot written before 70I has none of those three, and restores as it
// always did). Returns whether any filing came back.
async function restoreRecoverySnapshot(){
  try{
    const cache=await readOwnSessionRestoreCache();
    if(!cache||!Array.isArray(cache.wards)||!cache.wards.length)return false;
    const key=getCryptoKey();
    const restoredWards=[];
    for(const w of cache.wards){
      const ward=sanitizeObjectData(await decryptJSONWithKey(w.enc,key));
      if(ward&&ward.wardId)restoredWards.push(ward);
    }
    if(!restoredWards.length)return false;
    const g=await decryptJSONWithKey(cache.guardian,key);
    const shared=await decryptCaseFileCore(cache,key,{source:'from the recovery snapshot'});
    const caseFile=getCaseFile();
    caseFile.wards=restoredWards;
    caseFile.guardianName=(g&&g.guardianName)||'';
    caseFile.guardianEmail=(g&&g.guardianEmail)||'';
    if(g&&g.selectedCircuit!=null)caseFile.selectedCircuit=g.selectedCircuit;
    caseFile.parties=shared.parties;
    caseFile.cases=shared.cases;
    caseFile.dismissedPartyPairs=shared.dismissedPartyPairs;
    return true;
  }catch(e){
    console.error('Could not reload case data from the recovery cache after unlocking',e);
    return false;
  }
}

// Auto-lock after inactivity: an unattended-but-unlocked app is the
// weakest point in encryption-at-rest, since "remember password" now makes
// it easy to leave the app open indefinitely. Any of the listed activity
// events pushes the timeout back out; if none occur for AUTO_LOCK_MS while
// unlocked, the app locks itself exactly as if the user clicked Lock.
export const AUTO_LOCK_MS=15*60*1000;

let _autoLockTimer=null;

export function resetAutoLockTimer(){
  if(_autoLockTimer)clearTimeout(_autoLockTimer);
  if(!getCryptoKey())return;
  _autoLockTimer=setTimeout(()=>{if(getCryptoKey())lockApp();},AUTO_LOCK_MS);
}

// The unlock dialog's Enter key, and the activity that holds off the
// inactivity lock: installed once by main.js (Milestone 70, 70I), not when
// the code loads.
export function installAppLockListeners({signal}={}){
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'&&document.getElementById('unlock-overlay')?.classList.contains('show')){
      e.preventDefault();
      submitUnlockForm();
    }
  },{signal});
  ['mousemove','mousedown','keydown','scroll','touchstart'].forEach(evt=>{
    document.addEventListener(evt,resetAutoLockTimer,{passive:true,signal});
  });
}
