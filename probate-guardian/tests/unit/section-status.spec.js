import { describe, it, expect } from 'vitest';
global.window = global;
import { computeSectionStatus, renderLocalSectionGuidance } from '../../src/core/status/section-status.js';

describe('section-status', () => {
  it('computes status correctly for incomplete route', () => {
    const rawErrors = [
      'Cover — Case Number is required',
      'Cover — Period From is required',
      'D-1 — Guardian signature date is required',
    ];
    const navChecks = { checks: { cover: false, d1: false } };

    const status = computeSectionStatus('/', navChecks, rawErrors);
    expect(status.isComplete).toBe(false);
    expect(status.status).toBe('blocked');
    expect(status.localErrors.length).toBe(2);
  });

  it('renders bounded local guidance with jump links for the first 6 items and truncates', () => {
    const rawErrors = [
      'Cover — Item 1',
      'Cover — Item 2',
      'Cover — Item 3',
      'Cover — Item 4',
      'Cover — Item 5',
      'Cover — Item 6',
      'Cover — Item 7',
      'Cover — Item 8',
    ];

    const html = renderLocalSectionGuidance('/', rawErrors, 6);
    expect(html).toContain('Complete these items before continuing:');
    expect(html).toContain('Item 1');
    expect(html).toContain('Item 6');
    expect(html).toContain('...and 2 more required items');
    expect(html).toContain('data-form-action="jump-to-field"');
  });

  it('returns empty string when there are no local errors', () => {
    const html = renderLocalSectionGuidance('/', []);
    expect(html).toBe('');
  });
});
