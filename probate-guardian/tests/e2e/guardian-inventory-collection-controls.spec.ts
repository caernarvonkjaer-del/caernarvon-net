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
import { freshStartNoPassword, createWard, confirmRemoveIfAsked } from './support/target';

const GUARDIAN_ROUTE = '/d1';
const RECIPIENT_ROUTE = '/d5';
const COVER_ROUTE = '/';

async function goto(page: import('@playwright/test').Page, route: string) {
  await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
}

// Milestone 73K part 2: after "+ Add" the cursor is in the new card's first
// box, which is empty. These tests then set names behind the page (setup,
// D9); the box would write its empty value back over them when the page is
// next drawn. A filer types into the box itself, so the two never disagree --
// the cursor is taken out first, as a click elsewhere would.
async function releaseCursor(page: import('@playwright/test').Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
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
    await releaseCursor(page);
    await page.evaluate(() => { (window as any).GuardianForms.testing.patchFiling({ 'guardians.1.name': 'Second Guardian' }); });
    await goto(page, GUARDIAN_ROUTE);

    await addCo.click();
    await expect(removeCo).toHaveCount(2);

    // Max three guardians -- the Add button stops rendering rather than erroring.
    await expect(addCo).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('guardians.length'))).toBe(3);
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
  //
  // Milestone 73C (2026-10-05): D-1 no longer drops blank co-guardian cards when
  // the page is drawn -- that tidy-up was also what made a new card vanish at
  // its next redraw -- so a second click now shows a second card, as on the
  // Annual and the Simplified, and leaving the page removes the untouched ones.
  // What this test protects is unchanged: no card the button made vanishes, and
  // what is rendered and what is stored agree.
  test('co-guardians: adding twice with nothing typed leaves both cards, and leaving the page removes them', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');
    await goto(page, GUARDIAN_ROUTE);

    const addCo = page.locator('[data-inventory-action="add-guardian"]');
    const removeCo = page.locator('[data-inventory-action="remove-guardian"]');

    await addCo.click();
    await expect(removeCo).toHaveCount(1);

    // Second click, still nothing typed into the first co-guardian.
    await addCo.click();
    await expect(removeCo, 'neither co-guardian card vanishes on a second add').toHaveCount(2);

    // The store must not hold rows the page doesn't show: what is rendered and
    // what is stored have to agree.
    const rendered = () => page.evaluate(() => ({
      stored: (window as any).GuardianForms.testing.field('guardians.length'),
      rendered: document.querySelectorAll('[data-inventory-action="remove-guardian"]').length + 1,
    }));
    let state = await rendered();
    expect(state.stored, 'stored guardian rows must match the rendered cards').toBe(state.rendered);

    // Leaving the page removes both untouched cards; coming back, the two agree.
    await goto(page, COVER_ROUTE);
    await goto(page, GUARDIAN_ROUTE);
    await expect(removeCo).toHaveCount(0);
    state = await rendered();
    expect(state).toEqual({ stored: 1, rendered: 1 });
  });

  test('co-guardians: Remove drops the chosen row and leaves the others intact', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');
    await goto(page, GUARDIAN_ROUTE);

    // Build three guardians that all carry data, so none is pruned.
    await page.locator('[data-inventory-action="add-guardian"]').click();
    await releaseCursor(page);
    await page.evaluate(() => { (window as any).GuardianForms.testing.patchFiling({ 'guardians.1.name': 'Second Guardian' }); });
    await goto(page, GUARDIAN_ROUTE);
    await page.locator('[data-inventory-action="add-guardian"]').click();
    await releaseCursor(page);
    await page.evaluate(() => {
      const d = (window as any).GuardianForms.testing.snapshot().filing;
      d.guardians[0].name = 'First Guardian';
      d.guardians[2].name = 'Third Guardian';
      (window as any).GuardianForms.testing.replaceFiling(d); // setup (D9)
    });
    await goto(page, GUARDIAN_ROUTE);

    await expect(page.locator('[data-inventory-action="remove-guardian"]')).toHaveCount(2);

    // Remove buttons render for every card but the first, so the first button
    // belongs to guardians[1].
    await page.locator('[data-inventory-action="remove-guardian"]').first().click();
    await confirmRemoveIfAsked(page); // 73P: Remove asks first

    const names = await page.evaluate(() => (window as any).GuardianForms.testing.field('guardians').map((g: any) => g.name));
    expect(names).toEqual(['First Guardian', 'Third Guardian']);
    await expect(page.locator('[data-inventory-action="remove-guardian"]')).toHaveCount(1);
  });

  test('co-guardians: Remove keeps guardianPartyIds aligned with the rows', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Collection Controls Ward', 'guardian');
    await goto(page, GUARDIAN_ROUTE);

    await page.locator('[data-inventory-action="add-guardian"]').click();
    await releaseCursor(page);
    await page.evaluate(() => { (window as any).GuardianForms.testing.patchFiling({ 'guardians.1.name': 'Second Guardian' }); });
    await goto(page, GUARDIAN_ROUTE);
    await page.locator('[data-inventory-action="add-guardian"]').click();
    // AGENTS.md section 6: deleting a guardian must cleanly unlink its partyId
    // rather than leave the array shifted against the rows.
    await releaseCursor(page);
    await page.evaluate(() => {
      const d = (window as any).GuardianForms.testing.snapshot().filing;
      d.guardians[2].name = 'Third Guardian';
      d.guardianPartyIds = ['p-zero', 'p-one', 'p-two'];
      (window as any).GuardianForms.testing.replaceFiling(d); // setup (D9)
    });
    await goto(page, GUARDIAN_ROUTE);

    await page.locator('[data-inventory-action="remove-guardian"]').first().click();
    await confirmRemoveIfAsked(page); // 73P: Remove asks first

    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('guardianPartyIds'))).toEqual(['p-zero', 'p-two']);
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
    // 2026-09-24 on master, and on this branch until Milestone 70's 70C;
    // tests/e2e/blank-card-pruning.spec.ts), and first recorded the untrimmed
    // two. Remove renders on every row while more than one remains. (Carried
    // from master's b28bf25.)
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('serviceRecipients.length'))).toBe(1);
    await expect(removeRecipient).toHaveCount(0);

    await addRecipient.click();
    await addRecipient.click();
    await expect(removeRecipient).toHaveCount(3);

    await releaseCursor(page);
    await page.evaluate(() => {
      const d = (window as any).GuardianForms.testing.snapshot().filing;
      d.serviceRecipients[0].name = 'Recipient One';
      d.serviceRecipients[1].name = 'Recipient Two';
      d.serviceRecipients[2].name = 'Recipient Three';
      (window as any).GuardianForms.testing.replaceFiling(d); // setup (D9)
    });
    await goto(page, RECIPIENT_ROUTE);

    // Named rows survive the re-render each handler triggers; the clean-up
    // only ever removes rows nobody typed into.
    await removeRecipient.nth(1).click();
    await confirmRemoveIfAsked(page); // 73P: Remove asks first

    const names = await page.evaluate(() => (window as any).GuardianForms.testing.field('serviceRecipients').map((r: any) => r.name));
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
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('serviceRecipients.length'))).toBe(4);
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

    await releaseCursor(page);
    await page.evaluate(() => {
      const d = (window as any).GuardianForms.testing.snapshot().filing;
      d.witnesses[0].name = 'Witness One';
      d.witnesses[1].name = 'Witness Two';
      (window as any).GuardianForms.testing.replaceFiling(d); // setup (D9)
    });
    await goto(page, COVER_ROUTE);

    // Values survive the re-render every add/remove triggers.
    const before = await page.evaluate(() => (window as any).GuardianForms.testing.field('witnesses').map((w: any) => w.name));
    expect(before).toEqual(['Witness One', 'Witness Two']);

    await removeWitness.first().click();
    await confirmRemoveIfAsked(page); // 73P: Remove asks first

    const after = await page.evaluate(() => (window as any).GuardianForms.testing.field('witnesses').map((w: any) => w.name));
    expect(after).toEqual(['Witness Two']);
    await expect(removeWitness).toHaveCount(1);
  });

  // The pin that 51E's eleven deleted window.* bridges stay deleted (and its
  // three kept ones stay published) lives in tests/unit/removed-window-bridges.spec.js
  // since Milestone 70's 70T: a browser spec now names no app global but
  // GuardianForms, not even to prove one absent.
});
