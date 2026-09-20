# -*- coding: utf-8 -*-
"""Check 61 -- gate 4 of stage 3: module-scope mutable state in the inner
three layers (docs/development-records/refactor-stage3-gates-proposal-2026-09-15.md,
gate 4; rulings.md JDG-124 approved this baseline's initial value).

Table T-249's SF-7 (docs/spec/05-07-design.md) requires that the current
value be held by the shell alone, passed down by reference, so that the
inner three layers -- Entity, UseCase, Adapter -- have no mutable state of
their own to leak. 5.3's prose puts it flatly: "the inner three layers have
no leakable mutable state at all". defects.md's DFC-583 already records the
two places that contradict it:

    src/use-case/apply-document-change/apply-document-change.ts:69
        let deliveringNotices (mutated at :85 and :89)
    src/use-case/notify-change-watchers/notify-change-watchers.ts:37
        const REGISTRATIONS = new Map (mutated at :43 .set, :49 .delete,
        :74 .set)

This check is that measurement made mechanical, so a THIRD one cannot be
added silently while DFC-583's two wait on the CR that resettles their layer
(refactor-plan-report-2026-09-13.md, stage 2b).

WHAT COUNTS AS MODULE-SCOPE MUTABLE STATE, read at column 0 (no leading
whitespace -- a declaration inside a function body is not module scope):

  1. `let` / `var`, with or without a leading `export`. Flagged
     unconditionally: the ability to rebind the module-level name is itself
     the leak table T-249 forbids, whether or not the file goes on to use it.
  2. `const X = new Map(...)`, `new Set(...)`, `new WeakMap(...)`,
     `new WeakSet(...)`, `const X = [` or `const X = {`, again with or
     without `export` and whatever type annotation sits between the name and
     `=`. Flagged only when the SAME FILE also mutates X:
       X.set(   X.add(   X.delete(   X.clear(   X.push(   X.pop(
       X.shift(   X.unshift(   X.splice(
       X[...] =              (an index assignment)
       X.prop =              (a property assignment)
     A declaration with zero such mutations is not flagged -- this is how
     `const ROUTES: ReadonlyMap<string, string> = new Map(...)` (CR-379
     section 1) passes without the checker having to parse the `Readonly*`
     annotation itself: nothing in a file that truly never mutates a
     Readonly-typed binding will match those calls in the first place.

WHAT THIS DOES NOT SEE, printed on every run (the shape of check 19's
COVERAGE line -- a check that names only what it looked at reads as having
looked at everything):

  - ALIASING. `const b = a; b.set(...)` mutates the Map `a` names without
    the literal text "a.set(" ever appearing. Only the declared name itself
    is watched.
  - CROSS-FILE MUTATION. A `const` exported from one file and mutated by a
    caller in another is invisible here: only the declaring file is read.
  - A type annotation, or a generic argument list, that wraps onto a second
    line before the `=` -- the declaration and its RHS must share one
    physical line, as check 19's import regex cannot cross a newline either.
  - Compound assignment (`X.count += 1`) and any mutation spelled through a
    method this list does not name (`X.sort()`, `X.reverse()`, a `for` loop
    writing `X[i] = ...` still counts, but `Object.assign(X, ...)` does not).

BASELINE (.claude/skills/spec-graph-check/module-state-baseline.txt, a new
file this check does not write for itself -- see `--print-baseline` below).
A header comment records the count, the method above, and DFC-583; then one
line per exempted finding:

    HELD <file>:<name>

Held both ways (the shape of checks 26b and 43): a finding not named by a
HELD line is a new, unauthorized leak and FAILS; a HELD line naming a finding
that no longer exists FAILS too, so a fix cannot leave a stale exemption
behind pretending a debt is still owed. Closing one means deleting its line
in the same commit that moves the state to the shell (stage 7, CR-379
decision 7).

Usage:

    python .claude/skills/spec-graph-check/check-module-state.py
    python .claude/skills/spec-graph-check/check-module-state.py --list
    python .claude/skills/spec-graph-check/check-module-state.py --print-baseline
    python .claude/skills/spec-graph-check/check-module-state.py --self-test

Run with PYTHONIOENCODING=utf-8. `--list` prints every candidate read (both
flagged and filtered out) with its declaration line and, for a flagged one,
its mutation line(s) -- this is the "before/after the mutation filter" count.
`--print-baseline` computes the file's exact content FROM THE CURRENT TREE
(the header comment, then one `HELD` line per flagged finding) and prints it
to stdout, exit 0 -- it never reads or requires module-state-baseline.txt to
exist, and this script never writes it either: the file is installed once by
the session wiring the four stage-3 gates together, with the printed content
shown to the user first (common premise 6 of the gates proposal, section 0).
Only the DEFAULT run (the gate's own judgement, and `--list`, which shares
its scan) PROBLEMs and exits non-zero when the file is missing -- there is
nothing yet to judge the tree against. `--self-test` breaks four cases held
in memory (none of them written to src/) and is red unless each goes the way
it should.
Exit 0 green, 1 red.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
LAYERS = ('entity', 'use-case', 'adapter')
SRC = os.path.join(ROOT, 'src')

BASELINE = os.path.join(HERE, 'module-state-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/module-state-baseline.txt'
DFC = 'DFC-583 (docs/development-records/defects.md)'

MUTATORS = (u'set', u'add', u'delete', u'clear', u'push', u'pop', u'shift',
           u'unshift', u'splice')

# Column 0 only: matched against one physical line at a time, so `^` here
# always means "the very first character of the line", never re.MULTILINE.
LETVAR = re.compile(u'^(?:export\\s+)?(let|var)\\s+([A-Za-z_$][\\w$]*)')
CONST_HEAD = re.compile(
    u'^(?:export\\s+)?const\\s+([A-Za-z_$][\\w$]*)\\b([^=\\n]*)=\\s*(.*)$')
CONST_NEW = re.compile(u'^new\\s+(Map|Set|WeakMap|WeakSet)\\b')

HELD_LINE = re.compile(u'^HELD\\s+(\\S+):(\\S+)\\s*$')


def say(message):
    """Print ASCII-safe whatever the console's code page (house convention)."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'backslashreplace').decode(enc)
                     + '\n')


