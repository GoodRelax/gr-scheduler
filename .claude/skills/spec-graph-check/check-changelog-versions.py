# -*- coding: utf-8 -*-
"""Check 38 -- the revision history in docs/spec/A-appendix.md names each
version number once.

WHY THIS EXISTS. D-246 measured the A.3 Changelog table on 2026-09-04 and
found two rows both claiming version 1.33: the row for 2026-08-29 and a row
added the same day, which should have been 1.79. Nothing had ever counted the
version column, so the collision sat unnoticed until someone needed the next
free number and had to scan the table by hand to find it. CR-348 renamed the
stray row (1.33 -> 1.79, with the following row becoming 1.80), so the count
this check enforces is not a baseline of known debt -- it is the true state,
held at zero going forward.

AND THE OTHER HALF. D-246 also found a stretch of rows running in descending
order after a long ascending run. Measured 2026-09-05: 21 steps went
backwards, from 1.78 down to 1.32, before climbing again. The rows were
sorted by version that day -- moved, never edited, with the multiset of lines
asserted identical before and after -- so this check holds both properties at
zero: every version appears once, and each one is greater than the one above
it.

WHAT THIS DOES NOT CHECK: the DATE column. After the sort one pair remains
out of order by date -- 1.53 is dated 2026-08-30 and 1.54 is dated
2026-08-29 -- which is a fact about those two rows, not about the ordering.
Guarding it would mean deciding which of the two dates is wrong, and nobody
has.

    python .claude/skills/spec-graph-check/check-changelog-versions.py

Run with PYTHONIOENCODING=utf-8 (not required for this check's own output,
which is plain ASCII, but kept for the same invocation as its neighbours).
"""
import io
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
APPENDIX = os.path.join(ROOT, 'docs', 'spec', 'A-appendix.md')
REL = 'docs/spec/A-appendix.md'

SECTION_START = re.compile(r'^## A\.3 Changelog')
ANY_HEADING = re.compile(r'^## ')
# The first cell of a revision-history row: "| 1.79 | ...". Matched at the
# start of the line only, so later cells (free text, often containing bold
# markers and Japanese prose) can never be mistaken for a version number.
ROW = re.compile(r'^\|\s*([0-9]+(?:\.[0-9]+)+)\s*\|')


def ordinal(version):
    """A version as a tuple, so 1.9 sorts below 1.10 rather than above it."""
    return tuple(int(part) for part in version.split('.'))


def versions_in_changelog(path):
    """Every version number in the A.3 Changelog table, in file order."""
    found = []
    in_section = False
    with io.open(path, encoding='utf-8') as handle:
        for line in handle:
            line = line.rstrip('\n')
            if SECTION_START.match(line):
                in_section = True
                continue
            if not in_section:
                continue
            if ANY_HEADING.match(line):
                break  # left A.3 for the next top-level section
            m = ROW.match(line)
            if m:
                found.append(m.group(1))
    return found


def main():
    if not os.path.exists(APPENDIX):
        print('PROBLEM  %s is missing' % REL)
        return 1

    versions = versions_in_changelog(APPENDIX)
    if not versions:
        print('PROBLEM  no revision-history rows found under A.3 Changelog '
              'in %s' % REL)
        return 1

    counts = Counter(versions)
    duplicated = sorted(v for v, n in counts.items() if n > 1)

    if duplicated:
        for v in duplicated:
            print('FAIL     version %s appears %d times in the %s revision '
                  'history -- every row must name a version no other row '
                  'names' % (v, counts[v], REL))
        return 1

    backwards = [
        (versions[i - 1], versions[i])
        for i in range(1, len(versions))
        if ordinal(versions[i]) < ordinal(versions[i - 1])
    ]
    if backwards:
        for before, after in backwards:
            print('FAIL     version %s stands below %s in the %s revision '
                  'history -- each row must name a version greater than the '
                  'row above it' % (after, before, REL))
        return 1

    print('OK       %s: %d revision row(s), %d distinct version number(s), '
          'no duplicates, none out of order' % (REL, len(versions), len(counts)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
