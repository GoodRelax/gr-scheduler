# -*- coding: utf-8 -*-
"""Check 22: a change request has to answer the three questions nobody asks.

Measured 2026-08-17, and the reason this file exists:

  * check.sh mentioned change-request/ ZERO times.
  * 7 of 75 change requests named a CH- or a GL-. The rule saying to ask
    "which CH does this advance" has been in the standing rules the whole
    time and has almost never been followed.
  * The review standard was cited in the standing rules and in an anecdote
    about a past success, and in NO step of any procedure.

⭐ The pattern is not about importance, it is about form. The rule that got
followed -- write a change request and measure the blast radius first -- is
the one written as a numbered procedure with commands to type. The rules that
got dropped were written as principles. So these three move down the ladder:

    memory / skill file      skipped 4 sessions running
    a principle              7 of 75
    a numbered procedure     followed
    a check                  cannot be skipped        <- here

⚠️ What this cannot do: make the ANSWER good. A change request can name CH-1
and mean nothing by it. But an answer nobody wrote cannot be reviewed at all,
and 68 of 75 wrote nothing. Forcing the question is the part a machine can do;
judging the answer stays with whoever reads the change request.

⛔ Only change requests from CR_FROM onward are checked. The earlier ones are
history: back-filling a justification that was not thought at the time would
be worse than leaving the gap visible.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
CRS = os.path.join(ROOT, 'change-request')

# The first change request written after the rules moved down the ladder.
CR_FROM = 175

# Rule ①: which challenge or goal does this advance?
CHALLENGE = re.compile(r'`?(CH-[1-5]|GL-00[1-7])`?')
# Rule ②: which clauses of the review standard were held against it?
STANDARD = re.compile(r'review-standards|`?R[2-7](\.\d+)?`?')
# Rule ⑧: what did the author settle without asking?
# A fixed phrase, so the section can be found rather than guessed at.
DECIDED = '問わずに決めた'

WANTED = [
    (CHALLENGE, '①', 'names no CH- and no GL-',
     'say which challenge of table T-054 or which goal it advances. ⛔ If none '
     'does, say so plainly -- infrastructure with no CH behind it is a real '
     'answer, and a silent one is not.'),
    (STANDARD, '②', 'names no clause of the review standard',
     'say which clauses of docs/development-rules/07-review-standards.md '
     'were held against the change, and what they found.'),
    (None, '⑧', 'has no "%s" section' % DECIDED,
     'list what was settled WITHOUT asking the user, so it can be overturned '
     'later. An empty list is fine; a missing section is not.'),
]


def main():
    problems = []
    checked = 0
    for name in sorted(os.listdir(CRS)):
        m = re.match(r'CR-(\d+)', name)
        if not m or int(m.group(1)) < CR_FROM or not name.endswith('.md'):
            continue
        checked += 1
        body = io.open(os.path.join(CRS, name), encoding='utf-8').read()
        for pattern, rule, missing, remedy in WANTED:
            found = pattern.search(body) if pattern else (DECIDED in body)
            if not found:
                problems.append('%s: %s (rule %s)\n      -> %s'
                                % (name, missing, rule, remedy))

    for p in problems:
        sys.stdout.write('  %s\n' % p)
    if problems:
        sys.stdout.write('FAIL     %d change request(s) leave a standing rule '
                         'unanswered\n' % len(problems))
        return 1
    sys.stdout.write('OK       all %d change request(s) from CR-%d on answer '
                     'rules ①, ② and ⑧\n' % (checked, CR_FROM))
    return 0


if __name__ == '__main__':
    sys.exit(main())
