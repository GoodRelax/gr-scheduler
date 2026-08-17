# -*- coding: utf-8 -*-
"""erd.json -> the two data-model documents under docs/spec/_assets/

    erd.json                the single source of truth. EDIT THIS.
    erd_json_to_md.py       this file. Reads the JSON, writes both .md.
    ../fig-erd-overview.md  generated: figure F-010, the container's shape.
    ../fig-erd-detail.md    generated: figure F-011 and tables T-056 to T-059.
                            NEVER EDIT EITHER -- your change is overwritten.

The documents hold figures and tables and nothing else: the prose that
explains them lives in 05-07-design.md, which reaches them through
[LINK: DOC-FIG-ERD-OVERVIEW] and [LINK: DOC-FIG-ERD-DETAIL].

    python erd_json_to_md.py           rebuild both documents
    python erd_json_to_md.py --check   exit 1 if either file on disk differs
                                       from what erd.json produces

--check is what catches a hand edit to a generated file; check.sh runs it as
check 16. The data is validated before anything is written, so a broken
erd.json stops the build instead of shipping a broken table -- and figure
F-010 must account for every entity exactly once, which is the check the
hand-written version of that figure could never have.
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# This file sits in docs/spec/_source/ -- the manuscripts belong to no language,
# so they stay out of the _assets folder that the ja/en split will divide
# (CR-175). The document it writes lands in _assets/, beside the other assets.
ASSETS = os.path.abspath(os.path.join(HERE, '..', '_assets'))

KEYS = ('', 'PK', 'FK', 'PK/FK')
ORIGINS = ('Own', 'Consume', 'GRS', 'Carry')

PK_COLOUR = '#C00000'
FK_COLOUR = '#008000'

# multiplicity written as "parent side ─ child side"
CROWS_FOOT = {
    '0..1 ─ 0..1': '|o--o|',
    '0..1 ─ 1': '|o--||',
    '1 ─ 1': '||--||',
    '1 ─ 0..1': '||--o|',
    '1 ─ 0..n': '||--o{',
    '0..n ─ 1': '}o--||',
    '0..n ─ 0..1': '}o--o|',
    '0..n ─ 0..n': '}o--o{',
}

CARRY_LABEL = 'carryElements の中身'
CARRY_MULT = '1 ─ 0..n'
CARRY_MEANING = '解釈しない要素の退避先（`carryElements`）'

BANNER = ('> ⛔ **本書は生成物である。手で直さない —— 直しても次の '
          '`npm run gen` で消える。**\n'
          '> **唯一の正は `_source/erd.json` であり、本書はそれを '
          '`_source/erd_json_to_md.py` が書き出したものである。**\n'
          '> **作り直す**: `npm run gen` ／ **ズレを検出する**: '
          '`npm run gen:check`（検査 16 が呼ぶ）。説明の散文は '
          '`05-07-design.md` が持つ。')

# The header row lives next to the code that builds the body rows, so the two
# cannot drift apart. The caption and its number are data and come from the
# JSON.
HEADERS = {
    # The column names the destination: the software always writes every
    # entity to its own GRS JSON (FR-024), so a bare "書き出すか" could only
    # ever have meant the exchange partner -- but the reader had to leave the
    # table to find that out.
    'entity': ('| 行 ID | 名前 | 何を表すか | 鍵 | `MSPDI` へ書き出すか |'
               ' `carry` の器 |',
               '| --- | --- | --- | --- | --- | --- |'),
    'relation': ('| 行 ID | 親 | 子 | 多重度 | 何を表すか |',
                 '| --- | --- | --- | --- | --- |'),
    'column': ('| 行 ID | エンティティ | 列 | 型 | `null` | 鍵 | 出自 |'
               ' 交換相手の要素 | 意味 |',
               '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'),
    'derived': ('| 行 ID | エンティティ | 交換相手での名前 |'
                ' 交換相手の要素 | 何から作るか |',
                '| --- | --- | --- | --- | --- |'),
}


def load(path=None):
    with io.open(path or os.path.join(HERE, 'erd.json'), encoding='utf-8') as f:
        return json.load(f)


def esc(s):
    return s.replace('`', '')


def carry_owners(doc):
    return [e['name'] for e in doc['entities'] if e['carry']]


# ---------------------------------------------------------------- figure ---

BRACE_TYPE = {'{ dx, dy }': ('オブジェクト', '{ dx, dy }')}


def split_type(typ):
    """'文字列（16 字以下）' -> ('文字列', '16 字以下')

    An erDiagram type has to be one whitespace-free token, so the parenthetical
    part moves next to the origin in the comment. Table T-058 keeps the full
    type verbatim.
    """
    typ = esc(typ)
    if typ in BRACE_TYPE:
        return BRACE_TYPE[typ]
    if typ.endswith('）') and '（' in typ:
        base, detail = typ[:-1].split('（', 1)
        return base, detail
    return typ, ''


def figure(doc):
    out = ['```mermaid', '---', 'config:', '  er:', '    entityPadding: 6',
           '---', 'erDiagram']
    for e in doc['entities']:
        out.append('    %s {' % e['name'])
        for c in e['columns']:
            base, detail = split_type(c['type'])
            comment = c['origin'] + ('・' + detail if detail else '')
            marker = (' ' + c['key'].replace('/', ',')) if c['key'] else ''
            # A key column keeps its name in bold, the way the red and the
            # green did before. erDiagram cannot colour one attribute, but it
            # runs the name through its markdown renderer, and it measures the
            # bold text too, so the box stays the right size.
            name = '**%s**' % c['name'] if c['key'] else c['name']
            out.append('        %s %s%s "%s"' % (base, name, marker, comment))
        out.append('    }')
    for r in doc['relations']:
        out.append('    %s %s %s : "%s"'
                   % (r['parent'], CROWS_FOOT[r['multiplicity']], r['child'],
                      esc(r['label'])))
    for o in carry_owners(doc):
        out.append('    %s ||--o{ CarryElement : "%s"' % (o, CARRY_LABEL))
    out.append('```')
    return '\n'.join(out)


def container_figure(doc):
    """Figure F-010: the shape of the JSON container that holds the entities.

    Every entity is placed exactly once -- named beside its key in the
    schedule box, given a box of its own, or drawn as a bare node -- and
    problems() refuses to write a byte unless that holds. While this figure
    was hand written an entity added to `entities` slipped past it silently,
    and the numbers it used to name them with were array positions, so they
    went stale without anything noticing.

    An erDiagram, the same shape as F-011. The flowchart of HTML tables it
    replaced drew two frames around every box -- mermaid's own node border
    around a table that already carried one -- and StrictDoc's autogen.css
    widened those table cells after mermaid had already fixed the box size, so
    the contents overflowed. An erDiagram uses no HTML, so neither happens.
    The multiplicity moves out of the label text into crow's foot notation,
    and the type column a flowchart had no room for replaces the `[]` suffix
    that used to stand in for "this key holds an array".

    Only constructs figure F-011 already renders in this document set are
    used: ASCII entity and attribute names, a whitespace-free Japanese type
    token, and a quoted Japanese comment. Entity aliases would let the boxes
    carry Japanese names, but nothing here proves the bundled mermaid accepts
    them, so the boxes are named by their JSON key instead -- which is what
    this figure is about anyway.
    """
    c = doc['container']
    columns = {e['name']: e['columns'] for e in doc['entities']}
    out = ['```mermaid', '---', 'config:', '  er:', '    entityPadding: 6',
           '---', 'erDiagram']
    for b in c['boxes']:
        rows = b.get('rows') or b.get('entity_rows')
        if rows is None:                       # a box that IS one entity
            rows = [[split_type(x['type'])[0], x['name'], label]
                    for x, label in zip(columns[b['entity']], b['labels'])]
        out.append('    %s {' % b['id'])
        for typ, name, comment in rows:
            out.append('        %s %s "%s"' % (esc(typ), name, esc(comment)))
        out.append('    }')
    for e in c['edges']:
        out.append('    %s %s %s : "%s"'
                   % (e['from'], CROWS_FOOT[e['multiplicity']], e['to'],
                      esc(e['label'])))
    out.append('```')
    return '\n'.join(out)


FIGURES = {'figure': figure, 'container': container_figure}


# ---------------------------------------------------------------- tables ---

def entity_table(doc, prefix):
    rows = []
    for i, e in enumerate(doc['entities'], 1):
        keys = [c['name'] for c in e['columns'] if c['key'].startswith('PK')]
        key = e.get('key_note', ' ＋ '.join('`%s`' % k for k in keys) or '—')
        rows.append('| %s-%d | `%s` | %s | %s | %s | %s |'
                    % (prefix, i, e['name'], e['description'], key,
                       '書き出す' if e['export'] else '**書き出さない**',
                       'あり' if e['carry'] else '—'))
    return rows


def relation_table(doc, prefix):
    rows = ['| %s-%d | `%s` | `%s` | %s | %s |'
            % (prefix, i, r['parent'], r['child'], r['multiplicity'],
               r['label'])
            for i, r in enumerate(doc['relations'], 1)]
    for j, o in enumerate(carry_owners(doc), len(doc['relations']) + 1):
        rows.append('| %s-%d | `%s` | `CarryElement` | %s | %s |'
                    % (prefix, j, o, CARRY_MULT, CARRY_MEANING))
    return rows


def column_table(doc, prefix):
    rows = []
    n = 0
    for e in doc['entities']:
        for c in e['columns']:
            n += 1
            rows.append('| %s-%d | `%s` | `%s` | %s | %s | %s | %s | %s | %s |'
                        % (prefix, n, e['name'], c['name'], c['type'],
                           c['nullable'],
                           c['key'] or '—', c['origin'],
                           ('`%s`' % c['exchange']) if c['exchange'] else '—',
                           c['meaning']))
    return rows


def derived_table(doc, prefix):
    return ['| %s-%d | `%s` | `%s` | `%s` | %s |'
            % (prefix, i, d['entity'], d['name'], d['exchange'], d['source'])
            for i, d in enumerate(doc['derived'], 1)]


BUILDERS = {'entity': entity_table, 'relation': relation_table,
            'column': column_table, 'derived': derived_table}


# -------------------------------------------------------------- document ---

def document(doc, meta):
    out = ['# %s' % meta['title'], '',
           '**UID**: %s' % meta['uid'],
           '**Version**: %s' % meta['version'], '',
           BANNER, '']
    for section in meta['sections']:
        out += ['## %s' % section['title'], '', '**Type**: SECTION', '',
                '**%s**' % section['caption'], '']
        if section['block'] in FIGURES:
            out += [FIGURES[section['block']](doc), '']
        else:
            header, rule = HEADERS[section['block']]
            rows = BUILDERS[section['block']](doc, section['row_prefix'])
            out += [header, rule] + rows + ['']
    return '\n'.join(out)


# --------------------------------------------------------------- checking ---

def schema_problems(doc):
    """Check the input against erd.schema.json.

    The dependency is soft on purpose. erd.schema.json is the portable
    description of the format -- it is what another tool, or the next person,
    reads to understand the file -- but a machine without a validator must
    still be able to build the specification. The semantic checks below run
    either way, and they cover what a schema cannot express.
    """
    path = os.path.join(HERE, 'erd.schema.json')
    if not os.path.exists(path):
        return ['erd.schema.json is missing']
    try:
        import jsonschema
    except ImportError:
        say('NOTE     jsonschema is not installed, so erd.schema.json was not'
            ' enforced this run')
        return []
    with io.open(path, encoding='utf-8') as f:
        schema = json.load(f)
    validator = jsonschema.Draft202012Validator(schema)
    return ['%s: %s' % ('/'.join(str(x) for x in e.path) or '(root)', e.message)
            for e in sorted(validator.iter_errors(doc),
                            key=lambda e: list(e.path))]


def problems(doc):
    """Everything that must hold before a single byte is written.

    The schema covers shapes and vocabularies. What follows covers the things
    a schema cannot say: that a name points at something that exists.
    """
    found = schema_problems(doc)
    if found:
        return found
    names = set(e['name'] for e in doc['entities'])
    columns = set((e['name'], c['name'])
                  for e in doc['entities'] for c in e['columns'])

    for e in doc['entities']:
        for c in e['columns']:
            if c['key'] not in KEYS:
                found.append('%s.%s has key %r' % (e['name'], c['name'], c['key']))
            if c['origin'] not in ORIGINS:
                found.append('%s.%s has origin %r'
                             % (e['name'], c['name'], c['origin']))

    for r in doc['relations']:
        for side in ('parent', 'child'):
            if r[side] not in names:
                found.append('relation %s -> %s: no entity %r'
                             % (r['parent'], r['child'], r[side]))
        if r['multiplicity'] not in CROWS_FOOT:
            found.append('relation %s -> %s: multiplicity %r cannot be drawn'
                         % (r['parent'], r['child'], r['multiplicity']))

    for d in doc['derived']:
        if d['entity'] not in names:
            found.append('derived %s.%s: no entity' % (d['entity'], d['name']))
        if (d['entity'], d['name']) in columns:
            found.append('derived %s.%s is also a stored column'
                         % (d['entity'], d['name']))

    # Figure F-010 must account for every entity exactly once. This is the
    # check the hand-written figure could not have: it turns "someone forgot
    # to update the picture" into a build that stops.
    c = doc['container']
    by_name = {e['name']: e for e in doc['entities']}
    ids = [b['id'] for b in c['boxes']] + [n['id'] for n in c['nodes']]
    for i in sorted(set(x for x in ids if ids.count(x) > 1)):
        found.append('container: box id %r is used twice' % i)

    placed = [r[2] for b in c['boxes'] for r in (b.get('entity_rows') or [])]
    placed += [b['entity'] for b in c['boxes'] if 'entity' in b]
    placed += [n['entity'] for n in c['nodes']]
    for n in sorted(set(placed) - names):
        found.append('container places %r, which is not an entity' % n)
    for n in sorted(names - set(placed)):
        found.append('container does not place entity %r' % n)
    for n in sorted(set(x for x in placed if placed.count(x) > 1)):
        found.append('container places entity %r more than once' % n)

    for b in c['boxes']:
        if 'entity' not in b or b['entity'] not in by_name:
            continue
        want = len(by_name[b['entity']]['columns'])
        got = len(b.get('labels') or [])
        if got != want:
            found.append('container box %s carries %d labels but %s has %d '
                         'columns' % (b['id'], got, b['entity'], want))
    for e in c['edges']:
        for side in ('from', 'to'):
            if e[side] not in ids:
                found.append('container edge %s -> %s: no box %r'
                             % (e['from'], e['to'], e[side]))
        if e['multiplicity'] not in CROWS_FOOT:
            found.append('container edge %s -> %s: multiplicity %r cannot be '
                         'drawn' % (e['from'], e['to'], e['multiplicity']))
    # A bare node draws nothing on its own in an erDiagram: it only appears
    # because an edge names it. One that no edge touches would vanish.
    touched = {x for e in c['edges'] for x in (e['from'], e['to'])}
    for n in c['nodes']:
        if n['id'] not in touched:
            found.append('container node %s is in no edge, so it would not be '
                         'drawn at all' % n['id'])

    # A row with the wrong number of cells silently stops markdown from
    # drawing the table at all.
    for section in [s for m in doc['documents'] for s in m['sections']]:
        kind = section['block']
        if kind in FIGURES:
            continue
        header, rule = HEADERS[kind]
        want = header.count('|')
        if rule.count('|') != want:
            found.append('%s: rule has %d pipes, header has %d'
                         % (kind, rule.count('|'), want))
        for i, row in enumerate(BUILDERS[kind](doc, section['row_prefix']), 1):
            if row.count('|') != want:
                found.append('%s row %d has %d cells, header has %d'
                             % (kind, i, row.count('|') - 1, want - 1))

    for kind, build in sorted(FIGURES.items()):
        body = '\n'.join(build(doc).split('\n')[1:-1])  # inside the ``` fences
        if '`' in body:
            found.append('%s: a backtick would show literally inside mermaid'
                         % kind)
        # mermaid draws NOTHING for a diagram over maxTextSize and reports no
        # error on the page. The default is 50000 and the key sits in
        # mermaid's `secure` list, so the figure cannot raise it -- only the
        # host can.
        if len(body) >= 50000:
            found.append('%s: figure is %d characters, over mermaid '
                         'maxTextSize 50000' % (kind, len(body)))
    return found


def say(text):
    """The Windows console is cp932; an em dash must not kill the run."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(text.encode(enc, 'replace').decode(enc) + '\n')


