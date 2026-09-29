// Milestone 71C, decision D10: the one reader for an imported share cell,
// shared by the Initial Inventory and Annual-family importers. Kept out of
// cell-reader.js on purpose: that module is a closed cluster of three
// import-side primitives (tests/unit/cell-reader.spec.js pins it), while this
// encodes what a SHARE cell means. No imports.

// Milestone 71C, decision D10: an imported share cell is read the way the
// Clerk's workbook reads it. Deliberately ONE reader for both importers (the
// Initial Inventory's and the Annual family's), unlike the per-filing readers
// above: both workbooks hold a share in a 0.00% cell (numFmtId 10) that the
// formula multiplies straight into the ward's amount (`=G17*H17`, `=H25*I25`),
// so a cell's meaning does not depend on the form.
//
//   - A number is a fraction: 0.5 is 50%, 1 is 100%, 1.5 is 150% (which the
//     range check then flags), -0.1 is -10%. The old readers treated anything
//     above 1 as an already-0-100 figure from a pre-Milestone-60K export, so a
//     real 150% share imported as 1.5% with no warning. That reading is gone
//     (AGENTS.md section 8 item 2: no such export needs to be read, and the
//     change fails visibly -- a 50 imports as 5000% and is flagged).
//   - Text is read as Excel's own arithmetic reads it: "50%" is 50, "0.5" is
//     50. Text Excel could not turn into a number is kept exactly as it was
//     imported, never blanked or zeroed, so the range check reports it ("must
//     be a number from 0 to 100") -- visible, not silently altered.
//   - Blank stays blank ('') -- not 0, so a required-share check can fire.
//
// Pass the unwrapped cell value (unwrapCellValue() above). Returns a number,
// '' or the original text. Six decimal places, as the old readers rounded.
export function shareFromWorkbookCell(value){
  if(value==null)return '';
  const round6=(x)=>Math.round(x*1e6)/1e6;
  if(typeof value==='number')return Number.isFinite(value)?round6(value*100):'';
  if(typeof value!=='string')return '';
  const s=value.trim();
  if(s==='')return '';
  const pct=/^(.*?)\s*%$/.exec(s);
  const body=(pct?pct[1]:s).replace(/,/g,'').trim();
  const n=body===''?NaN:Number(body);
  if(!Number.isFinite(n))return value;
  return round6(pct?n:n*100);
}
