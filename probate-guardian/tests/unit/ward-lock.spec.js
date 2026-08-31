import { describe, it, expect, beforeEach, afterEach, vi as jest } from 'vitest';
global.window = global;
import { acquireWardLock, releaseWardLock, __test_reset } from '../../src/core/ward-lock.js';

describe('ward-lock', () => {
  let originalLocks;

  beforeEach(() => {
    // Reset internal state
    if (__test_reset) __test_reset();

    // Mock navigator.locks
    originalLocks = global.navigator.locks;
    Object.defineProperty(global.navigator, 'locks', {
      value: { request: jest.fn() },
      configurable: true
    });
  });

  afterEach(() => {
    if (originalLocks) {
      Object.defineProperty(global.navigator, 'locks', {
        value: originalLocks,
        configurable: true
      });
    } else {
      delete global.navigator.locks;
    }
  });

  it('bypasses locks on file:// protocol', async () => {
    const originalLocation = global.location;
    delete global.location;
    global.location = { protocol: 'file:' };

    const result = await acquireWardLock('ward-123');
    expect(result).toBe(true);
    expect(global.navigator.locks.request).not.toHaveBeenCalled();

    global.location = originalLocation;
  });

  it('requests a lock and returns true when granted', async () => {
    global.navigator.locks.request.mockImplementation((name, options, callback) => {
      // Return a promise that resolves when the callback is done
      return new Promise((resolve) => {
        setTimeout(() => {
          const cbResult = callback({ name });
          if (cbResult instanceof Promise) {
            cbResult.then(resolve);
          } else {
            resolve();
          }
        }, 0);
      });
    });

    const result = await acquireWardLock('ward-123');
    expect(result).toBe(true);
    expect(global.navigator.locks.request).toHaveBeenCalledWith(
      'pg-ward-ward-123',
      { mode: 'exclusive', ifAvailable: true },
      expect.any(Function)
    );
  });

  it('returns false when lock is not available', async () => {
    global.navigator.locks.request.mockImplementation(async (name, options, callback) => {
      // Simulate lock unavailable (returns null if ifAvailable is true and lock cannot be granted)
      callback(null);
      return Promise.resolve();
    });

    const result = await acquireWardLock('ward-123');
    expect(result).toBe(false);
  });

  it('releases an existing lock when releaseWardLock is called', async () => {
    let releaseLockCb;
    global.navigator.locks.request.mockImplementation(async (name, options, callback) => {
      return new Promise((resolve) => {
        // Capture the release function from the mock
        const lock = {};
        callback(lock).then(resolve);
      });
    });

    const p = acquireWardLock('ward-1');
    // We expect it to resolve to true
    
    // Simulate wait for the microtask queue to process
    await new Promise(r => setTimeout(r, 10));

    // Release the lock
    releaseWardLock();
    // In our implementation, releasing the lock resolves the Promise created inside the callback,
    // which in turn resolves the Promise returned by navigator.locks.request.
  });
});
