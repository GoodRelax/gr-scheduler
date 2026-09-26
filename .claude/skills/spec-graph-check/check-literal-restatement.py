# -*- coding: utf-8 -*-
"""Check 69: a hand-written value set in src/ does not restate a generated set.

CR-581 (duplicate prevention). A generated set -- a union, a roster, a column
of a table -- is printed into src/ from its manuscript by `npm run gen`, and
gen:check fails when the print drifts. A HAND copy of the same set drifts in
silence: the manuscript moves, the copy does not, and every check stays green.
⛔ NOTICE_MANNER_OF_REASON said so in its own comment ("TRAP: not generated; a
manner moved in table T-233 must be copied here by hand") and nothing counted
it. This check counts them.

WHAT IT CATCHES. Every MODULE-LEVEL literal set of src/**/*.ts written outside
the `// <generated -- do not edit by hand>` fences -- the opening bracket
stands at depth 0, i.e. in a top-level `const` / `type` / `let` statement:
    array   ['a', 'b', 'c']            (every element one string literal)
    set     new Set(['a', 'b', 'c'])
    union   'a' | 'b' | 'c'            (>= 3 string members in one run)
    keys    { a: .., 'b': .., c: .. }  (>= 3 keyed entries)
    values  the string values of one such object literal
is compared with the GENERATED POOL: the same shapes (at any depth) and the
per-field value bags inside the fences, every JSON file under src/ (all 11 are
written by a tools/generate_*.py and say so), and two derived forms of each --
the last dotted segment (`treeStateMachine.auto` -> `auto`) and the identifier
words of compound guard strings (`isPressedRow & not isLeafRow`). A hand set
is a HIT when its best generated match shares at least 3 members AND the
Jaccard index |H & G| / |H | G| is at least 0.7.

WHAT IT EXEMPTS, because the compiler already refuses the drift: a KEYS set
whose statement keys a `Record<X, ..>` or a mapped type `[K in X]` over a
generated union X (or a hand alias that only re-says one, such as
`type TreeState = TaskGroup['treeState']`), and a KEYS set typed as a
generated interface (`const DEFAULT_CALENDAR: Calendar = {`). Nothing guards
VALUES, so a values set is never exempted.

WHAT IT DELIBERATELY DOES NOT CATCH:
  - a per-literal vocabulary. The icon-roster surface names are 27 single
    literals spread over 8 files; no set shape holds them, so a restatement
    of that kind needs a per-literal rule, not this one;
  - function-local sets. The prototype read 15 of them at random: 13 were
    coincidental (x / y / width keys, typed value constructions, effect
    construction), so reading them would bury the real ones;
  - paraphrased sets -- a different spelling ('Escape' against 'Esc'), a set
    of fewer than 3 shared members, a set restating the SPECIFICATION rather
    than a generated artifact (docs/spec is not in the pool), and a hand set
    restating another hand set;
  - a few row ids out of a big roster: that is a reference, and the Jaccard
    floor keeps it out ("subset" alone was measured noisy: 37 of 66 C).

MEASURED 2026-09-26 on 0ad572f6 (branch p3/cr-581-duplicate-prevention):
181 module-level hand sets against 869 generated sets; 35 reach J >= 0.7.
16 are exempted -- 14 RG (keyed over a generated union) and 2 typed
constructions -- and 19 are hits, read one by one: 14 restate a generated set
(R) and 5 are coincidental (C). 0.3 s on the whole of src/. The prototype
measured the same 35 = 14 R + 14 RG + 7 C on 1781a77e; its 2 typed C are the
2 typed exemptions here.

THE KEY. A record is <hand-written name> | <shape> | <generated set>, where the
generated set is a JSON file's base name and path, or `generated` + the
declaration name and key path inside a fence (copies one declaration prints
more than once fold into one name with `*` for the varying key). ⭐ Never a
file and never a line: frame-loop.ts, input-command-translator.ts and
mspdi-codec.ts are about to be split, and a record must survive its
declaration moving. The file:line is printed for information only.

⭐ THE BASELINE, the shape of check 26b (`published-members-baseline.txt`).
The run is GREEN when the hits are exactly the records held in
`literal-restatement-baseline.txt`, RED on a hit that is not held, and RED on
a held record that no longer matches a hit -- a debt that was paid must leave
the file, or the baseline rots into permission. Every held record is printed
as KNOWN on every run. Each record carries a `why:` line opening with
"restates" (R: a real restatement to fold later; name the generated source)
or "coincidental" (C: same words, different job; say why).
⛔ THE BASELINE MAY ONLY SHRINK WITHOUT THE USER'S OK. Adding a line is not a
way to make the suite green: a new hit is a new restatement, and the fix is
to read the generated set instead of writing it again.

    PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-literal-restatement.py
    ... --list        every hit and exemption, with Jaccard, sizes, file:line
                      and the generated source
    ... --self-test   break a tree held in memory (never writes src/)
"""

