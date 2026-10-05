// Milestone 42G: filing-descriptor.js's DESCRIPTORS is the one place all
// nine filing-type keys (and the seven distinct engine IDs) are supposed to
// be listed. This guards against the next new file re-enumerating them by
// hand -- the exact drift 42G found and fixed in types/filing.js (a second,
// hand-maintained union type), router.js and ward-lifecycle.js (two
// identical 7-case mount-dispatch switches), and convert-ward-modal.js (a
// misplaced eligibility table, mis-keyed once already in Milestone 42E).
//
// Comment/prose mentions don't count -- state.js only ever mentions type
// names in passing (e.g. "formEngine() maps all three to 'annual'"), which
// is not the fragmentation this guards against, so quoted literals inside
// comments are stripped before counting, same as
// tests/e2e/security.spec.ts's withoutJsComments().
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILING_TYPE_KEYS } from '../../src/core/filing/filing-descriptor.js';
import { walkSourceFiles } from './support/source-scan.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REGISTRY_FILE = 'src/core/filing/filing-descriptor.js';

// Files with a real, independent reason to enumerate several/all nine keys
// that is NOT the "same concept duplicated" problem this guard targets --
// each is a deliberate, documented exception, not an oversight:
// (src/legacy-app.js, the core dispatch file, was the first exception, from
// Milestone 42G; its dispatch moved out piece by piece and 70K emptied it.)
const ALLOWED = {
  // (src/core/validation/error-route.js had one from 70F for PLAN_SECTION_ROUTES,
  // which is keyed by bare property names this guard never counts: it was
  // never needed, and the check below found it in 70K.)
  // Milestone 70, 70C: the eager filing registry -- the per-identity names,
  // dashboard look and page lists legacy-app.js used to hold (the exception
  // above, moving here piece by piece). Built on DESCRIPTORS, not a second
  // identity list: FILING_REGISTRY itself is derived from FILING_TYPE_KEYS.
  'src/core/filing/filing-registry.js': "the eager filing registry's per-identity data, moved out of legacy-app.js (MS 70 70C)",
  // CARRY_SOURCE_TYPE / PRIOR_ACCOUNTING_SOURCES / ACCOUNTING_FORM_TYPES:
  // creation-time eligibility, confirmed the correct home already (other
  // consumers, e.g. filing-descriptor.js's own CONVERT_SOURCE_TYPE
  // reasoning, already treat this table as the carry-over rules' own). It
  // lived in ward-lifecycle.js until Milestone 70's 70G brought it here, to
  // the carry-over builders that read it.
  'src/core/filing/carry-over.js': 'creation-time carry-source eligibility, its correct home',
  'src/core/filing/starting-balance-carry.js': "which ending balance each accounting form carries, and the Trust Accounting boundary -- carry-over.js's own concern, split out (MS 71E)",
  // Milestone 70, 70G: what a new year resets, form by form
  // (resetYearlyFieldsForNewYear()) -- each form's own period and balance
  // fields, which differ by schema; moved from legacy-app.js (the exception
  // above). tests/baseline/ms70-year-rollover-golden.json pins all nine.
  'src/core/filing/filing-years.js': "each form's own year-end reset, moved from legacy-app.js (MS 70 70G)",
  // Milestone 70, 70G: the Add Form dialog's four decisions about particular
  // types -- the type it opens on (guardian), the adult-records check before a
  // Minor plan, the hand-off to the Simplified eligibility questions and the
  // Annual it creates when they fail. Branches, not a list of the types.
  'src/core/modals/filing-dialogs.js': "the Add Form dialog's branches on particular types, moved from legacy-app.js (MS 70 70G)",
  // Milestone 70, 70H: the shell's choices by form, moved from legacy-app.js
  // -- the Help text and the guided tour are written for each form; the Start
  // New Form picker draws one card per filing type. (The sidebar mounted each
  // form's own navigation by name until 70K; it asks the feature services
  // for the open filing's engine now.)
  'src/core/help/help-panel.js': "the Help text chosen for each form, moved from legacy-app.js (MS 70 70H)",
  'src/core/help/walkthrough.js': "the guided tour written for each form, moved from legacy-app.js (MS 70 70H)",
  'src/core/shell/start-new-form.js': "the Start New Form picker's card for each filing type, moved from legacy-app.js (MS 70 70H)",
  // Milestone 70, 70K: GuardianForms.testing's saveOutput members each start
  // one form's own Save as PDF / Excel, by that form's feature -- four names,
  // one per member, not a listing of the types.
  'src/core/testing/testing-adapter.js': "saveOutput's per-form save commands, by feature (MS 70 70K)",
  // Milestone 72C: one sidebar evaluator per engine, each passing its own
  // engine to the one shared "attorney started" test (attorney-block.js's
  // isAttorneyStarted()) -- the same call the validators make. Five call
  // sites, one per evaluator, not a listing of the types.
  'src/core/status/completion.js': "each engine's sidebar evaluator names its own engine to the shared attorney-started test (MS 72C)",
  // Per-schema collection membership (which schedules/collections exist on
  // which filing types, and their min counts) -- AGENTS.md section 3: never
  // share generic factories across forms with differing schemas. This is
  // domain data about individual forms, not filing identity.
  // Milestone 73V moved that table, unchanged, from prune-cards.js to
  // blank-rows.js (so the list rules can read it without an import cycle), and
  // added the list rules themselves: each form's repeating lists, found by
  // (filing type, list key) because the same list differs between forms --
  // per-schema rules again, not a second listing of filing identity.
  'src/core/form/blank-rows.js': 'per-schema collection membership, not filing identity (moved from prune-cards.js, MS 73V)',
  'src/core/form/collections.js': "each form's list rules, keyed by filing type and list because the schemas differ (MS 73V)",
  // Per-type dashboard presentation/derived-stat logic (headline figures,
  // deadlines) -- behavior that depends on filing type, not a second
  // listing of the identity registry itself.
  'src/features/dashboard/view-model.js': 'per-type dashboard presentation logic, not filing identity',
};

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const walk = (dir) => walkSourceFiles(dir);

describe('filing-type key enumeration stays in filing-descriptor.js', () => {
  const files = walk(path.join(root, 'src')).map((f) => path.relative(root, f).replace(/\\/g, '/'));

  it('no file outside the registry and its documented exceptions lists 4+ distinct filing-type keys', () => {
    const offenders = [];
    for (const rel of files) {
      if (rel === REGISTRY_FILE || rel in ALLOWED) continue;
      const code = stripComments(fs.readFileSync(path.join(root, rel), 'utf8'));
      const present = FILING_TYPE_KEYS.filter((k) => new RegExp(`['"\`]${k}['"\`]`).test(code));
      if (present.length >= 4) offenders.push(`${rel} (${present.length} keys: ${present.join(', ')})`);
    }
    expect(offenders, 'new filing-type enumeration outside filing-descriptor.js -- derive from FILING_TYPE_KEYS/DESCRIPTORS instead, or add a documented exception to ALLOWED above with a real reason').toEqual([]);
  });

  it('every documented exception still exists and still enumerates the types', () => {
    for (const rel of Object.keys(ALLOWED)) {
      expect(fs.existsSync(path.join(root, rel)), `${rel} no longer exists -- remove its exception`).toBe(true);
      const code = stripComments(fs.readFileSync(path.join(root, rel), 'utf8'));
      const present = FILING_TYPE_KEYS.filter((k) => new RegExp(`['"\`]${k}['"\`]`).test(code));
      expect(present.length, `${rel} no longer lists 4+ filing types -- remove its exception`).toBeGreaterThanOrEqual(4);
    }
  });
});