def mutation_lines(name, lines):
    """Line numbers (1-based) in `lines` that mutate the binding `name`."""
    esc = re.escape(name)
    call = re.compile(u'(?<![\\w$.])' + esc
                      + u'\\.(?:' + u'|'.join(MUTATORS) + u')\\s*\\(')
    index_assign = re.compile(u'(?<![\\w$.])' + esc
                              + u'\\s*\\[[^\\]\\n]*\\]\\s*=(?!=)')
    prop_assign = re.compile(u'(?<![\\w$.])' + esc
                             + u'\\.[A-Za-z_$][\\w$]*\\s*=(?!=)')
    found = []
    for number, text in enumerate(lines, 1):
        if call.search(text) or index_assign.search(text) or prop_assign.search(text):
            found.append(number)
    return found


def scan_text(rel, src):
    """Every column-0 candidate in one file's text.

    Returns a list of dicts, one per candidate, in declaration order:
      rel, name, decl_line, kind ('let' / 'var' / 'const'), flagged (bool),
      mutations (line numbers; always [] for let/var).
    `flagged` is True for every let/var, and for a const only when
    `mutations` is non-empty -- callers wanting only the gate's findings
    filter on it; callers wanting the pre-filter count use the whole list.
    """
    lines = src.replace(u'\r\n', u'\n').split(u'\n')
    found = []
    for number, line in enumerate(lines, 1):
        m = LETVAR.match(line)
        if m:
            found.append({'rel': rel, 'name': m.group(2), 'decl_line': number,
                          'kind': m.group(1), 'flagged': True, 'mutations': []})
            continue
        m = CONST_HEAD.match(line)
        if not m:
            continue
        name, _type, rhs = m.group(1), m.group(2), m.group(3)
        is_new = CONST_NEW.match(rhs)
        is_array = rhs.startswith(u'[')
        is_object = rhs.startswith(u'{')
        if not (is_new or is_array or is_object):
            continue
        muts = mutation_lines(name, lines)
        found.append({'rel': rel, 'name': name, 'decl_line': number,
                      'kind': 'const', 'flagged': bool(muts),
                      'mutations': muts})
    return found


def read_file(path):
    with io.open(path, encoding='utf-8', errors='replace') as handle:
        return handle.read()


def source_files():
    for layer in LAYERS:
        top = os.path.join(SRC, layer)
        for base, dirs, names in os.walk(top):
            dirs[:] = sorted(dirs)
            for name in sorted(names):
                if name.endswith('.ts'):
                    yield os.path.join(base, name)


def scan_tree():
    """Every candidate over the real tree, as scan_text() over every file."""
    all_candidates = []
    files_read = 0
    for path in source_files():
        files_read += 1
        rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
        all_candidates.extend(scan_text(rel, read_file(path)))
    return all_candidates, files_read


def coverage_line(all_candidates, files_read, flagged):
    letvar = sum(1 for c in all_candidates if c['kind'] in ('let', 'var'))
    const = sum(1 for c in all_candidates if c['kind'] == 'const')
    return ('COVERAGE %d candidate module-scope declaration(s) in %d file(s) '
            'of src/entity, src/use-case, src/adapter read (%d let/var + %d '
            'mutable-literal const); %d flagged after the same-file mutation '
            'filter. Aliasing through a second reference and mutation from '
            'another file are invisible to this lexical read.'
            % (len(all_candidates), files_read, letvar, const, len(flagged)))