import io
import json
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
BASELINE = os.path.join(HERE, 'literal-restatement-baseline.txt')

GENERATED_OPEN = '// <generated -- do not edit by hand>'
GENERATED_CLOSE = '// </generated>'

# The rule, measured on the tree the prototype read (see the docstring).
MIN_SHARED = 3
MIN_JACCARD = 0.7

IDENT = re.compile(r'^[A-Za-z_$][A-Za-z0-9_$]*$')
WORD = re.compile(r'[A-Za-z_$][A-Za-z0-9_$]*')
# A top-level declaration at the left margin, and the name it declares.
DECLARATION = re.compile(
    r'^(?:export\s+)?(?:declare\s+)?(?:default\s+)?(?:async\s+)?'
    r'(?:const|let|var|type|function\*?|interface|enum|class)\s+'
    r'([A-Za-z_$][A-Za-z0-9_$]*)')
GENERATED_TYPE = re.compile(
    r'^(?:export\s+)?(?:type|interface|const|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)', re.M)
# The key type a Record or a mapped type is written over.
RECORD_OVER = re.compile(r'Record<\s*(?:readonly\s+)?([A-Za-z_$][\w$.]*)\s*,')
MAPPED_OVER = re.compile(r'\[\s*[A-Za-z_$][\w$]*\s+in\s+(?:keyof\s+(?:typeof\s+)?)?'
                         r'([A-Za-z_$][\w$.]*)')
# The annotation of `const NAME: Type = {`.
ANNOTATION = re.compile(r'^(?:export\s+)?const\s+[A-Za-z_$][\w$]*\s*:\s*(?:Readonly<\s*)?'
                        r'(?:readonly\s+)?([A-Za-z_$][\w$.]*)\s*>?\s*=')
# A hand alias that is only a generated name re-said: `type A = B`,
# `(typeof B)[number]`, `keyof typeof B`, `B[number]`, `B['k']`.
ALIAS = re.compile(r'^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*(.*?);?\s*$')
ALIAS_WRAPPERS = frozenset(['typeof', 'keyof', 'number', 'readonly', 'NonNullable',
                            'Readonly', 'ReadonlyArray'])
SOURCE_LINE = re.compile(r'\bdocs/\S+')


# ---------------------------------------------------------------------------
# Reading TypeScript. Nothing in package.json hands Python a syntax tree, so
# this is the hand-rolled token scanner of check 11 (check-repeated-
# expressions.py), copied rather than imported so that this file stands alone.
# ---------------------------------------------------------------------------

BEFORE_REGEX = frozenset(
    '( , = : [ ! & | ? { } ; + - * % < > ~ ^'.split()
    + ['return', 'typeof', 'case', 'in', 'of', 'do', 'else', 'yield', 'await',
       '=>', '===', '!==', '==', '!=', '&&', '||', '??'])
NAME_START = frozenset('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$')
NAME_BODY = frozenset('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$0123456789')
DIGITS = frozenset('0123456789')
NUMBER_BODY = frozenset('0123456789abcdefABCDEFxXoObBeE_.+-')


def say(message):
    sys.stdout.write(message + '\n')


def read(path):
    with io.open(path, encoding='utf-8', errors='replace') as handle:
        return handle.read()


def split_regions(text):
    """(hand text, generated text, sources), each text keeping the line count.

    sources maps a generated line number to the manuscript its fence names
    under "Single source of truth:", for the report only.
    """
    hand, gen, sources = [], [], {}
    inside, source = False, ''
    for no, line in enumerate(text.split('\n'), 1):
        if GENERATED_OPEN in line:
            inside, source = True, ''
            hand.append('')
            gen.append('')
            continue
        if GENERATED_CLOSE in line:
            inside = False
            hand.append('')
            gen.append('')
            continue
        if inside:
            stripped = line.strip()
            if not source and stripped.startswith('//') and SOURCE_LINE.search(stripped):
                source = re.sub(r'^//\s*(?:From\s+)?', '', stripped).rstrip('.')
            sources[no] = source
            hand.append('')
            gen.append(line)
        else:
            hand.append(line)
            gen.append('')
    return '\n'.join(hand), '\n'.join(gen), sources


def strip_imports(text):
    """Blank whole import / re-export statements, keeping the line count."""
    out = []
    carrying = False
    for line in text.split('\n'):
        if carrying:
            out.append('')
            if ' from ' in line or line.rstrip().endswith("'") or \
                    line.rstrip().endswith('";') or line.rstrip().endswith("';"):
                carrying = False
            continue
        stripped = line.rstrip()
        if stripped.startswith('import') or (
                stripped.startswith('export') and ' from ' in stripped and
                ("'" in stripped or '"' in stripped)):
            out.append('')
            carrying = ' from ' not in stripped and not stripped.endswith(';')
            continue
        out.append(line)
    return '\n'.join(out)


