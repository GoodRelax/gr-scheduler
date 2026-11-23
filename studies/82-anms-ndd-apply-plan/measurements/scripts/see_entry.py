import io, json, sys, re
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
d = json.load(io.open(sys.argv[1], encoding='utf-8'))
S = d['src']['seeComments']
def entry(f):
    parts = f.split('/')
    return len(parts) >= 4 and parts[-1][:-3] == parts[2]
c = Counter()
for s in S:
    a = s['anchor']
    exp_fn = bool(a and a['top'] and a['exported'] and ('Function' in a['what'] or 'function' in a['what']))
    c[(('entry' if entry(s['file']) else 'non-entry'), exp_fn)] += 1
print(c)
print('entry files', len({s['file'] for s in S if entry(s['file'])}))
# exported functions in src total and how many carry a see
F = [f for f in d['src']['functions'] if not f['gen']]
ef = [f for f in F if f['exported'] and f['topLevel']]
print('exported top-level functions', len(ef), 'in entry files', sum(1 for f in ef if entry(f['file'])))
seen = {(s['file'], s['anchor']['line']) for s in S if s['anchor']}
print('exported functions carrying a see', sum(1 for f in ef if (f['file'], f['line']) in seen), 'entry-file ones', sum(1 for f in ef if entry(f['file']) and (f['file'], f['line']) in seen))
# JDG/DFC/CR/PND ids inside see comments (decision ids used as parent)
ids = Counter(re.sub(r'-.*','',i) for s in S for i in s['ids'])
print({k: ids[k] for k in ('JDG','DFC','CR','PND')})
print('see comments citing a decision id', sum(1 for s in S if any(re.match(r'(JDG|DFC|CR|PND)-', i) for i in s['ids'])))
print('see comments citing ONLY decision ids', sum(1 for s in S if s['ids'] and all(re.match(r'(JDG|DFC|CR|PND)-', i) for i in s['ids'])))
