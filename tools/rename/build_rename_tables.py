# -*- coding: utf-8 -*-
"""Build the CR-708 rename tables from the tree (section 7, steps 1-3).

    PYTHONIOENCODING=utf-8 python tools/rename/build_rename_tables.py          # write the tables
    PYTHONIOENCODING=utf-8 python tools/rename/build_rename_tables.py --report # counts per lane only
    PYTHONIOENCODING=utf-8 python tools/rename/build_rename_tables.py --suggest-split

Writes, under docs/review/:
  rename-map.tsv         one row per NAME (identifier, file stem, DOM name,
                         JSON key, API name, English screen word, WL-n row id)
  rename-lines-ja.tsv    one row per PLACE of the character for "row" (and of
                         the WBS-parent family) in a live, hand-edited file
  rename-lines-en.tsv    one row per PLACE of the bare English word row / rows
                         in prose, comments and strings
and refreshes the `hits` column of rename-phrases-ja.tsv (the phrase table is
written by hand; this only counts it).

STOP: A rebuild KEEPS every decision a reader wrote: rows are matched on
(path, line, col, text) and on the left/right context, and a decided row
whose place is gone is reported, never silently dropped.

Undecided means: `decision` is empty (lines tables) or `class` is `?`
(map). apply_rename.py refuses to write while any undecided row remains in
the lanes it is asked to apply.
"""
import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rename_common as rc  # noqa: E402

LINES_HEAD = ['id', 'lane', 'path', 'line', 'col', 'family', 'text', 'left', 'right',
              'machine', 'suggest', 'decision', 'rewrite_old', 'rewrite_new',
              'decided_by', 'note']
MAP_HEAD = ['old', 'new', 'kind', 'class', 'rule', 'files', 'count', 'decided-by',
            'lanes', 'home_lane', 'generated_count', 'collision', 'note']

OYAKO = re.compile('\u89aa\u5b50|\u5b50\u304b\u3089\u89aa')

# Section 2.4 and 2.7: the published names, set by rulings, not by the rules.
API_NAMES = {
    'wbsParentUid': ('parentTaskUid', 'JDG-1666'),
    'wbsParentLink': ('parentTaskLink', 'CR-708 2.4'),
    'setTaskWbsParent': ('setTaskParentTask', 'JDG-1728'),
    'pasteTaskSubtree': ('pasteTasks', 'JDG-1727'),
    'setRowTitlePanelWidth': ('setTaskGroupPanelWidth', 'CR-708 X-18'),
    'setRowTitlePanelWidthFixed': ('setTaskGroupPanelWidthFixed', 'CR-708 X-18'),
}
# names section 2 says stay, whatever the rules would make of them
KEEP_NAMES = {
    'pasteTaskGroupSubtree': 'JDG-1727 (CM-28 keeps its name)',
    'readSearchRows': 'CR-708 2.4 (search table row)',
    'scrollGroupId': 'CR-708 2.2', 'scrollGroupOffset': 'CR-708 2.2',
    'importMaxDepth': 'CR-708 2.2', 'parentProgressToleranceDays': 'CR-708 2.2',
    'wbsOrder': 'JDG-1729',
}
# English screen words and prose names (section 2.1, 2.6). Longest first.
SPEC_WORDS = (
    ('Show WBS Parents', 'Show Parent Tasks', 'JDG-1667'),
    ('Set a WBS Parent', 'Set Parent Task', 'JDG-1667'),
    ('Row Title Panel', 'Task Group Panel', 'JDG-1659'),
    ('row title panel', 'task group panel', 'JDG-1659'),
    ('Row Title Tree', 'Task Group Title Tree', 'JDG-1662'),
    ('Row Title', 'Task Group Name', 'JDG-1659 / JDG-1662'),
    ('Pinned Row', 'Pinned Task Group', 'JDG-1659'),
    ('Row Expander', 'Task Group Expander', 'JDG-1659'),
    ('Row Pin', 'Task Group Pin', 'JDG-1659'),
    ('Row Area', 'Task Group Area', 'JDG-1661'),
    ('row title', 'task group title', 'JDG-1662'),
    ('row name', 'task group name', 'JDG-1662'),
    ('row axis', 'vertical axis', 'JDG-1660'),
    ('WBS Link', 'Parent Task Link', 'JDG-1731'),
    ('WBS parents', 'parent tasks', 'JDG-1652'),
    ('WBS parent', 'parent task', 'JDG-1652'),
    ('WBS Parents', 'Parent Tasks', 'JDG-1652'),
    ('WBS Parent', 'Parent Task', 'JDG-1652'),
    ('parent-child progress doubt', 'parent-task progress doubt', 'JDG-1659'),
)
WL_ID = re.compile(r'\bWL-([0-9]+)\b')
# A name the tree also spells folded to lower case, where no part rule can see
# the row in it: check 70's self-test expects the key of a comment naming
# rowAnchorIn (class a, S2-UA) as 'rowanchorin' (reconcile item 12).
FOLDED_NAMES = {
    'rowanchorin': ('taskgroupanchorin', 'reconcile item 12 (follows rowAnchorIn, class a)'),
}


