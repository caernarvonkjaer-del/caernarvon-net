import { isFilingEligibleSupplement, resolveActiveDocPeriod } from '../pdf/supplemental-pdf.js';

// These are the financial schedules with an entry collection and an upload
// section. Narrative plan pages intentionally have no evidence gate.
export const FINANCIAL_SCHEDULE_COLLECTIONS = Object.freeze({
  guardian: Object.freeze({
    a1: 'scheduleA1', a2: 'scheduleA2', b1: 'scheduleB1', b2: 'scheduleB2',
    b3: 'scheduleB3', b4: 'scheduleB4', c1: 'scheduleC1', c2: 'scheduleC2',
    c3: 'scheduleC3', c4: 'scheduleC4', c5: 'scheduleC5',
  }),
  annual: Object.freeze({
    schA: 'schA', schB1: 'schB1', schB2: 'schB2', schB3: 'schB3',
    schB4: 'schB4', schC: 'schC', schD1: 'schD1', schD2: 'schD2',
    schD3: 'schD3', schD4: 'schD4', schD5: 'schD5', schE: 'schE',
    schF1: 'schF1', schF2: 'schF2',
  }),
});

export function scheduleEvidenceFamily(inventoryType) {
  if (inventoryType === 'guardian') return 'guardian';
  if (['annual', 'finalAccounting', 'trustAccounting'].includes(inventoryType)) return 'annual';
  return '';
}

export function scheduleEvidenceState(data, inventoryType, scheduleKey) {
  const family = FINANCIAL_SCHEDULE_COLLECTIONS[scheduleEvidenceFamily(inventoryType)] || {};
  const canonicalKey = Object.keys(family).find(k => k.toLowerCase() === String(scheduleKey || '').toLowerCase()) || scheduleKey;
  const collection = family[canonicalKey];
  if (!collection) return { applies: false, entered: false, satisfied: true };
  const entered = Array.isArray(data?.[collection]) && data[collection].length > 0;
  const period = resolveActiveDocPeriod(data);
  const value = data?.scheduleDocs?.[canonicalKey] || data?.scheduleDocs?.[scheduleKey];
  const slot = value && (Array.isArray(value.files) ? value : value[period]);
  const eligible = Array.isArray(slot?.files)
    && slot.files.some(file => isFilingEligibleSupplement(file).eligible);
  const override = slot?.evidenceOverride === true;
  return { applies: true, entered, eligible: !!eligible, override, satisfied: !entered || !!eligible || override };
}

export function missingScheduleEvidence(data, inventoryType) {
  const keys = Object.keys(FINANCIAL_SCHEDULE_COLLECTIONS[scheduleEvidenceFamily(inventoryType)] || {});
  return keys.filter(key => !scheduleEvidenceState(data, inventoryType, key).satisfied);
}
