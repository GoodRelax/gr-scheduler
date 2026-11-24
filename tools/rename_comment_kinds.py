"""Rename the old comment kinds to the new ones -- plan B6, mechanical only.

    python tools/rename_comment_kinds.py            rewrite the tree in place
    python tools/rename_comment_kinds.py --check    count what is left; exit 1
                                                    if anything would change
    python tools/rename_comment_kinds.py --self-test
    python tools/rename_comment_kinds.py [--check] <path>...   only these files

WHAT IT RENAMES (rule 03 section 3; docs/review/comment-rules-src.md section 3,
"from the old forms to the new kinds"):

    // WHY: ...                    ->  // Why: ...
    // TRAP: ...                   ->  // Trap: ...
    // STEP: ...                   ->  // Step: ...
    // see FR-013, T-021           ->  // Spec: FR-013, T-021
    // DEVIATION: ... (DFC-n)      ->  // Temporary: ... (DFC-n). Until: DFC-n is fixed.
    the role line of a src header  ->  // File: <Component>: <role>

  WHY / TRAP / STEP / DEVIATION are renamed where they open the text of a
  comment line: a `//` comment, or one physical line of a `/* */` block
  (after its `/**`, `/*` or `*` leader). In Python files under tools/ the
  same four heads are renamed where they open a `#` comment.

  A `see` is renamed only when the whole comment is `see <ID>[, <ID>...]`
  (check 55's SEE form) and every ID is a specification ID: a `see` naming a
  JDG, DFC, CR, PND or OPQ row, or carrying more words, is left for the
  judgement seat (B11), because `Spec` may name specification IDs only.

  DEVIATION gains the `Until:` the Temporary kind requires, naming the last
  DFC-n of its form (the head line and the comment lines after it, up to the
  next head or empty comment line). A form with no DFC-n is renamed without
  one.

  The file header: in a src/ or tests/ file whose first comment block carries
  `@unit`, `@component`, `@publishes` or `@seam`, the first line of the block
  that is not such a tag is the role line. It becomes `File: <Name>: <role>`
  where <Name> is the component of the `@component` tag (the file's own name
  in PascalCase when there is none). When the role line already opens with
  that component -- `ScheduleGeometry -- the guides` or `ScreenRenderer: the
  surface` -- the separator after the name becomes the `: ` and nothing is
  repeated.

WHAT IT NEVER TOUCHES: strings, template literals and regex literals (the
lexer is a port of check 55's, so a comment is what check 55 calls one);
comments in any other form; STOP and `@provisional` (they need the open-
question list, B11); Japanese comments; where a `Spec` belongs. The code
outside comments is byte-identical before and after.

IDEMPOTENT: every rule's output no longer matches its input form, so a second
run changes nothing (`--check` after a run prints 0 and exits 0).

FOR ANOTHER BRANCH (study 82, B6): merge develop into the branch, run this
script with no argument, commit the result, then rerun the generators.
"""
from __future__ import print_function

import io
import os
import re
import subprocess
import sys
import tokenize

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

JS_TREES = ('src', 'tests', 'tools')
JS_EXT = ('.ts', '.tsx', '.js', '.mjs', '.cjs')
PY_TREES = ('tools',)
HEADER_TREES = ('src', 'tests')

# check 55's ID and SEE forms.
WS = u'[ \\t]'
ID = u'[A-Z]{1,4}-[0-9]+[a-z]?'
SEE_BODY = re.compile(u'^see(' + WS + u'+)(' + ID + u'(?:' + WS + u'*,' +
                      WS + u'*' + ID + u')*)' + WS + u'*$')
ID_PREFIX = re.compile(u'([A-Z]{1,4})-[0-9]')
NOT_SPEC = frozenset([u'JDG', u'DFC', u'CR', u'PND', u'OPQ'])
HEADS = ((u'WHY:', u'Why:'), (u'TRAP:', u'Trap:'), (u'STEP:', u'Step:'),
         (u'DEVIATION:', u'Temporary:'))
DFC = re.compile(u'DFC-[0-9]+')
# A head of check 55, old or new: where a DEVIATION form stops.
ANY_HEAD = re.compile(u'^(?:WHY:|TRAP:|STEP:|STOP:|DEVIATION:|Why:|Trap:|'
                      u'Step:|Summary:|Temporary:|Unimplemented:|'
                      u'Provisional:|Section:|Consistency:|Spec:|File:|'
                      u'see' + WS + u'+' + ID + u'|@)')
TAG_HEADER = re.compile(u'^@(?:unit|component|publishes|seam|purity|'
                        u'provisional)\\b')
