// Milestone 73O part 1 (decision 73O-2): the Initial Guardianship Plan keeps
// one attorney name. A filing saved with the cover's and the certification's
// names folds them where nothing is lost; two different people wait for the
// filer's choice. src/core/filing/plan-initial-attorney.js.
import { describe, it, expect } from 'vitest';
import {
  keepPlanInitialAttorney,
  migratePlanInitialAttorney,
  planInitialAttorneyConflict,
} from '../../src/core/filing/plan-initial-attorney.js';

describe('plan-initial-attorney: the fold', () => {
  it('moves the cover\'s name into the certification\'s when that is blank', () => {
    const d = { attorneyName: 'Robert T. Nguyen', attorney_name: '' };
    expect(migratePlanInitialAttorney(d)).toBe(true);
    expect(d).toEqual({ attorney_name: 'Robert T. Nguyen' });
  });

  it('keeps the certification\'s name when both name the same person', () => {
    const d = { attorneyName: 'Robert T. Nguyen', attorney_name: 'Robert T. Nguyen, Esq.' };
    expect(migratePlanInitialAttorney(d)).toBe(true);
    expect(d).toEqual({ attorney_name: 'Robert T. Nguyen, Esq.' });
    const reversed = { attorneyName: 'Robert T. Nguyen, Esq.', attorney_name: 'Robert T. Nguyen' };
    migratePlanInitialAttorney(reversed);
    expect(reversed).toEqual({ attorney_name: 'Robert T. Nguyen' });
  });

  it('drops a blank cover name', () => {
    const d = { attorneyName: '', attorney_name: 'Ana Ruiz' };
    expect(migratePlanInitialAttorney(d)).toBe(true);
    expect(d).toEqual({ attorney_name: 'Ana Ruiz' });
  });

  it('never chooses between two different people, and is idempotent', () => {
    const d = { attorneyName: 'Ana Ruiz', attorney_name: 'Robert T. Nguyen' };
    expect(migratePlanInitialAttorney(d)).toBe(false);
    expect(d).toEqual({ attorneyName: 'Ana Ruiz', attorney_name: 'Robert T. Nguyen' });
    expect(migratePlanInitialAttorney({ attorney_name: 'Ana Ruiz' })).toBe(false);
  });
});

describe('plan-initial-attorney: the filer\'s choice', () => {
  it('names both people while they differ, and nothing otherwise', () => {
    expect(planInitialAttorneyConflict({ attorneyName: 'Ana Ruiz', attorney_name: 'Robert T. Nguyen' }))
      .toEqual({ cover: 'Ana Ruiz', certification: 'Robert T. Nguyen' });
    expect(planInitialAttorneyConflict({ attorneyName: 'Robert T. Nguyen', attorney_name: 'Robert T. Nguyen, Esq.' })).toBeNull();
    expect(planInitialAttorneyConflict({ attorney_name: 'Ana Ruiz' })).toBeNull();
  });

  it('keeps the chosen name in the one field and lets the other go', () => {
    const cover = { attorneyName: 'Ana Ruiz', attorney_name: 'Robert T. Nguyen' };
    expect(keepPlanInitialAttorney(cover, 'cover')).toBe(true);
    expect(cover).toEqual({ attorney_name: 'Ana Ruiz' });
    const certification = { attorneyName: 'Ana Ruiz', attorney_name: 'Robert T. Nguyen' };
    expect(keepPlanInitialAttorney(certification, 'certification')).toBe(true);
    expect(certification).toEqual({ attorney_name: 'Robert T. Nguyen' });
    const unknown = { attorneyName: 'Ana Ruiz', attorney_name: 'Robert T. Nguyen' };
    expect(keepPlanInitialAttorney(unknown, 'both')).toBe(false);
    expect(unknown).toHaveProperty('attorneyName', 'Ana Ruiz');
  });
});
