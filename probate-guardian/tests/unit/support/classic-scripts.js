// The application's classic scripts: what index.html loads with a plain
// <script src> outside lib/ (scripts/ms70-dependency-audit.mjs's
// classicScriptsFromHtml(), the same list the dependency and window audits
// use). A classic script runs before any module has evaluated, tsc does not
// check it, and its top-level functions and vars are window globals with no
// assignment anywhere -- so the guards that read src/legacy-app.js for those
// reasons read every classic script instead, since Milestone 70's 70L deleted
// the monolith. That is src/prepaint.js alone; a guard that reads this list
// covers any classic script added later without being edited.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classicScriptsFromHtml } from '../../../scripts/ms70-dependency-audit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Repo-relative paths of the classic scripts index.html loads. */
export function classicScripts(root = ROOT) {
  return classicScriptsFromHtml(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
}

/** Each classic script with its source: [{ file, source }]. */
export function classicScriptSources(root = ROOT) {
  return classicScripts(root).map((file) => ({ file, source: fs.readFileSync(path.join(root, file), 'utf8') }));
}
