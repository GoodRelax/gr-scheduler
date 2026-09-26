# -*- coding: utf-8 -*-
"""Check 65 -- an exported function of src/ that no omission row covers has a unit test.

WHY THIS EXISTS (CR-573 section 5, JDG-635 / JDG-636). Rule 04 section 3.5
turned the unit-test rule around: table UO lists the cases where a unit test
MAY be left out, and every function none of them covers gets one. The table
falls towards writing -- a case nobody listed is a case that is tested. A rule
of that shape is only kept if something counts the functions that fall
through it; this is that count.

WHAT IS RED. Two kinds of exported function of src/ (`export function`,
`export const f = () => ...`, or a local function named in `export { ... }`):

  A. one that no omission row covers and that no file of tests/unit names
     through an import. The rows read by machine, the rest by their tag:
       UO-1  tagged `@purity pure` / `semi-pure-a` and carrying no
             `@external-contract` (check 64 holds the tag honest)
       UO-2  inside a generated block of src/
       UO-3  no branch (function-size.mjs's definition of a branch, check 60)
       UO-4  every branch inside the function is taken in the coverage file
             (see UO-4 below)
       UO-8  reads a generated binding, and its only branches are `??`
             (the lookup's own miss)
       any   `@unit-test-omitted UO-n` naming a row table UO has
  B. one carrying `@external-contract <row>` that no file of tests/unit or
     tests/contract names. Rule 04 3.5: a pure function that matches numbers
     with an outside promise may not be omitted.
And a `@unit-test-omitted` naming a row table UO does not have is red as well
(counted into A).

UO-4. The coverage file is `coverage/coverage-final.json` (Istanbul JSON, the
`json` reporter of Vitest's v8 coverage), taken over the contract and
integration tests only. When the file is absent, UO-4 is NOT MEASURED: the
check says so on its first line (status UNMEASURED, never OK), and every
function that only UO-4 could have excused is counted in A. The count is then
an upper bound. It does not know how the file was taken -- a file taken over
tests/unit as well would excuse functions it should not.

THE BASELINE. unit-test-or-omission-baseline.txt, line 1: the A + B count.
CR-573 section 5: the coordinator registers the first-run number and only
lowers it (JDG-520); raising it is the user's call. `--write-baseline` writes
the file from this run's own count, and only when no file exists yet.

    python .claude/skills/spec-graph-check/check-unit-test-or-omission.py [--list]
    python .claude/skills/spec-graph-check/check-unit-test-or-omission.py --write-baseline
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MJS = os.path.join(HERE, 'purity-calls.mjs')
RULE = os.path.join(ROOT, 'docs', 'development-rules', '04-verification.md')
BASELINE = os.path.join(HERE, 'unit-test-or-omission-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/unit-test-or-omission-baseline.txt'
COVERAGE_REL = 'coverage/coverage-final.json'

EXCUSED_BY_TAG = ('pure', 'semi-pure-a')
UO_ROW = re.compile(r'^\|\s*(UO-\d+)\s*\|', re.M)

NOT_COVERED = (
    'NOT COVERED  exported class methods and object-literal members (only '
    'exported functions are read); a test that reaches a function without '
    'naming it in an import (through a caller, or through a `vi.mock` '
    'factory); whether the unit test ASSERTS anything about the function; '
    'UO-5 / UO-9 / UO-11 unless the function carries `@unit-test-omitted`; '
    'UO-6 by construction (not exported is not read); UO-7 and UO-10 (not '
    'functions)'
)


def say(message):
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def run_node(root=None):
    node = shutil.which('node') or 'node'
    command = [node, MJS, 'inventory']
    if root:
        command += ['--root', root]
    try:
        proc = subprocess.run(command, capture_output=True, text=True,
                              encoding='utf-8', errors='replace', timeout=600)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RuntimeError('could not run purity-calls.mjs: %s' % exc)
    try:
        data = json.loads(proc.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        raise RuntimeError('purity-calls.mjs printed no JSON (exit %d): %s'
                           % (proc.returncode, (proc.stderr or '')[-400:]))
    if 'problem' in data:
        raise RuntimeError(data['problem'])
    if proc.returncode != 0:
        raise RuntimeError('purity-calls.mjs exited %d' % proc.returncode)
    return data


def omission_rows():
    """The row ids of table UO, read from rule 04 on every run."""
    try:
        text = io.open(RULE, encoding='utf-8').read()
    except OSError:
        return None
    return set(UO_ROW.findall(text))


def load_coverage(root):
    """{relative file: [(startLine, endLine, all_taken)]} or None when absent."""
    path = os.path.join(root, *COVERAGE_REL.split('/'))
    if not os.path.exists(path):
        return None
    try:
        with io.open(path, encoding='utf-8') as handle:
            raw = json.load(handle)
    except (OSError, ValueError):
        return None
    out = {}
    for key, entry in raw.items():
        file_path = entry.get('path', key)
        rel = os.path.relpath(file_path, root).replace('\\', '/')
        spans = []
        branch_map = entry.get('branchMap', {})
        counts = entry.get('b', {})
        for bid, branch in branch_map.items():
            loc = branch.get('loc') or {}
            start = (loc.get('start') or {}).get('line')
            end = (loc.get('end') or {}).get('line')
            if start is None:
                continue
            taken = counts.get(bid, [])
            spans.append((start, end or start, bool(taken) and all(c > 0 for c in taken)))
        out[rel] = spans
    return out


def fully_covered(coverage, record):
    spans = coverage.get(record['file'])
    if spans is None:
        return False
    inside = [s for s in spans
              if record['startLine'] <= s[0] <= record['endLine']]
    return bool(inside) and all(s[2] for s in inside)


def classify(data, rows, coverage):
    unit = set(data['references']['unit'])
    contract = set(data['references']['contract'])
    misses = []
    for record in data['exported']:
        key = '%s::%s' % (record['file'], record['name'])
        where = '%s:%d %s' % (record['file'], record['startLine'], record['name'])
        if record.get('omitted') and record['omitted'] not in rows:
            misses.append(('A', where, '@unit-test-omitted names %s, which table '
                           'UO does not have' % record['omitted']))
            continue
        if record.get('externalContract'):
            if key not in unit and key not in contract:
                misses.append(('B', where, '@external-contract %s, and no file of '
                               'tests/unit or tests/contract names it'
                               % record['externalContract']))
            continue
        if record.get('omitted'):
            continue
        if record.get('tag') in EXCUSED_BY_TAG:
            continue
        if record.get('generated'):
            continue
        if record.get('branches', 0) == 0:
            continue
        if record.get('readsGenerated') and record['branches'] == record.get('nullish'):
            continue
        if coverage is not None and fully_covered(coverage, record):
            continue
        if key in unit:
            continue
        misses.append(('A', where, '%s, %d branch(es), no omission row, and no '
                       'file of tests/unit names it'
                       % (record.get('tag') or 'untagged', record['branches'])))
    return misses


def read_baseline():
    try:
        with io.open(BASELINE, encoding='utf-8') as handle:
            return int(handle.readline().strip())
    except (OSError, ValueError):
        return None


def write_baseline(count, measured):
    if os.path.exists(BASELINE):
        say('PROBLEM  %s already exists; --write-baseline only seeds a missing '
            'file (CR-573 section 5)' % REL_BASELINE)
        return 1
    with io.open(BASELINE, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write('%d\n' % count)
        handle.write('# Check 65 -- exported functions of src/ with no omission row '
                     'of table UO and no unit test,\n'
                     '# plus @external-contract functions with neither a unit nor a '
                     'contract test. Line 1 is the count.\n'
                     '# Seeded by check-unit-test-or-omission.py --write-baseline '
                     'from its own first run (CR-573 section 5),\n'
                     '# UO-4 %s.\n'
                     '# The coordinator lowers it (JDG-520); raising it is the '
                     'user\'s call.\n'
                     % ('measured' if measured else 'NOT MEASURED (no coverage file)'))
    say('WROTE    %s = %d' % (REL_BASELINE, count))
    return 0


def main(argv):
    root = ROOT
    node_root = None
    if '--root' in argv:
        at = argv.index('--root')
        if at + 1 < len(argv):
            root = node_root = argv[at + 1]
    rows = omission_rows()
    if not rows:
        say('PROBLEM  no row UO-n found in %s -- table UO is where the omission '
            'rows are read from' % os.path.relpath(RULE, ROOT).replace('\\', '/'))
        return 2
    try:
        data = run_node(node_root)
    except RuntimeError as exc:
        say('PROBLEM  %s' % exc)
        return 2
    coverage = load_coverage(root)
    misses = classify(data, rows, coverage)
    count = len(misses)
    total = len(data['exported'])
    status_ok = 'OK      ' if coverage is not None else 'UNMEASURED'
    uo4 = ('' if coverage is not None else
           ' UO-4 NOT MEASURED: no %s, so every function only UO-4 could excuse '
           'is counted -- the number is an upper bound, not a green.' % COVERAGE_REL)

    if '--list' in argv:
        for kind, where, why in misses:
            say('%s  %s  -- %s' % (kind, where, why))
        say('-- %d of %d exported function(s).%s' % (count, total, uo4))
        return 0
    if '--write-baseline' in argv:
        return write_baseline(count, coverage is not None)

    held = read_baseline()
    shown = misses[:8]
    if held is None:
        say('PROBLEM  %s has not been written yet -- %d of %d exported '
            'function(s) have no omission row and no test.%s Seed it with '
            '--write-baseline.' % (REL_BASELINE, count, total, uo4))
        say('   ' + NOT_COVERED)
        return 1
    if count > held:
        say('FAIL     exported functions with no omission row and no unit test '
            'went %d -> %d (of %d).%s Table UO falls towards writing: write the '
            'unit test, or name the row the function falls under.'
            % (held, count, total, uo4))
        for kind, where, why in shown:
            say('         %s %s -- %s' % (kind, where, why))
        if count > len(shown):
            say('         ... and %d more (--list)' % (count - len(shown)))
        say('   ' + NOT_COVERED)
        return 1
    if count < held:
        say('%s %d of %d exported function(s) have no omission row and no test '
            '(was %d) -- lower %s to hold the ground.%s'
            % (status_ok, count, total, held, REL_BASELINE, uo4))
    else:
        say('%s %d of %d exported function(s) have no omission row and no test, '
            'which is the baseline.%s' % (status_ok, count, total, uo4))
    say('   ' + NOT_COVERED)
    return 0


for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
