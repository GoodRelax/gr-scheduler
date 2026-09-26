# -*- coding: utf-8 -*-
"""Write the test inventory: one row per test file, and what each one ties to.

WHY THIS EXISTS (handoff 2026-09-26, chip P4). CR-573 put the tests into the
six places of table T-218 and said what is verified in table T-334, but no
list answered "which test stands behind which specification row". Re-sorting
the unit files that are left, and finding the use cases and requirements no
test names, both need that list, and a hand-kept list would drift the first
time a test is added. So it is generated, and `npm run gen:check` goes red when
it is stale.

READS   tests/**/*.test.ts, tests/known-red.txt, tests/fixtures/mspdi-xsd.json,
        docs/spec/_source/verification.json (tables T-334 and T-218),
        docs/spec/_source/state-machines.json (the regions VT-2 counts),
        docs/spec/*.md through specindex.py (every requirement node, table and
        row ID), and the `@purity` tags of the src/ functions a unit test
        imports
WRITES  docs/development-records/test-inventory.md

HOW A TEST TIES TO THE SPECIFICATION. An ID is read from three places only:
comments, the title of a describe / test / it / step / specMismatch call, and
the table named in a specTable(...) call. An ID ties when the specification
defines it (a requirement node, a table, or a table row). An ID in plain code
(press(page, 'IC-93')) is not read: that is what the test drives, not what it
claims to verify.

WHAT IT DOES NOT SEE. Titles built at run time (it.each over table rows) show
only their literal part, so the case count is the number of case SITES, not of
cases run. A unit test's target is read from its named imports of src/; a
function reached through a caller or a vi.mock factory is not seen, and a tag
is read from the doc comment right above the declaration only. Whether a test
asserts anything about what it names is not read at all.

Deterministic: every list is sorted and nothing carries a date, so the output
changes only when the tests or the specification change.

Usage:
    python tools/generate_test_inventory.py           write the inventory
    python tools/generate_test_inventory.py --check   exit 1 when it differs
"""
import collections
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_REL = 'docs/development-records/test-inventory.md'
TESTS_REL = 'tests'
KNOWN_RED_REL = 'tests/known-red.txt'
XSD_REL = 'tests/fixtures/mspdi-xsd.json'
VERIFICATION_REL = 'docs/spec/_source/verification.json'
MACHINES_REL = 'docs/spec/_source/state-machines.json'
SPEC_TOOLS_REL = '.claude/skills/spec-graph-check'

REQUIREMENT_PREFIXES = ('FR', 'NFR', 'UC', 'SWS')
GATE_TABLE = 'T-043'
GATE_WORD = u'\u30b2\u30fc\u30c8'        # the word table T-043 writes for a gate
EXCUSED_BY_TAG = ('pure', 'semi-pure-a')  # rule 04 table UO, row UO-1

ID = re.compile(r'(?<![A-Za-z0-9_-])([A-Z]{1,4}-[0-9]+[a-z]?)(?![A-Za-z0-9_])')
DFC = re.compile(r'\bDFC-[0-9]+\b')
TITLE_CONTEXT = re.compile(
    r'(?:(?<![\w$])(?:describe|it|test|step|specTable|specMismatch)(?:\.[A-Za-z]+)*'
    r'|\))\s*\(\s*$')
CASE_SITE = re.compile(
    r'(?<![\w$.])(it|test)((?:\.(?:only|skip|todo|concurrent|sequential|fails|fail))*)'
    r'(?:\.each\b|\s*\(\s*(\S))')
FAIL_MARK = re.compile(
    r'(?<![\w$.])(?:it|test)(?:\.[A-Za-z]+)*\.(?:fails|fail)\b|(?<![\w$.])specMismatch\s*\(')
SRC_IMPORT = re.compile(
    r'import\s+(type\s+)?\{([^}]*)\}\s*from\s*[\'"]((?:\.\./)+src/[^\'"]+)[\'"]')


