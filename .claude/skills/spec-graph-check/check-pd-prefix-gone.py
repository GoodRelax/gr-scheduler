# -*- coding: utf-8 -*-
"""Check 51 -- the `PD-` prefix, followed by a number, is gone.

⛔ WHY THIS EXISTS. Until CR-371 one spelling numbered two things: `PD-1` was a
row of 表 T-023a (the press decision order) AND a row of the pending-decision
ledger, and the two meant nothing like each other. On 2026-09-12 a classifier
read the specification's rows as closed ledger rows and a body stripped three
live pointers out of item-hit-area.ts before the collision was found. CR-371
split the spelling: 表 T-023a -> `PTD-`, the ledger -> `PND-`. This check is
what stops the third one from being written.

⭐⭐ IT CANNOT SAY "`PD-` APPEARS 0 TIMES", and that was measured before it was
written. Three kinds of `PD-` survive the rename on purpose:

  * the papers of the rename itself -- the inventory of all 1,922 sites, its
    summary, the split plan, the handover prompt and CR-371. Every one of them
    QUOTES the old spelling, because the old spelling is their subject;
  * previous-project-result/ -- a finished project's record, put out of scope
    by the user's ruling of 2026-09-12;
  * a handful of sentences that name the defect rather than a row.

⇒ So the exclusions are NAMED, one at a time, each with the reason it is
excluded. ⛔ The point is not that they are few -- it is that none of them is
anonymous. An exclusion nobody can read is a hole, and a list of file globs
would have let the next `PD-3` in under one of them.

⚠️ AND THE CHECK WOULD CATCH ITSELF. The docstring you are reading names the
spelling; so does the sentence that explains the split. That is why the scan
reads only the FILE CONTENT of files not excluded, and why this file is on the
list below with its own reason, like everything else.

WHAT IT LOOKS FOR. `PD-` immediately followed by a digit, in either case, over
every file git tracks. ⛔ NOT bare `PD`: the word appears in ordinary English
and in prose about the prefix, and a gate on it would fire on sentences that
are right. The renaming defect is the NUMBERED id, and that is what is gated.

Usage:
    python check-pd-prefix-gone.py [repo-root]
"""
import io
import os
import re
import subprocess
import sys

PATTERN = re.compile(r'[Pp][Dd]-[0-9]')

# ---- Excluded TREES -- with the reason each one is out of scope -------------
TREES = [
    ('previous-project-result/',
     u'a finished project\'s record, put out of scope by the user\'s ruling '
     u'of 2026-09-12. CR-371 renames what is being built, not what is over'),
    ('dist/',
     u'generated. `npx vite build` writes it from src/, so its copies of the '
     u'old spelling go when it is next built -- and rebuilding it inside the '
     u'rename would have mixed an unrelated diff into the rename\'s'),
]

# ---- Excluded FILES -- the papers of the rename ----------------------------
FILES = [
    ('docs/review/pd-sites.jsonl',
     u'the inventory the rename was aimed by: one line per site, each '
     u'RECORDING the old spelling it replaced. Renaming it would erase the '
     u'evidence that the rename was aimed rather than swept'),
    ('docs/review/pd-sites-summary.md',
     u'how to read that inventory -- the same records, in prose'),
    ('docs/review/pd-id-split-plan.md',
     u'the plan, whose subject is the five ways a plain substitution breaks '
     u'(`PD-4` eating `PD-4a`, `PD-1` eating `PD-10`, ...). Every spelling in '
     u'it is an example of the trap, not a pointer at a row'),
    ('docs/review/pd-eradication-prompt.md',
     u'the handover that ordered the three waves; it quotes the sites it '
     u'ordered renamed'),
    ('docs/review/handover-2026-09-13.md',
     u'the day\'s handover, which records the collision and what it cost'),
    ('change-request/CR-371-row-ids-get-a-registry-and-pd-is-abolished.md',
     u'the change request itself. A CR that could not write the spelling it '
     u'abolishes could not say what it was abolishing'),
    ('.claude/skills/spec-graph-check/check-pd-prefix-gone.py',
     u'this check. Its docstring names the spelling it forbids, and a check '
     u'that caught itself would be reporting on its own explanation'),
]

# ---- Excluded SITES -- one line, one reason --------------------------------
# Keyed on a substring of the line rather than a line number, so that moving
# the surrounding text does not silently widen the exclusion.
SITES = [
    ('.claude/skills/spec-graph-check/check-ruled-elsewhere.py',
     u'read here as naming pending decision',
     u'check 40\'s record of the defect: it quotes the ledger row that said '
     u'「表 T-023a の `PD-5`」 and the pending decision `PD-5` it was read as. '
     u'The two old spellings ARE the defect being described'),
    ('.claude/skills/spec-graph-check/check-ruled-elsewhere.py',
     u'PD-5, and the row was judged against a ruling',
     u'the second half of that same sentence'),
    ('.claude/skills/spec-graph-check/check-press-row-ids.py',
     u'union back to `PD-2` turns this check red',
     u'check 50\'s own measurement: one member of the PressRow union was put '
     u'back to the old spelling to show the check goes red, and the docstring '
     u'quotes what it printed. ⭐ This check found that line itself on its '
     u'first run, which is the evidence that its exclusions are named rather '
     u'than swept'),
    ('.claude/skills/spec-graph-check/check-press-row-ids.py',
     u'表 T-023a: PD-2」)',
     u'the other half of what that run printed'),
    ('docs/review/grab-bands-and-dangling-pnd-prompt.md',
     u'改名前から `PD-5` `PD-7`',
     u'the 2026-09-13 handover, recording that these numbers dangled BEFORE '
     u'CR-371 renamed them. The old spellings are the history being described, '
     u'not pointers at a row'),
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
            if not PATTERN.search(line):
                continue
            if any(rel == p and needle in line for p, needle, _ in SITES):
                continue
            for match in PATTERN.finditer(line):
                hits.append((rel, number, match.start() + 1, line.strip()))

    if hits:
        say(u'FAIL     `PD-` followed by a number is back: %d site(s) in %d '
            u'file(s). ⛔ The spelling numbers two different things -- '
            u'表 T-023a\'s press rows are `PTD-`, the pending decisions are '
            u'`PND-`. Write whichever one is meant.'
            % (len(hits), len(set(h[0] for h in hits))))
        for rel, number, column, line in hits[:40]:
            say(u'         %s:%d:%d  %s' % (rel, number, column, line[:100]))
        if len(hits) > 40:
            say(u'         ... and %d more' % (len(hits) - 40))
        say(u'         ⭐ If a site QUOTES the old spelling on purpose, add it '
            u'to SITES in this file WITH ITS REASON. ⛔ Never widen TREES or '
            u'FILES to cover it.')
        return 1

    say(u'OK       `PD-` names no row anywhere: %d file(s) scanned, 0 site(s). '
        u'Excluded and named: %d tree(s), %d file(s), %d line(s).'
        % (scanned, len(TREES), len(FILES), len(SITES)))
    for tree, why in TREES:
        say(u'           tree  %-34s %s' % (tree, why))
    for rel, why in FILES:
        say(u'           file  %-34s %s' % (rel.split('/')[-1], why))
    for rel, needle, why in SITES:
        say(u'           line  %-34s %s' % (rel.split('/')[-1] + u' 「' + needle[:18] + u'…」', why))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
