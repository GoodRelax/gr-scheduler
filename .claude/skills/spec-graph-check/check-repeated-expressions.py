# -*- coding: utf-8 -*-
r"""Check 41 -- one expression written out in N places under src/.

⛔ WHY THIS EXISTS. Every one of the forty checks that stood before this one
reads only `docs/`. The manuscripts are held to "one rule, one home" by check
11 (`docs/review/dup-check.py`), which compares Japanese SENTENCES in three
specification files; nothing whatever looked at the TypeScript. So the tree
could hold the same rule spelled out any number of times and no machine would
say so, and the only record of how many copies there were was a comment
written by whoever made the second one.

⭐ THE CASE THAT OPENED IT. `FR-093` states how much room a label takes: full
width counts two, half width counts one. The counting is written as
`charCodeAt(0) < 0x100 ? 1 : 2`, and it stands in FOUR places under `src/`:

    src/adapter/screen-renderer/row-title-panel.ts:188
    src/entity/layout-engine/schedule-geometry/schedule-geometry.ts:1813
    src/entity/layout-engine/schedule-layout/schedule-layout.ts:516
    src/entity/layout-engine/schedule-layout/schedule-layout.ts:693

The comment at `row-title-panel.ts:51` says 「The counting FR-093 estimates a
width in lives twice in `src/`: once here and once in ScheduleLayout's LC-5」,
and the one at `schedule-geometry.ts:1808` says 「a fourth would mean the rule
has earned a home」. Both were true when written. Neither is true now, and
neither of them knows it -- a comment cannot count. ⇒ THE ONLY WAY A COUNT
STAYS HONEST IS IF A MACHINE TAKES IT EVERY RUN.

WHAT IT COUNTS. A group is a maximal run of at least FLOOR tokens whose exact
token sequence occurs at two or more places. Each group is printed with a
`file:line` for every member, so a reader can go and look rather than take
this file's word for it. The baseline holds the NUMBER OF GROUPS.

HOW IT DECIDES -- the three judgements, each of which can be refuted.

1. NORMALISATION: WHITESPACE ONLY. Tokens are compared verbatim. Identifiers
   are NOT renamed to a placeholder and literals are NOT blanked. That is the
   conservative half of the classic type-2 clone detector, taken deliberately:
   normalising identifiers turns "the same code" into "the same SHAPE", and
   shape matching in a tree like this one pairs every `for` over a different
   array with every other. ⭐ Measured on this tree at floor 10, everything
   else held equal: 460 groups with identifiers kept, 1130 with every
   identifier folded to one placeholder. ⚠️ THE EXTRA 670 ARE SHAPES. Read
   at random, they pair `async importDocument(handedSource: AgentImportSource)
   : Promise<...>` with `async overwriteOpenedFile(bytes: Uint8Array):
   Promise<...>` -- two functions that share a shape and nothing a person
   could fold. ⚠️ WHAT THE CHOICE COSTS: a copy whose variables were
   renamed on the way is invisible here. That cost is affordable because a
   sliding window still catches a renamed copy from the first token AFTER the
   renamed one -- which is exactly how the `FR-093` group of four is seen at
   all. Three of its four sites call the character `ch` and the fourth calls
   it `character`, so the window that holds all four begins at `charCodeAt`,
   one token past the name they disagree on.

2. FLOOR: 10 TOKENS, MEASURED RATHER THAN GUESSED. The whole curve, one pass
   over `src/` per floor -- `--curve` re-measures it:

       floor  6 : 1129 groups     floor 16 :  158 groups
       floor  8 :  700 groups     floor 20 :   91 groups
       floor 10 :  460 groups     floor 24 :   67 groups
       floor 12 :  298 groups     floor 30 :   32 groups
       floor 14 :  209 groups     floor 40 :   18 groups

   ⛔ TEN IS NOT THE KNEE OF THAT CURVE; IT IS THE SMALLEST FLOOR THAT STILL
   READS. Ten was taken because the group this check was opened for is
   exactly ten tokens long -- `charCodeAt ( 0 ) < 0x100 ? 1 : 2` -- and at a
   floor of 12 it is a group of THREE, `schedule-layout.ts:516` dropping out
   because it spells the receiver differently. A gate that cannot see the
   thing it was built for is not worth having.
   ⚠️ WHAT TEN COSTS, MEASURED. Ten random groups hand-read at floor 10
   named one genuine repeated expression 6 times out of 10; the same reading
   at floor 20 gave 9 out of 10. Precision rises with length and the report
   is printed longest first, so the misses are met at the bottom of the list
   -- but they are why this check is worth more as a number to watch than as
   a gate that stops a commit. ⭐ `--floor 20` is the high-precision run.

3. SCOPE: `src/` IS GATED, `tests/` IS ADVISORY. Both counts are printed
   every run so this can be overruled without editing the script. The reason
   is that repetition in `tests/` is not a defect but a rule: this project has
   each case state its own arrangement so it reads alone, and it has the tests
   written by an agent that reads only the specification, which cannot share a
   helper with a case it never saw. ⛔ Folding those repetitions would undo
   both conventions. The number is still printed, because "advisory" must not
   mean "unmeasured".

WHAT IT DOES NOT CLAIM.

⛔ IT DOES NOT SAY A GROUP SHOULD BE FOLDED. Some of what it finds is the
price of a boundary the design chose on purpose -- `row-title-panel.ts` says
in as many words that `_source/components.json` gives it no edge to
`ScheduleLayout`, so its copy of the counting is the boundary's price. This
check makes the copies VISIBLE and holds their number; which ones earn a home
is a person's judgement and belongs in a change request.

⛔ IT IS NOT A SEMANTIC DUPLICATE DETECTOR. A rule paraphrased into different
code is invisible here, exactly as check 11 is blind to a paraphrased
sentence. Ten groups read by hand (chosen at random from the
460, not from the head) found 6 that name one expression genuinely written
twice -- among them an inline `{ readonly x: number; readonly y: number }`
standing in 19 places while a `Point` type exists. The other 4 were a shared
type annotation inside two different signatures, a one-line `undefined` guard
in two unrelated files, a pair of adjacent `switch` arms, and a run beginning
in the middle of a generic.

⛔ IT DOES NOT PARSE TYPESCRIPT. There is no parser in this repository's
dependencies (`package.json` holds ajv, playwright, typescript, vite, vitest
and nothing that exposes a syntax tree to Python), so the tokenizer below is
hand-rolled: comments, strings, template literals and regular-expression
literals are recognised so that a `/` inside `/\//g` is not mistaken for the
start of a comment, and everything else falls into a name, a number or a
single punctuation character.

WHAT IS NOT LOOKED AT AT ALL, and why each is legitimate repetition:
  - comments, including the JSDoc -- this tree's comments are long prose and
    would swamp the code;
  - `import` statements and `export ... from` re-exports -- a module names
    what it uses, and two modules using the same thing is not duplication;
  - the generated blocks fenced by `// <generated -- do not edit by hand>`
    ... `// </generated>` -- nobody may fold those by hand, and check 30
    already holds them against their manuscript.

Usage:
    python check-repeated-expressions.py [repo-root]
                                         [--floor N] [--scope src|tests|both]
                                         [--all] [--curve]

    --floor    override the token floor (default 10).
    --scope    which tree to COUNT; both trees are always measured.
    --all      print every group rather than the longest 12.
    --curve    print the findings-per-floor curve and exit 0 without gating.
"""
import hashlib
import io
import os
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
BASELINE = os.path.join(HERE, 'repeated-expressions-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/repeated-expressions-baseline.txt'

# ⛔ THE BASELINE IS ONLY MEANINGFUL AT THE FLOOR IT WAS MEASURED AT --
# 460 groups at floor 10 and 91 at floor 20 are the same tree, so comparing
# one against the other's number would fail or pass for no reason. The gate
# therefore runs at THIS floor and `--floor` turns the gating off (see
# main()). 20 is the gated floor because a body read ten random groups at
# each and found 9 of 10 real at 20 against 6 of 10 at 10.
FLOOR = 20
CURVE_FLOORS = (6, 8, 10, 12, 14, 16, 20, 24, 30, 40)
SHOWN = 12

GENERATED_OPEN = '// <generated -- do not edit by hand>'
GENERATED_CLOSE = '// </generated>'

# A `/` here begins a regular-expression literal rather than a division, since
# none of these can end an expression. Anything else before a `/` -- a name, a
# number, a closing bracket -- means division.
BEFORE_REGEX = frozenset(
    '( , = : [ ! & | ? { } ; + - * % < > ~ ^'.split()
    + ['return', 'typeof', 'case', 'in', 'of', 'do', 'else', 'yield', 'await',
       '=>', '===', '!==', '==', '!=', '&&', '||', '??']
)

# A run that begins or ends on one of these is a fragment of an expression
# rather than an expression: it needs whatever stood beside it to mean
# anything, so no reader can act on it.
NOT_FIRST = frozenset('. , ; : ? = + - * / % < > & | ! ~ ^ ) ] }'.split())
NOT_LAST = frozenset('. , ; : ? = + - * / % < > & | ! ~ ^ ( [ {'.split())

NAME_START = frozenset(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$')
NAME_BODY = frozenset(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$0123456789')
DIGITS = frozenset('0123456789')
NUMBER_BODY = frozenset('0123456789abcdefABCDEFxXoObBeE_.+-')


def read(path):
    with io.open(path, encoding='utf-8', errors='replace') as handle:
        return handle.read()


def sources(root, folder):
    """Every `.ts` file under one tree, in a fixed order so runs compare."""
    found = []
    top = os.path.join(root, folder)
    for here, dirs, names in os.walk(top):
        dirs.sort()
        for name in sorted(names):
            if name.endswith('.ts') or name.endswith('.tsx'):
                found.append(os.path.join(here, name))
    return found


def strip_generated(text):
    """Blank the fenced machine-written regions, keeping the line count."""
    out = []
    inside = False
    for line in text.split('\n'):
        if GENERATED_OPEN in line:
            inside = True
        elif GENERATED_CLOSE in line:
            inside = False
            out.append('')
            continue
        out.append('' if inside else line)
    return '\n'.join(out)


def strip_imports(text):
    """Blank whole `import` / `export ... from` statements, line count kept.

    Every one of them stands at column zero in this tree (measured: zero
    indented `import` lines under src/ or tests/), and 681 of them run over
    several lines, so a continuation is blanked until the line that carries
    the module specifier.
    """
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
    """Return ([token, ...], [line, ...]) with comments and layout gone.

    ⚠️ Hand-rolled because nothing in `package.json` hands Python a syntax
    tree. The three literal forms that can hide a `/` or a `//` -- strings,
    template literals and regular expressions -- are each scanned whole, so a
    line like `.replace(/\\//g, '~1')` does not eat the rest of its line as a
    comment. A template literal's `${...}` is followed by brace depth so that
    an object literal or a nested template inside one does not end it early.
    """
    tokens = []
    lines = []
    i = 0
    line = 1
    size = len(text)
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
            start = i
            at = line
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


def load(root, folder):
    """[(relative path, tokens, lines), ...] for one tree."""
    units = []
    for path in sources(root, folder):
        text = strip_imports(strip_generated(read(path)))
        tokens, lines = tokenize(text)
        rel = os.path.relpath(path, root).replace(os.sep, '/')
        units.append((rel, tokens, lines))
    return units


def fingerprint(tokens, start, width):
    joined = '\x00'.join(tokens[start:start + width])
    return hashlib.blake2b(joined.encode('utf-8'), digest_size=8).digest()


def whole_expression(tokens):
    """Trim a shared run down to the balanced expression inside it.

    ⛔ WITHOUT THIS THE TAIL OF THE REPORT IS FRAGMENTS. A sliding window
    happily lands on `rows . filter ( ( one ) = > one .` -- a run that two
    unrelated sweeps share and that no reader can fold, because it is not an
    expression, only the place where two expressions happen to agree. What a
    person can act on is a run whose brackets close and which neither opens
    nor ends on a connector. Measured 2026-09-11 at floor 10 over src/: 1786
    groups before this trim and 460 after, and ten random groups hand-read on
    each side named one genuine expression 5 times out of 10 before and 6
    times out of 10 after. ⚠️ A group is DROPPED, not shortened, when the trim
    falls under the floor -- so the count this check holds is the count of
    whole expressions, never of coincidences between two of them.
    """
    depth = 0
    lo = 0
    for i, token in enumerate(tokens):
        if token in '([{':
            depth += 1
        elif token in ')]}':
            if depth == 0:
                lo = i + 1
            else:
                depth -= 1
    depth = 0
    hi = lo
    for i in range(lo, len(tokens)):
        token = tokens[i]
        if token in '([{':
            depth += 1
        elif token in ')]}':
            depth -= 1
        if depth == 0:
            hi = i + 1
    while hi > lo and tokens[hi - 1] in NOT_LAST:
        hi -= 1
    while lo < hi and tokens[lo] in NOT_FIRST:
        lo += 1
    return lo, hi


def groups_at(units, floor):
    """Maximal repeated token runs of at least `floor` tokens.

    A window is reported only when nothing to its LEFT repeats the same way --
    otherwise every offset inside one long copy would be reported separately.
    The run is then grown to the right for as long as every member agrees, so
    the length printed is the whole of what is shared, and `whole_expression`
    then trims that to the part of it that is an expression at all.
    """
    seen = defaultdict(list)
    for f, (_, tokens, _lines) in enumerate(units):
        for pos in range(len(tokens) - floor + 1):
            seen[fingerprint(tokens, pos, floor)].append((f, pos))

    repeated = {key: locs for key, locs in seen.items() if len(locs) > 1}
    found = []
    for _key, locs in repeated.items():
        before = {units[f][1][pos - 1] if pos else None for f, pos in locs}
        if len(before) == 1:
            continue

        # Two windows overlapping inside one file are one periodic run, not
        # two copies of anything a person could fold.
        kept = []
        for f, pos in sorted(locs):
            if kept and kept[-1][0] == f and pos - kept[-1][1] < floor:
                continue
            kept.append((f, pos))
        if len(kept) < 2:
            continue

        width = floor
        while True:
            ahead = set()
            for f, pos in kept:
                tokens = units[f][1]
                if pos + width >= len(tokens):
                    ahead = set()
                    break
                ahead.add(tokens[pos + width])
            if len(ahead) != 1:
                break
            width += 1

        f, pos = kept[0]
        lo, hi = whole_expression(units[f][1][pos:pos + width])
        if hi - lo < floor:
            continue
        found.append((hi - lo, [(g, at + lo) for g, at in kept]))

    found.sort(key=lambda g: (-g[0], -len(g[1]),
                              units[g[1][0][0]][0], g[1][0][1]))
    return found


def show(units, found, limit):
    shown = found if limit is None else found[:limit]
    for width, locs in shown:
        f, pos = locs[0]
        text = ' '.join(units[f][1][pos:pos + min(width, 14)])
        if width > 14:
            text += ' …'
        print('         %d places, %d tokens: %s' % (len(locs), width, text[:110]))
        for g, at in locs:
            print('             %s:%d' % (units[g][0], units[g][2][at]))
    if limit is not None and len(found) > limit:
        print('         … and %d more group(s); --all prints them'
              % (len(found) - limit))


def main():
    root = os.getcwd()
    floor = FLOOR
    scope = 'src'
    limit = SHOWN
    curve = False
    gated = True
    args = sys.argv[1:]
    while args:
        arg = args.pop(0)
        if arg == '--floor':
            floor = int(args.pop(0))
            gated = (floor == FLOOR)
        elif arg == '--scope':
            scope = args.pop(0)
        elif arg == '--all':
            limit = None
        elif arg == '--curve':
            curve = True
        else:
            root = arg

    if not os.path.isdir(os.path.join(root, 'src')):
        print('PROBLEM  src/ is missing under %s -- nothing to read' % root)
        return 1

    src = load(root, 'src')
    tests = load(root, 'tests') if os.path.isdir(os.path.join(root, 'tests')) else []

    if curve:
        print('NOTE     findings per floor, src/ (%d files, %d tokens)'
              % (len(src), sum(len(u[1]) for u in src)))
        for at in CURVE_FLOORS:
            found = groups_at(src, at)
            largest = max((len(g[1]) for g in found), default=0)
            print('         floor %2d : %5d group(s), largest %d places'
                  % (at, len(found), largest))
        return 0

    if not gated:
        found = groups_at(src, floor)
        print('NOTE     floor %d (not the gated floor %d): src/ has %d group(s). '
              '⛔ The baseline is not read -- it counts groups at floor %d, and '
              'a count at one floor says nothing about another.'
              % (floor, FLOOR, len(found), FLOOR))
        show(src, found, limit)
        return 0

    in_src = groups_at(src, floor)
    in_tests = groups_at(tests, floor) if tests else []
    # Each group's locations index the tree it was found in, so a scope that
    # counts both must keep the two trees apart to print a path at all.
    counted = [(src, in_src)]
    if scope == 'tests':
        counted = [(tests, in_tests)]
    elif scope == 'both':
        counted = [(src, in_src), (tests, in_tests)]
    count = sum(len(found) for _units, found in counted)

    print('NOTE     floor %d tokens; src/: %d group(s) in %d file(s); '
          'tests/: %d group(s) in %d file(s) -- ⭐ tests/ is ADVISORY, the '
          'baseline holds %s' % (floor, len(in_src), len(src), len(in_tests),
                                 len(tests), scope + '/'))

    try:
        baseline = int(read(BASELINE).split('\n')[0].strip())
    except (IOError, ValueError):
        baseline = None

    if baseline is None:
        print('NOTE     %s: %d repeated expression group(s); no baseline held '
              'yet -- see %s' % (scope, count, REL_BASELINE))
        for units, found in counted:
            show(units, found, limit)
        return 0

    if count > baseline:
        print('FAIL     %s/: %d group(s) of one expression written in two or '
              'more places, up from the baseline %d. ⛔ Fold the new copy, or '
              'raise %s deliberately and say why in the commit.'
              % (scope, count, baseline, REL_BASELINE))
        for units, found in counted:
            show(units, found, limit)
        return 1

    if count < baseline:
        print('OK       %s/: %d repeated expression group(s) (was %d) -- ⭐ '
              'lower the baseline to hold the ground' % (scope, count, baseline))
        return 0

    print('OK       %s/: %d repeated expression group(s), which is the baseline'
          % (scope, count))
    return 0


if __name__ == '__main__':
    for _stream in (sys.stdout, sys.stderr):
        if hasattr(_stream, 'reconfigure'):
            _stream.reconfigure(encoding='utf-8', errors='replace')
    sys.exit(main())
