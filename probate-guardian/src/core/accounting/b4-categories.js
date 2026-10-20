// Milestone 76I item 3: Schedule B-4's categories, as the Clerk's Annual
// workbook totals them. Each register page totals its rows through a hidden
// grid of IF(E20="Accounting",I20,0) formulas, one per category; a row whose
// category is none of these is counted in the page's own total (I45) and in
// the PDF, but in none of the category totals Part VI reads -- so the filed
// workbook disagreed with itself and with the PDF. The same 18 the pages
// offer (annual-accounting/index.js, pdf-model.js's DISB_CATS).

export const B4_CATEGORIES = Object.freeze([
  'Accounting', 'Bank Service Charges', 'Care Facility', 'Clothing / Personal Needs', 'Entertainment / Travel',
  'Food / Meals', 'Insurance: Automobile / Property', 'Insurance: Health / Life', 'Medical / Pharmacy', 'Mortgage',
  'Nurse / Care Giver / Employer Tax', 'Other Legal Expenses', 'Rent', 'Repairs / Maintenance', 'Taxes: Income',
  'Taxes: Intangible', 'Utilities', 'Other',
]);

const key = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const BY_KEY = new Map(B4_CATEGORIES.map((c) => [key(c), c]));

/**
 * The category as the workbook spells it, when `text` is one of the 18 but
 * for case or spacing ("medical /  pharmacy " is "Medical / Pharmacy");
 * otherwise `text` as it was. Excel's comparison ignores case but not a
 * trailing space, so an imported "Rent " was totalled nowhere.
 * @param {unknown} text
 */
export function canonicalB4Category(text) {
  if (typeof text !== 'string') return text;
  return BY_KEY.get(key(text)) || text;
}

/** Whether the workbook totals a row with this category. */
export const isB4Category = (text) => B4_CATEGORIES.includes(text);
