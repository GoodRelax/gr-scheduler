# -*- coding: utf-8 -*-
"""Check 52 -- 表 T-007 / 表 T-008's row ids against the ids the tests hold as VALUES.

⛔ WHY THIS EXISTS. Two of the specification's tables have their row ids written
into the test suite as data, not as prose:

    tests/unit/uf-45-46.test.ts   const T_008_R9 = { id: 'CHN-9', from: 'DEV-1', ... }
    tests/unit/uf-53.test.ts      the same fixture again
    tests/unit/fr-033-...test.ts  specTable('T-008').rows.find((r) => r.id === 'CHN-9')

The last one READS THE MANUSCRIPT AT RUN TIME and matches on the id. Rename the
row in the manuscript alone and `find` returns `undefined`; rename it in the code
alone and the fixture stops describing any row that exists. ⚠️ Neither string
ever leaves the product -- no exchange format carries a device or a route id --
so pressing the shipped build cannot show the drift either.

⭐⭐ AND IT IS ABOUT TO MATTER. The CR that abolishes `D-` and `R-` renames
表 T-007 to `DEV-` and 表 T-008 to `CHN-`, because one spelling numbers three
unrelated things: the specification's devices and routes, the ledger's 494
defects and 44 rulings, and the local tables of 23 review documents. Measured
2026-09-13: 131 spellings are defined in more than one document, `D-3` in
thirteen of them.

⛔ IT IS DELIBERATELY INSTALLED BEFORE THE RENAME, AND GREEN. A check added
afterwards would let one rename through unmeasured -- it would be born guarding
something already broken. That is the same reason check 50 went in before
表 T-023a moved, and check 50 then caught exactly the drift it was built for.

⭐ MEASURED 2026-09-13, before the rename: putting the uf-53 fixture's id to
`CHN-9` while the manuscript still says `R-9` turns this check red and prints
both halves (「tests/unit/uf-53.test.ts:118 holds 'CHN-9', and 表 T-008 has
R-1 ... R-9」). ⚠️ AND IT CAUGHT THE AUTHOR FIRST: its first run faulted
`from: 'D-1'` inside a `T_008_` fixture, which was this file misreading the
table -- a route names its two ends by 表 T-007's device ids, not by its own.
The rule below carries that correction.

WHAT IT COMPARES. Three sets, all read fresh on every run:

  1. the first cell of every row under 表 T-007 and 表 T-008 in the manuscript;
  2. every `id:` / `from:` / `to:` string of a `T_007_*` / `T_008_*` fixture
     object in tests/ -- `id` against the fixture's own table, `from` and `to`
     against 表 T-007, because a route names its two ends by device id;
  3. every id compared against `specTable('T-007'|'T-008')` in tests/.

Sets 2 and 3 must be SUBSETS of set 1. ⚠️ Not equal: a fixture transcribes the
one row its cases need, not the whole table, so requiring equality would fail on
a table that is right. What is forbidden is a code value naming a row the table
does not have.

⚠️ WHAT IT DOES NOT DO. It does not look at comments -- check 42/44 and the
rename's own gate cover those -- and it does not judge whether the fixture's
OTHER fields still say what the row says. That is check 37's axis.

Usage:
    python check-device-route-row-ids.py [repo-root]
"""
import io
import os
import re
import sys

SPEC = os.path.join('docs', 'spec', '01-04-requirements.md')
TESTS = 'tests'

# The caption owns the rows that follow it, until the next caption.
CAPTION = re.compile(u'^\\*\\*表\\s*(T-0(?:07|08))\\s')
ANY_CAPTION = re.compile(u'^\\*\\*(?:表|図)\\s*[TF]-')
ROW = re.compile(r'^\|\s*\**\s*`?([A-Z]{1,3}-[0-9]+[a-z]?)`?\s*\**\s*\|')

