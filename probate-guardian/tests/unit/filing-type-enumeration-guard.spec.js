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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REGISTRY_FILE = 'src/core/filing/filing-descriptor.js';

// Files with a real, independent reason to enumerate several/all nine keys
// that is NOT the "same concept duplicated" problem this guard targets --
// each is a deliberate, documented exception, not an oversight:
const ALLOWED = {
  // The core dispatch file (PAGES_*, INVENTORY_TYPES, formEngine(), the
  // per-type wizard/mount/nav functions). Consolidating this into the
  // registry is a large, separate, carefully-scoped effort in its own
  // right -- Milestone 42G deliberately did not attempt it in one pass
  // against the single most load-bearing file in the app.
  'src/legacy-app.js': 'core dispatch, out of scope for 42G -- see MILESTONE-42-PROPOSAL.md 42G',
  // CARRY_SOURCE_TYPE / PRIOR_ACCOUNTING_SOURCES / ACCOUNTING_FORM_TYPES:
  // creation-time eligibility, confirmed the correct home already (other
  // consumers, e.g. filing-descriptor.js's own CONVERT_SOURCE_TYPE
  // reasoning, already treat this file as the carry-table's owner).
  'src/core/navigation/ward-lifecycle.js': 'creation-time carry-source eligibility, its correct home',
  // Per-schema collection membership (which schedules/collections exist on
  // which filing types, and their min counts) -- AGENTS.md section 3: never
  // share generic factories across forms with differing schemas. This is
  // domain data about individual forms, not filing identity.
  'src/core/form/prune-cards.js': 'per-schema collection membership, not filing identity',
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

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

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

  it('every documented exception still exists and still has a reason worth re-checking', () => {
    for (const rel of Object.keys(ALLOWED)) {
      expect(fs.existsSync(path.join(root, rel)), `${rel} no longer exists -- remove its exception`).toBe(true);
    }
  });
});
