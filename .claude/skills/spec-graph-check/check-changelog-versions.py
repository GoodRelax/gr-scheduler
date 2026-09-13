# -*- coding: utf-8 -*-
"""Check 38 -- the revision history in docs/development-records/changelog.md
names each version number once.

WHY THIS EXISTS. Nothing else counts the version column of the Changelog
table, so a version claimed by two rows sits unnoticed until someone needs the
next free number and has to scan the table by hand (DFC-246 found two rows both
claiming 1.33). The count this check enforces is not a baseline of known debt
-- it is the true state, held at zero going forward.

AND THE OTHER HALF. Rows can also run in descending order after an ascending
run (DFC-246), so this check holds both properties at zero: every version
appears once, and each one is greater than the one above it.

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
# ⭐ THE TABLE LIVES WITH THE OTHER RECORDS, not in docs/spec/A-appendix.md:
# it is a RECORD, not a requirement. A-appendix.md keeps the A.3 heading and
# one line pointing here.
APPENDIX = os.path.join(ROOT, 'docs', 'development-records', 'changelog.md')
REL = 'docs/development-records/changelog.md'

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
