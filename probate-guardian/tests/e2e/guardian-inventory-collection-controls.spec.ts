// Milestone 51E: Initial Inventory's co-guardian, service-recipient and
// inventory-witness Add/Remove controls.
//
// Written because 51E deleted 11 of this feature's 14 `window.*` bridge
// assignments, and five of the handlers behind them -- remove-guardian,
// add-recipient, remove-recipient, add-witness, remove-witness -- had no e2e
// coverage at all. The functions are dispatched internally through
// `data-inventory-action` rather than through the bridges, so removing the
// globals should not affect them; but "should not" was the whole of the
// argument, and the failure mode is a click that silently does nothing, which
// no existing test would have caught.
//
// These assert the collection round-trips through the real DOM controls: the
// card count changes, entered data survives re-render (the handlers all call
// renderPage(), so a card container is rebuilt on every add/remove), and the
// documented maximums and the protected first row behave as the source says.
import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

const GUARDIAN_ROUTE = '/d1';
const RECIPIENT_ROUTE = '/d5';
const COVER_ROUTE = '/';

async function goto(page: import('@playwright/test').Page, route: string) {
  await page.evaluate((r) => (window as any).navigate(r), route);
}

test.describe('Milestone 51E: Initial Inventory collection Add/Remove controls', () => {
  test('co-guardians: adding accumulates rows once each is given data, up to the maximum of three', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');
    await goto(page, GUARDIAN_ROUTE);

    const addCo = page.locator('[data-inventory-action="add-guardian"]');
    const removeCo = page.locator('[data-inventory-action="remove-guardian"]');

    // One guardian card by default (AGENTS.md section 3: initial_item_count 1),
    // and Guardian #1 is never removable -- it is required.
    await expect(addCo).toBeVisible();
    await expect(removeCo).toHaveCount(0);

    await addCo.click();
    await expect(removeCo).toHaveCount(1);

    // normalizeGuardians() prunes a co-guardian row that has no data, so a row
    // must be given data before the next one is added. This is the ordinary user
    // flow (type a name, then add another), and asserting it here pins the
    // pruning rule alongside the Add/Remove handlers it interacts with.
    await page.evaluate(() => { (window as any).D.guardians[1].name = 'Second Guardian'; });
    await goto(page, GUARDIAN_ROUTE);

    await addCo.click();
    await expect(removeCo).toHaveCount(2);

    // Max three guardians -- the Add button stops rendering rather than erroring.
    await expect(addCo).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).D.guardians.length)).toBe(3);
  });

  // Milestone 51H regression test. Written red: before the fix, clicking
  // "+ Add Co-Guardian" a second time without typing anything made the
  // co-guardian card DISAPPEAR. addGuardian() recorded pendingGuardianIndex as the
  // pre-push length, normalizeGuardians() then pruned the earlier blank row and
  // REINDEXED D.guardians, but visiblePendingGuardianIndex still held the
  // pre-prune index -- so pageD1()'s filter matched no row for the guardian that
  // had just been added, while D.guardians silently kept an extra blank entry.
  //
  // The user-visible symptom was a button that appeared to delete the card it had
  // just created, with no error anywhere.
  test('co-guardians: adding twice with nothing typed still leaves exactly one co-guardian card', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');
    await goto(page, GUARDIAN_ROUTE);

    const addCo = page.locator('[data-inventory-action="add-guardian"]');
    const removeCo = page.locator('[data-inventory-action="remove-guardian"]');

    await addCo.click();
    await expect(removeCo).toHaveCount(1);

    // Second click, still nothing typed into the first co-guardian.
    await addCo.click();

    // The blank row is pruned (by design) and the newly added one takes its place,
    // so the count stays at one rather than dropping to zero.
    await expect(removeCo, 'the co-guardian card must not vanish on a second add').toHaveCount(1);

    // And the store must not accumulate invisible blank rows behind the UI: what
    // is rendered and what is stored have to agree.
    const state = await page.evaluate(() => ({
      stored: (window as any).D.guardians.length,
      rendered: document.querySelectorAll('[data-inventory-action="remove-guardian"]').length + 1,
    }));
    expect(state.stored, 'stored guardian rows must match the rendered cards').toBe(state.rendered);
  });

  test('co-guardians: Remove drops the chosen row and leaves the others intact', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');
    await goto(page, GUARDIAN_ROUTE);

    // Build three guardians that all carry data, so none is pruned.
    await page.locator('[data-inventory-action="add-guardian"]').click();
    await page.evaluate(() => { (window as any).D.guardians[1].name = 'Second Guardian'; });
    await goto(page, GUARDIAN_ROUTE);
    await page.locator('[data-inventory-action="add-guardian"]').click();
    await page.evaluate(() => {
      const d = (window as any).D;
      d.guardians[0].name = 'First Guardian';
      d.guardians[2].name = 'Third Guardian';
    });
    await goto(page, GUARDIAN_ROUTE);

    await expect(page.locator('[data-inventory-action="remove-guardian"]')).toHaveCount(2);

    // Remove buttons render for every card but the first, so the first button
    // belongs to guardians[1].
    await page.locator('[data-inventory-action="remove-guardian"]').first().click();

    const names = await page.evaluate(() => (window as any).D.guardians.map((g: any) => g.name));
    expect(names).toEqual(['First Guardian', 'Third Guardian']);
    await expect(page.locator('[data-inventory-action="remove-guardian"]')).toHaveCount(1);
  });

  test('co-guardians: Remove keeps guardianPartyIds aligned with the rows', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');
    await goto(page, GUARDIAN_ROUTE);

    await page.locator('[data-inventory-action="add-guardian"]').click();
    await page.evaluate(() => { (window as any).D.guardians[1].name = 'Second Guardian'; });
    await goto(page, GUARDIAN_ROUTE);
    await page.locator('[data-inventory-action="add-guardian"]').click();
    // AGENTS.md section 6: deleting a guardian must cleanly unlink its partyId
    // rather than leave the array shifted against the rows.
    await page.evaluate(() => {
      const d = (window as any).D;
      d.guardians[2].name = 'Third Guardian';
      d.guardianPartyIds = ['p-zero', 'p-one', 'p-two'];
    });
    await goto(page, GUARDIAN_ROUTE);

    await page.locator('[data-inventory-action="remove-guardian"]').first().click();

    expect(await page.evaluate(() => (window as any).D.guardianPartyIds)).toEqual(['p-zero', 'p-two']);
  });

  test('service recipients: add and remove round-trip and preserve entered names', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');
    await goto(page, RECIPIENT_ROUTE);

    const addRecipient = page.locator('[data-inventory-action="add-recipient"]');
    const removeRecipient = page.locator('[data-inventory-action="remove-recipient"]');

    // A new Inventory seeds two blank recipient rows, and leaving a page trims
    // untouched ones to the one card the page always keeps (blank-card
    // clean-up, src/core/form/prune-cards.js). This test was written on
    // 2026-09-15, while that clean-up was not running (2026-09-13 to
    // 2026-09-24; tests/e2e/blank-card-pruning.spec.ts), and first recorded
    // the untrimmed two. Remove renders on every row while more than one
    // remains.
    expect(await page.evaluate(() => (window as any).D.serviceRecipients.length)).toBe(1);
    await expect(removeRecipient).toHaveCount(0);

    await addRecipient.click();
    await addRecipient.click();
    await expect(removeRecipient).toHaveCount(3);

    await page.evaluate(() => {
      const d = (window as any).D;
      d.serviceRecipients[0].name = 'Recipient One';
      d.serviceRecipients[1].name = 'Recipient Two';
      d.serviceRecipients[2].name = 'Recipient Three';
    });
    await goto(page, RECIPIENT_ROUTE);

    // Named rows survive the re-render each handler triggers; the clean-up
    // only ever removes rows nobody typed into.
    await removeRecipient.nth(1).click();

    const names = await page.evaluate(() => (window as any).D.serviceRecipients.map((r: any) => r.name));
    expect(names).toEqual(['Recipient One', 'Recipient Three']);
    await expect(removeRecipient).toHaveCount(2);
  });

  test('service recipients: stop at the documented maximum of four', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');
    await goto(page, RECIPIENT_ROUTE);

    const addRecipient = page.locator('[data-inventory-action="add-recipient"]');
    // One card after the clean-up (see the test above), so three adds reach
    // the maximum of four.
    await addRecipient.click();
    await addRecipient.click();
    await addRecipient.click();

    await expect(addRecipient).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).D.serviceRecipients.length)).toBe(4);
  });

  test('inventory witnesses: add, keep entered values, and remove the chosen row', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');
    await goto(page, COVER_ROUTE);

    const addWitness = page.locator('[data-inventory-action="add-witness"]');
    const removeWitness = page.locator('[data-inventory-action="remove-witness"]');

    // Witnesses start at zero -- they are not a defaulted collection.
    await expect(addWitness).toBeVisible();
    await expect(removeWitness).toHaveCount(0);

    await addWitness.click();
    await expect(removeWitness).toHaveCount(1);
    await addWitness.click();
    await expect(removeWitness).toHaveCount(2);

    await page.evaluate(() => {
      const d = (window as any).D;
      d.witnesses[0].name = 'Witness One';
      d.witnesses[1].name = 'Witness Two';
    });
    await goto(page, COVER_ROUTE);

    // Values survive the re-render every add/remove triggers.
    const before = await page.evaluate(() => (window as any).D.witnesses.map((w: any) => w.name));
    expect(before).toEqual(['Witness One', 'Witness Two']);

    await removeWitness.first().click();

    const after = await page.evaluate(() => (window as any).D.witnesses.map((w: any) => w.name));
    expect(after).toEqual(['Witness Two']);
    await expect(removeWitness).toHaveCount(1);
  });

  test('none of these controls rely on a window.* bridge that Milestone 51E removed', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');

    // The 11 deleted bridges must genuinely be gone from the global surface,
    // while the three deliberately-kept ones remain. This pins the decision so
    // a later "restore the bridges" edit has to be deliberate.
    const surface = await page.evaluate(() => {
      const w = window as any;
      const names = ['addGuardian', 'removeGuardian', 'addRecipient', 'removeRecipient',
        'addWitness', 'removeWitness', 'syncB2VehicleDescription', 'toggleB2Vehicle',
        'setScheduleNoItems', 'removeEntry', 'pageNav'];
      const kept = ['addEntry', 'duplicateEntry', 'validateGuardian'];
      return {
        stillPresent: names.filter(n => typeof w[n] === 'function'),
        keptMissing: kept.filter(n => typeof w[n] !== 'function'),
      };
    });

    expect(surface.stillPresent, 'bridges 51E deleted must not be back').toEqual([]);
    expect(surface.keptMissing, 'bridges 51E deliberately kept must still be there').toEqual([]);
  });
});