def lines_key(row):
    return (row['path'], row['line'], row['col'], row['text'])


def context_key(row):
    return (row['path'], row['text'], row['left'], row['right'])


def merge_decisions(new_rows, old_rows):
    """Carry a reader's decision onto the rebuilt row; report the orphans."""
    by_place = dict((lines_key(r), r) for r in old_rows if r.get('decision'))
    by_context = collections.defaultdict(list)
    for r in old_rows:
        if r.get('decision'):
            by_context[context_key(r)].append(r)
    used = set()
    for row in new_rows:
        old = by_place.get(lines_key(row))
        if old is None:
            cands = [r for r in by_context.get(context_key(row), []) if id(r) not in used]
            old = cands[0] if len(cands) == 1 else None
        if old is None:
            continue
        # only a reader's decision is carried: a machine / phrase / mirror
        # decision is computed again, so a rule that changed (reconcile items 1
        # and 2) re-opens the places it no longer decides
        reader = not (old.get('decided_by') or '').startswith(('machine:', 'phrase:', 'mirror:'))
        if reader:
            for key in ('decision', 'rewrite_old', 'rewrite_new', 'decided_by', 'note'):
                row[key] = old.get(key, '')
        used.add(id(old))
    orphans = [r for r in old_rows if r.get('decision') and id(r) not in used
               and not (r.get('decided_by') or '').startswith(('machine:', 'phrase:', 'mirror:'))]
    return orphans


