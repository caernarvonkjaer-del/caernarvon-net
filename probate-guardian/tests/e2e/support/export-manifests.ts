// Milestone 72A. Every box each Excel exporter writes, with the filing field
// that fills it -- the export guard's manifest (tests/e2e/excel-form-field-
// placement.spec.ts reads it; support/workbook-vs-template.ts checks it).
//
// WHERE THE ADDRESSES COME FROM. Each one was read from the Clerk's workbook
// (templates/<form>-template.js) with a parser, not copied from an exporter:
//   - one-off boxes: the box beneath or beside the caption that names the
//     field (checked caption by caption when 72A was built);
//   - schedule rows: the rows each page's own total adds up, which are also
//     the rows carrying a printed Line # wherever the page prints one (two
//     Inventory pages print irregular numbers -- B-1 page 1 none, B-2 page 1
//     "2-7" -- so a row's place is its position, never its printed number);
//   - schedule columns: the column under the header caption that names the
//     field, and for a multi-line entry the line the form's own printed
//     instructions give it.
// So a value the exporter puts in the wrong box fails here even when the
// exporter and its own tables agree with each other.
//
// VALUES. Each box gets a value of its own type that survives the exporter
// unchanged and that no other box holds: money, a percentage (0-100, written
// as the fraction the workbook's % cells hold), a calendar day (an Excel
// serial in the file), text. A Yes/No or dropdown box can only hold one of a
// few answers, so those are listed as `finite` and the spec gives each one on
// a sheet its own sequence of answers over several exports.

import type { Expectation } from './workbook-vs-template';

export type Kind = 'text' | 'money' | 'pct' | 'date' | 'blank';
/**
 * A Yes/No or dropdown box. Milestone 73T part 2: a box that repeats another's
 * answer shares its path (and so its sequence of answers); `onlyIf` is a box
 * written only while another box holds a given answer, and empty otherwise.
 */
export type Finite = { sheet: string; cell: string; path: string; options: readonly string[]; onlyIf?: { path: string; equals: string } };
export type Manifest = { patch: Record<string, unknown>; expectations: Expectation[]; finite: Finite[] };

export const YES_NO = Object.freeze(['Yes', 'No']);
export const INDICATE_IF = Object.freeze(['Ward is totally incapacitated', 'Ward is under 14 years old', 'N/A']);
/** Schedule B-4's categories, exactly as the Annual workbook's summary formulas test for them. */
export const DISB_CATEGORIES = Object.freeze(['Accounting', 'Bank Service Charges', 'Care Facility', 'Clothing / Personal Needs', 'Entertainment / Travel', 'Food / Meals', 'Insurance: Automobile / Property', 'Insurance: Health / Life', 'Medical / Pharmacy', 'Mortgage', 'Nurse / Care Giver / Employer Tax', 'Other Legal Expenses', 'Rent', 'Repairs / Maintenance', 'Taxes: Income', 'Taxes: Intangible', 'Utilities', 'Other']);

const DAY = 86400000;
const EPOCH = Date.UTC(2001, 0, 1);

/** Hands out values no other box in the filing holds. */
class Values {
  private n = 0;
  /** [stored in the filing, expected in the cell] */
  next(kind: Kind): [unknown, string | number | null] {
    const n = ++this.n;
    switch (kind) {
      case 'text': { const t = `V${String(n).padStart(4, '0')}`; return [t, t]; }
      case 'money': { const m = 200000 + n + 0.25; return [m, m]; }
      case 'pct': { const p = Math.round((1 + (n % 9800) * 0.01) * 100) / 100; return [p, p / 100]; }
      case 'date': {
        const ms = EPOCH + n * DAY;
        return [new Date(ms).toISOString().slice(0, 10), ms / DAY + 25569];
      }
      case 'blank': return ['', null];
    }
  }
}

type Col = { field: string; col: string; line?: number; kind: Kind | 'finite'; options?: readonly string[] };
type Composite = { col: string; line?: number; fields: Array<[string, Kind]>; compose: (row: Record<string, any>) => string | number | null };
type SchedulePage = { sheet: string; rows: readonly number[] };

/** A step-r run of rows: first, first+step, ... (count of them). */
const run = (first: number, step: number, count: number) => Array.from({ length: count }, (_, i) => first + i * step);

class Builder {
  readonly patch: Record<string, unknown> = {};
  readonly expectations: Expectation[] = [];
  readonly finite: Finite[] = [];
  readonly values = new Values();

