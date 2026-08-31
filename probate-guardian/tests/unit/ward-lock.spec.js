import { describe, it, expect, beforeEach, afterEach, vi as jest } from 'vitest';
global.window = global;
import { acquireWardLock, releaseWardLock, getCurrentLockedWardId, __test_reset } from '../../src/core/ward-lock.js';

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

  it('bypasses locks when navigator.locks is absent', async () => {
    delete global.navigator.locks;
    const result = await acquireWardLock('ward-123');
    expect(result).toBe(true);
  });

  it('requests a lock and returns true when granted', async () => {
    global.navigator.locks.request.mockImplementation((name, options, callback) => {
      return new Promise((resolve) => {
        const holdPromise = callback({ name });
        if (holdPromise instanceof Promise) {
          holdPromise.then(resolve);
        } else {
          resolve();
        }
      });
    });

    const result = await acquireWardLock('ward-123');
    expect(result).toBe(true);
    expect(getCurrentLockedWardId()).toBe('ward-123');
    expect(global.navigator.locks.request).toHaveBeenCalledWith(
      'pg-ward-ward-123',
      { mode: 'exclusive', ifAvailable: true },
      expect.any(Function)
    );
  });

  it('fast-paths to true when already holding the lock for the same ward', async () => {
    global.navigator.locks.request.mockImplementation((name, options, callback) => {
      return new Promise((resolve) => {
        const holdPromise = callback({ name });
        if (holdPromise instanceof Promise) {
          holdPromise.then(resolve);
        } else {
          resolve();
        }
      });
    });

    const first = await acquireWardLock('ward-123');
    expect(first).toBe(true);
    expect(global.navigator.locks.request).toHaveBeenCalledTimes(1);

    const second = await acquireWardLock('ward-123');
    expect(second).toBe(true);
    expect(global.navigator.locks.request).toHaveBeenCalledTimes(1); // No second request
  });

  it('returns false when lock is not available (contention)', async () => {
    global.navigator.locks.request.mockImplementation(async (name, options, callback) => {
      callback(null);
      return Promise.resolve();
    });

    const result = await acquireWardLock('ward-123');
    expect(result).toBe(false);
    expect(getCurrentLockedWardId()).toBe(null);
  });

  it('fails open (returns true + console.warn) on API exceptions / rejections', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.navigator.locks.request.mockRejectedValue(new Error('SecurityError: Locks disabled'));

    const result = await acquireWardLock('ward-123');
    expect(result).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('releases an existing lock deterministically', async () => {
    let callbackFinished = false;
    global.navigator.locks.request.mockImplementation((name, options, callback) => {
      return new Promise((resolve) => {
        const holdPromise = callback({ name });
        holdPromise.then(() => {
          callbackFinished = true;
          resolve();
        });
      });
    });

    await acquireWardLock('ward-1');
    expect(getCurrentLockedWardId()).toBe('ward-1');
    expect(callbackFinished).toBe(false);

    await releaseWardLock();
    expect(callbackFinished).toBe(true);
    expect(getCurrentLockedWardId()).toBe(null);
  });

  it('is idempotent when releaseWardLock is called multiple times or when no lock is held', async () => {
    await expect(releaseWardLock()).resolves.toBeUndefined();
    await expect(releaseWardLock()).resolves.toBeUndefined();
  });

  it('serializes rapid consecutive acquire/release transitions', async () => {
    global.navigator.locks.request.mockImplementation((name, options, callback) => {
      return new Promise((resolve) => {
        const holdPromise = callback({ name });
        if (holdPromise instanceof Promise) {
          holdPromise.then(resolve);
        } else {
          resolve();
        }
      });
    });

    const p1 = acquireWardLock('ward-A');
    const p2 = acquireWardLock('ward-B');
    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1).toBe(true);
    expect(res2).toBe(true);
    expect(getCurrentLockedWardId()).toBe('ward-B');
  });
});
