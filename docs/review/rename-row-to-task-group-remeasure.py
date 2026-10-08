# -*- coding: utf-8 -*-
"""Re-measure the row -> task group and WBS parent -> parent task rename.

CR-708 carries the numbers this prints. The survey
docs/review/rename-row-to-task-group-2026-10-08.md was measured at e39177b4
and classified by reading; this script re-counts the same families at any
tree with a FIXED, mechanical classifier, so the count at the survey base and
the count today can be compared with one method (the delta is the honest
number; the absolute a/b split of a heuristic is not a reading).

Usage (from the repository root, or with a tree extracted elsewhere):
    PYTHONIOENCODING=utf-8 python docs/review/rename-row-to-task-group-remeasure.py <tree> [<tree> ...]

Each <tree> is a directory holding docs/, src/ and tests/. With two trees the
second column is the newer one and a delta column is printed.

What it counts (one line per family, per area):
  ja-row     runs of kanji/katakana holding the character for "row" in docs,
             split into: verb (excluded), b (table row, text line, word that
             only contains the character), a (task-group sense markers),
             open (a bare run: must be read; the survey read these by hand).
  en-row     identifiers whose camel/snake/kebab parts include row/rows,
             split into: a (task-group compound), b (search/field/spec-table
             compound), generic (the bare word: read by hand).
  wbs        wbsParent* / WBS_PARENT* / wbs-parent* identifiers, the saved
             column wbsParentUid, and the Japanese / English prose names.
  named      single names the CR's map lists one by one.
"""
import io
import os
import re
import sys

ROW = u'行'  # the character for "row"

AREAS = (
    ('spec 01-04', 'docs/spec', ('01-04-requirements.md',), False),
    ('spec 05-07', 'docs/spec', ('05-07-design.md',), False),
    ('spec _assets', 'docs/spec/_assets', ('.md', '.svg'), True),
    ('spec _source', 'docs/spec/_source', ('.json', '.md'), True),
    ('development-rules', 'docs/development-rules', ('.md',), True),
    ('src', 'src', ('.ts', '.tsx', '.js', '.mjs', '.css', '.html', '.json'), True),
    ('tests', 'tests', ('.ts', '.tsx', '.js', '.mjs', '.json', '.html'), True),
)

CJK_RUN = re.compile(u'[一-鿿゠-ヿー]*' + ROW +
                     u'[一-鿿゠-ヿー]*')
# the verb "to do" and "to go": the character followed by these kana
VERB_TAIL = re.compile(u'^[ういっわえおかき'
                       u'くけこ]')
# compounds that only contain the character (execute, predecessor, progress,
# line break, line number, this table row, same row, parallel ...)
B_RUNS = set(u'先行 実行 進行 進行中 '
             u'改行 行目 本行 同行 並行 '
             u'平行 発行 刊行 走行 試行 '
             u'再試行 行番号 行頭 行末 '
             u'行送り 空行 複数行 行間 '
             u'移行 遂行 現行 行列 先行'
             u'タスク 走行中 実行時 '
             u'並行性 実行ファイル '
             u'退行 施行 運行 行動 行為 '
             u'並行作業 走行回数 先行'
             u'後続'.split())
# the run followed by " ID" is a table-row id
# task-group sense markers inside a run
A_MARKERS = (u'行見出し', u'行名', u'行タイ'
             u'トル', u'行軸', u'行高',
             u'ピン止め行')
# a run that is the bare character, with a table reference right before it
TABLE_BEFORE = re.compile(u'(表 ?`?T-[0-9]+[a-z]?`?|`[A-Z]{1,4}-[0-9]+[a-z]?`|'
                          u'同表|本表|[0-9]+ ?)\\s*の?\\s*$')
# a bare run whose right side names the task-group sense
A_AFTER = re.compile(u'^(の(帯|名|木|色|操作子|'
                     u'掴み|高さ|深さ|配下)|'
                     u'を(畳|開|足|作|消|削除|'
                     u'移|隠|ピン)|に(載|重))')

IDENT = re.compile(r'[A-Za-z_$][A-Za-z0-9_$]*(?:-[A-Za-z0-9_]+)*')
PART = re.compile(r'[A-Z]+(?=[A-Z][a-z]|[0-9]|\b|_|-|$)|[A-Z]?[a-z]+|[A-Z]+|[0-9]+')
A_PARTS = set('area grab control controls expander pin pinned tree band bands '
              'zoom placement placements placed drawn undrawn folded unfolded '
              'chosen group name names gap depth leaf top child every revealed '
              'pressed held created added panel axis shown another min height '
              'boxes doomed lost imported title titles label labels picked '
              'fold folding hit stacked'.split())
B_PARTS = set('search field fields icon command delay report help spec table '
              'column columns cell cells carried profile keyed notice tooltip '
              'palette marker window modal grid template prefix prefixes '
              'invariant dictionary entry entries roster'.split())

