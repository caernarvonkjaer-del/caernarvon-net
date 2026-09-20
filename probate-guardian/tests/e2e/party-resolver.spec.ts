import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Exercises the hydration/dehydration core (src/core/party-resolver.js,
// persistence-rewrite Milestone 3) directly against hand-built parties and
// filings -- nothing here goes through the UI, since nothing in the app
// wires this to a form yet (that's Milestone 4). Each filing is a plain
// object pushed straight into window.caseFile.wards, not created via the
// real Add Ward flow, since only the field-mapping shape matters here.

test.describe('party-resolver (unwired hydration/dehydration core)', () => {
  test('createParty + resolveParty round-trip, and resolveParty follows a merge tombstone', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const party = w.createParty('guardian');
      const foundDirect = w.resolveParty(party.id);

      const other = w.createParty('guardian');
      other.mergedInto = party.id;
      const foundThroughTombstone = w.resolveParty(other.id);

      return {
        partyInCaseFile: w.caseFile.parties.includes(party),
        foundDirectIsSameParty: foundDirect === party,
        foundThroughTombstoneIsSameParty: foundThroughTombstone === party,
        rolesIncludesGuardian: party.roles.includes('guardian'),
      };
    });

    expect(result.partyInCaseFile).toBe(true);
    expect(result.foundDirectIsSameParty).toBe(true);
    expect(result.foundThroughTombstoneIsSameParty).toBe(true);
    expect(result.rolesIncludesGuardian).toBe(true);
  });

  test('identitySlotForPath recognizes array/object/flat identity paths and ignores everything else', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const planInitialFiling = { inventoryType: 'planInitial' };
      const guardianFiling = { inventoryType: 'guardian' };
      const annualFiling = { inventoryType: 'annual' };
      return {
        wardName: w.identitySlotForPath(planInitialFiling, 'wardName'),
        arrayPath: w.identitySlotForPath(planInitialFiling, 'planGuardians.1.ssn'),
        objectPath: w.identitySlotForPath(guardianFiling, 'attorney.phone'),
        flatPath: w.identitySlotForPath(annualFiling, 'attorney_bar'),
        nonIdentitySchedulePath: w.identitySlotForPath(annualFiling, 'schA.0.amount'),
        nonIdentityTopLevelPath: w.identitySlotForPath(planInitialFiling, 'periodFrom'),
        wrongTypeForThisPath: w.identitySlotForPath(guardianFiling, 'attorney_bar'), // guardian's attorney is an object, not flat
      };
    });

    // Milestone 58A added fieldKeys: the canonical Party key(s) a path feeds,
    // so one edit can be merged without its neighbours. Asserted here rather
    // than loosened to objectContaining, because the mapping is the contract.
    expect(result.wardName).toEqual({ role: 'ward', index: 0, fieldKeys: ['name'] });
    expect(result.arrayPath).toEqual({ role: 'guardian', index: 1, fieldKeys: ['taxId'] });
    expect(result.objectPath).toEqual({ role: 'attorney', index: 0, fieldKeys: ['phone'] });
    expect(result.flatPath).toEqual({ role: 'attorney', index: 0, fieldKeys: ['barNumber'] });
    expect(result.nonIdentitySchedulePath).toBeNull();
    expect(result.nonIdentityTopLevelPath).toBeNull();
    expect(result.wrongTypeForThisPath).toBeNull();
  });

  test('identitySlotForPath covers the remaining Milestone 5 types (simplified, planSimplified, planAnnual, planMinor)', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      return {
        simplifiedGuardian: w.identitySlotForPath({ inventoryType: 'simplified' }, 'guardians.0.ssn'),
        simplifiedAttorney: w.identitySlotForPath({ inventoryType: 'simplified' }, 'attorney_barNumber'),
        planSimplifiedGuardian: w.identitySlotForPath({ inventoryType: 'planSimplified' }, 'planGuardians.0.mailingAddress'),
        planSimplifiedPreparer: w.identitySlotForPath({ inventoryType: 'planSimplified' }, 'preparer_mailingStreet'),
        planAnnualGuardian: w.identitySlotForPath({ inventoryType: 'planAnnual' }, 'planGuardians.1.officeCityStateZip'),
        planAnnualAttorney: w.identitySlotForPath({ inventoryType: 'planAnnual' }, 'attorney_secondary_email'),
        planMinorGuardian: w.identitySlotForPath({ inventoryType: 'planMinor' }, 'planGuardians.0.tin'),
        planMinorPreparer: w.identitySlotForPath({ inventoryType: 'planMinor' }, 'preparer_tin'),
      };
    });

    expect(result.simplifiedGuardian).toEqual({ role: 'guardian', index: 0, fieldKeys: ['taxId'] });
    expect(result.simplifiedAttorney).toEqual({ role: 'attorney', index: 0, fieldKeys: ['barNumber'] });
    // A joined address field carries both halves, so it maps to both keys --
    // the one place a path is legitimately one-to-many.
    expect(result.planSimplifiedGuardian).toEqual({ role: 'guardian', index: 0, fieldKeys: ['street', 'cityStateZip'] });
    expect(result.planSimplifiedPreparer).toEqual({ role: 'preparer', index: 0, fieldKeys: ['street'] });
    expect(result.planAnnualGuardian).toEqual({ role: 'guardian', index: 1, fieldKeys: ['officeCityStateZip'] });
    expect(result.planAnnualAttorney).toEqual({ role: 'attorney', index: 0, fieldKeys: ['secondaryEmail'] });
    expect(result.planMinorGuardian).toEqual({ role: 'guardian', index: 0, fieldKeys: ['taxId'] });
    expect(result.planMinorPreparer).toEqual({ role: 'preparer', index: 0, fieldKeys: ['taxId'] });
  });

  test('guardian (Initial Inventory): guardian row, nested attorney object, and nested preparer object all round-trip', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const filing = { inventoryType: 'guardian', wardName: 'Test Ward', guardians: [{}], attorney: {}, preparer: {} };

      w.writeRoleFields(filing, 'guardian', 0, { name: 'Jane Guardian', taxId: '123-45-6789', phone: '555-0100', street: '1 Main St', cityStateZip: 'Tampa, FL 33602' });
      w.writeRoleFields(filing, 'attorney', 0, { name: 'Rob Atty', barNumber: '998877', phone: '555-0200', email: 'rob@law.example', secondaryEmail: 'rob2@law.example', street: '2 Law Ave', cityStateZip: 'Tampa, FL 33602' });
      w.writeRoleFields(filing, 'preparer', 0, { name: 'Pat Preparer', taxId: '111-22-3333', phone: '555-0300', street: '3 Prep Rd', cityStateZip: 'Tampa, FL 33602' });

      return {
        guardianRow: filing.guardians[0],
        attorneyObj: filing.attorney,
        preparerObj: filing.preparer,
        readGuardian: w.readRoleFields(filing, 'guardian', 0),
        readAttorney: w.readRoleFields(filing, 'attorney', 0),
        readPreparer: w.readRoleFields(filing, 'preparer', 0),
      };
    });

    expect(result.guardianRow).toEqual({ name: 'Jane Guardian', ssnEin: '123-45-6789', phone: '555-0100', streetAddress: '1 Main St', cityStateZip: 'Tampa, FL 33602' });
    expect(result.attorneyObj).toEqual({ name: 'Rob Atty', barNumber: '998877', phone: '555-0200', email: 'rob@law.example', secondaryEmail: 'rob2@law.example', streetAddress: '2 Law Ave', cityStateZip: 'Tampa, FL 33602' });
    expect(result.preparerObj).toEqual({ name: 'Pat Preparer', ssnEin: '111-22-3333', phone: '555-0300', streetAddress: '3 Prep Rd', cityStateZip: 'Tampa, FL 33602' });
    expect(result.readGuardian).toEqual({ name: 'Jane Guardian', taxId: '123-45-6789', phone: '555-0100', street: '1 Main St', cityStateZip: 'Tampa, FL 33602' });
    expect(result.readAttorney).toEqual({ name: 'Rob Atty', barNumber: '998877', phone: '555-0200', email: 'rob@law.example', secondaryEmail: 'rob2@law.example', street: '2 Law Ave', cityStateZip: 'Tampa, FL 33602' });
    expect(result.readPreparer).toEqual({ name: 'Pat Preparer', taxId: '111-22-3333', phone: '555-0300', street: '3 Prep Rd', cityStateZip: 'Tampa, FL 33602' });
  });

  test('simplified: guardian row and flat attorney fields round-trip; this type has no preparer mapping', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const filing: any = { inventoryType: 'simplified', wardName: 'Test Ward', guardians: [{}] };

      w.writeRoleFields(filing, 'guardian', 0, { name: 'Jane Guardian', taxId: '123-45-6789', phone: '555-0100', email: 'jane@example.com', street: '1 Main St', cityStateZip: 'Tampa, FL 33602' });
      w.writeRoleFields(filing, 'attorney', 0, { name: 'Rob Atty', barNumber: '998877', phone: '555-0200', email: 'rob@law.example', secondaryEmail: 'rob2@law.example', street: '2 Law Ave', cityStateZip: 'Tampa, FL 33602' });
      w.writeRoleFields(filing, 'preparer', 0, { name: 'Should Not Write' }); // no-op: no mapping for this role/type

      return {
        guardianRow: filing.guardians[0],
        flatAttorney: { attorney: filing.attorney, attorney_barNumber: filing.attorney_barNumber, attorney_phone: filing.attorney_phone, attorney_email: filing.attorney_email, attorney_secondaryEmail: filing.attorney_secondaryEmail, attorney_street: filing.attorney_street, attorney_cityStateZip: filing.attorney_cityStateZip },
        preparerFieldsAbsent: !('preparer_name' in filing) && filing.preparer === undefined,
        readPreparer: w.readRoleFields(filing, 'preparer', 0),
      };
    });

    expect(result.guardianRow).toEqual({ name: 'Jane Guardian', ssn: '123-45-6789', phone: '555-0100', email: 'jane@example.com', mailingStreet: '1 Main St', mailingCityStateZip: 'Tampa, FL 33602' });
    expect(result.flatAttorney).toEqual({ attorney: 'Rob Atty', attorney_barNumber: '998877', attorney_phone: '555-0200', attorney_email: 'rob@law.example', attorney_secondaryEmail: 'rob2@law.example', attorney_street: '2 Law Ave', attorney_cityStateZip: 'Tampa, FL 33602' });
    expect(result.preparerFieldsAbsent).toBe(true);
    expect(result.readPreparer).toEqual({});
  });

  test('annual: guardian row (with office address), flat attorney (attorney_bar), nested preparer object round-trip', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const filing: any = { inventoryType: 'annual', wardName: 'Test Ward', guardians: [{}] };

      w.writeRoleFields(filing, 'guardian', 0, { name: 'Jane Guardian', taxId: '123-45-6789', phone: '555-0100', email: 'jane@example.com', street: '1 Main St', cityStateZip: 'Tampa, FL 33602', officeStreet: '9 Office Pkwy', officeCityStateZip: 'Tampa, FL 33603' });
      w.writeRoleFields(filing, 'attorney', 0, { name: 'Rob Atty', barNumber: '998877', phone: '555-0200' });
      w.writeRoleFields(filing, 'preparer', 0, { name: 'Pat Preparer', taxId: '111-22-3333' });

      return {
        guardianRow: filing.guardians[0],
        attorneyBar: filing.attorney_bar,
        attorneyName: filing.attorney,
        preparerObj: filing.preparer,
      };
    });

    expect(result.guardianRow).toEqual({ name: 'Jane Guardian', ssn: '123-45-6789', phone: '555-0100', email: 'jane@example.com', mailingStreet: '1 Main St', mailingCityStateZip: 'Tampa, FL 33602', officeStreet: '9 Office Pkwy', officeCityStateZip: 'Tampa, FL 33603' });
    expect(result.attorneyBar).toBe('998877');
    expect(result.attorneyName).toBe('Rob Atty');
    expect(result.preparerObj).toEqual({ name: 'Pat Preparer', ssn: '111-22-3333' });
  });

  test('planSimplified: guardian row address round-trips through the single joined mailingAddress field', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const filing: any = { inventoryType: 'planSimplified', wardName: 'Test Ward', planGuardians: [{}] };

      w.writeRoleFields(filing, 'guardian', 0, { name: 'Jane Guardian', phone: '555-0100', email: 'jane@example.com', street: '1 Main St', cityStateZip: 'Tampa, FL 33602' });
      const readBack = w.readRoleFields(filing, 'guardian', 0);

      w.writeRoleFields(filing, 'attorney', 0, { name: 'Rob Atty', barNumber: '998877', secondaryEmail: 'rob2@law.example' });
      w.writeRoleFields(filing, 'preparer', 0, { name: 'Pat Preparer', street: '3 Prep Rd', cityStateZip: 'Tampa, FL 33602' });

      return {
        joinedAddress: filing.planGuardians[0].mailingAddress,
        readBack,
        attorneySecondaryEmailField: filing.attorney_secondary_email,
        preparerNameField: filing.preparer_name,
        preparerStreetField: filing.preparer_mailingStreet,
      };
    });

    expect(result.joinedAddress).toBe('1 Main St, Tampa, FL 33602');
    expect(result.readBack).toEqual({ name: 'Jane Guardian', phone: '555-0100', email: 'jane@example.com', street: '1 Main St', cityStateZip: 'Tampa, FL 33602' });
    // planSimplified is the one type using the snake_case attorney_secondary_email key.
    expect(result.attorneySecondaryEmailField).toBe('rob2@law.example');
    expect(result.preparerNameField).toBe('Pat Preparer');
    expect(result.preparerStreetField).toBe('3 Prep Rd');
  });

  test('planAnnual: guardian row (with office address) and scalar-named attorney round-trip', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const filing: any = { inventoryType: 'planAnnual', wardName: 'Test Ward', planGuardians: [{}] };

      w.writeRoleFields(filing, 'guardian', 0, { name: 'Jane Guardian', taxId: '123-45-6789', phone: '555-0100', street: '1 Main St', cityStateZip: 'Tampa, FL 33602', officeStreet: '9 Office Pkwy', officeCityStateZip: 'Tampa, FL 33603' });
      w.writeRoleFields(filing, 'attorney', 0, { name: 'Rob Atty', barNumber: '998877', secondaryEmail: 'rob2@law.example' });

      return {
        guardianRow: filing.planGuardians[0],
        attorneyScalarName: filing.attorney,
        attorneyBar: filing.attorney_bar,
        attorneySecondaryEmailField: filing.attorney_secondary_email,
        preparerHasNoMapping: Object.keys(w.readRoleFields(filing, 'preparer', 0)).length === 0,
      };
    });

    expect(result.guardianRow).toEqual({ name: 'Jane Guardian', ssn: '123-45-6789', phone: '555-0100', mailingStreet: '1 Main St', mailingCityStateZip: 'Tampa, FL 33602', officeStreet: '9 Office Pkwy', officeCityStateZip: 'Tampa, FL 33603' });
    expect(result.attorneyScalarName).toBe('Rob Atty');
    expect(result.attorneyBar).toBe('998877');
    // planAnnual is the OTHER type (besides planSimplified/planMinor) using the snake_case key.
    expect(result.attorneySecondaryEmailField).toBe('rob2@law.example');
    expect(result.preparerHasNoMapping).toBe(true);
  });

  test('planMinor: guardian/preparer taxId round-trips through the tin field name', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const filing: any = { inventoryType: 'planMinor', wardName: 'Test Ward', planGuardians: [{}] };
      w.writeRoleFields(filing, 'guardian', 0, { name: 'Jane Guardian', taxId: '123-45-6789' });
      w.writeRoleFields(filing, 'preparer', 0, { name: 'Pat Preparer', taxId: '111-22-3333' });
      return { guardianTin: filing.planGuardians[0].tin, preparerTin: filing.preparer_tin };
    });

    expect(result.guardianTin).toBe('123-45-6789');
    expect(result.preparerTin).toBe('111-22-3333');
  });

  test('dehydrateIntoParty merges a filing role’s current fields onto the party’s canonical shape', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const party = w.createParty('attorney');
      const filing: any = { inventoryType: 'planInitial', wardName: 'Test Ward' };
      w.writeRoleFields(filing, 'attorney', 0, { name: 'Rob Atty', barNumber: '998877', phone: '555-0200', email: 'rob@law.example', street: '2 Law Ave', cityStateZip: 'Tampa, FL 33602' });

      w.dehydrateIntoParty(filing, 'attorney', 0, party);

      return {
        name: party.name,
        barNumber: party.identifiers.barNumber,
        phone: party.phone,
        email: party.email,
        street: party.address.street,
        cityStateZip: party.address.cityStateZip,
        updatedAtIsRecent: Date.now() - new Date(party.updatedAt).getTime() < 5000,
      };
    });

    expect(result.name).toBe('Rob Atty');
    expect(result.barNumber).toBe('998877');
    expect(result.phone).toBe('555-0200');
    expect(result.email).toBe('rob@law.example');
    expect(result.street).toBe('2 Law Ave');
    expect(result.cityStateZip).toBe('Tampa, FL 33602');
    expect(result.updatedAtIsRecent).toBe(true);
  });

  test('syncIdentityField propagates one edit across every other filing/slot sharing the same party', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const caseFile = w.caseFile;

      const attorneyParty = w.createParty('attorney');
      w.hydrateFromParty(attorneyParty, { }, 'attorney', 0); // no-op sanity call, party still blank

      // Two filings of different types, both referencing the same attorney party.
      const filingA: any = { inventoryType: 'guardian', wardName: 'Ward A', attorney: {}, attorneyPartyId: attorneyParty.id };
      const filingB: any = { inventoryType: 'simplified', wardName: 'Ward B', attorneyPartyId: attorneyParty.id };
      caseFile.wards.push(filingA, filingB);

      // Seed both filings with the SAME starting value via hydrate, as if a
      // party picker had already linked them (Milestone 4/5's job later).
      w.writeRoleFields(filingA, 'attorney', 0, { name: 'Rob Atty', phone: '555-0200' });
      w.syncIdentityField(filingA, 'attorney', 0); // pushes filingA's values onto the party and out to filingB

      const afterFirstSync = { filingBName: filingB.attorney, filingBPhone: filingB.attorney_phone };

      // Now edit the OTHER filing (B) and sync from there -- A should pick it up.
      w.writeRoleFields(filingB, 'attorney', 0, { name: 'Robert Atty Jr.', phone: '555-0299' });
      w.syncIdentityField(filingB, 'attorney', 0);

      return {
        afterFirstSync,
        filingAName: filingA.attorney.name,
        filingAPhone: filingA.attorney.phone,
        partyName: attorneyParty.name,
        partyPhone: attorneyParty.phone,
      };
    });

    expect(result.afterFirstSync).toEqual({ filingBName: 'Rob Atty', filingBPhone: '555-0200' });
    expect(result.filingAName).toBe('Robert Atty Jr.');
    expect(result.filingAPhone).toBe('555-0299');
    expect(result.partyName).toBe('Robert Atty Jr.');
    expect(result.partyPhone).toBe('555-0299');
  });

  test('syncIdentityField is a no-op when the slot has no party attached', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const filing: any = { inventoryType: 'guardian', wardName: 'Ward A', attorney: { name: 'Rob Atty' } };
      // No attorneyPartyId set -- should do nothing and not throw.
      w.syncIdentityField(filing, 'attorney', 0);
      return { stillRobAtty: filing.attorney.name };
    });

    expect(result.stillRobAtty).toBe('Rob Atty');
  });
});

