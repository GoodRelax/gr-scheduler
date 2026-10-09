# -*- coding: utf-8 -*-
"""Apply the decided CR-708 rename to the hand-edited files (section 7, step 4).

    PYTHONIOENCODING=utf-8 python tools/rename/apply_rename.py --stage 1 [--dry-run] [--root <copy>]
    PYTHONIOENCODING=utf-8 python tools/rename/apply_rename.py --lane S1-A --lane S1-B ...
    PYTHONIOENCODING=utf-8 python tools/rename/apply_rename.py --all --dry-run

Reads docs/review/rename-lines-ja.tsv, rename-lines-en.tsv, rename-phrases-ja.tsv
and rename-map.tsv, with the lanes' own decision files of
docs/review/rename-decisions/ laid over them (rename_common.overlay_lines /
overlay_map), and writes only what a row DECIDED:

  lines-ja  decision phrase     the phrase of rename-phrases-ja.tsv found at that place
            decision task-group the character becomes "task group" (Japanese)
            decision task       the character becomes "task" (Japanese, JDG-1664)
            decision keep       nothing
            decision rewrite    rewrite_old -> rewrite_new, once, on that line
            decision mirror     the decision of the row decided_by names
  lines-en  the same words, for the English row / rows (case and plural kept)
  map       in every file of the chosen lanes that is NOT TypeScript (TypeScript
            belongs to rename_symbols.mjs): whole tokens of class-a names, the
            English screen words, and WL-n -> PTL-n

STOP: IT REFUSES AND WRITES NOTHING while anything in the chosen lanes is still
undecided: a lines row with no decision (or a mirror of an undecided row), a
map name of class "?" or with a collision that occurs in a chosen file, a row
whose place is no longer found (the tree moved under the table), or two edits
that overlap. The refusal prints the undecided count of EVERY lane.

LINE ENDINGS. The files of this tree mix LF and CRLF. Edits are made inside
one line at a time, so no ending is touched; a rewrite that adds a line uses
the file's majority ending. The CRLF count of every file is compared before
and after, and a difference stops the run before anything is written.

Generated files are never edited: they follow `npm run gen`.
"""
import collections
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rename_common as rc  # noqa: E402

TS_EXTENSIONS = ('.ts', '.tsx')


def parse_args(argv):
    opts = {'lanes': set(), 'dry': '--dry-run' in argv, 'root': None}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == '--stage':
            stage = int(argv[i + 1])
            opts['lanes'] |= set(l for l, s in rc.LANE_STAGE.items() if s == stage)
            i += 1
        elif a == '--lane':
            opts['lanes'].add(argv[i + 1])
            i += 1
        elif a == '--all':
            opts['lanes'] |= set(rc.LANE_STAGE)
        elif a == '--root':
            opts['root'] = argv[i + 1]
            i += 1
        i += 1
    return opts


def english_word(old, new_base):
    """row -> task group, Rows -> Task groups, ROW -> TASK GROUP (task likewise)."""
    plural = old.lower() == 'rows'
    word = new_base + ('s' if plural else '')
    if old.isupper():
        return word.upper()
    if old[0].isupper():
        return word[0].upper() + word[1:]
    return word


def resolve_mirrors(rows_by_id):
    for row in rows_by_id.values():
        seen = set()
        target = row
        while target.get('decision') == 'mirror':
            ref = (target.get('decided_by') or '')[len('mirror:'):]
            if ref in seen or ref not in rows_by_id:
                break
            seen.add(ref)
            target = rows_by_id[ref]
        row['_effective'] = target.get('decision', '')
        row['_rewrite'] = (target.get('rewrite_old', ''), target.get('rewrite_new', ''))


def locate(lines, row):
    """The 0-based (line index, column) of the row's place, or None if it moved.

    A Japanese row (family row) points at ONE character for "row" (col) and
    carries the whole run around it as `text`, with `left` / `right` taken
    around that character. Every other family points at the start of `text`.
    """
    n = int(row['line']) - 1
    col = int(row['col'])
    text = row['text']
    if row['family'] == 'row':
        if 0 <= n < len(lines) and lines[n][col:col + 1] == rc.ROW:
            run = [m for m in rc.CJK_RUN.finditer(lines[n]) if m.start() <= col < m.end()]
            if run and run[0].group(0) == text:
                return n, col
        middle = rc.ROW
    else:
        if 0 <= n < len(lines) and lines[n][col:col + len(text)] == text:
            return n, col
        middle = text
    # an earlier stage may have edited the same line: shorten the context
    # step by step, and accept only a place that is unique on its line
    for width in (40, 12, 6, 3):
        left = row['left'][-width:]
        right = row['right'][:width]
        needle = left + middle + right
        for k in (n, n - 1, n + 1, n - 2, n + 2):
            if not 0 <= k < len(lines):
                continue
            hits = [m.start() for m in re.finditer(re.escape(needle), lines[k])]
            if len(hits) == 1:
                return k, hits[0] + len(left)
    return None