def flagged_of(all_candidates):
    return [c for c in all_candidates if c['flagged']]


def key_of(c):
    return (c['rel'], c['name'])


def read_baseline(path=BASELINE):
    """(header lines, {(file, name): reason}) or (None, {}) if missing."""
    if not os.path.exists(path):
        return None, {}
    held = {}
    header = []
    with io.open(path, encoding='utf-8', errors='replace') as handle:
        for line in handle:
            stripped = line.rstrip('\n')
            found = HELD_LINE.match(stripped.strip())
            if found:
                held[(found.group(1), found.group(2))] = True
            else:
                header.append(stripped)
    return header, held


def verdict(flagged, held):
    """(red, [message]) comparing the current findings against a HELD map.

    Two-way, the shape checks 26b and 43 already use: a finding not named by
    a HELD line is a new leak (FAIL); a HELD line naming no current finding
    is a stale exemption (FAIL too, so it cannot rot into a permission).
    """
    now = set(key_of(c) for c in flagged)
    base = set(held)
    new = sorted(now - base)
    stale = sorted(base - now)
    lines = []
    if new:
        lines.append('FAIL     %d new module-scope mutable state finding(s) '
                     'not held by %s -- table T-249 SF-7 forbids the inner '
                     'three layers leakable state of their own. Move it to '
                     'the shell (stage 7 / CR-379 decision 7), or add a HELD '
                     'line and say why in the commit.'
                     % (len(new), REL_BASELINE))
        for rel, name in new:
            lines.append('         %s:%s' % (rel, name))
    if stale:
        lines.append('FAIL     %s holds a HELD line for %d finding(s) that '
                     'no longer exist -- a held line is a debt, not a '
                     'permission; delete it in the commit that closed the '
                     'gap.' % (REL_BASELINE, len(stale)))
        for rel, name in stale:
            lines.append('         %s:%s' % (rel, name))
    if new or stale:
        return True, lines
    lines.append('OK       %d module-scope mutable state finding(s), all '
                'held by %s (%s)' % (len(now), REL_BASELINE, DFC))
    return False, lines


def show_list(all_candidates):
    say('     %-6s %-70s %6s  %s' % ('flag', 'file:name', 'line', 'mutated at'))
    for c in sorted(all_candidates, key=lambda c: (c['rel'], c['decl_line'])):
        say('     %-6s %-70s %6d  %s'
            % ('FLAG' if c['flagged'] else '    ',
               '%s:%s' % (c['rel'], c['name']), c['decl_line'],
               ', '.join(str(n) for n in c['mutations'])
               if c['mutations'] else ('(let/var)' if c['kind'] != 'const'
                                       else '(none)')))
    return 0


def baseline_text(flagged):
    """The exact content module-state-baseline.txt should hold, computed
    FROM THE CURRENT TREE -- never read from, or written to, disk here.

    Header comment: the count, the method (this docstring's summary), and
    DFC-583; then one `HELD <file>:<name>` line per flagged finding, sorted.
    """
    header = [
        '# Check 61 -- module-scope mutable state held by the inner three '
        'layers',
        '# (gate 4, docs/development-records/'
        'refactor-stage3-gates-proposal-2026-09-15.md;',
        '# initial value approved by rulings.md JDG-124).',
        '#',
        '# %d finding(s), measured by check-module-state.py: a column-0 '
        'let/var' % len(flagged),
        '# (with or without export) is flagged unconditionally; a column-0 '
        'const X =',
        '# new Map/Set/WeakMap/WeakSet(...), const X = [ or const X = { is '
        'flagged',
        '# only when the same file also mutates X (X.set/add/delete/clear/'
        'push/',
        '# pop/shift/unshift/splice(, X[...] =, or X.prop =). See %s.' % DFC,
        '#',
        '# HELD both ways (checks 26b and 43\'s shape): a finding not named '
        'here is',
        '# a new leak and FAILS; a HELD line naming no current finding '
        'FAILS too.',
        '# Delete a line in the same commit that moves its state to the '
        'shell',
        '# (stage 7 / CR-379 decision 7).',
        '#',
    ]
    body = ['HELD %s:%s' % key_of(c) for c in
           sorted(flagged, key=lambda c: key_of(c))]
    return '\n'.join(header + body)


def print_baseline():
    """Print what module-state-baseline.txt should hold, computed from the
    current tree. Exit 0 always -- unlike the default gate run, this never
    requires the file to exist, and never writes it either.
    """
    all_candidates, _files_read = scan_tree()
    say(baseline_text(flagged_of(all_candidates)))
    return 0