def tokenize(text):
    """([token, ...], [line, ...]) with comments and layout gone."""
    tokens, lines = [], []
    i, line, size = 0, 1, len(text)
    while i < size:
        ch = text[i]
        if ch == '\n':
            line += 1
            i += 1
            continue
        if ch in ' \t\r':
            i += 1
            continue
        if ch == '/' and i + 1 < size:
            nxt = text[i + 1]
            if nxt == '/':
                while i < size and text[i] != '\n':
                    i += 1
                continue
            if nxt == '*':
                end = text.find('*/', i + 2)
                end = size if end < 0 else end + 2
                line += text.count('\n', i, end)
                i = end
                continue
            if not tokens or tokens[-1] in BEFORE_REGEX:
                start = i
                i += 1
                in_class = False
                while i < size:
                    c = text[i]
                    if c == '\\':
                        i += 2
                        continue
                    if c == '[':
                        in_class = True
                    elif c == ']':
                        in_class = False
                    elif c == '/' and not in_class:
                        i += 1
                        break
                    elif c == '\n':
                        break
                    i += 1
                while i < size and text[i] in 'dgimsuvy':
                    i += 1
                tokens.append(text[start:i])
                lines.append(line)
                continue
        if ch == "'" or ch == '"':
            start = i
            i += 1
            while i < size and text[i] != ch:
                if text[i] == '\\':
                    i += 1
                elif text[i] == '\n':
                    break
                i += 1
            i += 1
            tokens.append(text[start:i])
            lines.append(line)
            continue
        if ch == '`':
            start, at = i, line
            i += 1
            depth = 0
            while i < size:
                c = text[i]
                if c == '\\':
                    i += 2
                    continue
                if c == '\n':
                    line += 1
                elif depth == 0 and c == '$' and text[i:i + 2] == '${':
                    depth = 1
                    i += 2
                    continue
                elif depth > 0 and c == '{':
                    depth += 1
                elif depth > 0 and c == '}':
                    depth -= 1
                elif depth == 0 and c == '`':
                    i += 1
                    break
                i += 1
            tokens.append(text[start:i].replace('\n', ' '))
            lines.append(at)
            continue
        if ch in DIGITS or (ch == '.' and i + 1 < size and text[i + 1] in DIGITS):
            start = i
            while i < size and text[i] in NUMBER_BODY:
                i += 1
            tokens.append(text[start:i])
            lines.append(line)
            continue
        if ch in NAME_START:
            start = i
            while i < size and text[i] in NAME_BODY:
                i += 1
            tokens.append(text[start:i])
            lines.append(line)
            continue
        tokens.append(ch)
        lines.append(line)
        i += 1
    return tokens, lines


def is_str(tok):
    if not tok:
        return False
    if tok[0] in '\'"':
        return len(tok) >= 2
    return tok[0] == '`' and '${' not in tok


def sval(tok):
    return tok[1:-1]


def bracket_pairs(tokens):
    pair = {'(': ')', '[': ']', '{': '}'}
    stack, out = [], {}
    for i, t in enumerate(tokens):
        if t in pair:
            stack.append(i)
        elif t in (')', ']', '}'):
            if stack:
                out[stack.pop()] = i
    return out


def enclosing_brackets(tokens):
    """{token index: index of the innermost open bracket around it, or None}."""
    stack, out = [], {}
    for i, t in enumerate(tokens):
        if t in (')', ']', '}') and stack:
            stack.pop()
        out[i] = stack[-1] if stack else None
        if t in ('(', '[', '{'):
            stack.append(i)
    return out


def key_path(tokens, enclosing, i):
    """The property keys leading to token i inside one generated declaration.

    `COLUMN_SHAPES = { TaskVisual: { shapeKind: { choices: [` gives
    TaskVisual.shapeKind.choices for the `[`, so two sets printed into one
    constant carry two different names.
    """
    names = []
    j = i
    while j is not None:
        if j >= 2 and tokens[j - 1] == ':' and (IDENT.match(tokens[j - 2]) or is_str(tokens[j - 2])):
            names.append(sval(tokens[j - 2]) if is_str(tokens[j - 2]) else tokens[j - 2])
        j = enclosing.get(j)
    return '.'.join(reversed(names))


def pieces(tokens, lo, hi, match):
    """Top-level comma-separated token spans of tokens[lo:hi]."""
    out, cur = [], []
    j = lo
    while j < hi:
        t = tokens[j]
        if t == ',':
            out.append(cur)
            cur = []
            j += 1
            continue
        if j in match:
            end = match[j]
            cur.extend(tokens[j:end + 1])
            j = end + 1
            continue
        cur.append(t)
        j += 1
    if cur:
        out.append(cur)
    return out