class FileEdits(object):
    def __init__(self, path):
        self.path = path
        raw = open(os.path.join(rc.ROOT, path), 'rb').read().decode('utf-8')
        self.crlf_before = raw.count('\r\n')
        self.raw_lines = raw.split('\n')
        self.lines = [l[:-1] if l.endswith('\r') else l for l in self.raw_lines]
        self.text = '\n'.join(self.lines)
        lf = len(self.raw_lines) - 1
        self.majority = '\r\n' if self.crlf_before * 2 > lf else '\n'
        self.edits = collections.defaultdict(dict)  # line -> {col: (end, new, why)}
        self.problems = []

    def add(self, line, col, end, new, why):
        here = self.edits[line]
        if col in here and here[col][:2] == (end, new):
            return
        for c, (e, _, w) in here.items():
            if col < e and c < end:
                self.problems.append('overlap %s:%d (%s / %s)' % (self.path, line + 1, w, why))
                return
        here[col] = (end, new, why)

    def add_offset(self, start, end, new, why):
        line, col = rc.line_col(self.text, start)
        self.add(line - 1, col, col + (end - start), new, why)

    def result(self):
        out = []
        for i, raw in enumerate(self.raw_lines):
            cr = raw.endswith('\r')
            line = raw[:-1] if cr else raw
            for col in sorted(self.edits.get(i, {}), reverse=True):
                end, new, _ = self.edits[i][col]
                new = new.replace('\\n', self.majority)
                line = line[:col] + new + line[end:]
            out.append(line + ('\r' if cr else ''))
        data = '\n'.join(out)
        return data

    def count(self):
        return sum(len(v) for v in self.edits.values())


def is_wide(ch):
    """A Japanese character (kana, kanji, full-width punctuation)."""
    return bool(ch) and ord(ch) >= 0x3000


def joined_start(line, col, new):
    """Where a phrase edit starts: one column earlier when it eats the space.

    Japanese text puts a half-width space between a Japanese character and
    an ASCII word ("... no WBS no oya"). When the phrase that starts with the
    ASCII word becomes all Japanese ("oya tasuku"), that space would be left
    between two Japanese characters, so the edit takes it too (reconcile
    item 3). Only one space, and only between two wide characters.
    """
    if (col >= 2 and line[col - 1] == ' ' and is_wide(line[col - 2]) and is_wide(new[:1])
            and not is_wide(line[col:col + 1])):
        return col - 1
    return col


