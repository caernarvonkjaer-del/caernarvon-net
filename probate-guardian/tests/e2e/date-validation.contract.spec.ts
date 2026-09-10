import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard } from './support/target';

// Milestone 34-1A, Item 2: date-order validation. Annual/Final/Trust,
// Simplified, and the three Plan types that track a reporting period
// (planAnnual/planMinor/planSimplified) now reject a "To" date before its
// "From" date, a GID after the accounting period starts, and a signature/
// certification date before the accounting period's own end -- all via the
// one shared checkDateOrder() helper (src/core/validation/date-rules.js).
// Plan Initial and Guardian Inventory have no such period pair and are
// confirmed out of scope.
//
// These call validateX()/adaptValidationErrors() directly, same pattern as
// navigation-status.contract.spec.ts's own field-path-accuracy tests --
// several of the messages under test here deliberately contain BOTH the
// "from" and "to" (or GID) label as substrings (e.g. "Accounting Period To
// must be on or after Accounting Period From"), which is exactly the
// ambiguity validation-adapter.js's new priority branches exist to resolve;
// asserting the resolved `path` is the point of these tests, not just that
// an error string exists.

test.describe('Annual/Final/Trust date-order validation', () => {
  test('rejects an accounting period end before its start, resolving to periodTo', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Period Order Ward', 'annual');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-06-01';
      w.D.periodTo = '2026-01-01';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validateAnnual();
      const structured = w.adaptValidationErrors(raw, 'annual');
      return structured.find((e: any) => e.message.includes('must be on or after'));
    });
    expect(found?.message).toBe('Part I — Accounting Period To must be on or after Accounting Period From');
    expect(found?.path).toBe('periodTo');
  });

  test('rejects an accounting period start and end on the same day', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Same Day Ward', 'annual');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-06-01';
      w.D.periodTo = '2026-06-01';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validateAnnual();
      const structured = w.adaptValidationErrors(raw, 'annual');
      return structured.find((e: any) => e.message.includes('cannot be the same day'));
    });
    expect(found?.message).toBe('Part I — Accounting Period From and Accounting Period To cannot be the same day');
  });

  test('rejects a GID after the accounting period starts, resolving to periodFrom not gid', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual GID Order Ward', 'annual');
    await page.evaluate(() => {
      const w = window as any;
      w.D.gid = '2026-06-01';
      w.D.periodFrom = '2026-01-01';
      w.D.periodTo = '2026-12-31';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validateAnnual();
      const structured = w.adaptValidationErrors(raw, 'annual');
      return structured.find((e: any) => e.message.includes('Guardianship Inception Date'));
    });
    expect(found?.message).toBe('Part I — Accounting Period From must be on or after Guardianship Inception Date (GID)');
    expect(found?.path).toBe('periodFrom');
  });

  test('rejects a guardian signature date before the accounting period ends', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Signature Order Ward', 'annual');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-01-01';
      w.D.periodTo = '2026-12-31';
      w.D.guardians[0] = { ...w.D.guardians[0], signatureDate: '2026-06-01' };
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validateAnnual();
      const structured = w.adaptValidationErrors(raw, 'annual');
      return structured.find((e: any) => e.section === 'Part III' && e.message.includes('Signature Date'));
    });
    expect(found?.path).toBe('guardians.0.signatureDate');
  });
});

test.describe('Simplified date-order validation', () => {
  test('rejects an accounting period end before its start, resolving to periodTo', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Simplified Period Order Ward');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-06-01';
      w.D.periodTo = '2026-01-01';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validateSimplified();
      const structured = w.adaptValidationErrors(raw, 'simplified');
      return structured.find((e: any) => e.message.includes('must be on or after'));
    });
    expect(found?.message).toBe('Cover — Accounting Period To must be on or after Accounting Period From');
    expect(found?.path).toBe('periodTo');
  });

  test('rejects an attorney signature date before the accounting period ends, resolving to attorney_signatureDate', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Simplified Attorney Order Ward');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-01-01';
      w.D.periodTo = '2026-12-31';
      w.D.attorney_signatureDate = '2026-06-01';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validateSimplified();
      const structured = w.adaptValidationErrors(raw, 'simplified');
      return structured.find((e: any) => e.section === 'Part V' && e.message.includes('Signature Date'));
    });
    expect(found?.path).toBe('attorney_signatureDate');
  });
});