def say(message):
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def read(rel):
    with io.open(os.path.join(ROOT, rel), encoding='utf-8') as handle:
        return handle.read().replace('\r\n', '\n')


# -- a small TypeScript lexer: comments and string literals ------------------

def _scan_quoted(text, i):
    quote = text[i]
    j = i + 1
    while j < len(text):
        ch = text[j]
        if ch == '\\':
            j += 2
            continue
        if ch == quote or ch == '\n':
            return j + 1
        j += 1
    return j


def _scan_template(text, i):
    j = i + 1
    depth = 0
    while j < len(text):
        ch = text[j]
        if depth == 0:
            if ch == '\\':
                j += 2
                continue
            if ch == '`':
                return j + 1
            if ch == '$' and text[j + 1:j + 2] == '{':
                depth = 1
                j += 2
                continue
        else:
            if ch in '\'"':
                j = _scan_quoted(text, j)
                continue
            if ch == '`':
                j = _scan_template(text, j)
                continue
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
        j += 1
    return j


def _scan_regex(text, i):
    j = i + 1
    in_class = False
    while j < len(text) and text[j] != '\n':
        ch = text[j]
        if ch == '\\':
            j += 2
            continue
        if ch == '[':
            in_class = True
        elif ch == ']':
            in_class = False
        elif ch == '/' and not in_class:
            j += 1
            while j < len(text) and (text[j].isalpha()):
                j += 1
            return j
        j += 1
    return j


def lex(text):
    """(comments, strings, code): comment texts, (start, body) of every string
    literal, and the text with comments blanked (newlines kept)."""
    comments = []
    strings = []
    code = list(text)
    prev = ''
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        two = text[i:i + 2]
        if two == '//':
            j = text.find('\n', i)
            j = n if j < 0 else j
            comments.append(text[i + 2:j])
            for k in range(i, j):
                code[k] = ' '
            i = j
            continue
        if two == '/*':
            j = text.find('*/', i + 2)
            j = n if j < 0 else j + 2
            comments.append(text[i + 2:j - 2])
            for k in range(i, j):
                if code[k] != '\n':
                    code[k] = ' '
            i = j
            continue
        if ch in '\'"':
            j = _scan_quoted(text, i)
            strings.append((i, text[i + 1:j - 1]))
            prev = 'a'
            i = j
            continue
        if ch == '`':
            j = _scan_template(text, i)
            strings.append((i, text[i + 1:j - 1]))
            prev = 'a'
            i = j
            continue
        if ch == '/' and (prev == '' or prev in '(,=:[!&|?{};+-*%<>~^'):
            i = _scan_regex(text, i)
            prev = 'a'
            continue
        if not ch.isspace():
            prev = 'a' if (ch.isalnum() or ch in '_$)]') else ch
        i += 1
    return comments, strings, ''.join(code)


# -- the specification -------------------------------------------------------

class Spec(object):
    def __init__(self):
        sys.path.insert(0, os.path.join(ROOT, *SPEC_TOOLS_REL.split('/')))
        cwd = os.getcwd()
        os.chdir(ROOT)
        try:
            import specindex
            idx = specindex.build('.')
        finally:
            os.chdir(cwd)
        self.uids = set(idx.uids)
        self.tables = set(t for t in idx.all_tables if t.startswith('T-'))
        self.rows = set(idx.all_rows)
        self.row_table = dict((r, o[0][0]) for r, o in idx.row_owner.items())
        self.requirements = sorted(
            (u for u in self.uids if u.split('-')[0] in REQUIREMENT_PREFIXES),
            key=id_key)
        self.use_cases = [u for u in self.requirements if u.startswith('UC-')]
        self.gate_rows = self._gate_rows(idx)

        verification = json.loads(read(VERIFICATION_REL))
        self.places = dict((row['folder'].rstrip('/').split('/')[-1], row['id'])
                           for row in verification['places']['rows'])
        self.verifies = collections.defaultdict(list)
        for row in verification['targets']['rows']:
            for ts in row['verifiedBy']:
                self.verifies[ts].append(row['id'])

        machines = json.loads(read(MACHINES_REL))
        self.regions = sorted((region['table']['id'], region['region'])
                              for region in machines['regions'])

    @staticmethod
    def _gate_rows(idx):
        table = idx.tables.get(GATE_TABLE)
        if not table:
            return []
        lines = idx.lines[table['file']]
        header = None
        gates = []
        for line in lines[table['line']:]:
            if not line.startswith('|'):
                if header is not None:
                    break
                continue
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if header is None:
                header = cells
                continue
            if set(''.join(cells)) <= set(':- '):
                continue
            if GATE_WORD in cells:
                gates.append(cells[0].strip('`* '))
        return gates

    def ties(self, found):
        return sorted((i for i in found
                       if i in self.uids or i in self.tables or i in self.rows),
                      key=id_key)