def apply_line_row(fe, row, phrases_by_old, phrases):
    decision = row['_effective']
    if decision == 'keep':
        # nothing to write; an earlier stage may have renamed the token around
        # it (a class-a map name such as 'row-2'), so it is not looked for
        return
    where = locate(fe.lines, row)
    if where is None:
        fe.problems.append('moved %s %s:%s %r' % (row['id'], row['path'], row['line'], row['text']))
        return
    n, col = where
    text = row['text']
    if decision == 'keep':
        return
    if decision == 'rewrite':
        old, new = row['_rewrite']
        at = fe.lines[n].find(old) if old else -1
        if at < 0 or fe.lines[n].count(old) != 1 or not at <= col < at + len(old) + 1:
            fe.problems.append('rewrite_old not found once around %s %s:%s' % (
                row['id'], row['path'], row['line']))
            return
        fe.add(n, at, at + len(old), new, 'rewrite ' + row['id'])
        return
    if row['family'] in ('row-en', 'row-literal', 'js-ident'):
        base = {'task-group': 'task group', 'task': 'task'}.get(decision)
        if base is None:
            fe.problems.append('bad decision %r on %s' % (decision, row['id']))
            return
        if row['family'] == 'js-ident':
            base = 'taskGroup' if decision == 'task-group' else 'task'
            new = base + ('s' if text.lower() == 'rows' else '')
            if text[0].isupper():
                new = new[0].upper() + new[1:]
        else:
            new = english_word(text, base)
        fe.add(n, col, col + len(text), new, row['id'])
        return
    if decision == 'phrase':
        old = (row.get('decided_by') or '')[len('phrase:'):]
        if row['decision'] == 'mirror':
            old = ''
        if row['family'] == 'wbs':
            prow = phrases_by_old.get(old)
            if prow is None or fe.lines[n][col:col + len(old)] != old:
                fe.problems.append('phrase gone %s' % row['id'])
                return
            fe.add(n, joined_start(fe.lines[n], col, prow['new']), col + len(old), prow['new'],
                   row['id'])
            return
        offset = sum(len(l) + 1 for l in fe.lines[:n]) + col
        mirrored = (row.get('decided_by') or '').startswith('mirror:')
        hit = rc.phrase_at(fe.text, offset, phrases, row['path'], use_guard=not mirrored)
        if hit is None:
            fe.problems.append('phrase not found at %s %s:%s' % (row['id'], row['path'], row['line']))
            return
        prow, s, e = hit
        # a phrase that only turns the character into "task group" is applied
        # to the character, so two such phrases sharing words cannot overlap
        # ("hidden row's descendants' rows")
        if prow['new'] == prow['old'].replace(rc.ROW, rc.TASK_GROUP_JA):
            k = col
            fe.add(n, k, k + 1, rc.TASK_GROUP_JA, row['id'])
            return
        fe.add_offset(s, e, prow['new'], row['id'])
        return
    word = {'task-group': rc.TASK_GROUP_JA, 'task': rc.TASK_JA}.get(decision)
    if word is None:
        fe.problems.append('bad decision %r on %s' % (decision, row['id']))
        return
    k = col
    fe.add(n, k, k + 1, word, row['id'])


def token_pass(fe, names, spec_words, undecided_names, used_undecided):
    text = fe.text
    taken = []
    for old, new in spec_words:
        for m in re.finditer(r'(?<![A-Za-z])' + re.escape(old) + r'(?![a-z])', text):
            if any(m.start() < e and s < m.end() for s, e in taken):
                continue
            taken.append((m.start(), m.end()))
            fe.add_offset(m.start(), m.end(), new, 'spec-word')
    for m in rc.IDENT.finditer(text):
        tok = m.group(0)
        if any(m.start() < e and s < m.end() for s, e in taken):
            continue
        if tok in names:
            fe.add_offset(m.start(), m.end(), names[tok], 'map')
        elif tok in undecided_names:
            used_undecided[tok] += 1
    for m in re.finditer(r'\bWL-([0-9]+)\b', text):
        fe.add_offset(m.start(), m.end(), 'PTL-' + m.group(1), 'row-id')
    if fe.path == 'docs/spec/_source/row-id-prefixes.json':
        for m in re.finditer(r'"prefix":\s*"(WL)"', text):
            fe.add_offset(m.start(1), m.end(1), 'PTL', 'row-id-prefix')


