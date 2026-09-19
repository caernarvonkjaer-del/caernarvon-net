#!/usr/bin/env python
"""Extend the Annual Accounting workbook's Schedule B-4 to 12 bank accounts.

WHY THIS IS AN OFFLINE SCRIPT, NOT RUNTIME CODE
-----------------------------------------------
The court's workbook holds four B-4 account blocks (register pages p2-p19,
with the pre-printed Line # restarting at 1 on p2, p8, p12 and p16). Milestone
57D needs more, and Alan -- planning and compliance officer for the Clerk of
the Circuit Court, Pinellas County -- authorised extending the form's own
pattern on 2026-09-19, speaking for the form's owner.

Cloning these pages at export time was considered and rejected. Each register
page carries ~500 formulas, ~70 merged ranges, a data validation and its own
page setup, and ExcelJS has no worksheet-clone API -- so a runtime clone means
hand-copying all of that on every export, on a legal document, which is the
silent-corruption risk AGENTS.md section 13 exists to prevent. Done here, the
extension is generated once, verified, and committed as an artifact, the same
way the embedded fonts are.

Python rather than .mjs (the convention for scripts/) because this is zip and
XML surgery and the standard library does it directly; Node has no bundled zip
reader and the vendored ExcelJS build does not load outside a browser.

WHAT IT DOES
------------
Blocks 5-12 are clones of block 2 (p8-p11) because that block's shape is the
generic one: a 30-row first page followed by three 27-row continuation pages,
carrying Line # 1-30, 31-57, 58-84, 85-111. Cloning it verbatim therefore
reproduces the court's own numbering with no renumbering needed. Only three
things are patched:

  1. each new page's C5 label ("Page 8" -> "Page 20", ...);
  2. the 18 category formulas on SCH B-4 OTHER DISB SUMMARY p1, which name
     every register page's hidden per-category subtotal cell one by one and
     would otherwise be blind to the new pages -- this is the "totals
     summarising all account information" that Alan specifically called out;
  3. that summary sheet's own heading, "SUMMARY OF PAGES 1 TO 18 FOR ALL
     ACCOUNTS BY CATEGORY".

calcChain.xml is dropped rather than patched. It is a recalculation hint,
Excel rebuilds it on open, and a stale one naming cells that have moved is
worse than none.

Usage:  python scripts/extend-annual-b4-blocks.py [--check]
        --check verifies the committed template and writes nothing.
"""
import base64
import os
import re
import shutil
import sys
import tempfile
import zipfile

TEMPLATE_JS = os.path.join('templates', 'annual-template.js')
JS_PREFIX = 'window.EMBEDDED_TEMPLATES=window.EMBEDDED_TEMPLATES||{},window.EMBEDDED_TEMPLATES.annual="'
JS_SUFFIX = '";\n'

SHEET_PREFIX = 'SCH B-4 OTHER DISB '
SUMMARY_SHEET = SHEET_PREFIX + 'SUMMARY p1'
SOURCE_BLOCK = ['p8', 'p9', 'p10', 'p11']   # the generic block shape
EXISTING_LAST_PAGE = 19                      # p2..p19 ship in the court's file
TARGET_ACCOUNTS = 12                         # blocks 1-4 exist; add 5-12
CATEGORY_ROWS = range(10, 28)                # I10..I27, one per disbursement category
LABEL_CELL = 'I5'                            # "Page N" lives at I5, NOT C5
EXISTING_REGISTER_COUNT = 18                 # p2..p19 -- the heading counts pages, not page numbers

# Per-page subtotal cell the summary reads, by position within a block.
# Verified against the shipped formulas: block-first pages use AP{7+k},
# continuation pages AM{8+k}, where k is the category index (0-17).
FIRST_PAGE_COL, FIRST_PAGE_ROW0 = 'AP', 7
CONT_PAGE_COL, CONT_PAGE_ROW0 = 'AM', 8


def accounts_for(last_page):
    """Block 1 is six pages (p2-p7); every later block is four."""
    if last_page < 7:
        return 0
    return 1 + (last_page - 7) // 4


def read_template_bytes():
    src = open(TEMPLATE_JS, encoding='utf-8').read()
    m = re.search(r'annual="([A-Za-z0-9+/=]+)"', src)
    if not m:
        raise SystemExit('could not find the base64 payload in ' + TEMPLATE_JS)
    return base64.b64decode(m.group(1))


def sheet_map(z):
    """name -> worksheet part path, plus the raw workbook/rels XML."""
    wb = z.read('xl/workbook.xml').decode('utf-8')
    rels = z.read('xl/_rels/workbook.xml.rels').decode('utf-8')
    rid_target = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels))
    names = {}
    for name, rid in re.findall(r'<sheet name="([^"]+)"[^>]*r:id="([^"]+)"', wb):
        names[name] = 'xl/' + rid_target[rid].lstrip('/')
    return names, wb, rels


