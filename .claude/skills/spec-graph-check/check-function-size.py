# -*- coding: utf-8 -*-
"""Check 60 -- the function-size ratchet (`JDG-54`, `JDG-124`).

`JDG-54` answers the plan's question 6 by refusing to set an upper limit on a
function's size until stage 8 measures the refactored tree; until then, the
rule is a RATCHET -- a function already over the band may stay over it, but
its lines and its branches may not RISE, and no function may newly cross the
band without the debt being written down. There is deliberately no line of
specification for this: `JDG-54` is a plan/ruling decision, not a MUST/MUST
NOT clause, so `impact.py` has nothing to point it at.

THE BAND: a function is "banded" when it has more than 50 lines or more than
15 branches (JDG-124's numbers; the plan's record 1 chose 50 lines, and 15
branches was picked, with no prior example, to land near the same rank as
50 lines does -- see the proposal's curve at other cuts). Being banded is not
itself a failure -- splitting a banded function is exactly the work stage 4-6
does -- only a RISE is.

WHAT IS MEASURED, per function (`FunctionDeclaration`, `FunctionExpression`,
`ArrowFunctionExpression` -- see function-size.mjs, which does the actual AST
walk with `rolldown/parseAst`):

  lines     start line to end line of the function's own span, inclusive.
            Blank lines and comment lines inside it are counted; nothing is
            stripped.
  branches  one point each for: `if`, the ternary, `for`/`for-in`/`for-of`,
            `while`/`do-while`, `catch`, a `case` that carries a test (not
            `default`), and `&&`/`||`/`??`. A nested function's branches are
            charged to that nested function alone, never to the function
            around it.
  name      the function's own declared name if it has one, else the name it
            is assigned to (a variable, an object/class member, or a plain
            assignment's left side); a name that cannot be read this way is
            anonymous. An anonymous function is named `<outer>#<n>` -- the
            already-resolved name of its nearest enclosing function plus a
            sequence number counting, in source order, only the anonymous
            functions directly inside that one enclosing function (JDG-124
            recommendation 2); a top-level anonymous function (inside no
            function at all) is `#<n>` alone, a file-level sequence.
  key       `<file>::<name>`.

NAME COLLISIONS WITHIN ONE FILE (front-session ruling, extending JDG-124
recommendation 2 -- not a new ruling). Two different functions in one file
can resolve to the same name above -- a getter and setter of one property,
same-named methods of two classes in one file, or (the common real case
here) several sibling object literals that each implement one interface and
so each carry a same-named method, e.g. 21 "invariant" objects each with its
own `find: ({ schedule }) => {...}` -- none of which carries a class or
container qualifier this check can read as a name. function-size.mjs
resolves this itself, file by file, in source order: the FIRST function
with a given name keeps it exactly; the second and later ones get `~2`,
`~3`, ... appended (`~`, not `#`, so the reader can always tell "this name
collided with a sibling" from "this function had no name of its own" --
see function-size.mjs's docstring for the full reasoning, including how the
two marks can stack on one function). Because of this, `--print-baseline`
and the gate below should never see an actual duplicate key; if one is
reported, function-size.mjs's resolver has a bug, not the tree a naming
problem, and every run's own NOTE line below repeats this so it is never
read as "duplicates are just something we ignore".

⚠️ CAVEAT printed on every run (see the NOTE line in `gate()`): both `#n`
and `~n` are assigned by SOURCE ORDER. Adding a new same-named sibling
ABOVE an existing one renumbers every sibling below it, even though nothing
about those other functions changed -- in the baseline this shows as one
HELD line going stale (its old suffixed key no longer exists) paired with
one newly-banded function under the shifted key, both red, for an edit that
renamed nothing on purpose. Fix: update function-size-baseline.txt in the
same commit, exactly as any other stale-plus-new pair here is fixed.

THE BASELINE (`function-size-baseline.txt`, two-way like checks 26b and 43):

    excess-lines=<N> excess-branches=<M>
    # ... a comment header ...
    HELD <file>::<name> lines=<n> branches=<m>
    HELD ...

  Line 1 holds the two totals: N = sum over EVERY function of
  max(0, lines-50), M = sum over EVERY function of max(0, branches-15) (a
  function under one band but over the other still contributes to the one
  it is over). A rise in either FAILS.

  Each HELD line is one function currently in the band. FAILS when:
    - that function's lines or branches go up from the HELD numbers;
    - a function newly in the band is not held here;
    - a HELD line's function no longer exists, or no longer qualifies for
      the band (it may have shrunk, or been deleted, or been renamed away)
      -- stale, and FAILS even when the totals above went DOWN, because a
      HELD line is a name-and-numbers claim and a claim nothing supports is
      wrong regardless of the totals. Splitting a banded function across
      several smaller ones is not blocked: the split's own commit rewrites
      this file to remove the old line and add the new ones, exactly as
      checks 26b/43 ask of a paid debt.

Nothing here is baked in by this script: `--print-baseline` measures the
CURRENT tree and prints the exact file this check would then be judged
against, but never writes it. Only a human, after being shown the numbers,
commits `function-size-baseline.txt` (memory: "Baseline moves need the
user's OK").

WHAT THIS DOES NOT SEE: a function whose own text does not change size or
branch count but whose BEHAVIOUR does (dead code, a moved condition that
nets to the same branch count); a change that moves a function between
files without changing its name (key changes, so it reads as "deleted" +
"new" rather than "moved" -- both halves still judged correctly, just not
specially recognised as a move); an overload signature or an ambient
`declare function` (no body, so `TSDeclareFunction` is never treated as a
measurable function -- only the implementation is counted).

Usage:

    python check-function-size.py                 the gate; exit 0 green
    python check-function-size.py --print-baseline print the current tree's
                                                    baseline text (does not
                                                    write the file)
    python check-function-size.py --self-test      break synthetic sources
                                                    on purpose, then measure
                                                    the real tree; exit 0
                                                    only if every case comes
                                                    out as expected

Run with PYTHONIOENCODING=utf-8, as the other checks in this folder are.
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SRC = os.path.join(ROOT, 'src')
MJS = os.path.join(HERE, 'function-size.mjs')
BASELINE = os.path.join(HERE, 'function-size-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/function-size-baseline.txt'

LINE_BAND = 50
BRANCH_BAND = 15

DATA_RE = re.compile(r'^excess-lines=(\d+)\s+excess-branches=(\d+)$')
HELD_RE = re.compile(r'^HELD (.+) lines=(\d+) branches=(\d+)$')

BASELINE_HEADER = ('''\
# Check 60 -- the function-size ratchet (JDG-54; baseline values agreed in
# JDG-124). A function bands when it has more than %d lines or more than %d
# branches -- see function-size.mjs's docstring for exactly how lines and
# branches are counted, and how an anonymous function is named
# "<outer>#<n>". JDG-54 sets no upper limit before stage 8; this file only
# forbids a rise.
#
# THE RATCHET (two-way, like checks 26b and 43). Line 1 above is
# excess-lines = sum of max(0, lines-%d) and excess-branches = sum of
# max(0, branches-%d), over every function src/**/*.ts holds; a rise in
# either FAILS. Each HELD line below is one function currently over the
# band; a rise in ITS lines or branches FAILS, a newly banded function
# absent from this file FAILS, and a HELD line whose function no longer
# exists or has dropped out of the band is stale and FAILS too -- even when
# the totals above went down, since a HELD line is a claim about one named
# function, judged on its own. Splitting a banded function is not blocked:
# rewrite this file, in the same commit, to drop the old line and add the
# new ones. Raise a number, or add or keep a HELD line, only on purpose,
# and say why in the commit.
''' % (LINE_BAND, BRANCH_BAND, LINE_BAND, BRANCH_BAND))

SELF_TEST_FILE = 'src/self-test/check-60-synthetic.ts'


def say(message):
    """Print ASCII whatever the console's code page."""
    sys.stdout.write(message.encode('ascii', 'backslashreplace')
                     .decode('ascii') + '\n')


