# -*- coding: utf-8 -*-
u"""Check 94 -- the two retired purity values stay out of the living tree.

⛔ WHY THIS EXISTS. The shared review standard (gr-sw-maker 0db4e95, R7)
renamed the two middle purity values: the one that reads an immutable value
became `semi-pure-immutable` (準純粋-不変) and the one that reads a mutable
value became `semi-pure-mutable` (準純粋-可変). CR-859 renamed every tag,
reader and document in one change, with the checkers that read the tags
(owner, BGQA3 question 23: code and checker tools together). A tag written
with an old value afterwards is worse than a typo: purity-calls.mjs reads
only the four new values, so check 64 would not see the function at all and
would stay green while the tag says nothing.

⭐⭐ IT CANNOT SAY "0 SITES" over the whole tree, and that was decided before
it was written (owner, BGQA question 8 = a, JDG-3593): the landed change
requests, the rulings with the owner's words, the defect ledgers, the
changelog, the reviews and the studies keep the old values as history. So
the exclusions are NAMED, one at a time, each with its reason, and printed on
every run -- the form of check 63.

WHAT IT LOOKS FOR. The old spellings -- `semi-pure-` followed by `a` or `b`,
the same with a capital `S`, `準純粋-` followed by `a` or `b`, `準純粋` and a
capital `A` or `B`, and the camel-case keys `semiPure` followed by `A` or
`B` -- with no letter, digit or `_` after them, over every file git tracks.

Usage:
    python check-retired-purity-values.py [repo-root]
"""
import io
import os
import re
import subprocess
import sys

PATTERN = re.compile(
    u'(?<![A-Za-z0-9_-])(?:[Ss]emi-pure-[ab]|semiPure[AB])(?![A-Za-z0-9_])'
    u'|準純粋(?:-[ab]|[ 　]?[AB])(?![A-Za-z0-9_])')

# ---- Excluded TREES -- with the reason each one is out of scope -------------
TREES = [
    ('change-request/',
     u'the change requests are history; a landed one may not be edited '
     u'(check 62), and CR-859 holds the before/after table of the rename'),
    ('docs/review/',
     u'reviews and surveys as they were written (BGQA question 8 = a); '
     u'public-entry-index.md is generated and IS scanned'),
    ('studies/',
     u"a finished project's record (2026-09-12); the glossary SUB owns the "
     u'terms under studies/76 (BGQA question 11 = a)'),
    ('docs/development-records/history/',
     u'the wave histories, as they were written'),
]

# ---- Files under an excluded tree that are scanned all the same -------------
SCANNED_ANYWAY = {
    'docs/review/public-entry-index.md':
        u'generated from src/ and table T-064 (gen:index); it follows them',
}

# ---- Excluded FILES -- the records that quote the old values ----------------
FILES = [
    ('docs/development-records/rulings.md',
     u"the owner's words are verbatim (JDG-3488 quotes the old key)"),
    ('docs/development-records/defects.md',
     u'ledger rows as they were written'),
    ('docs/development-records/fixed-defects.md',
     u'ledger rows as they were written'),
    ('docs/development-records/changelog.md',
     u'the change history, including the CR-859 line naming the rename'),
    ('.claude/skills/spec-graph-check/check-retired-purity-values.py',
     u'this check. Its pattern names the spellings it forbids'),
]


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def tracked(root):
    out = subprocess.check_output(['git', 'ls-files'], cwd=root)
    return [p for p in out.decode('utf-8').split('\n') if p.strip()]


def excluded(rel, excluded_files):
    if rel in SCANNED_ANYWAY:
        return False
    if rel in excluded_files:
        return True
    return any(rel.startswith(tree) for tree, _ in TREES)


def main(argv):
    root = argv[1] if len(argv) > 1 else '.'
    excluded_files = dict(FILES)
    hits = []
    scanned = 0
    for rel in tracked(root):
        if excluded(rel, excluded_files):
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
        say(u'FAIL     a retired purity value is back: %d site(s) in %d '
            u'file(s). ⛔ CR-859 renamed them (gr-sw-maker 0db4e95, R7): '
            u'write `semi-pure-immutable` (準純粋-不変) for a read of an '
            u'immutable value and `semi-pure-mutable` (準純粋-可変) for a '
            u'read of a mutable one. purity-calls.mjs reads only the new '
            u'values, so check 64 does not see an old tag at all.'
            % (len(hits), len(set(h[0] for h in hits))))
        for rel, number, column, line in hits[:40]:
            say(u'         %s:%d:%d  %s' % (rel, number, column, line[:100]))
        if len(hits) > 40:
            say(u'         ... and %d more' % (len(hits) - 40))
        say(u'         ⭐ If a file is HISTORY that quotes the old values on '
            u'purpose, add it to FILES in this file WITH ITS REASON.')
        return 1

    say(u'OK       no retired purity value in the living tree: %d file(s) '
        u'scanned, 0 site(s). Excluded and named: %d tree(s), %d file(s); '
        u'%d file(s) under an excluded tree scanned anyway.'
        % (scanned, len(TREES), len(FILES), len(SCANNED_ANYWAY)))
    for tree, why in TREES:
        say(u'           tree  %-34s %s' % (tree, why))
    for rel, why in FILES:
        say(u'           file  %-34s %s' % (rel.split('/')[-1][:34], why))
    for rel, why in sorted(SCANNED_ANYWAY.items()):
        say(u'           scan  %-34s %s' % (rel.split('/')[-1][:34], why))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
