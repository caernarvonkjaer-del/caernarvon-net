/**
 * Excel IMPORT-direction cell readers -- the parse-side counterpart of
 * excel-engine.js's writers (setCell, sanitizeCellValue, saveWorkbookFile).
 *
 * Milestone 53B moved these three functions here from legacy-app.js unchanged.
 * They had been classic-script globals that the three feature excel.js files
 * reached by destructuring off `window`; they are now a closed, importable
 * cluster with exactly one implementation reached exactly one way. Nothing in
 * legacy-app.js calls them any more (53A deleted fmtDateCard, the last
 * legacy-side caller of fmtDate other than readCellText itself), so the move
 * left no `window` reach-back in either direction.
 *
 * BEFORE ADDING ANYTHING HERE, read excel-engine.js's header block. It records
 * why Milestone 51D deleted the OLD core readers (readCellNumber, readCellDate,
 * a readCellText passthrough, a yesNo) and why their semantics were NOT
 * interchangeable with the feature-local ones -- in particular the 0-vs-''
 * split for an unparseable number, where 0 is a stated zero the court reads as
 * an assertion and '' is a blank the readiness card flags as missing. Do not
 * "complete the consolidation" by adding a readCellNumber back here without
 * reading that. The per-filing readers built on top of this cluster
 * (annual's gcDate/gcNum/gcPct, guardian's dt/num/pct/triState) encode
 * per-filing semantics and deliberately stay in their own feature modules.
 *
 * This module has no imports on purpose: three pure functions, no load-order
 * or circular-import surface.
 */

// Milestone 51 follow-up: the `instanceof Date` guard is load-bearing, not
// defensive noise. Without it, String(dateObj).substring(0,10) yields a
// LOCALE-and-TIMEZONE-dependent prefix of Date#toString() -- "Tue May 19" for a
// 2026-05-20T00:00:00Z date, which is both the wrong format and the wrong DAY.
// These values reach filed court documents (Excel cells, PDF bodies, and the
// under-penalties-of-perjury attestation's "from X through Y"), so a silent
// off-by-one date is not cosmetic. Guarded across all five Group A copies of
// this rule; see tests/unit/date-truncation-helpers.spec.js.
export function fmtDate(s){const v=s instanceof Date?s.toISOString():s;return v?String(v).substring(0,10):'';}

// Resolves a raw ExcelJS cell value down to a plain scalar or Date,
// unwrapping every non-literal shape ExcelJS hands back: {formula,result}
// (a formula cell — prefer the computed result), {richText:[...]} (join the
// runs' text), {text,hyperlink} (the link's display text), and {error}
// (a cell showing #REF!/#DIV0!/etc — nothing sensible to import). A formula
// result can itself be any of these shapes, so this recurses once on
// .result. Returns null instead of ever handing back a raw object — a
// shape this doesn't recognize should import as blank, not as "[object
// Object]" in a case number or a ward's name.
export function unwrapCellValue(v){
  if(v==null)return null;
  if(v instanceof Date)return v;
  if(typeof v!=='object')return v;
  if('error' in v)return null;
  if('result' in v)return unwrapCellValue(v.result);
  if(Array.isArray(v.richText))return v.richText.map(r=>r&&r.text||'').join('');
  if('hyperlink' in v){
    const t=v.text;
    return Array.isArray(t)?t.map(r=>r&&r.text||'').join(''):t;
  }
  return null;
}

// Text form of an ExcelJS cell — the replacement for the `const gc=addr=>
// {const c=ws.getCell(addr);return c.value!=null?String(c.value).trim()
// :'';}` pattern that used to be redefined at every import site. That
// pattern printed the literal string "[object Object]" into whatever field
// it fed whenever the cell held a formula, rich text, a hyperlink, or an
// error — all of which a real court-issued template can contain. Dates are
// normalized through the app's own fmtDate (YYYY-MM-DD) instead of a
// locale/timezone-dependent Date#toString().
export function readCellText(cell){
  const v=unwrapCellValue(cell?cell.value:null);
  if(v==null)return '';
  if(v instanceof Date)return fmtDate(v.toISOString());
  return String(v).trim();
}
