# -*- coding: utf-8 -*-
"""Check 56 -- the grab-area tables and requirements name each other, both ways.

⛔ WHY THIS EXISTS. Both rules are written, in the RATIONALE of `FR-104`
of docs/spec/01-04-requirements.md, verbatim:

    ⚠️ **本要求が持つ表は、どれも `FR-104` 〜 `FR-110` ／ `FR-043` ／ `FR-009`
    ／ `FR-044` のいずれかから名指される** —— 親を持たない表を置かないこと
    （MUST NOT）。

    ⚠️ **逆に、`FR-104` 〜 `FR-110` ／ `FR-043` ／ `FR-009` ／ `FR-044` の
    どれも、表 T-266 ／ ... ／ 表 T-020 のうち少なくとも 1 つを名指すこと
    （MUST）** —— 表を指さない要求は、規則を散文で持つことになる。

The first (FORWARD: table -> requirement) is the original check. The second
(REVERSE: requirement -> table) was added by CR-441 together with the
sentence itself.

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

  * REVERSE: the REQUIREMENTS TO CHECK are every `FR-nnn` on the reverse
    clause line (`A` 〜 `B` expanded the same way), and the TABLES THEY MUST
    NAME are every `表 T-nnn` on that same line. Drop a table from the
    sentence and no requirement is asked to name it any more.

⛔ THE TWO THINGS HELD HERE, and they cannot be read: the ANCHOR and the
REVERSE_ANCHOR below, the words that identify the two clauses. A check
cannot find a rule without knowing some of its words. Each is a fragment
unique in the file, and if a clause is reworded past it this check FAILS
rather than passing on an empty set -- a guard that cannot find its own rule
must go red.

WHAT COUNTS AS A NAMING (both directions). `表 T-nnn` written anywhere in the
block of one of the requirements, EXCEPT (a) the table's own definition
heading and (b) the two clause lines themselves.
⭐ Both exclusions are the whole point: every table is written inside some
block, so counting its own heading would make this check green by
construction; and the reverse clause sits in `FR-104` and lists all nine
tables, so counting it would give every one of them a parent and give
`FR-104` a naming by construction.

MEASURED on 0163153c (forward only): 10 permitted requirements, 13 tables
defined inside them (the nine of CR-430 -- T-266 T-267 T-268 T-269 T-270
T-271 T-272 T-273 T-020 -- plus T-018, T-018a, T-018b of `FR-009` and T-240
of `FR-043`), and 0 of the 13 without a parent. Namings ran from 13 (T-266)
down to 1 (T-020, named only at `FR-110`'s 「前後は表 T-020 に従うこと。」).

MEASURED 2026-09-22 with CR-441 applied (both directions): forward 10 / 13 /
0 as above; reverse 10 requirements x 9 tables, 0 requirements naming none.
`FR-044` names exactly one (表 T-270, the `PE-13` pointer CR-441 added);
before that sentence it named none (ledger row `DFC-671`).

⚠️ WHAT IT DOES NOT SEE. It does not read tables held in _assets/ or in the
other manuscripts; the clauses speak of the tables these requirements hold.

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
# The reverse clause (CR-441). Split for the same reason as ANCHOR: this file
# must not itself hold the words it searches for as one run.
REVERSE_ANCHOR = u'少なくとも 1 つを名指' \
                 u'すこと（MUST）'
TABLE_NAMING = re.compile(u'表 (T-[0-9]+[a-z]?)(?![0-9A-Za-z])')

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


def permitted_parents(lines, anchor=ANCHOR):
    """Every FR id named on the clause line, with `A` 〜 `B` expanded.

    Returns (ids, line_number) or (None, None) when the clause is gone.
    """
    for number, line in enumerate(lines, 1):
        if anchor not in line:
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

    # The reverse clause. It must be found too: a guard that cannot find its
    # rule must not pass.
    targets, reverse_line = permitted_parents(lines, REVERSE_ANCHOR)
    if not targets:
        say(u'FAIL     the reverse rule this check enforces is GONE from %s: '
            u'no line holds 「%s」. ⛔ Either restore the clause in the '
            u'RATIONALE of FR-104 or delete the reverse half of this check.'
            % (SOURCE.replace(os.sep, '/'), REVERSE_ANCHOR))
        return 1
    required_tables = []
    for match in TABLE_NAMING.finditer(lines[reverse_line - 1]):
        if match.group(1) not in required_tables:
            required_tables.append(match.group(1))
    if not required_tables:
        say(u'FAIL     the reverse clause at %s:%d names no 表 T-nnn -- the '
            u'set of tables a requirement must name is empty.'
            % (SOURCE.replace(os.sep, '/'), reverse_line))
        return 1
    unknown = [one for one in targets if one not in known]
    if unknown:
        say(u'FAIL     the reverse clause at %s:%d names %s, which no **UID** '
            u'in the file defines.'
            % (SOURCE.replace(os.sep, '/'), reverse_line, ', '.join(unknown)))
        return 1

    # Lines never counted as a naming: the two clauses themselves.
    clause_indexes = set([clause_line - 1, reverse_line - 1])

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
                if index in clause_indexes:
                    continue        # the clauses themselves are not namings
                own = TABLE_HEADING.match(lines[index].strip())
                if own and own.group(1) == table:
                    continue        # its own definition heading is not a naming
                if naming.search(lines[index]):
                    hits.append((uid, index + 1))
        counts.append((table, home, len(hits)))
        if not hits:
            parentless.append((table, home, defined_at))

    # REVERSE: every requirement on the reverse clause names at least one of
    # the tables on it, under the same exclusions.
    reverse_counts = []
    orphans = []
    by_uid = dict((uid, (start, end)) for uid, start, end in blocks)
    for uid in targets:
        start, end = by_uid[uid]
        named = []
        for index in range(start, end):
            if index in clause_indexes:
                continue
            own = TABLE_HEADING.match(lines[index].strip())
            for match in TABLE_NAMING.finditer(lines[index]):
                table = match.group(1)
                if own and own.group(1) == table:
                    continue
                if table in required_tables and table not in named:
                    named.append(table)
        reverse_counts.append((uid, len(named)))
        if not named:
            orphans.append(uid)

    failed = False
    where = SOURCE.replace(os.sep, '/')
    if parentless:
        failed = True
        say(u'FAIL     %d table(s) of the grab-area family have no parent '
            u'requirement -- the MUST NOT at %s:%d.'
            % (len(parentless), where, clause_line))
        for table, home, defined_at in parentless:
            say(u'         表 %s (defined in %s at %s:%d) is named by none '
                u'of %s.'
                % (table, home, where, defined_at, ' / '.join(parents)))
        say(u'         ⭐ Name it from the requirement it serves, or move '
            u'the table to the requirement that does.')
    if orphans:
        failed = True
        say(u'FAIL     %d requirement(s) of the grab-area family name none of '
            u'the %d tables -- the MUST at %s:%d.'
            % (len(orphans), len(required_tables), where, reverse_line))
        for uid in orphans:
            say(u'         %s names none of %s.'
                % (uid, ' / '.join(required_tables)))
        say(u'         ⭐ Point the requirement at the table that holds its '
            u'rule, or move the rule into a table.')
    if failed:
        return 1

    say(u'OK       every table the grab-area requirements hold has a parent: '
        u'%d permitted requirement(s) read from the clause at %s:%d, %d table(s) '
        u'defined inside them, 0 without a naming.'
        % (len(parents), where, clause_line, len(owned)))
    say(u'         parents: %s' % ' / '.join(parents))
    say(u'         namings: %s'
        % ', '.join(u'%s←%d' % (table, count)
                    for table, _, count in sorted(counts)))
    say(u'OK       and back: %d requirement(s) read from the clause at %s:%d, '
        u'each names at least one of its %d table(s), 0 naming none.'
        % (len(targets), where, reverse_line, len(required_tables)))
    say(u'         tables named: %s'
        % ', '.join(u'%s→%d' % (uid, count) for uid, count in reverse_counts))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
