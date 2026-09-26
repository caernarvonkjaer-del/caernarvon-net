// ═══════════════════════════════════════════════════════
// THEME (light / dark)
// The synchronous head script sets the OS preference before first paint.
// This block handles runtime changes and restores the saved .sav setting.
// Court-document and PDF styles remain hardcoded for light output.
// ═══════════════════════════════════════════════════════
// currentTheme: src/core/theme-preference.js (Milestone 70, 70H).
function currentTheme(){return window.GuardianFormsLegacyBridge.currentTheme();}
// applyTheme: src/core/theme-preference.js (Milestone 70, 70H).
function applyTheme(theme,persist){return window.GuardianFormsLegacyBridge.applyTheme(theme,persist);}
// ═══════════════════════════════════════════════════════
// GLOBAL STATE & CONFIG
// ═══════════════════════════════════════════════════════


// ANNUAL_P67_CELLS moved to src/features/annual-accounting/excel.js
// (Milestone 7, Phase B) -- Annual Excel export is its only consumer.


// Final and Trust accountings use the Annual engine, but they are distinct
// legal filings. Keep their stored type and Part I selection atomic so every
// later consumer resolves the same descriptor.
function setAccountingFilingType(filingType){
  window.markFilingRevisionChanged?.('filing-type-change');
  const result=window.applyAccountingFilingType
    ? window.applyAccountingFilingType(window.D,filingType)
    : null;
  if(result?.descriptor){
    activeInventoryType=result.descriptor.inventoryType;
  }else{
    const fallback={Annual:'annual',Final:'finalAccounting',Trust:'trustAccounting'}[filingType];
    if(!fallback)return result;
    window.D.inventoryType=fallback;
    window.D.filingType=filingType;
    activeInventoryType=fallback;
  }
  updateSidebar();
  autoSave();
  return result;
}
window.setAccountingFilingType=setAccountingFilingType;

// Case-level data structure. `parties` is the shared party-record model
// (src/core/party-resolver.js); `cases` groups filings by real-world matter
// (src/core/case-resolver.js); `dismissedPartyPairs` remembers "not the same
// person" decisions from the de-dup screen (pagePartyManagement()) so they
// don't resurface every time it's opened.
let caseFile = {
  guardianName: '',
  guardianEmail: '',
  wards: [],
  parties: [],
  cases: [],
  dismissedPartyPairs: [],
  activeWardId: null
};
window.caseFile = caseFile;

// ═══════════════════════════════════════════════════════
// HELP SYSTEM
// ═══════════════════════════════════════════════════════







/** Opens the standalone user manual in a new tab, optionally to one anchor. */

/** "?" while a filing is open: skip the Help panel, jump straight to the
 * manual page for wherever the filer actually is. */

// ═══════════════════════════════════════════════════════
// TOOLTIP SYSTEM
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// WALKTHROUGH SYSTEM (Phase 4) - Type-Specific Tours
// ═══════════════════════════════════════════════════════












let activeInventoryType = null;
window.D = {}; // Current active ward's data
let _saveTimer = null;
let currentPage = '/';
try {
  Object.defineProperty(window, '_saveTimer', {
    get: () => _saveTimer,
    set: (v) => { _saveTimer = v; },
    configurable: true
  });
  Object.defineProperty(window, 'activeInventoryType', {
    get: () => activeInventoryType,
    set: (v) => { activeInventoryType = v; },
    configurable: true
  });
  Object.defineProperty(window, 'currentPage', {
    get: () => currentPage,
    set: (v) => { currentPage = v; },
    configurable: true
  });
} catch (_) {}
// A bare top-level `let`, like activeInventoryType above, isn't reachable
// from an ES module (see src/core/state.js's file header) -- this tiny
// accessor (a function declaration, so it's a real window property) is
// what the Simplified Accounting feature module reaches for after an Excel
// import, to re-render whichever page was already open.
function getCurrentPage(){return currentPage;}
let _dirtySinceExport = false; // true once data changes after the last .sav export
// These two are NOT leftover duplicates of case-file.js's module state: they
// are the window-backed shared store that case-file.js reads and writes
// through (window._autoExportIntervalMinutes, window._lastExportAt, via the
// accessors below), and loadCaseFileFromZip() below still writes them when a
// .sav is opened. The timers that used to live here alongside them are gone
// with the duplicate implementations that owned them.
let _autoExportIntervalMinutes = 10; // 0 means Off; loaded from/saved to appState
let _lastExportAt = null; // ms epoch of last successful export, or null if never
try {
  Object.defineProperty(window, '_dirtySinceExport', {
    get: () => _dirtySinceExport,
    set: (v) => { _dirtySinceExport = v; },
    configurable: true
  });
  Object.defineProperty(window, '_lastExportAt', {
    get: () => _lastExportAt,
    set: (v) => { _lastExportAt = v; },
    configurable: true
  });
  Object.defineProperty(window, '_autoExportIntervalMinutes', {
    get: () => _autoExportIntervalMinutes,
    set: (v) => { _autoExportIntervalMinutes = v; },
    configurable: true
  });
} catch (_) {}
window.PG_APP_VERSION = '1.5.30';

// ═══════════════════════════════════════════════════════
// STORAGE STRATEGY — canonical .sav file plus temporary recovery
// ═══════════════════════════════════════════════════════
//
// Live case data is held in caseFile and the containers below. A .sav
// file is the authoritative durable record and receives full-state writes.
//
// Browser storage has two current, limited uses:
//   - pg-session-cache holds a temporary full-state recovery snapshot while
//     changes are unsaved. It uses the case's encrypted-or-plain mode and is
//     cleared after a successful .sav save.
//   - pg-launch-pref holds a has-opened flag and, where supported, the last
//     FileSystemFileHandle. It never stores the file's contents.
//
// The Tauri build also maintains an encrypted best-effort file backup.
// ═══════════════════════════════════════════════════════

let _appState = {};        // key -> value; replaces the old `appState` IDB store
let _templateCache = {};   // type -> base64; replaces the old `templates` IDB store
let _auditLogEntries = []; // {id, timestamp, eventType, details, success}; replaces `auditLog`
let _auditLogNextId = 1;
try {
  Object.defineProperty(window, '_appState', {
    get: () => _appState,
    set: (v) => { _appState = v; },
    configurable: true
  });
  Object.defineProperty(window, '_templateCache', {
    get: () => _templateCache,
    set: (v) => { _templateCache = v; },
    configurable: true
  });
  Object.defineProperty(window, '_auditLogEntries', {
    get: () => _auditLogEntries,
    set: (v) => { _auditLogEntries = v; },
    configurable: true
  });
} catch (_) {}

// ═══════════════════════════════════════════════════════
// COMMON HELPERS
// ═══════════════════════════════════════════════════════
// Milestone 70, 70B: the pure helpers that used to be defined here live in ES
// modules now -- icons in src/core/ui/icons.js; esc() in
// src/core/filing/escape-html.js; fmt() and formatDashboardCurrency() in
// src/core/format/money.js; field formatting and filters in
// src/core/form/form-contract.js; injection checks and import hardening in
// src/core/security/input-hardening.js; guardianHasAnyData() in
// src/core/validation/row-started.js; FL_COUNTIES in src/core/pdf/circuit-lookup.js;
// formatDisplayDate() in src/core/form/date-parser.js; calcTotals() in
// src/features/simplified-accounting/totals.js. Those this script still calls
// keep a one-line wrapper that delegates through src/legacy-bridge.js
// (a classic script cannot import). A wrapper goes when its last caller here
// moves out; never put logic back in one.
function validateImportFile(file,kind){return window.GuardianFormsLegacyBridge.validateImportFile(file,kind);}
function sanitizeObjectData(obj){return window.GuardianFormsLegacyBridge.sanitizeObjectData(obj);}
function calcTotals(){return window.GuardianFormsLegacyBridge.calcTotals();}
// Milestone 70, 70C: the filing registry and per-engine models -- names,
// engines, blank filings and rows, the page lists and the normalizer -- live in
// src/core/filing/filing-registry.js and src/core/filing/models/ now; the lists
// this script still reads are bridge reads where it reads them.
function formEngine(type){return window.GuardianFormsLegacyBridge.formEngine(type);}
function initializeEmptyData(type){return window.GuardianFormsLegacyBridge.initializeEmptyData(type);}




// Update an input field with formatted phone, keeping user experience smooth
// Highlight form fields that have validation errors with red borders
// ═══════════════════════════════════════════════════════
// VALIDATION SUMMARY
// Every message from validate() reads "<Section> — <Field>", so it can be
// grouped instead of listed flat. Section prefixes map to wizard routes
// ("Cover"→/, "B-1 row 3"→/b1, "Part IV"→/p4, "Sch D2"→/schd2), which is
// what lets each group offer a jump link.
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// PRINT-PREVIEW PAGER
// Shows one filing page at a time instead of a continuous scroll of all of
// them. Purely a viewing filter: exports and printing always operate on the
// complete set (see the !important rules under @media print and
// .pdf-export-mode, plus pvShowAll() called before every export).
// Labels are read back out of each page's own court header, so this works
// for all three inventory types without touching the three builders.
// ═══════════════════════════════════════════════════════
 // '1'-based page number, or 'all'





// ═══════════════════════════════════════════════════════
// SECURITY: VALIDATION AND AUDIT LOGGING
// ═══════════════════════════════════════════════════════

async function auditLog(eventType, details, success = true, wardId = null) {
  // Recorded in the in-memory _auditLogEntries used for .sav packaging and the
  // in-app activity viewer. This used to try a Tauri `audit_log` command first
  // and fall back to here; that branch could never run in either shipped build.
  try {
    const entry = {timestamp: new Date().toISOString(), eventType, details, success};
    if (wardId) entry.wardId = wardId;
    await appendAuditLogEntry(entry);
  } catch (e) {
    console.warn('Audit log fallback failed:', e);
  }
}
window.auditLog = auditLog;

// Strict input validation rules — rejects invalid inputs before save
// Validate date range: ensure from <= to
// ═══════════════════════════════════════════════════════
// ENCRYPTION AT REST (AES-256-GCM via the Web Crypto API)
// ═══════════════════════════════════════════════════════
// Every ward, and the guardian's own name/email, are encrypted before they
// touch disk — the .sav file only ever sees ciphertext. The AES key is derived from a user-chosen master
// password via PBKDF2 and lives ONLY in memory for the session (`_cryptoKey`
// below); it is never written anywhere by default. Closing the app or
// clicking "Lock" forgets it, so the password must be re-entered next time.
//
// There is no recovery path if the password is lost — that is the deliberate
// design. (An opt-in OS-credential-store escape hatch existed here for a
// Tauri desktop build that was never part of this repo; it is gone.)
const PBKDF2_ITERATIONS=210000;
const CRYPTO_VERIFIER_PLAINTEXT='PG_VERIFIER_V1';
let _cryptoKey=null; // CryptoKey, set after unlock/create, cleared on lock
try {
  Object.defineProperty(window, '_cryptoKey', {
    get: () => _cryptoKey,
    set: (v) => { _cryptoKey = v; },
    configurable: true
  });
} catch (_) {}


