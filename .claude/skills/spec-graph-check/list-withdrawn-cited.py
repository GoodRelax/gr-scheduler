# -*- coding: utf-8 -*-
"""List a WITHDRAWN sentence that something still cites in the present tense.

⛔⛔ NOT A GATE. Measure its precision before anyone adds it to check.sh.
`list-asserted-claims.py` is the precedent for a detector kept out (63% on a
30-line sample); check 45 is the precedent for one let in (9/10).

⭐ WHY THIS EXISTS -- and why check 42 CANNOT do it.

Check 42 asks: "does this quoted sentence exist somewhere under docs/spec?"
A retraction record keeps the withdrawn rule in quotation marks so the reader
can see what changed:

    ...2026-09-02 まで「超えた分を下端側から落とす」と定めていた

⇒ ⛔⛔ THE WITHDRAWN SENTENCE IS THEREFORE IN docs/spec, FOREVER, BY DESIGN.
Check 42's haystack is the whole manuscript, so every citation of a withdrawn
rule passes check 42 BY CONSTRUCTION. The hole is not an oversight in check
42; it is the price of keeping retraction records, which ruling E of
2026-09-11 deliberately decided to pay.

⭐ WHAT THIS ASKS INSTEAD: "is the seat that quotes this sentence the record
that WITHDREW it, or someone else speaking in the present tense?"

    the retraction record   「X」と定めていた     ⭐ past. This is the source.
    anybody else            「X」と定めている     ⛔ present. X is not live.

⚠️ THE CORPUS IS THE PAST TENSE, AND NOTHING ELSE. Measured 2026-09-12 over
docs/spec: 「を撤回」 0 times, 「撤回した」 0 times. This specification records
a withdrawal ONLY by putting the old rule in brackets and a past-tense verb
after it. So the harvest anchors there.

⚠️ WHAT IT WILL NOT CATCH, honestly. Of the four instances the 2026-09-11
round found, `DFC-452` and `DFC-460` are NOT verbatim re-quotations -- the later
seat paraphrased the withdrawn rule. No string comparison reaches those. This
tool addresses the verbatim half of the shape and says so.

USAGE
    python .claude/skills/spec-graph-check/list-withdrawn-cited.py [--verbose]

Exit code is 0 whatever it finds. ⛔ It is a list, not a verdict.
"""
from __future__ import print_function

import glob
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SPEC = os.path.join(ROOT, 'docs', 'spec')

SENTENCE = 10

# ⭐ The harvest: a bracketed sentence followed by a PAST-tense verb of saying.
WITHDRAWN = re.compile(
    u'[「『]([^「」『』]{%d,})[」』][ 　]*(?:と|を)?[ 　]*'
    u'(?:定めて|書いて|述べて|求めて|言って|呼んで)いた' % SENTENCE)

# ⛔⛔ THE PREDICATE IS NOT "PRESENT TENSE". Measured 2026-09-12: requiring a
# Japanese present-tense verb of saying after the echo returns ZERO, because
# all twelve echoes live in `src/` and `tests/`, and A CODE COMMENT HAS NO
# PRESENT TENSE. It does not write "the specification says X"; it writes X.
# ⇒ Quoting the sentence at all is asserting it.
#
# ⭐ So the question flips: not "is this asserted?" but "is this MARKED AS
# HISTORY?" And the marker may be in EITHER LANGUAGE. Both echoes hand-checked
# on 2026-09-12 were honest records of the very same withdrawal, written in
# English inside a comment:
#
#     "...which was true of the row as it stood until 2026-09-08 -- 「X」"
#     "Until that day AS-1 read 「X」 and the case below asserted..."
#
# ⛔ A Japanese-only past-tense filter calls both of those a defect. They are
# not. They are the comment doing exactly what ruling E protects.
HISTORICAL = re.compile(
    u'(?:定めて|書いて|述べて|求めて|言って|呼んで)いた|'
    u'まで|かつて|旧|以前は|撤回|'
    u'まで|かつて|旧|以前は|撤回')

