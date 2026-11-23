# Count sentence-rule hits per file. Code spans (`...`) and fenced blocks are removed first.
import re, sys, glob, os
root = sys.argv[1]
files = sorted(glob.glob(root + '/docs/spec/*.md')) + sorted(glob.glob(root + '/docs/spec/_assets/*.md'))
pats = {
 'nado': r'など',                                   # nado
 'tou_etc': r'(?<![同平対均上下高初劣優二一三何])等(?![し価幅間号級分])',  # tou not in equal/equivalent words
 'tou_raw': r'等',
 'demo_raw': r'これ|それ|あれ|この|その|あの|こう|そう',
 'demo_adj': r'これ|それ(?!ぞれ)|(?<![お])それ(?=ぞれ)XX|あれ(?![ば])|この|その|あの|(?<![向むせほちょ])こう|(?<![よそぞもおたさ])そう',
 'passive_sareru': r'され(?:る|た|て|な|ず|れば|ま)',
 'passive_rareru': r'られ(?:る|た|て|な|ず|れば|ま)',
}
# fix demo_adj: remove the dummy XX alternative and exclude 'sorezore' and 'osore'
pats['demo_adj'] = r'これ|(?<!お)それ(?!ぞれ)|あれ(?!ば)|この|その|あの|(?<![向むせほちょ])こう|(?<![よそぞもおたさ])そう'
out = open(sys.argv[2], 'w', encoding='utf-8')
tot = dict.fromkeys(pats, 0)
out.write('file\tbytes\t' + '\t'.join(pats) + '\n')
for f in files:
    t = open(f, encoding='utf-8').read().replace('\r', '')
    t = re.sub(r'```.*?```', '', t, flags=re.S)
    t = re.sub(r'`[^`\n]*`', '', t)
    t = re.sub(r'<[^>]+>', '', t)
    row = []
    for k, p in pats.items():
        n = len(re.findall(p, t)); tot[k] += n; row.append(str(n))
    out.write('%s\t%d\t%s\n' % (os.path.relpath(f, root + '/docs/spec'), os.path.getsize(f), '\t'.join(row)))
out.write('TOTAL\t\t' + '\t'.join(str(tot[k]) for k in pats) + '\n')
