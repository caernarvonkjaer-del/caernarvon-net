export const TAB_HEARTBEAT_TTL_MS = 15000;
export const TAB_WARNING_TEXT = 'Guardian Forms is already open in another tab. Save or close that tab before continuing here.';

function cleanString(value, maxLength = 120) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function normalizeTabState(input = {}, now = Date.now()) {
  const tabId = cleanString(input.tabId, 80);
  if (!tabId) return null;
  const activeCaseInput = input.activeCase && typeof input.activeCase === 'object' ? input.activeCase : null;
  const activeCase = activeCaseInput ? {
    wardId: cleanString(activeCaseInput.wardId, 80),
    wardName: cleanString(activeCaseInput.wardName, 120),
    caseNumber: cleanString(activeCaseInput.caseNumber, 80),
    inventoryType: cleanString(activeCaseInput.inventoryType, 80),
  } : null;
  const hasActiveCase = Boolean(input.hasActiveCase || (activeCase && (activeCase.wardId || activeCase.wardName || activeCase.caseNumber)));
  return {
    type: 'PG_TAB_STATE',
    tabId,
    status: input.status === 'closed' ? 'closed' : 'open',
    openedAt: Number.isFinite(input.openedAt) ? input.openedAt : now,
    updatedAt: Number.isFinite(input.updatedAt) ? input.updatedAt : now,
    hasActiveCase,
    activeCase: hasActiveCase ? activeCase : null,
    dirty: input.dirty === true,
    appVersion: cleanString(input.appVersion, 80),
  };
}

export function isFreshPeer(state, selfTabId, now = Date.now(), ttlMs = TAB_HEARTBEAT_TTL_MS) {
  const normalized = normalizeTabState(state, now);
  if (!normalized) return false;
  if (normalized.tabId === selfTabId) return false;
  if (normalized.status !== 'open') return false;
  return now - normalized.updatedAt <= ttlMs;
}

// Milestone 51B removed an exported isRiskyPeer() from here. Nothing called it:
// summarizePeerTabs() below duplicates its predicate inline at the point where
// it has already normalized the state and confirmed freshness, so calling the
// export would have repeated both. The inline form is the better code and the
// export was the redundant half. Its four test cases were ported onto
// summarizePeerTabs() in tab-state.spec.js rather than deleted -- three of them
// (hasActiveCase, TTL staleness, self-exclusion) were covered nowhere else.
export function summarizePeerTabs(states, selfTabId, now = Date.now(), ttlMs = TAB_HEARTBEAT_TTL_MS) {
  const freshPeers = [];
  const riskyPeers = [];
  for (const state of states || []) {
    const normalized = normalizeTabState(state, now);
    if (!normalized || !isFreshPeer(normalized, selfTabId, now, ttlMs)) continue;
    freshPeers.push(normalized);
    if (normalized.dirty || normalized.hasActiveCase) riskyPeers.push(normalized);
  }
  return {
    freshPeers,
    riskyPeers,
    hasOtherOpenTab: freshPeers.length > 0,
    shouldWarn: riskyPeers.length > 0,
    warningText: riskyPeers.length > 0 ? TAB_WARNING_TEXT : '',
  };
}
