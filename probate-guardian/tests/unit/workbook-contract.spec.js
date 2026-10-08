// Milestone 73T part 1: the workbook contracts (src/core/excel/workbook-
// contract/), checked against the court's own workbooks and against today's
// exporters, before any exporter or importer is moved onto them (73T parts
// 2-4).
//
//   1. The contract writes exactly what the exporter writes: every box the
//      export guard's manifest names (tests/e2e/support/export-manifests.ts,
//      which tests/e2e/excel-form-field-placement.spec.ts holds the real
//      exporter to), with the value it expects, and nothing else -- written
//      onto the Clerk's workbook with the app's own ExcelJS.
//   2. Every cell it writes is the Clerk's input box: not a printed caption,
//      not a formula (except under a recorded approval), not a covered member
//      of a merge, and unlocked on a protected sheet.
//   3. A round trip -- a distinct value in every field, written, saved as a
//      file, opened again and read back -- returns each field, compared one
//      by one. (Through a saved file: a date is written as a number under a
//      date format, and only opening the file makes it a date again.)
//   4. A workbook filled in by hand on the Clerk's own form imports: every
//      box typed as Excel stores what a person types (a date as a date, an
//      amount or share as a number), in the boxes a person would use -- which
//      are not always the app's (`handFilledBoxes`) -- none in a locked box or
//      a formula box, which holds what Excel computes; saved, opened and read.
//
// Where a mapping still loses or misplaces something, the 73T row and the
// part that fixes it are listed below. Each listed case must still happen:
// the part that fixes one removes it from here. Checks 3 and 4 import the way
// the app does (workbook-contract/index.js's readWorkbookDraft(), its text
// passes included) and apply the draft as 73E's transaction commits it, so a
// field the workbook has no box for is kept, not lost.
//
// Milestone 73T part 2: the Inventory runs on its contract; part 3, the Annual
// family; part 4, the Simplified. Each form's fixed rows have cases of their
// own at the end.
import { beforeAll, describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {}, getCurrentPage: () => '/' }));
globalThis.window = globalThis.window || globalThis;

const { loadExcelJS, templateWorkbook } = await import('./support/exceljs-node.js');
const { templateSheets } = await import('./support/template-cells.js');
const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { writeContract, readContract, contractTargets, getPath, setPath } = await import('../../src/core/excel/workbook-contract/engine.js');
const { GUARDIAN_CONTRACT } = await import('../../src/core/excel/workbook-contract/guardian.js');
const { ANNUAL_CONTRACT } = await import('../../src/core/excel/workbook-contract/annual.js');
const { SIMPLIFIED_CONTRACT } = await import('../../src/core/excel/workbook-contract/simplified.js');
const contractIndex = await import('../../src/core/excel/workbook-contract/index.js');
const { partIIIGuardianCells } = await import('../../src/core/excel/guardian-inventory-pages.js');
const { checkExcelCapacity } = await import('../../src/core/excel/excel-capacity.js');
const { ANNUAL_EXCEL_CAPS, SIMPLIFIED_EXCEL_CAPS } = await import('../../src/core/excel/excel-caps.js');
const partIIINameBox = (i) => partIIIGuardianCells(i).find((f) => f.key === 'name').box;
const { sameName } = await import('../../src/core/excel/import-keep.js');
const manifests = await import('../e2e/support/export-manifests.ts');
const fixtures = await import('../e2e/support/fixtures.ts');

const json = (x) => JSON.parse(JSON.stringify(x));

// The export guard's merge (excel-form-field-placement.spec.ts's
// mergeIntoFiling()): objects merged key by key, arrays by index.
function merge(into, from) {
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  for (const [k, v] of Object.entries(from)) {
    if (Array.isArray(v)) {
      if (!Array.isArray(into[k])) into[k] = [];
      v.forEach((item, i) => { if (isObj(item) && isObj(into[k][i])) merge(into[k][i], item); else into[k][i] = json(item); });
    } else if (isObj(v) && isObj(into[k])) merge(into[k], v);
    else into[k] = json(v);
  }
  return into;
}

// The export guard's reading of a cell (workbook-vs-template.ts's cellValue()).
function cellValue(cell) {
  let v = cell?.value;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if (Array.isArray(v.richText)) v = v.richText.map((r) => r.text).join('');
    else if ('formula' in v || 'sharedFormula' in v) v = v.result ?? null;
    else if ('text' in v) v = v.text;
    else if ('error' in v) v = String(v.error);
  }
  if (v instanceof Date) return v.getTime() / 86400000 + 25569;
  if (v === undefined || v === '') return null;
  return v;
}
const same = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b);

// A draft applied as 73E's transaction commits it (import-transaction.js's
// commitImport()): the filing's rows first lined up with the rows the draft's
// came from; a nested record takes only the fields the draft carries; a
// guardian row of the same person keeps what the workbook can't carry.
function applyDraft(filing, draft, rowSources = {}) {
  const out = json(filing);
  const isRec = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  for (const [list, sources] of Object.entries(rowSources || {})) out[list] = sources.map((i) => (out[list] || [])[i]);
  for (const [k, v] of Object.entries(draft)) {
    if (k === 'guardians' && Array.isArray(v)) {
      // The same person as the transaction decides it: the same name, or a row that carries none (the filing keeps it).
      out[k] = v.map((row, i) => { const old = (out[k] || [])[i]; return old && (!('name' in row) || sameName(old.name, row.name)) ? { ...old, ...row } : row; });
    } else out[k] = isRec(v) && isRec(out[k]) ? { ...out[k], ...v } : v;
  }
  return out;
}

// A saved workbook, opened and imported into `filing` as the app does.
function importInto(workbook, form, ctx, filing) {
  const { draft, rowSources } = contractIndex.readWorkbookDraft(workbook, form, { filing, ctx });
  return applyDraft(filing, draft, rowSources);
}
async function reopened(workbook) {
  const back = new (loadExcelJS().Workbook)();
  await back.xlsx.load(await workbook.xlsx.writeBuffer());
  return back;
}

function recordingIO(writes) {
  return {
    setCell(ws, addr, value) {
      const cell = ws.getCell(addr);
      cell.value = value == null || value === '' ? null : (typeof value === 'number' ? value : String(value));
      writes.push({ sheet: ws.name, aimed: addr, landed: cell.isMerged && cell.master ? cell.master.address : addr });
      return cell;
    },
    setDateCell(ws, addr, value) {
      const cell = ws.getCell(addr);
      const iso = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
      cell.value = iso ? Date.UTC(+iso[1], +iso[2] - 1, +iso[3]) / 86400000 + 25569 : (value == null || value === '' ? null : value);
      writes.push({ sheet: ws.name, aimed: addr, landed: cell.isMerged && cell.master ? cell.master.address : addr });
      return cell;
    },
  };
}

