import json, sys
d = json.load(open(sys.argv[1]))
if 'stretches' not in d:
    print('ok', d.get('ok'), 'nm', d.get('notMeasured')); sys.exit()
st = {s['name']: s for s in d['stretches']}
f = lambda n: st[n]['frameTime']
print('ok', d['ok'], 'nm', d['notMeasured'], 'sha', d['conditions']['buildSha256'][:8], 'scale', d['conditions'].get('displayScale'),
      'all', d['frameTime']['medianMs'], '/', d['frameTime']['p95Ms'],
      *sum([[n.split()[0], f(n)['medianMs'], '/', f(n)['p95Ms']] for n in ['MK-1 scroll', 'MK-2 zoom', 'MK-7 pan', 'MK-6 range select']], []),
      'dispatch', d['writeCost']['synchronousDispatch']['medianMs'])
