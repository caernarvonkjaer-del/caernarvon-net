// Milestone 70, 70A: "Classify every legacy top-level function/binding as
// move, delete as dead/duplicate, temporary wrapper, or approved external
// facade, with a named target delivery and module." This builds that
// classification as a reviewable draft, from evidence rather than by hand:
//
//   - each top-level declaration of src/legacy-app.js, with its kind, lines
//     and the monolith section it sits in (the file's own banner comments);
//   - how often the monolith itself references it, resolved through real
//     scoping (scripts/ms70-dependency-audit.mjs's analyzer), so a local
//     variable of the same name does not count;
//   - which modules use it, through window or by bare name (the dependency
//     audit), and how many browser specs reach it (tests/baseline/
//     ms70-e2e-globals.json).
//
// Dispositions it proposes:
//   delete-as-dead   nothing references it anywhere; confirm before deleting
//   test-only        only tests reach it; it leaves production and moves
//                    behind GuardianForms.testing (70T) or a direct import
//   move             live code; moves in its section's delivery, keeping a
//                    one-line classic wrapper while classic callers remain
//   wrapper          already moved: what is left is that one-line wrapper
//                    (it forwards through src/legacy-bridge.js). movedIn is
//                    the delivery that moved it; delivery is its deletion
//                    target -- the latest delivery among the monolith
//                    declarations that still call it (70L if code outside any
//                    declaration does), recomputed from evidence each run, so
//                    it moves earlier as its callers move out. `reviewed`
//                    follows the review of the move itself.
// No declaration is proposed as an external facade: the plan's default for
// window.GuardianForms is no member (70A), and each one must be argued for.
//
// The delivery comes from the section; a few names are placed by hand where
// the section is not the right home (computeNavChecks and its callers belong
// to 70D, for instance).
//
// The owner's review (tests/baseline/ms70-declaration-review.json) is then
// applied: its overrides correct the delivery (and once, the disposition)
// where the section rule is wrong, each with its reason, and an entry is
// `reviewed: true` only while its disposition and delivery still match what
// the review recorded -- a new declaration, or one whose placement drifts,
// is unreviewed again and fails tests/unit/ms70-declaration-dispositions.spec.js.
//
// Usage (from probate-guardian/):
//   node scripts/ms70-declaration-dispositions.mjs            summary
//   node scripts/ms70-declaration-dispositions.mjs --write    tests/baseline/ms70-declaration-dispositions.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { analyze, auditApplication } from './ms70-dependency-audit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DISPOSITIONS_PATH = 'tests/baseline/ms70-declaration-dispositions.json';
export const REVIEW_PATH = 'tests/baseline/ms70-declaration-review.json';
export const DISPOSITION_KINDS = ['delete-as-dead', 'test-only', 'move', 'wrapper'];
// What a one-line wrapper forwards through (src/legacy-bridge.js).
const BRIDGE_READ = 'window.GuardianFormsLegacyBridge.';
export const DELIVERIES = ['70B', '70C', '70D', '70E', '70F', '70G', '70H', '70I', '70J', '70K', '70L'];

// Section title (the line after a banner rule) -> delivery.
const SECTION_DELIVERY = [
  [/^ICON SET/, '70B'], [/^THEME/, '70H'], [/^GLOBAL STATE & CONFIG/, '70C'], [/^HELP SYSTEM/, '70H'],
  [/^TOOLTIP SYSTEM/, '70H'], [/^WALKTHROUGH SYSTEM/, '70H'], [/^STORAGE STRATEGY/, '70I'], [/^COMMON HELPERS/, '70B'],
  [/^COUNTY AUTOCOMPLETE/, '70B'], [/^COUNTY → CIRCUIT/, '70B'], [/^VALIDATION SUMMARY/, '70F'], [/^PRINT-PREVIEW PAGER/, '70F'],
  [/^SECURITY: VALIDATION AND AUDIT/, '70I'], [/^ENCRYPTION AT REST/, '70I'], [/^IN-MEMORY STATE OPERATIONS/, '70E'],
  [/^ACTIVITY LOG/, '70H'], [/^PARTY MANAGEMENT/, '70G'], [/^EXPORT \/ IMPORT/, '70I'], [/^SESSION-RESTORE CACHE/, '70I'],
  [/^OPEN \/ START AT LAUNCH/, '70I'], [/^WARD MANAGEMENT/, '70G'], [/^WARD ACTIVATION/, '70G'], [/^INVENTORY TYPE MANAGEMENT/, '70C'],
  [/^MODAL FUNCTIONS/, '70H'], [/^ROUTER/, '70K'], [/^CONVERT EXISTING WARD/, '70G'], [/^MULTI-YEAR ACCOUNTING/, '70G'],
  [/^INVENTORY TYPE SELECTOR PAGE/, '70H'], [/^WIZARD: GUARDIAN INVENTORY/, '70C'], [/extracted into src\/features|createFeatureBridge/, '70K'],
  [/^EXCEL TEMPLATE CAPACITY/, '70F'], [/^DATA MODEL/, '70C'], [/^CALCULATIONS/, '70B'], [/^Page navigation helper/, '70F'],
  [/^FORM BINDING ENGINE/, '70F'], [/^SCHEDULE SUPPORTING DOCUMENTS/, '70F'], [/^td\(\)\/tdR\(\)/, '70F'], [/^INIT\b/, '70K'],
];
// Names whose section is not their home.
const NAME_DELIVERY = {
  computeNavChecks: '70D', updateNavDots: '70D', applyNavChecks: '70D', getWardProgress: '70D', pageCompleteness: '70D',
  isScheduleIncomplete: '70D', updateCurrentScheduleNextButton: '70D', initApp: '70K',
};

