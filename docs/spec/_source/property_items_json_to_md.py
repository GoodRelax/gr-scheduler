# -*- coding: utf-8 -*-
"""property-items.json -> docs/spec/_assets/tbl-property-items.md

property-items.json is the manuscript for table T-016. EDIT THAT. This file
prints it as the document the specification carries, and
_assets/tbl-property-items.md is a generated artifact: a hand edit to it is
overwritten, and --check catches one before it can be committed.

    python property_items_json_to_md.py           rebuild the document
    python property_items_json_to_md.py --check   exit 1 if the file differs

⛔ NO DISPLAY NAME IS PRINTED HERE, AND THAT IS THE WHOLE POINT OF THE SPLIT.
FR-038 (MUST NOT) keeps every word the screen prints in one dictionary per
language; until 2026-08-28 table T-016 carried an 項目名 column that the panel
drew verbatim, which is why `strokeColor` and `fadeInDays` reached the screen
as themselves (the user's reports D-81 and D-84). The shown name is now
display-words.json's `properties` section, keyed by the same PR row id, and
what this table carries is the COLUMN -- the name in the file, which FR-006
(MUST) keeps out of the reader's way.

⭐ THE ARRAY'S ORDER IS THE SPECIFICATION. FR-006 (MUST) has the panel print
table T-016 in its own order, so re-ordering the manuscript re-orders the
panel and nothing else has to be touched.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), '_assets')
SRC = os.path.join(HERE, 'property-items.json')
OUT = os.path.join(ASSETS, 'tbl-property-items.md')

LANG = 'ja'
READ_ONLY_SUFFIX = '（読み取り専用）'
JOIN = ' / '


def say(message):
    """The same guard settings_json_to_md.py carries: the Windows console is
    cp932 and these messages quote a manuscript holding ⛔ and ⭐, so writing
    them raw raised UnicodeEncodeError from inside the problem reporter."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def prose(cell):
    """One printed cell, in this document's language."""
    return cell.get(LANG, '')


def columns_cell(item):
    """The GRS JSON column names, spelled as code the way the table always
    spelled them. ⚠️ One row may carry several -- PR-3 is start AND finish --
    which is why FR-006's paragraph speaks of the controls of one row."""
    return JOIN.join('`%s`' % name for name in item['columns'])


def kinds_cell(item):
    """The 入力の型 of each column, in the columns' own order.

    ⭐ The read-only mark rides on the kind rather than standing in a column of
    its own, which is how the hand-written table wrote it (PR-9 read
    「数値（読み取り専用）」). ⚠️ It marks the ROW: no row of the manuscript
    carries one editable column and one that is not, and FR-006 states the rule
    per item.
    """
    kinds = JOIN.join(item['inputKinds'])
    return kinds + READ_ONLY_SUFFIX if item.get('isReadOnly') else kinds


def applies_to_cell(item):
    """Which selection the row belongs to.

    ⭐ IT IS A COLUMN AND NOT A NOTE. The array's order IS the print order
    FR-006 (MUST) requires, so every row of the manuscript reaches the panel;
    without a machine-readable answer to 「whose panel」 a TaskGroup's height
    would be drawn on a Task's. ⚠️ Absent means `Task`, which is what every row
    of this table was until 2026-09-02 (CR-325).
    """
    return item.get('appliesTo', 'Task')


def build(doc):
    """The document, as it is written out."""
    out = [
        '# プロパティ項目 — 表 T-016',
        '',
        '**UID**: DOC-TBL-PROPERTY-ITEMS',
        '**Version**: 0.1',
        '',
        '> ⛔ **本書は生成物である。手で直さない —— 直しても次の `npm run gen` で消える。**',
        '> **プロパティ項目の唯一の正は `_source/property-items.json` である。**'
        ' 本書はそれを `_source/property_items_json_to_md.py` が印字したものである。',
        '> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`（検査 16 が呼ぶ）。',
        '',
        '**規則は `FR-006` が持つ。本書は全数と、各行の列・入力の型・対象・備考・交換相手の対応を印字する。**',
        '',
        '⛔ **`対象` の欄は、その行を出すのがどちらの選択のときかを言う（MUST）** ——'
        ' `FR-006` が「いま選ばれているものと同じ対象を持つ行だけを出すこと（MUST）」と定める。'
        '⚠️ **本表の並びは印刷順そのものなので、対象を持たないと `TaskGroup` の `height` が'
        '`Task` のパネルにも出る**（利用者の裁定 2026-09-02）。',
        '',
        '⛔ **画面に出す名は本表に無い（MUST NOT）** —— `FR-038` が「画面に刷る語は言語ごとの辞書 1 つに持つ」'
        'と定めるので、表示名は `_source/display-words.json` の `properties` 節が同じ行 ID で持つ。'
        '⚠️ **本表の `列` は GRS JSON の列名であって、画面に出す名ではない。**',
        '',
        '⭐⭐ **項目名を英語のまま保つのは、交換形式の列名に近い綴りを保ち、他の道具との往復で綴りが手がかりになるからである**（利用者の裁定 2026-09-03）—— **`FR-038` の「項目名を英語に保つ理由は同表が持つ」が指しているのはこの文である。**',
        '',
        '⛔ **選択の候補・数値の下限と上限・日付である列を本表へ写してはならない（MUST NOT）** ——'
        ' `_source/grs-document.schema.json` と `DATE_COLUMNS` が既に持つ。写すと正が 2 か所になる。',
        '',
        '**表 T-016 — プロパティ項目**',
        '',
        '| 行 ID | 列（`GRS JSON`）| 入力の型 | 対象 | 備考 | MSPDI |',
        '| --- | --- | --- | --- | --- | --- |',
    ]
    for item in doc['items']:
        out.append('| %s | %s | %s | `%s` | %s | %s |' % (
            item['id'],
            columns_cell(item),
            kinds_cell(item),
            applies_to_cell(item),
            prose(item['note']),
            prose(item['mspdi']),
        ))
    out.append('')
    return '\n'.join(out)


def problems(doc):
    """What would make the printed document wrong, named by row."""
    found = []
    seen = set()
    for item in doc['items']:
        rid = item['id']
        if rid in seen:
            found.append('%s appears more than once' % rid)
        seen.add(rid)
        if len(item['columns']) != len(item['inputKinds']):
            found.append('%s states %d column(s) and %d input kind(s); '
                         'one kind per column is what the table prints'
                         % (rid, len(item['columns']), len(item['inputKinds'])))
        for cell in ('note', 'mspdi'):
            if LANG not in item[cell]:
                found.append('%s has no %s cell in %s' % (rid, cell, LANG))
    return found


def main():
    doc = json.load(io.open(SRC, encoding='utf-8'))
    found = problems(doc)
    if found:
        for p in found:
            say('  %s' % p)
        say('property-items.json is not valid; nothing was written')
        return 1
    built = build(doc)
    rel = os.path.relpath(OUT, os.path.dirname(os.path.dirname(HERE)))
    rel = rel.replace('\\', '/')
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % rel)
            return 1
        current = io.open(OUT, encoding='utf-8', newline='').read()
        current = current.replace('\r\n', '\n')
        if current != built:
            say('DRIFTED  %s no longer matches property-items.json -- rerun '
                'property_items_json_to_md.py' % rel)
            return 1
        say('OK       %s matches property-items.json (%d row(s))'
            % (rel, len(doc['items'])))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(built)
    say('wrote %s  (%d row(s))' % (rel, len(doc['items'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