def literal_sets(tokens, lines, match):
    """[(shape, first line, last line, members, module level), ...].

    Shapes: array ['a', 'b', 'c'] / set new Set([...]) / keys { a: .., b: .. }
    / values (the string values of one object literal) / union 'a' | 'b' | 'c'.
    Module level means the opening token stands at bracket depth 0, i.e. in a
    top-level statement and not inside any function, class or object.
    """
    found = []
    n = len(tokens)
    depth, d = [], 0
    for t in tokens:
        if t in (')', ']', '}'):
            d = max(0, d - 1)
        depth.append(d)
        if t in ('(', '[', '{'):
            d += 1
    for i, t in enumerate(tokens):
        if t == '[' and i in match:
            ps = [p for p in pieces(tokens, i + 1, match[i], match) if p]
            if len(ps) >= MIN_SHARED and all(len(p) == 1 and is_str(p[0]) for p in ps):
                shape = 'set' if i >= 3 and tokens[i - 1] == '(' and tokens[i - 2] == 'Set' \
                    else 'array'
                found.append((shape, lines[i], lines[match[i]],
                              [sval(p[0]) for p in ps], depth[i] == 0, i))
        elif t == '{' and i in match:
            ps = [p for p in pieces(tokens, i + 1, match[i], match) if p]
            ps = [p for p in ps if p[0] != '.']
            keyed = [p for p in ps if len(p) >= 3 and (IDENT.match(p[0]) or is_str(p[0]))
                     and p[1] == ':']
            if len(keyed) >= MIN_SHARED and len(keyed) >= 0.75 * len(ps):
                keys = [sval(p[0]) if is_str(p[0]) else p[0] for p in keyed]
                found.append(('keys', lines[i], lines[match[i]], keys, depth[i] == 0, i))
                vals = [sval(p[2]) for p in keyed if len(p) == 3 and is_str(p[2])]
                if len(vals) >= MIN_SHARED:
                    found.append(('values', lines[i], lines[match[i]], vals, depth[i] == 0, i))
    # unions: runs of  operand | operand | ...  with >= 3 string operands
    i = 0
    while i < n:
        if not is_str(tokens[i]) and not (tokens[i] == '|' and i + 1 < n and is_str(tokens[i + 1])):
            i += 1
            continue
        start = i
        if tokens[i] == '|':
            i += 1
        members, bars = [], 0
        while i < n:
            tok = tokens[i]
            if is_str(tok):
                members.append(sval(tok))
            elif not IDENT.match(tok):
                break
            if i + 2 < n and tokens[i + 1] == '|' and tokens[i + 2] != '|' and tokens[i] != '|':
                bars += 1
                i += 2
                continue
            i += 1
            break
        if bars >= 1 and len(members) >= MIN_SHARED:
            found.append(('union', lines[start], lines[min(i, n - 1)], members,
                          depth[start] == 0, start))
        if i == start:
            i += 1
    return found


def field_bags(tokens, lines):
    """Every `field: 'text'` of one generated region, grouped by field name."""
    bags = {}
    for i in range(1, len(tokens) - 2):
        if IDENT.match(tokens[i]) and tokens[i + 1] == ':' and is_str(tokens[i + 2]) \
                and tokens[i - 1] not in ('?', 'case'):
            bags.setdefault(tokens[i], []).append((lines[i], sval(tokens[i + 2])))
    out = []
    for field, items in sorted(bags.items()):
        values = sorted(set(v for _, v in items))
        if len(values) >= MIN_SHARED:
            out.append(('field ' + field, items[0][0], items[0][0], values, False, None))
    return out


def declared_name(text_lines, first):
    """The name of the top-level declaration a module-level set stands in.

    Walks back from the set's first line to the declaration at the left
    margin. ⭐ The NAME is the record's identity, not the file or the line,
    so a record survives its file being split or moved.
    """
    at = first - 1
    while at >= 0:
        line = text_lines[at]
        found = DECLARATION.match(line)
        if found:
            return found.group(1), at + 1
        if line[:1] not in (' ', '\t', '}', ']', ')', '|', '') and not line.startswith('//'):
            break
        at -= 1
    return '<anonymous>', first


# ---------------------------------------------------------------------------
# The generated pool.
# ---------------------------------------------------------------------------