def scan_japanese(path, text, phrases, rows):
    in_test = path.startswith('tests/')
    for m in rc.CJK_RUN.finditer(text):
        run = m.group(0)
        kind = rc.classify_ja(text, m.start(), m.end(), run)
        if kind in ('verb', 'compound'):
            continue
        k = run.find(rc.ROW)
        while k >= 0:
            pos = m.start() + k
            line, col = rc.line_col(text, pos)
            left, right = rc.context_of(text, pos, pos + 1)
            row = {
                'lane': rc.lane_of(path, line, japanese_in_test=in_test),
                'path': path, 'line': line, 'col': col, 'family': 'row',
                'text': run, 'left': left, 'right': right, 'machine': kind,
                'suggest': rc.suggest_ja(text, m.start(), m.end(), run),
                'decision': '', 'rewrite_old': '', 'rewrite_new': '',
                'decided_by': '', 'note': '',
            }
            if kind == 'table':
                row['decision'] = 'keep'
                row['decided_by'] = 'machine:table'
            else:
                hit = rc.phrase_at(text, pos, phrases, path)
                if hit:
                    prow, s, e = hit
                    row['decision'] = 'phrase'
                    row['decided_by'] = 'phrase:' + prow['old']
                    row['note'] = '%s -> %s' % (text[s:e], prow['new'])
            rows.append(row)
            k = run.find(rc.ROW, k + 1)
    taken = []
    for prow, s, e in rc.phrase_hits(text, phrases, path):
        line, col = rc.line_col(text, s)
        left, right = rc.context_of(text, s, e)
        taken.append((s, e))
        rows.append({
            'lane': rc.lane_of(path, line, japanese_in_test=in_test),
            'path': path, 'line': line, 'col': col, 'family': 'wbs',
            'text': text[s:e], 'left': left, 'right': right, 'machine': 'phrase',
            'suggest': '', 'decision': 'phrase', 'rewrite_old': '', 'rewrite_new': '',
            'decided_by': 'phrase:' + prow['old'], 'note': '-> ' + prow['new'],
        })
    for m in OYAKO.finditer(text):
        if any(s <= m.start() < e for s, e in taken):
            continue
        line, col = rc.line_col(text, m.start())
        left, right = rc.context_of(text, m.start(), m.end())
        rows.append({
            'lane': rc.lane_of(path, line, japanese_in_test=in_test),
            'path': path, 'line': line, 'col': col, 'family': 'oyako',
            'text': m.group(0), 'left': left, 'right': right, 'machine': 'open',
            'suggest': '', 'decision': '', 'rewrite_old': '', 'rewrite_new': '',
            'decided_by': '', 'note': 'Task parent/child -> rewrite; TaskGroup nesting -> keep (X-9)',
        })


def mirror_tests(rows):
    """A test that quotes the spec follows the spec's decision for that place."""
    spec_keys = collections.defaultdict(list)
    for r in rows:
        if r['lane'] in ('S1-A', 'S1-B', 'S1-C', 'S1-D'):
            for width in (10, 6):
                spec_keys[(width, r['family'], r['left'][-width:], r['text'],
                           r['right'][:width])].append(r)
    for r in rows:
        if r['lane'] != 'S1-T' or r['decision']:
            continue
        for width in (10, 6):
            if len(r['left']) < width or len(r['right']) < width:
                continue
            cands = spec_keys.get((width, r['family'], r['left'][-width:], r['text'],
                                   r['right'][:width]), [])
            targets = set((c['decision'], c['decided_by'], c['id']) for c in cands)
            if len(cands) >= 1 and len(set((c['decision'] or '?') for c in cands)) == 1:
                first = cands[0]
                if first['decision']:
                    r['decision'] = first['decision']
                    r['rewrite_old'] = first['rewrite_old']
                    r['rewrite_new'] = first['rewrite_new']
                    r['decided_by'] = 'mirror:' + first['id']
                else:
                    r['decision'] = 'mirror'
                    r['decided_by'] = 'mirror:' + first['id']
                del targets
                break


def scan_english(path, text, rows, spec_word_spans):
    """Bare row / rows in prose, comments and strings; in untyped JS, in code too.

    family row-en       prose, a comment or a string's text
    family row-literal  a string literal that is exactly the word ('row'):
                        a value some code compares against -- read it
    family js-ident     a code identifier row / rows in a .mjs / .js file,
                        where no type can decide it (X-12)
    TypeScript code identifiers are rename_symbols.mjs's, decided by type.
    """
    ext = os.path.splitext(path)[1]
    spans = rc.prose_spans(path, text)
    for s0, e0 in spans:
        literal = text[s0:e0]
        exact = len(literal) >= 2 and literal[0] in '\'"`' and literal[-1] == literal[0] \
            and literal[1:-1] in rc.GENERIC_WORDS
        for m in rc.EN_WORD.finditer(text, s0, e0):
            if any(s <= m.start() < e for s, e in spec_word_spans):
                continue
            add_en_row(rows, path, text, m.start(), m.end(),
                       'row-literal' if exact else 'row-en')
    if ext == '.md':
        # `Rows` (U-1, the screen name) and `rows` (a JSON key) look alike
        for m in re.finditer(r'`(rows|row|Rows|Row)`', text):
            add_en_row(rows, path, text, m.start() + 1, m.end() - 1, 'row-literal')
    if ext in ('.mjs', '.js', '.cjs'):
        inside = sorted(spans)
        for m in rc.IDENT.finditer(text):
            if m.group(0) not in rc.GENERIC_WORDS:
                continue
            if any(s <= m.start() < e for s, e in inside):
                continue
            add_en_row(rows, path, text, m.start(), m.end(), 'js-ident')