/** The monolith's sections: [{ line, title, delivery }] in file order. */
export function sectionsOf(source) {
  const lines = source.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\/\/ *(═|=){3,}/.test(lines[i])) continue;
    const title = lines[i + 1].replace(/^\/\/ */, '').trim();
    const hit = SECTION_DELIVERY.find(([re]) => re.test(title));
    if (hit) out.push({ line: i + 2, title: title.slice(0, 80), delivery: hit[1] });
  }
  return out;
}

/** Top-level declarations with their extent and how often the file itself references each. */
export function declarationsOf(source) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  const decls = [];
  for (const st of ast.body) {
    const push = (name, kind) => decls.push({ name, kind, line: st.loc.start.line, lines: st.loc.end.line - st.loc.start.line + 1 });
    if (st.type === 'FunctionDeclaration') push(st.id.name, 'function');
    else if (st.type === 'ClassDeclaration') push(st.id.name, 'class');
    else if (st.type === 'VariableDeclaration') {
      for (const d of st.declarations) if (d.id.type === 'Identifier') push(d.id.name, st.kind);
    }
  }
  const counts = new Map(decls.map((d) => [d.name, 0]));
  // The top-level declaration each reference sits in ('(top level)' when it
  // is in none), so a wrapper's deletion target can follow its callers.
  const ownerOf = (pos) => {
    const st = ast.body.find((x) => x.start <= pos && pos < x.end);
    if (!st) return '(top level)';
    if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') return st.id.name;
    if (st.type === 'VariableDeclaration' && st.declarations[0].id.type === 'Identifier') return st.declarations[0].id.name;
    return '(top level)';
  };
  const callers = new Map(decls.map((d) => [d.name, new Set()]));
  analyze(ast, {
    onRef(id, scope) {
      if (!counts.has(id.name)) return;
      let root = scope;
      while (root.parent) root = root.parent;
      if (scope.lookup(id.name) === root) {
        counts.set(id.name, counts.get(id.name) + 1);
        const owner = ownerOf(id.start);
        if (owner !== id.name) callers.get(id.name).add(owner);
      }
    },
  });
  // A `window.X` read inside the monolith of its own function also keeps it alive.
  for (const m of source.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)/g)) if (counts.has(m[1])) counts.set(m[1], counts.get(m[1]) + 1);
  const lines = source.split(/\r?\n/);
  return decls.map((d) => ({
    ...d,
    internalRefs: counts.get(d.name),
    callers: [...callers.get(d.name)].sort(),
    // A wrapper is one line (src/legacy-bridge.js's rule, held by
    // tests/unit/legacy-bridge.spec.js); a longer function that reads a data
    // member off the bridge is ordinary monolith code.
    forwarder: d.lines === 1 && lines[d.line - 1].includes(BRIDGE_READ),
  }));
}

