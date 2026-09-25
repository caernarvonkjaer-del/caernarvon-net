// Input and imported-file hardening: the free-text injection checks the
// Annual family's fields run on blur, and the gate every Excel and .sav import
// passes before a parser sees the file. Moved from src/legacy-app.js by
// Milestone 70's 70B, comments and all.

// ── SECURITY VALIDATION ──────────────────────────────
// A SQL-injection keyword/pattern detector used to sit here (bare
// \bupdate\b/\bdelete\b/\binsert\b/\bdrop\b/\bexec\b/-- matches) and ran on
// every plain free-text field in Annual/Final/Trust Accounting on blur
// (validateSecurityInput() below). This app has no SQL backend anywhere --
// nothing it ever produces is a database query built from user input -- so
// the check protected against a vector that doesn't exist here, while
// blanking real filer text on a false-positive keyword match: a Schedule C
// description reading "Update to appraisal value" or "Sale of lot -- see
// attached" was silently wiped to empty on blur, with only a console.warn
// no filer would ever see. Removed rather than narrowed: there is no SQL
// query context downstream for any narrower pattern to legitimately guard.
// detectXSSPayload() and detectPathTraversal() stay -- both match tag/URI
// syntax unlikely to appear in ordinary legal narrative, not bare English
// words, so they carry a much lower false-positive cost for whatever benefit
// they still provide.


