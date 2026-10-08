# -*- coding: utf-8 -*-
"""notice-reasons.json -> docs/spec/_assets/tbl-notice-reasons.md

notice-reasons.json is the manuscript for the notice roster: table T-233
(every reason a telling can carry) and table T-234 (every question a
confirmation can show) of FR-076 (CR-712, JDG-1751). EDIT THAT. This file
prints it as the document the specification carries, and
_assets/tbl-notice-reasons.md is a generated artifact: a hand edit to it is
overwritten, and --check catches one before it can be committed.

    python notice_reasons_json_to_md.py           rebuild the document
    python notice_reasons_json_to_md.py --check   exit 1 if the file differs

⭐ THE CELLS ARE CARRIED, NOT COMPOSED. `scene`, `source` and `names` hold the
Markdown the hand-written tables held, byte for byte; `manner` is printed in a
code span. That is what let the move out of 01-04-requirements.md be proved by
a byte comparison of the rows, the proof Chapter 6.2 asks of every move.

⚠️ THE `display` COLUMN IS NOT PRINTED YET. Wave 1 of CR-712 moved the rows
without changing what the tables say; the column joins the tables with the
change that applies the decisions to it.

⛔ REFUSED BEFORE A BYTE IS WRITTEN:

    a row id written twice, or a reason / question row id of the wrong prefix
    a cell holding a line break or a ` | ` that would split the row
    a `wordsOf` naming no reason of this file, naming a reason that itself
      shares words, or naming a reason of another manner or display
    an `invariantRefusals.wordsOf` key that is no row of table T-220, or a
      value that is no reason of this file
    whatever notice-reasons.schema.json refuses (when jsonschema is installed)

⛔ NO RULE IS PRINTED HERE. The MUST clauses about these tables stand in FR-076
of 01-04-requirements.md; this document prints the rows and says where it came
from.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(SPEC))
ASSETS = os.path.join(SPEC, '_assets')
SRC = os.path.join(HERE, 'notice-reasons.json')
SCHEMA = os.path.join(HERE, 'notice-reasons.schema.json')
OUT = os.path.join(ASSETS, 'tbl-notice-reasons.md')
# Table T-220 (the document invariants) stands in Chapter 6.1 of this file.
DESIGN = os.path.join(SPEC, '05-07-design.md')
INVARIANT_CAPTION = u'**表 T-220 —'
INVARIANT_ROW = re.compile(r'^\| (IV-\d+) \|')
CAPTION = u'**表 '

LANG = 'ja'
REASON_ID = re.compile(r'^RS-\d+$')
QUESTION_ID = re.compile(r'^QN-\d+$')


def say(message):
    """The Windows console is cp932 and these messages quote a manuscript
    holding marks it cannot encode, so write them through a replacing
    encoder rather than raise from inside the problem reporter."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def invariant_rows():
    """The row ids of table T-220, read from the design document every run."""
    lines = io.open(DESIGN, encoding='utf-8', newline='').read() \
        .replace('\r\n', '\n').split('\n')
    found = []
    inside = False
    for line in lines:
        if line.startswith(INVARIANT_CAPTION):
            inside = True
            continue
        if inside and line.startswith(CAPTION):
            break
        if inside:
            hit = INVARIANT_ROW.match(line)
            if hit:
                found.append(hit.group(1))
    return found


def schema_problems(doc):
    try:
        import jsonschema
    except ImportError:
        return []
    schema = json.load(io.open(SCHEMA, encoding='utf-8'))
    return ['schema: %s at /%s' % (e.message, '/'.join(str(p) for p in e.path))
            for e in jsonschema.Draft202012Validator(schema).iter_errors(doc)]


def cell_problems(where, cell):
    if '\n' in cell or '\r' in cell:
        return ['%s holds a line break -- a row is one line' % where]
    if ' | ' in cell:
        return ['%s holds " | ", which would split the row' % where]
    return []


def words_problems(doc, invariants):
    found = []
    by_id = dict((one['id'], one) for one in doc['reasons'])
    for one in doc['reasons']:
        target = one.get('wordsOf')
        if target is None:
            continue
        if target not in by_id:
            found.append('%s shares the words of %s, which is no reason of '
                         'this file' % (one['id'], target))
            continue
        other = by_id[target]
        if 'wordsOf' in other:
            found.append('%s shares the words of %s, which itself shares the '
                         'words of %s -- name the row that holds them'
                         % (one['id'], target, other['wordsOf']))
        for key in ('manner', 'display'):
            if one[key] != other[key]:
                found.append('%s shares the words of %s but its %s is %s '
                             'against %s' % (one['id'], target, key, one[key],
                                              other[key]))
    for row, target in sorted(doc['invariantRefusals'].get('wordsOf', {}).items()):
        if row not in invariants:
            found.append('invariantRefusals.wordsOf names %s, which is no row '
                         'of table T-220' % row)
        if target not in by_id:
            found.append('invariantRefusals.wordsOf sends %s to %s, which is '
                         'no reason of this file' % (row, target))
    return found


