# -*- coding: utf-8 -*-
"""Check 56 -- every table the grab-area requirements hold is named by one of them.

⛔ WHY THIS EXISTS. The rule is already written, in the RATIONALE of `FR-104`
of docs/spec/01-04-requirements.md, verbatim:

    ⚠️ **本要求が持つ表は、どれも `FR-104` 〜 `FR-110` ／ `FR-043` ／ `FR-009`
    ／ `FR-044` のいずれかから名指される** —— 親を持たない表を置かないこと
    （MUST NOT）。

CR-430 planted nine tables inside that family in one change. A table nothing
points at still renders, still passes the reference checks (they fault a
reference to a table that does not exist, never a table no requirement
reaches), and reads to the next session as a rule that applies to nothing.

⭐ NOTHING IN THIS FILE IS A LIST OF TODAY'S TABLES. Both halves are read out
of the document on every run:

  * the PERMITTED PARENTS come from the clause line itself -- every `FR-nnn`
    on it, with `A` 〜 `B` expanded to the numbers between. Retire a
    requirement from the clause and this check stops demanding it;
  * the TABLES TO CHECK are the tables DEFINED inside those requirements'
    own blocks (a `**表 T-nnn —` heading between a `**UID**:` line and the
    next markdown heading). Add a table to `FR-109` and it is checked the
    same day, with no edit here.

⛔ THE ONE THING HELD HERE, and it cannot be read: the ANCHOR below, the
sentence that identifies the clause. A check cannot find a rule without
knowing some of its words. It is the shortest fragment that is unique in the
file, and if the clause is reworded past it this check FAILS rather than
passing on an empty permitted set -- a guard that cannot find its own rule
must go red.

WHAT COUNTS AS A NAMING. `表 T-nnn` written anywhere in the block of one of
the permitted requirements, EXCEPT the table's own definition heading.
⭐ The exclusion is the whole point: every table is written inside some
block, so counting its own heading would make this check green by
construction and it could never go red.

MEASURED on 0163153c: 10 permitted requirements, 13 tables defined inside
them (the nine of CR-430 -- T-266 T-267 T-268 T-269 T-270 T-271 T-272 T-273
T-020 -- plus T-018, T-018a, T-018b of `FR-009` and T-240 of `FR-043`), and
0 of the 13 without a parent. Namings ran from 13 (T-266) down to 1 (T-020,
named only at `FR-110`'s 「前後は表 T-020 に従うこと。」).

⚠️ WHAT IT DOES NOT SEE. It is ONE-DIRECTIONAL, exactly as the clause is: a
table must have a parent; a requirement need not have a table. ⛔ Do not add
the other direction -- it is not written anywhere, and `FR-044` names no
table today (ledger row `DFC-671`), so it would be red on arrival.
It also does not read tables held in _assets/ or in the other manuscripts;
the clause speaks of the tables these requirements hold.

Usage:
    python check-grab-table-parents.py [repo-root]
"""
import io
import os
import re
import sys

SOURCE = os.path.join('docs', 'spec', '01-04-requirements.md')

# ⛔ The only constant that is not read from the document: the words that
# identify the clause. See the docstring.
ANCHOR = u'親を持たない表を置かな' \
         u'いこと（MUST NOT）'

UID_LINE = re.compile(u'^\\*\\*UID\\*\\*:\\s*(\\S+)\\s*$')
HEADING = re.compile(u'^#{1,6} ')
TABLE_HEADING = re.compile(u'^\\*\\*表 (T-[0-9a-z]+) —')
REQ_ID = re.compile(u'FR-[0-9]+')
# 〜 U+301C and ～ U+FF5E both appear in this tree's Japanese.
RANGE_MARK = u'〜～'


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def read_lines(path):
    """Normalise on read -- this tree mixes CRLF and LF."""
    text = io.open(path, 'rb').read().decode('utf-8')
    return text.replace('\r\n', '\n').split('\n')


