# -*- coding: utf-8 -*-
"""List a COUNT the prose carries itself, and re-derive it where it can.

⛔⛔ NOT A GATE. Measure its precision before anyone adds it to check.sh.

⭐ WHY THIS EXISTS. A false completeness claim or a false prose tally
(`DFC-457`, `DFC-461`, `DFC-463`, `DFC-471`, `DFC-475` among them) is always
the same accident: a sentence states how many of something there are, the
table underneath it gains or loses a row, and NOTHING CONNECTS THE TWO.

⚠️ THE OBVIOUS PREDICATE IS THE WRONG ONE, and measuring said so. Searching
docs/spec for 「全数」「すべて」「だけである」 returns 316 places; narrowing to
those that also name a table still returns 63. ⛔ That is a haystack, not a
list. And reading them shows why: MOST OF THEM ARE THE HEALTHY FORM.

    ⭐ healthy   指令の全数は 表 T-232 が持つ
                 -- the table is the authority. This is what section 1.9 asks
                 for, and there is nothing here to rot.

    ⛔ rotting   拡張領域を使う 2 つはこれだけである
                 -- the prose is doing the counting. The day a third one
                 arrives, this sentence becomes false and no machine notices.

⇒ ⭐⭐ THE PREDICATE IS NOT "DOES IT CLAIM COMPLETENESS". IT IS "DOES THE
PROSE HOLD THE NUMBER ITSELF". A sentence that hands the count to a table
cannot go stale; a sentence that states the count can, and only that one is
worth a human's time.

⭐ AND FOR THE COMMONEST SHAPE IT CAN DO BETTER THAN LIST. When the sentence
names a table AND states a number -- 「表 T-016 の 7 項目」 -- the row count is
recoverable from `specindex`, so the tool re-derives it and says whether the
two agree. ⛔ That column is a HINT, NOT A VERDICT: the number may legitimately
count a subset ("of which three are read-only"), and the tool cannot know
which subset. It reports both numbers and lets a person judge.

⛔ WHAT IT CANNOT DO, said plainly. A completeness claim compares two sets,
and the prose names at most one of them. 「本表が全数である」 is claiming
something about a set defined somewhere else entirely -- which functional
requirements exist, which glossary entries are untouched -- and no string
predicate reaches that. ⭐ The fix is the other way round: make the claim
declare BOTH sets, and the check becomes trivial. That is `P3-8`, still
unruled.

USAGE
    python .claude/skills/spec-graph-check/list-prose-tallies.py [--all]

    --all  also print the pointer-form claims that were filtered out, so the
           filter itself can be audited.

Exit code is 0 whatever it finds. ⛔ It is a list, not a verdict.
"""
from __future__ import print_function

import glob
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import specindex  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SPEC = os.path.join(ROOT, 'docs', 'spec')

# A claim that a set is closed.
# ⛔ 「に限る」 AND 「のみである」 ARE NOT COMPLETENESS CLAIMS, and including
# them was measured to swamp the list: 「入力機器をマウスとキーボードに限る」,
# 「`Of` は比率に限ること（MUST）」, 「規範語として扱うのは大文字で書かれた
# 場合に限る」. Those RESTRICT A SCOPE, which is a healthy thing for a rule to
# do and cannot go stale when a table gains a row. ⭐ A completeness claim is
# about a COUNT being final; a scope restriction is about a CASE being out.
CLAIM = re.compile(u'全数|これだけである|これで全部|他に無い|他にない|'
                   u'以外に無い|以外にない')

# ⭐ The prose holding a number itself. Half-width and full-width both occur.
TALLY = re.compile(u'([0-9０-９]+)\\s*(?:つ|個|件|本|行|項目|列|種|通り|名)')

# ⛔ The healthy form: the count is handed to somewhere that holds it, so the
# prose holds none. ⚠️ The destination is not always a table -- 「確定名の全数
# は `_assets/tbl-glossary.md` が持つ」 hands it to a whole document, and that
# is just as healthy.
DEST = (u'(?:表 T-[0-9]+[a-z]?|`[^`]+\\.md`|`DOC-[A-Z-]+`|'
        u'`[A-Z]{1,3}-[0-9]+[a-z]?`|Chapter [0-9.]+)')
