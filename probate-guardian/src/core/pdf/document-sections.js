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
// screens still point one section late -- Milestone 75's proposal.
import { FILING_TYPE_KEYS, resolveDescriptorForInventoryType } from '../filing/filing-descriptor.js';

export const SUPPORTING_DOC_SECTIONS = Object.freeze({
  planAnnual: Object.freeze({
    planACover: 'cover', planAResidences: 'q1', planACarePlan: 'q2-q3', planABenefits: 'q3g',
    planAProviders: 'q4', planARights: 'q5-q7', planAADLs: 'q8', planADisabilities: 'q9',
    planADirectives: 'q10', planARemuneration: 'q11', planASignatures: 'certification',
  }),
  planInitial: Object.freeze({
    planICover: 'cover', planISettingMedical: 'q2-q5', planIMentalPersonal: 'q6-q7',
    planISocialBenefits: 'q9', planIProviders: 'q10a', planIADLs: 'q10b-d',
    planIDisabilities: 'q11-10ef', planIDirectives: 'directive-detail', planISignatures: 'certification',
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