# ---------------------------------------------------------------------------
# Reading src/**/*.ts and calling function-size.mjs.
# ---------------------------------------------------------------------------

def source_files():
    for base, dirs, names in os.walk(SRC):
        dirs[:] = sorted(d for d in dirs if d != 'node_modules')
        for name in sorted(names):
            if name.endswith('.ts'):
                yield os.path.join(base, name)


def read_source(path):
    with io.open(path, encoding='utf-8', errors='replace') as handle:
        text = handle.read()
    rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
    return rel, text


def run_node(files):
    """Feed {'files': files} to function-size.mjs on stdin; return its JSON.

    Raises RuntimeError (never crashes) on anything that stops this check
    from getting a verdict: node missing, a non-zero exit, or output that is
    not the JSON shape function-size.mjs promises.
    """
    node = shutil.which('node') or 'node'
    payload = json.dumps({'files': files})
    try:
        proc = subprocess.run([node, MJS], input=payload, capture_output=True,
                              text=True, encoding='utf-8')
    except OSError as exc:
        raise RuntimeError('could not run "node %s": %s' % (MJS, exc))
    if proc.returncode != 0:
        raise RuntimeError('function-size.mjs exited %d: %s'
                           % (proc.returncode, (proc.stderr or '').strip()[:500]))
    try:
        result = json.loads(proc.stdout)
    except ValueError as exc:
        raise RuntimeError('function-size.mjs did not print JSON: %s -- %s'
                           % (exc, proc.stdout[:200]))
    if not isinstance(result, dict) or 'functions' not in result:
        raise RuntimeError('function-size.mjs printed JSON without a '
                           '"functions" array')
    return result


