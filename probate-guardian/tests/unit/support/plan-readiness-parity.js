// Shared helpers for Milestone 37-3's readiness-checklist / export-validator
// parity fixtures (see MILESTONE-37-PROPOSAL.md, "37-3: Milestone 35-4 Exact
// Invariant Reconciliation"). One module so each Plan type's parity suite
// doesn't reimplement fixture cloning/lookup -- kept deliberately tiny since
// the actual proof (baseline + per-condition failure fixtures, exercised
// through the real validator and prepareFilingOutput()) belongs in each
// Plan's own spec file, not hidden in here.

// Deep-clones `base` and applies each `path: value` override, where `path`
// is a dot-separated field path (array indices as plain numeric segments,
// e.g. "planGuardians.0.email"). Never mutates `base`, so the same baseline
// fixture is safe to reuse across every failure fixture in a suite.
export function withOverrides(base, overrides) {
  const clone = structuredClone(base);
  for (const [path, value] of Object.entries(overrides)) {
    setDeep(clone, path, value);
  }
  return clone;
}

function setDeep(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

// Looks up one readiness auto-condition by its stable `id` (see each Plan's
// print.js planReadinessChecksXxx()). Throws on a typo'd id rather than
// silently returning undefined and failing on an unrelated assertion line.
export function autoById(auto, id) {
  const item = auto.find((a) => a.id === id);
  if (!item) throw new Error(`No readiness auto item with id "${id}" (have: ${auto.map((a) => a.id).join(', ')})`);
  return item;
}