# ---------------------------------------------------------------------------
# --self-test -- four cases held in memory, never written to src/.
# ---------------------------------------------------------------------------

SELF_TEST_1 = u'''\
// entity file: a bare module-level let.
// @unit      X  (self-test)
export function noop(): void {}

let cache = 0
'''

SELF_TEST_2 = u'''\
// use-case file: a Set built at module scope and mutated in the same file.
export function remember(id: string): void {
  seen.add(id)
}

const seen = new Set<string>()
'''

SELF_TEST_3 = u'''\
// use-case file: a ReadonlyMap-typed const, never mutated (CR-379 section 1).
const ROUTES: ReadonlyMap<string, string> = new Map([['a', 'b']])

export function route(key: string): string | undefined {
  return ROUTES.get(key)
}
'''


def self_test():
    failures = []

    # Printed here too (not only on the gate run): "every run" (check 19's
    # coverage line is unconditional) covers both modes this script has.
    preview, preview_files = scan_tree()
    say(coverage_line(preview, preview_files, flagged_of(preview)))

    # (1) let cache = 0 in an entity file -> red against an empty baseline.
    found1 = scan_text('src/entity/self-test/self-test.ts', SELF_TEST_1)
    flagged1 = flagged_of(found1)
    red1, lines1 = verdict(flagged1, {})
    say('         case 1 (let cache = 0): %s'
        % ('RED, ' + '; '.join(l.strip() for l in lines1 if l.startswith('  '))
           if red1 else 'green'))
    if not red1 or ('src/entity/self-test/self-test.ts', 'cache') not in \
            set(key_of(c) for c in flagged1):
        failures.append('case 1: expected red naming cache, got %s'
                        % ('red' if red1 else 'green'))

    # (2) const seen = new Set<string>() then seen.add(id) -> red.
    found2 = scan_text('src/use-case/self-test/self-test.ts', SELF_TEST_2)
    flagged2 = flagged_of(found2)
    red2, _lines2 = verdict(flagged2, {})
    say('         case 2 (Set + .add): %s, mutations at line(s) %s'
        % ('RED' if red2 else 'green',
           ', '.join(str(n) for c in flagged2 for n in c['mutations'])))
    if not red2 or ('src/use-case/self-test/self-test.ts', 'seen') not in \
            set(key_of(c) for c in flagged2):
        failures.append('case 2: expected red naming seen, got %s'
                        % ('red' if red2 else 'green'))

    # (3) ReadonlyMap-typed const, never mutated -> green (nothing flagged).
    found3 = scan_text('src/use-case/self-test/self-test.ts', SELF_TEST_3)
    flagged3 = flagged_of(found3)
    red3, _lines3 = verdict(flagged3, {})
    say('         case 3 (ReadonlyMap, unmutated): %s, %d candidate(s), '
        '%d flagged' % ('RED' if red3 else 'green', len(found3), len(flagged3)))
    if red3 or flagged3:
        failures.append('case 3: expected green with 0 flagged, got %s with '
                        '%d flagged' % ('red' if red3 else 'green',
                                       len(flagged3)))

    # (4) the current real tree, against a baseline generated from itself.
    all_candidates, files_read = preview, preview_files
    flagged4 = flagged_of(all_candidates)
    generated_baseline = dict((key_of(c), True) for c in flagged4)
    red4, lines4 = verdict(flagged4, generated_baseline)
    say('         case 4 (current tree, baseline generated from it): %s, '
        '%d flagged of %d candidate(s) in %d file(s)'
        % ('RED' if red4 else 'green', len(flagged4), len(all_candidates),
           files_read))
    if red4:
        failures.append('case 4: expected green, got red: %s'
                        % '; '.join(lines4))

    for failure in failures:
        say('FAIL     check 61 self-test: %s' % failure)
    if failures:
        return 1
    say('OK       check 61 self-test: 3 break(s) went red and the current '
        'tree, held against a baseline generated from it, is green')
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    if '--print-baseline' in argv:
        return print_baseline()

    all_candidates, files_read = scan_tree()
    flagged = flagged_of(all_candidates)
    say(coverage_line(all_candidates, files_read, flagged))

    if '--list' in argv:
        return show_list(all_candidates)

    header, held = read_baseline()
    if header is None:
        say('PROBLEM  %s has not been written yet; measured %d flagged '
            'finding(s): %s -- show this to the user before writing the '
            'file (common premise 6 of the gates proposal, section 0), '
            'then write it with the header this check\'s docstring '
            'describes.'
            % (REL_BASELINE, len(flagged),
               ', '.join('%s:%s' % key_of(c) for c in flagged) or 'none'))
        return 1

    red, lines = verdict(flagged, held)
    for line in lines:
        say(line)
    return 1 if red else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