# ⛔⛔ SEPARATE, AND CASE-INSENSITIVE. Measured 2026-09-12: this codebase
# SHOUTS ITS EMPHASIS IN CAPITALS, and a first-letter character class misses
# every one of them -- `uf-32-ruler-band.test.ts` says in as many words "THE
# PER-段 ENUMERATION THIS FILE USED TO QUOTE ... WAS WITHDRAWN ON 2026-09-04"
# and was still reported as a defect.
# ⚠️ A comment may also mark the rot without naming a date: "FR-001 still
# reads X, which the invariant has made stale". That is reporting, not
# asserting, so `stale` belongs here too.
HISTORICAL_EN = re.compile(
    u'until|used to|formerly|no longer|was |were |stood|reads?|before |'
    u'rewritten|withdraw|retract|replaced|superseded|'
    u'stale|obsolete|outdated',
    re.IGNORECASE)

CJK = re.compile(u'[぀-ヿ一-鿿]')
DROP = u'*`　 ⭐⚠️⛔✅⇒—―_'

# ⚠️ The marker sits in the comment BLOCK, not on the echo's own line -- both
# hand-checked cases carry it two to four lines above. So the window is taken
# from the whole file text around the echo, not from the line.
BEHIND = 500
AHEAD = 200


def flatten(text):
    """Check 42's mill, because the two sides disagree about emphasis."""
    for ch in DROP:
        text = text.replace(ch, u'')
    return text


def manuscripts():
    out = {}
    pattern = os.path.join(SPEC, '**', '*.md')
    for p in sorted(glob.glob(pattern, recursive=True)):
        if os.sep + 'output' + os.sep in p:
            continue
        with io.open(p, encoding='utf-8', errors='replace') as fh:
            out[p] = fh.read().replace('\r\n', '\n')
    return out


def comments():
    """src/ and tests/ -- a comment may cite a withdrawn rule too."""
    out = {}
    for top in ('src', 'tests'):
        base = os.path.join(ROOT, top)
        for ext in ('ts', 'tsx'):
            pattern = os.path.join(base, '**', '*.' + ext)
            for p in glob.glob(pattern, recursive=True):
                with io.open(p, encoding='utf-8', errors='replace') as fh:
                    out[p] = fh.read().replace('\r\n', '\n')
    return out


def harvest(books):
    """flattened sentence -> [(file, lineno, as written)] of its record."""
    found = {}
    for path, text in sorted(books.items()):
        for n, line in enumerate(text.split('\n'), 1):
            for m in WITHDRAWN.finditer(line):
                s = m.group(1)
                if CJK.search(s) is None:
                    continue
                found.setdefault(flatten(s), []).append((path, n, s))
    return found


def main():
    verbose = '--verbose' in sys.argv
    books = manuscripts()
    dead = harvest(books)

    haystacks = dict(books)
    haystacks.update(comments())

    hits = []
    marked = 0
    for key, records in sorted(dead.items()):
        # ⛔ The record's own line is the source, not a citation of it.
        source_lines = set((p, n) for p, n, _ in records)
        for path, text in sorted(haystacks.items()):
            if flatten(text).find(key) < 0:
                continue
            lines = text.split('\n')
            # ⛔ Offsets are accumulated, never searched for. `text.find(line)`
            # returns the FIRST line with that text, which is the wrong window
            # whenever a line repeats -- and comment scaffolding repeats.
            here = 0
            for n, line in enumerate(lines, 1):
                start, here = here, here + len(line) + 1
                if (path, n) in source_lines:
                    continue
                if flatten(line).find(key) < 0:
                    continue
                # ⭐ The window is the surrounding comment block, both ways.
                window = text[max(0, start - BEHIND):start + len(line) + AHEAD]
                if HISTORICAL.search(window) or HISTORICAL_EN.search(window):
                    marked += 1
                    continue
                hits.append((path, n, records[0], records[0][2]))
    return_marked = marked

    out = io.open(sys.stdout.fileno(), 'w', encoding='utf-8', errors='replace')
    out.write(u'%d withdrawn sentence(s) harvested from retraction records\n'
              % len(dead))
    out.write(u'%d echo(es) elsewhere that DO mark themselves as history '
              u'(⭐ honest)\n' % return_marked)
    out.write(u'%d echo(es) that assert a withdrawn rule with no such mark\n\n'
              % len(hits))
    for path, n, rec, sentence in hits:
        rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
        src = os.path.relpath(rec[0], ROOT).replace(os.sep, '/')
        out.write(u'%s:%d\n' % (rel, n))
        out.write(u'  cites   : %s\n'
                  % (sentence if verbose else sentence[:70]))
        out.write(u'  withdrawn at: %s:%d\n\n' % (src, rec[1]))
    out.flush()
    return 0


if __name__ == '__main__':
    sys.exit(main())
