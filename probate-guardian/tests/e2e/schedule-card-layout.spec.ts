import { test, expect } from '@playwright/test';
import { createSimplifiedWard, createWard, freshStartNoPassword } from './support/target';

test('schedule entry cards use responsive two-column flow', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Schedule Layout Ward', 'guardian'));
  await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
  await page.evaluate(() => {
    const data = (window as any).D;
    data.scheduleA2 = [{ lenderName: 'Lender', lenderAddress: '1 Main Street', lenderCityStateZip: 'Tampa, FL 33602', liabilityType: 'Mortgage', accountNumber: '1', notes: '', fullDebtBalance: 1000, wardPercent: 100 }];
    data.scheduleB1 = [
      { institutionName: 'Bank One', accountType: 'Checking', accountNumber: '1', streetAddress: '1 Main Street', cityStateZip: 'Tampa, FL 33602', fullAssetAmount: 1000, wardPercent: 100 },
      { institutionName: 'Bank Two', accountType: 'Savings', accountNumber: '2', streetAddress: '2 Main Street', cityStateZip: 'Tampa, FL 33602', fullAssetAmount: 2000, wardPercent: 100 },
    ];
    data.scheduleB2 = [
      { description: 'Vehicle', streetAddress: '1 Main Street', cityStateZip: 'Tampa, FL 33602', valuationMethod: 'KBB', fullAssetValue: 1000, wardPercent: 100 },
      { description: 'Furniture', streetAddress: '1 Main Street', cityStateZip: 'Tampa, FL 33602', valuationMethod: 'Inventory', fullAssetValue: 500, wardPercent: 100 },
    ];
    data.scheduleB3 = [
      { description: 'IRA', streetAddress: '1 Main Street', cityStateZip: 'Tampa, FL 33602', fullAssetValue: 1000, wardPercent: 100 },
      { description: 'Bond', streetAddress: '1 Main Street', cityStateZip: 'Tampa, FL 33602', fullAssetValue: 500, wardPercent: 100 },
    ];
  });
  await page.evaluate(() => (window as any).navigate('/'));

  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ['/a2', '/b1', '/b2', '/b3']) {
    await page.evaluate((nextRoute) => (window as any).navigate(nextRoute), route);
    const cards = page.locator('.schedule-entry-grid > .col-12 > .entry-card');
    await expect(cards.first()).toBeVisible();
    const columns = await cards.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
    const firstWidth = await cards.first().evaluate(element => (element as HTMLElement).getBoundingClientRect().width);
    if (route === '/a2') {
      expect(columns, `${route} desktop columns`).toBe(1);
      expect(firstWidth).toBeLessThan(700);
    } else {
      expect(columns, `${route} desktop columns`).toBe(2);
    }
  }

  await page.setViewportSize({ width: 700, height: 900 });
  await page.evaluate(() => (window as any).navigate('/b1'));
  const mobileCards = page.locator('.schedule-entry-grid > .col-12 > .entry-card');
  const mobileColumns = await mobileCards.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(mobileColumns).toBe(1);
});

test('Guardian D-3 and D-4 summary panels use responsive two-column rows', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Guardian Summary Layout Ward', 'guardian'));
  await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });

  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ['/d3', '/d4']) {
    await page.evaluate((nextRoute) => (window as any).navigate(nextRoute), route);
    const panels = page.locator('.schedule-page > .row.g-3 > .col-12.col-lg-6 > .summary-box');
    await expect(panels).toHaveCount(2);
    const desktopColumns = await panels.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
    expect(desktopColumns, `${route} desktop columns`).toBe(2);
  }

  await page.setViewportSize({ width: 700, height: 900 });
  await page.evaluate(() => (window as any).navigate('/d4'));
  const mobilePanels = page.locator('.schedule-page > .row.g-3 > .col-12.col-lg-6 > .summary-box');
  const mobileColumns = await mobilePanels.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(mobileColumns).toBe(1);
});

