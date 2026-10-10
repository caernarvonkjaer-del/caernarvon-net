// Milestone 73R part 2 (R2): "GF" for "PG" -- Guardian Forms, not the old
// project name -- on the sidebar's shield, the Terms of Use dialog, the
// guide's header and the app icons (decision 73R-4: the requester approved
// icon B, today's square with the sidebar's shield and "GF", 2026-10-09). The
// internal `pg-` names stay (renaming the theme key would reset every filer's
// light/dark choice once).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const png = (rel) => {
  const b = fs.readFileSync(path.join(ROOT, rel));
  return { signature: b.subarray(1, 4).toString('latin1'), width: b.readUInt32BE(16), height: b.readUInt32BE(20), bytes: b.length };
};

describe('73R part 2: the letters are GF', () => {
  it('the sidebar shield, the Terms of Use dialog and the guide\'s header say GF, nowhere PG', () => {
    const app = read('index.html');
    expect(app).toContain('<span class="initials">GF</span>');
    expect(app).toContain('<span class="pg-terms-logo" aria-hidden="true">GF</span>');
    expect(read('help/index.html')).toContain('<div class="pg">GF</div>');
    for (const rel of ['index.html', 'help/index.html']) expect(read(rel), rel).not.toMatch(/>PG</);
  });

  it('the app icons are the approved PNGs, at the sizes the manifest names', () => {
    const manifest = JSON.parse(read('manifest.json'));
    const sizes = Object.fromEntries(manifest.icons.map((i) => [i.src, i.sizes]));
    expect(sizes).toMatchObject({ 'icons/icon-192.png': '192x192', 'icons/icon-512.png': '512x512' });
    expect(png('icons/icon-192.png')).toMatchObject({ signature: 'PNG', width: 192, height: 192 });
    expect(png('icons/icon-512.png')).toMatchObject({ signature: 'PNG', width: 512, height: 512 });
    // The PG icons were 3,603 and 10,290 bytes; the GF shield icons are not those files.
    expect([png('icons/icon-192.png').bytes, png('icons/icon-512.png').bytes]).not.toEqual([3603, 10290]);
  });
});
