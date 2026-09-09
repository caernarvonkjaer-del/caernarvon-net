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

  it('delegates to window.errorRoute() first when available, before the legacy table/substring fallback', () => {
    // window === global here (see top of file), so this stub simulates what
    // legacy-app.js's real errorRoute() provides in the browser. vitest does
    // not reset `global` between it() blocks in this file, so the stub must
    // be removed in `finally` or it would leak into every later test.
    global.errorRoute = (section) => (section === 'Part IV' ? '/p4' : null);
    try {
      expect(resolveRouteFromSection('Part IV')).toBe('/p4');
      // errorRoute() returning null (no match) must still fall through to
      // the existing fallback, not short-circuit to some other wrong value.
      expect(resolveRouteFromSection('Cover')).toBe('/');
    } finally {
      delete global.errorRoute;
    }
  });

  it('scopes the four Plan types\' narrative section labels by filingType, since some labels collide across types', () => {
    // "Signatures" alone is reused verbatim by three different Plan types
    // for three different real pages -- this is the one case that proves
    // route resolution for these types cannot be a single global table.
    expect(resolveRouteFromSection('Signatures', 'planAnnual')).toBe('/p11');
    expect(resolveRouteFromSection('Signatures', 'planInitial')).toBe('/p9');
    expect(resolveRouteFromSection('Signatures', 'planSimplified')).toBe('/p3');
    expect(resolveRouteFromSection('1. Residences', 'planAnnual')).toBe('/p2');
    expect(resolveRouteFromSection('Guardian Signatures', 'planMinor')).toBe('/p6');
    expect(resolveRouteFromSection('Attorney Certification', 'planInitial')).toBe('/p10');
  });

  it('without a filingType, falls back to the legacy table/substring behavior unchanged', () => {
    // Same "Signatures" label as above, but with no filingType passed --
    // must NOT accidentally hit a Plan-type route; it should behave exactly
    // as it did before this change (the guardian-oriented substring
    // fallback), proving every existing caller that omits the new
    // parameter keeps its current behavior.
    expect(resolveRouteFromSection('Signatures')).toBe('/d1');
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

  it('threads the formType argument through to route resolution', () => {
    const adapted = adaptValidationErrors(['Signatures — Guardian 1 printed name is required'], 'planSimplified');
    expect(adapted[0].route).toBe('/p3');
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
