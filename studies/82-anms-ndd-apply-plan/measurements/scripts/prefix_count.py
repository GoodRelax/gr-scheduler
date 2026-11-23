# Count, per registered prefix, distinct IDs (a) defined as first cell of a table row
# and (b) mentioned anywhere, across docs/spec/*.md and docs/spec/_assets/*.md
import json, re, glob, sys, collections
root = sys.argv[1]
d = json.load(open(root + '/docs/spec/_source/row-id-prefixes.json', encoding='utf-8'))
prefixes = [e['prefix'] for e in d['prefixes']]
files = glob.glob(root + '/docs/spec/*.md') + glob.glob(root + '/docs/spec/_assets/*.md')
text = {f: open(f, encoding='utf-8').read().replace('\r', '') for f in files}
out = []
for p in prefixes:
    rx = re.compile(r'(?<![A-Za-z0-9_\-])' + re.escape(p) + r'-(\d+[a-z]?)(?![0-9A-Za-z])')
    rowrx = re.compile(r'^\|\s*`?\**' + re.escape(p) + r'-(\d+[a-z]?)\**`?\s*\|', re.M)
    anyids, rowids = set(), set()
    for f, t in text.items():
        anyids.update(rx.findall(t))
        rowids.update(rowrx.findall(t))
    out.append((p, len(rowids), len(anyids)))
e = {x['prefix']: x for x in d['prefixes']}
for p, r, a in out:
    print('%s\t%d\t%d\t%s\t%s' % (p, r, a, e[p]['owner'], e[p]['words']))
