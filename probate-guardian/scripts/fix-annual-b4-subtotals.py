#!/usr/bin/env python
"""Correct the Annual workbook's Schedule B-4 subtotal formulas (Milestone 73T-1).

WHAT IS WRONG
-------------
Each B-4 register page (SCH B-4 OTHER DISB p2..p51) carries a hidden grid
that sorts the page's payments into the summary's eighteen categories: one
grid row per category, one grid column per payment row, every cell
IF(E<row>="<category>",I<row>,0) -- the payment row's category (E) and amount
(I). The SUMMARY sheet adds the grid rows up across every page.

In the Clerk's own workbook some grid cells test the wrong cells:

  - "Taxes: Intangible": on p2, p4-p11 and p13-p19 the first column tests
    the next row's date and check-number columns (D, H) -- e.g. p2's L23 is
    IF(D21="Taxes: Intangible",H21,0) where its column stands for row 20 -- so
    an intangible-tax payment on a page's first row is never counted;
  - "Utilities": on p8 every column but the first tests the row below its
    own (M23 tests row 10 where M stands for row 9), so the page's second
    payment row is never counted; on p12 the first column tests D9/H9.

scripts/extend-annual-b4-blocks.py copied p8-p11 into p20-p51, and the
defects with them: 301 cells in all. A filing whose intangible-tax or
utilities payment sits on one of those rows filed a SUMMARY -- and Part VI H16
and Line 20 -- short of the PDF.

The requester, the Clerk's representative, approved correcting all 301 in the
app's copy of the workbook (2026-10-04, decision 73T-1; the full count
2026-10-07). AGENTS.md section 5: the Clerk's workbook is authoritative, and
diverging from it needs that named approval; it is recorded in
MILESTONE-73-PROPOSAL.md.

WHAT IT DOES
------------
For each register page, from the grid's own pattern: the first grid column's
payment row (the row most of that column's cells test), one row per column
after it, and each grid row's category (the category most of its cells
test). Every grid cell is then rewritten to IF(E<r>="<cat>",I<r>,0) for its
column's row r and its row's category, and its cached value set to 0 --
the file is marked to recalculate on opening (Milestone 74Q). Only cells
whose formula differs are touched.

The cells are found with a self-closing-safe scan (AGENTS.md section 10, P2:
a cell's end is searched for only after its own start tag, which must not be
self-closing), and the result is verified with a parser by
tests/unit/annual-b4-subtotals.spec.js, which also checks that no other cell
changed.

Usage:  python scripts/fix-annual-b4-subtotals.py [--check]
        --check reports the defective cells and writes nothing.
"""
import base64
import collections
import io
import os
import re
import sys
import zipfile

TEMPLATE_JS = os.path.join('templates', 'annual-template.js')
PAYLOAD = r'(export default ")([A-Za-z0-9+/=]+)(")'
PREFIX = 'SCH B-4 OTHER DISB p'
IF_RE = re.compile(r'^IF\(([A-Z]+)(\d+)="([^"]+)",([A-Z]+)(\d+),0\)$')


def col_num(col):
    n = 0
    for ch in col:
        n = n * 26 + ord(ch) - 64
    return n


def num_col(n):
    s = ''
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def unescape(s):
    return s.replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&apos;', "'")


def escape_text(s):
    # Element text: quotation marks stay as Excel writes them.
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def cells_with_formulas(xml):
    """(ref, start, end, formula) for every non-self-closing <c> holding a plain <f>."""
    out = []
    for m in re.finditer(r'<c\s', xml):
        start = m.start()
        tag_end = xml.index('>', start)
        if xml[tag_end - 1] == '/':
            continue  # self-closing: no content, never searched past
        ref = re.search(r'\sr="([A-Z]+\d+)"', xml[start:tag_end + 1]).group(1)
        end = xml.index('</c>', tag_end) + len('</c>')
        body = xml[tag_end + 1:end - len('</c>')]
        f = re.match(r'<f>([^<]*)</f>', body)
        if f:
            out.append((ref, start, end, unescape(f.group(1))))
    return out