def id_key(ident):
    m = re.match(r'([A-Z]+)-([0-9]+)([a-z]?)$', ident)
    if not m:
        return (ident, 0, '')
    return (m.group(1), int(m.group(2)), m.group(3))


# -- the tests ---------------------------------------------------------------

def test_files():
    out = []
    base = os.path.join(ROOT, TESTS_REL)
    for folder, dirs, files in os.walk(base):
        dirs.sort()
        for name in sorted(files):
            if name.endswith('.test.ts'):
                rel = os.path.relpath(os.path.join(folder, name), ROOT)
                out.append(rel.replace('\\', '/'))
    return sorted(out)


def known_red():
    """{file: [(dfc, flaky, case), ...]} and the lines naming a missing file."""
    by_file = collections.defaultdict(list)
    for line in read(KNOWN_RED_REL).split('\n'):
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        cells = [c.strip() for c in line.split(' | ')]
        if len(cells) < 6:
            continue
        by_file[cells[1]].append((cells[0], cells[4] == 'flaky', cells[2]))
    return by_file


def xsd_readers():
    return set(json.loads(read(XSD_REL)).get('readers', []))


def line_of(text, pos):
    return text.count('\n', 0, pos)


def cell(text, limit=90):
    text = ' '.join(text.split())
    if len(text) > limit:
        text = text[:limit - 3].rstrip() + '...'
    return text.replace('|', '\\|').replace('`', "'")


class TestFile(object):
    def __init__(self, rel, spec, reds, readers):
        self.rel = rel
        parts = rel.split('/')
        self.place = parts[1] if len(parts) > 2 else '(top)'
        self.ts = spec.places.get(self.place)
        text = read(rel)
        comments, strings, code = lex(text)

        claimed = set()
        for body in comments:
            claimed.update(ID.findall(body))
        titles = []
        for start, body in strings:
            if TITLE_CONTEXT.search(code[max(0, start - 160):start]):
                titles.append((start, body))
                claimed.update(ID.findall(body))
        self.ties = spec.ties(claimed)
        self.dfc = sorted(set(i for i in claimed if i.startswith('DFC-')), key=id_key)
        self.uo = sorted(set(i for i in claimed if i.startswith('UO-')), key=id_key)

        self.cases = 0
        for m in CASE_SITE.finditer(code):
            mods, first = m.group(2), m.group(3)
            if '.fail' in mods and '.fails' not in mods and first not in (None, '\'', '"', '`'):
                continue                    # Playwright test.fail(cond): an annotation
            self.cases += 1

        self.reds = reds.get(rel, [])
        lines = text.split('\n')
        self.marks = []
        for m in FAIL_MARK.finditer(code):
            ln = line_of(text, m.start())
            title = next((body for start, body in titles
                          if m.start() < start < m.start() + 400), None)
            near = '\n'.join(lines[max(0, ln - 3):ln + 1]) + '\n' + (title or '')
            rows = sorted(set(DFC.findall(near)), key=id_key)
            via_list = False
            if not rows and title:
                # specMismatch names no row; known-red.txt ties the row to the case text.
                rows = sorted(set(d for d, _, case in self.reds if case in title), key=id_key)
                via_list = bool(rows)
            self.marks.append((title, rows, via_list))

        self.xsd = rel in readers
        self.requirements = [i for i in self.ties
                             if i.split('-')[0] in REQUIREMENT_PREFIXES and i in spec.uids]
        self.tables = [i for i in self.ties if i in spec.tables]
        self.rows = [i for i in self.ties if i in spec.rows]
        self.vt = self._vt(spec)
        self.imports = []

    def _vt(self, spec):
        out = []
        for vt in spec.verifies.get(self.ts, []):
            if vt == 'VT-1' and any(i.startswith('UC-') for i in self.requirements):
                out.append(vt)
            elif vt == 'VT-2' and any(t in self.tables for t, _ in spec.regions):
                out.append(vt)
            elif vt == 'VT-3' and any(r in spec.gate_rows for r in self.rows):
                out.append(vt)
        return out


