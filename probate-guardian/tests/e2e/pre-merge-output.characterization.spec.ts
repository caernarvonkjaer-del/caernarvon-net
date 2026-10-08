import { test, expect, type Browser, type Page } from '@playwright/test';
import { skipExpectedTargetExclusion } from './support/target-profile';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore -- plain .mjs tooling, no types
import { extract } from '../../scripts/ms70-sav-corpus.mjs';
// @ts-ignore -- plain .mjs tooling, no types
import { startServer } from '../../scripts/serve-portable-http.mjs';
import { enableTestMode, clickExport } from './support/target';
import { currentBuild, type AppDriver } from './support/app-driver';
import { pre70Build } from './support/pre-70-build';
import { COMPLETE_CASE, PREMERGE_SHA, saveCompleteCase } from './support/pre-merge-case';
import { extractPdfTextRuns, getPdfMetadata } from './support/pdf-extract';

// Milestone 70, the merge gate's output comparison (MILESTONE-70-PROPOSAL.md,
// "Reconstitution and merge", step 4: "for each filing type, the generated PDF
// and workbook side by side with the pre-merge build's output for the same
// synthetic case"; "Contracts: Court output": no workbook address, formula,
// defined name, PDF field, rounding rule, output filename ... changes).
//
// This tree saves one case with a complete filing of every type
// (support/pre-merge-case.ts). The pre-merge build (PG_PREMERGE_SHA) and this
// tree, served side by side on one origin, each open that same file through
// the startup screen, open each filing, go to Preview & Export and save its
// PDF and, where the form has one, its court workbook -- through the filer's
// own buttons. The two builds' files must agree: the PDF's pages, every text
// run with its position, and its title, subject, keywords and author; the
// workbook's sheets, every cell's value or formula, merged ranges and defined
// names (read with ExcelJS, the library the app uses -- never a re-import);
// and the file names. None is expected to differ: the migration changes no
// court output.
//
// PG_RELEASE_PACKET_DIR=<folder> also writes each pair there,
// <type>/pre-merge.<ext> and <type>/branch.<ext>, for the requester's side by
// side review (D8).

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const PORT = 4339; // the milestone-70 branch's own (MILESTONE-70-FIX-LEDGER.md)
const PACKET = process.env.PG_RELEASE_PACKET_DIR || '';
type Version = 'old' | 'new';
const DRIVER: Record<Version, AppDriver> = { old: pre70Build, new: currentBuild };

test.describe.configure({ mode: 'serial' });

// Milestone 72 (decided 2026-10-02): this comparison was Milestone 70's merge
// gate, and its premise -- "the migration changes no court output" -- held
// only for that migration. Milestones 71 and 72 change court output on purpose
// (72A's Inventory and Annual workbook boxes, 72C's guardian emails on the
// Inventory PDF, 72D, 72G and 72H's certificates), each pinned by its own
// tests, so against the pre-70 build it can only fail -- and, being serial,
// its first failure stopped the other eight forms from running at all. It now
// runs when a merge gate pins the build to compare against on purpose:
// PG_PREMERGE_SHA=<sha> (support/pre-merge-case.ts).
skipExpectedTargetExclusion(!process.env.PG_PREMERGE_SHA, 'a merge-gate comparison, run only with PG_PREMERGE_SHA set to the build to compare against');

let server: any;
let caseFile = '';
test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  server = await startServer({ port: PORT, mounts: [{ base: '/old/', dir: extract(PREMERGE_SHA) }, { base: '/new/', dir: ROOT }] });
  const context = await browser.newContext();
  const page = await context.newPage();
  await openApp(page, 'new');
  caseFile = await saveCompleteCase(page, null);
  await context.close();
});
test.afterAll(async () => { await new Promise((resolve) => server.close(resolve)); });

async function openApp(page: Page, v: Version) {
  if (v === 'new') await enableTestMode(page);
  await page.addInitScript(() => {
    delete (window as any).showSaveFilePicker;
    delete (window as any).showOpenFilePicker;
    localStorage.setItem('pg.termsAccepted', '2026-09-15');
  });
  await page.goto(`http://localhost:${PORT}/${v}/index.html`, { waitUntil: 'networkidle' });
}

async function download(page: Page, button: string) {
  const control = page.locator(button);
  // Enabled, not expectExportReady(): the older build has no reason line.
  await expect(control, `${button} ready`).toBeEnabled({ timeout: 30_000 });
  const d = await clickExport(control, 60_000);
  const chunks: Buffer[] = [];
  for await (const c of await d.createReadStream()) chunks.push(c as Buffer);
  return { name: d.suggestedFilename(), bytes: Buffer.concat(chunks) };
}

/** What one build exports for one filing of the case file. */
async function exportsOf(browser: Browser, v: Version, filing: (typeof COMPLETE_CASE)[number]) {
  const context = await browser.newContext({ acceptDownloads: true });
  try {
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await openApp(page, v);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible', timeout: 30_000 });
    await page.setInputFiles('#startup-open-input', caseFile);
    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    const driver = DRIVER[v];
    await expect.poll(async () => (await driver.filings(page)).length, { timeout: 30_000 }).toBe(COMPLETE_CASE.length);
    const ward = (await driver.loadedCase(page)).wards.find((w: any) => w.inventoryType === filing.type);
    await driver.openFiling(page, ward.wardId);
    await driver.navigate(page, '/print');
    const pdf = await download(page, `[${filing.action}="${filing.savePdf}"]`);
    const excel = filing.saveExcel ? await download(page, `[${filing.action}="${filing.saveExcel}"]`) : null;
    return { pdf, excel, pageErrors };
  } finally {
    await context.close();
  }
}

