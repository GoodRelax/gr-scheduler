# -*- coding: utf-8 -*-
"""Check 29 -- a row past 仕様書反映済み names where the specification says it.

⛔ WHY THIS EXISTS. Until 2026-08-30 the ledger could not tell 「裁定が下りた」
from 「仕様書に書いた」: one status carried both, so a change request that was
never written left no trace. The user split the status and asked that writing
the specification means writing back WHERE it landed -- chapter, requirement
UID or table row id, and the wording.

⭐ THIS CHECK IS THE RUNG BELOW THE RULE. A rule is only followed once a
machine looks at it; the same shape already works as check 28, which counts
rows that reached テスト完了 without anyone opening the app.

⚠️ IT HOLDS A DEBT, IT DOES NOT DEMAND ZERO. The convention starts today and
the ledger is 154 rows old, so the count is held against a baseline and fails
only when it RISES. Bringing it down is the work; letting it grow is not.

    python .claude/skills/spec-graph-check/check-decided-spec.py

Run with PYTHONIOENCODING=utf-8.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
LEDGER = os.path.join(ROOT, 'docs', 'development-records', 'defects.md')
BASELINE = os.path.join(HERE, 'decided-spec-baseline.txt')
REL = 'docs/development-records/defects.md'

# ⭐ The statuses that stand AFTER 仕様書反映済み on the ladder. A row here says
# the specification is settled and written, so it must be able to say where.
# ⚠️ 取下げ is not among them: a withdrawn row owes the specification nothing.
NEEDS_SPEC = ('実装待ち', '実装中', 'テスト中', 'テスト待ち', 'テスト完了')

# ⛔ WHAT A SPEC MANAGEMENT NUMBER IS -- and what only looks like one. `D-` is
# this ledger's own id, `PD-` the pending-decision list's, `CR-` a change
# request; none of the three is a place in the specification.
NOT_SPEC = ('D', 'PD', 'CR')
NUMBERED = re.compile(r'`([A-Z]{1,3})-(\d+[a-z]?)`')
TABLE = re.compile(r'表 T-\d+|図 F-\d+|Chapter \d')

# ⭐ A ROW WHOSE FIX IS NOT IN docs/spec CAN STILL SAY WHERE IT LANDED.
# ⚠️ Added 2026-08-31 for the first row that met this honestly: D-168's fix is
# a list in docs/development-rules and a check beside it, and the specification
# is not touched by one character. Without this the row had three bad choices --
# keep a status it had outgrown, claim a place it does not occupy, or push the
# debt count up by one. ⛔ THE DEMAND IS NOT WEAKENED: the cell must still name
# a FILE, so a row that says nothing still fails. What changes is only that the
# place may lie outside docs/spec.
ELSEWHERE = re.compile(r'`?docs/[A-Za-z0-9_./-]+\.md`?')


def names_a_place(cell):
    if TABLE.search(cell) or ELSEWHERE.search(cell):
        return True
    return any(prefix not in NOT_SPEC for prefix, _ in NUMBERED.findall(cell))


def main():
    text = io.open(LEDGER, encoding='utf-8').read()
    missing = []
    for line in text.split('\n'):
        if not line.startswith('| D-'):
            continue
        cells = line.split('|')
        if len(cells) != 11:
            continue                      # the metrics block guards the shape
        row_id = cells[1].strip()
        decided, status = cells[5], cells[6].strip().strip('`')
        if status in NEEDS_SPEC and not names_a_place(decided):
            missing.append(row_id)

    try:
        held = int(io.open(BASELINE, encoding='utf-8').read().split('\n')[0].strip())
    except (OSError, ValueError):
        held = None

    count = len(missing)
    if held is None:
        print('NOTE     %s: %d row(s) past 仕様書反映済み name no place in the '
              'specification; no baseline held yet' % (REL, count))
        return 0
    if count > held:
        fresh = ' '.join(missing[:12]) + (' …' if len(missing) > 12 else '')
        print('FAIL     %s: rows past 仕様書反映済み with no place named in the '
              'specification went %d -> %d. ⛔ A row may not pass 仕様書反映済み '
              'without writing the chapter, the requirement UID or table row id, '
              'and the wording into 対応方針・決定仕様. Raise the number in '
              '.claude/skills/spec-graph-check/decided-spec-baseline.txt only to '
              'take the debt on deliberately, and say why in the commit.\n'
              '         %s' % (REL, held, count, fresh))
        return 1
    if count < held:
        print('OK       %s: %d row(s) past 仕様書反映済み still name no place '
              '(was %d) -- ⭐ lower the baseline to hold the ground' % (REL, count, held))
        return 0
    print('OK       %s: %d row(s) past 仕様書反映済み name no place, which is the '
          'baseline' % (REL, count))
    return 0


sys.exit(main())
