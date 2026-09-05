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
        q9Providers: [
          { name: 'Ann Rivera', providerType: 'Primary Care', examDate: '2026-01-05', street: '1 Med Plz', cityStateZip: 'Clearwater, FL 33755' },
        ],
        q7MajorDecisions: 'Coordinate specialized care.',
        q8RestoreRights: 'No change.',
        q9DNR: false,
        q9LivingWill: false,
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
        containsElectronicSignatureNotice: rawPdfString.includes('pursuant to Fla. R. Gen. Prac'),
        rawPdfString,
      };
    });

    const extractedText = await extractPdfText(result.rawPdfString);

    expect(result.hasStructTreeRoot).toBe(true);
    expect(result.hasMarkInfo).toBe(true);
    expect(result.hasNoRasterImage).toBe(true);
    expect(result.numPages).toBeGreaterThan(1);
    expect(extractedText).toContain('Private Residence');
    expect(extractedText).toContain('Yes');
    expect(extractedText).toContain('Ann Rivera');
    // Plan Initial signatures are wet-ink (pen-signed) -- no electronic
    // /s/ legal notice should appear anywhere in the document.
    expect(result.containsElectronicSignatureNotice).toBe(false);
    expect(extractedText).toContain('Jordan Alvarez');
    expect(extractedText).toContain('0123456');
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
        containsElectronicSignatureNotice: rawPdfString.includes('pursuant to Fla. R. Gen. Prac'),
        rawPdfString,
      };
    });

    const extractedText = await extractPdfText(result.rawPdfString);

    expect(result.hasStructTreeRoot).toBe(true);
    expect(result.hasNoRasterImage).toBe(true);
    expect(result.numPages).toBeGreaterThan(1);
    expect(extractedText).toContain('Lee Park');
    expect(result.containsElectronicSignatureNotice).toBe(false);
    expect(extractedText).toContain('Morgan Ellis');
    expect(extractedText).toContain('0234567');
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
        containsElectronicSignatureNotice: rawPdfString.includes('pursuant to Fla. R. Gen. Prac'),
        rawPdfString,
      };
    });

    const extractedText = await extractPdfText(result.rawPdfString);

    expect(result.hasStructTreeRoot).toBe(true);
    expect(result.hasNoRasterImage).toBe(true);
    expect(result.numPages).toBeGreaterThan(1);
    expect(extractedText).toContain('Ortiz');
    expect(result.containsElectronicSignatureNotice).toBe(false);
    expect(extractedText).toContain('Taylor Reed');
    expect(extractedText).toContain('Robin Cruz');
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
        containsElectronicSignatureNotice: rawPdfString.includes('pursuant to Fla. R. Gen. Prac'),
        rawPdfString,
      };
    });

    const extractedText = await extractPdfText(result.rawPdfString);

    expect(result.hasStructTreeRoot).toBe(true);
    expect(result.hasNoRasterImage).toBe(true);
    expect(result.numPages).toBeGreaterThan(0);
    expect(extractedText).toContain('Do Not Resuscitate');
    expect(result.containsElectronicSignatureNotice).toBe(false);
    expect(extractedText).toContain('Casey Nguyen');
  });
});