const FORMS = [
  {
    form: 'guardian', contract: GUARDIAN_CONTRACT, manifest: () => manifests.inventoryManifest(), base: fixtures.MINIMAL_VALID_GUARDIAN, ctx: {},
    // Cells the contract writes on a locked cell, a formula or a caption, by decision or as a recorded defect.
    allowedTargets: new Map([
      ['PART III|F8', 'Guardian #1 name over the Cover link, by decision (2026-10-01)'],
    ]),
    // Boxes the Clerk's own workbook leaves locked on a protected sheet, so a
    // filer completing it by hand can't type in them either. The app still
    // fills them (protection doesn't stop a program), and the office has been
    // told so its published copy can unlock them (requester, 2026-10-07).
    // Each must still be locked: once the office's copy unlocks one, remove it.
    lockedInClerkForm: [
      { path: 'scheduleA1.*.residence', why: 'A-1\'s "Personal Residence?" column, all three pages' },
      { path: 'scheduleA1.*.income', why: 'A-1\'s "Income Property?" column, all three pages' },
      { path: 'scheduleA2.*.liabilityType', why: 'A-2\'s "Type?" column, all three pages' },
      { path: 'scheduleB4.*.liabilityType', why: 'B-4\'s "Type?" column, all four pages' },
      { path: 'scheduleC1.*.frequencyOfPayment', why: 'C-1\'s "Frequency of payment?" column, all three pages' },
      { path: 'scheduleC4.*.trustType', why: 'C-4\'s "Type?" column, both pages' },
      { path: 'scheduleC5.*.relationshipToWard', sheet: 'C-5 JOINT OWNERS pg 3', why: 'C-5 page 3\'s "Relationship to Ward?" (page 2 unlocks it)' },
      { path: 'scheduleC5.*.totalAssetValue', sheet: 'C-5 JOINT OWNERS pg 3', why: 'C-5 page 3\'s "Jointly Owned Asset Value" (page 2 unlocks it)' },
      { path: 'scheduleC5.*.jointOwnerPercent', sheet: 'C-5 JOINT OWNERS pg 3', why: 'C-5 page 3\'s "Joint Owners\' %" (page 2 unlocks it)' },
    ],
    // Round-trip differences today's mapping still has: path -> [73T row, part, why].
    roundTripLosses: new Map([
      ['scheduleC2.*.claimantName', [null, null, 'by decision (2026-09-22): the claimant and their attorney share one line, read back as the claimant']],
      ['scheduleC2.*.claimantAttorney', [null, null, 'by decision (2026-09-22): not split back from the claimant line']],
    ]),
    // A filing that answers "no recipients are required" and whose D-2 names
    // its own attorney: both survive since 73T part 2 (rows 14 and 6).
    roundTripSetup: (f) => { f.serviceNoRecipients = 'No'; },
    roundTripExtraPaths: ['serviceNoRecipients', 'attorney.name'],
    // Where a person filling in the Clerk's form puts a value the app puts elsewhere.
    handFilledBoxes: () => [],
    handFilledLosses: new Map([
      ['scheduleC2.*.claimantName', [null, null, 'by decision (2026-09-22), as above']],
      ['scheduleC2.*.claimantAttorney', [null, null, 'by decision (2026-09-22), as above']],
    ]),
  },
  {
    form: 'annual', contract: ANNUAL_CONTRACT, manifest: () => manifests.annualManifest('Annual'), base: fixtures.MINIMAL_VALID_ANNUAL, ctx: { filingTypeValue: 'Annual' },
    allowedTargets: new Map([
      ['PART II, III|F25', 'Guardian #1 name over the Part I link, by decision (2026-09-19)'],
    ]),
    lockedInClerkForm: [
      { path: 'schD5.*.loanType', why: "D-5's \"Type?\" column" },
    ],
    roundTripLosses: new Map(),
    roundTripSetup: () => {},
    roundTripExtraPaths: [],
    // Since 73T part 3 the app's boxes are the Clerk's (Part VIII's H boxes).
    handFilledBoxes: () => [],
    handFilledLosses: new Map(),
  },
  {
    form: 'simplified', contract: SIMPLIFIED_CONTRACT, manifest: () => manifests.simplifiedManifest(), base: fixtures.MINIMAL_VALID_SIMPLIFIED, ctx: {},
    allowedTargets: new Map(),
    lockedInClerkForm: [],
    roundTripLosses: new Map(),
    roundTripSetup: () => {},
    // Guardian #1's name survives since 73T part 4 (row 1).
    roundTripExtraPaths: ['guardians.0.name'],
    // Since 73T part 4 the app's boxes are the Clerk's (Part V's H17).
    handFilledBoxes: () => [],
    handFilledLosses: new Map(),
  },
];

// What Excel stores when a person types `value` into a cell of format
// `numFmt`: in a Text ('@') cell, the text as typed (a date as 1/5/2001 --
// three of the Annual's date boxes are Text cells); otherwise a date as a
// date and an amount or share as a number.
function typedAs(value, kind, numFmt) {
  if (numFmt === '@') {
    if (kind === 'date' && typeof value === 'number') {
      const d = new Date((value - 25569) * 86400000);
      return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
    }
    if (kind === 'share' && typeof value === 'number') return `${Math.round(value * 1e6) / 1e4}%`;
    return typeof value === 'number' ? String(value) : value;
  }
  return kind === 'date' && typeof value === 'number' ? new Date((value - 25569) * 86400000) : value;
}

// 'SHEET!CELL' for a formula that is one reference -- a cell ('PART I'!D20,
// D16) or a defined name for one cell (=Guardian) -- or null.
function referenceOf(workbook, formula, sheet) {
  let m = /^(?:'([^']+)'!|([A-Za-z0-9_ ]+)!)?\$?([A-Z]+)\$?(\d+)$/.exec(formula);
  if (m) return `${m[1] || m[2] || sheet}!${m[3]}${m[4]}`;
  if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(formula)) return null;
  const ranges = workbook.definedNames.getRanges(formula)?.ranges || [];
  if (ranges.length !== 1) return null;
  m = /^(?:'([^']+)'|([^!]+))!\$?([A-Z]+)\$?(\d+)$/.exec(ranges[0]);
  return m ? `${m[1] || m[2]}!${m[3]}${m[4]}` : null;
}

const blankish = (v) => v === '' || v == null;
function normalized(v, kind) {
  if (blankish(v)) return '';
  if (kind === 'amount' || kind === 'share') return Number(v);
  return v;
}

const pattern = (p) => p.replace(/\.\d+\./, '.*.');

