# -*- coding: utf-8 -*-
"""Read-only comment inventory of src/ and tests/ against the new R3 kinds.

Usage: python -I comments.py <repo-root> <out-json>
Lexer: imported from .claude/skills/spec-graph-check/check-comment-rules.py
(lex, body_of, generated_lines, is_code) so strings/templates/regex are skipped.

Unit of a comment:
  - one /* */ or /** */ block = one unit
  - a trailing // comment (code on the same line) = one unit
  - a run of full-line // comments on consecutive lines = one run; inside the
    run a line opening a known head (new kind or GRS legacy head) starts a new
    unit, other lines continue the current unit.
"""
import importlib.util
import io
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict

ROOT = sys.argv[1]
OUT = sys.argv[2]
spec = importlib.util.spec_from_file_location(
    'ccr', os.path.join(ROOT, '.claude/skills/spec-graph-check/check-comment-rules.py'))
ccr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ccr)

NEW = [('Why:', 'Why'), ('Spec:', 'Spec'), ('Summary:', 'Summary'),
       ('Temporary:', 'Temporary'), ('Unimplemented:', 'Unimplemented'),
       ('Provisional:', 'Provisional'), ('Section:', 'Section'),
       ('Consistency:', 'Consistency')]
LEGACY = [('WHY:', 'L-WHY'), ('TRAP:', 'L-TRAP'), ('STOP:', 'L-STOP'),
          ('DEVIATION:', 'L-DEVIATION'), ('STEP:', 'L-STEP')]
ID = r'[A-Z][A-Z0-9]{0,5}-[0-9]+[a-z]?'
SEE = re.compile(r'see\s+' + ID)
PURITY = re.compile(r'@purity\b')
HEADER_TAG = re.compile(r'@(unit|component|publishes|seam)\b')
PROVTAG = re.compile(r'@provisional\b')
DIRECTIVE = re.compile(r'(eslint-|@ts-|ts-(ignore|expect-error|nocheck)|prettier-ignore|istanbul|c8 |v8 |@vite-ignore|<reference|#region|#endregion|@vitest-environment|global |jshint|@jsx|webpackIgnore|biome-ignore|oxlint)')
LICENSE = re.compile(r'(SPDX-License|Copyright|Licensed under|@license)', re.I)


def head_of(body):
    for h, k in NEW + LEGACY:
        if body.startswith(h):
            return k
    if PURITY.match(body):
        return 'purity'
    if SEE.match(body):
        return 'L-see'
    if PROVTAG.match(body):
        return 'L-@provisional'
    if HEADER_TAG.match(body):
        return 'L-header-tag'
    if DIRECTIVE.match(body):
        return 'directive'
    if LICENSE.search(body):
        return 'license'
    return None


def first_word(body):
    m = re.match(r'\S+', body)
    return m.group(0) if m else ''


def files_of(top):
    out = subprocess.run(['git', '-C', ROOT, 'ls-files', top], capture_output=True,
                         text=True).stdout.split()
    return [f for f in out if f.endswith('.ts')]


def scan(top):
    units = []
    for rel in files_of(top):
        with io.open(os.path.join(ROOT, rel), encoding='utf-8') as fh:
            src = fh.read().replace('\r\n', '\n')
        lines = src.split('\n')
        gen = ccr.generated_lines(lines)
        code, comments = ccr.lex(src)
        code_lines = code.split('\n')
        # build raw items
        raw = []
        for kind, first, texts in comments:
            in_gen = first in gen
            if kind == 'block':
                bodies = [ccr.body_of(t) for t in texts]
                raw.append({'kind': 'block', 'jsdoc': texts[0].lstrip().startswith('/**'),
                            'line': first, 'bodies': bodies, 'gen': in_gen,
                            'trailing': False})
            else:
                trailing = ccr.is_code(code_lines[first - 1]) if first - 1 < len(code_lines) else False
                raw.append({'kind': 'line', 'line': first, 'bodies': [ccr.body_of(texts[0])],
                            'gen': in_gen, 'trailing': trailing})
        # group full-line // runs
        i = 0
        while i < len(raw):
            r = raw[i]
            if r['kind'] == 'line' and not r['trailing']:
                run = [r]
                j = i + 1
                while (j < len(raw) and raw[j]['kind'] == 'line' and not raw[j]['trailing']
                       and raw[j]['line'] == run[-1]['line'] + 1):
                    run.append(raw[j])
                    j += 1
                cur = None
                for x in run:
                    b = x['bodies'][0]
                    h = head_of(b)
                    if b == '':
                        if cur is not None:
                            cur['bodies'].append(b)
                            units.append(cur)
                        cur = None
                        continue
                    if cur is None or h is not None:
                        if cur is not None:
                            units.append(cur)
                        cur = {'file': rel, 'line': x['line'], 'style': 'line', 'bodies': [b],
                               'gen': x['gen'], 'trailing': False}
                    else:
                        cur['bodies'].append(b)
                if cur is not None:
                    units.append(cur)
                i = j
                continue
            units.append({'file': rel, 'line': r['line'],
                          'style': ('jsdoc' if r.get('jsdoc') else 'block') if r['kind'] == 'block' else 'trailing',
                          'bodies': r['bodies'], 'gen': r['gen'], 'trailing': r['trailing']})
            i += 1
    for u in units:
        nonempty = [b for b in u['bodies'] if b != '']
        u['first'] = nonempty[0] if nonempty else ''
        u['class'] = head_of(u['first']) or 'other'
        u['nlines'] = len(u['bodies'])
        heads_inside = [head_of(b) for b in nonempty[1:]]
        u['later_heads'] = [h for h in heads_inside if h]
        u['nonascii'] = any(re.search(r'[^\x20-\x7e]', b) for b in u['bodies'])
    return units


result = {}
for top in ('src', 'tests'):
    result[top] = scan(top)
with io.open(OUT, 'w', encoding='utf-8') as fh:
    json.dump(result, fh, ensure_ascii=False)

for top, units in result.items():
    live = [u for u in units if not u['gen']]
    print('==', top, 'units', len(units), 'in-generated', len(units) - len(live),
          'files', len({u['file'] for u in units}))
    c = Counter(u['class'] for u in live)
    for k, v in c.most_common():
        print('  %-16s %6d' % (k, v))
    st = Counter(u['style'] for u in live)
    print('  styles', dict(st))
    other = Counter(first_word(u['first']) for u in live if u['class'] == 'other')
    print('  top other first words:', other.most_common(20))
    multi = [u for u in live if u['nlines'] > 1]
    print('  multi-line units', len(multi))
    print('  multi-line by class', Counter(u['class'] for u in multi).most_common())
    # kind not on first line: first non-empty body has no head but a later one does
    notfirst = [u for u in multi if u['class'] == 'other' and u['later_heads']]
    print('  multi-line, head only on a later line', len(notfirst),
          Counter(tuple(u['later_heads'])[0] for u in notfirst).most_common())
    jsdoc_delim = [u for u in multi if u['style'] == 'jsdoc' and u['bodies'][0] == '']
    print('  multi-line jsdoc whose first physical line is bare /**', len(jsdoc_delim))
    two = [u for u in multi if u['class'] != 'other' and u['later_heads']]
    print('  multi-line with a head AND further heads inside', len(two),
          Counter((u['class'],) + tuple(u['later_heads'][:1]) for u in two).most_common(8))
    print('  units with non-ASCII', sum(u['nonascii'] for u in live),
          'files', len({u['file'] for u in live if u['nonascii']}))
    print('  comment lines (physical, live)', sum(u['nlines'] for u in live))
