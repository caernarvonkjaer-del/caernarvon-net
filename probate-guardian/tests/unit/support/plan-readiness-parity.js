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

// Milestone 43C: the union of legacy-app.js window globals each of the four
// plan-*-parity.spec.js files needs stubbed to import their print.js module
// in a Node-only (no jsdom) suite -- previously hand-copied four times and
// silently able to drift (a rights/ADL list changing in one but not the
// other three, with nothing to catch it). Includes every list constant any
// of the four Plan types reads, even the ones a given type's own validator
// never touches -- an unused stub key is harmless, unlike a missing one.
// Each call site still spreads its own `global.window` last, so a file that
// truly needs a one-off override (or set one before this ran) keeps it.
export function createPlanTestWindowStub() {
  return {
    esc: (s) => s || '',
    ic: () => '',
    inpS: () => '',
    countyInputS: () => '',
    radioP: () => '',
    pageNavS: () => '',
    renderScheduleDocsSection: () => '',
    txtP: () => '',
    chkP: () => '',
    planQ: () => '',
    planCheckGroup: () => '',
    yesNoCheckboxS: () => '',
    formatName: (s) => s,
    formatPhone: (s) => s,
    formatSSN: (s) => s,
    formatAddress: (s) => s,
    toggleSsnReveal: () => '',
    formatDisplayDate: (s) => s,
    PLAN_RIGHTS: [
      ['marry', 'Right to marry'], ['vote', 'Right to vote'],
      ['govBenefits', 'Right to personally apply for government benefits'], ['driver', "Right to have a driver's license"],
      ['travel', 'Right to travel'], ['employment', 'Right to seek or retain employment'],
      ['contract', 'Right to contract'], ['sue', 'Right to sue and be sued'],
      ['property', 'Right to manage property or to make any gift or disposition'], ['residence', 'Right to determine residence'],
      ['medical', 'Right to consent to medical treatment'], ['social', 'Right to make decisions about social environment or other aspects of social life'],
    ],
    PLAN_ADLS: [
      ['eating', 'Eating'], ['prepareMeals', 'Prepare meals'],
      ['heavyChores', 'Heavy chores (e.g. vacuuming)'], ['lightHousekeeping', 'Light housekeeping'],
      ['managingMoney', 'Managing money'], ['dressing', 'Dressing'],
      ['transportation', 'Transportation ability'], ['walking', 'Walking / mobility'],
      ['toileting', 'Toileting'], ['stairs', 'Climbing stairs'],
      ['transferring', 'Transferring (wheelchair to chair/bed)'], ['laundry', 'Doing laundry'],
      ['shopping', 'Shopping'], ['bathing', 'Bathing'],
      ['grooming', 'Grooming'], ['medication', 'Administration of medication'],
    ],
    INITIAL_ADLS: [
      ['lightHousekeeping', 'Light Housekeeping'], ['medication', 'Administration of Medication'],
      ['managingMoney', 'Managing Money'], ['bathing', 'Bathing'],
      ['prepareMeals', 'Prepare Meals'], ['stairs', 'Climbing Stairs'],
      ['shopping', 'Shopping'], ['laundry', 'Doing Laundry'],
      ['toileting', 'Toileting'], ['dressing', 'Dressing'],
      ['transferring', 'Transferring (from wheelchair to chair/bed)'], ['eating', 'Eating'],
      ['walking', 'Walking / Mobility'], ['grooming', 'Grooming'],
      ['heavyChores', 'Heavy Chores'],
    ],
    highlightErrors: () => {},
    validationPanel: () => '',
    planReadinessPanel: () => '',
    renderPage: () => {},
  };
}
