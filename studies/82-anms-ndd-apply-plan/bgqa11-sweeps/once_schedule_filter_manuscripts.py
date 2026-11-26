# -*- coding: utf-8 -*-
"""Hand fixes for sweep (b): exact old -> new, each must hit exactly the count given."""
import sys

D = 'docs/spec/_source/'
FIXES = [
    (D + 'agent-api-members.json', u'日程抽出した表が 1 つも無ければ', u'日程抽出している表が 1 つも無ければ', 2),
    (D + 'agent-api-members.json', u'最小化で出してから掛ける —— 日程抽出は', u'最小化で出してから日程抽出する —— 日程抽出は', 1),
    (D + 'glossary-tables.json', u'のどれかで日程抽出して日程表に描くタスクを絞っているあいだ、そのことと、掛けている表の名と',
     u'のどれかで日程抽出しているあいだ、そのことと、日程抽出している表の名と', 1),
    (D + 'glossary.json', u'この表で日程抽出しているかどうか。掛かっているあいだ、', u'この表で日程抽出しているかどうか。日程抽出しているあいだ、', 1),
    (D + 'glossary.json', u'チェックで日程抽出バー: 表の日程抽出で描くタスクを絞っているあいだだけ出る帯。掛けている表の名と件数を告げ、すべてのフィルタを解く入口を持つ',
     u'チェックで日程抽出バー: 表で日程抽出しているあいだだけ出る帯。日程抽出している表の名と件数を告げ、すべての日程抽出を解く入口を持つ', 1),
    (D + 'glossary.json', u'日程抽出した表が無ければ null。', u'日程抽出している表が無ければ null。', 1),
    (D + 'glossary.json', u'日程表を絞れる表の名前。', u'日程抽出できる表の名前。', 1),
    (D + 'glossary.json', u'いま描いているタスクと、それを絞っている表。', u'いま描いているタスクと、それを日程抽出している表。', 1),
    (D + 'glossary.json', u'どの表も日程表を絞っていなければ null）と、絞っている表の名前。', u'どの表も日程抽出していなければ null）と、日程抽出している表の名前。', 1),
    (D + 'glossary.json', u'空の並びはフィルタを解き、', u'空の並びは日程抽出を解き、', 1),
    (D + 'glossary.json', u'遅延診断レポートと担当リストのフィルタには触れない。', u'遅延診断レポートと担当リストの日程抽出には触れない。', 1),
    (D + 'glossary.json', u'空の並びはフィルタを解く。', u'空の並びは日程抽出を解く。', 1),
    (D + 'published-entries.json', u'の語を、掛けている表の名・', u'の語を、日程抽出している表の名・', 1),
    (D + 'published-entries.json', u'"掛けている表が無ければ `null`"', u'"日程抽出している表が無ければ `null`"', 1),
    (D + 'published-entries.json', u'（担当なし）の行が「表示」か・掛けているか', u'（担当なし）の行が「表示」か・日程抽出しているか', 1),
    (D + 'row-id-prefixes.json', u'の表示の列と日程抽出で日程表に描くタスクを絞る、日程抽出の規則',
     u'の表示の列のチェックで日程表に描くタスクを抽出する、日程抽出の規則', 1),
    ('docs/spec/A-appendix.md', u'表示の絞り込みの帯 `U-67`', u'チェックで日程抽出バー `U-67`', 1),
]


def main():
    bad = 0
    for path, old, new, want in FIXES:
        with open(path, encoding='utf-8', newline='') as h:
            text = h.read()
        got = text.count(old)
        if got != want:
            print('SKIP  %s: found %d, want %d: %s' % (path, got, want, old[:40]))
            bad += 1
            continue
        with open(path, 'w', encoding='utf-8', newline='') as h:
            h.write(text.replace(old, new))
        print('OK    %s: %d' % (path, got))
    sys.exit(1 if bad else 0)


main()