HEADER_TAG = re.compile(u'^@(?:unit|component|publishes|seam)\\b')
COMPONENT = re.compile(u'^@component' + WS + u'+([A-Za-z][A-Za-z0-9]*)')

WORD = frozenset(u'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'
                 u'0123456789.')
LETTER = frozenset(u'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
SPACES = frozenset(u' \t\n\r\x0b\x0c ﻿')
REGEX_AFTER_CHAR = frozenset(u'(,=:[!&|?{};+-*%<>~^')
REGEX_AFTER_WORD = frozenset((u'return', u'typeof', u'case', u'in', u'of',
                              u'void', u'yield', u'await'))


def comment_spans(src):
    """(kind, start, end) of every comment: a port of check 55's lexer."""
    n = len(src)
    spans = []
    braces = []

    def template(i):
        while i < n:
            c = src[i]
            if c == u'\\':
                i += 2
                continue
            if c == u'`':
                return i + 1, u'`'
            if c == u'$' and src[i + 1:i + 2] == u'{':
                braces.append('tpl')
                return i + 2, u'{'
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
            spans.append(('line', i, end))
            i = end
            continue
        if c == u'/' and nxt == u'*':
            end = src.find(u'*/', i + 2)
            stop = n if end < 0 else end + 2
            spans.append(('block', i, stop))
            i = stop
            continue
        if c == u'"' or c == u"'":
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == u'\\':
                    j += 1
                j += 1
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
                i = j
                sig = u'/'
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
        if c not in SPACES:
            sig = c
            word = u''
    return spans


def split_line(text):
    """(leader, body, tail) of one physical comment line; body is the text."""
    m = re.match(u'^(\\s*(?://+|/\\*\\*?|\\*(?!/))?[ \\t]*)', text)
    lead = m.group(1)
    rest = text[len(lead):]
    tail = u''
    stripped = rest.rstrip(u' \t\r')
    if stripped.endswith(u'*/'):
        cut = len(stripped) - 2
        tail = rest[cut:]
        rest = rest[:cut]
    trail = len(rest) - len(rest.rstrip(u' \t\r'))
    if trail:
        tail = rest[len(rest) - trail:] + tail
        rest = rest[:len(rest) - trail]
    return lead, rest, tail


def is_spec_see(ids):
    return all(p not in NOT_SPEC for p in ID_PREFIX.findall(ids))


def rename_body(body, is_line_comment, tally):
    """The new body for one comment line's text, or None to leave it."""
    for old, new in HEADS:
        if body.startswith(old):
            tally[old] = tally.get(old, 0) + 1
            return new + body[len(old):]
    if is_line_comment:
        m = SEE_BODY.match(body)
        if m and is_spec_see(m.group(2)):
            tally[u'see'] = tally.get(u'see', 0) + 1
            return u'Spec: ' + body[3 + len(m.group(1)):]
    return None


def pascal(stem):
    return u''.join(part[:1].upper() + part[1:]
                    for part in re.split(u'[^A-Za-z0-9]+', stem) if part)


def file_role(role, name):
    """The role line's body as a File form."""
    if role.startswith(name):
        after = role[len(name):]
        if after.startswith(u': '):
            return u'File: ' + role
        m = re.match(u'^((?:[ ,][A-Za-z0-9 ,-]*?)?) -- ', after)
        if m:
            return (u'File: ' + name + m.group(1) + u': ' +
                    after[m.end():])
    return u'File: ' + name + u': ' + role


def header_rename(src, spans, rel, tally):
    """Edits [(start, end, new)] for the role line of the file header."""
    if not rel.split('/')[0] in HEADER_TREES:
        return []
    lines = []
    pos = 0
    for kind, start, end in spans:
        if kind != 'line':
            break
        gap = src[pos:start]
        if gap.strip(u' \t\r\n') != u'':
            break
        if pos and gap.count(u'\n') != 1:
            break
        lines.append((start, end))
        pos = end
    if not lines:
        return []
    bodies = [split_line(src[s:e]) for s, e in lines]
    if not any(HEADER_TAG.match(b[1]) for b in bodies):
        return []
    name = None
    for b in bodies:
        m = COMPONENT.match(b[1])
        if m:
            name = m.group(1)
            break
    if name is None:
        stem = os.path.basename(rel).split('.')[0]
        name = pascal(stem)
    for (s, e), (lead, body, tail) in zip(lines, bodies):
        if body == u'' or TAG_HEADER.match(body):
            continue
        if body.startswith(u'File:'):
            return []
        tally[u'File'] = tally.get(u'File', 0) + 1
        return [(s, e, lead + file_role(body, name) + tail)]
    return []


def js_edits(src, rel, tally):
    spans = comment_spans(src)
    edits = header_rename(src, spans, rel, tally)
    header_end = edits[0][0] if edits else -1
    for idx, (kind, start, end) in enumerate(spans):
        if start == header_end:
            continue
        if kind == 'line':
            lead, body, tail = split_line(src[start:end])
            new = rename_body(body, True, tally)
            if new is None:
                continue
            if body.startswith(u'DEVIATION:'):
                new = deviation_until(src, spans, idx, new, edits, tally)
                if new is None:
                    continue
            edits.append((start, end, lead + new + tail))
        else:
            text = src[start:end]
            parts = text.split(u'\n')
            changed = False
            for k, part in enumerate(parts):
                lead, body, tail = split_line(part)
                new = rename_body(body, False, tally)
                if new is not None:
                    parts[k] = lead + new + tail
                    changed = True
            if changed:
                edits.append((start, end, u'\n'.join(parts)))
    return edits


def deviation_until(src, spans, idx, new_head, edits, tally):
    """Add `Until: DFC-n is fixed.` to the last line of a DEVIATION form.

    Returns the head's new body; when the form runs over more lines, the
    edit of its last line is appended to `edits` and the head is returned
    unchanged apart from its rename."""
    form = [idx]
    kind, start, end = spans[idx]
    k = idx + 1
    while k < len(spans):
        kind2, s2, e2 = spans[k]
        if kind2 != 'line':
            break
        between = src[spans[k - 1][2]:s2]
        if between.count(u'\n') != 1 or between.strip(u' \t\r\n') != u'':
            break
        _l, body2, _t = split_line(src[s2:e2])
        if body2 == u'' or ANY_HEAD.match(body2):
            break
        form.append(k)
        k += 1
    text = u' '.join(split_line(src[spans[j][1]:spans[j][2]])[1]
                     for j in form)
    if u'Until:' in text:
        return new_head
    dfcs = DFC.findall(text)
    if not dfcs:
        return new_head
    until = u' Until: ' + dfcs[-1] + u' is fixed.'
    if len(form) == 1:
        body = new_head
        return body + (u'' if body.endswith(u'.') else u'.') + until
    last = form[-1]
    _kind, s3, e3 = spans[last]
    lead, body, tail = split_line(src[s3:e3])
    body = body + (u'' if body.endswith(u'.') else u'.') + until
    edits.append((s3, e3, lead + body + tail))
    return new_head


def py_edits(src, tally):
    edits = []
    starts = [0]
    for line in src.split(u'\n'):
        starts.append(starts[-1] + len(line) + 1)
    try:
        tokens = list(tokenize.generate_tokens(io.StringIO(src).readline))
    except (tokenize.TokenError, SyntaxError):
        return edits
    for tok in tokens:
        if tok.type != tokenize.COMMENT:
            continue
        row, col = tok.start
        start = starts[row - 1] + col
        end = start + len(tok.string)
        m = re.match(u'^(#+[ \\t]*)(.*)$', tok.string)
        lead, body = m.group(1), m.group(2)
        for old, new in HEADS[:3]:
            if body.startswith(old):
                tally[old] = tally.get(old, 0) + 1
                edits.append((start, end, lead + new + body[len(old):]))
                break
    return edits


def apply(src, edits):
    out = []
    pos = 0
    for start, end, new in sorted(edits):
        out.append(src[pos:start])
        out.append(new)
        pos = end
    out.append(src[pos:])
    return u''.join(out)


def load(path):
    raw = io.open(path, encoding='utf-8', newline='').read()
    crlf = raw.count(u'\r\n')
    eol = u'\r\n' if crlf > raw.count(u'\n') - crlf else u'\n'
    return raw.replace(u'\r\n', u'\n'), eol, raw


def save(path, text, eol):
    io.open(path, 'w', encoding='utf-8', newline='').write(
        text.replace(u'\n', eol) if eol == u'\r\n' else text)


def tracked_files():
    out = subprocess.check_output(['git', 'ls-files'] + list(set(
        JS_TREES + PY_TREES)), cwd=ROOT).decode('utf-8')
    return [p for p in out.splitlines() if p]


def wanted(rel):
    top = rel.split('/')[0]
    if rel == 'tools/rename_comment_kinds.py':
        return None
    if top in JS_TREES and rel.endswith(JS_EXT):
        return 'js'
    if top in PY_TREES and rel.endswith('.py'):
        return 'py'
    return None


def rewrite(rel, tally):
    """(old text, new text, eol) of one file, normalised to LF."""
    path = os.path.join(ROOT, rel)
    text, eol, _raw = load(path)
    kind = wanted(rel)
    if kind == 'js':
        edits = js_edits(text, rel, tally)
    elif kind == 'py':
        edits = py_edits(text, tally)
    else:
        edits = []
    return text, apply(text, edits), eol


def main(argv):
    if '--self-test' in argv:
        return self_test()
    check = '--check' in argv
    paths = [a.replace('\\', '/') for a in argv if not a.startswith('--')]
    files = paths or [p for p in tracked_files() if wanted(p)]
    tally = {}
    changed = []
    for rel in files:
        if not wanted(rel) or not os.path.isfile(os.path.join(ROOT, rel)):
            continue
        old, new, eol = rewrite(rel, tally)
        if new != old:
            changed.append(rel)
            if not check:
                save(os.path.join(ROOT, rel), new, eol)
    total = sum(tally.values())
    kinds = ', '.join('%s %d' % (k, tally[k]) for k in sorted(tally))
    verb = 'left to rename' if check else 'renamed'
    print('%s %d comment line(s) in %d file(s)%s' % (
        verb, total, len(changed), (': ' + kinds) if kinds else ''))
    if check and total:
        for rel in changed:
            print('  ' + rel)
        return 1
    return 0


CASES = [
    ('why in a line comment', u'a()\n  // WHY: x\n', u'a()\n  // Why: x\n'),
    ('trap and step', u'// TRAP: a\n// STEP: b\n', u'// Trap: a\n// Step: b\n'),
    ('see with spec ids', u'f() // see FR-013, T-021\n',
     u'f() // Spec: FR-013, T-021\n'),
    ('see with a decision id stays', u'// see FR-1, JDG-3\n',
     u'// see FR-1, JDG-3\n'),
    ('see with words stays', u'// see FR-1 for the rest\n',
     u'// see FR-1 for the rest\n'),
    ('inside a string stays', u"const s = '// WHY: x'\n",
     u"const s = '// WHY: x'\n"),
    ('inside a template stays', u'const s = `// see FR-1 ${a} // TRAP: b`\n',
     u'const s = `// see FR-1 ${a} // TRAP: b`\n'),
    ('inside a regex stays', u'const r = /\\/\\/ WHY:/\n',
     u'const r = /\\/\\/ WHY:/\n'),
    ('block comment line', u'/**\n * WHY: x\n */\n', u'/**\n * Why: x\n */\n'),
    ('deviation one line', u'// DEVIATION: spec says a; here b (DFC-7)\nx()\n',
     u'// Temporary: spec says a; here b (DFC-7). Until: DFC-7 is fixed.\nx()\n'),
    ('deviation two lines',
     u'// DEVIATION: spec says a; here\n// b (DFC-8, JDG-1).\nx()\n',
     u'// Temporary: spec says a; here\n// b (DFC-8, JDG-1). Until: DFC-8 is fixed.\nx()\n'),
    ('header with component name first',
     u'// ScheduleGeometry -- the guides (FR-1).\n// @unit      UF-1\n'
     u'// @component ScheduleGeometry, layer x\n\nx()\n',
     u'// File: ScheduleGeometry: the guides (FR-1).\n// @unit      UF-1\n'
     u'// @component ScheduleGeometry, layer x\n\nx()\n'),
    ('header with name and colon',
     u'// ScreenRenderer: the surface.\n// @component ScreenRenderer, layer A\n',
     u'// File: ScreenRenderer: the surface.\n// @component ScreenRenderer, layer A\n'),
    ('header with a qualified name',
     u'// DocumentCodec, MSPDI half -- converts.\n// @component DocumentCodec, layer A\n',
     u'// File: DocumentCodec, MSPDI half: converts.\n// @component DocumentCodec, layer A\n'),
    ('header with no name',
     u'// Fills the entries.\n// @unit UF-2\n// @component ScreenRenderer, layer A\n',
     u'// File: ScreenRenderer: Fills the entries.\n// @unit UF-2\n// @component ScreenRenderer, layer A\n'),
    ('a first comment with no tag is no header',
     u'// Fills the entries.\n\nx()\n', u'// Fills the entries.\n\nx()\n'),
]


def self_test():
    failed = 0
    for name, before, after in CASES:
        tally = {}
        got = apply(before, js_edits(before, 'src/a/b.ts', tally))
        again = apply(got, js_edits(got, 'src/a/b.ts', {}))
        if got != after or again != got:
            failed += 1
            print('FAIL %s\n  got   %r\n  want  %r\n  again %r' % (
                name, got, after, again))
    py = u'x = "# WHY: no"  # WHY: yes\n# TRAP: t\n'
    tally = {}
    got = apply(py, py_edits(py, tally))
    if got != u'x = "# WHY: no"  # Why: yes\n# Trap: t\n':
        failed += 1
        print('FAIL python comments\n  got %r' % got)
    print('self-test: %d of %d case(s) failed' % (failed, len(CASES) + 1))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
