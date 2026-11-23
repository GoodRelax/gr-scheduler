# -*- coding: utf-8 -*-
"""Analyse units.json written by comments.py. python -I analyze.py <units.json>"""
import io, json, re, sys
from collections import Counter, defaultdict
sys.stdout.reconfigure(encoding='utf-8')
data = json.load(io.open(sys.argv[1], encoding='utf-8'))


def fw(s):
    m = re.match(r'\S+', s)
    return m.group(0) if m else ''


NONASCII = re.compile(r'[^\x20-\x7e]')
JA = re.compile(r'[぀-ヿ一-鿿]')
for top in ('src', 'tests'):
    live = [u for u in data[top] if not u['gen']]
    print('==', top)
    other = [u for u in live if u['class'] == 'other']
    print(' other first words top 25:', Counter(fw(u['first']) for u in other).most_common(25))
    print(' other units by style:', Counter(u['style'] for u in other))
    multi = [u for u in live if u['nlines'] > 1]
    print(' multi-line units', len(multi), 'by class', Counter(u['class'] for u in multi).most_common())
    print(' multi-line other', sum(1 for u in multi if u['class'] == 'other'))
    # multi-line units whose first physical line is empty (bare /** line)
    print(' multi-line whose first physical body is empty', sum(1 for u in multi if u['bodies'][0] == ''))
    print(' units w/ non-ASCII', sum(u['nonascii'] for u in live), 'files', len({u['file'] for u in live if u['nonascii']}))
    print(' units w/ Japanese', sum(1 for u in live if any(JA.search(b) for b in u['bodies'])))
    nonascii_lines = sum(1 for u in live for b in u['bodies'] if NONASCII.search(b))
    print(' non-ASCII comment lines', nonascii_lines)
    chars = Counter(ch for u in live for b in u['bodies'] for ch in b if ord(ch) > 0x7e or ord(ch) < 0x20)
    print(' non-ASCII chars top', [(hex(ord(c)), c, n) for c, n in chars.most_common(12)])
    print(' physical comment lines live', sum(u['nlines'] for u in live))
    # per-folder class counts
    per = defaultdict(Counter)
    for u in live:
        per[u['file'].split('/')[1]][u['class']] += 1
    for k in sorted(per):
        print('  ', k, dict(per[k].most_common()))
    # style x class
    print(' class x style', Counter((u['class'], u['style']) for u in live).most_common(20))
    if top == 'tests':
        samp = [u['first'][:90] for u in other[:0]]
        import random
        random.seed(1)
        for u in random.sample(other, 25):
            print('   sample other:', u['file'], u['line'], u['style'], '|', u['first'][:100])