def plan_page(xml):
    """The defective grid cells of one register page: [(ref, start, end, old, new)]."""
    grid = []
    for ref, start, end, f in cells_with_formulas(xml):
        m = IF_RE.match(f)
        if m:
            col, row = re.match(r'([A-Z]+)(\d+)', ref).groups()
            grid.append((ref, start, end, f, col, int(row), m))
    if not grid:
        return []
    by_col = collections.defaultdict(list)
    by_row = collections.defaultdict(list)
    for g in grid:
        by_col[g[4]].append(int(g[6].group(2)))
        by_row[g[5]].append(g[6].group(3))
    first_col = min(by_col, key=col_num)
    first_row = collections.Counter(by_col[first_col]).most_common(1)[0][0]
    # The first column's own row is checked against the second's: a column
    # whose cells mostly test the wrong row can't be its own reference.
    cols = sorted(by_col, key=col_num)
    second = collections.Counter(by_col[cols[1]]).most_common(1)[0][0]
    assert second == first_row + 1, ('grid columns are not consecutive rows', first_col, first_row, cols[1], second)
    cat_of = {r: collections.Counter(c).most_common(1)[0][0] for r, c in by_row.items()}
    fixes = []
    for ref, start, end, f, col, row, m in grid:
        r = first_row + col_num(col) - col_num(first_col)
        want = 'IF(E%d="%s",I%d,0)' % (r, cat_of[row], r)
        if f != want:
            fixes.append((ref, start, end, f, want))
    return fixes


def sheet_parts(z):
    wb = z.read('xl/workbook.xml').decode('utf-8')
    rels = z.read('xl/_rels/workbook.xml.rels').decode('utf-8')
    rel = dict(re.findall(r'Id="([^"]+)"[^>]*?Target="([^"]+)"', rels))
    rel.update({a: b for b, a in re.findall(r'Target="([^"]+)"[^>]*?Id="([^"]+)"', rels)})
    out = {}
    for tag in re.findall(r'<sheet\b[^>]*?/>', wb):
        name = unescape(re.search(r'name="([^"]*)"', tag).group(1))
        rid = re.search(r'r:id="([^"]+)"', tag).group(1)
        out[name] = 'xl/' + rel[rid].lstrip('/').replace('xl/', '', 1) if not rel[rid].startswith('xl/') else rel[rid]
    return out


def main():
    src = open(TEMPLATE_JS, encoding='utf-8').read()
    m = re.search(PAYLOAD, src)
    data = base64.b64decode(m.group(2))
    zin = zipfile.ZipFile(io.BytesIO(data))
    parts = sheet_parts(zin)
    pages = sorted((n for n in parts if n.startswith(PREFIX) and n[len(PREFIX):].isdigit()), key=lambda n: int(n[len(PREFIX):]))
    plans = {}
    total = 0
    for name in pages:
        xml = zin.read(parts[name]).decode('utf-8')
        fixes = plan_page(xml)
        if fixes:
            plans[parts[name]] = (name, xml, fixes)
            total += len(fixes)
            print('%s: %d cell(s), e.g. %s %s -> %s' % (name, len(fixes), fixes[0][0], fixes[0][3], fixes[0][4]))
    print('defective cells:', total)
    if '--check' in sys.argv or not total:
        return 1 if total else 0
    out = io.BytesIO()
    zout = zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED)
    for info in zin.infolist():
        body = zin.read(info.filename)
        if info.filename in plans:
            name, xml, fixes = plans[info.filename]
            for ref, start, end, old, new in sorted(fixes, key=lambda f: -f[1]):
                cell = xml[start:end]
                cell, n = re.subn(r'<f>[^<]*</f>', lambda _m: '<f>%s</f>' % escape_text(new), cell, count=1)
                assert n == 1, (name, ref)
                cell = re.sub(r'<v>[^<]*</v>', '<v>0</v>', cell, count=1)
                xml = xml[:start] + cell + xml[end:]
            body = xml.encode('utf-8')
        zout.writestr(info, body)
    zout.close()
    open(TEMPLATE_JS, 'w', encoding='utf-8', newline='').write(src[:m.start(2)] + base64.b64encode(out.getvalue()).decode('ascii') + src[m.end(2):])
    print('wrote', TEMPLATE_JS)
    return 0


if __name__ == '__main__':
    sys.exit(main())