describe.each(FORMS)('the $form workbook contract', ({ form, contract, manifest: buildManifest, base, ctx, allowedTargets, lockedInClerkForm, roundTripLosses, roundTripSetup, roundTripExtraPaths, handFilledBoxes, handFilledLosses }) => {
  let pristine, working, sheets, manifest, filing;

  beforeAll(async () => {
    [pristine, working, sheets] = await Promise.all([templateWorkbook(form), templateWorkbook(form), templateSheets(form)]);
    manifest = buildManifest();
    filing = merge(merge({ ...json(initializeEmptyData(form)), inventoryType: form }, json(base)), manifest.patch);
  }, 240_000);

  test('writes every box the export guard names, with the value it expects, and nothing else', () => {
    const coding = manifests.codeFinite(manifest.finite, (f) => cellValue(pristine.getWorksheet(f.sheet)?.getCell(f.cell)));
    for (let run = 0; run < coding.runs; run++) {
      const f = json(filing);
      for (const box of manifest.finite) setPath(f, box.path, coding.answer(box, run));
      const finite = manifest.finite.map((box) => ({ sheet: box.sheet, cell: box.cell, value: manifests.finiteExpected(manifest.finite, coding, box, run), path: box.path }));
      const expectations = [...manifest.expectations, ...finite];
      const writes = [];
      writeContract(working, contract, f, ctx, recordingIO(writes));
      const misplaced = expectations
        .map((e) => ({ e, actual: cellValue(working.getWorksheet(e.sheet)?.getCell(e.cell)) }))
        .filter(({ e, actual }) => !same(actual, e.value))
        .map(({ e, actual }) => `${e.path}: '${e.sheet}'!${e.cell} holds ${JSON.stringify(actual)}, expected ${JSON.stringify(e.value)}`);
      expect(misplaced, `export ${run + 1} of ${coding.runs}`).toEqual([]);
      const listed = new Set(expectations.map((e) => `${e.sheet}!${e.cell}`));
      const unlisted = [...new Set(writes.filter((w) => !listed.has(`${w.sheet}!${w.landed}`) || w.aimed !== w.landed).map((w) => `'${w.sheet}'!${w.aimed}${w.aimed !== w.landed ? ` (landed on ${w.landed})` : ''}`))];
      expect(unlisted, 'writes the export guard does not list').toEqual([]);
    }
  });

  test("every cell it writes is the Clerk's input box: no caption, formula or covered merge cell, and unlocked", () => {
    const problems = [];
    const clerkLocked = (lockedInClerkForm || []).map((x) => ({ ...x, seen: 0 }));
    for (const t of contractTargets(contract, ctx)) {
      if (t.dir === 'import') continue;
      const key = `${t.sheet}|${t.cell}`;
      if (allowedTargets.has(key)) continue;
      const info = sheets.get(t.sheet);
      if (!info) { problems.push(`${t.path}: no sheet '${t.sheet}'`); continue; }
      if (info.covered.has(t.cell)) { problems.push(`${t.path}: '${t.sheet}'!${t.cell} is inside the merge ${info.covered.get(t.cell)}`); continue; }
      const at = info.cells.get(t.cell);
      if (at?.kind === 'FORMULA' && !t.formula) problems.push(`${t.path}: '${t.sheet}'!${t.cell} holds the formula =${at.text}`);
      else if (at && at.kind !== 'FORMULA' && !info.validated.has(t.cell)) problems.push(`${t.path}: '${t.sheet}'!${t.cell} holds the caption ${JSON.stringify(at.text.slice(0, 50))}`);
      const ws = pristine.getWorksheet(t.sheet);
      // A recorded defect that is this very misplacement (73T row 3) is listed, not failed.
      if (!ws?.sheetProtection?.sheet || ws.getCell(t.cell).protection?.locked === false || t.defect?.box) continue;
      const listed = clerkLocked.find((x) => x.path === pattern(t.path) && (!x.sheet || x.sheet === t.sheet));
      if (listed) listed.seen++;
      else problems.push(`${t.path}: '${t.sheet}'!${t.cell} is locked on a protected sheet`);
    }
    expect(problems).toEqual([]);
    expect(clerkLocked.filter((x) => !x.seen).map((x) => x.path), "listed as locked in the Clerk's form but no longer locked: remove them").toEqual([]);
  });

  test('a round trip through a saved workbook returns every field it carries, field by field', async () => {
    const f = json(filing);
    for (const box of manifest.finite) setPath(f, box.path, box.options[0]);
    roundTripSetup(f);
    const out = await templateWorkbook(form);
    writeContract(out, contract, f, ctx);
    const draft = importInto(await reopened(out), form, ctx, f);
    const kinds = new Map(contractTargets(contract, ctx).map((t) => [t.path, t.kind]));
    const paths = [...new Set([...manifest.expectations.map((e) => e.path), ...manifest.finite.map((x) => x.path)])]
      .flatMap((p) => p.split('+').map((part, i) => (i === 0 ? part : p.slice(0, p.lastIndexOf('.') + 1) + part)))
      .filter((p) => !p.startsWith('(') && !p.includes('(fourth line)'));
    paths.push(...roundTripExtraPaths);
    const lost = [];
    for (const p of paths) {
      const kind = kinds.get(p) || 'text';
      const wrote = normalized(getPath(f, p), kind), read = normalized(getPath(draft, p), kind);
      if (!same(wrote, read)) lost.push(p);
    }
    // A listed loss names one field (guardians.0.name) or every row's (scheduleC2.*.claimantName).
    const listed = (p) => roundTripLosses.has(p) || roundTripLosses.has(pattern(p));
    const unexpected = [...new Set(lost.filter((p) => !listed(p)).map(pattern))];
    const stale = [...roundTripLosses.keys()].filter((k) => !lost.some((p) => p === k || pattern(p) === k));
    expect(unexpected, 'fields a round trip loses that no listed case accounts for').toEqual([]);
    expect(stale, 'listed losses that no longer happen: remove them').toEqual([]);
  }, 300_000);

  test("a workbook filled in by hand on the Clerk's own form imports, field by field", async () => {
    const truth = json(filing);
    for (const box of manifest.finite) setPath(truth, box.path, box.options[0]);
    const kinds = new Map(contractTargets(contract, ctx).map((t) => [t.path, t.kind]));
    const serialToIso = (n) => new Date((n - 25569) * 86400000).toISOString().slice(0, 10);
    const extra = handFilledBoxes();
    for (const x of extra) if ('value' in x) setPath(truth, x.path, x.kind === 'date' ? serialToIso(x.value) : x.value);
    const moved = new Map(extra.map((x) => [x.path, x]));
    // Every box with the value a person types there: the manifest's, moved to
    // the Clerk's own box where the app's is elsewhere.
    const boxes = [
      ...manifest.expectations.map((e) => ({ ...e })),
      ...manifest.finite.map((x) => ({ sheet: x.sheet, cell: x.cell, path: x.path, value: x.options[0] })),
    ].map((b) => (moved.has(b.path) ? { ...b, sheet: moved.get(b.path).sheet, cell: moved.get(b.path).cell } : b));
    for (const x of extra) if ('value' in x && !boxes.some((b) => b.path === x.path)) boxes.push({ sheet: x.sheet, cell: x.cell, path: x.path, value: x.value, kind: x.kind });

    const hand = await templateWorkbook(form);
    const lockedPaths = new Set();
    const computed = [];
    const typed = new Map();
    for (const b of boxes) {
      if (b.value === null || b.value === undefined) continue;
      const ws = hand.getWorksheet(b.sheet);
      if (!ws) continue;
      const at = sheets.get(b.sheet)?.cells.get(b.cell);
      if (at?.kind === 'FORMULA') { computed.push({ ...b, formula: at.text }); continue; }
      if (ws.sheetProtection?.sheet && ws.getCell(b.cell).protection?.locked !== false) { lockedPaths.add(pattern(b.path)); continue; }
      const kind = kinds.get(b.path) || b.kind;
      const value = typedAs(b.value, kind, ws.getCell(b.cell).numFmt);
      ws.getCell(b.cell).value = value;
      typed.set(`${b.sheet}!${b.cell}`, { value, path: b.path });
    }
    // A formula box holds what Excel computes when the person saves: here a
    // plain reference to a box they typed ('PART I'!D20), whose field the
    // formula box's field then is too -- a person can't make the two differ.
    const importFormulas = contractTargets(contract, ctx)
      .filter((t) => t.dir === 'import' && sheets.get(t.sheet)?.cells.get(t.cell)?.kind === 'FORMULA')
      .map((t) => ({ sheet: t.sheet, cell: t.cell, path: t.path, formula: sheets.get(t.sheet).cells.get(t.cell).text }));
    for (const c of [...computed, ...importFormulas]) {
      const at = referenceOf(hand, c.formula, c.sheet);
      const ref = at && typed.get(at);
      if (!ref) continue;
      hand.getWorksheet(c.sheet).getCell(c.cell).value = { formula: c.formula, result: ref.value };
      setPath(truth, c.path, getPath(truth, ref.path));
    }
    // Into a new filing of the form, as a filer starting from the Clerk's form would.
    const draft = importInto(await reopened(hand), form, ctx, { ...json(initializeEmptyData(form)), inventoryType: form });

    const paths = [...new Set([...boxes.map((b) => b.path), ...importFormulas.map((c) => c.path)])]
      .flatMap((p) => p.split('+').map((part, i) => (i === 0 ? part : p.slice(0, p.lastIndexOf('.') + 1) + part)))
      .filter((p) => !p.startsWith('(') && !p.includes('(fourth line)'));
    const lost = paths.filter((p) => !same(normalized(getPath(truth, p), kinds.get(p) || 'text'), normalized(getPath(draft, p), kinds.get(p) || 'text')));
    // A box locked in the Clerk's form can't be typed in, so its field comes
    // back blank or as its default (see lockedInClerkForm above).
    const listed = (p) => handFilledLosses.has(p) || handFilledLosses.has(pattern(p)) || lockedPaths.has(pattern(p));
    const unexpected = [...new Set(lost.filter((p) => !listed(p)).map(pattern))];
    const stale = [...handFilledLosses.keys()].filter((k) => !lost.some((p) => p === k || pattern(p) === k));
    expect(unexpected, 'fields a hand-filled workbook loses that no listed case accounts for').toEqual([]);
    expect(stale, 'listed losses that no longer happen: remove them').toEqual([]);
  }, 300_000);
});

