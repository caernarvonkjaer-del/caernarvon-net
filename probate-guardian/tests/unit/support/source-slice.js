// Reading application source in a unit spec, and cutting a brace-balanced span
// out of it. Milestone 70's 70L renamed this from legacy-source-extract.js,
// Milestone 52L's one "slice a function out of legacy-app.js" routine, when
// the monolith was deleted: every legacy use had become a direct import, and
// what is left reads ES modules, for three documented reasons --
//
//   - checklist-export-parity.spec.js searches inside each feature's export
//     validator (validateGuardian(), validateAnnual(), ...) for the fields it
//     checks, to compare them with the sidebar's; nothing is evaluated.
//   - schedule-doc-ack.spec.js holds that those validators never call the
//     supporting-documentation acknowledgement (57C-R must never gate
//     export): an absence, which only the source can show.
//   - guardian-inventory-date-roundtrip.spec.js evaluates dt(), the Initial
//     Inventory importer's date reader. It is a closure inside
//     parseInitialInventoryWorkbook() (guardian-inventory/excel.js), not an
//     export, so the spec slices the real source rather than a copy of it.
//
// The brace matching is Milestone 52L's, byte for byte, deliberately including
// its limitation: it counts raw { and } characters with no awareness of
// strings, comments, or template literals. A function whose body contains an
// unbalanced brace inside a string would be sliced wrong. That is not fixed
// here on purpose -- making the matcher smarter could change which span each
// caller gets, which is a behavior change dressed up as a consolidation. If a
// caller ever needs a brace-in-string-safe matcher, add it alongside this one
// and move that caller over deliberately.

import fs from 'node:fs';
import path from 'node:path';

/** Read a repo-relative source file. Paths stay repo-relative per AGENTS.md §1. */
export function readRepoSource(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
}

/**
 * Slice the brace-balanced span that follows `header` in already-read source.
 *
 * Returns '' when the header is absent or the braces never balance -- the
 * contract checklist-export-parity.spec.js relies on, since it asserts on the
 * returned length itself rather than expecting a throw.
 *
 * `includeHeader: true` returns `function name(...) { ... }`;
 * `false` returns just `{ ... }`, starting at the opening brace.
 */
export function sliceBalancedFunction(source, header, { includeHeader = true } = {}) {
  const start = source.indexOf(header);
  if (start === -1) return '';
  const open = source.indexOf('{', start);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(includeHeader ? start : open, i + 1);
    }
  }
  return '';
}