// Party de-duplication (persistence-rewrite Milestone 7) -- findDuplicateCandidates(),
// dismissPartyPair()/isPartyPairDismissed(), mergeParties(), and
// referenceCountForParty(), all in src/core/party-resolver.js. Direct-logic
// tests against hand-built parties/wards/cases, mirroring this file's own
// style above; the real-UI proof lives in tests/e2e/party-dedupe.spec.ts.
// Milestone 43C: renamed from the identical 'party de-duplication
// (Milestone 7)' title party-dedupe.spec.ts also uses, so grep/reporter
// output disambiguates the two -- not a real duplicate, just a title
// collision (the two files test complementary things).
test.describe('party de-duplication via resolver (Milestone 7)', () => {
  test('findDuplicateCandidates matches on exact case-insensitive name, flags strongMatch on shared contact info, and excludes dismissed pairs', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const cf = w.caseFile;
      const nameOnly = w.createParty('guardian');
      nameOnly.name = 'Jane Doe';
      const nameOnlyDup = w.createParty('guardian');
      nameOnlyDup.name = 'jane doe'; // case-insensitive match
      const strong = w.createParty('attorney');
      strong.name = 'Robert Atty';
      strong.phone = '555-0100';
      const strongDup = w.createParty('attorney');
      strongDup.name = 'Robert Atty';
      strongDup.phone = '555-0100';
      const noMatch = w.createParty('preparer');
      noMatch.name = 'Someone Else';

      const before = w.findDuplicateCandidates();
      w.dismissPartyPair(nameOnly.id, nameOnlyDup.id);
      const after = w.findDuplicateCandidates();

      return {
        beforeCount: before.length,
        afterCount: after.length,
        strongPair: after.find((c: any) => [c.partyA.id, c.partyB.id].includes(strong.id)),
        cfPartyCount: cf.parties.length,
      };
    });

    expect(result.beforeCount).toBe(2); // nameOnly/nameOnlyDup, strong/strongDup
    expect(result.afterCount).toBe(1); // the dismissed pair no longer surfaces
    expect(result.strongPair.strongMatch).toBe(true);
    expect(result.cfPartyCount).toBe(5);
  });

  test('isPartyPairDismissed is order-independent', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      w.dismissPartyPair('id-a', 'id-b');
      return {
        forward: w.isPartyPairDismissed('id-a', 'id-b'),
        reverse: w.isPartyPairDismissed('id-b', 'id-a'),
        unrelated: w.isPartyPairDismissed('id-a', 'id-c'),
      };
    });

    expect(result.forward).toBe(true);
    expect(result.reverse).toBe(true);
    expect(result.unrelated).toBe(false);
  });

  test('mergeParties repoints every FK across multiple wards and a case, unions roles, and tombstones the discarded party', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const cf = w.caseFile;
      const keep = w.createParty('guardian');
      keep.name = 'Jane Doe';
      keep.phone = '555-0100';
      const discard = w.createParty('attorney'); // different role -- must union onto keep
      discard.name = 'Jane Doe';
      discard.email = 'jane@example.com'; // keep has none -- adoptable

      const wardA: any = { wardId: 'a', inventoryType: 'guardian', guardianPartyIds: [discard.id], attorney: {} };
      const wardB: any = { wardId: 'b', inventoryType: 'annual', guardianPartyIds: [null, discard.id], attorney_bar: '', attorney: '' };
      const kase = w.createCase({ caseNumber: '24-1', county: 'Pinellas' });
      kase.wardPartyId = discard.id;
      cf.wards.push(wardA, wardB);

      const refCountBefore = w.referenceCountForParty(discard.id);
      const merged = w.mergeParties(keep.id, discard.id, { adoptBlankFields: true });

      return {
        merged,
        keepId: keep.id,
        refCountBefore,
        refCountAfterDiscard: w.referenceCountForParty(discard.id),
        refCountAfterKeep: w.referenceCountForParty(keep.id),
        wardAPartyId: wardA.guardianPartyIds[0],
        wardBPartyId: wardB.guardianPartyIds[1],
        wardAGuardianName: wardA.guardians?.[0]?.name, // re-hydrated immediately, not "on next sync"
        caseWardPartyId: kase.wardPartyId,
        discardTombstone: discard.mergedInto,
        keepRoles: keep.roles.slice().sort(),
        keepEmail: keep.email,
        keepPhone: keep.phone, // must be untouched -- keep's own value never overwritten
      };
    });

    expect(result.merged).toBe(true);
    expect(result.refCountBefore).toBe(3); // wardA guardian slot + wardB guardian slot + the case
    expect(result.refCountAfterDiscard).toBe(0);
    expect(result.refCountAfterKeep).toBe(3);
    expect(result.wardAPartyId).toBe(result.keepId);
    expect(result.wardBPartyId).toBe(result.keepId);
    expect(result.caseWardPartyId).toBe(result.keepId);
    expect(result.discardTombstone).toBe(result.keepId);
    expect(result.keepRoles).toEqual(['attorney', 'guardian']);
    expect(result.keepEmail).toBe('jane@example.com');
    expect(result.keepPhone).toBe('555-0100');
    expect(result.wardAGuardianName).toBe('Jane Doe');
  });

  test('mergeParties never overwrites a field keep already has, and adoptBlankFields:false skips backfill entirely', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const keep = w.createParty('guardian');
      keep.name = 'Jane Doe';
      keep.phone = '555-0100';
      const discard = w.createParty('guardian');
      discard.name = 'Jane Doe';
      discard.phone = '555-9999'; // conflicting -- keep's own value wins, no prompt needed
      discard.notes = 'some note';

      w.mergeParties(keep.id, discard.id, { adoptBlankFields: false });

      return { phone: keep.phone, notes: keep.notes };
    });

    expect(result.phone).toBe('555-0100');
    expect(result.notes).toBeFalsy();
  });

  test('dismissedPartyPairs and a merged party\'s mergedInto tombstone survive a save/reload round-trip', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const w = window as any;
      const cf = w.caseFile;
      const keep = w.createParty('guardian');
      keep.name = 'Jane Doe';
      const discard = w.createParty('guardian');
      discard.name = 'John Smith'; // dismissed as "not the same person" below, not merged
      const mergedAway = w.createParty('guardian');
      mergedAway.name = 'Jane Doe';
      w.mergeParties(keep.id, mergedAway.id, { adoptBlankFields: false });
      w.dismissPartyPair(keep.id, discard.id);

      const { blob } = await w.buildCaseFileBlob();
      const zip = await w.JSZip.loadAsync(blob);
      const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
      await w.loadCaseFileFromZip(zip, manifest, null); // 'none' security mode -- no password needed

      return {
        partyCount: cf.parties.length,
        mergedAwayTombstone: cf.parties.find((p: any) => p.id === mergedAway.id)?.mergedInto,
        mergedAwayRecordAt: cf.parties.find((p: any) => p.id === mergedAway.id)?.mergeRecord?.mergedAt,
        stillDismissed: w.isPartyPairDismissed(keep.id, discard.id),
      };
    });

    expect(result.partyCount).toBe(3);
    expect(result.mergedAwayTombstone).toBeTruthy();
    expect(result.mergedAwayRecordAt).toBeTruthy(); // the undo record rides along with the tombstone
    expect(result.stillDismissed).toBe(true);
  });

  test('single-ward .sav export has no parties.enc, and on load reconstructs the ward-Party with county under the unanimity rule', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const w = window as any;
      const cf = w.caseFile;

      // 1. Create a ward with an explicit county
      const wardId = 'ward-unanimity-1';
      const ward = {
        wardId,
        wardName: 'Reconstructed Ward',
        inventoryType: 'annual',
        county: 'Orange',
      };
      cf.wards = [ward];
      const initialParty = w.ensureWardPartyForFiling(ward);
      initialParty.county = 'Orange';

      // 2. Build single-ward export blob (which deliberately has no parties.enc)
      const blob = await w.buildSingleWardExportBlob(wardId);
      const zip = await w.JSZip.loadAsync(blob);
      const partiesEntry = zip.file('parties.enc');
      const manifest = JSON.parse(await zip.file('manifest.json').async('string'));

      // 3. Clear existing state to simulate opening in a fresh/other session
      cf.wards = [];
      cf.parties = [];

      // 4. Load from zip -- triggers loadCaseFileFromZip and backfillWardPartyCounties()
      await w.loadCaseFileFromZip(zip, manifest, null);

      const reconstructedParty = w.wardPartyForFiling(cf.wards[0]);
      // Milestone 51B: this used to call ward-county.js's
      // linkDestinationToSourceWardParty(), which had no production caller and
      // has been deleted. carryOverFields() is the real carry-over entry point
      // and enforces the same Milestone 40C-A rule, so the assertion now runs
      // against the path the app actually takes.
      const nextFiling = w.carryOverFields(cf.wards[0], 'planInitial');

      return {
        hadPartiesInZip: partiesEntry !== null,
        partyCount: cf.parties.length,
        reconstructedName: reconstructedParty?.name,
        reconstructedCounty: reconstructedParty?.county,
        reconstructedRole: reconstructedParty?.roles,
        nextFilingCounty: nextFiling.county,
        nextFilingPartyId: (nextFiling as any).wardPartyId,
        reconstructedPartyId: reconstructedParty?.id,
      };
    });

    expect(result.hadPartiesInZip).toBe(false);
    expect(result.partyCount).toBe(1);
    expect(result.reconstructedName).toBe('Reconstructed Ward');
    expect(result.reconstructedCounty).toBe('Orange');
    expect(result.reconstructedRole).toContain('ward');
    expect(result.nextFilingCounty).toBe('Orange');
    expect(result.nextFilingPartyId).toBe(result.reconstructedPartyId);
  });

  test('single-ward .sav export with no county gets no reconstructed Party -- backfill never manufactures identity the export never carried', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(async () => {
      const w = window as any;
      const cf = w.caseFile;

      // A ward with no county at all -- the ordinary shape of a legacy
      // archive that never went through the Cover county combobox.
      const wardId = 'ward-no-county-1';
      const ward = {
        wardId,
        wardName: 'No County Ward',
        inventoryType: 'annual',
        county: '',
      };
      cf.wards = [ward];

      // No Party is created for it at all -- this ward genuinely has none.
      const blob = await w.buildSingleWardExportBlob(wardId);
      const zip = await w.JSZip.loadAsync(blob);
      const manifest = JSON.parse(await zip.file('manifest.json').async('string'));

      cf.wards = [];
      cf.parties = [];

      await w.loadCaseFileFromZip(zip, manifest, null);

      return {
        partyCount: cf.parties.length,
        reconstructedParty: w.wardPartyForFiling(cf.wards[0]),
      };
    });

    expect(result.partyCount).toBe(0);
    expect(result.reconstructedParty).toBeFalsy();
  });

  test('legacy backfill in .sav import: unanimous linked counties persist, conflicting linked counties leave county blank', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const cf = w.caseFile;

      // Unanimous ward party: two filings both with 'Orange'
      const partyA = w.createParty('ward');
      partyA.name = 'Unanimous Ward';
      partyA.county = ''; // legacy archive with no party county
      const wardA1 = { wardId: 'w-a1', wardPartyId: partyA.id, county: 'Orange' };
      const wardA2 = { wardId: 'w-a2', wardPartyId: partyA.id, county: 'orange' };

      // Conflicted ward party: filings with 'Orange' and 'Pasco'
      const partyB = w.createParty('ward');
      partyB.name = 'Conflicted Ward';
      partyB.county = '';
      const wardB1 = { wardId: 'w-b1', wardPartyId: partyB.id, county: 'Orange' };
      const wardB2 = { wardId: 'w-b2', wardPartyId: partyB.id, county: 'Pasco' };

      cf.wards = [wardA1, wardA2, wardB1, wardB2];

      const conflictCheck = w.wardCountyMergeConflict(partyA.id, partyB.id);
      // Before backfill, party counties are blank so wardCountyMergeConflict is null
      const conflictBefore = conflictCheck;

      const summary = w.backfillWardPartyCounties();

      // After backfill, partyA has 'Orange' and partyB remains blank
      const conflictAfter = w.wardCountyMergeConflict(partyA.id, partyB.id);

      return {
        summary,
        partyACounty: partyA.county,
        partyBCounty: partyB.county,
        conflictBefore,
        conflictAfter,
      };
    });

    expect(result.summary.inferred).toBe(1);
    expect(result.summary.conflicted).toBe(1);
    expect(result.partyACounty).toBe('Orange');
    expect(result.partyBCounty).toBeFalsy();
    expect(result.conflictBefore).toBeNull();
    expect(result.conflictAfter).toBeNull(); // partyB has blank county so no conflict with partyA
  });
});