/** A workbook's sheets, cells (value or formula), merges and defined names, read with ExcelJS in a page. */
async function workbookContents(browser: Browser, bytes: Buffer) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ path: path.join(ROOT, 'lib', 'exceljs.min.js') });
    return await page.evaluate(async (b) => {
      const wb = new (window as any).ExcelJS.Workbook();
      await wb.xlsx.load(new Uint8Array(b).buffer);
      const sheets: Record<string, unknown> = {};
      wb.eachSheet((ws: any) => {
        const cells: Record<string, unknown> = {};
        ws.eachRow({ includeEmpty: false }, (row: any) => row.eachCell({ includeEmpty: false }, (cell: any) => {
          const v = cell.value;
          cells[cell.address] = v && typeof v === 'object' && 'formula' in v ? { formula: v.formula }
            : v && typeof v === 'object' && 'sharedFormula' in v ? { sharedFormula: v.sharedFormula }
              : v instanceof Date ? { date: v.toISOString() } : v;
        }));
        sheets[ws.name] = { cells, merges: Object.keys(ws._merges || {}).sort() };
      });
      const names = (wb.definedNames?.model || []).map((n: any) => `${n.name}=${(n.ranges || []).join(',')}`).sort();
      return JSON.parse(JSON.stringify({ sheets, names }));
    }, [...bytes]);
  } finally {
    await context.close();
  }
}

async function pdfContents(bytes: Buffer) {
  const runs = await extractPdfTextRuns(new Uint8Array(bytes));
  const meta = await getPdfMetadata(new Uint8Array(bytes));
  return {
    pages: Math.max(0, ...runs.map((r) => r.page)),
    runs: runs.map((r) => `${r.page}|${Math.round(r.x)},${Math.round(r.y)}|${r.text}`),
    meta,
  };
}

/** Up to `n` entries on which two lists differ, by position. */
function firstDifferences(a: string[], b: string[], n = 12) {
  const out: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length) && out.length < n; i++) {
    if (a[i] !== b[i]) out.push(`#${i}: pre-merge ${JSON.stringify(a[i])} / branch ${JSON.stringify(b[i])}`);
  }
  return out;
}

function writePacket(type: string, which: string, file: { name: string; bytes: Buffer }) {
  if (!PACKET) return;
  const dir = path.join(PACKET, type);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${which}${path.extname(file.name)}`), file.bytes);
}

for (const filing of COMPLETE_CASE) {
  test(`${filing.type}: the branch exports what the pre-merge build does`, async ({ browser }) => {
    test.setTimeout(240_000);
    const old = await exportsOf(browser, 'old', filing);
    const now = await exportsOf(browser, 'new', filing);
    expect(old.pageErrors, 'no page error in the pre-merge build').toEqual([]);
    expect(now.pageErrors, 'no page error in the branch').toEqual([]);
    writePacket(filing.type, 'pre-merge', old.pdf);
    writePacket(filing.type, 'branch', now.pdf);

    expect(now.pdf.name, 'the PDF file name').toBe(old.pdf.name);
    const [a, b] = [await pdfContents(old.pdf.bytes), await pdfContents(now.pdf.bytes)];
    expect(b.pages, 'the PDF page count').toBe(a.pages);
    expect(b.meta, 'the PDF title, subject, keywords and author').toEqual(a.meta);
    expect(firstDifferences(a.runs, b.runs), 'every text run, and where it sits').toEqual([]);

    if (filing.saveExcel) {
      expect(now.excel, 'the branch exports a workbook').toBeTruthy();
      writePacket(filing.type, 'pre-merge', old.excel!);
      writePacket(filing.type, 'branch', now.excel!);
      expect(now.excel!.name, 'the workbook file name').toBe(old.excel!.name);
      const [x, y] = [await workbookContents(browser, old.excel!.bytes), await workbookContents(browser, now.excel!.bytes)];
      expect(Object.keys(y.sheets), 'the sheets, in order').toEqual(Object.keys(x.sheets));
      expect(y.names, 'the defined names').toEqual(x.names);
      for (const sheet of Object.keys(x.sheets)) {
        const [s, t] = [(x.sheets as any)[sheet], (y.sheets as any)[sheet]];
        expect(t.merges, `${sheet}: merged ranges`).toEqual(s.merges);
        const cells = [...new Set([...Object.keys(s.cells), ...Object.keys(t.cells)])];
        const differ = cells.filter((c) => JSON.stringify(s.cells[c]) !== JSON.stringify(t.cells[c]))
          .map((c) => `${c}: pre-merge ${JSON.stringify(s.cells[c])} / branch ${JSON.stringify(t.cells[c])}`);
        expect(differ.slice(0, 12), `${sheet}: every cell's value or formula`).toEqual([]);
      }
    }
  });
}