def add_en_row(rows, path, text, start, end, family):
    line, col = rc.line_col(text, start)
    left, right = rc.context_of(text, start, end, 30)
    decision, suggest = ('', '') if family == 'js-ident' else rc.suggest_en(text, start, end)
    rows.append({
        'lane': rc.lane_of(path, line, english_prose=True), 'path': path, 'line': line,
        'col': col, 'family': family, 'text': text[start:end], 'left': left, 'right': right,
        'machine': 'open', 'suggest': suggest, 'decision': decision,
        'rewrite_old': '', 'rewrite_new': '',
        'decided_by': ('machine:' + suggest) if decision else '', 'note': '',
    })


def spec_word_spans_of(text):
    spans = []
    for old, _, _ in SPEC_WORDS:
        for m in re.finditer(r'(?<![A-Za-z])' + re.escape(old) + r'(?![a-z])', text):
            if not any(s < m.end() and m.start() < e for s, e in spans):
                spans.append((m.start(), m.end()))
    return spans


def json_keys(text):
    return set(re.findall(r'"([A-Za-z_$][A-Za-z0-9_$\-]*)"\s*:', text))


def build(report_only=False):
    phrases = rc.load_phrases()
    files = [p for p in rc.git_files() if rc.is_live(p)]
    ja_rows, en_rows = [], []
    names = collections.defaultdict(lambda: {'count': 0, 'files': set(),
                                             'lanes': collections.Counter(), 'gen': 0})
    spec_words = collections.defaultdict(lambda: {'count': 0, 'files': set(), 'lanes': set(),
                                                  'gen': 0})
    wl = collections.defaultdict(lambda: {'count': 0, 'files': set(), 'lanes': set(), 'gen': 0})
    keys = set()
    stems = {}
    generated = []
    for path in files:
        base = os.path.basename(path)
        stem = base.split('.')[0]
        if has_rename_part(stem):
            stems[stem] = path
    rc.prime_lexer(files)
    for path in files:
        try:
            text, _ = rc.read_text(path)
        except (UnicodeDecodeError, OSError):
            continue
        gen = rc.is_generated(path, text)
        if gen:
            generated.append(path)
        if path.endswith('.json'):
            keys |= json_keys(text)
        lane = rc.lane_of(path, 1)
        for m in rc.IDENT.finditer(text):
            token = m.group(0)
            if not has_rename_part(token):
                continue
            entry = names[token]
            if gen:
                entry['gen'] += 1
                continue
            entry['count'] += 1
            entry['files'].add(path)
            entry['lanes'][rc.lane_of(path, rc.line_col(text, m.start())[0])
                           if path.endswith('01-04-requirements.md') else lane] += 1
        spans = spec_word_spans_of(text)
        for s, e in spans:
            entry = spec_words[text[s:e]]
            if gen:
                entry['gen'] += 1
                continue
            entry['count'] += 1
            entry['files'].add(path)
            entry['lanes'].add(rc.lane_of(path, rc.line_col(text, s)[0]))
        for m in WL_ID.finditer(text):
            entry = wl[m.group(0)]
            if gen:
                entry['gen'] += 1
                continue
            entry['count'] += 1
            entry['files'].add(path)
            entry['lanes'].add(rc.lane_of(path, rc.line_col(text, m.start())[0]))
        if gen:
            continue
        scan_japanese(path, text, phrases, ja_rows)
        scan_english(path, text, en_rows, spans)

    for i, r in enumerate(ja_rows, 1):
        r['id'] = 'J%05d' % i
    mirror_tests(ja_rows)
    for i, r in enumerate(en_rows, 1):
        r['id'] = 'E%05d' % i

    map_rows = build_map(names, spec_words, wl, keys, stems, files)

    if report_only:
        lane_table()
        return
    old_ja = rc.read_tsv(rc.LINES_JA_TSV)
    old_en = rc.read_tsv(rc.LINES_EN_TSV)
    orphans = merge_decisions(ja_rows, old_ja) + merge_decisions(en_rows, old_en)
    old_map = dict((r['old'], r) for r in rc.read_tsv(rc.MAP_TSV))
    for row in map_rows:
        old = old_map.get(row['old'])
        if old and old.get('decided-by', '').startswith('reader:'):
            for key in ('new', 'class', 'decided-by', 'note'):
                row[key] = old.get(key, '')
    rc.write_tsv(rc.LINES_JA_TSV, LINES_HEAD, ja_rows)
    rc.write_tsv(rc.LINES_EN_TSV, LINES_HEAD, en_rows)
    rc.write_tsv(rc.MAP_TSV, MAP_HEAD, map_rows)
    refresh_phrase_hits(ja_rows)
    print_report(ja_rows, en_rows, map_rows)
    print('generated files skipped: %d' % len(generated))
    print('files lexed by the light fallback lexer: %d %s' % (
        len(rc.LEX_FALLBACKS), ' '.join(rc.LEX_FALLBACKS[:10])))
    if orphans:
        print('ORPHANED reader decisions (their place is gone): %d' % len(orphans))
        for r in orphans[:20]:
            print('  %s %s:%s %s' % (r['id'], r['path'], r['line'], r['text']))


