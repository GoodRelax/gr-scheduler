# -*- coding: utf-8 -*-
"""Fixed hand rewrites in 01-04-requirements.md that the sweeps cannot reach.

Run AFTER sweep_schedule_filter_ja.py (the left sides are the swept text).
Each rewrite is written once; a rewrite already done counts as done, and a
rewrite whose text is missing is reported, never guessed.

    python studies/82-anms-ndd-apply-plan/bgqa11-sweeps/hand_requirements.py [FILE...]
"""
import sys

REQ = 'docs/spec/01-04-requirements.md'

FIXES = [
    # U-10 is Cursor (JDG-3375, BGQA11 row 5); the tool refuses the rename
    # because the palette group cursorsGroup still carries the label Cursors.
    (u'単独で書いたら `Cursors`（日付を指す線の総称）', u'単独で書いたら `Cursor`（日付を指す線の総称）'),
    (u'総称の `Cursors` と個々を混同しないこと。', u'総称の `Cursor` と個々を混同しないこと。'),
    (u'| EP-6 | `Cursors`（`U-10`）の 3 種', u'| EP-6 | `Cursor`（`U-10`）の 3 種'),
    # JDG-3908: the narrowing meaning of the check filter is 日程抽出
    (u'日程抽出はレポートの表から日程表を絞るだけである。', u'日程抽出は、レポートの表から日程表に描くタスクを抽出するだけである。'),
    (u'）で日程表に描くタスクを絞ること（日程抽出）', u'）で日程表に描くタスクを抽出すること（日程抽出）'),
    (u'表示の絞り込みの帯と絵の注', u'チェックで日程抽出バーと絵の注'),
    (u'`GRS` は、掛けたことを `UN-20` の 1 段', u'`GRS` は、日程抽出したことを `UN-20` の 1 段'),
    (u'`IC-143` で日程表を絞る（利用者が定めた）', u'`IC-143` で日程抽出する（利用者が定めた）'),
]


def main(argv):
    files = argv or [REQ]
    missing = 0
    for path in files:
        with open(path, encoding='utf-8', newline='') as h:
            text = h.read()
        for old, new in FIXES:
            if old in text:
                print('fixed  %d  %s' % (text.count(old), new[:40]))
                text = text.replace(old, new)
            elif new in text:
                print('done      %s' % new[:40])
            else:
                print('MISSING   %s' % old[:40])
                missing += 1
        with open(path, 'w', encoding='utf-8', newline='') as h:
            h.write(text)
    sys.exit(1 if missing and files == [REQ] else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
