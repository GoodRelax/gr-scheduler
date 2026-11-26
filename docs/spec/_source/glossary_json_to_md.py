# -*- coding: utf-8 -*-
"""glossary.json -> docs/spec/_assets/tbl-glossary.md and the review tables
of the names dictionary (CR-857, steps 1 and 2)

glossary.json is the names dictionary and the single source of truth for
every name GRS uses (JDG-3411, JDG-3419). EDIT THAT. This file checks it and
prints the documents made from it. Every file it writes is a generated
artifact: a hand edit is overwritten, and --check catches one before it is
committed.

    python glossary_json_to_md.py           check, then rebuild the documents
    python glossary_json_to_md.py --check   exit 1 on a problem or a drift

READS
    glossary.json          the names (every printed name comes from here)
    glossary-tables.json   the layout of tbl-glossary.md: the prose lines,
                           the captions and columns of the tables, and every
                           cell that is not a name -- T-104's group, T-105's
                           reason, T-106's meaning, the notes after a name.
                           A name cell holds placeholders, never the name:
                             {written:KEY}  the name code and data write
                             {label:KEY}    label.en (a screen name)
                             {owned:KEY}    xOwner.written (shapeHeightOf.arrow)
                             {key:KEY}      the dictionary key itself
                             {ja:KEY}       label.ja
                           An English form prints renames[].from instead while
                           that rename carries xAppliedToSpec: false -- the
                           table still shows the former name until CR-855
                           applies the rename to the specification.
    icons.json             the rows of table T-109 (design facts, no names);
                           a surface is the T-103 row whose name it prints

WRITES
    docs/spec/_assets/tbl-glossary.md
        the glossary of the specification (tables T-101 to T-106 and T-109)
    studies/82-anms-ndd-apply-plan/glossary-review/glossary-terms.tsv
        every term, one row each: the base the naming review works from
    studies/82-anms-ndd-apply-plan/glossary-review/glossary-review-base.md
        the terms no person has checked yet (no basis), by review section,
        and the names the specification table still prints differently

REFUSED BEFORE A BYTE IS WRITTEN
    whatever docs/development-rules/manuscript-schemas/glossary.schema.json
      refuses (when jsonschema is installed)
    a term key or a group key written twice
    a group whose parent names no earlier group, a term whose group names no
      group, a parent that names no earlier term, a tag that names no term
    a group that holds no term, no sub-group and no tag
    a former name (renames[].from) listed in avoid
    a name that a definition (en or ja) writes in backticks, or as
      Entity.column, that no term carries as its key, label.en, xIdentifier
      or xOwner (JDG-3418). A former name counts as missing: the check keeps
      a definition from citing a name that a rename retired
    an abbreviation term (label.en written as an acronym such as SSOT, JSON
      or MSPDI) without xExpansion (JDG-3524)
    whatever glossary-tables.schema.json or icons.schema.json refuses
    a placeholder that names no term, an unknown form, {owned:} on a term
      without xOwner; a row id written twice; a table row missing a cell of
      its columns or carrying a cell no column prints
    a term with two renames marked xAppliedToSpec: false, or one such rename
      that no placeholder prints (the mark would say nothing)
    an icon whose surface is not a T-103 row printing exactly one name
PRINTED, NOT REFUSED
    a former name (renames[].from) that another term under the same owner
      carries as its name -- the owner settled it, so the owner rules on it
    a name of table T-101, T-102, T-103, T-104, T-105 or T-106 that differs
      from the term carrying the same specTableRowId. Each one is a rename
      the owner ruled or one the naming review weighs
    a name cell that still writes a name no term carries (a backticked name
      outside a placeholder). The dictionary does not record that name yet;
      the review base lists every one, so CR-855 can turn it into a
      placeholder once the dictionary records the rename or the term

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys
from collections import Counter, OrderedDict

from spec_md_printing import say, schema_problems, separate_tables, broken_prose, broken

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(SPEC))
SRC = os.path.join(HERE, 'glossary.json')
LAYOUT = os.path.join(HERE, 'glossary-tables.json')
ICONS = os.path.join(HERE, 'icons.json')
SCHEMA_DIR = os.path.join(ROOT, 'docs', 'development-rules', 'manuscript-schemas')
SCHEMA = os.path.join(SCHEMA_DIR, 'glossary.schema.json')
LAYOUT_SCHEMA = os.path.join(SCHEMA_DIR, 'glossary-tables.schema.json')
ICONS_SCHEMA = os.path.join(SCHEMA_DIR, 'icons.schema.json')
TABLE = os.path.join(SPEC, '_assets', 'tbl-glossary.md')

# The language tbl-glossary.md is printed in. A cell that holds prose is a
# language dictionary in the layout, the way settings.json holds it.
LANG = 'ja'
# A placeholder of a cell: the form of the name and the term key.
PLACEHOLDER = re.compile(r'\{(written|label|owned|key|ja):([A-Za-z][A-Za-z0-9]*)\}')
# A backticked span of a name cell; one without a placeholder writes a name
# that the dictionary does not carry yet.
CODE = re.compile(r'`([^`]+)`')
SURFACE_TABLE = 'T-103'
ICON_TABLE = 'T-109'
# The column that holds the name in the name tables.
NAME_FIELD = 'name'
REVIEW_DIR = os.path.join(ROOT, 'studies', '82-anms-ndd-apply-plan', 'glossary-review')
OUT_TSV = os.path.join(REVIEW_DIR, 'glossary-terms.tsv')
OUT_MD = os.path.join(REVIEW_DIR, 'glossary-review-base.md')

# Which cell of a tbl-glossary.md row holds the name, and in which language.
NAME_CELL = {'N': (2, 'en'), 'P': (2, 'en'), 'U': (2, 'en'), 'K': (3, 'en'),
             'X': (2, 'en'), 'VK': (2, 'ja')}
CONTRACT_USES = ('grsJsonSchema', 'commandSchema', 'agentApi')
# Review sections, in the order the review sheet shows them (study 82, B3).
SECTIONS = OrderedDict([
    ('screen', u'画面に出る語'),
    ('mcpText', u'MCP の説明だけに出る語'),
    ('contract', u'外との約束の群にあり、凍結した契約で突き合わなかった語'),
    ('specAndCode', u'仕様とコードの中だけの語'),
])
TSV_COLUMNS = ['order', 'key', 'section', 'group', 'parent', 'identifier', 'owner',
               'labelEn', 'labelJa', 'expansion', 'basis', 'uses', 'specTableRowId',
               'specTableName', 'definitionEn', 'definitionJa']


def review_section(term):
    """The review section of a term, or 'checked' when a person checked it."""
    if term.get('checkedBasis'):
        return 'checked'
    uses = term['xUses']
    if 'screen' in uses:
        return 'screen'
    if any(u in uses for u in CONTRACT_USES):
        return 'contract'
    if 'mcpText' in uses:
        return 'mcpText'
    return 'specAndCode'


def table_rows(text):
    """{row id: [cells]} of the printed tbl-glossary.md text."""
    rows = {}
    for line in text.split('\n'):
        match = re.match(r'^\| ([A-Z]+-[0-9]+[a-z]?) \|', line)
        if match:
            rows[match.group(1)] = [c.strip() for c in line.strip().strip('|').split('|')]
    return rows


def problems(doc):
    found = schema_problems(doc, SCHEMA)
    if found:
        return found
    groups, terms = doc['xGroups'], doc['terms']
    found += ['group key %s written %d times' % (k, n)
              for k, n in Counter(g['key'] for g in groups).items() if n > 1]
    found += ['term key %s written %d times' % (k, n)
              for k, n in Counter(t['key'] for t in terms).items() if n > 1]
    seen = set()
    for g in groups:
        if 'parent' in g and g['parent'] not in seen:
            found.append('group %s: parent %s is no earlier group' % (g['key'], g['parent']))
        seen.add(g['key'])
    holders = Counter(t['xGroup'] for t in terms)
    holders.update(g['parent'] for g in groups if 'parent' in g)
    holders.update(g['key'] for g in groups if g.get('tags'))
    found += ['group %s holds no term, no sub-group and no tag' % g['key']
              for g in groups if not holders[g['key']]]
    keys = {t['key'] for t in terms}
    found += ['group %s: tag %s names no term' % (g['key'], tag)
              for g in groups for tag in g.get('tags', []) if tag not in keys]
    earlier = set()
    for t in terms:
        if t['xGroup'] not in seen:
            found.append('term %s: group %s names no group' % (t['key'], t['xGroup']))
        if 'xParent' in t and t['xParent'] not in earlier:
            found.append('term %s: parent %s is no earlier term' % (t['key'], t['xParent']))
        found += ['term %s: tag %s names no term' % (t['key'], tag)
                  for tag in t.get('xTags', []) if tag not in keys]
        earlier.add(t['key'])
    for t in terms:
        for rename in t.get('renames', []):
            former = rename['from']
            for t2 in terms:
                if any(former in words for words in t2.get('avoid', {}).values()):
                    found.append('term %s: former name %s is listed in avoid of %s'
                                 % (t['key'], former, t2['key']))
    found += cited_name_problems(terms)
    found += ['term %s: abbreviation %s has no xExpansion (JDG-3524)' % (t['key'], t['label']['en'])
              for t in terms if is_abbreviation(t['label']['en']) and 'xExpansion' not in t]
    return found


IDENTIFIER = r'[A-Za-z][A-Za-z0-9]*'
BACKTICKED = re.compile(r'`([^`]+)`')
# Entity.column written without backticks: two or more identifier parts of at
# least two letters each, outside a path, a file name or a web address.
DOTTED = re.compile(r'(?<![A-Za-z0-9_./\\-])([A-Za-z][A-Za-z0-9]+(?:\.[A-Za-z][A-Za-z0-9]+)+)'
                    r'(?![A-Za-z0-9_/\\-]|\.[A-Za-z0-9])')


def cited_names(text):
    """The names a definition cites: every backticked identifier or
    Entity.column, and every Entity.column outside backticks. A backticked
    text that is no identifier (a literal such as `javascript:` or
    `{"type":"theme"}`) cites no name."""
    names = []
    for match in BACKTICKED.finditer(text):
        if re.match(r'^%s(\.%s)*$' % (IDENTIFIER, IDENTIFIER), match.group(1)):
            names.append(match.group(1))
    names += [m.group(1) for m in DOTTED.finditer(BACKTICKED.sub(' ', text))
              if m.group(1).rsplit('.', 1)[1] not in FILE_EXTENSIONS]
    return names


# A dotted word that ends in one of these is a file name, not Entity.column.
FILE_EXTENSIONS = {'json', 'md', 'ts', 'js', 'mjs', 'html', 'xml', 'xsd', 'svg', 'png',
                   'tsv', 'csv', 'txt', 'py', 'css', 'mcpb', 'bak'}


def cited_name_problems(terms):
    """JDG-3418: a name cited in a definition must be a name of the dictionary."""
    known = set()
    for t in terms:
        known.update([t['key'], t['label']['en'], t.get('xIdentifier'), t.get('xOwner')])
    found = []
    for t in terms:
        for lang in ('en', 'ja'):
            for name in cited_names(t['definition'][lang]):
                missing = [part for part in name.split('.') if part not in known]
                if missing:
                    found.append('term %s: definition.%s cites %s, and %s names no term (JDG-3418)'
                                 % (t['key'], lang, name, ', '.join(missing)))
    return found


def is_abbreviation(label):
    """True for a label written as an acronym: one word of letters and
    digits, two or more capitals, and no two lower-case letters in a row
    (SSOT, MSPDI, ISO8601, SoC, LoD; not NullTrap or JSONSchema)."""
    return (re.match(r'^[A-Z][A-Za-z0-9]*$', label) is not None
            and sum(1 for c in label if c.isupper()) >= 2
            and re.search(r'[a-z]{2}', label) is None)


def reused_former_names(doc):
    """[(term, former name, the other terms)] for a former name that another
    term under the same owner now carries as its name. Printed, never refused:
    the owner settled these names in the frozen contracts before the first
    publication, and only the owner can rule on a reuse (study 82, A9)."""
    terms = doc['terms']
    named = {}
    for t in terms:
        for name in {t['label']['en'], written_name(t)}:
            named.setdefault((name, t.get('xOwner')), []).append(t['key'])
    reused = []
    for t in terms:
        for rename in t.get('renames', []):
            others = [k for k in named.get((rename['from'], t.get('xOwner')), []) if k != t['key']]
            if others:
                reused.append((t, rename['from'], others))
    return reused


def written_name(term):
    """The name code and data write for a term."""
    if 'xIdentifier' in term:
        return term['xIdentifier']
    if re.match(r'^[A-Za-z][A-Za-z0-9]*$', term['label']['en']):
        return term['label']['en']
    return term['key']


def table_differences(doc, text):
    """{term key: the name cell of tbl-glossary.md} for every term whose name
    differs from the row carrying its specTableRowId. Printed, never refused:
    each difference is a rename the owner ruled or a rename the review weighs,
    and CR-855 applies the ruled ones to the specification (study 82, A9)."""
    rows = table_rows(text)
    differences = OrderedDict()
    for t in doc['terms']:
        row_id = t.get('xSpecTableRowId')
        if row_id not in rows:
            continue
        cell_lang = NAME_CELL.get(row_id.split('-')[0])
        if not cell_lang:
            continue
        number, lang = cell_lang
        cells = rows[row_id]
        text = cells[number - 1].replace('**', '') if len(cells) >= number else ''
        names = [t['label'][lang]] + ([written_name(t)] if lang == 'en' else [])
        if not any(name in text for name in names):
            differences[t['key']] = text
    return differences


def unapplied_renames(term, language=None):
    """The renames of a term the specification has not taken yet, for one
    language: None is the English name or written name, 'ja' is label.ja
    (renames[].xLanguage)."""
    return [r for r in term.get('renames', [])
            if r.get('xAppliedToSpec') is False and r.get('xLanguage') == language]


def printed_name(term, form):
    """The name a placeholder prints. An English form prints the former name
    while the rename carries xAppliedToSpec: false (D3 of CR-857 step 2)."""
    if form == 'ja':
        pending_ja = unapplied_renames(term, 'ja')
        return pending_ja[0]['from'] if pending_ja else term['label']['ja']
    pending = unapplied_renames(term)
    written = pending[0]['from'] if pending else written_name(term)
    if form == 'owned':
        return '%s.%s' % (term['xOwner'], written)
    if pending:
        return written
    if form == 'written':
        return written
    if form == 'label':
        return term['label']['en']
    return term['key']


def fill(text, by_key):
    """A cell with every placeholder replaced by the name it prints."""
    return PLACEHOLDER.sub(lambda m: printed_name(by_key[m.group(2)], m.group(1)), text)


def raw_text(value):
    """A cell of a manuscript before the placeholders are filled: a plain
    string (no language) or a language dictionary."""
    return value[LANG] if isinstance(value, dict) else value


def markdown_row(cells, unspaced=()):
    """One Markdown row, printed the way settings_json_to_md.py prints one.
    A cell named in `unspaced` closes on '|' with no space before it: the
    hand-written table had 44 such rows, and the switch keeps the bytes."""
    out = '|'
    for i, text in enumerate(cells):
        if not text:
            out += ' |'
        else:
            out += ' %s%s|' % (broken(text), '' if i in unspaced else ' ')
    return out


def table_blocks(layout):
    """The table blocks of the layout, in print order."""
    return [b for b in layout['blocks'] if b['kind'] in ('table', 'icons')]


def icon_cells(icon, by_row_name):
    """The printed cells of one row of table T-109, in column order."""
    return [icon['id'], ' / '.join(by_row_name[r] for r in icon['surfaces']),
            raw_text(icon['group']), raw_text(icon['entryTo']),
            raw_text(icon['authority']), raw_text(icon['switches']),
            raw_text(icon['arms'])]


ICON_FIELDS = ('id', 'surfaces', 'group', 'entryTo', 'authority', 'switches', 'arms')


def surface_names(layout, by_key):
    """{T-103 row id: its printed name cell}."""
    for block in table_blocks(layout):
        if block['id'] == SURFACE_TABLE:
            return OrderedDict((r['id'], fill(raw_text(r[NAME_FIELD]), by_key))
                               for r in block['rows'])
    return OrderedDict()


def build_table_md(doc, layout, icons):
    """The text of _assets/tbl-glossary.md."""
    by_key = {t['key']: t for t in doc['terms']}
    surfaces = surface_names(layout, by_key)
    lines = []
    for block in layout['blocks']:
        if block['kind'] == 'prose':
            lines.extend(raw_text(x) for x in block['lines'])
            continue
        fields = [c['field'] for c in block['columns']]
        lines += ['**表 %s — %s**' % (block['id'], raw_text(block['caption'])),
                  block['blank_before_header'],
                  markdown_row([raw_text(c) for c in block['columns']]),
                  block['separator']]
        if block['kind'] == 'icons':
            for icon in icons['icons']:
                unspaced = [ICON_FIELDS.index(f) for f in icon.get('unspacedCells', [])]
                lines.append(markdown_row(icon_cells(icon, surfaces), unspaced))
            continue
        for row in block['rows']:
            cells = [fill(raw_text(row[f]), by_key) for f in fields]
            unspaced = [fields.index(f) for f in row.get('unspacedCells', [])]
            lines.append(markdown_row(cells, unspaced))
    return broken_prose(separate_tables('\n'.join(lines)))


def layout_problems(doc, layout, icons):
    """What the layout and the icon rows break, before a byte is written."""
    found = (['glossary-tables.json %s' % p for p in schema_problems(layout, LAYOUT_SCHEMA)]
             + ['icons.json %s' % p for p in schema_problems(icons, ICONS_SCHEMA)])
    if found:
        return found
    by_key = {t['key']: t for t in doc['terms']}
    seen = Counter()
    for block in table_blocks(layout):
        fields = [c['field'] for c in block['columns']]
        if len(set(fields)) != len(fields):
            found.append('%s: two columns map to one field' % block['id'])
        if block['kind'] == 'icons':
            if list(fields) != list(ICON_FIELDS):
                found.append('%s: the icon table prints the columns %s'
                             % (block['id'], ', '.join(ICON_FIELDS)))
            continue
        for row in block['rows']:
            seen[row['id']] += 1
            missing = [f for f in fields if f not in row]
            extra = [f for f in row if f not in fields and f != 'unspacedCells']
            if missing or extra:
                found.append('%s row %s: no cell for %s; not a column: %s'
                             % (block['id'], row['id'], ', '.join(missing) or '-',
                                ', '.join(extra) or '-'))
                continue
            found += ['%s row %s: unspacedCells names %s, which is no column'
                      % (block['id'], row['id'], f)
                      for f in row.get('unspacedCells', []) if f not in fields]
            for f in fields:
                for form, key in PLACEHOLDER.findall(raw_text(row[f])):
                    term = by_key.get(key)
                    if term is None:
                        found.append('%s row %s: {%s:%s} names no term'
                                     % (block['id'], row['id'], form, key))
                    elif form == 'owned' and 'xOwner' not in term:
                        found.append('%s row %s: {owned:%s} on a term without xOwner'
                                     % (block['id'], row['id'], key))
    icon_blocks = [b for b in table_blocks(layout) if b['kind'] == 'icons']
    if len(icon_blocks) != 1 or icon_blocks[0].get('source') != 'icons.json':
        found.append('the layout must hold exactly one icons block, source icons.json')
    surfaces = surface_names(layout, by_key) if not found else {}
    for icon in icons['icons']:
        seen[icon['id']] += 1
        for rid in icon['surfaces']:
            if rid not in surfaces or len(CODE.findall(surfaces[rid])) != 1:
                found.append('icon %s: surface %s is no T-103 row printing one name'
                             % (icon['id'], rid))
    found += ['row id %s written %d times' % (k, n) for k, n in seen.items() if n > 1]
    for t in doc['terms']:
        # A pending rename may name a term no table prints: the former name
        # still stands in the prose, and tools/apply_glossary_renames.py
        # replaces it there. One pending rename per language at most.
        for language in (None, 'ja'):
            pending = unapplied_renames(t, language)
            if len(pending) > 1:
                found.append('term %s: %d renames (%s) carry xAppliedToSpec: false; one may'
                             % (t['key'], len(pending), language or 'en'))
    return found


def spec_only_names(doc, layout):
    """[(row id, name, [(key, dictionary name)])] for every name a name cell
    writes outside a placeholder: a name the dictionary does not carry yet."""
    row_terms = {}
    for t in doc['terms']:
        if t.get('xSpecTableRowId'):
            row_terms.setdefault(t['xSpecTableRowId'], []).append(t)
    out = []
    for block in table_blocks(layout):
        if block['kind'] != 'table':
            continue
        for row in block['rows']:
            for span in CODE.findall(raw_text(row[NAME_FIELD])):
                if not PLACEHOLDER.search(span):
                    out.append((row['id'], span.strip("'"),
                                [(t['key'], written_name(t)) for t in row_terms.get(row['id'], [])]))
    return out


def printed_former_names(doc):
    """[(term, rename)] for every rename the specification has not taken yet."""
    return [(t, r) for t in doc['terms'] for r in unapplied_renames(t)]


_ICON_TABLE = []


def icon_table():
    """Table T-109 as tools/generate_icon_roster.py reads it: (headings,
    [cells of each row], the prose of its section above the caption, the
    names table T-103 settles). Read from the manuscripts, not from the
    printed file, so the roster follows icons.json directly. Read once per
    run: the roster and tools/generate_entity_types.py ask more than once."""
    if not _ICON_TABLE:
        _ICON_TABLE.append(read_icon_table())
    return _ICON_TABLE[0]


def read_icon_table():
    """The reading icon_table() hands out."""
    doc = json.load(io.open(SRC, encoding='utf-8'))
    layout = json.load(io.open(LAYOUT, encoding='utf-8'))
    icons = json.load(io.open(ICONS, encoding='utf-8'))
    found = problems(doc) or layout_problems(doc, layout, icons)
    if found:
        raise SystemExit('glossary_json_to_md: the manuscripts are not valid (%d '
                         'problem(s)); run glossary_json_to_md.py' % len(found))
    by_key = {t['key']: t for t in doc['terms']}
    surfaces = surface_names(layout, by_key)
    section = []
    for block in layout['blocks']:
        if block['kind'] == 'prose':
            for line in block['lines']:
                text = raw_text(line)
                section = [] if text.startswith('## ') else section + [text]
            continue
        if block['kind'] == 'icons':
            headings = [raw_text(c) for c in block['columns']]
            rows = [icon_cells(icon, surfaces) for icon in icons['icons']]
            names = set()
            for name_cell in surfaces.values():
                names.update(CODE.findall(name_cell))
            return headings, rows, section, names
        section = []
    raise SystemExit('glossary_json_to_md: the layout holds no icons block')


def cell(text):
    return text.replace('\t', ' ').replace('\r', ' ').replace('\n', ' ')


def md_cell(text):
    return cell(text).replace('|', '\\|')


def build_tsv(doc, differences):
    lines = ['\t'.join(TSV_COLUMNS)]
    for order, t in enumerate(doc['terms'], 1):
        lines.append('\t'.join([
            str(order), t['key'], review_section(t), t['xGroup'], t.get('xParent', ''),
            t.get('xIdentifier', ''), t.get('xOwner', ''), cell(t['label']['en']),
            cell(t['label']['ja']), cell(t.get('xExpansion', {}).get('en', '')),
            ' '.join(t.get('checkedBasis', [])), ' '.join(t['xUses']),
            t.get('xSpecTableRowId', ''), cell(differences.get(t['key'], '')),
            cell(t['definition']['en']), cell(t['definition']['ja'])]))
    return '\n'.join(lines) + '\n'


def build_md(doc, differences, layout):
    terms = doc['terms']
    titles = {g['key']: g['title']['ja'] for g in doc['xGroups']}
    count = Counter(review_section(t) for t in terms)
    out = [
        u'# 名の辞書 —— 人の確かめを待つ語（レビューの土台）',
        u'',
        u'> ⛔ 本書は生成物である。手で直さない。',
        u'> 名の辞書の唯一の正は `docs/spec/_source/glossary.json` である。'
        u'本書はそれを `docs/spec/_source/glossary_json_to_md.py` が印字したものである。',
        u'> **作り直す**: `npm run gen`（この表だけなら `npm run glossary`）／ '
        u'**ズレを検出する**: `npm run gen:check`。',
        u'',
        u'拠り所（`basis`）の無い語を、レビューの区分ごとに並べる。'
        u'全部の語は同じフォルダーの `glossary-terms.tsv` が持つ。',
        u'',
        u'| 区分 | 語の数 |',
        u'| --- | ---: |',
    ]
    for key, title in SECTIONS.items():
        out.append(u'| %s | %d |' % (title, count[key]))
    out.append(u'| 確かめ済み（拠り所あり） | %d |' % count['checked'])
    out.append(u'| 計 | %d |' % len(terms))
    for key, title in SECTIONS.items():
        out += ['', u'## %s（%d 語）' % (title, count[key]), '',
                u'| # | キー | 英語の名 | 日本語の名 | 持ち主 | 群 | 意味（英語） |',
                u'| ---: | --- | --- | --- | --- | --- | --- |']
        number = 0
        for t in terms:
            if review_section(t) != key:
                continue
            number += 1
            out.append(u'| %d | `%s` | %s | %s | %s | %s | %s |' % (
                number, t['key'], md_cell(t['label']['en']), md_cell(t['label']['ja']),
                md_cell(t.get('xOwner', '')), md_cell(titles[t['xGroup']]),
                md_cell(t['definition']['en'])))
    by_key = {t['key']: t for t in terms}
    out += ['', u'## 仕様の表（`tbl-glossary.md`）と辞書で名が違う語（%d 語）' % len(differences), '',
            u'辞書の名は持ち主が裁定した名か、レビューで量る名である。'
            u'裁定した名は CR-855 が改名の手順で仕様へ当てる。', '',
            u'| 行 ID | キー | 仕様の表の名 | 辞書の英語の名 | 辞書の日本語の名 | 拠り所 |',
            u'| --- | --- | --- | --- | --- | --- |']
    for key, text in differences.items():
        t = by_key[key]
        out.append(u'| %s | `%s` | %s | %s | %s | %s |' % (
            t['xSpecTableRowId'], key, md_cell(text), md_cell(t['label']['en']),
            md_cell(t['label']['ja']), ' '.join(t.get('checkedBasis', [])) or u'—'))
    reused = reused_former_names(doc)
    out += ['', u'## 前の名を別の語が名に使う例（%d 件）' % len(reused), '',
            u'基準書の付録 A.2 は、前の名を別の語に使い回さないとする。'
            u'下の名は持ち主が凍結した契約で決めたので、持ち主が扱いを決める。', '',
            u'| キー | 前の名 | 今その名を持つ語 | 改名の拠り所 |',
            u'| --- | --- | --- | --- |']
    for t, former, others in reused:
        rename = [r for r in t['renames'] if r['from'] == former][0]
        out.append(u'| `%s` | `%s` | %s | %s |' % (
            t['key'], former, ', '.join(u'`%s`' % k for k in others),
            ' '.join(rename['basis'])))
    former_names = printed_former_names(doc)
    out += ['', u'## 仕様の表がまだ前の名を印字する語（%d 語）' % len(former_names), '',
            u'辞書は改名を `renames[]` に持ち、その改名に `xAppliedToSpec: false` を付けた。'
            u'`tbl-glossary.md` は、この印があるあいだ前の名を印字する。'
            u'CR-855 が仕様へ改名を当てるとき、印を外して作り直す。', '',
            u'| 行 ID | キー | 仕様の表の名（前の名） | 辞書の書き名 | 改名の拠り所 |',
            u'| --- | --- | --- | --- | --- |']
    for t, rename in former_names:
        written = written_name(t)
        out.append(u'| %s | `%s` | `%s` | `%s` | %s |' % (
            t.get('xSpecTableRowId', u'—'), t['key'], rename['from'], written,
            ' '.join(rename['basis'])))
    spec_only = spec_only_names(doc, layout)
    out += ['', u'## 仕様の表が辞書に無い名で書く名（%d 件）' % len(spec_only), '',
            u'`glossary-tables.json` の名の欄が、置き換えの印（`{written:キー}` ほか）でなく、'
            u'名をじかに書いている。辞書はこの名を、語の名としても `renames[].from` としても持たない。'
            u'辞書が改名か語を持てば、CR-855 が欄を置き換えの印に直す。', '',
            u'| 行 ID | 仕様の表の名 | その行の語（キー: 辞書の書き名） |',
            u'| --- | --- | --- |']
    for row_id, name, row_terms in spec_only:
        out.append(u'| %s | `%s` | %s |' % (
            row_id, name, ', '.join(u'`%s`: `%s`' % pair for pair in row_terms) or u'—'))
    expanded = [t for t in terms if 'xExpansion' in t]
    out += ['', u'## 略語の展開形（%d 語）' % len(expanded), '',
            u'略語の形の語は `xExpansion` に元の語を持つ（JDG-3524）。'
            u'`tbl-glossary.md` の表は、CR-855 で展開形を印字する。', '',
            u'| キー | 英語の名 | 展開形（英語） | 展開形（日本語） |',
            u'| --- | --- | --- | --- |']
    for t in expanded:
        out.append(u'| `%s` | %s | %s | %s |' % (
            t['key'], md_cell(t['label']['en']), md_cell(t['xExpansion']['en']),
            md_cell(t['xExpansion']['ja'])))
    return '\n'.join(out) + '\n'


def main():
    unknown = [one for one in sys.argv[1:] if one != '--check']
    if unknown:
        say('unknown argument(s): %s -- nothing was written. Known: --check'
            % ' '.join(unknown))
        return 2
    doc = json.load(io.open(SRC, encoding='utf-8'))
    layout = json.load(io.open(LAYOUT, encoding='utf-8'))
    icons = json.load(io.open(ICONS, encoding='utf-8'))
    found = problems(doc) or layout_problems(doc, layout, icons)
    if found:
        for p in found:
            say('  %s' % p)
        say('the glossary manuscripts are not valid (%d problem(s)); nothing was written'
            % len(found))
        return 1
    table = build_table_md(doc, layout, icons)
    differences = table_differences(doc, table)
    built = [(TABLE, table), (OUT_TSV, build_tsv(doc, differences)),
             (OUT_MD, build_md(doc, differences, layout))]
    checked = sum(1 for t in doc['terms'] if t.get('checkedBasis'))
    counts = '%d term(s), %d checked, %d waiting' % (
        len(doc['terms']), checked, len(doc['terms']) - checked)
    if '--check' in sys.argv:
        status = 0
        for path, text in built:
            rel = os.path.relpath(path, ROOT).replace('\\', '/')
            if not os.path.exists(path):
                say('PROBLEM  %s has not been written yet' % rel)
                status = 1
                continue
            current = io.open(path, encoding='utf-8', newline='').read().replace('\r\n', '\n')
            if current != text:
                say('DRIFTED  %s no longer matches glossary.json, glossary-tables.json '
                    'and icons.json -- rerun glossary_json_to_md.py' % rel)
                status = 1
        if status == 0:
            say('OK       glossary.json is valid, and tbl-glossary.md and the review '
                'tables match (%s)' % counts)
        return status
    if not os.path.isdir(REVIEW_DIR):
        os.makedirs(REVIEW_DIR)
    for path, text in built:
        io.open(path, 'w', encoding='utf-8', newline='\n').write(text)
        say('wrote %s' % os.path.relpath(path, ROOT).replace('\\', '/'))
    say('(%s)' % counts)
    return 0


if __name__ == '__main__':
    sys.exit(main())
