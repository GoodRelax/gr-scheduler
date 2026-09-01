# -*- coding: utf-8 -*-
"""Check 31 -- a row whose 対応方針・決定仕様 cell still reads as blocked when

the same row says the block is over.

⛔ WHY THIS EXISTS. `docs/development-records/defects.md` column 5, 対応方針・
決定仕様, is written APPEND-ONLY in practice. When a row is blocked, someone
writes 「未定」 or 「利用者の裁定が要る」 at the front of the cell. When the
ruling comes down later, the resolution is appended FURTHER ALONG the same
cell -- or, worse, recorded in a different column (ステータス moving to a
testing state, or 実物確認 gaining a date). The opening clause is never
deleted, so it outlives the ruling that overturns it.

Measured on 2026-09-01: five rows read as blocked when they were not, and
three of those five were finished work. A read-only agent surveying the ledger
reported six rows as needing the user's ruling; every one of them had already
been ruled. That is a whole review cycle spent on nothing. D-131 is one of the
five, and it now says so in its own cell: 「2026-09-01 の棚卸しで、本欄が
『塞がっている』と読める 5 行のうちの 1 つとして見つかった」 -- while the same
cell still carries the two phrases that made it read that way, 「仕様に行が
無い」 and 「利用者の裁定が要る」, sitting after 「決着済み」 and 「書いた先は」.
Deleting the stale opening was not part of the fix, so the row remains a
correct hit for this check even after being resolved. That is by design: the
check reads what the cell currently CONTAINS, not what a human would say the
cell currently MEANS.

WHAT COUNTS AS A HIT. Both of these true in the SAME row:

  1. Cell 5 (対応方針・決定仕様) contains a still-blocked phrase: 未定,
     利用者の裁定が要る, 裁定を待つ, or 仕様に行が無い.
  2. Something in the SAME row says the block is over. Any of:
       - cell 5 ALSO contains a settled phrase: 裁定を受けた, 裁定が下りた,
         裁定は下りて, 決着, 仕様書へ入れた, or 書いた先は;
       - or cell 6 (ステータス, backticks stripped) is 試験待ち / 実測待ち /
         実測済 -- a row cannot be waiting on its automated tests, waiting to
         be pressed in the shipped build, or already measured, while a ruling
         is genuinely outstanding, since there would be nothing decided to
         build. ⭐ These are the 2026-09-01 names of what were テスト中 /
         テスト待ち / テスト完了, and they pick out the same rows;
       - or cell 9 (実物確認) begins with ✅ -- somebody already looked at the
         working thing, which cannot happen before it was decided what to
         build.

⚠️ THE EXCEPTION THIS CANNOT TELL APART. A row may legitimately say "the
first question was ruled, a second one is now open" -- an early decision
settled and appended with 決着, and a LATER, DIFFERENT question opened with
its own 未定 further along the same cell. Read top to bottom that is not
stale text, it is two honest facts in one cell. A substring match over the
whole cell cannot distinguish that from the append-only staleness this check
exists to catch -- both look like "blocked phrase + settled phrase, same
cell". Weakening the match to try would also hide real staleness (a phrase
search that requires the settled text to come first would miss a row where
the append instead landed IN FRONT of an untouched old clause). So this check
does not try: it holds a debt against a baseline the same way check 29 does,
and the honest "second question" rows sit inside that baseline rather than
being specially exempted. Bringing the baseline down is the work of clearing
real staleness (which does mean rewording, not deleting, the rows that turn
out to be false positives); letting it grow is not.

    python .claude/skills/spec-graph-check/check-stale-blocked.py [ledger-path]

Run with PYTHONIOENCODING=utf-8. An optional argv[1] points at a different
ledger file (a scratch copy, to rehearse a FAIL/PASS without touching the real
one); the baseline file is always the one beside this script.
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
LEDGER = os.path.join(ROOT, 'docs', 'development-records', 'defects.md')
BASELINE = os.path.join(HERE, 'stale-blocked-baseline.txt')
REL = 'docs/development-records/defects.md'
REL_BASELINE = '.claude/skills/spec-graph-check/stale-blocked-baseline.txt'

# ⛔ Phrases that mean "this cell is waiting on a ruling or a spec row that
# does not exist yet".
STILL_BLOCKED = (u'未定', u'利用者の裁定が要る', u'裁定を待つ', u'仕様に行が無い')

# ⭐ Phrases that mean the block named above is over, when they sit in the
# same cell as one of the phrases above.
SETTLED_IN_CELL = (u'裁定を受けた', u'裁定が下りた', u'裁定は下りて', u'決着',
                    u'仕様書へ入れた', u'書いた先は')

# ⭐ A status this far along could not have been reached without a decision.
# ⚠ Renamed 2026-09-01 with the eight-state ledger: テスト中 and テスト待ち
# both became 試験待ち, and テスト完了 split into 実測待ち (green tests, the
# shipped build not pressed yet) and 実測済 (pressed and measured). All three
# say the code exists, so all three still say a ruling cannot be outstanding.
TESTING_STATUSES = (u'試験待ち', u'実測待ち', u'実測済')

SEEN_MARK = u'✅'  # the ✅ that opens 実物確認 once someone has looked


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def find_stale(ledger_path):
    """Every row hitting both conditions, as (row_id, why)."""
    text = io.open(ledger_path, encoding='utf-8').read()
    hits = []
    for line in text.split('\n'):
        if not line.startswith('| D-'):
            continue
        cells = line.split('|')
        if len(cells) != 11:
            continue                      # not a full ledger row; skip it
        row_id = cells[1].strip()
        decided = cells[5]
        status = cells[6].strip().strip('`')
        seen = cells[9].strip()

        if not any(phrase in decided for phrase in STILL_BLOCKED):
            continue

        why = None
        if any(phrase in decided for phrase in SETTLED_IN_CELL):
            why = u'決定仕様の欄に決着の語も入っている'
        elif status in TESTING_STATUSES:
            why = u'ステータスが %s まで進んでいる' % status
        elif seen.startswith(SEEN_MARK):
            why = u'実物確認が ✅ で始まっている'

        if why is not None:
            hits.append((row_id, why))
    return hits


def read_baseline():
    if not os.path.exists(BASELINE):
        return None
    try:
        with io.open(BASELINE, encoding='utf-8') as handle:
            return int(handle.readline().strip())
    except (OSError, ValueError):
        return None


def main():
    ledger_path = sys.argv[1] if len(sys.argv) > 1 else LEDGER
    hits = find_stale(ledger_path)
    count = len(hits)
    held = read_baseline()

    if held is None:
        say('PROBLEM  %s has not been written yet' % REL_BASELINE)
        return 1

    if count > held:
        shown = hits[:12]
        fresh = u' '.join(u'%s(%s)' % (row_id, why) for row_id, why in shown)
        if len(hits) > 12:
            fresh += u' …'
        say('FAIL     %s: rows reading as blocked while the same row says '
            'the block is over went %d -> %d. ⛔ A cell may not keep 未定 / '
            '利用者の裁定が要る / 裁定を待つ / 仕様に行が無い once the same '
            'row shows a ruling, a testing status, or a ✅ 実物確認. Raise '
            'the number in %s only to take the debt on deliberately, and '
            'say why in the commit.' % (REL, held, count, REL_BASELINE))
        say('         %s' % fresh)
        return 1

    if count < held:
        say('OK       %s: %d row(s) read as blocked while settled (was %d) '
            '-- ⭐ lower the baseline in %s to hold the ground'
            % (REL, count, held, REL_BASELINE))
        return 0

    say('OK       %s: %d row(s) read as blocked while settled, which is the '
        'baseline' % (REL, count))
    return 0


if __name__ == '__main__':
    sys.exit(main())