def shared_strings(z):
    xml = z.read('xl/sharedStrings.xml').decode('utf-8')
    items = re.findall(r'<si>(.*?)</si>', xml, re.S)
    texts = [re.sub(r'<[^>]+>', '', i) for i in items]
    return xml, items, texts


def check(path_bytes):
    """Verify a built workbook rather than trusting the build."""
    tmp = tempfile.mkdtemp()
    p = os.path.join(tmp, 'check.xlsx')
    open(p, 'wb').write(path_bytes)
    z = zipfile.ZipFile(p)
    names, wb, rels = sheet_map(z)
    regs = sorted(
        (int(n.rsplit('p', 1)[1]) for n in names
         if n.startswith(SHEET_PREFIX) and 'SUMMARY' not in n))
    problems = []
    expected_last = EXISTING_LAST_PAGE + (TARGET_ACCOUNTS - 4) * 4
    if regs != list(range(2, expected_last + 1)):
        problems.append('register pages are %s, expected p2..p%d' % (regs, expected_last))

    # Every sheet id and relationship id must stay unique.
    ids = re.findall(r'<sheet [^>]*sheetId="(\d+)"', wb)
    rids = re.findall(r'<sheet [^>]*r:id="([^"]+)"', wb)
    if len(set(ids)) != len(ids):
        problems.append('duplicate sheetId values')
    if len(set(rids)) != len(rids):
        problems.append('duplicate r:id values')
    targets = re.findall(r'Target="(worksheets/[^"]+)"', rels)
    if len(set(targets)) != len(targets):
        problems.append('duplicate worksheet targets in workbook rels')

    # Content types must declare every worksheet part.
    ct = z.read('[Content_Types].xml').decode('utf-8')
    for part in set(names.values()):
        if '/' + part not in ct:
            problems.append('missing content-type override for ' + part)

    # Every register page must be labelled with its own page number. The first
    # build of this script patched the wrong cell, matched nothing, and shipped
    # 32 pages all captioned "Page 8" through "Page 11" -- structurally valid
    # and visibly wrong on a filed document. Assert it rather than trust it.
    ss_texts = shared_strings(z)[2]
    for pg in regs:
        part = names[SHEET_PREFIX + 'p%d' % pg]
        x = z.read(part).decode('utf-8')
        m = re.search(r'<c r="%s"[^>]*t="s"[^>]*><v>(\d+)</v>' % LABEL_CELL, x)
        if not m:
            problems.append('p%d has no shared-string label at %s' % (pg, LABEL_CELL))
            continue
        idx = int(m.group(1))
        got = ss_texts[idx] if idx < len(ss_texts) else '<index %d out of range>' % idx
        if got.strip() != 'Page %d' % pg:
            problems.append('p%d is labelled %r, expected %r' % (pg, got, 'Page %d' % pg))

    # The summary must name every register page in every category row.
    sx = z.read(names[SUMMARY_SHEET]).decode('utf-8')
    for row in CATEGORY_ROWS:
        m = re.search(r'<c r="I%d"[^>]*>(.*?)</c>' % row, sx, re.S)
        f = re.search(r'<f[^>]*>(.*?)</f>', m.group(1), re.S) if m else None
        if not f:
            problems.append('I%d has no formula' % row)
            continue
        named = set(int(x) for x in re.findall(r"OTHER DISB p(\d+)'!", f.group(1)))
        missing = set(regs) - named
        if missing:
            problems.append('I%d omits pages %s' % (row, sorted(missing)))
    return problems, len(names), regs


