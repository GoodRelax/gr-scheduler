# -*- coding: utf-8 -*-
u"""Check 79 -- the project plan is two files that change together, and no task is a bare id.

THE RULE (JDG-2123, from the user's 2026-10-15 words on the plan). The plan
lives in docs/development-records/ as TWO files, both overwritten every round:
the plan as GRS JSON (project-plan.json) and a short Markdown that says how to
read it (project-plan.md). Old plans are found in git history, not kept as
dated copies. A task name is never a bare id: it is the id, a very short
subject in brackets and the kind of work, e.g.
`CR-758(依存線とマーカーの干渉解消)の実装`.

WHAT IT LOOKS FOR:
  (a) one of the two files without the other;
  (b) the two last changed by different commits, or one of them changed in
      the work tree and the other not -- a round that rewrote one and left the
      other describing the plan before it;
  (c) a task (every object in a `tasks` array of the JSON, at any depth, so a
      move of the array by CR-751 does not blind it) whose `name` starts with
      an id but does not continue with a bracketed subject and then more text:
      `CR-758`, `CR-758 の実装` and `CR-758()の実装` are red;
  (d) a JSON file that does not parse.
Neither file existing is green: the plan is written after CR-751 lands.

WHAT IT DOES NOT SEE. Whether the subject is right, whether the .md really
describes this JSON, and a name with no id at all (allowed).

Usage:
    python check-project-plan.py [repo-root] [--self-test]

`--self-test` feeds four names (bare id, id + kind without subject, id + empty
brackets, and the good form) and a nested `tasks` array, and expects exactly
the three bad names reported; it is red otherwise.
"""
import io
import json
import os
import re
import subprocess
import sys

PLAN_JSON = 'docs/development-records/project-plan.json'
PLAN_MD = 'docs/development-records/project-plan.md'
STARTS_WITH_ID = re.compile(r'^\s*[A-Z][A-Z0-9]*-\d+')
VALID_NAME = re.compile(
    r'^\s*[A-Z][A-Z0-9]*-\d+(?:\s*[・、,/]\s*[A-Z][A-Z0-9]*-\d+)*'  # one or more ids
    r'\s*[（(][^（()）]*\S[^（()）]*[)）]'                            # a non-empty bracketed subject
    r'\s*\S')                                                         # then the kind of work


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def git(root, *args):
    done = subprocess.run(['git'] + list(args), cwd=root, capture_output=True)
    return done.stdout.decode('utf-8', 'replace').strip()


def task_names(node):
    """Every `name` of an object inside a `tasks` array, at any depth."""
    found = []
    if isinstance(node, dict):
        for key, value in node.items():
            if key == 'tasks' and isinstance(value, list):
                found += [one.get('name') for one in value if isinstance(one, dict) and isinstance(one.get('name'), str)]
            found += task_names(value)
    elif isinstance(node, list):
        for value in node:
            found += task_names(value)
    return found


def bad_names(names):
    return [one for one in names if STARTS_WITH_ID.match(one) and not VALID_NAME.match(one)]


def self_test():
    document = {'schedule': {'tasks': [
        {'name': 'CR-758'}, {'name': 'CR-758 の実装'}, {'name': 'CR-758()の実装'},
        {'name': 'CR-758(依存線とマーカーの干渉解消)の実装'}, {'name': '計画の見直し'},
        {'name': 'DFC-2482・DFC-2483（写しの日数）の試験'},
    ]}}
    found = bad_names(task_names(document))
    ok = found == ['CR-758', 'CR-758 の実装', 'CR-758()の実装']
    say('%s  self-test: %d bad name(s) of 6 (want the 3 bad forms): %s'
        % ('OK' if ok else 'FAIL', len(found), ' / '.join(found)))
    return 0 if ok else 1


def main(argv):
    if '--self-test' in argv:
        return self_test()
    root = next((one for one in argv if not one.startswith('--')), os.getcwd())
    have = {path: os.path.isfile(os.path.join(root, path.replace('/', os.sep))) for path in (PLAN_JSON, PLAN_MD)}
    if not any(have.values()):
        say('OK  check 79: no project plan yet (%s, %s) -- nothing to check. Baseline 0' % (PLAN_JSON, PLAN_MD))
        return 0
    faults = []
    if not all(have.values()):
        missing = [path for path, there in have.items() if not there]
        faults.append('%s exists without %s: the plan is the two files together' % (
            [path for path, there in have.items() if there][0], missing[0]))
    else:
        last = {path: git(root, 'log', '-1', '--format=%H', '--', path) for path in have}
        dirty = {path: bool(git(root, 'status', '--porcelain', '--', path)) for path in have}
        if dirty[PLAN_JSON] != dirty[PLAN_MD]:
            faults.append('only %s is changed in the work tree: rewrite both files in the same round'
                          % [path for path, value in dirty.items() if value][0])
        elif not any(dirty.values()) and last[PLAN_JSON] != last[PLAN_MD]:
            faults.append('the two files were last changed by different commits (%s: %s, %s: %s): '
                          'rewrite both in the same commit' % (PLAN_JSON, last[PLAN_JSON][:8], PLAN_MD, last[PLAN_MD][:8]))
    names = []
    if have[PLAN_JSON]:
        try:
            with io.open(os.path.join(root, PLAN_JSON), encoding='utf-8') as handle:
                names = task_names(json.load(handle))
        except ValueError as error:
            faults.append('%s does not parse: %s' % (PLAN_JSON, error))
        for one in bad_names(names):
            faults.append('task name %r is an id without a bracketed subject and the kind of work, '
                          'e.g. CR-758(依存線とマーカーの干渉解消)の実装' % one)
    for one in faults:
        say('FAIL  ' + one)
    say('%s  check 79: %d task name(s) read; %d fault(s). Baseline 0'
        % ('OK' if not faults else 'FAIL', len(names), len(faults)))
    return 0 if not faults else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
