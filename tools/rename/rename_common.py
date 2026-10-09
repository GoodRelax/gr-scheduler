# -*- coding: utf-8 -*-
"""Shared pieces of the CR-708 rename tools (row -> task group, WBS parent -> parent task).

change-request/CR-708-rename-row-to-task-group-and-wbs-parent-to-parent-task.md
section 7 describes the tools; section 2 is the only source of the name map.
This module holds what the builder (build_rename_tables.py), the applier
(apply_rename.py) and the reports share, so the three read the tree the same way:

  * which tracked files are LIVE (history and generated files are never edited),
  * which LANE (section 8, "narabekata") owns a file or a line range,
  * the Japanese classifier of the character for "row" (from
    docs/review/rename-row-to-task-group-remeasure.py, with one change: a bare
    character after a NUMBER is left to reading, because "1 row" may count
    task groups -- the CR's section 7 table says to read those one by one),
  * the identifier splitter and the section 2.5 rules that turn an old name
    into a new one,
  * a small lexer that tells comments and strings from code,
  * TSV reading and writing, and the line-ending policy (majority wins).

Every Japanese literal is written as a \\u escape so the code stays ASCII.
"""
import io
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))


def set_root(path):
    """Point every reader and writer at another copy of the tree."""
    global ROOT
    ROOT = os.path.abspath(path)
    _split_cache.clear()

MAP_TSV = 'docs/review/rename-map.tsv'
PHRASES_TSV = 'docs/review/rename-phrases-ja.tsv'
LINES_JA_TSV = 'docs/review/rename-lines-ja.tsv'
LINES_EN_TSV = 'docs/review/rename-lines-en.tsv'

ROW = '\u884c'  # the character for "row"
TASK_GROUP_JA = '\u30bf\u30b9\u30af\u30b0\u30eb\u30fc\u30d7'
TASK_JA = '\u30bf\u30b9\u30af'

# ------------------------------------------------------------------ scope

# What the rename edits. Everything else is history (X-4, X-15) or an output.
LIVE_PREFIXES = (
    'docs/spec/', 'docs/development-rules/', 'docs/guides/', 'docs/download/',
    'docs/README.md', 'src/', 'tests/', 'tools/', '.claude/skills/spec-graph-check/',
    'index.html', 'package.json', 'vite.config.ts', 'vite.relay.config.ts',
    'vitest.config.ts', 'playwright.config.ts', 'tsconfig.json', 'tsconfig.entity.json',
    '.github/',
)
# Inside the live prefixes, still not ours to edit: our own tools, outputs,
# and the StrictDoc build folder.
NOT_LIVE_PREFIXES = ('tools/rename/', 'docs/spec/output/')
TEXT_EXTENSIONS = (
    '.md', '.json', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.py', '.html', '.css',
    '.svg', '.txt', '.sh', '.yml', '.yaml', '.drawio',
)
CODE_EXTENSIONS = ('.ts', '.tsx', '.js', '.mjs', '.cjs')

GENERATED_MARKER = re.compile('GENERATED\\b|\u672c\u66f8\u306f\u751f\u6210\u7269\u3067\u3042\u308b')
MANUSCRIPT_MARKER = 'SINGLE SOURCE OF TRUTH'


def git_files():
    """Tracked files; in a plain copy of the tree (no .git), every file."""
    if os.path.exists(os.path.join(ROOT, '.git')):
        out = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True,
                             text=True, encoding='utf-8').stdout
        return [line for line in out.split('\n') if line]
    found = []
    for here, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'output')]
        for name in names:
            found.append(os.path.relpath(os.path.join(here, name), ROOT).replace(os.sep, '/'))
    return sorted(found)


def is_live(path):
    if not path.startswith(LIVE_PREFIXES):
        return False
    if path.startswith(NOT_LIVE_PREFIXES):
        return False
    return path.endswith(TEXT_EXTENSIONS)


def read_text(path):
    """The text with line endings normalized to LF, and the count of CRLF."""
    raw = io.open(os.path.join(ROOT, path), 'rb').read()
    text = raw.decode('utf-8')
    return text.replace('\r\n', '\n'), raw.count(b'\r\n')


def write_text(path, text, crlf_before):
    """Write LF text back with the line ending the file used by majority."""
    lines = text.count('\n')
    use_crlf = crlf_before * 2 > lines
    data = text.replace('\n', '\r\n') if use_crlf else text
    io.open(os.path.join(ROOT, path), 'wb').write(data.encode('utf-8'))
    return data.count('\r\n') if use_crlf else 0


def is_generated(path, text):
    """A generated file declares itself near its top; a manuscript says SSOT.

    Python files are generators or checks, never generated output.
    """
    if path.endswith('.py'):
        return False
    head = '\n'.join(text.split('\n')[:15])[:6000]
    if MANUSCRIPT_MARKER in head:
        return False
    return bool(GENERATED_MARKER.search(head))


# ------------------------------------------------------------------ lanes

