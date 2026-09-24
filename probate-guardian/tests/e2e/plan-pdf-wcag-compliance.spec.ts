import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { extractPdfText } from './support/pdf-extract';

// Milestone 19-2: brings the four plan-* features (previously raster
// html2pdf/html2canvas only, outside the Milestone 17-19 accessibility
// work) onto the shared tagged/vector PDF engine. Mirrors the assertion
// style of pdf-wcag-compliance.spec.ts's Slice 19C/19E tests for the
// other three features: call the engine directly with a hand-built model
// via page.evaluate rather than through the UI Save-as-PDF button, since
// the app's navigate() has a pre-existing race (confirmed independent of
// this milestone -- it also reproduces on an unmodified checkout) where
// it doesn't await renderPage(), making UI-driven PDF-export specs flaky.
//
// Milestone 43E: the four bodies below were hand-duplicated (build model,
// generate PDF, check StructTreeRoot/no-raster/page-count, extract text,
// assert content) -- converted to one CONFIGS-driven loop, matching the
// pattern pdf-preview-viewer.spec.ts already established for these same
// four types. Each type's own model data (genuinely distinct field names
// per filing type) and its own list of expected extracted-text substrings
// are the only real per-type variation; `minPages` captures the one
// assertion that wasn't uniform across all four.
//
// Milestone 43F, Decision 1: the proposal's own recommended default (add
// real axe-core WCAG scans, using pdf-form-specific.spec.ts:538 as the
// template) does not survive direct inspection -- that test is titled
// "axesCheck" but never calls axe-core, and no axe-core dependency or call
// exists anywhere in this repo (confirmed via a repo-wide grep). axe-core
// is also architecturally the wrong tool here regardless: it scans a live
// browser DOM for accessibility issues, and this whole file (like the rest
// of the PDF-accessibility cluster) never renders anything to a DOM --
// jsPDF hands back raw PDF bytes, which axe-core has no way to inspect.
// What this cluster actually tests, everywhere, is PDF/UA-1 *tag*
// structure via direct regex assertions against the generated PDF bytes
// (StructTreeRoot, MarkInfo, /ColSpan, heading order, embedded fonts). This
// file only checked MarkInfo for one of the four Plan types (Plan Initial)
// -- an asymmetry inherited unchanged through 43E's own table-driven
// rewrite. Closing the actual coverage gap means applying that same
// structural-regex methodology uniformly: MarkInfo is now asserted for all
// four types, and a heading-order-has-no-skipped-level check (the same
// computation pdf-form-specific.spec.ts's Milestone 20 test already uses)
// is added for all four too.

type WcagConfig = {
  name: string;
  loaderGlobal: string;
  buildFnName: string;
  model: Record<string, unknown>;
  minPages: number;
  expectedText: string[];
};

