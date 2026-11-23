# Count TS lines of src/: total physical, blank, comment-only, generated-region, and code.
# Comments: // line comments and /* */ blocks, with a small state machine that skips
# string and template literals (template ${} nesting is not tracked -- caveat).
import sys, glob
root = sys.argv[1]
BS = chr(92)
files = [f for f in glob.glob(root + '/src/**/*.ts', recursive=True) if not f.endswith('.test.ts')]
tot = dict(files=len(files), physical=0, blank=0, comment_only=0, generated=0, code=0)
for f in files:
    lines = open(f, encoding='utf-8').read().replace('\r', '').split('\n')
    if lines and lines[-1] == '':
        lines = lines[:-1]
    in_block = False; in_gen = False; in_tmpl = False
    for ln in lines:
        tot['physical'] += 1
        s = ln.strip()
        if s.startswith('// <generated'):
            in_gen = True; tot['generated'] += 1; continue
        if s.startswith('// </generated>'):
            in_gen = False; tot['generated'] += 1; continue
        if in_gen:
            tot['generated'] += 1; continue
        if not s and not in_tmpl and not in_block:
            tot['blank'] += 1; continue
        i = 0; has_code = False; q = '`' if in_tmpl else None
        while i < len(ln):
            c = ln[i]
            if in_block:
                if ln.startswith('*/', i):
                    in_block = False; i += 2; continue
                i += 1; continue
            if q:
                has_code = True
                if c == BS:
                    i += 2; continue
                if c == q:
                    q = None
                i += 1; continue
            if ln.startswith('//', i):
                break
            if ln.startswith('/*', i):
                in_block = True; i += 2; continue
            if c in '"\'`':
                q = c; has_code = True; i += 1; continue
            if not c.isspace():
                has_code = True
            i += 1
        in_tmpl = (q == '`')
        if has_code:
            tot['code'] += 1
        else:
            tot['comment_only'] += 1
print(tot)