// Whether this install encrypts data at all — chosen once, at first setup,
// via promptChooseSecurityMode(). 'encrypted' (default/recommended) uses
// AES-256-GCM as below; 'none' stores plain JSON with no password gate.
// Loaded from appState at startup; see ensureUnlocked().
let _securityMode='encrypted'; // 'encrypted' | 'none'
try {
  Object.defineProperty(window, '_securityMode', {
    get: () => _securityMode,
    set: (v) => { _securityMode = v; },
    configurable: true
  });
} catch (_) {}
const PLAIN_MODE_PREFIX='PLAIN:'; // self-describing tag, never produced by the
// iv:ciphertext base64 format below, so decrypt can tell the two apart
// unambiguously even if an archive mixes entries from both modes.


// Decides whether the user needs to create a master password (fresh install,
// or an existing pre-encryption install with plaintext wards) or unlock with
// one that's already set up, then blocks until a valid key is in memory.
async function ensureUnlocked(){
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
  // promptOpenOrStartAtLaunch() already ran by this point. If the user
  // opened an existing case file, loadCaseFileAtLaunch() already asked for
  // (and verified) its password — _launchStateResolved says so, and this
  // is skipped entirely rather than asking a second time. If they started
  // a new case instead, nothing was resolved and this proceeds exactly as
  // it always has for a fresh install.
  if(_launchStateResolved){
    _launchStateResolved=false; // consume once — a later lockApp() must go through the normal flow below
    updateLockButtonVisibility();
    resetAutoLockTimer();
    return;
  }
  const storedMode=await loadAppState('securityMode');
  const salt=await loadAppState('cryptoSalt');
  const verifier=await loadAppState('cryptoVerifier');

  if(!storedMode&&!(salt&&verifier)){
    // No mode has been selected. A ward can already be present only when an
    // older .sav file omitted securityMode; otherwise this is a new case.
    _securityMode=await promptChooseSecurityMode();
    await saveAppState('securityMode',_securityMode); // stored in the
    // clear, like cryptoSalt — must be readable before any password exists
    if(_securityMode==='none'){
      updateLockButtonVisibility();
      return; // no password, no encryption key, nothing further to do
    }
    await promptCreatePassword(caseFile.wards.length>0);
    updateLockButtonVisibility();
    return;
  }

  // Mode already chosen previously — or this is a pre-existing encrypted
  // install from before this feature existed (salt+verifier present with no
  // explicit mode saved yet): treat that case as 'encrypted' for backward
  // compatibility rather than re-asking.
  _securityMode=storedMode||(salt&&verifier?'encrypted':'none');
  updateLockButtonVisibility();

  if(_securityMode==='none')return; // no password gate at all

  if(salt&&verifier){
    // A silent auto-unlock path used to sit here, reading the master password
    // back from the OS credential store through Tauri. No Tauri shell exists
    // in this repo, so it could never fire; the password is always entered.
    await promptUnlock(salt,verifier);
    return;
  }
  await promptCreatePassword(caseFile.wards.length>0);
}

let _securityChoiceResolve=null;
function promptChooseSecurityMode(){
  return new Promise((resolve)=>{
    _securityChoiceResolve=resolve;
    document.getElementById('security-choice-overlay').classList.add('show');
  });
}
function selectSecurityMode(mode){
  document.getElementById('security-choice-overlay').classList.remove('show');
  const resolve=_securityChoiceResolve;_securityChoiceResolve=null;
  if(resolve)resolve(mode);
}

// The Lock button is meaningless with no password to re-enter — hide it in
// 'none' mode so users can't confuse themselves clicking it.
function updateLockButtonVisibility(){
  const btn=document.getElementById('lock-app-btn');
  if(btn)btn.style.display=_securityMode==='none'?'none':'';
}

let _unlockResolve=null;
let _unlockMode=null; // 'create' | 'unlock'

