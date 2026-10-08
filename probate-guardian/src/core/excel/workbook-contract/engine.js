// Milestone 73T part 1: the workbook contract's engine -- write a filing into
// a court workbook from its form's contract, read a workbook back into a
// detached draft, and list every cell the contract names, for the checks.
//
// A contract is { form, template, entries, notCarried, preserve, afterRead? }.
// Each entry is plain data, one of:
//
//   field    one field and its cell:
//            { kind: 'field', path, sheet, cell, codec, dir?, value?, exportIf?,
//              fallback?, formula?, defect?, keepIfBlank?, readAs? }
//   slots    a fixed number of blocks with a cell per field (the guardians):
//            { kind: 'slots', path, sheet, slots: [{ field: cell, ... }],
//              fields: { field: { codec, dir?, fallback?, formula?, defect? } },
//              exportFilter?, exportIf?, keep(row, i, ctx)?, defect? }
//            (ctx.filing, when the import gives it, is the filing read into)
//            (a field's dir and defect may be functions of the slot's index:
//            the Simplified's Guardian #1 name is read but never written)
//   rows     a repeating schedule over pages of rows:
//            { kind: 'rows', path, pages: [{ sheet, rows }], columns, combined?,
//              blankLines?, present, finish?, exportFilter?, alwaysRead?, keepIfNone? }
//   custom   an entry no table can express (Schedule B-4's account blocks):
//            { kind: 'custom', path, write, read, targets }
//   constant a value the import sets without reading a cell:
//            { kind: 'constant', path, value, defect? }
//
// dir is 'both' (the default), 'export' or 'import'. `formula` names the
// recorded approval under which a formula cell is written (AGENTS.md
// section 5: never otherwise). `defect` cites the 73T row an entry still
// carries, and the part that fixes it ({ row, part, note, box? }; `box`
// names the Clerk's own box when the defect is writing beside it).
// `keepIfBlank` is the absence policy "the workbook has no say": a blank cell
// leaves the field out of the draft, so the filing keeps its value.
//
// Nothing in the app calls write or read yet: 73T parts 2-4 move each form's
// exporter and importer onto its contract. Until then the exporters remain
// the source of what a filer's workbook holds, and tests/unit/
// workbook-contract.spec.js proves each contract writes exactly what its
// exporter writes.
import { setCell as engineSetCell, setDateCell as engineSetDateCell } from '../excel-engine.js';
import { unwrapCellValue } from '../cell-reader.js';

export function getPath(obj, dotted) {
  return String(dotted).split('.').reduce((v, k) => (v == null ? undefined : v[k]), obj);
}

export function setPath(obj, dotted, value) {
  const keys = String(dotted).split('.');
  let t = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (t[keys[i]] == null) t[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    t = t[keys[i]];
  }
  t[keys[keys.length - 1]] = value;
}

const cellRef = (col, row) => `${col}${row}`;

/** Every slot of a paged schedule, in page order: [{ sheet, row, index }]. */
export function rowSlots(entry) {
  const out = [];
  for (const page of entry.pages) for (const row of page.rows) out.push({ sheet: page.sheet, row, index: out.length });
  return out;
}

/** Writes one value through its codec (custom entries use it too). */
export function writeCell(workbook, io, sheetName, addr, codec, v, filing) {
  const ws = workbook.getWorksheet(sheetName);
  if (!ws) return;
  const out = codec.write(v, filing);
  const cell = out.date ? io.setDateCell(ws, addr, out.value) : io.setCell(ws, addr, out.value);
  if (out.numFmt && cell) cell.numFmt = out.numFmt;
}

const exports = (dir) => dir !== 'import';
const imports = (dir) => dir !== 'export';
const perSlot = (v, i) => (typeof v === 'function' ? v(i) : v);

/**
 * Writes `filing` into `workbook` by the contract. `ctx` carries what an
 * exporter computes for the whole export (the Annual's filing-type value,
 * Schedule B-4's plan).
 */
