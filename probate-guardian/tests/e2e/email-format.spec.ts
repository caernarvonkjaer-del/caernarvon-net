import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 74G (decision 74G-5, the requester, 2026-10-06; QA report
// BUG-17): an e-mail box holding text that isn't an address -- "rnguyen@",
// which printed on the filed PDF as the address for service -- says so
// beside the box as the filer leaves it, still says so when the page is
// drawn again, and is named before filing, an error the filer can override.
// A complete address takes the message away. The check itself, on every
// form's e-mail boxes, is tests/unit/date-and-email-checks.spec.js.

const MESSAGE = 'Enter a complete e-mail address, such as name@example.com';

test("the Inventory's D-2: an address that isn't one is said beside the box and named before filing", async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Email Format Ward', 'guardian');
  const go = (route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
  const named = () => page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.evaluate()).blockers
    .filter((i: any) => i.code === 'field.email.malformed').map((i: any) => [i.path, i.route, i.message]));
  const box = () => page.locator('#main-content input[data-bind="attorney.email"]');
  const message = page.locator('#main-content [data-email-feedback="true"]');

  await go('/d2');
  await box().fill('rnguyen@');
  await box().blur();
  await expect(box()).toHaveAttribute('aria-invalid', 'true');
  await expect(message).toHaveText(MESSAGE);
  expect(await named()).toEqual([[
    'attorney.email', '/d2',
    `D-2 Attorney — Primary Email: "rnguyen@" is not a complete e-mail address. ${MESSAGE}.`,
  ]]);

  // Drawn again later, the box still says so.
  await go('/');
  await go('/d2');
  await expect(box()).toHaveAttribute('aria-invalid', 'true');
  await expect(message).toHaveText(MESSAGE);

  // A complete address takes the message, and the error, away.
  await box().fill('rnguyen@firm.com');
  await box().blur();
  await expect(box()).not.toHaveAttribute('aria-invalid', 'true');
  await expect(message).toHaveCount(0);
  expect(await named()).toEqual([]);
});
