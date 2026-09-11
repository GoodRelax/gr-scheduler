# -*- coding: utf-8 -*-
"""List a citation whose NAMED SEAT does not contain what it quotes.

⛔⛔ THIS IS NOT A GATE, and must not be added to check.sh until someone has
measured its precision on a sample. `list-asserted-claims.py` is the precedent
for a detector deliberately kept out of the suite (63% precision, measured over
a 30-line sample), and check 45 is the precedent for one let in (9/10).

⭐ WHY THIS EXISTS. The cleanup round of 2026-09-11 found 32 false statements
in the specification (`D-445`..`D-476`). Eighteen of them are an edge that
lies, and NINE are one shape: a seat cites another seat for a sentence that
seat does not carry. `FR-013` cited its own RATIONALE for a sentence living in
`FR-011`; `FR-017` cited `FR-039` for typography `FR-039` never mentions;
`FR-051` attributed its own MUST to table T-031.

⛔⛔ CHECK 42 PASSES ALL NINE, and that is the whole reason for this file.
Check 42 asks whether a quotation exists ANYWHERE under `docs/spec`. For these
the answer is yes -- the sentence is real, it is just in a different seat. The
question that catches them binds the quotation to the seat the prose NAMES:

    check 42    "is this sentence somewhere in the manuscripts?"
    this tool   "is this sentence in the seat this sentence says it is in?"

⭐ NOTHING HERE IS NEW MACHINERY. `specindex.build()` already owns where a
seat begins and ends -- `row_owner` locates every row ID, `owner_at` maps a
line to the UID that owns it, `lines` holds the text. The normalisation is
check 42's, because the manuscripts and their quoters disagree about emphasis,
backticks and full-width spaces in exactly the same ways.

⛔ PRESENT TENSE ONLY. A retraction record quotes the rule it withdrew --
"...まで「X」と定めていた" -- and that quotation is SUPPOSED to be absent from
the seat, because the seat withdrew it. Ruling E of 2026-09-11 protects those
records. So the verbs here are present tense, and the past-tense forms are
excluded rather than filtered afterwards.

⚠️ WHAT IT DOES NOT CATCH, of the eighteen:
  - a retracted rule quoted as live (4) -- needs the retraction records read
    as a set of withdrawn sentences, which is a different tool
  - a false completeness claim (5) -- a machine cannot know WHICH two sets
    "本表が全数である" is claiming about. ⭐ The fix is the other way round:
    make the claim name its two sets, then this kind of check is trivial.
  - the specification citing a comment in `src/` (1) -- cheap, but a different
    question: an identifier that resolves only outside `docs/spec`.

USAGE
    python .claude/skills/spec-graph-check/list-lying-edges.py [--verbose]

Exit code is 0 whatever it finds. ⛔ It is a list, not a verdict.
"""
from __future__ import print_function

import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import specindex  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

# A quotation long enough to be a sentence rather than a name.
SENTENCE = 10
QUOTED = re.compile(u'[「『]([^「」『』]{%d,})[」』]'
                    % SENTENCE)
CJK = re.compile(u'[぀-ヿ一-鿿]')

# ⛔ PRESENT TENSE ONLY -- see the module docstring on ruling E.
SAYS = re.compile(
    u'と定めている|と述べている|'
    u'と書いている|と言っている|'
    u'と求めている|と定める|が定める|'
    u'が求める|が持つ|が書く')

# The other books a comment may honestly quote instead of the manuscripts.
ATTRIBUTION = 120
OTHER_BOOKS = re.compile(
    u'D-[0-9]+|CR-[0-9]+|PD-[0-9]+|利用者の|逐語|'
    u'台帳|changelog|fixed-defects|rulings')

# How far back from a quotation a seat token still counts as naming it.
NEAR = 60

SEAT_QUALIFIED = re.compile(
    u'表 (T-[0-9]+[a-z]?) の\\s*`?([A-Z]{1,3}-[0-9]+[a-z]?)`?')
SEAT_TABLE = re.compile(u'表 (T-[0-9]+[a-z]?)')
SEAT_UID = re.compile(r'`((?:FR|NFR|UC|GL)-[0-9]+[a-z]?)`')
SEAT_ROW = re.compile(r'`([A-Z]{1,3}-[0-9]+[a-z]?)`')

ELISION = re.compile(u'…+|\\.\\.\\.|~~')
DROP = u'*`　 ⭐⚠️⛔✅⇒—―-_（）()[]'


def flatten(text):
    """Both sides through the same mill -- check 42's, deliberately."""
    for ch in DROP:
        text = text.replace(ch, u'')
    return text


def manuscripts(index):
    """file -> flattened whole text, for the 'exists elsewhere' column."""
    return dict((f, flatten(u'\n'.join(ls))) for f, ls in index.lines.items())


