import io, json, sys, re
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
d = json.load(io.open(sys.argv[1], encoding='utf-8'))
T = [u for u in d['tests'] if not u['gen']]
print('directive first words', Counter(u['first'][:25] for u in T if u['class']=='directive').most_common(8))
print('license', [(u['file'], u['first'][:60]) for u in T if u['class']=='license'])
ID = re.compile(r'\b[A-Z][A-Z0-9]{0,5}-[0-9]+[a-z]?\b')
files = sorted({u['file'] for u in T})
tf = [f for f in files if f.endswith('.test.ts')]
first = {}
for u in T:
    if u['file'] not in first or u['line'] < first[u['file']]['line']:
        first[u['file']] = u
print('test files', len(tf), 'whose first comment (line<=3) carries an ID', sum(1 for f in tf if f in first and first[f]['line']<=3 and ID.search(' '.join(first[f]['bodies']))))
print('test files with no comment at all', sum(1 for f in tf if f not in first))
# other first words in tests, decorative rules
print('decorative rule lines (---- / ====)', sum(1 for u in T if re.match(r'^[-=]{10,}$', u['first'])))
print('other units starting with emoji mark', sum(1 for u in T if u['class']=='other' and re.match('[⛔⭐⚠]', u['first'])))
print('WHY multi-line in tests', Counter(u['nlines'] for u in T if u['class']=='L-WHY').most_common(6))
print('other multi-line size dist', Counter(min(u['nlines'],10) for u in T if u['class']=='other' and u['nlines']>1).most_common())
print('lines in other units', sum(u['nlines'] for u in T if u['class']=='other'))
print('files with other units', len({u['file'] for u in T if u['class']=='other'}))
S = [u for u in d['src'] if not u['gen']]
print('src lines by class', {k: sum(u['nlines'] for u in S if u['class']==k) for k in ('L-WHY','L-TRAP','L-see','purity','L-header-tag','other','L-STOP','L-DEVIATION','L-@provisional')})
print('src files by class', {k: len({u['file'] for u in S if u['class']==k}) for k in ('L-WHY','L-TRAP','L-see','purity','L-header-tag','other')})
print('tests files by class', {k: len({u['file'] for u in T if u['class']==k}) for k in ('L-WHY','L-TRAP','L-see','purity','L-STEP','other')})
