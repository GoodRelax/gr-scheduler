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
       `// STOP: ...`             3 lines, an `@provisional PND-n` line included
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

WHAT THIS DOES NOT SEE

  - Placement. A `see` line belongs directly above a definition and a TRAP
    directly above the line it guards; neither position is checked.
  - Meaning. That a `see` line names the row its definition implements, that a
    TRAP is one no type or test stops, that a DEVIATION has its ledger row --
    none of it is read, and neither is section 4 of the ruling (what not to
    write).
  - The rest of a head's sentence. `STOP:` and `DEVIATION:` are matched on the
    keyword alone, not on the ruling's template.
  - Every tree but src/. tests/ and tools/ are not read.

Usage:

    python .claude/skills/spec-graph-check/check-comment-rules.py
    python .claude/skills/spec-graph-check/check-comment-rules.py --list
    python .claude/skills/spec-graph-check/check-comment-rules.py --file <path>

`--list` prints every file's measures and marks the files over 10%. `--file`
prints one file's measures and each finding by line. Both exit 0.
Exit 0 green, 1 red.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SRC = os.path.join(ROOT, 'src')
BASELINE = os.path.join(HERE, 'comment-rules-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/comment-rules-baseline.txt'
RULING = 'docs/review/comment-rules-src.md'

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


def classify(body, line_comment):
    """'blank', 'tag', a key of BUDGET, or None for a line in no form."""
    if body == u'':
        return 'blank'
    if TAG_ANYWHERE.fullmatch(body):
        return 'tag'
    if line_comment:
        if SEE.fullmatch(body):
            return 'see'
        for head, name in HEADS:
            if body.startswith(head):
                return name
    return None


def judge_block(rows, line_comment, found):
    """Violating lines of one block that is not the file header."""
    head = None
    used = 0
    for number, body in rows:
        kind = classify(body, line_comment)
        if kind == 'blank':
            found.append((number, 'empty or delimiter-only comment line'))
            head = None
            continue
        if kind in BUDGET:
            head = kind
            used = 1
            continue
        if head in BUDGET:
            used += 1
            if used > BUDGET[head]:
                found.append((number, '%s form longer than %d line(s)'
                               % (head, BUDGET[head])))
            continue
        if kind == 'tag':
            head = 'tag'
            continue
        found.append((number, 'in no allowed form'))
        head = None


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


def measure(path):
    """Every measure of one file."""
    with io.open(path, encoding='utf-8', errors='replace', newline='') as handle:
        src = handle.read().replace(u'\r\n', u'\n')
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
    for index, block in enumerate(blocks):
        rows = block['rows']
        if not rows:
            continue
        if (index == 0 and not block['inline']
                and block['first'] == first_text_line):
            judge_header(rows, bool(generated), findings)
        elif block['inline'] and block['kind'] == 'line':
            number, body = rows[0]
            kind = classify(body, True)
            if kind not in BUDGET and kind != 'tag':
                findings.append((number, 'trailing comment without an '
                                         'allowed head'))
        else:
            judge_block(rows, block['kind'] == 'run', findings)

    form = {}
    for number, why in findings:
        form.setdefault(number, why)

    excess = 0
    if code_n >= FILE_FLOOR:
        excess = max(0, len(counted) - code_n // RATIO)
    return {
        'rel': os.path.relpath(path, ROOT).replace(os.sep, '/'),
        'code': code_n,
        'comment': len(counted),
        'non_ascii': sorted(non_ascii),
        'form': form,
        'excess': excess,
        'over': code_n >= FILE_FLOOR and len(counted) * RATIO > code_n,
        'text': by_line,
    }


def source_files():
    for base, dirs, names in os.walk(SRC):
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


def show_file(results, wanted):
    key = wanted.replace('\\', '/')
    if os.path.isabs(key):
        key = os.path.relpath(key, ROOT).replace(os.sep, '/')
    key = key[2:] if key.startswith('./') else key
    for r in results:
        if r['rel'] == key:
            break
    else:
        say('PROBLEM  %s is not a .ts file under src/' % wanted)
        return 1
    say(HEADING)
    say(row_of(r))
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


def main(argv):
    results = [measure(path) for path in source_files()]
    if not results:
        say('PROBLEM  no .ts file under src/ -- nothing was measured, and a '
            'count of 0 would read as a clean tree')
        return 1
    s = summarise(results)

    if '--file' in argv:
        at = argv.index('--file')
        if at + 1 >= len(argv):
            say('PROBLEM  --file needs a path')
            return 1
        return show_file(results, argv[at + 1])
    if '--list' in argv:
        return show_list(results, s)

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