export function buildDispositions(root = ROOT) {
  const legacyRel = 'src/legacy-app.js';
  const source = fs.readFileSync(path.join(root, legacyRel), 'utf8');
  const sections = sectionsOf(source);
  const audit = auditApplication(root);
  const e2e = JSON.parse(fs.readFileSync(path.join(root, 'tests/baseline/ms70-e2e-globals.json'), 'utf8')).byName || {};
  const reviewFile = path.join(root, REVIEW_PATH);
  const review = fs.existsSync(reviewFile) ? JSON.parse(fs.readFileSync(reviewFile, 'utf8')) : { overrides: {}, notes: {}, why: {}, confirmed: {} };
  const unitSlices = new Map();
  for (const f of fs.readdirSync(path.join(root, 'tests/unit')).filter((x) => x.endsWith('.js'))) {
    const text = fs.readFileSync(path.join(root, 'tests/unit', f), 'utf8');
    for (const m of text.matchAll(/(?:extractLegacyFunction|sliceBalancedFunction)\([^'"`]*['"`]([A-Za-z_$][\w$]*)['"`]/g)) {
      unitSlices.set(m[1], (unitSlices.get(m[1]) || 0) + 1);
    }
  }
  // Names a module also exports: the "existing duplicates" 70A must list,
  // since the plan allows one implementation per concern.
  const exportedBy = new Map();
  for (const file of audit.files.filter((f) => f !== legacyRel && !audit.classic.includes(f))) {
    const ast = parse(fs.readFileSync(path.join(root, file), 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
    for (const st of ast.body) {
      if (st.type !== 'ExportNamedDeclaration') continue;
      const names = [];
      if (st.declaration?.id) names.push(st.declaration.id.name);
      for (const d of st.declaration?.declarations || []) if (d.id.type === 'Identifier') names.push(d.id.name);
      for (const sp of st.specifiers || []) names.push(sp.exported.name ?? sp.exported.value);
      for (const n of names) { if (!exportedBy.has(n)) exportedBy.set(n, []); exportedBy.get(n).push(file); }
    }
  }
  const consumers = new Map();
  const note = (name, file) => { if (file === legacyRel) return; if (!consumers.has(name)) consumers.set(name, new Set()); consumers.get(name).add(file); };
  for (const r of [...audit.windowReads, ...audit.windowDestructures]) note(r.name, r.file);
  for (const b of audit.bareCrossBoundary) note(b.name, b.file);

  const declared = declarationsOf(source);
  const placed = declared.map((d) => {
    const section = [...sections].reverse().find((s) => s.line <= d.line) || { title: '(before the first section)', delivery: '70B' };
    const moduleConsumers = [...(consumers.get(d.name) || [])].sort();
    const e2eFiles = e2e[d.name]?.files || 0;
    const slices = unitSlices.get(d.name) || 0;
    let disposition = 'move';
    if (d.internalRefs === 0 && moduleConsumers.length === 0) disposition = e2eFiles || slices ? 'test-only' : 'delete-as-dead';
    let delivery = NAME_DELIVERY[d.name] || section.delivery;
    const override = review.overrides[d.name];
    if (override) {
      disposition = override.disposition || disposition;
      delivery = override.delivery || delivery;
    }
    // A wrapper sits in the monolith's wrapper block, whatever section its
    // implementation came from, so its section says nothing: where it moved
    // is what the review recorded for it.
    if (d.forwarder && !override && /^move 70[A-L]$/.test(review.confirmed[d.name] || '')) {
      delivery = review.confirmed[d.name].split(' ')[1];
    }
    const reviewed = !!override || review.confirmed[d.name] === `${disposition} ${delivery}`;
    return {
      name: d.name, kind: d.kind, line: d.line, lines: d.lines, section: section.title,
      internalRefs: d.internalRefs, moduleConsumers, e2eFiles, unitSlices: slices,
      duplicateOf: exportedBy.get(d.name) || [],
      disposition, delivery,
      wrapperWhile: disposition === 'move' && moduleConsumers.length ? 'modules read it through window or by bare name' : null,
      reviewed,
      reviewNote: override ? review.why[override.why] : review.notes[d.name] || null,
      forwarder: d.forwarder, callers: d.callers,
    };
  });
  // A forwarder's implementation has moved; it stays only for its callers.
  const deliveryOf = new Map(placed.map((d) => [d.name, d.delivery]));
  const latest = (list) => list.reduce((a, b) => (DELIVERIES.indexOf(b) > DELIVERIES.indexOf(a) ? b : a));
  const declarations = placed.map(({ forwarder, callers, ...d }) => {
    if (!forwarder || d.disposition !== 'move') return d;
    const targets = callers.map((c) => (c === '(top level)' ? '70L' : deliveryOf.get(c)));
    // With no classic caller left, a forwarder stays only as the delegating
    // dispatcher a module still reads off window (70D's getWardProgress() for
    // the dashboard); the owner's review names when that read goes (`until`).
    const until = review.overrides[d.name]?.until;
    return {
      ...d,
      disposition: 'wrapper',
      movedIn: d.delivery,
      delivery: targets.length ? latest(targets) : until || d.delivery,
      wrapperWhile: targets.length || !d.moduleConsumers.length
        ? `classic callers remain: ${callers.join(', ')}`
        : `modules read it through window: ${d.moduleConsumers.join(', ')}`,
    };
  });
  // Every window publication with the consumers that actually read it. A
  // comment's stated reason for an export is not evidence it is still needed
  // (the 70A baseline found exports kept "so onclick=... resolves" long
  // after no such attribute remained); this is the evidence.
  const readersOf = new Map();
  const addReader = (name, file) => { if (!readersOf.has(name)) readersOf.set(name, new Set()); readersOf.get(name).add(file); };
  for (const r of [...audit.windowReads, ...audit.windowDestructures]) addReader(r.name, r.file);
  for (const bref of audit.bareCrossBoundary) addReader(bref.name, bref.file);
  const unreachable = new Set(audit.unreachableModules);
  const exportKeys = new Map();
  for (const w of audit.windowWrites) {
    const key = `${w.file}::${w.name}`;
    if (exportKeys.has(key)) continue;
    const readers = [...(readersOf.get(w.name) || [])].filter((f) => f !== w.file).sort();
    const e2eFiles = e2e[w.name]?.files || 0;
    let reason;
    if (unreachable.has(w.file)) reason = 'publisher-never-loaded';
    else if (readers.some((f) => f === legacyRel)) reason = readers.length > 1 ? 'monolith-and-modules' : 'monolith-only';
    else if (readers.length) reason = 'modules-only';
    else if (e2eFiles) reason = 'tests-only';
    else reason = 'no-consumer';
    exportKeys.set(key, { file: w.file, name: w.name, via: w.via || 'assignment', readers, e2eFiles, reason });
  }
  const windowExports = [...exportKeys.values()].sort((x, y) => x.file.localeCompare(y.file) || x.name.localeCompare(y.name));

  const summary = {
    total: declarations.length, byDisposition: {}, byDelivery: {},
    windowExportsByReason: windowExports.reduce((acc, x) => ({ ...acc, [x.reason]: (acc[x.reason] || 0) + 1 }), {}),
    duplicates: declarations.filter((d) => d.duplicateOf.length).length,
    liveDuplicates: declarations.filter((d) => d.duplicateOf.length && d.disposition === 'move').map((d) => `${d.name} (${d.duplicateOf.join(', ')})`),
  };
  for (const d of declarations) {
    summary.byDisposition[d.disposition] = (summary.byDisposition[d.disposition] || 0) + 1;
    summary.byDelivery[d.delivery] = (summary.byDelivery[d.delivery] || 0) + 1;
  }
  return { summary, declarations, windowExports };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildDispositions();
  console.log(JSON.stringify(result.summary, null, 1));
  const dead = result.declarations.filter((d) => d.disposition === 'delete-as-dead');
  console.log(`delete-as-dead candidates (${dead.length}):`, dead.map((d) => `${d.name}@${d.line}`).join(' '));
  const noConsumer = result.windowExports.filter((x) => x.reason === 'no-consumer');
  console.log(`window exports with no consumer (${noConsumer.length}):`, noConsumer.map((x) => `${x.file.replace('src/', '')}::${x.name}`).join(' '));
  const testOnly = result.declarations.filter((d) => d.disposition === 'test-only');
  console.log(`test-only (${testOnly.length}):`, testOnly.map((d) => d.name).join(' '));
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(ROOT, DISPOSITIONS_PATH), JSON.stringify({
      generatedBy: 'node scripts/ms70-declaration-dispositions.mjs --write',
      note: "Milestone 70, 70A: a disposition and target delivery for every top-level declaration of src/legacy-app.js, built from reference evidence and corrected by the owner's review (tests/baseline/ms70-declaration-review.json; reviewNote says why an entry was moved). reviewed:true means the entry still matches what the review confirmed. delete-as-dead means nothing references it anywhere.",
      ...result,
    }, null, 1) + '\n');
    console.log(`wrote ${DISPOSITIONS_PATH}`);
  }
}