async function promptUnlock(saltB64,verifierPacked){
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
function promptPasswordForFile(manifest,zip){
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

function promptCreatePassword(hasExistingData){
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

function showUnlockError(msg){
  const el=document.getElementById('unlock-error');
  el.textContent=msg;
  el.style.display='block';
}

// Rate-limits guesses at the unlock screen itself. This doesn't stop an
// offline attacker who copies the encrypted files and brute-forces them
// outside the app (PBKDF2's 210k iterations is the only defense against
// that) — it stops someone with physical access to a locked screen from
// just sitting there trying passwords one after another through the UI.
// The counter lives in _appState and is included in the next .sav write or
// temporary recovery snapshot.
const UNLOCK_FAIL_THRESHOLD=5;
const UNLOCK_LOCKOUT_BASE_MS=30*1000;
const UNLOCK_LOCKOUT_MAX_MS=5*60*1000;

async function getUnlockFailState(){
  const state=await loadAppState('unlockFailState');
  return state||{count:0,lockoutUntil:0};
}
async function saveUnlockFailState(state){
  await saveAppState('unlockFailState',state);
}
function formatLockoutRemaining(ms){
  const s=Math.ceil(ms/1000);
  return s>=60?`${Math.ceil(s/60)} minute${s>=120?'s':''}`:`${s} second${s===1?'':'s'}`;
}

async function submitUnlockForm(){
  const btn=document.getElementById('unlock-submit-btn');
  const pw=document.getElementById('unlock-password').value;
  btn.disabled=true;
  try{
    if(_unlockMode==='create'){
      const confirmPw=document.getElementById('unlock-password-confirm').value;
      if(!pw||pw.length<8){showUnlockError('Password must be at least 8 characters.');return;}
      if(pw!==confirmPw){showUnlockError('Passwords do not match.');return;}
      const saltB64=generateSaltB64();
      _cryptoKey=await deriveKeyFromPassword(pw,saltB64);
      const verifier=await encryptJSON(CRYPTO_VERIFIER_PLAINTEXT);
      await saveAppState('cryptoSalt',saltB64);
      await saveAppState('cryptoVerifier',verifier);
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

      try{
        _cryptoKey=await deriveKeyFromPassword(pw,saltB64);
        const decoded=await decryptJSON(verifierPacked);
        if(decoded!==CRYPTO_VERIFIER_PLAINTEXT)throw new Error('verifier mismatch');
      }catch(e){
        _cryptoKey=null;
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

      await saveUnlockFailState({count:0,lockoutUntil:0});
      await auditLog('UNLOCK_SUCCESS', 'User successfully unlocked the application', true);
      resetAutoLockTimer();
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }else if(_unlockMode==='openFile'){
      if(!pw){showUnlockError('Please enter your password.');return;}
      try{
        _cryptoKey=await deriveAndVerifyKey(pw,_pendingOpenManifest,_pendingOpenZip);
      }catch(e){
        _cryptoKey=null;
        showUnlockError('Incorrect password for this file.');
        return;
      }
      _pendingOpenManifest=null;_pendingOpenZip=null;
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }
  }finally{
    btn.disabled=false;
  }
}

document.addEventListener('keydown',(e)=>{
  if(e.key==='Enter'&&document.getElementById('unlock-overlay')?.classList.contains('show')){
    e.preventDefault();
    submitUnlockForm();
  }
});

// Flushes pending work, clears the key and decrypted case data from memory,
// then requires the password again. After unlock, this flow reloads from the
// open .sav handle; with no handle yet, it falls back to the temporary
// session-recovery cache flushPendingSave() just wrote (same password means
// same derived key, so it decrypts with the key ensureUnlocked() produces).
async function lockApp(){
  if(_autoLockTimer){clearTimeout(_autoLockTimer);_autoLockTimer=null;}
  await flushPendingSave();
  if (window.releaseWardLock) await window.releaseWardLock();
  const handleToReload=await loadCaseFileHandle();
  _cryptoKey=null;
  caseFile={guardianName:'',guardianEmail:'',wards:[],parties:[],cases:[],dismissedPartyPairs:[],activeWardId:null};
  window.caseFile=caseFile;
  window.D={};
  activeInventoryType=null;
  document.getElementById('sidebar').style.display='none';
  document.getElementById('main-content').innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-3);">Locked</div>';
  await ensureUnlocked();
  if(handleToReload){
    // Rebuild memory from the open .sav file now that the key is available.
    try{
      const handleFile=await handleToReload.getFile();
      const zip=await JSZip.loadAsync(handleFile);
      const manifestEntry=zip.file('manifest.json');
      if(manifestEntry){
        const manifest=JSON.parse(await manifestEntry.async('string'));
        await loadCaseFileFromZip(zip,manifest,_cryptoKey);
      }
    }catch(e){console.error('Could not reload case data after unlocking',e);}
  }else{
    // No .sav has ever been saved for this case, so the only place this
    // data can come from is the recovery cache saved just above.
    try{
      const cache=await _sessionCacheGet();
      if(cache&&Array.isArray(cache.wards)&&cache.wards.length){
        const restoredWards=[];
        for(const w of cache.wards){
          const ward=sanitizeObjectData(await decryptJSONWithKey(w.enc,_cryptoKey));
          if(ward&&ward.wardId)restoredWards.push(ward);
        }
        if(restoredWards.length){
          const g=await decryptJSONWithKey(cache.guardian,_cryptoKey);
          caseFile.wards=restoredWards;
          caseFile.guardianName=(g&&g.guardianName)||'';
          caseFile.guardianEmail=(g&&g.guardianEmail)||'';
          caseFile.activeWardId=null;
        }
      }
    }catch(e){console.error('Could not reload case data from the recovery cache after unlocking',e);}
  }
  await loadGuardianData();
  const activeWard=getActiveWard();
  if(activeWard){
    const ok = await activateWard(activeWard);
    if (!ok) {
      window.location.hash = '/dashboard';
    }
  }
  updateSidebar();
  handleHash();
}

// Auto-lock after inactivity: an unattended-but-unlocked app is the
// weakest point in encryption-at-rest, since "remember password" now makes
// it easy to leave the app open indefinitely. Any of the listed activity
// events pushes the timeout back out; if none occur for AUTO_LOCK_MS while
// unlocked, the app locks itself exactly as if the user clicked Lock.
const AUTO_LOCK_MS=15*60*1000;
let _autoLockTimer=null;
function resetAutoLockTimer(){
  if(_autoLockTimer)clearTimeout(_autoLockTimer);
  if(!_cryptoKey)return;
  _autoLockTimer=setTimeout(()=>{if(_cryptoKey)lockApp();},AUTO_LOCK_MS);
}
['mousemove','mousedown','keydown','scroll','touchstart'].forEach(evt=>{
  document.addEventListener(evt,resetAutoLockTimer,{passive:true});
});

// ═══════════════════════════════════════════════════════
// IN-MEMORY STATE OPERATIONS
// Compatibility facade for the former IndexedDB store API. Wards, settings,
// templates, and audit entries remain in memory here; saveData() writes the
// authoritative .sav file and manages the separate recovery snapshot.
// ═══════════════════════════════════════════════════════

async function saveWardToState(ward){
  if(!ward)return false;
  ward.lastModified=new Date().toISOString();
  // The ward is already live in caseFile; schedule persistence. Under the
  // unified single-file model, one autoSave() covers every ward regardless
  // of which one was actually edited -- there's no per-ward file to track.
  autoSave();
  return true;
}

async function deleteWardFromState(wardId){
  // deleteWard() already updates the live array; schedule persistence.
  autoSave();
  return true;
}


async function saveTemplate(type,b64){
  _templateCache[type]=b64;
  autoSave();
  return true;
}

async function loadTemplate(type){
  return _templateCache[type]||null;
}

// In memory, entries are kept unencrypted, on purpose, the same way the old
// IDB store held them: a failed-unlock attempt has to be logged before any
// password has been verified, so no encryption key can be assumed to exist
// yet. That's only true of memory, though — by the time any of this reaches
// a .sav file, a real save is happening, which (see saveData()'s own guard)
// cannot happen at all in 'encrypted' mode without _cryptoKey already set.
// buildCaseFileBlob() encrypts the whole log at that point, same as
// appState, rather than leaving ward names and other case details sitting
// in plaintext inside a file this app actively encourages emailing and
// copying around. Deliberately does NOT call autoSave() itself:
// writeCaseToHandle() logs its own DATA_EXPORT entry as part of every
// manual save (automatic saves are not logged -- Milestone 62), and having
// that schedule another save would loop forever, one save always
// triggering the next. An entry logged for any other reason rides
// along in whatever save happens next instead — exactly as independent of
// the ward-edit debounce as the old IDB store's own audit log always was.
async function appendAuditLogEntry(entry){
  entry.id=_auditLogNextId++;
  // Tag with the active ward so a single-ward export (buildSingleWardExportBlob)
  // can include only that ward's own entries. Entries created before this
  // tagging, or app-level events with no active ward, will have wardId
  // undefined/null and are excluded from single-ward exports (but preserved
  // in the main case file and the activity log).
  if(caseFile.activeWardId)entry.wardId=caseFile.activeWardId;
  _auditLogEntries.push(entry);
  return true;
}

async function loadAuditLogEntries(){
  return _auditLogEntries;
}

// ═══════════════════════════════════════════════════════
// ACTIVITY LOG — VIEWER
// auditLog()/appendAuditLogEntry() have recorded every unlock, backup, and
// restore since the app's earliest versions, but nothing ever displayed the
// result — it was write-only. This is the read side: a page a guardian can
// open to answer "did my backup actually save?" or to show a record of
// diligence if their recordkeeping is ever questioned.
// ═══════════════════════════════════════════════════════
 // newest-first, loaded once per page visit
 // safety cap on DOM rows, not on what's exported








// ═══════════════════════════════════════════════════════
// PARTY MANAGEMENT / DE-DUPLICATION (persistence rewrite Milestone 7)
// Follows pageActivityLog()'s own pattern immediately above: a static shell
// rendered once by renderPage(), a body-refresh function called after every
// action, and the existing global data-form-action/data-form-input dispatch
// (src/form-events.js) -- no new event-dispatch convention needed. The
// underlying logic (candidate detection, merge, dismissal) lives in
// src/core/party-resolver.js, bridged onto window the same way
// case-resolver.js's Case functions are.
// ═══════════════════════════════════════════════════════

async function autoSave(){
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
  if(_saveTimer)clearTimeout(_saveTimer);
  _saveTimer=setTimeout(()=>{_saveTimer=null;saveData();},1000);
}

// Cancels any pending debounced save and saves the CURRENTLY active ward
// immediately. Must be called before reassigning activeWardId/window.D —
// otherwise a save scheduled for the old ward fires after the switch and
// silently writes the new ward's data instead, losing the old edit.
async function flushPendingSave(){
  if(_saveTimer){
    clearTimeout(_saveTimer);
    _saveTimer=null;
  }
  window.commitPendingFieldValues?.();
  await saveData();
}

function showSaveError(){
  const el=document.getElementById('save-error-banner');
  if(el)el.style.display='block';
}
function hideSaveError(){
  const el=document.getElementById('save-error-banner');
  if(el)el.style.display='none';
}

// The consecutive-failure counter that gated the banner above now lives in
// case-file.js's writeCaseToHandle(), which is the one place every write
// passes through; these two functions stay here because they are pure DOM
// toggles and case-file.js calls them via window, the same way it already
// calls window.auditLog.

// Captures dirty state in the temporary recovery cache, then rewrites the
// complete case file when a writable handle is available. No open handle
// is a normal pre-save state, not an error. Under the unified single-file
// model this is deliberately simple: there is exactly one handle and one
// write, covering every ward -- the old version had to separately track
// which non-active wards were dirtied off the active-ward path (dashboard
// archive toggle, workflow edits) because each ward could have its OWN
// file; that distinction no longer exists, so there is nothing left to
// track beyond the single _dirtySinceExport flag.
async function saveData(){
  // Nothing should be persisted while the app is locked — there's no
  // encryption key to write with. This isn't a failure (e.g. autoSave()
  // debounced from an edit made right before auto-lock kicked in), so it
  // must not trip the save-error banner the way an actual write problem would.
  if(_securityMode==='encrypted'&&!_cryptoKey)return;
  const activeWard=getActiveWard();
  if(activeWard){
    window.commitStoredDateDrafts?.(activeWard,setPath);
    activeWard.lastModified=new Date().toISOString();
  }
  // Best-effort local resume snapshot, used only by lockApp() when the app
  // auto-locks before any .sav has ever been saved (see recovery-cache.js's
  // file header); a successful .sav write clears it. Awaited so callers
  // that depend on it having landed before acting further (lockApp() wiping
  // memory, beforeunload) aren't racing an in-flight IndexedDB write.
  if(_dirtySinceExport){
    // This is only a best-effort crash-recovery snapshot. It is not the
    // durable .sav case file, so an IndexedDB/cache failure must not look
    // like a failed case-file save (and must not clear a real write error).
    await saveSessionRestoreCache();
  }
  // No "last saved" stamp here: at this point no handle has been checked,
  // no permission verified, and no write attempted. writeCaseToHandle()
  // records the save once it has actually written one.
  const handle=await loadCaseFileHandle();
  if(!handle)return;
  try{
    const perm=await handle.queryPermission({mode:'readwrite'});
    if(perm!=='granted'){
      await refreshAutoSaveArmedStatus();
      return;
    }
    // Failure counting and the error banner live in writeCaseToHandle() so
    // every caller reports a failed write identically.
    await writeCaseToHandle(handle,true);
  }catch(e){
    console.error('save failed',e);
  }
}

// State is already populated by .sav load, session recovery, or new-case
// defaults. Retained as an async compatibility check for initApp().
async function loadGuardianData(){
  return caseFile.wards.length>0||!!caseFile.guardianName;
}

// The open filing's record: src/core/state.js's, since Milestone 70's 70E.
function getActiveWard(){return window.GuardianFormsLegacyBridge.getActiveWard();}

// notifyProbateGuardianTabStateChanged: src/core/navigation/tab-state.js (Milestone 70, 70H).
function notifyProbateGuardianTabStateChanged(){return window.GuardianFormsLegacyBridge.notifyProbateGuardianTabStateChanged();}
window.pgHasUnsavedChanges=function(){return _dirtySinceExport;};

// getCaseFile() and its window.getCaseFile publication went in Milestone
// 70's 70E: modules read the case through src/core/state.js, which reads
// window.caseFile -- kept on the same object as this script's `caseFile`,
// which it reassigns in one place (lockApp()) and republishes there.

// _appState has the same reassign-wholesale problem as caseFile above.
// Dashboard only ever needs this one flag, so a pair of small accessors is
// simpler than exposing the whole mutable object.
function isContinuePromptShown(){ return !!_appState.continuePromptShown; }
window.isContinuePromptShown=isContinuePromptShown;
function markContinuePromptShown(){
  _appState.continuePromptShown=true;
  saveAppState('continuePromptShown',true);
}
window.markContinuePromptShown=markContinuePromptShown;


// ═══════════════════════════════════════════════════════
// EXPORT / IMPORT — guardianshipwarddata.sav
// One portable archive holding the guardian info plus every ward. The file
// is actually a ZIP under the hood (same trick as .docx/.xlsx), just saved
// with a .sav extension instead of .zip.
// The ZIP container itself is NOT password-protected (ZipCrypto is weak);
// instead each entry is AES-256-GCM ciphertext, so opening the zip in any
// tool shows only unreadable .enc entries, and GCM's auth tag makes any
// outside edit (accidental or otherwise) fail loudly on import instead of
// loading corrupted data.
// ═══════════════════════════════════════════════════════


// Save As dialog where supported (Chrome/Edge); plain Downloads-folder
// download elsewhere (Firefox/Safari have no showSaveFilePicker).
// Returns the FileSystemFileHandle used (so it can be remembered for silent
// re-writes later), or null when falling back to a plain Downloads-folder
// download (no handle exists in that path).


// The case-file handle, the armed-status flag and the format version all
// moved to src/core/persistence/case-file.js with the functions that owned
// them. case-file.js keeps window._caseFileHandle in sync itself, so nothing
// here needs a local copy.


// Builds a small standalone case-file-shaped ZIP containing just one ward --
// for sharing a copy with a co-guardian or attorney without exposing the
// rest of the case. Shaped exactly like buildCaseFileBlob()'s output (same
// manifest format/version), just filtered to one ward, so it imports the
// same way any case file does -- there's no separate "single ward" format.


// _lastAutoSavedAt used to be consulted here as a second "last saved" clock.
// It was never declared in this file, so the fallback arm of that ternary
// threw a ReferenceError on every page load -- window._lastAutoSavedAt is
// undefined until the first saveData(), which made the guard evaluate the
// bare identifier. The throw aborted initApp() partway, silently skipping
// the periodic save timer, the last-saved ticker, the fallback save
// reminder, drag-and-drop import, and the beforeunload unsaved-changes
// warning. One clock (_lastExportAt), written only on a confirmed save.


// Records this save's timestamp and audit entry BEFORE the save itself
// happens, so the file this save produces contains its own record of
// itself — not only the previous save's. Recording afterward (as this used
// to) meant a session that saved once and then closed had recorded that
// save nowhere at all: the in-memory update happened, but the file already
// written a moment earlier never got it, and there was no session left to
// write it in a later save. Returns a rollback closure, used if the write
// that follows fails, so a failed save is never recorded as having succeeded.


// Manual "Save Backup Now" / "Export All" action: builds the whole case file
// and writes it via Save-As, remembering the resulting handle so future
// changes can auto-save to it silently. One case, one file, one handle --
// there is no longer a separate "single ward" vs "whole archive" choice to
// make here the way there used to be.

// exportGuardianDataZip/backupAllWardsNow used to be two different exports
// (a "wards + guardian" archive vs a "full case" backup); under the unified
// model they're the same operation. Kept as aliases so existing UI markup
// and fragments calling either name keep working unchanged.

// Writes the whole case to an already-authorized handle. Used by auto-save,
// the periodic background timer, and the Save Backup button.


// Tries to silently re-write the remembered case-file handle — no dialog,
// no user gesture needed, as long as the browser still grants write
// permission.


// Filename helpers retained for the single-ward "share a copy" export below
// (dashboard's exportSingleWardZip) -- the primary save file no longer has
// a per-ward name to compute, but a one-off exported copy of just one ward
// still benefits from a name derived from that ward rather than a generic one.


// Guards a single-ward "share a copy" export from accidentally overwriting
// the real multi-ward case file -- a single-ward export is shaped exactly
// like a (one-ward) case file now, so picking the same location as the
// real case file and confirming the browser's native overwrite prompt would
// otherwise silently drop every other ward.


// Finishes a single-ward "share a copy" export. Deliberately does NOT touch
// the case file's own handle/dirty state -- exporting a copy of one ward
// for someone else has nothing to do with where THIS app instance's own
// autosave writes to, unlike the old per-ward-file model where the two were
// the same thing.


// The banner's Save Backup Now button. Runs inside a click, so a user
// gesture is available: re-authorizes the case file's handle with one small
// prompt, or falls back to a full Save As.


// Tries showOpenFilePicker() first so opening a case file this way arms a
// writable save handle (same as triggerOpenBackupSav()) -- without this,
// autoSave() has nothing to write to, and the first edit after opening
// forces an unexpected manual "Save As" with a freshly-generated filename
// instead of the file that was actually opened.


// ═══════════════════════════════════════════════════════
// SESSION-RESTORE CACHE (crash recovery)
// ═══════════════════════════════════════════════════════
// Stores a temporary full-case snapshot in pg-session-cache while changes
// are not yet in a .sav file. Encrypted mode uses AES-256-GCM; none mode uses
// the PLAIN format. A successful .sav save clears the snapshot, and startup
// offers any remaining snapshot before the normal Open/Start flow.
const SESSION_CACHE_DB='pg-session-cache', SESSION_CACHE_STORE='snapshot';
function _sessionCacheDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(SESSION_CACHE_DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(SESSION_CACHE_STORE);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function _sessionCacheGet(){
  try{
    const db=await _sessionCacheDb();
    return await new Promise(resolve=>{
      const req=db.transaction(SESSION_CACHE_STORE,'readonly').objectStore(SESSION_CACHE_STORE).get('current');
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>resolve(null);
    });
  }catch(e){return null;}
}
async function _sessionCachePut(val){
  try{
    const db=await _sessionCacheDb();
    await new Promise(resolve=>{
      const tx=db.transaction(SESSION_CACHE_STORE,'readwrite');
      tx.objectStore(SESSION_CACHE_STORE).put(val,'current');
      tx.oncomplete=resolve;tx.onerror=resolve;
    });
  }catch(e){/* non-critical -- see saveSessionRestoreCache()'s own catch */}
}
async function _sessionCacheClear(){
  try{
    const db=await _sessionCacheDb();
    await new Promise(resolve=>{
      const tx=db.transaction(SESSION_CACHE_STORE,'readwrite');
      tx.objectStore(SESSION_CACHE_STORE).delete('current');
      tx.oncomplete=resolve;tx.onerror=resolve;
    });
  }catch(e){/* non-critical */}
}


// ═══════════════════════════════════════════════════════
// OPEN / START AT LAUNCH
// After session recovery is checked, try the remembered handle or ask the
// user to open a .sav file or start a new case. Opening a file hydrates state
// and resolves its security mode before ensureUnlocked().
// ═══════════════════════════════════════════════════════

// pg-launch-pref stores a has-opened flag and the last FileSystemFileHandle.
// A valid remembered grant permits silent reopen; an expired grant needs a
// user click, and a missing or stale handle falls back to the file picker.
const LAUNCH_PREF_DB='pg-launch-pref', LAUNCH_PREF_STORE='flags';
const LAUNCH_PREF_KEY_OPENED='hasOpenedBefore', LAUNCH_PREF_KEY_HANDLE='zipFileHandle';
const REMEMBERED_FILE_TIMEOUT_MS=10000;
let _rememberedFileUnavailable=false;
function _launchPrefDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(LAUNCH_PREF_DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(LAUNCH_PREF_STORE);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function _launchPrefGet(key){
  const db=await _launchPrefDb();
  return new Promise((resolve)=>{
    const req=db.transaction(LAUNCH_PREF_STORE,'readonly').objectStore(LAUNCH_PREF_STORE).get(key);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>resolve(undefined);
  });
}
async function _launchPrefPut(key,value){
  const db=await _launchPrefDb();
  return new Promise((resolve)=>{
    const tx=db.transaction(LAUNCH_PREF_STORE,'readwrite');
    tx.objectStore(LAUNCH_PREF_STORE).put(value,key);
    tx.oncomplete=resolve;
    tx.onerror=resolve; // non-critical either way — next launch just falls back
  });
}
async function _launchPrefDelete(key){
  const db=await _launchPrefDb();
  return new Promise((resolve)=>{
    const tx=db.transaction(LAUNCH_PREF_STORE,'readwrite');
    tx.objectStore(LAUNCH_PREF_STORE).delete(key);
    tx.oncomplete=resolve;
    tx.onerror=resolve;
  });
}

// Case 1 above: a remembered handle whose read permission the browser
// still honors with no prompt at all. Runs before the startup screen even
// shows, so this is the only path that can be truly zero-click; everywhere
// else still needs the gesture openCaseFileAtLaunch() provides.
async function trySilentReopen(){
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

let _launchStateResolved=false;
let _openedFileAtLaunch=false; // set by loadCaseFileAtLaunch() on success; initApp() lands on the dashboard instead of the default page when this is true
let _startupChoiceResolve=null;
async function promptOpenOrStartAtLaunch(){
  if(await trySilentReopen())return;
  document.getElementById('startup-newcase-btn').style.display='';
  const linkEl=document.getElementById('startup-newcase-link');
  if(linkEl)linkEl.style.display='none';
  const fileStatus=document.getElementById('startup-file-status');
  fileStatus.style.display=_rememberedFileUnavailable?'block':'none';
  return new Promise((resolve)=>{
    _startupChoiceResolve=resolve;
    document.getElementById('startup-choice-overlay').classList.add('show');
  });
}
function _resolveStartupChoice(){
  document.getElementById('startup-choice-overlay').classList.remove('show');
  const resolve=_startupChoiceResolve;_startupChoiceResolve=null;
  if(resolve)resolve();
}
async function startNewWardAtLaunch(){
  _resolveStartupChoice();
  try{ await forgetPersistedCaseFileHandle(); }catch(e){}
  try{ window.clearLastPosition?.(); }catch(e){}
}
const startNewCaseAtLaunch = startNewWardAtLaunch;
window.startNewWardAtLaunch = startNewWardAtLaunch;
window.startNewCaseAtLaunch = startNewCaseAtLaunch;

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
async function openWardFileAtLaunch(){
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
      await window.alertModal('Could not open that file: '+(e&&e.message||e));
    }
    return;
  }
  document.getElementById('startup-open-input').click();
}
const openCaseFileAtLaunch = openWardFileAtLaunch;
window.openWardFileAtLaunch = openWardFileAtLaunch;
window.openCaseFileAtLaunch = openCaseFileAtLaunch;

async function handleStartupOpenInputChange(input){
  const file=input.files[0];
  input.value='';
  if(!file)return;
  // No handle to remember here — a plain <input> never yields a writable
  // one. loadCaseFileAtLaunch() -> refreshAutoSaveArmedStatus() already
  // says so on screen once this resolves.
  const ok=await loadCaseFileAtLaunch(file);
  if(ok)_resolveStartupChoice();
}
window.handleStartupOpenInputChange = handleStartupOpenInputChange;

// Shared by both pickers above: validate, parse, ask for a password if the
// file is encrypted, then hand off to loadCaseFileFromZip(). Returns true
// on success (state is now populated and _cryptoKey is set if needed) or
// false (already reported to the user; the startup choice screen stays up
// so they can try again or start a new case instead).
async function loadCaseFileAtLaunch(file){
  try{
    const check=await validateImportFile(file,'sav');
    if(!check.ok){await window.alertModal(check.message);return false;}
    if(typeof JSZip==='undefined'){await window.alertModal('ZIP library failed to load — cannot open this file.');return false;}
    const zip=await JSZip.loadAsync(file);
    const manifestEntry=zip.file('manifest.json');
    if(!manifestEntry){await window.alertModal('Not a Guardian Forms data file (no manifest.json inside).');return false;}
    const manifest=JSON.parse(await manifestEntry.async('string'));
    if(manifest.format!=='probate-guardian-case'){await window.alertModal('Not a Guardian Forms data file.');return false;}
    _securityMode=manifest.securityMode||(manifest.salt?'encrypted':'none');
    if(_securityMode==='encrypted'){
      await promptPasswordForFile(manifest,zip); // sets _cryptoKey; only resolves on a verified password
    }else{
      _cryptoKey=null;
    }
    // Hydrate _appState directly (not via saveAppState()) so ensureUnlocked()
    // finds securityMode/cryptoSalt/cryptoVerifier already in place without
    // this counting as an edit that needs writing straight back out.
    _appState.securityMode=_securityMode;
    _appState.cryptoSalt=manifest.salt||null;
    _appState.cryptoVerifier=manifest.verifier||null;
    await loadCaseFileFromZip(zip,manifest,_cryptoKey);
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
    _launchStateResolved=true;
    _openedFileAtLaunch=true;
    markCaseOpenedBefore();
    refreshAutoSaveArmedStatus(); // covers the plain-<input> path too, where no handle was ever remembered
    return { ok: true, wardId: (caseFile.wards[0] && caseFile.wards[0].wardId) || null };
  }catch(e){
    console.error('Failed to open case file',e);
    await window.alertModal('Could not open that file: '+(e&&e.message||e));
    return false;
  }
}

// The counterpart to buildCaseFileBlob(): reads wards, guardian info,
// appState, cached templates, and the audit log out of an already-parsed
// .sav zip into memory. `key` may be null in 'none' mode — decryptJSONWithKey
// checks for the PLAIN: prefix before ever touching it. A file with no
// appState section at all (buildSingleWardExportBlob's single-ward exports
// never include one) defaults activeWardId to whichever ward the file
// contains, rather than failing.
async function loadCaseFileFromZip(zip,manifest,key){
  caseFile.wards=[];
  caseFile.parties=[];
  caseFile.cases=[];
  caseFile.dismissedPartyPairs=[];
  const partiesFile=zip.file('parties.enc');
  if(partiesFile){
    try{
      const parties=await decryptJSONWithKey(await partiesFile.async('string'),key);
      if(Array.isArray(parties))caseFile.parties=parties;
    }catch(e){console.warn('Could not read parties from .sav file',e);}
  }
  const casesFile=zip.file('cases.enc');
  if(casesFile){
    try{
      const cases=await decryptJSONWithKey(await casesFile.async('string'),key);
      if(Array.isArray(cases))caseFile.cases=cases;
    }catch(e){console.warn('Could not read cases from .sav file',e);}
  }
  const partyDismissalsFile=zip.file('partyDismissals.enc');
  if(partyDismissalsFile){
    try{
      const dismissals=await decryptJSONWithKey(await partyDismissalsFile.async('string'),key);
      if(Array.isArray(dismissals))caseFile.dismissedPartyPairs=dismissals;
    }catch(e){console.warn('Could not read party dismissals from .sav file',e);}
  }
  for(const entry of (Array.isArray(manifest.wards)?manifest.wards:[])){
    const f=zip.file(entry.file);
    if(!f){console.warn('Case file entry missing:',entry.file);continue;}
    try{
      const ward=sanitizeObjectData(await decryptJSONWithKey(await f.async('string'),key));
      if(ward&&ward.wardId)caseFile.wards.push(ward);
    }catch(e){console.warn('Skipping unreadable ward in .sav file',entry.file,e);}
  }
  caseFile.guardianName='';
  caseFile.guardianEmail='';
  caseFile.lastSavedFileName=null; // stamped fresh by rememberCaseFileHandle() once this file gets a handle
  if(manifest.guardian){
    try{
      const g=await decryptJSONWithKey(manifest.guardian,key);
      caseFile.guardianName=g.guardianName||'';
      caseFile.guardianEmail=g.guardianEmail||'';
    }catch(e){console.warn('Could not read guardian info from .sav file',e);}
  }
  _appState.activeWardId=null;
  _autoExportIntervalMinutes=10;
  _lastExportAt=null;
  if(manifest.appState){
    try{
      const a=await decryptJSONWithKey(manifest.appState,key);
      // Milestone 38C: a legacy archive's activeWardId is resume HISTORY, not
      // an instruction to reopen an editor. Focus is forced null below, for
      // every archive shape.
      const legacyActiveWardId=a.activeWardId||null;
      // Milestone 40D: theme is no longer read back out of app state to drive
      // appearance, but this is where a legacy value arrives from the file, so it
      // is the natural hook for the one-time seed. seedStoredThemeFromLegacy()
      // writes to localStorage ONLY when nothing is stored there yet -- so an
      // upgrading user keeps the theme they had, and opening any later file can
      // never overwrite the per-device choice they have since made.
      _appState.theme=a.theme;
      if(typeof window.seedStoredThemeFromLegacy==='function'){
        if(window.seedStoredThemeFromLegacy(a.theme)){
          // Seeded: bring the live document in line, since nothing had painted
          // this value yet.
          applyTheme(a.theme,false);
        }
      }
      _appState.walkthroughCompleted=a.walkthroughCompleted;
      _appState.firstLaunchSeen=a.firstLaunchSeen;
      _appState.continuePromptShown=a.continuePromptShown;
      _appState.recentWards=a.recentWards;
      // Consume the legacy value exactly once, as recent history: prepend it
      // if it names a ward this archive actually contains and is not already
      // listed. It then shows up under Continue Editing, which the user opts
      // into, instead of opening itself.
      if(legacyActiveWardId){
        const legacyWard=caseFile.wards.find(w=>w.wardId===legacyActiveWardId);
        const already=loadRecentlyOpenedWards().some(r=>r&&r.wardId===legacyActiveWardId);
        if(legacyWard&&!already)addToRecentlyOpened(legacyWard);
      }
      _appState.unlockFailState=a.unlockFailState;
      _autoExportIntervalMinutes=(a.autoExportIntervalMinutes==null)?10:Number(a.autoExportIntervalMinutes);
      _lastExportAt=a.lastExportAt||null;
      // Milestone 54: caseFile-scoped, not app-launch-scoped, but carried in
      // this blob rather than its own zip entry -- see buildCaseFileBlob()'s
      // comment on why. A full .sav open is the one path that should adopt
      // the archive's circuit selection; merge-import and crash recovery
      // deliberately do not (case-file.js, recovery-cache.js).
      const sc=Number(a.selectedCircuit);
      caseFile.selectedCircuit=(sc>=1&&sc<=20)?sc:6;
    }catch(e){console.warn('Could not read app preferences from .sav file',e);}
  }
  // Milestone 38C, same rule as above and deliberately outside the appState
  // branch: a single-ward export carries no appState section at all, and this
  // used to fall back to opening wards[0] "solely because data was imported",
  // which 38C's storage table prohibits. Focus stays null for every archive
  // shape; the user chooses Edit from the dashboard.
  caseFile.activeWardId=null;
  // Milestone 40C-A legacy migration rule. Existing nonblank filing and attorney
  // counties are left exactly as stored. For a ward Party with no county, infer
  // one only when every linked filing that HAS a county agrees on the same
  // normalized Florida county, and persist that unanimous value. Conflicting or
  // absent counties leave it blank for the user to resolve on a Cover -- picking
  // silently between two real counties would mis-caption a filing. Never
  // inferred from attorney county, another ward's filing, or the old Pinellas
  // fallback. Runs here so an opened .sav is migrated before anything reads it.
  //
  // Also covers single-ward import, which carries no Party records: the
  // reconstructed ward Party is seeded from that exported filing's own explicit
  // county by the same unanimity rule (a single filing is trivially unanimous).
  if(typeof window.backfillWardPartyCounties==='function'){
    try{window.backfillWardPartyCounties();}
    catch(e){console.warn('Could not backfill ward-party counties',e);}
  }
  _templateCache={};
  for(const type of (Array.isArray(manifest.templates)?manifest.templates:[])){
    const f=zip.file(`templates/${type}.b64`);
    if(f)_templateCache[type]=await f.async('string');
  }
  _auditLogEntries=[];
  _auditLogNextId=1;
  const auditFile=zip.file('auditLog.enc');
  if(auditFile){
    try{
      const entries=await decryptJSONWithKey(await auditFile.async('string'),key);
      if(Array.isArray(entries)){
        _auditLogEntries=entries;
        _auditLogNextId=entries.reduce((m,e)=>Math.max(m,(e&&e.id)||0),0)+1;
      }
    }catch(e){console.warn('Could not read audit log from .sav file',e);}
  }
}


// Lets a user drag a .zip data file straight onto the app window instead of
// clicking through the file picker. dragCounter (rather than a boolean)
// correctly tracks enter/leave across child elements — dragenter/dragleave
// fire once per element boundary crossed, not just once for the window.
function setupDragAndDropImport(){
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
  });
  window.addEventListener('dragover',e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
  });
  window.addEventListener('dragleave',e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
    dragCounter=Math.max(0,dragCounter-1);
    const overlay=document.getElementById('dropzone-overlay');
    if(dragCounter===0&&overlay)overlay.style.display='none';
  });
  window.addEventListener('drop',async e=>{
    if(!isFileDrag(e)){return;}
    e.preventDefault();
    dragCounter=0;
    const overlay=document.getElementById('dropzone-overlay');
    if(overlay)overlay.style.display='none';
    const files=Array.from(e.dataTransfer.files||[]);
    const zipFile=files.find(f=>{const n=f.name.toLowerCase();return n.endsWith('.sav')||n.endsWith('.zip');});
    if(!zipFile){
      if(files.length)await window.alertModal('Please drop a Guardian Forms .sav case data file.');
      return;
    }
    await importGuardianDataZip(zipFile);
  });
}

