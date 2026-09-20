// Statutory text this app reproduces on a court filing, quoted from the
// statute itself.
//
// AGENTS.md section 5 puts the Florida Statutes above the Clerk's own
// instruments. Where a workbook transcribes a statute and the transcription
// differs from the statute, the statute is what a filer is entitled to read on
// the document they sign -- so the text lives here, once, cited, rather than
// being hand-copied into each form's PDF model.

/**
 * s. 744.367(3)(a), Florida Statutes -- the second and third sentences, which
 * are the declaration requirement and its definition. (The paragraph's first
 * sentence says what each report must consist of and is not part of the
 * declaration, which is why neither court form prints it.)
 *
 * Verified 2026-09-20 against the Florida Legislature's text of s. 744.367,
 * cross-checked at flhouse.gov/Statutes/2025/0744.367 and codes.findlaw.com.
 *
 * Both clerk workbooks transcribe this paragraph and both differ from it:
 *   - Annual (PART XI!A5) and this app's former Annual text dropped the
 *     "guardian of the property ... guardian of the person ... must both"
 *     clause and the entire definition sentence.
 *   - Simplified (PART VII!A5) drops the same clause and carries two
 *     typographical errors, "poperty" and "in case or in kind".
 * Neither is reproduced. The one deliberate deviation from the printed
 * statute is typographic: the statute sets the defined term in curly
 * quotation marks and this constant uses them too -- see
 * tests/e2e/pdf-form-specific.spec.ts, which proves the embedded PDF font
 * actually renders them rather than dropping the glyphs.
 */
export const REMUNERATION_DECLARATION = 'The annual guardianship report of a guardian of the property and the annual '
  + 'guardianship report of a guardian of the person must both include a declaration '
  + 'of all remuneration received by the guardian from any source for services '
  + 'rendered to or on behalf of the ward. As used in this paragraph, the term '
  + '“remuneration” means any payment or other benefit made directly or indirectly, '
  + 'overtly or covertly, or in cash or in kind to the guardian.';

/**
 * What the declaration says when the guardian received nothing. Milestone 58D
 * established this for Annual: "no section at all" is not a declaration, and a
 * reader cannot tell a guardian who received nothing from a form that omitted
 * the question. Milestone 60J applies the same to Simplified, so the two forms
 * do not answer the same statute in two different ways.
 */
export const REMUNERATION_NONE_REPORTED = 'No remuneration reported for this period.';
