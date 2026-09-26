// Milestone 38D / 44B: Shared Excel Capacity Calculations and Typed Issues
import { createIssue } from '../validation/issue-registry.js';
import { getD } from '../state.js';

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
