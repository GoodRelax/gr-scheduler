# -*- coding: utf-8 -*-
u"""Check 77 -- a word a test spells in code points is a word docs/spec holds.

WHY THIS EXISTS. Rule 03 section 5 keeps code ASCII, so a test that needs an
on-screen Japanese word spells it as code points --
`String.fromCharCode(0x6298, 0x308a, ...)`, `'\\u6298\\u308a...'`. Check 42
reads quotations in comments and cannot read those. CR-726 changed on-screen
words (for one, the fold word became its kana spelling) and
tests/system/rows-fixed-with-nothing-holding-them.test.ts still spelled the
old words as code points: nothing went red until GT-2 ran 0 cases. The user
and the coordinator agreed on this check with baseline 0.

WHAT IT DECODES, in src/ and tests/ (every .ts / .tsx / .js / .mjs file):
  * `fromCharCode(...)` / `fromCodePoint(...)` whose arguments are all
    numeric literals (hex, decimal, octal, binary);
  * the same call fed one spread array of numeric literals --
    `fromCharCode(...[0x.., 0x..])` -- or a spread NAME that the same file
    binds to such an array (`const NAME = [0x.., 0x..]`);
  * an array of numeric literals followed by `.map(...)` whose callback
    calls fromCharCode / fromCodePoint (the "array later joined" form),
    written in place or through a NAME bound to the array;
  * a run of `\\uXXXX` / `\\u{X...}` escapes inside a string or template
    literal. A run starts and ends on an escaped character; what sits
    between two escapes joins the run unless it holds an ASCII letter, so
    `'\\u914d\\u4e0b 1 \\u968e'` is one run and `'Ctrl \\uff0b Shift'` is not.

WHAT IT LOOKS UP. A decoded spelling that holds a CJK character (kana,
ideographs, CJK punctuation, full-width forms) or at least two letters is
searched as an EXACT substring of docs/spec: every tracked .md / .tsv /
.sgra file, and every string (keys and values) of every tracked .json file
there -- the manuscripts, docs/spec/_source/display-words.json and the
generated tables. A spelling not found is a finding (file:line, decoded
text).

THE EXEMPTION LIST (code-point-words-exempt.txt beside this script) names a
spelling a test holds ON PURPOSE although the spec does not -- a word the
spec retired, spelled to prove it is gone, or a non-spec string such as an
encoding sample. One line each: `path | spelling | reason`, the spelling in
ASCII with `\\uXXXX` for every non-ASCII character. Baseline 0: any
finding not listed is red, and so is a listed line that no longer matches
anything, so the list only ever says what is true today.

WHAT IT DOES NOT SEE. A spelling built at run time (a loop over computed
numbers, `String.fromCharCode(base + i)`), one split across two calls or
two literals and joined with `+`, one written as `\\x..` escapes, and
whether the spec row that holds the word is the row the test means.

Usage:
    python check-code-point-words.py [--self-test] [--list]

`--self-test` runs the decoder over an in-memory broken source (three
spellings the in-memory spec lacks: a fromCharCode call, an escape run and
a spread array) and a clean one, and is red unless the broken source gives
exactly three findings, the clean one none, and an exemption silences one.
`--list` prints every decoded spelling with whether it was found.
"""
import io
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
EXEMPT = os.path.join(HERE, 'code-point-words-exempt.txt')
REL_EXEMPT = '.claude/skills/spec-graph-check/code-point-words-exempt.txt'
TREES = ('src/', 'tests/')
SOURCE_EXT = ('.ts', '.tsx', '.js', '.mjs')
SPEC_TEXT_EXT = ('.md', '.tsv', '.sgra')