FIXTURE = re.compile(r'\bT_0(07|08)_[A-Za-z0-9_]*\s*=\s*\{')
# ⛔ `from` and `to` are NOT rows of the fixture's own table: 表 T-008's route
# rows name their two ends by 表 T-007's device ids. Measured the first time
# this check ran -- it faulted `from: 'D-1'` inside a `T_008_` fixture, which
# was the check misreading the table, not the test misreading the manuscript.
FIELD = re.compile(r"\b(id|from|to)\s*:\s*'([^']*)'")
FIELD_TABLE = {'from': 'T-007', 'to': 'T-007'}
READS = re.compile(r"specTable\(\s*'(T-0(?:07|08))'\s*\)")
COMPARE = re.compile(r"\.id\s*===\s*'([^']*)'")
ROW_ID = re.compile(r'^[A-Z]{1,3}-[0-9]+[a-z]?$')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def manuscript_rows(root):
    """{table id: set of row ids} for the two tables."""
    found = {'T-007': set(), 'T-008': set()}
    path = os.path.join(root, SPEC)
    if not os.path.exists(path):
        return None
    current = None
    for line in io.open(path, encoding='utf-8'):
        line = line.rstrip('\n').rstrip('\r')
        m = CAPTION.match(line)
        if m:
            current = m.group(1)
            continue
        if ANY_CAPTION.match(line):
            current = None
            continue
        if current:
            r = ROW.match(line)
            if r:
                found[current].add(r.group(1))
    return found


def ts_files(root):
    for base, dirs, names in os.walk(os.path.join(root, TESTS)):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git')]
        for n in names:
            if n.endswith('.ts') or n.endswith('.tsx'):
                yield os.path.join(base, n)


def code_values(root):
    """[(table, row id, rel path, line)] -- every id the tests hold as a VALUE."""
    out = []
    for path in ts_files(root):
        text = io.open(path, encoding='utf-8').read()
        rel = os.path.relpath(path, root).replace('\\', '/')
        lines = text.split('\n')

        # 1. fixture objects transcribed from the two tables
        for m in FIXTURE.finditer(text):
            table = 'T-0' + m.group(1)
            block = text[m.end():m.end() + 4000]
            end = block.find('\n}')
            block = block[:end if end != -1 else len(block)]
            n = text.count('\n', 0, m.start()) + 1
            for f in FIELD.finditer(block):
                if ROW_ID.match(f.group(2)):
                    out.append((FIELD_TABLE.get(f.group(1), table),
                                f.group(2), rel, n))

        # 2. an id compared against a row read out of the manuscript at run time
        for i, line in enumerate(lines, 1):
            r = READS.search(line)
            if not r:
                continue
            window = '\n'.join(lines[i - 1:i + 3])
            for c in COMPARE.finditer(window):
                if ROW_ID.match(c.group(1)):
                    out.append((r.group(1), c.group(1), rel, i))
    return out


def main(argv):
    root = argv[1] if len(argv) > 1 else '.'
    rows = manuscript_rows(root)
    if rows is None:
        say(u'FAIL     %s is not there -- the manuscript moved and this check '
            u'has nothing to compare' % SPEC)
        return 1
    if not rows['T-007'] or not rows['T-008']:
        say(u'FAIL     表 T-007 or 表 T-008 holds no row this check '
            u'recognises (found %d and %d) -- the caption or the row shape moved'
            % (len(rows['T-007']), len(rows['T-008'])))
        return 1

    values = code_values(root)
    if not values:
        say(u'FAIL     no test holds a row id of 表 T-007 or 表 T-008 as a '
            u'value. ⛔ They did on 2026-09-13 (uf-45-46, uf-53, fr-033) -- '
            u'either the fixtures were renamed and this check can no longer find '
            u'them, or the tests were deleted. Read them before touching this.')
        return 1

    bad = [(t, rid, p, n) for t, rid, p, n in values if rid not in rows[t]]
    if bad:
        say(u'FAIL     a test holds a row id 表 %s does not have. ⛔ These '
            u'two are one decision written twice, and nothing else holds them '
            u'together -- the values never leave the product, so pressing the '
            u'build cannot show the drift.' % bad[0][0])
        for t, rid, p, n in bad:
            say(u'         %s:%d  holds %r, and 表 %s has %s'
                % (p, n, rid, t, ' '.join(sorted(rows[t]))))
        say(u'         ⇒ Rename BOTH in one pass, with the comments and the '
            u'generated rosters (`npm run gen`).')
        return 1

    say(u'OK       表 T-007 (%d row(s)) and 表 T-008 (%d row(s)) hold every '
        u'id the tests carry as a value: %d site(s) over %d file(s)'
        % (len(rows['T-007']), len(rows['T-008']), len(values),
           len(set(p for _, _, p, _ in values))))
    for t, rid, p, n in sorted(values):
        say(u'           %-6s %-8s %s:%d' % (t, rid, p, n))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
