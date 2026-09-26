// Milestone 70: the functions still defined in the classic monolith that code
// already moved into modules calls back -- the reverse of src/legacy-bridge.js.
//
// A module cannot import legacy-app.js (a classic script), and reading its
// functions off window is exactly what the migration removes (the dependency
// ratchet forbids a new window read). So the monolith hands them in, once, at
// the start of initApp() -- before anything it renders can call back:
//
//     provideMonolithServices({ autoSave });
//
// and a moved function calls `monolith.autoSave()`. Rules, each checked by
// tests/unit/monolith-services.spec.js:
//   - only legacy-app.js provides, through its one-line bridge wrapper called
//     from initApp(), and only functions it declares;
//   - a module calls a service only inside a function (nothing is provided
//     while modules evaluate);
//   - every provided name is still called by some module, and every called
//     name is provided -- a service goes the moment its last caller moves or
//     its implementation does.
//
// It is the second transition exception MILESTONE-70-PROPOSAL.md records
// (70E, when the case store first needed the monolith's autoSave()), and it
// goes with the monolith in 70L.
const provided = new Map();

/** legacy-app.js hands in its functions once, at the start of initApp(). */
export function provideMonolithServices(fns) {
  for (const [name, fn] of Object.entries(fns || {})) {
    if (typeof fn !== 'function') throw new Error(`provideMonolithServices: ${name} is not a function`);
    provided.set(name, fn);
  }
}

/**
 * The monolith's functions, by name: `monolith.autoSave()`. Asking for one
 * that was never handed in throws rather than silently doing nothing -- a
 * missed save or a stale sidebar is worse than a loud error.
 */
export const monolith = new Proxy(Object.freeze({}), {
  get(_target, name) {
    const fn = provided.get(name);
    if (!fn) throw new Error(`monolith.${String(name)}() was not provided -- legacy-app.js hands its services in at the start of initApp()`);
    return fn;
  },
});

/** For the spec only: which names were handed in. */
export function providedMonolithServiceNames() {
  return [...provided.keys()].sort();
}
