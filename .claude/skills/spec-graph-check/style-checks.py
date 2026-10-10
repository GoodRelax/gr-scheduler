# -*- coding: utf-8 -*-
"""Checks 12-14 and 32: gate the defect types that every review round regenerates.

Seven rounds of review kept producing the same four kinds of duplication,
because none of checks 1-11 look for them: the near-duplicate detector only
sees similar WORDING, and a paraphrase walks straight past it. These three
checks gate the types mechanically, so the next round cannot recreate them.

    12  a rule in a value table      tbl-settings.md must not hold MUST /
                                     MUST NOT; rules live in requirements
    13  a transfer leftover          a line that points at the owner
                                     ("規則と理由は FR-xxx") while still
                                     stating the rule itself
    14  a value written twice        a settings default that also appears
                                     as a literal in the requirements
                                     (advisory: printed, does not fail)
    32  the outright forbidden word  部品 outside the lines that name it AS
                                     forbidden (table T-006b, A-17); and
                                     every spelling the notation table
                                     (section 5 of rule 02) marks 止める,
                                     in the spec, the dictionary and the
                                     guides (JDG-1857, CR-725, JDG-1863),
                                     an all-ASCII spelling in every case
                                     (JDG-1921, CR-730);
                                     and the English names of the screen
                                     in Title Case, read from the name
                                     fields that table's Title Case row
                                     lists (JDG-1862, CR-726)

Usage: python style-checks.py [repo-root] [--self-test]
Exit code 1 if check 12 or 32 reports a finding.

`--self-test` feeds the spelling scan an in-memory table and in-memory lines
(a gated spelling is red, the written spelling is green, a row marked
止めない gates nothing, a written spelling that begins with the gated one is
not red, an all-ASCII gated spelling is red in any case and its written
spelling green in any case), feeds the Title Case scan an in-memory row and
dictionary, and then reads the real table: it is red when the table no longer
yields the ウインドウ row, the 取込 row, the American color row or the Title
Case row, so deleting a row cannot silence the check.

NOTE ON NON-ASCII: the patterns hold Japanese text because the
specification is written in Japanese; those code points are data.
"""
import io
import json
import os
import re
import sys

ARGS = [a for a in sys.argv[1:] if a != '--self-test']
ROOT = ARGS[0] if ARGS else '.'

SETTINGS = 'docs/spec/_assets/tbl-settings.md'
GLOSSARY = 'docs/spec/_assets/tbl-glossary.md'
REQS = 'docs/spec/01-04-requirements.md'

# Rules may sit in a value table only where the document says so. Each entry
# is a row ID or an anchor phrase; anything else is a violation. Keep this
# list short -- it is the exception, not the escape hatch.
CHECK12_ALLOWED = set()

# Two whole-line exceptions the specification itself sanctions.
CHECK12_ALLOWED_TEXT = (
    '例外は表 T-105',          # keeping the naming table's own exception list
    '本表はかつて',            # quoting an instruction that was withdrawn
)

# A line that hands ownership away with one of these, and then keeps stating
# the rule, is a transfer that never finished.
POINTS_AWAY = re.compile(
    r'(規則と理由|規則|理由)(と[^は]{0,12})?は\s*[`「]?(FR|NFR|UC|GL)-[0-9]+|'
    r'(規則と理由|規則)(と[^は]{0,12})?は\s*表 T-[0-9]+[a-z]?')
STATES_RULE = re.compile(r'（MUST）|（MUST NOT）|してはならない|しなければならない')

MUST = re.compile(r'（MUST(?: NOT)?）')

# The glossary owns names, so a prohibition about WORDING belongs there.
# Anything else it forbids (behavior, data shape, values) does not.
NAMING_RULE = re.compile(
    r'呼んではならない|と書く|と書くこと|書いてはならない|略さない|略してはならない|'
    r'名前に使わない|訳語|直訳|語順|別語|意訳|表記')

findings = []
advisory = []


def report(check, path, lineno, message):
    findings.append('%-3s %s:%s  %s' % (check, path, lineno, message))


