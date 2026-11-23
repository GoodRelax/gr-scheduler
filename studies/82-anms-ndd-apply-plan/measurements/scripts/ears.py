import json, re, collections, sys
s = json.load(open(sys.argv[1], encoding='utf-8'))
c = collections.Counter()
for k, v in s.items():
    if k.startswith(('FR', 'NFR')):
        c['total'] += 1
        if re.search('こと', v): c['has koto'] += 1          # koto
        if re.search(r'MUST|SHOULD|MAY', v): c['RFC2119 caps'] += 1
        if re.search('とき、', v): c['tokiComma'] += 1   # toki,
        if re.search('の間、|あいだ、', v): c['noAidaComma'] += 1
        if re.search('もし', v): c['moshi'] += 1
        if re.search('場合', v): c['baai'] += 1
        if re.search('ことが望ましい', v): c['should-ja'] += 1
        if re.search('してもよい', v): c['may-ja'] += 1
        if re.search('しないこと|てはならない', v): c['neg'] += 1
print(dict(c))
for k in ['FR-001', 'FR-100', 'NFR-003', 'FR-150', 'SWS-001']:
    if k in s: print(k, '::', s[k][:300])
