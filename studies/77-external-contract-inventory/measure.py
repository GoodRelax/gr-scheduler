# -*- coding: utf-8 -*-
"""Measure the external-contract inventory of study 77.

Reads contract-rows.tsv (one line per contract and spec row), finds every row
in the specification again, and writes summary.json with, per contract:

  rows          distinct spec rows the contract owns
  review_lines  the lines a person reads to review those rows once
  by_kind       how many are table rows, requirement blocks and anchors

A "review line" is one sentence line as the specification is written:

  - a table row: its cell text split at <br> (one segment = one line);
  - a requirement block (FR-, NFR-, UC-, SWS-, GL-): the non-empty prose
    lines from its UID to the next heading, without table lines, captions
    and the Relations metadata (its table rows are rows of their own);
  - an anchor (prose with no row id, named file:line): the paragraph that
    starts at that line -- consecutive non-empty lines up to a blank line, a
    heading or a table; a line of a JSON or prompt manuscript counts 1.

A row that two contracts share is one row in the grand total.
A row that cannot be found at its id is reported and fails the run.

Run from the repository root:  PYTHONIOENCODING=utf-8 python studies/77-external-contract-inventory/measure.py
"""
import collections
import csv
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ROW_ID = re.compile(r'^[A-Z]{1,3}-[0-9]+[a-z]?$')
BLOCK_ID = re.compile(r'^(FR|NFR|UC|SWS|GL)-[0-9]+$')
META = re.compile(r'^(\*\*(Type|UID|Relations|ORIGIN)\*\*|- \*\*Type\*\*|\s+\*\*(ID|Role)\*\*|\*\*表 T-)')

_cache = {}


def lines_of(rel):
    if rel not in _cache:
        with io.open(os.path.join(ROOT, rel), encoding='utf-8') as f:
            _cache[rel] = f.read().splitlines()
    return _cache[rel]


def first_cell(line):
    if not line.startswith('|'):
        return None
    return line.strip().strip('|').split('|')[0].strip().strip('`* ')


def table_row(rel, row_id):
    hits = [i for i, l in enumerate(lines_of(rel)) if first_cell(l) == row_id]
    return hits


def block_lines(rel, row_id):
    lines = lines_of(rel)
    starts = [i for i, l in enumerate(lines) if l.strip() == '**UID**: ' + row_id]
    if len(starts) != 1:
        return None
    n = 0
    for l in lines[starts[0] + 1:]:
        if l.startswith('#'):
            break
        s = l.strip()
        if not s or s.startswith('|') or META.match(l):
            continue
        n += 1
    return n


def anchor_lines(rel, line):
    lines = lines_of(rel)
    if not rel.endswith('.md') or rel.startswith('docs/spec/_source/'):
        return 1
    i = max(0, int(line) - 1)
    n = 0
    while i < len(lines):
        s = lines[i].strip()
        if not s or s.startswith('#') or s.startswith('|'):
            break
        n += 1
        i += 1
    return max(n, 1)


def measure(row):
    rid, rel = row['row_id'], row['file']
    if BLOCK_ID.match(rid):
        n = block_lines(rel, rid)
        return ('block', n) if n is not None else (None, 0)
    if ROW_ID.match(rid):
        hits = table_row(rel, rid)
        if len(hits) != 1:
            return (None, 0)
        return ('table-row', lines_of(rel)[hits[0]].count('<br>') + 1)
    if not row['line'].isdigit():
        return (None, 0)
    return ('anchor', anchor_lines(rel, row['line']))


def main():
    with io.open(os.path.join(HERE, 'contract-rows.tsv'), encoding='utf-8') as f:
        rows = list(csv.DictReader(f, delimiter='\t'))
    per = collections.OrderedDict()
    seen = {}
    missing = []
    for r in rows:
        key = (r['file'], r['row_id'], r['line'] if not ROW_ID.match(r['row_id']) else '')
        if key not in seen:
            seen[key] = measure(r)
        kind, n = seen[key]
        if kind is None:
            missing.append('%s %s %s' % (r['contract'], r['row_id'], r['file']))
            continue
        c = per.setdefault(r['contract'], {'rows': 0, 'review_lines': 0, 'by_kind': collections.Counter(),
                                           'defines': 0, 'constrains': 0})
        c['rows'] += 1
        c['review_lines'] += n
        c['by_kind'][kind] += 1
        c[r['role']] = c.get(r['role'], 0) + 1
    total_rows = sum(1 for k, v in seen.items() if v[0])
    total_lines = sum(v[1] for v in seen.values() if v[0])
    kinds = collections.Counter(v[0] for v in seen.values() if v[0])
    out = {'contracts': {k: dict(v, by_kind=dict(v['by_kind'])) for k, v in per.items()},
           'distinct_rows': total_rows, 'distinct_review_lines': total_lines,
           'distinct_by_kind': dict(kinds), 'pairs': len(rows) - len(missing)}
    with io.open(os.path.join(HERE, 'summary.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('%-16s %6s %8s  %s' % ('contract', 'rows', 'lines', 'table-row/block/anchor'))
    for k, v in per.items():
        b = v['by_kind']
        print('%-16s %6d %8d  %d/%d/%d' % (k, v['rows'], v['review_lines'],
                                         b['table-row'], b['block'], b['anchor']))
    print('distinct rows %d, distinct review lines %d, %s' % (total_rows, total_lines, dict(kinds)))
    if missing:
        print('NOT FOUND (%d):' % len(missing))
        for m in missing:
            print('  ' + m)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
