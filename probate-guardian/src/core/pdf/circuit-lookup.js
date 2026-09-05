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

/**
 * Resolves the Florida Judicial Circuit number (1-20) for a given county name.
 * Defaults to 6 (Sixth Judicial Circuit / Pinellas & Pasco) if empty or unrecognized.
 */
export function circuitForCounty(county) {
  const trimmed = (county || '').trim();
  if (!trimmed) return 6;
  // Case-insensitive match against FL_COUNTY_CIRCUIT keys
  for (const [k, v] of Object.entries(FL_COUNTY_CIRCUIT)) {
    if (k.toLowerCase() === trimmed.toLowerCase()) {
      return v;
    }
  }
  return 6;
}

/**
 * Returns the uppercase ordinal string (e.g. "SIXTH", "THIRTEENTH") for a circuit number or county.
 */
export function getCircuitOrdinal(circuitOrCounty) {
  const circuitNum = typeof circuitOrCounty === 'number'
    ? circuitOrCounty
    : circuitForCounty(circuitOrCounty);
  const ord = CIRCUIT_ORDINALS[circuitNum] || 'Sixth';
  return ord.toUpperCase();
}

/**
 * Generates the standardized 2-line Florida Circuit Court title.
 */
export function getFloridaCircuitCourtCaption(county) {
  const c = (county || 'Pinellas').trim() || 'Pinellas';
  const ord = getCircuitOrdinal(c);
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
