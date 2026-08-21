# -*- coding: utf-8 -*-
"""Check 25: the provisional marks and the pending-decision list agree.

docs/development-rules/06-pending-decisions.md lets work continue on a decision
the user has not made yet -- but only where reversing it is cheap (classes A to
C). ⛔ A provisional value nobody remembers is worse than a blocked one: it
ships as if it were decided.

So the mark in the code and the row in the list are held against each other in
both directions, and a class the rule says to WAIT for may not carry a mark at
all.

⚠️ What this cannot check: whether a row's class is the right one. A value
called A that is really G reads the same to a machine. That is why the rule
asks for the reason in the row, and why a person reads the list.

    python check-pending-decisions.py
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
RECORDS = os.path.join(ROOT, 'docs', 'development-records')
LIST = os.path.join(RECORDS, 'pending-decisions.md')

# Where a mark may sit. The rule is about implementation, so the tree is what
# is walked; docs carry the list itself and would match their own examples.
TREES = ('src', 'tests', 'tools')

MARK = re.compile(r'@provisional\s+(PD-\d+)')
ROW = re.compile(r'^\|\s*(PD-\d+)\s*\|([^|]*)\|([^|]*)\|\s*([A-H])\s*\|'
                 r'([^|]*)\|([^|]*)\|([^|]*)\|\s*(未裁定|裁定済)\s*\|')
DEFER_OK = ('A', 'B', 'C')
# A record whose state table has no unfinished row is a closed wave.
UNFINISHED = ('⬜', '🔧', '🧪')


def marks_in_tree():
    found = {}
    for tree in TREES:
        base = os.path.join(ROOT, tree)
        if not os.path.isdir(base):
            continue
        for here, _dirs, files in os.walk(base):
            for name in files:
                if not name.endswith(('.ts', '.py', '.js')):
                    continue
                path = os.path.join(here, name)
                body = io.open(path, encoding='utf-8', errors='replace').read()
                for pd in MARK.findall(body):
                    rel = os.path.relpath(path, ROOT).replace('\\', '/')
                    found.setdefault(pd, []).append(rel)
    return found


def rows_in_list():
    """The rows, and the lines that meant to be rows and are not.

    ⚠️ A malformed row is INVISIBLE to a regular expression, so a row missing
    its class or its state would simply not be counted -- and a decision with
    no mark anywhere would then pass unnoticed. Lines that name a PD but do not
    parse are reported rather than skipped.
    """
    if not os.path.exists(LIST):
        return None, None
    rows, malformed = {}, []
    for line in io.open(LIST, encoding='utf-8'):
        line = line.rstrip('\n')
        m = ROW.match(line)
        if m:
            rows[m.group(1)] = {'class': m.group(4),
                                'wave': m.group(5).strip().strip('`'),
                                'state': m.group(8)}
        elif re.match(r'^\|\s*PD-\d+\s*\|', line):
            malformed.append(line.strip()[:90])
    return rows, malformed


def closed_waves():
    """Waves whose state table holds no unfinished unit."""
    closed = []
    if not os.path.isdir(RECORDS):
        return closed
    for name in sorted(os.listdir(RECORDS)):
        if not name.endswith('.md') or name in ('README.md', 'pending-decisions.md'):
            continue
        body = io.open(os.path.join(RECORDS, name), encoding='utf-8').read()
        if '✅' in body and not any(mark in body for mark in UNFINISHED):
            closed.append(name[:-3])
    return closed


def main():
    rows, malformed = rows_in_list()
    if rows is None:
        sys.stdout.write('PROBLEM  %s is missing -- the rule that lets work '
                         'continue on an undecided value needs its list\n'
                         % os.path.relpath(LIST, ROOT).replace('\\', '/'))
        return 1

    marks = marks_in_tree()
    problems = ['a row names a PD but does not carry all eight cells, so '
                'nothing can be held against it: %s' % line
                for line in malformed]

    for pd in sorted(set(marks) - set(rows)):
        problems.append('%s is marked provisional in %s but has no row in the '
                        'list -- a provisional value nobody recorded ships as '
                        'if it were decided'
                        % (pd, ', '.join(sorted(marks[pd]))))
    for pd, row in sorted(rows.items()):
        # ⚠️ Only classes A to C are implemented provisionally, so only they can
        # carry a mark. For D to H the rule says WAIT, and the row is the whole
        # record -- demanding a mark there would make that class unusable.
        if (row['state'] == '未裁定' and row['class'] in DEFER_OK
                and pd not in marks):
            problems.append('%s is still open in the list but nothing in the '
                            'tree carries its mark -- either the code was '
                            'fixed and the row is stale, or the mark was lost'
                            % pd)
        if row['class'] not in DEFER_OK and pd in marks:
            problems.append('%s is class %s, which the rule says to WAIT for, '
                            'yet it is implemented provisionally in %s'
                            % (pd, row['class'], ', '.join(sorted(marks[pd]))))

    for wave in closed_waves():
        for pd, row in sorted(rows.items()):
            if (row['state'] == '未裁定' and row['class'] not in DEFER_OK
                    and row['wave'].startswith(wave.split('-')[0])):
                problems.append('%s closed its state table, but %s (class %s) '
                                'is still undecided -- a class that cannot be '
                                'reversed may not be left behind a finished '
                                'wave' % (wave, pd, row['class']))

    if problems:
        for p in problems:
            sys.stdout.write('PROBLEM  %s\n' % p)
        return 1

    open_rows = sum(1 for r in rows.values() if r['state'] == '未裁定')
    sys.stdout.write('OK       %d pending decision(s), %d still open, and every '
                     'provisional mark matches its row\n'
                     % (len(rows), open_rows))
    return 0


if __name__ == '__main__':
    sys.exit(main())
