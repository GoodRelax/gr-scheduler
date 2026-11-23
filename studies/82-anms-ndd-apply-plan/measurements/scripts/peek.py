import io, json, sys
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
d = json.load(io.open(sys.argv[1], encoding='utf-8'))
src = [u for u in d['src'] if not u['gen']]
print('src other at line<=3:', sum(1 for u in src if u['class']=='other' and u['line']<=3), 'of', sum(1 for u in src if u['class']=='other'))
for u in src:
    if u['nlines']>1 and u['class'] in ('purity','L-header-tag','L-STOP','L-DEVIATION'):
        print(u['file'], u['line'], u['class'], u['bodies'][:4]); 
print('header tag words', Counter(u['first'].split()[0] for u in src if u['class']=='L-header-tag'))
print('purity line-style', Counter((u['line']<=6) for u in src if u['class']=='purity' and u['style']=='line'))
print('purity values', Counter(u['first'].split()[1] if len(u['first'].split())>1 else '?' for u in src if u['class']=='purity'))
for u in src:
    if u['class'] in ('L-STOP','L-@provisional','L-DEVIATION'):
        print(' ', u['class'], u['file'], u['line'], ' / '.join(u['bodies'])[:160])
print('WHY lines', Counter(u['nlines'] for u in src if u['class']=='L-WHY'))
print('TRAP lines', Counter(u['nlines'] for u in src if u['class']=='L-TRAP'))