# Section 8: stage 1 has four spec lanes, stage 2 one language-service run and
# three layer lanes, stage 3 lanes by test directory. 01-04 is split by line
# at a section heading (reading only -- one applier writes the file).
LANES = (
    ('S1-A', 1, '01-04-requirements.md, chapters 1-4.1 up to the split heading'),
    ('S1-B', 1, '01-04-requirements.md, from the split heading to the end'),
    ('S1-C', 1, '05-07-design.md, 08-10-test.md, A-appendix.md, _assets manuscripts, '
                'development rules'),
    ('S1-D', 1, '_source manuscripts and generators, display words, notice reasons, guides, '
                'download page, tools/generate_*.py (names and Japanese)'),
    ('S1-T', 1, 'Japanese quotations of the spec inside tests (same commit as stage 1)'),
    ('S2-LS', 2, 'one language-service run over src + tests (rename_symbols.mjs)'),
    ('S2-ENT', 2, 'src/entity'),
    ('S2-UA', 2, 'src/use-case, src/adapter'),
    ('S2-FW', 2, 'src/framework, root configs, index.html'),
    ('S2-TL', 2, 'tools (with the English prose of tools/generate_*.py), '
                 '.claude/skills/spec-graph-check (not the baselines)'),
    ('S3-UNIT', 3, 'tests/unit'),
    ('S3-CON', 3, 'tests/contract'),
    ('S3-SYS', 3, 'tests/system, usecase, integration, nfr, fixtures, known-red.txt'),
    ('S3-BASE', 3, 'baseline files of .claude/skills/spec-graph-check (coordinator, JDG-520)'),
)
LANE_STAGE = dict((lane, stage) for lane, stage, _ in LANES)

_split_cache = {}


def lane_split_line():
    """The 1-based line of 01-04 where lane S1-B starts."""
    if 'line' not in _split_cache:
        text, _ = read_text('docs/spec/01-04-requirements.md')
        target = SPLIT_HEADING_EXACT
        found = None
        for number, line in enumerate(text.split('\n'), 1):
            if line.startswith(target):
                found = number
                break
        if found is None:
            raise SystemExit('split heading of 01-04 not found: ' + target)
        _split_cache['line'] = found
    return _split_cache['line']


# The heading chosen by build_rename_tables.py --suggest-split (balances the
# undecided lines of the two halves). Fixed here so every run splits the same.
# "#### diagnosis list and report" (line 3724 at d4a165a1): next to the
# balance point --suggest-split found (3808, a heading the rename rewrites).
SPLIT_HEADING_EXACT = '#### \u8a3a\u65ad\u306e\u4e00\u89a7\u3068\u30ec\u30dd\u30fc\u30c8'


def lane_of(path, line=0, japanese_in_test=False, english_prose=False):
    """The lane that owns this path (and line, for 01-04).

    Two moves balance stage 1 (measured at d4a165a1, see
    docs/review/rename-lanes-cr708.md): the development rules are read with
    05-07 (S1-C), and the English prose of tools/generate_*.py -- comments
    about spec table rows, nearly all of it -- is read in stage 2 (S2-TL);
    the generators' names and Japanese stay in stage 1, because stage 1 runs
    them. tools/ and the checks are outside the three layers of src/, so
    stage 2 reads them in a fourth lane (S2-TL).
    """
    if path == 'docs/spec/01-04-requirements.md':
        return 'S1-A' if line < lane_split_line() else 'S1-B'
    if path.startswith('docs/development-rules/'):
        return 'S1-C'
    if path.startswith('docs/spec/_source/') or path.startswith(
            ('docs/guides/', 'docs/download/', 'docs/README.md')):
        return 'S1-D'
    if path.startswith('tools/generate_'):
        return 'S2-TL' if english_prose else 'S1-D'
    if path.startswith('docs/spec/'):
        return 'S1-C'
    if path.startswith('tests/'):
        if japanese_in_test:
            return 'S1-T'
        if path.startswith('tests/unit/'):
            return 'S3-UNIT'
        if path.startswith('tests/contract/'):
            return 'S3-CON'
        return 'S3-SYS'
    if path.startswith('.claude/skills/spec-graph-check/') and path.endswith('-baseline.txt'):
        return 'S3-BASE'
    if path.startswith(('tools/', '.claude/')):
        return 'S2-TL'
    if path.startswith('src/entity/'):
        return 'S2-ENT'
    if path.startswith(('src/use-case/', 'src/adapter/')):
        return 'S2-UA'
    return 'S2-FW'


# ------------------------------------------------------------------ Japanese

# kanji and katakana, but not the middle dot (U+30FB), which joins a list
CJK_RUN = re.compile('[\u4e00-\u9fff\u30a1-\u30fa\u30fc]*\u884c[\u4e00-\u9fff\u30a1-\u30fa\u30fc]*')
KANJI = re.compile('[\u4e00-\u9fff]')
# The verbs written with the character: "to do" (u, i, tsu, wa, e, o) and
# "to go" (ka + nai / se / re / zu / ne, ki + masu or a kanji that makes
# "destination" and the like, ku, ke, ko). A bare "ka" ("rows or ..."),
# "kara" ("from the row") and "ki" before anything else are NOT verbs
# (reconcile item 1).
VERB_TAIL = re.compile(
    '^(?:[\u3046\u3044\u3063\u308f\u3048\u304a\u304f\u3051\u3053]'
    '|\u304b(?:\u306a[\u3044\u304b\u304f\u3051]|\u305b|\u308c|\u305a|\u306d)'
    '|\u304d(?:\u307e|[\u5148\u6765\u6b62\u6e21\u5c4a\u904e\u7740]))')
