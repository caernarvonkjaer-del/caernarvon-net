// County-scoped local filing guidance policy (Milestone 37-1).
//
// This is deliberately NOT derived from circuitForCounty() (core/pdf/circuit-lookup.js):
// that lookup's documented fallback for a blank or unrecognized county is the
// Sixth Circuit, which would wrongly expose a Pinellas/Pasco-only local
// requirement on an unfinished or invalid filing. This module's allow-list is
// exact and defaults closed (false) instead.
//
// Local primary source: 6th Cir. Admin. Order No. 2024-025 PA/PI-CIR, "Guardianship
// and Guardian Advocate Procedures" (Pasco & Pinellas Counties), eff. 2024-08-01,
// Chief Judge Shawn Crane -- retained at AO-2024-025-guardianship-procedures.pdf
// in the repo root. Its Section E requires a
// Disaster Plan with every initial guardianship plan (exempting a minor ward's
// parent/relative guardian), which is what the plan-initial help panel gates.
// It rescinded and replaced AO 2019-005; 2019-005 itself is no longer available
// to confirm what it said.
//
// The certificate-of-service filing item gated the same way (all four Plan
// print.js manual checklists) is NOT confirmed by AO 2024-025 -- that order's
// only guardianship/plan/accounting section (D) covers the Clerk's own audit
// process, not a guardian service obligation. Its attribution as Pinellas/Pasco
// local guidance predates this verification and may have come from the now-
// unavailable 2019-005, a clerk workslip, or elsewhere. Requester's explicit
// call (2026-09-10): keep it gated as local-only pending a source that actually
// confirms it, rather than revert to unconditional. Revisit if a source turns up.
//
// Statewide wording gated by this module cites F.S. 744.367(3)(b), verified
// against flsenate.gov during Milestone 37-1 implementation.

const SIXTH_CIRCUIT_LOCAL_COUNTIES = new Set(['pinellas', 'pasco']);

/**
 * True only for a normalized "Pinellas" or "Pasco" county value (trimmed,
 * case-insensitive). Blank, whitespace-only, and every other county --
 * recognized or not -- are false.
 */
export function hasSixthCircuitLocalGuidance(county) {
  const normalized = (county || '').trim().toLowerCase();
  return SIXTH_CIRCUIT_LOCAL_COUNTIES.has(normalized);
}