export function writeContract(workbook, contract, filing, ctx = {}, io = { setCell: engineSetCell, setDateCell: engineSetDateCell }) {
  for (const entry of contract.entries) {
    if (!exports(entry.dir)) continue;
    if (entry.kind === 'field') {
      if (entry.exportIf && !entry.exportIf(filing, ctx)) continue;
      const v = entry.value ? entry.value(filing, ctx) : getPath(filing, entry.path);
      writeCell(workbook, io, entry.sheet, entry.cell, entry.codec, v, filing);
    } else if (entry.kind === 'slots') {
      // exportFilter: the rows given a slot, in order (the Annual's started recipients).
      const list = (getPath(filing, entry.path) || []).filter((r) => (entry.exportFilter ? entry.exportFilter(r) : true));
      entry.slots.forEach((cells, i) => {
        const row = list[i];
        if (entry.exportIf && !entry.exportIf(row, i, filing)) return;
        for (const [field, addr] of Object.entries(cells)) {
          const spec = entry.fields[field];
          if (!exports(perSlot(spec.dir, i))) continue;
          // Milestone 74P: a slot field may say what it files (spec.value) --
          // a guardian's office address while "same as mailing" is ticked.
          writeCell(workbook, io, entry.sheet, addr, spec.codec, spec.value ? spec.value(row || {}, i) : (row || {})[field], filing);
        }
      });
    } else if (entry.kind === 'rows') {
      const list = (getPath(filing, entry.path) || []).filter((r) => (entry.exportFilter ? entry.exportFilter(r) : true));
      const slots = rowSlots(entry);
      list.forEach((row, i) => {
        const slot = slots[i];
        if (!slot) return;
        for (const c of entry.columns) {
          if (!exports(c.dir)) continue;
          const v = c.value ? c.value(row) : row[c.field];
          writeCell(workbook, io, slot.sheet, cellRef(c.col, slot.row + (c.line || 0)), c.codec, v, filing);
        }
        for (const x of entry.combined || []) {
          writeCell(workbook, io, slot.sheet, cellRef(x.col, slot.row + (x.line || 0)), x.codec, x.join(row), filing);
        }
        for (const b of entry.blankLines || []) {
          const ws = workbook.getWorksheet(slot.sheet);
          if (ws) io.setCell(ws, cellRef(b.col, slot.row + (b.line || 0)), '');
        }
      });
    } else if (entry.kind === 'custom') {
      entry.write(workbook, filing, io, ctx);
    }
  }
}

const blank = (v) => v === '' || v == null;

// Milestone 73T part 2: a date cell holding text no reader understands (a
// legacy free-text date) -- reported, so the import brings it back as a date
// still being typed, visible to the filer, rather than as a blank.
function noteUnreadableDate(report, codec, cell, value, path) {
  if (!report || codec.kind !== 'date' || !blank(value)) return;
  const raw = unwrapCellValue(cell ? cell.value : null);
  if (typeof raw === 'string' && raw.trim()) report.unreadableDates.push({ path, text: raw.trim() });
}

function readField(workbook, entry, report) {
  const ws = workbook.getWorksheet(entry.sheet);
  if (!ws) return { present: false };
  let cell = ws.getCell(entry.cell);
  let v = entry.codec.read(cell);
  for (const f of entry.fallback || []) {
    if (!blank(v)) break;
    const fws = workbook.getWorksheet(f.sheet || entry.sheet);
    if (!fws) continue;
    const fcell = fws.getCell(f.cell);
    if (f.unless && f.unless(fcell)) continue;
    cell = fcell;
    v = (f.codec || entry.codec).read(fcell);
  }
  noteUnreadableDate(report, entry.codec, cell, v, entry.path);
  return { present: true, value: v };
}

/**
 * Reads `workbook` into a detached draft by the contract: the filing's
 * fields as the workbook has them, nothing more. A sheet the workbook
 * doesn't have contributes nothing.
 *
 * `report`, when given, collects what the draft alone can't say:
 * `rowSources` -- for a slots list that skipped an empty slot, the slot each
 * kept row came from -- and `unreadableDates`, [{ path, text }].
 */
export function readContract(workbook, contract, ctx = {}, report = null) {
  const draft = {};
  if (report) { report.rowSources = report.rowSources || {}; report.unreadableDates = report.unreadableDates || []; }
  for (const entry of contract.entries) {
    if (!imports(entry.dir)) continue;
    if (entry.kind === 'field') {
      const r = readField(workbook, entry, report);
      if (!r.present || (entry.keepIfBlank && blank(r.value))) continue;
      setPath(draft, entry.path, entry.readAs ? entry.readAs(r.value, draft) : r.value);
    } else if (entry.kind === 'constant') {
      setPath(draft, entry.path, entry.value);
    } else if (entry.kind === 'slots') {
      const ws = workbook.getWorksheet(entry.sheet);
      if (!ws) continue;
      const rows = [];
      const sources = [];
      entry.slots.forEach((cells, i) => {
        const row = {};
        const dates = [];
        for (const [field, addr] of Object.entries(cells)) {
          const spec = entry.fields[field];
          if (!imports(perSlot(spec.dir, i))) continue;
          let cell = ws.getCell(addr);
          let v = spec.codec.read(cell);
          for (const f of (spec.fallback ? spec.fallback(i) : [])) {
            if (!blank(v)) break;
            // A fallback may sit on another sheet (the Simplified's Guardian #1 name: Part I's D16).
            const fws = f.sheet ? workbook.getWorksheet(f.sheet) : ws;
            if (!fws) continue;
            const fcell = fws.getCell(f.cell);
            if (f.unless && f.unless(fcell)) continue;
            cell = fcell;
            v = (f.codec || spec.codec).read(fcell);
          }
          row[field] = v;
          dates.push([spec.codec, cell, v, field]);
        }
        if (entry.keep && !entry.keep(row, i, ctx)) return;
        for (const [codec, cell, v, field] of dates) noteUnreadableDate(report, codec, cell, v, `${entry.path}.${rows.length}.${field}`);
        rows.push(row);
        sources.push(i);
      });
      setPath(draft, entry.path, rows);
      if (report && sources.some((s, k) => s !== k)) report.rowSources[entry.path] = sources;
    } else if (entry.kind === 'rows') {
      const out = [];
      let any = false;
      for (const page of entry.pages) {
        const ws = workbook.getWorksheet(page.sheet);
        if (!ws) continue;
        any = true;
        for (const r of page.rows) {
          const row = {};
          const dates = [];
          for (const c of entry.columns) {
            if (!imports(c.dir)) continue;
            const cell = ws.getCell(cellRef(c.col, r + (c.line || 0)));
            let v = c.codec.read(cell);
            // An older line the field used to be written on (Inventory B-4's
            // account number, before Milestone 60K).
            for (const f of c.fallback || []) {
              if (!blank(v)) break;
              v = c.codec.read(ws.getCell(cellRef(f.col || c.col, r + (f.line || 0))));
            }
            row[c.field] = v;
            dates.push([c.codec, cell, v, c.field]);
          }
          for (const x of entry.combined || []) {
            Object.assign(row, x.split(x.codec.read(ws.getCell(cellRef(x.col, r + (x.line || 0)))), { sheet: ws, row: r }));
          }
          if (!entry.present(row, { sheet: ws, row: r })) continue;
          for (const [codec, cell, v, field] of dates) noteUnreadableDate(report, codec, cell, v, `${entry.path}.${out.length}.${field}`);
          out.push(entry.finish ? entry.finish(row) : row);
        }
      }
      // keepIfNone: a schedule the workbook holds no row of says nothing
      // (Part XI's lines, blank in every workbook exported before 73T part 3).
      if ((any || entry.alwaysRead) && !(entry.keepIfNone && !out.length)) setPath(draft, entry.path, out);
    } else if (entry.kind === 'custom') {
      entry.read(workbook, draft, ctx);
    }
  }
  if (contract.afterRead) contract.afterRead(draft, workbook, ctx);
  return draft;
}