def row_id(line):
    if not line.startswith('|'):
        return ''
    return line.strip().strip('|').split('|')[0].strip('`* ')


def read(rel):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        return []
    return io.open(path, encoding='utf-8').read().splitlines()


def paragraphs_by_line(lines):
    """For each line, the whole block it belongs to.

    ⛔ A rule is a paragraph, not a line (check 46). A table row is its own
    block; so is a heading and a blank line.
    """
    out = [None] * len(lines)
    held = []
    def flush():
        text = ' '.join(held)
        for k in held_at:
            out[k] = text
    held_at = []
    for i, line in enumerate(lines):
        t = line.strip()
        if not t or t.startswith(('|', '#', '```')):
            if held_at:
                flush()
            held, held_at = [], []
            out[i] = line
            continue
        held.append(t)
        held_at.append(i)
    if held_at:
        flush()
    return out


# ------------------------------------------------------- check 12

for rel in (SETTINGS, GLOSSARY):
    lines = list(read(rel))
    blocks = paragraphs_by_line(lines)
    for i, line in enumerate(lines, 1):
        if not MUST.search(line):
            continue
        # The rule is the paragraph; the line is only where it is reported.
        rule = blocks[i - 1] or line
        rid = row_id(line)
        if rid in CHECK12_ALLOWED:
            continue
        if any(x in rule for x in CHECK12_ALLOWED_TEXT):
            continue
        # A rule that only points at where it lives is fine.
        stripped = MUST.sub('', rule)
        if POINTS_AWAY.search(rule) and not STATES_RULE.search(stripped):
            continue
        if rel == GLOSSARY and NAMING_RULE.search(rule):
            continue        # a rule about what to CALL a thing is the
                            # glossary's own subject: it is the name owner
        what = 'value table' if rel == SETTINGS else 'name table'
        report('12', rel, i,
               'a rule (MUST / MUST NOT) sits in the %s%s -- rules belong to '
               'a requirement' % (what, (' at row %s' % rid) if rid else ''))

# ------------------------------------------------------- check 13

for rel in (SETTINGS, GLOSSARY, REQS):
    for i, line in enumerate(read(rel), 1):
        if not POINTS_AWAY.search(line):
            continue
        # Cut everything from the hand-off onward; a rule stated AFTER the
        # pointer is the pointer's own sentence, not a leftover.
        head = POINTS_AWAY.split(line)[0]
        if STATES_RULE.search(head):
            # Advisory, not a gate: a line may legitimately state its own
            # rule and then point elsewhere for a DIFFERENT one. Telling
            # those apart needs the subject of each clause, which this
            # cannot recover -- and a noisy gate gets legitimate text
            # "fixed", which is how type 4 is created in the first place.
            advisory.append('13  %s:%s  points at an owner while also '
                            'stating a rule -- check which rule is whose'
                            % (rel, i))

# ------------------------------------------------------- check 14

# Settings defaults that also appear as a literal in the requirements.
# Single digits are excluded: they collide with counts, depths and indexes
# far too often to carry signal.
# Identifiers (T-036, S-99a, FR-012) and ISO dates carry digits that are
# not values; counting them buries the real echoes in noise.
NOISE = re.compile(r'[A-Z]{1,4}-[0-9]+[a-z]?|[0-9]{4}-[0-9]{2}-[0-9]{2}')


def denoise(text):
    return NOISE.sub(' ', text)


defaults = {}
for i, line in enumerate(read(SETTINGS), 1):
    rid = row_id(line)
    if not re.match(r'^S-[0-9]+[a-z]?$', rid or ''):
        continue
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    for c in cells[2:4]:
        for num in re.findall(r'([0-9]+(?:\.[0-9]+)?)', denoise(c)):
            if '.' in num or len(num) >= 2:
                defaults.setdefault(num, []).append((rid, i))

