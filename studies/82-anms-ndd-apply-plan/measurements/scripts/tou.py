import re, sys, glob, os
root = sys.argv[1]
files = sorted(glob.glob(root + '/docs/spec/*.md')) + sorted(glob.glob(root + '/docs/spec/_assets/*.md'))
rx = re.compile(r'(?<![同平対均上下高初劣優二一三何不])等(?![し価幅間号級分倍値速角比式辺])')
out = open(sys.argv[2], 'w', encoding='utf-8'); tot = 0
for f in files:
    t = open(f, encoding='utf-8').read().replace('\r', '')
    t = re.sub(r'```.*?```', '', t, flags=re.S); t = re.sub(r'`[^`\n]*`', '', t)
    ms = list(rx.finditer(t)); tot += len(ms)
    for m in ms: out.write('%s: %s\n' % (os.path.basename(f), t[max(0, m.start()-15):m.end()+8].replace('\n', ' ')))
out.write('TOTAL %d\n' % tot)
