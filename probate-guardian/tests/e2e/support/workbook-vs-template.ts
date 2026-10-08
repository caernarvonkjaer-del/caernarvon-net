// Milestone 72A. The export guard's machinery: load the Clerk's own workbook
// (templates/<form>-template.js) and an exported filing with ExcelJS, and say
// what the export changed that it should not have, and where each value went.
//
// Why this exists: the Inventory's PART III wrote every guardian's details onto
// the form's printed captions for its whole life, and C-3 wrote each defendant
// over the printed Line #, while every test passed. The importer read the same
// wrong cells, so a round trip agreed with the broken export (AGENTS.md section
// 10, P1), and tests/unit/excel-write-targets.spec.js reads only addresses
// typed literally in the code -- about half of them are built at run time.
//
// Everything here reads the exported FILE with a real parser (ExcelJS, the
// library the app writes with), never the app's own importer (AGENTS.md
// section 5).

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { readAll } from './stream';
import { acceptDynDialog, clickExport, expectExportReady, exportStopped } from './target';
import type { TestWindow } from './window-api';

export type FormName = 'guardian' | 'annual' | 'simplified';

/** One cell an export wrote: aimed at, and where ExcelJS put it (a merge's master). */
export type Write = { sheet: string; aimed: string; landed: string };

/** A cell the export must hold, and what. `value` null means the cell must be empty. */
export type Expectation = { sheet: string; cell: string; value: string | number | null; path: string };

const SAVE_EXCEL: Record<FormName, string> = {
  guardian: '[data-inventory-action="save-excel"]',
  annual: '[data-annual-action="save-excel"]',
  simplified: '[data-simplified-action="save-excel"]',
};

// ── ExcelJS in the test process ──────────────────────────────────────────────
// The vendored browser build (lib/exceljs.min.js) -- there is no ExcelJS
// package in node_modules. Its UMD wrapper either exports the library or
// installs it as a global, depending on what the loader looks like.
let excelJS: any = null;
export function excel(): any {
  if (!excelJS) {
    const mod: any = createRequire(import.meta.url)(path.resolve(process.cwd(), 'lib/exceljs.min.js'));
    excelJS = [mod, mod?.default, (globalThis as any).ExcelJS].find((x) => typeof x?.Workbook === 'function');
    if (!excelJS) throw new Error(`lib/exceljs.min.js gave no ExcelJS (export keys: ${Object.keys(mod ?? {}).slice(0, 8).join(', ') || 'none'})`);
  }
  return excelJS;
}

export async function loadWorkbook(bytes: Uint8Array): Promise<any> {
  const wb = new (excel().Workbook)();
  await wb.xlsx.load(bytes);
  return wb;
}