const CONFIGS: WcagConfig[] = [
  {
    name: 'Plan Initial',
    loaderGlobal: 'loadPlanInitialPdf',
    buildFnName: 'buildPlanInitialModel',
    minPages: 1,
    model: {
      wardName: 'Initial Plan Ward',
      caseNumber: '26-003100-GD',
      county: 'Pinellas',
      successorGuardianship: '',
      inceptionDate: '2026-01-10',
      lettersSignedDate: '2026-01-12',
      periodFrom: '2026-01-12',
      periodTo: '2026-03-12',
      guardianNames: 'Jordan Alvarez',
      attorneyName: 'Casey Nolan, Esq.',
      wardLiving: 'In a private residence leased or owned by them (house, condo or apartment)',
      residenceAddress: '10 Bay St',
      residenceCityStateZip: 'Clearwater, FL 33755',
      residencePhone: '727-555-0101',
      q1PreexistingDirectives: 'None on file.',
      q2PrivateResidence: true,
      q3MedPrimary: true,
      q3MedDentist: true,
      q4None: true,
      q4Explain: 'No mental health services are needed at this time.',
      q9Providers: [
        { name: 'Ann Rivera', providerType: 'Primary Care', examDate: '2026-01-05', street: '1 Med Plz', cityStateZip: 'Clearwater, FL 33755' },
      ],
      q7MajorDecisions: 'Coordinate specialized care.',
      q8RestoreRights: 'No change.',
      q9DNR: false,
      q9LivingWill: false,
      planGuardians: [
        { name: 'Jordan Alvarez', useSlashS: false, signatureDate: '2026-03-01', ssn: '***-**-1234', phone: '727-555-0102', relationship: 'Son', street: '10 Bay St', cityStateZip: 'Clearwater, FL 33755' },
      ],
      attorney_name: 'Casey Nolan, Esq.',
      attorney_signatureDate: '2026-03-01',
      attorney_bar: '0123456',
      attorney_phone: '727-555-0199',
      attorney_street: '200 Court Ave',
      attorney_cityStateZip: 'Clearwater, FL 33755',
    },
    // Legacy useSlashS values are inert: normal filings use the standard
    // electronic /s/ presentation.
    expectedText: ['Private Residence', 'Yes', 'Ann Rivera', 'Signature (Electronic /s/', 'Jordan Alvarez', '/s/ Jordan Alvarez', '0123456'],
  },
  {
    name: 'Plan Annual',
    loaderGlobal: 'loadPlanAnnualPdf',
    buildFnName: 'buildPlanAnnualModel',
    minPages: 1,
    model: {
      wardName: 'Annual Plan Ward',
      caseNumber: '26-003200-GD',
      county: 'Pinellas',
      ssn: '***-**-9999',
      gid: '2025-01-10',
      periodFrom: '2026-01-10',
      periodTo: '2027-01-10',
      guardian: 'Morgan Ellis',
      attorney: 'Drew Sato, Esq.',
      wardLiving: 'In a private residence leased or owned by them',
      residenceAddress: '22 Palm Ct',
      residenceCityStateZip: 'Largo, FL 33770',
      q3SettingPrivate: true,
      q3MedPrimary: true,
      q3MentalNone: true,
      q3PersonalFamily: true,
      q3SocialFamily: true,
      q3BenefitsNone: true,
      q4Providers: [
        { name: 'Dr. Lee Park', street: '9 Clinic Rd', cityStateZip: 'Largo, FL 33770', providerType: 'Primary Care', visits: '4' },
      ],
      q5SocialSkills: 'Engages well with family.',
      q5Activities: 'Weekly community outings.',
      rights: { vote: 'Retained' },
      adls: { bathing: 'Independent' },
      q9MentalNone: true,
      q9PhysNone: true,
      q10NoDirectives: true,
      q10StepResidence: true,
      q11NoRemuneration: true,
      q11NoRemunerationName: 'Morgan Ellis',
      certConsulted: true,
      certPhysicianAttached: true,
      planGuardians: [
        { name: 'Morgan Ellis', signatureDate: '2026-03-01', ssn: '***-**-4321', phone: '727-555-0200', mailingStreet: '22 Palm Ct', mailingCityStateZip: 'Largo, FL 33770' },
      ],
      attorney_signatureDate: '2026-03-01',
      attorney_bar: '0234567',
      attorney_phone: '727-555-0299',
      attorney_street: '300 Court Ave',
      attorney_cityStateZip: 'Largo, FL 33770',
    },
    expectedText: ['Lee Park', 'Signature (Electronic /s/', 'Morgan Ellis', '0234567'],
  },
  {
    name: 'Plan Minor',
    loaderGlobal: 'loadPlanMinorPdf',
    buildFnName: 'buildPlanMinorModel',
    minPages: 1,
    model: {
      wardName: 'Minor Ward',
      ucn: '522026GD001234',
      ref: 'REF-9001',
      county: 'Pinellas',
      periodFrom: '2026-01-01',
      periodTo: '2027-01-01',
      guardianName: 'Taylor Reed',
      q1ResidenceName: 'Family Home',
      q1Street: '5 Oak Ln',
      q1City: 'Clearwater',
      q1State: 'FL',
      q1Zip: '33755',
      q3Providers: [
        { first: 'Sam', last: 'Ortiz', providerType: 'Pediatrician', visits: '2', street: '1 Med Plz', city: 'Clearwater', state: 'FL', zip: '33755' },
      ],
      q4Primary: true,
      q4PT: true,
      q5SchoolProgress: 'Progressing well.',
      q5SocialDevelopment: 'Improving peer relationships.',
      q5Communicates: 'Communicates clearly.',
      q5Interpersonal: 'Maintains close friendships.',
      q5NoUnmetNeeds: true,
      certConsulted: true,
      certPhysicianAttached: true,
      planGuardians: [
        { name: 'Taylor Reed', signatureDate: '2026-03-01', tin: '***-**-1111', phone: '727-555-0300', mailingStreet: '5 Oak Ln', mailingCityStateZip: 'Clearwater, FL 33755' },
      ],
      preparer_name: 'Jamie Kim',
      preparer_signatureDate: '2026-03-01',
      attorney_name: 'Robin Cruz, Esq.',
      attorney_signatureDate: '2026-03-01',
      attorney_bar: '0345678',
    },
    expectedText: ['Ortiz', 'Signature (Electronic /s/', 'Taylor Reed', 'Robin Cruz'],
  },
  {
    name: 'Plan Simplified',
    loaderGlobal: 'loadPlanSimplifiedPdf',
    buildFnName: 'buildPlanSimplifiedModel',
    minPages: 0,
    model: {
      wardName: 'Simplified Plan Ward',
      caseNumber: '26-003300-GD',
      county: 'Pinellas',
      periodFrom: '2026-01-01',
      periodTo: '2027-01-01',
      q1Residences: 'Same address throughout the year.',
      q2BestPlacement: 'Close to family support.',
      q3MedicalTreatment: 'Annual physical exam only.',
      q4Diagnosis: 'Mild cognitive impairment.',
      q5SocialServices: 'Weekly visits from family.',
      q6Interaction: 'Positive and engaged.',
      q7RestoreRights: 'No',
      q8DNR: true,
      q9Remuneration: 'No',
      planGuardians: [
        { name: 'Casey Nguyen', signatureDate: '2026-03-01', email: 'casey@example.com', phone: '727-555-0400', mailingAddress: '7 Bay Dr, Largo, FL 33770' },
      ],
    },
    expectedText: ['Do Not Resuscitate', 'Signature (Electronic /s/', 'Casey Nguyen'],
  },
];