def problems(doc, invariants):
    found = schema_problems(doc)
    if found:
        return found
    if not invariants:
        found.append('table T-220 has no rows in 05-07-design.md -- the '
                     'caption or the row shape moved')
    seen = set()
    for key, shape, cells in (('reasons', REASON_ID, ('scene', 'source')),
                              ('questions', QUESTION_ID,
                               ('scene', 'names', 'source'))):
        for one in doc[key]:
            rid = one['id']
            if rid in seen:
                found.append('%s is written twice' % rid)
            seen.add(rid)
            if not shape.match(rid):
                found.append('%s is no row id of %s' % (rid, key))
            for name in cells:
                found += cell_problems('%s.%s' % (rid, name), one[name][LANG])
    return found + words_problems(doc, invariants)


def table_lines(table, rows):
    columns = table['columns'][LANG]
    out = [
        u'**表 %s — %s**' % (table['id'], table['caption'][LANG]),
        '',
        u'| %s |' % u' | '.join(columns),
        u'| %s |' % u' | '.join(['---'] * len(columns)),
    ]
    out += [u'| %s |' % u' | '.join(cells) for cells in rows]
    return out


def reason_cells(one):
    return [one['id'], one['scene'][LANG], u'`%s`' % one['manner'],
            one['source'][LANG]]


def question_cells(one):
    return [one['id'], one['scene'][LANG], one['names'][LANG],
            one['source'][LANG]]


def build(doc):
    """The document, as it is written out."""
    reason_table = doc['reasonTable']
    question_table = doc['questionTable']
    out = [
        u'# 知らせの名簿 — 表 %s・表 %s' % (reason_table['id'], question_table['id']),
        '',
        '**UID**: DOC-TBL-NOTICE-REASONS',
        '**Version**: 0.1',
        '',
        u'> ⛔ 本書は生成物である。  ',
        u'> 手で直さない —— 直しても次の `npm run gen` で消える。',
        u'> **知らせの名簿の唯一の正は `_source/notice-reasons.json` である。**  ',
        u'> 本書はそれを `_source/notice_reasons_json_to_md.py` が印字したものである。',
        u'> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。',
        '',
        u'規則は `01-04-requirements.md` の `FR-076` が持つ。  ',
        u'本書は 表 %s と 表 %s の全行を印字する。'
        % (reason_table['id'], question_table['id']),
        '',
    ]
    out += table_lines(reason_table, [reason_cells(one) for one in doc['reasons']])
    out.append('')
    out += table_lines(question_table,
                       [question_cells(one) for one in doc['questions']])
    return u'\n'.join(out) + u'\n'


def main():
    if '-h' in sys.argv[1:] or '--help' in sys.argv[1:]:
        say(__doc__)
        return 0
    unknown = [one for one in sys.argv[1:] if one != '--check']
    if unknown:
        say('unknown argument(s): %s -- nothing was written. Known: --check, '
            '--help' % ' '.join(unknown))
        return 2
    doc = json.load(io.open(SRC, encoding='utf-8'))
    found = problems(doc, invariant_rows())
    if found:
        for p in found:
            say('  %s' % p)
        say('notice-reasons.json is not valid; nothing was written')
        return 1
    built = build(doc)
    rel = os.path.relpath(OUT, ROOT).replace('\\', '/')
    counts = '%d reason(s), %d question(s)' % (len(doc['reasons']),
                                               len(doc['questions']))
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % rel)
            return 1
        current = io.open(OUT, encoding='utf-8', newline='').read()
        current = current.replace('\r\n', '\n')
        if current != built:
            say('DRIFTED  %s no longer matches notice-reasons.json -- rerun '
                'notice_reasons_json_to_md.py' % rel)
            return 1
        say('OK       %s matches notice-reasons.json (%s)' % (rel, counts))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(built)
    say('wrote %s  (%s)' % (rel, counts))
    return 0


if __name__ == '__main__':
    sys.exit(main())