B_RUNS = frozenset([
    '\u4e26\u884c', '\u4e26\u884c\u4f5c\u696d', '\u4e26\u884c\u6027', '\u5148\u884c',
    '\u5148\u884c\u30bf\u30b9\u30af', '\u5148\u884c\u5f8c\u7d9a', '\u518d\u8a66\u884c',
    '\u520a\u884c', '\u540c\u884c', '\u5b9f\u884c', '\u5b9f\u884c\u30d5\u30a1\u30a4\u30eb',
    '\u5b9f\u884c\u6642', '\u5e73\u884c', '\u6539\u884c', '\u65bd\u884c', '\u672c\u884c',
    '\u73fe\u884c', '\u767a\u884c', '\u79fb\u884c', '\u7a7a\u884c', '\u884c\u5217',
    '\u884c\u52d5', '\u884c\u672b', '\u884c\u70ba', '\u884c\u756a\u53f7', '\u884c\u76ee',
    '\u884c\u9001\u308a', '\u884c\u9593', '\u884c\u982d', '\u8907\u6570\u884c',
    '\u8a66\u884c', '\u8d70\u884c', '\u8d70\u884c\u4e2d', '\u8d70\u884c\u56de\u6570',
    '\u9000\u884c', '\u9032\u884c', '\u9032\u884c\u4e2d', '\u9042\u884c', '\u904b\u884c',
])
# a bare character right after a table or a row id: the row of a spec table.
# The id must carry a prefix of docs/spec/_source/row-id-prefixes.json: a
# requirement id (`FR-016` ...) names no table row (reconcile item 2).
TABLE_BEFORE = re.compile(
    '(\u8868 ?`?T-[0-9]+[a-z]?`?|`(?P<prefix>[A-Z]{1,4})-[0-9]+[a-z]?`|\u540c\u8868|\u672c\u8868)'
    '\\s*\u306e?\\s*$')
ROW_ID_PREFIXES_JSON = 'docs/spec/_source/row-id-prefixes.json'


def row_id_prefixes():
    if 'prefixes' not in _split_cache:
        import json
        with io.open(os.path.join(ROOT, ROW_ID_PREFIXES_JSON), encoding='utf-8') as f:
            _split_cache['prefixes'] = frozenset(p['prefix'] for p in json.load(f)['prefixes'])
    return _split_cache['prefixes']


def names_table_row(match):
    """A TABLE_BEFORE / EN_TABLE_BEFORE match names a table row (not a requirement)."""
    prefix = match.groupdict().get('prefix')
    return prefix is None or prefix in row_id_prefixes()
# a bare character right after a number: may count task groups -- read it
NUMBER_BEFORE = re.compile('[0-9]+ ?$')
# words near an occurrence that suggest a spec table, a text line or a file
TABLE_GUARD = re.compile(
    '\u8868|T-[0-9]|`[A-Z]{1,4}-[0-9]|\u6b04|\u5217|\u30d5\u30a1\u30a4\u30eb|'
    '\u30b3\u30fc\u30c9|\u53f0\u5e33|\u57fa\u6e96\u5024|\u30ed\u30b0|\u6587\u5b57|'
    '\u30c6\u30ad\u30b9\u30c8|CSV|TSV|JSON|README|TSV|diff|grep')
# the right side that names the task-group sense (a suggestion, never a decision)
A_AFTER = re.compile(
    '^(\u306e(\u5e2f|\u540d|\u6728|\u8272|\u64cd\u4f5c\u5b50|\u63b4\u307f|\u9ad8\u3055|'
    '\u6df1\u3055|\u914d\u4e0b)|\u3092(\u7573|\u958b|\u8db3|\u4f5c|\u6d88|\u524a\u9664|'
    '\u79fb|\u96a0|\u30d4\u30f3)|\u306b(\u8f09|\u91cd))')
ID_AFTER = ' ID'


def classify_ja(text, start, end, run):
    """verb / compound / table / open for one run holding the character.

    verb      the verb "to do" -- never listed
    compound  a word that only contains the character -- never listed
    table     a bare character after a table or row id, or before " ID" --
              listed with the machine decision keep
    open      everything else -- the phrase table or a reader decides
    """
    tail = text[end:end + 3]
    if run.endswith(ROW) and VERB_TAIL.match(tail):
        return 'verb'
    if run in B_RUNS:
        return 'compound'
    if run != ROW and ROW not in (run[0], run[-1]):
        return 'compound'
    if text[end:end + 3] == ID_AFTER and run.endswith(ROW):
        return 'table'
    if run == ROW:
        line_start = text.rfind('\n', 0, start) + 1
        before = text[max(line_start, start - 14):start]
        m = TABLE_BEFORE.search(before)
        if m and names_table_row(m):
            return 'table'
    return 'open'