def json_sets(node, path, out, in_list=False):
    """Every set a generated JSON file holds, as (label, members)."""
    if isinstance(node, list):
        strs = [x for x in node if isinstance(x, str)]
        if len(strs) >= MIN_SHARED and len(strs) == len(node):
            out.append((path, strs))
        dicts = [x for x in node if isinstance(x, dict)]
        if len(dicts) >= MIN_SHARED:
            cols = {}
            for d in dicts:
                for k, v in d.items():
                    if isinstance(v, str):
                        cols.setdefault(k, []).append(v)
                    elif isinstance(v, list):
                        cols.setdefault(k, []).extend(x for x in v if isinstance(x, str))
            for k, vs in sorted(cols.items()):
                if len(set(vs)) >= MIN_SHARED:
                    out.append((path + '[].' + k, vs))
            # the id column filtered by "this other field is present", and by
            # "this other field has this value": the rows of a roster that
            # carry a given property
            idk = next((k for k in ('rowId', 'id', 'name', 'key')
                        if all(isinstance(d.get(k), str) for d in dicts)), None)
            if idk is not None:
                fields = sorted(set(k for d in dicts for k in d) - {idk})
                for k in fields:
                    ids = [d[idk] for d in dicts if d.get(k) not in (None, '', [], {}, False)]
                    if MIN_SHARED <= len(ids) < len(dicts):
                        out.append((path + '[%s].%s' % (k, idk), ids))
                    values = set(d.get(k) for d in dicts if isinstance(d.get(k), str))
                    if 2 <= len(values) <= 12:
                        for v in sorted(values):
                            ids = [d[idk] for d in dicts if d.get(k) == v]
                            if len(ids) >= MIN_SHARED:
                                out.append((path + '[%s=%s].%s' % (k, v, idk), ids))
        for x in node:
            if isinstance(x, (list, dict)):
                json_sets(x, path + '[]', out, isinstance(x, dict))
    elif isinstance(node, dict):
        keys = [k for k in node if not k.startswith('$')]
        if len(keys) >= MIN_SHARED and not in_list:
            out.append((path + '{keys}', keys))
        subs = [v for v in node.values() if isinstance(v, dict)]
        if len(subs) >= MIN_SHARED:
            cols = {}
            for d in subs:
                for k, v in d.items():
                    if isinstance(v, str):
                        cols.setdefault(k, []).append(v)
            for k, vs in sorted(cols.items()):
                if len(set(vs)) >= MIN_SHARED:
                    out.append((path + '{}.' + k, vs))
        for k, v in node.items():
            if isinstance(v, (list, dict)):
                json_sets(v, path + '.' + k, out)


def variants(members):
    """The set itself and its derived forms, as (suffix, frozenset).

    ~last   the last dotted segment of each member (`treeStateMachine.auto`
            -> `auto`), which is how a state value is written by hand;
    ~words  the identifier words of compound guard strings
            (`isPressedRow & not isLeafRow` -> isPressedRow, isLeafRow).
    """
    base = frozenset(members)
    out = [('', base)]
    if any('.' in m for m in base):
        last = frozenset(m.split('.')[-1] for m in base)
        if last != base:
            out.append(('~last', last))
    if any((' ' in m or '&' in m) for m in base):
        words = frozenset(w for m in base for w in WORD.findall(m) if w != 'not')
        if words != base:
            out.append(('~words', words))
    return out


def json_source(data):
    """The manuscript a generated JSON file's $comment names, for the report."""
    comment = data.get('$comment', '') if isinstance(data, dict) else ''
    if isinstance(comment, list):
        comment = ' '.join(comment)
    found = re.search(r'(?:from|Generated from)\s+((?:docs|tools)/[^\s,()]+|LICENSE)', comment)
    return found.group(1).rstrip('.') if found else ''


# ---------------------------------------------------------------------------
# The verdict, on a tree held as {relative path: text}.
# ---------------------------------------------------------------------------