test('Annual Accounting schedule entries use responsive Bootstrap grid columns', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Annual Schedule Layout Ward', 'annual'));
  await page.evaluate(() => {
    const data = (window as any).D;
    data.schA = [
      { payer: 'Social Security', description: 'Monthly benefit', bank: 'Bank One', accountNo: '1', amount: 1000 },
      { payer: 'Pension', description: 'Monthly benefit', bank: 'Bank Two', accountNo: '2', amount: 500 },
    ];
    data.schB1 = [
      { bankAcct: '1', checkNo: '100', periodFrom: '2026-01-01', periodTo: '2026-01-31', datePaid: '2026-02-01', payee: 'Attorney One', courtOrderDate: '2026-01-15', amount: 100 },
      { bankAcct: '2', checkNo: '101', periodFrom: '2026-02-01', periodTo: '2026-02-28', datePaid: '2026-03-01', payee: 'Attorney Two', courtOrderDate: '2026-02-15', amount: 200 },
    ];
  });

  // Schedule A used to be pinned to a single column (a bare .col-12 with no
  // lg-breakpoint pairing) while every other schedule paired up at col-lg-6
  // -- an inconsistency, not a deliberate design choice, fixed to match its
  // siblings (and Guardian Inventory's own two-per-row schedules).
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.evaluate(() => (window as any).navigate('/scha'));
  const incomeColumns = page.locator('.schedule-entry-grid > .col-12.col-lg-6 > .entry-card');
  await expect(incomeColumns).toHaveCount(2);
  const incomeXPositions = await incomeColumns.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(incomeXPositions).toBe(2);

  // Schedule B-1 (and every other B/C/D/E/F schedule) used to only pair up
  // at the xxl breakpoint (1400px of VIEWPORT width, not available card
  // width) -- effectively never on a laptop with the sidebar taking its
  // share of the window. Lowered to col-lg-6, the same breakpoint Guardian
  // Inventory already uses for its own schedule cards.
  await page.evaluate(() => (window as any).navigate('/schb1'));
  const feeColumns = page.locator('.schedule-entry-grid > .col-12.col-lg-6 > .entry-card');
  await expect(feeColumns).toHaveCount(2);
  const feeXPositions = await feeColumns.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(feeXPositions).toBe(2);

  await page.setViewportSize({ width: 700, height: 900 });
  const mobileXPositions = await feeColumns.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(mobileXPositions).toBe(1);
});

