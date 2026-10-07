import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// The app's own vendored ExcelJS (lib/exceljs.min.js), loaded for unit tests.
// It is a browser bundle: required from Node it exports nothing, so it runs
// here in a small browser-like context and hands back the ExcelJS global it
// defines -- the same build the app ships, not a second copy from npm.
//
// templateWorkbook() opens one of the court's embedded workbooks
// (templates/<name>-template.js) as an ExcelJS Workbook, as the exporters do.

let excel = null;

export function loadExcelJS() {
  if (excel) return excel;
  const ctx = {
    console, setTimeout, clearTimeout, setImmediate, Buffer, TextEncoder, TextDecoder, Promise, Uint8Array, ArrayBuffer, DataView,
  };
  ctx.window = ctx;
  ctx.self = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync('lib/exceljs.min.js', 'utf8'), ctx);
  excel = ctx.ExcelJS;
  return excel;
}

/** @param {'annual' | 'guardian' | 'simplified'} name */
export function templateBytes(name) {
  const js = readFileSync(`templates/${name}-template.js`, 'utf8');
  return Buffer.from(/["'`]([A-Za-z0-9+/=]{500,})["'`]/.exec(js)[1], 'base64');
}

/** @param {'annual' | 'guardian' | 'simplified'} name */
export async function templateWorkbook(name) {
  const ExcelJS = loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBytes(name));
  return workbook;
}
