# -*- coding: utf-8 -*-
"""Check 26b: every member table T-064 publishes leaves through its entry.

Chapter 5.3 says nothing outside a component's folder may import any file of it
other than its public entry, so a name table T-064 publishes has exactly one way
out: `src/<layer folder>/<kebab(component)>/<entry>.ts` must export it.
⛔ A member that is declared and not implemented is worse than a missing one:
the table reads as the published face of the component, and everything that
plans against it -- a caller, a test, a change request counting members -- plans
against a name nothing answers to. `ApplyDocumentChange.replaceDocument` sat
declared and unwritten while all 26 checks were green, because check 18 compares
FILES, check 19 compares IMPORTS, and audit-ch5.py compares table T-064's ROWS
against table T-075. Nobody compared a MEMBER against an export.

⭐ THE RULE FOR WHAT COUNTS AS A MEMBER, and it is deliberately narrow:
    split the member cell on the full-width solidus; a piece counts as a member
    ONLY when it opens with one back-quoted ASCII identifier and what follows
    that identifier is either nothing at all or a full-width opening
    parenthesis. Every other piece is SKIPPED, counted, and reported as a
    count. No name is ever read from anywhere else in the piece.

That single condition is what separates a name being PUBLISHED from a name
being MENTIONED. "`applyDocumentChange`（`non-pure`。…）" publishes a member;
"`SvgSurface` の実装 1 つ" says a Framework component implements that interface
and never writes down the name it actually exports. Both open with a code span,
and only the first is followed by "（".

⛔ A noisy gate is worse than no gate -- it gets legitimate text "fixed", which
is why checks 13 and 14 were demoted to advisory. So this one never guesses.
Where the cell is prose, or the entry uses an export form this file does not
recognise, it counts a skip and says so; a skip is never a failure, and the
count is printed on every run so nobody reads the check as covering more than
it does. `--skips` lists exactly what was not covered.

⚠️ What this cannot check: SIGNATURES. Table T-075 puts the arguments and the
return value in `src/`, so a member that exists with the wrong shape passes here
and is caught by `tsc`. The 18 Agent API members are outside it on purpose --
`PI-17` says (MUST NOT) not to copy them into table T-064, so only
`installAgentApi` and `SnapshotSource` are held against that entry, and table
T-107 remains their only full count.

⭐ THE BASELINE. Two gaps are real, known, and are units of work nobody is
doing today (`Schedule.scheduleViolations` and
`ApplyDocumentChange.replaceDocument`). A check that is permanently red trains
people to ignore the whole run, which is the same harm as a noisy gate, and the
suite has to be able to stop green (05-working-method.md section 1). So the
known gaps are held in `published-members-baseline.txt`, the shape check 11
already uses for the 26 standing duplications: the run is GREEN when the gaps
it finds are EXACTLY the ones held there, RED when a gap appears that is not
held there, and RED when a held line no longer matches a real gap -- a debt
that was paid must leave the file, or the baseline rots into permission.
⛔ A baselined gap is still a defect. The line is a debt, not a licence, and
closing it means deleting the line in the change that writes the member.

    python check-published-members.py
    python check-published-members.py --skips    list what is NOT covered

Run with PYTHONIOENCODING=utf-8.

NOTE ON NON-ASCII: the two separators and the quoted cell fragments are the
specification's own characters, which is data, not prose. They are written as
escapes in the code so the patterns stay readable on any console.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import specindex                                     # noqa: E402
import generate_unit_tree as tree                    # noqa: E402

TABLE = 'T-064'
BASELINE = os.path.join(HERE, 'published-members-baseline.txt')
SOLIDUS = u'／'                 # the separator between members in the cell
PAREN = u'（'                   # what a note about a member opens with

# ⭐ The rule, and the whole of it. A piece is a member when it IS a name,
# optionally followed by a note; a piece that goes on in Japanese after the
# name is talking about that name, not publishing it.
MEMBER = re.compile(u'^`([A-Za-z_][A-Za-z0-9_]*)`(?:' + PAREN + u'.*)?$')

# The export forms `src/` actually uses. Anything else makes the file
# unreadable to this check, which is reported rather than guessed at.
DECLARED = re.compile(r'^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?'
                      r'(?:const|let|var|function\*?|class|interface|enum|type)'
                      r'\s+([A-Za-z_$][A-Za-z0-9_$]*)')
BLOCK = re.compile(r'^export\s+(?:type\s+)?\{')
ANY_EXPORT = re.compile(r'^export\b')


def exports_of(text):
    """The names this file exports, and the export lines it could not read.

    ⛔ An unreadable line is returned rather than ignored: ignoring one would
    silently shrink the set of names and turn a working entry into a false
    alarm, which is the one outcome this check may not produce.
    """
    names, unreadable = set(), []
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        found = DECLARED.match(line)
        if found:
            names.add(found.group(1))
            i += 1
            continue
        if BLOCK.match(line):
            body, depth = '', 0
            while i < len(lines):
                # A trailing "// ..." inside the braces is a comment, not a
                # name; the module path after the brace never holds one.
                bare = lines[i].split('//')[0] if lines[i].lstrip().startswith('//') \
                    else lines[i]
                body += bare + '\n'
                depth += bare.count('{') - bare.count('}')
                i += 1
                if depth <= 0 and '{' in body:
                    break
            if '{' not in body or '}' not in body:
                unreadable.append(line.strip())
                continue
            inner = body[body.index('{') + 1:body.rindex('}')]
            for item in inner.split(','):
                word = item.split()
                if not word:
                    continue
                # "a as b" publishes b; "a" publishes a.
                names.add(word[-1] if len(word) >= 3 and word[-2] == 'as'
                          else word[0])
            continue
        if ANY_EXPORT.match(line):
            unreadable.append(line.strip())
        i += 1
    return names, unreadable


def rows_of_table(idx):
    """Every row of table T-064, as (row id, cells), in the order written."""
    out = []
    for rid in idx.rows_of(TABLE):
        for tid, rel, lineno in idx.row_owner[rid]:
            if tid != TABLE:
                continue
            line = idx.lines[rel][lineno - 1]
            out.append((rid, [c.strip() for c in
                              line.strip().strip('|').split('|')]))
    return out


def load_baseline():
    """The gaps already weighed: {(row, component, member, entry): why}.

    ⛔ Read strictly. A record this loader cannot parse is reported as a
    problem, never dropped: a baseline nobody can read forgives everything,
    and forgiving everything is how a gate turns into decoration.
    """
    held, malformed = {}, []
    if not os.path.exists(BASELINE):
        return held, ['it does not exist -- check 26b holds its known gaps '
                      'there, so without it a known gap reads as a new one']
    key = None
    for lineno, raw in enumerate(io.open(BASELINE, encoding='utf-8'), 1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.lower().startswith('why:'):
            if key is None:
                malformed.append('line %d carries a "why:" with no record '
                                 'above it' % lineno)
                continue
            held[key] = line[4:].strip()
            key = None
            continue
        if key is not None:
            malformed.append('the record above line %d has no "why:" line -- '
                             'a debt without a reason cannot be weighed'
                             % lineno)
        cells = [c.strip() for c in line.split('|')]
        if len(cells) != 4 or not all(cells):
            malformed.append('line %d is not "<row> | <component> | <member> '
                             '| <entry file>": %s' % (lineno, line[:70]))
            key = None
            continue
        key = tuple(cells)
    if key is not None:
        malformed.append('the last record has no "why:" line -- a debt '
                         'without a reason cannot be weighed')
    return held, malformed


def main():
    show_skips = '--skips' in sys.argv

    units, entries, declares, publishes, broken = tree.build()
    if broken:
        for problem in broken:
            sys.stdout.write('PROBLEM  table T-075 cannot be read, so no entry '
                             'file is known: %s\n' % problem)
        return 1

    idx = specindex.build(ROOT)
    if TABLE not in idx.tables:
        sys.stdout.write('PROBLEM  table %s is not in the specification -- this '
                         'check has nothing to read\n' % TABLE)
        return 1

    problems, skips, checked = [], [], 0
    gaps = {}                    # (row, component, member, entry) -> message
    seen = set()

    for rid, cells in rows_of_table(idx):
        if len(cells) < 4:
            problems.append('%s does not carry all four cells, so its members '
                            'cannot be read: %s'
                            % (rid, ' | '.join(cells)[:80]))
            continue
        component = cells[2].strip('`* ')
        pieces = [p.strip() for p in cells[3].split(SOLIDUS) if p.strip()]
        members = [MEMBER.match(p) for p in pieces]

        entry = entries.get(component)
        if entry is None:
            problems.append('%s names %s, and table T-075 gives it no file '
                            'named after it -- Chapter 5.3 makes that file the '
                            'public entry, so nothing can be held against it'
                            % (rid, component))
            continue
        path = entry['path'].replace(os.sep, '/')
        seen.add(component)

        text = io.open(os.path.join(ROOT, entry['path']), encoding='utf-8',
                       errors='replace').read()
        names, unreadable = exports_of(text)
        if unreadable:
            # ⛔ Not a failure and not a pass: the file exports in a form this
            # check does not read, so its members are declared uncovered.
            for piece, found in zip(pieces, members):
                if found:
                    skips.append('%s %s: %s exports in a form this check does '
                                 'not read (%s), so `%s` is not covered'
                                 % (rid, component, path, unreadable[0],
                                    found.group(1)))
            continue

        for piece, found in zip(pieces, members):
            if not found:
                skips.append('%s %s: not a published name, skipped -- %s'
                             % (rid, component, piece[:70]))
                continue
            checked += 1
            if found.group(1) not in names:
                # Weighed against the baseline below: a gap already held there
                # is a debt with a reason, a gap that is not is a defect found.
                gaps[(rid, component, found.group(1), path)] = (
                    '%s %s publishes `%s`, and %s does not export it'
                    % (rid, component, found.group(1), path))

    held, malformed = load_baseline()
    where = os.path.relpath(BASELINE, ROOT).replace(os.sep, '/')
    for bad in malformed:
        problems.append('the baseline %s cannot be read: %s' % (where, bad))

    # ⛔ A gap that is not held is the defect this check exists to find; a held
    # line that matches nothing is the baseline rotting. Both are red.
    for key in sorted(gaps):
        if key not in held:
            problems.append('%s -- nothing outside the folder can reach a '
                            'member that never leaves through the entry. It is '
                            'NOT held in %s: write the member, or put the debt '
                            'there with one line saying why'
                            % (gaps[key], where))
    for key in sorted(held):
        if key not in gaps:
            problems.append('%s still holds %s %s `%s` against %s, and that is '
                            'no longer a gap -- the member is exported now, or '
                            'the row no longer publishes it. A debt that was '
                            'paid must leave the file, or the baseline rots'
                            % ((where,) + key))

    # ⭐ Printed on every run, green or red: a check that does not say what it
    # left out gets read as covering the whole table.
    sys.stdout.write('NOTE     %d member(s) read from table %s, %d piece(s) not '
                     'covered -- a skip is never a failure (--skips lists them)\n'
                     % (checked, TABLE, len(skips)))
    if show_skips:
        for skip in skips:
            sys.stdout.write('SKIPPED  %s\n' % skip)

    # ⭐ Named on every run, green or red: a debt that stops being read stops
    # being paid, and a count alone is not a name.
    matched = [key for key in sorted(gaps) if key in held]
    for key in matched:
        sys.stdout.write('KNOWN    %s -- baselined debt, still a defect: %s\n'
                         % (gaps[key], held[key]))

    if problems:
        for problem in problems:
            sys.stdout.write('PROBLEM  %s\n' % problem)
        return 1
    sys.stdout.write('OK       %d published member(s) of table %s reach src/ '
                     'through their entry; %d known gap(s) held against the '
                     'baseline (new 0), %d piece(s) not covered\n'
                     % (checked, TABLE, len(matched), len(skips)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
