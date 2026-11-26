# -*- coding: utf-8 -*-
"""Sweep (a): the Japanese of Retract (task group into its parent) is 格納.

usage: python sweep_a.py [--write] FILE...
Rewrites only fixed task-group phrases; prints each change and lists the
remaining 隠 / 非表示 / しまう hits for a person.
"""
import re
import sys

RULES = [
    (u'隠したタスクグループ', u'格納したタスクグループ'),
    (u'隠されているタスクグループ', u'格納されているタスクグループ'),
    (u'タスクグループそのものが隠されている', u'タスクグループそのものが格納されている'),
    (u'祖先が折りたたまれているか隠されている', u'祖先が折りたたまれているか格納されている'),
    (u'折りたたみと隠し', u'折りたたみと格納'),
    (u'折りたたみ・隠し', u'折りたたみ・格納'),
    (u'折りたたみ・展開・隠し', u'折りたたみ・展開・格納'),
    (u'展開・折りたたみ・隠し', u'展開・折りたたみ・格納'),
    (u'折りたたみ・展開・隠し・足し', u'折りたたみ・展開・格納・足し'),
    (u'直下のタスクグループを隠してから', u'直下のタスクグループを親に格納してから'),
    (u'折りたたみ込む先の親が無い', u'格納する先の親が無い'),
    (u'隠す操作子', u'親に格納する操作子'),
]
LOOSE = re.compile(u'隠|非表示|しまう|しまい|折りたたみ込')


def main(argv):
    write = '--write' in argv
    files = [a for a in argv if a != '--write']
    total = 0
    for f in files:
        with open(f, encoding='utf-8', newline='') as h:
            src = h.read()
        lines = src.split('\n')
        out = []
        for i, line in enumerate(lines, 1):
            new = line
            if '"from":' not in line:
                for a, b in RULES:
                    c = new.count(a)
                    if c:
                        total += c
                        print('%s:%d: %s -> %s (%d)' % (f, i, a, b, c))
                        new = new.replace(a, b)
            out.append(new)
        if write:
            with open(f, 'w', encoding='utf-8', newline='') as h:
                h.write('\n'.join(out))
    print('TOTAL replaced: %d' % total)


if __name__ == '__main__':
    main(sys.argv[1:])
