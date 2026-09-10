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
      expect(result.county).toBe('Hillsborough');
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
  });
});