def has_rename_part(token):
    if rc.WBS_IDENT.fullmatch(token):
        return True
    if 'pasteTaskSubtree' in token or 'PasteTaskSubtree' in token:
        return True
    if 'ow' not in token and 'OW' not in token:
        return False
    if token in rc.GENERIC_WORDS:
        return False
    return rc.has_row_part(token)


def home_lane(lane_counts):
    """The lane that reads a map row: the earliest stage that meets the name,
    and inside it the lane that meets it most. A name in src/ is read in
    stage 2 even when tests/ hold it more, because the stage-2 checker run
    renames every reference at once."""
    if not lane_counts:
        return ''
    stage = min(rc.LANE_STAGE.get(l, 9) for l in lane_counts)
    if stage == 3 and any(l.startswith('S2') for l in lane_counts):
        stage = 2
    inside = [(n, l) for l, n in lane_counts.items() if rc.LANE_STAGE.get(l) == stage]
    return max(inside)[1]


def kind_of(token, keys, stems):
    if token in API_NAMES:
        return 'api'
    if token.startswith('data-'):
        return 'dom'
    if token in stems:
        return 'file'
    if token in keys:
        return 'json-key'
    return 'identifier'


def build_map(names, spec_words, wl, keys, stems, files):
    rows = []
    all_old = set(names)
    news = collections.defaultdict(list)
    for token in sorted(names):
        e = names[token]
        if e['count'] == 0 and e['gen'] == 0:
            continue
        kind = kind_of(token, keys, stems)
        if token in API_NAMES:
            new, why = API_NAMES[token]
            cls, rule, decided = 'a', '2.4', why
        elif token in KEEP_NAMES:
            new, cls, rule, decided = token, 'b', '', KEEP_NAMES[token]
        else:
            new, rule = rc.rename_parts(token)
            cls, reason = rc.classify_identifier(token)
            rule = '' if rule is None else str(rule)
            decided = ('machine:' + reason) if cls != '?' else ''
            if cls == 'b':
                new = token
        note = ''
        low = [p.lower() for p in rc.split_parts(new)]
        joined = ' '.join(low)
        if 'group group' in joined or 'task group task group' in joined:
            cls, decided, note = '?', '', 'doubled word after the rules -- name it by hand'
        if cls in ('a', '?') and new != token:
            news[new].append(token)
        rows.append({
            'old': token, 'new': new, 'kind': kind, 'class': cls, 'rule': rule,
            'files': len(e['files']), 'count': e['count'], 'decided-by': decided,
            'lanes': ','.join(sorted(e['lanes'])), 'home_lane': home_lane(e['lanes']),
            'generated_count': e['gen'], 'collision': '', 'note': note,
        })
    for row in rows:
        if row['class'] in ('a', '?') and row['new'] != row['old']:
            if row['new'] in all_old and names[row['new']]['count']:
                row['collision'] = 'new name already in the tree'
            elif row['new'] in present_tokens(files):
                row['collision'] = 'new name already in the tree'
            if len(news[row['new']]) > 1:
                row['collision'] = (row['collision'] + '; ' if row['collision'] else '') + \
                    'same new name as ' + ','.join(t for t in news[row['new']] if t != row['old'])
    for old, new, why in SPEC_WORDS:
        e = spec_words.get(old)
        if not e:
            continue
        rows.append({
            'old': old, 'new': new, 'kind': 'spec-word', 'class': 'a', 'rule': '2.1',
            'files': len(e['files']), 'count': e['count'], 'decided-by': why,
            'lanes': ','.join(sorted(e['lanes'])), 'generated_count': e['gen'],
            'collision': '', 'note': '',
        })
    for old in sorted(wl, key=lambda s: int(s.split('-')[1])):
        e = wl[old]
        rows.append({
            'old': old, 'new': 'PTL-' + old.split('-')[1], 'kind': 'row-id', 'class': 'a',
            'rule': '2.7', 'files': len(e['files']), 'count': e['count'],
            'decided-by': 'JDG-1731', 'lanes': ','.join(sorted(e['lanes'])),
            'generated_count': e['gen'], 'collision': '', 'note': '',
        })
    for old, (new, why) in sorted(FOLDED_NAMES.items()):
        found = folded_files(files, old)
        if not found:
            continue
        rows.append({
            'old': old, 'new': new, 'kind': 'identifier', 'class': 'a', 'rule': '2.5',
            'files': len(found), 'count': len(found), 'decided-by': why,
            'lanes': ','.join(sorted(set(rc.lane_of(p, 1) for p in found))),
            'home_lane': rc.lane_of(found[0], 1), 'generated_count': 0, 'collision': '',
            'note': 'a lowercased spelling no part rule sees',
        })
    rows.append({
        'old': 'WL', 'new': 'PTL', 'kind': 'row-id-prefix', 'class': 'a', 'rule': '2.7',
        'files': 1, 'count': 1, 'decided-by': 'JDG-1731',
        'lanes': 'S1-D', 'home_lane': 'S1-D', 'generated_count': 1, 'collision': '',
        'note': 'the registry entry of docs/spec/_source/row-id-prefixes.json only',
    })
    for path in files:
        stem = os.path.basename(path).split('.')[0]
        if not has_rename_part(stem):
            continue
        cls, _ = rc.classify_identifier(stem)
        new_stem, _ = rc.rename_parts(stem)
        if stem in KEEP_NAMES or cls == 'b' or new_stem == stem:
            continue
        new_path = path[:len(path) - len(os.path.basename(path))] + \
            os.path.basename(path).replace(stem, new_stem, 1)
        rows.append({
            'old': path, 'new': new_path, 'kind': 'file-path', 'class': cls, 'rule': '2.6',
            'files': 1, 'count': 1,
            'decided-by': ('machine:' + rc.classify_identifier(stem)[1]) if cls != '?' else '',
            'lanes': rc.lane_of(path, 1), 'home_lane': rc.lane_of(path, 1),
            'generated_count': 0, 'collision': '',
            'note': 'git mv; import paths follow (rename_symbols.mjs)',
        })
    return rows


