import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard } from './support/target';
import { extractPdfTextItems } from './support/pdf-extract';

// Milestone 60B-60E added two or three columns to Verified Initial Inventory
// schedules that were already wide (A-2, C-1, C-3, C-4 gained the most). Every
// value can be present in the text layer and the page can still be unusable:
// a column too narrow for its content spills into the one-inch margin, a row
// that does not grow prints its second address line on top of the next row,
// or a value drifts under the wrong heading. Those are layout facts, so this
// spec reads the rendered pages, not the model.
//
// Three layers, on purpose (MILESTONE-60-PROPOSAL.md, 60B "Layout proof"):
//   * pdf-model-column-integrity.spec.js and guardian-inventory-pdf-model
//     .spec.js check the MODEL -- cell counts, width reconciliation, mapping;
//   * span POSITIONS from pdf.js's text layer are reliable and are used here
//     for reading order, row growth, header/value association and page
//     membership;
//   * span WIDTHS are not reliable (they come out ~16% wide -- see
//     signature-block-address-margin.spec.ts, which learned this the hard
//     way), so the margin check reads real ink off the canvas instead.

const PAGE_W_PT = 612;
const MARGIN_PT = 72;
const RIGHT_EDGE_PT = PAGE_W_PT - MARGIN_PT; // 540
const EDGE_TOLERANCE_PT = 1; // a table rule centred on the content edge straddles it

// Realistically long values a filer might actually type -- institutional
// names, attention lines, hyphenated ZIP+4s, multi-clause statuses.
const LONG = {
  a2: {
    lenderName: 'First National Bank of the Greater Tampa Bay Metropolitan Region, Mortgage Servicing Division',
    lenderAddress: 'PO Box 10335, Attention: Loss Mitigation Department, Mail Stop 4400-B',
    lenderCityStateZip: 'Des Moines, IA 50306-0335',
    liabilityType: 'Mortgage',
    accountNumber: '0011-2233-4455-6677',
    notes: 'For property at 1420 5th Avenue North, St. Petersburg (Schedule A-1, Item 1); escrow includes taxes and insurance',
    fullDebtBalance: 45000,
    wardPercent: 50,
  },
  c1: {
    payerName: 'United States Social Security Administration, Office of Central Operations',
    payerAddress: '6401 Security Boulevard, Building 2, Suite 4000',
    payerCityStateZip: 'Baltimore, MD 21235-6401',
    typeOfIncome: 'Retirement Insurance Benefits (Title II)',
    frequencyOfPayment: 'Monthly',
    paymentBasis: 'Primary insurance amount $1,850.00 per month less Medicare Part B premium',
    annualIncomeAmount: 22200,
    wardPercent: 50,
  },
  c3: {
    defendantName: 'Big Chain Store Holdings International, LLC, and its wholly owned subsidiaries',
    actionDescription: 'Negligence / premises liability / personal injury (slip and fall)',
    status: 'Mediation scheduled for December 7, 2026; discovery ongoing; expert disclosures due November 1',
    courtJurisdiction: 'Circuit Court, Sixth Judicial Circuit, Civil Division 2, Pinellas County; attorney of record Jane Q. Counsel, Esq.',
    caseNumber: '26-003456-CI-24',
    actionDate: '2026-02-14',
    estimatedSettlement: 30000,
    wardPercent: 50,
  },
  // B-2's Ward's Value column was 8% (37pt) before Milestone 60 -- narrower
  // than a seven-figure amount, which the engine then split mid-number.
  b2: {
    description: 'Fine art collection (appraised)', streetAddress: '1420 5th Avenue North', cityStateZip: 'St. Petersburg, FL 33705',
    valuationMethod: 'Certified appraisal, 2026-01-10', fullAssetValue: 1250000.55, wardPercent: 100, inSafeDepositBox: 'No',
  },
  c4: {
    trustName: 'The Harold Thomas Bennett Irrevocable Special Needs Trust dated January 15, 2026',
    trusteeName: 'Charles Addams, Esq., as Successor Trustee',
    trusteeAddress: '5000 Dale Mabry Highway North, Suite 1200',
    trusteeCityStateZip: 'Tampa, FL 33614-4321',
    dateCreated: '2026-01-15',
    accountNumber: '34567890-001',
    trustType: 'Special Needs',
    trustAmount: 2000,
    wardPercent: 50,
  },
};