test.describe('Milestone 19-2: Plan-* features on the shared vector PDF engine', () => {
  for (const config of CONFIGS) {
    test(`${config.name}: generates a tagged, non-raster PDF with electronic signature content`, async ({ page }) => {
      await freshStartNoPassword(page);

      const result = await page.evaluate(async ({ loaderGlobal, buildFnName, model }) => {
        const mod = await (window as any)[loaderGlobal]();
        const doc = await mod.generateCourtFormPdf(mod[buildFnName](model));
        const rawPdfString = doc.output();
        const headingLevels = [...rawPdfString.matchAll(/\/S \/(H[1-6])/g)].map((m) => parseInt(m[1].slice(1), 10));
        return {
          numPages: doc.internal.getNumberOfPages(),
          hasStructTreeRoot: /\/StructTreeRoot/.test(rawPdfString),
          hasMarkInfo: /\/MarkInfo\s*<<\s*\/Marked\s*true/.test(rawPdfString),
          hasNoRasterImage: !/\/Subtype\s*\/Image/.test(rawPdfString) && !/\/Filter\s*\/DCTDecode/.test(rawPdfString),
          headingLevels,
          rawPdfString,
        };
      }, { loaderGlobal: config.loaderGlobal, buildFnName: config.buildFnName, model: config.model });

      const extractedText = await extractPdfText(result.rawPdfString);

      expect(result.hasStructTreeRoot).toBe(true);
      expect(result.hasMarkInfo).toBe(true);
      expect(result.hasNoRasterImage).toBe(true);
      expect(result.numPages).toBeGreaterThan(config.minPages);
      for (const text of config.expectedText) expect(extractedText).toContain(text);

      // Milestone 43F: PDF/UA-1 heading order must never skip a level.
      let prevLevel = 0;
      for (const level of result.headingLevels) {
        if (prevLevel > 0) expect(level).toBeLessThanOrEqual(prevLevel + 1);
        prevLevel = level;
      }
    });
  }
});
