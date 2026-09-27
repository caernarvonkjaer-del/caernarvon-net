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

  it('asks errorRoute() first, before the legacy table/substring fallback', () => {
    // Milestone 70's 70F: errorRoute() is imported (src/core/validation/
    // error-route.js). In the app it always answered first -- it was defined
    // before this ran -- so these are the routes filers have always got.
    expect(resolveRouteFromSection('Part IV')).toBe('/p4');
    expect(resolveRouteFromSection('Cover')).toBe('/');
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

  it('without a filingType, a label errorRoute() cannot place falls back to the legacy table/substring behavior unchanged', () => {
    // The guardian-oriented substring fallback runs only when errorRoute()
    // places nothing. (Until Milestone 70's 70F this test asked about bare
    // "Signatures", which the fallback sends to /d1 -- but in the app
    // errorRoute() answered first and sent it to a Plan's signature page;
    // every real caller passes a filing type, so no filer met either.)
    expect(resolveRouteFromSection('Signature block')).toBe('/d1');
  });

  it('adapts a bare string into a structured object with a section and route but no field path', () => {
    // Milestone 42F: validators state their own paths (validation-issue.js);
    // the text-matching derivation that used to guess `caseNumber` from
    // "Case Number is required" is gone. A bare string is now only ever a
    // non-field issue (supplemental-PDF limits, etc.), so it routes to its
    // section and carries no path.
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
      path: '',
      label: 'Case Number is required',
      route: '/',
      severity: 'required',
      message: 'Cover — Case Number is required',
    });

    expect(adapted[2]).toEqual({
      code: 'validation.d_1_guardians',
      section: 'D-1 Guardians',
      path: '',
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
