import io, json, sys, re
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
u = json.load(io.open(sys.argv[1], encoding='utf-8')); a = json.load(io.open(sys.argv[2], encoding='utf-8'))
ID = re.compile(r'\b([A-Z][A-Z0-9]{0,5})-[0-9]+[a-z]?\b')
T = [x for x in u['tests'] if not x['gen']]
first = {}
for x in T:
    if x['file'].endswith('.test.ts') and (x['file'] not in first or x['line'] < first[x['file']]['line']):
        first[x['file']] = x
c = Counter()
for f, x in first.items():
    pre = set(ID.findall(' '.join(x['bodies'])))
    if not pre: c['no id'] += 1
    elif pre <= {'CR','DFC','JDG','PND'}: c['only CR/DFC/JDG/PND'] += 1
    elif pre & {'CR','DFC','JDG','PND'}: c['spec id + decision id'] += 1
    else: c['spec id only'] += 1
print('first comment of test files:', c)
F = [f for f in a['src']['functions'] if not f['gen']]
un = [f for f in F if not f['purity'] and not f['exprBody'] and f['kind'] not in ('FunctionExpression','ArrowFunctionExpression') and not f['kind'].startswith('anon')]
print('untagged block-bodied named', len(un), 'files', len({f['file'] for f in un}))
an = [f for f in F if not f['purity'] and not f['exprBody'] and f['kind'].startswith('anon')]
print('untagged block-bodied anonymous', len(an), 'files', len({f['file'] for f in an}))
print('expression-bodied total', sum(1 for f in F if f['exprBody']), 'tagged', sum(1 for f in F if f['exprBody'] and f['purity']))
tests = [t for t in a['tests']['tests'] if not t['isDescribe']]
print('no-id tests per folder', Counter(t['file'].split('/')[1] for t in tests if not ID.search(t['title'] or '')).most_common())
print('tests whose title has only decision ids', sum(1 for t in tests if (lambda s: s and s <= {'CR','DFC','JDG','PND'})(set(ID.findall(t['title'] or '')))))
