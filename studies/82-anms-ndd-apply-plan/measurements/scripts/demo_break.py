import re, sys, collections
f = sys.argv[1]
t = open(f, encoding='utf-8').read().replace('\r', '')
t = re.sub(r'```.*?```', '', t, flags=re.S); t = re.sub(r'`[^`\n]*`', '', t)
c = collections.Counter()
for w in ['これ','それ','あれ','この','その','あの','こう','そう']:
    c[w] = len(re.findall(w, t))
c['sorezore'] = len(re.findall('それぞれ', t))
c['areba'] = len(re.findall('あれば', t))
c['sonomama'] = len(re.findall('そのまま', t))
out = open(sys.argv[2], 'w', encoding='utf-8')
out.write(repr(dict(c)) + '\n')
for m in list(re.finditer(r'(?<![同平対均上下高初劣優二一三何])等(?![し価幅間号級分])', t))[:8]:
    out.write('TOU: ' + t[max(0, m.start()-25):m.end()+10].replace('\n', ' ') + '\n')
for m in list(re.finditer('など', t))[:6]:
    out.write('NADO: ' + t[max(0, m.start()-25):m.end()+10].replace('\n', ' ') + '\n')
for m in list(re.finditer('られる', t))[:5]:
    out.write('RARERU: ' + t[max(0, m.start()-20):m.end()+5].replace('\n', ' ') + '\n')
