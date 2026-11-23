# -*- coding: utf-8 -*-
"""python -I markers.py <units.json> <ast.json> -- marker counts in comment text (generated regions excluded)."""
import io, json, re, sys
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
d = json.load(io.open(sys.argv[1], encoding='utf-8'))
a = json.load(io.open(sys.argv[2], encoding='utf-8'))
PAT = [
    ('STOP:', r'\bSTOP:'),
    ('@provisional', r'@provisional\b'),
    ('TODO', r'\bTODO\b'),
    ('FIXME', r'\bFIXME\b'),
    ('XXX', r'\bXXX\b'),
    ('HACK', r'\bHACK\b'),
    ('see <ID> (line head)', r'^see\s+[A-Z][A-Z0-9]{0,5}-[0-9]'),
    ('see <ID> (anywhere)', r'\bsee\s+[A-Z][A-Z0-9]{0,5}-[0-9]'),
    ('Spec: (exact)', r'^Spec:'),
    ('spec: (lowercase head)', r'^spec:'),
    ('@spec', r'@spec\b'),
    ('[REQ-', r'\[REQ-'),
    ('WHY: (upper)', r'^WHY:'),
    ('Why: (new form)', r'^Why:'),
    ('TRAP:', r'^TRAP:'),
    ('DEVIATION:', r'^DEVIATION:'),
    ('STEP:', r'^STEP:'),
    ('JDG-n', r'\bJDG-[0-9]+'),
    ('DFC-n', r'\bDFC-[0-9]+'),
    ('PND-n', r'\bPND-[0-9]+'),
    ('CR-n', r'\bCR-[0-9]+'),
    ('OPQ-n', r'\bOPQ-[0-9]+'),
    ('@manual', r'@manual\b'),
    ('GIVEN/WHEN/THEN', r'\b(GIVEN|WHEN|THEN)\b'),
    ('emoji marks (U+26D4/2B50/26A0)', '[⛔⭐⚠]'),
]
for top in ('src', 'tests'):
    live = [u for u in d[top] if not u['gen']]
    print('==', top)
    for name, p in PAT:
        rx = re.compile(p)
        occ = 0; units = 0; files = set()
        for u in live:
            n = sum(len(rx.findall(b)) for b in u['bodies'])
            if n:
                occ += n; units += 1; files.add(u['file'])
        print('  %-34s occurrences %6d  comment-units %6d  files %4d' % (name, occ, units, len(files)))
# IDs in test titles
T = [t for t in a['tests']['tests'] if not t['isDescribe']]
D = [t for t in a['tests']['tests'] if t['isDescribe']]
for name, p in [('JDG-n', r'\bJDG-[0-9]+'), ('DFC-n', r'\bDFC-[0-9]+'), ('CR-n', r'\bCR-[0-9]+'), ('PND-n', r'\bPND-[0-9]+')]:
    rx = re.compile(p)
    print('  in it/test titles: %-6s %5d   in describe titles %5d' % (name, sum(1 for t in T if rx.search(t['title'] or '')), sum(1 for t in D if rx.search(t['title'] or ''))))