def suggest_ja(text, start, end, run):
    """A hint for the reader. Never a decision."""
    line_start = text.rfind('\n', 0, start) + 1
    before = text[max(line_start, start - 16):start]
    if run == ROW and NUMBER_BEFORE.search(before):
        return 'count?'
    if TABLE_GUARD.search(before):
        return 'keep?'
    if run == ROW and A_AFTER.match(text[end:end + 4]):
        return 'task-group?'
    return ''


# Decision words of the reading tables. ASCII tokens are canonical; the
# Japanese words section 7 of the CR uses are accepted as synonyms.
DECISIONS = {
    'task-group': 'task-group', 'task': 'task', 'keep': 'keep', 'rewrite': 'rewrite',
    TASK_GROUP_JA: 'task-group',
    TASK_JA: 'task',
    '\u6b8b\u3059': 'keep',
    '\u66f8\u304d\u63db\u3048': 'rewrite',
}
ENGLISH_DECISIONS = {
    'task-group': 'task group', 'task': 'task',
}


# ------------------------------------------------------------------ phrases

def load_phrases():
    """Rows of rename-phrases-ja.tsv, longest old phrase first."""
    rows = read_tsv(PHRASES_TSV)
    usable = [r for r in rows if r['old'] and r['new'] is not None and r['status'] != 'off']
    usable.sort(key=lambda r: (-len(r['old']), r['old']))
    return usable


def phrase_scope_ok(row, path):
    scope = row.get('scope', '') or 'all'
    if scope == 'all':
        return True
    return any(path.startswith(p.strip()) for p in scope.split(',') if p.strip())


def phrase_at(text, start, phrases, path, use_guard=True):
    """The phrase covering the character at `start`, as (row, span_start, span_end).

    A phrase must not start or end inside a longer kanji word, and must not
    sit right after a table-like word on the same line (TABLE_GUARD) unless
    the phrase row says guard=off, or the caller (a mirror of a decided spec
    place) passes use_guard=False.
    """
    for row in phrases:
        if not phrase_scope_ok(row, path):
            continue
        old = row['old']
        k = old.find(ROW)
        while k >= 0:
            s = start - k
            if s >= 0 and text.startswith(old, s):
                e = s + len(old)
                if KANJI.match(old[0]) and s > 0 and KANJI.match(text[s - 1]):
                    pass
                elif KANJI.match(old[-1]) and e < len(text) and KANJI.match(text[e]):
                    pass
                elif old.endswith(ROW) and VERB_TAIL.match(text[e:e + 3]):
                    pass
                else:
                    line_start = text.rfind('\n', 0, s) + 1
                    before = text[max(line_start, s - 16):s]
                    if use_guard and row.get('guard', 'on') != 'off' and TABLE_GUARD.search(before):
                        pass
                    else:
                        return row, s, e
            k = old.find(ROW, k + 1)
    return None


def phrase_hits(text, phrases, path):
    """Every phrase occurrence in the text that does NOT contain the row char.

    The WBS-parent family has no row character, so it is found by plain search
    with the same boundary and guard rules.
    """
    hits = []
    taken = []
    for row in phrases:
        old = row['old']
        if ROW in old or not phrase_scope_ok(row, path):
            continue
        start = 0
        while True:
            s = text.find(old, start)
            if s < 0:
                break
            e = s + len(old)
            start = e
            if any(s < te and ts < e for ts, te in taken):
                continue
            if KANJI.match(old[0]) and s > 0 and KANJI.match(text[s - 1]):
                continue
            if KANJI.match(old[-1]) and e < len(text) and KANJI.match(text[e]):
                continue
            after = row.get('not_before', '')
            if after and text.startswith(after, e):
                continue
            taken.append((s, e))
            hits.append((row, s, e))
    return hits


# ------------------------------------------------------------------ identifiers

IDENT = re.compile(r'[A-Za-z_$][A-Za-z0-9_$]*(?:-[A-Za-z0-9_]+)*')
PART = re.compile(r'[A-Z]+(?=[A-Z][a-z]|[0-9]|\b|_|-|$)|[A-Z]?[a-z]+|[A-Z]+|[0-9]+')
WBS_IDENT = re.compile(r'[A-Za-z_]*(?:wbsParent|WbsParent|WBS_PARENT|wbs-parent|'
                       r'wbs_parent)[A-Za-z0-9_\-]*')

A_PARTS = frozenset('area grab control controls expander pin pinned tree band bands '
                    'zoom placement placements placed drawn undrawn folded unfolded '
                    'chosen group groups name names gap depth leaf top child children every '
                    'revealed pressed held created added panel axis shown another min '
                    'height heights boxes doomed lost imported title titles label labels '
                    'picked fold folding hit stacked scroll expand collapse'.split())
