import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Exercises the Case entity core (src/core/case-resolver.js, persistence-
// rewrite Milestone 6) directly against hand-built wards -- mirrors
// party-resolver.spec.ts's shape. Each "ward" here is a plain object pushed
// straight into window.caseFile.wards, since only case-resolver.js's own
// logic is under test.

test.describe('case-resolver', () => {
  test('createCase + resolveCase round-trip', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const kase = w.createCase({ caseNumber: '24-001234-GD', county: 'Pinellas' });
      const found = w.resolveCase(kase.id);
      return {
        inCaseFile: w.caseFile.cases.includes(kase),
        foundIsSame: found === kase,
        caseNumber: kase.caseNumber,
        county: kase.county,
      };
    });

    expect(result.inCaseFile).toBe(true);
    expect(result.foundIsSame).toBe(true);
    expect(result.caseNumber).toBe('24-001234-GD');
    expect(result.county).toBe('Pinellas');
  });

  test('caseNumberOf reads ucn for planMinor and caseNumber for every other type', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      return {
        minor: w.caseNumberOf({ inventoryType: 'planMinor', ucn: '24-000111-GD', caseNumber: 'wrong' }),
        annual: w.caseNumberOf({ inventoryType: 'annual', caseNumber: '24-000222-GD' }),
      };
    });

    expect(result.minor).toBe('24-000111-GD');
    expect(result.annual).toBe('24-000222-GD');
  });

  test('getOrCreateCaseForWard creates once and reuses on a second call', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const ward: any = { wardId: 'w1', inventoryType: 'guardian', caseNumber: '24-000333-GD', county: 'Pasco', caseId: null };
      const first = w.getOrCreateCaseForWard(ward);
      const wardIdAfterFirst = ward.caseId;
      const second = w.getOrCreateCaseForWard(ward);
      return {
        caseCountAfterFirst: w.caseFile.cases.filter((c: any) => c.id === wardIdAfterFirst).length,
        wardIdAfterFirst,
        sameCaseReturnedTwice: first === second,
        caseNumber: first.caseNumber,
        county: first.county,
      };
    });

    expect(result.wardIdAfterFirst).toBeTruthy();
    expect(result.caseCountAfterFirst).toBe(1);
    expect(result.sameCaseReturnedTwice).toBe(true);
    expect(result.caseNumber).toBe('24-000333-GD');
    expect(result.county).toBe('Pasco');
  });

  test('casesGroupingWards groups linked wards by real caseId, and falls back to caseNumber string match for unlinked ones', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const kase = w.createCase({ caseNumber: '24-000444-GD', county: 'Pinellas' });
      const linkedA: any = { wardId: 'a', inventoryType: 'guardian', wardName: 'Jane', caseId: kase.id, caseNumber: 'stale-should-not-matter' };
      const linkedB: any = { wardId: 'b', inventoryType: 'annual', wardName: 'Jane', caseId: kase.id, caseNumber: '' };
      const unlinkedC: any = { wardId: 'c', inventoryType: 'guardian', wardName: 'Bob', caseId: null, caseNumber: '24-000555-GD' };
      const unlinkedD: any = { wardId: 'd', inventoryType: 'annual', wardName: 'Bob', caseId: null, caseNumber: '24-000555-GD' };
      const soloE: any = { wardId: 'e', inventoryType: 'guardian', wardName: 'Solo', caseId: null, caseNumber: '' };

      const groups = w.casesGroupingWards([linkedA, linkedB, unlinkedC, unlinkedD, soloE]);
      return {
        groupCount: groups.length,
        linkedGroup: groups.find((g: any) => g.wards.includes(linkedA)),
        stringMatchGroup: groups.find((g: any) => g.wards.includes(unlinkedC)),
        soloGroup: groups.find((g: any) => g.wards.includes(soloE)),
      };
    });

    expect(result.groupCount).toBe(3);
    expect(result.linkedGroup.wards).toHaveLength(2);
    expect(result.linkedGroup.caseNumber).toBe('24-000444-GD'); // from the Case record, not each ward's own (stale) field
    expect(result.stringMatchGroup.wards).toHaveLength(2); // unlinkedC + unlinkedD, matched by shared caseNumber string
    expect(result.soloGroup.wards).toHaveLength(1);
  });

  test('casesGroupingWards keeps a linked group together even after the case number is edited on only one of the two filings', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const kase = w.createCase({ caseNumber: '24-000666-GD', county: 'Pinellas' });
      const filingA: any = { wardId: 'a', inventoryType: 'guardian', caseId: kase.id, caseNumber: '24-000666-GD' };
      const filingB: any = { wardId: 'b', inventoryType: 'annual', caseId: kase.id, caseNumber: '24-000666-GD' };

      // Edit A's own caseNumber field directly (as if the user retyped it),
      // without updating B or the Case record -- the exact scenario the old
      // string-match grouping could never survive.
      filingA.caseNumber = '24-000666-GD-AMENDED';

      const groups = w.casesGroupingWards([filingA, filingB]);
      return { groupCount: groups.length, groupSize: groups[0]?.wards.length };
    });

    expect(result.groupCount).toBe(1);
    expect(result.groupSize).toBe(2);
  });
});