req_lines = read(REQS)
for num, owners in sorted(defaults.items(), key=lambda kv: -len(kv[1])):
    if re.match(r'^(19|20)[0-9]{2}$', num):
        continue
    hits = []
    for i, line in enumerate(req_lines, 1):
        if re.search(r'(?<![-0-9.])' + re.escape(num) + r'(?![0-9.])',
                     denoise(line)):
            hits.append(i)
    if hits:
        rid = owners[0][0]
        advisory.append('14  %s appears in %s (%s) and in %s at %s'
                        % (num, SETTINGS, rid, REQS.split('/')[-1],
                           ' '.join(str(h) for h in hits[:6])
                           + (' ...' if len(hits) > 6 else '')))

# ------------------------------------------------------- check 32

# A-17 of table T-006b is the one row of that table that forbids a word
# outright -- compounds included -- and the same row exempts the places that
# name it AS forbidden.  So a line may hold the word exactly when it cites
# A-17, the table, or calls it a forbidden word.
# ⭐ THAT EXEMPTION IS READ FROM THE RULE, NOT HELD IN A BASELINE.  A baseline
# would have to be edited every time the changelog mentions the ban again, and
# a held line is a debt; this one cannot go stale.
#
# ⚠️ WHY IT IS HERE. ⛔ Do not leave the count to audit-ch5.py alone: check.sh
# does not run it, so a red count there tells nobody (the ledger's DFC-227).
# A check nothing runs is not a check.
FORBIDDEN_WORD = '部品'
NAMES_THE_BAN = re.compile(r'A-17|T-006b|禁止語')


def spec_markdown():
    """Every manuscript of docs/spec, without the strictdoc export."""
    found = []
    for here, dirs, names in os.walk(os.path.join(ROOT, 'docs', 'spec')):
        dirs[:] = [d for d in dirs if d not in ('output', '__pycache__')]
        for name in sorted(names):
            if name.endswith('.md'):
                found.append(os.path.relpath(os.path.join(here, name), ROOT)
                             .replace(os.sep, '/'))
    return sorted(found)


for rel in spec_markdown():
    for i, line in enumerate(read(rel), 1):
        if FORBIDDEN_WORD not in line or NAMES_THE_BAN.search(line):
            continue
        report('32', rel, i,
               'the forbidden word %s -- A-17 of table T-006b forbids it, '
               'compounds included. Write コンポーネント / モジュール / ユニット '
               'for a unit of structure, or UI パーツ for a thing on screen'
               % FORBIDDEN_WORD)

# ------------------------------------------------------- check 32, spellings

# ⭐ THE SPELLINGS ARE READ FROM THE NOTATION TABLE, NOT HELD HERE.  Section 5
# of docs/development-rules/02-changing-the-spec.md is the SSOT for katakana
# long vowels and small kana (JDG-1850, JDG-1855, JDG-1857); a row whose
# 検査 32 cell says 止める gates its 書かない spelling.  Rows that say 止めない
# are rules the machine cannot hold (an open set of words) or has not been
# asked to hold yet.
NOTATION_RULES = 'docs/development-rules/02-changing-the-spec.md'
NOTATION_HEADING = '表記の表'
GATED = '止める'
# A spelling row holds one word per cell: no space, no punctuation (JDG-1863
# added 取込 -> 取り込み, so the cells are no longer katakana alone).
ONE_WORD = re.compile(r'^[^\s|、。・（）()「」`*]+$')
# The ruling that must stay gated: the self-test reads the real table and is
# red when this row is gone (JDG-1857).
MUST_GATE = ('ウィンドウ', 'ウインドウ')
# CR-721 gated three more rows the coordinator decided (JDG-1850, JDG-1855),
# and CR-726 the user's 取り込み (JDG-1863); the self-test is red when one of
# them stops being gated.
ALSO_GATED = (('フィルタ', 'フィルター'), ('マーカー', 'マーカ'), ('ヘッダー', 'ヘッダ'),
              ('取り込み', '取込'), ('color', 'colour'))
# JDG-1921 (CR-730): American spelling everywhere. A row whose banned spelling
# is all ASCII is matched in every case, so the one row for the lower-case
# word also stops the capitalized and the upper-case word (E-09). Only A-Z is
# folded, so a column stays a column of the line as written.
ASCII_FOLD = str.maketrans('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')