B_PARTS = frozenset('search field fields icon icons command commands delay report help '
                    'spec table tables column columns cell cells carried profile keyed '
                    'notice notices tooltip palette marker window modal grid template '
                    'prefix prefixes invariant dictionary entry entries roster press '
                    'csv tsv text line lines'.split())
# section 4: names that are never the task group, whatever their parts say
B_NAMES = frozenset([
    'rowId', 'rowIds', 'row-id', 'row-ids', 'ROW_ID', 'ROW_IDS', 'RowId', 'rowIdOf',
    'rowPath', 'rowsOf', 'grid-row', 'grid-template-rows', 'row-gap', 'row-reverse',
    'readSearchRows', 'SearchRows', 'TaskSearchRow', 'fieldRow', 'data-field-row',
    'commandRow', 'IconRosterRow', 'data-row', 'DelayReportRow', 'MARK_COLOUR_ROWS',
    'isScheduleColourRow', 'windowTitleRowElement', 'PressRow', 'check-press-row-ids',
    'row-id-prefixes', 'tbl-row-id-prefixes', 'row_id_prefixes_json_to_md',
])
GENERIC_WORDS = frozenset(['row', 'rows', 'Row', 'Rows', 'ROW', 'ROWS'])


def split_parts(token):
    return PART.findall(token.replace('-', '_'))


def has_row_part(token):
    low = [p.lower() for p in split_parts(token)]
    if 'row' in low or 'rows' in low:
        return True
    return any(p == 'wbs' and low[i + 1:i + 2] in (['parent'], ['parents'])
               for i, p in enumerate(low))



# Section 2.5, in order: (rule number, old part sequence, new part sequence).
RULES = (
    (0, ('paste', 'task', 'subtree'), ('paste', 'tasks')),  # JDG-1727, CM-8
    (1, ('wbs', 'parents'), ('parent', 'tasks')),
    (1, ('wbs', 'parent'), ('parent', 'task')),
    (2, ('row', 'title', 'panel'), ('task', 'group', 'panel')),
    (3, ('row', 'title', 'width', 'field'), ('task', 'group', 'panel', 'width', 'field')),
    (4, ('row', 'titles'), ('task', 'group', 'titles')),
    (4, ('row', 'title'), ('task', 'group', 'title')),
    (5, ('row', 'names'), ('task', 'group', 'names')),
    (5, ('row', 'name'), ('task', 'group', 'name')),
    (6, ('row', 'area'), ('task', 'group', 'area')),
    (7, ('rows', 'zoom'), ('vertical', 'zoom')),
    (7, ('row', 'zoom'), ('vertical', 'zoom')),
    (7, ('row', 'axis'), ('vertical', 'axis')),
    (7, ('zoom', 'rows'), ('zoom', 'vertical')),
    (7, ('zoom', 'row'), ('zoom', 'vertical')),
    (8, ('row', 'groups'), ('task', 'groups')),
    (8, ('row', 'group'), ('task', 'group')),
    (8, ('rows',), ('task', 'groups')),
    (8, ('row',), ('task', 'group')),
)



def part_spans(token):
    """The parts of a name with their (start, end) in the name itself."""
    return [(m.start(), m.end(), m.group(0)) for m in PART.finditer(token.replace('-', '_'))]


def render(parts, sample, sep):
    """New parts written the way the replaced text was: ROW_X, RowX, rowX, row-x."""
    if sample.isupper() and len(sample) > 1 or (sample.isupper() and sep == '_'):
        return (sep or '_').join(p.upper() for p in parts)
    if sep:
        out = sep.join(parts)
        return out[:1].upper() + out[1:] if sample[:1].isupper() else out
    out = ''.join(p[:1].upper() + p[1:] for p in parts)
    return out if sample[:1].isupper() else out[:1].lower() + out[1:]


def rename_parts(token):
    """(new token, first rule used) by section 2.5, or (token, None).

    Only the matched parts are rewritten; every other character of the name
    (digits, separators, the parts no rule names) stays as it was --
    `w3-t1-the-wbs-parent` becomes `w3-t1-the-parent-task`.
    """
    spans = part_spans(token)
    low = [s[2].lower() for s in spans]
    pieces = []
    used = []
    pos = 0
    i = 0
    while i < len(low):
        for number, old, new in RULES:
            if tuple(low[i:i + len(old)]) == old:
                s = spans[i][0]
                e = spans[i + len(old) - 1][1]
                between = token[spans[i][1]:spans[i + 1][0]] if len(old) > 1 else ''
                if len(old) == 1:
                    between = '-' if '-' in token else ('_' if '_' in token.strip('_$') else '')
                sep = '-' if '-' in between else ('_' if '_' in between else '')
                pieces.append(token[pos:s])
                pieces.append(render(new, spans[i][2], sep))
                pos = e
                used.append(number)
                i += len(old)
                break
        else:
            i += 1
    if not used:
        return token, None
    pieces.append(token[pos:])
    return ''.join(pieces), min(used)


