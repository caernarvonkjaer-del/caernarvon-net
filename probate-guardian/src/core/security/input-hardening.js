// Imported-file hardening: the gate every Excel and .sav import passes
// before a parser sees the file. Moved from src/legacy-app.js by Milestone
// 70's 70B, comments and all.

// ── TEXT IS KEPT AS TYPED (Milestone 76B) ────────
// Text is no longer changed to make it safe; it is escaped wherever it is
// shown (decision 76B-1, the requester's, 2026-10-19). Until 76B this module
// stripped it: every Annual, Final and Trust Accounting box emptied itself on
// blur when its text matched a script pattern ("Pension (monthly = $1,200)",
// "See ../2024 statement") and lost every quote mark otherwise; every filing's
// text lost " < > ` and words were cut ("Donation=500 to church" opened as
// "D500 to church") each time a case opened; and imported workbooks lost
// < > ` (Milestone 73T-3, reversed by 76B-1). The stripping came in with a
// real stored-script hole (32711165) and never covered the shared people
// and case records -- a crafted file could put markup on the page anyway.
// tests/e2e/escaped-text.spec.ts holds every page to drawing text as text.

// ── IMPORTED FILE HARDENING ──────────────────────────
// Every import entry point (the three Excel importers, their drag-and-drop
// equivalent, and the .sav/.zip picker) hands this module a file chosen by
// whoever is sitting at the browser — including a guardian who was emailed
// a "fixed" template by someone else. Nothing here assumes the extension
// matches the content, or that the content is well-formed.
export const IMPORT_SIZE_LIMITS = {
  xlsx:10*1024*1024,  // court templates run well under 1MB; 10MB is generous headroom
  // Milestone 76C (decision 76C-1): the largest case file this app can save
  // AND open again, measured 2026-10-19 in Chrome, Firefox and WebKit (a
  // password-protected case, one filing's attached statements): every size
  // up to 283 MB saved and reopened in all three (Firefox to 545 MB, WebKit
  // to 384 MB), with about 10% kept back for computers with less memory than
  // the one measured. case-file.js refuses to write a case above it, so no
  // case it saves is one it can't open. It was 50 MB, unmeasured: a case with
  // about 37 MB of statements saved but could never be opened again.
  sav:250*1024*1024
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
