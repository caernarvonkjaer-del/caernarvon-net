// Milestone 70: the classic monolith's one way to reach module code while it
// still exists.
//
// src/legacy-app.js is a classic script -- it cannot import -- so as each
// delivery moves an implementation out of it into an ES module, the calls the
// monolith still makes go through one-line wrappers that delegate here:
//
//     function esc(s){return window.GuardianFormsLegacyBridge.esc(s);}
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
import { ic } from './core/ui/icons.js';
import { esc } from './core/filing/escape-html.js';
import { fmt, formatDashboardCurrency } from './core/format/money.js';
import { guardianHasAnyData } from './core/validation/row-started.js';
import { validateImportFile, sanitizeObjectData } from './core/security/input-hardening.js';
import {
  sanitizeNonNegativeDecimal, formatPhone, formatSSN, formatCaseNumber, finalizeCaseNumber, formatBarNumber,
  formatAccountNumber, formatCheckNumber, formatName, formatAddress, applyZipLimit,
} from './core/form/form-contract.js';
import { FL_COUNTIES } from './core/pdf/circuit-lookup.js';
import { formatDisplayDate } from './core/form/date-parser.js';
import { calcTotals } from './features/simplified-accounting/totals.js';
import { calc } from './features/guardian-inventory/totals.js';

export const LEGACY_BRIDGE = Object.freeze({
  // 70B -- pure helpers
  ic, esc, fmt, formatDashboardCurrency, guardianHasAnyData, validateImportFile, sanitizeObjectData,
  sanitizeNonNegativeDecimal, formatPhone, formatSSN, formatCaseNumber, finalizeCaseNumber, formatBarNumber,
  formatAccountNumber, formatCheckNumber, formatName, formatAddress, applyZipLimit, FL_COUNTIES,
  formatDisplayDate, calcTotals, calc,
});

if (typeof window !== 'undefined') {
  window.GuardianFormsLegacyBridge = LEGACY_BRIDGE;
}