// Merge undo tracking and near-name detection: mergeParties() writes a
// mergeRecord on the sub, unmergeParty() reverses exactly what that record
// says (one level deep only), and findDuplicateCandidates() adds a
// lower-confidence 'near' tier beneath the exact-name pairs.
test.describe('party merge undo & near-match detection', () => {
  test('findDuplicateCandidates lists exact-name pairs first, then near-name pairs, and leaves genuinely different names alone', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const make = (name: string) => { const p = w.createParty('guardian'); p.name = name; return p; };
      const a = make('Jane Doe');
      const b = make('jane doe '); // exact under the existing trim/lowercase rule
      const c = make('Jane A. Doe'); // middle initial
      const d = make('Doe, Jane'); // Last, First
      const e = make('Janet Doerr'); // three edits away -- a different person
      const f = make('John Doe Sr.'); // suffix is never stripped: father vs son stays two people
      const g = make('John Doe');
      const h = make('Jhon Doe'); // one transposition
      const ids: Record<string, string> = { a: a.id, b: b.id, c: c.id, d: d.id, e: e.id, f: f.id, g: g.id, h: h.id };
      const label = (id: string) => Object.keys(ids).find(k => ids[k] === id);
      const candidates = w.findDuplicateCandidates();
      return {
        kinds: candidates.map((x: any) => `${[label(x.partyA.id), label(x.partyB.id)].sort().join('')}:${x.matchKind}`) as string[],
        firstKind: candidates[0]?.matchKind,
        lastKind: candidates[candidates.length - 1]?.matchKind,
      };
    });

    expect(result.kinds).toContain('ab:exact');
    for (const near of ['ac:near', 'ad:near', 'bc:near', 'bd:near', 'cd:near', 'gh:near']) expect(result.kinds).toContain(near);
    expect(result.kinds.filter((k) => /e|f/.test(k.split(':')[0]))).toEqual([]);
    expect(result.kinds.filter((k) => k.endsWith(':exact'))).toEqual(['ab:exact']);
    expect(result.firstKind).toBe('exact');
    expect(result.lastKind).toBe('near');
  });

  test('mergeParties records what it changed, and unmergeParty puts it back: FKs return to the sub and re-hydrate, adopted fields clear, adopted roles drop', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const cf = w.caseFile;
      const primary = w.createParty('guardian');
      primary.name = 'Jane Doe';
      primary.phone = '555-0100';
      const sub = w.createParty('attorney');
      sub.name = 'Jane Doe';
      sub.phone = '555-0200';
      sub.email = 'jane@example.com'; // primary has none -- adopted
      const wardA: any = { wardId: 'a', inventoryType: 'guardian', guardianPartyIds: [sub.id], attorney: {} };
      const kase = w.createCase({ caseNumber: '24-1', county: 'Pinellas' });
      kase.wardPartyId = sub.id;
      cf.wards.push(wardA);

      w.mergeParties(primary.id, sub.id, { adoptBlankFields: true });
      const afterMerge = {
        listedUnderPrimary: w.subPartiesOf(primary.id).map((p: any) => p.id),
        record: JSON.parse(JSON.stringify(sub.mergeRecord)),
        wardAPhone: wardA.guardians?.[0]?.phone,
        primaryEmail: primary.email,
        primaryRoles: primary.roles.slice().sort(),
      };

      const unmerged = w.unmergeParty(sub.id);
      return {
        afterMerge,
        unmerged,
        subId: sub.id,
        caseId: kase.id,
        wardAPartyId: wardA.guardianPartyIds[0],
        wardAPhone: wardA.guardians?.[0]?.phone,
        caseWardPartyId: kase.wardPartyId,
        primaryEmail: primary.email,
        primaryPhone: primary.phone,
        primaryRoles: primary.roles.slice().sort(),
        subMergedInto: sub.mergedInto,
        subRecord: sub.mergeRecord,
        subEmail: sub.email,
        listedUnderPrimary: w.subPartiesOf(primary.id),
        candidatesAgain: w.findDuplicateCandidates().length,
      };
    });

    expect(result.afterMerge.listedUnderPrimary).toEqual([result.subId]);
    expect(result.afterMerge.record.adoptedFields).toEqual(['email']);
    expect(result.afterMerge.record.adoptedRoles).toEqual(['attorney']);
    expect(result.afterMerge.record.repointedSlots).toEqual([{ wardId: 'a', role: 'guardian', index: 0 }]);
    expect(result.afterMerge.record.repointedCases).toEqual([result.caseId]);
    expect(result.afterMerge.record.mergedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.afterMerge.wardAPhone).toBe('555-0100');
    expect(result.afterMerge.primaryEmail).toBe('jane@example.com');
    expect(result.afterMerge.primaryRoles).toEqual(['attorney', 'guardian']);

    expect(result.unmerged).toBe(true);
    expect(result.wardAPartyId).toBe(result.subId);
    expect(result.wardAPhone).toBe('555-0200'); // re-hydrated from the sub, not left holding the primary's value
    expect(result.caseWardPartyId).toBe(result.subId);
    expect(result.primaryEmail).toBeNull();
    expect(result.primaryPhone).toBe('555-0100');
    expect(result.primaryRoles).toEqual(['guardian']);
    expect(result.subMergedInto).toBeNull();
    expect(result.subRecord).toBeNull();
    expect(result.subEmail).toBe('jane@example.com'); // the sub's own data was never touched
    expect(result.listedUnderPrimary).toEqual([]);
    expect(result.candidatesAgain).toBe(1); // both top-level and same-named again, so the pair resurfaces
  });

  test('unmergeParty keeps a primary field edited since the merge, and leaves a slot that was re-linked elsewhere since the merge', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const cf = w.caseFile;
      const primary = w.createParty('guardian');
      primary.name = 'Jane Doe';
      const sub = w.createParty('guardian');
      sub.name = 'Jane Doe';
      sub.email = 'jane@example.com';
      sub.notes = 'from sub';
      const third = w.createParty('guardian');
      third.name = 'Someone Else';
      const wardA: any = { wardId: 'a', inventoryType: 'guardian', guardianPartyIds: [sub.id] };
      cf.wards.push(wardA);

      w.mergeParties(primary.id, sub.id, { adoptBlankFields: true });
      primary.email = 'edited@example.com'; // changed after the merge -- must survive
      w.setPartyIdForSlot(wardA, 'guardian', 0, third.id); // re-linked after the merge -- must not be yanked back

      const unmerged = w.unmergeParty(sub.id);
      return { unmerged, primaryEmail: primary.email, primaryNotes: primary.notes, wardAPartyId: wardA.guardianPartyIds[0], thirdId: third.id };
    });

    expect(result.unmerged).toBe(true);
    expect(result.primaryEmail).toBe('edited@example.com');
    expect(result.primaryNotes).toBeNull(); // still held the sub's value, so it was cleared
    expect(result.wardAPartyId).toBe(result.thirdId);
  });

  test('one level only: a sub of a sub stays hidden under the new primary and cannot be unmerged until the middle record is; a pre-tracking tombstone is never listed', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const make = (name: string) => { const p = w.createParty('guardian'); p.name = name; return p; };
      const a = make('Jane Doe'), b = make('Jane Doe'), c = make('Jane Doe');
      const legacy = make('Jane Doe');
      w.mergeParties(b.id, a.id, { adoptBlankFields: false }); // a -> b
      w.mergeParties(c.id, b.id, { adoptBlankFields: false }); // b -> c, carrying a beneath it
      legacy.mergedInto = c.id; // merged before undo tracking existed: no mergeRecord

      const underCBefore = w.subPartiesOf(c.id).map((p: any) => p.id);
      const aWhileNested = w.unmergeParty(a.id);
      const resolvedA = w.resolveParty(a.id)?.id;

      const bUnmerged = w.unmergeParty(b.id);
      const underCAfter = w.subPartiesOf(c.id).map((p: any) => p.id);
      const underBAfter = w.subPartiesOf(b.id).map((p: any) => p.id);
      const aNow = w.unmergeParty(a.id);
      const legacyUnmerge = w.unmergeParty(legacy.id);

      return { ids: { a: a.id, b: b.id, c: c.id }, underCBefore, aWhileNested, resolvedA, bUnmerged, underCAfter, underBAfter, aNow, aMergedInto: a.mergedInto, legacyUnmerge, legacyMergedInto: legacy.mergedInto };
    });

    expect(result.underCBefore).toEqual([result.ids.b]); // not a (two levels down), not legacy (no record)
    expect(result.aWhileNested).toBe(false);
    expect(result.resolvedA).toBe(result.ids.c); // the chain still resolves all the way up meanwhile
    expect(result.bUnmerged).toBe(true);
    expect(result.underCAfter).toEqual([]);
    expect(result.underBAfter).toEqual([result.ids.a]); // b's own sub comes back with it
    expect(result.aNow).toBe(true);
    expect(result.aMergedInto).toBeNull();
    expect(result.legacyUnmerge).toBe(false);
    expect(result.legacyMergedInto).toBe(result.ids.c);
  });
});

