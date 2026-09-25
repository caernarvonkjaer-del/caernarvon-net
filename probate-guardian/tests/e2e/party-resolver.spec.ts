import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// The Party records through a .sav: what a saved and reopened case file keeps
// of them. Everything else this file used to hold -- the resolver's
// hydration/dehydration, de-duplication, merge/unmerge and ward-identity
// logic -- is plain module logic, moved to tests/unit/party-resolver.spec.js
// by Milestone 70's 70T. These three stay here because packaging and opening
// a case file runs in the page (loadCaseFileFromZip() is legacy-app.js's).
// State is arranged through GuardianForms.testing (setup, D9), and each
// filing record is seeded as an older save or another tab would leave it.

test.describe('party de-duplication via resolver (Milestone 7)', () => {
  test('dismissedPartyPairs and a merged party\'s mergedInto tombstone survive a save/reload round-trip', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const t = (window as any).GuardianForms.testing;
      const keep = t.updateSharedRecords.createParty('guardian', { name: 'Jane Doe' });
      // Dismissed as "not the same person" below, not merged.
      const discard = t.updateSharedRecords.createParty('guardian', { name: 'John Smith' });
      const mergedAway = t.updateSharedRecords.createParty('guardian', { name: 'Jane Doe' });
      t.updateSharedRecords.mergeParties(keep.id, mergedAway.id, { adoptBlankFields: false });
      t.updateSharedRecords.dismissPartyPair(keep.id, discard.id);

      const blob = await t.exportArchive.caseFile();
      const zip = await (window as any).JSZip.loadAsync(blob);
      const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
      await t.importArchive(zip, manifest, null); // 'none' security mode -- no password needed

      const parties = t.snapshot().caseFile.parties;
      return {
        partyCount: parties.length,
        mergedAwayTombstone: parties.find((p: any) => p.id === mergedAway.id)?.mergedInto,
        mergedAwayRecordAt: parties.find((p: any) => p.id === mergedAway.id)?.mergeRecord?.mergedAt,
        stillDismissed: t.sharedRecords.isPartyPairDismissed(keep.id, discard.id),
      };
    });

    expect(result.partyCount).toBe(3);
    expect(result.mergedAwayTombstone).toBeTruthy();
    expect(result.mergedAwayRecordAt).toBeTruthy(); // the undo record rides along with the tombstone
    expect(result.stillDismissed).toBe(true);
  });

  test('single-ward .sav export has no parties.enc, and on load reconstructs the ward-Party with county under the unanimity rule', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const t = (window as any).GuardianForms.testing;

      // 1. A filing with an explicit county, and its ward Party carrying it.
      const wardId = 'ward-unanimity-1';
      t.seedFiling({ wardId, wardName: 'Reconstructed Ward', inventoryType: 'annual', county: 'Orange' });
      const initialParty = t.updateSharedRecords.ensureWardPartyForFiling(wardId);
      t.patchCase({ parties: t.snapshot().caseFile.parties.map((p: any) => (p.id === initialParty.id ? { ...p, county: 'Orange' } : p)) });

      // 2. Build single-ward export blob (which deliberately has no parties.enc)
      const blob = await t.exportArchive.singleFiling(wardId);
      const zip = await (window as any).JSZip.loadAsync(blob);
      const partiesEntry = zip.file('parties.enc');
      const manifest = JSON.parse(await zip.file('manifest.json').async('string'));

      // 3. Clear existing state to simulate opening in a fresh/other session
      t.patchCase({ wards: [], parties: [] });

      // 4. Load from zip -- triggers loadCaseFileFromZip and backfillWardPartyCounties()
      await t.importArchive(zip, manifest, null);

      const caseFile = t.snapshot().caseFile;
      const reconstructedParty = t.sharedRecords.wardPartyForFiling(caseFile.wards[0].wardId);
      return {
        hadPartiesInZip: partiesEntry !== null,
        partyCount: caseFile.parties.length,
        reconstructedName: reconstructedParty?.name,
        reconstructedCounty: reconstructedParty?.county,
        reconstructedRole: reconstructedParty?.roles,
        reconstructedPartyId: reconstructedParty?.id,
        sourceId: caseFile.wards[0].wardId,
      };
    });

    expect(result.hadPartiesInZip).toBe(false);
    expect(result.partyCount).toBe(1);
    expect(result.reconstructedName).toBe('Reconstructed Ward');
    expect(result.reconstructedCounty).toBe('Orange');
    expect(result.reconstructedRole).toContain('ward');

    // The next filing for this ward, through the real Add Filing dialog
    // carrying over from the reopened one, inherits the reconstructed Party
    // and its county (Milestone 40C-A). (Milestone 51B made this
    // carryOverFields(), the real carry-over entry point; since Milestone 70's
    // 70T it goes through the dialog that calls it.)
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.openDialog('planInitial'));
    await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
    await page.fill('#new-ward-name', 'Reconstructed Ward');
    await page.selectOption('#carry-source-ward', result.sourceId);
    await page.click('#addWardModal [data-modal-action="add-ward"]');
    await page.locator('#addWardModal').waitFor({ state: 'hidden' });
    const nextFiling = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing);
    expect(nextFiling.county).toBe('Orange');
    expect(nextFiling.wardPartyId).toBe(result.reconstructedPartyId);
  });

  test('single-ward .sav export with no county gets no reconstructed Party -- backfill never manufactures identity the export never carried', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const t = (window as any).GuardianForms.testing;

      // A ward with no county at all -- the ordinary shape of a legacy
      // archive that never went through the Cover county combobox.
      const wardId = 'ward-no-county-1';
      t.seedFiling({ wardId, wardName: 'No County Ward', inventoryType: 'annual', county: '' });

      // No Party is created for it at all -- this ward genuinely has none.
      const blob = await t.exportArchive.singleFiling(wardId);
      const zip = await (window as any).JSZip.loadAsync(blob);
      const manifest = JSON.parse(await zip.file('manifest.json').async('string'));

      t.patchCase({ wards: [], parties: [] });

      await t.importArchive(zip, manifest, null);

      const caseFile = t.snapshot().caseFile;
      return {
        partyCount: caseFile.parties.length,
        reconstructedParty: t.sharedRecords.wardPartyForFiling(caseFile.wards[0].wardId),
      };
    });

    expect(result.partyCount).toBe(0);
    expect(result.reconstructedParty).toBeFalsy();
  });
});