# -- what a unit test imports from src/ --------------------------------------

class Source(object):
    """The exported callables of src/ and the `@purity` tag above each."""

    def __init__(self):
        self.cache = {}

    def module(self, rel):
        for cand in (rel, rel + '.ts', rel + '/index.ts'):
            if os.path.isfile(os.path.join(ROOT, cand)) and cand.endswith('.ts'):
                return cand
        return None

    def text(self, rel):
        if rel not in self.cache:
            self.cache[rel] = read(rel)
        return self.cache[rel]

    def lookup(self, rel, name, depth=0):
        """(kind, tag) for `name` as exported by module `rel`."""
        if rel is None or depth > 6:
            return ('unresolved', None)
        text = self.text(rel)
        lines = text.split('\n')
        decl = re.compile(
            r'^export\s+(?:default\s+)?(?:declare\s+)?(async\s+function|function\*?|const|let|class|'
            r'type|interface|enum|abstract\s+class)\s+' + re.escape(name) + r'\b')
        local = re.compile(
            r'^(?:async\s+)?(function\*?|const|let|class)\s+' + re.escape(name) + r'\b')
        for pattern in (decl, None):
            for n, line in enumerate(lines):
                m = pattern.match(line) if pattern else None
                if m:
                    return self._kind(m.group(1), line, name), self._tag(lines, n)
            if pattern is decl and re.search(
                    r'export\s*\{[^}]*\b' + re.escape(name) + r'\b[^}]*\}\s*;?\s*$', text, re.M):
                for n, line in enumerate(lines):
                    m = local.match(line)
                    if m:
                        return self._kind(m.group(1), line, name), self._tag(lines, n)
                found = self._imported(rel, text, name, depth)
                if found:
                    return found
        base = os.path.dirname(rel)
        for m in re.finditer(r'export\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]', text):
            for item in m.group(1).split(','):
                bits = item.replace('type ', '').split(' as ')
                if bits[-1].strip() == name:
                    target = self.module(os.path.normpath(os.path.join(base, m.group(2))).replace('\\', '/'))
                    return self.lookup(target, bits[0].strip(), depth + 1)
        for m in re.finditer(r'export\s*\*\s*from\s*[\'"]([^\'"]+)[\'"]', text):
            target = self.module(os.path.normpath(os.path.join(base, m.group(1))).replace('\\', '/'))
            kind, tag = self.lookup(target, name, depth + 1)
            if kind != 'unresolved':
                return kind, tag
        return ('unresolved', None)

    def _imported(self, rel, text, name, depth):
        """A name a module re-exports after importing it: `import { f } from './x'`."""
        base = os.path.dirname(rel)
        for m in re.finditer(r'import\s*\{([^}]*)\}\s*from\s*[\'"](\.[^\'"]*)[\'"]', text):
            for item in m.group(1).split(','):
                bits = item.replace('type ', '').split(' as ')
                if bits[-1].strip() == name:
                    target = self.module(os.path.normpath(os.path.join(base, m.group(2))).replace('\\', '/'))
                    return self.lookup(target, bits[0].strip(), depth + 1)
        return None

    @staticmethod
    def _kind(word, line, name):
        word = word.split()[-1]
        if word in ('type', 'interface', 'enum'):
            return 'type'
        if word == 'class':
            return 'class'
        if word in ('const', 'let'):
            rest = line.split(name, 1)[1]
            if re.match(r'\s*(?::[^=]*)?=\s*(?:async\s*)?(?:\(|[A-Za-z_$][\w$]*\s*=>|function\b)', rest):
                return 'function'
            return 'value'
        return 'function'

    @staticmethod
    def _tag(lines, n):
        j = n - 1
        while j >= 0 and not lines[j].strip():
            j -= 1
        if j < 0 or not lines[j].rstrip().endswith('*/'):
            return None
        block = []
        while j >= 0:
            block.append(lines[j])
            if '/**' in lines[j]:
                break
            j -= 1
        m = re.search(r'@purity\s+([a-z-]+)', '\n'.join(block))
        return m.group(1) if m else None


