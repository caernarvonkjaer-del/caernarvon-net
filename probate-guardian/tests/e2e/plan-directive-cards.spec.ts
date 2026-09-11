import { test, expect } from '@playwright/test';
import { createWard, freshStartNoPassword } from './support/target';

// Milestone 37-4 (see MILESTONE-37-PROPOSAL.md): the advance-directive
// detail-card collection on Initial and Annual Plan must start empty, be
// created (not pre-seeded) only once the execution checkbox is checked, and
// preserve already-entered records across uncheck/recheck rather than
// deleting them. This drives the live checkbox -> re-render -> auto-create
// wiring through the real UI, which the unit-level readiness/PDF-model
// suites (plan-directive-cards.spec.js) can't exercise on their own.

test('Plan Initial: directive cards are created on check, hidden (not deleted) on uncheck, and Add/Remove work', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Initial Directive Ward', 'planInitial');
  await page.evaluate(() => (window as any).navigate('/p8'));

  const executedCheckbox = page.locator('#q11Executed');
  const cards = page.locator('.schedule-entry-grid > .col-12 > .entry-card');
  const typeCheckbox = page.locator('#q11ExecDNR');

  // Unchecked: no type controls, no cards, no Add Directive button.
  await expect(typeCheckbox).toHaveCount(0);
  await expect(cards).toHaveCount(0);
  await expect(page.getByRole('button', { name: '+ Add Directive' })).toHaveCount(0);

  // Check it: type controls appear, and exactly one blank card is created
  // immediately (not left for the user to press Add Directive for).
  await executedCheckbox.check();
  await expect(typeCheckbox).toHaveCount(1);
  await expect(cards).toHaveCount(1);

  // Fill the card so we can prove it survives a hide/reveal cycle.
  await page.fill('[data-form-path="q11Directives.0.title"]', 'Healthcare Surrogate');
  await page.locator('[data-form-path="q11Directives.0.title"]').blur();

  // Uncheck: cards and type controls hide, but the data is not deleted.
  await executedCheckbox.uncheck();
  await expect(cards).toHaveCount(0);
  await expect(typeCheckbox).toHaveCount(0);
  await expect(await page.evaluate(() => (window as any).D.q11Directives[0].title)).toBe('Healthcare Surrogate');

  // Recheck: the same populated record reappears rather than a fresh blank
  // one, and checking again does not add a second blank card on top of it.
  await executedCheckbox.check();
  await expect(cards).toHaveCount(1);
  await expect(page.locator('[data-form-path="q11Directives.0.title"]')).toHaveValue('Healthcare Surrogate');

  // Add Directive appends a second blank card without disturbing the first.
  await page.getByRole('button', { name: '+ Add Directive' }).click();
  await expect(cards).toHaveCount(2);
  await expect(page.locator('[data-form-path="q11Directives.0.title"]')).toHaveValue('Healthcare Surrogate');

  // Remove takes the collection back down to one.
  await page.locator('button', { hasText: '✕ Remove' }).last().click();
  await expect(cards).toHaveCount(1);
  await expect(page.locator('[data-form-path="q11Directives.0.title"]')).toHaveValue('Healthcare Surrogate');
});

test('Plan Annual: directive collection starts empty and checking the box creates one card', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Annual Directive Ward', 'planAnnual');
  await page.evaluate(() => (window as any).navigate('/p9'));

  const executedCheckbox = page.locator('#q10Executed');
  const cards = page.locator('.schedule-entry-grid > .col-12 > .entry-card');

  await expect(cards).toHaveCount(0);
  await expect(page.getByRole('button', { name: '+ Add Directive' })).toHaveCount(0);

  await executedCheckbox.check();
  await expect(cards).toHaveCount(1);

  await executedCheckbox.uncheck();
  await expect(cards).toHaveCount(0);
  await executedCheckbox.check();
  // Rechecking with the existing (still-blank, untouched) row present must
  // not append a second blank card on top of it.
  await expect(cards).toHaveCount(1);
});
