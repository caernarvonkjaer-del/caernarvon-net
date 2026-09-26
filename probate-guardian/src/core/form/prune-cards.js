// Centralized prune engine for empty schedule entries, party cards, and plan repeatable rows.
//
// A card the filer added and never touched disappears when they leave the page
// (the router and the dashboard entry run pruneBlankCards()). Milestone 70's
// 70C gave this module the schedule table it used to read off window
// (BLANK_SCHEDULE_ENTRY, moved from legacy-app.js) and made its callers import
// it: before that, on this branch nothing loaded the module, so the clean-up
// never ran -- the defect master fixed in b28bf25, carried here.
import { mk } from '../filing/models/guardian.js';
import { formEngine } from '../filing/filing-registry.js';
import { getD } from '../state.js';

// Financial line-item schedules covered by pruneBlankCards() (the router runs
// it on leaving a page), keyed by their property on D, each mapped to the exact blank
// object its own +Add button pushes. These need a deep compare against that
// template rather than a generic emptiness test, because several of their
// fields default to something other than '' -- Guardian's wardPercent
// starts at 100, Annual's Yes/No fields start at 'No' -- and a generic test
// would never recognize those as untouched. Party and plan cards, whose
// fields are all seeded empty, use BLANK_CARD_COLLECTIONS below instead.
export const BLANK_SCHEDULE_ENTRY = {
  // Guardian form (Initial Inventory) -- same factory addEntry() already uses.
  scheduleA1:mk.a1, scheduleA2:mk.a2, scheduleB1:mk.b1, scheduleB2:mk.b2, scheduleB3:mk.b3,
  scheduleB4:mk.b4, scheduleC1:mk.c1, scheduleC2:mk.c2, scheduleC3:mk.c3, scheduleC4:mk.c4, scheduleC5:mk.c5,
  // Annual Accounting -- copied verbatim from each schedule's own +Add button.
  schA:()=>({payer:'',description:'',bank:'',accountNo:'',amount:''}),
  schB1:()=>({bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''}),
  schB2:()=>({bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''}),
  schB3:()=>({bankAcct:'',checkNo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''}),
  schB4:()=>({bankAccountId:'',checkNo:'',datePaid:'',category:'',payee:'',amount:''}),
  schC:()=>({description:'',date:'',gain:'',loss:''}),
  schD1:()=>({description:'',accountNo:'',restricted:'',type:'',fullAmount:'',wardPct:'',restrictedAmt:''}),
  schD2:()=>({description:'',residence:'',income:'',fullValue:'',wardPct:'',carryingValue:'',wardValue:''}),
  schD3:()=>({description:'',fullAmount:'',wardPct:'',carryingValue:'',wardAmount:''}),
  schD4:()=>({description:'',restricted:'',fullAmount:'',wardPct:'',carryingValue:'',wardValue:'',restrictedAmt:''}),
  schD5:()=>({description:'',loanNo:'',loanType:'',fullDebt:'',wardPct:'',wardBalance:''}),
  schE:()=>({bankName:'',transferInDate:'',transferInAmt:'',transferOutDate:'',transferOutAmt:''}),
  schF1:()=>({description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''}),
  schF2:()=>({description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''}),
};

export const BLANK_CARD_COLLECTIONS = {
  guardians: { min: 1, types: ['guardian', 'annual', 'simplified'] },
  serviceRecipients: { min: 1, types: ['guardian'] },
  witnesses: { min: 0, types: ['guardian'] },
  // Milestone 68C: the four Plans carry the accountings' recipient shape.
  certRecipients: { min: 1, types: ['annual', 'simplified', 'planAnnual', 'planSimplified', 'planInitial', 'planMinor'] },
  remuneration: { min: 0, types: ['annual', 'simplified'] },
  // Plan-family repeatable rows, each already served by +Add/Remove.
  q1Residences: { min: 0, types: ['planAnnual'] },
  q4Providers: { min: 0, types: ['planAnnual'] },
  q10Directives: { min: 0, types: ['planAnnual'] },
  // Milestone 37-4: Initial Plan gained a real +Add/Remove affordance for
  // this collection (see pagePlanIDirectives()); excluded before that
  // existed, per this table's own rule above.
  q11Directives: { min: 0, types: ['planInitial'] },
  q9Providers: { min: 0, types: ['planInitial'] },
  q2Residences: { min: 0, types: ['planMinor'] },
  q3Providers: { min: 0, types: ['planMinor'] },
};

/**
 * Checks if a card is completely blank (all fields are null, undefined, '', false, or empty array).
 * Note: 0 is treated as a valid non-empty number.
 */
export function isBlankCard(card) {
  if (!card || typeof card !== 'object') return false;
  const values = Object.values(card);
  if (!values.length) return false;
  return values.every(v => v === null || v === undefined || v === '' || v === false || (Array.isArray(v) && !v.length));
}

/**
 * Deep-equals a schedule's own template from BLANK_SCHEDULE_ENTRY.
 */
export function isBlankScheduleEntry(key, entry, registry = BLANK_SCHEDULE_ENTRY) {
  if (!registry) return false;
  const template = registry[key];
  if (!template || !entry || typeof entry !== 'object') return false;
  const blank = template();
  for (const k of new Set([...Object.keys(blank), ...Object.keys(entry)])) {
    if (entry[k] !== blank[k]) return false;
  }
  return true;
}

/**
 * Drops every card the user left completely untouched across schedules and party cards.
 * Returns the count of removed cards.
 */
export function pruneBlankCards(targetData, targetType) {
  const data = targetData || (typeof window !== 'undefined' ? getD() : null);
  if (!data) return 0;
  // The filing's own type. (This read window.activeInventoryType until
  // Milestone 70's 70C -- the same value for the open filing, which is the one
  // the callers prune.)
  const activeType = targetType || data.inventoryType;
  const engine = formEngine(activeType);
  let removed = 0;

  for (const key of Object.keys(BLANK_SCHEDULE_ENTRY)) {
    const arr = data[key];
    if (!Array.isArray(arr) || !arr.length) continue;
    const kept = arr.filter(e => !isBlankScheduleEntry(key, e, BLANK_SCHEDULE_ENTRY));
    if (kept.length !== arr.length) {
      removed += arr.length - kept.length;
      data[key] = kept;
    }
  }

  for (const key of Object.keys(BLANK_CARD_COLLECTIONS)) {
    const spec = BLANK_CARD_COLLECTIONS[key];
    if (engine && spec.types && !spec.types.includes(engine)) continue;
    const arr = data[key];
    if (!Array.isArray(arr) || !arr.length) continue;
    const keep = [];
    arr.forEach((card, i) => { if (!isBlankCard(card)) keep.push(i); });
    for (let i = 0; i < arr.length && keep.length < spec.min; i++) {
      if (!keep.includes(i)) keep.push(i);
    }
    keep.sort((a, b) => a - b);
    if (keep.length === arr.length) continue;
    removed += arr.length - keep.length;
    data[key] = keep.map(i => arr[i]);
    if (key === 'guardians' && Array.isArray(data.guardianPartyIds)) {
      const ids = data.guardianPartyIds;
      data.guardianPartyIds = keep.map(i => ids[i] || null);
    }
  }

  if (removed && typeof window !== 'undefined' && window.autoSave) {
    window.autoSave();
  }
  return removed;
}