def seat_text(index, seat, lines_by_file):
    """The text the named seat owns, flattened -- or None if unknown.

    ⭐ Three kinds of seat, all of them already located by specindex:
      a row ID   -> the single table row it names
      a table    -> every row that table owns
      a UID      -> every line owner_at files against it
    """
    if seat in index.row_owner:
        out = []
        for _tid, f, ln in index.row_owner[seat]:
            ls = lines_by_file.get(f)
            if ls and 0 < ln <= len(ls):
                out.append(ls[ln - 1])
        return flatten(u'\n'.join(out)) if out else None

    if seat in index.tables:
        # ⛔ A TABLE'S SEAT IS NOT ONLY ITS ROWS. Measured on the first run:
        # the prose that closes a table -- 「同表の結び」 -- carries rules of
        # its own, and table T-023d's closing is cited by name. Collecting
        # only rows made that a false positive. The span runs from the
        # table's heading to whatever heading comes next.
        out = []
        for f, ls in lines_by_file.items():
            start = None
            for n, line in enumerate(ls):
                if start is None:
                    if line.startswith(u'**表 %s ' % seat) or \
                       line.startswith(u'**表 %s—' % seat):
                        start = n
                    continue
                if line.startswith(u'**表 T-') or line.startswith(u'#### ') \
                   or line.startswith(u'## '):
                    break
            if start is not None:
                end = n if n > start else len(ls)
                out.extend(ls[start:end])
        if not out:
            for row in index.rows_of(seat):
                for _tid, f, ln in index.row_owner.get(row, []):
                    ls = lines_by_file.get(f)
                    if ls and 0 < ln <= len(ls):
                        out.append(ls[ln - 1])
        return flatten(u'\n'.join(out)) if out else None

    if seat in index.uids:
        out = []
        for (f, ln), owner in index.owner_at.items():
            if owner != seat:
                continue
            ls = lines_by_file.get(f)
            if ls and 0 < ln <= len(ls):
                out.append(ls[ln - 1])
        return flatten(u'\n'.join(out)) if out else None

    return None


def parts_of(quote):
    """A quotation that elides must match in order, part by part."""
    bits = [flatten(p) for p in ELISION.split(quote)]
    return [b for b in bits if len(b) >= SENTENCE]


def found_in(parts, hay):
    at = 0
    for p in parts:
        i = hay.find(p, at)
        if i < 0:
            return False
        at = i + len(p)
    return True


def seats_before(window):
    """Every seat the prose names in the run just before a quotation.

    ⚠️ Order matters: '表 T-023d の `GR-5`' names the ROW, not the table, so
    the qualified form is consumed first and its table is not offered again.
    """
    seats = []
    rest = window
    for m in SEAT_QUALIFIED.finditer(window):
        seats.append(m.group(2))
        rest = rest.replace(m.group(0), u' ')
    for pat in (SEAT_UID, SEAT_ROW, SEAT_TABLE):
        for m in pat.finditer(rest):
            g = m.group(1)
            if g not in seats:
                seats.append(g)
    return seats


def scan(index):
    lines_by_file = index.lines
    books = manuscripts(index)
    hits = []
    for f, ls in sorted(lines_by_file.items()):
        for n, line in enumerate(ls, 1):
            for m in QUOTED.finditer(line):
                quote = m.group(1)
                if CJK.search(quote) is None:
                    continue
                tail = line[m.end():m.end() + NEAR]
                if not SAYS.search(tail):
                    continue
                before = line[max(0, m.start() - ATTRIBUTION):m.start()]
                if OTHER_BOOKS.search(before):
                    continue
                seats = seats_before(line[max(0, m.start() - NEAR):m.start()])
                if not seats:
                    continue
                parts = parts_of(quote)
                if not parts:
                    continue
                named, verdict = None, None
                for seat in seats:
                    text = seat_text(index, seat, lines_by_file)
                    if text is None:
                        continue
                    named = seat
                    if found_in(parts, text):
                        verdict = 'ok'
                        break
                    verdict = 'missing'
                if verdict != 'missing':
                    continue
                elsewhere = [os.path.basename(g) for g, t in books.items()
                             if found_in(parts, t)]
                hits.append((f, n, named, quote, elsewhere))
    return hits


def main():
    verbose = '--verbose' in sys.argv
    index = specindex.build(ROOT)
    hits = scan(index)

    out = io.open(sys.stdout.fileno(), 'w', encoding='utf-8', errors='replace')
    out.write(u'%d citation(s) whose named seat does not carry them\n' % len(hits))
    real = [h for h in hits if h[4]]
    out.write(u'  of which %d exist elsewhere under docs/spec '
              u'(the shape check 42 passes)\n' % len(real))
    out.write(u'  and %d exist nowhere in the manuscripts at all\n\n'
              % (len(hits) - len(real)))
    for f, n, seat, quote, elsewhere in hits:
        rel = os.path.relpath(f, ROOT).replace('\\', '/')
        out.write(u'%s:%d\n' % (rel, n))
        out.write(u'  names : %s\n' % seat)
        out.write(u'  quotes: %s\n' % (quote if verbose else quote[:70]))
        out.write(u'  lives : %s\n\n' % (u', '.join(elsewhere) or u'nowhere'))
    out.flush()
    return 0


if __name__ == '__main__':
    sys.exit(main())
