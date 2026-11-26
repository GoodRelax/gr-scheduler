# -*- coding: utf-8 -*-
"""Sweep (b): the check-based schedule filter is called 日程抽出 (owner, BGQA11 round 2).

usage: python sweep_b.py [--write] FILE...
Prints every change as  file:line  before => after  (a window around it).
Only the word スケジュールフィルタ and fixed phrases are rewritten; loose 絞 /
フィルタ hits are listed at the end for a person (value filters stay).
"""
import re
import sys

SF = u'スケジュールフィルタ'
NEW = u'日程抽出'

# conjugation of 掛ける / 掛かる after the object marker, as a suru verb
CONJ = [
    (u'を掛けています', u'しています'),
    (u'を掛けていない', u'していない'),
    (u'を掛けている', u'している'),
    (u'を掛けていた', u'していた'),
    (u'を掛けて', u'して'),
    (u'を掛けた', u'した'),
    (u'を掛けると', u'すると'),
    (u'を掛けること', u'すること'),
    (u'を掛ける', u'する'),
    (u'を掛けず', u'せず'),
    (u'を掛けない', u'しない'),
    (u'を掛けられ', u'でき'),
    (u'を掛け、', u'し、'),
    (u'を掛け', u'し'),
    (u'が掛かっている', u'している'),
    (u'が掛かっていない', u'していない'),
    (u'が掛かった', u'した'),
    (u'が掛かる', u'する'),
]

FIXED = [
    (SF + u'バー', u'チェックで日程抽出バー'),
    (SF + u'の帯', u'チェックで日程抽出バー'),
    (u'チェックで日程表を絞る', u'チェックで日程抽出'),
]


def rewrite(text):
    for a, b in FIXED:
        text = text.replace(a, b)
    # verb forms: "Xの<SF>を掛け..." -> "Xで日程抽出し..."
    for a, b in CONJ:
        text = re.sub(u'の' + SF + re.escape(a), u'で' + NEW + b, text)
        text = text.replace(SF + a, NEW + b)
        # "<SF>（...）を掛け..." -> "日程抽出（...）し..."
        text = re.sub(SF + u'(（(?:[^（）]|（[^（）]*）)*）)' + re.escape(a), lambda m, b=b: NEW + m.group(1) + b, text)
    text = text.replace(SF, NEW)
    for a, b in POST:
        text = text.replace(a, b)
    return text


POST = [
    (u'日程抽出の掛け外し', u'日程抽出の入切'),
    (u'| 掛ける・解除する |', u'| 日程抽出する・解除する |'),
]
LOOSE = re.compile(u'絞|フィルタ')


def main(argv):
    write = '--write' in argv
    files = [a for a in argv if a != '--write']
    total = 0
    loose = []
    for f in files:
        with open(f, encoding='utf-8', newline='') as h:
            src = h.read()
        lines = src.split('\n')
        out = []
        for i, line in enumerate(lines, 1):
            new = line if "\"from\":" in line else rewrite(line)
            if new != line:
                n = line.count(SF) + line.count(u'チェックで日程表を絞る')
                total += n
                print('%s:%d: [%d]' % (f, i, n))
                print('   - ' + snippet(line))
                print('   + ' + snippet(new))
            for m in LOOSE.finditer(new):
                a = max(0, m.start() - 25)
                loose.append('%s:%d: %s' % (f, i, new[a:m.end() + 25].strip()))
            out.append(new)
        if write:
            with open(f, 'w', encoding='utf-8', newline='') as h:
                h.write('\n'.join(out))
    print('TOTAL replaced occurrences: %d' % total)
    print('LOOSE (for a person): %d' % len(loose))
    for x in loose:
        print('  ' + x)


def snippet(line):
    idx = [m.start() for m in re.finditer(u'日程抽出|' + SF + u'|チェックで日程表', line)]
    if not idx:
        return line[:160]
    a = max(0, idx[0] - 40)
    return line[a:a + 200].strip()


if __name__ == '__main__':
    main(sys.argv[1:])
