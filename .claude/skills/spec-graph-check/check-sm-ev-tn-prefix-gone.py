# -*- coding: utf-8 -*-
u"""Check 63 -- `SM-`, `EV-` and `TN-`, followed by a number, name no row any more.

⛔ WHY THIS EXISTS. The state-machine manuscript numbered its states `SM-n`,
its events `EV-n` and its transitions `TN-n`. JDG-286 (2026-09-21) replaced
all three with names (R4.4): a machine is a noun phrase ending in
`StateMachine` (`armModeStateMachine`), a state is `machine.key`, an event is
`region/key`, and a transition is its cell -- machine, current state and
event. A number that
comes back would be a second name for a row that already has one, and a
reader holding `TN-16` could not find it in any table. The prefixes left
row-id-prefixes.json in the same change; this check is what stops the
spelling from being written again, the way check 51 stops `PD-`.

⭐⭐ IT CANNOT SAY "0 SITES", and that was measured before it was written.
The change requests that built the state machines -- CR-436 and CR-440 --
record their rows under the old numbers, and a change request is history:
JDG-286 keeps them as they were and adds a revision row pointing at the
names. So the exclusions are NAMED, one at a time, each with its reason,
and printed on every run -- an exclusion nobody reads is the thing that rots.

WHAT IT LOOKS FOR. `SM-`, `EV-` or `TN-` immediately followed by a digit, not
preceded by a letter, digit, `_` or `-`, over every file git tracks. ⛔ NOT
the bare letters: `SM` and `TN` stand in ordinary prose. Upper case only --
the three prefixes were never written in lower case, and a lower-case gate
would fire on words that are right.

Usage:
    python check-sm-ev-tn-prefix-gone.py [repo-root]
"""
import io
import os
import re
import subprocess
import sys

PATTERN = re.compile(r'(?<![A-Za-z0-9_-])(?:SM|EV|TN)-[0-9]')

# ---- Excluded TREES -- with the reason each one is out of scope -------------
TREES = [
    ('previous-project-result/',
     u"a finished project's record, out of scope by the user's ruling of "
     u'2026-09-12'),
    ('dist/',
     u'generated from src/ by `npx vite build`; it drops the old spelling '
     u'when it is next built'),
]

# ---- Excluded FILES -- the history of the numbered rows ---------------------
FILES = [
    ('change-request/CR-436-the-screen-values-move-into-the-state-machine.md',
     u'the change request that numbered the screen-values rows. Its appendix '
     u'and revision rows ARE the history; JDG-286 keeps them and its wave A2 '
     u'section maps them to the names'),
    ('change-request/CR-440-notices-move-into-the-state-machine.md',
     u'the change request that numbered the notices rows; kept as history, '
     u'with a revision row pointing at the names'),
    ('.claude/skills/spec-graph-check/check-sm-ev-tn-prefix-gone.py',
     u'this check. Its docstring names the spellings it forbids'),
]


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def tracked(root):
    out = subprocess.check_output(['git', 'ls-files'], cwd=root)
    return [p for p in out.decode('utf-8').split('\n') if p.strip()]


def main(argv):
    root = argv[1] if len(argv) > 1 else '.'
    excluded_files = dict(FILES)
    hits = []
    scanned = 0
    for rel in tracked(root):
        if any(rel.startswith(tree) for tree, _ in TREES):
            continue
        if rel in excluded_files:
            continue
        path = os.path.join(root, rel)
        try:
            text = io.open(path, 'rb').read().decode('utf-8')
        except (IOError, OSError, UnicodeDecodeError):
            continue
        scanned += 1
        for number, line in enumerate(text.split('\n'), 1):
            line = line.rstrip('\r')
            for match in PATTERN.finditer(line):
                hits.append((rel, number, match.start() + 1, line.strip()))

    if hits:
        say(u'FAIL     `SM-` / `EV-` / `TN-` followed by a number is back: %d '
            u'site(s) in %d file(s). ⛔ JDG-286 named them -- a machine is '
            u'`<noun>StateMachine`, a state `machine.key`, an event '
            u'`region/key`, a transition its cell. Write the name.'
            % (len(hits), len(set(h[0] for h in hits))))
        for rel, number, column, line in hits[:40]:
            say(u'         %s:%d:%d  %s' % (rel, number, column, line[:100]))
        if len(hits) > 40:
            say(u'         ... and %d more' % (len(hits) - 40))
        say(u'         ⭐ If a file is HISTORY that quotes the old numbers on '
            u'purpose, add it to FILES in this file WITH ITS REASON.')
        return 1

    say(u'OK       `SM-` / `EV-` / `TN-` name no row anywhere: %d file(s) '
        u'scanned, 0 site(s). Excluded and named: %d tree(s), %d file(s).'
        % (scanned, len(TREES), len(FILES)))
    for tree, why in TREES:
        say(u'           tree  %-34s %s' % (tree, why))
    for rel, why in FILES:
        say(u'           file  %-34s %s' % (rel.split('/')[-1][:34], why))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