  /** Sets a dotted path ('guardians.1.name') in the patch, building objects and arrays. */
  set(dotted: string, value: unknown) {
    const keys = dotted.split('.');
    let t: any = this.patch;
    for (let i = 0; i < keys.length - 1; i++) {
      if (t[keys[i]] == null) t[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      t = t[keys[i]];
    }
    t[keys[keys.length - 1]] = value;
  }

  private readonly expectedByPath = new Map<string, string | number | null>();

  box(path: string, sheet: string, cell: string, kind: Kind) {
    const [stored, expected] = this.values.next(kind);
    if (kind !== 'blank') this.set(path, stored);
    this.expectedByPath.set(path, expected);
    this.expectations.push({ sheet, cell, value: expected, path });
  }

  /**
   * Milestone 72H: a second box the exporter fills from a field already
   * given a box -- the certificate of service's attorney is the filing's, so
   * the certificate's boxes repeat it. Expects the same value there.
   */
  alsoIn(path: string, sheet: string, cell: string) {
    if (!this.expectedByPath.has(path)) throw new Error(`alsoIn(${path}) before its box()`);
    this.expectations.push({ sheet, cell, value: this.expectedByPath.get(path) ?? null, path });
  }

  choice(path: string, sheet: string, cell: string, options: readonly string[], onlyIf?: Finite['onlyIf']) {
    this.finite.push({ sheet, cell, path, options, ...(onlyIf ? { onlyIf } : {}) });
  }

  /**
   * Milestone 73F part 3: a box that must hold a real value, not a probe --
   * the county has to be a Florida county, or every export of the filing
   * stops for an override. Expects the value as given.
   */
  named(path: string, sheet: string, cell: string, value: string) {
    this.set(path, value);
    this.expectedByPath.set(path, value);
    this.expectations.push({ sheet, cell, value, path });
  }

  /** A cell the exporter fills from something other than one field (the filing type, say). */
  fixed(path: string, sheet: string, cell: string, value: string | number | null) {
    this.expectations.push({ sheet, cell, value, path });
  }

  /**
   * Every slot of a paged schedule, row by row in page order. `start` is the
   * first row's index in the filing's array (Schedule B-4 fills it block by
   * block); `extra` is merged into every row.
   */
  schedule(key: string, pages: readonly SchedulePage[], cols: readonly Col[], composites: readonly Composite[] = [],
    { start = 0, extra = {} }: { start?: number; extra?: Record<string, unknown> } = {}) {
    let i = start;
    for (const p of pages) {
      for (const r of p.rows) {
        const row: Record<string, any> = {};
        for (const c of cols) {
          const cell = `${c.col}${r + (c.line ?? 0)}`;
          const path = `${key}.${i}.${c.field}`;
          if (c.kind === 'finite') { this.finite.push({ sheet: p.sheet, cell, path, options: c.options! }); continue; }
          const [stored, expected] = this.values.next(c.kind);
          if (c.kind !== 'blank') row[c.field] = stored;
          this.expectations.push({ sheet: p.sheet, cell, value: expected, path });
        }
        for (const x of composites) {
          for (const [f, kind] of x.fields) row[f] = this.values.next(kind)[0];
          this.expectations.push({ sheet: p.sheet, cell: `${x.col}${r + (x.line ?? 0)}`, value: x.compose(row), path: `${key}.${i}.${x.fields.map(([f]) => f).join('+')}` });
        }
        this.set(`${key}.${i}`, { ...extra, ...row });
        i++;
      }
    }
  }

  get(dotted: string): unknown {
    return dotted.split('.').reduce((v: any, k) => (v == null ? undefined : v[k]), this.patch);
  }

  done(): Manifest { return { patch: this.patch, expectations: this.expectations, finite: this.finite }; }
}

/** Sets a dotted path in a plain object, building objects and arrays along the way. */
export function setPath(target: Record<string, unknown>, dotted: string, value: unknown) {
  const keys = dotted.split('.');
  let t: any = target;
  for (let i = 0; i < keys.length - 1; i++) {
    if (t[keys[i]] == null) t[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    t = t[keys[i]];
  }
  t[keys[keys.length - 1]] = value;
}

// ── Yes/No and dropdown boxes: one sequence of answers per box ──────────────
//
// A box with m possible answers cannot hold a value of its own in one export,
// so two such boxes both holding "Yes" could be swapped and still look right.
// Over k exports each box gets its own code c, and in export v it holds the
// answer numbered floor(c / m^v) mod m: no two boxes of the same answer list
// on the same sheet share a sequence, so a swapped pair reads each other's
// sequence and fails. Boxes with different answer lists cannot be confused --
// a "Yes" in a ward-status box is wrong in every export. One code per group is
// skipped when its sequence would hold the template's own answer in every
// export: a box the exporter never wrote would then look written.

export type Coding = { runs: number; answer: (f: Finite, run: number) => string };

const groupOf = (f: Finite) => `${f.sheet}|${f.options.join('|')}`;

/** How many exports give every box its own sequence (at least one). */
export function codedRuns(finite: readonly Finite[]): number {
  const counts = new Map<string, { n: number; m: number }>();
  for (const f of finite) {
    const g = counts.get(groupOf(f)) ?? { n: 0, m: f.options.length };
    g.n++;
    counts.set(groupOf(f), g);
  }
  let runs = 1;
  for (const { n, m } of counts.values()) {
    let k = 1;
    while (m ** k < n + 1) k++; // +1: room for the one skipped code
    runs = Math.max(runs, k);
  }
  return runs;
}

/** Each box's code, given what the template itself holds in each box. */
export function codeFinite(finite: readonly Finite[], templateHolds: (f: Finite) => string | number | null): Coding {
  const runs = codedRuns(finite);
  const code = new Map<string, number>();
  const next = new Map<string, number>();
  const byPath = new Map<string, number>();
  const digit = (c: number, m: number, v: number) => Math.floor(c / m ** v) % m;
  for (const f of finite) {
    // A box repeating another's answer (the same path) takes its code.
    if (byPath.has(f.path)) { code.set(`${f.sheet}!${f.cell}`, byPath.get(f.path)!); continue; }
    const m = f.options.length;
    const held = templateHolds(f);
    let c = next.get(groupOf(f)) ?? 0;
    // Skip a code whose answer would equal the template's own in every export.
    while (held !== null && Array.from({ length: runs }, (_, v) => f.options[digit(c, m, v)]).every((a) => a === held)) c++;
    code.set(`${f.sheet}!${f.cell}`, c);
    byPath.set(f.path, c);
    next.set(groupOf(f), c + 1);
  }
  return {
    runs,
    answer: (f, run) => f.options[digit(code.get(`${f.sheet}!${f.cell}`)!, f.options.length, run)],
  };
}

/** What a Yes/No or dropdown box holds in export `run`: its answer, or empty while its `onlyIf` box holds another. */
export function finiteExpected(finite: readonly Finite[], coding: Coding, f: Finite, run: number): string | null {
  if (f.onlyIf) {
    const control = finite.find((x) => x.path === f.onlyIf!.path);
    if (control && coding.answer(control, run) !== f.onlyIf.equals) return null;
  }
  return coding.answer(f, run);
}

// ── Initial Inventory (templates/guardian-template.js) ───────────────────────

const INV_PAGES: Record<string, SchedulePage[]> = {
  scheduleA1: [{ sheet: 'A-1-REAL ESTATE pg 1', rows: run(27, 5, 4) }, { sheet: 'A-1-REAL ESTATE pg 2', rows: run(7, 5, 8) }, { sheet: 'A-1-REAL ESTATE pg 3', rows: run(7, 5, 8) }],
  scheduleA2: [{ sheet: 'A-2-REAL ESTATE MTG pg 1 ', rows: run(30, 5, 5) }, { sheet: 'A-2-REAL ESTATE MTG pg 2', rows: run(7, 5, 9) }, { sheet: 'A-2-REAL ESTATE MTG pg 3', rows: run(7, 5, 10) }],
  scheduleB1: [{ sheet: 'B-1 CASH pg 1', rows: run(25, 5, 6) }, ...[2, 3, 4].map((n) => ({ sheet: `B-1 CASH pg ${n}`, rows: run(7, 5, 10) }))],
  scheduleB2: [{ sheet: 'B-2 PER PROP pg 1', rows: run(33, 5, 6) }, ...[2, 3, 4].map((n) => ({ sheet: `B-2 PER PROP pg ${n}`, rows: run(7, 5, 11) }))],
  scheduleB3: [{ sheet: 'B-3 INTANGIBLE pg 1;', rows: run(22, 5, 9) }, { sheet: 'B-3 INTANGIBLE pg 2', rows: run(7, 5, 11) }],
  scheduleB4: [{ sheet: 'B-4 PERS PROP LIAB pg 1', rows: run(23, 5, 6) }, ...[2, 3, 4].map((n) => ({ sheet: `B-4 PERS PROP LIAB pg ${n}`, rows: run(8, 5, 9) }))],
  scheduleC1: [{ sheet: 'C-1 INCOME pg 1', rows: run(29, 5, 5) }, { sheet: 'C-1 INCOME pg 2', rows: run(7, 5, 9) }, { sheet: 'C-1 INCOME pg 3', rows: run(7, 5, 9) }],
  scheduleC2: [{ sheet: 'C-2 LAWSUIT AGAINST 1', rows: run(19, 5, 6) }, { sheet: 'C-2 LAWSUIT AGAINST pg 2', rows: run(7, 5, 7) }],
  scheduleC3: [{ sheet: 'C-3 LAWSUIT BY WARD pg 1', rows: run(20, 5, 6) }, { sheet: 'C-3 LAWSUIT BY WARD pg 2', rows: run(7, 5, 8) }],
  scheduleC4: [{ sheet: 'C-4 TRUSTS pg 1', rows: run(23, 5, 7) }, { sheet: 'C-4 TRUSTS pg 2', rows: run(7, 5, 9) }],
  scheduleC5: [{ sheet: 'C-5 JOINT OWNERS pg 1 ', rows: run(19, 5, 7) }, { sheet: 'C-5 JOINT OWNERS pg 2', rows: run(7, 5, 8) }, { sheet: 'C-5 JOINT OWNERS pg 3', rows: run(7, 5, 8) }],
};

export function inventoryManifest(): Manifest {
  const b = new Builder();
  const SI = 'SUMMARY I ';
  b.box('wardName', SI, 'C7', 'text'); b.box('caseNumber', SI, 'H7', 'text'); b.box('gid', SI, 'F7', 'date');
  b.named('county', SI, 'G3', 'Pinellas'); b.box('guardianName', SI, 'D23', 'text'); b.box('attorneyForGuardian', SI, 'D24', 'text');
  b.box('typeOfGuardianship', SI, 'D25', 'text');
  // Milestone 73T part 2 (row 15): "Inventory filed?" is written only when the
  // ward has a box, and empty otherwise -- the Clerk's form pre-fills it "Yes".
  b.choice('hasSafeDepositBox', SI, 'D26', YES_NO);
  b.choice('safeDepositBoxFiled', SI, 'H26', YES_NO, { path: 'hasSafeDepositBox', equals: 'Yes' });
  b.choice('amendedForm', SI, 'I8', YES_NO);

  // PART III: captions on rows 7/13/19 (+2, +4), each box on the row beneath.
  // Guardian #1's name box F8 is the form's link to the Cover, written over by decision.
  [7, 13, 19].forEach((r, i) => {
    const g = `guardians.${i}`;
    b.box(`${g}.signatureDate`, 'PART III', `D${r + 1}`, 'date'); b.box(`${g}.name`, 'PART III', `F${r + 1}`, 'text');
    b.box(`${g}.ssnEin`, 'PART III', `B${r + 3}`, 'text'); b.box(`${g}.streetAddress`, 'PART III', `F${r + 3}`, 'text');
    b.box(`${g}.phone`, 'PART III', `B${r + 5}`, 'text'); b.box(`${g}.cityStateZip`, 'PART III', `F${r + 5}`, 'text');
  });

  // PART IV: the compilation date beneath its "Date" caption; the preparer and
  // attorney blocks, each box the row beneath its caption.
  b.box('preparer.asOfDate', 'PART IV', 'H9', 'date'); b.box('preparer.signatureDate', 'PART IV', 'G13', 'date');
  b.box('preparer.name', 'PART IV', 'I13', 'text'); b.box('preparer.ssnEin', 'PART IV', 'B15', 'text');
  b.box('preparer.streetAddress', 'PART IV', 'I15', 'text'); b.box('preparer.phone', 'PART IV', 'B17', 'text');
  b.box('preparer.cityStateZip', 'PART IV', 'I17', 'text');
  b.box('attorney.filingDate', 'PART IV', 'C21', 'date'); b.box('attorney.signatureDate', 'PART IV', 'G26', 'date');
  b.box('attorney.barNumber', 'PART IV', 'B28', 'text'); b.box('attorney.streetAddress', 'PART IV', 'I28', 'text');
  b.box('attorney.phone', 'PART IV', 'B30', 'text'); b.box('attorney.cityStateZip', 'PART IV', 'I30', 'text');

  // PART V: the safe-deposit question (row 15: the app's D-3 asks it in Part
  // V's words), the bond block and the waiver order date. Milestone 73T part 2
  // (row 16): the block shows what the arrangement shows -- this filing's is
  // "bond only" (fixtures.ts), so the waiver date box stays empty.
  b.choice('hasSafeDepositBox', 'PART V', 'H12', YES_NO);
  b.box('bondAmount', 'PART V', 'G26', 'money'); b.box('bondPeriodFrom', 'PART V', 'E27', 'date');
  b.box('bondPeriodTo', 'PART V', 'G27', 'date'); b.box('bondingCompany', 'PART V', 'D28', 'text');
  b.box('bondWaivedDate', 'PART V', 'G15', 'blank');

  // PART VI: four recipient blocks, then the certificate's own boxes.
  ([['B', 13], ['H', 13], ['B', 19], ['H', 19]] as const).forEach(([c, r], i) => {
    b.box(`serviceRecipients.${i}.name`, 'PART VI', `${c}${r}`, 'text');
    b.box(`serviceRecipients.${i}.address`, 'PART VI', `${c}${r + 1}`, 'text');
    b.box(`serviceRecipients.${i}.cityStateZip`, 'PART VI', `${c}${r + 2}`, 'text');
  });
  b.box('serviceDate', 'PART VI', 'G25', 'date');
  b.choice('serviceIndicateIf', 'PART VI', 'J25', INDICATE_IF);
  b.box('serviceAttorney.signatureDate', 'PART VI', 'G27', 'date');
  // Milestone 72H: the certificate's attorney is D-2's (PART IV's boxes above).
  b.alsoIn('attorney.barNumber', 'PART VI', 'B29'); b.alsoIn('attorney.streetAddress', 'PART VI', 'J29');
  b.alsoIn('attorney.phone', 'PART VI', 'B31'); b.alsoIn('attorney.cityStateZip', 'PART VI', 'J31');

  // Schedules: the column under each header caption; for the free-text lines,
  // the line the page's own instructions give each item.
  b.schedule('scheduleA1', INV_PAGES.scheduleA1, [
    { field: 'propertyDescription', col: 'C', kind: 'text' }, { field: 'streetAddress', col: 'C', line: 1, kind: 'text' },
    { field: 'cityStateZip', col: 'C', line: 2, kind: 'text' }, { field: 'notes', col: 'C', line: 3, kind: 'text' },
    { field: 'residence', col: 'E', kind: 'finite', options: YES_NO }, { field: 'income', col: 'F', kind: 'finite', options: YES_NO },
    { field: 'fullAssetValue', col: 'G', kind: 'money' }, { field: 'wardPercent', col: 'H', kind: 'pct' },
  ]);
  b.schedule('scheduleA2', INV_PAGES.scheduleA2, [
    { field: 'lenderName', col: 'C', kind: 'text' }, { field: 'lenderAddress', col: 'C', line: 1, kind: 'text' },
    { field: 'lenderCityStateZip', col: 'C', line: 2, kind: 'text' }, { field: 'accountNumber', col: 'C', line: 3, kind: 'text' },
    { field: 'liabilityType', col: 'E', kind: 'text' }, { field: 'fullDebtBalance', col: 'F', kind: 'money' }, { field: 'wardPercent', col: 'G', kind: 'pct' },
  ]);
  b.schedule('scheduleB1', INV_PAGES.scheduleB1, [
    { field: 'institutionName', col: 'C', kind: 'text' }, { field: 'accountNumber', col: 'C', line: 1, kind: 'text' },
    { field: 'streetAddress', col: 'C', line: 2, kind: 'text' }, { field: 'cityStateZip', col: 'C', line: 3, kind: 'text' },
    { field: 'restricted', col: 'E', kind: 'finite', options: YES_NO }, { field: 'accountType', col: 'F', kind: 'text' },
    { field: 'fullAssetAmount', col: 'G', kind: 'money' }, { field: 'wardPercent', col: 'H', kind: 'pct' },
  ]);
  b.schedule('scheduleB2', INV_PAGES.scheduleB2, [
    { field: 'description', col: 'C', kind: 'text' }, { field: 'streetAddress', col: 'C', line: 1, kind: 'text' },
    { field: 'cityStateZip', col: 'C', line: 2, kind: 'text' }, { field: 'valuationMethod', col: 'C', line: 3, kind: 'text' },
    { field: 'fullAssetValue', col: 'E', kind: 'money' }, { field: 'wardPercent', col: 'F', kind: 'pct' },
    { field: 'inSafeDepositBox', col: 'H', kind: 'finite', options: YES_NO },
  ]);
  b.schedule('scheduleB3', INV_PAGES.scheduleB3, [
    { field: 'description', col: 'C', kind: 'text' }, { field: 'streetAddress', col: 'C', line: 1, kind: 'text' },
    { field: 'cityStateZip', col: 'C', line: 2, kind: 'text' },
    { field: 'restricted', col: 'E', kind: 'finite', options: YES_NO }, { field: 'fullAssetValue', col: 'F', kind: 'money' },
    { field: 'wardPercent', col: 'G', kind: 'pct' }, { field: 'inSafeDepositBox', col: 'J', kind: 'finite', options: YES_NO },
  ]);
  // B-4: the fourth line is left blank by decision (Milestone 60K): the form's
  // worked example puts the account number on the fifth.
  b.schedule('scheduleB4', INV_PAGES.scheduleB4, [
    { field: 'lenderName', col: 'C', kind: 'text' }, { field: 'lenderAddress', col: 'C', line: 1, kind: 'text' },
    { field: 'relatedProperty', col: 'C', line: 2, kind: 'text' }, { field: '(fourth line)', col: 'C', line: 3, kind: 'blank' },
    { field: 'accountNumber', col: 'C', line: 4, kind: 'text' },
    { field: 'liabilityType', col: 'E', kind: 'text' }, { field: 'fullLiabilityBalance', col: 'F', kind: 'money' }, { field: 'wardPercent', col: 'G', kind: 'pct' },
  ]);
  b.schedule('scheduleC1', INV_PAGES.scheduleC1, [
    { field: 'payerName', col: 'C', kind: 'text' }, { field: 'payerAddress', col: 'C', line: 1, kind: 'text' },
    { field: 'payerCityStateZip', col: 'C', line: 2, kind: 'text' },
    { field: 'typeOfIncome', col: 'E', kind: 'text' }, { field: 'paymentBasis', col: 'E', line: 2, kind: 'text' },
    { field: 'frequencyOfPayment', col: 'G', kind: 'text' }, { field: 'annualIncomeAmount', col: 'H', kind: 'money' }, { field: 'wardPercent', col: 'I', kind: 'pct' },
  ]);
  // C-2 follows its worked example (Milestone 64A-2): type / case number, then
  // the court, then "Atty X for Y", then the claimant's address on two lines.
  b.schedule('scheduleC2', INV_PAGES.scheduleC2, [
    { field: 'courtJurisdiction', col: 'C', line: 1, kind: 'text' },
    { field: 'claimantAddress', col: 'C', line: 3, kind: 'text' }, { field: 'claimantCityStateZip', col: 'C', line: 4, kind: 'text' },
    { field: 'dateFiled', col: 'E', kind: 'date' }, { field: 'amountOfClaim', col: 'F', kind: 'money' }, { field: 'wardPercent', col: 'G', kind: 'pct' },
  ], [
    { col: 'C', fields: [['lawsuitDescription', 'text'], ['caseNumber', 'text']], compose: (r) => `${r.lawsuitDescription} / ${r.caseNumber}` },
    { col: 'C', line: 2, fields: [['claimantName', 'text'], ['claimantAttorney', 'text']], compose: (r) => `Atty ${r.claimantAttorney} for ${r.claimantName}` },
  ]);
  // C-3, as its instructions and worked example both put it: "entity / type of
  // action", the status, the court, the case number. Column B is the printed Line #.
  b.schedule('scheduleC3', INV_PAGES.scheduleC3, [
    { field: 'status', col: 'C', line: 1, kind: 'text' }, { field: 'courtJurisdiction', col: 'C', line: 2, kind: 'text' },
    { field: 'caseNumber', col: 'C', line: 3, kind: 'text' },
    { field: 'actionDate', col: 'E', kind: 'date' }, { field: 'estimatedSettlement', col: 'F', kind: 'money' }, { field: 'wardPercent', col: 'G', kind: 'pct' },
  ], [
    { col: 'C', fields: [['defendantName', 'text'], ['actionDescription', 'text']], compose: (r) => `${r.defendantName} / ${r.actionDescription}` },
  ]);
  b.schedule('scheduleC4', INV_PAGES.scheduleC4, [
    { field: 'trustName', col: 'C', kind: 'text' }, { field: 'trusteeName', col: 'C', line: 1, kind: 'text' },
    { field: 'trusteeAddress', col: 'C', line: 2, kind: 'text' }, { field: 'trusteeCityStateZip', col: 'C', line: 3, kind: 'text' },
    { field: 'dateCreated', col: 'E', kind: 'date' }, { field: 'accountNumber', col: 'F', kind: 'text' },
    { field: 'trustType', col: 'H', kind: 'text' }, { field: 'trustAmount', col: 'I', kind: 'money' }, { field: 'wardPercent', col: 'J', kind: 'pct' },
  ]);
  b.schedule('scheduleC5', INV_PAGES.scheduleC5, [
    { field: 'assetDescription', col: 'C', kind: 'text' }, { field: 'ownerName', col: 'C', line: 1, kind: 'text' },
    { field: 'ownerAddress', col: 'C', line: 2, kind: 'text' }, { field: 'ownerCityStateZip', col: 'C', line: 3, kind: 'text' },
    { field: 'relationshipToWard', col: 'E', kind: 'text' }, { field: 'totalAssetValue', col: 'F', kind: 'money' },
    { field: 'jointOwnerPercent', col: 'G', kind: 'pct' },
  ]);
  return b.done();
}

// ── Annual, Final and Trust Accountings (templates/annual-template.js) ──────

/**
 * Schedule B-4's twelve account blocks, read from the register pages' printed
 * Line # columns: block 1 is pages 2-7 (25 rows from row 20, then 27 a page
 * from row 8); every other block is four pages, 30 rows from row 8 on its
 * first page (31 on page 16) and 27 on each of the next three.
 */
const B4_BLOCKS: Array<SchedulePage[]> = [
  [{ sheet: 'SCH B-4 OTHER DISB p2', rows: run(20, 1, 25) }, ...[3, 4, 5, 6, 7].map((p) => ({ sheet: `SCH B-4 OTHER DISB p${p}`, rows: run(8, 1, 27) }))],
  ...[8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48].map((first) => [
    { sheet: `SCH B-4 OTHER DISB p${first}`, rows: run(8, 1, first === 16 ? 31 : 30) },
    ...[1, 2, 3].map((k) => ({ sheet: `SCH B-4 OTHER DISB p${first + k}`, rows: run(8, 1, 27) })),
  ]),
];

export function annualManifest(filingTypeValue = 'Annual'): Manifest {
  const b = new Builder();
  const P1 = 'PART I';
  b.box('wardName', P1, 'C5', 'text'); b.box('caseNumber', P1, 'I5', 'text'); b.box('gid', P1, 'F5', 'date');
  b.box('periodFrom', P1, 'E18', 'date'); b.box('periodTo', P1, 'H18', 'date');
  b.box('guardian', P1, 'D20', 'text'); b.box('attorney', P1, 'D21', 'text'); b.box('typeOfGuardianship', P1, 'D22', 'text');
  b.choice('amendedForm', P1, 'J6', YES_NO);
  b.fixed('(filing type, from the filing descriptor)', P1, 'H4', filingTypeValue);
  // The county box is the "Select County" dropdown, H2; Part V's "Name of county" reads it.
  b.box('relatedCaseNumbers', P1, 'I13', 'text'); b.named('county', P1, 'H2', 'Pinellas');

  // PART II, III: three guardian blocks ten rows apart.
  [25, 35, 45].forEach((r, i) => {
    const g = `guardians.${i}`;
    b.box(`${g}.signatureDate`, 'PART II, III', `D${r}`, 'date'); b.box(`${g}.name`, 'PART II, III', `F${r}`, 'text');
    b.box(`${g}.ssn`, 'PART II, III', `B${r + 2}`, 'text'); b.box(`${g}.phone`, 'PART II, III', `B${r + 4}`, 'text');
    b.box(`${g}.email`, 'PART II, III', `B${r + 6}`, 'text');
    b.box(`${g}.mailingStreet`, 'PART II, III', `F${r + 2}`, 'text'); b.box(`${g}.mailingCityStateZip`, 'PART II, III', `F${r + 4}`, 'text');
    b.box(`${g}.officeStreet`, 'PART II, III', `F${r + 6}`, 'text'); b.box(`${g}.officeCityStateZip`, 'PART II, III', `F${r + 8}`, 'text');
  });

  const P45 = 'PART IV, V';
  b.box('preparer.name', P45, 'J15', 'text'); b.box('preparer.signatureDate', P45, 'H15', 'date');
  b.box('preparer.ssn', P45, 'B17', 'text'); b.box('preparer.phone', P45, 'B19', 'text');
  b.box('preparer.street', P45, 'J17', 'text'); b.box('preparer.cityStateZip', P45, 'J19', 'text');
  b.box('attorney_signatureDate', P45, 'H31', 'date');
  b.box('attorney_bar', P45, 'B33', 'text'); b.box('attorney_phone', P45, 'B35', 'text');
  b.box('attorney_street', P45, 'J33', 'text'); b.box('attorney_cityStateZip', P45, 'J35', 'text');

  b.box('startingBalance', 'PART VI, VII ', 'I8', 'money');

  const schA = [
    { field: 'payer', col: 'C', kind: 'text' }, { field: 'description', col: 'E', kind: 'text' },
    { field: 'bank', col: 'F', kind: 'text' }, { field: 'accountNo', col: 'G', kind: 'text' }, { field: 'amount', col: 'H', kind: 'money' },
  ] as const;
  b.schedule('schA', [{ sheet: 'SCH A INCOME p1', rows: run(21, 1, 20) }, { sheet: 'SCH A INCOME p2', rows: run(8, 1, 30) }], schA);
  const fees = [
    { field: 'bankAcct', col: 'C', kind: 'text' }, { field: 'checkNo', col: 'E', kind: 'text' },
    { field: 'periodFrom', col: 'F', kind: 'date' }, { field: 'periodTo', col: 'G', kind: 'date' }, { field: 'datePaid', col: 'H', kind: 'date' },
    { field: 'payee', col: 'I', kind: 'text' }, { field: 'courtOrderDate', col: 'J', kind: 'date' }, { field: 'amount', col: 'K', kind: 'money' },
  ] as const;
  b.schedule('schB1', [{ sheet: 'SCH B-1 ATTORNEY FEES', rows: run(10, 1, 24) }], fees);
  b.schedule('schB2', [{ sheet: 'SCH B-2 GUARDIAN FEES', rows: run(10, 1, 24) }], fees);
  b.schedule('schB3', [{ sheet: 'SCH B-3 OTHER CO DISB', rows: run(10, 1, 24) }], [
    { field: 'bankAcct', col: 'C', kind: 'text' }, { field: 'checkNo', col: 'E', kind: 'text' }, { field: 'datePaid', col: 'F', kind: 'date' },
    { field: 'payee', col: 'G', kind: 'text' }, { field: 'courtOrderDate', col: 'H', kind: 'date' }, { field: 'amount', col: 'I', kind: 'money' },
  ]);

  // Schedule B-4: one bank account per block, its name and number printed at
  // the top of the block's first page (BANK: D6, ACCOUNT NUMBER #: H6).
  const accounts: Array<Record<string, unknown>> = [];
  let row = 0;
  B4_BLOCKS.forEach((pages, i) => {
    const id = `guard-acct-${i + 1}`;
    const [bankName, bankCell] = b.values.next('text');
    const [accountNumber, accountCell] = b.values.next('text');
    accounts.push({ id, bankName, accountNumber });
    b.fixed(`schB4Accounts.${i}.bankName`, pages[0].sheet, 'D6', bankCell);
    b.fixed(`schB4Accounts.${i}.accountNumber`, pages[0].sheet, 'H6', accountCell);
    b.schedule('schB4', pages, [
      { field: 'checkNo', col: 'C', kind: 'text' }, { field: 'datePaid', col: 'D', kind: 'date' },
      { field: 'category', col: 'E', kind: 'finite', options: DISB_CATEGORIES },
      { field: 'payee', col: 'G', kind: 'text' }, { field: 'amount', col: 'I', kind: 'money' },
    ], [], { start: row, extra: { bankAccountId: id } });
    row += pages.reduce((n, p) => n + p.rows.length, 0);
  });
  b.set('schB4Accounts', accounts);

  b.schedule('schC', [{ sheet: 'SCH C CAPITAL ADJ p1', rows: run(31, 4, 6) }], [
    { field: 'description', col: 'C', kind: 'text' }, { field: 'date', col: 'E', kind: 'date' },
    { field: 'gain', col: 'F', kind: 'money' }, { field: 'loss', col: 'G', kind: 'money' },
  ]);
  b.schedule('schD1', [{ sheet: 'SCH D-1 CASH p1', rows: run(25, 3, 11) }], [
    { field: 'description', col: 'C', kind: 'text' }, { field: 'accountNo', col: 'E', kind: 'text' },
    { field: 'restricted', col: 'F', kind: 'finite', options: YES_NO }, { field: 'type', col: 'G', kind: 'text' },
    { field: 'fullAmount', col: 'H', kind: 'money' }, { field: 'wardPct', col: 'I', kind: 'pct' },
  ]);
  b.schedule('schD2', [{ sheet: 'SCH D-2 REAL ESTATE p1', rows: run(20, 4, 8) }], [
    { field: 'description', col: 'C', kind: 'text' }, { field: 'residence', col: 'E', kind: 'finite', options: YES_NO },
    { field: 'income', col: 'F', kind: 'finite', options: YES_NO }, { field: 'fullValue', col: 'G', kind: 'money' },
    { field: 'wardPct', col: 'H', kind: 'pct' }, { field: 'carryingValue', col: 'I', kind: 'money' },
  ]);
  b.schedule('schD3', [{ sheet: 'SCH D-3 PERSONAL PROP p1', rows: run(31, 4, 4) }], [
    { field: 'description', col: 'C', kind: 'text' }, { field: 'fullAmount', col: 'F', kind: 'money' },
    { field: 'wardPct', col: 'G', kind: 'pct' }, { field: 'carryingValue', col: 'H', kind: 'money' },
  ]);
  b.schedule('schD4', [{ sheet: 'SCH D-4 INTANGIBLE p1 ', rows: run(18, 4, 9) }], [
    { field: 'description', col: 'C', kind: 'text' }, { field: 'restricted', col: 'F', kind: 'finite', options: YES_NO },
    { field: 'fullAmount', col: 'G', kind: 'money' }, { field: 'wardPct', col: 'H', kind: 'pct' }, { field: 'carryingValue', col: 'I', kind: 'money' },
  ]);
  b.schedule('schD5', [{ sheet: 'SCH D-5 MORTGAGES p1', rows: run(23, 4, 7) }], [
    { field: 'description', col: 'C', kind: 'text' }, { field: 'loanNo', col: 'E', kind: 'text' }, { field: 'loanType', col: 'F', kind: 'text' },
    { field: 'fullDebt', col: 'G', kind: 'money' }, { field: 'wardPct', col: 'H', kind: 'pct' },
  ]);
  b.schedule('schE', [{ sheet: 'SCH E BANK TRANS p1', rows: run(14, 1, 27) }], [
    { field: 'bankName', col: 'C', kind: 'text' }, { field: 'transferInDate', col: 'E', kind: 'date' },
    { field: 'transferInAmt', col: 'F', kind: 'money' }, { field: 'transferOutDate', col: 'G', kind: 'date' }, { field: 'transferOutAmt', col: 'H', kind: 'money' },
  ]);
  const sales = [
    { field: 'description', col: 'C', kind: 'text' }, { field: 'bank', col: 'F', kind: 'text' }, { field: 'accountNo', col: 'G', kind: 'text' },
    { field: 'courtOrderDate', col: 'H', kind: 'date' }, { field: 'salePrice', col: 'I', kind: 'money' },
  ] as const;
  b.schedule('schF1', [{ sheet: 'SCH F-1 SALES REAL PROP p1', rows: run(19, 5, 8) }], sales);
  b.schedule('schF2', [{ sheet: 'SCH F-2 SALES PERSONAL PROP p1', rows: run(17, 4, 11) }], sales);

  // PART VIII: the one "any trust?" question, then three trust blocks.
  // Milestone 73T part 3 (row 3): the answer, each share and each amount in
  // the Clerk's H boxes (unlocked; H8 carries the Yes/No list), not the
  // locked D cells beside them.
  b.choice('trusts.0.hasTrust', 'PART VIII', 'H8', YES_NO);
  [[10, 12, 13, 14, 15, 16, 17, 18], [20, 22, 23, 24, 25, 26, 27, 28], [30, 32, 33, 34, 35, 36, 37, 38]].forEach((r, i) => {
    const t = `trusts.${i}`;
    b.choice(`${t}.createdAfterGID`, 'PART VIII', `H${r[0]}`, YES_NO);
    b.box(`${t}.name`, 'PART VIII', `D${r[1]}`, 'text'); b.box(`${t}.trustee`, 'PART VIII', `D${r[2]}`, 'text');
    b.box(`${t}.accountNo`, 'PART VIII', `D${r[3]}`, 'text'); b.box(`${t}.dateCreated`, 'PART VIII', `D${r[4]}`, 'date');
    b.box(`${t}.trustType`, 'PART VIII', `D${r[5]}`, 'text'); b.box(`${t}.wardPct`, 'PART VIII', `H${r[6]}`, 'pct');
    b.box(`${t}.wardAmount`, 'PART VIII', `H${r[7]}`, 'money');
  });

  // PART IX. Milestone 73T part 3 (row 16): the block shows what the
  // arrangement shows -- "bond and depository" shows all three boxes.
  b.set('bondDepositoryState', 'bond-and-depository');
  b.box('guardianRelationship', 'PART IX ', 'G8', 'text'); b.box('restrictedDepositoryReceiptDate', 'PART IX ', 'G9', 'date');
  b.box('bondAmount', 'PART IX ', 'H20', 'money'); b.box('bondingCompany', 'PART IX ', 'D22', 'text');

  ([['B', 11], ['I', 11], ['B', 17], ['I', 17]] as const).forEach(([c, r], i) => {
    b.box(`certRecipients.${i}.name`, 'PART X', `${c}${r}`, 'text'); b.box(`certRecipients.${i}.line2`, 'PART X', `${c}${r + 1}`, 'text');
    b.box(`certRecipients.${i}.line3`, 'PART X', `${c}${r + 2}`, 'text'); b.box(`certRecipients.${i}.line4`, 'PART X', `${c}${r + 3}`, 'text');
  });
  b.box('certDate', 'PART X', 'G23', 'date');
  // Milestone 72G: "Indicate if:" is the ward's status (a dropdown on the
  // Clerk's form); the method of service (certIndicator) is PDF only.
  b.choice('certWardStatus', 'PART X', 'K23', INDICATE_IF);
  b.box('certAttySignDate', 'PART X', 'G25', 'date');

  // PART XI (Milestone 73T part 3, decision 73T-2): one line per remuneration
  // entry, A6..A32, joined as the Simplified's PART VII is.
  b.schedule('remuneration', [{ sheet: 'PART XI', rows: run(6, 1, 27) }], [], [
    { col: 'A', fields: [['guardian', 'text'], ['type', 'text'], ['amount', 'money'], ['description', 'text']],
      compose: (r) => `${r.guardian}  —  ${r.type}  —  $${Number(r.amount).toFixed(2)}  —  ${r.description}` },
  ]);
  return b.done();
}

// ── Simplified Accounting (templates/simplified-template.js) ────────────────

export function simplifiedManifest(): Manifest {
  const b = new Builder();
  const P1 = 'PARTS I, II ';
  b.box('wardName', P1, 'C4', 'text'); b.box('caseNumber', P1, 'H4', 'text');
  b.box('periodFrom', P1, 'E13', 'date'); b.box('periodTo', P1, 'H13', 'date');
  b.box('attorney', P1, 'D15', 'text'); b.box('guardian', P1, 'D16', 'text'); b.box('typeOfGuardianship', P1, 'D17', 'text');
  b.box('gid', P1, 'F4', 'date'); b.named('county', P1, 'G2', 'Pinellas');
  b.choice('amendedForm', P1, 'I5', YES_NO);
  b.box('startingBalance', P1, 'H19', 'money'); b.box('interestIncome', P1, 'G22', 'money');
  b.box('depositsSettlement', P1, 'G23', 'money'); b.box('serviceCharges', P1, 'G27', 'money');
  b.box('federalIncomeTax', P1, 'G28', 'money');

  // PARTS III, IV: Guardian #1's name is the form's link to Part I (F15) and
  // is not written; co-guardians 2 and 3 have their own name boxes.
  const P34 = 'PARTS III, IV';
  [15, 25, 35].forEach((r, i) => {
    const g = `guardians.${i}`;
    b.box(`${g}.signatureDate`, P34, `D${r}`, 'date');
    if (i > 0) b.box(`${g}.name`, P34, `F${r}`, 'text');
    b.box(`${g}.ssn`, P34, `B${r + 2}`, 'text'); b.box(`${g}.phone`, P34, `B${r + 4}`, 'text'); b.box(`${g}.email`, P34, `B${r + 6}`, 'text');
    b.box(`${g}.mailingStreet`, P34, `F${r + 2}`, 'text'); b.box(`${g}.mailingCityStateZip`, P34, `F${r + 4}`, 'text');
    b.box(`${g}.residenceStreet`, P34, `F${r + 6}`, 'text'); b.box(`${g}.residenceCityStateZip`, P34, `F${r + 8}`, 'text');
  });

  const P56 = 'PARTS V, VI ';
  b.box('attorney_barNumber', P56, 'B19', 'text'); b.box('attorney_phone', P56, 'B21', 'text');
  b.box('attorney_street', P56, 'J19', 'text'); b.box('attorney_cityStateZip', P56, 'J21', 'text');
  // Milestone 72G: J39 is the ward's status; the method is PDF only.
  b.box('certServiceDate', P56, 'H39', 'date'); b.choice('certWardStatus', P56, 'J39', INDICATE_IF);
  // The right-hand recipient boxes are the merges I27:L27, I28:L28 ...: I is each box's own cell.
  ([['B', 27], ['I', 27], ['B', 33], ['I', 33]] as const).forEach(([c, r], i) => {
    b.box(`certRecipients.${i}.name`, P56, `${c}${r}`, 'text'); b.box(`certRecipients.${i}.line2`, P56, `${c}${r + 1}`, 'text');
    b.box(`certRecipients.${i}.line3`, P56, `${c}${r + 2}`, 'text');
  });
  b.box('certAttySignDate', P56, 'H41', 'date');
  // Milestone 72H: the certificate's attorney is Part V's (B19/B21/J19/J21 above).
  b.alsoIn('attorney_barNumber', P56, 'B43'); b.alsoIn('attorney_phone', P56, 'B45');
  b.alsoIn('attorney_street', P56, 'J43'); b.alsoIn('attorney_cityStateZip', P56, 'J45');

  // PART VII: one free-text line per remuneration entry, A6..A32, the fields
  // joined as the exporter's own comment describes.
  b.schedule('remuneration', [{ sheet: 'PART VII', rows: run(6, 1, 27) }], [], [
    { col: 'A', fields: [['guardian', 'text'], ['type', 'text'], ['amount', 'money'], ['description', 'text']],
      compose: (r) => `${r.guardian}  —  ${r.type}  —  $${Number(r.amount).toFixed(2)}  —  ${r.description}` },
  ]);
  return b.done();
}