def collect(files):
    """(hand sets, generated pool, generated type names)."""
    hand, pool, gen_names = [], [], set()
    aliases = {}
    for rel in sorted(files):
        text = files[rel]
        if rel.endswith('.json'):
            try:
                data = json.loads(text)
            except ValueError:
                continue
            source = json_source(data)
            base = rel.rsplit('/', 1)[-1]
            out = []
            json_sets(data, '$', out)
            for label, members in out:
                for suffix, members_set in variants(members):
                    pool.append({'name': '%s %s%s' % (base, label, suffix),
                                 'set': members_set, 'where': rel,
                                 'source': source or rel})
            continue
        htext, gtext, sources = split_regions(text)
        gen_names.update(GENERATED_TYPE.findall(gtext))
        hlines = htext.split('\n')
        for line in hlines:
            found = ALIAS.match(line)
            if found:
                aliases[found.group(1)] = found.group(2)
        tokens, lines = tokenize(strip_imports(htext))
        match = bracket_pairs(tokens)
        for shape, first, _last, members, top, _at in literal_sets(tokens, lines, match):
            if not top:
                continue            # function-local sets: deliberately not read
            name, decl = declared_name(hlines, first)
            hand.append({'file': rel, 'line': first, 'shape': shape, 'name': name,
                         'members': frozenset(members),
                         'head': ' '.join(hlines[decl - 1:first])})
        if GENERATED_OPEN in text:
            glines = gtext.split('\n')
            gtokens, gtoklines = tokenize(gtext)
            gmatch = bracket_pairs(gtokens)
            genclosing = enclosing_brackets(gtokens)
            found = literal_sets(gtokens, gtoklines, gmatch) + field_bags(gtokens, gtoklines)
            for shape, first, _last, members, _top, at in found:
                decl, _line = declared_name(glines, first)
                path = key_path(gtokens, genclosing, at) if at is not None else ''
                for suffix, members_set in variants(members):
                    pool.append({'name': generated_name(decl, path, shape + suffix),
                                 'decl': decl, 'path': path, 'shape': shape + suffix,
                                 'set': members_set, 'where': '%s:%d' % (rel, first),
                                 'source': sources.get(first, '') or rel})
    # A hand alias that only re-says a generated name counts as generated:
    # `type Reason = NoticeReasonId`, `(typeof ROWS)[number]`, `keyof typeof X`.
    changed = True
    while changed:
        changed = False
        for alias, rhs in aliases.items():
            if alias in gen_names:
                continue
            bare = re.sub(r"\[\s*(['\"])[^'\"]*\1\s*\]", '', rhs)
            words = [w for w in WORD.findall(bare) if w not in ALIAS_WRAPPERS]
            if words and all(w in gen_names for w in words) and not re.search(r"['\"]", bare):
                gen_names.add(alias)
                changed = True
    return hand, merge_repeats(pool), gen_names


def generated_name(decl, path, shape):
    return 'generated %s%s %s' % (decl, ('.' + path) if path else '', shape)


def merge_repeats(pool):
    """One entry per set a generated declaration prints more than once.

    COLOUR_NAME_VALUES prints the same four forms under every colour and
    under light and dark; named after whichever copy sorts first, a record
    would change its name when that colour went away. The copies are folded
    into one entry whose varying key segments read `*`.
    """
    groups, order = {}, []
    for entry in pool:
        if 'decl' not in entry:
            order.append(entry)
            continue
        key = (entry['decl'], entry['shape'], entry['set'],
               len(entry['path'].split('.')) if entry['path'] else 0)
        if key not in groups:
            groups[key] = []
            order.append(key)
        groups[key].append(entry)
    out = []
    for item in order:
        if isinstance(item, dict):
            out.append(item)
            continue
        copies = groups[item]
        paths = sorted(set(entry['path'] for entry in copies))
        if len(paths) == 1:
            out.append(copies[0])
            continue
        merged = '.'.join(parts[0] if len(set(parts)) == 1 else '*'
                          for parts in zip(*[path.split('.') for path in paths]))
        out.append(dict(copies[0], path=merged,
                        name=generated_name(item[0], merged, item[1])))
    return out


def guard_of(h, gen_names):
    """Why the compiler already holds this set to its generated one, or ''.

    Only a KEYS shape can be guarded this way: a Record / mapped type over a
    generated union, or the annotation of a generated interface, makes a
    missing or an extra key a compile error. Nothing guards the values.
    """
    if h['shape'] != 'keys':
        return ''
    for pattern, label in ((RECORD_OVER, 'Record'), (MAPPED_OVER, 'mapped type')):
        for found in pattern.finditer(h['head']):
            over = found.group(1).split('.')[-1]
            if over in gen_names:
                return '%s over %s' % (label, over)
    found = ANNOTATION.match(h['head'].strip())
    if found and found.group(1).split('.')[-1] in gen_names:
        return 'typed as %s' % found.group(1)
    return ''


def best_match(h, pool, index):
    counts = {}
    for member in h['members']:
        for gi in index.get(member, ()):
            counts[gi] = counts.get(gi, 0) + 1
    best = None
    for gi, shared in counts.items():
        if shared < MIN_SHARED:
            continue
        g = pool[gi]['set']
        jaccard = shared / float(len(h['members'] | g))
        # highest Jaccard, then a set as printed over a derived variant, then
        # the smaller set, then the name, so the choice is the same on every
        # run and every machine
        key = (-jaccard, '~' in pool[gi]['name'], len(g), pool[gi]['name'])
        if best is None or key < best[0]:
            best = (key, gi, shared, jaccard)
    return best


