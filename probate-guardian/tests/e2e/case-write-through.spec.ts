import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// End-to-end proof for persistence-rewrite Milestone 6: the Add Ward
// modal's carry-source picker now also joins the new filing to the source
// filing's real Case (src/core/case-resolver.js), not just copying whatever
// case-number text happens to match at that moment. Driven through the
// actual Add Ward modal UI, mirroring party-write-through.spec.ts's shape.

test.describe('case write-through (Milestone 6)', () => {
  test('creating a filing via the carry-source picker joins the source filing\'s real Case, which survives an edit to only one filing\'s case number', async ({ page }) => {
    await freshStartNoPassword(page);

    await createWard(page, 'Case Source Ward', 'guardian');
    const wardIdA = await page.evaluate(() => (window as any).caseFile.activeWardId);
    await page.evaluate(() => {
      const w = window as any;
      w.D.caseNumber = '24-000888-GD';
      w.autoSave();
    });

    // Open the Add Ward modal for a Guardianship Plan -- guardian<->planInitial
    // is a supported carry-source pairing (see carryWardsFor's own comment).
    await page.evaluate(() => (window as any).showAddWardModalForType('planInitial'));
    await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
    await page.fill('#new-ward-name', 'Case Plan Ward');
    await page.selectOption('#carry-source-ward', wardIdA);
    await page.click('#addWardModal [data-modal-action="add-ward"]');
    await page.locator('#addWardModal').waitFor({ state: 'hidden' });

    const wardIdB = await page.evaluate(() => (window as any).caseFile.activeWardId);
    const linkResult = await page.evaluate(([a, b]) => {
      const w = window as any;
      const wardA = w.caseFile.wards.find((x: any) => x.wardId === a);
      const wardB = w.caseFile.wards.find((x: any) => x.wardId === b);
      return { caseIdA: wardA.caseId, caseIdB: wardB.caseId, caseNumberOnCase: w.resolveCase(wardA.caseId)?.caseNumber };
    }, [wardIdA, wardIdB] as const);

    expect(linkResult.caseIdA).toBeTruthy();
    expect(linkResult.caseIdB).toBe(linkResult.caseIdA);
    expect(linkResult.caseNumberOnCase).toBe('24-000888-GD');

    // Edit A's OWN case-number field only -- B's is untouched, and the Case
    // record itself is untouched too. The old string-match grouping could
    // not survive this; the real caseId link can. casesGroupingWards()'s own
    // grouping logic (the part the dashboard's "Grouped by Case" view calls
    // into) is exhaustively covered by case-resolver.spec.ts; this test's
    // job is just proving the real UI produces a correctly-linked caseId in
    // the first place.
    const stillLinked = await page.evaluate((a) => {
      const w = window as any;
      const wardA = w.caseFile.wards.find((x: any) => x.wardId === a);
      wardA.caseNumber = '24-000888-GD-AMENDED';
      w.autoSave();
      const groups = w.casesGroupingWards(w.caseFile.wards);
      return groups.find((g: any) => g.wards.includes(wardA))?.wards.length;
    }, wardIdA);
    expect(stillLinked).toBe(2);
  });

  test('the dashboard "Link to Case" button opens Pick Case and links an existing Case through the real UI', async ({ page }) => {
    await freshStartNoPassword(page);

    await createWard(page, 'Link Case Source', 'guardian');
    const wardIdA = await page.evaluate(() => (window as any).caseFile.activeWardId);
    const caseId = await page.evaluate((a) => {
      const w = window as any;
      const wardA = w.caseFile.wards.find((x: any) => x.wardId === a);
      return w.getOrCreateCaseForWard(wardA).id;
    }, wardIdA);

    await createWard(page, 'Link Case Target', 'planInitial');
    const wardIdB = await page.evaluate(() => (window as any).caseFile.activeWardId);

    await page.evaluate(() => (window as any).navigate('/dashboard'));
    // wardIdB is the active (featured) ward, so its "Link to Case" button is
    // the one rendered on the dashboard's single always-visible full card.
    await page.click(`[data-dashboard-action="link-case"][data-ward-id="${wardIdB}"]`);
    await page.locator('#pickCaseModal.show').waitFor({ state: 'visible' });
    await page.selectOption('#pick-case-existing', caseId);
    await page.click('#pickCaseModal [data-modal-action="pick-case"]');
    await page.locator('#pickCaseModal').waitFor({ state: 'hidden' });

    const linkedCaseId = await page.evaluate((b) => (window as any).caseFile.wards.find((x: any) => x.wardId === b).caseId, wardIdB);
    expect(linkedCaseId).toBe(caseId);
  });
});