def measure_texts(file_text_pairs):
    """[(file, text), ...] -> function-size.mjs's parsed result."""
    files = [{'file': f, 'text': t} for f, t in file_text_pairs]
    return run_node(files)


def measure_tree():
    files = [dict(zip(('file', 'text'), read_source(p)))
             for p in source_files()]
    if not files:
        raise RuntimeError('no .ts file under src/ -- nothing was measured, '
                           'and a count of 0 would read as a clean tree')
    return run_node(files)


# ---------------------------------------------------------------------------
# The ratchet itself: totals and the two-way per-function ledger.
# ---------------------------------------------------------------------------

def summarise(functions):
    excess_lines = sum(max(0, f['lines'] - LINE_BAND) for f in functions)
    excess_branches = sum(max(0, f['branches'] - BRANCH_BAND)
                          for f in functions)
    return {'excess_lines': excess_lines, 'excess_branches': excess_branches}


def banded_map(functions):
    """{key: (lines, branches)} for every function over the band.

    ⛔ If two functions share a key (a reported duplicate), this dict can
    only hold one of them -- the caller always reports duplicates as an
    unconditional PROBLEM first, so a masked collision here never reads as a
    clean run.
    """
    out = {}
    for f in functions:
        if f['lines'] > LINE_BAND or f['branches'] > BRANCH_BAND:
            out['%s::%s' % (f['file'], f['name'])] = (f['lines'], f['branches'])
    return out


def format_baseline(summary, banded):
    lines = ['excess-lines=%d excess-branches=%d'
            % (summary['excess_lines'], summary['excess_branches'])]
    lines.append(BASELINE_HEADER.rstrip('\n'))
    for key in sorted(banded):
        l, b = banded[key]
        lines.append('HELD %s lines=%d branches=%d' % (key, l, b))
    return '\n'.join(lines) + '\n'


def read_baseline():
    """(baseline dict or None, [malformed line descriptions]).

    A baseline is returned only when line 1 parses; a HELD line that does
    not parse is reported but does not stop the rest from being read, the
    same "read strictly, report don't drop" stance check 26b's loader takes.
    """
    if not os.path.exists(BASELINE):
        return None, []
    with io.open(BASELINE, encoding='utf-8') as handle:
        raw = handle.read().splitlines()
    if not raw:
        return None, ['%s is empty' % REL_BASELINE]
    head = DATA_RE.match(raw[0].strip())
    if not head:
        return None, ['line 1 of %s is not "excess-lines=<n> '
                      'excess-branches=<m>": %s' % (REL_BASELINE, raw[0][:80])]
    held = {}
    malformed = []
    for lineno, row in enumerate(raw[1:], 2):
        text = row.strip()
        if not text or text.startswith('#'):
            continue
        found = HELD_RE.match(text)
        if not found:
            malformed.append('line %d of %s is not "HELD <file>::<name> '
                             'lines=<n> branches=<m>": %s'
                             % (lineno, REL_BASELINE, text[:80]))
            continue
        held[found.group(1)] = (int(found.group(2)), int(found.group(3)))
    baseline = {'excess_lines': int(head.group(1)),
               'excess_branches': int(head.group(2)), 'held': held}
    return baseline, malformed


