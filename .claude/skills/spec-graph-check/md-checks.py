# -*- coding: utf-8 -*-
"""Markdown-level checks 5-10 for the gr-scheduler specification.

Checks 1-4 run against the StrictDoc JSON export (see check.sh); these six
run against the Markdown source, because they are about tables and prose,
which the export flattens away.

    5  undefined table reference   "表 T-999" with no "**表 T-999 —" heading
    6  duplicate definition        the same row ID in two tables, or one
                                  table number defined twice
    7  row ID reference existence  `X-4` pointing at a row that exists nowhere
    8  pointed-to row exists       "表 T-009 の `X-5`" where T-009 has no X-5
    9  prose count vs table rows   "表 T-0xx の N 件" gone stale
    10 column count in a table     a row with more or fewer cells than the header
    15 figure reference           "図 F-999" with no "**図 F-999 —" heading,
                                  or one figure number defined twice

Usage: python md-checks.py [repo-root]
Exit code 1 if any check reports a finding.

NOTE ON NON-ASCII: the patterns below hold Japanese text because the
specification is written in Japanese; those code points are data.
"""
import io
import os
import re
import sys
import collections

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import specindex                                    # noqa: E402

# One source of truth for which files are the specification; specindex
# finds them rather than listing them, so a new asset cannot be missed.
FILES = specindex.discover(ROOT)

ROW_ID = re.compile(r'^[A-Z]{1,3}-[0-9]+[a-z]?$')
TABLE_HEAD = re.compile(r'^\*\*表 (T-[0-9]+[a-z]?) —')
FIGURE_HEAD = re.compile(r'^\*\*図 (F-[0-9]+[a-z]?) —')
SEPARATOR = re.compile(r'^\|[\s:|-]+\|\s*$')
UID_LINE = re.compile(r'^\*\*UID\*\*:\s*(\S+)')

findings = []


def report(check, path, lineno, message):
    findings.append('%-3s %s:%s  %s' % (check, path, lineno, message))


def cells(line):
    return [c.strip() for c in line.strip().strip('|').split('|')]


# ---------------------------------------------------------------- parse

# tables[T-id] = {'rows': [row_id...], 'file': path, 'line': n, 'nrows': n}
tables = {}
row_owner = collections.defaultdict(list)   # row id -> [(table, file, line)]
uids = set()
lines_by_file = {}

for rel in FILES:
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        continue
    lines = io.open(path, encoding='utf-8').read().splitlines()
    lines_by_file[rel] = lines

    # A "**表 T-nnn —" heading owns every "|" block that follows it until the
    # next heading, UID, or chapter line: prose sits between the heading and
    # the rows, and one numbered table sometimes spans two blocks. Rows under
    # no heading are filed against the enclosing UID so that check 7 still
    # knows they exist.
    current = None          # table id (or "UID:x") the rows belong to
    uid = '(preamble)'
    header_cols = None
    for i, line in enumerate(lines, 1):
        m = UID_LINE.match(line)
        if m:
            uid = m.group(1)
            uids.add(uid)
            current = header_cols = None
            continue
        m = TABLE_HEAD.match(line)
        if m:
            current = m.group(1)
            header_cols = None
            if current in tables:
                prev = tables[current]
                report('6', rel, i, 'table %s already defined at %s:%s'
                       % (current, prev['file'], prev['line']))
            tables[current] = {'rows': [], 'file': rel, 'line': i, 'nrows': 0}
            continue
        if line.startswith('|'):
            if SEPARATOR.match(line):
                continue
            c = cells(line)
            if header_cols is None:            # first row of a "|" block
                header_cols = len(c)
                if current is None:            # a table with no number
                    current = 'UID:' + uid
                    tables.setdefault(current,
                                      {'rows': [], 'file': rel, 'line': i,
                                       'nrows': 0, 'unnumbered': True})
                continue                       # header row, not a data row
            # check 10: column count
            if len(c) != header_cols:
                report('10', rel, i, 'column count %d, header has %d  (%s)'
                       % (len(c), header_cols, current))
            tables[current]['nrows'] += 1
            rid = c[0].strip('`* ')
            if ROW_ID.match(rid):
                tables[current]['rows'].append(rid)
                row_owner[rid].append((current, rel, i))
        else:
            header_cols = None
            if line.startswith('#'):
                current = None
                uid = '(section)'

all_rows = set(row_owner)
all_tables = set(tables)

# ---------------------------------------------------------------- check 5

ref_table = re.compile(r'表 (T-[0-9]+[a-z]?)')
for rel, lines in lines_by_file.items():
    for i, line in enumerate(lines, 1):
        if TABLE_HEAD.match(line):
            continue
        for t in ref_table.findall(line):
            if t not in all_tables:
                report('5', rel, i, 'reference to undefined table %s' % t)

# ---------------------------------------------------------------- check 6

