// Milestone 73B (decision 73B-2): the Annual, Final and Trust Accounting's
// Part IX asks for the guardian's relationship to the ward -- the Clerk's
// workbook gives three choices in PART IX G8 and fills in none. Every new
// filing used to start as "Professional Guardian", which the filer never
// chose, and a blank one printed "None", which is not one of the three. A new
// filing now starts blank; a blank prints blank and is pointed out here,
// under "Review recommended before filing" in Print Preview, never blocking.

export const GUARDIAN_RELATIONSHIPS = Object.freeze(['Professional Guardian', 'Family/Non-Professional Guardian', 'Other/Non-Professional Guardian']);

/** The warning for an unanswered relationship, or none. */
export function guardianRelationshipAdvisories(filing) {
  if (String(filing?.guardianRelationship ?? '').trim()) return [];
  return [{
    code: 'part-ix.relationship-blank', severity: 'advisory', field: 'guardianRelationship',
    message: "Part IX — Guardian's Relationship to Ward is not stated (Professional, Family/Non-Professional or Other/Non-Professional Guardian). The filing can be filed without it; it prints blank.",
  }];
}
