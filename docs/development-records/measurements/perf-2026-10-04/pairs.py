"""Paired comparison of two builds round by round: for each MK stretch, in how many rounds the
second sha read fewer fps than the first, and the median and range of the fps ratio second/first.

Usage: python pairs.py <logdir> <groups> <first-sha> <second-sha>   e.g. pairs.py logs ABCD de7514df 5456f72d
Reads the logs <group><n>-<sha>.txt written by round.sh.
"""
import os, re, statistics, sys

logdir, groups, first, second = sys.argv[1:5]
LINE = re.compile(r'^\s+(MK-\d) [a-z ]+: ([\d.]+) fps \| frame time p95 ([\d.]+)ms', re.M)


def fps_of(name):
    out = {}
    text = open(os.path.join(logdir, name), encoding='utf-8', errors='replace').read()
    for m in LINE.finditer(text):
        out.setdefault(m.group(1), float(m.group(2)))
    return out


rounds = []
for name in sorted(os.listdir(logdir)):
    m = re.match(r'^([' + groups + r'])(\d+)-' + first + r'\.txt$', name)
    if m and os.path.exists(os.path.join(logdir, f'{m.group(1)}{m.group(2)}-{second}.txt')):
        rounds.append((fps_of(name), fps_of(f'{m.group(1)}{m.group(2)}-{second}.txt')))
for mk in ('MK-1', 'MK-2', 'MK-7', 'MK-6'):
    ratios = [b[mk] / a[mk] for a, b in rounds]
    lower = sum(1 for a, b in rounds if b[mk] < a[mk])
    print(f'{mk} {second} lower in {lower} of {len(rounds)} rounds; fps ratio {second}/{first} '
          f'median {statistics.median(ratios):.3f}, range {min(ratios):.3f}-{max(ratios):.3f}')
