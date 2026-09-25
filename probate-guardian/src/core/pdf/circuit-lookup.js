// Florida County to Judicial Circuit Lookup & Court Header Formatter (Milestone 21)
// Maps all 67 Florida counties to their official Judicial Circuit (1 through 20)
// and provides standardized court caption and case style generators.

export const FL_COUNTY_CIRCUIT = {
  Escambia: 1, Okaloosa: 1, 'Santa Rosa': 1, Walton: 1,
  Franklin: 2, Gadsden: 2, Jefferson: 2, Leon: 2, Liberty: 2, Wakulla: 2,
  Columbia: 3, Dixie: 3, Hamilton: 3, Lafayette: 3, Madison: 3, Suwannee: 3, Taylor: 3,
  Clay: 4, Duval: 4, Nassau: 4,
  Citrus: 5, Hernando: 5, Lake: 5, Marion: 5, Sumter: 5,
  Pasco: 6, Pinellas: 6,
  Flagler: 7, Putnam: 7, 'St. Johns': 7, Volusia: 7,
  Alachua: 8, Baker: 8, Bradford: 8, Gilchrist: 8, Levy: 8, Union: 8,
  Orange: 9, Osceola: 9,
  Hardee: 10, Highlands: 10, Polk: 10,
  'Miami-Dade': 11,
  DeSoto: 12, Manatee: 12, Sarasota: 12,
  Hillsborough: 13,
  Bay: 14, Calhoun: 14, Gulf: 14, Holmes: 14, Jackson: 14, Washington: 14,
  'Palm Beach': 15,
  Monroe: 16,
  Broward: 17,
  Brevard: 18, Seminole: 18,
  'Indian River': 19, Martin: 19, Okeechobee: 19, 'St. Lucie': 19,
  Charlotte: 20, Collier: 20, Glades: 20, Hendry: 20, Lee: 20,
};

export const CIRCUIT_ORDINALS = [
  '',
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
  'Eleventh',
  'Twelfth',
  'Thirteenth',
  'Fourteenth',
  'Fifteenth',
  'Sixteenth',
  'Seventeenth',
  'Eighteenth',
  'Nineteenth',
  'Twentieth',
];

// Milestone 40C-A item 7: these three functions used to be LAYERED fallbacks to
// the Sixth Circuit / Pinellas, so removing any one or two of them still printed
// a confident Pinellas caption for a filing with no county:
//   1. circuitForCounty() returned 6 for blank AND for unrecognized;
//   2. getCircuitOrdinal() fell back to 'Sixth' for an unresolved number;
//   3. getFloridaCircuitCourtCaption() defaulted the county NAME to 'Pinellas'
//      before the lookup even ran.
// They now return an explicitly unknown result (null / '' / null). Each caller
// decides what to draw with no caption. Export is already blocked by per-form
// County validation, so the only path that reaches a blank-county caption is a
// draft preview -- and a draft should show a visible gap, not the wrong court.
// This matches src/core/filing/county-guidance.js, which already declines to
// derive from circuitForCounty() for exactly this reason.

/**
 * Resolves the Florida Judicial Circuit number (1-20) for a given county name.
 * Returns null for a blank or unrecognized county -- there is no default circuit.
 */
export function circuitForCounty(county) {
  const trimmed = (county || '').trim();
  if (!trimmed) return null;
  // Case-insensitive match against FL_COUNTY_CIRCUIT keys
  for (const [k, v] of Object.entries(FL_COUNTY_CIRCUIT)) {
    if (k.toLowerCase() === trimmed.toLowerCase()) {
      return v;
    }
  }
  return null;
}

/**
 * Returns the uppercase ordinal string (e.g. "SIXTH", "THIRTEENTH") for a circuit
 * number or county. Returns '' when the circuit cannot be resolved.
 */
export function getCircuitOrdinal(circuitOrCounty) {
  const circuitNum = typeof circuitOrCounty === 'number'
    ? circuitOrCounty
    : circuitForCounty(circuitOrCounty);
  const ord = (circuitNum && CIRCUIT_ORDINALS[circuitNum]) || '';
  return ord.toUpperCase();
}

/**
 * Generates the standardized 2-line Florida Circuit Court title, or null when
 * the county is blank or unrecognized. Callers must handle null explicitly
 * rather than receiving a caption for a court the filing has not named.
 */
export function getFloridaCircuitCourtCaption(county) {
  const c = (county || '').trim();
  if (!c) return null;
  const ord = getCircuitOrdinal(c);
  if (!ord) return null;
  return {
    line1: `IN THE CIRCUIT COURT OF THE ${ord} JUDICIAL CIRCUIT`,
    line2: `IN AND FOR ${c.toUpperCase()} COUNTY, FLORIDA`,
    division: 'PROBATE DIVISION',
  };
}

/**
 * Generates the formal case caption / style string based on ward type.
 */
export function getCaseCaptionTitle(wardName, wardType) {
  const name = (wardName || 'Ward').trim().toUpperCase();
  const type = (wardType || '').toLowerCase();

  if (type.includes('minor')) {
    return `IN RE: THE GUARDIANSHIP OF ${name}, A MINOR`;
  }
  if (type.includes('advocate') || type.includes('advocacy')) {
    return `IN RE: THE GUARDIAN ADVOCACY OF ${name}`;
  }
  return `IN RE: THE GUARDIANSHIP OF ${name}`;
}

// The County field's suggestion list. Moved from src/legacy-app.js by Milestone
// 70's 70B.
// ═══════════════════════════════════════════════════════
// COUNTY AUTOCOMPLETE — every County field, previously a <select> hardcoded
// to just Pinellas/Pasco, is now a free-text input with a filtered dropdown
// of Florida's 67 counties (never more than 4 shown, narrowing as the
// guardian types), so the app isn't limited to those two counties anymore.
// Deliberately permissive rather than a locked-down <select>, matching the
// sidebar's own "type or select a ward" combobox elsewhere in the app: a
// suggestion list, not a hard constraint, since a guardian who knows their
// county correctly (the overwhelmingly common case) shouldn't be blocked
// by an autocomplete that doesn't yet match what they've typed so far.
// ═══════════════════════════════════════════════════════
export const FL_COUNTIES = ['Alachua','Baker','Bay','Bradford','Brevard','Broward','Calhoun','Charlotte','Citrus','Clay','Collier','Columbia','DeSoto','Dixie','Duval','Escambia','Flagler','Franklin','Gadsden','Gilchrist','Glades','Gulf','Hamilton','Hardee','Hendry','Hernando','Highlands','Hillsborough','Holmes','Indian River','Jackson','Jefferson','Lafayette','Lake','Lee','Leon','Levy','Liberty','Madison','Manatee','Marion','Martin','Miami-Dade','Monroe','Nassau','Okaloosa','Okeechobee','Orange','Osceola','Palm Beach','Pasco','Pinellas','Polk','Putnam','St. Johns','St. Lucie','Santa Rosa','Sarasota','Seminole','Sumter','Suwannee','Taylor','Union','Volusia','Wakulla','Walton','Washington'];