LETTER = frozenset(u'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
WORD = frozenset(u'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
                 u'0123456789_$')
REGEX_AFTER_CHAR = frozenset(u'(,=:[!&|?{};+-*%<>~^')
REGEX_AFTER_WORD = frozenset((u'return', u'typeof', u'case', u'in', u'of',
                              u'void', u'yield', u'await'))
SPACE = frozenset(u' \t\r\n\x0b\x0c')

CJK_RANGES = ((0x3000, 0x303f), (0x3040, 0x30ff), (0x31f0, 0x31ff),
              (0x3400, 0x4dbf), (0x4e00, 0x9fff), (0xf900, 0xfaff),
              (0xff00, 0xffef), (0x20000, 0x2fa1f))

NUMBER = r'(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|[0-9][0-9_]*)'
NUMBER_LIST = re.compile(r'^\s*' + NUMBER + r'(?:\s*,\s*' + NUMBER +
                         r')*\s*,?\s*$')
CALL = re.compile(r'(?<![\w$])fromC(?:harCode|odePoint)\s*\(')
CONST_ARRAY = re.compile(r'(?<![\w$])(?:const|let|var)\s+([A-Za-z_$][\w$]*)'
                         r'(?:\s*:[^=\n]*)?\s*=\s*\[([^\[\]]*)\]')
ARRAY_MAP = re.compile(r'\[([^\[\]]*)\]\s*\.map\s*\(')
NAME_MAP = re.compile(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\.map\s*\(')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def is_cjk(ch):
    point = ord(ch)
    return any(lo <= point <= hi for lo, hi in CJK_RANGES)


def worth_looking_up(text):
    """A spelling, not a single symbol: CJK in it, or two letters or more."""
    if any(is_cjk(ch) for ch in text):
        return True
    return sum(1 for ch in text if ch.isalpha()) >= 2


def as_ascii(text):
    """The exemption-list form: ASCII as is, everything else as \\uXXXX."""
    out = []
    for ch in text:
        point = ord(ch)
        if 0x20 <= point < 0x7f and ch != u'\\':
            out.append(ch)
        elif point > 0xffff:
            out.append(u'\\u{%x}' % point)
        else:
            out.append(u'\\u%04x' % point)
    return u''.join(out)


# ---------------------------------------------------------------- lexing

def lex(src):
    """(code, literals) of one JS/TS source.

    `code` is the source with comments removed and the insides of strings,
    templates and regex literals blanked to spaces, so offsets and line
    numbers stay those of the source. `literals` is [(offset, body)] for each
    string literal and each template chunk, body raw (escapes undecoded).
    """
    n = len(src)
    out = list(src)
    literals = []
    braces = []

    def blank(a, b):
        for k in range(a, b):
            if out[k] != u'\n':
                out[k] = u' '

    def template(i):
        """Inside a template literal from i; returns the index after it."""
        start = i
        while i < n:
            c = src[i]
            if c == u'\\':
                i += 2
                continue
            if c == u'`':
                literals.append((start, src[start:i]))
                blank(start, i)
                return i + 1
            if c == u'$' and src[i + 1:i + 2] == u'{':
                literals.append((start, src[start:i]))
                blank(start, i)
                braces.append('tpl')
                return i + 2
            i += 1
        literals.append((start, src[start:n]))
        blank(start, n)
        return n

    i = 0
    sig = u''
    word = u''
    while i < n:
        c = src[i]
        nxt = src[i + 1:i + 2]
        if c == u'/' and nxt == u'/':
            end = src.find(u'\n', i)
            end = n if end < 0 else end
            blank(i, end)
            i = end
            continue
        if c == u'/' and nxt == u'*':
            end = src.find(u'*/', i + 2)
            stop = n if end < 0 else end + 2
            blank(i, stop)
            i = stop
            continue
        if c == u'"' or c == u"'":
            j = i + 1
            while j < n and src[j] != c and src[j] != u'\n':
                if src[j] == u'\\':
                    j += 1
                j += 1
            literals.append((i + 1, src[i + 1:j]))
            blank(i + 1, min(j, n))
            i = j + 1
            sig, word = c, u''
            continue
        if c == u'`':
            i = template(i + 1)
            sig, word = u'`', u''
            continue
        if c == u'{':
            braces.append('code')
            i += 1
            sig, word = c, u''
            continue
        if c == u'}':
            opened = braces.pop() if braces else None
            i += 1
            if opened == 'tpl':
                i = template(i)
                sig = u'`'
            else:
                sig = u'}'
            word = u''
            continue
        if c == u'/' and (sig == u'' or sig in REGEX_AFTER_CHAR
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
            blank(i + 1, min(j, n))
            j += 1
            while j < n and src[j] in LETTER:
                j += 1
            i = j
            sig, word = u'/', u''
            continue
        if c in WORD:
            j = i
            while j < n and src[j] in WORD:
                j += 1
            word = src[i:j]
            i = j
            sig = u'w'
            continue
        i += 1
        if c not in SPACE:
            sig, word = c, u''
    return u''.join(out), literals


# ---------------------------------------------------------------- decoding

def numbers(text):
    """The code points of a list of numeric literals, or None."""
    if not NUMBER_LIST.match(text):
        return None
    points = []
    for item in text.split(u','):
        item = item.strip().replace(u'_', u'')
        if not item:
            continue
        points.append(int(item, 0) if item[:2].lower() in (u'0x', u'0o', u'0b')
                      else int(item, 10))
    return points


def spelled(points):
    try:
        return u''.join(chr(p) for p in points)
    except (ValueError, OverflowError):
        return None


def closing(code, opening):
    """Index of the bracket matching the one at `opening`, or -1."""
    pairs = {u'(': u')', u'[': u']', u'{': u'}'}
    stack = []
    for k in range(opening, len(code)):
        ch = code[k]
        if ch in pairs:
            stack.append(pairs[ch])
        elif stack and ch == stack[-1]:
            stack.pop()
            if not stack:
                return k
    return -1


def call_spellings(code):
    """[(offset, text)] decoded from fromCharCode / fromCodePoint forms."""
    arrays = {}
    for m in CONST_ARRAY.finditer(code):
        points = numbers(m.group(2))
        if points:
            arrays[m.group(1)] = points
    found = []
    for m in CALL.finditer(code):
        start = m.end() - 1
        end = closing(code, start)
        if end < 0:
            continue
        args = code[start + 1:end].strip()
        points = None
        if args.startswith(u'...'):
            rest = args[3:].strip().rstrip(u',').strip()
            if rest.startswith(u'[') and rest.endswith(u']'):
                points = numbers(rest[1:-1])
            else:
                points = arrays.get(rest)
        else:
            points = numbers(args)
        if points:
            found.append((m.start(), spelled(points)))
    for m in ARRAY_MAP.finditer(code):
        points = numbers(m.group(1))
        end = closing(code, m.end() - 1)
        if points and end > 0 and CALL.search(code[m.end():end]):
            found.append((m.start(), spelled(points)))
    for m in NAME_MAP.finditer(code):
        points = arrays.get(m.group(1))
        end = closing(code, m.end() - 1)
        if points and end > 0 and CALL.search(code[m.end():end]):
            found.append((m.start(), spelled(points)))
    return [(at, text) for at, text in found if text]


SIMPLE_ESCAPES = {u'n': u'\n', u't': u'\t', u'r': u'\r', u'b': u'\b',
                  u'f': u'\f', u'v': u'\v', u'0': u'\0'}


def decode_marked(body):
    """[(char, from_u_escape)] of a raw literal body."""
    out = []
    i, n = 0, len(body)
    while i < n:
        c = body[i]
        if c != u'\\' or i + 1 >= n:
            out.append((c, False))
            i += 1
            continue
        e = body[i + 1]
        if e == u'u' and body[i + 2:i + 3] == u'{':
            end = body.find(u'}', i + 3)
            try:
                out.append((chr(int(body[i + 3:end], 16)), True))
                i = end + 1
                continue
            except (ValueError, OverflowError):
                pass
        if e == u'u' and re.match(u'[0-9a-fA-F]{4}$', body[i + 2:i + 6]):
            out.append((chr(int(body[i + 2:i + 6], 16)), True))
            i += 6
            continue
        out.append((SIMPLE_ESCAPES.get(e, e), False))
        i += 2
    # A surrogate pair written as two \\uXXXX escapes is one character.
    merged = []
    for ch, esc in out:
        if (merged and esc and merged[-1][1]
                and 0xdc00 <= ord(ch) <= 0xdfff
                and 0xd800 <= ord(merged[-1][0]) <= 0xdbff):
            hi = ord(merged[-1][0])
            merged[-1] = (chr(0x10000 + ((hi - 0xd800) << 10)
                              + (ord(ch) - 0xdc00)), True)
        else:
            merged.append((ch, esc))
    return merged


def escape_runs(body):
    """The texts of the escape runs of one literal body."""
    marked = decode_marked(body)
    runs = []
    current = None
    gap = []
    for ch, esc in marked:
        if esc:
            if current is None:
                current = [ch]
            else:
                current.extend(gap)
                current.append(ch)
            gap = []
        elif current is not None:
            if ch in LETTER or ch == u'\n':
                runs.append(u''.join(current))
                current, gap = None, []
            else:
                gap.append(ch)
    if current is not None:
        runs.append(u''.join(current))
    return runs


def spellings(src):
    """[(line, text)] of every decoded spelling worth looking up."""
    code, literals = lex(src)
    found = list(call_spellings(code))
    for at, body in literals:
        if u'\\u' in body:
            found.extend((at, run) for run in escape_runs(body))
    out = []
    for at, text in sorted(found):
        if worth_looking_up(text):
            out.append((src.count(u'\n', 0, at) + 1, text))
    return out


# ---------------------------------------------------------------- the spec

def json_strings(value, sink):
    if isinstance(value, dict):
        for key, item in value.items():
            sink.append(key)
            json_strings(item, sink)
    elif isinstance(value, list):
        for item in value:
            json_strings(item, sink)
    elif isinstance(value, str):
        sink.append(value)


def tracked(prefix):
    out = subprocess.check_output(['git', 'ls-files', '--', prefix], cwd=ROOT)
    return [p for p in out.decode('utf-8').split('\n') if p.strip()]


def spec_haystack():
    parts = []
    for rel in tracked('docs/spec'):
        path = os.path.join(ROOT, rel)
        if rel.endswith(SPEC_TEXT_EXT):
            parts.append(io.open(path, encoding='utf-8').read())
        elif rel.endswith('.json'):
            sink = []
            json_strings(json.load(io.open(path, encoding='utf-8')), sink)
            parts.append(u'\n'.join(sink))
    return u'\n'.join(parts)


# ---------------------------------------------------------------- exemptions

def read_exemptions(text):
    """{(path, ascii spelling): reason} and a list of malformed lines."""
    held, bad = {}, []
    for line_no, raw in enumerate(text.split(u'\n'), 1):
        line = raw.strip()
        if not line or line.startswith(u'#'):
            continue
        cells = [c.strip() for c in line.split(u' | ')]
        if len(cells) != 3 or not all(cells):
            bad.append((line_no, line))
            continue
        held[(cells[0], cells[1])] = cells[2]
    return held, bad


def judge(per_file, haystack, held):
    """(findings, exempted, stale): findings [(path, line, text)]."""
    findings, used = [], set()
    exempted = 0
    for path, rows in per_file:
        for line, text in rows:
            if text in haystack:
                continue
            key = (path, as_ascii(text))
            if key in held:
                used.add(key)
                exempted += 1
                continue
            findings.append((path, line, text))
    stale = sorted(set(held) - used)
    return findings, exempted, stale


# ---------------------------------------------------------------- self-test

def self_test():
    haystack = u'| GR-1 | \u6298\u308a\u305f\u305f\u3080 | the fold word |\n' \
               u'Ctrl\uff0bShift \u914d\u4e0b 1 \u968e\u5c64'
    broken = (
        u"// a spelling in a comment: String.fromCharCode(0x7573, 0x3080)\n"
        u"const OLD = String.fromCharCode(\n"
        u"  0x7573, 0x3080,\n"
        u")\n"
        u"const TITLE = 'Press \\u5c55\\u958b 1 \\u3059\\u308b now'\n"
        u"const SPREAD = String.fromCodePoint(...[0x958b, 0x304f])\n"
        u"const ONE = String.fromCharCode(0x2026)\n"
        u"const BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47])\n"
    )
    clean = (
        u"const FOLD = String.fromCharCode(0x6298, 0x308a, 0x305f, 0x305f,"
        u" 0x3080)\n"
        u"const KEY = 'Ctrl \\uff0b Shift'\n"
        u"const CODES = [0x6298, 0x308a]\n"
        u"const JOINED = CODES.map((c) => String.fromCharCode(c)).join('')\n"
        u"const TIER = `\\u914d\\u4e0b 1 \\u968e\\u5c64 ${n}`\n"
        u"const RE = /\\u3000+/g\n"
    )
    bad_found, _, _ = judge([('broken.ts', spellings(broken))], haystack, {})
    clean_rows = spellings(clean)
    clean_found, _, _ = judge([('clean.ts', clean_rows)], haystack, {})
    held = {('broken.ts', u'\\u7573\\u3080'): u'retired on purpose'}
    after, exempted, stale = judge([('broken.ts', spellings(broken))],
                                   haystack, held)
    lines = sorted(line for _, line, _ in bad_found)
    ok = (lines == [2, 5, 6] and not clean_found and len(clean_rows) == 4
          and len(after) == 2 and exempted == 1 and not stale)
    say(u'%s  self-test: the broken source gave %d finding(s) on lines %s '
        u'(want 3 on [2, 5, 6]), the clean source %d of %d spellings '
        u'(want 0 of 4), an exemption left %d (want 2)'
        % (u'OK      ' if ok else u'FAIL    ', len(bad_found), lines,
           len(clean_found), len(clean_rows), len(after)))
    return 0 if ok else 1


# ---------------------------------------------------------------- main

def main(argv):
    if '--self-test' in argv:
        return self_test()
    per_file = []
    for tree in TREES:
        for rel in tracked(tree):
            if not rel.endswith(SOURCE_EXT):
                continue
            src = io.open(os.path.join(ROOT, rel), encoding='utf-8').read()
            rows = spellings(src)
            if rows:
                per_file.append((rel, rows))
    haystack = spec_haystack()
    exempt_text = (io.open(EXEMPT, encoding='utf-8').read()
                   if os.path.exists(EXEMPT) else u'')
    held, bad = read_exemptions(exempt_text)
    findings, exempted, stale = judge(per_file, haystack, held)
    total = sum(len(rows) for _, rows in per_file)

    if '--list' in argv:
        for path, rows in per_file:
            for line, text in rows:
                say(u'         %s %s:%d  %s' % (
                    u'found  ' if text in haystack else u'MISSING',
                    path, line, text))

    red = False
    if bad:
        red = True
        say(u'FAIL     %d malformed line(s) in %s -- each line is '
            u'`path | spelling | reason`' % (len(bad), REL_EXEMPT))
        for line_no, line in bad:
            say(u'         line %d: %s' % (line_no, line[:100]))
    if findings:
        red = True
        say(u'FAIL     %d spelling(s) written in code points that docs/spec '
            u'does not hold. A word the spec renamed is still spelled the '
            u'old way (CR-726); respell it from the current row, or list it '
            u'in %s with the reason it is deliberate.'
            % (len(findings), REL_EXEMPT))
        for path, line, text in findings[:40]:
            say(u'         %s:%d  %s   [%s]' % (path, line, text,
                                               as_ascii(text)))
        if len(findings) > 40:
            say(u'         ... and %d more' % (len(findings) - 40))
    if stale:
        red = True
        say(u'FAIL     %d exemption(s) in %s match nothing any more -- '
            u'delete the line(s)' % (len(stale), REL_EXEMPT))
        for path, text in stale:
            say(u'         %s | %s' % (path, text))
    if red:
        return 1
    say(u'OK       %d code-point spelling(s) in %d file(s) of src/ and '
        u'tests/; every one is in docs/spec or exempted (%d exempted, '
        u'baseline 0)' % (total, len(per_file), exempted))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