def main(argv):
    opts = parse_args(argv)
    if opts['root']:
        rc.set_root(opts['root'])
    if not opts['lanes']:
        print('name the lanes: --stage N, --lane X or --all')
        return 2
    lanes = opts['lanes']
    missing = [t for t in (rc.MAP_TSV, rc.PHRASES_TSV, rc.LINES_JA_TSV, rc.LINES_EN_TSV)
               if not os.path.isfile(os.path.join(rc.ROOT, t))]
    if missing:
        print('REFUSED: the tables are missing under %s: %s' % (rc.ROOT, ', '.join(missing)))
        return 1
    phrases = rc.load_phrases()
    phrases_by_old = dict((p['old'], p) for p in phrases)
    rows = rc.read_tsv(rc.LINES_JA_TSV) + rc.read_tsv(rc.LINES_EN_TSV)
    overlay_problems = rc.overlay_lines(rows)
    by_id = dict((r['id'], r) for r in rows)
    resolve_mirrors(by_id)
    for r in rows:
        if r.get('decision', '') and r['_effective'] not in ('', 'mirror'):
            r['_effective'] = rc.DECISIONS.get(r['_effective'], r['_effective'])
    undecided = collections.Counter(r['lane'] for r in rows if r['_effective'] in ('', 'mirror'))
    map_rows = rc.read_tsv(rc.MAP_TSV)
    overlay_problems += rc.overlay_map(map_rows)
    names = {}
    spec_words = []
    undecided_names = set()
    for r in map_rows:
        if r['class'] == '?' or (r['class'] == 'a' and r['collision']):
            undecided_names.add(r['old'])
        elif r['class'] == 'a' and r['old'] != r['new']:
            if r['kind'] == 'spec-word':
                spec_words.append((r['old'], r['new']))
            elif r['kind'] in ('identifier', 'api', 'json-key', 'dom', 'file'):
                names[r['old']] = r['new']
    spec_words.sort(key=lambda p: -len(p[0]))

    print('undecided lines per lane (all lanes):')
    for lane, _, _ in rc.LANES:
        mark = '*' if lane in lanes else ' '
        print('  %s %-8s %6d' % (mark, lane, undecided[lane]))
    blocked = sum(undecided[l] for l in lanes)

    # every file a chosen lane owns, from the lines tables and the token pass
    files = set(r['path'] for r in rows if r['lane'] in lanes)
    for path in rc.git_files():
        if not rc.is_live(path) or path.endswith(TS_EXTENSIONS):
            continue
        if rc.lane_of(path, 1) in lanes or path == 'docs/spec/01-04-requirements.md' and (
                lanes & set(['S1-A', 'S1-B'])):
            files.add(path)
    per_file = collections.defaultdict(list)
    for r in rows:
        if r['lane'] in lanes:
            per_file[r['path']].append(r)
    # a file an earlier run of rename_symbols.mjs moved (stage 2 moves the test
    # files too) is read at its new path; its rows keep the old one
    moved = dict((r['old'], r['new']) for r in map_rows
                 if r['kind'] == 'file-path' and r['class'] == 'a')
    by_actual = collections.defaultdict(list)
    for path in files:
        here = path
        if not os.path.isfile(os.path.join(rc.ROOT, path)) and path in moved and \
                os.path.isfile(os.path.join(rc.ROOT, moved[path])):
            here = moved[path]
        by_actual[here].append(path)
    used_undecided = collections.Counter()
    problems = list(overlay_problems)
    results = {}
    total = 0
    for path in sorted(by_actual):
        try:
            text, _ = rc.read_text(path)
        except (UnicodeDecodeError, OSError):
            if any(per_file.get(old) for old in by_actual[path]):
                problems.append('file gone %s' % path)
            continue
        if rc.is_generated(path, text):
            continue
        fe = FileEdits(path)
        for r in [one for old in by_actual[path] for one in per_file.get(old, [])]:
            if r['_effective'] in ('', 'mirror'):
                continue
            apply_line_row(fe, r, phrases_by_old, phrases)
        if not path.endswith(TS_EXTENSIONS):
            token_pass(fe, names, spec_words, undecided_names, used_undecided)
        problems.extend(fe.problems)
        if fe.count():
            data = fe.result()
            after = data.count('\r\n')
            if after != fe.crlf_before and '\\n' not in ''.join(
                    e[1] for v in fe.edits.values() for e in v.values()):
                problems.append('CRLF count would change in %s: %d -> %d' % (
                    path, fe.crlf_before, after))
            results[path] = (data, fe.crlf_before, after)
            total += fe.count()

    # every edited code, JSON or Python file must parse as well after as before
    befores = {}
    afters = {}
    for path, (data, _, _) in results.items():
        if os.path.splitext(path)[1] in rc.CODE_EXTENSIONS + ('.json', '.py'):
            befores[path] = rc.read_text(path)[0]
            afters[path] = data.replace('\r\n', '\n')
    before_errors = rc.syntax_errors(befores)
    after_errors = rc.syntax_errors(afters)
    for path in sorted(afters):
        b, a = before_errors.get(path, 0), after_errors.get(path, 0)
        if b >= 0 and (a < 0 or a > b):
            problems.append('the edits break the syntax of %s (%d -> %d errors)' % (path, b, a))

    print('chosen lanes: %s' % ', '.join(sorted(lanes)))
    print('undecided lines in the chosen lanes: %d' % blocked)
    print('undecided map names met in the chosen files: %d names, %d places' % (
        len(used_undecided), sum(used_undecided.values())))
    print('problems (moved rows, overlaps, CRLF): %d' % len(problems))
    for p in problems[:40]:
        print('  ' + p)
    print('edits planned: %d in %d files' % (total, len(results)))
    if blocked or used_undecided or problems:
        print('REFUSED: nothing written (decide the rows above, then run again).')
        return 1
    if opts['dry']:
        print('dry run: nothing written.')
        return 0
    for path, (data, before, after) in sorted(results.items()):
        open(os.path.join(rc.ROOT, path), 'wb').write(data.encode('utf-8'))
        print('  wrote %s (CRLF %d -> %d)' % (path, before, after))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
