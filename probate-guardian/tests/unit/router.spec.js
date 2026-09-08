import { describe, expect, test, beforeEach, vi } from 'vitest';
import {
  navigate,
  registerRoute,
  getCurrentPage,
  setCurrentPage,
  addBeforeNavigateHook,
  addAfterNavigateHook,
} from '../../src/core/navigation/router.js';

describe('navigation router services', () => {
  beforeEach(() => {
    setCurrentPage('/dashboard');
  });

  test('getCurrentPage and setCurrentPage maintain active route', () => {
    expect(getCurrentPage()).toBe('/dashboard');
    setCurrentPage('/inventory-select');
    expect(getCurrentPage()).toBe('/inventory-select');
  });

  test('registerRoute dispatches to custom route handlers', async () => {
    const handler = vi.fn().mockResolvedValue('rendered-custom');
    registerRoute('/custom-test', handler);

    const result = await navigate('/custom-test');
    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledWith('/custom-test');
    expect(getCurrentPage()).toBe('/custom-test');
  });

  test('beforeNavigate hook can intercept and cancel navigation', async () => {
    const targetHandler = vi.fn();
    registerRoute('/blocked-route', targetHandler);

    const unsubscribe = addBeforeNavigateHook((toPage) => {
      if (toPage === '/blocked-route') return false;
      return true;
    });

    const result = await navigate('/blocked-route');
    expect(result).toBe(false);
    expect(targetHandler).not.toHaveBeenCalled();
    expect(getCurrentPage()).toBe('/dashboard'); // remained on previous page!

    unsubscribe();
  });

  test('afterNavigate hook triggers upon completed navigation', async () => {
    const afterFn = vi.fn();
    const unsubscribe = addAfterNavigateHook(afterFn);

    registerRoute('/allowed-route', vi.fn().mockResolvedValue(true));
    const result = await navigate('/allowed-route');

    expect(result).toBe(true);
    expect(afterFn).toHaveBeenCalledWith('/allowed-route', '/dashboard');

    unsubscribe();
  });
});