describe('the import adapter (workbook-contract/index.js)', () => {
  const index = contractIndex;

  test('each filing type with a court workbook has its contract; the Plans have none', () => {
    expect(index.contractFor('guardian')).toBe(GUARDIAN_CONTRACT);
    for (const t of ['annual', 'finalAccounting', 'trustAccounting']) expect(index.contractFor(t)).toBe(ANNUAL_CONTRACT);
    expect(index.contractFor('simplified')).toBe(SIMPLIFIED_CONTRACT);
    for (const t of ['planInitial', 'planAnnual', 'planMinor', 'planSimplified']) expect(index.contractFor(t)).toBeNull();
  });

  test("an Annual-family workbook says which filing it is by PART I's box: \"Amended \" is the filing's own type, a blank or unknown box says nothing (73T part 3, row 4)", () => {
    expect(index.workbookTypeOf('Final', 'annual')).toBe('finalAccounting');
    expect(index.workbookTypeOf('Trust', 'finalAccounting')).toBe('trustAccounting');
    expect(index.workbookTypeOf('Annual', 'trustAccounting')).toBe('annual');
    expect(index.workbookTypeOf('Amended ', 'trustAccounting')).toBe('trustAccounting');
    expect(index.workbookTypeOf('', 'trustAccounting')).toBe('');
    expect(index.workbookTypeOf('Quarterly', 'annual')).toBe('');
    expect(index.workbookTypeOf(undefined, 'guardian')).toBe('guardian');
  });

  test("a draft goes through the import's text passes: a name formatted as typing formats it, its quotation marks kept (73T rows 11 and 19); < > and backticks removed", async () => {
    const wb = await templateWorkbook('simplified');
    wb.getWorksheet('PARTS I, II ').getCell('C4').value = 'jane "jj" doe';
    wb.getWorksheet('PARTS I, II ').getCell('D17').value = 'plenary <b>`x`</b>';
    const draft = index.draftFromWorkbook(wb, 'simplified');
    expect(draft.wardName).toBe('Jane "jj" Doe');
    expect(draft.typeOfGuardianship, 'not a name field: as typed, filtered').toBe('plenary bx/b');
  });
});

