import { describe, it, expect } from 'vitest';
import { scheduleEvidenceState, missingScheduleEvidence, scheduleEvidenceFamily } from '../../src/core/filing/schedule-evidence.js';

describe('Schedule Evidence Contract', () => {
  it('correctly maps filing types to evidence families', () => {
    expect(scheduleEvidenceFamily('guardian')).toBe('guardian');
    expect(scheduleEvidenceFamily('annual')).toBe('annual');
    expect(scheduleEvidenceFamily('finalAccounting')).toBe('annual');
    expect(scheduleEvidenceFamily('trustAccounting')).toBe('annual');
    expect(scheduleEvidenceFamily('planAnnual')).toBe('');
    expect(scheduleEvidenceFamily('planMinor')).toBe('');
  });

  it('marks empty schedules as satisfied', () => {
    const data = { schA: [], scheduleDocs: {} };
    const state = scheduleEvidenceState(data, 'annual', 'schA');
    expect(state.applies).toBe(true);
    expect(state.entered).toBe(false);
    expect(state.satisfied).toBe(true);
  });

  it('requires eligible file or override when rows are entered', () => {
    const data = {
      schA: [{ payer: 'Payer 1', amount: '100' }],
      scheduleDocs: {
        schA: { initial: { files: [], evidenceOverride: false } },
      },
    };

    const unsatisfied = scheduleEvidenceState(data, 'annual', 'schA');
    expect(unsatisfied.entered).toBe(true);
    expect(unsatisfied.satisfied).toBe(false);

    // Override satisfies the gate
    data.scheduleDocs.schA.initial.evidenceOverride = true;
    const satisfied = scheduleEvidenceState(data, 'annual', 'schA');
    expect(satisfied.satisfied).toBe(true);
  });

  it('resolves schedule keys case-insensitively for 1:1 parity', () => {
    const data = {
      schA: [{ payer: 'Payer 1', amount: '100' }],
      scheduleDocs: {
        schA: { initial: { files: [], evidenceOverride: false } },
      },
    };

    // Lowercase key as used by computeNavChecks ('scha')
    const lowerState = scheduleEvidenceState(data, 'annual', 'scha');
    expect(lowerState.applies).toBe(true);
    expect(lowerState.entered).toBe(true);
    expect(lowerState.satisfied).toBe(false);
  });

  it('identifies missing schedule evidence keys', () => {
    const data = {
      schA: [{ payer: 'Payer 1', amount: '100' }],
      schB4: [{ checkNo: '101', amount: '50' }],
      scheduleDocs: {},
    };

    const missing = missingScheduleEvidence(data, 'annual');
    expect(missing).toContain('schA');
    expect(missing).toContain('schB4');
  });
});

