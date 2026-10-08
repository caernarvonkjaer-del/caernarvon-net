// Money arithmetic and display shared by the filing forms. Milestone 70's 70B
// gathered these here: n() and r2() from src/features/guardian-inventory/totals.js
// (which re-exports them, so its importers are unchanged), and fmt() and
// formatDashboardCurrency() from src/legacy-app.js. Annual Accounting's
// importer used a local copy of r2() (master's 945b5a8) -- the same formula for
// the numbers it passes -- and imports this one now.

/** Numeric coercion: blank, null, and unparseable all read as 0. */
export function n(v) {
  const num = parseFloat(v);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Milestone 71E: the one way a money figure becomes cents -- the rule the
 * Clerk's own workbooks display, measured in Microsoft Excel by 71A
 * (MILESTONE-71-PROPOSAL.md, Appendix B: 3,480 controlled cases and every
 * money cell of three real exports, no disagreement). Take the value's
 * 15-significant-digit decimal form, then round THAT decimal -- never the
 * binary product -- to two places, half away from zero. So 797229.1849999999
 * is 797,229.19 (as Excel shows it), 1.005 is 1.01, -1.005 is -1.01.
 *
 * The app used three rules before this and they disagreed on exactly these
 * values: Math.round(x*100)/100 (1.005 -> 1.00, -1.005 -> -1.00),
 * toLocaleString (797229.1849999999 -> .18) and toFixed(2) (2.675 -> 2.67). The
 * QA filing printed Line 20 $797,229.19 beside Line 30 $797,229.18 and called
 * them equal.
 *
 * Returns { negative, whole, cents }: `whole` a BigInt-safe digit string,
 * `cents` two digits. A figure that rounds to zero is never negative.
 */
function centsParts(v) {
  const x = n(v);
  let s = x.toPrecision(15);
  // Exponent form (from 1e15 up, and tiny values): move the decimal point in
  // the 15-digit string itself. Going back through a Number would bring the
  // binary value's extra digits with it (1.23456789012346e+18 -> ...460096).
  const e = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/i.exec(s);
  if (e) {
    const digits = e[2] + (e[3] || '');
    const point = 1 + Number(e[4]);
    s = e[1] + (point <= 0 ? `0.${'0'.repeat(-point)}${digits}`
      : point >= digits.length ? digits + '0'.repeat(point - digits.length)
        : `${digits.slice(0, point)}.${digits.slice(point)}`);
  }
  let negative = s.startsWith('-');
  if (negative) s = s.slice(1);
  const [int, frac = ''] = s.split('.');
  const f = (frac + '000').slice(0, 3);
  let total = BigInt(int || '0') * 100n + BigInt(f.slice(0, 2));
  if (Number(f[2]) >= 5) total += 1n;
  if (total === 0n) negative = false;
  return { negative, whole: (total / 100n).toString(), cents: String(total % 100n).padStart(2, '0') };
}

/** Milestone 71E: a money figure rounded to cents by the workbook's rule (above), as a number. */
export function roundCents(v) {
  const { negative, whole, cents } = centsParts(v);
  return Number(`${negative ? '-' : ''}${whole}.${cents}`);
}

/**
 * Milestone 71E: the one money formatter. Rounds by roundCents()'s rule and
 * prints those digits directly (the binary result is never re-rounded).
 * `style` keeps each surface's established look:
 *   'plain'        1,234.56   -1,234.56
 *   'dollar'       $1,234.56  $-1,234.56   (Annual/Simplified PDF bodies)
 *   'parens'       1,234.56   (1,234.56)   (Annual screens)
 *   'dollarParens' $1,234.56  ($1,234.56)  (Simplified screens, dashboard)
 *   'signFirst'    $1,234.56  -$1,234.56   (Inventory PDF, fmt())
 * `grouping: false` omits the thousands separators.
 */
export function formatMoney(v, { style = 'plain', grouping = true } = {}) {
  const { negative, whole, cents } = centsParts(v);
  const body = `${grouping ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : whole}.${cents}`;
  switch (style) {
    case 'dollar': return `$${negative ? '-' : ''}${body}`;
    case 'parens': return negative ? `(${body})` : body;
    case 'dollarParens': return negative ? `($${body})` : `$${body}`;
    case 'signFirst': return `${negative ? '-' : ''}$${body}`;
    default: return `${negative ? '-' : ''}${body}`;
  }
}

/**
 * Round to cents. For DISPLAY of an aggregate, never for intermediate sums.
 * Milestone 71E: now roundCents() under its old name, so its callers keep
 * working and round the way the Clerk's workbook displays.
 */
export function r2(v) {
  return roundCents(v);
}

/**
 * The ward's share of a full figure at a percentage expressed 0-100, at full
 * precision. A blank or unreadable percentage is 0%, exactly what a blank
 * Ward's % cell produces in the court's workbooks (`=G17*H17`, `=H25*I25`
 * with the share cell empty is 0) -- never silently the whole asset.
 *
 * Milestone 71D moved this here from src/features/guardian-inventory/totals.js
 * (which re-exports it) so the Annual, Final and Trust Accountings use the
 * same rule: their pct() read a blank share as 100% for the on-screen totals
 * and Line 30 while their D-1/D-5 PDF rows read it as 0%, so a filing exported
 * through the override printed a column that did not add up (decision D3).
 */
export function wardShare(full, percent) {
  return n(full) * (n(percent) / 100);
}

/**
 * How a Ward's % prints on a filed page: the number the filer entered, as
 * `50%`; a blank or unreadable share as "—" -- never a figure the filer did not
 * enter. (Milestone 71D: all six Annual share columns printed a blank share as
 * "100%", beside a Ward's Amount that counted it as 0%.)
 */
export function formatShare(v) {
  if (v === '' || v === null || v === undefined) return '—';
  if (typeof v === 'number') return Number.isFinite(v) ? `${v}%` : '—';
  const s = String(v).trim();
  return s !== '' && Number.isFinite(Number(s)) ? `${s}%` : '—';
}

/**
 * US-dollar display ($1,234.56, negatives ($1,234.56)); blank and null print as
 * $0.00. Milestone 71E: rounded by formatMoney()'s rule, not Intl's.
 * Milestone 73H (decision 73H-1): the one negative style -- it printed
 * -$1,234.56 on the Inventory's screens. amount-codec.js's presentAmount() is
 * the same thing under the codec's name.
 */
export const fmt = (v)=>formatMoney(v, { style: 'dollarParens' });

/** The dashboard's and sidebar's figure: ($1,234.56) for a negative, "—" for none. */
export function formatDashboardCurrency(v){
  if(v===null||v===undefined)return '—';
  return formatMoney(v, { style: 'dollarParens' });
}