// Milestone 73T part 2: the Inventory's rows of the 73T table, fixed. One
// export of a filing showing every case, saved and opened again, then the
// import cases the export can't produce, made in the opened workbook.
describe("the Inventory's 73T rows, fixed in part 2", () => {
  const STAMP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
  let wrote, back;
  const filingOf = (patch) => merge(merge({ ...json(initializeEmptyData('guardian')), inventoryType: 'guardian' }, json(fixtures.MINIMAL_VALID_GUARDIAN)), json(patch));
  const cell = (sheet, ref) => cellValue(back.getWorksheet(sheet).getCell(ref));
  const read = (filing) => contractIndex.readWorkbookDraft(back, 'guardian', { filing });

  beforeAll(async () => {
    wrote = filingOf({
      attorneyForGuardian: 'Cover Attorney',
      attorney: { name: 'Dee Two', email: 'dee@example.com', signatureState: 'stamp', signatureImage: STAMP },
      guardians: [{ name: 'Ann Guardian', isPreparer: true, email: 'ann@example.com' }],
      preparer: { name: 'Hidden Preparer', phone: '555-0100' },
      hasSafeDepositBox: 'No', safeDepositBoxFiled: 'Yes',
      bondDepositoryState: 'bond-waived', bondAmount: 50000, bondingCompany: 'Old Surety', bondWaivedDate: '2026-03-04',
      serviceNoRecipients: 'Yes', serviceRecipients: [{ name: '', line2: '', line3: '' }],
      scheduleB2: [{ description: '30" Flat screen TV', fullAssetValue: 300, wardPercent: 100 }],
      scheduleB4: [{ lenderName: 'Zero Bank', fullLiabilityBalance: 0, wardPercent: 100 }, { lenderName: '', fullLiabilityBalance: 500, wardPercent: 100 }],
      scheduleC1: [{ payerName: 'social security', typeOfIncome: '=Pension', annualIncomeAmount: 1200, wardPercent: 100 }],
      scheduleC2: [{ lawsuitDescription: 'Foreclosure / Lien', caseNumber: '', amountOfClaim: 10, wardPercent: 100 },
        { lawsuitDescription: 'Foreclosure / Lien', caseNumber: '2024-CA-000123', amountOfClaim: 20, wardPercent: 100 }],
      scheduleC4: [{ trustName: 'the smith family trust', trusteeName: 'jane doe', trustAmount: 5, wardPercent: 100 }],
      scheduleC5: [{ assetDescription: 'house', ownerName: 'van der berg', totalAssetValue: 7, jointOwnerPercent: 50 }],
    });
    const wb = await templateWorkbook('guardian');
    writeContract(wb, GUARDIAN_CONTRACT, wrote, {});
    back = await reopened(wb);
  }, 240_000);

  test("row 6: D-2 keeps its own attorney -- name, emails and stamp -- when the Cover names someone else; a blank D-2 takes the Cover's", () => {
    const result = applyDraft(wrote, read(wrote).draft);
    expect(result.attorney).toMatchObject({ name: 'Dee Two', email: 'dee@example.com', signatureState: 'stamp', signatureImage: STAMP });
    const blankD2 = { ...json(wrote), attorney: { ...wrote.attorney, name: '' } };
    expect(applyDraft(blankD2, read(blankD2).draft).attorney.name).toBe('Cover Attorney');
  });

  test('row 7: a B-4 creditor with a $0 balance, and one with no lender, both come back', () => {
    expect(read(wrote).draft.scheduleB4.map((r) => [r.lenderName, r.fullLiabilityBalance])).toEqual([['Zero Bank', 0], ['', 500]]);
  });

  test("row 9: an outside-preparer block the export left blank -- a guardian is the preparer -- keeps the filing's preparer and the guardian's tick", () => {
    expect(cell('PART IV', 'I13')).toBe(null);
    const { draft } = read(wrote);
    expect('preparer' in draft).toBe(false);
    const result = applyDraft(wrote, draft);
    expect(result.preparer).toMatchObject({ name: 'Hidden Preparer', phone: '555-0100' });
    expect(result.guardians[0].isPreparer).toBe(true);
  });

  test("row 11: a quotation mark survives the import, as typing keeps it (decision 73T-3); < > and backticks still don't", () => {
    expect(read(wrote).draft.scheduleB2[0].description).toBe('30" Flat Screen TV');
    back.getWorksheet('B-2 PER PROP pg 1').getCell('C33').value = '<b>`30" TV`</b>';
    const stripped = read(wrote).draft.scheduleB2[0].description;
    expect(stripped).not.toMatch(/[<>`]/);
    expect(stripped).toContain('30" TV');
    back.getWorksheet('B-2 PER PROP pg 1').getCell('C33').value = '30" Flat screen TV';
  });

  test('row 12: "Foreclosure / Lien" comes back whole; a case number after the last " / " is split off', () => {
    expect(read(wrote).draft.scheduleC2.map((r) => [r.lawsuitDescription, r.caseNumber])).toEqual([['Foreclosure / Lien', ''], ['Foreclosure / Lien', '2024-CA-000123']]);
  });

  test('row 14: "no recipients are required" survives an import; a "Yes" the workbook contradicts by listing recipients goes back to unanswered, a "No" stays', () => {
    expect(applyDraft(wrote, read(wrote).draft).serviceNoRecipients).toBe('Yes');
    back.getWorksheet('PART VI').getCell('B13').value = 'Pat Recipient';
    expect(applyDraft(wrote, read(wrote).draft).serviceNoRecipients).toBe('');
    const answeredNo = { ...json(wrote), serviceNoRecipients: 'No' };
    expect(applyDraft(answeredNo, read(answeredNo).draft).serviceNoRecipients).toBe('No');
    back.getWorksheet('PART VI').getCell('B13').value = null;
  });

  test('row 15: Part V\'s own safe-deposit box gets the answer; "Inventory filed?" is blank -- not the Clerk\'s pre-filled "Yes" -- for a ward with no box', () => {
    expect(cell('PART V', 'H12')).toBe('No');
    expect(cell('SUMMARY I ', 'D26')).toBe('No');
    expect(cell('SUMMARY I ', 'H26')).toBe(null);
  });

  test('row 16: a waived bond files the waiver date and no bond details; the hidden details stay in the filing', () => {
    expect(['G26', 'E27', 'G27', 'D28'].map((ref) => cell('PART V', ref))).toEqual([null, null, null, null]);
    expect(cell('PART V', 'G15')).toBe(Date.UTC(2026, 2, 4) / 86400000 + 25569);
    const result = applyDraft(wrote, read(wrote).draft);
    expect([result.bondAmount, result.bondingCompany, result.bondWaivedDate]).toEqual([50000, 'Old Surety', '2026-03-04']);
  });

  test('row 17: the apostrophe the export puts before "=Pension" (so Excel shows it as text) comes off again', () => {
    expect(cell('C-1 INCOME pg 1', 'E29')).toBe("'=Pension");
    expect(read(wrote).draft.scheduleC1[0].typeOfIncome).toBe('=Pension');
  });

  test("row 19: names typed as entered come back as entered -- only the fields typing formats are formatted", () => {
    const { draft } = read(wrote);
    expect([draft.scheduleC4[0].trustName, draft.scheduleC4[0].trusteeName, draft.scheduleC5[0].ownerName]).toEqual(['the smith family trust', 'jane doe', 'van der berg']);
    // Typing formats these as names, so the import does too.
    expect([draft.scheduleC1[0].payerName, draft.scheduleC5[0].assetDescription]).toEqual(['Social Security', 'House']);
  });

  test('row 19: a date cell holding text no reader understands comes back as a date still being typed, not as a blank', () => {
    back.getWorksheet('PART V').getCell('G15').value = 'per order of March 2019';
    back.getWorksheet('C-2 LAWSUIT AGAINST 1').getCell('E24').value = 'spring 2019';
    const { draft, dateDrafts } = read(wrote);
    expect('bondWaivedDate' in draft).toBe(false);
    expect(dateDrafts).toEqual([{ path: 'bondWaivedDate', text: 'per order of March 2019' }, { path: 'scheduleC2.1.dateFiled', text: 'spring 2019' }]);
    back.getWorksheet('PART V').getCell('G15').value = new Date(Date.UTC(2026, 2, 4));
    back.getWorksheet('C-2 LAWSUIT AGAINST 1').getCell('E24').value = null;
  });

  test("a guardian after a blank slot keeps their place's person: the import says which slot each row came from", () => {
    const p3 = back.getWorksheet('PART III');
    const name = (i) => partIIINameBox(i);
    p3.getCell(name(2)).value = 'Cy Guardian';
    const { draft, rowSources } = read(wrote);
    expect(draft.guardians.map((g) => g.name)).toEqual(['Ann Guardian', 'Cy Guardian']);
    expect(rowSources).toEqual({ guardians: [0, 2] });
    p3.getCell(name(2)).value = null;
  });
});

// Milestone 73T part 3: the Annual family's rows of the 73T table, fixed. One
// export of a Trust Accounting showing every case, saved and opened again,
// then the import cases the export can't produce, made in the opened workbook.
describe("the Annual family's 73T rows, fixed in part 3", () => {
  const STAMP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
  let wrote, back;
  const filingOf = (patch) => merge(merge({ ...json(initializeEmptyData('annual')), inventoryType: 'trustAccounting', filingType: 'Trust' }, json(fixtures.MINIMAL_VALID_ANNUAL)), json(patch));
  const cell = (sheet, ref) => cellValue(back.getWorksheet(sheet).getCell(ref));
  const read = (filing) => contractIndex.readWorkbookDraft(back, filing.inventoryType, { filing });

  beforeAll(async () => {
    wrote = filingOf({
      startingBalance: '',
      guardians: [{ name: 'Ann Guardian', isPreparer: true }, { name: '', signatureState: 'stamp', signatureImage: STAMP }],
      attorney_signatureState: 'typed',
      preparer: { name: 'Hidden Preparer', phone: '555-0100' },
      schA: [{ payer: 'social security', description: 'monthly benefit', amount: '' }],
      schB1: [{ amount: 250 }],
      trusts: [{ hasTrust: 'Yes', name: 'Smith Family Trust', wardPct: 50, wardAmount: 12000 }],
      bondDepositoryState: 'depository-only', restrictedDepositoryReceiptDate: '2026-02-02', bondAmount: 50000, bondingCompany: 'Old Surety',
      certRecipients: [{ name: '' }, { name: 'Pat Recipient', line2: '1 Main St' }],
      remuneration: [{ guardian: 'Ann Guardian', type: 'Fee', amount: 1500, description: 'Annual fee / Q1' }],
      typeOfGuardianship: '=Plenary',
    });
    const wb = await templateWorkbook('annual');
    writeContract(wb, ANNUAL_CONTRACT, wrote, { filingTypeValue: 'Trust' });
    back = await reopened(wb);
  }, 240_000);

  test("row 2: an import never re-cases what the workbook doesn't carry -- the attorney's signature choice stays as the filing has it", () => {
    const { draft } = read(wrote);
    expect('attorney_signatureState' in draft).toBe(false);
    expect(applyDraft(wrote, draft).attorney_signatureState).toBe('typed');
  });

  test("row 3: Part VIII's answer, share and amount are written to the Clerk's H boxes, and read back; an older workbook's D cells are read when the H box is empty", () => {
    expect([cell('PART VIII', 'H8'), cell('PART VIII', 'H17'), cell('PART VIII', 'H18')]).toEqual(['Yes', 0.5, 12000]);
    expect([cell('PART VIII', 'D8'), cell('PART VIII', 'D17'), cell('PART VIII', 'D18')]).toEqual([null, null, null]);
    expect(read(wrote).draft.trusts[0]).toMatchObject({ hasTrust: 'Yes', wardPct: 50, wardAmount: 12000 });
    const p8 = back.getWorksheet('PART VIII');
    for (const ref of ['H8', 'H17', 'H18']) p8.getCell(ref).value = null;
    p8.getCell('D8').value = 'Yes';
    p8.getCell('D17').value = 0.25; p8.getCell('D17').numFmt = '0.00%';
    p8.getCell('D18').value = 3000;
    expect(read(wrote).draft.trusts[0]).toMatchObject({ hasTrust: 'Yes', wardPct: 25, wardAmount: 3000 });
    for (const ref of ['D8', 'D17', 'D18']) p8.getCell(ref).value = null;
    p8.getCell('H8').value = 'Yes'; p8.getCell('H17').value = 0.5; p8.getCell('H18').value = 12000;
  });

  test('row 4: a Trust Accounting keeps its type -- the workbook says what it is marked -- and "Amended " is an amended filing of its own type', () => {
    expect(cell('PART I', 'H4')).toBe('Trust');
    const { draft, workbookType } = read(wrote);
    expect('filingType' in draft).toBe(false);
    expect(workbookType).toBe('trustAccounting');
    back.getWorksheet('PART I').getCell('H4').value = 'Annual';
    expect(read(wrote).workbookType).toBe('annual');
    back.getWorksheet('PART I').getCell('H4').value = 'Amended ';
    const amended = read(wrote);
    expect([amended.workbookType, amended.draft.amendedForm]).toEqual(['trustAccounting', 'Yes']);
    back.getWorksheet('PART I').getCell('H4').value = 'Trust';
  });

  test('row 7: a B-1 row holding only an amount comes back', () => {
    expect(read(wrote).draft.schB1.map((r) => r.amount)).toEqual([250]);
  });

  test('row 8: the started recipients are written in order and come back; more than four stops Save as Excel', () => {
    expect([cell('PART X', 'B11'), cell('PART X', 'B12'), cell('PART X', 'I11')]).toEqual(['Pat Recipient', '1 Main St', null]);
    // Milestone 73O part 2: a name and four address lines.
    expect(read(wrote).draft.certRecipients).toEqual([{ name: 'Pat Recipient', line2: '1 Main St', line3: '', line4: '', line5: '' }]);
    const five = Array.from({ length: 5 }, (_, i) => ({ name: `R${i}` }));
    expect(checkExcelCapacity(ANNUAL_EXCEL_CAPS, { certRecipients: five }).map((o) => [o.key, o.count, o.cap])).toEqual([['certRecipients', 5, 4]]);
    expect(checkExcelCapacity(ANNUAL_EXCEL_CAPS, { certRecipients: [...five.slice(0, 4), { name: '' }] })).toEqual([]);
  });

  test("row 9: an outside-preparer block the export left blank keeps the filing's preparer and the guardian's tick", () => {
    expect(cell('PART IV, V', 'J15')).toBe(null);
    const result = applyDraft(wrote, read(wrote).draft);
    expect(result.preparer).toMatchObject({ name: 'Hidden Preparer', phone: '555-0100' });
    expect(result.guardians[0].isPreparer).toBe(true);
  });

  test('row 13: a blank Starting Balance and a blank income amount are written blank and come back blank', () => {
    expect([cell('PART VI, VII ', 'I8'), cell('SCH A INCOME p1', 'H21')]).toEqual([null, null]);
    const { draft } = read(wrote);
    expect([draft.startingBalance, draft.schA[0].amount]).toEqual(['', '']);
  });

  test('row 16: a depository-only filing files the receipt date and no bond details; the hidden ones stay in the filing', () => {
    expect([cell('PART IX ', 'G9'), cell('PART IX ', 'H20'), cell('PART IX ', 'D22')]).toEqual([Date.UTC(2026, 1, 2) / 86400000 + 25569, null, null]);
    const result = applyDraft(wrote, read(wrote).draft);
    expect([result.restrictedDepositoryReceiptDate, result.bondAmount, result.bondingCompany]).toEqual(['2026-02-02', 50000, 'Old Surety']);
  });

  test('row 17: the apostrophe the export puts before "=Plenary" comes off again', () => {
    expect(cell('PART I', 'D22')).toBe("'=Plenary");
    expect(read(wrote).draft.typeOfGuardianship).toBe('=Plenary');
  });

  test('row 19 / casing: only the fields typing formats are formatted on import', () => {
    const { draft } = read(wrote);
    expect([draft.schA[0].payer, draft.schA[0].description]).toEqual(['Social Security', 'monthly benefit']);
  });

  test("Part XI (73T-2): each remuneration entry on its own line, read back; a workbook with no line keeps the filing's entries", () => {
    expect(cell('PART XI', 'A6')).toBe('Ann Guardian  —  Fee  —  $1500.00  —  Annual fee / Q1');
    expect(cell('PART XI', 'A7')).toBe(null);
    expect(read(wrote).draft.remuneration).toEqual([{ guardian: 'Ann Guardian', type: 'Fee', amount: 1500, description: 'Annual fee / Q1' }]);
    expect(checkExcelCapacity(ANNUAL_EXCEL_CAPS, { remuneration: wrote.remuneration })).toEqual([]);
    back.getWorksheet('PART XI').getCell('A6').value = null;
    expect('remuneration' in read(wrote).draft).toBe(false);
    back.getWorksheet('PART XI').getCell('A6').value = 'Ann Guardian  —  Fee  —  $1500.00  —  Annual fee / Q1';
  });

  test('74B kept: a co-guardian slot the workbook shows blank still holds the filing\'s co-guardian who has only a stamp', () => {
    const { draft, rowSources } = read(wrote);
    expect(draft.guardians.map((g) => g.name)).toEqual(['Ann Guardian', '']);
    expect(rowSources, 'no row moved').toEqual({});
    expect(applyDraft(wrote, draft).guardians[1]).toMatchObject({ signatureState: 'stamp', signatureImage: STAMP });
  });
});

// Milestone 73T part 3: the Annual's casing table is what its pages type.
describe("the Annual's casing table matches the fields its pages format", () => {
  test('every field the Annual\'s pages label as a name, address or city/state/ZIP is in the table, and nothing else', async () => {
    const { readFileSync } = await import('node:fs');
    const { inferFieldKind } = await import('../../src/core/form/form-fields.js');
    const src = readFileSync('src/features/annual-accounting/index.js', 'utf8');
    const found = { name: new Set(), address: new Set(), zip: new Set() };
    const re = /inpD(?:WithTooltip)?\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`]*`)\s*,[^,]*?,\s*(`[^`]*`|'[^']*'|"[^"]*")/g;
    for (const m of src.matchAll(re)) {
      const label = m[1].slice(1, -1).replace(/\$\{[^}]*\}/g, '#');
      const path = (/D\.([\w.[\]$}{]+)\s*=/.exec(m[2])?.[1] || '').replace(/\[\$\{[^}]*\}\]|\[\d+\]/g, '.*').replace(/\$\{[^}]*\}/g, '*');
      const kind = inferFieldKind(label);
      if (path && found[kind]) found[kind].add(path);
    }
    // Part I's attorney renders under three labels (one page each); one field.
    const table = Object.fromEntries(Object.entries(ANNUAL_CONTRACT.casing).map(([k, v]) => [k, [...v].sort()]));
    expect(Object.fromEntries(Object.entries(found).map(([k, v]) => [k, [...v].sort()]))).toEqual(table);
  });
});