def notation_rows(lines):
    """The cells of every row of the first table under the heading."""
    rows = []
    under = False
    for line in lines:
        if line.startswith('#'):
            if under and rows:
                break
            under = NOTATION_HEADING in line
            continue
        if not under or not line.startswith('|'):
            continue
        rows.append([c.strip() for c in line.strip().strip('|').split('|')])
    return rows


def gated_spellings(lines):
    """(written, banned) pairs of the rows whose 検査 32 cell is 止める.

    A gated row must hold one word per cell; a row that does not is returned
    with banned None, so the caller reports it instead of guessing.
    """
    pairs = []
    for cells in notation_rows(lines):
        if len(cells) < 4 or cells[3] != GATED:
            continue
        written, banned = cells[0], cells[1]
        if not (ONE_WORD.match(written) and ONE_WORD.match(banned)):
            pairs.append((written, None))
            continue
        pairs.append((written, banned))
    return pairs


def misspelt_at(line, written, banned):
    """Columns where `banned` stands and is not the start of `written`.

    ヘッダー begins with ヘッダ: a gated ヘッダ must not redden the written word.
    ⚠️ Only when the written word is the LONGER one: フィルター begins with the
    written フィルタ, and skipping on a written prefix there would let every
    banned フィルター through (CR-721).
    An all-ASCII banned spelling is matched in every case (JDG-1921, CR-730).
    """
    found = []
    if banned.isascii():
        line = line.translate(ASCII_FOLD)
        written = written.translate(ASCII_FOLD)
        banned = banned.translate(ASCII_FOLD)
    shields = written.startswith(banned) and len(written) > len(banned)
    at = line.find(banned)
    while at >= 0:
        if not (shields and line.startswith(written, at)):
            found.append(at)
        at = line.find(banned, at + 1)
    return found


def spelling_targets():
    """The spec (.md and .json), the dictionary and the guides."""
    found = []
    for top in (('docs', 'spec'), ('docs', 'guides')):
        for here, dirs, names in os.walk(os.path.join(ROOT, *top)):
            dirs[:] = [d for d in dirs if d not in ('output', '__pycache__')]
            for name in sorted(names):
                if name.endswith(('.md', '.json')):
                    found.append(os.path.relpath(os.path.join(here, name),
                                                 ROOT).replace(os.sep, '/'))
    found.append('src/adapter/screen-renderer/display-words.json')
    return sorted(found)


# A path into the history folders, in backticks, names a file that is never
# renamed (CR-730 X-1: change-request/ and previous-project-result/ keep their
# spelling), so the spelling inside it is not the writer's and is not matched.
HISTORY_PATH = re.compile(r'`(?:change-request|previous-project-result)/[^`\s]*`')


def without_history_paths(line):
    """The line with every backticked history path blanked, columns kept."""
    return HISTORY_PATH.sub(lambda m: ' ' * len(m.group(0)), line)


def scan_spellings(pairs, files):
    """files: [(rel, lines)] -> [(rel, lineno, written, banned)]."""
    hits = []
    for written, banned in pairs:
        if banned is None:
            continue
        for rel, lines in files:
            for i, line in enumerate(lines, 1):
                for _ in misspelt_at(without_history_paths(line), written, banned):
                    hits.append((rel, i, written, banned))
    return hits


# ------------------------------------------------------- check 32, Title Case

# ⭐ THE NAME FIELDS AND THE SMALL WORDS ARE READ FROM THE NOTATION TABLE TOO.
# Its Title Case row (検査 32 cell 止める（Title Case）) lists, in backticks,
# every dictionary field whose English value names a thing on the screen
# (`section.field`, or `section/key.field` for one entry), and the small
# words that stay lower case after the first word (JDG-1862). Sentences and
# values keep sentence case and are simply not listed.
TITLE_CASE_GATE = '止める（Title Case）'
DICTIONARY = 'docs/spec/_source/display-words.json'
SELECTOR = re.compile(r'`([A-Za-z]+)(?:/([A-Za-z0-9-]+))?\.([A-Za-z]+)`')
SMALL_WORDS = re.compile(r'小さい語（([a-z・]+)）')
PLACEHOLDER = re.compile(r'\{[^}]*\}')
# A letter run that is not the tail of a file extension such as .md.
WORD = re.compile(r"(?<![.A-Za-z])[A-Za-z][A-Za-z']*")
# At least this many name fields must stay listed (CR-726 listed 22).
MIN_SELECTORS = 10


