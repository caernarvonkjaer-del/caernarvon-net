/**
 * src/core/summary-renderer.js
 *
 * Shared declarative Summary page renderer used by all nine form types.
 * Each form supplies a getSummaryConfig(D) function that returns a SummaryConfig
 * object; this module turns that config into HTML without any form-specific logic.
 *
 * Config shape (all fields optional except formTitle):
 *
 *   formTitle   {string}                  – H1 heading
 *   infoRows    {Array<{label, value}>}   – Case Info snapshot box at top
 *   leftCards   {Array<SummaryCard>}      – Left-column summary cards
 *   rightCards  {Array<SummaryCard>}      – Right-column summary cards (optional)
 *   banner      {SummaryBanner}           – Prominent bottom metric strip (optional)
 *   nextRoute   {string}                  – Route for the Next button (default '/p2')
 *
 * SummaryCard: { heading, lines: SummaryCardLine[], footerAction? }
 * SummaryCardLine: { label, value?, status?, route?, isTotal? }
 *   – status: 'complete' | 'in-progress' | 'not-started'  renders a badge
 *   – route: string  makes the label a navigation link
 *   – isTotal: true  adds the .total class (bold / top-border)
 *
 * SummaryBanner: { title, value, subtitle? }
 *
 * All navigation links use data-form-action="navigate" which is handled by the
 * global event listener in legacy-app.js and works across all form types,
 * including guardian-inventory (the global handler wraps window.navigate()).
 */

/**
 * Maps one or more computeNavChecks() keys to the 3-value status string
 * renderStatusBadge()/SummaryCardLine.status expects, so a Summary page's
 * badges can never drift from what the sidebar (applyNavChecks()) and
 * Print Preview's export gate already show for the same section -- see
 * computeNavChecks()'s own "single source of truth" comment (legacy-app.js).
 *
 * Multiple keys (e.g. Annual's single "Sch D1-D5" summary line covering
 * five separate sidebar schedule checks) are ANDed for 'complete' and
 * ORed for 'in-progress'.
 */
export function navStatus(nav, keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  if (!nav) return 'not-started';
  if (list.every(k => nav.checks?.[k])) return 'complete';
  if (list.some(k => nav.checks?.[k] || nav.incomplete?.[k])) return 'in-progress';
  return 'not-started';
}

/**
 * A stored date (YYYY-MM-DD, possibly with a time suffix) formatted for a
 * summary/print row, with an em-dash placeholder when there is no value.
 *
 * Milestone 51 (fmtDate audit) consolidated six character-identical `fd`
 * closures from the six feature index.js files into this one. It is the DISPLAY
 * formatter, and the em-dash is the whole point of it.
 *
 * DO NOT merge this with the Excel-export date helpers (`fD`/`fmtD` in the three
 * feature excel.js files) or with legacy-app.js's `fmtDate`. Those return '' for
 * an empty value because they write into spreadsheet cells and a court document
 * must show a blank, never a literal "—". They also diverge from each other in a
 * way that looks mergeable and is not: the excel.js variants' `length >= 10`
 * guard returns the ORIGINAL value for short input, preserving its type, so a
 * numeric input stays a number -- and setCell() branches on
 * `typeof value === 'number'`, so swapping them can flip a date cell between
 * numeric and text in a filed workbook. See MILESTONE-51-PROPOSAL.md's audit.
 *
 * @param {any} value
 * @returns {string}
 */
export function formatSummaryDate(value) {
  return value ? String(value).substring(0, 10) : '—';
}

export function renderStatusBadge(status) {
  if (status === 'complete')
    return `<span style="color:var(--ok-text);font-weight:600;">✓ Complete</span>`;
  if (status === 'in-progress')
    return `<span style="color:var(--warning-text,#b45309);font-weight:600;">In Progress</span>`;
  return `<span style="color:var(--danger-text);font-weight:600;">Incomplete</span>`;
}

function renderCard(card) {
  const linesHTML = (card.lines || []).map(line => {
    const labelPart = line.route
      ? `<a href="#" data-form-action="navigate" data-route="${line.route}">${line.label}</a>`
      : `<span>${line.label}</span>`;

    let valuePart;
    if (line.status !== undefined) {
      valuePart = renderStatusBadge(line.status);
    } else {
      const idAttr = line.id ? ` id="${line.id}"` : '';
      valuePart = `<span${idAttr}>${line.value ?? '—'}</span>`;
    }

    const cls = line.isTotal ? ' total' : '';
    return `<div class="summary-line${cls}">${labelPart}${valuePart}</div>`;
  }).join('');

  const footerHTML = card.footerAction
    ? `<div style="margin-top:.5rem;font-size:.78rem;">
        <a href="#" data-form-action="navigate" data-route="${card.footerAction.route}">→ ${card.footerAction.label}</a>
       </div>`
    : '';

  return `<div class="summary-box">
    <h2 class="subsection-heading">${card.heading}</h2>
    ${linesHTML}${footerHTML}
  </div>`;
}

export function renderSummaryPage(config) {
  const {
    formTitle,
    infoRows = [],
    leftCards = [],
    rightCards = [],
    banner,
    nextRoute = '/p2',
  } = config;

  // ── Case Info ────────────────────────────────────────────
  const infoHTML = infoRows.length
    ? `<div class="summary-box mb-3">
        <h2 class="subsection-heading">Case Info</h2>
        ${infoRows.map(({ label, value }) =>
          `<div class="summary-line"><span>${label}</span><span>${value || '<em style="color:var(--ink-3)">—</em>'}</span></div>`
        ).join('')}
      </div>`
    : '';

  // ── Left / Right columns ─────────────────────────────────
  const leftHTML  = leftCards.map(renderCard).join('');
  const rightHTML = rightCards.map(renderCard).join('');
  const columnsHTML = `<div class="row g-3">
    <div class="col-md-6">${leftHTML}</div>
    ${rightHTML ? `<div class="col-md-6">${rightHTML}</div>` : ''}
  </div>`;

  // ── Banner strip ─────────────────────────────────────────
  const bannerHTML = banner
    ? `<div class="summary-box summary-inventory-total" style="background:#820024;color:#fff;margin-top:1rem;">
        <div class="summary-line total" style="color:#fff;border-color:rgba(255,255,255,.2);">
          <span>${banner.title}</span>
          <span${banner.id ? ` id="${banner.id}"` : ''} style="font-size:1.05rem;">${banner.value}</span>
        </div>
        ${banner.subtitle ? `<div style="font-size:.78rem;opacity:.8;margin-top:.25rem;">${banner.subtitle}</div>` : ''}
      </div>`
    : '';

  // ── Page navigation ───────────────────────────────────────
  // Summary is always Page 2: Back = Cover (/), Next = first content page.
  const navHTML = `<div class="page-nav no-print d-flex justify-content-between align-items-center">
    <div><button class="btn btn-outline-primary btn-sm" data-form-action="navigate" data-route="/">← Back: Case Info</button></div>
    <div><button class="btn btn-primary btn-sm" data-form-action="navigate" data-route="${nextRoute}">Next →</button></div>
  </div>`;

  return `<div class="schedule-page">
  <h1>${formTitle}</h1>
  ${infoHTML}
  ${columnsHTML}
  ${bannerHTML}
  <div class="mb-3 mt-3 no-print">${navHTML}</div>
</div>`;
}
