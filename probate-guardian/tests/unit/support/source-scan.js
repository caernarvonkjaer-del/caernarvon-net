// Milestone 52L: the one recursive source-tree walker for guard specs.
//
// Five specs had each written their own, in three shapes: field-kind-inference
// and filing-type-enumeration-guard defined an identical `walk(dir, out=[])`;
// content-corrections and native-dialog-guard each defined a `scanDir(dir)`
// that fused walking, reading and matching into one closure pushing into an
// outer array; security-source-audit did the same job with Node's
// `{ recursive: true }` readdirSync option.
//
// Traversal order is deliberately the depth-first, directory-entry order the
// first four already used -- recurse into a directory the moment it is met,
// rather than listing a whole level first. The `{ recursive: true }` option
// security-source-audit used does not guarantee that order, but its results
// feed emptiness assertions (no event attributes, no inline scripts), so the
// set is what matters there, not the sequence.
//
// Extension sets stay per-caller rather than being unified. They are not an
// oversight to fix: a guard that scans .js/.html/.css is looking for text in
// any shipped asset, while one that scans .js only is looking at executable
// code. Widening either silently would change what the guard covers.

import fs from 'node:fs';
import path from 'node:path';

/**
 * Every file under `dir` (recursively) whose extension is in `extensions`,
 * as absolute paths, depth-first in directory-entry order.
 *
 * A non-directory `dir` yields just itself if it matches -- the case
 * security-source-audit.spec.js needs, since its scan list names both
 * directories and individual files.
 */
export function walkSourceFiles(dir, { extensions = ['.js'] } = {}) {
  const matches = (name) => extensions.some((ext) => name.endsWith(ext));
  const out = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (matches(entry.name)) out.push(full);
    }
  };
  if (!fs.statSync(dir).isDirectory()) return matches(dir) ? [dir] : [];
  visit(dir);
  return out;
}