def verdict(functions, duplicates, baseline):
    """(red, [message, ...]) of `functions` against `baseline`.

    `baseline` has the shape read_baseline() (or a hand-built one, for
    --self-test) returns: {'excess_lines', 'excess_branches', 'held'}.
    """
    problems = []
    for dup in sorted(duplicates, key=lambda d: (d['file'], d['name'])):
        problems.append(
            'FAIL     %s::%s is still the key of %d functions after '
            'function-size.mjs resolves within-file name collisions with '
            '~2/~3/... -- that resolver has a bug, this is not a naming '
            'choice for a person to fix by renaming'
            % (dup['file'], dup['name'], dup['count']))

    summary = summarise(functions)
    banded = banded_map(functions)

    if summary['excess_lines'] > baseline['excess_lines']:
        problems.append('FAIL     excess-lines %d -> %d, above %s'
                        % (baseline['excess_lines'], summary['excess_lines'],
                           REL_BASELINE))
    if summary['excess_branches'] > baseline['excess_branches']:
        problems.append('FAIL     excess-branches %d -> %d, above %s'
                        % (baseline['excess_branches'],
                           summary['excess_branches'], REL_BASELINE))

    for key in sorted(banded):
        lines, branches = banded[key]
        if key not in baseline['held']:
            problems.append(
                'FAIL     %s lines=%d branches=%d is newly over the band '
                '(>%d lines or >%d branches) and is not held in %s'
                % (key, lines, branches, LINE_BAND, BRANCH_BAND, REL_BASELINE))
            continue
        was_lines, was_branches = baseline['held'][key]
        if lines > was_lines or branches > was_branches:
            problems.append(
                'FAIL     %s grew to lines=%d branches=%d, held at '
                'lines=%d branches=%d in %s'
                % (key, lines, branches, was_lines, was_branches,
                   REL_BASELINE))

    for key in sorted(baseline['held']):
        if key not in banded:
            was_lines, was_branches = baseline['held'][key]
            problems.append(
                'FAIL     %s is no longer over the band (held at '
                'lines=%d branches=%d in %s) -- the function shrank, was '
                'renamed, or no longer exists; the HELD line is stale and '
                'must be removed in this commit even though that lowers the '
                'totals' % (key, was_lines, was_branches, REL_BASELINE))

    return (len(problems) > 0), problems


# ---------------------------------------------------------------------------
# The three entry points.
# ---------------------------------------------------------------------------

SUFFIX_CAVEAT = (
    'NOTE     the #n (anonymous) and ~n (name collision) suffixes are '
    'assigned in source order; adding a same-named sibling ABOVE an '
    'existing function renumbers every sibling below it, which can turn an '
    'untouched function into a stale HELD line paired with a newly-banded '
    'one under the shifted key. If that happens, update '
    + REL_BASELINE + ' in the same commit.')


def gate():
    try:
        result = measure_tree()
    except RuntimeError as exc:
        say('PROBLEM  %s' % exc)
        return 1

    say(SUFFIX_CAVEAT)
    functions = result.get('functions', [])
    duplicates = result.get('duplicates', [])
    errors = result.get('errors', [])
    for err in errors:
        say('PROBLEM  %s did not parse: %s'
            % (err.get('file'), err.get('message')))
    if errors:
        return 1

    baseline, malformed = read_baseline()
    if malformed:
        for problem in malformed:
            say('PROBLEM  %s' % problem)
        return 1
    if baseline is None:
        summary = summarise(functions)
        banded = banded_map(functions)
        say('PROBLEM  %s has not been written yet; measured excess-lines=%d '
            'excess-branches=%d, %d function(s) over the band -- run '
            '--print-baseline, show the user (memory: "Baseline moves need '
            'the user\'s OK"), and write the file on purpose'
            % (REL_BASELINE, summary['excess_lines'],
               summary['excess_branches'], len(banded)))
        return 1

    red, problems = verdict(functions, duplicates, baseline)
    for problem in problems:
        say(problem)
    if red:
        return 1
    summary = summarise(functions)
    say('OK       %d function(s) measured in src/**/*.ts against %s: '
        'excess-lines=%d excess-branches=%d, %d function(s) held over the '
        'band (JDG-54 ratchet; values agreed in JDG-124)'
        % (len(functions), REL_BASELINE, summary['excess_lines'],
           summary['excess_branches'], len(baseline['held'])))
    return 0


