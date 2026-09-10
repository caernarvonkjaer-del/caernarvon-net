import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { formatDisplayDate } from '../../src/core/form/date-parser.js';
import { buildPlanSimplifiedModel } from '../../src/features/plan-simplified/pdf-model.js';

describe('Sub-milestone 36-5: Content Corrections', () => {
  describe('Administrative Order 2024-025 removal guard', () => {
    it('ensures no circuit-specific Administrative Order 2024-025 appears in src/', () => {
      const srcDir = path.resolve(__dirname, '../../src');
      const filesWithAO = [];

      function scanDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (/\.(js|html|css)$/.test(entry.name)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('2024-025') || content.includes('Administrative Order 2024')) {
              filesWithAO.push(path.relative(srcDir, fullPath));
            }
          }
        }
      }

      scanDir(srcDir);
      expect(filesWithAO, 'Administrative Order 2024-025 should be removed from all src files').toEqual([]);
    });
  });

  describe('Part VIII no-trusts certification check', () => {
    // Evaluates the Part VIII completeness rule from legacy-app.js computeNavChecks()
    const isPart8Complete = (D) => {
      const verifiedEmpty = (k) => !!(D.scheduleNoItems && D.scheduleNoItems[k]);
      return verifiedEmpty('a-p8') || verifiedEmpty('p8') || (D.trusts || []).some((t) => t && t.name);
    };

    it('reports complete when the user certifies there are no trusts', () => {
      const D = {
        trusts: [],
        scheduleNoItems: { 'a-p8': true },
      };
      expect(isPart8Complete(D)).toBe(true);
    });

    it('reports complete with alternate key p8', () => {
      const D = {
        trusts: [],
        scheduleNoItems: { p8: true },
      };
      expect(isPart8Complete(D)).toBe(true);
    });

    it('reports incomplete when there are no trusts and certification is unchecked', () => {
      const D = {
        trusts: [],
        scheduleNoItems: {},
      };
      expect(isPart8Complete(D)).toBe(false);
    });

    it('reports complete when a named trust is present, regardless of checkbox', () => {
      const D = {
        trusts: [{ name: 'Family Trust', trustee: 'Jane Doe' }],
        scheduleNoItems: {},
      };
      expect(isPart8Complete(D)).toBe(true);
    });
  });

  describe('Supporting Documents accounting period date formatting', () => {
    it('formats canonical YYYY-MM-DD dates to MM/DD/YYYY in accounting period heading', () => {
      const period = '2027-01-01__2027-12-31';
      const [pf, pt] = period.split('__');
      const fmtPf = pf ? formatDisplayDate(pf) || pf : '';
      const fmtPt = pt ? formatDisplayDate(pt) || pt : '';

      expect(fmtPf).toBe('01/01/2027');
      expect(fmtPt).toBe('12/31/2027');

      const activeInventoryType = 'annual';
      const periodNote = activeInventoryType === 'guardian' ? ''
        : (fmtPf || fmtPt ? ` — accounting period ${fmtPf || '?'} to ${fmtPt || '?'}` : ' — set the accounting period on the Cover page to file these by year');

      expect(periodNote).toBe(' — accounting period 01/01/2027 to 12/31/2027');
    });

    it('falls back gracefully when dates are missing or partial', () => {
      const period = '__';
      const [pf, pt] = period.split('__');
      const fmtPf = pf ? formatDisplayDate(pf) || pf : '';
      const fmtPt = pt ? formatDisplayDate(pt) || pt : '';

      const activeInventoryType = 'annual';
      const periodNote = activeInventoryType === 'guardian' ? ''
        : (fmtPf || fmtPt ? ` — accounting period ${fmtPf || '?'} to ${fmtPt || '?'}` : ' — set the accounting period on the Cover page to file these by year');

      expect(periodNote).toBe(' — set the accounting period on the Cover page to file these by year');
    });
  });

  describe('Clerk filing instructions in Simplified Plan PDF model', () => {
    it('provides generic statewide instructions rather than hardcoded county clerk addresses', () => {
      const model = buildPlanSimplifiedModel({
        wardName: 'Test Ward',
        caseNumber: '2027-CP-1234',
        county: 'Orange',
      });

      const filingInstSec = model.sections.find((s) => s.id === 'signatures');
      expect(filingInstSec).toBeDefined();

      const text = filingInstSec.blocks.map((b) => b.text || '').join('\n');
      expect(text).not.toContain('315 Court Street');
      expect(text).not.toContain('Clearwater');
      expect(text).not.toContain('New Port Richey');
      expect(text).toContain('Clerk of the Circuit Court in the county of jurisdiction');
    });
  });

  describe('Schedule C-2 court placeholder in Guardian Inventory', () => {
    it('uses generic example instead of 6th Judicial / Pinellas', () => {
      const invFilePath = path.resolve(__dirname, '../../src/features/guardian-inventory/index.js');
      const content = fs.readFileSync(invFilePath, 'utf8');

      expect(content).not.toContain('6th Judicial / Pinellas');
      expect(content).toContain('Circuit Court / County');
    });
  });
});
