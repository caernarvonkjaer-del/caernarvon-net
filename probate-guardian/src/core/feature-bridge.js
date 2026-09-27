// Promoted from src/legacy-app.js's Simplified Accounting bridge (Milestone
// 2, Phase D) once a second feature (Plan Simplified, Milestone 3) proved
// the load-once-cache-the-promise / mount-mountNav shape was genuinely
// duplicated, not just superficially similar. See the Milestone 3 plan's
// "Problem 2" for why this stays a small factory rather than
// INDEX-SPLIT-PLAN.md's full staging-host router. Two mounts racing for the
// same container are arbitrated by the router (Milestone 70, 70K): each
// navigation hands its AbortSignal in, and a mount that has been superseded
// -- while its feature loaded, or while it drew -- commits nothing more. (The
// limitation was recorded under Milestone 12, and the race by 70G.)
//
// Track the mounted module per shared host so changing features tears down
// container-local delegates before the next renderer takes ownership.
const activeFeatureByContainer = new WeakMap();

export function disposeActiveFeature(container, nextModule = null) {
  const activeModule = activeFeatureByContainer.get(container);
  if (!activeModule || activeModule === nextModule) return;
  activeModule.dispose?.(container);
  activeFeatureByContainer.delete(container);
}

// Milestone 63C. A chunk that will not load is worded differently by each
// browser -- "Failed to fetch dynamically imported module" (Chrome),
// "error loading dynamically imported module" (Firefox), "Importing a module
// script failed" (Safari) -- and Vite adds "Unable to preload CSS for ...". A bare
// "Failed to fetch" is deliberately NOT matched: that is what any application
// fetch() says when the network drops, and treating it as a missing chunk would
// hide a real failure behind a panel that blames the connection.
const CHUNK_LOAD_ERROR = /dynamically imported module|Importing a module script failed|Unable to preload/i;

export function isChunkLoadError(error) {
  const message = typeof error === 'string' ? error : error && error.message;
  return typeof message === 'string' && CHUNK_LOAD_ERROR.test(message);
}

export function createFeatureBridge(loader) {
  let modulePromise = null;
  function load() {
    return modulePromise ??= loader();
  }
  function showLoadFailure(container) {
    container.replaceChildren();
    const panel = document.createElement('div');
    panel.className = 'alert alert-danger';
    panel.setAttribute('role', 'alert');
    const title = document.createElement('strong');
    title.textContent = 'This section could not be loaded.';
    const detail = document.createElement('p');
    detail.className = 'mb-2';
    detail.textContent = 'Check your connection or finish downloading offline access, then reload this page. This can also happen after Guardian Forms has been updated.';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm btn-outline-danger';
    button.textContent = 'Reload';
    button.addEventListener('click', () => window.location.reload(), { once: true });
    panel.append(title, detail, button);
    container.append(panel);
  }
  // `options`: the navigation's AbortSignal, and the filing it is for (the
  // feature's mount context). Resolves true once the page is drawn, false when
  // the navigation was superseded or the feature could not be loaded.
  async function mountPage(container, page, options = {}) {
    const { signal } = options;
    let mod;
    try {
      mod = await load();
    } catch (error) {
      modulePromise = null;
      if (signal?.aborted) return false;
      console.warn('Feature load failed', error);
      showLoadFailure(container);
      return false;
    }
    // A newer navigation owns the page now: draw nothing.
    if (signal?.aborted) return false;
    disposeActiveFeature(container, mod);
    // Every feature also imports its print and Excel modules while it mounts,
    // so a chunk can fail here as well as in load() above. Milestone 63C removed
    // the loader's automatic reload; without this catch that failure would leave
    // the page as it was, saying nothing. Only a chunk-load failure is shown as
    // the panel -- any other error is a real bug and must still surface.
    try {
      await mod.mount(container, page, options);
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;
      if (signal?.aborted) return false;
      console.warn('Feature chunk failed while mounting', error);
      showLoadFailure(container);
      return false;
    }
    // Mounted: it is the feature to dispose when the page next changes, even
    // if a newer navigation has already begun (the router then returns).
    activeFeatureByContainer.set(container, mod);
    return !signal?.aborted;
  }
  return {
    mountPage,
    async mountNav(container) {
      let mod;
      try {
        mod = await load();
      } catch (error) {
        modulePromise = null;
        console.warn('Feature navigation load failed', error);
        return;
      }
      mod.mountNav(container);
    },
  };
}
