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
// Where today's mapping still loses or misplaces something, the 73T row and
// the part that fixes it are listed below. Each listed case must still
// happen: the part that fixes one removes it from here.
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
      { path: 'scheduleA1.*.residence', why: "A-1's \"Residence?\" column, all three pages" },
      { path: 'scheduleA1.*.income', why: "A-1's \"Income?\" column, all three pages" },
      { path: 'scheduleA2.*.liabilityType', why: "A-2's liability \"Type\" column, all three pages" },
      { path: 'scheduleB4.*.liabilityType', why: "B-4's liability \"Type\" column, all four pages" },
      { path: 'scheduleC1.*.frequencyOfPayment', why: "C-1's \"Frequency\" column, all three pages" },
      { path: 'scheduleC4.*.trustType', why: "C-4's \"Type of Trust\" column, both pages" },
      { path: 'scheduleC5.*.relationshipToWard', sheet: 'C-5 JOINT OWNERS pg 3', why: 'C-5 page 3 only (page 2 unlocks it)' },
      { path: 'scheduleC5.*.totalAssetValue', sheet: 'C-5 JOINT OWNERS pg 3', why: 'C-5 page 3 only (page 2 unlocks it)' },
      { path: 'scheduleC5.*.jointOwnerPercent', sheet: 'C-5 JOINT OWNERS pg 3', why: 'C-5 page 3 only (page 2 unlocks it)' },
    ],
    // Round-trip differences today's mapping still has: path -> [73T row, part, why].
    roundTripLosses: new Map([
      ['scheduleC2.*.claimantName', [null, null, 'by decision (2026-09-22): the claimant and their attorney share one line, read back as the claimant']],
      ['scheduleC2.*.claimantAttorney', [null, null, 'by decision (2026-09-22): not split back from the claimant line']],
      ['serviceNoRecipients', [14, 2, '"no recipients are required" is cleared by import']],
      ['attorney.name', [6, 2, "D-2's own name is replaced by the Cover's Attorney for Guardian"]],
    ]),
    // A filing that answers "no recipients are required", to show it lost (73T row 14).
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
    // Part VIII's own boxes (73T row 3): the Yes/No answer H8, each trust's
    // share and amount in H; the app writes and reads the locked D cells beside them.
    handFilledBoxes: () => [
      { path: 'trusts.0.hasTrust', sheet: 'PART VIII', cell: 'H8' },
      ...[0, 1, 2].flatMap((i) => [
        { path: `trusts.${i}.wardPct`, sheet: 'PART VIII', cell: `H${17 + 10 * i}` },
        { path: `trusts.${i}.wardAmount`, sheet: 'PART VIII', cell: `H${18 + 10 * i}` },
      ]),
    ],
    handFilledLosses: new Map([
      ['trusts.*.hasTrust', [3, 3, "Part VIII's answer is read from the locked D8, not the Clerk's box H8"]],
      ['trusts.*.wardPct', [3, 3, "each trust's share is read from D17/D27/D37, not the Clerk's H boxes"]],
      ['trusts.*.wardAmount', [3, 3, "each trust's amount is read from D18/D28/D38, not the Clerk's H boxes"]],
    ]),
  },
  {
    form: 'simplified', contract: SIMPLIFIED_CONTRACT, manifest: () => manifests.simplifiedManifest(), base: fixtures.MINIMAL_VALID_SIMPLIFIED, ctx: {},
    allowedTargets: new Map(),
    lockedInClerkForm: [],
    roundTripLosses: new Map([
      ['guardians.0.name', [1, 4, "Guardian #1's name box is the form's link to Part I, with no value until Excel calculates it"]],
    ]),
    roundTripSetup: () => {},
    roundTripExtraPaths: ['guardians.0.name'],
    // Part V's own date box H17 (73T row 10): the app writes and reads only the certificate's H41.
    handFilledBoxes: () => [{ path: 'attorney_signatureDate', sheet: 'PARTS V, VI ', cell: 'H17', kind: 'date', value: 45000 }],
    handFilledLosses: new Map([
      ['attorney_signatureDate', [10, 4, "Part V's date box H17 is never read; the certificate's H41 is read into it"]],
    ]),
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
      const finite = manifest.finite.map((box) => ({ sheet: box.sheet, cell: box.cell, value: coding.answer(box, run), path: box.path }));
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
    const back = new (loadExcelJS().Workbook)();
    await back.xlsx.load(await out.xlsx.writeBuffer());
    const draft = readContract(back, contract, ctx);
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
    const back = new (loadExcelJS().Workbook)();
    await back.xlsx.load(await hand.xlsx.writeBuffer());
    const draft = readContract(back, contract, ctx);

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
  let index;
  beforeAll(async () => { index = await import('../../src/core/excel/workbook-contract/index.js'); });

  test('each filing type with a court workbook has its contract; the Plans have none', () => {
    expect(index.contractFor('guardian')).toBe(GUARDIAN_CONTRACT);
    for (const t of ['annual', 'finalAccounting', 'trustAccounting']) expect(index.contractFor(t)).toBe(ANNUAL_CONTRACT);
    expect(index.contractFor('simplified')).toBe(SIMPLIFIED_CONTRACT);
    for (const t of ['planInitial', 'planAnnual', 'planMinor', 'planSimplified']) expect(index.contractFor(t)).toBeNull();
  });

  test("an Annual-family workbook says which filing it is by PART I's box; a blank or unknown box reads as an Annual (73T row 4)", () => {
    expect(index.workbookTypeOf({ filingType: 'Final' }, 'annual')).toBe('finalAccounting');
    expect(index.workbookTypeOf({ filingType: 'Trust' }, 'finalAccounting')).toBe('trustAccounting');
    expect(index.workbookTypeOf({ filingType: '' }, 'trustAccounting')).toBe('annual');
    expect(index.workbookTypeOf({ filingType: 'Amended ' }, 'annual')).toBe('annual');
    expect(index.workbookTypeOf({}, 'guardian')).toBe('guardian');
  });

  test("a draft goes through today's import text passes: names re-cased, quotation marks removed (73T rows 11 and 19)", async () => {
    const wb = await templateWorkbook('simplified');
    wb.getWorksheet('PARTS I, II ').getCell('C4').value = 'jane "jj" doe';
    const draft = index.draftFromWorkbook(wb, 'simplified');
    expect(draft.wardName).not.toContain('"');
    expect(draft.wardName.startsWith('Jane')).toBe(true);
  });
});