def compare(target, built):
    """Report whether the file on disk is still what erd.json produces."""
    if not os.path.exists(target):
        say('MISSING  %s' % target)
        return 1
    with io.open(target, encoding='utf-8') as f:
        on_disk = f.read()
    if on_disk == built:
        say('OK       %s matches erd.json' % os.path.basename(target))
        return 0
    say('DRIFT    %s differs from what erd.json produces' % target)
    a, b = on_disk.split('\n'), built.split('\n')
    for i in range(max(len(a), len(b))):
        x = a[i] if i < len(a) else '<missing>'
        y = b[i] if i < len(b) else '<missing>'
        if x != y:
            say('  line %d\n    on disk   %r\n    from json %r'
                % (i + 1, x[:110], y[:110]))
            break
    return 1


def main():
    doc = load()
    found = problems(doc)
    if found:
        for p in found:
            say('PROBLEM  %s' % p)
        return 1

    # --out lets a run be inspected without touching docs/.
    out_dir = ASSETS
    if '--out' in sys.argv:
        out_dir = sys.argv[sys.argv.index('--out') + 1]
    checking = '--check' in sys.argv

    rc = 0
    for meta in doc['documents']:
        built = document(doc, meta)
        target = os.path.abspath(os.path.join(out_dir, meta['file']))
        if checking:
            rc |= compare(target, built)
            continue
        with io.open(target, 'w', encoding='utf-8', newline='\n') as f:
            f.write(built)
        say('wrote %s  (%d chars)' % (target, len(built)))
    if not checking:
        say('entities %d  columns %d  relations %d  derived %d'
            % (len(doc['entities']), len(column_table(doc, 'AT')),
               len(relation_table(doc, 'RL')), len(derived_table(doc, 'DV'))))
    return rc


if __name__ == '__main__':
    sys.exit(main())
