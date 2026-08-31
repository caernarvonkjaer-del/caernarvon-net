let currentLockResolve = null;
let currentWardId = null;
let releasePromise = null;

export async function acquireWardLock(wardId) {
  if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
    return true;
  }
  if (!navigator.locks) {
    return true;
  }

  return new Promise((resolve) => {
    navigator.locks.request(
      `pg-ward-${wardId}`,
      { mode: 'exclusive', ifAvailable: true },
      (lock) => {
        if (!lock) {
          resolve(false);
          return;
        }

        return new Promise((releaseLock) => {
          currentLockResolve = releaseLock;
          currentWardId = wardId;
          resolve(true);
        });
      }
    ).catch(err => {
      console.warn('ward-lock request failed:', err);
      resolve(false);
    });
  });
}

export async function releaseWardLock() {
  if (currentLockResolve) {
    currentLockResolve();
    currentLockResolve = null;
    
    const wardIdToWait = currentWardId;
    currentWardId = null;

    releasePromise = new Promise(async (resolve) => {
      if (wardIdToWait && navigator.locks && navigator.locks.query) {
        for (let i = 0; i < 20; i++) {
          const state = await navigator.locks.query();
          const lockName = `pg-ward-${wardIdToWait}`;
          const ourLock = state.held?.find(l => l.name === lockName);
          if (!ourLock) {
            resolve();
            return;
          }
          await new Promise(r => setTimeout(r, 10));
        }
      } else {
        await new Promise(r => setTimeout(r, 50));
      }
      resolve();
    });
  }
  if (releasePromise) {
    await releasePromise;
  }
}

if (typeof window !== 'undefined') {
  window.acquireWardLock = acquireWardLock;
  window.releaseWardLock = releaseWardLock;
}
export function __test_reset() { currentLockResolve = null; }