async function clearAllData(){
  if(!(await window.confirmModal('Clear all data for current form? This cannot be undone.')))return;
  const ward=getActiveWard();
  if(!ward)return;
  const {wardId,wardName,inventoryType,createdDate}=ward;
  Object.assign(ward,initializeEmptyData(ward.inventoryType));
  Object.assign(ward,{wardId,wardName,inventoryType,createdDate});
  saveData();
  updateSidebar();
  navigate('/');
}

// ═══════════════════════════════════════════════════════
// WARD MANAGEMENT
// ═══════════════════════════════════════════════════════

// The carry tables -- ACCOUNTING_FORM_TYPES, PRIOR_ACCOUNTING_SOURCES and
// CARRY_SOURCE_TYPE, which filings may seed a new one -- are
// src/core/navigation/ward-lifecycle.js's; this script's copies, identical
// and the last one unused, went in Milestone 70's 70G.


















// loadRecentlyOpenedWards: src/core/filing/recent-filings.js (Milestone 70, 70G).
function loadRecentlyOpenedWards(){return window.GuardianFormsLegacyBridge.loadRecentlyOpenedWards();}


// addToRecentlyOpened: src/core/filing/recent-filings.js (Milestone 70, 70G).
function addToRecentlyOpened(ward){return window.GuardianFormsLegacyBridge.addToRecentlyOpened(ward);}