test('plan record cards use their responsive Bootstrap grid classifications', async ({ page }) => {
  const assertCardColumns = async (route: string, columnClass: string, expectedDesktopColumns: number, containerSelector = '.schedule-entry-grid') => {
    await page.evaluate((nextRoute) => (window as any).navigate(nextRoute), route);
    const cards = page.locator(`${containerSelector} > ${columnClass} > .entry-card`);
    await expect(cards).toHaveCount(2);
    const xPositions = await cards.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
    expect(xPositions, `${route} desktop columns`).toBe(expectedDesktopColumns);
    return cards;
  };

  await freshStartNoPassword(page);
  await createWard(page, 'Annual Plan Layout Ward', 'planAnnual');
  await page.evaluate(() => {
    const data = (window as any).D;
    data.q1Residences = [{}, {}];
    data.q4Providers = [{}, {}];
    data.q10Executed = true;
    data.q10Directives = [{}, {}];
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await assertCardColumns('/p2', '.col-12.col-lg-6', 2);
  await assertCardColumns('/p5', '.col-12.col-lg-6', 2);
  await assertCardColumns('/p9', '.col-12', 1);

  await createWard(page, 'Initial Plan Layout Ward', 'planInitial');
  await page.evaluate(() => {
    const data = (window as any).D;
    data.q9Providers = [{}, {}];
    // Milestone 37-4: q11Directives cards only render once q11Executed is
    // checked (previously rendered unconditionally -- the bug that item
    // fixed), so this fixture needs the flag, matching Annual Plan's
    // q10Executed above.
    data.q11Executed = true;
    data.q11Directives = [{}, {}];
  });
  await assertCardColumns('/p5', '.col-12.col-lg-6', 2);
  await assertCardColumns('/p8', '.col-12', 1);

  await createWard(page, 'Minor Plan Layout Ward', 'planMinor');
  await page.evaluate(() => {
    const data = (window as any).D;
    data.q2Residences = [{}, {}];
    data.q3Providers = [{}, {}];
  });
  await assertCardColumns('/p2', '.col-12.col-lg-6', 2);
  const minorProviderCards = await assertCardColumns('/p3', '.col-12.col-lg-6', 2);

  await page.setViewportSize({ width: 700, height: 900 });
  const mobileXPositions = await minorProviderCards.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(mobileXPositions).toBe(1);

  await createSimplifiedWard(page, 'Simplified Accounting Layout Ward');
  await page.evaluate(() => {
    const data = (window as any).D;
    data.guardians = [{ name: 'Guardian 1' }, { name: 'Guardian 2' }];
    data.remuneration = [{ guardian: 'Guardian 1', type: 'Services' }, { guardian: 'Guardian 2', type: 'Care' }];
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await assertCardColumns('/p4', '.col-12.col-lg-6', 2, '.card-grid-2col');
  await assertCardColumns('/p7', '.col-12.col-lg-6', 2);

  await createWard(page, 'Simplified Plan Layout Ward', 'planSimplified');
  await page.evaluate(() => (window as any).navigate('/p2'));
  await expect(page.locator('.entry-card')).toHaveCount(0);
});

test('multi-column labels retain their required marker and natural height', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Plan Label Layout Ward', 'planAnnual');
  await page.evaluate(() => {
    (window as any).D.q1Residences = [{}];
    (window as any).navigate('/p2');
  });
  await page.setViewportSize({ width: 800, height: 900 });

  const label = page.locator('.entry-card .row.g-2 .form-label').filter({ hasText: 'Facility name' });
  await expect(label).toBeVisible();
  const layout = await label.evaluate((element) => {
    const marker = element.querySelector('.req') as HTMLElement;
    const range = document.createRange();
    range.selectNodeContents(element.firstChild!);
    const textLines = [...range.getClientRects()];
    const lastTextLine = textLines.at(-1)!;
    return {
      markerTop: marker.getBoundingClientRect().top,
      lastTextBottom: lastTextLine.bottom,
      minHeight: getComputedStyle(element).minHeight,
    };
  });
  expect(layout.markerTop).toBeLessThanOrEqual(layout.lastTextBottom + 1);
  // Milestone 40I: 'auto', not '0px' -- an element with no min-height rule
  // applying to it at all computes to the CSS spec's initial value ('auto'),
  // confirmed by actually running this against the deleted rule rather than
  // assumed. '0px' would only be correct if something explicitly zeroed it.
  expect(layout.minHeight).toBe('auto');
});

// Milestone 40I: the reported bug, pinned directly. Schedule B-4's Category
// field (a hand-rolled <select>, no wrapper div) sat lower than its
// inpD()-built row-mates (Check #, Date Paid, Payee, Amount, each wrapped in
// an extra <div class="mb-2"> by renderFormField()) -- forms.css's deleted
// rule matched the hand-rolled label as a direct column child but missed the
// wrapped ones one level deeper, forcing min-height onto only one side of
// the row. This is one of 13 confirmed sites across five files (see
// MILESTONE-40I-PROPOSAL.md's blast-radius audit); this test pins the one
// from the live screenshot that started the proposal.
test('Schedule B-4 Category aligns with its primitive-built row-mates (reported bug)', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'B4 Alignment Ward', 'annual');
  await page.evaluate(() => {
    (window as any).D.schB4 = [{}];
    (window as any).navigate('/schb4');
  });
  await page.setViewportSize({ width: 1280, height: 900 });

  const row = page.locator('.entry-card-body .row.g-2').first();
  const categoryInputTop = await row.locator('select[data-annual-path="schB4.0.category"]').evaluate(el => Math.round(el.getBoundingClientRect().top));
  const payeeInputTop = await row.locator('[data-annual-path="schB4.0.payee"]').evaluate(el => Math.round(el.getBoundingClientRect().top));

  // Within a couple of pixels, not pixel-perfect -- rounding/border-width
  // differences between an <input> and a <select> account for the rest.
  expect(Math.abs(categoryInputTop - payeeInputTop)).toBeLessThanOrEqual(3);

  await createWard(page, 'Inventory Affix Ward', 'guardian');
  await page.evaluate(() => {
    (window as any).D.scheduleB1 = [{ institutionName: 'Bank One', fullAssetAmount: 1000 }];
    (window as any).navigate('/b1');
  });
  const affix = page.locator('.input-group-text').first();
  await expect(affix).toBeVisible();
  expect(await affix.evaluate((element) => getComputedStyle(element).fontSize)).toBe('14.08px');
});

// Milestone 40I's own residual, deferred at the time (see
// MILESTONE-40I-PROPOSAL.md's "Three corrections" #3): deleting the
// blanket min-height rule correctly fixed every hand-rolled/primitive
// mismatch, but left one narrower case unaddressed -- a row where BOTH
// fields are hand-rolled (no primitive sibling, so the original bug never
// touched it) can still misalign when one label wraps to two lines and its
// sibling's doesn't. Confirmed here at Plan Initial's Q11 "Name of person
// who signed" / "Relationship of Agent(s)/Surrogate(s) to the Ward" pair --
// the exact site 40I measured (nameInputTop 1048 < relLabelBottom 1059
// pre-fix). Fixed with a narrowly-scoped opt-in class
// (`.label-2line-reserve`, forms.css) on just these two labels, not a
// structural selector -- the two prior, broader attempts at this same
// territory (a `:has()` rule, then a direct-child `[class*="col-"] >
// .form-label` rule) were both removed because they also matched every
// primitive-built field's `.mb-2`-wrapped label somewhere else in the app.
test('Plan Initial Q11 Name/Relationship labels align across sibling columns when one wraps to two lines', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Q11 Directive Alignment Ward', 'planInitial');
  await page.evaluate(() => {
    const data = (window as any).D;
    data.q11Executed = true;
    data.q11Directives = [{
      title: 'DNR Order',
      dateSigned: '2025-01-01',
      signedBy: 'Jane Guardian',
      relationship: 'Daughter and Healthcare Surrogate',
    }];
    (window as any).navigate('/p8');
  });
  await page.setViewportSize({ width: 576, height: 1100 });

  const card = page.locator('.entry-card').first();
  const relLabel = card.locator('.form-label', { hasText: 'Relationship of Agent(s)/Surrogate(s) to the Ward' });
  const nameInput = card.locator('input[data-field-path="q11Directives.0.signedBy"]');
  const relInput = card.locator('input[data-field-path="q11Directives.0.relationship"]');

  // Confirm the label genuinely renders as two lines at this width --
  // don't assert against a case that silently fits on one line.
  const relLabelLineCount = await relLabel.evaluate((el) => Math.round(el.getBoundingClientRect().height / 17));
  expect(relLabelLineCount).toBeGreaterThanOrEqual(2);

  const nameInputTop = await nameInput.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  const relInputTop = await relInput.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  // Within a couple of pixels, not pixel-perfect -- subpixel rounding
  // between the two labels' own fractional heights accounts for the rest
  // (same tolerance the Schedule B-4 test above this one uses).
  expect(Math.abs(nameInputTop - relInputTop)).toBeLessThanOrEqual(2);
});

