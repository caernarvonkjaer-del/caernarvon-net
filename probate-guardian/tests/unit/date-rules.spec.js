import { describe, it, expect } from 'vitest';
import { checkDateOrder } from '../../src/core/validation/date-rules.js';

describe('date-rules: checkDateOrder', () => {
  it('returns no error when later date is strictly after earlier date', () => {
    expect(checkDateOrder('2026-01-01', '2026-12-31', {
      sectionLabel: 'Part I', earlierLabel: 'Period From', laterLabel: 'Period To',
    })).toEqual([]);
  });

  it('returns no error when either value is missing', () => {
    expect(checkDateOrder('', '2026-12-31', { sectionLabel: 'Part I', earlierLabel: 'From', laterLabel: 'To' })).toEqual([]);
    expect(checkDateOrder('2026-01-01', '', { sectionLabel: 'Part I', earlierLabel: 'From', laterLabel: 'To' })).toEqual([]);
    expect(checkDateOrder(null, null, { sectionLabel: 'Part I', earlierLabel: 'From', laterLabel: 'To' })).toEqual([]);
  });

  it('flags a later date that falls before the earlier date', () => {
    const errs = checkDateOrder('2026-12-31', '2026-01-01', {
      sectionLabel: 'Part I', earlierLabel: 'Period From', laterLabel: 'Period To',
    });
    expect(errs).toEqual(['Part I — Period To must be on or after Period From']);
  });

  it('allows the same day by default', () => {
    expect(checkDateOrder('2026-06-01', '2026-06-01', {
      sectionLabel: 'Part I', earlierLabel: 'From', laterLabel: 'To',
    })).toEqual([]);
  });

  it('rejects the same day when allowSameDay is false, using the default message', () => {
    const errs = checkDateOrder('2026-06-01', '2026-06-01', {
      sectionLabel: 'Part I', earlierLabel: 'Period From', laterLabel: 'Period To', allowSameDay: false,
    });
    expect(errs).toEqual(['Part I — Period From and Period To cannot be the same day']);
  });

  it('uses a custom sameDayMessage when provided', () => {
    const errs = checkDateOrder('2026-06-01', '2026-06-01', {
      sectionLabel: 'Part I', earlierLabel: 'From', laterLabel: 'To', allowSameDay: false,
      sameDayMessage: 'Custom same-day message',
    });
    expect(errs).toEqual(['Custom same-day message']);
  });

  it('canonical YYYY-MM-DD strings compare correctly across year/month/day boundaries', () => {
    expect(checkDateOrder('2025-12-31', '2026-01-01', { sectionLabel: 'S', earlierLabel: 'E', laterLabel: 'L' })).toEqual([]);
    expect(checkDateOrder('2026-01-31', '2026-02-01', { sectionLabel: 'S', earlierLabel: 'E', laterLabel: 'L' })).toEqual([]);
    expect(checkDateOrder('2026-02-01', '2026-01-31', { sectionLabel: 'S', earlierLabel: 'E', laterLabel: 'L' }))
      .toEqual(['S — L must be on or after E']);
  });
});