test.describe('Plan Annual date-order validation', () => {
  test('rejects a reporting period end before its start, resolving to periodTo', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Annual Period Order Ward', 'planAnnual');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-06-01';
      w.D.periodTo = '2026-01-01';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validatePlanAnnual();
      const structured = w.adaptValidationErrors(raw, 'planAnnual');
      return structured.find((e: any) => e.message.includes('must be on or after'));
    });
    expect(found?.message).toBe('Cover — Reporting Period To must be on or after Reporting Period From');
    expect(found?.path).toBe('periodTo');
  });

  test('rejects a GID after the reporting period starts, resolving to periodFrom not gid (regression: bare "guardianship inception date" check used to win)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Annual GID Order Ward', 'planAnnual');
    await page.evaluate(() => {
      const w = window as any;
      w.D.gid = '2026-06-01';
      w.D.periodFrom = '2026-01-01';
      w.D.periodTo = '2026-12-31';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validatePlanAnnual();
      const structured = w.adaptValidationErrors(raw, 'planAnnual');
      return structured.find((e: any) => e.message.includes('Guardianship Inception Date'));
    });
    expect(found?.message).toBe('Cover — Reporting Period From must be on or after Guardianship Inception Date');
    expect(found?.path).toBe('periodFrom');
  });

  test('rejects an attorney date signed before the reporting period ends, resolving to attorney_signatureDate not the guardian (regression: bare "date signed" check used to win)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Annual Attorney Order Ward', 'planAnnual');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-01-01';
      w.D.periodTo = '2026-12-31';
      w.D.attorney_signatureDate = '2026-06-01';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validatePlanAnnual();
      const structured = w.adaptValidationErrors(raw, 'planAnnual');
      return structured.find((e: any) => e.section === 'Signatures' && e.message.includes('Attorney date signed'));
    });
    expect(found?.path).toBe('attorney_signatureDate');
  });
});

test.describe('Plan Minor date-order validation', () => {
  test('rejects a reporting period end before its start, resolving to periodTo', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Minor Period Order Ward', 'planMinor');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-06-01';
      w.D.periodTo = '2026-01-01';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validatePlanMinor();
      const structured = w.adaptValidationErrors(raw, 'planMinor');
      return structured.find((e: any) => e.message.includes('must be on or after'));
    });
    expect(found?.message).toBe('Cover — Reporting Period To must be on or after Reporting Period From');
    expect(found?.path).toBe('periodTo');
  });

  test('rejects a preparer signature date before the reporting period ends, resolving to preparer_signatureDate (new field-path branch)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Minor Preparer Order Ward', 'planMinor');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-01-01';
      w.D.periodTo = '2026-12-31';
      w.D.preparer_signatureDate = '2026-06-01';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validatePlanMinor();
      const structured = w.adaptValidationErrors(raw, 'planMinor');
      return structured.find((e: any) => e.message.includes('Preparer signature date'));
    });
    expect(found?.path).toBe('preparer_signatureDate');
  });
});

test.describe('Plan Simplified date-order validation', () => {
  test('rejects a reporting period end before its start, resolving to periodTo', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Simplified Period Order Ward', 'planSimplified');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-06-01';
      w.D.periodTo = '2026-01-01';
    });

    const found = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validatePlanSimplified();
      const structured = w.adaptValidationErrors(raw, 'planSimplified');
      return structured.find((e: any) => e.message.includes('must be on or after'));
    });
    expect(found?.message).toBe('Cover — Reporting Period To must be on or after Reporting Period From');
    expect(found?.path).toBe('periodTo');
  });

  test('rejects a preparer and an attorney date signed before the reporting period ends, resolving to distinct targets (regression: bare "date signed" check used to win)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Simplified Preparer Attorney Order Ward', 'planSimplified');
    await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2026-01-01';
      w.D.periodTo = '2026-12-31';
      w.D.preparer_signatureDate = '2026-06-01';
      w.D.attorney_signatureDate = '2026-06-02';
    });

    const paths = await page.evaluate(() => {
      const w = window as any;
      const raw = w.validatePlanSimplified();
      const structured = w.adaptValidationErrors(raw, 'planSimplified');
      return {
        preparer: structured.find((e: any) => e.message.includes('Preparer date signed'))?.path,
        attorney: structured.find((e: any) => e.message.includes('Attorney date signed'))?.path,
      };
    });
    expect(paths).toEqual({ preparer: 'preparer_signatureDate', attorney: 'attorney_signatureDate' });
  });
});
