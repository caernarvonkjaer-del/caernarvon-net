import { describe, expect, test } from 'vitest';
import { TAB_WARNING_TEXT, normalizeTabState, summarizePeerTabs } from '../../src/tab-state.js';

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

  // Milestone 51B: these four cases used to be asserted against an exported
  // isRiskyPeer(), which summarizePeerTabs() duplicated inline rather than
  // called -- so the export was dead and was deleted. The cases are real, and
  // three of them (hasActiveCase, TTL staleness, self-exclusion) were covered
  // nowhere else, so they are ported here to drive the live path instead of
  // being dropped with the function.
  test('treats active or dirty fresh peers as warning-worthy, and ignores stale or self tabs', () => {
    const now = 20000;
    const risky = (state) => summarizePeerTabs([state], 'self', now);

    expect(risky({ tabId: 'other', dirty: true, updatedAt: now }).shouldWarn).toBe(true);
    expect(risky({ tabId: 'other', hasActiveCase: true, updatedAt: now }).shouldWarn).toBe(true);

    // Past the heartbeat TTL: not a fresh peer at all, so neither risky nor
    // counted as another open tab.
    const stale = risky({ tabId: 'other', updatedAt: now - 16000, dirty: true });
    expect(stale.shouldWarn).toBe(false);
    expect(stale.hasOtherOpenTab).toBe(false);

    // This tab's own heartbeat is never a peer.
    const own = risky({ tabId: 'self', updatedAt: now, dirty: true });
    expect(own.shouldWarn).toBe(false);
    expect(own.hasOtherOpenTab).toBe(false);
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
