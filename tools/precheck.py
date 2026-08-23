# -*- coding: utf-8 -*-
"""Catch the four traps that only the after-the-fact checks catch today.

    python tools/precheck.py              # whatever git reports as changed
    python tools/precheck.py <path> ...   # those files

Run with PYTHONIOENCODING=utf-8. Exit code 1 when anything is found.

WHY THIS EXISTS. Every trap below is already guarded -- but only AFTER the edit
lands, by `check.sh`, by `gen:check`, or by StrictDoc refusing to export. Each
of those costs a round trip: write, run, read a message that may not name the
cause, undo, write again. This runs in under a second on a diff, so the same
guard arrives before the edit instead of after it.

⛔ THIS DOES NOT REPLACE ANY CHECK. It is strictly cheaper and strictly
earlier, and it is allowed to be wrong in the safe direction only -- it may
miss, it may not invent. `check.sh` stays the authority.

⚠️ The fourth trap is the one no existing check catches at all: a change
request naming a challenge of table T-054 with the wrong goal beside it.
Check 22 asks only whether SOME `CH-` and `GL-` are named.
"""
import io
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

REL_REQUIREMENTS = 'docs/spec/01-04-requirements.md'

# The marker a generated artifact carries near its top. ⚠️ The manuscript that
# EMITS that sentence carries it too, as data -- so the position is what tells
# them apart: a generated file declares itself before its content starts.
GENERATED_MARKERS = ('本書は生成物である', 'GENERATED -- do not edit')
GENERATED_MARKER_WITHIN_LINES = 15


def say(message):
    sys.stdout.write(message + '\n')


def path_of(relative):
    return os.path.join(ROOT, relative.replace('/', os.sep))


def changed_files():
    """What git reports as changed, tracked and untracked alike."""
    out = subprocess.run(
        ['git', 'status', '--porcelain'],
        cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace',
    ).stdout
    found = []
    for line in out.splitlines():
        if len(line) < 4:
            continue
        name = line[3:].strip().strip('"')
        # A rename reads `old -> new`; only the new side can be edited.
        if ' -> ' in name:
            name = name.split(' -> ', 1)[1]
        # ⚠️ git collapses an untracked DIRECTORY into one entry, and the files
        # inside it are exactly the ones nobody has checked yet.
        if name.endswith('/'):
            for base, _dirs, names in os.walk(path_of(name)):
                for one in names:
                    full = os.path.join(base, one)
                    found.append(os.path.relpath(full, ROOT).replace(os.sep, '/'))
            continue
        found.append(name)
    return found


def read_lines(relative):
    try:
        return io.open(path_of(relative), encoding='utf-8').read().split('\n')
    except (OSError, UnicodeDecodeError):
        return None


def is_generated(relative, lines):
    """Whether this file declares itself a generated artifact near its top."""
    for line in lines[:GENERATED_MARKER_WITHIN_LINES]:
        if any(marker in line for marker in GENERATED_MARKERS):
            return True
    return False


# ---------------------------------------------------------------- trap 1
# `CR-nnn` and `PD-nnn` inside docs/spec read as row ids that do not resolve.
# ⚠️ PD-1 .. PD-5 ARE rows -- table T-023a's press decision order -- so only
# three digits and up is the pending-decision namespace that collides.
BACKTICKED_ID = re.compile(r'`(CR-\d+|PD-\d{3,})`')


def trap_backticked_ids(relative, lines):
    if not relative.startswith('docs/spec/'):
        return []
    found = []
    for number, line in enumerate(lines, start=1):
        for hit in BACKTICKED_ID.findall(line):
            found.append(
                '%s:%d  `%s` in backticks reads as a specification row id and '
                'check 7 will refuse it -- write it bare' % (relative, number, hit))
    return found


# ---------------------------------------------------------------- trap 2
# StrictDoc refuses two blank lines in a row, and says so only as a process
# pool dying unless --no-parallelization is passed.
def trap_double_blank(relative, lines):
    if not (relative.startswith('docs/spec/') and relative.endswith('.md')):
        return []
    found = []
    inside_fence = False
    for index in range(len(lines) - 1):
        if lines[index].startswith('```'):
            inside_fence = not inside_fence
        if inside_fence:
            continue
        if lines[index] == '' and lines[index + 1] == '':
            found.append(
                '%s:%d  two blank lines in a row -- StrictDoc refuses the file '
                'and reports it as a dead process pool' % (relative, index + 1))
    return found


# ---------------------------------------------------------------- trap 3
def trap_generated_edit(relative, lines):
    if not is_generated(relative, lines):
        return []
    return ['%s  is a generated artifact -- edit its manuscript and rerun '
            '`npm run gen`, or the next run erases this' % relative]


# ---------------------------------------------------------------- trap 4
# ⛔ The one nothing else catches. Table T-054 pairs each challenge with the
# goal it serves; a change request that names both may still pair them wrong.
#
# ⚠️ ONLY THE ONE PHRASE THAT CLAIMS A PAIRING. A change request may also
# ENUMERATE every CH- and GL- of table T-054 while arguing that none of them
# applies, and it may QUOTE a pairing it is correcting -- neither is a claim.
# Matching mere nearness reported ten such lines and every one was noise, so
# the guard is the sentence the answer is actually written in.
CHALLENGE_ROW = re.compile(r'^\|\s*(CH-\d+)\s*\|(.*)\|([^|]*)\|\s*$')
GOAL_ID = re.compile(r'GL-\d+')
CLAIMED_PAIR = re.compile(r'`(CH-\d+)`[^`]{0,12}?受ける目標は[^`]{0,8}?`(GL-\d+)`')


def challenge_goals():
    """Which goals each challenge of table T-054 receives.

    ⚠️ A challenge may receive MORE THAN ONE -- CH-2 receives two -- so the
    answer is a set and a change request naming either one of them is right.
    """
    lines = read_lines(REL_REQUIREMENTS)
    if lines is None:
        return {}
    goals = {}
    for line in lines:
        m = CHALLENGE_ROW.match(line)
        if m is None:
            continue
        named = set(GOAL_ID.findall(m.group(3)))
        if named:
            goals[m.group(1)] = named
    return goals


def trap_challenge_pairing(relative, lines, goals):
    if not relative.startswith('change-request/') or not goals:
        return []
    found = []
    for number, line in enumerate(lines, start=1):
        for challenge, goal in CLAIMED_PAIR.findall(line):
            wanted = goals.get(challenge)
            if wanted is not None and goal not in wanted:
                found.append(
                    '%s:%d  %s receives %s in table T-054, not %s'
                    % (relative, number, challenge, ' / '.join(sorted(wanted)), goal))
    return found


TRAPS = (
    ('backticked change-request or pending-decision id in docs/spec', trap_backticked_ids),
    ('two blank lines in a row', trap_double_blank),
    ('a generated artifact edited by hand', trap_generated_edit),
)


def main():
    wanted = [one for one in sys.argv[1:] if not one.startswith('--')]
    files = wanted if wanted else changed_files()
    goals = challenge_goals()
    found = []
    looked = 0
    for name in files:
        relative = name.replace(os.sep, '/')
        lines = read_lines(relative)
        if lines is None:
            continue
        looked += 1
        for _title, trap in TRAPS:
            found.extend(trap(relative, lines))
        found.extend(trap_challenge_pairing(relative, lines, goals))

    if found:
        for one in found:
            say('  ' + one)
        say('PRECHECK  %d trap(s) in %d file(s) -- fix before running the checks'
            % (len(found), looked))
        return 1
    say('PRECHECK  OK  %d file(s), %d challenge pairing(s) known' % (looked, len(goals)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