POINTER = re.compile(
    DEST + u'[^。｜]{0,24}?(?:が持つ|に従う|に示す|が挙げる|'
           u'が定める|の別枠|が全数|にある|が並べる)'
    # ⚠️ 「全数は `FR-009`」 and 「対象の全数は `MG-12`」 hand the count over
    # with no verb at all. Measured: the verbless form is common
    # enough that requiring a verb leaves pointer-form claims in the list.
    u'|全数は[^。｜]{0,12}?' + DEST)

TABLE = re.compile(u'表 (T-[0-9]+[a-z]?)')
SENT = re.compile(u'[。｜\n]')

FULLWIDTH = dict((ord(u'０') + i, ord(u'0') + i) for i in range(10))


def manuscripts():
    out = {}
    pattern = os.path.join(SPEC, '**', '*.md')
    for p in sorted(glob.glob(pattern, recursive=True)):
        if os.sep + 'output' + os.sep in p:
            continue
        with io.open(p, encoding='utf-8', errors='replace') as fh:
            out[p] = fh.read().replace('\r\n', '\n')
    return out


def scan(index, books):
    """(hits, pointers) -- prose that counts, and prose that points."""
    hits, pointers = [], []
    for path, text in sorted(books.items()):
        for n, line in enumerate(text.split('\n'), 1):
            for piece in SENT.split(line):
                if not CLAIM.search(piece):
                    continue
                numbers = TALLY.findall(piece)
                tables = TABLE.findall(piece)
                if not numbers:
                    # ⭐ No number at all -- the claim is qualitative. Only
                    # worth a line if it does not point at a table either.
                    if POINTER.search(piece) or tables:
                        pointers.append((path, n, piece, None, None))
                    else:
                        hits.append((path, n, piece, None, None))
                    continue
                if POINTER.search(piece):
                    pointers.append((path, n, piece, numbers, tables))
                    continue
                # ⭐ Both a number and a table: the row count is recoverable.
                # ⛔ UNLESS THE SUBJECT IS 「本表」 OR 「同表」. Measured:
                # 「本表の 3 行が、表 T-021 の `PM-4` が成立する
                # 条件の全数である」 counts the CONTAINING table and merely
                # mentions T-021, so comparing 3 against T-021's five rows
                # invents a mismatch. The sentence still belongs in the list --
                # the prose does hold the count -- but the machine must keep
                # quiet about which table it is counting.
                rows = None
                if tables and not re.search(u'本表|同表|本節|同節', piece):
                    rows = dict((t, len(index.rows_of(t))) for t in tables)
                hits.append((path, n, piece, numbers, rows))
    return hits, pointers


def render(out, rows):
    for path, n, piece, numbers, rows_of in rows:
        rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
        out.write(u'%s:%d\n' % (rel, n))
        out.write(u'  says : %s\n' % piece.strip()[:110])
        if numbers:
            said = u', '.join(str(x).translate(FULLWIDTH) for x in numbers)
            out.write(u'  count: prose says %s' % said)
            if rows_of:
                got = u'; '.join(u'%s has %d row(s)' % (t, c)
                                 for t, c in sorted(rows_of.items()))
                agree = any(str(x).translate(FULLWIDTH) == str(c)
                            for x in numbers for c in rows_of.values())
                out.write(u' -- %s  %s' % (got, u'⭐ agrees' if agree
                                           else u'⚠️ does not match'))
            out.write(u'\n')
        out.write(u'\n')


def main():
    show_all = '--all' in sys.argv
    index = specindex.build(ROOT)
    books = manuscripts()
    hits, pointers = scan(index, books)

    out = io.open(sys.stdout.fileno(), 'w', encoding='utf-8', errors='replace')
    out.write(u'%d completeness claim(s) where the PROSE holds the count\n'
              % len(hits))
    out.write(u'%d that hand the count to a table (⭐ healthy, filtered out)'
              u'\n\n' % len(pointers))
    render(out, hits)
    if show_all:
        out.write(u'--- filtered out as pointer-form ---\n\n')
        render(out, pointers)
    out.flush()
    return 0


if __name__ == '__main__':
    sys.exit(main())