// ═══════════════════════════════════════════════════════
// WARD ACTIVATION / UNLOAD (Single Chokepoint)
// ═══════════════════════════════════════════════════════







// ═══════════════════════════════════════════════════════
// MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════

// ensureFragment: src/core/ui/dialogs.js (Milestone 70, 70H).
function ensureFragment(name){return window.GuardianFormsLegacyBridge.ensureFragment(name);}














// ═══════════════════════════════════════════════════════
// ROUTER — see src/core/navigation/router.js
// ═══════════════════════════════════════════════════════
// navigate(), renderPage() and the off-canvas sidebar drawer pair
// (toggleMobileSidebar/closeMobileSidebar) used to be declared here. They now
// live in src/core/navigation/router.js, which publishes all four on window.
// Bare calls to them elsewhere in this file resolve to those, because a
// top-level `function` here only ever created the same global property that
// router.js then assigned over.

// Computes each ward's headline "total" using its own inventory type's
// existing, already-correct totals logic — by briefly pointing window.D at
// that ward, reading the result, then restoring the real active ward.
// Safe because this all runs synchronously with no awaits in between, so no
// other code can observe window.D pointing at the wrong ward mid-computation.
function getWardHeadlineTotal(ward){
  if(!ward)return null;
  const previousD=window.D;
  window.D=ward;
  let total=null;
  try{
    if(ward.inventoryType==='guardian')total=calc.total();
    else if(ward.inventoryType==='simplified')total=calcTotals().remaining;
    else if(formEngine(ward.inventoryType)==='annual'){
      const t=calcTotalsAnnual(ward);
      total=(t.netAssetsFromD!==0 || (t.schD1_total||t.schD2_ward||t.schD3_ward||t.schD4_ward||t.schD5_total)) ? t.netAssetsFromD : (t.netAssets||0);
    }
  }catch(e){console.warn('Dashboard: could not compute total for ward',ward.wardId,e);}
  finally{window.D=previousD;}
  return total;
}