def build():
    raw = read_template_bytes()
    tmp = tempfile.mkdtemp()
    src_path = os.path.join(tmp, 'src.xlsx')
    open(src_path, 'wb').write(raw)
    z = zipfile.ZipFile(src_path)
    names, wb_xml, rels_xml = sheet_map(z)
    ct_xml = z.read('[Content_Types].xml').decode('utf-8')
    ss_xml, ss_items, ss_texts = shared_strings(z)

    for p in SOURCE_BLOCK:
        if SHEET_PREFIX + p not in names:
            raise SystemExit('source block page missing: ' + p)

    parts = {n: z.read(n) for n in z.namelist()}
    existing_sheet_nums = [
        int(m.group(1)) for n in parts
        for m in [re.match(r'xl/worksheets/sheet(\d+)\.xml$', n)] if m]
    next_sheet_num = max(existing_sheet_nums) + 1
    next_rid = max(int(m) for m in re.findall(r'Id="rId(\d+)"', rels_xml)) + 1
    next_sheet_id = max(int(m) for m in re.findall(r'sheetId="(\d+)"', wb_xml)) + 1

    new_sheet_tags, new_rel_tags, new_ct_tags = [], [], []
    added = []                      # (page_number, position_in_block)
    page_no = EXISTING_LAST_PAGE

    for _block in range(4, TARGET_ACCOUNTS):
        for pos, src_page in enumerate(SOURCE_BLOCK):
            page_no += 1
            src_part = names[SHEET_PREFIX + src_page]
            xml = parts[src_part].decode('utf-8')

            # Patch the page label at C5. It is a shared string; add ours.
            label = 'Page %d' % page_no
            if label in ss_texts:
                idx = ss_texts.index(label)
            else:
                idx = len(ss_texts)
                ss_texts.append(label)
                ss_items.append('<t>%s</t>' % label)
            pat = re.compile(r'(<c r="%s"[^>]*t="s"[^>]*><v>)\d+(</v>)' % LABEL_CELL)
            xml, n_sub = pat.subn(lambda m: m.group(1) + str(idx) + m.group(2), xml, count=1)
            if n_sub != 1:
                # A silent no-op here is how every cloned page ends up labelled
                # with its source page's number. Refuse rather than ship that.
                raise SystemExit(
                    'page label patch matched %d cells at %s on %s -- expected exactly 1'
                    % (n_sub, LABEL_CELL, src_page))

            new_part = 'xl/worksheets/sheet%d.xml' % next_sheet_num
            parts[new_part] = xml.encode('utf-8')
            src_rels = 'xl/worksheets/_rels/%s.rels' % os.path.basename(src_part)
            if src_rels in parts:
                parts['xl/worksheets/_rels/sheet%d.xml.rels' % next_sheet_num] = parts[src_rels]

            rid = 'rId%d' % next_rid
            new_sheet_tags.append(
                '<sheet name="%s%s" sheetId="%d" r:id="%s"/>'
                % (SHEET_PREFIX, 'p%d' % page_no, next_sheet_id, rid))
            new_rel_tags.append(
                '<Relationship Id="%s" Type="http://schemas.openxmlformats.org/'
                'officeDocument/2006/relationships/worksheet" '
                'Target="worksheets/sheet%d.xml"/>' % (rid, next_sheet_num))
            new_ct_tags.append(
                '<Override PartName="/%s" ContentType="application/vnd.'
                'openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' % new_part)
            added.append((page_no, pos))
            next_sheet_num += 1
            next_rid += 1
            next_sheet_id += 1

    # Register the new sheets immediately after the last existing B-4 page so
    # the tab order still reads p2, p3, ... rather than jumping to the end.
    anchor = re.search(
        r'<sheet name="%sp%d"[^>]*/>' % (re.escape(SHEET_PREFIX), EXISTING_LAST_PAGE), wb_xml)
    if not anchor:
        raise SystemExit('could not locate the p%d sheet tag' % EXISTING_LAST_PAGE)
    wb_xml = wb_xml[:anchor.end()] + ''.join(new_sheet_tags) + wb_xml[anchor.end():]
    rels_xml = rels_xml.replace('</Relationships>', ''.join(new_rel_tags) + '</Relationships>')
    ct_xml = ct_xml.replace('</Types>', ''.join(new_ct_tags) + '</Types>')

    # Shared strings: our page labels, plus the summary heading's page count.
    old_heading = 'SUMMARY OF PAGES 1 TO %d FOR ALL ACCOUNTS BY CATEGORY' % EXISTING_REGISTER_COUNT
    new_heading = 'SUMMARY OF PAGES 1 TO %d FOR ALL ACCOUNTS BY CATEGORY' % (page_no - 1)
    heading_hits = 0
    for i, t in enumerate(ss_texts):
        if t.strip() == old_heading:
            ss_items[i] = '<t>%s</t>' % new_heading
            ss_texts[i] = new_heading
            heading_hits += 1
    if heading_hits != 1:
        raise SystemExit('summary heading %r matched %d shared strings -- expected 1'
                         % (old_heading, heading_hits))
    # `count` is how many times strings are REFERENCED across the workbook and
    # `uniqueCount` how many distinct ones exist. They are not the same number
    # -- the court's file ships count="1752" uniqueCount="570". Only the second
    # changes here; setting both to the same value makes Excel repair the file
    # on open, which is exactly the silent fixup to avoid on a filing.
    ss_root = re.search(r'<sst[^>]*>', ss_xml).group(0)
    ss_root, n_uc = re.subn(r'uniqueCount="\d+"',
                            'uniqueCount="%d"' % len(ss_items), ss_root)
    if n_uc != 1:
        raise SystemExit('could not update uniqueCount on the sharedStrings root')
    ss_new = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
              + ss_root + ''.join('<si>%s</si>' % s for s in ss_items) + '</sst>')

    # The 18 category totals: append each new page's subtotal cell.
    sum_part = names[SUMMARY_SHEET]
    sxml = parts[sum_part].decode('utf-8')
    for k, row in enumerate(CATEGORY_ROWS):
        cell_re = re.compile(r'(<c r="I%d"[^>]*>)(.*?)(</c>)' % row, re.S)
        m = cell_re.search(sxml)
        if not m:
            raise SystemExit('summary cell I%d not found' % row)
        body = m.group(2)
        fm = re.search(r'(<f[^>]*>)(.*?)(</f>)', body, re.S)
        if not fm:
            raise SystemExit('summary cell I%d has no formula' % row)
        expr = fm.group(2)
        if not expr.endswith(')'):
            raise SystemExit('unexpected formula shape at I%d' % row)
        extra = []
        for pg, pos in added:
            col, row0 = (FIRST_PAGE_COL, FIRST_PAGE_ROW0) if pos == 0 else (CONT_PAGE_COL, CONT_PAGE_ROW0)
            extra.append("+'%sp%d'!%s%d" % (SHEET_PREFIX, pg, col, row0 + k))
        new_expr = expr[:-1] + ''.join(extra) + ')'
        # Drop the cached value so nothing stale is displayed before recalc.
        new_body = body[:fm.start()] + fm.group(1) + new_expr + fm.group(3)
        sxml = sxml[:m.start()] + m.group(1) + new_body + m.group(3) + sxml[m.end():]
    parts[sum_part] = sxml.encode('utf-8')

    parts['xl/workbook.xml'] = wb_xml.encode('utf-8')
    parts['xl/_rels/workbook.xml.rels'] = rels_xml.encode('utf-8')
    parts['[Content_Types].xml'] = ct_xml.encode('utf-8')
    parts['xl/sharedStrings.xml'] = ss_new.encode('utf-8')
    parts.pop('xl/calcChain.xml', None)
    ct2 = parts['[Content_Types].xml'].decode('utf-8')
    parts['[Content_Types].xml'] = re.sub(
        r'<Override PartName="/xl/calcChain\.xml"[^>]*/>', '', ct2).encode('utf-8')
    rl = parts['xl/_rels/workbook.xml.rels'].decode('utf-8')
    rl = re.sub(r'<Relationship [^>]*Target="calcChain\.xml"[^>]*/>', '', rl)
    parts['xl/_rels/workbook.xml.rels'] = rl.encode('utf-8')

    out_path = os.path.join(tmp, 'out.xlsx')
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as out:
        for n, data in parts.items():
            out.writestr(n, data)
    return open(out_path, 'rb').read(), page_no, len(added)


