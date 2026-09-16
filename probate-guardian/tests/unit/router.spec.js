import { describe, expect, test, beforeEach } from 'vitest';
import {
  navigate,
  getCurrentPage,
  setCurrentPage,
} from '../../src/core/navigation/router.js';

// Milestone 51B: three tests were removed here along with the exports they
// covered -- registerRoute(), addBeforeNavigateHook() and addAfterNavigateHook().
// All three were dead in production: nothing outside this file ever registered a
// hook or a custom route. They were also self-referential -- each registered a
// custom route purely to give navigate() somewhere to go, then asserted the hook
// mechanism against it -- so they exercised no route this app actually serves and
// their deletion loses no coverage of live behavior.
//
// navigate()'s own contract was only covered incidentally by those tests, so the
// last test below now covers it directly. Real route rendering is a DOM concern
// and is covered in tests/e2e/routes.spec.ts; these unit tests run in plain Node
// with no document, where renderPage() early-returns by design.
describe('navigation router services', () => {
  beforeEach(() => {
    setCurrentPage('/dashboard');
  });

  test('getCurrentPage and setCurrentPage maintain active route', () => {
    expect(getCurrentPage()).toBe('/dashboard');
    setCurrentPage('/inventory-select');
    expect(getCurrentPage()).toBe('/inventory-select');
  });

  test('navigate() advances the active route and reports success', async () => {
    expect(getCurrentPage()).toBe('/dashboard');

    const result = await navigate('/p1', { updateHash: false });

    expect(result).toBe(true);
    expect(getCurrentPage()).toBe('/p1');
  });

  test('navigate() to the current route is still reported as success', async () => {
    setCurrentPage('/p1');
    const result = await navigate('/p1', { updateHash: false });
    expect(result).toBe(true);
    expect(getCurrentPage()).toBe('/p1');
  });
});
