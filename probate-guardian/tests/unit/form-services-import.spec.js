import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { parse } from 'acorn';

// Milestone 70, 70F gate: "All filing mount contracts and the shared
// form-entry/navigation contracts pass with no feature importing form services
// from window." The form services are the shared form runtime's modules --
// src/core/form/, the sidebar marks, validation, schedule documents, the
// Print Preview pager, the Excel capacity panel and the Initial Inventory's
// binding engine; a feature imports what it uses of them. (The browser
// contracts themselves are the e2e suite's.)

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (f) => path.relative(root, f).split(path.sep).join('/');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name))
  : /\.js$/.test(e.name) ? [path.join(dir, e.name)] : []));
const parseModule = (f) => parse(fs.readFileSync(f, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module', locations: true });

const SERVICE_MODULES = [
  ...walk(path.join(root, 'src/core/form')).map(rel),
  'src/core/status/nav-marks.js',
  ...walk(path.join(root, 'src/core/validation')).map(rel),
  'src/core/filing/schedule-docs.js',
  'src/core/filing/schedule-doc-ack.js',
  'src/core/ui/print-pager.js',
  'src/core/excel/excel-capacity.js',
  'src/features/guardian-inventory/form-binding.js',
];

/** Every name a form-service module exports, and which module. */
function serviceNames() {
  const names = new Map();
  for (const r of SERVICE_MODULES) {
    for (const st of parseModule(path.join(root, r)).body) {
      if (st.type !== 'ExportNamedDeclaration') continue;
      const d = st.declaration;
      if (d?.id) names.set(d.id.name, r);
      for (const x of d?.declarations || []) if (x.id.type === 'Identifier') names.set(x.id.name, r);
      for (const s of st.specifiers || []) names.set(s.exported.name, r);
    }
  }
  return names;
}

describe('features import the form services they use', () => {
  test('no feature reads a form service off window, by member or by a destructure', () => {
    const names = serviceNames();
    expect(names.size, 'the form services were found').toBeGreaterThan(100);
    const features = walk(path.join(root, 'src/features'));
    expect(features.length).toBeGreaterThan(20);
    const offenders = [];
    for (const f of features) {
      (function visit(n) {
        if (!n || typeof n.type !== 'string') return;
        if (n.type === 'MemberExpression' && n.object.type === 'Identifier' && n.object.name === 'window') {
          const name = n.computed ? (n.property.type === 'Literal' ? n.property.value : null) : n.property.name;
          if (names.has(name)) offenders.push(`${rel(f)}:${n.loc.start.line} window.${name} (${names.get(name)})`);
        }
        if (n.type === 'VariableDeclarator' && n.init?.type === 'Identifier' && n.init.name === 'window' && n.id.type === 'ObjectPattern') {
          for (const p of n.id.properties) {
            if (p.type === 'Property' && !p.computed && names.has(p.key.name)) offenders.push(`${rel(f)}:${p.loc.start.line} { ${p.key.name} } = window (${names.get(p.key.name)})`);
          }
        }
        for (const k of Object.keys(n)) {
          const c = n[k];
          if (Array.isArray(c)) c.forEach(visit); else if (c && typeof c.type === 'string') visit(c);
        }
      })(parseModule(f));
    }
    expect(offenders, 'import it from its module').toEqual([]);
  }, 60_000);
});