type Run = { page: number; text: string; left: number; mid: number };

async function openGuardianPreview(page: Page) {
  await freshStartNoPassword(page);
  await createWard(page, 'Schedule Layout Ward', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await page.evaluate((long) => {
    const d = (window as any).D;
    d.scheduleA2 = [long.a2];
    d.scheduleB2 = [long.b2];
    d.scheduleC1 = [long.c1];
    d.scheduleC3 = [long.c3];
    d.scheduleC4 = [long.c4];
    d.scheduleNoItems = { ...(d.scheduleNoItems || {}), a2: false, b2: false, c1: false, c3: false, c4: false };
    (window as any).autoSave();
  }, LONG);
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.evaluate(() => {
    // The pager keeps every page in the DOM but shows one at a time; each has
    // to be laid out for its text positions to be readable.
    for (const el of document.querySelectorAll('#print-doc-container .pdf-page')) {
      (el as HTMLElement).style.display = 'block';
    }
  });
}

/** Every text run on every page, positions in PDF points. Widths deliberately omitted. */
function collectRuns(page: Page): Promise<Run[]> {
  return page.evaluate((pageW) => {
    const runs: Array<{ page: number; text: string; left: number; mid: number }> = [];
    [...document.querySelectorAll('#print-doc-container .pdf-page')].forEach((host, idx) => {
      const hr = host.getBoundingClientRect();
      if (!hr.width) return;
      const k = hr.width / pageW;
      for (const s of host.querySelectorAll('.textLayer span')) {
        const text = (s.textContent || '').trim();
        if (!text) continue;
        const r = s.getBoundingClientRect();
        runs.push({ page: idx + 1, text, left: (r.left - hr.left) / k, mid: ((r.top + r.bottom) / 2 - hr.top) / k });
      }
    });
    return runs;
  }, PAGE_W_PT);
}

/** The rightmost inked pixel, in points, on the canvas rows a text run occupies. */
function inkRightEdgeOnRowsContaining(page: Page, needle: string) {
  return page.evaluate(([text, pageW]) => {
    const out: Array<{ page: number; yTop: number; rightPt: number }> = [];
    [...document.querySelectorAll('#print-doc-container .pdf-page')].forEach((host, idx) => {
      const canvas = host.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const hr = host.getBoundingClientRect();
      if (!hr.width) return;
      const pxPerPt = canvas.width / pageW;
      const domPerPt = hr.width / pageW;
      const hits = [...host.querySelectorAll('.textLayer span')].filter((s) => (s.textContent || '').includes(text));
      if (!hits.length) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      for (const span of hits) {
        const r = span.getBoundingClientRect();
        const yTop = (r.top - hr.top) / domPerPt;
        const yBot = (r.bottom - hr.top) / domPerPt;
        const y0 = Math.max(0, Math.floor(yTop * pxPerPt));
        const y1 = Math.min(canvas.height - 1, Math.ceil(yBot * pxPerPt));
        const rows = Math.max(1, y1 - y0 + 1);
        const img = ctx.getImageData(0, y0, canvas.width, rows).data;
        let rightmost = -1;
        for (let x = canvas.width - 1; x >= 0 && rightmost < 0; x--) {
          for (let ry = 0; ry < rows; ry++) {
            const i = ((ry * canvas.width) + x) * 4;
            if (img[i] < 200 || img[i + 1] < 200 || img[i + 2] < 200) { rightmost = x; break; }
          }
        }
        out.push({ page: idx + 1, yTop: Math.round(yTop * 10) / 10, rightPt: rightmost < 0 ? 0 : Math.round(((rightmost + 1) / pxPerPt) * 10) / 10 });
      }
    });
    return out;
  }, [needle, PAGE_W_PT] as const);
}

const find = (runs: Run[], needle: string, onPage?: number) =>
  runs.find((r) => r.text.includes(needle) && (onPage === undefined || r.page === onPage)) || null;

/**
 * A table header may wrap onto two lines in a narrow column ("Action" over
 * "Date"), which pdf.js exposes as two runs. Accept either the whole label in
 * one run or a first-line run whose continuation sits directly beneath it.
 */
function findHeaders(runs: Run[], label: string): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    if (r.text === label || r.text.startsWith(label)) { out.push(r); continue; }
    if (!label.startsWith(r.text + ' ')) continue;
    const rest = label.slice(r.text.length + 1);
    // A centered column centers each wrapped header line, so the second
    // line's left edge can sit up to ~half a column right of the first's.
    const below = runs.find((c) => c.page === r.page && Math.abs(c.left - r.left) < 30
      && c.mid > r.mid + 5 && c.mid < r.mid + 16 && (c.text === rest || rest.startsWith(c.text)));
    if (below) out.push(r);
  }
  return out;
}
// A table whose header lands at the foot of a page redraws it at the top of
// the next, so a label can appear twice with rows under only one instance.
const findHeader = (runs: Run[], label: string): Run | null => findHeaders(runs, label)[0] || null;