def title_case_rule(lines):
    """(selectors, small words) of the Title Case row, or None without one."""
    for cells in notation_rows(lines):
        if len(cells) >= 5 and cells[3] == TITLE_CASE_GATE:
            selectors = SELECTOR.findall(cells[4])
            small = SMALL_WORDS.search(cells[4])
            return selectors, set(small.group(1).split('・')) if small else set()
    return None


def lower_words(value, small):
    """The words of an English name that break Title Case.

    The first and the last word are capitalized whatever they are; a small
    word anywhere else may stay lower case (Path from Top, Week Starts On).
    """
    words = WORD.findall(PLACEHOLDER.sub(' ', value))
    return [w for i, w in enumerate(words)
            if w[0].islower() and (i in (0, len(words) - 1) or w not in small)]


def scan_title_case(rule, dictionary):
    """[(where, en, bad words)]; a selector naming nothing is reported too."""
    selectors, small = rule
    hits = []
    for section, key, field in selectors:
        entries = [e for e in dictionary.get(section, [])
                   if key == '' or any(not isinstance(v, dict) and str(v) == key
                                       for v in e.values())]
        values = [e[field]['en'] for e in entries
                  if isinstance(e.get(field), dict) and 'en' in e[field]]
        if not values:
            hits.append(('%s%s.%s' % (section, '/' + key if key else '', field),
                         None, []))
            continue
        for en in values:
            bad = lower_words(en, small)
            if bad:
                hits.append(('%s.%s' % (section, field), en, bad))
    return hits


def line_of(lines, en):
    needle = '"en": %s' % json.dumps(en, ensure_ascii=False)
    for i, line in enumerate(lines, 1):
        if needle in line:
            return i
    return 0


