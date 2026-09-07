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
