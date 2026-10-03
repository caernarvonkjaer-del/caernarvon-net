// An Activity Log entry is filed under the filing it is about.
//
// appendAuditLogEntry() tagged every entry with the open filing, replacing the
// one a caller named. Syncing a closed filing from Manage Shared Records logs
// about that closed filing while another is open, so the entry was filed under
// the open one: that filing's single-filing export carried an entry about a
// different filing (its ward's name included), and the closed filing's own
// export missed it. Found in Milestone 71's review, listed out of scope by
// Milestone 72, fixed 2026-10-03 at the requester's decision. The real
// click-through is in tests/e2e/closed-filing-sync.spec.ts.
//
// Red-first: against the previous audit-log.js the first test fails (the
// entry reads the open filing, w-2) and the export test fails both ways.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import JSZip from 'jszip';
import { auditLog, loadAuditLogEntries, replaceAuditLog } from '../../src/core/activity/audit-log.js';
import { buildSingleWardExportBlob } from '../../src/core/persistence/case-file.js';
import { getSecurityMode, setSecurityMode } from '../../src/core/persistence/crypto.js';
import { replaceCaseFile } from '../../src/core/state.js';

vi.mock('../../src/core/navigation/tab-state.js', () => ({ notifyProbateGuardianTabStateChanged: () => {}, getProbateGuardianTabState: () => ({}) }));
vi.mock('../../src/core/shell/sidebar.js', () => ({ refreshWardInfoCard: () => {}, syncActiveWardNameDisplay: () => {}, syncGuardianNameDisplay: () => {}, updateSidebar: () => {} }));

const caseWith = (activeWardId) => replaceCaseFile({
  activeWardId, guardianName: 'G', guardianEmail: '', parties: [], cases: [], dismissedPartyPairs: [],
  wards: [
    { wardId: 'w-1', wardName: 'Closed One', caseNumber: '1', archived: true },
    { wardId: 'w-2', wardName: 'Open Two', caseNumber: '2' },
  ],
});
const tagOf = async (eventType) => (await loadAuditLogEntries()).find((e) => e.eventType === eventType)?.wardId;

let priorMode;
beforeEach(() => {
  priorMode = getSecurityMode();
  setSecurityMode('none');
  replaceAuditLog([]);
});
afterEach(() => {
  setSecurityMode(priorMode);
  replaceAuditLog([]);
  vi.unstubAllGlobals();
});

describe('which filing an entry is filed under', () => {
  test('an entry that names its filing keeps it, whichever filing is open', async () => {
    caseWith('w-2');
    await auditLog('PARTY_SYNC', 'Synced Ward on closed filing "Closed One" with its shared record', true, 'w-1');
    expect(await tagOf('PARTY_SYNC')).toBe('w-1');
  });

  test('an entry that names none is filed under the open filing, as before', async () => {
    caseWith('w-2');
    await auditLog('UNLOCK_SUCCESS', 'unlocked', true);
    expect(await tagOf('UNLOCK_SUCCESS')).toBe('w-2');
  });

  test('with no filing open and none named, it is filed under none', async () => {
    caseWith(null);
    await auditLog('UNLOCK_SUCCESS', 'unlocked', true);
    expect(await tagOf('UNLOCK_SUCCESS')).toBeUndefined();
  });
});

describe('a single-filing export', () => {
  const exportedTypes = async (wardId) => {
    const zip = await JSZip.loadAsync(await (await buildSingleWardExportBlob(wardId)).arrayBuffer());
    const raw = await zip.file('auditLog.enc').async('string');
    return JSON.parse(raw.replace(/^PLAIN:/, '')).map((e) => e.eventType);
  };

  test('carries the entries about that filing, and none about another', async () => {
    // The export reads JSZip from the page, as the browser build provides it.
    vi.stubGlobal('window', { ...(globalThis.window || {}), JSZip });
    caseWith('w-2');
    await auditLog('PARTY_SYNC', 'Synced Ward on closed filing "Closed One" with its shared record', true, 'w-1');
    await auditLog('OPEN_TWO_EVENT', 'about the open filing', true);
    expect(await exportedTypes('w-1')).toEqual(['PARTY_SYNC']);
    expect(await exportedTypes('w-2')).toEqual(['OPEN_TWO_EVENT']);
  });
});
