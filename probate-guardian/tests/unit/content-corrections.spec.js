import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { formatDisplayDate } from '../../src/core/form/date-parser.js';
import { buildPlanSimplifiedModel } from '../../src/features/plan-simplified/pdf-model.js';
import { walkSourceFiles } from './support/source-scan.js';

describe('Sub-milestone 36-5: Content Corrections', () => {
  describe('Administrative Order 2024-025 removal guard', () => {
    // Milestone 47B (2026-09-15): src/features/dashboard/resources.js links
    // to the Sixth Circuit's own AO index page from a "Sixth Judicial
    // Circuit" resource group. Unlike the Milestone 36-5 violation this
    // guard exists to catch (the AO stated unconditionally, as a filing
    // requirement, on-screen and in printed documents, regardless of the
    // filer's actual county), this mention names the order only as a link
    // description, never a requirement, and sits under the panel's own
    // third-party disclaimer. Exempted by exact file path rather than
    // weakening the string match, so any *other* file reintroducing the
    // ungated defect is still caught; the second test below pins that this
    // one exception stays gated and disclaimed.
    //
    // Milestone 54 (2026-09-16) changed HOW it is gated, not whether: 47B
    // gated the whole Sixth Circuit group by the counties on the user's
    // FILINGS (groupsForCounties(), Decision D4 -- Pinellas/Pasco/no-county
    // showed it, anything else did not). The circuit selector replaced that
    // with the user's SELECTED circuit (groupsForCircuit(), keyed by
    // RESOURCE_GROUPS' `scope: 'circuit-6'`) -- the group, and the AO link
    // inside it, render only when circuit 6 is the one chosen, for any of
    // Florida's 20 circuits. This is a materially different exposure a
    // qualified reviewer should confirm still satisfies AGENTS.md section
    // 5's "never shown as mandatory statewide requirements for other
    // counties": a filer whose OWN filings are in, say, the 13th Circuit can
    // now manually browse the Sixth Circuit's resource group (and see the AO
    // link) by selecting it from the dropdown, which 47B's filing-county
    // gate would never have shown them. Nothing in the UI asserts the order
    // applies to their filing, and it is inside the panel's disclaimer either
    // way. Raised per AGENTS.md section 8's "flag for a qualified person"
    // rule; Alan reviewed it (2026-09-16) and confirmed this is acceptable
    // as shipped -- not an open item. Recorded in MILESTONE-54-PROPOSAL.md's
    // Appendix: Change record.
    const ALLOWED_FILES = new Set(['features/dashboard/resources.js']);

    it('ensures no circuit-specific Administrative Order 2024-025 appears in src/ outside the one documented exception', () => {
      const srcDir = path.resolve(__dirname, '../../src');
      const filesWithAO = [];

      // Scans every shipped asset, not just executable code -- the AO text
      // is prose, so .html and .css count.
      for (const fullPath of walkSourceFiles(srcDir, { extensions: ['.js', '.html', '.css'] })) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('2024-025') || content.includes('Administrative Order 2024')) {
          const relPath = path.relative(srcDir, fullPath);
          if (!ALLOWED_FILES.has(relPath.replace(/\\/g, '/'))) filesWithAO.push(relPath);
        }
      }

      expect(filesWithAO, 'Administrative Order 2024-025 should be removed from all src files except the one documented, gated exception (see ALLOWED_FILES above)').toEqual([]);
    });

    it('keeps the one allowed AO 2024-025 mention circuit-gated and disclaimed, never stated as a filing requirement', () => {
      const resourcesPath = path.resolve(__dirname, '../../src/features/dashboard/resources.js');
      const content = fs.readFileSync(resourcesPath, 'utf8');

      // Still exists, inside the Sixth Circuit resource group specifically --
      // bounded to 'circuit-1' (Milestone 54's helpful-links wiring inserted
      // the other 19 circuits' groups directly after this one, ending with
      // 'circuit-1'; slicing to 'florida' the way this test used to would
      // now sweep in all of them and stop isolating anything).
      const sixthCircuitGroup = content.slice(content.indexOf("id: 'sixth-circuit'"), content.indexOf("id: 'circuit-1'"));
      expect(sixthCircuitGroup).toContain('2024-025');
      expect(sixthCircuitGroup).toContain("scope: 'circuit-6'");

      // ...that group is included only when its own `scope` matches the
      // SELECTED circuit (groupsForCircuit()), not rendered unconditionally
      // for every circuit...
      expect(content).toMatch(/RESOURCE_GROUPS\.find\(g\s*=>\s*g\.scope\s*===\s*`circuit-\$\{cNum\}`\)/);

      // ...and the panel carries its own third-party disclaimer.
      expect(content).toContain("is not affiliated with them");
    });
  });

  // Milestone 43D: this block used to hand-reimplement the Part VIII
  // completeness rule from legacy-app.js's computeNavChecks() -- since
  // Milestone 70's 70D annualCompletion() in src/core/status/completion.js,
  // importable and compared with the pre-move rule by completion-parity.spec.js ('a-p8':
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

  // Accounting period note formatting in Supporting Documents is tested
  // against the real production UI and rendered DOM in
  // tests/e2e/schedule-docs-period-key.spec.ts. Hand-copied local duplicates
  // removed.


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
