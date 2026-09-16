// Milestone 52L: the one "slice a function out of legacy-app.js" routine.
//
// legacy-app.js is a classic, zero-export, browser-bound script, so a unit
// test that wants one of its functions cannot import it -- it reads the
// source, cuts out a brace-balanced span, and evaluates it. Three specs had
// each written that out independently: bar-number.spec.js's
// loadFormatBarNumber(), checklist-export-parity.spec.js's sliceFunction(),
// and form-fields-legacy-delegation.spec.js's extractFunction(), whose own
// comment says it was copying "the technique tests/unit/bar-number.spec.js
// already established" -- by hand, not by import.
//
// The brace-matching algorithm below is byte-for-byte what all three already
// did, deliberately including its limitation: it counts raw { and }
// characters with no awareness of strings, comments, or template literals. A
// function whose body contains an unbalanced brace inside a string would be
// sliced wrong. That is not fixed here on purpose -- making the matcher
// smarter could change which span each of the three existing callers gets,
// which is a behavior change dressed up as a consolidation. If a caller ever
// needs a brace-in-string-safe matcher, add it alongside this one and move
// that caller over deliberately.
//
// The two return shapes the three callers needed are both kept, because they
// are genuinely different needs and not an inconsistency: two want the whole
// `function name(...) {...}` text so they can `new Function(body + '; return
// name;')`, and one wants only the `{...}` body so it can search inside it.

import fs from 'node:fs';
import path from 'node:path';

export const LEGACY_APP = 'src/legacy-app.js';

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

/**
 * Extract a named function declaration from a repo source file (legacy-app.js
 * by default), including its header.
 *
 * Throws with the function and file named when it is not found. The two
 * callers this replaces each used an inline `expect(start, '<name> not found
 * in legacy-app.js').toBeGreaterThan(-1)`; a throw fails the test the same way
 * with the same information, and keeps vitest out of a support module.
 */
export function extractLegacyFunction(name, { file = LEGACY_APP } = {}) {
  const body = sliceBalancedFunction(readRepoSource(file), `function ${name}(`);
  if (!body) throw new Error(`${name} not found (or braces unbalanced) in ${file}`);
  return body;
}