/**
 * The nearest run containing `needle` BELOW `anchor` on the same page. When
 * several runs share that nearest line (a 100% row prints the same figure as
 * Full Value and as Ward's Value), the one in the anchor's own column wins.
 */
const nearestBelow = (runs: Run[], needle: string, anchor: Run) => {
  const below = runs.filter((r) => r.page === anchor.page && r.mid > anchor.mid + 6 && r.text.includes(needle));
  if (!below.length) return null;
  const topMid = Math.min(...below.map((r) => r.mid));
  return below.filter((r) => Math.abs(r.mid - topMid) < 1)
    .sort((a, b) => Math.abs(a.left - anchor.left) - Math.abs(b.left - anchor.left))[0];
};

test.describe('Milestone 60B-60E: widened Guardian Inventory schedules stay readable on the page', () => {
  test('no ink from any widened schedule crosses the one-inch right margin', async ({ page }) => {
    test.setTimeout(150_000);
    await openGuardianPreview(page);

    // One distinctive WORD from every long cell, across all four schedules --
    // single words, because a narrow column wraps a phrase across two runs.
    const needles = ['Metropolitan', 'Mitigation', 'Moines', 'escrow',
      'Operations', 'Boulevard', 'Baltimore', 'Medicare',
      'Holdings', 'Mediation', 'Counsel',
      'Irrevocable', 'Successor', 'Mabry', 'Tampa'];
    const rows: Array<{ needle: string; page: number; yTop: number; rightPt: number }> = [];
    for (const needle of needles) {
      const hits = await inkRightEdgeOnRowsContaining(page, needle);
      expect(hits.length, `"${needle}" was not found on any page`).toBeGreaterThan(0);
      rows.push(...hits.map((h) => ({ needle, ...h })));
    }
    const limit = RIGHT_EDGE_PT + EDGE_TOLERANCE_PT;
    const overflowing = rows.filter((r) => r.rightPt > limit)
      .map((r) => ({ ...r, overPt: Math.round((r.rightPt - RIGHT_EDGE_PT) * 10) / 10 }));
    expect(overflowing, `real ink past the right margin: ${JSON.stringify(overflowing, null, 1)}`).toEqual([]);
  });

  test('a row grows to hold its wrapped cells, its figures sit on the row\'s first line, and no row is split across pages', async ({ page }) => {
    test.setTimeout(150_000);
    await openGuardianPreview(page);
    const runs = await collectRuns(page);

    // C-1: the payer cell is three stored lines (name / street / city-state-ZIP),
    // the name itself wrapping. The row's two figures are unique to it.
    // Anchor on the payer's name, then read the rest of the row relative to it:
    // Summary II prints the same C-1 total on an earlier page, so an unanchored
    // search for "$11,100.00" finds the summary, not the schedule row.
    const name = find(runs, 'United States');
    expect(name, 'C-1 payer name missing from the rendered filing').toBeTruthy();
    const c1Page = name!.page;
    const onC1Page = (needle: string) => runs.find((r) => r.page === c1Page && r.mid > name!.mid - 6 && r.text.includes(needle)) || null;
    const street = onC1Page('Boulevard');
    const city = onC1Page('Baltimore');
    const annual = onC1Page('$22,200.00');
    const share = onC1Page('$11,100.00');
    for (const [label, run] of Object.entries({ street, city, annual, share })) {
      expect(run, `C-1 ${label} missing from the rendered filing (or not on the payer's page)`).toBeTruthy();
    }
    expect([street!.page, city!.page, annual!.page, share!.page], 'the C-1 row is split across pages').toEqual([c1Page, c1Page, c1Page, c1Page]);
    // Lines stack downward inside the cell ...
    expect(street!.mid, 'street is not below the payer name').toBeGreaterThan(name!.mid + 6);
    expect(city!.mid, 'city/state/ZIP is not below the street').toBeGreaterThan(street!.mid + 6);
    // ... and the figures are drawn on the row's first line, so a reader
    // scanning across the row finds them where the row starts.
    expect(Math.abs(annual!.mid - name!.mid), 'annual amount is not on the row\'s first line').toBeLessThan(6);
    expect(Math.abs(share!.mid - name!.mid), 'ward\'s share is not on the row\'s first line').toBeLessThan(6);

    // C-4: same shape, the trustee block under the trust name.
    // Same anchoring: Summary II prints C-4's $2,000.00 total on an earlier page.
    const trustee = find(runs, 'Successor');
    expect(trustee, 'C-4 trustee missing from the rendered filing').toBeTruthy();
    const onC4Page = (needle: string) => runs.find((r) => r.page === trustee!.page && r.mid > trustee!.mid - 30 && r.text.includes(needle)) || null;
    const trusteeCity = onC4Page('Tampa');
    const trustAmt = onC4Page('$2,000.00');
    expect(trusteeCity, 'C-4 trustee city/state/ZIP missing from the trustee\'s page (row split or line dropped)').toBeTruthy();
    expect(trustAmt, 'C-4 trust amount missing from the trustee\'s page (row split across pages)').toBeTruthy();
    expect(trusteeCity!.mid).toBeGreaterThan(trustee!.mid + 6);
  });

  // Found live on 2026-09-20 while building this spec: a 9% date column is
  // 42pt wide, a date is ~45pt at 8pt, and the engine's word-wrapper -- with
  // no space to break on -- split "02/14/2026" character-wise onto two lines.
  // No text run contained the date any more. B-2's pre-existing 8% Ward's
  // Value column did the same to any seven-figure amount. Fixed twice over:
  // every date/percent/currency column is now sized for its widest realistic
  // token (this test), and the engine shrinks an unbreakable token to fit
  // (6pt floor) instead of splitting it (the next test, which narrows a
  // column on purpose -- with the widened columns alone this test passes even
  // without the engine change, so it cannot be the engine change's proof).
  // Milestone 64A-3, from the D14 render baseline (measured 2026-09-22). The
  // Schedules B-1 and B-3 "Restricted?" column headers were breaking MID-WORD
  // -- "Restrict" on one line and "ed?" on the next, measured at p2 y=438.5
  // (B-1) and y=219.0 (B-3). A clerk reading the filed page sees a header
  // that looks like a typo. "Restricted?" is the court workbook's own header
  // text (B-1 sheet E17, B-3 sheet E16), so it cannot be shortened to fit:
  // the column has to be wide enough for it. Neighbouring headers that wrap
  // at word boundaries ("Restricted Asset Amount", "In Safe Deposit Box?")
  // are correct and deliberately not asserted here.
  test('the B-1 and B-3 "Restricted?" headers are one intact run, never broken mid-word', async ({ page }) => {
    test.setTimeout(150_000);
    // Its own filing rather than the shared fixture: that one populates
    // A-2/B-2/C-1/C-3/C-4 only, and an empty Guardian schedule prints a "No
    // entries" notice with no table -- so B-1 and B-3 would contribute no
    // headers at all and this would pass vacuously.
    await freshStartNoPassword(page);
    await createWard(page, 'Restricted Header Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => {
      const d = (window as any).D;
      d.scheduleB1 = [{ institutionName: 'Raymond James Bank', accountType: 'Checking', accountNumber: '4821', streetAddress: '880 Carillon Pkwy', cityStateZip: 'St. Petersburg, FL 33716', fullAssetAmount: 38250, wardPercent: 100, restricted: 'No' }];
      d.scheduleB3 = [{ description: 'Vanguard Index Fund', streetAddress: '100 Vanguard Blvd', cityStateZip: 'Malvern, PA 19355', fullAssetValue: 65000, wardPercent: 100, restricted: 'No', inSafeDepositBox: 'No' }];
      d.scheduleNoItems = { ...(d.scheduleNoItems || {}), b1: false, b3: false };
      (window as any).autoSave();
    });
    await page.evaluate(() => (window as any).flushPendingSave());
    await page.evaluate(() => (window as any).navigate('/print'));
    await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 30000 });
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('#print-doc-container .pdf-page')) {
        (el as HTMLElement).style.display = 'block';
      }
    });
    const runs = await collectRuns(page);

    // Non-vacuity: both tables must actually be on the page. Checked on the
    // schedule titles, not a cell value -- an institution name wraps at word
    // boundaries inside its own column, so no single run holds all of it.
    expect(runs.some((r) => r.text.startsWith('Schedule B-1: Cash Assets')), 'B-1 table did not render').toBe(true);
    expect(runs.some((r) => r.text.startsWith('Schedule B-3: Intangible Assets')), 'B-3 table did not render').toBe(true);

    const intact = runs.filter((r) => r.text.trim() === 'Restricted?');
    expect(intact.length, 'expected an intact "Restricted?" header in both B-1 and B-3').toBeGreaterThanOrEqual(2);

    // The mid-word halves must not appear at all.
    const broken = runs.filter((r) => r.text.trim() === 'Restrict' || r.text.trim() === 'ed?');
    expect(broken.map((r) => r.text), 'a "Restricted?" header is still breaking mid-word').toEqual([]);
  });

  test('a date, a percentage and a seven-figure amount each stay one intact token, while prose still wraps', async ({ page }) => {
    test.setTimeout(150_000);
    await openGuardianPreview(page);
    const runs = await collectRuns(page);

    // Intact numeric/date tokens -- each one exactly as the model emits it.
    for (const token of ['02/14/2026', '01/15/2026', '$1,250,000.55', '$22,500.00', '$11,100.00']) {
      const hit = runs.find((r) => r.text === token || r.text.split(/\s+/).includes(token));
      expect(hit, `"${token}" is not a single intact text run (split across lines?)`).toBeTruthy();
    }
    // A percentage in its own column, intact.
    const pct = runs.find((r) => r.text === '50%' || r.text === '100%');
    expect(pct, 'no intact percentage run found').toBeTruthy();

    // And ordinary prose still wraps: the C-1 basis is one long sentence in a
    // 15% column, so its first word and its last word must land on different
    // lines. Anchoring on the sentence's ends, not on phrase fragments, because
    // where the engine chooses to break is its business.
    const basisFirst = runs.find((r) => r.text.startsWith('Primary insurance') || r.text === 'Primary');
    const basisLast = runs.find((r) => r.text.endsWith('premium') && r.page === basisFirst?.page);
    expect(basisFirst, 'basis-for-payment first line not found').toBeTruthy();
    expect(basisLast, 'basis-for-payment last line not found on the same page').toBeTruthy();
    expect(basisLast!.mid, 'the basis-for-payment prose did not wrap onto multiple lines').toBeGreaterThan(basisFirst!.mid + 6);

    // A shrunk token must still sit inside its own column: the amount starts at
    // or right of its header's left edge (B-2's Ward's Value column).
    const b2Header = findHeaders(runs, "Ward's Value").find((h) => nearestBelow(runs, '$1,250,000.55', h));
    expect(b2Header, 'B-2 Ward\'s Value header with the amount beneath it not found').toBeTruthy();
    const amount = nearestBelow(runs, '$1,250,000.55', b2Header!)!;
    expect(amount.left).toBeGreaterThan(b2Header!.left - 2);
    expect(amount.left - b2Header!.left).toBeLessThan(65);
  });

  // Engine-level proof for the shrink-to-fit rule, independent of the model's
  // column widths: the production model with C-3's Action Date column forced
  // down to 5% (23pt, ~13pt usable), far too narrow for a date at 8pt. The
  // engine must shrink the token, never split it -- the generated PDF's own
  // text items are read back, so this is the filed artifact, not the preview.
  // Verified red with the engine change stashed: the date came back as
  // "02/14/20" and "26".
  test('the engine keeps an unbreakable token whole even in a column too narrow for it', async ({ page }) => {
    test.setTimeout(150_000);
    await openGuardianPreview(page);
    const raw = await page.evaluate(async () => {
      const w = window as any;
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await w.loadGuardianPdf();
      const model = buildVerifiedInventoryModel(w.D, { printDate: '2026-09-20' });
      const c3 = model.sections.find((s: any) => s.id === 'c3').blocks[0];
      // Same header count, same row shape, one deliberately starved column.
      c3.colWidths = [20, 19, 16, 16, 5, 10, 6, 8];
      const doc = await generateVerifiedInventoryPdf(model);
      return doc.output();
    });
    const items = (await extractPdfTextItems(raw)).flat();
    expect(items, 'the date was split across lines (or dropped) in the filed PDF').toContain('02/14/2026');
    expect(items.some((t) => /^02\/14\/20$/.test(t) || /^26$/.test(t)), 'a fragment of the date is present').toBe(false);
  });

  test('every new column keeps its header directly above its own values', async ({ page }) => {
    test.setTimeout(150_000);
    await openGuardianPreview(page);
    const runs = await collectRuns(page);

    // Header left edge is the column's left edge (headers are left-aligned);
    // a right-aligned value starts somewhere inside that same column. Column
    // widths here are 6-19% of a 468pt content width, so "inside" is a band
    // of at most ~90pt to the right of the header's left edge.
    // The value is the nearest run BELOW the header on its page: Summary I
    // prints the same schedule total higher on the same page, and matching
    // that instead would compare against the wrong table.
    const under = (headerLabel: string, valueNeedle: string, maxColPt: number) => {
      const headers = findHeaders(runs, headerLabel);
      expect(headers.length, `header "${headerLabel}" not found`).toBeGreaterThan(0);
      // Whichever instance of the header has this value beneath it on its page.
      const pair = headers.map((h) => ({ header: h, value: nearestBelow(runs, valueNeedle, h) })).find((p) => p.value);
      expect(pair, `value "${valueNeedle}" not found below any "${headerLabel}" header on the same page`).toBeTruthy();
      const { header, value } = pair!;
      expect(value!.left, `"${valueNeedle}" starts left of its column`).toBeGreaterThan(header.left - 2);
      expect(value!.left - header.left, `"${valueNeedle}" starts past the end of its column`).toBeLessThan(maxColPt);
    };
    under("Ward's Debt Balance", '$22,500.00', 95);   // A-2, 20% column
    under('Action Date', '02/14/2026', 56);            // C-3, 11% column
    under('Account Number', '34567890-001', 56);       // C-4, 11% column
    under("Ward's Annual Income", '$11,100.00', 84);   // C-1, 17% column

    // Reading order across A-2's header row, as the form lays it out. Each
    // token is a header's FIRST line, since several wrap in their columns.
    const a2Header = findHeaders(runs, "Ward's Debt Balance").find((h) => nearestBelow(runs, '$22,500.00', h))!;
    expect(a2Header, 'no A-2 header instance with rows beneath it').toBeTruthy();
    // Header lines are vertically centred in the header band and set 8.5pt
    // apart (pdf-engine.js drawTableHeader), so a two-line header's first line
    // sits 4.25pt above a one-line neighbour's. The tolerance is therefore ONE
    // header line height (8.5pt): wide enough for any header in the same band,
    // narrower than the gap to the first data row (a row is >= 16pt tall).
    // Do not widen it -- a looser band would start matching neighbouring rows.
    const HEADER_LINE_PT = 8.5;
    const onRow = (t: string) => runs.find((r) => r.page === a2Header.page && Math.abs(r.mid - a2Header.mid) < HEADER_LINE_PT && r.text.startsWith(t));
    const order = ['Lender / Liability', 'Lender Address', 'Type', 'Full Debt', "Ward's %", "Ward's Debt"].map(onRow);
    expect(order.every(Boolean), `A-2 header row incomplete: ${JSON.stringify(order.map((r) => r?.text))}`).toBe(true);
    const lefts = order.map((r) => r!.left);
    expect(lefts, 'A-2 headers are out of order').toEqual([...lefts].sort((a, b) => a - b));

    // And the sub-lines the form puts under a lender are there and legible in order.
    const acct = find(runs, '0011-2233-4455-6677');
    const notes = find(runs, 'escrow');
    const lender = find(runs, 'First National');
    expect(acct && notes && lender, 'A-2 lender sub-lines missing').toBeTruthy();
    expect(acct!.mid).toBeGreaterThan(lender!.mid);
    expect(notes!.mid).toBeGreaterThan(acct!.mid);
  });
});
