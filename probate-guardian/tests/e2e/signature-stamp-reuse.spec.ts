import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanSimplifiedWard, acceptDynDialog, dismissDynDialog } from './support/target';

// Milestone 46B: a party who signs repeatedly shouldn't redraw their
// signature every time. Capturing a stamp appends it to that party's
// append-only history (Milestone 46A), and a later filing linked to the
// same party can reuse it.
//
// Applying a saved stamp **copies the image bytes onto the filing**, not a
// { partyId, imageId } reference. That corrects 39-D's original design after
// its own justification didn't hold up: it argued for a reference "not a
// copy, so a later change to the party's active stamp never retroactively
// alters an already-signed filing" -- but a copy is immutable too, so that
// reasoning doesn't separate the two. The real tradeoff is storage dedup vs.
// portability, and a reference loses: buildSingleWardExportBlob() packages
// only the ward, so an exported filing would carry a dangling reference into
// any other case file. Copying keeps single-ward export working untouched
// and removed 39-D's export/import sub-delivery from the milestone entirely.

async function drawAndApplyStamp(page: any) {
  await page.locator('input[value="stamp"]').first().check();
  const canvas = page.locator('.signature-pad-canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 10000 });
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2 - 10, { steps: 12 });
  await page.mouse.up();
  await page.locator('[data-sig-action="apply"]').first().click();
}

test.describe('Milestone 46B: reusable per-party signature stamps', () => {
  test('capturing a stamp records it on the linked party, and a second filing can reuse it', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Stamp Source Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/p3'));

    // Link guardian slot 0 to a real party, so there is somewhere for the
    // reusable stamp to live.
    await page.click('[data-form-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
    const partyId = await page.evaluate(() => (window as any).D.guardianPartyIds[0]);
    expect(partyId).toBeTruthy();

    await drawAndApplyStamp(page);

    // The filing holds its own image, and the party now has a reusable one.
    const afterCapture = await page.evaluate((id) => {
      const w = window as any;
      const party = w.caseFile.parties.find((p: any) => p.id === id);
      return {
        filingImage: (w.D.planGuardians[0].signatureImage || '').slice(0, 24),
        stampCount: (party.signatureImages || []).length,
        activeImage: (party.signatureImages || []).find((e: any) => e.active)?.imageData.slice(0, 24),
      };
    }, partyId);
    expect(afterCapture.stampCount).toBe(1);
    expect(afterCapture.filingImage).toContain('data:image/png');
    expect(afterCapture.activeImage).toBe(afterCapture.filingImage);

    // Second filing, same party. The saved-stamp affordance should appear
    // once the card is in Stamp state.
    await createWard(page, 'Stamp Reuse Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/p3'));
    await page.click('[data-form-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.selectOption('#pick-party-existing', partyId);
    await page.click('#pickPartyModal [data-modal-action="pick-party"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });

    await page.locator('input[value="stamp"]').first().check();
    const offer = page.locator('[data-signature-action="use-saved-stamp"]').first();
    await expect(offer).toBeVisible();

    // Every apply is confirmed -- a reusable mark must never be attached
    // silently to a document its owner never saw (46A's sensitivity rule).
    await offer.click();
    const confirmMessage = await acceptDynDialog(page);
    expect(confirmMessage).toContain('Apply your saved signature');

    const reused = await page.evaluate(() => ((window as any).D.planGuardians[0].signatureImage || '').slice(0, 24));
    expect(reused).toBe(afterCapture.filingImage);
  });

  test('declining the confirmation applies nothing', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Stamp Decline Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/p3'));
    await page.click('[data-form-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
    await drawAndApplyStamp(page);

    // Clear the filing's own image, leaving the party's saved stamp intact.
    await page.evaluate(() => {
      (window as any).D.planGuardians[0].signatureImage = '';
      (window as any).renderPage('/p3');
    });
    await page.locator('input[value="stamp"]').first().check();

    await page.locator('[data-signature-action="use-saved-stamp"]').first().click();
    await dismissDynDialog(page);
    expect(await page.evaluate(() => (window as any).D.planGuardians[0].signatureImage)).toBe('');
  });

  test('a slot with no linked party shows no saved-stamp offer and still signs normally', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Stamp Unlinked Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/p3'));

    await page.locator('input[value="stamp"]').first().check();
    await expect(page.locator('[data-signature-action="use-saved-stamp"]')).toHaveCount(0);

    // Capturing still works -- an unlinked slot just has nothing to reuse.
    await drawAndApplyStamp(page);
    const img = await page.evaluate(() => (window as any).D.planGuardians[0].signatureImage || '');
    expect(img).toContain('data:image/png');
  });

  test('a filing keeps the exact mark it was signed with after the party captures a newer stamp', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Stamp History Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/p3'));
    await page.click('[data-form-action="link-party"][data-role="guardian"][data-index="0"]');
    await page.locator('#pickPartyModal.show').waitFor({ state: 'visible' });
    await page.click('#pickPartyModal [data-modal-action="create-party-from-slot"]');
    await page.locator('#pickPartyModal').waitFor({ state: 'hidden' });
    await drawAndApplyStamp(page);

    const firstMark = await page.evaluate(() => (window as any).D.planGuardians[0].signatureImage);
    const partyId = await page.evaluate(() => (window as any).D.guardianPartyIds[0]);

    // The party captures a different stamp later (simulating a new signature
    // on some other filing) -- appended, with the old entry retained.
    await page.evaluate((id) => {
      const w = window as any;
      const party = w.caseFile.parties.find((p: any) => p.id === id);
      w.addSignatureImage(party, 'data:image/png;base64,NEWERMARK');
    }, partyId);

    const state = await page.evaluate((id) => {
      const w = window as any;
      const party = w.caseFile.parties.find((p: any) => p.id === id);
      return {
        entries: party.signatureImages.length,
        activeIsNewer: party.signatureImages.find((e: any) => e.active)?.imageData === 'data:image/png;base64,NEWERMARK',
        oldestRetained: party.signatureImages[0].imageData,
        filingImage: w.D.planGuardians[0].signatureImage,
      };
    }, partyId);

    expect(state.entries).toBe(2);
    expect(state.activeIsNewer).toBe(true);
    expect(state.oldestRetained).toBe(firstMark);
    // The already-signed filing is untouched by the party's newer stamp.
    expect(state.filingImage).toBe(firstMark);
  });
});