/**
 * Every cell the contract names: [{ sheet, cell, path, dir, kind, formula?,
 * defect? }]. Repeating schedules are expanded to every slot, so a check
 * reaches each address the exporter can write -- including the ones an
 * exporter builds while it runs, which no reading of its source can list.
 */
export function contractTargets(contract, ctx = {}) {
  const out = [];
  const push = (t) => out.push({ dir: 'both', ...t });
  for (const entry of contract.entries) {
    if (entry.kind === 'field') {
      push({ sheet: entry.sheet, cell: entry.cell, path: entry.path, dir: entry.dir || 'both', kind: entry.codec.kind, formula: entry.formula, defect: entry.defect });
      for (const f of entry.fallback || []) push({ sheet: f.sheet || entry.sheet, cell: f.cell, path: entry.path, dir: 'import', kind: entry.codec.kind, fallback: true });
    } else if (entry.kind === 'slots') {
      entry.slots.forEach((cells, i) => {
        for (const [field, addr] of Object.entries(cells)) {
          const spec = entry.fields[field];
          push({ sheet: entry.sheet, cell: addr, path: `${entry.path}.${i}.${field}`, dir: perSlot(spec.dir, i) || 'both', kind: spec.codec.kind, formula: spec.formula?.(i), defect: perSlot(spec.defect, i) || entry.defect });
          for (const f of (spec.fallback ? spec.fallback(i) : [])) push({ sheet: entry.sheet, cell: f.cell, path: `${entry.path}.${i}.${field}`, dir: 'import', kind: spec.codec.kind, fallback: true });
        }
      });
    } else if (entry.kind === 'rows') {
      for (const slot of rowSlots(entry)) {
        for (const c of entry.columns) {
          push({ sheet: slot.sheet, cell: cellRef(c.col, slot.row + (c.line || 0)), path: `${entry.path}.${slot.index}.${c.field}`, dir: c.dir || 'both', kind: c.codec.kind, defect: c.defect });
          for (const f of c.fallback || []) push({ sheet: slot.sheet, cell: cellRef(f.col || c.col, slot.row + (f.line || 0)), path: `${entry.path}.${slot.index}.${c.field}`, dir: 'import', kind: c.codec.kind, fallback: true });
        }
        for (const x of entry.combined || []) push({ sheet: slot.sheet, cell: cellRef(x.col, slot.row + (x.line || 0)), path: `${entry.path}.${slot.index}.${x.fields.join('+')}`, dir: 'both', kind: x.codec.kind, defect: x.defect });
        for (const b of entry.blankLines || []) push({ sheet: slot.sheet, cell: cellRef(b.col, slot.row + (b.line || 0)), path: `${entry.path}.${slot.index}.(${b.why || 'blank line'})`, dir: 'export', kind: 'blank' });
      }
    } else if (entry.kind === 'custom') {
      for (const t of entry.targets(ctx)) push(t);
    }
  }
  return out;
}

/** How many rows each repeating schedule's pages hold. */
export function contractCapacities(contract) {
  return Object.fromEntries(contract.entries.filter((e) => e.kind === 'rows').map((e) => [e.path, rowSlots(e).length]));
}