WBS_IDENT = re.compile(r'[A-Za-z_]*(?:wbsParent|WbsParent|WBS_PARENT|wbs-parent|'
                       r'wbs_parent)[A-Za-z0-9_\-]*')
WBS_PROSE = (
    ('WBS no oya (ja)', u'WBS の親'),
    ('oyako hanbetsu IC-141 (ja)', u'親子判別'),
    ('oya teigi IC-142 (ja)', u'親定義'),
    ('WBS parent (en prose)', 'WBS parent'),
    ('Show WBS Parents / Set a WBS Parent', 'WBS Parent'),
    ('WBS no ko/shison/sosen/kyoudai/bubunki (ja)',
     re.compile(u'WBS の(子|子孫|祖先|兄弟|'
                u'部分木)')),
)

NAMED = (
    'wbsParentUid', 'parentTaskUid', 'pasteTaskSubtree', 'pasteTaskGroupSubtree',
    'rowGap', 'rowTitleFont', 'rowTitleIndent', 'rowTitleTopScale',
    'rowTitlePanelWidth', 'pinnedRowMax', 'rowGroupId', 'chosenRows',
    'readDocumentRowIds', "kind: 'row'", 'Row Title Panel', 'Row Title Tree',
    'Row Area', 'rowArea', 'rowTitlePanel', 'rowTitle', 'rowZoom', 'row-axis',
    'data-row-', 'Pinned Row', 'Row Expander', 'Row Pin',
)


def files_of(tree, rel, exts, recurse):
    base = os.path.join(tree, rel)
    if not os.path.isdir(base):
        return
    if not recurse:
        for name in exts:
            path = os.path.join(base, name)
            if os.path.isfile(path):
                yield path
        return
    for here, dirs, names in os.walk(base):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'output')]
        for name in names:
            if name.endswith(exts):
                yield os.path.join(here, name)


def ja_class(text, start, end, run):
    tail = text[end:end + 1]
    if run.endswith(ROW) and VERB_TAIL.match(tail):
        return 'verb'
    if run in B_RUNS or text[end:end + 3] == ' ID':
        return 'b'
    if any(m in run for m in A_MARKERS):
        return 'a'
    if run == ROW:
        if TABLE_BEFORE.search(text[max(0, start - 14):start]):
            return 'b'
        if A_AFTER.match(text[end:end + 4]):
            return 'a'
    if run != ROW and ROW not in (run[0], run[-1]):
        return 'b'
    return 'open'


def en_class(parts):
    low = [p.lower() for p in parts]
    if any(p in B_PARTS for p in low):
        return 'b'
    if low.index('row' if 'row' in low else 'rows') > 0 and low[0] == 'title':
        return 'b'
    if any(p in A_PARTS for p in low):
        return 'a'
    if len(low) == 1:
        return 'generic'
    return 'other'


def measure(tree):
    out = {}
    for label, rel, exts, recurse in AREAS:
        counts = {}
        def bump(key, n=1):
            counts[key] = counts.get(key, 0) + n
        for path in files_of(tree, rel, exts, recurse):
            text = io.open(path, encoding='utf-8', errors='ignore').read()
            bump('files')
            for m in CJK_RUN.finditer(text):
                bump('ja-row ' + ja_class(text, m.start(), m.end(), m.group(0)))
            for m in IDENT.finditer(text):
                token = m.group(0)
                if 'row' not in token.lower():
                    continue
                parts = PART.findall(token.replace('-', '_'))
                low = [p.lower() for p in parts]
                if 'row' not in low and 'rows' not in low:
                    continue
                bump('en-row ' + en_class(parts))
            wbs = WBS_IDENT.findall(text)
            bump('wbs ident', len(wbs))
            bump('wbs ident wbsParentUid', sum(1 for w in wbs if w == 'wbsParentUid'))
            for name, needle in WBS_PROSE:
                if isinstance(needle, str):
                    bump('wbs prose ' + name, text.count(needle))
                else:
                    bump('wbs prose ' + name, len(needle.findall(text)))
            for name in NAMED:
                bump('named ' + name, text.count(name))
        out[label] = counts
    return out


def main(trees):
    results = [measure(t) for t in trees]
    keys = sorted({k for r in results for a in r.values() for k in a})
    for label, _, _, _, in AREAS:
        print('== ' + label)
        for key in keys:
            row = [r.get(label, {}).get(key, 0) for r in results]
            if not any(row):
                continue
            line = '  %-58s ' % key + ' '.join('%7d' % v for v in row)
            if len(row) == 2:
                line += '  %+7d' % (row[1] - row[0])
            print(line)


if __name__ == '__main__':
    main(sys.argv[1:] or ['.'])
