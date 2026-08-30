import { describe, expect, test } from 'vitest';
import { TAB_WARNING_TEXT, isRiskyPeer, normalizeTabState, summarizePeerTabs } from '../../src/tab-state.js';

describe('tab-state helpers', () => {
  test('normalizes only browser-local, safe case identity fields', () => {
    const state = normalizeTabState({
      tabId: 'tab-a',
      dirty: true,
      activeCase: {
        wardId: 'ward-1',
        wardName: ' Test Ward ',
        caseNumber: '2026-CP-000123',
        inventoryType: 'guardian',
        ssn: '123-45-6789',
      },
    }, 1000);

    expect(state).toMatchObject({
      tabId: 'tab-a',
      dirty: true,
      hasActiveCase: true,
      activeCase: {
        wardId: 'ward-1',
        wardName: 'Test Ward',
        caseNumber: '2026-CP-000123',
        inventoryType: 'guardian',
      },
    });
    expect(state.activeCase.ssn).toBeUndefined();
  });

  test('treats active or dirty fresh peers as warning-worthy', () => {
    const now = 20000;
    expect(isRiskyPeer({ tabId: 'other', dirty: true, updatedAt: now }, 'self', now)).toBe(true);
    expect(isRiskyPeer({ tabId: 'other', hasActiveCase: true, updatedAt: now }, 'self', now)).toBe(true);
    expect(isRiskyPeer({ tabId: 'other', updatedAt: now - 16000, dirty: true }, 'self', now)).toBe(false);
    expect(isRiskyPeer({ tabId: 'self', updatedAt: now, dirty: true }, 'self', now)).toBe(false);
  });

  test('summarizes clean second tabs separately from risky tabs', () => {
    const now = 30000;
    const clean = summarizePeerTabs([{ tabId: 'other', updatedAt: now }], 'self', now);
    expect(clean.hasOtherOpenTab).toBe(true);
    expect(clean.shouldWarn).toBe(false);

    const dirty = summarizePeerTabs([{ tabId: 'other', updatedAt: now, dirty: true }], 'self', now);
    expect(dirty.shouldWarn).toBe(true);
    expect(dirty.warningText).toBe(TAB_WARNING_TEXT);
  });
});
