# -*- coding: utf-8 -*-
"""Check 55 -- the comments of src/ against ruling 17.

docs/review/comment-rules-src.md (ruling 17) settles what a comment under src/
may be: printable ASCII only, no more than 10% of the lines, and one of a
closed set of forms. This check measures all three over every `.ts` file under
src/ and holds their sum against a ratchet.

WHAT A LINE IS

  code line     a line that still holds a character other than whitespace or
                `/` once comments are removed and the insides of strings,
                template literals and regex literals are blanked.
  comment line  a line holding any comment text. A trailing comment
                (`code // see GR-21`) makes its line a comment line as well as
                a code line. A line that is only `/**`, ` *` or ` */` is a
                comment line.
  not counted   a line whose only comment is an `@purity <value>` tag, and
                every line from `<generated -- do not edit by hand>` to
                `</generated>`, which is neither code nor comment.
                A `@purity n/a` line IS counted: the Node measurement's
                value pattern admits no slash, and parity with it is
                kept. The form check still reads it as a tag.

Comments are found by a lexer, not by a line regex: strings, template literals
with `${}` nesting, regex literals, and block and line comments. It is a port
of the Node lexer the cleanup round measured with, kept faithful to it --
including where that lexer approximates (a regex literal is recognised from
the previous significant character) -- so that the two agree to the line.

THE THREE MEASURES

  1. Density = comment lines / (code lines + comment lines). The ruling caps it
     at 10% for the tree, and again for each file with 100 or more code lines.
     In lines, 10% means comment lines <= floor(code lines / 9).

  2. Non-ASCII: counted comment lines holding a character outside 0x20-0x7E.

  3. Form. Every comment is one of these, and anything else is a violating
     line:
       `// see <ID>[, <ID>...]`   1 line
       `// TRAP: ...`             2 lines
       `// WHY: ...`              2 lines
       `// STOP: ...`             3 lines, a mark line included, and linked to
                                  its pending-decision row (below)
       `// DEVIATION: ...`        2 lines
       `/** @purity <value> */`   1 line (and not counted at all, as above)
       `@provisional PND-n` and `@seam ...` tag lines, in any comment
       the file header -- the comment on the first non-blank line of the file:
         one role line, `@unit` / `@component` / `@publishes` / `@seam` /
         `@provisional` tag lines and empty lines, 5 lines in all; 9 when the
         file has a generated region and the header holds a provenance
         paragraph (one saying "generated" and "by hand", which check 21 asks
         of a generated artifact)

     A block is a run of full-line `//` comments on consecutive lines, or one
     `/* */` comment. Within a block, each line opening a form starts a new
     form, and an empty line ends one. A trailing comment is a block of its
     own and must open with an allowed head.

     How violating lines are counted:
       - a line in no form is one violating line: prose, an empty `//` or ` *`
         line outside the header, a `/**` or ` */` delimiter line, a `TRAP:`
         head written inside a `/* */` comment, a tag outside the header that
         only the header may carry;
       - a form longer than its budget contributes the lines past the budget;
       - in the header: a second role line or any other prose, empty lines
         after the last allowed line, and allowed lines past the budget.
     So `/**\\n * @purity pure\\n */` is 2 violating lines (the delimiters), and
     `/** @purity pure */` is none. A line holding two comments counts once.

     A STOP form is also held to its row in
     docs/development-records/pending-decisions.md (ruling 18). It passes
     only in one of two shapes:
       (a) an `@provisional PND-n` mark sits in the form, or in the 3 lines
           after it before another form opens, and every row it names is
           class A-C;
       (b) no mark, the form's text ends with `(PND-n)`, and that row is
           class D-H.
     A mark naming a missing or D-H row, a closing `(PND-n)` naming a missing
     or A-C row, or neither shape, is one violating line: the STOP head.

     The ledger is read by splitting each table line on unescaped `|`. A row
     is one whose first cell is `PND-n`; its class is the fourth cell when that
     cell is one letter A-H, or else the first one-letter A-H cell followed by
     a wave cell (`W<n>`), so a stray `|` in a free-text cell does not lose it.
     A row whose class is found neither way counts as missing here; check 25
     reports it as malformed.

THE NUMBER HELD (line 1 of comment-rules-baseline.txt)

    held = A + B + C + D
      A  non-ASCII comment lines
      B  form-violating lines
      C  the sum, over files with >= 100 code lines, of
         max(0, comment lines - floor(code lines / 9))
      D  max(0, tree comment lines - floor(tree code lines / 9))

  Each term is one rule of the ruling, and a line breaking several rules is
  counted once under each. Each term falls only when a comment is fixed or
  removed, and each is 0 on a tree that obeys the ruling.

  The baseline is a ratchet, in the shape of the other baselines here: the
  count rising above line 1 FAILS; the count falling prints OK and asks for
  line 1 to be lowered in the same commit.

TESTS/ (JDG-62, record 15 of refactor-plan-report-2026-09-13.md)

  Every `.ts` file under tests/ is measured by the same lexer and the same
  form rules, with two differences the ruling makes:

    - one more form, `// STEP: ...`: 1 line per step, and no more than 3 STEP
      lines inside one test -- the parenthesised call of `it(...)` or
      `test(...)` (with `.each(...)`, `.skip`, `.only` and the like), taken
      innermost when calls nest. A STEP line past the 3rd in one test is a
      violating line, and so is a STEP line in no test body at all (the
      ruling gives the budget per test and says nothing else, so the
      stricter reading is held until it does). "No wording of a clause" is
      held only as far as the character rule holds it: ASCII cannot carry a
      Japanese clause. Nothing more is read.
    - no 10% cap. The ruling holds the density against its present value and
      leaves the cap to stage 8, so C and D above do not apply.

  Test titles and data strings are never counted: the lexer finds comments
  only, and the first argument of `it` / `describe` is a string.

  THE NUMBERS HELD (comment-rules-tests-baseline.txt)

    per file   non-ASCII comment lines + form-violating lines, as A + B above
    tree       comment lines * 10000 // (code lines + comment lines), the
               density in basis points, floored

  A file rising above its line FAILS, and so does a file missing from the
  baseline with any count above 0 (a new or renamed test starts clean), and
  so does the tree density rising above its line. A fall prints OK and names
  the lines to lower in the same commit -- the shape of every other ratchet
  here (checks 28, 29, 31, 39, 40, 42, 44, 45, 46 and the src/ half above):
  a fall that failed would redden every parallel body that fixes a comment
  before the front session re-counts at the merge, and the ground is still
  held because the next rise is measured against the lowered line.

BROKEN ON PURPOSE (`--self-test`, measured 2026-09-14)

  `--self-test` measures a small test file held in memory, through the same
  measure_text() and the same tests verdict the gate uses, never writing to
  tests/. A clean file with 3 STEP lines inside one `it` is green. Adding one
  Japanese comment line makes it red with 2 counted lines (non-ASCII and in
  no form) and a density rise; a 4th STEP line in the same `it` makes it red
  with 1; one STEP line above the `it` makes it red with 1; putting the clean
  file back is green again. check.sh runs it before the gate, so a gate that
  can no longer go red goes red itself.

WHAT THIS DOES NOT SEE

  - Placement. A `see` line belongs directly above a definition and a TRAP
    directly above the line it guards; neither position is checked.
  - Meaning. That a `see` line names the row its definition implements, that a
    TRAP is one no type or test stops, that a DEVIATION has its ledger row --
    none of it is read, and neither is section 4 of the ruling (what not to
    write).
  - The rest of a head's sentence. `STOP:` and `DEVIATION:` are matched on the
    keyword alone, not on the ruling's template; of a STOP only the PND link
    is read, and of a DEVIATION not even its `(DFC-n)`. A `(PND-n)` that does
    not close the form's text is not a link.
  - Whether a ledger row's class is the right one. The class cell is taken as
    written, as check 25 takes it.
  - Every tree but src/ and tests/. tools/ is not read, nor any file but `.ts`.
  - In tests/, what a STEP says, and whether a test body is really a test: a
    call spelled `it(` or `test(` is taken as one.

Usage:

    python .claude/skills/spec-graph-check/check-comment-rules.py
    python .claude/skills/spec-graph-check/check-comment-rules.py --list [tests]
    python .claude/skills/spec-graph-check/check-comment-rules.py --file <path>
    python .claude/skills/spec-graph-check/check-comment-rules.py --self-test
    python .claude/skills/spec-graph-check/check-comment-rules.py --write-tests-baseline

`--list` prints every src/ file's measures and marks the files over 10%;
`--list tests` does the same for tests/. `--file` reads only the one file
named, under src/ or tests/, and prints its measures and each finding by line
(and, under tests/, its baseline line). Both exit 0. `--write-tests-baseline`
rewrites comment-rules-tests-baseline.txt from the tree as it stands -- only
at a merge re-count or on purpose, said in the commit.
Exit 0 green, 1 red.
"""
import bisect
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SRC = os.path.join(ROOT, 'src')
TESTS = os.path.join(ROOT, 'tests')
BASELINE = os.path.join(HERE, 'comment-rules-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/comment-rules-baseline.txt'
TESTS_BASELINE = os.path.join(HERE, 'comment-rules-tests-baseline.txt')
REL_TESTS_BASELINE = ('.claude/skills/spec-graph-check/'
                      'comment-rules-tests-baseline.txt')
TESTS_RULING = 'JDG-62 (refactor-plan-report-2026-09-13.md, record 15)'
DENSITY_KEY = 'tree-density-basis-points'
RULING = 'docs/review/comment-rules-src.md'
LEDGER = os.path.join(ROOT, 'docs', 'development-records',
                      'pending-decisions.md')
REL_LEDGER = 'docs/development-records/pending-decisions.md'

GEN_OPEN = '<generated -- do not edit by hand>'
GEN_CLOSE = '</generated>'

# A file is held to 10% on its own from this many code lines up.
FILE_FLOOR = 100
# comment <= floor(code / RATIO) is exactly comment / (code + comment) <= 10%.
RATIO = 9

HEADER_MAX = 5
PROVENANCE_EXTRA = 4

BUDGET = {'see': 1, 'TRAP': 2, 'WHY': 2, 'STOP': 3, 'DEVIATION': 2}
HEADS = (('TRAP:', 'TRAP'), ('WHY:', 'WHY'), ('STOP:', 'STOP'),
         ('DEVIATION:', 'DEVIATION'))

# tests/ only (JDG-62): the STEP form, 1 line, at most STEP_PER_TEST per test.
TESTS_BUDGET = dict(BUDGET, STEP=1)
TESTS_HEADS = HEADS + (('STEP:', 'STEP'),)
STEP_PER_TEST = 3
RULES = {'src': (BUDGET, HEADS), 'tests': (TESTS_BUDGET, TESTS_HEADS)}

# JavaScript's \s, which is also the set String.prototype.trim removes. The
# density must agree with the Node measurement, so Python's own idea of
# whitespace is not used.
JS_SPACE = u''.join(chr(point) for point in (
    0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680, 0x2000, 0x2001,
    0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009,
    0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff))
SPACE_SET = frozenset(JS_SPACE)
SPACE_OR_SLASH = frozenset(JS_SPACE + u'/')
WS = (u'[\\t\\n\\x0b\\x0c\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029'
      u'\\u202f\\u205f\\u3000\\ufeff]')

# The body of a comment line as the Node measurement strips it.
NODE_LEADERS = re.compile(u'/\\*\\*|/\\*|\\*/|//+|^' + WS + u'*\\*')
NODE_STARS = re.compile(u'^' + WS + u'*\\*|' + WS + u'\\*' + WS)
PURITY_ONLY = re.compile(u'@purity' + WS + u'+[A-Za-z0-9_-]+')
NON_ASCII = re.compile(u'[^\\x20-\\x7e]')

ID = u'[A-Z]{1,4}-[0-9]+[a-z]?'
SEE = re.compile(u'see' + WS + u'+' + ID + u'(?:' + WS + u'*,' + WS + u'*' +
                 ID + u')*')
# `@purity n/a` is a tag here although the density above counts its line:
# PURITY_ONLY keeps to the Node measurement, whose value pattern has no slash.
TAG_ANYWHERE = re.compile(u'@provisional' + WS + u'+PND-[0-9]+|@seam' + WS +
                          u'+\\S.*|@purity' + WS + u'+[a-z/-]+')
TAG_HEADER = re.compile(u'@(?:unit|component|publishes|seam)' + WS +
                        u'+\\S.*|@provisional' + WS + u'+PND-[0-9]+|@purity' +
                        WS + u'+[a-z/-]+')

# A test: `it(` / `test(`, optionally through `.each(...)`, `.skip` and the
# like, matched on the lexed code so a title or a regex cannot open one.
TEST_CALL = re.compile(u'(?<![A-Za-z0-9_$.])(?:it|test)((?:' + WS +
                       u'*\\.' + WS + u'*[A-Za-z]+)*)' + WS + u'*\\(')

# Ruling 18: how a STOP names its pending-decision row.
PROVISIONAL = re.compile(u'@provisional' + WS + u'+(PND-[0-9]+)')
CLOSING_PND = re.compile(u'\\((PND-[0-9]+)\\)$')
# A mark this many lines past a STOP form is still that STOP's mark.
MARK_REACH = 3
MARKED_CLASSES = frozenset(u'ABC')
CLOSED_CLASSES = frozenset(u'DEFGH')
LEDGER_CELL = re.compile(u'(?<!\\\\)\\|')
LEDGER_ID = re.compile(u'PND-[0-9]+')
LEDGER_CLASS = re.compile(u'[A-H]')
LEDGER_WAVE = re.compile(u'W[0-9]+')

WORD = frozenset(u'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'
                 u'0123456789.')
LETTER = frozenset(u'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
REGEX_AFTER_CHAR = frozenset(u'(,=:[!&|?{};+-*%<>~^')
REGEX_AFTER_WORD = frozenset((u'return', u'typeof', u'case', u'in', u'of',
                              u'void', u'yield', u'await'))


def say(message):
    """Print ASCII whatever the console's code page."""
    sys.stdout.write(message.encode('ascii', 'backslashreplace')
                     .decode('ascii') + '\n')


def read_ledger():
    """PND id -> class letter, from the table rows of the pending-decision list.

    None when the list is missing. See the docstring above for how a row and
    its class are found.
    """
    if not os.path.exists(LEDGER):
        return None
    classes = {}
    with io.open(LEDGER, encoding='utf-8', errors='replace') as handle:
        for line in handle:
            text = line.strip()
            if not text.startswith(u'|'):
                continue
            cells = [cell.strip().strip(u'*`').strip()
                     for cell in LEDGER_CELL.split(text)[1:-1]]
            if not cells or not LEDGER_ID.fullmatch(cells[0]):
                continue
            letter = None
            if len(cells) > 4 and LEDGER_CLASS.fullmatch(cells[3]):
                letter = cells[3]
            else:
                for k in range(1, len(cells) - 1):
                    if (LEDGER_CLASS.fullmatch(cells[k])
                            and LEDGER_WAVE.fullmatch(cells[k + 1])):
                        letter = cells[k]
                        break
            if letter is not None:
                classes[cells[0]] = letter
    return classes


def lex(src):
    """Split a source into its code and its comments.

    Returns (code, comments). `code` is the source with every comment removed
    and the insides of strings, templates and regex literals blanked; the
    newlines it keeps are the ones the line numbers below count. `comments` is
    a list of (kind, first_line, texts): kind 'line' or 'block', one text per
    physical line.

    A faithful port of the Node lexer, approximations included: a newline
    inside an unterminated string or regex literal is swallowed, as it is
    there, so the two measurements agree.
    """
    n = len(src)
    out = []
    comments = []
    braces = []
    state = {'line': 1}

    def template(i):
        """Inside a template literal from i; returns (i, last_sig or None)."""
        out.append(u'`')
        while i < n:
            c = src[i]
            if c == u'\\':
                i += 2
                out.append(u' ')
                continue
            if c == u'`':
                out.append(u'`')
                return i + 1, u'`'
            if c == u'$' and src[i + 1:i + 2] == u'{':
                out.append(u'$')
                out.append(u'{')
                braces.append('tpl')
                return i + 2, u'{'
            if c == u'\n':
                out.append(u'\n')
                state['line'] += 1
            else:
                out.append(u' ')
            i += 1
        return i, None

    i = 0
    sig = u''
    word = u''
    while i < n:
        c = src[i]
        nxt = src[i + 1:i + 2]
        if c == u'/' and nxt == u'/':
            end = src.find(u'\n', i)
            if end < 0:
                end = n
            comments.append(('line', state['line'], [src[i:end]]))
            i = end
            continue
        if c == u'/' and nxt == u'*':
            end = src.find(u'*/', i + 2)
            stop = n if end < 0 else end + 2
            parts = src[i:stop].split(u'\n')
            comments.append(('block', state['line'], parts))
            out.append(u'\n' * (len(parts) - 1))
            state['line'] += len(parts) - 1
            i = stop
            continue
        if c == u'"' or c == u"'":
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == u'\\':
                    j += 1
                j += 1
            out.append(c)
            out.append(c)
            i = j + 1
            sig = c
            continue
        if c == u'`':
            i, found = template(i + 1)
            if found is not None:
                sig = found
            continue
        if c == u'{':
            braces.append('code')
            out.append(c)
            i += 1
            sig = c
            continue
        if c == u'}':
            opened = braces.pop() if braces else None
            i += 1
            if opened == 'tpl':
                i, found = template(i)
                if found is not None:
                    sig = found
            else:
                out.append(u'}')
                sig = u'}'
            continue
        if c == u'/':
            if (sig == u'' or sig in REGEX_AFTER_CHAR
                    or word in REGEX_AFTER_WORD):
                j = i + 1
                in_class = False
                while j < n:
                    d = src[j]
                    if d == u'\\':
                        j += 2
                        continue
                    if d == u'[':
                        in_class = True
                    elif d == u']':
                        in_class = False
                    elif (d == u'/' and not in_class) or d == u'\n':
                        break
                    j += 1
                j += 1
                while j < n and src[j] in LETTER:
                    j += 1
                out.append(u'//')
                i = j
                sig = u'/'
                continue
        if c in WORD:
            j = i
            while j < n and src[j] in WORD:
                j += 1
            word = src[i:j]
            out.append(word)
            i = j
            sig = u'w'
            continue
        out.append(c)
        if c == u'\n':
            state['line'] += 1
        i += 1
        if c not in SPACE_SET:
            sig = c
            word = u''
    return u''.join(out), comments


def is_code(text):
    return any(ch not in SPACE_OR_SLASH for ch in text)


def generated_lines(lines):
    """1-based line numbers from each opening marker to its closing marker."""
    inside = False
    found = set()
    for number, text in enumerate(lines, 1):
        if GEN_OPEN in text:
            inside = True
        if inside:
            found.add(number)
        if GEN_CLOSE in text:
            inside = False
    return found


def body_of(text):
    """One physical comment line without its leader and closer."""
    s = text.strip(JS_SPACE)
    if s.startswith(u'//'):
        return s.lstrip(u'/').strip(JS_SPACE)
    if s.startswith(u'/**'):
        s = s[3:]
    elif s.startswith(u'/*'):
        s = s[2:]
    elif s.startswith(u'*') and not s.startswith(u'*/'):
        s = s[1:]
    if s.endswith(u'*/'):
        s = s[:-2]
    return s.strip(JS_SPACE)


def classify(body, line_comment, heads=HEADS):
    """'blank', 'tag', a key of the tree's budget, or None for a line in no form."""
    if body == u'':
        return 'blank'
    if TAG_ANYWHERE.fullmatch(body):
        return 'tag'
    if line_comment:
        if SEE.fullmatch(body):
            return 'see'
        for head, name in heads:
            if body.startswith(head):
                return name
    return None


def judge_block(rows, line_comment, found, stops, tree='src', steps=None):
    """Violating lines of one block that is not the file header.

    Each STOP form met is appended to `stops` as its (number, body) rows, and
    under tests/ each STEP head line to `steps`.
    """
    budget, heads = RULES[tree]
    head = None
    used = 0
    form = None
    for number, body in rows:
        kind = classify(body, line_comment, heads)
        if kind == 'blank':
            found.append((number, 'empty or delimiter-only comment line'))
            head = None
            form = None
            continue
        if kind in budget:
            head = kind
            used = 1
            form = None
            if kind == 'STOP':
                form = [(number, body)]
                stops.append(form)
            if kind == 'STEP' and steps is not None:
                steps.append(number)
            continue
        if head in budget:
            used += 1
            if form is not None:
                form.append((number, body))
            if used > budget[head]:
                found.append((number, '%s form longer than %d line(s)'
                               % (head, budget[head])))
            continue
        if kind == 'tag':
            head = 'tag'
            continue
        found.append((number, 'in no allowed form'))
        head = None


def judge_stop(form, by_line, ledger, found, tree='src'):
    """One STOP form against its pending-decision row (ruling 18)."""
    budget, heads = RULES[tree]
    number = form[0][0]
    marks = []
    for _number, body in form:
        marks.extend(PROVISIONAL.findall(body))
    if not marks:
        last = form[-1][0]
        for after in range(last + 1, last + 1 + MARK_REACH):
            text = by_line.get(after)
            if text is None:
                continue
            if classify(body_of(text), True, heads) in budget:
                break
            marks.extend(PROVISIONAL.findall(text))

    if marks:
        for pnd in marks:
            letter = ledger.get(pnd)
            if letter is None:
                found.append((number, 'STOP marked @provisional %s, which has '
                                      'no row in the ledger' % pnd))
                return
            if letter not in MARKED_CLASSES:
                found.append((number, 'STOP marked @provisional %s of class '
                                      '%s; D-H closes with (%s), unmarked'
                              % (pnd, letter, pnd)))
                return
        return

    text = u' '.join(body for _number, body in form).strip(JS_SPACE)
    closing = CLOSING_PND.search(text)
    if closing is None:
        found.append((number, 'STOP with neither @provisional PND-n nor a '
                              'closing (PND-n)'))
        return
    pnd = closing.group(1)
    letter = ledger.get(pnd)
    if letter is None:
        found.append((number, 'STOP closes with (%s), which has no row in the '
                              'ledger' % pnd))
    elif letter not in CLOSED_CLASSES:
        found.append((number, 'STOP closes with (%s) of class %s; A-C is '
                              'marked @provisional %s' % (pnd, letter, pnd)))


def judge_header(rows, has_generated, found):
    """Violating lines of the comment on the first non-blank line."""
    kinds = []
    role_seen = False
    for _number, body in rows:
        if body == u'':
            kinds.append('blank')
        elif TAG_HEADER.fullmatch(body):
            kinds.append('tag')
        elif not role_seen:
            kinds.append('role')
            role_seen = True
        else:
            kinds.append('prose')

    provenance = False
    if has_generated:
        k = 0
        while k < len(rows):
            if kinds[k] != 'prose':
                k += 1
                continue
            j = k
            while j < len(rows) and kinds[j] == 'prose':
                j += 1
            text = u' '.join(body for _n, body in rows[k:j]).lower()
            if u'generated' in text and u'by hand' in text:
                for m in range(k, j):
                    kinds[m] = 'provenance'
                provenance = True
                break
            k = j

    last = -1
    for k, kind in enumerate(kinds):
        if kind in ('role', 'tag', 'provenance'):
            last = k
    allowed = []
    for k, (number, _body) in enumerate(rows):
        kind = kinds[k]
        if kind == 'prose':
            found.append((number, 'header prose beyond its one role line'))
        elif kind == 'blank' and k > last:
            found.append((number, 'empty line trailing the header'))
        else:
            allowed.append(number)
    budget = HEADER_MAX + (PROVENANCE_EXTRA if provenance else 0)
    for number in allowed[budget:]:
        found.append((number, 'header longer than %d lines' % budget))


def close_paren(code, at):
    """Index of the `)` matching the `(` at `at`, or the last index."""
    depth = 0
    for k in range(at, len(code)):
        c = code[k]
        if c == u'(':
            depth += 1
        elif c == u')':
            depth -= 1
            if depth == 0:
                return k
    return len(code) - 1


def test_bodies(code):
    """(first line, last line) of every `it(...)` / `test(...)` call."""
    starts = [0]
    for k, c in enumerate(code):
        if c == u'\n':
            starts.append(k + 1)

    def line_of(offset):
        return bisect.bisect_right(starts, offset)

    spans = []
    for match in TEST_CALL.finditer(code):
        opening = match.end() - 1
        end = close_paren(code, opening)
        if u'each' in match.group(1):
            k = end + 1
            while k < len(code) and code[k] in SPACE_SET:
                k += 1
            if code[k:k + 1] == u'(':
                end = close_paren(code, k)
        spans.append((line_of(match.start()), line_of(end)))
    return spans


def judge_steps(steps, code, found):
    """STEP lines past STEP_PER_TEST in one test, or in no test at all."""
    spans = test_bodies(code)
    per_test = {}
    for number in steps:
        inside = [s for s in spans if s[0] <= number <= s[1]]
        if not inside:
            found.append((number, 'STEP outside the body of an it/test'))
            continue
        span = min(inside, key=lambda s: s[1] - s[0])
        per_test.setdefault(span, []).append(number)
    for numbers in per_test.values():
        for number in sorted(numbers)[STEP_PER_TEST:]:
            found.append((number, 'more than %d STEP lines in one test'
                          % STEP_PER_TEST))


def measure(path, ledger, tree='src'):
    """Every measure of one file; `ledger` is read_ledger()'s map."""
    with io.open(path, encoding='utf-8', errors='replace', newline='') as handle:
        src = handle.read()
    rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
    return measure_text(src, rel, ledger, tree)


def measure_text(src, rel, ledger, tree='src'):
    """Every measure of one source text, judged by the rules of `tree`."""
    budget, heads = RULES[tree]
    src = src.replace(u'\r\n', u'\n')
    lines = src.split(u'\n')
    generated = generated_lines(lines)
    code, comments = lex(src)
    code_lines = code.split(u'\n')

    code_n = 0
    for number, text in enumerate(code_lines, 1):
        if number not in generated and is_code(text):
            code_n += 1

    by_line = {}
    for _kind, first, texts in comments:
        for offset, text in enumerate(texts):
            number = first + offset
            if number in generated:
                continue
            by_line[number] = by_line.get(number, u'') + u' ' + text

    counted = set()
    purity = set()
    non_ascii = []
    for number, text in by_line.items():
        body = NODE_STARS.sub(u' ', NODE_LEADERS.sub(u' ', text)).strip(JS_SPACE)
        if PURITY_ONLY.fullmatch(body):
            purity.add(number)
            continue
        counted.add(number)
        if NON_ASCII.search(text):
            non_ascii.append(number)

    # ---- form ----------------------------------------------------------------
    first_text_line = None
    for number, text in enumerate(lines, 1):
        if text.strip(JS_SPACE):
            first_text_line = number
            break

    blocks = []
    run = None
    for kind, first, texts in comments:
        rows = []
        for offset, text in enumerate(texts):
            number = first + offset
            if number in generated or number in purity:
                continue
            rows.append((number, body_of(text)))
        inline = (first not in generated and first - 1 < len(code_lines)
                  and is_code(code_lines[first - 1]))
        if first in generated:
            run = None
            continue
        if kind == 'line' and not inline:
            if run is not None and first == run['last'] + 1:
                run['rows'].extend(rows)
                run['last'] = first
            else:
                run = {'kind': 'run', 'first': first, 'last': first,
                       'rows': rows, 'inline': False}
                blocks.append(run)
            continue
        run = None
        blocks.append({'kind': kind, 'first': first, 'last': first,
                       'rows': rows, 'inline': inline})

    findings = []
    stops = []
    steps = [] if tree == 'tests' else None
    for index, block in enumerate(blocks):
        rows = block['rows']
        if not rows:
            continue
        if (index == 0 and not block['inline']
                and block['first'] == first_text_line):
            judge_header(rows, bool(generated), findings)
        elif block['inline'] and block['kind'] == 'line':
            number, body = rows[0]
            kind = classify(body, True, heads)
            if kind not in budget and kind != 'tag':
                findings.append((number, 'trailing comment without an '
                                         'allowed head'))
            if kind == 'STOP':
                stops.append([(number, body)])
            if kind == 'STEP' and steps is not None:
                steps.append(number)
        else:
            judge_block(rows, block['kind'] == 'run', findings, stops, tree,
                        steps)
    for form in stops:
        judge_stop(form, by_line, ledger, findings, tree)
    if steps:
        judge_steps(steps, code, findings)

    form = {}
    for number, why in findings:
        form.setdefault(number, why)

    capped = tree == 'src'
    excess = 0
    if capped and code_n >= FILE_FLOOR:
        excess = max(0, len(counted) - code_n // RATIO)
    return {
        'rel': rel,
        'code': code_n,
        'comment': len(counted),
        'non_ascii': sorted(non_ascii),
        'form': form,
        'excess': excess,
        'over': (capped and code_n >= FILE_FLOOR
                 and len(counted) * RATIO > code_n),
        'text': by_line,
    }


def source_files(top=SRC):
    for base, dirs, names in os.walk(top):
        dirs[:] = sorted(d for d in dirs if d != 'node_modules')
        for name in sorted(names):
            if name.endswith('.ts'):
                yield os.path.join(base, name)


def density(comment, code):
    total = code + comment
    return 100.0 * comment / total if total else 0.0


def held_of(result):
    """One file's share of A + B + C."""
    return len(result['non_ascii']) + len(result['form']) + result['excess']


def summarise(results):
    code = sum(r['code'] for r in results)
    comment = sum(r['comment'] for r in results)
    a = sum(len(r['non_ascii']) for r in results)
    b = sum(len(r['form']) for r in results)
    c = sum(r['excess'] for r in results)
    d = max(0, comment - code // RATIO)
    return {'code': code, 'comment': comment, 'a': a, 'b': b, 'c': c, 'd': d,
            'held': a + b + c + d,
            'large': sum(1 for r in results if r['code'] >= FILE_FLOOR),
            'over': sum(1 for r in results if r['over'])}


def terms(s):
    return ('%d non-ASCII + %d form + %d per-file density + %d tree density'
            % (s['a'], s['b'], s['c'], s['d']))


def tree_line(s, count):
    return ('         tree density %.1f%% (%d code, %d comment lines; the 10%% '
            'allowance is %d); %d of the %d files with %d+ code lines are '
            'over 10%%, over %d file(s) in all'
            % (density(s['comment'], s['code']), s['code'], s['comment'],
               s['code'] // RATIO, s['over'], s['large'], FILE_FLOOR, count))


def row_of(r):
    return ('%s %6d %6d %6d %6d %6.1f%% %6d %6d  %s'
            % ('OVER' if r['over'] else '    ', held_of(r),
               len(r['non_ascii']), len(r['form']), r['excess'],
               density(r['comment'], r['code']), r['code'], r['comment'],
               r['rel']))


HEADING = ('     %6s %6s %6s %6s %7s %6s %6s  %s'
           % ('held', 'nonasc', 'form', 'excess', 'density', 'code',
              'comm', 'file'))


def show_list(results, s):
    say(HEADING)
    for r in sorted(results, key=lambda r: (-held_of(r), r['rel'])):
        say(row_of(r))
    say('-- %d = %s' % (s['held'], terms(s)))
    say(tree_line(s, len(results)))
    say('-- files with %d+ code lines over 10%%:' % FILE_FLOOR)
    for r in sorted(results, key=lambda r: -density(r['comment'], r['code'])):
        if r['over']:
            say('   %5.1f%%  %s' % (density(r['comment'], r['code']), r['rel']))
    return 0


def show_file(ledger, wanted):
    """One file only: the hook calls this per edit, so nothing else is read."""
    key = wanted.replace('\\', '/')
    if os.path.isabs(key):
        key = os.path.relpath(key, ROOT).replace(os.sep, '/')
    key = key[2:] if key.startswith('./') else key
    tree = key.split('/', 1)[0]
    path = os.path.join(ROOT, *key.split('/'))
    if (tree not in RULES or not key.endswith('.ts')
            or not os.path.isfile(path)):
        say('PROBLEM  %s is not a .ts file under src/ or tests/' % wanted)
        return 1
    r = measure(path, ledger, tree)
    say(HEADING)
    say(row_of(r))
    if tree == 'tests':
        base = read_tests_baseline()
        was = None if base is None else base['files'].get(key, 0)
        say('         tests/ baseline for this file: %s; held now %d'
            % ('none written' if was is None else was, held_of(r)))
    findings = {}
    for number in r['non_ascii']:
        findings.setdefault(number, []).append('non-ASCII')
    for number, why in r['form'].items():
        findings.setdefault(number, []).append(why)
    for number in sorted(findings):
        text = r['text'].get(number, u'').strip(JS_SPACE)
        say('%6d  %-45s | %s' % (number, '; '.join(findings[number]),
                                  text[:80]))
    return 0


def read_baseline():
    if not os.path.exists(BASELINE):
        return None
    try:
        with io.open(BASELINE, encoding='utf-8') as handle:
            return int(handle.readline().strip())
    except (OSError, ValueError):
        return None


TESTS_BASELINE_HEAD = u'''\
# Check 55, tests/ half -- the comments of tests/ against JDG-62
# (docs/development-records/refactor-plan-report-2026-09-13.md, record 15):
# the character and the forms of src/ (docs/review/comment-rules-src.md), plus
# `// STEP:` -- 1 line, at most 3 in one it/test body. Held by
# check-comment-rules.py; `--list tests` prints it file by file and
# `--file <path>` line by line.
#
# WHY A BASELINE AND NOT A CAP. The ruling holds the amount against its value
# on the day it was made, forbids a rise, and leaves the cap to stage 8 of the
# refactor plan. Applying the src/ rules at once would delete tens of
# thousands of lines in one sweep, which the ruling rules out: files are
# brought to the rules when a refactor rewrites them or when they are touched.
#
# HOW IT IS MEASURED. Every .ts file under tests/, through the src/ check's
# lexer (strings, `${}` templates, regex literals and comments), so test
# titles and data strings are never counted.
#   <file> <n>   n = comment lines holding a character outside printable ASCII
#                + comment lines in no allowed form or past a form's budget,
#                a STEP past the 3rd in one test, or a STEP in no test.
#                A line breaking both rules counts under each.
#   %s <n>
#                n = tree comment lines * 10000 // (code + comment lines).
#
# THE RATCHET. A file rising above its line FAILS; a file not listed holds 0,
# so a new or renamed test file starts clean. The density rising FAILS. A
# fall is OK and the run names the lines to lower in that same commit -- the
# shape of every other ratchet here. Raise a line only on purpose, and say why
# in the commit. `--write-tests-baseline` rewrites this file; the front
# session re-counts with it at a merge.
''' % DENSITY_KEY


def basis_points(comment, code):
    total = code + comment
    return comment * 10000 // total if total else 0


def read_tests_baseline():
    """{'files': {rel: n}, 'density': bp or None}, or None when absent."""
    if not os.path.exists(TESTS_BASELINE):
        return None
    files = {}
    density_bp = None
    try:
        with io.open(TESTS_BASELINE, encoding='utf-8') as handle:
            for row in handle:
                row = row.strip()
                if not row or row.startswith('#'):
                    continue
                name, count = row.rsplit(None, 1)
                if name == DENSITY_KEY:
                    density_bp = int(count)
                else:
                    files[name] = int(count)
    except (OSError, ValueError):
        return None
    return {'files': files, 'density': density_bp}


def write_tests_baseline(results):
    s = summarise(results)
    with io.open(TESTS_BASELINE, 'w', encoding='utf-8', newline='\n') as out:
        out.write(TESTS_BASELINE_HEAD)
        out.write(u'%s %d\n' % (DENSITY_KEY, basis_points(s['comment'],
                                                          s['code'])))
        for r in sorted(results, key=lambda r: r['rel']):
            out.write(u'%s %d\n' % (r['rel'], held_of(r)))
    say('WROTE    %s: %d file(s), %d held line(s) = %d non-ASCII + %d form; '
        'density %d bp' % (REL_TESTS_BASELINE, len(results),
                            s['a'] + s['b'], s['a'], s['b'],
                            basis_points(s['comment'], s['code'])))
    return 0


def tests_verdict(results, base):
    """(red, lines to print) for tests/ against a read_tests_baseline() map."""
    s = summarise(results)
    now_bp = basis_points(s['comment'], s['code'])
    out = []
    worse = []
    better = []
    seen = set()
    for r in results:
        seen.add(r['rel'])
        now = held_of(r)
        was = base['files'].get(r['rel'], 0)
        if now > was:
            worse.append((r['rel'], was, now))
        elif now < was:
            better.append((r['rel'], was, now))
    gone = sorted(rel for rel in base['files'] if rel not in seen)
    density_up = base['density'] is None or now_bp > base['density']
    total = s['a'] + s['b']
    if worse or density_up:
        for rel, was, now in worse:
            out.append('FAIL     %s: %d comment line(s) against %s, up from %d'
                       % (rel, now, TESTS_RULING, was))
        if density_up:
            out.append('FAIL     tests/ comment density %d bp, above the %s '
                       'line of %s' % (now_bp, 'missing' if base['density']
                                       is None else base['density'],
                                       REL_TESTS_BASELINE))
        out.append('         A comment in tests/ is printable ASCII and one of '
                   'the src/ forms or `// STEP:` (1 line, 3 per test). Fix '
                   'the comment -- `--file <path>` names the lines; raise a '
                   'line of %s only on purpose, and say why in the commit.'
                   % REL_TESTS_BASELINE)
        return True, out
    if better or gone:
        out.append('OK       tests/ comments against %s: %d = %d non-ASCII + '
                   '%d form over %d file(s), density %d bp -- lower these '
                   'lines of %s in this commit to hold the ground:'
                   % (TESTS_RULING, total, s['a'], s['b'], len(results),
                      now_bp, REL_TESTS_BASELINE))
        for rel, was, now in better:
            out.append('           %s %d  (was %d)' % (rel, now, was))
        for rel in gone:
            out.append('           %s  (no such file now; drop the line)' % rel)
        if now_bp < base['density']:
            out.append('           %s %d  (was %d)'
                       % (DENSITY_KEY, now_bp, base['density']))
        return False, out
    note = ''
    if now_bp < base['density']:
        note = ' (density was %d bp; lower it in this commit)' % base['density']
    out.append('OK       tests/ comments against %s: %d = %d non-ASCII + %d '
               'form over %d file(s), density %d bp, which is the baseline%s'
               % (TESTS_RULING, total, s['a'], s['b'], len(results), now_bp,
                  note))
    return False, out


def tests_gate(ledger):
    results = [measure(p, ledger, 'tests') for p in source_files(TESTS)]
    if not results:
        say('PROBLEM  no .ts file under tests/ -- nothing was measured, and a '
            'count of 0 would read as a clean tree')
        return 1
    base = read_tests_baseline()
    if base is None:
        s = summarise(results)
        say('PROBLEM  %s has not been written yet; measured %d = %d non-ASCII '
            '+ %d form -- run --write-tests-baseline on purpose'
            % (REL_TESTS_BASELINE, s['a'] + s['b'], s['a'], s['b']))
        return 1
    red, lines = tests_verdict(results, base)
    for line in lines:
        say(line)
    return 1 if red else 0


SELF_TEST_REL = 'tests/unit/self-test-of-check-55.test.ts'
SELF_TEST_CLEAN = u'''\
// The file check 55 breaks on purpose.
import { describe, expect, it } from 'vitest';

describe('a title with \u65e5\u672c\u8a9e is a string, not a comment', () => {
  it('drags the bar', () => {
    const data = '\u30c7\u30fc\u30bf';
    // see FR-013
    // STEP: press the bar
    // STEP: drag it one day right
    // STEP: release it
    expect(data).toBe(data);
  });
});
'''
SELF_TEST_BREAKS = (
    ('one Japanese comment line',
     (u'    // STEP: release it\n',
      u'    // STEP: release it\n    // \u6761\u6587\u306e\u5199\u3057\n'),
     2),
    ('a 4th STEP line in the same it',
     (u'    // STEP: release it\n',
      u'    // STEP: release it\n    // STEP: read the bar back\n'),
     1),
    ('a STEP line above the it',
     (u"  it('drags the bar'", u"  // STEP: open the file\n  it('drags the bar'"),
     1),
)


def self_test():
    """Break a held-in-memory test file on purpose; red each time, then green."""
    ledger = {}
    clean = measure_text(SELF_TEST_CLEAN, SELF_TEST_REL, ledger, 'tests')
    s = summarise([clean])
    base = {'files': {SELF_TEST_REL: held_of(clean)},
            'density': basis_points(s['comment'], s['code'])}
    failures = []
    red, _lines = tests_verdict([clean], base)
    if held_of(clean) != 0 or red:
        failures.append('the clean file is not green at 0 (held %d)'
                        % held_of(clean))
    for name, (old, new), rise in SELF_TEST_BREAKS:
        if old not in SELF_TEST_CLEAN:
            failures.append('%s: the text to break is not in the file' % name)
            continue
        broken = measure_text(SELF_TEST_CLEAN.replace(old, new, 1),
                              SELF_TEST_REL, ledger, 'tests')
        red, _lines = tests_verdict([broken], base)
        say('         broken on purpose -- %s: held %d, %s'
            % (name, held_of(broken), 'RED' if red else 'green'))
        if not red or held_of(broken) != rise:
            failures.append('%s: expected red with %d, got %s with %d'
                            % (name, rise, 'red' if red else 'green',
                               held_of(broken)))
    back = measure_text(SELF_TEST_CLEAN, SELF_TEST_REL, ledger, 'tests')
    red, _lines = tests_verdict([back], base)
    say('         put back: held %d, %s' % (held_of(back),
                                             'RED' if red else 'green'))
    if red:
        failures.append('the file put back is not green')
    for failure in failures:
        say('FAIL     check 55 self-test: %s' % failure)
    if failures:
        return 1
    say('OK       check 55 self-test: %d break(s) went red and the clean file '
        'is green' % len(SELF_TEST_BREAKS))
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    ledger = read_ledger()
    if ledger is None:
        say('PROBLEM  %s is missing -- every STOP names a row in it, so none '
            'could be judged' % REL_LEDGER)
        return 1

    if '--file' in argv:
        at = argv.index('--file')
        if at + 1 >= len(argv):
            say('PROBLEM  --file needs a path')
            return 1
        return show_file(ledger, argv[at + 1])
    if '--write-tests-baseline' in argv:
        return write_tests_baseline(
            [measure(p, ledger, 'tests') for p in source_files(TESTS)])
    if '--list' in argv and 'tests' in argv:
        results = [measure(p, ledger, 'tests') for p in source_files(TESTS)]
        return show_list(results, summarise(results))

    results = [measure(path, ledger) for path in source_files()]
    if not results:
        say('PROBLEM  no .ts file under src/ -- nothing was measured, and a '
            'count of 0 would read as a clean tree')
        return 1
    s = summarise(results)
    if '--list' in argv:
        return show_list(results, s)

    return max(src_gate(results, s), tests_gate(ledger))


def src_gate(results, s):
    held = read_baseline()
    if held is None:
        say('PROBLEM  %s has not been written yet; measured %d = %s'
            % (REL_BASELINE, s['held'], terms(s)))
        return 1

    if s['held'] > held:
        say('FAIL     src/ comments against ruling 17 (%s) went %d -> %d = %s. '
            'A comment in src/ is ASCII, one of the forms of section 3, and '
            'within 10%% of the lines. Fix the comment; raise %s only on '
            'purpose, and say why in the commit.'
            % (RULING, held, s['held'], terms(s), REL_BASELINE))
        say(tree_line(s, len(results)))
        top = sorted(results, key=lambda r: -held_of(r))[:5]
        say('         largest shares: %s -- --list for every file, --file '
            '<path> for its lines'
            % ', '.join('%s %d' % (r['rel'], held_of(r)) for r in top))
        return 1

    if s['held'] < held:
        say('OK       src/ comments against ruling 17: %d = %s (was %d) -- '
            'lower line 1 of %s in this commit to hold the ground'
            % (s['held'], terms(s), held, REL_BASELINE))
        say(tree_line(s, len(results)))
        return 0

    say('OK       src/ comments against ruling 17: %d = %s, which is the '
        'baseline' % (s['held'], terms(s)))
    say(tree_line(s, len(results)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
