import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 19-2: brings the four plan-* features (previously raster
// html2pdf/html2canvas only, outside the Milestone 17-19 accessibility
// work) onto the shared tagged/vector PDF engine. Mirrors the assertion
// style of pdf-wcag-compliance.spec.ts's Slice 19C/19E tests for the
// other three features: call the engine directly with a hand-built model
// via page.evaluate rather than through the UI Save-as-PDF button, since
// the app's navigate() has a pre-existing race (confirmed independent of
// this milestone -- it also reproduces on an unmodified checkout) where
// it doesn't await renderPage(), making UI-driven PDF-export specs flaky.

test.describe('Milestone 19-2: Plan-* features on the shared vector PDF engine', () => {
  test('Plan Initial: generates a tagged, non-raster PDF with checklist and wet-ink signature content', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const { buildPlanInitialModel, generateCourtFormPdf } = await (window as any).loadPlanInitialPdf();

      const model = buildPlanInitialModel({
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
        q2Setting: 'Private Residence',
        q3MedPrimary: true,
        q3MedDentist: true,
        q4Mental: 'None',
        q5Personal: 'Family and Friends',
        q6FamilyFriends: true,
        q7Medicare: true,
        q9Providers: [
          { name: 'Dr. Ann Rivera', street: '5 Health Way', cityStateZip: 'Clearwater, FL 33755', phone: '727-555-0110', providerType: 'Primary Care', examDate: '2026-01-05' },
        ],
        adls: { bathing: 'Independent', dressing: 'Independent' },
        mentalDementia: true,
        physMobility: true,
        usesWalker: true,
        q11NoDirectives: true,
        q11StepResidence: true,
        q11StepInterviewed: true,
        needsGlasses: true,
        committeeIncorporated: 'Yes',
        q11Directives: [],
        certConsulted: true,
        certRecognizeRights: true,
        planGuardians: [
          { name: 'Jordan Alvarez', signatureDate: '2026-03-01', ssn: '***-**-1234', phone: '727-555-0102', relationship: 'Son', street: '10 Bay St', cityStateZip: 'Clearwater, FL 33755' },
        ],
        attorney_name: 'Casey Nolan, Esq.',
        attorney_signatureDate: '2026-03-01',
        attorney_bar: '0123456',
        attorney_phone: '727-555-0199',
        attorney_street: '200 Court Ave',
        attorney_cityStateZip: 'Clearwater, FL 33755',
      });

      const doc = await generateCourtFormPdf(model);
      const rawPdfString = doc.output();

      return {
        numPages: doc.internal.getNumberOfPages(),
        hasStructTreeRoot: /\/StructTreeRoot/.test(rawPdfString),
        hasMarkInfo: /\/MarkInfo\s*<<\s*\/Marked\s*true/.test(rawPdfString),
        hasNoRasterImage: !/\/Subtype\s*\/Image/.test(rawPdfString) && !/\/Filter\s*\/DCTDecode/.test(rawPdfString),
        containsChecklistItem: rawPdfString.includes('Private Residence'),
        containsCheckedYesPrefix: rawPdfString.includes('Yes'),
        containsProviderName: rawPdfString.includes('Ann Rivera'),
        containsElectronicSignatureNotice: rawPdfString.includes('pursuant to Fla. R. Gen. Prac'),
        containsGuardianPrintedName: rawPdfString.includes('Jordan Alvarez'),
        containsAttorneyBar: rawPdfString.includes('0123456'),
      };
    });

    expect(result.hasStructTreeRoot).toBe(true);
    expect(result.hasMarkInfo).toBe(true);
    expect(result.hasNoRasterImage).toBe(true);
    expect(result.numPages).toBeGreaterThan(1);
    expect(result.containsChecklistItem).toBe(true);
    expect(result.containsCheckedYesPrefix).toBe(true);
    expect(result.containsProviderName).toBe(true);
    // Plan Initial signatures are wet-ink (pen-signed) -- no electronic
    // /s/ legal notice should appear anywhere in the document.
    expect(result.containsElectronicSignatureNotice).toBe(false);
    expect(result.containsGuardianPrintedName).toBe(true);
    expect(result.containsAttorneyBar).toBe(true);
  });

  test('Plan Annual: generates a tagged, non-raster PDF with rights/ADL tables and wet-ink signature content', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const { buildPlanAnnualModel, generateCourtFormPdf } = await (window as any).loadPlanAnnualPdf();

      const model = buildPlanAnnualModel({
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
      });

      const doc = await generateCourtFormPdf(model);
      const rawPdfString = doc.output();

      return {
        numPages: doc.internal.getNumberOfPages(),
        hasStructTreeRoot: /\/StructTreeRoot/.test(rawPdfString),
        hasNoRasterImage: !/\/Subtype\s*\/Image/.test(rawPdfString) && !/\/Filter\s*\/DCTDecode/.test(rawPdfString),
        containsProviderName: rawPdfString.includes('Lee Park'),
        containsElectronicSignatureNotice: rawPdfString.includes('pursuant to Fla. R. Gen. Prac'),
        containsGuardianPrintedName: rawPdfString.includes('Morgan Ellis'),
        containsAttorneyBar: rawPdfString.includes('0234567'),
      };
    });

    expect(result.hasStructTreeRoot).toBe(true);
    expect(result.hasNoRasterImage).toBe(true);
    expect(result.numPages).toBeGreaterThan(1);
    expect(result.containsProviderName).toBe(true);
    expect(result.containsElectronicSignatureNotice).toBe(false);
    expect(result.containsGuardianPrintedName).toBe(true);
    expect(result.containsAttorneyBar).toBe(true);
  });

  test('Plan Minor: generates a tagged, non-raster PDF with checklist and wet-ink signature content', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const { buildPlanMinorModel, generateCourtFormPdf } = await (window as any).loadPlanMinorPdf();

      const model = buildPlanMinorModel({
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
      });

      const doc = await generateCourtFormPdf(model);
      const rawPdfString = doc.output();

      return {
        numPages: doc.internal.getNumberOfPages(),
        hasStructTreeRoot: /\/StructTreeRoot/.test(rawPdfString),
        hasNoRasterImage: !/\/Subtype\s*\/Image/.test(rawPdfString) && !/\/Filter\s*\/DCTDecode/.test(rawPdfString),
        containsProviderName: rawPdfString.includes('Ortiz'),
        containsElectronicSignatureNotice: rawPdfString.includes('pursuant to Fla. R. Gen. Prac'),
        containsGuardianPrintedName: rawPdfString.includes('Taylor Reed'),
        containsAttorneyName: rawPdfString.includes('Robin Cruz'),
      };
    });

    expect(result.hasStructTreeRoot).toBe(true);
    expect(result.hasNoRasterImage).toBe(true);
    expect(result.numPages).toBeGreaterThan(1);
    expect(result.containsProviderName).toBe(true);
    expect(result.containsElectronicSignatureNotice).toBe(false);
    expect(result.containsGuardianPrintedName).toBe(true);
    expect(result.containsAttorneyName).toBe(true);
  });

  test('Plan Simplified: generates a tagged, non-raster PDF with narrative Q&A and wet-ink signature content', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const { buildPlanSimplifiedModel, generateCourtFormPdf } = await (window as any).loadPlanSimplifiedPdf();

      const model = buildPlanSimplifiedModel({
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
      });

      const doc = await generateCourtFormPdf(model);
      const rawPdfString = doc.output();

      return {
        numPages: doc.internal.getNumberOfPages(),
        hasStructTreeRoot: /\/StructTreeRoot/.test(rawPdfString),
        hasNoRasterImage: !/\/Subtype\s*\/Image/.test(rawPdfString) && !/\/Filter\s*\/DCTDecode/.test(rawPdfString),
        containsDirective: rawPdfString.includes('Do Not Resuscitate'),
        containsElectronicSignatureNotice: rawPdfString.includes('pursuant to Fla. R. Gen. Prac'),
        containsGuardianPrintedName: rawPdfString.includes('Casey Nguyen'),
      };
    });

    expect(result.hasStructTreeRoot).toBe(true);
    expect(result.hasNoRasterImage).toBe(true);
    expect(result.numPages).toBeGreaterThan(0);
    expect(result.containsDirective).toBe(true);
    expect(result.containsElectronicSignatureNotice).toBe(false);
    expect(result.containsGuardianPrintedName).toBe(true);
  });
});
