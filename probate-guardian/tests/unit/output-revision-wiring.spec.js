// Milestone 38D / 44B follow-up: proves the mutation-boundary wiring the
// original spec calls for actually invalidates an acknowledgement, rather
// than trusting markFilingRevisionChanged()'s own isolated unit tests (which
// only prove the function works, not that anything real calls it). Each test
// here reproduces the exact failure mode a missing hook would cause: a filer
// acknowledges an incomplete-but-bypassable filing, then performs one real
// mutation, and the acknowledgement must no longer be valid.
import { describe, it, expect, beforeEach, vi } from 'vitest';

// The sidebar marks are src/core/status/nav-marks.js's since Milestone 70's 70F
// (the tail called window.updateNavDots?.(), which Node did not have); they
// need a page, so this suite stands them in, as a module mock.
vi.mock('../../src/core/status/nav-marks.js', () => ({ updateNavDots: () => {} }));
// The sidebar's refreshes (src/core/shell/sidebar.js since Milestone 70's 70H) touch the page.
vi.mock('../../src/core/shell/sidebar.js', () => ({ refreshWardInfoCard: () => {}, syncActiveWardNameDisplay: () => {}, syncGuardianNameDisplay: () => {}, updateSidebar: () => {} }));

globalThis.window = globalThis.window || {};
const {
  clearOutputAcknowledgement,
  markFilingRevisionChanged,
  acknowledgeOutstandingRequirements,
  isOutputAcknowledgedFor,
} = await import('../../src/core/filing/output-authorization.js');
const { createRequiredIssue } = await import('../../src/core/validation/issue-registry.js');
const { runFieldWriteSideEffects } = await import('../../src/core/form/form-contract.js');
const { recordDateDraft, clearFieldDraft } = await import('../../src/core/form/commit-coordinator.js');
const { addCollectionRow, removeCollectionRow, duplicateCollectionRow } = await import('../../src/core/form/schedule-definitions.js');
const { setPartyIdForSlot } = await import('../../src/core/party-resolver.js');
const { resolveSimplifiedGuardianAddressConflict } = await import('../../src/features/simplified-accounting/guardian-compatibility.js');

// Every wired call site imports markFilingRevisionChanged() (Milestone 70,
// 70K). Until then each called window.markFilingRevisionChanged?.(...), so the
// classic monolith could reach it too, and this suite installed that bridge or
// every hook silently no-opped; with no bridge, a call site that still went
// through window would fail here.

function acknowledgeBypassableFiling(data = { wardId: 'w1', inventoryType: 'annual' }) {
  const baseIssues = () => [createRequiredIssue({ filingType: 'annual', path: 'wardName', message: 'Missing wardName' })];
  expect(acknowledgeOutstandingRequirements(data, baseIssues)).toBe(true);
  expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(true);
  return data;
}

describe('Milestone 38D/44B mutation-boundary wiring: each real mutation invalidates a standing acknowledgement', () => {
  beforeEach(() => {
    clearOutputAcknowledgement();
  });

  it('a committed field write (runFieldWriteSideEffects, all three binding conventions share this tail)', () => {
    const data = acknowledgeBypassableFiling();
    runFieldWriteSideEffects('wardName');
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);
  });

  it('a recorded date draft (invalid/in-progress date text)', () => {
    const data = acknowledgeBypassableFiling();
    recordDateDraft({ data: {}, path: 'periodFrom', rawValue: '13/45' });
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);
  });

  it('a cleared date draft (draft resolved back to a valid/empty value)', () => {
    const data = acknowledgeBypassableFiling();
    clearFieldDraft('periodFrom', {});
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);
  });

  it('adding a collection row (e.g. Add Co-Guardian)', () => {
    const data = acknowledgeBypassableFiling();
    const filing = { inventoryType: 'annual', guardians: [{ name: 'A' }] };
    expect(addCollectionRow('guardians', filing)).toBe(true);
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);
  });

  it('duplicating a collection row', () => {
    const data = acknowledgeBypassableFiling();
    const filing = { inventoryType: 'annual', guardians: [{ name: 'A' }] };
    expect(duplicateCollectionRow('guardians', 0, filing)).toBe(true);
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);
  });

  it('removing a collection row', () => {
    const data = acknowledgeBypassableFiling();
    const filing = { inventoryType: 'annual', guardians: [{ name: 'A' }, { name: 'B' }] };
    expect(removeCollectionRow('guardians', 1, filing)).toBe(true);
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);
  });

  it('linking a party to a filing slot (setPartyIdForSlot)', () => {
    const data = acknowledgeBypassableFiling();
    const filing = { guardianPartyIds: [] };
    setPartyIdForSlot(filing, 'guardian', 0, 'party-123');
    expect(filing.guardianPartyIds[0]).toBe('party-123');
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);
  });

  it('resolving a 38A guardian-address conflict', () => {
    const data = acknowledgeBypassableFiling();
    const filingData = { guardians: [{ residenceStreet: '100 Main St', officeStreet: '200 Office Rd' }] };
    expect(resolveSimplifiedGuardianAddressConflict(filingData, 0, 'residenceStreet', 'canonical')).toBe(true);
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);
  });

  it('a no-op mutation (e.g. removing past the schema floor) must NOT spuriously invalidate', () => {
    const data = acknowledgeBypassableFiling();
    const filing = { inventoryType: 'annual', guardians: [{ name: 'A' }] };
    // schema floor for guardians is >=1 row in every filing type that uses
    // this shared collection -- removing the only row must fail, not mutate.
    expect(removeCollectionRow('guardians', 0, filing)).toBe(false);
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(true);
  });
});
