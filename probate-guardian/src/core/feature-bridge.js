// Promoted from src/legacy-app.js's Simplified Accounting bridge (Milestone
// 2, Phase D) once a second feature (Plan Simplified, Milestone 3) proved
// the load-once-cache-the-promise / mount-mountNav shape was genuinely
// duplicated, not just superficially similar. See the Milestone 3 plan's
// "Problem 2" for why this stays a small factory rather than
// INDEX-SPLIT-PLAN.md's full staging-host router: this app never mounts two
// features racing for the same container (switchWard() always fully
// changes the active ward before any render happens), so the
// detached-host/pendingController/navSeq machinery that router uses to
// arbitrate concurrent candidates would be solving a problem this app
// doesn't have.
//
// dispose() is deliberately not part of this factory -- callers clear their
// own container (container.replaceChildren()) at the three dispose-trigger
// points identified in Milestone 2's Problem 2, since extracted renderers
// return HTML strings with inline onclick=/oninput= attributes rather than
// addEventListener-bound listeners, so there is nothing else to tear down.
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
