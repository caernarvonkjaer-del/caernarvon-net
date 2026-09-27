// Preview & Export notes for small Schedule D ward shares on the Annual
// Accounting family. The Annual Accounting reads Ward's % as a percentage
// everywhere -- the field says "if the ward owns 50%, enter 50" -- since
// 2026-09-24; before that, any value of 1 or less was read as a fraction, so
// a 1% share counted as 100% on screen, in the PDF and in the court workbook
// (tests/e2e/annual-ward-share-export.spec.ts). A filer who typed a fraction
// under the old reading (0.5 meaning half) now gets 0.5%; this says so for
// every share above 0 and at most 1, without blocking anything.

const SCHEDULES = [['schD1', 'D-1'], ['schD2', 'D-2'], ['schD3', 'D-3'], ['schD4', 'D-4'], ['schD5', 'D-5']];

/** Advisory notes for Schedule D ward shares above 0 and at most 1. */
export function wardShareAdvisories(filing) {
  if (!filing) return [];
  const out = [];
  for (const [key, label] of SCHEDULES) {
    const rows = Array.isArray(filing[key]) ? filing[key] : [];
    rows.forEach((row, i) => {
      const raw = row?.wardPct;
      if (raw === '' || raw == null) return;
      const p = parseFloat(raw);
      if (!Number.isFinite(p) || p <= 0 || p > 1) return;
      out.push({
        code: 'ward-share.small',
        severity: 'advisory',
        field: `${key}.${i}.wardPct`,
        message: `Schedule ${label} — Line ${i + 1} — Ward's % reads as ${p}%. If the ward's share is the whole amount, enter 100.`,
      });
    });
  }
  return out;
}