def folded_files(files, token):
    """The live, hand-edited files that hold `token` as a whole word."""
    word = re.compile(r'(?<![A-Za-z0-9_$])' + re.escape(token) + r'(?![A-Za-z0-9_$])')
    found = []
    for path in files:
        try:
            text, _ = rc.read_text(path)
        except (UnicodeDecodeError, OSError):
            continue
        if word.search(text) and not rc.is_generated(path, text):
            found.append(path)
    return found


_present = {}


def present_tokens(files):
    if 'set' not in _present:
        found = set()
        for path in files:
            if not path.startswith(('src/', 'tests/')):
                continue
            try:
                text, _ = rc.read_text(path)
            except (UnicodeDecodeError, OSError):
                continue
            found |= set(rc.IDENT.findall(text))
        _present['set'] = found
    return _present['set']


def refresh_phrase_hits(ja_rows):
    counts = collections.Counter()
    for r in ja_rows:
        if r['decision'] == 'phrase':
            counts[r['decided_by'][len('phrase:'):]] += 1
    rows = rc.read_tsv(rc.PHRASES_TSV)
    head = ['old', 'new', 'scope', 'guard', 'not_before', 'status', 'decided_by', 'hits', 'note']
    for r in rows:
        r['hits'] = counts.get(r['old'], 0)
    rc.write_tsv(rc.PHRASES_TSV, head, rows)


