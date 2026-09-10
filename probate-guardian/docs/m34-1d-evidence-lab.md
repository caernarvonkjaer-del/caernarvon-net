# Milestone 34-1D: PDF Evidence Lab

The reproducible evidence harness is
`tests/e2e/pdf-evidence-lab.spec.ts`. Run it with the Edge profile:

```powershell
$env:PG_BROWSER='edge'
npx.cmd playwright test tests/e2e/pdf-evidence-lab.spec.ts
```

It attaches the following artifacts to the Playwright result:

- `supplemental-pdf-evidence.json`: source byte count, PDF.js page/text
  observations, non-white canvas-pixel count, and finalized-packet page/text
  observations for a known-good supplemental PDF.
- `trust-preview-evidence.json`: a 1440x900 viewport, print-preview DOM page
  count, finalized PDF page count, pager text, and toolbar geometry.
- `trust-preview-1440x900.png`: the matching browser rendering.

## Current evidence boundary

The supplied Trust packet was inspected without committing it because it
contains personal and financial information. PDF.js parsed all 14 pages; the
in-app preview toolbar and finalized packet both reported 14 pages. Its
supplemental bank-statement page rendered cleanly, so the reported garbling
was not reproduced in that source, PDF.js, canvas, or final-packet boundary.

Visual inspection did reproduce a separate Trust-details table defect: the
percentage and amount headers collided, and a normal currency value wrapped
within the last column. The model now allocates those columns 12% and 16%
respectively, covered by the redacted
`annual-accounting-pdf-model.spec.js` regression.

If a different garbled source PDF is supplied, add a redacted, minimally
scoped fixture and record the first divergent boundary with the same harness.
