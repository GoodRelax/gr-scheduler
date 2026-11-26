# -*- coding: utf-8 -*-
"""Sweep (a) for 01-04-requirements.md: Retract (HR-6, HF-3, IC-59) is 格納.

usage: python sweep_a01.py [--write] FILE
Run sweep_a.py first (the shared phrases). These rules hold the task-group
phrases of tables T-015 / T-051 and the rows that cite HR-6; every rule names
a phrase that only the retract act uses. Prints each change.
"""
import sys

RULES = [
    # T-015 HR-6 (the operation's name and its press)
    (u'| HR-6 | 非表示 |', u'| HR-6 | 親に格納 |'),
    (u'非表示を押したとき', u'親に格納を押したとき'),
    (u'タスクグループを隠すこと', u'タスクグループを親に格納すること'),
    (u'隠すタスクグループ', u'格納するタスクグループ'),
    (u'折りたたまずに隠すこと', u'折りたたまずに格納すること'),
    (u'隠した状態', u'格納した状態'),
    (u'隠しは人が駆動する', u'格納は人が駆動する'),
    (u'隠すことは親へ 1 歩折りたたみ込むこと', u'格納することは親へ 1 歩折りたたみ込むこと'),
    (u'隠すことを「親へ 1 歩折りたたみ込むこと」', u'格納することを「親へ 1 歩折りたたみ込むこと」'),
    (u'隠すことが折りたたみの意味である', u'格納することが折りたたみの意味である'),
    (u'隠しの折りたたみも解く', u'格納の折りたたみも解く'),
    (u'隠すのは `HR-6` である', u'格納するのは `HR-6` である'),
    (u'配下だけを折りたたんで隠すと', u'配下だけを折りたたんで格納すると'),
    (u'何も折りたたまずに隠すと', u'何も折りたたまずに格納すると'),
    # undoing it
    (u'直下の子の隠しも解く', u'直下の子の格納も解く'),
    (u'直下の子の隠しを解く', u'直下の子の格納を解く'),
    (u'折りたたみだけを解いて隠しを残す', u'折りたたみだけを解いて格納を残す'),
    (u'隠しも折りたたみも解く', u'格納も折りたたみも解く'),
    (u'隠しを解けば', u'格納を解けば'),
    (u'タスクグループは隠しを解き', u'タスクグループは格納を解き'),
    # T-051 the operator
    (u'左の列を上から 隠す・1 階層展開する', u'左の列を上から 親に格納・1 階層展開する'),
    (u'いつでも隠せるので', u'いつでも親に格納できるので'),
    (u'`HF-3`（隠す）', u'`HF-3`（親に格納）'),
    (u'`HR-6`（隠す）', u'`HR-6`（親に格納）'),
    (u'`HR-6` で隠したもの', u'`HR-6` で格納したもの'),
    (u'`HR-6` で隠されている', u'`HR-6` で格納されている'),
    (u'`HR-6` が隠した', u'`HR-6` が格納した'),
    (u'頭に、隠す入口と', u'頭に、親に格納する入口と'),
    (u'1 本の上向きで親へ折りたたみ込み', u'1 本の上向きで親に格納し'),
    (u'タスクグループを隠したときに戻す先', u'タスクグループを親に格納したときに戻す先'),
    (u'頭に無い隠す（`HF-3`）', u'頭に無い親に格納（`HF-3`）'),
    (u'親が無いので隠せず（`HF-3`）', u'親が無いので格納できず（`HF-3`）'),
    (u'押したタスクグループ自身を隠さないこと', u'押したタスクグループ自身を親に格納しないこと'),
    (u'`HR-6` で隠れているとき', u'`HR-6` で格納されているとき'),
    (u'隠した直下の子', u'格納した直下の子'),
    (u'非表示にしたタスクグループ', u'格納したタスクグループ'),
    (u'タスクグループの祖先が隠れている間（表 T-015 の `HR-6`）', u'タスクグループの祖先が格納されている間（表 T-015 の `HR-6`）'),
    (u'人の折りたたみでも隠しでもない', u'人の折りたたみでも格納でもない'),
    (u'（折りたたみ・隠し・', u'（折りたたみ・格納・'),
]


def main(argv):
    write = '--write' in argv
    files = [a for a in argv if a != '--write']
    total = 0
    for f in files:
        with open(f, encoding='utf-8', newline='') as h:
            text = h.read()
        for a, b in RULES:
            c = text.count(a)
            if c:
                total += c
                print('%4d  %s -> %s' % (c, a, b))
                text = text.replace(a, b)
            else:
                print('   0  %s' % a)
        if write:
            with open(f, 'w', encoding='utf-8', newline='') as h:
                h.write(text)
    print('TOTAL replaced: %d' % total)


if __name__ == '__main__':
    main(sys.argv[1:])