for rid, owners in sorted(row_owner.items()):
    where = {o[0] for o in owners}
    if len(where) > 1:
        report('6', owners[0][1], owners[0][2],
               'row ID %s defined in %s' % (rid, ', '.join(sorted(where))))

# ---------------------------------------------------------------- check 7

# Backticked tokens in prose that look like row IDs but name nothing.
token = re.compile(r'`([A-Z]{1,3}-[0-9]+[a-z]?)`')
# Retired on purpose; the reduction-candidate table records the retirement,
# so a reference to them is correct and must not be reported.
#
# T-044..T-047 and F-002..F-007 belong to the Chapter 5/6 design that was
# discarded on 2026-08-13. The changelog names them so the numbers are never
# handed to something else; the seats stay burnt. Do NOT remove them from
# this set to "make the reference resolve" -- resolving it would mean a new
# table had taken a used seat number.
RETIRED = {'FR-050', 'T-030',
           'T-044', 'T-045', 'T-046', 'T-047',
           'F-002', 'F-003', 'F-004', 'F-005', 'F-006', 'F-007',
           'S-21', 'S-52', 'K-21', 'S-57', 'K-66', 'S-139'}
known = all_rows | uids | all_tables | RETIRED
for rel, lines in lines_by_file.items():
    for i, line in enumerate(lines, 1):
        for tok in token.findall(line):
            if tok not in known:
                report('7', rel, i, 'reference to nonexistent row/UID %s' % tok)

# ---------------------------------------------------------------- check 8

# "表 T-009 の `X-5`" / "表 T-009 の X-5" - the row must belong to that table.
qualified = re.compile(r'表 (T-[0-9]+[a-z]?) の\s*`?([A-Z]{1,3}-[0-9]+[a-z]?)`?')
for rel, lines in lines_by_file.items():
    for i, line in enumerate(lines, 1):
        for tid, rid in qualified.findall(line):
            if tid not in tables:
                continue                        # already reported by check 5
            if rid not in tables[tid]['rows']:
                owner = ', '.join(sorted({o[0] for o in row_owner.get(rid, [])}))
                report('8', rel, i, '%s is not a row of %s%s'
                       % (rid, tid, ' (it belongs to %s)' % owner if owner else ''))

# ---------------------------------------------------------------- check 9

# "表 T-0xx の N 件" / "N 行" / "N 段" - the count must match the table.
counted = re.compile(r'表 (T-[0-9]+[a-z]?) の\s*\*{0,2}([0-9]+)\*{0,2}\s*(件|行|段|つ)')
for rel, lines in lines_by_file.items():
    for i, line in enumerate(lines, 1):
        for tid, num, unit in counted.findall(line):
            if tid not in tables:
                continue
            # A numbered table sometimes spans two blocks, only one of which
            # carries row IDs; the prose counts the row-ID rows.
            actual = len(tables[tid]['rows']) or tables[tid]['nrows']
            if int(num) != actual:
                report('9', rel, i, 'prose says %s %s of %s, table has %d rows'
                       % (num, unit, tid, actual))

# ---------------------------------------------------------------- check 15

# Figures obey the same seat-number rule as tables (1.9): a reference must
# resolve, and one number must be defined exactly once. Check 5 only ever
# looked at tables, so figures were unguarded.
figures = {}
for rel, lines in lines_by_file.items():
    for i, line in enumerate(lines, 1):
        m = FIGURE_HEAD.match(line)
        if m:
            figures.setdefault(m.group(1), []).append((rel, i))

for fid, where in sorted(figures.items()):
    if len(where) > 1:
        spots = ', '.join('%s:%s' % w for w in where)
        report('15', where[0][0], where[0][1],
               'figure %s defined %d times (%s)' % (fid, len(where), spots))

ref_figure = re.compile(r'図 (F-[0-9]+[a-z]?)')
for rel, lines in lines_by_file.items():
    for i, line in enumerate(lines, 1):
        if FIGURE_HEAD.match(line):
            continue
        for f in ref_figure.findall(line):
            if f not in figures:
                report('15', rel, i, 'reference to undefined figure %s' % f)

# ---------------------------------------------------------------- output

for f in sorted(findings):
    print(f)

by_check = collections.Counter(f.split()[0] for f in findings)
print('')

# Row IDs living in a table that has no number cannot be written as
# "表 T-nnn の X-n", so check 8 can never guard a reference to them.
orphan = [(t, d) for t, d in sorted(tables.items())
          if d.get('unnumbered') and d['rows']]
if orphan:
    print('NOTE  row IDs in an unnumbered table (check 8 cannot guard these):')
    for t, d in orphan:
        print('      %s  %s:%s  %s' % (t, d['file'], d['line'],
                                       ' '.join(d['rows'])))
    print('')

for c in ['5', '6', '7', '8', '9', '10', '15']:
    print('check %-2s : %d' % (c, by_check.get(c, 0)))
print('tables=%d  figures=%d  rows=%d  uids=%d'
      % (len(tables), len(figures), len(all_rows), len(uids)))

sys.exit(1 if findings else 0)
