// Milestone 38D / 44B: Excel Capacity Issues and Parity Unit Tests
import { describe, it, expect } from 'vitest';

globalThis.window = globalThis.window || {};
// guardianHasAnyData used to be stubbed onto window here: Simplified's
// excel.js read it off window at import time. Since Milestone 70's 70B it
// imports the real one from src/core/validation/row-started.js.

const { checkExcelCapacity, getExcelCapacityIssues } = await import('../../src/core/excel/excel-capacity.js');
const { GUARDIAN_EXCEL_CAPS } = await import('../../src/features/guardian-inventory/excel.js');
const { SIMPLIFIED_EXCEL_CAPS } = await import('../../src/features/simplified-accounting/excel.js');
const { ANNUAL_EXCEL_CAPS } = await import('../../src/features/annual-accounting/excel.js');

describe('Excel capacity parity — Guardian Inventory (11 schedules)', () => {
  it('passes when every schedule is exactly at capacity', () => {
    const data = { inventoryType: 'guardian' };
    for (const [key, info] of Object.entries(GUARDIAN_EXCEL_CAPS)) {
      data[key] = Array.from({ length: info.cap }, (_, i) => ({ id: `${key}-${i}` }));
    }

    const over = checkExcelCapacity(GUARDIAN_EXCEL_CAPS, data);
    expect(over).toHaveLength(0);

    const issues = getExcelCapacityIssues('guardian', data, GUARDIAN_EXCEL_CAPS);
    expect(issues).toHaveLength(0);
  });

  it('blocks and creates typed capacity issues for each schedule at cap + 1', () => {
    for (const [key, info] of Object.entries(GUARDIAN_EXCEL_CAPS)) {
      const data = {
        inventoryType: 'guardian',
        [key]: Array.from({ length: info.cap + 1 }, (_, i) => ({ id: `${key}-${i}` })),
      };

      const over = checkExcelCapacity(GUARDIAN_EXCEL_CAPS, data);
      expect(over, `Overage for ${key}`).toHaveLength(1);
      expect(over[0]).toMatchObject({
        key,
        label: info.label,
        route: info.route,
        cap: info.cap,
        count: info.cap + 1,
      });

      const issues = getExcelCapacityIssues('guardian', data, GUARDIAN_EXCEL_CAPS);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        code: `excel.capacity.guardian.${key}`,
        category: 'capacity',
        bypassable: false,
        capabilities: ['excel'],
        path: key,
        route: info.route,
      });
      expect(issues[0].message).toContain(`${info.label}: ${info.cap + 1} entries`);
    }
  });
});

describe('Excel capacity parity — Simplified Accounting (guardians & remuneration)', () => {
  it('evaluates populated guardians using guardianHasAnyData predicate', () => {
    const data = {
      inventoryType: 'simplified',
      guardians: [
        { name: 'G1' },
        { name: 'G2' },
        { name: 'G3' },
        { name: '' }, // blank guardian does not consume slot
      ],
    };

    // cap is 3; 3 populated + 1 blank = 3 counted <= cap 3
    const over = checkExcelCapacity(SIMPLIFIED_EXCEL_CAPS, data);
    expect(over).toHaveLength(0);

    // 4 populated > cap 3
    data.guardians[3].name = 'G4';
    const over4 = checkExcelCapacity(SIMPLIFIED_EXCEL_CAPS, data);
    expect(over4).toHaveLength(1);
    expect(over4[0].key).toBe('guardians');

    const issues = getExcelCapacityIssues('simplified', data, SIMPLIFIED_EXCEL_CAPS);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('excel.capacity.simplified.guardians');
    expect(issues[0].bypassable).toBe(false);
    expect(issues[0].capabilities).toEqual(['excel']);
  });

  it('filters empty remuneration rows before capacity check', () => {
    const data = {
      inventoryType: 'simplified',
      remuneration: [
        ...Array.from({ length: 27 }, (_, i) => ({ description: `Item ${i}`, amount: 100 })),
        null,
        {},
        { description: '' }, // 3 blank items ignored
      ],
    };

    // cap is 27, 27 populated items -> passes
    expect(checkExcelCapacity(SIMPLIFIED_EXCEL_CAPS, data)).toHaveLength(0);

    // 28 populated items -> fails
    data.remuneration.push({ description: 'Extra Item', amount: 50 });
    const over = checkExcelCapacity(SIMPLIFIED_EXCEL_CAPS, data);
    expect(over).toHaveLength(1);
    expect(over[0].count).toBe(28);

    const issues = getExcelCapacityIssues('simplified', data, SIMPLIFIED_EXCEL_CAPS);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('excel.capacity.simplified.remuneration');
    expect(issues[0].bypassable).toBe(false);
  });
});

describe('Excel capacity parity — Annual Accounting (15 schedules)', () => {
  it('passes when every schedule is at capacity', () => {
    const data = { inventoryType: 'annual' };
    for (const [key, info] of Object.entries(ANNUAL_EXCEL_CAPS)) {
      data[key] = Array.from({ length: info.cap }, (_, i) => ({ id: `${key}-${i}`, description: 'Populated' }));
    }

    const over = checkExcelCapacity(ANNUAL_EXCEL_CAPS, data);
    expect(over).toHaveLength(0);
  });

  it('blocks and creates typed capacity issues for each of the 15 schedules at cap + 1', () => {
    for (const [key, info] of Object.entries(ANNUAL_EXCEL_CAPS)) {
      const data = {
        inventoryType: 'annual',
        [key]: Array.from({ length: info.cap + 1 }, (_, i) => ({ id: `${key}-${i}`, description: 'Populated' })),
      };

      const over = checkExcelCapacity(ANNUAL_EXCEL_CAPS, data);
      expect(over, `Overage for ${key}`).toHaveLength(1);
      expect(over[0].cap).toBe(info.cap);
      expect(over[0].count).toBe(info.cap + 1);

      const issues = getExcelCapacityIssues('annual', data, ANNUAL_EXCEL_CAPS);
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(`excel.capacity.annual.${key}`);
      expect(issues[0].bypassable).toBe(false);
      expect(issues[0].capabilities).toEqual(['excel']);
    }
  });

  it('supports finalAccounting and trustAccounting descriptor types', () => {
    const data = {
      inventoryType: 'finalAccounting',
      schA: Array.from({ length: ANNUAL_EXCEL_CAPS.schA.cap + 1 }, () => ({ amount: 10 })),
    };

    const issues = getExcelCapacityIssues('finalAccounting', data, ANNUAL_EXCEL_CAPS);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('excel.capacity.finalAccounting.schA');
    expect(issues[0].capabilities).toEqual(['excel']);
  });
});
