// Milestone 74P: two entry helpers on the Initial Inventory (QA report UX-08,
// UX-09). Neither computes a figure the filer files without being asked:
//
//   - C-1's yearly total (decision 74P-1, approved by name under AGENTS.md
//     section 5): the Clerk's C-1 asks for the Annual Income Amount "regardless
//     of the frequency of payments" and computes no annual figure itself. The
//     helper multiplies a payment by the payments in a year -- Monthly 12,
//     Quarterly 4, Semi-Annually 2, Annually 1 -- and fills the box only when
//     the filer presses "Use"; for Other, or no frequency, it offers nothing.
//   - A C-5 row from an asset the ward owns jointly (74P-2): on an A-1 to B-4
//     row whose ward's share is below 100%, "Add a joint owner for this asset"
//     adds a C-5 row naming the source as the workbook's own example does
//     ("Schedule A-1, Item 1"), with its full value. The joint owner's share
//     is left blank (73B) and nothing links the two rows afterwards.
//
// Pure: the Inventory's page draws and wires them (guardian-inventory/
// index.js, form-binding.js).
import { amountForStore } from './amount-codec.js';
import { vehicleDescription } from '../filing/models/guardian.js';

/** Payments in a year, by the C-1 Frequency the page offers; Other has none. */
export const PAYMENTS_PER_YEAR = Object.freeze({ Monthly: 12, Quarterly: 4, 'Semi-Annually': 2, Annually: 1 });

/** How many payments a year the frequency means, or 0 when the helper offers nothing. */
export function paymentsPerYear(frequency) {
  return PAYMENTS_PER_YEAR[frequency] || 0;
}

/**
 * The yearly total for a payment typed as the amount boxes read it ("$1,850",
 * "(50)" and so on, amount-codec.js), rounded to cents, or null when there is
 * nothing to propose: no frequency it can count, or no readable amount.
 * @param {unknown} paymentText
 * @param {string} frequency
 * @returns {number|null}
 */
export function yearlyTotal(paymentText, frequency) {
  const times = paymentsPerYear(frequency);
  if (!times) return null;
  const amount = amountForStore(String(paymentText ?? ''));
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
  return Math.round(amount * times * 100) / 100;
}

/** The A-1 to B-4 schedules a joint owner can be added from: the workbook label, the description and the full value. */
export const JOINT_OWNER_SOURCES = Object.freeze({
  scheduleA1: { label: 'A-1', description: (r) => r.propertyDescription, value: 'fullAssetValue' },
  scheduleA2: { label: 'A-2', description: (r) => r.lenderName, value: 'fullDebtBalance' },
  scheduleB1: { label: 'B-1', description: (r) => r.institutionName, value: 'fullAssetAmount' },
  scheduleB2: { label: 'B-2', description: (r) => (r.isVehicle ? vehicleDescription(r) : r.description), value: 'fullAssetValue' },
  scheduleB3: { label: 'B-3', description: (r) => r.description, value: 'fullAssetValue' },
  scheduleB4: { label: 'B-4', description: (r) => r.lenderName, value: 'fullLiabilityBalance' },
});

/** Whether the row's ward's share is a number from 0 up to, not including, 100. */
export function offersJointOwner(row) {
  const raw = row?.wardPercent;
  if (raw === '' || raw == null) return false;
  const share = typeof raw === 'number' ? raw : Number(String(raw).trim());
  return Number.isFinite(share) && share >= 0 && share < 100;
}

/**
 * The C-5 fields for a joint owner of the source row: the description naming
 * the source as the workbook's example does ("Schedule A-1, item 1") -- with
 * "Item" capitalized, as C-5's description box formats it, so the box and the
 * filed document read the same -- then the asset ("Schedule A-1, Item 1 —
 * Family Home"), and the source's full value. Everything else -- the owner,
 * their share -- is left for the filer.
 * @param {string} listKey  scheduleA1 ... scheduleB4
 * @param {Record<string, any>} row
 * @param {number} index  the row's place in its schedule, from 0
 */
export function jointOwnerRowFrom(listKey, row, index) {
  const source = JOINT_OWNER_SOURCES[listKey];
  if (!source || !row) return null;
  const description = String(source.description(row) ?? '').trim();
  const value = row[source.value];
  return {
    assetDescription: `Schedule ${source.label}, Item ${index + 1}${description ? ` — ${description}` : ''}`,
    totalAssetValue: value === '' || value == null ? 0 : value,
  };
}