def self_test():
    table = [
        '## 5. ⭐ 表記の表 —— example',
        '| 書く | 書かない | 裁定 | 検査 32 | 注 |',
        '|---|---|---|---|---|',
        '| ウィンドウ | ウインドウ | JDG | 止める | |',
        '| ヘッダー | ヘッダ | JDG | 止める | |',
        '| フィルタ | フィルター | JDG | 止めない | |',
        '| マーカー | マーカ | JDG | 止めない | |',
        '## 6. next',
        '| ポインタ | ポインター | JDG | 止める | |',
    ]
    pairs = gated_spellings(table)
    lines = [('t.md', ['開いているウインドウ', '開いているウィンドウ',
                       'ヘッダーの帯', 'ヘッダの帯', 'フィルターの欄',
                       'ポインターの先', 'マーカの色'])]
    hits = [(rel, i) for rel, i, _, _ in scan_spellings(pairs, lines)]
    # CR-721: the written word may be the SHORTER one (フィルタ / フィルター).
    shorter = gated_spellings(['## 5. 表記の表', '| フィルタ | フィルター | JDG | 止める | |',
                               '| マーカー | マーカ | JDG | 止める | |'])
    shorter_hits = [(rel, i) for rel, i, _, _ in scan_spellings(
        shorter, [('s.md', ['フィルターの欄', 'フィルタの欄', 'マーカーの色', 'マーカの色'])])]
    # JDG-1921 (CR-730): one all-ASCII row stops every case; the written word stays green.
    english = gated_spellings(['## 5. 表記の表', '| color | colour | JDG | 止める | |'])
    english_hits = [(rel, i) for rel, i, _, _ in scan_spellings(
        english, [('e.md', ['the colour field', 'Fill Colour', 'COLOUR_NAME_VALUES',
                            'defaultColour', 'the color field', 'Fill Color',
                            'COLOR_NAME_VALUES', 'defaultColor'])])]
    # CR-730 X-1: a backticked history path keeps its spelling; the same word outside stays red.
    history_hits = [(rel, i) for rel, i, _, _ in scan_spellings(
        english, [('h.md', ['see `previous-project-result/43-theme-colour-solve/`',
                            'see `change-request/CR-683-the-theme-colours-are-solved-per-hue.md`',
                            'see `docs/colour.md`', 'the colour of `previous-project-result/x/`'])])]
    real = gated_spellings(read(NOTATION_RULES))
    # JDG-1862: an in-memory Title Case row over an in-memory dictionary.
    tc_rule = title_case_rule([
        '## 5. 表記の表',
        '| 書く | 書かない | 裁定 | 検査 32 | 注 |',
        '| 取り込み | 取込 | JDG | 止める | |',
        '| Title Case | x | JDG | 止める（Title Case） | 名前の欄: `t.name`・`u/k2.text`・`gone.name`。'
        '小さい語（a・of・to・from）は頭以外で小文字 |',
    ])
    tc_dict = {'t': [{'id': str(i), 'name': {'ja': '-', 'en': en}} for i, en in enumerate(
                   ['Select all', 'Select All', 'Path from Top', 'parent task', '.md',
                    'Status Date {date}', 'from Top', 'Fade In/Out Days'])],
               'u': [{'part': 'k1', 'text': {'ja': '-', 'en': 'a sentence, not a name'}},
                     {'part': 'k2', 'text': {'ja': '-', 'en': 'Made at'}}]}
    tc_hits = scan_title_case(tc_rule, tc_dict) if tc_rule else []
    tc_bad = sorted(en for _, en, _ in tc_hits if en)
    real_tc = title_case_rule(read(NOTATION_RULES))
    checks = (
        ('two gated rows read, the 止めない rows and the row under the next '
         'heading skipped', len(pairs) == 2),
        ('ウインドウ red on line 1', ('t.md', 1) in hits),
        ('ウィンドウ green on line 2', ('t.md', 2) not in hits),
        ('ヘッダー green on line 3 although ヘッダ is gated',
         ('t.md', 3) not in hits),
        ('ヘッダ red on line 4', ('t.md', 4) in hits),
        ('exactly 2 hits in all', len(hits) == 2),
        ('フィルター red although it begins with the written フィルタ',
         ('s.md', 1) in shorter_hits),
        ('フィルタ green, マーカー green, マーカ red: exactly 2 hits',
         sorted(shorter_hits) == [('s.md', 1), ('s.md', 4)]),
        ('colour, Colour, COLOUR and defaultColour red; color, Color, COLOR and '
         'defaultColor green: exactly 4 hits (JDG-1921, CR-730)',
         sorted(english_hits) == [('e.md', 1), ('e.md', 2), ('e.md', 3), ('e.md', 4)]),
        ('a backticked change-request/ or previous-project-result/ path is green; '
         'colour in another path or in prose is red: exactly 2 hits (CR-730 X-1)',
         sorted(history_hits) == [('h.md', 3), ('h.md', 4)]),
        ('the real table still gates %s -> %s' % (MUST_GATE[1], MUST_GATE[0]),
         MUST_GATE in real),
        ('the in-memory Title Case row is read with its 3 selectors and 4 small words',
         tc_rule is not None and len(tc_rule[0]) == 3 and len(tc_rule[1]) == 4),
        ('Title Case: Select all, parent task, from Top and Made at (a small word last) red; Select All, '
         'Path from Top, .md, Status Date {date}, Fade In/Out Days and the unlisted '
         'sentence green',
         tc_bad == ['Made at', 'Select all', 'from Top', 'parent task']),
        ('Title Case: a selector naming no entry (gone.name) is red',
         any(en is None and where == 'gone.name' for where, en, _ in tc_hits)),
        ('the real table still has its Title Case row with at least %d name fields '
         '(JDG-1862)' % MIN_SELECTORS,
         real_tc is not None and len(real_tc[0]) >= MIN_SELECTORS and len(real_tc[1]) > 0),
    ) + tuple(
        ('the real table gates %s -> %s (CR-721 / CR-726 / CR-730, JDG-1850 / JDG-1855 / '
         'JDG-1863 / JDG-1921)' % (b, w),
         (w, b) in real) for w, b in ALSO_GATED)
    bad = [name for name, ok in checks if not ok]
    for name, ok in checks:
        print('%s  self-test: %s' % ('OK      ' if ok else 'PROBLEM ', name))
    return 1 if bad else 0