def main():
    if '--check' in sys.argv:
        problems, sheets, regs = check(read_template_bytes())
        print('sheets: %d, B-4 register pages: %d (p2..p%d)' % (sheets, len(regs), regs[-1]))
        print('accounts supported: %d' % accounts_for(regs[-1] if regs else 0))
        if problems:
            print('\nFAIL')
            for p in problems:
                print('  -', p)
            return 1
        print('OK -- structure, ids, content types and all 18 category totals verified')
        return 0

    data, last_page, added = build()
    problems, sheets, regs = check(data)
    if problems:
        print('BUILD PRODUCED AN INVALID WORKBOOK -- not written:')
        for p in problems:
            print('  -', p)
        return 1
    shutil.copyfile(TEMPLATE_JS, TEMPLATE_JS + '.bak')
    payload = base64.b64encode(data).decode('ascii')
    # Substitute ONLY the base64 payload, in place. Rebuilding the file from a
    # prefix/suffix once silently dropped its second line --
    #   export default (typeof window !== 'undefined' && ...) || '';
    # -- which is how the module is actually consumed, so every filing type's
    # export broke at boot, not just Annual's. Never reconstruct a file you can
    # patch.
    original = open(TEMPLATE_JS, encoding='utf-8', newline='').read()
    patched, n = re.subn(r'(annual=")[A-Za-z0-9+/=]+(")',
                         lambda m: m.group(1) + payload + m.group(2), original, count=1)
    if n != 1:
        raise SystemExit('payload substitution matched %d sites -- expected 1' % n)
    if 'export default' not in patched:
        raise SystemExit('refusing to write: the module export line is missing')
    open(TEMPLATE_JS, 'w', encoding='utf-8', newline='').write(patched)
    print('added %d register pages (now p2..p%d), %d sheets total'
          % (added, last_page, sheets))
    print('accounts supported: %d' % accounts_for(last_page))
    print('wrote %s (%d bytes); previous kept at %s.bak'
          % (TEMPLATE_JS, os.path.getsize(TEMPLATE_JS), TEMPLATE_JS))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