// Detect and block XSS/HTML injection
export function detectXSSPayload(s){
  const xssPatterns=[/<script[^>]*>|javascript:|on\w+\s*=|<iframe|<object|<embed|<img[^>]+onerror|<svg[^>]+on|<body[^>]+on|eval\(|expression\(|vbscript:/i];
  return xssPatterns.some(p=>p.test(String(s||'')));
}

// Detect and block path traversal attempts
export function detectPathTraversal(s){
  const pathPatterns=[/\.\.\//,/\.\.\\/,/^\/etc\//,/\/etc\//i,/^[a-z]:\\/i];
  return pathPatterns.some(p=>p.test(String(s||'')));
}

// Sanitize input: remove dangerous characters but preserve legitimate data
// Milestone 40H-G: dropped the straight apostrophe from the stripped set --
// it turned "ward's" into "wards" in ordinary narrative text. Only the
// actual HTML/script-injection vectors stay stripped (<, >, ", and `);
// detectXSSPayload() above matches on tag syntax, not quote characters, so
// narrowing this doesn't reopen it.
export function sanitizeInput(s){
  if(!s)return s;
  let cleaned=String(s);
  cleaned=cleaned.replace(/[<>"`]/g,'');
  cleaned=cleaned.replace(/javascript:/gi,'');
  cleaned=cleaned.replace(/on\w+=/gi,'');
  return cleaned;
}

// Validate field value for security and format
export function validateSecurityInput(fieldName,value){
  const v=String(value||'');
  if(detectXSSPayload(v)||detectPathTraversal(v)){
    console.warn(`Security: Blocked dangerous input in ${fieldName}`);
    return '';
  }
  return sanitizeInput(v);
}

// ── IMPORTED FILE HARDENING ──────────────────────────
// Every import entry point (the three Excel importers, their drag-and-drop
// equivalent, and the .sav/.zip picker) hands this module a file chosen by
// whoever is sitting at the browser — including a guardian who was emailed
// a "fixed" template by someone else. Nothing here assumes the extension
// matches the content, or that the content is well-formed.
export const IMPORT_SIZE_LIMITS = {
  xlsx:10*1024*1024,  // court templates run well under 1MB; 10MB is generous headroom
  sav:50*1024*1024    // a .sav can bundle many wards plus attachments (15MB cap each, see SCHEDULE_DOC_MAX_FILE_BYTES)
};
export const ZIP_MAGIC = [0x50,0x4B,0x03,0x04]; // local-file-header signature 'PK\x03\x04' — every .xlsx and .sav is a ZIP container

// Rejects a file before it ever reaches ExcelJS/JSZip: empty, over the size
// ceiling for its kind, or not actually a ZIP (accept=".xlsx" is only a
// filename hint — the browser does not enforce it, and a court-issued
// template you were emailed could be anything with that extension slapped
// on). Checking the first 4 bytes rather than trusting file.name/file.type
// means a renamed non-ZIP file fails fast with a clear message instead of
// reaching the parser at all.
export async function validateImportFile(file,kind){
  if(!file)return{ok:false,message:'No file was selected.'};
  if(file.size===0)return{ok:false,message:'That file is empty.'};
  const limit=IMPORT_SIZE_LIMITS[kind]||IMPORT_SIZE_LIMITS.xlsx;
  if(file.size>limit){
    return{ok:false,message:`That file is ${(file.size/1024/1024).toFixed(1)} MB, which is over the ${(limit/1024/1024)|0} MB limit for this kind of import.`};
  }
  let head;
  try{
    head=new Uint8Array(await file.slice(0,4).arrayBuffer());
  }catch(e){
    return{ok:false,message:'That file could not be read.'};
  }
  if(head.length<4||!ZIP_MAGIC.every((b,i)=>head[i]===b)){
    return{ok:false,message:'That file is not a valid Excel/.sav file (its contents do not match a ZIP archive, regardless of its name).'};
  }
  return{ok:true};
}

// Several pages embed their own copy of an import zone, each with its own
// #import-progress(-simplified|-annual) div sitting next to the file input
// (see pageCover/pageSimplified/pageAnnual) — walk up from the input that
// actually fired rather than assuming a single global id, or status text
// meant for one copy of the zone can silently land in a different one (or
// nowhere, if this page happens not to render the first id at all).
export function getImportProgressEl(input){
  const scope=input&&input.closest?input.closest('.accordion-body'):null;
  return (scope&&scope.querySelector('[id^="import-progress"]'))||document.getElementById('import-progress');
}

// Defense-in-depth after a workbook otherwise passes the size/magic-byte
// gate above: a small ZIP can still decompress into a workbook with an
// enormous used range (a "sheet with a huge used range" — the case this
// guards against). This app's own readers only ever touch a fixed, known
// set of cell addresses per template — they were never the unbounded
// `sheet.rowCount`/`eachRow` loops that would normally need capping here —
// so the real risk is ExcelJS itself materializing that whole range during
// .load(). This can't stop that first pass (see the accompanying report for
// why: it would need the parse moved into a Worker), but it does stop this
// app from doing anything further with a workbook shaped nothing like a
// Clerk of Court template, with a plain-language reason instead of it just
// silently working through something enormous.
export const EXCEL_IMPORT_LIMITS = {maxSheets:60,maxRowsPerSheet:5000};
export function assertWorkbookWithinLimits(workbook){
  const sheets=workbook.worksheets||[];
  if(sheets.length>EXCEL_IMPORT_LIMITS.maxSheets){
    throw new Error(`This file has ${sheets.length} sheets — far more than a Clerk of Court template ever has. It was not imported.`);
  }
  for(const ws of sheets){
    const n=ws.actualRowCount||ws.rowCount||0;
    if(n>EXCEL_IMPORT_LIMITS.maxRowsPerSheet){
      throw new Error(`Sheet "${ws.name}" has ${n} rows — far more than a Clerk of Court template ever has. It was not imported.`);
    }
  }
}

// Recursively sanitize all string fields in an object (for loaded data)
export function sanitizeObjectData(obj){
  if(!obj||typeof obj!=='object')return obj;
  if(Array.isArray(obj))return obj.map(sanitizeObjectData);
  const sanitized={};
  for(const key in obj){
    const val=obj[key];
    if(typeof val==='string'){
      sanitized[key]=sanitizeInput(val);
    }else if(typeof val==='object'){
      sanitized[key]=sanitizeObjectData(val);
    }else{
      sanitized[key]=val;
    }
  }
  return sanitized;
}

// In-place counterpart to sanitizeObjectData, for a caller holding a live
// reference that must keep its identity — window.D during an Excel import
// is literally the object sitting in caseFile.wards, and sanitizeObjectData
// returning a NEW object would silently detach window.D from that array
// entry, so the next saveData() would persist the OLD, un-sanitized ward.
// importExcelFile builds a fresh object and can use sanitizeObjectData
// before ever touching window.D; the extracted Simplified and Annual importers
// write straight onto window.D field-by-field, so this mutates it afterward.
export function sanitizeObjectDataInPlace(obj){
  if(!obj||typeof obj!=='object')return obj;
  if(Array.isArray(obj)){
    for(let i=0;i<obj.length;i++){
      if(typeof obj[i]==='string')obj[i]=sanitizeInput(obj[i]);
      else if(obj[i]&&typeof obj[i]==='object')sanitizeObjectDataInPlace(obj[i]);
    }
    return obj;
  }
  for(const key of Object.keys(obj)){
    const val=obj[key];
    if(typeof val==='string')obj[key]=sanitizeInput(val);
    else if(val&&typeof val==='object')sanitizeObjectDataInPlace(val);
  }
  return obj;
}
