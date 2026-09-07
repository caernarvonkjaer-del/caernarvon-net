import { describe, it, expect, beforeEach } from 'vitest';
global.window = global;
import {
  isBlankCard,
  isBlankScheduleEntry,
  pruneBlankCards,
  BLANK_CARD_COLLECTIONS,
} from '../../src/core/form/prune-cards.js';

describe('prune-cards', () => {
  beforeEach(() => {
    window.autoSave = () => {};
    window.formEngine = (type) => {
      const aliases = ['annual', 'finalAccounting', 'trustAccounting'];
      return aliases.includes(type) ? 'annual' : type;
    };
    window.BLANK_SCHEDULE_ENTRY = {
      schA: () => ({ payer: '', description: '', bank: '', accountNo: '', amount: '' }),
      schD1: () => ({ description: '', accountNo: '', restricted: 'No', type: '', fullAmount: '', wardPct: '', restrictedAmt: '' }),
      scheduleA1: () => ({ description: '', streetAddress: '', cityStateZip: '', estimatedValue: 0, wardPercent: 100 }),
    };
  });

  describe('isBlankCard', () => {
    it('identifies blank cards with empty strings, null, undefined, false, or empty arrays', () => {
      expect(isBlankCard({})).toBe(false);
      expect(isBlankCard({ name: '', ssn: '', phone: null, active: false, tags: [] })).toBe(true);
      expect(isBlankCard({
        name: '',
        ssn: '',
        phone: '',
        email: '',
        mailingStreet: '',
        mailingCityStateZip: '',
        officeStreet: '',
        officeCityStateZip: '',
        signatureDate: '',
      })).toBe(true);
    });

    it('identifies populated cards as non-blank', () => {
      expect(isBlankCard({ name: 'John Doe', ssn: '' })).toBe(false);
      expect(isBlankCard({ name: '', ssn: '', active: true })).toBe(false);
    });

    it('treats numeric 0 as non-blank to protect typed numeric values', () => {
      expect(isBlankCard({ name: '', amount: 0 })).toBe(false);
    });
  });

  describe('isBlankScheduleEntry', () => {
    it('matches untouched schedule templates including non-empty defaults', () => {
      const emptySchD1 = { description: '', accountNo: '', restricted: 'No', type: '', fullAmount: '', wardPct: '', restrictedAmt: '' };
      expect(isBlankScheduleEntry('schD1', emptySchD1, window.BLANK_SCHEDULE_ENTRY)).toBe(true);

      const modifiedSchD1 = { description: 'Bank Account', accountNo: '', restricted: 'No', type: '', fullAmount: '', wardPct: '', restrictedAmt: '' };
      expect(isBlankScheduleEntry('schD1', modifiedSchD1, window.BLANK_SCHEDULE_ENTRY)).toBe(false);

      const emptySchA1 = { description: '', streetAddress: '', cityStateZip: '', estimatedValue: 0, wardPercent: 100 };
      expect(isBlankScheduleEntry('scheduleA1', emptySchA1, window.BLANK_SCHEDULE_ENTRY)).toBe(true);
    });
  });

  describe('pruneBlankCards on Annual Accounting', () => {
    it('prunes pre-seeded 3 blank guardians down to 1 guardian floor', () => {
      const data = {
        guardians: [
          { name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '' },
          { name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '' },
          { name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '' },
        ],
        guardianPartyIds: ['id1', 'id2', 'id3'],
      };

      const removed = pruneBlankCards(data, 'annual');
      expect(removed).toBe(2);
      expect(data.guardians.length).toBe(1);
      expect(data.guardianPartyIds).toEqual(['id1']);
    });

    it('preserves populated co-guardians and maintains guardianPartyIds alignment', () => {
      const data = {
        guardians: [
          { name: 'Primary Guardian', ssn: '111', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '' },
          { name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '' },
          { name: 'Co-Guardian 3', ssn: '333', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '' },
        ],
        guardianPartyIds: ['party-1', 'party-2', 'party-3'],
      };

      const removed = pruneBlankCards(data, 'annual');
      expect(removed).toBe(1);
      expect(data.guardians.length).toBe(2);
      expect(data.guardians[0].name).toBe('Primary Guardian');
      expect(data.guardians[1].name).toBe('Co-Guardian 3');
      expect(data.guardianPartyIds).toEqual(['party-1', 'party-3']);
    });

    it('prunes pre-seeded 4 blank certRecipients down to 1 recipient floor', () => {
      const data = {
        certRecipients: [
          { name: '', line2: '', line3: '', line4: '' },
          { name: '', line2: '', line3: '', line4: '' },
          { name: '', line2: '', line3: '', line4: '' },
          { name: '', line2: '', line3: '', line4: '' },
        ],
      };

      const removed = pruneBlankCards(data, 'annual');
      expect(removed).toBe(3);
      expect(data.certRecipients.length).toBe(1);
    });

    it('prunes blank remuneration entries down to 0 floor', () => {
      const data = {
        remuneration: [
          { guardian: '', type: '', amount: '', description: '' },
        ],
      };

      const removed = pruneBlankCards(data, 'annual');
      expect(removed).toBe(1);
      expect(data.remuneration.length).toBe(0);
    });
  });

  describe('pruneBlankCards on Plan Forms', () => {
    it('prunes untouched plan repeatable rows to 0', () => {
      const data = {
        q1Residences: [
          { name: '', street: '', cityStateZip: '', phone: '', facilityType: '', from: '', to: '' },
        ],
        q4Providers: [
          { name: '', street: '', cityStateZip: '', phone: '', providerType: '', visits: '' },
        ],
        q10Directives: [
          { title: '', dateSigned: '', signedBy: '', agents: '', alternates: '', relationship: '', contact: '', courtRevoked: '', orderDate: '', orderCounty: '' },
        ],
      };

      const removed = pruneBlankCards(data, 'planAnnual');
      expect(removed).toBe(3);
      expect(data.q1Residences.length).toBe(0);
      expect(data.q4Providers.length).toBe(0);
      expect(data.q10Directives.length).toBe(0);
    });
  });
});
