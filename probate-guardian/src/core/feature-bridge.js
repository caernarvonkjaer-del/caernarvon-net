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
// dispose() is deliberately not part of this factory. Callers clear their own
// container, shared event delegates are registered once, and extracted form
// features replace their container-local delegates with AbortControllers.
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
    detail.textContent = 'Check your connection or finish downloading offline access, then reload this page.';
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
    await mod.mount(container, page);
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

// Temporary: legacy-app.js stays a classic (non-module) script per
// Milestone 1's recorded decision, so it can't `import` this module
// directly -- see src/fragment-loader.js's window.loadFragment comment for
// the same pattern. Remove once a real src/main.js bootstrap exists.
window.createFeatureBridge = createFeatureBridge;
