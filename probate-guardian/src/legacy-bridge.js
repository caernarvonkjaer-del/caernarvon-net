// Milestone 70: the classic monolith's one way to reach module code while it
// still exists.
//
// src/legacy-app.js is a classic script -- it cannot import -- so as each
// delivery moves an implementation out of it into an ES module, the calls the
// monolith still makes go through one-line wrappers that delegate here:
//
//     function esc(s){return window.GuardianFormsLegacyBridge.(s);}
//
// Rules, each checked by tests/unit/legacy-bridge.spec.js:
//   - Only legacy-app.js reads this object, and only inside functions: it
//     loads before any module, so a read at its top level would find nothing.
//     main.js imports this file before it calls initApp(), which is the first
//     moment the monolith's functions run.
//   - No module reads it. Modules import the implementation directly; this is
//     a door for the classic script, never a way for modules to reach each
//     other (the same rule MILESTONE-70-PROPOSAL.md sets for GuardianForms).
//   - A member is here only while a wrapper in legacy-app.js calls it, and
//     never holds logic of its own -- it is the implementation, imported.
//
// It is the one ratchet exception MILESTONE-70-PROPOSAL.md records for the
// transition (one window write here, one window read in legacy-app.js), and it
// goes with legacy-app.js in 70L.
import { esc } from './core/filing/escape-html.js';
import { calcTotals } from './features/simplified-accounting/totals.js';
import { calcTotalsGuardian } from './features/guardian-inventory/totals.js';
import { getActiveInventoryType, getD } from './core/state.js';
import {
  formEngine, FILING_PAGES,
  computeCompletion as computeNavChecks, filingProgress as getWardProgress,
} from './core/filing/filing-registry.js';
import { provideMonolithServices } from './core/runtime/monolith.js';
import { PAGES_GUARDIAN, } from './core/filing/models/guardian.js';

export const LEGACY_BRIDGE = Object.freeze({
  // 70B -- pure helpers
  
  
  calcTotals, calcTotalsGuardian,
  // 70J: the open filing and its type, which the monolith no longer holds
  getD, getActiveInventoryType,
  // 70C -- the filing registry and per-engine models
  formEngine, FILING_PAGES,
  
  PAGES_GUARDIAN, 
  // 70D -- completion (the monolith's names for them)
  computeNavChecks, getWardProgress, 
  // 70E -- the case-state seam, and the door the other way (src/core/runtime/monolith.js)
  provideMonolithServices,
  // 70F
  // 70G
  // 70H
  // 70I
  
});

if (typeof window !== 'undefined') {
  window.GuardianFormsLegacyBridge = LEGACY_BRIDGE;
}
