// Milestone 38D / 44B: Shared Excel Capacity Calculations and Typed Issues
import { createIssue } from '../validation/issue-registry.js';
import { getD } from '../state.js';
import { esc } from '../filing/escape-html.js';
import { ic } from '../ui/icons.js';

export function checkExcelCapacity(caps, sourceData) {
  const d = sourceData || (typeof window !== 'undefined' ? getD() : null);
  const over = [];
  if (!d || !caps || typeof caps !== 'object') return over;
  for (const key of Object.keys(caps)) {
    const info = caps[key];
    if (!info || typeof info !== 'object') continue;
    const list = Array.isArray(d[key]) ? d[key] : [];
    // Remuneration is filtered before writing, so only rows with content
    // actually consume a slot. Every other schedule writes each array
    // element positionally, blank or not.
    const count = typeof info.isPopulated === 'function'
      ? list.filter(info.isPopulated).length
      : key === 'remuneration'
        ? list.filter(r => r && (r.guardian || r.type || r.amount || r.description)).length
        : list.length;
    if (count > info.cap) {
      over.push({
        key,
        label: info.label || key,
        route: info.route || '',
        cap: info.cap,
        count,
        // Milestone 58D: present only for a schedule the workbook cannot
        // represent at all, as opposed to one that ran out of rows.
        unsupported: info.unsupported || '',
      });
    }
  }
  return over;
}

export function getExcelCapacityIssues(inventoryType, data, caps) {
  const over = checkExcelCapacity(caps, data);
  const type = inventoryType || data?.inventoryType || 'filing';
  return over.map(o => {
    const code = `excel.capacity.${type}.${o.key}`;
    const issue = createIssue(code, {
      // Milestone 58D: a schedule the workbook cannot represent AT ALL reads
      // differently from one that simply ran out of rows. "Part XI —
      // Remuneration: 3 entries (template holds 0)" is accurate but tells the
      // filer nothing they can act on, and implies a bigger template would
      // help. `unsupported` supplies wording that names the way forward.
      message: o.unsupported
        ? `${o.label}: ${o.unsupported}`
        : `${o.label}: ${o.count} entries (template holds ${o.cap})`,
      label: o.label,
      section: o.label,
      path: o.key,
      route: o.route,
    });
    Object.defineProperty(issue, 'toString', { value() { return this.message; }, enumerable: false });
    return issue;
  });
}

// Milestone 70, 70F: the capacity panel Print Preview shows when a schedule
// has more rows than the court's workbook holds (moved from legacy-app.js).
export function excelCapacityPanel(over){
  // Milestone 64B-2, item 11 / D13. A cap entry may carry an `unsupported`
  // sentence instead of a row limit: Part XI is the case -- the court's
  // workbook has no entry area for it at all, so `cap` is 0 and the
  // count-of-cap shape rendered "2 of 0" with "2 entries would be left out",
  // which is both nonsense and an understatement (all of them are left out,
  // and not because a schedule filled up). Those entries show the same
  // sentence the blocking issue uses and no count badge; a genuine row
  // overflow is unchanged.
  const rows=over.map(o=>{
    const badge=o.unsupported?'':`<span class="validation-count">${o.count} of ${o.cap}</span>`;
    const detail=o.unsupported
      ?esc(o.unsupported)
      :`${o.count-o.cap} entr${o.count-o.cap===1?'y':'ies'} would be left out of the Excel file`;
    return `<div class="validation-group">
      <div class="validation-group-head">
        <span class="validation-group-name">${esc(o.label)}</span>
        ${badge}
        <button type="button" class="validation-go" data-form-action="navigate" data-route="${esc(o.route)}">Go to section ${ic('external',13)}</button>
      </div>
      <div class="validation-fields"><span class="validation-field">${detail}</span></div>
    </div>`;
  }).join('');
  // The heading is panel wording too (D13): "Too many entries" contradicts an
  // item reporting that the workbook has no entry area at all. When a real
  // row overflow is also present the heading is accurate for that part, so it
  // only changes when every entry is an unsupported schedule.
  const allUnsupported=over.length>0&&over.every(o=>o.unsupported);
  const title=allUnsupported
    ?"The Excel template cannot carry part of this filing"
    :'Too many entries for the Excel template';
  const sub=allUnsupported
    ?`<strong>Save as PDF instead</strong> — the PDF includes every entry, in full.`
    :`The court's Excel form has a fixed number of rows per schedule, and these have more entries than will fit. <strong>Save as PDF instead</strong> — the PDF includes every entry. To use Excel, reduce these schedules or file the extras on a continuation sheet.`;
  return `<div class="validation-panel excel-cap-panel no-print">
    <div class="validation-head">
      ${ic('alert',17)}
      <div>
        <div class="validation-title">${title}</div>
        <div class="validation-sub">${sub}</div>
      </div>
    </div>
    ${rows}
  </div>`;
}
