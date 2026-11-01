# -*- coding: utf-8 -*-
"""Write the review record of the CR-851 line-review page as a TSV.

Inputs:
  1. The built page (build_review_page.py output), whose embedded rows give each
     row's id, label, table, tag and current hash.
  2. A folder of the page database's `reviews` documents, one JSON file each, as
     the ArtifactData tool saves them with `out_dir` (<dir>/reviews/<id>.json,
     each file holding the document body, or {"data": body}).

Output: one line per row that has a review document: table, label, tag, ok
(as stored), current (whether the OK was given to the row text as it is now),
comment, updated_at. Rows nobody touched are counted at the end, not listed.

Usage:
    python -I export_review_results.py <page.html> <export dir> <out.tsv>
"""
import glob
import io
import json
import os
import re
import sys


def page_rows(path):
    with io.open(path, encoding='utf-8') as handle:
        text = handle.read()
    match = re.search(r'const TABLES = (\[.*?\]);\n', text, re.S)
    tables = json.loads(match.group(1))
    rows = {}
    for table in tables:
        for row in table['rows']:
            rows[row['id']] = dict(row, table=table['key'])
    return rows


def reviews(folder):
    found = {}
    for path in glob.glob(os.path.join(folder, 'reviews', '*.json')):
        with io.open(path, encoding='utf-8') as handle:
            body = json.load(handle)
        body = body.get('data', body)
        found[os.path.splitext(os.path.basename(path))[0]] = body
    return found


def clean(text):
    return (text or '').replace('\t', ' ').replace('\r', ' ').replace('\n', ' / ')


def main():
    rows = page_rows(sys.argv[1])
    done = reviews(sys.argv[2])
    lines = ['table\tlabel\ttag\tok\tcurrent\tcomment\tupdated_at\trow_id']
    for row_id in sorted(done, key=lambda key: (rows.get(key, {}).get('table', 'zz'),
                                                 rows.get(key, {}).get('label', key))):
        body = done[row_id]
        row = rows.get(row_id)
        current = bool(row) and body.get('rowHash') == row['hash']
        lines.append('\t'.join([
            row['table'] if row else '(gone)', row['label'] if row else body.get('label', ''),
            row.get('tag', '') if row else '', 'yes' if body.get('ok') else 'no',
            'yes' if current else 'no', clean(body.get('comment')), body.get('updatedAt', ''), row_id]))
    with io.open(sys.argv[3], 'w', encoding='utf-8', newline='\n') as handle:
        handle.write('\n'.join(lines) + '\n')
    ok_now = sum(1 for key, body in done.items()
                 if key in rows and body.get('ok') and body.get('rowHash') == rows[key]['hash'])
    commented = sum(1 for body in done.values() if (body.get('comment') or '').strip())
    print('rows %d, reviewed %d, OK on the current text %d, with a comment %d, untouched %d'
          % (len(rows), len(done), ok_now, commented, len(rows) - len(done)))


if __name__ == '__main__':
    main()