def print_baseline():
    """Print the exact baseline text for the current tree on stdout.

    Diagnostics (a parse error, a NOTE, a duplicate key) go to STDERR and
    the exit code, never to stdout: stdout is meant to be saved byte for
    byte as function-size-baseline.txt, so mixing another line into it
    would print a baseline that fails its own first read. A duplicate key
    should never occur (function-size.mjs resolves within-file collisions
    with ~2/~3/... before this ever sees them) -- one still gets a
    HELD-map entry (last one measured wins, silently) so the numbers can be
    inspected, but exit 1 says the resolver has a bug and the baseline is
    not safe to write until it is fixed.
    """
    try:
        result = measure_tree()
    except RuntimeError as exc:
        sys.stderr.write('PROBLEM  %s\n' % exc)
        return 1
    sys.stderr.write(SUFFIX_CAVEAT + '\n')
    errors = result.get('errors', [])
    for err in errors:
        sys.stderr.write('PROBLEM  %s did not parse: %s\n'
                         % (err.get('file'), err.get('message')))
    if errors:
        return 1
    duplicates = result.get('duplicates', [])
    for dup in duplicates:
        sys.stderr.write(
            'PROBLEM  %s::%s is still the key of %d functions after the '
            '~2/~3/... collision resolution in function-size.mjs -- that is '
            'a bug in the resolver; the HELD line below for this key is not '
            'trustworthy until it is fixed\n'
            % (dup['file'], dup['name'], dup['count']))
    functions = result.get('functions', [])
    summary = summarise(functions)
    banded = banded_map(functions)
    sys.stdout.write(format_baseline(summary, banded))
    return 1 if (errors or duplicates) else 0


def pad_function(name, total_lines, branch_count):
    """A synthetic function of exactly `total_lines` lines: a header line,
    `branch_count` one-line `if` branches, pad comment lines, `return x;`
    and the closing brace -- the line and branch counts a self-test needs
    are then exact by construction, not by hand-counted arithmetic.
    """
    pad_count = total_lines - branch_count - 3
    if pad_count < 0:
        raise ValueError('%d lines is too few for %d branches'
                         % (total_lines, branch_count))
    lines = ['function %s(x: number) {' % name]
    for i in range(branch_count):
        lines.append('  if (x === %d) { x += 1; }' % i)
    for i in range(pad_count):
        lines.append('  // pad %d' % i)
    lines.append('  return x;')
    lines.append('}')
    return '\n'.join(lines) + '\n'


def baseline_of(functions):
    summary = summarise(functions)
    banded = banded_map(functions)
    return {'excess_lines': summary['excess_lines'],
           'excess_branches': summary['excess_branches'], 'held': banded}


