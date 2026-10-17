// A new year clears what describes the year just closed and keeps what
// describes the ward (the requester's rule, 2026-10-17: "basic info that
// doesn't change should be kept ... last year's end balance should be new
// year's starting. Name, address etc should carry over, expenditures should
// not"). Found by the code review of 74J-2 and 74O-5: a new year emptied the
// accountings' schedules and Part XI but kept each one's "I verify there are
// no items" tick, so last year's "none" answered the new year's remuneration
// declaration (section 744.367(3)(a), which the export checks require
// answered) and printed on its PDF; the Simplified's Part VII the same; an
// out-of-balance explanation and the Simplified Plan preparer's Date Signed
// carried too. Decided the same day: the ticks of every list a new year
// empties are asked again (Schedule D's holdings carry, and their ticks with
// them); the Annual Plan keeps Questions 3, 9 and 10 whole (3G's benefits
// table and the directives' details with them); the Simplified Plan keeps
// Questions 2 and 4; the Plan for Minors keeps the minor's current residence
// and Question 4; the Start New Year dialog says what each form keeps.
import { describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
globalThis.window = globalThis.window || globalThis;

const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const years = await import('../../src/core/filing/filing-years.js');

const json = (x) => JSON.parse(JSON.stringify(x));
const newYear = (type, extra) => {
  const d = { ...json(initializeEmptyData(type)), inventoryType: type, ...json(extra) };
  years.resetYearlyFieldsForNewYear(d, type);
  return d;
};
const ROW = { date: '2025-03-01', description: 'x', amount: 5 };

describe("the accountings: a list the new year empties asks its \"no items\" question again", () => {
  for (const type of ['annual', 'finalAccounting', 'trustAccounting']) {
    test(`${type}: the emptied schedules, Part XI and the Final Report are unanswered; Schedule D keeps its ticks`, () => {
      const ticks = { scha: true, schb1: true, schb2: true, schb3: true, schb4: true, schc: true, sche: true, schf1: true, schf2: true,
        remuneration: true, finalreserved: true, finalturnover: true, schd1: true, schd5: true };
      const d = newYear(type, { scheduleNoItems: ticks, schD1: [], schA: [ROW] });
      const answered = Object.keys(d.scheduleNoItems).filter((k) => d.scheduleNoItems[k]).sort();
      expect(answered).toEqual(['schd1', 'schd5']);
    });
  }

  test("an out-of-balance explanation describes the year just closed", () => {
    expect(newYear('annual', { reconcileExplanation: 'A deposit in transit at year end.' }).reconcileExplanation).toBe('');
  });

  test("the Simplified: Part VII's \"none\" is asked again with its rows", () => {
    const d = newYear('simplified', { scheduleNoItems: { remuneration: true } });
    expect(d.scheduleNoItems.remuneration).toBe(false);
  });

  test('the Initial Inventory keeps its ticks, as it keeps its schedules', () => {
    expect(newYear('guardian', { scheduleNoItems: { a1: true, c4: true } }).scheduleNoItems).toEqual({ a1: true, c4: true });
  });
});

describe('the Plans: what describes the ward carries, the year resets', () => {
  test("the Annual Plan keeps Questions 3, 9 and 10 whole -- 3G's benefits table and the directives' details with them", () => {
    const benefits = json(initializeEmptyData('planAnnual').benefits);
    const first = Object.keys(benefits)[0];
    benefits[first] = { ...benefits[first], eligible: 'Yes', appliedFor: 'No' };
    const directive = { title: 'Durable Power of Attorney', dateSigned: '2019-05-01', signedBy: 'Ward', agents: 'Jane', alternates: '', relationship: 'Daughter', contact: '', courtRevoked: 'No', orderDate: '', orderCounty: '' };
    const d = newYear('planAnnual', {
      residenceAddress: '12 Elm St', q3SettingALF: true, q3MedPrimary: true, q3BenefitsExplain: 'Medicare', benefits,
      q9MentalDementia: true, q9UsesWheelchair: true, q10Executed: true, q10ExecPOA: true, q10Directives: [directive],
      q5Activities: 'Painting', q11NoRemuneration: true,
    });
    expect([d.residenceAddress, d.q3SettingALF, d.q3MedPrimary, d.q3BenefitsExplain, d.benefits[first].eligible, d.benefits[first].appliedFor,
      d.q9MentalDementia, d.q9UsesWheelchair, d.q10Executed, d.q10ExecPOA, d.q10Directives])
      .toEqual(['12 Elm St', true, true, 'Medicare', 'Yes', 'No', true, true, true, true, [directive]]);
    expect([d.q5Activities, d.q11NoRemuneration], 'the year-specific answers reset').toEqual(['', false]);
  });

  test("the Simplified Plan keeps Questions 2 and 4; the preparer's Date Signed resets with every signature date", () => {
    const d = newYear('planSimplified', { q2BestPlacement: 'Near family', q4Diagnosis: 'Dementia', q3MedicalTreatment: 'Annual physical', preparer_signatureDate: '2025-12-31' });
    expect([d.q2BestPlacement, d.q4Diagnosis, d.q3MedicalTreatment, d.preparer_signatureDate]).toEqual(['Near family', 'Dementia', '', '']);
  });

  test("the Plan for Minors keeps the minor's current residence and Question 4's proposed medical services", () => {
    const d = newYear('planMinor', {
      q1ResidenceName: 'Family home', q1Street: '5 Oak Ave', q1City: 'Clearwater', q1State: 'FL', q1Zip: '33755', q1Phone: '727-555-0100',
      q4Primary: true, q4PrimaryFreq: 'Annually', q4Dentist: true, q4DentistFreq: 'Annually', q4Explain: 'Braces', q5SchoolProgress: 'Grade 5',
    });
    expect([d.q1ResidenceName, d.q1Street, d.q1City, d.q1State, d.q1Zip, d.q1Phone, d.q4Primary, d.q4PrimaryFreq, d.q4Dentist, d.q4DentistFreq, d.q4Explain])
      .toEqual(['Family home', '5 Oak Ave', 'Clearwater', 'FL', '33755', '727-555-0100', true, 'Annually', true, 'Annually', 'Braces']);
    expect(d.q5SchoolProgress).toBe('');
  });
});

describe('the Start New Year dialog says what each form keeps', () => {
  test('the accountings name the remuneration and the "no items" answers; each Plan names what it keeps', () => {
    const note = (type) => years.newYearNote(type);
    expect(note('annual')).toContain('Part XI');
    expect(note('annual')).toContain('"I verify there are no items" answers are asked again');
    expect(note('simplified')).toContain("Part VII's remuneration");
    expect(note('planAnnual')).toBe("The new year keeps the ward's and the guardians' details, where the ward lives, and the answers to Questions 3, 9 and 10 (the care plan, disabilities and advance directives) for you to review. The plan's other answers, signatures and dates are cleared for the new filing: each describes one year.");
    expect(note('planSimplified')).toBe("The new year keeps the ward's and the guardians' details and the answers to Questions 2 and 4 (why this is the best placement, and the ward's diagnosis and conditions) for you to review. The plan's other answers, signatures and dates are cleared for the new filing: each describes one year.");
    expect(note('planMinor')).toBe("The new year keeps the minor's and the guardians' details, the minor's current residence, and Question 4's proposed medical services for you to review. The plan's other answers, signatures and dates are cleared for the new filing: each describes one year.");
    expect(note('planInitial')).toBe("The new year keeps the ward's and the guardians' details. The plan's answers, signatures and dates are cleared for the new filing: each describes one year.");
  });
});
