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

    let decisionResolve;
    const decisionPromise = new Promise((resolve) => {
      decisionResolve = resolve;
    });

    let newHoldResolve = null;

    try {
      const outerPromise = navigator.locks.request(
        `pg-ward-${wardId}`,
        { mode: 'exclusive', ifAvailable: true },
        (lock) => {
          if (!lock) {
            // Contention: lock held by another tab -> previous lock stays intact
            decisionResolve(false);
            return;
          }

          return new Promise((resolveHold) => {
            newHoldResolve = resolveHold;
            decisionResolve(true);
          });
        }
      );

      // Catch async errors on outer promise (e.g. SecurityError, locks disabled)
      outerPromise.catch((err) => {
        console.warn('navigator.locks.request rejected:', err);
        decisionResolve(true); // Fail-open
      });

      const granted = await decisionPromise;
      if (granted) {
        // Handover: release previous lock only after the new lock is granted
        if (currentHeldRelease) {
          const oldReleaseFn = currentHeldRelease;
          const oldOuterPromise = currentOuterRequestPromise;
          currentHeldRelease = null;
          currentHeldWardId = null;
          currentOuterRequestPromise = null;
          oldReleaseFn();
          try {
            await oldOuterPromise;
          } catch (e) {}
        }

        currentHeldRelease = newHoldResolve;
        currentHeldWardId = wardId;
        currentOuterRequestPromise = outerPromise;
        return true;
      }

      // Lock not granted (contention): previous lock remains held
      return false;
    } catch (err) {
      // Fail-open for unexpected synchronous faults
      console.warn('navigator.locks.request threw synchronous error:', err);
      return true;
    }
  }));
}

if (typeof window !== 'undefined') {
  window.acquireWardLock = acquireWardLock;
  window.releaseWardLock = releaseWardLock;
  window.getCurrentLockedWardId = getCurrentLockedWardId;
}
