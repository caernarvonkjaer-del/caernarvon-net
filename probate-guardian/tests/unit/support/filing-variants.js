// The filings the completion and validator goldens are recorded over: each
// identity's blank filing, the browser suite's minimal valid overlays
// (tests/e2e/support/fixtures.ts), and variants that set or clear one field or
// row at a time -- the edge cases each rule's `filled`, `hasAny`,
// verified-empty and started-row tests turn on.
//
// Moved unchanged from tests/unit/completion-parity.spec.js by Milestone 73F
// part 1, so tests/unit/validator-engines.spec.js records over the same
// variants. `m` is { registry, guardianModel, fixtures }: the filing registry,
// the Inventory's model and the browser fixtures, loaded by the caller.

const json = (x) => JSON.parse(JSON.stringify(x));
const SAMPLE = { string: 'x', number: 5, boolean: true };

/** @returns {Generator<[string, Record<string, any>]>} [label, filing] pairs, each built fresh */
export function* filingsFor(type, m) {
  const blank = () => json(m.registry.initializeEmptyData(type));
  const normalized = () => json(m.registry.normalizeWardData(blank()));
  const overlay = m.fixtures.MINIMAL_VALID[type];
  const valid = overlay ? () => {
    const d = normalized();
    for (const [k, v] of Object.entries(json(overlay))) {
      d[k] = Array.isArray(v) && Array.isArray(d[k]) ? v.map((row, i) => (row && typeof row === 'object' ? { ...(d[k][i] || {}), ...row } : row))
        : (v && typeof v === 'object' && !Array.isArray(v) && d[k] && typeof d[k] === 'object') ? { ...d[k], ...v } : v;
    }
    return d;
  } : null;
  // Every blank answer answered: 'Yes' satisfies presence, the tri-state
  // checks and (compared with itself) date order, so from here clearing one
  // field at a time isolates each requirement -- the forms without an overlay
  // above get their "complete filing" this way.
  const saturate = (x) => {
    if (Array.isArray(x)) return x.map(saturate);
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, saturate(v)]));
    return x === '' || x === null || x === undefined ? 'Yes' : x;
  };
  const saturated = () => saturate(valid ? valid() : normalized());
  yield ['blank', blank()];
  yield ['normalized', normalized()];
  if (valid) yield ['minimal valid', valid()];
  yield ['saturated', saturated()];
  // From the saturated filing, clear each answer in turn, nested ones included.
  const leaves = (x, at = []) => (Array.isArray(x) || (x && typeof x === 'object')
    ? Object.entries(x).flatMap(([k, v]) => leaves(v, [...at, k])) : [at]);
  for (const at of leaves(saturated())) {
    const d = saturated();
    let o = d; for (const k of at.slice(0, -1)) o = o[k];
    const last = at[at.length - 1];
    o[last] = typeof o[last] === 'boolean' ? !o[last] : '';
    yield [`saturated: ${at.join('.')} cleared`, d];
  }
  for (const [label, base] of [['blank', normalized], ...(valid ? [['valid', valid]] : []), ['saturated', saturated]]) {
    const keys = Object.keys(base());
    for (const k of keys) {
      const v = base()[k];
      if (Array.isArray(v)) {
        const empty = base(); empty[k] = []; yield [`${label}: ${k} emptied`, empty];
        const row = v[0] && typeof v[0] === 'object' ? v[0] : { name: '' };
        for (const f of Object.keys(row)) {
          const one = base(); one[k] = [{ ...Object.fromEntries(Object.keys(row).map((x) => [x, ''])), [f]: SAMPLE.string }];
          yield [`${label}: ${k}[0] only ${f}`, one];
        }
        const full = base(); full[k] = [Object.fromEntries(Object.keys(row).map((x) => [x, SAMPLE.string])), { ...row }];
        yield [`${label}: ${k} one full row and one as seeded`, full];
      } else if (v && typeof v === 'object') {
        for (const f of Object.keys(v)) {
          const one = base(); one[k] = { ...v, [f]: typeof v[f] === 'boolean' ? !v[f] : (v[f] ? '' : SAMPLE.string) };
          yield [`${label}: ${k}.${f} toggled`, one];
        }
      } else {
        const set = base(); set[k] = typeof v === 'boolean' ? !v : (v === '' || v == null ? (typeof v === 'number' ? 1 : 'Yes') : '');
        yield [`${label}: ${k} ${v === '' || v == null ? 'answered' : 'cleared'}`, set];
      }
    }
    // The verified-empty declarations every Annual schedule and Part XI take.
    const ticked = base(); ticked.scheduleNoItems = Object.fromEntries(
      ['scha', 'schb1', 'schb2', 'schb3', 'schb4', 'schc', 'schd1', 'schd2', 'schd3', 'schd4', 'schd5', 'sche', 'schf1', 'schf2',
        'remuneration', 'p8', 'a-p8', ...(m.guardianModel.SCHEDULE_NAV_KEYS || [])].map((x) => [x, true]));
    yield [`${label}: every "no items" box ticked`, ticked];
  }
}
