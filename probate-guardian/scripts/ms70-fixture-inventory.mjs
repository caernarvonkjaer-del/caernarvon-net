// Milestone 70, 70A: "Inventory all E2E fixture helpers and factories,
// especially tests/e2e/support/fixture-completeness.ts, plan-fixture.ts,
// every fillMinimalValid*Ward(), BASELINE, and form-specific factory." 70C
// moves the application's blank-filing factories and normalizers; AGENTS.md
// section 8.3 requires every fixture that mirrors them to change in the same
// commit. This lists what the browser support layer exports and which specs
// use each export, so that audit starts from a complete list.
//
// Usage: node scripts/ms70-fixture-inventory.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { transformWithOxc } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE_INVENTORY_PATH = 'tests/baseline/ms70-fixture-inventory.json';

async function toAst(file, source) {
  const js = /\.tsx?$/.test(file) ? (await transformWithOxc(source, file, { lang: 'ts' })).code : source;
  return parse(js, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true });
}

/** Exported names of one module: [{ name, kind }]. */
export async function exportsOf(file, source) {
  const ast = await toAst(file, source);
  const out = [];
  for (const st of ast.body) {
    if (st.type !== 'ExportNamedDeclaration') continue;
    const d = st.declaration;
    if (d?.type === 'FunctionDeclaration') out.push({ name: d.id.name, kind: 'function' });
    else if (d?.type === 'VariableDeclaration') for (const v of d.declarations) if (v.id.type === 'Identifier') out.push({ name: v.id.name, kind: v.init && /Function/.test(v.init.type) ? 'function' : 'value' });
    else if (d?.type === 'ClassDeclaration') out.push({ name: d.id.name, kind: 'class' });
    for (const sp of st.specifiers || []) out.push({ name: sp.exported.name ?? sp.exported.value, kind: 're-export' });
  }
  return out;
}

/** Names a spec imports from the support layer. */
export async function supportImportsOf(file, source) {
  const ast = await toAst(file, source);
  const out = [];
  for (const st of ast.body) {
    if (st.type !== 'ImportDeclaration' || !/\/support\//.test(st.source.value)) continue;
    const mod = path.posix.basename(st.source.value).replace(/\.(ts|js)$/, '');
    for (const sp of st.specifiers) if (sp.type === 'ImportSpecifier') out.push({ module: mod, name: sp.imported.name ?? sp.imported.value });
  }
  return out;
}

export async function buildFixtureInventory(root = ROOT) {
  const supportDir = path.join(root, 'tests/e2e/support');
  const modules = {};
  for (const f of fs.readdirSync(supportDir).filter((x) => /\.(ts|js)$/.test(x)).sort()) {
    modules[f.replace(/\.(ts|js)$/, '')] = { file: `tests/e2e/support/${f}`, exports: await exportsOf(f, fs.readFileSync(path.join(supportDir, f), 'utf8')) };
  }
  const usage = {};
  const specs = fs.readdirSync(path.join(root, 'tests/e2e')).filter((x) => x.endsWith('.spec.ts')).sort();
  for (const spec of specs) {
    for (const imp of await supportImportsOf(spec, fs.readFileSync(path.join(root, 'tests/e2e', spec), 'utf8'))) {
      const key = `${imp.module}::${imp.name}`;
      (usage[key] ||= []).push(spec);
    }
  }
  const helpers = [];
  for (const [mod, m] of Object.entries(modules)) {
    for (const e of m.exports) {
      const users = usage[`${mod}::${e.name}`] || [];
      helpers.push({
        module: m.file, name: e.name, kind: e.kind, specFiles: users.length,
        // Factories and shared fixture builders: what must change when 70C's
        // application factories do (plan-fixture.ts's registerPlanMountTests
        // and filing-matrix.ts's FILING_MATRIX included).
        factory: /^(fillMinimalValid\w*Ward|MINIMAL_VALID_\w+|BASELINE\w*|\w*Fixture\w*|\w*[Dd]efaults?|register\w*Tests|FILING_MATRIX)$/.test(e.name),
      });
    }
  }
  const factories = helpers.filter((h) => h.factory);
  return {
    summary: { supportModules: Object.keys(modules).length, exports: helpers.length, factories: factories.length, unusedExports: helpers.filter((h) => !h.specFiles).map((h) => `${path.posix.basename(h.module)}::${h.name}`) },
    factories: factories.map((h) => `${path.posix.basename(h.module)}::${h.name} (${h.specFiles} specs)`),
    helpers,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inv = await buildFixtureInventory();
  console.log(JSON.stringify(inv.summary, null, 1));
  console.log('factories:', inv.factories.join('; '));
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(ROOT, FIXTURE_INVENTORY_PATH), JSON.stringify({
      generatedBy: 'node scripts/ms70-fixture-inventory.mjs --write',
      note: 'Milestone 70, 70A: every export of the browser test support layer, which specs use it, and which are fixture factories that must change with the application factories 70C moves (AGENTS.md section 8.3). Informational.',
      ...inv,
    }, null, 1) + '\n');
    console.log(`wrote ${FIXTURE_INVENTORY_PATH}`);
  }
}
