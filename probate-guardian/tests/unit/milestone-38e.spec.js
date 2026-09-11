import { describe, it, expect, beforeEach } from 'vitest';
import { setD } from '../../src/core/state.js';

describe('Milestone 38E — Tri-State Radio Migration & Normalization', () => {
  beforeEach(() => {
    setD({});
  });

  it('normalizes legacy boolean schedule properties in Guardian Inventory', () => {
    const legacyData = {
      inventoryType: 'guardian',
      scheduleA1: [{ isPersonalResidence: true, isIncomeProperty: false }],
      scheduleB1: [{ isRestricted: true }],
      scheduleB2: [{ inSafeDepositBox: true }],
      scheduleB3: [{ isRestricted: false, inSafeDepositBox: false }],
      hasSafeDepositBox: true,
      safeDepositBoxFiled: false,
      isAmended: true,
    };

    const win = typeof window !== 'undefined' ? window : globalThis;
    if (win && win.normalizeWardData) {
      const normalized = win.normalizeWardData(legacyData);
      expect(normalized.scheduleA1[0].residence).toBe('Yes');
      expect(normalized.scheduleA1[0].income).toBe('No');
      expect(normalized.scheduleB1[0].restricted).toBe('Yes');
      expect(normalized.scheduleB2[0].inSafeDepositBox).toBe('Yes');
      expect(normalized.scheduleB3[0].restricted).toBe('No');
      expect(normalized.scheduleB3[0].inSafeDepositBox).toBe('No');
      expect(normalized.hasSafeDepositBox).toBe('Yes');
      expect(normalized.safeDepositBoxFiled).toBe('No');
      expect(normalized.amendedForm).toBe('Yes');
    }
  });

  it('normalizes legacy benefits booleans in Annual Plan and Initial Plan', () => {
    const legacyData = {
      benefits: {
        socialSecurity: { eligible: true, appliedFor: false },
        medicaid: { eligible: false, appliedFor: true },
      },
      q7SocialSecurity: true,
      q7Medicare: false,
    };

    const win = typeof window !== 'undefined' ? window : globalThis;
    if (win && win.normalizeWardData) {
      const normalized = win.normalizeWardData(legacyData);
      expect(normalized.benefits.socialSecurity.eligible).toBe('Yes');
      expect(normalized.benefits.socialSecurity.appliedFor).toBe('No');
      expect(normalized.benefits.medicaid.eligible).toBe('No');
      expect(normalized.benefits.medicaid.appliedFor).toBe('Yes');
      expect(normalized.q7SocialSecurity).toBe('Yes');
      expect(normalized.q7Medicare).toBe('No');
    }
  });

  it('correctly calculates restricted and unrestricted assets with tri-state enum', () => {
    const win = typeof window !== 'undefined' ? window : globalThis;
    win.D = {
      scheduleB1: [
        { fullAssetAmount: '1000', wardPercent: '100', restricted: 'Yes' },
        { fullAssetAmount: '2000', wardPercent: '100', restricted: 'No' },
        { fullAssetAmount: '3000', wardPercent: '100', restricted: '' },
      ],
      scheduleB2: [],
      scheduleB3: [
        { fullAssetValue: '5000', wardPercent: '100', restricted: 'Yes' },
        { fullAssetValue: '4000', wardPercent: '100', restricted: 'No' },
      ],
      scheduleB4: [],
      scheduleA1: [],
      scheduleA2: [],
      scheduleC1: [],
      scheduleC2: [],
      scheduleC3: [],
      scheduleC4: [],
      scheduleC5: [],
    };

    if (win.calc) {
      expect(win.calc.restrictedCash()).toBe(1000);
      expect(win.calc.unrestrictedCash()).toBe(5000); // 2000 (No) + 3000 (Unanswered)
      expect(win.calc.restrictedIntang()).toBe(5000);
      expect(win.calc.unrestrictedIntang()).toBe(4000);
    }
  });
});
