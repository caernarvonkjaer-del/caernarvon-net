// Milestone 74I: the Inventory's witnesses, said accurately (decisions 74I-1
// and 74I-2, the requester, 2026-10-06; QA report BUG-15). Section
// 744.365(5)(b) has the guardian identify the witness or witnesses "if any";
// so no witness is required, and a witness card the filer started is
// complete -- its name, address and occupation -- an ordinary error the
// filer can override. An untouched card raises nothing and is dropped as
// before; listed witnesses keep printing (decision 2). Before: the Cover said
// witnesses "must" be listed, starred every box, and passed a half-filled
// card without a word.
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { collectGuardianIssues } from '../../src/core/validation/engines/guardian.js';
import { initializeEmptyData } from '../../src/core/filing/filing-registry.js';

const json = (x) => JSON.parse(JSON.stringify(x));
const inventory = (witnesses) => ({ ...json(initializeEmptyData('guardian')), inventoryType: 'guardian', witnesses });
const witnessIssues = (d) => collectGuardianIssues(d).filter((i) => String(i.path || '').startsWith('witnesses.'))
  .map((i) => [i.message, i.path]);

describe("the Inventory's witnesses", () => {
  test('no witness, or an untouched card, asks for nothing', () => {
    expect(witnessIssues(inventory([]))).toEqual([]);
    expect(witnessIssues(inventory([{ name: '', address: '', occupation: '' }]))).toEqual([]);
  });

  test('a started card names each box still empty, on its own path', () => {
    expect(witnessIssues(inventory([
      { name: 'Jane Witness', address: '', occupation: '' },
      { name: 'Ann Complete', address: '1 Main St, Clearwater, FL', occupation: 'Notary' },
      { name: '', address: '', occupation: 'Neighbor' },
    ]))).toEqual([
      ['Cover — Inventory Witness 1 — Address is required.', 'witnesses.0.address'],
      ['Cover — Inventory Witness 1 — Occupation is required.', 'witnesses.0.occupation'],
      ['Cover — Inventory Witness 3 — Name is required.', 'witnesses.2.name'],
      ['Cover — Inventory Witness 3 — Address is required.', 'witnesses.2.address'],
    ]);
  });

  test('the errors can be overridden', () => {
    const [issue] = collectGuardianIssues(inventory([{ name: 'Jane Witness', address: '', occupation: '' }])).filter((i) => i.path === 'witnesses.0.address');
    expect(issue.bypassable).toBe(true);
  });

  test("the Cover quotes the statute instead of saying witnesses must be listed, and stars a card's boxes only once it is started", () => {
    const page = readFileSync('src/features/guardian-inventory/index.js', 'utf8');
    expect(page).not.toContain('A personal property inventory must include the names, addresses, and occupations of witnesses');
    expect(page).toContain('"As part of the substantiating papers, the guardian must identify by name, address, and occupation, the witness or witnesses, if any, who were present during the initial inventory of the ward\'s personal property."');
    expect(page).not.toMatch(/reqLabel\('(Name|Address|Occupation)'\)\+textInput\(`witnesses\./);
  });
});
