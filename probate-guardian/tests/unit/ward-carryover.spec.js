import { describe, it, expect } from 'vitest';
import {
  carrySourcesFor,
  carryOverFieldsForPlan,
  carryOverFieldsForAccounting,
  CARRY_SOURCE_TYPE,
} from '../../src/core/navigation/ward-lifecycle.js';

describe('ward-carryover', () => {
  describe('carrySourcesFor', () => {
    it('offers multiple source types for planMinor instead of only guardian', () => {
      const sources = carrySourcesFor('planMinor');
      expect(sources).toContain('guardian');
      expect(sources).toContain('annual');
      expect(sources).toContain('simplified');
      expect(sources).toContain('planInitial');
      expect(sources.length).toBeGreaterThan(1);
    });

    it('offers multiple source types for planInitial, planAnnual, and planSimplified', () => {
      expect(carrySourcesFor('planInitial').length).toBeGreaterThan(1);
      expect(carrySourcesFor('planAnnual').length).toBeGreaterThan(1);
      expect(carrySourcesFor('planSimplified').length).toBeGreaterThan(1);
    });
  });

  describe('carryOverFieldsForPlan', () => {
    it('populates caseNumber and attorney fields on planInitial from an inventory source', () => {
      const src = {
        wardName: 'Jane Doe',
        caseNumber: '2024-GA-001',
        county: 'Hillsborough',
        gid: '2024-01-15',
        guardianName: 'John Guardian',
        attorneyForGuardian: 'Alice Attorney',
        attorneyBar: '1234567',
        attorneyPhone: '555-111-2222',
        attorneyEmail: 'alice@law.test',
        attorneyAddress: '100 Main St',
        attorneyCityStateZip: 'Tampa, FL 33602',
        guardians: [
          {
            name: 'John Guardian',
            ssnEin: '12-3456789',
            streetAddress: '200 Oak Ave',
            phone: '555-333-4444',
            cityStateZip: 'Tampa, FL 33601',
            relationship: 'Brother',
          },
        ],
      };

      const result = carryOverFieldsForPlan(src, 'planInitial');
      expect(result.wardName).toBe('Jane Doe');
      expect(result.caseNumber).toBe('2024-GA-001');
      // Milestone 40C-A item 3: county is NOT taken from the source filing's own
      // snapshot, even when the source has one. The builder leaves it blank and
      // legacy-app.js's carryOverFields() fills it from the canonical ward
      // Party -- a source filing may name a county the ward has since left.
      expect(result.county).toBe('');
      expect(result.inceptionDate).toBe('2024-01-15');
      expect(result.guardianNames).toBe('John Guardian');
      expect(result.attorneyName).toBe('Alice Attorney');
      expect(result.attorney_name).toBe('Alice Attorney');
      expect(result.attorney_bar).toBe('1234567');
      expect(result.attorney_phone).toBe('555-111-2222');
      expect(result.attorney_email).toBe('alice@law.test');
      expect(result.attorney_street).toBe('100 Main St');
      expect(result.attorney_cityStateZip).toBe('Tampa, FL 33602');
      expect(result.planGuardians[0].name).toBe('John Guardian');
      expect(result.planGuardians[0].ssn).toBe('12-3456789');
    });

    it('populates ucn, guardianName, and attorney_name on planMinor from an accounting source', () => {
      const src = {
        wardName: 'Minor Doe',
        caseNumber: '2023-GD-999',
        county: 'Pinellas',
        guardian: 'Mary Guardian',
        attorney: 'Bob Attorney',
        attorneyBar: '7654321',
        attorneyPhone: '555-999-8888',
        guardians: [
          {
            name: 'Mary Guardian',
            ssn: '987-65-4321',
            mailingStreet: '300 Pine St',
            mailingCityStateZip: 'Clearwater, FL 33756',
            phone: '555-555-1212',
          },
        ],
      };

      const result = carryOverFieldsForPlan(src, 'planMinor');
      expect(result.wardName).toBe('Minor Doe');
      expect(result.ucn).toBe('2023-GD-999');
      expect(result.guardianName).toBe('Mary Guardian');
      expect(result.attorney_name).toBe('Bob Attorney');
      expect(result.attorney_bar).toBe('7654321');
      expect(result.attorney_phone).toBe('555-999-8888');
      expect(result.planGuardians[0].name).toBe('Mary Guardian');
      expect(result.planGuardians[0].tin).toBe('987-65-4321');
    });
  });

  // Milestone 40C-F item 2. A Guardian Inventory keeps attorney details NESTED
  // at src.attorney.{name,barNumber,phone,streetAddress,cityStateZip} (see
  // emptyDataGuardian()); every other source type stores them flat. Both
  // carryover builders read flat keys only, so all five silently carried over
  // blank from the most common source type there is. The existing fixtures above
  // use the FLAT shape, which is why this went unnoticed -- these use the real
  // nested one.
  //
  // The proposal identified this in carryOverFieldsForAccounting only; it is in
  // carryOverFieldsForPlan too, and Guardian Inventory is a declared carry
  // source for every Plan type, so both directions are covered here.
  describe('nested Initial Inventory attorney shape (Milestone 40C-F)', () => {
    const nestedInventorySource = () => ({
      inventoryType: 'guardian',
      wardName: 'Nested Ward',
      caseNumber: '2026-GA-777',
      county: 'Orange',
      gid: '2026-02-01',
      guardianName: 'Gale Guardian',
      // attorneyForGuardian deliberately blank: that is what used to make
      // attyName fall through to the bare `src.attorney` OBJECT.
      attorneyForGuardian: '',
      attorney: {
        name: 'Nina Nested, Esq.',
        barNumber: '0456789',
        phone: '727-555-0142',
        streetAddress: '400 Cleveland St',
        cityStateZip: 'Clearwater, FL 33755',
      },
      guardians: [{ name: 'Gale Guardian', ssnEin: '11-2233445', phone: '727-555-0100' }],
    });

    it('maps every nested attorney field into a Plan destination', () => {
      const result = carryOverFieldsForPlan(nestedInventorySource(), 'planInitial');
      expect(result.attorney_name).toBe('Nina Nested, Esq.');
      expect(result.attorney_bar).toBe('0456789');
      expect(result.attorney_phone).toBe('727-555-0142');
      expect(result.attorney_street).toBe('400 Cleveland St');
      expect(result.attorney_cityStateZip).toBe('Clearwater, FL 33755');
    });

    it('maps every nested attorney field into an accounting destination', () => {
      const result = carryOverFieldsForAccounting(nestedInventorySource(), 'annual');
      expect(result.attorney).toBe('Nina Nested, Esq.');
      expect(result.attorneyBar).toBe('0456789');
      expect(result.attorneyPhone).toBe('727-555-0142');
    });

    it('never assigns the nested attorney OBJECT into a string field', () => {
      for (const result of [
        carryOverFieldsForPlan(nestedInventorySource(), 'planInitial'),
        carryOverFieldsForAccounting(nestedInventorySource(), 'annual'),
      ]) {
        for (const [key, value] of Object.entries(result)) {
          if (!/attorney/i.test(key)) continue;
          expect(typeof value, `${key} must not be an object`).not.toBe('object');
        }
      }
    });

    it('still prefers an explicit flat attorney name over the nested one', () => {
      const src = nestedInventorySource();
      src.attorneyForGuardian = 'Flat Wins, Esq.';
      expect(carryOverFieldsForPlan(src, 'planInitial').attorney_name).toBe('Flat Wins, Esq.');
      expect(carryOverFieldsForAccounting(src, 'annual').attorney).toBe('Flat Wins, Esq.');
    });

    it('leaves county blank in both directions regardless of the source county', () => {
      expect(carryOverFieldsForPlan(nestedInventorySource(), 'planInitial').county).toBe('');
      expect(carryOverFieldsForAccounting(nestedInventorySource(), 'annual').county).toBe('');
    });
  });

  describe('carryOverFieldsForAccounting', () => {
    it('populates caseNumber, guardian, and attorney from a planMinor source', () => {
      const src = {
        wardName: 'Minor Ward',
        ucn: '2024-MN-042',
        ref: '',
        county: 'Pasco',
        guardianName: 'Guardian Parent',
        attorney_name: 'Counselor Minor',
        attorney_bar: '1122334',
        attorney_phone: '555-222-3333',
        planGuardians: [
          {
            name: 'Guardian Parent',
            tin: '123-45-6789',
            mailingStreet: '500 Palm Way',
            mailingCityStateZip: 'New Port Richey, FL 34652',
            phone: '555-777-6666',
          },
        ],
      };

      const result = carryOverFieldsForAccounting(src, 'annual');
      expect(result.wardName).toBe('Minor Ward');
      expect(result.caseNumber).toBe('2024-MN-042');
      expect(result.guardian).toBe('Guardian Parent');
      expect(result.attorney).toBe('Counselor Minor');
      expect(result.attorneyBar).toBe('1122334');
      expect(result.guardians[0].name).toBe('Guardian Parent');
      expect(result.guardians[0].ssn).toBe('123-45-6789');
    });

    // Milestone 40H-J: the symmetric defect to the nested-attorney-shape
    // block above, on the write side instead of the read side. A
    // Plan/Accounting source's attorney details are computed correctly
    // here (attyBar/attyPhone/attyStreet/attyCityStateZip all read
    // successfully from the source's flat keys) but used to be written
    // back out as flat attorneyBar/attorneyPhone/attorneyAddress/
    // attorneyCityStateZip -- keys emptyDataGuardian() doesn't have at
    // all. validateGuardian()/pdf-model.js only ever read the nested
    // attorney object, so the values were silently dropped on every
    // Plan/Accounting -> Guardian Inventory carryover.
    it('writes the attorney block into a Guardian Inventory destination as a nested object, not flat keys', () => {
      const src = {
        wardName: 'Annual Source Ward',
        caseNumber: '2026-GA-999',
        guardianName: 'Gale Guardian',
        attorney_name: 'Nina Nested, Esq.',
        attorney_bar: '0456789',
        attorney_phone: '727-555-0142',
        attorney_street: '400 Cleveland St',
        attorney_cityStateZip: 'Clearwater, FL 33755',
        guardians: [{ name: 'Gale Guardian', ssn: '11-2233445', phone: '727-555-0100' }],
      };

      const result = carryOverFieldsForAccounting(src, 'guardian');

      expect(result.attorney).toEqual({
        name: 'Nina Nested, Esq.',
        barNumber: '0456789',
        phone: '727-555-0142',
        streetAddress: '400 Cleveland St',
        cityStateZip: 'Clearwater, FL 33755',
        signatureDate: null,
        filingDate: null,
        signatureState: '',
        signatureImage: '',
      });
      expect(result).not.toHaveProperty('attorneyBar');
      expect(result).not.toHaveProperty('attorneyPhone');
      expect(result).not.toHaveProperty('attorneyAddress');
      expect(result).not.toHaveProperty('attorneyCityStateZip');
      // attorneyForGuardian (the flat name) is a real field on
      // emptyDataGuardian() and must still carry.
      expect(result.attorneyForGuardian).toBe('Nina Nested, Esq.');
    });
  });
});