const templates = new Map<FormName, Promise<any>>();
/** The Clerk's workbook, loaded once per worker. */
export function templateWorkbook(form: FormName): Promise<any> {
  if (!templates.has(form)) {
    const js = readFileSync(path.resolve(process.cwd(), `templates/${form}-template.js`), 'utf8');
    const b64 = /["'`]([A-Za-z0-9+/=]{500,})["'`]/.exec(js)![1];
    templates.set(form, loadWorkbook(Buffer.from(b64, 'base64')));
  }
  return templates.get(form)!;
}

// ── Exporting ────────────────────────────────────────────────────────────────

/**
 * Saves the open filing as Excel the way a filer does -- the Preview page's
 * real button, past the outstanding-requirements override when a test filing
 * has some -- with the write recorder on. Returns the file and every write.
 */
export async function exportWithWrites(page: Page, form: FormName): Promise<{ bytes: Buffer; writes: Write[] }> {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  // Leave and come back, so a filing changed while Preview & Export was open
  // is judged afresh: an earlier override covered the earlier revision only.
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
  // While requirements are outstanding the reason line beside Save as Excel
  // says so (each form's print.js; Milestone 74C / 73M -- the button stays
  // clickable); the preview panel then offers the override, which clears
  // that reason (pdf-preview.js). A filing over the workbook's capacity is
  // stopped for good -- the guard's filings stay at capacity, never over.
  const button = page.locator(SAVE_EXCEL[form]);
  await expect(button).toBeAttached({ timeout: 60_000 });
  if (await exportStopped(button, 'outstanding')) {
    const override = page.locator('#print-doc-container [data-preview-action="override"]');
    await expect(override).toBeVisible({ timeout: 120_000 });
    await override.click();
    await acceptDynDialog(page);
  }
  // Ready, and still ready a moment later: a page redrawn after the override
  // (a late save, a status refresh) opens Preview afresh, which clears the
  // override, and the click would then be refused.
  await expectExportReady(button, 60_000);
  await page.waitForTimeout(500);
  await expectExportReady(button, 1_000, 'Save as Excel still has nothing in its way after the override');
  await page.evaluate(() => (window as unknown as TestWindow).GuardianForms.testing.excelWrites.start());
  const download = clickExport(button, 180_000);
  const bytes = await readAll(await (await download).createReadStream());
  const writes: Write[] = await page.evaluate(() => (window as unknown as TestWindow).GuardianForms.testing.excelWrites.stop());
  return { bytes, writes };
}

// ── Reading cells ────────────────────────────────────────────────────────────

const isMember = (cell: any) => cell.isMerged && cell.master && cell.master.address !== cell.address;

/** A cell's content as a comparable value: text, a number (dates as Excel serials), or null. */
export function cellValue(cell: any): string | number | null {
  let v = cell?.value;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if (Array.isArray(v.richText)) v = v.richText.map((r: any) => r.text).join('');
    else if ('formula' in v || 'sharedFormula' in v) v = v.result ?? null;
    else if ('text' in v) v = v.text;
    else if ('error' in v) v = String(v.error);
  }
  if (v instanceof Date) return v.getTime() / 86400000 + 25569;
  if (v === undefined || v === '') return null;
  return v as string | number | null;
}

const formulaOf = (cell: any): string | null => {
  const f = cell?.formula;
  return typeof f === 'string' && f ? f.replace(/^=/, '').trim() : null;
};

/** Every non-empty cell of a sheet that is not a covered member of a merge. */
function eachOwnCell(ws: any, fn: (cell: any) => void) {
  ws.eachRow({ includeEmpty: false }, (row: any) => row.eachCell({ includeEmpty: false }, (cell: any) => {
    if (!isMember(cell)) fn(cell);
  }));
}

/** Template cells that carry a dropdown: their text is a default the app replaces. */
function hasDropdown(ws: any, address: string): boolean {
  try { return !!ws.getCell(address).dataValidation?.type; } catch { return false; }
}

// ── 1. Integrity ─────────────────────────────────────────────────────────────

/**
 * Cells the app writes over the form's own content by decision -- the one
 * list, read by every spec that compares an export with its template.
 */
export const DECIDED_OVERWRITES: Readonly<Record<FormName, readonly string[]>> = Object.freeze({
  // Guardian #1's name over the form's link to the Cover's Guardian Name(s)
  // (='SUMMARY I '!D23): the 2026-09-19 Annual decision, applied to the
  // Inventory by the requester on 2026-10-01, with a warning when the two
  // differ (src/core/filing/form-derived-fields.js). Milestone 72A.
  guardian: Object.freeze(["'PART III'!F8"]),
  // Guardian #1's name over the form's link to Part I's Guardian: decided
  // 2026-09-19, warned the same way.
  annual: Object.freeze(["'PART II, III'!F25"]),
  simplified: Object.freeze([]),
});

export type IntegrityOptions = {
  /** Decided overwrites, `'Sheet'!A1`: the app writes a value over the form's own content. */
  overwrites: readonly string[];
  /** An intended formula rewrite, `'Sheet'!A1` -> the expected formula. Empty unless decided. */
  rewrites?: Readonly<Record<string, string>>;
};

/**
 * What pruning may do to a formula: drop the added terms that name a page the
 * export removed. Stated here independently of src/core/excel/sheet-pruning.js:
 * the template formula's '+' operands (inside an optional SUM()), minus every
 * operand qualified by a sheet the export no longer has.
 */
export function formulaAfterPruning(templateFormula: string, keptSheets: ReadonlySet<string>): string | null {
  let text = templateFormula.trim();
  let wrapped = false;
  const sum = /^SUM\((.*)\)$/i.exec(text);
  if (sum && !/[()]/.test(sum[1])) { wrapped = true; text = sum[1]; } else if (/[()]/.test(text)) return null;
  const parts = text.split('+').map((p) => p.trim());
  const kept = parts.filter((p) => {
    const q = /^'([^']+)'!/.exec(p);
    return !q || keptSheets.has(q[1]);
  });
  if (kept.length === parts.length || !kept.length) return null;
  return wrapped ? `SUM(${kept.join('+')})` : kept.join('+');
}

