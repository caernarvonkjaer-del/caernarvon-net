"""Repoint PART XI's print area at PART XI.

Milestone 57D's twelve-account extension (commit 6c434af) inserted 32 register
sheets ahead of PART XI. A print area is stored as a definedName keyed by
localSheetId -- a positional index, not a name -- so PART XI's
`_xlnm.Print_Area` kept saying 57 while PART XI moved to 89. Index 57 is now
'SCH B-4 OTHER DISB p48'.

That is not cosmetic and it is not dormant: ExcelJS reads print areas into
worksheet.pageSetup, which the exporter never strips, so the shipped workbook
gives a B-4 register page a print area of A1:G32 -- clipping columns H and I
and the last rows of its register -- and leaves PART XI with none.

Run:  python scripts/fix-annual-print-area.py [--check]

--check verifies the alignment without writing. Every patch below asserts it
matched exactly once, because a silent no-op here ships a wrong print range in
a court filing (see MILESTONE-57 notes on the three no-ops this pattern caught
the first time round).
"""
import argparse
import base64
import io
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
TEMPLATE_JS = 'templates/annual-template.js'
TARGET_SHEET = 'PART XI'
STALE_ID = '57'


def read_template():
    src = open(TEMPLATE_JS, encoding='utf-8').read()
    m = re.search(r"['\"]([A-Za-z0-9+/=]{500,})['\"]", src)
    if not m:
        raise SystemExit('could not find the base64 payload in ' + TEMPLATE_JS)
    return src, m


def sheet_names(zf):
    wbk = ET.fromstring(zf.read('xl/workbook.xml'))
    return [s.get('name') for s in wbk.find(f'{NS}sheets')]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    src, m = read_template()
    raw = base64.b64decode(m.group(1))
    zf = zipfile.ZipFile(io.BytesIO(raw))
    names = sheet_names(zf)
    if TARGET_SHEET not in names:
        raise SystemExit(f'{TARGET_SHEET!r} is not in the workbook')
    correct_id = str(names.index(TARGET_SHEET))

    wb_xml = zf.read('xl/workbook.xml').decode('utf-8')
    pattern = (r'(<definedName name="_xlnm\.Print_Area" localSheetId=")'
               + STALE_ID + r'(">\'PART XI\'!\$A\$1:\$G\$32</definedName>)')
    hits = len(re.findall(pattern, wb_xml))

    if args.check:
        wbk = ET.fromstring(wb_xml)
        bad = []
        for d in wbk.find(f'{NS}definedNames'):
            if d.get('name') != '_xlnm.Print_Area':
                continue
            idx = int(d.get('localSheetId'))
            declared = re.match(r"'?([^'!]+)'?!", d.text).group(1)
            if names[idx] != declared:
                bad.append(f'  localSheetId={idx} says {declared!r} '
                           f'but index {idx} is {names[idx]!r}')
        if bad:
            print('MISALIGNED print areas:')
            print('\n'.join(bad))
            sys.exit(1)
        print(f'OK -- every print area points at the sheet it names '
              f'({len(names)} sheets).')
        return

    if hits != 1:
        raise SystemExit(
            f'expected exactly 1 stale PART XI print area, found {hits}. '
            'Template already fixed, or its shape changed -- refusing to guess.')
    if correct_id == STALE_ID:
        raise SystemExit('PART XI is already at index 57; nothing to do.')

    wb_xml = re.sub(pattern, r'\g<1>' + correct_id + r'\g<2>', wb_xml, count=1)

    out = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(raw)) as src_zip, \
            zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src_zip.infolist():
            data = src_zip.read(item.filename)
            if item.filename == 'xl/workbook.xml':
                data = wb_xml.encode('utf-8')
            dst.writestr(item, data)

    new_b64 = base64.b64encode(out.getvalue()).decode('ascii')
    # Replace only the payload, so the module's own second line -- its
    # `export default` -- survives. Rebuilding the file from prefix/suffix
    # dropped that line once before and broke every filing type's export.
    patched = src[:m.start(1)] + new_b64 + src[m.end(1):]
    if 'export default' not in patched:
        raise SystemExit('refusing to write: the export default line was lost')
    open(TEMPLATE_JS, 'w', encoding='utf-8', newline='').write(patched)
    print(f'PART XI print area repointed from localSheetId {STALE_ID} '
          f'to {correct_id}.')


if __name__ == '__main__':
    main()