def self_test():
    """Break synthetic, in-memory sources on purpose, then measure src/.

    None of this reads or writes function-size-baseline.txt: each scenario
    builds its own baseline dict from a measurement, exactly as the real
    baseline file would hold it, and judges a second measurement against it.
    """
    failures = []

    clean_text = pad_function('editTask', 600, 20)
    clean = measure_texts([(SELF_TEST_FILE, clean_text)])
    clean_functions = clean.get('functions', [])
    edit_key = '%s::editTask' % SELF_TEST_FILE
    baseline = baseline_of(clean_functions)
    if edit_key not in baseline['held']:
        failures.append('the synthetic editTask (600 lines, 20 branches) is '
                        'not in its own band -- self-test fixture is wrong')
    red0, msgs0 = verdict(clean_functions, clean.get('duplicates', []),
                          baseline)
    say('         self-test 0 (clean synthetic tree against its own '
        'baseline): %s' % ('RED' if red0 else 'green'))
    if red0:
        failures.append('the clean synthetic tree is not green against a '
                        'baseline built from itself: %s' % '; '.join(msgs0))

    # (1) one extra branch in editTask -> HELD red.
    broken1 = clean_text.replace(
        '  return x;\n}', '  if (x === 999) { x += 1; }\n  return x;\n}')
    result1 = measure_texts([(SELF_TEST_FILE, broken1)])
    red1, msgs1 = verdict(result1.get('functions', []),
                          result1.get('duplicates', []), baseline)
    say('         self-test 1 (one extra branch in editTask): %s'
        % ('RED' if red1 else 'green'))
    for msg in msgs1:
        say('           ' + msg)
    if not red1 or not any('editTask' in msg and 'grew' in msg
                           for msg in msgs1):
        failures.append('expected editTask to grow and go HELD-red; got %s'
                        % ('red without that message' if red1 else 'green'))

    # (2) a new 60-line function elsewhere -> total red.
    fresh = pad_function('freshBig', 60, 0)
    result2 = measure_texts([(SELF_TEST_FILE, clean_text + '\n' + fresh)])
    red2, msgs2 = verdict(result2.get('functions', []),
                          result2.get('duplicates', []), baseline)
    say('         self-test 2 (a new 60-line function): %s'
        % ('RED' if red2 else 'green'))
    for msg in msgs2:
        say('           ' + msg)
    if not red2 or not any('excess-lines' in msg for msg in msgs2):
        failures.append('expected a totals-red on excess-lines; got %s'
                        % ('red without that message' if red2 else 'green'))

    # (3) editTask split into three 170-line functions, HELD line removed,
    # baseline rewritten to match -> green.
    split_text = ''.join(pad_function('editTaskPart%d' % i, 170, 0)
                         for i in (1, 2, 3))
    result3 = measure_texts([(SELF_TEST_FILE, split_text)])
    functions3 = result3.get('functions', [])
    baseline3 = baseline_of(functions3)
    if edit_key in baseline3['held']:
        failures.append('editTask should not exist after the split')
    if len(baseline3['held']) != 3:
        failures.append('expected exactly 3 banded functions after the '
                        'split, found %d' % len(baseline3['held']))
    red3, msgs3 = verdict(functions3, result3.get('duplicates', []),
                          baseline3)
    say('         self-test 3 (editTask split into three 170-line '
        'functions, baseline rewritten in the same commit): %s'
        % ('RED' if red3 else 'green'))
    for msg in msgs3:
        say('           ' + msg)
    if red3:
        failures.append('the split, with its baseline updated in the same '
                        'commit, should be green: %s' % '; '.join(msgs3))

    # (4) the real tree, judged against a baseline generated from itself.
    try:
        real = measure_tree()
    except RuntimeError as exc:
        real = None
        failures.append('could not measure the real tree: %s' % exc)
    if real is not None:
        for err in real.get('errors', []):
            failures.append('%s did not parse: %s'
                            % (err.get('file'), err.get('message')))
        real_functions = real.get('functions', [])
        real_baseline = baseline_of(real_functions)
        red4, msgs4 = verdict(real_functions, real.get('duplicates', []),
                              real_baseline)
        say('         self-test 4 (the real src/ tree against a baseline '
            'generated from it): %s -- %d function(s), %d banded, '
            'excess-lines=%d excess-branches=%d'
            % ('RED' if red4 else 'green', len(real_functions),
               len(real_baseline['held']), real_baseline['excess_lines'],
               real_baseline['excess_branches']))
        for msg in msgs4:
            say('           ' + msg)
        if red4:
            failures.append('the real tree is not green against a baseline '
                            'generated from itself: %s' % '; '.join(msgs4))

    for failure in failures:
        say('FAIL     check 60 self-test: %s' % failure)
    if failures:
        return 1
    say('OK       check 60 self-test: 3 break(s) went red for the reason '
        'expected, the split with its baseline rewritten is green, and the '
        'real tree is green against a baseline generated from itself')
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    if '--print-baseline' in argv:
        return print_baseline()
    return gate()


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
