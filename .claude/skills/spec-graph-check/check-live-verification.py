# -*- coding: utf-8 -*-
"""Hold the defect ledger against what has actually been SEEN in the app.

    python .claude/skills/spec-graph-check/check-live-verification.py

WHY THIS EXISTS, MEASURED ON 2026-08-29. The user asked why defects need more
than one session. The ledger answered: of 70 rows they had reported, 31 closed
in one day and 39 did not -- and of 28 rows standing at `テスト完了`, only 6
carried any evidence that the application had been opened and looked at. One of
them (D-69) had been reported to the user as finished on green tests alone and
was not fixed at all; the user found it in a screenshot.

⛔ THE LEDGER ALREADY SAID SO AND COULD NOT KEEP ITS WORD. Its own preamble
reads 「実装済」は試験が緑という意味であって、実物で動いた証拠ではない ... だから
`テスト完了` と「実物で確認」を分けて持つ -- but there was no column to hold the
second half in, so the distinction lived in prose and nowhere a tool could read.
This check exists because rule 04's lesson only holds when a machine holds it:
a principle carried in prose was skipped in every round it applied to.

WHAT IT DOES:

  - counts the rows at `テスト完了` whose 実物確認 cell is still 未, prints them
    by name, and FAILS if that count is higher than the baseline beside this
    file. The baseline may go DOWN freely; it may only go up deliberately.
  - FAILS on a row that claims a verification date while standing at a status
    that cannot have one (未検討 / 追加裁定待ち / 仕様確定 / 仕様書反映済み),
    which is a
    contradiction rather than a debt.

⚠️ IT DOES NOT FAIL ON THE DEBT ITSELF. 23 rows carry it today; a gate that
went red on all of them would be red for weeks and would be ignored, which is
the failure mode this check is meant to end rather than repeat.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# HERE is .claude/skills/spec-graph-check, so the tree is three levels up.
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
LEDGER = os.path.join(ROOT, 'docs', 'development-records', 'defects.md')
BASELINE = os.path.join(HERE, 'live-verification-baseline.txt')
REL_LEDGER = 'docs/development-records/defects.md'
REL_BASELINE = '.claude/skills/spec-graph-check/live-verification-baseline.txt'

DONE = '`テスト完了`'
NOT_SEEN = '⛔ 未'
# Statuses at which a row cannot honestly carry a verification date: nothing has
# been built yet for anyone to have looked at.
TOO_EARLY = ('`未検討`', '`追加裁定待ち`', '`仕様確定`', '`仕様書反映済み`')
SEEN_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def rows():
    """Every defect row, as (id, status, seen)."""
    found = []
    for line in io.open(LEDGER, encoding='utf-8'):
        if not line.startswith('| D-'):
            continue
        cells = [c.strip() for c in line.split('|')]
        if len(cells) < 11:
            say('PROBLEM  %s: row %s has %d cells; the 実物確認 column is missing'
                % (REL_LEDGER, cells[1], len(cells) - 2))
            sys.exit(1)
        found.append((cells[1], cells[6], cells[9]))
    return found


def baseline():
    """How many unseen rows stood at `テスト完了` when this was last agreed."""
    if not os.path.exists(BASELINE):
        return None
    for line in io.open(BASELINE, encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#'):
            return int(line)
    return None


def main():
    """@purity non-pure"""
    all_rows = rows()
    unseen = [r for r in all_rows if r[1] == DONE and r[2].startswith(NOT_SEEN)]
    early = [r for r in all_rows if r[1] in TOO_EARLY and SEEN_DATE.match(r[2])]

    if early:
        for row in early:
            say('PROBLEM  %s claims 実物確認 %s while standing at %s -- nothing '
                'is built to have been looked at' % (row[0], row[2], row[1]))
        say('FAIL     %d row(s) claim a verification that cannot have happened'
            % len(early))
        return 1

    was = baseline()
    if was is None:
        say('PROBLEM  %s has not been written yet' % REL_BASELINE)
        return 1

    if unseen:
        say('   %d row(s) at %s that nobody has opened the app to look at:'
            % (len(unseen), DONE))
        say('   %s' % ' '.join(r[0] for r in unseen))
        say('   ⛔ 「試験が緑」と「実物で動いた」は別である（規則 04）。'
            '⭐ 利用者へ完了と報告してよいのは、実物確認の欄に日付が入っている行である。'
            'この一覧の行は、まだそこに達していない。')

    if len(unseen) > was:
        say('FAIL     unseen rows at %s went %d -> %d. A row may not reach that '
            'status without being looked at unless the debt is taken on '
            'deliberately: raise the number in %s and say why in the commit.'
            % (DONE, was, len(unseen), REL_BASELINE))
        return 1

    if len(unseen) < was:
        say('OK       unseen rows at %s went %d -> %d. ⭐ Lower the baseline in '
            '%s so the ground that was won is held.'
            % (DONE, was, len(unseen), REL_BASELINE))
        return 0

    say('OK       %d row(s) at %s await a look at the real thing, which is the '
        'baseline; %d row(s) carry a verification date'
        % (len(unseen), DONE, sum(1 for r in all_rows if SEEN_DATE.match(r[2]))))
    return 0


if __name__ == '__main__':
    sys.exit(main())
