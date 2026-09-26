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
import { validateImportFile, sanitizeObjectData } from './core/security/input-hardening.js';
import { calcTotals } from './features/simplified-accounting/totals.js';
import { calc } from './features/guardian-inventory/totals.js';
import {
  formEngine, initializeEmptyData, FILING_PAGES,
  computeCompletion as computeNavChecks, filingProgress as getWardProgress,
} from './core/filing/filing-registry.js';
import { getActiveWard } from './core/state.js';
import { provideMonolithServices } from './core/runtime/monolith.js';
import { PAGES_GUARDIAN, } from './core/filing/models/guardian.js';
import { setPath } from './core/form/paths.js';
import { addToRecentlyOpened, loadRecentlyOpenedWards } from './core/filing/recent-filings.js';
import { renderCopyrightNotice, updateSidebar } from './core/shell/sidebar.js';
import { notifyProbateGuardianTabStateChanged } from './core/navigation/tab-state.js';
import { applyTheme, currentTheme } from './core/theme-preference.js';
import { ensureFragment } from './core/ui/dialogs.js';

export const LEGACY_BRIDGE = Object.freeze({
  // 70B -- pure helpers
  validateImportFile, sanitizeObjectData,
  
  calcTotals, calc,
  // 70C -- the filing registry and per-engine models
  formEngine, initializeEmptyData, FILING_PAGES,
  
  PAGES_GUARDIAN, 
  // 70D -- completion (the monolith's names for them)
  computeNavChecks, getWardProgress, 
  // 70E -- the case-state seam, and the door the other way (src/core/runtime/monolith.js)
  getActiveWard, provideMonolithServices,
  // 70F
  setPath, 
  // 70G
  addToRecentlyOpened, loadRecentlyOpenedWards, 
  // 70H
  applyTheme, currentTheme, ensureFragment, notifyProbateGuardianTabStateChanged, renderCopyrightNotice, updateSidebar,
});

if (typeof window !== 'undefined') {
  window.GuardianFormsLegacyBridge = LEGACY_BRIDGE;
}
