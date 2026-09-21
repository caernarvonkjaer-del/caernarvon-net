// Promoted from src/legacy-app.js's Simplified Accounting bridge (Milestone
// 2, Phase D) once a second feature (Plan Simplified, Milestone 3) proved
// the load-once-cache-the-promise / mount-mountNav shape was genuinely
// duplicated, not just superficially similar. See the Milestone 3 plan's
// "Problem 2" for why this stays a small factory rather than
// INDEX-SPLIT-PLAN.md's full staging-host router. This factory deliberately
// assumes sequential navigation; it does not arbitrate two async mounts racing
// for the same container. The limitation and the decision not to widen this
// milestone into a router rewrite are recorded under Milestone 12.
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
  async function mountPage(container, page) {
    let mod;
    try {
      mod = await load();
    } catch (error) {
      modulePromise = null;
      console.warn('Feature load failed', error);
      showLoadFailure(container);
      return;
    }
    disposeActiveFeature(container, mod);
    // Every feature also imports its print and Excel modules while it mounts,
    // so a chunk can fail here as well as in load() above. Milestone 63C removed
    // the loader's automatic reload; without this catch that failure would leave
    // the page as it was, saying nothing. Only a chunk-load failure is shown as
    // the panel -- any other error is a real bug and must still surface.
    try {
      await mod.mount(container, page);
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;
      console.warn('Feature chunk failed while mounting', error);
      showLoadFailure(container);
      return;
    }
    activeFeatureByContainer.set(container, mod);
    if (typeof window !== 'undefined' && typeof window.attachFormHeaderActions === 'function') {
      window.attachFormHeaderActions(container);
    }
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

// legacy-app.js stays a classic (non-module) script per Milestone 1's
// recorded decision, so it can't `import` this module directly -- see
// src/fragment-loader.js's window.loadFragment comment for the same
// pattern. src/main.js has been the bootstrap since Milestone 40G; these
// window bindings stay until legacy-app.js itself becomes a module.
window.createFeatureBridge = createFeatureBridge;
window.disposeActiveFeature = disposeActiveFeature;
