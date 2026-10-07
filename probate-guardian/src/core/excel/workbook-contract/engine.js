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
//              exportIf?, keep?, defect? }
//            (a field's dir and defect may be functions of the slot's index:
//            the Simplified's Guardian #1 name is read but never written)
//   rows     a repeating schedule over pages of rows:
//            { kind: 'rows', path, pages: [{ sheet, rows }], columns, combined?,
//              blankLines?, present, capacity }
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
      const list = getPath(filing, entry.path) || [];
      entry.slots.forEach((cells, i) => {
        const row = list[i];
        if (entry.exportIf && !entry.exportIf(row, i, filing)) return;
        for (const [field, addr] of Object.entries(cells)) {
          const spec = entry.fields[field];
          if (!exports(perSlot(spec.dir, i))) continue;
          writeCell(workbook, io, entry.sheet, addr, spec.codec, (row || {})[field], filing);
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

function readField(workbook, entry) {
  const ws = workbook.getWorksheet(entry.sheet);
  if (!ws) return { present: false };
  let v = entry.codec.read(ws.getCell(entry.cell));
  for (const f of entry.fallback || []) {
    if (v !== '' && v != null) break;
    const fws = workbook.getWorksheet(f.sheet || entry.sheet);
    if (!fws) continue;
    const cell = fws.getCell(f.cell);
    if (f.unless && f.unless(cell)) continue;
    v = (f.codec || entry.codec).read(cell);
  }
  return { present: true, value: v };
}

/**
 * Reads `workbook` into a detached draft by the contract: the filing's
 * fields as the workbook has them, nothing more. A sheet the workbook
 * doesn't have contributes nothing.
 */
export function readContract(workbook, contract, ctx = {}) {
  const draft = {};
  for (const entry of contract.entries) {
    if (!imports(entry.dir)) continue;
    if (entry.kind === 'field') {
      const r = readField(workbook, entry);
      if (!r.present || (entry.keepIfBlank && (r.value === '' || r.value == null))) continue;
      setPath(draft, entry.path, entry.readAs ? entry.readAs(r.value, draft) : r.value);
    } else if (entry.kind === 'constant') {
      setPath(draft, entry.path, entry.value);
    } else if (entry.kind === 'slots') {
      const ws = workbook.getWorksheet(entry.sheet);
      if (!ws) continue;
      const rows = [];
      entry.slots.forEach((cells, i) => {
        const row = {};
        for (const [field, addr] of Object.entries(cells)) {
          const spec = entry.fields[field];
          if (!imports(perSlot(spec.dir, i))) continue;
          let v = spec.codec.read(ws.getCell(addr));
          for (const f of (spec.fallback ? spec.fallback(i) : [])) {
            if (v !== '' && v != null) break;
            const cell = ws.getCell(f.cell);
            if (f.unless && f.unless(cell)) continue;
            v = spec.codec.read(cell);
          }
          row[field] = v;
        }
        if (!entry.keep || entry.keep(row, i)) rows.push(row);
      });
      setPath(draft, entry.path, rows);
    } else if (entry.kind === 'rows') {
      const out = [];
      let any = false;
      for (const page of entry.pages) {
        const ws = workbook.getWorksheet(page.sheet);
        if (!ws) continue;
        any = true;
        for (const r of page.rows) {
          const row = {};
          for (const c of entry.columns) {
            if (!imports(c.dir)) continue;
            let v = c.codec.read(ws.getCell(cellRef(c.col, r + (c.line || 0))));
            // An older line the field used to be written on (Inventory B-4's
            // account number, before Milestone 60K).
            for (const f of c.fallback || []) {
              if (v !== '' && v != null) break;
              v = c.codec.read(ws.getCell(cellRef(f.col || c.col, r + (f.line || 0))));
            }
            row[c.field] = v;
          }
          for (const x of entry.combined || []) {
            Object.assign(row, x.split(x.codec.read(ws.getCell(cellRef(x.col, r + (x.line || 0)))), { sheet: ws, row: r }));
          }
          if (!entry.present(row, { sheet: ws, row: r })) continue;
          out.push(entry.finish ? entry.finish(row) : row);
        }
      }
      if (any || entry.alwaysRead) setPath(draft, entry.path, out);
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