test('tablet-band schedule field rows do not overflow horizontally or render narrower than 118px', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Tablet Layout Ward', 'annual'));
  await page.evaluate(() => {
    const data = (window as any).D;
    data.schB1 = [
      { bankAcct: '1', checkNo: '100', periodFrom: '2026-01-01', periodTo: '2026-01-31', datePaid: '2026-02-01', payee: 'Attorney One', courtOrderDate: '2026-01-15', amount: 100 },
    ];
    data.schD1 = [
      { description: 'Bank Checking Account', accountNo: '1234', restricted: 'No', type: 'Checking', fullAmount: 100, wardPct: 1 },
    ];
  });

  const tabletViewports = [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ];

  for (const viewport of tabletViewports) {
    await page.setViewportSize(viewport);
    for (const route of ['/schb1', '/schd1']) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await expect(page.locator('.schedule-page')).toBeVisible();

      const rowMetrics = await page.locator('.schedule-page .row:has(>[class*="col-"])').evaluateAll((rows) =>
        rows.map((r) => {
          const rowEl = r as HTMLElement;
          const cols = [...rowEl.querySelectorAll<HTMLElement>(':scope > [class*="col-"]')];
          const minColWidth = cols.reduce((min, c) => Math.min(min, c.getBoundingClientRect().width), Infinity);
          return {
            noHorizontalOverflow: rowEl.scrollWidth <= rowEl.clientWidth + 1,
            minColWidth: cols.length ? minColWidth : 999,
          };
        })
      );

      for (const m of rowMetrics) {
        expect(m.noHorizontalOverflow, `no horizontal overflow at ${viewport.width}x${viewport.height} on ${route}`).toBe(true);
        expect(m.minColWidth, `column width >= 118px floor at ${viewport.width}x${viewport.height} on ${route}`).toBeGreaterThanOrEqual(118);
      }
    }
  }
});

