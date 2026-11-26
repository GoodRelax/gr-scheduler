# -*- coding: utf-8 -*-
"""Sweep (a) in the manuscripts: the Japanese of Retract is 格納 (owner, BGQA11 round 2).

Exact old -> new; each must hit exactly the count given, or nothing is written for it.
"""
import sys

D = 'docs/spec/_source/'
FIXES = [
    # collapseButton (the band's caret-up button) -- definition
    (D + 'glossary.json', u'"en": "The Collapse Button: collapses the task group itself."',
     u'"en": "The Retract Into Parent Button: retracts the task group itself, with everything below it, into its parent."', 1),
    (D + 'glossary.json', u'"ja": "折りたたむボタン: そのタスクグループ自身を折りたたむ。"',
     u'"ja": "親に格納ボタン: そのタスクグループ自身を、配下ごと親に格納する。"', 1),
    # collapseIcon (IC-59) -- definition; display-words IC-59 hint (the tooltip)
    (D + 'glossary.json', u'"en": "Collapse this task group itself",\n    "ja": "このタスクグループ自身を折りたたむ"',
     u'"en": "Retract this task group itself into its parent",\n    "ja": "このタスクグループ自身を親に格納する"', 1),
    (D + 'display-words.json', u'"ja": "このタスクグループ自身を折りたたむ",\n    "en": "Collapse this task group itself"',
     u'"ja": "このタスクグループ自身を親に格納する",\n    "en": "Retract this task group itself into its parent"', 1),
    # IC-59 in table T-109 (what the entrance leads to)
    (D + 'icons.json', u'"id": "IC-59",\n   "surfaces": [\n    "U-22"\n   ],\n   "group": "—",\n   "entryTo": {\n    "ja": "このタスクグループを隠す"',
     u'"id": "IC-59",\n   "surfaces": [\n    "U-22"\n   ],\n   "group": "—",\n   "entryTo": {\n    "ja": "このタスクグループを親に格納する"', 1),
    # table T-328 input hidePressed (the event name itself is CR-851's: JDG-3658 retractPressed)
    (D + 'state-machines.json', u'"ja": "タスクグループの隠す操作子を押した"',
     u'"ja": "タスクグループの親に格納する操作子を押した"', 1),
    # beta showMode value hidden = what Retract Into Parent sets (study 76 draft, JDG-3658)
    (D + 'glossary.json', u'\\"hidden\\": GRS はこのタスクグループと配下のすべてのタスクグループを隠す。',
     u'\\"hidden\\": GRS はこのタスクグループを配下ごと親に格納する。', 1),
    (D + 'glossary.json', u'"ja": "隠れている。タスクグループパネルに出さない。"',
     u'"ja": "親に格納している。タスクグループパネルに出さない。"', 1),
    # root: no Retract
    (D + 'glossary.json', u'値を持たず、Retract もピンもない。',
     u'値を持たず、親に格納（Retract Into Parent）もピンもない。', 1),
]


def main():
    bad = 0
    for path, old, new, want in FIXES:
        with open(path, encoding='utf-8', newline='') as h:
            text = h.read()
        crlf = '\r\n' in text
        o, n = (old.replace('\n', '\r\n'), new.replace('\n', '\r\n')) if crlf else (old, new)
        got = text.count(o)
        if got != want:
            print('SKIP  %s: found %d, want %d: %s' % (path, got, want, old[:50]))
            bad += 1
            continue
        with open(path, 'w', encoding='utf-8', newline='') as h:
            h.write(text.replace(o, n))
        print('OK    %s: %d' % (path, got))
    sys.exit(1 if bad else 0)


main()
