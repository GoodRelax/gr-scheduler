# -*- coding: utf-8 -*-
"""glossary.json -> the review tables of the names dictionary (CR-857, step 1)

glossary.json is the names dictionary and the single source of truth for
every name GRS uses (JDG-3411, JDG-3419). EDIT THAT. This file checks it and
prints the tables made from it. Every table it writes is a generated artifact:
a hand edit is overwritten, and --check catches one before it is committed.

    python glossary_json_to_md.py           check, then rebuild the tables
    python glossary_json_to_md.py --check   exit 1 on a problem or a drift

WRITES (step 1 of CR-857)
    studies/82-anms-ndd-apply-plan/glossary-review/glossary-terms.tsv
        every term, one row each: the base the naming review works from
    studies/82-anms-ndd-apply-plan/glossary-review/glossary-review-base.md
        the terms no person has checked yet (no basis), by review section
Step 2 of CR-857 prints docs/spec/_assets/tbl-glossary.md from this file too.

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
PRINTED, NOT REFUSED
    a former name (renames[].from) that another term under the same owner
      carries as its name -- the owner settled it, so the owner rules on it
    a name of table T-101, T-102, T-103, T-104, T-105 or T-106 of
      _assets/tbl-glossary.md that differs from the term carrying the same
      specTableRowId. Each one is a rename the owner ruled or one the naming
      review weighs; the review base lists them, so until step 2 generates
      that file the two places cannot drift apart in silence

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys
from collections import Counter, OrderedDict

from spec_md_printing import say, schema_problems

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(SPEC))
SRC = os.path.join(HERE, 'glossary.json')
SCHEMA = os.path.join(ROOT, 'docs', 'development-rules', 'manuscript-schemas',
                      'glossary.schema.json')
TABLE = os.path.join(SPEC, '_assets', 'tbl-glossary.md')
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
               'labelEn', 'labelJa', 'basis', 'uses', 'specTableRowId',
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


def table_rows():
    """{row id: [cells]} of _assets/tbl-glossary.md."""
    rows = {}
    for line in io.open(TABLE, encoding='utf-8'):
        match = re.match(r'^\| ([A-Z]+-[0-9]+[a-z]?) \|', line)
        if match:
            rows[match.group(1)] = [c.strip() for c in line.strip().strip('|').split(' | ')]
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


def table_differences(doc):
    """{term key: the name cell of tbl-glossary.md} for every term whose name
    differs from the row carrying its specTableRowId. Printed, never refused:
    each difference is a rename the owner ruled or a rename the review weighs,
    and CR-855 applies the ruled ones to the specification (study 82, A9)."""
    rows = table_rows()
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
            cell(t['label']['ja']), ' '.join(t.get('checkedBasis', [])), ' '.join(t['xUses']),
            t.get('xSpecTableRowId', ''), cell(differences.get(t['key'], '')),
            cell(t['definition']['en']), cell(t['definition']['ja'])]))
    return '\n'.join(lines) + '\n'


def build_md(doc, differences):
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
    return '\n'.join(out) + '\n'


def main():
    unknown = [one for one in sys.argv[1:] if one != '--check']
    if unknown:
        say('unknown argument(s): %s -- nothing was written. Known: --check'
            % ' '.join(unknown))
        return 2
    doc = json.load(io.open(SRC, encoding='utf-8'))
    found = problems(doc)
    if found:
        for p in found:
            say('  %s' % p)
        say('glossary.json is not valid (%d problem(s)); nothing was written' % len(found))
        return 1
    differences = table_differences(doc)
    built = [(OUT_TSV, build_tsv(doc, differences)), (OUT_MD, build_md(doc, differences))]
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
                say('DRIFTED  %s no longer matches glossary.json -- rerun '
                    'glossary_json_to_md.py' % rel)
                status = 1
        if status == 0:
            say('OK       glossary.json is valid and its tables match (%s)' % counts)
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
