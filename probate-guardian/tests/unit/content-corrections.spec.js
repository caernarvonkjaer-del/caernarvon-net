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

  // Milestone 43D: this block used to hand-reimplement the Part VIII
  // completeness rule from legacy-app.js's computeNavChecks() ('a-p8':
  // verifiedEmpty('a-p8')||verifiedEmpty('p8')||(D.trusts||[]).some(t=>t.name))
  // as a local const, which cannot catch a regression in the actual
  // unexported rule -- confirmed there was no way to import and call the
  // real one (a classic-script, module-private function, the same
  // reachability gap 43A/43B found repeatedly elsewhere). Real coverage now
  // exists in tests/e2e/annual-schedule-consistency.spec.ts's "Part VIII
  // (Trusts) completes via verify-none OR a named trust row" test, driven
  // through the real UI in a real browser -- confirmed to catch a
  // regression (temporarily removed the named-trust completion path,
  // watched it fail, restored it). Deleted here rather than left as a
  // second, weaker copy.

  describe('Supporting Documents accounting period date formatting', () => {
    // Milestone 43D: this test used to also assert formatDisplayDate()'s
    // own YYYY-MM-DD -> MM/DD/YYYY conversion directly (fmtPf/fmtPt), which
    // is already covered by date-parser.spec.js's own formatDisplayDate
    // suite -- trimmed here to its own distinct, otherwise-uncovered
    // concern: the accounting-period note string legacy-app.js builds
    // around that formatted output (also module-private, no export, same
    // reachability gap as Part VIII above -- kept as a hand-reimplemented
    // sanity check since no real function exists to import, unlike the
    // date-formatting half this trimmed away).
    it('builds the accounting-period note from already-formatted dates', () => {
      const fmtPf = '01/01/2027';
      const fmtPt = '12/31/2027';

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