def classify_identifier(token):
    """(class, reason) for a compound name: a / b / ? (undecided)."""
    if token in B_NAMES:
        return 'b', 'section 4 list'
    if WBS_IDENT.fullmatch(token) or token.lower().replace('-', '').replace('_', '').find(
            'pastetasksubtree') >= 0:
        return 'a', 'rule 1 / JDG-1727'
    parts = [p.lower() for p in split_parts(token)]
    for i, p in enumerate(parts):
        # rule 1 wins over every b part (a test file named after the palette
        # of WBS parents is still about WBS parents)
        if p == 'wbs' and i + 1 < len(parts) and parts[i + 1] in ('parent', 'parents'):
            return 'a', 'rule 1'
    for i, p in enumerate(parts):
        if p in ('row', 'rows') and i + 1 < len(parts) and parts[i + 1] in ('id', 'ids'):
            return 'b', 'row id (section 4)'
    # the named rules 2-7 of section 2.5 win over a b part
    # (rowTitleWidthField is rule 3 although it holds "field")
    _, rule = rename_parts(token)
    if rule is not None and rule < 8:
        return 'a', 'rule %d' % rule
    hit_b = [p for p in parts if p in B_PARTS]
    if hit_b:
        return 'b', 'b part: ' + hit_b[0]
    idx = parts.index('row') if 'row' in parts else parts.index('rows')
    if idx > 0 and parts[0] == 'title':
        return 'b', 'title row (window title)'
    hit_a = [p for p in parts if p in A_PARTS]
    if hit_a:
        return 'a', 'a part: ' + hit_a[0]
    return '?', ''


# ------------------------------------------------------------------ English prose

EN_WORD = re.compile(r'(?<![A-Za-z0-9_$\-])(rows|row|Rows|Row|ROWS|ROW)(?![A-Za-z0-9_$])(?!-[A-Za-z])')
EN_TABLE_GUARD = re.compile(r'(table|T-[0-9]+[a-z]?|`?[A-Z]{1,4}-[0-9]+`?|spec|column|search|field|'
                            r'palette|icon|help|report|CSV|TSV|text|line|grid|header|'
                            r'roster|dictionary|inventory|ledger|baseline)\W*\w*\W*$', re.I)
EN_KEEP_AFTER = re.compile(r'^[ -]?(id|ids|ID|IDs)\b')
# "table T-024 row", "table ${table} has no row", "the `IV-` rows": a spec
# table row, decided by machine. At most two plain words may stand between;
# a dash, a comma or a sentence end breaks the link ("table T-329 -- an
# expanded row" is a task group).
EN_TABLE_BEFORE = re.compile(r'(\btable\b|\bT-[0-9]+[a-z]?\b|`(?P<prefix>[A-Z]{1,4})-[0-9]*`)\s*'
                             r'(\$\{[^}]*\}\s*)?([A-Za-z\']+\s+){0,2}$')
EN_TABLE_AFTER = re.compile(r'^\s+(of|in)\s+(the\s+)?(table\b|T-[0-9])')


def suggest_en(text, start, end):
    """(machine decision, suggestion) for one bare English word."""
    line_start = text.rfind('\n', 0, start) + 1
    before = text[max(line_start, start - 40):start]
    if EN_KEEP_AFTER.match(text[end:end + 5]):
        return 'keep', 'row id'
    table_before = EN_TABLE_BEFORE.search(before)
    if table_before and names_table_row(table_before) or EN_TABLE_AFTER.match(text[end:end + 16]):
        return 'keep', 'table row'
    if EN_TABLE_GUARD.search(before[-24:]):
        return '', 'keep?'
    return '', ''


# ------------------------------------------------------------------ code lexer

# Real tokens (reconcile item 14): JS / TS through @babel/parser
# (lex_spans.mjs, one node run for every file at once), Python through the
# standard tokenize module. light_code_segments stays as the fallback for a
# file neither can read, and every fallback is counted in LEX_FALLBACKS.
_lex_cache = {}
LEX_FALLBACKS = []


def prime_lexer(paths):
    """Lex every JS / TS file of `paths` in one node run and keep the spans."""
    todo = [p for p in paths if os.path.splitext(p)[1] in CODE_EXTENSIONS
            and (ROOT, p) not in _lex_cache]
    if not todo:
        return
    import json
    script = os.path.join(HERE, 'lex_spans.mjs')
    out = subprocess.run(['node', script, ROOT], input=json.dumps(todo), capture_output=True,
                         text=True, encoding='utf-8')
    if out.returncode != 0:
        raise SystemExit('lex_spans.mjs failed: ' + out.stderr[-2000:])
    for path, spans in json.loads(out.stdout).items():
        _lex_cache[(ROOT, path)] = None if spans is None else [tuple(s) for s in spans]


