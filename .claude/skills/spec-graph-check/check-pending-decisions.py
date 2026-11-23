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

THE OPEN QUESTIONS (OPQ, study 82 stage B2, 2026-11-24). The NDD review
standard (appendix A.3) moves the open rows into an appendix of the
specification as `OPQ-xxx`. Rule 06 section 3 gives the row eight cells: the
six of the standard (ID / Undecided point / Places searched / Decider /
Provisional handling / Tests to fix on reversal) and two GRS adds (class A-I /
row IDs touched). Its marks are `// Unimplemented: OPQ-n` and
`// Provisional: OPQ-n` in code and tests, and `(provisional: OPQ-n)` /
`(undecided: OPQ-n)` -- `（仮: OPQ-n）` / `（未決: OPQ-n）` in Japanese -- at the
end of a sentence of the specification. Rule 06 section 6 is held:

  - a `| OPQ-n |` row of a Markdown file under docs/spec with fewer than
    eight cells, or with no class A-I in its seventh cell, is malformed;
  - a mark naming an OPQ-n that no row holds is a problem (the answered
    question left its mark behind, or the row was never written);
  - a row that no mark names, in the tree or in the specification, is a
    problem (a row with no place is stale);
  - a Provisional mark on a D-I row is a problem (the rule says wait), except
    on a row moved from a D-H PND row whose code had already chosen (rule 06
    section 3) -- those are counted and printed on every run;
  - an Unimplemented mark on an A-C row is a problem (the rule says build).

While stage B7 moves the open PND rows, the PND half stays: a moved PND row
writes its OPQ-n in the state cell, the OPQ-n must have a row, and the moved
row may no longer carry an `@provisional` mark.

The ID of an answered question is never reused; check 44 holds that once
the closed ID is added to retired.py.

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

MARK = re.compile(r'@provisional\s+(PND-\d+)')
ROW = re.compile(r'^\|\s*(PND-\d+)\s*\|([^|]*)\|([^|]*)\|\s*([A-H])\s*\|'
                 r'([^|]*)\|([^|]*)\|([^|]*)\|\s*(未裁定|裁定済|[^|]*?OPQ-\d+[^|]*?)\s*\|')
DEFER_OK = ('A', 'B', 'C')
OPQ_ID = re.compile(r'OPQ-\d+')

SPEC = os.path.join(ROOT, 'docs', 'spec')
OPQ_CODE_MARK = re.compile(r'(Unimplemented|Provisional):\s+(OPQ-\d+)')
OPQ_SPEC_MARK = re.compile(r'(?:\((?:provisional|undecided):\s*|'
                           r'\uff08(?:\u4eee|\u672a\u6c7a):\s*)(OPQ-\d+)')
OPQ_ROW = re.compile(r'^\|\s*\**`?(OPQ-\d+)`?\**\s*\|')
OPQ_CELLS = 8
OPQ_CLASS_CELL = 6
OPQ_CLASSES = frozenset('ABCDEFGHI')
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
    no mark anywhere would then pass unnoticed. Lines that name a PND but do not
    parse are reported rather than skipped.
    """
    if not os.path.exists(LIST):
        return None, None
    rows, malformed = {}, []
    for line in io.open(LIST, encoding='utf-8'):
        line = line.rstrip('\n')
        m = ROW.match(line)
        if m:
            state = m.group(8).strip()
            moved = OPQ_ID.search(state)
            rows[m.group(1)] = {'class': m.group(4),
                                'wave': m.group(5).strip().strip('`'),
                                'state': 'moved' if moved else state,
                                'moved_to': moved.group(0) if moved else None}
        elif re.match(r'^\|\s*PND-\d+\s*\|', line):
            malformed.append(line.strip()[:90])
    return rows, malformed


def opq_rows_and_spec_marks():
    """The OPQ rows of docs/spec, the malformed ones, and the spec's marks."""
    rows, malformed, marks = {}, [], {}
    for here, dirs, files in os.walk(SPEC):
        dirs[:] = sorted(d for d in dirs if d not in ('output', '__pycache__'))
        for name in sorted(files):
            if not name.endswith('.md'):
                continue
            path = os.path.join(here, name)
            rel = os.path.relpath(path, ROOT).replace('\\', '/')
            for line in io.open(path, encoding='utf-8', errors='replace'):
                line = line.strip()
                row = OPQ_ROW.match(line)
                if row:
                    cells = [c.strip().strip('`*').strip()
                             for c in re.split(r'(?<!\\)\|', line)[1:-1]]
                    letter = (cells[OPQ_CLASS_CELL]
                              if len(cells) >= OPQ_CELLS else None)
                    if letter not in OPQ_CLASSES:
                        malformed.append('%s: %s' % (rel, line[:90]))
                        letter = None
                    rows.setdefault(row.group(1), {'file': rel, 'class': letter})
                    continue
                for opq in OPQ_SPEC_MARK.findall(line):
                    marks.setdefault(opq, []).append(rel)
    return rows, malformed, marks


def opq_marks_in_tree():
    found = {}
    for tree in TREES:
        base = os.path.join(ROOT, tree)
        if not os.path.isdir(base):
            continue
        for here, _dirs, files in os.walk(base):
            for name in files:
                if not name.endswith(('.ts', '.py', '.js', '.mjs', '.feature')):
                    continue
                path = os.path.join(here, name)
                body = io.open(path, encoding='utf-8', errors='replace').read()
                for kind, opq in OPQ_CODE_MARK.findall(body):
                    rel = os.path.relpath(path, ROOT).replace('\\', '/')
                    found.setdefault(opq, []).append((kind, rel))
    return found