// Milestone 73T part 4: the Simplified's rows of the 73T table, fixed. One
// export of a filing showing every case, saved and opened again, then the
// import cases the export can't produce, made in the opened workbook.
describe("the Simplified's 73T rows, fixed in part 4", () => {
  const STAMP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
  const P56 = 'PARTS V, VI ';
  let wrote, back;
  const filingOf = (patch) => merge(merge({ ...json(initializeEmptyData('simplified')), inventoryType: 'simplified' }, json(fixtures.MINIMAL_VALID_SIMPLIFIED)), json(patch));
  const cell = (sheet, ref) => cellValue(back.getWorksheet(sheet).getCell(ref));
  const read = (filing) => contractIndex.readWorkbookDraft(back, 'simplified', { filing });

  beforeAll(async () => {
    wrote = filingOf({
      guardian: 'Ann Guardian',
      guardians: [{ name: 'Ann Guardian', signatureState: 'stamp', signatureImage: STAMP, certifiesService: true }],
      attorney_signatureDate: '2026-03-01', certAttySignDate: '2026-03-05', attorney_signatureState: 'typed',
      startingBalance: '', interestIncome: 12.5,
      certNoRecipients: '', certRecipients: [{ name: '' }, { name: 'Pat Recipient', line2: '1 Main St' }, { name: '' }, { name: '' }],
      certAttyBarNumber: '00011111',
    });
    const wb = await templateWorkbook('simplified');
    writeContract(wb, SIMPLIFIED_CONTRACT, wrote, {});
    back = await reopened(wb);
  }, 240_000);

  test("row 1: re-importing the filing's own workbook keeps Guardian #1 -- name, stamp, served the copies; a filing with none takes Part I's guardian", () => {
    expect(cell('PARTS III, IV', 'F15'), "the Clerk's link, never written").toBe(null);
    const result = applyDraft(wrote, read(wrote).draft);
    expect(result.guardians[0]).toMatchObject({ name: 'Ann Guardian', signatureState: 'stamp', signatureImage: STAMP, certifiesService: true });
    const blank = { ...json(wrote), guardians: [{ name: '' }] };
    expect(applyDraft(blank, read(blank).draft).guardians[0].name).toBe('Ann Guardian');
  });

  test("row 2: the attorney's signature choice is never re-cased", () => {
    const { draft } = read(wrote);
    expect('attorney_signatureState' in draft).toBe(false);
    expect(applyDraft(wrote, draft).attorney_signatureState).toBe('typed');
  });

  test('row 8: the started recipients are written in order and come back; more than four stops Save as Excel', () => {
    expect([cell(P56, 'B27'), cell(P56, 'B28'), cell(P56, 'I27')]).toEqual(['Pat Recipient', '1 Main St', null]);
    // Milestone 73O part 2: a name and four address lines.
    expect(read(wrote).draft.certRecipients).toEqual([{ name: 'Pat Recipient', line2: '1 Main St', line3: '', line4: '', line5: '' }]);
    const five = Array.from({ length: 5 }, (_, i) => ({ name: `R${i}` }));
    expect(checkExcelCapacity(SIMPLIFIED_EXCEL_CAPS, { certRecipients: five }).map((o) => [o.key, o.count, o.cap])).toEqual([['certRecipients', 5, 4]]);
  });

  test("row 10: Part V's own date box H17 gets the attorney's date and the certificate's H41 its own; each comes back to its field", () => {
    expect([cell(P56, 'H17'), cell(P56, 'H41')]).toEqual([Date.UTC(2026, 2, 1) / 86400000 + 25569, Date.UTC(2026, 2, 5) / 86400000 + 25569]);
    expect(read(wrote).draft).toMatchObject({ attorney_signatureDate: '2026-03-01', certAttySignDate: '2026-03-05' });
    back.getWorksheet(P56).getCell('H17').value = null;
    expect('attorney_signatureDate' in read(wrote).draft, 'an older workbook (H17 blank) keeps the filing\'s date').toBe(false);
    back.getWorksheet(P56).getCell('H17').value = new Date(Date.UTC(2026, 2, 1));
  });

  test('row 13: a blank Starting Balance is written blank and comes back blank', () => {
    expect([cell('PARTS I, II ', 'H19'), cell('PARTS I, II ', 'G22')]).toEqual([null, 12.5]);
    expect(read(wrote).draft.startingBalance).toBe('');
  });

  test('row 14: "no recipients are required" answered Yes writes no recipients; an import keeps the answer unless the workbook lists recipients', async () => {
    const none = { ...json(wrote), certNoRecipients: 'Yes' };
    const wb = await templateWorkbook('simplified');
    writeContract(wb, SIMPLIFIED_CONTRACT, none, {});
    expect(cellValue(wb.getWorksheet(P56).getCell('B27')), 'the PDF prints none, and so does the workbook').toBe(null);
    expect(applyDraft(none, contractIndex.readWorkbookDraft(wb, 'simplified', { filing: none }).draft).certNoRecipients).toBe('Yes');
    expect(applyDraft(none, read(none).draft).certNoRecipients, 'contradicted by listed recipients').toBe('');
  });

  test("row 18: an import keeps the certificate's old details the filer hasn't discarded, unless the workbook's differ", () => {
    expect(applyDraft(wrote, read(wrote).draft).certAttyBarNumber).toBe('00011111');
    back.getWorksheet(P56).getCell('B43').value = '00022222';
    expect(applyDraft(wrote, read(wrote).draft).certAttyBarNumber).toBe('00022222');
    back.getWorksheet(P56).getCell('B43').value = cell(P56, 'B19');
  });

  test('dates (the requester\'s choice, 2026-10-07): a date typed as US text reads as the day; text that is no date comes back as a date still being typed', () => {
    back.getWorksheet('PARTS I, II ').getCell('F4').value = '1/5/2001';
    back.getWorksheet('PARTS I, II ').getCell('E13').value = 'early 2026';
    const { draft, dateDrafts } = read(wrote);
    expect(draft.gid).toBe('2001-01-05');
    expect(draft.periodFrom).toBe('');
    expect(dateDrafts).toEqual([{ path: 'periodFrom', text: 'early 2026' }]);
    back.getWorksheet('PARTS I, II ').getCell('F4').value = wrote.gid ? new Date(`${wrote.gid}T00:00:00Z`) : null;
    back.getWorksheet('PARTS I, II ').getCell('E13').value = wrote.periodFrom ? new Date(`${wrote.periodFrom}T00:00:00Z`) : null;
  });

  test('the guardians after the third stay where they are, and 74B\'s stamp-only co-guardian keeps its slot', () => {
    const four = { ...json(wrote), guardians: [{ name: 'Ann Guardian' }, { name: '', signatureState: 'stamp', signatureImage: STAMP }, { name: '' }, { name: 'Dee Fourth', phone: '4' }] };
    const { draft, rowSources } = read(four);
    // Guardian #1's name is left out (the filing has one); the stamp-only slot is kept; the fourth follows.
    expect(draft.guardians.map((g) => g.name)).toEqual([undefined, '', 'Dee Fourth']);
    expect(rowSources.guardians).toEqual([0, 1, 3]);
    const result = applyDraft(four, draft, rowSources);
    expect(result.guardians.map((g) => g.name)).toEqual(['Ann Guardian', '', 'Dee Fourth']);
    expect(result.guardians[1]).toMatchObject({ signatureImage: STAMP });
  });
});

