// Milestone 73N part 2: the Simplified Annual Plan's questions as the court's
// own form words them (reference/plan-forms/plan-simplified-original.txt),
// read by both the screen and the PDF, so the question a guardian answers is
// the question the filed plan asks. Both used to shorten them: Questions 3
// and 5-9 lost their parentheticals -- Question 9's "(this does NOT include
// payments ... from a government benefits program such as Social Security,
// Medicaid ...)" among them -- so the guardian answered a narrower question
// on screen than the filed PDF asked, and 7-9 printed as "Q7.", "Q8.",
// "Q9.". tests/unit/court-text-parity.spec.js compares every entry with the
// original's text.
//
// Each question is kept without its number; `numbered()` puts it back for the
// filed document, where the original prints it.

export const PLAN_SIMPLIFIED_TEXT = Object.freeze({
  intro: 'The undersigned, as the Guardian Advocate(s) or Guardian(s) of the above-named ward, report(s) to the court as follows:',
  q1: 'The name and address of all places the ward has resided during the preceding year.',
  q2: 'Why is this the best placement for the ward?',
  q3: 'List all professional medical/mental health treatment the ward has received during the past year (did the ward see a doctor, dentist, or mental health professional, if so when?):',
  q4: "What is/are the ward's current diagnosis and condition(s) which cause(s) him/her to continue to need a guardian advocate/guardian?",
  q5: 'What personal and social services were provided for the ward in the past year (i.e., programs attended, vacations, in-home activities, out-of-the home activities, what does the ward like to do for entertainment or in his/her free time)?',
  q6: 'In the past year, how has the ward interacted with others, including the guardian advocate(s)/guardian(s) and family members (if the ward is not able to interact, state why)?',
  q7: 'Should any of the rights previously delegated to the guardian advocate(s)/guardian(s) be restored to the ward at this time?',
  q7Yes: 'Yes. If Yes, identify the specific right(s) (such as to consent to medical treatment, to determine residence, to manage property, etc.) and explain why it should be restored.',
  q8: 'Since the guardianship was established or the last annual guardianship report, the following was executed by or on behalf of the Ward (attach and file copies of the documents referenced below if not previously filed with the Court):',
  q9: 'As the Guardian Advocate(s)/Guardian(s) have you received any payments, goods, or services for work or care provided on behalf of the ward (this does NOT include payments, goods, or services received from a government benefits program such as Social Security, Medicaid, Medicare, and/or Agency for Persons with Disabilities)?',
  q9Yes: 'Yes. If Yes, please explain.',
  declaration: 'Under penalty of perjury, I declare that I have read the foregoing and the facts alleged are true to the best of my knowledge and belief.',
});

/** Question `n` as the filed document prints it: "7. Should any of the rights ...". */
export const numbered = (n, text) => `${n}. ${text}`;