def unit_imports(test, source):
    text = read(test.rel)
    out = []
    for m in SRC_IMPORT.finditer(text):
        if m.group(1):
            continue
        base = os.path.dirname(test.rel)
        target = source.module(os.path.normpath(os.path.join(base, m.group(3))).replace('\\', '/'))
        for item in m.group(2).split(','):
            item = item.strip()
            if not item or item.startswith('type '):
                continue
            name = item.split(' as ')[0].strip()
            kind, tag = source.lookup(target, name)
            if kind in ('type', 'value'):
                continue
            out.append((name, kind, tag))
    return sorted(set(out))


# -- rendering ---------------------------------------------------------------

def ids(items):
    return ', '.join(items) if items else '-'


def build():
    spec = Spec()
    reds = known_red()
    readers = xsd_readers()
    files = [TestFile(rel, spec, reds, readers) for rel in test_files()]
    source = Source()
    for f in files:
        if f.place == 'unit':
            f.imports = unit_imports(f, source)

    out = []
    w = out.append
    w('# Test inventory')
    w('')
    w('GENERATED by `tools/generate_test_inventory.py` -- do not edit by hand.')
    w('Rebuild: `npm run gen:tests`. `npm run gen:check` and check 74 fail when this is stale.')
    w('')
    w('One row per test file (`tests/**/*.test.ts`). An ID ties a test to the specification only')
    w('when it stands in a comment, in a describe / test / it / step / specMismatch title, or in a')
    w('`specTable(...)` call, AND the specification defines it. The generator\'s docstring says')
    w('what this reading does not see.')
    w('')

    # 1. counts per place
    places = sorted(set(f.place for f in files))
    w('## 1. Counts per place')
    w('')
    w('| place | T-218 | T-334 | files | case sites | expected-to-fail marks | known-red lines | '
      'need the MSPDI XSDs | tied to no spec row |')
    w('| --- | --- | --- | --: | --: | --: | --: | --: | --: |')
    total = collections.Counter()
    for place in places:
        group = [f for f in files if f.place == place]
        ts = spec.places.get(place)
        row = collections.Counter(
            files=len(group), cases=sum(f.cases for f in group),
            marks=sum(len(f.marks) for f in group), reds=sum(len(f.reds) for f in group),
            xsd=sum(1 for f in group if f.xsd), untied=sum(1 for f in group if not f.ties))
        total.update(row)
        w('| `%s` | %s | %s | %d | %d | %d | %d | %d | %d |' % (
            place, ts or '(not a T-218 place)', ids(spec.verifies.get(ts, [])),
            row['files'], row['cases'], row['marks'], row['reds'], row['xsd'], row['untied']))
    w('| **all** | | | %d | %d | %d | %d | %d | %d |' % (
        total['files'], total['cases'], total['marks'], total['reds'], total['xsd'], total['untied']))
    w('')
    w('"Case sites" counts the `it(` / `test(` / `.each` calls in the source; a site driven by')
    w('`.each` or a loop runs more cases than it counts here.')
    w('')

    # 2. table T-334
    w('## 2. Table T-334 -- what is verified, and what nothing verifies yet')
    w('')
    uc_named = set(i for f in files if f.place == 'usecase' for i in f.requirements)
    uc_missing = [u for u in spec.use_cases if u not in uc_named]
    region_named = set(t for f in files if f.place == 'contract' for t in f.tables)
    region_missing = ['%s (%s)' % (t, r) for t, r in spec.regions if t not in region_named]
    gate_named = set(r for f in files if f.place == 'nfr' for r in f.rows)
    gate_missing = [g for g in spec.gate_rows if g not in gate_named]
    # The population leads: a row ID in the first column would register VT as a records prefix.
    w('| population | T-334 row | counted | with a test | without a test |')
    w('| --- | --- | --: | --: | --- |')
    w('| the use cases (`UC-xxx`), named by a `tests/usecase` file | VT-1 | %d | %d | %s |' % (
        len(spec.use_cases), len(spec.use_cases) - len(uc_missing), ids(uc_missing)))
    w('| the regions of `state-machines.json`, their table named by a `tests/contract` file'
      ' | VT-2 | %d | %d | %s |' % (len(spec.regions), len(spec.regions) - len(region_missing),
                             ids(region_missing)))
    w('| the gate rows of table %s, named by a `tests/nfr` file | VT-3 | %d | %d | %s |' % (
        GATE_TABLE, len(spec.gate_rows), len(spec.gate_rows) - len(gate_missing),
        ids(gate_missing)))
    w('')

    # 3. requirements no test names
    named = set(i for f in files for i in f.requirements)
    w('## 3. Requirement nodes no test names')
    w('')
    w('Nodes with the prefixes %s. A node named only in a test of the wrong place still counts'
      ' as named.' % ', '.join('`%s`' % p for p in REQUIREMENT_PREFIXES))
    w('')
    w('| prefix | nodes | named by a test | named by none |')
    w('| --- | --: | --: | --- |')
    for prefix in REQUIREMENT_PREFIXES:
        nodes = [u for u in spec.requirements if u.split('-')[0] == prefix]
        missing = [u for u in nodes if u not in named]
        w('| %s | %d | %d | %s |' % (prefix, len(nodes), len(nodes) - len(missing), ids(missing)))
    w('')

    # 4. tests tied to no spec row
    untied = [f for f in files if not f.ties]
    w('## 4. Test files tied to no spec row (%d)' % len(untied))
    w('')
    if untied:
        w('| file | ledger rows it names instead |')
        w('| --- | --- |')
        for f in untied:
            w('| `%s` | %s |' % (f.rel, ids(f.dfc)))
    else:
        w('None.')
    w('')

    # 5. expected-to-fail cases
    marks = [(f, title, rows, via) for f in files for title, rows, via in f.marks]
    w('## 5. Expected-to-fail cases (%d)' % len(marks))
    w('')
    w('`it.fails` / `test.fail` / `specMismatch(...)`. The ledger row is a `DFC-` ID on the mark\'s')
    w('line, the three lines above it, or its title; failing that, the `known-red.txt` lines of the')
    w('file whose case text the title contains ("via known-red"). "none" means no ledger row is')
    w('named either way: %d of %d.' % (sum(1 for m in marks if not m[2]), len(marks)))
    w('')
    w('| file | case or reason | ledger row |')
    w('| --- | --- | --- |')
    for f, title, rows, via in marks:
        w('| `%s` | %s | %s |' % (
            f.rel, cell(title) if title is not None else '(title computed at run time)',
            (ids(rows) + (' (via known-red)' if via else '')) if rows else 'none'))
    w('')
    present = set(f.rel for f in files)
    stray = sorted((path, dfc) for path, entries in reds.items() for dfc, _, _ in entries
                   if path not in present)
    if stray:
        w('Known-red lines naming a file that is not a test file here: %s' % ', '.join(
            '`%s` (%s)' % (p, d) for p, d in stray))
        w('')

    # 6. the unit files
    unit = [f for f in files if f.place == 'unit']
    candidates = [f for f in unit if f.imports and all(
        kind == 'function' and tag in EXCUSED_BY_TAG for _, kind, tag in f.imports)]
    w('## 6. The unit files kept for now (%d) -- listing only' % len(unit))
    w('')
    w('Re-sorting them waits for the change-request organisation (handoff 2026-09-26). "Imports"')
    w('are the callables the file imports by name from `src/`, each with the `@purity` tag above')
    w('its declaration. "UO-1 would omit" marks a file whose every such import is tagged `pure` /')
    w('`semi-pure-a` (rule 04 table UO, row UO-1): %d of %d.' % (len(candidates), len(unit)))
    w('')
    w('| file | imports from src/ (tag) | UO-1 would omit | ties |')
    w('| --- | --- | --- | --- |')
    for f in unit:
        listed = ', '.join('%s (%s)' % (name, tag or ('untagged' if kind == 'function' else kind))
                           for name, kind, tag in f.imports) or '-'
        w('| `%s` | %s | %s | %s |' % (f.rel, listed, 'yes' if f in candidates else '-',
                                       ids(f.requirements + f.tables) if (f.requirements or f.tables)
                                       else ('%d rows' % len(f.rows) if f.rows else '-')))
    w('')

    # 7. every file
    w('## 7. Every test file')
    w('')
    w('| file | cases | requirement nodes | T-334 | tables | table rows | UO rows named | known red |'
      ' expected-to-fail | XSD |')
    w('| --- | --: | --- | --- | --- | --- | --- | --- | --- | --- |')
    for f in files:
        red = ', '.join('%s%s' % (d, ' (flaky)' if flaky else '') for d, flaky, _ in f.reds) or '-'
        fails = ', '.join(r for _, rows, _ in f.marks for r in (rows or ['none']))
        w('| `%s` | %d | %s | %s | %s | %s | %s | %s | %s | %s |' % (
            f.rel, f.cases, ids(f.requirements), ids(f.vt), ids(f.tables), ids(f.rows),
            ids(f.uo), red, ('%d: %s' % (len(f.marks), fails)) if f.marks else '-',
            'yes' if f.xsd else '-'))
    w('')
    return '\n'.join(out), dict(
        files=len(files), unit=len(unit), candidates=len(candidates), untied=len(untied),
        marks=len(marks), uc_missing=len(uc_missing), region_missing=len(region_missing),
        gate_missing=len(gate_missing),
        req_missing=len([u for u in spec.requirements if u not in named]),
        requirements=len(spec.requirements))


def main(argv):
    text, counts = build()
    path = os.path.join(ROOT, *OUT_REL.split('/'))
    if '--check' in argv:
        try:
            with io.open(path, encoding='utf-8', newline='') as handle:
                current = handle.read()
        except OSError:
            current = None
        if current != text:
            say('STALE  %s differs from what the tests and the specification give; '
                'run npm run gen:tests' % OUT_REL)
            return 1
        say('OK     %s is current (%d test files)' % (OUT_REL, counts['files']))
        return 0
    with io.open(path, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(text)
    say('wrote %s: %d test files, %d unit (%d UO-1 would omit), %d tied to no spec row, '
        '%d expected-to-fail marks; without a test: %d UC, %d regions, %d gate rows, '
        '%d of %d requirement nodes' % (
            OUT_REL, counts['files'], counts['unit'], counts['candidates'], counts['untied'],
            counts['marks'], counts['uc_missing'], counts['region_missing'],
            counts['gate_missing'], counts['req_missing'], counts['requirements']))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