// Milestone 73T part 4: the Simplified's casing table is what its pages type.
describe("the Simplified's casing table matches the fields its pages format", () => {
  test("every field the Simplified's pages give a name, address or city/state/ZIP box is in the table, and nothing else", async () => {
    const { readFileSync } = await import('node:fs');
    const { inferFieldKind } = await import('../../src/core/form/form-fields.js');
    const src = readFileSync('src/features/simplified-accounting/index.js', 'utf8');
    const norm = (p) => p.replace(/\$\{[^}]*\}/g, '*');
    const found = { name: new Set(), address: new Set(), zip: new Set() };
    const add = (kind, path) => { if (found[kind]) found[kind].add(norm(path)); };
    const str = `('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\`[^\`]*\`)`;
    for (const m of src.matchAll(new RegExp(`inpS(?:WithTooltip)?\\(\\s*${str}\\s*,\\s*${str}`, 'g'))) add(inferFieldKind(norm(m[2].slice(1, -1))), m[1].slice(1, -1));
    for (const m of src.matchAll(/renderFormField\(\{([^}]*(?:\}[^}]*)*?)\}\)/g)) {
      const path = /path:\s*(`[^`]*`|'[^']*')/.exec(m[1])?.[1]?.slice(1, -1);
      const label = /label:\s*(`[^`]*`|'[^']*')/.exec(m[1])?.[1]?.slice(1, -1);
      const kind = /kind:\s*'([a-zA-Z]+)'/.exec(m[1])?.[1];
      if (path && label) add(kind || inferFieldKind(norm(label)), path);
    }
    for (const m of src.matchAll(/data-form-path="([^"]+)" data-form-format="([a-z-]+)"/g)) add({ name: 'name', address: 'address', 'city-state-zip': 'zip', zip: 'zip' }[m[2]], m[1]);
    // A guardian's name: its label is built from a nested template string
    // (`${labels[i]||`Co-Guardian #${i+1}`}'s Name`) this scan can't read; it
    // renders as a name box.
    found.name.add('guardians.*.name');
    const table = Object.fromEntries(Object.entries(SIMPLIFIED_CONTRACT.casing).map(([k, v]) => [k, [...v].sort()]));
    expect(Object.fromEntries(Object.entries(found).map(([k, v]) => [k, [...v].sort()]))).toEqual(table);
  });
});