def hits_of(files):
    """(hits, guarded, counts): hits and RG-exempted records, keyed by name."""
    hand, pool, gen_names = collect(files)
    index = {}
    for gi, g in enumerate(pool):
        for member in g['set']:
            index.setdefault(member, []).append(gi)
    hits, guarded = [], []
    for h in hand:
        best = best_match(h, pool, index)
        if best is None:
            continue
        _key, gi, shared, jaccard = best
        if jaccard < MIN_JACCARD:
            continue
        g = pool[gi]
        record = {'key': (h['name'], h['shape'], g['name']),
                  'where': '%s:%d' % (h['file'], h['line']),
                  'jaccard': jaccard, 'hand': len(h['members']), 'gen': len(g['set']),
                  'shared': shared, 'source': g['source'], 'gwhere': g['where'],
                  'guard': guard_of(h, gen_names)}
        (guarded if record['guard'] else hits).append(record)
    return hits, guarded, {'hand': len(hand), 'pool': len(pool)}


# ---------------------------------------------------------------------------
# The baseline.
# ---------------------------------------------------------------------------

def parse_baseline(text):
    """({key: [why, ...]}, malformed) -- a key may be held more than once."""
    held, malformed = {}, []
    key = None
    for lineno, raw in enumerate(text.split('\n'), 1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.lower().startswith('why:'):
            if key is None:
                malformed.append('line %d carries a "why:" with no record above it' % lineno)
                continue
            why = line[4:].strip()
            if not (why.startswith('restates') or why.startswith('coincidental')):
                malformed.append('line %d: a "why:" opens with "restates" or '
                                 '"coincidental": %s' % (lineno, line[:70]))
            held.setdefault(key, []).append(why)
            key = None
            continue
        if key is not None:
            malformed.append('the record above line %d has no "why:" line' % lineno)
        cells = [c.strip() for c in line.split('|')]
        if len(cells) != 3 or not all(cells):
            malformed.append('line %d is not "<hand name> | <shape> | <generated set>": %s'
                             % (lineno, line[:70]))
            key = None
            continue
        key = tuple(cells)
    if key is not None:
        malformed.append('the last record has no "why:" line')
    return held, malformed


def verdict(files, baseline_text):
    """(problems, known lines, summary numbers)."""
    hits, guarded, counts = hits_of(files)
    held, malformed = parse_baseline(baseline_text)
    problems = ['the baseline cannot be read: %s' % bad for bad in malformed]
    found = {}
    for hit in hits:
        found.setdefault(hit['key'], []).append(hit)
    known = []
    for key in sorted(found):
        whys = held.get(key, [])
        for n, hit in enumerate(found[key]):
            label = '%s | %s | %s' % key
            if n < len(whys):
                known.append('%s (%s, J=%.2f %d/%d) -- %s'
                             % (label, hit['where'], hit['jaccard'], hit['shared'],
                                hit['hand'], whys[n]))
            else:
                problems.append(
                    '%s at %s restates %s (J=%.2f, %d of %d hand members; from %s) '
                    'and is NOT held in the baseline -- read the generated set '
                    'instead of writing it again' % (
                        label, hit['where'], key[2], hit['jaccard'], hit['shared'],
                        hit['hand'], hit['source']))
    for key in sorted(held):
        extra = len(held[key]) - len(found.get(key, []))
        if extra > 0:
            problems.append('the baseline holds "%s | %s | %s" %d more time(s) than '
                            'the tree restates it -- a debt that was paid must '
                            'leave the file' % (key + (extra,)))
    new = sum(max(0, len(v) - len(held.get(k, []))) for k, v in found.items())
    typed = sum(1 for g in guarded if g['guard'].startswith('typed'))
    numbers = dict(counts, hits=len(hits), guarded=len(guarded) - typed, typed=typed,
                   known=len(known), new=new)
    return problems, known, numbers


# ---------------------------------------------------------------------------
# Running it.
# ---------------------------------------------------------------------------

def tree_of(root):
    files = {}
    for folder, dirs, names in os.walk(os.path.join(root, 'src')):
        dirs.sort()
        for name in sorted(names):
            if name.endswith('.ts') or name.endswith('.json'):
                path = os.path.join(folder, name)
                files[os.path.relpath(path, root).replace(os.sep, '/')] = read(path)
    return files


def list_all(files):
    hits, guarded, counts = hits_of(files)
    say('NOTE     %d module-level hand set(s), %d generated set(s) in the pool'
        % (counts['hand'], counts['pool']))
    for label, rows in (('HIT', hits), ('GUARDED', guarded)):
        for r in sorted(rows, key=lambda r: r['key']):
            say('%-8s %s | %s | %s' % ((label,) + r['key']))
            say('           J=%.2f hand %d gen %d shared %d  %s  <- %s (%s)%s'
                % (r['jaccard'], r['hand'], r['gen'], r['shared'], r['where'],
                   r['gwhere'], r['source'],
                   ('  [exempt: %s]' % r['guard']) if r['guard'] else ''))
    say('NOTE     %d hit(s), %d exempted as compile-guarded' % (len(hits), len(guarded)))
    return 0


SELF_TEST_GENERATED = u'''\
// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-000)
export type FruitId = 'apple' | 'pear' | 'plum' | 'fig'
// </generated>
'''

SELF_TEST_CLEAN = u'''\
import type { FruitId } from '../gen/fruit'

export function pick(): FruitId {
  return 'apple'
}
'''

SELF_TEST_PLANTED = u'''\
export const FRUITS = ['apple', 'pear', 'plum', 'fig']
'''

SELF_TEST_GUARDED = u'''\
import type { FruitId } from '../gen/fruit'

const PRICE_OF: Record<FruitId, number> = {
  apple: 1,
  pear: 2,
  plum: 3,
  fig: 4,
}
'''

SELF_TEST_UNGUARDED = u'''const PRICE_OF: Record<string, number> = {
  apple: 1,
  pear: 2,
  plum: 3,
  fig: 4,
}
'''

SELF_TEST_HELD = u'''\
FRUITS | array | generated FruitId union
why: restates FruitId (docs/spec/_source/settings.json) -- self-test record.
'''


def self_test_case(label, files, baseline, wanted):
    """`wanted` is None for green, or a substring a PROBLEM must hold."""
    problems, _known, _numbers = verdict(files, baseline)
    if wanted is None:
        say('         %s: %s' % (label, 'green' if not problems else
                                  'RED: ' + '; '.join(problems)))
        return None if not problems else '%s: expected green, got red' % label
    hit = [p for p in problems if wanted in p]
    say('         %s: %s' % (label, ('RED, ' + hit[0][:110]) if hit else
                              ('green' if not problems else
                               'red for another reason: ' + '; '.join(problems))))
    return None if hit else '%s: expected a PROBLEM holding "%s"' % (label, wanted)


def self_test():
    gen = {'src/gen/fruit.ts': SELF_TEST_GENERATED}
    clean = dict(gen, **{'src/app/pick.ts': SELF_TEST_CLEAN})
    planted = dict(clean, **{'src/app/fruits.ts': SELF_TEST_PLANTED})
    guarded = dict(clean, **{'src/app/price.ts': SELF_TEST_GUARDED})
    moved = dict(clean, **{'src/elsewhere/renamed-file.ts': SELF_TEST_PLANTED})
    results = [
        self_test_case('case 0 (clean tree, empty baseline)', clean, '', None),
        self_test_case('case 1 (a planted restatement, not held)', planted, '',
                       'FRUITS | array | generated FruitId union at src/app/fruits.ts:1'),
        self_test_case('case 2 (a Record over the generated union)', guarded, '', None),
        self_test_case('case 2b (the same keys under Record<string, ...>)',
                       dict(clean, **{'src/app/price.ts': SELF_TEST_UNGUARDED}), '',
                       'PRICE_OF | keys | generated FruitId union'),
        self_test_case('case 3 (the planted restatement, held)', planted,
                       SELF_TEST_HELD, None),
        self_test_case('case 4 (the held record moved to another file)', moved,
                       SELF_TEST_HELD, None),
        self_test_case('case 5 (held, and the restatement is gone)', clean,
                       SELF_TEST_HELD, 'a debt that was paid must leave the file'),
        self_test_case('case 6 (a record without a why: line)', planted,
                       SELF_TEST_HELD.split('\n')[0] + '\n', 'has no "why:" line'),
    ]
    failures = [r for r in results if r]
    for failure in failures:
        say('FAIL     check 69 self-test: %s' % failure)
    if failures:
        return 1
    say('OK       check 69 self-test: 4 break(s) went red and the clean, guarded, '
        'held and moved trees held in memory are green')
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    started = time.time()
    files = tree_of(ROOT)
    if '--list' in argv:
        return list_all(files)
    baseline = read(BASELINE) if os.path.exists(BASELINE) else ''
    where = os.path.relpath(BASELINE, ROOT).replace(os.sep, '/')
    problems, known, numbers = verdict(files, baseline)
    if not os.path.exists(BASELINE):
        problems.insert(0, '%s does not exist -- every known restatement reads as new'
                        % where)
    for line in known:
        say('KNOWN    %s' % line)
    for problem in problems:
        say('PROBLEM  %s' % problem)
    say('%s %d known restatement(s) held against the baseline (new %d); %d hit(s), '
        'and %d more exempted -- %d keyed by a Record or mapped type over a '
        'generated union, %d typed as a generated interface; %.2fs'
        % ('FAIL    ' if problems else 'OK      ', numbers['known'], numbers['new'],
           numbers['hits'], numbers['guarded'] + numbers['typed'], numbers['guarded'],
           numbers['typed'], time.time() - started))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