// Milestone 49B: the ward is a full identity role (name, SSN, residence,
// phone, mailing address -- whichever the filing type collects), and a filing
// marked Closed on the dashboard is cut off from its party records in both
// directions until the user syncs it by hand.
test.describe('ward identity role & closed-filing cut-off (Milestone 49B)', () => {
  test('ward fields round-trip per type: Annual Plan (SSN, residence, mailing), Minor Plan (split city/state/zip), Simplified (SSN), Guardian Inventory (name only)', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const party = w.createParty('ward');
      Object.assign(party, { name: 'Eleanor Whitfield', phone: '(727) 555-0101', identifiers: { taxId: '111-22-3333', barNumber: null },
        address: { street: '410 Bayshore Dr', cityStateZip: 'Clearwater, FL 33756' }, mailingAddress: { street: 'PO Box 9', cityStateZip: 'Largo, FL 33770' } });
      const planAnnual: any = { inventoryType: 'planAnnual' };
      const planMinor: any = { inventoryType: 'planMinor' };
      const simplified: any = { inventoryType: 'simplified' };
      const inventory: any = { inventoryType: 'guardian' };
      for (const f of [planAnnual, planMinor, simplified, inventory]) w.hydrateFromParty(party, f, 'ward', 0);

      // Dehydrate the other way from a Minor Plan with a hand-typed split address.
      const minorEdited: any = { inventoryType: 'planMinor', wardName: 'Eleanor Whitfield', q1Street: '12 Oak St', q1City: 'St. Petersburg', q1State: 'FL', q1Zip: '33701', q1Phone: '(727) 555-0202' };
      const party2 = w.createParty('ward');
      w.dehydrateIntoParty(minorEdited, 'ward', 0, party2);

      return {
        planAnnual: { wardName: planAnnual.wardName, ssn: planAnnual.ssn, residenceAddress: planAnnual.residenceAddress, residenceCityStateZip: planAnnual.residenceCityStateZip, residencePhone: planAnnual.residencePhone, mailingAddress: planAnnual.mailingAddress, mailingCityStateZip: planAnnual.mailingCityStateZip },
        planMinor: { wardName: planMinor.wardName, q1Street: planMinor.q1Street, q1City: planMinor.q1City, q1State: planMinor.q1State, q1Zip: planMinor.q1Zip, q1Phone: planMinor.q1Phone, ssn: planMinor.ssn },
        simplified: { wardName: simplified.wardName, ssn: simplified.ssn, residenceAddress: simplified.residenceAddress },
        inventory: { wardName: inventory.wardName, ssn: inventory.ssn, keys: Object.keys(inventory).sort() },
        readInventory: w.readRoleFields(inventory, 'ward', 0),
        party2: { address: party2.address, phone: party2.phone, taxId: party2.identifiers.taxId },
        slots: {
          annualSsn: w.identitySlotForPath(planAnnual, 'ssn'),
          minorCity: w.identitySlotForPath(planMinor, 'q1City'),
          initialMailing: w.identitySlotForPath({ inventoryType: 'planInitial' }, 'mailingCityStateZip'),
          simplifiedGuardianSsn: w.identitySlotForPath(simplified, 'guardians.0.ssn'),
          inventorySsn: w.identitySlotForPath(inventory, 'ssn'),
        },
      };
    });

    expect(result.planAnnual).toEqual({ wardName: 'Eleanor Whitfield', ssn: '111-22-3333', residenceAddress: '410 Bayshore Dr', residenceCityStateZip: 'Clearwater, FL 33756', residencePhone: '(727) 555-0101', mailingAddress: 'PO Box 9', mailingCityStateZip: 'Largo, FL 33770' });
    expect(result.planMinor).toEqual({ wardName: 'Eleanor Whitfield', q1Street: '410 Bayshore Dr', q1City: 'Clearwater', q1State: 'FL', q1Zip: '33756', q1Phone: '(727) 555-0101', ssn: undefined });
    expect(result.simplified).toEqual({ wardName: 'Eleanor Whitfield', ssn: '111-22-3333', residenceAddress: undefined });
    expect(result.inventory.keys).toEqual(['inventoryType', 'wardName']); // nothing invented on a type with no slot for it
    expect(result.readInventory).toEqual({ name: 'Eleanor Whitfield' });
    expect(result.party2).toEqual({ address: { street: '12 Oak St', cityStateZip: 'St. Petersburg, FL 33701' }, phone: '(727) 555-0202', taxId: null });
    expect(result.slots.annualSsn).toEqual({ role: 'ward', index: 0, fieldKeys: ['taxId'] });
    // Milestone 58A: city/state/zip are three filing fields behind one
    // canonical key, so editing any of them resolves to cityStateZip alone.
    expect(result.slots.minorCity).toEqual({ role: 'ward', index: 0, fieldKeys: ['cityStateZip'] });
    expect(result.slots.initialMailing).toEqual({ role: 'ward', index: 0, fieldKeys: ['mailingCityStateZip'] });
    expect(result.slots.simplifiedGuardianSsn).toEqual({ role: 'guardian', index: 0, fieldKeys: ['taxId'] }); // the nested guardian SSN is still the guardian's
    expect(result.slots.inventorySsn).toBeNull(); // Guardian Inventory has no ward SSN field
  });

  test('a closed filing neither receives party edits nor sends its own out; drift is reported and cleared by an explicit sync; reopening does not catch up by itself', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const cf = w.caseFile;
      const party = w.createParty('guardian');
      Object.assign(party, { name: 'Jane Doe', phone: '555-0100' });
      const open: any = { wardId: 'open', inventoryType: 'annual', guardianPartyIds: [party.id] };
      const closed: any = { wardId: 'closed', wardName: 'Ward C', inventoryType: 'planInitial', guardianPartyIds: [party.id], archived: true };
      cf.wards.push(open, closed);
      w.hydrateFromParty(party, open, 'guardian', 0);
      w.hydrateFromParty(party, closed, 'guardian', 0);

      // Edit on the open filing: party and open siblings follow, the closed one does not.
      open.guardians[0].phone = '555-0200';
      w.syncIdentityField(open, 'guardian', 0);
      const afterOpenEdit = { party: party.phone, closed: closed.planGuardians[0].phone };

      // Edit inside the closed filing: nothing leaves it.
      closed.planGuardians[0].name = 'Jane Q. Doe';
      w.syncIdentityField(closed, 'guardian', 0);
      const afterClosedEdit = { party: party.name, open: open.guardians[0].name };

      const drift = w.closedFilingDrift(party.id).map((d: any) => ({ wardId: d.filing.wardId, role: d.role, keys: d.differences.map((x: any) => x.key).sort() }));
      const filingDrift = w.filingDriftFromParties(closed).map((d: any) => ({ role: d.role, partyName: d.party.name }));
      const openDrift = w.filingDriftFromParties(open);

      // Reopen: still stale until synced.
      closed.archived = false;
      const afterReopen = { phone: closed.planGuardians[0].phone, drift: w.closedFilingDrift(party.id).length };
      closed.archived = true;

      const synced = w.syncFilingSlotWithParty(closed, 'guardian', 0);
      const afterSync = { phone: closed.planGuardians[0].phone, name: closed.planGuardians[0].name, drift: w.closedFilingDrift(party.id).length };
      const unlinkedSync = w.syncFilingSlotWithParty(closed, 'attorney', 0);

      return { afterOpenEdit, afterClosedEdit, drift, filingDrift, openDrift, afterReopen, synced, afterSync, unlinkedSync };
    });

    expect(result.afterOpenEdit).toEqual({ party: '555-0200', closed: '555-0100' });
    expect(result.afterClosedEdit).toEqual({ party: 'Jane Doe', open: 'Jane Doe' });
    expect(result.drift).toEqual([{ wardId: 'closed', role: 'guardian', keys: ['name', 'phone'] }]);
    expect(result.filingDrift).toEqual([{ role: 'guardian', partyName: 'Jane Doe' }]);
    expect(result.openDrift).toEqual([]);
    expect(result.afterReopen).toEqual({ phone: '555-0100', drift: 0 }); // no longer "closed drift", but not rewritten either
    expect(result.synced).toBe(true);
    expect(result.afterSync).toEqual({ phone: '555-0200', name: 'Jane Doe', drift: 0 });
    expect(result.unlinkedSync).toBe(false);
  });

  test('legacy backfill fills the ward Party from its filings and open filings from the Party, never overwriting a value or touching a closed filing', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const cf = w.caseFile;
      const party = w.createParty('ward'); party.name = 'Eleanor Whitfield'; // pre-49B: name and county only
      const annualPlan: any = { wardId: 'ap', inventoryType: 'planAnnual', wardPartyId: party.id, wardName: 'Eleanor Whitfield', ssn: '111-22-3333', residenceAddress: '410 Bayshore Dr', residenceCityStateZip: 'Clearwater, FL 33756', residencePhone: '', mailingAddress: '', mailingCityStateZip: '' };
      const initialPlan: any = { wardId: 'ip', inventoryType: 'planInitial', wardPartyId: party.id, wardName: 'Eleanor Whitfield', residenceAddress: '', residenceCityStateZip: '', residencePhone: '(727) 555-0101', mailingAddress: 'PO Box 9', mailingCityStateZip: 'Largo, FL 33770' };
      const closedPlan: any = { wardId: 'cp', inventoryType: 'planAnnual', wardPartyId: party.id, wardName: 'Eleanor Whitfield', ssn: '', residenceAddress: '99 Old Rd', residenceCityStateZip: 'Tampa, FL 33602', residencePhone: '', archived: true };
      const inventory: any = { wardId: 'gi', inventoryType: 'guardian', wardPartyId: party.id, wardName: 'Eleanor Whitfield' };
      cf.wards.push(annualPlan, initialPlan, closedPlan, inventory);

      const touched = w.backfillWardPartyIdentity();
      return {
        touched,
        party: { taxId: party.identifiers.taxId, address: party.address, phone: party.phone, mailing: party.mailingAddress },
        initialPlan: { residenceAddress: initialPlan.residenceAddress, residenceCityStateZip: initialPlan.residenceCityStateZip, residencePhone: initialPlan.residencePhone, ssn: initialPlan.ssn },
        annualPlan: { residencePhone: annualPlan.residencePhone, mailingAddress: annualPlan.mailingAddress, residenceAddress: annualPlan.residenceAddress },
        closedPlan: { residenceAddress: closedPlan.residenceAddress, ssn: closedPlan.ssn, residencePhone: closedPlan.residencePhone },
        inventoryKeys: Object.keys(inventory).sort(),
      };
    });

    expect(result.party).toEqual({ taxId: '111-22-3333', address: { street: '410 Bayshore Dr', cityStateZip: 'Clearwater, FL 33756' }, phone: '(727) 555-0101', mailing: { street: 'PO Box 9', cityStateZip: 'Largo, FL 33770' } });
    expect(result.initialPlan).toEqual({ residenceAddress: '410 Bayshore Dr', residenceCityStateZip: 'Clearwater, FL 33756', residencePhone: '(727) 555-0101', ssn: undefined }); // no SSN slot on this type
    expect(result.annualPlan).toEqual({ residencePhone: '(727) 555-0101', mailingAddress: 'PO Box 9', residenceAddress: '410 Bayshore Dr' });
    expect(result.closedPlan).toEqual({ residenceAddress: '99 Old Rd', ssn: '', residencePhone: '' }); // an open filing's value beat it for the Party; it was not rewritten
    expect(result.inventoryKeys).toEqual(['inventoryType', 'wardId', 'wardName', 'wardPartyId']);
    expect(result.touched).toBeGreaterThan(0);
  });

  test('merge and unmerge move a closed filing\'s link but leave its copy alone, so it shows as drift', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;
      const cf = w.caseFile;
      const primary = w.createParty('guardian'); Object.assign(primary, { name: 'Jane Doe', phone: '555-0100' });
      const sub = w.createParty('guardian'); Object.assign(sub, { name: 'Jane Doe', phone: '555-0200' });
      const closed: any = { wardId: 'closed', wardName: 'Ward C', inventoryType: 'annual', guardianPartyIds: [sub.id], archived: true };
      cf.wards.push(closed);
      w.hydrateFromParty(sub, closed, 'guardian', 0);

      w.mergeParties(primary.id, sub.id, { adoptBlankFields: false });
      const afterMerge = { link: closed.guardianPartyIds[0], phone: closed.guardians[0].phone, drift: w.closedFilingDrift(primary.id).map((d: any) => d.differences.map((x: any) => x.key)) };
      w.unmergeParty(sub.id);
      const afterUnmerge = { link: closed.guardianPartyIds[0], phone: closed.guardians[0].phone, drift: w.closedFilingDrift(sub.id).length };
      return { primaryId: primary.id, subId: sub.id, afterMerge, afterUnmerge };
    });

    expect(result.afterMerge).toEqual({ link: result.primaryId, phone: '555-0200', drift: [['phone']] });
    expect(result.afterUnmerge).toEqual({ link: result.subId, phone: '555-0200', drift: 0 });
  });

  // Milestone 58A. Editing one field of a linked identity block must promote
  // only that field into the shared Party.
  //
  // What a filer hit: reopen a filing that was Closed while the attorney's
  // record moved on elsewhere -- new firm address, new phone -- and its own
  // attorney block is now stale. Correct one thing, the email, and the whole
  // stale block was copied into the canonical Party and pushed out to every
  // other open filing linked to that attorney. One correction silently
  // reverted the attorney's address and phone across the case.
  test('editing one identity field promotes only that field, and corrects the stale block it came from', async ({ page }) => {
    await freshStartNoPassword(page);

    const result = await page.evaluate(() => {
      const w = window as any;

      // The canonical record: current, and correct.
      const party = w.createParty('attorney');
      party.name = 'Robert Vance';
      party.email = 'old@firm.example';
      party.phone = '727-555-0100';
      party.identifiers = { barNumber: '111111' };
      party.address = { street: '100 Canonical St', cityStateZip: 'St. Petersburg, FL 33701' };

      // A filing whose attorney block drifted while it was closed.
      const stale = {
        inventoryType: 'planInitial', wardName: 'Stale Ward', attorneyPartyId: party.id,
        attorney_name: 'Robert Vance', attorney_email: 'old@firm.example',
        attorney_phone: '000-000-0000', attorney_bar: '999999',
        attorney_street: '1 Old Office Rd', attorney_cityStateZip: 'Tampa, FL 33601',
      };
      // A second open filing sitting on the same party, currently correct.
      const other = {
        inventoryType: 'planInitial', wardName: 'Other Ward', attorneyPartyId: party.id,
        attorney_name: 'Robert Vance', attorney_email: 'old@firm.example',
        attorney_phone: '727-555-0100', attorney_bar: '111111',
        attorney_street: '100 Canonical St', attorney_cityStateZip: 'St. Petersburg, FL 33701',
      };
      w.caseFile.wards.push(stale, other);

      // The filer corrects exactly one field on the stale filing.
      stale.attorney_email = 'new@firm.example';
      w.syncIdentityField(stale, 'attorney', 0, 'email');

      return {
        party: {
          email: party.email, name: party.name, phone: party.phone,
          bar: party.identifiers.barNumber, street: party.address.street,
        },
        stale: { email: stale.attorney_email, phone: stale.attorney_phone, bar: stale.attorney_bar, street: stale.attorney_street },
        other: { email: other.attorney_email, phone: other.attorney_phone, street: other.attorney_street },
      };
    });

    // The edit itself reaches the canonical record.
    expect(result.party.email, 'the edited field must reach the party').toBe('new@firm.example');

    // ...and nothing else does. These are the assertions that fail today.
    expect(result.party.phone, 'a stale neighbour must not be promoted').toBe('727-555-0100');
    expect(result.party.bar, 'a stale neighbour must not be promoted').toBe('111111');
    expect(result.party.street, 'a stale neighbour must not be promoted').toBe('100 Canonical St');

    // The block the edit came from is corrected from canonical rather than
    // left mixed -- otherwise the filer keeps looking at the stale values.
    expect(result.stale.phone, 'the edited slot must be refreshed from the party').toBe('727-555-0100');
    expect(result.stale.bar).toBe('111111');
    expect(result.stale.street).toBe('100 Canonical St');
    expect(result.stale.email).toBe('new@firm.example');

    // The other open filing sees the edit and keeps its correct values.
    expect(result.other.email).toBe('new@firm.example');
    expect(result.other.phone).toBe('727-555-0100');
    expect(result.other.street).toBe('100 Canonical St');
  });
});