// updateSidebar: src/core/shell/sidebar.js (Milestone 70, 70H).
function updateSidebar(){return window.GuardianFormsLegacyBridge.updateSidebar();}

// ═══════════════════════════════════════════════════════
// CONVERT EXISTING WARD — creates a new ward of a different inventory type,
// carrying over header info always, and schedule/asset data wherever the
// source and target types have a genuine real-world equivalent. See the
// per-pair functions below for exactly what maps where and why.
// ═══════════════════════════════════════════════════════












// ═══════════════════════════════════════════════════════
// MULTI-YEAR ACCOUNTING (save / switch / edit by year)
// ═══════════════════════════════════════════════════════



















// ═══════════════════════════════════════════════════════
// INVENTORY TYPE SELECTOR PAGE
// ═══════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════
// WIZARD: GUARDIAN INVENTORY
// ═══════════════════════════════════════════════════════


// Simplified Accounting is extracted into src/features/simplified-accounting/
// (Milestone 2, Phase D) -- these two bridges dynamically import it, cache
// the module, and delegate. See src/features/simplified-accounting/index.js
// for the module itself; see the Milestone 2 plan's "Problem 2" (and the
// Milestone 3 plan's "Problem 2", which generalized this into
// window.createFeatureBridge once a second feature proved the shape was
// genuinely duplicated) for why this hand-rolled bridge exists instead of
// INDEX-SPLIT-PLAN.md's full staging-host router (that router arbitrates
// between several *concurrently competing* lazy features -- this app never
// mounts two features racing for the same container, since switchWard()
// always fully changes the active ward before any render happens).
//
// Routed through window.loadSimplifiedFeature (src/features-loader.js)
// rather than a direct import() here -- this file is an opaque classic-
// script static passthrough Vite never processes, so a dynamic import()
// written directly in this file would be invisible to Vite's build and the
// target files would simply be missing from dist/web and dist/portable. See
// features-loader.js's own comment for the full reasoning, including why
// dist/portable specifically needs this.
//
// window.createFeatureBridge() itself must NOT be called at this file's top
// level: legacy-app.js is a classic, parser-blocking <script src> that runs
// synchronously as the parser reaches it, while `<script type="module">`
// tags (core/feature-bridge.js included) are implicitly deferred and don't
// execute until after the whole document has finished parsing -- strictly
// AFTER this file's top-level code runs, even though they appear earlier in
// index.html. window.createFeatureBridge is not yet a function at that
// point. Constructing the bridge lazily, on first actual call, sidesteps
// that -- the same safe pattern window.loadFragment/window.emptyDataSimplified
// already use.
//
// Milestone 40G correction: this comment used to claim the first call
// "only happens later, in response to user navigation, long after the
// deferred module scripts have run." That was false for any feature mounted
// during startup. The dashboard is the landing page, so its bridge was
// constructed inside initApp()'s first renderPage() and threw
// "window.createFeatureBridge is not a function" on every load. Laziness
// cannot help a feature that is mounted immediately. Startup is now driven
// from src/main.js after module evaluation, which is what actually
// guarantees the ordering -- do not reintroduce a top-level initApp() call
// here, and do not assume a lazy bridge is safe merely because it is lazy.
let _simplifiedFeatureBridge=null;
function getSimplifiedFeatureBridge(){
  return _simplifiedFeatureBridge??=window.createFeatureBridge(()=>window.loadSimplifiedFeature());
}
async function mountSimplifiedFeature(page){
  await getSimplifiedFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountSimplifiedNav(container){
  await getSimplifiedFeatureBridge().mountNav(container);
}

// ═══════════════════════════════════════════════════════
// Annual Accounting is extracted into src/features/annual-accounting/
// (Milestone 7, Phase A -- data/pages/nav/validate; print/PDF/Excel export
// stay here as legacy until Phase B). Also covers the finalAccounting/
// trustAccounting aliases -- formEngine() maps all three to 'annual'
// everywhere the app dispatches on type, so this one bridge serves all
// three ward types with no per-alias branching anywhere.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above) for why.
let _annualFeatureBridge=null;
function getAnnualFeatureBridge(){
  return _annualFeatureBridge??=window.createFeatureBridge(()=>window.loadAnnualFeature());
}
async function mountAnnualFeature(page){
  await getAnnualFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountAnnualNav(container){
  await getAnnualFeatureBridge().mountNav(container);
}

// buildNavAnnual()..pagePart11Annual()/validateAnnual() moved to
// src/features/annual-accounting/index.js (Milestone 7, Phase A).

// Guardian Inventory's page/nav/validation/row UI moved to
// src/features/guardian-inventory/index.js (Milestone 8, Phases A and B --
// print/PDF/Excel import-export now live in that feature's print.js/
// excel.js too). Shared Excel helpers (excelCapacityPanel(), ensureTemplate()
// -- checkExcelCapacity() moved to core in Milestone 51F),
// openFloridaCourtPortal(), and dashboard calc/mk stay legacy -- shared
// with Annual/Simplified or needed synchronously before this feature loads.
let _guardianFeatureBridge=null;
function getGuardianFeatureBridge(){
  return _guardianFeatureBridge??=window.createFeatureBridge(()=>window.loadGuardianFeature());
}
async function mountGuardianFeature(page){
  await getGuardianFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountGuardianNav(container){
  await getGuardianFeatureBridge().mountNav(container);
}
async function ensureGuardianFeatureReady(){
  if(typeof window.loadGuardianFeature!=='function'){
    await new Promise(resolve=>document.addEventListener('features-loader-ready',resolve,{once:true}));
  }
  await window.loadGuardianFeature();
}

// Dashboard's own rendering (pageDashboard()..toggleWardArchived(),
// getWardProgress()) moved to src/features/dashboard/index.js (Milestone
// 9). Ward-management CRUD (addWard, switchWard, deleteWard, convertWard,
// all modals, year management) stays legacy: it's called from the topnav on
// every page, not just the dashboard, so gating it behind this feature's lazy
// load would break "Switch Ward"/"+ New Form" on every other page.
// getWardHeadlineTotal(), typeIcon() and INVENTORY_TYPE_META also stay legacy
// for the same reason -- refreshWardInfoCard() and the ward-selector dropdown
// need them on every page too. (formatDashboardCurrency() was in that list
// until Milestone 70's 70B moved it to src/core/format/money.js, which loads
// eagerly; renameWard and its dialog went in 70B too, unreachable since the
// Milestone 36 dashboard consolidation, e5fb9cf, removed the button.)
let _dashboardFeatureBridge=null;
function getDashboardFeatureBridge(){
  return _dashboardFeatureBridge??=window.createFeatureBridge(()=>window.loadDashboardFeature());
}
async function mountDashboardFeature(page){
  await getDashboardFeatureBridge().mountPage(document.getElementById('main-content'),page);
}


// ── Plan form controls ───────────────────────────────────








// ═══════════════════════════════════════════════════════
// Simplified Annual Plan is extracted into src/features/plan-simplified/
// (Milestone 3, Phases B and C -- data/validation/pages, and print/PDF
// export). See src/features/simplified-accounting/index.js's header
// comment and the Milestone 3 plan for the pattern and reasoning. txtP/
// chkP/yesNoCheckboxS/radioP/pageNavS above stay here as legacy globals,
// reached via window by every extracted Plan module (Problem 3) -- with
// planMinor extracted in Milestone 6, all four Plan types now share them
// this way, and moving them into a shared core module is a separate
// restructuring not required by this milestone.
// ═══════════════════════════════════════════════════════
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment above for why
// (module <script> tags are deferred and run after this classic script's
// top-level code, so window.createFeatureBridge isn't a function yet then).
let _planSimplifiedFeatureBridge=null;
function getPlanSimplifiedFeatureBridge(){
  return _planSimplifiedFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanSimplifiedFeature());
}
async function mountPlanSimplifiedFeature(page){
  await getPlanSimplifiedFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanSimplifiedNav(container){
  await getPlanSimplifiedFeatureBridge().mountNav(container);
}

// ═══════════════════════════════════════════════════════
// Annual Guardianship Plan is extracted into src/features/plan-annual/
// (Milestone 4, Phases A and B -- data/validation/pages, and print/PDF
// export). See src/features/plan-simplified/index.js's header comment and
// the Milestone 4 plan for the pattern and reasoning. planQ/planCheckGroup
// immediately below, and planEmptyRow/addPlanRow/removePlanRow/
// duplicatePlanRow further down, stay here as legacy globals -- despite
// sitting in what reads as "this section," they are not planAnnual-
// exclusive (Milestone 4 plan's "Design decisions"), and with planMinor
// extracted in Milestone 6 all four Plan types now reach them via window.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planAnnualFeatureBridge=null;
function getPlanAnnualFeatureBridge(){
  return _planAnnualFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanAnnualFeature());
}
async function mountPlanAnnualFeature(page){
  await getPlanAnnualFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanAnnualNav(container){
  await getPlanAnnualFeatureBridge().mountNav(container);
}


// pagePlanACover()..pagePlanASignatures() moved to
// src/features/plan-annual/index.js (Milestone 4, Phase A).


// validatePlanAnnual() moved to src/features/plan-annual/index.js
// (Milestone 4, Phase A).

// docHeaderPlanSimplified()/buildPrintHTMLPlanSimplified() moved to
// src/features/plan-simplified/print.js (Milestone 3, Phase C).

// ── Pre-filing readiness check ───────────────────────────
// planReadinessChecks()/planReadinessPanel() -- the four Plan types' hand-
// maintained checklist dispatcher and always-expanded panel -- were replaced
// by the shared readiness card in Milestone 44C: predicates live in
// src/core/filing/readiness-config.js, rendering in readiness-card.js.

// pagePrintPlanSimplified()/doSavePdfPlanSimplified() moved to
// src/features/plan-simplified/print.js (Milestone 3, Phase C).

// docHeaderPlanAnnual()/buildPrintHTMLPlanAnnual()/pagePrintPlanAnnual()/
// doSavePdfPlanAnnual() moved to src/features/plan-annual/print.js
// (Milestone 4, Phase B). The lazy module bridge in that feature's index.js
// exposes doSavePdfPlanAnnual on window so the print page's
// onclick="doSavePdfPlanAnnual()" still resolves.

// ═══════════════════════════════════════════════════════
// Initial Guardianship Plan is extracted into src/features/plan-initial/
// (Milestone 5, Phase A -- data/validation/pages; print/PDF export stays
// here as legacy until Phase B). See src/features/plan-simplified/index.js's
// header comment and the Milestone 5 plan for the pattern and reasoning.
// planQ/planCheckGroup (defined above, in the Plan Annual section) and
// planEmptyRow/addPlanRow/removePlanRow/duplicatePlanRow (further below)
// stay legacy globals, reached via window (see the Plan Minor section
// below for why this no longer depends on any type being "not yet
// extracted"). INITIAL_ADLS/INITIAL_ADL_RATINGS/emptyInitialProvider stay
// legacy because computeNavChecks()'s planInitial branch reads them
// directly.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planInitialFeatureBridge=null;
function getPlanInitialFeatureBridge(){
  return _planInitialFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanInitialFeature());
}
async function mountPlanInitialFeature(page){
  await getPlanInitialFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanInitialNav(container){
  await getPlanInitialFeatureBridge().mountNav(container);
}

// buildNavPlanInitial()..pagePlanIAttorney()/validatePlanInitial() moved to
// src/features/plan-initial/index.js (Milestone 5, Phase A).

// ═══════════════════════════════════════════════════════
// Annual Plan -- Minors is extracted into src/features/plan-minor/
// (Milestone 6, Phases A and B -- data/validation/pages, and print/PDF
// export). See src/features/plan-simplified/index.js's header comment and
// the Milestone 6 plan for the pattern and reasoning. This was the fourth
// and last Plan-family type, so planQ/planCheckGroup (defined above, in the
// Plan Annual section) and planEmptyRow/addPlanRow/removePlanRow/
// duplicatePlanRow (further below) now have no not-yet-extracted Plan type
// left to be shared with -- they stay legacy globals regardless, since
// every extracted Plan module already reaches them via window, and moving
// them into a shared core module is a separate restructuring not required
// by this milestone (see the Milestone 4/5 plans' deferred
// features/plans/ restructuring note).
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planMinorFeatureBridge=null;
function getPlanMinorFeatureBridge(){
  return _planMinorFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanMinorFeature());
}
async function mountPlanMinorFeature(page){
  await getPlanMinorFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanMinorNav(container){
  await getPlanMinorFeatureBridge().mountNav(container);
}

// buildNavPlanMinor()..pagePlanMPreparerAttorney()/validatePlanMinor() moved
// to src/features/plan-minor/index.js (Milestone 6, Phase A).

function n(v){return parseFloat(v)||0;}
function pct(v){if(v===''||v===null||v===undefined)return 1;const p=parseFloat(v);return isNaN(p)?1:p>1?p/100:p;}

// calcTotalsAnnual() and annualReconcileState() moved to src/features/annual-accounting/totals.js (Milestone 19E).
// Eagerly loaded via src/features-loader.js to serve as the single source of truth across
// the dashboard, forms, preview, Excel export, and accessible PDF generation.


// fmtD()/fmtAnnual()/DISB_CATS/docHdr()/sl()/slR()/buildPrintHTMLAnnual()
// moved to src/features/annual-accounting/print.js (Milestone 7, Phase B).

// ═══════════════════════════════════════════════════════
// EXCEL TEMPLATE CAPACITY
// ═══════════════════════════════════════════════════════
// The official court .xlsx templates have a FIXED number of pre-formatted
// rows per schedule, and the export writes into those rows by position.
// Anything beyond the last row has nowhere to go — the export code simply
// skips it (`if(i<20){…}` with no else), which previously meant entries
// could vanish silently from a document filed with the court.
//
// These numbers mirror the guards in doSaveExcelAnnual()/…Simplified()
// exactly; if a template is ever swapped for one with more rows, update
// BOTH the export guard and the matching number here.
//
// Note this is an Excel-only limit: the PDF/print path renders every entry
// no matter how many there are, so overflow blocks the Excel button only
// and deliberately leaves PDF export available.
// Initial Inventory (feature-owned GUARDIAN_EXCEL_CAPS, in
// src/features/guardian-inventory/excel.js) overflows differently from the
// other two types: its fillScheduleXX() helpers walk a fixed list of
// template pages, and once the slots run out pageIdx runs past the end of
// pages[], so `pages[pageIdx].name` throws. The export then dies in its
// catch block and prints the raw TypeError into a status line that clears
// itself after three seconds — no file, no usable explanation. Same guard
// as the other types turns that into a clear, actionable message.

// Milestone 51F deleted this file's checkExcelCapacity() twin. It duplicated
// src/core/excel/excel-capacity.js's implementation of the same rule verbatim --
// the remuneration-filtering comment above was present, word for word, in both --
// and the two ran on different paths: the three feature index.js files
// destructured THIS one off `window` for the print-page capacity panel, while
// their sibling excel.js files reached the core one through
// getExcelCapacityIssues() for the export gate. A capacity rule that can
// disagree between the readiness panel and the export gate is exactly the class
// of defect AGENTS.md section 4's parity invariant exists to prevent, and nothing
// kept the two copies in step.
//
// The three index.js files now import the core version directly and pass
// window.D explicitly. It is a strict superset: it takes the data as an argument
// instead of reading the global implicitly, guards a null/non-object caps entry,
// and adds a `key` field to each overflow record. excelCapacityPanel() below
// reads only label/route/cap/count, so the extra field is inert, and every cap
// entry in all three CAPS tables defines a label, so core's `info.label || key`
// fallback can never differ from this version's plain info.label.



// pagePrintAnnual()/doSavePdfAnnual() moved to
// src/features/annual-accounting/print.js (Milestone 7, Phase B).


// doSaveExcelAnnual()/importExcelAnnual() moved to
// src/features/annual-accounting/excel.js (Milestone 7, Phase B).


// ═══════════════════════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════════════════════
// Guardian Inventory's calc.totalA1(), calc.wardVal(entry), ... live in
// src/features/guardian-inventory/totals.js since Milestone 70's 70B; this is
// the one-line wrapper this script's callers use (see COMMON HELPERS above).
const calc=new Proxy({},{get:(_,k)=>window.GuardianFormsLegacyBridge.calc[k]});


// ═══════════════════════════════════════════════════════
// SCHEDULE_NAV_KEYS, the Initial Inventory's schedule route keys, moved to
// src/core/filing/models/guardian.js with the completion evaluators (Milestone
// 70, 70D); this script reads it off the bridge where it uses it.
// A schedule's own "Next" button is disabled until computeNavChecks()
// says that schedule is complete (a real row, or the "no items" checkbox).
// afterChange() stays legacy in Milestone 8A and still needs this helper.
// ═══════════════════════════════════════════════════════
// FORM BINDING ENGINE
// ═══════════════════════════════════════════════════════
// setPath: src/core/form/paths.js (Milestone 70, 70F).
function setPath(obj,path,val){return window.GuardianFormsLegacyBridge.setPath(obj,path,val);}


// The sidebar's section marks for the open filing. Milestone 70's 70D moved
// the rules to src/core/status/completion.js -- one pure evaluator per engine,
// handed the filing explicitly -- and the registry dispatches to them; this
// hands them the open filing, this script's own activeInventoryType, and what
// they cannot import: the Initial Inventory's validator (its marks are
// bucketed from the export validator's own issues; it exists once that
// feature has loaded) and the Annual totals. getWardProgress() below hands the same. updateNavDots()
// applies the map to the page.
function computeNavChecks(){return window.GuardianFormsLegacyBridge.computeNavChecks(window.D,activeInventoryType,{validateGuardian:window.validateGuardian,calcTotalsAnnual,annualReconcileState});}



// Filing progress for any filing, open or not (the dashboard's cards). Since
// Milestone 70's 70D the evaluator takes the filing explicitly; this used to
// point window.D and activeInventoryType at the filing, reuse the sidebar's
// logic, and put them back.
function getWardProgress(ward){return window.GuardianFormsLegacyBridge.getWardProgress(ward,{validateGuardian:window.validateGuardian,calcTotalsAnnual,annualReconcileState});}








// ── helpers ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// SCHEDULE SUPPORTING DOCUMENTS & COMMENTS
// ═══════════════════════════════════════════════════════
 // 15MB/file — base64 inflates ~33% in storage and the .sav backup













// th()/totRow()/printEmptyRow()/docHeader() moved to
// src/features/guardian-inventory/print.js (Milestone 8, Phase B), being
// Guardian-only; td(), which Annual's print.js shares, is
// src/core/form/field-html.js's since Milestone 70's 70F, and the unused
// tdR() went then.

// pagePrint()/buildPrintHTML() moved to
// src/features/guardian-inventory/print.js (Milestone 8, Phase B).


// pagePrint()/buildPrintHTML()/doSavePdf()/doSaveExcel()/importExcelFile()/
// parseInitialInventoryWorkbook()/GUARDIAN_EXCEL_CAPS moved to
// src/features/guardian-inventory/print.js and excel.js (Milestone 8, Phase B).

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
document.querySelectorAll('.nav-link-item[data-page]').forEach(btn=>{
  btn.addEventListener('click',()=>navigate(btn.dataset.page));
});

// Hash-based routing. Each filing type's page list is FILING_PAGES in
// src/core/filing/filing-registry.js (moved there by Milestone 70's 70C).

function updateNavActive(page){
  document.querySelectorAll('.nav-link-item[data-page]').forEach(btn=>{
    const isActive=btn.dataset.page===page;
    btn.classList.toggle('active',isActive);
    // aria-current, not aria-selected — these are navigation links to
    // different pages/sections, not tabs or options within one control.
    if(isActive)btn.setAttribute('aria-current','page');
    else btn.removeAttribute('aria-current');
  });
}

const SPECIAL_PAGES=['/dashboard','/inventory-select','/activity-log','/party-management']; // valid regardless of activeInventoryType
async function handleHash(){
  const h=window.location.hash.replace('#','');
  if(SPECIAL_PAGES.includes(h)){
    // router.js's navigate() sets window.location.hash itself, then renders
    // directly -- but assigning the hash also queues this same listener via
    // the browser's native 'hashchange' event, which fires asynchronously
    // afterward and re-renders a second time for no reason. Harmless for a
    // plain re-render, but showContinuePromptIfNeeded() is a one-shot: its
    // first run draws the banner and marks itself shown, so the redundant
    // second run immediately wipes what the first just drew. currentPage
    // already equals h whenever navigate() (or renderPage()'s own redirect)
    // already handled this exact hash, which is the only case this skips.
    if(currentPage===h)return;
    currentPage=h;
    renderPage(h);
    // renderPage() may have redirected (e.g. /dashboard with no wards yet
    // lands on /inventory-select instead) and updated currentPage itself —
    // reflect wherever it actually landed, not the hash this call started
    // with, or the nav highlight points at a page nothing rendered.
    updateNavActive(currentPage);
    return;
  }
  const wizardPages=window.GuardianFormsLegacyBridge.FILING_PAGES[activeInventoryType]||window.GuardianFormsLegacyBridge.PAGES_GUARDIAN;
  const valid=wizardPages.map(p=>p.id);
  const page=valid.includes(h)?h:'/';
  currentPage=page;
  renderPage(page);
  updateNavActive(currentPage);
}

window.addEventListener('hashchange',handleHash);
window.addEventListener('beforeunload',flushPendingSave);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)flushPendingSave();
  else updateLastSavedIndicator(); // background tabs throttle the 30s ticker, so the "X minutes ago" text can go stale while hidden
});