def syntax_errors(texts):
    """{path: text} -> {path: count of syntax errors} (-1: the parser gave up).

    JS / TS / JSON through lex_spans.mjs --syntax (one node run), Python
    through the ast module. An edit that turns a parsing file into a broken
    one is a problem of the applier (reconcile: a rewrite put an apostrophe
    into a single-quoted string).
    """
    import ast
    import json
    out = {}
    node_texts = {}
    for path, text in texts.items():
        ext = os.path.splitext(path)[1]
        if ext == '.py':
            try:
                ast.parse(text)
                out[path] = 0
            except SyntaxError:
                out[path] = -1
        elif ext in CODE_EXTENSIONS + ('.json',):
            node_texts[path] = text
    if node_texts:
        script = os.path.join(HERE, 'lex_spans.mjs')
        done = subprocess.run(['node', script, ROOT, '--syntax'], input=json.dumps(node_texts),
                              capture_output=True, text=True, encoding='utf-8')
        if done.returncode != 0:
            raise SystemExit('lex_spans.mjs --syntax failed: ' + done.stderr[-2000:])
        out.update(json.loads(done.stdout))
    return out


def python_segments(text):
    """Comment and string spans of Python source from the tokenize module, or None."""
    import tokenize
    starts = [0]
    for line in text.split('\n'):
        starts.append(starts[-1] + len(line) + 1)
    spans = []
    fstring_at = []
    names = ('FSTRING_START', 'FSTRING_END', 'TSTRING_START', 'TSTRING_END')
    kinds = dict((getattr(tokenize, n), n) for n in names if hasattr(tokenize, n))
    try:
        for tok in tokenize.generate_tokens(io.StringIO(text).readline):
            s = starts[tok.start[0] - 1] + tok.start[1]
            e = starts[tok.end[0] - 1] + tok.end[1]
            kind = kinds.get(tok.type, '')
            if tok.type == tokenize.COMMENT:
                spans.append((s, e, 'comment'))
            elif tok.type == tokenize.STRING:
                spans.append((s, e, 'string'))
            elif kind.endswith('_START'):
                fstring_at.append(s)
            elif kind.endswith('_END') and fstring_at:
                spans.append((fstring_at.pop(), e, 'string'))
    except (tokenize.TokenError, SyntaxError, IndentationError):
        return None
    return sorted(spans)


def code_segments(text, ext, path=None):
    """Spans (start, end, kind) of comments and string literals; kind is 'comment' or 'string'."""
    if ext == '.py':
        spans = python_segments(text)
        if spans is not None:
            return spans
    elif path is not None:
        if (ROOT, path) not in _lex_cache:
            prime_lexer([path])
        spans = _lex_cache.get((ROOT, path))
        if spans is not None:
            return spans
    LEX_FALLBACKS.append(path or '?')
    return light_code_segments(text, ext)


def light_code_segments(text, ext):
    """Spans of comments and string literals in JS/TS or Python source.

    Returns a list of (start, end, kind) where kind is 'comment' or 'string'.
    A light lexer: good for this tree, not a parser. Regex literals are taken
    as code (they are rare and hold no prose). A backtick inside a comment
    derails it, so it is only the fallback of code_segments.
    """
    spans = []
    i = 0
    n = len(text)
    python = ext == '.py'
    while i < n:
        c = text[i]
        if python and c == '#':
            j = text.find('\n', i)
            j = n if j < 0 else j
            spans.append((i, j, 'comment'))
            i = j
            continue
        if not python and text.startswith('//', i):
            j = text.find('\n', i)
            j = n if j < 0 else j
            spans.append((i, j, 'comment'))
            i = j
            continue
        if not python and text.startswith('/*', i):
            j = text.find('*/', i + 2)
            j = n if j < 0 else j + 2
            spans.append((i, j, 'comment'))
            i = j
            continue
        if python and (text.startswith('"""', i) or text.startswith("'''", i)):
            q = text[i:i + 3]
            j = text.find(q, i + 3)
            j = n if j < 0 else j + 3
            spans.append((i, j, 'string'))
            i = j
            continue
        if c in '"\'' or (c == '`' and not python):
            # a template literal yields its text parts only: ${...} is code
            j = i + 1
            part = i
            while j < n and text[j] != c:
                if text[j] == '\\':
                    j += 2
                    continue
                if c != '`' and text[j] == '\n':
                    break
                if c == '`' and text.startswith('${', j):
                    spans.append((part, j, 'string'))
                    depth = 1
                    j += 2
                    while j < n and depth:
                        if text[j] == '{':
                            depth += 1
                        elif text[j] == '}':
                            depth -= 1
                        j += 1
                    part = j
                    continue
                j += 1
            spans.append((part, min(j + 1, n), 'string'))
            i = j + 1
            continue
        i += 1
    return spans


def prose_spans(path, text):
    """Where English prose can live in this file: (start, end) spans."""
    ext = os.path.splitext(path)[1]
    if ext in CODE_EXTENSIONS or ext == '.py':
        return [(s, e) for s, e, _ in code_segments(text, ext, path)]
    if ext == '.json':
        spans = []
        for m in re.finditer(r'"(?:[^"\\\n]|\\.)*"(\s*:)?', text):
            if not m.group(1):
                spans.append((m.start(), m.end()))
        return spans
    if ext == '.md':
        spans = []
        pos = 0
        for m in re.finditer(r'```.*?```|`[^`\n]*`', text, re.S):
            spans.append((pos, m.start()))
            pos = m.end()
        spans.append((pos, len(text)))
        return spans
    return [(0, len(text))]


