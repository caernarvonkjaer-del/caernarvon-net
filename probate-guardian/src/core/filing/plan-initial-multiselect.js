// Milestone 68E. The court's Initial Guardianship Plan form (page 2,
// reference/plan-forms/plan-initial-original.pdf) shows questions 2, 4 and 5
// as checkbox lists -- the same glyphs as questions 3 and 6, which this app
// already renders as checkboxes. The app rendered 2, 4 and 5 as radio groups
// storing one string, so a ward in an assisted-living facility whose family
// also provides daily care could not be described (§744.363(1)(a) requires
// the provision of care to be described and sets no cardinality).
//
// Decided 2026-09-23/24: every radio-rendered checkbox list converts. Each
// option becomes its own boolean, the shape questions 3, 6 and 7 already use
// on this form and the Annual Plan uses for the same residential-setting
// question (q3SettingALF ...). A filing saved under the old shape reads back
// with the one box its value named ticked; a value that names no option --
// free text a filer typed into the enum -- lands in "Other" with the text as
// the explanation, so nothing typed is lost. Blank stays blank.
const text = (v) => String(v ?? '').trim();

export const Q2_OPTIONS = [
  { key: 'q2ALF', label: 'Assisted Living (ALF)' },
  { key: 'q2GroupHome', label: 'Group Home' },
  { key: 'q2Intermediate', label: 'Intermediate' },
  { key: 'q2PrivateResidence', label: 'Private Residence' },
  { key: 'q2SkilledNursing', label: 'Skilled Nursing' },
  { key: 'q2Specialized', label: 'Specialized' },
  { key: 'q2StateHospital', label: 'State Hospital' },
  { key: 'q2Other', label: 'Other' },
];

export const Q4_OPTIONS = [
  { key: 'q4Psych', label: 'Routine examination by Psychiatrist/Psychologist' },
  { key: 'q4Outpatient', label: 'Ongoing Treatment Outpatient' },
  { key: 'q4Inpatient', label: 'Ongoing Treatment Inpatient' },
  { key: 'q4None', label: 'None' },
  { key: 'q4Other', label: 'Other' },
];

export const Q5_OPTIONS = [
  { key: 'q5CareFacility', label: 'Care Facility' },
  { key: 'q5NursesAides', label: 'Nurses and Aides' },
  { key: 'q5FamilyFriends', label: 'Family and Friends' },
  { key: 'q5Other', label: 'Other' },
];

/** The three converted questions: the retired scalar, its options, and where a non-option value goes. */
export const MULTISELECT_QUESTIONS = [
  { question: '2', legacyKey: 'q2Setting', options: Q2_OPTIONS, otherKey: 'q2Other', explainKey: 'q2Explain' },
  { question: '4', legacyKey: 'q4Mental', options: Q4_OPTIONS, otherKey: 'q4Other', explainKey: 'q4Explain' },
  { question: '5', legacyKey: 'q5Personal', options: Q5_OPTIONS, otherKey: 'q5Other', explainKey: 'q5Explain' },
];

/** Every option false: the shape the empty-data factory carries. */
export function emptyPlanInitialMultiselect() {
  const out = {};
  for (const q of MULTISELECT_QUESTIONS) for (const o of q.options) out[o.key] = false;
  return out;
}

/** True when any option of the question is ticked. */
export const anyChecked = (filing, options) => options.some((o) => !!filing?.[o.key]);

/**
 * Reads a filing saved under the old one-string shape into the boolean
 * shape, in place. Idempotent; returns true when anything changed. The
 * retired scalar is removed once read. Never coerces a blank answer into a
 * ticked box (AGENTS.md section 4).
 */
export function migratePlanInitialMultiselect(filing) {
  if (!filing || typeof filing !== 'object') return false;
  let changed = false;
  for (const q of MULTISELECT_QUESTIONS) {
    for (const o of q.options) {
      if (!(o.key in filing)) { filing[o.key] = false; changed = true; }
    }
    if (!(q.legacyKey in filing)) continue;
    const value = text(filing[q.legacyKey]);
    if (value) {
      const match = q.options.find((o) => o.label === value);
      if (match) {
        filing[match.key] = true;
      } else {
        // Free text typed into what was an enum: keep it, under Other.
        filing[q.otherKey] = true;
        if (!text(filing[q.explainKey])) filing[q.explainKey] = value;
      }
    }
    delete filing[q.legacyKey];
    changed = true;
  }
  return changed;
}