// beforeunload cannot reliably await either file or IndexedDB writes. The
// recovery snapshot is best-effort, so retain the native dirty-state warning.
// initApp() arms it only after startup completes.
function warnBeforeUnloadIfDirty(e){
  if(!_dirtySinceExport)return;
  e.preventDefault();
  e.returnValue=''; // required for Chrome to show its native confirmation
}

const TEMPLATE_FILES={
  simplified:'SimplifiedAccounting.xlsx',
  annual:'Annual Accounting 080123.xlsx',
  guardian:'a_InitialInventory (3).xlsx',
};

function isValidXlsxB64(b64) {
  return typeof b64 === 'string' && (b64.startsWith('UEsDB') || b64.startsWith('UEsBA'));
}

async function fetchAndCacheTemplate(type,filename){
  if(location.protocol==='file:')return null;
  try{
    console.log(`Fetching ${filename}...`);
    const resp=await fetch(filename);
    if(!resp.ok){console.warn(`Template fetch failed for ${type}, status:`,resp.status);return null;}
    const blob=await resp.blob();
    console.log(`Converting ${type} to base64...`);
    return await new Promise((resolve)=>{
      const reader=new FileReader();
      reader.onload=async(e)=>{
        try{
          const b64=e.target.result.split(',')[1];
          if(!isValidXlsxB64(b64)){
            console.warn(`Fetched template for ${type} is not a valid XLSX zip file. Skipping cache.`);
            resolve(null);
            return;
          }
          console.log(`Caching ${type} template...`);
          await saveTemplate(type,b64);
          console.log(`${type} template auto-loaded successfully`);
          resolve(b64);
        }catch(err){console.warn(`Failed to save ${type}:`,err);resolve(null);}
      };
      reader.onerror=()=>{console.warn(`FileReader error for ${type}`);resolve(null);};
      reader.readAsDataURL(blob);
    });
  }catch(e){console.warn(`Failed to auto-load ${type} template:`,e);return null;}
}


