# Parse StrictDoc-markdown nodes: UID, Relations Parent IDs, STATEMENT first line
import re, sys, collections, glob
root = sys.argv[1]
stats = collections.Counter(); parents = collections.defaultdict(collections.Counter)
noparent = []
samples = {}
for f in sorted(glob.glob(root + '/docs/spec/*.md')):
    t = open(f, encoding='utf-8').read().replace('\r', '')
    blocks = re.split(r'\n(?=\*\*Type\*\*: )', t)
    for b in blocks:
        m = re.match(r'\*\*Type\*\*: ([A-Z_]+)', b)
        if not m or m.group(1) == 'SECTION': continue
        typ = m.group(1)
        uid = re.search(r'\*\*UID\*\*: (\S+)', b)
        uid = uid.group(1) if uid else '?'
        # cut block at next heading
        b2 = re.split(r'\n#{1,6} ', b)[0]
        rel = re.findall(r'\*\*Type\*\*: `Parent`\s*\n\s*\*\*ID\*\*: `([^`]+)`', b2)
        stats[typ] += 1
        for p in rel: parents[typ][re.sub(r'-.*', '', p)] += 1
        if not rel: noparent.append(uid)
        st = re.search(r'\*\*STATEMENT\*\*: (.*)', b2)
        if st: samples[uid] = st.group(1)[:300]
        orig = re.search(r'\*\*ORIGIN\*\*: (.*)', b2)
        if orig: stats['ORIGIN:' + typ] += 1
print(dict(stats))
for k, v in parents.items(): print(k, dict(v))
print('no Parent relation:', len(noparent), noparent[:40])
import json
json.dump(samples, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
