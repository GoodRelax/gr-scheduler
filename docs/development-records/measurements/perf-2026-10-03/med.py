"""Median of each MK metric per candidate over the logs <prefix><n>-<sha>.txt.

Usage: python med.py <logdir> <prefix-regex> [sha order...]
Reads the NFR-002 lines: fps, interval p95, mean, inside-call p95.
"""
import re, sys, os, statistics
from collections import defaultdict

logdir, prefix = sys.argv[1], sys.argv[2]
order = sys.argv[3:]
LINE = re.compile(r'NFR-002 (MK-\d) [a-z ]+: ([\d.]+) frames per second.*?interval p95 ([\d.]+)ms, mean ([\d.]+)ms.*?inside the redraw call p95 ([\d.]+)ms, mean ([\d.]+)ms')
FILE = re.compile(r'^(' + prefix + r')-([0-9a-z]+)\.txt$')
data = defaultdict(lambda: defaultdict(list))
for name in os.listdir(logdir):
    m = FILE.match(name)
    if not m:
        continue
    sha = m.group(2)
    text = open(os.path.join(logdir, name), encoding='utf-8', errors='replace').read()
    seen = set()
    for g in LINE.finditer(text):
        mk = g.group(1)
        if mk in seen:
            continue
        seen.add(mk)
        for key, val in zip(('fps', 'p95', 'mean', 'in95', 'inmean'), g.groups()[1:]):
            data[sha][(mk, key)].append(float(val))
shas = order or sorted(data)
cols = [(mk, k) for mk in ('MK-1', 'MK-2', 'MK-7', 'MK-6') for k in ('fps', 'p95', 'in95')]
print('sha       n  ' + '  '.join(f'{mk[3:]}{k:>5}' for mk, k in cols))
for sha in shas:
    row = data.get(sha, {})
    n = len(row.get(('MK-2', 'fps'), []))
    cells = []
    for c in cols:
        v = row.get(c, [])
        cells.append(f'{statistics.median(v):7.2f}' if v else '      -')
    print(f'{sha} {n}  ' + ' '.join(cells))
if '--raw' in os.environ.get('MED_FLAGS', ''):
    for sha in shas:
        print(sha, {f'{a}{b}': data[sha][(a, b)] for a, b in cols})