def opq_problems(pnd_rows):
    """The OPQ half of the check (docstring, THE OPEN QUESTIONS)."""
    rows, malformed, spec_marks = opq_rows_and_spec_marks()
    marked = opq_marks_in_tree()
    code_marks = dict((opq, [rel for _k, rel in places])
                      for opq, places in marked.items())
    problems = ['an OPQ row lacks its %d cells (ID / Undecided point / Places '
                'searched / Decider / Provisional handling / Tests to fix on '
                'reversal / class A-I / row IDs touched) or its class: %s'
                % (OPQ_CELLS, line) for line in malformed]
    # Rule 06 section 3: a D-H PND row whose code had already chosen moves to
    # an OPQ row that keeps its Provisional mark; only those are excused.
    moved_from_stop = set(row['moved_to'] for row in pnd_rows.values()
                          if row['moved_to'] and row['class'] not in DEFER_OK)
    for pd, row in sorted(pnd_rows.items()):
        if row['moved_to'] and row['moved_to'] not in rows:
            problems.append('%s says it moved to %s, but no | %s | row of '
                            'docs/spec holds it' % (pd, row['moved_to'],
                                                    row['moved_to']))
    excused = []
    for opq, places in sorted(marked.items()):
        letter = rows.get(opq, {}).get('class')
        if letter is None:
            continue
        for kind, rel in places:
            if kind == 'Provisional' and letter not in DEFER_OK:
                if opq in moved_from_stop:
                    excused.append('%s %s' % (opq, rel))
                else:
                    problems.append('%s is class %s, which the rule says to '
                                    'wait for, yet %s marks it Provisional'
                                    % (opq, letter, rel))
            if kind == 'Unimplemented' and letter in DEFER_OK:
                problems.append('%s is class %s, which the rule says to build '
                                'provisionally, yet %s marks it Unimplemented'
                                % (opq, letter, rel))
    if excused:
        sys.stdout.write('INFO     %d Provisional mark(s) on D-H rows moved '
                         'from a STOP (rule 06 section 3, High acceptance '
                         'table of JDG-3826): %s\n'
                         % (len(excused), ', '.join(excused)))
    for opq in sorted(set(code_marks) - set(rows)):
        problems.append('%s is marked in %s but no | %s | row of docs/spec '
                        'holds it -- an answered question leaves no mark, and '
                        'an open one has its row'
                        % (opq, ', '.join(sorted(set(code_marks[opq]))), opq))
    for opq in sorted(set(spec_marks) - set(rows)):
        problems.append('%s is marked in the specification (%s) but no row '
                        'holds it' % (opq, ', '.join(sorted(set(spec_marks[opq])))))
    for opq in sorted(set(rows) - set(code_marks) - set(spec_marks)):
        problems.append('%s has a row (%s) but no mark names it -- neither a '
                        'Provisional / Unimplemented comment nor a '
                        '(provisional / undecided: %s) mark in the '
                        'specification' % (opq, rows[opq]['file'], opq))
    return problems, len(rows)


def closed_waves():
    """Waves whose state table holds no unfinished unit."""
    closed = []
    if not os.path.isdir(RECORDS):
        return closed
    # ⭐ The finished records, the wave records W4 and W5 among them, sit in
    # history/ since JDG-2972; a closed wave is still a closed wave there.
    named = [(RECORDS, name) for name in sorted(os.listdir(RECORDS))]
    history = os.path.join(RECORDS, 'history')
    if os.path.isdir(history):
        named += [(history, name) for name in sorted(os.listdir(history))]
    for folder, name in named:
        if not name.endswith('.md') or name in ('README.md', 'pending-decisions.md'):
            continue
        body = io.open(os.path.join(folder, name), encoding='utf-8').read()
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
    problems = ['a row names a PND but does not carry all eight cells, so '
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
        # ⛔ Rule 06 section 3 orders the steps: fix the value, run the tests,
        # STRIKE THE MARK, then set the state to 裁定済. Without this branch
        # nothing holds the third step, so a settled row can keep its mark for
        # ever while this check stays green. ⭐ With it the mark's whole life is
        # covered: an open A-to-C row must carry one, a D-to-H row may not, and
        # a settled row may not either.
        if row['state'] == '裁定済' and pd in marks:
            problems.append('%s has been ruled on, but %s still carries its '
                            'provisional mark -- rule 06 section 3 strikes the '
                            'mark BEFORE the state moves, so one of the two is '
                            'wrong' % (pd, ', '.join(sorted(marks[pd]))))
        if row['state'] == 'moved' and pd in marks:
            problems.append('%s moved to %s, but %s still carries its '
                            '@provisional mark -- the mark becomes Provisional: '
                            '%s' % (pd, row['moved_to'],
                                    ', '.join(sorted(marks[pd])), row['moved_to']))

    for wave in closed_waves():
        for pd, row in sorted(rows.items()):
            if (row['state'] == '未裁定' and row['class'] not in DEFER_OK
                    and row['wave'].startswith(wave.split('-')[0])):
                problems.append('%s closed its state table, but %s (class %s) '
                                'is still undecided -- a class that cannot be '
                                'reversed may not be left behind a finished '
                                'wave' % (wave, pd, row['class']))

    more, open_questions = opq_problems(rows)
    problems.extend(more)

    if problems:
        for p in problems:
            sys.stdout.write('PROBLEM  %s\n' % p)
        return 1

    open_rows = sum(1 for r in rows.values() if r['state'] == '未裁定')
    sys.stdout.write('OK       %d pending decision(s), %d still open, and every '
                     'provisional mark matches its row\n'
                     % (len(rows), open_rows))
    sys.stdout.write('OK       %d open question(s) (OPQ) in docs/spec, and every '
                     'OPQ mark matches its row\n' % open_questions)
    return 0


if __name__ == '__main__':
    sys.exit(main())