if '--self-test' in sys.argv[1:]:
    sys.exit(self_test())

SPELLING_PAIRS = gated_spellings(read(NOTATION_RULES))
for written, banned in SPELLING_PAIRS:
    if banned is None:
        report('32', NOTATION_RULES, 0,
               'a 止める row of the notation table must hold one word in '
               '書く and one in 書かない (row: %s)' % written)
if MUST_GATE not in SPELLING_PAIRS:
    report('32', NOTATION_RULES, 0,
           'the notation table no longer gates %s -> %s (JDG-1857)'
           % (MUST_GATE[1], MUST_GATE[0]))
for rel, i, written, banned in scan_spellings(
        SPELLING_PAIRS, [(rel, read(rel)) for rel in spelling_targets()]):
    report('32', rel, i,
           'the spelling %s -- write %s (the notation table, section 5 of %s)'
           % (banned, written, NOTATION_RULES))

TITLE_CASE_RULE = title_case_rule(read(NOTATION_RULES))
TITLE_CASE_HITS = []
if TITLE_CASE_RULE is None or len(TITLE_CASE_RULE[0]) < MIN_SELECTORS:
    report('32', NOTATION_RULES, 0,
           'the notation table no longer has its Title Case row with at least '
           '%d name fields (JDG-1862)' % MIN_SELECTORS)
else:
    dictionary_lines = read(DICTIONARY)
    TITLE_CASE_HITS = scan_title_case(
        TITLE_CASE_RULE, json.loads('\n'.join(dictionary_lines)))
    for where, en, bad in TITLE_CASE_HITS:
        if en is None:
            report('32', NOTATION_RULES, 0,
                   'the Title Case row names %s, which holds no English value '
                   'in %s' % (where, DICTIONARY))
            continue
        report('32', DICTIONARY, line_of(dictionary_lines, en),
               'the name %r (%s) is not in Title Case: %s -- the notation '
               'table, section 5 of %s (JDG-1862)'
               % (en, where, ' '.join(bad), NOTATION_RULES))

# ------------------------------------------------------- output

for f in sorted(findings):
    print(f)
print('')
print('check 12 (rule in a value/name table) : %d'
      % len([f for f in findings if f.startswith('12')]))
print('check 13 (transfer leftover, ADVISORY): %d'
      % len([a for a in advisory if a.startswith('13')]))
print('check 14 (value echoed, ADVISORY)     : %d'
      % len([a for a in advisory if a.startswith('14')]))
print('check 32 (forbidden word 部品)        : %d  (%d lines name the ban and '
      'are exempt)'
      % (len([f for f in findings if f.startswith('32')]),
         len([1 for rel in spec_markdown() for line in read(rel)
              if FORBIDDEN_WORD in line and NAMES_THE_BAN.search(line)])))
print('check 32 (gated spellings)            : %d rows of the notation '
      'table gate %s'
      % (len([p for p in SPELLING_PAIRS if p[1]]),
         ' '.join('%s->%s' % (b, w) for w, b in SPELLING_PAIRS if b)))
print('check 32 (Title Case names)           : %d name fields read, %d not in '
      'Title Case'
      % (len(TITLE_CASE_RULE[0]) if TITLE_CASE_RULE else 0,
         len([h for h in TITLE_CASE_HITS if h[1]])))
if advisory:
    print('')
    print('-- advisory: these are candidates to read, not proven defects.')
    for a in advisory[:25]:
        print('   ' + a)
    if len(advisory) > 25:
        print('   ... %d more' % (len(advisory) - 25))

sys.exit(1 if findings else 0)