// Milestone 73M: what the court's workbook has no box for -- said beside the
// export buttons and asked about at Save as Excel (excelOmissions()) -- and
// A-2's Notes, which the import used to erase (decision 73M-1).
describe('73M: what the workbook has no box for', () => {
  const inventory = (patch) => merge(merge({ ...json(initializeEmptyData('guardian')), inventoryType: 'guardian' }, json(fixtures.MINIMAL_VALID_GUARDIAN)), json(patch));

  test("A-2's Notes are kept on import for the same lender in the same place; a row now naming another lender gets none", async () => {
    const filing = inventory({
      scheduleA2: [
        { lenderName: 'First Bank', fullDebtBalance: 100, wardPercent: 100, notes: 'paid monthly' },
        // A row the workbook doesn't carry (no lender, no balance) does not
        // shift the rows after it.
        { lenderName: '', fullDebtBalance: '', wardPercent: '', notes: '' },
        { lenderName: 'Second Bank', fullDebtBalance: 200, wardPercent: 100, notes: 'in dispute' },
      ],
    });
    const wb = await templateWorkbook('guardian');
    writeContract(wb, GUARDIAN_CONTRACT, filing, {});
    const back = await reopened(wb);
    const { draft } = contractIndex.readWorkbookDraft(back, 'guardian', { filing });
    expect(draft.scheduleA2.map((r) => [r.lenderName, r.notes])).toEqual([['First Bank', 'paid monthly'], ['Second Bank', 'in dispute']]);
    expect(applyDraft(filing, draft).scheduleA2.map((r) => r.notes)).toEqual(['paid monthly', 'in dispute']);
    const renamed = json(filing);
    renamed.scheduleA2[2].lenderName = 'Third Bank';
    expect(contractIndex.readWorkbookDraft(back, 'guardian', { filing: renamed }).draft.scheduleA2.map((r) => r.notes)).toEqual(['paid monthly', '']);
  }, 240_000);

  test("each form names what its workbook has no box for; what must be filed another way is marked to be asked about", () => {
    const omits = (type, patch) => contractIndex.excelOmissions({ ...json(initializeEmptyData(type)), inventoryType: type, ...patch });
    expect(omits('guardian', {})).toEqual([]);
    expect(omits('guardian', { scheduleA2: [{ lenderName: 'First Bank', notes: 'paid monthly' }], serviceMethod: 'Mail', ucn: '522024GA000123XXXXNO' }))
      .toEqual([{ text: "A-2's Notes", warn: true }, { text: 'the method of service' }, { text: 'the UCN' }]);
    // Line 20 is $500 (an income entry), Line 30 is $0 (no Schedule D): out of balance.
    const outOfBalance = { schA: [{ payer: 'Social Security', amount: '500' }] };
    expect(omits('annual', { ...outOfBalance, reconcileExplanation: 'A prior-period correction.', certIndicator: 'Mail', ucn: '522024GA000123XXXXNO' }))
      .toEqual([{ text: 'the explanation of the difference between Lines 20 and 30', warn: true }, { text: 'the method of service' }, { text: 'the UCN' }]);
    // In balance, the explanation prints nowhere -- the PDF neither -- so it isn't named.
    expect(omits('annual', { reconcileExplanation: 'Left over from an earlier draft.' })).toEqual([]);
    expect(omits('simplified', { certIndicator: 'Mail', ucn: '522024GA000123XXXXNO' })).toEqual([{ text: 'the method of service' }, { text: 'the UCN' }]);
    // Whitespace is nothing typed; the Plans have no workbook at all.
    expect(omits('annual', { reconcileExplanation: '   ' })).toEqual([]);
    expect(contractIndex.excelOmissions({ inventoryType: 'plan-annual', ucn: '522024GA000123XXXXNO' })).toEqual([]);
  });
});