def undecided_lines(rows):
    return [r for r in rows if not r['decision']]


# Assumed reading rates of one body, used for the hours column. They are NOT
# measured: rescale the hours by (assumed rate / measured rate) once the first
# lane reports its real pace.
RATE_LINES = 250   # lines-ja / lines-en rows per hour (read file by file)
RATE_NAMES = 60    # map names of class "?" per hour (each needs its usages read)
RATE_TYPES = 120   # rename-types.tsv rows per hour


def print_report(ja_rows, en_rows, map_rows):
    by_class = collections.Counter((r['kind'], r['class']) for r in map_rows)
    print('map rows by kind/class: ' + ', '.join('%s/%s=%d' % (k, c, n)
                                                 for (k, c), n in sorted(by_class.items())))
    print('map rows with a collision: %d' % sum(1 for r in map_rows if r['collision']))
    lane_table()


def effective_open(rows):
    by_id = dict((r['id'], r) for r in rows)
    out = []
    for r in rows:
        target, seen = r, set()
        while target.get('decision') == 'mirror' and target['decided_by'][7:] in by_id:
            if target['id'] in seen:
                break
            seen.add(target['id'])
            target = by_id[target['decided_by'][7:]]
        if target.get('decision') in ('', 'mirror'):
            out.append(r)
    return out


