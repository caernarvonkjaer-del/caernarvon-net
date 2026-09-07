import { describe, it, expect } from 'vitest';
global.window = global;
import { adaptValidationErrors, resolveRouteFromSection } from '../../src/core/validation/validation-adapter.js';

describe('validation-adapter', () => {
  it('resolves routes correctly from section prefixes', () => {
    expect(resolveRouteFromSection('Cover')).toBe('/');
    expect(resolveRouteFromSection('D-1 Guardians')).toBe('/d1');
    expect(resolveRouteFromSection('D-2 Preparer')).toBe('/d2');
    expect(resolveRouteFromSection('D-3 Service')).toBe('/d3');
    expect(resolveRouteFromSection('D-4 Attorney')).toBe('/d4');
    expect(resolveRouteFromSection('A-1 Real Property')).toBe('/a1');
    expect(resolveRouteFromSection('Part 8 Trusts')).toBe('/p8');
  });

  it('adapts legacy string errors into structured validation objects', () => {
    const raw = [
      'Cover — Case Number is required',
      'Cover — Period From date is required',
      'D-1 Guardians — Guardian #1 signature date is required',
    ];

    const adapted = adaptValidationErrors(raw);
    expect(adapted.length).toBe(3);

    expect(adapted[0]).toEqual({
      code: 'validation.cover',
      section: 'Cover',
      path: 'caseNumber',
      label: 'Case Number is required',
      route: '/',
      severity: 'required',
      message: 'Cover — Case Number is required',
    });

    expect(adapted[2]).toEqual({
      code: 'validation.d_1_guardians',
      section: 'D-1 Guardians',
      path: 'guardians.0.signatureDate',
      label: 'Guardian #1 signature date is required',
      route: '/d1',
      severity: 'required',
      message: 'D-1 Guardians — Guardian #1 signature date is required',
    });
  });

  it('passes through structured error objects untouched', () => {
    const obj = {
      code: 'custom.err',
      section: 'Custom',
      path: 'custom.path',
      label: 'Custom Error',
      route: '/custom',
      severity: 'required',
      message: 'Custom Error',
    };
    const adapted = adaptValidationErrors([obj]);
    expect(adapted[0]).toEqual(obj);
  });
});
