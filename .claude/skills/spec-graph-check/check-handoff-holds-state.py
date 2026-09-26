# -*- coding: utf-8 -*-
"""Check 72 -- the handoff holds state, and last round's lessons have gone down into the rules.

WHY THIS EXISTS. docs/development-records/handoff.md is rewritten every round.
A lesson left in it is a rule on the highest rung of the ladder in
docs/development-rules/README.md section 2 -- the rung that was followed 7
times in 75 -- and it is gone one round later. MEASURED 2026-09-26 on 0ad572f6, the first
run: 15 -- 8 lesson lines outside the newest dated section and 7 headings of
lessons "not yet lowered into the rules", the oldest from 2026-09-14, in a
handoff of 1,087 lines. Rule 05 section 1 now says the round's end lowers
them; this check is what makes the next round do it before it can commit.

WHAT IS RED.
  1. A lesson line outside the newest dated section. A dated section is a run
     of lines that begins with a line starting "> 🆕"; the newest is the first
     one. A lesson line holds "**学び**" or "学び:" / "学び：". The newest
     section may carry lessons: its round is still open.
  2. A heading that says the section holds lessons waiting to be lowered
     ("規則へ下ろす", "規則へまだ下りていない", "下ろす前の控え").

WHAT IT DOES NOT SEE. Whether the text it lets through is state rather than a
rule written without the word; whether a lesson was lowered well, or at all
(it may simply have been deleted); any file other than the handoff.

    python .claude/skills/spec-graph-check/check-handoff-holds-state.py [--self-test]

`--self-test` feeds an in-memory handoff whose older section keeps a lesson
and which has a waiting heading, and is red unless both are reported and the
same handoff without them is green.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
HANDOFF = 'docs/development-records/handoff.md'

DATED = re.compile(r'^>\s*🆕')
LESSON = re.compile(r'\*\*学び\*\*|学び[:：]')
WAITING = re.compile(r'^#+ .*(?:規則へ下ろす|規則へまだ下りていない|下ろす前の控え)')


def problems_in(text):
    """(line, message) for every lesson or waiting heading the handoff may not hold."""
    found = []
    # The newest section is the unbroken run of quoted lines that starts at
    # the first "> 🆕". The first line that is not quoted (a blank line
    # included) or the second "> 🆕" closes it for good.
    state = 'before'
    for line_no, line in enumerate(text.splitlines(), 1):
        if DATED.match(line):
            state = 'newest' if state == 'before' else 'closed'
        elif state == 'newest' and not line.startswith('>'):
            state = 'closed'
        if WAITING.match(line):
            found.append((line_no, 'a heading of lessons waiting to be lowered -- lower them '
                                   'into docs/development-rules/ and delete the section'))
        elif LESSON.search(line) and state != 'newest':
            found.append((line_no, 'a lesson outside the newest dated section -- lower it '
                                   'into docs/development-rules/ (rule 05 section 1) and delete it here'))
    return found


def self_test():
    clean = ('# handoff\n\n> 🆕 **2026-01-02 round**\n> - landed: abc\n> - **学び**: open round\n\n'
             '> 🆕 **2026-01-01 round**\n> - landed: def\n\n## state\n\nnothing\n')
    broken = clean.replace('> - landed: def\n', '> - landed: def\n> - **学び**: old round\n') + \
        '\n## 2. 規則へ下ろす候補\n'
    got = problems_in(broken)
    ok = not problems_in(clean) and len(got) == 2
    sys.stdout.write('%s  self-test: the clean handoff gave %d, the broken one %d of 2\n'
                     % ('OK      ' if ok else 'PROBLEM ', len(problems_in(clean)), len(got)))
    return 0 if ok else 1


def main():
    if '--self-test' in sys.argv:
        return self_test()
    text = io.open(os.path.join(ROOT, HANDOFF), encoding='utf-8').read()
    found = problems_in(text)
    for line_no, message in found:
        sys.stdout.write('PROBLEM  %s:%d  %s\n' % (HANDOFF, line_no, message))
    if found:
        return 1
    sys.stdout.write('OK       %s holds state: no lesson outside the newest dated section '
                     '(%d lines)\n' % (HANDOFF, len(text.splitlines())))
    return 0


if __name__ == '__main__':
    sys.exit(main())