// Imported spreadsheets are parsed and discarded. Only bundled blank
// templates enter the in-memory template cache and subsequent .sav writes.
async function ensureTemplate(type){
  const bundled=embeddedTemplate(type);
  if(bundled&&isValidXlsxB64(bundled))return bundled;

  const existing=await loadTemplate(type);
  if(existing&&isValidXlsxB64(existing))return existing;

  const fetched=await fetchAndCacheTemplate(type,TEMPLATE_FILES[type]);
  if(fetched&&isValidXlsxB64(fetched))return fetched;

  return (bundled&&typeof bundled==='string')?bundled:null;
}

async function autoLoadTemplates(){
  if(location.protocol==='file:'){console.log('Skipping auto-load on file:// protocol');return;}
  for(const type of Object.keys(TEMPLATE_FILES)){
    console.log(`Checking for existing ${type} template...`);
    const existing=await loadTemplate(type);
    if(existing){console.log(`${type} template already exists`);continue;}
    if(embeddedTemplate(type)){
      // Bundled with the app — no fetch needed. ensureTemplate() will pick
      // it up and cache it on first export.
      console.log(`${type} template is bundled with the app`);
      continue;
    }
    await fetchAndCacheTemplate(type,TEMPLATE_FILES[type]);
  }
}

// renderCopyrightNotice: src/core/shell/sidebar.js (Milestone 70, 70H).
function renderCopyrightNotice(){return window.GuardianFormsLegacyBridge.renderCopyrightNotice();}

// The door from this script into src/core/runtime/monolith.js (Milestone 70,
// 70E): it hands the moved code the functions here that it calls back. The
// second transition exception MILESTONE-70-PROPOSAL.md records; goes in 70L.
function provideMonolithServices(fns){return window.GuardianFormsLegacyBridge.provideMonolithServices(fns);}

async function initApp(){
  // Milestone 70's 70E: hand the moved code the functions of this script it
  // calls (src/core/runtime/monolith.js), before anything can call back.
  provideMonolithServices({auditLog,autoSave,clearAllData,computeNavChecks,flushPendingSave,getCurrentPage,getWardHeadlineTotal,getWardProgress,isContinuePromptShown,loadAuditLogEntries,lockApp,markContinuePromptShown,mountAnnualNav,mountGuardianNav,mountPlanAnnualNav,mountPlanInitialNav,mountPlanMinorNav,mountPlanSimplifiedNav,mountSimplifiedNav,saveData,saveWardToState});
  renderCopyrightNotice();
  // Resolve file selection before the unlock flow.
  await promptOpenOrStartAtLaunch();
  await ensureUnlocked(); // blocks until a valid master-password key is in memory
  await loadGuardianData();
  await autoLoadTemplates();

  // pg-last-position (recovery-cache.js) carries no case data, just the
  // route/ward the filer was last on -- so it is only meaningful once an
  // existing case has actually been loaded (_openedFileAtLaunch), and only
  // if that ward still exists in it.
  const lastPosition=_openedFileAtLaunch?window.loadLastPosition?.():null;
  let positionApplies=false;
  if(lastPosition&&lastPosition.route){
    if(lastPosition.wardId){
      if(caseFile.wards.some(w=>w.wardId===lastPosition.wardId)){
        caseFile.activeWardId=lastPosition.wardId;
        positionApplies=true;
      }
    }else{
      positionApplies=true;
    }
  }

  const activeWard=getActiveWard();
  if(activeWard){
    const ok = await activateWard(activeWard);
    if (!ok) {
      window.location.hash = '/dashboard';
      positionApplies=false;
    }
  }

  updateSidebar();
  if(positionApplies){
    window.location.hash=lastPosition.route;
  }else if(_openedFileAtLaunch || !caseFile.activeWardId){
    window.location.hash='/dashboard'; // opened an existing case with no remembered position — land on All Wards
  }
  handleHash();
  await loadAutoExportPrefs();
  setupAutoExportTimer();
  setupLastSavedTicker();
  setupFallbackSaveReminder();
  setupDragAndDropImport();
  notifyProbateGuardianTabStateChanged();
  window.addEventListener('beforeunload',warnBeforeUnloadIfDirty);
}


// Keep paired "From"/"To" date fields consistent: never let From be after To
// or To be before From. Pairs are detected by finding two date inputs that
// share a .row container with labels containing the words "From" and "To"
// (e.g. "Period From" / "Period To", "Bond Period – From" / "– To").
// Milestone 40C-C: enforceDateRanges() and wireDateRangePair() were removed
// from here, and nothing replaces them. Editing one endpoint of a date range
// must never change the other; checkDateOrder() (src/core/validation/
// date-rules.js), called from each filing type's validator, is now the single
// place an end-before-start range is reported.
//
// They were actively destroying valid data. The pair swapped endpoints
// whenever `fromInp.value > toInp.value`, but these are NOT native
// <input type="date"> controls -- form-fields.js renders every date field as
// `type="text"` holding the display form, so `.value` is MM/DD/YYYY, not
// YYYY-MM-DD. Comparing those strings compares the MONTH first and the year
// last, so an ordinary accounting period like 05/10/2026 -> 05/09/2027 read
// as reversed ("05/1" > "05/0") and the To field was silently overwritten
// with the From date. Any period not starting on January 1 could lose its end
// date this way, which is why a 01/01/2025 -> 12/31/2025 spot check saw
// nothing: a January start is the one shape the comparison gets right.
//
// An earlier revision of this code also set min/max on each input, which is
// the known cause of Chrome refusing digit-by-digit typing into a date field
// (reported against Part I's Period To). That is gone too and must not come
// back; the validator, not the input, is where range order belongs.

// Guards against a native <input type="date"> committing an implausible
// year (e.g. "0002-05-10" left behind by a stray keystroke) -- HTML5 date
// inputs treat any 1-4 digit year as a "complete", non-empty value, so
// nothing else in the app ever sees this as invalid or unanswered. One
// delegated listener on `document`, registered once here rather than per
// input, so it covers every date field regardless of which of the app's
// several wiring conventions that field uses -- catching this everywhere
// without touching each of the ~50 individual date inputs.
// MUST be 'focusout', not 'change': Chrome fires 'change' on a date input
// the instant the year segment LOOKS complete, including every transient
// state while the user is still typing it digit-by-digit (typing "2026"
// passes through "0002", "0020", "0202" first). Hooking 'change' here
// blanked the field mid-keystroke on that transient "0002", which the
// browser's date control then treated as a fresh, empty field and
// restarted segment focus from the month -- so the rest of what the user
// was typing landed in the wrong segments (reported: typing "05102026"
// kept "0510" but the year ended up "0026" with month/day scrambled).
// 'focusout' only fires once the user actually leaves the control -- HTML5
// date inputs keep focus on the whole control while moving between their
// internal month/day/year segments, so this never fires mid-entry, only
// once a real (if implausible) value has actually been committed.
// Bubbles on its own (unlike 'blur'), so no capture flag is needed.
// Re-dispatches 'change' after clearing so bindForms()'s own listener
// (and anything else watching 'change') sees the correction and doesn't
// leave the blanked-out DOM value out of sync with window.D.
document.addEventListener('focusout',e=>{
  const el=e.target;
  if(!el||el.tagName!=='INPUT'||el.type!=='date'||!el.value)return;
  const m=el.value.match(/^(\d{4})-\d{2}-\d{2}$/);
  if(m&&(+m[1]<1900||+m[1]>new Date().getFullYear()+30)){
    el.value='';
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
});

// The "filing is open in another tab" dialog is src/core/ward-lock.js's
// (Milestone 70, 70H).

// The startup label linking that used to be queued here (setTimeout(..., 0))
// is main.js's since Milestone 70's 70F: linkLabelsToInputs() is a module's
// now, and a timer queued by this classic script can fire before main.js --
// a deferred module -- has put the bridge on window.
// initApp() is NOT called here. This file is a classic, parser-blocking
// script, so it runs before any `<script type="module">` has evaluated --
// which meant startup reached code depending on module-provided globals
// (window.createFeatureBridge, and the case-file.js persistence functions)
// before those globals existed. src/main.js calls window.initApp() as its
// last statement instead, after every module import has evaluated, so the
// whole boot path has one explicit ordering guarantee rather than racing
// deferred module evaluation. See MILESTONE-40G-PROPOSAL.md.