def lane_table():
    """The lane table of docs/review/rename-lanes-cr708.md, from the tables on disk."""
    ja_rows = rc.read_tsv(rc.LINES_JA_TSV)
    en_rows = rc.read_tsv(rc.LINES_EN_TSV)
    map_rows = rc.read_tsv(rc.MAP_TSV)
    type_rows = rc.read_tsv('docs/review/rename-types.tsv')
    # one overlay over both sheets: a decision file holds Japanese and English places
    problems = rc.overlay_lines(ja_rows + en_rows) + rc.overlay_map(map_rows)
    typed = set()
    for name in rc.decision_files('types'):
        for d in rc.read_tsv(name):
            typed.add((d['path'], d['line'], d['name'], d['nth']))
    for r in type_rows:
        if (r['path'], r['line'], r['name'], r.get('nth', '')) in typed:
            r['decision'] = 'reader'
    files = collections.Counter()
    for path in rc.git_files():
        if not rc.is_live(path):
            continue
        try:
            text, _ = rc.read_text(path)
        except (UnicodeDecodeError, OSError):
            continue
        if rc.is_generated(path, text):
            continue
        if path == 'docs/spec/01-04-requirements.md':
            files['S1-A'] += 1
            files['S1-B'] += 1
        else:
            files[rc.lane_of(path, 1)] += 1
    files['S1-T'] = len(set(r['path'] for r in ja_rows if r['lane'] == 'S1-T'))
    files['S2-LS'] = len(set(r['path'] for r in type_rows))
    ja_all = collections.Counter(r['lane'] for r in ja_rows)
    ja_open = collections.Counter(r['lane'] for r in effective_open(ja_rows)
                                  if r['decision'] != 'mirror')
    ja_mirror = collections.Counter(r['lane'] for r in effective_open(ja_rows)
                                    if r['decision'] == 'mirror')
    en_all = collections.Counter(r['lane'] for r in en_rows)
    en_open = collections.Counter(r['lane'] for r in en_rows if not r['decision'])
    names = collections.Counter()
    name_places = collections.Counter()
    for r in map_rows:
        if r['class'] == '?' or r['collision']:
            lane = r.get('home_lane') or r['lanes'].split(',')[0]
            names[lane] += 1
            name_places[lane] += int(r['count'] or 0)
    types = collections.Counter()
    for r in type_rows:
        if r['decision'] or r['verdict'].startswith('map-name'):
            continue
        # a generic identifier is read before the run that renames it: src in
        # its stage-2 layer lane, tests in their stage-3 lane (second run)
        types[r['lane']] += 1
    head = ('lane', 'files', 'ja rows', 'ja open', 'en rows', 'en open', '? names',
            '(places)', 'types', 'hours')
    print('%-8s %6s %8s %8s %8s %8s %8s %9s %6s %6s' % head)
    total = collections.Counter()
    for lane, _, _ in rc.LANES:
        hours = (ja_open[lane] + en_open[lane]) / float(RATE_LINES) +             names[lane] / float(RATE_NAMES) + types[lane] / float(RATE_TYPES)
        cells = (files[lane], ja_all[lane], ja_open[lane], en_all[lane], en_open[lane],
                 names[lane], name_places[lane], types[lane])
        for k, v in zip(head[1:], cells):
            total[k] += v
        total['hours'] += hours
        print('%-8s %6d %8d %8d %8d %8d %8d %9d %6d %6.1f' % ((lane,) + cells + (hours,)))
    print('%-8s %6s %8d %8d %8d %8d %8d %9d %6d %6.1f' % (
        'total', '-', total['ja rows'], total['ja open'], total['en rows'], total['en open'],
        total['? names'], total['(places)'], total['types'], total['hours']))
    print('rates assumed (not measured): %d lines/h, %d names/h, %d type rows/h' % (
        RATE_LINES, RATE_NAMES, RATE_TYPES))
    print('decision files: %d; problems in them: %d' % (
        len(rc.decision_files('lines') + rc.decision_files('map') + rc.decision_files('types')),
        len(problems)))
    for p in problems[:10]:
        print('  ' + p)
    print('mirror rows waiting for a spec decision (no reading of their own): %s' % ', '.join(
        '%s=%d' % (k, v) for k, v in sorted(ja_mirror.items())))


def suggest_split():
    """The 4.1 heading of 01-04 that best halves the undecided reading."""
    rows = [r for r in rc.read_tsv(rc.LINES_JA_TSV) + rc.read_tsv(rc.LINES_EN_TSV)
            if r['path'] == 'docs/spec/01-04-requirements.md' and not r['decision']]
    total = len(rows)
    text, _ = rc.read_text('docs/spec/01-04-requirements.md')
    best = None
    for number, line in enumerate(text.split('\n'), 1):
        if not line.startswith('#### ') or rc.ROW in line:
            continue
        before = sum(1 for r in rows if int(r['line']) < number)
        gap = abs(total - 2 * before)
        if best is None or gap < best[0]:
            best = (gap, number, line, before)
    print('undecided in 01-04: %d; split at line %d %r: %d / %d' % (
        total, best[1], best[2], best[3], total - best[3]))


def main(argv):
    if '--suggest-split' in argv:
        suggest_split()
        return 0
    build(report_only='--report' in argv)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
