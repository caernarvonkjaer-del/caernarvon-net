// Which PDF section each screen's supporting documents print after, for the
// forms whose screens and PDF sections don't share names (the Annual
// Accounting family's do -- schA is both -- and the Initial Inventory's model
// places its own). In screen order: two screens that share a section print
// their documents there in this order.
//
// Keyed by filing type, not by the PDF's title. It was keyed by title until
// the documents were found missing (2026-10-10): the Plan for Minors'
// "ANNUAL GUARDIANSHIP PLAN — MINOR" (a dash) stopped matching the registry's
// "ANNUAL GUARDIANSHIP PLAN - MINOR" (a hyphen) on 2026-09-07, so none of its
// documents reached the PDF; the Simplified Accounting had no entry at all;
// and the Initial Plan's Attorney screen had none. The Initial Plan's other
// screens pointed one section late from Questions 4-5 on, until Milestone
// 75's 75B.
import { FILING_TYPE_KEYS, resolveDescriptorForInventoryType } from '../filing/filing-descriptor.js';

export const SUPPORTING_DOC_SECTIONS = Object.freeze({
  planAnnual: Object.freeze({
    planACover: 'cover', planAResidences: 'q1', planACarePlan: 'q2-q3', planABenefits: 'q3g',
    planAProviders: 'q4', planARights: 'q5-q7', planAADLs: 'q8', planADisabilities: 'q9',
    planADirectives: 'q10', planARemuneration: 'q11', planASignatures: 'certification',
  }),
  // Questions 2-3 and 4-5 are one PDF section, "Questions 2–5". The Advance
  // Directives screen (Question 11, with 10E-F) prints after Question 11's
  // Advance Directive Detail (decision 75B-1).
  planInitial: Object.freeze({
    planICover: 'cover', planISettingMedical: 'q2-q5', planIMentalPersonal: 'q2-q5',
    planISocialBenefits: 'q6-q7', planIProviders: 'q9', planIADLs: 'q10a',
    planIDisabilities: 'q10b-d', planIDirectives: 'directive-detail', planISignatures: 'certification',
    planIAttorney: 'attorney-certification',
  }),
  // Questions 2 and 3 are one PDF section, "Questions 2–3".
  planMinor: Object.freeze({
    planMCover: 'cover', planMResidences: 'q2-q3', planMProviders: 'q2-q3', planMMedical: 'q4',
    planMEducation: 'q5', planMSignatures: 'certification', planMPreparerAttorney: 'preparer-attorney',
  }),
  planSimplified: Object.freeze({ planCover: 'plan-1', planQuestions: 'plan-2', planSignatures: 'signatures' }),
  // The screens are /p2-/p7, the PDF's sections Parts II-VII.
  simplified: Object.freeze({ p2: 'part2', p3: 'part3', p4: 'part4', p5: 'part5', p6: 'part6', p7: 'part7' }),
});

// Milestone 76J item 3: the page each screen's documents are attached on, so
// a problem with one (a damaged or password-protected statement) is named on
// that page, marks it in the sidebar and is reached by Preview's Go-to -- it
// had no page, and landed on Part I or the Cover. The accountings' and the
// Inventory's keys are their pages' own routes (schA is /scha, a1 is /a1, the
// Simplified's p2 is /p2); the Plans' are named for their screens.
const PLAN_DOC_ROUTES = Object.freeze({
  planAnnual: Object.freeze({
    planACover: '/', planAResidences: '/p2', planACarePlan: '/p3', planABenefits: '/p4', planAProviders: '/p5',
    planARights: '/p6', planAADLs: '/p7', planADisabilities: '/p8', planADirectives: '/p9', planARemuneration: '/p10',
    planASignatures: '/p11',
  }),
  planInitial: Object.freeze({
    planICover: '/', planISettingMedical: '/p2', planIMentalPersonal: '/p3', planISocialBenefits: '/p4',
    planIProviders: '/p5', planIADLs: '/p6', planIDisabilities: '/p7', planIDirectives: '/p8', planISignatures: '/p9',
    planIAttorney: '/p10',
  }),
  planMinor: Object.freeze({
    planMCover: '/', planMResidences: '/p2', planMProviders: '/p3', planMMedical: '/p4', planMEducation: '/p5',
    planMSignatures: '/p6', planMPreparerAttorney: '/p7',
  }),
  planSimplified: Object.freeze({ planCover: '/', planQuestions: '/p2', planSignatures: '/p3' }),
});

/**
 * The route of the page a screen's supporting documents are attached on.
 * @param {string} inventoryType
 * @param {string} key the screen's documents key (scheduleDocs[key])
 */
export function supportingDocRoute(inventoryType, key) {
  const table = PLAN_DOC_ROUTES[inventoryType];
  if (table) return table[key] || '';
  return key ? `/${String(key).toLowerCase()}` : '';
}

/**
 * The table for the document being drawn: by the filing type its title names
 * (every model's formName is its descriptor's documentTitle), else the
 * filing's own type. An empty table for a form that needs none.
 * @param {string} documentTitle the model's metadata.formName
 * @param {string} [inventoryType] the filing's type
 * @returns {Readonly<Record<string, string>>}
 */
export function supportingDocSections(documentTitle, inventoryType) {
  const byTitle = FILING_TYPE_KEYS.find((type) => resolveDescriptorForInventoryType(type)?.documentTitle === documentTitle);
  return SUPPORTING_DOC_SECTIONS[byTitle] || SUPPORTING_DOC_SECTIONS[inventoryType] || Object.freeze({});
}