def permitted_parents(lines):
    """Every FR id named on the clause line, with `A` 〜 `B` expanded.

    Returns (ids, line_number) or (None, None) when the clause is gone.
    """
    for number, line in enumerate(lines, 1):
        if ANCHOR not in line:
            continue
        ids = []
        previous = None
        for match in REQ_ID.finditer(line):
            current = match.group(0)
            if previous is not None:
                between = line[previous[1]:match.start()]
                if any(mark in between for mark in RANGE_MARK):
                    low = int(previous[0].split('-')[1])
                    high = int(current.split('-')[1])
                    for value in range(min(low, high), max(low, high) + 1):
                        ids.append('FR-%03d' % value)
            ids.append(current)
            previous = (current, match.end())
        ordered = []
        for one in ids:
            if one not in ordered:
                ordered.append(one)
        return ordered, number
    return None, None


def requirement_blocks(lines):
    """[(uid, start, end)] -- a `**UID**:` line up to the next markdown heading.

    ⚠️ Bounded by the heading rather than by the next `**UID**:` line: the
    prose of a SECTION that follows a requirement would otherwise be read as
    part of that requirement, and a naming written in a section is not a
    requirement naming a table.
    """
    blocks = []
    for index, line in enumerate(lines):
        match = UID_LINE.match(line)
        if not match:
            continue
        end = len(lines)
        for forward in range(index + 1, len(lines)):
            if HEADING.match(lines[forward]):
                end = forward
                break
        blocks.append((match.group(1), index, end))
    return blocks


def main(argv):
    root = argv[1] if len(argv) > 1 else '.'
    path = os.path.join(root, SOURCE)
    if not os.path.exists(path):
        say(u'FAIL     %s is missing -- check 56 cannot read its rule.'
            % SOURCE.replace(os.sep, '/'))
        return 1
    lines = read_lines(path)

    parents, clause_line = permitted_parents(lines)
    if not parents:
        say(u'FAIL     the rule this check enforces is GONE from %s: no line '
            u'holds 「%s」. ⛔ Either restore the clause in the '
            u'RATIONALE of FR-104 or delete this check -- a guard that cannot '
            u'find its rule must not pass.'
            % (SOURCE.replace(os.sep, '/'), ANCHOR))
        return 1

    blocks = requirement_blocks(lines)
    known = set(uid for uid, _, _ in blocks)
    missing = [one for one in parents if one not in known]
    if missing:
        say(u'FAIL     the clause at %s:%d names %s, which no **UID** in the '
            u'file defines. ⛔ A permitted parent that does not exist '
            u'makes the clause unreadable.'
            % (SOURCE.replace(os.sep, '/'), clause_line, ', '.join(missing)))
        return 1

    family = [(uid, start, end) for uid, start, end in blocks if uid in parents]

    # The tables to check: every table DEFINED inside one of those blocks.
    owned = []
    for uid, start, end in family:
        for index in range(start, end):
            match = TABLE_HEADING.match(lines[index].strip())
            if match:
                owned.append((match.group(1), uid, index + 1))

    parentless = []
    counts = []
    for table, home, defined_at in owned:
        naming = re.compile(u'表 ' + re.escape(table) + u'(?![0-9A-Za-z])')
        hits = []
        for uid, start, end in family:
            for index in range(start, end):
                own = TABLE_HEADING.match(lines[index].strip())
                if own and own.group(1) == table:
                    continue        # its own definition heading is not a naming
                if naming.search(lines[index]):
                    hits.append((uid, index + 1))
        counts.append((table, home, len(hits)))
        if not hits:
            parentless.append((table, home, defined_at))

    if parentless:
        say(u'FAIL     %d table(s) of the grab-area family have no parent '
            u'requirement -- the MUST NOT at %s:%d.'
            % (len(parentless), SOURCE.replace(os.sep, '/'), clause_line))
        for table, home, defined_at in parentless:
            say(u'         表 %s (defined in %s at %s:%d) is named by none '
                u'of %s.'
                % (table, home, SOURCE.replace(os.sep, '/'), defined_at,
                   ' / '.join(parents)))
        say(u'         ⭐ Name it from the requirement it serves, or move '
            u'the table to the requirement that does.')
        return 1

    say(u'OK       every table the grab-area requirements hold has a parent: '
        u'%d permitted requirement(s) read from the clause at %s:%d, %d table(s) '
        u'defined inside them, 0 without a naming.'
        % (len(parents), SOURCE.replace(os.sep, '/'), clause_line, len(owned)))
    say(u'         parents: %s' % ' / '.join(parents))
    say(u'         namings: %s'
        % ', '.join(u'%s←%d' % (table, count)
                    for table, _, count in sorted(counts)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