# ------------------------------------------------------------------ TSV

def read_tsv(path):
    full = os.path.join(ROOT, path)
    if not os.path.isfile(full):
        return []
    text = io.open(full, encoding='utf-8').read().replace('\r\n', '\n')
    lines = [line for line in text.split('\n') if line]
    if not lines:
        return []
    head = lines[0].split('\t')
    rows = []
    for line in lines[1:]:
        cells = line.replace(MASK, '').split('\t')
        cells += [''] * (len(head) - len(cells))
        rows.append(dict(zip(head, cells)))
    return rows


# The tables quote the tree, and the tree's checks quote the retired id
# spellings they forbid (checks 51, 52, 63: a letter D or R, PD, SM, EV or TN,
# a hyphen, a number). A
# table that quoted them back would turn those checks red once tracked, so a
# cell is written with a WORD JOINER (U+2060, invisible) after the hyphen of
# such a spelling, and read_tsv takes it out again: every reader of the tables
# sees the tree's own text.
MASK = '\u2060'
RETIRED_SPELLING = re.compile(r'((?<![A-Za-z0-9_-])(?:[DdRr]|SM|EV|TN)-|[Pp][Dd]-)(?=[0-9])')


def clean_cell(value):
    cell = str(value).replace('\t', ' ').replace('\r', ' ').replace('\n', ' ')
    return RETIRED_SPELLING.sub(lambda m: m.group(1) + MASK, cell)


def write_tsv(path, head, rows):
    out = ['\t'.join(head)]
    for row in rows:
        out.append('\t'.join(clean_cell(row.get(h, '')) for h in head))
    io.open(os.path.join(ROOT, path), 'w', encoding='utf-8', newline='\n').write(
        '\n'.join(out) + '\n')


def context_of(text, start, end, width=20):
    line_start = text.rfind('\n', 0, start) + 1
    line_end = text.find('\n', end)
    line_end = len(text) if line_end < 0 else line_end
    left = text[max(line_start, start - width):start]
    right = text[end:min(line_end, end + width)]
    return left, right


def line_col(text, offset):
    line = text.count('\n', 0, offset) + 1
    col = offset - (text.rfind('\n', 0, offset) + 1)
    return line, col


# ------------------------------------------------------------------ lane decisions

# Each reading lane writes its decisions into its OWN file, so bodies working
# in parallel never edit the same file:
#   docs/review/rename-decisions/<lane>-lines.tsv  path line col text decision
#                                                  rewrite_old rewrite_new note
#   docs/review/rename-decisions/<lane>-map.tsv    old new class note
#   docs/review/rename-decisions/<lane>-types.tsv  path line col nth name decision note
# A row is matched on its place (path, line, col, text), never on its id: ids
# are renumbered when the tables are rebuilt, places are not. A types row is
# matched on (path, line, name, nth) -- nth counts the same word earlier on
# the line -- because an earlier stage may shift its column.
DECISIONS_DIR = 'docs/review/rename-decisions'


def decision_files(suffix):
    folder = os.path.join(ROOT, DECISIONS_DIR)
    if not os.path.isdir(folder):
        return []
    return sorted(DECISIONS_DIR + '/' + n for n in os.listdir(folder)
                  if n.endswith('-' + suffix + '.tsv'))


def overlay_lines(rows):
    """Lay the lanes' line decisions over rows; return the conflicts found."""
    at = dict(((r['path'], r['line'], r['col'], r['text']), r) for r in rows)
    seen = {}
    problems = []
    for name in decision_files('lines'):
        lane = os.path.basename(name)[:-len('-lines.tsv')]
        for d in read_tsv(name):
            key = (d['path'], d['line'], d['col'], d['text'])
            row = at.get(key)
            if row is None:
                problems.append('%s: no such place %s:%s %s' % (name, d['path'], d['line'], d['text']))
                continue
            if key in seen and seen[key] != d['decision']:
                problems.append('%s: decided twice %s:%s' % (name, d['path'], d['line']))
            seen[key] = d['decision']
            row['decision'] = DECISIONS.get(d['decision'], d['decision'])
            row['rewrite_old'] = d.get('rewrite_old', '')
            row['rewrite_new'] = d.get('rewrite_new', '')
            row['decided_by'] = 'reader:' + lane
            row['note'] = d.get('note', '')
    return problems


def overlay_map(rows):
    by_old = dict((r['old'], r) for r in rows)
    problems = []
    for name in decision_files('map'):
        lane = os.path.basename(name)[:-len('-map.tsv')]
        for d in read_tsv(name):
            row = by_old.get(d['old'])
            if row is None:
                problems.append('%s: no such name %s' % (name, d['old']))
                continue
            row['new'] = d['new'] or row['new']
            row['class'] = d['class']
            row['collision'] = ''
            row['decided-by'] = 'reader:' + lane
            row['note'] = d.get('note', '')
    return problems
