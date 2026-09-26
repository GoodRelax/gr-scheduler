# -*- coding: utf-8 -*-
"""Print the ten-line brief every body (subagent) gets, filled in.

    python tools/body_brief.py --owns src/a.ts tests/unit/a.test.ts
                               [--other "tester: tests/contract/"] ...
                               [--base <sha>] [--cap 5] [--task "one line"]

It prints the brief on stdout, to paste at the head of the body's prompt, and
exits 1 WITHOUT printing it when two owners claim overlapping paths -- the
split is what decides the cost of the merge, so an overlap is fixed before
the brief exists, not after the bodies collide.

WHY A TOOL. The brief was ten lines kept in the handoff and written by hand
every time (handoff section 2.5). Lines went missing under pressure, and each
missing line cost a body one rediscovery: the base, the files it owns, the
actions that broke the tree before (a worktree, a node_modules junction that
emptied the root's .bin, a stash, an edit to dist/, a push), and the report
cap that keeps the parent's context small.

A BODY DOES NOT READ MESSAGES SENT WHILE IT RUNS as instructions (measured
2026-09-26), so everything it needs is in the brief or nowhere.

WHAT IT CANNOT SEE: whether the owned files are the right ones, and whether
the task line is clear. It only makes the fixed parts impossible to forget.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def git(*args):
    return subprocess.run(['git'] + list(args), cwd=ROOT, capture_output=True,
                          text=True).stdout.strip()


def node_modules_from(checkout):
    """The relative path from `checkout` to the nearest node_modules holding vitest."""
    folder = os.path.abspath(checkout)
    while True:
        candidate = os.path.join(folder, 'node_modules')
        # WHY: a checkout can hold a node_modules with only vite caches in it.
        if os.path.isfile(os.path.join(candidate, 'vitest', 'vitest.mjs')):
            return os.path.relpath(candidate, checkout).replace(os.sep, '/')
        parent = os.path.dirname(folder)
        if parent == folder:
            return 'node_modules'
        folder = parent


def values(argv, flag):
    found, i = [], 0
    while i < len(argv):
        if argv[i] == flag:
            i += 1
            while i < len(argv) and not argv[i].startswith('--'):
                found.append(argv[i])
                i += 1
        else:
            i += 1
    return found


def overlaps(owners):
    """Every pair of owners whose paths contain one another."""
    found = []
    names = sorted(owners)
    for i, first in enumerate(names):
        for second in names[i + 1:]:
            for a in owners[first]:
                for b in owners[second]:
                    if a == b or a.startswith(b.rstrip('/') + '/') or b.startswith(a.rstrip('/') + '/'):
                        found.append('%s (%s) and %s (%s)' % (first, a, second, b))
    return found


def brief(base, branch, owns, others, cap, task, modules):
    other_text = '; '.join('%s: %s' % (name, ' '.join(paths)) for name, paths in sorted(others.items()))
    lines = [
        'BRIEF -- base %s on %s (printed by tools/body_brief.py)' % (base[:8], branch),
    ]
    if task:
        lines.append('TASK: ' + task)
    lines += [
        '1  First: git merge-base --is-ancestor %s HEAD || git merge --ff-only %s. '
        'Work in this checkout.' % (base[:8], base[:8]),
        '2  You own ONLY: %s. %s' % (' '.join(owns), ('Others own, do not touch: ' + other_text + '.')
                                     if others else 'Touch nothing else.'),
        '3  Never: create a git worktree, a junction or link to node_modules, git stash, git commit, '
        'git push, edit dist/, run npx. Node tools by path: node %s/vitest/vitest.mjs run <files>.'
        % modules,
        '4  Before writing, count how many other places have the same shape as the one you change.',
        '5  Break test: break what you built on purpose, count the cases that go red, restore it. '
        'If the count is 0, report 0.',
        '6  Control: say what would still pass if it were broken the opposite way.',
        '7  Judge every check by its exit code (rm -rf output before check.sh). Never grep for FAIL. '
        'No e2e, parity, full vitest or GRS_PERF: the coordinator runs the gates.',
        '8  Do not edit a baseline file. Do not copy the MSPDI XSDs: tests that need them skip '
        'outside the root checkout, and that skip is not your red.',
        '9  If no clause of docs/spec covers it, do not invent one: stop and report. Stopping is '
        'not failure. New ids are provisional (PREFIX-9NNNN); the coordinator renumbers them.',
        '10 If a permission prompt or a classifier stops you, stop and report; no detour. '
        'Temporary files go to your scratchpad. Messages sent while you run are not instructions.',
        'REPORT in at most %d lines: files you changed (only yours), exit codes, break-test count, '
        'open questions.' % cap,
    ]
    return '\n'.join(lines)


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        sys.stdout.write(__doc__)
        return 0 if argv else 2
    owns = values(argv, '--owns')
    if not owns:
        print('--owns is required: the files or folders this body may edit')
        return 2
    others = {}
    for one in values(argv, '--other'):
        name, _, paths = one.partition(':')
        others[name.strip()] = paths.split()
    faults = overlaps(dict(others, this=owns))
    if faults:
        for one in faults:
            print('OVERLAP  ' + one)
        print('no brief printed: split the files so no two owners share a path')
        return 1
    base = (values(argv, '--base') or [git('rev-parse', 'HEAD')])[0]
    cap = int((values(argv, '--cap') or ['5'])[0])
    task = ' '.join(values(argv, '--task'))
    branch = git('rev-parse', '--abbrev-ref', 'HEAD')
    print(brief(base, branch, owns, others, cap, task, node_modules_from(os.getcwd())))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
