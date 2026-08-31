// Ward-Level Tab Lock Module (Milestone 16)
// Provides exclusive, cooperative locking per ward across browser tabs using the Web Locks API.

let currentHeldRelease = null;
let currentHeldWardId = null;
let currentOuterRequestPromise = null;
let transitionQueue = Promise.resolve();

export function getCurrentLockedWardId() {
  return currentHeldWardId;
}

export function __test_reset() {
  currentHeldRelease = null;
  currentHeldWardId = null;
  currentOuterRequestPromise = null;
  transitionQueue = Promise.resolve();
}

export async function releaseWardLock() {
  return (transitionQueue = transitionQueue.then(async () => {
    if (!currentHeldRelease) {
      currentHeldWardId = null;
      currentOuterRequestPromise = null;
      return;
    }

    const releaseFn = currentHeldRelease;
    const outerPromise = currentOuterRequestPromise;

    currentHeldRelease = null;
    currentHeldWardId = null;
    currentOuterRequestPromise = null;

    releaseFn();
    try {
      await outerPromise;
    } catch (e) {
      // Ignore errors on release
    }
  }));
}

export async function acquireWardLock(wardId) {
  return (transitionQueue = transitionQueue.then(async () => {
    // 1. file:// protocol bypass
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      return true;
    }

    // 2. navigator.locks unavailable bypass
    if (typeof navigator === 'undefined' || !navigator.locks || typeof navigator.locks.request !== 'function') {
      return true;
    }

    // 3. Fast-path: already held in this tab
    if (currentHeldWardId === wardId && currentHeldRelease) {
      return true;
    }

    // 4. If holding another ward, release it first
    if (currentHeldRelease) {
      const releaseFn = currentHeldRelease;
      const outerPromise = currentOuterRequestPromise;
      currentHeldRelease = null;
      currentHeldWardId = null;
      currentOuterRequestPromise = null;
      releaseFn();
      try {
        await outerPromise;
      } catch (e) {}
    }

    let decisionResolve;
    const decisionPromise = new Promise((resolve) => {
      decisionResolve = resolve;
    });

    try {
      const outerPromise = navigator.locks.request(
        `pg-ward-${wardId}`,
        { mode: 'exclusive', ifAvailable: true },
        (lock) => {
          if (!lock) {
            // Contention: lock held by another tab
            decisionResolve(false);
            return;
          }

          return new Promise((resolveHold) => {
            currentHeldRelease = resolveHold;
            currentHeldWardId = wardId;
            decisionResolve(true);
          });
        }
      );

      currentOuterRequestPromise = outerPromise;

      // Catch async errors on outer promise (e.g. SecurityError, locks disabled)
      outerPromise.catch((err) => {
        console.warn('navigator.locks.request rejected:', err);
        currentHeldRelease = null;
        currentHeldWardId = null;
        currentOuterRequestPromise = null;
        decisionResolve(true); // Fail-open
      });

      const granted = await decisionPromise;
      if (!granted) {
        currentHeldRelease = null;
        currentHeldWardId = null;
        currentOuterRequestPromise = null;
      }
      return granted;
    } catch (err) {
      // Fail-open for unexpected synchronous faults
      console.warn('navigator.locks.request threw synchronous error:', err);
      currentHeldRelease = null;
      currentHeldWardId = null;
      currentOuterRequestPromise = null;
      return true;
    }
  }));
}

if (typeof window !== 'undefined') {
  window.acquireWardLock = acquireWardLock;
  window.releaseWardLock = releaseWardLock;
  window.getCurrentLockedWardId = getCurrentLockedWardId;
}
