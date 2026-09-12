# -*- coding: utf-8 -*-
"""Check 40 -- a ledger row still reading as un-ruled while a pending decision

it names has already been ruled.

⛔ WHY THIS EXISTS. The same question lands in TWO books.
`docs/development-records/defects.md` (the ledger) holds it as a `D-` row, and
`docs/development-records/pending-decisions.md` holds it as a `PD-` row. Rule
06 section 3 makes the PD row the place the ruling is RECORDED -- 「裁定を受け
たら … 行の状態を 裁定済 にする（⛔ 行は消さない。記録である）」 -- but nothing
carries that back to the ledger cell, and nothing reads the two books together.

⚠️ MEASURED 2026-09-06: four items were handed out to bodies as un-ruled and
re-worked from scratch when they had already been ruled. `D-270` is one of
them. Its 対応方針・決定仕様 cell opened 「⛔ 未検討。」 while `PD-178` had
stood at 裁定済 since 2026-08-23 -- thirteen days -- carrying the answer
(「値で返す。表 T-233 に行を新設する」) AND the name of the test that had to
fall (`tests/unit/layout-engine.test.ts` の 512 行). A whole round of work was
spent rediscovering a ruling that was written down, in this repository, with
its own consequences spelled out.

⭐⭐ THE RULE THIS ENFORCES. It is not invented here. Two rules already
written say it between them:

  - `docs/development-rules/06-pending-decisions.md:88` -- 「裁定を受けたら …
    → 行の状態を 裁定済 にする（⛔ 行は消さない。記録である）」. So 裁定済
    means, by the rule's own words, that the ruling HAS BEEN RECEIVED.
  - `docs/development-rules/05-working-method.md:375` and the two rows under
    it -- the ledger's status bands: 「`未仕分け` ／ まだ調べていない ／
    `未検討`」 and 「`仕様の穴` ／ ⛔ 利用者の裁定か、仕様の行が要る ／
    `裁定待ち` ＋ `仕様待ち`」.

⇒ A row cannot honestly say 「まだ調べていない」 or 「利用者の裁定が要る」
about a question the other book already records as 裁定済. The two statements
are about the same question and they contradict each other. This check reads
both books and prints where they do.

WHAT COUNTS AS A HIT. Both of these true for the SAME `D-` row:

  1. The row READS AS UN-RULED -- either its ステータス cell is 未検討 /
     裁定待ち / 仕様待ち, or its 対応方針・決定仕様 cell contains one of
     未検討, 裁定待ち, 利用者の裁定が要る, 裁定を待つ, 未定, 仕様に行が無い.
  2. The row NAMES a `PD-nnn` whose 状態 in pending-decisions.md is 裁定済.

⭐ CONDITION 1 IS READ OUTSIDE QUOTATION AND OUTSIDE A DATED RECORD, through
the same `asserts_any()` check 31 uses. A sentence opening 「⚠️ 実測（YYYY-MM-
DD）」 records what was true on that day and is struck before the phrases are
looked for (`D-367`, the user's ruling of 2026-09-07 on `PD-441`; the notation
is written down in `docs/development-rules/04-verification.md` section 6.6).
⚠️ MEASURED 2026-09-07: this check's count did not move (3), because the three
rows it still holds date their history in prose that does not carry the mark.
⛔ The ステータス test is untouched -- cell 6 holds one state name and nothing
else, so it is a present claim by construction and can never be a record.

⭐ CONDITION 1 IS ALSO DELIBERATELY THE SAME SHAPE AS CHECK 31's, and the two
checks overlap on some phrases. They are not the same check: check 31's
evidence that the block is over comes from ELSEWHERE IN THE SAME ROW, and this
one's comes from THE OTHER FILE. A row can fail one and pass the other, and
the fix is different -- check 31 asks you to reword a cell, this one asks you
to go and read a ruling you already have.

⚠️⚠️ WHAT THIS DOES NOT COVER, and the measurement that says so. The link is
NOT only `PD- -> D-`:

  - A ruling may be recorded ONLY in the ledger cell (no PD row at all). That
    is check 31's axis, and check 31's STILL_BLOCKED list does not hold 未検討
    nor its SETTLED list 裁定された -- so `D-301`, one of this session's four,
    is caught by NEITHER check. Widening check 31's vocabulary is the fix
    there; it is not this check's job.
  - A ruling may be recorded ONLY in a `change-request/CR-*.md`. `D-301` was
    ruled by `CR-364`, and its row names it. ⛔ MEASURED 2026-09-06: gating on
    "the row names a CR whose file names this D-row back" flags 38 rows, and a
    CR naming a `D-` row does not mean that row's question was RULED -- a CR
    routinely cites the row that RAISED it. That is a 38-row noise floor on a
    7-row signal, so this check does not gate on it. The CR-only candidates
    are COUNTED AND PRINTED on every run instead, so the gap is visible rather
    than silent.

⭐ The `PD- -> D-` direction is not usable either: 197 PD rows, and only 11 of
them name a `D-nnn` in any cell (measured 2026-09-06). The ledger row naming
its PD is the link that actually exists in the data.

    python .claude/skills/spec-graph-check/check-ruled-elsewhere.py [ledger ...]

Run with PYTHONIOENCODING=utf-8. Optional argv points at different ledger
files (a scratch copy, to rehearse a FAIL/PASS without touching the real one);
the baseline file and pending-decisions.md are always the real ones.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, HERE)
from ledger_quotes import asserts_any                  # noqa: E402

LEDGER = os.path.join(ROOT, 'docs', 'development-records', 'defects.md')
# The ledger is TWO FILES since 2026-09-02: a row reaching 実測済 or 取下げ is
# moved word for word into fixed-defects.md. Both are read, for the same
# reason check 31 reads both -- a row only reaches those states by having been
# ruled on, so the stale openings travel with the harvest.
HARVEST = os.path.join(ROOT, 'docs', 'development-records', 'fixed-defects.md')
PENDING = os.path.join(ROOT, 'docs', 'development-records',
                       'pending-decisions.md')
CR_DIR = os.path.join(ROOT, 'change-request')
BASELINE = os.path.join(HERE, 'ruled-elsewhere-baseline.txt')

REL = 'docs/development-records/defects.md'
REL_PENDING = 'docs/development-records/pending-decisions.md'
REL_BASELINE = '.claude/skills/spec-graph-check/ruled-elsewhere-baseline.txt'

# ⛔ Phrases in 対応方針・決定仕様 that say "nobody has ruled on this yet".
UNRULED_IN_CELL = (u'未検討', u'裁定待ち', u'利用者の裁定が要る',
                   u'裁定を待つ', u'未定', u'仕様に行が無い')

# ⛔ States that say "nobody has ruled on this yet".
#
# ⚠⚠ MEASURED 2026-09-07: 仕様待ち USED TO BE IN THIS TUPLE, and it does not
# belong. Rule 05:376 puts 裁定待ち and 仕様待ち in one band whose label is an
# OR -- 「利用者の裁定か、仕様の行が要る」 -- and the ledger's own status table
# (docs/development-records/defects.md:61) spells out which half 仕様待ち is:
# 「裁定は下りた。⚠ まだ仕様書に書かれていない」. ⇒ 仕様待ち is what a row
# MOVES TO when its ruling comes down, so flagging it as un-ruled fires on
# exactly the rows that did the right thing. Eight rows went red the moment
# PD-431..PD-441 were ruled and their ledger rows were advanced.
UNRULED_STATUS = (u'未検討', u'裁定待ち')

# ⭐ The one state rule 06 step 3 writes when the ruling has come down.
SETTLED_STATE = u'裁定済'

LEDGER_CELLS = 11        # | ID | 不具合内容 | ... | 実物確認 |  -> 9 columns
PENDING_CELLS = 10       # | PD | 何が未決か | ... | 状態 |      -> 8 columns


# 「表 T-023a の PD-n」 -- the table row, not the pending decision. See D-468.
TABLE_ROW_PD = re.compile(u'表 T-023a の [`]?PD-\\d+[`]?')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def settled_decisions(path):
    """Every PD id whose 状態 cell is 裁定済."""
    settled = set()
    total = 0
    if not os.path.exists(path):
        return settled, total
    for line in io.open(path, encoding='utf-8'):
        if not line.startswith('| PD-'):
            continue
        cells = line.rstrip('\n').split('|')
        if len(cells) != PENDING_CELLS:
            continue
        total += 1
        if cells[8].strip().strip(u'` *') == SETTLED_STATE:
            settled.add(cells[1].strip())
    return settled, total


def crs_naming_row(row_id):
    """CR files that mention this D-row. Advisory only -- see the docstring."""
    named = set()
    if not os.path.isdir(CR_DIR):
        return named
    for name in os.listdir(CR_DIR):
        match = re.match(r'(CR-\d+)', name)
        if not match or not name.endswith('.md'):
            continue
        try:
            text = io.open(os.path.join(CR_DIR, name),
                           encoding='utf-8', errors='replace').read()
        except OSError:
            continue
        if re.search(r'\b%s\b' % re.escape(row_id), text):
            named.add(match.group(1))
    return named


def scan(ledger_path, settled):
    """(hits, cr_only) for one ledger file.

    hits    -- rows reading un-ruled that name a 裁定済 PD  (the gate)
    cr_only -- rows reading un-ruled with no such PD, but naming a CR that
               names them back  (printed, never gated -- 38-row noise floor)
    """
    hits = []
    cr_only = []
    for line in io.open(ledger_path, encoding='utf-8'):
        if not line.startswith('| D-'):
            continue
        cells = line.rstrip('\n').split('|')
        if len(cells) != LEDGER_CELLS:
            continue                      # not a full ledger row; skip it
        row_id = cells[1].strip()
        decided = cells[5]
        status = cells[6].strip().strip(u'` *')

        # ⛔ READ OUTSIDE QUOTATION (`D-344`), the same way check 31 does.
        # A marker inside 「…」, 『…』 or a `code span` is a quoted
        # requirement, the name of a state, or the row dating its own older
        # text -- not this row's claim to be un-ruled. ⭐ The ステータス test
        # is untouched: cell 6 holds one state name and nothing else.
        reads_unruled = (status in UNRULED_STATUS
                         or asserts_any(decided, UNRULED_IN_CELL))
        if not reads_unruled:
            continue

        # ⛔ `PD-` NUMBERS TWO THINGS. docs/spec's table T-023a has rows
        # PD-1..PD-5, and pending-decisions.md has PD-1..PD-213, so a ledger
        # row writing 「表 T-023a の `PD-5`」 reads here as naming pending
        # decision PD-5 and the row is judged against a ruling that has
        # nothing to do with it. That is D-468, and the session that wrote
        # the row recording the trap fell into it half an hour later.
        # ⚠️ MEASURED 2026-09-12, before this line went in: 0 rows of the open
        # ledger and 5 of the closed one carry that spelling, and all five
        # name a real PD as well -- so this changes no verdict today. It stops
        # the next one.
        # ⛔ Renaming the table's rows was measured and refused: PD-1..PD-5 are
        # cited 526 times across 74 files, one of which is a test's file name.
        named = set(re.findall(r'PD-\d+', TABLE_ROW_PD.sub('', '|'.join(cells))))
        ruled = sorted(named & settled)
        if ruled:
            hits.append((row_id, status, ruled))
            continue

        crs = set(re.findall(r'CR-\d+', '|'.join(cells)))
        if crs and crs_naming_row(row_id) & crs:
            cr_only.append(row_id)
    return hits, cr_only


def read_baseline():
    if not os.path.exists(BASELINE):
        return None
    try:
        with io.open(BASELINE, encoding='utf-8') as handle:
            return int(handle.readline().strip())
    except (OSError, ValueError):
        return None


def main():
    if len(sys.argv) > 1:
        paths = sys.argv[1:]              # a caller naming files explicitly
    else:
        paths = [p for p in (LEDGER, HARVEST) if os.path.exists(p)]

    settled, pd_total = settled_decisions(PENDING)
    if not settled:
        say('PROBLEM  %s yielded no 裁定済 row -- the table shape changed, '
            'and this check would silently pass forever' % REL_PENDING)
        return 1

    hits = []
    cr_only = []
    for path in paths:
        row_hits, row_cr = scan(path, settled)
        hits.extend(row_hits)
        cr_only.extend(row_cr)

    count = len(hits)
    held = read_baseline()

    if held is None:
        say('PROBLEM  %s has not been written yet' % REL_BASELINE)
        return 1

    listing = u' '.join(u'%s[%s]->%s' % (row_id, status, u','.join(ruled))
                        for row_id, status, ruled in hits[:12])
    if len(hits) > 12:
        listing += u' …'

    if count > held:
        say('FAIL     %s: rows reading as un-ruled while a pending decision '
            'they name is 裁定済 went %d -> %d. ⛔ Rule 06 section 3 says '
            '裁定済 means the ruling has been received, and rule 05 says '
            '未検討 means まだ調べていない -- the same question cannot be '
            'both. Go and READ the ruling before working the row. Raise the '
            'number in %s only to take the debt on deliberately, and say why '
            'in the commit.' % (REL, held, count, REL_BASELINE))
        say('         %s' % listing)
        return 1

    if count < held:
        say('OK       %s: %d row(s) read as un-ruled while a PD they name is '
            '裁定済 (was %d, of %d PD rows) -- ⭐ lower the baseline in %s to '
            'hold the ground' % (REL, count, held, pd_total, REL_BASELINE))
    else:
        say('OK       %s: %d row(s) read as un-ruled while a PD they name is '
            '裁定済, which is the baseline (%d PD rows read)'
            % (REL, count, pd_total))
    if listing:
        say('         %s' % listing)

    # ⚠️ Printed green or red. See the docstring: a ruling recorded only in a
    # change request cannot be gated on without a 38-row noise floor, so the
    # gap is counted out loud rather than left invisible.
    say('         NOT GATED: %d further row(s) read as un-ruled while naming '
        'a change request that names them back. A CR often cites the row that '
        'RAISED it, so this is a candidate list, not a fault list.'
        % len(cr_only))
    return 0


if __name__ == '__main__':
    sys.exit(main())
