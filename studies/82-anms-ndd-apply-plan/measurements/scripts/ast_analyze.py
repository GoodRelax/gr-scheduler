# -*- coding: utf-8 -*-
"""python -I ast_analyze.py <ast.json>"""
import io, json, re, sys
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
d = json.load(io.open(sys.argv[1], encoding='utf-8'))

F = d['src']['functions']
print('== @purity coverage, src')
live = [f for f in F if not f['gen']]
print('functions with body', len(F), 'in generated', len(F) - len(live))
def cat(f):
    if f['kind'] == 'method':
        return 'method'
    if f['kind'] in ('FunctionDeclaration',):
        return 'function-decl'
    if f['kind'].startswith('var-'):
        return 'var-bound'
    if f['kind'].startswith('field-'):
        return 'class-field'
    if f['kind'].startswith('prop-'):
        return 'object-prop'
    return 'anonymous'
c_all = Counter(); c_tag = Counter()
for f in live:
    k = cat(f) + (' exprBody' if f['exprBody'] else '')
    c_all[k] += 1
    if f['purity']:
        c_tag[k] += 1
for k in sorted(c_all):
    print('  %-28s total %5d tagged %5d untagged %5d' % (k, c_all[k], c_tag[k], c_all[k] - c_tag[k]))
named = [f for f in live if cat(f) != 'anonymous']
print('named (non-anonymous) functions', len(named), 'tagged', sum(1 for f in named if f['purity']))
nonexempt = [f for f in live if not f['exprBody']]
print('block-bodied (not single-expression lambda) functions', len(nonexempt), 'tagged', sum(1 for f in nonexempt if f['purity']))
nonexempt2 = [f for f in live if not f['exprBody'] and cat(f) != 'anonymous']
print('block-bodied AND named', len(nonexempt2), 'tagged', sum(1 for f in nonexempt2 if f['purity']))
print('tag values (function tags)', Counter(f['purity'] for f in live if f['purity']))
print('tag style', Counter(f['purityStyle'] for f in live if f['purity']))
untag = [f for f in nonexempt2 if not f['purity']]
print('untagged block-bodied named by kind', Counter(cat(f) for f in untag), 'nested-in-function', sum(1 for f in untag if not f['topLevel']))
for f in untag[:12]:
    print('   e.g.', f['file'], f['line'], f['kind'], f['name'])
print('anonymous block-bodied untagged', sum(1 for f in live if cat(f) == 'anonymous' and not f['exprBody'] and not f['purity']))
print('per layer tagged/total (all live functions):')
lay = Counter(); layt = Counter()
for f in live:
    l = f['file'].split('/')[1]; lay[l] += 1; layt[l] += bool(f['purity'])
for l in sorted(lay):
    print('  ', l, layt[l], '/', lay[l])

print('\n== see placement, src')
S = d['src']['seeComments']
print('see comments', len(S))
def place(s):
    a = s['anchor']
    if not a:
        return 'no-declaration-follows'
    if a['top']:
        w = a['what']
        if a['exported']:
            if 'Function' in w or 'function' in w:
                return 'top exported function'
            if w.startswith('TS') or w in ('TSTypeAliasDeclaration', 'TSInterfaceDeclaration'):
                return 'top exported type/interface'
            if w == 'ClassDeclaration':
                return 'top exported class'
            if w.startswith('Variable'):
                return 'top exported const (non-function)'
            return 'top exported other:' + w
        if 'Function' in w or 'function' in w:
            return 'top non-exported function'
        if w.startswith('TS'):
            return 'top non-exported type/interface'
        if w.startswith('Variable'):
            return 'top non-exported const'
        if w == 'ClassDeclaration':
            return 'top non-exported class'
        return 'top other:' + w
    if a['member']:
        pub = a['vis'] == 'public'
        return 'class member %s (class %s)' % ('public' if pub else 'private', 'exported' if a['classExported'] else 'not exported')
    if a['tsMember']:
        return 'interface/type member'
    if a['prop']:
        return 'object property'
    if a['nestedInFn']:
        return 'statement inside a function body'
    return 'other nested:' + a['what']
pc = Counter(place(s) for s in S)
for k, v in pc.most_common():
    print('  %-50s %5d' % (k, v))
per = Counter((s['file'].split('/')[1]) for s in S)
print(' per layer', dict(per))
ids = [i for s in S for i in s['ids']]
print(' IDs cited', len(ids), 'distinct', len(set(ids)))
print(' prefixes', Counter(re.sub(r'-.*', '', i) for i in ids).most_common(30))
print(' ids per see comment', Counter(len(s['ids']) for s in S).most_common())

print('\n== tests')
T = d['tests']['tests']
tests = [t for t in T if not t['isDescribe']]
desc = [t for t in T if t['isDescribe']]
print('it/test calls', len(tests), 'describe calls', len(desc))
ID = re.compile(r'\b[A-Z][A-Z0-9]{0,5}-[0-9]+[a-z]?\b')
FILEID = re.compile(r'(?:^|[-/])([a-z]{1,6}-[0-9]+[a-z]?)(?=[-.])')
by_file = {}
for t in desc:
    by_file.setdefault(t['file'], []).append(t)
def enclosing_ids(t):
    out = []
    for dd in by_file.get(t['file'], []):
        if dd['start'] < t['start'] and t['end'] <= dd['end'] and dd['title']:
            out += ID.findall(dd['title'])
    return out
cat_c = Counter()
for t in tests:
    title = t['title'] or ''
    if ID.search(title):
        k = 'id in test title'
    elif enclosing_ids(t):
        k = 'id in enclosing describe title'
    elif t['leadIds']:
        k = 'id in leading comment'
    elif FILEID.search(t['file'].split('/')[-1]):
        k = 'id only in file name'
    else:
        k = 'no spec id'
    cat_c[k] += 1
for k, v in cat_c.most_common():
    print('  %-34s %6d' % (k, v))
print(' leading // see on test', sum(1 for t in tests if t['leadSee']))
titles = [t['title'] or '' for t in tests]
print(' title starts "should"', sum(1 for x in titles if re.match(r'(?i)should\b', x)))
print(' title contains "should"', sum(1 for x in titles if re.search(r'(?i)\bshould\b', x)))
print(' title contains -> or →', sum(1 for x in titles if '->' in x or '→' in x))
print(' title has GIVEN/WHEN/THEN', sum(1 for x in titles if re.search(r'\b(GIVEN|WHEN|THEN|Given|When|Then)\b', x)))
print(' title has non-ASCII', sum(1 for x in titles if re.search(r'[^\x20-\x7e]', x)))
print(' title starts with an ID', sum(1 for x in titles if re.match(r'[A-Z][A-Z0-9]{0,5}-[0-9]+', x)))
print(' title first word top', Counter((x.split() or [''])[0] for x in titles).most_common(15))
print(' per folder', Counter(t['file'].split('/')[1] for t in tests))
import random
random.seed(3)
for x in random.sample(titles, 15):
    print('   e.g.', x[:120])
TF = d['tests']['functions']
print(' test-code functions', len(TF), 'with @purity', sum(1 for f in TF if f['purity']))