/**
 * Every template caption whose text the export changed, and every template
 * formula whose expression it changed, on the sheets the export kept. Each
 * problem names the cell. Allowed: cells with a dropdown (their text is a
 * default to replace), the decided overwrites, and a formula that differs only
 * by the terms naming pruned pages.
 */
export function integrityProblems(template: any, exported: any, opts: IntegrityOptions): { problems: string[]; formulas: number; captions: number } {
  const problems: string[] = [];
  const allowed = new Set(opts.overwrites);
  const rewrites = opts.rewrites ?? {};
  const kept = new Set<string>(exported.worksheets.map((ws: any) => ws.name));
  let formulas = 0, captions = 0;
  template.eachSheet((ts: any) => {
    const os = exported.getWorksheet(ts.name);
    if (!os) return; // a blank page the export pruned
    eachOwnCell(ts, (tc: any) => {
      const where = `'${ts.name}'!${tc.address}`;
      const oc = os.getCell(tc.address);
      const tf = formulaOf(tc);
      if (tf) {
        formulas++;
        if (allowed.has(where)) return;
        const of = formulaOf(oc);
        if (of === tf) return;
        if (where in rewrites) {
          if (of !== rewrites[where]) problems.push(`${where}: formula =${tf} became ${of ? `=${of}` : JSON.stringify(cellValue(oc))}, expected =${rewrites[where]}`);
          return;
        }
        if (of && of === formulaAfterPruning(tf, kept)) return;
        problems.push(`${where}: formula =${tf} became ${of ? `=${of}` : `the value ${JSON.stringify(cellValue(oc))}`}`);
        return;
      }
      const tv = cellValue(tc);
      if (tv === null) return;
      captions++;
      if (allowed.has(where) || hasDropdown(ts, tc.address)) return;
      const ov = cellValue(oc);
      if (ov !== tv) problems.push(`${where}: the form's ${JSON.stringify(tv)} became ${JSON.stringify(ov)}`);
    });
  });
  return { problems, formulas, captions };
}

// ── 2. Placement ─────────────────────────────────────────────────────────────

const same = (a: string | number | null, b: string | number | null) =>
  (typeof a === 'number' && typeof b === 'number') ? Math.abs(a - b) < 1e-9 : a === b;

/** Every expectation the exported file does not meet, naming the field and cell. */
export function placementProblems(exported: any, expectations: readonly Expectation[]): string[] {
  const problems: string[] = [];
  for (const e of expectations) {
    const ws = exported.getWorksheet(e.sheet);
    if (!ws) { problems.push(`${e.path}: sheet '${e.sheet}' is not in the export`); continue; }
    const actual = cellValue(ws.getCell(e.cell));
    if (!same(actual, e.value)) problems.push(`${e.path}: '${e.sheet}'!${e.cell} holds ${JSON.stringify(actual)}, expected ${JSON.stringify(e.value)}`);
  }
  return problems;
}

// ── 3. Completeness ──────────────────────────────────────────────────────────

/**
 * Every write the expectations do not account for, and every write aimed at a
 * covered member of a merge (ExcelJS moves it to the master, where the printed
 * form may not show it, or where something else lives).
 */
export function completenessProblems(writes: readonly Write[], expectations: readonly Expectation[]): string[] {
  const listed = new Set(expectations.map((e) => `${e.sheet}!${e.cell}`));
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const w of writes) {
    const key = `${w.sheet}!${w.landed}`;
    if (w.aimed !== w.landed) problems.push(`'${w.sheet}'!${w.aimed} is inside a merge; the write landed on ${w.landed}`);
    if (!listed.has(key) && !seen.has(key)) problems.push(`'${w.sheet}'!${w.landed} was written but no expectation lists it`);
    seen.add(key);
  }
  return problems;
}

/** The template value of a cell, for choosing codes that differ from it. */
export function templateValue(template: any, sheet: string, cell: string): string | number | null {
  const ws = template.getWorksheet(sheet);
  return ws ? cellValue(ws.getCell(cell)) : null;
}
